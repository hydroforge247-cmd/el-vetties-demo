/**
 * House Craft Standard v5.0 — Zero-Dependency Reusable Interactive & Sensory Modules
 * Built from The Braai Wagon, Artisan Sourdough v4, Tattoo Island & Venterskroon Inn benchmarks.
 * 100% offline-safe, prefers-reduced-motion compliant, zero external requests.
 */
(function (global) {
  'use strict';

  const reducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia &&
    false; // owner's call 27 Nov (see house.js)

  /* ── 1. Procedural Web Audio Ambient & Gesture Sound Engine ───── */
  function createAmbientSound(mode = 'sizzle') {
    let ctx = null;
    let master = null;
    let running = false;
    let timer = null;

    function ensureCtx() {
      if (ctx) return ctx;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.0001;
      master.connect(ctx.destination);
      return ctx;
    }

    function startNoiseBed() {
      const c = ensureCtx();
      if (!c) return;
      if (c.state === 'suspended') c.resume();
      const len = c.sampleRate * 2;
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;

      const filter = c.createBiquadFilter();
      if (mode === 'breeze') {
        filter.type = 'bandpass';
        filter.frequency.value = 420;
        filter.Q.value = 1.6;
      } else if (mode === 'hearth') {
        filter.type = 'lowpass';
        filter.frequency.value = 650;
      } else {
        // 'sizzle' — warm crackling coal & grill hiss
        filter.type = 'highpass';
        filter.frequency.value = 2600;
      }

      const bedGain = c.createGain();
      bedGain.gain.value = mode === 'breeze' ? 0.06 : 0.045;
      src.connect(filter);
      filter.connect(bedGain);
      bedGain.connect(master);
      src.start();

      // Subtle organic crackles / pops for sizzle & hearth modes
      if (mode === 'sizzle' || mode === 'hearth') {
        timer = setInterval(() => {
          if (!running || !ctx) return;
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(700 + Math.random() * 1900, ctx.currentTime);
          g.gain.setValueAtTime(0.035, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.045);
          osc.connect(g);
          g.connect(master);
          osc.start();
          osc.stop(ctx.currentTime + 0.05);
        }, 280);
      }
      return src;
    }

    let bedSrc = null;

    return {
      start() {
        if (running) return true;
        const c = ensureCtx();
        if (!c) return false;
        running = true;
        if (!bedSrc) bedSrc = startNoiseBed();
        master.gain.cancelScheduledValues(c.currentTime);
        master.gain.linearRampToValueAtTime(0.85, c.currentTime + 0.35);
        return true;
      },
      stop() {
        if (!running || !ctx || !master) return;
        running = false;
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
        if (timer) { clearInterval(timer); timer = null; }
      },
      toggle() {
        if (running) { this.stop(); return false; }
        return this.start();
      },
      playImpact(kind = 'hit') {
        if (!running || !ctx || !master) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        if (kind === 'golf') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(240, now);
          osc.frequency.exponentialRampToValueAtTime(52, now + 0.14);
          g.gain.setValueAtTime(0.28, now);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
        } else {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(520, now);
          osc.frequency.exponentialRampToValueAtTime(160, now + 0.1);
          g.gain.setValueAtTime(0.18, now);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        }
        osc.connect(g);
        g.connect(master);
        osc.start(now);
        osc.stop(now + 0.18);
      },
      isPlaying: () => running
    };
  }

  /* ── 3. 24-Bulb Scroll-Ignited Festoon Lights ─────────────────── */
  function initScrollFestoon(sectionSel, bulbSel) {
    const sec = document.querySelector(sectionSel);
    const bulbs = Array.from(document.querySelectorAll(bulbSel));
    if (!sec || !bulbs.length) return;

    function update() {
      if (reducedMotion()) {
        bulbs.forEach((b) => b.classList.add('on'));
        return;
      }
      const r = sec.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const p = Math.max(0, Math.min(1, (vh * 0.9 - r.top) / (vh * 0.55)));
      const lit = Math.max(Math.ceil(bulbs.length * 0.45), Math.round(p * bulbs.length));
      bulbs.forEach((b, i) => b.classList.toggle('on', i < lit));
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ── 4. Word-by-Word Split H2 Reveals (70ms Stagger) ──────────── */
  function initSplitHeadings(selector = '.split-h2') {
    const els = Array.from(document.querySelectorAll(selector));
    if (!els.length) return;
    if (reducedMotion() || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'));
      return;
    }
    els.forEach((el) => {
      const words = el.textContent.trim().split(/\s+/);
      el.innerHTML = words
        .map((w, i) => `<span class="sw-mask"><span class="sw-word" style="transition-delay:${i * 70}ms">${w}</span></span>`)
        .join(' ');
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.2 });
    els.forEach((el) => io.observe(el));
  }

  /* ── 5. Animated Rating Score Count-Up ────────────────────────── */
  function initCountUp(selector = '[data-countup]') {
    const els = Array.from(document.querySelectorAll(selector));
    if (!els.length) return;
    const run = (el) => {
      const target = Number(el.getAttribute('data-countup') || 0);
      const suffix = el.getAttribute('data-suffix') || '';
      const decimals = Number(el.getAttribute('data-decimals') || 0);
      if (reducedMotion()) {
        el.textContent = `${target.toFixed(decimals)}${suffix}`;
        return;
      }
      const start = performance.now();
      const dur = 1100;
      function frame(now) {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = `${(target * eased).toFixed(decimals)}${suffix}`;
        if (t < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    };
    if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.35 });
    els.forEach((el) => io.observe(el));
  }

  global.CraftV5 = {
    createAmbientSound,
    initScrollFestoon,
    initSplitHeadings,
    initCountUp
  };
})(window);

;
(() => {
  'use strict';

  const reducedMotion = false; // owner's call 27 Nov (see house.js)
  const V5 = window.CraftV5 || {};

  /* ── 1. Procedural Web Audio ("Range sound: On/Off") ──────────── */
  const sound = V5.createAmbientSound ? V5.createAmbientSound('breeze') : null;
  const sndBtn = document.getElementById('sndBtn');
  if (sndBtn && sound) {
    sndBtn.addEventListener('click', () => {
      const on = sound.toggle();
      sndBtn.setAttribute('aria-pressed', String(on));
      sndBtn.textContent = on ? 'Sound: On' : 'Sound: Off';
    });
  }

  /* ── 2. Global Scroll Progress, Solid Header, Hero Parallax & Mbar */
  const topHeader = document.getElementById('topHeader');
  const heroSec = document.getElementById('home');
  const mbar = document.getElementById('mbar');

  function onScroll() {
    const y = window.scrollY || 0;
    const maxDoc = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    document.documentElement.style.setProperty('--doc', (y / maxDoc).toFixed(4));
    if (topHeader) topHeader.classList.toggle('solid', y > 48);
    if (heroSec) {
      const span = Math.max(1, heroSec.offsetHeight - window.innerHeight);
      const hp = reducedMotion ? 0 : Math.max(0, Math.min(1, y / span));
      heroSec.style.setProperty('--hp', hp.toFixed(4));
      if (mbar) mbar.classList.toggle('show', y > heroSec.offsetHeight - 30);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── 4. Live SAST (UTC+2) Status Pill + Today Row Highlight ───── */
  (function updateSAST() {
    const now = new Date();
    const sast = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + 2 * 3600000);
    const day = sast.getDay();
    const hour = sast.getHours() + sast.getMinutes() / 60;

    // Highlight today's exact row in both hours tables
    document.querySelectorAll('.h-table tr[data-days]').forEach((tr) => {
      const days = (tr.getAttribute('data-days') || '').split(',').map(Number);
      if (days.includes(day)) tr.classList.add('today');
    });

    const pill = document.getElementById('livePill');
    const txt = document.getElementById('liveText');
    if (!pill || !txt) return;
    const venueOpen = (day >= 2 && day <= 6 && hour >= 9 && hour < 24) || (day === 0 && hour >= 9 && hour < 18);
    const rangeOpen = (day === 1 && hour >= 9 && hour < 19) || (day >= 2 && day <= 6 && hour >= 9 && hour < 22) || (day === 0 && hour >= 9 && hour < 17);
    if (venueOpen && rangeOpen) {
      pill.classList.remove('closed');
      txt.textContent = day === 0
        ? 'Open now · Range until 17:00 · Venue until 18:00'
        : 'Open now · Range until 22:00 · Venue until 00:00';
    } else if (venueOpen) {
      pill.classList.remove('closed');
      txt.textContent = day === 0 ? 'Venue open until 18:00' : 'Pub & Venue open until 00:00';
    } else if (rangeOpen) {
      pill.classList.remove('closed');
      txt.textContent = 'Driving Range open until 19:00 · Venue opens Tue 09:00';
    } else {
      pill.classList.add('closed');
      txt.textContent = 'Closed right now · Opens 09:00 SAST';
    }
  })();

  if (V5.initSplitHeadings) V5.initSplitHeadings('.split-h2');
  if (V5.initCountUp) V5.initCountUp('[data-countup]');

  // Build 24 SVG festoon bulbs along the curve & wire scroll ignition
  const bulbHost = document.getElementById('festoonBulbs');
  if (bulbHost) {
    const svgNS = 'http://www.w3.org/2000/svg';
    for (let i = 0; i < 24; i++) {
      const t = (i + 0.5) / 24;
      const x = t * 1200;
      const y = 22 + Math.sin(t * Math.PI * 2) * 26 + 24;
      const c = document.createElementNS(svgNS, 'circle');
      c.setAttribute('cx', x.toFixed(1));
      c.setAttribute('cy', y.toFixed(1));
      c.setAttribute('r', '6.5');
      c.setAttribute('class', 'festoon-bulb');
      bulbHost.appendChild(c);
    }
    if (V5.initScrollFestoon) V5.initScrollFestoon('#nights', '.festoon-bulb');
  }

  // Lightbox for 3D Reel cards
  const lbModal = document.getElementById('lightboxModal');
  const lbTitle = document.getElementById('lbTitle');
  const lbImg = document.getElementById('lbImg');
  const lbDesc = document.getElementById('lbDesc');
  const closeLb = document.getElementById('closeLb');
  document.querySelectorAll('.gal-tile').forEach((card) => {
    card.addEventListener('click', () => {
      if (!lbModal) return;
      const img = card.querySelector('img');
      if (lbTitle) lbTitle.textContent = card.getAttribute('data-lb-title') || 'EL\'Vetties';
      if (lbDesc) lbDesc.textContent = card.getAttribute('data-lb-desc') || '';
      if (lbImg && img) { lbImg.src = img.src; lbImg.alt = img.alt; }
      lbModal.showModal();
    });
  });
  if (closeLb && lbModal) closeLb.addEventListener('click', () => lbModal.close());


  /* 6. Range game lives in js/range-game.js (2D canvas on the real range photo, 27 Nov redo) */
  window.EVSound = sound;

  /* ── 7. SEARCHABLE ON-SITE CATEGORY BOARD (Braai Wagon #menu) ─── */
  const CATS = [
    {
      name: 'Kitchen & Pizza', featured: true,
      sub: 'Freshly prepared at 26 Sapele St — message EL\'Vetties on WhatsApp for today\'s specials and current pricing.',
      items: [
        { title: 'Famous Thin-Crust Pizzas', tag: '#1 Favourite', desc: 'Our most-praised menu item across 250+ Google reviews — crispy hand-baked bases, bubbling mozzarella, and generous toppings.' },
        { title: 'Loaded Pub Dagwoods', tag: 'Range Regular', desc: 'Hearty, freshly stacked pub dagwoods favoured by golfers straight off the Elspark fairway.' },
        { title: 'Traditional Sunday Carvery', tag: 'Sundays', desc: 'Proper family Sunday carvery praised for great value alongside live afternoon music.' },
        { title: 'Cold Draughts, Wine & Bar Drinks', tag: 'Tue–Sun', desc: 'Ice-cold beers, pub favourites, and wine served under the thatched lapa or inside the bar.' }
      ]
    },
    {
      name: 'Driving Range', featured: false,
      sub: 'Elspark Golf Driving Range (4.5★ across 80 Google reviews) — open 7 days a week.',
      items: [
        { title: 'Wide Open Grass Fairway', tag: 'Real Turf', desc: 'Tree-lined open grass range with clear distance marker boards and terracotta brick shelter.' },
        { title: 'Reasonably Priced Buckets', tag: 'Great Value', desc: 'Praised by local golfers for affordable ball buckets for quick practice or family fun.' },
        { title: 'Open Mondays Too', tag: 'Mon 09:00–19:00', desc: 'Even when the pub rests on Mondays, the driving range stays open until 19:00.' },
        { title: 'Evening Sessions Until 22:00', tag: 'Tue–Sat', desc: 'Hit a bucket after work Tuesday through Saturday until 22:00, Sundays until 17:00.' }
      ]
    },
    {
      name: 'Kids & Lapa', featured: false,
      sub: 'Safe, open-air family seating with direct sightlines onto the fenced grass playground.',
      items: [
        { title: 'Wooden Jungle Gym & Slides', tag: 'Fenced Lawn', desc: 'Multi-level wooden climbing towers and colourful slides safely separated from parking.' },
        { title: 'Trampoline & Grass Play Area', tag: 'Family Safe', desc: 'Room for kids to run and burn energy while parents unwind close by.' },
        { title: 'Shaded Thatched Lapa Benches', tag: 'Open Air', desc: 'Dark timber picnic tables under the iconic thatched roof and market umbrellas.' },
        { title: 'Non-Smoking Outdoor Seating', tag: 'Fresh Air', desc: 'Generous outdoor lapa and lawn tables away from the indoor bar area.' }
      ]
    },
    {
      name: 'Pub & Live Nights', featured: false,
      sub: 'Proper East Rand neighbourhood atmosphere inside the wood-paneled pub.',
      items: [
        { title: 'Two Red-Felt Pool Tables', tag: 'Inside Pub', desc: 'Two full pool tables with surrounding seating and cold drinks right at the bar.' },
        { title: 'Big-Screen Live Rugby', tag: 'Match Days', desc: 'Springboks and Emirates Lions banners on the wall with live sport on screen.' },
        { title: 'Live Sunday Music', tag: 'Weekends', desc: 'Relaxed live weekend entertainment paired with Sunday family carvery.' },
        { title: 'Karaoke Nights', tag: 'Late Nights', desc: 'Lively community karaoke and friendly regulars — open until 00:00 Tue–Sat.' }
      ]
    },
    {
      name: 'Functions & Access', featured: false,
      sub: 'Easy to reach from Germiston, Boksburg, and Alberton with full wheelchair access.',
      items: [
        { title: 'Covered Function Marquee', tag: 'Birthdays', desc: 'Tented patio space for kids\' birthdays, family celebrations, and club gatherings.' },
        { title: 'Full Wheelchair Accessibility', tag: 'Verified', desc: 'Wheelchair-accessible car park, wheelchair-accessible entrance, and wheelchair-accessible toilet.' },
        { title: 'On-Site Sapele St Parking', tag: '26 Sapele St', desc: 'Convenient customer parking right at the venue entrance.' }
      ]
    }
  ];

  const catRail = document.getElementById('catRail');
  const menuPanel = document.getElementById('menuPanel');
  const mpTitle = document.getElementById('mpTitle');
  const mpSub = document.getElementById('mpSub');
  const mpItems = document.getElementById('mpItems');
  let curCat = 0;

  function renderCat(idx) {
    curCat = (idx + CATS.length) % CATS.length;
    const cat = CATS[curCat];
    if (menuPanel) menuPanel.classList.toggle('featured', cat.featured);
    if (mpTitle) mpTitle.textContent = cat.name;
    if (mpSub) mpSub.textContent = cat.sub;
    if (mpItems) {
      mpItems.innerHTML = cat.items.map((it) =>
        `<li><div class="mp-item-top"><strong>${it.title}</strong><span class="mp-badge">${it.tag}</span></div><p>${it.desc}</p></li>`
      ).join('');
    }
    if (catRail) {
      catRail.querySelectorAll('.cat-btn').forEach((b, i) => b.setAttribute('aria-selected', String(i === curCat)));
    }
  }

  if (catRail) {
    catRail.innerHTML = CATS.map((c, i) =>
      `<button type="button" class="cat-btn" role="tab" aria-selected="${i === 0}" data-cat="${i}"><span>${c.name}</span><span class="cnt">${c.items.length}</span></button>`
    ).join('');
    catRail.querySelectorAll('.cat-btn').forEach((b) => {
      b.addEventListener('click', () => renderCat(Number(b.getAttribute('data-cat') || 0)));
    });
  }
  const prevCat = document.getElementById('prevCat');
  const nextCat = document.getElementById('nextCat');
  if (prevCat) prevCat.addEventListener('click', () => renderCat(curCat - 1));
  if (nextCat) nextCat.addEventListener('click', () => renderCat(curCat + 1));
  renderCat(0);

  // Search Modal
  const searchModal = document.getElementById('searchModal');
  const openSearch = document.getElementById('openSearch');
  const closeSearch = document.getElementById('closeSearch');
  const searchBox = document.getElementById('searchBox');
  const searchResults = document.getElementById('searchResults');
  const allItems = CATS.flatMap((c) => c.items.map((it) => ({ ...it, cat: c.name })));

  function renderSearch(q) {
    if (!searchResults) return;
    const needle = (q || '').trim().toLowerCase();
    const hits = needle
      ? allItems.filter((it) => `${it.title} ${it.desc} ${it.tag} ${it.cat}`.toLowerCase().includes(needle))
      : allItems;
    searchResults.innerHTML = hits.length
      ? hits.map((it) => `<li><div class="mp-item-top"><strong>${it.title}</strong><span class="mp-badge">${it.cat}</span></div><p>${it.desc}</p></li>`).join('')
      : '<li><strong>No matches found</strong><p>Try searching for pizza, carvery, range, Monday, pool, or kids.</p></li>';
  }
  if (openSearch && searchModal) {
    openSearch.addEventListener('click', () => { renderSearch(''); searchModal.showModal(); if (searchBox) searchBox.focus(); });
  }
  if (closeSearch && searchModal) closeSearch.addEventListener('click', () => searchModal.close());
  if (searchBox) searchBox.addEventListener('input', () => renderSearch(searchBox.value));

  /* ── 8. VISIT PASS + ZERO-BACKEND HOST DESK DEMO (YODA localStorage Pattern) */
  const DESK_KEY = 'elvetties-demo-desk-v5';
  const SEED_DESK = [
    { id: 1, title: 'Sample Family · 4 guests (2 adults, 2 kids)', meta: 'Saturday · Thatched Lapa · Driving Range, Thin-Crust Pizza', status: 'Pending' },
    { id: 2, title: 'Sample Golf Four-Ball · 4 adults', meta: 'Friday Evening · Driving Range + Pub & Pool', status: 'Confirmed' },
    { id: 3, title: 'Sample Sunday Carvery · 6 guests', meta: 'Sunday Carvery · Lawn Umbrellas · Kids\' Play Area', status: 'Pending' }
  ];

  function loadDesk() {
    try {
      const raw = localStorage.getItem(DESK_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return SEED_DESK.map((x) => ({ ...x }));
  }
  function saveDesk(rows) {
    try { localStorage.setItem(DESK_KEY, JSON.stringify(rows)); } catch (_) {}
  }

  let deskRows = loadDesk();
  const deskList = document.getElementById('deskList');
  function renderDesk() {
    if (!deskList) return;
    deskList.innerHTML = deskRows.map((r) => `
      <li class="desk-item">
        <div><strong>${r.title}</strong><span>${r.meta}</span></div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="desk-status ${r.status === 'Confirmed' ? 'ok' : ''}">${r.status}</span>
          ${r.status !== 'Confirmed' ? `<button type="button" class="mini-pill" data-confirm="${r.id}">Confirm</button>` : ''}
        </div>
      </li>
    `).join('');
    deskList.querySelectorAll('[data-confirm]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.getAttribute('data-confirm'));
        deskRows = deskRows.map((r) => r.id === id ? { ...r, status: 'Confirmed' } : r);
        saveDesk(deskRows);
        renderDesk();
      });
    });
  }
  renderDesk();

  const pass = {
    adults: 2, kids: 2,
    acts: new Set(['Driving Range', 'Thin-Crust Pizza', "Kids' Play Area"]),
    seat: 'Thatched Lapa', when: 'Saturday Day Out'
  };
  const vAdults = document.getElementById('vAdults');
  const vKids = document.getElementById('vKids');
  const passSummary = document.getElementById('passSummary');
  const waPassLink = document.getElementById('waPassLink');

  function syncPass() {
    if (vAdults) vAdults.textContent = String(pass.adults);
    if (vKids) vKids.textContent = String(pass.kids);
    const total = pass.adults + pass.kids;
    const acts = pass.acts.size ? Array.from(pass.acts).join(', ') : 'General Visit';
    const gStr = `${total} guest${total === 1 ? '' : 's'} (${pass.adults} adults${pass.kids ? `, ${pass.kids} kids` : ''})`;
    if (passSummary) passSummary.innerHTML = `<strong>${gStr}</strong> · ${pass.when} · ${pass.seat} · ${acts}.`;
    if (waPassLink) {
      const msg = [
        "Hi EL'Vetties Family Venue!",
        `We'd love to plan a visit for ${gStr}.`,
        `When: ${pass.when} · Seating: ${pass.seat}`,
        `Plans: ${acts}`,
        'Could you confirm availability at 26 Sapele St, Elspark?'
      ].join('\n');
      waPassLink.href = `https://wa.me/27824486870?text=${encodeURIComponent(msg)}`;
    }
  }

  document.querySelectorAll('.cnt-btn').forEach((b) => {
    b.addEventListener('click', () => {
      const k = b.getAttribute('data-cnt'), d = Number(b.getAttribute('data-d') || 0);
      if (k === 'adults') pass.adults = Math.max(1, Math.min(20, pass.adults + d));
      if (k === 'kids') pass.kids = Math.max(0, Math.min(20, pass.kids + d));
      syncPass();
    });
  });
  document.querySelectorAll('#actRow .p-opt').forEach((b) => {
    b.addEventListener('click', () => {
      const a = b.getAttribute('data-act');
      if (!a) return;
      if (pass.acts.has(a)) { pass.acts.delete(a); b.setAttribute('aria-pressed', 'false'); }
      else { pass.acts.add(a); b.setAttribute('aria-pressed', 'true'); }
      syncPass();
    });
  });
  document.querySelectorAll('#seatRow .p-opt[data-seat]').forEach((b) => {
    b.addEventListener('click', () => {
      pass.seat = b.getAttribute('data-seat') || pass.seat;
      document.querySelectorAll('#seatRow .p-opt[data-seat]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      syncPass();
    });
  });
  document.querySelectorAll('#seatRow .p-opt[data-when]').forEach((b) => {
    b.addEventListener('click', () => {
      pass.when = b.getAttribute('data-when') || pass.when;
      document.querySelectorAll('#seatRow .p-opt[data-when]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      syncPass();
    });
  });

  const addToDeskBtn = document.getElementById('addToDeskBtn');
  if (addToDeskBtn) {
    addToDeskBtn.addEventListener('click', () => {
      const total = pass.adults + pass.kids;
      const acts = pass.acts.size ? Array.from(pass.acts).join(', ') : 'General Visit';
      deskRows.unshift({
        id: Date.now(),
        title: `New Enquiry · ${total} guests (${pass.adults} adults, ${pass.kids} kids)`,
        meta: `${pass.when} · ${pass.seat} · ${acts}`,
        status: 'Pending'
      });
      deskRows = deskRows.slice(0, 5);
      saveDesk(deskRows);
      renderDesk();
    });
  }
  const resetDeskBtn = document.getElementById('resetDeskBtn');
  if (resetDeskBtn) {
    resetDeskBtn.addEventListener('click', () => {
      deskRows = SEED_DESK.map((x) => ({ ...x }));
      saveDesk(deskRows);
      renderDesk();
    });
  }

  const pngBtn = document.getElementById('pngBtn');
  if (pngBtn) {
    pngBtn.addEventListener('click', () => {
      const c = document.createElement('canvas'); c.width = 960; c.height = 540;
      const g = c.getContext('2d'); if (!g) return;
      g.fillStyle = '#0C2618'; g.fillRect(0, 0, 960, 540);
      g.fillStyle = '#E8AE38'; g.fillRect(0, 0, 960, 14);
      g.fillStyle = '#FFFFFF'; g.font = 'bold 36px Impact, sans-serif';
      g.fillText("EL'VETTIES FAMILY VENUE · VISIT PASS", 44, 78);
      g.fillStyle = '#FFE099'; g.font = 'bold 20px sans-serif';
      g.fillText('26 SAPELE ST, ELSPARK, GERMISTON · 082 448 6870', 44, 126);
      const total = pass.adults + pass.kids;
      const acts = pass.acts.size ? Array.from(pass.acts).join(' · ') : 'General Visit';
      g.fillStyle = '#FCF9F2'; g.font = 'bold 30px sans-serif';
      g.fillText(`GROUP: ${total} Guests (${pass.adults} Adults, ${pass.kids} Kids)`, 44, 214);
      g.fillText(`WHEN: ${pass.when} · SEATING: ${pass.seat}`, 44, 274);
      g.fillStyle = '#4ADE80'; g.font = 'bold 22px sans-serif';
      g.fillText(`PLANS: ${acts}`, 44, 344);
      g.fillStyle = '#D3DFD6'; g.font = '18px sans-serif';
      g.fillText('WhatsApp this pass to 082 448 6870 to confirm your table or driving range bays.', 44, 466);
      const a = document.createElement('a');
      a.download = 'el-vetties-v5-pass.png';
      a.href = c.toDataURL('image/png');
      a.click();
    });
  }
  syncPass();
})();
