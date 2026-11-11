/*
 * Leith Bass Space: Read, what the Dojo asks and how it is marked.
 *
 * Pure: no DOM, no sound. window.RD in a browser, module.exports in Node (the
 * tests run every generator thousands of times). Needs RDM (rd-music.js).
 *
 * THE THESIS. Reading is three connections made immediate: the dot on the
 * page to its name, the dot on the page to the place on the neck, and the
 * symbol to the sound and the time it takes. Players who learned by ear or
 * from TAB usually have the second link weak or missing: they can name a note
 * on the stave and find a note on the neck, but not go from one to the other
 * without thinking. So the Dojo drills each link in both directions, times
 * every answer, and keeps a map of which notes are immediate and which still
 * take a moment. Right is not enough; right and quick is the aim.
 *
 * The drills (d in a record line):
 *   name    a note on the stave: say its name                       (page to name)
 *   write   a place on the neck: write the note on the stave        (neck to page)
 *   find    a note on the stave: find it on the neck                (page to neck)
 *   play    a line on the stave: play it on your bass, at your pace (page to hands)
 *   tap     a bar of rhythm: tap it in time over a click            (symbol to time)
 *   hear    a bar is played: which of three is it?                  (sound to symbol)
 *   sight   a short piece: look, then play it through, not stopping (all of it at once)
 *   key     a key signature: name the key (or the reverse)
 *   int     two notes: name the interval
 *   chord   a chord, stacked or broken: name it
 *
 * RD.NOTE_SETS, RD.RHYTHM, RD.SIGHT       what can be asked
 * RD.pool(o)                              the pitches a note drill draws from
 * RD.question(drill, o, log, last, rnd)   one question
 * RD.mark(q, said)                        {ok, ...}
 * RD.rhythmBar(level, rnd, o) / rhythmLine(level, bars, rnd, o)
 * RD.sightPiece(level, rnd, o)            {notes, key, time, bpm, ...}
 * RD.scoreTaps(targets, taps, o)          rhythm marking: every note on time, early, late or missed
 * RD.targets(notes, time)                 the moments a rhythm asks you to play (ties and rests left out)
 * RD.entry(...)                           one line of the record
 * RD.stats(log)                           per item: attempts, recognised, immediate, median time
 * RD.today(log, now)                      what to work on today
 * RD.map(log, o)                          the Map: every note in reach, how well each link is made
 */
(function (root) {
	'use strict';
	var M = root.RDM || (typeof require === 'function' ? require('./rd-music.js') : null);

	/* ---------- randomness (seedable, for the tests) ---------- */

	function seeded(seed) {
		var s = seed >>> 0 || 1;
		return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
	}
	function pickOne(list, rnd) { return list[Math.floor((rnd || Math.random)() * list.length)]; }
	function weighted(list, weightOf, rnd) {
		var total = 0, k;
		for (k = 0; k < list.length; k++) { total += weightOf(list[k]); }
		var r = (rnd || Math.random)() * total;
		for (k = 0; k < list.length; k++) { r -= weightOf(list[k]); if (r <= 0) { return list[k]; } }
		return list[list.length - 1];
	}
	function extend(a, b) { var o = {}, k; for (k in a) { o[k] = a[k]; } for (k in b) { o[k] = b[k]; } return o; }
	function shuffle(list, rnd) { var a = list.slice(), i, j, t; for (i = a.length - 1; i > 0; i--) { j = Math.floor((rnd || Math.random)() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

	/* ---------- the drills ---------- */

	var DRILLS = {
		name: { id: 'name', title: 'Name it', strand: 'notes', what: 'A note on the stave. Say its name.', fast: 1800 },
		write: { id: 'write', title: 'Write it', strand: 'notes', what: 'A place on the neck. Write that note on the stave.', fast: 3000 },
		find: { id: 'find', title: 'Find it', strand: 'neck', what: 'A note on the stave. Find it on the neck.', fast: 2500 },
		play: { id: 'play', title: 'Play it', strand: 'neck', what: 'A line on the stave. Play it on your bass, at your own pace.', fast: 2500 },
		tap: { id: 'tap', title: 'Tap it', strand: 'rhythm', what: 'A bar of rhythm. Tap it in time over the click.' },
		hear: { id: 'hear', title: 'Hear it', strand: 'rhythm', what: 'A bar is played. Which of the three is it?' },
		rwrite: { id: 'rwrite', title: 'Write it', strand: 'rhythm', what: 'A bar is played. Write it down, a beat at a time.' },
		sight: { id: 'sight', title: 'Sight read', strand: 'sight', what: 'A short piece. Look first, then play it through without stopping.' },
		band: { id: 'band', title: 'With the band', strand: 'sight', what: 'A bass part with chord symbols. Look first, then play it with the band, not stopping.' },
		key: { id: 'key', title: 'Keys', strand: 'theory', what: 'A key signature. Name the key.', fast: 3000 },
		int: { id: 'int', title: 'Intervals', strand: 'theory', what: 'Two notes. Name the interval.', fast: 3500 },
		chord: { id: 'chord', title: 'Chords', strand: 'theory', what: 'A chord. Name it.', fast: 4000 }
	};
	var STRANDS = [
		{ id: 'today', title: 'Today' },
		{ id: 'notes', title: 'Notes', drills: ['name', 'write'] },
		{ id: 'neck', title: 'Neck', drills: ['find', 'play'] },
		{ id: 'rhythm', title: 'Rhythm', drills: ['tap', 'hear', 'rwrite'] },
		{ id: 'sight', title: 'Sight read', short: 'Sight', drills: ['sight', 'band'] },
		{ id: 'theory', title: 'Keys & chords', short: 'Theory', drills: ['key', 'int', 'chord'] },
		{ id: 'map', title: 'The Map', short: 'Map' }
	];

	/* ---------- which notes ---------- */

	var NOTE_SETS = [
		{ id: 'open', name: 'Open strings', clef: 'bass', notes: ['E2', 'A2', 'D3', 'G3'], about: 'E, A, D and G: the four landmarks.' },
		{ id: 'lines', name: 'Lines', clef: 'bass', notes: ['G2', 'B2', 'D3', 'F3', 'A3'], about: 'Good boys deserve football always.' },
		{ id: 'spaces', name: 'Spaces', clef: 'bass', notes: ['A2', 'C3', 'E3', 'G3'], about: 'All cows eat grass.' },
		{ id: 'staff', name: 'The staff', clef: 'bass', range: ['G2', 'A3'], about: 'Every line and space.' },
		{ id: 'below', name: 'Below the staff', clef: 'bass', range: ['E2', 'G2'], about: 'Down to the open E.' },
		{ id: 'above', name: 'Above the staff', clef: 'bass', range: ['A3', 'G4'], about: 'Ledger lines, up to the 12th fret of the G string.' },
		{ id: 'first', name: 'First position', clef: 'bass', range: ['E2', 'B3'], about: 'Frets 0 to 4 on every string.' },
		// positions: the hand stays in a box of four frets (a fret a finger), and the notes are found there
		{ id: 'pos2', name: 'Second position', clef: 'bass', box: [2, 5], about: 'First finger at the 2nd fret: frets 2 to 5, no open strings.' },
		{ id: 'pos5', name: 'Fifth position', clef: 'bass', box: [5, 8], about: 'First finger at the 5th fret: frets 5 to 8. The open strings’ notes, a string lower.' },
		{ id: 'pos7', name: 'Seventh position', clef: 'bass', box: [7, 10], about: 'First finger at the 7th fret: frets 7 to 10, up to the top of the staff and over.' },
		{ id: 'pos9', name: 'Ninth position', clef: 'bass', box: [9, 12], about: 'Frets 9 to 12, up to the octave: ledger lines above.' },
		{ id: 'twelve', name: 'Up to fret 12', clef: 'bass', range: ['E2', 'G4'], about: 'The whole of the neck most bass parts use.' },
		{ id: 'low', name: 'Low B string', clef: 'bass', range: ['B1', 'E2'], strings: 5, about: 'For five and six strings: three ledger lines and more.' },
		{ id: 'tstaff', name: 'Treble staff', clef: 'treble', range: ['E4', 'F5'], about: 'Every good boy deserves football; FACE.' },
		{ id: 'tledger', name: 'Treble ledger lines', clef: 'treble', notes: ['A3', 'B3', 'C4', 'D4', 'G5', 'A5', 'B5', 'C6'], about: 'Middle C and the notes past either end.' },
		{ id: 'grand', name: 'Piano score', clef: 'grand', range: ['E2', 'G5'], about: 'Both clefs, as a pianist reads them.' }
	];
	function noteSet(id) { for (var i = 0; i < NOTE_SETS.length; i++) { if (NOTE_SETS[i].id === id) { return NOTE_SETS[i]; } } return NOTE_SETS[0]; }

	/* The pitches a note drill draws from.
	   o: {set, accidentals: 'none' | 'some' | 'all', key (fifths, used instead of accidentals),
	       strings, maxFret (for the neck drills: only what can be played)} */
	function pool(o) {
		o = o || {};
		var set = noteSet(o.set || 'open');
		var range = set.box ? [M.atFret(0, set.box[0]), M.atFret(3, set.box[1])] : set.range;
		var naturals = set.notes ? set.notes.slice() : M.rangeOfNaturals(range[0], range[1]);
		var out = [];
		var key = o.key || 0;
		if (key) {
			var acc = M.keyAccidentals(key);
			naturals.forEach(function (p) { var q = M.parse(p); out.push(M.make(q.L, acc[q.L] || 0, q.o)); });
		} else {
			naturals.forEach(function (p) {
				out.push(p);
				if (o.accidentals === 'some' || o.accidentals === 'all') {
					var q = M.parse(p);
					var odd = { E: 1, B: 1 }, oddFlat = { F: 1, C: 1 };
					if (o.accidentals === 'all' || !odd[q.L]) { out.push(M.make(q.L, 1, q.o)); }
					if (o.accidentals === 'all' || !oddFlat[q.L]) { out.push(M.make(q.L, -1, q.o)); }
				}
			});
		}
		if (o.neck || set.box) {
			var strings = o.strings || 4, maxFret = o.maxFret == null ? 12 : o.maxFret;
			out = out.filter(function (p) { return M.positions(p, boxOf(set, { strings: strings, maxFret: maxFret })).length > 0; });
		}
		return out;
	}
	// Where a note may be found: in a position set, only inside its box of frets (four strings even when
	// the set up has more: the box is the same on the strings it covers)
	function boxOf(set, o) {
		o = o || {};
		if (!set.box) { return { strings: o.strings || 4, maxFret: o.maxFret == null ? 12 : o.maxFret }; }
		return { strings: o.strings || 4, minFret: set.box[0], maxFret: set.box[1] };
	}

	/* ---------- rhythm ---------- */

	// A rhythm is built from cells: a beat or two that a reader learns to see as one shape.
	// x stands for the note (the same pitch throughout a rhythm drill). Cells are [tokens, beats, where they may start].
	function C(tokens, beats, on) { return { t: tokens.split(' '), b: beats, on: on || null }; }
	var CELLS = {
		w: C('x/w', 4, [0]), h: C('x/h', 2, [0, 2]), q: C('x/q', 1),
		rq: C('r/q', 1), rh: C('r/h', 2, [0, 2]),
		ee: C('x/8 x/8', 1), re: C('r/8 x/8', 1), er: C('x/8 r/8', 1),
		dq: C('x/q. x/8', 2, [0, 2]), dh: C('x/h.', 3, [0, 1]),
		syn: C('x/8 x/q x/8', 2, [0, 2]), tie: C('x/8 x/8~ x/8 x/8', 2, [0, 2]), tieq: C('x/q x/8~ x/8', 2, [0, 2]),
		ssss: C('x/16 x/16 x/16 x/16', 1), ess: C('x/8 x/16 x/16', 1), sse: C('x/16 x/16 x/8', 1),
		des: C('x/8. x/16', 1), sde: C('x/16 x/8.', 1), ses: C('x/16 x/8 x/16', 1),
		rsse: C('r/16 x/16 x/8', 1), rds: C('r/8. x/16', 1), srse: C('x/16 r/16 x/8', 1), rsrs: C('r/16 x/16 r/16 x/16', 1), esr: C('x/8 x/16 r/16', 1),
		trip: C('{3 x/8 x/8 x/8 }', 1), tripq: C('{3 x/q x/q x/q }', 2, [0, 2]),
		// six eight, in eighth notes (a beat is a dotted crotchet, 1.5)
		Dq: C('x/q.', 1.5), Dqe: C('x/q x/8', 1.5), Deee: C('x/8 x/8 x/8', 1.5), Deq: C('x/8 x/q', 1.5), Dh: C('x/h.', 3, [0]), Dr: C('r/q.', 1.5), Dree: C('r/8 x/8 x/8', 1.5)
	};
	var RHYTHM = [
		{ n: 1, name: 'Whole, half and quarter notes', time: '4/4', cells: { w: 1, h: 3, q: 5 }, bpm: 70, about: 'Semibreves, minims and crotchets. Count four, say "tea" on each crotchet.' },
		{ n: 2, name: 'Rests', time: '4/4', cells: { h: 2, q: 5, rq: 3, rh: 1 }, bpm: 72, about: 'Silence is counted just like sound.' },
		{ n: 3, name: 'Quavers', time: '4/4', cells: { h: 1, q: 4, rq: 1, ee: 5 }, bpm: 72, about: 'Two to a beat: "cof-fee".' },
		{ n: 4, name: 'Off the beat', time: '4/4', cells: { q: 3, rq: 1, ee: 3, re: 3, er: 2 }, bpm: 72, about: 'Quaver rests: the note on the "and".' },
		{ n: 5, name: 'Dotted notes', time: '4/4', cells: { q: 3, ee: 3, dq: 4, dh: 2, h: 1, rq: 1 }, bpm: 76, about: 'A dot adds half again.' },
		{ n: 6, name: 'Ties and syncopation', time: '4/4', cells: { q: 2, ee: 3, syn: 3, tie: 2, tieq: 2, dq: 2, re: 1 }, bpm: 76, about: 'A tie joins two notes into one sound.' },
		{ n: 7, name: 'Semiquavers', time: '4/4', cells: { q: 2, ee: 3, ssss: 4, ess: 3, sse: 3 }, bpm: 66, about: 'Four to a beat: "1 e & a", or "Co-ca Co-la".' },
		{ n: 8, name: 'Dotted quavers', time: '4/4', cells: { q: 1, ee: 2, ssss: 2, ess: 2, sse: 2, des: 3, sde: 2, ses: 3 }, bpm: 66, about: 'The shuffle and the snap of funk.' },
		{ n: 9, name: 'The semiquaver grid', time: '4/4', cells: { ee: 1, ssss: 1, ess: 2, sse: 2, des: 1, rsse: 3, rds: 3, srse: 2, rsrs: 2, esr: 2 }, bpm: 64, about: 'Semiquaver rests: every one of the sixteen places.' },
		{ n: 10, name: 'Triplets', time: '4/4', cells: { q: 3, ee: 2, trip: 4, tripq: 2, h: 1 }, bpm: 70, about: 'Three in the space of two.' },
		{ n: 11, name: 'Three four', time: '3/4', cells: { q: 4, ee: 3, h: 2, dh: 1, rq: 1, dq: 1 }, bpm: 84, about: 'Three crotchets to a bar: the waltz.' },
		{ n: 12, name: 'Six eight', time: '6/8', cells: { Dq: 3, Dqe: 4, Deee: 4, Deq: 2, Dh: 1, Dr: 1, Dree: 1 }, bpm: 56, about: 'Two dotted crotchet beats, each of three quavers.' }
	];

	// One bar: cells chosen to fill it, each starting where it may.
	function rhythmBar(level, rnd, o) {
		o = o || {};
		var L = RHYTHM[(level || 1) - 1], beats = M.barBeats(L.time), names = Object.keys(L.cells);
		var newest = RHYTHM[(level || 1) - 2] ? names.filter(function (n) { return !RHYTHM[level - 2].cells[n]; }) : names;
		for (var tries = 0; tries < 60; tries++) {
			var at = 0, toks = [], used = {}, names_ = [];
			while (at < beats - 1e-6) {
				var fit = names.filter(function (n) {
					var c = CELLS[n];
					if (c.b > beats - at + 1e-6) { return false; }
					if (c.on && c.on.indexOf(at) < 0) { return false; }
					// a cell that is longer than a beat starts on a strong beat in four four
					if (!c.on && L.time === '4/4' && c.b >= 2 && at % 2) { return false; }
					return true;
				});
				if (!fit.length) { break; }
				var n = weighted(fit, function (k) { return L.cells[k] * (newest.indexOf(k) >= 0 ? 1.6 : 1); }, rnd);
				used[n] = true; names_.push(n);
				CELLS[n].t.forEach(function (t) { toks.push(t); });
				at += CELLS[n].b;
			}
			if (Math.abs(at - beats) > 1e-6) { continue; }
			// a bar of nothing but rest, or (above level 2) one long note, is not much of a question
			var notes = toks.filter(function (t) { return /^x/.test(t); }).length;
			if (!notes) { continue; }
			if (level > 2 && notes < 2 && !o.allowSparse) { continue; }
			// above level 2 the bar should show something of this level
			if (level > 2 && newest.length && !newest.some(function (k) { return used[k]; }) && rnd() < 0.7) { continue; }
			if (o.cellsOut) { o.cellsOut.length = 0; names_.forEach(function (k) { o.cellsOut.push(k); }); }
			return toks.join(' ');
		}
		return L.time === '6/8' ? 'x/q. x/q.' : 'x/q x/q x/q x/q';
	}
	// Whether a cell may go next, "at" beats into a bar of this level (as the generator places them)
	function cellFits(level, name, at) {
		var L = RHYTHM[(level || 1) - 1], c = CELLS[name], beats = M.barBeats(L.time);
		if (!c || c.b > beats - at + 1e-6) { return false; }
		if (c.on && c.on.indexOf(at) < 0) { return false; }
		if (!c.on && L.time === '4/4' && c.b >= 2 && at % 2) { return false; }
		return true;
	}
	// Cells written out as a bar on one pitch
	function cellsNotes(names, pitch) {
		var toks = []; (names || []).forEach(function (k) { if (CELLS[k]) { CELLS[k].t.forEach(function (t) { toks.push(t); }); } });
		return toks.join(' ').replace(/x\//g, (pitch || 'A2') + '/');
	}
	// What a rhythm sounds like: each note's start and length (tied notes as one), and the whole length.
	// Two ways of writing that sound the same (a tie or a longer note) come out the same.
	function sounds(notes) {
		var out = [], t = 0, prevTie = false;
		M.parseNotes(notes).forEach(function (bar) {
			bar.items.forEach(function (it) {
				if (it.rest) { prevTie = false; t += it.beats; return; }
				if (prevTie && out.length) { out[out.length - 1][1] += it.beats; }
				else { out.push([t, it.beats]); }
				prevTie = !!it.tie; t += it.beats;
			});
		});
		return out.map(function (x) { return Math.round(x[0] * 96) + ':' + Math.round(x[1] * 96); }).join(' ') + ' / ' + Math.round(t * 96);
	}
	function rhythmLine(level, bars, rnd, o) {
		o = o || {};
		var out = [], prev = null;
		for (var b = 0; b < (bars || 1); b++) {
			var bar, k = 0;
			do { bar = rhythmBar(level, rnd, o); k++; } while (bar === prev && k < 8);
			out.push(bar); prev = bar;
		}
		var pitch = o.pitch || 'A2';
		return out.join(' | ').replace(/x\//g, pitch + '/');
	}

	/* The moments a rhythm asks you to play: every note's start, in beats from the top,
	   leaving out rests and the second half of a tie. */
	function targets(notes) {
		var bars = M.parseNotes(notes), out = [], t = 0, prevTie = false;
		bars.forEach(function (bar) {
			bar.items.forEach(function (it) {
				if (!it.rest && !prevTie) { out.push(t); }
				prevTie = !it.rest && it.tie;
				t += it.beats;
			});
		});
		return { at: out, length: t };
	}

	/* Mark taps against a rhythm. targets and taps are in seconds from the first beat.
	   o: {beat (seconds a beat lasts)}. A tap within "tight" of its note is on time; within half the
	   gap to its neighbours it is early or late; otherwise the note was missed and the tap is extra. */
	function scoreTaps(targetsSec, taps, o) {
		o = o || {};
		var beat = o.beat || 0.75;
		var tight = Math.max(0.06, Math.min(0.13, 0.22 * beat));
		var used = taps.map(function () { return false; });
		var res = targetsSec.map(function (t, i) {
			var before = i ? t - targetsSec[i - 1] : beat, after = i < targetsSec.length - 1 ? targetsSec[i + 1] - t : beat;
			var reach = Math.max(tight, Math.min(before, after) * 0.5);
			var best = -1, bd = Infinity;
			taps.forEach(function (x, k) { if (!used[k] && Math.abs(x - t) < bd) { bd = Math.abs(x - t); best = k; } });
			if (best >= 0 && bd <= reach) {
				used[best] = true;
				var err = taps[best] - t;
				return { t: t, tap: taps[best], err: err, how: Math.abs(err) <= tight ? 'ok' : err < 0 ? 'early' : 'late' };
			}
			return { t: t, tap: null, err: null, how: 'miss' };
		});
		var extra = taps.filter(function (x, k) { return !used[k]; });
		var onTime = res.filter(function (r) { return r.how === 'ok'; }).length;
		var errs = res.filter(function (r) { return r.err !== null; }).map(function (r) { return r.err; });
		var mean = errs.length ? errs.reduce(function (a, b) { return a + b; }, 0) / errs.length : 0;
		var spread = errs.length ? Math.sqrt(errs.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / errs.length) : 0;
		return { notes: res, extra: extra, onTime: onTime, of: res.length, ok: onTime === res.length && extra.length === 0, mean: mean, spread: spread, tight: tight };
	}

	/* ---------- sight reading ---------- */

	// Graded like the Guide: open strings first (as most bass reading courses do), then first position, keys,
	// rhythms, the neck above the fifth fret, roadmaps, and everything together.
	var SIGHT = [
		{ n: 1, name: 'Open E and A', notes: ['E2', 'A2'], keys: [0], rhythm: 1, cells: { w: 1, h: 3 }, bars: 4, bpm: 70 },
		{ n: 2, name: 'All four open strings', notes: ['E2', 'A2', 'D3', 'G3'], keys: [0], rhythm: 2, bars: 4, bpm: 72 },
		{ n: 3, name: 'E and A strings, first position', notes: ['E2', 'F2', 'G2', 'A2', 'B2', 'C3'], keys: [0], rhythm: 2, bars: 4, bpm: 72 },
		{ n: 4, name: 'C major in first position', range: ['E2', 'B3'], keys: [0], rhythm: 3, bars: 4, bpm: 72 },
		{ n: 5, name: 'C major and A minor, off the beat', range: ['E2', 'B3'], keys: [0], tonics: ['C', 'A'], rhythm: 4, bars: 4, bpm: 76 },
		{ n: 6, name: 'One sharp: G major and E minor', range: ['E2', 'B3'], keys: [1], rhythm: 5, bars: 4, bpm: 76 },
		{ n: 7, name: 'One flat, and accidentals', range: ['E2', 'C4'], keys: [-1, 0, 1], rhythm: 6, bars: 4, bpm: 76, chromatic: 0.12 },
		{ n: 8, name: 'Two sharps and two flats, semiquavers', range: ['E2', 'C4'], keys: [-2, -1, 1, 2], rhythm: 7, bars: 4, bpm: 66, chromatic: 0.1 },
		{ n: 9, name: 'Up the neck', range: ['A2', 'G4'], keys: [-3, -2, -1, 0, 1, 2, 3], rhythm: 8, bars: 4, bpm: 70, chromatic: 0.1, symbols: true },
		{ n: 10, name: 'Roadmaps and syncopation', range: ['E2', 'E4'], keys: [-3, -2, -1, 0, 1, 2, 3], rhythm: 9, bars: 4, bpm: 70, chromatic: 0.1, roadmap: true, symbols: true },
		{ n: 11, name: 'Triplets and six eight', range: ['E2', 'E4'], keys: [-4, -3, -2, -1, 0, 1, 2, 3, 4], rhythm: [10, 12], bars: 4, bpm: 64, chromatic: 0.08, symbols: true },
		{ n: 12, name: 'Everything', range: ['E2', 'G4'], keys: [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5], rhythm: [6, 8, 9, 10], bars: 8, bpm: 72, chromatic: 0.1, roadmap: true, symbols: true }
	];

	function scaleNotesIn(lo, hi, key, mode) {
		var tonicName = mode === 'minor' ? M.minorOf(key) : M.majorOf(key);
		var acc = M.keyAccidentals(key), out = [];
		M.rangeOfNaturals(lo, hi).forEach(function (p) { var q = M.parse(p); out.push(M.make(q.L, acc[q.L] || 0, q.o)); });
		return { notes: out.filter(function (p) { return M.midi(p) >= M.midi(lo) && M.midi(p) <= M.midi(hi) + 1 && M.positions(p, { maxFret: 15 }).length > 0; }), tonic: tonicName.replace(/[#b]/, '').charAt(0), tonicName: tonicName };
	}

	function sightPiece(level, rnd, o) {
		o = o || {};
		rnd = rnd || Math.random;
		var L = SIGHT[(level || 1) - 1];
		var key = pickOne(L.keys, rnd);
		var mode = L.tonics ? (pickOne(L.tonics, rnd) === 'A' ? 'minor' : 'major') : rnd() < 0.35 ? 'minor' : 'major';
		if (L.notes) { mode = 'major'; }
		var rl = Array.isArray(L.rhythm) ? pickOne(L.rhythm, rnd) : L.rhythm;
		var R = RHYTHM[rl - 1];
		var time = R.time;
		var bars = o.bars || L.bars;
		// the rhythm: from the level's cells (the first levels have their own short list)
		var rhythmBars = [];
		for (var b = 0; b < bars; b++) {
			var bar = L.cells ? cellsBar(L.cells, M.barBeats(time), rnd) : rhythmBar(rl, rnd, { allowSparse: true });
			if (b === bars - 1) { bar = endBar(time, rnd, bar); }
			rhythmBars.push(bar);
		}
		// the pitches
		var poolNotes, tonicL;
		if (L.notes) { poolNotes = L.notes.slice(); tonicL = null; }
		else {
			var sc = scaleNotesIn(L.range[0], L.range[1], key, mode);
			poolNotes = sc.notes; tonicL = sc.tonic;
		}
		poolNotes.sort(function (a, b) { return M.midi(a) - M.midi(b); });
		var tokens = rhythmBars.join(' | ').split(' ');
		var slots = tokens.filter(function (t) { return /^x/.test(t); }).length;
		var line = walk(poolNotes, slots, tonicL, rnd, !!L.notes);
		// a few chromatic notes, each leading by a semitone into the note after it
		if (L.chromatic) {
			for (var i = 1; i < line.length - 1; i++) {
				if (rnd() < L.chromatic && M.midi(line[i + 1]) !== M.midi(line[i])) {
					var target = M.midi(line[i + 1]), up = target > M.midi(line[i - 1]);
					var cand = M.fromMidi(target + (up ? -1 : 1), { prefer: up ? '#' : 'b' });
					if (poolNotes.indexOf(cand) < 0 && M.midi(cand) >= M.midi(L.range[0]) && M.midi(cand) <= M.midi(L.range[1]) && M.positions(cand, { maxFret: 14 }).length) { line[i] = cand; }
				}
			}
		}
		// ties keep their pitch across
		var k = 0, prevTie = false, last = null;
		var out = tokens.map(function (t) {
			if (!/^x/.test(t)) { return t; }
			var p = prevTie ? last : line[k];
			k++;
			prevTie = /~$/.test(t); last = p;
			return t.replace('x', p);
		});
		var notes = out.join(' ');
		// chord symbols over each bar, from the key's own chords, chosen to suit the bar's notes
		if (L.symbols && !L.notes) { notes = addSymbols(notes, key, mode, rnd); }
		if (L.roadmap && bars >= 4 && rnd() < 0.8) { notes = addRoadmap(notes, rnd); }
		var bpm = o.bpm || L.bpm;
		return { level: L.n, notes: notes, key: key, mode: mode, time: time, bpm: bpm, name: L.name, keyName: L.notes ? 'Open strings' : M.keyName(key, mode) };
	}
	function cellsBar(cells, beats, rnd) {
		var at = 0, toks = [], names = Object.keys(cells);
		while (at < beats - 1e-6) {
			var fit = names.filter(function (n) { var c = CELLS[n]; return c.b <= beats - at + 1e-6 && (!c.on || c.on.indexOf(at) >= 0); });
			var n = weighted(fit, function (x) { return cells[x]; }, rnd);
			CELLS[n].t.forEach(function (t) { toks.push(t); });
			at += CELLS[n].b;
		}
		return toks.join(' ');
	}
	// The last bar ends on a long note, so a piece sounds finished.
	function endBar(time, rnd, bar) {
		if (time === '6/8') { return rnd() < 0.5 ? 'x/h.' : 'x/q x/8 x/q.'; }
		if (time === '3/4') { return rnd() < 0.5 ? 'x/h.' : 'x/q x/h'; }
		return pickOne(['x/w', 'x/h x/h', 'x/q x/q x/h', 'x/8 x/8 x/q x/h'], rnd);
	}
	// A line that mostly moves by step, starting and ending at home.
	function walk(notes, n, tonicL, rnd, free) {
		var idx = function (p) { return notes.indexOf(p); };
		var homes = tonicL ? notes.filter(function (p) { return M.parse(p).L === tonicL; }) : notes;
		var mid = (notes.length - 1) / 2;
		var start = homes.slice().sort(function (a, b) { return Math.abs(idx(a) - mid) - Math.abs(idx(b) - mid); })[0];
		var i = idx(start), out = [];
		for (var k = 0; k < n; k++) {
			if (k === 0) { out.push(notes[i]); continue; }
			if (free) { var j; do { j = Math.floor(rnd() * notes.length); } while (notes.length > 1 && j === i && rnd() < 0.7); i = j; out.push(notes[i]); continue; }
			var r = rnd(), step = r < 0.1 ? 0 : r < 0.6 ? 1 : r < 0.84 ? 2 : r < 0.92 ? 3 : r < 0.97 ? 4 : 7;
			var dir = rnd() < 0.5 ? -1 : 1;
			if (i + dir * step < 0 || i + dir * step >= notes.length) { dir = -dir; }
			i = Math.max(0, Math.min(notes.length - 1, i + dir * step));
			out.push(notes[i]);
		}
		// finish at home: the nearest home note to where the line has got to
		if (tonicL && n > 1) {
			var lastI = idx(out[n - 2]);
			out[n - 1] = homes.slice().sort(function (a, b) { return Math.abs(idx(a) - lastI) - Math.abs(idx(b) - lastI); })[0];
		}
		return out;
	}
	function addSymbols(notes, key, mode, rnd) {
		var tonic = (mode === 'minor' ? M.minorOf(key) : M.majorOf(key)) + '3';
		var chords = M.diatonicChords(tonic, mode);
		var bars = notes.split(' | ');
		return bars.map(function (bar, bi) {
			var pcs = bar.split(' ').map(function (t) { var m = /^([A-G][#b]*\d)/.exec(t); return m ? M.parse(m[1]).pc : null; }).filter(function (x) { return x !== null; });
			var best = chords[0], bs = -1;
			chords.forEach(function (c) {
				var tones = M.chord(c.root, c.qual).map(function (p) { return M.parse(p).pc; });
				var s = pcs.filter(function (pc) { return tones.indexOf(pc) >= 0; }).length + (bi === 0 || bi === bars.length - 1 ? (c.degree === 1 ? 2 : 0) : 0) + rnd() * 0.5;
				if (c.qual === 'dim') { s -= 1; }
				if (s > bs) { bs = s; best = c; }
			});
			return '"' + best.symbol.replace(/ /g, '_') + '" ' + bar;
		}).join(' | ');
	}
	// Four bars become: repeat the first three, with a first and second time bar.
	function addRoadmap(notes, rnd) {
		var bars = notes.split(' | ');
		if (bars.length < 4) { return notes; }
		var n = bars.length;
		bars[0] = '|: ' + bars[0];
		bars[n - 2] = '[1. ' + bars[n - 2] + ' :|';
		bars[n - 1] = '[2. ' + bars[n - 1];
		return bars.slice(0, n - 1).join(' | ').replace(' :| | ', ' :| ') + ' ' + bars[n - 1];
	}

	/* The order a piece is actually played in, bar by bar, with repeats and first and second
	   time bars taken (and D.S. and D.C. followed). Bars are from RDM.parseNotes. */
	function playOrder(bars) {
		var out = [], i = 0, from = 0, taken = {}, guard = 0, segno = 0, jumped = false, toCoda = -1, coda = -1;
		bars.forEach(function (b, k) { if (b.marks.indexOf('segno') >= 0) { segno = k; } if (b.marks.indexOf('coda') >= 0) { coda = k; } if (b.marks.indexOf('tocoda') >= 0) { toCoda = k; } });
		var pass = 1;
		while (i < bars.length && guard++ < 400) {
			var b = bars[i];
			if (b.start === '|:' && !taken['s' + i]) { from = i; }
			if (b.volta && b.volta !== pass) {
				// skip to the volta that matches this pass
				var j = i + 1;
				while (j < bars.length && bars[j].volta !== pass && !(bars[j].volta == null && j > i && bars[j - 1].end === ':|')) { j++; }
				if (j >= bars.length) { break; }
				i = j; continue;
			}
			out.push(i);
			if (jumped && i === toCoda && coda >= 0) { i = coda; continue; }
			if (b.end === ':|' && !taken['r' + i]) { taken['r' + i] = true; taken['s' + from] = true; pass = 2; i = from; continue; }
			if (!jumped && b.marks.some(function (m) { return /^(ds|dc)/.test(m); })) {
				jumped = true; pass = 1;
				i = b.marks.some(function (m) { return /^ds/.test(m); }) ? segno : 0;
				continue;
			}
			if (jumped && b.marks.indexOf('fine') >= 0) { break; }
			if (b.volta) { pass = 1; }
			i++;
		}
		return out;
	}

	/* ---------- one question ---------- */

	var INTERVALS = {
		numbers: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'M7', 'P8'],
		octave: ['m2', 'M2', 'm3', 'M3', 'P4', 'A4', 'd5', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'],
		wide: ['m2', 'M2', 'm3', 'M3', 'P4', 'A4', 'd5', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8', 'm9', 'M9', 'm10', 'M10']
	};
	var CHORD_SETS = {
		diatonic: { name: 'In C major', quals: ['M', 'm', 'dim'], diatonic: true },
		triads: { name: 'Major and minor', quals: ['M', 'm'] },
		four: { name: 'All four triads', quals: ['M', 'm', 'dim', 'aug'] },
		sevenths: { name: 'Seventh chords', quals: ['7', 'M7', 'm7', 'h7', 'dim7'] },
		inversions: { name: 'Inversions', quals: ['M', 'm'], inv: true }
	};
	var CHORD_ROOTS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Bb', 'Eb', 'Ab', 'F#', 'Db'];

	/* How often each item has gone wrong lately, or been slow: the next question leans towards those. */
	function weightsFrom(log, drill) {
		var st = stats(log).items, w = {};
		Object.keys(st).forEach(function (k) {
			var r = st[k]; if (r.drill !== drill) { return; }
			var misses = r.last.filter(function (x) { return !x; }).length;
			w[r.item] = 1 + misses * 1.2 + (r.recognised && !r.immediate ? 0.8 : 0) + (r.recognised ? 0 : 0.4);
		});
		return w;
	}

	function question(drill, o, log, last, rnd) {
		o = o || {}; rnd = rnd || Math.random;
		var w = weightsFrom(log, drill);
		var wf = function (item) { return (w[item] || 1.4) * (item === last ? 0.05 : 1); };
		var q = { drill: drill, at: 0 };
		if (drill === 'name' || drill === 'find') {
			var set = noteSet(o.set || 'open');
			var list = o.only && o.only.length ? o.only.slice() : pool({ set: set.id, accidentals: o.accidentals, key: o.key, neck: drill === 'find', strings: o.strings, maxFret: o.maxFret });
			if (!list.length) { list = ['A2']; }
			var p = weighted(list, wf, rnd);
			q.item = p; q.pitch = p; q.clef = set.clef === 'grand' ? (M.midi(p) >= 60 ? 'treble' : 'bass') : set.clef; q.grand = set.clef === 'grand';
			q.key = o.key || 0;
			if (drill === 'find') { q.places = M.positions(p, boxOf(set, o)); q.every = !!o.every; q.box = set.box || null; q.boxName = set.box ? set.name : ''; }
			return q;
		}
		if (drill === 'write') {
			var spots = [];
			var setW = noteSet(o.set || 'open');
			var pl = o.only && o.only.length ? o.only : pool({ set: setW.id, accidentals: o.accidentals, key: o.key, neck: true, strings: o.strings, maxFret: o.maxFret });
			pl.forEach(function (pp) { M.positions(pp, boxOf(setW, o)).forEach(function (c) { spots.push({ p: pp, s: c.s, f: c.f, string: c.string }); }); });
			if (!spots.length) { spots = [{ p: 'A2', s: 1, f: 0, string: 'A' }]; }
			var sp = weighted(spots, function (x) { return wf(x.p); }, rnd);
			q.item = sp.p; q.pitch = sp.p; q.spot = sp; q.clef = 'bass'; q.key = o.key || 0;
			return q;
		}
		if (drill === 'play') {
			var setP = noteSet(o.set || 'open');
			var plp = o.only && o.only.length ? o.only : pool({ set: setP.id, accidentals: o.accidentals, key: o.key, neck: true, strings: o.strings, maxFret: o.maxFret });
			var n = o.length || 6, line = [], prev = null;
			for (var k = 0; k < n; k++) {
				var pk, guard = 0;
				do { pk = weighted(plp, wf, rnd); guard++; } while (pk === prev && plp.length > 1 && guard < 10);
				line.push(pk); prev = pk;
			}
			q.line = line; q.item = 'line'; q.clef = 'bass'; q.key = o.key || 0;
			q.notes = line.map(function (x) { return x + '/q'; }).join(' ');
			return q;
		}
		if (drill === 'rwrite') {
			var lw = o.level || 1, RW = RHYTHM[lw - 1], cells = [], prevBar = o.avoid || null;
			q.level = lw; q.item = 'R' + lw; q.time = RW.time; q.bpm = o.bpm || RW.bpm;
			for (var tr = 0; tr < 8; tr++) { rhythmBar(lw, rnd, { cellsOut: cells }); q.notes = cellsNotes(cells, o.pitch || 'A2'); if (q.notes !== prevBar) { break; } }
			q.cells = cells.slice();
			q.palette = Object.keys(RW.cells);
			return q;
		}
		if (drill === 'tap' || drill === 'hear') {
			var lvl = o.level || 1, R = RHYTHM[lvl - 1];
			q.level = lvl; q.item = 'R' + lvl; q.time = R.time; q.bpm = o.bpm || R.bpm;
			var barsN = o.bars || (drill === 'tap' ? 2 : 1);
			if (drill === 'tap') { q.notes = rhythmLine(lvl, barsN, rnd, { pitch: o.pitch || 'A2' }); return q; }
			var seen = {}, opts = [];
			for (var g = 0; g < 40 && opts.length < 3; g++) {
				var r = rhythmLine(lvl, 1, rnd, { pitch: o.pitch || 'A2' });
				var sig = targets(r).at.join(',');
				if (!seen[sig]) { seen[sig] = 1; opts.push(r); }
			}
			while (opts.length < 3) { opts.push(opts[0]); }
			q.options = opts; q.answer = Math.floor(rnd() * opts.length); q.notes = opts[q.answer];
			return q;
		}
		if (drill === 'sight') {
			var piece = sightPiece(o.level || 1, rnd, o);
			for (var key in piece) { q[key] = piece[key]; }
			q.item = 'S' + piece.level;
			return q;
		}
		if (drill === 'band') {
			var part = bassPiece(o.level || 1, rnd, o);
			for (var pk in part) { q[pk] = part[pk]; }
			q.item = 'B' + part.level;
			return q;
		}
		if (drill === 'key') {
			var range = o.range || 4;
			var keys = [];
			for (var f = -range; f <= range; f++) { keys.push(f); }
			var kf = weighted(keys, function (x) { return wf('k' + x); }, rnd);
			q.key = kf; q.mode = o.mode === 'minor' ? 'minor' : o.mode === 'both' ? (rnd() < 0.5 ? 'major' : 'minor') : 'major';
			q.item = 'k' + kf; q.clef = o.clef === 'treble' ? 'treble' : 'bass';
			q.reverse = !!o.reverse;
			q.answer = q.mode === 'minor' ? M.minorOf(kf) : M.majorOf(kf);
			return q;
		}
		if (drill === 'int') {
			var codes = INTERVALS[o.set || 'octave'] || INTERVALS.octave;
			var code = weighted(codes, wf, rnd);
			var lowList = pool({ set: 'first', accidentals: o.set === 'numbers' ? 'none' : 'some' });
			var lo, hi, tries = 0;
			do {
				lo = pickOne(lowList, rnd);
				hi = code === 'P1' ? lo : M.transpose(lo, code);
				tries++;
			} while ((Math.abs(M.parse(hi).a) > 1 || M.midi(hi) > M.midi('C4') + (o.set === 'wide' ? 5 : 0)) && tries < 60);
			var down = !!o.down && rnd() < 0.5;
			q.item = code; q.code = code; q.lo = lo; q.hi = hi; q.down = down; q.harmonic = o.harmonic === true || (o.harmonic === 'mix' && rnd() < 0.5);
			q.notes = q.harmonic ? lo + '+' + hi + '/w' : (down ? hi + '/h ' + lo + '/h' : lo + '/h ' + hi + '/h');
			q.numbersOnly = o.set === 'numbers';
			return q;
		}
		if (drill === 'chord') {
			var cs = CHORD_SETS[o.set || 'triads'] || CHORD_SETS.triads, root, qual;
			if (cs.diatonic) {
				var dc = weighted(M.diatonicChords('C3', 'major'), function (c) { return wf(c.qual + '-' + c.root); }, rnd);
				root = dc.root; qual = dc.qual;
			} else {
				qual = weighted(cs.quals, wf, rnd);
				var rn = pickOne(CHORD_ROOTS, rnd);
				root = rn + (['C', 'Db', 'D', 'Eb'].indexOf(rn) >= 0 ? '3' : '2');
				if (M.midi(root) < M.midi('E2')) { root = rn + '3'; }
			}
			var inv = cs.inv ? Math.floor(rnd() * 3) : 0;
			var tones = M.chord(root, qual, inv);
			// a beginner's chord is spelled with nothing stranger than a single sharp or flat
			var odd = function (t) { var pp = M.parse(t); return Math.abs(pp.a) > 1 || /^(Fb|Cb|E#|B#)/.test(t); };
			if (!cs.diatonic && tones.some(odd) && (o._tries || 0) < 30) { return question(drill, extend(o, { _tries: (o._tries || 0) + 1 }), log, last, rnd); }
			q.item = qual; q.root = M.letterName(root); q.qual = qual; q.inv = inv; q.tones = tones;
			q.broken = o.broken === true || (o.broken === 'mix' && rnd() < 0.5);
			q.notes = q.broken ? tones.map(function (t) { return t + '/q'; }).join(' ') : tones.join('+') + '/w';
			if (q.broken && tones.length === 3) { q.notes += ' ' + tones[0] + '/q'; }
			q.time = q.broken ? '4/4' : null;
			return q;
		}
		return q;
	}

	/* ---------- marking ---------- */

	function mark(q, said) {
		var M2 = M;
		if (q.drill === 'name') {
			var p = M2.parse(q.pitch);
			var ok = said && said.L === p.L && (said.a || 0) === p.a;
			var sameSound = !ok && said && ((M2.LETTER_PC[said.L] + (said.a || 0)) % 12 + 12) % 12 === p.pc;
			return { ok: !!ok, sameSound: !!sameSound, x: said ? said.L + ({ 1: '#', '-1': 'b' }[said.a] || '') : '' };
		}
		if (q.drill === 'find') {
			var right = said && q.places.some(function (c) { return c.s === said.s && c.f === said.f; });
			var at = said ? M2.midi(M2.strings(said.strings || 4)[said.s]) + said.f : null;
			// the right note outside the position's box is told apart from a wrong octave
			var outside = said && !right && q.box && at === M2.midi(q.pitch);
			var heardSame = said && !right && !outside && at % 12 === M2.parse(q.pitch).pc;
			return { ok: !!right, octave: !!heardSame, outside: !!outside, x: said ? 's' + said.s + '.' + said.f : '' };
		}
		if (q.drill === 'write') {
			var tp = M2.parse(q.pitch);
			var ok2 = said && said.step === tp.step && said.a === tp.a;
			var sameSound2 = !ok2 && said && (M2.midi(M2.fromStep(said.step, said.a)) === tp.midi);
			var octave = !ok2 && said && !sameSound2 && ((M2.parse(M2.fromStep(said.step, said.a)).pc) === tp.pc);
			// a different spelling of the same sound is right on the neck, but the key decides on the page
			if (sameSound2 && !q.key) { ok2 = true; }
			return { ok: !!ok2, sameSound: !!sameSound2, octave: !!octave, x: said ? M2.fromStep(said.step, said.a) : '' };
		}
		if (q.drill === 'key') {
			var want = q.answer.replace('#', M2.SHARP).replace('b', M2.FLAT);
			if (q.reverse) { return { ok: said === q.key, x: 'k' + said }; }
			return { ok: said === q.answer || said === want, x: String(said || '').replace(M2.SHARP, '#').replace(M2.FLAT, 'b') };
		}
		if (q.drill === 'int') {
			if (q.numbersOnly) { return { ok: +said === M2.interval(q.lo, q.hi).num, x: String(said) }; }
			return { ok: said === q.code, x: String(said) };
		}
		if (q.drill === 'chord') {
			var rootOk = said && said.root && said.root.replace(M2.SHARP, '#').replace(M2.FLAT, 'b') === q.root.replace(M2.SHARP, '#').replace(M2.FLAT, 'b');
			return { ok: !!(rootOk && said.qual === q.qual), rootOk: !!rootOk, qualOk: !!(said && said.qual === q.qual), x: said ? (said.root || '') + (said.qual || '') : '' };
		}
		if (q.drill === 'hear') { return { ok: said === q.answer, x: String(said) }; }
		if (q.drill === 'rwrite') {
			// said: the cells written, in order. Right when it sounds as the bar played did.
			var mine = sounds(cellsNotes(said, 'A2')), want = sounds(q.notes);
			var beatsRight = 0, per = M.barBeats(q.time), unit = M.beatUnit(q.time);
			for (var bt = 0; bt < per - 1e-6; bt += unit) {
				var within = function (str) { return str.split(' / ')[0].split(' ').filter(function (x) { var a = +x.split(':')[0] / 96; return x && a >= bt - 1e-6 && a < bt + unit - 1e-6; }).join(' '); };
				if (within(mine) === within(want)) { beatsRight++; }
			}
			return { ok: mine === want, beats: beatsRight, of: Math.round(per / unit), x: (said || []).join('.') };
		}
		return { ok: false };
	}

	/* A note heard from a bass (sounding MIDI) against a written pitch: right if it is the same note.
	   The octave is reported, not marked: a low string's octave is easy for a microphone to mistake. */
	function heardMatches(written, soundingMidi) {
		var w = M.midi(written) - 12;
		return { ok: ((soundingMidi - w) % 12 + 12) % 12 === 0, octave: soundingMidi !== w };
	}

	/* ---------- the record ---------- */

	// One line: {t, d, q, k, ok, n, s, x, v, ms}. As Ear Training's, with how long the answer took (ms).
	function entry(q, ok, o) {
		o = o || {};
		var code = function (v) { return String(v == null ? '' : v).replace(/[^A-Za-z0-9#.\-]/g, '').slice(0, 40); };
		return {
			t: o.now || Date.now(), d: q.drill, q: code(o.item || q.item), k: o.k || 0, ok: !!ok,
			n: o.tries || 0, s: !!o.shown, x: code(o.said), v: o.via || 'tap', ms: Math.max(0, Math.min(600000, Math.round(o.ms || 0)))
		};
	}
	function day(t) { var d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
	function median(a) { if (!a.length) { return null; } var s = a.slice().sort(function (x, y) { return x - y; }); var m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }

	/* Recognised: four first-time answers from the last five, on two different days (the rule
	   Harmonic Elements and Ear Training use). Immediate: recognised, and the right answers among
	   those five took no longer than the drill's "fast" time, as a median. */
	function stats(log) {
		var items = {};
		(log || []).forEach(function (e) {
			if (!DRILLS[e.d]) { return; }
			var key = e.d + ':' + e.q;
			var r = items[key] || (items[key] = { key: key, drill: e.d, item: e.q, attempts: 0, right: 0, last: [], days: [], times: [] });
			r.attempts++;
			if (e.ok) { r.right++; }
			r.last.push(!!e.ok);
			r.days.push(day(e.t));
			r.times.push(e.ok && e.ms ? e.ms : null);
			r.lastT = Math.max(r.lastT || 0, e.t);
		});
		Object.keys(items).forEach(function (key) {
			var r = items[key], days = r.days.slice(-5), last = r.last.slice(-5), times = r.times.slice(-5), okDays = {};
			last.forEach(function (ok, i) { if (ok) { okDays[days[i]] = true; } });
			r.last = last;
			r.recognised = last.length === 5 && last.filter(Boolean).length >= 4 && Object.keys(okDays).length >= 2;
			r.median = median(times.filter(function (x) { return x; }));
			var fast = DRILLS[r.drill].fast;
			r.immediate = !!(fast && r.recognised && r.median !== null && r.median <= fast);
			r.missedLately = last.slice(-3).some(function (x) { return !x; });
			delete r.days; delete r.times;
		});
		return { items: items };
	}

	/* ---------- the Map ---------- */

	/* Every written note a bass reaches (to the 12th fret), and how each link is made for it.
	   Notes are gathered by sound, so C♯ and D♭ are one place on the neck; the page shows both names.
	   o: {strings, maxFret, drills: ['name', 'find', 'write', 'play']} */
	var LEVELS = ['unseen', 'seen', 'recognised', 'immediate'];
	function map(log, o) {
		o = o || {};
		var strings = o.strings || 4, maxFret = o.maxFret == null ? 12 : o.maxFret;
		var tun = M.strings(strings), lo = M.midi(tun[0]), hi = M.midi(tun[tun.length - 1]) + maxFret;
		var drills = o.drills || ['name', 'find', 'write', 'play'];
		var st = stats(log).items, by = {};
		Object.keys(st).forEach(function (k) {
			var r = st[k];
			if (drills.indexOf(r.drill) < 0) { return; }
			var p = M.parse(r.item); if (!p) { return; }
			var cell = by[p.midi] || (by[p.midi] = { midi: p.midi, drills: {}, names: {} });
			cell.names[r.item] = true;
			cell.drills[r.drill] = r;
		});
		var out = [];
		for (var m = lo; m <= hi; m++) {
			var c = by[m] || { midi: m, drills: {}, names: {} };
			var levels = drills.map(function (d) { var r = c.drills[d]; return !r ? 0 : r.immediate ? 3 : r.recognised ? 2 : 1; });
			var seenAny = levels.some(function (x) { return x > 0; });
			// a note is only as immediate as its weakest link that has been tried
			var tried = levels.filter(function (x) { return x > 0; });
			var level = !seenAny ? 0 : Math.min.apply(null, tried);
			var missed = drills.some(function (d) { return c.drills[d] && c.drills[d].missedLately; });
			var med = drills.map(function (d) { return c.drills[d] && c.drills[d].median; }).filter(function (x) { return x; });
			out.push({ midi: m, written: M.fromMidi(m), names: Object.keys(c.names), level: level, status: LEVELS[level], missed: missed,
				median: med.length ? Math.max.apply(null, med) : null, byDrill: drills.reduce(function (a, d, i) { a[d] = LEVELS[levels[i]]; return a; }, {}) });
		}
		return out;
	}
	// The notes to practise next: missed lately first, then the slowest, then those not yet tried in reach.
	function weakest(cells, n) {
		var scored = cells.map(function (c) {
			var s = c.missed ? 100 : c.level === 1 ? 60 + (c.median || 0) / 100 : c.level === 2 ? 30 + (c.median || 0) / 100 : c.level === 0 ? 10 : 0;
			return { c: c, s: s };
		}).filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; });
		return scored.slice(0, n || 6).map(function (x) { return x.c; });
	}

	/* ---------- Today ---------- */

	/* Up to three parts: the note drill that most needs it (on the notes that most need it), a rhythm at
	   the level reached, and a short piece at the sight-reading level reached. With no record yet: the open
	   strings named and found, and the first rhythm level. */
	function levelReached(st, drill, prefix, max) {
		var best = 0;
		for (var n = 1; n <= max; n++) { var r = st[drill + ':' + prefix + n]; if (r && r.recognised) { best = n; } }
		return Math.min(max, best + 1);
	}
	function today(log, now, o) {
		o = o || {};
		now = now || Date.now();
		var st = stats(log).items, parts = [];
		var any = (log || []).length > 0;
		if (!any) {
			parts.push({ drill: 'name', set: 'open', count: 6, why: 'a place to start' });
			parts.push({ drill: 'find', set: 'open', count: 6, why: 'the same notes on the neck' });
			parts.push({ drill: 'tap', level: 1, count: 3, why: 'the first rhythms' });
			return parts;
		}
		var cells = map(log, { strings: o.strings, drills: ['name', 'find', 'write', 'play'] });
		var weak = weakest(cells.filter(function (c) { return c.level > 0 || c.midi <= M.midi('G3'); }), 6);
		if (weak.length) {
			var nameLv = cells.filter(function (c) { return c.byDrill.name !== 'unseen'; }).length;
			var findLv = cells.filter(function (c) { return c.byDrill.find !== 'unseen'; }).length;
			var drill = findLv < nameLv ? 'find' : 'name';
			parts.push({ drill: drill, only: weak.map(function (c) { return c.names[0] || c.written; }), count: 8, why: weak[0].missed ? 'missed lately' : 'still taking a moment' });
		}
		var tapL = levelReached(st, 'tap', 'R', RHYTHM.length);
		parts.push({ drill: 'tap', level: tapL, count: 3, why: tapL > 1 ? 'the rhythm level you have reached' : 'the first rhythms' });
		var sightL = levelReached(st, 'sight', 'S', SIGHT.length);
		// once the first pieces are going well, every other day the piece is a bass part with the band
		var bandL = levelReached(st, 'band', 'B', BASS.length);
		if (sightL >= 3 && Math.floor(now / 864e5) % 2) { parts.push({ drill: 'band', level: bandL, count: 1, why: 'a bass part with the band, at your level' }); }
		else { parts.push({ drill: 'sight', level: sightL, count: 1, why: 'one piece at your level' }); }
		return parts.slice(0, 3);
	}


	/* ---------- bass lines with the band (1.12.0) ----------
	   Sight reading that sounds like a bass part: a style's rhythms on a chord progression's roots,
	   fifths, octaves, thirds and approach notes, with the chord symbols over each bar. The page plays
	   the band underneath (keys on the chords, drums in the style's feel), so reading feels like a gig.
	   Rhythm templates use slots: R root, 5 fifth, 8 octave, 3 third, 7 seventh, C a chord tone, A an
	   approach into the next bar's root; Rx a ghosted root. */

	var PROGRESSIONS = {
		major: [
			{ id: 'I-vi-IV-V', bars: ['I', 'vi', 'IV', 'V'] }, { id: 'I-V-vi-IV', bars: ['I', 'V', 'vi', 'IV'] },
			{ id: 'I-IV-V-IV', bars: ['I', 'IV', 'V', 'IV'] }, { id: 'ii-V-I', bars: ['ii', 'V', 'I', 'I'] },
			{ id: 'I-IV', bars: ['I', 'I', 'IV', 'IV'] }, { id: 'I-iii-IV-V', bars: ['I', 'iii', 'IV', 'V'] }
		],
		minor: [
			{ id: 'i-VI-III-VII', bars: ['i', 'VI', 'III', 'VII'] }, { id: 'i-VII-VI-VII', bars: ['i', 'VII', 'VI', 'VII'] },
			{ id: 'i-iv-v-i', bars: ['i', 'iv', 'v', 'i'] }, { id: 'i-iv-VII-III', bars: ['i', 'iv', 'VII', 'III'] }
		],
		blues: { id: 'blues', bars: ['I7', 'IV7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'] }
	};
	var STYLES = {
		roots: { word: 'Straight', name: 'Roots', feel: 'Rock 8ths', comp: 'held', bars: ['R/w', 'R/h R/h', 'R/q R R R'] },
		longroots: { word: 'Straight', name: 'Roots', feel: 'Rock 8ths', comp: 'held', bars: ['R/w', 'R/h R/h'] },
		rootfive: { word: 'Soul', name: 'Root and fifth', feel: 'Soul', comp: 'held', bars: ['R/h 5/h', 'R/q. R/8 5/h', 'R/q r/q 5/q r/q'] },
		arpeggio: { word: 'Pop', name: 'Arpeggios', feel: 'Pop 16ths', comp: 'held', bars: ['R/q 3 5 8', 'R/q 3 5 3', 'R/8 3 5 8 R/h'] },
		rock8: { word: 'Rock', name: 'Rock quavers', feel: 'Rock 8ths', comp: 'eighths', bars: ['R/8 R R R R R R R', 'R/8 R R R R R 8 R', 'R/8 R R R R R 5 A'] },
		soul: { word: 'Soul', name: 'Soul', feel: 'Soul', comp: 'two', bars: ['R/q. R/8 5/q A/q', 'R/8. R/16 5/8 R/8 3/q A/q', 'R/q. 8/8 5/q 3/8 A/8'] },
		walking: { word: 'Swing', name: 'Walking', feel: 'Swing', comp: 'two', bars: ['R/q C C A', 'R/q 3 5 A', 'R/q 5 3 A'] },
		reggae: { word: 'Reggae', name: 'Reggae', feel: 'Reggae', comp: 'skank', bars: ['r/q R/8 R/8 5/q r/q', 'r/8 R/8 r/8 R/8 5/q 3/q', 'R/q. R/8 r/h'] },
		funk: { word: 'Funk', name: 'Funk', feel: 'Funky 16ths', comp: 'stabs', bars: ['R/16 r/16 Rx/16 R/16 r/8 8/8 R/16 r/16 R/16 5/16 r/8 A/8', 'R/8. R/16 r/8 8/8 r/16 R/16 5/16 R/16 r/8 A/8', 'R/16 R R r/16 8/8 Rx/8 R/8. 5/16 r/8 A/8'] },
		bossa: { word: 'Bossa nova', name: 'Bossa', feel: 'Bossa', comp: 'two', bars: ['R/q. 5/8~ 5/h', 'R/q. 5/8~ 5/q 5/q'] },
		ballad68: { word: 'Ballad', name: 'Six eight ballad', time: '6/8', feel: null, comp: 'held', bars: ['R/q. 5/q.', 'R/q 5/8 8/q 5/8', 'R/h.'] }
	};
	var BASS = [
		{ n: 1, name: 'Roots on E and A', keys: [4], prog: [{ id: 'I-IV', bars: ['I', 'I', 'IV', 'IV'] }], mode: 'major', styles: ['longroots'], bpm: 70, hi: 'A2' },
		{ n: 2, name: 'Roots on the open strings', keys: [1], prog: [{ id: 'vi-ii-V-I', bars: ['vi', 'ii', 'V', 'I'] }, { id: 'I-vi-ii-V', bars: ['I', 'vi', 'ii', 'V'] }], mode: 'major', styles: ['roots'], bpm: 72, hi: 'G3' },
		{ n: 3, name: 'Root and fifth', keys: [1], prog: [{ id: 'vi-ii-V-I', bars: ['vi', 'ii', 'V', 'I'] }], mode: 'major', styles: ['roots', 'rootfive'], bpm: 72, hi: 'B3' },
		{ n: 4, name: 'C major: roots, fifths, arpeggios', keys: [0], mode: 'major', styles: ['rootfive', 'arpeggio'], bpm: 76 },
		{ n: 5, name: 'C major and A minor: rock quavers', keys: [0], mode: 'either', styles: ['rootfive', 'arpeggio', 'rock8'], bpm: 80 },
		{ n: 6, name: 'G major and E minor: soul', keys: [1], mode: 'either', styles: ['rock8', 'soul', 'arpeggio'], bpm: 80 },
		{ n: 7, name: 'One flat: walking and approach notes', keys: [-1, 0, 1], mode: 'either', styles: ['soul', 'walking'], bpm: 96 },
		{ n: 8, name: 'Two sharps and flats: funk', keys: [-2, -1, 1, 2], mode: 'either', styles: ['soul', 'funk', 'walking'], bpm: 88 },
		{ n: 9, name: 'Three sharps and flats: reggae and bossa', keys: [-3, -2, 2, 3], mode: 'either', styles: ['reggae', 'bossa', 'funk'], bpm: 84 },
		{ n: 10, name: 'Charts: sections and roadmaps', keys: [-3, -2, -1, 0, 1, 2, 3], mode: 'either', styles: ['rock8', 'soul', 'funk', 'reggae', 'walking'], bpm: 88, chart: true },
		{ n: 11, name: 'Six eight, and four sharps and flats', keys: [-4, -3, 3, 4], mode: 'either', styles: ['ballad68', 'bossa', 'walking'], bpm: 70, chart: true },
		{ n: 12, name: 'Everything, and the blues', keys: [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5], mode: 'either', styles: ['rock8', 'soul', 'funk', 'reggae', 'walking', 'bossa', 'arpeggio'], bpm: 92, chart: true, blues: true }
	];
	var ROMAN_I = { I: 0, II: 1, III: 2, IV: 3, V: 4, VI: 5, VII: 6 };

	// A chord of the key from its numeral: root (spelled in the key), quality, symbol.
	function chordOf(numeral, tonic, mode) {
		var m = /^(b?)([ivIV]+)(7?)$/.exec(numeral), deg = ROMAN_I[m[2].toUpperCase()];
		var sc = M.scale(tonic, mode === 'minor' ? 'minor' : 'major'); sc.pop();
		var root = M.parse(sc[deg]).L + M.accPretty(M.parse(sc[deg]).a).replace('♯', '#').replace('♭', 'b');
		var dia = M.diatonicChords(tonic, mode === 'minor' ? 'minor' : 'major', !!m[3])[deg];
		var qual = m[3] ? '7' : dia.qual;
		return { numeral: numeral, root: root, qual: qual, symbol: M.chordSymbol(root + '3', qual) };
	}
	// The root, as a written pitch, in the octave nearest the note before (and inside the range).
	function anchorFor(chord, near, lo, hi) {
		var best = null;
		for (var o = 1; o <= 4; o++) {
			var p = chord.root + o, mm = M.midi(p);
			if (mm < lo || mm > hi - 5) { continue; }
			var d = Math.abs(mm - near) + (mm > near ? 0.5 : 0);
			if (!best || d < best.d) { best = { p: p, d: d }; }
		}
		return best ? best.p : chord.root + '2';
	}
	function slotPitch(slot, anchor, chord, next, nextAnchor, key, hi, rnd, prev) {
		var third = /^(m|dim|h7|m7|dim7|m6)$/.test(chord.qual) ? 'm3' : 'M3';
		var fifth = /^(dim|h7|dim7)$/.test(chord.qual) ? 'd5' : chord.qual === 'aug' ? 'A5' : 'P5';
		var seventh = /^(7|m7|h7)$/.test(chord.qual) ? 'm7' : chord.qual === 'M7' ? 'M7' : null;
		var up = function (code) { var p = M.transpose(anchor, code); return M.midi(p) <= M.midi(hi) ? p : null; };
		if (slot === 'R') { return anchor; }
		if (slot === '8') { return up('P8') || anchor; }
		if (slot === '5') { return up(fifth) || M.transpose(anchor, fifth === 'P5' ? 'P4' : 'M3', true); }
		if (slot === '3') { return up(third) || anchor; }
		if (slot === '7') { return seventh ? (up(seventh) || anchor) : (up(fifth) || anchor); }
		if (slot === 'C') {
			// any chord tone above the root that is in range, but not the note just played
			var opts = [third, fifth, 'P8'].concat(seventh ? [seventh] : []).map(up).filter(function (p) { return p && (!prev || M.midi(p) !== M.midi(prev)); });
			return opts.length ? pickOne(opts, rnd) : anchor;
		}
		if (slot === 'A') {
			if (!next) { return up(fifth) || anchor; }
			var target = M.midi(nextAnchor), r = rnd();
			if (r < 0.45) { return M.fromMidi(target - 1, { prefer: '#', key: key }); }
			if (r < 0.7) { return M.fromMidi(target + 1, { prefer: 'b', key: key }); }
			// a scale step from below
			var acc = M.keyAccidentals(key), st = M.step(nextAnchor) - 1, L = M.fromStep(st, 0).charAt(0);
			return M.fromStep(st, acc[L] || 0);
		}
		return anchor;
	}

	function bassPiece(level, rnd, o) {
		o = o || {}; rnd = rnd || Math.random;
		var L = BASS[(level || 1) - 1];
		var styleId = o.style || pickOne(L.styles, rnd), st = STYLES[styleId];
		var time = st.time || '4/4';
		var key = pickOne(L.keys, rnd);
		var blues = L.blues && styleId !== 'ballad68' && rnd() < 0.3;
		var mode = blues ? 'major' : L.mode === 'either' ? (rnd() < 0.4 ? 'minor' : 'major') : L.mode;
		if (styleId === 'walking' && !blues) { mode = 'major'; }
		var prog = blues ? PROGRESSIONS.blues : pickOne(L.prog || PROGRESSIONS[mode], rnd);
		if (styleId === 'walking' && !blues) { prog = PROGRESSIONS.major[3]; }
		var tonic = (mode === 'minor' ? M.minorOf(key) : M.majorOf(key)) + '3';
		var nBars = blues ? 12 : (o.bars || (L.chart || o.chart ? 8 : 4));
		var numerals = []; for (var b = 0; b < nBars; b++) { numerals.push(prog.bars[b % prog.bars.length]); }
		// a piece ends at home: the blues turns its last bar back to one, a chart's second section ends on the
		// key chord, and a short piece that stops elsewhere gets one more bar of it
		var home = mode === 'minor' ? 'i' : 'I';
		if (blues) { numerals[nBars - 1] = 'I7'; }
		else if ((L.chart || o.chart) && nBars >= 8) {
			// a chart's second section: two bars of the four chord (the second a simile bar), the five in slashes, home
			numerals = numerals.slice(0, 4).concat(mode === 'minor' ? ['iv', 'iv', 'VII', 'i'] : ['IV', 'IV', 'V', 'I']);
		}
		else if (numerals[nBars - 1] !== home) { numerals.push(home); nBars++; }
		var chords = numerals.map(function (nm) { return chordOf(nm, tonic, mode); });
		var lo = M.midi('E2'), hi = L.hi || 'C4';
		var near = lo + 5, bars = [], lastTpl = null;
		var anchors = [];
		chords.forEach(function (c) { var a = anchorFor(c, near, lo, M.midi(hi)); anchors.push(a); near = M.midi(a) + 2; });
		chords.forEach(function (c, bi) {
			var tpl, tries = 0;
			do { tpl = pickOne(st.bars, rnd); tries++; } while (tpl === lastTpl && st.bars.length > 1 && rnd() < 0.5 && tries < 4);
			// the last bar ends on the root, held
			if (bi === nBars - 1) { tpl = time === '6/8' ? 'R/h.' : (st.bars.indexOf('R/w') >= 0 || rnd() < 0.5 ? 'R/w' : 'R/h r/h'); }
			lastTpl = tpl;
			var next = chords[bi + 1] || null, nextAnchor = anchors[bi + 1] || null, prevP = null;
			// a bar a simile sign will repeat leads nowhere in particular: a fifth where the approach note would be
			var chartRepeat = (L.chart || o.chart) && !blues && nBars >= 8 && bi === 4;
			var toks = tpl.split(' ').map(function (tk) {
				var m = /^(r|Rx|R|5|8|3|7|C|A)(\/[^~]*)?(~?)$/.exec(tk);
				if (!m) { return tk; }
				if (chartRepeat && m[1] === 'A') { m[1] = '5'; }
				var dur = m[2] || '', tie = m[3];
				if (m[1] === 'r') { return 'r' + dur; }
				var p = tie === '' && prevP && /~$/.test(prevP.tok) ? prevP.p : slotPitch(m[1] === 'Rx' ? 'R' : m[1], anchors[bi], c, next, nextAnchor, key, hi, rnd, prevP && prevP.p);
				// a fresh note never drops below the open E
				if (M.midi(p) < lo) { p = M.transpose(p, 'P8'); }
				var tok = p + dur + (m[1] === 'Rx' ? 'x' : '') + tie;
				prevP = { p: p, tok: tok };
				return tok;
			});
			bars.push({ chord: c, toks: toks });
		});
		var parts = bars.map(function (b) { return '"' + b.chord.symbol + '" ' + b.toks.join(' '); });
		var chart = !!(L.chart || o.chart);
		var out;
		if (chart && nBars >= 8 && !blues) {
			// a chart: two bars of the band first, two sections, a repeat on the first, slashes and a simile bar in the second
			var A = parts.slice(0, 4), B = bars.slice(4, 8);
			var Bt = B.map(function (b, k) {
				if (k === 1) { return '%'; }
				if (k === 2) { return '"' + b.chord.symbol + '" ' + b.toks.map(function (t) { return /^r/.test(t) ? t : t.replace(/^[A-G][#b]*\d/, 'S').replace(/x(~?)$/, '$1'); }).join(' '); }
				return '"' + b.chord.symbol + '" ' + b.toks.join(' ');
			});
			out = 'R2 | #A |: ' + A.join(' | ') + ' :| #B ' + Bt.join(' | ');
		} else {
			out = parts.join(' | ');
			if (blues) { out = '#A ' + out; }
		}
		var bpm = o.bpm || (styleId === 'walking' ? 112 : styleId === 'ballad68' ? 56 : L.bpm);
		return { level: L.n, notes: out, key: key, mode: mode, time: time, bpm: bpm, style: styleId, styleName: st.name, styleWord: st.word, feel: st.feel, comp: st.comp,
			chords: chords, chart: chart, progression: prog.id, name: L.name, keyName: M.keyName(key, mode), bass: true };
	}

	var RD = {
		seeded: seeded, shuffle: shuffle, pickOne: pickOne,
		DRILLS: DRILLS, STRANDS: STRANDS, NOTE_SETS: NOTE_SETS, noteSet: noteSet, pool: pool,
		CELLS: CELLS, RHYTHM: RHYTHM, rhythmBar: rhythmBar, rhythmLine: rhythmLine, targets: targets, scoreTaps: scoreTaps,
		SIGHT: SIGHT, sightPiece: sightPiece, playOrder: playOrder, CELLS: CELLS, cellFits: cellFits, cellsNotes: cellsNotes, sounds: sounds,
		BASS: BASS, STYLES: STYLES, PROGRESSIONS: PROGRESSIONS, bassPiece: bassPiece, chordOf: chordOf,
		INTERVALS: INTERVALS, CHORD_SETS: CHORD_SETS,
		question: question, mark: mark, heardMatches: heardMatches,
		entry: entry, stats: stats, map: map, weakest: weakest, today: today, LEVELS: LEVELS
	};
	if (typeof module !== 'undefined' && module.exports) { module.exports = RD; } else { root.RD = RD; }
})(typeof window !== 'undefined' ? window : this);
