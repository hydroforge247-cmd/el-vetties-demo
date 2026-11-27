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
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var cw = canvas.clientWidth || 760, ch = canvas.clientHeight || 430;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    W = canvas.width; H = canvas.height; unit = H / 430;
    s = Math.max(W / IW, H / IH);
    ox = Math.min(0, Math.max(W - IW * s, W / 2 - TEEX * s));
    oy = (H - IH * s) * 0.75;
    teeY = H - Math.max(30 * dpr, H * 0.1);
    yTeeImg = (teeY - oy) / s;
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
      if (on || !aerial) { // distance chip
        var label = c.dist + ' m', fs = Math.round(Math.max(10, 12 * unit));
        g.font = '600 ' + fs + 'px Outfit, system-ui, sans-serif';
        var tw = g.measureText(label).width + fs, lx = top.x - tw - 6 * unit, ly = top.y - 2;
        g.fillStyle = 'rgba(7, 25, 16, .78)'; roundRect(lx, ly, tw, fs * 1.6, fs * 0.8); g.fill();
        g.fillStyle = on ? '#FFE099' : '#FCF9F2'; g.fillText(label, lx + fs * 0.5, ly + fs * 1.15);
      }
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
  function drawClub(t) {
    var b = proj(0, 0, 0), r = ballR(b.k), L = H * 0.3;
    var fade = t < 1 ? 1 : Math.max(0, 1 - (t - 1) / 0.4); if (!fade) return; // the club leaves once the ball is away
    var hx = b.x - L * Math.cos(A0) - r * 1.4, hy = b.y - L * Math.sin(A0) - r * 0.4; // hands
    var a = clubAngle(t), ex = hx + Math.cos(a) * L, ey = hy + Math.sin(a) * L;
    g.save(); g.globalAlpha = fade; g.lineCap = 'round';
    g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 5 * unit; g.beginPath(); g.moveTo(hx + 3 * unit, hy + 4 * unit); g.lineTo(ex + 3 * unit, ey + 4 * unit); g.stroke();
    var sg = g.createLinearGradient(hx, hy, ex, ey); sg.addColorStop(0, '#9aa5ad'); sg.addColorStop(0.5, '#eef3f6'); sg.addColorStop(1, '#8d979e');
    g.strokeStyle = sg; g.lineWidth = 3.2 * unit; g.beginPath(); g.moveTo(hx, hy); g.lineTo(ex, ey); g.stroke();
    g.strokeStyle = '#151a17'; g.lineWidth = 6.5 * unit; // grip
    g.beginPath(); g.moveTo(hx - Math.cos(a) * 6 * unit, hy - Math.sin(a) * 6 * unit); g.lineTo(hx + Math.cos(a) * L * 0.2, hy + Math.sin(a) * L * 0.2); g.stroke();
    g.fillStyle = '#f7f4ea'; g.beginPath(); g.arc(hx, hy, 7.5 * unit, 0, Math.PI * 2); g.fill(); // glove
    g.translate(ex, ey); g.rotate(a - Math.PI / 2); // iron head
    var hg = g.createLinearGradient(-9 * unit, 0, 13 * unit, 0); hg.addColorStop(0, '#c9d1d6'); hg.addColorStop(0.5, '#ffffff'); hg.addColorStop(1, '#7f8a91');
    g.fillStyle = hg; g.beginPath();
    g.moveTo(-4 * unit, -3 * unit); g.lineTo(15 * unit, -1 * unit); g.quadraticCurveTo(19 * unit, 4 * unit, 14 * unit, 8 * unit); g.lineTo(-5 * unit, 6 * unit); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(40,48,52,.6)'; g.lineWidth = 1; g.stroke();
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
  function launch() {
    if (shot) return;
    var c = CLUBS[activeClub], power = 0.84 + needleVal * 0.2, dist = Math.round(c.dist * power);
    var aim = aimLat(dist), drift = windMps * 0.85 + needleSigned * 12;
    bucketLeft = bucketLeft > 1 ? bucketLeft - 1 : 12;
    shot = { phase: 'swing', t: 0, u: 0, bt: 0, bk: 0, club: c, dist: dist, aim: aim, drift: drift, lat: aim + drift,
      peak: c.peak * (0.9 + needleVal * 0.1), roll: dist * 0.06, flightT: 1.3 + dist / 200 * 1.3 };
    setStep(2);
    say('SWINGING ' + c.name.toUpperCase() + '…', 'Sweet spot ' + Math.round(needleVal * 100) + '%. Watch the tracer.', 'BALL IN FLIGHT',
      'Carry ' + dist + 'm with ' + Math.round(needleVal * 100) + '% sweet-spot contact.');
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
    setTimeout(function () { shot = null; setStep(1); kick(); }, reduce ? 1800 : 2200);
  }

  // ---- loop: runs only while the stage is on screen ----
  var running = false, visible = false, last = 0;
  function frame(now) {
    var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; perfT += dt;
    if (!reduce && !shot) {
      needlePhase += dt * 3.1;
      var pos = 50 + Math.sin(needlePhase) * 44;
      needleSigned = (pos - 50) / 44; needleVal = Math.max(0.55, 1 - Math.abs(needleSigned) * 0.45);
      if (powerNeedle) powerNeedle.style.left = pos.toFixed(1) + '%';
      if (powerPct) powerPct.textContent = Math.round(needleVal * 100) + '%';
    }
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
  if (swingBtn) swingBtn.addEventListener('click', launch);
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
    teePad.addEventListener('pointerup', function (e) { if (sy !== null && sy - e.clientY > 24) launch(); sy = null; });
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
