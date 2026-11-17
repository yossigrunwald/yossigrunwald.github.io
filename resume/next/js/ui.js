// ui.js — the DOM on top of the canvas: counter, lamps, tape labels, the Play pill, the video player, the YouTube
// player, the reel, the three-track strips, the first-ad chip. All words come from the plain resume in index.html.
import { S, TRACK, MEDIA, collDist, shown } from './world.js';
import * as audio from './audio.js';

const $ = id => document.getElementById(id);
let el = null, hooks = {}, labels = [], pillFind = null, pillAt = 0, playing = null, poster = null, reelOn = false, reelMade = false, vw = 390, vh = 844, chipState = '', count = 0, chipX = 195, chipY = 26, plate = false, away = false;
const PLAY = '<svg viewBox="0 0 10 11"><path d="M1 .6 9.4 5.5 1 10.4z"/></svg>';
const GO = '<svg class="go" viewBox="0 0 20 12"><path d="M1 6h17M12.5 1 18.5 6l-6 5"/></svg>';
const OUT = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M4 10 10.5 3.5M5 3.2h5.8V9"/></svg>';

export function initUI(h) {
  hooks = h;
  el = {
    tm: $('tm'), n: $('tmn'), tot: $('tmt'), blade: $('tm').querySelector('.blade'), labels: $('labels'),
    pill: $('pill'), pp: $('pill').querySelector('.pp'), pt: $('pill').querySelector('.pt'), player: $('player'), video: $('player').querySelector('video'),
    px: $('px'), chip: $('chip'), three: $('three'), more: $('more'), links: $('links'), stage: $('stage'), toplain: $('toplain'),
    yt: $('yt'), ytf: $('ytf'), ytcap: $('ytcap'), ytopen: $('ytopen'), reel: $('reel'), reell: $('reell'), reeln: $('reeln'), reelb: $('reelb'), rx: $('rx')
  };
  el.tot.textContent = '/' + S.live.length;
  setCount(0, true);
  // The tap on the pill is the sound gesture: src and play() happen inside this handler (spec 6.3).
  el.pill.addEventListener('click', () => { if (pillFind && el.pill.classList.contains('up')) pillAct(); });
  // The gold chip is a real link to the file; once the game is loaded it opens the game's own player instead.
  el.chip.addEventListener('click', e => { e.preventDefault(); openPlayer(S.byId.ad1); });
  el.px.addEventListener('click', closePlayer);
  el.video.addEventListener('click', () => { if (poster) openPlayer(poster); });      // on the #ad1 poster, a tap on the poster plays it too
  el.reelb.addEventListener('click', toggleReel);
  el.rx.addEventListener('click', () => closeReel());
  el.reel.addEventListener('click', e => { if (e.target === el.reel) closeReel(); });      // a tap on the dark above the sheet closes it
  el.reell.addEventListener('click', reelTap);
  el.video.addEventListener('playing', () => { if (playing && playing.id === 'ad1') S.adPlayed = true; });
  // The first ad watched in the plain resume counts too: the page's own script flags it (before or after the game has loaded).
  const seen = () => { S.adPlayed = true; markPlayed(); };
  if (window.ygAd1) seen();
  document.addEventListener('ygad1', seen);
  // closes itself 0.8 s after the video ends, but only if that same video is still the one open and still at its end
  el.video.addEventListener('ended', () => { const f = playing; setTimeout(() => { if (f && playing === f && el.video.ended) closePlayer(); }, 800); });
  // swipe down 80 px closes
  let sy = null;
  el.player.addEventListener('pointerdown', e => { sy = e.clientY; });
  el.player.addEventListener('pointerup', e => { if (sy !== null && e.clientY - sy > 80) closePlayer(); sy = null; });
  el.player.addEventListener('pointercancel', () => { sy = null; });
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && (playing || poster)) closePlayer();
    else if (e.key === 'Escape' && reelOn) closeReel();
    else if (e.key === 'Enter' && !playing && !reelOn && pillFind && (el.pill.classList.contains('up') || el.links.classList.contains('up')) && (hooks.live() || poster)) {
      if (e.target && e.target.closest && e.target.closest('a,button,video,input,select,textarea')) return;   // Enter on a focused control is that control's own
      pillAct();
    }
  });
}
export function setViewport(w, h) { vw = w; vh = h; if (el) fitBlade(); }

// ---------- counter: a tape measure, one inch per find ----------
// The blade grows 3.2 px a find until it would reach the first-ad chip (or, once that has gone, the plain-resume tab):
// from there it stays that long and its inch marks crowd closer instead, so the number never runs under anything.
// (Layout is read here only: on a find, on a resize, when the chip goes. Never per frame.)
function fitBlade() {
  // (the blade's left edge is taken from the counter's own box: the blade itself may be mid-ratchet, shifted a few px)
  const b = { left: el.tm.getBoundingClientRect().left + 23 }, c = el.chip.getBoundingClientRect(), stop = c.width ? c.left : el.toplain.getBoundingClientRect().left;
  if (c.width) { chipX = c.left + c.width / 2; chipY = c.top + c.height / 2; }
  const want = 48 + 3.2 * count, room = Math.max(58, stop - 8 - b.left);
  el.blade.style.width = Math.min(want, room) + 'px';
  el.blade.style.setProperty('--tk', (want > room ? Math.max(1.6, 3.2 * room / want) : 3.2).toFixed(2) + 'px');
}
export function setCount(n, quiet) {
  el.n.textContent = n; count = n;
  fitBlade();
  el.tm.setAttribute('aria-label', n + ' of ' + S.live.length + ' found');
  if (!quiet) { el.tm.classList.remove('tick'); void el.tm.offsetWidth; el.tm.classList.add('tick'); }
}
export function lampOn(track) { const t = TRACK[track]; if (t && t.lamp) el.tm.querySelector('.' + t.lamp).classList.add('on'); }

// ---------- tape labels ----------
// A label is slapped on at a find and follows it on screen. There is never more than one full label: it drops to its
// baked one-word tab when another label opens, or when the van has gone 90 units from its thing.
export function addLabel(f, van) {
  const old = labels.find(l => l.f === f && !l.out);
  if (old) {                                                       // already up: it stays, and is put again where it now belongs (the van has moved since)
    old.t = S.rt; f.labAt = S.rt;
    if (f.lab.pick) f.lab.pick(van);
    if (!f.lab.mid) { old.up = f.lab.flip ? true : f.lab.below ? false : van.y >= f.y - 4; old.at = old.up ? f.lab.up : f.lab.down; old.mid = false; old.placed = false; }
    return;
  }
  labels.forEach(dropLabel);
  const d = document.createElement('div');
  d.className = 'tape' + (S.adPlayed ? ' played' : '');
  d.style.setProperty('--t', TRACK[f.track].tape);
  d.style.setProperty('--r', (Math.random() * 6 - 3).toFixed(1) + 'deg');
  d.innerHTML = tapeHTML(f);
  if (f.lab.maxw) { d.style.maxWidth = f.lab.maxw + 'px'; d.classList.add('nar'); }
  el.labels.appendChild(d);
  if (f.lab.pick) f.lab.pick(van);                                 // a thing may choose where its label goes by where the van is
  const up = f.lab.flip ? true : f.lab.below ? false : van.y >= f.y - 4;   // sit on the far side of the thing from the van
  const L = { f, d, w: d.offsetWidth, h: d.offsetHeight, t: S.rt, up, at: up ? f.lab.up : f.lab.down, out: false, thru: false, mid: !!f.lab.mid, placed: false };
  labels.push(L); f.tabOn = false; f.labAt = S.rt;                 // labAt: the van does not slide off a thing whose label has only just gone up
}
// a find's words on its tape: head, line, the line it gains later, the date sticker
function tapeHTML(f) {
  let h = '<div class="tw"><div class="tb zig"><div class="ti zig">';
  if (f.lab && f.lab.only) return h + '<span class="h">' + f.lab.only + '</span></div></div></div>';      // one word on the tape: the thing itself does the reading
  if (f.head) h += '<span class="h">' + f.head.innerHTML + '</span>';
  if (f.line) h += '<span class="l">' + (f.line.tagName === 'Q' ? '<q>' + f.line.innerHTML + '</q>' : f.line.innerHTML) + '</span>';
  if (f.after) h += '<span class="l aft">' + f.after.innerHTML + '</span>';
  h += '</div></div>';
  if (f.date) h += '<small class="d">' + f.date.innerHTML + '</small>';
  return h + '</div>';
}
function dropLabel(L) {
  if (L.out) return; L.out = true; L.d.classList.add('out');
  setTimeout(() => { L.d.remove(); labels = labels.filter(x => x !== L); if (!labels.some(x => x.f === L.f)) L.f.tabOn = true; }, 230);
}
// Where a label's box lands on screen for a spot (world) and a way of hanging there: over it (up), under it, or centred on it (mid)
// loose: its thing is leaving the screen, so the label is not held in view: it leaves with it
function boxAt(L, at, up, mid, toScreen, top, bottom, loose) {
  const s = toScreen(at[0], at[1]);
  let x = s[0] - L.w / 2, y = mid ? s[1] - L.h / 2 : up ? s[1] - L.h : s[1];
  if (loose) return [x, y];
  x = x < 8 ? 8 : x > vw - L.w - 8 ? vw - L.w - 8 : x;
  y = y < top ? top : y > bottom - L.h ? bottom - L.h : y;
  // never under the reel chip (top right, down to y 96): a label that high keeps left of it or, too wide for that, sits just below it
  if (y < 102 && x + L.w > vw - 64) { if (vw - 64 - L.w >= 8) x = vw - 64 - L.w; else y = 102; }
  return [x, y];
}
// the ground a find's thing covers [x0, y0, x1, y1]: its screen, a box of its own, or its sprite
function thingRect(f) {
  if (f.box) return f.box; if (f.scr) return f.scr;
  const q = f.prop, b = q && (q.bb || (q.sp && q.sp.bb));
  return b ? [q.x + b[0], q.y + b[1], q.x + b[2], q.y + b[3]] : [f.x - 40, f.y - 70, f.x + 40, f.y + 10];
}
// A fresh label must not land on the van (a 70 px box round it) nor on a screen that is showing a picture (found, or
// awake and still to find), the gold app phone, or the taped sheet once it can be read: it tries over its
// thing, then under it, then beside it on the side with more room. Only if nowhere is free does it stay where it was
// first put, and yield there by fading. (A label that belongs on its thing's own top edge, the first ad's, is left alone.)
function place(L, toScreen, v, top, bottom, vanY) {
  if (L.mid) return;
  const f = L.f, rects = [[v[0] - 35, v[1] - 35, v[0] + 35, v[1] + 35]];
  const add = (x0, y0, x1, y1) => { const a = toScreen(x0, y0), b = toScreen(x1, y1); if (b[0] > 0 && a[0] < vw && b[1] > 0 && a[1] < vh) rects.push([a[0], a[1], b[0], b[1]]); };
  for (const q of S.live) if (q.scr && (q.video || q.yt) && (q.found || (q.video && !(q.near < 0.3)))) add(q.scr[0], q.scr[1], q.scr[2], q.scr[3]);
  const ap = S.byId.app; if (ap && ap.found && ap.box) add(ap.box[0], ap.box[1], ap.box[2], ap.box[3]);
  const ln = S.byId.line; if (ln && ln.found && ln !== f && !f.lab.onLine) add(ln.x - 74, ln.y - 95, ln.x + 74, ln.y + 95);      // the taped sheet, once it can be read (its written part: the margin may be touched)
  const free = (at, up, mid) => { const [x, y] = boxAt(L, at, up, mid, toScreen, top, bottom); for (const r of rects) if (x < r[2] && x + L.w > r[0] && y < r[3] && y + L.h > r[1]) return false; return true; };
  const s = toScreen(f.x, f.y), side = s[0] > vw / 2 ? -1 : 1, k = Math.abs(toScreen(1, 0)[0] - toScreen(0, 0)[0]) || 1, dx = (L.w / 2 + 70) / k;
  // (after the two sides: under it, just past the van that is parked at its foot · then further below, clear of whatever lies under it)
  const dn = f.lab.down, vy = vanY + 40 / k, tries = [[L.at, L.up, false], [L.up ? dn : f.lab.up, !L.up, false], [[f.x + side * dx, f.y - 46], false, true], [[f.x - side * dx, f.y - 46], false, true],
    [[dn[0], Math.max(dn[1], vy)], false, false], [[dn[0], dn[1] + 120], false, false], [[dn[0], dn[1] + 235], false, false]];
  for (const [at, up, mid] of tries) if (free(at, up, mid)) { L.at = at; L.up = up; L.mid = mid; return; }
}
// toScreen(wx, wy) -> [cssX, cssY]; no layout is read here
export function updateLabels(toScreen, van, pillUp) {
  const top = 92, bottom = vh - (pillUp ? 100 : 16), v = toScreen(van.x, van.y);
  for (const L of labels) {
    if (!L.placed) { L.placed = true; place(L, toScreen, v, top, bottom, van.y); }
    // A label is held in view only while at least half of its thing is on screen. Less than that and it leaves with the
    // thing (and so never comes to rest on something else).
    const r = thingRect(L.f), loose = shown(r[0], r[1], r[2], r[3]) < 0.5;
    const [sx, sy] = toScreen(L.at[0], L.at[1]), [x, y] = boxAt(L, L.at, L.up, L.mid, toScreen, top, bottom, loose);
    L.d.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
    // the van is never hidden for long: once a label has had a second and a half to be read, it goes nearly clear while the van is under it
    const age = S.rt - L.t, off = sx < -30 || sx > vw + 30 || sy < top - 70 || sy > vh + 40;       // its thing has left the screen
    const thru = age > Math.max(1.5, L.f.lab.read || 0) && v[0] > x - 26 && v[0] < x + L.w + 26 && v[1] > y - 26 && v[1] < y + L.h + 26;
    if (thru !== L.thru) { L.thru = thru; L.d.classList.toggle('thru', thru); }
    const c = L.f.prop && L.f.prop.coll, far = c ? collDist(c, van.x, van.y) > 90 : Math.hypot(van.x - L.f.x, van.y - L.f.y) > 130;
    // every label gets time to be read first; but one that is leaving with its thing goes as soon as half of it is past the edge (never a cut-off strip of tape at the side of the screen)
    const gone = loose && Math.max(0, Math.min(x + L.w, vw) - Math.max(x, 0)) * Math.max(0, Math.min(y + L.h, vh) - Math.max(y, top)) < L.w * L.h * 0.5;
    if (!L.out && (gone || (age > (L.f.lab.min || 1.6) && (far || off)))) dropLabel(L);
  }
  // the top-bar first-ad chip steps aside when it would say the same thing twice: while the first-ad pill is up,
  // and while the MY FIRST AD tape on the phone itself has slid up next to it
  if (!S.adPlayed) {
    const t = toScreen(0, -546), st = pillFind && pillFind.id === 'ad1' ? 'gone2' : (Math.abs(t[1] - chipY) < 70 && Math.abs(t[0] - chipX) < 150) ? 'faint' : '';      // (only when the tape is right under the chip: beside the counter, on a wide screen, the chip stays)
    if (st !== chipState) { el.chip.classList.remove('gone2', 'faint'); if (st) el.chip.classList.add(st); chipState = st; }
  }
}
export function markPlayed() { labels.forEach(L => L.d.classList.add('played')); if (!el.chip.classList.contains('gone')) { el.chip.classList.add('gone'); fitBlade(); } }

// ---------- the Play pill ----------
// A video: one pill that plays it. A thing with a data-go: a pill that goes to its place in the plain resume. A thing
// with links of its own in the plain resume (the app): one pill holding those links as buttons. They are real links
// with target=_blank, built from the document's own, so each opens a new tab only when it is itself tapped.
export function pill(f) {
  const vid = f.video || f.yt, links = !vid && !f.go ? f.el.querySelectorAll(':scope > .links a[href^="http"]') : null, lk = !!(links && links.length);
  if (!vid && !f.go && !lk) return;
  if (pillFind === f) { pillAt = S.rt; return; }
  pillFind = f; pillAt = S.rt;
  const on = lk ? el.links : el.pill, off = lk ? el.pill : el.links;
  off.classList.remove('up'); off.hidden = true;
  if (lk) {
    el.links.textContent = '';
    links.forEach(a => { const b = document.createElement('a'); b.href = a.href; b.target = '_blank'; b.rel = 'noopener'; b.innerHTML = '<span>' + a.textContent + '</span>' + OUT; el.links.appendChild(b); });
  } else {
    const parts = f.pill.split(' · ').map(s => /^\d+:\d\d$/.test(s) ? '<b class="num">' + s + '</b>' : s);
    el.pt.innerHTML = parts.join('<span class="sep">·</span>');
    el.pp.innerHTML = vid ? PLAY : GO;
    el.pill.setAttribute('aria-label', f.pill);
  }
  on.style.setProperty('--t', TRACK[f.track].tape);
  on.hidden = false;
  requestAnimationFrame(() => { if (pillFind === f) on.classList.add('up'); });
}
function pillAct() {
  const f = pillFind; if (!f) return;
  if (f.video || f.yt) { openPlayer(f); return; }
  if (!f.go) { const a = el.links.querySelector('a'); if (a) a.focus(); return; }     // links never open by themselves: Enter moves to the first one
  hidePill(); window.ygView(false);                       // the plain resume, at this thing's section
  const t = $(f.go); if (t) t.scrollIntoView();
}
export function pillUp() { return !!pillFind; }
// the find labels step back (the three-track strips are up, or the camera is showing the whole desk)
export function labelsDim(on) { el.labels.classList.toggle('dim', !!on); }
// a pill (or the app's two links) is on screen right now, not tucked away
export function pillShown() { const e = el.pill.classList.contains('up') ? el.pill : el.links.classList.contains('up') ? el.links : null; return !!e && !e.classList.contains('tuck') && !(e === el.links && away); }
// a label has only just been slapped on (its first second and a half)
export function labelFresh() { for (const L of labels) if (!L.out && S.rt - L.t < 1.5) return true; return false; }
// the app's two links step down while less than half of the phone is on screen
export function linksAway(on) { if (on !== away) { away = on; el.links.classList.toggle('away', on); } }
// a dark plate behind the counter, while something of its own gold lies under it
export function counterPlate(on) { if (on !== plate) { plate = on; el.tm.classList.toggle('plate', on); } }
// is this find's Play pill up right now? (then a tap on its screen plays it too)
export function pillIs(f) { return pillFind === f && el.pill.classList.contains('up') && !el.pill.classList.contains('tuck'); }
// A new find has fired that has no pill of its own. The pill still up belongs to an earlier find: it goes now, unless
// the van is still within 240 units of that one. (The 4 s minimum is for driving away, not for outliving a newer find.)
export function pillYield(van) { if (pillFind && Math.hypot(van.x - pillFind.x, van.y - pillFind.y) > 240) hidePill(); }
export function pillTuck(on) { el.pill.classList.toggle('tuck', !!on); el.links.classList.toggle('tuck', !!on); }
// stays while the van is within 240 units, and at least 4 s
export function tickPill(van) {
  if (!pillFind) return;
  if (S.rt - pillAt > 4 && Math.hypot(van.x - pillFind.x, van.y - pillFind.y) > 240) hidePill();
}
export function hidePill() { pillFind = null; el.pill.classList.remove('up'); el.links.classList.remove('up'); setTimeout(() => { if (!pillFind) { el.pill.hidden = true; el.links.hidden = true; } }, 320); }

// ---------- the player: one shared <video>, full screen, sound on because a tap opened it ----------
// A YouTube video (spec 6.3): the embed is created here, inside the tap, and not a moment before. Until then nothing
// has been asked of YouTube: the sheet in the woods and the tile in the reel show a thumbnail saved with the site.
export function openPlayer(f) {
  if (!f || !(f.video || f.yt) || playing) return;
  if (poster) endPoster();
  playing = f;
  const v = el.video;
  el.player.hidden = false;
  if (f.yt) {
    v.hidden = true; el.yt.hidden = false;
    el.ytf.style.backgroundImage = 'url(' + MEDIA + 'yt-' + f.yt + '.jpg)';
    const fr = document.createElement('iframe');
    fr.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
    fr.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin'); fr.title = f.head ? f.head.textContent.trim() : 'Video';
    fr.src = 'https://www.youtube-nocookie.com/embed/' + f.yt + '?autoplay=1&playsinline=1&rel=0';
    el.ytf.appendChild(fr);
    el.ytcap.innerHTML = '<div class="tape still" style="--t:' + TRACK[f.track].tape + '">' + tapeHTML(f) + '</div>';
    el.ytopen.href = 'https://www.youtube.com/watch?v=' + f.yt;
  } else {
    v.hidden = false; el.yt.hidden = true;
    v.poster = MEDIA + f.video + '.jpg';
    v.muted = false; v.volume = 1;
    v.src = MEDIA + f.video + '.mp4';
    const p = v.play();
    if (p && p.catch) p.catch(() => { /* refused: the native controls are on screen, one more tap plays it */ });
  }
  audio.hold(true); hooks.pause();
}
export function closePlayer() {
  const v = el.video;
  if (!playing) {                                         // the #ad1 poster, closed without playing: the game is there behind it
    if (poster) { endPoster(); v.removeAttribute('poster'); el.player.hidden = true; if (pillFind) pillAt = S.rt; hooks.resume(); }
    return;
  }
  if (playing.yt) { el.ytf.textContent = ''; el.ytf.style.backgroundImage = ''; el.ytcap.textContent = ''; el.yt.hidden = true; v.hidden = false; }     // the embed is thrown away: it stops
  else { v.pause(); v.removeAttribute('src'); v.removeAttribute('poster'); v.load(); }       // nothing keeps downloading
  el.player.hidden = true; playing = null;
  if (S.adPlayed) markPlayed();
  if (pillFind) pillAt = S.rt;
  if (reelOn) refreshReel();
  audio.hold(false); hooks.resume();
}
// something is open over the game (a player, the #ad1 poster, the reel): the loop stays stopped
export function busy() { return !!playing || !!poster || reelOn; }
export function playerOpen() { return busy(); }

// #ad1 (spec 9.8): the first ad's poster, full screen, with its Play pill. The tap on the pill plays it with sound.
export function openPoster(f) {
  poster = f; const v = el.video;
  el.player.hidden = false; el.stage.classList.add('poster');
  v.hidden = false; el.yt.hidden = true; v.controls = false; v.poster = MEDIA + f.video + '.jpg';
  pill(f); hooks.pause();
}
function endPoster() { poster = null; el.stage.classList.remove('poster'); el.video.controls = true; }

// ---------- the reel (spec 6.3): all ten videos, always one tap away. Nothing is ever locked ----------
// Built once, from the plain resume's own Watch list: the first ad first and double size, the rest in two columns.
// A found one is in colour and wears its tab; an unfound one is dusted and offers "play anyway" and "show me where".
function makeReel() {
  reelMade = true;
  // Four blocks, each a full-width grid with no ragged end: the first ad, double size · ads 2 and 3, side by side ·
  // the three skits in a row · the four films from YouTube, two by two.
  const rows = ['r2', 'r3', 'r2 ry'].map(c => { const d = document.createElement('div'); d.className = 'rg ' + c; return d; });
  document.querySelectorAll('#watch .reel li[data-for]').forEach((li, i) => {
    const f = S.byId[li.dataset.for]; if (!f) return;
    const img = li.querySelector('img'), b = li.querySelector('b'), len = li.querySelector('.len'), yt = !!f.yt, t = document.createElement('div');
    const title = b ? b.textContent.trim() : '', sub = i === 0 && f.after ? f.after.textContent.trim().replace(/\.$/, '') : yt ? 'YouTube' : '';
    t.className = 'rt' + (i === 0 ? ' big' : '') + (yt ? ' yt' : ''); t.dataset.id = f.id; t.style.setProperty('--t', TRACK[f.track].tape);
    t.innerHTML = '<button class="ri" type="button" data-act="play" aria-label="Play ' + title.replace(/"/g, '') + '"><img alt="" decoding="async" src="' + (img.getAttribute('data-src') || img.getAttribute('src')) + '"><i class="pb" aria-hidden="true">' + PLAY + '</i>' +
      (len ? '<em class="len" aria-hidden="true">' + len.textContent + '</em>' : '') + '<span class="tab zz" aria-hidden="true"><b class="zz">' + f.tab + '</b></span></button>' +
      '<p><b>' + title + '</b>' + (sub ? ' <span>' + sub + '</span>' : '') + '</p>' +
      '<div class="ra"><button class="zz" type="button" data-act="play"><span class="zz">' + PLAY + '<i>play anyway</i></span></button><button class="zz" type="button" data-act="where"><span class="zz">' + GO + '<i>show me where</i></span></button></div>';
    if (i === 0) { el.reell.appendChild(t); return; }
    rows[yt ? 2 : /^skit/.test(f.id) ? 1 : 0].appendChild(t);
  });
  // the dust that lies on an unfound one: specks thrown at random, drawn once (never a regular pattern)
  const c = document.createElement('canvas'), g = c.getContext('2d'); c.width = c.height = 220;
  g.fillStyle = 'rgba(237,241,244,.34)'; g.fillRect(0, 0, 220, 220);
  for (let k = 0; k < 900; k++) { const r = Math.random(), x = Math.random() * 220, y = Math.random() * 220, s = r < 0.75 ? 1 : r < 0.95 ? 1.6 : 2.6; g.fillStyle = r < 0.5 ? 'rgba(251,252,253,.9)' : r < 0.85 ? 'rgba(247,243,234,.75)' : 'rgba(197,208,218,.8)'; g.fillRect(x, y, s, s); }
  for (let k = 0; k < 9; k++) { const x = Math.random() * 220, y = Math.random() * 220; g.fillStyle = 'rgba(251,252,253,.13)'; g.beginPath(); g.ellipse(x, y, 12 + Math.random() * 16, 4 + Math.random() * 6, Math.random() * 3, 0, 6.2832); g.fill(); }
  try { el.reel.style.setProperty('--dust', 'url(' + c.toDataURL() + ')'); } catch (e) { /* a plain wash is enough */ }
  rows.forEach(d => { if (d.firstChild) el.reell.appendChild(d); });
}
function refreshReel() {
  let n = 0, all = 0;
  el.reell.querySelectorAll('.rt').forEach(t => { const f = S.byId[t.dataset.id], on = !!f.found; all++; if (on) n++; t.classList.toggle('un', !on); t.querySelector('.ra').hidden = on || !f.live; });
  el.reeln.textContent = n; el.reel.querySelector('.rn').lastChild.textContent = ' of ' + all + ' found';
}
function reelTap(e) {
  const b = e.target.closest ? e.target.closest('[data-act]') : null; if (!b) return;
  const f = S.byId[b.closest('.rt').dataset.id]; if (!f) return;
  if (b.dataset.act === 'play') openPlayer(f);              // with sound: this tap is the gesture. The counter is not touched
  else { closeReel(false); hooks.where(f.id); hooks.resume(); }
}
export function openReel() {
  if (reelOn || playing || poster) return;
  if (!reelMade) makeReel();
  refreshReel();
  reelOn = true; el.reel.hidden = false; el.reelb.setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => { if (reelOn) el.reel.classList.add('on'); });
  hooks.pause();
}
export function closeReel(resume = true) {
  if (!reelOn) return;
  reelOn = false; el.reel.classList.remove('on'); el.reelb.setAttribute('aria-expanded', 'false');
  setTimeout(() => { if (!reelOn) el.reel.hidden = true; }, 280);
  if (pillFind) pillAt = S.rt;
  if (resume) hooks.resume();
}
export function toggleReel() { if (reelOn) closeReel(); else openReel(); }

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
