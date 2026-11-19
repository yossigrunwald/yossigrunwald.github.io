// small.js — the notes, the small things and the ambient life (CONTENT-v2, D and G2). Everything here is behind
// world.SMALL: with ?small=0 nothing in this file runs and the page is the one branch main serves (the live home page).
//
// A NOTE is paper lying on a table: driven over, it lifts into a card (ui.js) that hangs by the van; it is never a find.
// A SMALL THING says its one line when the van touches it or a finger taps it, and does its one small motion.
// Neither has a collider: flat things are driven over, standing things are pushed aside and step back. Every picture
// is drawn from flat fills (smallart.js) but one: the bay's lettering, baked once into a small sprite that is let go
// when far away like every other (bakeLetters). Words come from
// the two lists at the end of #finds in index.html (world.readSmall); no word is written in this file.
//
// THE PATTERN (part B adds the rest by following it; the engine below needs no change for them):
//   1. the thing's <li data-thing="id"> is already in index.html, with its place, its radius and its kind
//   2. smallart.js gets R[id] (its recipe), BB[id], SND[id], DUR[id]: with those it is drawn, touched, tapped, heard
//   3. if its reaction does more than its picture: one entry in FX below (particles, a pool of light, a squash)
//   4. if it is an object that already lies on the table (data-host): one entry in HOSTS below, and no recipe unless
//      something is drawn over it. A thing with neither a recipe nor a HOSTS entry is left out: no prop, no voice.
//
// A frame: update() is one loop over at most 37 things, each a squared distance and nothing more while the van is far;
// no array, object, closure or string is made in a frame; nothing is drawn unless the game's own passes draw the prop
// (they cull it by its box), and the loops are pure functions of S.rt, so nothing is stepped while it is off screen.
import { S, SMALL, readSmall, standable, collidersNear, collDist } from './world.js';
import { drawSpr, drawShadow, cv, SS, keep, retire } from './art.js';      // (cv: a sprite's own canvas. keep: the bay's one baked picture, let go when far like every sprite)
import { prop, flats, lit, spr, squash } from './kit.js';
import { van, auto, goTo, R } from './van.js';
import { emit, burst, liftTop } from './surfaces.js';
import { state as bench } from './belt.js';
import * as ui from './ui.js';
import * as audio from './audio.js';
import * as A from './smallart.js';

const list = [], byId = {}, mutes = [], blown = [], blownA = [], collBuf = [], hostOf = new Map();
const stat = { n: 0, last: 0, still: false };   // n, last: how many of this file's pictures the last frame drew · still: the garage's bulb held at rest, no moth (both for ?debug=1)
let quiet = () => false, lastSay = -9, fan = null, arm = null, decoy = null, chain = null, tellAt = -9;      // tellAt: when the last tell began (one at a time, table-wide)
const MAT = { mat: 1, woods: 1 };               // the tables that are dark until lit
const ease = A.ease;

// ---------- what a reaction does besides its picture: FX[id](t), called once when it reacts ----------
// (particles are motion: none under reduced motion. A pool of light is a lasting state: it stays.)
const FX = {
  goldroll(t) { squash(t.hostProp); },
  shoebox(t) { if (!S.reduced) emit(2, t.x + t.ox, t.y + t.oy - 14, (Math.random() - 0.5) * 50, -70, 0.9, 4); },      // one slip of paper
  whisk(t) { if (!S.reduced) burst(0, t.x, t.y, 5, 90, 0.4, 3); },                                                   // a little flour
  rollingpin(t) { if (!S.reduced) burst(0, t.x, t.y, 6, 70, 0.4, 3); },
  scraper(t) { if (!S.reduced) burst(0, t.x + SCR_X * 24, t.y + SCR_Y * 24, 4, 60, 0.4, 3); },                        // ... ahead of its blade
  stick(t) { if (!S.reduced && t.rn < 2) emit(1, t.x - 13, t.y - 6, 0, -18, 1.2, 5); },                               // one puff off the marshmallow, the first time
  ledpanel(t) { if (!t.pool) { t.pool = true; lit.push([t.x, t.y + 10, 64]); } },                                     // the mat gains a lamp: its heard pool IS this one
  camera(t) { if (!t.pool) { t.pool = true; t.pl = [t.x, t.y, S.reduced ? 30 : 60]; lit.push(t.pl); } }               // its pool jumps to 60 and settles to 30 (its recipe steps it)
};
const SCR_X = 0.343, SCR_Y = 0.939;             // the way the scraper's blade faces (its sprite is turned -0.35)
// ---------- the objects that already lie there and gain a line: where each is found, and how it moves ----------
// in: 'props' (a standing thing) or 'flats' · over: it has a recipe that is drawn OVER it (an overlay prop "id:fx")
// move(t, u, o): its place while it reacts, as an offset from where it lies, written into o.x, o.y (it is put back
//   exactly when the move ends) · draw(ctx, p, t, u): a flat host drawn another way while it reacts (at rest the engine
//   draws it exactly as the flat pass does) · pile: 'decoy' = it lies under that pile and is silent until it is bared
const HOSTS = {
  goldroll: { in: 'props', over: true },
  // the paperclip chain the decoy pile hides: an INCHWORM, drawn squeezed and stretched from its west end
  clipchain: { in: 'flats', pile: 'decoy', draw(ctx, p, t, u) {
    const s = u * 0.5, k = s < 0.15 ? 1 - 0.16 * ease(s / 0.15) : s < 0.3 ? 0.84 + 0.24 * ease((s - 0.15) / 0.15) : 1.08 - 0.08 * ease((s - 0.3) / 0.2);
    ctx.save(); ctx.translate(p.x - 56, p.y); ctx.scale(k, 1); ctx.translate(56 - p.x, -p.y); drawShadow(ctx, p.sp, p.x, p.y); drawSpr(ctx, p.sp, p.x, p.y); ctx.restore();
  } },
  // one of the mat's seeded SD cards: it HOPS and lands
  sdcard: { in: 'flats', move(t, u, o) { o.y = -6 * Math.sin(u * Math.PI); } },
  // the bench scraper: it SCRAPES, 16 units the way its blade faces, and comes back
  scraper: { in: 'flats', move(t, u, o) { const s = u * 0.7, k = 16 * (s < 0.2 ? A.out3(s / 0.2) : 1 - ease((s - 0.2) / 0.5)); o.x = SCR_X * k; o.y = SCR_Y * k; } }
};

// ---------- reading the page (finds.readWorld) ----------
export function init(q) {
  if (!SMALL) return;
  quiet = q;
  for (const t of readSmall()) {
    t.lab = { up: [t.x, t.y - 46], down: [t.x, t.y + 46] };      // where its tape hangs: clear of a van that stands on it
    t.on = false; t.sx = t.x; t.sy = t.y; t.inside = false; t.near = false;
    t.said = false; t.left = false;
    t.read = false; t.up = false; t.upAt = -9; t.downAt = -9; t.handAt = -9; t.park = 0; t.parked = false;
    t.readT = t.note ? Math.min(6, Math.max(3, 0.2 * t.line.textContent.trim().split(/\s+/).length)) : 0;
    t.want = -99; t.rx = -1; t.dur = A.DUR[t.note ? 'note' : t.id] || 0.4; t.rAt = -9; t.st = 0; t.ax = 0; t.ay = 1;
    t.ox = 0; t.oy = 0; t.down = false; t.hx = 0; t.hy = 0; t.mv = -1;
    t.held = -9; t.from = -9; t.layAt = -9; t.rn = 0; t.pl = null; t.tl = -9; t.owe = -1;      // rn: how many times it has reacted · pl: a pool of light its recipe steps (the stills camera) · tl: when its last tell began · owe: since when a tell is owed to it
    t.ph = ((t.x * 7 + t.y * 3) % (t.note ? 4.4 : 5.2) + 5.2) % (t.note ? 4.4 : 5.2);      // its tell is out of step with its neighbours'
    t.mat = !!MAT[t.table]; t.pool = false; t.prop = null; t.hostProp = null; t.dropped = dropped;
    t.letter = t.head && !t.note ? t.head.textContent.trim() : ''; t.sp = null;      // (the bay: its lettering, and the sprite it is baked into)
    list.push(t); byId[t.id] = t;
  }
}

// ---------- props ----------
// One draw and one glow for every thing (no closure a prop): the prop carries its thing as p.t.
function drawIt(ctx, p) { paint(ctx, p.t, false); }
function glowIt(ctx, p) { paint(ctx, p.t, true); }
function drawOver(ctx, p) {                     // a host's overlay: only while it reacts
  const t = p.t; if (t.rx < 0) return;
  const u = (S.rt - t.rx) / t.dur; if (u >= 1) { t.rx = -1; return; }
  stat.n++; ctx.save(); ctx.translate(t.x, t.y); A.R[t.id](ctx, t, u, false); ctx.restore();
}
const grow = (b, m) => [b[0] - m, b[1] - m, b[2] + m, b[3] + m];
function build(t) {
  // (one: where the headlights flare on it, on the mat. The flare pulses, so under reduced motion a new thing has none: it is still lit by the wedge)
  const id = t.id, note = t.note, bb = A.BB[note ? 'note' : id], one = S.reduced ? null : [[0, note ? -14 : -(bb ? -bb[1] : 10) * 0.5]];
  if (t.host) { host(t); return; }
  if (!note && !A.R[id]) return;                // its recipe comes later: no prop, no voice
  const stand = t.kind === 'stand' || t.kind === 'wall';
  if (stand) t.prop = prop(t.mat ? { x: t.x, y: t.y, sp: { bb: grow(bb, 30) }, sortY: t.y + t.r / 2, small: id, t, draw: drawIt, onMat: true, dark: true, glow: glowIt, glints: one }
    : { x: t.x, y: t.y, sp: { bb: grow(bb, 30) }, sortY: t.y + t.r / 2, small: id, t, draw: drawIt });
  // (a flat thing on the mat is a standing-list prop that sorts to the ground, as the dolly track does: only that pass draws a thing dark and lit)
  else t.prop = prop(t.mat ? { x: t.x, y: t.y, onMat: true, sp: { bb }, sortY: -1e5, dark: true, glow: glowIt, draw: drawIt, glints: one, small: id, t }
    : { x: t.x, y: t.y, flat: true, sp: { bb }, small: id, t, draw: drawIt });
  spot(t);
}
// Where the van is sent to reach it: its own place if the van can stand there, else the nearest free place in reach.
const free = (x, y) => { if (!standable(x, y)) return false; for (const c of collidersNear(x, y, R + 4, collBuf)) if (collDist(c, x, y) < R + 1) return false; return true; };
function spot(t) {
  if (free(t.x, t.y)) return;
  for (let r = 4; r < t.reach - 1; r += 4) for (let i = 0; i < 16; i++) { const a = i * 0.3927, x = t.x + Math.cos(a) * r, y = t.y + Math.sin(a) * r; if (free(x, y)) { t.sx = x; t.sy = y; return; } }
}
// A host: the object is found once, by its exact place. Nothing is written on it but its place while it moves (put
// back exactly) and, for a flat one that is drawn another way while it reacts, a draw that is the flat pass's own at rest.
function hostDraw(ctx, p) {
  const t = hostOf.get(p), h = HOSTS[t.id];
  if (t.rx >= 0) { const u = (S.rt - t.rx) / t.dur; if (u < 1) { stat.n++; h.draw(ctx, p, t, u); return; } t.rx = -1; }
  drawShadow(ctx, p.sp, p.x, p.y); drawSpr(ctx, p.sp, p.x, p.y);
}
function host(t) {
  const h = HOSTS[t.id]; if (!h) return;
  let p = null; for (const q of h.in === 'props' ? S.props : flats) if (Math.abs(q.x - t.x) < 0.5 && Math.abs(q.y - t.y) < 0.5 && !q.small) { p = q; break; }
  if (!p) { console.warn('[resume] small thing "' + t.id + '": the object it speaks for is not at ' + t.x + ', ' + t.y + ' (another seed?). Left out.'); return; }
  t.hostProp = p; t.hx = p.x; t.hy = p.y; t.on = true;
  if (h.draw && p.flat && !p.onMat) { hostOf.set(p, t); p.draw = hostDraw; }
  if (h.over) prop({ x: t.x, y: t.y, sp: { bb: A.BB[t.id + ':fx'] }, sortY: p.sortY - 0.1, small: t.id + ':fx', t, draw: drawOver });
  if (h.pile) { decoy = S.piles.find(q => q.kind === h.pile) || null; if (decoy) { chain = t; t.on = false; } }
  if (p.coll) { t.sx = p.cx; t.sy = p.cy; } else spot(t);
}
// the things that are part of the opening picture (data-first: note 1): made with the first sprites
export function first() {
  if (!SMALL) return;
  for (const t of list) if (t.first) { build(t); t.on = true; }
}
// everything else, in one idle slice (quick: the bay's lettering is the one sprite baked): the other props, the hosts, the fan, the arm
export function jobs() {
  if (!SMALL) return [];
  return [() => {
    for (const t of list) if (!t.first) build(t);
    bakeLetters();
    fan = mute('fan', 414, -484, 10); arm = mute('arm', 906, -730, 9);
    // which piles the fan's sweep passes over: within 300 units (a pile further off shares no screen with the fan, and
    // the one above the hub would flap in the opening frame with nothing to explain it), their bearing inside the sweep (worked out once)
    for (const p of S.piles) { const dx = p.x - fan.x, dy = p.y - fan.y, d = Math.hypot(dx, dy); let b = Math.atan2(dy, dx); if (b < 0) b += 6.2832; if (d < 300 && Math.abs(b - FAN0) < FAN1 + 0.2) { blown.push(p); blownA.push(b); } }
  }];
}
// the bay's lettering (G10), baked once into its own small sprite; let go when far away, as art.keep does for every sprite
function bakeLetters() { for (const t of list) if (t.letter && t.prop && A.R[t.id]) { if (t.sp) retire(t.sp, true); t.sp = keep(() => A.baySprite(t.letter), t.x, t.y); } }
// a font face arrived after boot (finds.rebakeLettering)
export function rebakeLettering() { if (SMALL) bakeLetters(); }
// a mute prop of the ambient loops: it answers nothing, and is pushed aside like any standing thing
const FAN0 = 195 * Math.PI / 180, FAN1 = 55 * Math.PI / 180;
function drawMute(ctx, p) {
  const t = p.t; if (!laid(t)) return;
  stat.n++; ctx.save(); enter(ctx, t);
  if (t === fan) A.fan(ctx, t, S.life ? FAN0 + FAN1 * Math.sin(S.rt * 0.8976) : FAN0);
  else A.arm(ctx, t, S.life && bench.run[3] ? S.rt % 3.2 : -1);
  ctx.restore();
}
function mute(id, x, y, r) {
  const t = { id, x, y, r, kind: 'stand', mute: true, on: false, ox: 0, oy: 0, down: false, rAt: -9, held: -9, from: -9, layAt: -9, prop: null };
  t.prop = prop({ x, y, sp: { bb: grow(A.BB[id], 30) }, sortY: y + r / 2, small: id, t, draw: drawMute });
  mutes.push(t); return t;
}

// ---------- laid down after the first touch (the rule desk.js has for the stamp's tape arrow, copied) ----------
// The opening frame stays as it is: a new thing is not drawn before the first touch. One that is out of view by then
// is simply there when it next comes into view; one that has been in view ever since appears 1.2 s after the touch,
// over 0.3 s. Reduced motion has no opening frame: it is there. (Note 1 is part of the opening picture: first().)
function laid(t) {
  if (t.on) return true;
  if (t === chain) return true;                 // the chain lies there already, under its pile: it is drawn, and silent until bared
  if (!S.reduced) {
    const now = S.rt;
    if (!S.firstInput) { t.held = t.from = now; return false; }
    if (now - t.held < 0.25) { if (now - t.from < 1.2) { t.held = now; return false; } t.layAt = now; }
  }
  t.on = true; return true;
}
// into the thing's own space: its place (and where it has been pushed), fading in if it has just been laid down;
// lifted in its hop, lying flat while the van stands on it
function enter(ctx, t) {
  const now = S.rt, f = (now - t.layAt) / 0.3;
  if (f < 1) ctx.globalAlpha *= f < 0 ? 0 : f;
  ctx.translate(t.x + t.ox, t.y + t.oy);
  if (t.down) ctx.scale(1, 0.25);
  else if (!S.reduced) { const h = (now - t.rAt) / 0.22; if (h < 1 && t.kind === 'stand') ctx.translate(0, -6 * Math.sin(Math.PI * h)); }
}
// the one wrapper every thing is drawn through. dark: the mat's unlit shape of it.
function paint(ctx, t, dark) {
  if (!laid(t)) return;
  const now = S.rt; let u = -1;
  if (t.rx >= 0) { u = (now - t.rx) / t.dur; if (u >= 1) { u = -1; t.rx = -1; } }
  stat.n++; ctx.save(); enter(ctx, t);
  // the tell (5.10): an unheard thing near the van twitches now and then; an unread note flicks its corner (update()
  // starts each one, at most one in 1.5 s across the table, so a cluster never flickers)
  const tell = S.life && t.near && u < 0 && !t.ox && !t.oy && !(t.note ? t.read || t.up : t.said);
  if (t.note) {
    ctx.rotate(t.a);
    let k = t.read ? 0 : 1;
    if (u >= 0) k += 0.6 * Math.sin(u * Math.PI);                                              // touched: its corner flutters
    else if (tell) { const q = (now - t.tl) / 0.5; if (q < 1) k += 0.6 * Math.sin(q * Math.PI); }
    A.note(ctx, t, k, dark);
  } else {
    if (tell) { const q = (now - t.tl) / 0.4; if (q < 1) { const r = Math.sin(q * 9.42) * 0.06 * (1 - q), s = 1 + Math.abs(r) * 1.2; ctx.rotate(r); ctx.scale(s, s); } }
    if (t.kind === 'flat') ctx.rotate(t.a);
    A.R[t.id](ctx, t, u, dark);
  }
  ctx.restore();
}

// ---------- touched, tapped, heard ----------
// May it speak now? (5.4) tapped: the visitor asked for it.
function canSpeak(tapped) {
  if (!S.firstInput || auto.idle || quiet() || ui.busy()) return false;
  if (tapped) return true;
  return !ui.labelReading() && (!ui.smallUp() || ui.smallRead()) && S.rt - lastSay >= 1.6;
}
// its motion and its sound, at most once in half a second a thing. soft: it makes no sound of its own this time.
function react(t, soft) {
  const now = S.rt; if (now - t.rAt < 0.5) return;
  t.rAt = now; t.st = 1; t.rn++;
  const dx = t.x + t.ox - van.x, dy = t.y + t.oy - van.y, d = Math.hypot(dx, dy);
  if (d > 0.5) { t.ax = dx / d; t.ay = dy / d; }
  if (!S.reduced) { if (t.rx < 0 || now - t.rx >= t.dur) t.rx = now; if (t.hostProp && HOSTS[t.id].move && t.mv < 0) t.mv = now; }
  const fx = FX[t.id]; if (fx) fx(t);
  if (!soft) audio.small(t.note ? 'paper2' : A.SND[t.id]);
}
function touch(t, tapped) {
  if (!S.firstInput || (t.note && t.up)) return;      // before the first touch nothing answers (the idle tour sets nothing off); an open note is already speaking
  const now = S.rt; if (now - t.want < 12) tapped = true;
  const wants = t.note ? !t.up && (tapped || !t.read) : tapped || !t.said || t.left;
  // nothing on the bench speaks unasked before the bench has said its front door (the control post, within 110 units):
  // note 4 lies by the post, and its card would only be put down by the post's tape a moment later
  const wait = !tapped && !bench.entered && t.table === 'belt' && (t.x - 520) * (t.x - 520) + (t.y + 178) * (t.y + 178) < 19600;      // (within 140 of the post)
  const up = wants && !wait && canSpeak(tapped) && ui.addSmall(t, van);
  react(t, up && t.note);                       // (a note that opens makes the sound of paper lifted, not its rustle)
  if (!up) {                                    // it stays as it was, and speaks the next time it is touched: there is no queue
    if (tapped && (t.yt || t.talk) && canSpeak(true)) { t.want = -99; ui.pill(t); }      // (asked for: its pill comes up even if its line found no room)
    return;
  }
  lastSay = now; t.want = -99;
  if (t.note) { t.up = true; t.upAt = now; t.parked = true; audio.small('paper'); }
  // (the stopwatch's pill plays the cantata; the bay's says Talk to me. Unasked, it never takes the bar from a find
  // whose pill is still standing: SPEC 5.7)
  else { heard(t); if ((t.yt || t.talk) && (tapped || ui.pillFree(van, t))) ui.pill(t); }
}
function heard(t) { t.left = false; if (!t.said) { t.said = true; if (t.mat && !t.pool) { t.pool = true; lit.push([t.x, t.y, 30]); } } }      // heard, on the mat: it keeps a small pool of light
// called by ui.js when its tape or its card goes. A note is read when its card has had its read time, or the visitor
// put it down after at least 0.6 s; one that flashed by keeps its curl and opens again on the next pass.
function dropped(why, age) {
  const t = this;
  // (part B) a small thing's line that a main tape, a moment or a sheet cut short inside a second has not been heard:
  // it is unsaid again (its tell goes on, its lamp stays dark) and it speaks the next time it is touched
  if (!t.note) { if (age < 1 && (why === 'main' || why === 'moment' || why === 'sheet')) t.said = false; return; }
  const hand = why === 'tap' || why === 'away' || why === 'esc';
  t.up = false; t.downAt = S.rt; if (hand || why === 'drive') t.handAt = S.rt;
  if (age >= t.readT || (hand && age >= 0.6)) t.read = true;
  audio.small('paper2');
}
// A standing thing is pushed aside by the van and steps back when it has gone (5.9): no collider, the van is never
// stopped, and it is never drawn through the thing. At the end of its reach it lies flat and is driven over.
function shove(t, rdt) {
  const need = R + t.r + 1, now = S.rt;
  let qx = t.x + t.ox - van.x, qy = t.y + t.oy - van.y, q = Math.hypot(qx, qy), down = false;
  if (q < need) {
    if (q < 0.01) { qx = 0; qy = -1; q = 1; }
    if (t.mute && !t.ox && !t.oy && now - t.rAt > 0.5) t.rAt = now;                             // (a mute prop hops on first contact too)
    const k = (need - q) / q; t.ox += qx * k; t.oy += qy * k;
    const o = Math.hypot(t.ox, t.oy);
    // at the end of its reach it cannot get out of the way: once the van is 2 units into it, it lies flat, and stays flat until the van is off it
    if (o > 26) { t.ox *= 26 / o; t.oy *= 26 / o; down = Math.hypot(t.x + t.ox - van.x, t.y + t.oy - van.y) < (t.down ? need : need - 2); }
  }
  const hx = t.x - van.x, hy = t.y - van.y, far = need + 34;
  if ((t.ox || t.oy) && hx * hx + hy * hy > far * far) {
    const o = Math.hypot(t.ox, t.oy), s = 55 * rdt;
    if (o <= s) t.ox = t.oy = 0; else { t.ox -= t.ox / o * s; t.oy -= t.oy / o * s; }
  }
  t.down = down; t.prop.sortY = down ? -1e5 : t.y + t.oy + t.r / 2;
}
// a host in the middle of its move: its prop's place, stepped, and put back to the exact numbers when the move ends
const off = { x: 0, y: 0 };
function stepHost(t) {
  const u = (S.rt - t.mv) / t.dur, p = t.hostProp;
  if (u >= 1) { p.x = t.hx; p.y = t.hy; t.mv = -1; return; }
  off.x = off.y = 0; HOSTS[t.id].move(t, u, off); p.x = t.hx + off.x; p.y = t.hy + off.y;
}

// ---------- once a frame (finds.update): no allocation ----------
export function update(dt, rdt) {
  if (!SMALL) return;
  S.life = S.firstInput && !S.reduced;
  stat.last = stat.n; stat.n = 0;
  if (ui.smallUp() && (quiet() || ui.busy())) ui.dropSmall('moment');
  const vx = van.x, vy = van.y;
  const now = S.rt; let tb = null, tbo = 1e12;  // tb: the thing that has waited longest for its tell
  for (let i = 0; i < list.length; i++) {
    const t = list[i];
    if (t.mv >= 0) stepHost(t);
    if (!t.on) continue;
    const dx = vx - t.x - t.ox, dy = vy - t.y - t.oy, d2 = dx * dx + dy * dy;
    if (d2 > 48400 && t.said) t.left = true;                     // 220 units away since it spoke: it may speak again
    t.near = d2 < 102400;                                        // within 320: its tell may show
    // its tell falls due every 5.2 s (a note: 4.4 s), each out of step, while it is unheard, still, not shoved, not a
    // host. One begins at most every 1.5 s table-wide: one that falls due meanwhile is owed it, and the one owed
    // longest goes next (so in a cluster each still gets its turn, only less often)
    if (S.life && t.near && !t.hostProp && !t.ox && !t.oy && now - t.tl > 1 && (t.rx < 0 || now - t.rx >= t.dur) && !(t.note ? t.read || t.up : t.said)) {
      if (t.owe < 0 && (now + t.ph) % (t.note ? 4.4 : 5.2) < 0.12) t.owe = now;
      if (t.owe >= 0 && t.owe < tbo) { tb = t; tbo = t.owe; }
    } else t.owe = -1;
    if (d2 > 12100 && !t.ox && !t.oy) { t.inside = false; t.park = 0; t.parked = false; continue; }      // the cheap way out for nearly all
    if (t.kind === 'stand' && t.prop) shove(t, rdt);
    const d = Math.hypot(vx - t.x - t.ox, vy - t.y - t.oy), was = t.inside;
    t.inside = d < (was ? t.reach + 8 : t.reach);
    if (t.inside && !was) touch(t, false);
    // a note the van comes to rest on opens, as a tap would (not one the visitor has just put down)
    if (t.note && !t.up) {
      if (!t.inside || van.speed >= 30) { t.park = 0; t.parked = false; }
      else if (!t.parked && (t.park += rdt) >= 0.35 && S.rt - t.handAt > 3) { t.park = 0; t.parked = true; touch(t, true); }      // (once a rest)
    }
  }
  if (tb && now - tellAt >= 1.5) { tb.tl = tellAt = now; tb.owe = -1; }      // one tell at a time across the table

  for (let i = 0; i < mutes.length; i++) {
    const t = mutes[i], dx = vx - t.x - t.ox, dy = vy - t.y - t.oy;
    if (t.on && (dx * dx + dy * dy < 12100 || t.ox || t.oy)) shove(t, rdt);
  }
  // the thing under the decoy pile: bared once the pile has lost most of its sheets; it speaks as the paper flies off it
  if (chain && !chain.on && decoy.moved >= 0.6 * decoy.n) { chain.on = true; if (Math.hypot(vx - chain.x, vy - chain.y) < 150) touch(chain, false); }
  // steam goes on curling from the loaf once it has baked (after the 9 s the find itself gives), while the loaf is in view
  const b = S.byId.bread, v = S.vr;
  if (S.life && b.bake >= 1 && S.t - b.foundAt >= 9 && v[2] > -300 && v[0] < -160 && v[3] > -120 && v[1] < 80 && Math.random() < dt * 1.4) emit(1, b.x + (Math.random() - 0.5) * 60, b.y - 34, (Math.random() - 0.5) * 10, -30, 1.5, 8);
}

// ---------- the loops that are not a prop ----------
// flour motes in the loaf lamp's light (finds.drawGround, under every prop)
export function drawGround(ctx) {
  if (!S.life) return;
  const v = S.vr; if (v[2] < -330 || v[0] > -90 || v[3] < -30 || v[1] > 140) return;
  stat.n++; A.motes(ctx, S.rt);
}
// the top sheet of each whole pile lifts as the fan's head passes over it (main.js, right after the paper is drawn)
export function drawPaper(ctx) {
  if (!S.life || !fan) return;
  const head = FAN0 + FAN1 * Math.sin(S.rt * 0.8976);
  for (let i = 0; i < blown.length; i++) {
    const p = blown[i]; if (p.touched || p.tw > 0 || !p.pic) continue;
    const k = 1 - Math.abs(head - blownA[i]) / 0.2; if (k > 0) { stat.n++; liftTop(ctx, spr.sheets, p, k); }
  }
}
// the garage's bulb sways, and a moth circles it (the garage prop's draw, finds.js). bulbSway: for the pool at its mouth.
export const bulbSway = () => S.life && !stat.still ? Math.sin(S.rt * 1.428) : 0;
// The bulb is part of the garage's baked sprite, which is not baked again: the piece of that sprite where the bulb hangs
// (16 x 21 units of its mouth, from under the awning down past the bulb: nothing in it but the cord, the socket, the bulb,
// the wall's flutes and one step of the glow) is drawn AGAIN, up to 1.2 units to the side. At rest nothing is drawn: the
// garage is then the baked one, pixel for pixel. Called before the pool at the mouth is drawn over it, as in the sprite.
export function drawHome(ctx, p) {
  if (!S.life || !p.sp.c) return;                // (a sprite that has been let go is not baked again for this)
  const dx = 1.2 * bulbSway(); if (dx > -0.02 && dx < 0.02) return;
  const sp = p.sp, q = sp.res || SS;
  stat.n++; ctx.drawImage(cv(sp), sp.ox - 8 * q, sp.oy - 7.2 * q, 16 * q, 21.2 * q, p.x - 8 + dx, p.y - 7.2, 16, 21.2);
}
export function drawMoth(ctx, p) { if (S.life && !stat.still) A.moth(ctx, p.x, p.y, S.rt); }
// the loaf's lamp sways, and its pool slides with it (finds.js: the loaf prop's draw, and the pool in drawGround)
export const lampSway = () => S.life ? Math.sin(S.rt * 0.7953) : 0;

// ---------- taps (main.tap) ----------
// a tap anywhere puts an open note down; returns that note
export function tapped() { const f = ui.smallUp(); if (f && f.note) { ui.dropSmall('away'); return f; } return null; }
// the thing under a tap: the nearest whose picture is within a finger of it (from its foot up to the top of its picture)
export function at(wx, wy, finger) {
  let best = null, bd = 1e9;
  for (let i = 0; i < list.length; i++) {
    const t = list[i]; if (!t.on || !(t.prop || t.hostProp)) continue;
    const fx = t.x + t.ox, fy = t.y + t.oy, b = A.BB[t.note ? 'note' : t.id], top = t.kind === 'flat' || t.note || !b ? 0 : -b[1], bot = t.kind === 'wall' && b ? b[3] - t.r : 0;      // (a thing on a wall hangs DOWN from its place)
    const y = wy > fy + bot ? fy + bot : wy < fy - top ? fy - top : wy, d = Math.hypot(wx - fx, wy - y);
    if (d <= t.r + finger && d < bd) { bd = d; best = t; }
  }
  return best;
}
// A tap RIGHT ON a thing's own picture (within 8 units of it, not merely a finger away) is the thing's, even where a
// find's picture or its tap ring also claims the spot: the key ring hangs on the garage and the marshmallow stick lies
// against the fire ring, and without this neither could ever be tapped: the van would bump the find instead. (Not the
// gold roll: it is itself a prop with a collider, and is reached by a bump as before.)
export function owns(t, wx, wy) { return !(t.hostProp && t.hostProp.coll) && at(wx, wy, 8) === t; }
// a tap on it: it answers at once, where the finger is, and has earned its line
export function want(t) { t.want = S.rt; react(t, false); }
// ... and speaks now if the van is at it; else the van drives there, and it speaks on arrival
// (the stopwatch too: the van goes to it, it says its line and puts up its YouTube pill; the pill, or a tap on the
// stopwatch while that pill is up, plays the cantata, inside a real gesture: main.js. Nothing with sound starts from afar)
export function go(t) {
  if (Math.hypot(van.x - t.x - t.ox, van.y - t.y - t.oy) < t.reach + 10) touch(t, true); else goTo(t.sx, t.sy);
}


// ---------- ?debug=1: __g.small ----------
export const debug = {
  get list() { return list.map(t => ({ id: t.id, x: t.x, y: t.y, on: t.on, built: !!(t.prop || t.hostProp), said: t.said, read: t.read, up: t.up, inside: t.inside, ox: +t.ox.toFixed(1), oy: +t.oy.toFixed(1), down: t.down, rx: t.rx, kind: t.kind, note: t.note, reach: t.reach, sx: t.sx, sy: t.sy, tl: t.tl, want: t.want })); },
  get mutes() { return mutes.map(t => ({ id: t.id, x: t.x, y: t.y, on: t.on, ox: +t.ox.toFixed(1), oy: +t.oy.toFixed(1), down: t.down })); },
  get drawn() { return stat.last; },            // how many pictures of this file the last frame drew: 0 when none is on screen
  get blown() { return blown.length; },
  set still(v) { stat.still = !!v; },         // the garage's bulb drawn at rest, no moth: a test compares that picture with the baked garage
  fire(id) { const t = byId[id]; if (t) touch(t, false); return !!t; },
  tap(id) { const t = byId[id]; if (t) { want(t); go(t); } return !!t; },
  up() { const f = ui.smallUp(); return f ? f.id : null; }
};
