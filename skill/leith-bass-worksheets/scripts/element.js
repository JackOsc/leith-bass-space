#!/usr/bin/env node
/*
 * An element card for print (3.2): one page for one element of the Harmonic Elements course, in one key.
 *
 *   node scripts/element.js dorian-loop --key Bb --out-dir out --pdf
 *   node scripts/element.js "I IV" --key C            (numerals work too, where they name one element)
 *   node scripts/element.js --list                    (every element, by stage)
 *
 * Everything musical on the card (the numerals, the chords in the key, the notes the chords fix and leave open,
 * the listening line, the homes) is read from assets/elements.json, which is written from the app's own catalogue
 * by tools/export-elements-for-worksheets.js in the site's repository. The card and the app's Guide therefore
 * agree by construction. What is written here is only the card's layout and its three practice steps.
 *
 * The card is an ordinary worksheet: this script writes <slug>.worksheet.json and hands it to worksheet.js, so it
 * can be edited and rebuilt like any other.
 */
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'assets', 'elements.json');
const SITE = 'https://leithbass.space/members/elements/';
const PCS = { C: 0, 'C♯': 1, 'D♭': 1, D: 2, 'D♯': 3, 'E♭': 3, E: 4, F: 5, 'F♯': 6, 'G♭': 6, G: 7, 'G♯': 8, 'A♭': 8, A: 9, 'A♯': 10, 'B♭': 10, B: 11, 'C♭': 11 };
const SHOWN = (deg) => String(deg).replace(/b/g, '♭').replace(/#/g, '♯');

function fail(message) { throw new Error(message); }

function load() {
  if (!fs.existsSync(DATA)) fail('assets/elements.json is missing. It is written by tools/export-elements-for-worksheets.js in the site repository.');
  return JSON.parse(fs.readFileSync(DATA, 'utf8'));
}

function find(data, want) {
  const plain = (t) => String(t).toLowerCase().replace(/♭/g, 'b').replace(/♯/g, '#').replace(/\s+/g, ' ').trim();
  const byId = data.elements.filter((el) => el.id === want);
  if (byId.length) return byId[0];
  // numerals are compared as written (i is not I), names without regard to case
  const hits = data.elements.filter((el) => el.roman.replace(/♭/g, 'b').replace(/♯/g, '#').replace(/\s+/g, ' ') === String(want).replace(/♭/g, 'b').replace(/♯/g, '#').replace(/\s+/g, ' ').trim() || plain(el.name) === plain(want));
  if (hits.length === 1) return hits[0];
  if (hits.length > 1) fail(`"${want}" names ${hits.length} elements: ${hits.map((el) => el.id).join(', ')}. Use the id.`);
  return fail(`No element "${want}". Run with --list to see them.`);
}

// Where the card's neck diagram sits: the root on the E or A string, low on the neck where there is one.
function box(pc) {
  const onE = (pc - 4 + 12) % 12 || 12;
  const onA = (pc - 9 + 12) % 12 || 12;
  const root = onE <= 8 ? { string: 'E', fret: onE } : { string: 'A', fret: onA };
  const from = Math.max(1, root.fret - 1);
  return { root, frets: [from, from + 4] };
}

function card(el, keyName, options = {}) {
  const data = options.data || load();
  const pc = PCS[String(keyName).replace(/b$/, '♭').replace(/#$/, '♯').replace(/^([A-G])b/, '$1♭').replace(/^([A-G])#/, '$1♯')];
  if (pc === undefined) fail(`--key ${keyName} is not a note name (C, F#, Bb...).`);
  const k = el.keys[pc];
  const chords = options.sevenths && k.sevenths ? k.sevenths : k.chords;
  const keyLabel = `${k.tonic} ${el.mode === 'minor' ? 'minor' : 'major'}`;
  const slug = `${el.id}-in-${k.tonic.replace('♭', 'b').replace('♯', 'sharp').toLowerCase()}`;
  const blocks = [];

  // 1. the loop as a chart
  const measures = [];
  chords.forEach((c) => { for (let b = 0; b < Math.max(1, Math.round(c.bars)); b++) measures.push(b === 0 ? { chords: [c.name] } : { simile: true }); });
  // (half bar chords, where the catalogue has them, share a bar)
  const halves = chords.every((c) => c.bars === 0.5) && chords.length % 2 === 0;
  const bars = halves ? chords.reduce((acc, c, i) => (i % 2 ? acc : acc.concat([{ chords: [c.name, chords[i + 1].name] }])), []) : measures;
  if (bars.length <= 16) {
    blocks.push({ type: 'groove', title: `Figure 1. ${el.roman} in ${keyLabel}`,
      caption: el.cadence ? 'One pass through. Slashes are beats: the notes are yours.' : 'The loop, going round. Slashes are beats: the notes are yours.',
      groove: { title: `${el.name} in ${keyLabel}`, slug: `${slug}-chart`, show: 'chart',
        panels: [{ heading: el.roman, measures: bars, ...(bars.length > 4 ? { barsPerLine: 4 } : {}), ...(el.cadence ? { end: 'final' } : { repeat: true }) }] } });
  }

  // 2. numerals against chords
  // (across the page, numeral over chord, so a five chord element takes no more room than a two chord one)
  blocks.push({ type: 'table', headers: chords.map((c) => c.roman), rows: [chords.map((c) => c.name)] });
  blocks.push({ type: 'callout', label: 'Built from', text: el.builtFrom });
  blocks.push({ type: 'callout', label: 'Listen for', text: k.listen });

  const others = el.homes.filter((h) => !h.own);
  // (the homes sit with the other two callouts: three in a row share one block of space)
  if (others.length) {
    const names = others.map((h) => `${h.label} in ${el.keys[(pc + h.offset) % 12].tonic} ${h.mode}`);
    blocks.push({ type: 'callout', label: others.length > 1 ? 'More than one home' : 'Two homes', text: `The same chords are also heard as ${names.join(', or as ')}. The chords don’t change. The bass decides.` });
  }

  // 3. the notes the chords fix, on the neck
  const b = box(pc);
  const semis = data.semitones;
  const open = { E: 28, A: 33, D: 38, G: 43 };
  const markers = [];
  Object.keys(open).forEach((string) => {
    for (let fret = b.frets[0]; fret <= b.frets[1]; fret++) {
      const deg = el.fixed.filter((d) => (pc + semis[d]) % 12 === (open[string] + fret) % 12)[0];
      if (deg) markers.push({ string, fret, label: SHOWN(deg), ...(deg === '1' ? { role: 'root' } : {}) });
    }
  });
  blocks.push({ type: 'diagram', title: `Figure 2. The notes the chords fix, around ${k.tonic} on the ${b.root.string} string`,
    widthMm: 88,
    caption: `Numbers are steps of the scale from home (${k.tonic} is 1). ${el.open.length ? `Left open by the chords, so yours to choose: ${el.open.map(SHOWN).join(', ')}.` : 'Nothing is left open: every step is fixed by a chord.'}`,
    diagram: { type: 'fretboard', title: `${el.name}: fixed notes in ${keyLabel}`, heading: `${el.roman} in ${keyLabel}`, frets: b.frets, markers,
      showOrientation: false, legendLabels: { root: `Home (${k.tonic})`, tone: 'Fixed by the chords' } } });

  // 5. what to do (the card's own words: the rest is the catalogue's)
  blocks.push({ type: 'link', label: 'Hear it', text: 'Its page in the Guide, with the loop.', url: `${SITE}#guide/${el.id}`, show: 'leithbass.space', steps: [
    `Roots only, in time with the chart. Say each numeral as you land on it: ${chords.map((c) => c.roman).join(', ')}.`,
    'Add one note from Figure 2 to each bar. Choose the one that tells you most about the chord, and notice which it was.',
    others.length ? 'Play it so home is unmistakable. Then make the other home unmistakable, over the same chords.' : 'Sing the line in “Listen for” while you play the roots under it.',
  ] });

  return { title: `${el.roman} · ${el.name}`, slug, kicker: `Harmonic Elements · Stage ${el.stage} · ${el.stageName}`,
    aim: `${keyLabel}. ${el.cadence ? 'A cadence: it arrives.' : 'A loop: it goes round.'}`, blocks };
}

async function main(argv = process.argv.slice(2)) {
  try {
    const data = load();
    if (argv.includes('--list')) {
      let stage = 0;
      for (const el of data.elements) { if (el.stage !== stage) { stage = el.stage; process.stdout.write(`\nStage ${stage}. ${el.stageName}\n`); } process.stdout.write(`  ${el.id.padEnd(28)} ${el.roman.padEnd(22)} ${el.name}\n`); }
      return;
    }
    if (!argv.length || argv[0].startsWith('--')) { process.stdout.write('Usage: node scripts/element.js <id or numerals> [--key C] [--sevenths] [--out-dir dir] [--pdf] [--preview] | --list\n'); return; }
    const at = (flag) => { const i = argv.indexOf(flag); return i > -1 ? argv[i + 1] : undefined; };
    const el = find(data, argv[0]);
    const sheet = card(el, at('--key') || 'C', { data, sevenths: argv.includes('--sevenths') });
    const outDir = path.resolve(at('--out-dir') || 'output');
    fs.mkdirSync(outDir, { recursive: true });
    const file = path.join(outDir, `${sheet.slug}.card.json`);
    fs.writeFileSync(file, `${JSON.stringify(sheet, null, 2)}\n`);
    const { build } = require('./worksheet.js');
    const result = await build(file, outDir, { pdf: argv.includes('--pdf'), preview: argv.includes('--preview') });
    for (const p of Object.values(result)) if (typeof p === 'string' && fs.existsSync(p)) process.stdout.write(`${p}\n`);
    for (const w of result.warnings || []) process.stderr.write(`Page flow: ${w}\n`);
  } catch (error) {
    process.stderr.write(`Error: ${error.message}\n`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();
module.exports = { card, find, load, box };
