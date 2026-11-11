/*
 * Leith Bass Space: Harmonic Elements, the app's own drummers.
 *
 * Thirteen feels, each with three grooves, played on any of seven kits:
 * three recorded kits (a studio kit, a big rock kit, a brushes kit), two more
 * made by treating those (a tight dry one, a dusty one), and two drum
 * machines drawn from scratch (an 808 and a 909). Every loop is four bars:
 * the two-bar groove twice, with a small fill to turn it round.
 *
 * A loop is drawn once into a buffer, exactly four bars long, and handed to
 * the player like a recorded file. Each hit is laid into the loop by plain
 * addition (whatever rings past the end of bar four carries on from bar one),
 * then the whole kit goes once through its room and its colour. he-sounds.js
 * says why it is done that way.
 *
 * Nothing here plays by itself: he-synth.js asks for a loop and looks after
 * the copies already made.
 *
 * HE.kit.FEELS          the feels, in order: [{name, grid, grooves, kits}]
 * HE.kit.KITS           the kits: [{id, name, packs}]
 * HE.kit.kitsFor(feel)  kit ids that suit a feel, best first
 * HE.kit.draw(spec, packs, rate)   a promise of {buffer, length}
 *     spec: {feel, kit, groove, bpm, seed}; packs: {name: pack} already loaded
 *
 * The Shed metronome plays the same drummers a hit at a time, so that the
 * tempo can move while they play. For that it borrows:
 * HE.kit.plan(spec)                the hits of one four-bar cycle
 * HE.kit.pieces(kit, packs, rate)  a promise of a function: a piece's letter in, its takes out
 * HE.kit.choose(takes, level, turn)   the take nearest to how hard a piece is hit
 * HE.kit.VEL, PAN, CHOKES, STAND_IN, TRAY   the tables draw() works from
 */
(function (root) {
	'use strict';
	var HE = root.HE, SND = HE.sounds;
	var OAC = root.OfflineAudioContext || root.webkitOfflineAudioContext;

	// Patterns are written a bar at a time with spaces between beats, so they can be read.
	function P(text) { return text.replace(/[\s|]/g, ''); }
	function twice(bar) { var b = P(bar); return b + b; }

	/*
	 * THE FEELS. Two bars each. Straight feels are written in sixteenths (16 to
	 * the bar), triplet feels in twelve.
	 *   X accent   x normal   m lighter   o ghost   g barely there   . rest
	 * Tracks: k kick, s snare, x cross-stick, r rimshot, h closed hat, q half-open
	 * hat, o open hat, p hat pedal, R ride, B ride bell, c crash, t high tom,
	 * l low tom, w brush stir, S shaker, T tambourine, C conga, L low conga,
	 * V claves, W cowbell, P clap.
	 * "swing" is how far round the beat the off sixteenth falls (0.5 is straight).
	 * "lag" holds a drum back by a few thousandths of a second; "loose" is how much
	 * every hit wanders.
	 */
	var BACK = twice('.... X... .... X...');
	var FEELS = [
		{ name: 'Rock 8ths', grid: 16, loose: 3, kits: ['rock', 'studio', 'tight', '909', 'lofi'], fills: ['snare4', 'toms4', 'snare34', 'push'],
			grooves: [
				{ h: twice('X.x. X.x. X.x. X.x.'), k: P('X... .... x.x. .... | X... ..x. x... ....'), s: BACK, c: P('m... .... .... .... | .... .... .... ....') },
				{ h: twice('X.x. X.x. X.x. X.x.'), k: P('X... ..x. X... .... | X... ..x. X.x. ....'), s: P('.... X... .... X... | .... X... .... X..o') },
				{ q: twice('x.m. x.m. x.m. x.m.'), k: P('X... .... X.x. .... | X.x. .... X... ..x.'), s: BACK, c: P('m... .... .... .... | .... .... .... ....') }
			] },
		{ name: 'Pop 16ths', grid: 16, loose: 3, kits: ['studio', 'tight', '909', 'rock', 'lofi'], fills: ['snare4', 'push', 'toms4'],
			grooves: [
				{ h: twice('Xmxm Xmxm Xmxm Xmxm'), k: P('X... ..x. X... .... | X... ..x. X.x. ....'), s: BACK },
				{ h: twice('x.x. x.x. x.x. x.x.'), S: twice('xmxm xmxm xmxm xmxm'), k: P('X..x .... x.X. .... | X..x .... x.X. ..x.'), s: BACK, P: twice('.... m... .... m...') },
				{ h: twice('xmxm xmxm xmxm xm..'), o: twice('.... .... .... ..x.'), k: P('X... .... X.x. .... | X... ...x X.x. ....'), s: BACK }
			] },
		{ name: 'Funky 16ths', grid: 16, loose: 4, kits: ['tight', 'studio', 'lofi', 'rock', '808'], fills: ['ghost4', 'snare4', 'push'],
			grooves: [
				{ h: twice('Xmxm Xmxm Xmxm Xmxm'), k: P('X..x ..x. ..x. .... | X..x ..x. .... x...'), s: P('.... X..o .o.. X..o | .... X..o .o.. X.o.') },
				{ h: twice('x.x. x.x. x.x. x.x.'), o: P('.... .... .... .... | .... .... .... ..x.'), k: P('X.x. .... ..x. .x.. | X.x. .... ..x. .x..'), s: P('.... X..o .o.o X..o | .... X..o .o.o X...') },
				{ h: twice('x.xm x.xm x.xm x.xm'), k: P('X... ...x .xX. .... | X... ...x .x.. ..x.'), s: P('.... X... .... X..o | .o.. X... .o.. X...'), C: twice('..m. .... ..m. m...'), L: twice('.... ..m. .... ..m.') }
			] },
		{ name: 'Hip hop', grid: 16, swing: 0.58, loose: 5, lag: { s: 9, P: 9 }, kits: ['lofi', '808', 'tight', 'studio'], fills: ['push', 'ghost4', 'none'],
			grooves: [
				{ h: P('x.x. x.x. x.x. x.x. | x.x. x.x. x.x. xmxm'), k: P('X... .... ..X. .... | X..x .... ..X. ....'), s: BACK },
				{ h: twice('x.x. x.x. x.x. x.x.'), o: P('.... .... .... .... | .... .... .... ..x.'), k: P('X... ...x X... .... | X... ...x X.x. ....'), s: P('.... X... .... X... | .... X..o .... X...') },
				{ h: twice('x.x. x.xm x.x. x.x.'), k: P('X..x .... .xX. .... | X... .... .xX. ..x.'), s: BACK, P: twice('.... m... .... m...') }
			] },
		{ name: 'Soul', grid: 16, loose: 4, kits: ['studio', 'tight', 'rock', 'brushes', 'lofi'], fills: ['snare4', 'toms4', 'none'],
			grooves: [
				{ h: twice('x.x. x.x. x.x. x.x.'), k: P('X... ..x. X... .... | X... ..x. X... x...'), s: twice('m... X... m... X...'), T: twice('.... x... .... x...') },
				{ h: twice('x.x. x.x. x.x. x.x.'), k: P('X... .... X.x. .... | X... .... X.x. ..x.'), s: BACK, T: twice('m.m. x.m. m.m. x.m.') },
				{ h: twice('..x. ..x. ..x. ..x.'), k: twice('X... x... X... x...'), s: BACK, T: twice('xmxm Xmxm xmxm Xmxm') }
			] },
		{ name: 'Shuffle', grid: 12, loose: 4, kits: ['studio', 'rock', 'tight', 'brushes', '909'], fills: ['trip4', 'tomtrip', 'none'],
			grooves: [
				{ h: twice('X.x X.x X.x X.x'), k: P('X.. ... X.. ..x | X.. ... X.. ...'), s: twice('... X.. ... X..') },
				{ R: twice('X.x X.x X.x X.x'), p: twice('... x.. ... x..'), k: P('X.. ... X.. ... | X.. ..x X.. ...'), s: twice('g.o X.o g.o X.o') },
				{ h: twice('X.x X.x X.x X.x'), k: twice('X.. x.. X.. x..'), s: P('... X.. ... X.x | ... X.. ... X..') }
			] },
		{ name: 'Half-time', grid: 16, loose: 4, kits: ['rock', 'studio', 'lofi', '808', 'tight'], fills: ['toms4', 'push', 'snare4'],
			grooves: [
				{ h: twice('X.x. X.x. X.x. X.x.'), k: P('X... .... ..x. .... | X... ...x ..x. ....'), s: twice('.... .... X... ....'), c: P('m... .... .... .... | .... .... .... ....') },
				{ h: twice('Xmxm Xmxm Xmxm Xmxm'), k: P('X... ..x. .... ..x. | X... .... .... x.x.'), s: P('.... .o.. X... .o.. | .... .o.. X..o ....') },
				{ q: twice('x... x... x... x...'), k: P('X... .... .... x... | X.x. .... .... ....'), s: twice('.... .... X... ....') }
			] },
		{ name: 'Reggae', grid: 16, loose: 4, kits: ['studio', 'tight', 'rock', 'lofi', '808'], fills: ['rim4', 'none', 'push'],
			grooves: [
				{ h: twice('x.X. x.X. x.X. x.X.'), k: twice('.... .... X... ....'), x: twice('.... .... X... ....') },
				{ h: twice('x.X. x.X. x.X. x.X.'), k: twice('X... x... X... x...'), x: P('.... .... X... .... | .... .... X... ..m.') },
				{ h: twice('x.Xm x.X. x.Xm x.X.'), o: P('.... .... .... .... | .... .... .... ..x.'), k: twice('.... .... X... ....'), r: twice('.... .... X... ....') }
			] },
		{ name: 'Swing', grid: 12, loose: 5, kits: ['brushes', 'studio', 'tight', 'rock'], fills: ['swingcomp', 'trip4', 'none'],
			grooves: [
				{ R: twice('X.. X.x X.. X.x'), w: twice('x.. X.. x.. X..'), p: twice('... x.. ... x..'), k: twice('g.. g.. g.. g..'), s: P('... ... ... ... | ... ... ..o ...') },
				{ R: P('X.. X.x X.. X.x | X.. X.x X.x X.x'), w: twice('x.. X.. x.. X..'), p: twice('... x.. ... x..'), k: twice('g.. g.. g.. g..'), x: twice('... ... ... x..') },
				{ R: twice('X.. X.x X.. X.x'), w: twice('x.. X.. x.. X..'), p: twice('... x.. ... x..'), k: P('... ... ..m ... | ... ... ... ..m'), s: P('..o ... ... ... | ... ..o ... ...') }
			] },
		{ name: 'Bossa', grid: 16, loose: 3, kits: ['brushes', 'studio', 'tight', '808'], fills: ['none', 'rim4'],
			grooves: [
				{ h: twice('m.m. m.m. m.m. m.m.'), w: twice('x... x... x... x...'), k: twice('X... ..x. X... ..x.'), x: P('x... ..x. .... x... | .... x... ..x. ....') },
				{ S: twice('xmxm xmxm xmxm xmxm'), p: twice('.... x... .... x...'), k: twice('X... ..x. X... ..x.'), x: P('.... x... ..x. .... | x... ..x. .... x...') },
				{ R: twice('x.m. x.m. x.m. x.m.'), w: twice('x... x... x... x...'), p: twice('.... x... .... x...'), k: twice('X... ..x. X... ..x.'), x: P('x... ..x. .... x... | .... x... ..x. ....') }
			] },
		{ name: 'Neo soul', grid: 16, swing: 0.61, loose: 6, lag: { s: 14, x: 12, P: 14 }, kits: ['lofi', 'tight', 'studio', '808', 'brushes'], fills: ['ghost4', 'push', 'none'],
			grooves: [
				{ h: twice('x.x. x.x. x.x. x.x.'), k: P('X... ...x ..x. .... | X... ...x .x.. ....'), s: P('.... X... .... X... | .... X... .... X..o') },
				{ h: twice('x.xm x.x. x.xm x.x.'), k: P('X..x .... .... x... | X... ...x ..x. ....'), s: P('.o.. X... .o.. X... | .... X... .o.. X...') },
				{ h: twice('xmxm xmxm xmxm xmxm'), k: P('X... .... x.x. .... | X... ..x. x... ....'), x: BACK }
			] },
		{ name: 'Four on the floor', grid: 16, loose: 2, kits: ['909', 'studio', '808', 'tight', 'rock'], fills: ['snare4', 'push', 'none'],
			grooves: [
				{ k: twice('X... X... X... X...'), s: BACK, h: twice('m... m... m... m...'), o: twice('..x. ..x. ..x. ..x.') },
				{ k: twice('X... X... X... X...'), P: twice('.... X... .... X...'), h: twice('..x. ..x. ..x. ..x.'), S: twice('xmxm xmxm xmxm xmxm') },
				{ k: twice('X... X... X... X...'), s: BACK, h: twice('x.xm x.xm x.xm x.xm'), c: P('m... .... .... .... | .... .... .... ....') }
			] },
		// No kit: congas, shaker, claves and a bell.
		{ name: 'Percussion', grid: 16, loose: 5, kits: ['hand', '808'], fills: ['none'],
			grooves: [
				{ S: twice('xmxm xmxm xmxm xmxm'), C: twice('..m. ..x. ..m. x.x.'), L: twice('.... .... .... ..m.'), V: P('x..x ..x. ..x. x... | x..x ..x. ..x. x...') },
				{ S: twice('x.m. x.m. x.m. x.m.'), C: P('..m. ..x. ..m. x.x. | ..m. ..x. .xm. x.x.'), L: twice('.... ..m. .... ..x.'), W: twice('x... x.x. x... x.x.') },
				{ T: twice('xmxm Xmxm xmxm Xmxm'), C: twice('..x. .x.. ..x. x.x.'), L: twice('x... .... x... ....'), V: P('..x. x... x..x ..x. | ..x. x... x..x ..x.') }
			] }
	];
	var FEEL = {};
	FEELS.forEach(function (f) { FEEL[f.name] = f; });

	// A fill takes over the end of bar four: "from" is the step it starts on,
	// and its tracks are written from there to the bar line.
	var FILLS = {
		none: null,
		push: { grid: 16, from: 14, keep: 'hRSTqo', add: { k: '.m', o: 'x.' } },
		snare4: { grid: 16, from: 12, add: { s: 'omxX' } },
		ghost4: { grid: 16, from: 12, keep: 'hRSq', add: { s: 'o.ox' } },
		toms4: { grid: 16, from: 12, add: { t: 'xx..', l: '..xX' } },
		snare34: { grid: 16, from: 8, add: { s: '..x. x.xX' } },
		rim4: { grid: 16, from: 12, keep: 'hS', add: { x: 'm.mx' } },
		trip4: { grid: 12, from: 9, add: { s: 'mxX' } },
		tomtrip: { grid: 12, from: 9, add: { t: 'xx.', l: '..X' } },
		swingcomp: { grid: 12, from: 6, keep: 'Rpwk', add: { s: '..m ..x' } }
	};
	var CLEARED = 'sxrtlhqoRBSTP'; // what a fill silences unless it says to keep it

	var VEL = { X: 0, x: -4.5, m: -9, o: -15, g: -21 }; // decibels below a piece's loudest

	/*
	 * THE KITS.
	 *   packs     what has to be fetched ("perc" is the hand percussion tray)
	 *   trim      decibels added to a piece, to balance the kit (set by measuring each piece
	 *             alone against the snare: hats about 12 dB under it, the ride 11, and so on)
	 *   tune      semitones a piece is moved by
	 *   len       how much of a piece's ring is kept (1 is all of it)
	 *   room      how much of the room goes in, and how long it is in seconds
	 *   colour    what is done to the whole kit: {low, high (Hz), drive, squash}
	 */
	var KITS = [
		{ id: 'studio', name: 'Studio kit', packs: ['kit-studio', 'perc'],
			trim: { k: -5, h: 1, q: 6, o: 18, R: 9, B: 7, c: 10, p: 8, x: 5, r: -1 }, room: [0.12, 0.7], colour: { squash: 0.35 } },
		{ id: 'tight', name: 'Tight kit', packs: ['kit-studio', 'perc'],
			trim: { k: -5.5, s: 1, h: -1.5, q: 3, o: 16, R: 7, B: 5, c: 7, p: 6, x: 4 }, tune: { s: 1.5, k: 0.7, h: 0.8, t: 1, l: 1 }, len: { k: 0.55, s: 0.6, o: 0.45, q: 0.6, t: 0.6, l: 0.6, c: 0.6 },
			room: [0.035, 0.35], colour: { squash: 0.7, low: 45 } },
		{ id: 'rock', name: 'Big kit', packs: ['kit-rock', 'perc'],
			trim: { k: 2, h: -3, q: -1.5, o: 1.5, R: 1, B: 3, c: 12, p: -9, x: 4, r: 4 }, room: [0.2, 1.1], colour: { squash: 0.5 } },
		{ id: 'brushes', name: 'Brushes', packs: ['kit-brushes', 'perc'],
			trim: { k: -5, w: 9, h: -7, o: 8, p: -5.5, R: 10, B: 8, c: 20, x: 4 }, room: [0.16, 0.9], colour: { squash: 0.2 } },
		{ id: 'lofi', name: 'Dusty kit', packs: ['kit-rock', 'perc'],
			trim: { k: 3.5, h: -8, q: -9, o: -8, R: -7, B: -5, c: 0, p: -10, x: 2 }, tune: { all: -1.6 }, len: { k: 0.7, s: 0.75, o: 0.5, q: 0.6, c: 0.5 },
			room: [0.05, 0.4], colour: { squash: 0.85, low: 55, high: 5600, drive: 0.5 } },
		{ id: '808', name: '808', packs: [], drawn: '808',
			trim: { k: -10, h: 7, q: 9, c: -3.5, x: -4, R: -2, p: 12, S: -8, P: 5.5, T: 3, C: -11, L: -11.5, V: -5.5, W: -5.5 }, room: [0.05, 0.5], colour: { squash: 0.4 } },
		{ id: '909', name: '909', packs: [], drawn: '909',
			trim: { k: -6.5, c: -3, o: -5, x: -3, R: -7, p: 5, S: -8, P: 4, C: -11, L: -11.5, V: -5.5, W: -5.5 }, room: [0.08, 0.6], colour: { squash: 0.5 } },
		// Used by the Percussion feel only, so it isn't offered as a kit to choose.
		{ id: 'hand', name: 'Hand percussion', packs: ['perc'], hidden: true, trim: {}, room: [0.14, 0.8], colour: { squash: 0.2 } }
	];
	// The hand percussion tray is one set of recordings shared by every recorded kit, balanced once here.
	var TRAY = { S: 0, P: 4, T: -1.5, C: -7, L: -6, V: 6, W: -4.5 };
	var KIT = {};
	KITS.forEach(function (k) { KIT[k.id] = k; });

	// Where each piece sits from left to right, as the drummer hears it.
	var PAN = { k: 0, s: 0.04, x: 0.04, r: 0.04, w: 0.04, h: 0.3, q: 0.3, o: 0.3, p: 0.3, R: -0.34, B: -0.34, c: -0.2, t: 0.18, l: -0.3, S: -0.4, T: 0.42, C: -0.25, L: -0.38, V: 0.35, W: 0.25, P: 0.1 };
	// Pieces that share a hand or a pedal: the next one stops the last one ringing.
	var CHOKES = { o: 'hqpo', q: 'hpoq' };
	// What plays a piece when a kit hasn't got one.
	var STAND_IN = { x: 's', r: 's', q: 'o', B: 'R', R: 'h', p: 'h', w: null, t: 'l', l: 't', c: 'o' };

	/* ---------- from a groove to a list of hits ---------- */

	function plan(spec) {
		var feel = FEEL[spec.feel] || FEELS[0];
		var groove = feel.grooves[(spec.groove || 0) % feel.grooves.length];
		var rnd = SND.random(SND.hash([feel.name, spec.kit, spec.groove, spec.bpm, spec.seed || 0].join('|')));
		var barDur = 240 / spec.bpm, step = barDur / feel.grid, bars = 4, total = bars * barDur;
		var fillName = spec.fill !== undefined ? spec.fill : feel.fills[Math.floor(rnd() * feel.fills.length)];
		var fill = FILLS[fillName] && FILLS[fillName].grid === feel.grid ? FILLS[fillName] : null;
		var hits = [];
		Object.keys(groove).forEach(function (track) {
			var line = groove[track];
			for (var bar = 0; bar < bars; bar++) {
				for (var i = 0; i < feel.grid; i++) {
					var ch = line.charAt((bar % 2) * feel.grid + i);
					if (bar === bars - 1 && fill && i >= fill.from) {
						if (fill.add[track]) { continue; } // the fill's own line replaces it
						if (CLEARED.indexOf(track) !== -1 && (fill.keep || '').indexOf(track) === -1) { continue; }
					}
					if (ch === '.' || VEL[ch] === undefined) { continue; }
					// the crash only marks the top of the loop
					if (track === 'c' && bar !== 0) { continue; }
					hits.push({ track: track, bar: bar, step: i, vel: VEL[ch] });
				}
			}
		});
		if (fill) {
			Object.keys(fill.add).forEach(function (track) {
				var line = P(fill.add[track]);
				for (var i = 0; i < line.length; i++) {
					var ch = line.charAt(i);
					if (VEL[ch] !== undefined) { hits.push({ track: track, bar: bars - 1, step: fill.from + i, vel: VEL[ch], fill: true }); }
				}
			});
		}
		// When each one lands: on the grid, swung if the feel swings, then a little human.
		var loose = (feel.loose || 0) / 1000;
		hits.forEach(function (h) {
			var t = (h.bar * feel.grid + h.step) * step;
			if (feel.swing && feel.grid === 16 && h.step % 2 === 1) { t += (feel.swing - 0.5) * 2 * step; }
			if (feel.lag && feel.lag[h.track]) { t += feel.lag[h.track] / 1000; }
			// time-keepers wander least; the kick and the backbeat a little more
			var wander = 'hRSqp'.indexOf(h.track) !== -1 ? 0.5 : 1;
			t += (rnd() + rnd() - 1) * loose * wander;
			if (t < 0) { t += total; }
			h.t = t;
			h.vel += (rnd() - 0.5) * 2.4;
			// a hi-hat or ride played by hand leans on the beat
			if ('hRS'.indexOf(h.track) !== -1 && h.step % (feel.grid / 4) !== 0) { h.vel -= 1; }
		});
		hits.sort(function (a, b) { return a.t - b.t; });
		return { feel: feel, hits: hits, barDur: barDur, bars: bars, total: total, rnd: rnd };
	}

	/* ---------- the pieces of a kit, as plain samples ---------- */

	/*
	 * Whatever the kit, a piece ends up as a list of "takes": {pcm, from, len,
	 * level, unit}. "level" is how hard the take was hit (dB below the kit's
	 * loudest); "unit" is the level the samples are stored at.
	 */

	// A recorded kit: the takes are inside its pack, all stored at the same peak.
	function recordedPieces(kit, packs) {
		var kitPack = packs[kit.packs[0]], perc = packs.perc, made = {};
		return function (track) {
			if (made[track] !== undefined) { return made[track]; }
			var pack = kitPack && kitPack.info.hits[track] ? kitPack : perc && perc.info.hits[track] ? perc : null;
			if (!pack) { made[track] = null; return null; }
			var pcm = pack.buffer.getChannelData(0), rate = pack.buffer.sampleRate, zero = Math.round(pack.zero * rate);
			made[track] = pack.info.hits[track].map(function (seg) {
				return { pcm: pcm, from: zero + Math.round(seg[0] * rate), len: Math.floor(seg[1] * rate), level: seg[2], unit: 0, tray: pack === perc };
			});
			return made[track];
		};
	}

	/* ---------- drum machines, drawn from scratch ---------- */

	var noise = {}, metal = {};
	function noiseData(rate) {
		if (!noise[rate]) {
			var d = new Float32Array(rate), rnd = SND.random(22222);
			for (var i = 0; i < d.length; i++) { d[i] = rnd() * 2 - 1; }
			noise[rate] = d;
		}
		return noise[rate];
	}
	// Six square waves at awkward intervals, summed: the raw material of a drum machine's cymbals.
	function metalData(rate, base) {
		var key = rate + '|' + base;
		if (!metal[key]) {
			var len = Math.floor(rate * 1.2), d = new Float32Array(len);
			[1, 1.342, 1.2312, 1.6532, 1.9523, 2.1523].forEach(function (ratio, n) {
				var f = base * ratio, ph = n * 0.37;
				for (var i = 0; i < len; i++) { d[i] += ((i * f / rate + ph) % 1) < 0.5 ? 0.16 : -0.16; }
			});
			metal[key] = d;
		}
		return metal[key];
	}
	function asBuffer(oc, data) {
		var b = oc.createBuffer(1, data.length, oc.sampleRate);
		b.getChannelData(0).set(data);
		return b;
	}

	// One voice of a drum machine, wired into a drawing. v is how hard, 0 to 1.
	function machine(kind, oc) {
		var nz = asBuffer(oc, noiseData(oc.sampleRate)), mt = asBuffer(oc, metalData(oc.sampleRate, kind === '808' ? 205 : 263));
		var nine = kind === '909', out = oc.destination;

		function burst(buffer, t, len, type, freq, q, gain, attack) {
			var s = oc.createBufferSource(), f = oc.createBiquadFilter(), g = oc.createGain();
			s.buffer = buffer; s.loop = true;
			f.type = type; f.frequency.value = freq; if (q) { f.Q.value = q; }
			g.gain.setValueAtTime(attack ? 0.0001 : gain, t);
			if (attack) { g.gain.linearRampToValueAtTime(gain, t + attack); }
			g.gain.exponentialRampToValueAtTime(0.0001, t + len);
			s.connect(f); f.connect(g); g.connect(out);
			s.start(t, 0.137); s.stop(t + len + 0.02);
		}
		function tone(t, len, type, from, to, sweep, gain, dest) {
			var o = oc.createOscillator(), g = oc.createGain();
			o.type = type;
			o.frequency.setValueAtTime(from, t);
			if (to !== from) { o.frequency.exponentialRampToValueAtTime(to, t + sweep); }
			g.gain.setValueAtTime(0.0001, t);
			g.gain.linearRampToValueAtTime(gain, t + 0.0015);
			g.gain.exponentialRampToValueAtTime(0.0001, t + len);
			o.connect(g); g.connect(dest || out);
			o.start(t); o.stop(t + len + 0.02);
		}
		function hat(t, v, len) {
			var s = oc.createBufferSource(), bp = oc.createBiquadFilter(), hp = oc.createBiquadFilter(), g = oc.createGain();
			s.buffer = mt; s.loop = true;
			bp.type = 'bandpass'; bp.frequency.value = nine ? 9200 : 8400; bp.Q.value = 0.9;
			hp.type = 'highpass'; hp.frequency.value = nine ? 6800 : 6200;
			g.gain.setValueAtTime(0.0001, t);
			g.gain.linearRampToValueAtTime(0.9 * v, t + 0.001);
			g.gain.exponentialRampToValueAtTime(0.0001, t + len);
			s.connect(bp); bp.connect(hp); hp.connect(g); g.connect(out);
			s.start(t, 0.211); s.stop(t + len + 0.02);
			if (nine) { burst(nz, t, len * 0.8, 'highpass', 8000, 0, 0.22 * v); }
		}
		return {
			k: function (t, v) {
				if (nine) {
					tone(t, 0.34, 'sine', 240, 52, 0.045, 1.0 * v);
					tone(t, 0.03, 'triangle', 900, 200, 0.02, 0.35 * v);
					burst(nz, t, 0.012, 'lowpass', 6000, 0, 0.3 * v);
				} else {
					tone(t, 0.62, 'sine', 128, 47, 0.07, 1.0 * v);
					tone(t, 0.02, 'sine', 400, 120, 0.012, 0.3 * v);
				}
			},
			s: function (t, v) {
				tone(t, nine ? 0.13 : 0.16, 'triangle', nine ? 240 : 190, nine ? 170 : 176, 0.04, 0.5 * v);
				tone(t, 0.09, 'sine', nine ? 420 : 332, nine ? 330 : 318, 0.03, 0.28 * v);
				// a softer snare has less of the wires in it
				burst(nz, t, nine ? 0.2 : 0.17, 'bandpass', nine ? 5200 : 4300, 0.5, 0.75 * v * (0.6 + 0.4 * v));
				burst(nz, t, 0.1, 'highpass', 7000, 0, 0.25 * v);
			},
			x: function (t, v) { tone(t, 0.025, 'triangle', 1680, 1640, 0.01, 0.6 * v); tone(t, 0.04, 'sine', 462, 450, 0.02, 0.5 * v); },
			r: function (t, v) { tone(t, 0.03, 'triangle', 1680, 1640, 0.01, 0.75 * v); tone(t, 0.06, 'sine', 462, 440, 0.02, 0.6 * v); burst(nz, t, 0.03, 'highpass', 3000, 0, 0.2 * v); },
			h: function (t, v) { hat(t, v, nine ? 0.06 : 0.05); },
			p: function (t, v) { hat(t, v * 0.7, 0.035); },
			q: function (t, v) { hat(t, v, 0.16); },
			o: function (t, v) { hat(t, v, nine ? 0.42 : 0.36); },
			R: function (t, v) { hat(t, v * 0.55, 0.75); tone(t, 0.5, 'sine', 5230, 5230, 0.1, 0.05 * v); },
			B: function (t, v) { tone(t, 0.5, 'triangle', 2710, 2710, 0.1, 0.25 * v); tone(t, 0.4, 'sine', 4020, 4020, 0.1, 0.12 * v); hat(t, v * 0.3, 0.5); },
			c: function (t, v) { burst(nz, t, 1.3, 'highpass', 5200, 0, 0.5 * v); hat(t, v * 0.7, 1.1); },
			t: function (t, v) { tone(t, 0.28, 'sine', nine ? 250 : 215, 150, 0.09, 0.9 * v); if (nine) { burst(nz, t, 0.03, 'lowpass', 2500, 0, 0.2 * v); } },
			l: function (t, v) { tone(t, 0.38, 'sine', nine ? 150 : 128, 88, 0.11, 0.95 * v); if (nine) { burst(nz, t, 0.03, 'lowpass', 2000, 0, 0.2 * v); } },
			P: function (t, v) {
				// a clap is three quick bursts and then the room
				[0, 0.011, 0.022].forEach(function (d) { burst(nz, t + d, 0.012, 'bandpass', 1150, 1.3, 0.7 * v); });
				burst(nz, t + 0.03, 0.17, 'bandpass', 1150, 1.1, 0.75 * v);
			},
			S: function (t, v) { burst(nz, t, 0.055, 'highpass', 6500, 0, 0.4 * v, 0.012); },
			T: function (t, v) { hat(t, v * 0.5, 0.11); burst(nz, t, 0.09, 'highpass', 9000, 0, 0.25 * v); },
			C: function (t, v) { tone(t, 0.2, 'sine', 370, 300, 0.03, 0.8 * v); },
			L: function (t, v) { tone(t, 0.26, 'sine', 255, 205, 0.03, 0.85 * v); },
			V: function (t, v) { tone(t, 0.045, 'sine', 2500, 2500, 0.01, 0.7 * v); },
			W: function (t, v) {
				var bp = oc.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2640; bp.Q.value = 1.2; bp.connect(out);
				tone(t, 0.3, 'square', 540, 540, 0.1, 0.4 * v, bp); tone(t, 0.3, 'square', 800, 800, 0.1, 0.4 * v, bp);
			}
		};
	}
	// How long each machine voice rings, in seconds, and which are drawn at more than one strength.
	var RINGS = { k: 0.72, s: 0.26, x: 0.07, r: 0.1, h: 0.09, p: 0.06, q: 0.2, o: 0.48, R: 0.82, B: 0.56, c: 1.4, t: 0.34, l: 0.44, P: 0.24, S: 0.08, T: 0.14, C: 0.24, L: 0.3, V: 0.07, W: 0.34 };
	var STRENGTHS = { s: [0, -8, -18] };

	// A drum machine's voices are each drawn once, the first time the machine is used, and kept.
	var machines = {};
	function drawnPieces(kind, rate) {
		var key = kind + '|' + rate;
		if (!machines[key]) {
			var jobs = [], names = [];
			Object.keys(RINGS).forEach(function (track) {
				(STRENGTHS[track] || [0]).forEach(function (level) {
					names.push([track, level]);
					jobs.push(function () {
						var oc = new OAC(1, Math.ceil(RINGS[track] * rate), rate);
						machine(kind, oc)[track](0, Math.pow(10, level / 20));
						return SND.render(oc).then(function (b) { return new Float32Array(b.getChannelData(0)); });
					});
				});
			});
			machines[key] = SND.together(jobs, 4).then(function (done) {
				var pieces = {};
				done.forEach(function (pcm, i) {
					(pieces[names[i][0]] = pieces[names[i][0]] || []).push({ pcm: pcm, from: 0, len: pcm.length, level: names[i][1], unit: names[i][1] });
				});
				return function (track) { return pieces[track] || null; };
			});
			machines[key].catch(function () { delete machines[key]; });
		}
		return machines[key];
	}

	/* ---------- drawing a loop ---------- */

	// The take of a piece nearest to how hard it should be hit, taking turns among takes at that level.
	function choose(takes, level, turn) {
		var best = Infinity;
		takes.forEach(function (tk) { best = Math.min(best, Math.abs(tk.level - level)); });
		var near = takes.filter(function (tk) { return Math.abs(tk.level - level) <= best + 1.5; });
		return near[turn % near.length];
	}

	function curve(amount) {
		var n = 1024, c = new Float32Array(n), k = 1 + amount * 6;
		for (var i = 0; i < n; i++) { var x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); }
		return c;
	}

	function draw(spec, packs, rate) {
		var kit = KIT[spec.kit] || KIT['909'];
		var p = plan(spec);
		var bar = 2 * Math.round(p.barDur * rate / 2), frames = p.bars * bar;
		var ready = kit.drawn ? drawnPieces(kit.drawn, rate) : Promise.resolve(recordedPieces(kit, packs));
		return ready.then(function (pieces) {
			// step two: every hit is laid into the loop where it falls
			var dry = { L: new Float32Array(frames), R: new Float32Array(frames), frames: frames, rate: rate };
			var turns = {}, trim = kit.trim || {};
			function playable(track) {
				if (pieces(track)) { return track; }
				var alt = STAND_IN[track];
				return alt && pieces(alt) ? alt : null;
			}
			return SND.inTurns(p.hits, function (h, n) {
				var track = playable(h.track);
				if (!track || (spec.solo && spec.solo.indexOf(h.track) === -1)) { return; }
				var takes = pieces(track), top = -Infinity;
				takes.forEach(function (tk) { if (tk.level > top) { top = tk.level; } });
				turns[track] = (turns[track] || 0) + 1;
				var vel = h.vel + (track !== h.track ? -3 : 0);
				var at = Math.round(h.t * rate);
				if (h.track === 'w') {
					// the brush going round the snare head: a swish that swells in and dies away before the next beat
					var seg = takes[turns.w % takes.length], beat = p.barDur / 4 * rate;
					SND.lay(dry, seg.pcm, {
						from: seg.from + Math.floor(p.rnd() * 0.12 * rate), len: seg.len - Math.floor(0.14 * rate), at: at, pan: PAN.w,
						gain: Math.pow(10, (seg.level + vel + (trim.w || 0)) / 20), keep: Math.min(seg.len - 0.2 * rate, beat * 0.92), fade: 0.05 * rate,
						swell: { up: 0.07 * rate, down: beat * 0.28, floor: 0.3 }
					});
					return;
				}
				var take = choose(takes, top + vel, turns[track]);
				var want = top + vel + (trim[track] || 0) + (take.tray ? TRAY[track] || 0 : 0);
				var tune = ((kit.tune && (kit.tune[track] !== undefined ? kit.tune[track] : kit.tune.all)) || 0) + (p.rnd() - 0.5) * 0.12;
				var speed = Math.pow(2, tune / 12);
				var keep = take.len / speed * ((kit.len && kit.len[track]) || 1);
				// an open hat rings until the next hat closes it
				var chokes = CHOKES[h.track];
				if (chokes) {
					for (var j = n + 1; j < p.hits.length; j++) {
						if (chokes.indexOf(p.hits[j].track) !== -1) { keep = Math.min(keep, Math.max(0.02 * rate, (p.hits[j].t - h.t) * rate)); break; }
					}
				}
				SND.lay(dry, take.pcm, { from: take.from, len: take.len, at: at, gain: Math.pow(10, (want - take.unit) / 20), pan: PAN[h.track] || 0, rate: speed, keep: keep });
			}).then(function () { return dry; });
		}).then(function (dry) {
			// step three: the kit's room (drawn at half rate: an echo has no top to lose) is added to the kit,
			// and the whole lot goes through whatever colours it, as it sounds once it has been going round
			var col = kit.colour || {};
			return SND.steady({ rate: rate, frames: frames, lead: kit.room[1] + 0.2, half: true, build: function (oc, play) {
				var verb = oc.createConvolver(), wet = oc.createGain();
				verb.buffer = SND.room(oc, { seconds: kit.room[1], bright: 0.55, early: 0.6, seed: 11 });
				wet.gain.value = kit.room[0] * 4;
				play([dry.L, dry.R]).connect(verb); verb.connect(wet); wet.connect(oc.destination);
			} }).then(function (wet) {
				[dry.L, dry.R].forEach(function (d, ch) {
					if (wet.half) { SND.addHalf(d, wet[ch]); }
					else { for (var i = 0; i < frames; i++) { d[i] += wet[ch][i]; } }
				});
				if (!col.low && !col.high && !col.drive && !col.squash) { return [dry.L, dry.R]; }
				return SND.steady({ rate: rate, frames: frames, lead: 0.7, build: function (oc, play) {
					var chain = play([dry.L, dry.R]);
					function into(node) { chain.connect(node); chain = node; }
					if (col.low) { var hp = oc.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = col.low; into(hp); }
					if (col.high) { var lp = oc.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = col.high; lp.Q.value = 0.5; into(lp); }
					if (col.drive) { var sh = oc.createWaveShaper(); sh.curve = curve(col.drive); try { sh.oversample = '2x'; } catch (e) { /* fine without */ } into(sh); }
					if (col.squash && oc.createDynamicsCompressor) {
						var comp = oc.createDynamicsCompressor();
						comp.threshold.value = -14 - 10 * col.squash; comp.knee.value = 8; comp.ratio.value = 2 + 4 * col.squash;
						comp.attack.value = 0.012; comp.release.value = 0.14;
						into(comp);
					}
					chain.connect(oc.destination);
				} });
			});
		}).then(function (channels) {
			return { buffer: SND.asBuffer(channels, rate), length: frames / rate, bars: p.bars };
		});
	}

	function kitsFor(feelName) {
		var feel = FEEL[feelName];
		return feel ? feel.kits.slice() : ['studio', 'tight', 'rock', 'lofi', '909', '808'];
	}

	// The pieces of a kit as plain samples, for anything that plays them one hit at a time.
	// A recorded kit's are ready as soon as its packs are; a drum machine's are drawn the first time.
	function pieces(kitId, packs, rate) {
		var kit = KIT[kitId] || KIT['909'];
		return kit.drawn ? drawnPieces(kit.drawn, rate) : Promise.resolve(recordedPieces(kit, packs || {}));
	}

	HE.kit = {
		supported: !!OAC,
		FEELS: FEELS, KITS: KITS, FILLS: FILLS,
		feel: function (name) { return FEEL[name] || null; },
		kit: function (id) { return KIT[id] || null; },
		kitsFor: kitsFor,
		plan: plan,
		draw: draw,
		curve: curve,
		pieces: pieces,
		choose: choose,
		VEL: VEL, PAN: PAN, CHOKES: CHOKES, STAND_IN: STAND_IN, TRAY: TRAY
	};
}(typeof window !== 'undefined' ? window : globalThis));
