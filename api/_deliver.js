import { getActiveLists, isSectorSlug, getEntries, sendEmail, textToHtml, siteUrl, fmtUsd, BUNDLE_PRICE_CENTS } from './_lib.js';
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
export async function deliverPurchase({ email, slugs, bundle, upgrade, token, amountCents, name, sessionId, upsell, sectorBundle }) {
  const active = await getActiveLists();
  const allLists = active.filter((l) => !isSectorSlug(l.slug));
  const chosen = active.filter((l) => slugs.includes(l.slug));
  if (!chosen.length) throw new Error('No lists matched the purchase');

  const attachments = [];
  for (const list of chosen) {
    const entries = await getEntries(list.slug);
    list.stats = { rows: entries.length };
    attachments.push({ filename: xlsxFilename(list), content: toXlsx(entries, list, { name }) });
  }
  if (bundle) attachments.push({ filename: 'climate-insiders-follow-up-sequence.txt', content: FOLLOWUP_SEQUENCE });

  const msg = deliveryEmail({ chosen, allLists, bundle, upgrade, token, amountCents, name, sessionId, upsell, sectorBundle });
  const sent = await send(email, msg, { token, attachments, tag: 'list_delivery' });
  return sent.id;
}

export { sampleNudgeEmail };
