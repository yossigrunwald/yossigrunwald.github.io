// main.js — boot, the loop, the camera, the frame (layers of spec 9.5), quality tiers, debug flags.
import { S, G, BOX, HUB_R, PAL, TRACK, GHOST, CUTS, WOODS, surfaceAt, gridCells, shown } from './world.js';
import * as art from './art.js';
import { van, input, auto, step, bindInput, goTo, onBump, onEdge, readStick } from './van.js';
import * as sf from './surfaces.js';
import * as F from './finds.js';
import * as desk from './desk.js';
import * as mat from './mat.js';
import { pgrid, fgrid, MARGIN } from './kit.js';
import * as ui from './ui.js';
import * as audio from './audio.js';

const html = document.documentElement, qs = new URLSearchParams(location.search);
const DEBUG = qs.get('debug') === '1', AUTO = qs.get('auto') !== '0';
const cv = document.getElementById('c'), stage = document.getElementById('stage');
const STEP = 1 / 120, OPEN_ZOOM = 0.66, OPEN_Y = -140;
const TIERS = [2, 1.5, 1.25, 1];
let tier = qs.has('tier') ? Math.max(0, Math.min(3, +qs.get('tier') | 0)) : 0;
const tierPinned = qs.has('tier');

let ctx = null, pat = {}, tileC = {}, booted = false, running = false, raf = 0, lastT = 0, acc = 0;
const view = { w: 390, h: 844, dpr: 2, k: 1, s: 1, tx: 0, ty: 0 };
const cam = { x: 0, y: OPEN_Y, vx: 0, vy: 0, zoom: OPEN_ZOOM, zv: 0, anchor: 0.5 };
const jobs = [];
let frameK = 0, vanA = 1;
let tapScreen = null, sweepT = 0, cineWas = false, slowWin = 0, bootMs = null, fpsAvg = 60, ftAvg = 16, ftN = 0, ftSum = 0, govT = 0, tapRing = null, firstAt = 0, lastTapAt = 0, stampAt = 0, hazeTick = 0;

// The opening frame (spec 2). Portrait, 844 px tall: zoom 0.66 centred on y -140, which shows y -779..499: table from
// edge to edge, inside both tape bands, the van at 62% of the height. A shorter screen (browser bars showing) keeps the
// same bottom edge, so the garage stays in, and gives up zoom only when the first-ad phone would leave the top.
// Landscape: 1060 units of height, from the top of the first-ad tape to the garage mouth.
function openCam() {
  const U = view.h / view.k;                           // units of height on screen at zoom 1
  if (view.w >= view.h) { const z = Math.min(1, U / 1060); return { z, y: 480 - U / z / 2 }; }
  const z = Math.min(OPEN_ZOOM, U / 1130);
  return { z, y: Math.max(OPEN_Y, 499 - U / z / 2) };
}
// The parts of each table that lie past its tape: [tile, x0, y0, x1, y1]. (GHOST is the table grown past its cut edges.)
const GPARTS = [];
for (const [k, t] of [['desk', 'desk'], ['block', 'block'], ['strip', 'ply'], ['mat', 'mat']]) {
  const r = GHOST[k], g = G[k];
  if (r[1] < g[1]) GPARTS.push([t, r[0], r[1], r[2], g[1]]);
  if (r[3] > g[3]) GPARTS.push([t, r[0], g[3], r[2], r[3]]);
  if (r[0] < g[0]) GPARTS.push([t, r[0], g[1], g[0], g[3]]);
  if (r[2] > g[2]) GPARTS.push([t, g[2], g[1], r[2], g[3]]);
}
const cellBuf = [], visF = [];      // reused every frame: the grid cells in view, and the flat things in view
const litNow = [], wb = [0, 0, 0, 0], wg = [0, 0, 0, 0, 0, 0];      // the lit circles in view, the wedge's bounding box and its three corners

// ---------- boot ----------
function fontsReady() {
  const want = ['900 40px "Big Shoulders Stencil"', '700 20px "Shantell Sans"', '700 14px "Overpass"', '400 14px "Overpass"'];
  const all = Promise.all(want.map(f => document.fonts.load(f, 'YOSSI Grunwald 0:30'))).then(r => r.every(x => x && x.length));
  return Promise.race([all, new Promise(res => setTimeout(() => res(false), 8000))]).catch(() => false);
}
async function boot() {
  if (booted) return; booted = true;
  S.reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  F.readWorld();                                   // also starts the first-ad loop, so it is moving at first paint
  const fontsOk = await fontsReady();              // in-world lettering is baked only after the fonts have loaded
  if (!fontsOk) {                                  // never silently: say so, and bake the lettering again if the faces arrive late
    console.warn('[resume] a font face did not load in time: in-world lettering is using the fallback stack');
    document.fonts.ready.then(() => { if (document.fonts.check('900 40px "Big Shoulders Stencil"') && document.fonts.check('700 20px "Shantell Sans"')) F.rebakeLettering(); });
  }
  resize();
  const t0 = performance.now();
  const t = tileC = art.tiles();
  for (const k in t) { if (k === 'tape') continue; pat[k] = ctx.createPattern(t[k], 'repeat'); pat[k].setTransform(new DOMMatrix().scale(k === 'floor' ? 1 : 1 / art.SS)); }      // (the floor's tile is baked at one pixel a unit)
  for (const c of CUTS) {                          // one pattern per tape band, so the hatch starts at the band's own corner
    c.pat = ctx.createPattern(t.tape, 'repeat');
    c.pat.setTransform(c[4] ? new DOMMatrix().translate(c[2], c[1]).rotate(90).scale(1 / art.SS) : new DOMMatrix().translate(c[0], c[1]).scale(1 / art.SS));
  }
  const t1 = performance.now();
  sf.initSurfaces();
  const t2 = performance.now();
  F.bakeFirst();
  bootMs = { tiles: Math.round(t1 - t0), surfaces: Math.round(t2 - t1), sprites: Math.round(performance.now() - t2) };
  jobs.push(...F.bakeJobs());
  // "show me where" may be tapped before the idle bake has reached the thing (always so on #reel, where the loop has
  // not run yet): every job still waiting is run first, so the thing stands, with its collider, before the route is made
  ui.initUI({ pause: stop, resume: start, live: () => running, sound: () => audio.tabTap(), engine: engineTap, where: id => { while (jobs.length) { jobs.shift()(); art.settle(); } F.showWhere(id); } });
  ui.setViewport(view.w, view.h);
  onBump(F.bump); onEdge(() => audio.thud());
  const hnd = { first, tap, toWorld, w: () => view.w, live: () => running };
  bindInput(cv, hnd);
  // a drag that starts on the Play pill (it lies where the thumb rests) drives like any other, and the pill tucks away meanwhile
  for (const id of ['pill', 'links']) hnd.adopt(document.getElementById(id), { drive: () => ui.pillTuck(true), end: () => { if (!F.holdOn()) ui.pillTuck(false); } });
  // A tap on a woken screen plays it (spec 6.3). The player must open inside a real gesture so sound is allowed:
  // touchend for a finger (it counts on iOS, and does not depend on a click following), click for a mouse.
  const playTapped = e => {
    if (performance.now() - lastTapAt > 500 || !tapScreen) return;
    const f = tapScreen; tapScreen = null;
    if (!f.found) return;
    ui.openPlayer(f);
    if (e.type === 'touchend' && e.cancelable) e.preventDefault();    // no second, synthetic click landing on the player
  };
  cv.addEventListener('touchend', playTapped, { passive: false });
  cv.addEventListener('click', playTapped);
  // Sound (audio.js has its own listeners for every tap, click and key). The Start pill lies where the thumb rests too:
  // a drag that begins on it drives, and only then counts as the first touch; a tap on it is its own click.
  audio.init({ change: soundChange });
  hnd.adopt(document.getElementById('startb'), { lazy: true, drive: () => { first(); dropStart(true); } });
  soundBoot();
  cv.addEventListener('touchmove', e => e.preventDefault(), { passive: false });       // older iOS: no scroll, no bounce
  document.addEventListener('gesturestart', e => { if (running) e.preventDefault(); });   // no pinch
  addEventListener('resize', resize); addEventListener('orientationchange', resize);
  document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if ((e.key === 'p' || e.key === 'P') && running) window.ygView(false);
    else if ((e.key === 'r' || e.key === 'R') && html.classList.contains('g')) ui.toggleReel();
    else if ((e.key === 'm' || e.key === 'M') && html.classList.contains('g') && !e.repeat) audio.tabTap();
  });
  if (S.reduced) { cam.zoom = 1; cam.anchor = 0.46; cam.x = van.x; cam.y = van.y; }
  else { const o = openCam(); cam.zoom = o.z; cam.y = o.y; }
  if (DEBUG) debugHooks(fontsOk);
  landName();
  stage.classList.add('on');
  // Deep links (spec 9.8). #ad1: straight onto the first ad's poster with its Play pill; behind it the game is already
  // at the phone, the first ad found. #reel: the reel, open.
  if (location.hash === '#ad1') { first(); F.deepAd1(); cam.x = van.x; cam.y = van.y; cam.zoom = 1; cam.anchor = 0.46; ui.openPoster(S.byId.ad1); }
  else if (location.hash === '#reel') ui.openReel();
  start();
}
function fail(e) { console.error(e); stop(); audio.view(false); if (window.ygDead) window.ygDead(); else html.classList.remove('g'); }    // the plain resume is the page

// The first-paint HTML name does not just fade: each line shrinks onto the same words routed into the hub, so there is
// one name that lands in the wood and never two names on top of each other.
function landName() {
  const k = view.k * cam.zoom, at = wy => view.h * cam.anchor + (wy - cam.y) * k;
  for (const [sel, t] of [['#first .fn', art.hubText.name], ['#first .fr', art.hubText.roles]]) {
    const e = document.querySelector(sel); if (!e || !t) continue;
    const r = e.getBoundingClientRect(); if (!r.width) continue;
    const sc = t.w * k / r.width, dx = view.w / 2 - (r.left + r.width / 2), dy = at(t.cy) - (r.top + r.height / 2);
    e.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' + sc.toFixed(3) + ')';
  }
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  view.w = w; view.h = h; view.dpr = Math.min(TIERS[tier], window.devicePixelRatio || 1);
  // portrait: 390 units wide. Landscape: 900 units tall, or 450 on a short screen (a phone on its side), so the van stays a van
  view.k = w < h ? w / 390 : h / (h < 500 ? 450 : 900);
  cv.width = Math.round(w * view.dpr); cv.height = Math.round(h * view.dpr);
  if (!ctx) ctx = cv.getContext('2d', { alpha: false });
  ui.setViewport(w, h);
}

function start() {
  if (running || !booted || document.hidden || ui.busy() || !html.classList.contains('g')) return;
  running = true; lastT = performance.now(); F.resumeLoops(); raf = requestAnimationFrame(frame);
}
function stop() { if (!running) return; running = false; cancelAnimationFrame(raf); F.pauseLoops(); input.keys.clear(); input.mag = 0; audio.rest(); }

// ---------- input glue ----------
// 0 an ordinary touch · 1 swallowed (the moment has only just begun) · 2 it ended the moment
// fresh: a new touch-down or key press (not the repeat of a key that is held)
function first(fresh) {
  const r = F.threeTouch(fresh !== false);
  if (!S.firstInput) { S.firstInput = true; firstAt = S.rt; van.lights = true; F.tourStop(); }
  return r;
}
function toWorld(cx, cy) { const k = view.s / view.dpr; return [(cx - view.tx / view.dpr) / k, (cy - view.ty / view.dpr) / k]; }
function toScreen(wx, wy) { return [(wx * view.s + view.tx) / view.dpr, (wy * view.s + view.ty) / view.dpr]; }
function tap(wx, wy) {
  if (F.holdOn()) return;
  lastTapAt = performance.now();
  // A tap on a found screen plays it only while its Play pill is up, which is while the van is at it. From further off
  // the same tap drives the van there and raises the pill: nothing with sound starts from across the table.
  const sc = F.screenAt(wx, wy);
  tapScreen = sc && ui.pillIs(sc) ? sc : null;
  if (tapScreen) { tapRing = { x: wx, y: wy, t: 0 }; return; }      // the touchend / click handler opens the player
  const p = (sc && sc.prop) || F.propAt(wx, wy) || F.nearFind(wx, wy, 40);            // a tap beside an unfound thing is meant for it
  if (p) F.goBump(p); else goTo(wx, wy);
  tapRing = { x: p ? wx : auto.x, y: p ? wy : auto.y, t: 0 };       // every registered tap shows a ring
}

// ---------- the loop: fixed 120 Hz step, dt clamped to 33 ms ----------
function frame(now) {
  if (!running) return;
  raf = requestAnimationFrame(frame);
  const rdt = Math.min(0.033, Math.max(0, (now - lastT) / 1000)), raw = now - lastT; lastT = now;
  S.rt += rdt; art.clock(S.rt);
  if (S.slow > 0) S.slow -= rdt;
  const dt = rdt * (S.slow > 0 ? 0.3 : 1);
  S.t += dt;

  if (AUTO && !S.firstInput && S.rt >= tourAt) F.tourStart();
  van.drag = sf.paper.inPile ? 0.8 : sf.flourAt(van.x + Math.cos(van.a) * sf.NOSE, van.y + Math.sin(van.a) * sf.NOSE) === 2 ? 0.85 : 1;
  // The moment holds the van still. A thumb that stayed down and keeps steering ends it early once the
  // first 0.8 s are over; when the moment is over, by itself or not, that thumb has the van again without having to move.
  // (The app's moment is not ended by that thumb until its screen has begun to turn: threeTouch(false) says so, and
  // the thumb's place is noted again, so it is asked once more only when it has moved again.)
  const st = input.stick;
  if (F.holdOn() && st) {
    if (!input.hold || st.hx === undefined) { st.hx = st.x; st.hy = st.y; }
    else if (F.holdT() >= 0.8 && Math.hypot(st.x - st.hx, st.y - st.hy) > 10 && F.threeTouch(false) !== 2) { st.hx = st.x; st.hy = st.y; }
  }
  const hold = F.holdOn();
  if (input.hold && !hold && st) { st.dead = false; input.hold = false; readStick(st); }
  input.hold = hold;
  acc += dt;
  while (acc >= STEP) { step(STEP); acc -= STEP; trailTick(); }
  if (van.squash > 0) van.squash = Math.max(0, van.squash - rdt / 0.14);
  sf.updatePaper(dt, van);
  if (sf.paper.hits && Math.random() < 0.5) sf.emit(2, van.x, van.y, van.vx * 0.3, van.vy * 0.3 - 60, 0.6, 4);
  sf.updateParts(dt);
  F.update(dt, rdt);
  ui.tickPill(van);
  if (tapRing) { tapRing.t += rdt; if (tapRing.t > 0.45) tapRing = null; }
  tickTab(rdt);
  try { soundTick(rdt); } catch (e) { /* sound never stops the loop */ }
  updateCamera(rdt);
  art.lowRes((F.three.on && F.three.lift) || cam.zoom < 0.8);      // the camera is up (or still coming down): no sprite is baked again for the overview
  render(acc / STEP);
  ui.updateLabels(toScreen, van, ui.pillUp());

  // idle baking: 4 ms slices
  if (jobs.length) { const t0 = performance.now(); do { jobs.shift()(); art.settle(); } while (jobs.length && performance.now() - t0 < 4); }
  // three times a second: sprites far from the view are let go, the ones coming back are queued to be baked again (spec 9.6)
  // While the whole table is on screen (the moment) nothing is baked again: let-go sprites show their small
  // stand-ins. When the camera is about to go to the app phone, what stands there is made ready at once.
  if (F.cine.on && !cineWas) sweepT = 0;
  cineWas = F.cine.on;
  if ((sweepT -= rdt) <= 0) {
    sweepT = 0.3; const v = S.vr, mg = 260, c = F.cine;
    // (the second place is what the close view of the tray will show, and no more: while the whole desk is on screen it is the only thing made ready)
    art.sweep([v[0] - mg, v[1] - mg, v[2] + mg, v[3] + mg], jobs, c.on ? [c.x - 270, c.y - 430, c.x + 270, c.y + 430] : null);
  }
  govern(raw, rdt);
}

// tyre marks, the flour furrow and the flour it throws: every 6 units of travel
function trailTick() {
  if (van.odo - stampAt < 6) return;
  stampAt = van.odo;
  const hx = Math.cos(van.a), hy = Math.sin(van.a), pl = sf.stamp(van.x, van.y, hx, hy);
  if (!pl) return;
  // A heap throws two discs a tick (about 50 in the air at full speed, inside the particle budget), the haze one small disc every 12 units. Seven in ten go out sideways off a rear
  // wheel, the rest straight back, fast enough (120 to 220 u/s) to clear the furrow and land beyond its bank.
  const n = pl === 2 ? 2 : (hazeTick ^= 1);
  for (let i = 0; i < n; i++) {
    const side = Math.random() < 0.5 ? -1 : 1, back = Math.random() < 0.3, sp = 120 + Math.random() * 100, size = pl === 2 ? 3 + Math.random() * 3 : 2.5 + Math.random() * 1.5;
    const ux = back ? -hx : -hy * side, uy = back ? -hy : hx * side;
    sf.emit(0, van.x - hx * 12 - hy * side * 11.7, van.y - hy * 12 + hx * side * 11.7, ux * sp + van.vx * 0.15, uy * sp + van.vy * 0.15, 0.45, size);
  }
}

// ---------- camera: critically damped spring, omega 9, look-ahead 90 units at full speed ----------
function spring(o, kx, kv, target, w, dt) {
  const d = o[kx] - target, e = Math.exp(-w * dt), tmp = (o[kv] + w * d) * dt;
  o[kv] = (o[kv] - w * tmp) * e; o[kx] = target + (d + tmp) * e;
}
// the whole slice, fitted to the screen's width, under a band at the top that is kept clear for the four strips
function fitWhole() {
  const band = view.h >= 620 ? 300 : 0, room = view.h - band - 24, top = GHOST.desk[1] - 112, bw = BOX[2] - BOX[0] + 80, bh = BOX[3] - top + 50;
  return { zoom: Math.min(view.w / view.k / bw, room / view.k / bh), anchor: (band + room / 2) / view.h, y: (top + BOX[3]) / 2 };
}
// one table, fitted under the same band (the desk's phones stand 112 units past its north edge)
function fitTable(r) {
  const band = view.h >= 620 ? 300 : 0, room = view.h - band - 24, top = r[1] - (r === G.desk ? 112 : 30), bw = r[2] - r[0] + 80, bh = r[3] - top + 50;
  return { zoom: Math.min(0.6, view.w / view.k / bw, room / view.k / bh), anchor: (band + room / 2) / view.h, x: (r[0] + r[2]) / 2, y: (top + r[3]) / 2 };
}
function updateCamera(dt) {
  let tx, ty, tz, ta, wz = 3, wp = 9;
  if (F.three.on && F.three.lift) {
    // The moment: the camera shows each section's table as its strip lands, and the whole floor only with the last
    // strip, so the sections are met in turn and the widest view is the one all the strips are read over.
    const th = F.three, r = th.n < th.tr.length ? { w: G.desk, k: G.block, v: G.mat, g: G.belt }[th.tr[Math.max(0, th.n - 1)]] : null;
    if (r) { const f = fitTable(r); tx = f.x; ty = f.y; tz = f.zoom; ta = f.anchor; }
    else { const f = fitWhole(); tx = (BOX[0] + BOX[2]) / 2; ty = f.y; tz = f.zoom; ta = f.anchor; }
    wz = 10; wp = 11;
  }
  else if (F.cine.on && F.cine.wide) { tx = 0; ty = -850; tz = Math.min(view.w / view.k / 960, view.h / view.k / 1420); ta = 0.5; wz = 7; }      // the app's moment: first the whole desk, while it clears
  else if (F.cine.on) { tx = F.cine.x; ty = F.cine.y; tz = Math.min(F.cine.z, view.h / view.k / 400); ta = 0.5; wz = 9; }      // then the tray, close enough to read
  else if (!S.firstInput && !S.reduced) { const o = openCam(); tx = 0; ty = o.y; tz = o.z; ta = 0.5; wz = 7; }
  else {
    tx = van.x + van.vx * (90 / 340); ty = van.y + van.vy * (90 / 340); ta = 0.46;
    // at the far end of the desk the view leans north, up to 96 units, so the app phone is in full view before the van reaches it
    if (van.y < -1040 && van.x > G.desk[0] && van.x < G.desk[2]) ty -= Math.min(140, (-1040 - van.y) * 0.6);
    tz = S.reduced ? 1 : 1 - 0.12 * Math.min(1, van.speed / 340);
    if (S.rt - firstAt < 1.1 || F.three.on || S.rt - (F.cine.endAt || -9) < 1.2) wz = 6;
    // keep most of the screen on the tables: near an edge the van moves off-centre instead of the floor filling the view.
    // The tables make a cross, so the edges that count are the ones of the arm the van is on.
    const vw = view.w / (view.k * cam.zoom), vh = view.h / (view.k * cam.zoom), D = G.desk;
    const onDesk = van.y < D[3], inCol = van.x > D[0] && van.x < D[2], south = van.y > G.strip[3], east = van.x > G.mat[0];
    // (the mat is an L: south of the strip its west edge is the edge that counts, and only the mat reaches the far south)
    const x0 = onDesk ? D[0] : south ? G.mat[0] : BOX[0], x1 = onDesk ? D[2] : BOX[2], y0 = inCol ? BOX[1] : D[3], y1 = east ? BOX[3] : G.strip[3];
    // (In front of the app phone the view is let 30% past the desk's north edge, not 16%: the phone stands 170 units
    // above that edge and must clear the top bar. The extra eases off to nothing 330 units either side of it.)
    const nf = inCol ? 0.16 + 0.14 * Math.max(0, Math.min(1, (330 - Math.abs(van.x)) / 150)) : 0.16;
    const lx = x0 - vw * 0.14 + vw / 2, hx = x1 + vw * 0.14 - vw / 2, ly = y0 - vh * nf + vh * ta, hy = y1 + vh * 0.13 - vh * (1 - ta);
    if (lx < hx) tx = tx < lx ? lx : tx > hx ? hx : tx;
    if (ly < hy) ty = ty < ly ? ly : ty > hy ? hy : ty;
    // A screen that has just been found (or bumped again) is framed: for 2.5 s, and for as long as the van stays within
    // 140 units of it, the whole screen and 16 px round it are kept inside the safe area (8 px in from the sides, under
    // the top bar, over the Play pill). In over 0.4 s, out over 0.8 s. A screen wider than that area is centred.
    const ff = F.framing.f, fr = ff && ff.scr;
    const want = !!fr && (S.rt - F.framing.at < 2.5 || Math.hypot(van.x - ff.x, van.y - ff.y) < 140);
    frameK = want ? Math.min(1, frameK + dt / 0.4) : Math.max(0, frameK - dt / 0.8);
    if (frameK > 0 && fr) {
      const kz = view.k * cam.zoom, hw = (view.w / 2 - 24) / kz, up = (view.h * ta - 124) / kz, dn = (view.h * (1 - ta) - 148) / kz, e = frameK * frameK * (3 - 2 * frameK);
      const cx = fr[2] - hw > fr[0] + hw ? (fr[0] + fr[2]) / 2 : Math.max(fr[2] - hw, Math.min(fr[0] + hw, tx));
      const cy = fr[3] - dn > fr[1] + up ? (fr[1] + fr[3]) / 2 : Math.max(fr[3] - dn, Math.min(fr[1] + up, ty));
      tx += (cx - tx) * e; ty += (cy - ty) * e;
    }
  }
  if (S.look) { tx = S.look[0]; ty = S.look[1]; tz = S.look[2]; ta = 0.5; wz = 9; }      // ?debug=1: __g.look(x, y, zoom) holds the camera on a place
  spring(cam, 'x', 'vx', tx, wp, dt); spring(cam, 'y', 'vy', ty, wp, dt); spring(cam, 'zoom', 'zv', tz, wz, dt);
  cam.anchor += (ta - cam.anchor) * Math.min(1, dt * 5);
}

// ---------- the frame ----------
function render(al) {
  const W = cv.width, H = cv.height, s = view.s = view.k * cam.zoom * view.dpr;
  const tx = view.tx = W / 2 - cam.x * s, ty = view.ty = H * cam.anchor - cam.y * s;
  const x0 = -tx / s, y0 = -ty / s, x1 = x0 + W / s, y1 = y0 + H / s;
  S.vr[0] = x0; S.vr[1] = y0; S.vr[2] = x1; S.vr[3] = y1;
  const D = G.desk, B = G.block, M = G.mat, T = G.strip, Wd = WOODS, spr = F.spr;
  // before the first touch the van creeps forward and back once, in step with the ghost thumb under it
  const gu = !S.firstInput && !S.reduced && S.rt - hintAt > 0.75 && S.rt - hintAt < 1.5 ? (S.rt - hintAt - 0.75) / 0.75 : -1, creep = gu >= 0 ? Math.sin(gu * Math.PI) * 18 : 0;
  const vx = van.px + (van.x - van.px) * al + Math.cos(van.a) * creep, vy = van.py + (van.y - van.py) * al + Math.sin(van.a) * creep;
  const vsurf = surfaceAt(vx, vy), matOn = M[0] < x1 && M[2] + 30 > x0 && M[1] < y1 && M[3] + 30 > y0;
  const rect = r => ctx.rect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
  const fill = r => ctx.fillRect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
  const vv = { x: vx, y: vy, a: van.a };
  // What is lit on the mat this frame (spec 8.4): the headlight wedge and the lit circles that are in view, as one path.
  const lp = new Path2D(); let litN = 0;
  if (van.lights) {
    sf.wedgePath(lp, vv);
    const a = van.a, d = 0.384, R = 260 / Math.cos(d);
    wg[0] = vx + Math.cos(a) * 28; wg[1] = vy + Math.sin(a) * 28; wg[2] = wg[0] + Math.cos(a - d) * R; wg[3] = wg[1] + Math.sin(a - d) * R; wg[4] = wg[0] + Math.cos(a + d) * R; wg[5] = wg[1] + Math.sin(a + d) * R;
    wb[0] = Math.min(wg[0], wg[2], wg[4]); wb[1] = Math.min(wg[1], wg[3], wg[5]); wb[2] = Math.max(wg[0], wg[2], wg[4]); wb[3] = Math.max(wg[1], wg[3], wg[5]);
  }
  if (matOn) for (const c of F.lit) { if (c[0] + c[2] < x0 - 40 || c[0] - c[2] > x1 + 40 || c[1] + c[2] < y0 - 20 || c[1] - c[2] > y1 + 130) continue; lp.moveTo(c[0] + c[2], c[1]); lp.arc(c[0], c[1], c[2], 0, 6.2832); litNow[litN++] = c; }
  const anyLit = van.lights || litN > 0;
  // a standing thing on the mat: 1 = lit (its foot is inside a lit circle) · 2 = the light crosses it · 0 = dark
  const litState = p => {
    for (let i = 0; i < litN; i++) { const c = litNow[i], dx = p.x - c[0], dy = p.y - c[1], r = c[2] - 3; if (dx * dx + dy * dy <= r * r) return 1; }
    const b = p.bb || p.sp.bb, ax = p.x + b[0], ay = p.y + b[1], bx = p.x + b[2], by = p.y + b[3];
    if (van.lights && bx > wb[0] && ax < wb[2] && by > wb[1] && ay < wb[3]) return 2;
    for (let i = 0; i < litN; i++) { const c = litNow[i]; if (bx > c[0] - c[2] && ax < c[0] + c[2] && by > c[1] - c[2] && ay < c[1] + c[2]) return 2; }
    return 0;
  };
  const inWedge = (x, y) => {
    const s1 = (wg[2] - wg[0]) * (y - wg[1]) - (wg[3] - wg[1]) * (x - wg[0]), s2 = (wg[4] - wg[2]) * (y - wg[3]) - (wg[5] - wg[3]) * (x - wg[2]), s3 = (wg[0] - wg[4]) * (y - wg[5]) - (wg[1] - wg[5]) * (x - wg[4]);
    return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
  };

  // 1. floor: poured slabs, and the hard shadow of every built table on it (never under what lies past the tape)
  ctx.setTransform(s, 0, 0, s, tx, ty); ctx.globalAlpha = 1;
  ctx.fillStyle = pat.floor; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.fillStyle = 'rgba(20,17,15,.45)';
  for (const k of ['desk', 'block', 'strip', 'mat']) { const r = G[k]; ctx.fillRect(r[0] + 26, r[1] + 18, r[2] - r[0], r[3] - r[1]); }

  // 2. tables. Past a cut edge of the slice the same table carries on with the lights off: its own tile, opaque, the
  // and over that one veil of the floor colour. Drawn only where the view reaches it. (The desk is whole: it has no such part.)
  let gn = 0;
  for (const q of GPARTS) {
    q.on = q[1] < x1 && q[3] > x0 && q[2] < y1 && q[4] > y0; if (!q.on) continue;
    gn++;
    ctx.fillStyle = pat[q[0]]; ctx.fillRect(q[1], q[2], q[3] - q[1], q[4] - q[2]);
  }
  if (gn) { ctx.fillStyle = 'rgba(35,40,43,.78)'; for (const q of GPARTS) if (q.on) ctx.fillRect(q[1], q[2], q[3] - q[1], q[4] - q[2]); }
  ctx.fillStyle = pat.desk; fill(D); desk.drawPlan(ctx); ctx.fillStyle = pat.block; fill(B); ctx.fillStyle = pat.ply; fill(T);
  if (x0 < D[0] + 8 || x1 > D[2] - 8 || y0 < D[1] + 8) {              // the desk's own edges, west, north and east: a banded edge, lit on its inner lip
    const dw = D[2] - D[0], dh = D[3] - D[1];
    ctx.fillStyle = '#B3C0CC'; ctx.fillRect(D[0], D[1], dw, 3.4); ctx.fillRect(D[0], D[1], 3.4, dh); ctx.fillRect(D[2] - 3.4, D[1], 3.4, dh);
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(D[0] + 3.4, D[1] + 3.4, dw - 6.8, 1.2); ctx.fillRect(D[0] + 3.4, D[1] + 3.4, 1.2, dh - 3.4); ctx.fillRect(D[2] - 4.6, D[1] + 3.4, 1.2, dh - 3.4);
    ctx.fillStyle = 'rgba(20,17,15,.3)'; ctx.fillRect(D[0], D[1], dw, 0.9); ctx.fillRect(D[0], D[1], 0.9, dh); ctx.fillRect(D[2] - 0.9, D[1], 0.9, dh);
  }
  if (matOn) {
    const woodsOn = Wd[0] < x1 && Wd[1] < y1;
    // the mat's print has one long diagonal every 256 units: ruled here (two or three strokes), so its tiles can be a quarter the size
    const diag = col => {
      ctx.strokeStyle = col; ctx.lineWidth = 0.6; ctx.beginPath();
      for (let c = Math.ceil((Math.max(x0, M[0]) + Math.max(y0, M[1])) / 256) * 256; c <= Math.min(x1, M[2]) + Math.min(y1, M[3]); c += 256) { const xa = Math.max(M[0], c - M[3]), xb = Math.min(M[2], c - M[1]); if (xb > xa) { ctx.moveTo(xa, c - xa); ctx.lineTo(xb, c - xb); } }
      ctx.stroke();
    };
    ctx.fillStyle = pat.mat; fill(M); diag(PAL.matGrid);
    if (woodsOn) { ctx.fillStyle = pat.woods; fill(Wd); }
    ctx.save(); ctx.beginPath(); rect(M); ctx.clip();
    if (anyLit) { ctx.save(); ctx.clip(lp); ctx.fillStyle = pat.matLit; ctx.fillRect(Math.max(M[0], x0), Math.max(M[1], y0), Math.min(M[2], x1) - Math.max(M[0], x0), Math.min(M[3], y1) - Math.max(M[1], y0)); diag(PAL.matLitGrid); if (woodsOn) { ctx.fillStyle = pat.woodsLit; fill(Wd); } ctx.restore(); }
    if (van.lights) {                                                 // the warm hot spot at the lamps: two steps, each ending in an arc
      ctx.beginPath(); sf.sectorPath(ctx, vv, 130); ctx.fillStyle = 'rgba(255,196,107,.07)'; ctx.fill();
      ctx.beginPath(); sf.sectorPath(ctx, vv, 70); ctx.fillStyle = 'rgba(255,196,107,.14)'; ctx.fill();
    }
    if (vsurf === 'mat') { ctx.fillStyle = vx > Wd[0] && vy > Wd[1] ? PAL.woodsLit : PAL.matLit; ctx.beginPath(); ctx.ellipse(vx + Math.cos(van.a) * 4, vy + Math.sin(van.a) * 4, 32, 20, 0, 0, 6.2832); ctx.fill(); }   // the van's own spill
    ctx.restore();
    ctx.fillStyle = PAL.matGrid; const q = 9, mw = M[2] - M[0] - 2 * q, mh = M[3] - M[1] - 2 * q;                     // the mat's printed border
    ctx.fillRect(M[0] + q, M[1] + q, mw, 1.6); ctx.fillRect(M[0] + q, M[3] - q - 1.6, mw, 1.6); ctx.fillRect(M[0] + q, M[1] + q, 1.6, mh); ctx.fillRect(M[2] - q - 1.6, M[1] + q, 1.6, mh);
    if (woodsOn) {                                                    // the green mat lies on the dark one: its two free edges, a lip and the line it throws
      const edge = (lip, dark) => { ctx.fillStyle = dark; ctx.fillRect(Wd[0] - 2.2, Wd[1] - 2.2, Wd[2] - Wd[0] + 2.2, 2.2); ctx.fillRect(Wd[0] - 2.2, Wd[1], 2.2, Wd[3] - Wd[1]); ctx.fillStyle = lip; ctx.fillRect(Wd[0], Wd[1], Wd[2] - Wd[0], 1.6); ctx.fillRect(Wd[0], Wd[1], 1.6, Wd[3] - Wd[1]); };
      edge('#1D4D39', '#060D0B');
      if (anyLit) { ctx.save(); ctx.clip(lp); edge('#4FB286', '#0E1A17'); ctx.restore(); }
    }
  }
  ctx.fillStyle = 'rgba(20,17,15,.5)';                               // seams where the tables meet
  ctx.fillRect(B[0], D[3] - 1, M[2] - B[0], 2); ctx.fillRect(T[0] - 1, T[1], 2, T[3] - T[1]); ctx.fillRect(T[2] - 1, T[1], 2, T[3] - T[1]);

  // 3. trail canvas · 5. flour canvas · light lying on the ground · the tape on the cut edges · then the hub, which is never floury
  sf.drawTrails(ctx, x0, y0, x1, y1);
  if (B[0] < x1 && B[2] > x0 && B[1] < y1 && B[3] > y0) ctx.drawImage(sf.flour, B[0], B[1], B[2] - B[0], B[3] - B[1]);
  F.drawGround(ctx);
  const tapes = mode => {                                            // 0 the lit tables · 1 the mat, in the dark · 2 the mat, inside the light
    for (const c of CUTS) {
      if (!!c[5] !== (mode > 0) || c[2] < x0 || c[0] > x1 || c[3] < y0 || c[1] > y1) continue;
      if (!mode) { ctx.fillStyle = 'rgba(20,17,15,.28)'; ctx.fillRect(c[0] + 1.6, c[1] + 2.2, c[2] - c[0], c[3] - c[1]); }
      ctx.fillStyle = c.pat; ctx.fillRect(c[0], c[1], c[2] - c[0], c[3] - c[1]);
      if (mode === 1) { ctx.fillStyle = 'rgba(12,22,20,.8)'; ctx.fillRect(c[0], c[1], c[2] - c[0], c[3] - c[1]); }
    }
  };
  tapes(0); if (matOn) tapes(1);
  ctx.fillStyle = 'rgba(20,17,15,.22)'; ctx.beginPath(); ctx.arc(3.6, 2.4, HUB_R, 0, 6.2832); ctx.fill();      // the hub's hard shadow: one disc
  art.drawSpr(ctx, spr.hub, 0, 0); F.drawDashes(ctx);

  // 6a. flat things: cards and dressing (dark on the mat, then the lit twins inside the light), then paper
  let matFlats = false; visF.length = 0;
  for (const a of gridCells(fgrid, x0 - MARGIN, y0 - MARGIN, x1 + MARGIN, y1 + MARGIN, cellBuf)) for (const p of a) {
    const b = p.sp.bb; if (p.x + b[2] < x0 || p.x + b[0] > x1 || p.y + b[3] < y0 || p.y + b[1] > y1) continue;
    visF.push(p);
  }
  for (const p of visF) {
    if (p.onMat) { matFlats = true; art.drawSpr(ctx, p.dark, p.x, p.y); } else if (p.draw) p.draw(ctx, p); else { art.drawShadow(ctx, p.sp, p.x, p.y); art.drawSpr(ctx, p.sp, p.x, p.y); }
  }
  if (matOn) F.matLines(ctx, 0);                                      // the two long cables: a dark line each
  if (matOn && anyLit) {                                              // 7. the lit pass: one clip
    ctx.save(); ctx.beginPath(); rect(M); ctx.clip(); ctx.clip(lp);
    F.matLines(ctx, 1);
    if (matFlats) for (const p of visF) if (p.onMat) art.drawSpr(ctx, p.sp, p.x, p.y);
    ctx.restore();
  }
  sf.drawPaper(ctx, spr.sheets, view, x0, y0, x1, y1);

  // 6b. hard shadows and the warm wedge, only on the lit tables (none on the mat, none on the floor)
  ctx.save(); ctx.beginPath(); rect(D); rect(B); rect(T); ctx.moveTo(HUB_R, 0); ctx.arc(0, 0, HUB_R, 0, 6.2832); ctx.clip();
  const list = [];
  for (const a of gridCells(pgrid, x0 - MARGIN, y0 - MARGIN, x1 + MARGIN, y1 + MARGIN, cellBuf)) for (const p of a) {
    const b = p.bb || p.sp.bb; if (p.x + b[2] + 80 < x0 || p.x + b[0] > x1 || p.y + b[3] + 60 < y0 || p.y + b[1] > y1) continue;
    list.push(p); if (!p.onMat) { art.drawShadow(ctx, p.sp, p.x, p.y); if (p.sp2) art.drawShadow(ctx, p.sp2, p.x, p.y); }
  }
  const hi = ((Math.round(van.a / 6.283185307 * 64) % 64) + 64) % 64, vsp = F.vanFrame(hi);
  // on the taped sheet, once it has turned over, the van goes 35% see-through like a tall thing with the van behind it: the sentence is the one long read
  const ln = S.byId.line, onLine = ln && ln.found && Math.abs(vx - ln.x) < 102 && Math.abs(vy - ln.y) < 135;
  vanA += ((onLine ? 0.35 : 1) - vanA) * 0.2;
  if (vsurf !== 'mat') { if (vanA < 0.99) ctx.globalAlpha = vanA; art.drawShadow(ctx, vsp, vx, vy); ctx.globalAlpha = 1; }
  // Off the mat the wedge is a faint warm shape, drawn plainly (adding light to a near-white table clips to a blank
  // triangle) and kept short, so the long hard wedge stays special to the dark mat.
  if (van.lights) { ctx.fillStyle = vsurf === 'hub' || vsurf === 'strip' ? 'rgba(255,205,125,.24)' : 'rgba(255,196,107,.15)'; ctx.beginPath(); sf.wedgePath(ctx, vv, 150); ctx.fill(); }
  desk.drawLights(ctx, vx, vy);                                       // the bench lamp's pool, once it follows the van
  ctx.restore();

  // 6c. props and the van, sorted by the y of their base. Tall props turn 35% see-through while the van is behind them.
  const VAN = { sortY: vy + 9, van: true }; list.push(VAN); list.sort((a, b) => a.sortY - b.sortY);
  for (const p of list) {
    if (p.van) {
      if (vanA < 0.99) ctx.globalAlpha = vanA; drawVan(vsp, vx, vy); ctx.globalAlpha = 1;
      // (on the read sheet the van is a ghost, so the sentence is read through it: a thin ink line round it says where it is)
      if (vanA < 0.9) { ctx.save(); ctx.translate(vx, vy - 9); ctx.rotate(van.a); ctx.globalAlpha = (1 - vanA) * 0.85; ctx.strokeStyle = PAL.ink; ctx.lineWidth = 1.4; ctx.beginPath(); art.rr(ctx, -30, -15.5, 60, 31, 6); ctx.stroke(); ctx.restore(); }
      continue;
    }
    // (thru: how far a tall thing fades while the van is behind it; 35% unless it says otherwise)
    if (p.tall) { const t = p.tall, behind = p.fade ? p.fade(vx, vy) : vy < p.sortY - 4 && vx > t[0] - 6 && vx < t[1] + 6 && vy > t[2]; p.alpha += ((behind ? p.thru || 0.35 : 1) - p.alpha) * 0.2; }
    if (p.alpha < 0.99) ctx.globalAlpha = p.alpha;
    const q = p.squash;
    if (q > 0) { ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1 + 0.05 * q, 1 - 0.08 * q); ctx.translate(-p.x, -p.y); }
    if (p.onMat && p.dark) {                                          // on the mat (spec 8.4): a dark shape, lit only where the light is
      const st = litState(p);
      if (st !== 1) { if (p.dark !== true) art.drawSpr(ctx, p.dark, p.x, p.y); if (p.glow) p.glow(ctx, p); }      // dark: a twin sprite, or true when glow() draws the dark shape itself
      if (st === 1) { if (p.draw) p.draw(ctx, p); else art.drawSpr(ctx, p.sp, p.x, p.y); }
      else if (st === 2) { ctx.save(); ctx.clip(lp); if (p.draw) p.draw(ctx, p); else art.drawSpr(ctx, p.sp, p.x, p.y); ctx.restore(); }
      if (st === 2 && p.glints && van.lights) for (let i = 0; i < p.glints.length; i++) {      // reflective tape flares inside the headlights, nowhere else
        const gx = p.x + p.glints[i][0], gy = p.y + p.glints[i][1]; if (!inWedge(gx, gy)) continue;
        const k = 0.55 + 0.45 * Math.sin(S.rt * 8 + i * 2.3 + p.x), r = 8.5 * k, t = 1.5 * k;
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath();
        ctx.moveTo(gx, gy - r); ctx.lineTo(gx + t, gy - t); ctx.lineTo(gx + r, gy); ctx.lineTo(gx + t, gy + t); ctx.lineTo(gx, gy + r); ctx.lineTo(gx - t, gy + t); ctx.lineTo(gx - r, gy); ctx.lineTo(gx - t, gy - t);
        ctx.closePath(); ctx.fill();
      }
    } else if (p.draw) p.draw(ctx, p); else art.drawSpr(ctx, p.sp, p.x, p.y);
    if (p.over) p.over(ctx, vx, vy);                                  // a bedsheet: the van behind it, as a shadow on the cloth
    const f = p.find || p.say || p.tabFor; if (f && f.tabOn && f.tabSp && !p.noTab) { const t = f.tabAt; ctx.save(); ctx.translate(t[0], t[1]); ctx.rotate(t[2]); art.drawSpr(ctx, f.tabSp, 0, 0); ctx.restore(); }
    if (q > 0) ctx.restore();
    ctx.globalAlpha = 1;
  }

  if (matOn) mat.drawChase(ctx);                                      // the flares that run down the dolly track to the gate and the ember
  // cards on their way to the tray fly over everything
  desk.drawOver(ctx, x0, y0, x1, y1);

  // 8. particles
  sf.drawParts(ctx, spr, view);

  // the moment: each main section's table outlined in its own colour, one after another, while the camera is up
  // (a section with nothing found yet: a pencilled outline, dashed)
  if (F.three.on && F.three.t < F.three.up + 0.3) {
    const n = F.three.n, tr = F.three.tr, lw = 7 / (view.k * cam.zoom) * 0.5 + 5, h = lw / 2, RECT = { w: D, k: B, v: M, g: G.belt }; ctx.lineJoin = 'round';
    for (let i = 0; i < tr.length && i < n; i++) {
      const r = RECT[tr[i]]; if (!r) continue;
      const pen = !S.tracks[tr[i]]; ctx.lineWidth = pen ? lw * 0.5 : lw; ctx.strokeStyle = pen ? '#8E969B' : TRACK[tr[i]].strong; ctx.setLineDash(pen ? [lw * 2, lw * 1.6] : []);
      ctx.strokeRect(r[0] + h, r[1] + h, r[2] - r[0] - lw, r[3] - r[1] - lw);
    }
    ctx.setLineDash([]);
  }
  if (tapRing) { const u = tapRing.t / 0.45; ctx.globalAlpha = 1 - u; ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(tapRing.x, tapRing.y, 8 + u * 22, (8 + u * 22) * 0.8, 0, 0, 6.2832); ctx.stroke(); ctx.strokeStyle = PAL.van; ctx.lineWidth = 1.2; ctx.stroke(); ctx.globalAlpha = 1; }

  // screen space: the floating stick, and once, the ghost thumb under the van
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  const st = input.stick;
  if (st && st.live && !st.dead && !st.edge) {
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(20,17,15,.22)'; ctx.beginPath(); ctx.arc(st.cx, st.cy, 35, 0, 6.2832); ctx.stroke();
    ctx.strokeStyle = 'rgba(244,241,232,.4)'; ctx.beginPath(); ctx.arc(st.cx, st.cy, 33.5, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = 'rgba(244,241,232,.22)'; ctx.beginPath(); ctx.arc(st.x, st.y, 13, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = 'rgba(20,17,15,.25)'; ctx.lineWidth = 1.2; ctx.stroke();
  }
  drawTab();
  if (gu >= 0) {
    // an empty ring, never a disc: it starts 194 units below the van, under the roles line and the south arrow, and
    // slides up 85 units once (128 px and 56 px in the 844 px opening), so it never circles a word on the hub
    const a = gu < 0.15 ? gu / 0.15 : gu > 0.75 ? (1 - gu) / 0.25 : 1, kk = s / view.dpr, up = Math.sin(Math.min(1, gu / 0.65) * 1.5708);
    const gx = (van.x * s + tx) / view.dpr, gy = (van.y * s + ty) / view.dpr + (194 - 85 * up) * kk;
    ctx.globalAlpha = a * 0.9; ctx.lineWidth = 2; ctx.strokeStyle = PAL.van; ctx.beginPath(); ctx.arc(gx, gy, 22, 0, 6.2832); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(20,17,15,.45)'; ctx.beginPath(); ctx.arc(gx, gy, 23.5, 0, 6.2832); ctx.stroke(); ctx.globalAlpha = 1;
  }
}

// ---------- sound: what the loop tells audio.js, the Start pill, the speaker tab's tape ----------
// On an iPhone a drag cannot switch sound on, only a tap can (game/IOS-AUDIO.md). So the opening offers one tap first:
// the Start pill. Driving is never held back by it: a drag, or a Play pill that needs its place, sends it away, and the
// speaker tab then says "Tap for sound" for four seconds. Whatever tap unlocks sound first, the motor starts once.
let sndT = 0, sndPaper = 0, startOn = false, started = false, flick = -1, hintAt = 0, tourAt = 1.5, lockT = 0, tipDone = false;
function soundBoot() {
  if (!audio.can()) return;
  ui.soundTab(audio.live(), !audio.muted(), true);
  if (!audio.muted() && !audio.live() && location.hash !== '#ad1') { startOn = true; ui.startPill(true); }
  if (DEBUG) {                                       // one small line at the bottom left: what the audio is doing, and what unlocked it
    const d = document.createElement('div'), a = audio.debug();
    d.id = 'adbg'; d.style.cssText = 'position:absolute;z-index:30;left:calc(6px + env(safe-area-inset-left));bottom:calc(3px + env(safe-area-inset-bottom));max-width:calc(100% - 12px);font:700 8.5px/1.25 var(--road);letter-spacing:0;color:#F4F1E8;background:rgba(20,17,15,.72);padding:2px 5px 1px;border-radius:3px;pointer-events:none';
    stage.appendChild(d);
    setInterval(() => { try { d.textContent = a.line(); } catch (e) { /* the line is a help, never a cost */ } }, 250);
  }
}
function soundChange(live, wanted) {
  ui.soundTab(live, wanted);
  if (live || !wanted) dropStart(false);
}
// the Start pill leaves. tip: the player went on without it, so the speaker tab says how to get sound
function dropStart(tip) {
  if (startOn) { startOn = false; ui.startPill(false); }
  if (tip && !audio.live() && !audio.muted()) { tipDone = true; ui.soundTip(true); }
}
// A tap on the Start pill (audio.js has already asked for sound inside this same tap). The opening's own beat follows
// it: the ghost thumb and the idle tour wait for the motor to have started, unless they were already under way.
function engineTap() {
  dropStart(false);
  if (S.firstInput || S.rt >= tourAt) return;
  if (S.rt - hintAt < 0.75) { hintAt = S.rt + 0.35; tourAt = hintAt + 1.5; } else tourAt = Math.max(tourAt, S.rt + 1.3);
}
const overLine = t => !!t && Math.abs(van.x) < t.w / 2 + 6 && Math.abs(van.y - t.cy - 6) < t.h / 2 + 8;      // the van is over a routed line of the hub
function soundTick(rdt) {
  const st = input.stick;
  if (startOn && ((st && st.live) || ui.pillUp() || (S.firstInput && S.rt - firstAt > 0.6))) dropStart(true);
  // sound is on but still locked, and the Start pill has gone: say so once (again only after sound has been heard and lost)
  if (!startOn && S.firstInput && audio.can() && !audio.muted() && !audio.live()) { lockT += rdt; if (lockT > 0.7 && !tipDone) { tipDone = true; ui.soundTip(true); } }
  else { lockT = 0; if (audio.live()) tipDone = false; }
  // the first time sound is really running the motor is started: a cough, it catches, and the headlights flick
  if (!started && audio.live()) { started = true; if (audio.starter() && van.speed < 30 && !auto.on) flick = 0; }
  if (flick >= 0) { flick += rdt; van.lights = !(flick < 0.09 || (flick > 0.19 && flick < 0.26)); if (flick > 0.3) { flick = -1; van.lights = true; } }
  sndPaper += sf.paper.hits; sndT += rdt;
  if (sndT < 0.032) return;                          // the continuous voices are steered thirty times a second at most
  const s = surfaceAt(van.x, van.y), woods = s === 'mat' && van.x > WOODS[0] && van.y > WOODS[1], hx = Math.cos(van.a), hy = Math.sin(van.a);
  const groove = s === 'hub' && (overLine(art.hubText.name) || overLine(art.hubText.roles));      // over the routed name, or the roles under it
  audio.drive({
    dt: sndT, speed: van.speed, thr: van.thr || 0, surface: woods ? 'woods' : s || 'floor', groove, fire: mat.fireNear(),
    flour: s === 'block' ? sf.flourAt(van.x + hx * sf.NOSE, van.y + hy * sf.NOSE) : 0,
    paper: s === 'desk' ? sndPaper / 4 + (sf.paper.inPile && van.speed > 30 ? 0.3 : 0) : 0
  });
  sndT = 0; sndPaper = 0;
}

// ---------- the edge tab: one pointer at the edge of the screen (spec 7.2) ----------
// When: 40 s after the first touch, toward the major of a track with nothing found yet (the spec's chevron); or, when
// nothing still to find has been in sight for 6 s, toward the nearest thing still to find, in its track's colour.
// What: the hub's own stemmed tape arrow, in that colour, on a bone tape tab of the top bar's family (torn short ends,
// ink keyline, hard shadow), pinned to the edge of the screen in the direction of the thing: never inside the playfield.
// How: it slides in from that edge, stays 2.4 s, bobbing, and is off for 6 s. It keeps away while a label is in its first
// second and a half, while a pill has only just come up (its first six seconds: after that the offer has been seen, and
// the tab sits above it), during the two moments, and whenever the hub is on screen (the hub's own dashes point the
// way there).
const tab = { on: false, k: 0, t: 0, cool: 0, idle: 0, look: 0, tgt: null, x: 0, y: 0, a: 0, ex: 0, ey: 0, tr: 'w' };
function tickTab(dt) {
  const quiet = !S.firstInput || F.holdOn() || F.three.on || (ui.pillShown() && ui.pillAge() < 6) || ui.labelFresh() || shown(-110, -110, 110, 110) > 0.25;
  if ((tab.look -= dt) <= 0) {                                        // five times a second: is anything still to find in sight, and what is nearest
    tab.look = 0.2;
    const vis = (x, y) => { const p = toScreen(x, y); return p[0] > 10 && p[0] < view.w - 10 && p[1] > 100 && p[1] < view.h - 20; };
    const q = F.seek(vis); tab.seen = q.seen; tab.tgt = null;
    if (S.rt - firstAt > 40) { const tr = !S.tracks.w ? 'w' : !S.tracks.k ? 'k' : !S.tracks.v ? 'v' : null; if (tr) { const m = S.byId[tr === 'w' ? 'ad1' : tr === 'k' ? 'bread' : 'skit1']; if (!vis(m.x, m.y - 30)) tab.tgt = { x: m.x, y: m.y - 30, tr }; else tab.seen = true; } }
    if (!tab.tgt && q.best && tab.idle >= 6) tab.tgt = q.best;
  }
  tab.idle = tab.seen || !S.firstInput ? 0 : tab.idle + dt;
  if (tab.cool > 0) tab.cool -= dt;
  if (tab.on) { tab.t += dt; if (tab.t > 2.4 || quiet || !tab.tgt) { tab.on = false; tab.cool = quiet || !tab.tgt ? Math.max(tab.cool, 1.2) : 6; } }
  else if (tab.tgt && !quiet && tab.cool <= 0 && tab.k <= 0) { tab.on = true; tab.t = 0; }
  tab.k = S.reduced ? +tab.on : tab.on ? Math.min(1, tab.k + dt / 0.22) : Math.max(0, tab.k - dt / 0.18);      // (reduced motion: it is simply there, no slide and no bob)
  if (tab.on && tab.tgt) {
    // where the line from the van to the thing leaves the screen: the tab is pinned there, 10 px in from the sides,
    // under the top bar (never higher than y 104), above the bottom edge (or above a pill that is waiting, tucked)
    const g = tab.tgt, v = toScreen(van.x, van.y), p = toScreen(g.x, g.y), lx = 32, hx = view.w - 32, ly = 119, hy = view.h - ui.pillH() - 15;
    const cx = Math.max(lx, Math.min(hx, v[0])), cy = Math.max(ly, Math.min(hy, v[1])), dx = p[0] - cx, dy = p[1] - cy;
    const k = Math.min(dx > 0 ? (hx - cx) / dx : dx < 0 ? (lx - cx) / dx : 1e9, dy > 0 ? (hy - cy) / dy : dy < 0 ? (ly - cy) / dy : 1e9);
    tab.x = cx + dx * k; tab.y = cy + dy * k; tab.a = Math.atan2(p[1] - v[1], p[0] - v[0]); tab.tr = g.tr;
    // the edge it comes in from: the nearest one
    const dl = tab.x - lx, dr = hx - tab.x, dt2 = tab.y - ly, db = hy - tab.y, m = Math.min(dl, dr, dt2, db);
    tab.ex = m === dl ? -1 : m === dr ? 1 : 0; tab.ey = m === dl || m === dr ? 0 : m === dt2 ? -1 : 1;
  }
}
function drawTab() {
  if (tab.k <= 0) return;
  const e = 1 - (1 - tab.k) * (1 - tab.k), off = (1 - e) * 64, bob = tab.on && !S.reduced ? Math.sin(S.rt * 5) * 3 : 0, W = 44, H = 30, col = TRACK[tab.tr].strong;
  const x = tab.x + tab.ex * off + Math.cos(tab.a) * bob, y = tab.y + tab.ey * (tab.ey < 0 ? off * 2.2 : off) + Math.sin(tab.a) * bob;
  const shape = (w, h) => {                                           // a strip of tape: straight long sides, torn short ends
    const d = 2.4, n = 5, t = h / n; ctx.beginPath(); ctx.moveTo(-w / 2 + d, -h / 2); ctx.lineTo(w / 2 - d, -h / 2);
    for (let i = 0; i < n; i++) { ctx.lineTo(w / 2, -h / 2 + t * (i + 0.5)); ctx.lineTo(w / 2 - d, -h / 2 + t * (i + 1)); }
    ctx.lineTo(-w / 2 + d, h / 2);
    for (let i = 0; i < n; i++) { ctx.lineTo(-w / 2, h / 2 - t * (i + 0.5)); ctx.lineTo(-w / 2 + d, h / 2 - t * (i + 1)); }
    ctx.closePath();
  };
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.045);
  ctx.save(); ctx.translate(2, 2.5); shape(W, H); ctx.fillStyle = 'rgba(20,17,15,.4)'; ctx.fill(); ctx.restore();
  shape(W, H); ctx.fillStyle = PAL.ink; ctx.fill();
  shape(W - 3, H - 3); ctx.fillStyle = PAL.van; ctx.fill();
  // the hub's arrow: a stem and two strips for the head, each a piece of tape with its lit top third and a thin keyline
  ctx.rotate(0.045 + tab.a + Math.PI / 2); ctx.scale(0.74, 0.74); ctx.translate(0, -0.8);
  const strip = (sx, sy, w, h, a) => {
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(a);
    ctx.fillStyle = col; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(-w / 2, -h / 2, w, h * 0.3);
    ctx.lineWidth = 1.25; ctx.strokeStyle = 'rgba(20,17,15,.8)'; ctx.strokeRect(-w / 2, -h / 2, w, h); ctx.restore();
  };
  strip(0, 4, 7.5, 27, 0); strip(-6.6, -5.5, 7.5, 21, 0.72); strip(6.6, -5.5, 7.5, 21, -0.72);
  ctx.restore();
}

function drawVan(sp, x, y) {
  // it bobs with speed; standing with the engine on it shakes 1 px at 6 Hz
  const bob = van.speed > 30 ? Math.sin(S.rt * 34) * 0.5 : van.lights ? Math.sin(S.rt * 37.7) * 0.5 : 0, a = van.a, sn = Math.sin(a), cs = Math.cos(a), q = van.squash;
  const lamps = () => {
    if (!van.lights) return;
    for (const side of [-9.1, 9.1]) art.drawSpr(ctx, F.spr.warm, x + cs * 30.8 - sn * side, y + sn * 30.8 + cs * side - 6.4 + bob);
  };
  if (q > 0) { const k = Math.sin(q * Math.PI) * 5; x -= cs * k; y -= sn * k; ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(1 - 0.1 * q, 1 + 0.07 * q); ctx.rotate(-a); ctx.translate(-x, -y); }   // nose into an edge: a short squash, and it rocks back off the lip
  if (sn < -0.25) lamps();
  art.drawSpr(ctx, sp, x, y + bob);
  if (sn >= -0.25) lamps();
  if (q > 0) ctx.restore();
}

// ---------- quality governor (spec 9.6): step the pixel ratio down when frames run long ----------
function govern(raw, rdt) {
  ftSum += raw; ftN++; govT += rdt;
  if (ftN >= 30) { ftAvg = ftSum / ftN; fpsAvg = 1000 / ftAvg; ftSum = 0; ftN = 0; }
  if (tierPinned || govT < 2) return;
  govT = 0;
  if (S.rt < 4) return;                              // not while the first sprites are still baking
  slowWin = ftAvg > 20 ? slowWin + 1 : 0;            // two slow windows in a row, then one tier down
  if (slowWin >= 2 && tier < TIERS.length - 1 && (window.devicePixelRatio || 1) > TIERS[tier + 1]) { tier++; slowWin = 0; resize(); }
}

// ---------- ?debug=1 ----------
function debugHooks(fontsOk) {
  window.__g = {
    van, found: S.found, S, cam, auto, input, view, three: F.three, cine: F.cine, wakes: art.wakes, loops: F.loops, spr: F.spr, flats: F.flats, fontsOk, audio: audio.debug(), tray: desk.tray, show: desk.show, tab, framing: F.framing, chase: mat.chase, paper: sf.paper,
    get fps() { return Math.round(fpsAvg); },
    // canvas memory held, in MB: every sprite and its shadow, the ground tiles, the trail, the flour, the loops' copies, the van's frames
    get canvasMB() { return this.canvasMem.total; },
    // the same, by where it is held (a canvas shared by several things is counted once, for the first that holds it)
    get canvasMem() {
      const seen = new Set(), out = {}; let cur = 0;
      const walk = (o, d) => {
        if (!o || typeof o !== 'object' || d > 3) return;
        if (o instanceof HTMLCanvasElement) { if (!seen.has(o)) { seen.add(o); cur += o.width * o.height; } return; }
        if (Array.isArray(o)) { for (const v of o) walk(v, d + 1); return; }
        for (const k of ['c', 's', 'v', 'sh', 'sp', 'sp2', 'pic', 'dark', 'back', 'front', 'clip', 'tl', 'tr', 'on', 'over']) if (o[k]) walk(o[k], d + 1);
      };
      const part = (name, fn) => { cur = 0; fn(); out[name] = +(cur * 4 / 1048576).toFixed(2); };
      part('van', () => walk(F.vanCanvases(), 0));
      part('shelf', () => { for (const k in F.spr) walk(F.spr[k], 0); });
      part('props', () => { for (const p of S.props) walk(p, 0); });
      part('flats', () => { for (const p of F.flats) walk(p, 0); });
      part('cards', () => { for (const c of S.cards) walk(c, 0); });
      part('piles', () => { for (const p of S.piles) walk(p, 0); });
      part('loops', () => { for (const k in F.loops) walk(F.loops[k], 0); });
      part('extra', () => walk(F.extraCanvases(), 0));
      part('trail', () => walk(sf.trailCanvases(), 0)); part('flour', () => walk(sf.flour, 0));
      cur = 0; for (const k in tileC) walk(tileC[k], 0); out.tiles = +(cur * 4 / 1048576).toFixed(2);
      out.total = +Object.values(out).reduce((a, b) => a + b, 0).toFixed(1);
      return out;
    }, get bootMs() { return bootMs; }, get tier() { return tier; }, get running() { return running; },
    tp(x, y) { van.x = van.px = x; van.y = van.py = y; van.vx = van.vy = 0; cam.x = x; cam.y = y; cam.vx = cam.vy = 0; if (!S.firstInput) first(); },
    find(id) { F.wake(S.byId[id]); return S.found.slice(); },
    look(x, y, z) { S.look = x === undefined ? null : [x, y, z || 1]; }, lightAll(on) { if (on === false) F.lit.pop(); else F.lit.push([460, 500, 1500]); }, ui,
    toScreen, toWorld
  };
}

// ---------- start, and the switch between the game and the plain resume ----------
document.addEventListener('ygview', () => {
  audio.view(html.classList.contains('g'));          // (inside the tap that switched: coming back to the game it may ask for sound)
  if (html.classList.contains('g')) { if (!booted) boot().catch(fail); else { resize(); start(); } }
  else stop();
});
if (html.classList.contains('g')) boot().catch(fail);
