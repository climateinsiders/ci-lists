// Every email the buyer gets, in one place. Plain text first (it reads like a person wrote it),
// rendered to light HTML by textToHtml. Rules: no em dashes, short lines, one idea each, signed Yoann.
import { siteUrl, fmtUsd, UNIQUE_INVESTORS, UNIQUE_EMAILS, BUNDLE_PRICE_CENTS } from './_lib.js';

const n = (x) => Number(x).toLocaleString('en-US');

function footer(token) {
  return `\n\n--\nYou bought an investor list from Climate Insiders (payments by VC Boom).\nNo more emails: ${siteUrl()}/api/unsubscribe?t=${token}`;
}

function linksBlock(chosen) {
  return chosen
    .map((l) => `${l.name}\n${l.airtable_url ? `Airtable: ${l.airtable_url}` : 'Airtable link coming in a separate email today.'}`)
    .join('\n\n');
}

// E0: right after payment. Gets them to the data in one click, then three rules.
export function deliveryEmail({ chosen, allLists, bundle, upgrade, token, amountCents }) {
  const one = chosen.length === 1 ? chosen[0] : null;
  const subject = bundle ? `All ${allLists.length} lists are yours` : `Your ${one.short_name} list`;
  const text = `Hi,

${bundle ? `All ${allLists.length} lists are yours. ${n(UNIQUE_INVESTORS)} investors.` : 'Here it is.'}

${linksBlock(chosen)}

CSV attached too, if you live in Sheets or a CRM.

One tip for Airtable: hit "Copy base" top right. Your copy has a Status and a Notes column. That is your outreach tracker, done.

Before you write to anyone, three things I learned on the other side of the table, after 47 investments:

1. Pick 12, not ${bundle ? n(UNIQUE_INVESTORS) : n(chosen.reduce((a, l) => a + (l.stats?.rows || 0), 0) || 150)}. Filter by country, read each firm's last 3 deals. If you can't say why they'd care in one line, skip them.

2. First email, 4 lines. What you do, the number that proves it, why them, a 20 minute ask. No deck attached. The deck is the reward for the reply.

3. Family offices move on trust. Before you send, check LinkedIn for one mutual. One intro beats ten cold emails.

In two days I'll send you the exact email I'd write if I were raising today.

Yoann${!bundle ? `

P.S. Raising from more than one region? Your ${fmtUsd(amountCents)} counts toward all ${allLists.length} lists for the next 10 days: ${siteUrl()}/all?u=${token}` : ''}${footer(token)}`;
  return { subject, text };
}

// E1, day 2: the artifact. The 4-line email, with why each line is there.
export function templateEmail({ token, bundle }) {
  const subject = 'The 4-line email';
  const text = `Hi,

Promised you the email. Here it is.

---

Subject: [Company]: [one number] in [timeframe]

Hi [first name],

[Company] [does what] for [who]. [The number: revenue, pilots, signed LOIs].
Raising [amount] [stage], [X] already committed.
Writing to you because [their deal or thesis, one line, specific].
20 minutes next week?

[Your name]

---

Why each line is there:

The number goes in the subject. They decide in the inbox, not in the email.

"Already committed" is the strongest line in any raise. Nobody wants to be first. If you have zero, write who is in diligence.

The "why you" line is the only one you can't copy and paste. It's also the one they read twice. One portfolio company, one quote from a podcast, one fund thesis. Pick one.

What to leave out: the deck, the TAM slide, the word "revolutionary".

Send it to your 12 this week. Track replies in the Status column.

Yoann

P.S. Silence after 5 days is normal. In three days I'll send you the follow-up that gets the reply.${footer(token)}`;
  return { subject, text };
}

// E2, day 4: the offer. Only for people who bought a single list.
export function offerEmail({ token, quote, allLists }) {
  const price = fmtUsd(quote.price);
  const credit = fmtUsd(BUNDLE_PRICE_CENTS - quote.price);
  const days = Math.max(1, Math.ceil((new Date(quote.expiresAt) - Date.now()) / 86400000));
  const subject = `Your ${credit} counts`;
  const text = `Hi,

Quick one.

Almost no round I've seen closed in one region. A Paris seed ends up with a Swiss family office. An Austin Series A gets its lead from Singapore. The money is where it is, not where you are.

So here's what I'll do for the next ${days} days.

All ${allLists.length} lists. ${n(UNIQUE_INVESTORS)} investors. ${n(UNIQUE_EMAILS)} direct emails.
The ${credit} you paid counts. You pay ${price}, not ${fmtUsd(BUNDLE_PRICE_CENTS)}.

What's in it:

- Family offices in Europe, the US, the UK, DACH, the Nordics, France and Benelux, Asia-Pacific, Canada and LatAm
- 366 LPs and funds of funds. The people who back your VCs. Gold if you ever raise a fund
- 470 climate VC funds with stage, ticket size and who leads
- Every list in Airtable and CSV, fixed when a row goes stale
- Bonus: my 3-email follow-up sequence, the one I'd send after silence

If it's not useful, reply within 14 days and I'll refund the lot. No questions.

See all ${allLists.length} lists: ${siteUrl()}/all?u=${token}

Yoann${footer(token)}`;
  return { subject, text };
}

// E3, day 7: the follow-up. Value first, last call for single-list buyers.
export function followupEmail({ token, quote, bundle }) {
  const subject = "If they didn't reply";
  const lastCall = !bundle && quote && quote.active;
  const text = `Hi,

Day 7. If you sent your 12, you probably have 2 replies and 10 silences.

That's normal. Investors read on their phone, between meetings, and forget. The second email is where most replies come from.

Here's the follow-up. Send it 5 to 7 days after the first one, in the same thread.

---

Hi [first name],

One update since my last note: [new number, new customer, new investor in].

Still think [their fund] is the right fit because [same reason, shorter].

Worth a call?

[Your name]

---

Three rules:

New information or don't send it. "Just bumping this" tells them nothing changed.

Same thread. They see the first email under it, so you don't repeat yourself.

Two follow-ups max. After that, move on and come back when you have a bigger number.

Yoann${lastCall ? `

P.S. Last call on the upgrade. Your earlier purchase still counts for ${Math.max(1, Math.ceil((new Date(quote.expiresAt) - Date.now()) / 86400000))} more days: all ${n(UNIQUE_INVESTORS)} investors for ${fmtUsd(quote.price)}. ${siteUrl()}/all?u=${token}` : ''}${footer(token)}`;
  return { subject, text };
}

// Sample requesters, day 1: they saw 10 rows, they didn't buy.
export function sampleNudgeEmail({ list }) {
  const subject = `The other ${n(Math.max(0, (list.stats?.rows || 0) - 10))}`;
  const text = `Hi,

Yesterday you got 10 rows from the ${list.short_name} list.

Quick test before you decide: pick the 2 names that fit you best and look up their last 3 deals. If even one of them backed a company like yours, the full list pays for itself with one reply.

The full ${list.short_name} list, ${fmtUsd(list.price_cents)}: ${siteUrl()}/${list.slug}
All ${n(UNIQUE_INVESTORS)} investors across 10 lists, ${fmtUsd(BUNDLE_PRICE_CENTS)}: ${siteUrl()}/all

Yoann

P.S. Not raising right now? Reply "later" and I'll stop here.`;
  return { subject, text };
}

// Bonus file attached to bundle deliveries (promised in the offer email).
export const FOLLOWUP_SEQUENCE = `THE 3-EMAIL FOLLOW-UP SEQUENCE
Climate Insiders. Use it after a first email that got silence.

EMAIL 1. Day 0. The first note (the 4-line email)
Subject: [Company]: [one number] in [timeframe]
Hi [first name],
[Company] [does what] for [who]. [The number].
Raising [amount] [stage], [X] already committed.
Writing to you because [their deal or thesis, one line].
20 minutes next week?

EMAIL 2. Day 5 to 7. Same thread. New information only.
Hi [first name],
One update since my last note: [new number, customer or investor].
Still think [their fund] fits because [same reason, shorter].
Worth a call?

EMAIL 3. Day 14. Same thread. The easy out.
Hi [first name],
Guessing the timing is off. No problem.
If [one specific thing they'd want to see: first revenue, a lead, a pilot result] happens, can I come back to you?
Either way, thanks for reading.

RULES
- Never "just bumping this". Every follow-up carries one new fact.
- Same thread, so they see what came before.
- Stop after email 3. Come back in 3 months with a bigger number.
- The "easy out" in email 3 gets more replies than email 2. People like being let off the hook.
`;
