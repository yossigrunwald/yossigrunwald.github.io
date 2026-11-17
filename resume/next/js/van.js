// van.js — input, the driving model (spec 3.3), collisions, autopilot.
import { S, standable, clampToWorld, WAYPOINTS, SPAWN } from './world.js';

export const R = 18;                 // van collider radius
const VMAX = 340, ACC = 1500, BRAKE = 900, TURN = 720 * Math.PI / 180;

export const van = {
  x: SPAWN.x, y: SPAWN.y, px: SPAWN.x, py: SPAWN.y, vx: 0, vy: 0, a: -Math.PI / 2, speed: 0,
  lights: true, drag: 1, cn: null, cs: null, odo: 0, squash: 0, edgeAt: -9, slideC: null, slideSide: 0, push: 0
};
// hold: the van takes no steering for now (the three-track moment); the stick and the keys are read again when it lifts
export const input = { stick: null, dx: 0, dy: 0, mag: 0, keys: new Set(), hold: false, last: null };
export const auto = { on: false, x: 0, y: 0, speed: 300, prop: null, stuck: 0, via: null, tried: false, slideC: null, slideSide: 0, done: null, idle: false };

let bumpFn = null;
export function onBump(fn) { bumpFn = fn; }

// drive itself to a spot or into a prop. o: { prop, speed, done, idle }
export function goTo(x, y, o = {}) {
  if (!o.prop) [x, y] = clampToWorld(x, y);
  Object.assign(auto, { on: true, x, y, speed: o.speed || 300, prop: o.prop || null, stuck: 0, via: null, tried: false, slideC: null, slideSide: 0, done: o.done || null, idle: !!o.idle });
}
export function stopAuto() { auto.on = false; auto.prop = null; auto.via = null; auto.done = null; auto.idle = false; }
function arrive() { const d = auto.done; stopAuto(); if (d) d(); }

// Bend a wanted direction (unit dx, dy) round whatever the van is touching. mem keeps the chosen side (slideC, slideSide).
// skip: a prop the autopilot is trying to reach. keep: how much of the original push survives (the stick still leans in).
// Returns [dx, dy] or null when nothing is in the way.
function around(dx, dy, mem, skip, keep) {
  const cs = van.cs; if (!cs || !cs.length) return null;
  let n = 0, worst = 0, w = null;
  for (const q of cs) { if (skip && q.c.prop === skip) continue; n++; const d = dx * q.nx + dy * q.ny; if (d < worst) { worst = d; w = q; } }
  if (!w || worst > -0.03) return null;
  let tx, ty;
  if (n >= 2) {
    // a pocket between two things: take the way out that neither blocks, nearest to where the stick points
    let bd = -9, bq = null, bs = 0;
    for (const q of cs) for (const sg of [1, -1]) {
      const ux = -q.ny * sg, uy = q.nx * sg; let ok = true;
      for (const o of cs) if (o !== q && ux * o.nx + uy * o.ny < -0.02) ok = false;
      const d = ux * dx + uy * dy + (mem.slideC === q.c && mem.slideSide === sg ? 0.5 : 0);
      if (ok && d > bd) { bd = d; bq = q; bs = sg; }
    }
    if (!bq) { let ax = 0, ay = 0; for (const q of cs) { ax += q.nx; ay += q.ny; } const l = Math.hypot(ax, ay) || 1; return [ax / l, ay / l]; }   // boxed in: back straight out
    mem.slideC = bq.c; mem.slideSide = bs;
    return [-bq.ny * bs, bq.nx * bs];
  }
  tx = -w.ny; ty = w.nx;
  if (mem.slideC !== w.c) {
    const c = w.c, ccx = c.t === 'c' ? c.x : (c.x0 + c.x1) / 2, ccy = c.t === 'c' ? c.y : (c.y0 + c.y1) / 2;
    const lean = dx * tx + dy * ty, along = (van.x - ccx) * tx + (van.y - ccy) * ty;
    mem.slideSide = Math.abs(lean) > 0.12 ? Math.sign(lean) : (along >= 0 ? 1 : -1); mem.slideC = c;
  }
  let ox = tx * mem.slideSide + dx * keep - w.nx * (keep ? 0 : 0.12), oy = ty * mem.slideSide + dy * keep - w.ny * (keep ? 0 : 0.12);
  const l = Math.hypot(ox, oy) || 1; return [ox / l, oy / l];
}

export function step(dt) {
  van.px = van.x; van.py = van.y;
  let dx = 0, dy = 0, mag = 0, human = false;
  const k = input.keys;
  if (k.size && !input.hold) {
    dx = (k.has('r') ? 1 : 0) - (k.has('l') ? 1 : 0); dy = (k.has('d') ? 1 : 0) - (k.has('u') ? 1 : 0);
    const l = Math.hypot(dx, dy); if (l) { dx /= l; dy /= l; mag = 1; human = true; }
  }
  if (!mag && input.mag > 0 && !input.hold) { dx = input.dx; dy = input.dy; mag = input.mag; human = true; }
  const cn = van.cn;
  if (human) {
    // never stuck: the bump lands first; after a quarter second of pushing, the push is bent round whatever is in the way.
    // Not round a thing whose label has only just gone up, though: for 1.5 s a held thumb keeps the van at what it found,
    // so a find is an arrival and not something the van curls past.
    let worst = 0, wq = null; if (van.cs) for (const q of van.cs) { const d = dx * q.nx + dy * q.ny; if (d < worst) { worst = d; wq = q; } }
    van.push = worst < -0.7 ? van.push + dt : 0;
    const wf = wq && wq.c.prop && (wq.c.prop.find || wq.c.prop.say), fresh = wf && S.rt - (wf.labAt === undefined ? -9 : wf.labAt) < 1.5;
    if (van.push > 0.25 && !fresh) { const r = around(dx, dy, van, null, 0.95); if (r) { dx = r[0]; dy = r[1]; } }
    if (!cn) van.slideC = null;
  }

  if (!human && auto.on) {
    const tx = auto.via ? auto.via[0] : auto.x, ty = auto.via ? auto.via[1] : auto.y;
    const ex = tx - van.x, ey = ty - van.y, d = Math.hypot(ex, ey);
    if (auto.via && d < 28) auto.via = null;
    else if (!auto.via && !auto.prop && d < 5) arrive();
    else if (auto.prop && cn && cn.c.prop === auto.prop && cn.pen > -0.5) arrive();
    else {
      dx = ex / (d || 1); dy = ey / (d || 1); mag = auto.speed / VMAX;
      if (!auto.prop && !auto.via) mag *= Math.min(1, 0.2 + d / 80);
      const r = around(dx, dy, auto, auto.prop, 0);                   // slide round whatever is in the way
      if (r) { dx = r[0]; dy = r[1]; } else if (!cn) auto.slideC = null;
      // stuck: try one waypoint, then give up (spec 3.3)
      if (van.speed < 20) {
        auto.stuck += dt;
        if (auto.stuck > 0.6) {
          auto.stuck = 0;
          if (!auto.tried) {
            auto.tried = true; let best = null, bd = 1e9;
            for (const w of WAYPOINTS) { const wd = Math.hypot(w[0] - van.x, w[1] - van.y); if (wd > 50 && wd < bd) { bd = wd; best = w; } }
            auto.via = best;
          } else arrive();
        }
      } else auto.stuck = 0;
    }
  }

  // velocity toward the target, rate limited
  const f = van.drag, tvx = dx * mag * VMAX * f, tvy = dy * mag * VMAX * f;
  const rate = (mag > 0 ? ACC : BRAKE) * dt, ax = tvx - van.vx, ay = tvy - van.vy, al = Math.hypot(ax, ay);
  if (al <= rate) { van.vx = tvx; van.vy = tvy; } else { van.vx += ax / al * rate; van.vy += ay / al * rate; }

  let nx = van.x + van.vx * dt, ny = van.y + van.vy * dt;

  // props: push out along the normal, drop the normal velocity, keep 85% of the tangential on impact
  van.cn = null; const cs = van.cs = [];
  for (let it = 0; it < 2; it++) {
    for (const c of S.colliders) {
      if (c.off) continue;
      let nnx, nny, pen;
      if (c.t === 'c') {
        const ex = nx - c.x, ey = ny - c.y, d = Math.hypot(ex, ey), rr = R + c.r;
        if (d >= rr + 2) continue;
        nnx = d > 0.001 ? ex / d : 0; nny = d > 0.001 ? ey / d : 1; pen = rr - d;
      } else {
        const qx = nx < c.x0 ? c.x0 : nx > c.x1 ? c.x1 : nx, qy = ny < c.y0 ? c.y0 : ny > c.y1 ? c.y1 : ny;
        const ex = nx - qx, ey = ny - qy, d = Math.hypot(ex, ey);
        if (d < 0.001) {
          const l = nx - c.x0, r = c.x1 - nx, t = ny - c.y0, b = c.y1 - ny, m = Math.min(l, r, t, b);
          if (m === l) { nnx = -1; nny = 0; } else if (m === r) { nnx = 1; nny = 0; } else if (m === t) { nnx = 0; nny = -1; } else { nnx = 0; nny = 1; }
          pen = m + R;
        } else {
          if (d >= R + 2) continue;
          nnx = ex / d; nny = ey / d; pen = R - d;
        }
      }
      if (!van.cn || pen > van.cn.pen) van.cn = { nx: nnx, ny: nny, c, pen };
      let q = null; for (const e of cs) if (e.c === c) q = e;
      if (!q) cs.push(q = { c }); q.nx = nnx; q.ny = nny; q.pen = pen;
      if (pen > 0) {
        nx += nnx * pen; ny += nny * pen;
        const vn = van.vx * nnx + van.vy * nny;
        if (vn < 0) {
          van.vx -= vn * nnx; van.vy -= vn * nny;
          if (S.rt - (c.tt || -9) > 0.3) { van.vx *= 0.85; van.vy *= 0.85; if (bumpFn && -vn > 24) bumpFn(c, -vn); }
        }
        c.tt = S.rt;
      }
    }
  }

  // table edges: no drone in this stage, so the van stops with its nose at the edge (or the tape) and slides along it.
  // Running into it at speed gives the van a small squash, so the stop reads as an edge and not as a fault.
  if (!standable(nx, ny)) {
    let hit;
    if (standable(nx, van.y)) { ny = van.y; hit = Math.abs(van.vy); van.vy = 0; }
    else if (standable(van.x, ny)) { nx = van.x; hit = Math.abs(van.vx); van.vx = 0; }
    else { nx = van.x; ny = van.y; hit = Math.hypot(van.vx, van.vy); van.vx = van.vy = 0; }
    if (hit > 90 && S.rt - van.edgeAt > 0.3) van.squash = 1;
    van.edgeAt = S.rt;
  }

  van.odo += Math.hypot(nx - van.x, ny - van.y);
  van.x = nx; van.y = ny; van.speed = Math.hypot(van.vx, van.vy);
  if (van.speed > 20) {
    let da = Math.atan2(van.vy, van.vx) - van.a;
    while (da > Math.PI) da -= 6.283185307; while (da < -Math.PI) da += 6.283185307;
    const mt = TURN * dt; van.a += da > mt ? mt : da < -mt ? -mt : da;
  }
}

// ---- pointer and keyboard ----
// The stick vector from where the thumb is now. Also called by main.js when a thumb that stayed down gets the van back.
export function readStick(s) {
  if (!s || s.dead || s.edge) { input.mag = 0; return; }
  let dx = s.x - s.cx, dy = s.y - s.cy, d = Math.hypot(dx, dy);
  if (d > 90) { s.cx = s.x - dx / d * 90; s.cy = s.y - dy / d * 90; d = 90; }       // the stick centre follows the thumb
  if (d > 8) {
    input.dx = dx / d; input.dy = dy / d; input.mag = Math.min(1, (d - 8) / 56);
    if (!s.live) { s.live = true; stopAuto(); }
  } else input.mag = 0;
}
// h: { first() -> 0 | 1 | 2, tap(worldX, worldY), toWorld(clientX, clientY), w() -> viewport width, live() }
// first(): 0 an ordinary touch · 1 swallowed, it steers nothing for now · 2 it ended something: it may steer, it is not a tap
export function bindInput(cv, h) {
  let pid = null;
  const end = (e, cancel) => {
    if (e.pointerId !== pid) return;
    const s = input.stick; pid = null; input.stick = null; input.mag = 0;
    try { cv.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
    if (!s) return;
    const ms = performance.now() - s.t;
    input.last = { ms: Math.round(ms), moved: Math.round(s.moved), live: s.live, cancel };
    // A tap is a press that never moved 10 px. A still press cannot be a drag, so slow and deliberate taps count too.
    if (!cancel && !s.live && !s.noTap && s.moved < 10 && ms < 700) h.tap(s.wx, s.wy);   // where the thumb landed, in the world as it was then
  };
  cv.addEventListener('pointerdown', e => {
    if (pid !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
    // within 20 px of the left or right edge (the iOS back swipe) a drag steers nothing; a tap there still counts
    const edge = e.pointerType === 'touch' && (e.clientX < 20 || e.clientX > h.w() - 20);
    pid = e.pointerId;
    try { cv.setPointerCapture(pid); } catch (err) { /* synthetic pointers cannot be captured */ }
    const w = h.toWorld(e.clientX, e.clientY);
    const s = input.stick = { cx: e.clientX, cy: e.clientY, x: e.clientX, y: e.clientY, t: performance.now(), moved: 0, live: false, wx: w[0], wy: w[1], dead: false, noTap: false, edge };
    const r = h.first(); s.dead = r === 1; s.noTap = r > 0;
    // Not for touch: cancelling a touch's pointerdown can drop the click that follows the tap (WebKit), and that click
    // is one of the ways a screen is played. touch-action, user-select and the touchmove handler already stop scroll and zoom.
    if (e.pointerType === 'mouse') e.preventDefault();
  });
  cv.addEventListener('pointermove', e => {
    if (e.pointerId !== pid) return;
    const s = input.stick; s.x = e.clientX; s.y = e.clientY;
    const d = Math.hypot(s.x - s.cx, s.y - s.cy); if (d > s.moved) s.moved = d;
    if (!input.hold) readStick(s);
  });
  cv.addEventListener('pointerup', e => end(e, false));
  cv.addEventListener('pointercancel', e => end(e, true));
  cv.addEventListener('lostpointercapture', e => end(e, true));       // a touch that vanishes without an up or a cancel must not leave the stick held
  cv.addEventListener('contextmenu', e => e.preventDefault());

  const KEY = { ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r' };
  addEventListener('keydown', e => {
    const k = KEY[e.code]; if (!k || e.metaKey || e.ctrlKey || e.altKey || !h.live()) return;
    if (h.first() === 1) return; input.keys.add(k); stopAuto(); e.preventDefault();
  });
  addEventListener('keyup', e => { const k = KEY[e.code]; if (k) input.keys.delete(k); });
  addEventListener('blur', () => { input.keys.clear(); });
}
