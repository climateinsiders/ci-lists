// /dashboard: Mission Control for the investor-lists business. Static shell, no data in the HTML.
// All numbers come from /api/dash?op=data after login (HttpOnly session cookie).
export function dashboardPage() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Mission control · Climate Insiders lists</title>
<link rel="icon" href="https://cdn.prod.website-files.com/657b1ee1812a034008e87de8/658538a0538bd8c8a8da2e34_fav-sm.jpg" type="image/jpeg">
<link rel="apple-touch-icon" href="https://cdn.prod.website-files.com/657b1ee1812a034008e87de8/6585389a7f43d48ed7b3c851_fav-md.jpg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Fraunces:opsz,wght@9..144,700;9..144,900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
<style>${CSS}</style>
</head>
<body class="dash">
<div class="dwrap">
  <header class="dtop">
    <div>
      <span class="script">climate insiders lists</span>
      <h1>Mission control</h1>
    </div>
    <div class="who" id="who" hidden>
      <span id="me"></span>
      <button class="btn small ghost" id="refresh" type="button">Refresh</button>
      <button class="btn small ghost" id="logout" type="button">Log out</button>
    </div>
  </header>

  <main id="view-loading" class="view"><p class="muted">Loading…</p></main>

  <main id="view-login" class="view" hidden>
    <form class="authbox" id="f-login" novalidate>
      <h2>Log in</h2>
      <label>Email<input type="email" name="email" autocomplete="username" required></label>
      <label>Password<input type="password" name="password" autocomplete="current-password" required></label>
      <p class="err" role="alert"></p>
      <button class="btn" type="submit">Log in</button>
      <p class="small"><a href="#" data-go="reset">First time or forgot your password? Get a reset link.</a></p>
    </form>
  </main>

  <main id="view-reset" class="view" hidden>
    <form class="authbox" id="f-reset" novalidate>
      <h2>Get a link</h2>
      <p class="muted">Enter your email. If it has access, we send a one-time link to set your password. It works for one hour.</p>
      <label>Email<input type="email" name="email" autocomplete="username" required></label>
      <p class="err" role="alert"></p>
      <p class="ok" role="status"></p>
      <button class="btn" type="submit">Send the link</button>
      <p class="small"><a href="#" data-go="login">Back to log in</a></p>
    </form>
  </main>

  <main id="view-setpw" class="view" hidden>
    <form class="authbox" id="f-setpw" novalidate>
      <h2>Set your password</h2>
      <p class="muted">At least 10 characters.</p>
      <label>New password<input type="password" name="password" autocomplete="new-password" minlength="10" required></label>
      <label>Same again<input type="password" name="confirm" autocomplete="new-password" minlength="10" required></label>
      <p class="err" role="alert"></p>
      <button class="btn" type="submit">Save and open the dashboard</button>
    </form>
  </main>

  <main id="view-dash" class="view" hidden>
    <section class="cards" id="cards"></section>

    <section class="panel works">
      <h2>What works</h2>
      <ul id="takeaways"></ul>
    </section>

    <section class="charts">
      <div class="panel"><h2>Revenue per week</h2><div id="ch-rev" class="chart"></div></div>
      <div class="panel"><h2>Leads per week</h2><div id="ch-leads" class="chart"></div></div>
    </section>

    <section class="panel">
      <h2>Day by day <small>last 14 days, Lisbon time. Comments and DM requests come from Turnward, DMs sent from our outreach log</small></h2>
      <div class="tscroll"><table id="t-days"></table></div>
    </section>

    <section class="panel">
      <h2>Week by week <small>ISO weeks, Monday start, Lisbon time</small></h2>
      <div class="tscroll"><table id="t-weeks"></table></div>
    </section>

    <section class="panel">
      <div class="phead">
        <h2>Posts <small>click a column to sort</small></h2>
        <button class="btn small" id="addpost" type="button">Add a post</button>
      </div>
      <form id="f-post" class="postform" hidden novalidate>
        <input type="hidden" name="id">
        <label class="wide">Title<input name="title" required placeholder="500 European family offices"></label>
        <label>Posted on<input type="date" name="posted_at"></label>
        <label>Keyword<input name="keyword" placeholder="500"></label>
        <label>List<select name="list_slug"><option value="">None</option></select></label>
        <label class="wide">LinkedIn link<input type="url" name="url" placeholder="https://www.linkedin.com/posts/..."></label>
        <label>Impressions<input name="impressions" inputmode="numeric"></label>
        <label>Reactions<input name="reactions" inputmode="numeric"></label>
        <label>Comments<input name="comments_count" inputmode="numeric"></label>
        <label>Reposts<input name="reposts" inputmode="numeric"></label>
        <label class="wide">Notes<textarea name="notes" rows="2"></textarea></label>
        <p class="err wide" role="alert"></p>
        <div class="wide acts">
          <button class="btn small" type="submit">Save post</button>
          <button class="btn small ghost" type="button" id="cancelpost">Cancel</button>
          <button class="btn small ghost danger" type="button" id="delpost" hidden>Delete</button>
        </div>
      </form>
      <div class="tscroll"><table id="t-posts" class="sortable"></table></div>
      <p class="small muted" id="unattr"></p>
    </section>

    <section class="two">
      <div class="panel"><h2>By list <small>a multi-list order splits its revenue</small></h2><div class="tscroll"><table id="t-lists"></table></div></div>
      <div class="panel"><h2>By source</h2><div class="tscroll"><table id="t-sources"></table></div></div>
    </section>

    <section class="panel">
      <h2>Recent sales</h2>
      <div class="tscroll"><table id="t-recent"></table></div>
    </section>

    <details class="panel setup">
      <summary>Setup and lead import</summary>
      <p><b>Turnward webhook.</b> Paste this URL in Turnward, Webhooks. Every comment and DM lead lands here. Keep it private.</p>
      <p><code id="hook">Loading…</code> <button class="btn small ghost" type="button" id="copyhook">Copy</button></p>
      <p><b>Import leads.</b> Paste a JSON array: <code>[{"name":"Ana Silva","keyword":"500","source":"comment","first_seen_at":"2026-10-27T10:00:00Z","profile_url":"https://www.linkedin.com/in/..."}]</code>. Duplicates are skipped.</p>
      <form id="f-import" novalidate>
        <textarea name="leads" rows="5" placeholder="[ ... ]"></textarea>
        <p class="err" role="alert"></p><p class="ok" role="status"></p>
        <button class="btn small" type="submit">Import</button>
      </form>
      <p class="small muted">Sales: paid Stripe checkouts (test coupons left out). Net: after Stripe fees, estimated at 2.9% + 30c where Stripe has not reported the fee yet. Leads: unique people who commented or sent a DM. A sale is tied to a post by utm_campaign = keyword, else by a lead with the same first name in the 30 days before.</p>
    </details>
    <p class="small muted" id="stamp"></p>
  </main>
</div>
<div id="toast" class="toast" role="status"></div>
<script>${JS}</script>
</body>
</html>
`;
}

const CSS = `
body.dash { font-size: 14px; }
.dwrap { max-width: 1240px; margin: 0 auto; padding: 0 16px 48px; }
.dtop { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; flex-wrap: wrap; padding: 18px 0 14px; border-bottom: 1.5px solid var(--ink); margin-bottom: 16px; }
.dtop h1 { font-family: var(--serif); font-weight: 900; font-size: 34px; line-height: 1; margin: 2px 0 0; letter-spacing: -0.02em; }
.dtop .script { font-size: 20px; }
.who { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; font-size: 13px; color: var(--muted); }
.view[hidden], [hidden] { display: none !important; }
.muted { color: var(--muted); }
.small { font-size: 12.5px; }
h2 { font-family: var(--serif); font-weight: 700; font-size: 19px; margin: 0 0 10px; letter-spacing: -0.01em; }
h2 small { font-family: var(--sans); font-weight: 400; font-size: 12px; color: var(--muted); margin-left: 6px; letter-spacing: 0; }
.panel { background: var(--card); border: 1.5px solid var(--ink); border-radius: 16px; padding: 14px 16px; margin-bottom: 14px; box-shadow: 4px 4px 0 var(--ink); min-width: 0; }
.authbox { max-width: 400px; margin: 40px auto; background: var(--card); border: 1.5px solid var(--ink); border-radius: 18px; padding: 22px; box-shadow: 6px 6px 0 var(--ink); display: grid; gap: 12px; }
.authbox h2 { font-size: 24px; font-weight: 900; margin: 0; }
.authbox p { margin: 0; }
label { display: grid; gap: 4px; font-size: 12.5px; font-weight: 600; color: var(--ink-2); }
input, select, textarea { font: inherit; font-size: 15px; font-weight: 400; color: var(--ink); background: #fff; border: 1.5px solid var(--rule); border-radius: 10px; padding: 9px 11px; width: 100%; min-width: 0; }
input:focus, select:focus, textarea:focus { outline: none; border-color: var(--orange); box-shadow: 0 0 0 3px rgba(255,122,26,.18); }
.err { color: #b3261e; font-size: 13px; min-height: 0; }
.err:empty, .ok:empty { display: none; }
.ok { color: #1d6b3a; font-size: 13px; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 14px; }
.card1 { background: var(--card); border: 1.5px solid var(--ink); border-radius: 14px; padding: 11px 13px; min-width: 0; }
.card1 .k { font-size: 11.5px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
.card1 .v { font-family: var(--serif); font-weight: 900; font-size: 27px; line-height: 1.15; margin-top: 2px; font-variant-numeric: tabular-nums; }
.card1 .s { font-size: 12px; color: var(--ink-2); margin-top: 2px; }
.card1.hot { background: var(--ink); color: var(--paper); }
.card1.hot .k, .card1.hot .s { color: var(--paper-3); }
.up { color: #1d6b3a; font-weight: 600; } .down { color: #b3261e; font-weight: 600; }
.card1.hot .up { color: #8fe0a9; } .card1.hot .down { color: #ffb4a8; }
.works { background: #fff6e9; }
.works ul { margin: 0; padding-left: 18px; display: grid; gap: 6px; font-size: 14.5px; }
.charts, .two { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.charts .panel, .two .panel { margin-bottom: 14px; }
.chart svg { width: 100%; height: auto; display: block; }
.chart text { font-family: var(--sans); font-size: 10px; fill: var(--muted); }
.chart .lbl { fill: var(--ink); font-weight: 600; }
.tscroll { overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 0 -4px; }
table { border-collapse: collapse; width: 100%; font-size: 13px; font-variant-numeric: tabular-nums; }
th, td { padding: 6px 8px; text-align: right; white-space: nowrap; border-bottom: 1px solid var(--rule); }
th { font-size: 11.5px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; border-bottom: 1.5px solid var(--ink); }
th:first-child, td:first-child, th.l, td.l { text-align: left; }
td.t { white-space: normal; min-width: 180px; max-width: 320px; }
tr.best td { background: #fff1dc; }
tr.best td:first-child { box-shadow: inset 3px 0 0 var(--orange); }
tr.quiet td { color: var(--muted); }
table.sortable th { cursor: pointer; user-select: none; }
table.sortable th.on::after { content: ' ↓'; color: var(--orange); }
table.sortable th.on.asc::after { content: ' ↑'; }
.tag { display: inline-block; font-size: 11px; font-weight: 600; background: var(--orange); color: #fff; border-radius: 999px; padding: 1px 7px; margin-left: 6px; vertical-align: 1px; }
.kw { display: inline-block; font-size: 11.5px; background: var(--paper-2); border: 1px solid var(--rule); border-radius: 6px; padding: 0 6px; }
.linkbtn { background: none; border: 0; color: var(--orange-deep); padding: 0; font-weight: 600; font-size: 12.5px; text-decoration: underline; }
.phead { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
.phead h2 { margin: 0; }
.postform { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; padding: 12px; margin: 0 0 12px; background: var(--paper); border: 1px dashed var(--ink); border-radius: 12px; }
.postform .wide { grid-column: span 2; }
.postform .acts { display: flex; gap: 8px; flex-wrap: wrap; }
.danger { color: #b3261e !important; border-color: #b3261e !important; }
.setup summary { cursor: pointer; font-family: var(--serif); font-weight: 700; font-size: 17px; }
.setup code { font-size: 12px; background: var(--paper-2); border-radius: 6px; padding: 2px 6px; word-break: break-all; }
.setup textarea { font-family: ui-monospace, Menlo, monospace; font-size: 12.5px; margin-bottom: 8px; }
@media (max-width: 860px) {
  .charts, .two { grid-template-columns: minmax(0, 1fr); gap: 0; }
  .postform { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dtop h1 { font-size: 28px; }
  .card1 .v { font-size: 23px; }
  .panel { box-shadow: 3px 3px 0 var(--ink); padding: 12px; }
}
@media (max-width: 420px) { .postform .wide { grid-column: 1 / -1; } .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
`;

// Client script. Plain ES2017, no framework. Every value from the API goes through text nodes or esc().
const JS = `
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var API = '/api/dash?op=';
  var state = { data: null, sort: { key: 'gross', dir: -1 } };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(c) { if (c == null) return '-'; var v = Math.round(c / 100); return (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString('en-US'); }
  function money2(c) { if (c == null) return '-'; return '$' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function num(n) { return n == null ? '-' : Number(n).toLocaleString('en-US'); }
  function pct(x) { return x == null ? '-' : (Math.round(x * 1000) / 10) + '%'; }
  function toast(msg) { var t = $('#toast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(function () { t.style.display = 'none'; }, 2600); }

  function api(op, body) {
    return fetch(API + op, body === undefined ? { credentials: 'same-origin' } : { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j._status = r.status; return j; }); });
  }

  function show(name) {
    ['loading', 'login', 'reset', 'setpw', 'dash'].forEach(function (v) { $('#view-' + v).hidden = v !== name; });
    $('#who').hidden = name !== 'dash';
    var f = $('#view-' + name + ' input:not([type=hidden])'); if (f && name !== 'dash') f.focus();
  }

  function formErr(form, msg) { var e = form.querySelector('.err'); if (e) e.textContent = msg || ''; }
  function busy(form, on) { var b = form.querySelector('[type=submit]'); if (b) b.disabled = on; }

  document.addEventListener('click', function (e) {
    var go = e.target.closest('[data-go]');
    if (go) { e.preventDefault(); show(go.getAttribute('data-go')); }
  });

  $('#f-login').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target; formErr(f); busy(f, true);
    api('login', { email: f.email.value, password: f.password.value }).then(function (j) {
      busy(f, false);
      if (j._status !== 200) return formErr(f, j.error || 'Could not log in.');
      f.password.value = ''; load();
    }).catch(function () { busy(f, false); formErr(f, 'Network error. Try again.'); });
  });

  $('#f-reset').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target; formErr(f); f.querySelector('.ok').textContent = ''; busy(f, true);
    api('reset-request', { email: f.email.value }).then(function (j) {
      busy(f, false);
      if (j._status !== 200) return formErr(f, j.error || 'Could not send the link.');
      f.querySelector('.ok').textContent = j.message;
    }).catch(function () { busy(f, false); formErr(f, 'Network error. Try again.'); });
  });

  var resetToken = null;
  $('#f-setpw').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target; formErr(f);
    if (f.password.value.length < 10) return formErr(f, 'Use at least 10 characters.');
    if (f.password.value !== f.confirm.value) return formErr(f, 'The two passwords do not match.');
    busy(f, true);
    api('set-password', { token: resetToken, password: f.password.value, confirm: f.confirm.value }).then(function (j) {
      busy(f, false);
      if (j._status !== 200) return formErr(f, j.error || 'Could not save.');
      f.reset(); resetToken = null; toast('Password saved'); load();
    }).catch(function () { busy(f, false); formErr(f, 'Network error. Try again.'); });
  });

  $('#logout').addEventListener('click', function () { api('logout', {}).then(function () { state.data = null; show('login'); }); });
  $('#refresh').addEventListener('click', function () { load(true); });

  function load(quiet) {
    if (!quiet) show('loading');
    return api('data').then(function (j) {
      if (j._status === 401) return show('login');
      if (j._status !== 200) { show('dash'); return toast(j.error || 'Could not load the numbers.'); }
      state.data = j; render(); show('dash'); if (quiet) toast('Updated');
    }).catch(function () { show('login'); toast('Network error.'); });
  }

  // ---------- render ----------
  function delta(a, b) {
    if (!b) return a ? '<span class="up">new</span>' : '';
    var d = (a - b) / b; return '<span class="' + (d >= 0 ? 'up' : 'down') + '">' + (d >= 0 ? '+' : '') + Math.round(d * 100) + '%</span>';
  }
  function card(k, v, s, hot) { return '<div class="card1' + (hot ? ' hot' : '') + '"><div class="k">' + k + '</div><div class="v">' + v + '</div>' + (s ? '<div class="s">' + s + '</div>' : '') + '</div>'; }

  function render() {
    var d = state.data, t = d.totals;
    $('#me').textContent = d.me;
    $('#cards').innerHTML = [
      card('Revenue', money(t.gross), 'gross to date', true),
      card('Net', money(t.net), t.net_estimated ? 'after fees, partly estimated' : 'after Stripe fees'),
      card('Sales', num(t.sales), 'paid orders'),
      card('This week', money(t.this_week.gross), t.this_week.sales + ' sales, last week ' + money(t.last_week.gross) + ' ' + delta(t.this_week.gross, t.last_week.gross)),
      card('Comments + DMs', num(t.comments + t.dms), num(t.comments) + ' comments, ' + num(t.dms) + ' DMs'),
      card('Leads', num(t.leads), 'unique people'),
      card('Site visits', num(t.visits), num(t.linkedin_visits) + ' from LinkedIn, ' + pct(t.visit_conversion) + ' buy'),
      card('Conversion', pct(t.conversion), 'sales / leads'),
    ].join('');
    $('#takeaways').innerHTML = d.takeaways.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') || '<li>Not enough data yet.</li>';

    var wk = d.weeks.slice(0, 12).reverse();
    $('#ch-rev').innerHTML = bars(wk.map(function (w) { return { l: w.label, v: w.gross / 100, t: w.label + ': ' + money(w.gross) + ', ' + w.sales + ' sales' }; }), function (v) { return '$' + Math.round(v).toLocaleString('en-US'); }, 'var(--orange)');
    $('#ch-leads').innerHTML = bars(wk.map(function (w) { return { l: w.label, v: w.leads, t: w.label + ': ' + w.leads + ' leads (' + w.comments + ' comments, ' + w.dms + ' DMs)' }; }), function (v) { return Math.round(v).toLocaleString('en-US'); }, 'var(--ink)');

    table('#t-weeks', ['Week', 'Posts', 'Impr.', 'Comments', 'DMs', 'Leads', 'Visits', 'Sales', 'Gross', 'Net', 'Conv.', '$ / lead'], d.weeks.map(function (w) {
      var empty = !w.posts && !w.leads && !w.sales;
      return { cls: empty ? 'quiet' : '', cells: ['<b>' + w.label + '</b> <span class="muted">' + fmtDay(w.week) + '</span>', num(w.posts), num(w.impressions || null), num(w.comments), num(w.dms), num(w.leads), num(w.visits), num(w.sales), money(w.gross), money(w.net), pct(w.conversion), money2(w.rev_per_lead)] };
    }));
    table('#t-days', ['Day', 'Comments', 'DM requests', 'DMs sent', 'Visits', 'Sales', 'Gross', 'Net', 'Visit to sale'], (d.days || []).map(function (x) {
      var empty = !x.comments && !x.dm_requests && !x.dms_sent && !x.visits && !x.sales;
      return { cls: empty ? 'quiet' : '', cells: ['<b>' + fmtDay(x.day) + '</b>', num(x.comments), num(x.dm_requests), num(x.dms_sent), num(x.visits), num(x.sales), money(x.gross), money(x.net), pct(x.visit_conversion)] };
    }));
    renderPosts();
    var u = d.unattributed;
    $('#unattr').textContent = (u.sales ? u.sales + (u.sales === 1 ? ' sale' : ' sales') + ' (' + money(u.gross) + ') not tied to a post. ' : '') + (u.events ? u.events + ' lead events with no matching post keyword' + (u.keywords.length ? ' (' + u.keywords.join(', ') + ')' : '') + '. Add a post with that keyword to count them.' : '');

    table('#t-lists', ['List', 'Sales', 'Gross', 'Net'], d.lists.map(function (l) { return { cells: [esc(l.name), num(l.sales), money(l.gross), money(l.net)] }; }), 'No sales yet.');
    table('#t-sources', ['Source', 'Campaign', 'Sales', 'Gross', 'Net'], d.sources.map(function (s) { return { cells: [esc(s.source), s.campaign ? '<span class="kw">' + esc(s.campaign) + '</span>' : '-', num(s.sales), money(s.gross), money(s.net)] }; }), 'No sales yet.');
    table('#t-recent', ['When', 'Who', 'What', 'Amount', 'Net', 'Country', 'Source'], d.recent.map(function (r) {
      return { cells: [fmtTime(r.at), esc(r.first_name || '-'), esc(r.what), money(r.amount), money(r.net) + (r.estimated ? '<span class="muted">*</span>' : ''), esc(r.country || '-'), esc(r.source) + (r.post ? ' <span class="muted">· ' + esc(r.post) + '</span>' : '')], lcols: [1, 2, 5, 6] };
    }), 'No sales yet.');

    var sel = $('#f-post').list_slug;
    if (sel.options.length <= 1) d.list_options.forEach(function (o) { var op = document.createElement('option'); op.value = o.slug; op.textContent = o.name; sel.appendChild(op); });
    $('#hook').textContent = d.webhook_url || 'No token found';
    $('#stamp').textContent = 'Updated ' + fmtTime(d.generated_at) + ' Lisbon time.';
  }

  var POSTCOLS = [
    ['title', 'Post'], ['posted_at', 'Date'], ['keyword', 'Keyword'], ['impressions', 'Impr.'], ['comments', 'Comments'], ['dms', 'DMs'],
    ['leads', 'Leads'], ['visits', 'Visits'], ['sales', 'Sales'], ['gross', 'Revenue'], ['conversion', 'Conv.'], ['rev_per_lead', '$ / lead'], ['rpm', '$ / 1k impr.'], [null, '']
  ];
  function renderPosts() {
    var d = state.data, s = state.sort;
    var rows = d.posts.slice().sort(function (a, b) {
      var x = a[s.key], y = b[s.key];
      if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
      return (typeof x === 'string' ? x.localeCompare(y) : x - y) * s.dir;
    });
    var th = POSTCOLS.map(function (c, i) { return '<th' + (c[0] ? ' data-k="' + c[0] + '"' : '') + ' class="' + (i < 3 ? 'l ' : '') + (c[0] === s.key ? 'on' + (s.dir > 0 ? ' asc' : '') : '') + '">' + c[1] + '</th>'; }).join('');
    var body = rows.map(function (p) {
      var best = p.id === d.best_post_id;
      var title = (p.url ? '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(p.title) + '</a>' : esc(p.title)) + (best ? '<span class="tag">best</span>' : '') + (p.list_name ? '<br><span class="muted small">' + esc(p.list_name) + '</span>' : '');
      var cm = num(p.comments) + (p.comments_captured && p.comments_count != null && p.comments_captured !== p.comments_count ? ' <span class="muted small" title="captured / LinkedIn">(' + p.comments_captured + '/' + p.comments_count + ')</span>' : '');
      return '<tr class="' + (best ? 'best' : '') + '"><td class="t">' + title + '</td><td class="l">' + fmtDay(p.posted_at) + '</td><td class="l">' + (p.keyword ? '<span class="kw">' + esc(p.keyword) + '</span>' : '-') + '</td><td>' + num(p.impressions) + '</td><td>' + cm + '</td><td>' + num(p.dms) + '</td><td>' + num(p.leads) + '</td><td>' + num(p.visits) + '</td><td>' + num(p.sales) + '</td><td><b>' + money(p.gross) + '</b></td><td>' + pct(p.conversion) + '</td><td>' + money2(p.rev_per_lead) + '</td><td>' + money2(p.rpm) + '</td><td><button class="linkbtn" type="button" data-edit="' + p.id + '">Edit</button></td></tr>';
    }).join('');
    var u = d.unattributed;
    if (u.sales || u.events) body += '<tr class="quiet"><td class="t">No post matched</td><td></td><td></td><td></td><td></td><td></td><td>' + num(u.leads) + '</td><td></td><td>' + num(u.sales) + '</td><td>' + money(u.gross) + '</td><td></td><td></td><td></td><td></td></tr>';
    $('#t-posts').innerHTML = '<thead><tr>' + th + '</tr></thead><tbody>' + (body || '<tr><td colspan="14" class="muted">No posts yet. Add one.</td></tr>') + '</tbody>';
  }
  $('#t-posts').addEventListener('click', function (e) {
    var h = e.target.closest('th[data-k]');
    if (h) { var k = h.getAttribute('data-k'); state.sort = { key: k, dir: state.sort.key === k ? -state.sort.dir : (k === 'title' || k === 'keyword' ? 1 : -1) }; return renderPosts(); }
    var ed = e.target.closest('[data-edit]');
    if (ed) openPost(state.data.posts.find(function (p) { return String(p.id) === ed.getAttribute('data-edit'); }));
  });

  function table(sel, heads, rows, emptyMsg) {
    var lc = (rows[0] && rows[0].lcols) || [];
    var th = heads.map(function (h, i) { return '<th' + (i === 0 || lc.indexOf(i) >= 0 ? ' class="l"' : '') + '>' + h + '</th>'; }).join('');
    var tb = rows.map(function (r) { return '<tr class="' + (r.cls || '') + '">' + r.cells.map(function (c, i) { return '<td' + ((r.lcols || []).indexOf(i) >= 0 ? ' class="l"' : '') + '>' + c + '</td>'; }).join('') + '</tr>'; }).join('');
    $(sel).innerHTML = '<thead><tr>' + th + '</tr></thead><tbody>' + (tb || '<tr><td colspan="' + heads.length + '" class="muted l">' + (emptyMsg || 'Nothing yet.') + '</td></tr>') + '</tbody>';
  }

  function bars(pts, fmt, color) {
    var W = window.innerWidth < 600 ? 360 : 560, H = window.innerWidth < 600 ? 170 : 190, pl = 8, pr = 8, pt = 22, pb = 22;
    var max = Math.max.apply(null, pts.map(function (p) { return p.v; }).concat([0]));
    if (!pts.length) return '<p class="muted">No data yet.</p>';
    var bw = (W - pl - pr) / pts.length, out = '';
    pts.forEach(function (p, i) {
      var h = max ? (p.v / max) * (H - pt - pb) : 0, x = pl + i * bw + bw * 0.15, w = bw * 0.7, y = H - pb - h;
      out += '<g><title>' + esc(p.t) + '</title><rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + Math.max(h, p.v ? 1.5 : 0).toFixed(1) + '" rx="3" fill="' + color + '"></rect>';
      if (p.v) out += '<text class="lbl" x="' + (x + w / 2).toFixed(1) + '" y="' + (y - 5).toFixed(1) + '" text-anchor="middle">' + esc(fmt(p.v)) + '</text>';
      out += '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(p.l) + '</text></g>';
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="bar chart"><line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + (H - pb) + '" y2="' + (H - pb) + '" stroke="var(--rule)"></line>' + out + '</svg>';
  }

  var dayF = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  var timeF = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon' });
  function fmtDay(s) { return s ? dayF.format(new Date(s + 'T00:00:00Z')) : '-'; }
  function fmtTime(s) { return s ? timeF.format(new Date(s)) : '-'; }

  // ---------- post form ----------
  var pf = $('#f-post');
  function openPost(p) {
    pf.reset(); formErr(pf); pf.hidden = false;
    var keys = ['id', 'title', 'posted_at', 'keyword', 'list_slug', 'url', 'impressions', 'reactions', 'comments_count', 'reposts', 'notes'];
    keys.forEach(function (k) { if (pf[k]) pf[k].value = p && p[k] != null ? p[k] : ''; });
    if (!p) pf.posted_at.value = new Date().toISOString().slice(0, 10);
    $('#delpost').hidden = !p;
    pf.title.focus();
  }
  $('#addpost').addEventListener('click', function () { openPost(null); });
  $('#cancelpost').addEventListener('click', function () { pf.hidden = true; });
  pf.addEventListener('submit', function (e) {
    e.preventDefault(); formErr(pf); busy(pf, true);
    var body = {};
    ['id', 'title', 'posted_at', 'keyword', 'list_slug', 'url', 'impressions', 'reactions', 'comments_count', 'reposts', 'notes'].forEach(function (k) { body[k] = pf[k].value; });
    if (!body.id) delete body.id;
    api('post', body).then(function (j) {
      busy(pf, false);
      if (j._status !== 200) return formErr(pf, j.error || 'Could not save.');
      pf.hidden = true; toast('Post saved'); load(true);
    }).catch(function () { busy(pf, false); formErr(pf, 'Network error. Try again.'); });
  });
  $('#delpost').addEventListener('click', function () {
    if (!pf.id.value || !confirm('Delete this post? Its sales and leads move to "No post matched".')) return;
    api('post-delete', { id: pf.id.value }).then(function (j) { if (j._status !== 200) return formErr(pf, j.error || 'Could not delete.'); pf.hidden = true; toast('Post deleted'); load(true); });
  });

  // ---------- setup ----------
  $('#copyhook').addEventListener('click', function () { var v = $('#hook').textContent; if (navigator.clipboard) navigator.clipboard.writeText(v).then(function () { toast('Copied'); }); });
  $('#f-import').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target; formErr(f); f.querySelector('.ok').textContent = '';
    var arr; try { arr = JSON.parse(f.leads.value); } catch (x) { return formErr(f, 'That is not valid JSON.'); }
    if (!Array.isArray(arr)) return formErr(f, 'Paste a JSON array: [ {...}, {...} ]');
    busy(f, true);
    api('import-leads', arr).then(function (j) {
      busy(f, false);
      if (j._status !== 200) return formErr(f, j.error || 'Import failed.');
      f.querySelector('.ok').textContent = 'Imported ' + j.inserted + ' of ' + j.received + ' (' + j.duplicates + ' already there).'; f.leads.value = ''; load(true);
    }).catch(function () { busy(f, false); formErr(f, 'Network error. Try again.'); });
  });

  // ---------- start ----------
  var m = location.hash.match(/reset=([a-f0-9]{64})/);
  if (m) { resetToken = m[1]; history.replaceState(null, '', location.pathname); show('setpw'); }
  else load();
})();
`;
