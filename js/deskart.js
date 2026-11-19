// deskart.js — prop recipes for the desk: the app phone, the feature cards' big faces, the taped sheet, the bench, the
// easel, the cube, the stamp and its pad, the receipt spike and its tally counter, the three small screens, the tall boxes and the power strip
// behind them, and the desk's dressing. The same slab routine, same hard light and the
// same tape as art.js; nothing here runs per frame.
import { PAL, mulberry32 } from './world.js';
import { mk, bake, box, rbox, cyl, ring, poly, face, flat, decal, rr, drawTape, shade, rgba, mixHex, phoneFace, HK, HAND, STENCIL } from './art.js';

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
// ---------- the taped sheet: 180 x 244, gold tape over its four corners ----------
// Face down it is a blank back with the writing showing through, mirrored and faint. Face up it carries his sentence
// in full, his name under it, and one small line at the foot. t = { quote, sign, small } · up: which side to bake.
// Bake after the fonts are in.
export const LINE = { w: 180, h: 244 };
export function lineSheet(t, up) {
  const W = LINE.w, H = LINE.h, pad = 17, M = 14, IW = W - 2 * pad;
  const wrap = (g, text, font) => {
    g.font = font;
    const lines = []; let cur = '';
    for (const w of text.split(/\s+/)) { const q = cur ? cur + ' ' + w : w; if (cur && g.measureText(q).width > IW) { lines.push(cur); cur = w; } else cur = q; }
    if (cur) lines.push(cur);
    return lines;
  };
  return flat(W + 2 * M, H + 2 * M, W / 2 + M, H / 2 + M, g => {
    g.translate(W / 2 + M, H / 2 + M);
    g.fillStyle = 'rgba(112,128,146,.5)'; g.fillRect(-W / 2 + 1.6, -H / 2 + 2, W, H);                  // it lies flat: a thin shadow
    g.fillStyle = up ? PAL.sheet : '#F3F5F7'; g.fillRect(-W / 2, -H / 2, W, H);
    g.strokeStyle = 'rgba(150,163,176,.85)'; g.lineWidth = 0.8; g.strokeRect(-W / 2 + 0.4, -H / 2 + 0.4, W - 0.8, H - 0.8);
    // the small line and the name keep their sizes; the sentence is as large as the room above them allows
    const sf = 10.5, sl = wrap(g, t.small, `700 ${sf}px ${HAND}`), sh = sl.length * sf * 1.24, nf = 15, top = -H / 2 + pad + 6, foot = H / 2 - pad - 4;
    // his name, signed at the right: on one line, or (too long for the sheet) broken after its comma, the second line smaller
    g.font = `700 ${nf}px ${HAND}`;
    const cm = t.sign.indexOf(', '), sg = g.measureText(t.sign).width > IW && cm > 0 ? [t.sign.slice(0, cm + 1), t.sign.slice(cm + 2)] : [t.sign];
    const room = foot - sh - 12 - nf * (sg.length > 1 ? 2.5 : 1.5) - top;
    let fs = 20.5, lines;
    do { fs -= 0.5; lines = wrap(g, t.quote, `700 ${fs}px ${HAND}`); } while (fs > 9 && lines.length * fs * 1.24 > room);
    const lh = fs * 1.24;
    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    g.save();
    const ink = c => { g.fillStyle = up ? c : 'rgba(150,163,176,.2)'; };
    if (!up) g.scale(-1, 1);
    ink(PAL.ink); g.font = `700 ${fs}px ${HAND}`;
    lines.forEach((ln, i) => g.fillText(ln, -W / 2 + pad, top + fs * 0.86 + i * lh));
    const ny = top + lines.length * lh + nf * 1.1;
    g.font = `700 ${nf}px ${HAND}`; g.textAlign = 'right'; g.fillText(sg[0], W / 2 - pad, ny);
    g.fillRect(W / 2 - pad - g.measureText(sg[0]).width, ny + 3.4, g.measureText(sg[0]).width, 1.2);      // underlined, as a name is signed
    if (sg[1]) { g.font = `700 ${nf - 2.5}px ${HAND}`; g.fillText(sg[1], W / 2 - pad, ny + nf * 1.05); }
    ink('#4B555C'); g.font = `700 ${sf}px ${HAND}`; g.textAlign = 'left';
    sl.forEach((ln, i) => g.fillText(ln, -W / 2 + pad, foot - sh + sf * 0.9 + i * sf * 1.24));
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
    const a = mixHex(G0, '#444A51', t), b = mixHex(G1, '#2B2F34', t), top = 54 - i * 4, q = r * 0.36;
    out.push(bake([
      rbox(-25, -38, 50, 38, r, 0, top, a, b, { hl: 0 }),
      rbox(-25 + q, -38 + q, 50 - 2 * q, 38 - 2 * q, r * 0.85, top, 60 - i * 3, shade(a, 10), a, { hl: 0, ns: 1 })
    ], { grain: 0 }));
  });
  // What it becomes: the mascot of the ad itself. A charcoal egg (widest a third of the way up), two gold eyes, a gold
  // beak, the small gold mark under it, two feet. Its body is the stack of discs that gives it its shadow; over that it
  // is shaded in three hard steps like everything else here (a lit body, a darker side away from the light, one hard
  // highlight: no gradient).
  const R = 25, N = 18, ZC = 24, ZT = 70, sl = [], C0 = '#474D55', C1 = '#2A2E33';
  const rad = z => R * Math.sqrt(Math.max(0, 1 - Math.pow(z <= ZC ? (ZC - z) / ZC : (z - ZC) / (ZT - ZC), 2)));
  for (let i = 0; i < N; i++) {
    const z0 = ZT * i / N, z1 = ZT * (i + 1) / N;
    sl.push(cyl(0, -21, Math.max(2, rad((z0 + z1) / 2)), z0, z1, C0, C0, { hl: 0 }));
  }
  const cy = -21 - ZT * HK / 2 - 3, ry = ZT * HK / 2 + 14;
  sl.push(decal(g => {
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = C1; g.fillRect(-R - 4, cy - ry - 6, 2 * R + 8, 2 * ry + 12);                                    // the side away from the light
    g.fillStyle = C0; g.beginPath(); g.ellipse(-5, cy - 5, R, ry, 0, 0, 6.2832); g.fill();                        // the lit body: the same shape, moved toward the light
    g.fillStyle = '#6A727B'; g.beginPath(); g.ellipse(-11, cy - 19, 6.6, 3.6, -0.5, 0, 6.2832); g.fill();         // one hard highlight
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = C1; for (const [x, y] of [[-10, -8.6], [9.5, -7.8]]) { g.beginPath(); g.ellipse(x, y, 7.4, 3.4, 0, 0, 6.2832); g.fill(); }      // two feet
    g.fillStyle = PAL.gold;
    g.beginPath(); g.ellipse(-10.5, cy - 6.5, 3.5, 2.9, -0.2, 0, 6.2832); g.fill();                              // two gold eyes
    g.beginPath(); g.ellipse(6.5, cy - 8, 3.9, 3, 0.1, 0, 6.2832); g.fill();
    g.beginPath(); g.moveTo(-6.2, cy + 0.6); g.quadraticCurveTo(-2.2, cy - 1.2, 1.8, cy + 0.2); g.quadraticCurveTo(-0.6, cy + 6.4, -2.6, cy + 7.2); g.quadraticCurveTo(-4.6, cy + 5, -6.2, cy + 0.6); g.fill();      // the beak, point down
    g.beginPath(); g.ellipse(0.5, cy + 19, 2.3, 2, 0, 0, 6.2832); g.fill();                                      // the small mark under it
    g.beginPath(); g.ellipse(1.8, cy + 23.4, 1.2, 2.3, -0.3, 0, 6.2832); g.fill();
    g.fillStyle = '#C28A08'; g.fillRect(-12.6, cy - 4.6, 4.6, 0.9); g.fillRect(4.2, cy - 6, 5, 0.9);              // each eye's lower lid: a hard step
  }));
  out.push(bake(sl));
  return out;
}

// ---------- the tall file boxes: two stacks of two. Origin = the middle of their front edge ----------
export function tallBoxes() {
  return bake([
    ...fileBox(-60, -34, 58, 34, 0, 60, 14, 0), ...fileBox(-58, -33, 54, 32, 74, 58, 14, 1, false),
    ...fileBox(2, -34, 58, 34, 0, 66, 14, 1), ...fileBox(5, -33, 52, 31, 80, 52, 14, 0)
  ]);
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

// ---------- the big face of a feature card: its stencilled word and its short gloss, as it is held up at its pile ----------
// 116 x 66: at 0.47 it is the size of the card that flies to the tray (art.cardSprite), which carries the word alone.
export const BIG = { w: 116, h: 66, k: 54 / 116 };
export function cardBig(word, gloss) {
  const W = BIG.w, H = BIG.h;
  return bake([rbox(-W / 2, -H / 2, W, H, 6, 0, 2.2, PAL.gold, PAL.goldDeep, {
    hl: 0, det: g => {
      g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(-W / 2, -H / 2, W, 17);
      g.lineWidth = 4; g.strokeStyle = PAL.ink; g.beginPath(); rr(g, -W / 2, -H / 2, W, H, 6); g.stroke();
      g.fillStyle = PAL.ink; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      // the gloss, in his hand: one line if it fits, else two
      let gs = 11.5, lines = [gloss]; g.font = `700 ${gs}px ${HAND}`;
      while (gs > 10 && g.measureText(gloss).width > W - 16) { gs -= 0.5; g.font = `700 ${gs}px ${HAND}`; }
      if (g.measureText(gloss).width > W - 16) {
        const ws = gloss.split(' '); let best = 1, bd = 1e9;
        for (let i = 1; i < ws.length; i++) { const d = Math.abs(g.measureText(ws.slice(0, i).join(' ')).width - g.measureText(ws.slice(i).join(' ')).width); if (d < bd) { bd = d; best = i; } }
        lines = [ws.slice(0, best).join(' '), ws.slice(best).join(' ')];
      }
      const gh = lines.length * (gs + 1.5), sp = word.indexOf(' '), room = H - 14 - gh;
      // the word, stencilled: on one line, or (two words) one above the other
      const parts = sp > 0 && room >= 30 ? [word.slice(0, sp), word.slice(sp + 1)] : [word];
      let fs = parts.length > 1 ? Math.min(19, room / 2) : Math.min(31, room); g.font = `900 ${fs}px ${STENCIL}`;
      const mw = Math.max(...parts.map(p => g.measureText(p).width)); if (mw > W - 18) { fs *= (W - 18) / mw; g.font = `900 ${fs}px ${STENCIL}`; }
      const wh = parts.length * fs * 0.84, top = -H / 2 + 6 + (room - wh) / 2;
      parts.forEach((p, i) => g.fillText(p, 0, top + fs * 0.74 + i * fs * 0.86));
      g.font = `700 ${gs}px ${HAND}`;
      lines.forEach((ln, i) => g.fillText(ln, 0, H / 2 - 7 - gh + gs * 0.86 + i * (gs + 1.5)));
    }
  })]);
}

// ---------- quality: a rubber stamp on its ink pad, the tin's lid standing open behind it ----------
// Origin = the middle of the pad's front edge. The stamp itself is its own sprite (it hops to the slip and back).
export function padSprite() {
  const T = '#3A4046', TS = '#23272B', L = '#4A5056';
  const felt = g => {
    g.fillStyle = '#17191B'; g.beginPath(); rr(g, -24, -30, 48, 26, 2); g.fill();
    g.fillStyle = '#1D2550'; g.beginPath(); rr(g, -22, -28, 44, 22, 1.5); g.fill();
    g.fillStyle = 'rgba(150,170,255,.22)'; g.beginPath(); g.moveTo(-22, -28); g.lineTo(-2, -28); g.lineTo(-16, -6); g.lineTo(-22, -6); g.fill();      // wet ink: one hard glint
    g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(-28, -34, 56, 1.6);
  };
  const lidIn = (g, x, y, w, h) => {
    g.fillStyle = '#5B6268'; g.fillRect(x + 2.5, y + 2.5, w - 5, h - 4);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + 2.5, y + 2.5, w - 5, 1.4);
    g.fillStyle = '#FBFCFD'; g.fillRect(x + 9, y + 7, 26, 9); g.fillStyle = PAL.scribble; g.fillRect(x + 12, y + 9.6, 17, 1.4); g.fillRect(x + 12, y + 12.4, 11, 1.4);      // the maker's label, no word
  };
  return bake([
    rbox(-28, -34, 56, 34, 3, 0, 7, T, TS, { det: felt, hl: 0 }),
    box(-28, -37.4, 56, 3.4, 5, 37, L, TS, { front: lidIn, hl: 0 })
  ]);
}
export function stampSprite() {
  const W1 = '#C8935A', W2 = '#96683A';
  return bake([
    rbox(-13, -8, 26, 16, 2, 0, 3, '#7A2E28', '#5A211D', { hl: 0 }),                               // the rubber
    rbox(-14, -9, 28, 18, 2.5, 3, 11, W1, W2, { det: g => { g.fillStyle = 'rgba(255,225,180,.3)'; g.fillRect(-14, -9, 28, 2); } }),      // its wooden mount
    cyl(0, 0, 4.4, 11, 22, '#B8743B', '#8F5426', { hl: 0, ns: 1 }),                                // the neck
    cyl(0, 0, 7.6, 22, 25, W1, W2, { hl: 0, ns: 1 }),
    cyl(0, 0, 9.6, 25, 32, W1, W2, { hl: 0, ns: 1 }),
    cyl(0, 0, 7.8, 32, 35.5, '#D7A56C', W2, { ns: 1, det: g => { g.fillStyle = 'rgba(255,240,210,.5)'; g.beginPath(); g.ellipse(-2.6, -2.6, 2.6, 1.6, -0.6, 0, 6.2832); g.fill(); } })      // the knob
  ]);
}
// the slips beside the pad: three, a little askew, the top one with a box where the stamp goes (the two under it show theirs)
export function slipStack() {
  return flat(64, 70, 32, 35, g => {
    g.translate(32, 35);
    const slip = (dx, dy, a, done) => {
      g.save(); g.translate(dx, dy); g.rotate(a);
      g.fillStyle = 'rgba(112,128,146,.5)'; g.fillRect(-18.4, -24, 40, 50);
      g.fillStyle = PAL.sheet; g.fillRect(-20, -26, 40, 50); g.strokeStyle = 'rgba(150,163,176,.85)'; g.lineWidth = 0.8; g.strokeRect(-19.6, -25.6, 39.2, 49.2);
      g.strokeStyle = PAL.scribble; g.lineCap = 'round'; g.lineWidth = 2.8; g.beginPath(); g.moveTo(-14, -18); g.lineTo(2, -18); g.stroke();
      g.lineWidth = 1.3; for (const [y, x1] of [[-10, 13], [-4.5, 9], [1, 12]]) { g.beginPath(); g.moveTo(-14, y); g.lineTo(x1, y); g.stroke(); }
      g.setLineDash([2, 1.6]); g.lineWidth = 0.9; g.strokeRect(-3, 6, 19, 14); g.setLineDash([]);
      if (done) stampMark(g, 6.5, 13, 0.9);
      g.restore();
    };
    slip(4, 3, 0.2, true); slip(-2, -1, -0.12, true); slip(1, 0, 0.05, false);
  }, 0.5);
}
// the mark the stamp leaves: the app's tick in a ring, in ink, a little uneven as a stamp is
export function stampMark(g, x, y, k = 1) {
  g.save(); g.translate(x, y); g.rotate(-0.16); g.scale(k, k);
  g.strokeStyle = 'rgba(20,17,15,.82)'; g.lineCap = 'round'; g.lineJoin = 'round';
  g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, 6.6, 0.5, 6.1); g.stroke();
  g.lineWidth = 2.2; g.beginPath(); g.moveTo(-3.4, 0.4); g.lineTo(-0.8, 3); g.lineTo(3.8, -3); g.stroke();
  g.restore();
}
// The tape arrow that points from the stamp at the next table over (it is laid down only once that table is built).
// A strip of gold tape with the hub's own two-strip arrow head; its words in his hand, one sentence to a line, so the
// strip is short: its head is at the desk's east edge and its west end stays out of the opening frame on a phone
// (which shows the desk as far east as x 295). Origin = its middle.
export function tapeArrow(text) {
  const m = mk(4, 4).getContext('2d'); m.font = `700 11.5px ${HAND}`;
  const q = text.match(/^(.*?[.?!])\s+(.+)$/), rows = q ? [q[1], q[2]] : [text];
  let tw = 0; for (const r of rows) tw = Math.max(tw, m.measureText(r).width);
  const n = rows.length, k = n > 1 ? 1.35 : 1, L = tw + (n > 1 ? 20 : 30), TH = n > 1 ? 33 : 19, W = L + 44, H = TH + 28;
  return flat(W, H, W / 2, H / 2, g => {
    g.translate(W / 2, H / 2);
    const done = drawTape(g, -8, 0, L, TH, -1.2, PAL.gold, 1.2);
    g.font = `700 11.5px ${HAND}`; g.fillStyle = PAL.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i < n; i++) g.fillText(rows[i], 0, 0.8 + (i - (n - 1) / 2) * 13.4);
    done();
    for (const sg of [-1, 1]) drawTape(g, L / 2 - 4 + (k - 1) * 3, sg * 6.6 * k, 24 * k, 8 * k, -sg * 38, PAL.gold, 1.2)();      // its head: two strips meeting at the point, east
  }, 0.5);
}

// ---------- scale: a receipt spike stacked with change slips, a hand tally counter lying beside it ----------
// Origin = the middle of the spike's round steel base, which shows all round under the paper. A TALL spike: eleven
// till-roll slips (34 x 22), each skewered through its middle and turned its own way (FAN), with air between them so
// every slip is seen as a sheet of its own, one above another, the last three sitting looser as slips just put on do.
// The pin stands 24 units clear of the top slip and ends in a ball.
// The counter lies on its back: a chrome body, four windows in a dark bezel, a finger ring. TALLY: where it lies, and
// where its windows are (their figures, and the thumb lever, are drawn per frame from baked sprites). It is big enough
// for its figure to be read from the driving view: each numeral stands 10 px tall on a phone.
export const TALLY = { x: 53, y: 3, w: 52, h: 36, z: 7, pitch: 11.2, dw: 10, dh: 15.6 };
export function spikeSprite() {
  const sl = [], N = 11, W = 17, H = 11, Z0 = 3.4, TH = 1.7, GOLD = { 2: 1, 5: 1, 8: 1 }, FAN = [0.22, -0.2, 0.08, -0.26, 0.17, -0.1, 0.25, -0.17, 0.2, -0.24, 0.05];
  sl.push(cyl(0, 0, 21, 0, 0.7, PAL.ink, PAL.ink, { hl: 0 }));                                    // an ink line round the foot of the base
  sl.push(cyl(0, 0, 20, 0, Z0, '#6A747C', '#2A2F34', {
    hl: 0, det: g => {
      g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 17.4, 2.2, 5.4); g.stroke();      // one hard light on the steel
      g.strokeStyle = 'rgba(20,17,15,.4)'; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, 14.2, 0, 6.2832); g.stroke();
    }
  }));
  let z = Z0 + 1.6, zt = z;
  for (let i = 0; i < N; i++) {
    const a = FAN[i], cs = Math.cos(a), sn = Math.sin(a), gold = GOLD[i], last = i === N - 1;
    const pts = [[-W, -H], [W, -H], [W, H], [-W, H]].map(([x, y]) => [x * cs - y * sn, x * sn + y * cs]);
    sl.push(poly(pts, z, z + TH, last ? '#FFFFFF' : i % 2 ? '#EEF2F5' : '#FBFCFD', gold ? '#B98E22' : '#8795A3', {
      hl: 0, det: g => {
        g.save(); g.rotate(a);
        g.strokeStyle = 'rgba(96,112,130,.7)'; g.lineWidth = 1.5; g.strokeRect(-W, -H, 2 * W, 2 * H);      // the paper's own edge, so each slip reads apart from the one under it
        if (gold) { g.fillStyle = '#F2B411'; g.fillRect(-W, -H, 2 * W, 3.4); g.fillRect(-W, H - 3.4, 2 * W, 3.4); }
        else { g.strokeStyle = PAL.scribble; g.lineWidth = 1.2; g.lineCap = 'round'; for (const y of [H - 2.6, H - 5.4]) { g.beginPath(); g.moveTo(-W + 3, y); g.lineTo(W - 4 - (i * 5) % 9, y); g.stroke(); } }      // two lines of print along the edge that shows
        if (last) {                                                   // the top slip: a heading, three lines, a tick
          g.strokeStyle = PAL.scribble; g.lineCap = 'round'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-13, -6.2); g.lineTo(-5, -6.2); g.stroke();
          g.lineWidth = 1.2; for (const [y, x1] of [[-2, -4], [1.2, -6.4]]) { g.beginPath(); g.moveTo(-13, y); g.lineTo(x1, y); g.stroke(); }
          g.strokeStyle = PAL.ink; g.lineWidth = 1.9; g.lineJoin = 'round'; g.beginPath(); g.moveTo(6.6, -1); g.lineTo(9, 1.8); g.lineTo(13.2, -5.2); g.stroke();
          g.fillStyle = '#34302C'; g.beginPath(); g.arc(0, 0, 2.5, 0, 6.2832); g.fill();      // where the pin comes through
        }
        g.restore();
      }
    }));
    zt = z + TH; z += i < N - 4 ? 4.4 : 6.4;
  }
  sl.push(cyl(0, 0, 1.8, zt - 1, zt + 24, '#2A2F34', '#2A2F34', { hl: 0 }));                      // the pin, clear above the stack
  sl.push(cyl(0, 0, 3.2, zt + 24, zt + 25.8, '#3A4046', '#1B1F22', { hl: 0, ns: 1 }));            // and its ball: three discs
  sl.push(cyl(0, 0, 4.2, zt + 25.8, zt + 29.2, '#4A5157', '#23272B', { hl: 0, ns: 1 }));
  sl.push(cyl(0, 0, 3.2, zt + 29.2, zt + 31, '#6A747C', '#3A4046', { hl: 0, ns: 1, det: g => { g.fillStyle = '#FFFFFF'; g.fillRect(-2.4, -2, 2.2, 1.8); } }));
  // the tally counter, on its back beside the spike
  const T = TALLY, C = '#D2D7DA', CS = '#8C9598', x0 = T.x - T.w / 2, y0 = T.y - T.h / 2;
  sl.push(ring(T.x + T.w / 2 + 6.6, T.y + 1, 9.4, 5.8, 0, 2.6, C, CS, { eo: 1, hl: 0 }));           // the finger ring
  sl.push(rbox(x0 - 1.1, y0 - 1.1, T.w + 2.2, T.h + 2.2, 9, 0, 0.7, PAL.ink, PAL.ink, { hl: 0 }));
  sl.push(rbox(x0, y0, T.w, T.h, 8, 0, T.z, C, CS, {
    hl: 0, det: g => {
      g.strokeStyle = PAL.ink; g.lineWidth = 2.4; g.beginPath(); rr(g, x0, y0, T.w, T.h, 8); g.stroke();      // ink keyline (its inner half shows)
      g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(x0 + 7, y0 + 2.4, T.w - 14, 1.8);
      const bx = T.x - 1.5 * T.pitch - T.dw / 2 - 1.5, by = T.y + 1 - T.dh / 2 - 1.5;
      g.fillStyle = '#17191B'; g.beginPath(); rr(g, bx, by, 3 * T.pitch + T.dw + 3, T.dh + 3, 2); g.fill();      // the bezel
      g.fillStyle = '#FBFCFD'; for (let i = 0; i < 4; i++) g.fillRect(T.x + (i - 1.5) * T.pitch - T.dw / 2, T.y + 1 - T.dh / 2, T.dw, T.dh);      // four windows
      g.fillStyle = 'rgba(20,17,15,.14)'; for (let i = 0; i < 4; i++) g.fillRect(T.x + (i - 1.5) * T.pitch - T.dw / 2, T.y + 1 - T.dh / 2, T.dw, 1.8);      // the shade under each window's top edge
    }
  }));
  return bake(sl);
}
// the counter's figures, 0 to 9, in ink in the stencil face: baked once, drawn in the four windows each frame
export function tallyDigits() {
  const T = TALLY;
  return '0123456789'.split('').map(ch => flat(T.dw, T.dh, T.dw / 2, T.dh / 2, g => {
    g.font = `900 ${T.dh}px ${STENCIL}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = PAL.ink; g.fillText(ch, T.dw / 2, T.dh / 2 + T.dh * 0.365);
  }, 0));
}

// ---------- live: three small screens in a row. A browser window, an Android phone, an iPhone wearing a tag ----------
// Origin = the middle of the row's front edge. lit: how many are showing the app (0, 1 = the browser, 2 = the browser
// and the Android phone). The iPhone never lights: it wears a paper tag on a loop of twine (tag = its words).
export function liveScreens(lit, tag) {
  const K = '#2A2D31', K2 = '#1B1D20', OFF = '#0E161A';
  const app = (g, x, y, w, h, bar) => {                              // the app, as bars: a gold header with its tick, rows under it
    g.fillStyle = '#FBFCFD'; g.fillRect(x, y, w, h);
    g.fillStyle = PAL.gold; g.fillRect(x, y, w, bar);
    g.fillStyle = PAL.ink; g.beginPath(); rr(g, x + 2.2, y + bar / 2 - 2.8, 5.6, 5.6, 1.4); g.fill();
    g.strokeStyle = PAL.gold; g.lineWidth = 1; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(x + 3.6, y + bar / 2 + 0.1); g.lineTo(x + 4.7, y + bar / 2 + 1.2); g.lineTo(x + 6.5, y + bar / 2 - 1.3); g.stroke();
    g.fillStyle = PAL.ink; g.fillRect(x + 10, y + bar / 2 - 1.2, Math.min(14, w - 14), 2.4);
    for (let i = 0, yy = y + bar + 3.4; yy < y + h - 5; i++, yy += 7.4) { g.fillStyle = '#EDF1F4'; g.fillRect(x + 2.4, yy, w - 4.8, 5.4); g.fillStyle = i % 2 ? PAL.scribble : '#8795A3'; g.fillRect(x + 4.4, yy + 1.7, (w - 9) * (0.5 + 0.2 * ((i * 7) % 3)), 1.6); }
  };
  const browser = (g, x, y, w, h) => {
    const on = lit >= 1;
    g.fillStyle = on ? '#DCE3E9' : '#30363B'; g.fillRect(x + 2, y + 2, w - 4, 8);                 // the window's own bar: three dots, an address
    for (let i = 0; i < 3; i++) { g.fillStyle = on ? ['#C4483A', PAL.gold, '#3C9A70'][i] : '#596066'; g.beginPath(); g.arc(x + 6 + i * 4.4, y + 6, 1.4, 0, 6.2832); g.fill(); }
    g.fillStyle = on ? '#FBFCFD' : '#454C50'; g.beginPath(); rr(g, x + 20, y + 3.6, w - 26, 4.8, 2.4); g.fill();
    if (on) app(g, x + 2, y + 10, w - 4, h - 14, 8); else { g.fillStyle = OFF; g.fillRect(x + 2, y + 10, w - 4, h - 14); }
    g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.moveTo(x + 2, y + 2); g.lineTo(x + w * 0.5, y + 2); g.lineTo(x + 2, y + h * 0.7); g.fill();
  };
  const phone = (on, notch) => (g, x, y, w, h) => {
    g.fillStyle = '#34302C'; g.fillRect(x + w - 1.6, y + 3, 1.6, h - 6);
    g.save(); g.beginPath(); rr(g, x + 2, y + 2, w - 4, h - 4, 3.4); g.clip();
    if (on) app(g, x + 2, y + 2, w - 4, h - 4, 9); else { g.fillStyle = OFF; g.fillRect(x + 2, y + 2, w - 4, h - 4); g.fillStyle = 'rgba(255,255,255,.06)'; g.beginPath(); g.moveTo(x + 2, y + 2); g.lineTo(x + w * 0.6, y + 2); g.lineTo(x + 2, y + h * 0.5); g.fill(); }
    g.restore();
    g.fillStyle = '#07090A'; if (notch) { g.beginPath(); rr(g, x + w / 2 - 5, y + 3.4, 10, 3.2, 1.6); g.fill(); } else { g.beginPath(); g.arc(x + w / 2, y + 5, 1.3, 0, 6.2832); g.fill(); }
  };
  const tagged = g => {                                              // the tag: a loop of twine over the iPhone's corner, a paper tag with a punched hole
    g.strokeStyle = '#B58A52'; g.lineWidth = 1.1; g.lineCap = 'round'; g.beginPath(); g.moveTo(60, -56); g.quadraticCurveTo(70, -62, 72.5, -47); g.stroke();
    g.save(); g.translate(72.5, -47); g.rotate(0.24);
    g.fillStyle = 'rgba(20,17,15,.25)'; g.beginPath(); g.moveTo(1.4, -6.2); g.lineTo(5.4, -9.2); g.lineTo(45.4, -9.2); g.lineTo(45.4, 10.8); g.lineTo(5.4, 10.8); g.lineTo(1.4, 7.8); g.closePath(); g.fill();
    g.fillStyle = '#F6EFD9'; g.beginPath(); g.moveTo(0, -7); g.lineTo(4, -10); g.lineTo(44, -10); g.lineTo(44, 10); g.lineTo(4, 10); g.lineTo(0, 7); g.closePath(); g.fill();
    g.strokeStyle = PAL.ink; g.lineWidth = 1; g.lineJoin = 'round'; g.stroke();
    g.fillStyle = '#9AA3A6'; g.beginPath(); g.arc(5, 0, 2.2, 0, 6.2832); g.fill(); g.fillStyle = '#34302C'; g.beginPath(); g.arc(5, 0, 1, 0, 6.2832); g.fill();
    let fs = 10.5; g.font = `700 ${fs}px ${HAND}`; const w = g.measureText(tag).width; if (w > 33) { fs *= 33 / w; g.font = `700 ${fs}px ${HAND}`; }
    g.fillStyle = PAL.ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tag, 26, 0.8);
    g.restore();
  };
  return bake([
    box(-66, -13, 36, 12, 0, 2.4, '#8C9598', '#6E7679', { hl: 0 }),                                 // the monitor's foot and neck
    box(-51, -9, 6, 4, 2.4, 16, '#9AA3A6', '#6E7679', { hl: 0, ns: 1 }),
    box(-5, -13, 10, 9, 0, 30, K, K2, { hl: 0 }), box(37, -13, 10, 9, 0, 30, K, K2, { hl: 0 }),     // a kickstand block behind each phone
    face(-82, -5, 68, 48, K, { lift: 12, r: 3, det: browser, sz: 50, sd: 4 }),
    face(-16, -2, 32, 58, PAL.ink, { r: 5, det: phone(lit >= 2, false), sz: 40, sd: 4 }),
    face(26, -2, 32, 58, PAL.ink, { r: 6.5, det: phone(false, true), sz: 40, sd: 4 }),
    { path: () => { }, b: [58, -4, 122, 2], z0: 0, z1: 100, top: 'rgba(0,0,0,0)', side: null, hl: 0, ns: 1 },      // room for the tag
    decal(tagged)
  ]);
}

// ---------- the power strip beside the tall boxes: two chunky plugs in it, their cables running off the desk ----------
// Origin = its own spot. It lies in the open beside the boxes' west end, along the desk's far edge, all of it seen
// from the open desk. A bone body with an ink keyline, darker than the desk it lies on; six sockets, two of them taken. LAMP: where its rocker's lamp is on screen (it blinks when it is bumped).
export const STRIP_LAMP = { x: -47.5, y: -4 - 9 * HK };
export function powerStrip() {
  const B = '#E2D9C2', BS = '#A99E83', K = '#2A2D31', K2 = '#17191B', X0 = -55, Y0 = -13, W = 110, D = 22;
  const top = g => {
    g.strokeStyle = PAL.ink; g.lineWidth = 3; g.beginPath(); rr(g, X0, Y0, W, D, 5); g.stroke();      // ink keyline (its inner half shows)
    g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(X0 + 5, Y0 + 2, W - 10, 1.4);
    g.fillStyle = PAL.ink; g.beginPath(); rr(g, -53, -9.5, 11, 15, 2.2); g.fill();                  // the rocker switch, lit
    g.fillStyle = '#D93A26'; g.beginPath(); rr(g, -52, -8.5, 9, 13, 1.6); g.fill();
    g.fillStyle = '#FF8E74'; g.fillRect(-52, -8.5, 9, 5);
    for (let i = 0; i < 6; i++) {                                     // six socket faces: two slots and an earth pin each, in ink
      const x = -31 + i * 15;
      g.fillStyle = '#F7F4EC'; g.beginPath(); rr(g, x - 6, -9.5, 12, 15, 2.6); g.fill();
      g.strokeStyle = 'rgba(20,17,15,.7)'; g.lineWidth = 0.9; g.stroke();
      g.fillStyle = PAL.ink; g.fillRect(x - 3.4, -6.4, 2, 5.6); g.fillRect(x + 1.4, -6.4, 2, 5.6); g.beginPath(); g.arc(x, 2.4, 1.4, 0, 6.2832); g.fill();
    }
  };
  const plug = (x, c, c2, key) => [
    rbox(x - 12.5, -14, 25, 22, 5, 9, 27, c, c2, {
      hl: 0, ns: 1, det: g => {
        if (key) { g.strokeStyle = 'rgba(20,17,15,.75)'; g.lineWidth = 2; g.beginPath(); rr(g, x - 12.5, -14, 25, 22, 5); g.stroke(); }
        g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(x - 9, -12, 18, 2.6);
        g.fillStyle = 'rgba(0,0,0,.28)'; for (let i = -5; i <= 5; i += 5) g.fillRect(x + i - 0.9, -6, 1.8, 10);      // grip ribs
      }
    }),
    rbox(x - 6, 5, 12, 8, 2.5, 9, 19, c, c2, { hl: 0, ns: 1 })      // the cable's boss, toward the viewer
  ];
  return bake([
    rbox(X0 - 1.1, Y0 - 1.1, W + 2.2, D + 2.2, 6, 0, 0.7, PAL.ink, PAL.ink, { hl: 0 }),              // an ink line round its foot
    rbox(X0, Y0, W, D, 5, 0, 9, B, BS, { det: top, hl: 0 }),
    ...plug(-16, K, K2, false), ...plug(29, '#D9D2BF', '#A9A089', true)
  ]);
}
// The two cables: out of the plugs toward the viewer, then west side by side along the desk's north end and over its
// west edge (edge: how far west of the strip that edge is). A flat sprite; origin = the strip's own spot.
export function stripCables(edge) {
  const runs = [
    [[[-16, 10], [-18, 18], [-32, 25], [-60, 27], [-104, 31], [-146, 26], [-188, 30], [-edge, 27]], '#2A2D31', '#4A5157'],
    [[[29, 10], [27, 19], [10, 25], [-22, 23], [-60, 21.6], [-104, 25.6], [-146, 20.6], [-188, 24.6], [-edge, 21.6]], '#B4AC96', '#E3DDCC']
  ];
  const smooth = ctl => {                                                // Catmull-Rom through every point (its ends doubled)
    const c = [ctl[0], ...ctl, ctl[ctl.length - 1]], pts = [];
    for (let i = 1; i < c.length - 2; i++) {
      const p0 = c[i - 1], p1 = c[i], p2 = c[i + 1], p3 = c[i + 2];
      for (let k = 0; k < 10; k++) {
        const t = k / 10, t2 = t * t, t3 = t2 * t;
        pts.push([0.5 * (2 * p1[0] + (p2[0] - p0[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (3 * p1[0] - p0[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (p2[1] - p0[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (3 * p1[1] - p0[1] - 3 * p2[1] + p3[1]) * t3)]);
      }
    }
    pts.push(ctl[ctl.length - 1]);
    return pts;
  };
  const x0 = -edge, y0 = 0, x1 = 40, y1 = 44;
  return flat(x1 - x0, y1 - y0, -x0, -y0, g => {
    g.translate(-x0, -y0); g.lineJoin = 'round'; g.lineCap = 'butt';
    for (const [ctl, c, c2] of runs) {
      const pts = smooth(ctl), line = (dx, dy) => { g.beginPath(); pts.forEach((p, i) => { i ? g.lineTo(p[0] + dx, p[1] + dy) : g.moveTo(p[0] + dx, p[1] + dy); }); };
      g.strokeStyle = 'rgba(112,128,146,.5)'; g.lineWidth = 4.4; line(1.2, 1.6); g.stroke();
      g.strokeStyle = PAL.ink; g.lineWidth = 4.6; line(0, 0); g.stroke();
      g.strokeStyle = c; g.lineWidth = 3.2; line(0, 0); g.stroke();
      g.strokeStyle = c2; g.lineWidth = 0.9; line(0, -0.8); g.stroke();
    }
  }, 0.5);
}
