// desk.js — the far desk (stage 2): the nine cards and the tray they fly into, the app phone and its gust, the
// taped sheet, the bench, ads 2 and 3, the printer behind the tall boxes, the dressing and the decoy pile.
// Built in idle slices (jobs); every find's label spot is set up front (init) so a find can fire at any time.
import { S, G, PAL, SEED, mulberry32, DECOY_PILE, MUG, shown } from './world.js';
import * as art from './art.js';
import * as da from './deskart.js';
import { spr, prop, cbox, ccirc, makeLoop, addScreen, grab, drawScreen, glass, steps, phoneBody } from './kit.js';
import { van } from './van.js';
import { burst, blowPile, blowNear } from './surfaces.js';
import * as ui from './ui.js';
import * as audio from './audio.js';

const SS = art.SS, TRAY = da.TRAY, APP = da.APP, LINE = da.LINE, TAU = 6.2832;
const BOXES = [-180, -1385];                 // the tall file boxes (spec 5, ai): their front edge's middle
const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
const onScreen = (x, y, m) => { const v = S.vr; return x > v[0] - m && x < v[2] + m && y > v[1] - m && y < v[3] + m; };
const disc = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };
const seg = (ctx, x0, y0, x1, y1) => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); };

// the tray on the app phone: launched = cards that have left for it, docked = cards in it, gold = how far the screen has turned
export const tray = { launched: 0, docked: 0, gold: 0, nudge: 0, slots: [], gust: null };
// The app's moment (finds.js runs it): while it is on, a card waits just short of the tray until its turn to dock.
// t: seconds into the moment · next: when the last waiting card was told to dock
export const show = { on: false, t: 0, next: 0 };
const flying = [];
let wake = null, pencil = null, strip = null, cube = null, boxes = null, fallen = null;

// ---------- up front: where each find's label and tab go ----------
export function init(wakeFn) {
  wake = wakeFn;
  const f = S.byId, app = f.app, ln = f.line, so = f.solo, a2 = f.ad2, a3 = f.ad3, ai = f.ai, bx = BOXES[0], by = BOXES[1];
  // app: found by the fifth card docking, not by a bump, so usually from some way off. Its label goes under the phone's
  // foot, where it hides nothing of the tray (it is slapped on when the camera of the app's moment reaches the phone; like
  // every label it leaves the screen with its thing), and once more when the van arrives. It never sits on the phone
  // itself (box: the gold screen, which no label may cover): with the van parked at the foot it goes below the van.
  app.noBump = true; app.tabAt = [app.x + 92, app.y - 18, 0.08]; app.box = [app.x - 85, app.y - 305, app.x + 85, app.y];
  app.lab = { up: [app.x, app.y - 316], down: [app.x, app.y + 12], mid: false, below: true, min: 3.4 };
  // line: the van is on the sheet when it is found and usually keeps going, so the label goes on the side the van came
  // from, where it will not be driven under; and this one long sentence stays solid 4 s even if it is (read)
  // (the tape says only WHY: the sheet itself, 168 x 210, does the reading)
  ln.flip = 0; ln.tabAt = [ln.x + 52, ln.y + 104, -0.06];
  ln.lab = { up: [ln.x, ln.y - 114], down: [ln.x, ln.y + 114], min: 2.2, only: ln.tab + '.', flip: false, below: false, pick(v) { this.below = v.vy < -20; this.flip = v.vy > 20; } };
  so.lampA = 0.44; so.type = -1; so.lab = { up: [so.x - 14, so.y - 124], down: [so.x - 14, so.y + 36] }; so.tabAt = [so.x - 34, so.y - 9, 0.05];
  a2.lab = { up: [a2.x, a2.y - 254], down: [a2.x, a2.y + 12] }; a2.tabAt = [a2.x + 38, a2.y - 15, -0.07];
  a3.morph = 0; a3.lab = { up: [a3.x - 26, a3.y - 168], down: [a3.x - 26, a3.y + 12] }; a3.tabAt = [a3.x - 20, a3.y - 8, -0.08];
  // ai: the van is behind the boxes when it is found, so its label hangs from the foot of the two that have come down,
  // and it is a narrow one (maxw): there it fits between the taped sheet's writing on its left and the app phone on its
  // right (onLine: it may lie on that sheet's blank margin, which is all it can reach)
  ai.sw = -1; ai.chart = 0; ai.fall = 0; ai.lab = { up: [bx, by - 156], down: [bx + 20, by + 84], below: true, maxw: 200, onLine: true }; ai.tabAt = [bx - 31, by + 67, -0.07];      // the tab goes on a box that has come down
}

// ---------- the nine cards: under a pile, flipped up, held a beat, then streaking north into the tray ----------
// c.st: 0 under its pile · 1 flipping · 2 face up, held · 3 in the air · 4 docked
// The job, drawn on the desk itself (under the paper, the tyre marks and everything else): two strokes a frame.
export function bakeFirst() { spr.planNums = da.NUMS.map(n => da.planNum(n[0])); }
export function drawPlan(ctx) {
  const P = da.PLAN, v = S.vr; if (P.x1 < v[0] || P.x0 > v[2] || P.y1 < v[1] || P.y0 > v[3]) return;
  ctx.strokeStyle = PAL.deskShade; ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
  ctx.lineWidth = 2; ctx.stroke(P.walls); ctx.lineWidth = 1.5; ctx.stroke(P.thin);
  if (spr.planNums) da.NUMS.forEach(([t, x, y, a], i) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); art.drawSpr(ctx, spr.planNums[i], 0, 0); ctx.restore(); });
}
export function cardsJob() {
  spr.cardBack = art.cardBack(); spr.pileMark = da.pileMark(true); spr.pileMarkOff = da.pileMark(false); spr.tick = da.tickMark();
  S.cards.forEach(c => {
    c.sp = art.cardSprite(c.word); c.flip = 0; c.st = 0; c.pop = 0; c.dpop = 0; c.t = 0;
    c.rot = ((c.x * 7 + c.y * 3) % 17 - 8) / 100;
    prop({                                                    // the pile's place, marked on the desk; ticked once its card is in the tray
      x: c.x, y: c.y, flat: true, sp: spr.pileMark,
      draw(ctx, p) {
        art.drawSpr(ctx, c.st ? spr.pileMark : spr.pileMarkOff, p.x, p.y);
        if (c.st === 4) { const k = 1 + c.dpop * 0.7; ctx.save(); ctx.translate(p.x, p.y); ctx.scale(k, k); art.drawSpr(ctx, spr.tick, 0, 0); ctx.restore(); }
      }
    });
    prop({
      x: c.x, y: c.y, flat: true, sp: c.sp, card: c,
      draw(ctx, p) {
        if (c.st >= 3) return;
        const t = c.flip, k = t <= 0 ? 1 : t >= 1 ? 1 : Math.abs(Math.cos(t * Math.PI)), hop = t > 0 && t < 1 ? Math.sin(t * Math.PI) * 12 : 0;
        const s = t >= 1 && c.pop > 0 ? 1 + c.pop * 0.25 : 1;
        ctx.save(); ctx.translate(p.x, p.y - hop); ctx.rotate(c.rot); ctx.scale(s, Math.max(0.04, k) * s); art.drawShadow(ctx, c.sp, hop * 0.6, hop * 0.4); art.drawSpr(ctx, t < 0.5 ? spr.cardBack : c.sp, 0, 0); ctx.restore();
      }
    });
  });
}
function launch(c) {
  const app = S.byId.app, i = c.slot = tray.launched++;
  c.st = 3; c.t = 0; c.tx = app.x - APP.w / 2 + TRAY.cx[i % 3]; c.ty = app.y - (APP.h + 5) + TRAY.cy[i / 3 | 0];
  const d = Math.hypot(c.tx - c.x, c.ty - c.y);
  c.dur = show.on ? 0.35 + d / 2400 : 0.5 + d / 1500; c.wait = 0; c.dockAt = 0;
  flying.push(c); audio.whip();
}
function dock(c) {
  const app = S.byId.app;
  c.st = 4; c.dpop = 1; flying.splice(flying.indexOf(c), 1);
  tray.slots.push(c); tray.docked++;
  audio.ding(tray.docked);
  if (onScreen(c.tx, c.ty, 40)) burst(3, c.tx, c.ty, 6, 80, 0.45, 3.5);
  if (tray.docked >= 5 && !app.found) wake(app);            // the app counts when the fifth card docks
}
// cards in the air, drawn over everything: a narrow gold streak and three ghosts of the card trailing behind it
export function drawOver(ctx, x0, y0, x1, y1) {
  for (const c of flying) {
    const e = ease(c.t), x = c.x + (c.tx - c.x) * e, y = c.y + (c.ty - c.y) * e;
    if (x < x0 - 60 || x > x1 + 60 || y < y0 - 180 || y > y1 + 180) continue;
    const dx = c.tx - c.x, dy = c.ty - c.y, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
    const v = 6 * c.t * (1 - c.t), len = Math.min(l * e, 150, 30 + 200 * v) * Math.max(0, 1 - (c.wait || 0) / 0.16), k = 1 + 0.24 * Math.sin(Math.PI * c.t), w = 8 * k, lift = 14 * Math.sin(Math.PI * c.t);
    const wedge = (hw, ln) => { ctx.beginPath(); ctx.moveTo(x - uy * hw, y + ux * hw); ctx.lineTo(x + uy * hw, y - ux * hw); ctx.lineTo(x - ux * ln, y - uy * ln); ctx.closePath(); ctx.fill(); };
    ctx.fillStyle = 'rgba(166,111,0,.34)'; wedge(w + 1.6, len + 6);
    ctx.fillStyle = 'rgba(242,180,17,.9)'; wedge(w, len);
    const gap = Math.min(24, len / 3.4);
    for (let i = 3; i >= 1; i--) { ctx.globalAlpha = i === 1 ? 0.4 : i === 2 ? 0.25 : 0.12; ctx.save(); ctx.translate(x - ux * gap * i, y - uy * gap * i); ctx.rotate(c.rot * (1 - e)); ctx.scale(k, k); art.drawSpr(ctx, c.sp, 0, 0); ctx.restore(); }
    ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(x, y); ctx.rotate(c.rot * (1 - e)); ctx.scale(k, k); art.drawShadow(ctx, c.sp, lift * 0.75, lift * 0.5); art.drawSpr(ctx, c.sp, 0, 0); ctx.restore();
  }
}

// ---------- the app phone and its tray ----------
function buildApp() {
  const f = S.byId.app, x = f.x, y = f.y, sx = x - APP.w / 2, sy = y - (APP.h + 5);
  spr.app = art.keep(() => da.appPhone(), x, y);
  f.prop = prop({
    // (its west side is flush with the tall boxes' east end: one block, no gap too narrow to drive into)
    x, y, sp: spr.app, sortY: y + 2, find: f, coll: cbox(x - 118, y - 78, x + 107, y + 2), tall: [x - 92, x + 92, y - 322],
    draw(ctx, p) {
      const a = ctx.globalAlpha;
      art.drawSpr(ctx, p.sp, x, y); phoneBody(ctx, x, y, APP.w, APP.h, APP.r);
      ctx.save(); ctx.translate(sx, sy);
      da.appScreen(ctx, tray.gold >= 1);
      if (tray.gold > 0 && tray.gold < 1) { ctx.globalAlpha = a * tray.gold; da.appScreen(ctx, true); ctx.globalAlpha = a; }
      for (const c of tray.slots) {                           // the cards that are in, at full size, each popping as it lands
        const k = 1 + c.dpop * 0.3, q = c.sp;
        ctx.drawImage(q.c, TRAY.cx[c.slot % 3] - q.ox / SS * k, TRAY.cy[c.slot / 3 | 0] - q.oy / SS * k, q.c.width / SS * k, q.c.height / SS * k);
      }
      ctx.fillStyle = PAL.ink; for (let i = 0; i < tray.docked; i++) ctx.fillRect(TRAY.pipX + i * TRAY.pipDX, TRAY.pipY, 5.5, 5.5);
      // Bumped before five cards are in: every place still empty lights gold in turn, one run across them in about a
      // second (a card belongs in each). The pile nearest the van twitches at the same moment (nudge, below).
      if (tray.nudge > 0) {
        const n = 9 - tray.docked, u = (1 - tray.nudge) * 1.1 / Math.min(0.09, 0.8 / n);
        ctx.lineWidth = 2.4;
        for (let i = tray.docked; i < 9; i++) {
          const j = i - tray.docked, a = u - j; if (a < 0 || a > 2.6) continue;
          const rx = TRAY.cx[i % 3] - 27, ry = TRAY.cy[i / 3 | 0] - 17, on = a < 1.4;
          ctx.fillStyle = on ? 'rgba(242,180,17,.5)' : 'rgba(242,180,17,.16)'; ctx.fillRect(rx, ry, 54, 34);
          ctx.strokeStyle = on ? PAL.gold : 'rgba(242,180,17,.5)'; ctx.strokeRect(rx, ry, 54, 34);
        }
      }
      ctx.restore();
      glass(ctx, x, y, APP.w, APP.h, APP.r);
    }
  });
}
// A bump on something that is not found by bumping (the app phone before five cards are in). It answers: its empty
// places light up in turn, and the pile nearest the van that still has a card under it twitches, with a puff of paper,
// so the eye goes from the empty tray to what fills it.
export function nudge(f) {
  if (f.id !== 'app' || tray.nudge > 0.4) return;
  tray.nudge = 1; audio.thud();
  let best = null, bd = 1e9;
  for (const p of S.piles) { if (!p.card || p.done) continue; const d = Math.hypot(p.x - van.x, p.y - van.y); if (d < bd) { bd = d; best = p; } }
  if (best) { best.tw = 1; if (onScreen(best.x, best.y, 40)) burst(2, best.x, best.y, 6, 150, 0.6, 4); }
}

// The gust: every pile still lying goes, one after another 0.15 s apart, from the hub end northward, each to its
// own side of the desk. Their cards flip up and fly in by the same rule as a ploughed pile.
// (In the app's moment they go 0.12 s apart: the whole desk is on screen, and it clears as one sweep up the frame.)
function startGust(quick) {
  const list = S.piles.filter(p => !p.done).sort((a, b) => b.y - a.y);
  tray.gust = { list, i: 0, t: 0.45, gap: quick ? 0.12 : 0.15 };
  audio.gust();
}

// ---------- the taped sheet ----------
const lineText = f => '“' + f.line.textContent.trim() + '”';
function buildLine() {
  const f = S.byId.line;
  spr.lineBack = art.keep(() => da.lineSheet(lineText(f), false), f.x, f.y);          // its written side is baked as it turns over (onWake)
  f.prop = prop({
    x: f.x, y: f.y, flat: true, sp: spr.lineBack, find: f,
    draw(ctx, p) {
      const t = f.flip, k = t <= 0 || t >= 1 ? 1 : Math.abs(Math.cos(t * Math.PI)), hop = t > 0 && t < 1 ? Math.sin(t * Math.PI) * 10 : 0;
      const sp = t >= 0.5 && spr.lineFront ? spr.lineFront : spr.lineBack;
      // once the gust has cleared the desk and it is still face down, it twitches against its tape now and then: a tell
      const u = !f.found && S.byId.app.found ? (S.rt % 2.6) / 0.4 : 9, tw = u < 1 ? Math.sin(u * 9.42) * 0.028 * (1 - u) : 0;
      if (hop) { ctx.save(); ctx.translate(p.x, p.y - hop); ctx.scale(Math.max(0.03, k), 1); art.drawSpr(ctx, sp, 0, 0); ctx.restore(); }
      else if (tw) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(tw); ctx.scale(1 + Math.abs(tw) * 1.2, 1 + Math.abs(tw) * 1.2); art.drawSpr(ctx, sp, 0, 0); ctx.restore(); }
      else art.drawSpr(ctx, sp, p.x, p.y);
      if (f.tabOn && f.tabSp) { const a = f.tabAt; ctx.save(); ctx.translate(a[0], a[1]); ctx.rotate(a[2]); art.drawSpr(ctx, f.tabSp, 0, 0); ctx.restore(); }
    }
  });
}

// ---------- the bench: one laptop, one clamp lamp, exactly one stool ----------
function buildSolo() {
  const f = S.byId.solo, x = f.x, y = f.y, L = da.LAMP;
  spr.bench = art.keep(() => da.benchSprite(), x, y); spr.stool = da.stoolSprite();
  f.prop = prop({
    x, y, sp: spr.bench, sortY: y + 2, find: f, coll: cbox(x - 58, y - 48, x + 58, y + 2), bb: [-94, -152, 100, 30],
    draw(ctx, p) {
      art.drawSpr(ctx, p.sp, x, y);
      // the laptop's glass: asleep, one cursor blinks; found, three gold lines type themselves
      const gx = x - 19.2, gy = y - 85.6, W = [30, 21, 26], t = f.type;
      if (t < 0) { if ((S.rt * 1.7 | 0) % 2 === 0) { ctx.fillStyle = '#5B666D'; ctx.fillRect(gx, gy, 3, 2.6); } }
      else {
        ctx.fillStyle = PAL.gold;
        for (let i = 0; i < 3; i++) { const k = Math.max(0, Math.min(1, t - i)); if (k > 0) ctx.fillRect(gx, gy + i * 6, W[i] * k, 2.6); }
        const i = Math.min(2, t | 0), k = Math.min(1, t - i);
        if (t < 3 || (S.rt * 1.7 | 0) % 2 === 0) { ctx.fillStyle = '#FFE1A6'; ctx.fillRect(gx + W[i] * k + 1.2, gy + i * 6 - 0.6, 2.4, 3.8); }
      }
      // the lamp: an arm from the post's top, and the shade seen from above, tipped toward where it points
      const px = x + L.px, py = y + L.py, a = f.lampA, ca = Math.cos(a), sa = Math.sin(a), hx = px + ca * 25, hy = py + sa * 25;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#5C6467'; ctx.lineWidth = 3.4; seg(ctx, px, py, hx, hy);
      ctx.strokeStyle = '#AEB6B9'; ctx.lineWidth = 1.5; seg(ctx, px, py - 0.5, hx, hy - 0.5);
      ctx.fillStyle = '#7C8588'; disc(ctx, px, py, 2.8);
      ctx.fillStyle = f.found ? PAL.lamp : '#41484C'; ctx.beginPath(); ctx.ellipse(hx + ca * 6.5, hy + sa * 6.5 + 5.5, 10.5, 7.6, 0, 0, TAU); ctx.fill();   // the inside of the shade shows under its lip: dark, then lit
      ctx.fillStyle = '#6E7679'; disc(ctx, hx + ca * 3, hy + sa * 3 + 4, 11);
      ctx.fillStyle = '#8C9598'; disc(ctx, hx, hy + 1, 8.6);
      ctx.fillStyle = '#AEB6B9'; disc(ctx, hx - ca * 2.6, hy - sa * 2.6 - 1.6, 5.2);
      ctx.fillStyle = '#DCE1E3'; disc(ctx, hx - ca * 3.4 - 1.2, hy - sa * 3.4 - 2.8, 1.7);
    }
  });
  prop({ x: x + 16, y: y + 14, sp: spr.stool, sortY: y + 27, find: f, noTab: true, coll: ccirc(x + 16, y + 13, 19) });      // as wide as the seat is drawn: the van never rests under it
}
// The bench lamp's pool on the desk, under the van when it is near (drawn with the hard shadows, clipped to the tables).
export function drawLights(ctx) {
  const f = S.byId.solo; if (!f.found || !f.prop || !onScreen(f.x, f.y, 260)) return;
  const L = da.LAMP, bx = f.x + L.bx, by = f.y + L.by, d = Math.max(50, Math.min(150, Math.hypot(van.x - bx, van.y - by)));
  steps(ctx, bx + Math.cos(f.lampA) * d, by + Math.sin(f.lampA) * d, PAL.lamp, [0, 0, 64, 41, 0.24], [-2, -1, 36, 22, 0.2]);
}

// ---------- ad 2: the drawing board on its easel, a pencil beside it ----------
function buildAd2() {
  const f = S.byId.ad2, x = f.x, y = f.y, P = da.PAPER;
  spr.easel = art.keep(() => da.easelSprite(), x, y); const B = da.easelBits(), ty = y + P.y + P.h - 5;
  f.scr = [x + P.x, y + P.y, x + P.x + P.w, y + P.y + P.h];
  const L = addScreen('ad2', makeLoop(f.video, true, 224, 400), f, f.scr);
  f.prop = prop({
    x, y, sp: spr.easel, sortY: y + 1, find: f, coll: cbox(x - 78, y - 26, x + 78, y + 1), tall: [x - 66, x + 66, y - 250],
    draw(ctx, p) { art.drawSpr(ctx, p.sp, x, y); grab(L); drawScreen(ctx, L, x + P.x, y + P.y, P.w, P.h); art.drawSpr(ctx, B.clip, x, y + P.y - 3); art.drawSpr(ctx, B.tl, x - 52, ty); art.drawSpr(ctx, B.tr, x + 52, ty); }
  });
  const sp = art.pencilSprite(-1.42);
  pencil = { roll: false, vx: 0, gone: 0 };
  pencil.p = prop({
    x: x + 75, y: y + 13, flat: true, sp,                     // against the easel's east foot, and just outside the opening frame's left edge
    draw(ctx, p) {
      if (pencil.gone >= 1) return;
      const a = ctx.globalAlpha, drop = pencil.gone * 30;
      ctx.globalAlpha = a * (1 - pencil.gone);
      if (!drop) art.drawShadow(ctx, sp, p.x, p.y);
      art.drawSpr(ctx, sp, p.x, p.y + drop); ctx.globalAlpha = a;
    }
  });
}

// ---------- ad 3: a phone leaning on a plain grey cube ----------
function buildAd3() {
  const f = S.byId.ad3, x = f.x, y = f.y, cx = x - 66, cy = y - 3;
  spr.lean = art.keep(() => da.leanPhone(), x, y); spr.cube = da.cubeFrames(true);      // only the plain cube for now: the rest are baked as it rounds off
  f.scr = [x - 42, y - 155, x + 42, y - 5];
  const L = addScreen('ad3', makeLoop(f.video, true, 168, 300), f, f.scr);
  cube = prop({
    x: cx, y: cy, sp: spr.cube[0], sortY: cy, find: f, noTab: true, coll: cbox(cx - 25, cy - 38, cx + 25, cy), tall: [cx - 27, cx + 27, cy - 84], pop: 0,
    draw(ctx, p) {
      const m = f.morph, i = m <= 0 || spr.cube.length < 5 ? 0 : m >= 1 ? 4 : 1 + (m * 3 | 0), q = p.pop;
      if (q > 0) { ctx.save(); ctx.translate(cx, cy); ctx.scale(1 + 0.16 * q, 1 + 0.16 * q); ctx.translate(-cx, -cy); }
      art.drawSpr(ctx, spr.cube[i], cx, cy);
      if (q > 0) ctx.restore();
    }
  });
  f.prop = prop({
    // its collider reaches as far back as the cube's does: one flat-backed block from the cube to the desk's edge, so a
    // van pushed into it from behind slides west round the cube and is never held in a notch between cube, phone and edge
    x, y, sp: spr.lean, sortY: y + 1, find: f, coll: cbox(x - 46, y - 41, x + 48, y + 1), tall: [x - 48, x + 48, y - 165],
    draw(ctx, p) { phoneBody(ctx, x, y, 84, 150, 10); grab(L); drawScreen(ctx, L, x - 42, y - 155, 84, 150); glass(ctx, x, y, 84, 150, 10); }
  });
}

// ---------- ai: a small printer and five switches, hidden behind the tall file boxes ----------
function chartPath(g, x, y, n) {
  g.beginPath();
  for (let i = 3; i < n; i++) { const p = strip.pts[i], o = strip.zz[i], px = x + p[0] + p[2] * o, py = y + p[1] + p[3] * o; if (i === 3) g.moveTo(px, py); else g.lineTo(px, py); }
}
function buildAi() {
  const f = S.byId.ai, x = f.x, y = f.y, bx = BOXES[0], by = BOXES[1], W = da.SWITCH;
  spr.tallBoxes = art.keep(() => da.tallBoxes(false), bx, by); spr.rig = art.keep(() => da.printerRig(), x, y); strip = da.paperStrip();
  // the chart the printer will draw: a zig-zag about the strip's middle, climbing a little, a new corner every 9 units
  const r = mulberry32(SEED ^ 0xa1c4), n = strip.pts.length; strip.zz = new Float32Array(n);
  let a = 3.2, b = -1.5;
  for (let i = 0; i < n; i++) { const k = i % 3; if (k === 0 && i) { a = b; b = (b > 0 ? -1 : 1) * (1 + r() * 3.2) - 1.5 + i / n * 3; } strip.zz[i] = a + (b - a) * k / 3; }
  prop({
    x, y, flat: true, sp: strip.sp,
    draw(ctx, p) {
      // unfound, once the gust has cleared the desk: the strip chatters now and then (the tell that something is feeding it)
      const u = !f.found && S.byId.app.found ? (S.rt + 1.3) % 2.8 : 9, ch = u < 0.36 ? Math.sin(u * 70) * 1.2 : 0;
      art.drawSpr(ctx, strip.sp, x + ch, y + ch * 0.4);
      if (f.chart > 0 && f.chart < 1) { ctx.strokeStyle = PAL.goldDeep; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; chartPath(ctx, x, y, 3 + (f.chart * (n - 3) | 0)); ctx.stroke(); }
    }
  });
  f.prop = prop({
    x, y, sp: spr.rig, sortY: y + 10, find: f, noTab: true, coll: cbox(x - 58, y - 34, x + 60, y + 10),
    draw(ctx, p) {
      art.drawSpr(ctx, p.sp, x, y);
      ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) {                           // five levers, down until they flip themselves; a lamp over each
        const on = f.sw > i, sx = x + W.x0 + i * W.dx, sy = y + W.y, ty = on ? -5.2 : 5;
        ctx.fillStyle = on ? PAL.lamp : '#596066'; disc(ctx, sx, sy - 10.4, 1.7);
        ctx.strokeStyle = '#2B2F33'; ctx.lineWidth = 3.6; seg(ctx, sx, sy, sx, sy + ty);
        ctx.strokeStyle = '#D5DADD'; ctx.lineWidth = 2; seg(ctx, sx, sy, sx, sy + ty);
        ctx.fillStyle = '#F1EEE6'; disc(ctx, sx, sy + ty, 2.3);
      }
    }
  });
  // The boxes hide it: two stacks of two, 35% see-through while the van is anywhere behind them, so the printer is
  // never found without being seen. Its paper snaking out past them is the tell. The find knocks the top two off:
  // they come down in front, the row that is left is one box high for good, and the printer on its cart stands clear above it.
  // There are two ways in behind them: round their west end, or round the far side of the app phone.
  boxes = prop({
    x: bx, y: by, sp: spr.tallBoxes, sortY: by + 1, coll: cbox(bx - 62, by - 36, bx + 62, by + 1), tall: [bx - 64, bx + 64, by - 130],
    fade: (vx, vy) => vy < by - 30 && vx > bx - 150 && vx < bx + 150
  });
  const fc = cbox(bx - 62, by + 1, bx + 62, by + 76); fc.off = true;        // where the two land: solid only once they have
  fallen = prop({
    x: bx, y: by, sp: { c: art.mk(1, 1), ox: 0, oy: 0, s: null, bb: [-66, -130, 66, 86] }, sortY: by + 76, tabFor: f, coll: fc,
    draw(ctx, p) {
      const t = f.fall; if (t <= 0) return;
      if (t < 0.55) {                                          // off the top, forward and down
        const u = t / 0.55, e = u * u;
        for (let i = 0; i < 2; i++) { const q = spr.loose[i], x0 = bx + (i ? 31 : -31), z = (i ? 80 : 74) * (1 - e) * art.HK; ctx.save(); ctx.translate(x0, by - 1 + 44 * u - z); ctx.rotate((i ? 0.5 : -0.4) * u); ctx.scale(1, 1 - 0.3 * u); art.drawSpr(ctx, q, 0, 0); ctx.restore(); }
      } else {                                                 // landed: one squash, then still
        const u = (t - 0.55) / 0.45, sq = t < 1 ? Math.sin(u * Math.PI) * 0.12 : 0;
        if (sq) { ctx.save(); ctx.translate(bx, by + 76); ctx.scale(1 + sq * 0.5, 1 - sq); ctx.translate(-bx, -by - 76); }
        art.drawSpr(ctx, p.sp, bx, by);
        if (sq) ctx.restore();
      }
    }
  });
}

// ---------- dressing (seeded, never a find) and what the decoy pile hides ----------
function dress() {
  const r = mulberry32(SEED ^ 0xd35c), f = S.byId;
  const taken = S.piles.map(p => [p.x, p.y, p.r + 14]);
  taken.push([0, -1385, 150], [f.line.x, f.line.y, 132], [340, -1268, 98], [-380, -640, 112], [350, -930, 100], [-185, -1380, 130], [-286, -1385, 54], [232, -850, 44],
    [-380, -790, 96], [380, -1000, 70], [300, -1350, 70],      // and where the tall ones stand up the screen: the board, the leaning phone, the lamp
    [-300, -960, 44], [-422, -1100, 64], [250, -1150, 62], [MUG[0], MUG[1], 34], [345, -1168, 30], [325, -450, 84]);      // the dispenser, organiser, clipboard, mug; the plan's north arrow and title block
  const spot = (rad, x0 = -400, x1 = 400) => {
    for (let k = 0; k < 80; k++) { const x = x0 + r() * (x1 - x0), y = -1430 + r() * 600; if (taken.every(t => Math.hypot(x - t[0], y - t[1]) > t[2] + rad)) { taken.push([x, y, rad]); return [x, y]; } }
    return null;
  };
  prop({ x: 232, y: -850, flat: true, sp: art.pencilSprite(0.4) });        // the pencil the hub slice showed lying past its tape
  spr.mug = da.mugSprite(); prop({ x: MUG[0], y: MUG[1], sp: spr.mug, sortY: MUG[1] + 11, coll: ccirc(MUG[0], MUG[1], 11) });
  // three things no gust can move: a tape dispenser (its tape gold only once the Workeey track has a find), a clipboard, a drawer unit against the west edge
  const dOn = da.dispenserSprite(true), dOff = da.dispenserSprite(false);
  prop({ x: -300, y: -960, sp: dOn, sortY: -948, coll: ccirc(-300, -960, 15), draw(ctx, p) { art.drawSpr(ctx, S.tracks.w ? dOn : dOff, p.x, p.y); } });
  prop({ x: 250, y: -1150, flat: true, sp: art.keep(() => da.clipboardSprite(0.14), 250, -1150) });
  prop({ x: -422, y: -1100, sp: da.organiserSprite(), sortY: -1075, coll: cbox(G.desk[0], -1125, -387, -1075) });
  let s;
  if ((s = spot(76))) { const at = s, ang = r() * 3.1416; prop({ x: at[0], y: at[1], flat: true, sp: art.keep(() => da.rulerSprite(ang), at[0], at[1]) }); }
  for (let i = 0; i < 3; i++) if ((s = spot(32))) prop({ x: s[0], y: s[1], flat: true, sp: art.pencilSprite(r() * TAU) });
  [[911, 2, 0], [917, 4, 1], [923, 1, 0]].forEach(([seed, n, extra]) => { if ((s = spot(30))) prop({ x: s[0], y: s[1], flat: true, sp: da.screwsSprite(seed, n, extra) }); });      // no two clusters the same
  prop({ x: DECOY_PILE.x, y: DECOY_PILE.y, flat: true, sp: art.keep(() => da.clipChain(), DECOY_PILE.x, DECOY_PILE.y) });
}

export function canvases() { return [strip && strip.sp]; }
export function jobs() { return [buildApp, buildAd2, buildAd3, buildLine, buildSolo, buildAi, dress]; }
// lettering baked again when a font face arrives late
export function rebakeLettering() {
  S.cards.forEach(c => { if (c.sp) c.sp = art.cardSprite(c.word); });
  const f = S.byId.line;
  if (spr.lineBack) { art.retire(spr.lineBack); art.retire(spr.lineFront); const up = f.found; spr.lineBack = art.keep(() => da.lineSheet(lineText(f), up), f.x, f.y); if (up) spr.lineFront = spr.lineBack; if (f.prop) f.prop.sp = spr.lineBack; }
  if (spr.planNums) bakeFirst();
}

// ---------- what each find does when it wakes. Returns true if it was one of the desk's ----------
export function onWake(f, quick) {
  switch (f.id) {
    case 'app': startGust(quick); f.greeted = Math.hypot(van.x - f.x, van.y - f.y) < 300; if (onScreen(f.x, f.y - 120, 60)) burst(3, f.x, f.y - 120, 16, 230, 0.9, 5); return true;
    case 'line': {                                           // every other sheet flies; this one turns over
      const pile = S.piles.find(p => p.kind === 'line');
      if (pile) blowPile(pile, van.x < f.x ? 1 : -1);
      spr.lineFront = art.keep(() => da.lineSheet(lineText(f), true), f.x, f.y);
      f.flip = 0.0001; burst(2, f.x, f.y, 8, 210, 0.7, 4); return true;
    }
    case 'solo': f.type = 0; return true;
    case 'ad2': S.inkUntil = S.t + 6; if (pencil) { pencil.roll = true; pencil.vx = -50; } return true;      // the pencil rolls off; the van draws in ink for 6 s
    case 'ad3': f.morph = 0.0001; if (spr.cube.length < 5) spr.cube = da.cubeFrames(); return true;
    case 'ai':                                             // the top two boxes come down in front; the row left is one box high for good
      f.sw = 0; f.chart = 0.0001; f.fall = 0.0001;
      spr.loose = [da.looseBox(0), da.looseBox(1)];
      if (fallen) fallen.sp = art.keep(() => da.fallenBoxes(), BOXES[0], BOXES[1]);
      if (boxes) { art.retire(spr.tallBoxes); boxes.sp = spr.tallBoxes = art.keep(() => da.tallBoxes(true), BOXES[0], BOXES[1]); boxes.tall = [BOXES[0] - 64, BOXES[0] + 64, BOXES[1] - 62]; }
      return true;
  }
  return false;
}

// ---------- per frame ----------
export function update(dt, rdt) {
  const F = S.byId, app = F.app;
  // card piles: when 70% of a pile's sheets have moved 60 units, the card under it flips up
  for (const pile of S.piles) {
    if (pile.done || pile.moved < pile.n * 0.7) continue;
    const c = pile.card;
    if (c && !c.sp) continue;                                 // its sprite is not baked yet: next frame
    pile.done = true;
    if (c) { c.st = 1; c.flip = 0.0001; audio.ding(0); if (onScreen(pile.x, pile.y, 60)) burst(3, pile.x, pile.y, 9, 120, 0.6, 4); }
  }
  for (const c of S.cards) {
    if (c.st === 1) { c.flip = Math.min(1, c.flip + dt / 0.3); if (c.flip >= 1) { c.st = 2; c.pop = 1; c.hold = show.on ? 0.12 : 0.55; } }
    else if (c.st === 2) { if (c.pop > 0) c.pop = Math.max(0, c.pop - dt / 0.25); c.hold -= dt; if (c.hold <= 0 && app.prop) launch(c); }
    else if (c.st === 3) {
      // In the app's moment a card stops just short of the tray (0.86 of the way is 95% of the distance) and waits there for
      // its turn: the first as the camera arrives (2.24 s), each next one 0.12 s later. Otherwise it flies straight in.
      const was = c.t; c.t += dt / c.dur;
      if (show.on && was <= 0.86 && c.t > 0.86) {
        if (!c.dockAt) c.dockAt = show.next = Math.max(show.next + 0.12, 2.24, show.t + 0.14 * c.dur);
        if (show.t < c.dockAt - 0.14 * c.dur) { c.t = 0.86; c.wait += dt; }
      }
      if (c.t >= 1) dock(c);
    }
    else if (c.st === 4 && c.dpop > 0) c.dpop = Math.max(0, c.dpop - dt / 0.3);
  }
  const g = tray.gust;
  if (g) {
    g.t -= dt;
    while (g.t <= 0 && g.i < g.list.length) {
      const p = g.list[g.i++]; g.t += g.gap; if (p.done) continue;
      blowPile(p, p.x < 0 ? -1 : 1);
      if (show.on) p.moved = p.n;                             // in the app's moment its card turns up as the paper leaves, not a beat after
      if (onScreen(p.x, p.y, 80)) burst(2, p.x, p.y, 5, 220, 0.7, 4);
    }
    if (g.i >= g.list.length) tray.gust = null;
  }
  if (tray.nudge > 0) tray.nudge = Math.max(0, tray.nudge - rdt / 1.1);
  if (app.found && app.prop) {
    // all nine in: the screen turns gold, and the loose sheets round the phone go too, so the desk about it is clean
    if (tray.docked >= S.cards.length && tray.gold < 1) {
      if (!tray.gold) { blowNear(app.x, app.y, 430); audio.chime(); if (onScreen(app.x, app.y - 120, 60)) burst(3, app.x, app.y - 120, 22, 260, 1, 5); }
      tray.gold = Math.min(1, tray.gold + dt / (show.on ? 0.3 : 0.5));
    }
    // its two links are offered while the van is within 240 units; the label is slapped on once more on first arriving
    const d = Math.hypot(van.x - app.x, van.y - app.y);
    if (d < 240 && !app.near) { app.near = true; ui.pill(app); if (!app.greeted) { app.greeted = true; ui.addLabel(app, van); } }
    else if (d > 262) app.near = false;
    // the two links belong to the phone: with less than half of it on screen they step down, and come back with it
    ui.linksAway(shown(app.x - 85, app.y - 305, app.x + 85, app.y) < 0.5);
  }
  // the counter is the same gold as the app's cards: while the phone's screen lies under it, it gets a dark plate
  if (app.prop) { const v = S.vr, k = (v[2] - v[0]) / (window.innerWidth || 390); ui.counterPlate(tray.docked > 0 && app.x + 85 > v[0] && app.x - 85 < v[0] + 150 * k && app.y - 305 < v[1] + 66 * k && app.y - 5 > v[1]); }
  const ln = F.line;
  if (!ln.found) { if (ln.prop && Math.abs(van.x - ln.x) < LINE.w / 2 - 16 && Math.abs(van.y - ln.y) < LINE.h / 2 - 18) wake(ln); }     // the one sheet that does not fly when hit: found once the van is well onto it
  else if (ln.flip < 1) { ln.flip = Math.min(1, ln.flip + dt / 0.3); if (ln.flip >= 1 && spr.lineFront) { art.retire(spr.lineBack); spr.lineBack = spr.lineFront; if (ln.prop) ln.prop.sp = spr.lineFront; } }
  const so = F.solo;
  if (so.prop && (so.found || so.lampA !== 0.44) && onScreen(so.x, so.y, 260)) {
    const L = da.LAMP, want = so.found ? Math.atan2(van.y - (so.y + L.by), van.x - (so.x + L.bx)) : 0.44;
    let d = want - so.lampA; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
    so.lampA += d * Math.min(1, dt * 7);                      // the lamp swings after the van
  }
  if (so.found && so.type < 3.2) so.type = Math.min(3.2, so.type + dt / 0.55);
  if (pencil && pencil.roll && pencil.gone < 1) {
    pencil.vx = Math.max(-250, pencil.vx - 380 * dt); pencil.p.x += pencil.vx * dt;
    if (pencil.p.x < G.desk[0] - 4) pencil.gone = Math.min(1, pencil.gone + dt / 0.35);
  }
  const a3 = F.ad3;
  if (a3.morph > 0 && a3.morph < 1) {
    a3.morph = Math.min(1, a3.morph + dt / 0.6);
    if (a3.morph >= 1 && cube) { cube.sp = spr.cube[4]; spr.cube = [null, null, null, null, spr.cube[4]]; cube.pop = 1; audio.ding(3); if (onScreen(cube.x, cube.y, 60)) burst(3, cube.x, cube.y - 30, 10, 130, 0.6, 4); }
  } else if (cube && cube.pop > 0) cube.pop = Math.max(0, cube.pop - dt / 0.3);
  const ai = F.ai;
  if (ai.fall > 0 && ai.fall < 1) {
    const was = ai.fall; ai.fall = Math.min(1, ai.fall + dt / 0.35);
    if (was < 0.55 && ai.fall >= 0.55) { audio.thud(); if (fallen) fallen.coll.off = false; if (onScreen(BOXES[0], BOXES[1] + 40, 80)) burst(2, BOXES[0], BOXES[1] + 44, 7, 170, 0.6, 4); }
    if (ai.fall >= 1) spr.loose = null;
  }
  if (ai.found && ai.sw < 5) { const was = ai.sw | 0; ai.sw = Math.min(5, ai.sw + dt / 0.18); if ((ai.sw | 0) > was) audio.tick(); }
  if (ai.chart > 0 && ai.chart < 1 && strip) {
    ai.chart = Math.min(1, ai.chart + dt / 1.8);
    if (ai.chart >= 1) {                                      // drawn: from here it is part of the strip's own sprite
      const q = strip.sp, c = q.c.getContext('2d');
      c.setTransform(SS, 0, 0, SS, q.ox, q.oy); c.strokeStyle = PAL.goldDeep; c.lineWidth = 2; c.lineJoin = 'round'; c.lineCap = 'round'; chartPath(c, 0, 0, strip.pts.length); c.stroke();
    }
  }
}
