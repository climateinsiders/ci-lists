// /join  -- the investor community signup.
//
// Replaces Typeform naTjpR4B, which sat CLOSED from May 2025 to Nov 2026
// because it used an ending-screen redirect the plan no longer covered, so
// Typeform refused to publish it. Every GET STARTED click in that window hit
// "you can't access this typeform" and was never recorded anywhere.
//
// One page rather than Typeform's one-question-at-a-time. A motivated investor
// would rather see the whole commitment up front than be drip-fed 11 screens,
// and a single page has no state to lose halfway through. Only the first four
// fields are required; everything below them sharpens the match and is optional.
import { shell } from './render.mjs';

const SITE = 'https://lists.climateinsiders.com';

const TICKETS = ['Less than €10,000', '€10,000-20,000', '€20,000-50,000', '€50,000-100,000', '€100,000+', 'Other'];
const FORMATS = ['Hands-on: Pick your deals a-la-carte', 'Hands-off: Trust the expert', 'Undecided'];
const MOTIVES = ['Financial gain (20%+ IRR)', 'Drive enormous climate impact', 'Learn about startup investing', 'Might help your future career move', 'Other'];
const TARGETS = ['Energy & Renewables', 'Mobility & Transport', 'Food & Agriculture', 'Industry & Manufacturing', 'Buildings & Construction', 'Carbon Removal', 'Circular Economy & Waste', 'Water', 'Nature-Based Solutions', 'Climate Software & Data', 'No preference, show me everything'];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const chk = (n, v, t) => `<label class="opt"><input type="${t}" name="${n}" value="${esc(v)}"><span>${esc(v)}</span></label>`;

const CSS = `
.jf{max-width:660px;margin:0 auto;padding:0 0 64px}
.jf .lede{font-size:16px;color:var(--ink-2);line-height:1.5;margin:10px 0 0}
.jf form{margin-top:26px}
.jf fieldset{border:1.5px solid var(--ink);border-radius:18px;box-shadow:4px 4px 0 var(--ink);background:var(--paper);padding:20px 22px 22px;margin:0 0 20px}
.jf legend{font-family:var(--serif);font-variation-settings:'opsz' 144;font-weight:900;font-size:19px;padding:0 9px;margin-left:-4px}
.jf .row{display:grid;gap:14px;grid-template-columns:1fr 1fr}
@media(max-width:560px){.jf .row{grid-template-columns:1fr}}
.jf label.f{display:block;margin-top:14px}
.jf label.f[hidden]{display:none}
.jf label.f>span{display:block;font-size:13px;font-weight:600;margin-bottom:5px}
.jf .hint{font-weight:400;color:var(--ink-2)}
.jf input[type=text],.jf input[type=email],.jf input[type=tel],.jf select{width:100%;box-sizing:border-box;font:inherit;font-size:15px;color:var(--ink);background:#fff;border:1.5px solid var(--ink);border-radius:10px;padding:11px 13px}
.jf input:focus-visible,.jf select:focus-visible,.jf .opt:focus-within{outline:3px solid var(--orange);outline-offset:2px}
.jf .opts{display:flex;flex-wrap:wrap;gap:9px;margin-top:9px}
.jf .opt{display:inline-flex;align-items:center;gap:8px;border:1.5px solid var(--ink);border-radius:999px;padding:8px 15px;font-size:14px;cursor:pointer;background:#fff;transition:background .12s ease}
.jf .opt:hover{background:var(--card,#f4f6f4)}
.jf .opt input{accent-color:var(--orange);margin:0}
.jf .consent{display:flex;gap:11px;align-items:flex-start;margin-top:15px;font-size:14px;line-height:1.45}
.jf .consent input{margin-top:3px;accent-color:var(--orange);flex:none;width:17px;height:17px}
.jf .pitch{background:#f4f6f4;border-radius:12px;padding:15px 17px;margin-top:4px}
.jf .pitch b{font-family:var(--serif);font-weight:900}
.jf .hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.jf .err{display:none;margin:0 0 16px;padding:13px 16px;border:1.5px solid #b3261e;border-radius:12px;background:#fdecea;color:#7a1810;font-size:14.5px}
.jf .err.on{display:block}
.jf .actions{display:flex;align-items:center;gap:15px;flex-wrap:wrap}
.jf .fine{font-size:12.5px;color:var(--ink-2);margin:13px 0 0;line-height:1.45}
.jf .done{display:none}
.jf .done.on{display:block;padding-top:48px}
.jf .done:focus{outline:none}
.jf .pitch[hidden],.jf [hidden]{display:none}
.jf .done h2{font-family:var(--serif);font-variation-settings:'opsz' 144;font-weight:900;font-size:30px;margin:0 0 10px}
`;

export function joinPage() {
  const body = `<main class="jf">
  <header class="hero" style="text-align:left;padding:34px 0 0">
    <span class="script">join the community</span>
    <h1>Invest alongside us in climate tech.</h1>
    <p class="lede">We share the deals we are putting our own money into, with the analysis behind each one. You choose which startups to back, from €1,000. Tell us what you are looking for and we will be in touch when the next round opens.</p>
  </header>

  <div class="err" id="jerr" role="alert"></div>

  <form id="jform" novalidate>
    <fieldset>
      <legend>You</legend>
      <div class="row">
        <label class="f"><span>First name</span><input type="text" name="first_name" autocomplete="given-name" required maxlength="100"></label>
        <label class="f"><span>Last name</span><input type="text" name="last_name" autocomplete="family-name" required maxlength="100"></label>
      </div>
      <label class="f"><span>Email</span><input type="email" name="email" autocomplete="email" required maxlength="200" inputmode="email"></label>
      <div class="row">
        <label class="f"><span>Country</span><input type="text" name="country" autocomplete="country-name" maxlength="100"></label>
        <label class="f"><span>Phone <span class="hint">optional</span></span><input type="tel" name="phone" autocomplete="tel" maxlength="40"></label>
      </div>
      <div class="hp" aria-hidden="true"><label>Company website<input type="text" name="company_website" tabindex="-1" autocomplete="off"></label></div>
    </fieldset>

    <fieldset>
      <legend>How you want to invest</legend>
      <label class="f"><span>How much would you look to commit per year?</span>
        <select name="ticket"><option value="">Select an amount</option>${TICKETS.map((t) => `<option>${esc(t)}</option>`).join('')}</select></label>
      <label class="f" id="otherwrap" hidden><span>Roughly how much?</span><input type="text" name="ticket_other" maxlength="80"></label>
      <label class="f"><span>Your ideal format</span>
        <select name="format"><option value="">Select a format</option>${FORMATS.map((t) => `<option>${esc(t)}</option>`).join('')}</select></label>
      <label class="f"><span>Would you consider secondaries? <span class="hint">buying shares from an existing shareholder rather than in a new round</span></span>
        <select name="secondaries"><option value="">Select one</option><option>Yes</option><option>No</option><option>Tell me more</option></select></label>
    </fieldset>

    <fieldset>
      <legend>What you want to see</legend>
      <p class="hint" style="font-size:13.5px;margin:2px 0 0">Pick as many as you like. This decides which deals we send you.</p>
      <div class="opts">${TARGETS.map((t) => chk('targets', t, 'checkbox')).join('')}</div>
      <label class="f" style="margin-top:20px"><span>What is pulling you towards climate tech?</span></label>
      <div class="opts">${MOTIVES.map((t) => chk('motivations', t, 'checkbox')).join('')}</div>
    </fieldset>

    <fieldset>
      <legend>Last thing</legend>
      <div class="pitch">
        <b>Every Saturday, one thing you can use.</b>
        <p class="fine" style="margin-top:5px">The deals that got funded this week, what the terms actually were, and which investors are writing cheques right now. Read by 23,000 founders and investors. Free, and one click to leave.</p>
      </div>
      <label class="consent"><input type="checkbox" name="newsletter"><span>Yes, send me the Climate Insiders newsletter</span></label>
      <label class="consent"><input type="checkbox" name="gdpr" required><span>I agree to the <a href="https://www.climateinsiders.com/terms-of-service" target="_blank" rel="noopener">terms of service</a> and to Climate Insiders holding my details so we can contact me about investment opportunities.</span></label>
      <div class="actions" style="margin-top:20px">
        <button class="btn big" type="submit" id="jsubmit">Join the community</button>
        <span class="fine" style="margin:0">Takes about a minute.</span>
      </div>
      <p class="fine">Investing in unlisted companies carries a risk of partial or total capital loss and of illiquidity. Never invest money you cannot afford to lose.</p>
    </fieldset>
  </form>

  <div class="done" id="jdone" tabindex="-1">
    <h2>You are on the list.</h2>
    <p class="lede">We have your details and will be in touch when the next round opens.</p>
    <p class="lede" id="jmail" style="margin-top:10px">A confirmation is on its way to your inbox with the most useful things we have published. If it is not there in a few minutes, check promotions.</p>
    <div class="pitch" id="jnews" hidden style="margin-top:22px">
      <b>One more click for the newsletter.</b>
      <p class="fine" style="margin:5px 0 14px">Substack asks you to confirm it yourself. It is free. If Substack shows paid plans, you can skip them.</p>
      <a class="btn" id="jnewslink" href="https://climateinsiders.substack.com/subscribe" target="_blank" rel="noopener">Confirm my newsletter</a>
    </div>
    <p class="lede" style="margin-top:24px"><a href="/all">Browse the investor lists</a> · <a href="https://www.climateinsiders.com/">Back to climateinsiders.com</a></p>
  </div>
</main>`;

  const script = `<script>
(function(){
  var f=document.getElementById('jform'), err=document.getElementById('jerr'),
      done=document.getElementById('jdone'), btn=document.getElementById('jsubmit'),
      sel=f.elements.ticket, other=document.getElementById('otherwrap');
  sel.addEventListener('change',function(){ other.hidden = sel.value!=='Other'; });
  var from=new URLSearchParams(location.search).get('from')||'';
  var m=document.cookie.match(/(?:^|; )ci_lead=([^;]*)/);
  if(m){
    try{ f.elements.email.value=decodeURIComponent(m[1]); }catch(e){}
    document.cookie='ci_lead=; domain=.climateinsiders.com; path=/; max-age=0; secure; samesite=lax';
    f.elements.first_name.focus({preventScroll:true});
  }
  function fail(m){ err.textContent=m; err.classList.add('on'); err.scrollIntoView({block:'center',behavior:'smooth'}); btn.disabled=false; btn.textContent='Join the community'; }
  f.addEventListener('submit',function(e){
    e.preventDefault();
    err.classList.remove('on');
    var d=new FormData(f);
    if(!f.elements.gdpr.checked) return fail('Please accept the terms to continue.');
    var payload={
      first_name:d.get('first_name'), last_name:d.get('last_name'), email:d.get('email'),
      country:d.get('country'), phone:d.get('phone'), ticket:d.get('ticket'),
      ticket_other:d.get('ticket_other'), format:d.get('format'), secondaries:d.get('secondaries'),
      targets:d.getAll('targets'), motivations:d.getAll('motivations'),
      newsletter:f.elements.newsletter.checked, gdpr:true,
      company_website:d.get('company_website'),
      source:from ? 'climateinsiders.com' + from : location.pathname
    };
    btn.disabled=true; btn.textContent='Saving…';
    fetch('/api/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      .then(function(r){ return r.json().then(function(j){ return {ok:r.ok,j:j}; }); })
      .then(function(r){
        if(!r.ok) return fail(r.j && r.j.error ? r.j.error : 'Something went wrong. Please try again.');
        if(window.gtag) gtag('event','investor_signup');
        // Stay here and confirm. Substack cannot be subscribed server-side, so
        // the newsletter is a button the person chooses to press.
        if(r.j.next){ document.getElementById('jnewslink').href=r.j.next; document.getElementById('jnews').hidden=false; }
        if(r.j.emailed===false) document.getElementById('jmail').hidden=true;
        f.style.display='none';
        document.querySelector('.jf header').style.display='none';
        done.classList.add('on'); done.focus({preventScroll:true}); window.scrollTo(0,0);
      })
      .catch(function(){ fail('Could not reach the server. Check your connection and try again.'); });
  });
})();
</script>`;

  return shell({
    title: 'Join the Climate Insiders investor community',
    description: 'Invest alongside us in climate tech from €1,000. Tell us what you are looking for and we will be in touch when the next round opens.',
    canonical: `${SITE}/join`,
    body,
    extraHead: `<style>${CSS}</style>`,
    compactNav: true,
  }).replace('</body>', `${script}\n</body>`);
}
