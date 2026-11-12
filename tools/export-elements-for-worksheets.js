#!/usr/bin/env node
/*
 * Writes the worksheets skill's copy of the Harmonic Elements catalogue: skill/leith-bass-worksheets/assets/elements.json.
 * The skill's element card (scripts/element.js) is drawn from this file, so a printed card and the app's Guide can
 * never disagree: both come from he-catalogue.js. Run it again after any change to the catalogue.
 *
 *   node tools/export-elements-for-worksheets.js [path/to/assets/harmonic] [path/to/elements.json]
 */
const fs = require('fs'), vm = require('vm'), path = require('path');
const dir = path.resolve(process.argv[2] || path.join(__dirname, '../plugin/leithbass-members/assets/harmonic'));
const out = path.resolve(process.argv[3] || path.join(__dirname, '../skill/leith-bass-worksheets/assets/elements.json'));
const ctx = { console, Math, JSON }; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(dir, 'he-catalogue.js'), 'utf8'), ctx);
const HE = ctx.HE;
const SEMI = { '1': 0, '#1': 1, 'b2': 1, '2': 2, 'b3': 3, '3': 4, '4': 5, '#4': 6, 'b5': 6, '5': 7, '#5': 8, 'b6': 8, '6': 9, 'b7': 10, '7': 11 };
const stageOf = (n) => HE.STAGES.filter((s) => s.n === n)[0];
const elements = HE.ELEMENTS.filter((el) => HE.isActive(el.id) && el.kind !== 'form').map((el) => {
  const keys = {};
  for (let pc = 0; pc < 12; pc++) {
    const tri = HE.spell(el, pc, 'triads');
    const k = { tonic: tri.tonic, chords: tri.chords.map((c) => ({ name: c.name, roman: c.roman, bars: c.bars })), listen: HE.tip(el, pc, 'triads') };
    if (el.sev) k.sevenths = HE.spell(el, pc, 'sevenths').chords.map((c) => ({ name: c.name, roman: c.roman, bars: c.bars }));
    keys[pc] = k;
  }
  const deg = HE.degrees(el, 'triads');
  const homes = HE.keyHearings(el, 'triads').map((h) => ({ offset: h.offset, mode: h.mode, label: h.label, own: !!h.own }));
  return { id: el.id, stage: el.stage, stageName: stageOf(el.stage).name, roman: el.roman, name: el.name, kind: el.kind, mode: el.mode, builtFrom: el.rel,
    cadence: el.shape === 'cadence', fixed: deg.fixed, open: deg.open, homes, keys };
});
fs.writeFileSync(out, JSON.stringify({ made: 'tools/export-elements-for-worksheets.js', semitones: SEMI, elements }) + '\n');
console.log('elements written:', elements.length, '->', out, Math.round(fs.statSync(out).size / 1024) + ' KB');
