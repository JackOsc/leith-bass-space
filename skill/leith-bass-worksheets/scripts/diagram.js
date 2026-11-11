#!/usr/bin/env node
// Leith Bass concept diagrams: fretboards and keyboards drawn from explicit data.
// Same palette, fonts, panel and export path as the notation renderer.
//   node scripts/diagram.js <diagram.json> [--out-dir dir] [--png] [--scale 2] [--embed-fonts]
const fs = require('fs');
const path = require('path');
const { HOUSE, rasterise, embedFonts, parsePitch, pitchName, slugify } = require('./render.js');

const DEFAULT_STRINGS = [
  { name: 'E', openMidi: 28 }, { name: 'A', openMidi: 33 }, { name: 'D', openMidi: 38 }, { name: 'G', openMidi: 43 },
];
const ROLES = {
  root: { shape: 'square', fill: HOUSE.accentInk, text: '#FFFFFF', legend: 'Root' },
  tone: { shape: 'circle', fill: HOUSE.charcoal, text: '#FFFFFF', legend: 'Chord or scale tone' },
  optional: { shape: 'ring', fill: 'none', text: HOUSE.charcoal, legend: 'Optional or passing note' },
  target: { shape: 'diamond', fill: HOUSE.orange, text: HOUSE.charcoal, legend: 'Target note' },
};
const INLAYS = [3, 5, 7, 9, 15, 17, 19, 21];
const DOUBLE_INLAYS = [12, 24];

function fail(message) { throw new Error(message); }
function esc(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function keys(value, allowed, where) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${where} must be an object.`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`${where}: unsupported field ${key}.`);
}

function style(paper, frame) {
  return `<style>
    .heading { font-family: 'Oswald', 'Inter', Arial, sans-serif; font-weight: 700; font-size: 34px; fill: ${HOUSE.charcoal}; letter-spacing: .4px; }
    .note-line { font-family: 'Inter', Arial, sans-serif; font-weight: 400; font-size: 20px; fill: ${HOUSE.muted}; }
    .string-name { font-family: 'Inter', Arial, sans-serif; font-weight: 600; font-size: 21px; fill: ${HOUSE.charcoal}; }
    .fret-number { font-family: 'Inter', Arial, sans-serif; font-weight: 600; font-size: 20px; fill: ${HOUSE.accentInk}; }
    .marker-label { font-family: 'Inter', Arial, sans-serif; font-weight: 600; font-size: 20px; }
    .legend { font-family: 'Inter', Arial, sans-serif; font-weight: 400; font-size: 20px; fill: ${HOUSE.charcoal}; }
    .string { stroke: ${HOUSE.charcoal}; }
    .fret { stroke: ${HOUSE.muted}; stroke-width: 2.4; }
    .nut { stroke: ${HOUSE.charcoal}; stroke-width: 9; }
    .inlay { fill: ${HOUSE.muted}; opacity: .55; }
    .key-white { fill: #FFFFFF; stroke: ${HOUSE.charcoal}; stroke-width: 2.4; }
    .key-black { fill: ${HOUSE.charcoal}; }
  </style>
  ${frame === 'plain'
    ? `<rect x="0" y="0" width="FULLW" height="FULLH" fill="${paper}"/>`
    : `<rect x="3" y="3" width="WIDTH" height="HEIGHT" rx="${HOUSE.borderRadius}" fill="${paper}" stroke="${HOUSE.orange}" stroke-width="4"/>`}`;
}

function marker(role, x, y, label, radius = 17.5) {
  const r = ROLES[role];
  let shape;
  if (r.shape === 'square') shape = `<rect x="${x - radius}" y="${y - radius}" width="${radius * 2}" height="${radius * 2}" rx="4" fill="${r.fill}"/>`;
  else if (r.shape === 'ring') shape = `<circle cx="${x}" cy="${y}" r="${radius - 1.5}" fill="#FFFFFF" stroke="${HOUSE.charcoal}" stroke-width="3"/>`;
  else if (r.shape === 'diamond') shape = `<path d="M ${x} ${y - radius - 4} L ${x + radius + 4} ${y} L ${x} ${y + radius + 4} L ${x - radius - 4} ${y} Z" fill="${r.fill}"/>`;
  else shape = `<circle cx="${x}" cy="${y}" r="${radius}" fill="${r.fill}"/>`;
  const size = label && label.length > 2 ? 16 : 20;
  const text = label ? `<text x="${x}" y="${y + size * 0.36}" text-anchor="middle" class="marker-label" style="font-size:${size}px" fill="${r.text}">${esc(label)}</text>` : '';
  return shape + text;
}

function legend(roles, y, left, labels) {
  let x = left;
  let out = '';
  for (const role of roles) {
    const text = (labels && labels[role]) || ROLES[role].legend;
    out += marker(role, x + 14, y - 6, '', 13);
    out += `<text x="${x + 38}" y="${y}" class="legend">${esc(text)}</text>`;
    x += 38 + text.length * 10.6 + 34;
  }
  return out;
}

// Diagram units: labels are 20 units, so 1 unit = 0.176 mm puts them at 10 pt in print.
const LABEL_UNITS = 20;
function validateCommon(input, autoWidth) {
  if (typeof input.title !== 'string' || !input.title.trim()) fail('title is required.');
  const width = input.width === undefined || input.width === 'auto' ? autoWidth : input.width;
  if (!Number.isInteger(width) || width < 480 || width > 2400) fail('width must be "auto" or an integer from 480 to 2400.');
  const theme = input.theme || 'cream';
  if (!['cream', 'print'].includes(theme)) fail('theme must be cream or print.');
  const frame = input.frame || 'panel';
  if (!['panel', 'plain'].includes(frame)) fail('frame must be panel or plain.');
  if (input.heading !== undefined && typeof input.heading !== 'string') fail('heading must be text.');
  // plain figures go into documents, where the figure title above does the heading's job
  const top = frame === 'plain' ? -64 : 0;
  const side = frame === 'plain' ? 16 : 72;
  return { width, theme, frame, top, side, paper: theme === 'print' ? '#FFFFFF' : HOUSE.cream };
}

// ---------------------------------------------------------------- fretboard
function renderFretboard(input) {
  keys(input, ['$schema', 'type', 'title', 'slug', 'heading', 'altText', 'instrument', 'frets', 'markers', 'accidentalPreference', 'showOrientation', 'legendLabels', 'width', 'theme', 'frame'], 'fretboard');
  const [f0, f1] = Array.isArray(input.frets) ? input.frets : [0, 5];
  const autoWidth = Math.max(480, Math.round(72 + 56 + (f0 === 0 ? 64 : 0) + (f1 - Math.max(f0, 1) + 1) * 84 + 70));
  const { width, paper, frame, top: shift, side } = validateCommon(input, autoWidth);
  const strings = input.instrument ? input.instrument.strings : DEFAULT_STRINGS;
  if (input.instrument) keys(input.instrument, ['name', 'writtenOctaveOffset', 'strings'], 'instrument');
  if (!Array.isArray(strings) || strings.length < 4 || strings.length > 6) fail('instrument.strings must list four to six strings, low to high.');
  strings.forEach((s, i) => {
    keys(s, ['name', 'openMidi'], `instrument.strings[${i}]`);
    if (i && s.openMidi <= strings[i - 1].openMidi) fail('instrument.strings must be ordered from lowest open pitch to highest.');
  });
  const byName = new Map(strings.map((s) => [s.name, s]));
  const [first, last] = input.frets || [0, 5];
  if (!Number.isInteger(first) || !Number.isInteger(last) || first < 0 || last > 24 || last <= first) fail('frets must be [first, last] with 0 <= first < last <= 24.');
  if (last - first > 12) fail('Show at most twelve frets in one diagram; split wider shapes into two diagrams.');
  const pref = input.accidentalPreference || 'sharp';
  const markers = (input.markers || []).map((m, i) => {
    keys(m, ['string', 'fret', 'label', 'role', 'spelling'], `markers[${i}]`);
    if (!byName.has(m.string)) fail(`markers[${i}].string references unknown string "${m.string}".`);
    if (!Number.isInteger(m.fret) || m.fret < first || m.fret > last) fail(`markers[${i}].fret must be an integer within the diagram's fret range.`);
    const role = m.role || 'tone';
    if (!ROLES[role]) fail(`markers[${i}].role must be one of ${Object.keys(ROLES).join(', ')}.`);
    const midi = byName.get(m.string).openMidi + m.fret;
    let name = pitchName(midi + 12, pref).replace(/-?\d+$/, '');
    if (m.spelling !== undefined) {
      const parsed = parsePitch(`${m.spelling}0`);
      if (((parsed.midi - midi) % 12 + 12) % 12 !== 0) fail(`markers[${i}].spelling ${m.spelling} does not match ${m.string} string fret ${m.fret}.`);
      name = `${parsed.letter}${parsed.accidental}`;
    }
    let label = m.label === undefined ? name : m.label;
    if (typeof label !== 'string' || label.length > 3) fail(`markers[${i}].label must be text of at most three characters.`);
    return { ...m, role, label, name };
  });
  const seen = new Set();
  for (const m of markers) {
    const key = `${m.string}:${m.fret}`;
    if (seen.has(key)) fail(`Two markers share ${m.string} string fret ${m.fret}.`);
    seen.add(key);
  }

  const heading = (input.heading || input.title).trim();
  const left = side;
  const right = width - (frame === 'plain' ? 24 : 70);
  const openColumn = first === 0 ? 64 : 0;
  const boardLeft = left + 56 + openColumn;
  const cellCount = last - Math.max(first, 1) + 1;
  const cell = (right - boardLeft) / cellCount;
  if (cell < 58) fail(`Frets are too narrow at width ${width}; show fewer frets or increase width.`);
  const gap = 40;
  const top = (input.showOrientation === false ? 130 : 160) + shift - (frame === 'plain' && input.showOrientation === false ? 30 : 0);
  const rows = [...strings].reverse();
  const yFor = (name) => top + rows.findIndex((s) => s.name === name) * gap;
  const bottom = top + (rows.length - 1) * gap;
  const xFor = (fret) => (fret === 0 ? boardLeft - openColumn / 2 - 6 : boardLeft + (fret - Math.max(first, 1) + 0.5) * cell);

  let body = frame === 'plain' ? '' : `<text x="${left}" y="67" class="heading">${esc(heading)}</text>`;
  if (input.showOrientation !== false) {
    const tuning = strings.map((s) => s.name).join(' ');
    body += `<text x="${left}" y="${104 + shift}" class="note-line">Player's view, as in TAB: highest string at the top. Tuning ${esc(tuning)}.</text>`;
  }
  // side markers under the board, as on the edge of a real neck, so they never sit behind a note marker
  for (let f = Math.max(first, 1); f <= last; f += 1) {
    const x = xFor(f);
    if (INLAYS.includes(f)) body += `<circle cx="${x}" cy="${bottom + 24}" r="5" class="inlay"/>`;
    if (DOUBLE_INLAYS.includes(f)) body += `<circle cx="${x - 9}" cy="${bottom + 24}" r="5" class="inlay"/><circle cx="${x + 9}" cy="${bottom + 24}" r="5" class="inlay"/>`;
  }
  // frets
  for (let f = Math.max(first, 1) - 1; f <= last; f += 1) {
    const x = boardLeft + (f - Math.max(first, 1) + 1) * cell;
    const isNut = f === 0;
    body += `<line x1="${x}" y1="${top - 12}" x2="${x}" y2="${bottom + 12}" class="${isNut ? 'nut' : 'fret'}"/>`;
  }
  // strings: rows run highest string (top) to lowest (bottom), so weight grows with the row
  // index and the lowest-sounding string is always the thickest, as on a real bass.
  rows.forEach((s, i) => {
    const y = top + i * gap;
    const weight = 1.8 + i * 0.7;
    body += `<line x1="${first === 0 ? boardLeft - openColumn : boardLeft}" y1="${y}" x2="${right}" y2="${y}" class="string" stroke-width="${weight.toFixed(2)}"/>`;
    body += `<text x="${left + 8}" y="${y + 7}" class="string-name" data-weight="${weight.toFixed(2)}">${esc(s.name)}</text>`;
  });
  // fret numbers
  const numberY = bottom + 58;
  for (let f = Math.max(first, 1); f <= last; f += 1) {
    body += `<text x="${xFor(f)}" y="${numberY}" text-anchor="middle" class="fret-number">${f}</text>`;
  }
  if (first === 0) body += `<text x="${xFor(0)}" y="${numberY}" text-anchor="middle" class="fret-number">open</text>`;
  // markers
  for (const m of markers) body += marker(m.role, xFor(m.fret), yFor(m.string), m.label);
  const roles = Object.keys(ROLES).filter((r) => markers.some((m) => m.role === r));
  let height = numberY + 40;
  if (roles.length > 1 || (input.legendLabels && roles.length)) {
    body += legend(roles, numberY + 58, left, input.legendLabels);
    height = numberY + 96;
  }
  const altText = input.altText || `${heading}: fretboard diagram, ${strings.length}-string bass, frets ${first} to ${last}. ` +
    markers.map((m) => `${m.string} string fret ${m.fret} (${m.name}${m.role === 'root' ? ', root' : ''})`).join('; ') + '.';
  height = Math.round(height + (frame === 'plain' ? -14 : 0));
  return { svg: wrap(width, height, paper, altText, body, input, frame), width, height, altText, audit: markers.map(({ string, fret, name, label, role }) => ({ string, fret, name, label, role })) };
}

// ---------------------------------------------------------------- keyboard
function renderKeyboard(input) {
  keys(input, ['$schema', 'type', 'title', 'slug', 'heading', 'altText', 'range', 'highlight', 'legendLabels', 'width', 'theme', 'frame'], 'keyboard');
  const [lowName, highName] = input.range || ['C3', 'B3'];
  const low = parsePitch(lowName);
  const high = parsePitch(highName);
  let whiteCount = 0;
  for (let midi = low.midi; midi <= high.midi; midi += 1) if ([0, 2, 4, 5, 7, 9, 11].includes(((midi % 12) + 12) % 12)) whiteCount += 1;
  const { width, paper, frame, top: shift, side } = validateCommon(input, Math.max(480, Math.round(side0(input) + whiteCount * 62 + 70)));
  if (low.accidental || high.accidental) fail('range must start and end on white keys, for example ["C3", "B4"].');
  if (high.midi <= low.midi || high.midi - low.midi > 36) fail('range must span one to three octaves.');
  const whiteLetters = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const whites = [];
  for (let midi = low.midi; midi <= high.midi; midi += 1) if ([0, 2, 4, 5, 7, 9, 11].includes(midi % 12)) whites.push(midi);
  const left = side;
  const right = width - (frame === 'plain' ? 24 : 70);
  const keyW = (right - left) / whites.length;
  if (keyW < 34) fail('Keys are too narrow; shorten the range or increase width.');
  const top = 110 + (frame === 'plain' ? -80 : 0);
  const keyH = Math.min(240, keyW * 4.4);
  const blackW = keyW * 0.6;
  const blackH = keyH * 0.62;
  const heading = (input.heading || input.title).trim();
  const highlights = new Map();
  (input.highlight || []).forEach((h, i) => {
    keys(h, ['pitch', 'label', 'role'], `highlight[${i}]`);
    const p = parsePitch(h.pitch);
    if (p.midi < low.midi || p.midi > high.midi) fail(`highlight[${i}] ${h.pitch} is outside the keyboard range.`);
    const role = h.role || 'tone';
    if (!ROLES[role]) fail(`highlight[${i}].role must be one of ${Object.keys(ROLES).join(', ')}.`);
    if (h.label !== undefined && (typeof h.label !== 'string' || h.label.length > 3)) fail(`highlight[${i}].label must be at most three characters.`);
    if (highlights.has(p.midi)) fail(`Two highlights share ${h.pitch}.`);
    highlights.set(p.midi, { ...h, role, label: h.label === undefined ? `${p.letter}${p.accidental}` : h.label });
  });
  let body = frame === 'plain' ? '' : `<text x="${left}" y="67" class="heading">${esc(heading)}</text>`;
  const whiteX = new Map(whites.map((m, i) => [m, left + i * keyW]));
  whites.forEach((m) => { body += `<rect x="${whiteX.get(m)}" y="${top}" width="${keyW}" height="${keyH}" class="key-white"/>`; });
  const blackX = new Map();
  for (let midi = low.midi; midi <= high.midi; midi += 1) {
    if ([1, 3, 6, 8, 10].includes(midi % 12) && whiteX.has(midi - 1) && whiteX.has(midi + 1)) {
      const x = whiteX.get(midi + 1) - blackW / 2;
      blackX.set(midi, x);
      body += `<rect x="${x}" y="${top}" width="${blackW}" height="${blackH}" rx="3" class="key-black"/>`;
    }
  }
  // letter names on every C for orientation
  whites.forEach((m) => {
    if (m % 12 === 0) body += `<text x="${whiteX.get(m) + keyW / 2}" y="${top + keyH + 32}" text-anchor="middle" class="fret-number">C${Math.floor(m / 12) - 1}</text>`;
  });
  for (const [midi, h] of highlights) {
    let x;
    let y;
    if (whiteX.has(midi)) { x = whiteX.get(midi) + keyW / 2; y = top + keyH - 34; }
    else if (blackX.has(midi)) { x = blackX.get(midi) + blackW / 2; y = top + blackH - 30; }
    else fail(`Cannot place ${midi}: black key at the edge of the range.`);
    const r = Math.min(19, keyW * 0.36);
    body += marker(h.role, x, y, h.label, r);
  }
  const roles = Object.keys(ROLES).filter((r) => [...highlights.values()].some((h) => h.role === r));
  let height = top + keyH + 70;
  if (roles.length > 1 || (input.legendLabels && roles.length)) { body += legend(roles, top + keyH + 80, left, input.legendLabels); height = top + keyH + 116; }
  const altText = input.altText || `${heading}: keyboard from ${lowName} to ${highName}. Highlighted: ` +
    [...highlights.values()].map((h) => h.pitch).join(', ') + '.';
  return { svg: wrap(width, height, paper, altText, body, input, frame), width, height, altText, audit: [...highlights.values()].map(({ pitch, label, role }) => ({ pitch, label, role })) };
}

function side0(input) { return (input.frame || 'panel') === 'plain' ? 16 : 72; }

function wrap(width, height, paper, altText, body, input, frame) {
  const id = slugify(input.slug || input.title);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${id}-title">
  <title id="${id}-title">${esc(altText)}</title>
  ${style(paper, frame).replace('WIDTH', width - 6).replace('HEIGHT', height - 6).replace('FULLW', width).replace('FULLH', height)}
  ${body}
</svg>
`;
}

function renderDiagram(input) {
  if (!input || typeof input !== 'object') fail('diagram must be an object.');
  if (input.type === 'fretboard') return renderFretboard(input);
  if (input.type === 'keyboard') return renderKeyboard(input);
  return fail('type must be "fretboard" or "keyboard".');
}

function renderDiagramFiles(input, outDir, options = {}) {
  const result = renderDiagram(input);
  const slug = slugify(input.slug || input.title);
  if (!slug) fail('slug must contain a letter or number.');
  fs.mkdirSync(outDir, { recursive: true });
  const svgPath = path.join(outDir, `${slug}.svg`);
  fs.writeFileSync(svgPath, options.embedFonts ? embedFonts(result.svg) : result.svg);
  const files = { svg: path.basename(svgPath) };
  if (options.png) {
    const pngPath = path.join(outDir, `${slug}.png`);
    rasterise(svgPath, pngPath, result.width, options.scale || 1);
    files.png = path.basename(pngPath);
  }
  const manifest = { kind: input.type, title: input.title, slug, altText: result.altText, files, dimensions: { width: result.width, height: result.height }, audit: result.audit };
  fs.writeFileSync(path.join(outDir, `${slug}-manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`);
  return { ...result, files, svgPath, manifest };
}

function main(argv = process.argv.slice(2)) {
  try {
    if (!argv.length || argv.includes('--help')) {
      process.stdout.write('Usage: node scripts/diagram.js <diagram.json> [--out-dir dir] [--png] [--scale N] [--embed-fonts] [--check]\n');
      return;
    }
    const input = JSON.parse(fs.readFileSync(argv[0], 'utf8'));
    let outDir = path.resolve('output');
    const options = { png: argv.includes('--png'), embedFonts: argv.includes('--embed-fonts'), scale: 1 };
    const o = argv.indexOf('--out-dir'); if (o > -1) outDir = path.resolve(argv[o + 1]);
    const sc = argv.indexOf('--scale'); if (sc > -1) options.scale = Number(argv[sc + 1]);
    if (argv.includes('--check')) { renderDiagram(input); process.stdout.write(`Valid: ${argv[0]}\n`); return; }
    const r = renderDiagramFiles(input, outDir, options);
    process.stdout.write(`${r.svgPath}\n`);
  } catch (error) {
    process.stderr.write(`Error: ${error.message}\n`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();
module.exports = { renderDiagram, renderDiagramFiles, LABEL_UNITS };
