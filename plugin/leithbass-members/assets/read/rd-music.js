/* Read · the theory under everything the Read room draws or asks.
   Pure: no DOM, no sound. It runs in the browser as window.RDM and in Node for the tests.

   Pitches are written pitch, as a bassist reads them. A bass guitar sounds an octave below
   what is written, so the open E string is written E2 (first ledger line under the bass
   clef) and sounds E1. Everything here works in written pitch; only the microphone and the
   sound engine add or take away the octave, and they say so where they do.

   A pitch is a string such as "C3", "F#2", "Bb3", "Ebb3" or "F##2". */
(function (root) {
  'use strict';

  var LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  var LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var SHARP = '♯', FLAT = '♭', NATURAL = '♮';

  /* ---------- pitch ---------- */

  function parse(p) {
    if (p && typeof p === 'object') return p;
    var m = /^([A-Ga-g])(##|bb|#|b|x)?(-?\d)$/.exec(String(p).trim());
    if (!m) return null;
    var L = m[1].toUpperCase();
    var acc = m[2] || '';
    var a = acc === '#' ? 1 : acc === '##' || acc === 'x' ? 2 : acc === 'b' ? -1 : acc === 'bb' ? -2 : 0;
    var o = parseInt(m[3], 10);
    var li = LETTERS.indexOf(L);
    return { L: L, a: a, o: o, li: li, step: o * 7 + li, midi: 12 * (o + 1) + LETTER_PC[L] + a, pc: (((LETTER_PC[L] + a) % 12) + 12) % 12 };
  }

  function accStr(a) { return a === 1 ? '#' : a === 2 ? '##' : a === -1 ? 'b' : a === -2 ? 'bb' : ''; }
  function accPretty(a) { return a === 1 ? SHARP : a === 2 ? 'x' : a === -1 ? FLAT : a === -2 ? FLAT + FLAT : ''; }

  function make(L, a, o) { return L + accStr(a) + o; }
  function str(p) { p = parse(p); return p ? make(p.L, p.a, p.o) : ''; }

  /* "C♯", with or without the octave. */
  function pretty(p, withOctave) {
    p = parse(p); if (!p) return '';
    return p.L + accPretty(p.a) + (withOctave ? p.o : '');
  }
  function letterName(p) { p = parse(p); return p ? p.L + accPretty(p.a) : ''; }

  function midi(p) { p = parse(p); return p ? p.midi : null; }
  function step(p) { p = parse(p); return p ? p.step : null; }

  /* A pitch from a diatonic step and an alteration. */
  function fromStep(st, a) {
    var o = Math.floor(st / 7), li = ((st % 7) + 7) % 7;
    return make(LETTERS[li], a || 0, o);
  }

  /* Spell a MIDI number. With a key (fifths, -7..7) the key's own notes come first, then
     sharps in sharp keys and flats in flat keys. With prefer 'b' or '#' it is forced. */
  function fromMidi(m, opts) {
    opts = opts || {};
    var pc = ((m % 12) + 12) % 12;
    var key = opts.key == null ? 0 : opts.key;
    var acc = keyAccidentals(key);
    var best = null;
    for (var i = 0; i < 7; i++) {
      var L = LETTERS[i];
      if (pc === (LETTER_PC[L] + (acc[L] || 0) + 12) % 12) { best = { L: L, a: acc[L] || 0 }; break; }
    }
    if (!best) {
      var preferFlat = opts.prefer ? opts.prefer === 'b' : key < 0;
      for (var j = 0; j < 7; j++) {
        var L2 = LETTERS[j], d = ((pc - LETTER_PC[L2]) % 12 + 12) % 12;
        if (d === 0) { best = { L: L2, a: 0 }; break; }
        if (!preferFlat && d === 1) best = best || { L: L2, a: 1 };
        if (preferFlat && d === 11) best = best || { L: L2, a: -1 };
      }
      if (!best) {
        for (var k = 0; k < 7; k++) {
          var L3 = LETTERS[k], d3 = ((pc - LETTER_PC[L3]) % 12 + 12) % 12;
          if (d3 === 1 || d3 === 11) { best = { L: L3, a: d3 === 1 ? 1 : -1 }; break; }
        }
      }
    }
    var o = Math.floor((m - LETTER_PC[best.L] - best.a) / 12) - 1;
    return make(best.L, best.a, o);
  }

  /* Same sound, other names: C#3 and Db3. Single accidentals only unless asked. */
  function enharmonics(p, allowDouble) {
    p = parse(p); var out = [];
    for (var i = 0; i < 7; i++) {
      var L = LETTERS[i];
      for (var a = -2; a <= 2; a++) {
        if (!allowDouble && Math.abs(a) > 1) continue;
        var o = Math.floor((p.midi - LETTER_PC[L] - a) / 12) - 1;
        var q = parse(make(L, a, o));
        if (q && q.midi === p.midi && !(q.L === p.L && q.a === p.a)) out.push(make(L, a, o));
      }
    }
    return out;
  }

  /* ---------- keys ---------- */

  var SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
  var FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
  var MAJOR_BY_FIFTHS = ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
  var MINOR_BY_FIFTHS = ['Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#'];

  function keyAccidentals(fifths) {
    var acc = {};
    if (fifths > 0) for (var i = 0; i < fifths; i++) acc[SHARP_ORDER[i]] = 1;
    if (fifths < 0) for (var j = 0; j < -fifths; j++) acc[FLAT_ORDER[j]] = -1;
    return acc;
  }
  function keyList(fifths) {
    return fifths > 0 ? SHARP_ORDER.slice(0, fifths).map(function (L) { return L + SHARP; })
      : fifths < 0 ? FLAT_ORDER.slice(0, -fifths).map(function (L) { return L + FLAT; }) : [];
  }
  function majorOf(fifths) { return MAJOR_BY_FIFTHS[fifths + 7]; }
  function minorOf(fifths) { return MINOR_BY_FIFTHS[fifths + 7]; }
  function prettyName(n) { return n.replace('#', SHARP).replace('b', FLAT); }
  function keyName(fifths, mode) { return prettyName(mode === 'minor' ? minorOf(fifths) : majorOf(fifths)) + (mode === 'minor' ? ' minor' : ' major'); }
  function fifthsOf(tonic, mode) {
    var list = mode === 'minor' ? MINOR_BY_FIFTHS : MAJOR_BY_FIFTHS;
    var t = String(tonic).replace(SHARP, '#').replace(FLAT, 'b');
    var i = list.indexOf(t);
    return i < 0 ? null : i - 7;
  }

  /* Where a key signature's accidentals sit, as staff steps (C4 = 28). */
  var KEYSIG_STEPS = {
    treble: { sharp: ['F5', 'C5', 'G5', 'D5', 'A4', 'E5', 'B4'], flat: ['B4', 'E5', 'A4', 'D5', 'G4', 'C5', 'F4'] },
    bass: { sharp: ['F3', 'C3', 'G3', 'D3', 'A2', 'E3', 'B2'], flat: ['B2', 'E3', 'A2', 'D3', 'G2', 'C3', 'F2'] }
  };
  function keySigSteps(fifths, clef) {
    var t = KEYSIG_STEPS[clef === 'treble' ? 'treble' : 'bass'];
    var list = fifths >= 0 ? t.sharp.slice(0, fifths) : t.flat.slice(0, -fifths);
    return list.map(function (p) { return parse(p).step; });
  }

  /* The middle line of each clef, as a step: D3 in bass clef, B4 in treble. */
  var CLEF_MID = { bass: parse('D3').step, treble: parse('B4').step };

  /* ---------- intervals ---------- */

  var PERFECT = { 1: 0, 4: 5, 5: 7 };
  var MAJOR = { 2: 2, 3: 4, 6: 9, 7: 11 };
  var QUAL_NAME = { P: 'perfect', M: 'major', m: 'minor', A: 'augmented', d: 'diminished' };
  var NUM_NAME = ['', 'unison', '2nd', '3rd', '4th', '5th', '6th', '7th', 'octave', '9th', '10th', '11th', '12th', '13th'];

  /* The interval from a up to b (or down, if b is lower: then it is measured downwards). */
  function interval(a, b) {
    a = parse(a); b = parse(b);
    var up = b.step >= a.step;
    var lo = up ? a : b, hi = up ? b : a;
    var num = hi.step - lo.step + 1;
    var semis = hi.midi - lo.midi;
    var simple = ((num - 1) % 7) + 1, octs = Math.floor((num - 1) / 7);
    var base = PERFECT[simple] != null ? PERFECT[simple] : MAJOR[simple];
    var diff = semis - octs * 12 - base;
    var q;
    if (PERFECT[simple] != null) q = diff === 0 ? 'P' : diff === 1 ? 'A' : diff === -1 ? 'd' : diff > 1 ? 'AA' : 'dd';
    else q = diff === 0 ? 'M' : diff === -1 ? 'm' : diff === 1 ? 'A' : diff === -2 ? 'd' : diff > 1 ? 'AA' : 'dd';
    return { num: num, simple: simple, quality: q, semis: semis, up: up, code: q + num, name: intervalName(q, num) };
  }
  function intervalName(q, num) {
    var n = num === 8 ? 'octave' : NUM_NAME[num] || (num + 'th');
    if (num === 1 && q === 'P') return 'unison';
    if (num === 8 && q === 'P') return 'octave';
    return (QUAL_NAME[q] || q) + ' ' + n;
  }
  /* Short label as musicians say it on a gig: m3, P5, M7, tritone kept as A4/d5. */
  function intervalShort(code) { return code; }

  /* Move a pitch by an interval code ("m3", "P5", "M10") up or down, spelled correctly. */
  function transpose(p, code, down) {
    p = parse(p);
    var m = /^(AA|dd|P|M|m|A|d)(\d+)$/.exec(code);
    var q = m[1], num = parseInt(m[2], 10);
    var simple = ((num - 1) % 7) + 1, octs = Math.floor((num - 1) / 7);
    var base = PERFECT[simple] != null ? PERFECT[simple] : MAJOR[simple];
    var adj = PERFECT[simple] != null ? { P: 0, A: 1, d: -1, AA: 2, dd: -2 }[q] : { M: 0, m: -1, A: 1, d: q === 'd' ? -2 : -2, AA: 2, dd: -3 }[q];
    var semis = base + adj + octs * 12;
    var st = p.step + (down ? -(num - 1) : num - 1);
    var targetMidi = p.midi + (down ? -semis : semis);
    var o = Math.floor(st / 7), li = ((st % 7) + 7) % 7, L = LETTERS[li];
    var a = targetMidi - (12 * (o + 1) + LETTER_PC[L]);
    return make(L, a, o);
  }

  /* ---------- scales ---------- */

  var SCALES = {
    major: { name: 'major', steps: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'M7'], pattern: 'T T S T T T S' },
    minor: { name: 'natural minor', steps: ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'm7'], pattern: 'T S T T S T T' },
    harmonic: { name: 'harmonic minor', steps: ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'M7'], pattern: 'T S T T S T+S S' },
    melodic: { name: 'melodic minor (rising)', steps: ['P1', 'M2', 'm3', 'P4', 'P5', 'M6', 'M7'], pattern: 'T S T T T T S' },
    majpent: { name: 'major pentatonic', steps: ['P1', 'M2', 'M3', 'P5', 'M6'] },
    minpent: { name: 'minor pentatonic', steps: ['P1', 'm3', 'P4', 'P5', 'm7'] },
    chromatic: { name: 'chromatic' }
  };
  function scale(tonic, type, octaves) {
    var s = SCALES[type || 'major'], out = [];
    octaves = octaves || 1;
    for (var o = 0; o < octaves; o++) {
      for (var i = 0; i < s.steps.length; i++) {
        var code = s.steps[i];
        var num = parseInt(code.slice(code.search(/\d/)), 10) + o * 7;
        out.push(num === 1 ? str(tonic) : transpose(tonic, code.replace(/\d+$/, '') + num));
      }
    }
    out.push(transpose(tonic, 'P' + (7 * octaves + 1)));
    return out;
  }

  /* ---------- chords ---------- */

  var CHORDS = {
    M: { sym: '', name: 'major', iv: ['P1', 'M3', 'P5'] },
    m: { sym: 'm', name: 'minor', iv: ['P1', 'm3', 'P5'] },
    dim: { sym: '°', name: 'diminished', iv: ['P1', 'm3', 'd5'] },
    aug: { sym: '+', name: 'augmented', iv: ['P1', 'M3', 'A5'] },
    sus2: { sym: 'sus2', name: 'sus 2', iv: ['P1', 'M2', 'P5'] },
    sus4: { sym: 'sus4', name: 'sus 4', iv: ['P1', 'P4', 'P5'] },
    '7': { sym: '7', name: 'dominant 7th', iv: ['P1', 'M3', 'P5', 'm7'] },
    M7: { sym: 'maj7', name: 'major 7th', iv: ['P1', 'M3', 'P5', 'M7'] },
    m7: { sym: 'm7', name: 'minor 7th', iv: ['P1', 'm3', 'P5', 'm7'] },
    h7: { sym: 'm7♭5', name: 'half diminished', iv: ['P1', 'm3', 'd5', 'm7'] },
    dim7: { sym: '°7', name: 'diminished 7th', iv: ['P1', 'm3', 'd5', 'd7'] },
    '6': { sym: '6', name: 'major 6th', iv: ['P1', 'M3', 'P5', 'M6'] },
    m6: { sym: 'm6', name: 'minor 6th', iv: ['P1', 'm3', 'P5', 'M6'] }
  };
  /* d7 needs its own semitone count (9): transpose() treats d on a major-class
     interval as two semitones down from major, which is right (11 - 2 = 9). */
  function chord(rootP, qual, inversion) {
    var c = CHORDS[qual || 'M'];
    var notes = c.iv.map(function (code) { return code === 'P1' ? str(rootP) : transpose(rootP, code); });
    for (var i = 0; i < (inversion || 0); i++) notes.push(transpose(notes.shift(), 'P8'));
    return notes;
  }
  function chordSymbol(rootP, qual) { return letterName(rootP) + CHORDS[qual || 'M'].sym; }

  /* A chord symbol read back: "F♯m7" gives {root: 'F#', qual: 'm7'}. Extensions the keys can't
     voice yet (9ths, 13ths) are heard as the seventh chord under them; a slash bass is kept apart. */
  var SYM_QUAL = { '': 'M', maj: 'M', M: 'M', m: 'm', min: 'm', '-': 'm', dim: 'dim', '°': 'dim', o: 'dim', aug: 'aug', '+': 'aug',
    '7': '7', '9': '7', '13': '7', maj7: 'M7', M7: 'M7', 'Δ': 'M7', 'Δ7': 'M7', maj9: 'M7', m7: 'm7', '-7': 'm7', m9: 'm7', m11: 'm7',
    'm7♭5': 'h7', m7b5: 'h7', 'ø': 'h7', 'ø7': 'h7', '°7': 'dim7', dim7: 'dim7', o7: 'dim7', '6': '6', m6: 'm6',
    sus: 'sus4', sus4: 'sus4', sus2: 'sus2', '7sus4': 'sus4', add9: 'M' };
  function parseSymbol(sym) {
    var m = /^([A-G])([♯♭#b]?)([^\/]*)(?:\/([A-G][♯♭#b]?))?$/.exec(String(sym || '').trim());
    if (!m) return null;
    var acc = function (a) { return a === '♯' || a === '#' ? '#' : a === '♭' || a === 'b' ? 'b' : ''; };
    var rest = m[3], qual = SYM_QUAL[rest];
    if (qual === undefined) qual = /^m(?!aj)/.test(rest) ? 'm' : /^(7|9|11|13)/.test(rest) ? '7' : 'M';
    return { root: m[1] + acc(m[2]), qual: qual, bass: m[4] ? m[4].charAt(0) + acc(m[4].charAt(1)) : null };
  }

  /* Triads and sevenths built on each degree of a major or natural minor key. */
  function diatonicChords(tonic, mode, sevenths) {
    var sc = scale(tonic, mode === 'minor' ? 'minor' : 'major');
    sc.pop();
    var out = [];
    for (var i = 0; i < 7; i++) {
      var r = sc[i], t = sc[(i + 2) % 7], f = sc[(i + 4) % 7], s = sc[(i + 6) % 7];
      var third = (midi(t) - midi(r) + 12) % 12, fifth = (midi(f) - midi(r) + 12) % 12, sev = (midi(s) - midi(r) + 12) % 12;
      var q = third === 4 ? (fifth === 8 ? 'aug' : 'M') : (fifth === 6 ? 'dim' : 'm');
      if (sevenths) q = q === 'M' ? (sev === 11 ? 'M7' : '7') : q === 'm' ? 'm7' : q === 'dim' ? (sev === 10 ? 'h7' : 'dim7') : q;
      out.push({ degree: i + 1, root: r, qual: q, symbol: chordSymbol(r, q) });
    }
    return out;
  }
  var ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

  /* ---------- rhythm ---------- */

  /* Durations in quarter-note beats. */
  var DUR = { w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25, '32': 0.125 };
  var DUR_NAME = {
    w: ['whole note', 'semibreve'], h: ['half note', 'minim'], q: ['quarter note', 'crotchet'],
    '8': ['eighth note', 'quaver'], '16': ['sixteenth note', 'semiquaver'], '32': ['32nd note', 'demisemiquaver']
  };
  function beats(dur, dots, tup) {
    var b = DUR[dur], add = b;
    for (var i = 0; i < (dots || 0); i++) { add /= 2; b += add; }
    if (tup) b = b * tup.inSpaceOf / tup.n;
    return b;
  }
  function parseTime(t) {
    if (!t) return null;
    if (t === 'C') return { n: 4, d: 4, sym: 'C' };
    if (t === 'C|') return { n: 2, d: 2, sym: 'C|' };
    var m = /^(\d+)\/(\d+)$/.exec(t);
    return m ? { n: +m[1], d: +m[2] } : null;
  }
  function barBeats(time) { time = parseTime(time) || { n: 4, d: 4 }; return time.n * 4 / time.d; }
  /* The beat the eye groups by: a quarter in 2/4, 3/4 and 4/4; a dotted quarter in 6/8, 9/8, 12/8. */
  function beatUnit(time) {
    time = parseTime(time) || { n: 4, d: 4 };
    if (time.d === 8 && time.n % 3 === 0 && time.n > 3) return 1.5;
    if (time.d === 8) return 0.5;
    if (time.d === 2) return 2;
    return 1;
  }

  /* ---------- the notation string ----------
     A small text format for writing music quickly, used by the Guide's figures and by
     the Dojo's generators. Tokens are separated by spaces:

       E2/h          a pitch and a duration (w h q 8 16 32, or 1 2 4 for w h q); it carries on if left off
       E2/q.         dotted; E2/q.. double dotted
       E2/q~         tied to the next note
       r/h           a rest; r/w on its own fills a bar
       C3+E3+G3/w    a chord
       S/q           a slash (rhythm only, played from the chord symbol)
       {3 E2/8 G2/8 B2/8 }   a triplet
       (E2/8 F#2/8)  a slur (a hammer-on or pull-off on bass)
       C3/q=A3       played on the A string at the 3rd fret, for TAB
       E2/q^tea      text under the note (counting, syllables); _ for a space
       E2/q>  E2/q*  E2/q-   accent, staccato, tenuto
       E2/q!         show the accidental even if not needed (a courtesy)
       "Cmaj7"       a chord symbol over the next note
       !p !mf !f     a dynamic under the next note
       |  ||  |]  |:  :|  :|:   barlines (normal, double, final, repeats)
       [1.  [2.      a first or second time bar starts here
       @segno @coda @fine @dc @ds @dsalcoda @dcalfine @tocoda    roadmap marks on this bar
       #A            a rehearsal mark (a boxed letter) at the start of this bar
       R8            a bar that stands for eight bars' rest (a multi-bar rest)
       %             this bar repeats the one before (the simile sign)
       E2/16x        a ghost note (an x head: muted, more feel than pitch)
       E2/q%         a slide from this note into the next
  */
  function parseNotes(src) {
    var toks = String(src || '').trim().split(/\s+/).filter(Boolean);
    var bars = [{ items: [], start: null, end: null, marks: [], volta: null }];
    var cur = bars[0];
    var lastDur = 'q', lastDots = 0, tup = null, tupId = 0, slurOpen = false, pendingSym = null, pendingDyn = null;
    function newBar(endType) {
      cur.end = endType;
      cur = { items: [], start: null, end: null, marks: [], volta: null };
      bars.push(cur);
    }
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (t === '|' || t === '||' || t === '|]' || t === ':|' || t === ':|:') {
        var nb = t === ':|:' ? ':|' : t;
        newBar(nb);
        if (t === ':|:') cur.start = '|:';
        continue;
      }
      if (t === '|:') { if (cur.items.length) newBar('|'); cur.start = '|:'; continue; }
      if (/^\[\d\.$/.test(t)) { cur.volta = parseInt(t.slice(1), 10); continue; }
      if (/^#[A-Z0-9]{1,3}$/.test(t)) { cur.rehearsal = t.slice(1); continue; }
      if (/^R\d+$/.test(t)) { cur.multi = parseInt(t.slice(1), 10); continue; }
      if (t === '%') {
        // the bar sounds like the one before it: its notes are copied, so that timing and playback work, and drawn as the sign
        var prevBar = bars[bars.length - 2] && !cur.items.length ? bars[bars.length - 2] : null;
        if (prevBar) { cur.simile = true; prevBar.items.forEach(function (it) { var c2 = {}; for (var k2 in it) { c2[k2] = it[k2]; } c2.sym = null; cur.items.push(c2); }); }
        continue;
      }
      if (t.charAt(0) === '@') { cur.marks.push(t.slice(1).toLowerCase()); continue; }
      if (t.charAt(0) === '"') { pendingSym = t.replace(/^"|"$/g, '').replace(/_/g, ' '); continue; }
      if (/^![a-z]+$/.test(t)) { pendingDyn = t.slice(1); continue; }
      if (/^\{\d+$/.test(t)) { tup = { n: parseInt(t.slice(1), 10), inSpaceOf: parseInt(t.slice(1), 10) === 3 ? 2 : 4, id: ++tupId }; continue; }
      if (t === '}') { tup = null; continue; }
      var slurStart = false, slurEnd = false;
      if (t.charAt(0) === '(') { slurStart = true; t = t.slice(1); }
      if (t.charAt(t.length - 1) === ')') { slurEnd = true; t = t.slice(0, -1); }
      var text = null, ti = t.indexOf('^');
      if (ti >= 0) { text = t.slice(ti + 1).replace(/_/g, ' '); t = t.slice(0, ti); }
      var pos = null, pi = t.indexOf('=');
      if (pi >= 0) { var pm = /^([BEADGC])(\d+)$/.exec(t.slice(pi + 1)); if (pm) pos = { s: pm[1], f: parseInt(pm[2], 10) }; t = t.slice(0, pi); }
      var art = [];
      while (/[>*\-!~x%]$/.test(t)) {
        var c = t.charAt(t.length - 1);
        art.push(c === '>' ? 'accent' : c === '*' ? 'staccato' : c === '-' ? 'tenuto' : c === '!' ? 'courtesy' : c === 'x' ? 'ghost' : c === '%' ? 'slide' : 'tie');
        t = t.slice(0, -1);
      }
      var tie = art.indexOf('tie') >= 0, courtesy = art.indexOf('courtesy') >= 0, ghost = art.indexOf('ghost') >= 0, slide = art.indexOf('slide') >= 0;
      art = art.filter(function (x) { return x !== 'tie' && x !== 'courtesy' && x !== 'ghost' && x !== 'slide'; });
      var dm = /^(.*?)(?:\/(w|h|q|1|2|4|8|16|32)(\.{0,2}))?$/.exec(t);
      if (dm[2]) { dm[2] = { '1': 'w', '2': 'h', '4': 'q' }[dm[2]] || dm[2]; }
      var head = dm[1], dur = dm[2] || lastDur, dots = dm[2] ? dm[3].length : lastDots;
      lastDur = dur; lastDots = dots;
      var item = { dur: dur, dots: dots, tie: tie, art: art, text: text, pos: pos, tup: tup ? { n: tup.n, inSpaceOf: tup.inSpaceOf, id: tup.id } : null };
      if (ghost) { item.ghost = true; }
      if (slide) { item.slide = true; }
      if (head === 'r') { item.rest = true; }
      else if (head === 'S') { item.slash = true; item.pitches = []; }
      else {
        item.pitches = head.split('+').map(function (p) { var q = parse(p); if (!q) throw new Error('Read: bad pitch "' + p + '" in "' + src + '"'); return str(q); });
        item.courtesy = courtesy;
      }
      if (slurStart) { item.slurStart = true; slurOpen = true; }
      if (slurEnd && slurOpen) { item.slurEnd = true; slurOpen = false; }
      if (pendingSym) { item.sym = pendingSym; pendingSym = null; }
      if (pendingDyn) { item.dyn = pendingDyn; pendingDyn = null; }
      item.beats = beats(dur, dots, item.tup);
      cur.items.push(item);
    }
    if (!cur.items.length && bars.length > 1 && !cur.marks.length && !cur.multi && !cur.rehearsal) bars.pop();
    return bars;
  }

  /* Write bars back into the notation string (used by generators). */
  function noteToken(n) {
    var head = n.rest ? 'r' : n.slash ? 'S' : n.pitches.join('+');
    return head + '/' + n.dur + (n.dots ? new Array(n.dots + 1).join('.') : '') + (n.tie ? '~' : '');
  }

  /* ---------- the bass neck ---------- */

  /* Open strings in written pitch, lowest first. */
  var TUNINGS = {
    4: ['E2', 'A2', 'D3', 'G3'],
    5: ['B1', 'E2', 'A2', 'D3', 'G3'],
    6: ['B1', 'E2', 'A2', 'D3', 'G3', 'C4']
  };
  function strings(n) { return TUNINGS[n || 4].slice(); }
  function stringName(open) { return parse(open).L; }

  /* Every place a written pitch lives, between two frets. */
  function positions(p, opts) {
    opts = opts || {};
    var m = midi(p), out = [], tun = strings(opts.strings || 4);
    var lo = opts.minFret || 0, hi = opts.maxFret == null ? 12 : opts.maxFret;
    tun.forEach(function (open, si) {
      var f = m - midi(open);
      if (f >= lo && f <= hi) out.push({ s: si, string: stringName(open), f: f });
    });
    return out;
  }
  function atFret(si, f, opts) {
    opts = opts || {};
    var open = strings(opts.strings || 4)[si];
    return fromMidi(midi(open) + f, opts);
  }

  /* Fingering a line: choose a place for each note, and where the hand sits, so that it moves
     as little as possible. The hand covers four frets, a finger for each (finger per fret), and
     sits with its first finger on fret h. A note inside the hand costs nothing to reach; moving
     the hand costs a shift. Open strings don't move the hand, and are welcome low down unless
     o.preferOpen is false. Dynamic programming over every (place, hand) pair. Notes with a
     written position (=A3) keep it. */
  function fingerLine(pitches, opts) {
    opts = opts || {};
    var n = pitches.length; if (!n) return [];
    var opts2 = { strings: opts.strings || 4, maxFret: opts.maxFret == null ? 15 : opts.maxFret };
    var openCost = opts.preferOpen === false ? 0.9 : 0;
    var states = [];   // states[i] = [{c, h, cost, back}]
    for (var i = 0; i < n; i++) {
      var cands = opts.fixed && opts.fixed[i] ? [opts.fixed[i]] : positions(pitches[i], opts2);
      var list = [];
      if (!cands.length) {
        // not on this neck: carry every hand through, with nothing placed
        (i ? states[i - 1] : [{ h: 1, cost: 0 }]).forEach(function (p, k) { list.push({ c: null, h: p.h, cost: p.cost + 50, back: i ? k : -1 }); });
        states.push(list); continue;
      }
      cands.forEach(function (c) {
        var hands = [];
        if (c.f === 0) { hands = i ? states[i - 1].map(function (p) { return p.h; }) : [1]; }
        else { for (var h = Math.max(1, c.f - 3); h <= c.f; h++) hands.push(h); }
        hands.forEach(function (h) {
          var best = Infinity, bk = -1;
          if (!i) { best = 0.03 * h; }
          else {
            states[i - 1].forEach(function (p, k) {
              var shift = p.h === h ? 0 : 1 + 0.6 * Math.abs(p.h - h);
              var cross = p.c ? 0.05 * Math.abs(p.c.s - c.s) : 0;
              // the same note again is read as the same place again
              if (p.c && pitches[i - 1] && midi(pitches[i - 1]) === midi(pitches[i]) && (p.c.s !== c.s || p.c.f !== c.f)) { cross += 0.8; }
              var v = p.cost + shift + cross;
              if (v < best) { best = v; bk = k; }
            });
          }
          list.push({ c: c, h: h, cost: best + (c.f === 0 ? openCost : 0.03 * h), back: bk });
        });
      });
      states.push(list);
    }
    var last = states[n - 1], bi = 0;
    for (var q = 1; q < last.length; q++) if (last[q].cost < last[bi].cost) bi = q;
    var out = new Array(n);
    for (var r = n - 1; r >= 0; r--) { var st = states[r][bi]; out[r] = st.c; bi = st.back; }
    return out;
  }

  /* ---------- small helpers for drills ---------- */

  function rangeOfNaturals(lo, hi) {
    var a = parse(lo).step, b = parse(hi).step, out = [];
    for (var s = a; s <= b; s++) out.push(fromStep(s, 0));
    return out;
  }
  function onLine(p, clef) { var d = parse(p).step - CLEF_MID[clef || 'bass']; return d % 2 === 0; }
  function inStaff(p, clef) { var d = parse(p).step - CLEF_MID[clef || 'bass']; return d >= -4 && d <= 4; }
  function ledgerCount(p, clef) {
    var d = parse(p).step - CLEF_MID[clef || 'bass'];
    if (d > 4) return Math.floor((d - 4) / 2);
    if (d < -4) return Math.floor((-4 - d) / 2);
    return 0;
  }

  var RDM = {
    LETTERS: LETTERS, LETTER_PC: LETTER_PC, SHARP: SHARP, FLAT: FLAT, NATURAL: NATURAL,
    parse: parse, str: str, make: make, pretty: pretty, letterName: letterName, accPretty: accPretty,
    midi: midi, step: step, fromStep: fromStep, fromMidi: fromMidi, enharmonics: enharmonics,
    SHARP_ORDER: SHARP_ORDER, FLAT_ORDER: FLAT_ORDER, keyAccidentals: keyAccidentals, keyList: keyList,
    majorOf: majorOf, minorOf: minorOf, keyName: keyName, prettyName: prettyName, fifthsOf: fifthsOf,
    keySigSteps: keySigSteps, CLEF_MID: CLEF_MID,
    interval: interval, intervalName: intervalName, transpose: transpose, NUM_NAME: NUM_NAME,
    SCALES: SCALES, scale: scale, CHORDS: CHORDS, chord: chord, chordSymbol: chordSymbol, parseSymbol: parseSymbol,
    diatonicChords: diatonicChords, ROMAN: ROMAN,
    DUR: DUR, DUR_NAME: DUR_NAME, beats: beats, parseTime: parseTime, barBeats: barBeats, beatUnit: beatUnit,
    parseNotes: parseNotes, noteToken: noteToken,
    TUNINGS: TUNINGS, strings: strings, positions: positions, atFret: atFret, fingerLine: fingerLine,
    rangeOfNaturals: rangeOfNaturals, onLine: onLine, inStaff: inStaff, ledgerCount: ledgerCount
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = RDM;
  else root.RDM = RDM;
})(typeof window !== 'undefined' ? window : this);
