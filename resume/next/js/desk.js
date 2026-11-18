// desk.js — the desk: the nine cards and the tray they fly into, the app phone and its gust, the taped sheet, the
// bench, ads 2 and 3, the stamp, the receipt spike, the three small screens, the power strip behind the tall boxes, the
// dressing and the decoy pile.
// Built in idle slices (jobs); every find's label spot is set up front (init) so a find can fire at any time.
import { S, G, PAL, SEED, mulberry32, DECOY_PILE, MUG, CLIP, shown, on } from './world.js';
import * as art from './art.js';
import * as da from './deskart.js';
import { spr, prop, cbox, ccirc, makeLoop, addScreen, grab, drawScreen, glass, steps, phoneBody } from './kit.js';
import { van } from './van.js';
import { burst, blowPile, blowNear } from './surfaces.js';
import * as ui from './ui.js';
import * as audio from './audio.js';

const SS = art.SS, HK = art.HK, TRAY = da.TRAY, APP = da.APP, LINE = da.LINE, BIG = da.BIG, TAU = 6.2832;
const BOXES = [-180, -1385];                 // the tall file boxes: their front edge's middle
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
let wake = null, busy = () => false, pencil = null, cube = null, boxes = null;

// ---------- up front: where each find's label and tab go ----------
// busyFn(): the other moment (the strips) is on or about to begin
export function init(wakeFn, busyFn) {
  wake = wakeFn; if (busyFn) busy = busyFn;
  const f = S.byId, app = f.app, ln = f.line, so = f.solo, a2 = f.ad2, a3 = f.ad3, bx = BOXES[0], by = BOXES[1];
  // app: found by the fifth card docking, not by a bump, so usually from some way off. Its label goes under the phone's
  // foot, where it hides nothing of the tray (it is slapped on when the camera of the app's moment reaches the phone; like
  // every label it leaves the screen with its thing), and once more when the van arrives. It never sits on the phone
  // itself (box: the gold screen, which no label may cover): with the van parked at the foot it goes below the van.
  app.noBump = true; app.tabAt = [app.x + 92, app.y - 18, 0.08]; app.box = [app.x - 85, app.y - 305, app.x + 85, app.y];
  app.lab = { up: [app.x, app.y - 316], down: [app.x, app.y + 12], mid: false, below: true, min: 4.5, clear: true };
  // line: the van is on the sheet when it is found and usually keeps going, so the label goes on the side the van came
  // from, where it will not be driven under; and this one long read stays solid 4 s even if it is (read)
  // (the tape carries only the find's head: the sheet itself, 180 x 244, does the reading)
  const hh = LINE.h / 2;
  ln.flip = 0; ln.tabAt = [ln.x + 56, ln.y + hh - 1, -0.06];
  ln.lab = { up: [ln.x, ln.y - hh - 9], down: [ln.x, ln.y + hh + 9], min: 2.2, read: 3, only: ln.head.innerHTML, flip: false, below: false, pick(v) { this.below = v.vy < -20; this.flip = v.vy > 20; } };
  so.lampA = 0.44; so.type = -1; so.lab = { up: [so.x - 14, so.y - 124], down: [so.x - 14, so.y + 36] }; so.tabAt = [so.x - 34, so.y - 9, 0.05];
  a2.lab = { up: [a2.x, a2.y - 254], down: [a2.x, a2.y + 12] }; a2.tabAt = [a2.x + 38, a2.y - 15, -0.07];
  a3.morph = 0; a3.lab = { up: [a3.x - 26, a3.y - 168], down: [a3.x - 26, a3.y + 12] }; a3.tabAt = [a3.x - 20, a3.y - 8, -0.08];
  // the three newer finds: the stamp at the east edge, the paper spike, the row of small screens
  const qu = f.quality, sc = f.scale, lv = f.live;
  if (qu) { qu.hop = 0; qu.inked = 0; qu.lab = { up: [qu.x - 34, qu.y - 74], down: [qu.x - 34, qu.y + 16] }; qu.tabAt = [qu.x - 2, qu.y + 9, -0.05]; }
  if (sc) { sc.clicks = 0; sc.ct = 0; sc.roll = 0; sc.lab = { up: [sc.x + 26, sc.y - 74], down: [sc.x + 26, sc.y + 40] }; sc.tabAt = [sc.x + 56, sc.y + 30, 0.05]; }
  if (lv) { lv.lit = 0; lv.lab = { up: [lv.x - 12, lv.y - 80], down: [lv.x - 12, lv.y + 14] }; lv.tabAt = [lv.x - 50, lv.y + 8, -0.05]; }
  // The power strip (a small thing: it says its line, it is not counted). It lies in the open beside the tall boxes'
  // west end and is bumped from the open desk, the van to its south. Under the van there is the taped sheet, which no
  // tape may cover once it can be read, and a tape over the strip would hide the thing it is about. So its tape hangs
  // on the cardboard boxes beside it: a narrow column down the stack's plain face from just under its top edge, its
  // left edge at the strip's east end; the strip, the van and the sheet all stay in view. It is put there and nowhere
  // else (fix): every other free spot round the strip is the strip itself or the sheet.
  // (camX: bumped at the strip's west end the view stops at the desk's west edge, where only 112 px of the boxes are
  // on screen, too few for the column. While this tape is up the view does not go west of camX, 24 units short of
  // that stop: main.js.)
  const st = S.says.strip; if (st) { st.blink = 0; const at = [bx + 9, by - 116]; st.lab = { up: at, down: at, below: true, fix: true, maxw: 150, camX: -296 }; }
}

// ---------- the nine cards: under a pile, flipped up, held a beat, then streaking north into the tray ----------
// c.st: 0 under its pile · 1 flipping · 2 face up, held · 3 in the air · 4 docked
// Held up, a card shows its big face: the word and its short gloss (c.big, 116 x 66, drawn over everything so the van
// that has just ploughed its pile never hides it). As it leaves it shrinks to the card that docks, which is the word alone.
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
    c.sp = art.cardSprite(c.word); c.big = da.cardBig(c.word, c.gloss); c.flip = 0; c.st = 0; c.pop = 0; c.dpop = 0; c.t = 0;
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
        if (c.st >= 3 || c.flip >= 0.5) return;                // face up it is drawn over everything (drawOver)
        const t = c.flip, k = t <= 0 ? 1 : Math.abs(Math.cos(t * Math.PI)), hop = t > 0 ? Math.sin(t * Math.PI) * 12 : 0;
        ctx.save(); ctx.translate(p.x, p.y - hop); ctx.rotate(c.rot); ctx.scale(1, Math.max(0.04, k)); art.drawShadow(ctx, c.sp, hop * 0.6, hop * 0.4); art.drawSpr(ctx, spr.cardBack, 0, 0); ctx.restore();
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
  if (tray.docked >= 5 && !app.found) app.due = true;       // the app counts when the fifth card docks (update(): as soon as no tape has only just gone up)
}
// Over everything: a card held up at its pile (its big face, word and gloss), and the cards in the air (a narrow gold
// streak and three ghosts of the card trailing behind; for the first quarter of the way the big face shrinking to the card).
export function drawOver(ctx, x0, y0, x1, y1) {
  for (const c of S.cards) {
    if (c.st < 1 || c.st > 2 || c.flip < 0.5 || !c.big || c.x < x0 - 80 || c.x > x1 + 80 || c.y < y0 - 80 || c.y > y1 + 80) continue;
    // it turns face up growing from the card's size to its big face, pops once, and is held there to be read
    const t = c.flip, k = t >= 1 ? 1 : Math.abs(Math.cos(t * Math.PI)), u = Math.min(1, (t - 0.5) / 0.5), sc = (BIG.k + (1 - BIG.k) * ease(u)) * (1 + (c.pop || 0) * 0.12), hop = t < 1 ? Math.sin(t * Math.PI) * 12 : 0;
    ctx.save(); ctx.translate(c.x, c.y - hop - 6 * ease(u)); ctx.rotate(c.rot * (1 - ease(u))); ctx.scale(sc, Math.max(0.04, k) * sc); art.drawShadow(ctx, c.big, 7, 5); art.drawSpr(ctx, c.big, 0, 0); ctx.restore();
  }
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
    const big = c.t < 0.25 && c.big ? BIG.k + (1 - BIG.k) * (1 - ease(c.t / 0.25)) : 0;      // leaving: the big face, shrinking to the card
    ctx.save(); ctx.translate(x, y - (big ? 6 * (1 - c.t / 0.25) : 0)); if (!big) ctx.rotate(c.rot * (1 - e));
    if (big) { ctx.scale(big, big); art.drawShadow(ctx, c.big, 7, 5); art.drawSpr(ctx, c.big, 0, 0); }
    else { ctx.scale(k, k); art.drawShadow(ctx, c.sp, lift * 0.75, lift * 0.5); art.drawSpr(ctx, c.sp, 0, 0); }
    ctx.restore();
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
// the taped sheet's words: his sentence, his name under it, the small line at its foot
const lineText = f => ({ quote: '“' + f.line.textContent.trim() + '”', sign: f.q('[data-sign]').textContent.trim(), small: f.q('[data-small]').textContent.trim() });
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

// ---------- the tall file boxes, and the power strip that lies beside them ----------
// Two stacks of two, 20% see-through while the van is anywhere behind them. The power strip lies in the open beside
// their west end, along the desk's far edge: from the open desk the whole of it is seen, rocker, sockets and both
// chunky plugs, and its two cables run off west over the desk's edge. It is a small thing, not a find: bumped or tapped
// it says its one line and its lamp blinks. Strip and boxes are one block, closed to the desk's far edge: the strip is
// met from the south or the west; the way round the far side of the app phone ends at the strip's east end.
// (Its collider comes well forward of it: the van is drawn 17 px tall, so it stops with its roof short of the strip
// and the strip is read whole over the van's nose.)
function buildStrip() {
  const q = S.says.strip, bx = BOXES[0], by = BOXES[1], L = da.STRIP_LAMP;
  spr.tallBoxes = art.keep(() => da.tallBoxes(), bx, by);
  boxes = prop({
    x: bx, y: by, sp: spr.tallBoxes, sortY: by + 1, coll: cbox(bx - 62, by - 36, bx + 62, by + 1), tall: [bx - 64, bx + 64, by - 130], thru: 0.2,
    fade: (vx, vy) => vy < by - 30 && vx > bx - 150 && vx < bx + 150
  });
  if (!q) return;
  const x = q.x, y = q.y;
  spr.strip = art.keep(() => da.powerStrip(), x, y);
  const edge = x - G.desk[0];
  prop({ x, y, flat: true, sp: art.keep(() => da.stripCables(edge), x, y) });
  q.act = () => { q.blink = 1; audio.tick(); };
  q.prop = prop({

    x, y, sp: spr.strip, sortY: y + 10, say: q, coll: cbox(x - 58, y - 36, bx - 61, y + 34),
    draw(ctx, p) {
      art.drawSpr(ctx, p.sp, x, y);
      const lit = q.blink > 0 ? (q.blink * 7 | 0) % 2 === 0 : (S.rt * 0.8 | 0) % 4 !== 0;      // its rocker's lamp: on, with a slow wink; a quick run of blinks when it is bumped
      if (lit) { ctx.fillStyle = '#FFE1A6'; ctx.fillRect(x + L.x - 3, y + L.y - 1.6, 6, 2.4); }
    }
  });
}

// ---------- quality: a rubber stamp on its ink pad at the desk's east edge, a few slips beside it ----------
// Found, the stamp hops to the top slip, comes down on it, and goes back to its pad: the slip has its tick.
// f.hop: 0..1 through that · f.inked: how far the mark has appeared
function buildQuality() {
  const f = S.byId.quality; if (!f || !f.live) return;
  const x = f.x, y = f.y, sx = x - 64, sy = y - 13, tx = sx + 7.4, ty = sy + 13.4;      // the slips, and the box on the top one where the stamp lands
  spr.pad = art.keep(() => da.padSprite(), x, y); spr.stamp = da.stampSprite(); const slips = art.keep(() => da.slipStack(), sx, sy);
  prop({
    x: sx, y: sy, flat: true, sp: slips,
    draw(ctx, p) {
      art.drawSpr(ctx, p.sp, p.x, p.y);
      if (f.inked > 0) { const k = 1 + (1 - f.inked) * 0.5; ctx.save(); ctx.translate(sx + 1, sy); ctx.rotate(0.05); ctx.globalAlpha = Math.min(1, f.inked * 2); da.stampMark(ctx, 6.5, 13, 0.9 * k); ctx.restore(); ctx.globalAlpha = 1; }
    }
  });
  // the tape arrow, pointing at the next table over: laid down only once that table is built (its stage)
  const ar = f.q('[data-arrow]');
  if (ar && on(ar)) { const txt = ar.textContent.trim(); spr.arrow = art.keep(() => da.tapeArrow(txt), x - 96, y + 36); prop({ x: x - 96, y: y + 36, flat: true, sp: spr.arrow }); }
  f.prop = prop({
    // (closed to the desk's east edge: no gap beside it to be caught in)
    x, y, sp: spr.pad, sortY: y + 1, find: f, coll: cbox(x - 30, y - 40, G.desk[2] + 1, y + 2), bb: [-96, -80, 36, 14],
    draw(ctx, p) {
      art.drawSpr(ctx, p.sp, x, y);
      // the stamp: standing on its pad, or in the air between the pad and the slip
      const t = f.hop, px = x, py = y - 17 - 7 * HK; let u = 0, up = 0, q = 0;
      if (t > 0 && t < 1) {
        if (t < 0.36) { u = ease(t / 0.36); up = Math.sin(t / 0.36 * Math.PI) * 26; }
        else if (t < 0.56) { u = 1; q = Math.sin((t - 0.36) / 0.2 * Math.PI); }
        else { u = 1 - ease((t - 0.56) / 0.44); up = Math.sin((t - 0.56) / 0.44 * Math.PI) * 26; }
      }
      const ax = px + (tx - px) * u, ay = py + (ty - py) * u - up;
      if (q > 0) { ctx.save(); ctx.translate(ax, ay); ctx.scale(1 + 0.08 * q, 1 - 0.14 * q); art.drawSpr(ctx, spr.stamp, 0, 0); ctx.restore(); }
      else art.drawSpr(ctx, spr.stamp, ax, ay);
    }
  });
}

// ---------- scale: a receipt spike stacked with change slips, a hand tally counter lying beside it ----------
// The counter shows the figure in the find's own line, less five, until it is found; then it clicks up its last five
// and stops on the figure, each figure that changes rolling up into its window.
// f.clicks: clicks still to come · f.ct: time to the next · f.roll: 1..0 through the roll of the last click
// (No text is drawn per frame: the ten figures are baked once, spr.tally, and drawn as sprites.)
function buildScale() {
  const f = S.byId.scale; if (!f || !f.live) return;
  const x = f.x, y = f.y, T = da.TALLY, wy = y + T.y + 1 - T.z * HK, lx = x + T.x - 8, ly = y + T.y - T.h / 2 - T.z * HK;
  f.total = totalOf(f);
  spr.spike = art.keep(() => da.spikeSprite(), x, y); spr.tally = da.tallyDigits();
  f.prop = prop({
    // (its collider comes forward of the base: the van stops with the whole stack, and the counter, in view over its nose)
    x, y, sp: spr.spike, sortY: y + 12, find: f, coll: cbox(x - 20, y - 18, x + 92, y + 30),
    draw(ctx, p) {
      // the thumb lever at the counter's top edge, under the body: pressed in for a moment at each click
      const down = f.clicks > 0 && f.ct > 0.07, lh = down ? 2.2 : 5;
      ctx.fillStyle = PAL.ink; ctx.fillRect(lx - 1, ly - lh - 1, 18, lh + 3); ctx.fillStyle = '#DDE1E3'; ctx.fillRect(lx, ly - lh, 16, lh + 2); ctx.fillStyle = '#8C9598'; ctx.fillRect(lx, ly - 0.2, 16, 2.2);
      art.drawSpr(ctx, p.sp, x, y);
      const v = f.found ? f.total - f.clicks : f.total - 5, now = String(v).padStart(4, '0'), was = String(v - 1).padStart(4, '0'), r = f.found ? f.roll : 0;
      for (let i = 0; i < 4; i++) {
        const cx = x + T.x + (i - 1.5) * T.pitch;
        if (r > 0 && now[i] !== was[i]) {                       // this figure is rolling: the old one leaves upward, the new one comes up from below, inside its window
          const e = ease(1 - r);
          ctx.save(); ctx.beginPath(); ctx.rect(cx - T.dw / 2, wy - T.dh / 2, T.dw, T.dh); ctx.clip();
          art.drawSpr(ctx, spr.tally[+was[i]], cx, wy - e * T.dh); art.drawSpr(ctx, spr.tally[+now[i]], cx, wy + (1 - e) * T.dh);
          ctx.restore();
        } else art.drawSpr(ctx, spr.tally[+now[i]], cx, wy);
      }
    }
  });
}
// the figure on the counter is the one in the find's own line (the first number there)
const totalOf = f => +((f.line.textContent.match(/\d[\d,]*/) || ['0'])[0].replace(/,/g, ''));

// ---------- live: three small screens in a row. A browser window, an Android phone, an iPhone wearing a tag ----------
// Found, the browser lights, then the Android phone. The iPhone stays dark under its tag. f.lit: 0..2
function buildLive() {
  const f = S.byId.live; if (!f || !f.live) return;
  const x = f.x, y = f.y, tag = f.q('[data-tag]').textContent.trim();
  spr.live = [0, 1, 2].map(n => art.keep(() => da.liveScreens(n, tag), x, y));
  f.prop = prop({
    // (its collider comes 9 units forward of the screens' feet, so the van's nose stops at the row and not on the browser window; 45 are left to the mug)
    x, y, sp: spr.live[0], sortY: y + 1, find: f, coll: cbox(x - 84, y - 14, x + 60, y + 9), tall: [x - 86, x + 62, y - 66],
    draw(ctx, p) { art.drawSpr(ctx, spr.live[f.lit >= 2 ? 2 : f.lit >= 1 ? 1 : 0], x, y); }
  });
}

// ---------- dressing (seeded, never a find) and what the decoy pile hides ----------
function dress() {
  const r = mulberry32(SEED ^ 0xd35c), f = S.byId;
  const taken = S.piles.map(p => [p.x, p.y, p.r + 14]);
  for (const id of ['quality', 'scale', 'live']) { const q = f[id]; if (q && q.live) taken.push([q.x + (id === 'quality' ? -30 : 0), q.y - 10, id === 'live' ? 120 : 84]); }      // the three newer finds
  taken.push([0, -1385, 150], [f.line.x, f.line.y + 6, 132], [340, -1268, 98], [-380, -640, 112], [350, -930, 100], [-185, -1380, 130], [-290, -1420, 70], [-390, -1404, 60], [232, -850, 44],
    [-380, -790, 96], [380, -1000, 70], [300, -1350, 70],      // and where the tall ones stand up the screen: the board, the leaning phone, the lamp
    [-300, -960, 44], [-422, -1100, 64], [CLIP[0], CLIP[1], 62], [MUG[0], MUG[1], 34], [345, -1168, 30], [325, -450, 84]);      // the dispenser, organiser, clipboard, mug; the plan's north arrow and title block
  const spot = (rad, x0 = -400, x1 = 400) => {
    for (let k = 0; k < 80; k++) { const x = x0 + r() * (x1 - x0), y = -1430 + r() * 600; if (taken.every(t => Math.hypot(x - t[0], y - t[1]) > t[2] + rad)) { taken.push([x, y, rad]); return [x, y]; } }
    return null;
  };
  prop({ x: 232, y: -850, flat: true, sp: art.pencilSprite(0.4) });        // the pencil the hub slice showed lying past its tape
  spr.mug = da.mugSprite(); prop({ x: MUG[0], y: MUG[1], sp: spr.mug, sortY: MUG[1] + 11, coll: ccirc(MUG[0], MUG[1], 11) });
  // three things no gust can move: a tape dispenser (its tape gold only once the Workeey track has a find), a clipboard, a drawer unit against the west edge
  const dOn = da.dispenserSprite(true), dOff = da.dispenserSprite(false);
  prop({ x: -300, y: -960, sp: dOn, sortY: -948, coll: ccirc(-300, -960, 15), draw(ctx, p) { art.drawSpr(ctx, S.tracks.w ? dOn : dOff, p.x, p.y); } });
  prop({ x: CLIP[0], y: CLIP[1], flat: true, sp: art.keep(() => da.clipboardSprite(0.14), CLIP[0], CLIP[1]) });      // (clear of the tag that hangs from the iPhone in the row of screens)
  prop({ x: -422, y: -1100, sp: da.organiserSprite(), sortY: -1075, coll: cbox(G.desk[0], -1125, -387, -1075) });
  let s;
  if ((s = spot(76))) { const at = s, ang = r() * 3.1416; prop({ x: at[0], y: at[1], flat: true, sp: art.keep(() => da.rulerSprite(ang), at[0], at[1]) }); }
  for (let i = 0; i < 3; i++) if ((s = spot(32))) prop({ x: s[0], y: s[1], flat: true, sp: art.pencilSprite(r() * TAU) });
  [[911, 2, 0], [917, 4, 1], [923, 1, 0]].forEach(([seed, n, extra]) => { if ((s = spot(30))) prop({ x: s[0], y: s[1], flat: true, sp: da.screwsSprite(seed, n, extra) }); });      // no two clusters the same
  prop({ x: DECOY_PILE.x, y: DECOY_PILE.y, flat: true, sp: art.keep(() => da.clipChain(), DECOY_PILE.x, DECOY_PILE.y) });
}

export function canvases() { return []; }
export function jobs() { return [buildApp, buildAd2, buildAd3, buildLine, buildSolo, buildStrip, buildQuality, buildScale, buildLive, dress]; }
// lettering baked again when a font face arrives late
export function rebakeLettering() {
  S.cards.forEach(c => { if (c.sp) { c.sp = art.cardSprite(c.word); c.big = da.cardBig(c.word, c.gloss); } });
  const f = S.byId.line;
  if (spr.lineBack) { art.retire(spr.lineBack); art.retire(spr.lineFront); const up = f.found; spr.lineBack = art.keep(() => da.lineSheet(lineText(f), up), f.x, f.y); if (up) spr.lineFront = spr.lineBack; if (f.prop) f.prop.sp = spr.lineBack; }
  if (spr.planNums) bakeFirst();
  if (spr.tally) spr.tally = da.tallyDigits();
  const lv = S.byId.live; if (spr.live && lv && lv.prop) { const tag = lv.q('[data-tag]').textContent.trim(); spr.live.forEach(q => art.retire(q, true)); spr.live = [0, 1, 2].map(n => art.keep(() => da.liveScreens(n, tag), lv.x, lv.y)); lv.prop.sp = spr.live[0]; }
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
    case 'quality': f.hop = 0.0001; return true;
    case 'scale': f.clicks = 5; f.ct = 0.25; f.roll = 0; if (onScreen(f.x, f.y - 30, 60)) burst(2, f.x, f.y - 34, 6, 150, 0.6, 4); return true;
    case 'live': f.lit = 0.0001; return true;
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
    if (c.st === 1) { c.flip = Math.min(1, c.flip + dt / 0.3); if (c.flip >= 1) { c.st = 2; c.pop = 1; c.hold = show.on ? 0.12 : 0.95; } }      // held just under a second: time to read its gloss
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
  // The app is found when its fifth card docks. Its moment takes the camera away, so it waits until the tape that is up
  // has had two and a half seconds to be read (and for the other moment to be over): never longer than that.
  if (app.due && !app.found && ui.labelAge() >= 2.5 && !busy()) { app.due = false; wake(app); }
  if (app.found && app.prop) {
    // all nine in: the screen turns gold, and the loose sheets round the phone go too, so the desk about it is clean
    if (tray.docked >= S.cards.length && tray.gold < 1) {
      if (!tray.gold) { blowNear(app.x, app.y, 430); audio.chime(); if (onScreen(app.x, app.y - 120, 60)) burst(3, app.x, app.y - 120, 22, 260, 1, 5); }
      tray.gold = Math.min(1, tray.gold + dt / (show.on ? 0.3 : 0.5));
      if (tray.gold >= 1 && !app.full) { app.full = true; ui.relabel(app); }      // the tray is full: its tape gains a line
    }
    // its two links are offered while the van is within 240 units; the label is slapped on once more on first arriving
    const d = Math.hypot(van.x - app.x, van.y - app.y);
    if (d < 240 && !app.near) { app.near = true; ui.pill(app); if (!app.greeted) { app.greeted = true; ui.addLabel(app, van); } }
    else if (d > 262) app.near = false;
    // The app's buttons belong to the phone: with less than half of it on screen they step down, and come back with it.
    // Only while the buttons bar is the app's: the same bar carries every other find's buttons (the garage's, skit 3's,
    // the row of screens'), and those are never stepped down for the phone's sake.
    ui.linksAway(ui.linksOwner() === app && shown(app.x - 85, app.y - 305, app.x + 85, app.y) < 0.5);
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
  const qu = F.quality;
  if (qu && qu.hop > 0 && qu.hop < 1) {
    const was = qu.hop; qu.hop = Math.min(1, qu.hop + dt / 1.1);
    if (was < 0.42 && qu.hop >= 0.42) { qu.inked = 0.0001; audio.thud(); if (onScreen(qu.x - 56, qu.y, 60)) burst(2, qu.x - 56, qu.y, 4, 110, 0.5, 3); }
  }
  if (qu && qu.inked > 0 && qu.inked < 1) qu.inked = Math.min(1, qu.inked + dt / 0.3);
  const sc = F.scale;
  if (sc && sc.clicks > 0) { sc.ct -= dt; if (sc.ct <= 0) { sc.clicks--; sc.ct = 0.24; sc.roll = 1; audio.tick(); } }
  if (sc && sc.roll > 0) sc.roll = Math.max(0, sc.roll - dt / 0.16);
  const lv = F.live;
  if (lv && lv.lit > 0 && lv.lit < 2) { const was = lv.lit | 0; lv.lit = Math.min(2, lv.lit + dt / 0.28); if ((lv.lit | 0) > was) audio.tick(); }
  const st = S.says.strip; if (st && st.blink > 0) st.blink = Math.max(0, st.blink - rdt / 0.9);
}
