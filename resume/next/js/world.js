// world.js — table rects, palette, shared state, waypoint graph, seeded scatter, and the finds read from the DOM.
// Everything here is data: no drawing. Units are world units (spec 4.1): +x east, +y south, origin = hub centre.

export const MEDIA = '../media/';          // launch: move the tree up one level and set './media/'
export const STAGE = 1;                    // finds with data-stage <= STAGE are live (1 = the hub slice)

export const PAL = {
  floor: '#23282B', floorSeam: '#1B1F22',
  desk: '#EDF1F4', deskShade: '#C5D0DA', sheet: '#FBFCFD', scribble: '#A9B4BF',
  gold: '#F2B411', goldDeep: '#A66F00',
  wood: '#B8743B', grain: '#8F5426', routed: '#4A2610',
  flour: '#F7F3EA', flourShade: '#D9CDB8',
  blue: '#2F6BDE', blueTape: '#78AEEB',
  mat: '#0C1614', matGrid: '#1B2B27', matLit: '#1E322D', matLitGrid: '#3F6358', matThing: '#142220',
  pink: '#FF4D7D', pinkTape: '#FF6F91',
  masking: '#E6D7AE', ink: '#14110F',
  van: '#F4F1E8', glass: '#1D2A30', rack: '#C9CED2',
  lamp: '#FFC46B', crust: '#C4782A', steel: '#9AA3A6', card: '#B99A6B'
};
// per track: tape body, strong colour (lamps, arrows, outlines), index of its lamp
export const TRACK = {
  w: { tape: PAL.gold, strong: PAL.gold, lamp: 'lw' },
  k: { tape: PAL.blueTape, strong: PAL.blue, lamp: 'lk' },
  v: { tape: PAL.pinkTape, strong: PAL.pink, lamp: 'lv' },
  a: { tape: PAL.masking, strong: PAL.masking },
  c: { tape: PAL.masking, strong: PAL.masking }
};

// Rects are [x0, y0, x1, y1]. FULL is the spec (4.2); G is what the hub slice builds: the same tables cut
// about 650 units from the hub. Later stages only have to swap G for FULL and add the plank.
export const FULL = {
  desk: [-460, -1480, 460, -110], block: [-820, -110, -110, 520], mat: [110, -110, 1040, 1100],
  strip: [-110, 110, 110, 520], plank: [-820, 520, 110, 650]
};
export const G = {
  desk: [-460, -800, 460, -110], block: [-700, -110, -110, 520], mat: [110, -110, 700, 520],
  strip: [-110, 110, 110, 520]
};
export const HUB_R = 160;
export const BOX = [-700, -800, 700, 520];           // world box of everything drivable in this stage
// Where the slice cuts through a bigger table the edge is taped off, and a ghost of the table carries on beyond it.
// GHOST: each table's rect grown past its cut edges. CUTS: the tape bands [x0, y0, x1, y1, vertical, onMat].
export const GHOST = { desk: [-460, -964, 460, -110], block: [-864, -110, -110, 684], strip: [-110, 110, 110, 684], mat: [110, -110, 864, 684] };
export const CUTS = [
  [-472, -820, 472, -796, 0, 0],                     // desk, north
  [-720, -122, -696, 532, 1, 0],                     // block, west
  [696, -122, 720, 532, 1, 1],                       // mat, east
  [-712, 516, 110, 540, 0, 0],                       // block and strip, south
  [110, 516, 712, 540, 0, 1]                         // mat, south
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

// Waypoint graph (spec 9.4): the nodes inside the slice. Used when the autopilot is stuck.
export const WAYPOINTS = [
  [0, 20], [0, -230], [-140, -420], [140, -420], [0, -700], [-300, 160], [0, 250], [300, 160]
];

export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export const SEED = (() => { const s = +new URLSearchParams(location.search).get('seed'); return s > 0 ? s : 20261116; })();

// ---- the finds, read from the plain resume (spec 9.3) ----
export function readFinds(doc = document) {
  const out = [];
  doc.querySelectorAll('[data-find]').forEach(el => {
    const d = el.dataset, q = s => el.querySelector(':scope > ' + s);
    out.push({
      id: d.find, track: d.track, x: +d.x, y: +d.y, tab: d.tab || '', stage: +d.stage || 9,
      live: (+d.stage || 9) <= STAGE,
      head: q('[data-head]'), line: q('[data-line]'), date: q('[data-date]'), after: q('[data-after]'),
      video: d.video || null, len: d.len || '', yt: d.yt || null, pill: d.pill || '', lure: d.lure || '', go: d.go || null,
      el, found: false, foundAt: 0
    });
  });
  return out;
}
export function readCards(doc = document) {
  return [...doc.querySelectorAll('[data-card]')].map(el => ({
    word: el.textContent.trim().toUpperCase(), x: +el.dataset.x, y: +el.dataset.y, live: (+el.dataset.stage || 9) <= STAGE
  }));
}

// ---- paper: piles and singles on the desk (seeded, the same for everyone) ----
// the first pile sits between the hub and the first-ad phone; card piles sit on their cards
export const FIRST_PILE = { x: 0, y: -216, r: 50, n: 16 };
export function makeSheets(cards) {
  const rnd = mulberry32(SEED), sheets = [], piles = [];
  const add = (pile, x, y) => sheets.push({
    x, y, a: (rnd() - 0.5) * 2.4, v: (rnd() * 4) | 0, vx: 0, vy: 0, spin: 0, lift: 0, loose: false,
    gone: 0, ox: x, oy: y, pile, moved: false, twitch: 0
  });
  const mkPile = (p, card) => {
    const pile = { x: p.x, y: p.y, r: p.r, n: p.n, moved: 0, card, done: false };
    piles.push(pile);
    for (let i = 0; i < p.n; i++) {
      const ang = rnd() * 6.283, rad = Math.pow(rnd(), 0.72) * p.r * (i < 5 ? 0.45 : 1);   // heaped toward the centre; a few always cover it
      add(pile, p.x + Math.cos(ang) * rad, p.y + Math.sin(ang) * rad * 0.8);
    }
    return pile;
  };
  mkPile(FIRST_PILE, null);
  cards.forEach(c => { c.pile = mkPile({ x: c.x, y: c.y, r: 66, n: 12 + ((rnd() * 5) | 0) }, c); });
  // loose singles on the near desk
  const d = G.desk;
  for (let i = 0; i < 12; i++) {
    const x = d[0] + 40 + rnd() * (d[2] - d[0] - 80), y = d[1] + 60 + rnd() * (d[3] - d[1] - 110);
    if (Math.abs(x) < 110 && y > -400 && y < -240) continue;           // not on the phone and its boxes
    add(null, x, y);
  }
  return { sheets, piles };
}

// ---- flour drifts on the near block (centre, radius). Seeded shapes are drawn in surfaces.js ----
// The last two are small: the spill at the sack's foot, and the untouched heap behind the sack that gives the cake away.
export const DRIFTS = [
  { x: -385, y: 255, r: 58 }, { x: -585, y: 95, r: 50 }, { x: -205, y: 410, r: 52 }, { x: -600, y: 415, r: 58 },
  { x: -474, y: 104, r: 26 }, { x: -432, y: -74, r: 34 }
];

// ---- shared, mutable game state ----
export const S = {
  t: 0,                 // game time, seconds (slowed by slow motion)
  rt: 0,                // real time, seconds since boot
  finds: [], byId: {}, live: [], cards: [],
  found: [],            // ids in the order found
  tracks: { w: 0, k: 0, v: 0, a: 0, c: 0 },
  props: [], colliders: [],
  sheets: [], piles: [],
  adPlayed: false, threeDone: false, firstInput: false,
  slow: 0,              // seconds of slow motion left (real time)
  reduced: false
};
