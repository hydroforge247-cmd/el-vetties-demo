// NFC house layer: branded loader (waits for every photo + fonts + page load) and the day/night switch.
(function () {
  var d = document.documentElement;

  /* ---------- Loader (27 Nov redo, all code, no video) ----------
     Side view of the range: a small club strikes the ball, the ball flies past the 50-200 m boards.
     Its flight IS the load progress: it never runs ahead of what has loaded, and lands past the last board at 100%. */
  var ld = document.getElementById('ld');
  if (!ld) { d.classList.remove('ld-on'); }
  else {
    var pct = ld.querySelector('.ld-pct'), cv = ld.querySelector('.ld-range'), g = cv && cv.getContext('2d');
    var reduce = false; // owner's call 27 Nov: this site's motion is small and visitor-started, so it plays for everyone (phones on battery saver report reduced motion)
    var urls = [];
    document.querySelectorAll('img').forEach(function (im) {
      var u = im.currentSrc || im.src || im.getAttribute('data-src');
      if (u && urls.indexOf(u) < 0) urls.push(u);
    });
    var total = urls.length + 2, done = 0, target = 0, shown = 0; // +2: fonts and window load
    function tick() { done++; target = Math.min(1, done / total); }
    urls.forEach(function (u) {
      var im = new Image();
      im.onload = function () { (im.decode ? im.decode() : Promise.resolve()).catch(function () {}).then(tick); };
      im.onerror = tick; // a broken photo must not block the visitor
      im.src = u;
    });
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(tick, tick);
    if (document.readyState === 'complete') tick(); else addEventListener('load', tick, { once: true });
    var safety = setTimeout(function () { target = 1; }, 60000); // broken connections only

    var W = 0, H = 0, t0 = performance.now(), swingEnd = 0.55, landedAt = 0, finished = false;
    function size() {
      var dpr = Math.min(devicePixelRatio || 1, 2);
      W = cv.clientWidth * dpr; H = cv.clientHeight * dpr; cv.width = W; cv.height = H;
    }
    function night() { return d.dataset.theme === 'night'; }
    var TEE = 0.09, END = 0.93; // ground x as a share of the width: tee, and just past the 200 m board
    function ballAt(p) {
      return { x: (TEE + (END - TEE) * p) * W, y: H * 0.78 - Math.sin(Math.min(1, p) * Math.PI) * H * 0.5 };
    }
    function draw(now) {
      var n = night(), gy = H * 0.78, u = H / 160;
      var sky = g.createLinearGradient(0, 0, 0, gy);
      sky.addColorStop(0, n ? '#0b1730' : '#8fc4e8'); sky.addColorStop(1, n ? '#2a3a55' : '#e8f2e4');
      g.fillStyle = sky; g.fillRect(0, 0, W, gy);
      g.fillStyle = n ? '#163d24' : '#3f9a4c'; g.fillRect(0, gy, W, H - gy); // fairway
      for (var i = 0; i < 9; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)'; g.fillRect(i * W / 9, gy, W / 9, H - gy); }
      g.fillStyle = n ? '#0f2a19' : '#2f7a3b'; g.fillRect(0, gy, W, 2 * u);
      [50, 100, 150, 200].forEach(function (m) { // distance boards
        var bx = (TEE + (END - TEE) * (m / 214)) * W, bw = 20 * u, bh = 12 * u, by = gy - 30 * u;
        g.fillStyle = n ? '#9aa49e' : '#ffffff'; g.fillRect(bx - 0.8 * u, by + bh, 1.6 * u, 18 * u);
        g.fillRect(bx - bw / 2 - 0.8 * u, by - 0.8 * u, bw + 1.6 * u, bh + 1.6 * u);
        g.fillStyle = n ? '#1c2a22' : '#0C2618'; g.fillRect(bx - bw / 2, by, bw, bh);
        g.fillStyle = n ? '#FFE099' : '#ffffff'; g.font = '700 ' + Math.round(7.5 * u) + 'px Oswald, Impact, sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(m), bx, by + bh / 2 + 0.5 * u);
      });
      var t = (now - t0) / 1000;
      // club: pivots at the hands above the tee, swings once (back, through the ball), then holds its finish
      var tx = TEE * W, hx = tx - 9 * u, hy = gy - 40 * u, L = 41 * u, a0 = Math.atan2(39.5, 10.5), a = a0;
      if (!reduce) {
        if (t < 0.35) a = a0 + 1.9 * (1 - Math.pow(1 - t / 0.35, 2));
        else if (t < swingEnd) { var f = (t - 0.35) / (swingEnd - 0.35); a = a0 + 1.9 - 1.9 * f * f; }
        else a = a0 - 1.5 * Math.min(1, (t - swingEnd) / 0.22);
      }
      var ex = hx + Math.cos(a) * L, ey = hy + Math.sin(a) * L;
      g.lineCap = 'round'; g.strokeStyle = n ? '#c7d0d6' : '#5d6870'; g.lineWidth = 1.8 * u;
      g.beginPath(); g.moveTo(hx, hy); g.lineTo(ex, ey); g.stroke();
      g.strokeStyle = '#141a16'; g.lineWidth = 3.4 * u;
      g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + Math.cos(a) * 9 * u, hy + Math.sin(a) * 9 * u); g.stroke();
      g.save(); g.translate(ex, ey); g.rotate(a - Math.PI / 2); g.fillStyle = n ? '#e9eef1' : '#aeb8bf';
      g.beginPath(); g.moveTo(-2 * u, -1.5 * u); g.lineTo(7 * u, -0.5 * u); g.quadraticCurveTo(9 * u, 2 * u, 6.5 * u, 3.8 * u); g.lineTo(-2.5 * u, 3 * u); g.closePath(); g.fill();
      g.restore();
      g.fillStyle = '#E8AE38'; g.fillRect(tx - 0.8 * u, gy - 3 * u, 1.6 * u, 4 * u); // tee peg
      // ball: waits on the tee until the club arrives, then flies only as far as loading allows
      var p = (reduce || t >= swingEnd) ? shown : 0, b = ballAt(p), br = 3.2 * u;
      if (p > 0.004) {
        g.strokeStyle = n ? 'rgba(255,224,153,.75)' : 'rgba(255,255,255,.85)'; g.lineWidth = 1.4 * u; g.beginPath();
        for (var s = 0; s <= 40; s++) { var q = ballAt(p * s / 40); if (s) g.lineTo(q.x, q.y - br); else g.moveTo(q.x, q.y - br); }
        g.stroke();
      }
      g.fillStyle = 'rgba(0,0,0,.25)';
      g.beginPath(); g.ellipse(b.x, gy + 1.2 * u, br * (1 - Math.sin(p * Math.PI) * 0.5), br * 0.35, 0, 0, 7); g.fill();
      g.fillStyle = '#ffffff'; if (n) { g.shadowColor = 'rgba(255,240,200,.9)'; g.shadowBlur = 10 * u; }
      g.beginPath(); g.arc(b.x, b.y - br, br, 0, 7); g.fill(); g.shadowBlur = 0;
    }
    function frame(now) {
      if (reduce || (now - t0) / 1000 >= swingEnd) { shown += (target - shown) * 0.07; if (target - shown < 0.003) shown = target; }
      pct.textContent = Math.round(shown * 100) + '%';
      if (g && W) draw(now);
      if (shown >= 1 && !landedAt) landedAt = now;
      if (landedAt && now - landedAt > 450 && !finished) { finished = true; clearTimeout(safety); finish(); return; }
      requestAnimationFrame(frame);
    }
    if (g) { size(); addEventListener('resize', size); }
    requestAnimationFrame(frame);
    function finish() {
      ld.classList.add('ld-out'); d.classList.remove('ld-on');
      setTimeout(function () { ld.remove(); }, 700);
    }
  }

  /* ---------- Day / night ---------- */
  var btn = document.getElementById('themeBtn');
  if (!btn) return;
  function label() {
    var isNight = d.dataset.theme === 'night';
    btn.setAttribute('aria-pressed', String(isNight));
    btn.setAttribute('aria-label', isNight ? 'Switch to day mode' : 'Switch to night mode');
  }
  label();
  btn.addEventListener('click', function () {
    var next = d.dataset.theme === 'night' ? 'day' : 'night';
    function apply() { d.dataset.theme = next; label(); try { localStorage.setItem('ev-theme', next); } catch (e) {} }
    if (!document.startViewTransition) {
      d.classList.add('theme-fade'); apply();
      setTimeout(function () { d.classList.remove('theme-fade'); }, 450);
      return;
    }
    var r = btn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    var rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(apply).ready.then(function () {
      d.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + rad + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 700, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' });
    });
  });
})();
