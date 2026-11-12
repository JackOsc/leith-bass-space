#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const glyphFile = path.join(__dirname, '..', 'assets', 'bravura-glyphs.json');
const bravura = JSON.parse(fs.readFileSync(glyphFile, 'utf8')).glyphs;

// Geometry in drawing units. One staff space is always 24 units; everything else is sized
// against it, so a figure can be printed at any physical staff size without changing its
// proportions. In print the worksheet builder maps units to millimetres from a chosen staff
// space (1.8 mm by default, close to standard engraving), which puts labels at about 10 pt.
const HOUSE = Object.freeze({
  width: 1600,
  maxWidth: 3600,
  cream: '#F5EFE2',
  charcoal: '#292724',
  orange: '#D86B25',
  accentInk: '#A84912',
  muted: '#6A645C',
  borderWidth: 5,
  borderRadius: 26,
  staffGap: 24,
  tabGap: 42,
  stemLength: 84,
  type: { heading: 58, label: 46, name: 46, finger: 46, tab: 44, tabClef: 40, rowLabel: 30, orientation: 38 },
  pad: { panel: 44, plain: 12 },
});

const DEFAULT_INSTRUMENT = Object.freeze({
  name: 'standard four-string bass',
  writtenOctaveOffset: 12,
  strings: [
    { name: 'E', openMidi: 28 },
    { name: 'A', openMidi: 33 },
    { name: 'D', openMidi: 38 },
    { name: 'G', openMidi: 43 },
  ],
});

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const LETTER_INDEX = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
const NATURAL_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function fail(message) {
  throw new Error(message);
}

// Music signs in words people read (3.1). "Bb" and "F#" in a heading, a label or a sentence are shown with the real
// flat and sharp signs, which Inter and Oswald do not have: the two small "LBS Signs" fonts carry them. Data is
// untouched: pitches in JSON stay "Bb2". A flat is only taken as one where a note or chord name can end
// ("Bb", "Bb7", "Bbm", "Bbmaj7", "Ab major"), so a word such as "Abbey" is left alone. A sign typed as itself is kept.
function signs(value) {
  return String(value)
    .replace(/(^|[^A-Za-z])([A-G])(bb|b)(?=$|[^a-z#b]|m(?:aj|in|\d|[^a-z]|$)|dim|sus|aug|add)/g, (m, pre, letter, acc) => pre + letter + acc.replace(/b/g, '\u266D'))
    .replace(/(^|[^A-Za-z])([A-G])(##|#)/g, (m, pre, letter, acc) => pre + letter + acc.replace(/#/g, '\u266F'));
}
// Text for the page: signs first, then made safe for SVG. The bundled Inter and Oswald carry the three signs
// themselves (tools/add-signs-to-fonts.py in the site repository), because the renderer sets a whole label in one
// font: with the signs in a font of their own, "Home (B♭)" came out in DejaVu Sans Mono from end to end.
function show(value) { return esc(signs(value)); }

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function pitchName(midi, preference = 'sharp') {
  const names = preference === 'flat' ? FLAT_NAMES : SHARP_NAMES;
  return `${names[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

function parsePitch(value) {
  const normalized = String(value).replace(/♯/g, '#').replace(/♭/g, 'b');
  const match = normalized.match(/^([A-G])([#b]?)(-?\d+)$/);
  if (!match) fail(`Invalid pitch spelling "${value}"; use forms such as C#3 or Bb2.`);
  const [, letter, accidental, octaveText] = match;
  const octave = Number(octaveText);
  const delta = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  const midi = (octave + 1) * 12 + NATURAL_PC[letter] + delta;
  return { raw: `${letter}${accidental}${octave}`, letter, accidental, octave, midi };
}

function keys(value, allowed, location) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${location} must be an object.`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`${location}: unsupported field ${key}.`);
}

function normalizeInstrument(input = {}) {
  keys(input, ['name', 'writtenOctaveOffset', 'strings'], 'instrument');
  const instrument = {
    name: input.name || DEFAULT_INSTRUMENT.name,
    writtenOctaveOffset:
      input.writtenOctaveOffset === undefined
        ? DEFAULT_INSTRUMENT.writtenOctaveOffset
        : input.writtenOctaveOffset,
    strings: input.strings || DEFAULT_INSTRUMENT.strings,
  };

  if (!Number.isInteger(instrument.writtenOctaveOffset)) {
    fail('instrument.writtenOctaveOffset must be an integer number of semitones.');
  }
  if (!Array.isArray(instrument.strings) || (instrument.strings.length < 4 || instrument.strings.length > 6)) {
    fail('instrument.strings must contain four to six strings, ordered low to high.');
  }

  const names = new Set();
  let previousMidi = -Infinity;
  instrument.strings = instrument.strings.map((string, index) => {
    keys(string, ['name', 'openMidi'], `instrument.strings[${index}]`);
    if (!string || typeof string.name !== 'string' || !string.name.trim()) {
      fail(`instrument.strings[${index}].name must be a non-empty string.`);
    }
    if (!Number.isInteger(string.openMidi) || string.openMidi < 0 || string.openMidi > 127) {
      fail(`instrument.strings[${index}].openMidi must be a MIDI integer from 0 to 127.`);
    }
    if (names.has(string.name)) fail(`Duplicate string name "${string.name}".`);
    if (string.openMidi <= previousMidi) {
      fail('instrument.strings must be ordered from lowest open pitch to highest.');
    }
    names.add(string.name);
    previousMidi = string.openMidi;
    return { name: string.name, openMidi: string.openMidi };
  });
  return instrument;
}

function expandMeasure(measure, panelIndex, measureIndex) {
  const location = `panels[${panelIndex}].measures[${measureIndex}]`;
  if (!measure || typeof measure !== 'object') fail(`${location} must be an object.`);

  keys(measure, ['label','string','frets','fingers','spellings','courtesy','notes','incomplete'], location);
  if (measure.notes !== undefined && ['string','frets','fingers','spellings','courtesy'].some(key => measure[key] !== undefined)) fail(`${location}: use notes or compact form, not both.`);
  if (measure.incomplete !== undefined && typeof measure.incomplete !== 'boolean') fail(`${location}.incomplete must be boolean.`);
  if (measure.label !== undefined && typeof measure.label !== 'string') fail(`${location}.label must be text.`);
  if (Array.isArray(measure.notes)) {
    return {
      label: measure.label,
      incomplete: measure.incomplete || false,
      notes: measure.notes.map((note, noteIndex) => {
        if (!note || typeof note !== 'object') fail(`${location}.notes[${noteIndex}] must be an object.`);
        return { ...note };
      }),
    };
  }

  if (typeof measure.string !== 'string' || !Array.isArray(measure.frets)) {
    fail(`${location} needs either notes[] or the shorthand string + frets[].`);
  }
  for (const key of ['fingers','spellings','courtesy']) if (measure[key] !== undefined && !Array.isArray(measure[key])) fail(`${location}.${key} must be an array.`);
  const fingers = measure.fingers || [];
  const spellings = measure.spellings || [];
  const courtesy = measure.courtesy || [];
  if (courtesy.length && courtesy.length !== measure.frets.length) {
    fail(`${location}.courtesy must be empty or match the length of frets.`);
  }
  if (fingers.length && fingers.length !== measure.frets.length) {
    fail(`${location}.fingers must be empty or match the length of frets.`);
  }
  if (spellings.length && spellings.length !== measure.frets.length) {
    fail(`${location}.spellings must be empty or match the length of frets.`);
  }
  return {
    label: measure.label,
    incomplete: measure.incomplete || false,
    notes: measure.frets.map((fret, index) => ({
      string: measure.string,
      fret,
      finger: fingers[index],
      spelling: spellings[index],
      courtesy: courtesy[index],
    })),
  };
}

function loadAndValidate(specPath) {
  let input;
  try {
    input = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  } catch (error) {
    fail(`Could not read ${specPath}: ${error.message}`);
  }
  return validateSpec(input);
}

function validateSpec(input) {
  keys(input, ['$schema','title','slug','timeSignature','accidentalPreference','instrument','panels','noteNames','theme','width','maxWidth','layout','frame','show','rowLabels'], 'specification');
  // layout is kept for old files; version 3 always sizes height to the music.
  const layoutMode = input.layout === undefined ? 'compact' : input.layout;
  if (!['standard', 'compact'].includes(layoutMode)) fail('layout must be standard or compact.');
  if (input.noteNames !== undefined && typeof input.noteNames !== 'boolean') fail('noteNames must be boolean.');
  const maxWidth = input.maxWidth === undefined ? 2400 : input.maxWidth;
  if (!Number.isInteger(maxWidth) || maxWidth < 600 || maxWidth > HOUSE.maxWidth) fail(`maxWidth must be an integer from 600 to ${HOUSE.maxWidth}.`);
  const width = input.width === undefined ? 'auto' : input.width;
  if (width !== 'auto' && (!Number.isInteger(width) || width < 600 || width > HOUSE.maxWidth)) fail(`width must be "auto" or an integer from 600 to ${HOUSE.maxWidth}.`);
  const theme = input.theme || 'cream';
  if (!['cream','print'].includes(theme)) fail('theme must be cream or print.');
  const frame = input.frame || 'panel';
  if (!['panel','plain'].includes(frame)) fail('frame must be panel (bordered, with heading, for the web) or plain (no border or heading, for documents).');
  const show = input.show || 'both';
  if (!['both','notation','tab'].includes(show)) fail('show must be both, notation or tab.');
  if (input.rowLabels !== undefined && typeof input.rowLabels !== 'boolean') fail('rowLabels must be boolean.');
  if (typeof input.title !== 'string' || !input.title.trim()) fail('title is required.');
  const slug = slugify(input.slug || input.title);
  if (!slug) fail('slug must contain at least one letter or number.');

  const instrument = normalizeInstrument(input.instrument);
  const stringMap = new Map(instrument.strings.map((string) => [string.name, string]));
  const accidentalPreference = input.accidentalPreference || 'sharp';
  if (!['sharp', 'flat'].includes(accidentalPreference)) {
    fail('accidentalPreference must be "sharp" or "flat".');
  }

  const timeSignature = input.timeSignature === undefined ? [4, 4] : input.timeSignature;
  if (timeSignature !== null && (!Array.isArray(timeSignature) || timeSignature.length !== 2 || !Number.isInteger(timeSignature[0]) || timeSignature[0] < 1 || timeSignature[0] > 9 || timeSignature[1] !== 4)) {
    fail('timeSignature must be [1–9, 4] for quarter notes, or null for an unmetered pitch study.');
  }

  if (!Array.isArray(input.panels) || input.panels.length === 0) fail('panels must contain at least one panel.');
  const panelSlugs = new Set();
  const panels = input.panels.map((panel, panelIndex) => {
    keys(panel, ['heading','slug','altText','description','measures','repeat'], `panels[${panelIndex}]`);
    if (panel.repeat !== undefined && typeof panel.repeat !== 'boolean') fail(`panels[${panelIndex}].repeat must be true or false.`);
    for (const key of ['altText','description']) if (panel[key] !== undefined && typeof panel[key] !== 'string') fail(`panel.${key} must be text.`);
    if (typeof panel.heading !== 'string' || !panel.heading.trim()) {
      fail(`panels[${panelIndex}].heading is required.`);
    }
    const panelSlug = slugify(panel.slug || panel.heading);
    if (!panelSlug) fail(`panels[${panelIndex}].slug must contain a letter or number.`);
    if (panelSlugs.has(panelSlug)) fail(`Duplicate panel slug "${panelSlug}".`);
    panelSlugs.add(panelSlug);
    if (!Array.isArray(panel.measures) || panel.measures.length === 0 || panel.measures.length > 6) {
      fail(`panels[${panelIndex}].measures must contain between 1 and 6 measures.`);
    }

    const measures = panel.measures.map((measure, measureIndex) => {
      const expanded = expandMeasure(measure, panelIndex, measureIndex);
      if (expanded.notes.length === 0 || expanded.notes.length > 8) {
        fail(`panels[${panelIndex}].measures[${measureIndex}] must contain between 1 and 8 notes.`);
      }
      if (timeSignature && expanded.notes.length !== timeSignature[0] && !(expanded.incomplete && expanded.notes.length < timeSignature[0])) fail(`Panel ${panelIndex + 1}, measure ${measureIndex + 1}: quarter-note count must equal ${timeSignature[0]}; mark a shorter pickup incomplete:true, or use timeSignature:null for a pitch study.`);
      const notes = expanded.notes.map((note, noteIndex) => {
        const location = `panels[${panelIndex}].measures[${measureIndex}].notes[${noteIndex}]`;
        keys(note, ['string','fret','finger','spelling','courtesy'], location);
        if (note.courtesy !== undefined && typeof note.courtesy !== 'boolean') fail(`${location}.courtesy must be true or false.`);
        if (!stringMap.has(note.string)) fail(`${location}.string references unknown string "${note.string}".`);
        if (!Number.isInteger(note.fret) || note.fret < 0 || note.fret > 36) {
          fail(`${location}.fret must be an integer from 0 to 36.`);
        }
        if (note.finger !== undefined && note.finger !== null && ![1, 2, 3, 4].includes(note.finger)) {
          fail(`${location}.finger must be 1, 2, 3, 4, null, or omitted.`);
        }
        const soundingMidi = stringMap.get(note.string).openMidi + note.fret;
        const writtenMidi = soundingMidi + instrument.writtenOctaveOffset;
        if (soundingMidi > 127) fail(`${location} produces a sounding pitch outside MIDI range.`);
        if (writtenMidi < 0 || writtenMidi > 127) fail(`${location} produces a written pitch outside the MIDI range.`);
        const spelling = note.spelling || pitchName(writtenMidi, accidentalPreference);
        const parsed = parsePitch(spelling);
        if (parsed.midi !== writtenMidi) {
          fail(`${location}.spelling is ${spelling}, but tuning + fret + written offset produces ${pitchName(writtenMidi, accidentalPreference)}.`);
        }
        return {
          string: note.string,
          fret: note.fret,
          finger: note.finger ?? null,
          soundingMidi,
          soundingPitch: instrument.writtenOctaveOffset % 12 === 0
            ? `${parsed.letter}${parsed.accidental}${parsed.octave - instrument.writtenOctaveOffset / 12}`
            : pitchName(soundingMidi, accidentalPreference),
          writtenMidi,
          writtenPitch: parsed.raw,
          courtesy: note.courtesy === true,
          parsed,
        };
      });
      return {
        incomplete: expanded.incomplete,
        label: expanded.label ?? '',
        notes,
      };
    });

    return {
      slug: panelSlug,
      heading: panel.heading.trim(),
      altText:
        panel.altText ||
        `${panel.heading.trim()}: ${input.title.trim()} for ${instrument.name} in standard bass-clef notation and TAB.`,
      description: panel.description || panel.altText || `${input.title.trim()}, ${panel.heading.trim().toLowerCase()}.`,
      repeat: panel.repeat === true,
      measures,
    };
  });

  const result = {
    title: input.title.trim(),
    slug,
    instrument,
    timeSignature,
    width,
    maxWidth,
    noteNames: input.noteNames || false,
    theme,
    frame,
    show,
    rowLabels: input.rowLabels === undefined ? frame === 'panel' : input.rowLabels,
    layout: layoutMode,
    accidentalPreference,
    panels,
  };
  // "auto" width: every panel of one exercise shares the widest natural width, so stacked
  // panels line up bar for bar. Capped at maxWidth; crowding is then caught at render time.
  if (width === 'auto') {
    result.width = Math.min(maxWidth, Math.max(...panels.map((panel) => naturalWidth(result, panel))));
  }
  return result;
}

function line(x1, y1, x2, y2, cls) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"/>`;
}

function glyph(name, x, y, scale, color = HOUSE.charcoal) {
  const item = bravura[name];
  if (!item) fail(`Missing Bravura glyph ${name}.`);
  return `<path d="${item.path}" transform="translate(${x} ${y}) scale(${scale} ${-scale})" fill="${color}"/>`;
}

function centeredGlyph(name, centerX, y, scale) {
  const item = bravura[name];
  const center = ((item.bounds[0] + item.bounds[2]) / 2) * scale;
  return glyph(name, centerX - center, y, scale);
}

function diatonicIndex(parsed) {
  return parsed.octave * 7 + LETTER_INDEX[parsed.letter];
}

const CAP = 0.73; // cap height of Inter and DejaVu Sans Mono as a fraction of font size

// Horizontal frame: where the staff starts, where the clef and time signature sit, where bar 1 begins.
function horizontal(spec) {
  const plain = spec.frame === 'plain';
  const pad = plain ? HOUSE.pad.plain : HOUSE.pad.panel;
  const left = plain ? pad : pad + 26;
  const right = spec.width - (plain ? pad + 2 : pad + 26);
  const S = HOUSE.staffGap;
  const scale = S / 250;
  const both = spec.show === 'both';
  const startLine = both;
  if (spec.show === 'tab') {
    const clefX = left + 20;
    const tsX = left + 80;
    return { left, right, startLine: false, clefX, tsX, measureStart: spec.timeSignature ? left + 108 : left + 50 };
  }
  const clefX = left + (startLine ? 14 : 2);
  const clefW = bravura.fClef.bounds[2] * scale;
  const tsHalf = spec.timeSignature ? 22 : 0;
  const tsX = clefX + clefW + 14 + tsHalf;
  const measureStart = spec.timeSignature ? tsX + tsHalf + 12 : clefX + clefW + 16;
  return { left, right, startLine, clefX, tsX, measureStart };
}

const LEAD = 12; // space after a barline before the first note slot
const REPEAT_ROOM = 40;
function slotSizes(spec) {
  return { natural: spec.noteNames ? 112 : 100, minimum: spec.noteNames ? 84 : 70 };
}

function naturalWidth(spec, panel) {
  const h = horizontal({ ...spec, width: 10000 });
  const { natural } = slotSizes(spec);
  const music = panel.measures.reduce((sum, m) => sum + LEAD + m.notes.length * natural + 8, 0) + (panel.repeat ? 2 * REPEAT_ROOM : 0);
  const headingWidth = spec.frame === 'panel' ? panel.heading.length * 0.5 * HOUSE.type.heading + 2 * h.left : 0;
  return Math.ceil(Math.max(headingWidth, h.measureStart + music + (10000 - h.right)));
}

// x positions of every note slot, shared by staff, name row, finger row and TAB.
function measureGeometry(spec, panel, h) {
  const width = (h.right - h.measureStart) / panel.measures.length;
  const { minimum } = slotSizes(spec);
  return panel.measures.map((measure, index) => {
    const start = h.measureStart + index * width;
    const end = start + width;
    const contentStart = start + LEAD + (panel.repeat && index === 0 ? REPEAT_ROOM : 0);
    const contentEnd = end - (panel.repeat && index === panel.measures.length - 1 ? REPEAT_ROOM : 0);
    const slot = (contentEnd - contentStart) / measure.notes.length;
    if (slot < minimum) {
      fail(`Panel "${panel.slug}", bar ${index + 1} is too crowded at width ${spec.width} (${Math.round(slot)} units per note, minimum ${minimum}). Use fewer bars per panel, or a wider figure.`);
    }
    const labelWidth = (measure.label || '').length * 0.62 * HOUSE.type.label;
    if (labelWidth > width - 16) fail(`Measure label is too long for its bar: ${measure.label}`);
    return { start, end, xs: measure.notes.map((_, i) => contentStart + (i + 0.5) * slot) };
  });
}

function relativeY(note) {
  const bottomLineIndex = 2 * 7 + LETTER_INDEX.G;
  return HOUSE.staffGap * 4 - (diatonicIndex(note.parsed) - bottomLineIndex) * (HOUSE.staffGap / 2);
}

function layoutFor(panel, spec) {
  const S = HOUSE.staffGap;
  const T = HOUSE.type;
  const plain = spec.frame === 'plain';
  const pad = plain ? HOUSE.pad.plain : HOUSE.pad.panel;
  const top = plain ? pad : pad + T.heading + 30;
  const hasLabels = panel.measures.some((m) => m.label);
  const hasFingers = panel.measures.some((m) => m.notes.some((n) => n.finger !== null));
  const notation = spec.show !== 'tab';
  const tab = spec.show !== 'notation';
  const strings = spec.instrument.strings.length;
  const out = { top, hasLabels, hasFingers, notation, tab };
  let cursor = top;
  if (hasLabels) { out.labelY = cursor + T.label * CAP; cursor = out.labelY + 18; }
  if (notation) {
    let minRel = 0;
    let maxRel = 4 * S;
    for (const m of panel.measures) for (const n of m.notes) {
      const rel = relativeY(n);
      const stemUp = rel > 2 * S;
      const stems = Boolean(spec.timeSignature);
      minRel = Math.min(minRel, stems && stemUp ? rel - HOUSE.stemLength : rel - 14, n.parsed.accidental || n.courtesy ? rel - 44 : 0);
      maxRel = Math.max(maxRel, stems && !stemUp ? rel + HOUSE.stemLength : rel + 14, n.parsed.accidental || n.courtesy ? rel + 34 : 0);
    }
    // the clef reaches a little above the top line
    minRel = Math.min(minRel, -6);
    out.staffTop = Math.ceil(cursor - minRel + (hasLabels ? 4 : 0));
    out.staffBottom = out.staffTop + 4 * S;
    cursor = out.staffTop + maxRel + 20;
  }
  const rows = () => {
    if (spec.noteNames) { out.nameY = cursor + T.name * CAP; cursor = out.nameY + 16; }
    if (hasFingers) { out.fingerY = cursor + T.finger * CAP; cursor = out.fingerY + 16; }
  };
  if (notation) rows();
  if (tab) {
    out.tabTop = Math.ceil(cursor + (notation ? 26 : 22) + T.tab * CAP / 2);
    out.tabBottom = out.tabTop + HOUSE.tabGap * (strings - 1);
    cursor = out.tabBottom + T.tab * CAP / 2 + 22;
    if (!notation) rows();
  }
  out.height = Math.ceil(cursor + (plain ? pad - 6 : pad));
  return out;
}

function noteY(note, layout) {
  return layout.staffTop + relativeY(note);
}

function ledgerLines(x, y, layout) {
  let output = '';
  const S = HOUSE.staffGap;
  for (let ledgerY = layout.staffTop - S; ledgerY >= y - 1; ledgerY -= S) output += line(x - 24, ledgerY, x + 24, ledgerY, 'ledger');
  for (let ledgerY = layout.staffBottom + S; ledgerY <= y + 1; ledgerY += S) output += line(x - 24, ledgerY, x + 24, ledgerY, 'ledger');
  return output;
}

function accidentalGlyph(accidental, x, y, scale, headHalfWidth) {
  const names = { '#': 'accidentalSharp', b: 'accidentalFlat', natural: 'accidentalNatural' };
  const name = names[accidental];
  if (!name) return '';
  const item = bravura[name];
  const rightEdge = x - headHalfWidth - 5;
  const originX = rightEdge - item.bounds[2] * scale;
  return glyph(name, originX, y, scale);
}

// Repeat barline: thick + thin line with two dots, facing into the repeated music.
function repeatBar(x, yTop, yBottom, dotYs, facing) {
  const thick = 9;
  const thickX = facing === 'end' ? x - thick / 2 : x + thick / 2;
  const thinX = facing === 'end' ? x - thick - 8 : x + thick + 8;
  const dotX = facing === 'end' ? thinX - 13 : thinX + 13;
  let out = `<line x1="${thickX}" y1="${yTop}" x2="${thickX}" y2="${yBottom}" stroke="${HOUSE.charcoal}" stroke-width="${thick}"/>`;
  out += line(thinX, yTop, thinX, yBottom, 'bar');
  for (const y of dotYs) out += `<circle cx="${dotX}" cy="${y}" r="4.6" fill="${HOUSE.charcoal}"/>`;
  return out;
}

function renderPanel(spec, panel) {
  const S = HOUSE.staffGap;
  const T = HOUSE.type;
  const h = horizontal(spec);
  const layout = layoutFor(panel, spec);
  const width = spec.width;
  const paper = spec.theme === 'print' ? '#FFFFFF' : HOUSE.cream;
  const plain = spec.frame === 'plain';
  if (!plain && panel.heading.length * 0.5 * T.heading > width - 2 * h.left) fail('Panel heading is too long; shorten it or increase the width.');
  const notationScale = S / 250;
  const head = bravura.noteheadBlack;
  const headHalfWidth = ((head.bounds[2] - head.bounds[0]) * notationScale) / 2;
  const stringRows = [...spec.instrument.strings].reverse();
  const stringY = new Map(stringRows.map((string, index) => [string.name, layout.tabTop + index * HOUSE.tabGap]));
  const geometry = measureGeometry(spec, panel, h);
  const id = `${esc(spec.slug)}-${esc(panel.slug)}`;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${layout.height}" viewBox="0 0 ${width} ${layout.height}" role="img" aria-labelledby="${id}-title ${id}-desc">
  <title id="${id}-title">${esc(panel.altText)}</title>
  <desc id="${id}-desc">${esc(panel.description)}</desc>
  ${plain
    ? `<rect x="0" y="0" width="${width}" height="${layout.height}" fill="${paper}"/>`
    : `<rect x="${HOUSE.borderWidth / 2 + 1}" y="${HOUSE.borderWidth / 2 + 1}" width="${width - HOUSE.borderWidth - 2}" height="${layout.height - HOUSE.borderWidth - 2}" rx="${HOUSE.borderRadius}" fill="${paper}" stroke="${HOUSE.orange}" stroke-width="${HOUSE.borderWidth}"/>`}
  <style>
    .heading { font-family: 'Oswald', 'Inter', 'DejaVu Sans', Arial, sans-serif; font-weight: 700; font-size: ${T.heading}px; fill: ${HOUSE.charcoal}; letter-spacing: .4px; }
    .measure-label { font-family: 'Inter', 'DejaVu Sans', Arial, sans-serif; font-weight: 600; font-size: ${T.label}px; fill: ${HOUSE.accentInk}; }
    .note-name { font-family: 'Inter', 'DejaVu Sans', Arial, sans-serif; font-weight: 600; font-size: ${T.name}px; fill: ${HOUSE.charcoal}; }
    .finger { font-family: 'Inter', 'DejaVu Sans', Arial, sans-serif; font-weight: 600; font-size: ${T.finger}px; fill: ${HOUSE.accentInk}; }
    .tab-number { font-family: 'DejaVu Sans Mono', monospace; font-weight: 700; font-size: ${T.tab}px; fill: ${HOUSE.charcoal}; }
    .tab-label { font-family: 'Inter', 'DejaVu Sans', Arial, sans-serif; font-weight: 600; font-size: ${T.tabClef}px; fill: ${HOUSE.charcoal}; }
    .section-label { font-family: 'Inter', 'DejaVu Sans', Arial, sans-serif; font-weight: 600; font-size: ${T.rowLabel}px; fill: ${HOUSE.muted}; letter-spacing: 1px; }
    .music-line { stroke: ${HOUSE.charcoal}; stroke-width: 2.4; }
    .ledger { stroke: ${HOUSE.charcoal}; stroke-width: 2.8; }
    .stem { stroke: ${HOUSE.charcoal}; stroke-width: 2.8; }
    .bar { stroke: ${HOUSE.charcoal}; stroke-width: 3; }
  </style>
`;
  if (!plain) svg += `  <text x="${h.left}" y="${HOUSE.pad.panel + T.heading * CAP + 4}" class="heading">${show(panel.heading)}</text>\n`;

  // measure labels (chord symbols) sit over the first note of the bar
  panel.measures.forEach((measure, i) => {
    if (!measure.label) return;
    svg += `<text x="${geometry[i].xs[0] - headHalfWidth}" y="${layout.labelY}" class="measure-label">${show(measure.label)}</text>`;
  });

  if (layout.notation) {
    for (let index = 0; index < 5; index += 1) {
      const y = layout.staffTop + index * S;
      svg += line(h.left, y, h.right, y, 'music-line');
    }
    svg += glyph('fClef', h.clefX, layout.staffTop + S, notationScale);
    if (spec.timeSignature) {
      svg += centeredGlyph(`timeSig${spec.timeSignature[0]}`, h.tsX, layout.staffTop + S, notationScale);
      svg += centeredGlyph(`timeSig${spec.timeSignature[1]}`, h.tsX, layout.staffTop + S * 3, notationScale);
    }
    panel.measures.forEach((measure, measureIndex) => {
      const g = geometry[measureIndex];
      const accidentalState = new Map();
      measure.notes.forEach((note, noteIndex) => {
        const x = g.xs[noteIndex];
        const y = noteY(note, layout);
        const accidentalKey = `${note.parsed.letter}${note.parsed.octave}`;
        const previous = accidentalState.get(accidentalKey) || '';
        const desired = note.parsed.accidental;
        let shownAccidental = '';
        if (desired !== previous || note.courtesy) shownAccidental = desired || 'natural';
        accidentalState.set(accidentalKey, desired);
        const stemDown = y <= layout.staffBottom - S * 2;
        const headOriginX = x - ((head.bounds[0] + head.bounds[2]) / 2) * notationScale;
        const stem = stemDown
          ? line(x - headHalfWidth + 1.4, y + 2, x - headHalfWidth + 1.4, y + HOUSE.stemLength, 'stem')
          : line(x + headHalfWidth - 1.4, y - 2, x + headHalfWidth - 1.4, y - HOUSE.stemLength, 'stem');
        svg += `<g class="note" data-string="${esc(note.string)}" data-fret="${note.fret}" data-sounding-pitch="${esc(note.soundingPitch)}" data-written-pitch="${esc(note.writtenPitch)}">`;
        svg += ledgerLines(x, y, layout);
        svg += accidentalGlyph(shownAccidental, x, y, notationScale, headHalfWidth);
        svg += glyph('noteheadBlack', headOriginX, y, notationScale);
        if (spec.timeSignature) svg += stem;
        svg += '</g>';
      });
      if (!(panel.repeat && measureIndex === panel.measures.length - 1)) svg += line(g.end, layout.staffTop, g.end, layout.staffBottom, 'bar');
    });
    if (panel.repeat) {
      const dots = [layout.staffTop + 1.5 * S, layout.staffTop + 2.5 * S];
      svg += repeatBar(geometry[0].start + 2, layout.staffTop, layout.staffBottom, dots, 'start');
      svg += repeatBar(geometry[geometry.length - 1].end, layout.staffTop, layout.staffBottom, dots, 'end');
    }
  }

  // NOTE and FINGER rows share the notes' x positions
  panel.measures.forEach((measure, measureIndex) => {
    measure.notes.forEach((note, noteIndex) => {
      const x = geometry[measureIndex].xs[noteIndex];
      if (spec.noteNames) svg += `<text x="${x}" y="${layout.nameY}" text-anchor="middle" class="note-name">${show(note.parsed.letter + note.parsed.accidental)}</text>`;
      if (note.finger !== null) svg += `<text x="${x}" y="${layout.fingerY}" text-anchor="middle" class="finger">${note.finger}</text>`;
    });
  });
  if (spec.rowLabels) {
    const labelX = geometry[0].xs[0] - 44;
    if (spec.noteNames) svg += `<text x="${labelX}" y="${layout.nameY - 4}" text-anchor="end" class="section-label">NOTE</text>`;
    if (layout.hasFingers) svg += `<text x="${labelX}" y="${layout.fingerY - 4}" text-anchor="end" class="section-label">FINGER</text>`;
  }

  if (layout.tab) {
    for (let index = 0; index < stringRows.length; index += 1) {
      const y = layout.tabTop + index * HOUSE.tabGap;
      svg += line(h.left, y, h.right, y, 'music-line');
    }
    const tabCenterY = (layout.tabTop + layout.tabBottom) / 2;
    const step = Math.min(T.tabClef + 2, (layout.tabBottom - layout.tabTop) / 2.6);
    const tabClefX = layout.notation ? h.clefX + 22 : h.clefX;
    ['T', 'A', 'B'].forEach((letter, index) => {
      svg += `<text x="${tabClefX}" y="${tabCenterY + (index - 1) * step + (T.tabClef * CAP) / 2}" text-anchor="middle" class="tab-label">${letter}</text>`;
    });
    if (!layout.notation && spec.timeSignature) {
      svg += centeredGlyph(`timeSig${spec.timeSignature[0]}`, h.tsX, tabCenterY - S, notationScale);
      svg += centeredGlyph(`timeSig${spec.timeSignature[1]}`, h.tsX, tabCenterY + S, notationScale);
    }
    panel.measures.forEach((measure, measureIndex) => {
      const g = geometry[measureIndex];
      measure.notes.forEach((note, noteIndex) => {
        const x = g.xs[noteIndex];
        const y = stringY.get(note.string);
        const w = String(note.fret).length > 1 ? 56 : 32;
        svg += `<rect x="${x - w / 2}" y="${y - 20}" width="${w}" height="40" fill="${paper}"/>`;
        svg += `<text x="${x}" y="${y + (T.tab * CAP) / 2}" text-anchor="middle" class="tab-number">${note.fret}</text>`;
      });
      if (!(panel.repeat && measureIndex === panel.measures.length - 1)) svg += line(g.end, layout.tabTop, g.end, layout.tabBottom, 'bar');
    });
    if (panel.repeat) {
      const mid = (layout.tabTop + layout.tabBottom) / 2;
      const dots = [mid - HOUSE.tabGap / 2, mid + HOUSE.tabGap / 2];
      svg += repeatBar(geometry[0].start + 2, layout.tabTop, layout.tabBottom, dots, 'start');
      svg += repeatBar(geometry[geometry.length - 1].end, layout.tabTop, layout.tabBottom, dots, 'end');
    }
  }
  if (h.startLine && layout.notation && layout.tab) svg += line(h.left, layout.staffTop, h.left, layout.tabBottom, 'bar');

  svg += '</svg>\n';
  return { svg, width, height: layout.height };
}


const FONT_DIR = path.join(__dirname, '..', 'assets', 'fonts');
const FONT_FILES = {
  oswald700: path.join(FONT_DIR, 'oswald-latin-700-normal.ttf'),
  inter400: path.join(FONT_DIR, 'inter-latin-400-normal.ttf'),
  inter600: path.join(FONT_DIR, 'inter-latin-600-normal.ttf'),
  mono700: path.join(FONT_DIR, 'DejaVuSansMono-Bold.ttf'),
  signs400: path.join(FONT_DIR, 'lbs-signs-400.ttf'),
  signs600: path.join(FONT_DIR, 'lbs-signs-600.ttf'),
};

function loadResvg() {
  const candidates = ['@resvg/resvg-js'];
  const roots = [process.cwd(), __dirname];
  const npmRoot = spawnSync('npm', ['root', '-g'], { encoding: 'utf8' });
  if (npmRoot.status === 0) roots.push(npmRoot.stdout.trim());
  if (process.env.NODE_PATH) roots.push(...process.env.NODE_PATH.split(path.delimiter));
  for (const name of candidates) {
    try {
      return require(require.resolve(name, { paths: roots }));
    } catch (error) {
      // try the next location
    }
  }
  return null;
}

// Figures are opaque, so drop the alpha channel: word processors and PDF exporters otherwise
// keep a separate soft mask and can recompress the image with a faint tint. Needs Pillow;
// without it the RGBA file is kept unchanged.
function flattenPng(pngPath) {
  const script = 'import sys\nfrom PIL import Image\nim = Image.open(sys.argv[1])\nif im.mode != "RGB":\n    bg = Image.new("RGB", im.size, (255, 255, 255))\n    bg.paste(im, mask=im.split()[-1] if im.mode in ("RGBA", "LA") else None)\n    bg.save(sys.argv[1], optimize=True)\n';
  spawnSync('python3', ['-c', script, pngPath], { encoding: 'utf8' });
}

function rasterise(svgPath, pngPath, width, scale = 1) {
  const resvg = loadResvg();
  if (resvg) {
    const svg = fs.readFileSync(svgPath, 'utf8');
    const renderer = new resvg.Resvg(svg, {
      fitTo: { mode: 'width', value: Math.round(width * scale) },
      font: {
        fontFiles: Object.values(FONT_FILES),
        loadSystemFonts: false,
        defaultFontFamily: 'Inter',
        monospaceFamily: 'DejaVu Sans Mono',
      },
    });
    fs.writeFileSync(pngPath, renderer.render().asPng());
    flattenPng(pngPath);
    return 'resvg';
  }
  const result = spawnSync(
    'inkscape',
    [svgPath, `--export-filename=${pngPath}`, `--export-width=${Math.round(width * scale)}`],
    { encoding: 'utf8' },
  );
  if (result.error && result.error.code === 'ENOENT') {
    fail('PNG requested, but neither @resvg/resvg-js nor Inkscape is available. SVG files were still created; run scripts/setup.sh or omit --png.');
  }
  if (result.status !== 0) {
    fail(`Inkscape could not create ${pngPath}: ${(result.stderr || result.stdout || '').trim()}`);
  }
  return 'inkscape';
}

function textContent(svg) {
  const texts = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((match) => match[1]);
  return texts.join('')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}

function subsetFont(fontPath, characters) {
  const os = require('os');
  const out = path.join(os.tmpdir(), `lbs-subset-${process.pid}-${path.basename(fontPath)}.woff`);
  const text = Array.from(new Set(characters + ' 0123456789')).join('');
  const result = spawnSync('pyftsubset', [fontPath, `--text=${text}`, '--flavor=woff', `--output-file=${out}`, '--layout-features=*'], { encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    fail('--embed-fonts needs fontTools (pip install fonttools). SVG was written without embedded fonts.');
  }
  const data = fs.readFileSync(out).toString('base64');
  fs.unlinkSync(out);
  return data;
}

function embedFonts(svg) {
  const characters = textContent(svg);
  const face = (family, weight, file) =>
    `@font-face { font-family: '${family}'; font-weight: ${weight}; src: url(data:font/woff;base64,${subsetFont(file, characters)}) format('woff'); }`;
  const faces = [
    face('Oswald', 700, FONT_FILES.oswald700),
    face('Inter', 400, FONT_FILES.inter400),
    face('Inter', 600, FONT_FILES.inter600),
    face('DejaVu Sans Mono', 700, FONT_FILES.mono700),
  ].join('\n    ');
  return svg.replace('<style>', `<style>\n    ${faces}`);
}

function panelManifest(spec, panel, files, dimensions) {
  const notes = panel.measures.flatMap((measure, measureIndex) =>
    measure.notes.map((note, noteIndex) => ({
      measure: measureIndex + 1,
      note: noteIndex + 1,
      string: note.string,
      fret: note.fret,
      finger: note.finger,
      soundingPitch: note.soundingPitch,
      writtenPitch: note.writtenPitch,
      semitoneOffset: note.writtenMidi - note.soundingMidi,
    })),
  );
  return {
    slug: panel.slug,
    heading: panel.heading,
    altText: panel.altText,
    files,
    dimensions,
    writtenOctaveOffset: spec.instrument.writtenOctaveOffset,
    meter: spec.timeSignature,
    incompleteMeasures: panel.measures.map((m,i) => m.incomplete ? i+1 : null).filter(Boolean),
    transpositionVerified: notes.every(
      (note) => note.semitoneOffset === spec.instrument.writtenOctaveOffset,
    ),
    notes,
  };
}

function renderFiles(spec, outDir, options = {}) {
  if (typeof options === 'boolean') options = { png: options };
  options = { png: false, scale: 1, embedFonts: false, ...options };
  fs.mkdirSync(outDir, { recursive: true });
  const panels = [];
  for (const panel of spec.panels) {
    const base = `${spec.slug}-${panel.slug}`;
    const svgPath = path.join(outDir, `${base}.svg`);
    const pngPath = path.join(outDir, `${base}.png`);
    const rendered = renderPanel(spec, panel);
    fs.writeFileSync(svgPath, rendered.svg);
    const files = { svg: path.basename(svgPath) };

    if (options.embedFonts) {
      fs.writeFileSync(svgPath, embedFonts(rendered.svg));
    }
    if (options.png) {
      rasterise(svgPath, pngPath, rendered.width, options.scale);
      files.png = path.basename(pngPath);
    }
    panels.push(panelManifest(spec, panel, files, { width: rendered.width, height: rendered.height }));
  }

  const manifest = {
    schemaVersion: 2,
    rendererVersion: "3.0.0",
    theme: spec.theme,
    frame: spec.frame,
    show: spec.show,
    noteNames: spec.noteNames,
    title: spec.title,
    slug: spec.slug,
    instrument: spec.instrument,
    timeSignature: spec.timeSignature,
    accidentalPreference: spec.accidentalPreference,
    panels,
  };
  const manifestPath = path.join(outDir, `${spec.slug}-manifest.json`);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { manifestPath, manifest };
}

function usage() {
  return `Usage:
  node scripts/render.js <exercise.json> --check
  node scripts/render.js <exercise.json> [--out-dir <directory>] [--png] [--scale 2] [--embed-fonts]

SVG is always created.
--png          also create a PNG (resvg with the bundled fonts; Inkscape as fallback)
--scale N      PNG pixel density multiplier, 1 to 4 (use 2 for print worksheets)
--embed-fonts  embed subsetted Oswald, Inter and DejaVu Sans Mono in the SVG
               so it renders identically on any website or computer`;
}

function parseArgs(argv) {
  if (argv.includes('--help') || argv.includes('-h')) return { help: true };
  if (argv.length === 0) fail(usage());
  const specPath = path.resolve(argv[0]);
  let outDir = path.resolve(process.cwd(), 'output');
  let makePng = false;
  let check = false;
  let scale = 1;
  let embedFonts = false;
  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--png') makePng = true;
    else if (arg === '--check') check = true;
    else if (arg === '--embed-fonts') embedFonts = true;
    else if (arg === '--scale') {
      scale = Number(argv[index + 1]);
      if (!Number.isFinite(scale) || scale < 1 || scale > 4) fail('--scale must be a number from 1 to 4.');
      index += 1;
    }
    else if (arg === '--out-dir') {
      if (!argv[index + 1]) fail('--out-dir needs a directory path.');
      outDir = path.resolve(argv[index + 1]);
      index += 1;
    } else fail(`Unknown option ${arg}.\n\n${usage()}`);
  }
  return { specPath, outDir, makePng, check, scale, embedFonts };
}

function main(argv = process.argv.slice(2)) {
  try {
    const args = parseArgs(argv);
    if (args.help) {
      process.stdout.write(`${usage()}\n`);
      return;
    }
    const spec = loadAndValidate(args.specPath);
    spec.panels.forEach((panel) => renderPanel(spec, panel));
    if (args.check) {
      process.stdout.write(`Valid: ${args.specPath}\n`);
      process.stdout.write(
        `Verified ${spec.panels.reduce((sum, panel) => sum + panel.measures.reduce((inner, measure) => inner + measure.notes.length, 0), 0)} notes with written offset ${spec.instrument.writtenOctaveOffset} semitones.\n`,
      );
      return;
    }
    const result = renderFiles(spec, args.outDir, { png: args.makePng, scale: args.scale, embedFonts: args.embedFonts });
    for (const panel of result.manifest.panels) {
      process.stdout.write(`${path.join(args.outDir, panel.files.svg)}\n`);
      if (panel.files.png) process.stdout.write(`${path.join(args.outDir, panel.files.png)}\n`);
    }
    process.stdout.write(`${result.manifestPath}\n`);
  } catch (error) {
    process.stderr.write(`Error: ${error.message}\n`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = {
  HOUSE,
  signs,
  show,
  embedFonts,
  loadAndValidate,
  rasterise,
  validateSpec,
  noteY,
  parsePitch,
  pitchName,
  renderFiles,
  renderPanel,
  slugify,
};
