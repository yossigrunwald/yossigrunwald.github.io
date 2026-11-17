// surfaces.js — the three ways a table clears: paper bodies (desk), the flour canvas (block),
// the trail canvas and the headlight wedge (mat). Plus the particle pool.
import { G, BOX, PAL, DRIFTS, HUB_R, S, mulberry32, SEED, surfaceAt } from './world.js';
import { mk, rgba } from './art.js';

export const TR = 0.5;                       // trail canvas: pixels per world unit (half resolution)
const FR = 1;                                // flour canvas: one pixel per unit, so its edges are as crisp as the sprites
const rnd = mulberry32(SEED ^ 0x9e37);

// ---------------- trail: one persistent canvas, stamped, never cleared, never faded ----------------
export let trail = null;
let tg = null, last = null;
// ---------------- flour: the block only ----------------
export let flour = null;
let fg = null, wiped = null, cw = 0, ch = 0;
const CELL = 12;
export const NOSE = 18;                      // flour is felt at the van's nose, this far ahead of its middle: behind that it is already ploughed

// One heap of flour, hard-edged like everything else on the table. A lumpy outline through 18 radial points, drawn as
// its cast shadow and four steps (rim, body, shoulder, crest). Then what makes it powder and not plaster: a scoop taken
// out of it, sifted specks on top, and a skirt of loose dust thrown off the rim, thicker on the side away from the light.
// The two small spills keep a plain 10-point outline and get a thin skirt only.
function drift(g, d, r) {
  const R = d.r, k = R / 80, big = R >= 44, n = big ? 18 : 10, pts = [], rad = [];
  // A big heap's radii span R x 0.70..1.12, but neighbours agree with each other (smoothed twice, then stretched back to
  // the full span): an uneven heap with two or three broad sides, not a splash with fingers.
  let raw = []; for (let i = 0; i < n; i++) raw.push(r());
  if (big) {
    for (let p = 0; p < 2; p++) raw = raw.map((v, i) => 0.25 * raw[(i + n - 1) % n] + 0.5 * v + 0.25 * raw[(i + 1) % n]);
    const lo = Math.min(...raw), hi = Math.max(...raw); raw = raw.map(v => (v - lo) / (hi - lo || 1));
  }
  for (let i = 0; i < n; i++) {
    const a = (i + (r() - 0.5) * (big ? 0.3 : 0.5)) / n * 6.2832, q = R * (big ? 0.70 + raw[i] * 0.42 : 0.78 + raw[i] * 0.3);
    rad.push(q); pts.push([Math.cos(a) * q, Math.sin(a) * q * 0.8]);
  }
  // where the smoothed rim really is at an angle (the curve passes inside its control points)
  const rim = a => {
    const f = ((a / 6.2832) % 1 + 1) % 1 * n, i = f | 0, t = f - i, e = j => 0.125 * rad[(j + n - 1) % n] + 0.75 * rad[j % n] + 0.125 * rad[(j + 1) % n];
    return e(i) * (1 - t) + e(i + 1) * t;
  };
  const blob = (ox, oy, sc) => {
    g.beginPath();
    for (let i = 0; i <= n; i++) {
      const p = pts[i % n], q = pts[(i + 1) % n], mx = (p[0] + q[0]) / 2 * sc + d.x + ox, my = (p[1] + q[1]) / 2 * sc + d.y + oy;
      if (i === 0) g.moveTo(mx, my); else g.quadraticCurveTo(p[0] * sc + d.x + ox, p[1] * sc + d.y + oy, mx, my);
    }
    g.closePath(); g.fill();
  };
  g.fillStyle = 'rgba(20,17,15,.14)'; blob(6 * k + 1, 4 * k + 1, 1);
  g.fillStyle = PAL.flourShade; blob(0, 0, 1);
  g.fillStyle = PAL.flour; blob(-3 * k, -3 * k, 0.92);
  g.fillStyle = '#FBF8F1'; blob(-6 * k, -5.5 * k, 0.74);                 // a middle step, so it climbs like a heap and is not a yolk on a white
  g.fillStyle = '#FFFDF8'; blob(-9 * k, -8 * k, 0.5);
  // the rim is not a clean line: it breaks into crumbs, small angular clumps on and just off the edge, each with a shaded side
  for (let i = 0, m = big ? 84 : 30; i < m; i++) {
    const a = r() < 0.6 ? -0.785 + r() * 3.1416 : 2.356 + r() * 3.1416, q = rim(a) - 2.5 + r() * 7, cr = 1.1 + r() * 2.3, a0 = r() * 6.2832;
    const x = d.x + Math.cos(a) * q, y = d.y + Math.sin(a) * q * 0.8, pg = [];
    for (let j = 0; j < 5; j++) { const t = a0 + j * 1.2566, e = cr * (0.6 + r() * 0.6); pg.push([Math.cos(t) * e, Math.sin(t) * e]); }
    const crumb = (ox, oy) => { g.beginPath(); g.moveTo(x + pg[0][0] + ox, y + pg[0][1] + oy); for (let j = 1; j < 5; j++) g.lineTo(x + pg[j][0] + ox, y + pg[j][1] + oy); g.closePath(); g.fill(); };
    g.fillStyle = PAL.flourShade; crumb(0.9, 0.9); g.fillStyle = i % 3 ? PAL.flour : '#FFFDF8'; crumb(0, 0);
  }
  if (big) {                                                              // the scoop: its upper-left wall is in shade, its floor is plain flour
    const sx = d.x + 0.12 * R, sy = d.y + 0.12 * R, el = (x, y, m) => { g.beginPath(); g.ellipse(x, y, 0.275 * R * m, 0.1 * R * m, -0.436, 0, 6.2832); g.fill(); };
    g.fillStyle = PAL.flourShade; el(sx, sy, 1);
    g.fillStyle = PAL.flour; el(sx + 2, sy + 2, 0.8);
  }
  g.fillStyle = '#E4DBC8';                                                // sifted: one-unit specks all over the top
  for (let i = 0, m = big ? 70 : 16; i < m; i++) {
    const a = r() * 6.2832, q = Math.sqrt(r()) * 0.8 * rim(a);
    g.fillRect(Math.round(d.x + Math.cos(a) * q), Math.round(d.y + Math.sin(a) * q * 0.8), 1, 1);
  }
  g.fillStyle = rgba(PAL.flour, 0.9);                                     // the skirt: 3 to 24 units off the rim, thinning as it goes
  const m1 = big ? 300 : 90, m2 = big ? 40 : 10, m3 = big ? 160 : 50;       // m3: a close fringe, tight against the rim
  for (let i = 0; i < m1 + m2 + m3; i++) {
    const a = r() < 0.667 ? -0.785 + r() * 3.1416 : 2.356 + r() * 3.1416, sz = i >= m1 && i < m1 + m2 ? 2 : 1;
    const q = rim(a) + (i < m1 + m2 ? 24 * (1 - 0.875 * Math.cbrt(r())) : -1 + r() * 6);
    g.fillRect(Math.round(d.x + Math.cos(a) * q), Math.round(d.y + Math.sin(a) * q * 0.8), sz, sz);
  }
}

export function initSurfaces() {
  trail = mk((BOX[2] - BOX[0]) * TR, (BOX[3] - BOX[1]) * TR); tg = trail.getContext('2d');
  tg.setTransform(TR, 0, 0, TR, -BOX[0] * TR, -BOX[1] * TR); tg.lineCap = 'round'; tg.lineJoin = 'round';
  // two old tyre tracks on the plywood, leading out of the garage mouth
  tg.strokeStyle = 'rgba(74,38,16,.2)'; tg.lineWidth = 3.2; tg.setLineDash([9, 3.5]);
  for (const x of [-11.5, 11.5]) { tg.beginPath(); tg.moveTo(x, 448); tg.lineTo(x, 508); tg.stroke(); }
  tg.setLineDash([]);

  const b = G.block, w = b[2] - b[0], h = b[3] - b[1], r = mulberry32(SEED ^ 0xf10);
  flour = mk(w * FR, h * FR); fg = flour.getContext('2d'); fg.setTransform(FR, 0, 0, FR, -b[0] * FR, -b[1] * FR);
  cw = Math.ceil(w / CELL); ch = Math.ceil(h / CELL); wiped = new Uint8Array(cw * ch);
  // the haze: one flat dusting, then the bench wiped by a palm seven or nine times so the wood shows through in swipes
  fg.fillStyle = rgba(PAL.flour, 0.34); fg.fillRect(b[0], b[1], w, h);
  fg.globalCompositeOperation = 'destination-out'; fg.strokeStyle = 'rgba(0,0,0,.45)'; fg.lineCap = 'round';
  const dirs = [-0.42, 0.3, 1.2];
  for (let i = 0; i < 9; i++) {
    const len = 180 + r() * 140, rad = 300 + r() * 420, a = dirs[i % 3] + (r() - 0.5) * 0.16, sweep = len / rad, turn = r() < 0.5 ? 1 : -1;
    const mx = b[0] + 60 + r() * (w - 120), my = b[1] + 50 + r() * (h - 100);
    const cx = mx - Math.sin(a) * rad * turn, cy = my + Math.cos(a) * rad * turn, a0 = Math.atan2(my - cy, mx - cx);
    fg.lineWidth = 34 + r() * 12; fg.beginPath(); fg.arc(cx, cy, rad, a0 - sweep / 2, a0 + sweep / 2); fg.stroke();
  }
  fg.globalCompositeOperation = 'source-over';
  // loose grains, exactly one unit each, only near a heap or the sack
  fg.fillStyle = rgba(PAL.flour, 0.9);
  const near = DRIFTS.concat([{ x: -420, y: 60, r: 50 }]);
  for (let i = 0; i < 5000; i++) {
    const d = near[(r() * near.length) | 0], a = r() * 6.2832, rad = d.r * 0.7 + Math.pow(r(), 1.7) * (90 + d.r * 0.3);
    fg.fillRect(Math.round(d.x + Math.cos(a) * rad), Math.round(d.y + Math.sin(a) * rad * 0.8), 1, 1);
  }
  for (const d of DRIFTS) drift(fg, d, r);
  // nothing floury on the hub
  fg.globalCompositeOperation = 'destination-out'; fg.beginPath(); fg.arc(0, 0, HUB_R + 3, 0, 6.2832); fg.fill(); fg.globalCompositeOperation = 'source-over';
}

// inside a heap's footprint (whether or not it has been ploughed since)
function inDrift(x, y) {
  for (const d of DRIFTS) { const dx = x - d.x, dy = (y - d.y) / 0.8; if (dx * dx + dy * dy < d.r * d.r * 0.8) return true; }
  return false;
}
// 0 none or wiped · 1 haze · 2 deep drift
export function flourAt(x, y) {
  const b = G.block;
  if (x < b[0] || x >= b[2] || y < b[1] || y >= b[3] || x * x + y * y < HUB_R * HUB_R) return 0;
  if (wiped[((y - b[1]) / CELL | 0) * cw + ((x - b[0]) / CELL | 0)]) return 0;
  return inDrift(x, y) ? 2 : 1;
}
// One plough tick. The furrow is cut with two hard discs (a 20-unit one that takes about half, a 14-unit one that takes
// everything) and two tyre stamps, so its edge is as hard as every other edge on the table. What was pushed aside is
// banked along both sides as short flat dabs lying along the heading, overlapping into a broken ridge: no row of dots.
// lvl: what the van is ploughing (0 nothing left, 1 haze, 2 a heap). Nothing left to push means no new bank.
const berm = [3, 5], bank = [22, 23]; let dabs = 0;
function wipe(x, y, hx, hy, lvl) {
  const b = G.block, px = -hy, py = hx;
  fg.globalCompositeOperation = 'destination-out';
  fg.fillStyle = 'rgba(0,0,0,.45)'; fg.beginPath(); fg.arc(x, y, 20, 0, 6.2832); fg.fill();
  fg.fillStyle = '#000'; fg.beginPath(); fg.arc(x, y, 14, 0, 6.2832);
  fg.moveTo(x + px * 11.7 - hx * 10 + 3.2, y + py * 11.7 - hy * 10); fg.arc(x + px * 11.7 - hx * 10, y + py * 11.7 - hy * 10, 3.2, 0, 6.2832);
  fg.moveTo(x - px * 11.7 - hx * 10 + 3.2, y - py * 11.7 - hy * 10); fg.arc(x - px * 11.7 - hx * 10, y - py * 11.7 - hy * 10, 3.2, 0, 6.2832); fg.fill();
  fg.globalCompositeOperation = 'source-over';
  if (lvl) {
    const head = Math.atan2(hy, hx);
    for (let sd = 0; sd < 2; sd++) {
      berm[sd] -= 6;
      while (berm[sd] <= 0) {
        // the bank wanders between 20 and 25 units out, a little at a time, so one dab runs into the next; now and then it breaks
        bank[sd] = Math.max(20, Math.min(25, bank[sd] + (rnd() - 0.5) * 2.4));
        const along = berm[sd] - 7 - rnd() * 3, o = bank[sd] * (sd ? 1 : -1);
        berm[sd] += 5 + rnd() * 3;
        if (rnd() < 0.1) continue;
        const dx = x + px * o + hx * along, dy = y + py * o + hy * along, heap = inDrift(dx, dy);
        const rl = (9 + rnd() * 6) / 2, rw = (2.2 + rnd() * 1.8) / 2, ang = head + (rnd() - 0.5) * 0.3;
        if (heap) { fg.fillStyle = PAL.flourShade; fg.beginPath(); fg.ellipse(dx + 1, dy + 1, rl, rw, ang, 0, 6.2832); fg.fill(); }   // on white a ridge only shows by its shaded side
        fg.fillStyle = heap ? rgba('#FFFDF8', 0.95) : rgba(PAL.flour, 0.42 + rnd() * 0.2);
        fg.beginPath(); fg.ellipse(dx, dy, rl, rw, ang, 0, 6.2832); fg.fill();
        if (heap && ++dabs % 3 === 0) {                                     // in a heap, a clump breaks off now and then
          const cx = dx + px * (sd ? 3 : -3) + (rnd() - 0.5) * 4, cy = dy + py * (sd ? 3 : -3) + (rnd() - 0.5) * 4, cr = 1.5 + rnd();
          fg.fillStyle = PAL.flourShade; fg.beginPath(); fg.arc(cx + 0.8, cy + 0.8, cr, 0, 6.2832); fg.fill();
          fg.fillStyle = '#FFFDF8'; fg.beginPath(); fg.arc(cx, cy, cr, 0, 6.2832); fg.fill();
        }
      }
    }
  }
  // cells whose middle is inside the 14-unit disc are ploughed. (Not a whole 3 x 3 block: that reached past the van's nose,
  // so the flour ahead always counted as already gone, and nothing was banked or thrown.)
  const cx = (x - b[0]) / CELL | 0, cy = (y - b[1]) / CELL | 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const u = cx + i, v = cy + j, ex = b[0] + (u + 0.5) * CELL - x, ey = b[1] + (v + 0.5) * CELL - y;
    if (u >= 0 && v >= 0 && u < cw && v < ch && ex * ex + ey * ey < 196) wiped[v * cw + u] = 1;
  }
}

// called every 6 units of travel with the van's position and unit heading. Returns what was ploughed (0, 1, 2).
export function stamp(x, y, hx, hy) {
  const px = -hy, py = hx, bx = x - hx * 12, by = y - hy * 12;
  const L = [bx + px * 11.7, by + py * 11.7], Rr = [bx - px * 11.7, by - py * 11.7];
  const sL = surfaceAt(L[0], L[1]), sR = surfaceAt(Rr[0], Rr[1]);
  let ploughed = 0;
  if (surfaceAt(x, y) === 'block') { ploughed = flourAt(x + hx * NOSE, y + hy * NOSE); wipe(x, y, hx, hy, ploughed); }   // what the nose is pushing into
  if (last && Math.hypot(L[0] - last.L[0], L[1] - last.L[1]) < 30) { mark(last.L, L, last.sL, sL); mark(last.R, Rr, last.sR, sR); }
  last = { L, R: Rr, sL, sR };
  return ploughed;
}
// One tyre's mark from a to c. Its colour comes from the surface under that tyre, at both ends, never from the surface
// under the middle of the van: so no pink runs out onto the desk, and no grey onto the mat.
function mark(a, c, s0, s1) {
  if (!s1 || s1 === 'hub' || s0 !== s1) return;
  const seg = () => { tg.beginPath(); tg.moveTo(a[0], a[1]); tg.lineTo(c[0], c[1]); tg.stroke(); };
  if (s1 === 'mat') {                        // the line of light
    tg.lineCap = 'butt'; tg.strokeStyle = rgba(PAL.pink, 0.2); tg.lineWidth = 15; seg();
    tg.strokeStyle = rgba(PAL.pink, 0.5); tg.lineWidth = 7; seg();
    tg.lineCap = 'round'; tg.strokeStyle = '#FFE3EB'; tg.lineWidth = 2.8; seg();
  } else {
    tg.lineCap = 'round'; tg.lineWidth = 3.2;
    tg.strokeStyle = s1 === 'desk' ? 'rgba(96,110,128,.22)' : 'rgba(74,38,16,.2)'; seg();
  }
}

// ---------------- the headlight wedge: apex at the nose, 22 degrees either side. 260 long on the mat, shorter elsewhere ----------------
export function wedgePath(ctx, van, len = 260) {
  const a = van.a, ax = van.x + Math.cos(a) * 28, ay = van.y + Math.sin(a) * 28, d = 0.384, Rr = len / Math.cos(d);
  ctx.moveTo(ax, ay); ctx.lineTo(ax + Math.cos(a - d) * Rr, ay + Math.sin(a - d) * Rr); ctx.lineTo(ax + Math.cos(a + d) * Rr, ay + Math.sin(a + d) * Rr); ctx.closePath();
}
// the same wedge cut off by a circle of radius r round the nose: a hot spot that ends in an arc, not in a straight chord
export function sectorPath(ctx, van, r) {
  const a = van.a, ax = van.x + Math.cos(a) * 28, ay = van.y + Math.sin(a) * 28, d = 0.384;
  ctx.moveTo(ax, ay); ctx.arc(ax, ay, r, a - d, a + d); ctx.closePath();
}
// ---------------- paper: point bodies. Pushed, they fly, slide off the desk edge and are gone for good ----------------
export const paper = { inPile: false, hits: 0 };
export function updatePaper(dt, van) {
  const d = G.desk; let near = 0; paper.hits = 0;
  const fast = van.speed > 30;
  for (const s of S.sheets) {
    if (s.gone >= 1) continue;
    if (s.gone > 0) { s.gone += dt / 0.4; s.x += s.vx * dt; s.y += s.vy * dt + 70 * dt; s.a += s.spin * dt; continue; }
    const dx = s.x - van.x, dy = s.y - van.y, d2 = dx * dx + dy * dy;
    if (d2 < 1444) {                                   // inside 38 units of the van
      if (!s.loose) near++;
      if (fast && !s.pinned && (!s.loose || s.cool <= 0)) {
        const dd = Math.sqrt(d2) || 1, k = 190 + rnd() * 190;
        s.vx = van.vx * 0.8 + dx / dd * k + (rnd() - 0.5) * 110; s.vy = van.vy * 0.8 + dy / dd * k + (rnd() - 0.5) * 110;
        s.spin = (rnd() - 0.5) * 18; s.lift = 1; s.cool = 0.3;
        if (!s.loose) { s.loose = true; paper.hits++; }
        // which edge it leaves by: the one it is already heading for, never back toward the hub
        const sp = Math.hypot(s.vx, s.vy) || 1, ux = s.vx / sp, uy = s.vy / sp;
        const cW = (s.x - d[0]) / Math.max(0.25, 1 - ux), cE = (d[2] - s.x) / Math.max(0.25, 1 + ux), cN = (s.y - d[1]) / Math.max(0.25, 1 - uy) * 1.15;
        if (cW <= cE && cW <= cN) { s.gx = -1; s.gy = 0; } else if (cE <= cN) { s.gx = 1; s.gy = 0; } else { s.gx = 0; s.gy = -1; }
      }
    }
    if (!s.loose) continue;
    s.cool -= dt;
    let sp = Math.hypot(s.vx, s.vy) || 1;
    s.vx += s.gx * 520 * dt; s.vy += s.gy * 520 * dt;                     // the draught carries it to its edge
    const ns = Math.max(165, sp - sp * 3.5 * dt), sp2 = Math.hypot(s.vx, s.vy) || 1;   // friction 3.5 per second, down to a glide
    s.vx *= ns / sp2; s.vy *= ns / sp2;
    s.x += s.vx * dt; s.y += s.vy * dt; s.a += s.spin * dt; s.spin *= 1 - Math.min(1, 1.1 * dt);
    s.lift = Math.max(0.3, s.lift - dt * 1.1);
    if (s.y > d[3] - 8 && s.vy > 0) s.vy = -Math.abs(s.vy) * 0.7;        // never onto the hub side
    if (!s.moved && Math.hypot(s.x - s.ox, s.y - s.oy) > 60) { s.moved = true; if (s.pile) s.pile.moved++; }
    if (s.x < d[0] || s.x > d[2] || s.y < d[1]) s.gone = 0.001;
  }
  paper.inPile = near >= 2;
}
// v: { s, tx, ty } the world-to-canvas transform. Leaves the context on the world transform.
export function drawPaper(ctx, spr, v, x0, y0, x1, y1) {
  const img = spr.v, sh = spr.sh.c, K = v.s;
  for (const s of S.sheets) {
    if (s.gone >= 1 || s.x < x0 - 40 || s.x > x1 + 40 || s.y < y0 - 40 || s.y > y1 + 40) continue;
    const sc = s.gone > 0 ? 1 - s.gone * 0.45 : 1 + (s.loose ? s.lift * 0.07 : 0), c = Math.cos(s.a) * sc * K, n = Math.sin(s.a) * sc * K;
    const off = s.loose ? 1.4 + s.lift * 8 : 1.4, ex = v.tx + s.x * K, ey = v.ty + s.y * K;
    if (s.gone > 0) ctx.globalAlpha = Math.max(0, 1 - s.gone);
    else { ctx.setTransform(c, n, -n, c, ex + off * 0.83 * K, ey + off * 0.55 * K); ctx.drawImage(sh, -17, -22, 34, 44); }
    ctx.setTransform(c, n, -n, c, ex, ey); ctx.drawImage(img[s.v].c, -17, -22, 34, 44);
    if (s.gone > 0) ctx.globalAlpha = 1;
  }
  ctx.setTransform(K, 0, 0, K, v.tx, v.ty);
}

// ---------------- particles: at most 120 ----------------
// kinds: 0 flour puff · 1 steam · 2 paper bit · 3 gold spark
const P = [];
export function emit(kind, x, y, vx, vy, life, size) {
  if (P.length >= 120) P.shift();
  P.push({ k: kind, x, y, vx, vy, t: 0, life, size, a: rnd() * 6.283, sp: (rnd() - 0.5) * 14 });
}
export function burst(kind, x, y, n, speed, life, size) {
  for (let i = 0; i < n; i++) { const a = rnd() * 6.283, v = speed * (0.35 + rnd() * 0.65); emit(kind, x, y, Math.cos(a) * v, Math.sin(a) * v - (kind === 2 ? 60 : 0), life * (0.6 + rnd() * 0.4), size * (0.7 + rnd() * 0.6)); }
}
export function updateParts(dt) {
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i]; p.t += dt;
    if (p.t >= p.life) { P[i] = P[P.length - 1]; P.pop(); continue; }
    const drag = p.k === 2 ? 2.2 : p.k === 3 ? 2.5 : 3.2;
    p.vx *= 1 - Math.min(1, drag * dt); p.vy *= 1 - Math.min(1, drag * dt);
    if (p.k === 1) p.vy -= 30 * dt; if (p.k === 2) p.vy += 150 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.a += p.sp * dt;
  }
}
export function drawParts(ctx, spr, v) {
  const K = v.s;
  for (const p of P) {
    const u = p.t / p.life;
    if (p.k === 0) {                                    // thrown flour: a hard disc that hops (up to 10 units) and leaves its shadow on the ground
      const rr = p.size * (1 - u * u * u), lift = 10 * Math.sin(Math.PI * u), d = rr * 2;
      ctx.drawImage(spr.fshad.c, p.x + lift * 0.75 - rr, p.y + lift * 0.5 - rr, d, d);
      ctx.drawImage(spr.fdisc.c, p.x - rr, p.y - lift - rr, d, d);
    } else if (p.k === 1) {
      const sz = p.size * (0.6 + u * 1.5);
      ctx.globalAlpha = 0.5 * (1 - u) * (u < 0.15 ? u / 0.15 : 1);
      ctx.drawImage(spr.steam.c, p.x - sz, p.y - sz, sz * 2, sz * 2); ctx.globalAlpha = 1;
    } else if (p.k === 2) {
      const c = Math.cos(p.a) * K, n = Math.sin(p.a) * K * (0.4 + 0.6 * Math.abs(Math.cos(p.a * 1.7)));
      ctx.globalAlpha = u > 0.7 ? (1 - u) / 0.3 : 1;
      ctx.setTransform(c, n, -n, c, v.tx + p.x * K, v.ty + p.y * K); ctx.drawImage(spr.bit.c, -p.size, -p.size * 0.75, p.size * 2, p.size * 1.5);
      ctx.setTransform(K, 0, 0, K, v.tx, v.ty);
    } else {
      ctx.globalAlpha = 1 - u; ctx.fillStyle = PAL.gold; const sz = p.size * (1 - u * 0.5);
      ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
    }
  }
  ctx.globalAlpha = 1;
}
