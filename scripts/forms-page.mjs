// /join, /pitch and /contact: standalone versions of the website popups, for
// links in emails and for anyone who lands here directly. The form itself is
// public/ci-forms.js, so the popup and the page can never drift apart.
const SITE = 'https://lists.climateinsiders.com';
const LOGO = 'https://cdn.prod.website-files.com/657b1ee1812a034008e87de8/657bd84fc257557413d8c2ed_6578c748563c8fb388d514ec_Wordmark.svg';
const FAVICON = 'https://cdn.prod.website-files.com/657b1ee1812a034008e87de8/658538a0538bd8c8a8da2e34_fav-sm.jpg';

export const FORM_PAGES = [
  { slug: 'join', kind: 'investor', title: 'Join the Climate Insiders investor community', description: 'Tell us what you want to back in climate tech and we will be in touch about upcoming opportunities.' },
  { slug: 'pitch', kind: 'founder', title: 'Pitch your climate startup | Climate Insiders', description: 'Send your pitch deck and the basics about your climate or deep tech startup to Climate Insiders.' },
  { slug: 'contact', kind: 'contact', title: 'Contact Climate Insiders', description: 'Partnerships, co-investing, joining the team or anything else: send Climate Insiders a message.' },
];

export function formPage({ slug, kind, title, description }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${SITE}/${slug}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${SITE}/${slug}">
<meta property="og:image" content="${SITE}/og.png">
<link rel="icon" href="${FAVICON}" type="image/jpeg">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-REVK9GPTEP"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-REVK9GPTEP',{page_location:location.origin+location.pathname});</script>
<style>
body{margin:0;background:#f8f9fa;color:#1e1d30;font-family:"Euclid Circular A",-apple-system,"Segoe UI",Arial,sans-serif}
header,main,footer{max-width:960px;margin:0 auto;padding-left:20px;padding-right:20px}
header{display:flex;align-items:center;justify-content:space-between;padding-top:24px;padding-bottom:20px}
header img{height:38px;width:auto;display:block}
header a,footer a{color:#1e1d30}
header .back{font-size:14px}
footer{font-size:13px;color:#6b6a7a;padding-top:24px;padding-bottom:40px;display:flex;gap:16px;flex-wrap:wrap}
@media(max-width:680px){header,main,footer{padding-left:12px;padding-right:12px}header img{height:30px}}
</style>
</head>
<body>
<header><a href="https://www.climateinsiders.com/"><img src="${LOGO}" alt="Climate Insiders"></a><a class="back" href="https://www.climateinsiders.com/">Back to the website</a></header>
<main><div data-ci-inline="${kind}"></div><noscript><p>This form needs JavaScript. You can email <a href="mailto:yoann@climateinsiders.com">yoann@climateinsiders.com</a> instead.</p></noscript></main>
<footer><a href="https://www.climateinsiders.com/terms-of-service">Terms of Service</a><a href="https://www.climateinsiders.com/privacy-policy">Privacy Policy</a><span>Climate Insiders</span></footer>
<script src="/ci-forms.js" defer></script>
</body>
</html>`;
}
