/*
 * Leith Bass Space: tanpura drone.
 *
 * Four strings in the classical tuning (Pa, Sa, Sa, low Sa), plucked in a
 * steady cycle. Each pluck is synthesised once, additively, with a moving
 * band of upper partials that imitates the tanpura's curved bridge (jawari):
 * the brightness blooms after the pluck and slides down through the
 * harmonics, so the overtones seem to sing. The plucks are mixed into one
 * long seamless loop (tails wrapped round to the start) that plays on the
 * audio clock until stopped. No page timers are involved once it starts.
 *
 * LBSDrone.create() -> drone
 *   drone.play(opts)   start (or change) the drone; returns a promise
 *   drone.set(opts)    change settings; crossfades if playing
 *   drone.stop()       fade out and stop
 *   drone.playing      true while sounding
 *   drone.onstate      fn(state) called with 'tuning' | 'playing' | 'stopped'
 *   drone.onpluck      fn(stringIndex) called as each string sounds (for visuals)
 *
 * opts: note 0-11 (C = 0), first 'pa' | 'ma' | 'ni' | 'sa',
 *       register -1 | 0 | 1, pace 'slow' | 'medium' | 'fast',
 *       a4 (Hz, default 440), volume 0-1,
 *       tuning 'just' (pure intervals, as a tanpura is tuned by ear) or
 *       'equal' (the first string matches a fretted instrument exactly).
 */
(function (root) {
	'use strict';

	var NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
	var FIRST = { pa: 3 / 2, ma: 4 / 3, ni: 15 / 8, sa: 2 };
	var FIRST_EQUAL = { pa: Math.pow(2, 7 / 12), ma: Math.pow(2, 5 / 12), ni: Math.pow(2, 11 / 12), sa: 2 };
	var PACE = { slow: 1.3, medium: 1, fast: 0.8 };
	var CYCLES = 6;
	var CACHE_MAX = 4;

	function defaults(o) {
		o = o || {};
		return {
			note: o.note == null ? 2 : ((+o.note % 12) + 12) % 12,
			first: FIRST[o.first] ? o.first : 'pa',
			register: o.register == null ? 0 : Math.max(-1, Math.min(1, +o.register)),
			pace: PACE[o.pace] ? o.pace : 'medium',
			a4: +o.a4 > 400 && +o.a4 < 480 ? +o.a4 : 440,
			tuning: o.tuning === 'equal' ? 'equal' : 'just',
			volume: o.volume == null ? 0.8 : Math.max(0, Math.min(1, +o.volume))
		};
	}

	/* A small seeded random, so a given setting always sounds the same. */
	function rng(seed) {
		var s = seed >>> 0 || 1;
		return function () {
			s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
			return s / 4294967296;
		};
	}

	function freq(noteIndex, octave, a4) {
		var midi = 12 * (octave + 1) + noteIndex;
		return a4 * Math.pow(2, (midi - 69) / 12);
	}

	/* The four strings for a setting: frequency, level, pan, detune (cents). */
	function strings(o) {
		var lowSa = freq(o.note, 2 + o.register, o.a4);
		var ratio = (o.tuning === 'equal' ? FIRST_EQUAL : FIRST)[o.first];
		return [
			{ f: lowSa * ratio, gain: 0.78, pan: -0.28, cents: 0 },
			{ f: lowSa * 2, gain: 0.86, pan: 0.18, cents: 0 },
			{ f: lowSa * 2, gain: 0.82, pan: -0.08, cents: 2.5 },
			{ f: lowSa, gain: 1.0, pan: 0.06, cents: 0 }
		];
	}

	/* ---------------------------------------------------------------------
	 * One pluck, rendered offline. Returns a promise of Float32Array (mono).
	 * ------------------------------------------------------------------- */
	function renderPluck(f, rate, seed) {
		var R = rng(seed);
		var dur = f < 90 ? 12 : 10;
		var len = Math.ceil(dur * rate);
		var OAC = root.OfflineAudioContext || root.webkitOfflineAudioContext;
		var ctx = new OAC(1, len, rate);

		// The gourd and the wood: two gentle resonances and a softened top end.
		var body1 = ctx.createBiquadFilter(); body1.type = 'peaking'; body1.frequency.value = 190; body1.Q.value = 1.1; body1.gain.value = 3;
		var body2 = ctx.createBiquadFilter(); body2.type = 'peaking'; body2.frequency.value = 460; body2.Q.value = 1.4; body2.gain.value = 2;
		var air = ctx.createBiquadFilter(); air.type = 'highshelf'; air.frequency.value = 5200; air.gain.value = -5;
		var out = ctx.createGain();
		out.connect(body1); body1.connect(body2); body2.connect(air); air.connect(ctx.destination);

		var maxF = Math.min(7500, rate * 0.45);
		var B = 0.000006;                     // a hint of string stiffness (tanpura strings are thin)
		var T1 = f < 90 ? 10 : 8;             // long-term decay of the fundamental (s)
		var beta = 0.11 + R() * 0.05;         // where along the string it's plucked
		var cStart = Math.min(34, Math.max(10, 5200 / f));
		var tau = 1.9;                        // how fast the bright band slides down
		var RES = 150;                        // envelope points per second
		var pts = Math.ceil(dur * RES);
		var fadeFrom = pts - Math.ceil(0.9 * RES);

		// One slow pitch drift shared by every partial: strings breathe a little.
		var drift = ctx.createConstantSource();
		var dcurve = new Float32Array(Math.ceil(dur * 20));
		var walk = 0, vel = 0;
		for (var di = 0; di < dcurve.length; di++) {
			vel = vel * 0.96 + (R() - 0.5) * 0.12;
			walk = Math.max(-2.2, Math.min(2.2, walk + vel));
			dcurve[di] = walk;                // cents
		}
		drift.offset.setValueCurveAtTime(dcurve, 0, dur);
		drift.start(0);

		// The bloom shared by partials and the buzz: rises after the pluck, then fades.
		function bloomAt(t) { return 3.0 * Math.exp(-t / 6) * (1 - Math.exp(-t / 0.25)); }
		function centreAt(t) { return 2.5 + (cStart - 2.5) * Math.exp(-t / tau); }

		for (var n = 1; n <= 56; n++) {
			var fn = n * f * Math.sqrt(1 + B * n * n);
			if (fn > maxF) { break; }
			var comb = Math.max(0.12, Math.abs(Math.sin(n * Math.PI * beta)));
			var A = comb * Math.pow(n, -0.95) / (1 + Math.pow(fn / 3200, 2));
			var Tn = T1 / (1 + 0.05 * (n - 1));
			var flutterRate = 0.2 + R() * 0.7;
			var flutterPhase = R() * Math.PI * 2;
			var curve = new Float32Array(pts);
			for (var i = 0; i < pts; i++) {
				var t = i / RES;
				var c = centreAt(t);
				var w = 2.2 + 0.14 * c;
				var d = n - c;
				var bloom = 1 + bloomAt(t) * Math.exp(-(d * d) / (2 * w * w));
				var decay = 0.55 * Math.exp(-t / (Tn * 0.22)) + 0.45 * Math.exp(-t / Tn);   // quick drop, long ring
				var attack = 1 - Math.exp(-t / 0.004);
				var flutter = 1 + 0.045 * Math.sin(2 * Math.PI * flutterRate * t + flutterPhase);
				var v = A * decay * bloom * attack * flutter;
				if (i >= fadeFrom) { v *= 1 - (i - fadeFrom) / (pts - fadeFrom); }
				curve[i] = v;
			}
			var osc = ctx.createOscillator();
			var g = ctx.createGain();
			osc.type = 'sine';
			osc.frequency.setValueAtTime(fn * 1.003, 0);     // a pluck starts a hair sharp and settles
			osc.frequency.setTargetAtTime(fn, 0, 0.12);
			osc.detune.value = (R() - 0.5) * 1.6;             // no two partials quite alike
			drift.connect(osc.detune);
			g.gain.setValueAtTime(0, 0);
			g.gain.setValueCurveAtTime(curve, 0, dur);
			osc.connect(g);
			g.connect(out);
			osc.start(0);
			osc.stop(dur);
		}

		// The jawari buzz: a faint, band-limited sizzle that follows the bright band down.
		var buzzLen = Math.ceil(dur * rate);
		var bb = ctx.createBuffer(1, buzzLen, rate);
		var bd = bb.getChannelData(0);
		for (var k = 0; k < buzzLen; k++) { bd[k] = R() * 2 - 1; }
		var buzz = ctx.createBufferSource(); buzz.buffer = bb;
		var bpf = ctx.createBiquadFilter(); bpf.type = 'bandpass'; bpf.Q.value = 2.2;
		var bg = ctx.createGain();
		var fc = new Float32Array(pts), gc = new Float32Array(pts);
		for (var j = 0; j < pts; j++) {
			var tt = j / RES;
			fc[j] = Math.max(700, Math.min(6500, centreAt(tt) * f));
			gc[j] = 0.006 * bloomAt(tt) * Math.exp(-tt / (T1 * 0.35)) * (j >= fadeFrom ? 1 - (j - fadeFrom) / (pts - fadeFrom) : 1);
		}
		bpf.frequency.setValueCurveAtTime(fc, 0, dur);
		bg.gain.setValueAtTime(0, 0);
		bg.gain.setValueCurveAtTime(gc, 0, dur);
		buzz.connect(bpf); bpf.connect(bg); bg.connect(out);
		buzz.start(0);

		// The finger on the string: a very short, soft noise at the attack.
		var nlen = Math.ceil(0.05 * rate);
		var nb = ctx.createBuffer(1, nlen, rate);
		var nd = nb.getChannelData(0);
		for (var m2 = 0; m2 < nlen; m2++) { nd[m2] = (R() * 2 - 1) * Math.exp(-m2 / (0.008 * rate)); }
		var ns = ctx.createBufferSource();
		ns.buffer = nb;
		var bp = ctx.createBiquadFilter();
		bp.type = 'bandpass';
		bp.frequency.value = 1800;
		bp.Q.value = 0.6;
		var ng = ctx.createGain();
		ng.gain.value = 0.04;
		ns.connect(bp); bp.connect(ng); ng.connect(out);
		ns.start(0);

		return ctx.startRendering().then(function (buf) {
			var data = buf.getChannelData(0);
			var peak = 0;
			for (var q = 0; q < data.length; q++) { var a = Math.abs(data[q]); if (a > peak) { peak = a; } }
			if (peak > 0) { for (var r = 0; r < data.length; r++) { data[r] /= peak; } }
			return data;
		});
	}

	/* ---------------------------------------------------------------------
	 * The loop: four cycles of plucks, with tiny human variations, tails
	 * wrapped round so the end joins the start without a seam.
	 * ------------------------------------------------------------------- */
	var cache = {};

	function keyOf(o, rate) { return [o.note, o.first, o.register, o.pace, o.a4, o.tuning, rate].join('|'); }

	function buildLoop(ctx, o) {
		var rate = ctx.sampleRate;
		var key = keyOf(o, rate);
		if (cache[key]) { cache[key].used = Date.now(); return Promise.resolve(cache[key]); }

		var strs = strings(o);
		var seedBase = o.note * 131 + (o.register + 2) * 17 + Object.keys(FIRST).indexOf(o.first) * 7;
		var jobs = strs.map(function (s, i) {
			return renderPluck(s.f * Math.pow(2, s.cents / 1200), rate, seedBase + i * 1009);
		});

		return Promise.all(jobs).then(function (plucks) {
			var p = PACE[o.pace];
			var gap = 1.25 * p;                 // between strings
			var cycle = 6.0 * p;                // one round of four, with the breath after low Sa
			var loopSec = cycle * CYCLES;
			var L = Math.round(loopSec * rate);
			var left = new Float32Array(L), right = new Float32Array(L);
			var R = rng(seedBase + 77);
			var events = [];

			for (var c = 0; c < CYCLES; c++) {
				for (var s = 0; s < 4; s++) {
					var t = c * cycle + s * gap + (R() - 0.5) * 0.05 * p;
					var g = strs[s].gain * (0.93 + R() * 0.12);
					var angle = (strs[s].pan + 1) * Math.PI / 4;
					var gl = Math.cos(angle) * g, gr = Math.sin(angle) * g;
					var start = ((Math.round(t * rate) % L) + L) % L;
					var src = plucks[s];
					events.push({ at: start / rate, string: s });
					// Each pluck a little different: some softer, some brighter.
					var soft = R() * 0.4, lp = 0, coef = 0.22 + R() * 0.2;
					for (var i = 0; i < src.length; i++) {
						lp += coef * (src[i] - lp);
						var v = src[i] * (1 - soft) + lp * soft;
						var idx = start + i;
						if (idx >= L) { idx %= L; }
						left[idx] += v * gl;
						right[idx] += v * gr;
					}
				}
			}

			var peak = 0;
			for (var j = 0; j < L; j++) {
				var a = Math.max(Math.abs(left[j]), Math.abs(right[j]));
				if (a > peak) { peak = a; }
			}
			var norm = peak > 0 ? 0.72 / peak : 1;
			var buf = ctx.createBuffer(2, L, rate);
			var bl = buf.getChannelData(0), br = buf.getChannelData(1);
			for (var q = 0; q < L; q++) { bl[q] = left[q] * norm; br[q] = right[q] * norm; }

			events.sort(function (x, y) { return x.at - y.at; });
			var result = { buffer: buf, length: loopSec, events: events, used: Date.now() };
			cache[key] = result;
			var keys = Object.keys(cache);
			if (keys.length > CACHE_MAX) {      // keep memory in check on phones
				keys.sort(function (x, y) { return cache[x].used - cache[y].used; });
				for (var e = 0; e < keys.length - CACHE_MAX; e++) { delete cache[keys[e]]; }
			}
			return result;
		});
	}

	/* A soft room, generated rather than downloaded. */
	function makeRoom(ctx) {
		var rate = ctx.sampleRate, secs = 3.2, len = Math.ceil(secs * rate), pre = Math.ceil(0.018 * rate);
		var ir = ctx.createBuffer(2, len, rate);
		var R = rng(4242);
		for (var ch = 0; ch < 2; ch++) {
			var d = ir.getChannelData(ch), lp = 0;
			for (var i = pre; i < len; i++) {
				var t = (i - pre) / rate;
				var white = R() * 2 - 1;
				lp += (white - lp) * (0.18 + 0.5 * Math.exp(-t / 0.4)); // darker as it decays
				d[i] = lp * Math.exp(-t / 0.85);
			}
		}
		var conv = ctx.createConvolver();
		conv.normalize = true;
		conv.buffer = ir;
		return conv;
	}

	/* iPhones mute web audio with the ring switch unless told it's playback. */
	function preferPlayback() {
		try {
			if (root.navigator && 'audioSession' in root.navigator) { root.navigator.audioSession.type = 'playback'; return; }
		} catch (e) { /* not supported */ }
		// Older iOS: a silent looping <audio> element has the same effect.
		var ua = (root.navigator && root.navigator.userAgent) || '';
		if (!/iPhone|iPad|iPod/.test(ua) || root.__lbsSilent) { return; }
		try {
			var rate = 8000, n = rate / 2, bytes = new Uint8Array(44 + n);
			var dv = new DataView(bytes.buffer);
			var w = function (o, s) { for (var i = 0; i < s.length; i++) { bytes[o + i] = s.charCodeAt(i); } };
			w(0, 'RIFF'); dv.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true);
			dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, rate, true); dv.setUint32(28, rate, true);
			dv.setUint16(32, 1, true); dv.setUint16(34, 8, true); w(36, 'data'); dv.setUint32(40, n, true);
			for (var k = 44; k < bytes.length; k++) { bytes[k] = 128; }
			var el = new root.Audio(URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' })));
			el.loop = true;
			el.setAttribute('playsinline', '');
			var p = el.play();
			if (p && p.catch) { p.catch(function () {}); }
			root.__lbsSilent = el;
		} catch (e2) { /* nothing more to try */ }
	}

	function create() {
		var d = {
			playing: false,
			settings: defaults(),
			onstate: null,
			onpluck: null
		};
		var ctx = null, master = null, current = null, lock = null, raf = 0, token = 0;

		function state(s) { if (typeof d.onstate === 'function') { d.onstate(s); } }

		function ensure() {
			if (ctx) { return ctx; }
			preferPlayback();
			var AC = root.AudioContext || root.webkitAudioContext;
			ctx = new AC({ latencyHint: 'playback' });
			var comp = ctx.createDynamicsCompressor();
			comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 3;
			comp.attack.value = 0.02; comp.release.value = 0.4;
			master = ctx.createGain();
			master.gain.value = d.settings.volume;
			var dry = ctx.createGain(); dry.gain.value = 0.82;
			var wet = ctx.createGain(); wet.gain.value = 0.3;
			var room = makeRoom(ctx);
			d._bus = ctx.createGain();
			d._bus.connect(dry); d._bus.connect(room); room.connect(wet);
			dry.connect(comp); wet.connect(comp); comp.connect(master); master.connect(ctx.destination);
			return ctx;
		}

		function keepAwake(on) {
			var nav = root.navigator;
			if (on) {
				if (lock || !nav || !nav.wakeLock) { return; }
				nav.wakeLock.request('screen').then(function (l) { lock = l; }, function () {});
			} else if (lock) {
				lock.release().catch(function () {});
				lock = null;
			}
		}

		function mediaInfo() {
			var nav = root.navigator;
			if (!nav || !nav.mediaSession || !root.MediaMetadata) { return; }
			try {
				nav.mediaSession.metadata = new root.MediaMetadata({ title: 'Drone in ' + NOTE_NAMES[d.settings.note], artist: 'The Shed · Leith Bass Space' });
				nav.mediaSession.setActionHandler('pause', function () { d.stop(); });
				nav.mediaSession.setActionHandler('stop', function () { d.stop(); });
			} catch (e) { /* optional */ }
		}

		function watchPlucks() {
			cancelAnimationFrame(raf);
			if (!current || typeof d.onpluck !== 'function') { return; }
			var last = -1;
			(function tick() {
				if (!current) { return; }
				var pos = (ctx.currentTime - current.started) % current.loop.length;
				if (pos < 0) { pos += current.loop.length; }
				var ev = current.loop.events, hit = -1;
				for (var i = 0; i < ev.length; i++) { if (ev[i].at <= pos) { hit = i; } }
				if (hit !== last) { last = hit; if (hit >= 0) { d.onpluck(ev[hit].string); } }
				raf = requestAnimationFrame(tick);
			}());
		}

		function startLoop(loop, fadeIn) {
			var src = ctx.createBufferSource();
			src.buffer = loop.buffer;
			src.loop = true;
			var g = ctx.createGain();
			var now = ctx.currentTime + 0.05;
			g.gain.setValueAtTime(0.0001, now);
			g.gain.exponentialRampToValueAtTime(1, now + fadeIn);
			src.connect(g); g.connect(d._bus);
			src.start(now);
			return { src: src, gain: g, loop: loop, started: now };
		}

		function fadeOut(voice, secs) {
			if (!voice) { return; }
			var now = ctx.currentTime;
			voice.gain.gain.cancelScheduledValues(now);
			voice.gain.gain.setValueAtTime(Math.max(voice.gain.gain.value, 0.0001), now);
			voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + secs);
			voice.src.stop(now + secs + 0.05);
		}

		d.play = function (opts) {
			var o = defaults(Object.assign({}, d.settings, opts || {}));
			var changed = keyOf(o, 0) !== keyOf(d.settings, 0);
			d.settings = o;
			ensure();
			if (ctx.state === 'suspended' && ctx.resume) { ctx.resume(); }
			master.gain.setTargetAtTime(o.volume, ctx.currentTime, 0.05);
			if (d.playing && current && !changed) { return Promise.resolve(); }
			var mine = ++token;
			state('tuning');
			return buildLoop(ctx, o).then(function (loop) {
				if (mine !== token) { return; }       // settings changed again while tuning
				var old = current;
				current = startLoop(loop, old ? 1.4 : 2.2);
				if (old) { fadeOut(old, 1.4); }
				d.playing = true;
				keepAwake(true);
				mediaInfo();
				watchPlucks();
				state('playing');
			});
		};

		d.set = function (opts) {
			var o = defaults(Object.assign({}, d.settings, opts || {}));
			if (!d.playing) { d.settings = o; if (master) { master.gain.value = o.volume; } return Promise.resolve(); }
			return d.play(o);
		};

		d.stop = function () {
			token++;
			if (current) { fadeOut(current, 1.2); current = null; }
			cancelAnimationFrame(raf);
			d.playing = false;
			keepAwake(false);
			state('stopped');
		};

		/* Pre-render a setting in the background (e.g. the next likely note). */
		d.prepare = function (opts) {
			ensure();
			return buildLoop(ctx, defaults(Object.assign({}, d.settings, opts || {})));
		};

		/* A wake lock is dropped when the page is hidden; take it back. */
		if (root.document) {
			root.document.addEventListener('visibilitychange', function () {
				if (root.document.visibilityState === 'visible' && d.playing) {
					lock = null; keepAwake(true);
					if (ctx && ctx.state === 'suspended') { ctx.resume(); }
				}
			});
		}
		return d;
	}

	root.LBSDrone = {
		create: create,
		NOTE_NAMES: NOTE_NAMES,
		strings: function (o) { return strings(defaults(o)); },
		_renderPluck: renderPluck,
		_buildLoop: buildLoop,
		_defaults: defaults
	};
}(typeof window !== 'undefined' ? window : this));
