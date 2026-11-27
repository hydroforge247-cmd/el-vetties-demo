// Range game (27 Nov redo): 2D canvas on EL'Vetties' real range photo (img/range.webp), no three.js.
// Same controls as before: club, aim, Highveld wind, sweet-spot needle, swing button or swipe up from the ball,
// Dusk Lights and Aerial View. Distances are game distances drawn in the photo's perspective, not a survey.
(function () {
  'use strict';
  var canvas = document.getElementById('pitCanvas');
  if (!canvas) return;
  var g = canvas.getContext('2d');
  var $ = function (id) { return document.getElementById(id); };
  var stageTitle = $('stageTitle'), stageSub = $('stageSub'), panelTitle = $('panelTitle'), panelDesc = $('panelDesc');
  var telCarry = $('telCarry'), telApex = $('telApex'), telScore = $('telScore'), telBucket = $('telBucket');
  var aimReadout = $('aimReadout'), pitWaCta = $('pitWaCta'), pitProgFill = $('pitProgFill');
  var powerNeedle = $('powerNeedle'), powerPct = $('powerPct'), swingBtn = $('swingBtn');
  var camBtn = $('camBtn'), duskBtn = $('duskBtn'), teePad = $('teePad');
  var stepChips = document.querySelectorAll('#stepChips .step-chip');
  var reduce = false; // owner's call 27 Nov: this site's motion is small and visitor-started, so it plays for everyone (phones on battery saver report reduced motion)

  var CLUBS = [
    { name: 'Wedge · 50m', dist: 50, lat: -6, peak: 18, hex: '#FFE099' },
    { name: '8-Iron · 100m', dist: 100, lat: 5, peak: 28, hex: '#F08A4B' },
    { name: '5-Iron · 150m', dist: 150, lat: -5, peak: 36, hex: '#E8AE38' },
    { name: 'Driver · 200m', dist: 200, lat: 4, peak: 44, hex: '#4ADE80' }
  ];
  var activeClub = 1, aimDeg = 0, windMps = 4.5, totalScore = 0, bucketLeft = 12;
  var aerial = false, dusk = document.documentElement.dataset.theme === 'night';
  var needlePhase = 0, needleSigned = 0, needleVal = 0.98;
  var shot = null, landed = []; // landed: {d, lat} of finished shots for the aerial map

  // ---- photo + perspective (image pixels of range.webp, 1920x1014) ----
  var photo = new Image(); photo.src = 'img/range.webp';
  var IW = 1920, IH = 1014, VPX = 600, VPY = 345, TEEX = 700, Y200 = 470, C = 0.022;
  var W = 0, H = 0, dpr = 1, s = 1, ox = 0, oy = 0, teeY = 0, yTeeImg = 0, unit = 1;

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var cw = canvas.clientWidth || 760, ch = canvas.clientHeight || 430;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    W = canvas.width; H = canvas.height; unit = H / 430;
    s = Math.max(W / IW, H / IH);
    ox = Math.min(0, Math.max(W - IW * s, W / 2 - TEEX * s));
    oy = (H - IH * s) * 0.75;
    teeY = H - Math.max(30 * dpr, H * 0.1);
    yTeeImg = (teeY - oy) / s;
    if (teePad) { teePad.style.bottom = 'auto'; teePad.style.top = (canvas.offsetTop + teeY / dpr - 70) + 'px'; } // the swipe pad sits on the ball
    if (!running) draw();
  }

  // world (d metres downrange, lat metres right, h metres up) -> canvas px
  function proj(d, lat, h) {
    // the photo is shot from above the tee line, so a plain pinhole squeezes 50-200 m into the horizon; a 0.62 power curve
    // keeps the four flags spread from the tee (bottom) to the far boards (Y200)
    var yImg = Math.max(VPY + 18, yTeeImg - (yTeeImg - Y200) * Math.pow(Math.max(0, d) / 200, 0.62));
    var k = (yImg - VPY) / (yTeeImg - VPY);
    var xImg = VPX + (TEEX - VPX) * k + lat * (yImg - VPY) * C;
    var hImg = (h || 0) * (yImg - VPY) * C * 0.6;
    return { x: ox + xImg * s, y: oy + (yImg - hImg) * s, k: k };
  }

  function setStep(i) {
    stepChips.forEach(function (c, n) { c.classList.toggle('active', n === i); c.classList.toggle('done', n < i); });
    if (pitProgFill) pitProgFill.style.width = Math.min(100, (i + 1) * 20) + '%';
  }
  function aimLabel() {
    if (!aimReadout) return;
    var w = windMps >= 0 ? 'WIND ' + Math.abs(windMps).toFixed(0) + '→' : '←' + Math.abs(windMps).toFixed(0) + ' WIND';
    aimReadout.textContent = 'AIM ' + (aimDeg === 0 ? '0°' : (aimDeg > 0 ? '+' : '') + aimDeg + '°') + ' · ' + w;
  }
  function say(t, sub, pt, pd) {
    if (stageTitle && t) stageTitle.textContent = t; if (stageSub && sub) stageSub.textContent = sub;
    if (panelTitle && pt) panelTitle.textContent = pt; if (panelDesc && pd) panelDesc.textContent = pd;
  }
  function aimLat(dist) { return Math.tan(aimDeg * Math.PI / 180) * dist * 0.72; }

  // ---- drawing ----
  function drawPhoto() {
    g.fillStyle = '#5b8a3a'; g.fillRect(0, 0, W, H);
    if (photo.complete && photo.naturalWidth) g.drawImage(photo, ox, oy, IW * s, IH * s);
  }
  function drawDusk() {
    g.save();
    g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgb(70, 84, 128)'; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    var sky = g.createLinearGradient(0, 0, 0, oy + VPY * s);
    sky.addColorStop(0, 'rgba(8, 16, 40, .55)'); sky.addColorStop(1, 'rgba(230, 120, 60, .22)');
    g.fillStyle = sky; g.fillRect(0, 0, W, oy + VPY * s);
    g.globalCompositeOperation = 'lighter';
    [[1210, 590, 150, 'rgba(255, 190, 90, .55)'], [760, 980, 520, 'rgba(255, 236, 190, .22)']].forEach(function (L) {
      var x = ox + L[0] * s, y = oy + L[1] * s, r = L[2] * s;
      var rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, L[3]); rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
    });
    g.restore();
  }
  function drawTargets(t) {
    CLUBS.forEach(function (c, i) {
      var on = i === activeClub, p = proj(c.dist, c.lat, 0);
      var rx = 7 * (C * (p.y / s - oy / s - VPY)) * s * 1.0; // 7 m ring in perspective
      g.save(); g.globalAlpha = on ? 1 : 0.55;
      g.strokeStyle = c.hex; g.lineWidth = Math.max(1.5, 2.5 * unit);
      g.beginPath(); g.ellipse(p.x, p.y, Math.max(6, rx), Math.max(2.5, rx * 0.28), 0, 0, Math.PI * 2); g.stroke();
      var top = proj(c.dist, c.lat, 9);
      g.strokeStyle = '#fdfbf4'; g.lineWidth = Math.max(1, 1.6 * unit);
      g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(top.x, top.y); g.stroke();
      var fw = Math.max(9, (top.y - p.y) * -0.55), wave = reduce ? 0 : Math.sin(t * 4 + i) * fw * 0.12;
      g.fillStyle = c.hex; g.beginPath(); g.moveTo(top.x, top.y);
      g.quadraticCurveTo(top.x + fw * 0.5, top.y + fw * 0.12 + wave, top.x + fw, top.y + fw * 0.18);
      g.lineTo(top.x, top.y + fw * 0.42); g.closePath(); g.fill();
      // our own yardage board left of each flag (user 27 Nov: the photo's boards were edited out): two posts, a white board, the number
      g.globalAlpha = 1;
      var L = c.lat - 11.5, R = c.lat - 4, tl = proj(c.dist, L, 6), br = proj(c.dist, R, 2.4);
      var bw = br.x - tl.x, bh = br.y - tl.y, minH = 17 * unit;
      if (bh < minH) { var k = minH / bh, cx = (tl.x + br.x) / 2, cy = (tl.y + br.y) / 2; bw *= k; bh = minH; tl = { x: cx - bw / 2, y: cy - bh / 2 }; br = { x: cx + bw / 2, y: cy + bh / 2 }; }
      var pl = proj(c.dist, L + 0.6, 0), pr = proj(c.dist, R - 0.6, 0);
      g.strokeStyle = '#e9ece8'; g.lineWidth = Math.max(1, bw * 0.05);
      g.beginPath(); g.moveTo(tl.x + bw * 0.12, br.y); g.lineTo(tl.x + bw * 0.12, Math.max(pl.y, br.y)); g.moveTo(br.x - bw * 0.12, br.y); g.lineTo(br.x - bw * 0.12, Math.max(pr.y, br.y)); g.stroke();
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(tl.x + 1.5 * unit, tl.y + 1.5 * unit, bw, bh);
      g.fillStyle = '#fbfaf5'; g.fillRect(tl.x, tl.y, bw, bh);
      g.strokeStyle = on ? c.hex : '#26302a'; g.lineWidth = Math.max(1.2, bh * (on ? 0.12 : 0.07)); g.strokeRect(tl.x, tl.y, bw, bh);
      g.fillStyle = '#0C2618'; g.font = '700 ' + Math.round(bh * 0.66) + 'px Oswald, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(c.dist), tl.x + bw / 2, tl.y + bh * 0.54); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.restore();
    });
  }
  function roundRect(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  function flightAt(sh, u) { // world position along a shot at 0..1
    return { d: sh.dist * u, lat: sh.aim * u + sh.drift * u * u, h: sh.peak * Math.sin(u * Math.PI) };
  }
  function drawAimArc() {
    var c = CLUBS[activeClub], sh = { dist: c.dist, aim: aimLat(c.dist), drift: windMps * 0.85, peak: c.peak };
    g.save(); g.setLineDash([4 * unit, 7 * unit]); g.strokeStyle = 'rgba(255, 224, 153, .75)'; g.lineWidth = Math.max(1.2, 2 * unit);
    g.beginPath();
    for (var i = 0; i <= 30; i++) { var w = flightAt(sh, i / 30), p = proj(w.d, w.lat, w.h); i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); }
    g.stroke(); g.restore();
  }
  function ballR(k) { return (2.2 + 8.5 * Math.max(0, Math.min(1.2, k))) * unit; }
  function drawBall(d, lat, h) {
    var gp = proj(d, lat, 0), bp = proj(d, lat, h), r = ballR(gp.k);
    g.fillStyle = 'rgba(10, 30, 12, .35)'; // shadow on the grass
    g.beginPath(); g.ellipse(gp.x, gp.y, r * 1.1, r * 0.38, 0, 0, Math.PI * 2); g.fill();
    if (dusk) { var gl = g.createRadialGradient(bp.x, bp.y, 0, bp.x, bp.y, r * 4); gl.addColorStop(0, 'rgba(255,250,220,.55)'); gl.addColorStop(1, 'rgba(255,250,220,0)'); g.fillStyle = gl; g.fillRect(bp.x - r * 4, bp.y - r * 4, r * 8, r * 8); }
    var rg = g.createRadialGradient(bp.x - r * 0.35, bp.y - r * 0.4, r * 0.1, bp.x, bp.y, r);
    rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.7, '#eef1ef'); rg.addColorStop(1, '#b9c2bd');
    g.fillStyle = rg; g.beginPath(); g.arc(bp.x, bp.y, r, 0, Math.PI * 2); g.fill();
    if (r > 5) { // dimples read at the tee
      g.fillStyle = 'rgba(120, 135, 128, .35)';
      for (var i = 0; i < 7; i++) { var a = i * 0.9 + 0.4, rr = r * (i % 2 ? 0.45 : 0.62); g.beginPath(); g.arc(bp.x + Math.cos(a) * rr, bp.y + Math.sin(a) * rr, r * 0.09, 0, Math.PI * 2); g.fill(); }
    }
  }
  function drawTee() {
    var p = proj(0, 0, 0), r = ballR(p.k);
    g.fillStyle = 'rgba(20, 26, 22, .55)'; // rubber mat
    g.beginPath(); g.ellipse(p.x, p.y + r * 0.6, r * 4.5, r * 1.3, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#E8AE38'; g.fillRect(p.x - r * 0.22, p.y - r * 0.2, r * 0.44, r * 1.1); // tee peg
  }
  // Club: hands above-left of the ball, a steel shaft and an iron head, swinging in the photo's plane
  var A0 = Math.atan2(0.86, 0.5); // address: head down-right of the hands, resting on the ball
  function clubAngle(t) { // t in seconds since the swing started; returns [angle, impactPassed]
    if (t < 0) return A0 + (reduce ? 0 : Math.sin(perfT * 1.6) * 0.03);
    var BACK = A0 + 2.7;
    if (t < 0.55) { var e = 1 - Math.pow(1 - t / 0.55, 2); return A0 + (BACK - A0) * e; }
    if (t < 0.7) { var f = (t - 0.55) / 0.15; return BACK - (BACK - A0) * f * f; }
    if (t < 0.95) { var q = (t - 0.7) / 0.25; return A0 - 1.9 * (1 - Math.pow(1 - q, 2)); }
    return A0 - 1.9;
  }
  // Real club shapes (user 27 Nov: "looks like a miniature axe"; the club must change with the choice).
  // len = share of the stage height, w/h = head size in stage units, graphite = driver shaft.
  var KIT = {
    wedge: { len: 0.26, w: 17, h: 12, graphite: false },
    iron: { len: 0.29, w: 19, h: 9, graphite: false },
    driver: { len: 0.34, w: 27, h: 15, graphite: true }
  };
  function clubKind() { return ['wedge', 'iron', 'iron', 'driver'][activeClub]; }
  function drawHead(kind, w, h) { // head frame: heel at the origin, toe to the right (+x), sole down (+y)
    var u = unit;
    if (kind === 'driver') {
      var cg = g.createRadialGradient(w * 0.4 * u, -h * 0.55 * u, 1, w * 0.5 * u, -h * 0.3 * u, w * 0.7 * u);
      cg.addColorStop(0, '#5b6670'); cg.addColorStop(0.45, '#1f262c'); cg.addColorStop(1, '#0b0f12');
      g.fillStyle = cg; g.beginPath();
      g.moveTo(0, -h * 0.35 * u);
      g.bezierCurveTo(w * 0.1 * u, -h * 1.05 * u, w * 1.05 * u, -h * 1.1 * u, w * 1.04 * u, -h * 0.25 * u);
      g.bezierCurveTo(w * 1.03 * u, h * 0.35 * u, w * 0.6 * u, h * 0.45 * u, w * 0.15 * u, h * 0.32 * u);
      g.quadraticCurveTo(-1 * u, h * 0.2 * u, 0, -h * 0.35 * u); g.fill();
      g.strokeStyle = '#c9d2d8'; g.lineWidth = 1.3 * u; // silver face edge along the bottom
      g.beginPath(); g.moveTo(w * 0.12 * u, h * 0.28 * u); g.quadraticCurveTo(w * 0.6 * u, h * 0.42 * u, w * 1.0 * u, -h * 0.05 * u); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1 * u; // crown sheen
      g.beginPath(); g.moveTo(w * 0.25 * u, -h * 0.7 * u); g.quadraticCurveTo(w * 0.55 * u, -h * 0.95 * u, w * 0.85 * u, -h * 0.7 * u); g.stroke();
      return;
    }
    var top = kind === 'wedge' ? -h * 0.95 : -h * 0.75;
    var sg = g.createLinearGradient(0, top * u, 0, h * 0.4 * u);
    sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.45, '#dfe5e9'); sg.addColorStop(0.8, '#a7b1b8'); sg.addColorStop(1, '#6f7a82');
    g.fillStyle = sg; g.beginPath();
    g.moveTo(-0.5 * u, -h * 0.3 * u);
    g.lineTo(w * 0.95 * u, top * u); // top line rises toward the toe
    g.quadraticCurveTo((w + 4) * u, (top + 1) * u, (w + 2.5) * u, h * 0.15 * u); // rounded toe
    g.quadraticCurveTo((w + 1.5) * u, h * 0.42 * u, (w - 2) * u, h * 0.42 * u);
    g.lineTo(1.5 * u, h * 0.42 * u); // sole
    g.quadraticCurveTo(-1.5 * u, h * 0.38 * u, -0.5 * u, -h * 0.3 * u); g.fill();
    g.strokeStyle = 'rgba(55, 64, 70, .55)'; g.lineWidth = 0.8 * u; g.stroke();
    g.strokeStyle = 'rgba(70, 80, 88, .45)'; g.lineWidth = 0.7 * u; // face grooves
    var n = kind === 'wedge' ? 6 : 5;
    for (var i = 0; i < n; i++) {
      var y = h * 0.3 - i * (h * (kind === 'wedge' ? 1.05 : 0.85) / n);
      g.beginPath(); g.moveTo(3 * u, y * u); g.lineTo((w - 3) * u, (y - 1.2) * u); g.stroke();
    }
  }
  function drawClub(t) {
    var k = KIT[clubKind()], b = proj(0, 0, 0), r = ballR(b.k), L = H * k.len, u = unit;
    var fade = t < 1 ? 1 : Math.max(0, 1 - (t - 1) / 0.4); if (!fade) return; // the club leaves once the ball is away
    // address: the head rests just left of the ball, its toe touching it, sole on the grass
    var tx = b.x - (k.w + 2) * u - r * 0.6, ty = b.y + r * 0.55 - k.h * 0.42 * u;
    var hx = tx - L * Math.cos(A0), hy = ty - L * Math.sin(A0); // hands (grip end)
    var a = clubAngle(t), ca = Math.cos(a), sa = Math.sin(a), ex = hx + ca * L, ey = hy + sa * L;
    g.save(); g.globalAlpha = fade; g.lineCap = 'round';
    g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 4 * u; // soft shadow
    g.beginPath(); g.moveTo(hx + 3 * u, hy + 5 * u); g.lineTo(ex + 3 * u, ey + 5 * u); g.stroke();
    // shaft: thin steel (or black graphite for the driver), tapering toward the head
    var sg = g.createLinearGradient(hx - sa * 2, hy + ca * 2, hx + sa * 2, hy - ca * 2);
    if (k.graphite) { sg.addColorStop(0, '#0d1114'); sg.addColorStop(0.5, '#4a5560'); sg.addColorStop(1, '#0d1114'); }
    else { sg.addColorStop(0, '#7d878e'); sg.addColorStop(0.5, '#f4f7f9'); sg.addColorStop(1, '#7d878e'); }
    g.strokeStyle = sg; g.lineWidth = 2.6 * u; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + ca * L * 0.6, hy + sa * L * 0.6); g.stroke();
    g.lineWidth = 1.9 * u; g.beginPath(); g.moveTo(hx + ca * L * 0.6, hy + sa * L * 0.6); g.lineTo(ex, ey); g.stroke();
    g.strokeStyle = '#0f0f0f'; g.lineWidth = 3 * u; // black ferrule + hosel into the head
    g.beginPath(); g.moveTo(ex - ca * 7 * u, ey - sa * 7 * u); g.lineTo(ex - ca * 5.5 * u, ey - sa * 5.5 * u); g.stroke();
    g.strokeStyle = k.graphite ? '#1a2026' : '#c3cbd0'; g.lineWidth = 3.2 * u;
    g.beginPath(); g.moveTo(ex - ca * 5.5 * u, ey - sa * 5.5 * u); g.lineTo(ex, ey); g.stroke();
    // grip: tapered rubber, thicker at the butt, a light wrap line
    var gl = L * 0.26, gx = hx + ca * gl, gy2 = hy + sa * gl;
    g.fillStyle = '#1b1e1c'; g.beginPath();
    g.moveTo(hx - sa * 3.6 * u, hy + ca * 3.6 * u); g.lineTo(gx - sa * 2.4 * u, gy2 + ca * 2.4 * u);
    g.lineTo(gx + sa * 2.4 * u, gy2 - ca * 2.4 * u); g.lineTo(hx + sa * 3.6 * u, hy - ca * 3.6 * u);
    g.arc(hx, hy, 3.6 * u, a - Math.PI / 2, a + Math.PI / 2, true); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 0.8 * u;
    for (var i = 1; i < 6; i++) { var q = gl * i / 6, w = 3.6 - 1.2 * i / 6; g.beginPath(); g.moveTo(hx + ca * q - sa * w * u, hy + sa * q + ca * w * u); g.lineTo(hx + ca * (q + 4 * u) + sa * w * u, hy + sa * (q + 4 * u) - ca * w * u); g.stroke(); }
    g.translate(ex, ey); g.rotate(a - A0); // the head turns with the swing; level with the grass at address
    drawHead(clubKind(), k.w, k.h);
    g.restore();
  }
  function drawTracer(sh, upto) {
    g.save(); g.strokeStyle = 'rgba(255, 240, 179, .9)'; g.lineWidth = Math.max(1.5, 2.4 * unit); g.lineCap = 'round';
    g.shadowColor = 'rgba(255, 214, 102, .8)'; g.shadowBlur = 8 * unit;
    g.beginPath();
    for (var i = 0; i <= 40; i++) { var u = upto * i / 40, w = flightAt(sh, u), p = proj(w.d, w.lat, w.h); i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); }
    g.stroke(); g.restore();
  }
  function drawBurst(sh, k) {
    var p = proj(sh.dist, sh.lat, 0), r = (10 + k * 46) * unit * Math.max(0.4, p.k + 0.3);
    g.save(); g.globalAlpha = Math.max(0, 1 - k); g.strokeStyle = '#FFE099'; g.lineWidth = 2.5 * unit;
    g.beginPath(); g.ellipse(p.x, p.y, r, r * 0.3, 0, 0, Math.PI * 2); g.stroke(); g.restore();
  }
  function drawAerial() { // top-down map: tee at the bottom, the four targets, every ball of this bucket
    g.fillStyle = dusk ? '#0d2a19' : '#2f7d3f'; g.fillRect(0, 0, W, H);
    for (var i = 0; i < 12; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.05)'; g.fillRect(0, i * H / 12, W, H / 12); }
    var m = H * 0.08, scaleY = (H - m * 2) / 215, cx = W / 2, scaleX = scaleY * 1.6;
    function map(d, lat) { return { x: cx + lat * scaleX, y: H - m - d * scaleY }; }
    var fs = Math.round(Math.max(10, 12 * unit)); g.font = '600 ' + fs + 'px Outfit, system-ui, sans-serif';
    CLUBS.forEach(function (c, i) {
      var p = map(c.dist, c.lat);
      g.globalAlpha = i === activeClub ? 1 : 0.6;
      g.fillStyle = 'rgba(38, 146, 75, .9)'; g.beginPath(); g.arc(p.x, p.y, 7 * scaleX, 0, Math.PI * 2); g.fill();
      g.strokeStyle = c.hex; g.lineWidth = 2 * unit; g.beginPath(); g.arc(p.x, p.y, 15 * scaleX, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#fcf9f2'; g.fillText(c.dist + ' m', p.x + 17 * scaleX, p.y + fs * 0.35);
      g.globalAlpha = 1;
    });
    var t = map(0, 0); g.fillStyle = '#E8AE38'; g.fillRect(t.x - 10 * unit, t.y - 4 * unit, 20 * unit, 8 * unit);
    landed.forEach(function (b) { var p = map(b.d, b.lat); g.fillStyle = '#fff'; g.beginPath(); g.arc(p.x, p.y, 3.2 * unit, 0, Math.PI * 2); g.fill(); });
    if (shot && shot.phase !== 'swing') {
      var w = shot.phase === 'flight' ? flightAt(shot, shot.u) : { d: shot.dist + shot.roll * shot.bk, lat: shot.lat };
      var bp = map(w.d, w.lat);
      g.strokeStyle = 'rgba(255,240,179,.8)'; g.lineWidth = 2 * unit; g.beginPath(); g.moveTo(t.x, t.y);
      for (var j = 1; j <= 20; j++) { var q = flightAt(shot, Math.min(shot.phase === 'flight' ? shot.u : 1, 1) * j / 20), pp = map(q.d, q.lat); g.lineTo(pp.x, pp.y); }
      g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(bp.x, bp.y, 5 * unit, 0, Math.PI * 2); g.fill();
    }
  }

  var perfT = 0;
  function draw() {
    if (!W) return;
    if (aerial) { drawAerial(); return; }
    drawPhoto(); if (dusk) drawDusk();
    drawTargets(perfT);
    if (!shot) { drawAimArc(); drawTee(); drawBall(0, 0, 0); drawClub(-1); return; }
    drawTee();
    if (shot.phase === 'swing') { drawBall(0, 0, 0); drawClub(shot.t); return; }
    if (shot.phase === 'flight') {
      drawTracer(shot, shot.u); var w = flightAt(shot, shot.u); drawBall(w.d, w.lat, w.h);
    } else { // bounce + roll, then rest
      drawTracer(shot, 1); drawBurst(shot, Math.min(1, shot.bt * 1.6));
      var bt = Math.min(1, shot.bt), hop = bt < 0.45 ? Math.sin(bt / 0.45 * Math.PI) * shot.peak * 0.09 : bt < 0.75 ? Math.sin((bt - 0.45) / 0.3 * Math.PI) * shot.peak * 0.03 : 0;
      shot.bk = 1 - Math.pow(1 - bt, 2);
      drawBall(shot.dist + shot.roll * shot.bk, shot.lat, hop);
    }
    drawClub(Math.min(shot.t, 2));
  }

  // ---- game flow ----
  // the needle is worked out from the clock, so the tap locks exactly where the needle was at that instant
  var needleT0 = performance.now();
  function needleAt(t) {
    var pos = 50 + Math.sin((t - needleT0) / 1000 * 3.1) * 44;
    needleSigned = (pos - 50) / 44; needleVal = Math.max(0.55, 1 - Math.abs(needleSigned) * 0.45);
    if (powerNeedle) powerNeedle.style.left = pos.toFixed(2) + '%';
    if (powerPct) { var pw = Math.round(Math.abs(needleSigned) * 30); powerPct.textContent = pw > 1 ? pw + '% short' : 'pure'; }
  }
  var resetTimer = null;
  function swingLabel() { if (swingBtn) swingBtn.textContent = shot ? 'Start Again' : 'Swing Now (Lock Sweet Spot)'; }
  function resetShot() { // user 27 Nov: start again at any moment, even mid-flight
    clearTimeout(resetTimer); resetTimer = null; shot = null; setStep(1); swingLabel();
    say('STEP UP TO THE TEE', 'Pick your club and swing when the needle is on the green.', 'CHOOSE YOUR CLUB', 'Pick a club, then swing when the needle is on the green.');
    draw(); kick();
  }
  function launch(e) {
    if (shot) return;
    needleAt(e && e.timeStamp ? e.timeStamp : performance.now());
    // user 27 Nov: a range never gives you extra; the sweet spot is the club's full distance, a miss either side falls short
    var c = CLUBS[activeClub], power = 1 - Math.abs(needleSigned) * 0.3, dist = Math.round(c.dist * power);
    var aim = aimLat(dist), drift = windMps * 0.85 + needleSigned * 4;
    bucketLeft = bucketLeft > 1 ? bucketLeft - 1 : 12;
    shot = { phase: 'swing', t: 0, u: 0, bt: 0, bk: 0, club: c, dist: dist, aim: aim, drift: drift, lat: aim + drift,
      peak: c.peak * (0.9 + needleVal * 0.1), roll: dist * 0.06, flightT: 1.3 + dist / 200 * 1.3 };
    setStep(2);
    var len = Math.round(Math.abs(needleSigned) * 30), lenTxt = len > 1 ? len + '% short of the sweet spot' : 'pure, on the sweet spot';
    say('SWINGING ' + c.name.toUpperCase() + '…', 'Struck ' + lenTxt + '. Watch the tracer.', 'BALL IN FLIGHT', 'Carry ' + dist + 'm, ' + lenTxt + '.');
    if (telCarry) telCarry.textContent = dist + ' m'; if (telApex) telApex.textContent = c.peak + ' m';
    if (telBucket) telBucket.textContent = bucketLeft + ' left';
    if (reduce) { shot.phase = 'roll'; shot.t = 2; shot.u = 1; shot.bt = 1; finish(); draw(); return; }
    kick();
  }
  function finish() {
    var sh = shot, c = sh.club, restD = sh.dist + sh.roll, miss = Math.hypot(restD - c.dist, sh.lat - c.lat);
    landed.push({ d: restD, lat: sh.lat }); if (landed.length > 12) landed.shift();
    var pts = 50, call = 'SOLID ' + sh.dist + 'M, FAIRWAY';
    if (miss <= 7.5) { pts = 250; call = 'LEKKER, BULLSEYE! +250'; }
    else if (miss <= 15) { pts = 150; call = 'ON THE GREEN! +150'; }
    else if (miss <= 28) { pts = 90; call = 'NICE APPROACH! +90'; }
    totalScore += pts; if (telScore) telScore.textContent = totalScore + ' pts';
    setStep(4);
    say(call, 'Carry ' + sh.dist + 'm · ' + miss.toFixed(1) + 'm from the ' + c.dist + 'm flag. The wind is shifting.', call,
      'Score: ' + totalScore + ' pts. Adjust your aim for the new breeze, or book a real bucket and a table.');
    if (pitWaCta) pitWaCta.href = 'https://wa.me/27824486870?text=' + encodeURIComponent("Hi EL'Vetties! I just scored " + totalScore +
      ' pts on your range game (' + sh.dist + 'm with the ' + c.name + ") and want to book a real bucket and a table at Sapele St!");
    windMps = Math.round((Math.random() * 14 - 7) * 10) / 10; aimLabel();
    resetTimer = setTimeout(function () { resetTimer = null; shot = null; setStep(1); swingLabel(); kick(); }, 2600);
  }

  // ---- loop: runs only while the stage is on screen ----
  var running = false, visible = false, last = 0;
  function frame(now) {
    var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; perfT += dt;
    if (!shot) needleAt(now);
    if (shot) {
      shot.t += dt;
      if (shot.phase === 'swing' && shot.t >= 0.7) { shot.phase = 'flight'; if (window.EVSound) window.EVSound.playImpact('golf'); setStep(3); }
      else if (shot.phase === 'flight') { shot.u = Math.min(1, shot.u + dt / shot.flightT); if (shot.u >= 1) shot.phase = 'roll'; }
      else if (shot.phase === 'roll' && shot.bt < 1) { shot.bt += dt / 0.9; if (shot.bt >= 1) { shot.bt = 1; draw(); finish(); } }
    }
    draw();
    if (visible && !reduce) requestAnimationFrame(frame); else { running = false; last = 0; }
  }
  function kick() { if (reduce) { draw(); return; } if (!running && visible) { running = true; requestAnimationFrame(frame); } }

  // ---- controls ----
  document.querySelectorAll('.club-opt[data-club]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (shot) return;
      activeClub = Number(btn.getAttribute('data-club') || 1);
      document.querySelectorAll('.club-opt[data-club]').forEach(function (b, i) { b.setAttribute('aria-pressed', String(i === activeClub)); });
      var c = CLUBS[activeClub]; if (telCarry) telCarry.textContent = c.dist + ' m'; if (telApex) telApex.textContent = c.peak + ' m';
      setStep(1); kick(); draw();
    });
  });
  if ($('aimLeftBtn')) $('aimLeftBtn').addEventListener('click', function () { aimDeg = Math.max(-16, aimDeg - 4); aimLabel(); draw(); });
  if ($('aimRightBtn')) $('aimRightBtn').addEventListener('click', function () { aimDeg = Math.min(16, aimDeg + 4); aimLabel(); draw(); });
  if (swingBtn) swingBtn.addEventListener('click', function (e) { if (shot) resetShot(); else { launch(e); swingLabel(); } });
  if (camBtn) camBtn.addEventListener('click', function () {
    aerial = !aerial; camBtn.setAttribute('aria-pressed', String(aerial)); camBtn.textContent = aerial ? 'Tee View' : 'Aerial View'; draw();
  });
  function syncDusk() { if (duskBtn) { duskBtn.setAttribute('aria-pressed', String(dusk)); duskBtn.textContent = dusk ? 'Daylight' : 'Dusk Lights'; } draw(); }
  if (duskBtn) duskBtn.addEventListener('click', function () { dusk = !dusk; syncDusk(); });
  new MutationObserver(function () { dusk = document.documentElement.dataset.theme === 'night'; syncDusk(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (teePad) { // swipe up from the ball; only this small pad takes the finger, the rest of the stage scrolls the page
    var sy = null;
    teePad.addEventListener('pointerdown', function (e) { sy = e.clientY; teePad.setPointerCapture(e.pointerId); });
    teePad.addEventListener('pointerup', function (e) { if (sy !== null && sy - e.clientY > 24) { launch(e); swingLabel(); } sy = null; });
    teePad.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); launch(); } });
  }

  photo.onload = function () { draw(); };
  layout(); aimLabel(); syncDusk();
  addEventListener('resize', layout);
  if (window.ResizeObserver) new ResizeObserver(layout).observe(canvas);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }, { rootMargin: '100px' }).observe(canvas);
  } else { visible = true; kick(); }
})();
