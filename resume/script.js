// Yossi Grunwald — resume. No libraries; everything here is progressive (the page reads fine without JS).
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FPS = 24, TOTAL = 80; // the "edit" is 80 seconds long, start to end card

  const tc = (sec) => {
    const f = Math.floor((sec % 1) * FPS), s = Math.floor(sec) % 60, m = Math.floor(sec / 60) % 60, h = Math.floor(sec / 3600);
    return [h, m, s, f].map((n) => String(n).padStart(2, '0')).join(':');
  };

  // ---- opener: once per visit, ~1s ----
  const render = $('#render');
  if (render && document.documentElement.classList.contains('show-render')) {
    const bar = $('.render-bar span'), t = $('#render-tc'), start = performance.now(), DUR = 1050;
    const step = (now) => {
      const p = Math.min(1, (now - start) / DUR), e = 1 - Math.pow(1 - p, 3);
      bar.style.width = (e * 100) + '%';
      t.textContent = tc(e * TOTAL);
      if (p < 1) requestAnimationFrame(step);
      else { render.classList.add('done'); try { sessionStorage.setItem('yg-rendered', '1'); } catch (e) {} }
    };
    requestAnimationFrame(step);
    render.addEventListener('click', () => render.classList.add('done'));
  }

  // ---- scene spy: which section is on screen drives colour, nav, timeline ----
  const scenes = $$('main .scene');
  const navLinks = $$('.rail-nav a, .dock a');
  const dockHead = $('#dock-head');
  const setScene = (name) => {
    if (document.body.dataset.scene === name) return;
    document.body.dataset.scene = name;
    navLinks.forEach((a) => a.classList.toggle('on', a.dataset.scene === name));
    placeDock();
  };
  function placeDock() {
    if (!dockHead) return;
    const on = $(`.dock a[data-scene="${document.body.dataset.scene}"]`);
    if (on && on.offsetWidth) { dockHead.style.width = on.offsetWidth + 'px'; dockHead.style.transform = `translateX(${on.offsetLeft - 6}px)`; dockHead.style.opacity = 1; }
    else dockHead.style.opacity = 0;
  }
  // watch the bar itself: fires after layout settles (a window resize event can arrive before it does)
  if (window.ResizeObserver && $('.dock')) new ResizeObserver(() => requestAnimationFrame(placeDock)).observe($('.dock'));
  else addEventListener('resize', () => requestAnimationFrame(placeDock));
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) setScene(en.target.dataset.scene); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  scenes.forEach((s) => spy.observe(s));
  navLinks.forEach((a) => a.classList.toggle('on', a.dataset.scene === 'intro'));

  // ---- scroll = timecode + playhead + heading stretch ----
  const tcEl = $('#tc'), playhead = $('#playhead');
  const stretchy = $$('.scene-head h2[data-stretch], .end[data-stretch]');
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    if (tcEl) tcEl.textContent = tc(p * TOTAL);
    if (playhead) playhead.style.setProperty('--p', p);
    if (!reduce) {
      const mids = stretchy.map((h) => { const r = h.getBoundingClientRect(); return r.top + r.height / 2; }); // all reads first
      stretchy.forEach((h, i) => {
        const v = 1 - Math.min(1, Math.max(0, mids[i] / innerHeight)); // 0 at bottom → 1 at top
        h.style.setProperty('--w', (72 + v * ((innerWidth < 600 ? 100 : 122) - 72)).toFixed(1)); // phones: never wider than normal // narrower as it enters, wider as it leaves
      });
    }
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  // ---- the name breathes with the pointer (desktop) ----
  const lines = $$('.name-line');
  if (!reduce && matchMedia('(pointer: fine)').matches) {
    addEventListener('pointermove', (e) => {
      const x = e.clientX / innerWidth;
      if (lines[0]) lines[0].style.setProperty('--w', (60 + x * 55).toFixed(1));
      if (lines[1]) lines[1].style.setProperty('--w', (115 - x * 55).toFixed(1));
    }, { passive: true });
  }
  // keep the name inside the viewport whatever the width axis does
  const fit = () => lines.forEach((l) => {
    const w = l.style.getPropertyValue('--w');
    l.style.transition = 'none'; l.style.fontSize = ''; l.style.setProperty('--w', '115'); // 115 = the widest the pointer can push it
    const room = l.parentElement.clientWidth;
    if (l.scrollWidth > room) l.style.fontSize = (parseFloat(getComputedStyle(l).fontSize) * room / l.scrollWidth * 0.98) + 'px';
    if (w) l.style.setProperty('--w', w); else l.style.removeProperty('--w');
    void l.offsetWidth; l.style.transition = '';
  });
  document.fonts && document.fonts.ready.then(fit);
  addEventListener('resize', fit);

  // ---- "I bake the bread / built the app / cut the film" ----
  const words = $$('.cw'), intro = $('#intro'), name2 = lines[1];
  let wi = 0;
  const showWord = () => {
    words.forEach((w, i) => { w.classList.toggle('on', i === wi); w.tabIndex = i === wi ? 0 : -1; });
    const tint = getComputedStyle(words[wi]).color;
    if (name2 && document.body.dataset.scene === 'intro') name2.style.color = tint;
  };
  if (words.length) {
    showWord();
    if (!reduce) setInterval(() => { wi = (wi + 1) % words.length; showWord(); }, 2200);
  }
  new MutationObserver(() => { if (name2 && document.body.dataset.scene !== 'intro') name2.style.color = ''; })
    .observe(document.body, { attributes: true, attributeFilter: ['data-scene'] });

  // ---- Workeey keys ----
  const tip = $('#key-tip');
  $$('.key').forEach((k) => k.addEventListener('click', () => {
    $$('.key.on').forEach((o) => o !== k && o.classList.remove('on'));
    k.classList.toggle('on');
    tip.textContent = k.classList.contains('on') ? k.dataset.tip : 'Tap a key.';
  }));

  // ---- proof timer (an easter egg for whoever's reading) ----
  const pb = $('#proof-btn'), pr = $('#proof-read');
  let proofT = null, proofStart = 0;
  if (pb) pb.addEventListener('click', () => {
    if (proofT) { clearInterval(proofT); proofT = null; pb.setAttribute('aria-pressed', 'false'); pb.textContent = 'Start a proof timer'; pr.textContent = 'Punched down. Start again any time.'; return; }
    proofStart = Date.now(); pb.setAttribute('aria-pressed', 'true'); pb.textContent = 'Stop';
    const tick = () => {
      const s = Math.floor((Date.now() - proofStart) / 1000), left = Math.max(0, 45 * 60 - s);
      const mmss = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
      pr.textContent = left > 0 ? `Proofing ${mmss} · about ${Math.ceil(left / 60)} min to go. Keep reading.` : `Proofed ${mmss}. Into the oven — thanks for reading this far.`;
    };
    tick(); proofT = setInterval(tick, 1000);
  });

  // ---- era switch: now / then ----
  const eraBtns = $$('.era-btn'), slider = $('.era-slider');
  const placeSlider = () => {
    const on = eraBtns.find((b) => b.getAttribute('aria-selected') === 'true');
    if (on && slider) { slider.style.setProperty('--sw', on.offsetWidth + 'px'); slider.style.setProperty('--sx', (on.offsetLeft - 4) + 'px'); }
  };
  eraBtns.forEach((b) => b.addEventListener('click', () => {
    eraBtns.forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    $$('.era-panel').forEach((p) => { p.hidden = p.dataset.panel !== b.dataset.era; });
    placeSlider(); watchLoops();
  }));
  $$('.era-panel').forEach((p) => { p.hidden = p.dataset.panel !== 'now'; });
  document.fonts && document.fonts.ready.then(placeSlider);
  addEventListener('resize', placeSlider);

  // ---- muted preview loops play only while on screen ----
  const loopObs = new IntersectionObserver((entries) => entries.forEach((en) => {
    const v = en.target;
    if (en.isIntersecting) { v.preload = 'auto'; v.play().catch(() => {}); } else v.pause();
  }), { rootMargin: '100px' });
  const watchLoops = () => $$('video.loop').forEach((v) => { loopObs.unobserve(v); if (!reduce) loopObs.observe(v); });
  watchLoops();

  // ---- player: full video with sound, or YouTube on demand ----
  const dlg = $('#player'), stage = $('#player-stage'), title = $('#player-title'), note = $('#player-note');
  const open = (html, t, n, wide) => {
    stage.innerHTML = html; stage.classList.toggle('wide', !!wide);
    title.textContent = t || ''; note.textContent = n || '';
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  };
  const close = () => { stage.innerHTML = ''; dlg.close ? dlg.close() : dlg.removeAttribute('open'); };
  $$('[data-video]').forEach((el) => {
    el.tabIndex = 0; el.setAttribute('role', 'button');
    const go = () => open(`<video src="${el.dataset.video}" controls autoplay playsinline></video>`, el.dataset.title, el.dataset.mutedNote);
    el.addEventListener('click', go);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });
  $$('[data-yt]').forEach((b) => b.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return; // let them open it in a new tab
    e.preventDefault();
    const id = encodeURIComponent(b.dataset.yt);
    open(`<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" allow="autoplay; encrypted-media; fullscreen" allowfullscreen title="YouTube video"></iframe>`, b.querySelector('b')?.textContent, '', true);
  }));
  $('#player-close').addEventListener('click', close);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  dlg.addEventListener('close', () => { stage.innerHTML = ''; });

  // ---- email, assembled here so scrapers reading the HTML don't get it ----
  const mail = $('#mail');
  if (mail) { const a = ['grunwaldyossi', 'gmail.com'].join('@'); mail.href = 'mailto:' + a; mail.textContent = a; }

  // ---- gentle reveal ----
  if (!reduce) {
    const rv = $$('.scene-head, .wk, .rail-tickets, .proof, .era, .era-panel, .broll li, .mail, .socials, .pick');
    rv.forEach((el) => el.classList.add('rv'));
    const ro = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); ro.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
    rv.forEach((el) => ro.observe(el));
  }
})();
