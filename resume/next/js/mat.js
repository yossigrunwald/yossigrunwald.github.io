// mat.js — the rest of the mat and the woods: the slate at the mouth of the mat, skit phones 2 and 3, the folding
// chair, the freelance kit, the dolly track and the set dressing round it, the bunting gate, the camp's bedsheet and
// fire, the three smaller sheets hidden among the pines, and the nodes the autopilot uses to find its way among them.
// Light rules of spec 8.4: main.js draws each of these props dark, and lit only inside the headlight wedge or a lit
// circle; a prop's glow() is what it shows in the dark (an LED, an ember, a strip of reflective tape).
//
// THE WOODS ARE A PLACE TO SEARCH. One sheet stands in the open by the fire: the reward for coming in through the gate.
// The other three are out of its light and out of sight of each other, each in a room of its own that is entered one
// way, round trees:
//   the weekly recap, north-east: behind the big sheet's east end. Its room opens to the fire clearing between the big
//     sheet's east pine and a wall of four pines; a short band of bunting hung on that wall is its tell.
//   the promo, south-west: behind a hedge of three pines south of the fire. Reached down the lane past its east end,
//     or from the open mat to the west; the long cable from the chair ends at its post.
//   color war, south-east: behind the densest pines (a thicket stands in front of it, solid to the table's edges). It
//     is met from behind, down the lane between the wall and the thicket; its flag's reflective stripe is its tell.
// Every block of pines that closes a gap is one collider; every way left open is a lane of 44 units or more.
import { S, PAL, WOODS, SEED, MEDIA, mulberry32, addNode, addCollider, standable, collidersNear, collDist, surfaceAt } from './world.js';
import * as art from './art.js';
import * as ma from './matart.js';
import { spr, lit, loops, prop, cbox, ccirc, squash, makeLoop, startLoop, addScreen, grab, drawScreen, nearView, skitRim, playSmall, glass, NOSPR } from './kit.js';
import { van } from './van.js';
import { emit } from './surfaces.js';
import * as audio from './audio.js';

const TAU = 6.2832, HK = art.HK, SS = art.SS;
const GATE = [700, 620], FIRE = [728, 868], CW_DX = -12;      // the color war sheet stands 12 units west of its find, clear of the table's edge
const EAST = 1052;                                            // past the table's east edge: a block that reaches here leaves no gap beside it
const TRACK_A = [290, 400], TRACK_B = [640, 600];             // the dolly track: from beside the chair toward the woods
const YT = ['camp', 'recap', 'promo', 'colorwar'];
const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
const onScreen = (x, y, m) => { const v = S.vr; return x > v[0] - m && x < v[2] + m && y > v[1] - m && y < v[3] + m; };
const disc = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };
const dist = f => Math.hypot(van.x - f.x, van.y - f.y);
let gate = null, marks = null, sheets = {}, chairFrames = null, bunt = null;
// The chase (see drawChase): t = seconds into a run, or -1 between runs · wait = seconds to the next run · tags = the
// track's reflective tags in pairs, each { d: how far along the track, path, at: its two middles }
// w: the same inside the woods, from sheet to sheet (see tickWoods): t, wait as above · from, to = the reflective
// points that flare, on the sheet found last and on the nearest one still dark · id = which one that is
export const chase = { t: -1, wait: 1.4, len: 1, tags: [], w: { t: -1, wait: 0, from: [], to: [], id: '' } };
// a standing prop on the mat: it gets a dark twin unless it is given one
const M = o => { const p = prop({ onMat: true, ...o }); if (!p.dark && p.sp) p.dark = art.darkTwin(p.sp); return p; };

// ---------- up front: where each find's label, tab and screen go ----------
function sheetAt(f, w, h, lift, dx = 0) {
  f.sx = f.x + dx; f.sw = w; f.sh = h; f.lift = lift; f.show = 0; f.img = null;
  const py = f.y - (lift + h + 3.5); f.scr = [f.sx - w / 2, py, f.sx + w / 2, py + h];
}
export function init() {
  const f = S.byId;
  for (const id of ['skit2', 'skit3']) { const s = f[id]; s.near = 0; s.scr = [s.x - 42, s.y - 155, s.x + 42, s.y - 5]; s.lab = { up: [s.x, s.y - 168], down: [s.x, s.y + 46] }; s.tabAt = [s.x - 25, s.y - 8, -0.08]; }
  const ch = f.chair; ch.idx = 1; ch.tip = 0;
  // (below: its label goes under it, never up across the slate that lies just north of it)
  ch.lab = { up: [ch.x + 6, ch.y - 108], down: [ch.x + 6, ch.y + 34], min: 3.2, read: 3.5, below: true }; ch.tabAt = [ch.x - 4, ch.y + 23, 0.06];
  const fr = f.freelance; fr.open = 0; fr.iris = 0;
  fr.lab = { up: [fr.x, fr.y - 124], down: [fr.x, fr.y + 16], min: 2.6 }; fr.tabAt = [fr.x - 12, fr.y - 5, -0.06];
  // A sheet's front is its south side. front: where the autopilot (a tap, "show me where") lines the van up before it
  // bumps the sheet, so it is found from the side its picture is seen from. Color war has no front to drive to (pines
  // stand solid in front of it): it is met from behind, and shows the van through its cloth as a shadow.
  // hid: one of the three that are hidden (it counts as in sight only from close by: finds.seek).
  const cp = f.camp; cp.fire = 0; sheetAt(cp, 220, 124, 34); cp.front = [cp.x - 55, cp.y + 48];
  // (max: a sheet's label stands in front of the woods for as long as the van is parked at the sheet; it goes after a few seconds, a bump brings it back)
  cp.lab = { up: [cp.x, cp.y - 178], down: [cp.x, cp.y + 12], min: 2.6, max: 6 }; cp.tabAt = [cp.x - 86, cp.y - 27, -0.07];
  const rc = f.recap; rc.hid = true; rc.billow = 0; sheetAt(rc, 128, 72, 14); rc.front = [rc.x, rc.y + 38];
  rc.inside = v => v.y > rc.y;      // it is found only from inside its own room, the south side of its line (finds.js asks before it wakes)
  rc.lab = { up: [rc.x, rc.y - 106], down: [rc.x, rc.y + 12], min: 2.6, max: 6 }; rc.tabAt = [rc.x - 40, rc.y - 7, 0.06];
  const pr = f.promo; pr.snow = 0; pr.hid = true; sheetAt(pr, 160, 90, 14); pr.front = [pr.x, pr.y + 36];
  pr.lab = { up: [pr.x, pr.y - 124], down: [pr.x, pr.y + 12], max: 6 }; pr.tabAt = [pr.x - 52, pr.y - 7, 0.06];
  const cw = f.colorwar; cw.split = 0; cw.hid = true; sheetAt(cw, 160, 90, 14, CW_DX);
  cw.lab = { up: [cw.sx - 6, cw.y - 124], flip: true, min: 2.4, max: 6 }; cw.lab.down = cw.lab.up; cw.tabAt = [cw.sx - 50, cw.y - 7, -0.06];
  // the slate (a small thing: it says its words, it is not counted)
  // (box: the board itself, which no other thing's label may cover: it is the one place the kinds of video are read)
  const sl = S.says.slate; if (sl) { sl.clap = 0; sl.lit = false; sl.box = [sl.x - 66, sl.y - 66, sl.x + 66, sl.y + 46]; sl.lab = { up: [sl.x + 24, sl.y - 120], down: [sl.x + 24, sl.y + 66], maxw: 236 }; }      // a narrow tape, clear above its open stick (or under it): never across its lettering
}

// ---------- skit phones 2 and 3. Three states that read apart ----------
// asleep: black, a standby LED on its chin and its blink on the mat · awake (the van within 260 units): its picture
// dim, a thin pink edge, no play mark · found: the loop at full strength, the full edge, a play mark, a lit circle
function buildSkits() {
  for (const id of ['skit2', 'skit3']) {
    const f = S.byId[id], x = f.x, y = f.y, sx = x - 42, sy = y - 155, ph = id === 'skit2' ? 0 : 0.9;
    const L = addScreen(id, makeLoop(f.video, true, 168, 300), f, f.scr, () => f.found);
    f.prop = prop({
      x, y, sp: spr.skit, sortY: y + 1, find: f, onMat: true, coll: cbox(x - 47, y - 18, x + 47, y + 1), tall: [x - 49, x + 49, y - 165],
      draw(ctx, p) {
        const a = ctx.globalAlpha, n = f.near;
        art.drawSpr(ctx, p.sp, x, y);
        if (f.found) { grab(L); drawScreen(ctx, L, sx, sy, 84, 150); }
        else if (n > 0 && L.img && L.img.complete && L.img.naturalWidth) { ctx.globalAlpha = a * 0.35 * n; ctx.drawImage(L.img, sx, sy, 84, 150); ctx.globalAlpha = a; }
        glass(ctx, x, y, 84, 150, 10);
        if (f.found) { skitRim(ctx, x, y, 2.2); playSmall(ctx, x, y - 24); return; }
        if (n > 0) { ctx.globalAlpha = a * n * 0.85; skitRim(ctx, x, y, 1); ctx.globalAlpha = a; }
        const u = (S.rt + ph) % 1.9;                          // the standby LED, on the chin: two short blinks, then nothing for a second and a half
        if (n < 1 && (u < 0.1 || (u > 0.24 && u < 0.34))) {
          ctx.fillStyle = PAL.pink;
          ctx.globalAlpha = a * (1 - n) * 0.26; ctx.beginPath(); ctx.ellipse(x, y + 9, 15, 5, 0, 0, TAU); ctx.fill();      // and its blink on the mat in front of it
          ctx.globalAlpha = a * (1 - n) * 0.3; disc(ctx, x, y - 2.6, 4.8);
          ctx.globalAlpha = a * (1 - n); disc(ctx, x, y - 2.6, 1.9); ctx.fillStyle = '#FFE3EB'; disc(ctx, x, y - 2.6, 0.9);
          ctx.globalAlpha = a;
        }
      }
    });
  }
}

// ---------- the folding chair and the megaphone ----------
// Three headings are baked, the three that show the lettering on its back: it turns to the one nearest the van, and no
// further (seen from its front it is a tangle of sticks). Nothing is baked while it turns.
// the lettering on the chair's back is the chair's own, as on any film set (the document's data-back): it is not the find's tab
const backWord = f => { const e = f.q('[data-back]'); return e ? e.textContent.trim().toUpperCase() : ''; };
function buildChair() {
  const f = S.byId.chair, x = f.x, y = f.y;
  const word = backWord(f);
  chairFrames = [11, 12, 13].map(i => art.keep(() => ma.chairSprite(i / 16 * TAU, word), x, y));
  f.prop = M({
    x, y, sp: chairFrames[1], sortY: y + 20, find: f, coll: cbox(x - 27, y - 20, x + 27, y + 20), bb: [-40, -94, 40, 36], glints: [[-21, -41], [21, -27]],
    draw(ctx) { art.drawSpr(ctx, chairFrames[f.idx], x, y); }
  });
  spr.megaSide = art.keep(() => ma.megaSprite(false), x + 50, y + 6);
  const mx = x + 50, my = y + 6;
  M({
    // flush with the chair's collider, front and side: one squared block, no notch between the two
    x: mx, y: my, sp: spr.megaSide, sortY: y + 20.5, find: f, noTab: true, coll: cbox(x + 27, y - 10, x + 74, y + 20), bb: [-30, -40, 30, 26],
    draw(ctx) {
      const t = f.tip;
      if (t <= 0) { art.drawSpr(ctx, spr.megaSide, mx, my); return; }
      // it hops, rolls right over, and comes to rest still on its side, its bell the other way
      const hop = Math.sin(t * Math.PI) * 10, k = Math.cos(t * Math.PI), kx = Math.abs(k) < 0.08 ? (k < 0 ? -0.08 : 0.08) : k;
      ctx.save(); ctx.translate(mx - 2 * t, my + 6 * t - hop); ctx.scale(kx, 1); art.drawSpr(ctx, spr.megaSide, 0, 0); ctx.restore();
    }
  });
}

// ---------- the slate: a clapperboard lying near the mouth of the mat, lettered with the kinds of video ----------
// The one place the kinds are listed. Its lettering is reflective: dark until the headlights cross it, then it flares.
// Bumped, it claps (its upper stick comes down and lifts again) and says its two lines; from the first clap on it
// lies in a lit circle of its own, the whole list white for good. Not counted.
// (Its dark twin is its own sprite, darkened: same canvas, same origin, same turn, so where a light edge crosses the
// board the letters run on unbroken from the lit half into the dark one.)
function buildSlate() {
  const q = S.says.slate; if (!q) return;
  const x = q.x, y = q.y, K = ma.SLATE, kinds = q.q('[data-kinds]').textContent.trim().split(/\s*·\s*/);
  const make = () => ma.slateSprite(kinds), sp = art.keep(make, x, y);
  // the upper stick: hinged at the west end, standing open, down for a moment when it claps (drawn each frame: one bar and its stripes)
  const stick = (ctx, dark) => {
    const c = q.clap, a = c > 0 ? (c > 0.78 ? 0.34 * (1 - (1 - c) / 0.22) : c > 0.5 ? 0 : 0.34 * (1 - c / 0.5)) : 0.34;      // c runs 1 -> 0: shut in the first fifth, held shut, then open again
    ctx.save(); ctx.translate(x, y); ctx.rotate(K.rot); ctx.translate(K.hx, K.hy - 4.6 * HK); ctx.rotate(-a);
    ctx.fillStyle = dark ? PAL.matThing : '#17191B'; ctx.fillRect(0, -K.th, K.len, K.th);
    ma.stripes(ctx, 0, -K.th, K.len, K.th, -1, dark ? '#243A35' : '#F4F1E8');
    if (!dark) { ctx.fillStyle = '#8C9598'; ctx.beginPath(); ctx.arc(4.5, -K.th / 2, 2.2, 0, TAU); ctx.fill(); }      // the hinge pin
    ctx.restore();
  };
  q.act = () => { q.clap = 1; if (!q.lit) { q.lit = true; lit.push([x, y - 20, 104]); } };      // the circle holds the whole board and its open stick
  q.prop = M({
    // (its collider is wider and longer than the board, so the van's nose stops at the board's edge and never lies across its bottom rows)
    x, y, sp, sortY: y + 42, say: q, coll: cbox(x - 72, y - 66, x + 72, y + 58), bb: [-70, -124, 70, 48],
    glints: [[-38, -44], [22, -47], [-30, -14], [36, 12]],
    glow(ctx) { stick(ctx, true); }, draw(ctx, p) { art.drawSpr(ctx, p.sp, x, y); stick(ctx, false); }
  });
  q.rebake = () => { art.retire(q.prop.sp); q.prop.sp = art.keep(make, x, y); q.prop.dark = art.darkTwin(q.prop.sp); };      // its lettering again, when a font face arrives late
}

// ---------- freelance: a gear case, a camera on a tripod, a light stand. One squared block of colliders ----------
function buildFreelance() {
  const f = S.byId.freelance, x = f.x, y = f.y, tx = x - 68, ty = y - 12, lx = x + 70, ly = y - 14, front = y + 1;
  const K = (name, make) => (spr[name] = art.keep(make, x, y));
  K('caseShut', () => ma.caseSprite(false)); K('caseOpen', () => ma.caseSprite(true)); K('tripod', () => ma.tripodSprite());
  K('standOff', () => ma.standSprite(false)); K('standOn', () => ma.standSprite(true)); spr.halo = art.glow('#FFE9BC', 34, 0.5);
  f.prop = M({
    x, y, sp: spr.caseShut, sortY: front, find: f, coll: cbox(x - 39, y - 44, x + 39, front), bb: [-41, -92, 41, 3], glints: [[-36.5, -21.5], [36.5, -21.5]],
    draw(ctx) { art.drawSpr(ctx, f.open >= 0.3 ? spr.caseOpen : spr.caseShut, x, y); }
  });
  M({
    x: tx, y: ty, sp: spr.tripod, sortY: front - 0.2, find: f, noTab: true, coll: cbox(x - 96, y - 44, x - 39, front), tall: [tx - 20, tx + 20, ty - 78],
    draw(ctx) {
      art.drawSpr(ctx, spr.tripod, tx, ty);
      const L = ma.LENS, cx = tx + L.x, cy = ty + L.y, o = f.iris, r = f.found ? 1.2 + 2.6 * (o < 0.6 ? ease(o / 0.6) * 1.12 : 1.12 - 0.12 * ease((o - 0.6) / 0.4)) : 1.2;   // the iris opens wide, then settles
      ctx.fillStyle = '#2A4656'; disc(ctx, cx, cy, r); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(cx - r * 0.55, cy - r * 0.6, 1.2, 1.2);
      if (f.found && (S.rt * 1.3) % 1 < 0.55) { ctx.fillStyle = '#FF3B30'; disc(ctx, tx + 10, ty - 57, 1.5); }      // recording
    }
  });
  M({
    x: lx, y: ly, sp: spr.standOff, sortY: front - 0.1, find: f, noTab: true, coll: cbox(x + 39, y - 44, x + 92, front), tall: [lx - 24, lx + 24, ly - 110],
    draw(ctx) {
      const on = f.open >= 0.45;
      if (on) art.drawSpr(ctx, spr.halo, lx, ly - 83);
      art.drawSpr(ctx, on ? spr.standOn : spr.standOff, lx, ly);
    }
  });
}

// ---------- the dolly track across the mat's south-west quarter, and the set dressing round it ----------
// The track is a path into the woods: unlit it is barely there, and the reflective tag on every fourth sleeper end
// flares in the headlights, a dotted line that lights up ahead of the van. All of it is dressing, none of it a find.
function buildSet() {
  const A = TRACK_A, B = TRACK_B, len = Math.hypot(B[0] - A[0], B[1] - A[1]), ux = (B[0] - A[0]) / len, uy = (B[1] - A[1]) / len, nx = -uy, ny = ux;
  const rails = new Path2D(), ties = new Path2D(), tags = new Path2D(), at = [], mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
  for (const s of [-17, 17]) { rails.moveTo(A[0] + nx * s, A[1] + ny * s); rails.lineTo(B[0] + nx * s, B[1] + ny * s); }
  for (let i = 0, d = 9; d < len; i++, d += 28) {
    const cx = A[0] + ux * d, cy = A[1] + uy * d;
    ties.moveTo(cx - nx * 23, cy - ny * 23); ties.lineTo(cx + nx * 23, cy + ny * 23);
    if (i % 4 === 0) { const g = { d, path: new Path2D(), at: [] }; chase.tags.push(g); for (const s of [-20.4, 20.4]) { const tx = cx + nx * s, ty = cy + ny * s, q = new Path2D(); g.at.push([tx, ty]); q.moveTo(tx - nx * 2.6 - ux * 3, ty - ny * 2.6 - uy * 3); q.lineTo(tx + nx * 2.6 - ux * 3, ty + ny * 2.6 - uy * 3); q.lineTo(tx + nx * 2.6 + ux * 3, ty + ny * 2.6 + uy * 3); q.lineTo(tx - nx * 2.6 + ux * 3, ty - ny * 2.6 + uy * 3); q.closePath(); g.path.addPath(q); } }
    if (i % 4 === 0) for (const s of [-20.4, 20.4]) { const tx = cx + nx * s, ty = cy + ny * s; at.push([tx - mx, ty - my]); tags.moveTo(tx - nx * 2.6 - ux * 3, ty - ny * 2.6 - uy * 3); tags.lineTo(tx + nx * 2.6 - ux * 3, ty + ny * 2.6 - uy * 3); tags.lineTo(tx + nx * 2.6 + ux * 3, ty + ny * 2.6 + uy * 3); tags.lineTo(tx - nx * 2.6 + ux * 3, ty - ny * 2.6 + uy * 3); tags.closePath(); }
  }
  chase.len = len;
  prop({
    onMat: true, x: mx, y: my, sp: NOSPR, bb: [-190, -125, 190, 125], sortY: -1e6, dark: true, glints: at,
    glow(ctx) { ctx.lineCap = 'butt'; ctx.strokeStyle = PAL.matThing; ctx.lineWidth = 6; ctx.stroke(ties); ctx.lineWidth = 4; ctx.stroke(rails); ctx.fillStyle = '#35524A'; ctx.fill(tags); },
    draw(ctx) {
      ctx.lineCap = 'butt'; ctx.strokeStyle = '#3B2A1A'; ctx.lineWidth = 7.4; ctx.stroke(ties); ctx.strokeStyle = '#8A6238'; ctx.lineWidth = 6; ctx.stroke(ties);
      ctx.strokeStyle = '#2B2F33'; ctx.lineWidth = 5; ctx.stroke(rails); ctx.strokeStyle = '#8C9598'; ctx.lineWidth = 3.6; ctx.stroke(rails); ctx.strokeStyle = '#D5DADD'; ctx.lineWidth = 1.1; ctx.stroke(rails);
      ctx.fillStyle = '#F4F1E8'; ctx.fill(tags);
    }
  });
  const th = Math.atan2(uy, ux), dx = A[0] + ux * 30, dy = A[1] + uy * 30;                  // the dolly, parked at the chair end
  M({ x: dx, y: dy, sp: art.keep(() => ma.dollySprite(th), dx, dy), sortY: dy + 14, coll: ccirc(dx, dy, 25), glints: [[24 * Math.cos(th), 24 * Math.sin(th) - 8.4]] });
  M({ x: 220, y: 700, sp: art.keep(() => ma.cstandSprite(), 220, 700), sortY: 703, coll: ccirc(220, 700, 9), tall: [214, 268, 604], glints: [[25, -58.6]] });
  M({ x: 430, y: 880, sp: art.keep(() => ma.appleBoxes(), 430, 880), sortY: 893.5, coll: cbox(408, 866, 454, 894), glints: [[10, -28.5]] });
  M({ x: 300, y: 980, sp: art.keep(() => ma.sandbags(), 300, 980), sortY: 987, coll: ccirc(300, 980, 16), glints: [[15.5, -6.3]] });
  const coil = ma.coilSprite(); prop({ x: 480, y: 720, flat: true, onMat: true, sp: coil, dark: art.darkTwin(coil) });
}

// ---------- the bunting gate into the woods ----------
function buildGate() {
  const [x, y] = GATE, w = ma.GATE_W;
  spr.gateOff = art.keep(() => ma.gateSprite(false), x, y); spr.gateOn = art.keep(() => ma.gateSprite(true), x, y);
  gate = M({ x, y, sp: S.byId.camp.found ? spr.gateOn : spr.gateOff, dark: art.darkTwin(spr.gateOff), sortY: y + 1, tall: [x - w - 6, x + w + 6, y - 96], glints: [[-w, -20.5], [w, -20.5], [1, -30]] });
  addCollider(ccirc(x - w, y, 6)); addCollider(ccirc(x + w, y, 6));
}

// ---------- a bedsheet screen showing a saved thumbnail. Nothing is asked of YouTube until Play (ui.js) ----------
// (f.card: a sheet whose picture is a drawn card, baked from the document's words. No picture of that video is ever fetched.)
function loadImg(f) { if (!f.img && !f.card) { f.img = new Image(); f.img.decoding = 'async'; f.img.src = MEDIA + 'yt-' + f.yt + '.jpg'; } }
const ready = f => !!f.card || (f.img && f.img.complete && f.img.naturalWidth > 0);
function picture(ctx, f, s, px, py) {
  const a = ctx.globalAlpha, w = f.sw, h = f.sh;
  if (f.snow > 0 && spr.snow) { if ((S.rt * 15 | 0) % 2) { ctx.save(); ctx.translate(px + w, py + h); ctx.scale(-1, -1); art.drawSpr(ctx, spr.snow, 0, 0); ctx.restore(); } else art.drawSpr(ctx, spr.snow, px, py); return; }
  if (!(f.show > 0) || !ready(f)) return;
  ctx.globalAlpha = a * f.show; if (f.card) art.drawSpr(ctx, f.card, px, py); else ctx.drawImage(f.img, px, py, w, h); art.drawSpr(ctx, s.over, px, py);
  const k = 0.42 + 0.014 * Math.sin(S.rt * 2.6); ctx.drawImage(spr.play.c, px + w * (f.card ? ma.WEEK.px : 0.5) - 26 * k, py + h / 2 - 26 * k, 52 * k, 52 * k);     // it plays when tapped (on a drawn card the mark stands clear of the lettering)
  ctx.globalAlpha = a;
}
function drawSheet(ctx, f) {
  const s = sheets[f.id], x = f.sx, y = f.y, sp = s.sp, px = x + s.px, py = y + s.py;
  if (!(f.billow > 0)) { art.drawSpr(ctx, sp, x, y); picture(ctx, f, s, px, py); return; }
  // it billows: the cloth and its picture in upright strips, each riding a wave that the posts hold still at both ends
  const c = art.cv(sp), n = 16, x0 = x - sp.ox / SS, y0 = y - sp.oy / SS, W = c.width / SS, H = c.height / SS, k = Math.min(1, f.billow / 0.6);
  const off = u => Math.sin(S.rt * 10 - u * 8) * 5.5 * k * Math.sin(Math.max(0, Math.min(1, (u - 0.08) / 0.84)) * Math.PI);
  for (let i = 0; i < n; i++) ctx.drawImage(c, i * c.width / n, 0, c.width / n, c.height, x0 + i * W / n, y0 + off((i + 0.5) / n), W / n + 0.4, H);
  if (f.show > 0 && ready(f)) {
    const src = f.card ? art.cv(f.card) : f.img, a = ctx.globalAlpha, iw = f.card ? src.width : src.naturalWidth, ih = f.card ? src.height : src.naturalHeight, m = 12; ctx.globalAlpha = a * f.show;
    for (let i = 0; i < m; i++) ctx.drawImage(src, i * iw / m, 0, iw / m, ih, px + i * f.sw / m, py + off((px + (i + 0.5) * f.sw / m - x0) / W), f.sw / m + 0.4, f.sh);
    ctx.globalAlpha = a;
  }
}
// A sheet in the dark (spec 8.4). Its shape is the same dark as every other unlit thing on the mat; all that catches
// any light is the rope it hangs from, its pegs, the reflective band on each post, and, barely, the two stripes of its hem.
function darkSheet(ctx, f) {
  const s = sheets[f.id];
  ctx.save(); ctx.translate(f.sx, f.y);
  ctx.fillStyle = PAL.matThing; ctx.fill(s.dark);
  ctx.fillStyle = PAL.matGrid; ctx.fillRect(s.L + 1, s.B - 9.6, s.W - 2, 1); ctx.fillRect(s.L + 1, s.B - 12.6, s.W - 2, 1);
  ctx.strokeStyle = '#35524A'; ctx.lineWidth = 1.2; ctx.lineCap = 'round'; ctx.stroke(s.rope);
  ctx.fillStyle = '#35524A'; for (const p of s.pegs) ctx.fillRect(p[0] - 1, p[1] - 1.6, 2, 5); for (const b of s.bands) ctx.fillRect(b[0], b[1], b[2], b[3]);
  ctx.restore();
}
// A sheet is never see-through. A van behind a found sheet shows on the cloth as a shadow, its two headlights glowing
// through, with a pale line round it so it is never lost. (Behind a sheet still in the dark there is no lit cloth to
// throw a shadow on: the van is simply behind it until its bump lights the sheet.)
function puppet(ctx, f, vx, vy) {
  const s = sheets[f.id], x0 = f.sx + s.L, y0 = f.y + s.T, w = s.W, h = s.B - s.T;
  if (vy > f.y - 8 || vy < y0 - 24 || vx < x0 - 34 || vx > x0 + w + 34) return;
  ctx.save(); ctx.beginPath(); ctx.rect(x0 + 1, y0 + 4, w - 2, h - 4); ctx.clip();
  ctx.translate(vx, vy - 9); ctx.rotate(van.a);
  ctx.fillStyle = PAL.lamp; ctx.globalAlpha = 0.12; ctx.beginPath(); ctx.moveTo(27, 0); ctx.arc(27, 0, 40, -0.42, 0.42); ctx.closePath(); ctx.fill();
  ctx.fillStyle = PAL.ink; ctx.globalAlpha = 0.38; ctx.beginPath(); art.rr(ctx, -30, -15.5, 60, 31, 6); ctx.fill();
  ctx.strokeStyle = '#F4F1E8'; ctx.globalAlpha = 0.62; ctx.lineWidth = 2; ctx.stroke();      // a pale edge, so the shape reads on a dark picture too
  ctx.fillStyle = PAL.lamp; ctx.globalAlpha = 0.7; disc(ctx, 29.5, -9.2, 5); disc(ctx, 29.5, 9.2, 5);
  ctx.restore();
}
let small = null;
// at: where it is needed [x0, y0, x1, y1] (the three smaller sheets are one sprite, and one outline)
function buildSheet(f, w, h, lift, o, at) {
  if (!o && small) return (sheets[f.id] = small);
  const s = sheets[f.id] = ma.sheetSprite(w, h, lift, o || {});
  s.sp = art.keep(() => ma.sheetSprite(w, h, lift, o || {}).sp, at[0], at[1], at[2], at[3], s.sp);
  s.over = art.keep(() => ma.sheetOver(w, h, s), at[0], at[1], at[2], at[3]);
  s.glints = s.bands.map(b => [b[0] + b[2] / 2, b[1] + b[3] / 2]);
  if (!o) small = s;
  return s;
}
// The fire: three straight-sided tongues in two frames, flipped six times a second, and five embers rising. k = how tall it has grown
function flames(ctx, fx, fy, k) {
  const fr = ma.FLAME[(S.rt * 6 | 0) % 2], cols = ['#F2B411', PAL.lamp, PAL.pink], a = ctx.globalAlpha;
  for (let i = 0; i < 3; i++) {
    const pts = fr[i]; ctx.fillStyle = cols[i]; ctx.globalAlpha = i === 2 ? a * 0.3 : a;
    ctx.beginPath(); ctx.moveTo(fx + pts[0][0], fy + pts[0][1] * k); for (let j = 1; j < pts.length; j++) ctx.lineTo(fx + pts[j][0], fy + pts[j][1] * k); ctx.closePath(); ctx.fill();
  }
  for (let i = 0; i < 5; i++) {
    const u = (S.rt * 0.55 + i * 0.2) % 1;
    ctx.globalAlpha = a * k * (1 - u); ctx.fillStyle = i % 2 ? PAL.lamp : '#F2B411';
    ctx.fillRect(fx + Math.sin(i * 2.4 + u * 4) * (4 + u * 8) - 1, fy - 36 * k - u * 46, 2.2, 2.2);
  }
  ctx.globalAlpha = a;
}
function buildCamp() {
  const f = S.byId.camp, x = f.x, y = f.y, s = buildSheet(f, 220, 124, 34, { posts: false, rope: 121, sag: 6 }, [x - 130, y - 180, x + 130, y + 10]), [fx, fy] = FIRE;
  spr.fire = art.keep(() => ma.fireSprite(), fx, fy); spr.ember = art.glow('#FF7A2E', 17, 0.55);
  // the sheet hangs between two pines (buildPines stands them at its ends, inside this one collider)
  f.prop = M({
    x, y, sp: s.sp, dark: true, glow(ctx) { darkSheet(ctx, f); }, over(ctx, vx, vy) { if (f.found) puppet(ctx, f, vx, vy); },
    sortY: y + 5, find: f, coll: cbox(x - 133, y - 13, x + 133, y + 5), glints: s.glints, draw(ctx) { drawSheet(ctx, f); }
  });
  const ember = (ctx, k) => {
    const a = ctx.globalAlpha, p = 0.62 + 0.3 * Math.sin(S.rt * 3.1) + 0.08 * Math.sin(S.rt * 13);
    ctx.globalAlpha = a * p * k; art.drawSpr(ctx, spr.ember, fx, fy - 8);
    ctx.globalAlpha = a * k; ctx.fillStyle = '#FF7A2E'; disc(ctx, fx, fy - 8, 3); ctx.fillStyle = '#FFE1A6'; disc(ctx, fx - 0.4, fy - 8.4, 1.4); ctx.globalAlpha = a;
  };
  M({
    // Its collider is the ring of stones as it is seen, and a little more on the near side: the van is drawn 60 long and
    // 17 px tall, so against a smaller one its nose stood in the flames. (Its north face keeps a 51-unit lane to the big sheet.)
    x: fx, y: fy, sp: spr.fire, sortY: fy + 12, find: f, noTab: true, coll: cbox(fx - 24, fy - 12, fx + 24, fy + 30), bb: [-24, -96, 24, 20],
    glow(ctx) { if (!f.found) ember(ctx, 1); },                // seen from across the dark: the one warm point
    draw(ctx) {
      art.drawSpr(ctx, spr.fire, fx, fy);
      const k = ease(f.fire);
      if (k < 1) ember(ctx, 1 - k);
      if (k > 0) flames(ctx, fx, fy - 7, k);
    }
  });
}
function buildSheets() {
  const F = S.byId, AT = [540, 860, 1040, 1060];
  for (const id of ['promo', 'colorwar']) {
    const f = F[id], x = f.sx, y = f.y, s = buildSheet(f, 160, 90, 14, null, AT);
    const o = { x, y, sp: s.sp, dark: true, glow(ctx) { darkSheet(ctx, f); }, over(ctx, vx, vy) { if (f.found) puppet(ctx, f, vx, vy); }, sortY: y + 3, find: f, glints: s.glints, draw(ctx) { drawSheet(ctx, f); } };
    if (id === 'promo') o.coll = cbox(x - 91, y - 12, x + 91, y + 3);
    // color war: one block with the pines that stand in front of it, from the flag pole to past the table's edge
    else o.coll = cbox(x - 106, y - 14, EAST, y + 3);
    f.prop = M(o);
  }
  // The weekly recap: a smaller sheet, and beside it on the same line a week's shoot schedule, pegged up. Its line runs
  // from a post by the big sheet's east pine to the table's edge: one block, no way round its ends.
  const rc = F.recap;
  if (rc && rc.live) {
    const x = rc.sx, y = rc.y, at = [x - 124, y - 110, x + 74, y + 8], o = { side: 48 };
    const s = sheets.recap = ma.sheetSprite(128, 72, 14, o);
    s.sp = art.keep(() => ma.sheetSprite(128, 72, 14, o).sp, at[0], at[1], at[2], at[3], s.sp);
    s.over = art.keep(() => ma.sheetOver(128, 72, s), at[0], at[1], at[2], at[3]);
    s.glints = s.bands.map(b => [b[0] + b[2] / 2, b[1] + b[3] / 2]);
    // its picture is a drawn title card, lettered with the document's own words: no frame of the video is shown or fetched
    const ws = rc.q('[data-sheet]'), words = ws ? ws.textContent.trim().split(/\s*·\s*/) : [];
    rc.cardMake = () => ma.weekCard(128, 72, words);
    rc.cardAt = at; rc.card = art.keep(rc.cardMake, at[0], at[1], at[2], at[3]);
    rc.prop = M({
      // (its line's west end is inside the column of pines north of the big sheet: the collider starts at that block's
      // east face, so a van sliding down the block's west side, outside the room, never touches the sheet)
      x, y, sp: s.sp, dark: true, glow(ctx) { darkSheet(ctx, rc); }, over(ctx, vx, vy) { if (rc.found) puppet(ctx, rc, vx, vy); },
      sortY: y + 3, find: rc, coll: cbox(866, y - 12, EAST, y + 3), glints: s.glints, draw(ctx) { drawSheet(ctx, rc); }
    });
    // its tell: a short band of bunting on the wall of pines that closes its room (grey with reflective trim; it colours in when the recap is found)
    const bx = 945, by = 824, off = ma.bandSprite(92, false);
    spr.bandOn = ma.bandSprite(92, true);
    bunt = M({ x: bx, y: by, sp: off, sortY: 878, bb: [-50, -10, 50, 34], glints: [[-30, 14], [0, 20], [30, 14]], draw(ctx, p) { art.drawSpr(ctx, rc.found ? spr.bandOn : off, bx, by); } });
  }
  // the flag beside the color war sheet: one grey flag with a reflective stripe; found, it splits into two colours
  const cw = F.colorwar, px = cw.sx - 98, py = cw.y - 6, top = py - ma.POLE_H * HK + 1.5;
  const band = (ctx, y0, h, col, ph, len) => {
    const wv = u => Math.sin(S.rt * 5.2 + u * 4.2 + ph) * 1.8 * u;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(px + 1.5, y0);
    for (let i = 1; i <= 4; i++) ctx.lineTo(px + 1.5 + i * len / 4, y0 + wv(i / 4));
    for (let i = 4; i >= 0; i--) ctx.lineTo(px + 1.5 + i * len / 4, y0 + h + wv(i / 4));
    ctx.closePath(); ctx.fill();
  };
  spr.pole = ma.poleSprite();
  M({
    x: px, y: py, sp: spr.pole, sortY: cw.y + 3.2, find: cw, noTab: true, tall: [px - 6, px + 40, py - 96], glints: [[0, -8]],
    glow(ctx) { band(ctx, top, 21, '#1B2B28', 0, 33); },
    draw(ctx) {
      art.drawSpr(ctx, spr.pole, px, py);
      const k = ease(cw.split);
      if (k <= 0) { band(ctx, top, 21, '#AEB6BC', 0, 33); band(ctx, top + 8, 5, '#FFFFFF', 0, 33); }
      else { band(ctx, top - 2.5 * k, 10.5, mix(k, '#AEB6BC', '#E0452F'), 0, 33); band(ctx, top + 10.5 + 2.5 * k, 10.5, mix(k, '#AEB6BC', '#2F7FE0'), 1.4, 33 - 3 * k); }
    }
  });
}
const mix = (k, a, b) => k >= 1 ? b : art.mixHex(a, b, k);

// ---------- the pines. Hand-placed where they do a job, a few more by seeded dart-throwing ----------
// Any two trunks that stand free are 58 units apart or more, and 51 or more from anything solid: every way between
// them is a lane of 44 units, never a van-width notch. The ones that close a gap completely stand inside a block
// collider of their own (hedge()). Two sprites are baked (two greens) and drawn at whatever size a tree is, never
// larger than baked.
function buildPines() {
  const r = mulberry32(SEED ^ 0x9175), W = WOODS, list = [], F = S.byId, cp = F.camp, rc = F.recap, pr = F.promo, cw = F.colorwar, [fx, fy] = FIRE;
  const base = [[1.22, 0], [1.13, 1]].map(([k, v]) => { const sp = art.keep(() => ma.pineSprite(k, v), W[0], W[1], W[2], W[3]); return { sp, dark: art.darkTwin(sp), k }; });
  const KIND = [[0, 1], [1, 1.13], [1, 0.9], [1, 1], [0, 1.22]];          // the five sizes the woods were planted with: [which green, size]
  const drawK = (ctx, sp, x, y, sc) => { const c = art.cv(sp), q = sp.res || SS; ctx.drawImage(c, x - sp.ox / q * sc, y - sp.oy / q * sc, c.width / q * sc, c.height / q * sc); };
  // i: one of the five kinds · o.k: a size of its own · o.free: no collider of its own (it stands inside a block)
  const pine = (x, y, i, o = {}) => {
    const q = base[KIND[i][0]], k = o.k || KIND[i][1], sc = k / q.k, b = q.sp.bb;
    list.push([x, y]);
    return prop({
      onMat: true, x, y, sp: q.sp, bb: [b[0] * sc, b[1] * sc, b[2] * sc, b[3] * sc], dark: true, sortY: y + 3, tall: [x - 21 * k, x + 21 * k, y - 98 * k],
      glow(ctx) { drawK(ctx, q.dark, x, y, sc); }, draw(ctx) { drawK(ctx, q.sp, x, y, sc); }, coll: o.free ? null : ccirc(x, y, 7), fade: o.fade || null
    });
  };
  // a block: one collider [x0, y0, x1, y1] and the pines that stand in it [x, y, kind, size]
  const blocks = [];
  const hedge = (b, ps, fade) => { blocks.push(b); addCollider(cbox(b[0], b[1], b[2], b[3])); for (const [x, y, i, k] of ps) pine(x, y, i, { free: true, k, fade }); };
  pine(cp.x - 124, cp.y + 1, 4, { free: true }); pine(cp.x + 124, cp.y + 1, 1, { free: true });      // the two the big sheet hangs between
  // The thicket in front of the color war sheet: seven, no two alike and out of line, one solid block from the sheet to
  // the table's south and east edges. They go see-through while the van is behind them, and whenever it is near once
  // the sheet is found; the sheet's own picture never fades.
  const fade = (vx, vy) => (vy < cw.y + 22 && vy > cw.y - 190 && vx > cw.sx - 150) || (cw.found && Math.hypot(vx - cw.sx, vy - cw.y) < 230);
  hedge([cw.sx - 106, cw.y + 3, EAST, 1110], [[-78, 24, 4, 0.8], [-42, 14, 1, 1.1], [-6, 25, 4, 0.9], [34, 11, 1, 1.2], [70, 21, 4, 1.0], [-60, 50, 1, 0.9], [14, 53, 4, 1.0]].map(([dx, dy, i, k]) => [cw.sx + dx, cw.y + dy, i, k]), fade);
  // south of the lane that runs down past the promo's east end: three more, joined to the thicket (no way through to its front)
  hedge([795, 985, cw.sx - 106, 1110], [[818, 1008, 1, 1.0], [806, 1052, 4, 0.9], [826, 1090, 1, 1.05]]);
  // the wall between the recap's room and the lane behind color war: four in a row, to the table's edge
  hedge([880, 858, EAST, 884], [[900, 872, 4, 1.0], [945, 866, 1, 1.1], [990, 874, 4, 0.95], [1028, 868, 1, 1.0]]);
  // north of the big sheet's east end: three in a column, from the woods' north edge to the sheet. The space behind the
  // big sheet is a pocket open to the gate and the west; the recap is not reached from there.
  hedge([842, 620, 868, cp.y - 13], [[856, 646, 3, 1.0], [854, 704, 1, 1.0], [856, 764, 4, 0.9]]);
  // the hedge south of the fire: the promo's back is behind it
  hedge([575, 905, 704, 950], [[598, 926, 4, 0.9], [640, 936, 1, 1.0], [682, 924, 4, 1.05]]);
  // along the woods' north edge, east of that column: a row with no way through, so the recap's back is not reached from the open mat either
  hedge([868, 620, EAST, 654], [[904, 638, 2, 0.9], [946, 646, 0, 1.0], [1008, 636, 3, 1.0]]);
  [[590, 640, 0], [812, 642, 3], [812, 922, 0]].forEach(([x, y, i]) => pine(x, y, i));      // the rest of the north edge (the gate is the gap), and one that stands alone south-east of the fire
  const box = p => { const c = p.coll; return [c.x0, c.y0, c.x1, c.y1]; };
  const solid = [box(cp.prop), box(pr.prop), box(cw.prop), ...(rc && rc.prop ? [box(rc.prop)] : []), ...blocks, [fx - 24, fy - 12, fx + 24, fy + 30],
    [GATE[0] - 54, GATE[1] - 6, GATE[0] - 42, GATE[1] + 6], [GATE[0] + 42, GATE[1] - 6, GATE[0] + 54, GATE[1] + 6]];
  const fronts = [cp.front, pr.front, ...(rc ? [rc.front] : [])];
  const ok = (x, y) => {
    if ((x > 978 && x < 990) || x > 1026 || (y > 1038 && y < 1050) || y > 1086) return false;            // at the table's edge: a clear lane, or no gap at all
    if (y < cp.y - 13 && x > cp.x - 130) return false;                                                    // behind the big sheet, and the way in from the gate: nothing is planted where the cloth would hide it
    if (Math.hypot(x - fx, y - fy) < 92) return false;                                                    // the clearing round the fire
    if (x > 842 && y < 986) return false;                                                                 // the recap's room, and the lane behind color war
    if (y > 940) return false;                                                                            // behind the promo, its lane, and the lane past its east end
    for (const q of fronts) if (Math.abs(x - q[0]) < 46 && y > q[1] - 64 && y < q[1] + 36) return false;  // where the van lines up in front of a sheet
    for (const p of list) if (Math.hypot(x - p[0], y - p[1]) < 58) return false;
    for (const b of solid) if (Math.hypot(Math.max(b[0] - x, 0, x - b[2]), Math.max(b[1] - y, 0, y - b[3])) < 51) return false;
    return true;
  };
  for (let n = 0; n < 6000 && list.length < 44; n++) {
    const x = Math.round(W[0] + 12 + r() * (W[2] - W[0] - 12)), y = Math.round(W[1] + 12 + r() * (W[3] - W[1] - 12)), i = (r() * 4) | 0;
    if (ok(x, y)) pine(x, y, i);
  }
  pines = list;
}
export let pines = [];

// ---------- dressing: seeded, never a find. Flat things, dark until the light crosses them ----------
function dress() {
  const r = mulberry32(SEED ^ 0x3a7d), W = WOODS;
  const flatM = (x, y, sp, dark) => prop({ x, y, flat: true, onMat: true, sp, dark: dark || art.darkTwin(sp) });
  const taken = [[205, 50, 110], [400, -40, 100], [590, 50, 100], [330, 300, 90], [780, 262, 150], [GATE[0], GATE[1], 90], [364, 168, 96], [262, 152, 34], [430, 70, 60], [318, -52, 30], [150, 0, 80],
    [316, 415, 44], [220, 700, 44], [430, 880, 44], [300, 980, 34], [480, 720, 36]];                      // the dolly, the C-stand, the apple boxes, the sandbags, the coil
  for (let d = 60; d < 404; d += 56) taken.push([TRACK_A[0] + (TRACK_B[0] - TRACK_A[0]) * d / 403, TRACK_A[1] + (TRACK_B[1] - TRACK_A[1]) * d / 403, 36]);   // and the track
  const spot = (rad, x0, y0, x1, y1) => {
    for (let k = 0; k < 60; k++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0); if (x > W[0] - rad && y > W[1] - rad) continue; if (taken.every(t => Math.hypot(x - t[0], y - t[1]) > t[2] + rad)) { taken.push([x, y, rad]); return [Math.round(x), Math.round(y)]; } }
    return null;
  };
  let s;
  for (let i = 0; i < 4; i++) if ((s = spot(58, 170, -60, 990, 1040))) loose.push(ma.cablePath(301 + i * 17, s[0], s[1]));      // four cables thrown down: lines, like the two long runs
  for (let i = 0; i < 3; i++) if ((s = spot(18, 170, -70, 990, 560))) flatM(s[0], s[1], ma.battery(r() * TAU));
  for (let i = 0; i < 2; i++) if ((s = spot(16, 170, -70, 990, 1040))) flatM(s[0], s[1], ma.lensCap());
  for (let i = 0; i < 4; i++) if ((s = spot(14, 170, -70, 990, 1040))) flatM(s[0], s[1], art.sdCard(r() * TAU));
  // spike-tape marks on the floor, where someone was told to stand: dull until the video track has a find
  const dull = '#8E7A80';
  marks = [[392, 356, 0.12], [712, 322, -0.2], [520, 214, 1.4]].map(([x, y, a]) => { const on = ma.tMark(PAL.pinkTape, a), off = ma.tMark(dull, a); const p = prop({ x, y, flat: true, onMat: true, sp: off, dark: art.darkTwin(off) }); p.on = on; return p; });
  const tw = [40, 41, 42, 43].map(n => { const sp = ma.twigs(n); return [sp, art.darkTwin(sp)]; });      // under the pines: four scatters of twigs, laid twelve times
  for (let i = 0; i < 12; i++) flatM(Math.round(W[0] + 30 + r() * (W[2] - W[0] - 70)), Math.round(W[1] + 40 + r() * (W[3] - W[1] - 80)), tw[i % 4][0], tw[i % 4][1]);
}

// ---------- two long cables on the floor ----------
// One runs from the light stand through the gate to the big sheet, the other from the chair down the west side to the
// promo sheet's post. Dressing, not finds, but each leads somewhere. Drawn as lines every frame (two strokes; no sprite to
// hold): a dark line in the dark, a cable where the light is.
const RUNS = [
  [[850, 286], [836, 334], [786, 384], [804, 452], [750, 522], [724, 592], [714, 652], [692, 706], [670, 750]],
  [[366, 332], [394, 402], [330, 470], [316, 560], [354, 650], [320, 742], [372, 842], [446, 936], [512, 1006], [557, 1028]]
];
let runs = null;
const loose = [];
function buildRuns() {
  runs = RUNS.map(p => {
    const path = new Path2D(), n = p.length; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    path.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < n - 1; i++) path.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2);
    path.lineTo(p[n - 1][0], p[n - 1][1]);
    for (const q of p) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
    return { path, bb: [x0 - 30, y0 - 30, x1 + 30, y1 + 30], a: p[0], b: p[n - 1] };
  }).concat(loose);
}
export function drawLines(ctx, lit) {
  if (!runs) return;
  const v = S.vr; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const r of runs) {
    if (r.bb[2] < v[0] || r.bb[0] > v[2] || r.bb[3] < v[1] || r.bb[1] > v[3]) continue;
    if (!lit) { ctx.strokeStyle = '#121C1A'; ctx.lineWidth = 3.6; ctx.stroke(r.path); continue; }
    ctx.strokeStyle = '#0A0B0C'; ctx.lineWidth = 4.4; ctx.stroke(r.path); ctx.strokeStyle = '#454C53'; ctx.lineWidth = 2.4; ctx.stroke(r.path);
    ctx.fillStyle = PAL.steel; for (const q of [r.a, r.b]) { ctx.beginPath(); ctx.arc(q[0], q[1], 3.2, 0, TAU); ctx.fill(); }      // a plug at each end
  }
}

// ---------- nodes for the autopilot: a grid over the mat, kept wherever the van can stand clear of everything ----------
function nodes() {
  const buf = [], W = WOODS;
  const free = (x, y) => { if (!standable(x, y)) return false; for (const c of collidersNear(x, y, 36, buf)) if (!c.off && collDist(c, x, y) < 30) return false; return true; };
  for (let j = 0; -50 + j * 65 <= 1074; j++) for (let i = 0; 170 + i * 65 <= 1012; i++) {
    const x = 170 + i * 65, y = -50 + j * 65;
    if (!(x > W[0] - 60 && y > W[1] - 60) && (i % 2 || j % 2)) continue;       // the open mat needs only every other one
    if (free(x, y)) addNode(x, y);
  }
  for (const id of ['camp', 'promo', 'recap']) { const f = S.byId[id], q = f && f.front; if (q && standable(q[0], q[1])) addNode(q[0], q[1]); }      // and the spot in front of each sheet
  // and down the middle of each lane in the woods (a lane of 44 has no room for a grid node)
  for (const [x, y] of [[766, 940], [766, 1000], [766, 1064], [700, 1064], [590, 1064], [536, 1000], [536, 900], [640, 984], [840, 934], [910, 934], [980, 934], [872, 832], [940, 800], [1000, 800], [600, 740], [574, 800], [652, 836], [728, 831], [790, 832], [574, 860]]) if (standable(x, y)) addNode(x, y);      // (the three at y 831 to 836: between the big sheet and the fire, the only way from the west of the clearing to the east)
}

// how loud the campfire is at the van, 0..1 (audio): nothing past 460 units, an ember's worth until the fire is lit
export function fireNear() { const cp = S.byId.camp, d = Math.hypot(van.x - FIRE[0], van.y - FIRE[1]); return !cp || !cp.live || d > 460 ? 0 : Math.pow(1 - d / 460, 1.5) * (0.22 + 0.78 * ease(cp.fire || 0)); }
export function canvases() { return [Object.values(sheets), chairFrames]; }
export function jobsNear() { return [buildSlate, buildSkits, buildChair]; }
export function jobs() { return [buildFreelance, buildSet, buildGate, buildCamp, buildSheets, buildPines, dress, buildRuns, nodes]; }
export function rebakeLettering() {
  const sl = S.says.slate; if (sl && sl.rebake) sl.rebake();
  const rc = S.byId.recap; if (rc && rc.card) { const at = rc.cardAt; art.retire(rc.card, true); rc.card = art.keep(rc.cardMake, at[0], at[1], at[2], at[3]); }
  const f = S.byId.chair; if (!chairFrames || !f.prop) return;
  const word = backWord(f);
  chairFrames.forEach(art.retire); chairFrames = [11, 12, 13].map(i => art.keep(() => ma.chairSprite(i / 16 * TAU, word), f.x, f.y));
  f.prop.sp = chairFrames[1]; f.prop.dark = art.darkTwin(chairFrames[1]);
}

// ---------- what each find does when it wakes. Every woken thing keeps a lit circle (spec 8.4) ----------
export function onWake(f) {
  switch (f.id) {
    case 'skit2': case 'skit3': lit.push([f.x, f.y, 110]); if (loops[f.id]) { loops[f.id].on = true; startLoop(loops[f.id]); } return true;
    case 'chair': lit.push([f.x + 10, f.y + 12, 104]); f.idx = van.x > f.x + 22 ? 2 : van.x < f.x - 22 ? 0 : 1; f.tip = 0.0001; return true;      // it turns its back's lettering toward the side the van is on
    case 'freelance': lit.push([f.x, f.y + 4, 172]); f.open = 0.0001; return true;      // the stand's pool: a wider circle, and it stays
    case 'camp':
      // the fire lights the clearing and the big sheet, and no further (the other three sheets stay in the dark); the gate colours in
      lit.push([f.x, f.y - 18, 129]); lit.push([GATE[0], GATE[1] + 6, 90]);
      f.fire = 0.0001; loadImg(f); if (gate) { gate.sp = spr.gateOn; art.retire(spr.gateOff, true); }
      if (onScreen(FIRE[0], FIRE[1], 60)) for (let i = 0; i < 14; i++) emit(3, FIRE[0] + (Math.random() - 0.5) * 16, FIRE[1] - 12, (Math.random() - 0.5) * 90, -60 - Math.random() * 110, 0.7 + Math.random() * 0.5, 3);
      return true;
    case 'recap': lit.push([f.sx - 12, f.y - 8, 116]); if (bunt) lit.push([bunt.x, bunt.y + 22, 34]); f.show = 0.0001; f.billow = 1.7; loadImg(f); return true;      // its cloth billows once; its band of bunting colours in
    case 'promo': lit.push([f.sx, f.y - 10, 114]); spr.snow = ma.staticSprite(160, 90, 11); f.snow = 0.42; loadImg(f); return true;
    case 'colorwar': lit.push([f.sx - 6, f.y - 4, 126]); f.show = 0.0001; f.split = 0.0001; loadImg(f); return true;
  }
  return false;
}

// ---------- light lying on the mat, under every prop ----------
export function drawGround(ctx) {
  const F = S.byId;
  for (const id of ['skit2', 'skit3']) {                     // a found skit phone's pink on the mat: two hard-edged steps (awake, a third of it)
    const s = F[id], k = s.found ? 1 : s.near * 0.3;
    if (k > 0 && onScreen(s.x, s.y, 90)) { ctx.fillStyle = PAL.pink; ctx.globalAlpha = 0.16 * k; ctx.beginPath(); ctx.ellipse(s.x, s.y, 75, 48, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(s.x, s.y, 48, 30, 0, 0, TAU); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  // light lying on the mat: three hard-edged steps, never a blur
  const pool = (x, y, w, h, col, k) => { ctx.fillStyle = col; ctx.globalAlpha = k; for (const q of [1, 0.66, 0.34]) { ctx.beginPath(); ctx.ellipse(x, y, w * q, h * q, 0, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; };
  const fr = F.freelance;
  if (fr.open >= 0.45 && onScreen(fr.x, fr.y, 200)) pool(fr.x + 4, fr.y + 22, 132, 84, '#FFF1CF', 0.1 * ease((fr.open - 0.45) / 0.3));
  const cp = F.camp;
  // the ember's warmth on the ground, two hard steps: with the ember itself it is what is seen of the woods from the gate lane
  if (cp.fire < 1 && onScreen(FIRE[0], FIRE[1], 40)) {
    const k = 1 - ease(cp.fire); ctx.fillStyle = '#FF9A3D';
    ctx.globalAlpha = 0.1 * k; ctx.beginPath(); ctx.ellipse(FIRE[0], FIRE[1] - 2, 26, 19, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.22 * k; ctx.beginPath(); ctx.ellipse(FIRE[0], FIRE[1] - 3, 12, 8.5, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }
  if (cp.fire > 0 && onScreen(FIRE[0], FIRE[1], 240)) pool(FIRE[0], FIRE[1] - 4, 176, 112, '#FFB040', 0.1 * ease(cp.fire) * ((S.rt * 6 | 0) % 2 ? 0.9 : 1));
}

// ---------- the chase: what pulls a van at the mouth of the mat down to the woods ----------
// While the camp is still to find and the van is on the mat, every 5 s a flare runs down the dolly track from the chair
// end to the gate end (0.9 s: each pair of reflective tags turns bone-white for a tenth of a second as it passes), then
// the two bands on the gate posts flare (0.2 s), then the ember swells (0.3 s). Reflective tape and the one ember
// only: no new colour and no pool of light, so the mat stays dark. It stops for good when the camp is found.
function star(ctx, x, y, r) {
  const t = r * 0.18; ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.lineTo(x + t, y - t); ctx.lineTo(x + r, y); ctx.lineTo(x + t, y + t); ctx.lineTo(x, y + r); ctx.lineTo(x - t, y + t); ctx.lineTo(x - r, y); ctx.lineTo(x - t, y - t);
  ctx.closePath(); ctx.fill();
}
export function drawChase(ctx) {
  drawWoods(ctx);
  const t = chase.t; if (t < 0) return;
  ctx.fillStyle = '#F4F1E8';
  for (const g of chase.tags) {
    const u = t - g.d / chase.len * 0.9; if (u < 0 || u >= 0.1 || !onScreen(g.at[0][0], g.at[0][1], 40)) continue;
    ctx.fill(g.path); for (const c of g.at) star(ctx, c[0], c[1], 7.5);
  }
  if (t >= 0.9 && t < 1.1 && onScreen(GATE[0], GATE[1], 70)) for (const s of [-1, 1]) { const x = GATE[0] + s * ma.GATE_W, y = GATE[1] - 20.5; ctx.fillRect(x - 3.6, y - 3.6, 7.2, 7.2); star(ctx, x, y, 9); }
  if (t >= 1.1 && t < 1.4 && onScreen(FIRE[0], FIRE[1], 20)) { ctx.fillStyle = PAL.lamp; disc(ctx, FIRE[0], FIRE[1] - 8, 3 + 3 * Math.sin((t - 1.1) / 0.3 * Math.PI)); }
}
// Inside the woods the chase goes on, from sheet to sheet. Once the camp is found, while the van is in the woods, a
// sheet there is still dark and nothing has been found for 12 s: every 5 s the reflective bands of the nearest found
// sheet flare (0.3 s), then, twice, everything reflective on the nearest dark one: its post bands and its own tell
// (the band of bunting on the recap's wall, the stripe on the color war flag's pole, the plug of the promo's cable).
// The same bone-white glint the headlights make, seen between the trees; nothing else lights. Not under reduced motion.
const TELLS = ['recap', 'promo', 'colorwar'];
function bandsOf(f) { const s = sheets[f.id]; return s && s.glints ? s.glints.map(g => [f.sx + g[0], f.y + g[1]]) : []; }
function tickWoods(rdt) {
  const F = S.byId, w = chase.w, last = S.found.length ? F[S.found[S.found.length - 1]] : null;
  const due = F.camp.found && S.firstInput && !S.reduced && van.x > WOODS[0] && van.y > WOODS[1] && surfaceAt(van.x, van.y) === 'mat' && last && S.rt - last.foundAt > 12;
  if (!due) { w.t = -1; w.wait = 0; return; }
  if (w.t >= 0) { w.t += rdt; if (w.t >= 1.5 || (F[w.id] && F[w.id].found)) { w.t = -1; w.wait = 3.5; } return; }
  if ((w.wait -= rdt) > 0) return;
  let to = null, td = 1e9, from = F.camp, fd = 1e9;
  for (const id of TELLS) { const f = F[id]; if (!f || !f.live) continue; const d = dist(f); if (f.found) { if (d < fd) { fd = d; from = f; } } else if (d < td) { td = d; to = f; } }
  if (dist(F.camp) < fd) from = F.camp;
  if (!to) { w.wait = 5; return; }
  w.id = to.id; w.from = bandsOf(from); w.to = bandsOf(to);
  if (to.id === 'recap' && bunt) w.to.push([bunt.x - 30, bunt.y + 14], [bunt.x, bunt.y + 20], [bunt.x + 30, bunt.y + 14]);
  else if (to.id === 'colorwar') w.to.push([to.sx - 98, to.y - 14], [to.sx - 98, to.y - 6 - ma.POLE_H * HK + 12]);
  else if (to.id === 'promo') w.to.push([557, 1028]);
  w.t = 0;
}
function drawWoods(ctx) {
  const w = chase.w, t = w.t; if (t < 0) return;
  ctx.fillStyle = '#F4F1E8';
  if (t < 0.3) for (const p of w.from) if (onScreen(p[0], p[1], 20)) star(ctx, p[0], p[1], 8);
  if ((t >= 0.5 && t < 0.85) || (t >= 1.05 && t < 1.5)) for (const p of w.to) if (onScreen(p[0], p[1], 20)) { ctx.fillRect(p[0] - 3, p[1] - 3, 6, 6); star(ctx, p[0], p[1], 10.5); }
}

// ---------- per frame ----------
let lazyT = 0;
export function update(dt, rdt) {
  const F = S.byId;
  if (!F.camp.found && S.firstInput && !S.reduced && chase.tags.length && surfaceAt(van.x, van.y) === 'mat') {      // (not under reduced motion: it is a run of flashes; the ember and its warmth on the ground stay)
    if (chase.t >= 0) { chase.t += rdt; if (chase.t >= 1.4) { chase.t = -1; chase.wait = 3.6; } }
    else if ((chase.wait -= rdt) <= 0) chase.t = 0;
  } else { chase.t = -1; chase.wait = 1.4; }
  tickWoods(rdt);
  for (const id of ['skit2', 'skit3']) { const s = F[id]; if (!s.found) { const want = dist(s) < 260 ? 1 : 0; s.near += Math.max(-dt / 0.4, Math.min(dt / 0.4, want - s.near)); } }
  const ch = F.chair;
  if (ch.found) {
    // it keeps its back's lettering toward the van's side: one of three baked headings, changed only as the van crosses over
    const dx = van.x - ch.x, d = dist(ch);
    if (d < 340 && d > 64) { const want = dx > 46 ? 2 : dx < -46 ? 0 : Math.abs(dx) < 20 ? 1 : ch.idx; if (want !== ch.idx) { ch.idx = want; if (ch.prop) squash(ch.prop); } }
    if (ch.tip > 0 && ch.tip < 1) { const was = ch.tip; ch.tip = Math.min(1, ch.tip + dt / 0.55); if (was < 0.9 && ch.tip >= 0.9) audio.thud(); }
  }
  const fr = F.freelance;
  if (fr.open > 0 && fr.open < 1) { const was = fr.open; fr.open = Math.min(1, fr.open + dt / 1.1); if (was < 0.3 && fr.open >= 0.3 && fr.prop) { squash(fr.prop); audio.tick(); } if (was < 0.45 && fr.open >= 0.45) audio.tick(); }
  if (fr.open >= 0.3 && fr.iris < 1) fr.iris = Math.min(1, fr.iris + dt / 0.9);
  const cp = F.camp;
  if (cp.fire > 0) {
    if (cp.fire < 1) cp.fire = Math.min(1, cp.fire + dt / 0.8);
    if (cp.fire > 0.5 && cp.show < 1) cp.show = Math.min(1, cp.show + dt / 0.6);             // the picture comes up on the sheet as the fire takes
  }
  const pr = F.promo; if (pr.snow > 0) { pr.snow -= dt; if (pr.snow <= 0) { pr.snow = 0; pr.show = 1; spr.snow = null; audio.tick(); } }      // static snaps into the thumbnail
  for (const id of ['colorwar', 'recap']) { const f = F[id]; if (f && f.show > 0 && f.show < 1) f.show = Math.min(1, f.show + dt / 0.45); }
  const cw = F.colorwar; if (cw.split > 0 && cw.split < 1) cw.split = Math.min(1, cw.split + dt / 0.7);
  const rc = F.recap; if (rc && rc.billow > 0) rc.billow = Math.max(0, rc.billow - dt);
  const sl = S.says.slate; if (sl && sl.clap > 0) { const was = sl.clap; sl.clap = Math.max(0, sl.clap - dt / 0.6); if (was > 0.78 && sl.clap <= 0.78) audio.thud(); }      // the slate's stick comes down
  if (marks && S.tracks.v) { for (const p of marks) { p.sp = p.on; } marks = null; }
  lazyT -= rdt;
  if (lazyT <= 0) { lazyT = 0.25; if (S.firstInput) for (const id of YT) { const f = F[id]; if (f && f.live && !f.img && nearView(f.scr)) loadImg(f); } }     // a thumbnail is fetched when its sheet is on, or nearly on, the screen (spec 9.7)
}
