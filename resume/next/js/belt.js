// belt.js — THE BELT (stage 5): the steel bench of the AI table, in the north-east corner the desk and the mat left free.
// One conveyor belt runs in a closed loop from the control post past five machines and back into the post. On arrival
// everything is off. It does not clear, it starts: the van is the on switch (a stretch it drives on runs for good), a
// moving parcel stops at the next machine that is not on yet, a bumped machine goes green and works through its own
// jam, and all of it keeps running after the van has left. Recipes are in beltart.js. Nothing here allocates in a frame.
//
// Arclength s runs round the loop from its south-west corner in the direction of flow (east along the south side,
// north up the east side, west along the north side, south down the west side), 2080 units in all. Six stretches of
// open belt lie between the post and the five machines; stretch k ends at machine k, and stretch 5 is the return.
import { S, PAL, S5, addNode, standable, collidersNear, collDist } from './world.js';
import * as art from './art.js';
import * as ba from './beltart.js';
import { prop, cbox, NOSPR } from './kit.js';
import { van } from './van.js';
import * as ui from './ui.js';
import * as audio from './audio.js';

const HK = art.HK, SS = art.SS, TAU = 6.2832;
const B = [460, -900, 1040, -110];                                  // the bench (world.G.belt)
export const IDS = ['team', 'social', 'trade', 'memory', 'apply']; // the five finds, in belt order
const SPEED = 60, GAP = 22, STOP = 12, MAXP = 40;                   // belt speed; parcels keep GAP apart and stop STOP short of a machine's face
const SA = [22, 192, 394, 766, 1216, 1422], SB = [148, 306, 724, 1144, 1310, 2058];      // each stretch, from..to
// what each machine puts out: a ticked parcel, a film card (social: its parcels become film, and no tick rides on into
// trading, whose part of the belt shows no pass and no fail), a tagged one (trading), a ticked one, an envelope
const OUT = [1, 4, 2, 1, 3];
// Every strip of belt as [x0, y0, x1, y1, direction of flow (0 east, 1 north, 2 west, 3 south), owner]. The first NS are
// the stretches' own: the van's centre inside one starts that stretch. The rest lie under the machines and light with them.
const RECTS = new Float32Array([
  542, -220, 668, -180, 0, 0,
  712, -220, 826, -180, 0, 1,
  914, -220, 980, -180, 0, 2, 940, -484, 980, -220, 1, 2,
  940, -820, 980, -526, 1, 3, 856, -820, 940, -780, 2, 3,
  690, -820, 784, -780, 2, 4,
  500, -820, 578, -780, 2, 5, 500, -780, 540, -222, 3, 5,
  668, -220, 712, -180, 0, 6, 826, -220, 914, -180, 0, 7, 940, -526, 980, -484, 1, 8, 784, -820, 856, -780, 2, 9, 578, -820, 690, -780, 2, 10
]);
const NR = 14, NS = 9, RS = new Float32Array(NR);                   // RS: the arclength at which the flow enters each strip
const PLATE = [492, -168, 548, -112];                               // the start plate: standing on it starts stretch 0
const LX = [0, 1, 0, -1], LY = [1, 0, -1, 0];                       // across the belt, outward from the loop, for each direction of flow
const JAM = [92, 114, 136, 272, 294, 624, 646, 668, 690, 712, 1066, 1088, 1110, 1132, 1254, 1276, 1298];      // the 17 parcels standing at the machines on arrival
const STACKED = [136, 294, 690];                                    // the ones that carry a second box
const WORN = [64, 3, 30, 2, 110, 4, 18, 2], DASH = [2, 2], NODASH = [];      // painted lines a little worn; the ticker's plain dashes

// ---- state (also __g.belt): run[k] a stretch is on · on[i] a machine is found · n parcels on the belt ----
const run = new Uint8Array(6), on = new Uint8Array(5);
export const state = { run, on, n: 0, entered: false, all: false, get lane() { return C[6]; }, get flare() { return C[5]; }, tray: 0, done: null };
const runAt = new Float32Array(6).fill(-99), onAt = new Float32Array(5).fill(-99);      // game time a stretch started, a machine was found
// the parcel inside machine i: mt seconds since it was taken (-1: the machine is free), md how long it is inside,
// mk its kind, mo it has been put out (the machine is finishing its turn), mp it passes (trading lets one in three by), mc how many so far
const mt = new Float32Array(5).fill(-1), md = new Float32Array(5), mk = new Uint8Array(5), mo = new Uint8Array(5), mp = new Uint8Array(5), mc = new Uint16Array(5);
state.done = mc;
// for a test (?debug=1, __g.belt.peek()): the lamps' blink, the jams' hop, each machine's parcel, every parcel's place and kind
state.peek = () => ({ blink: Array.from(blink), rock: Array.from(rock), mt: Array.from(mt), mc: Array.from(mc), s: Array.from(ps.subarray(0, state.n)), k: Array.from(pk.subarray(0, state.n)), o: Array.from(po.subarray(0, state.n)), curl: C[4], sockT: C[2], padT: C[1], q: [0, 1, 2, 3, 4].map(i => { inside(i); return [qk, Math.round(Q[2]), Math.round(Q[3]), mk[i]]; }) });      // (q: what shows of the parcel inside each machine: its kind, where, and the kind that came in)
const blink = new Float32Array(5), rock = new Float32Array(6), noseAt = new Float32Array(6).fill(-99), nearK = new Uint8Array(6), wasNear = new Uint8Array(6);
// the parcel pool, kept in order of s. pk: kind in the low bits (0 plain, 1 ticked, 2 tagged, 3 envelope), 16 = it
// carries a second box, 32 = which way it steps when the van is dead centre. po: how far it has stepped off the belt
const ps = new Float32Array(MAXP), po = new Float32Array(MAXP), pk = new Uint8Array(MAXP);
let hello = null, quiet = () => false, ready = false, side = 0, fifthAt = 0, fifth = 0, laneAt = -99, swapAt = 0, pre = false, ripAt = -99, cardAt = -99, pats = null;
// the clocks a frame writes: 0 until the post's next parcel · 1 the pad is lit · 2 the post's sockets run (-1: not) ·
// 3 trading's paper chatter · 4 the length of its curl · 5 the sign's flare (-1: not yet, -0.5: due, it waits for the
// post's tape to go) · 6 how far round the lane tape is lit
const C = new Float64Array([1.2, 0, -1, 0, 26, -1, 0]);
const P = { post: null, gate: null, benches: null, social: null, trade: null, memory: null, apply: null };      // the standing props
const M = { post: null, gate: null, benches: null, social: null, trade: null, memory: null, apply: null, sign: null, pad: null, padLit: null, tape: null };      // their sprites, kept only while near
const T = { parcel: [], chevOff: [], chevOn: [], glowA: null, glowG: null, glowS: null, plate: null, plateLit: null, dome: null };      // small sprites held always

// Where arclength s is: Q[0], Q[1], and pd the direction of flow there. (Q also holds where the parcel inside a
// machine is, Q[2], Q[3]. A typed array, not variables: a number written to a variable sixty times a second for each
// parcel is a new boxed number each time, and nothing here may allocate in a frame.)
const Q = new Float64Array(4);
let pd = 0;
function at(s) {
  if (s < 440) { Q[0] = 520 + s; Q[1] = -200; pd = 0; } else if (s < 1040) { Q[0] = 960; Q[1] = 240 - s; pd = 1; }
  else if (s < 1480) { Q[0] = 2000 - s; Q[1] = -800; pd = 2; } else { Q[0] = 520; Q[1] = s - 2280; pd = 3; }
}
const inR = (x, y, x0, y0, x1, y1) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
const seen = (x0, y0, x1, y1) => { const v = S.vr; return x1 > v[0] && x0 < v[2] && y1 > v[1] && y0 < v[3]; };
const back = u => { const q = u - 1; return 1 + 2.4 * q * q * q + 1.4 * q * q; };      // out, with a little overshoot

// ---------- set up ----------
// Label, tab and tap spots are set here, so a find can fire before its sprite is baked. hello(f): say a small thing's
// tape (finds.js) · quietFn(): a moment is on. tapBox: a tap inside it opens the explainer while the pill is up (PART B).
export function init(helloFn, quietFn) {
  if (!S5) return;
  hello = helloFn; quiet = quietFn || quiet;
  const f = S.byId, set = (id, lab, tab, box) => { const q = f[id]; if (q) { q.lab = lab; q.tabAt = tab; q.tapBox = box; } };
  set('team', { up: [650, -338], down: [690, -118], min: 4.4 }, [704, -166, 0.05], [590, -346, 712, -160]);      // (min: found from behind its benches the van is far from the gate itself; its tape still gets its read)
  set('social', { up: [870, -322], down: [870, -118] }, [886, -166, -0.05], [826, -306, 914, -160]);
  set('trade', { up: [960, -600], down: [956, -434] }, [1012, -490, 0.05], [892, -560, 1040, -484]);
  set('memory', { up: [820, -750], down: [820, -750], below: true }, [806, -770, -0.05], [784, -900, 856, -764]);      // (below: the camera cannot show enough steel north of the two on the rim)
  set('apply', { up: [634, -750], down: [634, -750], below: true }, [650, -770, 0.05], [578, -900, 690, -764]);
  // The post's tape says what the sign on the steel says, so the two are never read together: the tape lands west of
  // the sign and below it (over the desk's edge and the return stretch), the sign is ground no tape of this table
  // covers when it can help it (sign: its lettering's box, ui.place), and the sign's flare waits for the tape to go.
  if (S.says.post) { S.says.post.lab = { up: [416, -262], down: [520, -100] }; S.says.post.sign = [556, -452, 836, -344]; }
  for (let r = 0; r < NR; r++) { const o = r * 6, d = RECTS[o + 4]; RS[r] = d === 0 ? RECTS[o] - 520 : d === 1 ? 240 - RECTS[o + 3] : d === 2 ? 2000 - RECTS[o + 2] : RECTS[o + 1] + 2280; }
  for (let i = 0; i < JAM.length; i++) { ps[i] = JAM[i]; pk[i] = (STACKED.includes(JAM[i]) ? 16 : 0) | (i & 1 ? 32 : 0); po[i] = 0; }
  state.n = JAM.length; ready = true;
}

// a machine before its sprite is baked: its plinth, as two fills (the collider is there from the first job)
function plinth(ctx, c) { ctx.fillStyle = '#4A5258'; ctx.fillRect(c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0); ctx.fillStyle = '#6A747C'; ctx.fillRect(c.x0, c.y0 - 1.8, c.x1 - c.x0, c.y1 - c.y0); }
// a sprite drawn smaller, about its own origin
function small(ctx, sp, x, y, k) { ctx.drawImage(sp.c, x - sp.ox / SS * k, y - sp.oy / SS * k, sp.c.width / SS * k, sp.c.height / SS * k); }
// Machine i's lamp at (x, y) on screen: green for good once found; before that amber, fast for a moment when its jam is
// nosed, slow while the stretch that feeds it runs; else dark. One ring as it goes green.
function lamp(ctx, i, x, y) {
  let st = 0;
  if (on[i]) st = 2;
  else if (blink[i] > 0) st = S.reduced || ((S.rt * 16) | 0) % 2 === 0 ? 1 : 0;
  else if (run[i]) st = S.reduced || (S.rt + i * 0.37) % 1.6 < 0.32 ? 1 : 0;
  const a = ctx.globalAlpha;
  if (st && T.glowG) { ctx.globalAlpha = a * 0.5; art.drawSpr(ctx, st === 2 ? T.glowG : T.glowA, x, y); ctx.globalAlpha = a; }
  ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.arc(x, y, 5.9, 0, TAU); ctx.fill();
  ctx.fillStyle = st === 2 ? PAL.greenTape : st === 1 ? PAL.lamp : '#2B3033'; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill();
  ctx.fillStyle = st ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.16)'; ctx.beginPath(); ctx.arc(x - 1.6, y - 1.7, 1.4, 0, TAU); ctx.fill();
  const e = (S.t - onAt[i]) / 0.45;
  if (e > 0 && e < 1 && !S.reduced) { ctx.globalAlpha = a * (1 - e); ctx.strokeStyle = PAL.greenTape; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(x, y, 6 + e * 24, 0, TAU); ctx.stroke(); ctx.globalAlpha = a; }
}

// Where the parcel inside machine i is: Q[2], Q[3], its kind qk (-1: none to draw), and qw = 1 when it is on top of the
// machine (in the chute, on the tray's plinth) and so drawn by the machine, 0 when it is on the belt under it.
// What shows on open belt is what rides there: social's is a film card from its first arch to the end of its turn
// (also while the machine holds it, the next stretch being full), and trading's stays what came in until it is under the box.
let qk = -1, qw = 0;
function inside(i) {
  qk = -1; qw = 0;
  const t = mt[i]; if (t < 0 || mo[i]) return;
  const u = t >= md[i] ? 1 : t / md[i];
  if (i === 1 && md[1] > 1) {                                       // social, every fourth: on past the eye arch, north into the chute, round the back, and through both arches again
    const d = u * 362; qk = 4; Q[3] = -200;
    if (d < 92) { Q[2] = 814 + d; if (Q[2] < 846) qk = mk[1]; }
    else if (d < 146) { Q[2] = 906.5; Q[3] = -200 - (d - 92); qw = 1; }
    else if (d < 218) { Q[2] = 906.5 - (d - 146) * 1.014; Q[3] = -254; qw = 1; }
    else if (d < 272) { Q[2] = 833.5; Q[3] = -254 + (d - 218); qw = 1; }
    else Q[2] = 834 + (d - 272);                                    // (a film card from the first arch on: what social puts out)
    return;
  }
  if (i === 2 && !mp[2]) {                                          // trading, two in three: north to the shutter, which stays down, then east into the tray
    const d = u * 78; qk = 0;
    if (d < 22) { Q[2] = 960; Q[3] = -472 - d; if (d < 12) qk = mk[2]; } else { Q[2] = 960 + (d - 22) * 1.02; Q[3] = -494 - (d - 22) * 0.2; qw = Q[2] > 978 ? 1 : 0; }
    return;
  }
  at(SB[i] - STOP + (SA[i + 1] + 10 - SB[i] + STOP) * u); Q[2] = Q[0]; Q[3] = Q[1];
  qk = i === 1 ? (Q[2] < 846 ? mk[1] : 4) : i === 2 ? (Q[3] > -484 ? mk[2] : Q[3] > -505 ? 0 : 2) : i === 3 ? (Q[2] > 820 ? mk[3] : 1) : i === 4 ? (Q[2] > 634 ? mk[4] : 3) : mk[0];
}

// ---------- the seven standing things: colliders first, as plain plinths, then each one's sprite ----------
function buildBoxes() {
  const f = S.byId, L = ba.GATE.lamp, G = ba.GATE.arm;
  // --- the control post: a small thing that says its words (never counted) ---
  const q = S.says.post;
  P.post = prop({
    x: 520, y: -178, sp: NOSPR, bb: [-26, -74, 30, 6], sortY: -177, say: q || null, coll: cbox(498, -222, 542, -178),
    draw(ctx, p) {
      if (!M.post) { plinth(ctx, p.coll); return; }
      art.drawSpr(ctx, M.post, 520, -178);
      const K = ba.POST, y = -178 + K.y - K.z * HK, a = ctx.globalAlpha;
      for (let i = 0; i < 5; i++) {                                 // its five lamps, in belt order: green once that machine is found (0.3 s after), amber as the row runs once
        const x = 520 + K.lamps[i], g = on[i] && S.t - onAt[i] > 0.3, am = !g && C[2] >= i * 0.08 && C[2] < i * 0.08 + 0.14;
        if (!g && !am) continue;
        if (T.glowS) { ctx.globalAlpha = a * 0.55; art.drawSpr(ctx, T.glowS, x, y); ctx.globalAlpha = a; }
        ctx.fillStyle = g ? PAL.greenTape : PAL.lamp; ctx.beginPath(); ctx.arc(x, y, K.r, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x - 1.3, y - 1.5, 1.2, 1.2);
      }
    }
  });
  if (q) q.prop = P.post;
  // --- team: the merge gate, and (the same find) the benches and feeders behind it ---
  P.gate = f.team.prop = prop({
    x: 690, y: -160, sp: NOSPR, bb: [-26, -116, 30, 6], sortY: -159, find: f.team, coll: cbox(668, -246, 712, -160),
    draw(ctx, p) {
      if (!M.gate) { plinth(ctx, p.coll); lamp(ctx, 0, 690 + L[0], -160 + L[1] - L[2] * HK); return; }
      art.drawSpr(ctx, M.gate, 690, -160);
      // the striped arm across the belt: up for each parcel it lets by, and once as the gate is found
      let u = 0; const t = mt[0], e = S.t - onAt[0];
      if (!S.reduced) { if (t >= 0 && !mo[0]) u = t < 0.25 ? back(t / 0.25) : t < 0.46 ? 1 : Math.max(0, 1 - (t - 0.46) / 0.14); else if (e >= 0 && e < 0.5) u = e < 0.25 ? back(e / 0.25) : Math.max(0, 1 - (e - 0.25) / 0.25); }
      const ph = u * 1.25, hx = 690 + G[0], hy = -160 + G[1] - G[3] * HK, len = G[2] * (Math.cos(ph) - 0.6 * Math.sin(ph)), seg = len / 5;
      ctx.fillStyle = 'rgba(20,17,15,.28)'; ctx.fillRect(hx - 1.2, hy + G[3] * HK * (1 - u), 4.6, G[2] * Math.cos(ph));      // its shadow on the belt
      for (let k = 0; k < 5; k++) { ctx.fillStyle = k % 2 ? PAL.ink : '#F1EDDF'; ctx.fillRect(hx - 2.3, hy + seg * k, 4.6, seg); }
      ctx.fillStyle = '#5B6268'; ctx.beginPath(); ctx.arc(hx, hy, 2.6, 0, TAU); ctx.fill();
      lamp(ctx, 0, 690 + L[0], -160 + L[1] - L[2] * HK);
    }
  });
  P.benches = prop({
    x: 651, y: -246, sp: NOSPR, bb: [-64, -104, 64, 30], sortY: -245, find: f.team, noTab: true, coll: cbox(590, -320, 712, -246),
    draw(ctx, p) {
      if (!M.benches) { plinth(ctx, p.coll); return; }
      art.drawSpr(ctx, M.benches, 651, -246);
      // One parcel on each bench. Once the gate is found, every 2.4 s one of them slides down its feeder and is gone
      // under the queue, and 1.2 s later a new one pops onto that bench (show only: these never join the belt's parcels).
      const K = ba.BENCH, sp = T.parcel[0]; if (!sp) return;
      const c = on[0] && !S.reduced ? (S.t - onAt[0]) / 2.4 : -1, bi = c >= 0 ? (((c | 0) * 3) % 5) : -1, u = c >= 0 ? (c - (c | 0)) * 2.4 : 0;
      for (let i = 0; i < 5; i++) {
        const x = 651 + K.x[i], y = -246 + K.y - K.top * HK;
        if (i !== bi) { small(ctx, sp, x, y, 0.8); continue; }
        if (u < 0.9) { const e = u / 0.9, k = e * e; small(ctx, sp, x + (K.feed[i] - K.x[i]) * k, -246 + K.y + (K.fy - K.y) * k - K.top * HK * (1 - Math.min(1, e * 3)) - 2.5, 0.8); }
        else if (u > 1.2) small(ctx, sp, x, y, 0.8 * (u < 1.4 ? back((u - 1.2) / 0.2) : 1));
      }
    }
  });
  // --- social: the film belt with two inspection arches ---
  const Sc = ba.SOC;
  P.social = f.social.prop = prop({
    x: 870, y: -160, sp: NOSPR, bb: [-48, -150, 48, 6], sortY: -159, find: f.social, coll: cbox(826, -272, 914, -160), tall: [826, 914, -312],
    draw(ctx, p) {
      const lx = 870 + Sc.lamp[0], ly = -160 + Sc.lamp[1] - Sc.lamp[2] * HK;
      if (!M.social) { plinth(ctx, p.coll); lamp(ctx, 1, lx, ly); return; }
      art.drawSpr(ctx, M.social, 870, -160);
      inside(1);
      if (qk >= 0 && !qw && !S.reduced) {                           // a card under an arch: its sign shows green, one band of light across the belt
        for (let k = 0; k < 2; k++) {
          const ax = 870 + (k ? Sc.eye : Sc.ear); if (Math.abs(Q[2] - ax) > 15) continue;
          ctx.fillStyle = 'rgba(67,199,162,.6)'; ctx.fillRect(ax - 12, -160 + Sc.signY, 24, 22);
          ctx.fillStyle = 'rgba(241,237,223,.5)'; ctx.fillRect(ax - 2.5, -220, 5, 40);
        }
      }
      if (qk >= 0 && qw && T.parcel[4]) art.drawSpr(ctx, T.parcel[4], Q[2], Q[3] - 7 * HK);      // the one in a few that goes round again, in the chute
      // the three screens light one after another, and the clock's long hand steps on for each
      const n = on[1] ? mc[1] % 4 : 0;
      for (let k = 0; k < n; k++) {
        const r = Sc.scr[k], x = 870 + r[0], y = -160 + r[1];
        ctx.fillStyle = '#F1EDDF'; ctx.fillRect(x + 1.8, y + 2.4, r[2] - 3.6, r[3] - 4.8);
        ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.moveTo(x + 5, y + 7.6); ctx.lineTo(x + 10, y + 11); ctx.lineTo(x + 5, y + 14.4); ctx.closePath(); ctx.fill();
      }
      const cx = 870 + Sc.clock[0], cy = -160 + Sc.clock[1], ha = -1.5708 + mc[1] * 0.5236;
      ctx.strokeStyle = PAL.ink; ctx.lineCap = 'round'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ha) * 5, cy + Math.sin(ha) * 5); ctx.moveTo(cx, cy); ctx.lineTo(cx + 2.6, cy + 1.5); ctx.stroke();
      lamp(ctx, 1, lx, ly);
    }
  });
  // --- trade: the ticker-tape machine and the locked gate ---
  const Tr = ba.TRADE;
  P.trade = f.trade.prop = prop({
    x: 960, y: -484, sp: NOSPR, bb: [-72, -92, 84, 6], sortY: -483, find: f.trade, coll: cbox(892, -526, 1041, -484), tall: [892, 1041, -566],
    draw(ctx, p) {
      const lx = 960 + Tr.lamp[0], ly = -484 + Tr.lamp[1] - Tr.lamp[2] * HK;
      if (!M.trade) { plinth(ctx, p.coll); lamp(ctx, 2, lx, ly); return; }
      art.drawSpr(ctx, M.trade, 960, -484);
      // the shutter under the box: it lifts only for the parcel that passes
      const t = mt[2], up = t >= 0 && mp[2] && !mo[2] && !S.reduced ? Math.min(1, Math.min(t / 0.15, (md[2] + 0.05 - t) / 0.15)) : 0, sh = Tr.shut, h = sh[3] * (1 - 0.86 * Math.max(0, up));
      ctx.fillStyle = '#17191B'; ctx.fillRect(960 + sh[0], -484 + sh[1], sh[2], h);
      ctx.fillStyle = '#3A4247'; ctx.fillRect(960 + sh[0], -484 + sh[1] + h - 1.3, sh[2], 1.3);
      if (h > 6) { ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(960 + sh[0], -484 + sh[1] + 3.4, sh[2], 0.8); ctx.fillRect(960 + sh[0], -484 + sh[1] + 6.8, sh[2], 0.8); }
      if (T.dome) art.drawSpr(ctx, T.dome, 960 + Tr.dome[0], -484 + Tr.dome[1]);
      const sp = T.parcel[0];
      if (sp) {                                                     // what did not pass lies in the tray: at most three, plain
        const tx = 960 + Tr.tray[0], ty = -484 + Tr.tray[1] - 10 * HK, n = state.tray;
        if (n > 0) art.drawSpr(ctx, sp, tx - 9, ty); if (n > 1) art.drawSpr(ctx, sp, tx + 9, ty + 1); if (n > 2) art.drawSpr(ctx, sp, tx + 1, ty - 11 * HK);
        inside(2); if (qk >= 0 && qw) art.drawSpr(ctx, sp, Q[2], Q[3] - 6 * HK);
      }
      lamp(ctx, 2, lx, ly);
    }
  });
  // --- memory: the card-index drawer ---
  const Me = ba.MEM;
  P.memory = f.memory.prop = prop({
    x: 820, y: -764, sp: NOSPR, bb: [-40, -200, 44, 6], sortY: -763, find: f.memory, coll: cbox(784, -901, 856, -764),
    draw(ctx, p) {
      const lx = 820 + Me.lamp[0], ly = -764 + Me.lamp[1] - Me.lamp[2] * HK;
      if (!M.memory) { plinth(ctx, p.coll); lamp(ctx, 3, lx, ly); return; }
      art.drawSpr(ctx, M.memory, 820, -764);
      // the nine cards in the open drawer: a ripple runs through them, one lifting after another
      const Cd = Me.cards, rt = S.reduced ? -1 : S.t - ripAt;
      for (let i = 0; i < 9; i++) {
        const d = rt - i * 0.06, up = d > 0 && d < 0.22 ? Math.sin(d / 0.22 * 3.1416) * 3 * HK : 0, x = 820 + Cd[0], y = -764 + Cd[1] + i * Cd[2] - Cd[4] - up;
        ctx.fillStyle = 'rgba(20,17,15,.3)'; ctx.fillRect(x, y + 2.6, Cd[3], 1);
        ctx.fillStyle = i % 3 === 1 ? '#DCC9A0' : '#F1EDDF'; ctx.fillRect(x, y, Cd[3], 2.8); ctx.fillRect(x + 3 + (i * 13) % 34, y - 2, 8, 2.2);
      }
      // a new card files itself for each parcel that goes in: up at the drawer's east end, over, and down into the row
      const ct = S.reduced ? 9 : S.t - cardAt;
      if (ct >= 0 && ct < 0.5) { const e = ct / 0.5, x = 820 + 30 - e * 18, y = -764 - 40 - Cd[4] - Math.sin(e * 3.1416) * 15; ctx.fillStyle = PAL.ink; ctx.fillRect(x - 5.6, y - 3.6, 11.2, 7.2); ctx.fillStyle = '#F1EDDF'; ctx.fillRect(x - 5, y - 3, 10, 6); }
      // the magnifier on its stalk (it sways once the drawer is at work), the telephone's pin-point lamp
      const mx = 820 + Me.mag[0], my = -764 + Me.mag[1] - Me.mag[2] * HK, sw = on[3] && !S.reduced ? Math.sin(S.t * 1.7) * 0.21 : 0, ex = mx + Math.sin(sw) * 24, ey = my - Math.cos(sw) * 24 * HK - 6;
      ctx.strokeStyle = '#2A2F34'; ctx.lineCap = 'round'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(ex, ey + 8.4); ctx.stroke();
      ctx.fillStyle = 'rgba(214,232,240,.32)'; ctx.beginPath(); ctx.arc(ex, ey, 8.4, 0, TAU); ctx.fill();
      ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(ex, ey, 8.4, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(ex - 5, ey - 4.6, 2.6, 1.3);
      if (on[3] && (S.reduced || (S.t * 0.6) % 1 < 0.16)) { ctx.fillStyle = PAL.greenTape; ctx.fillRect(820 + Me.phone[0] - 1, -764 + Me.phone[1] - 1, 2.2, 2.2); }
      lamp(ctx, 3, lx, ly);
    }
  });
  // --- apply: the mail-sorting desk ---
  const Ap = ba.APPLY;
  P.apply = f.apply.prop = prop({
    x: 634, y: -764, sp: NOSPR, bb: [-60, -184, 60, 6], sortY: -763, find: f.apply, coll: cbox(578, -901, 690, -764),
    draw(ctx, p) {
      const lx = 634 + Ap.lamp[0], ly = -764 + Ap.lamp[1] - Ap.lamp[2] * HK;
      if (!M.apply) { plinth(ctx, p.coll); lamp(ctx, 4, lx, ly); return; }
      art.drawSpr(ctx, M.apply, 634, -764);
      // for each parcel in: the platen twitches, and the two stamps come down one after the other
      const t = !S.reduced && mt[4] >= 0 ? mt[4] : -1, Pl = Ap.platen, tw = t >= 0 && t < 0.2 ? Math.sin(t / 0.2 * 3.1416) * 2 : 0, bx = 634 + Pl[0] + tw, by = -764 + Pl[1] - Pl[4] * HK;
      ctx.fillStyle = '#23272B'; ctx.fillRect(bx, by, Pl[2], Pl[3] + 4.2); ctx.fillStyle = '#4A5056'; ctx.fillRect(bx, by, Pl[2], Pl[3]); ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(bx, by, Pl[2], 1);
      for (let k = 0; k < 2; k++) {
        const d = t - 0.1 - k * 0.25, dn = d > 0 && d < 0.14 ? Math.sin(d / 0.14 * 3.1416) : 0, x = 634 + Ap.stamps[k], z = 38 - 11 * dn, y = -764 + Ap.sy - z * HK, ry = -764 + Ap.sy - 3 - Ap.rail * HK;
        ctx.fillStyle = '#5B6268'; ctx.fillRect(x - 0.8, ry, 1.6, y - ry);
        ctx.fillStyle = '#7A2E28'; ctx.fillRect(x - 4.5, y + 3.4, 9, 2); ctx.fillStyle = '#96683A'; ctx.fillRect(x - 4.5, y, 9, 3.6); ctx.fillStyle = '#C8935A'; ctx.fillRect(x - 4.5, y - 3.6, 9, 4.2);
      }
      lamp(ctx, 4, lx, ly);
    }
  });
}

// the small sprites held always, and the big flat ones (floor tape, the pad): made before the first wheel is on the steel
function buildFlats() {
  for (let k = 0; k < 5; k++) T.parcel[k] = ba.parcelSprite(k);
  for (let d = 0; d < 4; d++) { T.chevOff[d] = ba.chevTile(d, false); T.chevOn[d] = ba.chevTile(d, true); }
  T.glowA = art.glow(PAL.lamp, 14, 0.9); T.glowG = art.glow(PAL.greenTape, 14, 0.9); T.glowS = art.glow(PAL.greenTape, 7, 0.9);
  T.plate = ba.plateSprite(false); T.plateLit = ba.plateSprite(true); T.dome = ba.domeSprite();
  M.tape = art.keep(() => ba.tapeSprite(), 298, -118);
  bakePad();
}
const liveWord = () => { const f = S.byId.team; return (f && f.how && f.how.words.live) || ''; };      // the pad's one word, from the markup
function bakePad() { const w = liveWord(); M.pad = art.keep(() => ba.padSprite(w, false), 744, -200); M.padLit = art.keep(() => ba.padSprite(w, true), 744, -200); }
function buildSign() {
  const q = S.says.post; if (!q) return;
  const make = () => ba.signSprite(q.head.textContent.trim(), q.line.textContent.trim(), q.date ? q.date.textContent.trim() : '');
  if (M.sign) { art.retire(M.sign, true); M.sign = art.keep(make, 696, -398); P.sign.sp = M.sign; return; }
  M.sign = art.keep(make, 696, -398);
  // painted on the steel inside the loop. The first time the belt starts it flares once: the same paint again, wiped on from the left
  P.sign = prop({
    x: 696, y: -398, flat: true, sp: M.sign,
    draw(ctx, p) {
      art.drawSpr(ctx, p.sp, 696, -398);
      const t = C[5]; if (t < 0 || t > 2.5) return;
      const W = ba.SIGN.w, H = ba.SIGN.h;
      ctx.save(); ctx.beginPath(); ctx.rect(696 - W / 2, -398 - H / 2, W * Math.min(1, t / 0.5), H); ctx.clip();
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = t < 0.5 ? 1 : 1 - (t - 0.5) / 2; art.drawSpr(ctx, p.sp, 696, -398); art.drawSpr(ctx, p.sp, 696, -398);
      ctx.restore();
    }
  });
}
// nodes for the autopilot: nine placed, and a 100-unit grid wherever the van can stand clear of everything (as mat.nodes)
function nodes() {
  const buf = [], placed = [[486, -140], [600, -200], [770, -200], [960, -330], [960, -640], [910, -800], [737, -800], [520, -640], [520, -360]];
  const free = (x, y) => { if (!standable(x, y)) return false; for (const c of collidersNear(x, y, 36, buf)) if (!c.off && collDist(c, x, y) < 30) return false; return true; };
  for (const [x, y] of placed) addNode(x, y);
  for (let y = -860; y <= -140; y += 100) for (let x = 500; x <= 1000; x += 100) if (free(x, y) && placed.every(q => Math.hypot(q[0] - x, q[1] - y) > 40)) addNode(x, y);
}
// (the sprite is handed to its prop too: the frame's shadow pass draws a prop's hard shadow from p.sp)
const bakeOne = (k, make, x, y) => () => { M[k] = art.keep(make, x, y); if (P[k]) P[k].sp = M[k]; };
export function jobsNear() { return S5 && ready ? [buildFlats, buildBoxes, nodes] : []; }
export function jobs() {
  return S5 && ready ? [bakeOne('post', ba.postSprite, 520, -178), bakeOne('gate', ba.gateSprite, 690, -160), bakeOne('benches', ba.benchesSprite, 651, -246), bakeOne('social', ba.socialSprite, 870, -160),
    bakeOne('trade', ba.tradeSprite, 960, -484), bakeOne('memory', ba.memorySprite, 820, -764), bakeOne('apply', ba.applySprite, 634, -764), buildSign] : [];
}
// the sign and the pad again, when a font face arrives late
export function rebakeLettering() { if (!S5 || !ready) return; if (M.sign) buildSign(); if (M.pad) { art.retire(M.pad, true); art.retire(M.padLit, true); bakePad(); } }
export function canvases() { return [T.parcel, T.chevOff, T.chevOn, T.glowA, T.glowG, T.glowS, T.plate, T.plateLit, T.dome]; }      // for the debug memory count (the kept ones are counted with art's)

// ---------- parcels ----------
function put(s, kind) {
  if (state.n >= MAXP) return false;
  let j = state.n; while (j > 0 && ps[j - 1] > s) { ps[j] = ps[j - 1]; pk[j] = pk[j - 1]; po[j] = po[j - 1]; j--; }
  side ^= 32; ps[j] = s; pk[j] = kind | side; po[j] = 0; state.n++; return true;
}
function take(j) { for (let i = j; i < state.n - 1; i++) { ps[i] = ps[i + 1]; pk[i] = pk[i + 1]; po[i] = po[i + 1]; } state.n--; }
function clearFrom(a, len) { for (let j = 0; j < state.n; j++) if (ps[j] >= a - 0.5 && ps[j] < a + len) return false; return true; }
function countIn(k) { let c = 0; for (let j = 0; j < state.n; j++) if (ps[j] >= SA[k] - 0.5 && ps[j] <= SB[k] + 0.5) c++; return c; }
// machine i takes a parcel: it is inside for 0.6 s (social's every fourth goes round again: 1.6 s); trading lets one in three by
function feed(i, kind) {
  mt[i] = 0; mo[i] = 0; mk[i] = kind & 15; mc[i]++;
  md[i] = i === 1 && mc[1] % 4 === 0 ? 1.6 : 0.6;
  mp[i] = i === 2 && mc[2] % 3 !== 1 ? 0 : 1;
  if (i === 3) { cardAt = S.t; ripAt = S.t + 0.4; }
}
// A running stretch: its parcels ride on, each GAP behind the one ahead. The lead one stops STOP short of the stretch's
// end unless the machine there is found and free, which then takes it; at the end of the return it goes into the post.
function ride(k, dt) {
  const a = SA[k], b = SB[k]; let lim = k === 5 ? b + 40 : b - STOP;
  for (let j = state.n - 1; j >= 0; j--) {
    const s = ps[j]; if (s > b + 0.5) continue; if (s < a - 0.5) break;
    let ns = s + SPEED * dt; if (ns > lim) ns = lim > s ? lim : s;
    if (k === 5) { if (ns >= b) { take(j); continue; } }
    else if (ns >= b - STOP - 0.01 && on[k] && mt[k] < 0) {
      feed(k, pk[j]);
      if (pk[j] & 16) pk[j] &= ~16; else { take(j); continue; }     // one that carries a second box gives up the top one first
    }
    ps[j] = ns; lim = ns - GAP;
  }
}
// machine i at work: when its parcel has been inside long enough it is put on the next stretch, 10 units in, if the
// first of that stretch is free (until then the machine holds it); 0.9 s after that the machine is free again
function work(i, dt) {
  if (mt[i] < 0) return;
  mt[i] += dt;
  if (!mo[i] && mt[i] >= md[i]) {
    if (!mp[i]) { if (state.tray < 3) state.tray++; mo[i] = 1; }
    else if (clearFrom(SA[i + 1], 34) && put(SA[i + 1] + 10, OUT[i])) { mo[i] = 1; if (i === 0) C[1] = 0.25; }
    else mt[i] = md[i];
  }
  if (mo[i] && mt[i] >= md[i] + 0.9) mt[i] = -1;
}
function start(k, click) {
  if (run[k]) return;
  run[k] = 1; runAt[k] = S.t; if (click) audio.tick();
  if (k === 0 && C[5] === -1 && !S.reduced) { C[5] = -0.5; C[2] = 0; }      // the first start of the belt: the post's five sockets run once, and the sign's flare is due
}

// ---------- when a machine is found (finds.wake has counted it): it starts, and the stretch that leaves it ----------
export function onWake(f) {
  const i = IDS.indexOf(f.id); if (i < 0 || !S5) return false;
  on[i] = 1; onAt[i] = S.t; blink[i] = 0; fifth = i; start(i + 1, false);
  if (i === 3) ripAt = S.t + 0.05; if (i === 2) C[3] = 0;
  if (on[0] && on[1] && on[2] && on[3] && on[4] && !fifthAt) fifthAt = S.rt;
  return true;
}

// ---------- per frame ----------
export function update(dt, rdt) {
  if (!S5 || !ready) return;
  for (let i = 0; i < 5; i++) if (blink[i] > 0) blink[i] -= rdt;
  for (let k = 0; k < 6; k++) if (rock[k] > 0) rock[k] -= rdt;
  if (C[1] > 0) C[1] -= dt; if (C[2] >= 0) { C[2] += rdt; if (C[2] > 0.7) C[2] = -1; }
  const vx = van.x, vy = van.y, onBench = inR(vx, vy, B[0], B[1], B[2], B[3]);
  // the sign flares once the post's tape (the same words) has gone, or the van has driven on east and the sign is in the frame
  if (C[5] === -0.5 && (vx > 560 || !ui.labelIs(S.says.post))) C[5] = 0;
  if (C[5] >= 0 && C[5] <= 2.5) C[5] += rdt;
  // the explainer's picture code is fetched as the van comes near the bench (the green floor tape, the desk's east
  // edge), so the first tap on a pill finds it loaded
  if (!pre && (onBench || (vx > 300 && vy < -60 && vy > -760)) && S.firstInput) { pre = true; ui.preloadHow(); }
  if (onBench) {
    // arrival: the post says its words once, the first time the van is on the bench near it
    if (!state.entered) { if (Math.hypot(vx - 520, vy + 178) < 110 && !quiet() && !ui.busy() && S.says.post && hello) { state.entered = true; hello(S.says.post); } }
    // the van is the on switch: its centre on a stretch (or on the start plate) starts that stretch for good
    for (let r = 0; r < NS; r++) { const o = r * 6; if (!run[RECTS[o + 5]] && inR(vx, vy, RECTS[o], RECTS[o + 1], RECTS[o + 2], RECTS[o + 3])) start(RECTS[o + 5], true); }
    if (!run[0] && inR(vx, vy, PLATE[0], PLATE[1], PLATE[2], PLATE[3])) start(0, true);
  }
  for (let k = 5; k >= 0; k--) if (run[k]) ride(k, dt);
  for (let i = 0; i < 5; i++) work(i, dt);
  // the post puts out a plain parcel every 2.6 s while its stretch runs, holds fewer than five and has its first units free
  if (run[0]) { C[0] -= dt; if (C[0] <= 0) C[0] = countIn(0) < 5 && clearFrom(SA[0], 30) && put(30, 0) ? 2.6 : 0.25; }
  // The van and the parcels: one within 30 units steps off the belt, away from the van, and steps back when it has gone.
  // Nosing a jam whose machine is not found yet makes its parcels hop and that machine's lamp blink: it points at the machine.
  nearK.fill(0);
  if (vx > B[0] - 60 && vy > B[1] - 60 && vy < B[3] + 60) {
    let k = 0;
    for (let j = 0; j < state.n; j++) {
      const s = ps[j]; at(s); const dx = vx - Q[0], dy = vy - Q[1]; let tg = 0;
      if (dx * dx + dy * dy < 900) {
        const lat = dx * LX[pd] + dy * LY[pd];
        tg = (po[j] > 0.5 ? 1 : po[j] < -0.5 ? -1 : lat > 2 ? -1 : lat < -2 ? 1 : pk[j] & 32 ? 1 : -1) * 22;
        while (k < 5 && s > SB[k] + 0.5) k++;
        nearK[k] = 1;
      }
      const d = tg - po[j], q = (tg ? 150 : 55) * dt; po[j] += d > q ? q : d < -q ? -q : d;
    }
  } else for (let j = 0; j < state.n; j++) if (po[j]) { const q = 55 * dt; po[j] = po[j] > q ? po[j] - q : po[j] < -q ? po[j] + q : 0; }
  for (let k = 0; k < 5; k++) {
    if (nearK[k] && !wasNear[k] && !on[k] && S.rt - noseAt[k] > 1.5) { noseAt[k] = S.rt; blink[k] = 0.9; if (!S.reduced) rock[k] = 0.45; audio.thud(); }
    wasNear[k] = nearK[k];
  }
  // memory's cards ripple every 2.4 s once it is found; trading's paper chatters out (0.6 s on, 1 s off) and its curl grows to 60 units and holds
  if (on[3] && S.t - ripAt > 2.4) ripAt = S.t;
  if (on[2]) { C[3] += dt; if (C[3] % 1.6 < 0.6 && C[4] < 60) C[4] = Math.min(60, C[4] + 25 * dt); }
  // All five: once the fifth machine's own tape has had its read (4.8 s: the longest of the five lines takes that), no
  // moment is on and nothing is open over the game.
  if (fifthAt && !state.all && S.rt - fifthAt > 0.6 && ui.labelAge() >= 4.8 && !quiet() && !ui.busy() && !ui.howOpen()) allFive();
  if (state.all) { C[6] = S.reduced ? 1 : Math.min(1, (S.t - laneAt) / 1.6); if (swapAt && S.rt > swapAt) swap(); }
}
// Every stretch that is still off starts (a visitor who came in from the stamp may never have touched the first), the
// lane tape lights round the loop, one chime, the post's sockets run once more, and one tape lands at the van.
function allFive() {
  state.all = true; laneAt = S.t;
  for (let k = 0; k < 6; k++) start(k, false);
  audio.chime(); if (!S.reduced) C[2] = 0;
  const q = S.says.allfive; if (!q || !hello) return;
  // it lands where the fifth machine's own tape has just been, if the van is still at that machine; else at the van
  const m = S.byId[IDS[fifth]], b = m && m.tapBox, at = !!b && Math.hypot(Math.max(b[0] - van.x, 0, van.x - b[2]), Math.max(b[1] - van.y, 0, van.y - b[3])) < 96;
  q.x = van.x; q.y = van.y; q.lab = at ? { up: m.lab.up, down: m.lab.down, below: m.lab.below, min: 5 } : { up: [van.x, van.y - 64], down: [van.x, van.y + 44], min: 5 };
  hello(q); swapAt = S.rt + 6;
}
// after it has landed once the tape for all five belongs to the post: a bump on the post shows it (the post's own words stay painted on the steel beside it)
function swap() {
  swapAt = 0; const q = S.says.allfive, p = S.says.post; if (!q || !p || !P.post) return;
  q.x = p.x; q.y = p.y; q.lab = p.lab; q.prop = P.post; P.post.say = q;
}

// ---------- drawing ----------
// with the bench's tile, under everything: its two free edges (the desk's banded edge, in steel) and the painted lane lines
export function drawBench(ctx) {
  const w = B[2] - B[0], h = B[3] - B[1], v = S.vr;
  if (v[1] < B[1] + 8 || v[2] > B[2] - 8) {
    ctx.fillStyle = PAL.benchShade; ctx.fillRect(B[0], B[1], w, 3.4); ctx.fillRect(B[2] - 3.4, B[1], 3.4, h);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(B[0], B[1] + 3.4, w - 3.4, 1.2); ctx.fillRect(B[2] - 4.6, B[1] + 3.4, 1.2, h - 3.4);
    ctx.fillStyle = 'rgba(20,17,15,.3)'; ctx.fillRect(B[0], B[1], w, 0.9); ctx.fillRect(B[2] - 0.9, B[1], 0.9, h);
  }
  ctx.strokeStyle = PAL.paint; ctx.globalAlpha = 0.8; ctx.lineWidth = 3; ctx.lineCap = 'butt'; ctx.setLineDash(WORN);      // (butt: the wear in the paint is its gaps, whatever cap the frame before left set)
  ctx.stroke(ba.LANES.out); ctx.stroke(ba.LANES.inn);
  ctx.setLineDash(NODASH); ctx.globalAlpha = 1;
}
// one strip of chevrons (or the part of it from a to b along the flow), still or crawling
function chev(ctx, r, lit, a, b, shift) {
  const o = r * 6, d = RECTS[o + 4]; let x0 = RECTS[o], y0 = RECTS[o + 1], x1 = RECTS[o + 2], y1 = RECTS[o + 3];
  if (b <= a) return;
  if (d === 0) { x1 = x0 + b; x0 += a; } else if (d === 1) { y0 = y1 - b; y1 -= a; } else if (d === 2) { x0 = x1 - b; x1 -= a; } else { y1 = y0 + b; y0 += a; }
  const ox = RECTS[o] + (d === 0 ? shift : d === 2 ? -shift : 0), oy = RECTS[o + 1] + (d === 3 ? shift : d === 1 ? -shift : 0);
  ctx.save(); ctx.translate(ox, oy); ctx.fillStyle = pats[(lit ? 4 : 0) + d]; ctx.fillRect(x0 - ox, y0 - oy, x1 - x0, y1 - y0); ctx.restore();
}
// the lane tape's loop from the post in the direction of flow, 2328 units round: where d units along it is (Q[0], Q[1]),
// and one stroke of the part of it from a to b
function lanePt(d) {
  if (d <= 502) { Q[0] = 489 + d; Q[1] = -169; } else if (d <= 1164) { Q[0] = 991; Q[1] = -169 - (d - 502); }
  else if (d <= 1666) { Q[0] = 991 - (d - 1164); Q[1] = -831; } else { Q[0] = 489; Q[1] = -831 + Math.min(662, d - 1666); }
}
function laneSeg(ctx, a, b) {
  ctx.beginPath(); lanePt(a); ctx.moveTo(Q[0], Q[1]);
  if (a < 502 && b > 502) ctx.lineTo(991, -169);
  if (a < 1164 && b > 1164) ctx.lineTo(991, -831);
  if (a < 1666 && b > 1666) ctx.lineTo(489, -831);
  lanePt(b); ctx.lineTo(Q[0], Q[1]); ctx.stroke();
}
// On the ground, under the hub and every prop: the floor tape, the belt's rubber and chevrons, the lane tape, the pad,
// the start plate, the feeders' last stretch, trading's paper curl, the parcels.
export function drawGround(ctx) {
  if (!S5 || !ready || !M.tape) return;
  // the green floor tape from the hub's rim along the seam to the plate. Nothing of it moves before the first touch;
  // then one bright chevron runs its length every 2.2 s (every 6 s once all five run)
  if (seen(100, -130, 496, -106)) {
    art.drawSpr(ctx, M.tape, 298, -118);
    if (S.firstInput && !S.reduced) { const u = (S.t % (state.all ? 6 : 2.2)) / 1.1; if (u < 1) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ba.chevPath(ctx, 112 + u * 372, -118, 1.15); ctx.fill(); } }
  }
  if (!seen(B[0] - 20, B[1], B[2], B[3] + 4)) return;
  if (!pats) { pats = []; for (let k = 0; k < 8; k++) { const q = ctx.createPattern(k < 4 ? T.chevOff[k] : T.chevOn[k - 4], 'repeat'); q.setTransform(new DOMMatrix().scale(1 / SS)); pats.push(q); } }
  // the rubber: the whole ring, under the machines too, so the belt is one belt
  ctx.fillStyle = PAL.rubber; ctx.fillRect(500, -220, 480, 40); ctx.fillRect(940, -780, 40, 560); ctx.fillRect(500, -820, 480, 40); ctx.fillRect(500, -780, 40, 560);
  ctx.strokeStyle = '#3A4247'; ctx.lineWidth = 1.5; ctx.strokeRect(500.75, -819.25, 478.5, 638.5); ctx.strokeRect(539.25, -780.75, 401.5, 561.5);
  const sh = S.reduced ? 0 : (S.t * SPEED) % 24;
  for (let r = 0; r < NR; r++) {
    const o = r * 6, k = RECTS[o + 5], d = RECTS[o + 4], len = d % 2 ? RECTS[o + 3] - RECTS[o + 1] : RECTS[o + 2] - RECTS[o];
    if (!seen(RECTS[o], RECTS[o + 1], RECTS[o + 2], RECTS[o + 3])) continue;
    if (k > 5) { chev(ctx, r, on[k - 6], 0, len, on[k - 6] ? sh : 0); continue; }
    if (!run[k]) { chev(ctx, r, 0, 0, len, 0); continue; }
    // for its first 0.4 s the lit chevrons spread from the stretch's start to its end
    const e = S.reduced ? 1 : (S.t - runAt[k]) / 0.4, lit = e >= 1 ? len : Math.max(0, Math.min(len, SA[k] + e * (SB[k] - SA[k]) - RS[r]));
    chev(ctx, r, 1, 0, lit, sh); if (lit < len) chev(ctx, r, 0, lit, len, 0);
  }
  // the lane tape, 31 outside the belt's centre line: dull until all five run, then lit from the post round the loop
  ctx.lineWidth = 4; ctx.lineJoin = 'miter'; ctx.lineCap = 'butt'; ctx.strokeStyle = 'rgba(46,107,90,.6)'; ctx.strokeRect(489, -831, 502, 662);
  if (state.all) {
    // lit, it is a wider tape (6), and while it lights a bright head leads it round the loop
    const d = C[6] * 2328;
    ctx.lineWidth = 6; ctx.lineCap = 'square'; ctx.strokeStyle = PAL.greenTape; laneSeg(ctx, 0, d);      // (square: its two ends close the corner at the post)
    ctx.lineWidth = 1.3; ctx.strokeStyle = 'rgba(255,255,255,.32)'; ctx.save(); ctx.translate(-2, -2); laneSeg(ctx, 0, d); ctx.restore();
    if (C[6] < 1 && d > 4) { ctx.lineWidth = 6; ctx.strokeStyle = '#C9FFF0'; laneSeg(ctx, Math.max(0, d - 60), d); }
    if (C[6] >= 1 && !S.reduced) {                            // and one slow bright pulse round it every 6 s
      const d = (S.t % 6) / 6 * 2328; ctx.fillStyle = 'rgba(255,255,255,.7)';
      if (d < 502) ctx.fillRect(489 + d - 16, -172, 32, 6); else if (d < 1164) ctx.fillRect(988, -169 - (d - 502) - 16, 6, 32); else if (d < 1666) ctx.fillRect(991 - (d - 1164) - 16, -834, 32, 6); else ctx.fillRect(486, -831 + (d - 1666) - 16, 6, 32);
    }
  }
  // the pad past the merge gate (it lights for a moment as a parcel lands on it), the start plate (pressed while the van stands on it)
  if (seen(710, -232, 778, -168) && M.pad) art.drawSpr(ctx, C[1] > 0 ? M.padLit : M.pad, 744, -200);
  if (seen(488, -172, 552, -108) && T.plate) { const dn = inR(van.x, van.y, PLATE[0], PLATE[1], PLATE[2], PLATE[3]); art.drawSpr(ctx, dn || run[0] && S.t - runAt[0] < 0.25 ? T.plateLit : T.plate, 520, dn ? -138.5 : -140); }
  // the feeders' last 26 units, flat on the steel between the benches' block and the belt
  if (seen(600, -250, 672, -216)) {
    const K = ba.BENCH; ctx.fillStyle = PAL.rubber;
    for (let i = 0; i < 5; i++) { const ex = 651 + K.x[i] + (K.feed[i] - K.x[i]) * (56 / 82), fx = 651 + K.feed[i]; ctx.beginPath(); ctx.moveTo(ex - 3.5, -246); ctx.lineTo(ex + 3.5, -246); ctx.lineTo(fx + 3.5, -220); ctx.lineTo(fx - 3.5, -220); ctx.closePath(); ctx.fill(); }
  }
  // trading's paper: a length that spills off the ticker and curls on the steel. Bone paper, plain dashes, nothing else
  if (seen(836, -512, 904, -456)) {
    ctx.lineCap = 'butt'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(902, -500);
    for (let i = 1; i <= 12; i++) { const l = i * 5; if (l > C[4]) break; ctx.lineTo(902 - l * 0.78 + Math.sin(l * 0.21) * 2.2, -500 + l * 0.5 + Math.sin(l * 0.3 + 1) * 3.4); }
    ctx.lineWidth = 6.6; ctx.strokeStyle = 'rgba(20,17,15,.3)'; ctx.stroke();
    ctx.lineWidth = 5; ctx.strokeStyle = '#F1EDDF'; ctx.stroke();
    ctx.lineWidth = 0.9; ctx.strokeStyle = PAL.ink; ctx.setLineDash(DASH); ctx.lineDashOffset = on[2] && !S.reduced && C[3] % 1.6 < 0.6 ? -((C[3] * 25) % 4) : 0; ctx.stroke(); ctx.setLineDash(NODASH); ctx.lineDashOffset = 0;
  }
  // the parcels on the belt, and the one inside each machine while it is on the belt under it
  const v = S.vr, np = state.n;
  for (let j = 0, k = 0; j < np; j++) {
    const s = ps[j]; at(s); let x = Q[0] + LX[pd] * po[j], y = Q[1] + LY[pd] * po[j];
    if (x < v[0] - 16 || x > v[2] + 16 || y < v[1] - 16 || y > v[3] + 30) continue;
    while (k < 5 && s > SB[k] + 0.5) k++;
    const hop = rock[k] > 0 ? Math.abs(Math.sin((0.45 - rock[k]) * 21 + j * 1.3)) * (2 + j % 3) * (rock[k] / 0.45) * HK : 0, sp = T.parcel[pk[j] & 15];
    art.drawSpr(ctx, sp, x, y - hop);
    if (pk[j] & 16) art.drawSpr(ctx, T.parcel[0], x + 1, y - 11 * HK - hop * 2.2);
  }
  for (let i = 0; i < 5; i++) { inside(i); if (qk >= 0 && !qw) art.drawSpr(ctx, T.parcel[qk], Q[2], Q[3]); }
}
