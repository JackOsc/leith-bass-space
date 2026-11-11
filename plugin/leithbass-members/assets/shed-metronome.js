/*
 * Leith Bass Space: the Shed metronome.
 *
 * TIMING. Every click is handed to the audio clock a little ahead of time
 * (Chris Wilson's "tale of two clocks"), by a timer in a Web Worker so that a
 * busy page can't hold it up. Each one is placed on a whole sample, so nothing
 * is smeared between two. While the page is hidden it works further ahead, so
 * a throttled browser can't open gaps. A recording never begins exactly where
 * it speaks, so each one is started early by the little it needs (LEAD).
 *
 * SOUNDS. "Beep" and "Click" are drawn here and need no download. The other
 * clicks are recordings (one small pack, "clicks"), and each has a drawn stand
 * in that plays until the pack arrives, and for ever if it never does. The
 * house drummer is Harmonic Elements' own (he-kit.js): the same feels and
 * kits, but played here one hit at a time so that the tempo can move under
 * them. Those files are only fetched when something first needs them.
 *
 * LBSMetronome.create(env) -> m
 *   m.set(opts)              change anything, live
 *   m.start() / m.stop()     start gives a promise; the first click is 80 thousandths of a second later
 *   m.prepare()              fetch and get ready whatever the settings need (packs, the kit), before Start
 *   m.preview()              play the sound as it is set: accent, beat, subdivision
 *   m.running, m.opts
 *   m.currentBpm()           the tempo sounding now (Click up moves it)
 *   m.info()                 {clicks: 'drawn'|'recorded', kit: ''|'waiting'|'ready'|'failed'}
 *   m.onbeat  = fn(ev)       for the display, as each tick sounds:
 *       {time, bar, beat, sub, audible, muted, off, level, bpm, countIn,
 *        mute: null | {kind, now, to, done, gone, beats},   shares in % (now, and where it is heading), and beats taken away so far
 *        up:   null | {inBars, by, done}}               bars until the tempo next moves, and by how much
 *   m.onstate = fn(state)    'running' | 'stopped' | 'up-done' (Click up has got where it was going) | 'sounds' (a pack came in)
 *   m.kitUrls                Kyle's single hits from the Shelf, for a pattern played on his kit
 *
 * opts (all optional):
 *   bpm 20-300; meter [n, d]; groups [2,2,3] for odd x/8 meters;
 *   sub 1-6 (clicks per beat); swing 0-1 (straight to triplet, for 2 or 4 per beat);
 *   accents ['accent','normal','soft','mute', ...] one per beat;
 *   sound 'woodblock'|'claves'|'cowbell'|'rim'|'hat'|'beep'|'click';
 *   vol {accent, beat, sub, groove} 0-1;
 *   which 'all'|'alt'|'backbeat'|'one' (which beats click: 'alt' is every other beat from beat one, 1 and 3 in four);
 *   every 1-16 (beat one: once every N bars);
 *   where 'on'|'and'|'e'|'a'|'mid'|'last' (where in the beat: on it, a sixteenth either side of the "and", or a triplet's middle or last);
 *   gap {on, off} bars of click, then bars of silence;
 *   mute null | {kind:'random', share 0-100, keepOne, wholeBars}          Random mute
 *             | {kind:'gradual', to 0-100, over (bars), keepOne, wholeBars} Gradual mute
 *   clickUp null | {by (bpm, minus comes down), every (bars), stopAt (bpm or null), ladder}   Click up
 *   countIn 0-2 bars;
 *   groove null | {kind:'feel', feel, groove 0-2, kit}      the house drummer (4/4)
 *               | {kind:'pattern', id, kit}                 a written pattern on one of the house kits
 *               | {kind:'kit', id}                          a written pattern on Kyle's kit
 *               | {kind:'loop', url, bpm, meter, bars}      a recorded loop from the Shelf
 *   offsetMs: the display held back, for Bluetooth headphones.
 * Settings from before 1.8.0 (mode, random, wean, trainer) are still understood.
 *
 * For testing: create({context, manual, random}) takes an audio context to
 * play into (an OfflineAudioContext, or a bare {currentTime, sampleRate} to
 * test the counting with no sound at all), a flag to say "no timers, I will
 * call m.pump(untilSeconds) myself", and a random number maker.
 * m.ontrace = fn(e) hears of everything as it is scheduled.
 *
 * Also: LBSMetronome.setup({base, version})  where he-packs.js, he-sounds.js, he-kit.js and sounds/ are
 *       LBSMetronome.upgrade(saved)          the Shed's saved settings, brought up to date
 *       LBSMetronome.tap(memory, now)        tap tempo
 *       LBSMetronome.draw(sound, level, rate) one drawn click, as samples
 */
(function (root) {
	'use strict';

	var LEVELS = ['accent', 'normal', 'soft', 'mute'];
	/*
	 * THIN THE CLICK. A click on every beat shows where you rush or drag, but it does the timekeeping for
	 * you. Taking it away by stages hands the job back: every beat, every other beat, beat one, then beat
	 * one of every second bar, third, fourth, eighth and sixteenth, all at the same tempo. (After Molly
	 * Gebrian, Learn Faster, Perform Better, 2024, chapter 14.)
	 */
	var THIN = [
		{ which: 'all', every: 1 }, { which: 'alt', every: 1 }, { which: 'one', every: 1 }, { which: 'one', every: 2 },
		{ which: 'one', every: 3 }, { which: 'one', every: 4 }, { which: 'one', every: 8 }, { which: 'one', every: 16 }
	];
	/*
	 * INTERLEAVED CLICKING UP (Molly Gebrian's method, Learn Faster, Perform Better, chapter 16). A passage is
	 * cut into chunks. Each step adds a chunk, and within a step the tempo climbs from the start to the goal.
	 * At each tempo you play either the new chunk alone or a run of chunks ending with it, so the older a
	 * chunk is the less often it comes round. Each tempo is played once.
	 *   interleave({chunks, start, goal, by, back}) -> [{step, tempo, from, to}]   (chunks numbered from 1)
	 * Her figure, as a rule: at step n, with the tempo k steps above the start, n = 1 plays chunk 1; odd k
	 * plays chunk n alone; even k plays from chunk (1 if m is 0, else n - m) to n, where m = (k / 2) mod (n - 1).
	 * Every step ends on the whole run so far at the goal, as her text says (the figure's last step stops
	 * short of that). "back" builds from the last chunk instead, for a passage whose end is the hard part.
	 */
	function interleave(o) {
		var n = clamp(Math.round(+o.chunks || 4), 1, 16), by = clamp(Math.abs(Math.round(+o.by || 5)), 1, 60);
		var start = clamp(Math.round(+o.start || 60), BOTTOM, TOP), goal = clamp(Math.round(+o.goal || start * 2), start, TOP);
		var tempos = [], t, out = [];
		for (t = start; t < goal; t += by) { tempos.push(t); }
		tempos.push(goal);
		for (var step = 1; step <= n; step++) {
			var last = null;
			for (var k = 0; k < tempos.length; k++) {
				var from = step;
				if (step === 1) { from = 1; }
				else if (k % 2 === 0) { var m = (k / 2) % (step - 1); from = m === 0 ? 1 : step - m; }
				last = { step: step, tempo: tempos[k], from: from, to: step };
				out.push(last);
			}
			if (last.from !== 1) { out.push({ step: step, tempo: goal, from: 1, to: step }); }
		}
		// from the end: chunk i of the build is chunk n + 1 - i of the passage, and a run is still played forwards
		if (o.back) { out.forEach(function (r) { var a = n + 1 - r.to, b = n + 1 - r.from; r.from = a; r.to = b; }); }
		return out;
	}
	/*
	 * A SETUP AS A LINK. link(saved) gives a short string to put in an address (?m=...), and unlink(string)
	 * gives back saved settings, brought through upgrade() so that nothing but what the metronome
	 * understands gets in. The tempo and what the click does travel; the sound, the volumes and the
	 * player's own setups stay at home.
	 */
	var LINK_KEYS = ['bpm', 'meter', 'sub', 'swing', 'accents', 'which', 'every', 'where', 'gap', 'random', 'gradual', 'up', 'thin', 'inter', 'countIn', 'groove'];
	function link(saved) {
		var o = {}, base = upgrade({ v: 2 });
		LINK_KEYS.forEach(function (k) {
			var v = saved[k];
			if (v === undefined || v === null || JSON.stringify(v) === JSON.stringify(base[k])) { return; }
			// (a recorded loop from the Shelf is a member's own: only the house drummer and the written patterns travel)
			if (k === 'groove' && !(v.kind === 'feel' || (v.id && !v.url))) { return; }
			o[k] = v;
		});
		o.bpm = saved.bpm;
		var text = JSON.stringify(o);
		var b64 = typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(text))) : Buffer.from(text, 'utf8').toString('base64');
		return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
	}
	function unlink(code) {
		if (typeof code !== 'string' || !/^[A-Za-z0-9_-]{4,3000}$/.test(code)) { return null; }
		try {
			var b64 = code.replace(/-/g, '+').replace(/_/g, '/');
			var text = typeof atob === 'function' ? decodeURIComponent(escape(atob(b64))) : Buffer.from(b64, 'base64').toString('utf8');
			var o = JSON.parse(text), clean = { v: 2 };
			if (!o || typeof o !== 'object' || Array.isArray(o)) { return null; }
			LINK_KEYS.forEach(function (k) { if (o[k] !== undefined) { clean[k] = o[k]; } });
			if (clean.groove && !(typeof clean.groove === 'object' && (clean.groove.kind === 'feel' || (clean.groove.id && !clean.groove.url)))) { delete clean.groove; }
			if (clean.accents && !(Array.isArray(clean.accents) && clean.accents.length <= 16 && clean.accents.every(function (a) { return LEVELS.indexOf(a) !== -1; }))) { delete clean.accents; }
			if (clean.meter !== undefined && !(typeof clean.meter === 'string' && /^\d{1,2}\/\d{1,2}(:[0-9+]{1,12})?$/.test(clean.meter))) { delete clean.meter; }
			var out = upgrade(clean);
			delete out.setups;
			return out;
		} catch (e) { return null; }
	}
	/*
	 * COUNT IT OFF. The player is given a tempo and taps four beats with nothing sounding, as if counting a
	 * band in. counted(times in ms, target) says what they tapped: the tempo (from the middle one of the
	 * three gaps, so one ragged tap doesn't decide it), how far off the target that is in bpm and in per
	 * cent, and how even the three gaps were.
	 */
	function counted(times, target) {
		if (!times || times.length < 4) { return null; }
		var t = times.slice(-4), gaps = [t[1] - t[0], t[2] - t[1], t[3] - t[2]].sort(function (a, b) { return a - b; });
		if (gaps[0] <= 0) { return null; }
		var bpm = 60000 / gaps[1], off = bpm - target;
		return { bpm: Math.round(bpm), off: Math.round(off), percent: Math.round(off / target * 100), spread: Math.round((gaps[2] - gaps[0]) / gaps[1] * 100),
			verdict: Math.abs(off / target) <= 0.03 ? 'on' : off > 0 ? 'fast' : 'slow' };
	}
	// Where Click up is heading: the tempo asked for, or 5% past it ("so the goal feels manageable under pressure").
	function upStop(up) {
		if (!up || up.stopAt === '' || up.stopAt == null || !+up.stopAt) { return null; }
		var goal = +up.stopAt, dir = +up.by < 0 ? -1 : 1;
		return clamp(Math.round(up.past ? goal * (1 + 0.05 * dir) : goal), BOTTOM, TOP);
	}
	// The next tempo when the player steps Click up by hand: one step on (or back), never past where it is heading.
	function upNext(bpm, up, back) {
		var by = +up.by || 5, to = bpm + (back ? -by : by), stop = upStop(up);
		if (stop != null && !back && (to - stop) * (by < 0 ? -1 : 1) > 0) { to = stop; }
		return clamp(Math.round(to), BOTTOM, TOP);
	}
	var TOP = 300, BOTTOM = 20;
	var SOUNDS = { woodblock: 'Woodblock', claves: 'Claves', cowbell: 'Cowbell', rim: 'Cross stick', hat: 'Hi hat', beep: 'Beep', click: 'Click' };
	var RECORDED = { woodblock: 1, claves: 1, cowbell: 1, rim: 1, hat: 1 };
	// build_packs.py cuts every recording 52 samples (at 44.1 kHz) before it speaks.
	var LEAD = 52 / 44100;
	/*
	 * LEVELS, all set by measurement (agents/b: levels.py, measure_levels.py, kit_measure.py).
	 * "How loud" is what an impulse sound level meter would show (A-weighted, 35 ms): for a short sharp
	 * sound that is nearer to what the ear makes of it than its tallest sample is.
	 *   Every click sound is equally loud at the same volume setting: an accent 2 dB over a beat, a beat
	 *   3 dB over a subdivision. The recordings carry their own figure in the pack; DRAWN_DB is the same
	 *   for the drawn ones. CLICK_GAIN then places the lot so the tallest accent stands at about 0.75.
	 *   KIT_DB brings each kit's loudest moment (as a rule its backbeat) to 3 dB under an accented click
	 *   at the same volume setting, which leaves the click on top and the two room to land together.
	 *   ROOM_TRIM: he-kit.js draws a kit's room at half the sample rate, which comes out 2.4 dB louder
	 *   than the same room live. This makes it up.
	 *   STAND_IN_DB does the same for the synthesised drums a pattern plays until its kit arrives.
	 */
	var CLICK_GAIN = 0.75;
	var DRAWN_DB = {
		woodblock: [-5.9, -9.4, -12.8], claves: [-9.4, -11.7, -15.2], cowbell: [-6, -6.7, -8.6], rim: [-2.6, -4.7, -8.6], hat: [-0.8, -2.5, -4.5], beep: [-7.6, -8.8, -10.8], click: [0.1, -1.7, -5.2]
	};
	var KIT_DB = { studio: -5.8, tight: -6.6, rock: -4.5, brushes: -4.8, lofi: -8.4, '808': -5.2, '909': -5.6, hand: -3 };
	var ROOM_TRIM = 1.32;
	var STAND_IN_DB = -5;

	/* ------------------------------------------------------------------ *
	 * Written patterns: steps per beat, then one string per instrument
	 * covering all bars. X accent, x normal, g ghost, . rest. They cover
	 * the time signatures the house drummer's feels do not.
	 * ------------------------------------------------------------------ */
	var GROOVES = {
		rock:    { name: 'Rock, straight 8ths', meter: [4, 4], spb: 2, bars: 1, parts: { hat: 'XxXxXxXx', snare: '..X...X.', kick: 'X...XX..' } },
		pop:     { name: 'Pop, 16th hats', meter: [4, 4], spb: 4, bars: 1, parts: { hat: 'XxxxXxxxXxxxXxxx', snare: '....X.......X...', kick: 'X.....x.X.......' } },
		funk:    { name: 'Funk, 16ths', meter: [4, 4], spb: 4, bars: 1, parts: { hat: 'XxXxXxXxXxXxXxXx', snare: '....X..g.g..X..g', kick: 'X..x..X...X..x..' } },
		motown:  { name: 'Motown and soul', meter: [4, 4], spb: 4, bars: 1, parts: { hat: 'X.x.X.x.X.x.X.x.', snare: '....X.......X...', kick: 'X.....xX..x.....' } },
		shuffle: { name: 'Shuffle', meter: [4, 4], spb: 3, bars: 1, parts: { hat: 'X.xX.xX.xX.x', snare: '...X.....X..', kick: 'X.....X.....' } },
		half:    { name: 'Half time', meter: [4, 4], spb: 4, bars: 1, parts: { hat: 'X.x.X.x.X.x.X.x.', snare: '........X.......', kick: 'X.....x.......x.' } },
		reggae:  { name: 'Reggae one drop', meter: [4, 4], spb: 3, bars: 1, parts: { hat: 'x.xx.xx.xx.x', cross: '......X.....', kick: '......X.....' } },
		swing:   { name: 'Swing', meter: [4, 4], spb: 3, bars: 1, parts: { ride: 'X..x.xX..x.x', hatPedal: '...x.....x..', kick: 'g..g..g..g..' } },
		bossa:   { name: 'Bossa nova', meter: [4, 4], spb: 2, bars: 2, parts: { hat: 'xxxxxxxxxxxxxxxx', cross: 'x..x..x.....x.x.', kick: 'X..xX..xX..xX..x' } },
		sixeight:{ name: 'Slow 6/8', meter: [6, 8], spb: 3, bars: 1, parts: { hat: 'Xxxxxx', snare: '...X..', kick: 'X.....' } },
		seven:   { name: 'Seven (2+2+3)', meter: [7, 8], groups: [2, 2, 3], spb: 1, bars: 1, parts: { hat: 'XxXxXxx', snare: '..X....', kick: 'X...X..' } }
	};
	var KIT_NAMES = { kick: 'kick', snare: 'snare', snareGhost: 'snare-ghost', hat: 'hat-closed', hatOpen: 'hat-open', hatPedal: 'hat-pedal', ride: 'ride', cross: 'cross-stick' };
	// A pattern's instruments, as the house kits name their pieces.
	var PIECE = { kick: 'k', snare: 's', hat: 'h', hatOpen: 'o', hatPedal: 'p', ride: 'R', cross: 'x' };

	function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
	function gainOf(db) { return Math.pow(10, db / 20); }

	/* ------------------------------------------------------------------ *
	 * The house band's files, fetched when something first needs them.
	 * ------------------------------------------------------------------ */
	var cfg = { base: '', version: '' };
	var fetching = {};
	function script(name) {
		if (!fetching[name]) {
			fetching[name] = new Promise(function (resolve, reject) {
				var doc = root.document;
				if (!doc || !cfg.base) { reject(new Error('no-address')); return; }
				var el = doc.createElement('script');
				el.src = cfg.base + name + '.js' + (cfg.version ? '?ver=' + encodeURIComponent(cfg.version) : '');
				el.async = false; // each needs the one before it, so they run in the order they were asked for
				el.onload = function () { resolve(); };
				el.onerror = function () { delete fetching[name]; reject(new Error('no-script')); };
				doc.head.appendChild(el);
			});
		}
		return fetching[name];
	}
	/* A promise of HE (the packs' index and the tool box; the drummers too if asked). */
	function band(withKit) {
		var HE = root.HE, jobs = [];
		if (!(HE && HE.PACKS)) { jobs.push(script('he-packs')); }
		if (!(HE && HE.sounds)) { jobs.push(script('he-sounds')); }
		if (withKit && !(HE && HE.kit)) { jobs.push(script('he-kit')); }
		return Promise.all(jobs).then(function () {
			if (cfg.base && jobs.length) { root.HE.sounds.base = cfg.base + 'sounds/'; root.HE.sounds.version = cfg.version; }
			return root.HE;
		});
	}
	/* What rate will the phone play at? Nobody can say before the first tap, so the last one seen is remembered. */
	var hinted = 0;
	function hintRate() {
		if (!hinted) {
			try { hinted = +root.localStorage.getItem('lbs-rate'); } catch (e) { hinted = 0; }
			if (!(hinted >= 8000 && hinted <= 192000)) { hinted = 48000; }
		}
		return hinted;
	}

	/* ------------------------------------------------------------------ *
	 * Drawn clicks: made here, a sample at a time, so they start on the
	 * instant and need nothing fetched. level: 0 accent, 1 beat, 2 subdivision.
	 * ------------------------------------------------------------------ */
	function noiseMaker(seed) {
		var s = seed;
		return function () { s = (s * 16807) % 2147483647; return s / 1073741823.5 - 1; };
	}
	// One second-order filter (the "cookbook" kind), run over samples where they lie.
	function filter(d, kind, freq, q, rate) {
		var w = 2 * Math.PI * freq / rate, cs = Math.cos(w), al = Math.sin(w) / (2 * q);
		var a0 = 1 + al, a1 = -2 * cs, a2 = 1 - al, b0, b1, b2;
		if (kind === 'high') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; }
		else if (kind === 'low') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; }
		else { b0 = al; b1 = 0; b2 = -al; }
		var x1 = 0, x2 = 0, y1 = 0, y2 = 0;
		for (var i = 0; i < d.length; i++) {
			var x = d[i], y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
			x2 = x1; x1 = x; y2 = y1; y1 = y; d[i] = y;
		}
	}
	// A struck note: it starts at once and dies away. tau is how long it takes to fall to about a third.
	function ping(d, rate, freq, amp, tau, wave) {
		var w = 2 * Math.PI * freq / rate;
		for (var i = 0; i < d.length; i++) {
			var s = Math.sin(w * i), v = wave === 'square' ? (s >= 0 ? 1 : -1) : wave === 'tri' ? 2 / Math.PI * Math.asin(s) : s;
			d[i] += amp * v * Math.exp(-i / (tau * rate));
		}
	}
	// A burst of filtered noise.
	function hiss(d, rate, amp, tau, seed, kind, freq, q) {
		var n = new Float32Array(d.length), r = noiseMaker(seed), i;
		for (i = 0; i < n.length; i++) { n[i] = r() * Math.exp(-i / (tau * rate)); }
		filter(n, kind, freq, q, rate);
		for (i = 0; i < n.length; i++) { d[i] += amp * n[i]; }
	}
	// Seconds of each, then how it is made. The pitches of the stand ins are those of the recordings they stand in for.
	var DRAWN = {
		beep: [0.075, function (d, r, l) { ping(d, r, [1568, 1046.5, 784][l], 1, 0.013); }],
		click: [0.025, function (d, r, l) { hiss(d, r, 0.35, 0.0006, 11, 'high', 1500, 0.7); ping(d, r, [3300, 2500, 1900][l], 1, 0.0026); }],
		woodblock: [0.1, function (d, r, l) { var f = [2865, 1372, 1372][l]; ping(d, r, f, 1, [0.011, 0.017, 0.02][l]); ping(d, r, f * 2.7, 0.2, 0.004); hiss(d, r, 0.3, 0.002, 3, 'band', f * 1.6, 2); }],
		claves: [0.14, function (d, r, l) { var f = [2350, 2000, 2000][l]; ping(d, r, f, 1, [0.022, 0.024, 0.03][l]); ping(d, r, f * 2.9, 0.15, 0.003); }],
		cowbell: [0.22, function (d, r, l) { var f = [688, 452, 452][l], t = [0.05, 0.05, 0.025][l]; ping(d, r, f, 0.5, t, 'square'); ping(d, r, f * 1.48, 0.5, t * 0.8, 'square'); filter(d, 'band', f * 1.9, 1.4, r); }],
		rim: [0.07, function (d, r, l) { hiss(d, r, 1, [0.011, 0.009, 0.007][l], 5, 'band', [2900, 2500, 2200][l], 3); ping(d, r, [1240, 1240, 1320][l], 0.5, 0.008, 'tri'); }],
		hat: [0.14, function (d, r, l) { hiss(d, r, 1, [0.03, 0.02, 0.012][l], 9, 'high', [7500, 7000, 6000][l], 0.8); }]
	};
	/* One drawn click as samples, its tallest sample at 1. */
	function draw(sound, level, rate) {
		var spec = DRAWN[sound] || DRAWN.beep, n = Math.ceil(spec[0] * rate), d = new Float32Array(n), i, top = 0;
		spec[1](d, rate, level);
		// its last two thousandths of a second fade to nothing, so it never ends with a tick of its own
		var fade = Math.min(n, Math.floor(0.002 * rate));
		for (i = 0; i < fade; i++) { d[n - 1 - i] *= i / fade; }
		for (i = 0; i < n; i++) { var a = d[i] < 0 ? -d[i] : d[i]; if (a > top) { top = a; } }
		if (top > 0) { for (i = 0; i < n; i++) { d[i] /= top; } }
		return d;
	}

	/* ------------------------------------------------------------------ *
	 * Synthesised drums: what a written pattern plays until its kit is in.
	 * ------------------------------------------------------------------ */
	function render(rate, secs, build) {
		var OAC = root.OfflineAudioContext || root.webkitOfflineAudioContext;
		var o = new OAC(1, Math.ceil(secs * rate), rate);
		build(o);
		return new Promise(function (resolve, reject) {
			o.oncomplete = function (e) { resolve(e.renderedBuffer); };
			var p = o.startRendering();
			if (p && p.then) { p.then(resolve, reject); }
		});
	}
	function noise(o, secs, seed) {
		var b = o.createBuffer(1, Math.ceil(secs * o.sampleRate), o.sampleRate), d = b.getChannelData(0), r = noiseMaker(seed || 7);
		for (var i = 0; i < d.length; i++) { d[i] = r(); }
		var src = o.createBufferSource(); src.buffer = b; return src;
	}
	function env(param, t0, peak, attack, decay) {
		param.setValueAtTime(0.0001, t0);
		param.exponentialRampToValueAtTime(peak, t0 + attack);
		param.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
	}
	function tone(o, type, f, peak, attack, decay, dest) {
		var osc = o.createOscillator(), g = o.createGain();
		osc.type = type; osc.frequency.value = f;
		env(g.gain, 0, peak, attack, decay);
		osc.connect(g); g.connect(dest || o.destination);
		osc.start(0); osc.stop(attack + decay + 0.02);
		return osc;
	}
	function filtered(o, type, f, q, peak, attack, decay, seed, dest) {
		var n = noise(o, attack + decay + 0.05, seed), fl = o.createBiquadFilter(), g = o.createGain();
		fl.type = type; fl.frequency.value = f; fl.Q.value = q;
		env(g.gain, 0, peak, attack, decay);
		n.connect(fl); fl.connect(g); g.connect(dest || o.destination);
		n.start(0);
	}
	var DRUMS = {
		kick: function (o, v) {
			var osc = o.createOscillator(), g = o.createGain();
			osc.frequency.setValueAtTime(120, 0); osc.frequency.exponentialRampToValueAtTime(46, 0.12);
			env(g.gain, 0, 0.95 * v, 0.002, 0.32);
			osc.connect(g); g.connect(o.destination); osc.start(0); osc.stop(0.4);
			filtered(o, 'lowpass', 1200, 0.7, 0.2 * v, 0.0005, 0.01, 13);
		},
		snare: function (o, v) { tone(o, 'triangle', 190, 0.5 * v, 0.001, 0.09); filtered(o, 'bandpass', 3000, 0.7, 0.75 * v, 0.001, 0.16, 17); filtered(o, 'highpass', 6000, 0.7, 0.25 * v, 0.001, 0.1, 19); },
		hat: function (o, v) { filtered(o, 'highpass', 7500, 0.9, 0.5 * v, 0.0005, 0.045, 23); },
		hatOpen: function (o, v) { filtered(o, 'highpass', 7000, 0.9, 0.45 * v, 0.001, 0.32, 29); },
		hatPedal: function (o, v) { filtered(o, 'highpass', 6000, 1.2, 0.35 * v, 0.001, 0.035, 31); },
		ride: function (o, v) {
			var hp = o.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3500; hp.connect(o.destination);
			[3.1, 4.2, 5.33, 6.9].forEach(function (mm, i) { tone(o, 'square', 311 * mm, 0.06 * v, 0.001, 0.9 - i * 0.12, hp); });
			filtered(o, 'highpass', 8000, 0.7, 0.18 * v, 0.001, 0.5, 37);
		},
		cross: function (o, v) { tone(o, 'sine', 1150, 0.55 * v, 0.0005, 0.035); filtered(o, 'bandpass', 2400, 4, 0.35 * v, 0.0005, 0.02, 41); }
	};
	DRUMS.snareGhost = function (o, v) { DRUMS.snare(o, v * 0.35); };

	/* ------------------------------------------------------------------ *
	 * Settings.
	 * ------------------------------------------------------------------ */

	/* Settings as they were written before 1.8.0, said the new way. Only what was passed is touched. */
	function modern(o) {
		if (!o) { return {}; }
		var out = Object.assign({}, o), tr = o.trainer;
		if ('mode' in o && !('which' in o)) {
			out.which = o.mode === 'backbeat' ? 'backbeat' : o.mode === 'downbeat' ? 'one' : 'all';
			if (!('where' in o)) { out.where = o.mode === 'offbeat' ? 'and' : 'on'; }
		}
		if (!('mute' in o) && ('random' in o || 'wean' in o)) {
			// "random" was a share from 0 to 0.9; "wean" stepped the click away over about 48 bars
			out.mute = +o.random > 0 ? { kind: 'random', share: Math.round(o.random * 100) } : o.wean ? { kind: 'gradual', to: 75, over: 48 } : null;
		}
		if (!('clickUp' in o) && 'trainer' in o) {
			// the speed trainer ran from one tempo to another; Click up starts from the tempo showing
			out.clickUp = tr && tr.on ? { by: (+tr.to >= +tr.from ? 1 : -1) * (+tr.step || 4), every: +tr.every || 4, stopAt: +tr.to || null, ladder: +tr.back > 0 } : null;
			if (tr && tr.on && +tr.from) { out.bpm = +tr.from; }
		}
		if (o.groove && o.groove.kind === 'synth') { out.groove = { kind: 'pattern', id: o.groove.id, kit: 'studio' }; }
		delete out.mode; delete out.random; delete out.wean; delete out.trainer;
		return out;
	}
	function muteOf(mu) {
		if (!mu || (mu.kind !== 'random' && mu.kind !== 'gradual')) { return null; }
		var out = { kind: mu.kind, keepOne: !!mu.keepOne, wholeBars: !!mu.wholeBars };
		if (mu.kind === 'random') { out.share = clamp(Math.round(+mu.share || 0), 0, 100); }
		else { out.to = clamp(Math.round(mu.to == null ? 75 : +mu.to || 0), 0, 100); out.over = clamp(Math.round(+mu.over || 32), 1, 999); }
		return out;
	}
	function upOf(up) {
		if (!up) { return null; }
		var by = clamp(Math.round(+up.by || 0), -60, 60);
		if (!by) { return null; }
		var stop = up.stopAt === '' || up.stopAt == null || !+up.stopAt ? null : clamp(Math.round(+up.stopAt), BOTTOM, TOP);
		return { by: by, every: clamp(Math.round(+up.every || 4), 1, 64), stopAt: stop, ladder: !!up.ladder };
	}
	function defaults(o) {
		o = o || {};
		var meter = Array.isArray(o.meter) && o.meter.length === 2 ? [clamp(+o.meter[0] | 0, 1, 16), [2, 4, 8, 16].indexOf(+o.meter[1]) >= 0 ? +o.meter[1] : 4] : [4, 4];
		var out = {
			bpm: clamp(+o.bpm || 80, BOTTOM, TOP),
			meter: meter,
			groups: Array.isArray(o.groups) ? o.groups.map(function (g) { return clamp(g | 0, 1, 9); }) : null,
			sub: clamp(+o.sub || 1, 1, 6) | 0,
			swing: clamp(+o.swing || 0, 0, 1),
			sound: SOUNDS[o.sound] ? o.sound : 'woodblock',
			vol: Object.assign({ accent: 1, beat: 0.8, sub: 0.5, groove: 0.8 }, o.vol || {}),
			which: ['all', 'alt', 'backbeat', 'one'].indexOf(o.which) >= 0 ? o.which : 'all',
			every: clamp(+o.every || 1, 1, 16) | 0,
			where: ['on', 'and', 'e', 'a', 'mid', 'last'].indexOf(o.where) >= 0 ? o.where : 'on',
			gap: o.gap && +o.gap.on > 0 && +o.gap.off > 0 ? { on: clamp(o.gap.on | 0, 1, 16), off: clamp(o.gap.off | 0, 1, 16) } : null,
			mute: muteOf(o.mute),
			clickUp: upOf(o.clickUp),
			countIn: clamp(+o.countIn || 0, 0, 2) | 0,
			groove: o.groove || null,
			offsetMs: clamp(+o.offsetMs || 0, 0, 500)
		};
		out.beats = structure(out);
		var acc = Array.isArray(o.accents) ? o.accents : [];
		out.accents = out.beats.map(function (b, i) { return LEVELS.indexOf(acc[i]) >= 0 ? acc[i] : (i === 0 ? 'accent' : 'normal'); });
		return out;
	}

	/*
	 * The Shed keeps the metronome's settings as the screen shows them. This
	 * brings a saved copy up to date: anything missing gets its usual value,
	 * and what 1.7.0 saved (mode, random, wean, trainer) becomes Random mute,
	 * Gradual mute, Click up and the two "where the click falls" choices.
	 */
	function upgrade(s) {
		s = s || {};
		var old = s.v !== 2, tr = s.trainer || {};
		var out = {
			v: 2,
			bpm: clamp(Math.round(+s.bpm || 80), BOTTOM, TOP), meter: s.meter || '4/4', sub: +s.sub || 1, swing: +s.swing || 0,
			accents: Array.isArray(s.accents) ? s.accents : null,
			sound: SOUNDS[s.sound] ? s.sound : 'woodblock',
			vol: Object.assign({ accent: 1, beat: 0.8, sub: 0.5, groove: 0.8 }, s.vol || {}),
			which: 'all', every: clamp(+s.every || 1, 1, 16), where: 'on', gap: typeof s.gap === 'string' ? s.gap : '0',
			random: { on: false, share: 30, keepOne: false, bars: false },
			gradual: { on: false, to: 75, over: 32, keepOne: false, bars: false },
			// ("ready": the tempo moves when the player says so, not by the clock. "past": aim 5% past the tempo asked for.)
			up: { on: false, by: 4, every: 4, stopAt: '', ladder: false, ready: false, past: false },
			// Thin the click: a walk through THIN, a stage at a time
			thin: { on: false, stage: 0 },
			// Count it off: tap a tempo cold, between two tempos
			count: { on: false, from: 60, to: 140 },
			// Interleaved clicking up: the passage, and how far through the schedule the player is
			inter: { on: false, chunks: 4, beats: 4, start: 60, goal: 120, by: 5, back: false, at: 0 },
			countIn: s.countIn ? 1 : 0, groove: s.groove || null, offsetMs: +s.offsetMs || 0,
			hideSilent: !!s.hideSilent, flash: !!s.flash, vibrate: !!s.vibrate,
			setups: Array.isArray(s.setups) ? s.setups : []
		};
		if (old) {
			var mode = s.mode || 'all';
			out.which = mode === 'backbeat' ? 'backbeat' : mode === 'downbeat' ? 'one' : 'all';
			out.where = mode === 'offbeat' ? 'and' : 'on';
			if (+s.random > 0) { out.random.on = true; out.random.share = clamp(Math.round(s.random * 100), 0, 100); }
			// "Wean me off" stepped the click away over about 48 bars: Gradual mute does the same job
			else if (s.wean) { out.gradual.on = true; out.gradual.over = 48; }
			if (s.trainer) {
				out.up.by = (+tr.to >= +tr.from ? 1 : -1) * clamp(Math.round(+tr.step || 4), 1, 40);
				out.up.every = clamp(Math.round(+tr.every || 4), 1, 64);
				out.up.stopAt = +tr.to ? clamp(Math.round(+tr.to), BOTTOM, TOP) : '';
				out.up.ladder = !!tr.ladder;
				// the speed trainer started from its own "from"; Click up starts from the tempo showing
				if (tr.on) { out.up.on = true; out.bpm = clamp(Math.round(+tr.from || out.bpm), BOTTOM, TOP); }
			}
			// a pattern was either on Kyle's kit or synthesised; now it names its kit
			if (out.groove && out.groove.kind === 'pattern') { out.groove = { kind: 'pattern', id: out.groove.id, kit: out.groove.kit === true ? 'kyle' : (typeof out.groove.kit === 'string' ? out.groove.kit : 'studio') }; }
		} else {
			if (['all', 'alt', 'backbeat', 'one'].indexOf(s.which) >= 0) { out.which = s.which; }
			if (s.inter && typeof s.inter === 'object') {
				var it = s.inter;
				out.inter = { on: !!it.on, chunks: clamp(Math.round(+it.chunks || 4), 2, 16), beats: clamp(Math.round(+it.beats || 4), 1, 32), start: clamp(Math.round(+it.start || 60), BOTTOM, TOP),
					goal: clamp(Math.round(+it.goal || 120), BOTTOM, TOP), by: clamp(Math.abs(Math.round(+it.by || 5)), 1, 60), back: !!it.back, at: Math.max(0, Math.round(+it.at || 0)) };
				if (out.inter.goal < out.inter.start) { out.inter.goal = out.inter.start; }
			}
			if (s.count && typeof s.count === 'object') {
				var cf = clamp(Math.round(+s.count.from || 60), BOTTOM, TOP), ct = clamp(Math.round(+s.count.to || 140), BOTTOM, TOP);
				out.count = { on: !!s.count.on, from: Math.min(cf, ct), to: Math.max(cf, ct) };
			}
			if (s.thin && typeof s.thin === 'object') { out.thin = { on: !!s.thin.on, stage: clamp(Math.round(+s.thin.stage || 0), 0, THIN.length - 1) }; }
			if (['on', 'and', 'e', 'a', 'mid', 'last'].indexOf(s.where) >= 0) { out.where = s.where; }
			['random', 'gradual', 'up'].forEach(function (k) { if (s[k] && typeof s[k] === 'object') { Object.assign(out[k], s[k]); } });
		}
		return out;
	}

	/*
	 * The beats of one bar, each with its length in "tempo units" and its
	 * natural division. Simple meters (x/4, x/2): one click per beat.
	 * Compound (6/8, 9/8, 12/8): the dotted quarter is the beat, three eighths each.
	 * Odd x/8 (5/8, 7/8…): tempo counts eighths; beats are the groups (2+2+3).
	 */
	function structure(o) {
		var n = o.meter[0], d = o.meter[1];
		if (d === 8 && n % 3 === 0 && n > 3 && !o.groups) {
			var out = []; for (var i = 0; i < n / 3; i++) { out.push({ units: 1, div: 3 }); } return out;
		}
		if (d === 8 || d === 16) {
			var groups = o.groups && o.groups.reduce(function (a, b) { return a + b; }, 0) === n ? o.groups : defaultGroups(n);
			return groups.map(function (g) { return { units: g, div: g, eighths: true }; });
		}
		var list = []; for (var j = 0; j < n; j++) { list.push({ units: 1, div: 1 }); } return list;
	}
	function defaultGroups(n) {
		var g = []; var left = n;
		while (left > 0) { if (left === 3 || left === 5 && g.length) { g.push(3); left -= 3; } else if (left >= 2) { g.push(2); left -= 2; } else { g[g.length - 1]++; left = 0; } }
		return g;
	}

	/* Where the ticks of one beat fall, as fractions of the beat. */
	function subPositions(beat, sub, swing) {
		var count = beat.eighths ? (sub > 1 ? beat.div : 1) : (beat.div === 3 ? (sub >= 6 ? 6 : sub > 1 ? 3 : 1) : sub);
		var pos = [];
		for (var i = 0; i < count; i++) { pos.push(i / count); }
		if (swing > 0 && (count === 2 || count === 4)) {
			var pairs = count / 2, len = 1 / pairs;
			for (var k = 0; k < count; k++) {
				if (k % 2 === 1) { pos[k] = Math.floor(k / 2) * len + len * (0.5 + swing / 6); }
			}
		}
		return pos;
	}
	/*
	 * Where a click moved off the beat falls, as a fraction of the beat: the
	 * "and", the "e" and the "a" of a beat split in four, or the middle or the
	 * last of a beat split in three. A beat of three eighths (6/8) only has a
	 * middle and a last. Odd meters click on the beat.
	 */
	function placeOf(beat, where, swing) {
		if (where === 'on' || beat.eighths) { return 0; }
		if (beat.div === 3) { return where === 'last' || where === 'a' ? 2 / 3 : 1 / 3; }
		if (where === 'mid') { return 1 / 3; }
		if (where === 'last') { return 2 / 3; }
		if (where === 'and') { return subPositions(beat, 2, swing)[1]; }
		return subPositions(beat, 4, swing)[where === 'e' ? 1 : 3];
	}

	/*
	 * Tap tempo. memory is any object the caller keeps between taps; now is
	 * this tap in thousandths of a second. Gives the tempo, or 0 until there
	 * are two taps to go on. It settles on the last four, and one tap out of
	 * place does not throw it: a stray extra tap, or one missed, is read as
	 * what it is. Two alike in a row are taken as a new tempo (three, if the
	 * new tempo is exactly double, which two taps cannot tell from a stray).
	 */
	function tap(s, now) {
		var gap = s.last != null ? now - s.last : 0;
		s.last = now;
		if (!gap || gap > 2500) { s.gaps = []; s.raw = []; s.odd = 0; return 0; }
		function mean(a) { var t = 0; for (var i = 0; i < a.length; i++) { t += a[i]; } return t / a.length; }
		s.raw = (s.raw || []).concat(gap).slice(-3);
		var est = s.gaps && s.gaps.length ? mean(s.gaps.slice(-4)) : 0;
		if (est && Math.abs(gap - est) > est * 0.3) {
			if (s.raw.length === 3 && Math.max.apply(null, s.raw) <= Math.min.apply(null, s.raw) * 1.25) { s.gaps = s.raw.slice(); s.odd = 0; }   // three alike: that is the tempo now
			else if (s.odd && Math.abs(s.odd + gap - est) <= est * 0.15) { s.gaps.push(s.odd + gap); s.odd = 0; }   // a stray tap split one beat in two
			else if (Math.abs(gap / 2 - est) <= est * 0.15) { s.gaps.push(gap / 2); s.odd = 0; }                    // one tap was missed
			else if (s.odd && Math.abs(s.odd - gap) <= gap * 0.2) { s.gaps = [s.odd, gap]; s.odd = 0; }             // the same twice: a new tempo
			else { s.odd = gap; return clamp(60000 / est, BOTTOM, TOP); }
		} else { (s.gaps = s.gaps || []).push(gap); s.odd = 0; }
		return clamp(60000 / mean(s.gaps.slice(-4)), BOTTOM, TOP);
	}

	/*
	 * WHICH BEATS TO TAKE AWAY. Asked for 30%, a coin tossed on every beat
	 * could easily take 20 or 45 of the next hundred. This deals from a
	 * shuffled bag instead: the beats ahead are taken a handful at a time
	 * (four bars' worth, so every four bars carries its share), the number
	 * to mute in each handful is worked out from what was asked (carrying
	 * the fraction over, so the count never drifts), and which ones is left
	 * to chance. On top of that it watches the last hundred beats and will
	 * not let them stray more than four from what was asked of them, so
	 * "within five in any hundred" holds however the shuffles fall.
	 * The share asked can change from beat to beat (Gradual mute), and can be
	 * nothing for some beats (beat one, kept).
	 *   new Bag(rnd, size)   size() says how many beats the next handful is
	 *   next(ahead)   is this beat muted? ahead(k) is the share asked of the beat k from now (0 to 1)
	 *   again()       forget the handful in hand (the settings changed)
	 */
	function Bag(rnd, size) {
		var W = 100, SLACK = 4;
		var hist = [], asked = [], sumM = 0, sumP = 0;
		var plan = [], shares = [], at = 0, owed = 0;
		function deal(ahead) {
			var n = Math.max(1, size()), keys = [], total = 0, must = 0, can = 0, i;
			shares = [];
			for (i = 0; i < n; i++) {
				var p = clamp(ahead(i), 0, 1);
				shares.push(p); total += p;
				if (p >= 1) { must++; }
				if (p > 0) { can++; }
				// the usual way to pick by weight without picking twice: the highest of rnd^(1/weight) win
				keys.push([p >= 1 ? 2 : p <= 0 ? -1 : Math.pow(rnd(), 1 / p), i]);
			}
			var want = clamp(Math.round(owed + total), must, can);
			keys.sort(function (a, b) { return b[0] - a[0]; });
			plan = [];
			for (i = 0; i < n; i++) { plan.push(false); }
			for (i = 0; i < want; i++) { plan[keys[i][1]] = true; }
			at = 0;
		}
		this.next = function (ahead) {
			if (at >= plan.length) { deal(ahead); }
			var p = shares[at], x = plan[at], was = x, j;
			// the last hundred, with this one in: too many gone, or too few?
			var out = hist.length >= W ? 1 : 0;
			var gone = sumM - (out ? (hist[0] ? 1 : 0) : 0) + (x ? 1 : 0), want = sumP - (out ? asked[0] : 0) + p;
			if (x && gone - want > SLACK && p < 1) { x = false; }
			else if (!x && want - gone > SLACK && p > 0) { x = true; }
			if (x !== was) {
				// keep the handful's count: one that was going the other way, later on, swaps with this one
				for (j = at + 1; j < plan.length; j++) { if (plan[j] === x && shares[j] > 0 && shares[j] < 1) { plan[j] = was; break; } }
			}
			if (out) { sumM -= hist.shift() ? 1 : 0; sumP -= asked.shift(); }
			hist.push(x); asked.push(p); sumM += x ? 1 : 0; sumP += p;
			owed += p - (x ? 1 : 0);
			at++;
			return x;
		};
		this.again = function () { plan = []; shares = []; at = 0; owed = 0; };
	}

	/* A curve that leaves everything under 0.8 exactly alone and rounds off what is over, up to twice full level. */
	function softLimit() {
		var n = 8193, c = new Float32Array(n);
		for (var i = 0; i < n; i++) {
			var u = (i / (n - 1) * 2 - 1) * 2, a = Math.abs(u);
			var y = a <= 0.8 ? a : 0.8 + 0.2 * Math.tanh((a - 0.8) / 0.2);
			c[i] = u < 0 ? -y : y;
		}
		return c;
	}

	/* How long a compressor holds sound back, in seconds: found out once for each sample rate. */
	var lagOf = {};
	function squashLag(rate) {
		if (lagOf[rate] === undefined) {
			lagOf[rate] = Math.floor(0.006 * rate) / rate; // what every browser has done so far; checked below
			try {
				render(rate, 0.03, function (o) {
					var b = o.createBuffer(1, 8, rate), s = o.createBufferSource(), c = o.createDynamicsCompressor();
					b.getChannelData(0)[0] = 0.5;
					s.buffer = b; s.connect(c); c.connect(o.destination); s.start(0);
				}).then(function (buf) {
					var d = buf.getChannelData(0);
					for (var i = 0; i < d.length; i++) { if (d[i] > 1e-6 || d[i] < -1e-6) { lagOf[rate] = i / rate; break; } }
				}, function () {});
			} catch (e) { /* the usual figure stands */ }
		}
		return lagOf[rate];
	}

	/* ------------------------------------------------------------------ */

	function create(env) {
		env = env || {};
		var m = { running: false, opts: defaults(), onbeat: null, onstate: null, ontrace: null, kitUrls: null };
		var rnd = env.random || Math.random;
		var ctx = null, sounding = false, master = null, clickBus = null, grooveBus = null, kitBus = null, loopBus = null;
		var live = [];                      // sounds handed to the clock that may not have finished: so Stop can stop them
		var clickSet = null;                // the three takes of the sound in use, ready to play
		var have = {}, asking = {}, fitting = {};   // packs in hand, packs asked for, packs being brought to the right rate
		var rigs = {}, building = {}, rigFailed = {};
		var drums = null, drumsFor = 0, kit = {}, loopBuf = null, loopKey = '', loopSrc = null, loopGain = null;
		var timer = null, worker = null, queue = [], raf = 0, wake = null, decoder = null;
		var st = null;

		function say(state) { if (typeof m.onstate === 'function') { m.onstate(state); } }
		function rate() { return ctx ? ctx.sampleRate : hintRate(); }
		// To the nearest whole sample.
		function snap(t) { var r = ctx.sampleRate; return Math.round(t * r) / r; }

		function ensure() {
			if (ctx) { return ctx; }
			if (env.context) { ctx = env.context; }
			else {
				// on an iPhone this lets the click sound with the silent switch on
				try { if (root.navigator && 'audioSession' in root.navigator) { root.navigator.audioSession.type = 'playback'; } } catch (e) { /* optional */ }
				var AC = root.AudioContext || root.webkitAudioContext;
				ctx = new AC({ latencyHint: 'interactive' });
				try { root.localStorage.setItem('lbs-rate', String(ctx.sampleRate)); } catch (e2) { /* only a hint */ }
			}
			sounding = typeof ctx.createBufferSource === 'function';
			if (!sounding) { return ctx; }
			// Everything meets at "master", then goes through a limiter that leaves ordinary levels untouched
			// and adds no delay: a compressor here would hold the click back by six thousandths of a second.
			var pre = ctx.createGain(), lim = ctx.createWaveShaper();
			pre.gain.value = 0.5; lim.curve = softLimit();
			master = ctx.createGain();
			master.connect(pre); pre.connect(lim); lim.connect(ctx.destination);
			clickBus = ctx.createGain(); grooveBus = ctx.createGain(); kitBus = ctx.createGain(); loopBus = ctx.createGain();
			clickBus.connect(master); grooveBus.connect(master); kitBus.connect(master); loopBus.connect(master);
			return ctx;
		}
		function makeBuffer(data, r) {
			var b = ctx.createBuffer(1, data.length, r);
			b.getChannelData(0).set(data);
			return b;
		}

		/* ---------------- sounds ---------------- */

		/* A pack, fetched once. Before the first tap there is no audio context to decode with, so a silent
		 * one is used, at the rate the phone played at last time. If that guess is wrong the pack still plays
		 * (the browser brings it to the right rate as it goes), and a copy at the right rate is made from it
		 * here and takes its place (fit): it is never fetched twice. */
		function pack(name) {
			var d = ctx && sounding && ctx.decodeAudioData ? ctx : decoder;
			if (!d) {
				var OAC = root.OfflineAudioContext || root.webkitOfflineAudioContext;
				if (!OAC) { return Promise.reject(new Error('no-audio')); }
				d = decoder = new OAC(1, 1, hintRate());
			}
			var key = name + '@' + d.sampleRate;
			if (!asking[key]) {
				asking[key] = band(false).then(function (HE) { return HE.sounds.load(name, d); }).then(function (p) {
					if (!have[name] || p.buffer.sampleRate === rate()) { arrived(name, p); }
					fit(name);
					return p;
				});
				asking[key].catch(function () { delete asking[key]; });
			}
			return asking[key];
		}
		function arrived(name, p) {
			have[name] = p;
			clickSet = null;
			// a kit already set up from an earlier copy is set up again from this one (it changes over on a bar line)
			Object.keys(rigs).forEach(function (k) { var r = rigs[k]; if (r.packs[name] && r.packs[name] !== p) { delete rigs[k]; rigFor(r.id).catch(function () {}); } });
			say('sounds');
		}
		/* A pack decoded at another rate than the one now playing, brought to it by drawing it through once. */
		function fit(name) {
			var p = have[name];
			if (!p || !ctx || !sounding || fitting[name] || p.buffer.sampleRate === ctx.sampleRate) { return; }
			fitting[name] = true;
			render(ctx.sampleRate, p.buffer.duration, function (o) {
				var src = o.createBufferSource();
				src.buffer = p.buffer; src.connect(o.destination); src.start(0);
			}).then(function (buf) {
				delete fitting[name];
				if (have[name] === p) { arrived(name, { name: p.name, buffer: buf, zero: p.zero, info: p.info }); }
			}, function () { delete fitting[name]; });
		}
		/* A pack to be going on with: the copy in hand if there is one (a better one is asked for behind it). */
		function packSoon(name) {
			return have[name] ? Promise.resolve(have[name]) : pack(name);
		}
		function inHand(id) {
			var k = root.HE && root.HE.kit && root.HE.kit.kit(id);
			return !!k && (!!k.drawn || k.packs.every(function (n) { return !!have[n]; }));
		}

		/* The three takes of the sound in use. Recorded if the pack is in, drawn if not. */
		function clicksNow() {
			var sound = m.opts.sound, p = RECORDED[sound] ? have.clicks : null;
			var rows = p && p.info.hits && p.info.hits[sound];
			var key = sound + (rows ? '|' + p.buffer.sampleRate : '|drawn');
			if (clickSet && clickSet.key === key) { return clickSet; }
			var takes = [], l;
			if (rows && rows.length >= 3) {
				var br = p.buffer.sampleRate, zero = Math.round(p.zero * br);
				for (l = 0; l < 3; l++) { takes.push({ buffer: p.buffer, at: (zero + Math.round(rows[l][0] * br)) / br, secs: rows[l][1], gain: gainOf(rows[l][2]), lead: LEAD }); }
			} else {
				for (l = 0; l < 3; l++) {
					var d = draw(sound, l, ctx.sampleRate);
					takes.push({ buffer: makeBuffer(d, ctx.sampleRate), at: 0, secs: d.length / ctx.sampleRate, gain: gainOf((DRAWN_DB[sound] || [0, 0, 0])[l]), lead: 0 });
				}
			}
			clickSet = { key: key, takes: takes, recorded: !!rows };
			return clickSet;
		}

		function loadDrums() {
			if (drums && drumsFor === rate()) { return Promise.resolve(drums); }
			var names = Object.keys(DRUMS), r = rate();
			return Promise.all(names.map(function (n) { return render(r, n === 'ride' ? 1.1 : 0.5, function (o) { DRUMS[n](o, 1); }); })).then(function (bufs) {
				drums = {}; drumsFor = r; names.forEach(function (n, i) { drums[n] = bufs[i]; }); return drums;
			});
		}
		/* Kyle's single hits, from the Shelf data: {instrument: {soft:[url], medium:[url], hard:[url]}} */
		function loadKit(parts) {
			if (!m.kitUrls) { return Promise.resolve(); }
			var jobs = [];
			Object.keys(parts).forEach(function (p) {
				var inst = KIT_NAMES[p], by = m.kitUrls[inst];
				if (!by || kit[inst]) { return; }
				kit[inst] = { soft: [], medium: [], hard: [], rr: 0 };
				Object.keys(by).forEach(function (layer) {
					by[layer].slice(0, 4).forEach(function (url) {
						jobs.push(fetch(url, { credentials: 'same-origin' }).then(function (r) { return r.arrayBuffer(); }).then(function (a) { return ctx.decodeAudioData(a); }).then(function (b) { kit[inst][layer].push(b); }, function () {}));
					});
				});
			});
			return Promise.all(jobs);
		}
		function loadLoop(g) {
			if (loopKey === g.url && loopBuf) { return Promise.resolve(loopBuf); }
			return fetch(g.url, { credentials: 'same-origin' }).then(function (r) { return r.arrayBuffer(); }).then(function (a) { return ctx.decodeAudioData(a); }).then(function (b) { loopBuf = b; loopKey = g.url; return b; });
		}

		/* ---------------- the house drummer's kit ---------------- */

		function kitId() {
			var g = m.opts.groove;
			return g && (g.kind === 'feel' || g.kind === 'pattern') ? (g.kit || 'studio') : '';
		}
		/*
		 * A kit set up to play: its pieces, a place for each from left to right, its room on a send and its
		 * colour over the lot, wired as he-kit.js draws them. A compressor in the colour holds the kit back
		 * a little, so the drums are started that much early ("lag") to land with the click.
		 */
		function buildRig(id, pieces, packs) {
			var K = root.HE.kit, S = root.HE.sounds, k = K.kit(id), col = k.colour || {};
			var r = { id: id, kit: k, pieces: pieces, packs: packs, made: {}, turns: {}, pans: {}, open: null, squash: false, rate: ctx.sampleRate };
			if (!sounding) { return r; } // a test of the counting, with no sound
			var sum = ctx.createGain(), verb = ctx.createConvolver(), wet = ctx.createGain(), chain = sum, out = ctx.createGain();
			r.bus = ctx.createGain();
			verb.buffer = S.room(ctx, { seconds: k.room[1], bright: 0.55, early: 0.6, seed: 11 });
			wet.gain.value = k.room[0] * 4 * ROOM_TRIM;
			r.bus.connect(sum); r.bus.connect(verb); verb.connect(wet); wet.connect(sum);
			function into(node) { chain.connect(node); chain = node; }
			if (col.low) { var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = col.low; into(hp); }
			if (col.high) { var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = col.high; lp.Q.value = 0.5; into(lp); }
			if (col.drive) { var sh = ctx.createWaveShaper(); sh.curve = K.curve(col.drive); into(sh); }
			if (col.squash && ctx.createDynamicsCompressor) {
				var comp = ctx.createDynamicsCompressor();
				comp.threshold.value = -14 - 10 * col.squash; comp.knee.value = 8; comp.ratio.value = 2 + 4 * col.squash;
				comp.attack.value = 0.012; comp.release.value = 0.14;
				into(comp);
				r.squash = true;
				squashLag(ctx.sampleRate);
			}
			out.gain.value = gainOf(KIT_DB[id] || 0);
			chain.connect(out); out.connect(kitBus);
			r.stereo = typeof ctx.createStereoPanner === 'function';
			return r;
		}
		/* A promise of the kit, once its sounds are in. Asked for again, it gives the same one. */
		function rigFor(id) {
			var key = id + '@' + rate();
			if (rigs[key]) { return Promise.resolve(rigs[key]); }
			if (!building[key]) {
				building[key] = band(true).then(function (HE) {
					var k = HE.kit.kit(id);
					if (!k) { throw new Error('no-kit'); }
					return Promise.all((k.drawn ? [] : k.packs).map(packSoon)).then(function () {
						var packs = {};
						(k.drawn ? [] : k.packs).forEach(function (n) { packs[n] = have[n]; });
						return HE.kit.pieces(id, packs, rate()).then(function (pieces) {
							delete rigFailed[id];
							// the wiring needs the audio context, so it waits for the first Start
							if (ctx && key === id + '@' + ctx.sampleRate) { rigs[key] = buildRig(id, pieces, packs); }
							delete building[key];
							say('sounds');
							return rigs[key] || null;
						});
					});
				});
				building[key].catch(function () { delete building[key]; rigFailed[id] = true; say('sounds'); });
			}
			return building[key];
		}
		function rigNow() {
			var id = kitId();
			return id && ctx ? rigs[id + '@' + ctx.sampleRate] || null : null;
		}
		function takesOf(r, track) {
			if (r.made[track] !== undefined) { return r.made[track]; }
			var raw = r.pieces(track), out = null;
			if (raw && raw.length) {
				out = raw.map(function (tk) {
					if (r.kit.drawn) { return { buffer: sounding ? makeBuffer(tk.pcm, r.rate) : null, at: 0, secs: tk.len / r.rate, level: tk.level, unit: tk.unit || 0, lead: 0 }; }
					var p = tk.tray ? r.packs.perc : r.packs[r.kit.packs[0]], br = p.buffer.sampleRate;
					return { buffer: p.buffer, at: tk.from / br, secs: tk.len / br, level: tk.level, unit: tk.unit || 0, tray: !!tk.tray, lead: LEAD };
				});
				out.top = -Infinity;
				out.forEach(function (tk) { if (tk.level > out.top) { out.top = tk.level; } });
			}
			r.made[track] = out;
			return out;
		}
		function panFor(r, track) {
			if (!r.pans[track]) {
				if (r.stereo) { var p = ctx.createStereoPanner(); p.pan.value = root.HE.kit.PAN[track] || 0; p.connect(r.bus); r.pans[track] = p; }
				else { r.pans[track] = r.bus; }
			}
			return r.pans[track];
		}
		/*
		 * One hit of the kit, as he-kit.js would lay it into a loop: the take nearest to how hard it is
		 * hit, the kit's own balance and tuning, its place from left to right. An open hi hat rings until
		 * the next hat closes it; the brush stir swells in and sinks away before the next beat.
		 * h: {track, vel}; when: the instant it is meant for; beat: one beat, in seconds.
		 */
		function kitHit(r, h, when, beat) {
			var K = root.HE.kit, k = r.kit, trim = k.trim || {};
			var track = r.pieces(h.track) ? h.track : (K.STAND_IN[h.track] && r.pieces(K.STAND_IN[h.track]) ? K.STAND_IN[h.track] : null);
			// whatever is still ringing from the same pair of cymbals stops as this one lands
			if (r.open && r.open.by.indexOf(h.track) !== -1 && when > r.open.when) {
				var f = Math.min(0.03, Math.max(0.002, when - r.open.when - 0.02));
				var shut = when - (r.squash ? squashLag(r.rate) : 0);
				if (sounding) { r.open.choke.gain.setValueAtTime(1, Math.max(0, shut - f)); r.open.choke.gain.linearRampToValueAtTime(0, Math.max(0.001, shut)); try { r.open.src.stop(shut + 0.01); } catch (e) { /* already stopped */ } }
				r.open = null;
			}
			if (!track) { return; }
			var takes = takesOf(r, track);
			if (!takes) { return; }
			var turn = r.turns[track] = (r.turns[track] || 0) + 1;
			var vel = h.vel + (track !== h.track ? -3 : 0);
			var pick = st && st.plan ? st.plan.rnd : rnd;
			var take, gain, speed = 1, from, secs, keep, at, R = r.rate, lag = r.squash ? squashLag(R) : 0;
			if (h.track === 'w') {
				take = takes[turn % takes.length];
				from = take.at + pick() * 0.12; secs = take.secs - 0.14;
				keep = Math.min(take.secs - 0.2, beat * 0.92);
				gain = gainOf(take.level + vel + (trim.w || 0));
			} else {
				take = K.choose(takes, takes.top + vel, turn);
				var want = takes.top + vel + (trim[track] || 0) + (take.tray ? K.TRAY[track] || 0 : 0);
				var tune = ((k.tune && (k.tune[track] !== undefined ? k.tune[track] : k.tune.all)) || 0) + (pick() - 0.5) * 0.12;
				speed = Math.pow(2, tune / 12);
				from = take.at; secs = take.secs;
				keep = take.secs / speed * ((k.len && k.len[track]) || 1);
				gain = gainOf(want - take.unit);
			}
			// on a whole sample, early by what the recording and the kit's compressor need
			var early = Math.round(take.lead * R) + Math.round(lag * R);
			at = (Math.round(when * R) - early) / R;
			if (m.ontrace) { m.ontrace({ kind: 'drum', t: when, at: at, on: at + early / R, track: h.track, played: track, gain: gain, bar: st ? st.bar : 0, beat: st ? st.beat : 0 }); }
			if (!sounding) { return; }
			at = Math.max(at, ctx.currentTime);
			var src = ctx.createBufferSource(), g = ctx.createGain(), last = g, full = secs / speed, end = at + Math.min(keep, full);
			src.buffer = take.buffer; src.playbackRate.value = speed;
			// a mono sound through a panner comes out 3 dB down in the middle: he-kit.js makes that up, so this does
			gain *= r.stereo ? Math.SQRT2 : 1;
			if (h.track === 'w') {
				g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(gain, at + 0.07); g.gain.setTargetAtTime(gain * 0.3, at + 0.07, beat * 0.28);
				last = ctx.createGain(); g.connect(last);
				last.gain.setValueAtTime(1, Math.max(at, end - 0.05)); last.gain.linearRampToValueAtTime(0, end);
			} else {
				g.gain.setValueAtTime(gain, at);
				if (keep < full - 0.001) { g.gain.setValueAtTime(gain, Math.max(at, end - 0.03)); g.gain.linearRampToValueAtTime(0, end); }
			}
			if (K.CHOKES[h.track]) {
				var choke = ctx.createGain(); last.connect(choke); last = choke;
				r.open = { choke: choke, src: src, when: when, by: K.CHOKES[h.track] };
			}
			src.connect(g); last.connect(panFor(r, h.track));
			src.start(at, from, secs);
			if (keep < full - 0.001 || h.track === 'w') { src.stop(end + 0.01); }
			live.push([src, end + 0.05]);
		}

		function play(buf, t, gain, bus, speed) {
			if (!buf || gain <= 0 || !sounding) { return; }
			var s = ctx.createBufferSource(), g = ctx.createGain();
			s.buffer = buf; g.gain.value = gain;
			if (speed) { s.playbackRate.value = speed; }
			s.connect(g); g.connect(bus); s.start(Math.max(snap(t), ctx.currentTime));
			live.push([s, t + buf.duration + 0.05]);
		}
		/* One click. t is the instant it is meant for: the recording starts a little before, so that it speaks then. */
		function click(lv, t, gain, tr) {
			var set = sounding ? clicksNow() : null, take = set ? set.takes[lv] : { lead: RECORDED[m.opts.sound] && have.clicks ? LEAD : 0, gain: 1 };
			var r = ctx.sampleRate, at = (Math.round(t * r) - Math.round(take.lead * r)) / r;
			if (m.ontrace) { tr.kind = 'click'; tr.t = t; tr.at = at; tr.on = at + Math.round(take.lead * r) / r; tr.lv = lv; tr.gain = gain; tr.recorded = !!(set && set.recorded); m.ontrace(tr); }
			if (!sounding || gain <= 0) { return; }
			var s = ctx.createBufferSource(), g = ctx.createGain();
			s.buffer = take.buffer; g.gain.value = gain * take.gain * CLICK_GAIN;
			s.connect(g); g.connect(clickBus);
			s.start(Math.max(at, ctx.currentTime), take.at, take.secs);
			live.push([s, at + take.secs + 0.05]);
		}
		/* A pattern's drum: Kyle's kit, a house kit, or the synthesised stand in until the kit is in. */
		function drumHit(part, ch, t, beat) {
			var g = m.opts.groove, v = ch === 'X' ? 1 : ch === 'g' ? 0.35 : 0.7;
			if (g.kind === 'kit') {
				var inst = KIT_NAMES[part], k = kit[inst];
				if (m.ontrace) { m.ontrace({ kind: 'drum', t: t, at: t, on: t, track: part, ch: ch }); }
				if (k) {
					var layer = ch === 'X' ? 'hard' : ch === 'g' ? 'soft' : 'medium';
					var pool = k[layer].length ? k[layer] : (k.medium.length ? k.medium : (k.hard.length ? k.hard : k.soft));
					if (pool.length) { play(pool[(k.rr++) % pool.length], t, m.opts.vol.groove * (layer === 'medium' || k[layer].length ? 1 : v), grooveBus); return; }
				}
			} else if (st.rig) {
				kitHit(st.rig, { track: PIECE[part], vel: ch === 'X' ? 0 : ch === 'g' ? (part === 'snare' ? -15 : -21) : -4.5 }, t, beat);
				return;
			} else if (m.ontrace) { m.ontrace({ kind: 'drum', t: t, at: snap(t), on: snap(t), track: part, ch: ch, standIn: true }); }
			if (!drums) { return; }
			play(part === 'snare' && ch === 'g' ? drums.snareGhost : drums[part], t, m.opts.vol.groove * v * gainOf(STAND_IN_DB), grooveBus);
		}

		/* ---------------- the scheduler ---------------- */

		/* The feel a groove gives the click's own subdivisions: a shuffle's eighths are shuffled, a swung
		 * sixteenth feel swings the sixteenths. Otherwise the swing is whatever was set. */
		function swingNow() {
			var o = m.opts, g = o.groove, K = root.HE && root.HE.kit;
			if (g && g.kind === 'feel' && K && K.feel(g.feel)) {
				var f = K.feel(g.feel);
				if (f.grid === 12 && o.sub === 2) { return 1; }
				if (f.grid === 16 && f.swing && o.sub === 4) { return (f.swing - 0.5) * 6; }
			}
			if (g && (g.kind === 'pattern' || g.kind === 'kit') && GROOVES[g.id] && GROOVES[g.id].spb === 3 && o.sub === 2) { return 1; }
			return o.swing;
		}
		/* The share of beats (or of bars) asked to be muted in a given bar, 0 to 1. */
		function shareAt(bar) {
			var mu = m.opts.mute;
			if (!mu) { return 0; }
			return mu.kind === 'random' ? mu.share / 100 : mu.to / 100 * clamp((bar - st.muteFrom) / mu.over, 0, 1);
		}
		/* The share asked of the beat k from now. With beat one kept, the others carry its part too, as far as they can. */
		function aheadBeat(k) {
			var mu = m.opts.mute, n = m.opts.beats.length, i = st.beat + k, bar = st.bar + Math.floor(i / n);
			if (mu.keepOne) { return i % n === 0 || n < 2 ? 0 : Math.min(1, shareAt(bar) * n / (n - 1)); }
			return shareAt(bar);
		}
		function aheadBar(k) { return shareAt(st.bar + k); }

		/* The next four bars of the feel, as the drummer will play them this time round. */
		function planCycle() {
			var g = m.opts.groove, K = root.HE.kit;
			var p = K.plan({ feel: g.feel, kit: g.kit, groove: g.groove || 0, bpm: 120, seed: st.seed + st.cycle });
			var grid = p.feel.grid, spb = grid / 4, step = p.barDur / grid, byBeat = {};
			st.cycle++;
			p.hits.forEach(function (h) {
				// he-kit.js gives each hit a time at one tempo. Here the tempo can move, so that time is taken
				// apart: where it is on the grid, how far the feel swings it, and the few thousandths of a
				// second it is early or late by hand (which stay the same at any tempo).
				var sw = p.feel.swing && grid === 16 && h.step % 2 === 1 ? (p.feel.swing - 0.5) * 2 : 0;
				var off = h.t - ((h.bar * grid + h.step) + sw) * step;
				if (off > p.total / 2) { off -= p.total; }
				var key = h.bar * 4 + Math.floor(h.step / spb);
				(byBeat[key] = byBeat[key] || []).push({ track: h.track, vel: h.vel, pos: (h.step % spb + sw) / spb, off: off });
			});
			Object.keys(byBeat).forEach(function (key) { byBeat[key].sort(function (a, b) { return (a.pos - b.pos) || (a.off - b.off); }); });
			st.plan = { byBeat: byBeat, rnd: p.rnd, grid: grid };
		}

		function barStart() {
			var o = m.opts, up = o.clickUp, mu = o.mute;
			if (st.countIn > 0) { return; }
			// Click up: the tempo moves on the bar line, before the bar's first beat is measured out.
			if (up && !st.upDone && st.bar > st.upFrom && (st.bar - st.upFrom) % up.every === 0) {
				var step = up.by, dir = up.by > 0 ? 1 : -1;
				if (up.ladder) { st.ladderUp = !st.ladderUp; if (!st.ladderUp) { step = -dir * Math.max(1, Math.round(Math.abs(up.by) / 2)); } }
				var stop = up.stopAt != null && (up.stopAt - st.upStart) * dir > 0 ? up.stopAt : (dir > 0 ? TOP : BOTTOM);
				st.bpm += step;
				if ((st.bpm - stop) * dir >= 0) {
					st.bpm = stop; st.upDone = true;
					if (!env.manual) { root.setTimeout(function () { say('up-done'); }, 0); }
				}
				st.bpm = clamp(st.bpm, BOTTOM, TOP);
			}
			var gap = o.gap;
			st.barOff = !!(gap && (st.bar % (gap.on + gap.off)) >= gap.on);
			if (mu && mu.wholeBars) { st.barMuted = st.bags.bars.next(aheadBar); }
			// the drummer comes in, and changes kit, on a bar line
			var rig = rigNow();
			if (rig !== st.rig) { st.rig = rig; st.kitFrom = st.bar; st.plan = null; }
			var g = o.groove;
			if (g && g.kind === 'feel' && st.rig && (!st.plan || (st.bar - st.kitFrom) % 4 === 0)) { planCycle(); }
		}

		function scheduleBeat(t) {
			var o = m.opts, counting = st.countIn > 0;
			if (st.beat === 0) { barStart(); }
			var beat = o.beats[st.beat], secs = beat.units * 60 / st.bpm;
			var level = counting ? (st.beat === 0 ? 'accent' : 'normal') : o.accents[st.beat];
			var mu = counting ? null : o.mute, muted = false, off = !counting && st.barOff, i;

			// Random mute and Gradual mute: is this beat one of the ones taken away?
			if (mu) {
				if (mu.wholeBars) { muted = st.barMuted && !(mu.keepOne && st.beat === 0); }
				else { muted = st.bags.beats.next(aheadBeat); }
				st.beats++;
				if (muted) { st.gone++; }
			}
			var sounds = !muted && !off;
			var chosen = counting || o.which === 'all' || (o.which === 'alt' && st.beat % 2 === 0) || (o.which === 'backbeat' && st.beat % 2 === 1) || (o.which === 'one' && st.beat === 0 && st.bar % o.every === 0);
			// with beat one kept, the most that can go is every beat but the first
			var cap = mu && mu.keepOne && !mu.wholeBars ? 1 - 1 / o.beats.length : 1;
			var up = o.clickUp, info = {
				mute: mu ? { kind: mu.kind, now: Math.round(100 * Math.min(shareAt(st.bar), cap)), to: Math.round(Math.min(mu.kind === 'gradual' ? mu.to : mu.share, 100 * cap)), done: mu.kind === 'gradual' && st.bar - st.muteFrom >= mu.over, gone: st.gone, beats: st.beats } : null,
				up: up && !counting ? { inBars: st.upDone ? 0 : up.every - ((st.bar - st.upFrom) % up.every), by: st.upDone ? 0 : (up.ladder && st.ladderUp ? -(up.by > 0 ? 1 : -1) * Math.max(1, Math.round(Math.abs(up.by) / 2)) : up.by), done: st.upDone } : null
			};
			function tick(sub, when, audible, lv, gain, lvName) {
				var on = audible && gain > 0;
				if (on) { click(lv, when, gain, { bar: st.bar, beat: st.beat, sub: sub, bpm: st.bpm, countIn: counting }); }
				queue.push({ time: when, bar: st.bar, beat: st.beat, sub: sub, audible: on, muted: muted, off: off, level: lvName, bpm: st.bpm, countIn: counting, mute: info.mute, up: info.up });
			}
			if (queue.length > 600) { queue.splice(0, queue.length - 300); }
			var beatGain = level === 'mute' ? 0 : level === 'accent' ? o.vol.accent : level === 'soft' ? o.vol.beat * 0.45 : o.vol.beat;
			var beatLv = level === 'accent' ? 0 : 1;

			if (counting || o.where === 'on' || beat.eighths) {
				// the click on the beat, and its subdivisions when every beat is clicking
				var pos = subPositions(beat, counting ? 1 : o.sub, swingNow());
				for (i = 0; i < pos.length; i++) {
					if (i === 0) { tick(0, t, sounds && chosen, beatLv, beatGain, level); }
					else { tick(i, t + pos[i] * secs, sounds && o.which === 'all', 2, beat.eighths ? o.vol.beat * 0.6 : o.vol.sub, 'sub'); }
				}
			} else {
				// the click moved off the beat: the beat passes in silence, and the one click falls after it
				tick(0, t, false, beatLv, 0, level);
				tick(1, t + placeOf(beat, o.where, swingNow()) * secs, sounds && chosen, beatLv, beatGain, level);
			}

			// The drummer
			var g = o.groove;
			if (g && g.kind === 'loop') {
				if (!counting && loopBuf && sounding) {
					if (st.beat === 0 && st.bar % (g.bars || 1) === 0 && !st.barOff) {
						// a recorded loop is started again every time it comes round, at the speed of the moment
						if (loopSrc) { try { loopSrc.stop(t); } catch (e) { /* already stopped */ } }
						var s2 = ctx.createBufferSource();
						loopGain = ctx.createGain();
						s2.buffer = loopBuf; s2.playbackRate.value = st.bpm / g.bpm; loopGain.gain.value = sounds ? o.vol.groove : 0;
						s2.connect(loopGain); loopGain.connect(loopBus); s2.start(Math.max(t, ctx.currentTime));
						loopSrc = s2; st.loopOn = sounds;
					} else if (loopSrc && st.beat === 0) {
						// Click up under a loop: it follows at the bar line
						loopSrc.playbackRate.setValueAtTime(st.bpm / g.bpm, Math.max(t, ctx.currentTime));
					}
					if (loopGain && sounds !== st.loopOn) {
						// a muted beat mutes the drummer too: the loop dips out for it and back
						loopGain.gain.setValueAtTime(st.loopOn ? o.vol.groove : 0, Math.max(0, t - 0.006));
						loopGain.gain.linearRampToValueAtTime(sounds ? o.vol.groove : 0, Math.max(0.001, t));
						st.loopOn = sounds;
					}
				}
			} else if (g && !counting && sounds) {
				if (g.kind === 'feel') {
					// played live from the plan: only in 4/4, where the feels are written
					if (st.rig && st.plan && o.beats.length === 4 && !beat.eighths && beat.div === 1) {
						var hits = st.plan.byBeat[((st.bar - st.kitFrom) % 4) * 4 + st.beat] || [];
						for (i = 0; i < hits.length; i++) { kitHit(st.rig, hits[i], t + hits[i].pos * secs + hits[i].off, secs); }
					}
				} else if (GROOVES[g.id]) {
					var pat = GROOVES[g.id];
					var steps = pat.spb, barInPat = st.bar % pat.bars;
					var stepPos = subPositions({ div: steps === 3 ? 3 : 1, eighths: false }, steps === 3 ? 3 : steps, steps === 2 || steps === 4 ? o.swing : 0);
					if (pat.groups) { stepPos = subPositions(beat, 2, 0); }
					var offset = 0;
					for (var b = 0; b < st.beat; b++) { offset += pat.groups ? o.beats[b].units : steps; }
					var perBar = pat.groups ? pat.meter[0] : o.beats.length * steps;
					Object.keys(pat.parts).forEach(function (part) {
						var str = pat.parts[part];
						for (var s = 0; s < stepPos.length; s++) {
							var ch = str.charAt(barInPat * perBar + offset + s);
							if (ch && ch !== '.') { drumHit(part, ch, t + stepPos[s] * secs, secs); }
						}
					});
				}
			}

			// Advance
			st.next = t + secs;
			st.beat++;
			if (st.beat >= o.beats.length) {
				st.beat = 0;
				if (st.countIn > 0) { st.countIn--; } else { st.bar++; }
			}
		}

		function tick() {
			if (!m.running) { return; }
			var ahead = root.document && root.document.hidden ? 1.5 : 0.15, now = ctx.currentTime;
			while (st.next < now + ahead) { scheduleBeat(st.next); }
			// forget the sounds that have finished
			if (live.length > 64) { live = live.filter(function (x) { return x[1] > now; }); }
		}

		function drawLoop() {
			// what is heard is a little behind the audio clock (more with Bluetooth, which the player sets by hand)
			var late = Math.min(0.5, ctx.outputLatency || ctx.baseLatency || 0) + m.opts.offsetMs / 1000, ev = null, beatEv = null;
			// After the page was hidden, only the latest tick is worth drawing.
			while (queue.length && queue[0].time + late <= ctx.currentTime) { ev = queue.shift(); if (ev.sub === 0) { beatEv = ev; } }
			if (typeof m.onbeat === 'function') {
				// a beat is never skipped for the sake of a subdivision that came just after it
				if (beatEv && beatEv !== ev) { m.onbeat(beatEv); }
				if (ev) { m.onbeat(ev); }
			}
			raf = root.requestAnimationFrame(drawLoop);
		}

		function startTimer() {
			try {
				if (!worker) {
					var src = 'var t=null;onmessage=function(e){if(e.data==="start"){clearInterval(t);t=setInterval(function(){postMessage(0)},25);}else{clearInterval(t);t=null;}};';
					worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
				}
				worker.onmessage = tick;
				worker.postMessage('start');
			} catch (e) {
				worker = null;
				timer = setInterval(tick, 25);
			}
		}
		function stopTimer() {
			if (worker) { worker.postMessage('stop'); }
			if (timer) { clearInterval(timer); timer = null; }
		}

		function keepAwake(on) {
			var nav = root.navigator;
			if (on && nav && nav.wakeLock && !wake) { nav.wakeLock.request('screen').then(function (l) { wake = l; }, function () {}); }
			if (!on && wake) { wake.release().catch(function () {}); wake = null; }
		}
		/* Where the browser shows controls on the lock screen, they start and stop the click. */
		function lockScreen(on) {
			var ms = root.navigator && root.navigator.mediaSession;
			if (!ms) { return; }
			try {
				if (on) {
					if (root.MediaMetadata) { ms.metadata = new root.MediaMetadata({ title: 'Metronome, ' + m.opts.bpm + ' bpm', artist: 'Leith Bass Space' }); }
					ms.setActionHandler('play', function () { m.start(); });
					ms.setActionHandler('pause', function () { m.stop(); });
					ms.setActionHandler('stop', function () { m.stop(); });
				}
				ms.playbackState = on ? 'playing' : 'paused';
			} catch (e) { /* not every browser has every part of it */ }
		}

		m.set = function (opts) {
			opts = modern(opts);
			var before = m.opts, prevKit = kitId();
			var merged = Object.assign({}, m.opts, opts);
			if (opts.meter && !opts.accents) { merged.accents = null; }
			if (opts.meter && !opts.groups) { merged.groups = null; }
			var g = opts.groove;
			if (g && (g.kind === 'pattern' || g.kind === 'kit') && GROOVES[g.id]) {
				var p = GROOVES[g.id];
				merged.meter = p.meter; merged.groups = p.groups || null;
				if (!opts.accents) { merged.accents = null; }
			}
			// the house drummer's feels are written in 4/4
			if (g && g.kind === 'feel') { merged.meter = [4, 4]; merged.groups = null; if (!opts.accents && (before.meter[0] !== 4 || before.meter[1] !== 4)) { merged.accents = null; } }
			if (g && g.kind === 'loop' && /^\d+\/\d+$/.test(g.meter || '')) {
				merged.meter = g.meter.split('/').map(Number); merged.groups = null;
				if (!opts.accents) { merged.accents = null; }
			}
			m.opts = defaults(merged);
			if (st) {
				var o = m.opts;
				if ('bpm' in opts || JSON.stringify(o.clickUp) !== JSON.stringify(before.clickUp)) {
					// a new tempo, or new Click up settings: the climb starts again from here
					if ('bpm' in opts) { st.bpm = o.bpm; }
					st.upFrom = st.bar; st.upStart = st.bpm; st.upDone = false; st.ladderUp = false;
					if (loopSrc && o.groove && o.groove.bpm) { loopSrc.playbackRate.setTargetAtTime(st.bpm / o.groove.bpm, ctx.currentTime, 0.01); }
				}
				if (JSON.stringify(o.mute) !== JSON.stringify(before.mute) || o.beats.length !== before.beats.length) {
					// Gradual mute starts again with every beat sounding; the counts start again too
					st.muteFrom = st.bar + (st.beat > 0 ? 1 : 0); st.beats = 0; st.gone = 0;
					st.bags.beats.again(); st.bags.bars.again();
				}
				if (st.beat >= o.beats.length) { st.beat = 0; }
				if (JSON.stringify(o.groove) !== JSON.stringify(before.groove)) { st.plan = null; }
				if (sounding && m.running && o.vol.groove !== before.vol.groove) { kitBus.gain.setTargetAtTime(o.vol.groove, ctx.currentTime, 0.02); }
			}
			if (m.opts.sound !== before.sound) { clickSet = null; }
			if (ctx && m.running && (m.opts.groove || m.opts.sound !== before.sound || kitId() !== prevKit)) { m.prepare(); }
			return m.opts;
		};

		/*
		 * Get ready whatever the settings need. What can be made here (drawn clicks, synthesised drums, a
		 * drum machine) is made; what has to be fetched (the clicks pack, a recorded kit) is asked for.
		 * Gives a promise of the part that needs no network, which is all Start ever waits for.
		 */
		m.prepare = function () {
			var o = m.opts, g = o.groove, local = [], id = kitId();
			if (RECORDED[o.sound] && !have.clicks) { pack('clicks').catch(function () {}); }
			Object.keys(have).forEach(fit);
			if (g && g.kind === 'loop' && ctx && sounding) { return loadLoop(g); }
			if (g && g.kind === 'kit') { local.push(loadDrums().then(function () { return ctx && GROOVES[g.id] ? loadKit(GROOVES[g.id].parts) : null; })); }
			if (id) {
				// A kit whose sounds are in hand, or a drum machine (made here), is waited for: it takes a moment and no
				// network. A kit still to be fetched is not: a written pattern plays synthesised drums until it comes.
				var ready = inHand(id), job = rigFor(id).catch(function () {});
				if (ready) { local.push(job); }
				else if (g.kind === 'pattern') { local.push(loadDrums()); }
			}
			return Promise.all(local);
		};

		m.start = function (how) {
			if (m.running) { return Promise.resolve(); }
			ensure();
			if (!env.context && ctx.state === 'suspended' && ctx.resume) { ctx.resume(); }
			return m.prepare().then(function () {
				var o = m.opts;
				st = {
					next: how && how.at != null ? how.at : ctx.currentTime + 0.08, bar: 0, beat: 0, countIn: o.countIn,
					bpm: o.bpm, upFrom: 0, upStart: o.bpm, ladderUp: false, upDone: false, barOff: false, barMuted: false,
					muteFrom: 0, beats: 0, gone: 0,
					// beats are dealt four bars at a time (two if the bar is long), from wherever in the bar the deal starts
					bags: { beats: new Bag(rnd, function () { var n = m.opts.beats.length; return n * (n > 6 ? 2 : 4) - st.beat; }), bars: new Bag(rnd, function () { return 8; }) },
					rig: null, kitFrom: 0, plan: null, cycle: 0, seed: Math.floor(rnd() * 100000), loopOn: true
				};
				queue = [];
				m.running = true;
				if (sounding) {
					var now = ctx.currentTime;
					[clickBus, grooveBus, loopBus].forEach(function (b) { b.gain.cancelScheduledValues(now); b.gain.setValueAtTime(1, now); });
					kitBus.gain.cancelScheduledValues(now); kitBus.gain.setValueAtTime(o.vol.groove, now);
				}
				if (!env.manual) {
					startTimer();
					tick();
					root.cancelAnimationFrame(raf); raf = root.requestAnimationFrame(drawLoop);
					keepAwake(true);
					lockScreen(true);
				}
				say('running');
			});
		};

		m.stop = function () {
			if (!m.running) { return; }
			m.running = false;
			if (!env.manual) { stopTimer(); root.cancelAnimationFrame(raf); keepAwake(false); lockScreen(false); }
			if (sounding) {
				// Silence anything already handed to the clock: a quick fade, then everything is stopped.
				var now = ctx.currentTime;
				[clickBus, grooveBus, kitBus, loopBus].forEach(function (b) { b.gain.cancelScheduledValues(now); b.gain.setTargetAtTime(0, now, 0.005); });
				live.forEach(function (x) { try { x[0].stop(now + 0.04); } catch (e) { /* stopped */ } });
				if (loopSrc) { try { loopSrc.stop(now + 0.04); } catch (e2) { /* stopped */ } loopSrc = null; }
			}
			live = [];
			queue = [];
			say('stopped');
		};

		m.currentBpm = function () { return st && m.running ? st.bpm : m.opts.bpm; };
		m.info = function () {
			var id = kitId();
			return {
				clicks: RECORDED[m.opts.sound] && have.clicks ? 'recorded' : 'drawn',
				// before the first Start a kit cannot be wired up, but its sounds can be in hand
				kit: !id ? '' : rigFailed[id] ? 'failed' : rigNow() || (!ctx && inHand(id)) ? 'ready' : 'waiting'
			};
		};

		/* Hear the sound as it is set: accent, beat, subdivision. */
		m.preview = function () {
			ensure();
			if (!sounding) { return; }
			if (ctx.state === 'suspended' && ctx.resume) { ctx.resume(); }
			var o = m.opts, wait = RECORDED[o.sound] && !have.clicks ? pack('clicks').catch(function () {}) : Promise.resolve();
			// a moment for the recording to come in, but no more: the stand in will do
			Promise.race([wait, new Promise(function (r) { root.setTimeout(r, 1200); })]).then(function () {
				var now = ctx.currentTime;
				if (!m.running) { clickBus.gain.cancelScheduledValues(now); clickBus.gain.setValueAtTime(1, now); }
				click(0, now + 0.06, o.vol.accent, {}); click(1, now + 0.36, o.vol.beat, {}); click(2, now + 0.56, o.vol.sub, {}); click(1, now + 0.76, o.vol.beat, {});
			});
		};

		if (env.manual) {
			/* For tests: hand everything up to this time to the clock. */
			m.pump = function (until) { while (m.running && st.next < until) { scheduleBeat(st.next); } };
			/* For tests: the display's events up to a time, in order, as onbeat would have had them. */
			m.drain = function (until) { var out = []; while (queue.length && queue[0].time <= until) { out.push(queue.shift()); } return out; };
			m.have = have;
			/* For tests: the three takes of the click in use, as they will be played. */
			m.peek = function () { ensure(); return clicksNow(); };
		}

		if (root.document && !env.manual) {
			root.document.addEventListener('visibilitychange', function () {
				if (root.document.visibilityState === 'visible' && m.running) { wake = null; keepAwake(true); if (ctx.state === 'suspended') { ctx.resume(); } }
			});
		}
		return m;
	}

	root.LBSMetronome = {
		create: create, GROOVES: GROOVES, SOUNDS: SOUNDS, RECORDED: RECORDED, LEVELS: LEVELS, TOP: TOP, BOTTOM: BOTTOM, LEAD: LEAD,
		setup: function (o) { cfg.base = o.base || ''; cfg.version = o.version || ''; },
		band: band, upgrade: upgrade, tap: tap, draw: draw, Bag: Bag, THIN: THIN, upStop: upStop, upNext: upNext, interleave: interleave, counted: counted, link: link, unlink: unlink,
		_defaults: defaults, _subPositions: subPositions, _placeOf: placeOf, _levels: { CLICK_GAIN: CLICK_GAIN, DRAWN_DB: DRAWN_DB, KIT_DB: KIT_DB }
	};
}(typeof window !== 'undefined' ? window : this));
