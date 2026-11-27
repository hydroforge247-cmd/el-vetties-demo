// Hero golf balls (27 Nov redo): range balls drop onto the lawn behind the hero copy and roll to rest.
// The pointer flicks them, a tap on open space drops another. Calm: everything settles and the loop sleeps.
(function () {
  'use strict';
  var hero = document.getElementById('home'), cv = document.getElementById('heroBalls');
  if (!hero || !cv) return;
  // user 27 Nov: the balls must move on phones with reduced motion switched on too; they only move on the drop-in, a tap or a scroll
  var g = cv.getContext('2d'), reduce = false;
  var W = 0, H = 0, dpr = 1, floor = 0, balls = [], MAX = 60, running = false, last = 0;
  var ptr = { x: -1e4, y: -1e4, vx: 0, vy: 0, t: 0 };

  var sprites = {}; // one pre-drawn ball per size bucket: shading + dimples, cheap to blit
  // user 27 Nov: the same photo-real ball as the day/night switch; the photo turns as it rolls,
  // a fixed light layer on top keeps the sun on the same side
  var photo = new Image(); photo.src = 'img/golf-ball.webp'; photo.onload = function () { sprites = {}; draw(); };
  function sprite(r) { // fixed light: soft highlight top-left, shade bottom-right
    var k = Math.round(r * dpr); if (sprites[k]) return sprites[k];
    var c = document.createElement('canvas'), s = k * 2 + 4; c.width = c.height = s;
    var x = c.getContext('2d'), m = s / 2;
    var sh = x.createRadialGradient(m - k * 0.38, m - k * 0.42, k * 0.05, m, m, k * 1.02);
    sh.addColorStop(0, 'rgba(255,255,255,.55)'); sh.addColorStop(0.35, 'rgba(255,255,255,0)');
    sh.addColorStop(0.75, 'rgba(40,50,45,.08)'); sh.addColorStop(1, 'rgba(30,40,35,.42)');
    x.fillStyle = sh; x.beginPath(); x.arc(m, m, k, 0, 7); x.fill();
    return (sprites[k] = c);
  }

  function size() {
    var r = hero.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2); sprites = {};
    W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr;
    floor = H - Math.max(18, H * 0.04);
    balls.forEach(function (b) { b.x = Math.min(W - b.r, Math.max(b.r, b.x)); b.y = Math.min(b.y, floor - b.r); b.sleep = false; });
    wake();
  }
  function add(x, y, vx) {
    if (balls.length >= MAX) balls.shift();
    var r = (W < 640 ? 9 : 12) + Math.random() * (W < 640 ? 6 : 9);
    balls.push({ x: x, y: y, vx: vx || (Math.random() - 0.5) * 120, vy: 0, r: r, rot: Math.random() * 6, sleep: false });
    if (reduce) { var b = balls[balls.length - 1]; b.y = floor - b.r; b.vx = 0; }
    wake();
  }

  function step(dt) {
    var awake = false, i, j, b;
    for (i = 0; i < balls.length; i++) {
      b = balls[i]; if (b.sleep) continue;
      b.vy += 1500 * dt;
      var dx = b.x - ptr.x, dy = b.y - ptr.y, dd = Math.hypot(dx, dy), reach = b.r + 34;
      if (dd < reach && performance.now() - ptr.t < 120) { // flick: the pointer pushes the ball along its own motion
        b.vx += ptr.vx * 0.55 + (dx / (dd || 1)) * 140; b.vy += Math.min(0, ptr.vy * 0.4) - 160;
      }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y > floor - b.r) { b.y = floor - b.r; b.vy = Math.abs(b.vy) > 90 ? -b.vy * 0.42 : 0; b.vx *= Math.pow(0.32, dt); }
      if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.6; }
      if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx) * 0.6; }
      b.vx = Math.max(-1400, Math.min(1400, b.vx));
      b.rot += b.vx / b.r * dt;
    }
    for (i = 0; i < balls.length; i++) for (j = i + 1; j < balls.length; j++) { // ball-on-ball
      var a = balls[i], c = balls[j], ex = c.x - a.x, ey = c.y - a.y, d = Math.hypot(ex, ey), min = a.r + c.r;
      if (d > 0 && d < min) {
        var nx = ex / d, ny = ey / d, push = (min - d) / 2;
        a.x -= nx * push; a.y -= ny * push; c.x += nx * push; c.y += ny * push;
        var rel = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
        if (rel < 0) { var imp = -rel * 0.9; a.vx -= nx * imp * c.r / min; a.vy -= ny * imp * c.r / min; c.vx += nx * imp * a.r / min; c.vy += ny * imp * a.r / min; }
        a.sleep = c.sleep = false;
      }
    }
    for (i = 0; i < balls.length; i++) {
      b = balls[i];
      if (!b.sleep && b.y >= floor - b.r - 0.5 && Math.abs(b.vx) < 6 && Math.abs(b.vy) < 6) { b.vx = b.vy = 0; b.sleep = true; }
      if (!b.sleep) awake = true;
    }
    return awake;
  }
  function draw() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    var night = document.documentElement.dataset.theme === 'night';
    balls.forEach(function (b) {
      var lift = Math.max(0, floor - b.r - b.y);
      g.fillStyle = 'rgba(0, 0, 0, ' + (0.32 * Math.max(0.25, 1 - lift / 300)).toFixed(3) + ')';
      g.beginPath(); g.ellipse(b.x + 2, floor - 1, b.r * (1 - Math.min(0.5, lift / 600)), b.r * 0.28, 0, 0, 7); g.fill();
      if (night) { g.save(); g.shadowColor = 'rgba(255, 240, 200, .8)'; g.shadowBlur = b.r; }
      g.save(); g.translate(b.x, b.y); g.rotate(b.rot);
      if (photo.complete && photo.naturalWidth) g.drawImage(photo, -b.r * 1.02, -b.r * 1.02, b.r * 2.04, b.r * 2.04);
      else { g.fillStyle = '#f4f6f3'; g.beginPath(); g.arc(0, 0, b.r, 0, 7); g.fill(); }
      g.restore();
      var s = sprite(b.r); g.drawImage(s, b.x - s.width / 2 / dpr, b.y - s.height / 2 / dpr, s.width / dpr, s.height / dpr);
      if (night) g.restore();
    });
  }
  function frame(now) {
    var dt = Math.min(0.033, (now - (last || now)) / 1000); last = now;
    var awake = step(dt / 2) | step(dt / 2); // two sub-steps keep stacks from jittering
    draw();
    if (awake && visible) requestAnimationFrame(frame); else { running = false; last = 0; }
  }
  var visible = true;
  function wake() {
    if (reduce) { draw(); return; }
    balls.forEach(function (b) { if (b.y < floor - b.r - 0.5) b.sleep = false; });
    if (!running && visible) { running = true; requestAnimationFrame(frame); }
  }

  hero.addEventListener('pointermove', function (e) {
    var r = hero.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, now = performance.now(), dt = Math.max(8, now - ptr.t);
    ptr.vx = (x - ptr.x) / dt * 1000; ptr.vy = (y - ptr.y) / dt * 1000; ptr.x = x; ptr.y = y; ptr.t = now;
    if (Math.abs(ptr.vx) > 2000 || Math.abs(ptr.vy) > 2000) { ptr.vx = ptr.vy = 0; } // first move after entering
    balls.forEach(function (b) { if (Math.hypot(b.x - x, b.y - y) < b.r + 40) b.sleep = false; });
    wake();
  }, { passive: true });
  var down = null;
  hero.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY }; }, { passive: true });
  hero.addEventListener('pointerup', function (e) { // a tap on open lawn (not a button or the text box) drops a ball
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10) return;
    if (e.target.closest('a, button, .hero-sub, h1, .status-pill')) return;
    var r = hero.getBoundingClientRect(); add(e.clientX - r.left, Math.max(0, e.clientY - r.top - 20));
  });

  // scroll bounce: a quick swipe up or down kicks the balls into the air; they settle once the scrolling stops
  var lastY = scrollY;
  addEventListener('scroll', function () {
    var dy = scrollY - lastY; lastY = scrollY;
    if (!visible || Math.abs(dy) < 3) return;
    var kick = Math.min(950, Math.abs(dy) * 16);
    balls.forEach(function (b) {
      if (b.y < floor - b.r - 40) return; // already flying
      b.vy -= kick * (0.55 + Math.random() * 0.6); b.vx += (Math.random() - 0.5) * kick * 0.6; b.sleep = false;
    });
    wake();
  }, { passive: true });

  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) wake(); }).observe(hero);
  addEventListener('resize', size);
  size();
  // the first bucket tips out once the loader has gone
  function start() {
    for (var i = 0; i < (W < 640 ? 14 : 24); i++) (function (i) {
      setTimeout(function () { add(W * (0.08 + Math.random() * 0.84), -30 - Math.random() * 60); }, reduce ? 0 : i * 140);
    })(i);
  }
  if (document.documentElement.classList.contains('ld-on')) {
    new MutationObserver(function (m, o) { if (!document.documentElement.classList.contains('ld-on')) { o.disconnect(); start(); } })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  } else start();
})();
