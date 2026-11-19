// how.js — the explainer's step engine (stage 5). Fetched on demand: the first time the van is on the bench
// (ui.preloadHow) or the first time a sheet opens. One canvas, its own frame loop (the game's loop is stopped while a
// sheet is open), one step every 2.4 s; the old picture slides out to the left as the new one slides in from the
// right, and after the last step the first comes round again. The pictures themselves are howart.js: SCENES[id].draw
// is a pure function of (step, seconds into the step), so any moment of any step can be shown still (freeze, and the
// stills of reduced motion). Nothing is allocated in a frame and no text is drawn in a frame.
import { SCENES, makeKit, dropKit, sprites, more, W, H, BG, DUR } from './howart.js';

const SLIDE = 0.32;
let cv = null, g = null, sc = null, words = null, o = null, id = '';
let n = 0, i = 0, prev = -1, dir = 1, t = 0, T = 0, lap = 0, s = 1, raf = 0, last = 0, on = false, still = false, held = false, K = null;
const io = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;

// f: the find (f.id, f.how.steps, f.how.words) · canvas: #howc · opt: { reduced, onStep(i, t) }
export function start(f, canvas, opt) {
  stop();
  sc = SCENES[f.id]; if (!sc) return false;
  cv = canvas; o = opt || {}; id = f.id; words = f.how.words;
  n = f.how.steps.length; if (sc.n !== n) { console.warn(id, sc.n, n); n = Math.min(n, sc.n); }
  still = !!o.reduced; held = false; i = 0; prev = -1; dir = 1; t = 0; T = 0; lap = 0; on = true;
  size(true);
  if (o.onStep) o.onStep(0, 0);
  if (still) draw(); else { last = performance.now(); raf = requestAnimationFrame(frame); }
  return true;
}
// the loop ends, the backing store goes to 0 x 0 and the word sprites are let go
export function stop() {
  on = false; cancelAnimationFrame(raf); raf = 0;
  if (cv) { cv.width = 0; cv.height = 0; }
  dropKit(); cv = g = sc = words = o = K = null; id = '';
}
// The backing store: the picture's size on screen times the device's pixel ratio, never wider than 800 px. On a phone
// the ratio is held to 1.5 (0.7 MB, not 1.25: with a sheet open at the bench's south-west corner the page's canvases
// were measured at 24.4 MB against a limit of 24; at 1.5 they are 23.9); on a wide screen to 2.
// Called on open and after a resize or a turn of the phone; the word sprites are baked again at the new scale.
export function size(force) {
  if (!cv) return;
  const d = Math.min(window.devicePixelRatio || 1, Math.min(window.innerWidth, window.innerHeight) < 700 ? 1.5 : 2), cw = cv.clientWidth || 332, w = Math.max(160, Math.min(800, Math.round(cw * d)));
  if (w === cv.width && !force) return;
  cv.width = w; cv.height = Math.round(w * H / W); s = w / W;
  g = cv.getContext('2d', { alpha: false });
  K = makeKit(g, words, s);
  if (on && (still || held)) draw();
}
function go(d, t0) { prev = i; dir = d; i = (i + d + n) % n; if (d > 0 && i === 0) lap++; t = t0; if (o.onStep) o.onStep(i, t); }
// one step on (+1) or back (-1), wrapping; the loop carries on from there
export function step(d) { if (!on) return; go(d < 0 ? -1 : 1, 0); if (still || held) { prev = -1; draw(); } }
function frame(now) {
  raf = requestAnimationFrame(frame);
  if (document.hidden) { last = now; return; }
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.25 && o.onStep) o.onStep(i, t);               // the tab was away: the step mark's fill is set to where the step is
  if (dt > 0.05) dt = 0.05; else if (dt < 0) dt = 0;
  t += dt; T += dt;
  if (t >= DUR) go(1, t - DUR < 0.06 ? t - DUR : 0);
  draw();
}
function panel(x, k, tt) { g.save(); g.translate(x, 0); g.beginPath(); g.rect(0, 0, W, H); g.clip(); sc.draw(K, k, tt, false); g.restore(); }
function draw() {
  if (!g || !sc) return;
  g.setTransform(s, 0, 0, s, 0, 0);
  g.globalAlpha = 1; g.fillStyle = BG; g.fillRect(0, 0, W, H);
  K.T = T; K.lap = lap;
  if (still) { K.begin(); sc.draw(K, i, sc.still[i] * DUR, true); K.begin(); more(); }      // (a small chevron at the right edge: there is more)
  else if (held) { K.begin(); sc.draw(K, i, t, false); }
  else if (prev >= 0 && t < SLIDE) {
    const e = io(t / SLIDE) * W * dir;
    K.begin(); panel(-e, prev, DUR + t); K.begin(); panel(W * dir - e, i, t);
  } else { K.begin(); sc.draw(K, i, t, false); }
}
// ?debug=1: hold step k at the moment u (0..1) of its 2.4 s. u null: the still of reduced motion, with its traces
export function freeze(k, u) {
  if (!on) return null;
  cancelAnimationFrame(raf); raf = 0; held = true; prev = -1; i = ((k % n) + n) % n;
  if (u == null) { const was = still; still = true; if (o.onStep) o.onStep(i, 0); draw(); still = was; return state(); }
  t = u * DUR; if (o.onStep) o.onStep(i, t); draw();
  return state();
}
export function state() { return { id, i, n, t: +t.toFixed(3), running: on && !still && !held, still, px: cv ? [cv.width, cv.height] : [0, 0] }; }
// every canvas held while a sheet is open (the debug memory count)
export function canvases() { return cv ? [cv, ...sprites()] : []; }
