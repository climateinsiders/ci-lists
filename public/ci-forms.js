/* Climate Insiders website forms: investor, founder pitch and contact.
   One script for the popups on climateinsiders.com and the standalone pages on
   lists.climateinsiders.com (/join, /pitch, /contact). It posts to /api/join.

   On climateinsiders.com it also routes every signup button to the right popup:
   investor buttons and email boxes -> investor, "send your deck" -> founder,
   contact links -> contact. Add ?open=investor|founder|contact to any page to
   open a popup directly (handy for links in emails and for testing). */
(function () {
  'use strict';
  if (window.CIForms) return;

  var HOST = location.hostname;
  var ON_SITE = /^(www\.)?climateinsiders\.com$/.test(HOST);
  var API = ON_SITE ? 'https://lists.climateinsiders.com/api/join' : '/api/join';
  var PAGES = { investor: 'https://lists.climateinsiders.com/join', founder: 'https://lists.climateinsiders.com/pitch', contact: 'https://lists.climateinsiders.com/contact' };
  var TERMS = 'https://www.climateinsiders.com/terms-of-service';
  var PRIVACY = 'https://www.climateinsiders.com/privacy-policy';
  var MAX_DECK = 25 * 1024 * 1024;
  var DECK_EXT = /\.(pdf|ppt|pptx|key|doc|docx)$/i;
  var FONT = 'https://cdn.prod.website-files.com/657b1ee1812a034008e87de8/';

  var SECTORS = ['Energy & Renewables', 'Mobility & Transport', 'Food & Agriculture', 'Industry & Manufacturing', 'Buildings & Construction', 'Carbon Removal', 'Circular Economy & Waste', 'Water', 'Nature-Based Solutions', 'Climate Software & Data', 'No preference, show me everything'];
  var CODES = 'AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI CV KH CM CA CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HK HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI KW KG LA LV LB LS LR LY LI LT LU MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG KP MK NO OM PK PW PS PA PG PY PE PH PL PT QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA KR SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VA VE VN YE ZM ZW';
  function countries() {
    var names = CODES.split(' ');
    try { var d = new Intl.DisplayNames(['en'], { type: 'region' }); names = names.map(function (c) { return d.of(c); }); } catch (e) {}
    return names.sort(function (a, b) { return a.localeCompare(b); });
  }

  var FIRST = { n: 'first_name', l: 'First name', req: 1, ac: 'given-name' };
  var LAST = { n: 'last_name', l: 'Last name', req: 1, ac: 'family-name' };
  var EMAIL = { n: 'email', l: 'Email', t: 'email', req: 1, ac: 'email' };

  var FORMS = {
    investor: {
      eyebrow: 'Investor community', title: 'Invest in climate <em>moonshots</em>',
      sub: 'Tell us what you want to back. We will be in touch about upcoming opportunities.',
      submit: 'Join the community',
      sections: [
        { h: 'About you', f: [FIRST, LAST, EMAIL, { n: 'phone', l: 'Phone', t: 'tel', ac: 'tel', opt: 1 }, { n: 'country', l: 'Country of residence', t: 'country' }] },
        { h: 'How you invest', f: [
          { n: 'ticket', l: 'How much would you look to commit per year?', t: 'select', o: ['Less than €10,000', '€10,000-20,000', '€20,000-50,000', '€50,000-100,000', '€100,000+', 'Other'] },
          { n: 'ticket_other', l: 'Roughly how much?', show: ['ticket', 'Other'] },
          { n: 'format', l: 'Your ideal format', t: 'select', o: ['Hands-on: Pick your deals a-la-carte', 'Hands-off: Trust the expert', 'Undecided'] },
          { n: 'secondaries', l: 'Would you consider secondaries?', t: 'select', o: ['Yes', 'No', 'Tell me more'], hint: 'Buying shares from an existing holder instead of in a new round.' },
          { n: 'targets', l: 'Which sectors do you want to see?', t: 'chips', o: SECTORS },
          { n: 'motivations', l: 'What draws you to climate tech?', t: 'chips', o: ['Financial returns', 'Drive enormous climate impact', 'Learn about startup investing', 'Might help your future career move', 'Other'] }
        ] }
      ],
      newsletter: 'Send me the weekly newsletter: climate funding signals and investor lists. Free, unsubscribe anytime.',
      consent: 'and to being contacted about investment opportunities.',
      risk: 'Investing in unlisted companies carries a high risk of losing all the money you invest. This form is not an offer or financial advice.',
      done: ['You are on the list.', 'We have your details and will be in touch about upcoming opportunities.'],
      cal: 'Book a 15 minute call'
    },
    founder: {
      eyebrow: 'Founders', title: 'Pitch us your <em>moonshot</em>',
      sub: 'Send us your deck and the basics. About five minutes. We will be in touch if there is a fit.',
      submit: 'Send my pitch',
      sections: [
        { h: 'You', f: [FIRST, LAST, EMAIL, { n: 'whatsapp', l: 'WhatsApp number', t: 'tel', ac: 'tel', opt: 1 }] },
        { h: 'Your startup', f: [
          { n: 'startup', l: 'Startup name', req: 1, ac: 'organization' },
          { n: 'country', l: 'Country of registration', t: 'country', req: 1 },
          { n: 'website', l: 'Website', t: 'url', req: 1, ph: 'yourcompany.com' },
          { n: 'linkedin', l: 'Company LinkedIn page', t: 'url', req: 1, ph: 'linkedin.com/company/...' },
          { n: 'sector', l: 'Sector', req: 1, ph: 'Green hydrogen, waste, carbon capture...' },
          { n: 'stage', l: 'Current stage', t: 'select', req: 1, o: ['Pre-seed', 'Seed', 'Late seed', 'Bridge round', 'Series A', 'Other'] },
          { n: 'trl', l: 'Technology readiness level (TRL)', t: 'select', req: 1, o: ['1', '2', '3', '4', '5', '6', '7', '8', '9'], hint: '1 is basic research, 9 is proven in commercial use.' }
        ] },
        { h: 'The raise', f: [
          { n: 'raising', l: 'Amount you are raising (USD)', t: 'money', req: 1, ph: '1.5m' },
          { n: 'valuation', l: 'Current valuation (USD)', t: 'money', req: 1, ph: '8m', hint: 'Your best estimate. Not a hard filter.' },
          { n: 'closing_date', l: 'Target closing date', t: 'date', opt: 1 },
          { n: 'investors', l: 'Investors already in, or likely to join', t: 'area', opt: 1, full: 1 }
        ] },
        { h: 'Your pitch deck', f: [
          { n: 'deck', l: 'Upload your deck', t: 'file', req: 1, full: 1 },
          { n: 'coaching', l: 'Want to work with us to make your deck world-class?', t: 'radio', o: ['Yes', 'No'], req: 1, full: 1, link: ['Watch the short video', 'https://youtu.be/YNr5vyV91BI'] }
        ] }
      ],
      newsletter: 'Send me the weekly newsletter: fundraising tactics and investor lists to help you raise faster. Free, unsubscribe anytime.',
      consent: 'and to being contacted about my pitch.',
      done: ['Pitch received.', 'Your deck and details arrived. We will be in touch if there is a fit.'],
      cal: 'Book your free assessment call'
    },
    contact: {
      eyebrow: 'Contact', title: 'Talk to <em>us</em>',
      sub: 'Partnerships, co-investing, joining the team or anything else.',
      submit: 'Send message',
      sections: [
        { h: 'About you', f: [
          { n: 'category', l: 'Which describes you best?', t: 'select', req: 1, full: 1, o: [['Talent', 'Talent (you want to work with us?)'], ['Partnership', 'Partnership (media, newsletter, sponsor)'], ['Co-investor', 'Co-investor (VC, syndicate, angel)'], ['Other', 'Other']] },
          { n: 'name', l: 'Full name', req: 1, ac: 'name' }, EMAIL,
          { n: 'location', l: 'Where are you based?', t: 'country' },
          { n: 'linkedin', l: 'LinkedIn profile', t: 'url', opt: 1 },
          { n: 'partnership_type', l: 'Type of partnership', t: 'chips', show: ['category', 'Partnership'], o: ['Sponsorship', 'Podcast', 'Newsletter', 'Media Partner', 'Other'] },
          { n: 'investor_type', l: 'What type of investor are you?', t: 'chips', show: ['category', 'Co-investor'], o: ['Venture Capital', 'CVC', 'Family Office', 'Angel Investor', 'Other'] },
          { n: 'stages', l: 'Which stages do you focus on?', t: 'chips', show: ['category', 'Co-investor'], o: ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Later Stages'] },
          { n: 'industries', l: 'Which industries do you invest in?', t: 'chips', show: ['category', 'Co-investor'], o: ['Technology (Software, SaaS, AI)', 'Healthcare & Biotech', 'Fintech (Financial Technology)', 'Consumer Goods & Retail', 'Energy & Clean Tech', 'Real Estate & PropTech', 'E-commerce', 'Media & Entertainment', 'Transportation & Mobility', 'Manufacturing & Industrial Technology', 'Agriculture & FoodTech', 'Education & EdTech', 'Cybersecurity', 'Telecommunications & 5G', 'Blockchain & Cryptocurrency'] },
          { n: 'thesis', l: 'Your investment thesis in one sentence', show: ['category', 'Co-investor'], full: 1, opt: 1 },
          { n: 'company_url', l: 'Company website', t: 'url', show: ['category', 'Co-investor'], opt: 1 },
          { n: 'role', l: 'Which describes your role?', t: 'chips', show: ['category', 'Talent'], o: ['Marketer', 'Sales', 'Developer', 'Designer', 'VC Background', 'Other'] },
          { n: 'message', l: 'Your message', t: 'area', req: 1, full: 1 }
        ] }
      ],
      newsletter: 'Send me the weekly newsletter. Free, unsubscribe anytime.',
      consent: 'and to being contacted about my message.',
      done: ['Message sent.', 'Thanks for writing. We will get back to you.']
    }
  };

  var CSS = ':host{all:initial}*{box-sizing:border-box}' +
    '.root{font-family:"Euclid Circular A",-apple-system,"Segoe UI",Arial,sans-serif;color:#1e1d30;font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased;text-align:left}' +
    '.ov{position:fixed;inset:0;z-index:2147483600;background:rgba(18,17,30,.64);display:flex;align-items:center;justify-content:center;padding:24px}.ov[hidden]{display:none}' +
    '.panel{position:relative;background:#f8f9fa;border-radius:28px;width:100%;max-width:960px;max-height:100%;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.35)}' +
    'form{display:flex;flex-direction:column;min-height:0;margin:0}.scroll{overflow:auto;padding:34px 40px 18px;overscroll-behavior:contain}' +
    '.x{position:absolute;top:16px;right:16px;z-index:2;width:44px;height:44px;border:0;border-radius:50%;background:#fff;color:#1e1d30;font-size:26px;line-height:1;cursor:pointer;box-shadow:0 4px 16px rgba(30,29,48,.14)}' +
    '.eyebrow{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#6b6a7a}.eyebrow svg{width:18px;height:18px;color:#ff9a2b}' +
    'h2{font-size:40px;line-height:1.12;font-weight:700;margin:8px 52px 8px 0;letter-spacing:-.01em}h2 em{font-style:normal;color:#ff9a2b}' +
    '.sub{margin:0 0 22px;color:#4d4c5e;max-width:620px}' +
    '.card{background:#fff;border-radius:20px;padding:22px 24px 24px;margin:0 0 14px}h3{margin:0 0 14px;font-size:20px;font-weight:700}' +
    '.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 18px}.fld{min-width:0}.full{grid-column:1/-1}[hidden]{display:none!important}' +
    '.lab{display:block;font-size:14px;font-weight:500;margin:0 0 6px}.opt{color:#8a8998;font-weight:400}.hint{display:block;font-size:12.5px;color:#6b6a7a;margin:5px 6px 0}' +
    'input[type=text],input[type=email],input[type=tel],input[type=date],select,textarea{width:100%;font:inherit;color:#1e1d30;background:#fff;border:1px solid #d4d4d8;border-radius:999px;height:52px;padding:0 22px;outline:0;-webkit-appearance:none;appearance:none}' +
    'select{padding-right:44px;background:#fff url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'14\' height=\'9\' fill=\'none\' stroke=\'%231e1d30\' stroke-width=\'2\'><path d=\'M1 1l6 6 6-6\'/></svg>") no-repeat right 18px center;text-overflow:ellipsis}' +
    'textarea{height:auto;min-height:104px;border-radius:20px;padding:14px 22px;resize:vertical}' +
    'input:focus-visible,select:focus-visible,textarea:focus-visible{border-color:#ff9a2b;box-shadow:0 0 0 3px rgba(255,154,43,.28)}' +
    'button:focus-visible,a:focus-visible,.chip:focus-within,.drop:focus-within{outline:3px solid rgba(255,154,43,.7);outline-offset:2px}' +
    '.chips{display:flex;flex-wrap:wrap;gap:9px}.chip{position:relative;cursor:pointer}.chip input{position:absolute;opacity:0;pointer-events:none}.chip span{display:inline-block;border:1px solid #d4d4d8;border-radius:999px;padding:9px 17px;font-size:14px;background:#fff;user-select:none}.chip:hover span{border-color:#1e1d30}.chip input:checked+span{background:#1e1d30;border-color:#1e1d30;color:#fff}' +
    '.drop{display:block;position:relative;border:2px dashed #d4d4d8;border-radius:20px;padding:26px 18px;text-align:center;cursor:pointer;background:#fcfcfd}.drop:hover,.drop.over{border-color:#ff9a2b;background:#fff8f0}.drop input{position:absolute;opacity:0;width:1px;height:1px}.drop b{display:block;font-weight:600;word-break:break-word}.drop small{color:#6b6a7a}' +
    '.vlink{display:inline-block;margin:0 0 10px;font-size:14px;color:#1e1d30}' +
    '.check{display:flex;gap:12px;align-items:flex-start;font-size:14px;margin:0 0 12px;cursor:pointer}.check input{width:20px;height:20px;margin:1px 0 0;flex:none;accent-color:#ff9a2b}.check a{color:#1e1d30}' +
    '.risk{font-size:12px;color:#6b6a7a;margin:4px 6px 0}' +
    '.err{display:block;color:#b3261e;font-size:13px;margin:5px 6px 0}.bad input,.bad select,.bad textarea,.bad .drop{border-color:#b3261e}' +
    '.bar{border-top:1px solid #e7e7ec;background:#fff;padding:14px 40px;display:flex;align-items:center;gap:18px;flex-wrap:wrap}' +
    '.btn{display:inline-flex;align-items:center;justify-content:center;min-height:54px;padding:0 34px;border:0;border-radius:999px;background:#ff9a2b;color:#fff;font:inherit;font-weight:500;letter-spacing:.03em;text-decoration:none;cursor:pointer}.btn:hover{background:#f28a15}.btn[disabled]{opacity:.65;cursor:progress}.btn.alt{background:#fff;color:#1e1d30;border:1px solid #1e1d30}.btn.alt:hover{background:#f1f1f4}' +
    '.msg{flex:1;min-width:180px;font-size:14px;color:#4d4c5e}.msg.bad{color:#b3261e}.prog{height:6px;border-radius:9px;background:#ececf1;overflow:hidden;margin-top:6px}.prog i{display:block;height:100%;width:0;background:#ff9a2b}' +
    '.done{text-align:center;padding:64px 28px 52px;overflow:auto}.done .tick{width:72px;height:72px;border-radius:50%;background:#ff9a2b;color:#fff;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;font-size:36px}.done h2{margin:0 0 10px}.done p{color:#4d4c5e;max-width:520px;margin:0 auto 8px}.acts{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin:24px 0 6px}.news{background:#fff;border-radius:20px;padding:18px 22px;max-width:520px;margin:22px auto 0}.news .btn{margin-top:12px}.link{background:none;border:0;font:inherit;color:#1e1d30;text-decoration:underline;cursor:pointer;margin-top:18px}' +
    '.hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}' +
    '.inline{max-width:960px;margin:0 auto;box-shadow:none;max-height:none;overflow:visible;background:transparent}.inline .scroll{overflow:visible;padding:8px 0 4px}.inline .bar{border:0;border-radius:20px;padding:18px 24px;position:sticky;bottom:0;box-shadow:0 -6px 24px rgba(30,29,48,.07)}.inline h2{margin-right:0}' +
    '@media(max-width:680px){.ov{padding:0}.panel{border-radius:0;height:100%;max-width:none}.inline{height:auto}.scroll{padding:24px 14px 10px}.grid{grid-template-columns:1fr}h2{font-size:28px;margin-right:48px}.card{padding:18px 16px 20px}.bar{padding:12px 14px}.btn{width:100%}.msg{flex-basis:100%;order:-1}.msg:empty{display:none}}';

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" aria-hidden="true"><path d="M5 5h14v14M19 5L5 19"/></svg>';

  function field(kind, f) {
    var id = 'ci-' + kind + '-' + f.n, t = f.t || 'text';
    var wide = f.full || t === 'chips' ? ' full' : '';
    var opt = f.opt ? ' <span class="opt">optional</span>' : '';
    var show = f.show ? ' data-show="' + f.show[0] + '" data-is="' + esc(f.show[1]) + '" hidden' : '';
    var head = '<div class="fld' + wide + '" data-f="' + f.n + '"' + show + '>';
    var lab = '<label class="lab" for="' + id + '">' + esc(f.l) + opt + '</label>';
    var hint = f.hint ? '<span class="hint">' + esc(f.hint) + '</span>' : '';
    var req = f.req ? ' aria-required="true"' : '';
    var body;
    if (t === 'select' || t === 'country') {
      var o = t === 'country' ? countries() : f.o;
      body = lab + '<select id="' + id + '" name="' + f.n + '"' + req + '><option value="">Select</option>' + o.map(function (v) {
        var val = v instanceof Array ? v[0] : v, txt = v instanceof Array ? v[1] : v;
        return '<option value="' + esc(val) + '">' + esc(txt) + '</option>';
      }).join('') + '</select>';
    } else if (t === 'chips' || t === 'radio') {
      var type = t === 'chips' ? 'checkbox' : 'radio';
      body = '<span class="lab" id="' + id + '">' + esc(f.l) + opt + '</span>' +
        (f.link ? '<a class="vlink" href="' + f.link[1] + '" target="_blank" rel="noopener">' + esc(f.link[0]) + '</a>' : '') +
        '<div class="chips" role="group" aria-labelledby="' + id + '">' + f.o.map(function (v) {
          return '<label class="chip"><input type="' + type + '" name="' + f.n + '" value="' + esc(v) + '"><span>' + esc(v) + '</span></label>';
        }).join('') + '</div>';
    } else if (t === 'area') {
      body = lab + '<textarea id="' + id + '" name="' + f.n + '" maxlength="4000"' + req + '></textarea>';
    } else if (t === 'file') {
      body = '<span class="lab">' + esc(f.l) + '</span><label class="drop"><input id="' + id + '" type="file" name="' + f.n + '" accept=".pdf,.ppt,.pptx,.key,.doc,.docx"><b class="fname">Choose a file or drop it here</b><small>PDF, PowerPoint, Keynote or Word. Up to 25 MB.</small></label>';
    } else {
      var it = t === 'money' || t === 'url' ? 'text' : t;
      var mode = t === 'money' ? ' inputmode="decimal"' : t === 'url' ? ' inputmode="url" autocapitalize="none" spellcheck="false"' : '';
      body = lab + '<input id="' + id + '" type="' + it + '" name="' + f.n + '" maxlength="300"' + mode + (f.ac ? ' autocomplete="' + f.ac + '"' : '') + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '') + req + '>';
    }
    return head + body + hint + '<span class="err" hidden></span></div>';
  }

  function markup(kind, inline) {
    var F = FORMS[kind];
    return '<div class="panel' + (inline ? ' inline' : '') + '"' + (inline ? '' : ' role="dialog" aria-modal="true" aria-labelledby="ci-' + kind + '-title"') + '>' +
      (inline ? '' : '<button type="button" class="x" data-close aria-label="Close">&times;</button>') +
      '<form novalidate><div class="scroll"><div class="eyebrow">' + ARROW + esc(F.eyebrow) + '</div>' +
      '<h2 id="ci-' + kind + '-title">' + F.title + '</h2><p class="sub">' + esc(F.sub) + '</p>' +
      F.sections.map(function (s) { return '<section class="card"><h3>' + esc(s.h) + '</h3><div class="grid">' + s.f.map(function (f) { return field(kind, f); }).join('') + '</div></section>'; }).join('') +
      '<section class="card"><label class="check"><input type="checkbox" name="newsletter"><span>' + esc(F.newsletter) + '</span></label>' +
      '<div class="fld" data-f="gdpr"><label class="check" style="margin:0"><input type="checkbox" name="gdpr"><span>I agree to the <a href="' + TERMS + '" target="_blank" rel="noopener">Terms of Service</a> and <a href="' + PRIVACY + '" target="_blank" rel="noopener">Privacy Policy</a>, ' + esc(F.consent) + '</span></label><span class="err" hidden></span></div></section>' +
      (F.risk ? '<p class="risk">' + esc(F.risk) + '</p>' : '') +
      '<div class="hp" aria-hidden="true"><label>Leave empty<input type="text" name="company_website" tabindex="-1" autocomplete="off"></label></div></div>' +
      '<div class="bar"><button type="submit" class="btn">' + esc(F.submit) + '</button><div class="msg" role="status" aria-live="polite"></div></div></form></div>';
  }

  function post(body) {
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Something went wrong. Please try again.'); return j; }); },
        function () { throw new Error('Could not reach the server. Check your connection and try again.'); });
  }

  function put(url, file, type, onProgress) {
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest();
      x.open('PUT', url);
      x.setRequestHeader('content-type', type);
      x.upload.onprogress = function (e) { if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100)); };
      x.onload = function () { x.status < 300 ? resolve() : reject(new Error('The deck upload failed. Please try again.')); };
      x.onerror = function () { reject(new Error('The deck upload was interrupted. Check your connection and try again.')); };
      x.send(file);
    });
  }

  function wire(kind, panel, ctx) {
    var F = FORMS[kind], form = panel.querySelector('form'), msg = form.querySelector('.msg'), btn = form.querySelector('[type=submit]');
    var fields = F.sections.reduce(function (a, s) { return a.concat(s.f); }, []);
    var uploaded = null, busy = false;
    function box(n) { return form.querySelector('[data-f="' + n + '"]'); }
    function value(f) {
      if (f.t === 'chips') return [].map.call(form.querySelectorAll('[name="' + f.n + '"]:checked'), function (c) { return c.value; });
      if (f.t === 'radio') { var r = form.querySelector('[name="' + f.n + '"]:checked'); return r ? r.value : ''; }
      if (f.t === 'file') return form.elements[f.n].files[0] || null;
      return form.elements[f.n].value.trim();
    }
    function conditions() {
      fields.forEach(function (f) { if (f.show) box(f.n).hidden = form.elements[f.show[0]].value !== f.show[1]; });
    }
    function fail(n, text) {
      var b = box(n), e = b.querySelector('.err');
      b.classList.toggle('bad', !!text); e.textContent = text || ''; e.hidden = !text;
    }
    function check() {
      var first = null;
      fields.concat([{ n: 'gdpr', t: 'gdpr' }]).forEach(function (f) {
        var b = box(f.n); if (b.hidden) return;
        var v = f.t === 'gdpr' ? form.elements.gdpr.checked : value(f), m = '';
        if (f.t === 'gdpr') { if (!v) m = 'Please accept the terms to continue.'; }
        else if (f.req && (!v || (v.length === 0))) m = f.t === 'file' ? 'Please attach your deck.' : f.t === 'select' || f.t === 'country' || f.t === 'radio' ? 'Please choose one.' : 'This one is required.';
        else if (v && f.t === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v)) m = 'Enter a valid email address.';
        else if (v && f.t === 'url' && !/^(https?:\/\/)?[^\s\/]+\.[^\s]{2,}$/i.test(v)) m = 'Enter a web address, for example yourcompany.com';
        else if (v && f.t === 'money' && !/^\d+(\.\d+)?(k|m|mn|b|bn)?$/i.test(v.replace(/[$€£,\s]/g, ''))) m = 'Enter a number, for example 750000 or 1.5m';
        else if (v && f.t === 'file' && !DECK_EXT.test(v.name)) m = 'Use PDF, PowerPoint, Keynote or Word.';
        else if (v && f.t === 'file' && v.size > MAX_DECK) m = 'That file is over 25 MB. Export a smaller PDF.';
        fail(f.n, m); if (m && !first) first = b;
      });
      return first;
    }
    function say(text, bad, pct) {
      msg.className = 'msg' + (bad ? ' bad' : '');
      msg.innerHTML = esc(text) + (pct === undefined ? '' : '<div class="prog"><i style="width:' + pct + '%"></i></div>');
    }
    form.addEventListener('change', function (e) {
      conditions();
      var b = e.target.closest('[data-f]'); if (b) fail(b.getAttribute('data-f'), '');
      if (e.target.type === 'file') {
        var file = e.target.files[0];
        var size = file && (file.size < 1048576 ? Math.max(1, Math.round(file.size / 1024)) + ' KB' : (file.size / 1048576).toFixed(1) + ' MB');
        b.querySelector('.fname').textContent = file ? file.name + ' (' + size + ')' : 'Choose a file or drop it here';
        uploaded = null;
        if (file && file.size > MAX_DECK) fail('deck', 'That file is over 25 MB. Export a smaller PDF.');
      }
    });
    form.addEventListener('input', function (e) { var b = e.target.closest('[data-f]'); if (b && b.classList.contains('bad') && e.target.type !== 'file') fail(b.getAttribute('data-f'), ''); });
    var drop = form.querySelector('.drop');
    if (drop) {
      ['dragenter', 'dragover'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
      ['dragleave', 'drop'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
      drop.addEventListener('drop', function (e) {
        if (!e.dataTransfer || !e.dataTransfer.files.length) return;
        var input = form.elements.deck; input.files = e.dataTransfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (busy) return;
      var bad = check();
      if (bad) { say('Please check the highlighted fields.', true); bad.scrollIntoView({ block: 'center', behavior: 'smooth' }); var i = bad.querySelector('input,select,textarea'); if (i) i.focus({ preventScroll: true }); return; }
      var data = { kind: kind, gdpr: true, newsletter: form.elements.newsletter.checked, company_website: form.elements.company_website.value,
        source: (ON_SITE ? 'climateinsiders.com' : '') + (ctx.from || location.pathname) };
      fields.forEach(function (f) { if (f.t !== 'file' && !box(f.n).hidden) data[f.n] = value(f); });
      busy = true; btn.disabled = true;
      var step = Promise.resolve();
      var file = form.elements.deck && form.elements.deck.files[0];
      if (file) {
        step = uploaded ? Promise.resolve() : (say('Uploading your deck', false, 0), post({ action: 'upload', filename: file.name, size: file.size, company_website: data.company_website }).then(function (t) {
          return put(t.uploadUrl, file, t.contentType, function (p) { say('Uploading your deck: ' + p + '%', false, p); }).then(function () { uploaded = t.path; });
        }));
      }
      step.then(function () { if (file) data.deck_path = uploaded; say('Sending'); return post(data); })
        .then(function (r) { done(kind, panel, r, ctx); })
        .catch(function (err) { busy = false; btn.disabled = false; say(err.message, true); });
    });
    conditions();
  }

  function done(kind, panel, r, ctx) {
    var F = FORMS[kind];
    panel.querySelector('form').remove();
    var d = document.createElement('div'); d.className = 'done'; d.tabIndex = -1;
    d.innerHTML = '<div class="tick">&#10003;</div><h2 id="ci-' + kind + '-title">' + esc(F.done[0]) + '</h2><p>' + esc(F.done[1]) + '</p>' +
      (r.emailed === false ? '' : '<p>A confirmation is on its way to your inbox. If you do not see it, check promotions.</p>') +
      (r.calendar ? '<div class="acts"><a class="btn" href="' + esc(r.calendar) + '" target="_blank" rel="noopener">' + esc(F.cal) + '</a></div>' : '') +
      (r.next ? '<div class="news"><b>One more click for the newsletter.</b><br>Substack asks you to confirm it yourself. It is free. If it shows paid plans, you can skip them.<br><a class="btn alt" href="' + esc(r.next) + '" target="_blank" rel="noopener">Confirm my newsletter</a></div>' : '') +
      (ctx.inline ? '<p style="margin-top:22px"><a href="https://www.climateinsiders.com/" style="color:#1e1d30">Back to climateinsiders.com</a></p>' : '<button type="button" class="link" data-close>Back to the site</button>');
    panel.appendChild(d); d.focus({ preventScroll: true });
    ctx.finished = true;
    if (ctx.inline) window.scrollTo(0, 0);
    try { localStorage.setItem('ci_news_popup', Date.now()); } catch (e) {}
    if (window.dataLayer) window.dataLayer.push({ event: 'ci_form_submit', form: kind });
    if (typeof window.gtag === 'function') window.gtag('event', kind + '_signup');
  }

  function fonts() {
    if (ON_SITE) return; // the website already loads them
    var s = document.createElement('style');
    s.textContent = [['Light', 300, '65a899b42e45a206603ca2b7'], ['Regular', 400, '65a899b490bf40ac00cb31b9'], ['Medium', 500, '65a899b418e8cbe027157eaa'], ['SemiBold', 600, '65a899b4454bc180d47d1f82'], ['Bold', 700, '65a899b5841517005135f302']]
      .map(function (w) { return '@font-face{font-family:"Euclid Circular A";src:url("' + FONT + w[2] + '_Euclid%20Circular%20A%20' + w[0] + '.ttf") format("truetype");font-weight:' + w[1] + ';font-display:swap}'; }).join('');
    document.head.appendChild(s);
  }

  function shadow(el) {
    var root = el.attachShadow({ mode: 'open' });
    root.innerHTML = '<style>' + CSS + '</style><div class="root"></div>';
    return root.querySelector('.root');
  }

  /* ---------- popup ---------- */
  var layer = null, open_ = null, cache = {}, lastFocus = null, oldOverflow = '';
  function focusables(el) { return [].filter.call(el.querySelectorAll('a[href],button:not([disabled]),input:not([tabindex="-1"]),select,textarea'), function (n) { return n.getClientRects().length; }); }
  function close() {
    if (!open_) return;
    open_.ov.hidden = true;
    document.documentElement.style.overflow = oldOverflow;
    if (open_.ctx.finished) { open_.ov.remove(); delete cache[open_.kind]; }
    open_ = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function open(kind, opts) {
    if (!FORMS[kind]) return false;
    opts = opts || {};
    if (open_) close();
    if (!layer) { var host = document.createElement('div'); host.id = 'ci-forms-host'; document.body.appendChild(host); layer = shadow(host); }
    var news = document.getElementById('ci-popup'); if (news) { var nx = news.querySelector('[data-x]'); if (nx) nx.click(); }
    var it = cache[kind];
    if (!it) {
      var ov = document.createElement('div'); ov.className = 'ov'; ov.setAttribute('data-kind', kind); ov.innerHTML = markup(kind, false);
      layer.appendChild(ov);
      it = cache[kind] = { kind: kind, ov: ov, ctx: {} };
      wire(kind, ov.querySelector('.panel'), it.ctx);
      var downOnBackdrop = false;
      ov.addEventListener('mousedown', function (e) { downOnBackdrop = e.target === ov; });
      ov.addEventListener('click', function (e) { if ((e.target === ov && downOnBackdrop) || e.target.closest('[data-close]')) close(); });
      ov.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
        if (e.key !== 'Tab') return;
        var f = focusables(ov), first = f[0], last = f[f.length - 1], cur = layer.getRootNode().activeElement;
        if (e.shiftKey && cur === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
      });
    }
    it.ctx.from = opts.from || location.pathname;
    var mail = it.ov.querySelector('input[name=email]');
    if (mail && opts.email) mail.value = opts.email;
    lastFocus = document.activeElement;
    oldOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    it.ov.hidden = false; open_ = it;
    var target = null;
    if (window.matchMedia && window.matchMedia('(pointer:fine)').matches) {
      target = [].find.call(it.ov.querySelectorAll('input[type=text],input[type=email]'), function (n) { return !n.value && n.getClientRects().length && n.tabIndex !== -1; });
      if (kind === 'contact') target = it.ov.querySelector('select[name=category]');
    }
    (target || it.ov.querySelector('.x') || it.ov).focus({ preventScroll: true });
    return true;
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open_) close(); });

  /* ---------- routing on climateinsiders.com ---------- */
  function classify(a) {
    var href = a.getAttribute('href') || '', tf = a.getAttribute('data-tf-slider') || a.getAttribute('data-tf-popup') || '';
    var text = a.textContent.replace(/\s+/g, ' ').trim().toLowerCase(), path = location.pathname;
    var all = tf + ' ' + href;
    if (/naTjpR4B|lists\.climateinsiders\.com\/join/.test(all) || href === '/features/features-1') return 'investor';
    if (/mLQ7VcR1|lists\.climateinsiders\.com\/pitch/.test(all)) return 'founder';
    if (/e3HzjBAu|lists\.climateinsiders\.com\/contact/.test(all)) return 'contact';
    if (path === '/community' && text.indexOf('become a member') === 0) return 'investor';
    if (href === '/contact/contact-1' && /forum/.test(text)) return 'investor';
    return null;
  }
  function isEmailForm(f) {
    var seen = [].filter.call(f.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select'),
      function (n) { return n.name !== 'g-recaptcha-response' && n.getClientRects().length; });
    return seen.length === 1 && seen[0].type === 'email';
  }
  function route() {
    [].forEach.call(document.querySelectorAll('a'), function (a) {
      var kind = classify(a);
      if (!kind) {
        if (a.getAttribute('href') === '/contact/contact-1') {
          var text = a.textContent.toLowerCase();
          a.setAttribute('href', /read all/.test(text) ? '/blog' : location.pathname === '/' ? '/investments' : '/how-to-invest');
        }
        return;
      }
      [].slice.call(a.attributes).forEach(function (at) { if (at.name.indexOf('data-tf-') === 0) a.removeAttribute(at.name); });
      a.setAttribute('data-ci-open', kind); a.setAttribute('href', PAGES[kind]); a.removeAttribute('target');
    });
    // The capture phase runs before any listener an old embed attached to the button.
    window.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('[data-ci-open]');
      if (!a || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault(); e.stopImmediatePropagation();
      open(a.getAttribute('data-ci-open'), { from: location.pathname });
    }, true);
    // Email boxes: Webflow still records the address, we hide its message and
    // open the full investor form with the address filled in.
    var css = document.createElement('style');
    css.textContent = '.ci-lead .w-form-done,.ci-lead .w-form-fail{display:none!important}';
    document.head.appendChild(css);
    [].forEach.call(document.querySelectorAll('form'), function (f) { if (f.querySelector('input[type=email]')) f.onsubmit = null; });
    document.addEventListener('submit', function (e) {
      var f = e.target;
      if (!f || f.tagName !== 'FORM' || !isEmailForm(f)) return;
      var input = f.querySelector('input[type="email"]');
      if (!input || !input.value || !input.checkValidity()) return;
      var cap = f.querySelector('[name="g-recaptcha-response"]');
      if (cap && !cap.value) return; // let Webflow ask for the tickbox first
      var wrap = f.closest('.w-form');
      if (wrap && !wrap.classList.contains('ci-lead')) {
        wrap.classList.add('ci-lead');
        new MutationObserver(function () { if (f.style.display === 'none') f.style.display = ''; }).observe(f, { attributes: true, attributeFilter: ['style'] });
      }
      open('investor', { email: input.value, from: location.pathname });
    }, true);
  }

  function start() {
    fonts();
    var slots = document.querySelectorAll('[data-ci-inline]');
    [].forEach.call(slots, function (el) {
      var kind = el.getAttribute('data-ci-inline'), root = shadow(el), ctx = { inline: true };
      root.innerHTML = markup(kind, true);
      ctx.from = location.pathname;
      wire(kind, root.querySelector('.panel'), ctx);
      var m = document.cookie.match(/(?:^|; )ci_lead=([^;]*)/);
      if (m && kind === 'investor') {
        try { root.querySelector('input[name=email]').value = decodeURIComponent(m[1]); } catch (e) {}
        document.cookie = 'ci_lead=; domain=.climateinsiders.com; path=/; max-age=0; secure; samesite=lax';
      }
    });
    if (slots.length) return;
    if (ON_SITE) route();
    var want = new URLSearchParams(location.search).get('open');
    if (want && FORMS[want]) open(want, { from: location.pathname });
  }

  window.CIForms = { open: open, close: close, isOpen: function () { return !!open_; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
