// Every email a buyer gets, in one place.
//
// How these are written (keep it this way when editing):
// - One idea per email. Not a listicle. If it needs "three rules", it's two emails.
// - Sounds like Yoann typing on a laptop in Lisbon, not a brand. Lowercase subjects, short lines,
//   the odd fragment. No "Quick one", no "Here's the thing", no "game-changer", no em dashes.
// - Only true stories. The facts used below come from Yoann's own public page:
//   co-founded Climentum Capital (EUR 150M climate fund), 47 investments, helped Keiran
//   at Entocycle close his Series A (Climentum led it).
// Yoann to confirm before launch (these are his habits/opinions, written in his voice):
//   E0 "The cold emails I actually answered all did one thing..."
//   E2 "the round rarely closes where it starts", Climentum being Copenhagen-based.
// - Plain text, rendered as a plain Gmail-looking email (see textToHtml). No logos, no buttons.
import { siteUrl, fmtUsd, UNIQUE_INVESTORS, UNIQUE_EMAILS, BUNDLE_PRICE_CENTS } from './_lib.js';

const n = (x) => Number(x).toLocaleString('en-US');
const hi = (name) => (name ? `Hi ${name},` : 'Hi,');
const daysLeft = (iso) => Math.max(1, Math.ceil((new Date(iso) - Date.now()) / 86400000));

function footer(token) {
  return `\n\n\n\nYou're getting this because you bought a list from me. Don't want the follow-ups? ${siteUrl()}/api/unsubscribe?t=${token}\nTerms of purchase and licence: ${siteUrl()}/terms`;
}

function links(chosen) {
  return chosen
    .map((l) => (l.airtable_url ? `${l.short_name}: ${l.airtable_url}` : `${l.short_name}: Airtable link follows later today, the Excel file is attached`))
    .join('\n');
}

// E0, right after payment. Data first, then one idea: specificity beats volume.
export function deliveryEmail({ chosen, allLists, bundle, token, amountCents, name, sessionId, upsell }) {
  const one = chosen.length === 1 ? chosen[0] : null;
  const subject = bundle ? 'all ten, as promised' : `your ${one.short_name.toLowerCase()} list`;
  const text = `${hi(name)}

${bundle ? `All ten lists, ${n(UNIQUE_INVESTORS)} investors. Links below, one Excel file per list attached, and the follow-up sequence I promised is in there too.` : `It's yours. Airtable link below, and the Excel file is attached if you'd rather work offline. Status dropdowns are already in it.`}

${links(chosen)}

Small thing before you dive in: in Airtable, click "Copy base" (top right). You get your own copy with a Status column. Saves you building a tracker.

Now the part that matters more than the list.

I spent years on the fund side, co-founded Climentum, made 47 investments. The cold emails I actually answered all did one thing. They named one of our portfolio companies and told me in a sentence why they were the next one.

That's it. Ten minutes of homework per investor.

Almost nobody does it, because it doesn't scale. Which is exactly why it works.

So please don't send ${bundle ? n(UNIQUE_INVESTORS) : n(chosen.reduce((a, l) => a + (l.stats?.rows || 0), 0) || 150)} emails this week. Pick 12. Do the ten minutes on each.

In two days I'll send you the email I'd write if I were raising tomorrow.

Yoann${!bundle && !upsell && amountCents > 0 && sessionId ? `

ps. most rounds end up pulling money from more than one country, so one list is rarely the whole story. Everything else I have is on your order page, at a price that only shows up there, for the next 24 hours: ${siteUrl()}/thanks?session_id=${sessionId}` : ''}${footer(token)}`;
  return { subject, text };
}

// E1, day 2. The artifact: the email itself, with the reasoning written in the margins.
export function templateEmail({ token, name }) {
  const subject = "the email i'd send";
  const text = `${hi(name)}

Promised you this. It's short on purpose.



Subject: [Company], [one number] in [timeframe]

Hi [first name],

[Company] does [what] for [who]. [One number that proves it.]
Raising [amount] [stage], [X] already in.
Writing because [their portfolio company] tells me you get [your space].
20 min next week?

[You]



Four lines. A few notes on why.

The number goes in the subject line because that's where they decide. Most investors triage on their phone between meetings. If the subject doesn't earn the open, nothing below it exists.

"Already in" is the line that does the heavy lifting. Nobody likes being first into a round. If no one has committed yet, say who's in diligence. If no one is, leave the line out rather than fake it.

The third line is the ten minutes of homework I mentioned. It's the only line they can't get from anyone else, and it's the one that gets read twice.

No deck attached. The deck is what you send after they reply.

Send it to your 12. Then, the hard part: wait.

Yoann

ps. silence after five days is normal. I'll send you the follow-up in a few days.${footer(token)}`;
  return { subject, text };
}

// E2, day 4. The offer. Single-list buyers only. Plain, no hype, one reason it matters.
export function offerEmail({ token, quote, allLists, name }) {
  const credit = fmtUsd(BUNDLE_PRICE_CENTS - quote.price);
  const subject = `about the other ${allLists.length - 1} lists`;
  const text = `${hi(name)}

Something I saw on the investor side again and again: the round rarely closes where it starts.

Entocycle is a London company. When Keiran raised his Series A, the lead came from Climentum, the fund I co-founded in Copenhagen. Different country, different network, and it closed.

You can't plan for that with one region.

So here's an offer, plainly, open for ${daysLeft(quote.expiresAt)} more days:

All ${allLists.length} lists. ${n(UNIQUE_INVESTORS)} investors, ${n(UNIQUE_EMAILS)} of them with a direct email.
Your ${credit} counts. You pay ${fmtUsd(quote.price)} instead of ${fmtUsd(BUNDLE_PRICE_CENTS)}.

That's family offices across Europe, the US, the UK, DACH, the Nordics, France and Benelux, Asia-Pacific, Canada and LatAm. Plus 366 LPs and funds of funds (the people who back the VCs), and 470 climate funds with stage and ticket size where we have it.

I'll also send you the three-email follow-up sequence I'd use after silence.

${siteUrl()}/all?u=${token}

Yoann${footer(token)}`;
  return { subject, text };
}

// E3, day 7. The follow-up email. Value first. Last call only if the credit is still open.
export function followupEmail({ token, quote, bundle, name }) {
  const subject = 'if they went quiet';
  const lastCall = !bundle && quote && quote.active;
  const text = `${hi(name)}

It's been about a week. If you sent your 12, my guess is a couple replied and the rest went quiet.

Don't read anything into the quiet. Investors read on their phone, mean to reply, and then their day happens. The second email is where a lot of the replies come from.

Here's mine. Same thread as the first, five to seven days later:



Hi [first name],

One thing changed since I wrote: [new customer, new number, new investor in].

Still think you'd get it because of [the same reason, shorter].

Worth a call?

[You]



The only rule: it has to carry something new. "Just bumping this" tells them nothing happened, and that's the opposite of what you want them to think.

Two follow-ups, then stop. Come back in three months with a bigger number. They'll remember you sent the good email.

Yoann${lastCall ? `

ps. last few days on the upgrade. What you paid still counts: all ${n(UNIQUE_INVESTORS)} investors for ${fmtUsd(quote.price)}. ${siteUrl()}/all?u=${token}` : ''}${footer(token)}`;
  return { subject, text };
}

// Sample requesters, day 1. They saw 10 rows and didn't buy. One honest test, no pressure.
export function sampleNudgeEmail({ list }) {
  const rest = Math.max(0, (list.stats?.rows || 0) - 10);
  const subject = 'did the 10 rows help?';
  const text = `Hi,

You grabbed 10 rows from the ${list.short_name} list yesterday.

Here's a two-minute way to decide if the other ${n(rest)} are worth it. Pick the two names closest to what you're building. Look up their last three deals.

If one of them backed something that looks like you, that's your first email. And the full list probably has another dozen like them.

${list.short_name}, ${fmtUsd(list.price_cents)}: ${siteUrl()}/${list.slug}
or all ten, ${fmtUsd(BUNDLE_PRICE_CENTS)}: ${siteUrl()}/all

Either way, good luck with the raise.

Yoann

ps. not raising yet? Just reply "later" and I'll leave you alone.`;
  return { subject, text };
}

// Attached to bundle deliveries (promised in the offer email).
export const FOLLOWUP_SEQUENCE = `The three-email sequence
from Yoann, Climate Insiders

Use it after a first email that got silence. Same thread every time.


1. Day 0, the first note

Subject: [Company], [one number] in [timeframe]

Hi [first name],
[Company] does [what] for [who]. [One number that proves it.]
Raising [amount] [stage], [X] already in.
Writing because [their portfolio company] tells me you get [your space].
20 min next week?


2. Day 5 to 7, one new fact

Hi [first name],
One thing changed since I wrote: [new customer, number or investor].
Still think you'd get it because of [same reason, shorter].
Worth a call?


3. Day 14, the easy out

Hi [first name],
Guessing the timing's off, no problem at all.
If [the one thing they'd want to see: first revenue, a lead, a pilot result] happens, can I come back to you?


Why the third one works: people like being let off the hook. It's the email that gets the most "actually, let's talk" replies.

After that, stop. Come back in three months with a bigger number.
`;
