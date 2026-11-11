/*
 * Harmonic Elements: checks of the catalogue, the hearings, marking and the record, for 1.13.0.
 *   node harmonic-elements-rules-test-1.13.js path/to/assets/harmonic
 * Self contained (the 1.9.0 script needed a copy of 1.8.0 beside it to compare file names with).
 */
const vm = require('vm'), fs = require('fs');
const dir = process.argv[2];
const ctx = { console }; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['he-catalogue', 'he-library', 'he-trainer']) vm.runInContext(fs.readFileSync(dir + '/' + f + '.js', 'utf8'), ctx);
const HE = ctx.HE;
let checks = 0; const fails = [];
const ok = (c, m) => { checks++; if (!c) fails.push(m); };
const SEMI = { '1': 0, '#1': 1, 'b2': 1, '2': 2, 'b3': 3, '3': 4, '4': 5, '#4': 6, 'b5': 6, '5': 7, '#5': 8, 'b6': 8, '6': 9, 'b7': 10, '7': 11 };
const loopOf = (chords, pc) => chords.map(c => ({ set: [...new Set(HE.QUAL[c.qual].tones.map(t => (pc + SEMI[c.deg] + t) % 12))].sort((a, b) => a - b).join(' '), bars: c.bars }));
const norm = l => { const out = []; l.forEach(c => { const last = out[out.length - 1]; if (last && last.set === c.set) last.bars += c.bars; else out.push({ ...c }); }); if (out.length > 1 && out[0].set === out[out.length - 1].set) out[0].bars += out.pop().bars; return out; };
const same = (a, b) => { a = norm(a); b = norm(b); if (a.length !== b.length) return false; for (let s = 0; s < a.length; s++) if (a.every((x, i) => x.set === b[(i + s) % b.length].set && x.bars === b[(i + s) % b.length].bars)) return true; return false; };

// 1. the catalogue
ok(HE.ELEMENTS.length === 65 && HE.ALL.length === 84, 'counts ' + HE.ELEMENTS.length + '/' + HE.ALL.length);
ok(!HE.ELEMENTS.some(e => e.stage > 9), 'every active element is in stages 1 to 9');
ok(!HE.ELEMENTS.some(e => /shift/i.test(e.name) || /shift/i.test(e.rel)), 'no shift in a name or a built from line');
// ids that Ear Training's records and links hold, and recordings' file names, outlive the renames
const KEEP = { 'mixolydian-shift': 'Mixolydian shift', 'minor-shift': 'Minor shift', 'neo-soul-shift': 'Neo soul shift', 'lydian-shift': 'Lydian shift', 'phrygian-shift': 'Phrygian shift', 'dorian-shift': 'Dorian shift' };
Object.keys(KEEP).forEach(id => { const e = HE.byId(id); ok(e && HE.isActive(id) && e.file === KEEP[id] && /step$/.test(e.name), 'kept id and file ' + id); ok(HE.library.parse('Chords/90bpm/C/' + KEEP[id] + '.mp3') && HE.library.parse('Chords/90bpm/C/' + KEEP[id] + '.mp3').el === id, 'file name still read ' + id); ok((HE.library.parse('Chords/90bpm/C/' + e.name + '.mp3') || {}).el === id, 'new name read too ' + id); });
// every id of 1.12.1 is still known
['major-home','dominant-home','minor-home','sus-2-home','sus-4-home','sixth-home','augmented-home','diminished-home','major-lean','blues-lean','dorian-lean','minor-lean','major-pull','mixolydian-pull','modal-minor-pull','functional-minor-pull','suspended-cadence','parent-molecule','backwards-cadence','modal-minor-molecule','functional-minor-molecule','cadential-cell','cadence-as-a-comma','minor-cadence','relative-shadow','upper-shadow','relative-major','dark-shadow','fifties-progression','fifties-strengthened','rising-line','surprise-shadow','ascending-soul-cell','long-cycle','pop-axis','axis-minor-view','mixolydian-shift','minor-shift','neo-soul-shift','lydian-shift','phrygian-shift','modal-descent','andalusian-cadence','mixolydian-cadence','lift','turnaround','v-of-v-detour','descending-soul-cycle','chain-of-dominants','v-of-iv','borrowed-minor-lean','minor-plagal-cadence','creep-progression','backdoor-cadence','flat-mediant','major-mediant','flat-submediant','altered-dominant','tritone-substitution','twelve-bar-blues','blues-revisited','minor-blues','jazz-blues','rhythm-changes','major-and-relative-minor-cadences','aeolian-cadence','dorian-loop','minor-rock-cell','dorian-shift','fifties-in-minor','rock-cell','mixolydian-sway','axis-lean-first','falling-shadows','axis-with-ii','climb','walk-down','deceptive-lift','gospel-turn','three-six-two-five','ii-v-into-iv','diminished-passing-chord','minor-blues-turn','line-cliche'].forEach(id => ok(!!HE.byId(id), 'id still known ' + id));
const OUT = { 'axis-with-ii': 'dorian-loop', 'deceptive-lift': 'aeolian-cadence', 'mixolydian-sway': 'mixolydian-cadence', 'gospel-turn': 'descending-soul-cycle', 'three-six-two-five': 'turnaround', 'axis-lean-first': '', 'falling-shadows': '', 'walk-down': '' };
Object.keys(OUT).forEach(id => { const e = HE.byId(id); ok(e && !HE.isActive(id) && e.out && e.into === OUT[id] && (!e.into || HE.isActive(e.into)), 'out ' + id); });
ok(HE.ELEMENTS.filter(e => e.draft).length === 11, 'eleven drafts');
ok(HE.PAIRS.every(p => HE.isActive(p[0]) && HE.isActive(p[1]) || HE.byId(p[0]).kind === 'form' || HE.byId(p[1]).kind === 'form'), 'pairs are between active elements');
ok(HE.trainer.PRESETS.every(p => p.elements.length && p.elements.every(id => HE.isActive(id))), 'presets');
ok(HE.label(HE.byId('major-lean')) === 'I IV, the major lean', 'label');

// 2. hearings
let hearingCount = 0, multi = 0;
HE.ELEMENTS.forEach(el => ['triads', 'sevenths'].forEach(v => {
  const hs = HE.keyHearings(el, v);
  ok(hs[0].own && hs[0].offset === 0 && hs[0].mode === el.mode, 'own first ' + el.id);
  if (el.shape === 'cadence') { ok(hs.length === 1, 'a cadence has one home ' + el.id + ' ' + v); ok(HE.sameSound(el, v).length === 1, 'a cadence is its own sound ' + el.id); }
  ok(!hs.some(h => h.via && HE.byId(h.via).shape === 'cadence'), 'no hearing is a cadence ' + el.id);
  ok(!hs.some(h => h.via && !HE.isActive(h.via)), 'no hearing is an element that is out ' + el.id);
  if (v === 'triads' && hs.length > 1 && el.kind !== 'home' && !el.homeAbsent) multi++;
  HE.KEYS.forEach(k => {
    const mine = loopOf(HE.chords(el, v), k.pc);
    hs.forEach(h => {
      hearingCount++;
      ok(same(mine, loopOf(h.chords, (k.pc + h.offset) % 12)), 'hearing not the same sound ' + el.id + ' ' + v + ' ' + h.label);
      // a home is a chord of the loop
      ok(el.homeAbsent && h.own || loopOf(h.chords, 0).some((c, i) => h.chords[i].deg === '1'), 'home is a chord of the loop ' + el.id + ' ' + h.label);
      if (el.homeAbsent || el.kind === 'home') return;
      // Find home: the key alone, any hearing
      const fh = HE.trainer.mark({ el, keyPc: k.pc, voicing: v, ask: 'home' }, { homePc: (k.pc + h.offset) % 12, mode: h.mode, elId: null });
      ok(fh.verdict === (h.own ? 'right' : 'hearing') && fh.others === hs.length - 1, 'find home ' + el.id + ' ' + h.label + ' ' + fh.verdict);
      // as 1.9.0 marked it (old lines, and anything that asks both)
      const m = HE.trainer.mark({ el, keyPc: k.pc, voicing: v }, { homePc: (k.pc + h.offset) % 12, mode: h.mode, elId: h.via || el.id });
      ok(m.verdict === (h.own ? 'right' : 'hearing'), 'mark ' + el.id + ' ' + v + ' ' + h.label + ' ' + m.verdict);
    });
    if (el.homeAbsent || el.kind === 'home') return;
    // Find home: a key that is not a hearing is not yet
    for (let pc = 0; pc < 12; pc++) ['major', 'minor'].forEach(mode => {
      const allowed = hs.some(h => (k.pc + h.offset) % 12 === pc && h.mode === mode);
      ok((HE.trainer.mark({ el, keyPc: k.pc, voicing: v, ask: 'home' }, { homePc: pc, mode, elId: null }).verdict !== 'not-yet') === allowed, 'find home wrong key ' + el.id + ' ' + pc + mode);
    });
    // Name it: home is given, so only this element (or the very same loop on the same home) is right
    const r = { el, keyPc: k.pc, voicing: v, ask: 'element' };
    ok(HE.trainer.mark(r, { homePc: k.pc, mode: el.mode, elId: el.id }).verdict === 'right', 'name it own ' + el.id);
    // (against every other element in two keys: enough to prove the rule, and the whole run stays under a minute)
    if (k.pc === 0 || k.pc === 8) HE.ELEMENTS.forEach(o => {
      if (o === el || o.kind === 'home') return;
      const sameHere = same(mine, loopOf(HE.chords(o, HE.voicingFor(o, v)), k.pc)) && HE.voicingFor(o, v) === HE.voicingFor(el, v) && o.mode === el.mode && o.shape !== 'cadence' && el.shape !== 'cadence';
      const got = HE.trainer.mark(r, { homePc: k.pc, mode: el.mode, elId: o.id }).verdict !== 'not-yet';
      ok(got === sameHere, 'name it ' + el.id + ' answered ' + o.id + ' in ' + k.name + ' ' + v + ': ' + got);
    });
  });
}));
ok(multi === 24, 'loops with more than one home: ' + multi);
// the cases that prompted the changes
const cc = HE.byId('cadential-cell');
ok(HE.trainer.mark({ el: cc, keyPc: 0, voicing: 'sevenths', ask: 'home' }, { homePc: 7, mode: 'major', elId: null }).verdict === 'not-yet', 'ii V I in C is not in G');
ok(HE.trainer.mark({ el: HE.byId('major-lean'), keyPc: 0, voicing: 'triads', ask: 'element' }, { homePc: 0, mode: 'major', elId: 'major-pull' }).verdict === 'not-yet', 'with home on C, C to F is not I V');
ok(HE.trainer.mark({ el: HE.byId('dorian-loop'), keyPc: 9, voicing: 'triads', ask: 'home' }, { homePc: 7, mode: 'major', elId: null }).verdict === 'hearing', 'the Dorian loop on A can be found from G major');
ok(HE.bars(HE.byId('ii-v-into-iv'), 'triads') === 8 && HE.sequence(HE.byId('ii-v-into-iv'), 0, 'triads')[0].pc === 0, 'the ii V into IV starts and ends at home');

// 3. the record
const round = { el: HE.byId('pop-axis'), keyPc: 0, voicing: 'triads', bpm: 90, feel: 'Rock 8ths', chord: { source: 'synth' } };
const fhRound = Object.assign({ ask: 'home' }, round), niRound = Object.assign({ ask: 'element' }, round);
const a1 = { homePc: 9, mode: 'minor', elId: 'pop-axis' };
const e1 = HE.trainer.entry(fhRound, HE.trainer.mark(fhRound, a1), a1, 1, false, 1e12 + 1, null);
ok(e1.ask === 'home' && e1.ok && e1.saidEl === null && e1.saidHome === 9 && e1.saidMode === 'minor', 'find home line');
const a2 = { homePc: 0, mode: 'major', elId: 'pop-axis' };
const e2 = HE.trainer.entry(niRound, HE.trainer.mark(niRound, a2), a2, 1, false, 1e12 + 2, null);
ok(e2.ask === 'element' && e2.ok && e2.saidEl === 'pop-axis', 'name it line');
const old = HE.trainer.entry(round, HE.trainer.mark(round, a2), a2, 1, false, 1e12 + 3, null);
ok(old.ask === undefined && old.ok, 'a line that asks both has no ask');
const st = HE.trainer.stats([e1, e2, old]);
ok(st.homes.n === 1 && st.homes.ok === 1 && st.homes.elements['pop-axis'].ok === 1, 'find home counted on its own');
ok(st.elements['pop-axis'].attempts === 2 && st.elements['pop-axis'].right === 2, 'find home is not naming the element');
// recognised: four first-time answers from the last five on two days, Name it lines included
const day = 864e5, lines = [0, 1, 2, 3, 4].map(i => Object.assign({}, e2, { t: 1e12 + i * (i > 2 ? day : 1000), ok: i !== 1 }));
ok(HE.trainer.stats(lines).elements['pop-axis'].recognised === true, 'recognised from Name it lines');

// 4. the mix and the pick
const lib = HE.library.build({ files: [], synth: { tempos: [90], feels: ['Rock 8ths'] } });
ok(HE.trainer.defaultMix(lib).home === 'cued', 'home is cued by default');
['cued', 'pedal', 'bass', 'plain'].forEach(w => ok(HE.trainer.cleanMix(Object.assign(HE.trainer.defaultMix(lib), { home: w }), lib).home === w, 'home way ' + w));
ok(HE.trainer.cleanMix(Object.assign(HE.trainer.defaultMix(lib), { home: 'hidden' }), lib).home === 'cued', 'a saved 1.9.0 mix is cued now');
ok(HE.trainer.cleanMix(Object.assign(HE.trainer.defaultMix(lib), { elements: ['axis-with-ii', 'major-lean', 'gospel-turn'] }), lib).elements.join() === 'major-lean', 'a saved mix loses elements that are out');
for (let i = 0; i < 300; i++) { const x = HE.trainer.pick({ elements: ['suspended-cadence', 'major-lean'], keys: [0, 5], tempos: [90], feels: ['Rock 8ths'], voicing: 'triads', sound: 'both' }, lib, [], null); ok(x.el.id === 'major-lean', 'pick'); }

console.log('hearings checked', hearingCount, '| loops with more than one home', multi);
console.log('checks', checks, 'failed', fails.length); fails.slice(0, 20).forEach(f => console.log('  ' + f));
process.exit(fails.length ? 1 : 0);
