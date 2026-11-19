// audio.js: every sound is made here in Web Audio. No audio files, no library. Nothing depends on sound, and
// nothing in here may throw into the game: every door into this file is guarded.
//   1 the unlock (iPhone first: game/IOS-AUDIO.md is the recipe) · 2 the mixer · 3 the engine · 4 the surfaces, one row each
//   5 the small sounds (find tune, tape slap, card dings, chime, knock) · 6 what a tester who cannot hear can read (?debug=1)

// ---------- 1. the unlock ----------
// Two things kept an iPhone silent. A drag never allows sound there, only a tap, a click or a key does: so every tap for
// the life of the page asks again, and the game puts a tap in front of the first drag (the Start pill, the speaker tab).
// And the ring switch on silent mutes Web Audio but not a video: so the page asks for the "playback" session, and on iOS
// a silent looping <audio> plays beside the context, which puts the page in that session on its own.
const AC = window.AudioContext || window.webkitAudioContext;
const qs = new URLSearchParams(location.search), KEY = 'yg-sound';
// 6 samples of (near) silence, 48 kHz mono 16-bit WAV
const SILENCE = 'data:audio/wav;base64,UklGRjAAAABXQVZFZm10IBAAAAABAAEAgLsAAAB3AQACABAAZGF0YQwAAAAAAAEA/v8CAP//AQA=';
const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const USE_TAG = IOS && qs.get('tag') !== '0';        // ?tag=0 switches the silent tag off (one report links it to dropped frames)
let ctx = null, tag = null, wanted = true, held = false, asleep = !document.documentElement.classList.contains('g');
let fails = 0, lastTry = -1e9, stalled = 0, lastT = -1, shown = '', liveAt = 0, inited = false;
const DEBUG = qs.get('debug') === '1';
let onChange = () => {};
const dbg = { knocks: 0, snaps: 0, smalls: 0, small: '', by: '', ask: '', last: '', act: null, builds: 0, lt: -1, at: -1e9, adv: false, pin: null, mix: { eng: 1, roll: 1, extra: 1 } };
try { wanted = localStorage.getItem(KEY) !== '0'; } catch (e) { /* no storage: sound is on until muted */ }
// the silent switch, layer 1: ask for the "playback" session before any AudioContext exists
try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* not there, or not allowed */ }

const quiet = p => { if (p && p.catch) p.catch(() => {}); };          // resume() and play() may reject, or never settle
const name = t => { const q = t && t.closest ? t.closest('[id]') : null; return q ? '#' + q.id : t && t.tagName ? t.tagName.toLowerCase() : 'window'; };
// THE TRUTH: sound is really running (the context says so, its clock moves, and it is not muted)
export const live = () => !!ctx && wanted && ctx.state === 'running' && stalled < 2;
const ok = () => live() && !held && !asleep;                          // ... and nothing is open over the game
export const can = () => !!AC;
export const muted = () => !wanted;
function notify() {
  const l = live(), k = l + '|' + wanted; if (k === shown) return;
  shown = k; if (l) { liveAt = performance.now(); if (!dbg.by) dbg.by = dbg.ask || dbg.last || 'no gesture'; }
  try { onChange(l, wanted); } catch (e) { /* the page's own business */ }
}
function build() {                                   // also REbuilds a context that will not come back
  if (ctx) { try { ctx.onstatechange = null; quiet(ctx.close()); } catch (e) { /* already gone */ } }
  ctx = null;
  const c = new AC();
  c.onstatechange = () => { lastT = -1; if (c.state === 'running') fails = 0; else { dbg.by = ''; dbg.ask = ''; } notify(); };
  fails = 0; stalled = 0; lastT = -1; dbg.by = ''; dbg.ask = ''; dbg.builds++;
  voices(c); ctx = c;
}
function playTag() {                                 // the silent switch, layer 2. Never muted, never volume 0: WebKit would ignore it
  if (!USE_TAG || held || asleep || document.hidden) return;
  if (!tag) {
    tag = document.createElement('audio');
    tag.loop = true; tag.preload = 'auto'; tag.controls = false;
    tag.setAttribute('x-webkit-airplay', 'deny'); tag.disableRemotePlayback = true;
    tag.src = SILENCE;
  }
  if (tag.paused) quiet(tag.play());
}
// Runs on EVERY tap, click and key for the life of the page (and when the mute tab or the game's own view asks).
function gesture(e) {
  try {
    const ua = navigator.userActivation, act = ua ? ua.isActive : null, now = performance.now();
    if (e && e.type) { dbg.last = e.type + ' ' + name(e.target); dbg.act = act; }
    if (!wanted || !AC || asleep) return;
    const real = act !== false, fresh = now - lastTry > 400;          // false: iOS gave this event nothing (the end of a drag). fresh: a new tap, not the same tap's next event
    if (!ctx || ctx.state === 'closed' || (real && fresh && (fails >= 2 || stalled >= 2))) build();
    if (ctx.state !== 'running') {
      if (act && fresh) { fails++; lastTry = now; }
      if (act !== false && !dbg.ask) dbg.ask = dbg.last;               // (for the debug line: the event that asked with activation, so the one that unlocked it)
      quiet(ctx.resume());                                             // never awaited: outside a real tap it never settles
    }
    playTag(); notify();
  } catch (err) { /* no sound; the game goes on */ }
}
// best effort without a tap (a player closed, the page came back); the next tap is the fallback
export function wake() {
  try {
    if (!ctx || !wanted || asleep || document.hidden || ctx.state === 'closed') return;
    if (ctx.state !== 'running') { if (!dbg.ask) dbg.ask = 'wake, no tap'; quiet(ctx.resume()); }
    if (tag && tag.paused && !held) quiet(tag.play());
  } catch (e) { /* the next tap tries again */ }
}
function visibility() {
  try {
    if (document.hidden) {                           // in the playback session iOS would keep playing in the background: stop it here
      if (ctx && ctx.state === 'running') quiet(ctx.suspend());
      if (tag) tag.pause();
    } else { wake(); setTimeout(wake, 300); setTimeout(wake, 1200); }
    notify();
  } catch (e) { /* same */ }
}
function watchdog() {                                // "running" with a frozen clock is silence (WebKit bugs 276016, 283419)
  try {
    if (!ctx || !wanted || asleep || document.hidden || ctx.state !== 'running') return notify();
    const t = ctx.currentTime;
    if (lastT >= 0) { if (t > lastT) stalled = 0; else { stalled++; quiet(ctx.suspend()); setTimeout(wake, 250); } }
    lastT = t; notify();
  } catch (e) { /* same */ }
}
// o: { change(live, wanted) }. change is called whenever the truth changes: it drives the speaker tab.
export function init(o = {}) {
  if (inited) return; inited = true;
  if (o.change) onChange = o.change;
  for (const t of ['touchend', 'pointerup', 'click', 'keydown']) window.addEventListener(t, gesture, { capture: true, passive: true });      // never removed
  // (One event added to the recipe's four, for a mouse only: there the press is what grants sound, a long drag has outlived
  // the grant by its release, and the canvas cancels the mousedown that would follow. A finger's press grants nothing.)
  window.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') gesture(e); }, { capture: true, passive: true });
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pageshow', visibility);
  setInterval(watchdog, 500);
}
// The player's choice, remembered. Call it inside the tap or the key press.
export function setMuted(m) {
  wanted = !m;
  try { if (m) localStorage.setItem(KEY, '0'); else localStorage.removeItem(KEY); } catch (e) { /* not remembered, that is all */ }
  try {
    if (m) { if (ctx && ctx.state === 'running') quiet(ctx.suspend()); if (tag) tag.pause(); }
    else gesture();
  } catch (e) { /* same */ }
  notify();
}
// The speaker tab, or M: off -> on · on and really sounding -> off · on but still locked -> this tap is the unlock (the
// listeners above have already asked inside it; sound that began under this very tap is not switched off again by it).
export function tabTap() {
  if (!wanted) setMuted(false);
  else if (live() && performance.now() - liveAt > 500) setMuted(true);
  else gesture();
  return wanted;
}
// A video or a YouTube player is open: everything is ducked to nothing (the context is NOT suspended: resuming is the
// fragile part on iOS) and the silent tag stands aside for the video. The tap that closes the player brings both back.
export function hold(on) {
  held = !!on;
  try {
    if (on && tag) tag.pause();
    if (ctx && duck) { const t = ctx.currentTime, g = duck.gain; g.cancelScheduledValues(t); g.setTargetAtTime(on ? 0 : 1, t, on ? 0.02 : 0.08); if (on) g.setValueAtTime(0, t + 0.2); }
    if (!on) wake();
  } catch (e) { /* same */ }
}
// the game is on screen, or the plain resume is (its own videos have the page's sound then)
export function view(game) {
  asleep = !game;
  try {
    if (asleep) { rest(); if (ctx && ctx.state === 'running') quiet(ctx.suspend()); if (tag) tag.pause(); }
    else { dbg.last = 'view'; gesture(); }
  } catch (e) { /* same */ }
  notify();
}

// ---------- 2. the mixer ----------
//   small sounds -> out (0.55) -+
//   engine, surfaces -> cont ---+-> duck (1, or 0 while a video is open) -> the speaker (and, with ?debug=1, an analyser)
let out = null, cont = null, duck = null, ana = null, noiseBuf = null, N = null;
const E = {}, X = {}; let SV = {};
const gain = (c, v) => { const g = c.createGain(); g.gain.value = v; return g; };
const biquad = (c, type, f, q) => { const b = c.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
// steer a continuous voice: one setTargetAtTime, and none at all when the target has not moved
const set = (p, v, t, tau) => { if (p._v !== undefined && Math.abs(v - p._v) <= Math.abs(p._v) * 0.004 + 1e-5) return; p._v = v; p.setTargetAtTime(v, t, tau); };
// The continuous voices are built ONCE for a context (and again only if the context had to be rebuilt): nothing is
// created while driving. They all start silent.
function voices(c) {
  duck = gain(c, held ? 0 : 1); duck.connect(c.destination);
  ana = null; if (DEBUG) { ana = c.createAnalyser(); ana.fftSize = 2048; ana.smoothingTimeConstant = 0.6; duck.connect(ana); }
  out = gain(c, 0.55); out.connect(duck);
  cont = gain(c, 1); cont.connect(duck);
  noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  N = c.createBufferSource(); N.buffer = noiseBuf; N.loop = true; N.start();
  engine(c); surfaces(c); extras(c);
  D.still = 9; D.r = 0; D.st = null; D.cur = '';
}

// ---------- 3. the engine: a small toy-van motor ----------
// A phone speaker plays next to nothing under 250 Hz, so the motor's body is made to sit between 250 and 1200 Hz:
//   the putter: a slow sawtooth is a row of taps (14 a second standing, 58 at full speed), and each tap rings two
//     resonances (about 310 and 700 Hz, climbing with the revs). Slow, they are separate putts; fast, they run into a purr.
//   the whirr: a soft triangle six times the tap rate (silent standing, about 350 Hz at full speed): the pitch that climbs.
// Then one low-pass, which is the surface's say in the motor's tone (duller on flour, darker on the mat).
const IDLE = 14, TOP = 58, ENG = 1.05;
function engine(c) {
  E.o1 = c.createOscillator(); E.o1.type = 'sawtooth'; E.o1.frequency.value = IDLE;
  E.o2 = c.createOscillator(); E.o2.type = 'sawtooth'; E.o2.frequency.value = IDLE * 2.004;
  E.o3 = c.createOscillator(); E.o3.type = 'triangle'; E.o3.frequency.value = IDLE * 10;
  E.g2 = gain(c, 0.15); E.g3 = gain(c, 0);
  E.hp = biquad(c, 'highpass', 700, 0.5);           // (under its corner a high-pass tilts the taps' spectrum upward: next to nothing is left below 250 Hz)
  E.f1 = biquad(c, 'bandpass', 310, 5.5); E.f2 = biquad(c, 'bandpass', 700, 7); E.a2 = gain(c, 0.4);      // (narrow enough to ring a few milliseconds: a putt, not a tick)
  E.lp = biquad(c, 'lowpass', 2000, 0.5);
  E.g = gain(c, 0);
  E.o1.connect(E.hp); E.o2.connect(E.g2); E.g2.connect(E.hp);
  E.hp.connect(E.f1); E.f1.connect(E.lp); E.hp.connect(E.f2); E.f2.connect(E.a2); E.a2.connect(E.lp);
  E.o3.connect(E.g3); E.g3.connect(E.lp);
  E.lp.connect(E.g); E.g.connect(cont);
  E.o1.start(); E.o2.start(); E.o3.start();
}

// ---------- 4. the surfaces ----------
// ONE ROW PER SURFACE, keyed by the name world.surfaceAt gives it ('woods' is the green mat on the dark one; 'floor' is
// bare floor, and what an unknown name falls back to). A new table needs a row here and nothing else.
//   lp, eng   the motor on this surface: its low-pass (Hz) and its level
//   roll      what the wheels do: bands of noise, each [filter, Hz, Q, level]. It follows the speed and is silent standing
//   am        [strokes a second at full speed, depth 0..1]: the roll comes in strokes (grass)
//   hum       [Hz slow, Hz more at full speed, Q, level]: one thin band that climbs with the speed (a tyre on rubber)
//   flour     the roll swells with what the nose is pushing: [wiped, haze, heap]
//   seam      [units between plate joints, knock pitch, level]: a small knock at every joint driven over (the steel bench)
const SURF = {
  floor: { lp: 2000, eng: 1, roll: [['bandpass', 800, 0.5, 0.11]] },                                                // a plain neutral roll
  hub: { lp: 1700, eng: 1, roll: [['bandpass', 420, 2.6, 0.6], ['bandpass', 880, 3.2, 0.08]] },                  // plywood: hollow, wooden
  strip: { lp: 2300, eng: 1, roll: [['bandpass', 540, 1.6, 0.28], ['bandpass', 1150, 2.5, 0.08]] },                 // the plank: wood again, flatter
  desk: { lp: 2700, eng: 0.95, roll: [['bandpass', 1700, 0.7, 0.1]] },                                              // cleared desk: a clean light roll (the paper is its own voice)
  // (flour and the mat are heard apart at once: flour is all up high, a soft airy hush with the motor muffled under
  // it; the mat is all down low, a dull roll and one thin band that climbs with the speed, nothing above a kilohertz)
  block: { lp: 760, eng: 0.7, roll: [['bandpass', 3900, 0.55, 0.15], ['highpass', 6200, 0.5, 0.045]], flour: [0.4, 1, 1.45] },      // flour: a soft bright hush, a sled on snow
  mat: { lp: 400, eng: 1.2, roll: [['lowpass', 360, 0.7, 0.22]], hum: [250, 160, 12, 1.15] },                        // rubber: close, dark, a low tyre hum
  woods: { lp: 1500, eng: 0.95, roll: [['bandpass', 2600, 0.8, 0.26]], am: [9, 0.7] },                              // grass: a swish in strokes
  // The steel bench of the AI table: two NARROW bands that ring (every other surface is broad or low) and a little air,
  // and a small "tink" at each plate joint, about five a second at full speed: told apart by tone and by rhythm.
  belt: { lp: 1900, eng: 0.78, roll: [['bandpass', 2050, 9, 0.8], ['bandpass', 3250, 11, 0.45], ['highpass', 5200, 0.7, 0.03]], seam: [64, 2.6, 0.05] }
};
function surfaces(c) {
  SV = {};
  for (const k in SURF) {
    const row = SURF[k], v = SV[k] = { row, lev: gain(c, 0) }; let head = v.lev;
    if (row.am) {
      v.am = gain(c, 1 - row.am[1] / 2); v.lfo = c.createOscillator(); v.lfo.frequency.value = 2; const dp = gain(c, row.am[1] / 2);
      v.lfo.connect(dp); dp.connect(v.am.gain); v.lfo.start(); v.am.connect(v.lev); head = v.am;
    }
    for (const [type, f, q, a] of row.roll) { const b = biquad(c, type, f, q), g = gain(c, a); N.connect(b); b.connect(g); g.connect(head); }
    if (row.hum) { v.hum = biquad(c, 'bandpass', row.hum[0], row.hum[2]); const g = gain(c, row.hum[3]); N.connect(v.hum); v.hum.connect(g); g.connect(v.lev); }
    v.lev.connect(cont);
  }
}
// What is not a surface's roll: paper being ploughed, the knock over a routed groove, the campfire.
function extras(c) {
  // paper: bright noise that flutters (its level is thrown about thirty times a second while sheets are being hit),
  // and over it the flick of each sheet as it goes: a few milliseconds of the same noise, much louder (flick()).
  // It is the loudest thing on the desk by a clear margin: a cleared lane is the motor and a light roll, nothing else.
  X.rh = biquad(c, 'highpass', 2300, 0.7); X.rb = biquad(c, 'peaking', 4800, 0.8); X.rb.gain.value = 8; X.rg = gain(c, 0); X.pg = gain(c, 0);
  N.connect(X.rh); X.rh.connect(X.rb); X.rb.connect(X.rg); X.rg.connect(cont); X.rb.connect(X.pg); X.pg.connect(cont);
  // the knock: two partials of a small block of wood, always there, heard only when struck
  X.k1 = c.createOscillator(); X.k1.frequency.value = 560; X.k2 = c.createOscillator(); X.k2.frequency.value = 845; X.ka = gain(c, 0.5); X.kg = gain(c, 0);
  X.k1.connect(X.kg); X.k2.connect(X.ka); X.ka.connect(X.kg); X.kg.connect(cont); X.k1.start(); X.k2.start();
  // the campfire: snaps (a few ms of noise through a band that is somewhere else each time) over a low flutter
  X.cb = biquad(c, 'bandpass', 2000, 2); X.cg = gain(c, 0); X.fb = biquad(c, 'bandpass', 430, 0.6); X.fr = gain(c, 0.4); X.fg = gain(c, 0);
  N.connect(X.cb); X.cb.connect(X.cg); X.cg.connect(X.fg); N.connect(X.fb); X.fb.connect(X.fr); X.fr.connect(X.fg); X.fg.connect(cont);
  X.fire = false;
}
function knock(t, pitch, peak) {
  const j = 0.94 + Math.random() * 0.12, g = X.kg.gain; dbg.knocks++;
  X.k1.frequency.setValueAtTime(560 * pitch * j, t); X.k2.frequency.setValueAtTime(845 * pitch * j, t);
  g.cancelScheduledValues(t); g.setValueAtTime(0.0001, t); g.exponentialRampToValueAtTime(peak, t + 0.004); g.exponentialRampToValueAtTime(0.0001, t + 0.075);
}
function flick(t, peak) {
  const g = X.pg.gain;
  g.cancelScheduledValues(t); g.setValueAtTime(0.0001, t); g.exponentialRampToValueAtTime(peak, t + 0.003); g.exponentialRampToValueAtTime(0.0001, t + 0.018 + Math.random() * 0.04);
}
function crackle(t) {
  const big = Math.random() < 0.16, g = X.cg.gain; dbg.snaps++;
  X.cb.frequency.setValueAtTime(big ? 520 + Math.random() * 500 : 1300 + Math.random() * 2600, t);
  g.cancelScheduledValues(t); g.setValueAtTime(0.0001, t); g.exponentialRampToValueAtTime(big ? 1 : 0.25 + Math.random() * 0.6, t + 0.002);
  g.exponentialRampToValueAtTime(0.0001, t + (big ? 0.075 : 0.012 + Math.random() * 0.03));
}

// The loop calls this about thirty times a second (never more) with what the van is doing:
//   d: { dt, speed (units a second), thr (0..1: how hard it is being asked to go), surface, flour (0, 1, 2 under the nose),
//        paper (0..1: sheets being ploughed), groove (over a routed line of the hub), fire (0..1: how near the campfire) }
const D = { r: 0, still: 9, kick: 0, wasThr: 0, lug: 0, cur: '', paper: 0, kOdo: 0, kGap: 16, sOdo: 0, st: null, sp: 0, key: 'floor', jit: 1 };
const ROLL = 1, RUSTLE = 0.12, FLICK = 0.2, FIRE = 0.7;
export function drive(d) {
  if (!ok() || !E.g) return;
  try {
    const t = ctx.currentTime, dt = Math.min(0.1, d.dt || 0.033), M = dbg.mix;
    if (dbg.pin) d = Object.assign({}, d, dbg.pin);
    const sp = Math.min(1.15, (d.speed || 0) / 340), thr = d.thr || 0, key = SURF[d.surface] ? d.surface : 'floor', row = SURF[key];
    D.sp = d.speed || 0; D.key = key;
    // the revs: mostly the speed, a little the asking. A short rise as it pulls away; pushed against something it sags
    if (thr > 0.2 && D.wasThr <= 0.05 && sp < 0.15) D.kick = 0.24;
    D.wasThr = thr; D.kick *= Math.exp(-dt / 0.2);
    D.lug = thr > 0.3 && sp < 0.22 * thr ? D.lug + dt : 0;
    const lug = D.lug > 0.15;
    let target = Math.min(1, sp * 0.85 + thr * 0.15 + D.kick), mul = lug ? 0.8 : 1;
    if (D.st) {                                      // the starter: one cough, it catches, it settles
      const s = D.st.t += dt;
      if (s > 1 || thr > 0.1 || sp > 0.05) D.st = null;
      else { target = s < 0.3 ? -0.17 : s < 0.5 ? -0.17 + (s - 0.3) / 0.2 * 0.62 : 0.45 * (1 - (s - 0.5) / 0.5); mul = 1.3; D.r = s < 0.5 ? target : D.r; }
    }
    D.r += (target - D.r) * (1 - Math.exp(-dt / (target > D.r ? 0.06 : 0.14)));
    // standing still it putters, and after a second and a half it falls silent; it wakes the moment the van is asked to move
    D.still = sp < 0.012 && thr < 0.05 && !D.st ? D.still + dt : 0;
    const awake = D.still < 1.5, r = D.r, rp = Math.max(0, r);
    if (D.still < 2.2) {                             // (once it has fallen silent nothing is steered until it wakes)
      D.jit += (1 + (Math.random() - 0.5) * 0.05 - D.jit) * 0.3;
      const f0 = (IDLE + (TOP - IDLE) * r) * D.jit;
      set(E.o1.frequency, f0, t, 0.03); set(E.o2.frequency, f0 * 2.004, t, 0.03); set(E.o3.frequency, f0 * 10, t, 0.03);
      set(E.g2.gain, 0.15 + 0.5 * rp, t, 0.05); set(E.g3.gain, 0.04 * Math.min(1, rp * 1.6), t, 0.06);
      const wob = 1 + Math.sin(t * 1.9) * 0.03 + Math.sin(t * 0.83) * 0.02;      // the body breathes a little, so a long straight is not one held note
      set(E.f1.frequency, (310 + 220 * r) * wob, t, 0.04); set(E.f2.frequency, (700 + 400 * r) * wob, t, 0.04);
      set(E.lp.frequency, row.lp * (0.85 + 0.3 * rp) * (lug ? 0.75 : 1), t, 0.07);
    }
    // (the taps carry more as they come faster: the level is leaned back against that, so full speed is about three times the putter, not six)
    set(E.g.gain, awake ? ENG * M.eng * row.eng * mul * (1.1 - 0.3 * Math.min(1, rp)) : 0, t, awake ? 0.03 : 0.16);
    // the surface under the van: its row comes up, the one it left goes down, in about a fifth of a second
    for (const k in SV) {
      const v = SV[k], on = k === key;
      if (!on && !v.on) continue;
      v.on = on;
      set(v.lev.gain, on ? ROLL * M.roll * Math.pow(Math.min(1, sp), 0.8) * (v.row.flour ? v.row.flour[d.flour | 0] : 1) : 0, t, 0.07);
      if (on && v.hum) set(v.hum.frequency, v.row.hum[0] + v.row.hum[1] * Math.min(1, sp), t, 0.06);
      if (on && v.lfo) set(v.lfo.frequency, 2 + v.row.am[0] * Math.min(1, sp), t, 0.1);
    }
    // paper: up at once, down in a tenth of a second, and never the same level twice
    const pap = Math.min(1, d.paper || 0); D.paper += (pap - D.paper) * (pap > D.paper ? 0.8 : 0.3);
    set(X.rg.gain, D.paper > 0.01 ? RUSTLE * M.extra * D.paper * (0.45 + Math.random() * 0.9) : 0, t, 0.016);
    if (pap > 0.04 && Math.random() < dt * (12 + 26 * pap)) flick(t + Math.random() * 0.02, FLICK * M.extra * Math.min(1, 0.45 + pap) * (0.5 + Math.random() * 0.7));
    // a soft knock over each routed groove (about one every 20 to 38 units of travel), and one for the lip of the hub
    if (key !== D.cur) { if (D.cur && (key === 'hub' || D.cur === 'hub') && sp > 0.08) knock(t, 0.72, 0.13 * M.extra); D.cur = key; D.kOdo = 0; }
    if (d.groove && sp > 0.06) { D.kOdo += D.sp * dt; if (D.kOdo > D.kGap) { D.kOdo = 0; D.kGap = 20 + Math.random() * 18; knock(t, 1, (0.06 + 0.04 * sp) * M.extra); } }
    // a plate joint of the steel bench, every row.seam[0] units of travel: the same two knock oscillators, pitched up
    // (the van is never on the hub's grooves and on the bench at once, so no node is added)
    if (row.seam && sp > 0.06) { D.sOdo += D.sp * dt; if (D.sOdo > row.seam[0]) { D.sOdo = 0; knock(t, row.seam[1], row.seam[2] * (0.6 + 0.4 * Math.min(1, sp)) * M.extra); } }
    // the campfire, by how near it is: about eleven snaps a second
    const fire = d.fire || 0;
    if (fire > 0.004 || X.fire) {
      X.fire = fire > 0.004; set(X.fg.gain, FIRE * M.extra * fire, t, 0.12);
      if (X.fire) { if (Math.random() < dt * 11) crackle(t + Math.random() * 0.03); set(X.fr.gain, 0.25 + Math.random() * 0.3, t, 0.2); }
    }
  } catch (e) { /* a sound that fails is a sound that is missing, nothing more */ }
}
// the loop has stopped (a player, the reel, the plain resume, a hidden tab): every continuous voice goes down
export function rest() {
  try {
    if (!ctx || ctx.state === 'closed' || !E.g) return;
    const t = ctx.currentTime;
    set(E.g.gain, 0, t, 0.05); set(X.rg.gain, 0, t, 0.05); set(X.fg.gain, 0, t, 0.05); X.fire = false;
    for (const k in SV) { set(SV[k].lev.gain, 0, t, 0.05); SV[k].on = false; }
    D.still = 9; D.st = null; D.kick = 0; D.wasThr = 0;
  } catch (e) { /* same */ }
}
// the motor is started: it coughs once, catches and settles to its putter (drive() plays it out). False if nothing can sound.
export function starter() { if (!ok() || !E.g) return false; D.st = { t: 0 }; D.still = 0; return true; }

// ---------- 5. the small sounds ----------
// D major pentatonic. The finds play the notes of one written tune in the order found.
const D4 = 293.66;
const TUNE = [0, 4, 7, 9, 12, 9, 7, 4, 2, 7, 9, 14, 12, 9, 16, 14, 12, 7, 9, 4, 2, 7, 12, 12];   // semitones above D4
const hz = st => D4 * Math.pow(2, st / 12);
function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function osc(type, f, t, dur, peak, dest, a = 0.004) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
  env(g, t, a, peak, dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t + a + dur + 0.05); return o;
}
// timbre by track: w bell (sine plus a 2.76 partial) · k soft mallet · v plucked saw through a closing filter ·
// g struck metal (a short triangle, a 3.01 partial, a click: the bench) · else plain sine
function voice(track, f, t, vol = 1) {
  if (track === 'w') { osc('sine', f, t, 1.5, 0.4 * vol, out); osc('sine', f * 2.76, t, 0.6, 0.11 * vol, out); osc('sine', f * 5.4, t, 0.18, 0.04 * vol, out); }
  else if (track === 'k') { osc('sine', f, t, 0.75, 0.5 * vol, out, 0.012); osc('triangle', f * 2, t, 0.16, 0.09 * vol, out, 0.006); }
  else if (track === 'v') {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 5;
    lp.frequency.setValueAtTime(4200, t); lp.frequency.exponentialRampToValueAtTime(380, t + 0.5); lp.connect(out);
    osc('sawtooth', f, t, 0.6, 0.22 * vol, lp); osc('sawtooth', f * 1.005, t, 0.6, 0.14 * vol, lp);
  } else if (track === 'g') { osc('triangle', f, t, 0.5, 0.42 * vol, out, 0.003); osc('sine', f * 3.01, t, 0.25, 0.11 * vol, out, 0.002); osc('square', f * 2, t, 0.012, 0.05 * vol, out, 0.001); }
  else osc('sine', f, t, 0.9, 0.4 * vol, out, 0.01);
}
// Every one of these returns at once when sound is not really running: a note is never queued on a sleeping context
// (they would all fire together when it woke).
const safe = fn => (...a) => { if (!ok()) return; try { fn(...a); } catch (e) { /* a missing sound */ } };
export const findNote = safe((i, track) => voice(track, hz(TUNE[i % TUNE.length]), ctx.currentTime + 0.01));
export const trackNote = safe((n, track) => voice(track || 'wkv'[n], hz([0, 4, 7, 12][n]), ctx.currentTime + 0.01, 0.8));      // D, F sharp, A (and the D above, once there are four sections); each in its own track's voice
export const chord = safe(four => { const t = ctx.currentTime + 0.01; voice('w', hz(0), t, 0.6); voice('k', hz(4), t, 0.6); voice('v', hz(7), t, 0.6); voice('a', hz(12), t, 0.35); if (four) voice('g', hz(9), t, 0.5); });      // four: with the bench's voice in it (stage 5)
// a card's ding. n = 0 as it flips up; 1..9 as it docks in the tray, climbing the scale one step a card
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
export const ding = safe((n = 0) => { const t = ctx.currentTime + 0.01, f = hz(24 + SCALE[Math.min(9, n)] - (n ? 12 : 0)); osc('sine', f, t, 0.5, 0.16, out); osc('sine', f * 2.76, t, 0.2, 0.05, out); });
// all nine in: D, F sharp, A, D in the bell voice
export const chime = safe(() => { const t = ctx.currentTime + 0.01; [12, 16, 19, 24].forEach((st, i) => { osc('sine', hz(st), t + i * 0.07, 1.2, 0.2, out); osc('sine', hz(st) * 2.76, t + i * 0.07, 0.4, 0.05, out); }); });
// a switch flipping itself: one short click
export const tick = safe(() => { const t = ctx.currentTime + 0.005; osc('square', 1900, t, 0.018, 0.09, out, 0.001); osc('square', 620, t + 0.012, 0.02, 0.07, out, 0.001); });
// a bump that finds nothing yet, or the lip of a table: a low knock. (Its body, 150 Hz falling to 70, is below what a
// phone speaker plays, so it carries one quiet partial an octave up: the same knock, on a phone as well.)
export const thud = safe(() => {
  const t = ctx.currentTime + 0.005, o = osc('sine', 150, t, 0.16, 0.4, out, 0.003), o2 = osc('sine', 300, t, 0.11, 0.13, out, 0.003);
  o.frequency.exponentialRampToValueAtTime(70, t + 0.14); o2.frequency.exponentialRampToValueAtTime(140, t + 0.14);
});
// tape slap: a noise burst through a band-pass sweeping 3 kHz -> 600 Hz in 90 ms
export const slap = safe(() => {
  const t = ctx.currentTime + 0.005, s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; bp.type = 'bandpass'; bp.Q.value = 1.4; bp.frequency.setValueAtTime(3000, t); bp.frequency.exponentialRampToValueAtTime(600, t + 0.09);
  g.gain.setValueAtTime(0.55, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
  s.connect(bp); bp.connect(g); g.connect(out); s.start(t, Math.random()); s.stop(t + 0.16);
});
// filtered noise with a moving band: dur seconds, from f0 to f1 Hz
const swish = safe((f0, f1, dur, peak, q = 0.9) => {
  const t = ctx.currentTime + 0.005, s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; s.loop = true; bp.type = 'bandpass'; bp.Q.value = q; bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(bp); bp.connect(g); g.connect(out); s.start(t, Math.random()); s.stop(t + dur + 0.05);
});
export function whip() { swish(900, 3600, 0.32, 0.12, 1.6); }      // a card leaving for the tray
export function gust() { swish(400, 1500, 1.5, 0.3, 0.7); }        // the gust that clears the desk

// ---------- 5b. the small things: ONE ROW PER SOUND. Each partial: [type, Hz, seconds, peak, delay s, Hz at its end or 0] ----------
// A small thing names its row (smallart.SND); several share one. A line going up plays its thing's row and nothing
// else: no tape slap, no find note. Nothing here is louder than a card's ding; nothing is built while driving.
const SMALLS = {
  tock:   [['triangle', 880, 0.05, 0.12, 0, 0], ['sine', 1760, 0.03, 0.04, 0, 0]],                      // a knock on something small
  roll:   [['triangle', 700, 0.04, 0.09, 0, 0], ['triangle', 640, 0.04, 0.08, 0.07, 0], ['triangle', 590, 0.04, 0.06, 0.15, 0]],   // three wood ticks
  jingle: [['sine', 3136, 0.12, 0.07, 0, 0], ['sine', 3951, 0.12, 0.07, 0.04, 0], ['sine', 4699, 0.14, 0.06, 0.09, 0]],            // keys, paperclips, wire
  click:  [['square', 1900, 0.018, 0.08, 0, 0], ['square', 620, 0.02, 0.06, 0.012, 0]],                 // a switch, a shutter, a ratchet
  blip:   [['sine', 988, 0.09, 0.12, 0, 0], ['sine', 1319, 0.12, 0.10, 0.1, 0]],                        // a gadget waking
  thump:  [['sine', 220, 0.12, 0.2, 0, 110], ['sine', 440, 0.08, 0.06, 0, 220]],                        // a soft low beat (440: a phone speaker plays nothing under 250)
  whirr:  [['sawtooth', 190, 0.35, 0.05, 0, 320]],                                                      // blades spinning up
  ring:   [['sine', 2349, 0.05, 0.07, 0, 0], ['sine', 2960, 0.05, 0.06, 0.06, 0], ['sine', 2349, 0.05, 0.07, 0.12, 0], ['sine', 2960, 0.05, 0.06, 0.18, 0]]      // a desk phone's trill (four high partials)
};
let smallAt = 0;
export const small = safe(name => {
  if (!name) return;                                                        // (a thing that is silent: it listens)
  const t = ctx.currentTime + 0.005; if (t - smallAt < 0.12) return; smallAt = t; dbg.smalls++; dbg.small = name;
  if (name === 'paper') { swish(1700, 3400, 0.16, 0.1, 0.9); return; }      // a note lifted, a box of slips
  if (name === 'paper2') { swish(3000, 1700, 0.1, 0.07, 0.9); return; }     // a note put down, or rustling as it is driven over
  for (const [type, f, d, pk, at, f1] of SMALLS[name] || SMALLS.tock) { const o = osc(type, f, t + at, d, pk, out, 0.002); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + at + d); }
});

// ---------- 6. for a tester who cannot hear (?debug=1): window.__g.audio ----------
// rms(), centroid() and bands() read an analyser on the master output, after the duck: what they say is what would
// reach the speaker. (A context that is not running sends nothing, so they answer 0 then.)
let tb = null, fb = null;
const spectrum = () => { if (!fb) fb = new Float32Array(ana.frequencyBinCount); ana.getFloatFrequencyData(fb); return ctx.sampleRate / ana.fftSize; };
export function debug() {
  return {
    get state() { return ctx ? ctx.state : 'none'; }, get running() { return live(); }, get audible() { return ok(); }, get muted() { return !wanted; },
    get held() { return held; }, get asleep() { return asleep; }, get unlockedBy() { return dbg.by; }, get lastGesture() { return dbg.last; }, get activation() { return dbg.act; },
    get surface() { return D.key; }, get speed() { return Math.round(D.sp); }, get revs() { return +D.r.toFixed(3); }, get paper() { return +D.paper.toFixed(2); }, get builds() { return dbg.builds; },
    get session() { try { return navigator.audioSession ? navigator.audioSession.type : 'none'; } catch (e) { return 'none'; } },
    get tag() { return USE_TAG ? (tag && !tag.paused ? 'playing' : 'paused') : 'off'; }, get time() { return ctx ? ctx.currentTime : 0; },
    surfaces: Object.keys(SURF), mix: dbg.mix, get knocks() { return dbg.knocks; }, get snaps() { return dbg.snaps; }, get smalls() { return dbg.smalls; }, get small() { return dbg.small; },      // (smalls: how many small-thing sounds have played, and the last one's row)
    set pin(v) { dbg.pin = v || null; }, get pin() { return dbg.pin; },      // { surface, speed, thr, ... } overrides what the loop sends: a test can hold one surface at one speed
    // the largest sample in the last 43 ms (1 is full scale: above it the output would clip)
    peak() {
      if (!ana || !ctx || ctx.state !== 'running') return 0;
      if (!tb) tb = new Float32Array(ana.fftSize);
      ana.getFloatTimeDomainData(tb); let m = 0; for (let i = 0; i < tb.length; i++) { const v = tb[i] < 0 ? -tb[i] : tb[i]; if (v > m) m = v; }
      return m;
    },
    rms() {
      if (!ana || !ctx || ctx.state !== 'running') return 0;
      if (!tb) tb = new Float32Array(ana.fftSize);
      ana.getFloatTimeDomainData(tb); let s = 0; for (let i = 0; i < tb.length; i++) s += tb[i] * tb[i];
      return Math.sqrt(s / tb.length);
    },
    // where the middle of the sound's power lies, in Hz (60 Hz to 8 kHz); 0 when there is none
    centroid() {
      if (!ana || !ctx || ctx.state !== 'running') return 0;
      const hzPer = spectrum(); let a = 0, b = 0;
      for (let i = Math.ceil(60 / hzPer); i * hzPer < 8000; i++) { const p = Math.pow(10, fb[i] / 10); a += p * i * hzPer; b += p; }
      return b > 1e-11 ? Math.round(a / b) : 0;
    },
    // the share of the power under 250 Hz, from 250 to 1200 (what a phone speaker plays best), 1200 to 4000, and above
    bands() {
      if (!ana || !ctx || ctx.state !== 'running') return [0, 0, 0, 0];
      const hzPer = spectrum(), o = [0, 0, 0, 0]; let all = 0;
      for (let i = 1; i < fb.length; i++) { const f = i * hzPer, p = Math.pow(10, fb[i] / 10); o[f < 250 ? 0 : f < 1200 ? 1 : f < 4000 ? 2 : 3] += p; all += p; }
      return all > 1e-11 ? o.map(v => +(v / all).toFixed(3)) : [0, 0, 0, 0];
    },
    // the power in each 100 Hz band up to 3 kHz (or up to top), keyed by the band's lower edge
    spec100(top = 3000) {
      const o = {}; if (!ana || !ctx || ctx.state !== 'running') return o;
      const hzPer = spectrum(); for (let i = 1; i * hzPer < top; i++) { const k = Math.floor(i * hzPer / 100) * 100; o[k] = (o[k] || 0) + Math.pow(10, fb[i] / 10); }
      return o;
    },
    // the one line drawn at the bottom left of the screen
    line() {
      const t = ctx ? ctx.currentTime : -1, n = performance.now();
      if (n - dbg.at > 100) { dbg.adv = dbg.lt >= 0 && t > dbg.lt; dbg.lt = t; dbg.at = n; }      // (judged over a tenth of a second or more)
      return [ctx ? ctx.state : 'no context', 'clock ' + (dbg.adv ? 'yes' : 'no'), dbg.by ? 'by ' + dbg.by : 'last ' + (dbg.last || 'none'),
        'act ' + (dbg.act === null ? 'n/a' : dbg.act ? 'yes' : 'no'), this.session, 'tag ' + (USE_TAG ? (tag && !tag.paused ? 'on' : 'paused') : 'off'), 'muted ' + (wanted ? 'no' : 'yes') + (held ? ' held' : '')].join(' · ');
    }
  };
}
