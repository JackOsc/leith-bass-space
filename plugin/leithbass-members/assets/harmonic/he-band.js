/*
 * Leith Bass Space: Harmonic Elements, the app's own chord players.
 *
 * Eleven instruments, on their own or in small bands, play an element's
 * chords in the feel the drums are playing: a reggae loop gets a skank on the
 * off beat, a bossa gets the clave, a shuffle is shuffled. The band never
 * plays a bass line of its own: that space is the pupil's. Or the chords can
 * simply be held, one strike to the bar, with no rhythm of their own.
 *
 *   SAMPLED   grand piano, upright piano, electric guitar, vibraphone
 *   DRAWN     electric piano, glass electric piano, organ, strings, warm pad,
 *             brass, nylon guitar
 *
 * HOW THE CHORDS ARE VOICED. Each chord keeps its root (with no bass, the
 * root has to be in there somewhere) and sits between about E3 and E5. From
 * one chord to the next every note moves as little as it can, so the
 * semitone moves the course tells you to listen for ("3 up to 4") happen in
 * one voice, where you can hear them. The loop is a circle, so the last
 * chord leads back into the first the same way.
 *
 * A loop is drawn once into a buffer, exactly a whole number of bars long.
 * Each different strike (this chord, this hard, held this long) is drawn once
 * and laid into the loop wherever it falls; whatever rings past the end
 * carries on from the start, so the loop goes round without a seam. Then each
 * player goes through their own effects and all of them into one room.
 * he-sounds.js says why it is done that way.
 *
 * A chord may last half a bar (bars: 0.5, 1.5 and so on), as in a jazz blues
 * or rhythm changes: it is then struck on beat three, and nothing of the chord
 * before hangs over into it. If every chord of a sequence says exactly which
 * notes it is (notes: [48, 55, 64]), those are played as they stand.
 *
 * WRITTEN OUT NOTES. Besides the band's own playing, any instrument can be
 * given a line note by note (HE.band.score): a reference bass line under a
 * loop, or a question in the ear trainer. There are three basses for that, an
 * electric and an upright that are recorded and one that is drawn. They are
 * not chord sounds, so they are not in SOUNDS. A written line is drawn by the
 * same three steps and out of the same store of strikes.
 *
 * HE.band.SOUNDS         [{id, name, group, packs}]
 * HE.band.BASSES         [{id, name, pack}]: the basses a pupil can choose between
 * HE.band.STAND_IN       what plays instead if an instrument's recording can't be fetched
 * HE.band.voice(seq, shape)     the notes of each chord, as MIDI numbers
 * HE.band.draw(spec, packs, rate)   a promise of {buffer, length, bars}
 *     spec: {seq: [{pc, qual, bars, notes}], bpm, feel, sound, playing: 'feel' | 'held',
 *            strict: true when the drums are a recording, seed}
 * HE.band.score(spec, packs, rate)  a promise of {buffer, length, bars, gain}: a loop of written notes
 *     spec: {bpm, bars, room: 0..1, seed, parts: [{inst, level (dB), pan (-1..1),
 *            strikes: [{beat, len (beats), notes: [midi], vel: 0..1, spread (seconds), muted}]}]}
 *     "gain" is 1 unless that would clip: written notes are levelled in advance (see WRITTEN).
 * HE.band.note(inst, midi, o, packs, rate)   a promise of {buffer, length, gain}: one note, played once
 *     o: {len (seconds, 1.2), vel, spread, muted, room}
 * HE.band.packsFor(spec)        the packs a score's instruments need
 */
(function (root) {
	'use strict';
	var HE = root.HE, SND = HE.sounds, KIT = HE.kit;
	var OAC = root.OfflineAudioContext || root.webkitOfflineAudioContext;

	function P(text) { return text.replace(/[\s|]/g, ''); }
	function twice(bar) { var b = P(bar); return b + b; }
	function hz(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
	function gainOf(dB) { return Math.pow(10, dB / 20); }

	/* ---------- voicing ---------- */

	// The pitch classes of a chord, cut down to "max" notes: the fifth goes first, never the root.
	function tonesOf(chord, max) {
		var tones = HE.QUAL[chord.qual].tones.map(function (t) { return t % 12; });
		while (tones.length > max) {
			var drop = tones.indexOf(7) !== -1 ? tones.indexOf(7) : tones.indexOf(8) !== -1 ? tones.indexOf(8) : tones.length - 2;
			tones.splice(drop, 1);
		}
		return tones.map(function (t) { return (chord.pc + t) % 12; });
	}

	// Every sensible way to lay a chord out inside the instrument's range.
	function layouts(chord, shape) {
		var pcs = tonesOf(chord, shape.max || 5), out = [], seen = {};
		function keep(notes) {
			notes = notes.slice().sort(function (a, b) { return a - b; });
			if (notes[0] < shape.lo || notes[notes.length - 1] > shape.hi) { return; }
			var key = notes.join(',');
			if (!seen[key]) { seen[key] = true; out.push(notes); }
		}
		for (var r = 0; r < pcs.length; r++) {
			var order = pcs.slice(r).concat(pcs.slice(0, r));
			for (var bottom = shape.lo; bottom <= shape.hi; bottom++) {
				if (((bottom % 12) + 12) % 12 !== order[0]) { continue; }
				var notes = [bottom];
				for (var i = 1; i < order.length; i++) {
					var next = notes[i - 1] + 1;
					while (((next % 12) + 12) % 12 !== order[i]) { next++; }
					notes.push(next);
				}
				keep(notes);
				// "drop two": the second note from the top goes down an octave, which opens the chord out
				if (notes.length >= 4) { var d = notes.slice(); d[d.length - 2] -= 12; keep(d); }
				// a triad opened out, for strings and pads
				if (notes.length === 3 && shape.open) { var o = notes.slice(); o[1] += 12; keep(o); }
			}
		}
		return out;
	}

	// How awkward a layout is on its own: too high or low, too wide, or with notes that grind.
	function awkward(notes, chord, shape) {
		var cost = 0, sum = 0, i, j;
		for (i = 0; i < notes.length; i++) { sum += notes[i]; }
		cost += Math.abs(sum / notes.length - shape.centre) * 0.7;
		var span = notes[notes.length - 1] - notes[0];
		if (span > 15) { cost += (span - 15) * 2; }
		for (i = 1; i < notes.length; i++) {
			var step = notes[i] - notes[i - 1];
			if (step === 1) { cost += i === notes.length - 1 ? 9 : 5; } // a semitone on top is the harshest place for it
			if (step <= 2 && notes[i - 1] < 56) { cost += 1.5; }         // close notes low down turn to mud
		}
		var rootPc = chord.pc;
		for (i = 0; i < notes.length; i++) {
			for (j = i + 1; j < notes.length; j++) {
				// a minor ninth is only at home above the root of a dominant chord
				if (notes[j] - notes[i] === 13 && !(((notes[i] % 12) + 12) % 12 === rootPc && chord.qual === 'alt')) { cost += 5; }
			}
		}
		return cost;
	}

	// How far the notes travel from one layout to the next.
	function travel(a, b) {
		var cost = 0, i, j, best;
		for (i = 0; i < b.length; i++) { best = 99; for (j = 0; j < a.length; j++) { best = Math.min(best, Math.abs(b[i] - a[j])); } cost += best; }
		for (i = 0; i < a.length; i++) { best = 99; for (j = 0; j < b.length; j++) { best = Math.min(best, Math.abs(a[i] - b[j])); } cost += best; }
		return cost + 1.2 * Math.abs(a[a.length - 1] - b[b.length - 1]);
	}

	// The layouts that get round the whole loop, and back to the start, with the least movement.
	function voice(seq, shape) {
		var options = seq.map(function (chord) {
			var list = layouts(chord, shape).map(function (notes) { return { notes: notes, own: awkward(notes, chord, shape) }; });
			list.sort(function (a, b) { return a.own - b.own; });
			return list.slice(0, 14);
		});
		if (options.some(function (o) { return !o.length; })) { return null; }
		if (seq.length === 1) { return [options[0][0].notes]; }
		var best = null, bestCost = Infinity;
		options[0].forEach(function (first) {
			// from "first", the cheapest way through the rest of the chords
			var front = [{ cost: first.own, path: [first.notes] }];
			for (var c = 1; c < seq.length; c++) {
				var next = [];
				options[c].forEach(function (opt) {
					var low = null;
					front.forEach(function (f) {
						var cost = f.cost + opt.own + travel(f.path[f.path.length - 1], opt.notes);
						if (!low || cost < low.cost) { low = { cost: cost, path: f.path }; }
					});
					next.push({ cost: low.cost, path: low.path.concat([opt.notes]) });
				});
				front = next;
			}
			front.forEach(function (f) {
				var cost = f.cost + travel(f.path[f.path.length - 1], first.notes);
				if (cost < bestCost) { bestCost = cost; best = f.path; }
			});
		});
		return best;
	}

	/*
	 * HOW EACH KIND OF PLAYER COMPS IN EACH FEEL. Two bars, written like the
	 * drum patterns: sixteen steps to the bar, or twelve for the triplet feels.
	 *   X accented   x normal   o soft   - held on   . silence
	 * For a guitar: D d down strokes, U u up strokes, m a muted chick.
	 * Whatever is written, a new chord is always struck within the first beat
	 * of its bar, so the changes land where the display says they do.
	 */
	var COMP = {
		'Rock 8ths': {
			keys: [P('X--- x--- x--- x-x- | X--- x--- x--- x---'), P('X--- ---- x--- --x- | X--- --x- x--- ----')],
			strum: [twice('d-d- D-d- d-d- D-d-'), P('D--- d-u- -ud- D-u- | D--- d-u- -ud- D---')],
			stab: [twice('X--- ---- ---- ----')]
		},
		'Pop 16ths': {
			keys: [P('X--- --x- --x- ---- | X--- --x- --x- --x-'), P('X--- ---x --x- ---- | X--- ---x --x- x---')],
			strum: [twice('D--- d-u- --u- d-u-'), P('D-.. d-u- .ud- d-u. | D-.. d-u- .ud- d-u-')],
			stab: [P('X--- ---- ---- ---- | X--- ---- ---- ..x.')]
		},
		'Funky 16ths': {
			keys: [P('X... ...x .x.. .... | X... ...x .x.. ..x.'), P('X.x. .... ..x. .x.. | X... ..x. .... x...')],
			strum: [P('D.mm m.Dm .mDm m.m. | D.mm m.Dm .mDm mDm.'), twice('m.Dm mmD. m.Dm mmD.')],
			stab: [P('X... .... .... ..x. | .... .x.. X... ....')]
		},
		'Hip hop': {
			keys: [P('X--- ---- ---- --o- | X--- ---- --x- ----'), P('X--- ---- .... x--- | X--- ---- ---- ....')],
			strum: [P('D--- ---- --u. .... | D--- ---- .... u...'), P('d... .... D--- .... | d... ..u. D--- ....')],
			stab: [twice('X--- ---- .... ....')]
		},
		'Soul': {
			keys: [twice('x--- X--- x--- X---'), P('X--- ..x. x--- ..x. | X--- ..x. x--- x-x-')],
			strum: [twice('.... D... .... D...'), twice('d... D... ..u. D...')],
			stab: [P('X--- ---- ---- ..x. | X--- ---- .... x.x.')]
		},
		'Shuffle': {
			keys: [P('X-- --x X-- --x | X-- --x X-- ---'), P('X-x X.. X-x X.. | X-x X.. X-- --x')],
			strum: [twice('D-u D.u D-u D.u'), twice('d.. D.u d.. D.u')],
			stab: [P('X-- ... ... ..x | X-- ... ..x ...')]
		},
		'Half-time': {
			keys: [P('X--- ---- ---- ---- | X--- ---- ---- x---'), P('X--- ---- ---- --x- | X--- ---- x--- ----')],
			strum: [P('D--- ---- ---- ---- | D--- ---- d--- ----'), P('D--- ---- ---- --u- | D--- ---- ---- ----')],
			stab: [twice('X--- ---- ---- ----')]
		},
		'Reggae': {
			keys: [twice('..X. ..X. ..X. ..X.'), P('..X. ..X. ..X. ..Xx | ..X. ..X. ..X. ..X.')],
			strum: [twice('..U. ..U. ..U. ..U.'), twice('..U. ..Uu ..U. ..U.')],
			stab: [twice('X--- ---- .... ....')],
			bubble: [twice('.oXo .oXo .oXo .oXo')]
		},
		'Swing': {
			keys: [P('X-- ..x --. ... | X-- ... ..x --.'), P('X-. ... x-. ..x | X-. ..x --- ...')],
			strum: [twice('d.. D.. d.. D..'), P('D.. ..u ... ... | D.. ... ..u ...')],
			stab: [P('X-. ... ... ..x | X-. ..x ... ...')]
		},
		'Bossa': {
			keys: [P('X--- --x- ---- x--- | x--- x--- --x- ----'), P('X--- x--- --x- ---- | x--- --x- ---- x---')],
			strum: [P('D--- --u- ---- d--- | d--- u--- --d- ----'), P('D--- d--- --u- ---- | d--- --u- ---- d---')],
			stab: [twice('X--- ---- ---- ----')]
		},
		'Neo soul': {
			keys: [P('X--- ---- ---o --x- | X--- ---- .x-- ----'), P('X--- ---- ---- x--- | X--- --x- ---- ----')],
			strum: [P('D--- ---- .... ..u- | D--- ---- .u.. ....'), P('D--- ---- ---- .... | D--- --u- ---- ....')],
			stab: [twice('X--- ---- .... ....')]
		},
		'Four on the floor': {
			keys: [P('X..x ..x. ..x. ..x. | X..x ..x. ..x. .x..'), twice('..X. ..X. ..X. ..X.')],
			strum: [twice('m.Dm m.Dm m.Dm m.Dm'), twice('D.mm D.mm D.mm D.mu')],
			stab: [P('X... ..x. .... x... | X... ..x. ..x. ....')]
		},
		'Percussion': {
			keys: [P('X--- ---- x--- ---- | X--- --x- x--- ----'), twice('X--- --x- --x- ----')],
			strum: [twice('D--- d-u- --u- d-u-'), twice('D--- ---- d-u- ----')],
			stab: [twice('X--- ---- ---- ----')]
		}
	};
	// Held: one strike to the bar and nothing else, so any feel sits over it.
	var HELD = { 16: { keys: 'X---------------', strum: 'D---------------', stab: 'X---------------', bubble: 'X---------------' }, 12: { keys: 'X-----------', strum: 'D-----------', stab: 'X-----------', bubble: 'X-----------' } };
	// With a recorded drummer the app can't know exactly where the off sixteenths fall, so it keeps to this.
	var PLAIN = { keys: 'X-------x-------', strum: 'D-------d-------', stab: 'X---------------', bubble: 'X-------x-------' };

	var VEL = { X: 1, x: 0.8, o: 0.55, D: 1, d: 0.78, U: 0.86, u: 0.66, m: 0.5 };
	// How far behind the beat the chords sit, in thousandths of a second.
	var LAZY = { 'Neo soul': 16, 'Hip hop': 9, 'Half-time': 4 };

	/* ---------- the instruments ---------- */

	// Where each instrument likes to sit, and how many notes it plays at once.
	var SHAPES = {
		keys: { lo: 52, hi: 77, centre: 63.5, max: 5 },
		guitar: { lo: 50, hi: 76, centre: 62.5, max: 4 },
		vibes: { lo: 53, hi: 79, centre: 66, max: 4 },
		pad: { lo: 50, hi: 79, centre: 64, max: 4, open: true },
		brass: { lo: 55, hi: 79, centre: 66, max: 4 },
		organ: { lo: 52, hi: 79, centre: 65, max: 4 }
	};

	/*
	 * An instrument is two things:
	 *   note(env, n)    wire one note into a drawing. env: {oc, out, packs}; n: {midi, t, dur, vel, muted, turn}
	 *   fx(env, node)   what the whole instrument goes through afterwards (a turning speaker,
	 *                   a chorus...). env: {oc, seconds (the loop's length), fast}. Returns the last node.
	 *   tail            seconds a note rings on after it is let go
	 */

	function osc(oc, type, freq, t, end) {
		var o = oc.createOscillator();
		if (typeof type === 'string') { o.type = type; } else { o.setPeriodicWave(type); }
		o.frequency.value = freq;
		o.start(t); o.stop(end);
		return o;
	}

	// One recorded note, moved to the pitch wanted from the nearest one that was recorded.
	function sampled(env, pack, list, n, o) {
		var oc = env.oc, best = null, second = null, i;
		for (i = 0; i < list.length; i++) {
			var far = Math.abs(list[i][0] - n.midi);
			if (!best || far < Math.abs(best[0] - n.midi)) { second = best; best = list[i]; }
			else if (!second || far < Math.abs(second[0] - n.midi)) { second = list[i]; }
		}
		// now and then the next nearest recording, so a repeated note isn't the same take every time
		if (o.vary && second && Math.abs(second[0] - n.midi) <= 2.6 && n.turn % 3 === 2) { best = second; }
		var src = oc.createBufferSource(), g = oc.createGain();
		src.buffer = pack.buffer;
		src.playbackRate.value = Math.pow(2, (n.midi - best[0]) / 12);
		var level = gainOf(best[3] + (o.range || 18) * (n.vel - 1)) * (o.gain || 1);
		// (a bass has every recorded note levelled once more, and a few of them tuned once more, by measurement: see EVEN and TUNE)
		if (o.even) { level *= gainOf(o.even[list.indexOf(best)] || 0); }
		if (o.cents) { src.playbackRate.value = Math.pow(2, (n.midi - best[0] - (o.cents[list.indexOf(best)] || 0) / 100) / 12); }
		// struck, held, then let go: the key or the string is damped
		g.gain.setValueAtTime(level, n.t);
		g.gain.setValueAtTime(level, n.t + n.dur);
		g.gain.setTargetAtTime(0, n.t + n.dur, o.release);
		if (o.dark && n.vel < 0.92) {
			// a softer note is a duller note
			var lp = oc.createBiquadFilter();
			lp.type = 'lowpass'; lp.Q.value = 0.4;
			lp.frequency.value = o.dark + (o.bright - o.dark) * Math.pow(n.vel, 1.6);
			src.connect(lp); lp.connect(g);
		} else { src.connect(g); }
		g.connect(env.out);
		src.start(n.t, pack.zero + best[1], best[2]);
		src.stop(n.t + n.dur + o.release * 7 + 0.05);
	}

	// A setting that only drifts can be read once every 128 samples instead of every sample: much less work, no audible difference.
	function slow(param) { try { param.automationRate = 'k-rate'; } catch (e) { /* older browsers read it every sample */ } }
	// A wobble that comes round a whole number of times in the loop, so the loop still joins up.
	function wobble(env, hz) {
		var lfo = env.oc.createOscillator();
		lfo.frequency.value = SND.whole(hz, env.seconds);
		lfo.start(0);
		return lfo;
	}
	// A gentle left-to-right sway, as a suitcase electric piano has.
	function sway(env, node, rate, depth) {
		var oc = env.oc;
		if (!oc.createStereoPanner) { return node; }
		var pan = oc.createStereoPanner(), amt = oc.createGain();
		amt.gain.value = depth;
		wobble(env, rate).connect(amt); amt.connect(pan.pan);
		node.connect(pan);
		return pan;
	}
	// Three slightly wandering copies, spread left to right: one player becomes a section.
	function ensemble(env, node, depth) {
		var oc = env.oc, out = oc.createGain();
		[[0.011, 0.63, -0.8], [0.016, 0.91, 0], [0.021, 0.47, 0.8]].forEach(function (v) {
			var d = oc.createDelay(0.06), amt = oc.createGain(), g = oc.createGain();
			d.delayTime.value = v[0]; slow(d.delayTime);
			amt.gain.value = depth * 0.0022;
			wobble(env, v[1]).connect(amt); amt.connect(d.delayTime);
			g.gain.value = 0.62;
			node.connect(d); d.connect(g);
			if (oc.createStereoPanner) { var p = oc.createStereoPanner(); p.pan.value = v[2]; g.connect(p); p.connect(out); } else { g.connect(out); }
		});
		return out;
	}

	var MAKERS = {};

	// Electric piano by frequency modulation: a sine bent by another sine gives the bark,
	// and a much higher one, dying fast, gives the "tine" at the front of the note.
	function fm(o) {
		return {
			tail: 0.45,
			note: function (env, n) {
				var oc = env.oc, f = hz(n.midi), t = n.t, end = t + n.dur + 0.45;
				var key = Math.pow(261.6 / f, 0.4);                       // lower notes are given more bite
				var g = oc.createGain(), top = 0.2 * (0.25 + 0.75 * n.vel * n.vel);
				// struck and dying away while it is held...
				g.gain.setValueAtTime(0, t);
				g.gain.linearRampToValueAtTime(top, t + 0.004);
				g.gain.setTargetAtTime(top * o.floor, t + 0.004, o.decay * Math.pow(key, 0.6));
				// ...and damped when it is let go
				g.gain.setTargetAtTime(0, t + Math.max(0.01, n.dur), 0.07);
				var car = osc(oc, 'sine', f * o.at, t, end), mod = osc(oc, 'sine', f * o.ratio, t, end), depth = oc.createGain();
				var index = o.index * (0.25 + 0.75 * n.vel) * key;
				depth.gain.setValueAtTime(index * f, t);
				depth.gain.setTargetAtTime(index * f * o.settle, t, o.bark);
				mod.connect(depth); depth.connect(car.frequency);
				// the tine: a second, much higher bend that is over in a moment
				var tine = osc(oc, 'sine', f * o.tine, t, Math.min(end, t + o.tineDecay * 7 + 0.05)), td = oc.createGain();
				td.gain.setValueAtTime(o.tineIndex * f * (0.3 + 0.7 * n.vel), t);
				td.gain.setTargetAtTime(0, t, o.tineDecay);
				tine.connect(td); td.connect(car.frequency);
				car.connect(g); g.connect(env.out);
			},
			fx: o.fx
		};
	}
	MAKERS.rhodes = fm({ at: 1, ratio: 1, index: 3.4, settle: 0.34, bark: 0.3, tine: 14, tineIndex: 0.5, tineDecay: 0.1, decay: 1.5, floor: 0.12,
		fx: function (env, node) { return sway(env, ensemble(env, node, 0.25), 4.6, 0.5); } });
	MAKERS.glass = fm({ at: 1, ratio: 2, index: 1.5, settle: 0.45, bark: 0.6, tine: 7, tineIndex: 1.4, tineDecay: 0.45, decay: 2.2, floor: 0.08,
		fx: function (env, node) { return ensemble(env, node, 0.6); } });

	// The organ: nine drawbars, one oscillator a note, through a turning speaker.
	var BARS = [[1, 3], [3, 0], [2, 8], [4, 6], [6, 4], [8, 3], [10, 0], [12, 2], [16, 1]]; // 16', 5 1/3', 8', 4', 2 2/3', 2', 1 3/5', 1 1/3', 1' as harmonics of the note an octave down
	MAKERS.organ = {
		tail: 0.08,
		note: function (env, n) {
			var oc = env.oc;
			if (!env.wave) {
				var real = new Float32Array(17), imag = new Float32Array(17);
				BARS.forEach(function (b) { imag[b[0]] = b[1] ? Math.pow(10, (b[1] - 8) * 3 / 20) : 0; });
				env.wave = oc.createPeriodicWave(real, imag, { disableNormalization: true });
			}
			var f = hz(n.midi), t = n.t, end = t + n.dur + 0.06;
			var o = osc(oc, env.wave, f / 2, t, end), g = oc.createGain(), level = 0.055 * (0.75 + 0.25 * n.vel);
			g.gain.setValueAtTime(0, t);
			g.gain.linearRampToValueAtTime(level, t + 0.006);
			g.gain.setValueAtTime(level, t + n.dur);
			g.gain.linearRampToValueAtTime(0, t + n.dur + 0.03);
			o.connect(g); g.connect(env.out);
			// percussion: a quick ping an octave and a fifth up, on the strike only
			var p = osc(oc, 'sine', f * 3, t, Math.min(end, t + 0.6)), pg = oc.createGain();
			pg.gain.setValueAtTime(0.03 * n.vel, t);
			pg.gain.setTargetAtTime(0, t, 0.09);
			p.connect(pg); pg.connect(env.out);
		},
		fx: function (env, node) {
			// a little grit, then the rotating speaker: the horn (the top) swings in pitch and level, opposite ways left and right
			var oc = env.oc, drive = oc.createWaveShaper(); drive.curve = KIT.curve(0.12);
			var lo = oc.createBiquadFilter(), hi = oc.createBiquadFilter(), merge = oc.createChannelMerger(2), out = oc.createGain();
			lo.type = 'lowpass'; lo.frequency.value = 800; hi.type = 'highpass'; hi.frequency.value = 800;
			node.connect(drive); drive.connect(lo); drive.connect(hi);
			var speed = env.fast ? 6.6 : 0.85;
			var horn = wobble(env, speed);
			[1, -1].forEach(function (side, ch) {
				var d = oc.createDelay(0.02), am = oc.createGain(), dd = oc.createGain(), ad = oc.createGain();
				d.delayTime.value = 0.0016; am.gain.value = 0.72; slow(d.delayTime);
				dd.gain.value = side * 0.00055; ad.gain.value = side * 0.26;
				horn.connect(dd); dd.connect(d.delayTime);
				horn.connect(ad); ad.connect(am.gain);
				hi.connect(d); d.connect(am); am.connect(merge, 0, ch);
			});
			var dm = oc.createGain(), da = oc.createGain();
			dm.gain.value = 0.8; da.gain.value = 0.16;
			wobble(env, speed * 0.86).connect(da); da.connect(dm.gain);
			lo.connect(dm); dm.connect(merge, 0, 0); dm.connect(merge, 0, 1);
			merge.connect(out);
			return out;
		}
	};

	// Strings, pads and brass: sawtooth waves through a filter that opens and closes.
	function analogue(o) {
		return {
			tail: o.release * 6 + 0.05,
			note: function (env, n) {
				var oc = env.oc, f = hz(n.midi), t = n.t, end = t + n.dur + o.release * 6 + 0.05;
				var lp = oc.createBiquadFilter(), g = oc.createGain();
				lp.type = 'lowpass'; lp.Q.value = o.q || 0.6;
				var open = Math.min(9000, o.cut * (0.6 + 0.4 * n.vel) * Math.pow(f / 261.6, o.track || 0.5));
				if (o.blow) {
					// brass: the tone brightens as the note speaks, then settles
					lp.frequency.setValueAtTime(open * 0.3, t);
					lp.frequency.linearRampToValueAtTime(open * 1.5, t + o.attack * 1.4);
					lp.frequency.setTargetAtTime(open, t + o.attack * 1.4, 0.12);
				} else {
					lp.frequency.setValueAtTime(open * 0.6, t);
					lp.frequency.linearRampToValueAtTime(open, t + o.attack * 2);
				}
				var level = o.level * (0.55 + 0.45 * n.vel), hold = Math.max(o.attack, n.dur);
				g.gain.setValueAtTime(0, t);
				g.gain.linearRampToValueAtTime(level, t + o.attack);
				g.gain.setValueAtTime(level, t + hold);
				g.gain.setTargetAtTime(0, t + hold, o.release);
				var vd = null;
				if (o.vibrato && n.dur > 0.5) {
					// a slow wobble that only arrives once the note has been held a while
					var vib = osc(oc, 'sine', 5.3, t, end);
					vd = oc.createGain();
					vd.gain.setValueAtTime(0, t);
					vd.gain.setValueAtTime(0, t + 0.28);
					vd.gain.linearRampToValueAtTime(f * o.vibrato, t + 0.6);
					vib.connect(vd);
				}
				o.voices.forEach(function (v) {
					var w = osc(oc, v[0], f * v[1] * Math.pow(2, v[2] / 1200), t, end), wg = oc.createGain();
					wg.gain.value = v[3];
					w.connect(wg); wg.connect(lp);
					if (vd) { vd.connect(w.frequency); }
				});
				lp.connect(g); g.connect(env.out);
			},
			fx: function (env, node) {
				var hp = env.oc.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = o.low || 150;
				node.connect(hp);
				return o.wide ? ensemble(env, hp, o.wide) : hp;
			}
		};
	}
	MAKERS.strings = analogue({ voices: [['sawtooth', 1, -7, 0.5], ['sawtooth', 1, 8, 0.5], ['sawtooth', 2, 3, 0.16]], cut: 2600, track: 0.4, attack: 0.16, release: 0.22, level: 0.06, wide: 1, low: 180 });
	MAKERS.pad = analogue({ voices: [['triangle', 1, -5, 0.8], ['sawtooth', 1, 6, 0.3], ['sine', 2, 0, 0.12]], cut: 1500, track: 0.3, attack: 0.4, release: 0.4, level: 0.085, wide: 0.8, low: 140 });
	MAKERS.brass = analogue({ voices: [['sawtooth', 1, -6, 0.5], ['sawtooth', 1, 6, 0.5]], cut: 2300, track: 0.55, q: 1.1, attack: 0.035, release: 0.05, level: 0.07, blow: true, vibrato: 0.004, wide: 0.35, low: 200 });

	// A nylon guitar: each string is worked out sample by sample, once for each pitch, and kept.
	var plucked = {};
	MAKERS.nylon = {
		tail: 0.4,
		note: function (env, n) {
			var oc = env.oc, key = oc.sampleRate + '|' + n.midi;
			if (!plucked[key]) {
				var f = hz(n.midi);
				var data = SND.string(oc.sampleRate, { freq: f, seconds: 3.2, bright: 0.22, damp: 0.6, sustain: 5 * Math.pow(220 / f, 0.5), pick: 0.22, seed: 100 + n.midi });
				var b = oc.createBuffer(1, data.length, oc.sampleRate);
				b.getChannelData(0).set(data);
				plucked[key] = b;
			}
			var src = oc.createBufferSource(), g = oc.createGain(), lp = oc.createBiquadFilter();
			var level = 0.3 * (0.3 + 0.7 * n.vel), hold = n.muted ? 0.035 : n.dur;
			src.buffer = plucked[key];
			lp.type = 'lowpass'; lp.Q.value = 0.5; lp.frequency.value = n.muted ? 600 : 800 + 1900 * n.vel;
			g.gain.setValueAtTime(level, n.t);
			g.gain.setValueAtTime(level, n.t + hold);
			g.gain.setTargetAtTime(0, n.t + hold, n.muted ? 0.02 : 0.06);
			src.connect(lp); lp.connect(g); g.connect(env.out);
			src.start(n.t);
			src.stop(n.t + hold + 0.5);
		},
		fx: function (env, node) {
			// the body of the guitar: two soft bumps low down, and the rumble taken off
			var oc = env.oc, b1 = oc.createBiquadFilter(), b2 = oc.createBiquadFilter(), hp = oc.createBiquadFilter();
			b1.type = 'peaking'; b1.frequency.value = 115; b1.Q.value = 1.6; b1.gain.value = 5;
			b2.type = 'peaking'; b2.frequency.value = 220; b2.Q.value = 1.4; b2.gain.value = 3.5;
			hp.type = 'highpass'; hp.frequency.value = 75;
			node.connect(b1); b1.connect(b2); b2.connect(hp);
			return hp;
		}
	};

	// The recorded instruments.
	function recorded(packName, o) {
		return {
			tail: o.release * 7 + 0.05,
			note: function (env, n) {
				var pack = env.packs[packName];
				var short = o.stac && pack.info.stac && (n.muted || n.dur < 0.17);
				var list = short ? pack.info.stac : pack.info.notes;
				var play = n.muted ? { midi: n.midi, t: n.t, dur: 0.03, vel: n.vel, turn: n.turn } : n;
				sampled(env, pack, list, play, { release: n.muted ? 0.012 : short ? 0.05 : o.release, dark: o.dark, bright: o.bright, range: o.range, gain: o.gain * (n.muted ? 0.6 : 1), vary: o.vary });
			},
			fx: o.fx || null
		};
	}
	MAKERS.grand = recorded('grand', { release: 0.11, dark: 1300, bright: 12000, range: 20, gain: 0.5, vary: true });
	MAKERS.upright = recorded('upright', { release: 0.1, dark: 1500, bright: 11000, range: 18, gain: 0.5, vary: true });
	MAKERS.vibes = recorded('vibes', { release: 0.22, dark: 2500, bright: 14000, range: 16, gain: 0.5, vary: false,
		fx: function (env, node) {
			// the motor: a slow pulse in the level
			var oc = env.oc, g = oc.createGain(), d = oc.createGain();
			g.gain.value = 0.85; d.gain.value = 0.15;
			wobble(env, 4.2).connect(d); d.connect(g.gain);
			node.connect(g);
			return g;
		} });
	MAKERS.guitar = recorded('guitar', { release: 0.07, dark: 1800, bright: 9000, range: 16, gain: 0.5, vary: true, stac: true,
		fx: function (env, node) {
			// a clean amplifier: the lows trimmed, a touch of presence, the fizz taken off
			var oc = env.oc, hp = oc.createBiquadFilter(), pk = oc.createBiquadFilter(), lp = oc.createBiquadFilter();
			hp.type = 'highpass'; hp.frequency.value = 95;
			pk.type = 'peaking'; pk.frequency.value = 2400; pk.Q.value = 0.9; pk.gain.value = 3;
			lp.type = 'lowpass'; lp.frequency.value = 6200; lp.Q.value = 0.5;
			node.connect(hp); hp.connect(pk); pk.connect(lp);
			return lp;
		} });

	/*
	 * THE BASSES. They are not chord sounds, so they are not in the list of SOUNDS and the band never
	 * plays one by itself: a bass only ever plays a line that has been written out for it, note by
	 * note (HE.band.score). Two are recorded (an electric bass played with the fingers, straight into
	 * the desk, and a plucked double bass) and one is drawn, so that a line still sounds if a recording
	 * cannot be fetched. A note is damped when it is let go, as a finger stops a string. The recordings
	 * are a minor third apart, so no note is moved more than a semitone and a half. A softer note is a
	 * duller note.
	 *
	 * WHICH ELECTRIC BASS. The first cut was a Jazz Bass on its loud layer, and Jack heard it as played
	 * very hard with a lot of fret noise. Measured, the front of each note stood 16 dB over the note
	 * and the pluck was bright; so it was changed for a five string played with the fingers on its neck
	 * pickup, at a moderate strength (11 dB, and a sixtieth of the energy above 1.5 kHz in the pluck).
	 * It needs far less rounding off, so its "drive" is gentle. To try another bass: sources.py and
	 * build_packs.py choose the recordings, and EVEN and WRITTEN below are then measured again.
	 *
	 * HEARD ON A PHONE. A phone's speaker gives almost nothing below about 150 Hz, so a low note is
	 * only heard there by its harmonics, and a plucked double bass has few. So the upright's lowest
	 * octave and a half is also "folded": everything under about 130 Hz is turned the same way up
	 * (what a rectifier does), which makes harmonics an octave and more above each note, and those are
	 * mixed in with the note itself. Folding gives the same share of harmonics however loud the note
	 * is, where an overdriven amplifier would only give them to the loud ones, so a note still carries
	 * on a phone as it dies away. On a real speaker the note itself is all still there underneath.
	 */
	// A gentle overdrive: quiet things pass as they are, and the loudest moments are rounded off (the
	// higher "k", the sooner). Nothing comes out bigger than 1 / k.
	var softs = {};
	function soft(k) {
		if (!softs[k]) {
			var n = 1025, c = new Float32Array(n);
			for (var i = 0; i < n; i++) { c[i] = Math.tanh(k * (i / (n - 1) * 2 - 1)) / k; }
			softs[k] = c;
		}
		return softs[k];
	}
	function bassFx(o) {
		return function (env, node) {
			var oc = env.oc, hp = oc.createBiquadFilter(), out = hp;
			// the rumble below the lowest string comes off
			hp.type = 'highpass'; hp.frequency.value = 30; hp.Q.value = -3;
			node.connect(hp);
			if (o.fold) {
				var low = oc.createBiquadFilter(), half = oc.createGain(), fold = oc.createWaveShaper();
				var from = oc.createBiquadFilter(), to = oc.createBiquadFilter(), mix = oc.createGain(), sum = oc.createGain();
				low.type = 'lowpass'; low.frequency.value = 130; low.Q.value = 0;
				// (halved on the way in and doubled on the way out, so the fold never runs out of room)
				half.gain.value = 0.5;
				fold.curve = new Float32Array([1, 0, 1]);
				// only the new harmonics are kept: nothing under 130 Hz (the note is there already), nothing harsh
				from.type = 'highpass'; from.frequency.value = 130; from.Q.value = 0;
				to.type = 'lowpass'; to.frequency.value = 900; to.Q.value = 0;
				mix.gain.value = 2 * o.fold;
				hp.connect(low); low.connect(half); half.connect(fold); fold.connect(from); from.connect(to); to.connect(mix);
				hp.connect(sum); mix.connect(sum);
				out = sum;
			}
			if (o.drive) {
				// the pluck at the front of a note can be a spike far taller than the note itself. An amplifier
				// rounds that off, and so does this.
				var amp = oc.createWaveShaper();
				amp.curve = soft(o.drive);
				out.connect(amp); out = amp;
			}
			// the top rolls off, as it does through a bass speaker
			o.tops.forEach(function (f) {
				var lp = oc.createBiquadFilter();
				lp.type = 'lowpass'; lp.frequency.value = f; lp.Q.value = -3;
				out.connect(lp); out = lp;
			});
			return out;
		};
	}
	// Each recorded note of a bass, levelled once more (dB), so that every semitone comes out as loud
	// as the next once it has been through the bass's own effects. Found by measurement.
	var EVEN = {
		ebass: [0.7, 0.7, 0, 0.2, -0.2, -0.1, -0.1, -0.1, -0.1, -0.3, -0.3, -0.2, -0.2, -0.2],
		ubass: [0, 0.2, -0.1, 0.3, -0.3, 0.1, -0.6, 0.5, -0.2, 0.3, 0.2, 0.2, 0.3, 0.3]
	};
	// Where a recorded note really sits, in cents from the pitch its pack gives it. A low string's
	// harmonics are not quite in tune with one another, and the pack's figure is an average that gives
	// the faint ones as much say as the strong ones. On these few notes of the double bass the strong
	// ones (the ones that are heard) sit lower than the average, so the note is brought up to pitch here.
	var TUNE = {
		ubass: [0, -8, -10, -6, 0, 0, 0, 0, 0, 0, 0, 0, 0, -12]
	};
	function bass(packName, o) {
		o.even = EVEN[packName];
		o.cents = TUNE[packName] || null;
		return {
			tail: o.release * 7 + 0.05,
			note: function (env, n) {
				var pack = env.packs[packName];
				if (n.muted) {
					// a dead note: the string is touched, not pressed, so there is a thump and hardly any pitch
					sampled(env, pack, pack.info.notes, { midi: n.midi, t: n.t, dur: 0.035, vel: Math.min(0.9, n.vel), turn: 0 },
						{ release: 0.014, dark: 260, bright: 700, range: o.range, gain: o.gain * 0.7, even: o.even, cents: o.cents });
				} else { sampled(env, pack, pack.info.notes, n, o); }
			},
			fx: o.fx
		};
	}
	MAKERS.ebass = bass('ebass', { release: 0.03, dark: 450, bright: 4200, range: 14, gain: 0.5, vary: false, fx: bassFx({ drive: 1.2, tops: [3600, 3600] }) });
	MAKERS.ubass = bass('ubass', { release: 0.04, dark: 500, bright: 5000, range: 14, gain: 0.5, vary: false, fx: bassFx({ fold: 0.7, drive: 1.7, tops: [4000] }) });
	// The drawn bass: one plucked string for each pitch, worked out as the nylon guitar's are, but
	// plucked nearer the bridge, duller, and ringing for much longer.
	MAKERS.sbass = {
		tail: 0.26,
		note: function (env, n) {
			var oc = env.oc, key = 'bass|' + oc.sampleRate + '|' + n.midi;
			if (!plucked[key]) {
				var f = hz(n.midi);
				var data = SND.string(oc.sampleRate, { freq: f, seconds: 3, bright: 0.3, damp: 0.75, sustain: 9 * Math.pow(41.2 / f, 0.4), pick: 0.14, seed: 300 + n.midi });
				var b = oc.createBuffer(1, data.length, oc.sampleRate);
				b.getChannelData(0).set(data);
				plucked[key] = b;
			}
			var src = oc.createBufferSource(), g = oc.createGain(), lp = oc.createBiquadFilter();
			var level = 0.3 * (0.3 + 0.7 * n.vel), hold = n.muted ? 0.035 : n.dur;
			src.buffer = plucked[key];
			lp.type = 'lowpass'; lp.Q.value = 0.5; lp.frequency.value = n.muted ? 380 : 500 + 2600 * n.vel;
			g.gain.setValueAtTime(level, n.t);
			g.gain.setValueAtTime(level, n.t + hold);
			g.gain.setTargetAtTime(0, n.t + hold, n.muted ? 0.014 : 0.03);
			src.connect(lp); lp.connect(g); g.connect(env.out);
			src.start(n.t);
			src.stop(n.t + hold + 0.26);
		},
		fx: bassFx({ tops: [3200] })
	};

	// What each instrument is: which range it plays in, which pack it needs, how it is balanced
	// against the others (dB), and how much of the room it gets. ("bass" marks the three basses: a bass
	// gets very little room, and goes round the chords' 70 Hz floor, not through it.)
	var INSTRUMENTS = {
		rhodes: { shape: 'keys', trim: 0, room: 0.16 },
		glass: { shape: 'keys', trim: -3, room: 0.24 },
		grand: { shape: 'keys', pack: 'grand', trim: -2.5, room: 0.14 },
		upright: { shape: 'keys', pack: 'upright', trim: -2, room: 0.12 },
		organ: { shape: 'organ', trim: -6, room: 0.12 },
		vibes: { shape: 'vibes', pack: 'vibes', trim: -10.5, room: 0.2 },
		guitar: { shape: 'guitar', pack: 'guitar', trim: -1.5, room: 0.16 },
		nylon: { shape: 'guitar', trim: 2.5, room: 0.18 },
		strings: { shape: 'pad', trim: 6, room: 0.28 },
		pad: { shape: 'pad', trim: -0.5, room: 0.3 },
		brass: { shape: 'brass', trim: 5.5, room: 0.2 },
		ebass: { pack: 'ebass', trim: 0, room: 0.04, bass: true },
		ubass: { pack: 'ubass', trim: 0, room: 0.05, bass: true },
		sbass: { trim: 0, room: 0.04, bass: true }
	};
	// The basses a pupil can choose between, and what plays in an instrument's place if its recording
	// can't be fetched (always something that needs no download).
	var BASSES = [{ id: 'ebass', name: 'Electric bass', pack: 'ebass' }, { id: 'ubass', name: 'Upright bass', pack: 'ubass' }];
	var STAND_IN = { ebass: 'sbass', ubass: 'sbass', grand: 'rhodes', upright: 'rhodes', vibes: 'rhodes', guitar: 'nylon' };

	/*
	 * THE SOUNDS: an instrument on its own, or a few together.
	 * A part is [instrument, how it plays, level in dB, left-to-right position].
	 * How it plays: keys (comping), strum, stab, pad (held under everything),
	 * or bubble (the organ's shuffle in a reggae band; held anywhere else).
	 */
	var SOUNDS = [
		{ id: 'rhodes', name: 'Electric piano', group: 'Keys', parts: [['rhodes', 'keys', 0, 0]] },
		{ id: 'grand', name: 'Grand piano', group: 'Keys', parts: [['grand', 'keys', 0, 0]] },
		{ id: 'upright', name: 'Upright piano', group: 'Keys', parts: [['upright', 'keys', 0, 0]] },
		{ id: 'organ', name: 'Organ', group: 'Keys', parts: [['organ', 'pad', 0, 0]] },
		{ id: 'glass', name: 'Glass electric piano', group: 'Keys', parts: [['glass', 'keys', 0, 0]] },
		{ id: 'vibes', name: 'Vibraphone', group: 'Keys', parts: [['vibes', 'keys', 0, 0]] },
		{ id: 'guitar', name: 'Electric guitar', group: 'Guitars', parts: [['guitar', 'strum', 0, 0]] },
		{ id: 'nylon', name: 'Nylon guitar', group: 'Guitars', parts: [['nylon', 'strum', 0, 0]] },
		{ id: 'strings', name: 'Strings', group: 'Strings and brass', parts: [['strings', 'pad', 0, 0]] },
		{ id: 'pad', name: 'Warm pad', group: 'Strings and brass', parts: [['pad', 'pad', 0, 0]] },
		{ id: 'brass', name: 'Brass', group: 'Strings and brass', parts: [['brass', 'stab', 0, 0]] },
		{ id: 'piano-strings', name: 'Piano and strings', group: 'Bands', parts: [['grand', 'keys', 0, -0.15], ['strings', 'pad', -9, 0.1]] },
		{ id: 'rhodes-pad', name: 'Electric piano and pad', group: 'Bands', parts: [['rhodes', 'keys', 0, 0], ['pad', 'pad', -10, 0]] },
		{ id: 'guitar-organ', name: 'Guitar and organ', group: 'Bands', parts: [['guitar', 'strum', 0, -0.3], ['organ', 'bubble', -8, 0.3]] },
		{ id: 'soul-band', name: 'Soul band', group: 'Bands', parts: [['upright', 'keys', 0, -0.2], ['organ', 'pad', -11, 0.25], ['guitar', 'strum', -5, 0.4]] },
		{ id: 'horns-rhodes', name: 'Horns and electric piano', group: 'Bands', parts: [['rhodes', 'keys', 0, -0.15], ['brass', 'stab', -6, 0.25]] },
		{ id: 'vibes-guitar', name: 'Vibes and guitar', group: 'Bands', parts: [['vibes', 'keys', 0, 0.25], ['guitar', 'strum', -4, -0.3]] },
		{ id: 'nylon-strings', name: 'Nylon guitar and strings', group: 'Bands', parts: [['nylon', 'strum', 0, -0.1], ['strings', 'pad', -10, 0.1]] }
	];
	var SOUND = {};
	SOUNDS.forEach(function (s) {
		SOUND[s.id] = s;
		s.packs = [];
		s.parts.forEach(function (p) { var need = INSTRUMENTS[p[0]].pack; if (need && s.packs.indexOf(need) === -1) { s.packs.push(need); } });
	});

	/* ---------- from chords to strikes ---------- */

	/*
	 * What one player does through the loop: a list of strikes, each
	 * {t, dur, kind, chord}. "kind" is the pattern's letter (X x o, D d U u m),
	 * or H for a chord simply held; "chord" says which of the element's chords.
	 */
	function arrange(spec, role, timing) {
		var grid = timing.grid, bars = timing.bars, total = bars * grid, rnd = timing.rnd;
		// A chord can change at the top of a bar or half way through it (on beat three), so the loop is
		// thought of in half bars: "half" is how many steps of the pattern there are in one.
		var half = grid / 2, halves = timing.halves;
		var strikes = [], h, i;

		function at(k) {
			var t = k * timing.step;
			if (timing.swing && grid === 16 && k % 2 === 1) { t += (timing.swing - 0.5) * 2 * timing.step; }
			return t;
		}

		if (role === 'pad' || (role === 'bubble' && (spec.feel !== 'Reggae' || spec.playing === 'held' || spec.strict))) {
			// one long note for each chord, struck again only when the chord changes (or the loop comes round)
			h = 0;
			while (h < halves) {
				var ci = timing.chordAt[h], len = 1;
				while (h + len < halves && timing.chordAt[h + len] === ci) { len++; }
				strikes.push({ t: (h / 2) * timing.barDur + 0.002, dur: (len / 2) * timing.barDur - 0.03, kind: 'H', chord: ci, lift: 0 });
				h += len;
			}
			return strikes;
		}

		// the pattern, laid out across the whole loop
		var line;
		if (spec.playing === 'held') { line = HELD[grid][role]; }
		else if (!COMP[spec.feel]) { line = grid === 16 ? PLAIN[role] : HELD[grid][role]; }
		else {
			var set = COMP[spec.feel][role] || COMP[spec.feel].keys;
			line = set[(spec.take || 0) % set.length];
		}
		var steps = [];
		for (i = 0; i < total; i++) { steps.push(line.charAt(i % line.length)); }
		// with a recorded drummer, keep off the in-between sixteenths: the app can't know exactly where his fall
		if (spec.strict && grid === 16 && spec.playing !== 'held') {
			for (i = 1; i < total; i += 2) { if (VEL[steps[i]] !== undefined) { steps[i] = steps[i - 1] === '.' ? '.' : '-'; } }
		}
		// a new chord is struck where it starts (the top of a bar, or beat three) unless the pattern speaks
		// within the first beat anyway
		for (h = 0; h < halves; h++) {
			if (!timing.changes[h]) { continue; }
			var top = h * half, soon = false;
			for (i = 0; i < grid / 4; i++) { if (VEL[steps[top + i]] !== undefined) { soon = true; } }
			// (held chords are all struck alike: the one that arrives on beat three is no softer than the rest)
			if (!soon) { steps[top] = spec.playing === 'held' ? line.charAt(0) : role === 'strum' ? 'd' : 'x'; }
			// and nothing of the last chord hangs over into it
			else { for (i = 0; i < grid / 4 && steps[top + i] === '-'; i++) { steps[top + i] = '.'; } }
		}

		var lazy = (spec.playing === 'held' ? 0 : (LAZY[spec.feel] || 0)) / 1000;
		for (i = 0; i < total; i++) {
			var ch = steps[i];
			if (VEL[ch] === undefined) { continue; }
			var held = 1;
			while (i + held < total && steps[i + held] === '-' && !((i + held) % half === 0 && timing.changes[(i + held) / half])) { held++; }
			var gate = role === 'stab' ? 0.86 : 0.97;
			strikes.push({
				t: at(i) + lazy + (spec.playing === 'held' ? 0 : (rnd() + rnd() - 1) * 0.005),
				dur: Math.max(0.05, (at(i + held) - at(i)) * gate - 0.012),
				kind: ch, chord: timing.chordAt[Math.floor(i / half)],
				lift: (rnd() - 0.5) * 1.6   // no two strikes quite as loud as each other (dB)
			});
		}
		return strikes;
	}

	// The notes of one strike: which, when (from the start of the strike) and how hard.
	function fingers(chord, kind, role, dur, rnd) {
		var vel = kind === 'H' ? 0.8 : VEL[kind], notes = [];
		if (role === 'strum' && kind !== 'H') {
			var up = kind === 'U' || kind === 'u', muted = kind === 'm';
			var picked = up ? chord.slice(-3).reverse() : chord.slice();
			var spread = Math.min(muted ? 0.006 : up ? 0.011 : kind === 'D' ? 0.016 : 0.022, dur * 0.5);
			picked.forEach(function (midi, k) {
				notes.push({ midi: midi, t: 0.001 + k * spread / Math.max(1, picked.length - 1), dur: dur, vel: Math.max(0.2, vel - k * 0.03 + (rnd() - 0.5) * 0.08), muted: muted, turn: k });
			});
		} else {
			chord.forEach(function (midi, k) {
				var isTop = k === chord.length - 1;
				// the hand comes down not quite all at once, and the top note sings a little
				notes.push({ midi: midi, t: 0.001 + (kind === 'H' ? 0 : k * 0.0025 + rnd() * 0.003), dur: dur, vel: Math.max(0.2, Math.min(1, vel + (isTop ? 0.05 : -0.02) + (rnd() - 0.5) * 0.08)), turn: k });
			});
		}
		return notes;
	}

	/* ---------- drawing a loop ---------- */

	// Strikes already drawn, kept by how much memory they take: the same chord comes round in loop after loop.
	var drawn = {}, drawnOrder = [], drawnBytes = 0, DRAWN_BUDGET = 28e6;
	function strike(key, make) {
		if (drawn[key]) { drawnOrder.splice(drawnOrder.indexOf(key), 1); drawnOrder.push(key); return drawn[key].made; }
		var entry = { made: make(), size: 0 };
		drawn[key] = entry; drawnOrder.push(key);
		entry.made.then(function (pcm) {
			if (drawn[key] !== entry) { return; }
			entry.size = pcm.length * 4; drawnBytes += entry.size;
			while (drawnBytes > DRAWN_BUDGET && drawnOrder.length > 1) {
				var old = drawnOrder.shift();
				if (drawn[old]) { drawnBytes -= drawn[old].size; delete drawn[old]; }
			}
		}, function () { if (drawn[key] === entry) { delete drawn[key]; var i = drawnOrder.indexOf(key); if (i !== -1) { drawnOrder.splice(i, 1); } } });
		return entry.made;
	}

	// How many samples there are in a bar. Every loop the app draws (chords, drums, a written out score)
	// uses this same sum, so they are all exactly as long as each other and stay locked together.
	function barFrames(bpm, rate) { return 2 * Math.round(240 / bpm * rate / 2); }

	// Step one, for one strike: its notes are wired into a drawing only as long as the strike itself,
	// and come back as plain samples.
	function struck(maker, played, packs, rate) {
		var last = 0;
		played.forEach(function (n) { last = Math.max(last, n.t + (n.muted ? 0.05 : n.dur)); });
		var oc = new OAC(1, Math.ceil((last + maker.tail + 0.02) * rate), rate);
		var env = { oc: oc, out: oc.destination, packs: packs };
		played.forEach(function (n) { maker.note(env, n); });
		return SND.render(oc).then(function (b) { return new Float32Array(b.getChannelData(0)); });
	}

	function floorOf(oc) {
		// nothing below the bottom of the chords gets through: that part of the room belongs to the bass
		var f = oc.createBiquadFilter();
		f.type = 'highpass'; f.frequency.value = 70; f.Q.value = 0.6;
		f.connect(oc.destination);
		return f;
	}
	function placed(oc, node, part, level, dest) {
		var strip = oc.createGain();
		strip.gain.value = level;
		node.connect(strip);
		if (part.pan && oc.createStereoPanner) { var pan = oc.createStereoPanner(); pan.pan.value = part.pan; strip.connect(pan); pan.connect(dest); }
		else { strip.connect(dest); }
	}

	/*
	 * Step three, for a loop: every player through their own effects, and (alongside, at half rate,
	 * since an echo has no top to lose) every player into one room; then the two are added together.
	 *   parts   [{maker, what, gain, pan, stem}]: each player's loop, laid and ready
	 *   o.fast  the organ's speaker spins fast
	 *   o.room  how much of the usual room, 0 to 1
	 * A promise of [left, right]. A bass goes round the chords' 70 Hz floor, not through it.
	 */
	function finished(parts, frames, rate, o) {
		var env = { seconds: frames / rate, fast: !!o.fast };
		var direct = SND.steady({ rate: rate, frames: frames, lead: 0.6, build: function (oc, play) {
			var sum = floorOf(oc);
			env.oc = oc;
			parts.forEach(function (part) {
				var node = play([part.stem.L]);
				if (part.maker.fx) { node = part.maker.fx(env, node); }
				placed(oc, node, part, part.gain, part.what.bass ? oc.destination : sum);
			});
		} });
		if (!(o.room > 0)) { return direct; }
		var echo = SND.steady({ rate: rate, frames: frames, lead: 1.5, half: true, build: function (oc, play) {
			var verb = oc.createConvolver(), wet = oc.createGain();
			verb.buffer = SND.room(oc, { seconds: 1.3, bright: 0.5, early: 0.25, seed: 5 });
			wet.gain.value = 3.2 * o.room;
			verb.connect(wet); wet.connect(floorOf(oc));
			parts.forEach(function (part) { placed(oc, play([part.stem.L]), part, part.gain * part.what.room, verb); });
		} });
		return Promise.all([direct, echo]).then(function (got) {
			var dry = got[0], wet = got[1];
			for (var ch = 0; ch < 2; ch++) {
				if (wet.half) { SND.addHalf(dry[ch], wet[ch]); }
				else { for (var i = 0; i < frames; i++) { dry[ch][i] += wet[ch][i]; } }
			}
			return dry;
		});
	}

	function draw(spec, packs, rate) {
		var sound = SOUND[spec.sound] || SOUNDS[0];
		var feel = KIT.feel(spec.feel);
		var grid = feel ? feel.grid : 16;
		// Which chord is sounding in each half bar, and where a new one starts.
		var barDur = 240 / spec.bpm, halves = 0, chordAt = [];
		spec.seq.forEach(function (c, i) {
			var n = c.bars * 2;
			if (!(n >= 1) || n !== Math.round(n)) { throw new Error('he-band: a chord lasts a whole number of half bars, and this one is down as ' + c.bars + ' bars'); }
			for (var h = 0; h < n; h++) { chordAt.push(i); }
			halves += n;
		});
		if (halves % 2) { throw new Error('he-band: the chords must add up to a whole number of bars, and these add up to ' + (halves / 2)); }
		var bars = halves / 2;
		var changes = chordAt.map(function (ci, h) { return spec.seq.length > 1 ? ci !== chordAt[(h - 1 + halves) % halves] : h === 0; });
		var bar = barFrames(spec.bpm, rate), frames = bars * bar, seconds = frames / rate;
		// Written out chords: if every chord says exactly which notes it is, those are played as they stand.
		var exact = spec.seq.every(function (c) { return c.notes && c.notes.length; }) ?
			spec.seq.map(function (c) { return c.notes.slice().sort(function (a, b) { return a - b; }); }) : null;
		var seed = [spec.sound, spec.feel, spec.bpm, spec.seed || 0, spec.playing, spec.take || 0].join('|');

		var clock = root.performance && root.performance.now ? function () { return root.performance.now(); } : Date.now;
		var began = clock(), took = {};

		// step one: for every player, each different strike is drawn once, on its own
		var jobs = [], parts = sound.parts.map(function (part, pi) {
			var name = part[0], role = part[1] === 'bubble' ? 'bubble' : part[1], what = INSTRUMENTS[name], maker = MAKERS[name];
			var timing = {
				grid: grid, bars: bars, halves: halves, barDur: barDur, step: barDur / grid, chordAt: chordAt, changes: changes,
				swing: feel && feel.swing && !spec.strict && spec.playing !== 'held' ? feel.swing : 0,
				rnd: SND.random(SND.hash(seed + '|' + pi))
			};
			var chords = exact || voice(spec.seq, SHAPES[what.shape]) || voice(spec.seq, SHAPES.keys);
			var strikes = arrange(spec, role === 'bubble' ? 'bubble' : role, timing);
			strikes.forEach(function (s) {
				var notes = chords[s.chord];
				// held lengths are rounded to the nearest hundredth of a second, so the same strike is found again
				var dur = Math.round(s.dur * 100) / 100;
				var key = [name, role, notes.join('.'), s.kind, dur, rate].join('|');
				s.key = key;
				if (jobs.some(function (j) { return j.key === key; })) { return; }
					jobs.push({ key: key, run: function () {
					return strike(key, function () {
						return struck(maker, fingers(notes, s.kind, role, dur, SND.random(SND.hash(key))), packs, rate);
					});
				} });
			});
			return { name: name, what: what, maker: maker, gain: gainOf(what.trim + part[2]), pan: part[3], strikes: strikes };
		});

		return SND.together(jobs.map(function (j) { return j.run; }), 4).then(function (pcms) {
			var byKey = {};
			jobs.forEach(function (j, i) { byKey[j.key] = pcms[i]; });
			took.strikes = clock() - began; took.different = jobs.length; began = clock();
			// step two: each player's strikes are laid into that player's own loop
			var laying = [];
			parts.forEach(function (part) {
				part.stem = { L: new Float32Array(frames), frames: frames, rate: rate };
				part.strikes.forEach(function (s) { laying.push([part.stem, s]); });
			});
			return SND.inTurns(laying, function (x) {
				SND.lay(x[0], byKey[x[1].key], { at: Math.round(x[1].t * rate), gain: gainOf(x[1].lift) });
			});
		}).then(function () {
			took.laying = clock() - began; began = clock();
			// step three: the effects and the room
			return finished(parts, frames, rate, { fast: spec.feel === 'Rock 8ths' || spec.feel === 'Shuffle', room: 1 });
		}).then(function (channels) {
			took.room = clock() - began;
			return { buffer: SND.asBuffer(channels, rate), length: seconds, bars: bars, took: took };
		});
	}

	/* ---------- written out notes ---------- */

	/*
	 * HOW LOUD WRITTEN NOTES ARE. The band's own loops are each levelled as a whole once they are drawn
	 * (he-synth.js brings every chord loop to the same average level). That will not do for a written
	 * line: one note in a bar would come out far louder than sixteen. So written notes are levelled in
	 * advance instead, by a fixed figure for each instrument, found once by measurement, and the
	 * "gain" that goes back with a score is simply 1 (or less, if that would clip).
	 *   chord instruments   one four note chord, struck at 0.8 and held for a bar at 90 to the minute,
	 *                       comes out as loud as the band's own held loop of the same chord
	 *   basses              a note struck at 0.85 measures -17 dBFS over its first 0.4 seconds
	 * These are decibels added to the instrument's usual trim.
	 */
	var WRITTEN = {
		rhodes: 0, glass: 0.4, grand: 3.6, upright: 3.9, organ: 1.1, vibes: 3, guitar: 3.9, nylon: -0.7, strings: 0.9, pad: -0.2, brass: 1,
		ebass: 2.1, ubass: 4.2, sbass: 7.8
	};

	// Step three for something played once (a note sounded when a fretboard is tapped): the same
	// effects as a loop gets, but from silence and straight through, with no going round. A bass on
	// its own with no room is one channel, which halves what has to be kept.
	function once(parts, frames, rate, o) {
		var mono = !o.stereo && parts.every(function (part) { return part.what.bass && !part.pan; });
		var oc = new OAC(mono ? 1 : 2, frames, rate), env = { oc: oc, seconds: frames / rate, fast: !!o.fast };
		var sum = floorOf(oc);
		parts.forEach(function (part) {
			var buf = oc.createBuffer(1, frames, rate), src = oc.createBufferSource();
			buf.getChannelData(0).set(part.stem.L);
			src.buffer = buf; src.start(0);
			placed(oc, part.maker.fx ? part.maker.fx(env, src) : src, part, part.gain, part.what.bass ? oc.destination : sum);
		});
		return SND.render(oc).then(function (b) {
			var out = [];
			for (var ch = 0; ch < b.numberOfChannels; ch++) { out.push(new Float32Array(b.getChannelData(ch))); }
			return out;
		});
	}

	/*
	 * THE ROOM, A STRIKE AT A TIME. A room does the same thing to a sound whenever it is played and
	 * whatever else is going on, so the echo of a whole loop is nothing more than the echoes of its
	 * strikes added together. The band's own loops put the finished loop through the room in one go.
	 * For written out notes each strike's echo is drawn once instead, kept beside the strike, and laid
	 * in wherever the strike falls. A question in an ear trainer is nearly always made of notes that
	 * have been heard before, and then there is no room left to draw at all: it comes out of the store.
	 * (The same room: the same impulse, the same 70 Hz floor, drawn at half rate as the band's is.)
	 * Gives the echo's two channels end to end in one array.
	 */
	var halfRoom = null; // not every browser will draw at half rate: found out the first time it is tried
	function echoOf(key, pcm, rate) {
		return strike(key + '|room', function () {
			var half = halfRoom !== false, at = half ? rate / 2 : rate, oc;
			var n = Math.ceil((pcm.length / rate + 1.32) * at);
			try { oc = new OAC(2, n, at); if (half) { halfRoom = true; } }
			catch (e) {
				if (!half) { throw e; }
				halfRoom = false; half = false; at = rate;
				n = Math.ceil((pcm.length / rate + 1.32) * at);
				oc = new OAC(2, n, at);
			}
			var buf = oc.createBuffer(1, pcm.length, rate), src = oc.createBufferSource(), verb = oc.createConvolver();
			buf.getChannelData(0).set(pcm);
			src.buffer = buf;
			verb.buffer = SND.room(oc, { seconds: 1.3, bright: 0.5, early: 0.25, seed: 5 });
			src.connect(verb); verb.connect(floorOf(oc));
			src.start(0);
			return SND.render(oc).then(function (b) {
				var out = new Float32Array(2 * n);
				out.set(b.getChannelData(0), 0); out.set(b.getChannelData(1), n);
				out.half = half;
				return out;
			});
		});
	}

	/*
	 * Notes that have been written out, drawn by the same three steps as the band's own loops and out
	 * of the same store of strikes.
	 *   o.frames        how long the loop is, in samples; 0 for something played once
	 *   o.beatFrames    samples in a beat (where each strike goes)
	 *   o.beatSeconds   seconds in a beat (how long each strike is held)
	 */
	function written(spec, packs, rate, o) {
		var clock = root.performance && root.performance.now ? function () { return root.performance.now(); } : Date.now;
		var began = clock(), took = {};
		var room = spec.room === undefined || spec.room === null ? 1 : Math.max(0, Math.min(1, spec.room));
		// Nothing is left to chance unless a seed is given. With one, each strike lands a few thousandths
		// of a second early or late and a shade louder or softer, as the band's own playing does.
		var rnd = spec.seed === undefined || spec.seed === null ? null : SND.random(SND.hash('written|' + spec.seed));

		// step one: each different strike is drawn once, on its own
		var jobs = [], seen = {};
		var parts = (spec.parts || []).map(function (p) {
			var name = p.inst, what = INSTRUMENTS[name], maker = MAKERS[name];
			if (!maker) { throw new Error('he-band: there is no instrument called ' + name); }
			if (what.pack && !(packs && packs[what.pack])) { throw new Error('he-band: the ' + name + ' needs its pack (' + what.pack + ') to have been loaded'); }
			var strikes = [];
			(p.strikes || []).forEach(function (s) {
				var notes = typeof s.notes === 'number' ? [s.notes] : (s.notes || []).slice();
				if (!notes.length) { return; }
				var vel = s.vel === undefined || s.vel === null ? 0.8 : Math.max(0.05, Math.min(1, s.vel));
				// held lengths are rounded to the nearest hundredth of a second, so the same strike is found again
				var dur = Math.max(0.03, Math.round((s.len === undefined || s.len === null ? 1 : s.len) * o.beatSeconds * 100) / 100);
				var spread = Math.max(0, s.spread || 0), muted = !!s.muted;
				var key = [name, 'written', notes.join('.'), vel, dur, spread, muted ? 1 : 0, rate].join('|');
				if (!seen[key]) {
					seen[key] = true;
					jobs.push({ key: key, run: function () {
						return strike(key, function () {
							return struck(maker, notes.map(function (midi, k) {
								return { midi: midi, t: 0.001 + k * spread, dur: dur, vel: vel, muted: muted, turn: k };
							}), packs, rate);
						}).then(function (pcm) {
							// and its echo, if it is going to have one
							if (!(room > 0 && what.room > 0)) { return { dry: pcm, wet: null }; }
							return echoOf(key, pcm, rate).then(function (wet) { return { dry: pcm, wet: wet }; });
						});
					} });
				}
				var at = Math.round((s.beat || 0) * o.beatFrames);
				if (rnd) { at += Math.round((rnd() + rnd() - 1) * 0.005 * rate); }
				strikes.push({ key: key, at: at, lift: rnd ? (rnd() - 0.5) * 1.6 : 0 });
			});
			return {
				name: name, what: what, maker: maker, strikes: strikes,
				gain: gainOf(what.trim + (WRITTEN[name] || 0) + (p.level || 0)), pan: Math.max(-1, Math.min(1, p.pan || 0))
			};
		});

		return SND.together(jobs.map(function (j) { return j.run; }), 4).then(function (pcms) {
			var byKey = {};
			jobs.forEach(function (j, i) { byKey[j.key] = pcms[i]; });
			took.strikes = clock() - began; took.different = jobs.length; began = clock();
			// step two: each part's strikes are laid into that part's own loop, and their echoes into the room's
			var frames = o.frames, laying = [], echoes = false, halved = false;
			parts.forEach(function (part) {
				part.strikes.forEach(function (s) { if (byKey[s.key].wet) { echoes = true; halved = byKey[s.key].wet.half; } });
			});
			if (!frames) {
				// played once: long enough for the last strike, and its echo, to finish ringing
				parts.forEach(function (part) {
					part.strikes.forEach(function (s) { s.at = Math.max(0, s.at); frames = Math.max(frames, s.at + byKey[s.key].dry.length); });
				});
				frames += Math.round((echoes ? 1.36 : 0.04) * rate);
				frames += frames % 2;
			}
			// The room is kept at half rate, so a strike that falls on an odd sample would have its echo one
			// sample out. Those echoes are laid in a second pair of loops, which is added on one sample later.
			var wet = echoes ? { n: halved ? frames / 2 : frames, half: halved, even: null, odd: null } : null;
			function roomLoops() {
				return [{ L: new Float32Array(wet.n), frames: wet.n, rate: rate }, { L: new Float32Array(wet.n), frames: wet.n, rate: rate }];
			}
			parts.forEach(function (part) {
				part.stem = { L: new Float32Array(frames), frames: frames, rate: rate };
				part.strikes.forEach(function (s) { laying.push([part, s]); });
			});
			return SND.inTurns(laying, function (x) {
				var part = x[0], s = x[1], got = byKey[s.key];
				// (a strike written before the top of the loop, or after its end, comes round to the other end)
				var at = ((s.at % frames) + frames) % frames, lift = gainOf(s.lift);
				SND.lay(part.stem, got.dry, { at: at, gain: lift });
				if (got.wet) {
					// how much of this part goes to the room, and to which side of it
					var send = lift * part.gain * part.what.room * 3.2 * room, left = send, right = send, n = got.wet.length / 2;
					if (part.pan) { left = send * Math.cos((part.pan + 1) * Math.PI / 4); right = send * Math.sin((part.pan + 1) * Math.PI / 4); }
					var late = wet.half && at % 2 === 1, where = wet.half ? (at - at % 2) / 2 : at;
					var loops = late ? (wet.odd = wet.odd || roomLoops()) : (wet.even = wet.even || roomLoops());
					SND.lay(loops[0], got.wet, { from: 0, len: n, at: where, gain: left });
					SND.lay(loops[1], got.wet, { from: n, len: n, at: where, gain: right });
				}
			}).then(function () { return { frames: frames, wet: wet }; });
		}).then(function (laid) {
			took.laying = clock() - began; began = clock();
			// step three: the effects (the room is laid already, and only has to be added)
			var frames = laid.frames, wet = laid.wet, how = { fast: !!spec.fast, room: 0, stereo: !!wet };
			return (o.frames ? finished(parts, frames, rate, how) : once(parts, frames, rate, how)).then(function (channels) {
				if (wet) {
					channels.forEach(function (out, ch) {
						var i;
						if (wet.even && wet.half) { SND.addHalf(out, wet.even[ch].L); }
						else if (wet.even) { for (i = 0; i < frames; i++) { out[i] += wet.even[ch].L[i]; } }
						if (wet.odd) {
							var one = new Float32Array(frames);
							SND.addHalf(one, wet.odd[ch].L);
							for (i = 1; i < frames; i++) { out[i] += one[i - 1]; }
							out[0] += one[frames - 1];
						}
					});
				}
				if (!o.frames) {
					// played once: whatever is still ringing at the very end is faded, so it cannot click
					var fade = Math.min(frames, Math.round(0.02 * rate));
					channels.forEach(function (d) { for (var i = 0; i < fade; i++) { d[frames - 1 - i] *= i / fade; } });
				}
				took.room = clock() - began;
				var peak = 0;
				channels.forEach(function (d) {
					for (var i = 0; i < d.length; i++) { var x = d[i]; if (x > peak) { peak = x; } else if (-x > peak) { peak = -x; } }
				});
				return { buffer: SND.asBuffer(channels, rate), length: frames / rate, gain: peak > 0.95 ? 0.95 / peak : 1, took: took };
			});
		});
	}

	// A loop written out note by note: see the top of the file for what a spec holds.
	function score(spec, packs, rate) {
		var bars = spec.bars;
		if (!(bars >= 1) || bars !== Math.round(bars)) { throw new Error('he-band: a score is a whole number of bars long, and this one is down as ' + bars); }
		if (!(spec.bpm > 0)) { throw new Error('he-band: a score needs a tempo'); }
		var bar = barFrames(spec.bpm, rate);
		return written(spec, packs, rate, { frames: bars * bar, beatFrames: bar / 4, beatSeconds: 60 / spec.bpm }).then(function (part) {
			part.bars = bars;
			return part;
		});
	}

	// One note (or a few at once), played once and left to ring: for sounding a note the moment it is tapped.
	function note(inst, midi, o, packs, rate) {
		o = o || {};
		var what = INSTRUMENTS[inst];
		var room = o.room === undefined || o.room === null ? (what && what.bass ? 0 : 1) : o.room;
		return written({
			parts: [{ inst: inst, strikes: [{ beat: 0, len: o.len === undefined || o.len === null ? 1.2 : o.len, notes: midi, vel: o.vel, spread: o.spread, muted: o.muted }] }],
			room: room
		}, packs, rate, { frames: 0, beatFrames: rate, beatSeconds: 1 });
	}

	// The packs a score's instruments need.
	function packsFor(spec) {
		var out = [];
		((spec && spec.parts) || []).forEach(function (p) {
			var what = INSTRUMENTS[p.inst];
			if (what && what.pack && out.indexOf(what.pack) === -1) { out.push(what.pack); }
		});
		return out;
	}

	HE.band = {
		supported: !!OAC,
		SOUNDS: SOUNDS, INSTRUMENTS: INSTRUMENTS, COMP: COMP, BASSES: BASSES, STAND_IN: STAND_IN, WRITTEN: WRITTEN, EVEN: EVEN, TUNE: TUNE,
		sound: function (id) { return SOUND[id] || null; },
		voice: voice, SHAPES: SHAPES,
		draw: draw, score: score, note: note, packsFor: packsFor
	};
}(typeof window !== 'undefined' ? window : globalThis));
