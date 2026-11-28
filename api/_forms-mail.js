// Emails sent by the website forms. Underscore prefix: a module, not a function.
const SUBSTACK = 'https://climateinsiders.substack.com';
export const CAL_INVESTOR = 'https://calendly.com/yoann-climate/15monboardingcall';
export const CAL_FOUNDER = 'https://calendly.com/yoann-climate/boost-your-pitch';
const RISK = 'Investing in unlisted companies carries a high risk of losing all the money you invest. Nothing in this email is an offer or financial advice.';

const R = {
  vcs: ['474 climate VCs, with the stage and cheque size each one writes', 'https://lists.climateinsiders.com/climate-vcs-474'],
  lps: ['366 LPs who back climate funds', 'https://lists.climateinsiders.com/lps-366'],
  all: ['Every investor list we publish', 'https://lists.climateinsiders.com/all'],
  pod: ['The podcast: founders and investors on how deals got done', 'https://climateinsiders.co'],
  trl: ['Why TRL 5 to 7 is the sweet spot for climate tech investors (free)', `${SUBSTACK}/p/why-trl-5-7-is-the-sweet-spot-for`],
  raise: ['I ran a $2M raise through Claude. Here is what happened (free)', `${SUBSTACK}/p/i-ran-a-2m-raise-through-claude-here`],
  guide: ['The startup fundraising guide (paid members)', `${SUBSTACK}/p/the-only-startup-fundraising-guide`],
  decks40: ['40 pitch decks that built unicorns (paid members)', `${SUBSTACK}/p/40-pitch-decks-that-built-unicorns`],
  decks50: ['50 pitch decks that raised billions (paid members)', `${SUBSTACK}/p/the-ultimate-repository-of-killer`],
  vc12k: ['12,000+ VCs and angels, one investor list (paid members)', `${SUBSTACK}/p/12000-vcs-and-angels-your-ultimate`],
  family: ['2,656 European family offices (paid members)', `${SUBSTACK}/p/2656-fully-curated-european-family`],
  familyUs: ['The investor list no one talks about: family offices (paid members)', `${SUBSTACK}/p/the-investor-list-no-one-talks-about-ba4`],
};

export function sequence(kind, d) {
  const first = d.firstName;
  if (kind === 'investor') {
    return [
      { day: 0, subject: 'You are on the Climate Insiders investor list', paras: [
        `Hi ${first},`, 'You are on the Climate Insiders investor list. We will be in touch about upcoming opportunities.'],
        button: ['Book a 15 minute call', CAL_INVESTOR], listTitle: 'While you wait, the most useful things we have published:', list: [R.vcs, R.lps, R.all, R.pod], risk: true },
      { day: 2, subject: 'How to read a climate deal', paras: [
        `Hi ${first},`, 'You choose which startups you back, if any. Before the first one, it helps to know what you are looking at: how mature the technology is, who else is investing, and what has to go right.', 'Start here:'],
        list: [R.trl, R.vcs, R.pod], after: ['Reply with the sectors you care about most. It helps us send you the relevant ones.'], risk: true },
      { day: 5, subject: 'Who else is investing in climate', paras: [
        `Hi ${first},`, 'Knowing who sits around the table is half of diligence. These lists show who writes the cheques.'],
        list: [R.lps, R.family, R.familyUs], button: ['Book a 15 minute call', CAL_INVESTOR], after: ['This is the last email in this series.'], risk: true },
    ];
  }
  if (kind === 'founder') {
    return [
      { day: 0, subject: `We received your pitch: ${d.startup}`, paras: [
        `Hi ${first},`, `Your deck and details for ${d.startup} arrived. We will be in touch if there is a fit.`,
        'Please do not wait for us to run your round. These help most founders move faster:'],
        list: [R.raise, R.vcs, R.guide], ...(d.coaching ? { button: ['Book your free assessment call', CAL_FOUNDER] } : {}) },
      { day: 2, subject: 'What a deck that raises looks like', paras: [
        `Hi ${first},`, 'Investors compare your deck with every other deck they saw that week. See what the strong ones do.'],
        list: [R.decks40, R.decks50, R.trl], after: ['Reply if you want us to look at one specific slide.'] },
      { day: 5, subject: 'Build your investor list', paras: [
        `Hi ${first},`, 'A round is won on the list: the right stage, the right sector, the right cheque size. Start from these.'],
        list: [R.vcs, R.vc12k, R.family], button: ['Book your free assessment call', CAL_FOUNDER], after: ['This is the last email in this series.'] },
    ];
  }
  return [
    { day: 0, subject: 'We got your message', paras: [`Hi ${first},`, 'Thanks for writing to Climate Insiders. Your message arrived and we will get back to you.'] },
  ];
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function render(m, { newsletterUrl, stopUrl } = {}) {
  const text = [
    ...m.paras.flatMap((p) => [p, '']),
    ...(m.list ? [...(m.listTitle ? [m.listTitle] : []), ...m.list.map(([t, u]) => `- ${t}\n  ${u}`), ''] : []),
    ...(m.button ? [`${m.button[0]}: ${m.button[1]}`, ''] : []),
    ...(m.after || []).flatMap((p) => [p, '']),
    ...(newsletterUrl ? [`You asked for the newsletter. Confirm it here: ${newsletterUrl}`, ''] : []),
    'Yoann', 'Climate Insiders',
    ...(m.risk ? ['', RISK] : []),
    ...(stopUrl ? ['', `Stop these follow-up emails: ${stopUrl}`] : []),
  ].join('\n');
  const p = (s) => `<p style="margin:0 0 16px">${esc(s)}</p>`;
  const btn = (label, href) => `<p style="margin:22px 0"><a href="${esc(href)}" style="display:inline-block;background:#ff9a2b;color:#ffffff;font-weight:600;padding:13px 26px;border-radius:999px;text-decoration:none">${esc(label)}</a></p>`;
  const html = `<div style="background:#f8f9fa;padding:28px 14px;font-family:'Euclid Circular A',-apple-system,Segoe UI,Arial,sans-serif;color:#1e1d30;line-height:1.55;font-size:15px">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;padding:30px 28px">
<p style="margin:0 0 22px;font-weight:700;letter-spacing:.04em;font-size:14px">CLIMATE INSIDERS</p>
${m.paras.map(p).join('')}
${m.list ? `${m.listTitle ? `<p style="margin:0 0 8px;font-weight:600">${esc(m.listTitle)}</p>` : ''}<ul style="padding-left:18px;margin:0 0 8px">${m.list.map(([t, u]) => `<li style="margin:0 0 10px"><a href="${esc(u)}" style="color:#1e1d30">${esc(t)}</a></li>`).join('')}</ul>` : ''}
${m.button ? btn(...m.button) : ''}
${(m.after || []).map(p).join('')}
${newsletterUrl ? `<div style="background:#f8f9fa;border-radius:14px;padding:16px 18px;margin:22px 0"><b>You asked for the newsletter.</b><br>It takes one click to confirm.${btn('Confirm my newsletter', newsletterUrl)}</div>` : ''}
<p style="margin:18px 0 0">Yoann<br>Climate Insiders</p>
${m.risk ? `<p style="margin:22px 0 0;font-size:12px;color:#6b6a7a">${esc(RISK)}</p>` : ''}
${stopUrl ? `<p style="margin:14px 0 0;font-size:12px;color:#6b6a7a"><a href="${esc(stopUrl)}" style="color:#6b6a7a">Stop these follow-up emails</a></p>` : ''}
</div></div>`;
  return { subject: m.subject, text, html };
}
