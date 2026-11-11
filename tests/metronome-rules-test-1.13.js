/*
 * The Shed metronome: checks of what 1.13.0 added to the engine (after Gebrian, chapters 14 and 16).
 *   node metronome-rules-test-1.13.js path/to/assets
 */
const vm = require('vm'), fs = require('fs');
const dir = process.argv[2];
const ctx = { console, setTimeout, clearTimeout, Promise, Math, JSON, Object, Array, btoa, atob, escape, unescape, encodeURIComponent, decodeURIComponent }; ctx.globalThis = ctx; ctx.window = ctx; ctx.self = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(dir + '/shed-metronome.js', 'utf8'), ctx);
const MET = ctx.LBSMetronome;
let checks = 0; const fails = []; const ok = (c, m) => { checks++; if (!c) fails.push(m); };

// which beats sound, over a run of bars, with a fake clock
async function run(opts, bars) {
  const clock = { currentTime: 0, sampleRate: 48000 };
  const m = MET.create({ context: clock, manual: true, random: () => 0.5 });
  m.set(Object.assign({ bpm: 120, meter: [4, 4], sound: 'click', countIn: 0 }, opts));
  await m.start();
  const secs = bars * 4 * 60 / 120;
  m.pump(secs + 2);
  const heard = m.drain(secs + 2).filter(ev => ev.sub === 0 && !ev.countIn).map(ev => ({ bar: ev.bar, beat: ev.beat, audible: !!ev.audible, bpm: ev.bpm }));
  m.stop();
  return heard.filter(h => h.bar < (heard[0] ? heard[0].bar : 0) + bars);
}
(async () => {
  let h = await run({ which: 'alt' }, 4);
  ok(h.length === 16, 'sixteen beats in four bars: ' + h.length);
  ok(h.every(x => x.audible === (x.beat % 2 === 0)), 'alt sounds beats 1 and 3 only');
  h = await run({ which: 'backbeat' }, 2); ok(h.every(x => x.audible === (x.beat % 2 === 1)), 'the backbeat is unchanged');
  h = await run({ which: 'alt', meter: [3, 4] }, 2); ok(h.every(x => x.audible === (x.beat % 2 === 0)), 'alt in three is beats 1 and 3');
  for (const n of [8, 16]) {
    h = await run({ which: 'one', every: n }, n * 2);
    const sounding = h.filter(x => x.audible);
    ok(sounding.length === 2 && sounding.every(x => x.beat === 0 && (x.bar % n) === 0), 'beat one every ' + n + ' bars: ' + sounding.map(x => x.bar + '.' + x.beat).join(' '));
  }
  // the ladder
  ok(MET.THIN.length === 8 && MET.THIN[0].which === 'all' && MET.THIN[1].which === 'alt' && MET.THIN.slice(2).every(t => t.which === 'one'), 'the stages of Thin the click');
  ok(MET.THIN.slice(2).map(t => t.every).join() === '1,2,3,4,8,16', 'beat one, then every 2, 3, 4, 8 and 16 bars');
  // saved settings
  let s = MET.upgrade({ v: 2, bpm: 90, which: 'alt', every: 16, thin: { on: true, stage: 99 }, up: { on: true, by: 5, ready: true, past: true, stopAt: 120 } });
  ok(s.which === 'alt' && s.every === 16 && s.thin.on && s.thin.stage === 7 && s.up.ready && s.up.past, 'settings kept');
  s = MET.upgrade({ v: 2, bpm: 90 }); ok(s.thin.on === false && s.up.ready === false && s.up.past === false && s.every === 1, 'defaults');
  s = MET.upgrade({ v: 2, bpm: 90, every: 40 }); ok(s.every === 16, 'every is capped at 16');
  // Click up by hand
  const up = { by: 5, stopAt: 120, past: false };
  ok(MET.upStop(up) === 120 && MET.upStop(Object.assign({}, up, { past: true })) === 126, 'the goal, and 5% past it');
  ok(MET.upStop({ by: 5, stopAt: '' }) === null, 'no goal');
  ok(MET.upStop({ by: -5, stopAt: 60, past: true }) === 57, '5% past a goal below');
  ok(MET.upNext(60, up, false) === 65 && MET.upNext(118, up, false) === 120 && MET.upNext(120, up, false) === 120, 'next stops at the goal');
  ok(MET.upNext(118, Object.assign({}, up, { past: true }), false) === 123 && MET.upNext(123, Object.assign({}, up, { past: true }), false) === 126, 'next stops 5% past it');
  ok(MET.upNext(65, up, true) === 60 && MET.upNext(22, up, true) === MET.BOTTOM, 'back, and never under the slowest');
  ok(MET.upNext(100, { by: 10, stopAt: '' }, false) === 110, 'no goal: it keeps going');
  // a hand-stepped Click up leaves the tempo alone while it plays
  h = await run({ bpm: 120, clickUp: null }, 8); ok(h.every(x => x.bpm === 120), 'tempo holds with Click up stepped by hand');
  // Interleaved clicking up, against Gebrian's Figure 16.3 (start 60, steps of 5, goal 120): "a-b" is chunks a to b
  const fig = {
    2: '60:1-2 65:2 70:1-2 75:2 80:1-2 85:2 90:1-2 95:2 100:1-2 105:2 110:1-2 115:2 120:1-2',
    3: '60:1-3 65:3 70:2-3 75:3 80:1-3 85:3 90:2-3 95:3 100:1-3 105:3 110:2-3 115:3 120:1-3',
    4: '60:1-4 65:4 70:3-4 75:4 80:2-4 85:4 90:1-4 95:4 100:3-4 105:4 110:2-4 115:4 120:1-4',
    5: '60:1-5 65:5 70:4-5 75:5 80:3-5 85:5 90:2-5 95:5 100:1-5 105:5 110:4-5 115:5 120:3-5'
  };
  const sched = MET.interleave({ chunks: 5, start: 60, goal: 120, by: 5 });
  const show = r => r.tempo + ':' + (r.from === r.to ? r.to : r.from + '-' + r.to);
  ok(sched.filter(r => r.step === 1).map(show).join(' ') === [60,65,70,75,80,85,90,95,100,105,110,115,120].map(t => t + ':1').join(' '), 'step 1 is chunk 1 at every tempo');
  [2, 3, 4].forEach(n => ok(sched.filter(r => r.step === n).map(show).join(' ') === fig[n], 'step ' + n + ' matches the figure: ' + sched.filter(r => r.step === n).map(show).join(' ')));
  ok(sched.filter(r => r.step === 5).map(show).join(' ') === fig[5] + ' 120:1-5', 'step 5 matches the figure, then the whole run at the goal');
  for (const n of [2, 3, 5, 8, 16]) for (const by of [3, 5, 10]) for (const [st, go] of [[60, 120], [50, 132], [80, 80]]) {
    const sc = MET.interleave({ chunks: n, start: st, goal: go, by });
    for (let step = 1; step <= n; step++) {
      const mine = sc.filter(r => r.step === step), end = mine[mine.length - 1];
      ok(end.tempo === go && end.from === 1 && end.to === step, 'every step ends on the whole run at the goal ' + [n, by, st, go, step]);
      ok(mine.every(r => r.to === step && r.from >= 1 && r.from <= step && r.tempo >= st && r.tempo <= go), 'runs end with the new chunk ' + [n, by, step]);
      ok(mine[0].tempo === st && mine.every((r, i) => !i || r.tempo >= mine[i - 1].tempo), 'tempos climb from the start ' + [n, by, step]);
    }
    const bk = MET.interleave({ chunks: n, start: st, goal: go, by, back: true });
    ok(bk.length === sc.length && bk.every((r, i) => r.from === n + 1 - sc[i].to && r.to === n + 1 - sc[i].from && r.from <= r.to), 'backwards is the mirror ' + [n, by]);
  }
  const iu = MET.upgrade({ v: 2, inter: { on: true, chunks: 99, beats: 5, start: 100, goal: 60, by: -5, at: 7 } }).inter;
  ok(iu.chunks === 16 && iu.beats === 5 && iu.goal === 100 && iu.by === 5 && iu.at === 7, 'interleave settings kept and tidied');
  // a setup as a link
  const setups = [
    { v: 2, bpm: 72 },
    { v: 2, bpm: 96, which: 'alt', every: 1, where: 'and', gap: '2-2', countIn: 1 },
    { v: 2, bpm: 60, which: 'one', every: 16, thin: { on: true, stage: 7 } },
    { v: 2, bpm: 110, meter: '7/8:2+2+3', accents: ['accent', 'soft', 'mute'], random: { on: true, share: 75, keepOne: true, bars: false } },
    { v: 2, bpm: 66, up: { on: true, by: 5, every: 4, stopAt: 132, ladder: false, ready: true, past: true }, groove: { kind: 'feel', feel: 'Swing', groove: 1, kit: 'brushes' } },
    { v: 2, bpm: 60, inter: { on: true, chunks: 6, beats: 2, start: 60, goal: 126, by: 3, back: true, at: 9 } }
  ];
  setups.forEach((su, i) => {
    const full = MET.upgrade(su), code = MET.link(full), back = MET.unlink(code);
    ok(/^[A-Za-z0-9_-]+$/.test(code) && code.length < 600, 'a link is short and safe in an address: ' + code.length);
    const want = Object.assign({}, full); delete want.setups; ['sound', 'vol', 'offsetMs', 'flash', 'vibrate', 'hideSilent'].forEach(k => { delete want[k]; });
    const got = Object.assign({}, back); ['sound', 'vol', 'offsetMs', 'flash', 'vibrate', 'hideSilent'].forEach(k => { delete got[k]; });
    ok(JSON.stringify(got) === JSON.stringify(want), 'setup ' + i + ' comes back as it went');
  });
  const b = t => Buffer.from(t, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  ok(MET.unlink('') === null && MET.unlink('!!!') === null && MET.unlink(b('[1,2]')) === null && MET.unlink(b('not json')) === null, 'nonsense is no setup');
  const odd = MET.unlink(b(JSON.stringify({ bpm: 9999, which: 'x', sound: 'evil', setups: [{ name: 'x' }], groove: { kind: 'loop', url: 'https://example.com/a.mp3' }, accents: ['loud'], meter: '<script>', __proto__: { a: 1 } })));
  ok(odd && odd.bpm === MET.TOP && odd.which === 'all' && odd.sound === 'woodblock' && odd.setups === undefined && odd.groove === null && odd.accents === null && odd.meter === '4/4', 'a link brings in nothing the metronome does not know');
  const mine = MET.link(MET.upgrade({ v: 2, bpm: 80, groove: { kind: 'loop', url: '/members/file/1', bpm: 80, title: 'Mine' } }));
  ok(MET.unlink(mine).groove === null, 'a member\'s own loop does not travel');
  // Count it off
  const at = (bpm, n, jitter) => { const g = 60000 / bpm; return Array.from({ length: n }, (_, i) => 1000 + i * g + (jitter ? jitter[i] || 0 : 0)); };
  ok(MET.counted(at(120, 3), 120) === null, 'three taps are not a count');
  let c = MET.counted(at(120, 4), 120); ok(c.bpm === 120 && c.off === 0 && c.verdict === 'on' && c.spread === 0, 'four even taps at the tempo');
  c = MET.counted(at(132, 4), 120); ok(c.bpm === 132 && c.off === 12 && c.percent === 10 && c.verdict === 'fast', 'ten per cent fast');
  c = MET.counted(at(90, 4), 100); ok(c.bpm === 90 && c.verdict === 'slow', 'slow');
  c = MET.counted(at(103, 4), 100); ok(c.verdict === 'on', 'within three per cent is there');
  c = MET.counted(at(100, 4, [0, 0, 0, 120]), 100); ok(c.bpm === 100 && c.spread >= 12, 'one late tap does not decide the tempo, and the unevenness is reported');
  c = MET.counted(at(100, 6), 100); ok(c.bpm === 100, 'the last four taps are the count');
  ok(MET.counted([5, 5, 6, 7], 100) === null, 'two taps at once are no count');
  const cu = MET.upgrade({ v: 2, count: { on: true, from: 200, to: 80 } }).count; ok(cu.on && cu.from === 80 && cu.to === 200, 'count it off settings kept in order');
  console.log('checks', checks, 'failed', fails.length); fails.slice(0, 12).forEach(f => console.log('  ' + f));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.log('ERROR', e); process.exit(1); });
