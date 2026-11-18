// ui.js — the DOM on top of the canvas: counter, lamps, tape labels, the Play pill and the buttons pill, the video
// player, the YouTube player, the reel, the strips of the moment, the first-ad chip. All words come from index.html.
import { S, TRACK, MEDIA, collDist, shown, on } from './world.js';
import * as audio from './audio.js';

const $ = id => document.getElementById(id);
let el = null, hooks = {}, labels = [], pillFind = null, pillAt = 0, pillTall = false, playing = null, poster = null, reelOn = false, reelMade = false, vw = 390, vh = 844, chipState = '', count = 0, chipX = 195, chipY = 26, plate = false, away = false, strips = [], linksFor = null;
const PLAY = '<svg viewBox="0 0 10 11"><path d="M1 .6 9.4 5.5 1 10.4z"/></svg>';
const GO = '<svg class="go" viewBox="0 0 20 12"><path d="M1 6h17M12.5 1 18.5 6l-6 5"/></svg>';
const OUT = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M4 10 10.5 3.5M5 3.2h5.8V9"/></svg>';

export function initUI(h) {
  hooks = h;
  el = {
    tm: $('tm'), n: $('tmn'), tot: $('tmt'), blade: $('tm').querySelector('.blade'), labels: $('labels'),
    pill: $('pill'), pp: $('pill').querySelector('.pp'), pt: $('pill').querySelector('.pt'), player: $('player'), video: $('player').querySelector('video'),
    px: $('px'), chip: $('chip'), three: $('three'), more: $('more'), links: $('links'), stage: $('stage'), toplain: $('toplain'),
    snd: $('snd'), startb: $('startb'),
    yt: $('yt'), ytf: $('ytf'), ytcap: $('ytcap'), ytopen: $('ytopen'), reel: $('reel'), reell: $('reell'), reeln: $('reeln'), reelb: $('reelb'), rx: $('rx')
  };
  el.tot.textContent = '/' + S.live.length;
  setCount(0, true);
  threeInit();
  // The tap on the pill is the sound gesture: src and play() happen inside this handler (spec 6.3).
  el.pill.addEventListener('click', () => { if (pillFind && el.pill.classList.contains('up')) pillAct(); });
  // The gold chip is a real link to the file; once the game is loaded it opens the game's own player instead.
  el.chip.addEventListener('click', e => { e.preventDefault(); openPlayer(S.byId.ad1); });
  el.links.addEventListener('click', linkTap);
  el.px.addEventListener('click', closePlayer);
  el.video.addEventListener('click', () => { if (poster) openPlayer(poster); });      // on the #ad1 poster, a tap on the poster plays it too
  el.reelb.addEventListener('click', toggleReel);
  el.rx.addEventListener('click', () => closeReel());
  el.reel.addEventListener('click', e => { if (e.target === el.reel) closeReel(); });      // a tap on the dark above the sheet closes it
  el.reell.addEventListener('click', reelTap);
  el.video.addEventListener('playing', () => { if (playing && playing.id === 'ad1') S.adPlayed = true; });
  // sound: the speaker tab and the Start pill are plain buttons with plain click listeners (nothing on their path cancels an event)
  el.snd.addEventListener('click', () => hooks.sound());
  el.startb.addEventListener('click', () => hooks.engine());
  for (const ev of ['pause', 'ended']) el.video.addEventListener(ev, audio.wake);      // iOS: the game's sound is asked back when a video stops
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
    if (stateOf(f) !== old.st) { old.st = stateOf(f); old.d.className = 'tape' + old.st + (f.lab.maxw ? ' nar' : ''); fit(old.d); old.w = old.d.offsetWidth; old.h = old.d.offsetHeight; old.read = readOf(f, old.st); old.placed = false; }      // it has gained a line since
    if (f.lab.pick) f.lab.pick(van);
    if (!f.lab.mid) { old.up = f.lab.flip ? true : f.lab.below ? false : van.y >= f.y - 4; old.at = old.up ? f.lab.up : f.lab.down; old.mid = false; old.placed = false; }
    return;
  }
  labels.forEach(L => dropLabel(L, 'replaced by ' + f.id));
  const d = document.createElement('div');
  const st = stateOf(f); d.className = 'tape' + st;
  d.style.setProperty('--t', TRACK[f.track].tape);
  d.style.setProperty('--r', (Math.random() * 6 - 3).toFixed(1) + 'deg');
  d.innerHTML = tapeHTML(f);
  if (f.lab.maxw) { d.style.maxWidth = f.lab.maxw + 'px'; d.classList.add('nar'); }
  el.labels.appendChild(d); fit(d);
  if (f.lab.pick) f.lab.pick(van);                                 // a thing may choose where its label goes by where the van is
  const up = f.lab.flip ? true : f.lab.below ? false : van.y >= f.y - 4;   // sit on the far side of the thing from the van
  // stk: it wears a date sticker, which hangs 7 px past its right edge · read: how long it stays solid over the van
  const L = { f, d, st, w: d.offsetWidth, h: d.offsetHeight, t: S.rt, up, at: up ? f.lab.up : f.lab.down, out: false, thru: false, mid: !!f.lab.mid, placed: false, stk: !!f.date && !f.lab.only, read: readOf(f, st) };
  labels.push(L); f.tabOn = false; f.labAt = S.rt;                 // labAt: the van does not slide off a thing whose label has only just gone up
}
// A tape whose words run to more than one line is drawn in to the width its longest line needs, so it hugs its words
// and no line ends in half a tape of nothing (with text-wrap: balance in game.css, no word is left alone on a last
// line). A head that is one word too long for one line is set a size or two smaller, if that brings it onto one.
// (Layout is read here, a handful of times, when a label is slapped on or gains a line. Never per frame.)
function fit(d) {
  const h = d.querySelector('.h'); d.style.width = ''; if (h) h.style.fontSize = '';
  const w0 = d.offsetWidth, cap = parseFloat(getComputedStyle(d).maxWidth) || 320;
  if (w0 < cap - 0.5) return;                                      // nothing has wrapped
  if (h && h.offsetHeight > 30) for (const fs of [19, 18, 17.5]) { h.style.fontSize = fs + 'px'; if (h.offsetHeight <= 30) break; if (fs === 17.5) h.style.fontSize = ''; }
  const h0 = d.offsetHeight; let lo = w0 * 0.5, hi = w0;
  for (let i = 0; i < 6; i++) { const m = (lo + hi) / 2; d.style.width = m + 'px'; if (d.offsetHeight > h0) lo = m; else hi = m; }
  d.style.width = Math.ceil(hi) + 'px';
}
// How long a label stays solid when the van is under it: long enough to read what is on it (0.28 s a word, head and
// the lines that are showing), never under a second and a half; a find may ask for longer (lab.read).
const wc = e => e ? e.textContent.trim().split(/\s+/).filter(Boolean).length : 0;
function readOf(f, st) {
  let n = wc(f.head);
  if (!(f.lab && f.lab.only)) { n += wc(f.line); if (f.gains) for (const g of f.gains) if (st.indexOf(' ' + g.when) >= 0) n += wc(g.el); }
  return Math.max(1.5, 0.28 * n, (f.lab && f.lab.read) || 0);
}
// Which of the lines a tape gains later are showing: 'played' once the first ad has been played, 'full' once the
// tray is full, 'again' when the van has come back to the thing (the second look).
function stateOf(f) { return (S.adPlayed ? ' played' : '') + (f.full ? ' full' : '') + (f.again ? ' again' : ''); }
// a find's words on its tape: head, line, the lines it gains later, the date sticker
function tapeHTML(f) {
  let h = '<div class="tw"><div class="tb zig"><div class="ti zig">';
  if (f.lab && f.lab.only) return h + '<span class="h">' + f.lab.only + '</span></div></div></div>';      // only the head on the tape: the thing itself does the reading
  if (f.head) h += '<span class="h">' + f.head.innerHTML + '</span>';
  if (f.line) h += '<span class="l">' + (f.line.tagName === 'Q' ? '<q>' + f.line.innerHTML + '</q>' : f.line.innerHTML) + '</span>';
  if (f.gains) for (const g of f.gains) h += '<span class="l gn" data-g="' + g.when + '">' + g.el.innerHTML + '</span>';
  h += '</div></div>';
  if (f.date) h += '<small class="d">' + f.date.innerHTML + '</small>';
  return h + '</div>';
}
// a label that is up shows a line its find has just gained (the tray filled, the ad was played)
export function relabel(f) { const L = labels.find(l => l.f === f && !l.out); if (L && stateOf(f) !== L.st) { L.st = stateOf(f); L.d.className = 'tape' + L.st + (f.lab.maxw ? ' nar' : ''); fit(L.d); L.w = L.d.offsetWidth; L.h = L.d.offsetHeight; L.read = readOf(f, L.st); } }
// ?debug=1: every tape that goes before it has had its read time, and why (__g.ui.tapeLog)
export const tapeLog = [];
function dropLabel(L, why) {
  if (L.out) return; L.out = true; L.d.classList.add('out');
  if (window.__g && S.rt - L.t < L.read) { tapeLog.push({ id: L.f.id, age: +(S.rt - L.t).toFixed(2), read: +L.read.toFixed(2), why: why || '?', at: +S.rt.toFixed(2) }); if (tapeLog.length > 60) tapeLog.shift(); }
  setTimeout(() => { L.d.remove(); labels = labels.filter(x => x !== L); if (!labels.some(x => x.f === L.f)) L.f.tabOn = true; }, 230);
}
// Where a label's box lands on screen for a spot (world) and a way of hanging there: over it (up), under it, or centred on it (mid)
// loose: its thing is leaving the screen, so the label is not held in view: it leaves with it
function boxAt(L, at, up, mid, toScreen, top, bottom, loose) {
  const s = toScreen(at[0], at[1]);
  let x = s[0] - L.w / 2, y = mid ? s[1] - L.h / 2 : up ? s[1] - L.h : s[1];
  if (loose) return [x, y];
  const mr = L.stk ? 18 : 8;                                       // (a date sticker hangs past the label's right edge: it too stays on the screen)
  x = x < 8 ? 8 : x > vw - L.w - mr ? vw - L.w - mr : x;
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
  if (L.mid || L.f.lab.fix) return;                               // (fix: a label with one place of its own)
  const f = L.f, rects = [[v[0] - 35, v[1] - 35, v[0] + 35, v[1] + 35]];
  const add = (x0, y0, x1, y1) => { const a = toScreen(x0, y0), b = toScreen(x1, y1); if (b[0] > 0 && a[0] < vw && b[1] > 0 && a[1] < vh) rects.push([a[0], a[1], b[0], b[1]]); };
  for (const q of S.live) if (q.scr && (q.video || q.yt) && (q.found || (q.video && !(q.near < 0.3)))) add(q.scr[0], q.scr[1], q.scr[2], q.scr[3]);
  const ap = S.byId.app; if (ap && ap.found && ap.box) add(ap.box[0], ap.box[1], ap.box[2], ap.box[3]);
  const ln = S.byId.line; if (ln && ln.found && ln !== f && !f.lab.onLine) add(ln.x - 80, ln.y - 112, ln.x + 80, ln.y + 112);      // the taped sheet, once it can be read (its written part: the margin may be touched)
  const sl = S.says.slate; if (sl && sl !== f && sl.box) add(sl.box[0], sl.box[1], sl.box[2], sl.box[3]);      // the slate's board: the one place the kinds of video are read
  const free = (at, up, mid) => { const [x, y] = boxAt(L, at, up, mid, toScreen, top, bottom); for (const r of rects) if (x < r[2] && x + L.w > r[0] && y < r[3] && y + L.h > r[1]) return false; return true; };
  // (beside: 70 px out from a small thing's middle; the app phone, whose whole box no label may cover (lab.clear), is
  // cleared by its whole width, so on a phone on its side its tape stands next to the phone and not across the tray)
  const s = toScreen(f.x, f.y), side = s[0] > vw / 2 ? -1 : 1, k = Math.abs(toScreen(1, 0)[0] - toScreen(0, 0)[0]) || 1, fb = f.lab.clear ? f.box : null;
  const dx = fb ? (fb[2] - fb[0]) / 2 + (L.w / 2 + 16) / k : (L.w / 2 + 70) / k, sy0 = fb ? (fb[1] + fb[3]) / 2 : f.y - 46;
  // (after the two sides: under it, just past the van that is parked at its foot · then further below, clear of whatever lies under it)
  const dn = f.lab.down, vy = vanY + 40 / k, tries = [[L.at, L.up, false], [L.up ? dn : f.lab.up, !L.up, false], [[f.x + side * dx, sy0], false, true], [[f.x - side * dx, sy0], false, true],
    [[dn[0], Math.max(dn[1], vy)], false, false], [[dn[0], dn[1] + 120], false, false], [[dn[0], dn[1] + 235], false, false]];
  for (const [at, up, mid] of tries) if (free(at, up, mid)) { L.at = at; L.up = up; L.mid = mid; return; }
}
// toScreen(wx, wy) -> [cssX, cssY]; no layout is read here
export function updateLabels(toScreen, van, pillUp) {
  const top = 92, bottom = vh - (pillUp ? (pillTall ? 156 : 100) : 16), v = toScreen(van.x, van.y);
  for (const L of labels) {
    if (!L.placed) { L.placed = true; place(L, toScreen, v, top, bottom, van.y); }
    // A label is held in view only while at least half of its thing is on screen. Less than that and it leaves with the
    // thing (and so never comes to rest on something else). The one exception is a label that is still being read with
    // the van at its thing (hold): the camera may be looking elsewhere at that moment (a screen found a second ago is
    // still framed), and a find's words must never go unseen. It stays on screen for its read time.
    const age = S.rt - L.t, c = L.f.prop && L.f.prop.coll, far = c ? collDist(c, van.x, van.y) > 90 : Math.hypot(van.x - L.f.x, van.y - L.f.y) > 130;
    const hold = !far && age < Math.max(L.read, L.f.lab.min || 1.6);
    const r = thingRect(L.f), loose = !hold && shown(r[0], r[1], r[2], r[3]) < 0.5;
    const [sx, sy] = toScreen(L.at[0], L.at[1]), [x, y] = boxAt(L, L.at, L.up, L.mid, toScreen, top, bottom, loose);
    L.d.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
    // the van is never hidden for long: once a label has had a second and a half to be read, it goes nearly clear while the van is under it
    // (its thing, not the spot the label hangs from: a label put beside a wide thing hangs from a spot that may itself be past the screen's edge)
    const ts = L.mid ? toScreen(L.f.x, L.f.y) : [sx, sy], off = ts[0] < -30 || ts[0] > vw + 30 || ts[1] < top - 70 || ts[1] > vh + 40;       // its thing has left the screen
    const thru = age > L.read && v[0] > x - 26 && v[0] < x + L.w + 26 && v[1] > y - 26 && v[1] < y + L.h + 26;
    if (thru !== L.thru) { L.thru = thru; L.d.classList.toggle('thru', thru); }
    // every label gets time to be read first; but one that is leaving with its thing goes as soon as half of it is past the edge (never a cut-off strip of tape at the side of the screen)
    const gone = loose && Math.max(0, Math.min(x + L.w, vw) - Math.max(x, 0)) * Math.max(0, Math.min(y + L.h, vh) - Math.max(y, top)) < L.w * L.h * 0.5;
    // (max: a label that would otherwise stay for as long as the van is parked at its thing, in front of what the thing shows, goes after that long; its tab stays, and a bump brings it back)
    const late = age > (L.f.lab.min || 1.6), max = L.f.lab.max && age > Math.max(L.f.lab.max, L.read + 0.5);
    if (!L.out && (gone || (late && (far || (off && !hold))) || max)) dropLabel(L, gone ? 'gone' : max ? 'max' : far ? 'far' : 'off');
  }
  // the top-bar first-ad chip steps aside when it would say the same thing twice: while the first-ad pill is up,
  // and while the MY FIRST AD tape on the phone itself has slid up next to it
  if (!S.adPlayed) {
    const t = toScreen(0, -546), st = pillFind && pillFind.id === 'ad1' ? 'gone2' : (Math.abs(t[1] - chipY) < 70 && Math.abs(t[0] - chipX) < 150) ? 'faint' : '';      // (only when the tape is right under the chip: beside the counter, on a wide screen, the chip stays)
    if (st !== chipState) { el.chip.classList.remove('gone2', 'faint'); if (st) el.chip.classList.add(st); chipState = st; }
  }
}
export function markPlayed() { labels.forEach(L => { if (L.st !== stateOf(L.f)) { L.d.classList.add('played'); L.st = stateOf(L.f); fit(L.d); L.w = L.d.offsetWidth; L.h = L.d.offsetHeight; L.read = readOf(L.f, L.st); } }); if (!el.chip.classList.contains('gone')) { el.chip.classList.add('gone'); fitBlade(); } }

// ---------- the Play pill, and the buttons pill ----------
// A video and nothing else: one pill that plays it. A thing with buttons of its own in the document (its .links): one
// pill holding them, two to a row. A button is a real link with target=_blank, built from the document's own, so it
// opens a new tab only when it is itself tapped; or the Email button (the address is put together on the first tap,
// the next tap is a mail link); or a play button, for the find's own video or for a YouTube video named on the link
// (data-yt): the player and the embed are made inside that tap, never before.
const btns = f => f.el ? [...f.el.querySelectorAll(':scope > .links > a')].filter(on) : [];
const parts = t => t.split(' · ').map(s => '<span class="part">' + (/^\d+:\d\d$/.test(s) ? '<b class="num">' + s + '</b>' : s) + '</span>').join('<span class="sep">·</span>');
export function pill(f) {
  const vid = f.video || f.yt, links = btns(f), lk = links.length > 0;
  if (!vid && !lk) return false;
  if (pillFind === f) { pillAt = S.rt; return true; }
  pillFind = f; pillAt = S.rt;
  const up = lk ? el.links : el.pill, off = lk ? el.pill : el.links;
  off.classList.remove('up'); off.hidden = true;
  // The buttons bar is one element shared by every find that has buttons. "Stepped down" (away) belongs to the find
  // that asked for it, never to the bar: whoever takes the bar now starts with it in view.
  linksFor = lk ? f : null; if (away) { away = false; el.links.classList.remove('away'); }
  if (lk) {
    el.links.textContent = '';
    if (vid) { const b = document.createElement('button'); b.type = 'button'; b.className = 'pl'; b.dataset.act = 'play'; b.innerHTML = PLAY + '<span>' + parts(f.pill) + '</span>'; b.setAttribute('aria-label', f.pill); el.links.appendChild(b); }
    links.forEach(a => {
      let b;
      if (a.dataset.yt) { b = document.createElement('button'); b.type = 'button'; b.className = 'pl'; b.dataset.yt = a.dataset.yt; b.innerHTML = PLAY + '<span>' + parts(a.textContent.trim()) + '</span>'; }
      else if (a.hasAttribute('data-mail')) { b = document.createElement('a'); b.href = '#contact'; b.setAttribute('data-mail', ''); b.textContent = a.textContent; }      // the page's own script shows the address on the first tap
      else { b = document.createElement('a'); b.href = a.href; b.target = '_blank'; b.rel = 'noopener'; b.innerHTML = '<span>' + a.textContent + '</span>' + OUT; }
      el.links.appendChild(b);
    });
    const n = el.links.children.length; pillTall = n > 2 && !(vw >= 700 && vh <= 480);      // (a phone on its side: they stand in one row, game.css)
    el.links.classList.toggle('tall', n > 2); el.links.classList.toggle('odd', n % 2 === 1);
  } else {
    pillTall = false;
    el.pt.innerHTML = parts(f.pill);
    el.pp.innerHTML = PLAY;
    el.pill.setAttribute('aria-label', f.pill);
    // Too long for one line at this width: first a size smaller; if that is still too long, onto two lines, broken
    // before its last part (so no dot is left hanging at the end of a line), never mid-phrase.
    el.pill.classList.remove('wrap');
    if (el.pt.scrollWidth > el.pt.clientWidth + 1) {
      el.pill.classList.add('wrap');
      const i = el.pt.innerHTML.lastIndexOf('<span class="sep">');
      if (el.pt.scrollWidth > el.pt.clientWidth + 1 && i > 0) el.pt.innerHTML = el.pt.innerHTML.slice(0, i) + '<br>' + el.pt.innerHTML.slice(el.pt.innerHTML.indexOf('</span>', i) + 7);
    }
  }
  up.style.setProperty('--t', TRACK[f.track].tape);
  up.hidden = false;
  requestAnimationFrame(() => { if (pillFind === f) up.classList.add('up'); });
  return true;
}
// a tap on one of the buttons pill's play buttons (a link is its own tap)
function linkTap(e) {
  const b = e.target.closest ? e.target.closest('button') : null, f = pillFind; if (!b || !f || !el.links.classList.contains('up')) return;
  if (b.dataset.yt) openPlayer({ ...f, video: null, yt: b.dataset.yt, sub: f });      // a YouTube video offered by this find: its tape goes under the player
  else openPlayer(f);
}
function pillAct() {
  const f = pillFind; if (!f) return;
  if (el.pill.classList.contains('up')) { openPlayer(f); return; }
  const a = el.links.querySelector('a,button'); if (a) a.focus();     // links never open by themselves: Enter moves to the first button
}
export function pillUp() { return !!pillFind; }
// the find labels step back (the strips of the moment are up, or the camera is showing the whole desk)
export function labelsDim(on) { el.labels.classList.toggle('dim', !!on); }
// a pill (or the app's two links) is on screen right now, not tucked away
export function pillShown() { const e = el.pill.classList.contains('up') ? el.pill : el.links.classList.contains('up') ? el.links : null; return !!e && !e.classList.contains('tuck') && !(e === el.links && away); }
// a label has only just been slapped on (its first second and a half)
export function labelFresh() { for (const L of labels) if (!L.out && S.rt - L.t < 1.5) return true; return false; }
// the find whose full tape is up right now (null: none)
export function labelUp() { const L = labels.find(l => !l.out); return L ? L.f : null; }
// the youngest label's age in seconds (a big number when none is up): the app's moment waits for a tape to be read
export function labelAge() { let a = 1e9; for (const L of labels) if (!L.out && S.rt - L.t < a) a = S.rt - L.t; return a; }
// how long the pill has been up without being used, in seconds
export function pillAge() { return pillFind ? S.rt - pillAt : 0; }
// the find whose buttons are in the buttons bar right now (null: a Play pill, or nothing)
export function linksOwner() { return linksFor; }
// the app's buttons step down while less than half of the phone is on screen (asked only while the bar is the app's: desk.js)
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
export function pillH() { return pillFind ? (pillTall ? 152 : 96) : 28; }      // how much of the foot of the screen a pill takes
export function hidePill() { pillFind = null; linksFor = null; el.pill.classList.remove('up'); el.links.classList.remove('up'); setTimeout(() => { if (!pillFind) { el.pill.hidden = true; el.links.hidden = true; } }, 320); }

// ---------- sound: the speaker tab in the top bar, and the pill that starts the engine ----------
// The tab draws the truth: waves when sound is really running, crossed when it is not; gold while sound is wanted but
// still locked (no tap has unlocked it yet), and then a tap on it is the unlock. Its words are the document's own.
let tipT = 0, startWant = false;
export function soundTab(live, wanted, show) {
  const b = el.snd; if (show) b.hidden = false;
  b.classList.toggle('on', live); b.classList.toggle('lock', wanted && !live);
  b.setAttribute('aria-label', live ? b.dataset.on : b.dataset.off);
  if (live || !wanted) soundTip(false);
}
// the small tape beside the tab, for four seconds
export function soundTip(on) { clearTimeout(tipT); el.snd.classList.toggle('tip', !!on); if (on) tipT = setTimeout(() => el.snd.classList.remove('tip'), 4000); }
export function startPill(on) {
  const b = el.startb; startWant = !!on;
  if (on) { b.hidden = false; requestAnimationFrame(() => { if (startWant) b.classList.add('up'); }); }
  else { b.classList.remove('up'); setTimeout(() => { if (!startWant) b.hidden = true; }, 320); }
}

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
    // behind the embed while it loads: the thumbnail saved with the site; none for a video whose picture is a drawn card (the weekly recap)
    const own = f.sub || f, drawn = !!(own.el && own.el.querySelector(':scope > [data-sheet]'));
    el.ytf.style.backgroundImage = drawn ? '' : 'url(' + MEDIA + 'yt-' + f.yt + '.jpg)';
    const fr = document.createElement('iframe');
    fr.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
    fr.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin'); fr.title = f.title || (f.head ? f.head.textContent.trim() : 'Video');
    fr.src = 'https://www.youtube-nocookie.com/embed/' + f.yt + '?autoplay=1&playsinline=1&rel=0';
    el.ytf.appendChild(fr);
    el.ytcap.innerHTML = '<div class="tape still' + stateOf(f.sub || f) + '" style="--t:' + TRACK[f.track].tape + '">' + (f.title ? '<div class="tw"><div class="tb zig"><div class="ti zig"><span class="h">' + f.title + '</span></div></div></div>' : tapeHTML(f)) + '</div>';
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

// ---------- the reel (spec 6.3): every video, always one tap away. Nothing is ever locked ----------
// Built once, from the document's own Watch list: the first ad first and double size, the rest in rows.
// A found one is in colour and wears its tab; an unfound one is dusted and offers "play anyway" and "show me where".
// A tile with no find of its own is a plain YouTube tile: it plays, and that is all. A tile with a drawn card in
// place of a picture (the weekly recap) shows that card.
function makeReel() {
  reelMade = true;
  // Four blocks, each a full-width grid with no ragged end: the first ad, double size · ads 2 and 3, side by side ·
  // the three skits in a row · the films from YouTube, two by two.
  const rows = ['r2', 'r3', 'r2 ry'].map(c => { const d = document.createElement('div'); d.className = 'rg ' + c; return d; });
  document.querySelectorAll('#watch .reel li').forEach((li, i) => {
    const f = li.dataset.for ? S.byId[li.dataset.for] : null, id = li.dataset.yt || ''; if (!f && !id) return;
    if (f && !f.live) return;
    const img = li.querySelector('img'), card = li.querySelector('.wk'), b = li.querySelector('b'), cap = li.querySelector('.cap'), len = li.querySelector('.len'), yt = f ? !!f.yt : true, t = document.createElement('div');
    const title = b ? b.textContent.trim() : '', sub = cap ? cap.textContent.trim() : '';
    t.className = 'rt' + (i === 0 ? ' big' : '') + (yt ? ' yt' : ''); t.dataset.id = f ? f.id : ''; t.dataset.yt = id; t.dataset.title = title; t.style.setProperty('--t', TRACK[f ? f.track : 'v'].tape);
    t.innerHTML = '<button class="ri" type="button" data-act="play" aria-label="Play ' + (title || sub).replace(/"/g, '') + '">' + (card ? card.outerHTML : '<img alt="" decoding="async" src="' + (img.getAttribute('data-src') || img.getAttribute('src')) + '">') + '<i class="pb" aria-hidden="true">' + PLAY + '</i>' +
      (len ? '<em class="len" aria-hidden="true">' + len.textContent + '</em>' : '') + (f ? '<span class="tab zz" aria-hidden="true"><b class="zz">' + f.tab + '</b></span>' : '') + '</button>' +
      '<p>' + (title ? '<b>' + title + '</b> ' : '') + (sub ? '<span>' + sub + '</span>' : '') + (yt ? ' <i>YouTube</i>' : '') + '</p>' +
      (f ? '<div class="ra"><button class="zz" type="button" data-act="play"><span class="zz">' + PLAY + '<i>play anyway</i></span></button><button class="zz" type="button" data-act="where"><span class="zz">' + GO + '<i>show me where</i></span></button></div>' : '');
    if (i === 0) { el.reell.appendChild(t); return; }
    rows[yt ? 2 : f && /^skit/.test(f.id) ? 1 : 0].appendChild(t);
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
  el.reell.querySelectorAll('.rt').forEach(t => { const f = S.byId[t.dataset.id]; if (!f) return; const on = !!f.found; all++; if (on) n++; t.classList.toggle('un', !on); t.querySelector('.ra').hidden = on || !f.live; });
  el.reeln.textContent = n; el.reel.querySelector('.rn').lastChild.textContent = ' of ' + all + ' found';
}
function reelTap(e) {
  const b = e.target.closest ? e.target.closest('[data-act]') : null; if (!b) return;
  const t = b.closest('.rt'), f = S.byId[t.dataset.id];
  if (!f) { if (t.dataset.yt) openPlayer({ yt: t.dataset.yt, track: 'v', title: t.dataset.title }); return; }
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

// ---------- the strips of the moment ----------
// One dated strip for each main section that is built, in the document's order, then one strip across the middle
// whose number word is the number of those sections, then how many are still to find.
function threeInit() {
  strips = [...el.three.querySelectorAll('.st')].filter(p => { const live = on(p); p.hidden = !live; return live; });
  el.three.querySelectorAll('[data-n]').forEach(n => { n.hidden = +n.dataset.n !== strips.length; });
}
export const threeTracks = () => strips.map(p => p.dataset.track);
// more: how many are still to find · visited: { track: count }; a section with nothing found yet gets a pencilled strip
export function threeShow(more, visited) {
  el.labels.classList.add('dim');                       // the find labels step back while the strips are up
  el.three.hidden = false; el.three.classList.remove('bye');
  el.three.querySelectorAll('p').forEach(p => p.classList.remove('in'));
  strips.forEach(p => p.classList.toggle('pen', !visited[p.dataset.track]));
  el.more.textContent = more; el.three.querySelector('.s4').style.display = more > 0 ? '' : 'none';
}
// step i: a section's strip, then the strip across the middle, then the small one
export function threeStep(i) {
  const n = strips.length;
  if (i < n) strips[i].classList.add('in'); else el.three.querySelector(i === n ? '.sm' : '.s4').classList.add('in');
}
export function threeBye() { el.three.classList.add('bye'); el.labels.classList.remove('dim'); setTimeout(() => { el.three.hidden = true; }, 400); }
