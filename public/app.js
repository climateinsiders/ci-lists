// Buy button, rotating testimonials, post-purchase upsell, attribution. No framework.
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

  // ---- rotating testimonials ----
  var rq = document.querySelectorAll('.rq');
  if (rq.length > 1) {
    var qi = 0;
    setInterval(function () { rq[qi].classList.remove('on'); qi = (qi + 1) % rq.length; rq[qi].classList.add('on'); }, 5500);
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
    post('/api/checkout', slug === 'all' ? { bundle: true, attribution: attribution } : { slug: slug, attribution: attribution })
      .then(function (j) { location.href = j.url; })
      .catch(function (e) {
        say(e.message, 7000);
        btns.forEach(function (x) { x.disabled = false; });
        b.textContent = b.dataset.label;
      });
  });

  // ---- post-purchase upsell (thanks page) ----
  var upsell = document.getElementById('upsell');
  var sid = q.get('session_id') || '';
  if (upsell && /^cs_/.test(sid)) {
    fetch('/api/session?session_id=' + encodeURIComponent(sid))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || !j.remaining || !j.remaining.length) return;
        var ul = document.getElementById('upsell-names');
        ul.innerHTML = '';
        j.remaining.forEach(function (n) { var li = document.createElement('li'); li.textContent = n; ul.appendChild(li); });
        document.getElementById('upsell-sub').textContent = 'The other ' + j.remaining.length + ' lists, same format, same email delivery.';
        upsell.hidden = false;
      })
      .catch(function () {});
    var ub = document.getElementById('upsell-buy');
    ub.addEventListener('click', function () {
      ub.disabled = true;
      var label = ub.textContent;
      ub.textContent = 'Opening checkout…';
      post('/api/checkout', { upsell: true, session_id: sid, attribution: attribution })
        .then(function (j) { location.href = j.url; })
        .catch(function (e) { say(e.message, 7000); ub.disabled = false; ub.textContent = label; });
    });
  }
})();
