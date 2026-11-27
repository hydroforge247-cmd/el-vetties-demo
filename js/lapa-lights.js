// Lapa lights (27 Nov redo): Edison bulbs hanging from a thatch edge over the weekly-rhythm section.
// All off when the section first shows; they warm up one by one as it scrolls into view, and go out again on the way back.
(function () {
  'use strict';
  var host = document.getElementById('lapaLights'), sec = document.getElementById('nights');
  if (!host || !sec) return;
  var reduce = false; // owner's call 27 Nov: this site's motion is small and visitor-started, so it plays for everyone (phones on battery saver report reduced motion)
  var phone = innerWidth < 640, N = phone ? 5 : 9, drops = [62, 96, 74, 110, 68, 100, 80, 92, 70].map(function (d) { return Math.round(d * (phone ? 0.6 : 1)); });
  // the strip is as tall as the longest cord + bulb + an even gap above the heading (user: a bulb sat too close to the words)
  host.style.height = (14 + Math.max.apply(null, drops.slice(0, N)) + 54 + (phone ? 40 : 52)) + 'px';
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
  var cards = [].slice.call(sec.querySelectorAll('.night-card'));
  var order = bulbs.map(function (_, i) { return i; }).sort(function (a, b) { return Math.abs(a - (N - 1) / 2) - Math.abs(b - (N - 1) / 2); }); // middle out

  // bulbs come on (or go off) one at a time toward the scroll target, so a fast flick never switches them all at once
  var target = 0, shown = 0, timer = null;
  function step() {
    if (timer || shown === target) return;
    shown += target > shown ? 1 : -1;
    order.forEach(function (idx, k) { bulbs[idx].classList.toggle('on', k < shown); });
    sec.style.setProperty('--lit', (shown / N).toFixed(3));
    timer = setTimeout(function () { timer = null; step(); }, 230);
  }
  function update() {
    var r = sec.getBoundingClientRect(), vh = innerHeight;
    // 0 when the section's top meets the bottom of the screen, 1 once its top is 30% down the screen
    var p = reduce ? (r.top < vh ? 1 : 0) : Math.max(0, Math.min(1, (vh - r.top - 40) / (vh * 0.8)));
    target = Math.floor(p * (N + 0.999)); step();
    // each card warms up once its top is well into the screen (user 27 Nov: the lower cards never lit)
    cards.forEach(function (c) { c.classList.toggle('lit', reduce || c.getBoundingClientRect().top < vh * 0.82); });
  }
  var ticking = false;
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; update(); }); } }, { passive: true });
  addEventListener('resize', update);
  update();
})();
