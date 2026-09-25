(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fmt = function (n, d) { return n.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };

  /* ---------- formula bar ---------- */
  var fxEl = $('#fx'), refEl = $('#ref'), typing;
  function setFx(text, ref) {
    if (ref) refEl.textContent = ref;
    if (!fxEl) return;
    clearInterval(typing);
    if (still) { fxEl.textContent = text; return; }
    var i = 0; fxEl.textContent = '';
    typing = setInterval(function () {
      i += 2; fxEl.textContent = text.slice(0, i);
      if (i >= text.length) clearInterval(typing);
    }, 16);
  }

  /* ---------- status bar ---------- */
  var statEl = $('#stat'), aggEl = $('#agg'), statT;
  function status(msg, ms) {
    if (!statEl) return;
    statEl.textContent = msg; clearTimeout(statT);
    if (ms) statT = setTimeout(function () { statEl.textContent = 'Ready'; }, ms);
  }
  function calc() { status('Calculating (4 threads)...', 450); }

  /* ---------- active row on scroll ---------- */
  var rows = $$('.sheet > .row[data-ref]');
  var rnFor = function (row) { return row.previousElementSibling; };
  var current = null, clicked = 0;
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting || e.target === current) return;
        if (current) rnFor(current).classList.remove('on');
        current = e.target; rnFor(current).classList.add('on');
        if (Date.now() - clicked > 1200) setFx(current.dataset.fx, current.dataset.ref);
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    rows.forEach(function (r) { io.observe(r); });
  }

  /* ---------- click to select a cell ---------- */
  $$('.cell').forEach(function (c) {
    c.addEventListener('click', function () {
      $$('.cell.sel').forEach(function (x) { x.classList.remove('sel'); });
      c.classList.add('sel');
      var row = c.closest('.row'), n = rnFor(row).textContent.trim();
      var col = (row.classList.contains('two') && c.previousElementSibling) ? 'B' : 'A';
      clicked = Date.now();
      setFx(c.dataset.fx || row.dataset.fx, col + n);
    });
  });

  /* ---------- reveal on scroll ---------- */
  var onShow = function (el, fn) {
    if (!el) return;
    if (!('IntersectionObserver' in window) || still) { el.classList.add('in'); fn && fn(); return; }
    var o = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { el.classList.add('in'); fn && fn(); o.disconnect(); }
    }, { threshold: 0.35 });
    o.observe(el);
  };
  $$('.rv').forEach(function (el) { onShow(el); });
  setTimeout(function () { $$('.rv').forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('in'); }); }, 1500);

  function countUp(el, to, ms) {
    if (still) { el.textContent = fmt(to); return; }
    var t0 = performance.now();
    (function step(t) {
      var k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(Math.round(to * e));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ---------- cash chart ---------- */
  var svg = $('#cashSvg');
  var W = 520, H = 230, L = 38, R = 10, T = 10, B = 26, M = 30, YMIN = -2, YMAX = 10;
  var X = function (m) { return L + (W - L - R) * m / M; };
  var Y = function (v) { return T + (H - T - B) * (YMAX - v) / (YMAX - YMIN); };
  function series(s) {
    var cash = 4.0, out = [cash];
    for (var m = 1; m <= M; m++) {
      var burn = 0.22 * Math.pow(1.025, m);
      if (s === 'hire' && m >= 3) burn += 0.1;
      cash -= burn;
      if (s === 'raise' && m === 10) cash += 6;
      out.push(cash);
    }
    return out;
  }
  function pathOf(a) { return a.map(function (v, m) { return (m ? 'L' : 'M') + X(m).toFixed(1) + ' ' + Y(v).toFixed(1); }).join(' '); }
  function drawAxes() {
    var g = '';
    for (var v = YMIN; v <= YMAX; v += 2) {
      g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="' + (v === 0 ? '#8c8c8c' : '#e3e3e3') + '"/>';
      g += '<text x="' + (L - 6) + '" y="' + (Y(v) + 4) + '" font-size="11" fill="#6b6b6b" text-anchor="end">' + v + '</text>';
    }
    for (var m = 0; m <= M; m += 6) g += '<text x="' + X(m) + '" y="' + (H - 8) + '" font-size="11" fill="#6b6b6b" text-anchor="middle">M' + m + '</text>';
    return g;
  }
  var scen = 'base';
  function renderCash(animate) {
    if (!svg) return;
    var base = series('base'), s = series(scen);
    var html = drawAxes();
    if (scen !== 'base') html += '<path class="line" d="' + pathOf(base) + '" stroke="#b4c7e7" stroke-dasharray="4 4"/>';
    html += '<path class="line" id="cashLine" pathLength="1" d="' + pathOf(s) + '" stroke="' + (scen === 'base' ? '#4472c4' : '#ed7d31') + '"/>';
    var zero = -1; for (var m = 1; m <= M; m++) if (s[m] < 0) { zero = m; break; }
    if (zero > 0) html += '<circle cx="' + X(zero) + '" cy="' + Y(0) + '" r="5" fill="#c00000"/><text x="' + X(zero) + '" y="' + (Y(0) + 18) + '" font-size="11" fill="#c00000" text-anchor="middle">out of cash</text>';
    svg.innerHTML = html;
    var line = $('#cashLine');
    if (animate && !still) {
      line.style.strokeDasharray = '1'; line.style.strokeDashoffset = '1';
      line.getBoundingClientRect();
      line.style.transition = 'stroke-dashoffset 1.3s cubic-bezier(.2,.7,.2,1)';
      line.style.strokeDashoffset = '0';
    }
    var rw = $('#runway'), co = $('#cashout');
    rw.textContent = zero > 0 ? zero + ' months' : '30+ months';
    co.textContent = zero > 0 ? 'Month ' + zero : 'Not in view';
    [rw, co].forEach(function (x) { x.classList.remove('flash'); void x.offsetWidth; x.classList.add('flash'); });
  }
  if (svg) {
    svg.innerHTML = drawAxes();
    onShow($('#cashChart'), function () { renderCash(true); });
    $$('#scen button').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        $$('#scen button').forEach(function (x) { x.classList.toggle('on', x === b); });
        scen = b.dataset.s; calc(); renderCash(true);
        setFx('=FORECAST(drivers, scenario = "' + b.textContent + '")', 'B3');
      });
    });
  }

  /* ---------- diligence tracker ---------- */
  onShow($('#trk'), function () {
    var pills = $$('#trk .pill');
    pills.forEach(function (p, i) {
      var d = still ? 0 : 350 + i * 260;
      setTimeout(function () { p.textContent = 'In review'; p.className = 'pill rev'; }, d);
      setTimeout(function () { p.textContent = 'Posted'; p.className = 'pill done'; }, d + (still ? 0 : 700));
    });
    $('#progBar').style.width = '100%';
    countUp($('#ansN'), 439, 2200);
  });

  /* ---------- raise calculator ---------- */
  var ins = ['iRaise', 'iPre', 'iPool', 'iFound'].map(function (id) { return document.getElementById(id); });
  function recalc() {
    if (!ins[0]) return;
    var v = ins.map(function (i) { return parseFloat(String(i.value).replace(/[^0-9.\-]/g, '')); });
    var raise = v[0], pre = v[1], pool = v[2] / 100, F = v[3] / 100;
    var bad = v.some(isNaN) || raise < 0 || pre <= 0 || pool < 0 || F < 0 || F > 1;
    var post = pre + raise, n = raise / post, keep = 1 - n - pool;
    if (keep < 0) bad = true;
    var set = function (id, t) { var e = document.getElementById(id); e.textContent = t; e.classList.remove('flash'); void e.offsetWidth; e.classList.add('flash'); };
    if (bad) { ['oPost', 'oNew', 'oFound'].forEach(function (id) { set(id, '#VALUE!'); }); return; }
    set('oPost', '$' + fmt(post, 1) + 'mm');
    set('oNew', fmt(n * 100, 1) + '%');
    set('oFound', fmt(F * keep * 100, 1) + '%');
    var b = $$('#stBefore span'), a = $$('#stAfter span');
    b[0].style.width = F * 100 + '%'; b[1].style.width = (1 - F) * 100 + '%';
    a[0].style.width = F * keep * 100 + '%'; a[1].style.width = (1 - F) * keep * 100 + '%';
    a[2].style.width = pool * 100 + '%'; a[3].style.width = n * 100 + '%';
  }
  ins.forEach(function (i) { if (i) i.addEventListener('input', function () { calc(); recalc(); setFx('=' + i.id.slice(1).toLowerCase() + ' := ' + i.value, 'B6'); }); });
  onShow($('#stAfter') && $('#stAfter').closest('.chart'), recalc);

  /* ---------- track record: count up, data bars, pick to sum ---------- */
  var vals = $$('#nums .v[data-n]');
  onShow($('#nums'), function () {
    vals.forEach(function (v) {
      var n = +v.dataset.n; countUp(v.querySelector('span'), n, 1600);
      v.querySelector('.db').style.width = (n / 714 * 100) + '%';
    });
  });
  var dragging = false;
  function agg() {
    var p = vals.filter(function (v) { return v.classList.contains('pick'); }).map(function (v) { return +v.dataset.n; });
    if (!p.length) { aggEl.textContent = ''; return; }
    var s = p.reduce(function (a, b) { return a + b; }, 0);
    aggEl.textContent = 'Average: ' + fmt(s / p.length) + '   Count: ' + p.length + '   Sum: ' + fmt(s);
    setFx('=SUM(' + p.join(', ') + ')', 'B8');
    clicked = Date.now();
  }
  vals.forEach(function (v) {
    v.addEventListener('mousedown', function (e) { e.preventDefault(); dragging = true; if (!e.shiftKey) vals.forEach(function (x) { x.classList.remove('pick'); }); v.classList.add('pick'); agg(); });
    v.addEventListener('mouseenter', function () { if (dragging) { v.classList.add('pick'); agg(); } });
    v.addEventListener('touchstart', function () { v.classList.toggle('pick'); agg(); }, { passive: true });
  });
  document.addEventListener('mouseup', function () { dragging = false; });

  /* ---------- fit check ---------- */
  var boxes = $$('#chk .box'), fit = $('#fit');
  boxes.forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      b.classList.toggle('on'); b.setAttribute('aria-pressed', b.classList.contains('on'));
      var n = boxes.filter(function (x) { return x.classList.contains('on'); }).length;
      calc();
      if (n) {
        fit.className = 'fit yes';
        fit.innerHTML = 'TRUE (' + n + ' of 3). <a href="mailto:sophie@getvantidge.com?subject=' + encodeURIComponent('Checked ' + n + ' of 3') + '">=EMAIL(&quot;Sophie&quot;)</a>';
      } else {
        fit.className = 'fit';
        fit.textContent = '=IF(COUNTIF(B10:B12, TRUE) > 0, EMAIL(), "")';
      }
      setFx('=COUNTIF(B10:B12, TRUE)  →  ' + n, 'A10');
      clicked = Date.now();
    });
  });

  /* ---------- queries & connections ---------- */
  var qBtn = $('#qRefresh'), qRan = false;
  var flow = $('#qflow'), NS = 'http://www.w3.org/2000/svg';
  var SRC = ['Stripe', 'Ledger', 'CRM', 'Bank', 'Payroll', 'Warehouse'];
  function mk(tag, at, parent) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); (parent || flow).appendChild(e); return e; }
  if (flow) {
    var MX = 340, MY = 95;
    SRC.forEach(function (name, i) {
      var y = 16 + i * 32, d = 'M92 ' + y + ' C 220 ' + y + ', 240 ' + MY + ', ' + MX + ' ' + MY;
      var g = mk('g', { 'class': 'qf', 'data-i': i });
      mk('rect', { x: 2, y: y - 11, width: 88, height: 22, rx: 2, 'class': 'qfs' }, g);
      mk('text', { x: 46, y: y + 4, 'text-anchor': 'middle', 'class': 'qft' }, g).textContent = name;
      mk('path', { d: d, 'class': 'qfp' }, g);
      for (var k = 0; k < 3; k++) {
        var c = mk('circle', { r: 3.2, 'class': 'qfd' }, g);
        var am = mk('animateMotion', { dur: '1.2s', repeatCount: 'indefinite', begin: (k * 0.4) + 's', path: d }, c);
      }
    });
    var mg = mk('g', { 'class': 'qfm' });
    mk('rect', { x: MX, y: MY - 34, width: 112, height: 68, rx: 3, 'class': 'qfmb' }, mg);
    mk('text', { x: MX + 56, y: MY - 8, 'text-anchor': 'middle', 'class': 'qfmt' }, mg).textContent = 'Model.xlsx';
    mk('text', { x: MX + 56, y: MY + 16, 'text-anchor': 'middle', 'class': 'qfmn', id: 'qfRows' }).textContent = '0 rows';
    flow.appendChild(document.getElementById('qfRows'));
  }
  var rowsIn = 0;
  function flowState(i, st) {
    if (!flow) return;
    var g = flow.querySelector('.qf[data-i="' + i + '"]'); if (!g) return;
    g.setAttribute('class', 'qf ' + st);
  }

  function refreshAll() {
    var items = $$('#qc .qlist li'), tie = $('#qtieV');
    if (!items.length) return;
    qBtn.disabled = true; tie.textContent = 'Waiting'; tie.className = '';
    status('Refreshing ' + items.length + ' connections...');
    items.forEach(function (li, i) { li.className = ''; li.querySelector('.qs').textContent = 'Queued'; flowState(i, ''); });
    rowsIn = 0; var rt = $('#qfRows'); if (rt) rt.textContent = '0 rows'; if (flow) flow.classList.remove('done');
    items.forEach(function (li, i) {
      var d = still ? 0 : 250 + i * 420;
      setTimeout(function () { li.className = 'run'; li.querySelector('.qs').textContent = 'Refreshing'; flowState(i, 'run'); }, d);
      setTimeout(function () {
        li.className = 'ok'; li.querySelector('.qs').textContent = li.dataset.rows + ' rows'; flowState(i, 'ok');
        rowsIn += +li.dataset.rows.replace(/,/g, ''); var rt = $('#qfRows'); if (rt) rt.textContent = fmt(rowsIn) + ' rows';
        if (i === items.length - 1) {
          tie.textContent = '14 of 14 at zero'; tie.className = 'good'; qBtn.disabled = false; if (flow) flow.classList.add('done');
          status('Ready'); setFx('=REFRESH.ALL(sources)  →  14 tie-outs at zero', 'B4'); clicked = Date.now();
        }
      }, d + (still ? 0 : 650));
    });
  }
  if (qBtn) {
    qBtn.addEventListener('click', function (e) { e.stopPropagation(); refreshAll(); });
    onShow($('#qc'), function () { if (!qRan) { qRan = true; setTimeout(refreshAll, 400); } });
  }

  /* ---------- small things ---------- */
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault(); status('Saved. There was nothing to save, it\'s a website.', 3500);
    }
  });
  if (fxEl) setFx(rows[0] ? rows[0].dataset.fx : '', 'A1');
  if (rows[0]) { current = rows[0]; rnFor(rows[0]).classList.add('on'); }
})();

/* ---------- email: pick-your-path composer ---------- */
(function () {
  var TO = 'sophie@getvantidge.com';
  var CAL = ''; // booking link, e.g. https://calendly.com/sophie-getvantidge/30min
  var STEPS = [
    { k: 'topic', q: "What's coming up?", opts: [
      ['raise', 'A raise'], ['sale', 'A sale, or a buyer knocking'], ['hire', "We're hiring for finance"],
      ['model', "We don't have a model we trust"], ['data', 'Our data is a mess'], ['dd', 'Diligence, soon'], ['curious', 'Just curious'] ] },
    { k: 'when', q: 'When?', opts: [ ['now', 'This month'], ['qtr', 'This quarter'], ['year', 'This year'], ['someday', 'Someday'] ] },
    { k: 'who', q: 'Who does finance today?', opts: [ ['nobody', 'Nobody, really'], ['me', 'Me, at night'], ['bk', 'A bookkeeper'], ['acct', 'An outside accountant'] ] },
    { k: 'ask', q: 'What do you want out of this?', opts: [ ['what', "Ask what you'd do for us"], ['call', 'Schedule a call'], ['other', 'Something else'] ] },
    { k: 'you', q: 'Who should I write back to?', input: true }
  ];
  var TXT = {
    topic: { raise: "We're starting to think about a raise.", sale: 'We may be selling the company, or a buyer has come to us.', hire: "We've been thinking about hiring someone for strategic finance.", model: "We don't have an operating model we trust.", data: "Our numbers live in too many systems and nobody trusts which one is right.", dd: 'We have diligence coming up and want to be ready for it.', curious: 'I came across Vantidge and wanted to learn more.' },
    when: { now: 'We want to get going this month.', qtr: 'We want to get going this quarter.', year: 'Sometime this year.', someday: 'No set timing yet.' },
    who: { nobody: 'Right now nobody really owns finance.', me: "Right now I'm doing the finance myself, mostly at night.", bk: "Right now we have a bookkeeper and that's about it.", acct: 'Right now we use an outside accountant.' },
    subj: { raise: 'raise', sale: 'sale', hire: 'strategic finance', model: 'operating model', data: 'data', dd: 'diligence', curious: 'hello' },
    whenS: { now: 'this month', qtr: 'this quarter', year: 'this year', someday: '' }
  };
  var dlg, st, ans, preset;
  function el(h) { var d = document.createElement('div'); d.innerHTML = h; return d.firstChild; }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function parse(href) {
    var q = href.split('?')[1] || '', o = { su: '', body: '' };
    q.split('&').forEach(function (kv) { var p = kv.split('='); if (p[0] === 'subject') o.su = decodeURIComponent(p[1] || ''); if (p[0] === 'body') o.body = decodeURIComponent(p[1] || ''); });
    return o;
  }
  function compose() {
    var co = (ans.company || '').trim(), nm = (ans.name || '').trim();
    var su = (co ? co + ': ' : '') + TXT.subj[ans.topic] + (TXT.whenS[ans.when] ? ' ' + TXT.whenS[ans.when] : '');
    su = su.charAt(0).toUpperCase() + su.slice(1);
    var intro = nm ? "I'm " + nm + (co ? ' at ' + co : '') + '. ' : (co ? "I'm at " + co + '. ' : '');
    var when = ans.topic === 'curious' ? '' : ' ' + TXT.when[ans.when];
    var close = ans.ask === 'what' ? 'What would you do for ' + (co || 'us') + '?'
      : ans.ask === 'call' ? 'Could we find 30 minutes to talk?'
      : ((ans.note || '').trim() || 'Could we find 30 minutes to talk?');
    var body = 'Hi Sophie,\n\n' + intro + TXT.topic[ans.topic] + when + ' ' + TXT.who[ans.who] +
      '\n\n' + close + '\n\nBest,\n' + (nm || '');
    return { su: su, body: body };
  }
  function build() {
    dlg = el('<div class="mdlg"><div class="mbox" role="dialog" aria-modal="true" aria-label="Email Sophie">' +
      '<div class="mhead"><span id="mTitle">Email Sophie</span><button class="mx" aria-label="Close">&times;</button></div>' +
      '<div class="mbody" id="mBody"></div></div></div>');
    document.body.appendChild(dlg);
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.classList.contains('mx')) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }
  function dots() {
    var h = '<div class="msteps">';
    for (var i = 0; i <= STEPS.length; i++) h += '<i class="' + (i < st ? 'd' : i === st ? 'c' : '') + '"></i>';
    return h + '</div>';
  }
  function render() {
    var B = dlg.querySelector('#mBody');
    if (st < STEPS.length) {
      var S = STEPS[st], h = dots() + '<p class="mq">' + S.q + '</p>';
      if (S.input) {
        h += '<div class="mform"><label>Your name<input class="in" id="mName" value="' + esc(ans.name || '') + '"></label>' +
          '<label>Company<input class="in" id="mCo" value="' + esc(ans.company || '') + '"></label>' +
          (ans.ask === 'other' ? '<label>What\'s on your mind?<textarea class="in" id="mNote" rows="3">' + esc(ans.note || '') + '</textarea></label>' : '') + '</div>' +
          '<div class="mnav"><button class="btn" data-back>Back</button><button class="btn go" data-next>Write my email</button></div>';
      } else {
        h += '<div class="mopts">' + S.opts.map(function (o) { return '<button class="mopt' + (ans[S.k] === o[0] ? ' on' : '') + '" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>';
        if (st) h += '<div class="mnav"><button class="btn" data-back>Back</button></div>';
      }
      B.innerHTML = h;
      B.querySelectorAll('.mopt').forEach(function (b) { b.onclick = function () { ans[S.k] = b.dataset.v; st++; render(); }; });
      var nx = B.querySelector('[data-next]');
      if (nx) {
        var n = B.querySelector('#mName'); setTimeout(function () { n.focus(); }, 30);
        nx.onclick = function () { ans.name = n.value; ans.company = B.querySelector('#mCo').value; var nt = B.querySelector('#mNote'); if (nt) ans.note = nt.value; st++; render(); };
        B.querySelectorAll('input').forEach(function (i) { i.onkeydown = function (e) { if (e.key === 'Enter') nx.click(); }; });
      }
    } else {
      var m = preset || compose();
      var cal = !preset && ans.ask === 'call' && CAL;
      var calUrl = cal ? CAL + (CAL.indexOf('?') < 0 ? '?' : '&') + 'name=' + encodeURIComponent(ans.name || '') : '';
      B.innerHTML = (preset ? '' : dots()) + '<p class="mq">' + (preset ? 'Here it is.' : cal ? 'Pick a time.' : 'Done. You just have to press send.') + '</p>' +
        (cal ? '<a class="btn go mcal" href="' + calUrl + '" target="_blank" rel="noopener">Open my calendar</a><p class="small muted" style="margin:10px 0 8px">Or send a note first.</p>' : '') +
        '<div class="mmail"><div class="mrow"><span>To</span><b>' + TO + '</b></div>' +
        '<div class="mrow"><span>Subject</span><input id="mSu" value="' + esc(m.su) + '"></div>' +
        '<textarea id="mTx" rows="9">' + esc(m.body) + '</textarea></div>' +
        '<div class="msend"><a class="btn go" data-k="gmail" target="_blank" rel="noopener">Send with Gmail</a>' +
        '<a class="btn" data-k="outlook" target="_blank" rel="noopener">Send with Outlook</a>' +
        '<a class="btn" data-k="app">My mail app</a><button class="btn" data-k="copy">Copy it</button></div>' +
        (preset ? '' : '<div class="mnav"><button class="btn" data-back>Back</button></div>');
      var link = function () {
        var su = B.querySelector('#mSu').value, tx = B.querySelector('#mTx').value, e = encodeURIComponent;
        B.querySelector('[data-k=gmail]').href = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + e(TO) + '&su=' + e(su) + '&body=' + e(tx);
        B.querySelector('[data-k=outlook]').href = 'https://outlook.office.com/mail/deeplink/compose?to=' + e(TO) + '&subject=' + e(su) + '&body=' + e(tx);
        B.querySelector('[data-k=app]').href = 'mailto:' + TO + '?subject=' + e(su) + '&body=' + e(tx);
      };
      link(); B.querySelector('#mSu').oninput = link; B.querySelector('#mTx').oninput = link;
      B.querySelector('[data-k=copy]').onclick = function () {
        var b = this, t = 'To: ' + TO + '\nSubject: ' + B.querySelector('#mSu').value + '\n\n' + B.querySelector('#mTx').value;
        (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { b.textContent = 'Copied'; }, function () { b.textContent = 'Copy failed'; });
      };
      B.querySelectorAll('.msend a').forEach(function (a) { a.addEventListener('click', function () { setTimeout(close, 400); }); });
    }
    var bk = B.querySelector('[data-back]'); if (bk) bk.onclick = function () { st--; render(); };
  }
  function open(href) {
    if (!dlg) build();
    var o = parse(href);
    preset = o.body ? o : null;
    ans = {}; st = preset ? STEPS.length : 0;
    dlg.querySelector('#mTitle').textContent = 'Email Sophie';
    render(); dlg.classList.add('on');
  }
  function close() { if (dlg) dlg.classList.remove('on'); }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="mailto:"]');
    if (!a || a.closest('.mdlg')) return;
    e.preventDefault(); open(a.getAttribute('href'));
  });
})();

/* ---------- "See your company": jump to the door and mark it ---------- */
(function () {
  function showDoor() {
    var d = document.getElementById('door'); if (!d) return false;
    d.scrollIntoView({ behavior: 'smooth', block: 'center' });
    d.classList.remove('ants'); void d.offsetWidth; d.classList.add('ants');
    setTimeout(function () { var i = document.getElementById('co'); if (i) i.focus({ preventScroll: true }); }, 450);
    var ref = document.getElementById('ref'), fx = document.getElementById('fx');
    if (ref) ref.textContent = 'B1'; if (fx) fx.textContent = '=OPEN(company, password)';
    return true;
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href="/#door"], a[href="#door"]');
    if (a && showDoor()) e.preventDefault();
  });
  if (location.hash === '#door') setTimeout(showDoor, 300);
})();
