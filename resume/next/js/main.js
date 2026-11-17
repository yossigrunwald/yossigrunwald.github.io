// main.js — boot, the loop, the camera, the frame (layers of spec 9.5), quality tiers, debug flags.
import { S, G, BOX, HUB_R, PAL, TRACK, surfaceAt } from './world.js';
import * as art from './art.js';
import { van, input, auto, step, bindInput, goTo, onBump } from './van.js';
import * as sf from './surfaces.js';
import * as F from './finds.js';
import * as ui from './ui.js';
import * as audio from './audio.js';

const html = document.documentElement, qs = new URLSearchParams(location.search);
const DEBUG = qs.get('debug') === '1', AUTO = qs.get('auto') !== '0';
const cv = document.getElementById('c'), stage = document.getElementById('stage');
const STEP = 1 / 120, OPEN_ZOOM = 0.64, OPEN_Y = -62;
const TIERS = [2, 1.5, 1.25, 1];
let tier = qs.has('tier') ? Math.max(0, Math.min(3, +qs.get('tier') | 0)) : 0;
const tierPinned = qs.has('tier');

let ctx = null, pat = {}, booted = false, running = false, raf = 0, lastT = 0, acc = 0;
const view = { w: 390, h: 844, dpr: 2, k: 1, s: 1, tx: 0, ty: 0 };
const cam = { x: 0, y: OPEN_Y, vx: 0, vy: 0, zoom: OPEN_ZOOM, zv: 0, anchor: 0.5 };
const jobs = [];
let tapScreen = null, slowWin = 0, bootMs = null, fpsAvg = 60, ftAvg = 16, ftN = 0, ftSum = 0, govT = 0, tapRing = null, ghost = 0, firstAt = 0, lastTapAt = 0, stampAt = 0;

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
  const t = art.tiles(); for (const k in t) { pat[k] = ctx.createPattern(t[k], 'repeat'); pat[k].setTransform(new DOMMatrix().scale(1 / art.SS)); }
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
  cv.addEventListener('click', e => {                // a tap on a woken screen plays it: a real click, so sound is allowed
    if (performance.now() - lastTapAt > 500 || !tapScreen) return;
    const f = tapScreen; tapScreen = null;
    if (f.found) ui.openPlayer(f);
  });
  for (const ev of ['pointerup', 'touchend', 'click', 'keydown']) addEventListener(ev, audio.unlock, { passive: true });
  cv.addEventListener('touchmove', e => e.preventDefault(), { passive: false });       // older iOS: no scroll, no bounce
  document.addEventListener('gesturestart', e => { if (running) e.preventDefault(); });   // no pinch
  addEventListener('resize', resize); addEventListener('orientationchange', resize);
  document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });
  addEventListener('keydown', e => { if ((e.key === 'p' || e.key === 'P') && running && !e.metaKey && !e.ctrlKey) window.ygView(false); });
  if (S.reduced) { cam.zoom = 1; cam.anchor = 0.46; cam.x = van.x; cam.y = van.y; }
  if (DEBUG) debugHooks(fontsOk);
  stage.classList.add('on');
  start();
}
function fail(e) { console.error(e); stop(); if (window.ygDead) window.ygDead(); else html.classList.remove('g'); }    // the plain resume is the page

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  view.w = w; view.h = h; view.dpr = Math.min(TIERS[tier], window.devicePixelRatio || 1);
  view.k = w < h ? w / 390 : h / 900;                // portrait: 390 units wide; landscape: 900 units tall
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
function first() {
  const swallow = F.threeTouch();                    // a touch during the three-track moment only dismisses it
  if (!S.firstInput) { S.firstInput = true; firstAt = S.rt; van.lights = true; F.tourStop(); }
  return swallow;
}
function toWorld(cx, cy) { const k = view.s / view.dpr; return [(cx - view.tx / view.dpr) / k, (cy - view.ty / view.dpr) / k]; }
function toScreen(wx, wy) { return [(wx * view.s + view.tx) / view.dpr, (wy * view.s + view.ty) / view.dpr]; }
function tap(wx, wy) {
  if (F.three.on && F.three.lift) return;
  lastTapAt = performance.now();
  tapScreen = F.screenAt(wx, wy);
  if (tapScreen) return;                             // the click handler opens the player
  const p = F.propAt(wx, wy);
  if (p) goTo(p.cx, p.cy, { prop: p, done: () => F.arrived(p) }); else goTo(wx, wy);
  tapRing = { x: p ? p.cx : auto.x, y: p ? p.cy : auto.y, t: 0 };
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
  van.drag = sf.paper.inPile ? 0.8 : sf.flourAt(van.x, van.y) === 2 ? 0.85 : 1;
  if (F.three.on && F.three.lift) { input.mag = 0; }
  acc += dt;
  while (acc >= STEP) { step(STEP); acc -= STEP; trailTick(); }
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

// tyre marks, the flour furrow and its puffs: every 6 units of travel
function trailTick() {
  if (van.odo - stampAt < 6) return;
  stampAt = van.odo;
  const hx = Math.cos(van.a), hy = Math.sin(van.a), pl = sf.stamp(van.x, van.y, hx, hy);
  if (pl) {
    const n = pl === 2 ? 4 : 2;
    for (let i = 0; i < n; i++) {
      const side = Math.random() < 0.5 ? -1 : 1, sp = 30 + Math.random() * 60;
      sf.emit(0, van.x - hx * 10 + (Math.random() - 0.5) * 16, van.y - hy * 10 + (Math.random() - 0.5) * 16, -hy * side * sp - hx * 20, hx * side * sp - hy * 20 - 12, 0.5 + Math.random() * 0.4, pl === 2 ? 13 : 9);
    }
  }
}

// ---------- camera: critically damped spring, omega 9, look-ahead 90 units at full speed ----------
function spring(o, kx, kv, target, w, dt) {
  const d = o[kx] - target, e = Math.exp(-w * dt), tmp = (o[kv] + w * d) * dt;
  o[kv] = (o[kv] - w * tmp) * e; o[kx] = target + (d + tmp) * e;
}
function fitZoom() { const bw = BOX[2] - BOX[0] + 120, bh = BOX[3] - BOX[1] + 160; return Math.min(view.w / view.k / bw, view.h / view.k / bh); }
function updateCamera(dt) {
  let tx, ty, tz, ta, wz = 3;
  if (F.three.on && F.three.lift) { tx = (BOX[0] + BOX[2]) / 2; ty = (BOX[1] + BOX[3]) / 2; tz = fitZoom(); ta = 0.5; wz = 7; }
  else if (!S.firstInput && !S.reduced) { tx = 0; ty = OPEN_Y; tz = OPEN_ZOOM; ta = 0.5; wz = 7; }
  else {
    tx = van.x + van.vx * (90 / 340); ty = van.y + van.vy * (90 / 340); ta = 0.46;
    tz = S.reduced ? 1 : 1 - 0.12 * Math.min(1, van.speed / 340);
    if (S.rt - firstAt < 1.1 || (F.three.on && F.three.t < 3.4)) wz = 6;
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
  const vx = van.px + (van.x - van.px) * al, vy = van.py + (van.y - van.py) * al;
  const vsurf = surfaceAt(vx, vy), matOn = M[0] < x1 && M[2] > x0 && M[1] < y1 && M[3] + 16 > y0;
  const rect = r => ctx.rect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
  const fill = r => ctx.fillRect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
  const litPath = () => { if (van.lights) sf.wedgePath(ctx, { x: vx, y: vy, a: van.a }); for (const c of F.lit) { ctx.moveTo(c[0] + c[2], c[1]); ctx.arc(c[0], c[1], c[2], 0, 6.2832); } };
  const anyLit = van.lights || F.lit.length > 0;

  // 1. floor
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = PAL.floor; ctx.fillRect(0, 0, W, H);
  ctx.setTransform(s, 0, 0, s, tx, ty);

  // 2. tables: the edge that faces the viewer, then the tops
  if (y1 > B[3]) {
    ctx.fillStyle = '#8C5626'; ctx.fillRect(B[0], B[3], T[2] - B[0], 15); ctx.fillStyle = '#6A3F1A'; ctx.fillRect(B[0], B[3] + 11, T[2] - B[0], 4);
    ctx.fillStyle = '#3F4649'; ctx.fillRect(M[0], M[3], M[2] - M[0], 15); ctx.fillStyle = '#1C3A32'; ctx.fillRect(M[0], M[3], M[2] - M[0], 3.5); ctx.fillStyle = '#2A2F32'; ctx.fillRect(M[0], M[3] + 11, M[2] - M[0], 4);
  }
  ctx.fillStyle = pat.desk; fill(D); ctx.fillStyle = pat.block; fill(B); ctx.fillStyle = pat.ply; fill(T);
  if (matOn) {
    ctx.fillStyle = pat.mat; fill(M);
    if (anyLit) { ctx.save(); ctx.beginPath(); rect(M); ctx.clip(); ctx.beginPath(); litPath(); ctx.fillStyle = pat.matLit; ctx.fill(); ctx.restore(); }
  }
  if (matOn) {                                                       // the mat's printed border
    ctx.fillStyle = PAL.matGrid; const q = 9, mw = M[2] - M[0] - 2 * q, mh = M[3] - M[1] - 2 * q;
    ctx.fillRect(M[0] + q, M[1] + q, mw, 1.6); ctx.fillRect(M[0] + q, M[3] - q - 1.6, mw, 1.6); ctx.fillRect(M[0] + q, M[1] + q, 1.6, mh); ctx.fillRect(M[2] - q - 1.6, M[1] + q, 1.6, mh);
  }
  ctx.fillStyle = 'rgba(20,17,15,.5)';                               // seams where the tables meet
  ctx.fillRect(B[0], D[3] - 1, M[2] - B[0], 2); ctx.fillRect(T[0] - 1, T[1], 2, T[3] - T[1]); ctx.fillRect(T[2] - 1, T[1], 2, T[3] - T[1]);

  // 3. trail canvas · 5. flour canvas · the lamp pool on top of the flour · then the hub, which is never floury
  ctx.drawImage(sf.trail, BOX[0], BOX[1], BOX[2] - BOX[0], BOX[3] - BOX[1]);
  if (B[0] < x1 && B[2] > x0 && B[1] < y1 && B[3] > y0) { ctx.drawImage(sf.flour, B[0], B[1], B[2] - B[0], B[3] - B[1]); art.drawSpr(ctx, spr.pool, -228, 40); }
  art.drawShadow(ctx, spr.hub, 0, 0); art.drawSpr(ctx, spr.hub, 0, 0);

  // 6a. flat things: cards and dressing (dark on the mat, then the lit twins inside the light), then paper
  let matFlats = false;
  for (const p of F.flats) {
    const b = p.sp.bb; if (p.x + b[2] < x0 || p.x + b[0] > x1 || p.y + b[3] < y0 || p.y + b[1] > y1) continue;
    if (p.onMat) { matFlats = true; art.drawSpr(ctx, p.dark, p.x, p.y); } else if (p.draw) p.draw(ctx, p); else { art.drawShadow(ctx, p.sp, p.x, p.y); art.drawSpr(ctx, p.sp, p.x, p.y); }
  }
  if (matFlats && anyLit) {                                           // 7. the lit pass: one clip
    ctx.save(); ctx.beginPath(); rect(M); ctx.clip(); ctx.beginPath(); litPath(); ctx.clip();
    for (const p of F.flats) if (p.onMat) art.drawSpr(ctx, p.sp, p.x, p.y);
    ctx.restore();
  }
  sf.drawPaper(ctx, spr.sheets, view, x0, y0, x1, y1);

  // 6b. hard shadows and the warm wedge, only on the lit tables (none on the mat, none on the floor)
  ctx.save(); ctx.beginPath(); rect(D); rect(B); rect(T); ctx.moveTo(HUB_R, 0); ctx.arc(0, 0, HUB_R, 0, 6.2832); ctx.clip();
  const list = [];
  for (const p of S.props) {
    const b = p.sp.bb; if (p.x + b[2] + 80 < x0 || p.x + b[0] > x1 || p.y + b[3] + 60 < y0 || p.y + b[1] > y1) continue;
    list.push(p); if (!p.onMat) art.drawShadow(ctx, p.sp, p.x, p.y);
  }
  const hi = ((Math.round(van.a / 6.283185307 * 64) % 64) + 64) % 64, vsp = F.vanFrame(hi);
  if (vsurf !== 'mat') art.drawShadow(ctx, vsp, vx, vy);
  if (van.lights) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,196,107,.075)'; ctx.beginPath(); sf.wedgePath(ctx, { x: vx, y: vy, a: van.a }); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
  ctx.restore();

  // 6c. props and the van, sorted by the y of their base. Tall props turn 35% see-through while the van is behind them.
  const VAN = { sortY: vy + 9, van: true }; list.push(VAN); list.sort((a, b) => a.sortY - b.sortY);
  for (const p of list) {
    if (p.van) { drawVan(vsp, vx, vy); continue; }
    if (p.tall) { const t = p.tall, behind = vy < p.sortY - 4 && vx > t[0] - 6 && vx < t[1] + 6 && vy > t[2]; p.alpha += ((behind ? 0.35 : 1) - p.alpha) * 0.2; }
    if (p.alpha < 0.99) ctx.globalAlpha = p.alpha;
    const q = p.squash;
    if (q > 0) { ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1 + 0.05 * q, 1 - 0.08 * q); ctx.translate(-p.x, -p.y); }
    if (p.draw) p.draw(ctx, p); else art.drawSpr(ctx, p.sp, p.x, p.y);
    const f = p.find; if (f && f.tabOn && f.tabSp) { const t = f.tabAt; ctx.save(); ctx.translate(t[0], t[1]); ctx.rotate(t[2]); art.drawSpr(ctx, f.tabSp, 0, 0); ctx.restore(); }
    if (q > 0) ctx.restore();
    ctx.globalAlpha = 1;
  }

  // 8. particles
  sf.drawParts(ctx, spr, view);

  // the three-track moment: each table outlined in its colour, one after another
  if (F.three.on && F.three.t < 3.2) {
    const n = F.three.n, lw = 7 / (view.k * cam.zoom) * 0.5 + 5; ctx.lineWidth = lw; ctx.lineJoin = 'round';
    if (n > 0) { ctx.strokeStyle = TRACK.w.strong; ctx.strokeRect(D[0], D[1], D[2] - D[0], D[3] - D[1]); }
    if (n > 1) { ctx.strokeStyle = TRACK.k.strong; ctx.strokeRect(B[0], B[1], B[2] - B[0], B[3] - B[1]); }
    if (n > 2) { ctx.strokeStyle = TRACK.v.strong; ctx.strokeRect(M[0], M[1], M[2] - M[0], M[3] - M[1]); }
  }
  if (tapRing) { const u = tapRing.t / 0.45; ctx.globalAlpha = 1 - u; ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(tapRing.x, tapRing.y, 8 + u * 22, (8 + u * 22) * 0.8, 0, 0, 6.2832); ctx.stroke(); ctx.strokeStyle = PAL.van; ctx.lineWidth = 1.2; ctx.stroke(); ctx.globalAlpha = 1; }

  // screen space: the floating stick, and once, the ghost thumb
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  const st = input.stick;
  if (st && st.live && !st.dead) {
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(20,17,15,.22)'; ctx.beginPath(); ctx.arc(st.cx, st.cy, 35, 0, 6.2832); ctx.stroke();
    ctx.strokeStyle = 'rgba(244,241,232,.4)'; ctx.beginPath(); ctx.arc(st.cx, st.cy, 33.5, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = 'rgba(244,241,232,.22)'; ctx.beginPath(); ctx.arc(st.x, st.y, 13, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = 'rgba(20,17,15,.25)'; ctx.lineWidth = 1.2; ctx.stroke();
  }
  if (!S.firstInput && !S.reduced && S.rt > 0.9 && S.rt < 1.9) {
    const u = (S.rt - 0.9) / 1.0, e = 1 - Math.pow(1 - Math.min(1, u * 1.5), 3), a = u < 0.15 ? u / 0.15 : u > 0.7 ? (1 - u) / 0.3 : 1;
    const gx = view.w / 2, gy = view.h * (0.84 - 0.1 * e);
    ctx.globalAlpha = a * 0.7; ctx.lineWidth = 2.5; ctx.strokeStyle = PAL.van; ctx.beginPath(); ctx.arc(gx, gy, 24, 0, 6.2832); ctx.stroke();
    ctx.globalAlpha = a * 0.25; ctx.fillStyle = PAL.van; ctx.fill(); ctx.globalAlpha = 1;
    ghost = Math.sin(Math.min(1, u * 1.5) * Math.PI) * 3;
  } else ghost = 0;
}

function drawVan(sp, x, y) {
  const bob = van.speed > 30 ? Math.sin(S.rt * 34) * 0.5 : 0, a = van.a, sn = Math.sin(a), cs = Math.cos(a);
  const lamps = () => {
    if (!van.lights) return;
    for (const side of [-7, 7]) art.drawSpr(ctx, F.spr.warm, x + cs * 23.5 - sn * side, y + sn * 23.5 + cs * side - 5 + bob);
  };
  if (sn < -0.25) lamps();
  art.drawSpr(ctx, sp, x, y + bob - ghost);
  if (sn >= -0.25) lamps();
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
