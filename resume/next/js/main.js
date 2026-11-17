// main.js — boot, the loop, the camera, the frame (layers of spec 9.5), quality tiers, debug flags.
import { S, G, BOX, HUB_R, PAL, TRACK, GHOST, CUTS, SEED, mulberry32, surfaceAt } from './world.js';
import * as art from './art.js';
import { van, input, auto, step, bindInput, goTo, onBump, readStick } from './van.js';
import * as sf from './surfaces.js';
import * as F from './finds.js';
import * as ui from './ui.js';
import * as audio from './audio.js';

const html = document.documentElement, qs = new URLSearchParams(location.search);
const DEBUG = qs.get('debug') === '1', AUTO = qs.get('auto') !== '0';
const cv = document.getElementById('c'), stage = document.getElementById('stage');
const STEP = 1 / 120, OPEN_ZOOM = 0.66, OPEN_Y = -140;
const TIERS = [2, 1.5, 1.25, 1];
let tier = qs.has('tier') ? Math.max(0, Math.min(3, +qs.get('tier') | 0)) : 0;
const tierPinned = qs.has('tier');

let ctx = null, pat = {}, booted = false, running = false, raf = 0, lastT = 0, acc = 0;
const view = { w: 390, h: 844, dpr: 2, k: 1, s: 1, tx: 0, ty: 0 };
const cam = { x: 0, y: OPEN_Y, vx: 0, vy: 0, zoom: OPEN_ZOOM, zv: 0, anchor: 0.5 };
const jobs = [];
let tapScreen = null, slowWin = 0, bootMs = null, fpsAvg = 60, ftAvg = 16, ftN = 0, ftSum = 0, govT = 0, tapRing = null, firstAt = 0, lastTapAt = 0, stampAt = 0, hazeTick = 0;

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
// what lies past the tape on the desk: more paperwork, the same sheets (seeded), and one pencil. [x, y, angle, variant]
const GHOST_PAPER = (() => {
  const r = mulberry32(SEED ^ 0x6057), out = [];
  for (let i = 0; i < 6; i++) { const a = r() * 6.283, d = Math.pow(r(), 0.7) * 48; out.push([-214 + Math.cos(a) * d, -886 + Math.sin(a) * d * 0.7, (r() - 0.5) * 2.4, (r() * 4) | 0]); }
  for (const [x, y] of [[132, -864], [316, -922], [-392, -928], [22, -936]]) out.push([x + (r() - 0.5) * 30, y + (r() - 0.5) * 12, (r() - 0.5) * 2.4, (r() * 4) | 0]);
  return out;
})();

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
  const t = art.tiles();
  for (const k in t) { if (k === 'tape') continue; pat[k] = ctx.createPattern(t[k], 'repeat'); pat[k].setTransform(new DOMMatrix().scale(1 / art.SS)); }
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
  ui.initUI({ pause: stop, resume: start, live: () => running });
  ui.setViewport(view.w, view.h);
  onBump(F.bump);
  bindInput(cv, { first, tap, toWorld, w: () => view.w, live: () => running });
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
  for (const ev of ['pointerup', 'touchend', 'click', 'keydown']) addEventListener(ev, audio.unlock, { passive: true });
  cv.addEventListener('touchmove', e => e.preventDefault(), { passive: false });       // older iOS: no scroll, no bounce
  document.addEventListener('gesturestart', e => { if (running) e.preventDefault(); });   // no pinch
  addEventListener('resize', resize); addEventListener('orientationchange', resize);
  document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });
  addEventListener('keydown', e => { if ((e.key === 'p' || e.key === 'P') && running && !e.metaKey && !e.ctrlKey) window.ygView(false); });
  if (S.reduced) { cam.zoom = 1; cam.anchor = 0.46; cam.x = van.x; cam.y = van.y; }
  else { const o = openCam(); cam.zoom = o.z; cam.y = o.y; }
  if (DEBUG) debugHooks(fontsOk);
  landName();
  stage.classList.add('on');
  start();
}
function fail(e) { console.error(e); stop(); if (window.ygDead) window.ygDead(); else html.classList.remove('g'); }    // the plain resume is the page

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
  if (running || !booted || document.hidden || ui.playerOpen() || !html.classList.contains('g')) return;
  running = true; lastT = performance.now(); F.resumeLoops(); raf = requestAnimationFrame(frame);
}
function stop() { if (!running) return; running = false; cancelAnimationFrame(raf); F.pauseLoops(); input.keys.clear(); input.mag = 0; }

// ---------- input glue ----------
// 0 an ordinary touch · 1 swallowed (the three-track moment has only just begun) · 2 it ended the moment
function first() {
  const r = F.threeTouch();
  if (!S.firstInput) { S.firstInput = true; firstAt = S.rt; van.lights = true; F.tourStop(); }
  return r;
}
function toWorld(cx, cy) { const k = view.s / view.dpr; return [(cx - view.tx / view.dpr) / k, (cy - view.ty / view.dpr) / k]; }
function toScreen(wx, wy) { return [(wx * view.s + view.tx) / view.dpr, (wy * view.s + view.ty) / view.dpr]; }
function tap(wx, wy) {
  if (F.three.on && F.three.lift) return;
  lastTapAt = performance.now();
  tapScreen = F.screenAt(wx, wy);
  if (tapScreen) { tapRing = { x: wx, y: wy, t: 0 }; return; }      // the touchend / click handler opens the player
  const p = F.propAt(wx, wy) || F.nearFind(wx, wy, 40);            // a tap beside an unfound thing is meant for it
  if (p) goTo(p.cx, p.cy, { prop: p, done: () => F.arrived(p) }); else goTo(wx, wy);
  tapRing = { x: p ? wx : auto.x, y: p ? wy : auto.y, t: 0 };       // every registered tap shows a ring
}

// ---------- the loop: fixed 120 Hz step, dt clamped to 33 ms ----------
function frame(now) {
  if (!running) return;
  raf = requestAnimationFrame(frame);
  const rdt = Math.min(0.033, Math.max(0, (now - lastT) / 1000)), raw = now - lastT; lastT = now;
  S.rt += rdt;
  if (S.slow > 0) S.slow -= rdt;
  const dt = rdt * (S.slow > 0 ? 0.3 : 1);
  S.t += dt;

  if (AUTO && !S.firstInput && S.rt >= 1.5) F.tourStart();
  van.drag = sf.paper.inPile ? 0.8 : sf.flourAt(van.x + Math.cos(van.a) * sf.NOSE, van.y + Math.sin(van.a) * sf.NOSE) === 2 ? 0.85 : 1;
  // The three-track moment holds the van still. A thumb that stayed down and keeps steering ends it early once the
  // first 0.8 s are over; when the moment is over, by itself or not, that thumb has the van again without having to move.
  const st = input.stick;
  if (F.three.on && F.three.lift && st) {
    if (st.hx === undefined) { st.hx = st.x; st.hy = st.y; }
    if (F.three.t >= 0.8 && Math.hypot(st.x - st.hx, st.y - st.hy) > 10) F.threeTouch();
  }
  const hold = F.three.on && F.three.lift;
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
  updateCamera(rdt);
  render(acc / STEP);
  ui.updateLabels(toScreen, van, ui.pillUp());

  // idle baking: 4 ms slices
  if (jobs.length) { const t0 = performance.now(); do { jobs.shift()(); } while (jobs.length && performance.now() - t0 < 4); }
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
  const band = view.h >= 620 ? 300 : 0, room = view.h - band - 24, top = GHOST.desk[1] - 6, bw = BOX[2] - BOX[0] + 80, bh = BOX[3] - top + 50;
  return { zoom: Math.min(view.w / view.k / bw, room / view.k / bh), anchor: (band + room / 2) / view.h, y: (top + BOX[3]) / 2 };
}
function updateCamera(dt) {
  let tx, ty, tz, ta, wz = 3;
  if (F.three.on && F.three.lift) { const f = fitWhole(); tx = (BOX[0] + BOX[2]) / 2; ty = f.y; tz = f.zoom; ta = f.anchor; wz = 7; }
  else if (!S.firstInput && !S.reduced) { const o = openCam(); tx = 0; ty = o.y; tz = o.z; ta = 0.5; wz = 7; }
  else {
    tx = van.x + van.vx * (90 / 340); ty = van.y + van.vy * (90 / 340); ta = 0.46;
    tz = S.reduced ? 1 : 1 - 0.12 * Math.min(1, van.speed / 340);
    if (S.rt - firstAt < 1.1 || (F.three.on && F.three.t < 3.2)) wz = 6;
    // keep most of the screen on the tables: near an edge the van moves off-centre instead of the floor filling the view.
    // The tables make a cross, so the edges that count are the ones of the arm the van is on.
    const vw = view.w / (view.k * cam.zoom), vh = view.h / (view.k * cam.zoom), D = G.desk;
    const onDesk = van.y < D[3], inCol = van.x > D[0] && van.x < D[2];
    const x0 = onDesk ? D[0] : BOX[0], x1 = onDesk ? D[2] : BOX[2], y0 = inCol ? BOX[1] : D[3];
    const lx = x0 - vw * 0.14 + vw / 2, hx = x1 + vw * 0.14 - vw / 2, ly = y0 - vh * 0.16 + vh * ta, hy = BOX[3] + vh * 0.13 - vh * (1 - ta);
    if (lx < hx) tx = tx < lx ? lx : tx > hx ? hx : tx;
    if (ly < hy) ty = ty < ly ? ly : ty > hy ? hy : ty;
  }
  spring(cam, 'x', 'vx', tx, 9, dt); spring(cam, 'y', 'vy', ty, 9, dt); spring(cam, 'zoom', 'zv', tz, wz, dt);
  cam.anchor += (ta - cam.anchor) * Math.min(1, dt * 5);
}

// ---------- the frame ----------
function render(al) {
  const W = cv.width, H = cv.height, s = view.s = view.k * cam.zoom * view.dpr;
  const tx = view.tx = W / 2 - cam.x * s, ty = view.ty = H * cam.anchor - cam.y * s;
  const x0 = -tx / s, y0 = -ty / s, x1 = x0 + W / s, y1 = y0 + H / s;
  const D = G.desk, B = G.block, M = G.mat, T = G.strip, spr = F.spr;
  // before the first touch the van creeps forward and back once, in step with the ghost thumb under it
  const gu = !S.firstInput && !S.reduced && S.rt > 0.75 && S.rt < 1.5 ? (S.rt - 0.75) / 0.75 : -1, creep = gu >= 0 ? Math.sin(gu * Math.PI) * 18 : 0;
  const vx = van.px + (van.x - van.px) * al + Math.cos(van.a) * creep, vy = van.py + (van.y - van.py) * al + Math.sin(van.a) * creep;
  const vsurf = surfaceAt(vx, vy), matOn = M[0] < x1 && M[2] + 30 > x0 && M[1] < y1 && M[3] + 30 > y0;
  const rect = r => ctx.rect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
  const fill = r => ctx.fillRect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
  const vv = { x: vx, y: vy, a: van.a };
  const litPath = () => { if (van.lights) sf.wedgePath(ctx, vv); for (const c of F.lit) { ctx.moveTo(c[0] + c[2], c[1]); ctx.arc(c[0], c[1], c[2], 0, 6.2832); } };
  const anyLit = van.lights || F.lit.length > 0;

  // 1. floor: poured slabs, and the hard shadow of every built table on it (never under what lies past the tape)
  ctx.setTransform(s, 0, 0, s, tx, ty); ctx.globalAlpha = 1;
  ctx.fillStyle = pat.floor; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.fillStyle = 'rgba(20,17,15,.45)';
  for (const k of ['desk', 'block', 'strip', 'mat']) { const r = G[k]; ctx.fillRect(r[0] + 26, r[1] + 18, r[2] - r[0], r[3] - r[1]); }

  // 2. tables. Past a cut edge of the slice the same table carries on with the lights off: its own tile, opaque, the
  // paperwork still lying on the desk, and over that one veil of the floor colour. Drawn only where the view reaches it.
  let gd = false, gn = 0;
  for (const q of GPARTS) {
    q.on = q[1] < x1 && q[3] > x0 && q[2] < y1 && q[4] > y0; if (!q.on) continue;
    gn++; if (q[0] === 'desk') gd = true;
    ctx.fillStyle = pat[q[0]]; ctx.fillRect(q[1], q[2], q[3] - q[1], q[4] - q[2]);
  }
  if (gd) {
    const sh = spr.sheets;
    for (const q of GHOST_PAPER) {
      const c = Math.cos(q[2]), n = Math.sin(q[2]);
      ctx.setTransform(c * s, n * s, -n * s, c * s, tx + (q[0] + 1.2) * s, ty + (q[1] + 0.8) * s); ctx.drawImage(sh.sh.c, -17, -22, 34, 44);
      ctx.setTransform(c * s, n * s, -n * s, c * s, tx + q[0] * s, ty + q[1] * s); ctx.drawImage(sh.v[q[3]].c, -17, -22, 34, 44);
    }
    ctx.setTransform(s, 0, 0, s, tx, ty);
    art.drawShadow(ctx, spr.gpencil, 232, -850); art.drawSpr(ctx, spr.gpencil, 232, -850);
  }
  if (gn) { ctx.fillStyle = 'rgba(35,40,43,.78)'; for (const q of GPARTS) if (q.on) ctx.fillRect(q[1], q[2], q[3] - q[1], q[4] - q[2]); }
  ctx.fillStyle = pat.desk; fill(D); ctx.fillStyle = pat.block; fill(B); ctx.fillStyle = pat.ply; fill(T);
  if (matOn) {
    ctx.fillStyle = pat.mat; fill(M);
    ctx.save(); ctx.beginPath(); rect(M); ctx.clip();
    if (anyLit) { ctx.beginPath(); litPath(); ctx.fillStyle = pat.matLit; ctx.fill(); }
    if (van.lights) {                                                 // the warm hot spot at the lamps: two steps, each ending in an arc
      ctx.beginPath(); sf.sectorPath(ctx, vv, 130); ctx.fillStyle = 'rgba(255,196,107,.07)'; ctx.fill();
      ctx.beginPath(); sf.sectorPath(ctx, vv, 70); ctx.fillStyle = 'rgba(255,196,107,.14)'; ctx.fill();
    }
    if (vsurf === 'mat') { ctx.fillStyle = PAL.matLit; ctx.beginPath(); ctx.ellipse(vx + Math.cos(van.a) * 4, vy + Math.sin(van.a) * 4, 32, 20, 0, 0, 6.2832); ctx.fill(); }   // the van's own spill
    ctx.restore();
    ctx.fillStyle = PAL.matGrid; const q = 9, mw = M[2] - M[0] - 2 * q, mh = M[3] - M[1] - 2 * q;                     // the mat's printed border
    ctx.fillRect(M[0] + q, M[1] + q, mw, 1.6); ctx.fillRect(M[0] + q, M[3] - q - 1.6, mw, 1.6); ctx.fillRect(M[0] + q, M[1] + q, 1.6, mh); ctx.fillRect(M[2] - q - 1.6, M[1] + q, 1.6, mh);
  }
  ctx.fillStyle = 'rgba(20,17,15,.5)';                               // seams where the tables meet
  ctx.fillRect(B[0], D[3] - 1, M[2] - B[0], 2); ctx.fillRect(T[0] - 1, T[1], 2, T[3] - T[1]); ctx.fillRect(T[2] - 1, T[1], 2, T[3] - T[1]);

  // 3. trail canvas · 5. flour canvas · light lying on the ground · the tape on the cut edges · then the hub, which is never floury
  ctx.drawImage(sf.trail, BOX[0], BOX[1], BOX[2] - BOX[0], BOX[3] - BOX[1]);
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
  art.drawShadow(ctx, spr.hub, 0, 0); art.drawSpr(ctx, spr.hub, 0, 0);

  // 6a. flat things: cards and dressing (dark on the mat, then the lit twins inside the light), then paper
  let matFlats = false;
  for (const p of F.flats) {
    const b = p.sp.bb; if (p.x + b[2] < x0 || p.x + b[0] > x1 || p.y + b[3] < y0 || p.y + b[1] > y1) continue;
    if (p.onMat) { matFlats = true; art.drawSpr(ctx, p.dark, p.x, p.y); } else if (p.draw) p.draw(ctx, p); else { art.drawShadow(ctx, p.sp, p.x, p.y); art.drawSpr(ctx, p.sp, p.x, p.y); }
  }
  if (matOn && anyLit) {                                              // 7. the lit pass: one clip. The tape on the mat's edges is lit by it too
    ctx.save(); ctx.beginPath(); ctx.rect(M[0], M[1], M[2] - M[0] + 22, M[3] - M[1] + 22); ctx.clip(); ctx.beginPath(); litPath(); ctx.clip();
    tapes(2);
    if (matFlats) for (const p of F.flats) if (p.onMat) art.drawSpr(ctx, p.sp, p.x, p.y);
    ctx.restore();
  }
  sf.drawPaper(ctx, spr.sheets, view, x0, y0, x1, y1);

  // 6b. hard shadows and the warm wedge, only on the lit tables (none on the mat, none on the floor)
  ctx.save(); ctx.beginPath(); rect(D); rect(B); rect(T); ctx.moveTo(HUB_R, 0); ctx.arc(0, 0, HUB_R, 0, 6.2832); ctx.clip();
  const list = [];
  for (const p of S.props) {
    const b = p.bb || p.sp.bb; if (p.x + b[2] + 80 < x0 || p.x + b[0] > x1 || p.y + b[3] + 60 < y0 || p.y + b[1] > y1) continue;
    list.push(p); if (!p.onMat) { art.drawShadow(ctx, p.sp, p.x, p.y); if (p.sp2) art.drawShadow(ctx, p.sp2, p.x, p.y); }
  }
  const hi = ((Math.round(van.a / 6.283185307 * 64) % 64) + 64) % 64, vsp = F.vanFrame(hi);
  if (vsurf !== 'mat') art.drawShadow(ctx, vsp, vx, vy);
  // Off the mat the wedge is a faint warm shape, drawn plainly (adding light to a near-white table clips to a blank
  // triangle) and kept short, so the long hard wedge stays special to the dark mat.
  if (van.lights) { ctx.fillStyle = vsurf === 'hub' || vsurf === 'strip' ? 'rgba(255,205,125,.24)' : 'rgba(255,196,107,.15)'; ctx.beginPath(); sf.wedgePath(ctx, vv, 150); ctx.fill(); }
  ctx.restore();

  // 6c. props and the van, sorted by the y of their base. Tall props turn 35% see-through while the van is behind them.
  const VAN = { sortY: vy + 9, van: true }; list.push(VAN); list.sort((a, b) => a.sortY - b.sortY);
  for (const p of list) {
    if (p.van) { drawVan(vsp, vx, vy); continue; }
    if (p.tall) { const t = p.tall, behind = p.fade ? p.fade(vx, vy) : vy < p.sortY - 4 && vx > t[0] - 6 && vx < t[1] + 6 && vy > t[2]; p.alpha += ((behind ? 0.35 : 1) - p.alpha) * 0.2; }
    if (p.alpha < 0.99) ctx.globalAlpha = p.alpha;
    const q = p.squash;
    if (q > 0) { ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1 + 0.05 * q, 1 - 0.08 * q); ctx.translate(-p.x, -p.y); }
    if (p.draw) p.draw(ctx, p); else art.drawSpr(ctx, p.sp, p.x, p.y);
    const f = p.find || p.say; if (f && f.tabOn && f.tabSp) { const t = f.tabAt; ctx.save(); ctx.translate(t[0], t[1]); ctx.rotate(t[2]); art.drawSpr(ctx, f.tabSp, 0, 0); ctx.restore(); }
    if (q > 0) ctx.restore();
    ctx.globalAlpha = 1;
  }

  // 8. particles
  sf.drawParts(ctx, spr, view);

  // the three-track moment: each built table outlined in its colour, one after another, while the camera is up
  if (F.three.on && F.three.t < 2.5) {
    const n = F.three.n, lw = 7 / (view.k * cam.zoom) * 0.5 + 5, h = lw / 2; ctx.lineWidth = lw; ctx.lineJoin = 'round';
    const box = (r, c) => { ctx.strokeStyle = c; ctx.strokeRect(r[0] + h, r[1] + h, r[2] - r[0] - lw, r[3] - r[1] - lw); };
    if (n > 0) box(D, TRACK.w.strong); if (n > 1) box(B, TRACK.k.strong); if (n > 2) box(M, TRACK.v.strong);
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
  if (gu >= 0) {
    // an empty ring, never a disc: it starts 194 units below the van, under the roles line and the south arrow, and
    // slides up 85 units once (128 px and 56 px in the 844 px opening), so it never circles a word on the hub
    const a = gu < 0.15 ? gu / 0.15 : gu > 0.75 ? (1 - gu) / 0.25 : 1, kk = s / view.dpr, up = Math.sin(Math.min(1, gu / 0.65) * 1.5708);
    const gx = (van.x * s + tx) / view.dpr, gy = (van.y * s + ty) / view.dpr + (194 - 85 * up) * kk;
    ctx.globalAlpha = a * 0.9; ctx.lineWidth = 2; ctx.strokeStyle = PAL.van; ctx.beginPath(); ctx.arc(gx, gy, 22, 0, 6.2832); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(20,17,15,.45)'; ctx.beginPath(); ctx.arc(gx, gy, 23.5, 0, 6.2832); ctx.stroke(); ctx.globalAlpha = 1;
  }
}

function drawVan(sp, x, y) {
  // it bobs with speed; standing with the engine on it shakes 1 px at 6 Hz
  const bob = van.speed > 30 ? Math.sin(S.rt * 34) * 0.5 : van.lights ? Math.sin(S.rt * 37.7) * 0.5 : 0, a = van.a, sn = Math.sin(a), cs = Math.cos(a), q = van.squash;
  const lamps = () => {
    if (!van.lights) return;
    for (const side of [-9.1, 9.1]) art.drawSpr(ctx, F.spr.warm, x + cs * 30.8 - sn * side, y + sn * 30.8 + cs * side - 6.4 + bob);
  };
  if (q > 0) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(1 - 0.1 * q, 1 + 0.07 * q); ctx.rotate(-a); ctx.translate(-x, -y); }   // nose into an edge: a short squash
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
    van, found: S.found, S, cam, auto, input, view, three: F.three, loops: F.loops, fontsOk, audio: audio.state,
    get fps() { return Math.round(fpsAvg); }, get bootMs() { return bootMs; }, get tier() { return tier; }, get running() { return running; },
    tp(x, y) { van.x = van.px = x; van.y = van.py = y; van.vx = van.vy = 0; cam.x = x; cam.y = y; cam.vx = cam.vy = 0; if (!S.firstInput) first(); },
    find(id) { F.wake(S.byId[id]); return S.found.slice(); },
    toScreen, toWorld
  };
}

// ---------- start, and the switch between the game and the plain resume ----------
document.addEventListener('ygview', () => {
  if (html.classList.contains('g')) { if (!booted) boot().catch(fail); else { resize(); start(); } }
  else stop();
});
if (html.classList.contains('g')) boot().catch(fail);
