// matart.js — prop recipes for the mat and the woods: the slate, the pines, the bedsheet screens, the bunting gate and
// the short band of bunting, the folding chair and megaphone, the gear case, the camera on its tripod, the light stand,
// the campfire, the flag pole, and the mat's dressing. The same slab routine and the same tape as art.js; nothing here runs per frame.
// Nothing on the mat casts a shadow (spec 8.4), so every sprite is baked without one.
import { PAL, mulberry32 } from './world.js';
import { mk, bake, box, rbox, cyl, poly, flat, decal, rr, rgba, shade, mixHex, HK, SS, STENCIL } from './art.js';

const TAU = 6.2832, NS = { shadow: false };
const PLY = '#C8975A', PLY2 = '#8F6535';            // the little plywood discs that model trees and posts stand on
const K = '#2A2D31', K2 = '#1B1D20', AL = '#B9C0C4', AL2 = '#8C9598', REFL = '#FFFFFF';
// reserves room in a sprite for what a decal draws outside the slabs (a decal has no size of its own)
const room = (x0, y0, x1, y1, z) => ({ path: () => { }, b: [x0, y0, x1, y1], z0: 0, z1: z, top: 'rgba(0,0,0,0)', side: null, hl: 0, ns: 1 });
// a thin bar between two points in space, as a run of small slabs (lowest first)
function bar3(x0, y0, z0, x1, y1, z1, w, top, side, n = 10) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, za = z0 + (z1 - z0) * i / n, zb = z0 + (z1 - z0) * (i + 1) / n;
    out.push(box(x - w / 2, y - w / 2, w, w, Math.min(za, zb) - 0.5, Math.max(za, zb) + 0.5, top, side, { hl: 0, ns: 1 }));
  }
  return out;
}

// ---------- a cone pine: four flared tiers on a short trunk, standing on a plywood disc like a model tree ----------
// k: size (1 = 44 round, 116 tall) · v: 0 or 1, two greens
export function pineSprite(k = 1, v = 0) {
  const lo = v ? '#1B6243' : PAL.woodsLit, hi = v ? '#2A8058' : PAL.pineLit;
  const sl = [cyl(0, 0, 9.5, 0, 2.4, PLY, PLY2, { hl: 0 }), cyl(0, 0, 3.3, 2.4, 20 * k, '#7A4E26', '#5A371A', { hl: 0 })];
  const T = [[22, 9.5, 15, 47], [17.5, 7, 43, 71], [13, 4.5, 67, 93], [8.5, 0.6, 89, 116]], N = 8;
  T.forEach(([r0, r1, z0, z1], t) => {
    for (let i = 0; i < N; i++) {
      const u = i / N, r = (r0 + (r1 - r0) * u) * k, c = i === 0 ? shade(lo, -30) : mixHex(lo, hi, 0.15 + 0.85 * (t + u) / 4);   // each tier's hem is dark: the tiers read apart
      sl.push(cyl(0, 0, r, (z0 + (z1 - z0) * u) * k, (z0 + (z1 - z0) * (i + 1) / N) * k, c, c, { hl: 0 }));
    }
  });
  sl.push(decal(g => {                                   // one hard light from the upper left: a lit flank, a shaded flank
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(-30, -150, 26, 180);
    g.fillStyle = 'rgba(6,20,15,.2)'; g.fillRect(5 * k, -150, 30, 180);
    g.globalCompositeOperation = 'source-over';
  }));
  return bake(sl, NS);
}

// ---------- a bedsheet screen: w x h is the picture, lift the air under the cloth (px) ----------
// o.posts false: hung by ropes that run out to o.rope either side (the camp's sheet, between two pines)
// o.side: the line runs on that far past the cloth's west end to its post, and a week's shoot schedule is pegged there
// Returns { sp, px, py }: the picture's top-left corner from the anchor (the middle of the foot line).
export function sheetSprite(w, h, lift, o = {}) {
  const W = w + 12, T = -(lift + h + 12), B = -lift, L = -W / 2, R = W / 2, sag = o.sag || 4.5, post = w / 2 + 2, Z = (lift + h + 19) / HK, side = o.side || 0, PL = -post - side;      // PL: the west post
  const r = mulberry32(w * 31 + h + lift), sl = [];
  if (o.posts !== false) for (const px of [PL, post]) {
    sl.push(cyl(px, -4, 7.5, 0, 2.4, PLY, PLY2, { hl: 0 }));
    sl.push(cyl(px, -4, 2.3, 2.4, Z, AL, AL2, { hl: 0 }));
    sl.push(cyl(px, -4, 2.9, 8, 15, REFL, '#EEF2F4', { hl: 0 }));        // one band of reflective tape on each post
    sl.push(cyl(px, -4, 2.9, Z - 14, Z - 4, '#F4F1E8', '#E2E6E8', { hl: 0 }));   // and one round its top: what the headlights find first
  } else sl.push(room(-o.rope - 2, -8, o.rope + 2, 2, Z));
  const folds = []; for (let i = 0; i < 5; i++) folds.push([L + 10 + (W - 30) * (i + r() * 0.7) / 5, 5 + r() * 9, (r() - 0.5) * 9]);
  const lineY = x => x < L ? T - 2.2 : T - 2.2 + sag * 2 * 2 * (0.5 + x / W) * (0.5 - x / W);                // the line it is pegged to, run between the two tops
  const SW = 36, SH = 46, SX = L - 5 - SW, SY = T + 1.4;      // the schedule: a sheet of paper, 36 x 46, pegged to the line west of the cloth
  const pegs = [], np = Math.round(W / 44); for (let i = 0; i < np; i++) { const x = L + W * (i + 0.5) / np + (r() - 0.5) * 6; pegs.push([x, lineY(x)]); }
  const cloth = g => {
    const path = () => {
      g.beginPath(); g.moveTo(L, T); g.quadraticCurveTo(0, T + sag * 2, R, T); g.quadraticCurveTo(R - 3, (T + B) / 2, R - 1, B);
      const n = 6, sw = (W - 2) / n;
      for (let i = 0; i < n; i++) g.quadraticCurveTo(R - 1 - sw * (i + 0.5), B + (i % 2 ? -2 : 2.6), R - 1 - sw * (i + 1), B);
      g.quadraticCurveTo(L + 3, (T + B) / 2, L, T); g.closePath();
    };
    g.lineJoin = 'round'; g.lineCap = 'round';
    // what holds it up: twine from each top corner
    g.strokeStyle = '#B58A52'; g.lineWidth = 1.3;
    if (o.posts !== false) for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * (W / 2 - 1), T + 1); g.lineTo(s * post, T - 3); g.moveTo(s * (W / 2 - 1.5), B - 3); g.lineTo(s * post, B - 6); g.stroke(); }
    if (side) { g.beginPath(); g.moveTo(L - 3, T - 2.2); g.lineTo(PL, T - 3); g.stroke(); }
    else for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * (W / 2 - 1), T + 1); g.quadraticCurveTo(s * (W / 2 + 8), T + 5, s * o.rope, T + 2); g.moveTo(s * (W / 2 - 1.5), B - 3); g.quadraticCurveTo(s * (W / 2 + 8), B + 1, s * o.rope, B - 8); g.stroke(); }
    g.strokeStyle = '#B58A52'; g.lineWidth = 1.1; g.beginPath(); for (let i = 0; i <= 12; i++) { const x = L - 3 + (W + 6) * i / 12; if (i) g.lineTo(x, lineY(x)); else g.moveTo(x, lineY(x)); } g.stroke();
    path(); g.fillStyle = '#EFEADF'; g.fill();
    g.save(); g.clip();
    g.fillStyle = 'rgba(96,122,156,.42)'; g.fillRect(L, B - 9.6, W, 1.5); g.fillRect(L, B - 12.6, W, 0.8);      // a bedsheet's two woven stripes above the hem
    for (const [x, wd, lean] of folds) {                    // hanging folds: a shaded band and its lit edge
      g.fillStyle = 'rgba(20,17,15,.055)'; g.beginPath(); g.moveTo(x, T); g.lineTo(x + wd, T); g.lineTo(x + wd + lean, B + 4); g.lineTo(x + lean - wd * 0.3, B + 4); g.fill();
      g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.moveTo(x - 2.2, T); g.lineTo(x, T); g.lineTo(x + lean - wd * 0.3, B + 4); g.lineTo(x + lean - wd * 0.3 - 2.2, B + 4); g.fill();
    }
    g.fillStyle = 'rgba(20,17,15,.07)'; g.beginPath(); g.moveTo(L, T); g.quadraticCurveTo(0, T + sag * 2, R, T); g.lineTo(R, T + 5); g.quadraticCurveTo(0, T + sag * 2 + 6.5, L, T + 5); g.fill();   // the hem at the top
    g.strokeStyle = 'rgba(20,17,15,.2)'; g.lineWidth = 0.8; g.setLineDash([3, 2.2]); g.beginPath(); g.moveTo(L, B - 4.6); g.lineTo(R, B - 4.6); g.stroke(); g.setLineDash([]);   // a stitched hem at the foot
    g.restore();
    path(); g.strokeStyle = 'rgba(20,17,15,.34)'; g.lineWidth = 0.9; g.stroke();
    g.fillStyle = '#8E6A3A'; for (const s of [-1, 1]) { g.beginPath(); g.arc(s * (W / 2 - 1.5), T + 1.4, 1.9, 0, TAU); g.fill(); }      // the knots
    for (const [x, y] of pegs) { g.fillStyle = '#D2A76A'; g.fillRect(x - 1.5, y - 2.4, 3, 7.4); g.fillStyle = '#8F6535'; g.fillRect(x - 1.5, y + 1, 3, 0.9); g.fillRect(x - 0.3, y + 1.9, 0.6, 3.1); }      // wooden pegs along the line
    if (o.posts === false) { g.fillStyle = '#F4F1E8'; for (const s of [-1, 1]) g.fillRect(s * (W / 2 + 7) - 2.5, T + 0.6, 5, 6.4); }      // hung on ropes: a wrap of reflective tape on each, by the corner
    if (side) {                                             // the week's shoot schedule: seven days across, four rows down, the shoots blocked in
      g.fillStyle = 'rgba(20,17,15,.2)'; g.fillRect(SX + 1.4, SY + 1.8, SW, SH);
      g.fillStyle = '#FBFCFD'; g.fillRect(SX, SY, SW, SH); g.strokeStyle = 'rgba(20,17,15,.4)'; g.lineWidth = 0.8; g.strokeRect(SX + 0.4, SY + 0.4, SW - 0.8, SH - 0.8);
      g.fillStyle = '#33383D'; g.fillRect(SX + 2.5, SY + 3, SW - 5, 5.4);                                  // the heading bar, and the seven day marks on it
      g.fillStyle = '#FBFCFD'; for (let i = 0; i < 7; i++) g.fillRect(SX + 2.5 + (i + 0.5) * (SW - 5) / 7 - 1.1, SY + 4.8, 2.2, 1.8);
      const gx = SX + 2.5, gy = SY + 11, cw = (SW - 5) / 7, ch = 8;
      const blk = (c, r0, n, col) => { g.fillStyle = col; g.fillRect(gx + c * cw + 0.7, gy + r0 * ch + 0.7, cw - 1.4, n * ch - 1.4); };
      blk(0, 0, 2, PAL.pinkTape); blk(1, 1, 1, PAL.gold); blk(2, 0, 1, PAL.pinkTape); blk(3, 2, 2, PAL.pinkTape); blk(4, 0, 1, PAL.gold); blk(4, 2, 1, PAL.pinkTape); blk(5, 1, 2, PAL.pinkTape); blk(6, 3, 1, PAL.gold);
      g.strokeStyle = 'rgba(20,17,15,.5)'; g.lineWidth = 0.6; g.beginPath();
      for (let i = 0; i <= 7; i++) { g.moveTo(gx + i * cw, gy); g.lineTo(gx + i * cw, gy + 4 * ch); }
      for (let j = 0; j <= 4; j++) { g.moveTo(gx, gy + j * ch); g.lineTo(gx + SW - 5, gy + j * ch); }
      g.stroke();
      for (const x of [SX + 8, SX + SW - 8]) { g.fillStyle = '#D2A76A'; g.fillRect(x - 1.5, SY - 4.6, 3, 7.4); g.fillStyle = '#8F6535'; g.fillRect(x - 1.5, SY - 1.2, 3, 0.9); }      // two pegs hold it to the line
    }
  };
  sl.push(decal(cloth));
  // its outline again as a path, for the dark shape it is before the light finds it (no second sprite to hold)
  const dark = new Path2D(); dark.moveTo(L, T); dark.quadraticCurveTo(0, T + sag * 2, R, T); dark.lineTo(R - 1, B + 1.5); dark.lineTo(L, B + 1.5); dark.closePath();
  if (o.posts !== false) for (const px of [PL, post]) dark.rect(px - 2.3, T - 9, 4.6, -T + 5);
  if (side) dark.rect(SX, SY, SW, SH);
  // In the dark only this much of it catches any light (spec 8.4): the rope, the pegs, the reflective bands [x, y, w, h].
  const rope = new Path2D(); if (side) rope.moveTo(PL, T - 3); for (let i = 0; i <= 12; i++) { const x = L - 3 + (W + 6) * i / 12; if (i || side) rope.lineTo(x, lineY(x)); else rope.moveTo(x, lineY(x)); }
  const by = -4 - (Z - 4) * HK, bands = o.posts !== false ? [[PL - 2.9, by, 5.8, 6.4], [post - 2.9, by, 5.8, 6.4]] : [[-(W / 2 + 7) - 2.5, T + 0.6, 5, 6.4], [W / 2 + 7 - 2.5, T + 0.6, 5, 6.4]];
  return { sp: bake(sl, NS), px: -w / 2, py: T + 8.5, folds, T, B, L, W, dark, rope, pegs, bands };
}
// the same folds again, to lay over the picture so it sits in the cloth and not on it
export function sheetOver(w, h, sh) {
  return flat(w, h, 0, 0, g => {
    for (const [x, wd, lean] of sh.folds) {
      const x0 = x + w / 2, k = (h + 8.5) / (sh.B + 4 - sh.T), top = -8.5;
      g.fillStyle = 'rgba(20,17,15,.10)'; g.beginPath(); g.moveTo(x0, top); g.lineTo(x0 + wd, top); g.lineTo(x0 + wd + lean * k, h); g.lineTo(x0 + (lean - wd * 0.3) * k, h); g.fill();
      g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.moveTo(x0 - 2.2, top); g.lineTo(x0, top); g.lineTo(x0 + (lean - wd * 0.3) * k, h); g.lineTo(x0 + (lean - wd * 0.3) * k - 2.2, h); g.fill();
    }
    g.strokeStyle = 'rgba(20,17,15,.3)'; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, h - 1);
  }, 0.5);
}
// snow on a screen with no signal: hard little blocks
// The weekly recap's picture: a drawn title card, never a frame of the video (its frames are close-ups of campers).
// lines: the card's two lines, from the document. An ink ground with a thin frame line, the first line big in the
// stencil face with a strip of pink tape under it, the second line under that; the right fifth is left clear for the
// play mark (px: where its middle goes).
export const WEEK = { px: 0.82 };
export function weekCard(w, h, lines) {
  return flat(w, h, 0, 0, g => {
    g.fillStyle = '#14110F'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(244,241,232,.28)'; g.lineWidth = 1; g.strokeRect(3.5, 3.5, w - 7, h - 7);
    const x = w * 0.09, room = w * 0.6, big = lines[0] || '', small = lines[1] || '';
    let fs = h * 0.44; g.font = `900 ${fs}px ${STENCIL}`; let tw = g.measureText(big).width; if (tw > room) { fs *= room / tw; g.font = `900 ${fs}px ${STENCIL}`; tw = room; }
    const base = h * 0.5 + fs * 0.1;
    g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = '#F4F1E8'; g.fillText(big, x, base);
    g.fillStyle = PAL.pinkTape; g.fillRect(x, base + fs * 0.13, tw, Math.max(2.4, fs * 0.1));
    let ss = fs * 0.5; g.font = `900 ${ss}px ${STENCIL}`; const sw = g.measureText(small).width; if (sw > room) { ss *= room / sw; g.font = `900 ${ss}px ${STENCIL}`; }
    g.fillStyle = '#F4F1E8'; g.fillText(small, x, base + fs * 0.13 + Math.max(2.4, fs * 0.1) + ss * 0.98);
  }, 0);
}
export function staticSprite(w, h, seed) {
  const r = mulberry32(seed);
  return flat(w, h, 0, 0, g => {
    g.fillStyle = '#5C6467'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) for (let x = 0; x < w; x += 4) { const v = r(); if (v < 0.62) { g.fillStyle = v < 0.2 ? '#EDF1F4' : v < 0.4 ? '#14110F' : '#A9B4BF'; g.fillRect(x, y, 4, 3); } }
    g.fillStyle = 'rgba(244,241,232,.5)'; g.fillRect(0, (r() * h * 0.7) | 0, w, 5);
  }, 0);
}

// ---------- the bunting gate: two posts, a string of pennants. colour: the bunting once the camp is lit ----------
export const GATE_W = 48;
export function gateSprite(colour) {
  const sl = [], top = -100 * HK;
  for (const s of [-1, 1]) {
    sl.push(cyl(s * GATE_W, 0, 8, 0, 2.4, PLY, PLY2, { hl: 0 }));
    sl.push(cyl(s * GATE_W, 0, 3, 2.4, 100, '#D2A76A', '#A47B45', { hl: 0 }));
    sl.push(cyl(s * GATE_W, 0, 3.6, 30, 38, REFL, '#EEF2F4', { hl: 0 }));
    sl.push(cyl(s * GATE_W, 0, 4.2, 100, 103, '#A47B45', '#7C5A2E', { hl: 0 }));
  }
  const cols = colour ? [PAL.pink, PAL.gold, '#F4F1E8', PAL.blue] : ['#7E878A', '#99A2A5'];
  sl.push(decal(g => {
    const P = t => [(-GATE_W + 2) + (GATE_W * 2 - 4) * t, top + 1 + 4 * t * (1 - t) * 15];
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.strokeStyle = '#B58A52'; g.lineWidth = 1.2; g.beginPath(); for (let i = 0; i <= 16; i++) { const p = P(i / 16); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); } g.stroke();
    for (let i = 0; i < 9; i++) {
      const a = P((i + 0.12) / 9), b = P((i + 0.88) / 9), mx = (a[0] + b[0]) / 2, my = Math.max(a[1], b[1]) + 14.5;
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(mx, my); g.closePath();
      g.fillStyle = cols[i % cols.length]; g.fill();
      g.strokeStyle = REFL; g.lineWidth = 1.5; g.beginPath(); g.moveTo(a[0] + 0.6, a[1] + 1); g.lineTo(mx, my - 1.2); g.lineTo(b[0] - 0.6, b[1] + 1); g.stroke();     // reflective trim
      if (colour) { g.strokeStyle = rgba(PAL.ink, 0.55); g.lineWidth = 0.7; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(mx, my); g.closePath(); g.stroke(); }
    }
  }));
  return bake(sl, NS);
}

// ---------- the folding canvas chair of a film set, at any heading (th = the way it faces). Its word is on the back of the back band ----------
export function chairSprite(th, word) {
  const W1 = '#D2A76A', W2 = '#A47B45', C1 = '#33383D', C2 = '#22262A', parts = [];
  const add = (cx, cy, z, s) => parts.push({ cx, cy, z, s });
  for (const sd of [-1, 1]) {
    add(0, sd * 25, 0, box(-18, sd * 25 - 1.7, 36, 3.4, 0, 2.6, W1, W2, { hl: 0 }));
    add(15, sd * 25, 1, box(13.3, sd * 25 - 1.7, 3.4, 3.4, 2.6, 54, W1, W2, { hl: 0 }));
    add(-15, sd * 25, 1, box(-16.7, sd * 25 - 1.7, 3.4, 3.4, 2.6, 98, W1, W2, { hl: 0 }));
    add(1, sd * 25, 60, rbox(-19, sd * 25 - 2.5, 40, 5, 2, 54, 57, '#DDB67C', W2, { hl: 0 }));        // armrest
  }
  for (const [a, b] of [[-22, 22], [22, -22]]) bar3(0, a, 4, 0, b, 37, 3.6, W1, W2, 13).forEach((s, i) => add(0, a + (b - a) * (i + 0.5) / 13, 2 + i * 0.01, s));   // the X it folds on
  add(15, 0, 3, box(13.6, -23.3, 2.8, 46.6, 13, 15.6, W1, W2, { hl: 0 }));                               // foot bar
  add(0, 0, 40, box(-14, -23.3, 28, 46.6, 38, 40.4, C1, C2, { hl: 0 }));                                 // canvas seat
  add(-15.6, 0, 80, box(-17, -23.3, 2.8, 46.6, 70, 96, '#444A51', C1, { hl: 0 }));                       // canvas back
  const sn = Math.sin(th), cs = Math.cos(th);
  parts.sort((p, q) => (p.cx * sn + p.cy * cs) - (q.cx * sn + q.cy * cs) || p.z - q.z);                  // far to near for this heading
  const sp = bake(parts.map(p => p.s), { rot: th, shadow: false });
  if (-sn > 0.2 && word) {                                // the back of the band faces the viewer: the lettering, in reflective white
    const g = sp.c.getContext('2d');
    g.setTransform(SS, 0, 0, SS, sp.ox, sp.oy); g.transform(-sn, cs, 0, 1, -17.05 * cs, -17.05 * sn - 83 * HK);
    let fs = 13.5; g.font = `900 ${fs}px ${STENCIL}`; const w = g.measureText(word).width;
    if (w > 41) { fs *= 41 / w; g.font = `900 ${fs}px ${STENCIL}`; }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = REFL; g.fillText(word, 0, 0.8);
  }
  return sp;
}
// The megaphone, lying on the mat. facing false: in profile, bell to the east, the way everyone draws one.
// facing true: tipped round with the bell toward the viewer. The horn is a run of flat layers, low at the mouthpiece
// and tall at the bell, so it is a cone lying down and not a cut-out.
export function megaSprite(facing) {
  const B1 = '#ECE8DD', B2 = '#CFC9BA', RIM = '#C4483A', RIM2 = '#9C3B30', sl = [], LAY = 6, H = 4.7, L = 38;
  const rad = s => 4.2 + 10.2 * s / L;                       // s: along the horn, 0 at the mouthpiece, L at the bell
  const P = facing ? (s, w) => [w, s - L] : (s, w) => [s - L / 2, w];
  const quad = (s0, s1, w0, w1, z0, z1, top, side) => poly([P(s0, -w0), P(s1, -w1), P(s1, w1), P(s0, w0)], z0, z1, top, side, { hl: 0 });
  if (facing) sl.push(box(-17.5, -25, 9, 4.6, 0, 4.6, K, K2, { hl: 0 })); else sl.push(box(-6, 4, 5.4, 13, 0, 5.4, K, K2, { hl: 0 }));      // the grip
  sl.push(quad(-6, 0.5, 4.4, 4.4, 0, 8.8, K, K2));             // the mouthpiece
  for (let k = 0; k < LAY; k++) {
    const z0 = k * H, z1 = z0 + H, zm = (z0 + z1) / 2, a = [], bk = [];
    for (let s = 0; s <= L + 0.01; s += L / 6) { const r = rad(s), q = r * r - (zm - r) * (zm - r); if (2 * r < z0 + 1 || q <= 0) continue; const hw = Math.sqrt(q); a.push(P(s, hw)); bk.unshift(P(s, -hw)); }
    if (a.length < 2) continue;
    const c = mixHex(B2, B1, 0.2 + 0.8 * k / (LAY - 1));
    sl.push(poly(a.concat(bk), z0, z1, c, c, { hl: 0 }));
  }
  if (!facing) {
    for (let k = 0; k < 7; k++) { const z0 = k * 4.2, zm = z0 + 2.1, hw = Math.sqrt(Math.max(1, 14.8 * 14.8 - (zm - 14.8) * (zm - 14.8))); sl.push(quad(L - 1.2, L + 1.8, hw, hw, z0, z0 + 4.2, RIM, RIM2)); }   // the bell's rim, seen edge on
    sl.push(decal(g => { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.moveTo(-L / 2, -7); g.lineTo(L / 2 - 2, -24); g.lineTo(L / 2 - 2, -19); g.lineTo(-L / 2, -4.5); g.fill(); g.globalCompositeOperation = 'source-over'; }));
    return bake(sl, NS);
  }
  sl.push(room(-16, -2, 16, 3, 30));
  sl.push(decal(g => {                                    // the bell, facing out: red rim, dark throat
    const cy = -14.2 * HK;
    g.fillStyle = RIM; g.beginPath(); g.ellipse(0, cy + 1.2, 15, 9.6, 0, 0, TAU); g.fill();
    g.fillStyle = B1; g.beginPath(); g.ellipse(0, cy + 0.6, 13.2, 8.2, 0, 0, TAU); g.fill();
    g.fillStyle = '#1B1D20'; g.beginPath(); g.ellipse(0, cy + 0.4, 10.6, 6.4, 0, 0, TAU); g.fill();
    g.fillStyle = '#3A3F44'; g.beginPath(); g.ellipse(0, cy - 0.8, 5, 3, 0, 0, TAU); g.fill();
    g.fillStyle = '#0E0F10'; g.beginPath(); g.ellipse(0, cy - 0.9, 2.2, 1.4, 0, 0, TAU); g.fill();
  }));
  return bake(sl, NS);
}

// ---------- the gear case: a road case with bright ball corners. open: the lid stands up behind, the kit lies in foam ----------
export function caseSprite(open) {
  const corners = (g, x, y, w, h) => { g.fillStyle = REFL; for (const [cx, cy] of [[x, y], [x + w - 5.4, y], [x, y + h - 5.4], [x + w - 5.4, y + h - 5.4]]) { g.fillRect(cx, cy, 5.4, 5.4); } g.fillStyle = AL2; for (const [cx, cy] of [[x + 2.7, y + 2.7], [x + w - 2.7, y + 2.7], [x + 2.7, y + h - 2.7], [x + w - 2.7, y + h - 2.7]]) { g.beginPath(); g.arc(cx, cy, 0.9, 0, TAU); g.fill(); } };
  const frame = (g, x, y, w, h) => { g.fillStyle = AL; g.fillRect(x, y, w, 2.2); g.fillRect(x, y + h - 2.2, w, 2.2); g.fillRect(x, y, 2.2, h); g.fillRect(x + w - 2.2, y, 2.2, h); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, y, w, 0.7); };
  const front = (g, x, y, w, h) => {
    g.fillStyle = 'rgba(255,255,255,.035)'; for (let i = 5; i < w - 4; i += 3.2) g.fillRect(x + i, y + 2.2, 1, h - 4.4);        // ribbed panel
    frame(g, x, y, w, h);
    if (!open) { g.fillStyle = AL2; g.fillRect(x + 2.2, y + 6.2, w - 4.4, 1.4); }                                              // where the lid meets the body
    for (const lx of [x + 13, x + w - 21]) {                                                                                    // butterfly latches
      g.fillStyle = '#0E0F10'; g.fillRect(lx - 1, y + (open ? 2.6 : 3.2), 10, open ? 5.4 : 8.2);
      g.fillStyle = AL; g.fillRect(lx, y + (open ? 3.4 : 4), 8, open ? 3.8 : 6.6); g.fillStyle = AL2; g.fillRect(lx + 3, y + (open ? 3.4 : 4), 2, open ? 3.8 : 6.6);
    }
    const hy = y + h * 0.56; g.fillStyle = '#0E0F10'; g.beginPath(); rr(g, x + w / 2 - 11, hy, 22, 6.4, 2); g.fill(); g.fillStyle = AL; g.fillRect(x + w / 2 - 8, hy + 2.2, 16, 1.8);   // the handle
    corners(g, x, y, w, h);
  };
  const lidTop = g => {
    g.fillStyle = 'rgba(255,255,255,.035)'; for (let i = -34; i < 36; i += 3.2) g.fillRect(i, -41.8, 1, 39.6);
    frame(g, -39, -44, 78, 44); corners(g, -39, -44, 78, 44);
    g.save(); g.translate(8, -22); g.rotate(-0.07); g.fillStyle = rgba(PAL.masking, 0.96); g.fillRect(-21, -5.5, 42, 11); g.strokeStyle = 'rgba(20,17,15,.3)'; g.lineWidth = 0.7; g.strokeRect(-21, -5.5, 42, 11);
    g.strokeStyle = rgba(PAL.ink, 0.7); g.lineWidth = 1.3; g.lineCap = 'round'; g.beginPath(); g.moveTo(-15, 0.5); g.lineTo(-9, -2.2); g.lineTo(-4, 1.6); g.lineTo(2, -2); g.lineTo(8, 1.2); g.lineTo(14, -1.2); g.stroke(); g.restore();   // a marker squiggle, no word
  };
  if (!open) return bake([box(-39, -44, 78, 44, 0, 40, K, K2, { front, det: lidTop, hl: 0 })], NS);
  const foam = g => {
    g.fillStyle = '#4A5056'; g.fillRect(-39, -44, 78, 44); frame(g, -39, -44, 78, 44);
    const well = (x, y, w, h, r) => { g.fillStyle = '#17191B'; g.beginPath(); rr(g, x, y, w, h, r); g.fill(); };
    well(-33, -39, 27, 19, 3);                                                                       // the camera body
    g.fillStyle = '#33383D'; g.beginPath(); rr(g, -31, -37.2, 23, 15.4, 2); g.fill(); g.fillStyle = '#4A5157'; g.fillRect(-28, -35, 8, 5); g.fillStyle = PAL.pink; g.fillRect(-12.5, -35, 2.2, 2.2);
    well(-2, -40, 20, 20, 10);                                                                       // a lens
    g.fillStyle = '#2B3035'; g.beginPath(); g.arc(8, -30, 8.4, 0, TAU); g.fill(); g.strokeStyle = AL2; g.lineWidth = 1.3; g.beginPath(); g.arc(8, -30, 6, 0, TAU); g.stroke();
    g.fillStyle = '#22343F'; g.beginPath(); g.arc(8, -30, 3.8, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(6, -32.4, 1.6, 1.6);
    for (const bx of [22, 29.5]) { well(bx - 0.8, -39.8, 7, 15.6, 1.4); g.fillStyle = '#3A3F44'; g.fillRect(bx, -39, 5.4, 14); g.fillStyle = '#C9A44A'; g.fillRect(bx + 1, -38.4, 3.4, 1.6); }   // two batteries
    well(-33, -16, 44, 11, 5);                                                                       // a coiled cable
    g.strokeStyle = '#5C6467'; g.lineWidth = 1.5; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(-25 + i * 6.6, -10.5, 4.6, 3.6, 0, 0, TAU); g.stroke(); }
    for (const sx of [16, 25.5]) { well(sx - 0.8, -16.4, 8.4, 11, 1.2); g.fillStyle = '#2E4470'; g.fillRect(sx, -15.6, 6.8, 9.4); g.fillStyle = '#E9E5DA'; g.fillRect(sx + 1, -12.4, 4.8, 4.6); }   // two cards
  };
  const lidIn = (g, x, y, w, h) => {
    g.fillStyle = '#4A5056'; g.fillRect(x, y, w, h);
    g.fillStyle = '#3A3F44'; for (let j = 0; j < 5; j++) for (let i = 0; i < 15; i++) { g.beginPath(); g.arc(x + 5.5 + i * 4.8 + (j % 2) * 2.4, y + 4.6 + j * 4.4, 1.25, 0, TAU); g.fill(); }      // egg-crate foam
    frame(g, x, y, w, h); corners(g, x, y, w, h);
  };
  return bake([
    box(-39, -44, 78, 44, 0, 30, '#4A5056', K2, { front, det: foam, hl: 0 }),
    box(-39, -50, 78, 5.6, 30, 74, K, K2, { front: lidIn, hl: 0 })
  ], NS);
}

// ---------- the camera's instant print (G5): the van, as the camera saw it a moment ago ----------
// A white instant print, 40 x 48 with the deeper border at the foot, nothing written on it. In it: the dark mat, the
// stand's light in three hard steps, and the van (van: its sprite at the heading it had, drawn small). Baked once per
// picture and let go when the print has faded (mat.js). Origin = its middle.
export const PRINT = { w: 40, h: 48 };
export function instantPrint(van, draw) {
  const W = PRINT.w, H = PRINT.h;
  return flat(W + 4, H + 4, (W + 4) / 2, (H + 4) / 2, g => {
    g.fillStyle = 'rgba(20,17,15,.3)'; g.fillRect(3, 3.4, W, H);                                    // its hard shadow
    g.fillStyle = '#FBF9F3'; g.fillRect(1, 1, W, H); g.strokeStyle = 'rgba(20,17,15,.35)'; g.lineWidth = 0.8; g.strokeRect(1.4, 1.4, W - 0.8, H - 0.8);
    const px = 4, py = 4, pw = W - 6, ph = W - 6;                                                  // the picture: square, the border deeper below it
    g.save(); g.beginPath(); g.rect(px, py, pw, ph); g.clip();
    g.fillStyle = PAL.mat; g.fillRect(px, py, pw, ph);
    g.fillStyle = '#FFF1CF'; for (const q of [1, 0.66, 0.34]) { g.globalAlpha = 0.12; g.beginPath(); g.ellipse(px + pw / 2, py + ph * 0.58, pw * 0.48 * q, ph * 0.34 * q, 0, 0, 6.2832); g.fill(); }
    g.globalAlpha = 1;
    if (van && draw) { g.save(); g.translate(px + pw / 2, py + ph * 0.62); g.scale(0.42, 0.42); draw(g, van, 0, 0); g.restore(); }
    g.fillStyle = 'rgba(255,255,255,.1)'; g.beginPath(); g.moveTo(px, py); g.lineTo(px + pw * 0.55, py); g.lineTo(px, py + ph * 0.5); g.fill();      // the gloss
    g.restore();
  }, 0.5);
}

// ---------- the camera on its tripod. LENS: where the glass is, from the anchor (its iris is drawn per frame) ----------
export const LENS = { x: 0, y: 13 - 103.5 * HK, r: 4.2 };
export function tripodSprite() {
  const leg = (fx, fy) => [cyl(fx, fy, 2.7, 0, 1.6, '#17191B', '#0E0F10', { hl: 0 }), ...bar3(fx, fy, 1, 0, 0, 80, 3, '#444A51', '#26292D', 14)];
  return bake([
    ...leg(0, -17), ...leg(-18, 9), ...leg(18, 9),
    cyl(0, 0, 2.3, 58, 90, AL, AL2, { hl: 0 }),
    box(-6, -5, 12, 10, 90, 95.5, K, K2, { hl: 0 }),
    box(-13, -9, 26, 16, 95.5, 113, '#3A3F45', '#212428', {
      det: g => { g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(-13, -9, 26, 3); g.fillStyle = AL2; g.fillRect(6, -5, 4, 4); },
      front: (g, x, y, w, h) => { g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(x, y, w, 1.2); g.fillStyle = '#17191B'; g.fillRect(x + 2, y + h - 3.4, 6, 2.2); }
    }),
    rbox(-7.4, 7, 14.8, 6, 2.6, 96, 111, '#26292D', '#131517', {
      hl: 0, front: (g, x, y, w, h) => { const cx = x + w / 2, cy = y + h / 2; g.fillStyle = AL2; g.beginPath(); g.arc(cx, cy, 6, 0, TAU); g.fill(); g.fillStyle = '#0B0C0D'; g.beginPath(); g.arc(cx, cy, 4.9, 0, TAU); g.fill(); }
    }),
    box(-9, -7, 9, 9, 113, 118, K, K2, { hl: 0 }),                            // the viewfinder hump
    box(3, -3, 8, 2.6, 113, 121, AL2, '#6E7679', { hl: 0 })                    // a top handle
  ], NS);
}

// ---------- the light stand: three flat feet, a pole, a panel with barn doors. on: the panel is lit ----------
export function standSprite(on) {
  const sl = [];
  for (const a of [1.5708, 3.665, 5.76]) { const cx = Math.cos(a), sy = Math.sin(a), nx = -sy * 1.7, ny = cx * 1.7; sl.push(poly([[nx, ny], [cx * 20 + nx, sy * 20 + ny], [cx * 20 - nx, sy * 20 - ny], [-nx, -ny]], 0, 2.6, '#444A51', '#26292D', { hl: 0 })); }
  sl.push(cyl(0, 0, 1.9, 2.6, 128, AL, AL2, { hl: 0 }));
  sl.push(cyl(0, 0, 3, 70, 77, K, K2, { hl: 0 }));
  sl.push(box(-3, -3, 6, 6, 122, 130, K, K2, { hl: 0 }));
  sl.push(box(-17, -3.4, 34, 6.8, 126, 152, K, K2, {
    hl: 0, front: (g, x, y, w, h) => {
      g.fillStyle = on ? '#FFE9BC' : '#101214'; g.fillRect(x + 1.6, y + 1.6, w - 3.2, h - 3.2);
      if (on) { g.fillStyle = '#FFFFFF'; g.fillRect(x + 4, y + 3.6, w - 8, h - 7.2); g.fillStyle = 'rgba(255,196,107,.5)'; for (let i = 1; i < 6; i++) g.fillRect(x + 1.6 + i * (w - 3.2) / 6, y + 1.6, 0.8, h - 3.2); }
      else { g.fillStyle = '#343A40'; for (let j = 0; j < 3; j++) for (let i = 0; i < 8; i++) g.fillRect(x + 3.6 + i * 3.6, y + 3.4 + j * 3.6, 1.8, 1.8); }
    }
  }));
  sl.push(poly([[-17, -3.4], [-17, 3.4], [-25, 10], [-25, 3]], 127, 151, '#33383D', K2, { hl: 0 }));        // barn doors, swung toward the viewer
  sl.push(poly([[17, -3.4], [25, 3], [25, 10], [17, 3.4]], 127, 151, '#33383D', K2, { hl: 0 }));
  return bake(sl, NS);
}
// ---------- the campfire: a ring of stones and four crossed logs, two of them showing their rings ----------
// The ember and the flames are drawn per frame (FLAME: the two frames its three tongues flip between).
export function fireSprite() {
  const r = mulberry32(4711), stones = [], G = ['#8C9598', '#7A8386', '#9AA3A6', '#6E7679'];
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + 0.2, rad = 3.6 + r() * 1.5; stones.push([Math.cos(a) * 16.5, Math.sin(a) * 14.5, rad, 3.6 + r() * 2.4, G[(r() * 4) | 0]]); }
  stones.sort((a, b) => a[1] - b[1]);
  const log = (a, len, z0, c) => { const cs = Math.cos(a), sn = Math.sin(a), hx = cs * len, hy = sn * len, nx = -sn * 2.9, ny = cs * 2.9; return poly([[-hx + nx, -hy + ny], [hx + nx, hy + ny], [hx - nx, hy - ny], [-hx - nx, -hy - ny]], z0, z0 + 5.4, c, shade(c, -32), { hl: 0, det: g => { g.strokeStyle = 'rgba(20,17,15,.2)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(-hx * 0.7, -hy * 0.7); g.lineTo(hx * 0.6, hy * 0.6); g.stroke(); } }); };
  // a sawn end, facing the viewer: pale wood, two rings, a split
  const end = (a, len, z0) => decal(g => {
    const x = Math.cos(a) * len, y = Math.sin(a) * len - (z0 + 2.7) * HK;
    g.fillStyle = '#D9B47C'; g.beginPath(); g.ellipse(x, y, 3.1, 2.7, 0, 0, TAU); g.fill();
    g.strokeStyle = '#8A5A2B'; g.lineWidth = 0.7; g.beginPath(); g.ellipse(x, y, 2, 1.7, 0, 0, TAU); g.stroke(); g.beginPath(); g.ellipse(x, y, 0.8, 0.7, 0, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2.4, y - 1.4); g.stroke();
  });
  const sl = [cyl(0, 0, 13, 0, 0.8, '#1A1C1B', '#1A1C1B', { hl: 0 })];        // ash
  for (const s of stones.filter(s => s[1] < 0)) sl.push(cyl(s[0], s[1], s[2], 0, s[3], s[4], '#565E61'));
  sl.push(log(0.32, 13, 0.8, '#7A4E26'), log(-0.5, 12.5, 0.8, '#6B4526'), log(1.22, 11.5, 6.2, '#5E3D20'), end(1.22, 11.5, 6.2), log(1.95, 11, 6.2, '#54361C'), end(1.95, 11, 6.2));
  for (const s of stones.filter(s => s[1] >= 0)) sl.push(cyl(s[0], s[1], s[2], 0, s[3], s[4], '#565E61'));
  return bake(sl, NS);
}
// Three hard-edged tongues, each a straight-sided shape [x, y] from the fire's middle (y up the screen is negative),
// in two frames that are flipped between six times a second: the wide gold one, the pale one inside it, the pink core.
export const FLAME = [
  [[[-13, 0], [-15, -13], [-9, -9], [-7, -27], [-1, -17], [3, -41], [8, -21], [12, -29], [14, -11], [13, 0]],
    [[-7, 0], [-8, -11], [-3, -7], [1, -27], [5, -12], [8, -17], [8, 0]],
    [[-4, 0], [-3, -9], [1, -15], [4, -7], [4, 0]]],
  [[[-13, 0], [-13, -11], [-10, -23], [-5, -13], [-2, -37], [4, -19], [7, -31], [11, -15], [15, -17], [13, 0]],
    [[-8, 0], [-7, -15], [-3, -9], [-1, -23], [4, -13], [7, -9], [7, 0]],
    [[-4, 0], [-4, -7], [-1, -13], [3, -8], [4, 0]]]
];
// ---------- the flag pole beside the color war sheet (its flag is drawn per frame) ----------
export const POLE_H = 150;
export function poleSprite() {
  return bake([
    cyl(0, 0, 7, 0, 2.4, PLY, PLY2, { hl: 0 }), cyl(0, 0, 1.9, 2.4, POLE_H, AL, AL2, { hl: 0 }),
    cyl(0, 0, 2.6, 10, 17, REFL, '#EEF2F4', { hl: 0 }), cyl(0, 0, 2.8, POLE_H, POLE_H + 4, '#D2A76A', '#A47B45', { hl: 0 }),
    room(-3, -3, 40, 3, POLE_H + 4)
  ], NS);
}

// ---------- the dolly: a platform on four wheels with a push bar, standing on its track. th: the way the track runs ----------
export function dollySprite(th) {
  const grip = g => { g.fillStyle = 'rgba(255,255,255,.06)'; for (let x = -24; x < 26; x += 4) g.fillRect(x, -17, 1.2, 34); g.strokeStyle = AL2; g.lineWidth = 1; g.strokeRect(-27.5, -19.5, 55, 39); g.fillStyle = REFL; g.fillRect(22, -19, 4.4, 38); };
  const sl = [];
  for (const [x, y] of [[-20, -17], [20, -17], [-20, 17], [20, 17]]) sl.push(cyl(x, y, 5, 0, 8, '#3A3F44', '#17191B', { hl: 0 }));
  sl.push(rbox(-28, -20, 56, 40, 3, 8, 14, K, K2, { det: grip, hl: 0 }));
  sl.push(cyl(-22, -12, 1.8, 14, 54, AL, AL2, { hl: 0 }), cyl(-22, 12, 1.8, 14, 54, AL, AL2, { hl: 0 }));        // the push bar's two uprights
  sl.push(box(-23.6, -14, 3.2, 28, 54, 57, AL, AL2, { hl: 0 }));
  return bake(sl, { rot: th, shadow: false });
}
// a C-stand: three flat feet, a column, an arm, and a black flag 40 x 30 hanging from it with one white edge
export function cstandSprite() {
  const sl = [];
  for (const a of [1.2, 3.3, 5.4]) { const cx = Math.cos(a), sy = Math.sin(a), nx = -sy * 1.7, ny = cx * 1.7; sl.push(poly([[nx, ny], [cx * 22 + nx, sy * 22 + ny], [cx * 22 - nx, sy * 22 - ny], [-nx, -ny]], 0, 2.6, AL, AL2, { hl: 0 })); }
  sl.push(cyl(0, 0, 2, 2.6, 150, AL, AL2, { hl: 0 }), cyl(0, 0, 3.2, 60, 68, K, K2, { hl: 0 }), box(-3.4, -3.4, 6.8, 6.8, 144, 153, K, K2, { hl: 0 }));
  sl.push(...bar3(0, 0, 148, 44, 0, 148, 2.4, AL, AL2, 6));                                                    // the arm
  sl.push(room(0, -2, 48, 2, 150));
  sl.push(decal(g => {                                     // the flag: black cloth in a wire frame, hanging under the arm
    const y0 = -148 * HK + 2.2;
    g.fillStyle = '#17191B'; g.fillRect(5, y0, 40, 30); g.strokeStyle = AL2; g.lineWidth = 1.1; g.strokeRect(5, y0, 40, 30);
    g.fillStyle = 'rgba(255,255,255,.05)'; g.beginPath(); g.moveTo(5, y0); g.lineTo(24, y0); g.lineTo(5, y0 + 22); g.fill();
    g.fillStyle = REFL; g.fillRect(5, y0 + 26.4, 40, 3);
  }));
  return bake(sl, NS);
}
// two apple boxes, stacked a little askew: plywood, a hand slot in each end, a strip of white tape
export function appleBoxes() {
  const end = (g, x, y, w, h) => { g.fillStyle = 'rgba(20,17,15,.5)'; g.beginPath(); rr(g, x + w / 2 - 6.5, y + h / 2 - 2, 13, 4, 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x, y, w, 0.9); };
  const top = g => { g.strokeStyle = 'rgba(74,38,16,.22)'; g.lineWidth = 0.8; for (const y of [-6, 3]) { g.beginPath(); g.moveTo(-18, y); g.lineTo(20, y + 1.5); g.stroke(); } g.fillStyle = REFL; g.fillRect(4, -11, 12, 3.4); };
  return bake([
    box(-20, -13, 40, 26, 0, 16, PLY, PLY2, { front: end }),
    box(-17, -12, 40, 26, 16, 32, '#D2A76A', '#A47B45', { front: end, det: top })
  ], NS);
}
// a pair of sandbags, one across the other: black canvas, a strap handle, a white stitched tag
export function sandbags() {
  const bag = (x, y, w, h, z0, z1, tag) => rbox(x, y, w, h, 7, z0, z1, '#33383D', '#1B1D20', { hl: 0, det: g => {
    g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); rr(g, x + 2, y + 2, w - 4, h * 0.36, 5); g.fill();
    g.strokeStyle = '#4A5157'; g.lineWidth = 2.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + w * 0.5, y + 1.5); g.lineTo(x + w * 0.5, y + h - 1.5); g.stroke();
    if (tag) { g.fillStyle = REFL; g.fillRect(x + w - 11, y + h - 7.4, 7, 3.4); }
  } });
  return bake([bag(-25, -8, 32, 18, 0, 8), bag(-9, -12, 32, 18, 3, 11, true)], NS);
}
// a coil of cable, 22 in radius: five loops lying one on another, a plug at the loose end
export function coilSprite() {
  return flat(56, 52, 28, 26, g => {
    g.translate(28, 26); g.lineCap = 'round';
    const loops = [[0, 0, 22], [1.5, -0.8, 19.4], [-0.8, 0.6, 16.8], [1, 0.4, 14.2], [-0.4, -0.6, 11.8]];
    for (const [x, y, rad] of loops) { g.strokeStyle = '#0A0B0C'; g.lineWidth = 3.6; g.beginPath(); g.ellipse(x, y, rad, rad * 0.86, 0, 0, TAU); g.stroke(); g.strokeStyle = '#3A4046'; g.lineWidth = 2; g.stroke(); }
    g.strokeStyle = '#0A0B0C'; g.lineWidth = 3.6; g.beginPath(); g.moveTo(20, 8); g.quadraticCurveTo(27, 14, 22, 22); g.stroke(); g.strokeStyle = '#3A4046'; g.lineWidth = 2; g.stroke();
    g.fillStyle = PAL.steel; g.fillRect(19, 20, 6, 5); g.fillStyle = REFL; g.fillRect(-3, -24.6, 6, 3.2);      // a wrap of white tape holds the coil
  }, 0.6);
}

// ---------- dressing ----------
// a cable thrown down at (ox, oy): three bends, seeded. A path and its two ends (mat.js strokes it with the long runs)
export function cablePath(seed, ox, oy) {
  const r = mulberry32(seed), p = []; let x = -44, y = (r() - 0.5) * 20;
  for (let i = 0; i < 4; i++) { p.push([ox + x, oy + y]); x += 24 + r() * 10; y = (r() - 0.5) * 40; }
  const path = new Path2D();
  path.moveTo(p[0][0], p[0][1]); path.bezierCurveTo(p[0][0] + 14, p[0][1] - 24, p[1][0] - 12, p[1][1] + 22, p[1][0], p[1][1]); path.bezierCurveTo(p[1][0] + 12, p[1][1] - 22, p[2][0] - 10, p[2][1] - 16, p[2][0], p[2][1]); path.quadraticCurveTo(p[2][0] + 12, p[2][1] + 18, p[3][0], p[3][1]);
  return { path, bb: [ox - 70, oy - 60, ox + 70, oy + 60], a: p[0], b: p[3] };
}
export function lensCap() {
  return bake([cyl(0, 0, 9, 0, 2.6, '#2B2F33', '#131517', { det: g => { g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 0.9; g.beginPath(); g.arc(0, 0, 6.2, 0, TAU); g.stroke(); g.fillStyle = '#17191B'; g.fillRect(-4.6, -1.3, 2.6, 2.6); g.fillRect(2, -1.3, 2.6, 2.6); } })], NS);
}
export function battery(a) {
  return bake([rbox(-8, -5, 16, 10, 1.6, 0, 5, '#3A3F44', '#1E2124', { det: g => { g.fillStyle = '#E9E5DA'; g.fillRect(-5.4, -3, 7, 6); g.fillStyle = '#C9A44A'; g.fillRect(5, -3.4, 1.6, 2.2); g.fillRect(5, 1.2, 1.6, 2.2); } })], { rot: a, shadow: false });
}
// a T of spike tape on the floor: where someone was told to stand
export function tMark(color, a) {
  return flat(40, 40, 20, 20, g => {
    g.translate(20, 20); g.rotate(a);
    const strip = (x, y, w, h) => { g.fillStyle = color; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x, y, w, Math.min(h, 1.6)); g.strokeStyle = 'rgba(20,17,15,.4)'; g.lineWidth = 0.6; g.strokeRect(x, y, w, h); };
    strip(-11, -9, 22, 5.4); strip(-2.7, -4.4, 5.4, 16);
  }, 0.6);
}
// what lies under pines: a few twigs and needles
export function twigs(seed) {
  const r = mulberry32(seed);
  return flat(60, 40, 30, 20, g => {
    g.lineCap = 'round';
    for (let i = 0; i < 9; i++) { const x = 6 + r() * 48, y = 5 + r() * 30, a = r() * TAU, l = 3 + r() * 4; g.strokeStyle = '#2E8A60'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    for (let i = 0; i < 3; i++) { const x = 10 + r() * 40, y = 8 + r() * 24, a = r() * TAU, l = 7 + r() * 9; g.strokeStyle = '#3B2715'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); g.strokeStyle = '#8A5A2B'; g.lineWidth = 1.5; g.stroke(); }
  }, 0.5);
}

// ---------- the slate: a clapperboard lying on the mat, lettered with the kinds of video ----------
// Origin = the middle of the board. It lies a little askew (rot). rows: its lettering, one row to a field, in
// reflective white (it flares in the headlights). The upper stick is drawn per frame (it claps): STICK is where its
// hinge is and how long it is, in the board's own turned frame.
export const SLATE = { w: 120, h: 80, rot: -0.07, hx: -60, hy: -52, len: 120, th: 12 };
export function slateRows(kinds, width, font) {
  const m = mk(4, 4).getContext('2d'); m.font = font;
  const rows = []; let cur = '';
  for (const k of kinds) { const t = cur ? cur + '  ·  ' + k : k; if (cur && m.measureText(t).width > width) { rows.push(cur); cur = k; } else cur = t; }
  if (cur) rows.push(cur);
  return rows;
}
export function slateSprite(kinds) {
  const S = SLATE, W = S.w, H = S.h, fs = 13, font = `900 ${fs}px ${STENCIL}`, rows = slateRows(kinds, W - 14, font), top = -H / 2 + 5, rh = (H - 10) / rows.length;
  const face = g => {
    g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(-W / 2, -H / 2, W, 3);
    g.strokeStyle = 'rgba(244,241,232,.5)'; g.lineWidth = 0.9;                                     // ruled fields, as a slate has
    for (let i = 1; i < rows.length; i++) { g.beginPath(); g.moveTo(-W / 2 + 5, top + i * rh); g.lineTo(W / 2 - 5, top + i * rh); g.stroke(); }
    g.strokeRect(-W / 2 + 2.5, -H / 2 + 2.5, W - 5, H - 5);
    g.font = font; g.fillStyle = REFL; g.textAlign = 'center'; g.textBaseline = 'middle';
    rows.forEach((r, i) => g.fillText(r, 0, top + (i + 0.5) * rh + 0.9));
  };
  return bake([
    box(-W / 2, -H / 2, W, H, 0, 3.4, '#2A2E31', '#17191B', { det: face, hl: 0 }),
    box(-W / 2, -H / 2 - S.th, W, S.th, 0, 4.6, '#17191B', '#0D0E0F', { det: g => stripes(g, -W / 2, -H / 2 - S.th, W, S.th, 1), hl: 0 })      // the lower stick, fixed along its top
  ], { rot: S.rot, shadow: false });
}
// the sticks' slanted white bars. dir: which way they lean (the two sticks lean opposite ways, so they meet as chevrons)
export function stripes(g, x, y, w, h, dir, col = '#F4F1E8') {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.fillStyle = col;
  for (let i = -h; i < w + h; i += 19) { g.beginPath(); g.moveTo(x + i, y + (dir > 0 ? h : 0)); g.lineTo(x + i + 9.5, y + (dir > 0 ? h : 0)); g.lineTo(x + i + 9.5 + dir * h * 0.6, y + (dir > 0 ? 0 : h)); g.lineTo(x + i + dir * h * 0.6, y + (dir > 0 ? 0 : h)); g.closePath(); g.fill(); }
  g.restore();
}

// ---------- a short band of bunting strung between two trees: w wide, sagging. colour: once its screen is found ----------
// Origin = the middle of the line between its two ends.
export function bandSprite(w, colour) {
  const cols = colour ? [PAL.pink, PAL.gold, '#F4F1E8', PAL.blue] : ['#7E878A', '#99A2A5'], n = Math.round(w / 15);
  return flat(w + 8, 40, w / 2 + 4, 8, g => {
    g.translate(w / 2 + 4, 8);
    const P = t => [-w / 2 + w * t, 4 * t * (1 - t) * 11];
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.strokeStyle = '#B58A52'; g.lineWidth = 1.2; g.beginPath(); for (let i = 0; i <= 12; i++) { const p = P(i / 12); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); } g.stroke();
    for (let i = 0; i < n; i++) {
      const a = P((i + 0.12) / n), b = P((i + 0.88) / n), mx = (a[0] + b[0]) / 2, my = Math.max(a[1], b[1]) + 13.5;
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(mx, my); g.closePath();
      g.fillStyle = cols[i % cols.length]; g.fill();
      g.strokeStyle = REFL; g.lineWidth = 1.5; g.beginPath(); g.moveTo(a[0] + 0.6, a[1] + 1); g.lineTo(mx, my - 1.2); g.lineTo(b[0] - 0.6, b[1] + 1); g.stroke();     // reflective trim
      if (colour) { g.strokeStyle = rgba(PAL.ink, 0.55); g.lineWidth = 0.7; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(mx, my); g.closePath(); g.stroke(); }
    }
  }, 0.5);
}
