// Node checks for ear-data.js (Ear Training 1.10.0, rerun for 1.13.0): every drill's questions, marking, the record and Today's set.
//   node ear-training-rules-test.js path/to/assets/
const fs = require('fs'), vm = require('vm'), path = require('path');
const A = path.resolve(process.argv[2] || path.join(__dirname, '../plugin/leithbass-members/assets')) + '/';
const ctx = { console, Math, JSON, Date }; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(A + 'harmonic/he-catalogue.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync(A + 'ear/ear-data.js', 'utf8'), ctx);
const EAR = ctx.EAR; let n = 0, bad = 0;
function ok(c, msg) { n++; if (!c) { bad++; if (bad < 25) console.log('FAIL', msg); } }
let seed = 1; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const CODE = /^[A-Za-z0-9#.\-]{1,40}$/;
const drills = Object.keys(EAR.DRILLS);
ok(drills.includes('line') && drills.includes('roots'), 'line and roots exist');
for (const d of drills) {
  const D = EAR.DRILLS[d];
  for (const set of D.sets) {
    const mix = EAR.defaultMix(); mix[d].items = set.items.slice();
    const m = EAR.cleanMix(mix);
    for (let k = 0; k < 12; k++) {
      const keyPc = EAR.KEYS[k].pc;
      const run = { keyPc, home: EAR.homeFor(d, m, rnd), drill: d, n: 0 };
      let last = null;
      for (let i = 0; i < 6; i++) {
        const q = EAR.pick(d, m, run, [], last, rnd); last = q;
        ok(D.item[q.item], d + ' item known ' + q.item);
        ok(m[d].items.includes(q.item) || d === 'roots' || d === 'line', d + ' item in mix ' + q.item);
        const s = EAR.sound(q, {}), f = EAR.sound(q, { fill: true });
        const all = s.keys.concat(s.bass, f.bass);
        if (!all.every(x => Array.isArray(x.notes))) { console.log('NO NOTES', d, q.item, JSON.stringify(all.filter(x => !Array.isArray(x.notes))).slice(0, 300)); process.exit(2); }
        ok(all.every(x => x.notes.every(v => v >= 24 && v <= 96) && x.beat >= 0 && x.beat < (q.bars || 2) * 4), d + ' notes in range and inside the bars');
        ok(CODE.test(String(q.item)), d + ' code fits the record ' + q.item);
        if (D.seq) {
          ok(EAR.markSeq(q, q.degs).ok, d + ' own answer marked right ' + q.degs.join(' '));
          const wrong = q.degs.map((x, j) => j === q.degs.length - 1 ? (x === '1' ? '5' : '1') : x);
          if (d === 'line') ok(!EAR.markSeq(q, wrong).ok || wrong.join() === q.degs.join(), 'line wrong answer marked wrong');
          ok(q.notes.length === q.degs.length, d + ' a note for each degree');
          const e = EAR.entry(q, true, 1, false, q.degs.join('.'), 'tap');
          ok(CODE.test(e.x || 'x') && CODE.test(e.q), d + ' entry codes fit ' + e.q + ' ' + e.x);
          if (d === 'line') {
            ok(q.notes.every((v, j) => j === 0 || Math.abs(v - q.notes[j - 1]) <= 12), 'line no leap over an octave');
          }
        } else {
          ok(EAR.mark(q, q.item), d + ' own answer right');
          for (const v of EAR.compareWith(q)) { const w = EAR.variant(q, v); ok(w && w.item === v && EAR.mark(w, v), d + ' variant ' + v); }
        }
      }
    }
  }
}
// line note sets and start
for (const notes of EAR.NOTE_SET_ORDER) for (const start of ['home', 'any']) {
  const m = EAR.defaultMix(); m.line.notes = notes; m.line.start = start; m.line.items = EAR.DRILLS.line.items.map(x => x.id);
  const mm = EAR.cleanMix(m);
  ok(mm.line.notes === notes && mm.line.start === start, 'mix keeps line options');
  for (let i = 0; i < 40; i++) {
    const run = { keyPc: [0, 5, 10, 3][i % 4], home: i % 2 ? 'minor' : 'major', drill: 'line', n: 0 };
    const q = EAR.pick('line', mm, run, [], null, rnd);
    if (start === 'home') ok(q.degs[0] === '1', 'line starts on home');
    else ok(['1', '3', 'b3', '5'].includes(q.degs[0]), 'line starts on 1, 3 or 5: ' + q.degs[0]);
  }
}
// roots: every item is an active element; rotations accepted
for (const it of EAR.DRILLS.roots.items) ok(ctx.HE.byId(it.id) && ctx.HE.isActive(it.id), 'roots item is an element ' + it.id);
// 1.13.0: the elements taken out of Harmonic Elements are out of Progressions too, and every set is made of ones still in
const rootIds = EAR.DRILLS.roots.items.map(x => x.id);
['axis-with-ii', 'deceptive-lift', 'mixolydian-sway', 'gospel-turn', 'three-six-two-five', 'axis-lean-first', 'falling-shadows', 'walk-down'].forEach(id => ok(!rootIds.includes(id), id + ' is out of Progressions'));
for (const set of EAR.DRILLS.roots.sets) ok(set.items.length >= 2 && set.items.every(id => rootIds.includes(id)), 'roots set "' + set.name + '" is made of elements still in');
// a saved mix naming an element that is out loses it and keeps the rest
{ const m = EAR.defaultMix(); m.roots.items = rootIds.slice(0, 3).concat(['gospel-turn', 'walk-down']); ok(EAR.cleanMix(m).roots.items.join() === rootIds.slice(0, 3).join(), 'a saved mix loses elements that are out'); }
// Today's set
const now = Date.now();
ok(EAR.today([], now).length >= 1, 'today with no record');
const log = [];
for (let i = 0; i < 300; i++) {
  const d = drills[i % drills.length], D = EAR.DRILLS[d], it = D.items[i % D.items.length].id;
  log.push({ t: now - (300 - i) * 3600e3, d, q: it, k: 0, ok: rnd() > 0.4, n: 1, s: false, x: '', v: 'tap' });
}
// an old record line for an element that is out does not break the record or Today
log.push({ t: now - 1000, d: 'roots', q: 'gospel-turn', k: 0, ok: false, n: 1, s: false, x: '', v: 'tap' });
ok((() => { try { EAR.stats(log); EAR.today(log, now); return true; } catch (e) { console.log(e); return false; } })(), 'a record line for an element that is out is harmless');
for (let r = 0; r < 20; r++) {
  const plan = EAR.today(log.slice(0, 50 + r * 12).concat(log.slice(-1)), now);
  ok(plan.length >= 1 && plan.length <= 3, 'today has one to three parts');
  for (const p of plan) {
    ok(EAR.DRILLS[p.drill] && p.items.length >= 1 && p.items.every(x => EAR.DRILLS[p.drill].item[x]), 'today items known');
    ok(p.n > 0 && typeof p.why === 'string', 'today part has a length and a reason');
  }
}
console.log(rootIds.length + ' progressions | ' + n + ' checks, ' + bad + ' failed');
process.exit(bad ? 1 : 0);
