/*
 * Leith Bass Space: Ear Training for Bass Players, on the page (the LBS Ear Trainer until 1.10.0).
 *
 * A home is always sounding. The house band holds a tone centre, the bass asks
 * a question against it in the first bar, and the second bar is left for the
 * answer: tapped, found on a fretboard, or played on a real bass through the
 * microphone. The two bars go round until the answer is out, and the next
 * question comes in on the bar line, so the music never stops. Eight questions
 * on one tone centre, then on to the next, a fourth away.
 *
 * What is asked and how it is marked is in ear-data.js. The sound is the
 * house band's (he-band.js and the files beside it, shared with Harmonic
 * Elements): the keys and the bass are written out note by note and drawn in
 * the browser. The answer is always shown as notation with TAB beneath and on
 * a fretboard (lbs-bass.js), for a bass with four, five or six strings.
 *
 * window.LBS_EAR (printed by the plugin) says who is looking:
 *   sounds, ver   where the house band's sound files are, and the plugin's version
 *   tuner, listen where the pitch detector and the note listener are: fetched the first time "Play it" is chosen
 *   member        true for a signed-in member: the record is kept with their account
 *   record        {log, share} for a member
 *   rest, nonce   where a member's record is saved, and a sitting added to their practice diary
 *   signin        where to sign in, for a visitor
 *   elements      where Harmonic Elements is (a progression's answer links to its page in the Guide)
 *   drone         where a drone on a given note can be opened: the Shed's, for a member ("NOTE" stands for 0 to 11),
 *                 or the free one
 *
 * 1.10.0 adds Lines (melodic transcription), Progressions (the roots of a loop from Harmonic Elements),
 * intervals up to a tenth and as double stops, "hear the other choice" after an answer, Today's set (a short
 * mix chosen from the record, as a spaced schedule would), answering by singing as well as playing, and the
 * Jam room: the home chords from Harmonic Elements and the other flavours as long loops to play over.
 */
(function () {
  'use strict';
  var HE = window.HE, EAR = window.EAR, CFG = window.LBS_EAR || {};
  var app = document.getElementById('ear');
  if (!app || !HE || !EAR || !HE.synth) { return; }

  var $ = function (id) { return document.getElementById('ear-' + id); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var STORE = 'lbs.ear.v1', MEMBER = !!CFG.member;
  if (CFG.sounds && HE.sounds) { HE.sounds.base = CFG.sounds; HE.sounds.version = CFG.ver || ''; }

  /* ---------- what is kept ---------- */

  function load() {
    try { return JSON.parse(window.localStorage.getItem(STORE)) || {}; } catch (e) { return {}; }
  }
  var saved = load();
  if (saved.rate >= 8000 && saved.rate <= 192000) { HE.audio.expect = +saved.rate; }
  // How many strings the pupil's bass has. One answer for the whole site (Harmonic Elements asks the same thing).
  function strings() {
    var n = 4;
    try { n = +window.localStorage.getItem('lbs.strings') || 4; } catch (e) { n = 4; }
    return n === 5 || n === 6 ? n : 4;
  }
  function setStrings(n) { try { window.localStorage.setItem('lbs.strings', String(n)); } catch (e) { /* it just isn't kept */ } }

  var TEMPOS = [['66', 'Slow'], ['80', 'Medium'], ['96', 'Brisk']];
  var KEYS_SOUNDS = [['turns', 'Take turns'], ['rhodes', 'Electric piano'], ['grand', 'Grand piano'], ['pad', 'Warm pad']];
  var TURNS = ['rhodes', 'grand', 'pad'];
  var ALL_KEYS = EAR.KEYS.map(function (k) { return k.pc; });
  var KEY_SETS = [['C only', [0]], ['First four', [0, 5, 10, 3]], ['All twelve', ALL_KEYS]];
  var was = saved.set || {};
  var S = {
    mix: EAR.cleanMix(saved.mix),
    set: {
      voice: was.voice === 'ubass' ? 'ubass' : 'ebass',
      bpm: [66, 80, 96].indexOf(+was.bpm) !== -1 ? +was.bpm : 80,
      drums: was.drums !== false,
      keys: KEYS_SOUNDS.some(function (k) { return k[0] === was.keys; }) ? was.keys : 'turns',
      centres: Array.isArray(was.centres) && was.centres.filter(function (pc) { return ALL_KEYS.indexOf(pc) !== -1; }).length ? was.centres.filter(function (pc) { return ALL_KEYS.indexOf(pc) !== -1; }) : [0, 5, 10, 3],
      auto: !!was.auto,
      way: was.way === 'fb' || was.way === 'mic' ? was.way : 'tap'
    },
    levels: {
      // (measured: with these the loudest moment of bass and keys together stays under full scale, so the
      // limiter on the way out is only ever catching the odd peak when the drums land on top of them)
      bass: saved.levels && saved.levels.bass >= 0 ? +saved.levels.bass : 0.8,
      chords: saved.levels && saved.levels.chords >= 0 ? +saved.levels.chords : 0.6,
      drums: saved.levels && saved.levels.drums >= 0 ? +saved.levels.drums : 0.42
    },
    strand: saved.strand === 'today' || saved.strand === 'jam' || EAR.STRANDS.some(function (s) { return s.id === saved.strand; }) ? saved.strand : 'intervals',
    drill: EAR.DRILLS[saved.drill] ? saved.drill : 'deg',
    log: [], queue: [], share: false, sending: false, unsaved: false, confirmClear: false,
    run: null,            // {keyPc, home, n (questions asked), right, sound}: the tone centre the questions are on
    runs: 0,              // how many runs there have been this sitting
    q: null,              // the question
    last: null,
    phase: 'ask',         // 'ask' until the answer is out, then 'revealed'
    tries: 0, said: '', missed: {}, outcome: null,
    busy: false,
    sitting: { asked: 0, right: 0, ms: 0, since: 0, diary: '' },
    heard: [],            // notes played into the microphone for this question
    mic: 'off',           // 'off' | 'asking' | 'on' | 'refused'
    seq: [],              // a line or a progression: the degrees said so far
    seqLast: null,        // and the last go at it that was checked: {said, right}
    today: null           // Today's set: {plan: [{drill, items, n, why}], at, asked, right, done}
  };
  // the drill has to belong to the strand (Today's set and the Jam room choose their own)
  if (S.strand !== 'today' && S.strand !== 'jam' && EAR.DRILLS[S.drill].strand !== S.strand) { S.drill = EAR.STRANDS.filter(function (s) { return s.id === S.strand; })[0].drills[0]; }

  var known = function (e) { return e && EAR.DRILLS[e.d] && EAR.DRILLS[e.d].item[e.q]; };
  if (MEMBER) {
    var rec = CFG.record || {};
    S.log = (Array.isArray(rec.log) ? rec.log : []).filter(known);
    S.share = !!rec.share;
    var have = {};
    S.log.forEach(function (e) { have[e.t] = true; });
    S.queue = (Array.isArray(saved.queue) ? saved.queue : []).filter(function (e) { return known(e) && !have[e.t]; });
    S.log = S.log.concat(S.queue).sort(function (a, b) { return a.t - b.t; });
  } else {
    S.log = (Array.isArray(saved.log) ? saved.log : []).filter(known);
  }

  function save() {
    var keep = { mix: S.mix, set: S.set, levels: S.levels, strand: S.strand, drill: S.drill, jam: J, rate: HE.audio.rate || saved.rate || 0 };
    if (MEMBER) { keep.queue = S.queue; } else { keep.log = S.log.slice(-800); }
    try { window.localStorage.setItem(STORE, JSON.stringify(keep)); } catch (e) { /* the record just isn't kept */ }
  }
  function post(body) {
    return window.fetch(CFG.rest, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': CFG.nonce },
      body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) { throw new Error('not-saved'); }
      return res.json();
    });
  }
  // Send a member's new lines to their account. Anything that doesn't get there waits and goes with the next.
  function flush() {
    if (!MEMBER || S.sending || !S.queue.length) { return; }
    var batch = S.queue.slice();
    S.sending = true;
    post({ add: batch }).then(function () {
      S.sending = false; S.unsaved = false;
      S.queue = S.queue.filter(function (e) { return batch.indexOf(e) === -1; });
      save(); renderRecord();
      flush();
    }).catch(function () {
      S.sending = false; S.unsaved = true;
      renderRecord();
    });
  }

  /* ---------- small things ---------- */

  function say(text) { $('status').textContent = text; }
  function tog(attrs, inner, pressed, cls) {
    return '<button type="button" class="he-tog' + (cls ? ' ' + cls : '') + '" ' + attrs + ' aria-pressed="' + pressed + '">' + inner + '</button>';
  }
  function has(list, v) { return list.indexOf(v) !== -1; }
  function same(a, b) { return a.length === b.length && a.every(function (x) { return has(b, x); }); }
  function drill() { return EAR.DRILLS[S.drill]; }
  function item(id) { return drill().item[id]; }
  // What a thing asked is called, in words: "♭3", "Major seventh", "Four notes", "I IV · the major lean".
  function itemName(d, id) {
    var it = EAR.DRILLS[d] && EAR.DRILLS[d].item[id];
    if (!it) { return String(id); }
    return d === 'deg' ? EAR.DEG[id].label : it.name;
  }
  function degLabel(id) { return EAR.DEG[id] ? EAR.DEG[id].label : id; }
  function keyName(pc) { return EAR.tonic(pc, 'major'); }
  var B = function () { return window.LBSBass; };

  /* ---------- runs and questions ---------- */

  // The keys a run is played on: the pupil's choice, or each of three in turn (the first needs no download).
  function keysFor(n) { return S.set.keys === 'turns' ? TURNS[n % TURNS.length] : S.set.keys; }

  // How many questions a run has: eight on one tone centre, or in Today's set, as many as that part of it asks.
  function runLen() { return S.today && S.today.plan[S.today.at] ? S.today.plan[S.today.at].n : 8; }
  // What is in play: the mix, or in Today's set the part of it being worked on (its drill, and the few things it asks).
  function mixNow() {
    if (!S.today || !S.today.plan[S.today.at]) { return S.mix; }
    var part = S.today.plan[S.today.at], m = JSON.parse(JSON.stringify(S.mix));
    m[part.drill].items = part.items.slice();
    if (part.drill === 'inv' && part.items.indexOf('seventh') !== -1 && !m.inv.chords.some(function (c) { return EAR.CHORD[c].degs.length > 3; })) { m.inv.chords = m.inv.chords.concat(['7']); }
    return m;
  }

  // A new run of questions: on the tone centre given (when the drill changes, the tone centre stays), or on
  // the next of the chosen ones in the cycle of fourths.
  function newRun(keyPc) {
    var order = ALL_KEYS.filter(function (pc) { return has(S.set.centres, pc); });
    var at = S.run ? order.indexOf(S.run.keyPc) : -1;
    var pc = keyPc !== undefined && has(order, keyPc) ? keyPc : order[(at + 1) % order.length];
    S.run = { keyPc: pc, home: EAR.homeFor(S.drill, mixNow()), drill: S.drill, n: 0, right: 0, sound: keysFor(S.runs), fresh: true };
    S.runs++;
  }
  function newQuestion() {
    // Today's set moves on to its next part when a part is done
    if (S.today && S.run && S.run.n >= runLen() && S.run.drill === S.drill) {
      S.today.at++;
      if (S.today.at >= S.today.plan.length) { S.today.done = true; S.today.at = 0; }
      S.drill = S.today.plan[S.today.at].drill;
    }
    if (!S.run || S.run.n >= runLen() || !has(S.set.centres, S.run.keyPc)) { newRun(); }
    else if (S.run.drill !== S.drill) { newRun(S.run.keyPc); }
    if (S.q && S.q.asked) { S.last = S.q; }
    S.q = EAR.pick(S.drill, mixNow(), S.run, S.log, S.last);
    S.q.asked = false;
    S.phase = 'ask'; S.tries = 0; S.said = ''; S.missed = {}; S.outcome = null; S.heard = []; S.tapped = null;
    S.seq = []; S.seqLast = null;
    if (listener) { listener.reset(); }
  }
  // A fresh Today's set, from the record as it is now.
  function startToday() {
    var plan = EAR.today(S.log);
    S.today = { plan: plan, at: 0, asked: 0, right: 0, done: false };
    S.drill = plan[0].drill;
    S.run = null; S.q = null;
  }

  /*
   * A round, as the loop player wants one: the keys' two bars, the bass's two bars and a drum loop,
   * each drawn by the house band. "what" is the sound from ear-data.js: {keys, bass}.
   */
  var DRUMS = { feel: 'Rock 8ths', kit: 'tight', groove: 1 };
  function drumsReady() { return S.set.drums && HE.synth.usable(DRUMS.kit); }
  function round(what, bars, tag) {
    var r = {
      tag: tag, bpm: S.set.bpm, bars: bars, feel: DRUMS.feel,
      chord: { source: 'synth' },
      keysSpec: { bpm: S.set.bpm, bars: bars, parts: [{ inst: S.run.sound, strikes: what.keys }] },
      bassSpec: { bpm: S.set.bpm, bars: bars, parts: [{ inst: S.set.voice, strikes: what.bass }] }
    };
    // the drummer joins once the kit has arrived: nothing waits for it
    if (drumsReady()) { r.drum = { source: 'synth', kit: DRUMS.kit, groove: DRUMS.groove }; }
    return r;
  }
  var source = {
    chords: function (r, c) { return HE.synth.score(r.keysSpec, c); },
    drums: function (r, c) { return r.drum ? HE.synth.drums(r, c) : null; },
    more: function (r, c) {
      return HE.synth.score(r.bassSpec, c).then(function (p) { return [{ name: 'bass', buffer: p.buffer, lead: 0, length: p.length, gain: p.gain }]; });
    }
  };
  function askRound() { return round(EAR.sound(S.q, { fill: S.phase === 'revealed' }), S.q.bars || 2, S.phase === 'revealed' ? 'answer' : 'ask'); }
  // Hear the other choice: the question as it would have been with another answer, played once round, then back.
  function compareRound(v) { var r = round(EAR.sound(v, { fill: false }), 2, 'compare'); r.variant = v.item; return r; }
  function introRound() { return round(EAR.intro(S.run), 1, 'intro'); }

  // Fetch the drum kit quietly, so that it can join in from the next question.
  var kitAsked = false;
  function wantKit(c) {
    if (kitAsked || !S.set.drums || HE.synth.usable(DRUMS.kit) || HE.sounds.lean()) { return; }
    kitAsked = true;
    try { HE.synth.kit(DRUMS.kit).packs.forEach(function (p) { HE.sounds.load(p, c).catch(function () { kitAsked = false; }); }); } catch (e) { kitAsked = false; }
  }

  var sounding = null;   // the round whose turn it is
  var after = null;      // a round to bring in as soon as the one before it has started (the question after the intro)
  function levels() {
    HE.audio.level('bass', S.levels.bass);
    HE.audio.level('chords', S.levels.chords);
    HE.audio.level('drums', S.levels.drums);
  }
  function fail() {
    S.busy = false;
    say('That wouldn’t load. Check your connection and press Start again.');
    renderTransport();
  }

  // Start from silence: one bar that says where home is, then the question. ("lead" is something to play
  // first instead of that bar: the other choice, asked for with the band stopped.)
  function start(lead) {
    if (!HE.audio.supported || !HE.synth.supported) { say('Sound isn’t available in this browser.'); return; }
    var c;
    try { c = HE.audio.unlock(); } catch (e) { say('Sound isn’t available in this browser.'); return; }
    if (HE.audio.rate && saved.rate !== HE.audio.rate) { saved.rate = HE.audio.rate; save(); }
    levels();
    wantKit(c);
    if (!S.q) { newQuestion(); renderAll(); }
    S.busy = true;
    S.sitting.since = Date.now();
    renderTransport();
    var intro = lead || introRound();
    after = askRound();
    sounding = intro;
    if (!lead) { S.run.fresh = false; }
    HE.audio.play(intro, source, {}).then(function (res) {
      S.busy = false;
      if (res) { wake(true); tick(); }
      renderTransport();
    }).catch(fail);
    // (the question is drawn while the intro plays)
    try { source.chords(after, c).catch(function () {}); source.more(after, c).catch(function () {}); } catch (e) { /* it will be drawn when it is wanted */ }
  }
  // Bring a round in where the loop that is sounding next comes round.
  function join(r) {
    sounding = r;
    try { HE.audio.play(r, source, { at: 'loop' }).catch(function () { /* the one before simply goes round again */ }); } catch (e) { /* no sound */ }
  }
  function stop() {
    HE.audio.stop();
    S.busy = false; after = null;
    if (S.sitting.since) { S.sitting.ms += Date.now() - S.sitting.since; S.sitting.since = 0; }
    wake(false);
    playhead(null);
    renderTransport();
    renderRecord();
  }

  function conclude(ok, shown, via) {
    var q = S.q;
    S.phase = 'revealed';
    S.outcome = { ok: ok, shown: shown };
    var first = ok && S.tries === 0 && !shown;
    var e = EAR.entry(q, first, S.tries + (shown ? 0 : 1), shown, S.said, via || 'tap');
    var before = EAR.stats(S.log).items[q.drill + ':' + q.item];
    S.log.push(e);
    if (MEMBER) { S.queue.push(e); }
    S.run.n++;
    S.sitting.asked++;
    if (first) { S.run.right++; S.sitting.right++; }
    if (S.today) { S.today.asked++; if (first) { S.today.right++; } }
    var now = EAR.stats(S.log).items[q.drill + ':' + q.item], streak = 0;
    for (var i = S.log.length - 1; i >= 0 && S.log[i].ok; i--) { streak++; }
    S.news = now && now.recognised && !(before && before.recognised)
      ? 'That’s ' + itemName(q.drill, q.item) + ' recognised: four first time answers from the last five, on two different days.'
      : first && streak >= 3 ? streak + ' in a row, first time.' : '';
    save();
    flush();
    renderAll();
    $('result').scrollIntoView({ block: 'nearest', behavior: 'auto' });
    // the bass plays the answer back in the second bar from the next time round
    if (HE.audio.playing) { join(askRound()); }
    if (S.set.auto && ok && HE.audio.playing) { autoNext = HE.audio.position() ? HE.audio.position().loops : 0; } else { autoNext = -1; }
  }
  var autoNext = -1;

  function next() {
    var ended = S.run && S.run.n >= runLen(), was = S.run, wasLen = runLen(), wasToday = S.today && !S.today.done;
    if (S.today && S.today.done) { startToday(); }
    newQuestion();
    S.q.asked = false;
    autoNext = -1;
    if (S.today && S.today.done && wasToday) {
      say('Today’s set is done: ' + S.today.right + ' of ' + S.today.asked + ' first time. Carry on with a fresh set, or choose a drill above.');
      S.today.asked = 0; S.today.right = 0; S.today.done = false;
    } else if (ended && S.today) {
      say('Next: ' + EAR.DRILLS[S.drill].name + ' (' + S.today.plan[S.today.at].why + ').');
    } else if (ended) {
      say('That run on ' + keyName(was.keyPc) + ': ' + was.right + ' of ' + wasLen + ' first time. Now ' + keyName(S.run.keyPc) + '.');
    } else { say(''); }
    renderAll();
    if (!HE.audio.playing && !S.busy) { start(); return; }
    if (S.run.fresh) {
      // a new tone centre: its bar of home first, then the question
      S.run.fresh = false;
      after = askRound();
      join(introRound());
    } else { join(askRound()); }
    $('display').scrollIntoView({ block: 'start', behavior: 'auto' });
  }

  function answer(id, via) {
    if (S.phase !== 'ask' || !S.q) { return; }
    if (drill().seq) { seqAdd(id, via); return; }
    if (EAR.mark(S.q, id)) { conclude(true, false, via); return; }
    if (!S.said) { S.said = id; }
    S.tries++;
    S.missed[id] = true;
    say('Not that one. It is still going round: have another listen.');
    renderAnswer();
  }

  /*
   * A line or a progression is answered a degree at a time. The slots show how many there are; when they are
   * full the answer is checked. A wrong go is shown note by note (right ones ticked) and cleared for another.
   */
  function seqAdd(id, via) {
    var want = S.q.degs.length;
    S.seq.push(id);
    if (S.seq.length < want) { renderAnswer(); return; }
    var m = EAR.markSeq(S.q, S.seq);
    if (m.ok) { conclude(true, false, via); return; }
    if (!S.said) { S.said = S.seq.join('.'); }
    S.tries++;
    S.seqLast = { said: S.seq.slice(), right: m.right };
    S.seq = [];
    var n = m.right.filter(Boolean).length;
    say(n ? n + ' of ' + want + ' right. The ticked ones are, the others aren’t yet: have another listen.' : 'Not yet. It is still going round: have another listen.');
    renderAnswer();
  }
  function seqUndo() { if (S.seq.length) { S.seq.pop(); renderAnswer(); } }

  /* ---------- the display ---------- */

  var lastBar = -2, lastBeat = -1, raf = 0, lock = null;
  function wake(on) {
    try {
      if (on && navigator.wakeLock) { navigator.wakeLock.request('screen').then(function (l) { lock = l; }).catch(function () { /* fine without */ }); }
      else if (!on && lock) { lock.release(); lock = null; }
    } catch (e) { /* fine without */ }
  }
  function playhead(pos) {
    var r = pos ? pos.round : null, tag = r ? r.tag : '';
    // (the intro and a "hear the other choice" pass light no bar of the question)
    var bar = !pos || pos.counting ? -1 : tag === 'intro' || tag === 'compare' ? -5 : pos.bar, beat = pos ? pos.beat : -1;
    if (bar === lastBar && beat === lastBeat) { return; }
    var cells = $('bars').children;
    $('bars').style.setProperty('--he-beat', String(beat + 1));
    if (bar !== lastBar) {
      for (var i = 0; i < cells.length; i++) { cells[i].classList.toggle('is-on', i === bar); }
      $('kicker').textContent = tag === 'compare' ? 'The other choice: ' + compareName(r.variant) : kicker(tag === 'intro');
      if (S.q && bar === (S.q.askBars || 1) && listener && S.mic === 'on') { listener.reset(); }
      renderMicLine();
    }
    lastBar = bar; lastBeat = beat;
  }
  function tick() {
    window.cancelAnimationFrame(raf);
    (function frame() {
      if (!HE.audio.playing) { playhead(null); return; }
      var pos = HE.audio.position();
      if (pos && !pos.counting) {
        // once a round has started, whatever was waiting behind it is booked to follow
        if (after && pos.round === sounding) { var r = after; after = null; join(r); }
        if (pos.round && pos.round.tag === 'ask' && S.q && !S.q.asked) { S.q.asked = true; }
        // moving on by itself: the answer is heard once round in full, then the next question comes in
        if (autoNext >= 0 && pos.round && pos.round.tag === 'answer' && pos.bar === pos.round.bars - 1 && pos.beat >= 2) { autoNext = -1; next(); }
      }
      playhead(pos);
      raf = window.requestAnimationFrame(frame);
    }());
  }

  function kicker(intro) {
    if (!S.run) { return ''; }
    if (intro) { return 'Home is ' + keyName(S.run.keyPc); }
    var n = runLen(), at = Math.min(n, S.run.n + (S.phase === 'revealed' ? 0 : 1));
    if (S.today) { return 'Today · part ' + (S.today.at + 1) + ' of ' + S.today.plan.length + ' · ' + at + ' of ' + n; }
    return 'Question ' + at + ' of ' + n + ' · ' + S.set.bpm + ' bpm';
  }
  // The bars of a question, drawn for its length: the ones that ask, and the ones left for the answer.
  // A progression is played along with, so its bars are simply its chords.
  function renderBars() {
    var q = S.q, list = $('bars');
    if (!q) { return; }
    var bars = q.bars || 2, ask = q.askBars || 1, html = '';
    for (var i = 0; i < bars; i++) {
      var word, small;
      if (q.drill === 'roots') {
        var c = chordAtBar(q, i);
        small = 'Bar ' + (i + 1); word = S.phase === 'revealed' && c ? c : q.bassMode === 'you' ? 'Your roots' : 'Listen';
      } else {
        small = (ask > 1 ? 'Bar ' : 'Bar ') + ['one', 'two', 'three', 'four'][i];
        word = i < ask ? 'Listen' : 'Your turn';
      }
      html += '<li><span>' + esc(small) + '</span><b>' + esc(word) + '</b></li>';
    }
    list.innerHTML = html;
    list.style.gridTemplateColumns = 'repeat(' + Math.min(bars, 4) + ', minmax(0, 1fr))';
    lastBar = -2;
  }
  // The chord a progression has at the start of a bar, as a numeral.
  function chordAtBar(q, bar) {
    var el = window.HE && HE.byId ? HE.byId(q.el) : null, beat = 0, out = '';
    if (!el) { return ''; }
    q.chords.forEach(function (c, i) { if (!out && beat + c.bars * 4 > bar * 4) { out = el.romans[i]; } beat += c.bars * 4; });
    return out;
  }
  function bandLine() {
    if (!S.run) { return ''; }
    var keys = HE.band.sound(S.run.sound), voice = HE.band.BASSES.filter(function (b) { return b.id === S.set.voice; })[0];
    return (voice ? voice.name : 'Bass') + ' · ' + (keys ? keys.name.toLowerCase() : 'keys') + (drumsReady() ? ' · drums' : '');
  }

  // The answer in a word or two, for the big cell and the dock.
  function shortAnswer(q) {
    var d = q.drill;
    if (d === 'line' || d === 'roots') { return q.degs.map(degLabel).join(' '); }
    if (d === 'deg') { return EAR.DEG[q.item].label; }
    if (d === 'int') { return EAR.INTERVAL[q.item].name; }
    if (d === 'chord') { return EAR.tonic(q.keyPc, EAR.qualityOf(q)) + EAR.CHORD[q.item].suffix; }
    if (d === 'scale') { return EAR.SCALE[q.item].name; }
    return EAR.MEMBER[q.item].short + ' in the bass';
  }

  function renderDisplay() {
    var q = S.q, revealed = S.phase === 'revealed';
    $('kicker').textContent = kicker(false);
    $('home').textContent = q ? (revealed ? EAR.tonic(q.keyPc, EAR.qualityOf(q)) : keyName(q.keyPc)) : keyName(S.set.centres[0]);
    $('against').textContent = drill().against.toUpperCase();
    var ans = $('answer');
    ans.textContent = q && revealed ? shortAnswer(q) : q && drill().seq && S.seq.length ? S.seq.map(degLabel).join(' ') : '?';
    ans.classList.toggle('is-outline', !revealed);
    $('name').textContent = q && revealed && q.drill === 'roots' ? itemName('roots', q.item) : '';
    renderBars();
    $('band').textContent = bandLine();
    lastBar = -2;
  }
  function renderTransport() {
    var on = HE.audio.playing || S.busy;
    $('go').setAttribute('aria-pressed', String(on));
    $('go-label').textContent = on && S.busy ? 'Tuning up' : on ? 'Stop' : S.sitting.asked || (S.q && S.q.asked) ? 'Carry on' : 'Start';
    renderDock();
  }

  /* ---------- answering ---------- */

  // The ways a drill can be answered. Every one can be tapped; a single note can be found on a fretboard;
  // anything can be played on a real bass, if the browser will hand over a microphone.
  var CAN_LISTEN = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && CFG.tuner && CFG.listen);
  function ways() {
    var list = [['tap', 'Tap it']];
    if (S.drill === 'deg' || S.drill === 'int' || S.drill === 'inv' || S.drill === 'line' || S.drill === 'roots') { list.push(['fb', 'On the fretboard']); }
    // (the same listener hears a voice as well as a bass: any octave will do)
    if (CAN_LISTEN) { list.push(['mic', 'Play or sing it']); }
    return list;
  }
  function way() { return ways().some(function (w) { return w[0] === S.set.way; }) ? S.set.way : 'tap'; }

  function padButton(id) {
    var d = S.drill, big, small;
    if (drill().seq) {
      // a degree for a line or a progression: it can be pressed as often as the answer needs it
      var on = S.phase === 'revealed' && S.q && S.q.degs.some(function (x) { return EAR.degKey(x) === id; });
      return '<button type="button" class="he-pick' + (on ? ' is-answer' : '') + '" data-answer="' + esc(id) + '"' + (S.phase === 'revealed' ? ' disabled' : '') + '><b>' + esc(EAR.DEG[id].label) + '</b></button>';
    }
    var it = item(id);
    if (d === 'deg') { big = EAR.DEG[id].label; small = ''; }
    else if (d === 'int') { big = EAR.INTERVAL[id].name; small = EAR.INTERVAL[id].also; }
    else if (d === 'chord') { big = (S.q ? keyName(S.q.keyPc) : 'C') + EAR.CHORD[id].suffix; small = it.name; }
    else if (d === 'scale') { big = it.name; small = it.also; }
    else { big = it.name; small = it.also; }
    var revealed = S.phase === 'revealed', right = S.q && S.q.item === id;
    var cls = 'he-pick' + (revealed && right ? ' is-answer' : '') + (S.missed[id] ? ' is-miss' : '');
    return '<button type="button" class="' + cls + '" data-answer="' + esc(id) + '"' + (revealed || S.missed[id] ? ' disabled' : '') + '><b>' + esc(big) + '</b>' + (small ? '<span>' + esc(small) + '</span>' : '') + '</button>';
  }

  // Where the hand sits to answer on a fretboard: six frets, with home under it on the E or the A string.
  function board(q) {
    var onE = (q.keyPc - 4 + 12) % 12, onA = (q.keyPc - 9 + 12) % 12;
    var from = Math.max(0, (onE <= 6 ? onE : onA) - 2);
    return { from: from, to: from + 5 };
  }
  function width(el, most) { return Math.max(260, Math.min(most || 720, (el && el.clientWidth) || 320)); }

  function renderAnswer() {
    var d = drill(), q = S.q, w = way(), list = ways();
    $('q').textContent = d.ask;
    $('q-note').textContent = '';
    $('ways').hidden = list.length < 2;
    $('ways').innerHTML = list.map(function (x) { return tog('data-way="' + x[0] + '"', x[1], w === x[0]); }).join('');
    var pad = $('pad'), fb = $('fb'), mic = $('mic');
    pad.className = 'he-els ear-pad is-' + (d.seq ? 'deg' : S.drill);
    pad.innerHTML = (q ? q.choices : mixNow()[S.drill].items).map(padButton).join('');
    renderSlots();
    fb.hidden = w !== 'fb'; mic.hidden = w !== 'mic';
    // the buttons stay in reach whichever way is chosen: they are also where the answer is shown
    pad.hidden = false;
    if (w === 'fb') { renderBoard(); }
    if (w === 'mic') { renderMic(); }
    $('show').disabled = S.phase === 'revealed' || !q;
    renderDock();
  }

  // A line or a progression: one slot for each note, filled as the degrees are said, and the last go, ticked note by note.
  function renderSlots() {
    var box = $('slots'), q = S.q;
    if (!box) { return; }
    box.hidden = !q || !drill().seq;
    if (box.hidden) { box.innerHTML = ''; return; }
    var n = q.degs.length, revealed = S.phase === 'revealed', html = '<div class="ear-slots-row" aria-label="Your answer so far">';
    for (var i = 0; i < n; i++) {
      var said = revealed ? q.degs[i] : S.seq[i];
      html += '<i class="' + (said ? 'is-filled' : '') + (revealed ? ' is-answer' : '') + '">' + (said ? esc(degLabel(said)) : '') + '</i>';
    }
    html += '</div>';
    if (S.seqLast && !revealed) {
      html += '<div class="ear-slots-row is-last" aria-label="Your last go">' + S.seqLast.said.map(function (d, i) {
        return '<i class="' + (S.seqLast.right[i] ? 'is-right' : 'is-wrong') + '">' + esc(degLabel(d)) + '<small>' + (S.seqLast.right[i] ? '✓' : '✗') + '</small></i>';
      }).join('') + '</div>';
    }
    if (!revealed) { html += '<div class="he-togs">' + tog('data-seq="undo"', 'Undo', false, 'is-link') + tog('data-seq="clear"', 'Start again', false, 'is-link') + '</div>'; }
    box.innerHTML = html;
  }

  function renderBoard() {
    var box = $('fb'), q = S.q;
    if (!q || !B()) { box.innerHTML = ''; return; }
    var n = strings(), win = board(q), tuning = B().tuning(n), marks = [], revealed = S.phase === 'revealed', seq = drill().seq;
    var given = S.drill === 'int' ? q.from : q.homeMidi, want = S.drill === 'int' ? q.to : q.target;
    var homePc = ((q.homeMidi % 12) + 12) % 12;
    tuning.forEach(function (open, s) {
      for (var f = win.from; f <= win.to; f++) {
        var midi = open + f, pc = ((midi % 12) + 12) % 12, at = -1;
        if (seq) {
          // a line or a progression: every home is marked, and once it is out, every note of the answer
          if (revealed) { q.notes.forEach(function (x, i) { if (((x % 12) + 12) % 12 === pc && at === -1) { at = i; } }); }
          if (at !== -1) { marks.push({ string: s, fret: f, label: degLabel(q.degs[at]), kind: pc === homePc ? 'solid' : 'lit' }); }
          else if (pc === homePc) { marks.push({ string: s, fret: f, label: '1', kind: 'solid' }); }
          continue;
        }
        if (midi === given) { marks.push({ string: s, fret: f, label: S.drill === 'int' ? EAR.DEG[q.fromDeg].label : '1', kind: 'solid' }); }
        else if (revealed && want !== undefined && (midi - want) % 12 === 0) { marks.push({ string: s, fret: f, label: shortMark(q), kind: 'lit' }); }
        else if (S.tapped && S.tapped[s + ',' + f]) { marks.push({ string: s, fret: f, label: '', kind: 'wrong' }); }
      }
    });
    box.innerHTML = '<p class="he-small">' + (seq ? 'Home is marked. Tap the notes in order: any octave will do.' : S.drill === 'int' ? 'The first note is marked. Tap where the bass went.' : S.drill === 'inv' ? 'Home is marked. Tap the note the bass is playing.' : 'Home is marked. Tap the other note.') + '</p>' +
      B().fretboard({ strings: n, from: win.from, to: win.to, marks: marks, tap: !revealed, width: width(box), title: 'A fretboard to answer on, frets ' + win.from + ' to ' + win.to });
  }
  function shortMark(q) { return q.drill === 'deg' ? EAR.DEG[q.item].label : q.drill === 'int' ? EAR.DEG[q.toDeg].label : EAR.MEMBER[q.item].short; }

  // A tap on the fretboard, turned into an answer.
  function boardTap(midi, where) {
    var q = S.q;
    if (S.phase !== 'ask' || !q) { return; }
    var id = null, semi;
    if (drill().seq) {
      // a note of a line or a progression: its degree against home, whatever the octave
      semi = ((midi - q.homeMidi) % 12 + 12) % 12;
      EAR.DRILLS.deg.items.forEach(function (it) { if (EAR.DEG[it.id].semi === semi) { id = it.id; } });
      soundNote(midi);
      seqAdd(id, 'fb');
      return;
    }
    if (S.drill === 'deg') {
      semi = ((midi - q.homeMidi) % 12 + 12) % 12;
      EAR.DRILLS.deg.items.forEach(function (it) { if (EAR.DEG[it.id].semi === semi) { id = it.id; } });
      // (an answer that isn't among the ones in play is simply wrong: the note is marked, and that is all)
    } else if (S.drill === 'int') {
      // the same note in another octave is another interval: here the tap has to be the note itself, or its octave the right way
      if (((midi - q.to) % 12 + 12) % 12 === 0) { id = q.item; }
      else { semi = Math.abs(midi - q.from); EAR.DRILLS.int.items.forEach(function (it) { if (EAR.INTERVAL[it.id].semi === semi) { id = it.id; } }); }
    } else {
      if (((midi - q.target) % 12 + 12) % 12 === 0) { id = q.item; }
      else {
        var degs = EAR.CHORD[q.chord].degs;
        semi = ((midi - q.homeMidi) % 12 + 12) % 12;
        degs.forEach(function (dg, i) { if (EAR.DEG[dg].semi % 12 === semi && i < 4) { id = ['root', 'third', 'fifth', 'seventh'][i]; } });
      }
    }
    if (id && EAR.mark(q, id)) { S.tapped = null; conclude(true, false, 'fb'); return; }
    S.tapped = S.tapped || {};
    S.tapped[where] = true;
    if (!S.said && id) { S.said = id; }
    S.tries++;
    if (id) { S.missed[id] = true; }
    say('Not that one. It is still going round: have another listen.');
    renderAnswer();
  }

  /* ---------- playing the answer on a bass ---------- */

  var listener = null, micWaiting = null;
  function script(src) {
    return new Promise(function (resolve, reject) {
      var tag = document.createElement('script');
      tag.src = src; tag.async = false;
      tag.onload = resolve; tag.onerror = reject;
      document.head.appendChild(tag);
    });
  }
  function micOn() {
    if (S.mic === 'on' || S.mic === 'asking') { return; }
    S.mic = 'asking';
    renderMic();
    micWaiting = micWaiting || (window.LBSListen ? Promise.resolve() : script(CFG.tuner).then(function () { return script(CFG.listen); }));
    micWaiting.then(function () {
      listener = listener || window.LBSListen.create();
      listener.onnote = heardNote;
      listener.onlevel = function (level, hz) {
        var bar = $('mic-level');
        if (bar) { bar.style.width = Math.min(100, Math.round(Math.sqrt(level) * 220)) + '%'; bar.classList.toggle('is-clear', !!hz); }
      };
      return listener.start();
    }).then(function () {
      S.mic = 'on';
      renderMic();
    }).catch(function () {
      S.mic = 'refused'; micWaiting = null;
      renderMic();
    });
  }
  function micOff() {
    if (listener) { listener.stop(); }
    if (S.mic === 'on' || S.mic === 'asking') { S.mic = 'off'; }
  }
  // While the band plays, only the second bar is listened to (the first is the band's, and a microphone would
  // hear the bass asking the question). With the band stopped, it listens all the time.
  function micOpen() {
    if (S.phase !== 'ask' || !S.q) { return false; }
    if (!HE.audio.playing) { return true; }
    var pos = HE.audio.position();
    // a progression is played along with, so it listens all the way round; anything else, only in the bars left for the answer
    if (S.q.drill === 'roots') { return !!pos && !pos.counting && pos.round && pos.round.tag === 'ask'; }
    return !!pos && !pos.counting && pos.round && pos.round.tag === 'ask' && pos.bar >= (S.q.askBars || 1);
  }
  function heardNote(n) {
    if (!micOpen()) { return; }
    S.heard.push(n.pc);
    if (S.heard.length > 16) { S.heard.shift(); }
    var want = EAR.wanted(S.q), tail = S.heard.slice(-want.length);
    renderMicLine();
    if (tail.length === want.length && tail.every(function (pc, i) { return pc === want[i]; })) {
      // found: first time only if nothing else was played on the way to it
      if (S.heard.length > want.length) { S.tries++; }
      conclude(true, false, 'mic');
    }
  }
  function renderMicLine() {
    var line = $('mic-line'), heard = $('mic-heard');
    if (!line) { return; }
    var open = micOpen();
    line.textContent = S.mic !== 'on' ? '' : S.phase === 'revealed' ? 'That one is answered.' : open ? 'Listening. Play it now.' : 'Wait for your turn, then play it.';
    line.classList.toggle('is-open', open && S.mic === 'on');
    if (heard) {
      var tonic = S.q ? EAR.tonic(S.q.keyPc, 'major') : 'C', flat = !/♯/.test(tonic);
      heard.innerHTML = S.heard.length ? S.heard.slice(-8).map(function (pc) { return '<i>' + esc(B() ? B().nameOf(48 + pc, flat ? 'flat' : 'sharp') : String(pc)) + '</i>'; }).join('') : '<span class="he-small">Nothing heard yet.</span>';
    }
  }
  var MIC_HOW = {
    deg: 'Play the second note, in any octave.',
    int: 'Play both notes, one after the other.',
    chord: 'Play the chord from its root, a note at a time: root, third, fifth, and the seventh if it has one.',
    scale: 'Play the scale up from home to home. Stop the band first if you want to take your time.',
    inv: 'Play the note the bass has, in any octave.',
    line: 'Play the line back, note for note, in any octave.',
    roots: 'Play the roots along with the band, one for each chord, in order.'
  };
  function renderMic() {
    var box = $('mic');
    if (way() !== 'mic') { return; }
    if (S.mic === 'off') {
      box.innerHTML = '<p class="he-small">Answer on your bass, or sing it: the app listens through the microphone and hears the notes, in any octave. Nothing is recorded or sent anywhere. Wear headphones, or the microphone will hear the band as well.</p>' +
        '<button type="button" class="he-btn is-quiet" data-mic="on">Use the microphone</button>';
    } else if (S.mic === 'asking') {
      box.innerHTML = '<p class="he-small">Asking for the microphone.</p>';
    } else if (S.mic === 'refused') {
      box.innerHTML = '<p class="he-small">The microphone isn’t available. Allow it for this site in the browser’s settings, or answer by tapping.</p>' +
        '<button type="button" class="he-btn is-quiet" data-mic="on">Try again</button>';
    } else {
      box.innerHTML = '<p class="ear-mic-line" id="ear-mic-line" role="status"></p>' +
        '<div class="ear-meter" aria-hidden="true"><i id="ear-mic-level"></i></div>' +
        '<p class="he-small">' + MIC_HOW[S.drill] + ' Or sing it.</p>' +
        '<div class="ear-heard" id="ear-mic-heard" aria-label="Notes heard"></div>' +
        '<div class="he-togs">' + tog('data-mic="clear"', 'Start again', false, 'is-link') + tog('data-mic="off"', 'Switch the microphone off', false, 'is-link') + '</div>';
      renderMicLine();
    }
  }

  /* ---------- the answer, written out ---------- */

  var INTERVAL_OF = { 15: 'a minor tenth', 16: 'a major tenth', 1: 'a minor second', 2: 'a major second', 3: 'a minor third', 4: 'a major third', 5: 'a perfect fourth', 6: 'a tritone', 7: 'a perfect fifth', 8: 'a minor sixth', 9: 'a major sixth', 10: 'a minor seventh', 11: 'a major seventh', 12: 'an octave', 0: 'an octave' };
  function noteName(q, deg) { return B().spell(EAR.tonic(q.keyPc, EAR.qualityOf(q)), deg).name; }

  // The sentence or two that says what the answer is.
  function explain(q) {
    var t = EAR.tonic(q.keyPc, EAR.qualityOf(q)), d = q.drill, out = [];
    if (d === 'deg') {
      var semi = EAR.DEG[q.item].semi;
      out.push(noteName(q, q.item) + ' is the ' + EAR.DEG[q.item].label + ' of ' + t + (q.home === 'minor' ? ' minor' : '') + '.');
      out.push(q.item === '1' ? 'Home again, an octave up.' : q.below ? 'Here it is under home: ' + INTERVAL_OF[12 - semi] + ' below.' : 'It sits ' + INTERVAL_OF[semi] + ' above home.');
    } else if (d === 'line') {
      out.push(q.degs.map(degLabel).join(' ') + ': ' + q.degs.map(function (x) { return noteName(q, x); }).join(', ') + ', against ' + t + (q.home === 'minor' ? ' minor.' : ' major.'));
      var leaps = [];
      for (var i = 1; i < q.notes.length; i++) { var gap = Math.abs(q.notes[i] - q.notes[i - 1]); if (gap > 4) { leaps.push(degLabel(q.degs[i - 1]) + ' to ' + degLabel(q.degs[i]) + ' (' + (INTERVAL_OF[gap] || gap + ' semitones') + (q.notes[i] > q.notes[i - 1] ? ' up' : ' down') + ')'); } }
      out.push(leaps.length ? 'The leaps: ' + leaps.join(', ') + '. Everything else moves by step.' : 'It moves by step and by third all the way: listen for each note against home rather than against the one before.');
    } else if (d === 'roots') {
      var el = window.HE && HE.byId ? HE.byId(q.item) : null;
      if (el) {
        var sp = HE.spell(el, q.keyPc, 'triads');
        out.push(el.roman + ', ' + el.name.replace(/^The /, 'the ') + ', in ' + HE.keyName(el, HE.keyHearings(el, 'triads')[0], q.keyPc) + ': ' + sp.chords.map(function (c) { return c.name; }).join(', ') + '.');
        out.push('The roots: ' + q.degs.map(function (x) { return degLabel(x) + ' (' + noteName(q, x) + ')'; }).join(', ') + '. Built from: ' + el.rel.charAt(0).toLowerCase() + el.rel.slice(1) + '.');
      }
    } else if (d === 'int') {
      var size = EAR.INTERVAL[q.item].semi, places = [];
      out.push(EAR.DEG[q.fromDeg].label + (q.together ? ' and ' : ' ' + (q.dir === 'up' ? 'up' : 'down') + ' to ') + EAR.DEG[q.toDeg].label + ': ' + noteName(q, q.fromDeg) + (q.together ? ' and ' : ' to ') + noteName(q, q.toDeg) + (q.together ? ', together: a double stop.' : '.'));
      // everywhere else this interval lives in the home scale, going the same way
      var scale = q.home === 'minor' ? ['1', '2', 'b3', '4', '5', 'b6', 'b7'] : ['1', '2', '3', '4', '5', '6', '7'];
      scale.forEach(function (a) {
        scale.forEach(function (b) {
          var gap = ((EAR.DEG[b].semi - EAR.DEG[a].semi) % 12 + 12) % 12;
          if ((q.dir === 'up' ? gap : (12 - gap) % 12) === size % 12 && !(a === q.fromDeg && b === q.toDeg) && (size === 12 ? a === b : a !== b)) { places.push(EAR.DEG[a].label + ' to ' + EAR.DEG[b].label); }
        });
      });
      if (size > 12) { out.push('A tenth is a third with an octave between: the shape that spells a chord from the bottom, root below and third on top.'); }
      if (size !== 12 && places.length) { out.push('In ' + t + (q.home === 'minor' ? ' minor' : ' major') + ' the same interval, going ' + q.dir + ', is also ' + places.slice(0, 5).join(', ') + '. Each feels different against home.'); }
    } else if (d === 'chord') {
      var c = EAR.CHORD[q.item];
      out.push(c.name + ' on ' + t + ': ' + c.degs.map(function (x, i) { return i > 3 ? { 'b2': '♭9', '2': '9', '#2': '♯9', '6': '13' }[x] : EAR.DEG[x].label; }).join(', ') + '.');
      out.push('The notes: ' + c.degs.map(function (x) { return noteName(q, x); }).join(', ') + '.');
    } else if (d === 'scale') {
      var sc = EAR.SCALE[q.item];
      out.push(t + ' ' + sc.name.toLowerCase() + (sc.also ? ' (' + sc.also + ')' : '') + ': ' + sc.degs.map(function (x) { return EAR.DEG[x].label; }).join(' ') + '.');
      out.push('What gives it away: ' + sc.tell.map(function (x) { return EAR.DEG[x].label + ' (' + noteName(q, x) + ')'; }).join(' and ') + '.');
    } else {
      var m = EAR.MEMBER[q.item], ch = EAR.CHORD[q.chord];
      out.push(m.name + ' of ' + t + ch.suffix + ' is in the bass: ' + noteName(q, q.bassDeg) + '.');
      out.push(q.item === 'root' ? 'Root position. The chord sits on its own root.' : m.pos + ', written ' + t + ch.suffix + '/' + noteName(q, q.bassDeg) + '.');
    }
    return out;
  }

  function renderResult() {
    var box = $('result'), q = S.q;
    if (S.phase !== 'revealed' || !q || S.strand === 'jam') { box.hidden = true; box.innerHTML = ''; return; }
    var o = S.outcome, head, sub;
    if (o.shown) { head = 'Here it is'; sub = S.tries ? 'Shown after ' + S.tries + (S.tries === 1 ? ' try.' : ' tries.') : ''; }
    else { head = 'Right'; sub = S.tries === 0 ? 'First time.' : 'Got there on try ' + (S.tries + 1) + '. Only a first time answer goes on the record as recognised.'; }
    var ended = S.run.n >= runLen();
    var others = EAR.compareWith(q);
    var links = [];
    if (q.drill === 'roots' && CFG.elements) { links.push('<a class="he-btn is-quiet" href="' + esc(CFG.elements + '#guide/' + q.item) + '">Read it in Harmonic Elements</a>'); }
    if (CFG.drone && (q.drill === 'deg' || q.drill === 'scale' || q.drill === 'line')) { links.push('<a class="he-btn is-quiet" href="' + esc(CFG.drone.replace('NOTE', String(q.keyPc))) + '">Practise it over a drone on ' + esc(EAR.tonic(q.keyPc, EAR.qualityOf(q))) + '</a>'); }
    box.innerHTML = '<p class="he-verdict">' + esc(head) + '</p>' +
      '<p class="he-answer-line">' + esc(shortAnswer(q)) + '</p>' +
      (sub ? '<p>' + esc(sub) + '</p>' : '') +
      (S.news ? '<p class="he-news">' + esc(S.news) + '</p>' : '') +
      '<div class="he-g-text ear-why">' + (B() ? explain(q).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') : '') + '</div>' +
      (others.length ? '<div class="ear-compare"><p class="he-kicker">Hear the other choice</p><div class="he-togs">' + others.map(function (id) {
        return tog('data-compare="' + esc(id) + '"', esc(compareName(id)), false);
      }).join('') + '</div><p class="he-small">Once round with the other answer, on the same home, then back to this one.</p></div>' : '') +
      '<div class="ear-stave" id="ear-stave"></div>' +
      '<div class="ear-neck" id="ear-neck"></div>' +
      '<p class="he-small">' + (HE.audio.playing ? (q.drill === 'roots' ? 'The bass plays the roots from the next time round. ' : 'The bass plays it back from the next time round. ') : '') + 'Tap a note on the neck to hear it.</p>' +
      (links.length ? '<div class="ear-links">' + links.join('') + '</div>' : '') +
      (ended && !S.today ? '<p class="he-news">That run on ' + esc(keyName(S.run.keyPc)) + ': ' + S.run.right + ' of ' + runLen() + ' first time.</p>' : '') +
      '<div class="he-after"><button type="button" class="he-btn is-sound" data-act="next">' + (S.today && ended ? (S.today.at + 1 >= S.today.plan.length ? 'Finish today’s set' : 'Next part') : ended ? 'Next tone centre' : 'Next question') + '</button></div>';
    box.hidden = false;
    drawAnswer();
  }

  // What a near neighbour is called on its button: "♮6", "Dorian", "the third in the bass".
  function compareName(id) {
    var d = S.q ? S.q.drill : S.drill;
    if (d === 'deg') { return EAR.DEG[id].label + ' instead'; }
    if (d === 'chord') { return (S.q ? keyName(S.q.keyPc) : 'C') + EAR.CHORD[id].suffix + ' instead'; }
    if (d === 'inv') { return EAR.MEMBER[id].name.replace(/^The /, 'the ') + ' in the bass'; }
    return itemName(d, id) + ' instead';
  }
  function playCompare(id) {
    var v = EAR.variant(S.q, id);
    if (!v) { return; }
    if (!HE.audio.playing) {
      // with the band stopped: start it on the other choice, and come back to the question after it
      start(compareRound(v));
      return;
    }
    after = askRound();
    join(compareRound(v));
    say('The other choice comes in at the next bar line, once round, then back to the answer.');
  }

  // The answer as notation with TAB beneath, and on the neck.
  function drawAnswer() {
    var q = S.q, stave = $('stave'), neck = $('neck');
    if (!stave || !neck || !B() || !q) { return; }
    var n = strings(), notes = EAR.answerNotes(q), t = EAR.tonic(q.keyPc, EAR.qualityOf(q));
    var placed = B().place(notes.map(function (x) { return x.midi; }), { strings: n, open: true, span: 5 });
    // a progression's chord names go over its roots
    var names = q.drill === 'roots' && window.HE && HE.byId(q.item) ? rootNames(q) : null;
    var symbol = q.drill === 'chord' ? t + EAR.CHORD[q.item].suffix
      : q.drill === 'inv' ? t + EAR.CHORD[q.chord].suffix + (q.item === 'root' ? '' : '/' + noteName(q, q.bassDeg))
      : q.drill === 'scale' ? t + ' ' + EAR.SCALE[q.item].name.toLowerCase() : '';
    var picture = notes.map(function (x, i) {
      var note = { midi: x.midi, name: B().spell(t, x.deg).name, label: x.label, mark: x.mark };
      if (placed.every(Boolean)) { note.string = placed[i].string; note.fret = placed[i].fret; }
      if (i === 0 && symbol) { note.chord = symbol; }
      if (names && names[i]) { note.chord = names[i]; }
      // an inversion: the bass note stands apart from the chord it belongs to
      if (q.drill === 'inv' && i === 1) { note.bar = true; }
      return note;
    });
    stave.innerHTML = B().stave(picture, { strings: n, meter: null, width: width(stave), title: 'The answer in bass clef with TAB: ' + notes.map(function (x) { return B().spell(t, x.deg).name; }).join(', ') });
    if (!placed.every(Boolean)) { neck.innerHTML = ''; return; }
    var lo = 99, hi = 0, marks = [], seen = {};
    placed.forEach(function (p, i) {
      var key = p.string + ',' + p.fret;
      lo = Math.min(lo, p.fret); hi = Math.max(hi, p.fret);
      // (the same place can come up twice, as when the bass has the root: the marked one wins)
      if (seen[key] !== undefined) { if (notes[i].mark) { marks[seen[key]].kind = 'lit'; } return; }
      seen[key] = marks.length;
      marks.push({ string: p.string, fret: p.fret, label: notes[i].label, kind: notes[i].mark ? 'lit' : 'solid' });
    });
    var from = Math.max(0, Math.min(lo, hi - 4)), to = Math.max(hi, from + 4);
    neck.innerHTML = B().fretboard({ strings: n, from: from, to: to, marks: marks, tap: true, width: width(neck), title: 'The answer on the neck, frets ' + from + ' to ' + to });
  }

  // The chord over each root of a progression (the first chord on that root).
  function rootNames(q) {
    var sp = HE.spell(HE.byId(q.item), q.keyPc, 'triads').chords, beat = 0, out = [];
    q.chords.forEach(function (c, i) {
      q.roots.forEach(function (r, k) { if (r.beat === beat && !out[k]) { out[k] = sp[i].name; } });
      beat += c.bars * 4;
    });
    return out;
  }

  // A note tapped on the neck sounds at once (the answer's own notes, or any other, to compare).
  var ringing = null;
  function soundNote(midi) {
    try {
      var c = HE.audio.unlock();
      levels();
      HE.synth.note(S.set.voice, midi, c, { len: 1.1, vel: 0.9 }).then(function (part) {
        if (ringing) { ringing.stop(); }
        ringing = HE.audio.shot(part, 'bass');
      }).catch(function () { /* no sound */ });
    } catch (e) { /* no sound */ }
  }

  /* ---------- the Jam room ---------- */

  // A chord on home, going round for as long as you like, to play over. These are the home chords: the
  // flavours a home can have, the extra ones Harmonic Elements leaves out for now among them. Each says
  // which scales sit over it, to show on the neck as rings; the chord's own notes are the solid marks.
  var JAM = [
    { q: 'M', c: 'maj', group: 'Triads', scales: ['major', 'majpent', 'mixolydian', 'lydian'], say: 'Bright and settled. The 3 makes it major: lean on it and the chord sings.' },
    { q: 'm', c: 'min', group: 'Triads', scales: ['dorian', 'minor', 'minpent', 'phrygian'], say: 'The ♭3 is the colour. Over it, Dorian’s 6 lifts the mood and the natural minor’s ♭6 darkens it.' },
    { q: 'sus2', c: 'sus2', group: 'Triads', scales: ['majpent', 'mixolydian', 'dorian'], say: 'No third, so it is neither major nor minor: the 3 or the ♭3 you play decides it.' },
    { q: 'sus4', c: 'sus4', group: 'Triads', scales: ['mixolydian', 'dorian', 'minpent'], say: 'The 4 wants to fall to the 3, and never does. Root, 4 and 5 make a strong, open riff.' },
    { q: 'aug', c: 'aug', group: 'Triads', scales: [], say: 'Three major thirds stacked: it divides the octave equally, so any of its notes could be home. Play its notes, and walk between them.' },
    { q: 'dim', c: 'dim', group: 'Triads', scales: ['locrian'], say: 'Two minor thirds: the ♭5 makes it tense. It rarely stays home for long, which is why a vamp on it is good practice.' },
    { q: '6', c: '6', group: 'Sixths and sevenths', scales: ['majpent', 'major'], say: 'Major with the 6 on top: sweet and old fashioned. The major pentatonic is all chord tones but the 2.' },
    { q: 'm6', c: 'm6', group: 'Sixths and sevenths', scales: ['dorian', 'melodic'], say: 'Minor with a major 6: the Dorian sound in one chord. Lean on the 6.' },
    { q: 'M7', c: 'maj7', group: 'Sixths and sevenths', scales: ['major', 'lydian', 'majpent'], say: 'Dreamy. The 7 sits a semitone under home: in the major scale the 4 rubs, so try Lydian’s ♯4 instead.' },
    { q: '7', c: '7', group: 'Sixths and sevenths', scales: ['mixolydian', 'blues', 'majpent'], say: 'The 3 and the ♭7 are a tritone apart, so it is restless: the sound of the blues and of funk on one chord.' },
    { q: 'm7', c: 'm7', group: 'Sixths and sevenths', scales: ['dorian', 'minor', 'minpent'], say: 'Minor and relaxed: the one chord vamp of funk and soul. The minor pentatonic is all chord tones but the 4.' },
    { q: 'h7', c: 'm7b5', group: 'Sixths and sevenths', scales: ['locrian'], say: 'Half diminished: minor with a ♭5. Usually on its way somewhere: keep the ♭5 in your ear.' },
    { q: 'dim7', c: 'dim7', group: 'Sixths and sevenths', scales: [], say: 'Four minor thirds: move any shape up three frets and it is the same chord. Play the four notes and the note a semitone below each.' },
    { q: 'mM7', c: 'mM7', group: 'Sixths and sevenths', scales: ['melodic', 'harmonic'], say: 'Minor with a major 7: the spy film chord. The 7 a semitone under home is the one to find.' },
    { q: '9', c: '9', group: 'Colour', scales: ['mixolydian', 'majpent'], say: 'A dominant seventh with the 9 on top: funkier and less tense than the plain 7.' }
  ];
  var JAM_BY = {}; JAM.forEach(function (f) { JAM_BY[f.q] = f; });
  var JAM_TEMPOS = [70, 85, 100, 115];
  var JAM_FEELS = ['Rock 8ths', 'Pop 16ths', 'Funky 16ths', 'Soul', 'Shuffle', 'Swing', 'Half-time', 'Hip hop', 'Neo soul', 'Bossa', 'Reggae'];
  var JAM_SOUNDS = [['rhodes', 'Electric piano'], ['grand', 'Grand piano'], ['organ', 'Organ'], ['guitar', 'Electric guitar'], ['pad', 'Warm pad'], ['soul-band', 'Soul band']];
  var SEMI_DEG = ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'];
  var jw = saved.jam || {};
  var J = {
    flav: JAM_BY[jw.flav] ? jw.flav : 'm7',
    pc: jw.pc >= 0 && jw.pc < 12 ? +jw.pc : 9,
    bpm: JAM_TEMPOS.indexOf(+jw.bpm) !== -1 ? +jw.bpm : 85,
    feel: JAM_FEELS.indexOf(jw.feel) !== -1 ? jw.feel : 'Funky 16ths',
    sound: JAM_SOUNDS.some(function (s) { return s[0] === jw.sound; }) ? jw.sound : 'rhodes',
    playing: jw.playing === 'held' ? 'held' : 'feel',
    bass: jw.bass === 'band' ? 'band' : 'you',
    scale: typeof jw.scale === 'string' ? jw.scale : ''
  };
  var jamOn = false, jamRaf = 0;
  function jamFlav() { return JAM_BY[J.flav]; }
  function jamScale() { var f = jamFlav(); return f.scales.indexOf(J.scale) !== -1 ? J.scale : f.scales[0] || ''; }
  function jamMinor() { return EAR.CHORD[jamFlav().c].degs.indexOf('b3') !== -1; }
  function jamTonic() { return EAR.tonic(J.pc, jamMinor() ? 'minor' : 'major'); }
  function jamName() { return jamTonic() + HE.QUAL[J.flav].suffix; }
  // Where the bass's home sits for the degree taps: C2 to B2, low enough to be a bass and high enough for a phone.
  function jamHome() { return 36 + J.pc; }
  function jamRound() {
    var el = { id: 'jam-' + J.flav, tri: [{ deg: '1', qual: J.flav, bars: 4 }] };
    var r = { tag: 'jam', bpm: J.bpm, bars: 4, feel: J.feel, el: el, keyPc: J.pc, voicing: 'triads', chord: { source: 'synth', sound: J.sound, playing: J.playing } };
    if (S.set.drums) { r.drum = { source: 'synth', kit: HE.synth.kitsFor(J.feel)[0], groove: 0 }; }
    if (J.bass === 'band') {
      // root and fifth, two to the bar, with a push into each bar
      var root = 28 + ((J.pc - 4 + 12) % 12), fifth = root + 7, strikes = [];
      for (var b = 0; b < 4; b++) {
        strikes.push({ beat: b * 4, len: 1.7, notes: [root], vel: 0.9 });
        strikes.push({ beat: b * 4 + 2, len: 1.2, notes: [b % 2 ? root + 12 : fifth], vel: 0.78 });
        if (b === 3) { strikes.push({ beat: 15.5, len: 0.4, notes: [fifth], vel: 0.7 }); }
      }
      r.bassSpec = { bpm: J.bpm, bars: 4, parts: [{ inst: S.set.voice, strikes: strikes }] };
    }
    return r;
  }
  var jamSource = {
    chords: function (r, c) { return HE.synth.chords(r, c); },
    drums: function (r, c) { return r.drum ? HE.synth.drums(r, c) : null; },
    more: function (r, c) {
      if (!r.bassSpec) { return Promise.resolve([]); }
      return HE.synth.score(r.bassSpec, c).then(function (p) { return [{ name: 'bass', buffer: p.buffer, lead: 0, length: p.length, gain: p.gain }]; });
    }
  };
  function jamPlay() {
    if (!HE.audio.supported || !HE.synth.supported) { say('Sound isn’t available in this browser.'); return; }
    var c;
    try { c = HE.audio.unlock(); } catch (e) { say('Sound isn’t available in this browser.'); return; }
    levels();
    S.busy = true; jamOn = true;
    if (!S.sitting.since) { S.sitting.since = Date.now(); }
    renderJamTransport();
    HE.audio.play(jamRound(), jamSource, { countIn: false }).then(function (res) {
      S.busy = false;
      if (res) { wake(true); jamTick(); say('Going round: ' + jamName() + '. Play over it for as long as you like.'); }
      renderJamTransport();
    }).catch(function () { S.busy = false; jamOn = false; fail(); renderJamTransport(); });
  }
  // A change while it plays comes in where the loop next comes round (a new tempo starts it again).
  function jamChanged(restart) {
    save(); renderJam();
    if (!jamOn || !HE.audio.playing) { return; }
    if (restart) { HE.audio.stop(); jamPlay(); return; }
    try { HE.audio.play(jamRound(), jamSource, { at: 'loop' }).catch(function () { /* the old one goes round again */ }); } catch (e) { /* no sound */ }
  }
  function jamStop() {
    if (!jamOn) { return; }
    jamOn = false;
    window.cancelAnimationFrame(jamRaf);
    HE.audio.stop();
    S.busy = false;
    if (S.sitting.since) { S.sitting.ms += Date.now() - S.sitting.since; S.sitting.since = 0; }
    wake(false);
    renderJamTransport();
    renderRecord();
  }
  function jamTick() {
    window.cancelAnimationFrame(jamRaf);
    var cells = $('jam-bars') ? $('jam-bars').children : [], last = -2;
    (function frame() {
      if (!jamOn || !HE.audio.playing) { [].forEach.call(cells, function (c) { c.classList.remove('is-on'); }); return; }
      var pos = HE.audio.position(), bar = pos && !pos.counting ? pos.bar : -1;
      if (bar !== last) { [].forEach.call(cells, function (c, i) { c.classList.toggle('is-on', i === bar); }); last = bar; }
      if (pos) { $('jam-bars').style.setProperty('--he-beat', String(pos.beat + 1)); }
      jamRaf = window.requestAnimationFrame(frame);
    }());
  }
  function renderJamTransport() {
    var b = $('jam-go'); if (!b) { return; }
    var on = jamOn;
    b.setAttribute('aria-pressed', String(on));
    b.textContent = on && S.busy ? 'Tuning up' : on ? 'Stop' : 'Play';
  }
  // Every note of the chord and the scale chosen, from home: [{semi, deg, label, chord}].
  function jamNotes() {
    var f = jamFlav(), out = {}, scale = jamScale();
    EAR.CHORD[f.c].degs.forEach(function (d) { var s = EAR.DEG[d].semi % 12; out[s] = { semi: s, deg: d, label: EAR.DEG[d].label, chord: true }; });
    if (scale) { EAR.SCALE[scale].degs.forEach(function (d) { var s = EAR.DEG[d].semi % 12; if (!out[s]) { out[s] = { semi: s, deg: d, label: EAR.DEG[d].label, chord: false }; } }); }
    return Object.keys(out).map(Number).sort(function (a, b) { return a - b; }).map(function (s) { return out[s]; });
  }
  function renderJam() {
    var f = jamFlav(), box = $('jam-body'); if (!box) { return; }
    var scale = jamScale(), notes = jamNotes(), groups = [];
    JAM.forEach(function (x) { if (groups.indexOf(x.group) === -1) { groups.push(x.group); } });
    var keys = EAR.KEYS.slice().sort(function (a, b) { return a.pc - b.pc; });
    var html =
      '<div class="ear-jam-top"><button type="button" class="he-btn is-sound" id="ear-jam-go" data-jam="go" aria-pressed="false">Play</button>' +
      '<div><p class="ear-jam-name">' + esc(jamName()) + '</p><p class="he-small">' + esc(EAR.CHORD[f.c].name) + ' on ' + esc(jamTonic()) + ' · ' + J.bpm + ' bpm · ' + esc(J.feel) + '</p></div>' +
      '<ol class="ear-jam-bars" id="ear-jam-bars" aria-hidden="true"><li></li><li></li><li></li><li></li></ol></div>' +
      '<p class="ear-jam-say">' + esc(f.say) + '</p>' +
      groups.map(function (g) {
        return '<p class="he-kicker">' + esc(g) + '</p><div class="he-togs">' + JAM.filter(function (x) { return x.group === g; }).map(function (x) {
          return tog('data-jamflav="' + x.q + '"', esc(EAR.CHORD[x.c].name), J.flav === x.q);
        }).join('') + '</div>';
      }).join('') +
      '<p class="he-kicker">Home</p><div class="he-togs ear-jam-keys">' + keys.map(function (k) { return tog('data-jampc="' + k.pc + '"', esc(EAR.tonic(k.pc, jamMinor() ? 'minor' : 'major')), J.pc === k.pc); }).join('') + '</div>' +
      '<p class="he-kicker">On the neck</p>' +
      '<div class="he-togs">' + f.scales.map(function (id) { return tog('data-jamscale="' + id + '"', esc(EAR.SCALE[id].name), scale === id); }).join('') + tog('data-jamscale="none"', 'Chord only', !scale) + '</div>' +
      '<div class="ear-jam-fb" id="ear-jam-fb"></div>' +
      '<p class="he-small">' + (scale ? 'Solid: the chord’s own notes. Rings: the rest of ' + esc(EAR.SCALE[scale].name.toLowerCase()) + '. ' : 'The chord’s own notes. ') + 'Tap a note, here or below, to hear it against the chord.</p>' +
      '<div class="ear-jam-degs">' + notes.map(function (n) {
        return '<button type="button" class="he-tog' + (n.chord ? ' is-chord' : '') + '" data-jamdeg="' + n.semi + '"><b>' + esc(n.label) + '</b> <span>' + esc(B() ? B().spell(jamTonic(), n.deg).name : '') + '</span></button>';
      }).join('') + '</div>' +
      '<details class="ear-jam-more"><summary>The band</summary>' +
      '<p class="he-kicker">Tempo</p><div class="he-togs">' + JAM_TEMPOS.map(function (t) { return tog('data-jambpm="' + t + '"', t + ' bpm', J.bpm === t); }).join('') + '</div>' +
      '<p class="he-kicker">Feel</p><div class="he-togs">' + JAM_FEELS.map(function (x) { return tog('data-jamfeel="' + esc(x) + '"', esc(x), J.feel === x); }).join('') + '</div>' +
      '<p class="he-kicker">The chord</p><div class="he-togs">' + [['feel', 'Played in the feel'], ['held', 'Held']].map(function (v) { return tog('data-jamplaying="' + v[0] + '"', v[1], J.playing === v[0]); }).join('') + '</div>' +
      '<p class="he-kicker">Played on</p><div class="he-togs">' + JAM_SOUNDS.map(function (s) { return tog('data-jamsound="' + s[0] + '"', esc(s[1]), J.sound === s[0]); }).join('') + '</div>' +
      '<p class="he-kicker">The bass</p><div class="he-togs">' + [['you', 'Yours: the band leaves it to you'], ['band', 'The band plays roots and fifths']].map(function (v) { return tog('data-jambass="' + v[0] + '"', v[1], J.bass === v[0]); }).join('') + '</div>' +
      '</details>' +
      '<div class="ear-links">' +
      '<button type="button" class="he-btn is-quiet" data-jam="test">Test these degrees</button>' +
      (CFG.drone ? '<a class="he-btn is-quiet" href="' + esc(CFG.drone.replace('NOTE', String(J.pc))) + '">A drone on ' + esc(jamTonic()) + '</a>' : '') +
      (CFG.elements ? '<a class="he-btn is-quiet" href="' + esc(CFG.elements + '#dojo') + '">Loops in Harmonic Elements</a>' : '') + '</div>';
    box.innerHTML = html;
    renderJamBoard();
    renderJamTransport();
  }
  function renderJamBoard() {
    var box = $('jam-fb'); if (!box || !B()) { return; }
    var n = strings(), tuning = B().tuning(n), marks = [], by = {};
    jamNotes().forEach(function (x) { by[x.semi] = x; });
    tuning.forEach(function (open, s) {
      for (var f = 0; f <= 12; f++) {
        var x = by[(((open + f - J.pc) % 12) + 12) % 12];
        if (x) { marks.push({ string: s, fret: f, label: x.label, kind: x.semi === 0 ? 'solid' : x.chord ? 'lit' : 'ring' }); }
      }
    });
    box.innerHTML = B().fretboard({ strings: n, from: 0, to: 12, marks: marks, tap: true, width: width(box, 900), title: 'The notes of ' + jamName() + ' on the neck, frets 0 to 12' });
  }
  // Hear the degrees of this chord in the Degrees drill: the ones on the neck, against a home of the same kind.
  function jamTest() {
    var items = jamNotes().map(function (n) { return SEMI_DEG[n.semi]; });
    if (items.length < 3) { items = ['1', '3', '5']; }
    jamStop();
    S.mix.deg.items = items;
    if (!has(S.set.centres, J.pc)) { S.set.centres = S.set.centres.concat([J.pc]); }
    S.strand = 'intervals'; S.drill = 'deg'; S.today = null; S.q = null;
    S.run = null; newRun(J.pc); S.run.n = 0;
    newQuestion();
    save(); renderAll();
    say('The Degrees drill, with the notes of ' + jamName() + ' in play. Press Start.');
    var tab = app.querySelector('[data-strand="intervals"]'); if (tab) { tab.focus(); }
  }
  function jamClick(b) {
    var v;
    if ((v = b.getAttribute('data-jam'))) {
      if (v === 'go') { if (jamOn) { jamStop(); } else { jamPlay(); } }
      else if (v === 'test') { jamTest(); }
      return;
    }
    if ((v = b.getAttribute('data-jamflav'))) { J.flav = v; jamChanged(false); focusJam('[data-jamflav="' + v + '"]'); return; }
    if ((v = b.getAttribute('data-jampc'))) { J.pc = +v; jamChanged(false); focusJam('[data-jampc="' + v + '"]'); return; }
    if ((v = b.getAttribute('data-jamscale'))) { J.scale = v === 'none' ? 'none' : v; save(); renderJam(); focusJam('[data-jamscale="' + v + '"]'); return; }
    if ((v = b.getAttribute('data-jamdeg'))) { soundNote(jamHome() + (+v)); return; }
    if ((v = b.getAttribute('data-jambpm'))) { J.bpm = +v; jamChanged(true); focusJam('[data-jambpm="' + v + '"]', true); return; }
    if ((v = b.getAttribute('data-jamfeel'))) { J.feel = v; jamChanged(false); focusJam('[data-jamfeel="' + v + '"]', true); return; }
    if ((v = b.getAttribute('data-jamplaying'))) { J.playing = v; jamChanged(false); focusJam('[data-jamplaying="' + v + '"]', true); return; }
    if ((v = b.getAttribute('data-jamsound'))) { J.sound = v; jamChanged(false); focusJam('[data-jamsound="' + v + '"]', true); return; }
    if ((v = b.getAttribute('data-jambass'))) { J.bass = v; jamChanged(false); focusJam('[data-jambass="' + v + '"]', true); return; }
  }
  // After a redraw: focus back where it was, and the band's settings still open if they were.
  function focusJam(sel, open) {
    if (open) { var d = app.querySelector('.ear-jam-more'); if (d) { d.open = true; } }
    var el = app.querySelector('#ear-jam ' + sel); if (el) { el.focus(); }
  }

  /* ---------- what is in play, and how it is set up ---------- */

  // Across the top: Today's set, the six strands, and the Jam room.
  function renderStrands() {
    var all = [{ id: 'today', name: 'Today' }].concat(EAR.STRANDS).concat([{ id: 'jam', name: 'Jam' }]);
    $('strands').innerHTML = all.map(function (s) {
      return '<button type="button" class="he-tab" data-strand="' + s.id + '" aria-pressed="' + (S.strand === s.id) + '">' + esc(s.name) + '</button>';
    }).join('');
    var jam = S.strand === 'jam';
    app.classList.toggle('is-jam', jam);
    $('jam').hidden = !jam;
    [].forEach.call(app.querySelectorAll('[data-quiz]'), function (el) { el.hidden = jam; });
    if (jam) { $('drills').hidden = true; $('drill-note').textContent = 'No questions here: a chord goes round for as long as you like, and you play over it. The notes it fixes are on the neck.'; renderJam(); return; }
    if (S.strand === 'today') {
      $('drills').hidden = true;
      var plan = S.today ? S.today.plan : [];
      $('drill-note').innerHTML = 'A short set chosen from your record: what you have missed lately first, then what you haven’t heard for a while, then something new. ' +
        '<span class="ear-plan">' + plan.map(function (p, i) {
          return '<b class="' + (S.today && i === S.today.at ? 'is-on' : '') + '">' + (i + 1) + '. ' + esc(EAR.DRILLS[p.drill].name) + '</b> <span>' + esc(p.items.map(function (id) { return itemName(p.drill, id); }).join(', ')) + ' (' + esc(p.why) + ')</span>';
        }).join('') + '</span>';
      return;
    }
    var mine = EAR.STRANDS.filter(function (s) { return s.id === S.strand; })[0].drills;
    $('drills').hidden = mine.length < 2;
    $('drills').innerHTML = mine.map(function (id) { return tog('data-drill="' + id + '"', esc(EAR.DRILLS[id].name), S.drill === id); }).join('');
    $('drill-note').textContent = drill().note;
  }

  function renderMix() {
    $('mix').hidden = S.strand === 'jam' || S.strand === 'today';
    var d = drill(), m = S.mix[S.drill], html;
    $('mix-h').textContent = 'In play: ' + d.name.toLowerCase();
    $('mix-sum').textContent = m.items.length + ' of ' + d.items.length;
    $('sets').innerHTML = d.sets.map(function (s) {
      var on = same(s.items, m.items) && (!s.chords || same(s.chords, m.chords));
      return tog('data-set="' + s.id + '"', esc(s.name), on);
    }).join('');
    $('items').innerHTML = d.items.map(function (it) {
      var label = S.drill === 'deg' ? EAR.DEG[it.id].label : S.drill === 'chord' ? 'C' + EAR.CHORD[it.id].suffix : S.drill === 'roots' ? it.name.split(' · ')[0] : it.name;
      return tog('data-item="' + esc(it.id) + '"', esc(label), has(m.items, it.id), S.drill === 'deg' ? 'is-note' : '');
    }).join('');
    html = '';
    if (S.drill === 'deg') {
      html = '<label class="he-switch"><input type="checkbox" data-opt="below"' + (m.below ? ' checked' : '') + '><span>Sometimes under home as well as over it</span></label>';
    } else if (S.drill === 'int') {
      html = '<p class="he-kicker">How</p><div class="he-togs">' + [['apart', 'One then the other'], ['together', 'Together'], ['both', 'Either']].map(function (v) { return tog('data-how="' + v[0] + '"', v[1], m.how === v[0]); }).join('') + '</div>' +
        '<p class="he-kicker">Which way</p><div class="he-togs">' + [['up', 'Up'], ['down', 'Down'], ['both', 'Both']].map(function (v) { return tog('data-dir="' + v[0] + '"', v[1], m.dir === v[0]); }).join('') + '</div>';
    } else if (S.drill === 'line') {
      html = '<p class="he-kicker">Made of</p><div class="he-togs">' + EAR.NOTE_SET_ORDER.map(function (k) { return tog('data-notes="' + k + '"', esc(EAR.NOTE_SETS[k].name), m.notes === k); }).join('') + '</div>' +
        '<p class="he-kicker">Starts on</p><div class="he-togs">' + [['home', 'Home'], ['any', '1, 3 or 5']].map(function (v) { return tog('data-start="' + v[0] + '"', v[1], m.start === v[0]); }).join('') + '</div>';
    } else if (S.drill === 'roots') {
      html = '<p class="he-kicker">The bass</p><div class="he-togs">' + [['heard', 'Plays the roots: name them'], ['you', 'Sits out: you supply them']].map(function (v) { return tog('data-bassmode="' + v[0] + '"', v[1], m.bass === v[0]); }).join('') + '</div>';
    } else if (S.drill === 'inv') {
      html = '<p class="he-kicker">On these chords</p><div class="he-togs">' + EAR.INV_CHORDS.map(function (c) { return tog('data-invchord="' + c + '"', esc(EAR.CHORD[c].name), has(m.chords, c)); }).join('') + '</div>';
    }
    $('opts').innerHTML = html;
    $('opts').hidden = !html;
  }
  function mixChanged(focusSel) {
    S.mix = EAR.cleanMix(S.mix);
    save();
    renderMix();
    if (focusSel) { var el = app.querySelector(focusSel); if (el) { el.focus(); } }
    // a question that has been heard is left to finish: the next one is drawn from the new mix
    if (S.q && S.q.asked) { return; }
    // one not yet heard is chosen again (and at the top of a run, the home it is asked against may change with the mix)
    if (S.run && S.run.n === 0) { var home = EAR.homeFor(S.drill, S.mix); if (home !== S.run.home) { S.run.home = home; S.run.fresh = true; } }
    newQuestion();
    renderAll();
    if (HE.audio.playing) { rejoin(); }
  }
  // The question changed under a loop that is going: bring the new one in on the bar line.
  function rejoin() {
    if (S.run.fresh) { S.run.fresh = false; after = askRound(); join(introRound()); } else { join(askRound()); }
  }

  function renderSetup() {
    $('voice').innerHTML = HE.band.BASSES.map(function (b) { return tog('data-voice="' + b.id + '"', esc(b.name), S.set.voice === b.id); }).join('');
    $('strings').innerHTML = [4, 5, 6].map(function (k) { return tog('data-strings="' + k + '"', String(k), strings() === k); }).join('');
    $('tempo').innerHTML = TEMPOS.map(function (t) { return tog('data-bpm="' + t[0] + '"', t[1] + ' · ' + t[0], S.set.bpm === +t[0]); }).join('');
    $('bandset').innerHTML = tog('data-drums="1"', 'Keys and drums', S.set.drums) + tog('data-drums="0"', 'Keys only', !S.set.drums);
    $('keys').innerHTML = KEYS_SOUNDS.map(function (k) { return tog('data-keys="' + k[0] + '"', k[1], S.set.keys === k[0]); }).join('');
    $('centres').innerHTML = EAR.KEYS.map(function (k) { return tog('data-centre="' + k.pc + '" aria-label="' + k.name.replace('♭', ' flat') + '"', k.name, has(S.set.centres, k.pc), 'is-note'); }).join('');
    $('centre-sets').innerHTML = KEY_SETS.map(function (s, i) { return tog('data-centreset="' + i + '"', s[0], same(s[1], S.set.centres), 'is-link'); }).join('');
    $('auto').innerHTML = tog('data-auto="0"', 'Wait for me', !S.set.auto) + tog('data-auto="1"', 'Move on by itself', S.set.auto);
    $('setup-sum').textContent = (S.set.voice === 'ubass' ? 'Upright' : 'Electric') + ' · ' + strings() + ' strings · ' + S.set.bpm + ' bpm';
  }

  function syncLevels() {
    [].forEach.call(app.querySelectorAll('[data-level]'), function (input) { input.value = Math.round(S.levels[input.getAttribute('data-level')] * 100); });
    [].forEach.call(app.querySelectorAll('[data-level-out]'), function (out) { out.textContent = Math.round(S.levels[out.getAttribute('data-level-out')] * 100); });
  }

  /* ---------- the record ---------- */

  function minutes() {
    var ms = S.sitting.ms + (S.sitting.since ? Date.now() - S.sitting.since : 0);
    return Math.round(ms / 60000);
  }
  function renderRecord() {
    var st = EAR.stats(S.log), total = 0, got = 0, rows = [];
    Object.keys(EAR.DRILLS).forEach(function (id) {
      EAR.DRILLS[id].items.forEach(function (it) {
        total++;
        var r = st.items[id + ':' + it.id];
        if (r && r.recognised) { got++; }
        if (r) { rows.push({ drill: EAR.DRILLS[id], item: it, r: r }); }
      });
    });
    var streak = 0;
    for (var i = S.log.length - 1; i >= 0 && S.log[i].ok; i--) { streak++; }
    $('rec-sum').textContent = S.sitting.asked ? 'This sitting: ' + S.sitting.right + ' of ' + S.sitting.asked + ' first time' : '';
    var tile = function (label, n, small) { return '<div><dt>' + label + '</dt><dd>' + n + (small ? '<span>' + small + '</span>' : '') + '</dd></div>'; };
    $('rec-tiles').hidden = !S.log.length;
    $('rec-tiles').innerHTML = tile('Recognised', got, 'of ' + total) + tile('Answered', S.log.length, S.log.length === 1 ? 'question' : 'questions') + tile('In a row', streak, 'first time');
    if (!rows.length) {
      $('rec-list').innerHTML = '<li class="is-empty">Nothing here yet. Each question you answer adds a dot beside what it asked: filled if you had it first time, hollow if not. Four filled from the last five, on two different days, and it counts as recognised.</li>';
    } else {
      var lastDrill = '';
      $('rec-list').innerHTML = rows.map(function (x) {
        var dots = '', r = x.r, right = r.last.filter(Boolean).length, head = '';
        for (var k = 0; k < 5; k++) { dots += '<i' + (k < r.last.length ? ' class="' + (r.last[k] ? 'is-ok' : 'is-no') + '"' : '') + '></i>'; }
        if (x.drill.id !== lastDrill) { lastDrill = x.drill.id; head = '<li class="ear-rec-head he-kicker">' + esc(x.drill.name) + '</li>'; }
        var label = itemName(x.drill.id, x.item.id);
        return head + '<li><span class="he-who"><b>' + esc(label) + '</b></span>' +
          '<span class="he-how' + (r.recognised ? ' is-got' : '') + '"><span class="he-dots" role="img" aria-label="' + right + ' right of the last ' + r.last.length + '">' + dots + '</span>' +
          '<span>' + (r.recognised ? 'Recognised' : right + ' of last ' + r.last.length) + '</span></span></li>';
      }).join('');
    }
    var top = st.mixups.slice(0, 3).map(function (m) {
      var name = function (id) { return m.drill === 'deg' ? EAR.DEG[id].label : itemName(m.drill, id).toLowerCase(); };
      return name(m.was) + ' taken for ' + name(m.said) + (m.times > 1 ? ' (' + m.times + ' times)' : '');
    });
    $('rec-mix').textContent = top.length ? 'Worth another listen: ' + top.join('; ') + '.' : '';

    // a sitting can go in a member's practice diary
    var mins = minutes(), diary = $('diary');
    diary.hidden = !MEMBER || (!S.sitting.asked && !S.sitting.diary);
    if (MEMBER) {
      $('diary-go').disabled = mins < 1 || S.sitting.asked < 1 || S.sitting.diaryBusy;
      $('diary-go').textContent = S.sitting.diary ? 'Update my diary' : 'Add it to my practice diary';
      $('diary-note').textContent = S.sitting.diaryNote || (mins < 1 ? 'A minute or more of playing can go in your practice diary, and counts towards your habit.' : 'This sitting: ' + mins + (mins === 1 ? ' minute' : ' minutes') + ', ' + S.sitting.asked + (S.sitting.asked === 1 ? ' question.' : ' questions.'));
    }
    $('share-row').hidden = !MEMBER;
    $('share').checked = S.share;
    var note = $('share-note');
    if (MEMBER) {
      note.textContent = (S.share ? 'On. Jack sees what you recognise and what you mix up, so sessions can go straight to it.' : 'Off, so this record is yours alone. It is kept with your account, and Jack isn’t shown it.') +
        (S.unsaved ? ' The last answer hasn’t been saved yet. It will go with the next one.' : '');
    } else if (CFG.signin) {
      note.innerHTML = 'Kept in this browser only. <a href="' + esc(CFG.signin) + '">Members who sign in</a> keep theirs with their account, and can choose to share it with Jack.';
    } else { note.textContent = 'Kept in this browser only.'; }
    $('rec-tools').innerHTML = !S.log.length ? '' : S.confirmClear
      ? tog('data-clear="yes"', 'Yes, clear it', false) + tog('data-clear="no"', 'Keep it', false)
      : tog('data-clear="ask"', 'Clear my record', false, 'is-link');
  }

  /* ---------- the dock: play, stop and Next within reach on a phone ---------- */

  var dockPast = false, appSeen = true;
  function renderDock() {
    var dock = $('dock');
    if (!dock) { return; }
    var show = dockPast && appSeen && !!S.q && S.strand !== 'jam';
    dock.hidden = !show;
    app.classList.toggle('has-dock', show);
    if (!show) { return; }
    var on = HE.audio.playing || S.busy, revealed = S.phase === 'revealed';
    $('dock-go').setAttribute('aria-pressed', String(on));
    $('dock-go').setAttribute('aria-label', on ? 'Stop' : 'Start');
    $('dock-kicker').textContent = kicker(false);
    $('dock-line').textContent = keyName(S.q.keyPc) + ' · ' + (revealed ? shortAnswer(S.q) : drill().ask);
    $('dock-act').textContent = revealed ? 'Next' : 'Show me';
    $('dock-act').className = 'he-btn' + (revealed ? ' is-sound' : ' is-quiet');
  }
  if (window.IntersectionObserver && $('dock')) {
    var watch = new window.IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.target === app) { appSeen = en.isIntersecting; }
        else { dockPast = !en.isIntersecting && en.boundingClientRect.bottom < (en.rootBounds ? en.rootBounds.top + 1 : 1); }
      });
      renderDock();
    }, { rootMargin: '-64px 0px 0px 0px' });
    watch.observe(app); watch.observe($('go'));
    $('dock-go').addEventListener('click', function () { $('go').click(); });
    $('dock-act').addEventListener('click', function () { if (S.phase === 'revealed') { next(); } else if (S.q) { conclude(false, true); } });
  }

  function renderAll() { renderStrands(); renderDisplay(); renderAnswer(); renderResult(); renderMix(); renderTransport(); renderRecord(); }

  // Change what is being worked on: a strand, Today's set, or the Jam room. The band carries on where it can.
  function chooseStrand(v) {
    var going = HE.audio.playing && S.strand !== 'jam';
    if (S.strand === 'jam' && v !== 'jam') { jamStop(); }
    if (v === 'jam') { if (HE.audio.playing || S.busy) { stop(); } S.strand = v; save(); renderAll(); say(''); return; }
    S.strand = v;
    if (v === 'today') { startToday(); }
    else { S.today = null; S.drill = EAR.STRANDS.filter(function (s) { return s.id === v; })[0].drills[0]; S.q = null; S.run = null; }
    newQuestion();
    save(); renderAll(); say('');
    if (going) { rejoin(); }
  }

  /* ---------- wiring ---------- */

  $('go').addEventListener('click', function () { if (HE.audio.playing || S.busy) { stop(); } else { start(); } });
  $('show').addEventListener('click', function () { if (S.phase === 'ask' && S.q) { conclude(false, true); } });

  app.addEventListener('click', function (e) {
    var b = e.target.closest('button, [data-fb]'), v;
    if (!b) { return; }
    if (b.hasAttribute('data-fb')) {
      // a tap on a neck: an answer while the question is open, a note to hear once it is out
      var midi = +b.getAttribute('data-midi');
      if (b.closest('#ear-fb')) { boardTap(midi, b.getAttribute('data-fb')); } else { soundNote(midi); }
      return;
    }
    if ((v = b.getAttribute('data-answer'))) { answer(v, 'tap'); return; }
    if ((v = b.getAttribute('data-seq'))) { if (v === 'undo') { seqUndo(); } else { S.seq = []; renderAnswer(); renderDisplay(); } return; }
    if ((v = b.getAttribute('data-compare'))) { playCompare(v); return; }
    if (b.closest('#ear-jam')) { jamClick(b); return; }
    if ((v = b.getAttribute('data-act')) === 'next') { next(); $('go').focus({ preventScroll: true }); return; }
    if ((v = b.getAttribute('data-strand'))) {
      if (v === S.strand) { return; }
      chooseStrand(v);
      var tab = app.querySelector('[data-strand="' + v + '"]'); if (tab) { tab.focus(); }
      return;
    }
    if ((v = b.getAttribute('data-drill'))) {
      if (v === S.drill) { return; }
      var was = HE.audio.playing;
      S.drill = v; S.q = null; newQuestion();
      save(); renderAll(); say('');
      if (was) { rejoin(); }
      var again = app.querySelector('[data-drill="' + v + '"]'); if (again) { again.focus(); }
      return;
    }
    if ((v = b.getAttribute('data-way'))) {
      S.set.way = v; save();
      if (v !== 'mic') { micOff(); }
      renderAnswer();
      var w = app.querySelector('[data-way="' + v + '"]'); if (w) { w.focus(); }
      return;
    }
    if ((v = b.getAttribute('data-mic'))) {
      if (v === 'on') { micOn(); } else if (v === 'off') { micOff(); renderMic(); } else { S.heard = []; if (listener) { listener.reset(); } renderMicLine(); }
      return;
    }
    // the mix
    var m = S.mix[S.drill], d = drill();
    if ((v = b.getAttribute('data-set'))) {
      var set = d.sets.filter(function (s) { return s.id === v; })[0];
      m.items = set.items.slice();
      if (set.chords) { m.chords = set.chords.slice(); }
      mixChanged('[data-set="' + v + '"]'); return;
    }
    if ((v = b.getAttribute('data-item'))) {
      var i = m.items.indexOf(v);
      if (i === -1) { m.items.push(v); } else if (m.items.length > 2) { m.items.splice(i, 1); } else { say('Two things at least have to be in play, or there is nothing to choose between.'); return; }
      mixChanged('[data-item="' + v + '"]'); return;
    }
    if ((v = b.getAttribute('data-dir'))) { m.dir = v; mixChanged('[data-dir="' + v + '"]'); return; }
    if ((v = b.getAttribute('data-how'))) { m.how = v; mixChanged('[data-how="' + v + '"]'); return; }
    if ((v = b.getAttribute('data-notes'))) { m.notes = v; mixChanged('[data-notes="' + v + '"]'); return; }
    if ((v = b.getAttribute('data-start'))) { m.start = v; mixChanged('[data-start="' + v + '"]'); return; }
    if ((v = b.getAttribute('data-bassmode'))) { m.bass = v; mixChanged('[data-bassmode="' + v + '"]'); return; }
    if ((v = b.getAttribute('data-invchord'))) {
      var k = m.chords.indexOf(v);
      if (k === -1) { m.chords.push(v); } else if (m.chords.length > 1) { m.chords.splice(k, 1); } else { return; }
      mixChanged('[data-invchord="' + v + '"]'); return;
    }
    // the set up
    var sel = null, redo = false;
    if ((v = b.getAttribute('data-voice'))) { S.set.voice = v; sel = '[data-voice="' + v + '"]'; redo = true; }
    else if ((v = b.getAttribute('data-strings'))) { setStrings(+v); sel = '[data-strings="' + v + '"]'; }
    else if ((v = b.getAttribute('data-bpm'))) { S.set.bpm = +v; sel = '[data-bpm="' + v + '"]'; redo = true; }
    else if ((v = b.getAttribute('data-drums')) !== null) { S.set.drums = v === '1'; sel = '[data-drums="' + v + '"]'; redo = true; }
    else if ((v = b.getAttribute('data-keys'))) { S.set.keys = v; if (S.run) { S.run.sound = keysFor(S.runs - 1); } sel = '[data-keys="' + v + '"]'; redo = true; }
    else if ((v = b.getAttribute('data-centre')) !== null) {
      var at = S.set.centres.indexOf(+v);
      if (at === -1) { S.set.centres.push(+v); } else if (S.set.centres.length > 1) { S.set.centres.splice(at, 1); } else { return; }
      sel = '[data-centre="' + v + '"]';
    } else if ((v = b.getAttribute('data-centreset')) !== null) { S.set.centres = KEY_SETS[+v][1].slice(); sel = '[data-centreset="' + v + '"]'; }
    else if ((v = b.getAttribute('data-auto')) !== null) { S.set.auto = v === '1'; sel = '[data-auto="' + v + '"]'; }
    else if ((v = b.getAttribute('data-clear'))) {
      if (v === 'ask') { S.confirmClear = true; }
      else if (v === 'yes') {
        S.log = []; S.queue = []; S.confirmClear = false;
        save();
        if (MEMBER) { post({ clear: true }).catch(function () { S.unsaved = true; renderRecord(); }); }
      } else { S.confirmClear = false; }
      renderRecord();
      return;
    } else { return; }
    save();
    renderSetup();
    renderDisplay(); renderAnswer(); renderResult();
    if (sel) { var el = app.querySelector(sel); if (el) { el.focus(); } }
    // the tempo, the bass or the band changed while it was going: carry on with the new sound from the next bar line
    if (redo && HE.audio.playing) {
      if (b.hasAttribute('data-bpm')) { stop(); start(); } else { wantKit(HE.audio.unlock()); join(askRound()); }
    }
  });
  app.addEventListener('change', function (e) {
    var t = e.target;
    if (t.getAttribute && t.getAttribute('data-opt') === 'below') { S.mix.deg.below = t.checked; mixChanged(); return; }
    if (t.id === 'ear-share') {
      var want = t.checked;
      S.share = want; renderRecord();
      if (MEMBER) { post({ share: want }).catch(function () { S.share = !want; renderRecord(); $('share-note').textContent = 'That didn’t save. Check your connection and try again.'; }); }
    }
  });
  app.addEventListener('input', function (e) {
    var name = e.target.getAttribute ? e.target.getAttribute('data-level') : null;
    if (!name) { return; }
    S.levels[name] = e.target.value / 100;
    if (HE.audio.supported) { try { HE.audio.level(name, S.levels[name]); } catch (err) { /* no sound yet */ } }
    syncLevels();
    save();
  });
  app.addEventListener('keydown', function (e) {
    // the notes of a neck are buttons to a keyboard too
    if ((e.key === 'Enter' || e.key === ' ') && e.target.hasAttribute && e.target.hasAttribute('data-fb')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  });
  $('diary-go').addEventListener('click', function () {
    var mins = minutes();
    if (!MEMBER || mins < 1) { return; }
    S.sitting.diaryBusy = true; renderRecord();
    var names = [];
    S.log.slice(-S.sitting.asked).forEach(function (e) { var n = EAR.DRILLS[e.d].name; if (names.indexOf(n) === -1) { names.push(n); } });
    post({ diary: { id: S.sitting.diary, min: mins, note: names.join(', ') + '. ' + S.sitting.asked + (S.sitting.asked === 1 ? ' question, ' : ' questions, ') + S.sitting.right + ' first time.' } }).then(function (res) {
      S.sitting.diaryBusy = false;
      S.sitting.diary = res.diary || S.sitting.diary;
      S.sitting.diaryNote = mins + (mins === 1 ? ' minute is' : ' minutes are') + ' in your practice diary for today.';
      renderRecord();
    }).catch(function () {
      S.sitting.diaryBusy = false;
      S.sitting.diaryNote = 'That didn’t save. Check your connection and try again.';
      renderRecord();
    });
  });
  // the space bar is start and stop, Enter is Next once the answer is out
  document.addEventListener('keydown', function (e) {
    if (e.target !== document.body && e.target !== document.documentElement) { return; }
    if (e.altKey || e.ctrlKey || e.metaKey) { return; }
    if (e.code === 'Space') { e.preventDefault(); $('go').click(); }
    else if (e.key === 'Enter' && S.phase === 'revealed') { e.preventDefault(); next(); }
  });
  window.addEventListener('pagehide', function () { try { HE.audio.stop(); } catch (e) { /* nothing playing */ } micOff(); });
  var resize = 0;
  window.addEventListener('resize', function () {
    window.clearTimeout(resize);
    resize = window.setTimeout(function () { if (way() === 'fb') { renderBoard(); } if (S.phase === 'revealed') { drawAnswer(); } }, 200);
  });

  /* ---------- links ----------
   * An address can open a drill with chosen things in play, so a set from Jack can be a link in session notes:
   *   #drill/deg/1+3+5     the Degrees drill with those three in play
   *   #drill/chord         a drill, with the mix as it was left
   *   #today   #jam        Today's set, the Jam room
   * Items are the ids the record uses. Ones the drill does not know are left out, and fewer than two changes nothing.
   */
  function linkFor() {
    var at = S.strand === 'today' || S.strand === 'jam' ? S.strand : 'drill/' + S.drill + '/' + S.mix[S.drill].items.map(encodeURIComponent).join('+');
    return window.location.href.split('#')[0] + '#' + at;
  }
  function route() {
    var h = (window.location.hash || '').replace(/^#/, ''), parts = h.split('/');
    if (parts[0] === 'today' || parts[0] === 'jam') { if (S.strand !== parts[0]) { chooseStrand(parts[0]); } return true; }
    if (parts[0] !== 'drill' || !EAR.DRILLS[parts[1]]) { return false; }
    var d = parts[1], strand = EAR.DRILLS[d].strand;
    if (S.strand === 'jam') { jamStop(); }
    if (HE.audio.playing || S.busy) { stop(); }
    if (parts[2]) {
      var want = parts[2].split('+').map(function (x) { try { return decodeURIComponent(x); } catch (e) { return ''; } });
      var m = JSON.parse(JSON.stringify(S.mix)); m[d].items = want; S.mix = EAR.cleanMix(m);
    }
    S.strand = strand; S.drill = d; S.today = null; S.q = null; S.run = null;
    newQuestion(); save(); renderAll(); say('');
    return true;
  }
  window.addEventListener('hashchange', route);
  if ($('link')) {
    $('link').addEventListener('click', function () {
      var url = linkFor(), b = this;
      function done() { b.textContent = 'Copied'; window.setTimeout(function () { b.textContent = 'Copy a link to this'; }, 1800); }
      try { navigator.clipboard.writeText(url).then(done, function () { window.prompt('Copy this link', url); }); } catch (e) { window.prompt('Copy this link', url); }
    });
  }

  /* ---------- starting up ---------- */

  if (!route()) { newQuestion(); }
  renderSetup();
  syncLevels();
  renderAll();
  flush();
  // The first question's sound is drawn before anyone has asked for it, so that Start starts at once. It
  // means fetching the bass (160 KB), so it waits until Start is actually on the screen (someone reading the
  // page above the trainer fetches nothing) and the page is otherwise idle. Not for someone who has asked the
  // browser to save data.
  if (HE.synth.supported && HE.audio.supported && !HE.sounds.lean()) {
    var early = function () {
      if (HE.audio.started || document.hidden) { return; }
      try { HE.audio.ready(introRound(), source); HE.audio.ready(askRound(), source); } catch (e) { /* it will be drawn when it is played */ }
    };
    var soon = function () {
      window.setTimeout(function () { if (window.requestIdleCallback) { window.requestIdleCallback(early, { timeout: 2500 }); } else { early(); } }, 500);
    };
    if (window.IntersectionObserver) {
      var inView = new window.IntersectionObserver(function (entries) {
        if (entries.some(function (en) { return en.isIntersecting; })) { inView.disconnect(); soon(); }
      });
      inView.observe($('go'));
    } else { soon(); }
  }
}());
