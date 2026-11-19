// smallart.js — how the notes, the small things and the ambient loops are drawn (CONTENT-v2, D and G2; small.js is the
// engine). Every picture here is flat fills straight onto the frame, and no text is drawn in a frame. ONE exception:
// the bay on the bench (G10) has stencilled lettering, baked once into one small sprite (baySprite, 74 x 56 units at
// 1.5 px a unit: 37 KB) that small.js hands to art.keep, so it is let go when far away like every other sprite.
// Nothing here allocates: a recipe is a few fills and it returns.
//
// HOW TO ADD A SMALL THING (part B does this for the rest; nothing else needs touching):
//   R[id]    its recipe: (g, t, u, dark) => void. Drawn in the thing's own units with its foot at 0,0 (a flat thing: its
//            middle; the engine has already turned it by its data-a). Light from the upper left. Heights at HK px a unit.
//            u: -1 at rest, else 0..1 through its one reaction. t.st: 1 once it has reacted (a lasting state).
//            t.said: it has spoken (a bench gadget's lamp goes green). t.ax, t.ay: the unit vector from the van to the
//            thing when it was touched (world), for "away from the van". dark: on the unlit mat: every fill is
//            PAL.matThing (F does that) but ONE fleck of #35524A, and no shadow.
//            At most 14 fills or strokes at rest, 18 in motion. No text, no numerals, no gradient.
//   BB[id]   its picture's box round its foot [x0, y0, x1, y1], at rest AND in motion (the engine grows a standing one)
//   SND[id]  its row in audio.js: tock roll jingle click blip thump whirr paper paper2, or '' (silent)
//   DUR[id]  how long its reaction lasts, seconds
//   and, only if it does more than its picture, an entry in small.js: FX (particles, a pool of light) or HOSTS.
import { S, PAL } from './world.js';
import { drawSpr, flat, STENCIL } from './art.js';

const HK = 0.6, TAU = 6.2832, PI = Math.PI;
const INK = 'rgba(20,17,15,.55)', SHADE = 'rgba(20,17,15,.22)', FLECK = '#35524A', BONE = '#F4F1E8';
export const ease = u => u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u);
export const out3 = u => { const v = u <= 0 ? 1 : u >= 1 ? 0 : 1 - u; return 1 - v * v * v; };
export const decay = (u, n) => Math.sin(u * n * PI) * (1 - u);
// the fill for the next shape: the colour, or the mat's dark shape when the thing is not lit
export function F(g, col, dark) { g.fillStyle = dark ? PAL.matThing : col; }
// a slab w x d on the ground (x, y = the middle of its plan), h high: its south face, then its top. Two fills.
export function sbox(g, x, y, w, d, h, top, side, dark) {
  const up = h * HK;
  F(g, side, dark); g.fillRect(x - w / 2, y + d / 2 - up, w, up);
  F(g, top, dark); g.fillRect(x - w / 2, y - d / 2 - up, w, d);
}
// a disc r on the ground at (x, y), h high: its side, then its top. Two fills.
export function scyl(g, x, y, r, h, top, side, dark) {
  const up = h * HK;
  F(g, side, dark); g.beginPath(); g.moveTo(x - r, y - up); g.lineTo(x - r, y); g.arc(x, y, r, PI, 0, true); g.lineTo(x + r, y - up); g.closePath(); g.fill();
  F(g, top, dark); g.beginPath(); g.arc(x, y - up, r, 0, TAU); g.fill();
}
// the hard shadow a slab throws (as art.bake throws it: 0.45 east and 0.30 south a unit of height). One fill.
export function shad(g, x, y, w, d, h) {
  const sx = h * 0.45, sy = h * 0.3, x0 = x - w / 2, y0 = y - d / 2, x1 = x + w / 2, y1 = y + d / 2;
  g.fillStyle = SHADE; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y0); g.lineTo(x1 + sx, y0 + sy); g.lineTo(x1 + sx, y1 + sy); g.lineTo(x0 + sx, y1 + sy); g.lineTo(x0, y1); g.closePath(); g.fill();
}
// ... and the one a disc throws. One fill.
export function shadc(g, x, y, r, h) {
  const sx = h * 0.45, sy = h * 0.3, a = Math.atan2(sy, sx);
  g.fillStyle = SHADE; g.beginPath(); g.arc(x, y, r, a + PI / 2, a - PI / 2); g.arc(x + sx, y + sy, r, a - PI / 2, a + PI / 2); g.closePath(); g.fill();
}

// ---------- small helpers of the recipes (none allocates) ----------
const c01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const DASH = [4, 3], NODASH = [];                                // the bay's dashed outline (made once, here)
// one digit of a stopwatch's display, as seven-segment bars added to the current path (x: its left edge; 2.6 x 4.6)
const SEGS = { '0': 'abcdef', '3': 'abcdg' };
function seg(g, d, x) {
  const w = 2.6, h = 4.6, q = 0.7, y = -2.3, on = SEGS[d];
  for (let i = 0; i < on.length; i++) {
    const c = on.charCodeAt(i);
    if (c === 97) g.rect(x, y, w, q); else if (c === 98) g.rect(x + w - q, y, q, h / 2); else if (c === 99) g.rect(x + w - q, y + h / 2, q, h / 2);
    else if (c === 100) g.rect(x, y + h - q, w, q); else if (c === 101) g.rect(x, y + h / 2, q, h / 2); else if (c === 102) g.rect(x, y, q, h / 2); else g.rect(x, y + h / 2 - q / 2, w, q);
  }
}
const disc = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
// a rectangle with its corners cut (the cheap way to a rounded corner): the path only
function cham(g, x, y, w, h, c) { g.beginPath(); g.moveTo(x + c, y); g.lineTo(x + w - c, y); g.lineTo(x + w, y + c); g.lineTo(x + w, y + h - c); g.lineTo(x + w - c, y + h); g.lineTo(x + c, y + h); g.lineTo(x, y + h - c); g.lineTo(x, y + c); g.closePath(); }
// a bench gadget's own small lamp: off on arrival like the table, green once the thing has been heard
const lampDot = (g, t, x, y) => { g.fillStyle = t.said ? PAL.green : '#41484C'; g.fillRect(x, y, 2, 2); };
// the four-point glint the headlights make on reflective tape (main.js), for the stills camera's flash
function star(g, x, y, r) { const q = r * 0.18; g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + q, y - q); g.lineTo(x + r, y); g.lineTo(x + q, y + q); g.lineTo(x, y + r); g.lineTo(x - q, y + q); g.lineTo(x - r, y); g.lineTo(x - q, y - q); g.closePath(); g.fill(); }
// which way a flat thing rolls: +1 or -1 along its own normal, away from the van
const awaySide = t => -Math.sin(t.a) * t.ax + Math.cos(t.a) * t.ay >= 0 ? 1 : -1;
// worked out ONCE, at module load: the swatch card's six colours, and each one dulled the way art.tapeRoll dulls a roll
const dull = h => { const v = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), l = v[0] * 0.3 + v[1] * 0.59 + v[2] * 0.11; return '#' + v.map(c => Math.round(c + (l - c) * 0.6).toString(16).padStart(2, '0')).join(''); };
const SW = [PAL.pink, PAL.gold, PAL.green, PAL.blue, PAL.lamp, PAL.crust], SWD = SW.map(dull);
// the globe's five plain blobs: where each sits on the ball (longitude, height) and how big it is
const GLON = [-0.7, 0.25, 1.1, 2.5, 3.9], GLAT = [-3.2, 2.8, -2.2, 1.8, -2.6], GRX = [3.6, 3.2, 2.6, 3.4, 3], GRY = [2.4, 3, 2, 2.6, 2.2], GTILT = [0.5, -0.4, 0.3, -0.3, 0.4];

// ---------- the note lying on a table: pale yellow paper, 30 x 30, under a strip of masking tape ----------
// k: how far its curled corner stands up. Unread: 1 at rest, to 1.6 in its flick. Read: 0 (it lies flat), a little
// while it flutters. t.up: the paper is in the visitor's hand: only the strip of tape is left on the table.
export function note(g, t, k, dark) {
  if (!t.up) {
    const c = 9 * k;                                             // the fold: the south-east corner turned up
    if (!dark) { g.fillStyle = 'rgba(20,17,15,.3)'; g.fillRect(-14, -14, 30, 30); }
    F(g, '#FFE9BC', dark); g.beginPath(); g.moveTo(-15, -15); g.lineTo(15, -15); g.lineTo(15, 15 - c); g.lineTo(15 - c, 15); g.lineTo(-15, 15); g.closePath(); g.fill();
    if (!dark) {
      g.strokeStyle = INK; g.lineWidth = 1; g.stroke();
      g.strokeStyle = 'rgba(20,17,15,.5)'; g.lineWidth = 1.3; g.beginPath();      // the writing: three scribbles, 20, 22 and 13 long (plain polylines: a stroked curve is the dearest thing a recipe can draw)
      g.moveTo(-10, -4); g.lineTo(-4, -5.4); g.lineTo(3, -3.6); g.lineTo(10, -4.6);
      g.moveTo(-10, 2); g.lineTo(-3, 0.8); g.lineTo(5, 2.6); g.lineTo(12, 1.6);
      g.moveTo(-10, 8); g.lineTo(-4, 6.8); g.lineTo(3, 8.2);
      g.stroke();
      if (c > 0.5) {
        g.fillStyle = 'rgba(20,17,15,.25)'; g.beginPath(); g.moveTo(15 - c, 15); g.lineTo(15, 15 - c); g.lineTo(15 - c - 2, 15 - c - 2); g.closePath(); g.fill();
        g.fillStyle = '#FFF6DF'; g.beginPath(); g.moveTo(15 - c, 15); g.lineTo(15, 15 - c); g.lineTo(15 - c, 15 - c); g.closePath(); g.fill();
        g.strokeStyle = INK; g.lineWidth = 0.8; g.stroke();
      }
    }
  }
  g.save(); g.translate(0, -14.5); g.rotate(-0.07);              // the strip of tape, turned against the paper
  g.fillStyle = dark ? FLECK : PAL.masking; g.fillRect(-8, -2.5, 16, 5);
  if (!dark) { g.strokeStyle = INK; g.lineWidth = 0.8; g.strokeRect(-8, -2.5, 16, 5); }
  g.restore();
}

// ---------- the recipes ----------
export const R = {
  // 1 · a pencil, the same as every pencil already lying on the desk (art.pencilSprite's colours: wood, a steel
  // ferrule, a red eraser), so a visitor who taps one knows this one. It ROLLS aside from the van and comes back.
  pencil(g, t, u, dark) {
    let off = 0;
    if (u >= 0) { const s = u * 1.3, side = -Math.sin(t.a) * t.ax + Math.cos(t.a) * t.ay >= 0 ? 1 : -1; off = 14 * side * (s < 0.45 ? out3(s / 0.45) : s < 0.6 ? 1 : 1 - ease((s - 0.6) / 0.7)); }
    g.fillStyle = 'rgba(20,17,15,.3)'; g.fillRect(-19, off - 1.2, 38, 4.4);                                   // its hard shadow, a unit down and right
    // (it lies 3 units from the desk's edge: nothing of it reaches further west than -20) · each part: its side, then its top
    g.fillStyle = '#93382D'; g.fillRect(-20, off - 2.2, 5, 4.4); g.fillStyle = '#B9483A'; g.fillRect(-20, off - 2.2, 5, 3);      // the eraser
    g.fillStyle = '#6E7679'; g.fillRect(-15, off - 2.2, 4, 4.4); g.fillStyle = PAL.steel; g.fillRect(-15, off - 2.2, 4, 3);       // the ferrule
    g.fillStyle = '#B4935F'; g.fillRect(-11, off - 2.2, 28, 4.4); g.fillStyle = '#D8B98A'; g.fillRect(-11, off - 2.2, 28, 3);     // the wood
    g.fillStyle = '#E7D2A8'; g.beginPath(); g.moveTo(17, off - 2.2); g.lineTo(22.4, off - 0.5); g.lineTo(22.4, off + 0.5); g.lineTo(17, off + 2.2); g.closePath(); g.fill();   // the sharpened cone
    g.fillStyle = PAL.ink; g.beginPath(); g.moveTo(22, off - 0.7); g.lineTo(24.4, off); g.lineTo(22, off + 0.7); g.closePath(); g.fill();                                // the point
    const turn = off / 13.8, hy = ((turn - Math.floor(turn)) * 4.4 + 1) % 4.4;                               // one hard light, crossing its width as it turns
    if (u >= 0 && hy < 3.5) { g.fillStyle = 'rgba(255,248,230,.55)'; g.fillRect(-11, off - 2.2 + hy, 28, 0.9); }      // (only while it rolls: at rest it lies like the others)
  },

  // 2 · the roll of gold tape (a host: the roll itself is the one that stands there). Only its TONGUE is drawn here:
  // it shoots out like a tape measure on the side away from the van, holds, and snaps back.
  goldroll(g, t, u) {
    if (u < 0) return;
    const s = u * 0.72, k = s < 0.12 ? s / 0.12 : s < 0.62 ? 1 : Math.max(0, 1 - (s - 0.62) / 0.1), L = 12 + 22 * k;
    g.save(); g.rotate(Math.atan2(t.ay, t.ax));
    g.fillStyle = 'rgba(20,17,15,.22)'; g.fillRect(9, -1.6, L - 8, 5);
    g.fillStyle = S.tracks.w ? PAL.gold : '#D7B45B'; g.fillRect(8, -2.5, L - 8, 5);                           // dull until the desk has a find, as the roll is
    g.strokeStyle = INK; g.lineWidth = 1; g.strokeRect(8, -2.5, L - 8, 5);
    g.fillStyle = '#DCE1E3'; g.fillRect(L - 1, -3.5, 2, 7);                                                   // the steel tab at its tip
    g.restore();
  },
  // 18 · a small speaker on the mat. Its cone THUMPS three beats; a bone arc leaves on each.
  speaker(g, t, u, dark) {
    const s = u * 0.6;
    let p = 0; if (u >= 0) for (let i = 0; i < 3; i++) { const q = 1 - (s - i * 0.18) / 0.14; if (q > 0 && q <= 1) p = q; }      // 1..0 through each beat
    if (p > 0) g.scale(1 + 0.03 * p, 1 - 0.05 * p);
    if (!dark) shad(g, 0, 0, 12, 10, 16);
    sbox(g, 0, 0, 12, 10, 16, '#34302C', '#22282B', dark);
    if (!dark) { g.fillStyle = '#5C6467'; g.fillRect(-6, -14.6, 12, 0.9); }                                    // one hard light along its far top edge
    const cy = 0.6, r = 3.3 * (1 + 0.25 * p);
    g.fillStyle = dark ? FLECK : '#5B666D'; g.beginPath(); g.arc(0, cy, r + 0.75, 0, TAU); g.fill();                  // the cone, on its south face: a ring (two discs)
    F(g, '#22282B', dark); g.beginPath(); g.arc(0, cy, r - 0.75, 0, TAU); g.fill();
    if (!dark) {
      g.fillStyle = '#5B666D'; g.fillRect(-1, cy - 1, 2, 2);
      g.fillStyle = t.said ? PAL.pink : '#41484C'; g.fillRect(3.2, -3.9, 1.6, 1.6);                           // its lamp: on once it has been heard
      if (u >= 0) for (let i = 0; i < 3; i++) {                                                               // the arcs: each 0.22 s, from the cone outward
        const q = (s - i * 0.18) / 0.22; if (q <= 0 || q >= 1) continue;
        g.globalAlpha *= 1 - q; g.strokeStyle = BONE; g.lineWidth = 1.3; g.beginPath(); g.arc(0, cy, 5 + 9 * q, 0.2, PI - 0.2); g.stroke(); g.globalAlpha /= 1 - q;
      }
    }
  },

  // ================= THE DESK (gold tape) =================
  // 4 · a desk globe: three plain blobs on a blue ball (no coastline). It SPINS once: the blobs slide round the ball
  // (each is drawn narrower toward the ball's edge and not at all on its far side, so nothing needs a clip).
  globe(g, t, u) {
    const sp = u >= 0 ? TAU * out3(u) : 0, cy = -11.5;
    shadc(g, 0, 0, 7, 11);
    scyl(g, 0, 0, 7, 2.5, '#34302C', '#2B2F33', false);
    g.fillStyle = '#8C9598'; disc(g, 1.5, cy + 0.4, 9.7);                                                      // its half-ring arm: a steel crescent on the ball's east side
    g.fillStyle = PAL.blue; disc(g, 0, cy, 8.5);
    g.fillStyle = PAL.blueTape; disc(g, -0.9, cy - 0.9, 7.4);                                                  // lit from the upper left: the shade is the crescent that is left
    g.fillStyle = BONE;
    for (let i = 0; i < 5; i++) { const a = GLON[i] + sp, c = Math.cos(a); if (c > 0.12) { g.beginPath(); g.ellipse(Math.sin(a) * 5.6 - 0.4, cy + GLAT[i], GRX[i] * c, GRY[i], GTILT[i], 0, TAU); g.fill(); } }
    g.fillStyle = '#5C6467'; g.fillRect(-0.9, cy - 10.4, 1.8, 2.4);                                            // the pin at its pole
  },
  // 5 · a phone lying flat, blank. It WAKES: buzzes, then three gold lines type on its glass and stay a moment.
  phone(g, t, u) {
    const s = u * 3, on = u >= 0 && s >= 0.25 && s < 2.95;
    if (u >= 0 && s < 0.25) g.translate(Math.sin(s * 201) * 1, 0);                                            // eight buzzes in a quarter second
    g.fillStyle = 'rgba(20,17,15,.3)'; cham(g, -6.8, -12.6, 16, 28, 3); g.fill();
    g.fillStyle = PAL.ink; cham(g, -8, -14, 16, 28, 3); g.fill();
    g.fillStyle = on ? '#1D2A30' : '#07090A'; g.fillRect(-6.6, -11.6, 13.2, 23.2);
    if (on) { g.fillStyle = PAL.gold; g.fillRect(-5, -7.6, 8 * c01((s - 0.25) / 0.17), 1.5); g.fillRect(-5, -4.4, 6 * c01((s - 0.42) / 0.17), 1.5); g.fillRect(-5, -1.2, 7 * c01((s - 0.58) / 0.17), 1.5); }
    else { g.fillStyle = '#1D2A30'; g.beginPath(); g.moveTo(-6.6, -11.6); g.lineTo(0, -11.6); g.lineTo(-6.6, -1); g.closePath(); g.fill(); }      // the glare on dark glass
    g.fillStyle = '#5C6467'; g.fillRect(-1.5, -13.2, 3, 0.8);                                                  // its ear slot
  },
  // 6 · an opened laptop: its base turned over, the bottom panel off beside it, a screwdriver and two screws.
  // The SCREWDRIVER TURNS once where it lies, a screw hops, the fan gives a quarter turn.
  laptop(g, t, u) {
    const s = u * 0.6, fa = u >= 0 ? ease(s / 0.5) * PI / 2 : 0, c = Math.cos(fa) * 3.4, n = Math.sin(fa) * 3.4;
    g.fillStyle = 'rgba(20,17,15,.3)'; g.fillRect(-23.8, -14, 31, 23);
    g.fillStyle = '#8C9598'; g.fillRect(-25, -15.4, 31, 23);
    g.fillStyle = '#2B2F33'; g.fillRect(-23, -13.4, 27, 19);
    g.fillStyle = '#C9A44A'; g.beginPath(); g.rect(-21, -11.4, 7, 5); g.rect(-12, -11.4, 4.6, 3); g.rect(-21, -4, 4, 6.6); g.fill();   // three brass chips
    g.fillStyle = '#8C9598'; disc(g, -3.6, -1.4, 5);                                                           // the fan: a ring ...
    g.fillStyle = '#22282B'; disc(g, -3.6, -1.4, 3.8);
    g.strokeStyle = '#B8C0C3'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(-3.6 - c, -1.4 - n); g.lineTo(-3.6 + c, -1.4 + n); g.moveTo(-3.6 + n, -1.4 - c); g.lineTo(-3.6 - n, -1.4 + c); g.stroke();   // ... and a cross
    g.save(); g.translate(15.5, -3.6); g.rotate(0.2);                                                          // the panel, askew beside it
    g.fillStyle = 'rgba(20,17,15,.3)'; g.fillRect(-7.8, -9.6, 17, 21);
    g.fillStyle = '#B8C0C3'; g.fillRect(-9, -11, 17, 21);
    g.fillStyle = '#8C9598'; g.fillRect(-6, -8, 11, 1.2); g.fillRect(-6, -5.4, 11, 1.2);
    g.restore();
    g.fillStyle = '#5C6467'; g.fillRect(9.6, 13 - (u >= 0 && s < 0.25 ? 4 * Math.sin(PI * s / 0.25) : 0), 2.4, 2.4); g.fillRect(17, 10.6, 2.4, 2.4);      // two loose screws; one hops
    g.translate(-9, 13.2); g.rotate(-0.12 + (u >= 0 ? TAU * out3(s / 0.5) : 0));                               // the screwdriver
    g.fillStyle = '#5C6467'; g.fillRect(-3, -0.9, 16, 1.8);
    g.fillStyle = '#B9483A'; g.fillRect(-13, -2.2, 10.6, 4.4);
    g.fillStyle = '#93382D'; g.fillRect(-13, 0.6, 10.6, 1.6);
  },
  // 7 · a shoebox of receipts, its lid leaning on its east side. Three SLIPS JUMP out of it and drop back.
  shoebox(g, t, u) {
    const s = u * 0.6;
    shad(g, 0, 0, 30, 20, 12);
    g.fillStyle = '#8D7148'; g.fillRect(-15, -17.2, 30, 20);                                                   // the open box: its inside ...
    g.fillStyle = '#FBFCFD'; g.strokeStyle = INK; g.lineWidth = 0.6; g.beginPath();
    for (let i = 0; i < 5; i++) {                                                                             // ... five slips standing in it, torn tops, one path
      let top = -11.4 - (i * 7 % 3) * 1.3; if (u >= 0 && !(i & 1)) { const q = (s - i * 0.03) / 0.45; if (q > 0 && q < 1) top -= 8 * Math.sin(PI * q); }
      const x = -13.4 + i * 5.5;
      g.moveTo(x, 3); g.lineTo(x, top); g.lineTo(x + 1.2, top - 1.1); g.lineTo(x + 2.4, top); g.lineTo(x + 3.6, top - 1.1); g.lineTo(x + 4.8, top); g.lineTo(x + 4.8, 3); g.closePath();
    }
    g.fill(); g.stroke();
    g.fillStyle = '#B29263'; g.fillRect(-15, 2.8, 30, 7.2);                                                    // its south wall
    g.fillStyle = '#CFB488'; g.beginPath(); g.rect(-15, 2.8, 30, 1.2); g.rect(-15, -17.2, 1.3, 20); g.rect(13.7, -17.2, 1.3, 20); g.rect(-15, -17.2, 30, 1.3); g.fill();   // the rim
    g.fillStyle = '#B29263'; g.beginPath(); g.moveTo(15.4, -15); g.lineTo(18.6, -16); g.lineTo(22.4, 9); g.lineTo(19.2, 10); g.closePath(); g.fill();     // the lid, leaning
    g.fillStyle = '#D6BC92'; g.beginPath(); g.moveTo(15.4, -15); g.lineTo(17, -15.5); g.lineTo(20.8, 9.5); g.lineTo(19.2, 10); g.closePath(); g.fill();
  },

  // ================= THE BENCH (green tape): gadgets, off on arrival like the table =================
  // 10 · a beacon lamp. Its LIGHT TURNS ONCE over the bench: a wedge in two hard steps. Green once it has been heard.
  beacon(g, t, u) {
    if (u >= 0) {
      const a = -PI / 2 + TAU * ease(u), k = u < 0.12 ? u / 0.12 : u > 0.88 ? (1 - u) / 0.12 : 1;
      g.save(); g.globalAlpha *= k;
      g.fillStyle = 'rgba(255,196,107,.16)'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 60, a - 0.44, a + 0.44); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,196,107,.2)'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 34, a - 0.44, a + 0.44); g.closePath(); g.fill();
      g.restore();
    }
    shadc(g, 0, 0, 7, 7);
    scyl(g, 0, 0, 7, 4, '#34302C', '#22282B', false);
    g.fillStyle = u >= 0 ? '#FFE1A6' : t.said ? PAL.green : PAL.lamp; disc(g, 0, -4.6, 5.5);                    // the dome
    g.fillStyle = u >= 0 ? '#FFFFFF' : t.said ? PAL.greenTape : '#FFE1A6'; disc(g, -1.4, -6, 2.4);             // its cap of light
  },
  // 11 · a parcel chute with two small boxes at its foot. A third BOX SLIDES DOWN and knocks them: they hop.
  chute(g, t, u) {
    const s = u * 0.7; let h1 = 0, h2 = 0;
    if (u >= 0) { const a = (s - 0.35) / 0.18, b = (s - 0.41) / 0.18; if (a > 0 && a < 1) h1 = 3 * Math.sin(PI * a); if (b > 0 && b < 1) h2 = 3 * Math.sin(PI * b); }
    shad(g, -8, 0, 26, 12, 6);
    g.fillStyle = '#7F898E'; g.beginPath(); g.moveTo(-21, 0); g.lineTo(5, 4.8); g.lineTo(5, 6); g.lineTo(-21, 6); g.closePath(); g.fill();          // its south side: tall at the top of the slope
    g.fillStyle = '#DCE1E3'; g.beginPath(); g.moveTo(-21, -12); g.lineTo(5, -7.2); g.lineTo(5, 4.8); g.lineTo(-21, 0); g.closePath(); g.fill();    // the tray
    g.strokeStyle = '#5C6467'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-21, -12); g.lineTo(5, -7.2); g.moveTo(-21, 0); g.lineTo(5, 4.8); g.stroke();   // two rails
    lampDot(g, t, -19.6, 2.6);
    if (u >= 0 && s < 0.7) {                                                                                  // the third box: down the slope, quickening; gone by the end
      const p = s < 0.35 ? (s / 0.35) * (s / 0.35) : 1, al = s > 0.45 ? 1 - (s - 0.45) / 0.25 : 1;
      g.save(); g.globalAlpha *= al < 0 ? 0 : al; sbox(g, -16 + 17.5 * p, -1 - (10 - 8 * p) * HK, 8, 8, 6, '#CFB488', '#B29263', false); g.restore();
    }
    sbox(g, 10, 0.5 - h1, 8, 8, 6, '#CFB488', '#B29263', false); g.fillStyle = BONE; g.fillRect(7.9, -5.6 - h1, 4.2, 2.4);                       // a bone label on each, with nothing on it
    sbox(g, 18.6, 2.5 - h2, 8, 8, 6, '#CFB488', '#B29263', false); g.fillStyle = BONE; g.fillRect(16.5, -3.6 - h2, 4.2, 2.4);
  },
  // 12 · a tiny printer. Its PAPER FEEDS OUT in three ratchet steps, with three plain dashes on it, and stays out.
  printer(g, t, u) {
    const s = u * 0.6;
    let len = t.st ? 11 : 2;
    if (u >= 0) len = t.rn > 1 ? 11 + 1.6 * Math.sin(PI * u) : 2 + 3 * (c01(s / 0.12) + c01((s - 0.2) / 0.12) + c01((s - 0.4) / 0.12));
    shad(g, 0, 0, 20, 16, 9);
    sbox(g, 0, 0, 20, 16, 9, '#DDE1E3', '#8C9598', false);
    g.fillStyle = '#B8C0C3'; g.fillRect(-7, -11.4, 14, 6);                                                     // the lid of its paper tray
    g.fillStyle = '#FFFFFF'; g.fillRect(-10, -13.4, 20, 1);                                                   // one hard light along the far top edge
    g.fillStyle = '#22282B'; g.fillRect(-6.5, 3.4, 13, 1.4);                                                   // the slot
    g.fillStyle = 'rgba(20,17,15,.25)'; g.fillRect(-4, 5.2, 10, len);
    g.fillStyle = BONE; g.fillRect(-5, 4.2, 10, len);                                                          // the tongue of paper
    if (len > 4.5) { g.fillStyle = '#8C9598'; g.fillRect(-3.4, 4.2 + len - 3, 6, 1); if (len > 7.5) g.fillRect(-3.4, 4.2 + len - 6, 4, 1); if (len > 10.5) g.fillRect(-3.4, 4.2 + len - 9, 5, 1); }      // dashes only
    lampDot(g, t, 6.6, -0.6);
  },
  // 13 · headphones lying flat. Their CUPS THUMP twice and sound spreads from each.
  headphones(g, t, u) {
    const s = u * 0.6; let p = 0;
    if (u >= 0) { const a = 1 - s / 0.12, b = 1 - (s - 0.22) / 0.12; if (a > 0) p = a; else if (b > 0 && b <= 1) p = b; }
    const r = 5.6 * (1 + 0.18 * p);
    g.fillStyle = 'rgba(20,17,15,.28)'; g.beginPath(); g.arc(-8.4, 5.2, 5.6, 0, TAU); g.arc(10.6, 5.2, 5.6, 0, TAU); g.fill();
    g.fillStyle = '#22282B'; g.beginPath(); g.arc(0, 2, 11.6, PI, 0); g.arc(0, 2, 8.4, 0, PI, true); g.closePath(); g.fill();                       // the band: half a ring
    g.fillStyle = '#34302C'; g.beginPath(); g.arc(-9.6, 4, r, 0, TAU); g.arc(9.6, 4, r, 0, TAU); g.fill();                                          // the cups
    g.fillStyle = '#5B666D'; g.beginPath(); g.arc(-9.6, 4, r * 0.56, 0, TAU); g.arc(9.6, 4, r * 0.56, 0, TAU); g.fill();                            // their pads
    if (u >= 0) for (let i = 0; i < 2; i++) {                                                                 // two arcs from each cup, one a beat
      const q = (s - i * 0.22) / 0.3; if (q <= 0 || q >= 1) continue;
      g.save(); g.globalAlpha *= 1 - q; g.strokeStyle = BONE; g.lineWidth = 1.3; const rr = 7 + 9 * q;
      g.beginPath(); g.arc(-9.6, 4, rr, PI * 0.75, PI * 1.25); g.stroke(); g.beginPath(); g.arc(9.6, 4, rr, -PI * 0.25, PI * 0.25); g.stroke(); g.restore();
    }
  },
  // 14 · a small fan box. Its BLADES SPIN UP, run as one blur, spin down and stop: it switches itself off.
  fanbox(g, t, u) {
    const s = u * 2.2, cy = -8.4; let a = 0.5, blur = false;
    if (u >= 0) { if (s < 0.4) a += 40 * s * s; else if (s < 1.6) blur = true; else { const q = (2.2 - s) / 0.6; a += 16 * q * q; } }
    shad(g, 0, 0, 18, 18, 14);
    sbox(g, 0, 0, 18, 18, 14, '#B8C0C3', '#5C6467', false);
    g.fillStyle = '#DCE1E3'; g.fillRect(-9, -17.4, 18, 1);                                                    // one hard light along the far top edge
    g.fillStyle = '#5C6467'; disc(g, 0, cy, 7.2);                                                             // the fan, in its top: a ring ...
    g.fillStyle = '#22282B'; disc(g, 0, cy, 6);
    if (blur) { g.fillStyle = 'rgba(184,192,195,.5)'; disc(g, 0, cy, 5.4); }
    else { const c = Math.cos(a) * 5.4, n = Math.sin(a) * 5.4; g.strokeStyle = '#B8C0C3'; g.lineWidth = 1.7; g.beginPath(); g.moveTo(-c, cy - n); g.lineTo(c, cy + n); g.moveTo(n, cy - c); g.lineTo(-n, cy + c); g.stroke(); }      // ... and four blades
    g.fillStyle = '#8C9598'; disc(g, 0, cy, 1.7);
    g.fillStyle = '#34302C'; g.fillRect(-6.4, 3.4, 8, 1); g.fillRect(-6.4, 5.6, 8, 1);                         // two vent slits on its south face
    lampDot(g, t, 4.6, 3.6);
  },
  // 15 · a padlock lying flat. Its SHACKLE JUMPS open and snaps shut.
  padlock(g, t, u) {
    const s = u * 0.35, k = u < 0 ? 0 : s < 0.12 ? out3(s / 0.12) : s < 0.27 ? 1 : 1 - (s - 0.27) / 0.08, up = 4 * k, q = 1 - 0.08 * k;
    g.fillStyle = 'rgba(20,17,15,.3)'; g.fillRect(-5, 0, 12, 10);
    g.fillStyle = INK; g.beginPath(); g.moveTo(-5.8, 0); g.lineTo(-5.8, -2 - up); g.arc(0, -2 - up, 5.8, PI, 0); g.lineTo(5.8, 0); g.closePath(); g.fill();      // the shackle, on its keyline: an arch ...
    g.fillStyle = '#DCE1E3'; g.beginPath(); g.moveTo(-5, 0); g.lineTo(-5, -2 - up); g.arc(0, -2 - up, 5, PI, 0); g.lineTo(5, 0); g.closePath(); g.fill();
    g.fillStyle = PAL.bench; g.beginPath(); g.moveTo(-2.4, 0); g.lineTo(-2.4, -2 - up); g.arc(0, -2 - up, 2.4, PI, 0); g.lineTo(2.4, 0); g.closePath(); g.fill();   // ... with the bench showing through it
    g.fillStyle = '#C9A44A'; g.fillRect(-6, 9 - 10 * q, 12, 10 * q);                                           // the brass body
    g.fillStyle = '#A8873A'; g.fillRect(-6, 7, 12, 2);
    g.fillStyle = PAL.ink; g.fillRect(-1.2, 2, 2.4, 2.4); g.fillRect(-0.6, 4, 1.2, 2.6);                      // its keyhole
  },

  // 9 · a desk telephone: a dark body, its handset in the cradle, twelve blank keys (no figures). Its HANDSET RATTLES
  // in the cradle, as a phone does when it rings, and a ring comes off it on both sides.
  telephone(g, t, u) {
    const s = u * 0.6, k = u >= 0 ? decay(u, 8) : 0, hx = 1.6 * k, hy = -1.3 * Math.abs(k);
    shad(g, 0, 0, 22, 16, 7);
    sbox(g, 0, 0, 22, 16, 6, '#2B2F33', '#22282B', false);
    g.fillStyle = '#41484C'; g.fillRect(-11, -11.6, 22, 1);                                                    // one hard light along the far top edge
    g.fillStyle = '#8C9598'; g.beginPath();                                                                   // twelve blank keys, one path
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) g.rect(-5.2 + c * 2.8, -4.6 + r * 2.6, 1.6, 1.5);
    g.fill();
    g.fillStyle = 'rgba(20,17,15,.35)'; g.fillRect(-9, -7.4, 19, 1.6);                                        // the cradle's shadow under the handset
    g.fillStyle = '#5C6467'; g.fillRect(-10.6 + hx, -12.6 + hy, 5.4, 6); g.fillRect(5.2 + hx, -12.6 + hy, 5.4, 6);      // the handset lying across the top: its two ends ...
    g.fillRect(-6 + hx, -11.6 + hy, 12, 3.2);                                                                // ... and its grip
    g.fillStyle = '#8C9598'; g.fillRect(-10.6 + hx, -12.6 + hy, 5.4, 1); g.fillRect(5.2 + hx, -12.6 + hy, 5.4, 1); g.fillRect(-6 + hx, -11.6 + hy, 12, 0.8);
    if (u >= 0 && s < 0.5) {                                                                                  // the ring: three short ticks a side
      g.fillStyle = BONE; g.globalAlpha *= 1 - s / 0.5; const o = 2 + 6 * (s / 0.5);
      g.fillRect(-12 - o, -11, 1.2, 3); g.fillRect(-13.4 - o, -6.6, 2.4, 1.2); g.fillRect(-12 - o, -3.8, 1.2, 3);
      g.fillRect(11 + o, -11, 1.2, 3); g.fillRect(11 + o, -6.6, 2.4, 1.2); g.fillRect(11 + o, -3.8, 1.2, 3);
    }
    lampDot(g, t, 7.4, 5);
  },

  // G10 · an empty taped bay on the steel, the dashed outline of a machine in it, lettered YOUR MACHINE HERE (the tape
  // and the lettering are one baked sprite, t.sp; the outline is drawn live). Its OUTLINE LIGHTS: the dashes run once
  // round the bay in green, and once it has spoken they stay green: the slot is waiting.
  bay(g, t, u) {
    if (t.sp) drawSpr(g, t.sp, 0, 0);
    const k = u >= 0 ? 1 - u : 0;
    g.lineWidth = 1.4; g.setLineDash(DASH); g.lineDashOffset = u >= 0 ? -u * 28 : 0;
    g.strokeStyle = t.said || u >= 0 ? PAL.greenTape : 'rgba(238,241,243,.75)';
    g.strokeRect(-27, -19, 54, 38);                                                                           // the machine's outline ...
    g.strokeRect(19, 9, 5, 5);                                                                                // ... and its lamp, in a corner clear of the lettering
    g.setLineDash(NODASH); g.lineDashOffset = 0;
    if (k > 0) { g.globalAlpha *= 0.35 * k; g.fillStyle = PAL.greenTape; g.fillRect(-27, -19, 54, 38); }
  },

  // ================= THE MAT AND THE WOODS (pink tape): dark shapes until the light reaches them =================
  // 17 · two seats facing each other and a small camera on a stick between and behind them. Its RECORD LAMP COMES ON
  // (three blinks, then it stays) and both seats swivel toward the camera and back.
  interview(g, t, u, dark) {
    const s = u * 0.9, sw = u >= 0 && s < 0.5 ? 0.21 * Math.sin(PI * s / 0.5) : 0, rec = u >= 0 ? s >= 0.6 || (s * 10 | 0) % 2 === 0 : t.st === 1;
    if (!dark) { g.fillStyle = SHADE; g.beginPath(); g.rect(-20, -3, 12, 10); g.rect(14, -3, 12, 10); g.rect(1, -6, 9, 3); g.fill(); }
    for (let i = -1; i <= 1; i += 2) {                                                                        // a seat and its back, twice
      g.save(); g.translate(i * 17, 0); g.rotate(i * sw);      // (34 apart, not 40: the set is pushed about as ONE thing of radius 16, and a seat that stands further out is drawn into the van that pushes it)
      sbox(g, 0, 0, 10, 10, 7, '#5B666D', '#2B2F33', dark);
      F(g, '#2B2F33', dark); g.fillRect(i * 4.4 - 1.3, -15, 2.6, 20);
      if (!dark) { g.fillStyle = '#8C9598'; g.fillRect(i * 4.4 - 1.3, -15, 2.6, 1.2); }
      g.restore();
    }
    g.strokeStyle = dark ? PAL.matThing : '#8C9598'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(0, -16); g.lineTo(-5, -4); g.moveTo(0, -16); g.lineTo(5, -4); g.moveTo(0, -16); g.lineTo(0, -8); g.stroke();   // its three legs
    F(g, '#34302C', dark); g.fillRect(-4.6, -22, 9.2, 6.4);                                                    // the camera
    if (dark) { g.fillStyle = FLECK; g.fillRect(-1.2, -19.6, 2.4, 2.4); return; }
    g.fillStyle = '#5C6467'; g.fillRect(-4.6, -22, 9.2, 1.2);
    g.fillStyle = '#2A4656'; disc(g, -0.6, -18.2, 2.1);
    g.fillStyle = rec ? '#FF3B30' : '#41484C'; g.fillRect(2.4, -20.4, 1.9, 1.9);
  },
  // 19 · a colour swatch card, its six swatches dull. It is GRADED: each takes its full colour, left to right, and keeps it.
  swatch(g, t, u, dark) {
    const s = u * 0.7, n = u >= 0 ? (t.rn > 1 ? 6 : (s / 0.1 | 0) + 1) : t.st ? 6 : 0, hot = u >= 0 ? (s / 0.1 | 0) : -1;
    if (!dark) { g.fillStyle = 'rgba(20,17,15,.3)'; g.fillRect(-12, -7, 26, 16); }
    F(g, BONE, dark); g.fillRect(-13, -8, 26, 16);
    if (dark) { g.fillStyle = FLECK; g.fillRect(-11.6, -6, 23.2, 2); return; }
    for (let i = 0; i < 6; i++) { g.fillStyle = i < n ? SW[i] : SWD[i]; if (i === hot) g.fillRect(-11.6 + i * 4 - 0.4, -7.4, 4, 11.4); else g.fillRect(-11.6 + i * 4, -6, 3.2, 9); }
    g.fillStyle = 'rgba(20,17,15,.45)'; g.fillRect(-11.6, 4.6, 12, 1);
  },
  // 20 · a small LED light panel on a low yoke, off. It LIGHTS: two flickers, then it stays lit (and the mat gains a lamp).
  ledpanel(g, t, u, dark) {
    const on = u >= 0 ? u < 0.167 || (u >= 0.333 && u < 0.5) || u >= 0.667 : t.st === 1;
    if (!dark) { g.fillStyle = SHADE; g.fillRect(-4.6, -0.6, 13, 3.4); }
    F(g, '#2B2F33', dark); g.fillRect(-6, -1.6, 12, 3.2);
    F(g, '#5C6467', dark); g.fillRect(-1, -7, 2, 6);
    if (on && !dark) { g.fillStyle = 'rgba(255,233,188,.24)'; cham(g, -15.6, -19.6, 31.2, 16.8, 4); g.fill(); }  // its glow: one hard step
    F(g, '#22282B', dark); g.fillRect(-12, -16, 24, 10.4);
    if (dark) { g.fillStyle = FLECK; g.fillRect(-9.2, -13.6, 18.4, 1.4); return; }
    g.fillStyle = on ? '#FFE9BC' : '#41484C'; g.fillRect(-11, -15, 22, 8.4);
    g.fillStyle = on ? '#FFFFFF' : '#5C6467'; g.beginPath();
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) g.rect(-9.2 + c * 4.2, -13.8 + r * 2.5, 1.6, 1.3);                                      // fifteen dots, one path
    g.fill();
  },
  // 21 · a stills camera. It FLASHES: one white glint at its flash window, and its pool of light jumps and settles.
  camera(g, t, u, dark) {
    if (t.pl) t.pl[2] = u >= 0 ? 30 + 30 * (1 - out3(u)) : 30;
    if (!dark) shad(g, 0, 0, 16, 10, 9);
    sbox(g, 0, 0, 16, 10, 9, '#5C6467', '#2B2F33', dark);
    F(g, '#34302C', dark); g.fillRect(-3.6, -13, 7.2, 3.2);                                                    // its prism hump
    if (dark) { g.fillStyle = FLECK; disc(g, -1.4, 2.2, 2.4); return; }
    g.fillStyle = '#8C9598'; disc(g, -1.4, 2.2, 4.2);                                                          // the lens: a ring and its glass
    g.fillStyle = '#2A4656'; disc(g, -1.4, 2.2, 3.1);
    g.fillStyle = BONE; g.fillRect(-3, 0.6, 1.3, 1.3); g.fillRect(4.6, -0.2, 2.8, 1.7);                        // a glint on the glass; the flash window
    if (u >= 0 && u < 0.4) { g.fillStyle = '#FFFFFF'; star(g, 6, 0.6, 16 - 6 * u / 0.4); }
  },
  // 22 · a strip of keyframe diamonds. A pink PLAYHEAD RUNS the strip; each diamond pops as it is passed and stays pink.
  keyframes(g, t, u, dark) {
    const px = -30 + 60 * u, done = t.st === 1 && (u < 0 || t.rn > 1);
    F(g, PAL.matThing, dark); g.fillRect(-32, -5.5, 64, 11);
    g.fillStyle = dark ? FLECK : 'rgba(244,241,232,.55)'; g.fillRect(-30, -0.4, 60, 0.8);
    if (dark) return;
    for (let i = 0; i < 4; i++) {
      const x = -24 + i * 16, past = u >= 0 && px > x; let r = 2.8;
      if (past) { const q = (px - x) / 10; if (q < 1) r *= 1.5 - 0.5 * q; }
      g.fillStyle = done || past ? PAL.pink : BONE; g.beginPath(); g.moveTo(x - r, 0); g.lineTo(x, -r); g.lineTo(x + r, 0); g.lineTo(x, r); g.closePath(); g.fill();
    }
    if (u >= 0) { g.fillStyle = PAL.pink; g.fillRect(px - 0.7, -7, 1.4, 14); }
  },
  // G6 · a stopwatch lying on the mat, stopped at 30:00 (CONTENT-v2 D). Its BUTTON CLICKS and the time blinks twice, the
  // way a stopped stopwatch does. A tap on it plays the cantata (small.js go(): it has a data-yt).
  stopwatch(g, t, u, dark) {
    const s = u * 0.9, press = u >= 0 && s < 0.16 ? 1.2 : 0, blink = u >= 0 && ((s > 0.24 && s < 0.38) || (s > 0.52 && s < 0.66));
    if (!dark) { g.fillStyle = 'rgba(20,17,15,.3)'; g.beginPath(); g.arc(1.2, 1.6, 11, 0, TAU); g.fill(); }
    F(g, '#8C9598', dark); g.fillRect(-2.8, -15.6 + press, 5.6, 2.4); g.fillRect(-1.4, -13.6 + press, 2.8, 3);      // the crown: its button and its stem
    F(g, '#2B2F33', dark); disc(g, 0, 0, 11);                                                                 // the case
    if (dark) { g.fillStyle = FLECK; g.fillRect(-7, -2.6, 14, 2); return; }
    g.fillStyle = '#5C6467'; disc(g, 0, 0, 9.6);                                                              // its bezel ...
    g.fillStyle = '#22282B'; disc(g, 0, 0, 8.6);
    g.fillStyle = '#DCE1E3'; g.fillRect(-7.6, -3.6, 15.2, 7.2);                                               // ... and its display
    g.fillStyle = '#FFFFFF'; g.fillRect(-7.6, -3.6, 15.2, 0.8);
    g.fillStyle = '#41484C'; g.fillRect(6.6, -9.4, 2.6, 2);                                                   // a side button
    if (!blink) { g.fillStyle = '#22282B'; g.beginPath(); seg(g, '3', -6.9); seg(g, '0', -3.6); g.rect(-0.6, -1.6, 0.8, 0.8); g.rect(-0.6, 0.8, 0.8, 0.8); seg(g, '0', 0.8); seg(g, '0', 4.1); g.fill(); }
    g.fillStyle = PAL.pink; g.fillRect(-3, 5.2, 6, 1.2);                                                      // one pink mark under the time: the mat's colour
  },
  // 24 · three offset squares, one over the other. The LAYERS FAN OUT and settle back.
  squares(g, t, u, dark) {
    let o = 5; if (u >= 0) { const s = u * 0.65; o = 5 + 5 * (s < 0.25 ? out3(s / 0.25) : 1 - ease((s - 0.25) / 0.4)); }
    F(g, 'rgba(244,241,232,.45)', dark); cham(g, o - 8, o - 8, 16, 16, 3); g.fill();
    F(g, 'rgba(244,241,232,.72)', dark); cham(g, -8, -8, 16, 16, 3); g.fill();
    F(g, BONE, dark); cham(g, -o - 8, -o - 8, 16, 16, 3); g.fill();
    if (dark) { g.fillStyle = FLECK; g.fillRect(-o - 5, -o - 8, 10, 1.3); }
  },
  // 25 · a marshmallow on a stick, pointing at the campfire. It TOASTS: the stick dips to the fire, the marshmallow browns and stays brown.
  stick(g, t, u, dark) {
    const s = u * 0.9, b = u >= 0 && t.rn < 2 ? c01(s / 0.6) : t.st;
    if (u >= 0) { g.translate(-17, 0); g.rotate(-0.17 * (s < 0.3 ? out3(s / 0.3) : s < 0.6 ? 1 : 1 - ease((s - 0.6) / 0.3))); g.translate(17, 0); }
    F(g, '#8A6238', dark); g.fillRect(-17, -0.9, 29, 1.8);
    g.fillStyle = dark ? FLECK : '#FBF8F1'; cham(g, 10.6, -2.7, 6.4, 5.4, 1.2); g.fill();
    if (!dark && b > 0) { g.globalAlpha *= 0.86 * b; g.fillStyle = PAL.crust; cham(g, 10.6, -2.7, 6.4, 5.4, 1.2); g.fill(); }
  },

  // ================= THE BLOCK (blue tape) =================
  // 26 · a whisk. It WHISKS: swings about the end of its handle, dying out (and throws a little flour: small.js FX).
  whisk(g, t, u) {
    if (u >= 0) { g.translate(-19, 0); g.rotate(0.44 * decay(u, 8)); g.translate(19, 0); }
    g.lineWidth = 1.2;
    for (let p = 0; p < 2; p++) {                                                                             // four wires (two loops): their shadow, then the steel
      const o = p ? 0 : 1.2; g.strokeStyle = p ? '#DCE1E3' : 'rgba(20,17,15,.3)'; g.beginPath();
      g.moveTo(-6 + o, o); g.lineTo(2 + o, -5.8 + o); g.lineTo(13 + o, -4.8 + o); g.lineTo(19.5 + o, o); g.lineTo(13 + o, 4.8 + o); g.lineTo(2 + o, 5.8 + o); g.closePath();
      g.moveTo(-6 + o, o); g.lineTo(3 + o, -2.3 + o); g.lineTo(13 + o, -1.9 + o); g.lineTo(19.5 + o, o); g.lineTo(13 + o, 1.9 + o); g.lineTo(3 + o, 2.3 + o); g.closePath();
      g.stroke();
    }
    g.fillStyle = 'rgba(20,17,15,.3)'; g.fillRect(-19, -0.6, 14, 3.8);
    g.fillStyle = PAL.steel; g.fillRect(-20, -1.9, 14, 3.8);                                                   // the handle
    g.fillStyle = '#DCE1E3'; g.fillRect(-20, -1.9, 14, 1.1);
    g.fillStyle = '#5C6467'; g.fillRect(-7.4, -2.4, 2, 4.8);
  },
  // 27 · a knife on a board. THREE CHOPS: the knife rocks about its tip and leaves three thin slices, which stay.
  knife(g, t, u) {
    const s = u * 0.45; let n = t.st ? 3 : 0, k = 0;
    if (u >= 0) { const i = s / 0.15 | 0, q = (s - i * 0.15) / 0.11; k = q < 1 ? Math.sin(PI * q) : 0; if (t.rn < 2) n = i + (q > 0.5 ? 1 : 0); }
    g.fillStyle = SHADE; g.fillRect(-18.6, -11.6, 40, 26.6);
    g.fillStyle = PAL.grain; g.fillRect(-20, -13, 40, 26.6);                                                   // the board: its south edge ...
    g.fillStyle = PAL.wood; g.fillRect(-20, -13, 40, 25);                                                      // ... and its top
    g.fillStyle = 'rgba(20,17,15,.2)'; g.beginPath(); g.rect(-15, -8.6, 15, 0.8); g.rect(-3, -5.6, 18, 0.8); g.rect(-12, -2.4, 13, 0.8); g.fill();    // three old cut lines
    g.fillStyle = '#F4F1E8'; g.fillRect(-12, 6, 18 - 1.6 * n, 3.4);                                            // what is being cut: a pale stalk ...
    g.fillStyle = PAL.pineLit; g.fillRect(-12, 6, 4.4, 3.4);                                                   // ... with a green end
    if (n > 0) { g.fillStyle = '#F4F1E8'; g.fillRect(8.4, 5.8, 1.3, 3.8); if (n > 1) g.fillRect(6, 6.2, 1.3, 3.8); if (n > 2) g.fillRect(3.6, 5.8, 1.3, 3.8); }      // the slices
    g.translate(-16, 1.4); g.rotate(-0.22 + 0.4 * k);                                                          // the knife, rocking about its tip
    g.fillStyle = 'rgba(20,17,15,.25)'; g.beginPath(); g.moveTo(1, 1.4); g.lineTo(7, -1.6); g.lineTo(24, -1.6); g.lineTo(24, 4); g.lineTo(5, 4); g.closePath(); g.fill();
    g.fillStyle = '#DCE1E3'; g.beginPath(); g.moveTo(0, 0); g.lineTo(6, -3); g.lineTo(23, -3); g.lineTo(23, 2.6); g.lineTo(4, 2.6); g.closePath(); g.fill();
    g.fillStyle = '#FFFFFF'; g.fillRect(4, 1.5, 19, 1.1);                                                      // its edge: one hard light
    g.fillStyle = '#22282B'; g.fillRect(23, -2.4, 10, 4.4);
  },
  // 28 · a rolling pin. It ROLLS aside from the van and comes back (and leaves a little flour: small.js FX).
  rollingpin(g, t, u) {
    let off = 0;
    if (u >= 0) { const s = u * 1.3; off = 24 * awaySide(t) * (s < 0.5 ? out3(s / 0.5) : 1 - ease((s - 0.5) / 0.8)); }
    const turn = off / 14.1, hy = (turn - Math.floor(turn)) * 4.6;
    g.fillStyle = 'rgba(20,17,15,.3)'; g.fillRect(-16.6, off - 3, 36, 9);
    g.fillStyle = PAL.grain; g.fillRect(-25, off - 2, 50, 4);                                                  // the two handles: one bar under the barrel
    g.fillStyle = PAL.wood; g.fillRect(-25, off - 2, 50, 2.4);
    g.fillStyle = '#B4935F'; g.fillRect(-18, off - 4.5, 36, 9);                                                // the barrel
    g.fillStyle = '#D8B98A'; g.fillRect(-18, off - 4.5, 36, 6);
    g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(-16, off - 4.2 + hy, 32, 1.2);                            // one hard light, crossing its width as it turns
  },

  // ================= THE GARAGE (masking tape) =================
  // 37 · a key ring on a cup hook, on the outer end of the garage's east flap: two keys and a fob the shape of the van.
  // The KEYS SWING, four swings dying out.
  keyring(g, t, u) {
    g.strokeStyle = '#C9A44A'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-7.4, -2); g.lineTo(-1, -2); g.lineTo(-1, 0.6); g.stroke();      // the hook, screwed into the flap's end
    g.translate(-1, 0); if (u >= 0) g.rotate(0.38 * decay(u, 8));
    g.strokeStyle = '#5C6467'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(-1.6, 0.4); g.lineTo(1.6, 0.4); g.lineTo(3.8, 2.6); g.lineTo(3.8, 5.6); g.lineTo(1.6, 7.8); g.lineTo(-1.6, 7.8); g.lineTo(-3.8, 5.6); g.lineTo(-3.8, 2.6); g.closePath(); g.stroke();   // the ring: eight straight sides
    g.fillStyle = '#DCE1E3'; g.strokeStyle = INK; g.lineWidth = 0.7;
    g.save(); g.translate(0, 7.4); g.rotate(0.95); g.beginPath(); g.rect(-2.2, 0, 4.4, 4); g.rect(-1, 4, 2, 7); g.rect(1, 7, 1.4, 1.4); g.fill(); g.stroke(); g.restore();      // two keys, fanned to the west
    g.save(); g.translate(0, 7.4); g.rotate(0.3); g.beginPath(); g.rect(-2.2, 0, 4.4, 4); g.rect(-1, 4, 2, 6); g.rect(1, 6.4, 1.4, 1.4); g.fill(); g.stroke(); g.restore();
    g.translate(0, 7.4); g.rotate(-0.55);
    g.fillStyle = BONE; cham(g, -2.8, 1, 5.6, 9, 1.3); g.fill(); g.stroke();                                   // the fob: the van, bone ...
    g.fillStyle = PAL.gold; g.fillRect(-2.8, 6.2, 5.6, 1.4);                                                   // ... with its one gold stripe
    g.fillStyle = PAL.glass; g.fillRect(-1.9, 2.4, 3.8, 1.9);
  }
};
export const BB = {
  note: [-22, -22, 22, 22],
  pencil: [-24, -20, 27, 20],
  'goldroll:fx': [-38, -38, 38, 38],
  globe: [-12, -22, 13, 9], phone: [-18, -18, 18, 18], laptop: [-27, -18, 27, 28], shoebox: [-17, -20, 24, 12],
  beacon: [-9, -12, 9, 8], chute: [-23, -15, 24, 9], printer: [-12, -15, 12, 17], headphones: [-26, -12, 26, 22], fanbox: [-11, -19, 11, 10], padlock: [-8, -13, 8, 11],
  interview: [-25, -23, 25, 7], speaker: [-16, -18, 16, 17], swatch: [-17, -17, 17, 17], ledpanel: [-16, -20, 16, 4], camera: [-10, -14, 10, 7],
  keyframes: [-33, -9, 33, 9], squares: [-20, -20, 20, 20], stick: [-21, -21, 21, 21],
  whisk: [-27, -27, 27, 27], knife: [-22, -15, 23, 16], rollingpin: [-40, -40, 40, 40],
  keyring: [-10, -4, 9, 20],
  telephone: [-14, -16, 16, 13], stopwatch: [-14, -18, 14, 14], bay: [-38, -29, 38, 29],
  fan: [-16, -32, 20, 14],
  arm: [-14, -46, 44, 16]
};
// (a standing thing's box is its body: the engine grows it by 30 before culling, so a beam, an arc or a glint that reaches
// past it is still drawn; and the box's top is how high a finger may tap it)
export const SND = {
  pencil: 'roll', goldroll: 'tock', clipchain: 'jingle', globe: 'tock', phone: 'click', laptop: 'click', shoebox: 'paper',
  beacon: 'blip', chute: 'thump', printer: 'click', headphones: 'thump', fanbox: 'whirr', padlock: 'click',
  sdcard: 'click', interview: 'blip', speaker: 'thump', swatch: 'blip', ledpanel: 'blip', camera: 'click', keyframes: 'blip', squares: 'tock', stick: '',
  whisk: 'jingle', knife: 'roll', rollingpin: 'roll', scraper: 'paper', keyring: 'jingle',
  telephone: 'ring', stopwatch: 'blip', bay: 'blip'
};
export const DUR = {
  note: 0.5, pencil: 1.3, goldroll: 0.72, clipchain: 0.5, globe: 0.9, phone: 3, laptop: 0.6, shoebox: 0.6,
  beacon: 1.2, chute: 0.7, printer: 0.6, headphones: 0.6, fanbox: 2.2, padlock: 0.35,
  sdcard: 0.3, interview: 0.9, speaker: 0.6, swatch: 0.7, ledpanel: 0.3, camera: 0.3, keyframes: 0.8, squares: 0.65, stick: 0.9,
  whisk: 0.6, knife: 0.45, rollingpin: 1.3, scraper: 0.7, keyring: 1.2,
  telephone: 0.6, stopwatch: 0.9, bay: 0.8
};

// ---------- the two mute props of the ambient loops ----------
// The desk fan. a: where its head points, radians in the plan (the engine sweeps it; at rest it points west).
export function fan(g, t, a) {
  const ca = Math.cos(a), sa = Math.sin(a), hx = ca * 3, hy = -13 + sa * 3;
  shadc(g, 0, 0, 7, 3);
  scyl(g, 0, 0, 7, 3, '#34302C', '#2B2F33', false);
  g.fillStyle = '#8C9598'; g.fillRect(-1.2, -11, 2.4, 9.4);                                                    // the stem
  g.fillStyle = '#2B2F33'; g.beginPath(); g.ellipse(hx - ca * 5, hy - sa * 5, 3.6, 3, a, 0, TAU); g.fill();    // the motor, behind the cage
  g.fillStyle = INK; g.beginPath(); g.ellipse(hx, hy, 10.7, 5.2, a + PI / 2, 0, TAU); g.fill();                // the cage, seen from above, on its keyline
  g.fillStyle = '#AEB6B9'; g.beginPath(); g.ellipse(hx, hy, 10, 4.5, a + PI / 2, 0, TAU); g.fill();
  g.fillStyle = 'rgba(92,100,103,.35)'; g.beginPath(); g.ellipse(hx + ca, hy + sa, 8.4, 3.2, a + PI / 2, 0, TAU); g.fill();   // the blades, one blur
  g.fillStyle = '#5C6467'; g.beginPath(); g.arc(hx + ca * 2.4, hy + sa * 2.4, 1.6, 0, TAU); g.fill();          // the hub
}
// The bench's small robot arm. c: -1 folded and still (its stretch of belt is not running), else seconds into its
// 3.2 s turn: 1.2 s from its east side to its north side with a parcel, 0.4 s setting it down, 1.2 s back, 0.4 s
// picking the next one up. The parcel is a show parcel: three fills, never one of the belt's own.
export function arm(g, t, c) {
  let ph = 0, pk = 0, R2 = 15;                                   // ph: 0 east .. 1 north · pk: how much of a parcel is in its hand · R2: its reach
  if (c >= 0) { R2 = 29; if (c < 1.2) { ph = ease(c / 1.2); pk = 1; } else if (c < 1.6) { ph = 1; pk = 1 - (c - 1.2) / 0.4; } else if (c < 2.8) ph = 1 - ease((c - 1.6) / 1.2); else pk = (c - 2.8) / 0.4; }
  const an = -ph * PI / 2, lift = c >= 0 ? 7 * Math.sin(ph * PI) : 0, hx = Math.cos(an) * R2, hy = Math.sin(an) * R2 - 5 - lift, ex = hx * 0.45 + 4, ey = hy * 0.45 - 9;      // (the elbow stands up and a little east of the straight line, so the two links read as two)
  shadc(g, 0, 0, 8, 4);
  if (pk > 0.05) {                                               // the parcel hangs under the hand; its shadow lies on the bench below it
    const w = 10 * pk, d = 7 * pk, py = hy + 5 + lift * 0.5;
    g.fillStyle = SHADE; g.fillRect(hx - w / 2 + 2, hy + 6 + lift, w, d);
    g.fillStyle = '#A5865A'; g.fillRect(hx - w / 2, py + d - 3 * pk, w, 3 * pk);
    g.fillStyle = '#CFB488'; g.fillRect(hx - w / 2, py - 3 * pk, w, d);
    g.fillStyle = 'rgba(20,17,15,.28)'; g.fillRect(hx - 0.8 * pk, py - 3 * pk, 1.6 * pk, d);
  }
  scyl(g, 0, 0, 8, 4, '#34302C', '#22282B', false);
  g.strokeStyle = '#8C9598'; g.lineWidth = 3.4; g.beginPath(); g.moveTo(0, -5); g.lineTo(ex, ey); g.lineTo(hx, hy); g.stroke();      // two links
  g.strokeStyle = '#DCE1E3'; g.lineWidth = 1; g.beginPath(); g.moveTo(-0.6, -5.8); g.lineTo(ex - 0.6, ey - 0.8); g.lineTo(hx - 0.6, hy - 0.8); g.stroke();
  g.fillStyle = '#5C6467'; g.beginPath(); g.arc(0, -5, 2.6, 0, TAU); g.arc(ex, ey, 2.2, 0, TAU); g.fill();                          // shoulder and elbow
  g.strokeStyle = '#22282B'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(hx - 3.4, hy + 4.5); g.lineTo(hx - 3.4, hy); g.lineTo(hx + 3.4, hy); g.lineTo(hx + 3.4, hy + 4.5); g.stroke();   // the two-finger gripper
}

// ---------- the loops that are not a prop ----------
// A moth round the garage's bulb (the bulb hangs 7.5 under the garage prop's place x, y): a bone speck with two wing
// flecks, once round in 2.6 s, not drawn on the quarter of its turn where it is behind the bulb.
export function moth(g, x, y, rt) {
  const a = rt * TAU / 2.6, q = (a / TAU) % 1; if (q > 0.625 && q < 0.875) return;                            // (the top of its turn: behind the bulb)
  const mx = x + Math.cos(a) * 10 + Math.sin(rt * 7.3) * 1.5, my = y + 7.5 + Math.sin(a) * 6 + Math.cos(rt * 5.1) * 1.5, w = 1.3 + Math.sin(rt * 46) * 0.7;
  g.fillStyle = BONE; g.fillRect(mx - 0.8, my - 0.8, 1.6, 1.6);
  g.fillStyle = 'rgba(244,241,232,.7)'; g.fillRect(mx - 0.8 - w, my - 1.3, w, 1.2); g.fillRect(mx + 0.8, my - 1.3, w, 1.2);
}
// Flour motes in the loaf lamp's light: six specks, each on its own slow line across the pool (the pool's middle is
// 20, 20 off the loaf at -228, 35; periods 7 to 13 s, phases fixed).
export function motes(g, rt) {
  g.fillStyle = 'rgba(255,255,255,.45)';
  for (let i = 0; i < 6; i++) {
    const per = 7 + i * 1.2, u = ((rt + i * 2.7) / per) % 1, a = i * 1.9 + 0.4, r = 70 - i * 6;
    const x = -208 + Math.cos(a) * r * (u * 2 - 1) + Math.sin(a) * (i * 7 - 16), y = 55 + (Math.sin(a) * r * (u * 2 - 1) - Math.cos(a) * (i * 7 - 16)) * 0.6 - Math.sin(u * PI) * 5;
    g.fillRect(x - 0.6, y - 0.6, 1.2, 1.2);      // (a square 1.2 across is a speck; six arcs in one path cost ten times as much)
  }
}

// ---------- the bay's one baked picture: its tape and its stencilled lettering (G10). Origin = its middle ----------
// head: the words of its <b data-head> (YOUR MACHINE HERE), in three rows. Baked once by small.js through art.keep.
export const BAY = { w: 74, h: 56 };
export function baySprite(head) {
  const W = BAY.w, H = BAY.h;
  return flat(W, H, W / 2, H / 2, g => {
    g.fillStyle = 'rgba(20,17,15,.18)'; g.fillRect(3, 3.6, W - 4, 3); g.fillRect(3, H - 6.4, W - 4, 3); g.fillRect(3, 3.6, 3, H - 8); g.fillRect(W - 5, 3.6, 3, H - 8);
    g.fillStyle = PAL.greenTape;                                     // four strips of the bench's green tape, laid a little past each other at the corners
    g.fillRect(1, 2, W - 2, 3); g.fillRect(2, H - 5, W - 3, 3); g.fillRect(2, 1, 3, H - 3); g.fillRect(W - 5, 2, 3, H - 3);
    const ws = head.split(' '), rows = ws.length === 3 ? ws : [head];
    g.fillStyle = 'rgba(238,241,243,.88)'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    let fs = 8.6 / 0.7; g.font = '900 ' + fs + 'px ' + STENCIL;
    let wmax = 0; for (const r of rows) wmax = Math.max(wmax, g.measureText(r).width);
    if (wmax > 44) { fs *= 44 / wmax; g.font = '900 ' + fs + 'px ' + STENCIL; }
    const cap = fs * 0.7, gap = 3.2, top = H / 2 - (rows.length * cap + (rows.length - 1) * gap) / 2;
    rows.forEach((r, i) => g.fillText(r, W / 2 - 1.5, top + cap + i * (cap + gap)));
  }, 0, 1.5);
}
