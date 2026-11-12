#!/usr/bin/env node
// Leith Bass grooves: rhythmic bass notation and TAB, engraved by LilyPond and wrapped in
// the house frame. Use this when the music needs eighths, sixteenths, rests, ties, dotted
// notes, triplets, muted or ghost notes, slides, hammer-ons, pull-offs, double stops, a key
// signature or more than one line. Plain quarter-note scales and pitch studies stay with
// render.js, which aligns names and fingers more precisely.
//   node scripts/groove.js <groove.json> [--out-dir dir] [--png] [--scale 2] [--embed-fonts] [--check] [--keep-ly]
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { HOUSE, parsePitch, pitchName, slugify, rasterise, embedFonts, show, signs } = require('./render.js');

const DEFAULT_INSTRUMENT = {
  name: 'standard four-string bass', writtenOctaveOffset: 12,
  strings: [{ name: 'E', openMidi: 28 }, { name: 'A', openMidi: 33 }, { name: 'D', openMidi: 38 }, { name: 'G', openMidi: 43 }],
};
const DURATIONS = { 1: [1, 1], 2: [1, 2], 4: [1, 4], 8: [1, 8], 16: [1, 16] };
// Same scale as render.js: 24 drawing units per staff space. LilyPond's SVG uses one unit
// per staff space, and a staff space at global staff size 20 is 5 pt (1.7639 mm).
const UNIT = HOUSE.staffGap;
const LILY_SPACE_MM = 1.7639;
// Text sizes in LilyPond font-size steps, chosen to match render.js (labels about 1.9 staff
// spaces, TAB digits about 1.8): 2.2 spaces * 2^(step/6).
const LILY_FONT = { label: -1.2, finger: -1.2, tab: -1.6 };
const MAX_EVENTS = 24;

function fail(message) { throw new Error(message); }
function keys(value, allowed, where) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${where} must be an object.`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`${where}: unsupported field ${key}.`);
}
function esc(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
function norm([n, m]) { const g = gcd(n, m) || 1; return [n / g, m / g]; }
function add([a, b], [c, d]) { return norm([a * d + c * b, b * d]); }
function mul([a, b], [c, d]) { return norm([a * c, b * d]); }
function cmp([a, b], [c, d]) { return a * d - c * b; }

function parseDuration(text, where) {
  const m = /^(1|2|4|8|16)(\.?)(t?)$/.exec(String(text));
  if (!m || (m[2] && m[3])) fail(`${where}.duration must be 1, 2, 4, 8 or 16, optionally dotted ("4.") or a triplet ("8t").`);
  let value = DURATIONS[m[1]];
  if (m[2]) value = add(value, [value[0], value[1] * 2]);
  if (m[3]) value = mul(value, [2, 3]);
  return { value, lily: `${m[1]}${m[2]}`, label: `${m[1]}${m[2]}${m[3]}`, triplet: Boolean(m[3]), base: Number(m[1]) };
}

function lilyPitch(parsed) {
  const acc = parsed.accidental === '#' ? 'is' : parsed.accidental === 'b' ? (['a', 'e'].includes(parsed.letter.toLowerCase()) ? 's' : 'es') : '';
  const marks = parsed.octave - 3;
  return `${parsed.letter.toLowerCase()}${acc}${marks > 0 ? "'".repeat(marks) : ','.repeat(-marks)}`;
}

function normalizeInstrument(input) {
  const inst = input || DEFAULT_INSTRUMENT;
  keys(inst, ['name', 'writtenOctaveOffset', 'strings'], 'instrument');
  const strings = inst.strings || DEFAULT_INSTRUMENT.strings;
  if (!Array.isArray(strings) || strings.length < 4 || strings.length > 6) fail('instrument.strings must list four to six strings, low to high.');
  const names = new Set();
  strings.forEach((s, i) => {
    keys(s, ['name', 'openMidi'], `instrument.strings[${i}]`);
    if (!Number.isInteger(s.openMidi) || s.openMidi < 0 || s.openMidi > 127) fail(`instrument.strings[${i}].openMidi must be 0 to 127.`);
    if (names.has(s.name)) fail(`Duplicate string name "${s.name}".`);
    if (i && s.openMidi <= strings[i - 1].openMidi) fail('instrument.strings must be ordered from lowest open pitch to highest.');
    names.add(s.name);
  });
  const offset = inst.writtenOctaveOffset === undefined ? 12 : inst.writtenOctaveOffset;
  if (!Number.isInteger(offset) || offset % 12 !== 0) fail('writtenOctaveOffset must be a whole number of octaves (normally 12) for grooves.');
  return { name: inst.name || DEFAULT_INSTRUMENT.name, writtenOctaveOffset: offset, strings };
}

const KEY_TONICS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];
function validateKey(key) {
  if (key === undefined) return null;
  keys(key, ['tonic', 'mode'], 'key');
  const tonic = String(key.tonic || '').replace(/♭/g, 'b').replace(/♯/g, '#');
  const mode = key.mode || 'major';
  if (!['major', 'minor'].includes(mode)) fail('key.mode must be major or minor.');
  const minorTonics = ['A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#', 'D', 'G', 'C', 'F', 'Bb', 'Eb', 'Ab'];
  if (!(mode === 'major' ? KEY_TONICS : minorTonics).includes(tonic)) fail(`key.tonic ${key.tonic} is not a standard ${mode} key.`);
  const p = parsePitch(`${tonic}3`);
  return { tonic, mode, lily: `\\key ${lilyPitch(p).replace(/[',]/g, '')} \\${mode}` };
}

function validateTempo(tempo, ts) {
  if (tempo === undefined) return null;
  const value = typeof tempo === 'number' ? { bpm: tempo } : tempo;
  keys(value, ['bpm', 'beat', 'text'], 'tempo');
  if (!Number.isInteger(value.bpm) || value.bpm < 20 || value.bpm > 320) fail('tempo.bpm must be a whole number from 20 to 320.');
  const beat = value.beat || (ts[1] === 8 && ts[0] % 3 === 0 && ts[0] > 3 ? '4.' : String(ts[1]));
  if (!/^(2|4|8)\.?$/.test(beat)) fail('tempo.beat must be 2, 4 or 8, optionally dotted.');
  if (value.text !== undefined && typeof value.text !== 'string') fail('tempo.text must be text.');
  return { bpm: value.bpm, beat, text: value.text || '' };
}

function validateNote(n, at, ctx) {
  keys(n, ['string', 'fret', 'finger', 'spelling'], at);
  if (!ctx.byName.has(n.string)) fail(`${at}.string references unknown string "${n.string}".`);
  if (!Number.isInteger(n.fret) || n.fret < 0 || n.fret > 24) fail(`${at}.fret must be an integer from 0 to 24.`);
  if (n.finger !== undefined && n.finger !== null && ![1, 2, 3, 4].includes(n.finger)) fail(`${at}.finger must be 1 to 4.`);
  if (n.finger && n.fret === 0) fail(`${at}: an open string cannot have a fretting finger.`);
  const string = ctx.byName.get(n.string);
  const written = string.openMidi + n.fret + ctx.instrument.writtenOctaveOffset;
  if (written > 127) fail(`${at} is outside the MIDI range.`);
  const parsed = parsePitch(n.spelling || pitchName(written, ctx.pref));
  if (parsed.midi !== written) fail(`${at}.spelling is ${n.spelling}, but ${n.string} string fret ${n.fret} is written ${pitchName(written, ctx.pref)}.`);
  return {
    string: n.string, stringNumber: string.number, fret: n.fret, finger: n.finger ?? null, parsed, writtenPitch: parsed.raw,
    soundingPitch: `${parsed.letter}${parsed.accidental}${parsed.octave - ctx.instrument.writtenOctaveOffset / 12}`,
  };
}

const EVENT_KEYS = ['string', 'fret', 'notes', 'duration', 'rest', 'tie', 'finger', 'spelling', 'muted', 'ghost', 'accent', 'staccato', 'slide', 'hammer', 'pull', 'label', 'slash'];

/*
 * Two kinds of figure with no pitches in them (3.2), written in a shorter form and turned into ordinary events
 * here, so every rule below (bars that add up, triplets in threes, ties) checks them as it checks a groove.
 *
 *   show: "rhythm"  one line, for reading rhythm away from pitch. An event needs only a duration (and rest, tie,
 *                   accent, staccato). It is given the lowest open string, which the single line never shows.
 *   show: "chart"   a chord chart: slashes on the stave with chord symbols above. A bar is { "chords": ["Cm7", "F7"] }
 *                   and the chords share the bar's beats equally (one, two or four chords in four four). A bar may
 *                   also give "events" for a written rhythm (kicks), each with a "label" where the chord changes,
 *                   or { "simile": true } for a repeat-the-bar sign. "mark" puts a boxed rehearsal letter over a bar.
 */
function expandShorthand(input) {
  if (!input || !Array.isArray(input.panels) || !['rhythm', 'chart'].includes(input.show)) return input;
  const strings = (input.instrument && input.instrument.strings) || DEFAULT_INSTRUMENT.strings;
  const low = strings[0] && strings[0].name;
  const ts = Array.isArray(input.timeSignature) ? input.timeSignature : [4, 4];
  const pitched = (ev) => (ev && !ev.rest && ev.string === undefined && ev.notes === undefined ? { ...ev, string: low, fret: 0, ...(input.show === 'chart' ? { slash: true } : {}) } : ev);
  return { ...input, panels: input.panels.map((panel, p) => (!panel || !Array.isArray(panel.measures) ? panel : { ...panel, measures: panel.measures.map((measure, m) => {
    const where = `panels[${p}].measures[${m}]`;
    if (!measure || typeof measure !== 'object') return measure;
    if (input.show === 'chart' && (measure.chords !== undefined || measure.simile)) {
      if (measure.events !== undefined) fail(`${where}: give chords (or simile) or events, not both.`);
      const { chords, simile, ...rest } = measure;
      if (simile) {
        if (chords !== undefined) fail(`${where}: a simile bar repeats the bar before, so it has no chords of its own.`);
        if (m === 0) fail(`${where}: the first bar of a panel cannot be a simile bar.`);
        // a whole bar's rest carries the bar's length through the checks; toLily draws the sign in its place
        const whole = ts[0] * (4 / ts[1]);
        const dur = { 4: '1', 3: '2.', 2: '2', 1: '4', 6: '1.', 1.5: '4.' }[whole];
        if (!dur) fail(`${where}: a simile bar is not available in ${ts[0]}/${ts[1]}.`);
        return { ...rest, simile: true, events: [{ rest: true, duration: dur }] };
      }
      if (!Array.isArray(chords) || !chords.length || chords.some((c) => typeof c !== 'string' || !c.trim())) fail(`${where}.chords must list one or more chord symbols.`);
      if (ts[0] % chords.length !== 0) fail(`${where}: ${chords.length} chords cannot share ${ts[0]} beats equally. Write the bar as events with a label where each chord falls.`);
      const each = ts[0] / chords.length;
      return { ...rest, events: Array.from({ length: ts[0] }, (_, beat) => ({ string: low, fret: 0, duration: String(ts[1]), slash: true, ...(beat % each === 0 ? { label: chords[beat / each].trim() } : {}) })) };
    }
    return Array.isArray(measure.events) ? { ...measure, events: measure.events.map(pitched) } : measure;
  }) })) };
}

function validateGroove(raw) {
  const input = expandShorthand(raw);
  keys(input, ['$schema', 'title', 'slug', 'instrument', 'timeSignature', 'key', 'tempo', 'accidentalPreference', 'theme', 'frame', 'show', 'width', 'maxWidth', 'panels'], 'groove');
  if (typeof input.title !== 'string' || !input.title.trim()) fail('title is required.');
  const slug = slugify(input.slug || input.title);
  if (!slug) fail('slug must contain a letter or number.');
  const maxWidth = input.maxWidth === undefined ? 2400 : input.maxWidth;
  if (!Number.isInteger(maxWidth) || maxWidth < 600 || maxWidth > HOUSE.maxWidth) fail(`maxWidth must be an integer from 600 to ${HOUSE.maxWidth}.`);
  const width = input.width === undefined ? 'auto' : input.width;
  if (width !== 'auto' && (!Number.isInteger(width) || width < 600 || width > HOUSE.maxWidth)) fail(`width must be "auto" or an integer from 600 to ${HOUSE.maxWidth}.`);
  const theme = input.theme || 'cream';
  if (!['cream', 'print'].includes(theme)) fail('theme must be cream or print.');
  const frame = input.frame || 'panel';
  if (!['panel', 'plain'].includes(frame)) fail('frame must be panel or plain.');
  const show = input.show || 'both';
  if (!['both', 'notation', 'tab', 'rhythm', 'chart'].includes(show)) fail('show must be both, notation, tab, rhythm or chart.');
  const pref = input.accidentalPreference || 'sharp';
  if (!['sharp', 'flat'].includes(pref)) fail('accidentalPreference must be sharp or flat.');
  if (input.timeSignature === null) fail('Grooves are always metered; use render.js with timeSignature null for pitch studies.');
  const ts = input.timeSignature || [4, 4];
  if (!Array.isArray(ts) || ts.length !== 2 || !Number.isInteger(ts[0]) || ts[0] < 1 || ts[0] > 12 || ![2, 4, 8].includes(ts[1])) {
    fail('timeSignature must be [1 to 12, 2 | 4 | 8]. Grooves are always metered; use render.js with timeSignature null for pitch studies.');
  }
  const key = validateKey(input.key);
  const tempo = validateTempo(input.tempo, ts);
  const barLength = [ts[0], ts[1]];
  const instrument = normalizeInstrument(input.instrument);
  const byName = new Map(instrument.strings.map((s, i) => [s.name, { ...s, number: instrument.strings.length - i }]));
  const ctx = { byName, instrument, pref };
  if (!Array.isArray(input.panels) || !input.panels.length) fail('panels must contain at least one panel.');
  const slugs = new Set();

  const panels = input.panels.map((panel, p) => {
    keys(panel, ['heading', 'slug', 'altText', 'description', 'measures', 'repeat', 'barsPerLine', 'end'], `panels[${p}]`);
    if (panel.end !== undefined && !['bar', 'final'].includes(panel.end)) fail(`panels[${p}].end must be "bar" or "final" (a final double bar).`);
    if (panel.end === 'final' && panel.repeat) fail(`panels[${p}]: a repeated panel ends with its repeat sign, not a final bar.`);
    if (typeof panel.heading !== 'string' || !panel.heading.trim()) fail(`panels[${p}].heading is required.`);
    const pslug = slugify(panel.slug || panel.heading);
    if (!pslug || slugs.has(pslug)) fail(`panels[${p}] needs a unique slug.`);
    slugs.add(pslug);
    if (!Array.isArray(panel.measures) || !panel.measures.length || panel.measures.length > 16) fail(`panels[${p}].measures must contain 1 to 16 bars.`);
    if (panel.repeat !== undefined && typeof panel.repeat !== 'boolean') fail(`panels[${p}].repeat must be true or false.`);
    const barsPerLine = panel.barsPerLine === undefined ? panel.measures.length : panel.barsPerLine;
    if (!Number.isInteger(barsPerLine) || barsPerLine < 1 || barsPerLine > 8) fail(`panels[${p}].barsPerLine must be 1 to 8.`);
    if (panel.measures.length > 4 && panel.barsPerLine === undefined) fail(`panels[${p}] has ${panel.measures.length} bars; set barsPerLine (usually 4) so the figure wraps onto several lines.`);
    const events = [];
    const measures = panel.measures.map((measure, m) => {
      const where = `panels[${p}].measures[${m}]`;
      keys(measure, ['label', 'events', 'incomplete', 'mark', 'simile'], where);
      if (measure.mark !== undefined && (typeof measure.mark !== 'string' || !/^[A-Za-z0-9 ]{1,12}$/.test(measure.mark))) fail(`${where}.mark must be a short rehearsal mark (letters and numbers).`);
      if ((measure.mark !== undefined || measure.simile) && show !== 'chart') fail(`${where}: mark and simile are for charts (show: "chart").`);
      if (measure.label !== undefined && typeof measure.label !== 'string') fail(`${where}.label must be text.`);
      if (measure.incomplete !== undefined && typeof measure.incomplete !== 'boolean') fail(`${where}.incomplete must be boolean.`);
      if (measure.incomplete && m !== 0) fail(`${where}: only the first bar of a panel can be an incomplete pickup.`);
      if (!Array.isArray(measure.events) || !measure.events.length || measure.events.length > MAX_EVENTS) fail(`${where}.events must contain 1 to ${MAX_EVENTS} events.`);
      let total = [0, 1];
      const list = measure.events.map((ev, e) => {
        const at = `${where}.events[${e}]`;
        keys(ev, EVENT_KEYS, at);
        const dur = parseDuration(ev.duration, at);
        total = add(total, dur.value);
        if (ev.label !== undefined && typeof ev.label !== 'string') fail(`${at}.label must be text.`);
        for (const k of ['tie', 'muted', 'ghost', 'accent', 'staccato', 'slide', 'hammer', 'pull']) {
          if (ev[k] !== undefined && typeof ev[k] !== 'boolean') fail(`${at}.${k} must be true or false.`);
        }
        if (ev.slash !== undefined && (ev.slash !== true || show !== 'chart')) fail(`${at}.slash is set by charts and cannot be written by hand.`);
        const base = { duration: dur, measure: m + 1, index: e + 1, label: ev.label || '', slash: ev.slash === true };
        if (ev.rest) {
          for (const k of EVENT_KEYS.filter((x) => !['duration', 'rest', 'label'].includes(x))) if (ev[k] !== undefined) fail(`${at}: a rest cannot have ${k}.`);
          return { ...base, rest: true };
        }
        if (ev.rest !== undefined && ev.rest !== false) fail(`${at}.rest must be true or omitted.`);
        let notes;
        if (ev.notes !== undefined) {
          for (const k of ['string', 'fret', 'finger', 'spelling']) if (ev[k] !== undefined) fail(`${at}: put ${k} inside notes[] for a double stop.`);
          if (!Array.isArray(ev.notes) || ev.notes.length < 2 || ev.notes.length > 4) fail(`${at}.notes must list 2 to 4 notes (a double stop or chord).`);
          notes = ev.notes.map((n, i) => validateNote(n, `${at}.notes[${i}]`, ctx));
          if (new Set(notes.map((n) => n.string)).size !== notes.length) fail(`${at}: each note of a double stop needs its own string.`);
          notes.sort((a, b) => a.parsed.midi - b.parsed.midi);
          for (const k of ['slide', 'hammer', 'pull']) if (ev[k]) fail(`${at}: ${k} is for single notes, not double stops.`);
        } else {
          notes = [validateNote({ string: ev.string, fret: ev.fret, finger: ev.finger, spelling: ev.spelling }, at, ctx)];
        }
        if (ev.muted && ev.ghost) fail(`${at}: a note is either muted or ghosted, not both.`);
        if ([ev.slide, ev.hammer, ev.pull].filter(Boolean).length > 1) fail(`${at}: choose one of slide, hammer or pull.`);
        return { ...base, rest: false, chord: notes.length > 1, notes, tie: ev.tie === true, muted: ev.muted === true, ghost: ev.ghost === true,
          accent: ev.accent === true, staccato: ev.staccato === true, slide: ev.slide === true, hammer: ev.hammer === true, pull: ev.pull === true };
      });
      const c = cmp(total, barLength);
      if (c > 0) fail(`${where} is overfull: its durations add up to ${total[0]}/${total[1]}, but a bar of ${ts[0]}/${ts[1]} holds ${barLength[0]}/${barLength[1]}.`);
      if (c < 0 && !measure.incomplete) fail(`${where} is short: its durations add up to ${total[0]}/${total[1]} of ${barLength[0]}/${barLength[1]}. Mark a genuine pickup incomplete:true.`);
      // triplets: consecutive "t" durations with the same base, in complete groups of three
      let run = [];
      const flush = () => {
        if (!run.length) return;
        if (run.length % 3 !== 0) fail(`${where}: triplet ${run[0].duration.base}ths must come in complete groups of three (found ${run.length}).`);
        for (let i = 0; i < run.length; i += 3) { run[i].tupletStart = true; run[i + 2].tupletEnd = true; }
        run = [];
      };
      for (const ev of list) {
        if (ev.duration.triplet && (!run.length || run[0].duration.base === ev.duration.base)) run.push(ev);
        else { flush(); if (ev.duration.triplet) run.push(ev); }
      }
      flush();
      events.push(...list);
      return { label: measure.label || '', incomplete: measure.incomplete === true, total, events: list, mark: measure.mark || '', simile: measure.simile === true };
    });
    events.forEach((ev, i) => {
      if (ev.rest) return;
      const next = events[i + 1];
      const loc = `panels[${p}] bar ${ev.measure} event ${ev.index}`;
      if (ev.tie) {
        const same = next && !next.rest && next.notes.length === ev.notes.length && next.notes.every((n, k) => n.string === ev.notes[k].string && n.fret === ev.notes[k].fret);
        if (!same) fail(`${loc}: a tie must lead to the same string and fret.`);
        if (ev.muted || next.muted) fail(`${loc}: muted notes cannot be tied.`);
      }
      for (const kind of ['slide', 'hammer', 'pull']) {
        if (!ev[kind]) continue;
        if (!next || next.rest || next.chord || next.notes[0].string !== ev.notes[0].string) fail(`${loc}: a ${kind} must lead to a single note on the same string.`);
        const a = ev.notes[0].fret;
        const b = next.notes[0].fret;
        if (kind === 'slide' && a === b) fail(`${loc}: a slide must change fret.`);
        if (kind === 'hammer' && b <= a) fail(`${loc}: a hammer-on goes to a higher fret on the same string.`);
        if (kind === 'pull' && b >= a) fail(`${loc}: a pull-off goes to a lower fret on the same string.`);
        if (ev.tie) fail(`${loc}: a note cannot be both tied and joined by a ${kind}.`);
      }
    });
    return {
      slug: pslug, heading: panel.heading.trim(), measures, repeat: panel.repeat === true, barsPerLine, end: panel.end || 'bar',
      altText: panel.altText || `${panel.heading.trim()}: ${input.title.trim()}, bass groove in ${ts[0]}/${ts[1]}, ${show === 'tab' ? 'TAB with rhythm' : show === 'notation' ? 'notation' : show === 'rhythm' ? 'rhythm on one line' : show === 'chart' ? 'chord chart' : 'notation and TAB'}.`.replace('bass groove', show === 'rhythm' ? 'rhythm' : show === 'chart' ? 'chart' : 'bass groove'),
      description: panel.description || panel.altText || '',
    };
  });
  return { title: input.title.trim(), slug, width, maxWidth, theme, frame, show, instrument, timeSignature: ts, key, tempo, accidentalPreference: pref, panels };
}

function rgb(hex) { return `(rgb-color ${[1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(4)).join(' ')})`; }

function noteToken(n) {
  // inside a chord, fingering direction comes from fingeringOrientations
  return `${lilyPitch(n.parsed)}\\${n.stringNumber}${n.finger ? `-${n.finger}` : ''}`;
}

function toLily(spec, panel, layout) {
  const acc = HOUSE.accentInk;
  const tuning = spec.instrument.strings.map((s) => lilyPitch(parsePitch(pitchName(s.openMidi + spec.instrument.writtenOctaveOffset, 'sharp')))).join(' ');
  let music = '';
  let pendingSlurClose = false;
  let barCount = 0;
  panel.measures.forEach((measure, m) => {
    if (m === 0 && measure.incomplete) music += `\\partial ${measure.total[1]}*${measure.total[0]} `;
    if (m === 0 && panel.repeat) music += '\\bar ".|:" ';
    if (measure.mark) music += `\\mark \\markup { \\box \\sans \\bold ${JSON.stringify(measure.mark)} } `;
    // A simile bar is engraved as LilyPond's own percent repeat of the bar before it: that bar is wrapped, and
    // the simile bars themselves add nothing but their place in the count.
    let similes = 0;
    while (panel.measures[m + 1 + similes] && panel.measures[m + 1 + similes].simile) similes += 1;
    if (similes && !measure.simile) music += `\\repeat percent ${similes + 1} { `;
    if (!measure.simile)
    measure.events.forEach((ev, e) => {
      let token;
      if (ev.tupletStart) music += `\\tuplet 3/2 { `;
      if (ev.rest) token = `r${ev.duration.lily}`;
      else if (ev.slash || spec.show === 'rhythm') {
        // no pitch is shown: the middle line for a chart's slashes, the one line of a rhythm stave
        token = `d${ev.duration.lily}`;
        if (ev.accent) token += '->';
        if (ev.staccato) token += '-.';
        if (ev.tie) token += '~';
      } else {
        const prefix = ev.muted ? '\\deadNote ' : ev.ghost ? '\\parenthesize ' : '';
        token = ev.chord
          ? `${prefix}<${ev.notes.map((n) => noteToken(n)).join(' ')}>${ev.duration.lily}`
          : `${prefix}${lilyPitch(ev.notes[0].parsed)}${ev.duration.lily}\\${ev.notes[0].stringNumber}${ev.notes[0].finger ? `_${ev.notes[0].finger}` : ''}`;
        if (ev.accent) token += '->';
        if (ev.staccato) token += '-.';
        if (ev.tie) token += '~';
        if (pendingSlurClose) { token += ')'; pendingSlurClose = false; }
        if (ev.slide) token += '\\glissando';
        if (ev.hammer || ev.pull) { token += `(^\\markup { \\sans \\fontsize #-3 "${ev.hammer ? 'H' : 'P'}" }`; pendingSlurClose = true; }
      }
      const label = (e === 0 && measure.label) || ev.label;
      if (label) token += `^\\markup { \\with-color #${rgb(acc)} \\sans \\bold ${JSON.stringify(signs(label))} }`;
      music += `${token} `;
      if (ev.tupletEnd) music += '} ';
    });
    if (similes && !measure.simile) music += '} ';
    barCount += measure.incomplete ? 0 : 1;
    const last = m === panel.measures.length - 1;
    if (last) music += panel.repeat ? '\\bar ":|." ' : panel.end === 'final' ? '\\bar "|." ' : '\\bar "|" ';
    else {
      music += '| ';
      // (a chart's line breaks are in a voice of their own, because a break cannot be written inside a percent repeat)
      if (spec.show !== 'chart' && !measure.incomplete && barCount % panel.barsPerLine === 0) music += '\\break ';
    }
  });
  const lineMm = (layout.lineSpaces * LILY_SPACE_MM).toFixed(2);
  const ragged = layout.ragged ? '##t' : '##f';
  // (the word is set in sans: left in LilyPond's bold serif, the house font swap below took it for TAB digits)
  const tempo = spec.tempo ? `\\tempo ${spec.tempo.text ? `\\markup { \\sans \\bold ${JSON.stringify(signs(spec.tempo.text))} } ` : ''}${spec.tempo.beat} = ${spec.tempo.bpm} ` : '';
  const key = spec.key ? `${spec.key.lily} ` : '';
  const staff = `\\new Staff \\with { \\omit StringNumber fingeringOrientations = #'(down) \\override Fingering.color = #${rgb(acc)} \\override Fingering.font-size = #${LILY_FONT.finger} \\override Fingering.padding = #0.7 \\override Fingering.font-encoding = #'latin1 \\override Fingering.font-family = #'sans \\override Fingering.font-series = #'bold \\override TextScript.font-size = #${LILY_FONT.label} } { \\clef bass \\music }`;
  const tabWith = `stringTunings = \\stringTuning <${tuning}> \\override StaffSymbol.staff-space = #1.75 \\override TabNoteHead.font-size = #${LILY_FONT.tab}`;
  const tabStaff = spec.show === 'tab'
    ? `\\new TabStaff \\with { ${tabWith} \\consists "Fingering_engraver" \\override Fingering.padding = #0.7 \\override Fingering.font-encoding = #'latin1 \\override Fingering.font-family = #'sans \\override Fingering.font-series = #'bold \\override Fingering.color = #${rgb(acc)} \\override Fingering.font-size = #${LILY_FONT.finger} \\override TextScript.font-size = #${LILY_FONT.label} } { \\tabFullNotation \\stemUp \\clef moderntab \\music }`
    : `\\new TabStaff \\with { ${tabWith} } { \\clef moderntab \\music }`;
  const rhythmStaff = `\\new RhythmicStaff \\with { \\omit StringNumber \\omit Fingering } { \\music }`;
  const bar = `s${spec.timeSignature[1]}*${spec.timeSignature[0]}`;
  const chartBreaks = panel.measures.map((_, i) => `${bar}${(i + 1) % panel.barsPerLine === 0 && i < panel.measures.length - 1 ? ' \\break' : ''}`).join(' ');
  const chartStaff = `\\new Staff \\with { \\omit StringNumber \\omit Fingering } << { \\clef bass \\improvisationOn \\music } { ${chartBreaks} } >>`;
  const staves = spec.show === 'rhythm' ? rhythmStaff : spec.show === 'chart' ? chartStaff : spec.show === 'both'
    ? `\\new StaffGroup \\with { systemStartDelimiter = #'SystemStartBar } << ${staff} ${tabStaff} >>`
    : spec.show === 'notation' ? staff : tabStaff;
  return `\\version "2.24.0"
#(set-global-staff-size 20)
\\paper { paper-width = ${(Number(lineMm) + 20).toFixed(2)}\\mm line-width = ${lineMm}\\mm indent = 0 ragged-right = ${ragged} ragged-last = ${ragged}
  system-system-spacing.basic-distance = #14 system-system-spacing.padding = #3
  property-defaults.fonts.serif = "Inter" property-defaults.fonts.sans = "Inter" property-defaults.fonts.typewriter = "DejaVu Sans Mono" }
\\header { tagline = ##f }
music = { \\numericTimeSignature ${key}${tempo}\\time ${spec.timeSignature[0]}/${spec.timeSignature[1]} ${music}}
\\score {
  ${staves}
  \\layout {
    \\context { \\Score \\omit BarNumber
      \\override NonMusicalPaperColumn.line-break-permission = ##f
      \\override SpacingSpanner.base-shortest-duration = #(ly:make-moment 1/16)
      \\override SpacingSpanner.spacing-increment = #1.9
      \\override Glissando.thickness = #2 }
  }
}
`;
}

// Where LilyPond is: on the PATH, or inside the Python package setup.sh falls back to where there is no apt.
let lilyPath = null;
function lilypond() {
  if (lilyPath) return lilyPath;
  if (!spawnSync('lilypond', ['--version']).error) { lilyPath = 'lilypond'; return lilyPath; }
  const py = spawnSync('python3', ['-c', 'import lilypond; print(lilypond.executable())'], { encoding: 'utf8' });
  lilyPath = py.status === 0 && py.stdout.trim() ? py.stdout.trim() : 'lilypond';
  return lilyPath;
}

function engrave(ly) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lbs-ly-'));
  const file = path.join(dir, 'g.ly');
  fs.writeFileSync(file, ly);
  const r = spawnSync(lilypond(), ['-dbackend=svg', '-dcrop', '-dno-point-and-click', '-o', path.join(dir, 'g'), file], { encoding: 'utf8' });
  if (r.error && r.error.code === 'ENOENT') fail('LilyPond is not installed. Run scripts/setup.sh --lilypond (or apt-get install lilypond).');
  const out = path.join(dir, 'g.cropped.svg');
  if (r.status !== 0 || !fs.existsSync(out)) fail(`LilyPond failed:\n${(r.stderr || '').trim()}`);
  const warnings = (r.stderr || '').split('\n').filter((l) => /warning|error/i.test(l) && !/unsupported formats/.test(l));
  if (warnings.length) fail(`LilyPond reported problems, so the output is not trusted:\n${warnings.join('\n')}`);
  const svg = fs.readFileSync(out, 'utf8');
  fs.rmSync(dir, { recursive: true, force: true });
  return svg;
}

function viewBox(lilySvg) {
  const vb = lilySvg.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/);
  if (!vb) fail('Unexpected LilyPond SVG output.');
  return vb.slice(1).map(Number);
}

function frameMetrics(spec) {
  const plain = spec.frame === 'plain';
  const pad = plain ? HOUSE.pad.plain : HOUSE.pad.panel;
  const side = plain ? pad : pad + 26;
  return { plain, pad, side, top: plain ? pad : pad + HOUSE.type.heading + 30 };
}

function panelSvg(spec, panel, lilySvg) {
  const [vx, vy, vw, vh] = viewBox(lilySvg);
  let inner = lilySvg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<style[\s\S]*?<\/style>/, '');
  // House typefaces: TAB digits in DejaVu Sans Mono, markup (chord labels, fingers) in Inter.
  inner = inner.replace(/font-family="serif" font-weight="bold" font-size="([\d.]+)"/g, 'font-family="DejaVu Sans Mono, monospace" font-weight="700" font-size="$1"')
    .replace(/font-family="(serif|sans-serif)"( font-weight="[^"]*")?/g, 'font-family="Inter, Arial, sans-serif" font-weight="600"');
  const paper = spec.theme === 'print' ? '#FFFFFF' : HOUSE.cream;
  // LilyPond paints white boxes behind TAB digits; match them to the panel paper.
  inner = inner.replace(/color="rgb\(100\.0000%, 100\.0000%, 100\.0000%\)"/g, `color="${paper}"`);
  const f = frameMetrics(spec);
  const w = vw * UNIT;
  const h = vh * UNIT;
  const width = Math.ceil(spec.width === 'auto' ? Math.max(w + 2 * f.side, f.plain ? 0 : panel.heading.length * 0.5 * HOUSE.type.heading + 2 * f.side) : spec.width);
  const height = Math.ceil(f.top + h + (f.plain ? f.pad : f.pad + 8));
  const id = `${spec.slug}-${panel.slug}`;
  const frame = f.plain
    ? `<rect x="0" y="0" width="${width}" height="${height}" fill="${paper}"/>`
    : `<rect x="${HOUSE.borderWidth / 2 + 1}" y="${HOUSE.borderWidth / 2 + 1}" width="${width - HOUSE.borderWidth - 2}" height="${height - HOUSE.borderWidth - 2}" rx="${HOUSE.borderRadius}" fill="${paper}" stroke="${HOUSE.orange}" stroke-width="${HOUSE.borderWidth}"/>
  <text x="${f.side}" y="${HOUSE.pad.panel + HOUSE.type.heading * 0.73 + 4}" class="heading">${show(panel.heading)}</text>`;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${id}-title ${id}-desc">
  <title id="${id}-title">${esc(panel.altText)}</title>
  <desc id="${id}-desc">${esc(panel.description)}</desc>
  <style>
    .heading { font-family: 'Oswald', 'Inter', Arial, sans-serif; font-weight: 700; font-size: ${HOUSE.type.heading}px; fill: ${HOUSE.charcoal}; letter-spacing: .4px; }
  </style>
  ${frame}
  <svg x="${f.side}" y="${f.top}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" viewBox="${vx} ${vy} ${vw} ${vh}" color="${HOUSE.charcoal}" style="color:${HOUSE.charcoal}">
${inner}
  </svg>
</svg>
`;
  return { svg, width, height };
}

// Width: "auto" engraves at LilyPond's natural spacing (ragged) and keeps it unless it would
// exceed maxWidth, in which case the line is justified to maxWidth. A fixed width is always
// justified. Notes spaced tighter than 85% of natural are refused as too crowded.
function renderGroove(spec, panel, keepLy) {
  const f = frameMetrics(spec);
  const spacesFor = (units) => (units - 2 * f.side) / UNIT;
  let layout;
  let svg;
  let ly;
  if (spec.width === 'auto') {
    layout = { lineSpaces: spacesFor(HOUSE.maxWidth * 2), ragged: true };
    ly = toLily(spec, panel, layout);
    svg = engrave(ly);
    const natural = viewBox(svg)[2] + 0.5;
    if (natural > spacesFor(spec.maxWidth)) {
      // (a rhythm line or a chart has no TAB digits or fingers to collide, so it can be closed up further)
      if (spacesFor(spec.maxWidth) / natural < (spec.show === 'rhythm' || spec.show === 'chart' ? 0.6 : 0.85)) {
        fail(`Panel "${panel.slug}" needs ${Math.round(natural * UNIT + 2 * f.side)} units at natural spacing, more than maxWidth ${spec.maxWidth}. Set barsPerLine, split the panel, or allow a wider figure.`);
      }
      layout = { lineSpaces: spacesFor(spec.maxWidth), ragged: false };
      ly = toLily(spec, panel, layout);
      svg = engrave(ly);
    } else if (panel.barsPerLine < panel.measures.length) {
      // several lines: justify them all to the widest natural line so bars line up
      layout = { lineSpaces: natural, ragged: false };
      ly = toLily(spec, panel, layout);
      svg = engrave(ly);
    }
  } else {
    layout = { lineSpaces: spacesFor(spec.width), ragged: false };
    ly = toLily(spec, panel, layout);
    svg = engrave(ly);
  }
  const out = panelSvg(spec, panel, svg);
  return { ...out, ly: keepLy ? ly : undefined };
}

function auditEvent(ev) {
  if (ev.rest) return { measure: ev.measure, event: ev.index, rest: true, duration: ev.duration.label };
  const one = (n) => ({ string: n.string, fret: n.fret, finger: n.finger, soundingPitch: n.soundingPitch, writtenPitch: n.writtenPitch });
  const base = { measure: ev.measure, event: ev.index, duration: ev.duration.label, tie: ev.tie, muted: ev.muted };
  for (const k of ['ghost', 'accent', 'staccato', 'slide', 'hammer', 'pull']) if (ev[k]) base[k] = true;
  return ev.chord ? { ...base, notes: ev.notes.map(one) } : { ...base, ...one(ev.notes[0]) };
}

function renderGrooveFiles(spec, outDir, options = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  const panels = spec.panels.map((panel) => {
    const base = `${spec.slug}-${panel.slug}`;
    const r = renderGroove(spec, panel, options.keepLy);
    const svgPath = path.join(outDir, `${base}.svg`);
    fs.writeFileSync(svgPath, options.embedFonts ? embedFonts(r.svg) : r.svg);
    const files = { svg: path.basename(svgPath) };
    if (r.ly) { fs.writeFileSync(path.join(outDir, `${base}.ly`), r.ly); files.ly = `${base}.ly`; }
    if (options.png) {
      rasterise(svgPath, path.join(outDir, `${base}.png`), r.width, options.scale || 1);
      files.png = `${base}.png`;
    }
    return {
      slug: panel.slug, heading: panel.heading, altText: panel.altText, files, dimensions: { width: r.width, height: r.height },
      notes: panel.measures.flatMap((m) => m.events.map(auditEvent)),
    };
  });
  const manifest = { schemaVersion: 2, kind: 'groove', engraver: 'LilyPond', title: spec.title, slug: spec.slug, instrument: spec.instrument, timeSignature: spec.timeSignature, key: spec.key, tempo: spec.tempo, theme: spec.theme, frame: spec.frame, show: spec.show, panels };
  const manifestPath = path.join(outDir, `${spec.slug}-manifest.json`);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { manifest, manifestPath };
}

function main(argv = process.argv.slice(2)) {
  try {
    if (!argv.length || argv.includes('--help')) {
      process.stdout.write('Usage: node scripts/groove.js <groove.json> [--out-dir dir] [--png] [--scale N] [--embed-fonts] [--check] [--keep-ly]\n');
      return;
    }
    const spec = validateGroove(JSON.parse(fs.readFileSync(argv[0], 'utf8')));
    if (argv.includes('--check')) { process.stdout.write(`Valid: ${argv[0]}\n`); return; }
    const o = argv.indexOf('--out-dir');
    const sc = argv.indexOf('--scale');
    const outDir = path.resolve(o > -1 ? argv[o + 1] : 'output');
    const { manifest, manifestPath } = renderGrooveFiles(spec, outDir, {
      png: argv.includes('--png'), embedFonts: argv.includes('--embed-fonts'), keepLy: argv.includes('--keep-ly'), scale: sc > -1 ? Number(argv[sc + 1]) : 1,
    });
    for (const p of manifest.panels) for (const f of Object.values(p.files)) process.stdout.write(`${path.join(outDir, f)}\n`);
    process.stdout.write(`${manifestPath}\n`);
  } catch (error) {
    process.stderr.write(`Error: ${error.message}\n`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();
module.exports = { validateGroove, toLily, renderGrooveFiles, renderGroove, lilyPitch, UNIT };
