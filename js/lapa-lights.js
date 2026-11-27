// Lapa lights (27 Nov redo): Edison bulbs hanging from a thatch edge over the weekly-rhythm section.
// All off when the section first shows; they warm up one by one as it scrolls into view, and go out again on the way back.
(function () {
  'use strict';
  var host = document.getElementById('lapaLights'), sec = document.getElementById('nights');
  if (!host || !sec) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var N = innerWidth < 640 ? 5 : 9, drops = [62, 96, 74, 110, 68, 100, 80, 92, 70];
  var bulb = function (i) {
    var len = drops[i % drops.length];
    return '<span class="pd" style="--x:' + ((i + 0.5) / N * 100).toFixed(2) + '%;--len:' + len + 'px">' +
      '<svg viewBox="0 0 40 ' + (len + 64) + '" width="40" height="' + (len + 64) + '">' +
      '<line x1="20" y1="0" x2="20" y2="' + len + '" stroke="#1a120c" stroke-width="2"/>' +
      '<rect x="14" y="' + len + '" width="12" height="11" rx="2" fill="#6b4a26"/>' +
      '<rect x="14" y="' + (len + 3) + '" width="12" height="1.5" fill="#a87a43"/>' +
      '<path class="pd-glass" d="M15 ' + (len + 11) + ' C15 ' + (len + 20) + ' 6 ' + (len + 26) + ' 6 ' + (len + 40) + ' A14 14 0 0 0 34 ' + (len + 40) + ' C34 ' + (len + 26) + ' 25 ' + (len + 20) + ' 25 ' + (len + 11) + ' Z"/>' +
      '<path class="pd-fil" d="M17 ' + (len + 14) + ' L17 ' + (len + 34) + ' L20 ' + (len + 29) + ' L23 ' + (len + 34) + ' L23 ' + (len + 14) + '" fill="none" stroke-width="1.3" stroke-linejoin="round"/>' +
      '</svg><span class="pd-glow"></span></span>';
  };
  var html = '<span class="thatch"></span>';
  for (var i = 0; i < N; i++) html += bulb(i);
  host.innerHTML = html;
  var bulbs = [].slice.call(host.querySelectorAll('.pd'));
  var order = bulbs.map(function (_, i) { return i; }).sort(function (a, b) { return Math.abs(a - (N - 1) / 2) - Math.abs(b - (N - 1) / 2); }); // middle out

  function update() {
    var r = sec.getBoundingClientRect(), vh = innerHeight;
    // 0 when the section's top meets the bottom of the screen, 1 once its top is 30% down the screen
    var p = reduce ? (r.top < vh ? 1 : 0) : Math.max(0, Math.min(1, (vh - r.top - 60) / (vh * 0.55)));
    var lit = Math.floor(p * (N + 0.999));
    order.forEach(function (idx, k) { bulbs[idx].classList.toggle('on', k < lit); });
    sec.style.setProperty('--lit', (lit / N).toFixed(3));
  }
  var ticking = false;
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; update(); }); } }, { passive: true });
  addEventListener('resize', update);
  update();
})();
