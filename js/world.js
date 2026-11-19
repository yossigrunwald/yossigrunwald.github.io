// world.js — table rects, palette, shared state, waypoint graph, seeded scatter, and the finds read from the DOM.
// Everything here is data: no drawing. Units are world units (spec 4.1): +x east, +y south, origin = hub centre.

export const MEDIA = 'resume/media/';    // the game lives at the site root; its media stays in resume/media/, which the first resume page (/resume/) uses too
// Finds (and the parts of a find) with data-stage <= STAGE are live.
// 1 the hub slice · 2 the whole desk · 3 the whole mat and the woods · 4 the new words: the desk's three new finds
// (quality, scale, live), the weekly recap in the woods, and the garage as a counted find · 5 the belt (the steel bench
// in the north-east: belt.js), with what waited for it: the stamp's tape arrow, the bench's second look, the green strip
// of the moment, the hub's fifth arrow · 6 (not built) the rest of the kitchen and the back plank.
// 5 is live. ?stage=4 gives back the build that was approved before the bench (the tests diff against it).
export const STAGE = (() => { const s = +new URLSearchParams(location.search).get('stage'); return s >= 1 && s <= 5 ? s : 5; })();
export const S5 = STAGE >= 5;                                   // everything the bench adds is behind this, or behind a data-stage="5"
export const on = el => (+el.dataset.stage || 0) <= STAGE;      // is this element (a find, or a part of one) switched on yet

export const PAL = {
  floor: '#23282B', floorSeam: '#1B1F22',
  desk: '#EDF1F4', deskShade: '#C5D0DA', sheet: '#FBFCFD', scribble: '#A9B4BF',
  gold: '#F2B411', goldDeep: '#A66F00',
  wood: '#B8743B', grain: '#8F5426', routed: '#4A2610',
  flour: '#F7F3EA', flourShade: '#D9CDB8',
  blue: '#2F6BDE', blueTape: '#78AEEB',
  mat: '#0C1614', matGrid: '#1B2B27', matLit: '#1E322D', matLitGrid: '#3F6358', matThing: '#142220',
  woods: '#0B231B', woodsGrid: '#133629', woodsLit: '#1F6B4A', woodsLitGrid: '#3C9A70', pine: '#154D36', pineLit: '#2E8A60',
  pink: '#FF4D7D', pinkTape: '#FF6F91',
  masking: '#E6D7AE', ink: '#14110F',
  green: '#12A37C', greenTape: '#43C7A2',          // the belt's electrical tape (stage 5; the art lead may still move it)
  bench: '#A3ACB0', benchShade: '#7F898E', rubber: '#22282B', paint: '#EEF1F3',      // the steel bench, its belt, its painted lines (used nowhere else)
  van: '#F4F1E8', glass: '#1D2A30', rack: '#C9CED2',
  lamp: '#FFC46B', crust: '#C4782A', steel: '#9AA3A6', card: '#B99A6B'
};
// per track: tape body, strong colour (lamps, arrows, outlines), its lamp. MAIN: the main sections, in the order the
// moment names them (a section counts once it has a live find).
export const MAIN = ['w', 'g', 'v', 'k'];
export const TRACK = {
  w: { tape: PAL.gold, strong: PAL.gold, lamp: 'lw' },
  k: { tape: PAL.blueTape, strong: PAL.blue, lamp: 'lk' },
  v: { tape: PAL.pinkTape, strong: PAL.pink, lamp: 'lv' },
  g: { tape: PAL.greenTape, strong: PAL.green, lamp: 'lg' },
  e: { tape: PAL.masking, strong: PAL.masking },
  c: { tape: PAL.masking, strong: PAL.masking }
};

// Rects are [x0, y0, x1, y1]. FULL is the spec (4.2); G is what is built so far: the desk and the mat whole (stages 2
// and 3), the block still cut about 650 units from the hub. The last stage only has to swap G for FULL and add the plank.
export const FULL = {
  desk: [-460, -1480, 460, -110], block: [-820, -110, -110, 520], mat: [110, -110, 1040, 1100],
  strip: [-110, 110, 110, 520], plank: [-820, 520, 110, 650]
};
export const G = {
  desk: [-460, -1480, 460, -110], block: [-700, -110, -110, 520], mat: [110, -110, 1040, 1100],
  strip: [-110, 110, 110, 520]
};
// The steel bench of the AI table (stage 5), in the corner the desk and the mat left free: its west edge is the desk's
// east edge, its south edge the mat's north edge, so nothing built moves and the world box does not grow.
if (S5) FULL.belt = G.belt = [460, -900, 1040, -110];
export const WOODS = [560, 620, 1040, 1100];         // the green mat that lies on the dark one (spec 4.2)
export const HUB_R = 160;
export const BOX = [-700, -1480, 1040, 1100];        // world box of everything drivable in this stage
// Where the slice cuts through a bigger table the edge is taped off, and a ghost of the table carries on beyond it.
// GHOST: each table's rect grown past its cut edges. CUTS: the tape bands [x0, y0, x1, y1, vertical, onMat].
export const GHOST = { desk: [-460, -1480, 460, -110], block: [-864, -110, -110, 684], strip: [-110, 110, 110, 684], mat: [110, -110, 1040, 1100] };
export const CUTS = [
  [-720, -122, -696, 532, 1, 0],                     // block, west
  [-712, 516, 110, 540, 0, 0]                        // block and strip, south
];
export const EDGE = 26;                              // the van's centre stops this far inside an edge: its nose reaches the tape
export const SPAWN = { x: 0, y: 20 };

const inR = (r, x, y) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];
export function surfaceAt(x, y) {
  if (x * x + y * y <= HUB_R * HUB_R) return 'hub';
  if (inR(G.desk, x, y)) return 'desk';
  if (inR(G.block, x, y)) return 'block';
  if (inR(G.mat, x, y)) return 'mat';
  if (inR(G.strip, x, y)) return 'strip';
  if (G.belt && inR(G.belt, x, y)) return 'belt';      // last: every point that had a surface keeps it (the shared edges stay desk and mat)
  return null;
}
// the van may stand here: its centre and four probes half a van-length out must all be on a table
export function standable(x, y) {
  const m = EDGE;
  return !!(surfaceAt(x, y) && surfaceAt(x - m, y) && surfaceAt(x + m, y) && surfaceAt(x, y - m) && surfaceAt(x, y + m));
}
export function clampToWorld(x, y) {
  if (standable(x, y)) return [x, y];
  let bx = SPAWN.x, by = SPAWN.y;                      // walk in from the tap toward the hub until it is standable
  for (let i = 1; i <= 40; i++) {
    const t = i / 40, px = x + (bx - x) * t, py = y + (by - y) * t;
    if (standable(px, py)) return [px, py];
  }
  return [bx, by];
}

// distance from a point to a collider's surface (0 or less = inside)
export function collDist(c, x, y) {
  if (c.t === 'c') return Math.hypot(x - c.x, y - c.y) - c.r;
  const qx = x < c.x0 ? c.x0 : x > c.x1 ? c.x1 : x, qy = y < c.y0 ? c.y0 : y > c.y1 ? c.y1 : y;
  return Math.hypot(x - qx, y - qy);
}

// Waypoint graph (spec 9.4): the hand-placed nodes; the mat adds its own once its props stand (addNode). The autopilot
// joins two nodes whenever the van can drive the straight line between them (van.js), so only the nodes are kept here.
export const WAYPOINTS = [
  [0, 20], [0, -150], [0, -230], [-140, -420], [140, -420], [0, -700], [-250, -900], [250, -700], [0, -1050], [0, -1240], [-300, -1180], [300, -1150],
  [-130, 100], [-300, 160], [0, 190], [0, 250], [140, -60], [262, 196],
  [-292, -1335], [-275, -1378]                           // west of the tall boxes, and in front of the power strip's free end
];
export const FIXED_NODES = WAYPOINTS.length;         // the hand-placed ones (van.js joins these over longer runs)
export function addNode(x, y) { WAYPOINTS.push([x, y]); }

// ---- spatial hash on a 256-unit grid (spec 9.6): things are bucketed once, and a frame only looks in the cells it shows ----
export const CELL = 256;
const cellKey = (cx, cy) => (cx + 512) * 1024 + cy + 512;
export function gridAdd(g, x, y, o) {
  const k = cellKey(Math.floor(x / CELL), Math.floor(y / CELL)); let a = g.get(k);
  if (!a) g.set(k, a = []); a.push(o); return a;
}
// the cell arrays that overlap a rect, pushed into out (a reused array)
export function gridCells(g, x0, y0, x1, y1, out) {
  out.length = 0;
  const cx1 = Math.floor(x1 / CELL), cy1 = Math.floor(y1 / CELL);
  for (let cy = Math.floor(y0 / CELL); cy <= cy1; cy++) for (let cx = Math.floor(x0 / CELL); cx <= cx1; cx++) { const a = g.get(cellKey(cx, cy)); if (a && a.length) out.push(a); }
  return out;
}
// Colliders: each sits in every cell its box touches; one that moves is kept in a short list of its own.
const cgrid = new Map(), roamers = [], cellBuf = [];
let cstamp = 0;
export function addCollider(c, roams) {
  S.colliders.push(c);
  if (roams) { roamers.push(c); return; }
  const x0 = c.t === 'c' ? c.x - c.r : c.x0, x1 = c.t === 'c' ? c.x + c.r : c.x1, y0 = c.t === 'c' ? c.y - c.r : c.y0, y1 = c.t === 'c' ? c.y + c.r : c.y1;
  for (let cy = Math.floor(y0 / CELL); cy <= Math.floor(y1 / CELL); cy++) for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++) gridAdd(cgrid, cx * CELL, cy * CELL, c);
}
// the colliders within reach of a point, each once, into out
export function collidersNear(x, y, reach, out) {
  out.length = 0; cstamp++;
  for (const c of roamers) out.push(c);
  for (const a of gridCells(cgrid, x - reach, y - reach, x + reach, y + reach, cellBuf)) for (const c of a) if (c.stamp !== cstamp) { c.stamp = cstamp; out.push(c); }
  return out;
}

export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export const SEED = (() => { const s = +new URLSearchParams(location.search).get('seed'); return s > 0 ? s : 20261116; })();

// ---- the finds, read from the document (spec 9.3): every word the game shows is an element in index.html ----
// A find's words: head, line, date (the sticker), and the lines its tape gains later (gains: [{ when, el }], when =
// 'played' once the first ad has been played, 'full' once the tray is full, 'again' when the van comes back to it).
const words = (el, d) => {
  const q = s => el.querySelector(':scope > ' + s);
  return {
    track: d.track, x: +d.x, y: +d.y, head: q('[data-head]'), line: q('[data-line]'), date: q('[data-date]'),
    gains: [...el.querySelectorAll(':scope > [data-gain]')].filter(on).map(g => ({ when: g.dataset.gain, el: g })),
    el, q, found: false, foundAt: 0
  };
};
export function readFinds(doc = document) {
  const out = [];
  doc.querySelectorAll('[data-find]').forEach(el => {
    const d = el.dataset;
    out.push({
      ...words(el, d), id: d.find, tab: d.tab || '', stage: +d.stage || 9, live: (+d.stage || 9) <= STAGE,
      video: d.video || null, len: d.len || '', yt: d.yt || null, pill: d.pill || '', lure: d.lure || '',
      // how: a find that opens an explainer (the five on the bench). Its card paragraph, its footer if it has one, its
      // captions in order, and the words lettered inside its pictures and on its machine, all from its own children.
      how: (() => {
        const ol = el.querySelector(':scope > [data-steps]'); return ol ? {
          card: el.querySelector(':scope > [data-how]'), foot: el.querySelector(':scope > [data-foot]'),
          steps: [...ol.children], words: Object.fromEntries([...el.querySelectorAll(':scope > [data-w]')].map(e => [e.dataset.w, e.textContent.trim()]))
        } : null;
      })()
    });
  });
  return out;
}
// the small things that say their words when bumped and are never counted, by id
export function readSays(doc = document) {
  const out = {};
  doc.querySelectorAll('[data-say]').forEach(el => { const d = el.dataset; if (on(el)) out[d.say] = { ...words(el, d), id: d.say, say: true, tab: '', live: false }; });
  return out;
}
// the nine feature cards: a stencilled word and its short gloss
export function readCards(doc = document) {
  return [...doc.querySelectorAll('[data-card]')].map(el => ({
    word: el.querySelector('b').textContent.trim().toUpperCase(), gloss: el.querySelector('span').textContent.trim(), x: +el.dataset.x, y: +el.dataset.y, live: on(el)
  }));
}

// ---- paper: piles and singles on the desk (seeded, the same for everyone) ----
// 12 piles: the first one between the hub and the first-ad phone, one on each of the nine cards, one on the taped
// sheet, and a decoy that hides only a paperclip chain. Plus about 30 single sheets.
export const FIRST_PILE = { x: 0, y: -216, r: 50, n: 16 };
export const LINE_PILE = { x: -340, y: -1256, r: 94, n: 22 };      // it covers the taped sheet, 180 x 244
export const DECOY_PILE = { x: 170, y: -1180, r: 62, n: 12 };      // on the east side: no screenful anywhere on the desk holds more than five piles
// where no single sheet may lie: under the standing things [x0, y0, x1, y1]
const NO_SHEET = [
  [-110, -400, 110, -240],                             // the first-ad phone and its boxes
  [-452, -664, -306, -596], [280, -964, 440, -884],    // the easel, the phone on its cube
  [-124, -1424, 124, -1322], [268, -1310, 412, -1206], // the app phone, the bench and its stool
  [-262, -1456, -100, -1300], [-316, -1440, -252, -1326],   // the tall boxes and what is behind them; the cables that run out past their west end
  [-436, -1366, -244, -1134],                          // the taped sheet (its own pile covers it)
  [-330, -980, -270, -940], [-460, -1134, -366, -1066], [214, -1198, 286, -1102], [128, -1016, 174, -976]   // the tape dispenser, the organiser, the clipboard, the mug
];
// Sheets the gust cannot take: each is caught under or against something [x, y, turn, kind]. They still fly when the van hits them.
export const MUG = [150, -995], CLIP = [262, -1178];      // the mug; the clipboard (it lies clear of the tag on the row of screens)
const CAUGHT = [
  [157, -988, 0.5, 0], [-232, -1377, -0.2, 1], [126, -1353, 1.3, 3], [-446, -613, 0.9, 6], [-291, -951, -0.7, 4],
  [-366, -1088, 0.35, 7], [291, -1240, -1.1, 2], [283, -895, 0.6, 5], [236, -1154, -0.4, 9]
];
// What was put on the desk later (the stamp and its pad, the paper spike, the three small screens): a single sheet that
// would lie under one of them is taken away after the scatter, so the scatter itself draws the same numbers as before.
// (and under the power strip's free end, and where the clipboard now lies)
const LATER = [[324, -692, 460, -614], [-142, -880, -22, -824], [60, -1082, 270, -1050], [-362, -1480, -190, -1400], [226, -1222, 298, -1136]];
if (S5) LATER.push([200, -628, 452, -580]);          // and under the stamp's tape arrow, which is laid down with the bench: no loose sheet lies on its words
export function makeSheets(cards) {
  const rnd = mulberry32(SEED), sheets = [], piles = [];
  const add = (pile, x, y) => {
    const s = { i: sheets.length, x, y, a: (rnd() - 0.5) * 2.4, v: (rnd() * 4) | 0, vx: 0, vy: 0, spin: 0, lift: 0, loose: false, gone: 0, ox: x, oy: y, pile, moved: false, cool: 0, gx: 0, gy: 0, cell: null };
    sheets.push(s); if (pile) pile.sheets.push(s);
  };
  const mkPile = (p, card) => {
    const pile = { x: p.x, y: p.y, r: p.r, n: p.n, moved: 0, card, done: false, sheets: [], touched: false, pic: null, kind: p.kind || '' };
    piles.push(pile);
    for (let i = 0; i < p.n; i++) {
      const ang = rnd() * 6.283, rad = Math.pow(rnd(), 0.72) * p.r * (i < 5 ? 0.45 : 1);   // heaped toward the centre; a few always cover it
      add(pile, p.x + Math.cos(ang) * rad, p.y + Math.sin(ang) * rad * 0.8);
    }
    return pile;
  };
  const single = (x, y) => { for (const r of NO_SHEET) if (x > r[0] && x < r[2] && y > r[1] && y < r[3]) return; add(null, x, y); };
  const cardPile = (c, i) => { c.pile = mkPile({ x: c.x, y: c.y, r: 66, n: (i < 3 ? 12 : 11) + ((rnd() * (i < 3 ? 5 : 4)) | 0) }, c); };   // 12 to 16 sheets on the near three, 11 to 14 on the rest
  // The order below is kept on purpose: the first pile, the three near cards and the twelve near singles draw the same
  // random numbers as they did in the hub slice, so the opening frame's paperwork is exactly what was tuned there.
  mkPile(FIRST_PILE, null);
  cards.slice(0, 3).forEach((c, i) => cardPile(c, i));
  for (let i = 0; i < 12; i++) single(-420 + rnd() * 840, -740 + rnd() * 580);        // the near desk
  cards.slice(3).forEach((c, i) => cardPile(c, i + 3));
  mkPile({ ...LINE_PILE, kind: 'line' }, null);
  mkPile({ ...DECOY_PILE, kind: 'decoy' }, null);
  const far = sheets.length;
  for (let i = 0; i < 20; i++) single(-420 + rnd() * 840, -1440 + rnd() * 660);       // the far desk
  for (const [x, y, a, v] of CAUGHT) { add(null, x, y); const s = sheets[sheets.length - 1]; s.a = a; s.v = v; s.stay = true; }
  // Kinds of paper (art.sheetSprites). The first pile, JOBS and the near singles keep the letter sheets they always had;
  // each other named pile leans its own way, so the piles differ at a glance. No new random numbers are drawn for this.
  const LEAN = { INVOICES: [6, 70], 'CARD PAYMENTS': [4, 70], CLIENTS: [5, 70], CALENDAR: [8, 70], 'SMS REMINDERS': [9, 70], QUOTES: [2, 70], QUICKBOOKS: [7, 40], 'WORKS OFFLINE': [7, 22] };
  const hash = i => (Math.imul(i + 1, 2654435761) >>> 0) % 100;
  for (const p of piles) {
    const l = p.card && LEAN[p.card.word]; if (l) for (const s of p.sheets) if (hash(s.i) < l[1]) s.v = l[0];
    if (p.kind === 'decoy') for (const s of p.sheets) if (hash(s.i) < 50) s.v = 4 + hash(s.i * 7 + 3) % 6;
  }
  for (let i = far; i < sheets.length; i++) { const s = sheets[i]; if (!s.pile && !s.stay && hash(i) < 45) s.v = 4 + hash(i * 7 + 3) % 6; }
  return { sheets: sheets.filter(s => s.pile || s.stay || !LATER.some(r => s.x > r[0] && s.x < r[2] && s.y > r[1] && s.y < r[3])), piles };
}

// ---- flour drifts on the near block (centre, radius). Seeded shapes are drawn in surfaces.js ----
// The last two are small: the spill at the sack's foot, and the untouched heap behind the sack.
export const DRIFTS = [
  { x: -385, y: 255, r: 58 }, { x: -585, y: 95, r: 50 }, { x: -205, y: 410, r: 52, thin: 1 }, { x: -600, y: 415, r: 58 },      // thin: a scatter of loose flour, no heap (nothing lies under it)
  { x: -474, y: 104, r: 26 }, { x: -432, y: -74, r: 34 }
];

// how much of a world rect is on the screen this frame, 0..1 (by area)
export function shown(x0, y0, x1, y1) {
  const v = S.vr, w = Math.min(x1, v[2]) - Math.max(x0, v[0]), h = Math.min(y1, v[3]) - Math.max(y0, v[1]);
  return w <= 0 || h <= 0 ? 0 : (w * h) / ((x1 - x0) * (y1 - y0) || 1);
}

// ---- shared, mutable game state ----
export const S = {
  t: 0,                 // game time, seconds (slowed by slow motion)
  rt: 0,                // real time, seconds since boot
  finds: [], byId: {}, live: [], cards: [],
  found: [],            // ids in the order found
  tracks: { w: 0, g: 0, k: 0, v: 0, e: 0, c: 0 },
  says: {},             // the small things that speak when bumped (not counted), by id
  props: [], colliders: [],
  sheets: [], piles: [],
  adPlayed: false, threeDone: false, firstInput: false,
  vr: [0, 0, 0, 0],     // the world rect on screen this frame [x0, y0, x1, y1]
  inkUntil: 0,          // game time until which the tyre line is drawn in black ink (the ad 2 toy)
  slow: 0,              // seconds of slow motion left (real time)
  reduced: false
};
