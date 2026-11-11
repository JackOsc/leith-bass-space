/*
 * Leith Bass Space: Ear Training for Bass Players (the LBS Ear Trainer until 1.10.0), what it asks and how it marks.
 *
 * Most ear trainers play a bare interval or a bare chord and ask what it is.
 * This one never does: a home is always sounding. The band holds a tone
 * centre, and every question is asked against it, in the bass, where a
 * bassist hears. A run of questions stays on one tone centre, then moves a
 * fourth round the cycle.
 *
 * Six strands, seven drills (and the Jam room, which asks nothing, in ear.js):
 *   Intervals        deg     a note in the bass: which degree is it, against home?
 *                    int     two notes of the home scale, one after the other or together (a double stop),
 *                            up to a tenth: what is the interval?
 *   Chord flavours   chord   the bass holds home, the band plays a chord on it: what is on top?
 *   Scales           scale   the bass plays a scale up from home: which one?
 *   Inversions       inv     the band holds a chord: which of its notes is in the bass?
 *   Lines            line    the bass plays a short line over home: write it down as degrees (1.10.0)
 *   Progressions     roots   the band plays a Harmonic Elements loop: what are the roots? (1.10.0)
 *
 * A line and a progression are answered with a sequence, not one choice: EAR.markSeq. Today's set
 * (EAR.today) chooses a short mix of drills and items from the record, the way a spaced schedule does.
 *
 * No page or audio code in here: the same rules run in the browser and can be
 * checked on their own.
 *
 * EAR.KEYS, EAR.STRANDS, EAR.DRILLS       what there is
 * EAR.defaultMix() / EAR.cleanMix(mix)    what is in play: {deg: {items, below}, int: {items, dir}, chord: {items},
 *                                         scale: {items}, inv: {items, chords}}
 * EAR.homeFor(drillId, mix, random)       'major' | 'minor' | 'open': the home a run of that drill is asked against
 *                                         ('open' is a bare fifth: the question itself says major or minor)
 * EAR.qualityOf(q)                        'major' | 'minor': how a question's answer is spelt
 * EAR.pick(drillId, mix, run, log, last, random)   the next question (run: {keyPc, home})
 * EAR.mark(q, answerId)                   true if that names it
 * EAR.entry(q, ok, tries, shown, said, via)   a line for the record
 * EAR.stats(log)                          {items: {'deg:b3': {attempts, right, last, recognised}}, mixups}
 * EAR.sound(q, o)                         what the band and the bass play: {keys: [strikes], bass: [strikes]}, two bars
 * EAR.intro(run, o)                       the bar that says where home is
 * EAR.answerNotes(q)                      the notes that answer it, for the page to show: [{midi, deg, label, mark}]
 * EAR.wanted(q)                           the notes to play back, as pitch classes in order (for answering on the bass)
 * EAR.markSeq(q, said)                    a sequence answer: {ok, right: [true | false, ...]}
 * EAR.compareWith(q) / EAR.variant(q, id) the near neighbours of an answer, and the question with one of them instead
 * EAR.today(log, now)                     today's set: [{drill, items, n, why}]
 * EAR.tonic(keyPc, home)                  the name of a tone centre ('E♭', or 'C♯' for a minor home)
 */
(function (root) {
	'use strict';
	var EAR = root.EAR = root.EAR || {};

	// The practice order: each new tone centre a fourth above the last.
	var KEYS = [
		{ pc: 0, name: 'C' }, { pc: 5, name: 'F' }, { pc: 10, name: 'B♭' }, { pc: 3, name: 'E♭' }, { pc: 8, name: 'A♭' }, { pc: 1, name: 'D♭' },
		{ pc: 6, name: 'G♭' }, { pc: 11, name: 'B' }, { pc: 4, name: 'E' }, { pc: 9, name: 'A' }, { pc: 2, name: 'D' }, { pc: 7, name: 'G' }
	];
	// A minor home on three of them is better spelt with sharps (C♯ minor, not D♭ minor).
	var MINOR_NAMES = { 8: 'G♯', 1: 'C♯', 6: 'F♯' };
	function tonic(keyPc, home) {
		if (home === 'minor' && MINOR_NAMES[keyPc]) { return MINOR_NAMES[keyPc]; }
		for (var i = 0; i < KEYS.length; i++) { if (KEYS[i].pc === keyPc) { return KEYS[i].name; } }
		return 'C';
	}

	/* ---------- the things that are asked ---------- */

	// Degrees against home: [id, semitones above home, how it is written].
	var DEGREES = [
		['1', 0, '1'], ['b2', 1, '♭2'], ['2', 2, '2'], ['b3', 3, '♭3'], ['3', 4, '3'], ['4', 5, '4'],
		['#4', 6, '♯4'], ['5', 7, '5'], ['b6', 8, '♭6'], ['6', 9, '6'], ['b7', 10, '♭7'], ['7', 11, '7']
	];
	var DEG = {};
	DEGREES.forEach(function (d) { DEG[d[0]] = { id: d[0], semi: d[1], label: d[2] }; });
	DEG.b5 = { id: 'b5', semi: 6, label: '♭5' }; DEG['#5'] = { id: '#5', semi: 8, label: '♯5' };
	DEG['#2'] = { id: '#2', semi: 3, label: '♯2' }; DEG.bb7 = { id: 'bb7', semi: 9, label: '°7' };
	// (Harmonic Elements writes a few roots this way: ♯1 in I ♯I° ii, say)
	DEG['#1'] = { id: '#1', semi: 1, label: '♯1' };

	var INTERVALS = [
		['m2', 1, 'Minor second', 'a semitone'], ['M2', 2, 'Major second', 'a tone'], ['m3', 3, 'Minor third', ''], ['M3', 4, 'Major third', ''],
		['P4', 5, 'Perfect fourth', ''], ['TT', 6, 'Tritone', 'three tones'], ['P5', 7, 'Perfect fifth', ''], ['m6', 8, 'Minor sixth', ''],
		['M6', 9, 'Major sixth', ''], ['m7', 10, 'Minor seventh', ''], ['M7', 11, 'Major seventh', ''], ['P8', 12, 'Octave', ''],
		// a bassist's intervals: the third an octave up, the shape that spells a chord from the bottom
		['m10', 15, 'Minor tenth', 'a minor third, an octave up'], ['M10', 16, 'Major tenth', 'a major third, an octave up']
	];

	// Chord flavours: what sits on the root. "degs" spells each note from the root; "voice" is how the keys lay it out.
	var CHORDS = [
		{ id: 'maj', name: 'Major', suffix: '', degs: ['1', '3', '5'] },
		{ id: 'min', name: 'Minor', suffix: 'm', degs: ['1', 'b3', '5'] },
		{ id: 'dim', name: 'Diminished', suffix: '°', degs: ['1', 'b3', 'b5'] },
		{ id: 'aug', name: 'Augmented', suffix: '+', degs: ['1', '3', '#5'] },
		{ id: 'sus2', name: 'Sus 2', suffix: 'sus2', degs: ['1', '2', '5'] },
		{ id: 'sus4', name: 'Sus 4', suffix: 'sus4', degs: ['1', '4', '5'] },
		{ id: 'maj7', name: 'Major seventh', suffix: 'maj7', degs: ['1', '3', '5', '7'] },
		{ id: '7', name: 'Dominant seventh', suffix: '7', degs: ['1', '3', '5', 'b7'] },
		{ id: 'm7', name: 'Minor seventh', suffix: 'm7', degs: ['1', 'b3', '5', 'b7'] },
		{ id: 'm7b5', name: 'Half diminished', suffix: 'ø7', degs: ['1', 'b3', 'b5', 'b7'] },
		{ id: 'dim7', name: 'Diminished seventh', suffix: '°7', degs: ['1', 'b3', 'b5', 'bb7'] },
		{ id: 'mM7', name: 'Minor, major seventh', suffix: 'm(maj7)', degs: ['1', 'b3', '5', '7'] },
		{ id: '6', name: 'Sixth', suffix: '6', degs: ['1', '3', '5', '6'] },
		{ id: 'm6', name: 'Minor sixth', suffix: 'm6', degs: ['1', 'b3', '5', '6'] },
		// colours: the keys leave the fifth out and put the colour on top
		{ id: '9', name: 'Ninth', suffix: '9', degs: ['1', '3', '5', 'b7', '2'], voice: [0, 4, 10, 14] },
		{ id: 'maj9', name: 'Major ninth', suffix: 'maj9', degs: ['1', '3', '5', '7', '2'], voice: [0, 4, 11, 14] },
		{ id: 'm9', name: 'Minor ninth', suffix: 'm9', degs: ['1', 'b3', '5', 'b7', '2'], voice: [0, 3, 10, 14] },
		{ id: '7sus4', name: 'Seventh, sus 4', suffix: '7sus4', degs: ['1', '4', '5', 'b7'] },
		{ id: '7b9', name: 'Seventh, flat nine', suffix: '7♭9', degs: ['1', '3', '5', 'b7', 'b2'], voice: [0, 4, 10, 13] },
		{ id: '7#9', name: 'Seventh, sharp nine', suffix: '7♯9', degs: ['1', '3', '5', 'b7', '#2'], voice: [0, 4, 10, 15] },
		{ id: '13', name: 'Thirteenth', suffix: '13', degs: ['1', '3', '5', 'b7', '6'], voice: [0, 4, 10, 21] }
	];

	// Scales, up from home. "tell" is the note or two that gives each away.
	var SCALES = [
		{ id: 'major', name: 'Major', also: 'Ionian', degs: ['1', '2', '3', '4', '5', '6', '7'], tell: ['3', '7'] },
		{ id: 'minor', name: 'Natural minor', also: 'Aeolian', degs: ['1', '2', 'b3', '4', '5', 'b6', 'b7'], tell: ['b3', 'b6'] },
		{ id: 'majpent', name: 'Major pentatonic', also: '', degs: ['1', '2', '3', '5', '6'], tell: ['3', '6'] },
		{ id: 'minpent', name: 'Minor pentatonic', also: '', degs: ['1', 'b3', '4', '5', 'b7'], tell: ['b3', 'b7'] },
		{ id: 'dorian', name: 'Dorian', also: 'minor with a raised 6', degs: ['1', '2', 'b3', '4', '5', '6', 'b7'], tell: ['6'] },
		{ id: 'mixolydian', name: 'Mixolydian', also: 'major with a flat 7', degs: ['1', '2', '3', '4', '5', '6', 'b7'], tell: ['b7'] },
		{ id: 'lydian', name: 'Lydian', also: 'major with a sharp 4', degs: ['1', '2', '3', '#4', '5', '6', '7'], tell: ['#4'] },
		{ id: 'phrygian', name: 'Phrygian', also: 'minor with a flat 2', degs: ['1', 'b2', 'b3', '4', '5', 'b6', 'b7'], tell: ['b2'] },
		{ id: 'locrian', name: 'Locrian', also: 'flat 2 and flat 5', degs: ['1', 'b2', 'b3', '4', 'b5', 'b6', 'b7'], tell: ['b2', 'b5'] },
		{ id: 'harmonic', name: 'Harmonic minor', also: 'minor with a raised 7', degs: ['1', '2', 'b3', '4', '5', 'b6', '7'], tell: ['7'] },
		{ id: 'melodic', name: 'Melodic minor', also: 'minor with a raised 6 and 7', degs: ['1', '2', 'b3', '4', '5', '6', '7'], tell: ['6', '7'] },
		{ id: 'blues', name: 'Blues', also: 'minor pentatonic with a flat 5', degs: ['1', 'b3', '4', 'b5', '5', 'b7'], tell: ['b5'] }
	];

	// Which note of the chord is in the bass.
	var MEMBERS = [
		{ id: 'root', name: 'The root', short: 'Root', n: 0, pos: 'Root position' },
		{ id: 'third', name: 'The third', short: '3rd', n: 1, pos: 'First inversion' },
		{ id: 'fifth', name: 'The fifth', short: '5th', n: 2, pos: 'Second inversion' },
		{ id: 'seventh', name: 'The seventh', short: '7th', n: 3, pos: 'Third inversion' }
	];
	var INV_CHORDS = ['maj', 'min', '7', 'maj7', 'm7'];

	function byId(list) { var o = {}; list.forEach(function (x) { o[x.id] = x; }); return o; }
	var CHORD = byId(CHORDS), SCALE = byId(SCALES), MEMBER = byId(MEMBERS), INTERVAL = {};
	INTERVALS.forEach(function (x) { INTERVAL[x[0]] = { id: x[0], semi: x[1], name: x[2], also: x[3] }; });

	/*
	 * THE DRILLS. Each has its items (what can be asked, and so what is answered with) and a few
	 * ready-made sets of them, easiest first. The first set is where a newcomer starts.
	 */
	var DRILLS = {
		deg: {
			id: 'deg', strand: 'intervals', name: 'Degrees', against: 'Against home',
			ask: 'Which degree is it?', note: 'The bass plays home, then another note. Name it by its place against home.',
			items: DEGREES.map(function (d) { return { id: d[0], name: d[2] }; }),
			sets: [
				{ id: 'tri', name: '1, 3 and 5', items: ['1', '3', '5'] },
				{ id: 'major', name: 'The major scale', items: ['1', '2', '3', '4', '5', '6', '7'] },
				{ id: 'minor', name: 'The minor scale', items: ['1', '2', 'b3', '4', '5', 'b6', 'b7'] },
				{ id: 'all', name: 'All twelve', items: DEGREES.map(function (d) { return d[0]; }) }
			]
		},
		int: {
			id: 'int', strand: 'intervals', name: 'Intervals', against: 'In the home scale',
			ask: 'What is the interval?', note: 'The bass plays two notes of the home scale, one after the other or together. Name the distance, then see where in the scale it lives.',
			items: INTERVALS.map(function (x) { return { id: x[0], name: x[2] }; }),
			sets: [
				{ id: 'open', name: 'Fourths, fifths and the octave', items: ['P4', 'P5', 'P8'] },
				{ id: 'thirds', name: 'Add the thirds', items: ['m3', 'M3', 'P4', 'P5', 'P8'] },
				{ id: 'sixths', name: 'Add the sixths', items: ['m3', 'M3', 'P4', 'P5', 'm6', 'M6', 'P8'] },
				{ id: 'bass', name: 'Bass leaps: fifths, octaves, tenths', items: ['P4', 'P5', 'P8', 'm10', 'M10'] },
				{ id: 'within', name: 'Everything inside the octave', items: INTERVALS.filter(function (x) { return x[1] <= 12; }).map(function (x) { return x[0]; }) },
				{ id: 'all', name: 'All of them', items: INTERVALS.map(function (x) { return x[0]; }) }
			]
		},
		chord: {
			id: 'chord', strand: 'chords', name: 'Chord flavours', against: 'On home',
			ask: 'What is the chord?', note: 'The bass holds home. Name what the band plays on top of it.',
			items: CHORDS.map(function (c) { return { id: c.id, name: c.name, symbol: c.suffix }; }),
			sets: [
				{ id: 'two', name: 'Major or minor', items: ['maj', 'min'] },
				{ id: 'triads', name: 'Triads', items: ['maj', 'min', 'dim', 'aug', 'sus2', 'sus4'] },
				{ id: 'sevenths', name: 'Sevenths', items: ['maj7', '7', 'm7', 'm7b5', 'dim7', 'mM7', '6', 'm6'] },
				{ id: 'colours', name: 'Colours', items: ['9', 'maj9', 'm9', '7sus4', '7b9', '7#9', '13'] }
			]
		},
		scale: {
			id: 'scale', strand: 'scales', name: 'Scales', against: 'From home',
			ask: 'Which scale is it?', note: 'The bass plays a scale up from home over a bare fifth. Name it, then see the note that gives it away.',
			items: SCALES.map(function (s) { return { id: s.id, name: s.name, also: s.also }; }),
			sets: [
				{ id: 'two', name: 'Major or minor', items: ['major', 'minor'] },
				{ id: 'pent', name: 'With the pentatonics', items: ['major', 'minor', 'majpent', 'minpent'] },
				{ id: 'modes', name: 'The modes', items: ['major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'minor', 'locrian'] },
				{ id: 'minors', name: 'Kinds of minor', items: ['minor', 'dorian', 'phrygian', 'harmonic', 'melodic'] },
				{ id: 'all', name: 'All of them', items: SCALES.map(function (s) { return s.id; }) }
			]
		},
		inv: {
			id: 'inv', strand: 'inversions', name: 'Inversions', against: 'Against the chord',
			ask: 'Which note is in the bass?', note: 'The band holds a chord built on home. The bass takes one of its notes. Name which.',
			items: MEMBERS.map(function (m) { return { id: m.id, name: m.name, also: m.pos }; }),
			sets: [
				{ id: 'major', name: 'A major triad', items: ['root', 'third', 'fifth'], chords: ['maj'] },
				{ id: 'both', name: 'Major and minor', items: ['root', 'third', 'fifth'], chords: ['maj', 'min'] },
				{ id: 'sevenths', name: 'Seventh chords', items: ['root', 'third', 'fifth', 'seventh'], chords: ['7', 'maj7', 'm7'] }
			]
		}
	};
	/*
	 * LINES (1.10.0): melodic transcription for a bassist. The bass plays a short line over the band, in
	 * quarter notes, and it is written down as degrees, note by note (or found on the neck, or played back).
	 * The items are lengths, so the record says how long a line can be before it slips. What the line is made
	 * of (1 3 5, the pentatonic, the scale, the scale with passing notes) is a setting of its own.
	 */
	var NOTE_SETS = {
		triad: { name: '1, 3 and 5', major: ['1', '3', '5'], minor: ['1', 'b3', '5'] },
		pent: { name: 'The pentatonic', major: ['1', '2', '3', '5', '6'], minor: ['1', 'b3', '4', '5', 'b7'] },
		scale: { name: 'The whole scale', major: ['1', '2', '3', '4', '5', '6', '7'], minor: ['1', '2', 'b3', '4', '5', 'b6', 'b7'] },
		passing: { name: 'With passing notes', major: ['1', '2', 'b3', '3', '4', '#4', '5', '6', 'b7', '7'], minor: ['1', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'] }
	};
	var NOTE_SET_ORDER = ['triad', 'pent', 'scale', 'passing'];
	DRILLS.line = {
		id: 'line', strand: 'lines', name: 'Lines', against: 'Against home', seq: true,
		ask: 'What did the bass play?', note: 'The bass plays a short line over the band. Write it down as degrees, note by note, or play it back on your bass.',
		items: [{ id: '2', name: 'Two notes' }, { id: '3', name: 'Three notes' }, { id: '4', name: 'Four notes' }, { id: '5', name: 'Five notes' }, { id: '6', name: 'Six notes' }, { id: '8', name: 'Eight notes' }],
		sets: [
			{ id: 'cells', name: 'Two and three notes', items: ['2', '3'] },
			{ id: 'bar', name: 'A bar of four', items: ['3', '4'] },
			{ id: 'two', name: 'Two bars', items: ['4', '5', '6'] },
			{ id: 'long', name: 'Up to eight', items: ['5', '6', '8'] }
		]
	};

	/*
	 * PROGRESSIONS (1.10.0): the roots of a loop from Harmonic Elements. The band plays the element's chords
	 * round and round. Either the bass plays the roots and they are named, or the bass sits out and the
	 * player supplies them: the course's note menu, levels 0 and 1, the first thing a bassist does on any
	 * tune. The items are the elements themselves (anything with home in it and at least two roots), so the
	 * record says which progressions are owned. Built from the catalogue only if it is on the page.
	 */
	var HE = root.HE && root.HE.ELEMENTS ? root.HE : null;
	var ROOT_SETS = [
		{ id: 'lp', name: 'Lean and pull', stages: [2, 3] },
		{ id: 'first', name: 'First molecules', stages: [4] },
		{ id: 'shadow', name: 'Shadows', stages: [5, 6] },
		{ id: 'colour', name: 'Colours', stages: [7, 8] },
		{ id: 'applied', name: 'Applied', stages: [9] },
		{ id: 'more', name: 'More molecules', stages: [11, 12, 13] }
	];
	// The roots of an element as the bass hears them: a chord on the same root as the one before is that root, held on.
	function rootsOf(el) {
		var out = [], beat = 0;
		HE.chords(el, 'triads').forEach(function (c) {
			var len = c.bars * 4, last = out[out.length - 1];
			if (last && last.deg === c.deg) { last.len += len; } else { out.push({ deg: c.deg, beat: beat, len: len }); }
			beat += len;
		});
		return out;
	}
	if (HE) {
		var rootEls = HE.ELEMENTS.filter(function (el) {
			var total = HE.bars(el, 'triads'), list = rootsOf(el);
			return el.kind !== 'home' && !el.homeAbsent && total === Math.round(total) && total >= 2 && total <= 8 && list.length >= 2 &&
				// (an element whose last root is its first, held over the join, would be heard as one fewer root)
				list[0].deg !== list[list.length - 1].deg;
		});
		DRILLS.roots = {
			id: 'roots', strand: 'progressions', name: 'Roots', against: 'From home', seq: true,
			ask: 'What are the roots?', note: 'The band plays a progression from Harmonic Elements, round and round. Name the roots as degrees from home, in order, or play them on your bass.',
			items: rootEls.map(function (el) { return { id: el.id, name: el.roman + ' · ' + el.name.replace(/^The /, 'the '), stage: el.stage }; }),
			sets: ROOT_SETS.map(function (set) {
				return { id: set.id, name: set.name, items: rootEls.filter(function (el) { return set.stages.indexOf(el.stage) !== -1; }).map(function (el) { return el.id; }) };
			}).filter(function (set) { return set.items.length >= 2; })
		};
	}
	var STRANDS = [
		{ id: 'intervals', name: 'Intervals', drills: ['deg', 'int'] },
		{ id: 'chords', name: 'Chord flavours', drills: ['chord'] },
		{ id: 'scales', name: 'Scales', drills: ['scale'] },
		{ id: 'inversions', name: 'Inversions', drills: ['inv'] },
		{ id: 'lines', name: 'Lines', drills: ['line'] }
	];
	if (DRILLS.roots) { STRANDS.push({ id: 'progressions', name: 'Progressions', drills: ['roots'] }); }
	Object.keys(DRILLS).forEach(function (id) {
		var d = DRILLS[id];
		d.item = byId(d.items);
	});

	/* ---------- what is in play ---------- */

	function defaultMix() {
		var out = {
			deg: { items: DRILLS.deg.sets[0].items.slice(), below: false },
			int: { items: DRILLS.int.sets[0].items.slice(), dir: 'up', how: 'apart' },
			chord: { items: DRILLS.chord.sets[0].items.slice() },
			scale: { items: DRILLS.scale.sets[0].items.slice() },
			inv: { items: DRILLS.inv.sets[0].items.slice(), chords: ['maj'] },
			line: { items: DRILLS.line.sets[0].items.slice(), notes: 'triad', start: 'home' }
		};
		if (DRILLS.roots) { out.roots = { items: DRILLS.roots.sets[0].items.slice(), bass: 'heard' }; }
		return out;
	}
	function cleanMix(mix) {
		var d = defaultMix();
		if (!mix || typeof mix !== 'object') { return d; }
		Object.keys(d).forEach(function (id) {
			var m = mix[id], have = DRILLS[id].item;
			if (!m || !Array.isArray(m.items)) { return; }
			// in the drill's own order, so the buttons always read the same way
			var items = DRILLS[id].items.map(function (x) { return x.id; }).filter(function (x) { return m.items.indexOf(x) !== -1 && have[x]; });
			if (items.length >= 2) { d[id].items = items; }   // (with one thing in play there would be nothing to choose)
		});
		if (mix.deg) { d.deg.below = !!mix.deg.below; }
		if (mix.int && ['up', 'down', 'both'].indexOf(mix.int.dir) !== -1) { d.int.dir = mix.int.dir; }
		if (mix.int && ['apart', 'together', 'both'].indexOf(mix.int.how) !== -1) { d.int.how = mix.int.how; }
		if (mix.line && NOTE_SETS[mix.line.notes]) { d.line.notes = mix.line.notes; }
		if (mix.line && (mix.line.start === 'home' || mix.line.start === 'any')) { d.line.start = mix.line.start; }
		if (d.roots && mix.roots && (mix.roots.bass === 'heard' || mix.roots.bass === 'you')) { d.roots.bass = mix.roots.bass; }
		if (mix.inv && Array.isArray(mix.inv.chords)) {
			var chords = INV_CHORDS.filter(function (c) { return mix.inv.chords.indexOf(c) !== -1; });
			if (chords.length) { d.inv.chords = chords; }
		}
		// a seventh in the bass needs a chord that has one
		if (d.inv.items.indexOf('seventh') !== -1 && !d.inv.chords.some(function (c) { return CHORD[c].degs.length > 3; })) {
			d.inv.items = d.inv.items.filter(function (x) { return x !== 'seventh'; });
		}
		if (d.inv.items.length < 2) { d.inv.items = ['root', 'third', 'fifth']; }
		return d;
	}

	// The home a run is asked against. Degrees and intervals take it from what is in play (a ♭3 with no 3
	// wants a minor home); the other drills bring their own chord, so home is simply its root.
	function homeFor(drillId, mix, random) {
		random = random || Math.random;
		if (drillId !== 'deg' && drillId !== 'int' && drillId !== 'line') { return 'open'; }
		if (drillId === 'int' || drillId === 'line') { return random() < 0.5 ? 'major' : 'minor'; }
		var items = mix.deg.items, has = function (x) { return items.indexOf(x) !== -1; };
		if (has('b3') && !has('3')) { return 'minor'; }
		if (has('3') && !has('b3')) { return 'major'; }
		return random() < 0.5 ? 'major' : 'minor';
	}

	/* ---------- choosing a question ---------- */

	function any(list, random) { return list[Math.floor(random() * list.length)]; }
	function weighted(items, weight, random) {
		var total = 0, w = items.map(function (it) { var x = weight(it); total += x; return x; });
		var r = random() * total;
		for (var i = 0; i < items.length; i++) { r -= w[i]; if (r < 0) { return items[i]; } }
		return items[items.length - 1];
	}

	// Where home sits on the bass: the lowest one from E1 up, so every tone centre is in the first octave of the neck.
	function homeMidi(keyPc) { return 28 + ((keyPc - 28) % 12 + 12) % 12; }
	// The notes of the home scale that an interval can start and end on, as semitones above home.
	var HOME_SCALE = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dominant: [0, 2, 4, 5, 7, 9, 10] };
	var SCALE_DEGS = { major: ['1', '2', '3', '4', '5', '6', '7'], minor: ['1', '2', 'b3', '4', '5', 'b6', 'b7'], dominant: ['1', '2', '3', '4', '5', '6', 'b7'] };
	function degOfSemi(home, semi) {
		var i = HOME_SCALE[home].indexOf(((semi % 12) + 12) % 12);
		return i === -1 ? null : SCALE_DEGS[home][i];
	}

	/*
	 * pick(drillId, mix, run, log, last, random)
	 *   run    {keyPc, home}: the tone centre this run of questions is on
	 *   last   the question before, so the same thing isn't asked twice running if there is a choice
	 * A question: {drill, item (the answer's id), keyPc, home, choices: [ids], ...what it needs to be played and shown}
	 */
	function pick(drillId, mix, run, log, last, random) {
		random = random || Math.random;
		var drill = DRILLS[drillId], m = mix[drillId], record = stats(log || []).items;
		var items = m.items.slice();
		// Things missed lately, or never yet heard, come round sooner; the one just asked comes round later.
		var id = weighted(items, function (x) {
			var r = record[drillId + ':' + x];
			var w = r ? 1 + r.last.filter(function (ok) { return !ok; }).length : 2;
			return last && last.drill === drillId && last.item === x && items.length > 1 ? w * 0.2 : w;
		}, random);
		var home = homeMidi(run.keyPc);
		var q = { drill: drillId, item: id, keyPc: run.keyPc, home: run.home, choices: items, homeMidi: home };

		if (drillId === 'deg') {
			var semi = DEG[id].semi;
			// "1" is asked as home again, an octave up
			var up = home + (id === '1' ? 12 : semi), below = m.below && id !== '1' && random() < 0.5;
			if (below) {
				// the note under home: if that is off the bottom of the neck, the whole question goes up an octave
				if (home - 12 + semi < 28) { q.homeMidi = home + 12; }
				q.target = q.homeMidi - 12 + semi;
			} else { q.target = up; }
			q.below = below;
		} else if (drillId === 'int') {
			var size = INTERVAL[id].semi;
			// together (a double stop) is always the lower note and the one above it
			var together = m.how === 'together' || (m.how === 'both' && random() < 0.5);
			var dir = together ? 'up' : m.dir === 'both' ? (random() < 0.5 ? 'up' : 'down') : m.dir;
			// every place in the home scale where this interval lives
			var scale = HOME_SCALE[run.home], places = [];
			scale.forEach(function (a) {
				var b = dir === 'up' ? a + size : a - size;
				if (scale.indexOf(((b % 12) + 12) % 12) !== -1) { places.push([a, b]); }
			});
			// (the tritone lives in one place in a major scale, and in a minor one: there is always somewhere)
			var place = any(places.length ? places : [[0, dir === 'up' ? size : -size]], random);
			var from = home + place[0], to = home + place[1];
			// keep both notes on the neck and out of the mud: between E1 and G3
			while (Math.min(from, to) < 28) { from += 12; to += 12; }
			while (Math.max(from, to) > 55 && Math.min(from, to) - 12 >= 28) { from -= 12; to -= 12; }
			q.from = from; q.to = to; q.dir = dir; q.together = together;
			q.fromDeg = degOfSemi(run.home, place[0]); q.toDeg = degOfSemi(run.home, place[1]);
		} else if (drillId === 'chord') {
			q.chord = id;
		} else if (drillId === 'scale') {
			q.scale = id;
		} else if (drillId === 'line') {
			lineInto(q, m, run, random);
		} else if (drillId === 'roots') {
			rootsInto(q, m, random);
		} else if (drillId === 'inv') {
			var kinds = m.chords.filter(function (c) { return id !== 'seventh' || CHORD[c].degs.length > 3; });
			if (!kinds.length) { kinds = ['7']; }
			var fresh = kinds.filter(function (c) { return !(last && last.drill === 'inv' && last.chord === c) || kinds.length === 1; });
			q.chord = any(fresh.length ? fresh : kinds, random);
			var deg = CHORD[q.chord].degs[MEMBER[id].n];
			// the bass note: the chord's note nearest above home's low octave, kept under the keys
			q.target = home + DEG[deg].semi;
			if (q.target > 43) { q.target -= 12; }
			if (q.target < 28) { q.target += 12; }
			q.bassDeg = deg;
			// with three notes in the chord there are three answers, with four there are four
			q.choices = items.filter(function (x) { return x !== 'seventh' || CHORD[q.chord].degs.length > 3; });
		}
		return q;
	}

	/*
	 * A line: n notes in quarter notes, from the note set, as a bass player would play them. It starts on home
	 * (or, if asked, on any chord tone), moves mostly by step and small leap, never strikes the same note twice
	 * running, stays within a fourth below home and a twelfth above it, and leans towards a chord tone at the end.
	 */
	function lineInto(q, m, run, random) {
		var n = +q.item, quality = run.home === 'minor' ? 'minor' : 'major';
		// (in the bottom few notes of the neck a line is hard to hear on a small speaker: those homes take it up an octave)
		var degs = NOTE_SETS[m.notes || 'triad'][quality], H = q.homeMidi < 33 ? q.homeMidi + 12 : q.homeMidi;
		var lo = Math.max(28, H - 5), hi = Math.min(55, H + 19), pool = [];
		[-12, 0, 12, 24].forEach(function (oct) {
			degs.forEach(function (d) { var midi = H + oct + DEG[d].semi; if (midi >= lo && midi <= hi) { pool.push({ midi: midi, deg: d }); } });
		});
		pool.sort(function (a, b) { return a.midi - b.midi; });
		var chordTones = quality === 'minor' ? ['1', 'b3', '5'] : ['1', '3', '5'];
		var first = pool.filter(function (p) { return m.start === 'any' ? chordTones.indexOf(p.deg) !== -1 && Math.abs(p.midi - H) <= 9 : p.midi === H; });
		var line = [any(first.length ? first : [{ midi: H, deg: '1' }], random)], leaps = 0;
		while (line.length < n) {
			var prev = line[line.length - 1], end = line.length === n - 1;
			var next = weighted(pool.filter(function (p) {
				var d = Math.abs(p.midi - prev.midi);
				// (two leaps of more than a third in a row only if the second one turns back)
				return d > 0 && d <= 9 && !(leaps >= 1 && d > 4 && line.length > 1 && (p.midi - prev.midi) * (prev.midi - line[line.length - 2].midi) > 0);
			}), function (p) {
				var d = Math.abs(p.midi - prev.midi);
				var w = d <= 2 ? 5 : d <= 4 ? 4 : d <= 7 ? 2 : 1;
				if (end && chordTones.indexOf(p.deg) !== -1) { w *= 3; }
				// (going straight back to the note before last, again and again, is a trill, not a line)
				if (line.length > 1 && p.midi === line[line.length - 2].midi) { w /= 3; }
				return w / (1 + Math.abs(p.midi - H) / 12);
			}, random);
			if (!next) { break; }
			leaps = Math.abs(next.midi - prev.midi) > 4 ? leaps + 1 : 0;
			line.push(next);
		}
		q.notes = line.map(function (p) { return p.midi; });
		q.degs = line.map(function (p) { return p.deg; });
		q.choices = degs.slice();
		q.bars = n <= 4 ? 2 : 4;
		q.askBars = q.bars / 2;
	}

	/*
	 * A progression: an element from Harmonic Elements on the run's tone centre, round and round. The roots are
	 * what is asked; "bass" says whether the bass plays them ('heard') or leaves them to the player ('you').
	 */
	function rootsInto(q, m, random) {
		var el = HE.byId(q.item);
		q.el = el.id;
		q.home = el.mode;
		q.chords = HE.chords(el, 'triads').map(function (c) { return { deg: c.deg, qual: c.qual, bars: c.bars }; });
		q.roots = rootsOf(el);
		q.degs = q.roots.map(function (r) { return r.deg; });
		q.bars = HE.bars(el, 'triads');
		q.askBars = q.bars;   // a progression has no bars kept back for the answer: it is played along with
		q.bassMode = m.bass === 'you' ? 'you' : 'heard';
		// the bass's root: the lowest one from E1 up
		q.notes = q.roots.map(function (r) { var midi = q.homeMidi + DEG[r.deg].semi; while (midi > 40) { midi -= 12; } while (midi < 28) { midi += 12; } return midi; });
		// the degrees to answer with: every root of every element in play, in order up the octave
		var seen = {};
		m.items.forEach(function (id) { var x = HE.byId(id); if (x) { rootsOf(x).forEach(function (r) { seen[degKey(r.deg)] = true; }); } });
		q.choices = DEGREES.map(function (d) { return d[0]; }).filter(function (d) { return seen[d]; });
	}
	// A degree as the pad writes it: one name for each of the twelve (♯1 is ♭2, ♯5 is ♭6, ♭5 is ♯4).
	function degKey(deg) { var semi = DEG[deg] ? DEG[deg].semi : 0; for (var i = 0; i < DEGREES.length; i++) { if (DEGREES[i][1] === semi) { return DEGREES[i][0]; } } return deg; }

	function mark(q, answerId) { return answerId === q.item; }

	/*
	 * A sequence answer (a line, the roots of a progression): the degrees said, note for note. A note counts if
	 * it is the same pitch class as the one asked. The roots of a progression may be given from any point in the
	 * loop, since a loop has no first chord once it is going round.
	 */
	function markSeq(q, said) {
		var want = q.degs.map(function (d) { return DEG[d].semi; });
		var got = (said || []).map(function (d) { return DEG[d] ? DEG[d].semi : -1; });
		function compare(shift) {
			return want.map(function (w, i) { return got[i] === want[(i + shift) % want.length]; });
		}
		var best = compare(0);
		if (q.drill === 'roots') {
			for (var s = 1; s < want.length; s++) { var r = compare(s); if (r.filter(Boolean).length > best.filter(Boolean).length) { best = r; } }
		}
		return { ok: got.length === want.length && best.every(Boolean), right: best };
	}

	function day(t) {
		var d = new Date(t);
		return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
	}
	// One line of the record. "ok" is the first answer only, as in Harmonic Elements: getting there on the
	// second go, or being shown, is practice, not recognition yet.
	function entry(q, ok, tries, shown, said, via, now) {
		return { t: now || Date.now(), d: q.drill, q: q.item, k: q.keyPc, ok: !!ok, n: tries || 0, s: !!shown, x: said || '', v: via || 'tap' };
	}
	// The course's checkpoint: four right from the last five, on two different days.
	function stats(log) {
		var items = {}, pairs = {};
		(log || []).forEach(function (e) {
			if (!DRILLS[e.d] || !DRILLS[e.d].item[e.q]) { return; }
			var key = e.d + ':' + e.q;
			var r = items[key] || (items[key] = { key: key, drill: e.d, item: e.q, attempts: 0, right: 0, last: [], days: [] });
			r.attempts++;
			if (e.ok) { r.right++; }
			r.last.push(!!e.ok);
			r.days.push(day(e.t));
			r.lastT = Math.max(r.lastT || 0, e.t);
			if (!e.ok && e.x && e.x !== e.q && DRILLS[e.d].item[e.x]) {
				var k = e.d + ':' + e.q + '>' + e.x;
				pairs[k] = (pairs[k] || 0) + 1;
			}
		});
		Object.keys(items).forEach(function (key) {
			var r = items[key], days = r.days.slice(-5), last = r.last.slice(-5), okDays = {};
			last.forEach(function (ok, i) { if (ok) { okDays[days[i]] = true; } });
			r.last = last;
			r.recognised = last.length === 5 && last.filter(Boolean).length >= 4 && Object.keys(okDays).length >= 2;
			delete r.days;
		});
		var mixups = Object.keys(pairs).map(function (k) {
			var p = k.split('>'), a = p[0].split(':');
			return { drill: a[0], was: a[1], said: p[1], times: pairs[k] };
		}).sort(function (a, b) { return b.times - a.times; });
		return { items: items, mixups: mixups };
	}

	/* ---------- what is played ---------- */

	// Where the keys put a chord: its root between A2 and A♭3, the rest stacked above (or as the chord's own "voice" says).
	function keysRoot(keyPc) { return 45 + ((keyPc - 45) % 12 + 12) % 12; }
	function voicing(chordId, keyPc) {
		var c = CHORD[chordId], r = keysRoot(keyPc);
		var above = c.voice || c.degs.map(function (d) { return DEG[d].semi; });
		return above.map(function (s) { return r + s; });
	}
	var HOME_CHORD = { major: 'maj', minor: 'min' };
	// How home is sounded when the question brings its own third: root, fifth and octave.
	function shellOf(keyPc) { var r = keysRoot(keyPc); return [r, r + 7, r + 12]; }
	function homeNotes(keyPc, home) { return HOME_CHORD[home] ? voicing(HOME_CHORD[home], keyPc) : shellOf(keyPc); }
	// Whether a question's answer is a major or a minor thing, which decides how its notes are spelt (C♯ minor, D♭ major).
	function qualityOf(q) {
		if (q.drill === 'deg' || q.drill === 'int' || q.drill === 'line' || q.drill === 'roots') { return q.home === 'minor' ? 'minor' : 'major'; }
		var degs = q.drill === 'scale' ? SCALE[q.scale].degs : CHORD[q.chord].degs;
		return degs.indexOf('b3') !== -1 ? 'minor' : 'major';
	}

	/*
	 * A question as two bars of 4/4: what the keys strike and what the bass plays, as strikes for the
	 * house band (HE.band.score). The first bar asks; the second is left to the listener, with the
	 * band still holding home, so there is room to sing the answer or find it on the bass.
	 *   o.fill   true to have the bass play the answer again in the second bar (once the answer is out)
	 */
	function sound(q, o) {
		o = o || {};
		var keys = [], bass = [], hold = 3.6, k;
		function chord(notes, beat, len, vel) { keys.push({ beat: beat, len: len, notes: notes, vel: vel || 0.72, spread: 0.012 }); }
		function note(midi, beat, len, vel) { bass.push({ beat: beat, len: len, notes: [midi], vel: vel || 0.85 }); }
		var homeChord = homeNotes(q.keyPc, q.home);
		if (q.drill === 'deg') {
			chord(homeChord, 0, hold); chord(homeChord, 4, hold, 0.6);
			note(q.homeMidi, 0, 1.8); note(q.target, 2, 1.8);
			if (o.fill) { note(q.homeMidi, 4, 1.8); note(q.target, 6, 1.8); }
		} else if (q.drill === 'int' && q.together) {
			// a double stop: both notes struck at once, and left to ring
			chord(homeChord, 0, hold); chord(homeChord, 4, hold, 0.6);
			note(q.from, 0, 3.4); note(q.to, 0, 3.4, 0.8);
			if (o.fill) { note(q.from, 4, 1.6); note(q.to, 6, 1.6); }
		} else if (q.drill === 'int') {
			chord(homeChord, 0, hold); chord(homeChord, 4, hold, 0.6);
			note(q.from, 0, 1.8); note(q.to, 2, 1.8);
			if (o.fill) { note(q.from, 4, 1.8); note(q.to, 6, 1.8); }
		} else if (q.drill === 'line') {
			// the home chord in every bar; the line in the first half, and again in the second once the answer is out
			for (k = 0; k < q.bars; k++) { chord(homeChord, k * 4, hold, k === 0 ? 0.68 : 0.58); }
			var half = q.askBars * 4;
			q.notes.forEach(function (midi, i) {
				var len = i === q.notes.length - 1 ? Math.min(1.8, half - i - 0.1) : 0.92;
				note(midi, i, len, i === 0 ? 0.88 : 0.82);
				if (o.fill) { note(midi, half + i, len, 0.82); }
			});
		} else if (q.drill === 'roots') {
			// each chord voiced close to the one before, struck on each of its bars (and on beat three of a half bar chord)
			var voiced = voiceLead(q), beat = 0;
			q.chords.forEach(function (c, i) {
				var len = c.bars * 4;
				for (var b = 0; b < len; b += 4) { chord(voiced[i], beat + b, Math.min(3.6, len - b - 0.2), b === 0 ? 0.7 : 0.6); }
				beat += len;
			});
			if (q.bassMode === 'heard' || o.fill) {
				q.roots.forEach(function (r, i) {
					for (var b = 0; b < r.len; b += 2) { note(q.notes[i], r.beat + b, Math.min(1.8, r.len - b - 0.1), b === 0 ? 0.88 : 0.74); }
				});
			}
		} else if (q.drill === 'chord') {
			var v = voicing(q.chord, q.keyPc);
			chord(v, 0, hold, 0.78); chord(v, 4, hold, 0.66);
			note(q.homeMidi, 0, 3.5);
			if (o.fill) {
				// the chord spelt out from its root, a note a beat (the colours on top are left to the keys)
				CHORD[q.chord].degs.slice(0, 4).forEach(function (d, i) { note(q.homeMidi + DEG[d].semi, 4 + i, 0.92); });
			}
		} else if (q.drill === 'scale') {
			// a bare fifth, so that the scale itself says whether home is major or minor
			var shell = shellOf(q.keyPc);
			chord(shell, 0, hold, 0.66); chord(shell, 4, hold, 0.56);
			var steps = scaleNotes(q);
			for (k = 0; k < steps.length; k++) { note(steps[k], k * 0.5, k === steps.length - 1 ? 1.4 : 0.46, k === 0 ? 0.9 : 0.8); }
			if (o.fill) { for (k = 0; k < steps.length; k++) { note(steps[steps.length - 1 - k], 4 + k * 0.5, k === steps.length - 1 ? 1.2 : 0.46, 0.8); } }
		} else if (q.drill === 'inv') {
			var top = voicing(q.chord, q.keyPc).map(function (n) { return n + 12; });
			chord(top, 0, hold, 0.74); chord(top, 4, hold, 0.62);
			note(q.target, 0, 3.5);
			if (o.fill) { note(q.target, 4, 3.5); }
		}
		return { keys: keys, bass: bass };
	}
	// The bar that says where home is, before a run's first question: the home chord, with home in the bass.
	function intro(run) {
		var home = homeMidi(run.keyPc);
		return {
			keys: [{ beat: 0, len: 3.6, notes: homeNotes(run.keyPc, run.home), vel: 0.78, spread: 0.012 }],
			bass: [{ beat: 0, len: 1.8, notes: [home], vel: 0.9 }, { beat: 2, len: 1.8, notes: [home], vel: 0.8 }]
		};
	}

	// The chords of a progression for the keys: each one the inversion nearest to the chord before it, kept between E3 and A4.
	var QUAL_TONES = { 'M': [0, 4, 7], 'm': [0, 3, 7], '7': [0, 4, 7, 10], 'M7': [0, 4, 7, 11], 'm7': [0, 3, 7, 10], 'h7': [0, 3, 6, 10], '9': [0, 4, 10, 14],
		'alt': [0, 4, 8, 10, 13], 'sus2': [0, 2, 7], 'sus4': [0, 5, 7], '6': [0, 4, 7, 9], 'aug': [0, 4, 8], 'dim': [0, 3, 6], 'dim7': [0, 3, 6, 9], 'mM7': [0, 3, 7, 11], 'm6': [0, 3, 7, 9] };
	function voiceLead(q) {
		var out = [], prev = null;
		q.chords.forEach(function (c) {
			var root = (q.keyPc + DEG[c.deg].semi) % 12, tones = [];
			// its notes once each, in order up the octave (so a stack of them never spans more than an octave)
			(QUAL_TONES[c.qual] || QUAL_TONES.M).forEach(function (t) { var pc = (root + t) % 12; if (tones.indexOf(pc) === -1) { tones.push(pc); } });
			tones.sort(function (a, b) { return a - b; });
			var options = [];
			// every stacking of the chord's notes that starts on one of them, in close position
			tones.forEach(function (bottom, i) {
				for (var base = 52; base <= 64; base++) {
					if (base % 12 !== bottom) { continue; }
					var stack = [base], at = base;
					for (var k = 1; k < tones.length; k++) { var pc = tones[(i + k) % tones.length]; at += ((pc - at % 12) + 12) % 12 || 12; stack.push(at); }
					if (stack[stack.length - 1] <= 69) { options.push(stack); }
				}
			});
			if (!options.length) { var low = 52 + ((tones[0] - 52) % 12 + 12) % 12, st = [low]; tones.slice(1).forEach(function (pc) { st.push(low + ((pc - tones[0]) + 12) % 12); }); options.push(st); }
			var best = options[0];
			if (prev) {
				var cost = function (v) { var s = 0; v.forEach(function (n) { s += Math.min.apply(null, prev.map(function (p) { return Math.abs(p - n); })); }); return s; };
				options.forEach(function (v) { if (cost(v) < cost(best)) { best = v; } });
			} else {
				// the first chord: the one whose middle sits nearest the middle of the range
				options.forEach(function (v) { if (Math.abs(v[0] + v[v.length - 1] - 120) < Math.abs(best[0] + best[best.length - 1] - 120)) { best = v; } });
			}
			out.push(best); prev = best;
		});
		return out;
	}

	// A scale as the bass plays it: up from home to home again.
	function scaleNotes(q) {
		return SCALE[q.scale].degs.map(function (d) { return q.homeMidi + DEG[d].semi; }).concat([q.homeMidi + 12]);
	}

	/*
	 * The notes that answer a question, for the page to write out and to mark on a fretboard:
	 * [{midi, deg (from home, for spelling), label, mark}]. "mark" is the note the question is about.
	 */
	function answerNotes(q) {
		var out = [], home = q.homeMidi;
		function push(midi, deg, label, mark) { out.push({ midi: midi, deg: deg, label: label, mark: !!mark }); }
		if (q.drill === 'deg') {
			push(home, '1', '1', false);
			push(q.target, q.item, DEG[q.item].label, true);
		} else if (q.drill === 'int') {
			push(q.from, q.fromDeg, DEG[q.fromDeg].label, false);
			push(q.to, q.toDeg, DEG[q.toDeg].label, true);
		} else if (q.drill === 'line' || q.drill === 'roots') {
			q.notes.forEach(function (midi, i) { push(midi, q.degs[i], DEG[q.degs[i]].label, false); });
		} else if (q.drill === 'chord') {
			CHORD[q.chord].degs.forEach(function (d, i) {
				// the colours on top are written an octave up, where they are heard, if the neck has room for that
				var midi = home + DEG[d].semi + (i > 3 && home + DEG[d].semi + 12 <= 55 ? 12 : 0);
				push(midi, d, i === 0 ? 'R' : i > 3 ? { 'b2': '♭9', '2': '9', '#2': '♯9', '6': '13' }[d] : DEG[d].label, i > 0);
			});
		} else if (q.drill === 'scale') {
			var tell = SCALE[q.scale].tell;
			SCALE[q.scale].degs.forEach(function (d) { push(home + DEG[d].semi, d, DEG[d].label, tell.indexOf(d) !== -1); });
			push(home + 12, '1', '8', false);
		} else if (q.drill === 'inv') {
			// the note the bass has, then the chord it belongs to, spelt from its root
			push(q.target, q.bassDeg, MEMBER[q.item].short, true);
			CHORD[q.chord].degs.forEach(function (d, i) { push(home + DEG[d].semi, d, i === 0 ? 'R' : DEG[d].label, false); });
		}
		return out;
	}

	// What to play back on the bass to answer: pitch classes, in order. Any octave will do.
	function wanted(q) {
		var pcs = function (list) { return list.map(function (m) { return ((m % 12) + 12) % 12; }); };
		if (q.drill === 'deg') { return pcs([q.target]); }
		if (q.drill === 'int') { return pcs([q.from, q.to]); }
		if (q.drill === 'line' || q.drill === 'roots') { return pcs(q.notes); }
		if (q.drill === 'chord') { return pcs(CHORD[q.chord].degs.slice(0, 4).map(function (d) { return q.homeMidi + DEG[d].semi; })); }
		if (q.drill === 'scale') { return pcs(scaleNotes(q)); }
		return pcs([q.target]);
	}

	/*
	 * HEAR THE OTHER CHOICE. "Recognition is discrimination" (the course's words): after an answer, the near
	 * neighbours it is most often taken for, played on the same tone centre, so the difference can be heard
	 * back to back. variant() is the question as it would have been with the other answer.
	 */
	var CONTRAST = {
		deg: { '1': ['7', 'b2'], 'b2': ['1', '2'], '2': ['b2', 'b3'], 'b3': ['3', '2'], '3': ['b3', '4'], '4': ['#4', '3'], '#4': ['4', '5'], '5': ['#4', 'b6'], 'b6': ['6', '5'], '6': ['b6', 'b7'], 'b7': ['7', '6'], '7': ['b7', '1'] },
		int: { 'm2': ['M2'], 'M2': ['m2', 'm3'], 'm3': ['M3', 'M2'], 'M3': ['m3', 'P4'], 'P4': ['TT', 'M3'], 'TT': ['P4', 'P5'], 'P5': ['TT', 'm6'], 'm6': ['M6', 'P5'], 'M6': ['m6', 'm7'], 'm7': ['M7', 'M6'], 'M7': ['m7', 'P8'], 'P8': ['M7', 'm10'], 'm10': ['M10', 'P8'], 'M10': ['m10'] },
		chord: { maj: ['min', 'sus4', 'aug'], min: ['maj', 'dim', 'sus2'], dim: ['min', 'm7b5'], aug: ['maj'], sus2: ['min', 'maj'], sus4: ['maj', '7sus4'], maj7: ['7', '6'], '7': ['maj7', 'm7', '7sus4'],
			m7: ['7', 'm6', 'm7b5'], m7b5: ['m7', 'dim7'], dim7: ['m7b5'], mM7: ['m7', 'm6'], '6': ['maj7', 'm6'], m6: ['m7', '6'], '9': ['7', 'm9'], maj9: ['maj7', '9'], m9: ['m7', '9'],
			'7sus4': ['7', 'sus4'], '7b9': ['7#9', '9'], '7#9': ['7b9', '9'], '13': ['9', '7'] },
		scale: { major: ['mixolydian', 'lydian'], minor: ['dorian', 'phrygian', 'harmonic'], majpent: ['major', 'minpent'], minpent: ['blues', 'minor'], dorian: ['minor', 'mixolydian'],
			mixolydian: ['major', 'dorian'], lydian: ['major'], phrygian: ['minor', 'locrian'], locrian: ['phrygian'], harmonic: ['minor', 'melodic'], melodic: ['harmonic', 'dorian'], blues: ['minpent'] },
		inv: { root: ['third', 'fifth'], third: ['root', 'fifth'], fifth: ['root', 'third'], seventh: ['root', 'third'] }
	};
	function compareWith(q) {
		return ((CONTRAST[q.drill] || {})[q.item] || []).filter(function (id) { return id !== q.item && !!variant(q, id); }).slice(0, 3);
	}
	function variant(q, id) {
		var v = {}, k;
		for (k in q) { if (Object.prototype.hasOwnProperty.call(q, k)) { v[k] = q[k]; } }
		v.item = id;
		if (q.drill === 'deg') {
			if (!DEG[id]) { return null; }
			v.target = q.below ? q.homeMidi - 12 + DEG[id].semi : q.homeMidi + (id === '1' ? 12 : DEG[id].semi);
		} else if (q.drill === 'int') {
			if (!INTERVAL[id]) { return null; }
			v.to = q.dir === 'up' ? q.from + INTERVAL[id].semi : q.from - INTERVAL[id].semi;
			if (v.to < 28 || v.to > 60) { return null; }
		} else if (q.drill === 'chord') {
			if (!CHORD[id]) { return null; }
			v.chord = id;
		} else if (q.drill === 'scale') {
			if (!SCALE[id]) { return null; }
			v.scale = id;
		} else if (q.drill === 'inv') {
			var member = MEMBER[id], degs = CHORD[q.chord].degs;
			if (!member || member.n >= degs.length) { return null; }
			v.bassDeg = degs[member.n];
			v.target = q.homeMidi + DEG[v.bassDeg].semi;
			if (v.target > 43) { v.target -= 12; }
			if (v.target < 28) { v.target += 12; }
		} else { return null; }
		return v;
	}

	/*
	 * TODAY'S SET. A short session chosen from the record, as a spaced schedule would: what was missed lately
	 * first, then what was recognised but hasn't been heard for a week, then something new, in the course's
	 * order. Each part is a drill and the few things it asks (two at least, with whatever they are most often
	 * taken for), four questions each, three parts at most. Someone with no record starts at the beginning.
	 */
	var NEW_ORDER = [['deg', 'tri'], ['chord', 'two'], ['int', 'open'], ['inv', 'major'], ['scale', 'two'], ['line', 'cells'], ['roots', 'lp'],
		['deg', 'major'], ['chord', 'triads'], ['int', 'thirds'], ['line', 'bar'], ['deg', 'minor'], ['chord', 'sevenths'], ['scale', 'pent']];
	function today(log, now) {
		now = now || Date.now();
		var st = stats(log || []), week = 7 * 864e5, by = {};
		Object.keys(st.items).forEach(function (key) {
			var r = st.items[key], misses = r.last.filter(function (ok) { return !ok; }).length, score = 0, why = '';
			if (!r.recognised && misses) { score = 10 + misses * 2; why = 'missed lately'; }
			else if (r.recognised && now - (r.lastT || 0) > week) { score = 5 + Math.min(10, (now - r.lastT) / 864e5 / 7); why = 'not heard for a while'; }
			else if (!r.recognised) { score = 3; why = 'not yet recognised'; }
			if (!score || !DRILLS[r.drill]) { return; }
			var d = by[r.drill] || (by[r.drill] = { drill: r.drill, items: [], score: 0, why: why });
			d.items.push({ id: r.item, score: score });
			d.score += score;
			if (score > 10) { d.why = 'missed lately'; }
		});
		var plan = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.score - a.score; }).slice(0, 3).map(function (d) {
			var items = d.items.sort(function (a, b) { return b.score - a.score; }).slice(0, 4).map(function (x) { return x.id; });
			// what it is taken for comes too, so the two are heard side by side
			st.mixups.forEach(function (m) { if (m.drill === d.drill && items.indexOf(m.was) !== -1 && items.indexOf(m.said) === -1 && items.length < 5) { items.push(m.said); } });
			// one thing on its own is nothing to choose between: add its nearest neighbour, or the drill's first set
			if (items.length < 2) {
				var near = ((CONTRAST[d.drill] || {})[items[0]] || []).filter(function (id) { return DRILLS[d.drill].item[id]; });
				items = items.concat(near.length ? near.slice(0, 1) : DRILLS[d.drill].sets[0].items.filter(function (id) { return items.indexOf(id) === -1; }).slice(0, 2));
			}
			return { drill: d.drill, items: items, n: 4, why: d.why };
		});
		// then something new: the next step in the course's order that hasn't been started
		var used = {};
		(log || []).forEach(function (e) { used[e.d + ':' + e.q] = true; });
		for (var i = 0; i < NEW_ORDER.length && plan.length < 3; i++) {
			var drill = DRILLS[NEW_ORDER[i][0]];
			if (!drill || plan.some(function (p) { return p.drill === drill.id; })) { continue; }
			var set = drill.sets.filter(function (s) { return s.id === NEW_ORDER[i][1]; })[0];
			if (!set || set.items.every(function (id) { return used[drill.id + ':' + id]; })) { continue; }
			plan.push({ drill: drill.id, items: set.items.slice(), n: 4, why: 'something new' });
		}
		return plan;
	}

	EAR.NOTE_SETS = NOTE_SETS; EAR.NOTE_SET_ORDER = NOTE_SET_ORDER;
	EAR.markSeq = markSeq;
	EAR.compareWith = compareWith;
	EAR.variant = variant;
	EAR.today = today;
	EAR.degKey = degKey;
	EAR.voiceLead = voiceLead;
	EAR.KEYS = KEYS;
	EAR.STRANDS = STRANDS;
	EAR.DRILLS = DRILLS;
	EAR.DEG = DEG; EAR.INTERVAL = INTERVAL; EAR.CHORD = CHORD; EAR.SCALE = SCALE; EAR.MEMBER = MEMBER; EAR.INV_CHORDS = INV_CHORDS;
	EAR.tonic = tonic;
	EAR.defaultMix = defaultMix;
	EAR.cleanMix = cleanMix;
	EAR.homeFor = homeFor;
	EAR.qualityOf = qualityOf;
	EAR.homeMidi = homeMidi;
	EAR.pick = pick;
	EAR.mark = mark;
	EAR.entry = entry;
	EAR.stats = stats;
	EAR.sound = sound;
	EAR.intro = intro;
	EAR.voicing = voicing;
	EAR.scaleNotes = scaleNotes;
	EAR.answerNotes = answerNotes;
	EAR.wanted = wanted;
}(typeof window !== 'undefined' ? window : globalThis));
