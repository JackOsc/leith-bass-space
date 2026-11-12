#!/usr/bin/env node
// Acceptance tests for Leith Bass Notation, following section 6 of the AI handoff
// specification. Run: node scripts/test.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { validateSpec, renderPanel, renderFiles, HOUSE } = require('./render.js');

const glyphs = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'bravura-glyphs.json'), 'utf8')).glyphs;
const SIX = {
  name: 'six-string bass',
  writtenOctaveOffset: 12,
  strings: [
    { name: 'B', openMidi: 23 }, { name: 'E', openMidi: 28 }, { name: 'A', openMidi: 33 },
    { name: 'D', openMidi: 38 }, { name: 'G', openMidi: 43 }, { name: 'C', openMidi: 48 },
  ],
};

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed += 1; process.stdout.write(`  ok   ${name}\n`); }
  catch (error) { failures.push(name); process.stdout.write(`  FAIL ${name}\n       ${error.message}\n`); }
}
function spec(measures, extra = {}) {
  return { title: 'Test', width: 1600, timeSignature: null, panels: [{ heading: 'Test', measures }], ...extra };
}
function notes(s) { return s.panels.flatMap((p) => p.measures.flatMap((m) => m.notes)); }
function rejects(input, pattern) {
  assert.throws(() => { const s = validateSpec(input); s.panels.forEach((p) => renderPanel(s, p)); }, pattern);
}
function svgOf(input) { const s = validateSpec(input); return renderPanel(s, s.panels[0]).svg; }
function noteGroups(svg) { return [...svg.matchAll(/<g class="note"[^>]*>([\s\S]*?)<\/g>/g)].map((m) => m[1]); }
function accidentalIn(group) {
  for (const [name, label] of [['accidentalSharp', 'sharp'], ['accidentalFlat', 'flat'], ['accidentalNatural', 'natural']]) {
    if (group.includes(glyphs[name].path)) return label;
  }
  return '';
}
function noteheadY(group) { return Number(group.match(/<path d="[^"]+" transform="translate\([\d.-]+ ([\d.-]+)\)/g).pop().match(/translate\([\d.-]+ ([\d.-]+)\)/)[1]); }

process.stdout.write('Pitch and transposition\n');
test('open E sounds E1 (MIDI 28), writes E2 (MIDI 40), fret 0 on the bottom TAB line', () => {
  const s = validateSpec(spec([{ notes: [{ string: 'E', fret: 0 }] }]));
  const n = notes(s)[0];
  assert.strictEqual(n.soundingMidi, 28); assert.strictEqual(n.soundingPitch, 'E1');
  assert.strictEqual(n.writtenMidi, 40); assert.strictEqual(n.writtenPitch, 'E2');
  const svg = renderPanel(s, s.panels[0]).svg;
  const lines = [...svg.matchAll(/<line x1="[\d.]+" y1="([\d.]+)" x2="[\d.]+" y2="([\d.]+)" class="music-line"\/>/g)].map((m) => Number(m[1]));
  const bottomTab = Math.max(...lines);
  const digit = svg.match(/y="([\d.]+)" text-anchor="middle" class="tab-number">0</);
  assert.ok(Math.abs(Number(digit[1]) - (bottomTab + (HOUSE.type.tab * 0.73) / 2)) < 0.01, 'digit not centred on the bottom TAB line');
});
test('A string fret 3 sounds C2, writes C3, TAB stays 3', () => {
  const s = validateSpec(spec([{ notes: [{ string: 'A', fret: 3 }] }]));
  const n = notes(s)[0];
  assert.deepStrictEqual([n.soundingPitch, n.writtenPitch, n.fret], ['C2', 'C3', 3]);
  assert.match(renderPanel(s, s.panels[0]).svg, /class="tab-number">3</);
});
test('G string fret 12 sounds G3, writes G4 with three ledger lines', () => {
  const s = validateSpec(spec([{ notes: [{ string: 'G', fret: 12 }] }]));
  const n = notes(s)[0];
  assert.deepStrictEqual([n.soundingPitch, n.writtenPitch], ['G3', 'G4']);
  const svg = renderPanel(s, s.panels[0]).svg;
  assert.strictEqual((svg.match(/class="ledger"/g) || []).length, 3);
  assert.match(svg, /class="tab-number">12</);
});
test('six-string open B and C: sound B0/C3, write B1/C4, six TAB lines', () => {
  const input = spec([{ notes: [{ string: 'B', fret: 0 }, { string: 'C', fret: 0 }] }], { instrument: SIX });
  const s = validateSpec(input);
  const [b, c] = notes(s);
  assert.deepStrictEqual([b.soundingPitch, b.writtenPitch, c.soundingPitch, c.writtenPitch], ['B0', 'B1', 'C3', 'C4']);
  const svg = renderPanel(s, s.panels[0]).svg;
  assert.strictEqual((svg.match(/class="music-line"/g) || []).length, 5 + 6);
});
test('five-string B E A D G yields five TAB lines', () => {
  const five = { ...SIX, name: 'five-string bass', strings: SIX.strings.slice(0, 5) };
  const svg = svgOf(spec([{ notes: [{ string: 'B', fret: 0 }] }], { instrument: five }));
  assert.strictEqual((svg.match(/class="music-line"/g) || []).length, 5 + 5);
});

process.stdout.write('Spelling and accidentals\n');
test('E frets 2,2,1,2 give F#2 F#2 F2 F#2 with sharp, none, natural, sharp', () => {
  const s = validateSpec(spec([{ string: 'E', frets: [2, 2, 1, 2] }]));
  assert.deepStrictEqual(notes(s).map((n) => n.writtenPitch), ['F#2', 'F#2', 'F2', 'F#2']);
  const groups = noteGroups(renderPanel(s, s.panels[0]).svg);
  assert.deepStrictEqual(groups.map(accidentalIn), ['sharp', '', 'natural', 'sharp']);
});
test('F# again after the barline shows its sharp again', () => {
  const groups = noteGroups(svgOf(spec([{ string: 'E', frets: [2, 2] }, { string: 'E', frets: [2] }])));
  assert.deepStrictEqual(groups.map(accidentalIn), ['sharp', '', 'sharp']);
});
test('A fret 2 spelled Cb3 is accepted (MIDI 47) and sits in the C position', () => {
  const s = validateSpec(spec([{ notes: [{ string: 'A', fret: 2, spelling: 'Cb3' }] }, { notes: [{ string: 'A', fret: 3 }] }]));
  assert.strictEqual(notes(s)[0].writtenMidi, 47);
  const groups = noteGroups(renderPanel(s, s.panels[0]).svg);
  assert.strictEqual(noteheadY(groups[0]), noteheadY(groups[1]));
  assert.strictEqual(accidentalIn(groups[0]), 'flat');
});
test('A fret 3 spelled B#2 is accepted (MIDI 48) and sits in the B position', () => {
  const s = validateSpec(spec([{ notes: [{ string: 'A', fret: 3, spelling: 'B#2' }] }, { notes: [{ string: 'A', fret: 2 }] }]));
  assert.strictEqual(notes(s)[0].writtenMidi, 48);
  const groups = noteGroups(renderPanel(s, s.panels[0]).svg);
  assert.strictEqual(noteheadY(groups[0]), noteheadY(groups[1]));
});
test('A fret 3 spelled C2 is rejected as the wrong written octave', () => {
  rejects(spec([{ notes: [{ string: 'A', fret: 3, spelling: 'C2' }] }]), /spelling is C2/);
});
test('Unicode accidentals are normalised (B♭2, C♯3)', () => {
  const s = validateSpec(spec([{ notes: [{ string: 'A', fret: 1, spelling: 'B♭2' }, { string: 'A', fret: 4, spelling: 'C♯3' }] }]));
  assert.deepStrictEqual(notes(s).map((n) => n.writtenPitch), ['Bb2', 'C#3']);
});
test('Bbm to Bb7 example: Db3 becomes D3 natural, root stays Bb', () => {
  const s = validateSpec(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'examples', 'bbm-bb7.json'), 'utf8')));
  const [m1, m2] = s.panels[0].measures;
  assert.deepStrictEqual(m1.notes.map((n) => n.writtenPitch), ['Bb2', 'Db3', 'F3']);
  assert.deepStrictEqual(m2.notes.map((n) => n.writtenPitch), ['Bb2', 'D3', 'F3', 'Ab3']);
});

test('courtesy flag shows a natural the barline would otherwise hide', () => {
  const plain = noteGroups(svgOf(spec([{ string: 'A', frets: [4] }, { string: 'A', frets: [5] }])));
  const polite = noteGroups(svgOf(spec([{ string: 'A', frets: [4], spellings: ['Db3'] }, { string: 'A', frets: [5], courtesy: [true] }])));
  assert.deepStrictEqual(plain.map(accidentalIn), ['sharp', '']);
  assert.deepStrictEqual(polite.map(accidentalIn), ['flat', 'natural']);
  rejects(spec([{ notes: [{ string: 'A', fret: 5, courtesy: 'yes' }] }]), /courtesy must be true or false/);
});

process.stdout.write('Case, text and meter\n');
test('chord labels Bb7 and Em keep their exact case', () => {
  const svg = svgOf(spec([{ label: 'Bb7', notes: [{ string: 'A', fret: 1 }] }, { label: 'Em', notes: [{ string: 'E', fret: 0 }] }]));
  assert.match(svg, />B\u266D7</); assert.match(svg, />Em</);
  assert.doesNotMatch(svg, /text-transform/);
});
test('flats and sharps are shown as real signs in labels, and words are left alone (3.1)', () => {
  const { signs } = require('./render.js');
  const cases = { 'Bb': 'B\u266D', 'Bbm': 'B\u266Dm', 'Bbmaj7 to Eb7': 'B\u266Dmaj7 to E\u266D7', 'F#m': 'F\u266Fm', 'Gb, not F#': 'G\u266D, not F\u266F', 'Ab major': 'A\u266D major',
    'Abbey Road': 'Abbey Road', 'Absolutely': 'Absolutely', 'Ebony': 'Ebony', 'TAB': 'TAB', 'Add9': 'Add9', 'Bbb': 'B\u266D\u266D', 'Eb/G': 'E\u266D/G', 'B\u266D already': 'B\u266D already' };
  for (const [from, to] of Object.entries(cases)) assert.strictEqual(signs(from), to, from);
  const svg = svgOf(spec([{ label: 'Gbmaj7', notes: [{ string: 'E', fret: 2, spelling: 'Gb2' }] }], { noteNames: true }));
  assert.match(svg, />G\u266Dmaj7</); assert.match(svg, /class="note-name">G\u266D</);
  // the two sign fonts hold the three signs and nothing that could stand in for a letter
  const out = require('child_process').spawnSync('python3', ['-c', "from fontTools.ttLib import TTFont;import sys;print([sorted(TTFont(f).getBestCmap()) for f in sys.argv[1:]])", path.join(__dirname, '../assets/fonts/lbs-signs-400.ttf'), path.join(__dirname, '../assets/fonts/lbs-signs-600.ttf')], { encoding: 'utf8' });
  if (out.status === 0) assert.strictEqual(out.stdout.trim(), '[[32, 9837, 9838, 9839], [32, 9837, 9838, 9839]]');
  // and the figure fonts carry the signs themselves, so a label with a flat stays in its own typeface
  const own = require('child_process').spawnSync('python3', ['-c', "from fontTools.ttLib import TTFont;import sys;print(all(c in TTFont(f).getBestCmap() for f in sys.argv[1:] for c in (0x266D,0x266E,0x266F)))", ...['inter-latin-400-normal.ttf', 'inter-latin-600-normal.ttf', 'oswald-latin-700-normal.ttf'].map((f) => path.join(__dirname, '../assets/fonts', f))], { encoding: 'utf8' });
  if (own.status === 0) assert.strictEqual(own.stdout.trim(), 'True');
});
test('XML characters in titles and headings are escaped', () => {
  const svg = svgOf({ title: 'Rock & <Roll>', timeSignature: null, panels: [{ heading: 'A & B "quote"', measures: [{ notes: [{ string: 'E', fret: 0 }] }] }] });
  assert.match(svg, /A &amp; B &quot;quote&quot;/);
  assert.doesNotMatch(svg, /<Roll>/);
});
test('3 quarter notes in 4/4 are rejected unless marked incomplete', () => {
  rejects(spec([{ string: 'E', frets: [0, 1, 2] }], { timeSignature: [4, 4] }), /quarter-note count/);
  assert.doesNotThrow(() => svgOf(spec([{ string: 'E', frets: [0, 1, 2], incomplete: true }], { timeSignature: [4, 4] })));
});
test('5 quarter notes in 4/4 are rejected even when marked incomplete', () => {
  rejects(spec([{ string: 'E', frets: [0, 1, 2, 3, 4], incomplete: true }], { timeSignature: [4, 4] }), /quarter-note count/);
});
test('null meter draws no time signature and no stems', () => {
  const svg = svgOf(spec([{ string: 'E', frets: [0, 2, 3, 5] }]));
  assert.doesNotMatch(svg, /class="stem"/);
  for (let d = 0; d <= 9; d += 1) assert.ok(!svg.includes(glyphs[`timeSig${d}`].path), `timeSig${d} present`);
});
test('3/4 meter draws stems and a 3 over 4', () => {
  const svg = svgOf(spec([{ string: 'E', frets: [0, 2, 3] }], { timeSignature: [3, 4] }));
  assert.match(svg, /class="stem"/);
  assert.ok(svg.includes(glyphs.timeSig3.path));
});

process.stdout.write('Validation\n');
test('duration and rest fields are rejected, not ignored', () => {
  rejects(spec([{ notes: [{ string: 'E', fret: 0, duration: 'eighth' }] }]), /unsupported field duration/);
  rejects(spec([{ notes: [{ string: 'E', fret: 0, rest: true }] }]), /unsupported field rest/);
  rejects({ ...spec([{ notes: [{ string: 'E', fret: 0 }] }]), keySignature: 'Bb' }, /unsupported field keySignature/);
});
test('notes plus compact frets in one measure are rejected as ambiguous', () => {
  rejects(spec([{ notes: [{ string: 'E', fret: 0 }], string: 'E', frets: [1] }]), /not both/);
});
test('duplicate panel slugs are rejected', () => {
  rejects({ title: 'T', timeSignature: null, panels: [
    { heading: 'Same', measures: [{ notes: [{ string: 'E', fret: 0 }] }] },
    { heading: 'same!', measures: [{ notes: [{ string: 'E', fret: 0 }] }] },
  ] }, /Duplicate panel slug/);
});
test('unknown string names are rejected', () => {
  rejects(spec([{ notes: [{ string: 'B', fret: 0 }] }]), /unknown string "B"/);
});
test('arrays of inconsistent length are rejected', () => {
  rejects(spec([{ string: 'E', frets: [0, 1, 2], fingers: [1, 2] }]), /fingers must be empty or match/);
  rejects(spec([{ string: 'E', frets: [0, 1], spellings: ['E2'] }]), /spellings must be empty or match/);
});
test('non-integer and out-of-range frets are rejected', () => {
  rejects(spec([{ notes: [{ string: 'E', fret: 2.5 }] }]), /fret must be an integer/);
  rejects(spec([{ notes: [{ string: 'E', fret: 37 }] }]), /fret must be an integer/);
});
test('notes outside the MIDI range are rejected', () => {
  const high = { name: 'odd', writtenOctaveOffset: 12, strings: [
    { name: 'a', openMidi: 100 }, { name: 'b', openMidi: 105 }, { name: 'c', openMidi: 110 }, { name: 'd', openMidi: 115 }] };
  rejects(spec([{ notes: [{ string: 'd', fret: 10 }] }], { instrument: high }), /outside the MIDI range/);
});
test('crowded narrow panel fails with a clear error', () => {
  rejects(spec([1, 2, 3, 4].map(() => ({ string: 'E', frets: [0, 1, 2, 3] })), { width: 900, timeSignature: [4, 4] }), /too crowded/);
});

test('plain frame keeps pitch and TAB identical, drops the border and heading, and is shorter', () => {
  const base = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'examples', 'c-major.json'), 'utf8'));
  const a = validateSpec({ ...base, frame: 'panel' });
  const b = validateSpec({ ...base, frame: 'plain' });
  const ra = renderPanel(a, a.panels[0]);
  const rb = renderPanel(b, b.panels[0]);
  assert.ok(rb.height < ra.height, `${rb.height} !< ${ra.height}`);
  assert.doesNotMatch(rb.svg, /class="heading"/);
  assert.doesNotMatch(rb.svg, /stroke="#D86B25"/);
  const tabs = (svg) => [...svg.matchAll(/class="tab-number">(\d+)</g)].map((m) => m[1]).join(',');
  const pitches = (svg) => [...svg.matchAll(/data-written-pitch="([^"]+)"/g)].map((m) => m[1]).join(',');
  assert.strictEqual(tabs(rb.svg), tabs(ra.svg));
  assert.strictEqual(pitches(rb.svg), pitches(ra.svg));
  rejects({ ...base, frame: 'box' }, /frame must be panel/);
  rejects({ ...base, layout: 'tiny' }, /layout must be standard or compact/);
});

process.stdout.write('Views, frames and sizing\n');
test('show: "tab" draws no staff; show: "notation" draws no TAB', () => {
  const base = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'examples', 'c-major.json'), 'utf8'));
  const tabOnly = svgOf({ ...base, show: 'tab' });
  assert.doesNotMatch(tabOnly, /class="note"/);
  assert.match(tabOnly, /class="tab-number">3</);
  const notationOnly = svgOf({ ...base, show: 'notation' });
  assert.doesNotMatch(notationOnly, /class="tab-number"/);
  assert.match(notationOnly, /class="note"/);
});
test('repeat draws dots on the staff and the TAB at both ends', () => {
  const svg = svgOf({ ...spec([{ string: 'E', frets: [0, 2, 3, 5] }], { timeSignature: [4, 4] }), panels: [{ heading: 'R', repeat: true, measures: [{ string: 'E', frets: [0, 2, 3, 5] }] }] });
  assert.strictEqual((svg.match(/<circle/g) || []).length, 8);
});
test('auto width is shared by every panel of an exercise and grows with the music', () => {
  const s = validateSpec(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'examples', 'c-major-up-and-down.json'), 'utf8')));
  const widths = s.panels.map((p) => renderPanel(s, p).width);
  assert.strictEqual(new Set(widths).size, 1);
  const one = validateSpec(spec([{ string: 'E', frets: [0, 2, 3, 5] }], { timeSignature: [4, 4], width: 'auto' }));
  const two = validateSpec(spec([{ string: 'E', frets: [0, 2, 3, 5] }, { string: 'E', frets: [0, 2, 3, 5] }], { timeSignature: [4, 4], width: 'auto' }));
  assert.ok(two.width > one.width);
});
test('at the default 1.8 mm print staff space, labels print at about 10 pt and the staff matches book engraving', () => {
  const unitMm = 1.8 / HOUSE.staffGap;
  const pt = (u) => u * unitMm * 2.8346;
  assert.ok(pt(HOUSE.type.label) >= 9.5 && pt(HOUSE.type.label) <= 10.5, `label ${pt(HOUSE.type.label)}`);
  assert.ok(pt(HOUSE.type.tab) >= 9, `tab ${pt(HOUSE.type.tab)}`);
  assert.ok(Math.abs(HOUSE.staffGap * 4 * unitMm - 7.2) < 1e-9);
});
test('measure labels default to nothing (no "E STRING" captions in the graphic)', () => {
  assert.doesNotMatch(svgOf(spec([{ string: 'E', frets: [0] }])), /STRING/);
});

process.stdout.write('Diagrams\n');
const { renderDiagram } = require('./diagram.js');
test('fretboard strings get thicker towards the lowest-sounding string (4 and 6 strings)', () => {
  const weights = (d) => [...renderDiagram(d).svg.matchAll(/class="string-name" data-weight="([\d.]+)">([^<]+)</g)].map((m) => [m[2], Number(m[1])]);
  const four = weights({ type: 'fretboard', title: 'F', frets: [0, 5] });
  assert.deepStrictEqual(four.map((w) => w[0]), ['G', 'D', 'A', 'E']);
  for (let i = 1; i < four.length; i += 1) assert.ok(four[i][1] > four[i - 1][1], 'lower string not thicker');
  const six = weights({ type: 'fretboard', title: 'F', frets: [0, 5], instrument: { strings: SIX.strings } });
  assert.deepStrictEqual(six[0][0], 'C'); assert.deepStrictEqual(six[5][0], 'B');
  assert.ok(six[5][1] > six[0][1] * 2);
});
test('plain diagrams have no border or heading', () => {
  const svg = renderDiagram({ type: 'fretboard', title: 'F', heading: 'Heading here', frame: 'plain' }).svg;
  assert.doesNotMatch(svg, /class="heading"/); assert.doesNotMatch(svg, /stroke="#D86B25"/);
});

process.stdout.write('Output\n');
test('filenames stay inside the output directory', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lbs-test-'));
  const s = validateSpec({ title: '../../escape', slug: '../../escape', timeSignature: null, panels: [{ heading: '../x', measures: [{ notes: [{ string: 'E', fret: 0 }] }] }] });
  const { manifest, manifestPath } = renderFiles(s, dir, { png: false });
  assert.ok(manifestPath.startsWith(dir));
  for (const panel of manifest.panels) assert.ok(!panel.files.svg.includes('/'));
  assert.deepStrictEqual(fs.readdirSync(dir).sort(), ['escape-manifest.json', 'escape-x.svg']);
});
test('manifest audits every note and verifies transposition', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lbs-test-'));
  const s = validateSpec(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'examples', 'c-major.json'), 'utf8')));
  const { manifest } = renderFiles(s, dir, { png: false });
  const audit = manifest.panels[0].notes;
  assert.strictEqual(audit.length, 8);
  assert.deepStrictEqual(audit.map((n) => n.writtenPitch), ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4']);
  assert.deepStrictEqual(audit.map((n) => n.soundingPitch), ['C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2', 'C3']);
  assert.deepStrictEqual(audit.map((n) => `${n.string}${n.fret}`), ['A3', 'A5', 'D2', 'D3', 'D5', 'G2', 'G4', 'G5']);
  assert.strictEqual(manifest.panels[0].transpositionVerified, true);
});
test('every bundled example validates and renders', () => {
  const dir = path.join(__dirname, '..', 'examples');
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const s = validateSpec(JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')));
    s.panels.forEach((p) => renderPanel(s, p));
  }
});
test('house palette is intact', () => {
  assert.deepStrictEqual([HOUSE.cream, HOUSE.charcoal, HOUSE.orange, HOUSE.accentInk, HOUSE.muted],
    ['#F5EFE2', '#292724', '#D86B25', '#A84912', '#6A645C']);
});

process.stdout.write('Grooves (LilyPond route)\n');
const groove = require('./groove.js');
const { spawnSync } = require('child_process');
const g = (measures, extra = {}) => ({ title: 'G', timeSignature: [4, 4], panels: [{ heading: 'G', measures }], ...extra });
const n = (string, fret, duration, more = {}) => ({ string, fret, duration, ...more });
test('LilyPond pitch names: E2 e,  Bb2 bes,  Ab3 as  Eb3 es  F#2 fis,  C4 c\'', () => {
  const { parsePitch } = require('./render.js');
  assert.deepStrictEqual(['E2', 'Bb2', 'Ab3', 'Eb3', 'F#2', 'C4'].map((x) => groove.lilyPitch(parsePitch(x))), ['e,', 'bes,', 'as', 'es', 'fis,', "c'"]);
});
test('durations must fill the bar exactly (dotted values included)', () => {
  assert.doesNotThrow(() => groove.validateGroove(g([{ events: [n('E', 0, '4.'), n('E', 0, '8'), n('E', 3, '2')] }])));
  assert.throws(() => groove.validateGroove(g([{ events: [n('E', 0, '2'), n('E', 0, '2'), n('E', 0, '8')] }])), /overfull/);
  assert.throws(() => groove.validateGroove(g([{ events: [n('E', 0, '2')] }])), /short/);
  assert.doesNotThrow(() => groove.validateGroove(g([{ incomplete: true, events: [n('E', 0, '8')] }, { events: [n('E', 0, '1')] }])));
  assert.throws(() => groove.validateGroove(g([{ events: [n('E', 0, '1')] }, { incomplete: true, events: [n('E', 0, '8')] }])), /only the first bar/);
});
test('ties must join the same string and fret; rests cannot carry frets', () => {
  assert.throws(() => groove.validateGroove(g([{ events: [n('E', 0, '2', { tie: true }), n('E', 3, '2')] }])), /tie must lead/);
  assert.throws(() => groove.validateGroove(g([{ events: [{ rest: true, duration: '2', fret: 3 }, n('E', 0, '2')] }])), /rest cannot have fret/);
  assert.throws(() => groove.validateGroove(g([{ events: [n('E', 0, '1', { swing: true })] }])), /unsupported field swing/);
  assert.throws(() => groove.validateGroove(g([{ events: [n('E', 0, '3')] }])), /duration must be/);
});
test('grooves are always metered; more than four bars need barsPerLine', () => {
  assert.throws(() => groove.validateGroove(g([{ events: [n('E', 0, '1')] }], { timeSignature: null })), /timeSignature/);
  const bar = { events: [n('E', 0, '1')] };
  assert.throws(() => groove.validateGroove(g([bar, bar, bar, bar, bar])), /set barsPerLine/);
  const ok = groove.validateGroove({ ...g([bar, bar, bar, bar, bar, bar]), panels: [{ heading: 'G', barsPerLine: 3, measures: [bar, bar, bar, bar, bar, bar] }] });
  assert.match(groove.toLily(ok, ok.panels[0], { lineSpaces: 100, ragged: false }), /\\break/);
});
test('double stops: 2 to 4 notes on different strings, tied only to the same shape', () => {
  const ds = { notes: [{ string: 'E', fret: 3 }, { string: 'D', fret: 2, finger: 1 }], duration: '2' };
  const s = groove.validateGroove(g([{ events: [ds, { ...ds, duration: '2' }] }]));
  const ly = groove.toLily(s, s.panels[0], { lineSpaces: 60, ragged: true });
  assert.match(ly, /<g,\\4 e\\2-1>2/);
  assert.throws(() => groove.validateGroove(g([{ events: [{ notes: [{ string: 'E', fret: 3 }, { string: 'E', fret: 5 }], duration: '1' }] }])), /own string/);
  assert.throws(() => groove.validateGroove(g([{ events: [{ ...ds, tie: true }, { notes: [{ string: 'E', fret: 3 }, { string: 'D', fret: 4 }], duration: '2' }] }])), /tie must lead/);
});
test('slides, hammer-ons and pull-offs check their direction and string', () => {
  assert.doesNotThrow(() => groove.validateGroove(g([{ events: [n('A', 2, '2', { hammer: true }), n('A', 4, '2')] }])));
  assert.throws(() => groove.validateGroove(g([{ events: [n('A', 4, '2', { hammer: true }), n('A', 2, '2')] }])), /hammer-on goes to a higher fret/);
  assert.throws(() => groove.validateGroove(g([{ events: [n('A', 2, '2', { pull: true }), n('A', 4, '2')] }])), /pull-off goes to a lower fret/);
  assert.throws(() => groove.validateGroove(g([{ events: [n('A', 2, '2', { slide: true }), n('D', 4, '2')] }])), /same string/);
  const s = groove.validateGroove(g([{ events: [n('A', 5, '2', { slide: true }), n('A', 7, '4', { ghost: true }), n('E', 3, '4', { accent: true, staccato: true })] }]));
  const ly = groove.toLily(s, s.panels[0], { lineSpaces: 60, ragged: true });
  assert.match(ly, /\\glissando/); assert.match(ly, /\\parenthesize/); assert.match(ly, /->-\./);
});
test('triplets come in complete groups of three and fill the bar correctly', () => {
  const trip = [n('E', 0, '8t'), n('E', 2, '8t'), n('E', 3, '8t')];
  const s = groove.validateGroove(g([{ events: [...trip, ...trip, n('A', 0, '2')] }]));
  assert.strictEqual((groove.toLily(s, s.panels[0], { lineSpaces: 60, ragged: true }).match(/\\tuplet 3\/2/g) || []).length, 2);
  assert.throws(() => groove.validateGroove(g([{ events: [n('E', 0, '8t'), n('E', 0, '8t'), n('E', 0, '4'), n('E', 0, '2'), n('E', 0, '8t')] }])), /complete groups of three|short|overfull/);
});
test('key, tempo and TAB-only view reach LilyPond', () => {
  const s = groove.validateGroove(g([{ events: [n('E', 0, '1')] }], { key: { tonic: 'Eb', mode: 'major' }, tempo: 96, show: 'tab' }));
  const ly = groove.toLily(s, s.panels[0], { lineSpaces: 60, ragged: true });
  assert.match(ly, /\\key es \\major/); assert.match(ly, /\\tempo 4 = 96/); assert.match(ly, /\\tabFullNotation/);
  assert.doesNotMatch(ly, /\\new Staff/);
  assert.throws(() => groove.validateGroove(g([{ events: [n('E', 0, '1')] }], { key: { tonic: 'D#', mode: 'major' } })), /not a standard major key/);
});
const hasLily = spawnSync('lilypond', ['--version']).status === 0;
test(hasLily ? 'engraved TAB digits match the input frets exactly' : 'engraved TAB digits (skipped: LilyPond not installed)', () => {
  if (!hasLily) return;
  const input = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'examples', 'grooves', 'em-eighths.json'), 'utf8'));
  const spec = groove.validateGroove(input);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lbs-g-'));
  const { manifest } = groove.renderGrooveFiles(spec, dir, {});
  const svg = fs.readFileSync(path.join(dir, manifest.panels[0].files.svg), 'utf8');
  // Sort by horizontal position: SVG drawing order is not reading order.
  const digits = [...svg.matchAll(/translate\(([\d.]+), [\d.]+\)">\s*<text font-family="DejaVu Sans Mono[^>]*>\s*<tspan>(\d+)<\/tspan>/g)]
    .map((m) => ({ x: Number(m[1]), fret: Number(m[2]) })).sort((a, b) => a.x - b.x).map((d) => d.fret);
  const events = spec.panels[0].measures.flatMap((m) => m.events);
  const expected = events.filter((ev, i) => !ev.rest && !ev.muted && !(i > 0 && events[i - 1].tie)).map((ev) => ev.notes[0].fret);
  assert.deepStrictEqual(digits, expected);
  assert.ok(svg.includes('Em'), 'chord label case lost');
});

process.stdout.write('Rhythm lines and charts (3.2)\n');
{
  const { validateGroove, toLily, renderGroove } = require('./groove.js');
  const rhythm = (measures, extra = {}) => ({ title: 'R', show: 'rhythm', frame: 'plain', panels: [{ heading: 'L', measures, ...extra }] });
  const chart = (measures, extra = {}, top = {}) => ({ title: 'C', show: 'chart', frame: 'plain', ...top, panels: [{ heading: 'L', measures, ...extra }] });
  const layout = { lineSpaces: 100, ragged: true };
  test('a rhythm line needs only durations, and its bars must still add up', () => {
    const spec = validateGroove(rhythm([{ events: [{ duration: '4' }, { duration: '8' }, { duration: '8', tie: true }, { duration: '4' }, { rest: true, duration: '4' }] }]));
    assert.strictEqual(spec.panels[0].measures[0].events.length, 5);
    const ly = toLily(spec, spec.panels[0], layout);
    assert.match(ly, /\\new RhythmicStaff/); assert.match(ly, /d4 d8 d8~ d4 r4/); assert.doesNotMatch(ly, /TabStaff/);
    assert.throws(() => validateGroove(rhythm([{ events: [{ duration: '4' }, { duration: '4' }] }])), /is short/);
    assert.throws(() => validateGroove(rhythm([{ events: [{ duration: '8t' }, { duration: '8t' }, { duration: '4t' }, { duration: '4t' }, { duration: '4t' }, { duration: '4' }, { duration: '8t' }] }])), /groups of three|is short|overfull/);
    assert.match(spec.panels[0].altText, /rhythm on one line/);
  });
  test('a panel can end with a final double bar, but not if it repeats', () => {
    const spec = validateGroove(rhythm([{ events: [{ duration: '1' }] }], { end: 'final' }));
    assert.match(toLily(spec, spec.panels[0], layout), /\\bar "\|\." /);
    assert.throws(() => validateGroove(rhythm([{ events: [{ duration: '1' }] }], { end: 'final', repeat: true })), /repeat sign/);
    assert.throws(() => validateGroove(rhythm([{ events: [{ duration: '1' }] }], { end: 'double' })), /"bar" or "final"/);
  });
  test('a chart turns chords into slashes: one, two and four chords to the bar, with real flat signs', () => {
    const spec = validateGroove(chart([{ mark: 'A', chords: ['Bb7'] }, { chords: ['Cm7', 'F7'] }, { chords: ['C', 'Am', 'Dm', 'G7'] }]));
    const [a, b, c] = spec.panels[0].measures;
    assert.deepStrictEqual(a.events.map((e) => e.label), ['Bb7', '', '', '']);
    assert.deepStrictEqual(b.events.map((e) => e.label), ['Cm7', '', 'F7', '']);
    assert.deepStrictEqual(c.events.map((e) => e.label), ['C', 'Am', 'Dm', 'G7']);
    assert.ok(a.events.every((e) => e.slash));
    const ly = toLily(spec, spec.panels[0], layout);
    assert.match(ly, /\\improvisationOn/); assert.match(ly, /"B♭7"/); assert.match(ly, /\\mark \\markup \{ \\box \\sans \\bold "A" \}/);
    assert.doesNotMatch(ly, /TabStaff|RhythmicStaff/);
  });
  test('a chart in three four, and chords that cannot share a bar equally', () => {
    const spec = validateGroove(chart([{ chords: ['Dm'] }, { chords: ['G7', 'G7', 'C'] }], {}, { timeSignature: [3, 4] }));
    assert.strictEqual(spec.panels[0].measures[0].events.length, 3);
    assert.throws(() => validateGroove(chart([{ chords: ['Dm', 'G7'] }], {}, { timeSignature: [3, 4] })), /cannot share 3 beats equally/);
    assert.throws(() => validateGroove(chart([{ chords: ['C', 'F', 'G'] }])), /cannot share 4 beats equally/);
    assert.throws(() => validateGroove(chart([{ chords: [] }])), /one or more chord symbols/);
  });
  test('simile bars become a percent repeat of the bar before; line breaks sit in their own voice', () => {
    const spec = validateGroove(chart([{ chords: ['Eb7'] }, { simile: true }, { simile: true }, { chords: ['Bb7'] }, { chords: ['F7'] }, { simile: true }], { barsPerLine: 4 }));
    const ly = toLily(spec, spec.panels[0], layout);
    assert.match(ly, /\\repeat percent 3 \{ d4\^\\markup[^}]*\} d4 d4 d4 \}/); assert.match(ly, /\\repeat percent 2 \{/);
    assert.match(ly, /s4\*4 s4\*4 s4\*4 s4\*4 \\break s4\*4 s4\*4 \}/);
    assert.throws(() => validateGroove(chart([{ simile: true }, { chords: ['C'] }])), /first bar of a panel cannot be a simile/);
    assert.throws(() => validateGroove(chart([{ chords: ['C'] }, { simile: true, chords: ['F'] }])), /no chords of its own/);
  });
  test('a chart bar can be written out as a rhythm with chords as labels (kicks); marks and slashes are for charts only', () => {
    const spec = validateGroove(chart([{ events: [{ duration: '4.', label: 'Cm7' }, { duration: '8', label: 'F7', tie: true }, { duration: '2' }] }]));
    assert.match(toLily(spec, spec.panels[0], layout), /d4\.\^\\markup[^}]*"Cm7" \} d8~\^\\markup[^}]*"F7" \} d2/);
    const pitched = { title: 'G', panels: [{ heading: 'L', measures: [{ mark: 'A', events: [{ string: 'E', fret: 0, duration: '1' }] }] }] };
    assert.throws(() => validateGroove(pitched), /mark and simile are for charts/);
    pitched.panels[0].measures[0] = { events: [{ string: 'E', fret: 0, duration: '1', slash: true }] };
    assert.throws(() => validateGroove(pitched), /cannot be written by hand/);
  });
  const hasLily = require('child_process').spawnSync('lilypond', ['--version']).status === 0;
  if (hasLily) {
    test('engraved: a twelve bar chart and a rhythm line come out as SVG with their labels, at a width that fits a page', () => {
      const blues = validateGroove(chart([{ mark: 'A', chords: ['Bb7'] }, { chords: ['Eb7'] }, { chords: ['Bb7'] }, { simile: true }, { chords: ['Eb7'] }, { simile: true }, { chords: ['Bb7'] }, { chords: ['G7'] },
        { chords: ['Cm7'] }, { chords: ['F7'] }, { chords: ['Bb7', 'G7'] }, { chords: ['Cm7', 'F7'] }], { barsPerLine: 4, end: 'final' }, { tempo: { bpm: 96, text: 'Shuffle' } }));
      const r = renderGroove(blues, blues.panels[0]);
      assert.ok(r.width <= 2400 + 60 && r.width > 1200);
      assert.strictEqual((r.svg.match(/B♭7/g) || []).length, 4); assert.match(r.svg, /Shuffle/);
      assert.doesNotMatch(r.svg, /DejaVu Sans Mono[^>]*>\s*(<tspan>)?Shuffle/);
      const line = validateGroove(rhythm([{ events: [{ duration: '8' }, { duration: '8' }, { duration: '4' }, { rest: true, duration: '2' }] }], { end: 'final' }));
      assert.match(renderGroove(line, line.panels[0]).svg, /<svg/);
    });
  }
}

process.stdout.write('Element cards (3.2)\n');
{
  const { card, find, load, box } = require('./element.js');
  const { validateGroove } = require('./groove.js');
  const data = load();
  test('the catalogue copy holds every element with its chords in twelve keys', () => {
    assert.ok(data.elements.length >= 60);
    for (const el of data.elements) {
      assert.strictEqual(Object.keys(el.keys).length, 12, el.id);
      assert.ok(el.roman && el.name && el.stage >= 1 && Array.isArray(el.fixed) && el.homes.some((h) => h.own), el.id);
    }
  });
  test('an element is found by id, by its numerals as written, or by name; i is not I', () => {
    assert.strictEqual(find(data, 'dorian-loop').id, 'dorian-loop');
    assert.strictEqual(find(data, 'I IV').id, 'major-lean');
    assert.strictEqual(find(data, 'i iv').id, find(data, 'i iv').id);
    assert.notStrictEqual(find(data, 'i iv').id, 'major-lean');
    assert.strictEqual(find(data, 'the dorian loop').id, 'dorian-loop');
    assert.strictEqual(find(data, 'i bIII bVII IV').id, 'dorian-loop');
    assert.throws(() => find(data, 'nonsense'), /No element/);
  });
  test('every card, in three keys: its chart is a valid chart, its neck has notes inside the box, and it links to its Guide page', () => {
    for (const el of data.elements) for (const key of ['C', 'F#', 'Bb']) for (const sevenths of [false, true]) {
      const sheet = card(el, key, { data, sevenths });
      const chart = sheet.blocks.find((b) => b.type === 'groove');
      assert.ok(chart, `${el.id} has a chart`);
      const spec = validateGroove(chart.groove);
      assert.strictEqual(spec.show, 'chart');
      const neck = sheet.blocks.find((b) => b.type === 'diagram').diagram;
      assert.ok(neck.markers.length >= 3 && neck.markers.every((m) => m.fret >= neck.frets[0] && m.fret <= neck.frets[1]), `${el.id} ${key} neck`);
      assert.ok(neck.frets[1] - neck.frets[0] === 4 && neck.frets[0] >= 1);
      const link = sheet.blocks.find((b) => b.type === 'link');
      assert.strictEqual(link.url, `https://leithbass.space/members/elements/#guide/${el.id}`); assert.strictEqual(link.steps.length, 3);
      assert.ok(sheet.title.startsWith(el.roman), 'numerals lead the title');
    }
  });
  test('the card says what the app says: chords, the listening line and the homes come from the catalogue', () => {
    const el = find(data, 'dorian-loop'), sheet = card(el, 'Bb', { data });
    assert.deepStrictEqual(sheet.blocks.find((b) => b.type === 'table').rows[0], ['B♭m', 'D♭', 'A♭', 'E♭']);
    assert.match(sheet.blocks.find((b) => b.label === 'Listen for').text, /^The G when the last chord arrives/);
    assert.match(sheet.blocks.find((b) => b.label === 'Two homes').text, /I V ii IV in A♭ major/);
    assert.ok(!card(find(data, 'fifties-progression'), 'C', { data }).blocks.some((b) => /home/i.test(b.label || '') && b.type === 'callout' && b.label !== 'Listen for' && b.label !== 'Built from'), 'the fifties progression has one home');
    const root = sheet.blocks.find((b) => b.type === 'diagram').diagram.markers.filter((m) => m.role === 'root');
    assert.ok(root.some((m) => m.string === 'E' && m.fret === 6));
    assert.deepStrictEqual(box(4), { root: { string: 'A', fret: 7 }, frets: [6, 10] });
    assert.throws(() => card(el, 'H', { data }), /not a note name/);
  });
}

process.stdout.write('Worksheets\n');
const { portalText, build } = require('./worksheet.js');
test('portal text follows the session notes template and lists the PDF first', () => {
  const txt = portalText({ member: 'John Douglas', date: '2026-10-27', covered: 'Thirds', objectives: ['Slow thirds'], files: ['extra.pdf'] }, 'session-6.pdf');
  assert.match(txt, /^# THE LEITH BASS SPACE · SESSION NOTES/);
  assert.match(txt, /Member: John Douglas\nDate: 2026-10-27\nLength: 1h\nStatus: done\nBlock: yes/);
  assert.match(txt, /Files:\n- session-6.pdf\n- extra.pdf/);
  assert.throws(() => portalText({ date: 'x' }), /member is required/);
});
const asyncTests = [];
asyncTests.push(['a link block holds a QR code and the address in words; signs in text are set in the signs font (3.1)', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lbs-ws-'));
  const sheet = { title: 'Bb and F#', blocks: [
    { type: 'paragraph', text: 'Bb7 pulls to Eb. Abbey Road.' },
    { type: 'link', label: 'Practise it', text: 'In the app.', url: 'https://leithbass.space/members/elements/#dojo/name/major-lean+major-pull' },
  ] };
  const file = path.join(dir, 'sheet.json');
  fs.writeFileSync(file, JSON.stringify(sheet));
  const { docxPath } = await build(file, dir, {});
  const JSZip = require(require.resolve('jszip', { paths: [require('child_process').execSync('npm root -g').toString().trim()] }));
  const zip = await JSZip.loadAsync(fs.readFileSync(docxPath));
  const xml = await zip.file('word/document.xml').async('string');
  assert.match(xml, /LBS Signs SemiBold/); assert.match(xml, /LBS Signs"/); assert.match(xml, />\u266D</); assert.match(xml, /Abbey Road/);
  assert.match(xml, /leithbass\.space\/members\/elements</);
  const media = Object.keys(zip.files).filter((n) => /^word\/media\/.+\.png$/.test(n));
  assert.strictEqual(media.length, 1);
  const png = await zip.file(media[0]).async('nodebuffer');
  assert.strictEqual(png.readUInt32BE(0), 0x89504e47); assert.ok(png.readUInt32BE(16) === png.readUInt32BE(20) && png.readUInt32BE(16) >= 29 * 8);
  // steps beside the code: one row of three cells, numbered, and no table inside a table
  fs.writeFileSync(file, JSON.stringify({ title: 'T', blocks: [{ type: 'link', url: 'https://leithbass.space/metronome/', label: 'Go', steps: ['One.', 'Two.'] }] }));
  const withSteps = await build(file, dir, {});
  const xml2 = await (await JSZip.loadAsync(fs.readFileSync(withSteps.docxPath))).file('word/document.xml').async('string');
  assert.strictEqual((xml2.match(/<w:tbl>/g) || []).length, 1); assert.strictEqual((xml2.match(/<w:tc>/g) || []).length, 3); assert.match(xml2, /<w:numPr>/);
  fs.writeFileSync(file, JSON.stringify({ title: 'T', blocks: [{ type: 'link', url: 'https://leithbass.space/', steps: [] }] }));
  await assert.rejects(() => build(file, dir, {}), /one to six lines/);
  for (const bad of ['http://leithbass.space/', 'leithbass.space', 'https://x y']) {
    fs.writeFileSync(file, JSON.stringify({ title: 'T', blocks: [{ type: 'link', url: bad }] }));
    await assert.rejects(() => build(file, dir, {}), /https address/);
  }
}]);
asyncTests.push(['pagebreak sets page-break-before (no empty page-break paragraph); sections switch to landscape', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lbs-ws-'));
  const sheet = { title: 'Session 1 note', blocks: [
    { type: 'paragraph', text: 'One' }, { type: 'pagebreak' }, { type: 'heading', text: 'Two' },
    { type: 'section', orientation: 'landscape' }, { type: 'paragraph', text: 'Wide' },
  ] };
  const file = path.join(dir, 'sheet.json');
  fs.writeFileSync(file, JSON.stringify(sheet));
  const { docxPath } = await build(file, dir, {});
  const JSZip = require(require.resolve('jszip', { paths: [require('child_process').execSync('npm root -g').toString().trim()] }));
  const xml = await (await JSZip.loadAsync(fs.readFileSync(docxPath))).file('word/document.xml').async('string');
  assert.match(xml, /<w:pageBreakBefore\/>/);
  assert.doesNotMatch(xml, /w:type="page"/);
  assert.match(xml, /w:orient="landscape"/);
  fs.writeFileSync(file, JSON.stringify({ title: 'x', blocks: [{ type: 'paragraph', text: 'a' }, { type: 'pagebreak' }] }));
  await assert.rejects(build(file, dir, {}), /cannot end with a pagebreak/);
}]);

(async () => {
  for (const [name, fn] of asyncTests) {
    try { await fn(); passed += 1; process.stdout.write(`  ok   ${name}\n`); }
    catch (error) { failures.push(name); process.stdout.write(`  FAIL ${name}\n       ${error.message}\n`); }
  }
process.stdout.write(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) process.exitCode = 1;
})();
