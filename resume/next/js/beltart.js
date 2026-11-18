// beltart.js — recipes for the steel bench of the AI table (stage 5): the belt's chevrons, parcels, the start plate, the
// floor tape, the sign painted on the steel, and the five machines with the control post. Baked once, like every
// sprite; what moves on a machine (an arm, a shutter, cards, stamps, lamps) is drawn each frame by belt.js over these.
// Every sprite's origin is its thing's anchor (the middle of its south foot) unless it says otherwise. No word is
// written here: lettering comes in as arguments, from the markup.
import { PAL, mulberry32, SEED } from './world.js';
import { mk, bake, box, rbox, cyl, poly, face, flat, decal, rr, drawTape, rgba, HK, SS, STENCIL } from './art.js';

// shared materials (the stamp's tin, the hub's wood, the file boxes' card: one step from what is already on the tables)
const ST = '#9AA3A6', STS = '#6A747C', DK = '#3A4046', DKS = '#23272B', BN = '#E9E5DA', BNS = '#C9C4B6';
const W1 = '#C8935A', W1S = '#96683A', W2 = '#B8743B', W2S = '#8F5426', GL = '#0E1113', CB = '#CFB488', CBS = '#A5865A';
const PL = '#6A747C', PLS = '#4A5258', RUB = '#22282B';
// a machine's plinth: low, darker than the bench, a lighter line along its far edge. Exactly its collider, less the belt's channel
const pl = (x, y, w, h) => box(x, y, w, h, 0, 3, PL, PLS, { hl: 0, det: g => { g.fillStyle = 'rgba(255,255,255,.24)'; g.fillRect(x, y, w, 1); g.fillStyle = 'rgba(20,17,15,.16)'; g.fillRect(x, y + h - 0.8, w, 0.8); } });
const disc = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill(); };
const tick = (g, x, y, k, col, lw) => { g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(x - 2.4 * k, y + 0.2 * k); g.lineTo(x - 0.6 * k, y + 2 * k); g.lineTo(x + 2.6 * k, y - 2.2 * k); g.stroke(); };

// ---------- the bench's painted lines: static paths, stroked each frame the bench is in view ----------
// lane lines 26 either side of the belt's centre line; the lane tape 31 outside it (belt.js lights it once all five run)
export const LANES = { out: new Path2D(), inn: new Path2D() };
LANES.out.rect(494, -826, 492, 652); LANES.inn.rect(546, -774, 388, 548);

// ---------- chevrons: one a tile, 24 units along the flow and 40 across. dir: 0 east, 1 north, 2 west, 3 south ----------
export function chevTile(dir, lit) {
  const along = dir % 2 === 0, c = mk((along ? 24 : 40) * SS, (along ? 40 : 24) * SS), g = c.getContext('2d');
  g.scale(SS, SS); g.translate(along ? 12 : 20, along ? 20 : 12); g.rotate(-dir * Math.PI / 2);      // drawn pointing east, then turned
  const v = () => { g.beginPath(); g.moveTo(-6.5, -11); g.lineTo(-0.5, -11); g.lineTo(6.5, 0); g.lineTo(-0.5, 11); g.lineTo(-6.5, 11); g.lineTo(0.5, 0); g.closePath(); };
  v(); g.fillStyle = lit ? PAL.greenTape : '#353D42'; g.fill();
  if (lit) { g.save(); g.clip(); g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(-7, -11, 14, 7); g.restore(); }      // the tape's lit third
  return c;
}

// ---------- parcels: slabs 20 x 14. kind: 0 plain card · 1 ticked · 2 tagged (what trading puts out) · 3 an envelope · 4 a film card ----------
export function parcelSprite(kind) {
  const top = kind === 3 ? '#F1EDDF' : kind === 4 ? '#191B1D' : CB, side = kind === 3 ? BNS : kind === 4 ? '#0B0C0D' : CBS;
  const det = g => {
    if (kind === 3) {                                                 // an envelope: its flap, a ring where the stamp came down
      g.strokeStyle = 'rgba(20,17,15,.5)'; g.lineWidth = 0.9; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-10, -7); g.lineTo(0, 0.6); g.lineTo(10, -7); g.stroke();
      g.strokeStyle = 'rgba(20,17,15,.62)'; g.lineWidth = 1.2; g.beginPath(); g.arc(5.4, 3.2, 2.6, 0, 6.2832); g.stroke();      // (a whole ring: an open one read as a letter)
    } else if (kind === 4) {                                          // a film card: two frames, sprocket holes
      g.fillStyle = BN; g.fillRect(-7.8, -3.6, 6.8, 7.2); g.fillRect(1, -3.6, 6.8, 7.2);
      g.fillStyle = 'rgba(233,229,218,.82)'; for (let i = 0; i < 6; i++) { g.fillRect(-8.7 + i * 3.2, -6.3, 1.5, 1.3); g.fillRect(-8.7 + i * 3.2, 5, 1.5, 1.3); }
    } else {
      g.fillStyle = PAL.masking; g.fillRect(-2, -7, 4, 14);           // the strip of masking tape across its top
      g.fillStyle = 'rgba(20,17,15,.14)'; g.fillRect(-2, -7, 0.6, 14); g.fillRect(1.4, -7, 0.6, 14);
      g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(-10, -7, 20, 1.2);
      if (kind === 1) { g.fillStyle = PAL.ink; disc(g, 5.6, 0.4, 4.9); g.fillStyle = PAL.greenTape; disc(g, 5.6, 0.4, 4.2); tick(g, 5.6, 0.3, 0.92, '#FFFFFF', 1.5); }
      if (kind === 2) {                                               // a paper tag on a string: no mark of any kind on it
        g.strokeStyle = '#8A6B40'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(-1, -2.4); g.quadraticCurveTo(2, -4.6, 4.2, -1.6); g.stroke();
        g.save(); g.translate(6, 1.6); g.rotate(0.32); g.fillStyle = 'rgba(20,17,15,.3)'; g.fillRect(-3.6, -2.2, 8, 5.4); g.fillStyle = '#F1EDDF'; g.fillRect(-4, -2.7, 8, 5.4);
        g.strokeStyle = 'rgba(20,17,15,.55)'; g.lineWidth = 0.6; g.strokeRect(-4, -2.7, 8, 5.4); g.fillStyle = '#5C5146'; disc(g, -2.5, 0, 0.75); g.restore();
      }
    }
  };
  return bake([box(-10, -7, 20, 14, 0, kind === 3 ? 3 : kind === 4 ? 4 : 11, top, side, { det })], { shadow: false });
}

// ---------- the start plate: checker plate, 56 x 56, a rim of lane tape. Origin = its middle. lit: pressed ----------
export function plateSprite(lit) {
  return flat(60, 60, 30, 30, g => {
    g.translate(30, 30);
    g.fillStyle = 'rgba(20,17,15,.3)'; g.fillRect(-27, -26.6, 56, 56);
    g.fillStyle = lit ? PAL.greenTape : '#2E6B5A'; g.fillRect(-28, -28, 56, 56);                    // the rim of tape
    g.fillStyle = lit ? '#2F3539' : '#4A5258'; g.fillRect(-26, -26, 52, 52);                        // the frame
    g.fillStyle = '#7C868B'; g.fillRect(-24, -24, 48, 48);
    g.save(); g.beginPath(); g.rect(-24, -24, 48, 48); g.clip(); g.fillStyle = 'rgba(255,255,255,.25)';
    for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) { g.save(); g.translate(-24 + i * 6 + (j % 2 ? 3 : 0), -24 + j * 6 + 1); g.rotate((i + j) % 2 ? 0.7 : -0.7); g.fillRect(-2, -0.7, 4, 1.4); g.restore(); }
    g.restore();
    g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(-24, -24, 48, 1);
    for (const [x, y] of [[-20.5, -20.5], [20.5, -20.5], [-20.5, 20.5], [20.5, 20.5]]) { g.fillStyle = '#3A4046'; disc(g, x, y, 2.3); g.fillStyle = '#B9C1C5'; disc(g, x - 0.3, y - 0.3, 1.5); }
    g.strokeStyle = 'rgba(20,17,15,.6)'; g.lineWidth = 0.9; g.strokeRect(-28, -28, 56, 56);
  }, 0.6);
}

// ---------- the floor tape from the hub's rim to the bench: green tape, a chevron every 28 units. Origin = its middle ----------
export const TAPE = { w: 388, h: 14 };
export const chevPath = (g, x, y, k) => { g.beginPath(); g.moveTo(x - 4 * k, y - 5 * k); g.lineTo(x - 1 * k, y - 5 * k); g.lineTo(x + 3 * k, y); g.lineTo(x - 1 * k, y + 5 * k); g.lineTo(x - 4 * k, y + 5 * k); g.lineTo(x, y); g.closePath(); };
export function tapeSprite() {
  const W = TAPE.w + 8, H = TAPE.h + 8;
  return flat(W, H, W / 2, H / 2, g => {
    const done = drawTape(g, W / 2, H / 2, TAPE.w, TAPE.h, 0, PAL.greenTape, 1.2);
    g.fillStyle = 'rgba(8,60,46,.6)'; for (let x = -TAPE.w / 2 + 16; x < TAPE.w / 2 - 8; x += 28) { chevPath(g, x, 0, 1); g.fill(); }
    done();
  }, 0.6);
}

// ---------- the sign on the steel: stencilled paint, the control post's own three strings. Origin = its middle ----------
export const SIGN = { w: 280, h: 108 };
export function signSprite(head, line, date) {
  const W = SIGN.w, H = SIGN.h, r = mulberry32(SEED ^ 0x51f7);
  return flat(W, H, W / 2, H / 2, g => {
    const paint = rgba(PAL.paint, 0.85);
    g.fillStyle = paint; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    // a face set so its capitals stand cap units tall, drawn in if the string would run wider than the block
    const set = (txt, cap, max) => { let fs = cap / 0.7; g.font = `900 ${fs}px ${STENCIL}`; const w = g.measureText(txt).width; if (w > max) { fs *= max / w; g.font = `900 ${fs}px ${STENCIL}`; } return fs; };
    set(head, 26, W - 10); g.fillText(head, W / 2, 30);
    // the line in two rows, broken between the two words where the rows come out nearest in width
    const ws = line.split(' '); let cut = 1, bd = 1e9; g.font = `900 20px ${STENCIL}`;
    for (let i = 1; i < ws.length; i++) { const d = Math.abs(g.measureText(ws.slice(0, i).join(' ')).width - g.measureText(ws.slice(i).join(' ')).width); if (d < bd) { bd = d; cut = i; } }
    const r1 = ws.slice(0, cut).join(' '), r2 = ws.slice(cut).join(' '), fs = Math.min(set(r1, 13, W - 10), set(r2, 13, W - 10));
    g.font = `900 ${fs}px ${STENCIL}`; g.fillText(r1, W / 2, 52); g.fillText(r2, W / 2, 71);
    set(date, 11, W - 60); const dw = g.measureText(date).width + 20;
    g.lineWidth = 1.7; g.strokeStyle = paint; g.beginPath(); rr(g, W / 2 - dw / 2, 80, dw, 23, 6); g.stroke();
    g.fillText(date, W / 2, 97.2);
    // a little wear: short scuffs taken out of the paint
    g.globalCompositeOperation = 'destination-out'; g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineCap = 'round';
    for (let k = 0; k < 26; k++) { const x = r() * W, y = r() * H, l = 6 + r() * 22, a = (r() - 0.5) * 0.5; g.lineWidth = 0.6 + r() * 1.1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    g.globalCompositeOperation = 'source-over';
  }, 0, 1.5);                                                       // (1.5 px a unit: big stencil letters need no more, and it is the largest thing the bench holds)
}

// ---------- the pad the merge gate puts work onto: a steel plate, a dark frame, one stencilled word. Origin = its middle ----------
export const PAD = { w: 60, h: 56 };
export function padSprite(word, lit) {
  return flat(PAD.w + 4, PAD.h + 4, PAD.w / 2 + 2, PAD.h / 2 + 2, g => {
    g.translate(PAD.w / 2 + 2, PAD.h / 2 + 2);
    g.fillStyle = 'rgba(20,17,15,.3)'; g.fillRect(-29, -26.6, 60, 56);
    g.fillStyle = '#2F3539'; g.fillRect(-30, -28, 60, 56);
    g.fillStyle = lit ? '#8FDCC4' : '#8A949A'; g.fillRect(-28, -26, 56, 52);
    g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(-28, -26, 56, 1.2);
    for (const [x, y] of [[-24.5, -22.5], [24.5, -22.5], [-24.5, 22.5], [24.5, 22.5]]) { g.fillStyle = 'rgba(20,17,15,.45)'; disc(g, x, y, 1.6); }
    let fs = 15 / 0.7; g.font = `900 ${fs}px ${STENCIL}`; const w = g.measureText(word).width; if (w > 46) { fs *= 46 / w; g.font = `900 ${fs}px ${STENCIL}`; }
    g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = lit ? '#FFFFFF' : 'rgba(238,241,243,.9)'; g.fillText(word, 0, fs * 0.35);
  }, 0.6);
}

// ---------- the control post: a dispatch cabinet on the loop's south-west corner. Anchor (520,-178), collider x -22..22, y -44..0 ----------
// LAMPS: its five sockets on the panel on top, left to right in belt order [x], at y and height z (their lamps are drawn each frame)
export const POST = { lamps: [-15.6, -9, -2.4, 4.2, 10.8], y: -24, z: 39, r: 2.7 };
export function postSprite() {
  const front = (g, x, y, w, h) => {
    g.fillStyle = 'rgba(20,17,15,.22)'; g.beginPath(); rr(g, x + 3.5, y + 3, w - 7, h - 6, 1.5); g.fill();      // a recessed panel
    g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(x + 4.5, y + h - 3.6, w - 9, 0.8);
    g.fillStyle = '#F1EDDF'; g.fillRect(x + 7, y + 5.6, 14, 7.4); g.fillStyle = PAL.scribble; g.fillRect(x + 9, y + 7.6, 10, 1.1); g.fillRect(x + 9, y + 10, 6.5, 1.1);      // the maker's plate: two lines, no word
    g.fillStyle = '#23272B'; disc(g, x + w - 11.5, y + h / 2, 4.2); g.fillStyle = '#C9CED2'; disc(g, x + w - 11.5, y + h / 2, 3); g.fillStyle = '#23272B'; g.fillRect(x + w - 12.1, y + h / 2 - 2.4, 1.2, 4.8);      // a round key switch
  };
  const top = g => {                                                 // its two mouths over the belt, east and north: dark slots with a fringe of rubber flaps
    g.fillStyle = '#17191B'; g.fillRect(16.4, -34, 5.6, 26); g.fillRect(-13, -44, 26, 5.6);
    g.fillStyle = '#4A5258'; for (let i = 0; i < 6; i++) { g.fillRect(16.4, -33 + i * 4.3, 5.6, 0.9); g.fillRect(-12 + i * 4.3, -44, 0.9, 5.6); }
  };
  const panel = g => {
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(-20.5, -36.5, 35, 1.2);
    for (const x of POST.lamps) { g.fillStyle = '#17191B'; disc(g, x, POST.y, POST.r + 1); g.fillStyle = '#2B3033'; disc(g, x, POST.y, POST.r); }
    g.fillStyle = PAL.scribble; g.fillRect(-18, -16.4, 12, 1); g.fillRect(-4, -16.4, 7, 1);
  };
  return bake([
    rbox(-22, -44, 44, 44, 3, 0, 34, ST, STS, { det: top, front }),
    box(-20.5, -36.5, 35, 24, 34, 39, DK, DKS, { hl: 0, ns: 1, det: panel })
  ]);
}

// ---------- team: the merge gate. Anchor (690,-160); collider x -22..22, y -86..0; the belt crosses at y -60..-20 ----------
// ARM: the striped arm that lies across the belt, hinged at its north end [x, hinge y, length, height]
export const GATE = { arm: [-11, -74, 50, 14], lamp: [0, -4, 60] };
export function gateSprite() {
  const head = (g, x, y, w, h) => { g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(x, y, w, 1.4); g.fillStyle = '#07090A'; disc(g, x + w / 2, y + h - 9.2, 6.6); };      // the signal head: a dark hood for its lamp
  return bake([
    pl(-22, -86, 44, 26),
    box(-4, -78, 8, 8, 0, 44, DK, DKS, { hl: 0 }),                   // the north post
    box(-14.5, -78, 7, 7, 3, 17, ST, STS, { hl: 0 }),                // the arm's hinge block
    pl(-22, -20, 44, 20),
    box(-4, -10, 8, 8, 0, 44, DK, DKS, { hl: 0 }),                   // the south post
    box(-7, -78, 14, 76, 44, 52, ST, STS, { det: g => { g.fillStyle = 'rgba(20,17,15,.3)'; for (const y of [-74, -40, -6]) { disc(g, -3.6, y, 1.1); disc(g, 3.6, y, 1.1); } } }),      // the lintel across the belt
    face(-10, -2, 20, 22, '#17191B', { lift: 52 * HK, r: 3, det: head, sz: 86, sd: 3 })
  ]);
}
// The five workbenches behind the gate and the feeders that run down from them. Anchor (651,-246); collider x -61..61, y -74..0.
// BENCH: each bench's x; FEED: where its feeder meets the main belt's north edge (26 units past this block, on the steel)
export const BENCH = { x: [-47, -23, 1, 25, 49], y: -64, top: 15, feed: [-39, -27, -15, -3, 9], fy: 26 };
export function benchesSprite() {
  const icon = k => (g, x, y, w, h) => {                             // one flat bone pictogram a screen: an invoice, a phone, a page, a calendar, a card
    g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x, y, w, 1); g.fillStyle = BN; const cx = x + w / 2, cy = y + h / 2 + 0.3;
    if (k === 0) { g.fillRect(cx - 2.6, cy - 3.2, 5.2, 6.4); g.fillStyle = GL; g.fillRect(cx - 1.6, cy - 1.8, 3.2, 0.8); g.fillRect(cx - 1.6, cy, 3.2, 0.8); g.fillRect(cx - 1.6, cy + 1.6, 1.8, 0.8); }
    else if (k === 1) { g.beginPath(); rr(g, cx - 1.9, cy - 3.3, 3.8, 6.6, 1); g.fill(); g.fillStyle = GL; g.fillRect(cx - 1.1, cy - 2.3, 2.2, 3.8); }
    else if (k === 2) { g.beginPath(); g.moveTo(cx - 2.5, cy - 3.2); g.lineTo(cx + 1, cy - 3.2); g.lineTo(cx + 2.5, cy - 1.7); g.lineTo(cx + 2.5, cy + 3.2); g.lineTo(cx - 2.5, cy + 3.2); g.closePath(); g.fill(); }
    else if (k === 3) { g.fillRect(cx - 3.1, cy - 2.8, 6.2, 5.8); g.fillStyle = GL; g.fillRect(cx - 3.1, cy - 1.5, 6.2, 0.7); g.fillRect(cx - 1.2, cy - 0.8, 0.6, 3.8); g.fillRect(cx + 0.7, cy - 0.8, 0.6, 3.8); g.fillRect(cx - 3.1, cy + 0.9, 6.2, 0.6); }
    else { g.beginPath(); rr(g, cx - 3.4, cy - 2.3, 6.8, 4.6, 0.9); g.fill(); g.fillStyle = GL; g.fillRect(cx - 3.4, cy - 1.1, 6.8, 1.1); }
  };
  const sl = [pl(-61, -74, 122, 74)];
  for (let i = 0; i < 5; i++) { const bx = BENCH.x[i], fx = BENCH.feed[i], ex = bx + (fx - bx) * (56 / 82); sl.push(poly([[bx - 3.5, -56], [bx + 3.5, -56], [ex + 3.5, 0], [ex - 3.5, 0]], 3, 4.2, RUB, '#15191B', { hl: 0, det: g => { g.strokeStyle = '#3A4247'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(bx - 3.5, -56); g.lineTo(ex - 3.5, 0); g.moveTo(bx + 3.5, -56); g.lineTo(ex + 3.5, 0); g.stroke(); } })); }
  for (let i = 0; i < 5; i++) {
    const x = BENCH.x[i];
    sl.push(box(x - 9, -72, 2.6, 15, 3, 12, DK, DKS, { hl: 0 }), box(x + 6.4, -72, 2.6, 15, 3, 12, DK, DKS, { hl: 0 }));
    sl.push(box(x - 10, -72, 20, 16, 12, 15, W1, W1S, { det: g => { g.fillStyle = 'rgba(255,225,180,.3)'; g.fillRect(x - 10, -72, 20, 1.6); } }));
    sl.push(face(x - 6, -69.5, 12, 9, GL, { lift: 15 * HK, r: 1.2, det: icon(i), sz: 30, sd: 2 }));
  }
  return bake(sl);
}

// ---------- social: the film belt with two inspection arches. Anchor (870,-160); collider x -44..44, y -112..0 ----------
// ear, eye: the arches' x · scr: the rack's three screens [x, top y, w, h] on screen · clock [x, y, r] on screen · chute: the legs' x and the top arm's y
export const SOC = { ear: -24, eye: 24, signY: -6 - 47 * HK - 22, scr: [[-27, -132.8, 14, 22], [-11, -132.8, 14, 22], [5, -132.8, 14, 22]], clock: [26.5, -120.3, 7.4], legE: 36.5, legW: -36.5, armY: -94, lamp: [38.5, -104, 30] };
export function socialSprite() {
  const sign = eye => (g, x, y, w, h) => {
    g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(x, y, w, 1.3);
    const cx = x + w / 2, cy = y + h / 2 + 0.4; g.strokeStyle = BN; g.fillStyle = BN; g.lineCap = 'round'; g.lineWidth = 1.7;
    if (eye) { g.beginPath(); g.moveTo(cx - 8, cy); g.quadraticCurveTo(cx, cy - 7.4, cx + 8, cy); g.quadraticCurveTo(cx, cy + 7.4, cx - 8, cy); g.stroke(); disc(g, cx, cy, 2.7); }
    else { g.beginPath(); g.arc(cx, cy - 1, 5.6, 2.5, 6.9); g.quadraticCurveTo(cx + 2.4, cy + 6, cx - 1.8, cy + 6.6); g.stroke(); g.lineWidth = 1.4; g.beginPath(); g.arc(cx + 0.4, cy - 0.6, 2.5, 3.5, 6.6); g.stroke(); }
  };
  const glass = (g, x, y, w, h) => { g.strokeStyle = 'rgba(233,229,218,.7)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w * 0.7, y); g.lineTo(x, y + h * 0.6); g.fill(); };
  const dial = (g, x, y, w, h) => { g.strokeStyle = PAL.ink; g.lineWidth = 1.2; g.beginPath(); g.arc(x + w / 2, y + h / 2, w / 2 - 0.7, 0, 6.2832); g.stroke(); g.fillStyle = PAL.ink; for (let i = 0; i < 4; i++) { const a = i * 1.5708; g.fillRect(x + w / 2 + Math.cos(a) * 5.4 - 0.5, y + h / 2 + Math.sin(a) * 5.4 - 0.5, 1, 1); } };
  const CHW = '#2A3137', CHWS = '#1B2024', CHF = '#4A5258';
  const floor = (x, y, w, h) => g => {
    g.fillStyle = CHF; g.fillRect(x + 1.6, y + 1.6, w - 3.2, h - 3.2);
    g.strokeStyle = 'rgba(233,229,218,.78)'; g.lineWidth = 1.3; g.lineCap = 'butt'; g.lineJoin = 'miter';
    for (const cx of [-9, 9]) { g.beginPath(); g.moveTo(cx + 2.2, y + h / 2 - 2.7); g.lineTo(cx - 1.9, y + h / 2); g.lineTo(cx + 2.2, y + h / 2 + 2.7); g.stroke(); }
  };
  const arch = (ax, north) => north ? box(ax - 4, -74, 8, 8, 0, 40, BN, BNS, { hl: 0 }) : box(ax - 4, -14, 8, 8, 0, 40, BN, BNS, { hl: 0 });
  return bake([
    pl(-44, -112, 88, 52),
    box(-28, -110, 62, 10, 3, 18, DK, DKS, { hl: 0 }),               // the rack against the back
    face(-27, -100, 14, 22, GL, { lift: 18 * HK, r: 1.5, det: glass, sz: 56, sd: 3 }), face(-11, -100, 14, 22, GL, { lift: 18 * HK, r: 1.5, det: glass, sz: 56, sd: 3 }), face(5, -100, 14, 22, GL, { lift: 18 * HK, r: 1.5, det: glass, sz: 56, sd: 3 }),
    face(19.1, -100, 14.8, 14.8, '#F1EDDF', { lift: 18 * HK + 2.1, r: 7.4, det: dial, sz: 48, sd: 3 }),      // the clock at its end (its hands are drawn each frame)
    cyl(38.5, -104, 2.6, 3, 30, DK, DKS, { hl: 0 }),                 // the lamp's stalk
    // the reject chute: a C of low channel from past the eye arch, round the back, to before the ear arch
    // (dark walls, a lighter floor, and two chevrons on the back arm pointing the way a rejected card goes: back to the first arch)
    box(-42.5, -100, 85, 12, 3, 7, CHW, CHWS, { hl: 0, det: floor(-42.5, -100, 85, 12) }),
    box(-42.5, -90, 12, 30, 3, 7, CHW, CHWS, { hl: 0, det: g => { g.fillStyle = CHF; g.fillRect(-40.9, -91, 8.8, 31); } }),
    box(30.5, -90, 12, 30, 3, 7, CHW, CHWS, { hl: 0, det: g => { g.fillStyle = CHF; g.fillRect(32.1, -91, 8.8, 31); } }),
    arch(SOC.ear, true), arch(SOC.eye, true),
    pl(-44, -20, 88, 20),
    arch(SOC.ear, false), arch(SOC.eye, false),
    box(SOC.ear - 5, -74, 10, 68, 40, 47, BN, BNS, {}), box(SOC.eye - 5, -74, 10, 68, 40, 47, BN, BNS, {}),
    face(SOC.ear - 12, -6, 24, 22, DK, { lift: 47 * HK, r: 2.5, det: sign(false), sz: 84, sd: 3 }), face(SOC.eye - 12, -6, 24, 22, DK, { lift: 47 * HK, r: 2.5, det: sign(true), sz: 84, sd: 3 })
  ]);
}

// ---------- trade: the ticker-tape machine and the locked gate. Anchor (960,-484); collider x -68..81, y -42..0 ----------
// Kept plain: steel, bone and ink only. Nothing on it is marked, and nothing but its lamp is ever coloured.
// dome [x, y on screen, r] · shut: the shutter under the box [x, top y, w, h] on screen · tray: where rejected parcels lie [x, y] · tick: the ticker's foot, where the paper spills from
export const TRADE = { dome: [-50, -21 - 30 * HK, 15], shut: [-21.5, -32.6, 43, 11.6], tray: [58, -21], tick: [-50, -21], lamp: [-28, -21, 58] };
export function tradeSprite() {
  const lock = (g, x, y, w, h) => {
    g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(x, y, w, 1.2);
    g.fillStyle = 'rgba(20,17,15,.4)'; for (let i = 0; i < 8; i++) if (i !== 3 && i !== 4) disc(g, x + 4.5 + i * 7.86, y + 3.2, 1.05);      // rivets
    const cx = x + w / 2, by = y + 4.2;
    // the padlock, the point of this machine: a bone body 12.4 wide with an ink keyhole, as large as the box's face takes
    g.strokeStyle = '#D9DEE0'; g.lineWidth = 1.7; g.beginPath(); g.arc(cx, by - 0.6, 3.5, 3.1416, 6.2832); g.stroke();
    g.fillStyle = PAL.ink; g.beginPath(); rr(g, cx - 6.9, by - 1.3, 13.8, 8.6, 1.9); g.fill();
    g.fillStyle = '#F1EDDF'; g.beginPath(); rr(g, cx - 6.2, by - 0.6, 12.4, 7.2, 1.4); g.fill();
    g.fillStyle = PAL.ink; disc(g, cx, by + 2.1, 1.4); g.fillRect(cx - 0.65, by + 2.3, 1.3, 2.8);
  };
  const paper = g => {                                               // the strip from the works into the gate's west post: bone paper, plain dashes
    const y = -21 - 28 * HK;
    g.fillStyle = 'rgba(20,17,15,.25)'; g.fillRect(-41, y - 1.6, 12, 5); g.fillStyle = '#F1EDDF'; g.fillRect(-41, y - 2.5, 12, 5);
    g.fillStyle = PAL.ink; for (let x = -39.5; x < -30; x += 4) g.fillRect(x, y - 0.4, 2, 0.9);
  };
  return bake([
    pl(-68, -42, 48, 42), pl(20, -42, 61, 42),
    cyl(-50, -21, 16, 3, 22, DK, DKS, { hl: 0, det: g => { g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 1.4; g.beginPath(); g.arc(-50, -21, 13.6, 2.3, 5.2); g.stroke(); } }),      // the ticker's pedestal
    cyl(-50, -21, 10, 22, 32, ST, STS, { ns: 1, det: g => { g.fillStyle = '#5B6268'; disc(g, -50, -21, 6.2); g.fillStyle = '#F1EDDF'; disc(g, -50, -21, 4.4); g.fillStyle = '#5B6268'; disc(g, -50, -21, 1.5); } }),      // its works: a spool of paper
    rbox(38, -33, 40, 24, 2.5, 3, 10, BN, BNS, { hl: 0, det: g => { g.fillStyle = '#D5D0C2'; g.beginPath(); rr(g, 40.4, -30.6, 35.2, 19.2, 1.6); g.fill(); g.fillStyle = 'rgba(20,17,15,.12)'; g.fillRect(40.4, -30.6, 35.2, 1.6); } }),      // the tray against the east rim
    box(-30, -25, 8, 8, 0, 36, DK, DKS, { hl: 0 }), box(22, -25, 8, 8, 0, 36, DK, DKS, { hl: 0 }),      // the gate's posts
    box(-32, -31, 64, 20, 36, 54, '#7C868B', '#4E575C', { front: lock, det: g => { g.fillStyle = 'rgba(20,17,15,.28)'; for (const [x, y] of [[-28.5, -27.5], [28.5, -27.5], [-28.5, -14.5], [28.5, -14.5]]) disc(g, x, y, 1.2); } }),      // the padlocked box bolted over it
    decal(paper)
  ]);
}
// the glass dome over the ticker: its own flat sprite (a slab is never see-through). Origin = its middle
export function domeSprite() {
  return flat(34, 34, 17, 17, g => {
    g.translate(17, 17);
    g.fillStyle = 'rgba(214,232,240,.4)'; disc(g, 0, 0, 15);
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.1; g.beginPath(); g.arc(0, 0, 14.4, 0, 6.2832); g.stroke();
    g.strokeStyle = 'rgba(20,17,15,.35)'; g.lineWidth = 0.7; g.beginPath(); g.arc(0, 0, 15, 0.3, 2.8); g.stroke();
    g.fillStyle = '#FFFFFF'; g.beginPath(); g.moveTo(-9.6, -5.4); g.quadraticCurveTo(-7, -11, -1.2, -11.6); g.quadraticCurveTo(-6.4, -8.6, -7.6, -3.6); g.closePath(); g.fill();      // one hard glint
  }, 0);
}

// ---------- memory: the card-index drawer. Anchor (820,-764); collider x -36..36, y -137..0; the belt runs under the open drawer ----------
// cards: the nine in the open drawer [x, first y, pitch, w, on-screen lift] · mag: the magnifier's stalk foot [x, y, z] · phone lamp [x, y on screen]
export const MEM = { cards: [-23, -66.5, 6.3, 46, 37 * HK], mag: [-27, -86, 56], phone: [35.4, -87.4 - 60 * HK], lamp: [28, -76, 60] };
export function memorySprite() {
  const fronts = (g, x, y, w, h) => {                                // three drawer fronts: the outer two shut, a label and a pull on each; the middle one out
    const dw = (w - 10) / 3;
    for (let i = 0; i < 3; i++) {
      const dx = x + 2.5 + i * (dw + 2.5);
      if (i === 1) { g.fillStyle = '#1C120A'; g.fillRect(dx, y + 3, dw, h - 5.5); continue; }
      g.strokeStyle = 'rgba(74,38,16,.6)'; g.lineWidth = 0.9; g.strokeRect(dx, y + 3, dw, h - 6);
      g.fillStyle = 'rgba(255,225,180,.16)'; g.fillRect(dx + 0.5, y + 3.5, dw - 1, 1.2);
      g.fillStyle = '#F1EDDF'; g.fillRect(dx + 3.4, y + 8, dw - 6.8, 7.4); g.fillStyle = PAL.scribble; g.fillRect(dx + 5.2, y + 10, dw - 11, 1); g.fillRect(dx + 5.2, y + 12.3, dw - 14, 1);
      g.fillStyle = '#3A2414'; g.beginPath(); rr(g, dx + dw / 2 - 4, y + 20.5, 8, 3, 1.4); g.fill();
    }
  };
  const well = g => {                                                // the open drawer from above: a dark well for the cards
    g.fillStyle = '#2A1B10'; g.fillRect(-23.6, -69.6, 47.2, 60); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-23.6, -69.6, 47.2, 3);
  };
  const pull = (g, x, y, w, h) => {
    g.fillStyle = 'rgba(255,225,180,.18)'; g.fillRect(x, y, w, 1.2);
    g.fillStyle = '#3A2414'; g.fillRect(x + w / 2 - 11.5, y + 2.2, 23, 6.6); g.fillStyle = '#F1EDDF'; g.fillRect(x + w / 2 - 10.2, y + 3.2, 20.4, 4.6); g.fillStyle = PAL.scribble; g.fillRect(x + w / 2 - 7, y + 5, 12, 1);      // a label holder
    g.fillStyle = '#3A2414'; g.beginPath(); rr(g, x + w / 2 - 4.5, y + h - 1.4, 9, 2.6, 1.3); g.fill();
  };
  const topDet = g => { g.fillStyle = 'rgba(255,225,180,.2)'; g.fillRect(-34, -128, 68, 1.6); g.strokeStyle = 'rgba(74,38,16,.3)'; g.lineWidth = 0.8; for (const y of [-116, -103, -91, -80]) { g.beginPath(); g.moveTo(-32, y); g.lineTo(32, y + 1.5); g.stroke(); } };
  return bake([
    pl(-36, -137, 72, 81),
    box(-34, -128, 68, 56, 0, 56, W2, W2S, { front: fronts, det: topDet }),      // the cabinet, its back against the rim
    box(20, -98, 18, 12, 56, 61, DK, DKS, { hl: 0, ns: 1 }),         // a desk telephone on top: its body, its handset across it
    rbox(18, -95.5, 22, 5, 2.4, 61, 64.5, '#2A2F34', '#17191B', { hl: 0, ns: 1 }),
    pl(-36, -16, 72, 16),
    box(-25.6, -9.6, 2.6, 2.6, 0, 22, '#8F5426', '#6E4220', { hl: 0 }), box(23, -9.6, 2.6, 2.6, 0, 22, '#8F5426', '#6E4220', { hl: 0 }),      // the drawer's two thin legs
    box(-26, -72, 52, 66, 22, 40, '#D6A671', W1S, { front: pull, det: well })
  ]);
}

// ---------- apply: the mail-sorting desk. Anchor (634,-764); collider x -56..56, y -137..0; the belt runs under the desk ----------
// platen: the typewriter's bar [x, y, w, h, z] · stamps: the two on their rail [x], at y, the rail's height · lamp
export const APPLY = { platen: [-20, -75, 40, 5, 33], stamps: [-28, -16], sy: -27, rail: 46, lamp: [38, -116, 62] };
export function applySprite() {
  const holes = (g, x, y, w, h) => {                                 // the pigeonholes: two rows of five, folder edges in some
    g.fillStyle = 'rgba(255,225,180,.16)'; g.fillRect(x, y, w, 1.2);
    const cw = (w - 5) / 5, ch = (h - 6) / 2;
    for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) {
      const hx = x + 2.5 + c * cw, hy = y + 2.5 + r * (ch + 1), k = r * 5 + c;
      g.fillStyle = '#1E140C'; g.fillRect(hx + 0.8, hy, cw - 1.6, ch);
      if (k % 3 !== 1) { g.fillStyle = k % 2 ? '#F1EDDF' : '#DCC9A0'; for (let i = 0; i < 2 + (k % 3); i++) g.fillRect(hx + 2.4 + i * 2.6, hy + 2.5 + (i % 2), 1.6, ch - 2.5 - (i % 2)); }
    }
  };
  const deskTop = g => { g.fillStyle = 'rgba(255,225,180,.26)'; g.fillRect(-54, -102, 108, 1.8); g.strokeStyle = 'rgba(150,104,58,.4)'; g.lineWidth = 0.8; for (const y of [-88, -70, -51, -34, -18]) { g.beginPath(); g.moveTo(-52, y); g.quadraticCurveTo(0, y + 2.4, 52, y - 0.6); g.stroke(); } };
  const keys = g => { g.fillStyle = '#C9CED2'; for (let r = 0; r < 2; r++) for (let c = 0; c < 7; c++) disc(g, -11.4 + c * 3.8 + r * 1.2, -57.5 + r * 4.6, 1.1); g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(-15, -68, 30, 1.4); };
  const tray = (x, env) => rbox(x, -66, 20, 27, 2.2, 26, 31, BN, BNS, {
    hl: 0, det: g => {
      g.fillStyle = '#D5D0C2'; g.beginPath(); rr(g, x + 2, -64, 16, 23, 1.4); g.fill();
      g.save(); g.translate(x + 10, -52.5); g.rotate(env ? -0.1 : 0.14); g.fillStyle = 'rgba(20,17,15,.2)'; g.fillRect(-6.2, -8.4, 13, 17.4); g.fillStyle = '#FBFCFD'; g.fillRect(-6.8, -9, 13, 17.4);
      if (env) { g.strokeStyle = 'rgba(20,17,15,.5)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-6.8, -9); g.lineTo(-0.3, -1.4); g.lineTo(6.2, -9); g.stroke(); }
      else { g.fillStyle = PAL.scribble; for (let i = 0; i < 4; i++) g.fillRect(-4.6, -6 + i * 3.4, i === 3 ? 5 : 8.6, 1.1); }
      g.restore();
    }
  });
  const mitten = [[-48.5, -12.5], [-48.9, -19.5], [-47.2, -23.4], [-43.6, -24.2], [-40.6, -22.6], [-39.8, -19.4], [-37.4, -20.6], [-35.6, -19.2], [-36.2, -16.6], [-39.4, -14.6], [-39.8, -12.5]];      // the hand: a flat mitten, thumb out
  const leg = (x, y) => box(x, y, 3, 3, 0, 22, '#8F5426', '#6E4220', { hl: 0 });
  return bake([
    pl(-56, -137, 112, 81),
    box(-42, -128, 84, 24, 0, 58, W2, W2S, { front: holes, det: g => { g.fillStyle = 'rgba(255,225,180,.2)'; g.fillRect(-42, -128, 84, 1.6); } }),      // the pigeonholes, against the rim
    leg(-53, -101), leg(50, -101),
    pl(-56, -16, 112, 16),
    leg(-53, -10), leg(50, -10),
    box(-54, -102, 108, 96, 22, 26, W1, W1S, { det: deskTop }),      // the desk's top
    box(-15, -68, 30, 20, 26, 36, DK, DKS, { hl: 0, det: keys }),    // the typewriter (its platen bar is drawn each frame: it twitches)
    face(-8, -76.5, 16, 14, '#FBFCFD', { lift: 34 * HK, det: (g, x, y, w, h) => { g.fillStyle = PAL.scribble; for (let i = 0; i < 3; i++) g.fillRect(x + 2.4, y + 3 + i * 3, i === 2 ? 6 : w - 4.8, 1); }, sz: 44, sd: 2 }),      // the page in it
    tray(30, false), tray(-50, true),                               // the in-tray, east; the out-tray, west
    box(-36, -31, 2.2, 2.2, 26, 46, '#5B6268', DKS, { hl: 0 }), box(-9.2, -31, 2.2, 2.2, 26, 46, '#5B6268', DKS, { hl: 0 }),      // the rail the two stamps hang from
    box(-36, -31, 29, 2.2, 44, 46, '#8C9598', '#5B6268', { hl: 0, ns: 1 }),
    poly(mitten, 26, 33, PAL.gold, PAL.goldDeep, { det: g => { g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.ellipse(-45.6, -20.4, 2.2, 1.2, -0.5, 0, 6.2832); g.fill(); } })      // the hand-shaped paperweight beside the out-tray: his decision, in the one colour that is his
  ]);
}
