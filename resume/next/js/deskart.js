// deskart.js — prop recipes for the far desk (stage 2): the app phone, the taped sheet, the bench, the easel, the
// cube, the tall boxes and the printer behind them, and the desk's dressing. Same slab baker, same hard light and the
// same tape as art.js; nothing here runs per frame.
import { PAL, mulberry32 } from './world.js';
import { bake, box, rbox, cyl, ring, poly, face, flat, decal, rr, drawTape, shade, rgba, mixHex, phoneFace, HK, HAND, STENCIL } from './art.js';

// ---------- cardboard file boxes (the same boxes the first-ad phone leans on) ----------
const CB = { T: '#CFB488', T2: '#D8BF95', S1: '#B29263', S2: '#A5865A' };
const flute = (g, x, y, w, h) => { g.fillStyle = 'rgba(20,17,15,.06)'; for (let i = 2.5; i < w; i += 4.5) g.fillRect(x + i, y, 1, h); };
// One box and its lid: body w x d from height z0, h tall, the lid 2 units proud. at: where the hand hole and the label
// sit on the front (0 left, 1 right). tape: a strip of masking tape over the lid, front to back.
function fileBox(x, y, w, d, z0, h, lid, at, tape = true) {
  const bodyFront = (g, X, Y, W, H) => {
    flute(g, X, Y, W, H);
    const lx = X + (at ? W - 25 : 5), big = H > 46, ly = Y + (big ? 30 : 15), lh = big ? 14 : 12;
    g.fillStyle = 'rgba(20,17,15,.55)'; g.beginPath(); rr(g, lx + 1.5, Y + (big ? 13 : 5), 17, 6.5, 3.2); g.fill();     // hand hole
    g.fillStyle = '#FBFCFD'; g.fillRect(lx, ly, 20, lh); g.strokeStyle = 'rgba(20,17,15,.5)'; g.lineWidth = 0.8; g.strokeRect(lx, ly, 20, lh);
    g.fillStyle = PAL.scribble; g.fillRect(lx + 3, ly + 3.6, 13, 1.5); g.fillRect(lx + 3, ly + 7.6, 9, 1.5);
  };
  const lidFront = (g, X, Y, W, H) => { flute(g, X, Y, W, H); g.fillStyle = 'rgba(20,17,15,.3)'; g.fillRect(X + 1.5, Y + H - 1.8, W - 3, 1.8); };
  const cx = x + w / 2, cy = y + d / 2;
  const lidTop = g => {
    g.fillStyle = 'rgba(20,17,15,.12)'; g.fillRect(x - 2, cy - 0.6, w + 4, 1.2);
    if (tape) { g.fillStyle = rgba(PAL.masking, 0.95); g.fillRect(cx - 7, y - 4, 14, d + 8); g.strokeStyle = 'rgba(20,17,15,.3)'; g.lineWidth = 0.8; g.strokeRect(cx - 7, y - 4, 14, d + 8); }
  };
  return [
    box(x, y, w, d, z0, z0 + h, CB.T, CB.S2, { front: bodyFront }),
    box(x - 2, y - 2, w + 4, d + 4, z0 + h, z0 + h + lid, CB.T2, CB.S1, { front: lidFront, det: lidTop })
  ];
}

// ---------- the app phone: bigger than the first-ad phone (face 170 x 300), so the nine cards dock in it at full size ----------
export const APP = { w: 170, h: 300, r: 16 };
export function appPhone() {
  return bake([
    ...fileBox(3, -76, 102, 64, 0, 150, 34, 1),
    ...fileBox(-105, -70, 106, 62, 0, 140, 34, 0),
    { ...phoneFace(APP.w, APP.h, APP.r, 180), ghost: true }      // the phone itself is drawn each frame (kit.phoneBody): here it only casts its shadow
  ]);
}
// Its screen: the app's mark, two bars where a title would be, and the 3 x 3 tray the cards fly into. No words: the
// only words on it are the ones on the cards. It is all flat bars, so desk.js draws it straight to the screen each
// frame the phone is in view and no canvas is held for it. TRAY: where the nine places and the nine pips are.
export const TRAY = { cx: [29, 85, 141], cy: [150, 190, 230], k: 1, cw: 54, ch: 34, pipX: 40, pipY: 265, pipDX: 10.6 };
export const CELLS = new Path2D();
for (let i = 0; i < 9; i++) rr(CELLS, TRAY.cx[i % 3] - 27, TRAY.cy[i / 3 | 0] - 17, 54, 34, 4);
export function appScreen(g, gold) {
  const ink = PAL.ink, soft = gold ? 'rgba(20,17,15,.5)' : '#A9B4BF', W = APP.w, H = APP.h;
  g.fillStyle = gold ? PAL.gold : '#FBFCFD'; g.fillRect(0, 0, W, H);
  g.fillStyle = gold ? 'rgba(255,255,255,.2)' : '#EDF1F4'; g.fillRect(0, 0, W, 86);
  g.fillStyle = soft; for (let i = 0; i < 3; i++) g.fillRect(128 + i * 9, 14, 5, 5);
  g.fillStyle = ink; g.beginPath(); rr(g, 16, 34, 34, 34, 9); g.fill();                                // the mark: a tick in a rounded square
  g.strokeStyle = gold ? PAL.gold : '#FBFCFD'; g.lineWidth = 4.2; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(24.5, 51.5); g.lineTo(31, 58.5); g.lineTo(42, 43.5); g.stroke();
  g.fillStyle = ink; g.fillRect(60, 39, 60, 9.5); g.fillStyle = soft; g.fillRect(60, 55, 39, 5.5);
  g.fillStyle = gold ? 'rgba(20,17,15,.4)' : '#C5D0DA'; g.fillRect(0, 86, W, 1.2);
  g.fillStyle = ink; g.fillRect(6, 104, 38, 7); g.fillStyle = soft; g.fillRect(6, 116, 66, 4.5);       // a heading over the tray, as two bars
  if (!gold) { g.fillStyle = '#F1F4F6'; g.fill(CELLS); g.setLineDash([3, 2.4]); }
  g.lineWidth = 1; g.strokeStyle = soft; g.stroke(CELLS); g.setLineDash([]);
  g.fillStyle = gold ? 'rgba(20,17,15,.22)' : '#D5DDE4'; for (let i = 0; i < 9; i++) g.fillRect(TRAY.pipX + i * TRAY.pipDX, TRAY.pipY, 5.5, 5.5);   // nine pips
}

// ---------- the job drawn on the desk itself: a floor plan in the desk's own shade (ground-level contrast, under the paper) ----------
// Lines only: desk.js strokes these two paths each frame the plan is in view. An L-shaped plan, 560 x 620 with a
// 200 x 240 notch, five inside walls, four door swings, three dimension lines, a title block. NUMS: where the three
// measurements, the north arrow and the title block's ruled lines (small sprites, planBits) sit.
export const PLAN = { x0: -330, y0: -1236, x1: 404, y1: -416, walls: new Path2D(), thin: new Path2D() };
export const NUMS = [['36', -110, -1222, 0], ['62', -318, -890, -1.5708], ['38', 298, -770, 1.5708]];
(() => {
  const w = PLAN.walls, t = PLAN.thin, R = 46;
  const seg = (p, x0, y0, x1, y1) => { p.moveTo(x0, y0); p.lineTo(x1, y1); };
  // the outer walls, with the way in on the south side
  w.moveTo(-40, -580); w.lineTo(-290, -580); w.lineTo(-290, -1200); w.lineTo(70, -1200); w.lineTo(70, -960); w.lineTo(270, -960); w.lineTo(270, -580); w.lineTo(6, -580);
  // five inside walls, three of them with a door
  seg(t, -290, -900, -230, -900); seg(t, -184, -900, -60, -900);
  seg(t, -60, -1200, -60, -1080); seg(t, -60, -1034, -60, -740);
  seg(t, -60, -740, 160, -740); seg(t, 206, -740, 270, -740);
  seg(t, 100, -740, 100, -580);
  seg(t, -170, -900, -170, -700);
  // four door swings: the leaf, and the quarter circle it sweeps
  seg(t, -230, -900, -230, -900 + R); t.moveTo(-230, -900 + R); t.arc(-230, -900, R, 1.5708, 0, true);
  seg(t, -60, -1080, -60 + R, -1080); t.moveTo(-60 + R, -1080); t.arc(-60, -1080, R, 0, 1.5708);
  seg(t, 206, -740, 206, -740 - R); t.moveTo(206, -740 - R); t.arc(206, -740, R, -1.5708, -3.1416, true);
  seg(t, -40, -580, -40, -580 - R); t.moveTo(-40, -580 - R); t.arc(-40, -580, R, -1.5708, 0);
  // three dimension lines, a tick at each end, a gap where the number sits
  const dim = (x0, y0, x1, y1) => {
    const l = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / l, uy = (y1 - y0) / l, m = l / 2;
    seg(t, x0, y0, x0 + ux * (m - 17), y0 + uy * (m - 17)); seg(t, x0 + ux * (m + 17), y0 + uy * (m + 17), x1, y1);
    for (const [x, y] of [[x0, y0], [x1, y1]]) { seg(t, x - uy * 8, y + ux * 8, x + uy * 8, y - ux * 8); seg(t, x - (ux + uy) * 4.5, y - (uy - ux) * 4.5, x + (ux + uy) * 4.5, y + (uy - ux) * 4.5); }
  };
  dim(-290, -1222, 70, -1222); dim(-318, -1200, -318, -580); dim(298, -960, 298, -580);
  // the title block, bottom right: a box, a column, three ruled lines
  t.rect(250, -480, 150, 60); seg(t, 292, -480, 292, -420); for (const y of [-465, -450, -435]) seg(t, 292, y, 400, y);
  // the north arrow: a ring and a needle
  t.moveTo(345 + 15, -1168); t.arc(345, -1168, 15, 0, 6.2832); seg(t, 345, -1150, 345, -1192); t.moveTo(339, -1181); t.lineTo(345, -1193); t.lineTo(351, -1181);
})();
// the plan's three measurements, in stencil numerals with a foot mark (bake after the fonts are in)
export function planNum(txt) {
  return flat(30, 18, 15, 9, g => {
    g.font = `900 14px ${STENCIL}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#A9B4BF';
    g.fillText(txt, 13.5, 9.8); g.fillRect(13.5 + g.measureText(txt).width / 2 + 1.6, 3.4, 1.6, 4.6);
  }, 0);
}
// a pile's place on the desk: a 70 x 50 box marked at its corners in gold tape, as a floor is marked for a prop
export function pileMark(on) {      // on: its pile has been ploughed (gold tape always means "found"); until then the marks are the desk's own grey
  return flat(84, 64, 42, 32, g => {
    g.translate(42, 32);
    const strip = (x, y, w, h, deg) => {
      if (on) { drawTape(g, x, y, w, h, deg, PAL.gold, 0.8)(); return; }
      g.save(); g.translate(x, y); g.rotate(deg * Math.PI / 180); g.fillStyle = '#D3DBE2'; g.fillRect(-w / 2, -h / 2, w, h); g.strokeStyle = '#A9B4BF'; g.lineWidth = 0.7; g.strokeRect(-w / 2, -h / 2, w, h); g.restore();
    };
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) { strip(sx * 27.5, sy * 25, 15, 5.4, 0); strip(sx * 35, sy * 18.5, 13, 5.4, 90); }
  }, 0.5);
}
// the tick stamped in a pile's box once its card is in the tray: the app's own mark, 26 units, in ink
export function tickMark() {
  return flat(34, 30, 17, 15, g => {
    g.translate(17, 15); g.rotate(-0.05); g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = PAL.ink; g.lineWidth = 5; g.beginPath(); g.moveTo(-10.5, 1); g.lineTo(-3.5, 8.5); g.lineTo(10.5, -9); g.stroke();
  }, 0.4);
}
// ---------- the taped sheet: 168 x 210, gold tape over its four corners ----------
// Face down it is a blank back with the writing showing through, mirrored and faint. Face up it carries his sentence.
// up: which side to bake. Bake after the fonts are in.
export const LINE = { w: 168, h: 210 };
export function lineSheet(text, up) {
  const W = LINE.w, H = LINE.h, pad = 17, M = 14;
  const wrap = (g, fs) => {
    g.font = `700 ${fs}px ${HAND}`;
    const lines = []; let cur = '';
    for (const w of text.split(/\s+/)) { const t = cur ? cur + ' ' + w : w; if (cur && g.measureText(t).width > W - 2 * pad) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur);
    return lines;
  };
  return flat(W + 2 * M, H + 2 * M, W / 2 + M, H / 2 + M, g => {
    g.translate(W / 2 + M, H / 2 + M);
    g.fillStyle = 'rgba(112,128,146,.5)'; g.fillRect(-W / 2 + 1.6, -H / 2 + 2, W, H);                  // it lies flat: a thin shadow
    g.fillStyle = up ? PAL.sheet : '#F3F5F7'; g.fillRect(-W / 2, -H / 2, W, H);
    g.strokeStyle = 'rgba(150,163,176,.85)'; g.lineWidth = 0.8; g.strokeRect(-W / 2 + 0.4, -H / 2 + 0.4, W - 0.8, H - 0.8);
    let fs = 19, lines;
    do { fs -= 0.5; lines = wrap(g, fs); } while (fs > 9 && lines.length * fs * 1.24 > H - 2 * pad - 10);
    const lh = fs * 1.24, y0 = -lines.length * lh / 2 + fs * 0.86;
    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    g.save();
    if (!up) { g.scale(-1, 1); g.fillStyle = 'rgba(150,163,176,.2)'; } else g.fillStyle = PAL.ink;
    lines.forEach((ln, i) => g.fillText(ln, -W / 2 + pad, y0 + i * lh));
    g.restore();
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) drawTape(g, sx * (W / 2 - 5), sy * (H / 2 - 5), 36, 12, sx * sy * 45, PAL.gold, 1)();
  }, 0.5);
}

// ---------- the bench: one laptop, one clamp lamp (its head is drawn per frame, it follows the van) ----------
// Origin = the middle of the bench's front edge. LAMP: where the post's top is on screen, and its foot on the desk.
export const LAMP = { px: -53, py: -110.2, bx: -53, by: -43 };
export function benchSprite() {
  const TOP = '#C8935A', TS = '#96683A', LEG = '#8F5426', LD = '#6B3D1A', st = PAL.steel, sd = '#6E7679';
  const topDet = g => {
    g.fillStyle = 'rgba(74,38,16,.24)'; g.fillRect(-58, -32, 116, 1); g.fillRect(-58, -15, 116, 1);
    g.fillStyle = 'rgba(255,225,180,.18)'; g.fillRect(-58, -31, 116, 1); g.fillRect(-58, -14, 116, 1);
    g.strokeStyle = 'rgba(74,38,16,.16)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(30, -42); g.lineTo(52, -36); g.moveTo(34, -9); g.lineTo(50, -4); g.stroke();
  };
  const apron = (g, x, y, w, h) => { g.fillStyle = 'rgba(20,17,15,.14)'; g.fillRect(x, y + h - 1.3, w, 1.3); g.fillStyle = sd; for (const sx of [x + 7, x + w - 7]) { g.beginPath(); g.arc(sx, y + h / 2 - 0.5, 1.2, 0, 6.2832); g.fill(); } };
  const keys = g => {
    g.fillStyle = '#59636A'; for (let r = 0; r < 4; r++) for (let c = 0; c < 11; c++) g.fillRect(-20.8 + c * 3.8, -30 + r * 3.5, 2.9, 2.5);
    g.fillStyle = '#AEB6BB'; g.fillRect(-7, -14.6, 14, 7.6);
  };
  const screen = (g, x, y, w, h) => {
    g.fillStyle = '#0E161A'; g.beginPath(); rr(g, x + 2.4, y + 2.4, w - 4.8, h - 5.6, 1.4); g.fill();
    g.fillStyle = '#434C52'; g.fillRect(x, y + h - 2.2, w, 2.2);
  };
  return bake([
    box(-55, -45, 6, 6, 0, 36, LEG, LD, { hl: 0 }), box(49, -45, 6, 6, 0, 36, LEG, LD, { hl: 0 }),
    box(-51, -40, 102, 34, 9, 12, '#A9713A', '#7C4A22', { hl: 0 }),                                    // the shelf under it
    box(-55, -7, 6, 6, 0, 36, LEG, LD, { hl: 0 }), box(49, -7, 6, 6, 0, 36, LEG, LD, { hl: 0 }),
    box(-58, -48, 116, 50, 36, 43, TOP, TS, { det: topDet, front: apron }),                            // the top
    rbox(-24, -33, 48, 29, 2.5, 43, 45, '#C9CED2', '#9BA2A7', { hl: 0, ns: 1, det: keys }),            // the laptop
    face(-24, -33, 48, 31, '#2A3136', { lift: 45 * HK, r: 2.5, det: screen }),
    box(-57.5, -47.5, 9, 9, 43, 49, '#7C8588', '#5C6467', { hl: 0, ns: 1 }),                           // the lamp's clamp
    box(-54.6, -44.6, 3.2, 3.2, 49, 112, st, sd, { hl: 0 })                                            // and its post
  ]);
}
// exactly one stool: a round seat, three legs, a foot ring
export function stoolSprite() {
  const LEG = '#8F5426', LD = '#6B3D1A';
  const rings = g => { g.strokeStyle = 'rgba(74,38,16,.3)'; g.lineWidth = 1; for (const r of [8.6, 4.2]) { g.beginPath(); g.arc(0, 0, r, 0, 6.2832); g.stroke(); } };
  return bake([
    box(-10, -2, 3.6, 3.6, 0, 29, LEG, LD, { hl: 0 }), box(6.4, -2, 3.6, 3.6, 0, 29, LEG, LD, { hl: 0 }),
    ring(0, 2, 10, 8.2, 10, 12, '#9AA3A6', '#6E7679', { eo: 1, hl: 0, ns: 1 }),
    box(-1.8, 7, 3.6, 3.6, 0, 29, LEG, LD, { hl: 0 }),
    cyl(0, 0, 13, 29, 33.5, '#C8935A', '#96683A', { det: rings })
  ]);
}
// ---------- the drawing board on its small easel: face 112 x 200. Origin = the middle of its foot line ----------
// PAPER: where the sheet of paper (the loop) sits, from the origin.
export const PAPER = { x: -56, y: -232.6, w: 112, h: 200 };
export function easelSprite() {
  const W = PAL.wood, WD = '#8F5426', WL = '#CB8A4E', BD = '#93714D', BDD = '#6F5236';
  const legs = g => {                                  // the two front legs, splayed: they show beside the board's lower corners
    const quad = (c, a, b, d, e) => { g.fillStyle = c; g.beginPath(); g.moveTo(a, -238); g.lineTo(b, -238); g.lineTo(d, -1); g.lineTo(e, -1); g.closePath(); g.fill(); };
    quad(W, -11, -3, -67, -76); quad(WD, -5.4, -3, -67, -69.4);        // each leg, then the side of it that is away from the light
    quad(W, 3, 11, 76, 67); quad(WD, 8.6, 11, 76, 73.6);
  };
  const board = (g, x, y, w, h) => {
    g.fillStyle = BDD; g.fillRect(x + w - 2.6, y, 2.6, h); g.fillRect(x, y + h - 2.6, w, 2.6);          // its thickness, lower right
    g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(x, y, w, 1.4);
    g.fillStyle = 'rgba(20,17,15,.22)'; g.fillRect(PAPER.x + 1.4, y + 5 + 1.8, PAPER.w, PAPER.h);       // the paper's thin shadow
    g.fillStyle = '#FBFCFD'; g.fillRect(PAPER.x, y + 5, PAPER.w, PAPER.h);
  };
  const clamp = (g, x, y, w, h) => { g.fillStyle = WL; g.fillRect(x, y, w - 2.4, h - 2.4); g.fillStyle = PAL.steel; g.beginPath(); g.arc(x + w / 2 - 1.2, y + h / 2 - 1.2, 2.3, 0, 6.2832); g.fill(); };
  return bake([
    box(-78, -8, 13, 8, 0, 3, WD, WD, { hl: 0 }), box(65, -8, 13, 8, 0, 3, WD, WD, { hl: 0 }),          // feet
    decal(legs),
    box(-67, -10, 134, 11, 36, 41, WL, WD, { hl: 0 }),                                                  // the ledge
    box(-67, -1.5, 134, 2.5, 41, 44, W, WD, { hl: 0, ns: 1 }),                                           // its lip
    face(-61, -3, 122, 210, BD, { lift: 41 * HK, r: 2, sz: 58, sd: 6, det: board }),               // a short shadow: a longer one reaches into the opening frame, where the easel itself is not
    face(-9, -3, 18, 15, WD, { lift: 41 * HK + 204, det: clamp })                                        // the top clamp
  ]);
}
// Over the moving picture: a bulldog clip holding the paper at the top (origin = the middle of the paper's top edge,
// 3 units up), and a bit of masking tape for each lower corner (origin = its own middle). Three small sprites.
export function easelBits() {
  const clip = flat(36, 28, 18, 3, g => {
    g.translate(18, 3);
    g.fillStyle = 'rgba(20,17,15,.25)'; g.fillRect(-14, 1.6, 30, 12);
    g.fillStyle = '#343A40'; g.fillRect(-15, 0, 30, 12);
    g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(-15, 0, 30, 3.2);
    g.strokeStyle = '#C2C9CD'; g.lineWidth = 1.7; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(-8.5, 12); g.lineTo(-5.5, 21); g.lineTo(5.5, 21); g.lineTo(8.5, 12); g.stroke();
  }, 0.5);
  const tape = sd => flat(32, 32, 16, 16, g => { drawTape(g, 16, 16, 24, 8.5, sd * -40, PAL.masking, 0.8)(); }, 0.5);
  return { clip, tl: tape(-1), tr: tape(1) };
}

// ---------- ad 3: a phone leaning on a plain grey cube that rounds off into a ball ----------
export function leanPhone() { return bake([{ ...phoneFace(84, 150, 10, 90), ghost: true }]); }      // only its shadow: the phone is drawn each frame (kit.phoneBody)
// Five sprites, the cube to the ball. The cube has no grain and no detail on purpose: it is the one unfinished thing
// on the desk. Origin = the middle of the cube's front edge.
export function cubeFrames(first) {
  const out = [], G0 = '#B7BABC', G1 = '#8B8F92';
  out.push(bake([box(-25, -38, 50, 38, 0, 60, G0, G1, { hl: 0 })], { grain: 0 }));
  if (first) return out;                                 // only the plain cube: the rest are baked when it starts to round off
  [[7, 0.2], [12, 0.48], [17, 0.76]].forEach(([r, t], i) => {
    const a = mixHex(G0, '#F5BC22', t), b = mixHex(G1, '#C28A08', t), top = 54 - i * 4, q = r * 0.36;
    out.push(bake([
      rbox(-25, -38, 50, 38, r, 0, top, a, b, { hl: 0 }),
      rbox(-25 + q, -38 + q, 50 - 2 * q, 38 - 2 * q, r * 0.85, top, 60 - i * 3, shade(a, 12), a, { hl: 0, ns: 1 })
    ], { grain: 0 }));
  });
  // The ball: the round mascot of the ad. Its body is the stack of discs that gives it its shadow; over that it is shaded
  // in three hard steps like everything else here (gold, a darker side away from the light, one hard highlight: no
  // gradient), and it has a face: two ink eyes and a smile. Seen from here a ball of radius 25 is an ellipse 25 x 29.2.
  const R = 25, N = 16, sl = [], cy = -21 - R * HK, ry = R * Math.sqrt(1 + HK * HK);
  for (let i = 0; i < N; i++) {
    const z0 = 2 * R * i / N, z1 = 2 * R * (i + 1) / N, zm = (z0 + z1) / 2, r = Math.sqrt(R * R - (zm - R) * (zm - R));
    sl.push(cyl(0, -21, r, z0, z1, PAL.gold, PAL.gold, { hl: 0 }));
  }
  sl.push(decal(g => {
    g.save(); g.beginPath(); g.ellipse(0, cy, R + 0.4, ry + 0.4, 0, 0, 6.2832); g.clip();
    g.fillStyle = '#C28A08'; g.fillRect(-R - 2, cy - ry - 2, 2 * R + 4, 2 * ry + 4);                              // the side away from the light
    g.fillStyle = PAL.gold; g.beginPath(); g.ellipse(-5, cy - 5.5, R, ry, 0, 0, 6.2832); g.fill();                // the lit body: the same shape, moved toward the light
    g.fillStyle = '#FFDB6A'; g.beginPath(); g.ellipse(-11, cy - 16.5, 6.4, 3.4, -0.5, 0, 6.2832); g.fill();       // one hard highlight
    g.restore();
    g.fillStyle = PAL.ink;
    for (const x of [-9, 6.5]) { g.beginPath(); g.ellipse(x, cy - 0.5, 2.5, 3.5, 0, 0, 6.2832); g.fill(); }       // two eyes
    g.fillStyle = '#FFFFFF'; for (const x of [-9.8, 5.7]) g.fillRect(x, cy - 2.6, 1.3, 1.3);
    g.strokeStyle = PAL.ink; g.lineWidth = 2.1; g.lineCap = 'round'; g.beginPath(); g.arc(-1.2, cy + 3.4, 7.4, 0.5, 2.64); g.stroke();      // and a smile
  }));
  out.push(bake(sl));
  return out;
}

// ---------- the tall file boxes, and what is behind them ----------
// Two stacks of two. Origin = the middle of their front edge. low: only the bottom row (what is left once the find
// has knocked the top two off).
export function tallBoxes(low) {
  const sl = [...fileBox(-60, -34, 58, 34, 0, 60, 14, 0)];
  if (!low) sl.push(...fileBox(-58, -33, 54, 32, 74, 58, 14, 1, false));
  sl.push(...fileBox(2, -34, 58, 34, 0, 66, 14, 1));
  if (!low) sl.push(...fileBox(5, -33, 52, 31, 80, 52, 14, 0));
  return bake(sl);
}
// One of the top boxes on its way down: standing, origin = the middle of its front edge. i: 0 west, 1 east.
const LOOSE = [[54, 32, 58], [52, 31, 52]];
export function looseBox(i) { const [w, dp, h] = LOOSE[i]; return bake(fileBox(-w / 2, -dp, w, dp, 0, h, 14, i ? 0 : 1, !!i)); }
// ...and where the two end: tipped forward onto their faces in front of the row, lids toward the viewer.
// Origin = the middle of the stack's front edge.
export function fallenBoxes() {
  const sl = [];
  LOOSE.forEach(([w, dp, h], i) => {
    const cx = i ? 32 : -31, y0 = i ? 7 : 2, x = cx - w / 2;
    const back = g => { flute(g, x, y0, w, h); g.fillStyle = 'rgba(20,17,15,.1)'; g.fillRect(x, y0 + h * 0.5, w, 1); };
    const lidEnd = (g, X, Y, W, H) => {                  // the lid's top, now facing out: its centre line, and the tape if it had one
      g.fillStyle = 'rgba(20,17,15,.12)'; g.fillRect(X, Y + H / 2 - 0.6, W, 1.2);
      if (i) { g.fillStyle = rgba(PAL.masking, 0.95); g.fillRect(X + W / 2 - 7, Y, 14, H); g.strokeStyle = 'rgba(20,17,15,.3)'; g.lineWidth = 0.8; g.strokeRect(X + W / 2 - 7, Y, 14, H); }
      g.fillStyle = 'rgba(20,17,15,.3)'; g.fillRect(X + 1.5, Y + H - 1.6, W - 3, 1.6);
    };
    sl.push(box(x, y0, w, h, 0, dp, CB.T, CB.S2, { det: back }), box(x - 2, y0 + h, w + 4, 14, 0, dp + 4, CB.T2, CB.S1, { front: lidEnd }));
  });
  return bake(sl);
}
// The small printer and the panel of five switches beside it, on a steel cart tall enough to clear the boxes that
// stay in front of it. Origin = the find's own spot. The levers and the lamps over them are drawn per frame
// (SWITCH: where each one sits on screen, from the origin). Its paper falls from the west end to the desk.
export const CART = 80;
export const SWITCH = { x0: 13.5, dx: 9.2, y: -8.4 - CART * HK };
export function printerRig() {
  const B = '#E6E3DA', BS = '#C3BFB2', P = '#3A4046', PS = '#23272B', ST = '#9AA3A6', SD = '#7D878A', Z = CART;
  const top = g => {
    g.fillStyle = 'rgba(20,17,15,.14)'; g.fillRect(-56, -3, 54, 1);                                    // the lid line
    g.fillStyle = '#2B2F33'; g.beginPath(); rr(g, -50, -13, 30, 7, 1.5); g.fill();                     // the window on the roll
    g.fillStyle = '#FBFCFD'; g.fillRect(-48, -11.6, 26, 4.2); g.fillStyle = 'rgba(20,17,15,.14)'; g.fillRect(-48, -9.6, 26, 0.8);
    g.fillStyle = '#9AA3A6'; for (const x of [-14, -8.5]) { g.beginPath(); g.arc(x, -9.5, 1.8, 0, 6.2832); g.fill(); }   // two buttons
    g.strokeStyle = PAL.ink; g.lineWidth = 3; g.beginPath(); rr(g, -56, -16, 54, 26, 3); g.stroke();   // an ink keyline (half of it is clipped away)
  };
  const front = (g, x, y, w, h) => {
    g.fillStyle = 'rgba(20,17,15,.5)'; for (let i = 0; i < 7; i++) g.fillRect(x + 18 + i * 3.4, y + 4, 1.6, h - 8);   // a grille
    g.fillStyle = '#1B1D20'; g.fillRect(x + 2, y + h - 5.4, 13, 2.6);                                   // the slot the paper leaves by
    g.strokeStyle = PAL.ink; g.lineWidth = 1.5; g.strokeRect(x + 0.75, y - 0.2, w - 1.5, h - 0.55);
  };
  const plate = g => {
    g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(4, -16, 54, 2);
    for (let i = 0; i < 5; i++) {
      const x = SWITCH.x0 + i * SWITCH.dx;
      g.fillStyle = '#0F1113'; g.beginPath(); g.arc(x, -13.4, 1.9, 0, 6.2832); g.fill();              // the lamp's socket
      g.fillStyle = '#AEB6BB'; g.beginPath(); g.arc(x, -3, 3, 0, 6.2832); g.fill();                    // the switch's collar
      g.fillStyle = '#5E676B'; g.beginPath(); g.arc(x, -3, 1.5, 0, 6.2832); g.fill();
    }
  };
  const leg = (x, y) => box(x, y, 3.4, 3.4, 0, Z - 4, ST, SD, { hl: 0 });
  const paper = (g, x, y, w, h) => {                                                                   // the paper on its way down: feed holes, a fold
    g.fillStyle = 'rgba(150,163,176,.9)'; g.fillRect(x, y, 0.8, h); g.fillRect(x + w - 0.8, y, 0.8, h);
    g.fillStyle = '#B9C4CE'; for (let yy = 3; yy < h - 1; yy += 6) { g.beginPath(); g.arc(x + 2.4, y + yy, 0.95, 0, 6.2832); g.arc(x + w - 2.4, y + yy, 0.95, 0, 6.2832); g.fill(); }
    g.fillStyle = 'rgba(150,163,176,.5)'; g.fillRect(x, y + h * 0.5, w, 0.7);
  };
  return bake([
    decal(g => { g.fillStyle = PAL.ink; for (const x of [-55, 57]) { g.beginPath(); g.arc(x, 9.5, 3.2, 0, 6.2832); g.fill(); } }),      // two castors
    leg(-58, -34), leg(56.6, -34),
    box(-56, -32, 114, 40, 22, 25, ST, SD, { hl: 0 }),                                                  // a shelf
    leg(-58, 6.6), leg(56.6, 6.6),
    box(-58, -34, 118, 44, Z - 4, Z, ST, SD, { det: g => { g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(-58, -34, 118, 2); } }),
    rbox(-56, -16, 54, 26, 3, Z, Z + 22, B, BS, { det: top, front }),
    box(4, -16, 54, 24, Z, Z + 9, P, PS, { det: plate, hl: 0 }),
    face(-54, 10.5, 16, (Z + 3) * HK, PAL.sheet, { det: paper, sz: 0 })
  ]);
}
// The printer's paper: a strip of continuous form with feed holes down both edges, lying where it has snaked out past
// the boxes. Returns { sp, pts } — pts is its centre line sampled every 3 units, [x, y, nx, ny], from the same origin.
export function paperStrip() {
  const ctl = [[-40, 15], [-47, 14], [-80, 6], [-106, 14], [-110, 38], [-92, 62], [-103, 84], [-121, 90], [-135, 92]];
  const raw = [];
  for (let i = 1; i < ctl.length - 2; i++) {                             // Catmull-Rom through the control points
    const p0 = ctl[i - 1], p1 = ctl[i], p2 = ctl[i + 1], p3 = ctl[i + 2];
    for (let k = 0; k < 16; k++) {
      const t = k / 16, t2 = t * t, t3 = t2 * t;
      raw.push([0.5 * (2 * p1[0] + (p2[0] - p0[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (3 * p1[0] - p0[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (p2[1] - p0[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (3 * p1[1] - p0[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  const pts = []; let acc = 0, prev = raw[0];
  pts.push([prev[0], prev[1], 0, 1]);
  for (const q of raw) { acc += Math.hypot(q[0] - prev[0], q[1] - prev[1]); prev = q; if (acc >= 3) { acc = 0; pts.push([q[0], q[1], 0, 1]); } }
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    pts[i][2] = -(b[1] - a[1]) / l; pts[i][3] = (b[0] - a[0]) / l;
  }
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  x0 -= 12; y0 -= 12; x1 += 12; y1 += 12;
  const line = (g, off) => { g.beginPath(); pts.forEach((p, i) => { const x = p[0] + p[2] * off, y = p[1] + p[3] * off; i ? g.lineTo(x, y) : g.moveTo(x, y); }); };
  const sp = flat(x1 - x0, y1 - y0, -x0, -y0, g => {
    g.translate(-x0, -y0); g.lineJoin = 'round'; g.lineCap = 'butt';
    g.save(); g.translate(1.3, 1.7); g.strokeStyle = 'rgba(112,128,146,.5)'; g.lineWidth = 17.4; line(g, 0); g.stroke(); g.restore();
    g.strokeStyle = 'rgba(150,163,176,.9)'; g.lineWidth = 17.4; line(g, 0); g.stroke();
    g.strokeStyle = PAL.sheet; g.lineWidth = 16; line(g, 0); g.stroke();
    g.fillStyle = '#B9C4CE';
    pts.forEach((p, i) => {
      if (i % 2 === 0) for (const sd of [-6.1, 6.1]) { g.beginPath(); g.arc(p[0] + p[2] * sd, p[1] + p[3] * sd, 0.95, 0, 6.2832); g.fill(); }   // feed holes
      if (i % 9 === 4) { g.strokeStyle = 'rgba(150,163,176,.55)'; g.lineWidth = 0.7; g.setLineDash([1.4, 1.2]); g.beginPath(); g.moveTo(p[0] - p[2] * 8, p[1] - p[3] * 8); g.lineTo(p[0] + p[2] * 8, p[1] + p[3] * 8); g.stroke(); g.setLineDash([]); }   // a fold
    });
  }, 0.5);
  return { sp, pts };
}

// ---------- what the decoy pile hides: a chain of five paperclips, nothing else ----------
export function clipChain() {
  const clip = g => {
    g.beginPath(); g.moveTo(7, -3); g.lineTo(20, -3); g.arc(20, 0, 3, -1.5708, 1.5708); g.lineTo(5, 3); g.arc(5, -0.75, 3.75, 1.5708, 4.7124);
    g.lineTo(21.5, -4.5); g.arc(21.5, 0, 4.5, -1.5708, 1.5708); g.lineTo(9, 4.5);
  };
  const links = [[-52, 8, -0.5], [-32, -3, 0.38], [-11, 4, -0.3], [9, -3, 0.42], [29, 6, -0.16]];
  return flat(124, 60, 62, 30, g => {
    g.translate(62, 30); g.lineCap = 'round'; g.lineJoin = 'round';
    for (let pass = 0; pass < 3; pass++) for (const [x, y, a] of links) {
      g.save(); g.translate(x + (pass ? 0 : 1), y + (pass ? 0 : 1.4)); g.rotate(a);
      g.strokeStyle = pass === 0 ? 'rgba(20,17,15,.24)' : pass === 1 ? '#77828A' : '#D0D6D9'; g.lineWidth = pass === 2 ? 0.7 : 2.1;
      if (pass === 2) g.translate(-0.3, -0.4);
      clip(g); g.stroke(); g.restore();
    }
  }, 0.4);
}

// ---------- dressing ----------
export function mugSprite() {
  const W = '#F4F1E8', WS = '#D2CDBE';
  const coffee = g => {
    g.fillStyle = '#E4DFD1'; g.beginPath(); g.arc(0, 0, 11, 0, 6.2832); g.fill();
    g.fillStyle = '#4A3222'; g.beginPath(); g.arc(0, 0, 8.8, 0, 6.2832); g.fill();
    g.fillStyle = '#6A4930'; g.beginPath(); g.arc(-1, -1, 6.6, 0, 6.2832); g.fill();
    g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(-3.2, -3.6, 2.6, 1, -0.6, 0, 6.2832); g.fill();
  };
  return bake([
    rbox(9, -3.2, 9.5, 6.4, 2.8, 5, 18, W, WS, { hl: 0 }),                // the handle
    cyl(0, 0, 11, 0, 23, W, WS, { det: coffee, hl: 0 })
  ]);
}
// n screws (1 to 4), each lying its own way, and one other bit of hardware: a wall plug (extra 0) or a wing nut (1)
export function screwsSprite(seed, n = 3, extra = 0) {
  const r = mulberry32(seed);
  return flat(72, 52, 36, 26, g => {
    g.translate(36, 26);
    const at = [], a0 = r() * 6.2832, m = n + 1;
    for (let i = 0; i < m; i++) { const dd = (n < 2 ? 8 : 13) + r() * 7, a = a0 + i * 6.2832 / m + (r() - 0.5) * 0.7, h = r() * 6.2832; at.push([Math.cos(a) * dd - (i < n ? Math.cos(h) * 7 : 0), Math.sin(a) * dd * 0.8 - (i < n ? Math.sin(h) * 7 : 0), h]); }
    for (const sh of [1, 0]) at.forEach(([x, y, a], i) => {
      g.save(); g.translate(x + sh * 0.9, y + sh * 1.1); g.rotate(a);
      if (i === n && extra === 0) {                        // a wall plug: a ribbed sleeve with a collar
        if (sh) { g.fillStyle = 'rgba(20,17,15,.22)'; g.fillRect(-7, -2.2, 14, 4.4); }
        else {
          g.fillStyle = '#C9CED2'; g.beginPath(); g.moveTo(-7, -2.2); g.lineTo(6, -1.5); g.lineTo(7, 0); g.lineTo(6, 1.5); g.lineTo(-7, 2.2); g.closePath(); g.fill();
          g.fillStyle = '#E3E7E9'; g.fillRect(-7, -2.6, 2.4, 5.2);
          g.strokeStyle = '#8D979B'; g.lineWidth = 0.7; for (let k = -3; k < 6; k += 2.2) { g.beginPath(); g.moveTo(k, -1.9); g.lineTo(k, 1.9); g.stroke(); }
        }
      } else if (i === n) {                                // a wing nut, seen from above
        const wings = () => { g.beginPath(); g.moveTo(-2, -2); g.lineTo(-8.5, -4.2); g.lineTo(-9, 0.6); g.lineTo(-2, 2); g.closePath(); g.fill(); g.beginPath(); g.moveTo(2, -2); g.lineTo(8.5, -4.2); g.lineTo(9, 0.6); g.lineTo(2, 2); g.closePath(); g.fill(); };
        if (sh) { g.fillStyle = 'rgba(20,17,15,.22)'; wings(); g.beginPath(); g.arc(0, 0, 3.6, 0, 6.2832); g.fill(); }
        else { g.fillStyle = '#9AA3A6'; wings(); g.fillStyle = '#B9C1C5'; g.beginPath(); g.arc(0, 0, 3.6, 0, 6.2832); g.fill(); g.fillStyle = '#4A5257'; g.beginPath(); g.arc(0, 0, 1.6, 0, 6.2832); g.fill(); }
      } else if (sh) { g.fillStyle = 'rgba(20,17,15,.22)'; g.beginPath(); g.arc(0, 0, 3.4, 0, 6.2832); g.fill(); g.fillRect(2, -1.3, 13, 2.6); }
      else {
        g.fillStyle = '#8D979B'; g.beginPath(); g.moveTo(2, -1.5); g.lineTo(13, -1.1); g.lineTo(16, 0); g.lineTo(13, 1.1); g.lineTo(2, 1.5); g.closePath(); g.fill();
        g.strokeStyle = '#5E676B'; g.lineWidth = 0.7; for (let k = 4; k < 14; k += 2.2) { g.beginPath(); g.moveTo(k, -1.4); g.lineTo(k + 1, 1.4); g.stroke(); }
        g.fillStyle = '#B9C1C5'; g.beginPath(); g.arc(0, 0, 3.4, 0, 6.2832); g.fill();
        g.strokeStyle = '#5E676B'; g.lineWidth = 1; g.beginPath(); g.moveTo(-2.1, 0); g.lineTo(2.1, 0); g.moveTo(0, -2.1); g.lineTo(0, 2.1); g.stroke();
      }
      g.restore();
    });
  }, 0.5);
}
// ---------- three things on the desk that no gust can move ----------
// a tape dispenser, 40 x 18, 16 high: a weighted base, the roll on edge in its cradle, a tongue of tape out over the
// cutter. on: the tape is gold only once the Workeey track has a find (full tape colour always means "found")
export function dispenserSprite(on) {
  const B = '#3A4046', BS = '#23272B', T = on ? PAL.gold : '#BBAF8E', TS = on ? PAL.goldDeep : '#8E8468';
  return bake([
    rbox(-20, -9, 40, 18, 4, 0, 8, B, BS, { det: g => { g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(-20, -9, 40, 2.4); g.fillStyle = '#17191B'; g.beginPath(); rr(g, -14, -5.6, 21, 11.2, 2.5); g.fill(); } }),
    box(-13, -3.4, 19, 6.8, 2, 16, T, TS, { hl: 0, det: g => { g.fillStyle = '#D9C9A6'; g.fillRect(-6.4, -3.4, 5.8, 6.8); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(-13, -3.4, 19, 1.4); } }),
    box(13, -6, 4.4, 12, 8, 11, '#C9CED2', '#8C9598', { hl: 0, det: g => { g.fillStyle = '#5E676B'; for (let y = -5; y < 6; y += 2) g.fillRect(16, y, 1.4, 1); } }),
    poly([[5, -3.2], [24.5, -3.2], [26, -1.6], [24.5, 0], [26, 1.6], [24.5, 3.2], [5, 3.2]], 11, 11.6, T, TS, { hl: 0, det: g => { g.strokeStyle = 'rgba(20,17,15,.55)'; g.lineWidth = 0.8; g.strokeRect(5, -3.2, 21, 6.4); } })
  ], { rot: -0.3 });
}
// a clipboard, 60 x 84: hardboard, a job sheet with tick boxes under the easel's own bulldog clip
export function clipboardSprite(a) {
  return bake([box(-30, -42, 60, 84, 0, 3, '#93714D', '#6F5236', {
    det: g => {
      g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(-30, -42, 60, 1.6);
      g.fillStyle = 'rgba(20,17,15,.22)'; g.fillRect(-23.6, -29.2, 50, 66); g.fillStyle = '#FBFCFD'; g.fillRect(-25, -31, 50, 66);
      g.strokeStyle = 'rgba(150,163,176,.85)'; g.lineWidth = 0.8; g.strokeRect(-24.6, -30.6, 49.2, 65.2);
      g.strokeStyle = PAL.scribble; g.lineCap = 'round'; g.lineWidth = 2.8; g.beginPath(); g.moveTo(-19, -19); g.lineTo(2, -19); g.stroke();
      g.lineWidth = 1; for (let i = 0; i < 5; i++) { const y = -10 + i * 8.6; g.strokeRect(-19, y, 5.2, 5.2); g.beginPath(); g.moveTo(-10, y + 2.6); g.lineTo(18 - (i * 5) % 9, y + 2.6); g.stroke(); }
      g.strokeStyle = PAL.ink; g.lineWidth = 1.4; g.lineJoin = 'round'; for (const i of [0, 1, 3]) { const y = -10 + i * 8.6; g.beginPath(); g.moveTo(-18.2, y + 2.6); g.lineTo(-16.4, y + 4.6); g.lineTo(-13.2, y - 0.6); g.stroke(); }
      g.fillStyle = 'rgba(20,17,15,.25)'; g.fillRect(-14, -39.4, 30, 12); g.fillStyle = '#343A40'; g.fillRect(-15, -41, 30, 12);      // the bulldog clip
      g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(-15, -41, 30, 3.2);
      g.strokeStyle = '#C2C9CD'; g.lineWidth = 1.7; g.beginPath(); g.moveTo(-8.5, -29); g.lineTo(-5.5, -20); g.lineTo(5.5, -20); g.lineTo(8.5, -29); g.stroke();
    }
  })], { rot: a });
}
// a three-drawer organiser, 70 x 50, 30 high, grey steel: three drawer fronts, each with a pull and a blank label
export function organiserSprite() {
  const T = '#B9C0C4', S = '#8C9598';
  const front = (g, x, y, w, h) => {
    for (let i = 0; i < 3; i++) {
      const dx = x + 2 + i * (w - 4) / 3, dw = (w - 4) / 3 - 1.6;
      g.fillStyle = '#A7AFB3'; g.fillRect(dx, y + 2, dw, h - 4); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(dx, y + 2, dw, 1.2);
      g.fillStyle = 'rgba(20,17,15,.3)'; g.fillRect(dx, y + h - 2.8, dw, 0.8);
      g.fillStyle = '#FBFCFD'; g.fillRect(dx + 3, y + 4.6, dw - 6, 4.4); g.fillStyle = PAL.scribble; g.fillRect(dx + 4.6, y + 6.2, dw - 12, 1.1);
      g.fillStyle = '#3A4046'; g.beginPath(); rr(g, dx + dw / 2 - 5, y + 11.2, 10, 2.8, 1.4); g.fill();
    }
  };
  const top = g => { g.fillStyle = 'rgba(20,17,15,.1)'; g.fillRect(-35, -25, 70, 1.2); g.fillRect(-11.8, -25, 0.9, 50); g.fillRect(11, -25, 0.9, 50); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(-35, 23, 70, 2); };
  return bake([box(-35, -25, 70, 50, 0, 30, T, S, { front, det: top })]);
}
export function rulerSprite(a) {
  return bake([box(-70, -7, 140, 14, 0, 1.2, '#C5CCD0', '#7E8689', {
    det: g => {
      g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(-70, -7, 140, 2.2);
      g.fillStyle = 'rgba(20,17,15,.62)'; for (let i = 0; i <= 56; i++) { const l = i % 8 === 0 ? 7 : i % 4 === 0 ? 5 : 3; g.fillRect(-68 + i * 2.43, 7 - l, 0.7, l); }
      g.fillStyle = 'rgba(20,17,15,.34)'; g.beginPath(); g.arc(63.5, -2, 2, 0, 6.2832); g.fill();
    }
  })], { rot: a });
}
