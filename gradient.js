(function () {
  var canvas = document.getElementById('heroGradient');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var w, h, mouse = { x: 0.5, y: 0.5 };
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var blobs = [
    { x: 0.25, y: 0.3, r: 0.38, vx: 0.0003, vy: 0.0002, c: '31,107,79', a: 0.13 },
    { x: 0.75, y: 0.55, r: 0.42, vx: -0.0002, vy: 0.0003, c: '37,99,235', a: 0.08 },
    { x: 0.5, y: 0.85, r: 0.3, vx: 0.0004, vy: -0.0002, c: '14,165,160', a: 0.08 },
    { x: 0.85, y: 0.15, r: 0.25, vx: -0.0003, vy: 0.0001, c: '245,158,11', a: 0.06 }
  ];
  function resize() {
    w = canvas.width = canvas.offsetWidth * devicePixelRatio;
    h = canvas.height = canvas.offsetHeight * devicePixelRatio;
  }
  function draw() {
    ctx.clearRect(0, 0, w, h);
    blobs.forEach(function (b) {
      if (!still) {
        b.x += b.vx + (mouse.x - 0.5) * 0.00008;
        b.y += b.vy + (mouse.y - 0.5) * 0.00008;
        if (b.x < -0.2) b.x = 1.2; if (b.x > 1.2) b.x = -0.2;
        if (b.y < -0.2) b.y = 1.2; if (b.y > 1.2) b.y = -0.2;
      }
      var cx = b.x * w, cy = b.y * h, r = b.r * Math.min(w, h) * 1.6;
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(' + b.c + ',' + b.a + ')');
      g.addColorStop(1, 'rgba(' + b.c + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    });
    if (!still) requestAnimationFrame(draw);
  }
  window.addEventListener('resize', function () { resize(); if (still) draw(); });
  document.addEventListener('mousemove', function (e) {
    mouse.x = e.clientX / window.innerWidth;
    mouse.y = e.clientY / window.innerHeight;
  });
  resize();
  requestAnimationFrame(draw);
})();
