// Dialogs, hover effects, buy button, rotating testimonials, post-purchase upsell, attribution. No framework.
(function () {
  var q = new URLSearchParams(location.search);
  var attribution = {
    utm_source: q.get('utm_source') || '',
    utm_campaign: q.get('utm_campaign') || '',
    utm_content: q.get('utm_content') || '',
    ref: q.get('ref') || document.referrer || '',
  };
  try {
    var saved = JSON.parse(sessionStorage.getItem('ci_attr') || 'null');
    if (saved && !attribution.utm_source && !attribution.utm_campaign) attribution = saved;
    else sessionStorage.setItem('ci_attr', JSON.stringify(attribution));
  } catch (e) {}

  var toast = document.getElementById('toast');
  function say(msg, ms) {
    if (!toast) return alert(msg);
    toast.textContent = msg;
    toast.style.display = 'block';
    clearTimeout(say.t);
    say.t = setTimeout(function () { toast.style.display = 'none'; }, ms || 4000);
  }

  function post(url, body) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) {
      return r.text().then(function (t) {
        var j;
        try { j = JSON.parse(t); } catch (e) { throw new Error('Checkout is not available on this server (no API). Use the deployed site, or run "npm run dev:api" locally.'); }
        if (!r.ok) throw new Error(j.error || 'Something went wrong');
        return j;
      });
    });
  }

  // ---- keep the value stack inside its box: only if a list has long text, shrink the bullets a little (spacing never changes) ----
  function fitValue() {
    var v = document.querySelector('.offer.main:not(.after) .valueCol');
    if (!v) return;
    var items = v.querySelectorAll('.checks li');
    items.forEach(function (li) { li.style.fontSize = ''; });
    if (innerWidth < 901) return;
    var fs = 15.5;
    while (v.scrollHeight > v.clientHeight + 1 && fs > 12) {
      fs -= 0.5;
      items.forEach(function (li) { li.style.fontSize = fs + 'px'; });
    }
  }
  fitValue();
  window.addEventListener('resize', fitValue);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitValue);

  // ---- mobile: a buy bar stays at the bottom until the real buy button is on screen ----
  var stickyBar = document.getElementById('stickybuy'), buyTarget = document.querySelector('.offer.main .valueCol .buy');
  if (stickyBar && buyTarget && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { stickyBar.classList.toggle('show', !es[0].isIntersecting); }).observe(buyTarget);
  }

  // ---- dialogs: other lists + the spreadsheet ----
  var openDialog = null;
  function openD(d) {
    if (!d) return;
    if (openDialog && openDialog !== d) openDialog.close();
    openDialog = d;
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
    var sc = d.querySelector('.grid-wrap, .offer'); if (sc) sc.scrollTop = 0;
  }
  function closeD() { if (openDialog) { openDialog.close(); openDialog = null; } }
  document.addEventListener('click', function (ev) {
    var o = ev.target.closest('[data-open]');
    if (o) { ev.preventDefault(); openD(document.getElementById('p-' + o.getAttribute('data-open'))); return; }
    if (ev.target.closest('[data-sheet]')) { ev.preventDefault(); openD(document.getElementById('sheet')); return; }
    if (ev.target.closest('[data-close]')) { ev.preventDefault(); closeD(); return; }
    if (ev.target.tagName === 'DIALOG' && ev.target.id !== 'pay') closeD(); // backdrop click (never while paying)
  });
  document.addEventListener('cancel', function (ev) { if (ev.target.tagName === 'DIALOG') { ev.preventDefault(); closeD(); } }, true);

  // ---- main offer follows the cursor: soft tilt ----
  var main = document.querySelector('.offer.main');
  if (main && window.matchMedia('(hover: hover) and (min-width: 901px)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    main.addEventListener('mousemove', function (e) {
      var r = main.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      main.style.setProperty('--ry', ((x - 0.5) * 2.2).toFixed(2) + 'deg');
      main.style.setProperty('--rx', ((0.5 - y) * 1.6).toFixed(2) + 'deg');
      main.style.setProperty('--ry-n', ((x - 0.5) * 2).toFixed(2));
      main.style.setProperty('--rx-n', ((0.5 - y) * 2).toFixed(2));
    });
    main.addEventListener('mouseleave', function () {
      ['--rx', '--ry', '--rx-n', '--ry-n'].forEach(function (k) { main.style.setProperty(k, k.indexOf('-n') > 0 ? '0' : '0deg'); });
    });
  }

  // ---- rotating testimonials ----
  var rq = document.querySelectorAll('.rq');
  if (rq.length > 1) {
    var qi = 0;
    setInterval(function () { rq[qi].classList.remove('on'); qi = (qi + 1) % rq.length; rq[qi].classList.add('on'); }, 5500);
  }

  // ---- upgrade pricing on /all?u=<token> (from the follow-up emails) ----
  var upgrade = q.get('u') || '';
  if (upgrade && /^[a-f0-9]{16,64}$/.test(upgrade)) {
    fetch('/api/upgrade-quote?t=' + upgrade).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d) return;
      (d.owned || []).forEach(function (slug) {
        var c = document.querySelector('.card[data-open="' + slug + '"]');
        if (c) c.classList.add('is-owned');
      });
      var price = document.getElementById('bundle-price');
      var sub = document.getElementById('bundle-sub');
      var kicker = document.getElementById('all-kicker');
      if (d.bundleOwned) {
        if (kicker) kicker.textContent = 'you have all ten. nice.';
        return;
      }
      if (d.active && price) {
        var days = Math.max(1, Math.ceil((new Date(d.expiresAt) - Date.now()) / 86400000));
        price.textContent = 'All 10 lists, $' + Math.round(d.price / 100);
        if (sub) sub.textContent = 'What you paid counts. Offer open ' + days + ' more day' + (days > 1 ? 's' : '') + '.';
        if (kicker) kicker.textContent = 'your earlier purchase counts toward the bundle';
      }
    }).catch(function () {});
  }

  // ---- checkout: Stripe Embedded Checkout in a dialog, no page change ----
  var payDlg = document.getElementById('pay'), embedded = null, stripeJs = null;
  function loadStripe() {
    if (window.Stripe) return Promise.resolve();
    return stripeJs || (stripeJs = new Promise(function (resolve, reject) {
      var sc = document.createElement('script');
      sc.src = 'https://js.stripe.com/v3/';
      sc.onload = resolve;
      sc.onerror = function () { stripeJs = null; reject(new Error('Could not load the payment form. Check your connection and try again.')); };
      document.head.appendChild(sc);
    }));
  }
  function destroyEmbedded() {
    if (embedded) { try { embedded.destroy(); } catch (e) {} embedded = null; }
    var m = document.getElementById('checkout'); if (m) m.innerHTML = '';
  }
  if (payDlg) payDlg.addEventListener('close', function () { destroyEmbedded(); openDialog = null; });

  function startCheckout(payload, btn) {
    // The label never changes (a longer text made the button grow past its box); a spinner shows progress.
    if (btn) { btn.disabled = true; btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true'); }
    var done = function () { if (btn) { btn.disabled = false; btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy'); } };
    post('/api/checkout', Object.assign({ embedded: !!payDlg, attribution: attribution }, payload))
      .then(function (j) {
        if (j.url || !j.client_secret) { location.href = j.url; return; } // hosted fallback
        var sessionId = j.client_secret.split('_secret_')[0];
        return loadStripe().then(function () {
          return window.Stripe(j.publish_key).initEmbeddedCheckout({
            clientSecret: j.client_secret,
            onComplete: function () { location.href = '/' + (payload.upsell ? 'welcome' : 'thanks') + '?session_id=' + encodeURIComponent(sessionId); },
          });
        }).then(function (c) {
          destroyEmbedded();
          embedded = c;
          openD(payDlg);
          var pb = payDlg.querySelector('.paybody'); if (pb) pb.scrollTop = 0;
          c.mount('#checkout');
          done();
        });
      })
      .catch(function (e) { say(e.message, 7000); done(); });
  }

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-buy]');
    if (!b) return;
    ev.preventDefault();
    var slug = b.getAttribute('data-buy');
    startCheckout(slug === 'all' ? { bundle: true, upgrade: upgrade } : { slug: slug }, b);
  });

  // ---- confetti: one or two seconds across the whole page ----
  function confetti() {
    var cv = document.getElementById('confetti');
    if (!cv || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var ctx = cv.getContext('2d'), dpr = window.devicePixelRatio || 1;
    var W = cv.width = innerWidth * dpr, H = cv.height = innerHeight * dpr;
    var colors = ['#ff7a1a', '#1f1b16', '#ffc878', '#1b7a4a', '#2f5da8', '#e8690f', '#b3263f'];
    var ps = [];
    for (var i = 0; i < 220; i++) {
      var fromLeft = i % 2 === 0;
      ps.push({
        x: (fromLeft ? 0.1 : 0.9) * W + (Math.random() - 0.5) * W * 0.2, y: H * (0.75 + Math.random() * 0.1),
        vx: (fromLeft ? 1 : -1) * (Math.random() * 9 + 3) * dpr, vy: -(Math.random() * 18 + 8) * dpr,
        w: (Math.random() * 8 + 5) * dpr, h: (Math.random() * 5 + 3) * dpr,
        r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4, c: colors[i % colors.length],
      });
    }
    var t0 = performance.now(), DUR = 2400;
    setTimeout(function () { ctx.clearRect(0, 0, W, H); cv.style.display = 'none'; }, DUR + 400);
    (function frame(now) {
      var t = now - t0;
      ctx.clearRect(0, 0, W, H);
      var fade = t > DUR - 700 ? Math.max(0, (DUR - t) / 700) : 1;
      ps.forEach(function (p) {
        p.vy += 0.45 * dpr; p.vx *= 0.992; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.globalAlpha = fade; ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      });
      if (t < DUR) requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, H);
    })(t0);
  }

  // ---- after the $390 offer: direct access to everything ----
  var welcome = document.getElementById('welcome');
  if (welcome) {
    var wsid = q.get('session_id') || '';
    var rowFor = function (name, sub, url, label, primary) {
      var li = document.createElement('li');
      var nm = document.createElement('span'); nm.className = 'nm';
      nm.textContent = name;
      if (sub) { var sm = document.createElement('small'); sm.textContent = sub; nm.appendChild(sm); }
      li.appendChild(nm);
      var acts = document.createElement('span'); acts.className = 'acts';
      if (url) {
        var a = document.createElement('a'); a.className = 'btn' + (primary ? '' : ' ghost'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = label; acts.appendChild(a);
      } else {
        var w = document.createElement('span'); w.className = 'soon'; w.textContent = 'link arriving by email'; acts.appendChild(w);
      }
      li.appendChild(acts);
      return li;
    };
    var renderWelcome = function (j) {
      confetti();
      var ul = document.getElementById('access');
      ul.innerHTML = '';
      var a = j.access || {};
      ul.appendChild(rowFor('All ' + (welcome.getAttribute('data-investors') || '') + ' investors, from everywhere', 'Direct access, yours for good', a.database_url, 'Open the database ↗', true));
      ul.appendChild(rowFor('Cold outreach kit', '', a.outreach_kit_url, 'Open the kit ↗'));
      ul.appendChild(rowFor('Fundraising kit', '', a.fundraising_kit_url, 'Open the kit ↗'));
      ul.appendChild(rowFor('Climate Insiders newsletter', '1 year, 22,000+ readers', a.newsletter_url, 'Open ↗'));
      (j.lists || []).forEach(function (l) {
        ul.appendChild(rowFor(l.name, 'Your first list', l.airtable_url, 'Airtable ↗'));
      });
      if (j.email) document.getElementById('sentto').textContent = 'also emailed to ' + j.email;
    };
    // On localhost there is no API, so the design can be previewed with sample data.
    var wdemo = { email: 'you@company.com', upsell: true, access: { database_url: '#', outreach_kit_url: '#', fundraising_kit_url: null, newsletter_url: null }, lists: [{ slug: 'europe-500', name: '500 European family office contacts', airtable_url: '#' }] };
    (/^cs_/.test(wsid) ? fetch('/api/session?session_id=' + encodeURIComponent(wsid)).then(function (r) { return r.ok ? r.json() : Promise.reject(); }) : Promise.reject())
      .catch(function () { if (location.hostname === 'localhost') return wdemo; throw 0; })
      .then(renderWelcome)
      .catch(function () { document.getElementById('access').innerHTML = '<li class="ph">We could not load your access here. Check your inbox, or reply to your receipt email.</li>'; });
  }

  // ---- after purchase: your list + the one-time offer ----
  var after = document.getElementById('after');
  if (after) {
    var sid = q.get('session_id') || '';
    var clocks = document.querySelectorAll('[data-clock]');
    var deadline = 0, timer = null;
    var pad2 = function (n) { return (n < 10 ? '0' : '') + n; };

    function tick() {
      var left = Math.max(0, deadline - Date.now());
      var h = Math.floor(left / 3600000), m = Math.floor(left / 60000) % 60, s = Math.floor(left / 1000) % 60;
      clocks.forEach(function (c) {
        c.querySelector('[data-h]').textContent = pad2(h);
        c.querySelector('[data-m]').textContent = pad2(m);
        c.querySelector('[data-s]').textContent = pad2(s);
      });
      if (!left) {
        clearInterval(timer);
        document.querySelectorAll('.slam [data-upsell]').forEach(function (b) { b.hidden = true; });
        document.querySelectorAll('.slam [data-expired]').forEach(function (b) { b.hidden = false; });
      }
      return left;
    }

    function render(j) {
      confetti();
      var ul = document.getElementById('mylists');
      ul.innerHTML = '';
      (j.lists || []).forEach(function (l) {
        var li = document.createElement('li');
        var nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = l.name; li.appendChild(nm);
        var acts = document.createElement('span'); acts.className = 'acts';
        if (l.airtable_url) {
          var a = document.createElement('a'); a.className = 'btn'; a.href = l.airtable_url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Open in Airtable ↗'; acts.appendChild(a);
        }
        var d = document.createElement('a'); d.className = 'btn ghost'; d.href = '/api/download?session_id=' + encodeURIComponent(sid) + '&slug=' + encodeURIComponent(l.slug); d.textContent = 'Download Excel ↓'; acts.appendChild(d);
        li.appendChild(acts); ul.appendChild(li);
      });
      if (j.email) document.getElementById('sentto').textContent = 'also emailed to ' + j.email;
      if (j.upsell || !j.created) { after.classList.add('done'); return; }
      deadline = j.created * 1000 + 24 * 3600 * 1000;
      timer = setInterval(tick, 1000);
      tick();
    }

    // On localhost there is no API, so the design can be previewed with sample data.
    var demo = { email: 'you@company.com', upsell: false, created: Math.floor(Date.now() / 1000) - 1800, lists: [{ slug: 'europe-500', name: '500 European family office contacts', airtable_url: '#' }] };
    (/^cs_/.test(sid) ? fetch('/api/session?session_id=' + encodeURIComponent(sid)).then(function (r) { return r.ok ? r.json() : Promise.reject(); }) : Promise.reject())
      .catch(function () { if (location.hostname === 'localhost') return demo; throw 0; })
      .then(render)
      .catch(function () { document.getElementById('mylists').innerHTML = '<li class="ph">We could not load your list here. It is in your inbox, or reply to your receipt email.</li>'; });

    document.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-upsell]');
      if (!b) return;
      ev.preventDefault();
      startCheckout({ upsell: true, session_id: sid }, b);
    });
  }
})();
