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
  $$('.rv').forEach(function (el) { if (!el.id) onShow(el); });

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
  ins.forEach(function (i) { if (i) i.addEventListener('input', function () { calc(); recalc(); setFx('=' + i.id.slice(1).toLowerCase() + ' := ' + i.value, 'B5'); }); });
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
    setFx('=SUM(' + p.join(', ') + ')', 'B7');
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
        fit.textContent = '=IF(COUNTIF(B9:B11, TRUE) > 0, EMAIL(), "")';
      }
      setFx('=COUNTIF(B9:B11, TRUE)  →  ' + n, 'A9');
      clicked = Date.now();
    });
  });

  /* ---------- small things ---------- */
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault(); status('Saved. There was nothing to save, it\'s a website.', 3500);
    }
  });
  if (fxEl) setFx(rows[0] ? rows[0].dataset.fx : '', 'A1');
  if (rows[0]) { current = rows[0]; rnFor(rows[0]).classList.add('on'); }
})();

/* ---------- email dialog: mailto links fail when no mail app is set up ---------- */
(function () {
  var dlg;
  function parse(href) {
    var q = href.split('?')[1] || '', o = { to: href.slice(7).split('?')[0], su: '', body: '' };
    q.split('&').forEach(function (kv) { var p = kv.split('='); if (p[0] === 'subject') o.su = decodeURIComponent(p[1] || ''); if (p[0] === 'body') o.body = decodeURIComponent(p[1] || ''); });
    return o;
  }
  function build() {
    dlg = document.createElement('div');
    dlg.className = 'mdlg';
    dlg.innerHTML = '<div class="mbox" role="dialog" aria-modal="true" aria-label="Email Sophie">' +
      '<div class="mhead"><span>Email Sophie</span><button class="mx" aria-label="Close">&times;</button></div>' +
      '<div class="mbody"><p class="mto">sophie@getvantidge.com</p><p class="msu"></p>' +
      '<div class="mbtns"><a class="btn go" data-k="gmail" target="_blank" rel="noopener">Open in Gmail</a>' +
      '<a class="btn" data-k="outlook" target="_blank" rel="noopener">Open in Outlook</a>' +
      '<a class="btn" data-k="app">Use my mail app</a>' +
      '<button class="btn" data-k="copy">Copy address</button></div></div></div>';
    document.body.appendChild(dlg);
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.classList.contains('mx')) close(); });
    dlg.querySelector('[data-k=copy]').addEventListener('click', function () {
      var b = this;
      (navigator.clipboard ? navigator.clipboard.writeText('sophie@getvantidge.com') : Promise.reject()).then(function () { b.textContent = 'Copied'; }, function () { b.textContent = 'sophie@getvantidge.com'; });
    });
    dlg.querySelectorAll('a[data-k]').forEach(function (a) { a.addEventListener('click', function () { setTimeout(close, 300); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }
  function open(href) {
    if (!dlg) build();
    var o = parse(href), e = encodeURIComponent;
    dlg.querySelector('.msu').textContent = o.su ? 'Subject: ' + o.su : '';
    dlg.querySelector('[data-k=gmail]').href = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + e(o.to) + '&su=' + e(o.su) + '&body=' + e(o.body);
    dlg.querySelector('[data-k=outlook]').href = 'https://outlook.office.com/mail/deeplink/compose?to=' + e(o.to) + '&subject=' + e(o.su) + '&body=' + e(o.body);
    dlg.querySelector('[data-k=app]').href = href;
    dlg.querySelector('[data-k=copy]').textContent = 'Copy address';
    dlg.classList.add('on');
    dlg.querySelector('[data-k=gmail]').focus();
  }
  function close() { if (dlg) dlg.classList.remove('on'); }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="mailto:"]');
    if (!a || a.closest('.mdlg')) return;
    e.preventDefault(); open(a.href);
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
