/*
 * Leith Bass Space: Read, the stave.
 *
 * lbs-bass.js draws a line of crotchets in bass clef with TAB beneath, which is
 * all Harmonic Elements and Ear Training need. Reading needs the rest of
 * notation: every note value from a semibreve to a semiquaver, dots, ties,
 * rests, beams, triplets, key and time signatures, repeats and the roadmap
 * (D.S., coda, first and second time bars), chords, the treble clef and the
 * piano's grand staff. This is that engraver.
 *
 * It is drawn in the house style and in lbs-bass.js's own units, so the two
 * look like one hand: a stave space is 24 units, stems are 84, the music is
 * charcoal on a cream panel with an orange border, and the panel is never
 * inverted on a dark page. The symbols are Bravura outlines (rd-glyphs.js).
 *
 * Like lbs-bass.js it never touches the page. It takes the notation string
 * that RDM.parseNotes reads (see rd-music.js) and hands back SVG and the
 * position of every note, so the page can light notes, follow a playhead or
 * turn a tap on the stave into a pitch. It runs in Node too.
 *
 * Pitches here are WRITTEN pitch (the open E string is E2, on the first ledger
 * line below the bass clef). The sound is an octave lower; rd-sound.js knows.
 *
 * RDStave.render(spec) -> {svg, notes, systems, width, height, scale, alt}
 *   spec.notes     the notation string; for the grand staff {treble: '...', bass: '...'}
 *   spec.clef      'bass' (the default), 'treble' or 'grand'
 *   spec.key       the key signature in fifths, -7 (seven flats) to 7 (seven sharps)
 *   spec.time      '4/4', '3/4', '6/8', 'C' ... or null for none (a pitch study)
 *   spec.tab       true draws TAB under the bass part; spec.strings 4, 5 or 6
 *   spec.names     true writes each note's name on its own row
 *   spec.width     the width it will be shown at, in CSS pixels (640)
 *   spec.scale     1: how big a stave space is (1 gives lbs-bass.js's size)
 *   spec.maxBars   at most this many bars on a line (one or two on a phone)
 *   spec.stretch   true fills the width even when the music is short
 *   spec.mark      {index: 'cur' | 'ok' | 'no' | 'dim' | 'hint'} colours notes of the main part
 *   spec.reserve   {lo, hi} pitches: keep room on the staff down to lo and up to hi (for writing on it)
 *   spec.plain     true leaves off the panel and its border
 *   spec.fit       true draws everything smaller (to 70%) rather than squeeze a line hard
 *   spec.bare      true leaves off the clef too: a rhythm on its own (Write the rhythm's pieces)
 *   spec.counts    true writes the count (1 e & a) under each note of the main part
 *   spec.beam      'beat' (the default: the middle of the bar always shows) or 'half'
 *   spec.title     the accessible name (left empty, the notes are described)
 *   spec.tempo     a number: a tempo mark (a crotchet = N, a dotted crotchet in compound time) over the first line
 *   spec.style     a word or two before the tempo mark ("Soul", "Medium swing")
 *
 * The main part is the only part, or the bass part of a grand staff.
 * Each of result.notes is {i, x, y, sys, bar, t, beats, rest, pitches, string, fret}
 * in drawing units; result.scale turns them into CSS pixels at spec.width.
 */
(function (root) {
	'use strict';
	var M = root.RDM || (typeof require === 'function' ? require('./rd-music.js') : null);
	var GL = root.RDGlyphs;
	if (!GL && typeof require === 'function') { var gw = {}; global.window = global.window || gw; require('./rd-glyphs.js'); GL = global.window.RDGlyphs; }

	var CREAM = '#F5EFE2', INK = '#292724', ORANGE = '#D86B25', ACCENT = '#A84912', MUTED = '#6A645C', WRONG = '#B3261E';
	var BODY = "var(--font-body,'Inter','Helvetica Neue',Arial,sans-serif)";
	var MONO = "'DejaVu Sans Mono',ui-monospace,Menlo,Consolas,'Liberation Mono',monospace";
	var SP = 24, HALF = 12;
	var HEAD = GL.noteheadBlack.w * SP, HEADW = GL.noteheadWhole.w * SP;
	var STEM = 3.2, LINE = 2.4, LEDGER = 2.8, STEM_LEN = 84, BEAM = 11, BEAM_STEP = 18, TABGAP = 38;

	function r1(v) { return Math.round(v * 10) / 10; }
	function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
	function glyph(name, x, y, more) {
		var g = GL[name];
		return g ? '<path transform="translate(' + r1(x) + ' ' + r1(y) + ') scale(' + SP + ')" d="' + g.d + '"' + (more || '') + '/>' : '';
	}
	function glyphAt(name, x, y, size, more) {
		var g = GL[name];
		return g ? '<path transform="translate(' + r1(x) + ' ' + r1(y) + ') scale(' + r1(SP * size) + ')" d="' + g.d + '"' + (more || '') + '/>' : '';
	}
	function gw(name) { return GL[name] ? GL[name].w * SP : 0; }
	function rect(x, y, w, h, more) { return '<rect x="' + r1(x) + '" y="' + r1(y) + '" width="' + r1(Math.max(0.1, w)) + '" height="' + r1(Math.max(0.1, h)) + '"' + (more || '') + '/>'; }
	function hline(x1, x2, y, w) { return rect(Math.min(x1, x2), y - w / 2, Math.abs(x2 - x1), w); }
	function vline(x, y1, y2, w) { return rect(x - w / 2, Math.min(y1, y2), w, Math.abs(y2 - y1)); }
	function txt(x, y, s, more) { return '<text x="' + r1(x) + '" y="' + r1(y) + '"' + (more || '') + '>' + esc(s) + '</text>'; }

	/* ---------- reading the parts ---------- */

	var BEAMABLE = { '8': 1, '16': 2, '32': 3 };
	var FLAG = { '8': '8th', '16': '16th', '32': '16th' };
	var REST = { w: 'restWhole', h: 'restHalf', q: 'restQuarter', '8': 'rest8th', '16': 'rest16th', '32': 'rest16th' };
	var NAV = { fine: 'Fine', dc: 'D.C.', ds: 'D.S.', dsalcoda: 'D.S. al Coda', dcalcoda: 'D.C. al Coda', dcalfine: 'D.C. al Fine', dsalfine: 'D.S. al Fine', tocoda: 'To Coda' };

	function prepare(src, clef, key, time, beamBy) {
		var bars = M.parseNotes(src == null ? 'r/w' : src);
		var keyAcc = M.keyAccidentals(key || 0);
		var mid = M.CLEF_MID[clef];
		var nominal = time ? M.barBeats(time) : null;
		var unit = M.beatUnit(time) * (beamBy === 'half' && nominal && nominal % 2 === 0 && M.beatUnit(time) === 1 ? 2 : 1);
		var items = [], gt = 0, prevState = {};
		bars.forEach(function (bar, bi) {
			var t = 0, state = {}, altered = {};
			bar.items.forEach(function (it) {
				it.bar = bi; it.t = t; it.gt = gt + t; it.i = items.length;
				t += it.beats;
				var prev = items[items.length - 1];
				if (!it.rest && !it.slash) {
					it.heads = it.pitches.map(function (ps) {
						var p = M.parse(ps);
						var cur = state[p.step] != null ? state[p.step] : (keyAcc[p.L] || 0);
						var tiedIn = prev && prev.tie && prev.pitches && prev.pitches.indexOf(ps) >= 0;
						var show = p.a !== cur && !tiedIn;
						var courtesy = false;
						if (!show && !tiedIn && prevState[p.step] != null && prevState[p.step] !== p.a && state[p.step] == null) { show = true; courtesy = true; }
						if (it.courtesy && !show) { show = true; courtesy = true; }
						state[p.step] = p.a;
						if (p.a !== (keyAcc[p.L] || 0)) { altered[p.step] = p.a; }
						return { p: ps, step: p.step, a: p.a, show: show, courtesy: courtesy, off: 0, col: 0 };
					}).sort(function (a, b) { return a.step - b.step; });
				}
				items.push(it);
			});
			// what a bar altered is remembered for one bar, for a courtesy sign in the next
			prevState = altered;
			bar.span = t;
			bar.nominal = nominal || t;
			bar.full = bar.items.length === 1 && bar.items[0].rest && (bar.items[0].dur === 'w' || Math.abs(bar.items[0].beats - bar.nominal) < 1e-6);
			if (bar.multi) { bar.span = bar.nominal * bar.multi; }
			gt += bar.multi ? bar.span : Math.max(t, bar.full ? bar.nominal : 0);
		});

		// stems, chords, beams
		items.forEach(function (it) {
			if (it.rest) { return; }
			if (it.slash) { it.dir = 'up'; it.lo = it.hi = mid; return; }
			it.lo = it.heads[0].step; it.hi = it.heads[it.heads.length - 1].step;
			it.dir = (it.hi - mid) + (it.lo - mid) >= 0 ? 'down' : 'up';
		});
		var groups = [];
		bars.forEach(function (bar) {
			var run = null, key;
			bar.items.forEach(function (it) {
				var can = !it.rest && BEAMABLE[it.dur];
				var k = it.tup ? 'tup' + it.tup.id : Math.floor((it.t + 1e-6) / unit);
				if (can && run && key === k) { run.push(it); }
				else { if (run && run.length > 1) { groups.push(run); } run = can ? [it] : null; key = k; }
			});
			if (run && run.length > 1) { groups.push(run); }
		});
		groups.forEach(function (g, gi) {
			var above = 0, below = 0;
			g.forEach(function (it) { above = Math.max(above, it.hi - mid); below = Math.max(below, mid - it.lo); });
			var dir = above >= below && above > 0 ? 'down' : above > below ? 'down' : 'up';
			if (above === below && above === 0) { dir = 'down'; }
			if (g.every(function (it) { return it.slash; })) { dir = 'up'; }
			g.forEach(function (it, j) { it.dir = dir; it.beam = { g: gi, j: j, n: g.length }; });
		});

		// chords: a second puts one head on the other side of the stem; signs stack in columns
		items.forEach(function (it) {
			if (!it.heads) { return; }
			var h = it.heads, k;
			if (h.length > 1) {
				if (it.dir === 'up') { for (k = 1; k < h.length; k++) { if (h[k].step - h[k - 1].step === 1 && !h[k - 1].off) { h[k].off = 1; } } }
				else { for (k = h.length - 2; k >= 0; k--) { if (h[k + 1].step - h[k].step === 1 && !h[k + 1].off) { h[k].off = -1; } } }
			}
			var cols = [];
			for (k = h.length - 1; k >= 0; k--) {
				if (!h[k].show) { continue; }
				var c = 0;
				while (cols[c] != null && cols[c] - h[k].step < 6) { c++; }
				cols[c] = h[k].step; h[k].col = c;
			}
			it.accCols = cols.length;
		});
		return { bars: bars, items: items, groups: groups, mid: mid, clef: clef };
	}

	/* ---------- across the page ---------- */

	function gapWidth(beats) { return SP * (1.25 + 1.65 * Math.log(1 + 2 * beats) / Math.LN2); }
	function accWidth(it) {
		if (!it.heads) { return 0; }
		var w = 0;
		it.heads.forEach(function (h) { if (h.show) { w = Math.max(w, gw(accName(h.a)) + 4); } });
		return w ? w * (it.accCols || 1) + 4 : 0;
	}
	function accName(a) { return a === 1 ? 'accidentalSharp' : a === -1 ? 'accidentalFlat' : a === 2 ? 'accidentalDoubleSharp' : a === -2 ? 'accidentalDoubleFlat' : 'accidentalNatural'; }

	// Each bar's columns: one for every moment something starts, in any part.
	function columns(parts, bi, spec) {
		var map = {}, list = [], end = 0;
		var odd = parts.map(function (pt) { return pt.bars[bi]; }).filter(function (b) { return b && (b.simile || b.multi); })[0];
		if (odd) { return { list: [], full: false, lead: 0.9 * SP, tail: 0.9 * SP, fixed: (odd.multi ? 8.5 : 5.5) * SP }; }
		parts.forEach(function (pt) {
			var bar = pt.bars[bi]; if (!bar) { return; }
			end = Math.max(end, bar.full ? bar.nominal : bar.span);
			bar.items.forEach(function (it) {
				var key = Math.round(it.t * 960);
				if (!map[key]) { map[key] = { t: it.t, items: [], acc: 0, side: 0 }; list.push(map[key]); }
				var c = map[key];
				c.items.push(it);
				c.acc = Math.max(c.acc, accWidth(it));
				if (it.heads && it.heads.some(function (h) { return h.off; })) { c.side = HEAD; }
				if (it.dots) { c.side = Math.max(c.side, 10 + 12 * it.dots); }
				if (it.dur === 'w' && !it.rest) { c.side = Math.max(c.side, HEADW - HEAD); }
			});
		});
		list.sort(function (a, b) { return a.t - b.t; });
		var full = parts.every(function (pt) { return !pt.bars[bi] || pt.bars[bi].full; });
		list.forEach(function (c, k) {
			var next = k < list.length - 1 ? list[k + 1].t : end;
			c.gap = Math.max(0.125, next - c.t);
			c.w = full ? 7 * SP : gapWidth(c.gap) + c.side;
			// the name and count rows need room under quick notes
			if (spec.names || spec.counts) { c.w = Math.max(c.w, 2.9 * SP); }
		});
		var marked = parts.some(function (pt) { return pt.bars[bi] && pt.bars[bi].marks.some(function (m) { return m === 'coda' || m === 'segno'; }); });
		return { list: list, full: full, lead: (marked ? 2.4 : 1.3) * SP, tail: 0.9 * SP };
	}
	function barNatural(cols, bar) {
		var w = cols.lead + cols.tail + (cols.fixed || 0);
		cols.list.forEach(function (c, k) { w += c.w + (k ? c.acc : 0); });
		if (cols.list.length) { w += cols.list[0].acc; }
		if (bar.start === '|:') { w += 1.2 * SP; }
		if (bar.end === ':|') { w += 1.2 * SP; }
		return w;
	}

	/* ---------- drawing a staff ---------- */

	function Ink() { this.s = ''; this.lo = 0; this.hi = 4 * SP; }
	Ink.prototype.add = function (str, y1, y2) { this.s += str; if (y1 != null) { this.lo = Math.min(this.lo, y1, y2 == null ? y1 : y2); this.hi = Math.max(this.hi, y1, y2 == null ? y1 : y2); } };

	function stepY(pt, step) { return (pt.mid + 4 - step) * HALF; } // the top line is 0

	function render(spec) {
		spec = spec || {};
		var clef = spec.clef || 'bass', grand = clef === 'grand';
		var key = spec.key || 0, time = spec.time === undefined ? '4/4' : spec.time;
		var scale = 0.64 * (spec.scale || 1);
		var Wpx = spec.width || 640;
		var W = Math.max(300, Math.round(Wpx / scale));
		var plain = !!spec.plain;
		var pad = plain ? 10 : Math.max(26, Math.min(60, Math.round(W * 0.045)));
		var parts = grand ? [{ clef: 'treble', src: spec.notes && spec.notes.treble }, { clef: 'bass', src: spec.notes && spec.notes.bass }]
			: [{ clef: clef, src: spec.notes }];
		parts.forEach(function (pt) { var r = prepare(pt.src, pt.clef, key, time, spec.beam); for (var k in r) { pt[k] = r[k]; } });
		var main = parts[parts.length - 1];
		var nb = Math.max.apply(null, parts.map(function (p) { return p.bars.length; }));
		parts.forEach(function (pt) {
			while (pt.bars.length < nb) {
				var extra = M.parseNotes('r/w')[0]; extra.span = 4; extra.nominal = time ? M.barBeats(time) : 4; extra.full = true;
				extra.items[0].bar = pt.bars.length; extra.items[0].t = 0; extra.items[0].i = -1;
				pt.bars.push(extra);
			}
		});
		var bars = main.bars;
		var strings = spec.strings || 4, tab = !!spec.tab;

		// TAB: where each note of the main part is played
		if (tab) {
			var line = [], idx = [], fixed = [];
			main.items.forEach(function (it) {
				if (it.heads) { line.push(it.heads[0].p); idx.push(it); fixed.push(it.pos ? posOf(it.pos, strings) : null); }
			});
			var placed = M.fingerLine(line, { strings: strings, fixed: fixed, maxFret: spec.maxFret == null ? 17 : spec.maxFret });
			idx.forEach(function (it, k) {
				it.spots = [placed[k]];
				// the other notes of a chord go on other strings, as near the first as they can
				for (var h = 1; h < it.heads.length; h++) {
					var used = it.spots.map(function (s) { return s && s.s; });
					var best = null;
					M.positions(it.heads[h].p, { strings: strings, maxFret: 17 }).forEach(function (c) {
						if (used.indexOf(c.s) >= 0) { return; }
						var d = placed[k] ? Math.abs(c.f - placed[k].f) : c.f;
						if (!best || d < best.d) { best = { s: c.s, string: c.string, f: c.f, d: d }; }
					});
					it.spots.push(best);
				}
			});
		}

		// header widths
		var keyN = Math.abs(key);
		var tsig = time ? M.parseTime(time) : null;
		function headerW(first) {
			return 0.7 * SP + (spec.bare ? 0 : gw('fClef') + 0.9 * SP) + (keyN ? keyN * 1.15 * SP + 0.6 * SP : 0) + (first && tsig ? 2.6 * SP : 0) + (grand ? 1.2 * SP : 0);
		}

		// bars into lines
		var cols = [], natural = [];
		for (var b = 0; b < nb; b++) { cols.push(columns(parts, b, spec)); natural.push(barNatural(cols[b], bars[b])); }
		var room0 = W - 2 * pad - headerW(true), room = W - 2 * pad - headerW(false);
		function lines(share) {
			var out = [[]], used = 0;
			for (var k = 0; k < nb; k++) {
				var r = (out.length === 1 ? room0 : room) * share;
				var cur = out[out.length - 1];
				// a line may be squeezed a tenth tighter than its natural spacing rather than leave a bar alone on the next
				if (cur.length && (used + natural[k] > r * 1.1 || (spec.maxBars && cur.length >= spec.maxBars))) { out.push([]); used = 0; }
				out[out.length - 1].push(k); used += natural[k];
			}
			return out;
		}
		var sys = lines(1), tried, share;
		for (share = 0.5; share < 1; share += 0.05) { tried = lines(share); if (tried.length <= sys.length) { sys = tried; break; } }

		// spec.fit: when a line would be squeezed hard (on a phone, a bar of semiquavers), draw it all a little smaller instead
		if (spec.fit && !spec._fitted) {
			var tight = 1;
			sys.forEach(function (bl, si) { var nn = 0; bl.forEach(function (k) { nn += natural[k]; }); tight = Math.min(tight, (W - 2 * pad - headerW(si === 0)) / nn); });
			if (tight < 0.85) { var sp2 = {}; for (var kk in spec) { sp2[kk] = spec[kk]; } sp2._fitted = true; sp2.scale = (spec.scale || 1) * Math.max(0.7, tight / 0.85); return render(sp2); }
		}
		// one short line takes only the room it needs
		if (sys.length === 1 && !spec.stretch) {
			var nat = 0; sys[0].forEach(function (k) { nat += natural[k]; });
			var want = Math.ceil(2 * pad + headerW(true) + nat * 1.08 + (spec.ghost ? 3 * SP : 0));
			if (want < W) { W = Math.max(want, Math.round(240 / scale)); }
		}

		var out = '', notesOut = [], sysOut = [], y0 = plain ? 8 : 18, alt = [];
		var spotsOf = {};

		sys.forEach(function (barList, si) {
			var first = si === 0;
			var x = pad, hw = headerW(first);
			var avail = W - 2 * pad - hw;
			var nat = 0; barList.forEach(function (k) { nat += natural[k]; });
			var last = si === sys.length - 1;
			var stretch = avail / nat;
			if (last && sys.length > 1 && nat < 0.6 * avail) { stretch = 1; }
			if (sys.length === 1 && !spec.stretch) { stretch = Math.min(stretch, 1.08); }
			// lay the columns out
			var xs = [], bx = x + hw, barX = [];
			barList.forEach(function (k) {
				var c = cols[k], bar = bars[k], fixedW = c.lead + c.tail + (bar.start === '|:' ? 1.2 * SP : 0) + (bar.end === ':|' ? 1.2 * SP : 0);
				var flex = natural[k] - fixedW;
				var scaleBar = (natural[k] * stretch - fixedW) / flex;
				var start = bx;
				var cx = bx + c.lead + (bar.start === '|:' ? 1.2 * SP : 0);
				c.list.forEach(function (col, j) {
					cx += col.acc * scaleBar * (j ? 1 : 1);
					col.x = cx;
					cx += col.w * scaleBar;
				});
				if (c.full) { c.list.forEach(function (col) { col.x = start + (natural[k] * stretch) / 2 - HEAD / 2; }); }
				bx = start + natural[k] * stretch;
				barX.push({ k: k, x0: start, x1: bx });
			});
			var right = bx;

			// draw each staff
			var staffInk = parts.map(function (pt) { return drawStaff(pt, barList, cols, barX, right, first, si, sys, spec, tab && pt === main ? strings : 0); });
			// stack them
			var block = '', topOf = [], yy = 0;
			staffInk.forEach(function (ink, k) {
				if (k === 0) { yy = -ink.lo; topOf.push(yy); }
				else { var prevBottom = topOf[k - 1] + staffInk[k - 1].staffHi; yy = Math.max(topOf[k - 1] + 4 * SP + 4.5 * SP, prevBottom - ink.lo + 1.4 * SP); topOf.push(yy); }
				block += '<g transform="translate(0 ' + r1(yy) + ')">' + ink.s + '</g>';
			});
			var firstTop = topOf[0], lastTop = topOf[topOf.length - 1];
			var bottom = lastTop + staffInk[staffInk.length - 1].hi;
			// a grand staff is joined by its barlines and a brace
			if (grand) {
				var t0 = firstTop, t1 = lastTop + 4 * SP;
				block += vline(x + 1.1 * SP, t0, t1, LINE * 1.2);
				block += brace(x + 0.15 * SP, t0, t1);
				barX.forEach(function (bxx, j) {
					var bar = bars[bxx.k];
					var fin = bar.end === '|]' || bar.end === ':|' || (!bar.end && bxx.k === nb - 1 && spec.final !== false);
					block += fin ? vline(bxx.x1 - 15, firstTop + 4 * SP, lastTop, LINE) + vline(bxx.x1 - 3.5, firstTop + 4 * SP, lastTop, 7) : vline(bxx.x1, firstTop + 4 * SP, lastTop, LINE);
				});
			}
			out += '<g transform="translate(0 ' + r1(y0) + ')">' + block + '</g>';
			sysOut.push({
				i: si, x0: x + hw, x1: right, staves: parts.map(function (pt, k) { return { clef: pt.clef, top: y0 + topOf[k], mid: pt.mid }; }),
				bars: barList.slice()
			});
			staffInk[staffInk.length - 1].notes.forEach(function (n) { n.y += y0 + lastTop; n.sys = si; notesOut.push(n); });
			y0 += bottom + (si < sys.length - 1 ? 1.6 * SP : 0);
		});

		var H = Math.round(y0 + (plain ? 8 : 20));
		notesOut.sort(function (a, b) { return a.i - b.i; });

		// words, for anyone who can't see it
		alt.push((grand ? 'Piano score, treble and bass clef' : clef === 'treble' ? 'Treble clef' : 'Bass clef') +
			(key ? ', key signature of ' + M.keyList(key).length + (key > 0 ? ' sharp' : ' flat') + (Math.abs(key) > 1 ? 's' : '') : '') +
			(tsig ? ', ' + (tsig.sym === 'C' ? 'common time' : tsig.n + ' ' + tsig.d) : '') + (tab ? ', with TAB' : '') + '.');
		var said = [];
		main.items.forEach(function (it) {
			if (it.i < 0) { return; }
			var d = M.DUR_NAME[it.dur][0] + (it.dots ? ' (dotted)' : '');
			if (it.rest) { said.push(d.replace('note', 'rest')); return; }
			if (it.slash) { said.push('slash ' + d); return; }
			var w = it.heads.map(function (h) { return M.pretty(h.p); }).join(' ');
			var s = it.spots && it.spots[0] ? ' (' + it.spots[0].string + ' ' + (it.spots[0].f ? it.spots[0].f : 'open') + ')' : '';
			said.push(w + s + ' ' + d + (it.tie ? ', tied' : ''));
		});
		alt.push(said.join(', ') + '.');
		var altText = spec.title || alt.join(' ');

		var svg = '<svg xmlns="http://www.w3.org/2000/svg" class="rd-stave" viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="' + esc(altText) + '"' +
			(spec.stretch ? '' : ' style="max-width:' + Math.round(W * scale) + 'px"') + '>' +
			'<style>.rd-stave .is-cur{fill:' + ORANGE + '}.rd-stave .is-ok{fill:' + INK + '}.rd-stave .is-no{fill:' + WRONG + '}.rd-stave .is-dim{fill:' + MUTED + ';opacity:.55}' +
			'.rd-stave .is-hint{fill:' + ACCENT + '}.rd-stave .rd-ghost{fill:none;stroke:' + ORANGE + ';stroke-width:3}.rd-stave .rd-ghost-l{fill:' + ORANGE + ';opacity:.6}</style>' +
			(plain ? '' : rect(3, 3, W - 6, H - 6, ' rx="26" fill="' + CREAM + '" stroke="' + ORANGE + '" stroke-width="6"')) +
			'<g fill="' + INK + '">' + out + '</g></svg>';
		return { svg: svg, notes: notesOut, systems: sysOut, width: W, height: H, scale: scale, alt: altText, cssWidth: Math.round(W * scale) };

		/* ---------- one staff of one line ---------- */
		function drawStaff(pt, barList, cols, barX, right, first, si, sysList, spec, tabStrings) {
			var ink = new Ink(), notes = [];
			var isMain = pt === main;
			var x = pad;
			var midY = 2 * SP;
			// the staff
			var lines = '';
			for (var l = 0; l < 5; l++) { lines += hline(x, right, l * SP, LINE); }
			ink.add(lines, 0, 4 * SP);
			// clef, key, time
			var hx = x + 0.7 * SP + (grand ? 1.2 * SP : 0);
			if (!spec.bare) {
				ink.add(glyph(pt.clef === 'treble' ? 'gClef' : 'fClef', hx, pt.clef === 'treble' ? 3 * SP : SP), pt.clef === 'treble' ? -1.5 * SP : 0, pt.clef === 'treble' ? 5.7 * SP : 3.6 * SP);
				hx += gw('fClef') + 0.9 * SP;
			}
			if (keyN) {
				M.keySigSteps(key, pt.clef).forEach(function (st) {
					ink.add(glyph(key > 0 ? 'accidentalSharp' : 'accidentalFlat', hx, stepY(pt, st)));
					hx += 1.15 * SP;
				});
				hx += 0.6 * SP;
			}
			if (first && tsig) {
				if (tsig.sym) { ink.add(glyph(tsig.sym === 'C' ? 'timeSigCommon' : 'timeSigCutCommon', hx, midY)); }
				else { ink.add(timeDigits(tsig.n, hx, SP) + timeDigits(tsig.d, hx, 3 * SP)); }
			}
			// barlines and the bar-level marks
			var aboveRow = -2.4 * SP, needAbove = false;
			barX.forEach(function (bx, j) {
				var bar = pt.bars[bx.k];
				if (bar.start === '|:') { ink.add(repeatSign(bx.x0 + (j ? 0 : 0), true)); }
				var e = bar.end || (bx.k === nb - 1 ? (spec.final === false ? '|' : '|]') : '|');
				if (!time && !bar.end && bx.k !== nb - 1) { e = ''; }
				if (bx.k === nb - 1 && spec.final === false && !bar.end) { e = '|'; }
				if (e) { ink.add(barline(e, bx.x1)); }
			});
			// notes
			var groupsHere = {};
			barList.forEach(function (k, j) {
				var bar = pt.bars[k];
				bar.items.forEach(function (it) {
					if (bar.simile) { return; }
					var col = colAt(cols[k], it.t);
					it.x = col ? col.x : barX[j].x0 + SP;
					it.sys = si;
					if (it.beam) { (groupsHere[it.beam.g] = groupsHere[it.beam.g] || []).push(it); }
				});
			});
			// beams first decide where the stems end
			Object.keys(groupsHere).forEach(function (g) {
				var grp = groupsHere[g].filter(function (it) { return it.x != null; });
				if (!grp.length) { return; }
				if (grp.length !== grp[0].beam.n) { grp.forEach(function (it) { delete it.beam; }); return; }
				beamGroup(pt, grp, ink);
			});
			// what is written above and below, gathered so each sits on its own row
			var syms = [], dyns = [], texts = [], names = [], frets = [];
			barList.forEach(function (k, j) {
				var bar0 = pt.bars[k], bxk = barX[j];
				if (bar0.simile) { ink.add(glyph('repeat1Bar', (bxk.x0 + bxk.x1) / 2 - gw('repeat1Bar') / 2, 2 * SP)); return; }
				if (bar0.multi) {
					var mx0 = bxk.x0 + 1.4 * SP, mx1 = bxk.x1 - 1.4 * SP;
					ink.add(rect(mx0, 2 * SP - 0.3 * SP, mx1 - mx0, 0.6 * SP) + vline(mx0, SP, 3 * SP, LINE * 1.3) + vline(mx1, SP, 3 * SP, LINE * 1.3) + timeDigits(bar0.multi, (mx0 + mx1) / 2 - 0.9 * SP, -1.3 * SP), -2.4 * SP, 3 * SP);
					return;
				}
				pt.bars[k].items.forEach(function (it) {
					drawItem(pt, it, ink, pt.bars[k], cols[k], barX);
					if (it.i < 0) { return; }
					var cxm = it.x + HEAD / 2;
					if (it.sym) { syms.push({ x: it.x, s: it.sym }); }
					if (it.dyn) { dyns.push({ x: it.x, s: it.dyn }); }
					if (isMain) {
						var label = it.text != null ? it.text : spec.counts ? countOf(it, pt) : null;
						if (label != null) { texts.push({ x: cxm, s: label, i: it.i }); }
						if (spec.names && it.heads) { names.push({ x: cxm, s: it.heads.map(function (h) { return M.pretty(h.p); }).reverse().join('\n'), i: it.i, n: it.heads.length }); }
						if (tabStrings && it.spots) {
							var tiedIn = pt.items[it.i - 1] && pt.items[it.i - 1].tie;
							it.spots.forEach(function (s) { if (s) { frets.push({ x: cxm, s: s, i: it.i, tied: tiedIn, ghost: !!it.ghost }); } });
						}
						var yTop = it.heads ? stepY(pt, it.hi) : midY;
						notes.push({ i: it.i, x: cxm, y: yTop, bar: it.bar, t: it.gt, beats: it.beats, rest: !!it.rest, slash: !!it.slash,
							pitches: it.heads ? it.heads.map(function (h) { return h.p; }) : [], tie: !!it.tie,
							string: it.spots && it.spots[0] ? it.spots[0].s : null, fret: it.spots && it.spots[0] ? it.spots[0].f : null });
					}
				});
			});
			// ties and slurs
			drawCurves(pt, barList, ink, right, barX);
			// triplets
			drawTuplets(pt, barList, ink);
			// room kept above and below for writing on the stave (spec.reserve: {lo, hi} as pitches)
			if (spec.reserve && pt === main) { ink.add('', stepY(pt, M.step(spec.reserve.hi)) - 1.2 * SP, stepY(pt, M.step(spec.reserve.lo)) + 1.2 * SP); }
			// above the staff: roadmap marks, voltas, chord symbols
			var top = Math.min(ink.lo, 0);
			var markRow = Math.min(-1.6 * SP, top - 0.9 * SP);
			var wrote = false;
			barX.forEach(function (bx) {
				var bar = pt.bars[bx.k];
				if (pt !== parts[0]) { return; }
				bar.marks.forEach(function (m) {
					if (m === 'segno' || m === 'coda') { ink.add(glyphAt(m, bx.x0 + 0.9 * SP, markRow + 4, 0.62), markRow - 2.4 * SP, markRow); wrote = true; }
					else if (NAV[m]) {
						var cw = m === 'tocoda' ? gw('coda') * 0.5 + 6 : 0;
						ink.add(txt(bx.x1 - 0.3 * SP - cw, markRow, NAV[m], ' text-anchor="end" font-size="22" font-style="italic" font-weight="700" style="font-family:' + BODY + '"'), markRow - 20, markRow);
						if (m === 'tocoda') { ink.add(glyphAt('coda', bx.x1 - 0.3 * SP - cw + 6, markRow + 4, 0.5)); }
						wrote = true;
					}
				});
			});
			if (pt === parts[0]) {
				if (syms.length) {
					var sRow = Math.min(-1.2 * SP, ink.lo - 0.7 * SP);
					syms.forEach(function (s) { ink.add(txt(s.x, sRow, s.s, ' font-size="27" font-weight="600" fill="' + ACCENT + '" style="font-family:' + BODY + '"'), sRow - 24, sRow); });
				}
				barX.forEach(function (bx) {
					var rm = pt.bars[bx.k].rehearsal; if (!rm) { return; }
					var ry = Math.min(-2.2 * SP, ink.lo - 0.6 * SP), rw = 14 + 17 * rm.length, rx = bx.x0 - (bx.k === barList[0] ? -2 : rw / 2);
					ink.add(hline(rx, rx + rw, ry - 30, 2.4) + hline(rx, rx + rw, ry + 6, 2.4) + vline(rx, ry - 30, ry + 6, 2.4) + vline(rx + rw, ry - 30, ry + 6, 2.4) +
						txt(rx + rw / 2, ry - 3, rm, ' text-anchor="middle" font-size="28" font-weight="700" style="font-family:' + BODY + '"'), ry - 32, ry + 8);
				});
				if (spec.tempo && si === 0) {
					// a style word first, as a chart has it ("Soul"), then the beat note (dotted in compound time) = N
					var ty = Math.min(-1.6 * SP, ink.lo - 0.6 * SP), tx = pad + 0.6 * SP, mk = '';
					if (spec.style) { mk += txt(tx, ty, spec.style, ' font-size="25" font-weight="700" font-style="italic" style="font-family:' + BODY + '"'); tx += 13.5 * spec.style.length + 14; }
					var dotted = spec.time && M.beatUnit(spec.time) === 1.5;
					mk += glyphAt('noteheadBlack', tx, ty - 4, 0.75) + vline(tx + HEAD * 0.75 - 1.5, ty - 4, ty - 4 - 2.6 * SP, 2.2);
					if (dotted) { mk += glyphAt('augmentationDot', tx + HEAD * 0.75 + 5, ty - 4, 0.75); }
					mk += txt(tx + HEAD * 0.75 + (dotted ? 18 : 8), ty, '= ' + spec.tempo, ' font-size="24" font-weight="600" style="font-family:' + BODY + '"');
					ink.add(mk, ty - 2.8 * SP, ty + 4);
				}
				var vRow = Math.min(-1.8 * SP, Math.min(ink.lo, 0) - 1.2 * SP);
				for (var v = 0; v < barX.length; v++) {
					var bar = pt.bars[barX[v].k];
					if (!bar.volta) { continue; }
					var w = v;
					while (w < barX.length - 1 && !/:\||\|\||\|\]/.test(pt.bars[barX[w].k].end || '') && !pt.bars[barX[w + 1].k].volta) { w++; }
					var vx0 = barX[v].x0 + 4, vx1 = barX[w].x1 - (bar.volta === 1 ? 8 : 24);
					ink.add(vline(vx0, vRow, vRow + 1.6 * SP, LINE) + hline(vx0, vx1, vRow, LINE) + (bar.volta === 1 ? vline(vx1, vRow, vRow + 1.6 * SP, LINE) : '') +
						txt(vx0 + 8, vRow + 24, bar.volta + '.', ' font-size="24" font-weight="700" style="font-family:' + BODY + '"'), vRow - 2, vRow + 1.6 * SP);
				}
			}
			// below: dynamics, counts, names, TAB
			var staffHi = ink.hi;
			var y = Math.max(4 * SP, ink.hi);
			if (dyns.length) {
				y += 1.9 * SP;
				dyns.forEach(function (d) { ink.add(dynamic(d.s, d.x, y), y - SP, y + 4); });
			}
			if (texts.length) {
				y = Math.max(y + 1.6 * SP, ink.hi + 1.3 * SP);
				texts.forEach(function (t) { ink.add(txt(t.x, y, t.s, ' text-anchor="middle" font-size="22" font-weight="600" fill="' + MUTED + '" data-text="' + t.i + '" style="font-family:' + BODY + '"'), y - 18, y + 4); });
			}
			if (names.length) {
				y = Math.max(y + 1.6 * SP, ink.hi + 1.4 * SP);
				var maxN = 1;
				names.forEach(function (n) {
					var linesN = n.s.split('\n'); maxN = Math.max(maxN, linesN.length);
					linesN.forEach(function (ln, q) {
						ink.add(txt(n.x, y + q * 24, ln, ' text-anchor="middle" font-size="22" font-weight="600" data-name="' + n.i + '" style="font-family:' + BODY + '"'), y - 18, y + q * 24 + 4);
					});
				});
				y += (maxN - 1) * 24;
			}
			if (tabStrings) {
				var tt = Math.max(y + 1.9 * SP, ink.hi + 1.7 * SP, 4 * SP + 2.9 * SP), tb = tt + TABGAP * (tabStrings - 1), tc = (tt + tb) / 2;
				var tl = '';
				for (var s = 0; s < tabStrings; s++) { tl += hline(pad, right, tt + s * TABGAP, LINE * 0.85); }
				for (s = 0; s < 3; s++) { tl += txt(pad + 0.9 * SP, tc + (s - 1) * 27 + 7, 'TAB'.charAt(s), ' text-anchor="middle" font-size="21" font-weight="700" style="font-family:' + BODY + '"'); }
				barX.forEach(function (bx, j) {
					var bar = pt.bars[bx.k], e = bar.end || (bx.k === nb - 1 ? '|]' : '|');
					if (!time && !bar.end && bx.k !== nb - 1) { return; }
					tl += vline(bx.x1 - (e === '|]' || e === ':|' ? 3 : 0), tt, tb, e === '|]' || e === ':|' ? 7 : LINE);
				});
				frets.forEach(function (f) {
					var fy = tb - f.s.s * TABGAP, lab = f.ghost ? 'x' : f.tied ? '(' + f.s.f + ')' : String(f.s.f), wdt = lab.length > 1 ? 14 * lab.length + 8 : 30;
					tl += rect(f.x - wdt / 2, fy - 15, wdt, 30, ' rx="5" fill="' + CREAM + '"') +
						txt(f.x, fy + 8, lab, ' text-anchor="middle" font-size="24" font-weight="700" data-fret="' + f.i + '" style="font-family:' + MONO + '"');
				});
				ink.add(tl, tt - 16, tb + 16);
			}
			ink.staffHi = staffHi;
			ink.notes = notes;
			ink.lo = Math.min(ink.lo, top);
			return ink;
		}

		function colAt(c, t) { for (var k = 0; k < c.list.length; k++) { if (Math.abs(c.list[k].t - t) < 1e-6) { return c.list[k]; } } return null; }

		function timeDigits(n, x, y) {
			var s = String(n), w = 0, out = '', k;
			for (k = 0; k < s.length; k++) { w += gw('timeSig' + s[k]); }
			var cx = x + (1.8 * SP - w) / 2;
			for (k = 0; k < s.length; k++) { out += glyph('timeSig' + s[k], cx, y); cx += gw('timeSig' + s[k]); }
			return out;
		}
		function repeatSign(x, start) {
			var a = start ? x + 5 : x;
			return vline(a, 0, 4 * SP, 7) + vline(a + 12, 0, 4 * SP, LINE) + dots(a + 24);
			function dots(dx) { return '<circle cx="' + r1(dx) + '" cy="' + 1.5 * SP + '" r="3.6"/><circle cx="' + r1(dx) + '" cy="' + 2.5 * SP + '" r="3.6"/>'; }
		}
		function barline(e, x) {
			if (e === '||') { return vline(x - 9, 0, 4 * SP, LINE) + vline(x, 0, 4 * SP, LINE); }
			if (e === '|]') { return vline(x - 15, 0, 4 * SP, LINE) + vline(x - 3.5, 0, 4 * SP, 7); }
			if (e === ':|') {
				return '<circle cx="' + r1(x - 27) + '" cy="' + 1.5 * SP + '" r="3.6"/><circle cx="' + r1(x - 27) + '" cy="' + 2.5 * SP + '" r="3.6"/>' +
					vline(x - 15, 0, 4 * SP, LINE) + vline(x - 3.5, 0, 4 * SP, 7);
			}
			return vline(x, 0, 4 * SP, LINE);
		}
		function brace(x, y1, y2) {
			var h = y2 - y1, m = (y1 + y2) / 2, w = 0.9 * SP;
			return '<path d="M' + r1(x + w) + ' ' + r1(y1) + 'C' + r1(x) + ' ' + r1(y1 + h * 0.12) + ' ' + r1(x + w) + ' ' + r1(m - h * 0.12) + ' ' + r1(x) + ' ' + r1(m) +
				'C' + r1(x + w) + ' ' + r1(m + h * 0.12) + ' ' + r1(x) + ' ' + r1(y2 - h * 0.12) + ' ' + r1(x + w) + ' ' + r1(y2) +
				'C' + r1(x + w * 0.4) + ' ' + r1(y2 - h * 0.12) + ' ' + r1(x + w * 1.3) + ' ' + r1(m + h * 0.1) + ' ' + r1(x + 2) + ' ' + r1(m) +
				'C' + r1(x + w * 1.3) + ' ' + r1(m - h * 0.1) + ' ' + r1(x + w * 0.4) + ' ' + r1(y1 + h * 0.12) + ' ' + r1(x + w) + ' ' + r1(y1) + 'Z"/>';
		}
		function dynamic(s, x, y) {
			var out = '', cx = x;
			for (var k = 0; k < s.length; k++) {
				var g = s[k] === 'p' ? 'dynamicPiano' : s[k] === 'f' ? 'dynamicForte' : s[k] === 'm' ? 'dynamicMezzo' : null;
				if (g) { out += glyph(g, cx, y); cx += gw(g) * 0.92; }
			}
			return out;
		}

		// "1 e & a": the count a note starts on, as Jack teaches it
		function countOf(it, pt) {
			var beat = M.beatUnit(time), b = it.t / beat, whole = Math.floor(b + 1e-6), frac = b - whole;
			if (it.tup) { var q = Math.round(frac * 3); return q === 0 ? String(whole + 1) : q === 1 ? 'trip' : 'let'; }
			if (beat === 1.5) { var e8 = Math.round(frac * 3); return e8 === 0 ? String(whole + 1) : e8 === 1 ? '&' : 'a'; }
			var s = Math.round(frac * 4);
			return s === 0 ? String(whole + 1) : s === 1 ? 'e' : s === 2 ? '&' : 'a';
		}

		function stemX(it) { return it.dir === 'up' ? it.x + HEAD - STEM / 2 : it.x + STEM / 2; }

		function beamGroup(pt, grp, ink) {
			var up = grp[0].dir === 'up';
			var levels = grp.map(function (it) { return BEAMABLE[it.dur] || 1; });
			var maxL = Math.max.apply(null, levels);
			var x0 = stemX(grp[0]), x1 = stemX(grp[grp.length - 1]);
			var yN = function (it) { return up ? stepY(pt, it.hi) : stepY(pt, it.lo); };
			var slope = x1 > x0 ? (yN(grp[grp.length - 1]) - yN(grp[0])) / (x1 - x0) : 0;
			slope = Math.max(-0.18, Math.min(0.18, slope * 0.5));
			var minLen = STEM_LEN - 6 + (maxL - 1) * BEAM_STEP * 0.6;
			var bTop = up ? Infinity : -Infinity;
			grp.forEach(function (it) {
				var sx = stemX(it), want = up ? yN(it) - minLen - slope * (sx - x0) : yN(it) + minLen - slope * (sx - x0);
				bTop = up ? Math.min(bTop, want) : Math.max(bTop, want);
			});
			// a beam far off the staff is brought back to the middle line
			var midY = 2 * SP;
			grp.forEach(function (it) {
				var sx = stemX(it), at = bTop + slope * (sx - x0);
				if (up && at > midY && yN(it) > midY + SP) { bTop -= at - midY; }
				if (!up && at < midY && yN(it) < midY - SP) { bTop += midY - at; }
			});
			var beamY = function (sx) { return bTop + slope * (sx - x0); };
			grp.forEach(function (it) { it.stemEnd = beamY(stemX(it)); });
			var path = '', dirSign = up ? 1 : -1;
			for (var L = 1; L <= maxL; L++) {
				var off = (L - 1) * BEAM_STEP * dirSign;
				var k = 0;
				while (k < grp.length) {
					if (levels[k] < L) { k++; continue; }
					var j = k;
					while (j + 1 < grp.length && levels[j + 1] >= L) { j++; }
					var xa = stemX(grp[k]) - STEM / 2, xb = stemX(grp[j]) + STEM / 2;
					if (j === k) {
						// a lone short note: a stub, pointing into the group
						var len = 0.95 * SP;
						var left = k === grp.length - 1 || (k > 0 && levels[k - 1] < levels[k] && (grp[k].t % 1) > 0.4);
						if (k === 0) { left = false; }
						if (left) { xa = xb - len; } else { xb = xa + len; }
					}
					var ya = beamY(xa) + off, yb = beamY(xb) + off, t = up ? BEAM : -BEAM;
					path += 'M' + r1(xa) + ' ' + r1(ya) + 'L' + r1(xb) + ' ' + r1(yb) + 'L' + r1(xb) + ' ' + r1(yb + t) + 'L' + r1(xa) + ' ' + r1(ya + t) + 'Z';
					k = j + 1;
				}
			}
			var lo = Math.min(beamY(x0), beamY(x1)) - (up ? 0 : maxL * BEAM_STEP);
			var hi = Math.max(beamY(x0), beamY(x1)) + (up ? maxL * BEAM_STEP : 0);
			ink.add('<path d="' + path + '"/>', lo, hi);
		}

		function drawItem(pt, it, ink, bar, cols, barX) {
			var cls = isMainPart(pt) && spec.mark && spec.mark[it.i] ? ' class="is-' + spec.mark[it.i] + '"' : '';
			var g = '', x = it.x, midY = 2 * SP, lo = midY, hi = midY;
			if (it.rest) {
				var rx = x, ry = midY, name = REST[it.dur];
				if (bar.full) { name = 'restWhole'; }
				if (name === 'restWhole') { ry = SP; }
				if (name === 'restWhole' || name === 'restHalf') { rx = x + HEAD / 2 - gw(name) / 2; }
				g += glyph(name, rx, ry);
				lo = ry - 1.6 * SP; hi = ry + 1.6 * SP;
				for (var d = 0; d < it.dots; d++) { g += glyph('augmentationDot', rx + gw(name) + 6 + d * 12, midY - HALF); }
			} else if (it.slash) {
				var sy = midY;
				// a minim or semibreve slash is open, as an open notehead is; dots sit in the space above the middle line
				var openSlash = it.dur === 'h' || it.dur === 'w';
				g += openSlash
					? '<path d="M' + r1(x - 1) + ' ' + r1(sy + SP) + 'L' + r1(x + 11) + ' ' + r1(sy + SP) + 'L' + r1(x + HEAD + 4) + ' ' + r1(sy - SP) + 'L' + r1(x + HEAD - 8) + ' ' + r1(sy - SP) + 'Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>'
					: '<path d="M' + r1(x) + ' ' + r1(sy + SP) + 'L' + r1(x + 8) + ' ' + r1(sy + SP) + 'L' + r1(x + HEAD + 2) + ' ' + r1(sy - SP) + 'L' + r1(x + HEAD - 6) + ' ' + r1(sy - SP) + 'Z"/>';
				for (var sd = 0; sd < it.dots; sd++) { g += glyph('augmentationDot', x + HEAD + 10 + sd * 12, sy - HALF); }
				if (it.dur !== 'w') {
					var sx0 = x + HEAD - STEM / 2;
					var end = it.beam ? it.stemEnd : sy - STEM_LEN;
					g += vline(sx0, sy - SP * 0.6, end, STEM);
					if (!it.beam && FLAG[it.dur]) { g += glyph('flag' + FLAG[it.dur] + 'Up', sx0 - STEM / 2, end); }
					lo = Math.min(lo, end);
				}
			} else {
				var heads = it.heads, up = it.dir === 'up';
				var headName = it.ghost ? (it.dur === 'w' ? 'noteheadXWhole' : it.dur === 'h' ? 'noteheadXHalf' : 'noteheadXBlack') : it.dur === 'w' ? 'noteheadWhole' : it.dur === 'h' ? 'noteheadHalf' : 'noteheadBlack';
				var hwid = it.dur === 'w' ? HEADW : HEAD;
				// ledger lines
				var topStep = pt.mid + 4, botStep = pt.mid - 4;
				var ledgerL = x - 0.42 * SP, ledgerR = x + hwid + 0.42 * SP;
				if (heads.some(function (h) { return h.off; })) { if (up) { ledgerR += HEAD; } else { ledgerL -= HEAD; } }
				for (var st = topStep + 2; st <= it.hi; st += 2) { g += hline(ledgerL, ledgerR, stepY(pt, st), LEDGER); }
				for (st = botStep - 2; st >= it.lo; st -= 2) { g += hline(ledgerL, ledgerR, stepY(pt, st), LEDGER); }
				heads.forEach(function (h) {
					var y = stepY(pt, h.step), hx = x + h.off * (HEAD - STEM);
					g += glyph(headName, hx, y);
					if (h.show) {
						var an = accName(h.a), aw = gw(an);
						var ax = x - 5 - aw - h.col * (aw + 3) - (heads.some(function (q) { return q.off < 0; }) ? HEAD : 0);
						g += glyph(an, ax, y);
					}
					for (var dd = 0; dd < it.dots; dd++) {
						var dy = (h.step - pt.mid) % 2 === 0 ? y - HALF : y;
						g += glyph('augmentationDot', x + hwid + 7 + (heads.some(function (q) { return q.off > 0; }) ? HEAD : 0) + dd * 12, dy);
					}
					lo = Math.min(lo, y - 1.4 * SP); hi = Math.max(hi, y + 1.4 * SP);
				});
				// stem and flag
				if (it.dur !== 'w') {
					var sx = stemX(it), yTop = stepY(pt, it.hi), yBot = stepY(pt, it.lo), endY;
					if (it.beam) { endY = it.stemEnd; }
					else if (up) { endY = Math.min(yTop - STEM_LEN - (it.dur === '16' ? 8 : 0), yBot > midY + SP ? midY : Infinity); }
					else { endY = Math.max(yBot + STEM_LEN + (it.dur === '16' ? 8 : 0), yTop < midY - SP ? midY : -Infinity); }
					g += up ? vline(sx, yBot - 2, endY, STEM) : vline(sx, yTop + 2, endY, STEM);
					if (!it.beam && FLAG[it.dur]) { g += glyph('flag' + FLAG[it.dur] + (up ? 'Up' : 'Down'), sx - STEM / 2, endY); }
					lo = Math.min(lo, endY - (up && !it.beam && FLAG[it.dur] ? 0 : 0)); hi = Math.max(hi, endY);
					it.stemTip = endY;
				}
				// articulations, on the head's side
				var ay = up ? stepY(pt, it.lo) + 1.25 * SP : stepY(pt, it.hi) - 0.95 * SP;
				it.art.forEach(function (a) {
					var gname = a === 'accent' ? 'articAccentAbove' : a === 'staccato' ? 'articStaccatoAbove' : 'articTenutoAbove';
					var gx = x + hwid / 2 - gw(gname) / 2;
					g += glyph(gname, gx, up ? ay + (a === 'accent' ? SP : 0.3 * SP) : ay);
					if (up) { hi = Math.max(hi, ay + SP); ay += 0.9 * SP; } else { lo = Math.min(lo, ay - SP); ay -= 0.9 * SP; }
				});
			}
			ink.add('<g data-i="' + it.i + '"' + cls + '>' + g + '</g>', lo, hi);
		}

		function isMainPart(pt) { return pt === main; }

		function drawCurves(pt, barList, ink, right, barX) {
			var here = {};
			barList.forEach(function (k) { pt.bars[k].items.forEach(function (it) { here[it.i] = it; }); });
			var startX = barX[0].x0 + 0.4 * SP;
			pt.items.forEach(function (it, n) {
				var next = pt.items[n + 1];
				// a tie between rhythm slashes: under the slashes, as their stems go up
				if (it.slash && it.tie && next && next.slash && (here[it.i] || here[next.i])) {
					var sy = stepY(pt, pt.mid) + 1.1 * SP;
					ink.add(arc(here[it.i] ? it.x + HEAD * 0.85 : startX, here[next.i] ? next.x + HEAD * 0.15 : right - 0.3 * SP, sy, true, 0.5 * SP), sy - SP, sy + SP);
				}
				if (!it.heads) { return; }
				if (it.tie && next && next.heads) {
					it.heads.forEach(function (h) {
						if (!next.pitches || next.pitches.indexOf(h.p) < 0) { return; }
						var below = it.dir === 'up' || it.heads.length > 1 && h !== it.heads[it.heads.length - 1];
						if (it.heads.length > 1) { below = h !== it.heads[it.heads.length - 1] && (h === it.heads[0] || h.step < (it.lo + it.hi) / 2); }
						var y = stepY(pt, h.step) + (below ? 0.55 * SP : -0.55 * SP);
						if (here[it.i] && here[next.i]) { ink.add(arc(it.x + HEAD * 0.85, next.x + HEAD * 0.15, y, below, 0.55 * SP), y - SP, y + SP); }
						else if (here[it.i]) { ink.add(arc(it.x + HEAD * 0.85, right - 0.3 * SP, y, below, 0.5 * SP), y - SP, y + SP); }
						else if (here[next.i]) { ink.add(arc(startX, next.x + HEAD * 0.15, y, below, 0.5 * SP), y - SP, y + SP); }
					});
				}
				if (it.slide && next && next.heads && here[it.i] && here[next.i]) {
					var y1 = stepY(pt, it.hi), y2 = stepY(pt, next.hi), dy = y2 > y1 ? 0.5 * SP : y2 < y1 ? -0.5 * SP : 0;
					var sx1 = it.x + HEAD + 0.25 * SP + (it.dots ? 0.6 * SP : 0), sx2 = next.x - 0.3 * SP - (next.heads.some(function (h) { return h.show; }) ? 1.2 * SP : 0);
					if (sx2 > sx1 + 4) { ink.add('<path d="M' + r1(sx1) + ' ' + r1(y1 - dy) + 'L' + r1(sx2) + ' ' + r1(y2 + dy) + '" stroke="currentColor" stroke-width="2.6" fill="none"/>'); }
				}
				if (it.slurStart) {
					var m = n + 1;
					while (m < pt.items.length && !pt.items[m].slurEnd) { m++; }
					var end = pt.items[m];
					if (!end) { return; }
					var below2 = it.dir === 'up';
					var ya = (below2 ? stepY(pt, it.lo) + 0.8 * SP : stepY(pt, it.hi) - 0.8 * SP);
					var yb = end.heads ? (below2 ? stepY(pt, end.lo) + 0.8 * SP : stepY(pt, end.hi) - 0.8 * SP) : ya;
					var ext = 0;
					for (var q = n; q <= m; q++) { var iq = pt.items[q]; if (iq.heads) { ext = below2 ? Math.max(ext, stepY(pt, iq.lo) + 0.8 * SP) : Math.min(ext || 1e9, stepY(pt, iq.hi) - 0.8 * SP); } }
					var yy = below2 ? Math.max(ya, yb, ext) : Math.min(ya, yb, ext);
					var xa = here[it.i] ? it.x + HEAD / 2 : startX, xb = here[end.i] ? end.x + HEAD / 2 : right - 0.3 * SP;
					if (here[it.i] || here[end.i]) { ink.add(arc(xa, xb, yy, below2, 0.9 * SP), yy - 1.2 * SP, yy + 1.2 * SP); }
				}
			});
		}
		function arc(x1, x2, y, below, h) {
			var s = below ? 1 : -1, mx = (x1 + x2) / 2, th = 3.2;
			h = Math.min(h, Math.max(8, (x2 - x1) * 0.25));
			return '<path d="M' + r1(x1) + ' ' + r1(y) + 'Q' + r1(mx) + ' ' + r1(y + s * h * 2) + ' ' + r1(x2) + ' ' + r1(y) + 'Q' + r1(mx) + ' ' + r1(y + s * (h * 2 - th)) + ' ' + r1(x1) + ' ' + r1(y) + 'Z"/>';
		}

		function drawTuplets(pt, barList, ink) {
			var seen = {};
			barList.forEach(function (k) {
				if (pt.bars[k].simile) { return; }
				pt.bars[k].items.forEach(function (it) {
					if (!it.tup || seen[it.tup.id]) { return; }
					seen[it.tup.id] = true;
					var grp = pt.items.filter(function (q) { return q.tup && q.tup.id === it.tup.id; });
					var a = grp[0], b = grp[grp.length - 1];
					var beamed = grp.every(function (q) { return q.beam; });
					var up = (a.dir || 'up') === 'up';
					var xa = a.x, xb = b.x + HEAD, mx = (xa + xb) / 2;
					var y;
					if (beamed) { y = up ? Math.min(a.stemEnd, b.stemEnd) - 0.7 * SP : Math.max(a.stemEnd, b.stemEnd) + 1.5 * SP; }
					else {
						var ext = up ? 1e9 : -1e9;
						grp.forEach(function (q) { var e = q.stemTip != null ? q.stemTip : 2 * SP; ext = up ? Math.min(ext, e) : Math.max(ext, e); });
						y = up ? Math.min(ext, -0.2 * SP) - 0.8 * SP : Math.max(ext, 4.2 * SP) + 1.4 * SP;
						var by = up ? y - 0.15 * SP : y - 0.75 * SP;
						ink.add(hline(xa, mx - 14, by, 2) + hline(mx + 14, xb, by, 2) + vline(xa, by, by + (up ? 10 : -10), 2) + vline(xb, by, by + (up ? 10 : -10), 2));
					}
					ink.add(txt(mx, y, String(a.tup.n), ' text-anchor="middle" font-size="25" font-style="italic" font-weight="700" style="font-family:' + BODY + '"'), y - 24, y + 4);
				});
			});
		}
	}

	function posOf(pos, strings) {
		var tun = M.strings(strings);
		for (var k = 0; k < tun.length; k++) { if (M.parse(tun[k]).L === pos.s) { return { s: k, string: pos.s, f: pos.f }; } }
		return null;
	}

	/* For writing on the stave: which line or space a point is nearest, on a staff of a line.
	   y is in drawing units (as result.systems gives the staff's top). */
	function stepAt(system, staffIndex, y) {
		var st = system.staves[staffIndex || 0];
		var offset = Math.round((y - st.top) / HALF);
		return st.mid + 4 - offset;
	}

	/* A single note, large, for naming: a bar of one note, no time signature. */
	function one(pitch, o) {
		o = o || {};
		var dur = o.dur || 'w';
		return render({ notes: (o.pitch2 ? pitch + '+' + o.pitch2 : pitch) + '/' + dur, clef: o.clef || 'bass', key: o.key || 0, time: null, width: o.width || 260,
			scale: o.scale || 1.25, tab: !!o.tab, strings: o.strings, names: !!o.names, mark: o.mark, title: o.title, final: false });
	}

	var RDStave = { render: render, one: one, stepAt: stepAt, SP: SP, HALF: HALF, COLOURS: { cream: CREAM, ink: INK, orange: ORANGE, accent: ACCENT, muted: MUTED, wrong: WRONG } };
	if (typeof module !== 'undefined' && module.exports) { module.exports = RDStave; } else { root.RDStave = RDStave; }
})(typeof window !== 'undefined' ? window : this);
