// audio.js — everything synthesised in WebAudio, zero audio files (spec 8.6).
// This stage has the find note, the tape slap and the three-track chord. Nothing depends on sound.
let ac = null, out = null, held = false;

// D major pentatonic. The finds play the notes of one written tune in the order found.
const D4 = 293.66;
const TUNE = [0, 4, 7, 9, 12, 9, 7, 4, 2, 7, 9, 14, 12, 9, 16, 14, 12, 7, 9, 4, 2, 7, 12, 12];   // semitones above D4
const hz = st => D4 * Math.pow(2, st / 12);

// call from a lifted touch or a key: browsers grant audio there
export function unlock() {
  try {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ac = new AC(); out = ac.createGain(); out.gain.value = held ? 0 : 0.55; out.connect(ac.destination);
    }
    if (ac.state === 'suspended' && !held) ac.resume();
  } catch (e) { ac = null; }
}
// silence while a video plays
export function hold(on) {
  held = on; if (!ac) return;
  try { out.gain.setTargetAtTime(on ? 0 : 0.55, ac.currentTime, 0.03); if (on) ac.suspend(); else ac.resume(); } catch (e) { /* closed */ }
}
const ok = () => ac && ac.state === 'running' && !held;
export const state = () => (ac ? ac.state : 'none') + (held ? ' held' : '');

function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function osc(type, f, t, dur, peak, dest, a = 0.004) {
  const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
  env(g, t, a, peak, dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t + a + dur + 0.05); return o;
}
// timbre by track: w bell (sine plus a 2.76 partial) · k soft mallet · v plucked saw through a closing filter · else plain sine
function voice(track, f, t, vol = 1) {
  if (track === 'w') { osc('sine', f, t, 1.5, 0.4 * vol, out); osc('sine', f * 2.76, t, 0.6, 0.11 * vol, out); osc('sine', f * 5.4, t, 0.18, 0.04 * vol, out); }
  else if (track === 'k') { osc('sine', f, t, 0.75, 0.5 * vol, out, 0.012); osc('triangle', f * 2, t, 0.16, 0.09 * vol, out, 0.006); }
  else if (track === 'v') {
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 5;
    lp.frequency.setValueAtTime(4200, t); lp.frequency.exponentialRampToValueAtTime(380, t + 0.5); lp.connect(out);
    osc('sawtooth', f, t, 0.6, 0.22 * vol, lp); osc('sawtooth', f * 1.005, t, 0.6, 0.14 * vol, lp);
  } else osc('sine', f, t, 0.9, 0.4 * vol, out, 0.01);
}
export function findNote(i, track) { if (!ok()) return; voice(track, hz(TUNE[i % TUNE.length]), ac.currentTime + 0.01); }
export function trackNote(n) { if (!ok()) return; voice('wkv'[n], hz([0, 4, 7][n]), ac.currentTime + 0.01, 0.8); }      // D, F sharp, A
export function chord() { if (!ok()) return; const t = ac.currentTime + 0.01; voice('w', hz(0), t, 0.6); voice('k', hz(4), t, 0.6); voice('v', hz(7), t, 0.6); voice('a', hz(12), t, 0.35); }
export function ding() { if (!ok()) return; const t = ac.currentTime + 0.01; osc('sine', hz(24), t, 0.5, 0.16, out); osc('sine', hz(24) * 2.76, t, 0.2, 0.05, out); }

// tape slap: a noise burst through a band-pass sweeping 3 kHz -> 600 Hz in 90 ms
let noiseBuf = null;
export function slap() {
  if (!ok()) return;
  if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.2, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const t = ac.currentTime + 0.005, s = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; bp.type = 'bandpass'; bp.Q.value = 1.4; bp.frequency.setValueAtTime(3000, t); bp.frequency.exponentialRampToValueAtTime(600, t + 0.09);
  g.gain.setValueAtTime(0.55, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
  s.connect(bp); bp.connect(g); g.connect(out); s.start(t); s.stop(t + 0.16);
}
