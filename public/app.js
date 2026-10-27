// Card previews, buy buttons, free-sample form, attribution. No framework.
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
      return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Something went wrong'); return j; });
    });
  }

  // ---- previews ----
  var openDialog = null;
  function open(slug, push) {
    var d = document.getElementById('p-' + slug);
    if (!d) return;
    if (openDialog && openDialog !== d) openDialog.close();
    openDialog = d;
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
    d.querySelector('.right').scrollTop = 0;
    if (push && history.pushState) history.pushState({ slug: slug }, '', '/' + slug + location.search);
  }
  function closeAll(push) {
    if (openDialog) { openDialog.close(); openDialog = null; }
    if (push && history.pushState) history.pushState({}, '', '/' + location.search);
  }
  document.addEventListener('click', function (ev) {
    var o = ev.target.closest('[data-open]');
    if (o) { ev.preventDefault(); open(o.getAttribute('data-open'), true); return; }
    var c = ev.target.closest('[data-close]');
    if (c) { ev.preventDefault(); closeAll(true); return; }
    // click on the backdrop closes
    if (ev.target.tagName === 'DIALOG') closeAll(true);
  });
  document.addEventListener('cancel', function (ev) { if (ev.target.tagName === 'DIALOG') { ev.preventDefault(); closeAll(true); } }, true);
  window.addEventListener('popstate', function (ev) {
    var s = ev.state && ev.state.slug;
    if (s) open(s, false); else closeAll(false);
  });
  var featured = document.querySelector('meta[name="x-featured"]');
  if (featured) {
    if (history.replaceState) history.replaceState({ slug: featured.content }, '', location.pathname + location.search);
    setTimeout(function () { open(featured.content, false); }, 250);
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

  // ---- checkout ----
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-buy]');
    if (!b) return;
    ev.preventDefault();
    var slug = b.getAttribute('data-buy');
    var btns = document.querySelectorAll('[data-buy]');
    btns.forEach(function (x) { x.disabled = true; });
    b.dataset.label = b.textContent;
    b.textContent = 'Opening checkout…';
    post('/api/checkout', slug === 'all' ? { bundle: true, upgrade: upgrade, attribution: attribution } : { slug: slug, attribution: attribution })
      .then(function (j) { location.href = j.url; })
      .catch(function (e) {
        say(e.message, 7000);
        btns.forEach(function (x) { x.disabled = false; });
        b.textContent = b.dataset.label;
      });
  });

  // ---- free sample ----
  document.addEventListener('submit', function (ev) {
    var form = ev.target.closest('form[data-sample]');
    if (!form) return;
    ev.preventDefault();
    var btn = form.querySelector('button');
    btn.disabled = true;
    post('/api/sample', { email: form.email.value.trim(), slug: form.dataset.sample, website: form.website.value, attribution: attribution })
      .then(function () {
        form.innerHTML = '<div class="ok">Sent. Check your inbox (and the promotions tab). The full list is one click away on the left.</div>';
      })
      .catch(function (e) { say(e.message, 7000); btn.disabled = false; });
  });
})();
