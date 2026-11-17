// finds.js — the hub's props and colliders, find rules, wake animations, the three-track moment and the idle tour.
// The far desk (stage 2) lives in desk.js, the rest of the mat and the woods (stage 3) in mat.js; the prop registry,
// the sprite shelf and the looping screens are in kit.js.
import { S, PAL, TRACK, HUB_R, readFinds, readCards, makeSheets, collDist } from './world.js';
import * as art from './art.js';
import { van, auto, input, goTo, stopAuto, R } from './van.js';
import { emit, burst } from './surfaces.js';
import { spr, flats, lit, loops, prop, cbox, ccirc, squash, tickSquash, makeLoop, startLoop, addScreen, grab, drawScreen, tickScreens, pauseLoops, resumeLoops, skitRim, playSmall, glass, steps } from './kit.js';
import * as desk from './desk.js';
import * as mat from './mat.js';
import * as ui from './ui.js';
import * as audio from './audio.js';

export { spr, flats, lit, loops, pauseLoops, resumeLoops };
export const matLines = mat.drawLines;
export const three = { on: false, t: 0, lift: false, n: 0, hold: 0 };
const vanState = { lights: false, gold: false, ladder: false, loaf: false, cam: false };
let vanKey = '', frames = null, vanUse = null, vanN = 0;
const VAN_KEEP = 30;                         // of the 64 headings, at most this many are held (spec 9.6): the one unused longest goes first

const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
const inView = (x0, y0, x1, y1) => { const v = S.vr; return x1 > v[0] && x0 < v[2] && y1 > v[1] && y0 < v[3]; };

// ---------- van sprite sets ----------
const letGo = q => { q.c.width = q.c.height = 0; if (q.s) q.s.width = q.s.height = 0; };
export function vanFrame(i) {
  const key = (van.lights ? 'L' : 'l') + (vanState.gold ? 'G' : 'g') + (vanState.ladder ? 'A' : 'a') + (vanState.loaf ? 'B' : 'b') + (vanState.cam ? 'C' : 'c');
  if (key !== vanKey) { vanKey = key; if (frames) for (const q of frames) if (q) letGo(q); frames = new Array(64); vanUse = new Float64Array(64); vanN = 0; }   // the old set is dropped
  let q = frames[i];
  if (!q) {
    if (vanN >= VAN_KEEP) { let o = -1, t = 1e18; for (let j = 0; j < 64; j++) if (frames[j] && vanUse[j] < t) { t = vanUse[j]; o = j; } letGo(frames[o]); frames[o] = null; vanN--; }
    q = frames[i] = art.vanSprite(i / 64 * Math.PI * 2, { ...vanState, lights: van.lights }); vanN++;
  }
  vanUse[i] = S.rt;
  return q;
}

export function vanCanvases() { const out = []; if (frames) for (const f of frames) if (f) out.push(f.c, f.s); return out; }      // for the debug memory count
export function extraCanvases() { return [desk.canvases(), mat.canvases(), art.keptCanvases()]; }      // canvases held outside the prop lists

// ---------- building the stage ----------
export function readWorld() {
  S.finds = readFinds(); S.byId = {}; S.finds.forEach(f => { S.byId[f.id] = f; });
  S.live = S.finds.filter(f => f.live);
  S.cards = readCards().filter(c => c.live);
  const ps = makeSheets(S.cards); S.sheets = ps.sheets; S.piles = ps.piles;
  desk.init(wake); mat.init();
  const ad = S.byId.ad1; ad.scr = [-67.5, -545, 67.5, -305];
  const L = addScreen('ad1', makeLoop(ad.video), ad, ad.scr); L.on = true; startLoop(L);      // moving at first paint
}

// everything with lettering on it, baked again (used when a font face arrives after boot)
export function rebakeLettering() {
  const name = document.querySelector('[data-name]').textContent.trim(), roles = document.querySelector('[data-roles]').textContent.trim(), ad = S.byId.ad1;
  art.retire(spr.hub); spr.hub = art.keep(() => art.hubSprite(name, roles), 0, 0);
  art.retire(spr.adTape); spr.adTape = art.keep(() => art.phoneTape({ text: ad.lure, len: ad.len }), 1, -546);
  desk.rebakeLettering(); mat.rebakeLettering();
  S.live.concat(S.byId.home).forEach(fd => { if (fd.tabSp) fd.tabSp = art.tabSprite(fd.tab, TRACK[fd.track].tape); });
}

// sprites needed for the first frame: hub, van, the three lures, the first pile (spec 9.4)
export function bakeFirst() {
  const name = document.querySelector('[data-name]').textContent.trim(), roles = document.querySelector('[data-roles]').textContent.trim();
  // (the big ones are kept only while the van is near them: art.keep)
  spr.hub = art.keep(() => art.hubSprite(name, roles), 0, 0);
  spr.sheets = art.sheetSprites();
  spr.phone = art.keep(() => art.giantPhone(), 0, -300);
  const ad = S.byId.ad1;
  spr.adTape = art.keep(() => art.phoneTape({ text: ad.lure, len: ad.len }), 1, -546);      // the MY FIRST AD tape across its top
  spr.play = art.playMark();
  const f = S.byId, sk = f.skit1;
  spr.skit = art.keep(() => art.skitPhone(), 150, -200, 650, 60);      // one sprite for the three skit phones along the mouth of the mat
  spr.pinkSteps = art.keep(() => art.pinkSteps(sk.x, sk.y), sk.x, sk.y);      // its pink on the mat, cut clear of the hub
  spr.playTri = art.playTri(22, PAL.pinkTape); spr.warm = art.headlight();
  spr.loafPale = art.keep(() => art.loafSprite(false), -228, 35); spr.lamp = art.keep(() => art.lampSprite(), -228, 35);
  spr.garage = art.keep(() => art.garageSprite(), 0, 400); spr.bulb = art.bulbSteps();
  desk.bakeFirst();
  spr.fdisc = art.flourDisc(); spr.fshad = art.flourShadow(); spr.steam = art.puffSprite('#FFFFFF'); spr.bit = art.bitSprite();
  vanFrame(48);                                                          // nose up

  // --- the first-ad phone on its two file boxes ---
  const L1 = loops.ad1;
  f.ad1.prop = prop({
    x: 0, y: -300, sp: spr.phone, sortY: -298, find: f.ad1, coll: cbox(-102, -374, 84, -298), tall: [-104, 86, -560],
    // while the full label is up it stands where the MY FIRST AD tape is, so that tape is left off: one gold banner on the phone, never two
    draw(ctx, p) { art.drawSpr(ctx, p.sp, p.x, p.y); grab(L1); drawScreen(ctx, L1, p.x - 67.5, p.y - 245, 135, 240); glass(ctx, p.x, p.y, 135, 240, 13); if (p.find.tabOn !== false) art.drawSpr(ctx, spr.adTape, p.x + 1, p.y - 246); }
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
  const kx = sk.x, ky = sk.y;
  sk.scr = [kx - 42, ky - 155, kx + 42, ky - 5];
  const L2 = addScreen('skit1', makeLoop(sk.video, false, 168, 300), sk, sk.scr, () => sk.found);      // asleep it shows its poster, barely; it moves once woken
  sk.prop = prop({
    x: kx, y: ky, sp: spr.skit, sortY: ky + 1, find: sk, onMat: true, coll: cbox(kx - 47, ky - 18, kx + 47, ky + 1), tall: [kx - 49, kx + 49, ky - 165],
    draw(ctx, p) {
      const a = ctx.globalAlpha, sx = p.x - 42, sy = p.y - 155;
      art.drawSpr(ctx, p.sp, p.x, p.y);
      if (p.find.found) {
        skitRim(ctx, p.x, p.y, 2.2);
        grab(L2); drawScreen(ctx, L2, sx, sy, 84, 150);
      } else {                                              // asleep: dark glass, its picture barely there, a pink play mark, a hard rim that breathes
        const pulse = 0.75 + 0.25 * Math.sin(S.rt * 2.4);
        if (L2.img.complete && L2.img.naturalWidth) { ctx.globalAlpha = a * 0.28; ctx.drawImage(L2.img, sx, sy, 84, 150); }
        ctx.globalAlpha = a * pulse; skitRim(ctx, p.x, p.y, 2.2); art.drawSpr(ctx, spr.playTri, p.x + 1.5, p.y - 80);
        ctx.globalAlpha = a;
      }
      glass(ctx, p.x, p.y, 84, 150, 10);
      if (p.find.found) playSmall(ctx, p.x, p.y - 24);
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
  if (inView(-330, -30, -90, 140)) steps(ctx, -228, 35, PAL.lamp, [20, 20, 115, 75, 0.22], [12, 16, 55, 35, 0.18]);      // the loaf's lamp: two hard-edged steps
  const s = S.byId.skit1;
  if (inView(s.x - 82, s.y - 54, s.x + 82, s.y + 54)) {
    if (!s.found) ctx.globalAlpha = 0.72 + 0.28 * Math.sin(S.rt * 2.4);
    art.drawSpr(ctx, spr.pinkSteps, s.x, s.y); ctx.globalAlpha = 1;
  }
  mat.drawGround(ctx);
}

// Tape dashes on the hub (spec 7.2): after a major find, eight light up one after another toward the nearest major of
// a track that has nothing found yet. They keep clear of the routed name, the roles and the four arrows.
const MAJOR = { w: 'ad1', k: 'bread', v: 'skit1' };
const dash = { tr: null, t: 0, ux: 0, uy: 0, o: null };
// The nearest thing still to find, and whether any of them is in sight. A thing: every live find not found yet but the
// app (that one is found by its cards), and every card pile not ploughed yet. vis(x, y): is that spot on the screen?
// In sight = on the screen and near enough to be made out: the cake shows only from beside the sack, the printer from
// behind its boxes, and a thing on the dark mat from about a headlight's reach (the first skit phone and the camp's ember glow).
export function seek(vis) {
  let best = null, bd = 1e9, seen = false;
  const one = (x, y, tr, o, see) => { const d = Math.hypot(x - van.x, y - van.y); if (d < bd) { bd = d; best = { x, y, tr, o }; } if (!seen && d < see && vis(x, y)) seen = true; };
  for (const f of S.live) { if (f.found || f.id === 'app') continue; one(f.x, f.y - 30, f.track, f, f.id === 'cake' ? 150 : f.id === 'ai' ? 220 : f.x > 110 && f.id !== 'skit1' && f.id !== 'camp' ? 330 : 1e9); }
  for (const p of S.piles) if (p.card && !p.done) one(p.x, p.y, 'w', p, 1e9);
  return { best, seen };
}
// any: no track is empty any more, so the dashes point at the nearest thing still to find, in its own track's colour
function pointOn(any) {
  let m = null, tr = null, o = null, bd = 1e9;
  for (const t of ['w', 'k', 'v']) { if (S.tracks[t]) continue; const q = S.byId[MAJOR[t]], d = Math.hypot(q.x - van.x, q.y - van.y); if (d < bd) { bd = d; m = q; tr = t; } }
  if (!m && any) { const b = seek(() => false).best; if (b) { m = b; tr = b.tr; o = b.o; } }
  if (!m) { dash.tr = null; return; }
  const l = Math.hypot(m.x, m.y - 20) || 1;
  dash.tr = tr; dash.o = o; dash.t = 0; dash.ux = m.x / l; dash.uy = (m.y - 20) / l;
}
export function drawDashes(ctx) {
  if (!dash.tr) return;
  if ((dash.o ? dash.o.found || dash.o.done : S.tracks[dash.tr]) || dash.t > 9) { dash.tr = null; return; }
  if (!inView(-HUB_R, -HUB_R, HUB_R, HUB_R)) return;
  const col = TRACK[dash.tr].strong, a = Math.atan2(dash.uy, dash.ux), fade = dash.t > 8 ? 9 - dash.t : 1;
  for (let i = 0; i < 8; i++) {
    const r = 42 + i * 14, x = dash.ux * r, y = 20 + dash.uy * r, on = dash.t - 0.25 - i * 0.12;
    if (on <= 0 || x * x + y * y > 150 * 150) continue;
    if ((Math.abs(x) < 134 && y > -86 && y < -14) || (Math.abs(x) < 128 && y > 64 && y < 94)) continue;      // the name, the roles
    if (Math.abs(Math.abs(x) - 126) < 20 && Math.abs(y) < 22 || Math.abs(Math.abs(y) - 126) < 22 && Math.abs(x) < 20) continue;   // an arrow
    const k = on < 0.14 ? 1 + (0.14 - on) * 4 : 1;
    ctx.save(); ctx.translate(x, y - 4.8); ctx.rotate(a); ctx.scale(k, k); ctx.globalAlpha = fade;
    ctx.fillStyle = 'rgba(20,17,15,.3)'; ctx.fillRect(-4.2, -1.2, 10, 4.6);
    ctx.fillStyle = col; ctx.fillRect(-5, -2.3, 10, 4.6); ctx.strokeStyle = 'rgba(20,17,15,.6)'; ctx.lineWidth = 0.9; ctx.strokeRect(-5, -2.3, 10, 4.6);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// everything else, baked in idle slices after the first frame. Returns a list of small jobs, nearest first.
export function bakeJobs() {
  const f = S.byId, jobs = [];
  jobs.push(() => { spr.loafGold = art.keep(() => art.loafSprite(true), -228, 35); });
  jobs.push(() => {
    // The sack turns see-through whenever the van is anywhere behind it, near the cake, or while the dome is lifting,
    // so the cake is never found without being seen. Until then the dome's knob glints over the top of the sack: the tell.
    spr.sack = art.keep(() => art.sackSprite(), -420, 60);
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
      x: ck.x, y: ck.y, sp: spr.cake, sortY: ck.y + 27, find: ck, coll: ccirc(ck.x, ck.y, 26), roam: true,
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
  jobs.push(desk.cardsJob);                                 // the nine gold cards: the three near ones are ploughed within seconds
  jobs.push(() => {                                         // dressing on the near desk and the block
    // tape rolls are dulled until their track has a find: full tape colour always means "found"
    const roll = (x, y, color, tr) => {
      const on = art.tapeRoll(color), off = art.tapeRoll(color, true);
      prop({ x, y, sp: on, sortY: y + 13, coll: ccirc(x, y, 12), draw(ctx, p) { art.drawSpr(ctx, S.tracks[tr] ? on : off, p.x, p.y); } });
    };
    roll(172, -168, PAL.gold, 'w'); roll(-168, 232, PAL.blueTape, 'k');
    prop({ x: -196, y: -150, flat: true, sp: art.pencilSprite(0.5) });
    prop({ x: 318, y: -338, flat: true, sp: art.pencilSprite(-1.1) });
    prop({ x: -318, y: 176, flat: true, sp: art.keep(() => art.scraperSprite(-0.35), -318, 176) });
    prop({ x: -205, y: 118, flat: true, sp: art.keep(() => art.crumbs(), -205, 118) });
  });
  jobs.push(() => {                                         // dressing on the mat: dark until the headlights cross it
    const m = (x, y, sp, o) => prop({ x, y, flat: true, onMat: true, sp, dark: art.darkTwin(sp), ...o });
    m(332, 196, art.clapperSprite(0.3)); m(256, 146, art.sdCard(0.4)); m(270, 158, art.sdCard(-0.9)); m(430, 70, art.cableSprite());
    spr.rollP = art.tapeRoll(PAL.pinkTape);
    rollPink = m(318, -52, S.tracks.v ? spr.rollP : art.tapeRoll(PAL.pinkTape, true), { coll: ccirc(318, -52, 12) });
  });
  jobs.push(...mat.jobsNear());                             // the two skit phones and the chair: a van heading east is at them in two seconds
  jobs.push(...desk.jobs());                                // the far desk
  jobs.push(...mat.jobs());                                 // the rest of the mat, and the woods
  jobs.push(() => {                                         // one-word tabs that stay on found things
    S.live.concat(f.home).forEach(fd => { fd.tabSp = art.tabSprite(fd.tab, TRACK[fd.track].tape); });
  });
  return jobs;
}
let rollPink = null;

// which prop is under a tap (world coordinates), topmost first
export function propAt(wx, wy) {
  let best = null, hid = null;
  for (const p of S.props) {
    if (!p.coll || p.coll.off) continue;
    const b = p.bb || p.sp.bb;
    if (wx < p.x + b[0] || wx > p.x + b[2] || wy < p.y + b[1] || wy > p.y + b[3]) continue;
    if (!best || p.sortY > best.sortY) best = p;
    if (p.find && p.find.live && !p.find.found && (!hid || p.sortY > hid.sortY)) hid = p;      // something not found yet stands there, perhaps behind the thing in front
  }
  return hid || best;
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
    const r = f.scr; if (!f.found || !(f.video || f.yt) || !r) continue;
    if (wx >= r[0] && wx <= r[2] && wy >= r[1] && wy <= r[3]) return f;
  }
  return null;
}

// ---------- bump = find ----------
export function bump(c, impact) {
  const p = c.prop; if (!p) return;
  squash(p);
  const nx = van.x + Math.cos(van.a) * 20, ny = van.y + Math.sin(van.a) * 20, f = p.find;
  if (f && f.live) { if (f.found) again(f); else if (f.noBump) desk.nudge(f); else wake(f); }
  else if (p.say) hello(p.say);
  else if (impact > 120 && p.x < -110 && p.y > -110) burst(0, nx, ny, 4, 150, 0.45, 3.4);   // on the block a bump shakes flour loose
}
// The autopilot has reached p. Nothing counts unless the van is really at it (AC: found only by a bump).
export function arrived(p) {
  if (!p) return;
  if (p.coll && collDist(p.coll, van.x, van.y) > R + 6) return;
  const f = p.find;
  if (f && f.live && !f.found) { squash(p); if (f.noBump) desk.nudge(f); else wake(f); }
  else if (f && f.live && f.found) again(f);                // a found video: its Play pill comes up
  else if (p.say && S.rt - (p.say.saidAt || -9) > 1) { squash(p); hello(p.say); }
}
// Drive to a thing and bump it. A bedsheet is bumped from its front, where its picture is seen: the van lines up
// there first (f.front), unless it is already there.
export function goBump(p) {
  const f = p.find, fr = f && f.front, done = () => arrived(p);
  if (fr && Math.hypot(van.x - fr[0], van.y - fr[1]) > 46) goTo(fr[0], fr[1], { done: () => goTo(p.cx, p.cy, { prop: p, done }) });
  else goTo(p.cx, p.cy, { prop: p, done });
}
function again(f) { ui.pill(f); ui.addLabel(f, van); if (f.scr && (f.video || f.yt)) { framing.f = f; framing.at = S.rt; } }
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
  // (the app's moment begins with the whole desk on screen: its label is slapped on when the camera reaches the phone)
  const show = f.id === 'app' && !S.reduced && !three.on && !ui.playerOpen();
  ui.setCount(S.found.length); ui.lampOn(f.track); if (!show) ui.addLabel(f, van);
  if (f.video || f.yt) { ui.pill(f); if (f.scr) { framing.f = f; framing.at = S.rt; } } else ui.pillYield(van);             // a pill left over from an earlier find, far behind, steps aside
  // (only once the visitor has really touched the page: the idle tour and a deep link must not ask, the browser logs a blocked call)
  try { if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive && /Android/i.test(navigator.userAgent)) navigator.vibrate(10); } catch (e) { /* not allowed */ }
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
  } else if (!desk.onWake(f, show)) mat.onWake(f);
  if (show) startCine(f);
  if (MAJOR[f.track] === f.id) pointOn();
  if (f.track === 'v' && rollPink) rollPink.sp = spr.rollP;
  if (!S.threeDone && !three.on && !three.hold && S.tracks.w && S.tracks.k && S.tracks.v) three.hold = 0.9;
}

// ---------- per-frame updates (dt = game time, rdt = real time) ----------
export function update(dt, rdt) {
  tickSquash(rdt);
  tickScreens(rdt, van);
  const b = S.byId.bread;
  if (b.bake > 0 && b.bake < 1) {
    b.bake = Math.min(1, b.bake + dt / 1.2);
    if (b.bake >= 1 && spr.loafGold && b.prop) { b.prop.sp = spr.loafGold; art.retire(spr.loafPale, true); }      // baked: the pale loaf is not needed again
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
  desk.update(dt, rdt); mat.update(dt, rdt);
  // The three-track moment starts 0.9 s after the find that completes the three, so that find is seen first. If the van is
  // being driven on meanwhile it starts within 0.35 s instead: the van is then held close to the thing it has just found.
  if (dash.tr) dash.t += rdt;
  // every time the van comes back onto the hub, the dashes point the way again (to a track with nothing found, else to the nearest thing still to find)
  const hub = van.x * van.x + van.y * van.y < HUB_R * HUB_R;
  if (hub && !wasHub && S.firstInput && !dash.tr && !holdOn()) pointOn(true);
  wasHub = hub;
  if (cine.on) tickCine(rdt);
  if (three.hold > 0 && !ui.playerOpen() && !cine.on) {
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
// ---------- the app's moment: the desk clears and the tray fills where it can be seen (once; never under reduced motion) ----------
// It is the desk's payoff and it usually fires from far down the desk, where nothing of it would be seen. Three beats,
// the van held meanwhile as in the three-track moment:
//   0 to 0.45 s    the camera lifts from the van to the whole desk (cine.wide)
//   0.45 to 1.8 s  the gust, in that view: the piles go one after another from the hub end northward, their cards
//                  flip up and streak north to the phone at the top of the frame, where each waits just short of the tray
//   1.8 s on       the camera pushes in on the tray; the waiting cards dock 0.12 s apart as it arrives, the screen
//                  turns gold, 0.8 s to look at it, and back to the van (by about 3.8 s; 4.4 s at the latest)
// A new touch after the first 0.6 s ends it. A thumb that was already down and steering does not, until the screen has
// turned gold: the card takes a second and a half to fly, so that thumb is the usual case and not a wish to skip.
export const cine = { on: false, t: 0, x: 0, y: 0, z: 1.5, gold: 0, wide: false, lab: true, endAt: -9 };
export const framing = { f: null, at: -9 };      // the screen found (or bumped again) last: the camera keeps the whole of it in view while the van is at it
let wasHub = true;
function startCine(f) {
  Object.assign(cine, { on: true, t: 0, x: f.x, y: f.y - 158, z: 1.5, gold: 0, wide: true, lab: false });
  Object.assign(desk.show, { on: true, t: 0, next: 0 });
  stopAuto(); ui.pillTuck(true); ui.labelsDim(true);      // (the labels step back while the whole desk is on screen)
}
function appLabel() { if (!cine.lab) { cine.lab = true; ui.addLabel(S.byId.app, van); } }
function endCine() { cine.on = false; cine.wide = false; cine.endAt = S.rt; desk.show.on = false; ui.labelsDim(false); appLabel(); ui.pillTuck(false); }
function tickCine(rdt) {
  cine.t += rdt; desk.show.t = cine.t;
  if (cine.t >= 1.8) cine.wide = false;
  if (cine.t >= 2.15 && !cine.lab) { ui.labelsDim(false); appLabel(); }
  if (desk.tray.gold >= 1 && !cine.gold) cine.gold = cine.t;
  if (cine.t >= 4.4 || (cine.gold && cine.t > cine.gold + 0.8)) endCine();
}
// the van takes no steering: the camera is away from it
export function holdOn() { return (three.on && three.lift) || cine.on; }
export function holdT() { return cine.on ? cine.t + 0.2 : three.t; }
// Any touch after the first 0.8 s ends it early. 0 = not for the moment · 1 = swallowed (too early) · 2 = it ended the moment
// fresh: a new touch-down, tap or key press (false: a thumb or a key that was already down and is still steering)
export function threeTouch(fresh = true) {
  if (cine.on) { if (cine.t < 0.6 || (!fresh && desk.tray.gold < 1)) return 1; endCine(); return 2; }
  if (!three.on || three.ended || !three.lift) return 0;
  if (three.t < 0.8) return 1;
  three.ended = true; three.endAt = three.t; three.lift = false;
  while (three.n < 4) { ui.threeStep(three.n); three.n++; }
  ui.pillTuck(false);
  return 2;
}

// ---------- #ad1 (spec 9.8): the game opens at the first-ad phone, the first ad already found ----------
export function deepAd1() {
  tour.over = true; van.x = van.px = 0; van.y = van.py = -279; van.vx = van.vy = 0; van.a = -Math.PI / 2;
  wake(S.byId.ad1); S.slow = 0;
}

// ---------- the reel's "show me where": the van drives itself to a thing and bumps it ----------
// (main.js runs every bake job that is still waiting first, so the thing stands, with its collider, before the route is made)
export function showWhere(id) {
  const f = S.byId[id]; if (!f || !f.live) return;
  if (!S.firstInput) { S.firstInput = true; van.lights = true; }
  tourStop();
  if (f.prop && f.prop.coll) goBump(f.prop);
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
