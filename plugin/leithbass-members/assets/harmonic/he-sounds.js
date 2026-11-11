/*
 * Leith Bass Space: Harmonic Elements, the sounds the app's own band is made of.
 *
 * Two kinds of sound go into a loop the app plays itself:
 *
 *   SAMPLED    real instruments, recorded note by note and hit by hit: a grand
 *              piano, an upright, an electric guitar, a vibraphone, three drum
 *              kits and a tray of hand percussion. Each lives in one small MP3
 *              in the sounds folder (a "pack") with a list of where each note
 *              or hit sits inside it (he-packs.js, made by build_packs.py).
 *              A pack is only fetched when a loop first needs it, and the
 *              browser keeps it after that.
 *
 *   DRAWN      everything else is made from scratch in the browser: electric
 *              pianos, the organ, strings, pads, brass, a nylon guitar and
 *              two drum machines. These need no download at all, so there is
 *              always something to play.
 *
 * Every recording used here is in the public domain (CC0). They are listed
 * in sounds/CREDITS.txt.
 *
 * This file is the shared tool box: fetching and decoding packs, and the few
 * bits of sound-making the instruments have in common. The instruments are
 * in he-band.js (chords) and he-kit.js (drums).
 *
 * HE.sounds.base               where the sounds folder is (set by the page)
 * HE.sounds.load(name, ctx)    a promise of a pack: {name, buffer, zero, info}
 * HE.sounds.loaded(name)       true once a pack has been fetched and decoded
 * HE.sounds.has(name)          true if there is such a pack at all
 * HE.sounds.lean()             true if the visitor has asked to save data
 * HE.sounds.random(seed)       a repeatable random number maker
 * HE.sounds.room(ctx, o)       a made-up room to play in (an impulse response)
 * HE.sounds.string(rate, o)    one plucked string, as samples (Karplus-Strong)
 * HE.sounds.lay(loop, src, o)  add one sound to a loop, wrapping round at the end
 * HE.sounds.together(jobs, n)  run jobs that return promises, n at a time
 * HE.sounds.inTurns(list, f)   do f to each thing in a list, letting the page breathe every few milliseconds
 * HE.sounds.steady(o)          put a finished loop through effects, as it sounds once it has been round
 * HE.sounds.addHalf(dest, src) add a loop drawn at half rate to one at full rate
 *
 * HOW A LOOP IS DRAWN, and why it is quick. The browser's audio engine charges
 * for every note for the whole length of whatever it is drawing, even while
 * the note is silent, so one long drawing with hundreds of notes in it is slow.
 * So a loop is drawn in three steps instead:
 *   1. each different thing that is struck (this chord, this hard, held this
 *      long) is drawn once, on its own, in a drawing only as long as itself;
 *   2. those are laid into the loop wherever they fall, by plain addition,
 *      wrapping whatever rings past the end back onto the start;
 *   3. the finished loop goes once through the effects and the room.
 * The cost no longer depends on how busy the pattern is or how long the loop.
 */
(function (root) {
	'use strict';
	var HE = root.HE = root.HE || {};
	var PACKS = HE.PACKS || {};

	/* ---------- where the packs are ---------- */

	var base = '';
	try {
		// Beside this script unless the page says otherwise.
		var here = root.document && root.document.currentScript && root.document.currentScript.src;
		if (here) { base = here.replace(/[^\/]*$/, '') + 'sounds/'; }
	} catch (e) { base = ''; }

	// "Save-Data" or a very slow connection: don't fetch packs nobody asked for.
	function lean() {
		var c = root.navigator && (root.navigator.connection || root.navigator.mozConnection || root.navigator.webkitConnection);
		return !!(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || '')));
	}

	/* ---------- fetching and decoding ---------- */

	var packs = {};      // name -> promise of a pack
	var done = {};       // name -> true once decoded
	var order = [];      // names, least recently used first
	var KEEP = 6;        // decoded packs held at once (each is a few megabytes of memory)

	function decode(ctx, data) {
		// The promise form where there is one; older Safari only takes callbacks.
		return new Promise(function (resolve, reject) {
			var p = ctx.decodeAudioData(data, resolve, reject);
			if (p && p.then) { p.then(resolve, reject); }
		});
	}

	// Every pack starts with one sharp click. Browsers disagree by a few
	// hundredths of a second about where an MP3 begins, so each note is found
	// by counting from the click, not from the start of the file.
	function findClick(buffer) {
		var d = buffer.getChannelData(0), n = Math.min(d.length, Math.floor(buffer.sampleRate * 0.4));
		var top = 0, at = 0;
		for (var i = 0; i < n; i++) {
			var a = d[i] < 0 ? -d[i] : d[i];
			if (a > top) { top = a; at = i; }
		}
		return top > 0.2 ? at / buffer.sampleRate : -1;
	}

	function touch(name) {
		var i = order.indexOf(name);
		if (i !== -1) { order.splice(i, 1); }
		order.push(name);
		while (order.length > KEEP) {
			var old = order.shift();
			delete packs[old]; delete done[old];
		}
	}

	// A pack is decoded at the sample rate of whatever asked for it, and everything drawn from it
	// is drawn at that rate. If a different rate ever turns up (the loops for the first tap are
	// drawn before the browser has said what rate it plays at), the packs are decoded afresh.
	var rateNow = 0;

	function load(name, ctx) {
		var info = PACKS[name];
		if (!info) { return Promise.reject(new Error('no-pack')); }
		if (ctx.sampleRate !== rateNow) { packs = {}; done = {}; order = []; rateNow = ctx.sampleRate; }
		if (packs[name]) { touch(name); return packs[name]; }
		var url = HE.sounds.base + info.file + (HE.sounds.version ? '?v=' + encodeURIComponent(HE.sounds.version) : '');
		var mine = packs;
		var p = root.fetch(url).then(function (res) {
			if (!res.ok) { throw new Error('missing-pack'); }
			return res.arrayBuffer();
		}).then(function (data) {
			return decode(ctx, data);
		}).then(function (buffer) {
			var click = findClick(buffer);
			if (click < 0) { throw new Error('bad-pack'); }
			if (packs === mine) { done[name] = true; }
			// "zero" is where the pack's own clock starts: every entry in its list is seconds after the click.
			return { name: name, buffer: buffer, zero: click, info: info };
		});
		packs[name] = p;
		touch(name);
		p.catch(function () {
			if (packs !== mine || packs[name] !== p) { return; }
			delete packs[name]; delete done[name];
			var i = order.indexOf(name); if (i !== -1) { order.splice(i, 1); }
		});
		return p;
	}

	/* ---------- shared sound-making ---------- */

	// A small, fast, repeatable random number maker (mulberry32), so a loop
	// comes out the same every time it is drawn.
	function random(seed) {
		var a = (seed >>> 0) || 1;
		return function () {
			a = (a + 0x6D2B79F5) >>> 0;
			var t = a;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}
	function hash(text) {
		var h = 2166136261;
		for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
		return h >>> 0;
	}

	// A room, as an impulse response: a few early reflections, then a tail of
	// noise that fades and gets darker as it goes. o: {seconds, bright (0..1), early (0..1), seed}
	var rooms = {};
	function room(ctx, o) {
		var key = [ctx.sampleRate, o.seconds, o.bright, o.early, o.seed || 1].join('|');
		if (rooms[key]) { return rooms[key]; }
		var rate = ctx.sampleRate, n = Math.max(1, Math.floor(o.seconds * rate));
		var buf = ctx.createBuffer(2, n, rate), rnd = random(o.seed || 1);
		for (var ch = 0; ch < 2; ch++) {
			var d = buf.getChannelData(ch), lp = 0, i;
			var pre = Math.floor((0.004 + 0.003 * ch) * rate);
			for (i = pre; i < n; i++) {
				var t = i / n;
				// the tail loses its top end as it dies away
				var k = 0.12 + 0.82 * o.bright * (1 - t) * (1 - t);
				lp += k * ((rnd() * 2 - 1) - lp);
				d[i] = lp * Math.pow(1 - t, 2.2) * Math.exp(-3.2 * t);
			}
			// early reflections: a handful of single echoes in the first 60 ms
			for (i = 0; i < 7; i++) {
				var at = Math.floor((0.006 + rnd() * 0.055) * rate);
				if (at < n) { d[at] += (rnd() < 0.5 ? -1 : 1) * o.early * (0.5 + 0.5 * rnd()) * (1 - i / 9); }
			}
			// level it, so "send" means the same thing whatever the room
			var sum = 0;
			for (i = 0; i < n; i++) { sum += d[i] * d[i]; }
			var norm = 1 / Math.sqrt(sum || 1);
			for (i = 0; i < n; i++) { d[i] *= norm; }
		}
		rooms[key] = buf;
		return buf;
	}

	/*
	 * One plucked string (extended Karplus-Strong): the plucked shape goes round
	 * a delay as long as one cycle of the note, losing a little top each time.
	 *   o.freq      pitch in Hz
	 *   o.seconds   how long to make
	 *   o.bright    0..1: how hard the pluck is (how many harmonics it starts with)
	 *   o.damp      0..1: how quickly the top dies (0 rings bright, 1 dulls fast)
	 *   o.sustain   seconds for the note to fall to about a thousandth
	 *   o.pick      0..0.5: where along the string it is plucked (0.5 is the middle)
	 *   o.seed
	 */
	function string(rate, o) {
		var n = Math.floor(o.seconds * rate), out = new Float32Array(n), rnd = random(o.seed || 7);
		var period = rate / o.freq, w = 2 * Math.PI * o.freq / rate;
		var damp = Math.max(0, Math.min(0.98, o.damp));
		// the loop filter is y = (1-s)x + s*x[-1]; how long it holds a wave of this pitch:
		var s = 0.5 * damp + 0.02;
		var held = Math.atan2(s * Math.sin(w), (1 - s) + s * Math.cos(w)) / w;
		// a first-order all-pass makes up the rest of the cycle to the exact fraction of a sample
		var total = period - held;
		var len = Math.floor(total - 0.1), frac = total - len;
		var c = Math.sin((1 - frac) * w / 2) / Math.sin((1 + frac) * w / 2);
		var line = new Float32Array(len), i, k;
		// The pluck: the shape a string is pulled into before it is let go, built from its own
		// harmonics so that every note has the same character (a burst of noise, the usual way,
		// gives each note a different, random tone). Where it is plucked decides which harmonics
		// are weak; how hard decides how many there are. A little noise is the finger itself.
		var where = o.pick || 0.2, reach = 500 + 6000 * o.bright, most = Math.min(48, Math.floor(len / 2) - 1);
		for (k = 1; k <= most; k++) {
			var amp = Math.sin(k * Math.PI * where) / k * Math.exp(-k * o.freq / reach), step = 2 * Math.PI * k / len;
			if (Math.abs(amp) < 1e-4) { continue; }
			for (i = 0; i < len; i++) { line[i] += amp * Math.sin(step * i); }
		}
		var lp = 0;
		for (i = 0; i < len; i++) { lp += 0.3 * ((rnd() * 2 - 1) - lp); line[i] += 0.06 * lp; }
		// lose a fixed share each time round, so every pitch rings for about o.sustain
		var loss = Math.pow(0.001, 1 / (o.sustain * o.freq));
		var at = 0, last = 0, apIn = 0, apOut = 0, peak = 0;
		for (i = 0; i < n; i++) {
			var x = line[at];
			var y = ((1 - s) * x + s * last) * loss;
			last = x;
			var z = c * y + apIn - c * apOut;
			apIn = y; apOut = z;
			line[at] = z;
			out[i] = x;
			if (x > peak) { peak = x; } else if (-x > peak) { peak = -x; }
			if (++at >= len) { at = 0; }
		}
		// every note at the same loudness: levelled by its first tenth of a second, not its one tallest sample
		var sum = 0, first = Math.min(n, Math.floor(rate * 0.1));
		for (i = 0; i < first; i++) { sum += out[i] * out[i]; }
		var level = Math.sqrt(sum / Math.max(1, first));
		if (level > 0) { var norm = 0.25 / level; for (i = 0; i < n; i++) { out[i] *= norm; } }
		return out;
	}

	/*
	 * Add one sound to a loop, by plain addition. What rings past the end of
	 * the loop carries on from the start (that is what makes the loop seamless).
	 *   loop   {L, R (or none, for one channel), frames}
	 *   src    samples, one channel
	 *   o.from, o.len   which part of src (in samples)
	 *   o.at            where it starts in the loop (samples; a little before zero wraps to the end)
	 *   o.gain, o.pan   level, and place from -1 (left) to 1 (right)
	 *   o.rate          1 as recorded; higher plays it faster and higher
	 *   o.keep          stop after this many samples of sound, with a short fade (for a choked cymbal, a damped drum)
	 *   o.swell         {up, down, floor}: fade in over "up" samples, then sink towards "floor" (a brush stir)
	 */
	function lay(loop, src, o) {
		var frames = loop.frames, L = loop.L, R = loop.R || null;
		var rate = o.rate || 1, from = o.from || 0;
		var avail = Math.floor(((o.len === undefined ? src.length - from : o.len) - 1) / rate);
		var n = o.keep !== undefined ? Math.min(avail, Math.max(1, Math.floor(o.keep))) : avail;
		if (n <= 0) { return; }
		var gl = o.gain === undefined ? 1 : o.gain, gr = gl;
		if (R && o.pan) { var a = (o.pan + 1) * Math.PI / 4; gl = o.gain * Math.cos(a) * 1.4142; gr = o.gain * Math.sin(a) * 1.4142; }
		var fade = n < avail ? Math.min(n, Math.floor(o.fade === undefined ? 0.03 * (loop.rate || 44100) : o.fade)) : 0;
		var at = Math.round(o.at) % frames; if (at < 0) { at += frames; }
		var sw = o.swell || null, i, x, p, k, e, j;
		// Most of what is laid is plain: no change of speed, no swell, and no fade until its last moments.
		// That part is done a stretch at a time, up to the end of the loop and then on from its start,
		// with nothing to decide inside the loop: this is where nearly all the time goes.
		var plain = sw ? 0 : n - fade;
		i = 0;
		while (i < plain) {
			var run = Math.min(plain - i, frames - at), base = from + i;
			if (rate === 1) {
				for (j = 0; j < run; j++) { L[at + j] += src[base + j] * gl; }
				if (R) { for (j = 0; j < run; j++) { R[at + j] += src[base + j] * gr; } }
			} else if (R) {
				for (j = 0; j < run; j++) {
					p = from + (i + j) * rate; k = p | 0; x = src[k] + (src[k + 1] - src[k]) * (p - k);
					L[at + j] += x * gl; R[at + j] += x * gr;
				}
			} else {
				for (j = 0; j < run; j++) {
					p = from + (i + j) * rate; k = p | 0;
					L[at + j] += (src[k] + (src[k + 1] - src[k]) * (p - k)) * gl;
				}
			}
			i += run; at += run;
			if (at >= frames) { at = 0; }
		}
		// the rest (a fade at the end, a swell all the way through) a sample at a time
		for (; i < n; i++) {
			if (rate === 1) { x = src[from + i]; }
			else { p = from + i * rate; k = p | 0; x = src[k] + (src[k + 1] - src[k]) * (p - k); }
			if (fade && i >= n - fade) { x *= (n - i) / fade; }
			if (sw) {
				e = i < sw.up ? i / sw.up : sw.floor + (1 - sw.floor) * Math.exp(-(i - sw.up) / sw.down);
				x *= e;
			}
			L[at] += x * gl;
			if (R) { R[at] += x * gr; }
			if (++at >= frames) { at = 0; }
		}
	}

	// Do something to each thing in a list, stopping every few milliseconds to let the page breathe:
	// a tap or a scroll is never kept waiting by a loop that is being drawn. A promise of being done.
	var turnQueue = [], turnChannel = null;
	function breathe(f) {
		if (!root.MessageChannel) { root.setTimeout(f, 0); return; }
		// (a message to oneself comes back sooner than the shortest timer)
		if (!turnChannel) {
			turnChannel = new root.MessageChannel();
			turnChannel.port1.onmessage = function () { var next = turnQueue.shift(); if (next) { next(); } };
		}
		turnQueue.push(f);
		turnChannel.port2.postMessage(0);
	}
	function inTurns(list, each, ms) {
		var clock = root.performance && root.performance.now ? function () { return root.performance.now(); } : Date.now;
		return new Promise(function (resolve, reject) {
			var i = 0;
			(function go() {
				var until = clock() + (ms || 6);
				try { while (i < list.length) { each(list[i], i); i++; if (clock() >= until) { break; } } }
				catch (e) { reject(e); return; }
				if (i < list.length) { breathe(go); } else { resolve(); }
			}());
		});
	}

	// Run jobs (functions that return promises) a few at a time, and give their results in order.
	function together(jobs, width) {
		var next = 0, results = new Array(jobs.length);
		function worker() {
			if (next >= jobs.length) { return Promise.resolve(); }
			var k = next++;
			return jobs[k]().then(function (r) { results[k] = r; return worker(); });
		}
		var workers = [];
		for (var i = 0; i < Math.min(width, jobs.length); i++) { workers.push(worker()); }
		return Promise.all(workers).then(function () { return results; });
	}

	function render(oc) {
		// Older Safari takes a callback; everything current returns a promise.
		return new Promise(function (resolve, reject) {
			oc.oncomplete = function (e) { resolve(e.renderedBuffer); };
			var p = oc.startRendering();
			if (p && p.then) { p.then(resolve, reject); }
		});
	}

	/*
	 * A loop through its effects, as it sounds once it has been going round a
	 * while: the loop is played on repeat, the first "lead" seconds (while the
	 * room fills and the effects settle) are thrown away, and the next pass is
	 * kept. So the result is exactly the loop's length and joins end to start.
	 *   o.rate, o.frames   the loop
	 *   o.lead             seconds to let it settle: at least as long as the room
	 *   o.half             draw at half the sample rate (for a room's echo, which has no top to lose): half the work
	 *   o.build(oc, play)  wire it up; play(channels) gives a source that plays those channels on repeat
	 * Gives the kept pass as [left, right] at the rate it was drawn at.
	 * Any slow wobble an effect has should come round a whole number of times in
	 * the loop: whole(hz, seconds) gives the nearest rate that does.
	 */
	var OAC = root.OfflineAudioContext || root.webkitOfflineAudioContext;
	var halfWorks = null; // not every browser will draw at half rate: found out the first time it is tried
	function steady(o) {
		var rate = o.rate, frames = o.frames;
		var half = !!o.half && halfWorks !== false && frames % 2 === 0;
		var outRate = half ? rate / 2 : rate, outFrames = half ? frames / 2 : frames;
		var lead = Math.round(o.lead * outRate), oc;
		try { oc = new OAC(2, lead + outFrames, outRate); if (half) { halfWorks = true; } }
		catch (e) {
			if (!half) { throw e; }
			halfWorks = false;
			return steady(o);
		}
		function play(channels) {
			// the loop is handed over at its own rate; the browser brings it to the drawing's
			var buf = oc.createBuffer(channels.length, frames, rate);
			channels.forEach(function (d, ch) { buf.getChannelData(ch).set(d); });
			var src = oc.createBufferSource();
			src.buffer = buf; src.loop = true;
			// start part-way through, so that the loop's first sample falls exactly where the kept pass begins
			var off = (outFrames - (lead % outFrames)) % outFrames;
			src.start(0, off / outRate);
			return src;
		}
		o.build(oc, play);
		return render(oc).then(function (rendered) {
			var out = [];
			for (var ch = 0; ch < 2; ch++) { out.push(new Float32Array(rendered.getChannelData(ch).subarray(lead, lead + outFrames))); }
			out.half = half;
			return out;
		});
	}
	function whole(hz, seconds) { return Math.max(1, Math.round(hz * seconds)) / seconds; }

	// Add a loop drawn at half rate to one at full rate (the samples in between are drawn through their four neighbours).
	function addHalf(dest, src) {
		var n = src.length;
		for (var i = 0; i < n; i++) {
			var a = src[(i - 1 + n) % n], b = src[i], c = src[(i + 1) % n], d = src[(i + 2) % n];
			dest[2 * i] += b;
			dest[2 * i + 1] += (9 * (b + c) - a - d) / 16;
		}
	}
	// Two channels of samples as a buffer the player can use.
	function asBuffer(channels, rate) {
		var ctx = new OAC(channels.length, 1, rate), buf = ctx.createBuffer(channels.length, channels[0].length, rate);
		channels.forEach(function (d, ch) { buf.getChannelData(ch).set(d); });
		return buf;
	}

	HE.sounds = {
		base: base,
		version: '',
		PACKS: PACKS,
		load: load,
		loaded: function (name) { return !!done[name]; },
		has: function (name) { return !!PACKS[name]; },
		lean: lean,
		random: random,
		hash: hash,
		room: room,
		string: string,
		lay: lay,
		inTurns: inTurns,
		together: together,
		render: render,
		steady: steady,
		whole: whole,
		addHalf: addHalf,
		asBuffer: asBuffer
	};
}(typeof window !== 'undefined' ? window : globalThis));
