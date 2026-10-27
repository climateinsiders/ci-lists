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
      return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Something went wrong'); return j; });
    });
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
    if (ev.target.tagName === 'DIALOG') closeD(); // backdrop click
  });
  document.addEventListener('cancel', function (ev) { if (ev.target.tagName === 'DIALOG') { ev.preventDefault(); closeD(); } }, true);

  // ---- main offer follows the cursor: soft tilt + orange spotlight ----
  var main = document.querySelector('.offer.main');
  if (main && window.matchMedia('(hover: hover) and (min-width: 901px)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    main.addEventListener('mousemove', function (e) {
      var r = main.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      main.style.setProperty('--ry', ((x - 0.5) * 2.2).toFixed(2) + 'deg');
      main.style.setProperty('--rx', ((0.5 - y) * 1.6).toFixed(2) + 'deg');
      main.style.setProperty('--ry-n', ((x - 0.5) * 2).toFixed(2));
      main.style.setProperty('--rx-n', ((0.5 - y) * 2).toFixed(2));
      main.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
      main.style.setProperty('--my', (y * 100).toFixed(1) + '%');
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

  // ---- after purchase: your list + the one-time offer ----
  var after = document.getElementById('after');
  if (after) {
    var sid = q.get('session_id') || '';
    var dlg = document.getElementById('slam-dialog');
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
        if (dlg && dlg.open) dlg.close();
      }
      return left;
    }

    function render(j) {
      var ul = document.getElementById('mylists');
      ul.innerHTML = '';
      (j.lists || []).forEach(function (l) {
        var li = document.createElement('li');
        var nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = l.name; li.appendChild(nm);
        var acts = document.createElement('span'); acts.className = 'acts';
        if (l.airtable_url) {
          var a = document.createElement('a'); a.className = 'btn'; a.href = l.airtable_url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Open in Airtable ↗'; acts.appendChild(a);
        }
        var d = document.createElement('a'); d.className = 'btn ghost'; d.href = '/api/download?session_id=' + encodeURIComponent(sid) + '&slug=' + encodeURIComponent(l.slug); d.textContent = 'Download CSV ↓'; acts.appendChild(d);
        li.appendChild(acts); ul.appendChild(li);
      });
      if (j.email) document.getElementById('sentto').textContent = 'also emailed to ' + j.email;
      if (j.upsell || !j.created) { after.classList.add('done'); return; }
      deadline = j.created * 1000 + 24 * 3600 * 1000;
      timer = setInterval(tick, 1000);
      if (tick() > 0) {
        var seen = false;
        try { seen = sessionStorage.getItem('ci_slam_seen') === '1'; sessionStorage.setItem('ci_slam_seen', '1'); } catch (e) {}
        if (!seen && dlg) setTimeout(function () { openD(dlg); }, 1200);
      }
    }

    // On localhost there is no API, so the design can be previewed with sample data.
    var demo = { email: 'you@company.com', upsell: false, created: Math.floor(Date.now() / 1000) - 1800, lists: [{ slug: 'europe-500', name: '500 European family office contacts', airtable_url: '#' }] };
    (/^cs_/.test(sid) ? fetch('/api/session?session_id=' + encodeURIComponent(sid)).then(function (r) { return r.ok ? r.json() : Promise.reject(); }) : Promise.reject())
      .catch(function () { if (location.hostname === 'localhost') return demo; throw 0; })
      .then(render)
      .catch(function () { document.getElementById('mylists').innerHTML = '<li class="ph">We could not load your list here. It is in your inbox, or email yoann@climateinsiders.com.</li>'; });

    document.addEventListener('click', function (ev) {
      if (ev.target.closest('[data-skip]')) { ev.preventDefault(); if (dlg && dlg.open) closeD(); return; }
      var b = ev.target.closest('[data-upsell]');
      if (!b) return;
      ev.preventDefault();
      var label = b.textContent;
      b.disabled = true; b.textContent = 'Opening checkout…';
      post('/api/checkout', { upsell: true, session_id: sid, attribution: attribution })
        .then(function (j) { location.href = j.url; })
        .catch(function (e) { say(e.message, 7000); b.disabled = false; b.textContent = label; });
    });
  }
})();
