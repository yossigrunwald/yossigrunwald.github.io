// ui.js — the DOM on top of the canvas: counter, lamps, tape labels, the Play pill, the video player,
// the three-track strips, the first-ad chip. All words come from the plain resume in index.html.
import { S, TRACK, MEDIA } from './world.js';
import * as audio from './audio.js';

const $ = id => document.getElementById(id);
let el = null, hooks = {}, labels = [], pillFind = null, pillAt = 0, playing = null, vw = 390, vh = 844;

export function initUI(h) {
  hooks = h;
  el = {
    tm: $('tm'), n: $('tmn'), tot: $('tmt'), blade: $('tm').querySelector('.blade'), labels: $('labels'),
    pill: $('pill'), pt: $('pill').querySelector('.pt'), player: $('player'), video: $('player').querySelector('video'),
    px: $('px'), chip: $('chip'), three: $('three'), more: $('more')
  };
  el.tot.textContent = '/' + S.live.length;
  setCount(0, true);
  // The tap on the pill is the sound gesture: src and play() happen inside this handler (spec 6.3).
  el.pill.addEventListener('click', () => { if (pillFind && el.pill.classList.contains('up')) openPlayer(pillFind); });
  // The gold chip is a real link to the file; once the game is loaded it opens the game's own player instead.
  el.chip.addEventListener('click', e => { e.preventDefault(); openPlayer(S.byId.ad1); });
  el.px.addEventListener('click', closePlayer);
  el.video.addEventListener('playing', () => { if (playing && playing.id === 'ad1') S.adPlayed = true; });
  el.video.addEventListener('ended', () => { setTimeout(() => { if (playing) closePlayer(); }, 800); });
  // swipe down 80 px closes
  let sy = null;
  el.player.addEventListener('pointerdown', e => { sy = e.clientY; });
  el.player.addEventListener('pointerup', e => { if (sy !== null && e.clientY - sy > 80) closePlayer(); sy = null; });
  el.player.addEventListener('pointercancel', () => { sy = null; });
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && playing) closePlayer();
    else if (e.key === 'Enter' && !playing && pillFind && el.pill.classList.contains('up') && document.activeElement !== el.pill && hooks.live()) openPlayer(pillFind);
  });
}
export function setViewport(w, h) { vw = w; vh = h; }

// ---------- counter: a tape measure, one inch per find ----------
export function setCount(n, quiet) {
  el.n.textContent = n;
  el.blade.style.width = (44 + 3.2 * n) + 'px';
  el.tm.setAttribute('aria-label', n + ' of ' + S.live.length + ' found');
  if (!quiet) { el.tm.classList.remove('tick'); void el.tm.offsetWidth; el.tm.classList.add('tick'); }
}
export function lampOn(track) { const t = TRACK[track]; if (t && t.lamp) el.tm.querySelector('.' + t.lamp).classList.add('on'); }

// ---------- tape labels ----------
// A label is slapped on at a find and follows it on screen. When the van drives away it shrinks to the baked tab.
export function addLabel(f, van) {
  const old = labels.find(l => l.f === f);
  if (old) { old.t = S.rt; return; }
  if (labels.length >= 6) dropLabel(labels[0]);
  const d = document.createElement('div');
  d.className = 'tape' + (S.adPlayed ? ' played' : '');
  d.style.setProperty('--t', TRACK[f.track].tape);
  d.style.setProperty('--r', (Math.random() * 6 - 3).toFixed(1) + 'deg');
  let h = '<div class="tw"><div class="tb zig"><div class="ti zig">';
  if (f.head) h += '<span class="h">' + f.head.innerHTML + '</span>';
  if (f.line) h += '<span class="l">' + (f.line.tagName === 'Q' ? '<q>' + f.line.innerHTML + '</q>' : f.line.innerHTML) + '</span>';
  if (f.after) h += '<span class="l aft">' + f.after.innerHTML + '</span>';
  h += '</div></div>';
  if (f.date) h += '<small class="d">' + f.date.innerHTML + '</small>';
  d.innerHTML = h + '</div>';
  el.labels.appendChild(d);
  const up = f.lab.flip ? true : van.y >= f.y - 4;                 // sit on the far side of the thing from the van
  const L = { f, d, w: d.offsetWidth, h: d.offsetHeight, t: S.rt, up, at: up ? f.lab.up : f.lab.down, out: false };
  labels.push(L); f.tabOn = false;
}
function dropLabel(L) {
  if (L.out) return; L.out = true; L.d.classList.add('out');
  setTimeout(() => { L.d.remove(); labels = labels.filter(x => x !== L); L.f.tabOn = true; }, 230);
}
// toScreen(wx, wy) -> [cssX, cssY]; no layout is read here
export function updateLabels(toScreen, van, pillUp) {
  const top = 92, bottom = vh - (pillUp ? 100 : 16);
  for (const L of labels) {
    const [sx, sy] = toScreen(L.at[0], L.at[1]);
    let x = sx - L.w / 2, y = L.up ? sy - L.h : sy;
    x = x < 8 ? 8 : x > vw - L.w - 8 ? vw - L.w - 8 : x;
    y = y < top ? top : y > bottom - L.h ? bottom - L.h : y;
    L.d.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
    const age = S.rt - L.t, off = sx < -30 || sx > vw + 30 || sy < top - 70 || sy > vh + 40;       // its thing has left the screen
    if (!L.out && ((age > 4 && Math.hypot(van.x - L.f.x, van.y - L.f.y) > 240) || (age > 1.5 && off))) dropLabel(L);
  }
}
export function markPlayed() { labels.forEach(L => L.d.classList.add('played')); el.chip.classList.add('gone'); }

// ---------- the Play pill ----------
export function pill(f) {
  if (!f.video) return;
  pillFind = f; pillAt = S.rt;
  const parts = f.pill.split(' · ').map(s => /^\d+:\d\d$/.test(s) ? '<b class="num">' + s + '</b>' : s);
  el.pt.innerHTML = parts.join('<span class="sep">·</span>');
  el.pill.style.setProperty('--t', TRACK[f.track].tape);
  el.pill.hidden = false; el.pill.setAttribute('aria-label', f.pill);
  requestAnimationFrame(() => el.pill.classList.add('up'));
}
export function pillUp() { return !!pillFind; }
// stays while the van is within 240 units, and at least 4 s
export function tickPill(van) {
  if (!pillFind) return;
  if (S.rt - pillAt > 4 && Math.hypot(van.x - pillFind.x, van.y - pillFind.y) > 240) hidePill();
}
export function hidePill() { pillFind = null; el.pill.classList.remove('up'); setTimeout(() => { if (!pillFind) el.pill.hidden = true; }, 320); }

// ---------- the player: one shared <video>, full screen, sound on because a tap opened it ----------
export function openPlayer(f) {
  if (!f || !f.video || playing) return;
  playing = f;
  const v = el.video;
  el.player.hidden = false;
  v.poster = MEDIA + f.video + '.jpg';
  v.muted = false; v.volume = 1;
  v.src = MEDIA + f.video + '.mp4';
  const p = v.play();
  if (p && p.catch) p.catch(() => { /* refused: the native controls are on screen, one more tap plays it */ });
  audio.hold(true); hooks.pause();
}
export function closePlayer() {
  if (!playing) return;
  const v = el.video;
  v.pause(); v.removeAttribute('src'); v.removeAttribute('poster'); v.load();       // nothing keeps downloading
  el.player.hidden = true; playing = null;
  if (S.adPlayed) markPlayed();
  if (pillFind) pillAt = S.rt;
  audio.hold(false); hooks.resume();
}
export function playerOpen() { return !!playing; }

// ---------- the three-track strips ----------
export function threeShow(more) {
  el.labels.classList.add('dim');                       // the find labels step back while the three strips are up
  el.three.hidden = false; el.three.classList.remove('bye');
  el.three.querySelectorAll('p').forEach(p => p.classList.remove('in'));
  el.more.textContent = more; el.three.querySelector('.s4').style.display = more > 0 ? '' : 'none';
}
export function threeStep(i) {
  const q = s => el.three.querySelector(s).classList.add('in');
  if (i === 0) { q('.s0'); q('.s1'); } else if (i === 1) q('.s2'); else if (i === 2) q('.s3'); else q('.s4');
}
export function threeBye() { el.three.classList.add('bye'); el.labels.classList.remove('dim'); setTimeout(() => { el.three.hidden = true; }, 400); }
