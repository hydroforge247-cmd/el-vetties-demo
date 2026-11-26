// NFC house layer: branded loader (waits for every photo + fonts + page scripts) and the day/night switch.
(function () {
  var d = document.documentElement;

  /* ---------- Loader ---------- */
  var ld = document.getElementById('ld');
  if (ld) {
    var pct = ld.querySelector('.ld-pct'), ball = ld.querySelector('.ld-ball'), shown = 0, target = 0, finished = false;
    var urls = [];
    document.querySelectorAll('img').forEach(function (im) {
      var u = im.currentSrc || im.src || im.getAttribute('data-src');
      if (u && urls.indexOf(u) < 0) urls.push(u);
    });
    var total = urls.length + 2, done = 0; // +2: fonts and window load
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
    (function frame() {
      shown += (target - shown) * 0.12;
      if (target - shown < 0.004) shown = target;
      pct.textContent = Math.round(shown * 100) + '%';
      ball.style.setProperty('--p', shown.toFixed(3));
      if (shown >= 1 && !finished) { finished = true; clearTimeout(safety); finish(); return; }
      if (!finished) requestAnimationFrame(frame);
    })();

    function finish() {
      ld.classList.add('ld-sink');                                // ball drops in the cup
      setTimeout(function () {
        ld.classList.add('ld-out'); d.classList.remove('ld-on');
        setTimeout(function () { ld.remove(); }, 700);
      }, 650);
    }
  } else d.classList.remove('ld-on');

  /* ---------- Day / night ---------- */
  var btn = document.getElementById('themeBtn');
  if (!btn) return;
  function label() {
    var night = d.dataset.theme === 'night';
    btn.setAttribute('aria-pressed', String(night));
    btn.setAttribute('aria-label', night ? 'Switch to day mode' : 'Switch to night mode');
  }
  label();
  btn.addEventListener('click', function () {
    var next = d.dataset.theme === 'night' ? 'day' : 'night';
    function apply() { d.dataset.theme = next; label(); try { localStorage.setItem('ev-theme', next); } catch (e) {} }
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduce) {
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
