/*
 * Leith Bass Space: the Shed tuner.
 *
 * YIN pitch detection (de Cheveigné and Kawahara, 2002), run on a copy of the
 * input brought down to about 12 kHz so a low B (30.9 Hz) fits comfortably in
 * the window on a phone, then refined at the full sample rate.
 *
 * LBSTuner.detect(samples, sampleRate) -> {hz, clarity} or null
 * LBSTuner.note(hz, a4)               -> {name, octave, midi, cents, target}
 * LBSTuner.create() -> t
 *   t.start() (asks for the microphone), t.stop(), t.running
 *   t.onpitch = fn({hz, clarity, level} | null)
 */
(function (root) {
	'use strict';

	var NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

	function yin(x, sr, minHz, maxHz, threshold) {
		var n = x.length, half = Math.floor(n / 2);
		var tauMin = Math.max(2, Math.floor(sr / maxHz)), tauMax = Math.min(half - 1, Math.ceil(sr / minHz));
		var dfn = new Float32Array(tauMax + 2), cmnd = new Float32Array(tauMax + 2);
		for (var tau = 1; tau <= tauMax + 1; tau++) {
			var s = 0;
			for (var i = 0; i < half; i++) { var dlt = x[i] - x[i + tau]; s += dlt * dlt; }
			dfn[tau] = s;
		}
		cmnd[0] = 1;
		var run = 0;
		for (var t = 1; t <= tauMax + 1; t++) { run += dfn[t]; cmnd[t] = run ? dfn[t] * t / run : 1; }
		var best = -1;
		for (var k = tauMin; k <= tauMax; k++) {
			if (cmnd[k] < threshold) {
				while (k + 1 <= tauMax && cmnd[k + 1] < cmnd[k]) { k++; }
				best = k; break;
			}
		}
		if (best < 0) {
			// No clear dip: take the deepest, and report it as unclear.
			var mv = Infinity;
			for (var j = tauMin; j <= tauMax; j++) { if (cmnd[j] < mv) { mv = cmnd[j]; best = j; } }
			if (mv > 0.35) { return null; }
		}
		var a = cmnd[best - 1], b = cmnd[best], c = cmnd[best + 1];
		var shift = (a + c - 2 * b) ? (a - c) / (2 * (a + c - 2 * b)) : 0;
		return { tau: best + Math.max(-1, Math.min(1, shift)), clarity: 1 - b };
	}

	function detect(samples, sr) {
		var n = samples.length, rms = 0;
		for (var i = 0; i < n; i++) { rms += samples[i] * samples[i]; }
		rms = Math.sqrt(rms / n);
		if (rms < 0.004) { return null; }
		// Down to ~12 kHz with a simple averaging filter.
		var f = Math.max(1, Math.round(sr / 12000)), m = Math.floor(n / f), low = new Float32Array(m);
		for (var k = 0; k < m; k++) { var s = 0; for (var q = 0; q < f; q++) { s += samples[k * f + q]; } low[k] = s / f; }
		var lsr = sr / f;
		var r = yin(low, lsr, 25, 1200, 0.15);
		if (!r) { return null; }
		// Refine at the full rate around the coarse period.
		var guess = r.tau * f, lo = Math.max(2, Math.floor(guess - f - 2)), hi = Math.ceil(guess + f + 2), half = Math.floor(n / 2);
		if (hi + 1 < half) {
			var bestT = lo, bestV = Infinity, vals = {};
			for (var tau = lo - 1; tau <= hi + 1; tau++) {
				var d = 0;
				for (var j = 0; j < half; j++) { var x = samples[j] - samples[j + tau]; d += x * x; }
				vals[tau] = d;
				if (tau >= lo && tau <= hi && d < bestV) { bestV = d; bestT = tau; }
			}
			var a = vals[bestT - 1], b = vals[bestT], c = vals[bestT + 1];
			var sh = (a + c - 2 * b) ? (a - c) / (2 * (a + c - 2 * b)) : 0;
			return { hz: sr / (bestT + Math.max(-1, Math.min(1, sh))), clarity: r.clarity, level: rms };
		}
		return { hz: lsr / r.tau, clarity: r.clarity, level: rms };
	}

	function note(hz, a4) {
		a4 = a4 || 440;
		var midiF = 69 + 12 * Math.log(hz / a4) / Math.LN2, midi = Math.round(midiF);
		return { name: NAMES[((midi % 12) + 12) % 12], octave: Math.floor(midi / 12) - 1, midi: midi, cents: (midiF - midi) * 100, target: a4 * Math.pow(2, (midi - 69) / 12) };
	}

	function create() {
		var t = { running: false, onpitch: null };
		var ctx = null, stream = null, src = null, an = null, buf = null, timer = null, hist = [];
		t.start = function () {
			if (t.running) { return Promise.resolve(); }
			var md = root.navigator && root.navigator.mediaDevices;
			if (!md || !md.getUserMedia) { return Promise.reject(new Error('nomic')); }
			return md.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }).then(function (s) {
				stream = s;
				var AC = root.AudioContext || root.webkitAudioContext;
				ctx = ctx || new AC();
				if (ctx.state === 'suspended') { ctx.resume(); }
				src = ctx.createMediaStreamSource(stream);
				an = ctx.createAnalyser();
				an.fftSize = 8192;
				buf = new Float32Array(an.fftSize);
				src.connect(an);
				t.running = true;
				hist = [];
				timer = setInterval(function () {
					if (an.getFloatTimeDomainData) { an.getFloatTimeDomainData(buf); } else { var b8 = new Uint8Array(an.fftSize); an.getByteTimeDomainData(b8); for (var i = 0; i < b8.length; i++) { buf[i] = (b8[i] - 128) / 128; } }
					var r = detect(buf, ctx.sampleRate);
					if (r && r.clarity > 0.8) {
						hist.push(r.hz); if (hist.length > 5) { hist.shift(); }
						var sorted = hist.slice().sort(function (x, y) { return x - y; });
						r.hz = sorted[Math.floor(sorted.length / 2)];
					} else { hist = []; r = null; }
					if (typeof t.onpitch === 'function') { t.onpitch(r); }
				}, 80);
			});
		};
		t.stop = function () {
			clearInterval(timer); timer = null;
			if (src) { try { src.disconnect(); } catch (e) { /* gone */ } }
			if (stream) { stream.getTracks().forEach(function (tr) { tr.stop(); }); }
			stream = null; src = null; t.running = false;
		};
		return t;
	}

	root.LBSTuner = { create: create, detect: detect, note: note, NAMES: NAMES };
}(typeof window !== 'undefined' ? window : this));
