/*
 * Leith Bass Space: Read, the two pictures lbs-bass.js doesn't draw.
 *
 * A piano keyboard (where the semitones are, and middle C) and the circle of
 * fifths. Like the stave and the fretboard they are plain SVG strings, so
 * they run in Node too. They belong to the dark instrument register, as the
 * fretboard does, and take their colours from the page's custom properties.
 *
 * RDFigures.keys(o)    o: {from: 'C3', to: 'B4', marks: ['C4'], names: true, width}
 *                      Marked keys are lit; middle C is always labelled. An E and F,
 *                      and a B and C, sit side by side with nothing between, as they must.
 * RDFigures.circle(o)  o: {mark: [fifths, ...], size}  majors outside, relative minors inside,
 *                      the key signature on each spoke.
 */
(function (root) {
	'use strict';
	var M = root.RDM || (typeof require === 'function' ? require('./rd-music.js') : null);
	var C = {
		ink: 'var(--lbs-fb-ink,#F3F1EB)', ground: 'var(--lbs-fb-ground,#12151B)', rule: 'var(--lbs-fb-rule,rgba(243,241,235,.42))',
		faint: 'var(--lbs-fb-faint,rgba(243,241,235,.2))', orange: 'var(--lbs-fb-orange,#E87102)', black: '#1A1C21', white: '#F3F1EB'
	};
	var BODY = "var(--font-body,'Inter','Helvetica Neue',Arial,sans-serif)";
	function r1(v) { return Math.round(v * 10) / 10; }
	function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

	function keys(o) {
		o = o || {};
		var lo = M.parse(o.from || 'C3'), hi = M.parse(o.to || 'B4');
		var marks = {}; (o.marks || []).forEach(function (p) { marks[M.midi(p)] = true; });
		var whites = [];
		for (var s = lo.step; s <= hi.step; s++) { whites.push(M.fromStep(s, 0)); }
		var W = o.width || 640, ww = (W - 8) / whites.length, H = Math.max(110, Math.min(170, ww * 4.4)), bw = ww * 0.6, bh = H * 0.6;
		var out = '<svg xmlns="http://www.w3.org/2000/svg" class="rd-keys" viewBox="0 0 ' + W + ' ' + (H + 30) + '" width="100%" role="img" aria-label="' +
			esc(o.title || ('A piano keyboard from ' + M.pretty(o.from || 'C3', true) + ' to ' + M.pretty(o.to || 'B4', true) + (o.marks && o.marks.length ? ', with ' + o.marks.map(function (p) { return M.pretty(p, true); }).join(', ') + ' marked' : '') + '.')) + '" style="max-width:' + W + 'px">';
		out += '<rect x="0" y="0" width="' + W + '" height="' + (H + 30) + '" rx="8" style="fill:' + C.ground + '"/>';
		var blacks = '', labels = '';
		whites.forEach(function (p, i) {
			var x = 4 + i * ww, m = M.midi(p), lit = marks[m];
			out += '<rect x="' + r1(x + 1) + '" y="8" width="' + r1(ww - 2) + '" height="' + r1(H - 8) + '" rx="3" data-midi="' + m + '" style="fill:' + (lit ? C.orange : C.white) + '"/>';
			if (o.names || p === 'C4') {
				labels += '<text x="' + r1(x + ww / 2) + '" y="' + r1(H - 10) + '" text-anchor="middle" font-size="' + r1(Math.min(15, ww * 0.42)) + '" font-weight="600" style="font-family:' + BODY + ';fill:' + C.black + '">' + esc(M.pretty(p)) + '</text>';
			}
			if (p === 'C4') { labels += '<text x="' + r1(x + ww / 2) + '" y="' + r1(H + 22) + '" text-anchor="middle" font-size="12" font-weight="600" style="font-family:' + BODY + ';fill:' + C.ink + '">middle C</text>'; }
			// a black key between this white and the next, unless this is an E or a B
			var L = M.parse(p).L;
			if (i < whites.length - 1 && L !== 'E' && L !== 'B') {
				var bm = m + 1, blit = marks[bm];
				blacks += '<rect x="' + r1(x + ww - bw / 2) + '" y="8" width="' + r1(bw) + '" height="' + r1(bh) + '" rx="2" data-midi="' + bm + '" style="fill:' + (blit ? C.orange : C.black) + ';stroke:' + C.ground + ';stroke-width:1.5"/>';
			}
		});
		return out + blacks + labels + '</svg>';
	}

	function circle(o) {
		o = o || {};
		var S = o.size || 420, cx = S / 2, cy = S / 2, R1 = S * 0.46, R2 = S * 0.33, R3 = S * 0.2;
		var marked = {}; (o.mark || []).forEach(function (f) { marked[f] = true; });
		var out = '<svg xmlns="http://www.w3.org/2000/svg" class="rd-circle" viewBox="0 0 ' + S + ' ' + S + '" width="100%" role="img" aria-label="' +
			esc(o.title || 'The circle of fifths: C at the top, then G, D, A, E, B and F sharp clockwise, each with one more sharp; F, B flat, E flat, A flat, D flat and G flat anticlockwise, each with one more flat. The relative minors sit inside.') + '" style="max-width:' + S + 'px">';
		out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r1(R1) + '" style="fill:' + C.ground + ';stroke:' + C.faint + ';stroke-width:1.5"/>';
		out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r1(R2) + '" style="fill:none;stroke:' + C.faint + ';stroke-width:1.5"/>';
		out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r1(R3) + '" style="fill:none;stroke:' + C.faint + ';stroke-width:1.5"/>';
		for (var k = 0; k < 12; k++) {
			var f = k <= 6 ? k : k - 12;         // 0..6 sharps clockwise, then -5..-1 flats
			var a = (k * 30 - 90) * Math.PI / 180;
			var sep = ((k * 30 - 105) * Math.PI) / 180;
			out += '<line x1="' + r1(cx + R3 * Math.cos(sep)) + '" y1="' + r1(cy + R3 * Math.sin(sep)) + '" x2="' + r1(cx + R1 * Math.cos(sep)) + '" y2="' + r1(cy + R1 * Math.sin(sep)) + '" style="stroke:' + C.faint + ';stroke-width:1"/>';
			var maj = k === 6 ? 'F♯/G♭' : M.prettyName(M.majorOf(f));
			var min = k === 6 ? 'D♯m/E♭m' : M.prettyName(M.minorOf(f)) + 'm';
			var sig = f === 0 ? '0' : Math.abs(f) + (f > 0 ? '♯' : '♭');
			if (k === 6) { sig = '6♯/6♭'; }
			var lit = marked[f] || (k === 6 && (marked[6] || marked[-6]));
			var xr = (R1 + R2) / 2, xm = (R2 + R3) / 2;
			if (lit) {
				out += '<circle cx="' + r1(cx + xr * Math.cos(a)) + '" cy="' + r1(cy + xr * Math.sin(a)) + '" r="' + r1((R1 - R2) * 0.44) + '" style="fill:' + C.orange + '"/>';
			}
			out += '<text x="' + r1(cx + xr * Math.cos(a)) + '" y="' + r1(cy + xr * Math.sin(a) + 2) + '" text-anchor="middle" font-size="' + r1(S * (k === 6 ? 0.034 : 0.05)) + '" font-weight="700" style="font-family:' + BODY + ';fill:' + (lit ? '#090909' : C.ink) + '">' + esc(maj) + '</text>';
			out += '<text x="' + r1(cx + xr * Math.cos(a)) + '" y="' + r1(cy + xr * Math.sin(a) + S * 0.04) + '" text-anchor="middle" font-size="' + r1(S * 0.026) + '" font-weight="600" style="font-family:' + BODY + ';fill:' + (lit ? '#090909' : C.rule) + '">' + esc(sig) + '</text>';
			out += '<text x="' + r1(cx + xm * Math.cos(a)) + '" y="' + r1(cy + xm * Math.sin(a) + 4) + '" text-anchor="middle" font-size="' + r1(S * (k === 6 ? 0.025 : 0.034)) + '" font-weight="600" style="font-family:' + BODY + ';fill:' + C.ink + '">' + esc(min) + '</text>';
		}
		out += '<text x="' + cx + '" y="' + r1(cy - 4) + '" text-anchor="middle" font-size="' + r1(S * 0.028) + '" font-weight="600" style="font-family:' + BODY + ';fill:' + C.rule + '">sharps →</text>';
		out += '<text x="' + cx + '" y="' + r1(cy + S * 0.04) + '" text-anchor="middle" font-size="' + r1(S * 0.028) + '" font-weight="600" style="font-family:' + BODY + ';fill:' + C.rule + '">← flats</text>';
		return out + '</svg>';
	}

	var RDFigures = { keys: keys, circle: circle };
	if (typeof module !== 'undefined' && module.exports) { module.exports = RDFigures; } else { root.RDFigures = RDFigures; }
})(typeof window !== 'undefined' ? window : this);
