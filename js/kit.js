// kit.js — what every table's module builds with: the sprite shelf, the prop registry (bucketed on the 256-unit
// grid, spec 9.6), the squash list, and the screens that show a poster and then a muted 4 s loop (spec 6.3).
import { S, PAL, MEDIA, gridAdd, addCollider } from './world.js';
import * as art from './art.js';

export const spr = {};                       // shared sprites
export const flats = [];                     // flat things under the van: cards, paper props, dressing
export const lit = [];                       // lit circles on the mat: [x, y, r]
export const pgrid = new Map(), fgrid = new Map();   // standing props and flat things, by the cell of their anchor
export const MARGIN = 260;                   // no sprite reaches further than this from its anchor: a frame asks for its view grown by this much

// A prop is bucketed once, by its anchor. One that moves stays findable as long as
// it keeps within 150 units of where it was added; its collider is told apart with roam: true.
export function prop(o) {
  const p = Object.assign({ x: 0, y: 0, sp: null, sortY: 0, alpha: 1, tall: null, onMat: false, dark: null, find: null, squash: 0, draw: null, coll: null, flat: false, roam: false }, o);
  if (p.coll) { const c = p.coll; c.prop = p; addCollider(c, p.roam); p.cx = c.t === 'c' ? c.x : (c.x0 + c.x1) / 2; p.cy = c.t === 'c' ? c.y : (c.y0 + c.y1) / 2; }
  if (p.flat) { flats.push(p); gridAdd(fgrid, p.x, p.y, p); } else { S.props.push(p); gridAdd(pgrid, p.x, p.y, p); }
  return p;
}
export const cbox = (x0, y0, x1, y1) => ({ t: 'b', x0, y0, x1, y1 });
export const ccirc = (x, y, r) => ({ t: 'c', x, y, r });

// a bumped thing squashes for 90 ms: only the ones that are squashing are stepped
const squashing = [];
export function squash(p) { if (!(p.squash > 0)) squashing.push(p); p.squash = 1; }
export function tickSquash(rdt) {
  for (let i = squashing.length - 1; i >= 0; i--) { const p = squashing[i]; p.squash = Math.max(0, p.squash - rdt / 0.09); if (!p.squash) squashing.splice(i, 1); }
}

// ---------- loops: a poster, then the 4 s muted loop copied to a small canvas at up to 30 fps ----------
// lazy: the poster is not asked for until the screen is on, or nearly on, the visitor's screen (tickScreens)
// w x h: the size of its copied frame in pixels: what its screen is on a phone at two pixels a unit (the giant phone 270 x 480)
export function makeLoop(name, lazy, w = 270, h = 480) {
  const L = { name, img: null, v: null, c: null, g: null, ready: false, refused: false, last: 0, on: false, w, h };
  if (!lazy) loadPoster(L);
  return L;
}
function loadPoster(L) { L.img = new Image(); L.img.decoding = 'async'; L.img.src = MEDIA + L.name + '.jpg'; }
export function startLoop(L) {
  if (!L.v) {
    const v = L.v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.src = MEDIA + L.name + '-loop.mp4';
  }
  if (!L.c) { L.c = art.mk(L.w, L.h); L.g = L.c.getContext('2d'); }
  const p = L.v.play(); if (p && p.catch) p.then(() => { L.refused = false; }, () => { L.refused = true; });
}
export function grab(L) {
  const v = L.v; if (!v || v.readyState < 2 || v.paused) return;
  if (S.rt - L.last < 0.032) return;
  L.last = S.rt; L.g.drawImage(v, 0, 0, L.w, L.h); L.ready = true;
}
export function drawScreen(ctx, L, x, y, w, h) {
  if (L.ready) ctx.drawImage(L.c, x, y, w, h);
  else if (L.img && L.img.complete && L.img.naturalWidth) ctx.drawImage(L.img, x, y, w, h);
  if (L.refused && !L.ready) art.drawSpr(ctx, spr.play, x + w / 2, y + h / 2);
}
// the hard pink edge of a skit phone (84 x 150) standing at (x, y): one stroke, no sprite to hold
export function skitRim(ctx, x, y, lw) { ctx.lineWidth = lw; ctx.strokeStyle = PAL.pink; ctx.beginPath(); art.rr(ctx, x - 47.6, y - 161.1, 95.2, 162.2, 15); ctx.stroke(); }
// a small play mark low on a found screen: it plays with sound when tapped
export function playSmall(ctx, x, y) { ctx.drawImage(spr.play.c, x - 12, y - 12, 24, 24); }
// A standing phone's body (screen w x h, corner r; x, y = the middle of its foot): ink, a lit edge down its right side
// and along its foot, the dark well the screen sits in. Four fills, no canvas held (its shadow is baked: a ghost slab).
export function phoneBody(ctx, x, y, w, h, r) {
  const X = x - w / 2 - 4.5, Y = y - (h + 10), W = w + 9, H = h + 10, q = r + 4;
  ctx.fillStyle = PAL.ink; ctx.beginPath(); art.rr(ctx, X, Y, W, H, q); ctx.fill();
  ctx.fillStyle = '#34302C'; ctx.fillRect(X + W - 2.6, Y + q * 0.6, 2.6, H - q * 1.2);
  ctx.fillStyle = '#26221F'; ctx.fillRect(X + q * 0.6, Y + H - 2.2, W - q * 1.2, 2.2);
  ctx.fillStyle = '#07090A'; ctx.beginPath(); art.rr(ctx, x - w / 2, Y + 5, w, h, r); ctx.fill();
}
// The glass over a phone's screen (w x h, corner r; x, y = the middle of the phone's foot): two hard bands of glare,
// and the four corners outside the rounded screen painted back to phone body. Three fills, no canvas held.
export function glass(ctx, x, y, w, h, r) {
  const sx = x - w / 2, sy = y - (h + 5), ex = sx + w, ey = sy + h;
  ctx.fillStyle = 'rgba(255,255,255,.075)';
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + w * 0.48, sy); ctx.lineTo(sx, sy + h * 0.5); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(sx + w * 0.64, sy); ctx.lineTo(sx + w * 0.8, sy); ctx.lineTo(sx, sy + h * 0.84); ctx.lineTo(sx, sy + h * 0.66); ctx.closePath(); ctx.fill();
  ctx.fillStyle = PAL.ink; ctx.beginPath();
  ctx.moveTo(sx, sy); ctx.lineTo(sx + r, sy); ctx.arc(sx + r, sy + r, r, -1.5708, 3.1416, true); ctx.closePath();
  ctx.moveTo(ex, sy); ctx.lineTo(ex, sy + r); ctx.arc(ex - r, sy + r, r, 0, -1.5708, true); ctx.closePath();
  ctx.moveTo(ex, ey); ctx.lineTo(ex - r, ey); ctx.arc(ex - r, ey - r, r, 1.5708, 0, true); ctx.closePath();
  ctx.moveTo(sx, ey); ctx.lineTo(sx, ey - r); ctx.arc(sx + r, ey - r, r, 3.1416, 1.5708, true); ctx.closePath();
  ctx.fill();
}
// light lying on a table: two hard-edged steps, each an ellipse [dx, dy, rx, ry, alpha] from (x, y)
export function steps(ctx, x, y, col, a, b) {
  const al = ctx.globalAlpha; ctx.fillStyle = col;
  for (const q of [a, b]) { ctx.globalAlpha = al * q[4]; ctx.beginPath(); ctx.ellipse(x + q[0], y + q[1], q[2], q[3], 0, 0, 6.2832); ctx.fill(); }
  ctx.globalAlpha = al;
}
export const NOSPR = { c: art.mk(1, 1), ox: 0, oy: 0, s: null, bb: [0, 0, 0, 0] };      // for a prop that draws itself and holds no sprite
export const loops = {};
export function pauseLoops() { for (const k in loops) { const v = loops[k].v; if (v && !v.paused) v.pause(); } }
export function resumeLoops() { for (const k in loops) { const L = loops[k]; if (L.v && L.on) startLoop(L); } }

// Which screens are decoding: at most two at once, the two nearest the van that are on screen (spec 6.3). A screen's
// poster is first asked for when the screen itself is in view or, once the visitor has touched, within most of a
// screen of the view (spec 9.7): so before the first touch a phone asks only for what its opening frame shows, and a
// wide desktop frame, which shows the easel too, has its drawing on the board from the start.
// rect: the screen's world rect · wants(): whether it should be moving at all (a sleeping skit phone should not)
const screens = [];
export function addScreen(id, L, f, rect, wants) { loops[id] = L; screens.push({ L, f, rect, wants: wants || (() => true), d: 0, vis: false }); return L; }
// r = a world rect [x0, y0, x1, y1]: is it in view, or near enough to it that its picture should be fetched now?
export function nearView(r) {
  const v = S.vr, mx = S.firstInput ? (v[2] - v[0]) * 0.75 : 0, my = S.firstInput ? (v[3] - v[1]) * 0.5 : 0;
  return r[2] >= v[0] - mx && r[0] <= v[2] + mx && r[3] >= v[1] - my && r[1] <= v[3] + my;
}
let scrT = 0;
export function tickScreens(rdt, van) {
  scrT -= rdt; if (scrT > 0) return; scrT = 0.2;
  const v = S.vr; if (v[2] <= v[0]) return;                 // nothing has been drawn yet
  let a = null, b = null;
  for (const s of screens) {
    const r = s.rect, d = s.d = Math.hypot(s.f.x - van.x, s.f.y - van.y);
    if (!s.L.img && nearView(r)) loadPoster(s.L);
    s.vis = !!s.L.img && s.wants() && r[2] >= v[0] && r[0] <= v[2] && r[3] >= v[1] && r[1] <= v[3];
    if (!s.vis) continue;
    if (!a || d < a.d) { b = a; a = s; } else if (!b || d < b.d) b = s;
  }
  for (const s of screens) {
    const on = s === a || s === b, L = s.L;
    if (on && !L.on) { L.on = true; startLoop(L); }
    else if (!on && L.on) { L.on = false; if (L.v && !L.v.paused) L.v.pause(); }
    if (!on && !s.vis && L.c) { L.c.width = L.c.height = 0; L.c = L.g = null; L.ready = false; }     // off screen: its copied frame is let go (the poster stands in until it moves again)
  }
}
