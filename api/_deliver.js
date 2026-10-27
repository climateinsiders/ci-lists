import { getActiveLists, getEntries, toCsv, sendEmail, textToHtml, siteUrl, fmtUsd } from './_lib.js';

// Build the CSVs for the purchased slugs and email them. Returns the Resend id.
export async function deliverPurchase({ email, slugs, bundle, amountCents, sessionId, upsell = false }) {
  const lists = await getActiveLists();
  const chosen = lists.filter((l) => slugs.includes(l.slug));
  if (!chosen.length) throw new Error('No lists matched the purchase');

  const attachments = [];
  const lines = [];
  for (const list of chosen) {
    const entries = await getEntries(list.slug);
    attachments.push({ filename: list.csv_filename, content: toCsv(entries, list) });
    lines.push(`- ${list.name} (${entries.length} rows)${list.airtable_url ? `\n  Airtable view: ${list.airtable_url}` : ''}`);
  }

  const many = chosen.length > 1;
  const subject = bundle ? 'Your 10 investor lists (all of them, attached)' : many ? `Your ${chosen.length} investor lists (attached)` : `Your list: ${chosen[0].name}`;
  // Single-list buyers get a link back to the $250 add-on; the page checks what they already own.
  const upgrade = !bundle && !upsell && sessionId ? `Want the other ${lists.length - chosen.length} lists too? One click, $250: ${siteUrl()}/thanks?session_id=${sessionId}\n\n` : '';
  const text = `Hi,

Here ${chosen.length === 1 ? 'is the list' : 'are the lists'} you bought. CSV attached, opens in Excel, Numbers, Google Sheets or Notion.

${lines.join('\n')}

Three things before you write to anyone:

1. Do not email the whole sheet. Filter by sector and stage first. Twelve well-matched names beat five hundred cold ones, and these people remember who blasted them.
2. One email per person, under 110 words, one specific line about them. A short second note 4 to 5 days later if silence.
3. The Nordics reply to email. France, Benelux and DACH reply to a coffee. Book the flight.

If a row is wrong or out of date, reply to this email with the name and I will fix it in the master sheet.

${upgrade}Go raise,
Yoann

Climate Insiders · climateinsiders.com
Receipt: ${fmtUsd(amountCents)} charged by Stripe. Reply to this email for an invoice.`;

  const sent = await sendEmail({
    to: email,
    subject,
    text,
    html: textToHtml(text),
    attachments,
    tags: [{ name: 'type', value: 'list_delivery' }],
  });
  return sent.id;
}

export async function deliverSample({ email, list }) {
  const entries = await getEntries(list.slug, { sampleOnly: true });
  const rows = entries
    .map((e) => {
      if (e.extra) {
        const x = e.extra;
        return `- ${e.firm}${e.region ? `, ${e.region}` : ''}${x.stage ? ` · ${x.stage}` : ''}${x.sector ? ` · ${x.sector}` : ''}${e.website ? `\n  ${e.website}` : ''}`;
      }
      return `- ${e.name}${e.title ? `, ${e.title}` : ''} · ${e.firm}${e.city || e.country ? ` (${[e.city, e.country].filter(Boolean).join(', ')})` : ''}${e.email ? `\n  ${e.email}` : ''}${e.linkedin_url ? `\n  ${e.linkedin_url}` : ''}`;
    })
    .join('\n');

  const text = `Hi,

Ten rows from "${list.name}", as promised. No tricks, these are real rows from the sheet.

${rows}

The full list has the rest, sorted by region, then office. ${fmtUsd(list.price_cents)} one time, delivered to this inbox in two minutes:
${siteUrl()}/${list.slug}

One rule before you write to any of them: pick the 12 that fit your sector and stage. Leave the rest alone.

Yoann
Climate Insiders

Not for you? Reply "stop" and I won't write again.`;

  const sent = await sendEmail({
    to: email,
    subject: `10 rows from ${list.short_name} (free sample)`,
    text,
    html: textToHtml(text),
    tags: [{ name: 'type', value: 'list_sample' }],
  });
  return sent.id;
}
