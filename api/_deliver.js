import { getActiveLists, getEntries, selectRows, sendEmail, textToHtml, siteUrl, fmtUsd, BUNDLE_PRICE_CENTS } from './_lib.js';
import { toXlsx, xlsxFilename } from './_xlsx.js';
import { deliveryEmail, sampleNudgeEmail, FOLLOWUP_SEQUENCE } from './_emails.js';

function unsubHeaders(token) {
  const url = `${siteUrl()}/api/unsubscribe?t=${token}`;
  return { 'List-Unsubscribe': `<${url}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' };
}

export async function send(to, { subject, text }, { token, attachments = [], tag } = {}) {
  return sendEmail({
    to,
    subject,
    text,
    html: textToHtml(text),
    attachments,
    tags: tag ? [{ name: 'type', value: tag }] : [],
    headers: token ? unsubHeaders(token) : undefined,
  });
}

// E0: the Excel files, the Airtable links, three rules, and (single lists only) the upgrade P.S.
export async function deliverPurchase({ email, slugs, bundle, upgrade, token, amountCents, name, sessionId, upsell }) {
  const allLists = await getActiveLists();
  const chosen = allLists.filter((l) => slugs.includes(l.slug));
  if (!chosen.length) throw new Error('No lists matched the purchase');

  const attachments = [];
  for (const list of chosen) {
    const entries = await getEntries(list.slug);
    list.stats = { rows: entries.length };
    attachments.push({ filename: xlsxFilename(list), content: toXlsx(entries, list, { name }) });
  }
  if (bundle) attachments.push({ filename: 'climate-insiders-follow-up-sequence.txt', content: FOLLOWUP_SEQUENCE });

  const msg = deliveryEmail({ chosen, allLists, bundle, upgrade, token, amountCents, name, sessionId, upsell });
  const sent = await send(email, msg, { token, attachments, tag: 'list_delivery' });
  return sent.id;
}

// The free top-10: the same Excel as a paid list (cover, filters, status dropdown), just the ten sample rows.
export async function deliverSample({ email, list }) {
  const entries = await getEntries(list.slug, { sampleOnly: true });
  if (!entries.length) throw new Error(`No sample rows for ${list.slug}`);
  // Hard stop: this email must never carry more than the ten sample rows, whatever the database returns.
  if (entries.length > 10 || entries.some((e) => e.is_sample !== true)) throw new Error(`Refusing to send ${list.slug} sample: ${entries.length} rows, not all flagged is_sample`);
  const [st] = await selectRows('paid_list_entries', `slug=eq.${list.slug}&select=count`);
  const total = st?.count || entries.length;
  const url = `${siteUrl()}/${list.slug}`;
  const xlsx = toXlsx(entries, list, { sample: { total, priceLabel: fmtUsd(list.price_cents), url } });
  const filename = xlsxFilename(list).replace(/\.xlsx$/i, '-top-10-sample.xlsx');

  const text = `Hi,

The top 10 from the ${list.short_name} list is attached, as an Excel. Full names, firms, emails and LinkedIn where we have them. Same format as the full list.

Before you email any of them: read their last 3 deals. If you can't say in one line why they'd care, skip them. 10 good fits beat 500 cold names.

The other ${Math.max(0, total - entries.length)} rows, ${fmtUsd(list.price_cents)} one time: ${url}
All 10 lists, ${fmtUsd(BUNDLE_PRICE_CENTS)}: ${siteUrl()}/all

Yoann

Not raising right now? Reply "stop" and I won't write again.`;

  const sent = await send(email, { subject: `Your top 10 from ${list.short_name} (Excel)`, text }, { tag: 'list_sample', attachments: [{ filename, content: xlsx }] });
  return sent.id;
}

export { sampleNudgeEmail };
