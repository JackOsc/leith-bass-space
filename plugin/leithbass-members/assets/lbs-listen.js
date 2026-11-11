/*
 * Leith Bass Space: hearing notes played on a bass.
 *
 * The Shed's tuner already knows what pitch is sounding (shed-tuner.js, down
 * to a low B). This turns that stream of pitches into notes: "a C was played,
 * then an E". The ear trainer uses it so that a question can be answered on
 * the instrument: no buttons, just the bass through the microphone.
 *
 * A note counts once the same pitch has been heard clearly for about a tenth
 * of a second. The same note played again counts again if it was struck
 * afresh (it got louder) or there was a silence in between. Octaves are told
 * apart as well as the detector can, but whoever uses this should compare
 * pitch classes: a low string's octave is easy to mistake, its note is not.
 *
 * Needs LBSTuner (shed-tuner.js) on the page first.
 *
 * LBSListen.create(o) -> l          o.every: milliseconds between looks (50); o.window: samples looked at (8192)
 *   l.start()                       asks for the microphone; a promise
 *   l.stop()
 *   l.running
 *   l.onnote  = fn({midi, pc, cents, hz, level, at})    a note has been played (at: milliseconds, performance.now)
 *   l.onlevel = fn(level, hz)       about twenty times a second, for a meter (hz is 0 when no pitch is clear)
 *   l.reset()                       forget what is sounding, so that the next thing heard is a new note
 *   l.feed(samples, rate, at)       hand it a stretch of sound yourself (for testing without a microphone)
 */
(function (root) {
	'use strict';

	function create(o) {
		o = o || {};
		var l = { running: false, onnote: null, onlevel: null };
		var ctx = null, stream = null, src = null, an = null, buf = null, timer = null;
		var CLEAR = 0.86;      // how sure the detector has to be
		var HOLD = 2;          // looks in a row that have to agree
		var cand = null, count = 0;     // the pitch that is being made sure of
		var sounding = null;            // the note already reported and still ringing
		var floor = 0, quiet = 0;       // the lowest level since that note began, and looks in a row with nothing clear

		function look(samples, rate, at) {
			var T = root.LBSTuner, r = T ? T.detect(samples, rate) : null;
			var level = r ? r.level : 0, hz = r && r.clarity >= CLEAR ? r.hz : 0;
			if (!r) {
				// too quiet to measure: work out the level anyway, for the meter
				var sum = 0;
				for (var i = 0; i < samples.length; i += 4) { sum += samples[i] * samples[i]; }
				level = Math.sqrt(sum / (samples.length / 4));
			}
			if (typeof l.onlevel === 'function') { l.onlevel(level, hz); }
			if (!hz) {
				cand = null; count = 0;
				// a few looks of nothing: whatever was ringing has stopped, and the same note may be played again
				if (++quiet >= 3) { sounding = null; }
				return;
			}
			quiet = 0;
			var n = T.note(hz), midi = n.midi;
			if (sounding !== null && midi === sounding) {
				// still the same note: unless it has been struck again (it had died away and is loud again)
				if (level < floor) { floor = level; }
				if (level > floor * 2.2 && level > 0.02) { sounding = null; } else { cand = null; count = 0; return; }
			}
			if (cand === midi) { count++; } else { cand = midi; count = 1; }
			if (count >= HOLD) {
				sounding = midi; floor = level; cand = null; count = 0;
				if (typeof l.onnote === 'function') {
					l.onnote({ midi: midi, pc: ((midi % 12) + 12) % 12, cents: n.cents, hz: hz, level: level, at: at });
				}
			}
		}

		l.feed = look;
		l.reset = function () { cand = null; count = 0; sounding = null; quiet = 0; };

		l.start = function () {
			if (l.running) { return Promise.resolve(); }
			var md = root.navigator && root.navigator.mediaDevices;
			if (!md || !md.getUserMedia || !root.LBSTuner) { return Promise.reject(new Error('nomic')); }
			// as the tuner asks for it: the browser's own tidying up (echo cancelling and so on) mangles a bass
			return md.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }).then(function (s) {
				stream = s;
				var AC = root.AudioContext || root.webkitAudioContext;
				ctx = ctx || new AC();
				if (ctx.state === 'suspended') { ctx.resume(); }
				src = ctx.createMediaStreamSource(stream);
				an = ctx.createAnalyser();
				an.fftSize = o.window || 8192;
				an.smoothingTimeConstant = 0;
				buf = new Float32Array(an.fftSize);
				src.connect(an);
				l.running = true;
				l.reset();
				var clock = root.performance && root.performance.now ? function () { return root.performance.now(); } : Date.now;
				timer = root.setInterval(function () {
					if (an.getFloatTimeDomainData) { an.getFloatTimeDomainData(buf); }
					else { var b8 = new Uint8Array(an.fftSize); an.getByteTimeDomainData(b8); for (var i = 0; i < b8.length; i++) { buf[i] = (b8[i] - 128) / 128; } }
					// only the newest part of what the analyser holds is looked at for pitch: enough for a low B, short enough to follow a line
					look(buf, ctx.sampleRate, clock());
				}, o.every || 50);
			});
		};
		l.stop = function () {
			root.clearInterval(timer); timer = null;
			if (src) { try { src.disconnect(); } catch (e) { /* gone */ } }
			if (stream) { stream.getTracks().forEach(function (tr) { tr.stop(); }); }
			stream = null; src = null; l.running = false;
		};
		return l;
	}

	root.LBSListen = { create: create };
}(typeof window !== 'undefined' ? window : this));
