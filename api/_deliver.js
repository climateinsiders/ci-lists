import { getActiveLists, getEntries, sendEmail, textToHtml, siteUrl } from './_lib.js';
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

export async function deliverSample({ email, list }) {
  const entries = await getEntries(list.slug, { sampleOnly: true });
  const rows = entries
    .map((e) => {
      if (e.extra) {
        const x = e.extra;
        return `- ${e.firm}${e.region ? `, ${e.region}` : ''}${x.stage ? `. ${x.stage}` : ''}${e.website ? `\n  ${e.website}` : ''}`;
      }
      return `- ${e.name}${e.title ? `, ${e.title}` : ''}, ${e.firm}${e.city || e.country ? ` (${[e.city, e.country].filter(Boolean).join(', ')})` : ''}${e.email ? `\n  ${e.email}` : ''}${e.linkedin_url ? `\n  ${e.linkedin_url}` : ''}`;
    })
    .join('\n');

  const text = `Hi,

10 rows from the ${list.short_name} list, as promised. Real rows, straight from the sheet.

${rows}

Before you email any of them: read their last 3 deals. If you can't say in one line why they'd care, skip them. 12 good fits beat 500 cold names.

The full list, $${Math.round(list.price_cents / 100)}: ${siteUrl()}/${list.slug}
All 10 lists, $390: ${siteUrl()}/all

Yoann

Not raising right now? Reply "stop" and I won't write again.`;

  const sent = await send(email, { subject: `10 rows from ${list.short_name}`, text }, { tag: 'list_sample' });
  return sent.id;
}

export { sampleNudgeEmail };
