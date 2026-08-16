/* Companion-app shell behaviors: hash routing, rail nav, reveal,
   music radio, lazy live previews, ink signal canvas. Shared. */
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- rail toggle ---- */
  const rail = document.getElementById('rail');
  const tbToggle = document.getElementById('tb-toggle');
  const scrim = document.querySelector('.rail-scrim');
  function setRail(open) {
    if (!rail) return;
    rail.setAttribute('data-open', String(open));
    if (tbToggle) tbToggle.setAttribute('aria-expanded', String(open));
    if (open && matchMedia('(max-width: 900px)').matches) document.body.classList.add('rail-open');
    else document.body.classList.remove('rail-open');
  }
  if (tbToggle && rail) {
    tbToggle.addEventListener('click', () => setRail(rail.getAttribute('data-open') !== 'true'));
  }
  if (scrim) scrim.addEventListener('click', () => setRail(false));
  // start with the drawer closed on mobile; open by default on desktop
  if (matchMedia('(max-width: 900px)').matches) setRail(false);

  /* ---- reveal on scroll ---- */
  const rv = document.querySelectorAll('.rv');
  if (reduce || !('IntersectionObserver' in window)) {
    rv.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((es) => {
      es.forEach((e, i) => {
        if (e.isIntersecting) {
          const el = e.target;
          setTimeout(() => el.classList.add('in'), Math.min(i * 55, 220));
          io.unobserve(el);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rv.forEach((el) => io.observe(el));
  }

  /* ---- ink-on-paper signal canvas (landing) ---- */
  (function () {
    const cv = document.getElementById('signal');
    if (!cv) return;
    const ctx = cv.getContext('2d', { alpha: true });
    const INK = '#212532', SLATE = '#4E5877', BLUE = '#1D4AFF';
    const LINES = 12, STEP = 6, SPEED = 1.0, LANE = 12;
    let w = 0, h = 0, dpr = 1, t = 0, raf = 0;
    const seeds = Array.from({ length: LINES }, (_, i) => 11.7 + i * 23.3);
    const BLUE_LINES = new Set([4, 9]);
    const SLATE_LINES = new Set([1, 7]);
    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 1.5);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = Math.floor(w * dpr); cv.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'square'; ctx.lineJoin = 'miter';
    }
    function hash(n) { const v = Math.sin(n) * 43758.5453; return v - Math.floor(v); }
    function smooth(a) { return a * a * (3 - 2 * a); }
    function route(x, ch, time) {
      const s = seeds[ch];
      const u = x * 0.0042 + time * 0.011 * SPEED;
      const seg = 1.7, i = Math.floor(u / seg), f = u / seg - i;
      const lane = (k) => Math.round((hash(k * 1.93 + s) - 0.5) * 4) / 2;
      const a = lane(i), b = lane(i + 1);
      const t0 = 0.42, t1 = 0.72;
      const m = f < t0 ? 0 : f > t1 ? 1 : (f - t0) / (t1 - t0);
      return (a + (b - a) * smooth(m)) * LANE;
    }
    function eeg(x, ch, time) {
      const s = seeds[ch];
      const p = x * 0.0085 + time * 0.02 * SPEED;
      let y = Math.sin(p * 0.8 + s) * 4 + Math.sin(p * 1.9 + s * 1.7) * 2;
      const period = 2.0, idx = Math.floor(p / period), fire = hash(idx * 1.7 + s);
      if (fire > 0.55) {
        const local = (p / period - idx) - 0.5, amp = 16 + fire * 34, dir = ch % 2 ? -1 : 1;
        y -= dir * amp * Math.exp(-Math.pow(local * 16, 2));
        y += dir * amp * 0.32 * Math.exp(-Math.pow((local - 0.06) * 22, 2));
      }
      return y;
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      const top = h * 0.06, span = h * 0.88, gap = span / LINES;
      ctx.lineWidth = 1; ctx.strokeStyle = SLATE; ctx.globalAlpha = 0.16;
      ctx.beginPath();
      for (let ch = 0; ch < LINES; ch++) { const yb = top + (ch + 0.5) * gap; ctx.moveTo(0, yb); ctx.lineTo(w, yb); }
      ctx.stroke();
      for (let ch = 0; ch < LINES; ch++) {
        const yb = top + (ch + 0.5) * gap;
        const isBlue = BLUE_LINES.has(ch), isSlate = SLATE_LINES.has(ch);
        ctx.beginPath();
        for (let x = -STEP; x <= w + STEP; x += STEP) {
          const off = (isBlue || isSlate) ? eeg(x, ch, t) : route(x, ch, t);
          const y = yb + off;
          x === -STEP ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = isBlue || isSlate ? BLUE : INK;
        if (isBlue) { ctx.globalAlpha = 0.95; ctx.lineWidth = 2; }
        else if (isSlate) { ctx.globalAlpha = 0.6; ctx.lineWidth = 1.4; }
        else { ctx.globalAlpha = 0.34; ctx.lineWidth = 1; }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    let running = false;
    function tick() { t += 1; draw(); raf = requestAnimationFrame(tick); }
    function start() { if (running || reduce) return; running = true; tick(); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    resize();
    addEventListener('resize', () => { cancelAnimationFrame(raf); resize(); running ? tick() : (reduce && draw()); }, { passive: true });
    reduce ? draw() : start();
    document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => { es[0].isIntersecting ? start() : stop(); }, { threshold: 0 }).observe(cv);
    }
  })();

  /* ---- music radio ---- */
  (function () {
    const ALBUM = 'OLAK5uy_nIJT4hhBlsEbb4ULB8gxjLdpznZjx3NlM';
    const radio = document.getElementById('radio');
    if (!radio) return;
    const btn = document.getElementById('rbtn');
    const titleEl = document.getElementById('r-title');
    const vol = document.getElementById('r-vol');
    const volv = document.getElementById('r-volv');
    const prev = document.getElementById('r-prev');
    const next = document.getElementById('r-next');
    let player = null, ready = false, pending = false, loadStarted = false;
    function load() {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
      window.onYouTubeIframeAPIReady = init;
    }
    function init() {
      player = new YT.Player('ytplayer', {
        height: '180', width: '320',
        playerVars: { playsinline: 1, controls: 0, disablekb: 1, modestbranding: 1, rel: 0, listType: 'playlist', list: ALBUM, loop: 1 },
        events: {
          onReady: () => { ready = true; player.setVolume(Number(vol.value)); if (pending) { player.playVideo(); pending = false; } },
          onStateChange: (e) => {
            const playing = e.data === YT.PlayerState.PLAYING;
            radio.setAttribute('data-playing', String(playing));
            btn.textContent = playing ? '❚❚' : '▶';
            btn.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
            const d = player.getVideoData && player.getVideoData();
            if (d && d.title) titleEl.textContent = d.title;
          }
        }
      });
    }
    btn.addEventListener('click', () => {
      if (!loadStarted) { loadStarted = true; pending = true; btn.textContent = '…'; load(); return; }
      if (!ready) { pending = true; btn.textContent = '…'; return; }
      if (player.getPlayerState() === YT.PlayerState.PLAYING) player.pauseVideo();
      else { player.setVolume(Number(vol.value)); player.playVideo(); }
    });
    prev.addEventListener('click', () => { if (ready) player.previousVideo(); });
    next.addEventListener('click', () => { if (ready) player.nextVideo(); });
    vol.addEventListener('input', () => { volv.textContent = vol.value; if (ready) player.setVolume(Number(vol.value)); });
  })();

  /* ---- lazy live previews: at most ONE runs at a time ---- */
  (function () {
    const frames = [...document.querySelectorAll('iframe.shot')];
    if (!frames.length) return;
    let current = null, tt = 0;
    const mount = (f) => { if (f && !f.getAttribute('src') && f.dataset.src) f.setAttribute('src', f.dataset.src); };
    const unmount = (f) => { if (f && f.getAttribute('src')) { f.dataset.src = f.getAttribute('src'); f.removeAttribute('src'); } };
    function pick() {
      const vh = innerHeight, cy = vh / 2;
      let best = null, bestD = Infinity;
      for (const f of frames) {
        const r = f.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) continue;
        const d = Math.abs((r.top + r.bottom) / 2 - cy);
        if (d < bestD) { bestD = d; best = f; }
      }
      if (best !== current) { unmount(current); current = best; mount(current); }
    }
    const settle = () => { clearTimeout(tt); tt = setTimeout(pick, 180); };
    addEventListener('scroll', settle, { passive: true });
    addEventListener('resize', settle, { passive: true });
    settle();
  })();
})();
