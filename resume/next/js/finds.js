// finds.js — props and colliders for this stage, find rules, wake animations, loops on screens,
// card piles, the three-track moment and the idle tour.
import { S, PAL, TRACK, MEDIA, readFinds, readCards, makeSheets, collDist } from './world.js';
import * as art from './art.js';
import { van, auto, input, goTo, stopAuto } from './van.js';
import { emit, burst } from './surfaces.js';
import * as ui from './ui.js';
import * as audio from './audio.js';

export const spr = {};                       // shared sprites, filled by bakeFirst() and bakeRest()
export const flats = [];                     // flat things under the van: cards and dressing
export const lit = [];                       // lit circles on the mat: [x, y, r]
export const three = { on: false, t: 0, lift: false, n: 0, hold: 0 };
const vanFrames = new Map();                 // key -> array of 64 sprites, baked on demand
const vanState = { lights: false, gold: false, ladder: false, loaf: false, cam: false };
let vanKey = '', frames = null;

const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);

// ---------- loops: a poster, then the 4 s muted loop copied to a small canvas at up to 30 fps ----------
function makeLoop(name) {
  const L = { name, img: new Image(), v: null, c: null, g: null, ready: false, refused: false, last: 0 };
  L.img.decoding = 'async'; L.img.src = MEDIA + name + '.jpg';
  return L;
}
function startLoop(L) {
  if (!L.v) {
    const v = L.v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.src = MEDIA + L.name + '-loop.mp4';
    L.c = art.mk(270, 480); L.g = L.c.getContext('2d');
  }
  const p = L.v.play(); if (p && p.catch) p.then(() => { L.refused = false; }, () => { L.refused = true; });
}
function grab(L) {
  const v = L.v; if (!v || v.readyState < 2 || v.paused) return;
  if (S.rt - L.last < 0.032) return;
  L.last = S.rt; L.g.drawImage(v, 0, 0, 270, 480); L.ready = true;
}
function drawScreen(ctx, L, x, y, w, h) {
  if (L.ready) ctx.drawImage(L.c, x, y, w, h);
  else if (L.img.complete && L.img.naturalWidth) ctx.drawImage(L.img, x, y, w, h);
  if (L.refused && !L.ready) art.drawSpr(ctx, spr.play, x + w / 2, y + h / 2);
}
export const loops = {};
export function pauseLoops() { for (const k in loops) { const v = loops[k].v; if (v && !v.paused) v.pause(); } }
export function resumeLoops() { for (const k in loops) { const L = loops[k]; if (L.v && L.on) startLoop(L); } }

// ---------- van sprite sets ----------
export function vanFrame(i) {
  const key = (van.lights ? 'L' : 'l') + (vanState.gold ? 'G' : 'g') + (vanState.ladder ? 'A' : 'a') + (vanState.loaf ? 'B' : 'b') + (vanState.cam ? 'C' : 'c');
  if (key !== vanKey) { vanKey = key; vanFrames.clear(); frames = new Array(64); vanFrames.set(key, frames); }   // the old set is dropped
  return frames[i] || (frames[i] = art.vanSprite(i / 64 * Math.PI * 2, { ...vanState, lights: van.lights }));
}

// ---------- building the stage ----------
function prop(o) {
  const p = Object.assign({ x: 0, y: 0, sp: null, sortY: 0, alpha: 1, tall: null, onMat: false, dark: null, find: null, squash: 0, draw: null, coll: null, flat: false }, o);
  if (p.coll) { p.coll.prop = p; S.colliders.push(p.coll); const c = p.coll; p.cx = c.t === 'c' ? c.x : (c.x0 + c.x1) / 2; p.cy = c.t === 'c' ? c.y : (c.y0 + c.y1) / 2; }
  (p.flat ? flats : S.props).push(p);
  return p;
}
const cbox = (x0, y0, x1, y1) => ({ t: 'b', x0, y0, x1, y1 });
const ccirc = (x, y, r) => ({ t: 'c', x, y, r });

export function readWorld() {
  S.finds = readFinds(); S.byId = {}; S.finds.forEach(f => { S.byId[f.id] = f; });
  S.live = S.finds.filter(f => f.live);
  S.cards = readCards().filter(c => c.live);
  const ps = makeSheets(S.cards); S.sheets = ps.sheets; S.piles = ps.piles;
  loops.ad1 = makeLoop(S.byId.ad1.video); loops.ad1.on = true; startLoop(loops.ad1);      // moving at first paint
}

// everything with lettering on it, baked again (used when a font face arrives after boot)
export function rebakeLettering() {
  const name = document.querySelector('[data-name]').textContent.trim(), roles = document.querySelector('[data-roles]').textContent.trim(), ad = S.byId.ad1;
  spr.hub = art.hubSprite(name, roles);
  spr.phoneOver = art.phoneOverlay(135, 240, 13, { text: ad.lure, len: ad.len });
  S.cards.forEach(c => { if (c.sp) c.sp = art.cardSprite(c.word); });
  S.live.concat(S.byId.home).forEach(fd => { if (fd.tabSp) fd.tabSp = art.tabSprite(fd.tab, TRACK[fd.track].tape); });
}

// sprites needed for the first frame: hub, van, the three lures, the first pile (spec 9.4)
export function bakeFirst() {
  const name = document.querySelector('[data-name]').textContent.trim(), roles = document.querySelector('[data-roles]').textContent.trim();
  spr.hub = art.hubSprite(name, roles);
  spr.sheets = art.sheetSprites();
  spr.phone = art.giantPhone();
  const ad = S.byId.ad1;
  spr.phoneOver = art.phoneOverlay(135, 240, 13, { text: ad.lure, len: ad.len });
  spr.phoneOverBare = art.phoneOverlay(135, 240, 13, null);              // the same glass without the MY FIRST AD tape
  spr.play = art.playMark();
  const f = S.byId, sk = f.skit1;
  spr.skit = art.skitPhone(); spr.skitOver = art.phoneOverlay(84, 150, 10, null); spr.skitRim = art.phoneRim(84, 150, 10, PAL.pink);
  spr.pinkSteps = art.pinkSteps(sk.x, sk.y); spr.playTri = art.playTri(22, PAL.pinkTape); spr.warm = art.headlight();
  spr.loafPale = art.loafSprite(false); spr.lamp = art.lampSprite(); spr.pool = art.lampPool();
  spr.garage = art.garageSprite(); spr.bulb = art.bulbSteps();
  spr.gpencil = art.pencilSprite(0.4);                                   // lies on the desk past the tape (main.js draws it)
  spr.fdisc = art.flourDisc(); spr.fshad = art.flourShadow(); spr.steam = art.puffSprite('#FFFFFF'); spr.bit = art.bitSprite();
  vanFrame(48);                                                          // nose up

  // --- the first-ad phone on its two file boxes ---
  const L1 = loops.ad1;
  f.ad1.prop = prop({
    x: 0, y: -300, sp: spr.phone, sortY: -298, find: f.ad1, coll: cbox(-102, -374, 84, -298), tall: [-104, 86, -560],
    // while the full label is up it stands where the MY FIRST AD tape is, so that tape is left off: one gold banner on the phone, never two
    draw(ctx, p) { art.drawSpr(ctx, p.sp, p.x, p.y); grab(L1); drawScreen(ctx, L1, p.x - 67.5, p.y - 245, 135, 240); art.drawSpr(ctx, p.find.tabOn === false ? spr.phoneOverBare : spr.phoneOver, p.x, p.y); }
  });
  f.ad1.lab = { up: [0, -546], down: [0, -546], mid: true }; f.ad1.tabAt = [-66, -317, -0.09];      // the label is centred on the phone's top edge, where its tape was
  // --- the loaf on its rack, under the arm lamp ---
  f.bread.bake = 0;
  f.bread.prop = prop({
    x: -228, y: 35, sp: spr.loafPale, sp2: spr.lamp, sortY: 78, find: f.bread, coll: cbox(-293, -7, -163, 77),
    bb: [-70, -148, 68, 45],                                             // the loaf and the lamp over it, for culling
    draw(ctx, p) {
      const b = p.find.bake, pop = b > 0 && b < 1 ? Math.sin(b * Math.PI) * 0.06 : 0;
      if (pop) { ctx.save(); ctx.translate(p.x, p.y + 40); ctx.scale(1 + pop, 1 + pop * 1.4); ctx.translate(-p.x, -p.y - 40); }
      if (b < 1) art.drawSpr(ctx, spr.loafPale, p.x, p.y);
      if (b > 0 && spr.loafGold) { const a = ctx.globalAlpha; ctx.globalAlpha = a * ease(b * 1.15); art.drawSpr(ctx, spr.loafGold, p.x, p.y); ctx.globalAlpha = a; }
      if (pop) ctx.restore();
      art.drawSpr(ctx, spr.lamp, p.x, p.y);                              // the lamp does not swell with the bread
    }
  });
  f.bread.lab = { up: [-228, -130], down: [-228, 88] }; f.bread.tabAt = [-262, 79, 0.07];      // up = clear above the lamp, never across its shade
  // --- the first skit phone, the only light on the dark mat ---
  const L2 = loops.skit1 = makeLoop(sk.video), kx = sk.x, ky = sk.y;
  sk.prop = prop({
    x: kx, y: ky, sp: spr.skit, sortY: ky + 1, find: sk, onMat: true, coll: cbox(kx - 47, ky - 18, kx + 47, ky + 1), tall: [kx - 49, kx + 49, ky - 165],
    draw(ctx, p) {
      const a = ctx.globalAlpha, sx = p.x - 42, sy = p.y - 155;
      art.drawSpr(ctx, p.sp, p.x, p.y);
      if (p.find.found) {
        art.drawSpr(ctx, spr.skitRim, p.x, p.y);
        grab(L2); drawScreen(ctx, L2, sx, sy, 84, 150);
      } else {                                              // asleep: dark glass, its picture barely there, a pink play mark, a hard rim that breathes
        const pulse = 0.75 + 0.25 * Math.sin(S.rt * 2.4);
        if (L2.img.complete && L2.img.naturalWidth) { ctx.globalAlpha = a * 0.28; ctx.drawImage(L2.img, sx, sy, 84, 150); }
        ctx.globalAlpha = a * pulse; art.drawSpr(ctx, spr.skitRim, p.x, p.y); art.drawSpr(ctx, spr.playTri, p.x + 1.5, p.y - 80);
        ctx.globalAlpha = a;
      }
      art.drawSpr(ctx, spr.skitOver, p.x, p.y);
    }
  });
  sk.lab = { up: [kx, ky - 168], down: [kx, ky + 46] }; sk.tabAt = [kx - 25, ky - 8, -0.08];
  // --- home: live in a later stage. Until then a bump gets a hello and a way to the contact links; it is not counted ---
  // The collider reaches north to where the roof's back edge is drawn, so a van coming down the strip stops nose-on
  // against the roof it can see and is never behind the box: the garage stays solid at the moment it says hello.
  const hm = f.home;
  hm.prop = prop({
    x: 0, y: 400, sp: spr.garage, sortY: 446, say: hm, coll: cbox(-60, 282, 60, 445),
    draw(ctx, p) {
      art.drawSpr(ctx, p.sp, p.x, p.y);
      const a = ctx.globalAlpha, warm = Math.max(0, 1 - (S.rt - (hm.saidAt || -9)) / 1.2);          // the bulb warms when the van says hello
      ctx.globalAlpha = a * Math.min(1, 0.7 + 0.2 * Math.sin(S.rt * 1.7) + warm * 0.6); art.drawSpr(ctx, spr.bulb, p.x, p.y + 9); ctx.globalAlpha = a;
    }
  });
  hm.lab = { up: [0, 288], down: [0, 464] }; hm.tabAt = [-34, 387, -0.05];
}

// light lying on the ground, drawn under every prop: the lamp pool over the flour, the skit phone's pink on the mat
export function drawGround(ctx) {
  art.drawSpr(ctx, spr.pool, -228, 35);
  const s = S.byId.skit1;
  if (!s.found) ctx.globalAlpha = 0.72 + 0.28 * Math.sin(S.rt * 2.4);
  art.drawSpr(ctx, spr.pinkSteps, s.x, s.y); ctx.globalAlpha = 1;
}

// everything else, baked in idle slices after the first frame. Returns a list of small jobs.
export function bakeJobs() {
  const f = S.byId, jobs = [];
  jobs.push(() => { spr.loafGold = art.loafSprite(true); });
  jobs.push(() => {
    // The sack turns see-through whenever the van is anywhere behind it, near the cake, or while the dome is lifting,
    // so the cake is never found without being seen. Until then the dome's knob glints over the top of the sack: the tell.
    spr.sack = art.sackSprite();
    const ck = f.cake;
    prop({
      x: -420, y: 60, sp: spr.sack, sortY: 96, coll: cbox(-476, 24, -364, 96), tall: [-500, -340, -112],
      fade: (vx, vy) => (vx > -500 && vx < -340 && vy > -112 && vy < 25) || (!ck.found && Math.hypot(vx + 420, vy + 10) < 70) || (ck.found && S.rt - ck.foundAt < 1),
      draw(ctx, p) {
        art.drawSpr(ctx, p.sp, p.x, p.y);
        if (ck.found) return;
        const u = (S.rt * 0.42) % 1, k = u < 0.2 ? Math.sin(u / 0.2 * Math.PI) : 0;
        if (k > 0) {
          const x = -416.5, y = -48.5, s = 7.5 * k, t = 1.5 * k;
          ctx.fillStyle = '#FFFFFF'; ctx.beginPath();
          ctx.moveTo(x, y - s); ctx.lineTo(x + t, y - t); ctx.lineTo(x + s, y); ctx.lineTo(x + t, y + t); ctx.lineTo(x, y + s); ctx.lineTo(x - t, y + t); ctx.lineTo(x - s, y); ctx.lineTo(x - t, y - t);
          ctx.closePath(); ctx.fill();
        }
      }
    });
  });
  jobs.push(() => {
    spr.cake = art.cakeSprite(false); spr.cakeCut = art.cakeSprite(true); spr.slice = art.sliceSprite(); spr.dome = art.domeSprite();
    const ck = f.cake; ck.lift = 0; ck.from = [ck.x, ck.y]; ck.to = [-512, -4];
    ck.prop = prop({
      x: ck.x, y: ck.y, sp: spr.cake, sortY: ck.y + 27, find: ck, coll: ccirc(ck.x, ck.y, 26),
      draw(ctx, p) {
        // once found, 1.5 s: the dome lifts (0.3 s), plate and cake slide out from behind the sack (0.4 s), then the slice slides out
        const t = p.find.lift, a = ctx.globalAlpha, cut = t > 0.5;
        art.drawSpr(ctx, cut ? spr.cakeCut : spr.cake, p.x, p.y);
        if (cut) { const s = ease((t - 0.5) / 0.3); art.drawSpr(ctx, spr.slice, p.x + 15 * s, p.y + 22 * s + 4.2); }
        if (t < 0.5) { const u = ease(t / 0.2); ctx.globalAlpha = a * (1 - ease((t - 0.1) / 0.3)); art.drawSpr(ctx, spr.dome, p.x, p.y - u * 46); ctx.globalAlpha = a; }
      }
    });
    ck.lab = { up: [ck.x, ck.y - 74], flip: true, min: 3 }; ck.lab.down = ck.lab.up; ck.tabAt = [ck.x, ck.y + 33, 0.05];      // min: the cake slides away from the van, so its label holds a little longer
  });
  jobs.push(() => {
    spr.cardBack = art.cardBack();
    S.cards.forEach(c => {
      c.sp = art.cardSprite(c.word); c.flip = 0;
      prop({
        x: c.x, y: c.y, flat: true, sp: c.sp, card: c,
        draw(ctx, p) {
          const t = c.flip, k = t <= 0 ? 1 : t >= 1 ? 1 : Math.abs(Math.cos(t * Math.PI)), hop = t > 0 && t < 1 ? Math.sin(t * Math.PI) * 12 : 0;
          const s = t >= 1 && c.pop > 0 ? 1 + c.pop * 0.25 : 1;
          ctx.save(); ctx.translate(p.x, p.y - hop); ctx.rotate(c.rot || 0); ctx.scale(s, Math.max(0.04, k) * s); art.drawShadow(ctx, c.sp, hop * 0.6, hop * 0.4); art.drawSpr(ctx, t < 0.5 ? spr.cardBack : c.sp, 0, 0); ctx.restore();
        }
      });
      c.rot = ((c.x * 7 + c.y * 3) % 17 - 8) / 100;
    });
  });
  jobs.push(() => {                                         // dressing on the desk and the block
    // tape rolls are dulled until their track has a find: full tape colour always means "found"
    const roll = (x, y, color, tr) => {
      const on = art.tapeRoll(color), off = art.tapeRoll(color, true);
      prop({ x, y, sp: on, sortY: y + 13, coll: ccirc(x, y, 12), draw(ctx, p) { art.drawSpr(ctx, S.tracks[tr] ? on : off, p.x, p.y); } });
    };
    roll(172, -168, PAL.gold, 'w'); roll(-168, 232, PAL.blueTape, 'k');
    prop({ x: -196, y: -150, flat: true, sp: art.pencilSprite(0.5) });
    prop({ x: 318, y: -338, flat: true, sp: art.pencilSprite(-1.1) });
    prop({ x: -318, y: 176, flat: true, sp: art.scraperSprite(-0.35) });
    prop({ x: -205, y: 118, flat: true, sp: art.crumbs() });
  });
  jobs.push(() => {                                         // dressing on the mat: dark until the headlights cross it
    const m = (x, y, sp, o) => prop({ x, y, flat: true, onMat: true, sp, dark: art.darkTwin(sp), ...o });
    m(332, 196, art.clapperSprite(0.3)); m(256, 146, art.sdCard(0.4)); m(270, 158, art.sdCard(-0.9)); m(430, 70, art.cableSprite());
    spr.rollP = art.tapeRoll(PAL.pinkTape);
    rollPink = m(318, -52, S.tracks.v ? spr.rollP : art.tapeRoll(PAL.pinkTape, true), { coll: ccirc(318, -52, 12) });
  });
  jobs.push(() => {                                         // one-word tabs that stay on found things
    S.live.concat(f.home).forEach(fd => { fd.tabSp = art.tabSprite(fd.tab, TRACK[fd.track].tape); });
  });
  return jobs;
}
let rollPink = null;

// which prop is under a tap (world coordinates), topmost first
export function propAt(wx, wy) {
  let best = null;
  for (const p of S.props) {
    if (!p.coll) continue;
    const b = p.sp.bb;
    if (wx >= p.x + b[0] && wx <= p.x + b[2] && wy >= p.y + b[1] && wy <= p.y + b[3] && (!best || p.sortY > best.sortY)) best = p;
  }
  return best;
}
// a tap that lands beside an unfound thing (within r units of its collider) is meant for it
export function nearFind(wx, wy, r) {
  let best = null, bd = r;
  for (const f of S.live) {
    if (f.found || !f.prop || !f.prop.coll) continue;
    const d = collDist(f.prop.coll, wx, wy);
    if (d < bd) { bd = d; best = f.prop; }
  }
  return best;
}
// a found video whose screen is under the tap: tapping the screen itself plays it (spec 6.3)
export function screenAt(wx, wy) {
  for (const f of S.live) {
    if (!f.found || !f.video || !f.prop) continue;
    const p = f.prop, w = f.id === 'ad1' ? 67.5 : 42, h = f.id === 'ad1' ? 245 : 155;
    if (wx >= p.x - w && wx <= p.x + w && wy >= p.y - h && wy <= p.y - 5) return f;
  }
  return null;
}

// ---------- bump = find ----------
export function bump(c, impact) {
  const p = c.prop; if (!p) return;
  p.squash = 1;
  const nx = van.x + Math.cos(van.a) * 20, ny = van.y + Math.sin(van.a) * 20;
  if (p.find && p.find.live) { if (!p.find.found) wake(p.find); else again(p.find); }
  else if (p.say) hello(p.say);
  else if (impact > 120 && p.x < -110 && p.y > -110) burst(0, nx, ny, 4, 150, 0.45, 3.4);   // on the block a bump shakes flour loose
}
export function arrived(p) {
  if (!p) return;
  if (p.find && p.find.live && !p.find.found) { p.squash = 1; wake(p.find); }
  else if (p.say && S.rt - (p.say.saidAt || -9) > 1) { p.squash = 1; hello(p.say); }
}
function again(f) { if (f.video) ui.pill(f); ui.addLabel(f, van); }
// a thing that is not live yet (home): its tape and a pill to the contact links, a note, nothing counted
function hello(f) {
  if (S.rt - (f.saidAt || -9) > 1.5) { audio.slap(); audio.findNote(S.found.length, f.track); }
  f.saidAt = S.rt; ui.addLabel(f, van); if (f.go) ui.pill(f);
}

export function wake(f) {
  if (!f || f.found || !f.live) return;
  f.found = true; f.foundAt = S.rt; S.found.push(f.id); S.tracks[f.track]++;
  const first = S.found.length === 1, p = f.prop;
  if (first && !S.reduced) S.slow = 0.5;                       // slow motion on the very first find only
  audio.findNote(S.found.length - 1, f.track); audio.slap();
  ui.setCount(S.found.length); ui.lampOn(f.track); ui.addLabel(f, van);
  if (f.video) ui.pill(f); else ui.pillYield(van);             // a pill left over from an earlier find, far behind, steps aside
  try { if (S.firstInput && navigator.vibrate && /Android/i.test(navigator.userAgent)) navigator.vibrate(10); } catch (e) { /* not allowed */ }
  if (f.id === 'ad1') {
    vanState.gold = true; vanState.ladder = true;
    burst(2, p.x, p.y - 12, 26, 330, 1.1, 5); burst(3, van.x, van.y - 8, 10, 150, 0.7, 5);
  } else if (f.id === 'bread') {
    f.bake = 0.0001; vanState.loaf = true;
    for (let i = 0; i < 24; i++) {                               // flour jumps off the rack all round: 24 small discs, not a pile of coins
      const a = i / 24 * 6.283 + Math.random() * 0.26, v = 90 + Math.random() * 170, cs = Math.cos(a), sn = Math.sin(a);
      emit(0, p.x + cs * 58, p.y + 6 + sn * 36, cs * v, sn * v * 0.8, 0.5 + Math.random() * 0.3, 2 + Math.random() * 3);
    }
  } else if (f.id === 'cake') {
    f.lift = 0.0001; f.to = van.x < p.x - 14 ? [-334, -4] : [-512, -4];            // it slides out on the side away from the van
    burst(3, p.x, p.y - 30, 8, 90, 0.6, 4);
  } else if (f.id === 'skit1') {
    vanState.cam = true; loops.skit1.on = true; startLoop(loops.skit1); lit.push([p.x, p.y, 110]);
  }
  if (f.track === 'v' && rollPink) rollPink.sp = spr.rollP;
  if (!S.threeDone && !three.on && !three.hold && S.tracks.w && S.tracks.k && S.tracks.v) three.hold = 0.9;
}

// ---------- per-frame updates (dt = game time, rdt = real time) ----------
export function update(dt, rdt) {
  for (const p of S.props) if (p.squash > 0) p.squash = Math.max(0, p.squash - rdt / 0.09);
  const b = S.byId.bread;
  if (b.bake > 0 && b.bake < 1) {
    b.bake = Math.min(1, b.bake + dt / 1.2);
    if (Math.random() < dt * 22) emit(1, b.x + (Math.random() - 0.5) * 70, b.y - 30, (Math.random() - 0.5) * 16, -40 - Math.random() * 30, 1.3, 9 + Math.random() * 5);
  } else if (b.bake >= 1 && S.t - b.foundAt < 9 && Math.random() < dt * 5) emit(1, b.x + (Math.random() - 0.5) * 60, b.y - 34, (Math.random() - 0.5) * 10, -30, 1.5, 8);
  const c = S.byId.cake;
  if (c.lift > 0 && c.lift < 1) {
    c.lift = Math.min(1, c.lift + dt / 1.5);
    const u = (c.lift - 0.2) / 0.27, e = u <= 0 ? 0 : u >= 1 ? 1 : 1 - Math.pow(1 - u, 3), p = c.prop;      // ease-out
    const x = c.from[0] + (c.to[0] - c.from[0]) * e, y = c.from[1] + (c.to[1] - c.from[1]) * e;
    p.x = p.cx = p.coll.x = c.x = x; p.y = p.cy = p.coll.y = c.y = y; p.sortY = y + 27;
    c.tabAt[0] = x; c.tabAt[1] = y + 33;
    c.lab.up[0] = x + (c.to[0] < c.from[0] ? -62 : 62) * e; c.lab.up[1] = y - 74;      // the label leans away from the van, which is still beside the sack
  }
  // card piles: when 70% of the sheets have moved 60 units, the card under them flips up
  for (const pile of S.piles) {
    if (pile.done) continue;
    if (pile.moved >= pile.n * 0.7) {
      pile.done = true;
      if (pile.card && pile.card.sp) { pile.card.flip = 0.0001; audio.ding(); burst(3, pile.x, pile.y, 9, 120, 0.6, 4); }
      else if (pile.card) pile.done = false;                    // its sprite is not baked yet: next frame
    }
  }
  for (const cd of S.cards) {
    if (cd.flip > 0 && cd.flip < 1) { cd.flip = Math.min(1, cd.flip + dt / 0.3); if (cd.flip >= 1) cd.pop = 1; }
    else if (cd.pop > 0) cd.pop = Math.max(0, cd.pop - dt / 0.25);
  }
  // The three-track moment starts 0.9 s after the find that completes the three, so that find is seen first. If the van is
  // being driven on meanwhile it starts within 0.35 s instead: the van is then held close to the thing it has just found.
  if (three.hold > 0 && !ui.playerOpen()) {
    if (three.hold > 0.35 && (input.mag > 0 || input.keys.size || auto.on)) three.hold = 0.35;
    three.hold -= rdt; if (three.hold <= 0) { three.hold = 0; startThree(); }
  }
  if (three.on) tickThree(rdt);
  tourTick();
}

// ---------- the three-track moment (spec 7.3): once ----------
// The camera is up for 2.2 s. The four strips land in the empty band above the model a quarter second apart, the last
// at 0.9 s, stay up together for 1.1 s, and start to go 0.2 s before the camera starts back down, so they never sit
// across the table again. The Play pill tucks away meanwhile.
function startThree() {
  S.threeDone = true; Object.assign(three, { on: true, t: 0, lift: !S.reduced, n: 0, ended: false, bye: false });
  stopAuto(); ui.threeShow(S.live.length - S.found.length); ui.pillTuck(true);
}
function tickThree(rdt) {
  three.t += rdt;
  const marks = [0.15, 0.4, 0.65, 0.9];
  while (three.n < 4 && three.t >= marks[three.n]) {
    if (three.n < 3) { audio.trackNote(three.n); audio.slap(); } else audio.chord();
    ui.threeStep(three.n); three.n++;
  }
  if (!three.bye && three.t >= (three.ended ? three.endAt + 0.9 : S.reduced ? 4.2 : 2.0)) { three.bye = true; ui.threeBye(); }
  if (three.lift && three.t >= 2.2) { three.lift = false; ui.pillTuck(false); }
  if (three.t >= (three.ended ? three.endAt + 1.3 : S.reduced ? 4.6 : 3.2)) { three.on = false; ui.pillTuck(false); }
}
// Any touch after the first 0.8 s ends it early. 0 = not for the moment · 1 = swallowed (too early) · 2 = it ended the moment
export function threeTouch() {
  if (!three.on || three.ended || !three.lift) return 0;
  if (three.t < 0.8) return 1;
  three.ended = true; three.endAt = three.t; three.lift = false;
  while (three.n < 4) { ui.threeStep(three.n); three.n++; }
  ui.pillTuck(false);
  return 2;
}

// ---------- idle tour: no input, so the van shows the way (spec 2) ----------
const tour = { on: false, step: 0, over: false };
const drive = id => { const f = S.byId[id], p = f.prop; goTo(p.cx, p.cy, { prop: p, speed: 200, idle: true, done: () => arrived(p) }); };
export function tourStart() { if (tour.on || tour.over || S.firstInput) return; tour.on = true; tour.step = 0; van.lights = true; drive('ad1'); }
export function tourStop() { tour.over = true; if (!tour.on) return; tour.on = false; if (auto.idle) stopAuto(); }
function tourTick() {
  if (!tour.on || ui.playerOpen()) return;
  const f = S.byId;
  if (tour.step === 0 && f.ad1.found && S.rt >= 7) { tour.step = 1; drive('bread'); }
  else if (tour.step === 1 && f.bread.found && !auto.on) { tour.step = 2; drive('skit1'); }
  else if (tour.step === 2 && f.skit1.found && S.threeDone && !three.on && !auto.on) { tour.step = 3; goTo(0, 20, { speed: 200, idle: true, done: () => { tour.on = false; tour.over = true; } }); }
}
