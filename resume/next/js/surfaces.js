// surfaces.js — the three ways a table clears: paper bodies (desk), the flour canvas (block),
// the trail canvas and the headlight wedge (mat). Plus the particle pool.
import { G, BOX, PAL, DRIFTS, HUB_R, S, mulberry32, SEED, surfaceAt } from './world.js';
import { mk, glow, rgba } from './art.js';

export const TR = 0.5;                       // trail and flour canvases: pixels per world unit (half resolution)
const rnd = mulberry32(SEED ^ 0x9e37);

// ---------------- trail: one persistent canvas, stamped, never cleared, never faded ----------------
export let trail = null;
let tg = null, last = null;
// ---------------- flour: the block only ----------------
export let flour = null;
let fg = null, brush = null, wiped = null, cw = 0, ch = 0;
const CELL = 12;

export function initSurfaces() {
  trail = mk((BOX[2] - BOX[0]) * TR, (BOX[3] - BOX[1]) * TR); tg = trail.getContext('2d');
  tg.setTransform(TR, 0, 0, TR, -BOX[0] * TR, -BOX[1] * TR); tg.lineCap = 'round'; tg.lineJoin = 'round';

  const b = G.block, w = b[2] - b[0], h = b[3] - b[1], r = mulberry32(SEED ^ 0xf10);
  flour = mk(w * TR, h * TR); fg = flour.getContext('2d'); fg.setTransform(TR, 0, 0, TR, -b[0] * TR, -b[1] * TR);
  cw = Math.ceil(w / CELL); ch = Math.ceil(h / CELL); wiped = new Uint8Array(cw * ch);
  // the 60% haze: an even dusting, then soft clouds so it is never one flat tint
  fg.fillStyle = rgba(PAL.flour, 0.46); fg.fillRect(b[0], b[1], w, h);
  const cloud = glow(PAL.flour, 60, 0.2).c, thin = glow('#000000', 60, 0.16).c;
  for (let i = 0; i < 230; i++) { const s = 0.5 + r() * 1.2, x = b[0] + r() * w, y = b[1] + r() * h; fg.drawImage(cloud, x - 60 * s, y - 60 * s, 120 * s, 120 * s); }
  fg.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 46; i++) { const s = 0.4 + r() * 0.9, x = b[0] + r() * w, y = b[1] + r() * h; fg.drawImage(thin, x - 60 * s, y - 60 * s, 120 * s, 120 * s); }
  fg.globalCompositeOperation = 'source-over';
  // drifts: opaque mounds built from many small dabs, so the edge is ragged; a shaded lower-right rim; spilled grains around
  const halo = glow(PAL.flour, 60, 0.5, 0.3).c;
  for (const d of DRIFTS) {
    const blobs = []; fg.drawImage(halo, d.x - d.r * 1.5, d.y - d.r * 1.2, d.r * 3, d.r * 2.4);
    for (let i = 0; i < 90; i++) { const a = r() * 6.283, rad = Math.pow(r(), 0.7) * d.r * 0.86; blobs.push([d.x + Math.cos(a) * rad, d.y + Math.sin(a) * rad * 0.78, d.r * (0.08 + r() * 0.16) * (1.25 - rad / d.r)]); }
    blobs.push([d.x, d.y, d.r * 0.5]);
    fg.fillStyle = PAL.flourShade; for (const [x, y, br] of blobs) { fg.beginPath(); fg.arc(x + 3.4, y + 2.8, br, 0, 6.2832); fg.fill(); }
    fg.fillStyle = PAL.flour; for (const [x, y, br] of blobs) { fg.beginPath(); fg.arc(x, y, br, 0, 6.2832); fg.fill(); }
    fg.fillStyle = rgba(PAL.flourShade, 0.55);                              // a few dimples so it is a heap, not a cloud
    for (let i = 0; i < 9; i++) { const a = r() * 6.283, rad = r() * d.r * 0.5; fg.beginPath(); fg.arc(d.x + Math.cos(a) * rad + 2, d.y + Math.sin(a) * rad * 0.78 + 2, 2 + r() * 4, 0, 6.2832); fg.fill(); }
    fg.fillStyle = PAL.flour;
    for (let i = 0; i < 130; i++) { const a = r() * 6.283, rad = d.r * (0.8 + r() * 0.55); fg.fillRect(d.x + Math.cos(a) * rad, d.y + Math.sin(a) * rad * 0.78, 1.5 + r() * 3, 1.5 + r() * 3); }
  }
  for (let i = 0; i < 1500; i++) { fg.fillStyle = rgba(PAL.flour, 0.35 + r() * 0.5); fg.fillRect(b[0] + r() * w, b[1] + r() * h, 1.5 + r() * 2, 1.5 + r() * 2); }
  // nothing floury on the hub
  fg.globalCompositeOperation = 'destination-out'; fg.beginPath(); fg.arc(0, 0, HUB_R + 3, 0, 6.2832); fg.fill(); fg.globalCompositeOperation = 'source-over';
  brush = glow('#000000', 22, 0.9, 0.4).c;
}

// 0 none or wiped · 1 haze · 2 deep drift
export function flourAt(x, y) {
  const b = G.block;
  if (x < b[0] || x >= b[2] || y < b[1] || y >= b[3] || x * x + y * y < HUB_R * HUB_R) return 0;
  if (wiped[((y - b[1]) / CELL | 0) * cw + ((x - b[0]) / CELL | 0)]) return 0;
  for (const d of DRIFTS) { const dx = x - d.x, dy = (y - d.y) / 0.8; if (dx * dx + dy * dy < d.r * d.r * 0.8) return 2; }
  return 1;
}
// one plough tick: a soft erase, two full-strength tyre stamps, and a little bank thrown up either side
function wipe(x, y, hx, hy) {
  const b = G.block, px = -hy, py = hx;
  fg.globalCompositeOperation = 'destination-out';
  fg.drawImage(brush, x - 22, y - 22, 44, 44);
  fg.beginPath(); fg.arc(x + px * 9 - hx * 8, y + py * 9 - hy * 8, 2.8, 0, 6.2832); fg.arc(x - px * 9 - hx * 8, y - py * 9 - hy * 8, 2.8, 0, 6.2832); fg.fill();
  fg.globalCompositeOperation = 'source-over';
  for (const sgn of [-1, 1]) {
    const o = 24.5 + rnd() * 3; fg.fillStyle = rgba(PAL.flour, 0.42 + rnd() * 0.3);
    fg.beginPath(); fg.arc(x + px * sgn * o - hx * 6, y + py * sgn * o - hy * 6, 2.6 + rnd() * 2.2, 0, 6.2832); fg.fill();
  }
  const cx = (x - b[0]) / CELL | 0, cy = (y - b[1]) / CELL | 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const u = cx + i, v = cy + j; if (u >= 0 && v >= 0 && u < cw && v < ch) wiped[v * cw + u] = 1; }
}

// called every 6 units of travel with the van's position and unit heading. Returns what was ploughed (0, 1, 2).
export function stamp(x, y, hx, hy) {
  const surf = surfaceAt(x, y), px = -hy, py = hx, bx = x - hx * 9, by = y - hy * 9;
  const L = [bx + px * 9, by + py * 9], Rr = [bx - px * 9, by - py * 9];
  let ploughed = 0;
  if (surf === 'block') { ploughed = flourAt(x, y); wipe(x, y, hx, hy); }
  if (last && surf && surf !== 'hub' && last.surf === surf && Math.hypot(L[0] - last.L[0], L[1] - last.L[1]) < 30) {
    const seg = (a, c) => { tg.beginPath(); tg.moveTo(a[0], a[1]); tg.lineTo(c[0], c[1]); tg.stroke(); };
    if (surf === 'mat') {                    // the line of light
      tg.lineCap = 'butt'; tg.strokeStyle = rgba(PAL.pink, 0.2); tg.lineWidth = 15; seg(last.L, L); seg(last.R, Rr);
      tg.strokeStyle = rgba(PAL.pink, 0.5); tg.lineWidth = 7; seg(last.L, L); seg(last.R, Rr);
      tg.lineCap = 'round'; tg.strokeStyle = '#FFE3EB'; tg.lineWidth = 2.8; seg(last.L, L); seg(last.R, Rr);
    } else {
      tg.lineCap = 'round'; tg.lineWidth = 2.8;
      tg.strokeStyle = surf === 'desk' ? 'rgba(96,110,128,.22)' : 'rgba(74,38,16,.2)';
      seg(last.L, L); seg(last.R, Rr);
    }
  }
  last = { L, R: Rr, surf };
  return ploughed;
}

// ---------------- the headlight wedge: apex at the nose, 260 long, 22 degrees either side ----------------
export function wedgePath(ctx, van) {
  const a = van.a, ax = van.x + Math.cos(a) * 22, ay = van.y + Math.sin(a) * 22, d = 0.384, Rr = 260 / Math.cos(d);
  ctx.moveTo(ax, ay); ctx.lineTo(ax + Math.cos(a - d) * Rr, ay + Math.sin(a - d) * Rr); ctx.lineTo(ax + Math.cos(a + d) * Rr, ay + Math.sin(a + d) * Rr); ctx.closePath();
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
    if (p.k < 2) {
      const sz = p.size * (0.6 + u * 1.5), im = p.k ? spr.steam.c : spr.puff.c;
      ctx.globalAlpha = (p.k ? 0.5 : 0.75) * (1 - u) * (u < 0.15 ? u / 0.15 : 1);
      ctx.drawImage(im, p.x - sz, p.y - sz, sz * 2, sz * 2);
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
