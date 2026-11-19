// ui.js — the DOM on top of the canvas: counter, lamps, tape labels, the Play pill and the buttons pill, the video
// player, the YouTube player, the reel, the explainer of a machine on the bench, the strips of the moment, the first-ad
// chip. All words come from index.html.
import { S, TRACK, MEDIA, collDist, shown, on } from './world.js';
import * as audio from './audio.js';
import { insideStrip } from './deskart.js';

const $ = id => document.getElementById(id);
let el = null, hooks = {}, labels = [], pillFind = null, pillAt = 0, pillTall = false, playing = null, poster = null, reelOn = false, reelMade = false, vw = 390, vh = 844, chipState = '', count = 0, chipX = 195, chipY = 26, plate = false, away = false, strips = [], linksFor = null;
const PLAY = '<svg viewBox="0 0 10 11"><path d="M1 .6 9.4 5.5 1 10.4z"/></svg>';
const GO = '<svg class="go" viewBox="0 0 20 12"><path d="M1 6h17M12.5 1 18.5 6l-6 5"/></svg>';
const OUT = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M4 10 10.5 3.5M5 3.2h5.8V9"/></svg>';
// (game clarity, 2026-11-19) the details pill's find, its card's find, the panel, the toast, the intro card
let moreFor = null, pillMain = false, det = null, achOn = false, toastT = 0, toastGo = 0, introOn = false;
const CHEV = '<svg class="go" viewBox="0 0 8 12" aria-hidden="true"><path d="M2 2l4 4-4 4"/></svg>';
const LOCK = '<svg viewBox="0 0 12 14" aria-hidden="true"><rect x="1.5" y="6" width="9" height="7" rx="1.4"/><path d="M3.6 6V4.3a2.4 2.4 0 0 1 4.8 0V6"/></svg>';

export function initUI(h) {
  hooks = h;
  el = {
    tm: $('tm'), n: $('tmn'), tot: $('tmt'), blade: $('tm').querySelector('.blade'), labels: $('labels'),
    pill: $('pill'), pp: $('pill').querySelector('.pp'), pt: $('pill').querySelector('.pt'), player: $('player'), video: $('player').querySelector('video'),
    px: $('px'), chip: $('chip'), three: $('three'), more: $('more'), links: $('links'), stage: $('stage'), toplain: $('toplain'),
    snd: $('snd'), startb: $('startb'),
    yt: $('yt'), ytf: $('ytf'), ytcap: $('ytcap'), ytopen: $('ytopen'), reel: $('reel'), reell: $('reell'), reeln: $('reeln'), reelb: $('reelb'), rx: $('rx'),
    how: $('how'), howh: $('howh').querySelector('b'), howd: $('howd'), howp: $('howp'), howc: $('howc'), hdots: $('how').querySelector('.hdots'), howcap: $('howcap'), howl: $('howl'), howcard: $('howcard'), howfoot: $('howfoot'), hx: $('hx')
  };
  el.smalls = $('smalls'); el.note = $('note');
  el.intro = $('intro'); el.morep = $('morep'); el.det = $('det'); el.deth = $('deth').querySelector('b'); el.detpic = $('detpic'); el.detbody = $('detbody'); el.detx = $('detx');
  el.ach = $('ach'); el.achl = $('achl'); el.achn = $('achn'); el.acht = $('acht'); el.achx = $('achx'); el.achnf = $('achnf'); el.achb = $('achb'); el.tmb = $('tmb'); el.toast = $('achtoast'); el.toastTab = $('achtoast').querySelector('em');
  // the note card is one real button: a tap, Enter or Space puts it down (not the touch that has just ended the moment)
  if (el.note) el.note.addEventListener('click', () => { if (!(hooks.ended && hooks.ended())) dropSmall('tap'); });
  el.tot.textContent = '/' + S.live.length;
  el.tm.querySelectorAll('.lamps i').forEach(i => { i.hidden = !on(i); });      // a lamp whose table is not built yet is not shown
  setCount(0, true);
  threeInit();
  // The tap on the pill is the sound gesture: src and play() happen inside this handler (spec 6.3).
  // (the touch that ended the moment is not also a press of the pill, which slides back up under that very thumb)
  el.pill.addEventListener('click', () => { if (pillFind && el.pill.classList.contains('up') && !(hooks.ended && hooks.ended())) pillAct(); });
  // The gold chip is a real link to the file; once the game is loaded it opens the game's own player instead.
  el.chip.addEventListener('click', e => { e.preventDefault(); openPlayer(S.byId.ad1); });
  el.links.addEventListener('click', linkTap);
  el.px.addEventListener('click', closePlayer);
  el.video.addEventListener('click', () => { if (poster) openPlayer(poster); });      // on the #ad1 poster, a tap on the poster plays it too
  el.reelb.addEventListener('click', toggleReel);
  el.rx.addEventListener('click', () => closeReel());
  el.reel.addEventListener('click', e => { if (e.target === el.reel) closeReel(); });      // a tap on the dark above the sheet closes it
  el.reell.addEventListener('click', reelTap);
  howInit();
  clarityInit();
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
    if (how) { howKey(e); return; }                         // the explainer's own keys; nothing else is reached while it is open
    if (det) { sheetKey(e, el.det, closeDet); return; }     // so too a details card, and the achievements panel under it
    if (achOn) { sheetKey(e, el.ach, closeAch); return; }
    if (e.key === 'Escape' && (playing || poster)) closePlayer();
    else if (e.key === 'Escape' && reelOn) closeReel();
    else if (e.key === 'Escape' && sm && !sm.out) dropSmall('esc');      // a note card (or a small tape) is put down
    else if (e.key === 'Enter' && !playing && !reelOn && pillFind && (el.pill.classList.contains('up') || el.links.classList.contains('up') || el.morep.classList.contains('up')) && (hooks.live() || poster)) {
      if (e.target && e.target.closest && e.target.closest('a,button,video,input,select,textarea')) return;   // Enter on a focused control is that control's own
      pillAct();
    }
  });
}
export function setViewport(w, h) { vw = w; vh = h; if (el) fitBlade(); if (sm && !sm.out) sm.re = true; }      // (an open card or small tape is measured and placed again on its next frame: the card's width and type change with the screen)

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
  if (el.tmb) el.tmb.style.setProperty('--tw', Math.round(Math.max(44, Math.min(Math.min(want, room) + 42, stop - 8))) + 'px');      // the button laid over the counter covers the case and the blade, and ends 4 px short of the chip (its left is 4 px)
}
export function setCount(n, quiet) {
  const more = n > count;
  el.n.textContent = n; count = n;
  if (!quiet && more && S.found.length) unlocked(S.byId[S.found[S.found.length - 1]]);
  fitBlade();
  el.tm.setAttribute('aria-label', n + ' of ' + S.live.length + ' found');
  if (!quiet) { el.tm.classList.remove('tick'); void el.tm.offsetWidth; el.tm.classList.add('tick'); }
}
export function lampOn(track) { const t = TRACK[track], e = t && t.lamp && el.tm.querySelector('.' + t.lamp); if (e) e.classList.add('on'); }

// ---------- tape labels ----------
// A label is slapped on at a find and follows it on screen. There is never more than one full label: it drops to its
// baked one-word tab when another label opens, or when the van has gone 90 units from its thing.
export function addLabel(f, van) {
  if (sm) dropSmall('main');                                       // a main tape always wins: the small tape or the note card goes
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
  const mb = L.stk ? 14 : 0;                                       // (and it hangs 12 px below its foot: kept off the pill under it)
  y = y < top ? top : y > bottom - L.h - mb ? bottom - L.h - mb : y;
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
  const sg = S.says.post; if (sg && sg.sign && f.track === 'g') add(sg.sign[0], sg.sign[1], sg.sign[2], sg.sign[3]);      // the bench's sign, lettered on the steel: a tape of that table keeps off it when it can
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
  const top = 92, bottom = vh - (pillUp ? (pillMain ? (pillTall ? 156 : 100) : 16) + (moreFor ? 58 : 0) : 16), v = toScreen(van.x, van.y);
  toScr = toScreen;
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
    L.x = x; L.y = y;                                                // (where it is: a small tape or a note card keeps off it)
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
  if (sm) updateSmall(toScreen, van, top, bottom, v);
}
export function markPlayed() { labels.forEach(L => { if (L.st !== stateOf(L.f)) { L.d.classList.add('played'); L.st = stateOf(L.f); fit(L.d); L.w = L.d.offsetWidth; L.h = L.d.offsetHeight; L.read = readOf(L.f, L.st); } }); if (!el.chip.classList.contains('gone')) { el.chip.classList.add('gone'); fitBlade(); } }

// ---------- the small slot: ONE small tape or ONE note card, in #smalls, under the main tapes (never in `labels`) ----------
// A small thing's tape is a narrow tape in its table's colour: one line, no head, no sticker. A note is the one #note
// button, a paper card (CONTENT-v2, D; small.js). Neither is a main label: it cannot replace one, and a main label
// going up puts it down (addLabel). It is put where no main label, no screen and no van is, or it is not shown at all.
// f (a note or a small thing of small.js): head, line, track, x, y, lab, a, readT, dropped(why, age).
let sm = null, toScr = null, noteT = 0;                           // toScr: main's toScreen, kept by updateLabels
export function addSmall(f, van) {
  if (!toScr || !el.smalls) return false;
  if (sm && !sm.out) { if (sm.f === f) return true; if (f.note && sm.note) dropSmall('next'); }      // (two notes share the one card)
  const top = 92, bottom = vh - (pillFind ? (pillMain ? (pillTall ? 156 : 100) : 16) + (moreFor ? 58 : 0) : 16);      // (the same foot as updateLabels: the details pill counts)
  let d;
  if (f.note) {
    d = el.note; clearTimeout(noteT); d.className = ''; d.hidden = false;
    // its words, copied from its own <li>: the head on the strip of tape, the sentence on the paper
    d.innerHTML = '<span class="nw"><span class="nh zig"><b class="zig">' + f.head.innerHTML + '</b></span><span class="nb"><span class="np">' + f.line.innerHTML + '</span></span><i class="nf"></i></span>';
    d.style.setProperty('--r', Math.max(-2.5, Math.min(2.5, f.a * 57.3)).toFixed(1) + 'deg');
  } else {
    d = document.createElement('div'); d.className = 'tape sm nar';
    d.style.setProperty('--t', TRACK[f.track].tape); d.style.setProperty('--r', (Math.random() * 4 - 2).toFixed(1) + 'deg');
    d.innerHTML = tapeHTML(f); el.smalls.appendChild(d); fit(d);
  }
  const s = { f, d, note: !!f.note, w: d.offsetWidth, h: d.offsetHeight, t: S.rt, at: f.lab.up, up: true, mid: false, out: false, stk: false, read: f.note ? f.readT : readOf(f, ''), x: 0, y: 0, under: 0, seen: S.rt, thru: false };
  if (!placeSmall(s, van, top, bottom)) { if (s.note) { d.hidden = true; d.textContent = ''; } else d.remove(); return false; }
  if (sm && !sm.out) dropSmall('next');
  sm = s;
  const b = boxAt(s, s.at, s.up, s.mid, toScr, top, bottom); s.x = b[0]; s.y = b[1];
  d.style.transform = 'translate3d(' + s.x.toFixed(1) + 'px,' + s.y.toFixed(1) + 'px,0)';
  if (s.note) { fly(s); d.classList.add('in'); }                  // it flies up from where the paper lies
  return true;
}
// from the card's middle to where its paper lies on the table, in px, and how the paper lies: the way it flies up, and back
function fly(s) {
  const n = toScr(s.f.x, s.f.y), st = s.d.style;
  st.setProperty('--fx', (n[0] - s.x - s.w / 2).toFixed(0) + 'px'); st.setProperty('--fy', (n[1] - s.y - s.h / 2).toFixed(0) + 'px'); st.setProperty('--fr', (s.f.a * 57.3).toFixed(1) + 'deg');
}
export function dropSmall(why) {
  const s = sm; if (!s || s.out) return;
  s.out = true; const d = s.d, age = S.rt - s.t;
  if (s.note) {
    const had = document.activeElement === d;
    if (toScr) fly(s);
    d.classList.add('out');
    noteT = setTimeout(() => { d.hidden = true; d.className = ''; d.textContent = ''; if (sm === s) sm = null; }, 230);
    if (had) $('c').focus({ preventScroll: true });               // the card had the focus: the canvas gets it
  } else { d.classList.add('out'); setTimeout(() => { d.remove(); if (sm === s) sm = null; }, 230); }
  if (s.f.dropped) s.f.dropped(why, age);
}
export const smallUp = () => sm && !sm.out ? sm.f : null;
export const smallRead = () => !sm || sm.out || (!sm.note && S.rt - sm.t >= sm.read);      // (a note card is never "read, so replace it")
export const labelReading = () => labels.some(L => !L.out && S.rt - L.t < L.read);        // a main tape is still inside its read time
// A COPY of place(), not a change to it: the same seven tries (over the thing, under it, beside it on either side,
// under the van, then lower twice), but every main label that is up is a no-go box too, a note's first two spots hang
// from the van and not from the paper, and if nowhere is free it says so (false) instead of settling for the first
// (a note first tries again against the van and the main labels alone).
function placeSmall(s, van, top, bottom, again) {
  // (the van's box grows with the zoom: the van is 46 units long and its roof stands 22 high, so close up its roof
  // reaches past the 70 px box the main tapes keep off; nothing small may lie on any of it)
  const f = s.f, v = toScr(van.x, van.y), k = Math.abs(toScr(1, 0)[0] - toScr(0, 0)[0]) || 1, vw2 = Math.max(35, 28 * k);
  const vbox = p => [p[0] - vw2, p[1] - Math.max(35, 50 * k), p[0] + vw2, p[1] + Math.max(35, 30 * k)];
  let vb = vbox(v), sy = van.y;
  // (a small tape is put clear of where the van will stop, not only of where it is: a van bumped into its thing at speed
  // rolls on while the thumb comes up (a third of a second) and then brakes (900 a second), so it goes on about
  // speed / 1800 + 0.3 s of its own travel, some 150 units from full speed. The box stretches over that whole way, and a
  // tape that cannot hang above it hangs below, where the van drives away from it. A note's card is not moved by this:
  // it is big, and it must open; a van driving on under it already sees through it)
  if (!s.note && van.speed > 30) { const d = van.speed / 1800 + 0.3, e = vbox(toScr(van.x + van.vx * d, van.y + van.vy * d)); sy = van.y + van.vy * d; vb = [Math.min(vb[0], e[0]), Math.min(vb[1], e[1]), Math.max(vb[2], e[2]), Math.max(vb[3], e[3])]; }
  const rects = [vb], pics = [], lit = [];
  const box = (x0, y0, x1, y1) => { const a = toScr(x0, y0), b = toScr(x1, y1); return b[0] > 0 && a[0] < vw && b[1] > 0 && a[1] < vh ? [a[0], a[1], b[0], b[1]] : null; };
  const add = (x0, y0, x1, y1) => { const r = box(x0, y0, x1, y1); if (r) rects.push(r); };
  // (a note's card is nearly as wide as a phone: on its first try it keeps off every screen, found or not, with the
  // lettered sticker over it and 24 to the sides for the card's turn and shadow: a card laid over the first ad's phone
  // looks dropped there carelessly. A small tape keeps off the screens that show a picture, as before. For a card's
  // later rounds, bare: pics, the found screens, which play; lit, the ones not found yet that show their poster)
  for (const q of S.live) if (q.scr && (q.video || q.yt)) {
    const pic = q.found || (q.video && !(q.near < 0.3));
    if (s.note) { add(q.scr[0] - 24, q.scr[1] - 34, q.scr[2] + 24, q.scr[3]); const r = pic && box(q.scr[0], q.scr[1], q.scr[2], q.scr[3]); if (r) (q.found ? pics : lit).push(r); }
    else if (pic) add(q.scr[0], q.scr[1], q.scr[2], q.scr[3]);
  }

  const ap = S.byId.app; if (ap && ap.found && ap.box) add(ap.box[0], ap.box[1], ap.box[2], ap.box[3]);
  const ln = S.byId.line; if (ln && ln.found) add(ln.x - 80, ln.y - 112, ln.x + 80, ln.y + 112);
  const sl = S.says.slate; if (sl && sl.box) add(sl.box[0], sl.box[1], sl.box[2], sl.box[3]);
  const sg = S.says.post; if (sg && sg.sign && f.track === 'g') add(sg.sign[0], sg.sign[1], sg.sign[2], sg.sign[3]);
  // (hard: the van and the main labels, which nothing small may ever cover; the screens and boards before them are soft)
  const hard = [rects[0]]; for (const L of labels) if (!L.out && L.x !== undefined) hard.push([L.x - 6, L.y - 6, L.x + L.w + (L.stk ? 16 : 6), L.y + L.h + (L.stk ? 18 : 6)]);
  let no = rects.concat(hard);
  const free = (at, up, mid) => { const [x, y] = boxAt(s, at, up, mid, toScr, top, bottom); for (const r of no) if (x < r[2] && x + s.w > r[0] && y < r[3] && y + s.h > r[1]) return false; return true; };
  const p = toScr(f.x, f.y), side = p[0] > vw / 2 ? -1 : 1, dx = (s.w / 2 + 70) / k, vy = van.y + 40 / k;
  // (part B: a small tape hangs from the van too, as a note's card does, and both are tried first on the side the van is
  // coming FROM: a van heading up the screen drives under a tape hung over the thing, and a tape the van is under goes
  // nearly clear, so a line of fifteen words could not be read by a visitor who simply drove on)
  const over = [f.x, Math.min(f.y, van.y, sy) - 54], dn = [f.x, Math.max(f.y, van.y, sy) + 46];      // (sy: where a small tape's van stops)
  // (a small tape: a van that is south of its thing came from the south, and drives on over it: so it too counts as
  // heading up the screen, and the tape hangs under it, not where the van is about to be)
  const north = van.vy < -40 || (!s.note && van.y > f.y + 6), tries =
 [north ? [dn, false, false] : [over, true, false], north ? [over, true, false] : [dn, false, false], [[f.x + side * dx, f.y - 46], false, true], [[f.x - side * dx, f.y - 46], false, true],
    [[dn[0], Math.max(dn[1], vy)], false, false], [[dn[0], dn[1] + 120], false, false], [[dn[0], dn[1] + 235], false, false]];
  // (a note: the same two spots, the card pushed to either side as far as the screen allows, then the card hung a card
  // higher (up to the top bar), before it is put beside; and each spot under the van and lower, pushed the same way:
  // between a playing ad on one side of a narrow phone and a lit one on the other, the card may fit only far above the
  // van, or low down and to one side)
  if (s.note) {
    const sh = 120 / k, wide = t => [[[t[0][0] - sh, t[0][1]], t[1], false], [[t[0][0] + sh, t[0][1]], t[1], false]], hi = [[over[0], over[1] - (s.h + 30) / k], true, false];
    tries.splice(2, 0, ...wide(tries[0]), ...wide(tries[1]), hi, ...wide(hi));
    for (let i = tries.length - 3; i < tries.length; i += 3) tries.splice(i + 1, 0, ...wide(tries[i]));
  }
  // A note's card is nearly as wide as a narrow phone: between two screens there may be no place clear of both. A note
  // that is driven over must open, so it has more rounds of the same tries: clear of the van, the main labels and the
  // screens that show a picture (bare, without the sticker and the side room); then clear of the van and the main labels
  // only, taking of those spots the one that lies least on the found screens, which play: a card is never laid on a
  // playing ad while a spot off it is free, and where both ads of a narrow phone are playing it takes the least of one
  // (a small tape just waits).
  // Placed again after a resize or a turn (again), it keeps its spot if that is still clear by the round that chose it.
  const rounds = s.note ? [no, hard.concat(pics, lit), hard] : [no];
  if (again && s.pass !== undefined) { no = rounds[s.pass]; if (free(s.at, s.up, s.mid)) { s.k = k; return true; } }
  for (let i = 0; i < rounds.length; i++) {
    no = rounds[i]; let best = null, least = Infinity;
    for (const t of tries) if (free(t[0], t[1], t[2])) {
      if (i < 2 || !pics.length) { best = t; break; }
      const [x, y] = boxAt(s, t[0], t[1], t[2], toScr, top, bottom); let a = 0;
      for (const r of pics) a += Math.max(0, Math.min(x + s.w, r[2]) - Math.max(x, r[0])) * Math.max(0, Math.min(y + s.h, r[3]) - Math.max(y, r[1]));
      if (a < least) { least = a; best = t; if (!a) break; }
    }
    if (best) { s.at = best[0]; s.up = best[1]; s.mid = best[2]; s.pass = i; s.k = k; return true; }
  }
  return false;
}
// Each frame while one is up. It is clamped as a tape is (under the top bar, over the pill, never under the reel chip)
// and held in view only while its thing is at least half on screen. It goes when: the van is more than 110 units from
// its thing and it is older than 1.6 s; half of it is past the screen's edge; and (a tape only) 2.5 s after its read
// time, even with the van parked at it. It was put clear of the van; if the van then drives under it and stays there
// 0.4 s, it goes nearly clear until the van comes out (the van is never hidden for long).
function updateSmall(toScreen, van, top, bottom, v) {
  const s = sm; if (s.out) return;
  if (s.re) { s.re = false; if (!s.note) fit(s.d); s.w = s.d.offsetWidth; s.h = s.d.offsetHeight; placeSmall(s, van, top, bottom, true); }      // (after a resize or a turn of the phone; it keeps its spot while that is still clear, or if no other is free)
  const f = s.f, now = S.rt, age = now - s.t, far = Math.hypot(van.x - f.x, van.y - f.y) > 110, loose = shown(f.x - 15, f.y - 15, f.x + 15, f.y + 15) < 0.5;
  const b = boxAt(s, s.at, s.up, s.mid, toScreen, top, bottom, loose), x = s.x = b[0], y = s.y = b[1];
  s.d.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
  // (a note's card: only the van's middle really under it. A small tape: any of the van's box, as it was put clear of)
  const k = s.k || 1, on = s.note ? v[0] > x && v[0] < x + s.w && v[1] > y && v[1] < y + s.h
    : v[0] + Math.max(35, 28 * k) > x && v[0] - Math.max(35, 28 * k) < x + s.w && v[1] + Math.max(35, 30 * k) > y && v[1] - Math.max(35, 50 * k) < y + s.h;
  s.under = on ? s.under + now - s.seen : 0; s.seen = now;
  // (part B: a small tape first gets a second and a half to be read, as a main tape does. A note's card goes nearly
  // clear only while the van drives on under it, or once it has had its read time: a van parked under it is reading it)
  // (but a small tape the van drives on in under, the thumb still down past where it was put clear, does not wait that
  // second and a half out: it goes nearly clear at once, and stays so while the van is under it, even once it stops)
  const thru = s.under > 0.4 && (s.note ? Math.abs(van.speed) >= 30 || age > s.read : s.thru || Math.abs(van.speed) >= 30 || age > Math.min(1.5, s.read));
  if (thru !== s.thru) { s.thru = thru; s.d.classList.toggle('thru', thru); }
  const gone = loose && Math.max(0, Math.min(x + s.w, vw) - Math.max(x, 0)) * Math.max(0, Math.min(y + s.h, vh) - Math.max(y, top)) < s.w * s.h * 0.5;
  if (gone) dropSmall('gone'); else if (far && age > 1.6) dropSmall('far'); else if (!s.note && age > s.read + 2.5) dropSmall('read');
}

// ---------- the Play pill, and the buttons pill ----------
// A video and nothing else: one pill that plays it. A thing with buttons of its own in the document (its .links): one
// pill holding them, two to a row. A button is a real link with target=_blank, built from the document's own, so it
// opens a new tab only when it is itself tapped; or the Email button (the address is put together on the first tap,
// the next tap is a mail link); or a play button, for the find's own video or for a YouTube video named on the link
// (data-yt): the player and the embed are made inside that tap, never before.
const btns = f => f.el ? [...f.el.querySelectorAll(':scope > .links > a')].filter(on) : [];
const parts = t => t.split(' · ').map(s => '<span class="part">' + (/^\d+:\d\d$/.test(s) ? '<b class="num">' + s + '</b>' : s) + '</span>').join('<span class="sep">·</span>');
export function pill(f) {
  const vid = f.video || f.yt, links = btns(f), lk = links.length > 0, more = moreOf(f);
  if (!vid && !lk && !f.how && !more) return false;      // (f.how: a machine on the bench. Its pill opens its explainer: openHow)
  if (pillFind === f) { pillAt = S.rt; return true; }
  pillFind = f; pillAt = S.rt;
  morePill(more ? f : null);                    // the details pill: over the find's own pill, or alone where it has none
  pillMain = !!(vid || lk || f.how);
  if (!pillMain) { pillTall = false; linksFor = null; for (const b of [el.pill, el.links]) { b.classList.remove('up'); b.hidden = true; } morePlace(); return true; }
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
      else if (a.hasAttribute('data-talk')) { b = document.createElement('button'); b.type = 'button'; b.dataset.talk = ''; b.innerHTML = '<span>' + a.textContent + '</span>'; }      // the bay's Talk to me: it brings up the contact buttons
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
  morePlace();
  return true;
}
// ---------- the details pill and its card (CONTENT-v2 I4) ----------
// The details block of a main find that is not a machine on the bench (its data-more child), or null. Read once.
function moreOf(f) {
  if (!f || !f.el || !f.id || f.how || S.byId[f.id] !== f) return null;
  if (f.more === undefined) f.more = f.el.querySelector(':scope > [data-more]') || null;
  return f.more;
}
function morePill(f) {
  const b = el.morep; moreFor = f;
  if (!f) { b.classList.remove('up'); setTimeout(() => { if (!moreFor) b.hidden = true; }, 320); return; }
  b.style.setProperty('--t', TRACK[f.track].tape); b.hidden = false;
  requestAnimationFrame(() => { if (moreFor === f) b.classList.add('up'); });
}
// it stands 10 px over whatever pill is up at the foot of the screen (none: in that pill's own place), and steps down
// with the app's buttons when they step down (linksAway)
function morePlace() {
  if (!moreFor) return;
  const h = !pillMain ? 0 : linksFor ? (pillTall ? 120 : 64) : 64;
  el.morep.style.setProperty('--pb', (16 + (h ? h + 10 : 0)) + 'px');
  el.morep.classList.toggle('away', !!(pillMain && linksFor && away));
}
// a tap on one of the buttons pill's play buttons (a link is its own tap)
function linkTap(e) {
  const b = e.target.closest ? e.target.closest('button') : null, f = pillFind; if (!b || !f || !el.links.classList.contains('up')) return;
  if ('talk' in b.dataset) {                    // the garage's contact buttons, here (they stay while the van is near the bay)
    const h = S.byId.home, had = document.activeElement === b; if (!h) return;
    pill({ el: h.el, track: h.track, x: f.x, y: f.y });
    if (had) { const n = el.links.querySelector('a,button'); if (n) n.focus({ preventScroll: true }); }      // (the button that had the focus is gone: the first new one gets it, as Enter on the pill does)
    return;
  }
  if (b.dataset.yt) openPlayer({ ...f, video: null, yt: b.dataset.yt, sub: f });      // a YouTube video offered by this find: its tape goes under the player
  else openPlayer(f);
}
function pillAct() {
  const f = pillFind; if (!f) return;
  if (el.pill.classList.contains('up')) { if (f.how) openHow(f); else openPlayer(f); return; }
  if (!el.links.classList.contains('up')) { if (moreFor === f) openDet(f); return; }      // a find whose only pill is the details pill
  const a = el.links.querySelector('a,button'); if (a) a.focus();     // links never open by themselves: Enter moves to the first button
}
export function pillUp() { return !!pillFind; }
// the find labels step back (the strips of the moment are up, or the camera is showing the whole desk)
export function labelsDim(on) { el.labels.classList.toggle('dim', !!on); }
// a pill (or the app's two links) is on screen right now, not tucked away
export function pillShown() { const e = el.pill.classList.contains('up') ? el.pill : el.links.classList.contains('up') ? el.links : el.morep.classList.contains('up') ? el.morep : null; return !!e && !e.classList.contains('tuck') && !(e === el.links && away); }
// a label has only just been slapped on (its first second and a half)
export function labelFresh() { for (const L of labels) if (!L.out && S.rt - L.t < 1.5) return true; return false; }
// the find whose full tape is up right now (null: none)
export function labelUp() { const L = labels.find(l => !l.out); return L ? L.f : null; }
// is this find's tape up right now? (asked inside a frame: no closure)
export function labelIs(f) { for (const L of labels) if (!L.out && L.f === f) return true; return false; }
// the youngest label's age in seconds (a big number when none is up): the app's moment waits for a tape to be read
export function labelAge() { let a = 1e9; for (const L of labels) if (!L.out && S.rt - L.t < a) a = S.rt - L.t; return a; }
// how long the pill has been up without being used, in seconds
export function pillAge() { return pillFind ? S.rt - pillAt : 0; }
// the find whose buttons are in the buttons bar right now (null: a Play pill, or nothing)
export function linksOwner() { return linksFor; }
// the app's buttons step down while less than half of the phone is on screen (asked only while the bar is the app's: desk.js)
export function linksAway(on) { if (on !== away) { away = on; el.links.classList.toggle('away', on); morePlace(); } }
// a dark plate behind the counter, while something of its own gold lies under it
export function counterPlate(on) { if (on !== plate) { plate = on; el.tm.classList.toggle('plate', on); } }
// is this find's Play pill up right now? (then a tap on its screen plays it too)
export function pillIs(f) { return pillFind === f && el.pill.classList.contains('up') && !el.pill.classList.contains('tuck'); }
// A new find has fired that has no pill of its own. The pill still up belongs to an earlier find: it goes now, unless
// the van is still within 240 units of that one. (The 4 s minimum is for driving away, not for outliving a newer find.)
export function pillYield(van) { if (pillFind && Math.hypot(van.x - pillFind.x, van.y - pillFind.y) > 240) hidePill(); }
export function pillTuck(on) { el.pill.classList.toggle('tuck', !!on); el.links.classList.toggle('tuck', !!on); el.morep.classList.toggle('tuck', !!on); }
// stays while the van is within 240 units, and at least 4 s
export function tickPill(van) {
  if (!pillFind) return;
  if (S.rt - pillAt <= 4) return;
  if (pillFar(van)) hidePill();
}
// (a machine on the bench: its pill reads the same as its neighbours', so it goes once the van is a van's length
// and a half from that machine, and never stays up while the van is at another one)
function pillFar(van) {
  const b = pillFind.how ? pillFind.tapBox : null;                  // (tapBox: the ground the whole machine stands on)
  return b ? Math.hypot(Math.max(b[0] - van.x, 0, van.x - b[2]), Math.max(b[1] - van.y, 0, van.y - b[3])) > 96 : Math.hypot(van.x - pillFind.x, van.y - pillFind.y) > 240;
}
// may a small thing (the stopwatch, the bay) put up its pill unasked? Only where no find's pill would still be standing (SPEC 5.7)
export const pillFree = (van, f) => !pillFind || pillFind === f || pillFar(van);
export function pillH() { return pillFind ? (pillMain ? (pillTall ? 152 : 96) : 16) + (moreFor ? 58 : 0) : 28; }      // how much of the foot of the screen a pill takes (and the details pill over it)
export function hidePill() { pillFind = null; linksFor = null; pillMain = false; morePill(null); el.pill.classList.remove('up'); el.links.classList.remove('up'); setTimeout(() => { if (!pillFind) { el.pill.hidden = true; el.links.hidden = true; } }, 320); }

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
  if (sm) dropSmall('sheet');
  if (poster) endPoster();
  playing = f;
  const v = el.video;
  el.player.hidden = false;
  if (f.yt) {
    v.hidden = true; el.yt.hidden = false;
    // behind the embed while it loads: the thumbnail saved with the site; none for a video whose picture is a drawn card (the weekly recap)
    const own = f.sub || f, drawn = !!own.small || !!(own.el && own.el.querySelector(':scope > [data-sheet]'));      // (a small thing's video: no saved picture either)
    el.ytf.style.backgroundImage = drawn ? '' : 'url(' + MEDIA + 'yt-' + f.yt + '.jpg)';
    const fr = document.createElement('iframe');
    fr.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
    fr.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin'); fr.title = f.title || (f.head ? f.head.textContent.trim() : f.line ? f.line.textContent.trim() : 'Video');
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
// ---------- the explainer (stage 5): a machine's card, with its animated picture looping above the paragraph ----------
// One sheet (#how) for the five machines of the bench. It is opened by the pill "See how it works" (a tap, or Enter
// while the pill is up: pillAct) and by a tap on the found machine while its pill is up (main.js, f.tapBox). Every
// word in it is copied from the find's own markup when it opens (f.head, f.date, f.how.card, f.how.foot, f.how.steps);
// the picture code (how.js, howart.js) is fetched on demand, so the first load of the page pays nothing for it.
// While it is open the game's loop is stopped (hooks.pause: held keys are dropped and the motor's sound rests),
// everything behind it is inert, and it closes by its disc, a tap on the dark above it, Escape, or the back gesture.
let how = null, howMod = null, howApi = null, howAt = 0, howT = 0, howShut = 0, popSkip = 0;
const mods = [];      // the modals that are open, the top one last (the achievements panel, and a card opened from it)
const INERT = ['c', 'hud', 'toplain', 'labels', 'smalls', 'pill', 'links', 'startb', 'three', 'first', 'intro', 'morep'];
// A modal's plumbing: one history entry so that back closes it, the rest of the page inert, the focus moved in and,
// on close, given back to what had it (or to the canvas). Written so the reel and the player could use it too.
// A modal opened over another (a details card or an explainer over the achievements panel) makes the one under it
// inert as well, and gives it back its focus when it closes; back closes the top one first.
function modalOpen(root, close) {
  const m = { root, close, last: document.activeElement, pushed: false };
  try { history.pushState({ yg: 1 }, ''); m.pushed = true; } catch (e) { /* no history: Escape and the disc still close it */ }
  if (!mods.length) for (const id of INERT) { const e = $(id); if (e) e.inert = true; }
  else mods[mods.length - 1].root.inert = true;
  mods.push(m);
  const d = root.querySelector('[role=dialog]'); if (d) d.focus({ preventScroll: true });
}
function modalClose(fromPop) {
  const m = mods.pop(); if (!m) return;
  const under = mods.length ? mods[mods.length - 1] : null;
  if (under) under.root.inert = false;
  else for (const id of INERT) { const e = $(id); if (e) e.inert = false; }
  if (m.pushed && !fromPop) { popSkip++; try { history.back(); } catch (e) { popSkip--; } }     // (asynchronous: popSkip covers a re-open inside that gap)
  const l = m.last, ok = l && l !== document.body && l.isConnected && l.offsetParent !== null && (!under || under.root.contains(l));
  (ok ? l : under ? under.root.querySelector('[role=dialog]') : $('c')).focus({ preventScroll: true });
}
addEventListener('popstate', () => { if (popSkip > 0) { popSkip--; return; } if (mods.length) mods[mods.length - 1].close(true); });

// A double tap does one thing, not two. The disc comes up where the pill's middle was, so the second tap of a double
// tap on the pill is not a press of the disc, the dark or the picture (early). And the sheet lets a touch through
// while it fades, so that a drag steers at once: the second tap of a double tap that closed it is not a press of what
// lies under it (the pill, the top bar: the listener below; the canvas: main.js asks justShut). Only for a finger or a
// mouse (detail > 0): a key is never held back.
const TWICE = 450;
const early = e => e.detail > 0 && performance.now() - howAt < TWICE;
export const justShut = () => performance.now() - howShut < TWICE;
function howInit() {
  const shut = e => { if (early(e)) return; if (e.detail > 0) howShut = performance.now(); closeHow(); };
  el.hx.addEventListener('click', shut);
  el.how.addEventListener('click', e => { if (e.target === el.how) shut(e); });      // a tap on the dark above the sheet closes it
  document.addEventListener('click', e => { if (e.detail > 0 && justShut()) { e.preventDefault(); e.stopPropagation(); } }, true);
  // The picture is a button: a tap on its right 60 percent goes on a step, on its left 40 percent goes back one;
  // from the keyboard (Enter or Space on it) it goes on. The loop carries on from there.
  el.howp.addEventListener('click', e => { if (early(e)) return; const r = el.howp.getBoundingClientRect(); howGo(e.detail > 0 && e.clientX < r.left + r.width * 0.4 ? -1 : 1); });
  addEventListener('resize', () => { if (!how) return; el.howcap.classList.remove('sl'); capFit(); if (howApi) howApi.size(); });
}
function howGo(d) { if (!how || !howApi || el.how.classList.contains('nopic')) return; audio.tick(); howApi.step(d); }
// Keys while it is open: Escape closes · Right or Space next, Left previous · Tab stays inside the sheet (for engines
// without inert) · Enter and Space on a focused control are that control's own. Nothing else reaches the game.
function howKey(e) {
  const k = e.key, onBtn = e.target && e.target.closest && e.target.closest('button');
  if (k === 'Escape') { e.preventDefault(); closeHow(); }
  else if (e.metaKey || e.ctrlKey || e.altKey) return;
  else if (k === 'ArrowRight' || ((k === ' ' || k === 'Spacebar') && !onBtn)) { e.preventDefault(); howGo(1); }
  else if (k === 'ArrowLeft') { e.preventDefault(); howGo(-1); }
  else if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'PageUp' || k === 'PageDown') {
    // the paragraph is scrolled from here (the focus sits on the dialog or on a button, never inside the scrolling box):
    // its own box where that is the scroller, the whole sheet on the layouts where the sheet scrolls
    const b = el.how.querySelector('.hbody'), sc = b.scrollHeight > b.clientHeight + 1 ? b : b.parentNode, d = k.charAt(0) === 'P' ? sc.clientHeight * 0.8 : 44;
    e.preventDefault(); sc.scrollTop += k === 'ArrowDown' || k === 'PageDown' ? d : -d;
  }
  else if (k === 'Tab') {
    const list = [el.howp, el.hx].filter(b => b.offsetParent !== null), at = list.indexOf(document.activeElement);
    e.preventDefault(); if (list.length) list[(at < 0 ? (e.shiftKey ? list.length - 1 : 0) : at + (e.shiftKey ? list.length - 1 : 1)) % list.length].focus();
  }
}
// A caption that runs to two lines: its tape is cut to the lines' own width, not left as wide as the sheet. It is
// measured with the sheet laid out (a hidden box has no lines): at each new caption, and again after a resize.
function capFit() {
  const b = el.howcap.querySelector('b'); b.style.width = '';
  const rs = document.createRange(); rs.selectNodeContents(b); const rc = rs.getClientRects(); let w = 0; for (let k = 0; k < rc.length; k++) if (rc[k].width > w) w = rc[k].width;
  if (rc.length > 1 && w > 40) b.style.width = Math.ceil(w + 36) + 'px';
}
// a step has begun (i), t seconds into it: the caption strip, the step marks, the list a screen reader has
function howStep(i, t) {
  if (!how) return;
  const st = how.how.steps, b = el.howcap.querySelector('b'), m = el.hdots.children, li = el.howl.children, txt = st[i] ? st[i].textContent.trim() : '';
  if (b.textContent !== txt) {
    b.textContent = txt; el.howcap.classList.remove('sl'); capFit();
    if (!S.reduced) { void el.howcap.offsetWidth; el.howcap.classList.add('sl'); }
  }
  for (let k = 0; k < m.length; k++) {
    const c = k < i ? 'done' : k === i ? 'cur' : '';
    if (k === i && m[k].className === 'cur') { m[k].className = ''; void m[k].offsetWidth; }      // the same mark again (the tab came back): its fill starts over from t
    m[k].className = c; if (k === i) m[k].style.setProperty('--hd', -(t || 0).toFixed(2) + 's');
    if (li[k]) { if (k === i) li[k].setAttribute('aria-current', 'step'); else li[k].removeAttribute('aria-current'); }
  }
}
// (both files are asked for at once: how.js imports howart.js, which would otherwise only be found when how.js has arrived)
function loadHow() {
  if (!howMod) { import('./howart.js').catch(() => { /* how.js asks for it too, and reports */ }); howMod = import('./how.js').then(m => { howApi = m; return m; }, e => { howMod = null; throw e; }); }
  return howMod;
}
// the picture code may be fetched now (the bench asks as the van comes near it): at once, so a first tap finds it there
export function preloadHow() { if (!howMod) loadHow().catch(() => { /* asked for again when a sheet opens */ }); }
export function openHow(f) {
  if (!f || !f.how || how || playing || poster || reelOn || !booted() || (hooks.held && hooks.held()) || justShut()) return;
  const h = f.how, e = el;
  if (sm) dropSmall('sheet');
  how = f; howAt = performance.now(); clearTimeout(howT);
  // the words, copied in from the find's own markup (textContent only)
  e.howh.textContent = f.head ? f.head.textContent.trim() : '';
  e.howd.textContent = f.date ? f.date.textContent.trim() : '';
  e.howl.textContent = ''; e.hdots.textContent = '';
  for (const s of h.steps) { const li = document.createElement('li'); li.textContent = s.textContent.trim(); e.howl.appendChild(li); e.hdots.appendChild(document.createElement('i')); }
  e.howcard.textContent = h.card ? h.card.textContent.trim() : '';
  e.howfoot.textContent = h.foot ? h.foot.textContent.trim() : ''; e.howfoot.hidden = !h.foot;
  e.how.className = (h.foot ? 'foot' : '') + (S.reduced ? ' still' : '') + (howApi ? '' : ' wait');      // (wait: the picture code is not here yet)
  e.how.style.setProperty('--t', TRACK[f.track].tape);
  hooks.pause();
  e.labels.classList.add('hw');                            // the world's tapes step back while a sheet is up (one of them carries the sheet's own heading)
  // Shown first, then reset and measured: a box that is display:none has no layout, so a scroll reset on it does
  // nothing (the next sheet would open where the last was left) and a caption's lines cannot be measured.
  e.how.hidden = false;
  e.how.querySelector('.hsh').scrollTop = 0; e.how.querySelector('.hbody').scrollTop = 0;
  e.howcap.querySelector('b').textContent = ''; howStep(0, 0);
  if (S.reduced) e.how.classList.add('on'); else requestAnimationFrame(() => { if (how === f) e.how.classList.add('on'); });
  audio.slap();
  modalOpen(e.how, closeHow);
  // the sheet is whole and readable before the picture code has arrived; if it never does, the captions show as a list
  loadHow().then(m => { if (how === f) { e.how.classList.remove('nopic', 'wait'); m.start(f, e.howc, { reduced: S.reduced, onStep: howStep }); } }, () => { if (how === f) { e.how.classList.remove('wait'); e.how.classList.add('nopic'); } });
}
export function closeHow(fromPop) {
  if (!how) return;
  how = null; el.how.classList.remove('on'); el.labels.classList.remove('hw');
  clearTimeout(howT); howT = setTimeout(() => { if (!how) el.how.hidden = true; }, S.reduced ? 0 : 280);
  if (howApi) howApi.stop();                               // its loop ends, its canvas goes to 0 x 0, its word sprites are let go
  modalClose(fromPop === true);
  if (pillFind) pillAt = S.rt;                             // the pill stays up
  hooks.resume();
}
const booted = () => !!el && !!el.how;
export const howOpen = () => !!how;
export const howCanvases = () => how && howApi ? howApi.canvases() : [];
// ?debug=1 (__g.how): hold one step at one moment of its 2.4 s; what the engine is doing
export function howFreeze(i, u) { return howApi ? howApi.freeze(i, u) : null; }
export function howState() { return { open: how ? how.id : null, nopic: !!el && el.how.classList.contains('nopic'), ...(howApi ? howApi.state() : {}) }; }

// something is open over the game (a player, the #ad1 poster, the reel, an explainer, a details card, the
// achievements panel): the loop stays stopped
export function busy() { return !!playing || !!poster || reelOn || !!how || !!det || achOn; }
export function playerOpen() { return busy(); }

// ---------- game clarity (2026-11-19): the details card, the achievements panel, the toast, the intro card ----------
// Every word they show is the document's own: a find's details block (CONTENT-v2 I5), its HEAD and TAB, the hub's job
// labels, and the panel's and the card's own markup (I1, I3, I4). Nothing here holds a word of copy.
function clarityInit() {
  // the close marks and the dark: as the explainer's (a double tap does one thing: early / howShut)
  const shut = close => e => { if (early(e)) return; if (e.detail > 0) howShut = performance.now(); close(); };
  el.morep.addEventListener('click', () => { if (moreFor && el.morep.classList.contains('up') && !(hooks.ended && hooks.ended())) openDet(moreFor); });
  el.detx.addEventListener('click', shut(closeDet));
  el.det.addEventListener('click', e => { if (e.target === el.det) shut(closeDet)(e); });
  el.achx.addEventListener('click', shut(closeAch));
  el.ach.addEventListener('click', e => { if (e.target === el.ach) shut(closeAch)(e); });
  for (const b of [el.tmb, el.achb]) b.addEventListener('click', openAch);
  el.achl.addEventListener('click', achTap);
  // a tap on the intro card puts it away; its link is the plain resume's own (the page's script), and a touch on the
  // link is not taken as the start of a drive (that would capture the pointer, and the link would get no click)
  el.intro.addEventListener('click', e => { if (!(e.target.closest && e.target.closest('a'))) introBye(); });
  el.intro.querySelectorAll('a').forEach(a => a.addEventListener('pointerdown', e => e.stopPropagation()));
  el.acht.textContent = S.live.length;
}
// Keys while a card or the panel is open: Escape closes it · Tab stays inside (for engines without inert) · the
// arrows and Page keys scroll it. Nothing reaches the game.
function sheetKey(e, root, close) {
  const k = e.key;
  if (k === 'Escape') { e.preventDefault(); close(); return; }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const sc = root.querySelector('[role=dialog]');
  if (k === 'Tab') {
    const list = [...root.querySelectorAll('button,a[href]')].filter(b => b.offsetParent !== null && !b.closest('[inert]')), at = list.indexOf(document.activeElement);
    e.preventDefault(); if (list.length) list[(at < 0 ? (e.shiftKey ? list.length - 1 : 0) : at + (e.shiftKey ? list.length - 1 : 1)) % list.length].focus();
  } else if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'PageUp' || k === 'PageDown') {
    const d = k.charAt(0) === 'P' ? sc.clientHeight * 0.8 : 44;
    e.preventDefault(); sc.scrollTop += k === 'ArrowDown' || k === 'PageDown' ? d : -d;
  }
}
// The find's picture, if it has one: its tile in the Watch strip (a poster, a YouTube still saved with the site, or
// the drawn WEEK 3 card), as the reel shows it.
function picOf(f) {
  if (f.id === 'inside' && f.el) return insideStrip(f.el);      // the app's four screens, drawn as the phone on the desk shows them
  if (!(f.video || f.yt)) return null;
  const li = document.querySelector('#watch [data-for="' + f.id + '"]'); if (!li) return null;
  const card = li.querySelector('.wk'); if (card) return card.cloneNode(true);
  const img = li.querySelector('img'), vid = li.querySelector('video'), src = img ? (img.getAttribute('data-src') || img.getAttribute('src') || '') : vid ? (vid.getAttribute('poster') || '') : '';
  if (!src) return null;
  const im = new Image(); im.alt = ''; im.decoding = 'async'; im.src = src; return im;
}
export function openDet(f) {
  const m = moreOf(f);
  if (!m || det || how || playing || poster || reelOn || !booted() || justShut()) return;
  if (sm) dropSmall('sheet');
  det = f; howAt = performance.now();
  const e = el, hd = m.querySelector(':scope > [data-more-head]');
  e.deth.textContent = (hd || f.head).textContent.trim();
  e.detpic.textContent = ''; const pic = picOf(f); if (pic) e.detpic.appendChild(pic); e.detpic.hidden = !pic;
  // the rundown: its paragraphs as paragraphs, and each run of bullets (p data-li) as one list
  e.detbody.textContent = ''; let ul = null;
  for (const p of m.querySelectorAll(':scope > p')) {
    if (p.hasAttribute('data-li')) { if (!ul) { ul = document.createElement('ul'); e.detbody.appendChild(ul); } const li = document.createElement('li'); li.textContent = p.textContent.trim(); ul.appendChild(li); }
    else { ul = null; const q = document.createElement('p'); q.textContent = p.textContent.trim(); e.detbody.appendChild(q); }
  }
  e.det.style.setProperty('--t', TRACK[f.track].tape);
  hooks.pause();
  e.labels.classList.add('hw');                            // the world's tapes step back (one of them carries the card's own heading)
  e.det.hidden = false; e.det.querySelector('.dsh').scrollTop = 0;
  if (S.reduced) e.det.classList.add('on'); else requestAnimationFrame(() => { if (det === f) e.det.classList.add('on'); });
  audio.slap();
  modalOpen(e.det, closeDet);
}
export function closeDet(fromPop) {
  if (!det) return;
  det = null; el.det.classList.remove('on'); el.labels.classList.remove('hw');
  setTimeout(() => { if (det) return; el.det.hidden = true; for (const c of el.detpic.querySelectorAll('canvas')) c.width = c.height = 0; el.detpic.textContent = ''; }, S.reduced ? 0 : 280);   // free the drawn strip, as every other canvas is freed
  modalClose(fromPop === true);
  if (pillFind) pillAt = S.rt;                             // the pill stays up
  hooks.resume();                                          // (main's start asks busy(): the panel under it keeps the game stopped)
}
export const detOpen = () => det ? det.id : null;

// The achievements panel: one group per job, built again each time it opens (it is never open while a find is made).
function buildAch() {
  let n = 0;
  for (const g of el.achl.querySelectorAll('.ag')) {
    const fs = g.dataset.finds.split(' ').map(id => S.byId[id]).filter(f => f && f.live), ul = g.querySelector('ul'), h = g.querySelector('h3 b');
    g.hidden = !fs.length; ul.textContent = ''; if (!fs.length) continue;
    g.style.setProperty('--t', TRACK[g.dataset.track].tape);
    if (!h.textContent.trim()) { const lab = [...document.querySelectorAll('[data-hub] > [data-to="' + g.dataset.track + '"]')].find(on); h.textContent = lab ? lab.textContent.trim() : ''; }
    for (const f of fs) {
      const li = document.createElement('li');
      if (f.found) {
        n++; li.className = 'ar';
        const b = document.createElement('button'); b.type = 'button'; b.dataset.id = f.id;
        const ah = document.createElement('span'); ah.className = 'ah'; ah.textContent = f.head ? f.head.textContent.trim() : '';
        const tg = document.createElement('span'); tg.className = 'atg zz'; tg.setAttribute('aria-hidden', 'true'); const tb = document.createElement('b'); tb.className = 'zz'; tb.textContent = f.tab; tg.appendChild(tb);
        b.append(ah, tg); b.insertAdjacentHTML('beforeend', CHEV); li.appendChild(b);
      } else {
        li.className = 'lk'; li.insertAdjacentHTML('beforeend', LOCK);
        const s = document.createElement('span'); s.textContent = el.achnf.textContent.trim(); li.appendChild(s);
      }
      ul.appendChild(li);
    }
  }
  el.achn.textContent = n; el.acht.textContent = S.live.length;
}
// a row: an unlocked find opens its details card over the panel (a machine on the bench, its explainer). Never the van.
function achTap(e) {
  const b = e.target.closest ? e.target.closest('button[data-id]') : null; if (!b || early(e)) return;
  const f = S.byId[b.dataset.id]; if (!f || !f.found) return;
  if (f.how) openHow(f); else openDet(f);
}
export function openAch() {
  if (achOn || det || how || playing || poster || reelOn || !booted() || justShut()) return;
  if (sm) dropSmall('sheet');
  introBye();                                              // (the intro card says the achievements are on the side: once they are seen, it has done its job)
  buildAch();
  achOn = true; howAt = performance.now();
  for (const b of [el.tmb, el.achb]) b.setAttribute('aria-expanded', 'true');
  el.ach.hidden = false; el.ach.querySelector('.ash').scrollTop = 0;
  if (S.reduced) el.ach.classList.add('on'); else requestAnimationFrame(() => { if (achOn) el.ach.classList.add('on'); });
  hooks.pause();
  modalOpen(el.ach, closeAch);
}
export function closeAch(fromPop) {
  if (!achOn || det || how) return;                        // (a card over it closes first: back and Escape reach the top one)
  achOn = false; el.ach.classList.remove('on');
  for (const b of [el.tmb, el.achb]) b.setAttribute('aria-expanded', 'false');
  setTimeout(() => { if (!achOn) el.ach.hidden = true; }, S.reduced ? 0 : 280);
  modalClose(fromPop === true);
  if (pillFind) pillAt = S.rt;
  hooks.resume();
}
export const achOpen = () => achOn;
// "Unlocked · TAB", slapped over the side tab for two seconds when a find unlocks
function unlocked(f) {
  if (!f || !el.toast) return;
  const t = el.toast; clearTimeout(toastT); clearTimeout(toastGo);
  el.toastTab.textContent = f.tab; t.style.setProperty('--t', TRACK[f.track].tape);
  t.classList.remove('in', 'go'); void t.offsetWidth; t.classList.add('in');
  toastGo = setTimeout(() => t.classList.add('go'), 2000);
  toastT = setTimeout(() => t.classList.remove('in', 'go'), 2260);
}
// The intro card: up with the opening frame; it goes with the first tap on it or on the Start pill, the first drive
// or the first key (main.js), never by itself. It traps nothing: it is not a modal.
export function introShow() { if (!el || !el.intro) return; introOn = true; el.intro.classList.remove('out'); el.intro.hidden = false; }
export function introBye() {
  if (!introOn) return; introOn = false;
  el.intro.classList.add('out');
  setTimeout(() => { if (!introOn) el.intro.hidden = true; }, S.reduced ? 0 : 220);
  if (hooks.bye) hooks.bye();
}
export const introUp = () => introOn;

// #ad1 (spec 9.8): the first ad's poster, full screen, with its Play pill. The tap on the pill plays it with sound.
export function openPoster(f) {
  if (sm) dropSmall('sheet');
  poster = f; const v = el.video;
  el.player.hidden = false; el.stage.classList.add('poster');
  v.hidden = false; el.yt.hidden = true; v.controls = false; v.poster = MEDIA + f.video + '.jpg';
  pill(f); hooks.pause();
}
function endPoster() { poster = null; el.stage.classList.remove('poster'); el.video.controls = true; }

// ---------- the reel (spec 6.3): every video, always one tap away. Nothing is ever locked ----------
// Built once, from the document's own Watch list: the first ad first and double size, the rest in rows.
// A found one is in colour and wears its tab; an unfound one is dusted and offers "play anyway" and "show me where".
// A tile with no find of its own is a plain tile: a YouTube one, or a file of the site's own (the 3D ad, since it stopped
// being a find on 2026-11-19, G4): it plays, and that is all. A tile with a drawn card in
// place of a picture (the weekly recap) shows that card.
function makeReel() {
  reelMade = true;
  // Four blocks, each a full-width grid with no ragged end: the first ad, double size · ads 2 and 3, side by side ·
  // the three skits in a row · the films from YouTube, two by two.
  const rows = ['r2', 'r3', 'r2 ry'].map(c => { const d = document.createElement('div'); d.className = 'rg ' + c; return d; });
  document.querySelectorAll('#watch .reel li').forEach((li, i) => {
    const f = li.dataset.for ? S.byId[li.dataset.for] : null, id = li.dataset.yt || '';
    const a = f || id ? null : li.querySelector('a[data-play]'), m = a && /([\w-]+)\.mp4$/.exec(a.getAttribute('href') || ''), file = m ? m[1] : '';
    if (!f && !id && !file) return;
    if (f && !f.live) return;
    // (a tile played in the plain page has swapped its <a> and <img> for a <video>; its poster stands in for the picture)
    const img = li.querySelector('img'), vid = li.querySelector('video'), pic = img ? (img.getAttribute('data-src') || img.getAttribute('src') || '') : vid ? (vid.getAttribute('poster') || '') : '', card = li.querySelector('.wk'), b = li.querySelector('b'), cap = li.querySelector('.cap'), len = li.querySelector('.len'), yt = f ? !!f.yt : !file, t = document.createElement('div');
    const title = b ? b.textContent.trim() : '', sub = cap ? cap.textContent.trim() : '';
    t.className = 'rt' + (i === 0 ? ' big' : '') + (yt ? ' yt' : ''); t.dataset.id = f ? f.id : ''; t.dataset.yt = id; t.dataset.file = file; t.dataset.title = title; t.style.setProperty('--t', TRACK[f ? f.track : file ? 'w' : 'v'].tape);
    t.innerHTML = '<button class="ri" type="button" data-act="play" aria-label="Play ' + (title || sub).replace(/"/g, '') + '">' + (card ? card.outerHTML : pic ? '<img alt="" decoding="async" src="' + pic + '">' : '') + '<i class="pb" aria-hidden="true">' + PLAY + '</i>' +
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
  if (!f) { if (t.dataset.yt) openPlayer({ yt: t.dataset.yt, track: 'v', title: t.dataset.title }); else if (t.dataset.file) openPlayer({ video: t.dataset.file, track: 'w' }); return; }
  if (b.dataset.act === 'play') openPlayer(f);              // with sound: this tap is the gesture. The counter is not touched
  else { closeReel(false); hooks.where(f.id); hooks.resume(); }
}
export function openReel() {
  if (reelOn || playing || poster || how || det || achOn) return;
  if (sm) dropSmall('sheet');
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
