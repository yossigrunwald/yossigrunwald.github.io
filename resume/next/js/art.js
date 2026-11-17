// art.js — the slab baker (spec 8.1), ground tiles, prop recipes, van headings.
// Everything is drawn once into offscreen sprites. Nothing in this file runs per frame except drawSpr/drawShadow.
import { PAL, mulberry32, SEED } from './world.js';

export const SS = 2;            // sprite pixels per world unit
export const HK = 0.6;          // screen px per unit of height
const SHX = 0.45, SHY = 0.30;   // shadow offset per unit of height (hard light from the upper left)
export const STENCIL = '"Big Shoulders Stencil","Arial Narrow","Haettenschweiler",Impact,sans-serif';
export const HAND = '"Shantell Sans","Segoe Print","Comic Sans MS",cursive';

export function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
export function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.arcTo(x + w, y, x + w, y + r, r); g.lineTo(x + w, y + h - r);
  g.arcTo(x + w, y + h, x + w - r, y + h, r); g.lineTo(x + r, y + h); g.arcTo(x, y + h, x, y + h - r, r);
  g.lineTo(x, y + r); g.arcTo(x, y, x + r, y, r); g.closePath();
}
function hex(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; }
export function shade(h, pct) {            // pct > 0 lighter, < 0 darker
  const [r, g, b] = hex(h), t = pct > 0 ? 255 : 0, k = Math.abs(pct) / 100;
  return `rgb(${Math.round(r + (t - r) * k)},${Math.round(g + (t - g) * k)},${Math.round(b + (t - b) * k)})`;
}
export function rgba(h, a) { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; }

// 6% paper grain, baked into tiles and sprites (never a full-screen pass)
let grainC = null;
function grain() {
  if (grainC) return grainC;
  const n = 128, c = mk(n, n), g = c.getContext('2d'), im = g.createImageData(n, n), r = mulberry32(77);
  for (let i = 0; i < n * n; i++) {
    const v = r() - 0.5, o = i * 4, w = v > 0 ? 255 : 0;
    im.data[o] = im.data[o + 1] = im.data[o + 2] = w; im.data[o + 3] = Math.abs(v) * 2 * 0.085 * 255;
  }
  g.putImageData(im, 0, 0); grainC = c; return c;
}
function addGrain(c, k = 1) {
  const g = c.getContext('2d'); g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-atop'; g.globalAlpha = k; g.fillStyle = g.createPattern(grain(), 'repeat');
  g.fillRect(0, 0, c.width, c.height); g.restore();
}

// ---------- slabs ----------
// A slab is a flat plan shape with a bottom height, a top height, a top colour and a side colour.
// o: det(g) drawn on the top (clipped) · front(g,x,y,w,h) drawn on a box's south face · hl:0 no edge light · ns:1 no shadow
export const box = (x, y, w, h, z0, z1, top, side, o) => ({ path: g => g.rect(x, y, w, h), b: [x, y, x + w, y + h], z0, z1, top, side, ...o });
export const rbox = (x, y, w, h, r, z0, z1, top, side, o) => ({ path: g => rr(g, x, y, w, h, r), b: [x, y, x + w, y + h], z0, z1, top, side, ...o });
export const cyl = (x, y, r, z0, z1, top, side, o) => ({ path: g => { g.moveTo(x + r, y); g.arc(x, y, r, 0, 6.2832); }, b: [x - r, y - r, x + r, y + r], z0, z1, top, side, ...o });
export const ring = (x, y, ro, ri, z0, z1, top, side, o) => ({ path: g => { g.moveTo(x + ro, y); g.arc(x, y, ro, 0, 6.2832); g.moveTo(x + ri, y); g.arc(x, y, ri, 0, -6.2832, true); }, b: [x - ro, y - ro, x + ro, y + ro], z0, z1, top, side, ...o });
export const poly = (pts, z0, z1, top, side, o) => {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { path: g => { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); }, b: [x0, y0, x1, y1], z0, z1, top, side, ...o };
};
// An upright face: a rectangle standing on the base line y, facing the viewer (screens, sheets, the garage mouth).
// o: r corner · lift px above the ground · det(g,x,y,w,h) · sz shadow height in units · sd footprint depth
export const face = (x, y, w, hpx, fill, o = {}) => ({ face: true, x, y, w, hpx, fill, r: o.r || 0, lift: o.lift || 0, det: o.det, sz: o.sz || 0, sd: o.sd || 4, b: [x, y - 1, x + w, y], z0: 0, z1: 0 });

export function bake(slabs, o = {}) {
  // shadows are baked at one pixel a unit (as the van's always were): a flat 22% shape needs no more, and it is a quarter of the memory
  const rot = o.rot || 0, pad = 3, sres = o.sres || 1, rc = Math.cos(rot), rs = Math.sin(rot);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, zs = 0, top = 1e9;
  for (const s of slabs) {
    const b = s.b; let ax = b[0], ay = b[1], bx = b[2], by = b[3];
    if (rot) {                                             // a turned prop: the box each slab really fills, not the square of the longest reach
      ax = ay = 1e9; bx = by = -1e9;
      for (const [px, py] of [[b[0], b[1]], [b[2], b[1]], [b[0], b[3]], [b[2], b[3]]]) { const qx = px * rc - py * rs, qy = px * rs + py * rc; ax = Math.min(ax, qx); bx = Math.max(bx, qx); ay = Math.min(ay, qy); by = Math.max(by, qy); }
    }
    x0 = Math.min(x0, ax); y0 = Math.min(y0, ay); x1 = Math.max(x1, bx); y1 = Math.max(y1, by);
    if (!s.ghost) top = Math.min(top, s.face ? s.y - s.lift - s.hpx : ay - s.z1 * HK);      // ghost: it casts its shadow but is drawn by other means
    zs = Math.max(zs, s.face ? s.sz : (s.ns ? 0 : s.z1));
  }
  top = Math.min(top, y0);
  const bx0 = x0 - pad, by0 = top - pad, bx1 = x1 + pad, by1 = y1 + pad;
  const c = mk((bx1 - bx0) * SS, (by1 - by0) * SS), g = c.getContext('2d');
  const OX = -bx0 * SS, OY = -by0 * SS;
  for (const s of slabs) {
    if (s.ghost) continue;
    if (s.face) {
      const fy = s.y - s.lift - s.hpx;
      g.setTransform(SS, 0, 0, SS, OX, OY);
      g.beginPath(); rr(g, s.x, fy, s.w, s.hpx, s.r); g.fillStyle = s.fill; g.fill();
      if (s.det) { g.save(); g.clip(); s.det(g, s.x, fy, s.w, s.hpx); g.restore(); }
      continue;
    }
    const h0 = Math.round(s.z0 * HK * SS), h1 = Math.round(s.z1 * HK * SS);
    if (s.side) {
      g.fillStyle = s.side;
      for (let h = h0; h < h1; h++) { g.setTransform(SS, 0, 0, SS, OX, OY - h); if (rot) g.rotate(rot); g.beginPath(); s.path(g); g.fill(); }
    }
    if (s.front && !rot) { g.setTransform(SS, 0, 0, SS, OX, OY); s.front(g, s.b[0], s.b[3] - s.z1 * HK, s.b[2] - s.b[0], (s.z1 - s.z0) * HK); }
    g.setTransform(SS, 0, 0, SS, OX, OY - h1); if (rot) g.rotate(rot);
    g.beginPath(); s.path(g); g.fillStyle = s.top; g.fill(s.eo ? 'evenodd' : 'nonzero');
    if (s.det || s.hl !== 0) {
      g.save(); g.clip(s.eo ? 'evenodd' : 'nonzero');
      if (s.det) s.det(g);
      if (s.hl !== 0) { g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,255,255,.2)'; g.beginPath(); s.path(g); g.stroke(); }
      g.restore();
    }
  }
  if (o.grain !== 0) addGrain(c);
  const spr = { c, ox: OX, oy: OY, s: null, sox: 0, soy: 0, sres, bb: [bx0 + pad, by0 + pad, bx1 - pad, by1 - pad] };
  if (o.shadow !== false && zs > 0.4) {
    const sx0 = x0 - pad, sy0 = y0 - pad, sx1 = x1 + SHX * zs + pad, sy1 = y1 + SHY * zs + pad;
    const sc = mk((sx1 - sx0) * sres, (sy1 - sy0) * sres), q = sc.getContext('2d');
    q.fillStyle = PAL.ink;
    for (const s of slabs) {
      if (s.ns) continue;
      const za = s.face ? 0 : s.z0, zb = s.face ? s.sz : s.z1;
      if (zb <= 0) continue;
      const n = Math.max(1, Math.ceil((zb - za) * 0.54 * sres / 1.2));
      for (let i = 0; i <= n; i++) {
        const z = za + (zb - za) * i / n;
        q.setTransform(sres, 0, 0, sres, (-sx0 + SHX * z) * sres, (-sy0 + SHY * z) * sres); if (rot) q.rotate(rot);
        q.beginPath(); if (s.face) q.rect(s.x, s.y - s.sd, s.w, s.sd); else s.path(q); q.fill();
      }
    }
    q.setTransform(1, 0, 0, 1, 0, 0); q.globalCompositeOperation = 'destination-in'; q.fillStyle = 'rgba(0,0,0,.22)'; q.fillRect(0, 0, sc.width, sc.height);
    spr.s = sc; spr.sox = -sx0 * sres; spr.soy = -sy0 * sres;
  }
  return spr;
}
// A sprite may carry its own resolution (sp.res pixels a unit; SS when absent) and may be one that is let go while the
// van is far from it and baked again when it comes near (keep(), below).
export function drawSpr(ctx, sp, x, y) {
  if (sp.make) {
    if (!sp.c) {
      // the whole table is on screen (the three-track moment): a let-go sprite is shown by its small stand-in, not baked again
      if (LOW && sp.lo) { const q = sp.res || SS; ctx.drawImage(sp.lo, 0, 0, sp.cw / 4, sp.ch / 4, x - sp.ox / q, y - sp.oy / q, sp.cw / q, sp.ch / q); return; }
      wake(sp); wakes.draw++;
    }
    sp.t = NOW;
  }
  const q = sp.res || SS; ctx.drawImage(sp.c, x - sp.ox / q, y - sp.oy / q, sp.c.width / q, sp.c.height / q);
}
export function drawShadow(ctx, sp, x, y) {
  if (sp.make) { if (!sp.c) { if (LOW) return; wake(sp); wakes.draw++; } sp.t = NOW; }
  if (sp.s) ctx.drawImage(sp.s, x - sp.sox / sp.sres, y - sp.soy / sp.sres, sp.s.width / sp.sres, sp.s.height / sp.sres);
}
// ---------- sprites that are held only while they are near (spec 9.6: canvas memory) ----------
// keep(make, x, y[, x1, y1]) bakes a sprite now and remembers how. A sweep, twice a second, lets go of the canvases of
// the ones whose place (a point, or a rect when several things share the sprite) is outside the view grown by a
// margin and that have not been drawn for 3 s, and asks for the ones that have come back inside to be baked again in
// an idle slice. A sprite drawn while let go is baked on the spot. Its size, origin and bb never change.
// Each also keeps a stand-in a quarter its size (a sixteenth of the memory): while the camera shows the whole table
// (lowRes(true)) a let-go sprite is drawn from that, so the overview never has to hold every sprite at once.
let NOW = 0, LOW = false, NEAR2 = null; const kept = [], NEAR = [-900, -1100, 900, 1100];
export function lowRes(on) { LOW = on; }
export const wakes = { draw: 0, idle: 0, drops: 0 };      // for ?debug=1: how often a let-go sprite had to be baked inside a frame's drawing, how often ahead of it
export function clock(t) { NOW = t; }
const isNear = sp => { const a = sp.at, n = NEAR2; return (a[2] > NEAR[0] && a[0] < NEAR[2] && a[3] > NEAR[1] && a[1] < NEAR[3]) || (!!n && a[2] > n[0] && a[0] < n[2] && a[3] > n[1] && a[1] < n[3]); };
const at2 = sp => { const a = sp.at, n = NEAR2; return !!n && a[2] > n[0] && a[0] < n[2] && a[3] > n[1] && a[1] < n[3]; };
function wake(sp) { const n = sp.make(); sp.c = n.c; sp.s = n.s; sp.t = NOW; }
function drop(sp) { if (!sp.c) return; wakes.drops++; sp.c.width = sp.c.height = 0; sp.c = null; if (sp.s) { sp.s.width = sp.s.height = 0; sp.s = null; } }
export function keep(make, x, y, x1 = x, y1 = y, first = null) {      // first: the sprite, if it has just been baked already
  const sp = first || make(), b = sp.bb; sp.make = make; sp.t = NOW; kept.push(sp);
  sp.at = x1 === x && y1 === y && b ? [x + b[0], y + b[1], x + b[2], y + b[3]] : [x, y, x1, y1];      // a point: the ground it covers from there
  sp.cw = sp.c.width; sp.ch = sp.c.height; sp.lo = mk(sp.cw / 4, sp.ch / 4); sp.lo.getContext('2d').drawImage(sp.c, 0, 0, sp.cw / 4, sp.ch / 4);
  return sp;
}
// called when a sprite has just been made and nothing more will read its canvas this turn: far ones are let go at once
export function settle() { for (const sp of kept) if (!sp.seen) { sp.seen = true; if (!isNear(sp)) drop(sp); } }
// no longer one of the kept (it has been replaced). free: nothing will ever draw it again, so its canvases go now
export function retire(sp, free) { if (!sp || !sp.make) return; const i = kept.indexOf(sp); if (i >= 0) kept.splice(i, 1); if (free) drop(sp); else if (!sp.c) wake(sp); sp.make = null; }
// its canvas, baked again if it was let go (for the few places that read a canvas directly)
export function cv(sp) { if (sp.make) { if (!sp.c) wake(sp); sp.t = NOW; } return sp.c; }
// r: the view grown by a margin · r2: a second place to keep ready (where the camera is about to go), or null
export function sweep(r, jobs, r2 = null) {
  NEAR[0] = r[0]; NEAR[1] = r[1]; NEAR[2] = r[2]; NEAR[3] = r[3]; NEAR2 = r2;
  for (const sp of kept) {
    const near = isNear(sp);
    if (sp.c) { if (!near && NOW - sp.t > 3) drop(sp); }
    else if (near && !sp.due && (!LOW || at2(sp))) { sp.due = true; jobs.push(() => { sp.due = false; if (!sp.c && sp.make && (!LOW || at2(sp))) { wake(sp); wakes.idle++; } }); }      // (while the whole table is on screen, only what stands where the camera goes next)
  }
}
export function keptCanvases() { const out = []; for (const sp of kept) out.push(sp.c, sp.s, sp.lo); return out; }
// a flat sprite from a draw function; origin at (cx, cy) in units. res: pixels a unit (light pools need only one)
export function flat(w, h, cx, cy, draw, grainK = 1, res = SS) {
  const c = mk(w * res, h * res), g = c.getContext('2d'); g.scale(res, res); draw(g);
  if (grainK) addGrain(c, grainK);
  return { c, ox: cx * res, oy: cy * res, s: null, res, bb: [-cx, -cy, w - cx, h - cy] };
}
// a dark twin of a sprite, for things on the unlit mat (spec 8.4): a flat dark shape, so it is kept at half the
// sprite's resolution (a quarter of the memory)
export function darkTwin(sp) {
  const src = cv(sp), q = sp.res || SS, c = mk(src.width / 2, src.height / 2), g = c.getContext('2d');
  g.drawImage(src, 0, 0, src.width / 2, src.height / 2); g.globalCompositeOperation = 'source-atop'; g.fillStyle = rgba(PAL.matThing, 0.9); g.fillRect(0, 0, c.width, c.height);
  return { c, ox: sp.ox / 2, oy: sp.oy / 2, res: q / 2, s: null, bb: sp.bb };
}
// soft pre-rendered glow (the only place a gradient is ever used: at bake time)
export function glow(color, r, a0 = 1, hard = 0) {
  const c = mk(r * 2 * SS, r * 2 * SS), g = c.getContext('2d'), R = r * SS;
  const gr = g.createRadialGradient(R, R, 0, R, R, R);
  gr.addColorStop(0, rgba(color, a0)); gr.addColorStop(Math.max(0.01, hard), rgba(color, a0)); gr.addColorStop(1, rgba(color, 0));
  g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  return { c, ox: R, oy: R, s: null, bb: [-r, -r, r, r] };
}

// ---------- tape (drawn on canvas for in-world lettering; DOM tape is in game.css) ----------
function tapePath(g, w, h) {
  const n = Math.max(2, Math.round(h / 5)), t = h / n, d = 2.6;
  g.moveTo(-w / 2 + d, -h / 2); g.lineTo(w / 2 - d, -h / 2);
  for (let i = 0; i < n; i++) { g.lineTo(w / 2, -h / 2 + t * (i + 0.5)); g.lineTo(w / 2 - d, -h / 2 + t * (i + 1)); }
  g.lineTo(-w / 2 + d, h / 2);
  for (let i = 0; i < n; i++) { g.lineTo(-w / 2, h / 2 - t * (i + 0.5)); g.lineTo(-w / 2 + d, h / 2 - t * (i + 1)); }
  g.closePath();
}
export function drawTape(g, cx, cy, w, h, deg, color, key = 1.2) {
  g.save(); g.translate(cx, cy); g.rotate(deg * Math.PI / 180);
  g.save(); g.translate(1.4, 1.8); g.beginPath(); tapePath(g, w, h); g.fillStyle = 'rgba(20,17,15,.3)'; g.fill(); g.restore();
  g.beginPath(); tapePath(g, w, h); g.fillStyle = color; g.fill();
  g.save(); g.clip(); g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(-w / 2, -h / 2, w, h * 0.3); g.restore();
  if (key) { g.lineWidth = key; g.strokeStyle = PAL.ink; g.lineJoin = 'round'; g.stroke(); }
  return () => g.restore();         // caller draws text in tape space, then calls this
}
export function tri(g, x, y, s) { g.beginPath(); g.moveTo(x, y - s * 0.55); g.lineTo(x + s * 0.92, y); g.lineTo(x, y + s * 0.55); g.closePath(); g.fill(); }

// the small tab that stays on a found thing for good: one word of tape
export function tabSprite(word, color) {
  const m = mk(4, 4).getContext('2d'); m.font = `700 11px ${HAND}`;
  const tw = m.measureText(word).width, w = tw + 15, h = 16;
  return flat(w + 8, h + 8, (w + 8) / 2, (h + 8) / 2, g => {
    const done = drawTape(g, (w + 8) / 2, (h + 8) / 2, w, h, 0, color, 1);
    g.font = `700 11px ${HAND}`; g.fillStyle = PAL.ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(word, 0, 0.8);
    done();
  }, 0.6);
}

// ---------- ground tiles: 512 px = 256 units, seamless, grain baked in ----------
export function tiles() {
  const r = mulberry32(SEED ^ 0x51ab), out = {};
  const wrapX = (g, fn) => { for (const d of [-512, 0, 512]) { g.save(); g.translate(d, 0); fn(); g.restore(); } };
  const wrapY = (g, fn) => { for (const d of [-512, 0, 512]) { g.save(); g.translate(0, d); fn(); g.restore(); } };
  { // butcher block: glued strips running east-west
    const c = mk(512, 512), g = c.getContext('2d');
    for (let i = 0; i < 8; i++) {
      const y = i * 64, js = []; let x = r() * 200;
      while (x < 512) { js.push(x); x += 190 + r() * 230; }
      for (let k = 0; k < js.length; k++) {
        const a = js[k], b = k + 1 < js.length ? js[k + 1] : js[0] + 512, col = shade(PAL.wood, (r() - 0.45) * 17);
        for (const d of [-512, 0]) { g.fillStyle = col; g.fillRect(a + d, y, b - a, 64); g.fillStyle = 'rgba(74,38,16,.42)'; g.fillRect(a + d, y, 1.6, 64); }
      }
      g.fillStyle = 'rgba(74,38,16,.34)'; g.fillRect(0, y, 512, 1.6);
      g.fillStyle = 'rgba(255,225,180,.10)'; g.fillRect(0, y + 1.6, 512, 1.4);
    }
    for (let k = 0; k < 150; k++) {
      const x = r() * 512, y = r() * 512, len = 50 + r() * 240, w = (r() - 0.5) * 7, a = 0.1 + r() * 0.24, lw = 0.7 + r() * 1.5;
      wrapX(g, () => { g.strokeStyle = rgba(PAL.grain, a); g.lineWidth = lw; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + len / 2, y + w, x + len, y); g.stroke(); });
    }
    addGrain(c); out.block = c;
  }
  { // plywood: long cathedral grain running north-south
    const c = mk(512, 512), g = c.getContext('2d');
    g.fillStyle = '#C08347'; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 9; k++) { const x = r() * 512, w = 30 + r() * 60; wrapX(g, () => { g.fillStyle = `rgba(255,220,170,${0.04 + r() * 0.05})`; g.fillRect(x, 0, w, 512); }); }
    for (let k = 0; k < 46; k++) {
      const x = r() * 512, n = 1, amp = 2 + r() * 8, ph = r() * 6.28, a = 0.1 + r() * 0.24, lw = 0.8 + r() * 2;
      wrapX(g, () => {
        g.strokeStyle = rgba(PAL.grain, a); g.lineWidth = lw; g.beginPath();
        for (let y = -8; y <= 520; y += 8) { const xx = x + Math.sin(y / 512 * 6.2832 * n + ph) * amp; y === -8 ? g.moveTo(xx, y) : g.lineTo(xx, y); }
        g.stroke();
      });
    }
    addGrain(c); out.ply = c;
  }
  { // desk: cool white laminate
    const c = mk(512, 512), g = c.getContext('2d');
    g.fillStyle = PAL.desk; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 520; k++) { g.fillStyle = rgba(PAL.deskShade, 0.25 + r() * 0.45); g.fillRect(r() * 512, r() * 512, 1 + r() * 1.6, 1 + r() * 1.6); }
    for (let k = 0; k < 7; k++) {
      const x = r() * 512, y = r() * 512, l = 30 + r() * 90, a = r() * 6.28;
      wrapX(g, () => wrapY(g, () => { g.strokeStyle = rgba(PAL.deskShade, 0.5); g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }));
    }
    addGrain(c, 0.7); out.desk = c;
  }
  // cutting mat: fine grid every 32 units, heavy every 128, ticks. 256 px (128 units) holds the whole print. diag: one diagonal a
  // tile (the woods'); the dark mat's diagonals come every 256 units, so main.js rules those itself and its tiles carry none
  const mat = (bg, grid, n = 256, diag = true) => {
    const c = mk(n, n), g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, 512, 512); g.fillStyle = grid;
    for (let i = 0; i < 8; i++) { g.fillRect(i * 64, 0, 1.2, 512); g.fillRect(0, i * 64, 512, 1.2); }
    for (let i = 0; i < 2; i++) { g.fillRect(i * 256 - 0.9, 0, 3, 512); g.fillRect(0, i * 256 - 0.9, 512, 3); g.fillRect(509.1, 0, 3, 512); g.fillRect(0, 509.1, 512, 3); }
    for (let i = 0; i < 32; i++) { const l = i % 4 === 0 ? 0 : 6; if (l) { g.fillRect(i * 16, 0, 1.2, l); g.fillRect(0, i * 16, l, 1.2); g.fillRect(i * 16, 256, 1.2, l); g.fillRect(256, i * 16, l, 1.2); } }
    if (diag) { g.strokeStyle = grid; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, n); g.lineTo(n, 0); g.stroke(); }
    addGrain(c, 0.8); return c;
  };
  out.mat = mat(PAL.mat, PAL.matGrid, 256, false); out.matLit = mat(PAL.matLit, PAL.matLitGrid, 256, false);
  out.woods = mat(PAL.woods, PAL.woodsGrid, 256); out.woodsLit = mat(PAL.woodsLit, PAL.woodsLitGrid, 256);      // the green mat of the woods: unlit, and in the light
  { // floor: poured slabs with a seam every 256 units and a few scuffs, so the tables stand on something
    const c = mk(256, 256), g = c.getContext('2d'); g.scale(0.5, 0.5);      // out of focus under the tables: one pixel a unit is enough
    g.fillStyle = PAL.floor; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 3; k++) { g.fillStyle = `rgba(255,255,255,${0.007 + r() * 0.008})`; g.fillRect(r() * 512, r() * 512, 90 + r() * 200, 70 + r() * 160); }
    for (let k = 0; k < 7; k++) {
      const x = r() * 512, y = r() * 512, l = 40 + r() * 110, a = r() * 6.28, bend = (r() - 0.5) * 26;
      wrapX(g, () => wrapY(g, () => { g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1 + r() * 1.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l / 2 - Math.sin(a) * bend, y + Math.sin(a) * l / 2 + Math.cos(a) * bend, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }));
    }
    g.fillStyle = PAL.floorSeam; g.fillRect(0, 0, 512, 3); g.fillRect(0, 0, 3, 512);
    g.fillStyle = 'rgba(255,255,255,.035)'; g.fillRect(0, 3, 512, 1.4); g.fillRect(3, 0, 1.4, 512);
    addGrain(c, 0.9); out.floor = c;
  }
  { // the tape that closes off a cut edge: masking tape, ink hatch every 18 units, ink keyline. 36 x 24 units, repeats along x
    const c = mk(72, 48), g = c.getContext('2d'); g.scale(SS, SS);
    g.fillStyle = PAL.masking; g.fillRect(0, 0, 36, 24);
    g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(0, 1.2, 36, 5);
    g.fillStyle = rgba(PAL.ink, 0.86);
    for (const x of [-18, 0, 18, 36]) { g.beginPath(); g.moveTo(x + 5, 24); g.lineTo(x + 10.5, 24); g.lineTo(x + 26.5, 0); g.lineTo(x + 21, 0); g.closePath(); g.fill(); }
    g.fillStyle = PAL.ink; g.fillRect(0, 0, 36, 1.2); g.fillRect(0, 22.8, 36, 1.2);
    addGrain(c, 0.8); out.tape = c;
  }
  return out;
}

// ---------- the hub: a round of plywood with the name routed in and four tape arrows ----------
// where the two routed lines sit on the hub, in world units (centre y on screen, width, height): the first-paint HTML name lands on them
export const hubText = { name: null, roles: null };
export function hubSprite(name, roles) {
  const R = 160, r = mulberry32(SEED ^ 0x77);
  const det = g => {
    for (let k = 0; k < 8; k++) { g.fillStyle = `rgba(255,222,172,${0.05 + r() * 0.06})`; g.fillRect(-R + r() * 2 * R, -R, 22 + r() * 46, 2 * R); }
    for (let k = 0; k < 44; k++) {
      const x = -R - 20 + r() * (2 * R + 40), amp = 3 + r() * 10, n = 0.5 + r() * 0.8, ph = r() * 6.28;
      g.strokeStyle = rgba(PAL.grain, 0.13 + r() * 0.25); g.lineWidth = 0.6 + r() * 1.5; g.beginPath();
      for (let y = -R; y <= R; y += 6) { const xx = x + Math.sin(y / 160 * n + ph) * amp; y === -R ? g.moveTo(xx, y) : g.lineTo(xx, y); }
      g.stroke();
    }
    g.strokeStyle = 'rgba(74,38,16,.42)'; g.lineWidth = 1.4; g.beginPath(); g.arc(0, 0, R - 9, 0, 6.2832); g.stroke();
    g.strokeStyle = 'rgba(255,225,180,.3)'; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, R - 7.6, 0, 6.2832); g.stroke();
    // routed lettering: a dark cut with a light lower lip
    const routed = (txt, y, width, spacing) => {
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      let fs = 60; g.font = `900 ${fs}px ${STENCIL}`;
      try { g.letterSpacing = spacing + 'px'; } catch (e) { /* older engines: no tracking */ }
      fs *= width / g.measureText(txt).width; g.font = `900 ${fs}px ${STENCIL}`;
      try { g.letterSpacing = (spacing * fs / 60) + 'px'; } catch (e) { /* same */ }
      g.fillStyle = 'rgba(255,226,178,.5)'; g.fillText(txt, 0.9, y + 1.1);
      g.fillStyle = PAL.routed; g.fillText(txt, 0, y);
      const m = g.measureText(txt), asc = m.actualBoundingBoxAscent || fs * 0.72;
      try { g.letterSpacing = '0px'; } catch (e) { /* same */ }
      return { cy: y - asc / 2 - 8 * HK, w: width, h: asc };          // the top of the hub is 8 units up
    };
    hubText.name = routed(name.toUpperCase(), -50, 254, 1);
    hubText.roles = routed(roles.toUpperCase(), 85, 244, 4);
    // four tape arrows at the rim: gold north, pink east, masking south, blue west
    const arrow = (ang, col) => {
      g.save(); g.rotate(ang); g.translate(0, -126);
      const strip = (x, y, w, h, a) => {
        g.save(); g.translate(x, y); g.rotate(a);
        g.fillStyle = 'rgba(20,17,15,.26)'; g.fillRect(-w / 2 + 1, -h / 2 + 1.2, w, h);
        g.fillStyle = col; g.fillRect(-w / 2, -h / 2, w, h);
        g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(-w / 2, -h / 2, w, h * 0.3);
        g.lineWidth = 0.9; g.strokeStyle = 'rgba(20,17,15,.55)'; g.strokeRect(-w / 2, -h / 2, w, h); g.restore();
      };
      strip(0, 4, 7.5, 27, 0); strip(-6.6, -5.5, 7.5, 21, 0.72); strip(6.6, -5.5, 7.5, 21, -0.72);
      g.restore();
    };
    arrow(0, PAL.gold); arrow(Math.PI / 2, PAL.pink); arrow(Math.PI, PAL.masking); arrow(-Math.PI / 2, PAL.blue);
  };
  // plywood edge: the plies show as stripes
  // (its shadow is one disc, drawn by main.js each frame: no canvas is held for it)
  return bake([
    cyl(0, 0, R, 0, 2.6, '#7C4A22', '#7C4A22', { hl: 0 }),
    cyl(0, 0, R, 2.6, 5.2, '#DDAE78', '#DDAE78', { hl: 0, ns: 1 }),
    cyl(0, 0, R, 5.2, 8, '#C28348', '#84501F', { det, ns: 1 })
  ], { shadow: false });
}

// ---------- the van: 46 x 24, h 22, baked at 64 headings on demand (spec 8.1) ----------
// st: { lights, gold, ladder, loaf, cam }
// Drawn 1.3 times that size (VAN_K) so it is not the smallest thing on screen; the collider keeps its radius.
// A panel van: plain body behind, glass only at the front third, a short bonnet, the roof pulled back off the windscreen.
export const VAN_K = 1.3;
const grow = (slabs, k) => slabs.map(s => ({
  ...s, b: s.b.map(v => v * k), z0: s.z0 * k, z1: s.z1 * k,
  path: g => { g.scale(k, k); s.path(g); g.scale(1 / k, 1 / k); },
  det: s.det ? g => { g.save(); g.scale(k, k); s.det(g); g.restore(); } : null
}));
export function vanSprite(a, st) {
  const sn = Math.sin(a), cs = Math.cos(a), near = (x, y) => x * sn + y * cs > 0;
  const sl = [], late = [];
  const body = '#F4F1E8', bodySide = '#D6D1C2', sill = '#BDB8AA', stripe = st.gold ? PAL.gold : '#AEB6BC', glass = PAL.glass;
  for (const [tx, ty] of [[-14, -12], [-14, 8], [13, -12], [13, 8]]) {
    const t = rbox(tx - 4.5, ty, 9, 4, 1.6, 0, 6.5, '#2B2724', PAL.ink, { hl: 0 });
    (near(tx, ty + 2) ? late : sl).push(t);
  }
  sl.push(rbox(-23, -11, 46, 22, 5, 2.5, 8, sill, sill, { hl: 0 }));
  sl.push(...late.splice(0));
  sl.push(rbox(-23, -11, 46, 22, 5, 8, 10.5, stripe, stripe, { hl: 0, ns: 1 }));
  const lamps = [];
  for (const ly of [-9, 5]) {
    lamps.push([22.4, ly, box(22.4, ly, 1.7, 4, 6.2, 10.2, st.lights ? '#FFE1A6' : '#E9E5DA', st.lights ? PAL.lamp : '#C9C4B6', { hl: 0, ns: 1 })]);
    lamps.push([-24, ly, box(-24.1, ly + 0.3, 1.5, 3.4, 6.4, 10, '#B9483A', '#9C3B30', { hl: 0, ns: 1 })]);
  }
  for (const [x, y, s] of lamps) if (!near(x, y + 2)) sl.push(s);
  sl.push(rbox(-23, -11, 46, 22, 5, 10.5, 14, body, bodySide, {
    ns: 1, det: g => { g.fillStyle = 'rgba(20,17,15,.1)'; g.fillRect(15.4, -8, 0.8, 16); }               // the bonnet line
  }));
  for (const [x, y, s] of lamps) if (near(x, y + 2)) sl.push(s);
  // upper body: the far side window, the panel, the cab glass, the near side window. Painted far to near for this heading.
  const win = y => box(-3.6, y, 10.2, 1.2, 14.8, 18.4, glass, glass, { hl: 0, ns: 1 });
  const panel = rbox(-22, -9.8, 28.8, 19.6, 4, 14, 19, body, bodySide, { hl: 0, ns: 1 });
  const cab = rbox(4.8, -9.5, 9.8, 19, 2.6, 14, 18.6, '#24343B', glass, {
    hl: 0, ns: 1, det: g => { g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.moveTo(10.6, -9.5); g.lineTo(12.4, -9.5); g.lineTo(11.2, -2); g.lineTo(9.4, -2); g.fill(); }   // one hard glint on the screen
  });
  const upper = [[1.5, -9.8, win(-10.4)], [-7.6, 0, panel], [9.7, 0, cab], [1.5, 9.8, win(9.2)]];
  upper.sort((p, q) => (p[0] * sn + p[1] * cs) - (q[0] * sn + q[1] * cs));
  for (const u of upper) sl.push(u[2]);
  sl.push(rbox(-22.4, -10.6, 32.4, 21.2, 5, 19, 21.6, '#FBF9F3', '#E2DED1', {
    det: g => { g.fillStyle = 'rgba(20,17,15,.08)'; g.fillRect(-22.4, -1, 32.4, 0.8); g.fillRect(-9, -10.6, 0.8, 21.2); }
  }));
  const rk = PAL.rack, rks = '#9BA2A7';
  for (const rx of [-18, -6, 6]) sl.push(box(rx, -9, 1.5, 18, 21.6, 23, rk, rks, { hl: 0, ns: 1 }));
  sl.push(box(-20, -9.3, 28.5, 1.5, 21.6, 23.4, rk, rks, { hl: 0, ns: 1 }));
  sl.push(box(-20, 7.8, 28.5, 1.5, 21.6, 23.4, rk, rks, { hl: 0, ns: 1 }));
  if (st.ladder) {
    const lc = '#E8A91C', ls = '#B57F0C';
    for (let i = 0; i < 7; i++) sl.push(box(-19 + i * 4.2, -8.6, 1.3, 6.8, 23.4, 24.4, lc, ls, { hl: 0, ns: 1 }));
    sl.push(box(-21, -9.2, 30, 1.5, 23.4, 25.2, lc, ls, { hl: 0, ns: 1 }));
    sl.push(box(-21, -3, 30, 1.5, 23.4, 25.2, lc, ls, { hl: 0, ns: 1 }));
  }
  if (st.loaf) {
    sl.push(rbox(-19, 0.2, 13.5, 8.6, 4, 23.4, 27.4, '#C98030', '#9E5D1E', { hl: 0, ns: 1 }));
    sl.push(rbox(-17.6, 1.4, 10.7, 6.2, 3, 27.4, 29.6, '#D48C3A', '#B26D25', {
      ns: 1, hl: 0, det: g => { g.strokeStyle = '#7A4414'; g.lineWidth = 0.9; for (const x of [-15, -12, -9]) { g.beginPath(); g.moveTo(x, 6.4); g.lineTo(x + 2.2, 2.6); g.stroke(); } }
    }));
  }
  if (st.cam) {
    sl.push(box(-4.5, 0.4, 9.5, 7.6, 23.4, 29.4, '#33383D', '#1C1F22', { hl: 0, ns: 1, det: g => { g.fillStyle = PAL.pink; g.fillRect(-3.4, 1.4, 2, 2); } }));
    sl.push(cyl(7.2, 4.2, 2.7, 24.4, 28.8, '#4A5157', '#101214', { hl: 0, ns: 1 }));
  }
  return bake(grow(sl, VAN_K), { rot: a, sres: 1, grain: 0 });
}
// a lit headlight seen from outside: a hard disc and its ring, no blur
export function headlight() {
  return flat(8, 8, 4, 4, g => {
    g.fillStyle = PAL.lamp; g.beginPath(); g.arc(4, 4, 3.4, 0, 6.2832); g.fill();
    g.fillStyle = '#FFE1A6'; g.beginPath(); g.arc(4, 4, 2.4, 0, 6.2832); g.fill();
  }, 0);
}

// ---------- paper ----------
// Ten kinds, off-white and grey only: 0-3 the letter sheets of the first slice (2 is the tick-box form), then
// 4 a till receipt, 5 a window envelope, 6 an invoice, 7 a carbon copy, 8 a month grid, 9 a small note.
// Each is { c, w, h, sh }: its picture, its size in units, and its flat shadow (the same outline).
export function sheetSprites() {
  const out = [], EDGE = 'rgba(150,163,176,.85)';
  const add = (w, h, draw, outline) => {
    const f = flat(w, h, w / 2, h / 2, draw, 0.5);
    f.w = w; f.h = h; f.sh = flat(w, h, w / 2, h / 2, g => { g.fillStyle = 'rgba(112,128,146,.5)'; if (outline) { g.beginPath(); outline(g); g.fill(); } else g.fillRect(0, 0, w, h); }, 0).c;
    out.push(f);
  };
  const base = (g, w, h, col = PAL.sheet, edge = EDGE, ink = PAL.scribble) => { g.fillStyle = col; g.fillRect(0, 0, w, h); g.strokeStyle = edge; g.lineWidth = 0.8; g.strokeRect(0.4, 0.4, w - 0.8, h - 0.8); g.strokeStyle = ink; g.lineCap = 'round'; g.lineJoin = 'round'; };
  const scr = (g, x0, x1, y, lw = 1.5) => { g.lineWidth = lw; g.beginPath(); g.moveTo(x0, y); for (let x = x0 + 2; x <= x1; x += 2) g.lineTo(x, y + ((x / 2 | 0) % 2 ? -0.9 : 0.9)); g.stroke(); };
  const bar = (g, x0, x1, y, lw) => { g.lineWidth = lw; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); };
  for (let v = 0; v < 4; v++) add(34, 44, g => {
    base(g, 34, 44);
    if (v === 0) { scr(g, 5, 29, 11); scr(g, 5, 29, 21); scr(g, 5, 20, 31); }
    else if (v === 1) { bar(g, 5, 21, 8.5, 3.4); scr(g, 5, 29, 17, 1.2); scr(g, 5, 29, 23.5, 1.2); scr(g, 5, 29, 30, 1.2); scr(g, 5, 16, 36.5, 1.2); }
    else if (v === 2) { // a form with tick-boxes
      g.lineWidth = 1; for (const y of [8, 18, 28]) { g.strokeRect(5, y, 5.4, 5.4); scr(g, 14, 29, y + 2.9, 1.2); }
      g.strokeStyle = PAL.ink; g.lineWidth = 1.4; g.beginPath(); g.moveTo(5.8, 20.6); g.lineTo(7.6, 22.6); g.lineTo(10.8, 17.4); g.stroke();
      g.strokeStyle = PAL.scribble; scr(g, 5, 22, 39, 1.2);
    } else { scr(g, 5, 18, 8, 1.2); scr(g, 5, 29, 16, 1.2); scr(g, 5, 29, 22, 1.2); scr(g, 5, 29, 28, 1.2); g.lineWidth = 1.2; g.strokeRect(18, 33, 11, 6.4); }
  });
  // 4 a till receipt, 16 x 58: torn off in a zig-zag, six short lines, the last one the total
  const torn = g => { g.moveTo(0.4, 0.4); g.lineTo(15.6, 0.4); g.lineTo(15.6, 54.5); for (let i = 0; i < 4; i++) { g.lineTo(13.7 - i * 3.8, 57.6); g.lineTo(11.8 - i * 3.8, 54.5); } g.closePath(); };
  add(16, 58, g => {
    g.fillStyle = PAL.sheet; g.beginPath(); torn(g); g.fill(); g.strokeStyle = EDGE; g.lineWidth = 0.8; g.stroke();
    g.strokeStyle = PAL.scribble; g.lineCap = 'round';
    bar(g, 4, 12, 6.5, 2.6); for (const y of [14, 20, 26, 32]) { bar(g, 3.4, 8.4, y, 1.1); bar(g, 10.6, 12.8, y, 1.1); }
    g.setLineDash([1.2, 1.4]); bar(g, 3, 13, 38.5, 0.7); g.setLineDash([]);
    g.strokeStyle = '#8795A3'; bar(g, 3.4, 6.4, 44.5, 1.3); bar(g, 9, 12.8, 44.5, 2.2);
  }, torn);
  // 5 a window envelope, 52 x 28: the flap's V, the grey window
  add(52, 28, g => {
    base(g, 52, 28);
    g.lineWidth = 0.9; g.beginPath(); g.moveTo(0.8, 0.8); g.lineTo(26, 14.5); g.lineTo(51.2, 0.8); g.stroke();
    g.fillStyle = '#D9E0E7'; g.beginPath(); rr(g, 6, 15.5, 19, 8, 1.6); g.fill(); g.lineWidth = 0.8; g.stroke();
    bar(g, 9, 21, 18.3, 0.9); bar(g, 9, 17, 20.8, 0.9);
  });
  // 6 an invoice: a heading, a four-row ruled table, one bold total bar
  add(34, 44, g => {
    base(g, 34, 44);
    bar(g, 5, 17, 6.5, 2.8); bar(g, 23, 29, 6, 1);
    g.lineWidth = 0.8; g.strokeRect(5, 11.5, 24, 19);
    for (const y of [16.2, 21, 25.8]) bar(g, 5, 29, y, 0.7);
    g.lineWidth = 0.7; g.beginPath(); g.moveTo(21.5, 11.5); g.lineTo(21.5, 30.5); g.stroke();
    for (const y of [13.9, 18.6, 23.4, 28.2]) { bar(g, 7, 15 + (y * 7 % 4), y, 0.9); bar(g, 24, 27, y, 0.9); }
    g.fillStyle = '#8795A3'; g.fillRect(17, 34, 12, 4.4);
  });
  // 7 a carbon copy: the same letter, in the desk's own shade
  add(34, 44, g => {
    base(g, 34, 44, PAL.deskShade, 'rgba(128,142,158,.9)', '#9AA8B6');
    scr(g, 5, 22, 8, 1.2); scr(g, 5, 29, 16, 1.2); scr(g, 5, 29, 22, 1.2); scr(g, 5, 29, 28, 1.2); scr(g, 5, 14, 35, 1.2);
    g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(0.8, 0.8, 32.4, 3);
  });
  // 8 a month torn off a calendar, 30 x 30: a header band, a grid of days, one day shaded
  add(30, 30, g => {
    base(g, 30, 30);
    g.fillStyle = '#C5D0DA'; g.fillRect(0.8, 0.8, 28.4, 6); g.fillStyle = '#FBFCFD'; for (const x of [8, 22]) { g.beginPath(); g.arc(x, 3.8, 1.2, 0, 6.2832); g.fill(); }
    g.lineCap = 'butt'; g.lineWidth = 0.6; for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(i * 5, 8.4); g.lineTo(i * 5, 28); g.stroke(); }
    for (const y of [13.3, 18.2, 23.1]) bar(g, 1.6, 28.4, y, 0.6);
    g.fillStyle = '#DCE3EA'; g.fillRect(15.4, 13.7, 4.2, 4.1);
  });
  // 9 a small note, 24 x 30: three lines in a hurry
  add(24, 30, g => { base(g, 24, 30); scr(g, 4, 19, 8, 1.3); scr(g, 4, 19, 15, 1.3); scr(g, 4, 13, 22, 1.3); });
  return { v: out };
}
// gold feature card: 54 x 34, ink keyline, one stencil word (baked after fonts load)
export function cardSprite(word) {
  return bake([rbox(-27, -17, 54, 34, 3, 0, 1.8, PAL.gold, PAL.goldDeep, {
    hl: 0, det: g => {
      g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(-27, -17, 54, 9);
      g.lineWidth = 3; g.strokeStyle = PAL.ink; g.beginPath(); rr(g, -27, -17, 54, 34, 3); g.stroke();
      let fs = 19; g.font = `900 ${fs}px ${STENCIL}`; const w = g.measureText(word).width, sp = word.indexOf(' ');
      g.fillStyle = PAL.ink; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      if (w > 44 && sp > 0) {                                 // two words that will not fit on one line: one above the other, both the same size
        const a = word.slice(0, sp), b = word.slice(sp + 1); fs = 14;
        g.font = `900 ${fs}px ${STENCIL}`; const m = Math.max(g.measureText(a).width, g.measureText(b).width);
        if (m > 45) { fs *= 45 / m; g.font = `900 ${fs}px ${STENCIL}`; }
        g.fillText(a, 0, -0.6); g.fillText(b, 0, fs * 0.8 + 0.6); return;
      }
      if (w > 44) { fs *= 44 / w; g.font = `900 ${fs}px ${STENCIL}`; }
      g.fillText(word, 0, fs * 0.36);
    }
  })]);
}
export function cardBack() {
  return bake([rbox(-27, -17, 54, 34, 3, 0, 1.8, '#C99A16', PAL.goldDeep, {
    hl: 0, det: g => {
      g.lineWidth = 3; g.strokeStyle = PAL.ink; g.beginPath(); rr(g, -27, -17, 54, 34, 3); g.stroke();
      g.strokeStyle = 'rgba(20,17,15,.3)'; g.lineWidth = 1; g.strokeRect(-21, -11, 42, 22);
    }
  })]);
}

// ---------- phones ----------
// Upright phone: body, dark screen well. The screen picture is drawn per frame, then the overlay goes on top.
export function phoneFace(w, h, r, sz) {
  return face(-w / 2 - 4.5, 0, w + 9, h + 10, PAL.ink, {
    r: r + 4, sz, sd: 6, det: (g, x, y, W, H) => {
      g.fillStyle = '#34302C'; g.fillRect(x + W - 2.6, y, 2.6, H);
      g.fillStyle = '#26221F'; g.fillRect(x, y + H - 2.2, W, 2.2);
      g.fillStyle = '#07090A'; g.beginPath(); rr(g, -w / 2, y + 5, w, h, r); g.fill();
    }
  });
}
// the strip of gold tape across the top of the first-ad phone: its words, a play triangle, the length. Origin = its middle.
export function phoneTape(tape) {
  const m = mk(4, 4).getContext('2d'); m.font = `700 16px ${HAND}`;
  const a = tape.text.toUpperCase(), wa = m.measureText(a).width, wb = m.measureText(tape.len).width, tw = wa + 9 + 10 + 7 + wb, W = tw + 26 + 18, H = 52;
  return flat(W, H, W / 2, H / 2, g => {
    const done = drawTape(g, W / 2, H / 2, tw + 26, 29, -2.6, PAL.gold, 1.5);
    g.font = `700 16px ${HAND}`; g.fillStyle = PAL.ink; g.textBaseline = 'middle'; g.textAlign = 'left';
    let x = -tw / 2; g.fillText(a, x, 1.2); x += wa + 9; tri(g, x, 0.4, 10.5); x += 10 + 7; g.fillText(tape.len, x, 1.2);
    done();
  }, 0);
}
// a drawn play mark for when a loop cannot autoplay (iPhone Low Power Mode)
export function playMark() {
  return flat(52, 52, 26, 26, g => {
    g.fillStyle = 'rgba(20,17,15,.72)'; g.beginPath(); g.arc(26, 26, 24, 0, 6.2832); g.fill();
    g.strokeStyle = '#F4F1E8'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#F4F1E8'; tri(g, 18.5, 26, 19);
  }, 0);
}
// a sleeping screen's play triangle: flat tape pink, no disc
export function playTri(s, color) {
  return flat(s + 4, s + 4, s / 2 + 2, s / 2 + 2, g => { g.fillStyle = color; g.beginPath(); g.moveTo(2 + s * 0.14, 2); g.lineTo(2 + s * 0.98, 2 + s / 2); g.lineTo(2 + s * 0.14, 2 + s); g.closePath(); g.fill(); }, 0);
}
// the light a sleeping phone throws on the dark mat: two hard-edged steps centred on its foot, nothing on the hub
export function pinkSteps(x, y) {
  return flat(160, 104, 80, 52, g => {
    g.fillStyle = rgba(PAL.pink, 0.16);
    g.beginPath(); g.ellipse(80, 52, 75, 48, 0, 0, 6.2832); g.fill();
    g.beginPath(); g.ellipse(80, 52, 48, 30, 0, 0, 6.2832); g.fill();
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.beginPath(); g.arc(80 - x, 52 - y, 163, 0, 6.2832); g.fill();
  }, 0);
}
// the first-ad phone: face 135 x 240, leaning on two cardboard file boxes
export function giantPhone() {
  const T = '#CFB488', T2 = '#D8BF95', S1 = '#B29263', S2 = '#A5865A';
  const flute = (g, x, y, w, h) => { g.fillStyle = 'rgba(20,17,15,.06)'; for (let i = 2.5; i < w; i += 4.5) g.fillRect(x + i, y, 1, h); };
  const bodyFront = (g, x, y, w, h) => {
    flute(g, x, y, w, h);
    g.fillStyle = 'rgba(20,17,15,.55)'; g.beginPath(); rr(g, x + 5, y + 13, 17, 6.5, 3.2); g.fill();                 // hand hole
    g.fillStyle = '#FBFCFD'; g.fillRect(x + 4, y + 30, 20, 14); g.strokeStyle = 'rgba(20,17,15,.5)'; g.lineWidth = 0.8; g.strokeRect(x + 4, y + 30, 20, 14);
    g.fillStyle = PAL.scribble; g.fillRect(x + 7, y + 34, 13, 1.5); g.fillRect(x + 7, y + 38.5, 9, 1.5);
  };
  const lidFront = (g, x, y, w, h) => { flute(g, x, y, w, h); g.fillStyle = 'rgba(20,17,15,.3)'; g.fillRect(x + 1.5, y + h - 1.8, w - 3, 1.8); };
  const lidTop = (cx, cy) => g => {
    g.fillStyle = 'rgba(20,17,15,.12)'; g.fillRect(cx - 60, cy - 0.6, 120, 1.2);
    g.fillStyle = rgba(PAL.masking, 0.95); g.fillRect(cx - 7, cy - 40, 14, 80); g.strokeStyle = 'rgba(20,17,15,.3)'; g.lineWidth = 0.8; g.strokeRect(cx - 7, cy - 40, 14, 80);
  };
  return bake([
    box(-100, -72, 90, 62, 0, 116, T, S2, { front: bodyFront }),
    box(-102, -74, 94, 66, 116, 150, T2, S1, { front: lidFront, det: lidTop(-55, -41) }),
    box(-8, -66, 90, 60, 0, 108, T, S2, { front: bodyFront }),
    box(-10, -68, 94, 64, 108, 142, T2, S1, { front: lidFront, det: lidTop(37, -36) }),
    phoneFace(135, 240, 13, 150)
  ]);
}
// skit phone: face 84 x 150, a small kickstand block behind it
export function skitPhone() {
  return bake([
    box(-11, -17, 22, 13, 0, 64, '#262B2E', '#181B1D', { hl: 0 }),
    phoneFace(84, 150, 10, 90)
  ]);
}

// ---------- kitchen ----------
// a leaf: pointed at both ends, w wide in the middle, from (x0,y0) to (x1,y1)
export function leaf(g, x0, y0, x1, y1, w) {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, l = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / l * w, ny = (x1 - x0) / l * w;
  g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(mx + nx, my + ny, x1, y1); g.quadraticCurveTo(mx - nx, my - ny, x0, y0); g.closePath();
}
export const mixHex = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), x = p(a), y = p(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
// the loaf on its rack (the clamp lamp over it is its own sprite, lampSprite)
export function loafSprite(baked) {
  const st = PAL.steel, sd = '#6E7679', sl = [];
  for (const [x, y] of [[-63, -40], [60, -40], [-63, 37], [60, 37]]) sl.push(box(x, y, 3, 3, 0, 9, sd, sd, { hl: 0 }));
  for (let i = 0; i < 12; i++) sl.push(box(-57.5 + i * 10.4, -41, 1.4, 82, 9, 10.4, st, sd, { hl: 0 }));
  sl.push(box(-65, -42, 130, 2.6, 9, 11.4, '#AEB6B9', sd, { hl: 0 })); sl.push(box(-65, 39.4, 130, 2.6, 9, 11.4, '#AEB6B9', sd, { hl: 0 }));
  sl.push(box(-65, -42, 2.6, 84, 9, 11.4, '#AEB6B9', sd, { hl: 0 })); sl.push(box(62.4, -42, 2.6, 84, 9, 11.4, '#AEB6B9', sd, { hl: 0 }));
  // the loaf: 16 thin slabs with one wall colour, so it is a dome and not a stack
  const wall = baked ? '#9A5A1E' : '#D8C7A0', foot = baked ? '#8C511A' : '#CFBD94', crown = baked ? '#D9943F' : '#F2E8D0';
  const cuts = [-27, -3, 21];
  const score = g => {
    for (const x of cuts) {
      if (baked) {
        g.fillStyle = '#6F3D12'; leaf(g, x - 8, 14, x + 9, -14, 7); g.fill();                        // the cut, opened in the oven
        g.fillStyle = '#F0D9A6'; leaf(g, x - 5.4, 10.5, x + 7, -11, 3.6); g.fill();                  // its cream floor
        g.strokeStyle = '#E8B25A'; g.lineWidth = 1.7; g.lineCap = 'round';                           // the ear, raised along the upper-left lip
        g.beginPath(); g.moveTo(x - 7.4, 12.6); g.quadraticCurveTo(x - 3.6, -3.4, x + 8.2, -13.2); g.stroke();
      } else { g.fillStyle = '#C9B58B'; leaf(g, x - 7, 13, x + 8, -13, 3); g.fill(); }
    }
    if (baked) { const r = mulberry32(5); g.fillStyle = 'rgba(247,243,234,.62)'; for (let i = 0; i < 40; i++) g.fillRect(-36 + r() * 72, -21 + r() * 16, 1, 1); }   // flour dust, the top third only
  };
  const N = 16;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), e = 1 - Math.pow(t, 2.2) * 0.3 - (i === N - 1 ? 0.02 : 0), w = 118 * e, d = 70 * e;
    const z0 = 11.4 + 34.6 * (1 - Math.pow(1 - i / N, 1.7)), z1 = 11.4 + 34.6 * (1 - Math.pow(1 - (i + 1) / N, 1.7));
    sl.push(rbox(-w / 2, -d / 2, w, d, d * 0.49, z0, z1, mixHex(wall, crown, Math.pow(t, 1.4)), i < 2 ? foot : wall, { hl: 0, ns: i ? 1 : 0, det: i === N - 1 ? score : null }));
  }
  return bake(sl);
}
// The clamp lamp: a tall post at the rack's back-left corner, an arm, and a steel cone shade hung high over the loaf, so
// on screen it floats clear above the bread and never sits on it. Three stacked discs make the cone; under its front
// lip the lit inside shows warm, with the bulb. No black anywhere on it. Origin = the loaf's centre.
export function lampSprite() {
  const st = PAL.steel, sd = '#6E7679', cx = -34, cy = -26, up = 150 * HK;
  const inside = g => {
    g.fillStyle = PAL.lamp; g.beginPath(); g.ellipse(cx, cy - up + 17, 17.5, 10, 0, 0, 6.2832); g.fill();
    g.fillStyle = '#FFE1A6'; g.beginPath(); g.ellipse(cx, cy - up + 23, 6, 2.6, 0, 0, 6.2832); g.fill();
  };
  return bake([
    box(-67, -44, 3.4, 3.4, 0, 166, st, sd, { hl: 0 }),                                               // the post
    box(-69.5, -46.5, 8.4, 8.4, 0, 5, '#7C8588', '#5C6467', { hl: 0 }),                               // its clamp
    decal(inside),
    cyl(cx, cy, 20, 150, 153, '#7F888B', sd, { ns: 1 }),                                              // the lip
    cyl(cx, cy, 14, 153, 160, '#8C9598', '#7A8386', { ns: 1 }),
    poly([[-66.2, -40.6], [-64.4, -43.4], [cx + 0.9, cy - 1.4], [cx - 0.9, cy + 1.4]], 160, 164, '#AEB6B9', sd, { hl: 0, ns: 1 }),   // the arm
    cyl(cx, cy, 8, 160, 166, st, '#848D90', { ns: 1, det: g => { g.fillStyle = '#C9CED2'; g.beginPath(); g.arc(cx, cy, 3.5, 0, 6.2832); g.fill(); } })
  ]);
}
// the pool of warm lamp light: one hard-edged ellipse and a hot spot. Origin = the loaf's centre.
// a decal: drawn last, over the finished slabs, in the prop's own coordinates (the screen, not the plan)
export const decal = fn => ({ path: () => { }, b: [0, 0, 0, 0], z0: 0, z1: 0, top: 'rgba(0,0,0,0)', side: null, hl: 0, ns: 1, front: g => fn(g) });
// flour sack, 112 x 72, tall: it hides the cake. Four slabs so it bulges: foot, belly, shoulder, and a rolled fold stitched shut.
export function sackSprite() {
  const T = '#F1ECDD', S = '#DCD3BE', print = 'rgba(64,74,92,.72)';
  const front = g => {
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(20,17,15,.05)';                                  // two hard creases where the cloth hangs
    g.beginPath(); g.moveTo(-41, -19); g.lineTo(-33, -19); g.lineTo(-37, 30); g.lineTo(-44, 30); g.fill();
    g.beginPath(); g.moveTo(35, -19); g.lineTo(41, -19); g.lineTo(45, 30); g.lineTo(38, 30); g.fill();
    g.fillStyle = 'rgba(20,17,15,.06)'; g.fillRect(-58, 15, 116, 20);    // weight: the lowest part of the front is darker
    g.globalCompositeOperation = 'source-over';
    // the print, no words: a wheat ear in a ring, one band above and one below
    g.fillStyle = print; g.fillRect(-50, -17.6, 100, 3); g.fillRect(-50, 24.2, 100, 3);
    g.strokeStyle = print; g.lineWidth = 2.4; g.beginPath(); g.arc(0, 5, 16, 0, 6.2832); g.stroke();
    g.fillRect(-1, -4, 2, 20);
    for (let i = 0; i < 5; i++) for (const sd of [-1, 1]) {
      g.save(); g.translate(sd * 3.1, 13 - i * 3.9); g.rotate(sd * 0.61); leaf(g, 0, 3.5, 0, -3.5, 3.2); g.fill(); g.restore();
    }
    leaf(g, 0, -4, 0, -10.4, 3.2); g.fill();
  };
  const stitch = g => {
    g.strokeStyle = 'rgba(20,17,15,.3)'; g.lineWidth = 1.1; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(-38, 0.5); g.lineTo(38, 0.5); g.stroke(); g.setLineDash([]);
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-40, -8.6, 80, 2.2);
  };
  return bake([
    rbox(-52, -33, 104, 66, 20, 0, 14, T, '#D0C6AF', { hl: 0 }),
    rbox(-56, -36, 112, 72, 24, 14, 92, T, S, { hl: 0 }),
    rbox(-50, -31, 100, 62, 22, 92, 118, '#F5F1E4', S, { hl: 0 }),
    poly([[28, 5], [31, 3], [46, 12], [44, 15]], 118, 120.4, '#B58A52', '#8E6A3A', { hl: 0, ns: 1 }),   // the twine's loose end
    rbox(-43, -10, 86, 20, 8, 118, 128, '#E3DAC5', '#CFC5AD', { hl: 0, det: stitch }),
    cyl(40, 0, 3.4, 128, 130, '#B58A52', '#8E6A3A', { hl: 0, ns: 1 }),                                    // the knot
    decal(front)
  ]);
}
// one cake on a plate: 48 round. cut = a slice is out
export function cakeSprite(cut) {
  const a0 = 0.55, a1 = 1.45;                                   // the missing wedge faces the viewer, lower right
  const pth = r => g => { if (cut) { g.moveTo(0, 0); g.arc(0, 0, r, a1, a0 + 6.2832); g.closePath(); } else { g.moveTo(r, 0); g.arc(0, 0, r, 0, 6.2832); } };
  const lay = (r, z0, z1, top, side, o) => ({ path: pth(r), b: [-r, -r, r, r], z0, z1, top, side, ...o });
  const dots = g => {
    g.fillStyle = '#F3DDB4';
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; if (cut && a > a0 - 0.1 && a < a1 + 0.1) continue; g.beginPath(); g.arc(Math.cos(a) * 15.5, Math.sin(a) * 15.5, 2.9, 0, 6.2832); g.fill(); }
    g.fillStyle = '#B9483A'; g.beginPath(); g.arc(-2, -3, 3.4, 0, 6.2832); g.fill();
    g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(-3.4, -4.8, 1.5, 1.5);
  };
  return bake([
    cyl(0, 0, 27, 0, 2.2, '#FBFCFD', '#C5D0DA'),
    cyl(0, 0, 9, 2.2, 5, '#E4EAEE', '#C5D0DA', { hl: 0, ns: 1 }),
    cyl(0, 0, 25, 5, 7, '#FBFCFD', '#CBD5DD', { ns: 1 }),
    lay(21, 7, 13.5, '#E3B671', '#D9A85E', { hl: 0 }),
    lay(21, 13.5, 16, '#FFF6E3', '#FBEFD6', { hl: 0, ns: 1 }),
    lay(21, 16, 22.5, '#E3B671', '#D9A85E', { hl: 0, ns: 1 }),
    lay(21.6, 22.5, 26.5, '#FFF8EA', '#F6E8CB', { det: dots, ns: 1 })
  ]);
}
export function sliceSprite() {
  const a0 = 0.6, a1 = 1.4, lay = (r, z0, z1, top, side, o) => ({ path: g => { g.moveTo(0, 0); g.arc(0, 0, r, a0, a1); g.closePath(); }, b: [-r, -r, r, r], z0, z1, top, side, ...o });
  return bake([
    lay(21, 0, 6.5, '#E3B671', '#D9A85E', { hl: 0 }), lay(21, 6.5, 9, '#FFF6E3', '#FBEFD6', { hl: 0, ns: 1 }),
    lay(21, 9, 15.5, '#E3B671', '#D9A85E', { hl: 0, ns: 1 }), lay(21.6, 15.5, 19.5, '#FFF8EA', '#F6E8CB', { ns: 1 })
  ]);
}
// a clear dome: an outline, a faint fill, two highlight arcs and a knob
export function domeSprite() {
  const R = 25, H = 26;            // base radius (units), dome rise (px)
  return flat(64, 76, 32, 60, g => {
    g.translate(32, 60 - 4.2);
    const p = () => { g.beginPath(); g.moveTo(-R, 0); g.bezierCurveTo(-R, -H * 1.5, R, -H * 1.5, R, 0); g.ellipse(0, 0, R, R * 0.62, 0, 0, Math.PI); g.closePath(); };
    p(); g.fillStyle = 'rgba(235,244,250,.2)'; g.fill();
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.3; g.stroke();
    g.beginPath(); g.ellipse(0, 0, R, R * 0.62, 0, Math.PI, 6.2832); g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 1; g.stroke();
    g.lineCap = 'round'; g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 2.6;
    g.beginPath(); g.moveTo(-17.5, -6); g.quadraticCurveTo(-16.5, -21, -6, -26.5); g.stroke();
    g.lineWidth = 1.7; g.beginPath(); g.moveTo(-11.5, -5); g.quadraticCurveTo(-10.5, -14, -5, -18); g.stroke();
    g.fillStyle = '#E4EAEE'; g.beginPath(); g.arc(0, -H * 1.13 - 2.5, 3.6, 0, 6.2832); g.fill(); g.strokeStyle = 'rgba(20,17,15,.35)'; g.lineWidth = 0.8; g.stroke();
  }, 0);
}

// ---------- home: a cardboard box on its side, flaps open, a warm bulb inside ----------
export function garageSprite() {
  const T = '#CDB286', S = '#A98B5D', D = '#96794E';
  const mouth = (g, x, y, w, h) => {
    g.fillStyle = '#6B5335'; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + 15, y + h - 13); g.lineTo(x + w - 15, y + h - 13); g.lineTo(x + w, y + h); g.fill();   // floor
    g.fillStyle = '#4A3823'; g.fillRect(x + 15, y, w - 30, h - 13);                                                                                             // back wall
    g.fillStyle = 'rgba(20,17,15,.2)'; for (let i = 4; i < h - 13; i += 5) g.fillRect(x + 15, y + i, w - 30, 1);                                                // its flutes
    g.fillStyle = rgba(PAL.lamp, 0.26); g.beginPath(); g.ellipse(x + w / 2, y + 22, 42, 30, 0, 0, 6.2832); g.fill();
    g.fillStyle = rgba(PAL.lamp, 0.34); g.beginPath(); g.ellipse(x + w / 2, y + 22, 23, 17, 0, 0, 6.2832); g.fill();
    g.strokeStyle = '#1B1611'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + 18); g.stroke();
    g.fillStyle = '#FFE9BC'; g.beginPath(); g.arc(x + w / 2, y + 22.5, 5, 0, 6.2832); g.fill();
    g.fillStyle = '#8A9396'; g.fillRect(x + w / 2 - 2, y + 15.5, 4, 3.4);
  };
  const roof = g => {
    g.fillStyle = 'rgba(20,17,15,.1)'; g.fillRect(-60, -0.6, 120, 1.2);
    g.fillStyle = rgba(PAL.masking, 0.95); g.fillRect(-60, 8, 120, 22); g.strokeStyle = 'rgba(20,17,15,.28)'; g.lineWidth = 0.8; g.strokeRect(-61, 8, 122, 22);
    // a house, drawn on the tape in marker: no word
    g.strokeStyle = PAL.ink; g.lineWidth = 1.9; g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-9.5, 19); g.lineTo(0, 11); g.lineTo(9.5, 19); g.moveTo(-6.5, 17.5); g.lineTo(-6.5, 27); g.lineTo(6.5, 27); g.lineTo(6.5, 17.5); g.moveTo(-1.6, 27); g.lineTo(-1.6, 21.8); g.lineTo(1.9, 21.8); g.lineTo(1.9, 27); g.stroke();
    g.fillStyle = 'rgba(20,17,15,.07)'; for (let i = -57; i < 60; i += 4.5) g.fillRect(i, 43.2, 1, 2);
  };
  const flute = (g, x, y, w, h) => { g.fillStyle = 'rgba(20,17,15,.07)'; for (let i = 1; i < h; i += 4) g.fillRect(x, y + i, w, 1); };
  return bake([
    box(-60, -45, 120, 90, 0, 1.5, '#8F744B', D, { hl: 0 }),
    poly([[-60, 45], [-58, 45], [-80, 70], [-82, 70]], 0, 98, T, S, { hl: 0 }),                     // left flap, swung open
    poly([[58, 45], [60, 45], [82, 70], [80, 70]], 0, 98, T, D, { hl: 0 }),                          // right flap
    box(-60, -45, 120, 4, 0, 100, T, S, { hl: 0, ns: 1 }),
    box(-60, -45, 4, 90, 0, 100, T, S, { hl: 0, front: flute }),
    box(56, -45, 4, 90, 0, 100, T, S, { hl: 0, front: flute }),
    face(-56, 45, 112, 60, '#3B2C1B', { det: mouth }),
    box(-60, -45, 120, 90, 100, 102.5, T, S, { det: roof }),
    box(-59, 45, 118, 8, 101, 102.5, '#D6BC92', D, { hl: 0, ns: 1 })                                  // top flap held out like a short awning
  ]);
}
// the bulb's light spilling out of the garage mouth: two hard steps
export function bulbSteps() {
  return flat(84, 56, 42, 28, g => {
    g.fillStyle = rgba(PAL.lamp, 0.2); g.beginPath(); g.ellipse(42, 28, 40, 26, 0, 0, 6.2832); g.fill();
    g.fillStyle = rgba(PAL.lamp, 0.24); g.beginPath(); g.ellipse(42, 28, 24, 15, 0, 0, 6.2832); g.fill();
  }, 0);
}

// ---------- dressing ----------
// dull = its track has nothing found yet: saturated tape colour on screen always means "found" (spec 8.2)
export function tapeRoll(color, dull) {
  if (dull) { const [r, g, b] = hex(color), l = Math.round(r * 0.3 + g * 0.59 + b * 0.11), m = v => Math.round(v + (l - v) * 0.45).toString(16).padStart(2, '0'); color = '#' + m(r) + m(g) + m(b); }
  return bake([
    ring(0, 0, 13, 7.4, 0, 9, shade(color, 12), shade(color, -16), { eo: 1, hl: 0 }),
    ring(0, 0, 8.8, 7.4, 0, 9.4, '#D9C9A6', '#B8A67F', { eo: 1, hl: 0, ns: 1 })
  ]);
}
export function pencilSprite(a) {
  return bake([
    box(-24, -1.8, 38, 3.6, 0, 3, '#D8B98A', '#B4935F', { hl: 0 }), box(14, -1.8, 4, 3.6, 0, 3, PAL.steel, '#6E7679', { hl: 0 }),
    box(18, -1.8, 5, 3.6, 0, 3, '#B9483A', '#93382D', { hl: 0 }), poly([[-24, -1.8], [-24, 1.8], [-30, 0]], 0, 2.4, '#E7D2A8', '#C9B080', { hl: 0 }),
    poly([[-28.4, -0.9], [-28.4, 0.9], [-31, 0]], 0, 2, PAL.ink, PAL.ink, { hl: 0 })
  ], { rot: a });
}
export function scraperSprite(a) {
  return bake([
    box(-24, -14, 48, 26, 0, 1.4, '#B8C0C3', '#7E8689', { det: g => { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-24, 8, 48, 1.6); } }),
    rbox(-25, -19, 50, 9, 3, 0, 8, '#B8743B', '#8F5426', { det: g => { g.fillStyle = PAL.steel; for (const x of [-15, 0, 15]) { g.beginPath(); g.arc(x, -14.5, 1.5, 0, 6.2832); g.fill(); } } })
  ], { rot: a });
}
export function clapperSprite(a) {
  const stripes = g => { g.fillStyle = '#F4F1E8'; for (let i = -30; i < 30; i += 11) { g.beginPath(); g.moveTo(i, -19); g.lineTo(i + 5.5, -19); g.lineTo(i + 1.5, -12); g.lineTo(i - 4, -12); g.fill(); } };
  return bake([
    box(-23, -12, 46, 30, 0, 3, '#2A2E31', '#17191B', { det: g => { g.strokeStyle = 'rgba(244,241,232,.55)'; g.lineWidth = 0.9; for (const y of [-4, 4, 11]) { g.beginPath(); g.moveTo(-19, y); g.lineTo(19, y); g.stroke(); } g.beginPath(); g.moveTo(-4, -4); g.lineTo(-4, 11); g.stroke(); } }),
    box(-23, -19, 46, 7, 0, 4.5, '#17191B', '#0D0E0F', { det: stripes, hl: 0 })
  ], { rot: a });
}
export function sdCard(a) {
  return bake([poly([[-5, -6.5], [2.6, -6.5], [5, -4], [5, 6.5], [-5, 6.5]], 0, 1.4, '#2E4470', '#1C2B49', { det: g => { g.fillStyle = '#E9E5DA'; g.fillRect(-3.4, -1.5, 6.8, 5.6); g.fillStyle = '#C9A44A'; for (let i = 0; i < 4; i++) g.fillRect(-3.6 + i * 1.7, -5.6, 1, 2.6); } })], { rot: a });
}
export function cableSprite() {
  const path = g => { g.moveTo(-38, 6); g.bezierCurveTo(-16, -22, -8, 24, 14, 2); g.bezierCurveTo(24, -8, 34, -4, 40, -12); };
  return flat(90, 56, 45, 28, g => {
    g.translate(45, 28); g.lineCap = 'round';
    g.strokeStyle = '#0A0B0C'; g.lineWidth = 4.2; g.beginPath(); path(g); g.stroke();
    g.strokeStyle = '#3A4046'; g.lineWidth = 2.4; g.beginPath(); path(g); g.stroke();
    g.fillStyle = '#9AA3A6'; g.fillRect(38, -15.5, 6, 5);
  }, 0.6);
}
export function crumbs() {
  const r = mulberry32(31);
  return flat(120, 60, 60, 30, g => { for (let i = 0; i < 34; i++) { g.fillStyle = r() > 0.5 ? '#B8702A' : '#D7913E'; const x = 60 + (r() - 0.5) * 110 * r(), y = 30 + (r() - 0.5) * 50 * r(); g.fillRect(x, y, 1 + r() * 2, 1 + r() * 1.6); } }, 0);
}

// ---------- particles ----------
export function puffSprite(color) { return glow(color, 14, 0.85, 0.25); }
// thrown flour: a hard-edged disc with a shaded crescent on its lower right, so it shows on white. Its shadow is a
// second sprite, because the disc hops and the shadow stays on the ground.
export function flourDisc() {
  return flat(26, 26, 13, 13, g => {
    g.fillStyle = PAL.flourShade; g.beginPath(); g.arc(13, 13, 13, 0, 6.2832); g.fill();
    g.fillStyle = '#FFFDF8'; g.beginPath(); g.arc(11.4, 11.4, 10.6, 0, 6.2832); g.fill();
  }, 0);
}
export function flourShadow() {
  return flat(26, 26, 13, 13, g => { g.fillStyle = 'rgba(20,17,15,.2)'; g.beginPath(); g.arc(13, 13, 13, 0, 6.2832); g.fill(); }, 0);
}
export function bitSprite() { return flat(8, 6, 4, 3, g => { g.fillStyle = PAL.sheet; g.fillRect(0, 0, 8, 6); g.strokeStyle = 'rgba(150,163,176,.8)'; g.lineWidth = 0.6; g.strokeRect(0.3, 0.3, 7.4, 5.4); }, 0); }
