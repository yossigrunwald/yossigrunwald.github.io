// howart.js — the explainers' picture kit and the five scenes (stage 5). Flat shapes in the game's own look, drawn in
// code on a stage of 320 x 200 units. One picture language for all five: a dot or a parcel is a piece of work, a box
// is an agent or a step, a tick is a pass, a cross is a fail, a padlock is a rule written in code, a hand is his
// decision. No word is written here: the few words lettered inside a picture come from the find's own markup
// (data-w) and are baked into small sprites once, when a sheet opens. A step is a pure function of the seconds into
// it (t, 0 to 2.4): nothing is remembered between frames, and nothing is allocated in one.
import { STENCIL, HAND, mk } from './art.js';

export const W = 320, H = 200, BG = '#1E2427', DUR = 2.4;
const TAU = 6.2832, PI = 3.1416;
const INK = '#14110F', BONE = '#F4F1E8', GREY = '#8E969B', MID = '#6B757B', DIM = '#39424A', DIM2 = '#2B343A', STEEL = '#AEB6BC', STEEL2 = '#9AA3A6', LOCKC = '#C9CED2',
  PAPER = '#E6D7AE', CARD = '#C9A877', CARD2 = '#A5865A', GREEN = '#43C7A2', RED = '#E0604F', GOLD = '#F2B411', AMBER = '#FFC46B', WHITE = '#FFFFFF', WOOD = '#C8935A', WOOD2 = '#96683A',
  DARK = '#3A4046', RUB = '#0F1417', GLASS = '#12171A', FILM = '#2A3137', STAMP = '#7A2E28', STAMPED = '#12A37C', SH = 'rgba(0,0,0,.35)';
const DASH = [3, 5], DASH2 = [4, 4], DASH3 = [2.2, 2.2], NOD = [];
let g = null, SC = 1, A = 1, T = 0, LAP = 0, FLAT = false;
const WS = {}, HL = {};

// ---------- time inside a step ----------
const cl = v => v < 0 ? 0 : v > 1 ? 1 : v;
const mv = (t, a, b) => cl((t - a) / (b - a));                       // progress between two moments, clamped
const mix = (a, b, u) => a + (b - a) * u;
const io = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;    // anything travelling
const out = u => 1 - Math.pow(1 - u, 3);                             // arrivals
const inq = u => u * u;                                              // drops
const back = u => { const v = u - 1; return 1 + 2.6 * v * v * v + 1.6 * v * v; };   // pops, snaps, stamps
const bnc = u => u < 0.72 ? inq(u / 0.72) : 1 - Math.sin((u - 0.72) / 0.28 * PI) * 0.1;      // landings: one small rebound
const wob = u => u <= 0 || u >= 1 ? 0 : Math.sin(6 * PI * u) * (1 - u);      // a shake that dies out
const pop = (age, d = 0.2) => age < 0 ? 0 : back(cl(age / d));       // the size of a thing that popped `age` seconds ago
const hop = (t, at, h = 3, d = 0.24) => t < at || t > at + d ? 0 : -Math.sin((t - at) / d * PI) * h;
const sqz = (t, at, d = 0.14) => t < at || t > at + d ? 0 : Math.sin((t - at) / d * PI) * 0.12;      // squash on landing
const bob = (ph = 0) => Math.sin((T + ph) * 7.54) * 2;               // a waiting thing: 2 units at 1.2 Hz
const qp = (a, c, b, u) => (1 - u) * (1 - u) * a + 2 * u * (1 - u) * c + u * u * b;      // a point on a curve from a over c to b

// ---------- the kit: made when a sheet opens, let go when it closes ----------
// Lettering: key -> [face (0 stencil, 1 hand), size in stage units (stencil: cap height; hand: type size), colour]
const WSPEC = { live: [0, 21, INK, 1.5], tomorrow: [0, 11, INK], ai: [0, 18, INK], code: [0, 12, INK], zzz: [1, 14, BONE], lessons: [0, 9.5, INK], why: [0, 10, INK], flags: [1, 12, BONE], wording: [0, 8.8, BONE], facts: [0, 8.8, BONE] };
const K = {
  T: 0, lap: 0,
  begin() { T = K.T; LAP = K.lap; A = 1; FLAT = false; g.globalAlpha = 1; g.lineWidth = 1.5; g.strokeStyle = INK; g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash(NOD); }
};
function bakeWord(key, txt, face, size, col, sp = 0) {      // sp: more room between its letters, in stage units (where the canvas can)
  const fs = (face ? size : size / 0.7) * SC, font = (face ? '700 ' : '900 ') + fs.toFixed(1) + 'px ' + (face ? HAND : STENCIL), m = mk(4, 4).getContext('2d');
  m.font = font; if (sp && 'letterSpacing' in m) m.letterSpacing = (sp * SC).toFixed(1) + 'px'; const w = Math.ceil(m.measureText(txt).width) + 6, h = Math.ceil(fs * 1.3), c = mk(w, h), x = c.getContext('2d');
  x.font = font; if (sp && 'letterSpacing' in x) x.letterSpacing = (sp * SC).toFixed(1) + 'px'; x.fillStyle = col; x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.fillText(txt, w / 2, h * 0.5 + fs * (face ? 0.27 : 0.35));
  WS[key] = { c, w: w / SC, h: h / SC };
}
function bakeHalo(key, r, gg, b) {
  const c = mk(64, 64), x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 3, 32, 32, 32), rgb = r + ',' + gg + ',' + b;
  gr.addColorStop(0, 'rgba(' + rgb + ',1)'); gr.addColorStop(0.45, 'rgba(' + rgb + ',.5)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); HL[key] = c;
}
export function makeKit(ctx, words, scale) {
  dropKit(); g = ctx; SC = scale;
  for (const k in words) {
    const sp = WSPEC[k]; if (!sp || !words[k]) continue;
    if (k === 'flags') words[k].split(/,\s*/).forEach((w, n) => bakeWord(k + n, w, sp[0], sp[1], sp[2]));      // the five months: one sprite each
    else bakeWord(k, words[k], sp[0], sp[1], sp[2], sp[3]);
  }
  bakeHalo('w', 255, 255, 255); bakeHalo('g', 67, 199, 162); bakeHalo('r', 224, 96, 79); bakeHalo('a', 255, 196, 107);
  return K;
}
export function dropKit() { for (const k in WS) { WS[k].c.width = WS[k].c.height = 0; delete WS[k]; } for (const k in HL) { HL[k].width = HL[k].height = 0; delete HL[k]; } g = null; }
export function sprites() { const o = []; for (const k in WS) o.push(WS[k].c); for (const k in HL) o.push(HL[k]); return o; }

// ---------- primitives ----------
const al = a => { A = a; g.globalAlpha = a; };
function tf(x, y, s = 1, r = 0, sy = s) { g.save(); g.translate(x, y); if (r) g.rotate(r); if (s !== 1 || sy !== 1) g.scale(s, sy); }
const un = () => g.restore();
function rrp(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
// a solid thing (5.8): hard shadow 2 right and 2.5 down, flat fill, 1.5 ink keyline. x, y: its centre
function box(x, y, w, h, r, col, flat) { x -= w / 2; y -= h / 2; if (!flat && !FLAT) { g.fillStyle = SH; rrp(x + 2, y + 2.5, w, h, r); g.fill(); } g.fillStyle = col; rrp(x, y, w, h, r); g.fill(); g.stroke(); }
function disc(x, y, r, col, flat) { if (!flat && !FLAT) { g.fillStyle = SH; g.beginPath(); g.arc(x + 2, y + 2.5, r, 0, TAU); g.fill(); } g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke(); }
// a shape of its own: path(dx, dy, a, b, c, d) lays the outline down, shifted by dx, dy
function solid(path, col, a, b, c, d) { if (!FLAT) { g.fillStyle = SH; path(2, 2.5, a, b, c, d); g.fill(); } g.fillStyle = col; path(0, 0, a, b, c, d); g.fill(); g.stroke(); }
const fr = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };            // a plain block, from its top left
function ln(x1, y1, x2, y2, col = INK, w = 1.5) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.strokeStyle = INK; g.lineWidth = 1.5; }
function ring(x, y, r, col, w = 1.5, a = 1) { g.globalAlpha = A * a; g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.strokeStyle = INK; g.lineWidth = 1.5; g.globalAlpha = A; }
// a dotted line: a link, or (in a still) where something went. u: how much of it is drawn
function dl(x1, y1, x2, y2, u = 1, a = 0.45) { if (u <= 0) return; g.globalAlpha = A * a; g.strokeStyle = BONE; g.setLineDash(DASH); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 + (x2 - x1) * u, y1 + (y2 - y1) * u); g.stroke(); g.setLineDash(NOD); g.strokeStyle = INK; g.globalAlpha = A; }
function dq(x1, y1, cx, cy, x2, y2, u = 1, a = 0.45) { if (u <= 0) return; g.globalAlpha = A * a; g.strokeStyle = BONE; g.setLineDash(DASH); g.beginPath(); g.moveTo(x1, y1); g.quadraticCurveTo(x1 + (cx - x1) * u, y1 + (cy - y1) * u, qp(x1, cx, x2, u), qp(y1, cy, y2, u)); g.stroke(); g.setLineDash(NOD); g.strokeStyle = INK; g.globalAlpha = A; }
function word(w, x, y, a = 1, s = 1) { if (!w) return; g.globalAlpha = A * a; g.drawImage(w.c, x - w.w * s / 2, y - w.h * s / 2, w.w * s, w.h * s); g.globalAlpha = A; }
function halo(x, y, r, key, a) { if (a <= 0) return; g.globalAlpha = A * a; g.drawImage(HL[key], x - r, y - r, r * 2, r * 2); g.globalAlpha = A; }
// short rays round a point: a pop. n 3: a fan above it (a tick's own three); more: all the way round
function rays(x, y, r, n, a, col = BONE, len = 4) {
  if (a <= 0) return; g.globalAlpha = A * a; g.strokeStyle = col; g.lineWidth = 1.6; g.beginPath();
  for (let k = 0; k < n; k++) { const an = n > 3 ? k * TAU / n - 1.2 : -PI / 2 + (k - 1) * 0.7, c = Math.cos(an), s = Math.sin(an); g.moveTo(x + c * r, y + s * r); g.lineTo(x + c * (r + len), y + s * (r + len)); }
  g.stroke(); g.strokeStyle = INK; g.lineWidth = 1.5; g.globalAlpha = A;
}

// ---------- the signs ----------
const dot = (x, y, r = 5, col = BONE) => disc(x, y, r, col);         // a piece of work, before it is a parcel
function mark(x, y, s, col, w, tickNotCross) {
  g.beginPath();
  if (tickNotCross) { g.moveTo(x - 6 * s, y + 0.4 * s); g.lineTo(x - 1.8 * s, y + 4.6 * s); g.lineTo(x + 6 * s, y - 4.8 * s); } else { g.moveTo(x - 5 * s, y - 5 * s); g.lineTo(x + 5 * s, y + 5 * s); g.moveTo(x + 5 * s, y - 5 * s); g.lineTo(x - 5 * s, y + 5 * s); }
  g.strokeStyle = INK; g.lineWidth = w + 2.4; g.stroke(); g.strokeStyle = col; g.lineWidth = w; g.stroke(); g.strokeStyle = INK; g.lineWidth = 1.5;
}
// a tick: a pass. It popped `age` seconds ago (under 0: not there yet), with three short rays that fade in a quarter second
function tk(age, x, y, s = 1) { if (age < 0) return; mark(x, y, s * pop(age), GREEN, 3.2 * Math.min(1, s + 0.2), 1); if (age < 0.28) rays(x, y - 2, 9 * s + age * 26, 3, 1 - age / 0.28, GREEN); }
// a cross: a fail
function xs(age, x, y, s = 1, a = 1) { if (age < 0 || a <= 0) return; g.globalAlpha = A * a; mark(x, y, s * pop(age), RED, 3.2 * Math.min(1, s + 0.2), 0); g.globalAlpha = A; }
// a tick as a sticker on a thing: a green disc with a white tick
function stick(age, x, y, r = 5) { if (age < 0) return; const s = pop(age); disc(x, y, r * s, GREEN, 1); g.beginPath(); g.moveTo(x - r * 0.5 * s, y + r * 0.05 * s); g.lineTo(x - r * 0.12 * s, y + r * 0.42 * s); g.lineTo(x + r * 0.52 * s, y - r * 0.4 * s); g.strokeStyle = WHITE; g.lineWidth = 1.8; g.stroke(); g.strokeStyle = INK; g.lineWidth = 1.5; if (age < 0.25) rays(x, y - 1, r + 2 + age * 24, 3, 1 - age / 0.25, GREEN, 3); }
// a parcel: a piece of work. x, y: the middle of its top. big: the large one, with a warning stripe across one corner
function parcel(x, y, big, sx = 1, sy = sx, rot = 0) {
  const w = big ? 32 : 22, h = big ? 23 : 16, f = h / 2 + 5;
  g.save(); g.translate(x, y + f); if (rot) g.rotate(rot); if (sx !== 1 || sy !== 1) g.scale(sx, sy); g.translate(0, -f);      // it squashes and leans on its foot
  if (!FLAT) { g.fillStyle = SH; rrp(-w / 2 + 2, -h / 2 + 2.5, w, h + 5, 2); g.fill(); }
  g.fillStyle = CARD2; rrp(-w / 2, -h / 2, w, h + 5, 2); g.fill(); g.stroke();
  g.fillStyle = CARD; rrp(-w / 2, -h / 2, w, h, 2); g.fill(); g.stroke();
  fr(-2, -h / 2 + 0.8, 4, h + 3.4, PAPER);                           // the strip of masking tape across it
  if (big) { g.fillStyle = GOLD; g.beginPath(); g.moveTo(w / 2 - 15, -h / 2 + 0.8); g.lineTo(w / 2 - 0.8, -h / 2 + 0.8); g.lineTo(w / 2 - 0.8, -h / 2 + 15); g.closePath(); g.fill(); g.lineWidth = 2.6; g.beginPath(); g.moveTo(w / 2 - 9.5, -h / 2 + 1.6); g.lineTo(w / 2 - 1.6, -h / 2 + 9.5); g.stroke(); g.lineWidth = 1.5; g.beginPath(); g.moveTo(w / 2 - 15, -h / 2 + 0.8); g.lineTo(w / 2 - 0.8, -h / 2 + 15); g.stroke(); }
  g.restore();
}
// a square of masking tape slapped on: the fix
function patch(x, y, s = 1) { tf(x, y, s, 0.3); g.lineWidth = 1.2; box(0, 0, 9, 9, 1, PAPER, 1); g.lineWidth = 1.5; un(); }
// a pictogram, in ink, about 16 units across
function pic(k, x, y, s = 1, col = INK) {
  tf(x, y, s); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 1.7; g.beginPath();
  switch (k) {
    case 1: g.rect(-5, -7, 10, 14); g.moveTo(-2.4, -3.2); g.lineTo(2.4, -3.2); g.moveTo(-2.4, 0); g.lineTo(2.4, 0); g.moveTo(-2.4, 3.2); g.lineTo(0.4, 3.2); break;      // an invoice
    case 2: g.moveTo(-2.5, -7.5); g.arcTo(4, -7.5, 4, 7.5, 2); g.arcTo(4, 7.5, -4, 7.5, 2); g.arcTo(-4, 7.5, -4, -7.5, 2); g.arcTo(-4, -7.5, 4, -7.5, 2); g.closePath(); g.moveTo(-0.9, 4.6); g.lineTo(0.9, 4.6); break;      // a phone
    case 3: g.rect(-7, -6, 14, 12); g.moveTo(-7, -2.4); g.lineTo(7, -2.4); g.moveTo(-4, 1.2); g.lineTo(1, 1.2); g.moveTo(-4, 3.8); g.lineTo(4, 3.8); break;      // a page of a site
    case 4: g.arc(-4.5, 0, 3.4, 0, TAU); g.moveTo(-1.1, 0); g.lineTo(8, 0); g.moveTo(4.6, 0); g.lineTo(4.6, 3.4); g.moveTo(8, 0); g.lineTo(8, 3.4); break;      // a key
    case 5: g.moveTo(-2.5, -4.5); g.lineTo(6, -4.5); g.moveTo(-2.5, 0); g.lineTo(6, 0); g.moveTo(-2.5, 4.5); g.lineTo(3, 4.5); g.moveTo(-6, -4.5); g.lineTo(-5.9, -4.5); g.moveTo(-6, 0); g.lineTo(-5.9, 0); g.moveTo(-6, 4.5); g.lineTo(-5.9, 4.5); break;      // a plan: three lines, a dot before each
    case 6: g.moveTo(-6, 6); g.lineTo(-4.6, 1.8); g.lineTo(3.4, -6.2); g.lineTo(6.2, -3.4); g.lineTo(-1.8, 4.6); g.closePath(); g.moveTo(1.4, -4.2); g.lineTo(4.2, -1.4); break;      // a pencil
    case 7: g.moveTo(-3, -5); g.lineTo(-7.5, 0); g.lineTo(-3, 5); g.moveTo(3, -5); g.lineTo(7.5, 0); g.lineTo(3, 5); break;      // code brackets
    case 8: g.rect(-8, -3.2, 16, 6.4); g.moveTo(-4.5, -3.2); g.lineTo(-4.5, -0.4); g.moveTo(-1.5, -3.2); g.lineTo(-1.5, 0.8); g.moveTo(1.5, -3.2); g.lineTo(1.5, -0.4); g.moveTo(4.5, -3.2); g.lineTo(4.5, 0.8); break;      // a ruler
    case 9: g.moveTo(-4, -7); g.lineTo(-4, 5); g.lineTo(-0.8, 2.2); g.lineTo(1.6, 7); g.lineTo(3.8, 5.9); g.lineTo(1.5, 1.3); g.lineTo(5.6, 1); g.closePath(); break;      // a pointer
    case 10: g.arc(0, -1, 5.6, -2.5, 1.5); g.quadraticCurveTo(-1.6, 6, -3, 6.8); g.moveTo(2.6, -0.4); g.arc(0, -1, 2.6, 0.2, -2.6, true); break;      // an ear
    case 11: g.moveTo(-7.5, 0); g.quadraticCurveTo(0, -7, 7.5, 0); g.quadraticCurveTo(0, 7, -7.5, 0); g.moveTo(1.6, 0); g.arc(0, 0, 1.6, 0, TAU); break;      // an eye
    case 12: g.arc(0, 0, 3, 0, TAU); for (let n = 0; n < 6; n++) { const a = n * 1.0472, c = Math.cos(a), q = Math.sin(a); g.moveTo(c * 5, q * 5); g.lineTo(c * 7.2, q * 7.2); } break;      // a gear
    case 13: g.rect(-7, -5.5, 14, 11); g.moveTo(-7, -2.6); g.lineTo(7, -2.6); g.moveTo(-7, 2.6); g.lineTo(7, 2.6); g.moveTo(-3.5, -5.5); g.lineTo(-3.5, -2.6); g.moveTo(0, -5.5); g.lineTo(0, -2.6); g.moveTo(3.5, -5.5); g.lineTo(3.5, -2.6); g.moveTo(-3.5, 2.6); g.lineTo(-3.5, 5.5); g.moveTo(0, 2.6); g.lineTo(0, 5.5); g.moveTo(3.5, 2.6); g.lineTo(3.5, 5.5); break;      // a film frame
    case 14: g.moveTo(-3.4, -3.2); g.quadraticCurveTo(-3.2, -7.2, 0.4, -7.2); g.quadraticCurveTo(4, -7.2, 4, -3.8); g.quadraticCurveTo(4, -1.4, 0.6, 0.2); g.lineTo(0.6, 2.4); g.moveTo(0.6, 6.2); g.lineTo(0.7, 6.2); break;      // a question hook
    default: break;
  }
  g.stroke(); un(); g.strokeStyle = INK; g.lineWidth = 1.5;
}
// a box: an agent or a step. Idle grey, lit bone, one pictogram inside
function agent(x, y, w, h, lit, icon, s = 1, r = 0) { tf(x, y, s, r); box(0, 0, w, h, 6, lit ? BONE : GREY); if (icon) pic(icon, 0, 0, w > 46 ? 1.35 : w < 30 ? 0.8 : 1); un(); }
// a lamp: a state. 0 dark · 1 amber · 2 green · 3 red
function lamp(x, y, st, r = 6) { if (st) halo(x, y, r * 2.4, st === 1 ? 'a' : st === 2 ? 'g' : 'r', 0.5); g.lineWidth = 1.2; disc(x, y, r, st === 1 ? AMBER : st === 2 ? GREEN : st === 3 ? RED : DIM, 1); g.lineWidth = 1.5; }
// the belt: flow. A dark strip with hairlines and chevrons; off: how far it has run
function belt(x0, x1, off = 0, y = 120) {
  fr(x0, y, x1 - x0, 24, RUB); fr(x0, y - 2.2, x1 - x0, 1.3, DIM); fr(x0, y + 24.9, x1 - x0, 1.3, DIM);
  g.strokeStyle = DIM2; g.lineWidth = 2.6; g.beginPath();
  for (let x = x0 - 24 + ((off % 24) + 24) % 24; x < x1 - 5; x += 24) if (x > x0 + 5) { g.moveTo(x - 3.5, y + 6.5); g.lineTo(x + 3, y + 12); g.lineTo(x - 3.5, y + 17.5); }
  g.stroke(); g.strokeStyle = INK; g.lineWidth = 1.5;
}
// the hand: his decision. Gold and calm. pose 0 pointing (to the left: turn it with r) · 1 palm, held up: wait · 2 thumb up: yes
function hand(x, y, pose, s = 1, r = 0) {
  tf(x, y, s, r);
  if (pose === 0) { box(14, 1, 6, 13, 1.5, BONE); box(-7, -3, 17, 6.4, 3.2, GOLD); box(4, 1, 16, 15.5, 4.5, GOLD); box(2.5, -6.6, 10, 5.4, 2.7, GOLD); ln(-2.6, 2.6, 2, 2.6, INK, 1.3); ln(-2.6, 6, 2, 6, INK, 1.3); }
  else if (pose === 1) { box(0, 14, 13, 6, 1.5, BONE); for (let k = 0; k < 4; k++) box(-6.9 + k * 4.6, -8 + (k === 0 || k === 3 ? 1.6 : 0), 4.5, 14, 2.2, GOLD); tf(-10.6, 3, 1, -0.6); box(0, 0, 5.2, 11, 2.6, GOLD); un(); box(0, 5, 18.6, 16, 5, GOLD); }
  else { box(0, 14, 13, 6, 1.5, BONE); box(-5.6, -6.6, 7.2, 16, 3.6, GOLD); box(0.6, 5, 18.4, 15.5, 4.5, GOLD); ln(2, 1.6, 9.6, 1.6, INK, 1.3); ln(2, 5.4, 9.6, 5.4, INK, 1.3); ln(2, 9.2, 9.6, 9.2, INK, 1.3); }
  un();
}
// "me": a bust. Gold; grey while he is busy
function pBust(dx, dy) { g.beginPath(); g.moveTo(-11 + dx, 12 + dy); g.bezierCurveTo(-11 + dx, -3 + dy, 11 + dx, -3 + dy, 11 + dx, 12 + dy); g.closePath(); }
function me(x, y, grey, s = 1) { const c = grey ? GREY : GOLD; tf(x, y, s); solid(pBust, c); disc(0, -6, 6.5, c); un(); }
// a padlock: a rule written in code. open 0..1: the shackle swung up
function lock(x, y, open = 0, r = 0, s = 1, drop = 0) {
  tf(x, y, s, r);
  g.save(); g.translate(5.6, -6 - 3 * open + drop); g.rotate(0.61 * open); g.strokeStyle = INK; g.lineWidth = 5.4; g.beginPath(); g.moveTo(-11.2, 1); g.lineTo(-11.2, -3); g.arc(-5.6, -3, 5.6, PI, 0); g.lineTo(0, 1); g.stroke(); g.strokeStyle = STEEL2; g.lineWidth = 3; g.stroke(); g.restore(); g.lineWidth = 1.5; g.strokeStyle = INK;
  box(0, 1, 18, 14, 3, LOCKC); disc(0, -0.6, 2, INK, 1); ln(0, 0, 0, 4.4, INK, 2);
  un();
}
// a gate: a post, and a striped arm that hangs across the lane from the post's top. up: how far it is lifted (radians)
function gate(x, y0, y1, up) {
  box(x, (y0 + y1) / 2, 6, y1 - y0, 1.5, STEEL2);
  tf(x, y0, 1, -up); box(0, 22, 5.6, 46, 2, BONE); for (let k = 0; k < 4; k++) fr(-2.8, 7 + k * 10, 5.6, 4.6, INK); un();
  disc(x, y0, 3.6, DARK, 1);
}
// a tap ring (the game's own): it spreads and fades
function tapRing(x, y, u) { if (u <= 0 || u >= 1) return; ring(x, y, 5 + u * 13, BONE, 2, 1 - u); }
// in a still: a small chevron in the bottom right corner (empty in all 37 stills), there is more
export function more() { g.globalAlpha = 0.85; disc(304, 186, 9, GLASS, 1); g.strokeStyle = BONE; g.lineWidth = 2.2; g.beginPath(); g.moveTo(301.5, 181); g.lineTo(306.5, 186); g.lineTo(301.5, 191); g.stroke(); g.globalAlpha = 1; g.strokeStyle = INK; g.lineWidth = 1.5; }

// =====================================================================================================================
// team: agents overseeing agents (7 steps)
// =====================================================================================================================
function zone(x, y, w, h) { g.globalAlpha = A * 0.2; g.strokeStyle = BONE; g.setLineDash(DASH2); rrp(x - w / 2, y - h / 2, w, h, 9); g.stroke(); g.setLineDash(NOD); g.strokeStyle = INK; g.globalAlpha = A; }
// a review lamp: a hood on a stalk from the top edge, its pictogram, a small lamp on its corner, and under it the cone it scans with
function hood(x, lit, icon, st, cone, col = BONE, dip = 0) {
  if (cone > 0) { g.globalAlpha = A * 0.17 * cone; g.fillStyle = col; g.beginPath(); g.moveTo(x - 11, 66); g.lineTo(x + 11, 66); g.lineTo(x + 23, 120); g.lineTo(x - 23, 120); g.closePath(); g.fill(); g.globalAlpha = A; }
  ln(x, 0, x, 41 + dip, GREY, 2.2);
  box(x, 53 + dip, 34, 26, 5, lit ? BONE : GREY); pic(icon, x - 3, 54 + dip);
  lamp(x + 12.5, 44.5 + dip, st, 3.4);
}
function scan(x, u) { const v = u < 0.5 ? u * 2 : 2 - u * 2, y = 68 + v * 50, hw = 11 + v * 11; g.globalAlpha = A * 0.8; ln(x - hw, y, x + hw, y, BONE, 1.6); g.globalAlpha = A; }
// the row of test dots, and the hairline that ties it to the manager
function tdot(k, on, s = 1) { g.lineWidth = 1.2; disc(106 + 12 * k, 40, 3.2 * s, on ? GREEN : DIM, 1); g.lineWidth = 1.5; }
function pad(x, y, w, h, lit) { box(x + w / 2, y + h / 2, w, h, 3, lit ? GREEN : STEEL); g.globalAlpha = A * 0.35; g.lineWidth = 1.2; rrp(x + 3, y + 3, w - 6, h - 6, 1.5); g.stroke(); g.lineWidth = 1.5; g.globalAlpha = A; }

function team1(t, st) {
  const lit = t >= 0.35, s1 = 1 + 0.08 * Math.sin(mv(t, 0.35, 0.6) * PI), fall = inq(mv(t, 0.6, 1)), ride = io(mv(t, 2, 2.4)) * 34;
  belt(0, 320, ride);
  for (let k = 0; k < 3; k++) zone(64 + k * 96, 73, 80, 64);
  dot(160, 56, 4, t > 1.6 && t < 1.78 ? BONE : MID); dot(256, 56, 4, t > 1.74 && t < 1.92 ? BONE : MID);      // the other two have work of their own
  if (t < 0.6) dot(64, 56, 4, lit ? BONE : MID);
  agent(64, 78, 40, 34, lit, 1, s1); agent(160, 78, 40, 34, 0, 2); agent(256, 78, 40, 34, 0, 3);
  if (st) dl(64, 98, 64, 116);
  if (t >= 0.6 && t < 1) dot(64, 56 + fall * 72, 4 + fall, BONE);     // the dot drops to the belt
  else if (t >= 1) {                                                   // and opens into a parcel
    const q = sqz(t, 1), s = 0.4 + 0.6 * pop(t - 1, 0.26);
    parcel(64 + ride, 128, 0, s * (1 + q), s * (1 - q));
    rays(64, 126, 13 + (t - 1) * 30, 6, 1 - (t - 1) / 0.3);
  }
}
function team2(t, st) {
  // the small parcel is scanned by the first two lamps and takes a tick from each; it rides on past the third, which stays dim
  const sx = st ? 290 : t < 0.65 ? mix(30, 112, mv(t, 0.35, 0.65)) : t < 0.95 ? 112 : t < 1.2 ? mix(112, 182, mv(t, 0.95, 1.2)) : t < 1.5 ? 182 : mix(182, 352, mv(t, 1.5, 1.9));
  // the large one, with the warning stripe, does not stop until the third lamp: that one lights for it alone
  const bx = st ? 252 : mix(-24, 252, mv(t, 1.1, 1.95)), at3 = st || t >= 1.95, a1 = st ? 9 : t - 1.52, a2 = st ? 9 : t - 1.735, a3 = st ? 9 : t - 2.25;
  const s1 = t > 0.65 && t < 0.95, s2 = t > 1.2 && t < 1.5, b1 = !st && bx > 98 && bx < 128, b2 = !st && bx > 168 && bx < 198;
  belt(0, 320, t * 60);
  agent(30, 88, 40, 34, 1, 1);
  hood(112, 1, 7, t >= 0.95 || st ? 2 : 0, s1 || b1 ? 1 : 0); hood(182, 1, 8, t >= 1.5 || st ? 2 : 0, s2 || b2 ? 1 : 0);
  hood(252, at3, 9, a3 >= 0 ? 2 : 0, at3 ? 1 : 0, BONE, st ? 0 : -hop(t, 2, 3, 0.11) - hop(t, 2.12, 3, 0.11));
  if (s1) scan(112, (t - 0.65) / 0.3); if (s2) scan(182, (t - 1.2) / 0.3);
  if (st || t >= 0.3) { parcel(sx, 128, 0); stick(st ? 9 : t - 0.95, sx - 9, 121); stick(st ? 9 : t - 1.5, sx + 9, 121); }
  if (bx > -22) { parcel(bx, 126, 1); stick(a1, bx - 13, 116); stick(a2, bx - 1, 114); stick(a3, bx + 13, 116); }
}
function team3(t, st) {
  // out to the lamp and failed · back to its desk for a patch · out again and passed
  const x = st ? 112 : t < 0.7 ? mix(34, 112, mv(t, 0.35, 0.7)) : t < 1 ? 112 : t < 1.4 ? mix(112, 38, io(mv(t, 1, 1.4))) : t < 1.7 ? 38 : mix(38, 112, io(mv(t, 1.7, 2)));
  const fail = !st && t >= 0.95 && t < 2, pass = st || t >= 2.2, fixed = st || t >= 1.55;
  const rot = st ? 0 : t >= 0.95 && t < 1.25 ? wob((t - 0.95) / 0.3) * 0.18 : t >= 1.25 && t < 1.4 ? -0.1 * Math.sin(mv(t, 1, 1.4) * PI) : 0;
  belt(0, 320, x);
  agent(30, 88, 40, 34, 1, 1, st ? 1 : 1 + 0.08 * Math.sin(mv(t, 1.45, 1.7) * PI));
  hood(112, 1, 7, pass ? 2 : fail ? 3 : 0, (t > 0.7 && t < 1.1) || t > 2 || st ? 1 : 0, pass ? GREEN : fail ? RED : BONE); hood(182, 1, 8, 0, 0); hood(252, 0, 9, 0, 0);
  if (t > 0.7 && t < 0.95) scan(112, (t - 0.7) / 0.25); if (!st && t > 2 && t < 2.2) scan(112, (t - 2) / 0.2);
  if (st) { dq(100, 150, 70, 172, 44, 150, 1, 0.5); dq(44, 110, 72, 98, 98, 112, 1, 0.5); }      // the loop it made: back to the desk, and out again
  parcel(x, 128 + (st ? 0 : hop(t, 2.2, 4)), 0, 1, 1, rot);
  if (fixed) patch(x + 5.5, 127, st ? 1 : pop(t - 1.55));
  if (!fixed) xs(t - 0.95, x, 104, 1);
  stick(st ? 9 : t - 2.2, x - 9, 121);
}
function team4(t, st) {
  // a small parcel lights a short stretch of the test row; a large one lights the whole row
  const sx = st ? 186 : t < 1.15 ? mix(-14, 130, mv(t, 0.35, 0.65)) : mix(130, 186, io(mv(t, 1.15, 1.35))), bx = st ? 130 : mix(-26, 130, mv(t, 1.35, 1.6));
  const look = st || (t > 0.65 && t < 1.2) || t > 1.6;
  belt(0, 320, sx + Math.max(bx, -26));
  ln(92, 58, 102, 40, DIM, 1.3); ln(102, 40, 218, 40, DIM, 1.3);
  for (let k = 0; k < 10; k++) {
    const a = st ? 9 : t >= 1.75 ? t - 1.75 - k * 0.05 : k < 3 && t < 1.2 ? t - 0.85 - k * 0.1 : -1;
    tdot(k, a >= 0, a >= 0 && a < 0.16 ? 1 + 0.45 * Math.sin(a / 0.16 * PI) : 1);
  }
  if (st) { ln(101, 31, 135, 31, BONE, 1.3); ln(101, 31, 101, 34, BONE, 1.3); ln(135, 31, 135, 34, BONE, 1.3); }
  agent(64, 74, 52, 44, look, 4);
  if (t > 0.65 && t < 1.2) dl(84, 98, 118, 116, mv(t, 0.65, 0.85), 0.6); if (st || t > 1.6) dl(84, 98, 112, 112, st ? 1 : mv(t, 1.6, 1.75), 0.6);      // the manager's glance
  gate(214, 100, 148, 0);
  parcel(sx, 128, 0); stick(9, sx - 9, 121); stick(9, sx + 9, 121);
  if (bx > -24) { parcel(bx, 126, 1); stick(9, bx - 13, 116); stick(9, bx - 1, 114); stick(9, bx + 13, 116); }
}
function team5(t, st) {
  // one heavy run at a time: the others wait behind the padlock until the row has finished
  const u = st ? 0.5 : t < 0.35 ? -1 : t < 0.9 ? (t - 0.35) / 0.55 : t < 1.45 ? (t - 0.9) / 0.55 : 2, n = u < 0 ? 0 : u >= 2 ? 10 : Math.floor(u * 10) + 1;
  const done = !st && t >= 1.5, px = st ? 160 : mix(160, 188, io(mv(t, 1.5, 1.9)));
  const open = st ? 0 : t < 2.25 ? back(mv(t, 1.7, 1.9)) : 0, lift = st ? 0 : 11 * (io(mv(t, 1.7, 2)) - io(mv(t, 2.25, 2.36)));
  const adv = st ? 0 : io(mv(t, 2, 2.3)), ax = mix(84, 160, adv), cx = mix(48, 84, adv);
  belt(0, 320, px + ax);
  ln(92, 58, 102, 40, DIM, 1.3); ln(102, 40, 218, 40, DIM, 1.3);
  for (let k = 0; k < 10; k++) { const on = done ? t < 1.95 : k < n, f = done ? t - 1.5 : -1; tdot(k, on, f >= 0 && f < 0.2 ? 1 + 0.45 * Math.sin(f / 0.2 * PI) : 1); }
  agent(64, 74, 52, 44, 1, 4);
  gate(214, 100, 148, 0);
  parcel(cx, 126 + (st ? 0 : hop(t, 1.1, 3)), 1); stick(9, cx - 13, 116 + (st ? 0 : hop(t, 1.1, 3))); stick(9, cx - 1, 114 + (st ? 0 : hop(t, 1.1, 3)));
  parcel(ax, 128 + (st ? 0 : hop(t, 0.8, 3)), 0); stick(9, ax - 9, 121 + (st ? 0 : hop(t, 0.8, 3))); stick(9, ax + 9, 121 + (st ? 0 : hop(t, 0.8, 3)));
  parcel(px, 126, 1); stick(9, px - 13, 116); stick(9, px - 1, 114); stick(st ? -1 : t - 1.5, px + 13, 116);
  // the lock bar across the lane, and its padlock
  box(118, 132 - lift, 4.4, 34, 1.5, STEEL2);
  lock(118, 104 - lift, open, st ? 0 : wob((t - 2.25) / 0.16) * 0.22);
}
function team6(t, st) {
  // the gate lifts for the manager only; the parcel slides onto the pad and the pad lights
  const up = st ? 1.4 : 1.4 * (back(mv(t, 1.3, 1.6)) - io(mv(t, 2.2, 2.36))) + wob(mv(t, 0.6, 0.95)) * 0.09, px = st ? 288 : mix(152, 288, io(mv(t, 1.6, 2))), live = st || t >= 2, key = mv(t, 1, 1.3);
  belt(0, 204, px);
  pad(208, 112, 98, 34, live); word(WS.live, 241, 129.5);
  if (!st && t >= 2) rays(257, 129, 46 + (t - 2) * 40, 8, 1 - (t - 2) / 0.35, GREEN, 6);
  ln(122, 72, 186, 98, DIM, 1.3);                                    // the manager's line to the gate
  dl(50, 80, 178, 112, st ? 1 : mv(t, 0.45, 0.8));                    // another agent reaches for it
  xs(st ? 9 : t - 0.75, 176, 100, 0.8, st ? 1 : 1 - mv(t, 1, 1.2));
  agent(32, 72, 34, 28, 0, 0);
  agent(96, 68, 52, 44, st || t >= 1, 4, st ? 1 : 1 + 0.07 * Math.sin(mv(t, 1, 1.3) * PI));
  if (t > 1 && t < 1.3) pic(4, mix(124, 184, io(key)), mix(73, 97, io(key)), 0.8, BONE);
  parcel(px, 128 + (st ? 0 : hop(t, 2, 4)), 0); stick(9, px - 9, 121 + (st ? 0 : hop(t, 2, 4)));
  gate(186, 100, 148, up);
}
function team7(t, st) {
  // the builder's own dot goes out to the live site, taps the work three times as a visitor would, and a tick flies home
  const go = st ? 1 : io(mv(t, 0.35, 0.9)), bk = st ? 0 : io(mv(t, 1.6, 2.1)), u = go - bk, dip = st ? 0 : hop(t, 0.95, -6, 0.16) + hop(t, 1.15, -6, 0.16) + hop(t, 1.35, -6, 0.16);
  const sq = st ? 0 : (sqz(t, 1.0, 0.1) + sqz(t, 1.2, 0.1) + sqz(t, 1.4, 0.1)) * 0.5, home = st || t >= 2.1;
  pad(198, 112, 98, 34, 1); word(WS.live, 231, 129.5);
  dq(44, 62, 146, -22, 278, 104, 1, 0.4);
  agent(44, 82, 40, 34, 1, 1, st ? 1 : 1 + 0.08 * Math.sin(mv(t, 2.1, 2.32) * PI));
  parcel(278, 126, 0, 1 + sq, 1 - sq); stick(9, 269, 119);
  if (st) { ring(278, 124, 9, BONE, 1.6, 0.7); ring(278, 124, 14, BONE, 1.6, 0.45); ring(278, 124, 19, BONE, 1.6, 0.25); }
  else { tapRing(278, 124, (t - 1.0) / 0.4); tapRing(278, 124, (t - 1.2) / 0.4); tapRing(278, 124, (t - 1.4) / 0.4); }
  if (home) stick(st ? 9 : t - 2.1, 62, 66, 6);
  else if (t >= 1.5) tk(t - 1.5, qp(44, 146, 278, 1 - bk), qp(62, -22, 104, 1 - bk) - 10 * (1 - bk), 1);
  if (!(home && !st) && (t >= 0.35 || st)) dot(qp(44, 146, 278, u * (t > 1.6 ? 0.9 : 1)), qp(62, -22, 104, u * (t > 1.6 ? 0.9 : 1)) + dip, 5);
}
const TEAM = { n: 7, still: [0.8, 0.95, 0.9, 0.95, 0.5, 0.9, 0.6], draw(k, i, t, st) { switch (i) { case 0: team1(t, st); break; case 1: team2(t, st); break; case 2: team3(t, st); break; case 3: team4(t, st); break; case 4: team5(t, st); break; case 5: team6(t, st); break; default: team7(t, st); } } };

// =====================================================================================================================
// social: plans, makes, checks and posts video every day (8 steps)
// =====================================================================================================================
const BARS = [10, 18, 14, 24], RES = [14, 24, 18];
// a film strip: a video
function film(x, y, s = 1, r = 0) {
  tf(x, y, s, r);
  if (!FLAT) { g.fillStyle = SH; rrp(-15, -6.5, 34, 18, 2); g.fill(); }
  g.strokeStyle = GREY; g.lineWidth = 1.2; g.fillStyle = FILM; rrp(-17, -9, 34, 18, 2); g.fill(); g.stroke();
  fr(-13.5, -4.6, 12, 9.2, BONE); fr(1.5, -4.6, 12, 9.2, BONE);
  g.fillStyle = BONE; for (let k = 0; k < 6; k++) { g.fillRect(-14.6 + k * 5.4, -7.7, 2.4, 1.7); g.fillRect(-14.6 + k * 5.4, 6, 2.4, 1.7); }
  un(); g.strokeStyle = INK; g.lineWidth = 1.5;
}
// a card: something written down. Bone, two ink lines
function card(x, y, s = 1, r = 0) { tf(x, y, s, r); box(0, 0, 20, 14, 1.5, BONE); ln(-6.5, -2.4, 6.5, -2.4); ln(-6.5, 2.4, 2.5, 2.4); un(); }
// a box with a dark face and a bone edge: a screen, a phone, a window
function glass(x, y, w, h, r, col = GLASS, edge = BONE) { if (!FLAT) { g.fillStyle = SH; rrp(x - w / 2 + 2, y - h / 2 + 2.5, w, h, r); g.fill(); } g.fillStyle = col; g.strokeStyle = edge; rrp(x - w / 2, y - h / 2, w, h, r); g.fill(); g.stroke(); g.strokeStyle = INK; }
// tomorrow's page: a bone sheet under a binder strip with two rings, its header, four slots (dashed until a card lies in them)
function planPage(x, y, n) {
  box(x + 55, y + 60, 110, 120, 3, BONE); fr(x + 0.8, y + 0.8, 108.4, 11.5, DARK); ln(x + 0.8, y + 12.3, x + 109.2, y + 12.3, INK, 1.5);
  ring(x + 30, y + 5, 4.2, STEEL, 2.2); ring(x + 80, y + 5, 4.2, STEEL, 2.2);
  word(WS.tomorrow, x + 55, y + 25.5);
  g.strokeStyle = MID; g.lineWidth = 1.3; g.setLineDash(DASH2);
  for (let k = n; k < 4; k++) { rrp(x + 9 + (k % 2) * 50, y + 38 + (k >> 1) * 38, 42, 30, 2); g.stroke(); }
  g.setLineDash(NOD); g.strokeStyle = INK; g.lineWidth = 1.5;
}
const slx = (x, k) => x + 30 + (k % 2) * 50, sly = (y, k) => y + 53 + (k >> 1) * 38;
// the small chart over the planner: n bars lit of four
function chart(x, y, lit, a = 0.6) { ln(x - 4, y + 0.7, x + 44, y + 0.7, MID, 1.4); for (let k = 0; k < 4; k++) { g.globalAlpha = A * (k < lit ? 1 : a * 0.55); fr(x + k * 11, y - BARS[k], 7, BARS[k], k < lit ? BONE : GREY); } g.globalAlpha = A; }
// the studio: a bone box with a dark window, a slot in its left side
function studio(x, y, s = 1, sy = s) { tf(x, y, s, 0, sy); box(0, 0, 96, 70, 6, BONE); fr(-50, 8, 6, 16, INK); glass(0, -8, 62, 40, 3, GLASS, INK); un(); }
function cloud(x, y, s = 1) {
  tf(x, y, s);
  for (let p = 0; p < 2; p++) { const d = p ? 0 : 2, e = p ? 0 : 2.5; g.fillStyle = p ? '#E3E0D8' : SH; g.beginPath(); g.arc(-16 + d, 5 + e, 9.5, 0, TAU); g.arc(-4 + d, -4 + e, 12.5, 0, TAU); g.arc(13 + d, 2 + e, 11, 0, TAU); g.rect(-16 + d, 3 + e, 29, 11.5); g.fill(); }
  un();
}
// an inspection arch over the belt: two posts, a bone lintel with its sign (10 an ear, 11 an eye, 0 none), a small lamp at its right end
function arch(x, icon, st, tilt = 0, small = 0) {
  const hw = small ? 13 : 20, top = small ? 96 : 72, lw = small ? 36 : 52, lh = small ? 15 : 18;
  box(x - hw, (top + 147) / 2, small ? 4.4 : 6, 147 - top, 1.5, STEEL2); box(x + hw, (top + 147) / 2, small ? 4.4 : 6, 147 - top, 1.5, STEEL2);
  tf(x, top - lh / 2 + 1, 1, tilt); box(0, 0, lw, lh, small ? 5 : 6, BONE); if (icon) pic(icon, small ? -5 : -7, 0, small ? 0.8 : 1); lamp(lw / 2 - (small ? 7 : 9), 0, st, small ? 3 : 3.6); un();
}
// an eye that can look about, and blink. px, py: where the pupil has gone (-1..1) · lid 0 open, 1 shut
function eye(x, y, w, h, px = 0, py = 0, lid = 0, col = BONE, edge = INK) {
  const e = h * (1 - lid * 0.92); g.fillStyle = col; g.strokeStyle = edge; g.beginPath(); g.moveTo(x - w / 2, y); g.quadraticCurveTo(x, y - e * 1.25, x + w / 2, y); g.quadraticCurveTo(x, y + e * 1.25, x - w / 2, y); g.closePath(); g.fill(); g.stroke(); g.strokeStyle = INK;
  if (lid < 0.6) { g.fillStyle = INK; g.beginPath(); g.arc(x + px * w * 0.22, y + py * h * 0.2, h * 0.36, 0, TAU); g.fill(); }
}
function clock(x, y, r, a1, a2 = null) {
  disc(x, y, r, BONE); for (let k = 0; k < 4; k++) { const c = Math.cos(k * 1.5708), s = Math.sin(k * 1.5708); ln(x + c * (r - 4.5), y + s * (r - 4.5), x + c * (r - 1.6), y + s * (r - 1.6), INK, 1.5); }
  if (a2 !== null) ln(x, y, x + Math.sin(a2) * r * 0.46, y - Math.cos(a2) * r * 0.46, INK, 2.6);
  ln(x, y, x + Math.sin(a1) * r * 0.74, y - Math.cos(a1) * r * 0.74, INK, 1.8); disc(x, y, 1.7, INK, 1);
}
// a small portrait screen. lit: a bone block with a play mark
function screen(x, y, lit, s = 1) {
  tf(x, y, s); glass(0, 0, 26, 44, 5);
  if (lit > 0) { g.globalAlpha = A * lit; fr(-9.5, -17, 19, 30, BONE); g.fillStyle = INK; g.beginPath(); g.moveTo(-3.2, -7); g.lineTo(4.6, -2); g.lineTo(-3.2, 3); g.closePath(); g.fill(); g.globalAlpha = A; }
  un();
}
function moon(x, y, r) { disc(x, y, r, BONE, 1); g.fillStyle = BG; g.beginPath(); g.arc(x + r * 0.45, y - r * 0.3, r * 0.86, 0, TAU); g.fill(); }

function soc1(t, st) {
  // the planner reads its chart, then deals four script cards onto tomorrow's page
  const py = 36 + (st ? 0 : -hop(t, 2, 2.5, 0.22)), lit = st ? 4 : Math.floor(cl((t - 0.35) / 0.4) * 4 + 0.001);
  let n = 0; for (let k = 0; k < 4; k++) if (st || t >= 1.2 + k * 0.25) n++;
  chart(44, 70, lit);
  dl(64, 76, 64, 91, 1, st ? 0.45 : 0.3 + 0.4 * Math.sin(mv(t, 0.35, 0.8) * PI));
  agent(64, 112, 44, 38, 1, 5, st ? 1 : 1 + 0.05 * Math.sin(mv(t, 0.8, 1) * PI));
  planPage(176, py, n);
  for (let k = 0; k < 4; k++) {
    const at = 0.85 + k * 0.25, u = st ? 1 : out(mv(t, at, at + 0.35)), cx = slx(176, k), cy = sly(py, k), q = st ? 0 : sqz(t, at + 0.35);
    if (st) dq(88, 108, (88 + cx) / 2, cy - 44, cx - 14, cy - 12, 1, 0.35);
    if (st || t >= at) { tf(mix(88, cx, u), mix(108, cy, u) - Math.sin(u * PI) * 24, 1, (1 - u) * -0.5); card(0, 0, mix(0.9, 1.75, u) * (1 + q), 0); un(); }
  }
}
function soc2(t, st) {
  // a script goes in: built (the cube), voiced (the wave), rendered (up to the cloud), and a film strip comes back down
  const cu = st ? 1 : io(mv(t, 0.6, 1.1)), wv = st ? 1 : mv(t, 0.9, 1.3), job = st ? -1 : io(mv(t, 1.3, 1.7)), sw = st ? 1 : 1 + 0.12 * Math.sin(mv(t, 1.45, 1.8) * PI), dn = st ? 1 : bnc(mv(t, 1.8, 2.2));
  dl(156, 86, 220, 54, 1, 0.4);
  if (!st && t < 0.75) card(mix(22, 72, io(mv(t, 0.35, 0.62))), 132, 1.25);      // the script card, into the slot
  studio(112, 116, 1 + (st ? 0 : 0.03 * Math.sin(mv(t, 0.6, 0.8) * PI)));
  // in the window: the cube turns a quarter turn twice, the sound wave draws itself under it
  tf(112, 102, 1, cu * PI); g.strokeStyle = BONE; box(0, 0, 15, 15, 1.5, Math.round(cu * 2) % 2 ? STEEL : BONE, 1); g.strokeStyle = INK; un();
  g.strokeStyle = BONE; g.lineWidth = 1.8; g.beginPath();
  for (let k = 0; k <= 40 * wv; k++) { const x = 86 + k * 1.3, y = 121 - Math.abs(Math.sin(k * 0.3927)) * (3 + 3 * Math.sin(k * 0.21 + 1)); if (k) g.lineTo(x, y); else g.moveTo(x, y); }
  g.stroke(); g.strokeStyle = INK; g.lineWidth = 1.5;
  if (job > 0 && job < 1) dot(mix(156, 222, job), mix(86, 53, job), 4.4);
  cloud(240, 46, sw);
  if (!st && t > 1.5 && t < 1.85) for (let k = 0; k < 3; k++) if (t > 1.5 + k * 0.08) { g.fillStyle = INK; g.beginPath(); g.arc(233 + k * 7, 49, 1.9, 0, TAU); g.fill(); }
  if (st) dl(240, 64, 240, 116);
  if (st || t >= 1.8) film(240, mix(60, 132, dn), mix(0.5, 1, cl(dn * 1.4)));
}
function soc3(t, st) {
  // under the ear arch: what the strip says is turned into lines of text, set beside the script's lines, and ticked off one by one
  const fx = st ? 86 : mix(-20, 86, out(mv(t, 0.35, 0.7))), tilt = st ? 0 : 0.09 * (io(mv(t, 0.6, 0.75)) - io(mv(t, 1.1, 1.25))), w = st ? 2 : mv(t, 0.7, 1.2), ok = st || t >= 2;
  belt(0, 320, fx);
  // the two columns: what was heard, and the script
  glass(187, 68, 62, 56, 3, GLASS, MID); box(263, 68, 62, 56, 3, BONE);
  for (let k = 0; k < 3; k++) {
    const y = 54 + k * 14, at = 0.9 + k * 0.15, a = st ? 9 : t - 1.35 - k * 0.25;
    ln(240, y, 276 - k * 5, y, INK, 2);
    if (st || t >= at) ln(164, y, 164 + (36 - k * 5) * (st ? 1 : out(mv(t, at, at + 0.14))), y, BONE, 2);
    if (a >= 0) { ln(222, y, 222 + 14 * cl(a / 0.1), y, GREEN, 1.8); stick(a - 0.08, 286, y, 4.2); }
  }
  film(fx, 128);
  if (w > 0 && w < 1) {                                               // the wave: up from the strip and into the "heard" column
    const cx = mix(92, 176, io(w)), cy = mix(112, 62, io(w)); g.strokeStyle = BONE; g.lineWidth = 1.8; g.beginPath();
    for (let k = -4; k <= 4; k++) { const x = cx + k * 3.4, y = cy + (k % 2 ? -4 : 4) * (1 - Math.abs(k) / 5) * (1 - w * 0.8); if (k === -4) g.moveTo(x, y); else g.lineTo(x, y); }
    g.stroke(); g.strokeStyle = INK; g.lineWidth = 1.5;
  }
  arch(86, 10, ok ? 2 : 0, tilt);
  stick(st ? 9 : t - 2, fx + 15, 119, 5.4);
}
function soc4(t, st) {
  // under the eye arch: stills pop out (the first frame, each cut, the last frame); a caption is nudged back inside the safe zone
  const fx = st ? 86 : mix(-20, 86, out(mv(t, 0.35, 0.65))), n = st ? 4 : t < 0.7 ? 0 : Math.min(4, 1 + Math.floor((t - 0.7) / 0.2)), ok = st || t >= 2;
  const nud = st ? 1 : back(mv(t, 1.55, 1.85)), blink = !st && t > 2.05 && t < 2.15, lookR = st || t >= 1.4;
  const px = n === 0 ? -0.4 : lookR ? 1 : -0.6 + n * 0.4, pyy = n === 0 ? 0.8 : lookR ? 0 : -0.9;
  belt(0, 222, fx);
  for (let k = 0; k < n; k++) { const s = st ? 1 : pop(t - 0.7 - k * 0.2); tf(128 + k * 24, 54, s); box(0, 0, 20, 28, 2, BONE); fr(-7, -11, 14, 16, k === 0 || k === 3 ? DARK : MID); disc(-4 + k * 2.6, k % 2 ? -1 : -6, 2.2, BONE, 1); ln(-6, 9, 3, 9, INK, 1.4); un(); }
  // the phone frame, its safe zone, the caption bar
  glass(263, 86, 62, 104, 8);
  g.globalAlpha = A * (!st && t > 1.85 && t < 2 ? 1 : 0.6); g.strokeStyle = BONE; g.lineWidth = 1.4; g.setLineDash(DASH); rrp(240, 44, 46, 76, 2); g.stroke(); g.setLineDash(NOD); g.strokeStyle = INK; g.lineWidth = 1.5; g.globalAlpha = A;
  fr(246, 52, 34, 22, DIM); fr(246, 78, 34, 12, DIM);
  box(263, mix(124, 110, nud), 34, 9, 2, BONE, 1);
  if (st) dl(263, 132, 263, 122, 1, 0.5);
  film(fx, 128);
  arch(86, 0, ok ? 2 : 0);
  eye(79, 64, 17, 5.6, px, pyy, blink ? 1 : 0, BONE);
  if (lookR && !ok) dl(96, 66, 228, 100, st ? 1 : mv(t, 1.4, 1.55), 0.3);
  stick(st ? 9 : t - 2, fx + 15, 119, 5.4);
}
// the reject chute: where a strip is `d` units along it (down from the trapdoor, left along the foot, up into the studio)
const chx = d => d < 36 ? 200 : d < 196 ? 200 - (d - 36) : 40, chy = d => d < 36 ? 142 + d : d < 196 ? 178 : 178 - (d - 196);
function soc5(t, st) {
  // one strip fails at the eye arch, drops down the chute back to the studio, and a fresh one passes both
  const fail = !st && t >= 0.7 && t < 1.5, d = st ? 120 : io(mv(t, 0.9, 1.5)) * 238, flap = st ? 0 : io(mv(t, 0.85, 1)) - io(mv(t, 1.25, 1.4));
  const x1 = mix(66, 200, mv(t, 0.35, 0.7)), x2 = st ? 262 : mix(66, 262, mv(t, 1.8, 2.2)) + 30 * mv(t, 2.2, 2.4);
  // the chute, under the belt
  g.strokeStyle = DIM; g.lineWidth = 17; g.lineJoin = 'miter'; g.beginPath(); g.moveTo(200, 144); g.lineTo(200, 178); g.lineTo(40, 178); g.lineTo(40, 132); g.stroke(); g.strokeStyle = RUB; g.lineWidth = 13.5; g.stroke(); g.lineJoin = 'round'; g.strokeStyle = INK; g.lineWidth = 1.5;
  belt(64, 320, st ? 0 : t < 1.8 ? x1 : x2);
  if (flap > 0) { fr(186, 120, 28, 24, BG); ln(186, 120, 186 + 4, 120 + 20 * flap, MID, 2.4); ln(214, 120, 214 - 4, 120 + 20 * flap, MID, 2.4); }
  if (st) { al(0.4); FLAT = true; film(chx(d), chy(d), 0.72); xs(9, chx(d), chy(d) - 15, 0.8); FLAT = false; al(1); }
  else if (t >= 0.9 && t < 1.5) film(chx(d), chy(d), 0.72, d < 30 ? 1.5708 * cl(d / 14) : d < 190 ? 1.5708 * (1 - cl((d - 30) / 12)) : 1.5708 * cl((d - 190) / 12));
  studio(40, 112, 0.5, 0.54 * (1 + (st ? 0 : 0.07 * Math.sin(mv(t, 1.5, 1.8) * TAU))));
  if (!st && t >= 0.3 && t < 0.9) film(x1, 128, 1, fail ? wob((t - 0.7) / 0.3) * 0.2 : 0);
  if (st || t >= 1.8) film(x2, 128);
  arch(150, 10, st || (t > 0.5 && t < 0.9) || t > 1.98 ? 2 : 0, 0, 1); arch(200, 11, st || t > 2.1 ? 2 : fail ? 3 : 0, 0, 1);
  if (fail && t < 1) xs(t - 0.7, 200, 108, 1);
  if (st || t >= 2.2) tk(st ? 9 : t - 2.2, x2, 106, 1.25);
}
function soc6(t, st) {
  // the plan comes to him the night before: he takes one card off, the rest stay and are ticked
  const px = st ? 106 : mix(30, 106, io(mv(t, 0.35, 0.9))), take = st ? 1 : inq(mv(t, 1.12, 1.4)), reach = st ? 1 : io(mv(t, 0.9, 1.1)), pat = st ? 0 : Math.sin(mv(t, 2, 2.3) * PI);
  const hx = st ? 268 : mix(mix(256, 216, reach), 268, take) - pat * 18, hy = st ? 96 : mix(112, 92, reach) + (st ? 0 : hop(t, 1.02, -4, 0.12)) + pat * 16;
  moon(292, 26, 8.5);
  planPage(px, 36, 4);
  // the card he takes off leaves its slot dashed again
  g.strokeStyle = MID; g.lineWidth = 1.3; g.setLineDash(DASH2); if (take > 0.2) { rrp(px + 59, 74, 42, 30, 2); g.stroke(); } g.setLineDash(NOD); g.strokeStyle = INK; g.lineWidth = 1.5;
  for (let k = 0; k < 4; k++) {
    const cx = slx(px, k), cy = sly(36, k);
    if (k === 1) card(cx + take * 62, cy + take * 2, 1.75, take * 0.12);
    else { card(cx, cy, 1.75); stick(st ? 9 : t - (k === 0 ? 1.5 : k === 2 ? 1.7 : 1.9), cx + 15, cy - 9, 5.2); }
  }
  hand(hx, hy, 0, 1.15);
}
function soc7(t, st) {
  // posts leave one at a time, hours apart; one more waits behind the bar for its turn
  const hr = st ? 1.8 : t * 0.75, r1 = st ? 2 : back(mv(t, 0.5, 0.72)) + back(mv(t, 1.3, 1.52)), nudge = st ? 0 : Math.sin(mv(t, 1.9, 2.2) * PI);
  const u1 = st ? 1 : mv(t, 0.5, 0.82), u2 = st ? 1 : mv(t, 1.3, 1.62), p2 = st ? 0 : io(mv(t, 0.55, 0.85));
  belt(0, 198, 0);
  clock(58, 54, 22, hr * TAU, hr * 0.5 + 0.6);
  if (st) { g.globalAlpha = 0.45; g.strokeStyle = INK; g.setLineDash(DASH); g.beginPath(); g.arc(58, 54, 13, -1.5708, 2.4); g.stroke(); g.setLineDash(NOD); g.globalAlpha = 1; }
  screen(226, 118, st || t >= 0.8 ? 1 : 0, st ? 1 : 1 + 0.08 * Math.sin(mv(t, 0.8, 1) * PI)); screen(258, 118, st || t >= 1.6 ? 1 : 0, st ? 1 : 1 + 0.08 * Math.sin(mv(t, 1.6, 1.8) * PI)); screen(290, 118, 0);
  // the barrier behind, and the post that waits there
  film(34 + nudge * 9, 128, 0.74);
  tf(60, 100, 1, st ? 0 : -wob(mv(t, 1.98, 2.3)) * 0.1); box(0, 24, 5.6, 50, 2, BONE); for (let k = 0; k < 4; k++) fr(-2.8, 7 + k * 11, 5.6, 5, INK); un(); disc(60, 100, 3.4, DARK, 1);
  // the two that go out, through the turnstile and over to their screens
  if (u2 < 1) film(u2 > 0 ? mix(122, 258, io(u2)) : mix(90, 122, p2), u2 > 0 ? 128 - Math.sin(u2 * PI) * 34 - u2 * 10 : 128, 0.74 * (1 - 0.5 * inq(u2)));
  if (u1 < 1) film(u1 > 0 ? mix(122, 226, io(u1)) : 122, u1 > 0 ? 128 - Math.sin(u1 * PI) * 34 - u1 * 10 : 128, 0.74 * (1 - 0.5 * inq(u1)));
  if (st) { dq(150, 122, 190, 70, 226, 100, 1, 0.35); dq(150, 122, 206, 60, 258, 100, 1, 0.35); }
  // the turnstile: a post and a rotor of three arms
  box(150, 138, 7, 22, 2, STEEL2);
  for (let k = 0; k < 3; k++) { const a = (k + r1) * 2.0944 - 0.5236, c = Math.cos(a), s = Math.sin(a); ln(150, 126, 150 + c * 17, 126 + s * 17, INK, 5.6); ln(150, 126, 150 + c * 17, 126 + s * 17, BONE, 3.2); }
  disc(150, 126, 4.4, STEEL, 1);
}
function soc8(t, st) {
  // what each post did comes back as bars, and the bars go home into the planner's chart
  screen(200, 97, 1); screen(240, 97, 1); screen(280, 97, 1);
  ln(30, 70.7, 82, 70.7, MID, 1.4);
  for (let k = 0; k < 3; k++) {
    const g0 = st ? 1 : out(mv(t, 0.35 + k * 0.15, 0.8 + k * 0.15)), at = 1.1 + k * 0.2, u = st ? 1 : io(mv(t, at, at + 0.3)), sx = 217 + k * 40, tx = 38 + k * 14, h = RES[k];
    if (st) { dq(sx, 112, (sx + tx) / 2, 20, tx + 3.5, 60, 1, 0.3); g.globalAlpha = 0.35; fr(sx, 119 - h, 7, h, BONE); g.globalAlpha = 1; fr(tx, 70 - h, 7, h, BONE); continue; }
    if (u <= 0) fr(sx, 119 - h * g0, 7, h * g0, BONE);
    else if (u < 1) { const x = qp(sx, (sx + tx) / 2, tx, u), y = qp(119 - h, 10, 70 - h, u); fr(x, y, 7, h * (1 - 0.5 * Math.sin(u * PI)), BONE); }
    else fr(tx, 70 - h, 7, h, BONE);
  }
  const fl = st ? 1 : Math.cos(mv(t, 1.9, 2.2) * PI);
  tf(56, 104, st ? 1 : 1 + 0.07 * Math.sin(mv(t, 1.9, 2.15) * PI)); box(0, 0, 44, 38, 6, BONE); tf(0, 0, Math.max(0.08, Math.abs(fl)), 0, 1); pic(5, 0, 0); un(); un();
  dl(56, 76, 56, 84, 1, 0.4);
}
const SOCIAL = { n: 8, still: [0.9, 0.9, 0.9, 0.9, 0.95, 0.9, 0.75, 0.9], draw(k, i, t, st) { switch (i) { case 0: soc1(t, st); break; case 1: soc2(t, st); break; case 2: soc3(t, st); break; case 3: soc4(t, st); break; case 4: soc5(t, st); break; case 5: soc6(t, st); break; case 6: soc7(t, st); break; default: soc8(t, st); } } };

// =====================================================================================================================
// trade: the trading system (8 steps). Only slate, greys, bone, white, steel, ink and paper. Nothing counts, nothing
// rises or falls along a line, nothing is marked right or wrong: no lamp colours, no tick, no cross.
// =====================================================================================================================
const PRL = [52, 44, 56, 36, 48, 28];
// an open tray, seen from the front: what is in it is drawn over its well
function tray(x, y, w, h, col = BONE) { box(x + w / 2, y + h / 2, w, h, 3, col); fr(x + 4, y + 0.8, w - 8, h - 5, GLASS); }
// a white dot with a glow: an idea, and how strong it scored (a: 0 none .. 1 bright)
function idea(x, y, a, s = 1, sy = s) { halo(x, y, 12 + a * 9, 'w', a); tf(x, y, s, 0, sy); disc(0, 0, 5.6, WHITE); un(); }
// the two brackets round a thing: its exits. Drawn exactly alike, one above and one below. gap: half the way between them
function brk(x, y, gap, w, col = BONE, lw = 3) {
  g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'butt'; g.lineJoin = 'miter'; g.beginPath();
  g.moveTo(x - w / 2, y - gap + 6); g.lineTo(x - w / 2, y - gap); g.lineTo(x + w / 2, y - gap); g.lineTo(x + w / 2, y - gap + 6);
  g.moveTo(x - w / 2, y + gap - 6); g.lineTo(x - w / 2, y + gap); g.lineTo(x + w / 2, y + gap); g.lineTo(x + w / 2, y + gap - 6);
  g.stroke(); g.strokeStyle = INK; g.lineWidth = 1.5; g.lineCap = 'round'; g.lineJoin = 'round';
}
// the analyst: a bone box lettered from the markup, with a dial that has one needle and no marks. v: where the needle is (0..1), under 0: no dial
function aibox(x, y, s = 1, v = -1) {
  tf(x, y, s); box(0, 0, 56, 40, 6, BONE);
  if (v < 0) word(WS.ai, 0, 1.5);
  else { word(WS.ai, -13, 1.5); g.fillStyle = '#DAD6CB'; g.beginPath(); g.arc(13, 7, 12.5, PI, 0); g.closePath(); g.fill(); g.stroke(); const a = PI + v * PI; ln(13, 7, 13 + Math.cos(a) * 10, 7 + Math.sin(a) * 10, INK, 2.2); disc(13, 7, 2, INK, 1); }
  un();
}
// the steel box bolted over the exits: lettered from the markup, four rivets, a padlock
function codebox(x, y, w, h, rot = 0, glint = -1) {
  box(x, y, w, h, 3, STEEL2);
  g.fillStyle = INK; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + (k % 2 ? 1 : -1) * (w / 2 - 4.5), y + (k > 1 ? 1 : -1) * (h / 2 - 4.5), 1.5, 0, TAU); g.fill(); }
  word(WS.code, x, y - h * 0.22);
  lock(x, y + h * 0.2 + 2, 0, rot);
  if (glint >= 0 && glint <= 1) { g.save(); rrp(x - 9, y + h * 0.2 - 4, 18, 14, 3); g.clip(); g.globalAlpha = 0.85; g.strokeStyle = WHITE; g.lineWidth = 3.4; g.beginPath(); g.moveTo(x - 14 + glint * 24, y + h * 0.2 + 12); g.lineTo(x - 8 + glint * 24, y + h * 0.2 - 6); g.stroke(); g.restore(); g.strokeStyle = INK; g.lineWidth = 1.5; g.globalAlpha = A; }
}
function lens(x, y, r) { g.globalAlpha = A * 0.1; g.fillStyle = WHITE; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.globalAlpha = A; ln(x + r * 0.72, y + r * 0.72, x + r * 1.5, y + r * 1.5, INK, 6); ln(x + r * 0.72, y + r * 0.72, x + r * 1.5, y + r * 1.5, GREY, 3.6); ring(x, y, r, INK, 5.4); ring(x, y, r, BONE, 3); }
// a paper tag on a short string: the reason, logged
function tag(x, y, s) { if (s <= 0) return; ln(x, y, x + 8 * s, y - 7 * s, GREY, 1.2); tf(x + 13 * s, y - 10 * s, s, -0.2); g.lineWidth = 1.2; box(0, 0, 13, 9, 1, PAPER, 1); g.lineWidth = 1.5; ln(-3.6, -1.6, 3.6, -1.6, INK, 1.2); ln(-3.6, 1.6, 1.4, 1.6, INK, 1.2); un(); }
// the small computer: a screen on a stand. on: lit
function computer(x, y, on) { box(x, y + 20, 22, 4, 1.5, STEEL2); fr(x - 2.5, y + 13, 5, 6, STEEL2); glass(x, y, 38, 28, 3, on ? '#CDD3D6' : GLASS, STEEL2); if (on) { ln(x - 11, y - 5, x + 6, y - 5, DARK, 1.6); ln(x - 11, y, x + 10, y, DARK, 1.6); ln(x - 11, y + 5, x + 2, y + 5, DARK, 1.6); } }

function trd1(t, st) {
  // a stream of small things goes by; the lens sweeps it, and the three that are moving are picked out and dropped onto the belt
  const lx = st ? 282 : mix(40, 282, mv(t, 0.35, 1.85));
  belt(0, 320, 0);
  ln(0, 56, 320, 56, DIM2, 1);
  for (let k = 0; k < 23; k++) {
    const moving = k === 3 || k === 6 || k === 9 || k === 15 || k === 18, pk = k === 3 ? 0.7 : k === 6 ? 1.15 : k === 9 ? 1.6 : 99;
    if (t >= pk) continue;                                            // picked: it has left the stream
    g.lineWidth = 1; g.globalAlpha = moving ? 1 : 0.7; disc(((15 * k + 9 + t * 60) % 345) - 15, 56 + (moving ? Math.sin(T * 11 + k * 2) * 5 : 0), moving ? 4.8 : 3.2, moving ? LOCKC : MID, 1); g.globalAlpha = 1; g.lineWidth = 1.5;
  }
  for (let j = 0; j < 3; j++) {
    const pk = 0.7 + j * 0.45, a = t - pk, x1 = 100 + j * 70; if (a < 0) continue;
    const d = inq(cl((a - 0.12) / 0.3)), s = a < 0.2 ? 1 + 0.5 * Math.sin(a / 0.2 * PI) : 1.1, q = st ? 0 : sqz(t, pk + 0.42);
    if (st) dl(x1, 64, x1, 118);
    tf(mix(96 + j * 72, x1, d), 56 + (st ? 0 : hop(t, pk, 6, 0.12)) + d * 72, s * (1 + q), 0, s * (1 - q)); disc(0, 0, 5.6, WHITE); un();
  }
  lens(lx, 56, 18);
}
function trd2(t, st) {
  // each one stops under the analyst: sheets riffle, the needle swings, and it takes a glow, somewhere from faint to bright
  let v = 0, rif = -1, sc = false;
  belt(0, 320, t * 40);
  for (let j = 0; j < 3; j++) {
    const a0 = 0.5 + j * 0.55, l0 = a0 + 0.4, rest = 280 - j * 40, sv = j === 0 ? 0.3 : j === 1 ? 0.92 : 0.55, gl = j === 0 ? 0.16 : j === 1 ? 0.95 : 0.5;
    const x = st ? rest : t < a0 ? 160 - (a0 - t) * 220 : t < l0 ? 160 : mix(160, rest, io(mv(t, l0, l0 + 0.4))), sw = st ? 1 : back(mv(t, a0 + 0.05, a0 + 0.3));
    if (!st && t >= a0 && t < l0) { v = sv * sw; rif = t - a0; sc = true; } else if (!st && t >= l0 && t < a0 + 0.55) v = sv * (1 - mv(t, l0, l0 + 0.15));
    if (x > -8) idea(x, 128, st || t >= a0 + 0.25 ? gl * (st ? 1 : cl((t - a0 - 0.25) / 0.12)) : 0);
  }
  if (st) v = 0.55;
  if (sc) { g.globalAlpha = 0.14; g.fillStyle = BONE; g.beginPath(); g.moveTo(148, 92); g.lineTo(172, 92); g.lineTo(184, 120); g.lineTo(136, 120); g.closePath(); g.fill(); g.globalAlpha = 1; }
  // three small sheets riffle at the box's top corner while it reads
  for (let k = 0; k < 3; k++) { const o = rif >= 0 && rif < 0.3 ? Math.sin(cl((rif - k * 0.05) / 0.2) * PI) : 0; tf(134 + k * 3, 52, 1, -0.35 + k * 0.2 - o * 0.25); box(0, -7 - o * 5, 9, 12, 1, k === 1 ? '#DAD6CB' : BONE, 1); un(); }
  aibox(160, 70, 1, v);
}
function trd3(t, st) {
  // the dim ones meet the bar, drop through the slot into the tray and get a paper tag each: the reason. The brightest goes over
  belt(0, 320, t * 40, 100);
  fr(150, 97.8, 17, 28.4, BG); ln(150, 98, 150, 126, DIM, 1.3); ln(167, 98, 167, 126, DIM, 1.3);
  tray(110, 148, 90, 34);
  for (let j = 0; j < 2; j++) {
    const a0 = 0.5 + j * 0.5, tx = 132 + j * 34, d = st ? 1 : bnc(mv(t, a0 + 0.1, a0 + 0.42)), x = st ? tx : t < a0 ? 158 - (a0 - t) * 240 : mix(158, tx, d), q = st ? 0 : sqz(t, a0, 0.12);
    if (x > -8) idea(x, st ? 168 : mix(108, 168, d), (j ? 0.5 : 0.16) * (1 - d * 0.6), 1 - q, 1 + q);
    tag(tx + 3, 166, 1.25 * (st ? 1 : pop(t - a0 - 0.45)));
  }
  box(173, 108, 7, 40, 1.5, STEEL2);
  // the bright one: a crouch, then over the bar in one hop
  const u = st ? 1 : out(mv(t, 1.62, 1.95)), cr = st ? 0 : Math.sin(mv(t, 1.48, 1.62) * PI) * 0.2 + sqz(t, 1.95, 0.12);
  const bx = st ? 236 : t < 1.5 ? 142 - (1.5 - t) * 240 : mix(142, 200, u) + 50 * io(mv(t, 1.95, 2.25));
  if (st) dq(142, 104, 171, 50, 200, 104, 1, 0.4);
  if (bx > -8) idea(bx, 108 - Math.sin(u * PI) * 34, 0.95, 1 + cr, 1 - cr);
}
function trd4(t, st) {
  // alone at the gate: the gate does not open until two brackets have clipped round it, one above and one below
  const x = st ? 236 : mix(-10, 130, out(mv(t, 0.35, 0.7))) + 106 * io(mv(t, 1.5, 2.4)), cl2 = st ? 1 : back(mv(t, 0.7, 1.2)), pu = st ? 1 : 1 + 0.1 * Math.sin(mv(t, 1.2, 1.45) * PI), lift = st ? 1 : io(mv(t, 1.45, 1.65));
  belt(0, 320, t * 40, 88);                                           // the same belt as the steps before
  fr(179, 78 - lift * 50, 2.6, 44, BONE);                              // the slim gate
  if (st || t >= 0.7) brk(x, 100, mix(120, 31, cl2) * pu, 68 * pu, BONE, 3.4);
  if (!st && t > 1.12 && t < 1.34) for (let k = 0; k < 4; k++) rays(x + (k % 2 ? 36 : -36), k > 1 ? 131 : 69, 2 + (t - 1.12) * 22, 4, 1 - (t - 1.12) / 0.22, BONE, 3);
  idea(x, 100, 0.95, 1.4 * (st ? 1 : pu));
}
function trd5(t, st) {
  // the limits are bolted on in plain code: the analyst's word reaches the padlock, bumps it and bounces off
  const drop = st ? 0 : (1 - bnc(mv(t, 0.35, 0.6))) * -70, u = io(mv(t, 0.8, 1.4)), bo = st ? 0.4 : mv(t, 1.4, 1.9), hit = st || t >= 1.4;
  const bx = hit ? qp(208, 170, 108, bo) : qp(92, 160, 208, u), by = hit ? qp(116, 30, 140, bo) : qp(60, 40, 116, u), sq = hit && !st ? Math.sin(mv(t, 1.4, 1.52) * PI) * 0.2 : 0;
  brk(176, 108, 24, 70);
  idea(176, 108, 0.95);
  codebox(232, 108 + drop, 46, 66, st ? 0 : wob(mv(t, 1.4, 1.7)) * 0.14, st ? -1 : mv(t, 2, 2.3));
  aibox(62, 62, st ? 1 : 1 + 0.05 * Math.sin(mv(t, 0.7, 0.9) * PI));
  if (st) dq(208, 116, 170, 30, 108, 140, 1, 0.4);
  if ((st || t >= 0.8) && bo < 1) bub(bx, by, 1, 1 - sq, hit && !st ? -bo * 2.4 : 0, 1 + sq);
  if (!st && t >= 1.9 && t < 2.15) rays(108, 140, 5 + (t - 1.9) * 40, 4, 1 - (t - 1.9) / 0.25, BONE, 4);
}
function trd6(t, st) {
  // the watcher circles each plan without a pause. When the dot touches a bracket, upper or lower, it goes to the out-tray: the same either way
  const dir = LAP % 2 ? 1 : -1, go = st ? 0 : io(mv(t, 1.8, 2.2)), op = st ? 0 : io(mv(t, 1.75, 1.9));
  const dy = st ? -6 : Math.sin(t * 2.7) * 12 * (1 - mv(t, 1.3, 1.5)) + dir * 22.5 * io(mv(t, 1.5, 1.7)), x = mix(140, 262, go), y = mix(100 + dy, 153, go);
  const a = st ? -0.9 : t * 5.236, ex = x + Math.cos(a) * mix(58, 34, go), ey = y + Math.sin(a) * mix(48, 30, go) - go * 16, ln2 = Math.hypot(x - ex, y - ey) || 1;
  const fl = !st && t > 1.68 && t < 1.8;
  belt(0, 320, 0, 88);                                                // the same belt, standing: the plan is in place
  tray(234, 142, 56, 26);
  if (st) { g.globalAlpha = 0.4; g.strokeStyle = BONE; g.setLineDash(DASH); g.beginPath(); g.ellipse(140, 100, 58, 48, 0, 0, TAU); g.stroke(); g.setLineDash(NOD); g.strokeStyle = INK; g.globalAlpha = 1; dq(146, 100, 230, 96, 258, 140, 1, 0.4); }
  brk(140, 100, 31 + op * 6, 84, BONE, 3.4);
  if (fl) { g.strokeStyle = WHITE; g.lineWidth = 4.2; g.lineCap = 'butt'; g.beginPath(); g.moveTo(98, 100 + dir * 31); g.lineTo(182, 100 + dir * 31); g.stroke(); g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = 1.5; }
  idea(x, y, 0.95 * (1 - go), 1.4 - 0.4 * go);
  eye(ex, ey, 27, 8.6, (x - ex) / ln2 * 1.2, (y - ey) / ln2 * 1.2, 0, BONE, INK);
}
function trd7(t, st) {
  // the computer sleeps: everything dims but the exits. A key winds it up again, and the check it missed is run
  const dim = st ? 1 : io(mv(t, 0.6, 0.9)) - io(mv(t, 1.86, 1.98)), asleep = st || (t > 0.75 && t < 1.9), wake = st ? -1 : t - 1.9;
  const a = st ? 2.2 : t < 0.75 ? t * 5.236 : t < 1.9 ? 3.927 : 3.927 + mv(t, 1.98, 2.28) * TAU, ex = 150 + Math.cos(a) * 44, ey = 104 + Math.sin(a) * 38, l = Math.hypot(150 - ex, 104 - ey) || 1;
  const lid = asleep ? 1 : wake >= 0 && ((wake > 0.02 && wake < 0.07) || (wake > 0.12 && wake < 0.17)) ? 1 : 0;
  aibox(50, 60, 0.72);
  codebox(214, 104, 38, 60);
  computer(272, 52, !asleep);
  idea(150, 104, 0.95);
  if (wake > 0.08 && wake < 0.38) { g.globalAlpha = 0.5; g.strokeStyle = BONE; g.lineWidth = 2; g.beginPath(); g.ellipse(150, 104, 44, 38, 0, a - 0.9, a); g.stroke(); g.globalAlpha = 1; g.strokeStyle = INK; g.lineWidth = 1.5; }
  eye(ex, ey, 25, 8, (150 - ex) / l * 1.2, (104 - ey) / l * 1.2, lid, BONE, INK);
  if (wake > 0.3 && wake < 0.5) ring(150, 104, 8 + (wake - 0.3) * 60, WHITE, 1.8, 1 - (wake - 0.3) / 0.2);
  if (dim > 0) { g.globalAlpha = 0.66 * dim; fr(0, 0, W, H, BG); g.globalAlpha = 1; }
  brk(150, 104, 26, 50, dim > 0.5 ? WHITE : BONE, dim > 0.5 ? 3.6 : 3);       // the exits stay lit
  if (dim > 0.5) { halo(150, 78, 20, 'w', 0.25); halo(150, 130, 20, 'w', 0.25); }
  // the zzz, twice, drifting up from the computer
  for (let k = 0; k < 2; k++) { const z = st ? 0.3 + k * 0.42 : mv(t, 0.9 + k * 0.3, 1.5 + k * 0.3); if (z > 0 && z < 1) word(WS.zzz, 270 + Math.sin(z * 5 + k) * 5 + k * 12, 34 - z * 28, Math.sin(z * PI), 0.85 + z * 0.3); }
  // the wind-up key on the computer's side
  const kt = st ? 0.6 : mv(t, 1.5, 1.9) * 2, kw = Math.cos(kt * TAU);
  ln(293, 52, 304, 52, STEEL, 3); tf(307, 52, 1, 0, 1); g.lineWidth = 1.3; box(0, -5.5 * kw, 7, Math.max(2.4, 9 * Math.abs(kw)), 3, STEEL, 1); box(0, 5.5 * kw, 7, Math.max(2.4, 9 * Math.abs(kw)), 3, STEEL, 1); g.lineWidth = 1.5; un();
}
function trd8(t, st) {
  // the reporter: a page of plain lines feeds out, and a speaker mark lands on it (the day's report could be listened to)
  const n = st ? 6 : cl((t - 0.35) / 1.2) * 6, feed = st ? 72 : (Math.floor(n) + out(cl((n % 1) / 0.6))) * 12, sh = !st && t > 0.35 && t < 1.55 && n % 1 < 0.6 ? Math.sin(t * 60) : 0;
  const sp = st ? 1 : pop(t - 1.6, 0.26), pu = st ? 0.5 : (t > 1.9 ? ((t - 1.9) / 0.2) % 1 : -1), bot = 88 + Math.min(feed, 72) + 8;
  // the page, out of the slot: a line with each step
  box(160, (86 + bot) / 2, 64, bot - 86, 1.5, BONE);
  for (let k = 0; k < 6; k++) { const y = bot - 14 - k * 12; if (y > 90 && k < Math.floor(n + 0.4)) ln(134, y, 134 + PRL[k], y, INK, 2); }
  g.fillStyle = '#DAD6CB'; g.beginPath(); g.moveTo(128.8, bot - 0.8); g.quadraticCurveTo(160, bot - 6, 191.2, bot - 0.8); g.closePath(); g.fill();
  // the printer
  tf(160 + sh, 64); box(0, 0, 80, 44, 5, STEEL); fr(-34, 17, 68, 3.4, INK); fr(-30, -13, 22, 4, DARK); disc(26, -11, 3, DARK, 1); un();
  // the speaker mark
  if (sp > 0) {
    tf(196, 106, sp); disc(0, 0, 13, BONE);
    g.fillStyle = INK; g.beginPath(); g.moveTo(-8, -2.6); g.lineTo(-4.6, -2.6); g.lineTo(-0.6, -6.4); g.lineTo(-0.6, 6.4); g.lineTo(-4.6, 2.6); g.lineTo(-8, 2.6); g.closePath(); g.fill();
    g.lineWidth = 1.7; g.globalAlpha = A * (pu < 0 ? 1 : 0.35 + 0.65 * Math.abs(Math.cos(pu * PI))); g.beginPath(); g.arc(-0.6, 0, 4.6 + (pu < 0 ? 0 : pu * 0.8), -0.75, 0.75); g.stroke(); g.beginPath(); g.arc(-0.6, 0, 8.2 + (pu < 0 ? 0 : pu * 1.4), -0.75, 0.75); g.stroke(); g.globalAlpha = A; g.lineWidth = 1.5;
    un();
  }
}
const TRADE = { n: 8, still: [0.85, 0.9, 0.9, 0.9, 0.65, 0.5, 0.5, 0.9], draw(k, i, t, st) { switch (i) { case 0: trd1(t, st); break; case 1: trd2(t, st); break; case 2: trd3(t, st); break; case 3: trd4(t, st); break; case 4: trd5(t, st); break; case 5: trd6(t, st); break; case 6: trd7(t, st); break; default: trd8(t, st); } } };

// =====================================================================================================================
// memory: agents that know him (7 steps)
// =====================================================================================================================
function pBub(dx, dy, w, h) { const x = -w / 2 + dx, y = -h / 2 + dy; g.beginPath(); g.moveTo(x + 7, y); g.arcTo(x + w, y, x + w, y + h, 7); g.arcTo(x + w, y + h, x, y + h, 7); g.lineTo(x + 12, y + h); g.lineTo(x + 5, y + h + 5.5); g.lineTo(x + 6.5, y + h); g.arcTo(x, y + h, x, y, 6); g.arcTo(x, y, x + w, y, 7); g.closePath(); }
// a bubble: something said. kind 0 two lines · 1 three dots · 2 a question hook · 3 a tick · 4 a film frame · 5 nothing. tape: a corner of masking tape
function bub(x, y, kind, s = 1, r = 0, sy = s, tape = 0) {
  tf(x, y, s, r, sy); solid(pBub, BONE, 26, 18);
  if (kind === 0) { ln(-7, -3, 7, -3); ln(-7, 2.2, 2.5, 2.2); }
  else if (kind === 1) { g.fillStyle = INK; for (let k = -1; k < 2; k++) { g.beginPath(); g.arc(k * 6, 0, 1.9, 0, TAU); g.fill(); } }
  else if (kind === 2) pic(14, 0, -0.4, 0.85);
  else if (kind === 3) mark(0, 0, 0.72, GREEN, 2.6, 1);
  else if (kind === 4) pic(13, 0, 0, 0.72);
  if (tape) { tf(9.5, -7.5, 1, 0.55); g.lineWidth = 1.1; box(0, 0, 10, 5.4, 1, PAPER, 1); g.lineWidth = 1.5; un(); }
  un();
}
// a card-index drawer: a wood front with a bone label and a pull, its top open on a row of tabbed cards.
// lab: the key of the word on its label (none: two scribble lines) · rip: seconds since its cards last rippled
function drawer(x, y, s = 1, lab = null, rip = -1) {
  tf(x, y, s);
  for (let k = 0; k < 5; k++) box(-22 + k * 11, -23 + (k % 2) * 1.6 + (rip >= 0 ? hop(rip, k * 0.07, 3.5, 0.22) : 0), 9.5, 12, 1.2, k % 2 ? '#DAD6CB' : BONE, 1);
  box(0, 0, 62, 40, 3, WOOD);
  if (lab) { box(0, -6, 56, 14, 1.5, BONE, 1); word(lab, 0, -5.4); } else { box(0, -6, 30, 12, 1.5, BONE, 1); ln(-9, -8, 9, -8, INK, 1.3); ln(-9, -4, 3, -4, INK, 1.3); }
  box(0, 10, 16, 5, 2.5, WOOD2, 1);
  un();
}
// the striped card: why it went wrong. fl: flashing
function why(x, y, s = 1, r = 0, fl = 0) { tf(x, y, s, r); box(0, 0, 34, 22, 2, fl ? WHITE : BONE); for (let k = 0; k < 6; k++) fr(-16.2 + k * 5.4, -10.2, 5.4, 5.6, k % 2 ? INK : GOLD); ln(-16.2, -4.6, 16.2, -4.6, INK, 1.2); word(WS.why, 0, 3.8); un(); }
function road(x1, y1, cx, cy, x2, y2, col, dash, x3 = x2, y3 = y2) { g.strokeStyle = col; g.lineWidth = 3.2; if (dash) g.setLineDash(DASH2); g.beginPath(); g.moveTo(x1, y1); g.quadraticCurveTo(cx, cy, x2, y2); g.lineTo(x3, y3); g.stroke(); g.setLineDash(NOD); g.strokeStyle = INK; g.lineWidth = 1.5; }
// a small agent on the road: a box with a lamp. band: a strip of masking tape across its top (a different agent)
function bot(x, y, st, band = 0, r = 0) { tf(x, y, 1, r); box(0, 0, 26, 22, 5, BONE); if (band) fr(-12.2, -6.4, 24.4, 4.6, PAPER); lamp(0, band ? 3.4 : 0.5, st, 4.4); un(); }
// a phone: dark, a keypad of small bone dots. key: its top left key is pressed (gold)
function phone(x, y, s = 1, r = 0, key = 0) {
  tf(x, y, s, r); glass(0, 0, 30, 52, 5); ln(-5, -20, 5, -20, MID, 1.8);
  for (let k = 0; k < 9; k++) { const kx = -8 + (k % 3) * 8, ky = -9 + Math.floor(k / 3) * 9, on = key && k === 0; g.fillStyle = on ? GOLD : BONE; g.beginPath(); g.arc(kx, ky + (on ? 1.2 : 0), on ? 3.1 : 2.4, 0, TAU); g.fill(); }
  un();
}
// a flag on a pole, standing on the timeline. u: how far it has unfurled (0 none, 1 out; it overshoots a little)
function flag(x, u, wave) {
  ln(x, 76, x, 46, GREY, 2.2); disc(x, 76, 2.6, GREY, 1);
  const w = u > 0 ? 24 * (0.25 + 0.75 * u) : 24, c = u > 0 ? PAPER : DIM;
  if (!FLAT) { g.fillStyle = SH; g.beginPath(); g.moveTo(x + 2, 49.5); g.quadraticCurveTo(x + 2 + w / 2, 49.5 + wave, x + 2 + w, 49.5); g.lineTo(x + 2 + w, 63.5); g.quadraticCurveTo(x + 2 + w / 2, 63.5 + wave, x + 2, 63.5); g.closePath(); g.fill(); }
  g.fillStyle = c; g.beginPath(); g.moveTo(x, 47); g.quadraticCurveTo(x + w / 2, 47 + wave, x + w, 47); g.lineTo(x + w, 61); g.quadraticCurveTo(x + w / 2, 61 + wave, x, 61); g.closePath(); g.fill(); g.stroke();
}
// a warning mark: a small gold triangle with an ink bar and dot
function warn(x, y, s = 1) { tf(x, y, s); g.fillStyle = GOLD; g.beginPath(); g.moveTo(0, -7.4); g.lineTo(7.6, 6); g.lineTo(-7.6, 6); g.closePath(); g.fill(); g.stroke(); ln(0, -2.6, 0, 1.4, INK, 1.8); ln(0, 3.9, 0, 4, INK, 1.9); un(); }

const FLAGK = ['flags0', 'flags1', 'flags2', 'flags3', 'flags4'];
function mem1(t, st) {
  // he says it once: the bubble goes to the agent, squares off into a card, and the card files itself. No clock: at once
  const u1 = io(mv(t, 0.45, 0.8)), fold = st ? 1 : mv(t, 0.8, 1.2), u2 = st ? 0.86 : io(mv(t, 1.2, 1.7)), drop = st ? 0.45 : inq(mv(t, 1.66, 1.84)), rip = st ? -1 : t - 1.82, inD = st || t >= 1.66;
  const cx = qp(150, 214, 262, u2), cy = qp(78, 22, 80, u2) + drop * 18;
  if (st) { dl(60, 94, 124, 86); dq(160, 72, 214, 22, 258, 74, 1, 0.45); }
  me(44, 104, 0, st ? 1 : 1 + 0.07 * Math.sin(mv(t, 0.35, 0.52) * PI));
  if (inD) card(cx, cy, 1.3, 0.5 + drop * 1.07);
  tf(st ? 0 : 2.4 * Math.sin(mv(t, 1.82, 2) * PI), 0); drawer(262, 116, 1, null, rip); un();
  agent(150, 104, 44, 38, 1, 6, st ? 1 : 1 + 0.05 * Math.sin(mv(t, 0.8, 1) * PI));
  if (st) return;
  if (t >= 0.35 && t < 0.8) bub(mix(66, 150, u1), mix(88, 78, u1) - Math.sin(u1 * PI) * 9, 0, pop(t - 0.35));
  else if (t >= 0.8 && fold < 0.5) bub(150, 78, 0, 1 - fold * 0.3, 0, 1 - fold * 0.5);      // its tail draws in, its corners square off
  else if (t >= 0.8 && !inD) card(cx, cy, fold < 1 ? 0.9 + 0.4 * back(cl((fold - 0.5) / 0.4)) : 1.3, u2 * 0.5);
}
function mem2(t, st) {
  // a wrong turn. He points to the right way, and the reason, not only the fix, is filed under the word on the second drawer
  const fixed = st || t >= 1.14, hy = st ? 54 : mix(-24, 54, out(mv(t, 0.9, 1.12))) + hop(t, 1.14, -6, 0.13) + hop(t, 1.3, -6, 0.13), wu = st ? 0.78 : io(mv(t, 1.42, 1.86)), wd = st ? 0 : inq(mv(t, 1.84, 1.98));
  let ax = 220, ay = 90;
  if (!st && t < 0.6) { ax = mix(30, 110, io(mv(t, 0.35, 0.6))); ay = 130; }
  else if (!st && t < 1.7) { const u = t < 0.8 ? mv(t, 0.6, 0.8) : 1 - io(mv(t, 1.3, 1.7)); ax = qp(110, 150, 180, u); ay = qp(130, 132, 166, u); }
  else if (!st) { const u = io(mv(t, 1.7, 2.2)), v = cl(u / 0.7), w = cl((u - 0.7) / 0.3); ax = qp(110, 150, 180, v) + 40 * w; ay = qp(130, 128, 90, v); }
  ln(22, 130, 110, 130, MID, 3.2); road(110, 130, 150, 132, 180, 166, MID, 0); road(110, 130, 150, 128, 180, 90, fixed ? BONE : MID, !fixed, 224, 90);
  if (st) dq(184, 150, 226, 84, 262, 120, 1, 0.4);
  if (wd > 0) why(qp(184, 226, 266, wu), qp(150, 84, 122, wu) + wd * 12, 1 - wd * 0.3, 0.2 * (1 - wu));
  tf(st ? 0 : 2.4 * Math.sin(mv(t, 1.98, 2.16) * PI), 0); drawer(266, 150, 1, WS.lessons); un();
  if ((st || t >= 1.3) && wd <= 0) why(qp(184, 226, 266, wu), qp(150, 84, 122, wu), st ? 1 : pop(t - 1.3), 0.2 * (1 - wu));
  xs(st ? 9 : t - 0.8, 196, 172, 0.9, st ? 0.5 : 1);
  bot(ax, ay, st || t >= 2.2 ? 2 : t >= 0.8 && t < 1.3 ? 3 : 0, 0, st ? 0 : wob((t - 0.8) / 0.3) * 0.2);
  tk(st ? 9 : t - 2.2, 240, 76, 1);
  hand(206, hy, 0, 1.1, -1.5708);
}
function mem3(t, st) {
  // another agent on another road heads for the same kind of wrong turn: the card flashes, and it takes the right way
  const up = st ? 1 : back(mv(t, 0.95, 1.15)) - io(mv(t, 2.1, 2.3)), fl = !st && ((t > 0.95 && t < 1.06) || (t > 1.16 && t < 1.27)), go = st ? 1 : io(mv(t, 1.5, 2.1));
  let ax, ay;
  if (!st && t < 0.8) { ax = mix(30, 120, io(mv(t, 0.35, 0.8))); ay = 110; }
  else if (!st && t < 1.5) { const u = t < 0.95 ? mv(t, 0.8, 0.95) * 0.24 : t < 1.2 ? 0.24 + 0.04 * Math.sin(mv(t, 0.95, 1.1) * PI) : 0.24 * (1 - io(mv(t, 1.2, 1.5))); ax = qp(120, 158, 190, u); ay = qp(110, 108, 60, u); }
  else { const v = cl(go / 0.72), w = cl((go - 0.72) / 0.28); ax = qp(120, 160, 200, v) + 30 * w; ay = qp(110, 114, 150, v); }
  ln(22, 110, 120, 110, MID, 3.2); road(120, 110, 158, 108, 190, 60, MID, 1); road(120, 110, 160, 114, 200, 150, st || t >= 1.5 ? BONE : MID, 0, 234, 150);
  xs(9, 194, 55, 0.8, 0.6);                                           // the turn that went wrong before (the cross of the step before, fainter)
  if (st) { g.globalAlpha = 0.5; ln(128, 104, 136, 98, RED, 3); g.globalAlpha = 1; }      // where it began to go wrong
  if (!st && t > 0.95 && t < 1.5) dl(248, 70, ax + 12, ay - 6, mv(t, 0.95, 1.05), 0.6);
  why(266, 78 - up * 15, 1, 0, fl);
  if (up > 0.5) rays(266, 60 - up * 15, 12, 3, st ? 0.9 : 0.5 + 0.5 * Math.sin(t * 20), GOLD, 4);
  drawer(266, 96, 1, WS.lessons);
  bot(ax, ay + (st ? 0 : hop(t, 2.12, 4)), st || t >= 2.1 ? 2 : fl ? 1 : 0, 1, st ? 0 : wob((t - 0.95) / 0.25) * -0.16);
  tk(st ? 9 : t - 2.1, 250, 134, 1);
}
function mem4(t, st) {
  // a question: it does not ask him. A magnifier sweeps the shelf of past conversations, stops on one, and the question is answered
  const sw = st ? 1 : bnc(mv(t, 0.8, 1.66)), mx = mix(100, 229, sw), found = st || t >= 1.6, fly = st ? 0 : io(mv(t, 1.72, 2.1)), ans = st || t >= 2.1;
  const ask = st ? 0 : 0.4 * (io(mv(t, 0.5, 0.65)) - io(mv(t, 0.65, 0.82)));
  me(40, 40, 0);
  dl(56, 100, 44, 62, ask, 0.6);
  ln(110, 86.8, 306, 86.8, MID, 1.6);
  for (let k = 0; k < 14; k++) {
    const x = 117 + 14 * k, h = 14 + (k * 7) % 5, hit = k === 8 && found, near = !ans && Math.abs(mx - x) < 12;
    if (hit && fly > 0) continue;
    g.globalAlpha = hit ? 1 : near ? 0.95 : mx > x && !ans ? 0.75 : 0.5; g.lineWidth = 1.2;
    box(x, 86 - h / 2 - (hit ? 6 * (st ? 1 : out(mv(t, 1.6, 1.72))) : 0), 11, h, 3, BONE, 1); g.lineWidth = 1.5;
  }
  g.globalAlpha = 1;
  if (found && fly > 0 && fly < 1) { tf(qp(229, 150, 62, fly), qp(72, 36, 106, fly), 1, fly * -0.6); box(0, 0, 11, 16, 3, BONE); un(); }
  agent(60, 122, 40, 34, 1, 0, st ? 1 : 1 + 0.06 * Math.sin(mv(t, 2.1, 2.3) * PI)); lamp(60, 122, ans ? 2 : t >= 0.35 ? 1 : 0, 5);
  if (ans) tk(st ? 9 : t - 2.1, 60, 92, 1.1);
  else if (t >= 0.35) { tf(60, 91, 1, wob((t - 0.42) / 0.5) * 0.4); pic(14, 0, 0, 1.5 * pop(t - 0.35), BONE); un(); }
  if (!ans || st) lens(mx, 76, 13);
}
function mem5(t, st) {
  // what he asks for goes straight to done. The agent's own risky idea stops, one short question goes out, a yes comes back
  const r1 = st ? 1 : io(mv(t, 0.35, 0.6)), r2 = st ? 1 : io(mv(t, 0.6, 0.95)), dn = st ? 1 : inq(mv(t, 1.1, 1.22)), ride = st ? 1 : out(mv(t, 1.22, 1.4)), q = st ? 1 : io(mv(t, 1.4, 1.8)), yes = st ? 0.5 : io(mv(t, 1.85, 2.1)), go = st ? 0 : io(mv(t, 2.12, 2.32)), lift = st ? 0 : io(mv(t, 2.08, 2.2));
  const wx = mix(mix(150, 187, ride), 262, go), wy = mix(100, 140, dn);
  ln(52, 70, 244, 70, DIM, 1.4); g.strokeStyle = DIM; g.lineWidth = 1.4; g.beginPath(); g.moveTo(150, 90); g.lineTo(150, 140); g.lineTo(244, 140); g.stroke(); g.strokeStyle = INK; g.lineWidth = 1.5;
  tray(244, 58, 52, 26); tray(244, 128, 52, 26);
  if (r2 >= 1) bub(270, 69, 0, 0.8); tk(st ? 9 : t - 1, 284, 50, 0.9);
  if (st || t >= 1.1) { const sq = st ? 0 : sqz(t, 1.4, 0.12); tf(wx, wy + (ride >= 1 && go <= 0 && !st ? bob() * 0.8 : 0), 1 - sq, 0, 1 + sq); dot(0, 0, 5.4); warn(8, -11, 1); un(); }
  tk(st ? -1 : t - 2.32, 284, 120, 0.9);
  box(206, 140 - lift * 22, 5, 30, 2, STEEL2);                       // the stop bar on the lower lane
  me(36, 70, 0);
  agent(150, 70, 44, 38, 1, 0, st ? 1 : 1 + 0.05 * Math.sin(mv(t, 0.55, 0.75) * PI)); lamp(150, 70, !st && t >= 1.22 && t < 2.1 ? 1 : 2, 5);
  if (!st && t >= 0.35 && r1 < 1) bub(mix(62, 150, r1), 62, 0);
  else if (!st && r2 > 0 && r2 < 1) bub(mix(150, 270, r2), mix(62, 69, r2), 0, 1 - r2 * 0.2);
  if (!st && t >= 1.4 && t < 1.85) bub(mix(128, 66, q), 50 - Math.sin(q * PI) * 8, 2, pop(t - 1.4));
  if (st) { bub(70, 46, 2); dl(84, 92, 120, 86, 1, 0.5); }
  if (st || (t >= 1.85 && yes < 1)) bub(mix(64, 124, yes), 92 + Math.sin(yes * PI) * 6, 3, st ? 1 : pop(t - 1.85));
  if (st || t >= 1.8) hand(40, 106, 2, st ? 1.1 : 1.1 * pop(t - 1.8, 0.24));
}
function mem6(t, st) {
  // he is busy: the question waits, the clock turns, and then the phone rings. One key, and the answer is back with the agent
  const busy = st ? 1 : mv(t, 0.35, 0.7), ring1 = !st && ((t > 1.3 && t < 1.52) || (t > 1.62 && t < 1.84)), key = st || (t >= 1.9 && t < 2.1), fly = st ? 0.5 : io(mv(t, 2.05, 2.35)), gone = !st && t >= 2.32;
  clock(160, 50, 16, st ? 4.71 : mv(t, 0.5, 1.3) * TAU);
  me(272 + busy * 3, 54, key && !st ? 0 : busy > 0.5);
  if (st || ring1) for (let k = 0; k < 2; k++) { g.strokeStyle = BONE; g.lineWidth = 1.8; g.beginPath(); g.arc(262, 124, 26 + k * 7, -0.5, 0.5); g.stroke(); g.beginPath(); g.arc(262, 124, 26 + k * 7, PI - 0.5, PI + 0.5); g.stroke(); g.strokeStyle = INK; g.lineWidth = 1.5; }
  phone(262, 124, 1, ring1 ? Math.sin(t * 70) * 0.1 : 0, key);
  agent(56, 112, 44, 38, 1, 0, st ? 1 : 1 + 0.06 * Math.sin(mv(t, 2.3, 2.4) * PI)); lamp(56, 112, gone ? 2 : 1, 5);
  if (st) dq(246, 112, 160, 70, 84, 104, 1, 0.45);
  if (!gone) bub(108, 82 + (st ? 0 : bob()), 2, st ? 1 : 1 + 0.25 * Math.sin(mv(t, 2.24, 2.32) * PI));
  else rays(108, 82, 8 + (t - 2.32) * 60, 5, 1 - (t - 2.32) / 0.08, BONE, 4);
  if (st || t >= 2.05) tk(st ? 9 : t - 2.05, qp(246, 160, 84, fly), qp(112, 70, 104, fly), 1);
}
function mem7(t, st) {
  // five months, five flags: it was built up one real problem at a time
  let n = 0; for (let k = 0; k < 5; k++) if (st || t >= 0.45 + k * 0.3) n++;
  const last = st ? 9 : n ? t - (0.45 + (n - 1) * 0.3) : -1, end = st ? 9 : t - 1.9, pu = 1 + 0.06 * (last >= 0 && last < 0.2 ? Math.sin(last / 0.2 * PI) : 0) + 0.07 * (end >= 0 && end < 0.24 ? Math.sin(end / 0.24 * PI) : 0);
  ln(36, 76, 284, 76, MID, 1.6);
  for (let k = 0; k < 5; k++) {
    const a = st ? 9 : t - 0.45 - k * 0.3, u = a < 0 ? 0 : back(cl(a / 0.3)), x = 52 + k * 54;
    flag(x, u, a >= 0 && a < 0.6 ? Math.sin(a * 21) * 2.2 * (1 - a / 0.6) : 0);
    word(WS[FLAGK[k]], x + 4, 90, a >= 0 ? 1 : 0.45);
  }
  drawer(80, 152, 0.8 * pu); drawer(160, 152, 0.8 * pu, WS.lessons); phone(240, 148, 0.8 * pu);
}
const MEMORY = { n: 7, still: [0.7, 0.95, 0.9, 0.9, 0.8, 0.85, 0.9], draw(k, i, t, st) { switch (i) { case 0: mem1(t, st); break; case 1: mem2(t, st); break; case 2: mem3(t, st); break; case 3: mem4(t, st); break; case 4: mem5(t, st); break; case 5: mem6(t, st); break; default: mem7(t, st); } } };

// =====================================================================================================================
// apply: the job-application machine (7 steps). Past tense is in the words only; the pictures have no tense.
// =====================================================================================================================
const PX = [118, 152, 190, 134, 172], PY = [138, 139, 136, 125, 124], PR = [-0.12, 0.08, 0.14, 0.1, -0.1], TL = [60, 52, 64, 40, 30], LL = [60, 52, 64, 46, 56], LY = [66, 79, 92, 105, 118], FY = [80, 93, 106, 119, 132];
const SL = 40 / 170, SA = Math.atan2(40, 170);
// an envelope: bone, a V for its flap. tape: a corner of masking tape (a reply) · fl: the flap's flutter
function env(x, y, s = 1, r = 0, tape = 0, fl = 0) {
  tf(x, y, s, r); box(0, 0, 46, 30, 2, BONE); g.beginPath(); g.moveTo(-22.2, -14.2); g.lineTo(0, 3 + fl); g.lineTo(22.2, -14.2); g.stroke();
  if (tape) { tf(15, 8, 1, -0.5); g.lineWidth = 1.1; box(0, 0, 12, 6.4, 1, PAPER, 1); g.lineWidth = 1.5; un(); }
  un();
}
// a ring and a tick, in the dark green of a pass: a check passed. kind 2: an empty dashed ring (a check still missing)
function stamped(x, y, r, kind = 1, s = 1) {
  if (kind === 2) { g.strokeStyle = MID; g.lineWidth = 1.3; g.setLineDash(DASH3); g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.setLineDash(NOD); }
  else { g.strokeStyle = STAMPED; g.lineWidth = r > 5 ? 2 : 1.5; g.beginPath(); g.arc(x, y, r * s, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(x - r * 0.45 * s, y + r * 0.05 * s); g.lineTo(x - r * 0.1 * s, y + r * 0.4 * s); g.lineTo(x + r * 0.5 * s, y - r * 0.38 * s); g.stroke(); }
  g.strokeStyle = INK; g.lineWidth = 1.5;
}
// a letter on the belt: a small page, room at its foot for the two ring marks. m1, m2: 0 none, 1 stamped, 2 still missing · th: his thumb mark (its age)
function letter(x, y, m1, m2, th = -1, s = 1, sy = s) {
  tf(x, y, s, 0, sy); box(0, 0, 20, 26, 1.5, BONE); ln(-6, -8.6, 6, -8.6, INK, 1.4); ln(-6, -4.8, 6, -4.8, INK, 1.4); ln(-6, -1, 1.5, -1, INK, 1.4);
  if (m1) stamped(-4.6, 6.6, 3.4, m1); if (m2) stamped(4.6, 6.6, 3.4, m2);
  if (th >= 0) { g.lineWidth = 1.2; disc(7, -10, 5 * pop(th), GOLD, 1); g.lineWidth = 1.5; }
  un();
}
// a folder with a tab, in masking-tape paper, its pictogram on its face
function folder(x, y, icon, s = 1, r = 0) { tf(x, y, s, r); box(-7, -24, 14, 9, 2.5, PAPER); box(0, 0, 30, 44, 2.5, PAPER); if (icon) pic(icon, 0, 2); un(); }
function clip(x, y, s, r) {
  if (s <= 0) return; tf(x, y, s, r);
  for (let p = 0; p < 2; p++) { g.strokeStyle = p ? STEEL : INK; g.lineWidth = p ? 1.8 : 3.4; g.beginPath(); g.moveTo(-3, 5); g.lineTo(-3, -6); g.arc(0, -6, 3, PI, 0); g.lineTo(3, 8); g.arc(-0.6, 8, 3.6, 0, PI); g.lineTo(-4.2, -1); g.stroke(); }
  un(); g.strokeStyle = INK; g.lineWidth = 1.5;
}
// a rubber stamp hanging on its arm from the top edge: a wood head lettered from the markup, a dark rubber foot. y: the head's middle
function stamp(x, y, w) { ln(x, 0, x, y - 9, GREY, 2.6); box(x, y + 10.5, 50, 5, 1.5, STAMP); box(x, y, 54, 18, 3, WOOD2); word(w, x, y + 0.6); }

function app1(t, st) {
  // postings drop into the in-tray; two of them are the same one, and become one
  const mg = st ? 1 : io(mv(t, 1.6, 1.95)), gl = st ? 0 : Math.sin(mv(t, 1.45, 2) * PI);
  tray(100, 114, 120, 40);
  if (st) { al(0.35); FLAT = true; bub(187, 126, 5, 1, 0.1); FLAT = false; al(1); }      // the one it was merged with
  for (let k = 0; k < 5; k++) {
    const at = 0.4 + k * 0.2, twin = k === 2 || k === 4; if ((!st && t < at) || (k === 4 && mg >= 1)) continue;
    const d = st ? 1 : bnc(mv(t, at, at + 0.3)), x = twin ? mix(PX[k], 181, mg) : PX[k], y = twin ? mix(mix(-14, PY[k], d), 130, mg) : mix(-14, PY[k], d);
    if (twin && gl > 0) halo(x, y, 22, 'w', 0.5 * gl);
    bub(x, y, 0, twin && mg >= 1 && !st ? 1 + 0.25 * Math.sin(mv(t, 1.95, 2.15) * PI) : 1, PR[k] * (twin ? 1 - mg : 1), undefined, twin);
  }
  if (!st && t >= 1.95 && t < 2.25) rays(181, 129, 17 + (t - 1.95) * 40, 6, 1 - (t - 1.95) / 0.3);
}
function app2(t, st) {
  // the postings slide over a sieve made of his rules: the ones that fit fall through with a tick, the rest slide off into the bin
  tray(80, 150, 100, 26); tray(250, 130, 42, 44, DARK);
  // his rules: a small checklist, every row ticked
  box(40, 40, 22, 28, 2, BONE); for (let k = 0; k < 3; k++) { mark(34, 32 + k * 8, 0.36, GREEN, 1.6, 1); ln(39, 32 + k * 8, 46, 32 + k * 8, INK, 1.4); }
  for (let k = 0; k < 4; k++) {
    const at = 0.4 + k * 0.3, fit = k % 2 === 0, slot = k === 0 ? 110 : 150, u = st ? 1 : mv(t, at, at + 0.6); if (u <= 0) continue;
    if (fit) {
      const sl = cl(u / 0.5), dr = bnc(cl((u - 0.5) / 0.5)), x = mix(62, slot, sl), tx = slot - 8;
      if (dr <= 0) bub(x, 58 + (x - 60) * SL, 0, 1, SA);
      else { bub(mix(slot, tx, dr), mix(70 + (slot - 60) * SL, 160, dr), 0, 1, SA * (1 - dr) + Math.sin(dr * PI) * 0.5); stick(st ? 9 : t - at - 0.6, tx + 13, 150, 5.4); }
    } else {
      const sl = cl(u / 0.72), dr = cl((u - 0.72) / 0.28), x = mix(62, 232, sl);
      g.globalAlpha = 1 - dr * 0.45;
      if (dr <= 0) bub(x, 58 + (x - 60) * SL, 0, 1, SA); else bub(mix(232, 266 + k * 3, dr), mix(98, 172 - k * 6, inq(dr)) - Math.sin(dr * PI) * 10, 0, 1 - dr * 0.15, SA + dr * 1.1);
      g.globalAlpha = 1;
    }
  }
  // the sieve: a sloping plate with slots in it
  for (let k = 0; k < 4; k++) { const x0 = k === 0 ? 56 : 78 + k * 40, x1 = k === 3 ? 236 : 102 + k * 40; ln(x0, 70 + (x0 - 60) * SL, x1, 70 + (x1 - 60) * SL, INK, 7); ln(x0, 70 + (x0 - 60) * SL, x1, 70 + (x1 - 60) * SL, BONE, 4.2); }
}
function app3(t, st) {
  // a rack of resumes for different kinds of work; the one that suits this posting comes out and is clipped to it
  const up = st ? 1 : back(mv(t, 0.8, 1.2)), go = st ? 1 : io(mv(t, 1.2, 1.8)), cl2 = st ? 1 : pop(t - 1.8, 0.2), bb = st ? 0 : (t > 2 ? bob() * 0.6 : 0);
  ln(0, 122, 150, 122, MID, 1.6);
  for (let k = -1; k < 4; k++) {
    if (k === 1) continue;
    const a = t - 0.35 - k * 0.1; folder(24 + k * 34, 90 + (st ? 0 : hop(Math.max(a, 0), 0, 3.5, 0.2)), k === 0 ? 12 : k === 2 ? 7 : k === 3 ? 6 : 8);
  }
  for (let k = 0; k < 4; k++) { g.globalAlpha = 0.85 - k * 0.2; fr(k * 9, 40, 9.2, 90, BG); } g.globalAlpha = 1;      // the rack runs off to the left: no count
  if (st) { dl(74, 62, 190, 96, 1, 0.4); g.globalAlpha = 0.4; g.strokeStyle = MID; g.setLineDash(DASH2); rrp(43, 68, 30, 44, 2.5); g.stroke(); g.setLineDash(NOD); g.strokeStyle = INK; g.globalAlpha = 1; }
  // the posting: a ticked bubble with a film frame in it
  bub(244, 114 + bb, 4, 1.35); stick(9, 262, 101 + bb, 5.4);
  folder(mix(58, 212, go), mix(90 - up * 16 + (st ? 0 : hop(Math.max(t - 0.45, 0), 0, 3.5, 0.2)), 104, go) + bb, 13, 1, go * 0.06);
  clip(228, 92 + bb, cl2, 0.5 + (st ? 0 : wob(mv(t, 1.9, 2.2)) * 0.3));
}
function app4(t, st) {
  // the typewriter types by itself: five short lines, a carriage return after each
  let ret = 0, creep = 0, n = 0;
  for (let k = 0; k < 5; k++) { const a = 0.35 + k * 0.35, gr = st ? 1 : mv(t, a, a + 0.22), r = st ? 1 : mv(t, a + 0.22, a + 0.35); ret += io(r); if (gr > 0 && r < 1) creep = r > 0 ? -2.4 * (1 - back(r)) : -2.4 * gr; if (st || t >= a) n++; }
  const top = 108 - ret * 13, cx = 160 + creep, typing = !st && t > 0.35 && t < 2.0;
  // what it writes from: the resume clipped to the posting
  folder(34, 54, 13, 0.62, 0.06); bub(54, 60, 4, 0.82); clip(44, 46, 0.7, 0.5);
  box(cx, (top + 132) / 2, 84, 132 - top, 1.5, BONE);                  // the page, climbing out of the platen
  for (let k = 0; k < n; k++) { const a = 0.35 + k * 0.35, gr = st ? 1 : mv(t, a, a + 0.22); let up = 0; for (let j = k; j < 5; j++) up += st ? 1 : io(mv(t, 0.57 + j * 0.35, 0.7 + j * 0.35)); ln(cx - 32, 121 - up * 13, cx - 32 + TL[k] * gr, 121 - up * 13, INK, 2); }
  box(cx, 131, 130, 10, 5, DARK); disc(cx - 68, 131, 4, STEEL2, 1); disc(cx + 68, 131, 4, STEEL2, 1);
  box(160, 160, 120, 44, 7, DARK);
  for (let k = 0; k < 16; k++) { const dn = typing && (((t * 16.7) | 0) * 7 + 3) % 16 === k ? 1 : 0, dn2 = typing && (((t * 16.7) | 0) * 5 + 11) % 16 === k ? 1 : 0; g.fillStyle = dn || dn2 ? GREY : BONE; g.beginPath(); g.arc(111 + (k % 8) * 14, 152 + (k > 7 ? 14 : 0) + (dn || dn2 ? 1.6 : 0), 3.2, 0, TAU); g.fill(); }
  if (st || (t >= 2.1 && t < 2.4)) { const a = st ? 0.6 : 1 - (t - 2.1) / 0.3; g.globalAlpha = a; g.strokeStyle = BONE; g.lineWidth = 1.8; g.beginPath(); g.arc(238, 126, 7, -1, 0.6); g.stroke(); g.beginPath(); g.arc(238, 126, 12, -1, 0.6); g.stroke(); g.globalAlpha = 1; g.strokeStyle = INK; g.lineWidth = 1.5; }
}
function app5(t, st) {
  // every sentence is tied to a fact; one that is not turns red and is written again; then the two stamps, the wording first
  const h1 = st ? 0 : Math.sin(mv(t, 1.75, 1.99) * PI), h2 = st ? 0 : Math.sin(mv(t, 2.0, 2.24) * PI), jolt = st ? 0 : (t > 1.86 && t < 1.94) || (t > 2.11 && t < 2.19) ? 1.6 : 0;
  // the facts card: a band of masking tape across its top, rows each with a small square
  box(259, 100, 66, 80, 2, BONE); fr(226.8, 60.8, 64.4, 10, PAPER); ln(226.8, 70.8, 291.2, 70.8, INK, 1.2);
  for (let k = 0; k < 5; k++) { g.lineWidth = 1.3; g.strokeRect(234, FY[k] - 2.8, 5.6, 5.6); g.lineWidth = 1.5; ln(245, FY[k], 282 - (k % 2) * 8, FY[k], INK, 1.6); }
  box(120, 104 + jolt, 84, 100, 2, BONE);
  for (let k = 0; k < 5; k++) {
    const y = LY[k] + jolt, bad = k === 3, a = bad ? 1.6 : 0.35 + (k > 3 ? 3 : k) * 0.19, u = st ? 1 : mv(t, a, a + 0.15);
    let w = LL[k], col = INK, dx = 0;
    if (bad && !st) { if (t < 1.1) w = 62; else if (t < 1.2) { w = 62; col = RED; dx = Math.sin(t * 90) * 1.6; } else if (t < 1.4) { w = 62 * (1 - mv(t, 1.2, 1.4)); col = RED; } else w = LL[k] * mv(t, 1.4, 1.6); }
    if (bad && st) { g.globalAlpha = 0.4; ln(88, y + 3.4, 150, y + 3.4, RED, 2); g.globalAlpha = 1; }
    if (w > 0.5) ln(88 + dx, y, 88 + dx + w, y, col, 2.2);
    dl(88 + LL[k] + 4, y, 231, FY[k], u, 0.55);
    if (u >= 1) { g.fillStyle = INK; g.fillRect(235.2, FY[k] - 1.6, 3.2, 3.2); }
  }
  // the two marks at the foot of the letter, and the stamps that leave them
  if (st || t >= 1.9) stamped(96, 139 + jolt, 8, 1, st ? 1 : pop(t - 1.9, 0.12)); if (st || t >= 2.15) stamped(146, 139 + jolt, 8, 1, st ? 1 : pop(t - 2.15, 0.12));
  stamp(94, 22 + h1 * 101, WS.wording); stamp(150, 22 + h2 * 101, WS.facts);
}
function app6(t, st) {
  // the first letters wait under his hand and each gets his thumb. Later ones pass straight through when both marks are on; one with a mark missing stops and waits
  const up1 = !st && t >= 0.58 && t < 0.78, up2 = !st && t >= 1.0 && t < 1.2, rise = st ? 0 : io(mv(t, 1.2, 1.36)) - io(mv(t, 1.92, 2.04));
  const x1 = st ? 246 : t < 0.72 ? mix(-14, 160, out(mv(t, 0.25, 0.55))) : mix(160, 344, inq(mv(t, 0.72, 1.12))), x2 = st ? 292 : t < 1.14 ? mix(-14, 160, out(mv(t, 0.68, 0.98))) : mix(160, 344, inq(mv(t, 1.14, 1.5)));
  const x3 = mix(-14, 344, mv(t, 1.16, 1.62)), x4 = mix(-14, 344, mv(t, 1.4, 1.86)), x5 = st ? 160 : mix(-14, 160, out(mv(t, 1.8, 2.08))), q = st ? 0 : sqz(t, 2.06, 0.14);
  belt(0, 320, t * 50);
  if (st) dl(20, 132, 140, 132, 1, 0.5);
  letter(x1, 124, 1, 1, st ? 9 : t - 0.62, 1.4); letter(x2, 124, 1, 1, st ? 9 : t - 1.04, 1.4);
  if (!st && t > 1.16 && t < 1.62) letter(x3, 124, 1, 1, -1, 1.4); if (!st && t > 1.4 && t < 1.86) letter(x4, 124, 1, 1, -1, 1.4);
  if (st || t >= 1.8) letter(x5, 124 + (st || t < 2.2 ? 0 : bob() * 0.6), 1, 2, -1, 1.4 * (1 + q), 1.4 * (1 - q));
  hand(160, 70 - rise * 22, up1 || up2 ? 2 : 1, up1 ? 0.85 + 0.3 * pop(t - 0.58, 0.16) : up2 ? 0.85 + 0.3 * pop(t - 1.0, 0.16) : 1.15, rise * -0.3);
}
function app7(t, st) {
  // the letter folds into an envelope and leaves, across the dashed line to the outside (a plain box); a reply flies back and lands on him, not on the machine
  const fold = st ? 1 : io(mv(t, 0.35, 0.65)), fly = st ? 0.6 : inq(mv(t, 0.9, 1.4)), back2 = st ? 1 : bnc(mv(t, 1.6, 2.1)), ex = qp(128, 200, 292, fly), ey = qp(104, 66, 98, fly), sh = 1 - 0.55 * mv(fly, 0.78, 1);
  dl(250, 16, 250, 184, 1, 0.3);                                       // out there, past this line
  agent(292, 100, 36, 30, !st && t >= 1.36 && t < 1.72, 0, st ? 1 : 1 + 0.08 * Math.sin(mv(t, 1.38, 1.6) * PI));
  if (st) dq(128, 104, 200, 66, 292, 98, 1, 0.4);
  if (fold < 1) { const h = mix(56, 30, fold); box(128, 104, mix(44, 46, fold), h, 2, BONE); ln(108, 104 - h / 6, 148, 104 - h / 6, MID, 1.2); ln(108, 104 + h / 6, 148, 104 + h / 6, MID, 1.2); if (fold < 0.5) { ln(114, 88, 142, 88, INK, 1.8); ln(114, 96, 142, 96, INK, 1.8); } }
  else if (fly < 1) {
    if (!st && fly > 0.05) { g.globalAlpha = 0.6; ln(ex - 44, ey + 8, ex - 66, ey + 13, BONE, 1.8); ln(ex - 42, ey + 18, ex - 60, ey + 22, BONE, 1.8); g.globalAlpha = 1; }
    env(ex, ey, (st ? 1.5 : 0.9 + 0.6 * pop(t - 0.65, 0.22)) * sh, -0.2 * fly, 0, st ? 0 : Math.sin(t * 40) * 2 * (fly > 0 ? 1 : 0));
  }
  me(52, 112, 0, st ? 1.3 : 1.3 * (1 + 0.07 * Math.sin(mv(t, 2.06, 2.3) * PI)));
  if (st || t >= 1.6) env(qp(292, 180, 76, back2), qp(96, 24, 92, back2), 1, st ? -0.2 : 0.3 - 0.5 * back2, 1);
}
const APPLY = { n: 7, still: [0.9, 0.9, 0.9, 0.9, 0.95, 0.95, 0.9], draw(k, i, t, st) { switch (i) { case 0: app1(t, st); break; case 1: app2(t, st); break; case 2: app3(t, st); break; case 3: app4(t, st); break; case 4: app5(t, st); break; case 5: app6(t, st); break; default: app7(t, st); } } };

export const SCENES = { team: TEAM, social: SOCIAL, trade: TRADE, memory: MEMORY, apply: APPLY };
