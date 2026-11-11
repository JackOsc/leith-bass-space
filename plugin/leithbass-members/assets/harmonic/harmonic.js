/*
 * Leith Bass Space: Harmonic Elements, on the page.
 *
 * Two rooms share one set of loops:
 *   The Guide   the course itself. Pick an element, read what it is, and play
 *               its loop to jam along with, in any key.
 *   The Dojo    the ear trainer. A loop plays until you've named the key (home,
 *               major or minor) and the element, and the answers build a record.
 *
 * The rules live in the he-*.js files beside this one (the catalogue, the
 * loop library, the trainer logic, the player, the house band and the
 * listener), and the course text is in he-guide.js. This file is the screen:
 * it asks the site which recorded loops there are, draws both rooms, takes
 * the answers and keeps the record. The address remembers where you are
 * (#guide/dorian-lean, #dojo), so the back button and a shared link both work.
 *
 * Every loop can be played by the house band (the app's own instruments and
 * kits, he-synth.js). Recorded loops are further versions of the same loops,
 * offered as well, never instead. In saved mixes and records the house band
 * is still called 'synth', the word it had before it had players.
 *
 * window.LBS_HE (printed by the plugin) says who is looking:
 *   sounds, ver   where the house band's sound files are, and the plugin's version
 *   bass      where lbs-bass.js is (notation, TAB and the fretboard): fetched the first time the Guide's "Play" is opened
 *   list      where the list of recorded loops is fetched from ('' when this visitor only gets the house band)
 *   loop      the address of one loop, with LOOPID standing for its id
 *   member    true for a signed-in member: the record is kept with their account
 *   record    {log, share} for a member
 *   rest, nonce   where a member's record is saved
 *   admin     true for Jack: shows which files a loop came from
 */
(function () {
  'use strict';
  var HE = window.HE, CFG = window.LBS_HE || {};
  var app = document.getElementById('he');
  if (!app || !HE || !HE.trainer) { return; }

  var $ = function (id) { return document.getElementById('he-' + id); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var STORE = 'lbs.he.v1';
  var MEMBER = !!CFG.member;
  var FULL = app.classList.contains('he-full');
  var extend = function (a, b) { var o = {}, k; for (k in a) { o[k] = a[k]; } for (k in b) { o[k] = b[k]; } return o; };
  if (CFG.sounds && HE.sounds) { HE.sounds.base = CFG.sounds; HE.sounds.version = CFG.ver || ''; }

  /* ---------- the loops there are ---------- */

  var library, TEMPO_NAMES, HAS_RECORDED, REC_KEYS, REC_TEMPOS, KEY_SETS, JAM_TEMPOS;
  var ALL_KEYS = HE.KEYS.map(function (k) { return k.pc; });

  // In the Dojo the house band plays at the recorded tempos, and fills in around them until there are three to choose from.
  function synthTempos(files) {
    var have = [];
    files.forEach(function (f) {
      var r = HE.library.parse(f.path);
      if (!r.problem && r.bpm && have.indexOf(r.bpm) === -1) { have.push(r.bpm); }
    });
    [70, 95, 120].forEach(function (t) {
      if (have.length < 3 && have.every(function (h) { return Math.abs(h - t) >= 12; })) { have.push(t); }
    });
    return have.sort(function (a, b) { return a - b; });
  }

  function setLibrary(list) {
    var files = (list || []).map(function (f) { return { path: f[0], id: f[1] }; });
    library = HE.library.build({ files: files, synth: { tempos: synthTempos(files), feels: HE.synth.FEELS } });
    var tempos = library.tempos();
    TEMPO_NAMES = {};
    if (tempos.length === 3) { ['Slow', 'Medium', 'Fast'].forEach(function (n, i) { TEMPO_NAMES[tempos[i]] = n; }); }
    HAS_RECORDED = library.recorded.chords + library.recorded.drums > 0;
    REC_KEYS = library.keys('recorded');
    REC_TEMPOS = library.tempos('recorded');
    KEY_SETS = [['C only', [0]], ['C and F', [0, 5]], ['First four', [0, 5, 10, 3]], ['All twelve', ALL_KEYS]];
    if (REC_KEYS.length && REC_KEYS.length < 12) { KEY_SETS.unshift(['Recorded ones', REC_KEYS]); }
    // In the Guide it plays along at any tempo: a ladder of them, and whatever has been recorded.
    JAM_TEMPOS = [];
    for (var t = 50; t <= 160; t += 5) { JAM_TEMPOS.push(t); }
    tempos.concat(REC_TEMPOS).forEach(function (x) { if (JAM_TEMPOS.indexOf(x) === -1) { JAM_TEMPOS.push(x); } });
    JAM_TEMPOS.sort(function (a, b) { return a - b; });
  }

  var source = HE.audio.either(
    HE.audio.fileSource(function (kind, round) {
      var v = kind === 'chords' ? round.chord : round.drum;
      return v && v.id && CFG.loop ? CFG.loop.replace('LOOPID', v.id) : '';
    }),
    HE.synth);

  /* ---------- what is kept ---------- */

  function load() {
    try { return JSON.parse(window.localStorage.getItem(STORE)) || {}; } catch (e) { return {}; }
  }
  // On this device: the mix and the mixer. A visitor's record is kept here too; a
  // member's is kept with their account, and only what hasn't reached it yet waits here.
  function save() {
    var keep = { mix: S.mix, levels: S.levels, countIn: S.countIn, view: S.view, mode: S.mode, rate: HE.audio.rate || saved.rate || 0,
      jam: { keyPc: G.keyPc, bpm: G.bpm, feel: G.feel, sound: G.sound, voicing: G.voicing, playing: G.playing, kit: G.kit, open: G.bandOpen, play: G.playOpen, line: G.line, bass: G.bass, voice: G.voice } };
    if (MEMBER) { keep.queue = S.queue; } else { keep.log = S.log.slice(-600); }
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

  var saved = load();
  // the sample rate this device played at last time: the first loop is drawn at it before the first tap
  if (saved.rate >= 8000 && saved.rate <= 192000) { HE.audio.expect = +saved.rate; }
  var known = function (e) { return e && HE.byId(e.el); };
  var S = {
    mix: null, hadMix: !!saved.mix,
    log: [], queue: [], share: false,
    levels: { chords: saved.levels && saved.levels.chords >= 0 ? +saved.levels.chords : 0.8, drums: saved.levels && saved.levels.drums >= 0 ? +saved.levels.drums : 0.7, bass: saved.levels && saved.levels.bass >= 0 ? +saved.levels.bass : 0.8 },
    mode: saved.mode === 'pair' || saved.mode === 'change' || saved.mode === 'home' || saved.mode === 'today' ? saved.mode : 'name',   // what the Dojo asks: name it, find home, which is which, before and after
    countIn: saved.countIn !== false,
    round: null, last: null, n: 0,
    next: null,                   // the round after this one, chosen early so it can be got ready
    stamp: 0,                     // goes up whenever the mix or the loops change: a round chosen before is then stale
    phase: 'guess',               // 'guess' until the answer is out, then 'revealed'
    ans: { homePc: null, mode: null, elId: null },
    showed: { key: false, el: false },   // which half of the answer has been shown
    fb: null,                     // the last "not yet" mark, shown until a pick changes
    first: null, firstAnswer: null, tries: 0, shown: false, outcome: null,
    news: '',                     // something worth saying about the answer just given (a run, an element recognised)
    busy: false, open: {}, confirmClear: false, sending: false, unsaved: false, ready: false,
    view: '',                     // 'guide' or 'dojo'
    owner: 'dojo',                // which room started the loop that is sounding
    sitting: { loops: 0, right: 0 }
  };
  if (MEMBER) {
    var rec = CFG.record || {};
    S.log = (Array.isArray(rec.log) ? rec.log : []).filter(known);
    S.share = !!rec.share;
    // lines from last time that never reached the account
    var have = {};
    S.log.forEach(function (e) { have[e.t] = true; });
    S.queue = (Array.isArray(saved.queue) ? saved.queue : []).filter(function (e) { return known(e) && !have[e.t]; });
    S.log = S.log.concat(S.queue).sort(function (a, b) { return a.t - b.t; });
  } else {
    S.log = (Array.isArray(saved.log) ? saved.log : []).filter(known);
  }

  /* ---------- rounds ---------- */

  // The house band's half of a round: which sound, which kit, which groove. Not what the last loop had, if there's a choice.
  function dress(r, last) {
    var chords = r.chord && r.chord.source === 'synth', drums = r.drum && r.drum.source === 'synth';
    if (!chords && !drums) { return; }
    if (r.mode) {
      // a drill's two loops are played by the same sound on the same kit: the harmony is the only thing that changes
      var same = HE.synth.pick({
        feel: r.feel, sounds: S.mix.players, kits: S.mix.kits,
        last: last ? { sound: last.chord && last.chord.sound, kit: last.drum && last.drum.kit } : null,
        light: !HE.audio.started
      });
      r.parts.forEach(function (p) {
        p.chord = extend(p.chord, { sound: same.sound, playing: S.mix.playing, take: same.take });
        p.drum = extend(p.drum, { kit: same.kit, groove: same.groove });
      });
      r.chord = r.parts[0].chord; r.drum = r.parts[0].drum;
      return;
    }
    var d = HE.synth.pick({
      feel: r.feel, sounds: S.mix.players, kits: S.mix.kits,
      last: last ? { sound: last.chord && last.chord.sound, kit: last.drum && last.drum.kit } : null,
      light: !HE.audio.started   // nothing has been played yet: this one is got ready unasked, so it travels light
    });
    // (copies: the library's own entries are shared by every round)
    if (chords) { r.chord = extend(r.chord, { sound: d.sound, playing: S.mix.playing, take: d.take }); }
    if (drums) { r.drum = extend(r.drum, { kit: d.kit, groove: d.groove }); }
  }

  // Choose a round to follow "last". Null if the mix allows nothing at all.
  function pickRound(last) {
    var note = '', r, drilling = S.mode === 'pair' || S.mode === 'change';
    if (drilling) {
      r = HE.trainer.drill(S.mode, S.mix, library, last);
      if (r && r.widened) {
        note = S.mode === 'pair' ? 'No two neighbours are both in this mix, so this pair is drawn from all of them. Add elements under The mix to choose.'
          : 'No transformation is in this mix, so this one is drawn from all of them.';
      }
    } else { r = HE.trainer.pick(S.mode === 'today' ? todayMix() : S.mix, library, S.log, last); }
    if (!r && !drilling && S.mix.sound !== 'both') {
      // nothing of that kind for this mix: play what there is, and say so
      r = HE.trainer.pick(extend(S.mode === 'today' ? todayMix() : S.mix, { sound: 'both' }), library, S.log, last);
      note = S.mix.sound === 'recorded' ? 'Nothing is recorded for this mix yet, so the house band is playing this one. Notes for home with recordings are marked with a dot.' : '';
    }
    if (!r) { return null; }
    dress(r, last);
    if (!r.mode) {
      // Name it: the band establishes home and the element is the question. Find home: nothing is given, and the key is the question.
      r.ask = S.mode === 'home' ? 'home' : 'element';
      r.homeGiven = r.ask === 'element';
      if (r.ask === 'home') { r.elementGiven = false; }
      // how home is established: the mix's way, or the cue where the band's bass can't follow a recording's own timing
      var way = r.ask === 'element' ? (S.mix.home || 'cued') : 'plain';
      if ((way === 'pedal' || way === 'bass') && !(r.chord && r.chord.source === 'synth')) { way = 'cued'; }
      r.homeWay = way;
      r.homeBass = way === 'pedal' || way === 'bass' ? way : '';
    }
    r.played = false;
    r.map = null;
    r.turn = 0;      // a drill: which of its two loops is sounding
    r.booked = -1;   // and which of them the other has been booked to follow
    r.note = note;
    r.stamp = S.stamp;
    r.after = last || null;
    return r;
  }

  function newRound() {
    if (S.round && S.round.played) { S.last = S.round; }
    // the one chosen early, if nothing has changed since
    var r = S.next && S.next.stamp === S.stamp && S.next.after === S.last ? S.next : pickRound(S.last);
    S.next = null;
    if (!r) { return; }
    // (someone who has never answered a loop is told what to do with one)
    say(r.note || (S.log.length || S.n ? '' : r.mode === 'pair' ? 'New here? Press play. Two loops take turns: say which of them comes first.'
      : r.mode === 'change' ? 'New here? Press play. The first loop is named for you: say what the second one is.'
      : r.ask === 'home' ? 'New here? Press play, find the one note that feels like rest on your bass, then say whether its chord is major or minor.'
      : 'New here? Press play. The band gives you home first. Then name what the chords do around it.'));
    S.round = r;
    S.phase = 'guess'; S.fb = null; S.first = null; S.firstAnswer = null; S.tries = 0; S.shown = false; S.outcome = null; S.news = '';
    S.showed = { key: false, el: false };
    // (Name it: the key is given whole. Find home: the element isn't asked, so it is filled in out of sight.)
    S.ans = { homePc: r.homeGiven ? r.keyPc : null, mode: r.ask === 'element' ? r.el.mode : null, elId: r.ask === 'home' || r.elementGiven ? r.el.id : null };
    buildAnswer();
    renderRound();
    prepare(r, true);
  }

  // Get a round ready before it is asked for, so that it starts at once: its loops fetched and drawn
  // while nothing else is going on. Before the first tap that is only done for the loop the Dojo opens
  // with ("early"), only while the Dojo is the room showing, and never for someone who is saving data.
  var preparing = 0;
  function prepare(r, early) {
    window.clearTimeout(preparing);
    preparing = window.setTimeout(function () {
      if (!r || !HE.synth.supported || !HE.audio.supported) { return; }
      if (!HE.audio.started && (!early || S.view !== 'dojo' || document.hidden || HE.sounds.lean())) { return; }
      var run = function () { try { (r.mode ? r.parts : cued(r) ? [cueRound(r), r] : [r]).forEach(function (x) { HE.audio.ready(x, source); }); } catch (e) { /* it will be fetched when it is played */ } };
      if (!HE.audio.started && window.requestIdleCallback) { window.requestIdleCallback(run, { timeout: 2000 }); } else { run(); }
    }, 400);
  }

  // Once there has been a tap the browser says what sample rate it plays at. It is kept, so that
  // next time the first loop can be drawn at the right rate before anything is tapped.
  function noteRate() {
    if (HE.audio.rate && saved.rate !== HE.audio.rate) { saved.rate = HE.audio.rate; save(); }
  }

  // The home cue: two bars of the home chord (major or minor, as the course hears the loop), held, by the
  // house band on the round's own sound, over the round's drums. Named loops only: a drill gives home away.
  function cued(r) { return !!r && !r.mode && r.homeWay === 'cued'; }
  function cueRound(r) {
    if (r.homeCue) { return r.homeCue; }
    var el = { id: 'home-cue-' + r.el.mode, stage: 0, roman: r.el.mode === 'minor' ? 'i' : 'I', name: 'Home', rel: '', kind: 'home', long: 'repeat',
      tri: [{ deg: '1', qual: r.el.mode === 'minor' ? 'm' : 'M', bars: 2 }], sev: null, tip: '', romans: [r.el.mode === 'minor' ? 'i' : 'I'], mode: r.el.mode };
    var sound = r.chord && r.chord.source === 'synth' && r.chord.sound ? r.chord.sound : HE.synth.soundFor(r.feel);
    // (over a recorded drum loop the cue has the house band's drums: the kit that suits the feel)
    var drum = r.drum && r.drum.source === 'synth' ? r.drum : extend(HE.library.houseDrums(r.feel, r.bpm), { kit: '', groove: 0 });
    r.homeCue = {
      el: el, keyPc: r.keyPc, bpm: r.bpm, feel: r.feel, voicing: 'triads', cue: true,
      chord: { kind: 'chords', source: 'synth', el: el.id, keyPc: r.keyPc, bpm: r.bpm, voicing: 'triads', bars: 2, label: 'house band', path: '', sound: sound, playing: 'held', take: 0 },
      drum: drum, bars: 2
    };
    return r.homeCue;
  }

  // The band's bass under a loop, as a way of establishing home: 'pedal' is a low home note held through
  // every bar; 'bass' is the root of each chord, twice a bar. (A score for the house band: see source.more.)
  var SEMI = { '1': 0, '#1': 1, 'b2': 1, '2': 2, 'b3': 3, '3': 4, '4': 5, '#4': 6, 'b5': 6, '5': 7, '#5': 8, 'b6': 8, '6': 9, 'b7': 10, '7': 11 };
  function lowNote(pc) { return 28 + ((pc - 4 + 12) % 12); }   // from the open E string up to the D sharp above it
  function homeBassSpec(r) {
    var strikes = [], beat = 0, b;
    if (r.homeBass === 'pedal') {
      for (b = 0; b < r.bars; b++) { strikes.push({ beat: b * 4, len: 3.9, notes: [lowNote(r.keyPc)], vel: 0.8 }); }
    } else {
      HE.chords(r.el, r.voicing).forEach(function (c) {
        var len = c.bars * 4, pc = (r.keyPc + SEMI[c.deg]) % 12;
        for (var k = 0; k < len; k += 2) { strikes.push({ beat: beat + k, len: Math.min(2, len - k) - 0.12, notes: [lowNote(pc)], vel: k === 0 ? 0.9 : 0.75 }); }
        beat += len;
      });
    }
    return { bpm: r.bpm, bars: r.bars, parts: [{ inst: 'ebass', strikes: strikes }] };
  }
  // Home hit: one bar of the home chord, held, laid over the loop from its next bar line. Like asking for your note.
  function homeHit() {
    var r = S.round;
    if (!r || r.ask !== 'element' || S.owner !== 'dojo' || !HE.audio.playing || !HE.audio.rate) { return; }
    var cue = cueRound(r);
    var one = extend(cue, { el: extend(cue.el, { id: cue.el.id + '-hit', tri: [{ deg: '1', qual: cue.el.tri[0].qual, bars: 1 }] }), bars: 1, drum: null });
    one.chord = extend(cue.chord, { el: one.el.id, bars: 1 });
    HE.synth.chords(one, { sampleRate: HE.audio.rate }).then(function (part) {
      var when = 0, now = HE.audio.now(), x = r.sounding;
      if (x && x.startsAt && x.barDur) { when = x.startsAt + Math.ceil((now + 0.08 - x.startsAt) / x.barDur) * x.barDur; }
      HE.audio.level('hit', S.levels.chords);
      HE.audio.shot(part, 'hit', when || undefined);
    }).catch(function () { /* no hit: the loop carries on */ });
  }
  // A loop as heard from one of its homes, with the band's bass on the roots, for "Hear it from": the same
  // chords, phrased from that home's first chord. Each hearing lists its chords from its own home already.
  function hearingRound(r, h) {
    var chords = h.chords.map(function (c) { return { deg: c.deg, qual: c.qual, bars: c.bars }; });
    var el = { id: 'heard-' + chords.map(function (c) { return c.deg + c.qual + c.bars; }).join('_'), stage: 0, roman: h.label, name: '', rel: '', kind: 'molecule',
      tri: chords, sev: null, tip: '', romans: h.romans.slice(), mode: h.mode, long: 'repeat', aliases: [] };
    var pc = (r.keyPc + h.offset) % 12, bars = HE.bars(el, 'triads');
    var sound = r.chord && r.chord.source === 'synth' && r.chord.sound ? r.chord.sound : HE.synth.soundFor(r.feel);
    return {
      el: el, keyPc: pc, bpm: r.bpm, feel: r.feel, voicing: 'triads', bars: bars, homeBass: 'bass', heard: true,
      chord: { kind: 'chords', source: 'synth', el: el.id, keyPc: pc, bpm: r.bpm, voicing: 'triads', bars: bars, label: 'house band', path: '', sound: sound, playing: S.mix.playing, take: 0 },
      drum: r.drum && r.drum.source === 'synth' ? r.drum : extend(HE.library.houseDrums(r.feel, r.bpm), { kit: '', groove: 0 })
    };
  }
  function hearFrom(i) {
    var r = S.round; if (!r || r.mode || S.phase !== 'revealed') { return; }
    var h = HE.keyHearings(r.el, r.voicing)[i]; if (!h) { return; }
    try { HE.audio.unlock(); } catch (e) { return; }
    HE.audio.level('chords', S.levels.chords); HE.audio.level('drums', S.levels.drums); HE.audio.level('bass', S.levels.bass || 0.8);
    S.owner = 'dojo'; S.busy = true; renderTransport();
    var hr = hearingRound(r, h);
    HE.audio.play(hr, source, HE.audio.playing ? { at: 'loop' } : { countIn: S.countIn }).then(function () { S.busy = false; renderTransport(); wake(true); tick(); })
      .catch(function () { S.busy = false; renderTransport(); });
  }

  // The same, from a page of the Guide: the element on the page, in the key, tempo and feel its player is set to.
  function guideHear(i) {
    if (!G.el) { return; }
    var h = HE.keyHearings(G.el, 'triads')[i]; if (!h) { return; }
    try { HE.audio.unlock(); } catch (e) { return; }
    HE.audio.level('chords', S.levels.chords); HE.audio.level('drums', S.levels.drums); HE.audio.level('bass', S.levels.bass || 0.8);
    S.owner = 'guide'; S.busy = true; renderTransport(); jamTransport();
    var hr = hearingRound({ keyPc: G.keyPc, bpm: G.bpm, feel: G.feel, chord: null, drum: null }, h);
    HE.audio.play(hr, source, HE.audio.playing ? { at: 'loop' } : { countIn: S.countIn }).then(function () { S.busy = false; jamTransport(); wake(true); tick(); })
      .catch(function () { S.busy = false; jamTransport(); });
  }

  // If a recording can't be fetched, the round carries on with the house band's version of the same loop.
  function toHouse(r, d) {
    r.chord = extend(HE.library.houseChords(r.el.id, r.keyPc, r.bpm, r.voicing), { sound: d.sound, playing: d.playing, take: d.take });
    r.drum = extend(HE.library.houseDrums(r.feel, r.bpm), { kit: d.kit, groove: d.groove });
    r.bars = HE.bars(r.el, r.voicing);
    r.map = null;
  }

  // Who is playing a round, in a line: "Grand piano · Studio kit".
  function whoLine(r) {
    if (!r) { return ''; }
    var w = HE.synth.who(r);
    var chords = r.chord && r.chord.source === 'file' ? 'Recorded chords' : w.chords;
    var drums = !r.drum ? '' : r.drum.source === 'file' ? 'recorded drums' : w.drums;
    return chords + (drums ? ' · ' + drums : '');
  }

  function start(again) {
    if (!S.ready) { return; }
    if (!HE.audio.supported || !HE.synth.supported) { say('Sound isn’t available in this browser.'); return; }
    try { HE.audio.unlock(); } catch (e) { say('Sound isn’t available in this browser.'); return; }
    noteRate();
    HE.audio.level('chords', S.levels.chords);
    HE.audio.level('drums', S.levels.drums);
    HE.audio.level('bass', S.levels.bass || 0.8);
    var r = S.round;
    if (!r.played) { r.played = true; S.n++; }
    S.owner = 'dojo';
    S.busy = true;
    // a drill starts with the first of its two loops; the other is booked to follow it (drillTurn)
    r.turn = 0; r.booked = -1;
    renderTransport(); renderDisplay();
    // With the home cue on, two bars of the home chord come first, and the loop comes in on the bar after them.
    var playing = cued(r)
      ? HE.audio.play(cueRound(r), source, { countIn: S.countIn }).then(function (cue) {
        return cue && r === S.round ? HE.audio.play(r, source, { at: 'loop' }) : null;
      })
      : HE.audio.play(r.mode ? r.parts[0] : r, source, { countIn: S.countIn });
    playing.then(function (res) {
      S.busy = false;
      if (res && r === S.round) {
        r.sounding = res;   // where its bars fall, for the home hit
        // a recording says how long it is, and how its chords fill the bars, only once it has been decoded
        if (!r.mode) { r.bars = res.bars; r.map = heardMap(r, res); }
        renderDisplay(); renderBehind();
        wake(true); tick();
      }
      renderTransport();
    }).catch(function () {
      S.busy = false;
      var recorded = !r.mode && ((r.chord && r.chord.source === 'file') || (r.drum && r.drum.source === 'file'));
      if (recorded && !again && r === S.round) {
        toHouse(r, extend(HE.synth.pick({ feel: r.feel, sounds: S.mix.players, kits: S.mix.kits }), { playing: S.mix.playing }));
        say('The recording wouldn’t load, so the house band is playing this one.');
        renderDisplay();
        start(true);
        return;
      }
      say('That loop wouldn’t load. Try the next one.');
      renderTransport();
    });
  }

  function stop() {
    HE.audio.stop();
    S.busy = false;
    wake(false);
    playhead(null);
    renderTransport();
    jamTransport();
  }

  // Everything there is to answer has been answered: the key (home and major or minor) and the element. A drill asks only the element.
  function answered() { return !!S.ans.elId && (!!S.round.mode || (S.ans.homePc !== null && !!S.ans.mode)); }
  // (Name it and Find home each ask one thing, so each has one thing to show: the answer)
  // Which half was shown before the answer: 'key', 'element' or null.
  function showedHalf() { return S.showed.key ? 'key' : S.showed.el ? 'element' : null; }

  function check() {
    if (S.phase !== 'guess' || !answered()) { return; }
    var m = HE.trainer.mark(S.round, S.ans);
    S.tries++;
    if (!S.first) { S.first = m; S.firstAnswer = { homePc: S.ans.homePc, mode: S.ans.mode, elId: S.ans.elId }; }
    // (with only two to choose between, a second go would give the answer away: a pair is answered once)
    if (m.verdict === 'not-yet' && S.round.mode !== 'pair') { S.fb = m; renderResult(true); return; }
    conclude(m, false);
  }

  // Show one half of the answer, and leave the other to be found. Both shown is the whole answer.
  function showHalf(which) {
    if (!S.ready || S.phase !== 'guess') { return; }
    var r = S.round;
    if (r.mode || r.ask) { conclude(null, true); return; }
    if (which === 'key') {
      S.showed.key = true;
      S.ans.homePc = r.keyPc; S.ans.mode = r.el.mode;
      buildEls();
    } else {
      S.showed.el = true;
      S.ans.elId = r.el.id;
      // the element is shown as the course hears it: its own key's major or minor, if the pick so far has no place for it
      if (!S.showed.key && S.ans.mode && !padItems(S.ans.mode).some(function (x) { return x.elId === r.el.id; })) { S.ans.mode = r.el.mode; }
      buildEls();
    }
    S.fb = null;
    if (S.showed.key && S.showed.el) { conclude(null, true); return; }
    renderDisplay(); syncAnswer(); renderResult();
  }

  // A drill's two loops take turns, a pass each. Whenever one of them starts sounding, the other is
  // booked to come in where that pass ends, so the music never stops between them.
  function drillTurn(pos) {
    var r = S.round;
    if (!pos || pos.counting) { return; }
    var at = r.parts.indexOf(pos.round);
    if (at === -1) { return; }
    if (r.turn !== at) { r.turn = at; renderDisplay(); }
    [].forEach.call($('d-turns').children, function (li, i) { li.classList.toggle('is-on', i === at); });
    if (r.booked !== at) {
      r.booked = at;
      try { HE.audio.play(r.parts[1 - at], source, { at: 'loop' }).catch(function () { /* this one simply goes round again */ }); } catch (e) { /* no sound */ }
    }
  }

  // How many of the latest answers were right first time, counting back from the newest.
  function run(log) {
    var n = 0;
    for (var i = log.length - 1; i >= 0 && log[i].ok; i--) { n++; }
    return n;
  }

  function conclude(mark, shown) {
    S.phase = 'revealed'; S.fb = null; S.outcome = mark; S.shown = shown;
    var r = S.round, e = HE.trainer.entry(r, S.first, S.firstAnswer, S.tries, shown, 0, shown ? null : showedHalf());
    var before = r.mode ? null : HE.trainer.stats(S.log).elements[r.el.id];
    S.log.push(e);
    S.sitting.loops++;
    if (e.ok) { S.sitting.right++; }
    if (MEMBER) { S.queue.push(e); }
    // Something to show for it: an element that has just become recognised, or a run of first-time answers.
    var after = r.mode ? null : HE.trainer.stats(S.log).elements[r.el.id], streak = run(S.log);
    S.news = after && after.recognised && !(before && before.recognised)
      ? 'That’s ' + r.el.roman + ' recognised: four first-time answers from the last five, on two different days, with nothing shown.'
      : e.ok && streak >= 3 ? streak + ' in a row, first time.' : '';
    if (S.mode === 'today' && S.today && !r.mode) {
      S.today.asked++; if (e.ok) { S.today.right++; }
      if (S.today.asked >= S.today.n) {
        S.news = 'Today’s set is done: ' + S.today.right + ' of ' + S.today.n + ' first time. Carry on with a fresh set, or come back tomorrow.';
        startToday(); S.stamp++; S.next = null;
      }
      renderModes();
    }
    save();
    flush();
    renderRound();
    renderRecord();
    $('result').scrollIntoView({ block: 'nearest', behavior: 'auto' });
    // The loop after this one is chosen now, so it can be ready by the time it's asked for.
    S.next = pickRound(r);
    prepare(S.next);
  }

  function next() {
    newRound();
    start();
    $('display').scrollIntoView({ block: 'start', behavior: 'auto' });
  }

  /* ---------- the loop display ---------- */

  function say(text) { $('status').textContent = text; }

  // A form (the blues, rhythm changes) is too long for a row of chords: it is drawn as its bars, four to a line.
  function isForm(r) { return !!r && r.el.kind === 'form'; }
  // The chords of a form, bar by bar: [[which chord, ...], ...], two to a bar where each lasts half of it.
  function formBars(r) {
    var out = [], at = 0;
    HE.sequence(r.el, r.keyPc, r.voicing).forEach(function (c, i) {
      for (var h = 0; h < c.bars * 2; h++, at++) {
        var b = Math.floor(at / 2);
        out[b] = out[b] || [];
        if (out[b][out[b].length - 1] !== i) { out[b].push(i); }
      }
    });
    return out;
  }
  // The chords of a loop for the display: a chip for each chord, or for a form a box for each bar.
  // "named" is false while a form is still to be guessed: its bars are numbered, and that is all.
  function changesHtml(r, named) {
    var spelled = HE.spell(r.el, r.keyPc, r.voicing);
    if (isForm(r)) {
      return formBars(r).map(function (bar, n) {
        if (!named) { return '<li class="is-blank"><span>' + (n + 1) + '</span></li>'; }
        return '<li' + (bar.length > 1 ? ' class="is-two"' : '') + '>' + bar.map(function (i) { return '<b>' + esc(spelled.chords[i].name) + '</b>'; }).join('') + '</li>';
      }).join('');
    }
    var map = barMap(r);
    return spelled.chords.map(function (c, i) {
      var n = held(map, i) || c.bars;
      return '<li><b>' + esc(c.name) + '</b><span>' + esc(c.roman) + ' · ' + n + (n === 1 ? ' bar' : ' bars') + '</span></li>';
    }).join('');
  }
  // Which chord of a loop is sounding in a bar (and, in a form, in which half of it). -1 for none.
  function soundingChord(r, bar, beat) {
    if (bar < 0) { return -1; }
    if (isForm(r)) { var b = formBars(r)[bar]; return !b ? -1 : b[b.length > 1 && beat >= 2 ? 1 : 0]; }
    var map = barMap(r);
    return bar >= map.length ? -1 : map[bar];
  }

  // Which of the element's chords is sounding in each bar of this loop.
  function writtenLine(r) {
    var line = [];
    HE.sequence(r.el, r.keyPc, r.voicing).forEach(function (c, i) { for (var b = 0; b < c.bars; b++) { line.push(i); } });
    return line;
  }
  function heardMap(r, res) {
    if (isForm(r)) { return null; }   // a form is played as written, by the house band
    var v = r.chord, recorded = v && v.source === 'file';
    if (recorded && v.heard && v.heard.length === r.bars) { return v.heard; }
    var got = null;
    try { got = HE.listen.changes(recorded ? res.chords : null, res.barDur, r.bars, HE.sequence(r.el, r.keyPc, r.voicing), r.el.long); } catch (e) { got = null; }
    if (got && recorded) { v.heard = got.map; }
    return got ? got.map : null;
  }
  function barMap(r) {
    if (r.map && r.map.length === r.bars) { return r.map; }
    // Not heard yet: the changes as written, coming round again or held for longer as the element usually is.
    var line = writtenLine(r), k = r.bars / line.length, map = [], b;
    var stretched = r.el.long === 'stretch' && k === Math.floor(k) && k >= 2;
    for (b = 0; b < r.bars; b++) { map.push(stretched ? line[Math.floor(b / k)] : line[b % line.length]); }
    return map;
  }
  // How many bars a chord is held for, the first time it comes.
  function held(map, i) {
    var at = map.indexOf(i), n = 0;
    if (at === -1) { return 0; }
    while (at + n < map.length && map[at + n] === i) { n++; }
    return n;
  }

  function kicker() {
    var r = S.round;
    if (S.phase === 'revealed') { return HE.stageLabel(r.el.stage); }
    return 'Loop ' + (r.played ? S.n : S.n + 1) + ' · ' + r.bpm + ' bpm · ' + r.feel;
  }

  var TURN_WORDS = { pair: ['First', 'Second'], change: ['Before', 'After'] };

  function renderDisplay() {
    var r = S.round, revealed = S.phase === 'revealed';
    // in a drill the bars and the chords shown are those of whichever of its two loops is sounding
    var cur = r.mode ? r.parts[r.turn || 0] : r;
    var spelled = HE.spell(r.el, r.keyPc, r.voicing);
    $('d-kicker').textContent = kicker();
    $('band').textContent = whoLine(r);

    var home = $('d-home'), mode = $('d-mode'), roman = $('d-roman'), name = $('d-name');
    var picked = S.ans.elId && r.ask !== 'home' ? padItem(S.ans.elId) : null;
    if (revealed) {
      home.textContent = spelled.tonic; mode.textContent = r.mode ? '' : r.el.mode; roman.textContent = r.el.roman; name.textContent = subName(r.el);
    } else {
      home.textContent = r.mode ? spelled.tonic : S.ans.homePc === null ? '?' : HE.keyByPc(S.ans.homePc).name;
      mode.textContent = r.mode ? '' : S.ans.mode || (S.ans.homePc === null ? '' : 'major or minor?');
      roman.textContent = picked ? picked.label : '?';
      name.textContent = picked ? picked.sub : r.ask === 'home' ? 'The key is the question here.' : 'Pencilled in until you check.';
    }
    // (a drill gives home away: it is the element that is being asked) Whatever has been shown is written solid.
    home.classList.toggle('is-outline', !revealed && !r.mode && !S.showed.key && r.ask !== 'element');
    roman.classList.toggle('is-outline', !revealed && !S.showed.el);

    var turns = $('d-turns');
    turns.hidden = !r.mode;
    turns.innerHTML = !r.mode ? '' : r.parts.map(function (p, i) {
      var known = revealed || (r.mode === 'change' && i === 0);
      return '<li><span>' + TURN_WORDS[r.mode][i] + '</span><b>' + (known ? esc(p.el.roman) : '?') + '</b></li>';
    }).join('');

    var form = isForm(cur), pips = '';
    for (var i = 0; i < cur.bars; i++) { pips += '<i></i>'; }
    $('d-pips').innerHTML = pips;
    $('d-pips').hidden = form;

    // a form shows its bars from the start (numbered, with no chords in them) so that they can be counted
    var changes = $('d-changes');
    changes.hidden = !(revealed || form);
    changes.className = 'he-changes' + (form ? ' is-form' : '');
    changes.innerHTML = revealed || form ? changesHtml(cur, revealed) : '';
    lastBar = -2;
  }

  var lastBar = -2, lastBeat = -1, raf = 0;
  // lastBar: the bar last drawn, -1 for none, -3 while counting in, -2 to force a redraw
  // The loop that is sounding belongs to one room, and the playhead is drawn there: the
  // Dojo lights its chords only once the answer is out, the Guide always. The bar that is
  // sounding fills up a beat at a time, so beat one is always easy to find.
  function playhead(pos) {
    var guide = S.owner === 'guide';
    // (the home cue's two bars are not the loop's: they are shown as the count is, and light nothing)
    var cueing = !!(pos && !pos.counting && pos.round && pos.round.cue);
    var state = !pos ? -1 : pos.counting || cueing ? -3 : pos.bar, beat = pos ? pos.beat : -1;
    if (state === lastBar && beat === lastBeat) { return; }
    var label = $(guide ? 'j-kicker' : 'd-kicker'), row = $(guide ? 'j-pips' : 'd-pips'), list = $(guide ? 'j-changes' : 'd-changes');
    var r = guide ? G.round : S.round;
    if (r && r.mode && !guide) { r = r.parts[r.turn || 0]; }
    if (!label || !row || !list || !r) { lastBar = state; lastBeat = beat; return; }
    if (!pos && !guide && S.round && S.round.mode) { [].forEach.call($('d-turns').children, function (li) { li.classList.remove('is-on'); }); }
    if (state === -3) { label.textContent = cueing ? 'Home · the chord of rest, then the loop' : 'Count in · ' + (beat + 1); } else if (lastBar === -3) { label.textContent = guide ? jamKicker() : kicker(); }
    var form = isForm(r), half = beat >= 2 ? 2 : 1, newHalf = form && half !== (lastBeat >= 2 ? 2 : 1);
    if (beat !== lastBeat) {
      row.style.setProperty('--he-beat', String(beat + 1));
      list.style.setProperty('--he-beat', String(beat + 1));
      list.setAttribute('data-half', String(half));
    }
    lastBeat = beat;
    // the Guide's fretboard lights the chord that is sounding: in a form that can change in the middle of a bar
    if (guide && (state !== lastBar || newHalf)) { jamLit(soundingChord(r, state >= 0 ? state : -1, beat)); }
    if (state === lastBar) { return; }
    lastBar = state;
    var bar = state >= 0 ? state : -1;
    var pips = row.children, chips = list.children, i;
    for (i = 0; i < pips.length; i++) { pips[i].classList.toggle('is-on', i === bar); }
    if (form) {
      // a form's boxes are its bars, and are lit whether or not the chords in them have been given away
      for (i = 0; i < chips.length; i++) { chips[i].classList.toggle('is-on', i === bar); }
    } else if (guide || S.phase === 'revealed') {
      var sounding = soundingChord(r, bar, beat);
      for (i = 0; i < chips.length; i++) { chips[i].classList.toggle('is-on', i === sounding); }
    }
  }
  function tick() {
    window.cancelAnimationFrame(raf);
    (function frame() {
      if (!HE.audio.playing) { playhead(null); return; }
      var pos = HE.audio.position();
      if (S.owner === 'dojo' && S.round && S.round.mode) { drillTurn(pos); }
      playhead(pos);
      raf = window.requestAnimationFrame(frame);
    }());
  }

  function renderTransport() {
    var on = S.owner === 'dojo' && (HE.audio.playing || S.busy);
    $('go').setAttribute('aria-pressed', String(on));
    // Starting a loop stops the one before it at once, so while the next is being fetched there is nothing sounding.
    $('go-label').textContent = on && S.busy ? 'Tuning up' : on ? 'Stop' : S.round.played ? 'Play it again' : 'Play the loop';
    renderDock();
  }

  /* ---------- answering ---------- */

  // The element buttons, for the major or minor chosen so far. Each element is shown as it is heard
  // from a home of that kind: its own numerals if the course hears it so, or else another hearing of it
  // (the Dorian loop, from a major home, is I V ii IV). An element with no hearing from that kind of home
  // isn't offered, and two elements that come out the same (two names for one sound) are offered once.
  // With nothing chosen yet, every element is shown as the course has it.
  function padItems(mode) {
    var r = S.round, out = [], seen = {};
    r.choices.map(HE.byId).forEach(function (el) {
      // (with home given, only hearings from that home: the others would put home somewhere it can't be)
      var heard = HE.keyHearings(el, r.voicing).filter(function (x) { return !r.homeGiven || x.offset === 0; });
      var h = null;
      if (!mode || el.mode === mode) { h = heard[0]; }
      else { h = heard.filter(function (x) { return x.mode === mode; })[0] || null; }
      if (!h) { return; }
      var label = h.label, key = label + '|' + (h.own ? el.mode : h.mode);
      // a hearing that is another element in the mix is that element's own button
      if (!h.own && h.via && r.choices.indexOf(h.via) !== -1) { return; }
      if (seen[key]) { return; }
      seen[key] = true;
      out.push({ elId: el.id, el: el, label: label, own: h.own, sub: h.own ? subName(el) : el.name + ', from a ' + h.mode + ' home' });
    });
    return out;
  }
  // The button an element has on the pad now (or, if it has none, the element as the course has it).
  function padItem(elId) {
    var hit = padItems(S.ans.mode).filter(function (x) { return x.elId === elId; })[0];
    if (hit) { return hit; }
    var el = HE.byId(elId);
    return { elId: elId, el: el, label: el.roman, own: true, sub: subName(el) };
  }

  function buildAnswer() {
    $('homes').innerHTML = HE.KEYS.map(function (k) {
      return '<button type="button" class="he-pick" data-pc="' + k.pc + '" aria-pressed="false" aria-label="' + k.name.replace('♭', ' flat').replace('♯', ' sharp') + '">' + k.name + '</button>';
    }).join('');
    $('kmodes').innerHTML = [['major', 'Major'], ['minor', 'Minor']].map(function (m) {
      return '<button type="button" class="he-pick" data-kmode="' + m[0] + '" aria-pressed="false">' + m[1] + '</button>';
    }).join('');
    buildEls();
  }

  function buildEls() {
    var html = '', note = '';
    function button(item) {
      return '<button type="button" class="he-pick" data-el="' + item.elId + '" aria-pressed="false"><b>' + esc(item.label) + '</b><span>' + esc(item.sub) + '</span></button>';
    }
    if (S.round.mode === 'pair') {
      // just the two of them, in the catalogue's order (so the order says nothing about which is first)
      html = S.round.choices.map(function (id) { var el = HE.byId(id); return button({ elId: id, label: el.roman, sub: subName(el) }); }).join('');
    } else if (S.round.mode) {
      // what a transformation became: home is given, so each is shown as the course has it, stage by stage
      HE.STAGES.forEach(function (st) {
        var mine = S.round.choices.map(HE.byId).filter(function (el) { return el.stage === st.n; });
        if (!mine.length) { return; }
        html += '<p class="he-kicker he-grp">' + esc(st.name) + '</p>' + mine.map(function (el) { return button({ elId: el.id, label: el.roman, sub: subName(el) }); }).join('');
      });
    } else {
      var items = padItems(S.ans.mode);
      HE.STAGES.forEach(function (st) {
        var mine = items.filter(function (x) { return x.el.stage === st.n; });
        if (!mine.length) { return; }
        html += '<p class="he-kicker he-grp">' + esc(st.name) + '</p>' + mine.map(button).join('');
      });
      var all = S.round.choices.length;
      if (S.ans.mode && items.length < all) {
        note = 'From a ' + S.ans.mode + ' home: ' + items.length + ' of the ' + all + ' elements in the mix can be heard that way, and they are shown as they sound from there.';
      }
    }
    $('els').innerHTML = html;
    $('els-note').textContent = note;
    $('els-note').hidden = !note;
  }

  // What is asked, and the line under it, for each thing the Dojo does.
  var ASKS = {
    name: ['What’s the element?', 'The band has given you home. Name what the chords do around it, as roman numerals from home.'],
    pair: ['Which comes first?', 'Two neighbours take turns, a pass each. Name the one that starts.'],
    change: ['What did it become?', 'The first loop is given. Name what it turns into.']
  };

  function syncAnswer() {
    var r = S.round, revealed = S.phase === 'revealed';
    // Every key the loop can be heard in, and every element that is this sound, are marked as answers:
    // the course's own first, and whichever hearing the player gave.
    var keys = [], els = [r.el.id];
    if (!r.mode) {
      HE.keyHearings(r.el, r.voicing).forEach(function (h) { keys.push({ pc: (r.keyPc + h.offset) % 12, mode: h.mode, own: h.own }); });
      els = HE.sameSound(r.el, r.voicing);
    }
    var heard = S.outcome && S.outcome.heardAs;
    // what to light once the answer is out: the course's key, and the key the player heard it in if that counted
    var lit = keys.filter(function (k) { return k.own || (heard && k.pc === heard.tonicPc && k.mode === heard.hearing.mode); });
    var lockKey = revealed || S.showed.key;
    [].forEach.call($('homes').children, function (b) {
      var pc = +b.getAttribute('data-pc'), mine = S.ans.homePc === pc;
      var ok = lit.some(function (k) { return k.pc === pc; });
      b.setAttribute('aria-pressed', String(mine && !revealed));
      b.classList.toggle('is-answer', revealed && ok);
      b.classList.toggle('is-miss', revealed && mine && !ok);
      b.disabled = lockKey || r.homeGiven;
    });
    [].forEach.call($('kmodes').children, function (b) {
      var m = b.getAttribute('data-kmode'), mine = S.ans.mode === m;
      var ok = lit.some(function (k) { return k.mode === m && (S.ans.homePc === null || k.pc === S.ans.homePc || k.own); });
      b.setAttribute('aria-pressed', String(mine && !revealed));
      b.classList.toggle('is-answer', revealed && ok);
      b.classList.toggle('is-miss', revealed && mine && !ok);
      b.disabled = lockKey;
    });
    [].forEach.call($('els').querySelectorAll('button'), function (b) {
      var id = b.getAttribute('data-el'), mine = S.ans.elId === id, ok = els.indexOf(id) !== -1;
      b.setAttribute('aria-pressed', String(mine && !revealed));
      b.classList.toggle('is-answer', revealed && ok);
      b.classList.toggle('is-miss', revealed && mine && !ok);
      b.disabled = revealed || r.elementGiven || S.showed.el;
    });
    // With one note for home in the mix there is no note to choose, so the twelve buttons step aside: major or minor is still asked.
    $('homes').hidden = r.homeGiven;
    // (a drill says where home is, so that question steps aside altogether)
    $('ask-home').hidden = !!r.mode || r.ask === 'element';
    $('ask-el').hidden = r.ask === 'home';
    $('hit').hidden = r.ask !== 'element';

    var homesHere = r.mode ? 1 : HE.keyHearings(r.el, r.voicing).length;
    $('q-home-note').textContent = r.ask === 'home' && homesHere > 1
      ? 'This loop has ' + (homesHere === 2 ? 'two' : homesHere) + ' homes. Find one: any of them counts.'
      : 'The note that feels like rest, then major or minor.';
    $('q-el').textContent = ASKS[r.mode || 'name'][0];
    $('q-el-note').textContent = r.elementGiven ? 'One element in the mix, so it is given.' : ASKS[r.mode || 'name'][1];
    $('check').disabled = revealed || !answered();
    // two halves to show, one at a time: in a drill there is only the one
    $('show-key').hidden = !!r.mode || r.ask === 'element';
    $('show-key').textContent = r.ask === 'home' ? 'Show me' : 'The key';
    $('show-key').disabled = revealed || S.showed.key;
    // (a drill has one thing to show: the answer)
    $('show-label').hidden = !!r.mode || !!r.ask;
    $('show-el').hidden = r.ask === 'home';
    $('show-el').textContent = r.mode || r.ask ? 'Show me' : 'The element';
    $('show-el').setAttribute('aria-label', r.mode ? 'Show me the answer' : 'Show me the element');
    $('show-el').disabled = revealed || S.showed.el || (!r.mode && r.elementGiven);
    renderDock();
  }

  // "A minor · i ♭III ♭VII IV": a hearing of a round, with its key.
  function hearingLine(r, h) { return HE.keyName(r.el, h, r.keyPc) + ' · ' + h.label; }
  // Every other way the course allows this loop to be heard, for "Also heard as".
  function otherHearings(el, keyPc, voicing, except) {
    return HE.keyHearings(el, voicing).filter(function (h) { return !h.own && h !== except; }).map(function (h) {
      var via = h.via ? HE.byId(h.via) : null;
      return esc(HE.keyName(el, h, keyPc) + ' · ' + h.label) + (via ? ' (' + esc(via.name.replace(/^The /, 'the ')) + ')' : '');
    });
  }
  // A form has no numerals short enough to show, so its "roman" is a tag much like its name:
  // where both would be shown, a form gives its name once, and how long it is where a name would repeat it.
  function fullName(el) { return el.kind === 'form' ? el.name : el.roman + ' · ' + el.name; }
  function subName(el) { return el.kind === 'form' ? HE.bars(el, 'triads') + ' bars' : el.name; }

  function renderResult(bringIntoView) {
    var box = $('result'), r = S.round, html = '';
    if (S.phase === 'guess') {
      if (!S.fb) { box.hidden = true; box.innerHTML = ''; return; }
      if (r.mode) {
        box.innerHTML = '<div class="he-tags"><span class="he-tag is-no">Not that one</span></div><p>The two are still taking turns, so have another listen and change your pick.</p>';
        box.hidden = false;
        if (bringIntoView) { box.scrollIntoView({ block: 'nearest', behavior: 'auto' }); }
        return;
      }
      if (r.ask === 'element') {
        box.innerHTML = '<div class="he-tags"><span class="he-tag is-no">Element · not yet</span></div><p>Not that one. The loop is still going: ask for a home hit if you have lost home, then listen to where the bass would go.</p>';
        box.hidden = false;
        if (bringIntoView) { box.scrollIntoView({ block: 'nearest', behavior: 'auto' }); }
        return;
      }
      var other = S.ans.mode === 'major' ? 'minor' : 'major';
      if (r.ask === 'home') {
        box.innerHTML = '<div class="he-tags"><span class="he-tag is-no">Key · ' + (S.fb.note ? 'note yes, ' + other : 'not yet') + '</span></div><p>' +
          (S.fb.note ? 'Home’s note is right, but the chord on it is ' + other + '.' : 'Home is somewhere else. Hum the note you would end on, then find it on your bass.') + ' The loop is still going.</p>';
        box.hidden = false;
        if (bringIntoView) { box.scrollIntoView({ block: 'nearest', behavior: 'auto' }); }
        return;
      }
      var keyLine = S.fb.home ? '' : S.fb.note ? 'Home’s note is right, but the chord on it is ' + other + '.' : 'Home is somewhere else.';
      var line = S.fb.home && !S.fb.element ? 'The key is right. The element isn’t that one.'
        : !S.fb.home && S.fb.element ? 'Right element. ' + keyLine
        : S.fb.note ? keyLine + ' And the element isn’t that one.'
        : 'Neither yet. Find the note that feels like rest, hear whether it is major or minor, then count the chords.';
      html = '<div class="he-tags"><span class="he-tag ' + (S.fb.home ? 'is-yes' : 'is-no') + '">Key · ' + (S.fb.home ? 'yes' : S.fb.note ? 'note yes, ' + other : 'not yet') + '</span>' +
        '<span class="he-tag ' + (S.fb.element ? 'is-yes' : 'is-no') + '">Element · ' + (S.fb.element ? 'yes' : 'not yet') + '</span></div>' +
        '<p>' + line + ' The loop is still going, so have another listen and change your pick.</p>';
      box.innerHTML = html; box.hidden = false;
      if (bringIntoView) { box.scrollIntoView({ block: 'nearest', behavior: 'auto' }); }
      return;
    }

    if (r.mode) { box.innerHTML = drillResult(); box.hidden = false; return; }
    var m = S.outcome, spelled = HE.spell(r.el, r.keyPc, r.voicing);
    var own = HE.keyHearings(r.el, r.voicing)[0];
    var half = showedHalf(), head, sub;
    var after = S.tries === 1 ? '' : ' Got there on try ' + S.tries + '.';
    if (S.shown) {
      head = 'Here it is';
      sub = S.tries ? 'Shown after ' + S.tries + (S.tries === 1 ? ' try' : ' tries') + '. Play the roots over it now you know the changes.' : 'Play the roots over it now you know the changes.';
    } else if (half) {
      head = half === 'key' ? 'Right, with the key shown' : 'Right, with the element shown';
      sub = (half === 'key' ? 'You named the element.' : m.verdict === 'hearing' ? 'You found a key it can be heard in: ' + hearingLine(r, m.heardAs.hearing) + '.' : 'You found the key.') +
        after + ' Only an answer with nothing shown counts towards recognised.';
    } else if (m.verdict === 'hearing') {
      head = 'Right, from another home';
      sub = 'You heard ' + hearingLine(r, m.heardAs.hearing) + '. That is this loop, with a different chord as the one that feels like rest. The course has it as ' +
        hearingLine(r, own) + ', and both count.' + after;
    } else {
      head = 'Right';
      sub = S.tries === 1 ? (r.ask === 'home' ? 'Home, first time.' : r.ask === 'element' ? 'First time.' : 'The key and the element, first time.') : 'Got there on try ' + S.tries + '. Only a first-time answer goes on the record as recognised.';
    }
    // Hear it from each home: the same chords with the band's bass on the roots, phrased from that home.
    var homes = HE.keyHearings(r.el, r.voicing), hear = '';
    if (HE.synth.supported && !isForm(r)) {
      hear = '<div><dt>' + (homes.length > 1 ? 'Hear it from each home' : 'Hear it with the bass') + '</dt><dd class="he-hear">' + homes.map(function (h, i) {
        return '<button type="button" class="he-btn is-quiet" data-act="hear" data-h="' + i + '">' + esc(HE.keyName(r.el, h, r.keyPc)) + '</button>';
      }).join('') + (homes.length > 1 ? '<span class="he-small">The chords don’t change. The bass decides.</span>' : '') + '</dd></div>';
    }
    var others = otherHearings(r.el, r.keyPc, r.voicing, null);
    html = '<p class="he-verdict">' + esc(head) + '</p>' +
      '<p class="he-answer-line">' + esc(HE.keyName(r.el, own, r.keyPc)) + ' · ' + esc(fullName(r.el)) + '</p>' +
      '<p>' + esc(sub) + '</p>' +
      (S.news ? '<p class="he-news">' + esc(S.news) + '</p>' : '') +
      '<dl class="he-facts">' +
      '<div><dt>The changes</dt><dd class="he-say">' + (isForm(r)
        ? formBars(r).map(function (bar) { return bar.map(function (i) { return esc(spelled.chords[i].name); }).join(' '); }).join(' | ')
        : spelled.chords.map(function (c) { return esc(c.name); }).join(', ')) + '</dd></div>' +
      '<div><dt>Built from</dt><dd>' + esc(r.el.rel) + '</dd></div>' +
      '<div><dt>' + (r.el.teaches ? 'What it teaches' : 'Listen for') + '</dt><dd>' + esc(HE.tip(r.el, r.keyPc, r.voicing)) + '</dd></div>' +
      (others.length ? '<div><dt>Also heard as</dt><dd>' + others.join('; ') + '. Any of these counts in Find home.</dd></div>' : '') +
      hear +
      '</dl>' +
      '<div class="he-after"><button type="button" class="he-btn is-sound" data-act="next">Next loop</button>' +
      guideButton(r.el) + '</div>';
    box.innerHTML = html; box.hidden = false;
  }
  function guideButton(el) {
    return GUIDE && pageOf(el.id) ? '<button type="button" class="he-btn is-quiet" data-act="guide" data-id="' + esc(pageOf(el.id)) + '">Read about it in the Guide</button>' : '';
  }

  // The answer to a drill: both of its loops named, with what each is made of and what to listen for.
  function drillResult() {
    var r = S.round, m = S.outcome, words = TURN_WORDS[r.mode], head, sub;
    var asked = HE.spell(r.el, r.keyPc, r.voicing);
    if (S.shown) {
      head = 'Here it is';
      sub = 'They carry on taking turns. Listen again now you know which is which.';
    } else if (m.verdict === 'not-yet') {
      head = 'The other way round';
      sub = 'They carry on taking turns. Listen for what the first one has that the second hasn’t.';
    } else {
      head = 'Right';
      sub = S.tries === 1 ? 'First time.' : 'Got there on try ' + S.tries + '.';
    }
    function fact(p, word) {
      var sp = HE.spell(p.el, p.keyPc, p.voicing);
      return '<div><dt>' + word + '</dt><dd><b>' + esc(sp.tonic + ' · ' + p.el.roman) + '</b> ' + esc(p.el.kind === 'form' ? '' : p.el.name) +
        '<br><span class="he-say">' + sp.chords.map(function (c) { return esc(c.name); }).join(', ') + '</span>' +
        (p.el.tip ? '<br>' + esc(HE.tip(p.el, p.keyPc, p.voicing)) : '') + '</dd></div>';
    }
    return '<p class="he-verdict">' + esc(head) + '</p>' +
      '<p class="he-answer-line">' + words[r.mode === 'pair' ? 0 : 1] + ': ' + esc(asked.tonic) + ' · ' + esc(fullName(r.el)) + '</p>' +
      '<p>' + esc(sub) + '</p>' +
      (S.news ? '<p class="he-news">' + esc(S.news) + '</p>' : '') +
      '<dl class="he-facts">' + fact(r.parts[0], words[0]) + fact(r.parts[1], words[1]) + '</dl>' +
      '<div class="he-after"><button type="button" class="he-btn is-sound" data-act="next">Next loop</button>' + guideButton(r.el) + '</div>';
  }

  /* ---------- what the Dojo asks ---------- */

  var MODES = [
    ['today', 'Today', ''],
    ['name', 'Name it', 'The band gives you home, then the loop plays. Name the element.'],
    ['home', 'Find home', 'A loop plays with nothing given. Find the key: home, and whether it is major or minor.'],
    ['pair', 'Which is which', 'Two neighbours take turns. Say which one comes first.'],
    ['change', 'Before and after', 'A loop you know, then the same loop with something done to it. Name what it became.']
  ];
  function renderModes() {
    $('modes').innerHTML = MODES.map(function (m) { return tog('data-mode="' + m[0] + '"', m[1], S.mode === m[0]); }).join('');
    $('mode-note').textContent = S.mode === 'today' ? todayNote() : MODES.filter(function (m) { return m[0] === S.mode; })[0][2];
    // (Today chooses its own elements, so the mix's list of them is put away while it is on)
    app.classList.toggle('is-today', S.mode === 'today');
  }
  $('modes').addEventListener('click', function (e) {
    var b = e.target.closest('[data-mode]'); if (!b || !S.ready) { return; }
    var v = b.getAttribute('data-mode');
    if (v === S.mode) { return; }
    if (S.owner === 'dojo' && (HE.audio.playing || S.busy)) { stop(); }
    S.mode = v;
    if (v === 'today') { startToday(); }
    S.stamp++;
    save();
    renderModes();
    newRound();
    var again = app.querySelector('[data-mode="' + v + '"]'); if (again) { again.focus(); }
  });

  /* Today's set: twelve rounds of Name it on a few elements chosen from the record (HE.trainer.today). The set is
   * fixed when Today is opened and when a set is finished, not after every answer, so it does not shift mid sitting. */
  function startToday() { var t = HE.trainer.today(S.log); S.today = { elements: t.elements, why: t.why, n: t.n, asked: 0, right: 0 }; }
  function todayMix() { if (!S.today) { startToday(); } return extend(S.mix, { elements: S.today.elements }); }
  function todayNote() {
    if (!S.today) { startToday(); }
    var by = { work: [], keep: [], 'new': [] };
    S.today.elements.forEach(function (id) { by[S.today.why[id]].push(HE.byId(id).roman); });
    var bits = [];
    if (by.work.length) { bits.push('working on ' + by.work.join(', ')); }
    if (by.keep.length) { bits.push('keeping ' + by.keep.join(', ')); }
    if (by['new'].length) { bits.push('new: ' + by['new'].join(', ')); }
    return 'Today’s set, ' + Math.min(S.today.asked + 1, S.today.n) + ' of ' + S.today.n + '. The band gives you home; name the element. Chosen from your record: ' + bits.join('; ') + '.';
  }

  function renderRound() { renderDisplay(); syncAnswer(); renderResult(); renderTransport(); renderBehind(); }

  /* ---------- the mix ---------- */

  function tog(attrs, inner, pressed, cls) {
    return '<button type="button" class="he-tog' + (cls ? ' ' + cls : '') + '" ' + attrs + ' aria-pressed="' + pressed + '">' + inner + '</button>';
  }
  function has(list, v) { return list.indexOf(v) !== -1; }
  function flip(list, v) {
    var i = list.indexOf(v);
    if (i === -1) { list.push(v); return true; }
    if (list.length === 1) { return false; } // something always has to be in the mix
    list.splice(i, 1);
    return true;
  }
  function same(a, b) { return a.length === b.length && a.every(function (x) { return has(b, x); }); }

  var SOUNDS = [['both', 'Recordings and the house band'], ['recorded', 'Recordings only'], ['synth', 'House band only']];
  var PLAYING = [['feel', 'In the feel'], ['held', 'Held']];
  var HOME_CUE = [['cued', 'Cue'], ['pedal', 'Pedal'], ['bass', 'Bass'], ['plain', 'Loop only']];
  var HOME_CUE_NOTE = {
    cued: 'Name it: before each loop the band plays two bars of the home chord, held. Then the loop comes in.',
    pedal: 'Name it: a low home note is held under the whole loop, as a bass might. (Recorded loops get the cue instead.)',
    bass: 'Name it: the band’s bass plays the root of each chord. Good for soloing over the changes. (Recorded loops get the cue instead.)',
    plain: 'Name it: the loop alone. Home is named on the screen, and the home hit is there if you want to hear it.'
  };
  var PLAYING_NOTE = {
    feel: 'The chords are played the way the feel would have them: stabs, strums, a skank on the off beats.',
    held: 'Each chord is struck once and left to ring: the plainest way to hear the changes.'
  };
  var ALL_SOUNDS = HE.synth.SOUNDS.map(function (x) { return x.id; });
  var ALL_KITS = HE.synth.KITS.map(function (x) { return x.id; });
  // The house band's chord sounds, a family at a time: [[family, [sound]]].
  var SOUND_GROUPS = [];
  HE.synth.SOUNDS.forEach(function (x) {
    var g = SOUND_GROUPS.filter(function (y) { return y[0] === x.group; })[0];
    if (!g) { g = [x.group, []]; SOUND_GROUPS.push(g); }
    g[1].push(x);
  });
  // "players" and "kits" in a mix are null while every one is switched on, so that sounds added later join in.
  function inBand(key, id) { return !S.mix[key] || has(S.mix[key], id); }
  function flipBand(key, all, id) {
    var list = S.mix[key] ? S.mix[key].slice() : all.slice();
    if (!flip(list, id)) { return false; }
    S.mix[key] = list.length === all.length ? null : all.filter(function (x) { return has(list, x); });
    return true;
  }
  function count(list, all, one, many) {
    return !list ? 'all ' + all.length + ' ' + many : list.length + ' of ' + all.length + ' ' + (all.length === 1 ? one : many);
  }

  function renderMix() {
    var mix = S.mix;
    $('presets').innerHTML = HE.trainer.PRESETS.map(function (p) { return tog('data-preset="' + p.id + '"', esc(p.name), same(p.elements, mix.elements)); }).join('');

    var headed = false;
    // (a stage that is out of the app for now, the compounds, has nothing in it here and isn't listed)
    $('stages').innerHTML = HE.STAGES.filter(function (st) { return HE.ELEMENTS.some(function (el) { return el.stage === st.n; }); }).map(function (st) {
      var mine = HE.ELEMENTS.filter(function (el) { return el.stage === st.n; });
      var on = mine.filter(function (el) { return has(mix.elements, el.id); }).length;
      var state = on === 0 ? 'false' : on === mine.length ? 'true' : 'mixed';
      var open = !!S.open[st.n];
      // (the groups after Stage 10 are not stages of the course: more loops of the same kinds)
      var heading = st.more && !headed ? '<p class="he-kicker he-grp">More molecules</p>' : '';
      if (st.more) { headed = true; }
      return heading + '<div class="he-stage">' +
        '<button type="button" class="he-stage-all" data-stage="' + st.n + '" aria-pressed="' + state + '"><b>' + esc(st.name) + '</b><span>' + on + ' of ' + mine.length + '</span></button>' +
        '<button type="button" class="he-stage-open" data-open="' + st.n + '" aria-expanded="' + open + '" aria-label="Choose from ' + esc(st.name) + '"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><polyline points="3,6 8,11 13,6"></polyline></svg></button>' +
        (open ? '<div class="he-stage-els">' + mine.map(function (el) {
          // (home never sounds in these, so Name it leaves them out: they come up in the drills)
          return tog('data-el="' + el.id + '"', '<b>' + esc(el.roman) + '</b><span>' + esc(subName(el)) + (el.optional ? ' (optional)' : '') + (el.homeAbsent ? ' (drills only: home never sounds)' : '') + '</span>', has(mix.elements, el.id));
        }).join('') + '</div>' : '') +
        '</div>';
    }).join('');

    $('homecue').innerHTML = HOME_CUE.map(function (v) { return tog('data-homecue="' + v[0] + '"', v[1], (mix.home || 'cued') === v[0]); }).join('');
    $('homecue-note').textContent = HOME_CUE_NOTE[mix.home || 'cued'];
    var dots = REC_KEYS.length > 0 && REC_KEYS.length < 12;
    $('keys').innerHTML = HE.KEYS.map(function (k) { return tog('data-key="' + k.pc + '"', k.name, has(mix.keys, k.pc), dots && has(REC_KEYS, k.pc) ? 'is-note is-rec' : 'is-note'); }).join('');
    $('keys-note').hidden = !dots;
    $('key-sets').innerHTML = KEY_SETS.map(function (s, i) { return tog('data-keyset="' + i + '"', s[0], same(s[1], mix.keys), 'is-link'); }).join('');
    var tempos = library.tempos(), someTempos = REC_TEMPOS.length > 0 && REC_TEMPOS.length < tempos.length;
    $('tempos').innerHTML = tempos.map(function (t) { return tog('data-tempo="' + t + '"', (TEMPO_NAMES[t] ? TEMPO_NAMES[t] + ' · ' : '') + t + ' bpm', has(mix.tempos, t), someTempos && has(REC_TEMPOS, t) ? 'is-rec' : ''); }).join('');
    var feels = library.feels();
    $('feels').innerHTML = feels.map(function (f) { return tog('data-feel="' + esc(f) + '"', esc(f), has(mix.feels, f)); }).join('') +
      tog('data-feel-all="1"', 'All feels', mix.feels.length === feels.length, 'is-link');
    $('voicing').innerHTML = [['triads', 'Triads'], ['sevenths', 'Sevenths'], ['both', 'Both']].map(function (v) { return tog('data-voicing="' + v[0] + '"', v[1], mix.voicing === v[0]); }).join('');
    $('voicing-note').hidden = !HAS_RECORDED;
    $('sound-set').hidden = !HAS_RECORDED;
    $('sound').innerHTML = SOUNDS.map(function (v) { return tog('data-sound="' + v[0] + '"', v[1], mix.sound === v[0]); }).join('');

    $('playing').innerHTML = PLAYING.map(function (v) { return tog('data-playing="' + v[0] + '"', v[1], mix.playing === v[0]); }).join('');
    $('playing-note').textContent = PLAYING_NOTE[mix.playing];
    $('players').innerHTML = SOUND_GROUPS.map(function (g) {
      return '<div class="he-group"><p class="he-small">' + esc(g[0]) + '</p><div class="he-togs">' + g[1].map(function (x) {
        return tog('data-player="' + x.id + '"', esc(x.name), inBand('players', x.id));
      }).join('') + '</div></div>';
    }).join('') + '<div class="he-togs">' + tog('data-band-all="players"', 'All sounds', !mix.players, 'is-link') + '</div>';
    $('kits').innerHTML = HE.synth.KITS.map(function (x) { return tog('data-kit="' + x.id + '"', esc(x.name), inBand('kits', x.id)); }).join('') +
      tog('data-band-all="kits"', 'All kits', !mix.kits, 'is-link');
    $('band-sum').textContent = count(mix.players, ALL_SOUNDS, 'sound', 'sounds') + ' · ' + count(mix.kits, ALL_KITS, 'kit', 'kits') + (mix.playing === 'held' ? ' · held' : '');

    $('mix-sum').textContent = mix.elements.length + (mix.elements.length === 1 ? ' element' : ' elements') + ' · ' + mix.keys.length + (mix.keys.length === 1 ? ' note for home' : ' notes for home') + ' · home: ' + ({ cued: 'cue', pedal: 'pedal', bass: 'bass', plain: 'loop only' }[mix.home || 'cued']);
  }

  function mixChanged(focusSel) {
    S.hadMix = true;
    S.stamp++;
    save();
    renderMix();
    if (focusSel) { var el = app.querySelector(focusSel); if (el) { el.focus(); } }
    if (!S.round || !S.round.played) { newRound(); } else { renderBehind(); }
  }

  $('mix').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || !S.ready) { return; }
    var mix = S.mix, v, sel = null;
    if ((v = b.getAttribute('data-preset'))) {
      mix.elements = HE.trainer.PRESETS.filter(function (p) { return p.id === v; })[0].elements.slice();
      sel = '[data-preset="' + v + '"]';
    } else if ((v = b.getAttribute('data-stage'))) {
      var mine = HE.ELEMENTS.filter(function (el) { return el.stage === +v; }).map(function (el) { return el.id; });
      var allOn = mine.every(function (id) { return has(mix.elements, id); });
      if (allOn) {
        var rest = mix.elements.filter(function (id) { return !has(mine, id); });
        if (!rest.length) { return; }
        mix.elements = rest;
      } else {
        mine.forEach(function (id) { if (!has(mix.elements, id)) { mix.elements.push(id); } });
      }
      sel = '[data-stage="' + v + '"]';
    } else if ((v = b.getAttribute('data-open'))) {
      S.open[v] = !S.open[v];
      renderMix();
      var again = app.querySelector('[data-open="' + v + '"]'); if (again) { again.focus(); }
      return;
    } else if ((v = b.getAttribute('data-el'))) {
      if (!flip(mix.elements, v)) { return; }
      sel = '#he-stages [data-el="' + v + '"]';
    } else if ((v = b.getAttribute('data-key')) !== null) {
      if (!flip(mix.keys, +v)) { return; }
      sel = '[data-key="' + v + '"]';
    } else if ((v = b.getAttribute('data-keyset')) !== null) {
      mix.keys = KEY_SETS[+v][1].slice();
      sel = '[data-keyset="' + v + '"]';
    } else if ((v = b.getAttribute('data-tempo'))) {
      if (!flip(mix.tempos, +v)) { return; }
      sel = '[data-tempo="' + v + '"]';
    } else if (b.hasAttribute('data-feel-all')) {
      mix.feels = library.feels();
      sel = '[data-feel-all]';
    } else if ((v = b.getAttribute('data-feel'))) {
      if (!flip(mix.feels, v)) { return; }
      sel = '[data-feel="' + v + '"]';
    } else if ((v = b.getAttribute('data-voicing'))) {
      mix.voicing = v;
      sel = '[data-voicing="' + v + '"]';
    } else if ((v = b.getAttribute('data-sound'))) {
      mix.sound = v;
      sel = '[data-sound="' + v + '"]';
    } else if ((v = b.getAttribute('data-homecue'))) {
      mix.home = v;
      sel = '[data-homecue="' + v + '"]';
    } else if ((v = b.getAttribute('data-playing'))) {
      mix.playing = v;
      sel = '[data-playing="' + v + '"]';
    } else if ((v = b.getAttribute('data-player'))) {
      if (!flipBand('players', ALL_SOUNDS, v)) { return; }
      sel = '[data-player="' + v + '"]';
    } else if ((v = b.getAttribute('data-kit'))) {
      if (!flipBand('kits', ALL_KITS, v)) { return; }
      sel = '[data-kit="' + v + '"]';
    } else if ((v = b.getAttribute('data-band-all'))) {
      mix[v] = null;
      sel = '[data-band-all="' + v + '"]';
    } else { return; }
    // keep the catalogue's order, so the answer grid always reads the same way
    mix.elements = HE.ELEMENTS.map(function (el) { return el.id; }).filter(function (id) { return has(mix.elements, id); });
    mixChanged(sel);
  });

  /* ---------- the record ---------- */

  function renderRecord() {
    var st = HE.trainer.stats(S.log);
    var rows = HE.ELEMENTS.filter(function (el) { return st.elements[el.id]; });
    $('rec-sum').textContent = S.sitting.loops ? 'This sitting: ' + S.sitting.right + ' of ' + S.sitting.loops + ' first time' : '';
    var got = HE.ELEMENTS.filter(function (el) { return st.elements[el.id] && st.elements[el.id].recognised; }).length;
    var tile = function (label, n, small) { return '<div><dt>' + label + '</dt><dd>' + n + (small ? '<span>' + small + '</span>' : '') + '</dd></div>'; };
    $('rec-tiles').hidden = !S.log.length;
    $('rec-tiles').innerHTML = tile('Recognised', got, 'of ' + HE.ELEMENTS.length) + tile('Answered', S.log.length, S.log.length === 1 ? 'loop' : 'loops') + tile('In a row', run(S.log), 'first time');
    if (!rows.length) {
      $('rec-list').innerHTML = '<li class="is-empty">Nothing here yet. Each loop you answer adds a dot beside its element: filled if you had the key and the element first time with nothing shown, hollow if not. Four filled from the last five, on two different days, and the element counts as recognised.</li>';
    } else {
      $('rec-list').innerHTML = rows.map(function (el) {
        var r = st.elements[el.id], dots = '';
        for (var i = 0; i < 5; i++) { dots += '<i' + (i < r.last.length ? ' class="' + (r.last[i] ? 'is-ok' : 'is-no') + '"' : '') + '></i>'; }
        var right = r.last.filter(Boolean).length;
        return '<li><span class="he-who"><b>' + esc(el.roman) + '</b><span>' + esc(el.name) + '</span></span>' +
          '<span class="he-how' + (r.recognised ? ' is-got' : '') + '"><span class="he-dots" role="img" aria-label="' + right + ' right of the last ' + r.last.length + '">' + dots + '</span>' +
          '<span>' + (r.recognised ? 'Recognised' : right + ' of last ' + r.last.length) + '</span></span></li>';
      }).join('');
    }
    // The map: every element of the course by stage, and where each stands. A tap opens its page in the Guide.
    $('map').innerHTML = HE.STAGES.filter(function (sg) { return !sg.retired; }).map(function (sg) {
      var els = HE.ELEMENTS.filter(function (el) { return el.stage === sg.n && HE.isActive(el.id); });
      if (!els.length) { return ''; }
      var done = els.filter(function (el) { return st.elements[el.id] && st.elements[el.id].recognised; }).length;
      return '<div class="he-map-stage"><div class="he-map-head"><b>' + sg.n + '. ' + esc(sg.name) + '</b><span>' + done + ' of ' + els.length + '</span>' +
        (sg.n > 1 ? '<button type="button" class="he-map-go" data-map-stage="' + sg.n + '">Practise</button>' : '') + '</div><div class="he-map-els">' +
        els.map(function (el) {
          var r = st.elements[el.id], state = r ? (r.recognised ? 'got' : 'on') : 'none';
          return '<a class="he-map-el is-' + state + '" href="#guide/' + el.id + '" title="' + esc(el.name) + '"><b>' + esc(el.roman) + '</b><span class="he-sr">' + esc(el.name) + ': ' + (state === 'got' ? 'recognised' : state === 'on' ? r.last.filter(Boolean).length + ' right of the last ' + r.last.length : 'not met yet') + '</span></a>';
        }).join('') + '</div></div>';
    }).join('');
    var top = st.mixups.slice(0, 3).map(function (m) {
      return HE.byId(m.was).roman + ' taken for ' + HE.byId(m.said).roman + (m.times > 1 ? ' (' + m.times + ' times)' : '');
    });
    $('rec-mix').textContent = top.length ? 'Worth another listen: ' + top.join('; ') + '.' : '';
    var drills = [];
    if (st.drills.pair.n) { drills.push('Which is which: ' + st.drills.pair.ok + ' of ' + st.drills.pair.n + ' first time'); }
    if (st.drills.change.n) { drills.push('Before and after: ' + st.drills.change.ok + ' of ' + st.drills.change.n + ' first time'); }
    if (st.halves.key.n) { drills.push('With the key shown, the element named first time: ' + st.halves.key.ok + ' of ' + st.halves.key.n); }
    if (st.halves.element.n) { drills.push('With the element shown, the key found first time: ' + st.halves.element.ok + ' of ' + st.halves.element.n); }
    $('rec-drills').textContent = drills.length ? drills.join('. ') + '.' : '';

    $('share-row').hidden = !MEMBER;
    $('share').checked = S.share;
    var note = $('share-note');
    if (MEMBER) {
      note.textContent = (S.share
        ? 'On. Jack sees which elements you recognise and which you mix up, so sessions can go straight to them.'
        : 'Off, so this record is yours alone. It is kept with your account, and Jack isn’t shown it.') +
        (S.unsaved ? ' The last answer hasn’t been saved yet. It will go with the next one.' : '');
    } else if (CFG.signin) {
      note.innerHTML = 'Kept in this browser only. <a href="' + esc(CFG.signin) + '">Members who sign in</a> keep theirs with their account, and can choose to share it with Jack.';
    } else {
      note.textContent = 'Kept in this browser only.';
    }
    $('rec-tools').innerHTML = !S.log.length ? '' : S.confirmClear
      ? tog('data-clear="yes"', 'Yes, clear it', false) + tog('data-clear="no"', 'Keep it', false)
      : tog('data-clear="ask"', 'Clear my record', false, 'is-link');
  }

  $('rec-tools').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) { return; }
    var v = b.getAttribute('data-clear');
    if (v === 'ask') { S.confirmClear = true; }
    else if (v === 'yes') {
      S.log = []; S.queue = []; S.sitting = { loops: 0, right: 0 }; S.confirmClear = false;
      S.stamp++;
      save();
      if (MEMBER) { post({ clear: true }).catch(function () { S.unsaved = true; renderRecord(); }); }
    } else { S.confirmClear = false; }
    renderRecord();
  });
  $('share').addEventListener('change', function () {
    var want = this.checked;
    S.share = want;
    renderRecord();
    if (!MEMBER) { return; }
    post({ share: want }).catch(function () {
      S.share = !want;
      renderRecord();
      $('share-note').textContent = 'That didn’t save. Check your connection and try again.';
    });
  });

  /* ---------- what you're hearing, and (for Jack) where it came from ---------- */

  function names(pcs) {
    var list = pcs.map(function (pc) { return HE.keyByPc(pc).name; });
    return list.length > 1 ? list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1] : list.join('');
  }

  function renderNote() {
    var box = $('note'), text = '', html = '', tag = 'Loops';
    if (!CFG.list && CFG.signin && !MEMBER) {
      tag = 'Try it';
      html = 'These loops are played by the house band: the app’s own instruments and kits. Members also get Jack’s recorded loops, and their record is kept with their account. <a href="' + esc(CFG.signin) + '">Member sign in</a>';
    } else if (HAS_RECORDED && REC_KEYS.length < 12) {
      text = 'Recorded loops are in for ' + names(REC_KEYS) + ' so far, marked with a dot. The house band plays every element in every key.';
    } else if (!HAS_RECORDED && CFG.admin) {
      tag = 'Only you see this';
      text = S.listed === false ? 'The list of recorded loops couldn’t be fetched, so the house band is playing everything. Check the Nextcloud connection in Portal settings.' : 'No recorded loops were found, so the house band is playing everything. Check the Harmonic Elements folder in Portal settings.';
    }
    box.hidden = !text && !html;
    $('note-label').textContent = tag;
    if (html) { $('note-text').innerHTML = html; } else { $('note-text').textContent = text; }
  }

  function describe(v, what) {
    if (!v) { return what + ': none'; }
    if (v.source === 'file') { return v.path; }
    var w = HE.synth.who(what === 'Chords' ? { chord: v } : { drum: v, feel: v.feel });
    return what + ': house band, ' + (what === 'Chords'
      ? w.chords + (v.playing === 'held' ? ', held' : ', in the feel')
      : w.drums + ', groove ' + ((v.groove || 0) + 1));
  }

  function renderBehind() {
    var box = $('behind');
    if (!CFG.admin) { box.hidden = true; return; }
    box.hidden = false;
    var r = S.round, rec = library.recorded;
    $('lib-sum').textContent = HAS_RECORDED
      ? rec.chords + (rec.chords === 1 ? ' chord loop' : ' chord loops') + ' and ' + rec.drums + (rec.drums === 1 ? ' drum loop' : ' drum loops') + ' in use' +
        (library.problems.length ? ', and ' + library.problems.length + (library.problems.length === 1 ? ' file' : ' files') + ' whose name couldn’t be placed.' : '.')
      : 'No recorded loops in use.';
    $('files').textContent = S.phase === 'revealed'
      ? describe(r.chord, 'Chords') + '\n' + describe(r.drum, 'Drums')
      : 'Shown once the loop is revealed.\nThe chord file’s name is the answer.';
  }

  /* ---------- wiring ---------- */

  var lock = null;
  function wake(on) {
    try {
      if (on && navigator.wakeLock) { navigator.wakeLock.request('screen').then(function (l) { lock = l; }).catch(function () { /* fine without */ }); }
      else if (!on && lock) { lock.release(); lock = null; }
    } catch (e) { /* fine without */ }
  }

  $('go').addEventListener('click', function () { if (S.owner === 'dojo' && (HE.audio.playing || S.busy)) { stop(); } else { start(); } });
  $('homes').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || b.disabled) { return; }
    S.ans.homePc = +b.getAttribute('data-pc'); S.fb = null;
    renderDisplay(); syncAnswer(); renderResult();
  });
  // Major or minor: the element buttons are then shown as they sound from a home of that kind.
  $('kmodes').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || b.disabled) { return; }
    var m = b.getAttribute('data-kmode');
    S.ans.mode = S.ans.mode === m ? null : m; S.fb = null;
    // an element already picked that has no place from this kind of home is let go (unless it was shown)
    if (S.ans.elId && S.round.ask !== 'home' && !S.showed.el && !S.round.elementGiven && !padItems(S.ans.mode).some(function (x) { return x.elId === S.ans.elId; })) { S.ans.elId = null; }
    buildEls();
    renderDisplay(); syncAnswer(); renderResult();
    var again = app.querySelector('[data-kmode="' + m + '"]'); if (again) { again.focus(); }
  });
  $('els').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || b.disabled) { return; }
    S.ans.elId = b.getAttribute('data-el'); S.fb = null;
    renderDisplay(); syncAnswer(); renderResult();
  });
  $('guide').addEventListener('click', function (e) { var gb = e.target.closest('[data-ghear]'); if (gb) { guideHear(+gb.getAttribute('data-ghear')); } });
  $('copy-link').addEventListener('click', function () {
    var url = dojoLinkFor(), b = this;
    function done() { b.textContent = 'Copied'; window.setTimeout(function () { b.textContent = 'Copy a link to this mix'; }, 1800); }
    try { navigator.clipboard.writeText(url).then(done, function () { window.prompt('Copy this link', url); }); } catch (e) { window.prompt('Copy this link', url); }
  });
  $('map').addEventListener('click', function (e) {
    var b = e.target.closest('[data-map-stage]'); if (!b || !S.ready) { return; }
    var n = +b.getAttribute('data-map-stage');
    var ids = HE.ELEMENTS.filter(function (el) { return el.stage === n && HE.isActive(el.id); }).map(function (el) { return el.id; });
    if (ids.length < 2) { return; }
    if (S.owner === 'dojo' && (HE.audio.playing || S.busy)) { stop(); }
    S.mix = HE.trainer.cleanMix(extend(S.mix, { elements: ids }), library); S.hadMix = true; S.mode = 'name'; S.stamp++;
    save(); renderModes(); renderMix(); newRound();
    say('Name it, with Stage ' + n + ' in play.');
    $('modes').scrollIntoView({ block: 'start', behavior: 'auto' });
    var go = $('go'); if (go) { go.focus({ preventScroll: true }); }
  });
  $('check').addEventListener('click', check);
  $('hit').addEventListener('click', homeHit);
  $('show-key').addEventListener('click', function () { showHalf('key'); });
  $('show-el').addEventListener('click', function () { showHalf('element'); });
  $('result').addEventListener('click', function (e) {
    var to = e.target.closest('[data-act="guide"]');
    if (to) { go('guide/' + to.getAttribute('data-id')); return; }
    var hb = e.target.closest('[data-act="hear"]');
    if (hb) { hearFrom(+hb.getAttribute('data-h')); return; }
    var b = e.target.closest('[data-act="next"]'); if (!b) { return; }
    next();
    $('go').focus({ preventScroll: true });
  });

  /* ---------- the dock ----------
   * On a phone the big play button is soon scrolled away: the answers are below it, and in the
   * Guide so is everything there is to read. Once it is out of sight, play and stop (and Check,
   * or Next) wait in a strip along the bottom of the screen instead.
   */
  var dockTarget = null, dockWatch = null, dockPast = false, appSeen = true;
  function renderDock() {
    var dock = $('dock');
    if (!dock) { return; }
    var guide = S.view === 'guide', r = guide ? G.round : S.round;
    var show = S.ready && dockPast && appSeen && !!r && !!dockTarget;
    dock.hidden = !show;
    app.classList.toggle('has-dock', show);
    if (!show) { return; }
    var on = S.owner === (guide ? 'guide' : 'dojo') && (HE.audio.playing || S.busy);
    var button = $('dock-go'), act = $('dock-act');
    button.setAttribute('aria-pressed', String(on));
    button.setAttribute('aria-label', on && S.busy ? 'Tuning up' : on ? 'Stop' : 'Play the loop');
    if (guide) {
      $('dock-kicker').textContent = jamKicker();
      $('dock-line').textContent = fullName(r.el);
      act.textContent = 'Player';
      act.className = 'he-btn is-quiet';
      act.disabled = false;
      return;
    }
    var revealed = S.phase === 'revealed', picked = S.ans.elId ? padItem(S.ans.elId) : null;
    $('dock-kicker').textContent = kicker();
    $('dock-line').textContent = revealed
      ? (r.mode ? HE.spell(r.el, r.keyPc, r.voicing).tonic : HE.keyName(r.el, HE.keyHearings(r.el, r.voicing)[0], r.keyPc)) + ' · ' + r.el.roman
      : (S.ans.homePc === null ? '?' : HE.keyByPc(S.ans.homePc).name + (S.ans.mode ? ' ' + S.ans.mode : '')) + ' · ' + (picked ? picked.label : '?');
    act.textContent = revealed ? 'Next' : 'Check';
    act.className = 'he-btn' + (revealed ? ' is-sound' : '');
    act.disabled = !revealed && !answered();
  }
  // Watch whichever play button belongs to the room that is showing. (The Guide's is drawn afresh with each page.)
  function watchDock() {
    var target = S.view === 'guide' ? $('j-go') : $('go');
    if (target !== dockTarget) {
      if (dockWatch && dockTarget) { dockWatch.unobserve(dockTarget); }
      dockTarget = target || null;
      dockPast = false;
      if (dockWatch && dockTarget) { dockWatch.observe(dockTarget); }
    }
    renderDock();
  }
  if (window.IntersectionObserver && $('dock')) {
    dockWatch = new window.IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.target === app) { appSeen = en.isIntersecting; }
        // "past" is scrolled off the top, not still to come further down the page
        else if (en.target === dockTarget) { dockPast = !en.isIntersecting && en.boundingClientRect.bottom < (en.rootBounds ? en.rootBounds.top + 1 : 1); }
      });
      renderDock();
    }, { rootMargin: '-64px 0px 0px 0px' });
    dockWatch.observe(app);
    $('dock-go').addEventListener('click', function () {
      var button = S.view === 'guide' ? $('j-go') : $('go');
      if (button) { button.click(); }
    });
    $('dock-act').addEventListener('click', function () {
      if (S.view === 'guide') { var jam = $('jam'); if (jam) { jam.scrollIntoView({ block: 'start', behavior: 'auto' }); } return; }
      if (S.phase === 'revealed') { next(); } else { check(); }
    });
  }

  // The faders: the Dojo's mixer and the Guide's player each have a pair, and they are the same pair.
  function syncLevels() {
    [].forEach.call(app.querySelectorAll('[data-level]'), function (input) { input.value = Math.round(S.levels[input.getAttribute('data-level')] * 100); });
    [].forEach.call(app.querySelectorAll('[data-level-out]'), function (out) { out.textContent = Math.round(S.levels[out.getAttribute('data-level-out')] * 100); });
  }
  app.addEventListener('input', function (e) {
    var name = e.target.getAttribute ? e.target.getAttribute('data-level') : null;
    if (!name) { return; }
    S.levels[name] = e.target.value / 100;
    if (HE.audio.supported) { try { HE.audio.level(name, S.levels[name]); } catch (err) { /* no sound yet */ } }
    syncLevels();
    save();
  });
  syncLevels();
  $('countin').checked = S.countIn;
  $('countin').addEventListener('change', function () { S.countIn = this.checked; save(); });

  // On the page that is only the trainer, the space bar is play and stop, and Enter is Check (then Next).
  if (FULL) {
    document.addEventListener('keydown', function (e) {
      if (e.target !== document.body && e.target !== document.documentElement) { return; }
      if (e.altKey || e.ctrlKey || e.metaKey || !S.ready) { return; }
      if (e.code === 'Space') {
        var button = S.view === 'guide' ? $('j-go') : $('go');
        if (button) { e.preventDefault(); button.click(); }
      } else if (e.key === 'Enter' && S.view === 'dojo') {
        e.preventDefault();
        if (S.phase === 'revealed') { next(); } else { check(); }
      }
    });
  }
  // Leaving the page stops the sound.
  window.addEventListener('pagehide', function () { try { HE.audio.stop(); } catch (e) { /* nothing playing */ } });

  /* ---------- the two rooms ---------- */

  var GUIDE = HE.GUIDE || null;
  // Which page of the Guide each element is on (most have a card of their own name; the first two forms don't),
  // and the Guide's stages with the three groups of further molecules after them.
  var CARDED = {}, ALL_STAGES = [];
  var MORE_INTRO = '<p>Progressions that turn up everywhere and have no card in the course yet. Each has a page put together from the catalogue: its chords, what they fix and what they leave open, and a line on what to listen for. The names are working titles.</p>';
  if (GUIDE) {
    Object.keys(GUIDE.cards).forEach(function (id) {
      var c = GUIDE.cards[id];
      if (!c.el) { c.el = HE.FORM_CARDS[id] || (HE.byId(id) ? id : null); }
      // a card about something that is out of the app for now (a form) is read without a loop
      if (c.el && !HE.isActive(c.el)) { c.retired = c.el; c.el = null; }
      if (c.el) { CARDED[c.el] = id; }
    });
    // (a stage that is out of the app for now, Stage 10, isn't in the Guide's contents either)
    ALL_STAGES = GUIDE.stages.filter(function (st) { var x = HE.stage(st.n); return !(x && x.retired); }).concat(HE.STAGES.filter(function (st) { return st.more; }).map(function (st) {
      return { n: st.n, id: 'more-' + st.n, title: HE.stageLabel(st.n), name: st.name, sub: st.about, intro: MORE_INTRO, cards: [], closing: '', more: true };
    }));
  }
  // The page an element is read about on: its card, or failing that a page made from the catalogue.
  function pageOf(elId) { return CARDED[elId] || (HE.isActive(elId) ? elId : ''); }

  function showView(view) {
    if (view !== 'guide' || !GUIDE) { view = 'dojo'; }
    if (S.view === view) { return; }
    if (HE.audio.supported && (HE.audio.playing || S.busy)) { stop(); }
    S.view = view;
    $('view-dojo').hidden = view !== 'dojo';
    $('view-guide').hidden = view !== 'guide';
    $('tab-dojo').setAttribute('aria-pressed', String(view === 'dojo'));
    $('tab-guide').setAttribute('aria-pressed', String(view === 'guide'));
    $('mix-link').hidden = view !== 'dojo';
    $('tabs').hidden = !GUIDE;
    save();
    watchDock();
    if (view === 'dojo' && S.round && !S.round.played) { prepare(S.round, true); }
  }

  // Go where the address says. False if it says nothing about the rooms (another link on the page, say).
  function route() {
    var hash = '';
    try { hash = decodeURIComponent((window.location.hash || '').slice(1)); } catch (e) { hash = ''; }
    var m = /^(guide|dojo)(?:\/(.*))?$/.exec(hash);
    if (!m || (m[1] === 'guide' && !GUIDE)) { return false; }
    var arriving = S.view !== '';
    showView(m[1]);
    if (m[1] === 'guide') { openGuide(m[2] || '', arriving); }
    else if (m[2] && S.mix && S.linked !== m[2]) { S.linked = m[2]; dojoLink(m[2]); }
    else if (arriving) { app.scrollIntoView({ block: 'nearest', behavior: 'auto' }); }
    return true;
  }
  // A link into the Dojo can say what to ask and of which elements: #dojo/name/major-lean+major-pull, #dojo/home,
  // #dojo/pair/... It sets the Dojo's mix, as "Test Stage 2 in the Dojo" does. (How a set from Jack arrives.)
  var LINK_MODES = { name: 'name', home: 'home', pair: 'pair', change: 'change', today: 'today' };
  function dojoLink(rest) {
    var parts = rest.split('/'), mode = LINK_MODES[parts[0]], ids = (parts[mode ? 1 : 0] || '').split('+').filter(function (id) { return HE.isActive(id); });
    if (!mode && !ids.length) { return; }
    if (S.owner === 'dojo' && (HE.audio.playing || S.busy)) { stop(); }
    if (mode) { S.mode = mode; }
    if (ids.length) { S.mix.elements = ids; S.hadMix = true; }
    S.stamp++;
    save();
    renderModes(); renderMix(); newRound();
    if (ids.length) { say('This link set the mix to ' + ids.length + (ids.length === 1 ? ' element' : ' elements') + '. Change it under The mix.'); }
  }
  function dojoLinkFor() {
    if (S.mode === 'today') { return window.location.href.split('#')[0] + '#dojo/today'; }
    return window.location.href.split('#')[0] + '#dojo/' + S.mode + '/' + S.mix.elements.join('+');
  }
  function go(hash) {
    if (window.location.hash === '#' + hash) { route(); } else { window.location.hash = hash; }
  }
  window.addEventListener('hashchange', function () { if (S.ready) { route(); } });
  $('tabs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-view]'); if (!b || !S.ready) { return; }
    go(b.getAttribute('data-view') === 'guide' ? 'guide' + (G.id ? '/' + G.id : '') : 'dojo');
  });

  /* ---------- the Guide: finding a page ---------- */

  var JAM = saved.jam && typeof saved.jam === 'object' ? saved.jam : {};
  var G = {
    id: '',                       // the page that is open ('' is the contents)
    el: null,                     // the element that page is about, if it has a loop
    open: {},                     // stages whose elements are showing in the contents
    keyPc: JAM.keyPc !== undefined && HE.keyByPc(JAM.keyPc) ? JAM.keyPc : 0,   // the course is written in C
    bpm: +JAM.bpm || 0,
    feel: JAM.feel ? String(JAM.feel) : '',
    // Who plays the chords: '' (a recording where there is one, or else whoever suits the feel), 'rec:0'
    // (that recording), 'suit' (the house band, whoever suits the feel) or one of the house band's sounds.
    sound: typeof JAM.sound === 'string' ? JAM.sound : /^rec:/.test(JAM.version || '') ? String(JAM.version) : '',
    voicing: JAM.voicing === 'sevenths' || JAM.version === 'synth:sevenths' ? 'sevenths' : 'triads',
    playing: JAM.playing === 'held' ? 'held' : 'feel',
    // The drums: '' (a recording where there is one, or else the kit that suits the feel best), 'rec' or a kit.
    kit: typeof JAM.kit === 'string' ? JAM.kit : '',
    groove: 0,                    // which of the feel's grooves: it moves on each time the loop is started again
    bandOpen: !!JAM.open,         // whether "The band" is unfolded
    playOpen: !!JAM.play,         // whether "Play" is unfolded
    line: typeof JAM.line === 'string' ? JAM.line : 'roots',   // which line of the note menu is written out
    bass: JAM.bass === 'on' || JAM.bass === 'turns' ? JAM.bass : 'off',   // the reference bass: off, plays the line, or takes turns
    voice: JAM.voice === 'ubass' ? 'ubass' : 'ebass',
    lit: -1,                      // which chord the fretboard is lighting
    round: null
  };

  function card(id) { return GUIDE && Object.prototype.hasOwnProperty.call(GUIDE.cards, id) ? GUIDE.cards[id] : null; }
  // Elements the Dojo plays that the course has no card for yet.
  function extras(stage) {
    return HE.ELEMENTS.filter(function (el) { return el.stage === stage && !CARDED[el.id]; });
  }
  // The order the Guide is read in (1.13.0). The course text is written as a document: front matter, the
  // method, the elements, reference. In the app the elements are what people come for, so the Guide opens
  // with four short pages (what the course is, the idea, the relationships, whose home), then the elements,
  // then the rest of the method, then reference, where the two pages about the document itself now sit.
  // Only the order and the headings change: every page keeps its id and its words.
  var START_PAGES = ['about', 'method-the-idea', 'method-the-relationships', 'method-whose-home-is-it'];
  var REF_PAGES = ['organised', 'conventions'];
  function shortTitle(t) { return String(t).replace(/^\d+\.\s*/, ''); }   // "4. Two more lenses": the numbers are the document's order
  var PARTS = null;
  function guideParts() {
    if (PARTS) { return PARTS; }
    var by = {};
    GUIDE.front.concat(GUIDE.method, GUIDE.reference).forEach(function (p) { by[p.id] = p; });
    function pick(ids) { return ids.filter(function (id) { return !!by[id]; }).map(function (id) { return by[id]; }); }
    function rest(list) { return list.filter(function (p) { return START_PAGES.indexOf(p.id) === -1 && REF_PAGES.indexOf(p.id) === -1; }); }
    PARTS = { start: pick(START_PAGES), method: rest(GUIDE.front).concat(rest(GUIDE.method)), reference: pick(REF_PAGES).concat(GUIDE.reference) };
    return PARTS;
  }
  function guideOrder() {
    var out = [], parts = guideParts();
    parts.start.forEach(function (p) { out.push(p.id); });
    ALL_STAGES.forEach(function (s) {
      out.push(s.id);
      s.cards.forEach(function (id) { out.push(id); });
      extras(s.n).forEach(function (el) { out.push(el.id); });
    });
    parts.method.forEach(function (p) { out.push(p.id); });
    parts.reference.forEach(function (p) { out.push(p.id); });
    return out;
  }
  function guideFind(id) {
    // (an element whose card goes by another name is found on that card)
    if (CARDED[id] && CARDED[id] !== id) { id = CARDED[id]; }
    var c = card(id), i, hit;
    if (c) { return { kind: 'card', card: c, el: c.el ? HE.byId(c.el) : null, stage: c.stage, title: (c.roman ? c.roman + ' · ' : '') + c.name }; }
    for (i = 0; i < ALL_STAGES.length; i++) {
      if (ALL_STAGES[i].id === id) { return { kind: 'stage', stageInfo: ALL_STAGES[i], stage: ALL_STAGES[i].n, title: ALL_STAGES[i].title }; }
    }
    var gp = guideParts(), parts = [['start', 'Start here'], ['method', shortTitle(GUIDE.methodTitle.replace(/^Part \w+\.\s*/, ''))], ['reference', shortTitle(GUIDE.referenceTitle.replace(/^Part \w+\.\s*/, ''))]];
    for (i = 0; i < parts.length; i++) {
      hit = gp[parts[i][0]].filter(function (p) { return p.id === id; })[0];
      if (hit) { return { kind: 'text', page: hit, part: parts[i][1], title: shortTitle(hit.title) }; }
    }
    if (HE.isActive(id) && !CARDED[id]) {
      hit = HE.byId(id);
      return { kind: 'element', el: hit, stage: hit.stage, title: hit.roman + ' · ' + hit.name };
    }
    return null;
  }

  /* ---------- the Guide: the contents ---------- */

  var CHEVRON = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><polyline points="3,6 8,11 13,6"></polyline></svg>';

  function here(id) { return G.id === id ? ' aria-current="page"' : ''; }
  function pageLink(p) { return '<button type="button" class="he-g-link" data-go="' + esc(p.id) + '"' + here(p.id) + '>' + esc(shortTitle(p.title)) + '</button>'; }
  function elementLink(id, roman, name) {
    return '<button type="button" class="he-tog" data-go="' + esc(id) + '"' + here(id) + '>' +
      (roman ? '<b>' + esc(roman) + '</b><span>' + esc(name) + '</span>' : '<b>' + esc(name) + '</b>') + '</button>';
  }
  function stageLinks(s) {
    return s.cards.map(function (id) { var c = card(id); return elementLink(id, c.roman, c.name + (c.optional ? ' (optional)' : '')); })
      .concat(extras(s.n).map(function (el) { return elementLink(el.id, el.roman, el.name); })).join('');
  }

  function renderIndex() {
    var gp = guideParts(), bare = function (t) { return String(t).replace(/^Part \w+\.\s*/, ''); };
    var html = '<p class="he-kicker">Start here</p><div class="he-g-list">' + gp.start.map(pageLink).join('') + '</div>' +
      '<p class="he-kicker">' + esc(bare(GUIDE.elementsTitle)) + '</p><div class="he-g-lede he-small">' + GUIDE.elementsIntro + '</div>' +
      '<div class="he-stages">' + ALL_STAGES.map(function (s) {
        var open = !!G.open[s.n], n = s.cards.length + extras(s.n).length;
        return '<div class="he-stage">' +
          '<button type="button" class="he-stage-all" data-go="' + s.id + '"' + here(s.id) + '><b>' + esc(s.title) + '</b><span>' + n + '</span></button>' +
          '<button type="button" class="he-stage-open" data-gopen="' + s.n + '" aria-expanded="' + open + '" aria-label="Show what is in ' + esc(s.title) + '">' + CHEVRON + '</button>' +
          (open ? '<div class="he-stage-els">' + stageLinks(s) + '</div>' : '') +
          '</div>';
      }).join('') + '</div>' +
      '<p class="he-kicker">' + esc(bare(GUIDE.methodTitle)) + '</p><div class="he-g-list">' + gp.method.map(pageLink).join('') + '</div>' +
      '<p class="he-kicker">' + esc(bare(GUIDE.referenceTitle)) + '</p><div class="he-g-list">' + gp.reference.map(pageLink).join('') + '</div>';
    $('g-index').innerHTML = html;
  }

  /* ---------- the Guide: a page ---------- */

  function pager() {
    var order = guideOrder(), i = order.indexOf(G.id || order[0]);
    function link(id, word) {
      if (!id) { return '<span></span>'; }
      return '<button type="button" class="he-g-link" data-go="' + esc(id) + '"><span class="he-kicker">' + word + '</span>' + esc(guideFind(id).title) + '</button>';
    }
    return '<nav class="he-g-pager" aria-label="More of the guide">' + link(order[i - 1], 'Before this') + link(order[i + 1], 'After this') + '</nav>';
  }
  function stageLine(n) {
    var s = ALL_STAGES.filter(function (x) { return x.n === n; })[0];
    return s ? '<button type="button" class="he-g-crumb" data-go="' + s.id + '">' + esc(s.title) + '</button>' : '';
  }
  var BACK = '<p class="he-g-back"><button type="button" class="he-tog is-link" data-go="">&larr; Contents</button></p>';

  // From reading to testing: the Dojo, with its mix set to the stage this page belongs to.
  function stageIds(n) { return HE.ELEMENTS.filter(function (el) { return el.stage === n; }).map(function (el) { return el.id; }); }
  function testButton(n) {
    if (!stageIds(n).length) { return ''; }
    return '<p class="he-g-test"><button type="button" class="he-btn is-quiet" data-act="test" data-stage="' + n + '">' + (HE.stage(n).more ? 'Test these in the Dojo' : 'Test Stage ' + n + ' in the Dojo') + '</button>' +
      '<span class="he-small">Sets the Dojo’s mix to ' + (HE.stage(n).more ? 'this group’s' : 'this stage’s') + ' elements.</span></p>';
  }
  function testStage(n) {
    var ids = stageIds(n);
    if (!ids.length || !S.mix) { go('dojo'); return; }
    S.mix.elements = ids;
    S.hadMix = true;
    S.stamp++;
    save();
    renderMix();
    newRound();
    say('The mix is now ' + HE.stageLabel(n).replace('. ', ', ') + ': ' + ids.length + (ids.length === 1 ? ' element' : ' elements') + '. Change it under The mix.');
    go('dojo');
  }

  // What the catalogue knows about an element, set out as a card's facts are: for one the course has no card for.
  var DEG_SHOW = { '1': '1', '#1': '♯1', 'b2': '♭2', '2': '2', 'b3': '♭3', '3': '3', '4': '4', '#4': '♯4', 'b5': '♭5', '5': '5', '#5': '♯5', 'b6': '♭6', '6': '6', 'b7': '♭7', '7': '7' };
  function fixedOpen(el, voicing) {
    var d = HE.degrees(el, voicing);
    return d.fixed.map(function (x) { return DEG_SHOW[x]; }).join(' ') + ' | open: ' + (d.open.length ? d.open.join(', ') : 'None');
  }
  function factsFor(el) {
    function inC(voicing) { return HE.spell(el, 0, voicing).chords.map(function (c) { return esc(c.name); }).join(' '); }
    var rows = [['In C', inC('triads')], ['Key', esc(HE.keyName(el, HE.keyHearings(el, 'triads')[0], 0))]];
    if (el.sev) { rows.push(['Expanded voicing', inC('sevenths')]); }
    if (el.rel) { rows.push(['Built from', esc(el.rel)]); }
    rows.push(['Fixed and open in base voicing', fixedOpen(el, 'triads')]);
    if (el.sev) { rows.push(['Fixed and open in expanded voicing', fixedOpen(el, 'sevenths')]); }
    var paras = [['Listen for', esc(HE.tip(el, 0, 'triads'))]];
    var near = [];
    HE.PAIRS.forEach(function (p) { if (p[0] === el.id) { near.push(HE.byId(p[1])); } else if (p[1] === el.id) { near.push(HE.byId(p[0])); } });
    if (near.length) { paras.push(['Contrast with', near.map(function (x) { return esc(x.roman) + ' (' + esc(x.name.replace(/^The /, 'the ')) + ')'; }).join(', ') + '.']); }
    var others = otherHearings(el, 0, 'triads', null);
    if (others.length) { paras.push(['Whose home', 'The same chords can also be heard as ' + others.join('; or ') + '. In Find home, any of these counts. The chords don’t settle it: the bass does. <a href="#guide/method-whose-home-is-it">Whose home is it?</a>']); }
    return { rows: rows, paras: paras };
  }

  function renderPage(found) {
    var box = $('g-page'), html = BACK, c, s;
    if (found.kind === 'card' || found.kind === 'element') {
      c = found.card;
      html += '<p class="he-kicker">' + stageLine(found.stage) + '</p>' +
        '<h2 class="he-g-title">' + (c ? (c.roman ? '<span class="he-g-roman">' + esc(c.roman) + '</span>' : '') + '<span class="he-g-name' + (c.roman ? '' : ' is-big') + '">' + esc(c.name) + (c.optional ? ' (optional)' : '') + '</span>'
          : '<span class="he-g-roman">' + esc(found.el.roman) + '</span><span class="he-g-name">' + esc(found.el.name) + '</span>') + '</h2>';
      if (found.el) { html += '<section class="he-jam" id="he-jam" aria-label="Play along"></section>'; }
      if (c) {
        // the key the course hears it in, and any other hearing the Dojo accepts
        var keyRows = !found.el ? [] : [['Home, as the course hears it', esc(HE.keyName(found.el, HE.keyHearings(found.el, 'triads')[0], 0))]];
        var heardAs = found.el ? otherHearings(found.el, 0, 'triads', null) : [];
        if (heardAs.length) { keyRows.push(['Also heard as', heardAs.join('; ')]); }
        html += '<dl class="he-g-facts">' + c.rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + r[1] + '</dd></div>'; }).join('') +
          keyRows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + r[1] + '</dd></div>'; }).join('') + '</dl>' +
          '<div class="he-g-text">' + c.paras.map(function (p) { return '<p>' + (p[0] ? '<b>' + esc(p[0]) + '.</b> ' : '') + p[1] + '</p>'; }).join('') + '</div>';
        if (!found.el) {
          html += '<p class="he-small">' + (c.retired ? 'The forms are out of the app for now, while it concentrates on the small units, so this one has no loop here.' : 'This one has no loop of its own to play along with.') + '</p>';
        }
      } else {
        var facts = factsFor(found.el);
        html += '<dl class="he-g-facts">' + facts.rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + r[1] + '</dd></div>'; }).join('') + '</dl>' +
          '<div class="he-g-text">' + facts.paras.map(function (p) { return '<p><b>' + esc(p[0]) + '.</b> ' + p[1] + '</p>'; }).join('') + '</div>' +
          '<p class="he-small">The course has no card for this one yet. This page is put together from the catalogue, and its wording is a draft.</p>';
      }
      // Hear it from each home: the page's loop with the band's bass on the roots, phrased from each home it has.
      if (found.el && HE.synth.supported && found.el.kind !== 'form' && found.el.kind !== 'home') {
        var gh = HE.keyHearings(found.el, 'triads');
        html += '<div class="he-g-hear"><p class="he-kicker">' + (gh.length > 1 ? 'Hear it from each home' : 'Hear it with the bass') + '</p><div class="he-hear">' + gh.map(function (h, i) {
          return '<button type="button" class="he-btn is-quiet" data-ghear="' + i + '">' + esc(HE.keyName(found.el, h, G.keyPc)) + '</button>';
        }).join('') + (gh.length > 1 ? '<span class="he-small">The same chords each time, at the tempo and feel set above. The bass decides where home is. <a href="#guide/method-whose-home-is-it">Whose home is it?</a></span>' : '') + '</div></div>';
      }
      if (found.el) { html += testButton(found.stage); }
    } else if (found.kind === 'stage') {
      s = found.stageInfo;
      html += '<p class="he-kicker">' + esc(GUIDE.elementsTitle) + '</p>' +
        '<h2 class="he-g-title"><span class="he-g-name is-big">' + esc(s.title) + '</span></h2>' +
        (s.sub ? '<p class="he-g-sub">' + esc(s.sub) + '</p>' : '') +
        '<div class="he-g-text">' + s.intro + '</div>' +
        '<p class="he-kicker">' + (s.more ? 'In this group' : 'In this stage') + '</p><div class="he-stage-els">' + stageLinks(s) + '</div>' +
        (s.closing ? '<h3 class="he-g-h">Closing Stage ' + s.n + '</h3><div class="he-g-text">' + s.closing + '</div>' : '') +
        testButton(s.n);
    } else {
      html += '<p class="he-kicker">' + esc(found.part) + '</p>' +
        '<h2 class="he-g-title"><span class="he-g-name is-big">' + esc(found.page.id === 'about' ? GUIDE.title : shortTitle(found.page.title)) + '</span></h2>' +
        '<div class="he-g-text">' + found.page.html + '</div>';
    }
    box.innerHTML = html + pager();
    if (found.el) { jamSetup(); renderJam(); }
  }

  // Open a page of the guide ('' is the contents). Wide screens show the contents and a page side by side.
  function openGuide(id, bringIntoView) {
    // (a link to an element that has been merged into another opens the one it became)
    var gone = id ? HE.byId(id) : null;
    if (gone && gone.into && !HE.isActive(id)) { id = pageOf(gone.into) || id; }
    var found = id ? guideFind(id) : null;
    if (!found) { id = ''; }
    if (S.owner === 'guide' && (HE.audio.playing || S.busy)) { stop(); }
    G.id = id;
    G.el = found && found.el ? found.el : null;
    G.round = null;
    if (found && found.stage) { G.open[found.stage] = true; }
    $('guide').setAttribute('data-pane', id ? 'page' : 'index');
    renderIndex();
    renderPage(found || guideFind(GUIDE.front[0].id));
    watchDock();
    // A page chosen from a long list of contents starts at its top; the contents just need to be in sight.
    if (bringIntoView) { if (id) { $('g-page').scrollIntoView({ block: 'start', behavior: 'auto' }); } else { app.scrollIntoView({ block: 'nearest', behavior: 'auto' }); } }
  }

  $('view-guide').addEventListener('click', function (e) {
    if (!S.ready) { return; }
    var b = e.target.closest('[data-go], [data-gopen], [data-act="test"], [data-jkey], [data-jvoicing], [data-jplaying], [data-jstrings], [data-jbass], #he-j-go');
    if (!b) { return; }
    if (b.hasAttribute('data-go')) { go('guide' + (b.getAttribute('data-go') ? '/' + b.getAttribute('data-go') : '')); return; }
    if (b.hasAttribute('data-gopen')) {
      var n = b.getAttribute('data-gopen');
      G.open[n] = !G.open[n];
      renderIndex();
      var again = app.querySelector('[data-gopen="' + n + '"]'); if (again) { again.focus(); }
      return;
    }
    if (b.hasAttribute('data-act')) { testStage(+b.getAttribute('data-stage')); return; }
    if (b.hasAttribute('data-jkey')) { G.keyPc = +b.getAttribute('data-jkey'); jamChanged('[data-jkey="' + G.keyPc + '"]'); return; }
    if (b.hasAttribute('data-jvoicing')) { G.voicing = b.getAttribute('data-jvoicing'); jamChanged('[data-jvoicing="' + G.voicing + '"]'); return; }
    if (b.hasAttribute('data-jplaying')) { G.playing = b.getAttribute('data-jplaying'); jamChanged('[data-jplaying="' + G.playing + '"]'); return; }
    if (b.hasAttribute('data-jstrings')) { setStrings(+b.getAttribute('data-jstrings')); jamChanged('[data-jstrings="' + strings() + '"]'); return; }
    if (b.hasAttribute('data-jbass')) { G.bass = b.getAttribute('data-jbass'); jamChanged('[data-jbass="' + G.bass + '"]'); return; }
    if (S.owner === 'guide' && (HE.audio.playing || S.busy)) { stop(); } else { jamStart(); }
  });
  $('view-guide').addEventListener('change', function (e) {
    var id = e.target.id;
    if (id === 'he-j-tempo') { G.bpm = +e.target.value; G.feel = jamFeel(); }
    else if (id === 'he-j-feel') { G.feel = e.target.value; G.groove = 0; }
    else if (id === 'he-j-sound') { G.sound = e.target.value; }
    else if (id === 'he-j-kit') { G.kit = e.target.value; }
    else if (id === 'he-j-line') { G.line = e.target.value; }
    else if (id === 'he-j-voice') { G.voice = e.target.value === 'ubass' ? 'ubass' : 'ebass'; }
    else { return; }
    jamChanged('#' + id);
  });
  // "The band" stays as it was left, folded or not, from page to page. (A fold's toggle doesn't bubble, so it is caught on the way down.)
  $('view-guide').addEventListener('toggle', function (e) {
    if (e.target.id === 'he-j-band') { G.bandOpen = e.target.open; save(); }
    if (e.target.id === 'he-j-play') { G.playOpen = e.target.open; save(); if (G.playOpen) { renderPlay(); } }
  }, true);

  /* ---------- the Guide: playing along ---------- */

  function jamSay(text) { var p = $('j-status'); if (p) { p.textContent = text; } }

  // The feels there are at the chosen tempo: all of the house band's, and any others recorded at it. And the one to use.
  function jamFeels() {
    return library.feels().filter(function (f) { return has(HE.synth.FEELS, f) || library.drumVersions(f, G.bpm, 'recorded').length > 0; });
  }
  function jamFeel() {
    var feels = jamFeels();
    if (has(feels, G.feel)) { return G.feel; }
    return feels.filter(function (f) { return library.drumVersions(f, G.bpm, 'recorded').length > 0; })[0] || feels[0] || '';
  }

  // The recordings of this element's loop on the chosen tone centre at the chosen tempo.
  function jamRecorded() {
    return library.chordVersions(G.el.id, G.keyPc, G.bpm, 'triads', 'recorded');
  }
  // Who is playing the chords: {id (as the list of sounds names it), version, voicing, recorded}.
  function jamChord() {
    var el = G.el, rec = jamRecorded(), m = /^rec:(\d+)$/.exec(G.sound);
    if (rec.length && (m || G.sound === '')) {
      var i = m ? Math.min(+m[1], rec.length - 1) : 0;
      return { id: 'rec:' + i, version: rec[i], voicing: HE.voicingFor(el, rec[i].voicing), recorded: true };
    }
    var chosen = !!HE.synth.sound(G.sound), voicing = HE.voicingFor(el, G.voicing);
    var version = extend(HE.library.houseChords(el.id, G.keyPc, G.bpm, voicing), {
      sound: chosen ? G.sound : HE.synth.soundFor(G.feel), playing: G.playing, take: G.groove % 2
    });
    return { id: chosen ? G.sound : 'suit', version: version, voicing: voicing, recorded: false };
  }
  // The kits that suit the chosen feel, best first. (Hand percussion is the Percussion feel's own.)
  function jamKits() {
    return has(HE.synth.FEELS, G.feel) ? HE.kit.kitsFor(G.feel) : [];
  }
  // Who is playing the drums: {id, version, recorded}, or null if nobody can at this tempo.
  function jamDrum() {
    var rec = library.drumVersions(G.feel, G.bpm, 'recorded'), kits = jamKits();
    if (rec.length && (G.kit === '' || G.kit === 'rec' || !kits.length)) {
      // the recordings of a feel take turns
      return { id: 'rec', version: rec[G.groove % rec.length], recorded: true };
    }
    if (!kits.length) { return null; }
    var kit = has(kits, G.kit) ? G.kit : kits[0];
    return { id: kit, version: extend(HE.library.houseDrums(G.feel, G.bpm), { kit: kit, groove: G.groove % HE.synth.GROOVES }), recorded: false };
  }

  function jamSetup() {
    if (!G.el) { return; }
    if (!has(JAM_TEMPOS, G.bpm)) { G.bpm = REC_TEMPOS.length ? REC_TEMPOS[0] : 90; }
    G.feel = jamFeel();
    if (!G.round || G.round.el !== G.el) { G.round = jamRound(); }
  }
  function jamRound() {
    var el = G.el, chord = jamChord(), drum = jamDrum(), v = chord.version;
    return {
      el: el, keyPc: G.keyPc, bpm: G.bpm, feel: G.feel, voicing: chord.voicing,
      chord: v, drum: drum ? drum.version : null,
      bars: (v.heard && v.heard.length) || v.bars || HE.bars(el, chord.voicing), map: v.heard || null,
      bassLine: G.bass !== 'off'   // the reference bass plays along (see "more", below)
    };
  }
  function jamKicker() {
    var r = G.round;
    return r ? 'Play along · ' + HE.keyName(r.el, HE.keyHearings(r.el, 'triads')[0], r.keyPc) + ' · ' + r.bpm + ' bpm · ' + r.feel : '';
  }

  function jamDisplay() {
    var r = G.round, label = $('j-kicker');
    if (!r || !label) { return; }
    var pips = '', i, form = isForm(r);
    label.textContent = jamKicker();
    $('j-changes').className = 'he-changes' + (form ? ' is-form' : '');
    $('j-changes').innerHTML = changesHtml(r, true);
    for (i = 0; i < r.bars; i++) { pips += '<i></i>'; }
    $('j-pips').innerHTML = pips;
    $('j-pips').hidden = form;
    var who = $('j-who');
    if (who) { who.textContent = whoLine(r) + (r.bassLine ? ' · ' + (G.voice === 'ubass' ? 'upright bass' : 'electric bass') : ''); }
    lastBar = -2;
  }
  function jamTransport() {
    var button = $('j-go');
    if (button) {
      var on = S.owner === 'guide' && (HE.audio.playing || S.busy);
      button.setAttribute('aria-pressed', String(on));
      $('j-go-label').textContent = on && S.busy ? 'Tuning up' : on ? 'Stop' : 'Play the loop';
    }
    renderDock();
  }

  function option(value, text, chosen) { return '<option value="' + esc(value) + '"' + (chosen ? ' selected' : '') + '>' + esc(text) + '</option>'; }
  function options(label, list) { return list.length ? '<optgroup label="' + esc(label) + '">' + list.join('') + '</optgroup>' : ''; }
  function field(label, id, inner) {
    return '<label class="he-field"><span class="he-kicker">' + label + '</span><select id="he-j-' + id + '">' + inner + '</select></label>';
  }
  function fader(name, label) {
    return '<div class="he-fader-row"><label class="he-kicker" for="he-j-lv-' + name + '">' + label + '</label><input class="he-fader" type="range" id="he-j-lv-' + name + '" data-level="' + name + '" min="0" max="100" step="1"><output data-level-out="' + name + '" for="he-j-lv-' + name + '"></output></div>';
  }

  function renderJam() {
    var box = $('jam');
    if (!box || !G.el || !library) { return; }
    if (!G.round) { G.round = jamRound(); }
    var chord = jamChord(), drum = jamDrum(), rec = jamRecorded(), dots = REC_KEYS.length > 0 && REC_KEYS.length < 12;
    var tempo = function (t) { return option(t, t + ' bpm', t === G.bpm); };

    // who can play the chords: the recordings first, then the house band, a family at a time
    var sounds = options('Recorded', rec.map(function (v, i) {
      return option('rec:' + i, (rec.length > 1 ? 'Recording ' + (i + 1) : 'Recording') + (v.label ? ' (' + v.label + ')' : ''), chord.id === 'rec:' + i);
    })) + options('The house band', [option('suit', 'Suits the feel: ' + HE.synth.sound(HE.synth.soundFor(G.feel)).name, chord.id === 'suit')]) +
      SOUND_GROUPS.map(function (g) { return options(g[0], g[1].map(function (x) { return option(x.id, x.name, chord.id === x.id); })); }).join('');
    // and the drums: a recording of this feel if there is one, and the kits that suit it
    var recDrums = library.drumVersions(G.feel, G.bpm, 'recorded');
    var kits = options('Recorded', recDrums.length ? [option('rec', recDrums.length > 1 ? 'Recordings, ' + recDrums.length + ' in turn' : 'Recording', !!drum && drum.id === 'rec')] : []) +
      options('The house band', jamKits().map(function (id) { return option(id, HE.kit.kit(id).name, !!drum && drum.id === id); }));

    box.innerHTML =
      '<p class="he-kicker" id="he-j-kicker"></p>' +
      '<ul class="he-changes" id="he-j-changes"></ul>' +
      '<div class="he-pips" id="he-j-pips" aria-hidden="true"></div>' +
      '<button type="button" class="he-go" id="he-j-go" aria-pressed="false"><i aria-hidden="true"></i><span id="he-j-go-label">Play the loop</span></button>' +
      '<p class="he-status" id="he-j-status" role="status"></p>' +
      '<div class="he-set"><p class="he-kicker">Home</p><div class="he-togs">' + HE.KEYS.map(function (k) {
        return tog('data-jkey="' + k.pc + '" aria-label="' + k.name.replace('♭', ' flat').replace('♯', ' sharp') + '"', k.name, G.keyPc === k.pc, dots && has(REC_KEYS, k.pc) ? 'is-note is-rec' : 'is-note');
      }).join('') + '</div>' + (G.keyPc !== 0 ? '<p class="he-small">The page is written in C. The loop and the chords above are on ' + esc(HE.keyByPc(G.keyPc).name) + '.</p>' : '') + '</div>' +
      '<div class="he-jam-row">' +
      field('Tempo', 'tempo', !REC_TEMPOS.length ? JAM_TEMPOS.map(tempo).join('')
        : options('With recordings', REC_TEMPOS.map(tempo)) + options('The house band, at any tempo', JAM_TEMPOS.filter(function (t) { return !has(REC_TEMPOS, t); }).map(tempo))) +
      field('Feel', 'feel', jamFeels().map(function (f) { return option(f, f, f === G.feel); }).join('')) +
      '</div>' +
      '<details class="he-fold" id="he-j-band"' + (G.bandOpen ? ' open' : '') + '>' +
      '<summary><span class="he-h">The band</span><span class="he-small" id="he-j-who"></span></summary>' +
      '<div class="he-fold-body">' +
      '<div class="he-jam-row">' + field('Chords', 'sound', sounds) + field('Drums', 'kit', kits) + '</div>' +
      (chord.recorded ? '' :
        (G.el.sev ? '<div class="he-set"><p class="he-kicker">Voicing</p><div class="he-togs">' +
          [['triads', 'Base'], ['sevenths', 'Expanded']].map(function (v) { return tog('data-jvoicing="' + v[0] + '"', v[1], chord.voicing === v[0]); }).join('') + '</div></div>' : '') +
        '<div class="he-set"><p class="he-kicker">How the chords are played</p><div class="he-togs">' +
          PLAYING.map(function (v) { return tog('data-jplaying="' + v[0] + '"', v[1], G.playing === v[0]); }).join('') + '</div></div>') +
      fader('chords', 'Chords') + fader('drums', 'Drums') +
      '</div></details>' +
      (CFG.bass ? '<details class="he-fold" id="he-j-play"' + (G.playOpen ? ' open' : '') + '>' +
        '<summary><span class="he-h">Play</span><span class="he-small">The note menu on the neck, a line to play, a reference bass</span></summary>' +
        '<div class="he-fold-body" id="he-j-play-body"></div></details>' : '');
    syncLevels();
    jamDisplay();
    jamTransport();
    watchDock();
    if (G.playOpen) { renderPlay(); }
    // (nothing is fetched or drawn for a page until its loop is asked for: most pages are only read)
  }

  // A setting changed: draw it, and if the loop was going, carry on with the new one.
  function jamChanged(focusSel) {
    var going = S.owner === 'guide' && (HE.audio.playing || S.busy);
    G.round = jamRound();
    save();
    renderJam();
    if (focusSel) { var el = app.querySelector(focusSel); if (el) { el.focus(); } }
    if (going) { jamStart('carry'); }
  }

  // how: nothing for a fresh start, 'carry' when a setting changed while the loop was going,
  // 'again' when a recording wouldn't load and the house band has stepped in.
  function jamStart(how) {
    if (!S.ready || !G.el) { return; }
    if (!HE.audio.supported || !HE.synth.supported) { jamSay('Sound isn’t available in this browser.'); return; }
    try { HE.audio.unlock(); } catch (e) { jamSay('Sound isn’t available in this browser.'); return; }
    noteRate();
    // (the reference bass needs the notation's sums: if they aren't in yet, fetch them and come back)
    if (G.bass !== 'off' && CFG.bass && !window.LBSBass) { needBass(function () { jamStart(how); }); return; }
    HE.audio.level('chords', S.levels.chords);
    HE.audio.level('drums', S.levels.drums);
    HE.audio.level('bass', S.levels.bass);
    if (!how) {
      // Started again after a stop: the feel's next groove (or its next recording), so it doesn't wear thin.
      if (G.round && G.round.played) { G.groove++; G.round = jamRound(); }
      jamSay('');
    }
    var r = G.round;
    if (!r || !r.drum) { jamSay('There’s no drum loop for this feel at this tempo yet.'); return; }
    r.played = true;
    S.owner = 'guide';
    S.busy = true;
    renderTransport(); jamDisplay(); jamTransport();
    HE.audio.play(r, source, { countIn: S.countIn }).then(function (res) {
      S.busy = false;
      if (res && r === G.round) {
        r.bars = res.bars;
        r.map = heardMap(r, res);
        jamDisplay();
        if (G.playOpen) { renderPlay(); }
        wake(true); tick();
      }
      jamTransport();
    }).catch(function () {
      S.busy = false;
      var recorded = (r.chord && r.chord.source === 'file') || (r.drum && r.drum.source === 'file');
      if (recorded && how !== 'again' && r === G.round) {
        toHouse(r, { sound: HE.synth.soundFor(r.feel), playing: G.playing, take: 0, kit: jamKits()[0] || '', groove: G.groove % HE.synth.GROOVES });
        jamSay('The recording wouldn’t load, so the house band is playing this.');
        jamStart('again');
        return;
      }
      jamSay('That loop wouldn’t load.');
      jamTransport();
    });
  }

  /* ---------- the Guide: Play (the note menu on the neck, a line to play, a reference bass) ---------- */

  // lbs-bass.js draws the notation and the fretboard. It is fetched the first time "Play" is opened, not with the page.
  var bassWaiting = null;
  function needBass(then) {
    if (window.LBSBass) { then(); return; }
    if (bassWaiting) { bassWaiting.push(then); return; }
    bassWaiting = [then];
    var tag = document.createElement('script');
    tag.src = CFG.bass; tag.async = true;
    tag.onload = function () { var list = bassWaiting || []; bassWaiting = null; list.forEach(function (f) { f(); }); };
    tag.onerror = function () {
      bassWaiting = null;
      var body = $('j-play-body');
      if (body) { body.innerHTML = '<p class="he-small">The notation couldn’t be fetched. Check your connection and open this again.</p>'; }
    };
    document.head.appendChild(tag);
  }
  // How many strings the pupil's bass has. One answer for the whole site (the ear trainer asks the same thing).
  function strings() {
    var n = 4;
    try { n = +window.localStorage.getItem('lbs.strings') || 4; } catch (e) { n = 4; }
    return n === 5 || n === 6 ? n : 4;
  }
  function setStrings(n) { try { window.localStorage.setItem('lbs.strings', String(n)); } catch (e) { /* it just isn't kept */ } }

  // Where on the neck a tone centre is played from: the lowest place that puts home on the E or the A string.
  // Five frets are shown, starting one below home. "base" is the E string's note at the bottom of them.
  function jamWindow(keyPc) {
    var onE = (keyPc - 4 + 12) % 12, onA = (keyPc - 9 + 12) % 12;
    var from = Math.max(0, (onE <= 5 ? onE : onA) - 1);
    return { from: from, to: from + 4, base: 28 + from };
  }

  var DEG_SEMI = { '1': 0, '#1': 1, 'b2': 1, '2': 2, 'b3': 3, '3': 4, '4': 5, '#4': 6, 'b5': 6, '5': 7, '#5': 8, 'b6': 8, '6': 9, 'b7': 10, '7': 11 };
  // The two ways an open degree can go (a degree the chords leave alone).
  var OPEN_WAYS = { 1: ['1'], 2: ['b2', '2'], 3: ['b3', '3'], 4: ['4', '#4'], 5: ['5'], 6: ['b6', '6'], 7: ['b7', '7'] };
  // Every note under the hand that belongs: fixed by the chords (solid), open (a ring), or in the chord sounding now (lit).
  function jamMarks(r, lit) {
    var d = HE.degrees(r.el, r.voicing), bySemi = {}, marks = [];
    d.open.forEach(function (n) { OPEN_WAYS[n].forEach(function (deg) { bySemi[DEG_SEMI[deg]] = { label: DEG_SHOW[deg], kind: 'open' }; }); });
    d.fixed.forEach(function (deg) { bySemi[DEG_SEMI[deg]] = { label: DEG_SHOW[deg], kind: 'solid' }; });
    if (lit >= 0) {
      var c = HE.sequence(r.el, r.keyPc, r.voicing)[lit];
      if (c) { HE.QUAL[c.qual].tones.forEach(function (t) { var semi = ((c.pc - r.keyPc + t) % 12 + 12) % 12; if (bySemi[semi]) { bySemi[semi] = { label: bySemi[semi].label, kind: 'lit' }; } }); }
    }
    var w = jamWindow(r.keyPc);
    window.LBSBass.tuning(strings()).forEach(function (open, s) {
      for (var f = w.from; f <= w.to; f++) {
        var m = bySemi[((open + f - r.keyPc) % 12 + 12) % 12];
        if (m) { marks.push({ string: s, fret: f, label: m.label, kind: m.kind }); }
      }
    });
    return marks;
  }
  function playWidth() {
    var body = $('j-play-body');
    return Math.max(260, Math.min(720, (body && body.clientWidth) || 320));
  }
  // Light the chord that is sounding (-1 for none) on the fretboard.
  function jamLit(chord) {
    G.lit = chord;
    var box = $('j-fb'), r = G.round;
    if (!box || !r || !window.LBSBass || !G.playOpen) { return; }
    var w = jamWindow(r.keyPc);
    box.innerHTML = window.LBSBass.fretboard({
      strings: strings(), from: w.from, to: w.to, marks: jamMarks(r, chord), width: playWidth(),
      title: 'The neck from fret ' + w.from + ' to fret ' + w.to + ', with the notes ' + r.el.roman + ' fixes and the ones it leaves open'
    });
  }

  // One pass of the loop as the chords that sound in it, in order: [{chord, beat, beats}].
  function segments(r) {
    var out = [], beat = 0;
    if (isForm(r)) {
      HE.sequence(r.el, r.keyPc, r.voicing).forEach(function (c, i) { out.push({ chord: i, beat: beat, beats: c.bars * 4 }); beat += c.bars * 4; });
      return out;
    }
    barMap(r).forEach(function (i, b) {
      var last = out[out.length - 1];
      if (last && last.chord === i) { last.beats += 4; } else { out.push({ chord: i, beat: b * 4, beats: 4 }); }
    });
    return out;
  }

  /*
   * The lines of the course's note menu that can be written out for any element.
   * The vertical ladder goes chord by chord (levels 0 to 4); the horizontal ladder plays
   * one degree of every chord across the whole element.
   */
  var LINES = [
    ['roots', 'Level 0. Roots, in long notes', 0], ['pulse', 'Level 1. Roots, in time', 0], ['r58', 'Level 2. Root, fifth and octave', 0],
    ['r35', 'Level 3. The triad', 0], ['r357', 'Level 4. The chord spelled, with its seventh', 0],
    ['thirds', 'All the thirds', 1], ['fifths', 'All the fifths', 1], ['sevenths', 'All the sevenths', 1]
  ];
  function jamLines(r) {
    var seq = HE.sequence(r.el, r.keyPc, r.voicing);
    var some = seq.some(function (c) { return HE.QUAL[c.qual].tones.length > 3; }), every = seq.every(function (c) { return HE.QUAL[c.qual].tones.length > 3; });
    return LINES.filter(function (l) { return l[0] === 'r357' ? some : l[0] === 'sevenths' ? every : true; });
  }
  // What a note is to its chord, by how far above the root it is.
  var CHORD_MEMBER = { 0: 'R', 1: '♭2', 2: '2', 3: '♭3', 4: '3', 5: '4', 6: '♭5', 7: '5', 8: '♯5', 9: '6', 10: '♭7', 11: '7', 12: '8' };

  // The chosen line for this loop: {inTime, notes: [{midi, name, label, chord, bar, beat, len}]}, one pass long.
  function jamLine(r) {
    var B = window.LBSBass, kind = G.line, seq = HE.sequence(r.el, r.keyPc, r.voicing);
    var degs = HE.chordDegrees(r.el, r.voicing), spelled = HE.spell(r.el, r.keyPc, r.voicing);
    var w = jamWindow(r.keyPc), low = B.tuning(strings())[0], top = w.base + 21;
    var inTime = kind === 'pulse' || kind === 'r58' || kind === 'r35' || kind === 'r357';
    var notes = [], last = null;
    // the root of a chord: the first one at or above the bottom of the hand, or the octave below when that is in reach
    function rootOf(pc) {
      var m = w.base + ((pc - w.base) % 12 + 12) % 12;
      if (m > w.base + 7 && m - 12 >= low) { m -= 12; }
      return m;
    }
    function add(seg, c, tone, beat, len, first) {
      var tones = HE.QUAL[c.qual].tones, octave = tone === -1, i = octave ? 0 : Math.min(tone, tones.length - 1);
      var above = octave ? 12 : tones[i] % 12, midi = rootOf(c.pc) + above;
      if (!inTime && kind !== 'roots') {
        // the horizontal ladder: each note as near the last as it can be, to show how little there is to move
        if (last === null) { if (midi > w.base + 19) { midi -= 12; } }
        else { while (midi - last > 6) { midi -= 12; } while (last - midi > 6) { midi += 12; } }
        while (midi < low) { midi += 12; }
        while (midi > top) { midi -= 12; }
      }
      last = midi;
      var label = octave ? '8' : CHORD_MEMBER[above] || '';
      if (c.qual === 'dim7' && above === 9) { label = '°7'; }
      notes.push({
        midi: midi, name: B.spell(spelled.tonic, degs[seg.chord][i]).name, label: label,
        chord: first ? spelled.chords[seg.chord].name : '', bar: first && beat % 4 === 0 && beat > 0,
        beat: beat, len: len
      });
    }
    segments(r).forEach(function (seg) {
      var c = seq[seg.chord], k;
      if (kind === 'roots') { add(seg, c, 0, seg.beat, seg.beats - 0.15, true); return; }
      if (!inTime) { add(seg, c, kind === 'thirds' ? 1 : kind === 'fifths' ? 2 : 3, seg.beat, seg.beats - 0.15, true); return; }
      var seventh = HE.QUAL[c.qual].tones.length > 3 ? 3 : 1;
      var shape = kind === 'pulse' ? [0, 0, 0, 0] : kind === 'r58' ? [0, 2, -1, 2] : kind === 'r35' ? [0, 1, 2, 1] : [0, 1, 2, seventh];
      for (k = 0; k < seg.beats; k++) { add(seg, c, shape[k % 4], seg.beat + k, 0.92, k === 0); }
    });
    return { inTime: inTime, notes: notes };
  }

  // What the reference bass plays under a loop, as a score for the house band (HE.band.score), or null for nothing.
  function bassSpec(r) {
    if (G.bass === 'off' || !window.LBSBass) { return null; }
    var line = jamLine(r);
    if (!line.notes.length) { return null; }
    return {
      bpm: r.bpm,
      // taking turns: it plays one pass and leaves the next to the pupil
      bars: G.bass === 'turns' ? r.bars * 2 : r.bars,
      parts: [{ inst: G.voice, strikes: line.notes.map(function (n) { return { beat: n.beat, len: n.len, notes: [n.midi], vel: 0.85 }; }) }]
    };
  }
  // The player asks a source for "more" than chords and drums: here, the reference bass.
  source.more = function (round, c) {
    // the band's bass establishing home in the Dojo (a pedal, or the roots)
    if (round.homeBass) {
      return HE.synth.score(homeBassSpec(round), c).then(function (p) { return [{ name: 'bass', buffer: p.buffer, lead: 0, length: p.length, gain: p.gain }]; });
    }
    if (!round.bassLine) { return null; }
    var learn = Promise.resolve();
    if (round.chord && round.chord.source === 'file' && !(round.map && round.map.length)) {
      // a recording only says how long it is once it has been decoded, and the line has to fit it
      if (!HE.audio.started) { return null; }
      learn = source.chords(round, c).then(function (part) {
        var barDur = 240 / round.bpm;
        if (part && part.length) { round.bars = Math.max(1, Math.round(part.length / barDur)); }
        round.map = heardMap(round, { chords: part, barDur: barDur });
      });
    }
    return learn.then(function () {
      var spec = bassSpec(round);
      if (!spec) { return []; }
      return HE.synth.score(spec, c).then(function (p) { return [{ name: 'bass', buffer: p.buffer, lead: 0, length: p.length, gain: p.gain }]; });
    });
  };

  // A stage's featured drill, in the course's words (each stage's closing page gives it).
  function featured(stage) {
    var st = GUIDE.stages.filter(function (x) { return x.n === stage; })[0];
    var m = st && /<b>Featured drill\.<\/b>\s*([\s\S]*?)<\/p>/.exec(st.closing || '');
    return m ? m[1] : '';
  }

  var BASS_WAYS = [['off', 'Off'], ['on', 'Plays the line'], ['turns', 'Takes turns with you']];
  var BASS_NOTE = {
    off: 'The bass is yours. Switch this on to hear the line played, in time with the loop.',
    on: 'The line is played every time round. Play along with it, then switch it off and play it alone.',
    turns: 'The line is played one time round and left out the next: that pass is yours.'
  };
  function renderPlay() {
    var body = $('j-play-body'), r = G.round;
    if (!body || !r || !G.playOpen) { return; }
    if (!window.LBSBass) {
      body.innerHTML = '<p class="he-small">Fetching the notation.</p>';
      needBass(renderPlay);
      return;
    }
    var B = window.LBSBass, n = strings(), lines = jamLines(r);
    if (!lines.some(function (l) { return l[0] === G.line; })) { G.line = 'roots'; }
    var line = jamLine(r), drill = featured(r.el.stage), tonic = HE.spell(r.el, r.keyPc, r.voicing).tonic;
    // a long form written out in time would run to pages: the first sixteen bars are shown, and all of it is played
    var shown = line.notes.filter(function (x) { return !line.inTime || x.beat < 64; });
    var w = jamWindow(r.keyPc);
    var placed = B.place(shown.map(function (x) { return x.midi; }), { strings: n, around: w.from, open: w.from === 0, span: 5 });
    var picture = shown.map(function (x, i) {
      var note = { midi: x.midi, name: x.name, label: x.label, chord: x.chord, bar: x.bar };
      if (placed.every(Boolean)) { note.string = placed[i].string; note.fret = placed[i].fret; }
      return note;
    });
    var group = function (which) { return lines.filter(function (l) { return l[2] === which; }).map(function (l) { return option(l[0], l[1], G.line === l[0]); }); };
    body.innerHTML =
      (drill ? '<p class="he-small"><b>Stage ' + r.el.stage + '’s featured drill.</b> ' + drill + '</p>' : '') +
      '<div class="he-set"><p class="he-kicker">Strings on your bass</p><div class="he-togs">' +
        [4, 5, 6].map(function (k) { return tog('data-jstrings="' + k + '"', String(k), n === k); }).join('') + '</div></div>' +
      '<div class="he-set"><p class="he-kicker">The note menu, with ' + esc(tonic) + ' as home</p><div class="he-fb" id="he-j-fb"></div>' +
        '<p class="he-small">Solid: fixed by the chords. Ring: open, so the choice is yours. Orange: in the chord that is sounding.</p></div>' +
      '<div class="he-set">' + field('A line to play', 'line', options('The vertical ladder: chord by chord', group(0)) + options('The horizontal ladder: one degree of every chord', group(1))) +
        '<div class="he-stave" id="he-j-stave"></div>' +
        (shown.length < line.notes.length ? '<p class="he-small">The first sixteen bars are written out. The reference bass plays the whole form.</p>' : '') + '</div>' +
      '<div class="he-set"><p class="he-kicker">Reference bass</p><div class="he-togs">' +
        BASS_WAYS.map(function (v) { return tog('data-jbass="' + v[0] + '"', v[1], G.bass === v[0]); }).join('') + '</div>' +
        '<p class="he-small">' + BASS_NOTE[G.bass] + '</p>' +
        (G.bass === 'off' ? '' : '<div class="he-jam-row">' + field('Played on', 'voice', HE.band.BASSES.map(function (v) { return option(v.id, v.name, G.voice === v.id); }).join('')) + '</div>' + fader('bass', 'Bass')) +
      '</div>';
    $('j-stave').innerHTML = B.stave(picture, {
      strings: n, meter: line.inTime ? [4, 4] : null, width: playWidth(), around: w.from, open: w.from === 0, span: 5,
      title: 'Bass clef and TAB: ' + lines.filter(function (l) { return l[0] === G.line; })[0][1].replace(/^Level \d\. /, '') + ' for ' + r.el.roman + ' with ' + tonic + ' as home'
    });
    jamLit(G.lit);
    syncLevels();
  }
  // The drawings are made to fit the width there is, so they are made again when that changes.
  var playResize = 0;
  window.addEventListener('resize', function () {
    window.clearTimeout(playResize);
    playResize = window.setTimeout(function () { if (S.view === 'guide' && G.playOpen && G.round && window.LBSBass) { renderPlay(); } }, 200);
  });

  /* ---------- starting up ---------- */

  // Begin with whatever loops are known. If the list of recordings turns up after the
  // trainer has started with the synth alone, they join in from the next loop.
  function begin(list) {
    var first = !S.ready;
    setLibrary(list);
    S.stamp++;
    S.mix = S.hadMix ? HE.trainer.cleanMix(first ? saved.mix : S.mix, library) : HE.trainer.defaultMix(library);
    S.ready = true;
    $('go').disabled = false;
    renderModes();
    renderMix();
    renderRecord();
    renderNote();
    if (first || !S.round || !S.round.played) { newRound(); } else { renderBehind(); }
    if (first) {
      flush();
      // Start where the address says, or where this visitor was last, or in the Guide.
      if (!route()) { showView(saved.view === 'guide' ? 'guide' : 'dojo'); if (S.view === 'guide') { openGuide('', false); } }
    } else if (GUIDE) {
      // the recordings have arrived: the Guide's player can offer them
      jamSetup();
      renderJam();
    }
  }

  $('go').disabled = true;
  if (!CFG.list || !window.fetch) {
    begin([]);
  } else {
    say('Fetching the loops.');
    var waited = window.setTimeout(function () { if (!S.ready) { begin([]); } }, 5000);
    window.fetch(CFG.list, { credentials: 'same-origin' }).then(function (res) {
      if (!res.ok) { throw new Error('no-list'); }
      return res.json();
    }).then(function (data) {
      window.clearTimeout(waited);
      S.listed = true;
      var late = S.ready;
      begin(data && Array.isArray(data.files) ? data.files : []);
      if (late && HAS_RECORDED && !$('status').textContent) { say('The recorded loops have arrived. They join in from the next loop.'); }
    }).catch(function () {
      window.clearTimeout(waited);
      S.listed = false;
      if (!S.ready) { begin([]); } else { renderNote(); }
    });
  }
}());
