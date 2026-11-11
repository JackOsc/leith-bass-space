/*
 * Leith Bass Space: Harmonic Elements, listening to a recorded chord loop.
 *
 * A recording is often longer than its element as written. Eight bars of a
 * four-bar element can be the changes played twice, or every chord held for
 * twice as long, and the file name doesn't say which. So that the display can
 * light the right chord on the right bar, this listens to the loop once it has
 * been decoded and works out which chord is sounding in each bar.
 *
 * It never decides what the loop IS (the file's name does that). It only
 * chooses between ways the named chords could fill the bars.
 *
 * HE.listen.changes(part, barDur, bars, seq, fallback)
 *   part      {buffer, lead} as the player holds it (lead: seconds before the loop starts)
 *   barDur    seconds in a bar
 *   bars      bars in the loop
 *   seq       the element's chords in this key: HE.sequence(el, pc, voicing)
 *   fallback  'repeat' | 'stretch': which to assume when the audio doesn't settle it
 * returns {map: [chord index for each bar], layout: 'repeat' | 'stretch' | 'heard', sure: true | false}
 */
(function (root) {
	'use strict';
	var HE = root.HE;

	// In-place radix-2 FFT of a real signal held in re (im starts at zero).
	function fft(re, im) {
		var n = re.length, i, j = 0, k, len, half, ang, wr, wi, cr, ci, xr, xi, t;
		for (i = 1; i < n; i++) {
			k = n >> 1;
			for (; j & k; k >>= 1) { j ^= k; }
			j ^= k;
			if (i < j) { t = re[i]; re[i] = re[j]; re[j] = t; }
		}
		for (len = 2; len <= n; len <<= 1) {
			half = len >> 1; ang = -2 * Math.PI / len; wr = Math.cos(ang); wi = Math.sin(ang);
			for (i = 0; i < n; i += len) {
				cr = 1; ci = 0;
				for (j = 0; j < half; j++) {
					xr = re[i + j + half] * cr - im[i + j + half] * ci;
					xi = re[i + j + half] * ci + im[i + j + half] * cr;
					re[i + j + half] = re[i + j] - xr; im[i + j + half] = im[i + j] - xi;
					re[i + j] += xr; im[i + j] += xi;
					t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
				}
			}
		}
	}

	// The loop as one channel at about 6 kHz: plenty for the notes of a chord.
	function reduce(buffer, lead, seconds) {
		var rate = buffer.sampleRate, step = Math.max(1, Math.floor(rate / 6000));
		var from = Math.max(0, Math.round(lead * rate));
		var count = Math.max(0, Math.min(Math.floor((buffer.length - from) / step), Math.ceil(seconds * rate / step)));
		var out = new Float32Array(count), channels = buffer.numberOfChannels, ch, d, i, j, sum, at;
		for (ch = 0; ch < channels; ch++) {
			d = buffer.getChannelData(ch);
			for (i = 0, at = from; i < count; i++, at += step) {
				sum = 0;
				for (j = 0; j < step; j++) { sum += d[at + j]; }
				out[i] += sum;
			}
		}
		return { data: out, rate: rate / step };
	}

	// One twelve-note profile per bar: how much of each pitch class is sounding.
	function profiles(signal, barDur, bars) {
		var out = [], rate = signal.rate, data = signal.data, b, i;
		for (b = 0; b < bars; b++) {
			// leave out the attack at the front of the bar and the tail of it
			var a = Math.round((b + 0.12) * barDur * rate), z = Math.min(data.length, Math.round((b + 0.95) * barDur * rate));
			var len = z - a, v = new Float64Array(12);
			if (len >= 1024) {
				var n = 1;
				while (n < len) { n <<= 1; }
				var re = new Float64Array(n), im = new Float64Array(n);
				for (i = 0; i < len; i++) { re[i] = data[a + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (len - 1))); }
				fft(re, im);
				var lo = Math.ceil(90 * n / rate), hi = Math.min(n / 2 - 1, Math.floor(2100 * n / rate));
				for (i = lo; i <= hi; i++) {
					var midi = 69 + 12 * Math.log(i * rate / n / 440) / Math.LN2, near = Math.round(midi);
					if (Math.abs(midi - near) >= 0.35) { continue; } // energy between the notes says nothing
					v[((near % 12) + 12) % 12] += Math.sqrt(Math.sqrt(re[i] * re[i] + im[i] * im[i]));
				}
			}
			var norm = 0;
			for (i = 0; i < 12; i++) { norm += v[i] * v[i]; }
			norm = Math.sqrt(norm) || 1;
			for (i = 0; i < 12; i++) { v[i] /= norm; }
			out.push(v);
		}
		return out;
	}

	// What a chord looks like in that profile, counting the overtones each note brings.
	function template(chord) {
		var v = new Float64Array(12), norm = 0, i;
		HE.QUAL[chord.qual].tones.forEach(function (t) {
			v[(chord.pc + t) % 12] += 1;
			v[(chord.pc + t + 7) % 12] += 0.3;
			v[(chord.pc + t + 4) % 12] += 0.12;
		});
		for (i = 0; i < 12; i++) { norm += v[i] * v[i]; }
		norm = Math.sqrt(norm) || 1;
		for (i = 0; i < 12; i++) { v[i] /= norm; }
		return v;
	}

	function dot(a, b) { var s = 0; for (var i = 0; i < 12; i++) { s += a[i] * b[i]; } return s; }

	// The chord (by its place in the element) in each bar, for each way of filling the bars.
	function written(seq) {
		var line = [];
		seq.forEach(function (c, i) { for (var b = 0; b < c.bars; b++) { line.push(i); } });
		return line;
	}
	function laid(seq, bars, layout) {
		var line = written(seq), total = line.length, out = [], b, k;
		if (!total) { return null; }
		if (layout === 'repeat') {
			if (bars % total) { return null; }
			for (b = 0; b < bars; b++) { out.push(line[b % total]); }
			return out;
		}
		k = bars / total;
		if (k !== Math.floor(k) || k < 2) { return null; }
		for (b = 0; b < bars; b++) { out.push(line[Math.floor(b / k)]); }
		return out;
	}

	function changes(part, barDur, bars, seq, fallback) {
		var repeat = laid(seq, bars, 'repeat'), stretch = laid(seq, bars, 'stretch');
		var same = repeat && stretch && repeat.join() === stretch.join();
		// Nothing to choose between: the bars can only be filled one way.
		if (repeat && (!stretch || same)) { return { map: repeat, layout: 'repeat', sure: true }; }
		if (stretch && !repeat) { return { map: stretch, layout: 'stretch', sure: true }; }
		if (!part || !part.buffer) { return null; }

		var heard = profiles(reduce(part.buffer, part.lead || 0, bars * barDur), barDur, bars);
		var shapes = seq.map(template);
		function score(map) {
			var s = 0;
			for (var b = 0; b < bars; b++) { s += dot(heard[b], shapes[map[b]]); }
			return s / bars;
		}

		if (repeat && stretch) {
			var r = score(repeat), s = score(stretch);
			// A clear winner, or the element's usual way where the two sound alike.
			if (Math.abs(r - s) < 0.02) {
				return { map: fallback === 'stretch' ? stretch : repeat, layout: fallback === 'stretch' ? 'stretch' : 'repeat', sure: false, scores: { repeat: r, stretch: s } };
			}
			return { map: r > s ? repeat : stretch, layout: r > s ? 'repeat' : 'stretch', sure: true, scores: { repeat: r, stretch: s } };
		}

		// The loop isn't a whole number of times the element: say which of its chords each bar is nearest.
		var map = [];
		for (var b = 0; b < bars; b++) {
			var best = 0, top = -1;
			for (var i = 0; i < shapes.length; i++) {
				var d = dot(heard[b], shapes[i]);
				if (d > top) { top = d; best = i; }
			}
			map.push(best);
		}
		return { map: map, layout: 'heard', sure: false };
	}

	HE.listen = { changes: changes };
}(typeof window !== 'undefined' ? window : globalThis));
