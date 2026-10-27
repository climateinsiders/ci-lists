// /terms: terms of sale, licence, no-refund policy and privacy notice.
// Draft written for Climate Insiders OÜ. Have a lawyer review before relying on it.
import { shell } from './render.mjs';

const SITE = 'https://lists.climateinsiders.com';
const UPDATED = '27 October 2026';
const CONTACT = 'legal@climateinsiders.com';

const S = [
  ['1. Who we are', `These terms apply to every purchase on lists.climateinsiders.com ("the Site"). The seller is Climate Insiders OÜ, a company registered in Estonia ("Climate Insiders", "we", "us"). Payments are collected through Stripe by Keystone Paradigm LLC, which provides payment collection for us, so your card statement may show "VC Boom". Keystone Paradigm LLC acts only as payment collector and is not the seller of the product. By buying, you ("you", "the Buyer") accept these terms. If you buy for a company, you confirm you can bind that company.`],
  ['2. What you are buying', `Each list is a digital compilation of professional contact information (for example names, job titles, organisations, business emails, LinkedIn profile links, cities and countries) and, for the fund directory, fund-level information such as stage, sector, geography and ticket size where known. It is delivered by email as an Excel file, together with a link to a read-only Airtable view. The number of records and the fields available are those shown on the product page at the time of purchase. Not every record has every field. Bundles and upgrades give you the lists named at checkout, and nothing more. No other database, record set or service is included unless it is named at checkout.`],
  ['3. Delivery', `Delivery is automatic and usually takes a few minutes after payment. The purchase is considered delivered once the email with the file and link has been sent to the address you gave at checkout. If it does not arrive, check your spam folder, then reply to your receipt and we will resend it.`],
  ['4. All sales are final, no refunds', `Because the product is digital content delivered immediately and cannot be returned, all sales are final and we do not offer refunds, credits or exchanges, including if you change your mind, did not use the data, or did not get the results you hoped for. By completing checkout you expressly request immediate delivery and acknowledge that, under EU Directive 2011/83/EU (Article 16(m)) and equivalent laws, you lose your right of withdrawal once delivery begins. This does not limit any rights you have by law that cannot be excluded. If a file is corrupted or not delivered, we will fix or resend it.`],
  ['5. Accuracy and corrections', `The data is compiled from publicly available professional sources and our own research, and is reviewed before release. People change jobs and emails change, so we do not guarantee that every record is accurate, complete, current or deliverable at the time you use it. The lists are provided "as is" and "as available". If you report a record you believe is wrong, we will review it and correct it where we can, at our discretion. This is our only obligation regarding data quality.`],
  ['6. Your licence', `We grant you a personal, non-exclusive, non-transferable licence to use the data for your own internal business purposes, such as researching and contacting investors for your own fundraise or fund. You may not resell, sublicense, publish, share, give away or distribute the data or the Airtable link, in whole or in part, to anyone outside your organisation; upload it to a data marketplace or broker; combine it into a product sold to others; or use it to build a competing list. We may revoke access, including disabling links, if we reasonably believe these terms are breached. The selection, arrangement and notes in each list are our intellectual property and protected database content.`],
  ['7. Your responsibilities when you contact people', `You decide whether, when and how you contact anyone on a list, and you are solely responsible for doing so lawfully. That includes complying with data protection and marketing laws that apply to you and to the people you contact, such as the GDPR, the UK GDPR, the ePrivacy rules and PECR, CAN-SPAM and CASL. In particular: contact people one to one, in a professional capacity, about something relevant to their role; identify yourself; offer an easy way to opt out and respect it; delete anyone who asks; and do not use the data for spam, harassment, scraping, or any unlawful or misleading purpose. For your own outreach, you act as an independent data controller.`],
  ['8. No advice, no guarantee of results', `The lists and any emails, templates or tips we send are general information. They are not investment, financial, legal or tax advice, and they are not an offer or solicitation to buy or sell securities. We are not a broker-dealer, placement agent or investment adviser, and we do not introduce you to anyone. We do not guarantee replies, meetings, investment or any fundraising outcome.`],
  ['9. Prices, offers and payment', `Prices are in US dollars and include everything you need to receive the product. Taxes may be added where required. Special offers, bundles, credits and upgrade prices are time-limited, apply only as shown at checkout, and can be changed or withdrawn at any time for future purchases. Payment is processed by Stripe; we never see or store your full card details.`],
  ['10. Chargebacks', `If you have a problem, please contact us first by replying to your receipt. If you open a chargeback or payment dispute for a product that was delivered, we will provide the delivery records to the payment provider, and we may revoke your access while the dispute is open.`],
  ['11. Limitation of liability', `To the fullest extent permitted by law, neither Climate Insiders OÜ nor Keystone Paradigm LLC, nor their directors, employees or affiliates, will be liable for any indirect, incidental, special or consequential loss, or for loss of profits, revenue, funding, data, goodwill or opportunity, arising from the Site or the lists. Our total liability for any claim relating to a purchase is limited to the amount you paid for that purchase. Nothing in these terms limits liability that cannot be limited by law.`],
  ['12. Indemnity', `You agree to indemnify and hold harmless Climate Insiders OÜ and Keystone Paradigm LLC, and their directors, employees and affiliates, from any claims, fines, losses and costs (including reasonable legal fees) arising from your use of the data, your outreach, or your breach of these terms or of any law.`],
  ['13. Privacy', `When you buy, we receive your name, email address and payment details from Stripe, and we keep a record of your purchase. We use this to deliver your lists, send receipts, handle support, keep accounting records, and send a few short follow-up emails about your purchase, which you can stop at any time with the link in each email. We use Stripe (payments), Resend (email), Supabase and Vercel (hosting and records) and Airtable (list delivery). We do not sell buyer data.`],
  ['14. People listed in our lists', `If you are listed and want your details corrected or removed from future versions, email ${CONTACT} and we will act on it promptly. We only include professional contact information related to a person's role at an investment organisation.`],
  ['15. Changes, law and disputes', `We may update these terms; the version on this page at the time of your purchase applies to that purchase. These terms are governed by the laws of Estonia, and disputes will be handled by the courts of Harju County, Tallinn, unless the law of your country of residence gives you a mandatory right to a different forum. If any part of these terms is found unenforceable, the rest stays in force. Our failure to enforce a term is not a waiver.`],
  ['16. Contact', `Climate Insiders OÜ. Questions about these terms: ${CONTACT}, or reply to your purchase email.`],
];

export function termsPage() {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const body = `<main class="legal">
  <a class="back" href="/">← Back to the lists</a>
  <h1>Terms of sale and privacy</h1>
  <p class="updated">Last updated ${UPDATED}</p>
  <p class="lede"><b>The short version:</b> you get a digital list delivered instantly, for your own use. All sales are final, no refunds. Don't resell or share it. Contact people lawfully and respectfully. Wrong row? Tell us and we'll fix it.</p>
  ${S.map(([h, p]) => `<section><h2>${esc(h)}</h2><p>${esc(p)}</p></section>`).join('\n  ')}
</main>
<style>
.legal{max-width:720px;margin:24px auto 48px;padding:0 16px;font-family:var(--sans);color:var(--ink);line-height:1.6}
.legal h1{font-family:var(--serif);font-size:clamp(28px,5vw,40px);margin:12px 0 4px}
.legal h2{font-size:16px;margin:28px 0 6px}
.legal p{margin:0 0 10px;font-size:15px;color:var(--ink-2)}
.legal .updated{color:var(--muted);font-size:13px}
.legal .lede{background:var(--card);border:1px solid var(--rule);border-radius:12px;padding:14px 16px;color:var(--ink)}
.legal .back{color:var(--muted);text-decoration:none;font-size:14px}
</style>`;
  return shell({
    title: 'Terms of sale and privacy · Climate Insiders Investor Lists',
    description: 'Terms of sale, data licence, delivery, refunds and privacy notice for Climate Insiders Investor Lists, sold by Climate Insiders OÜ (Estonia).',
    canonical: `${SITE}/terms`,
    body,
  });
}
