/*
 * Leith Bass Space: Read, on the page.
 *
 * Two rooms, as in Harmonic Elements:
 *   The Guide   the course: reading notation on the bass, a page at a time, every
 *               example written out (with TAB where it helps) and playable.
 *   The Dojo    where the connections are made: page to name, page to neck, neck to
 *               page, page to hands, symbol to time. Every answer is timed, and the
 *               Map shows which notes are immediate and which still take a moment.
 *
 * The rules are in the rd-*.js files beside this one: rd-music.js (theory, the
 * notation string, the neck), rd-stave.js (the engraver), rd-data.js (what the
 * Dojo asks, marking, the record, Today and the Map), rd-figures.js (keyboard and
 * circle) and rd-guide.js (the course text). This file is the screen. Sound is
 * the house band's (he-synth.js, he-audio.js); necks are lbs-bass.js's. The
 * microphone is the Shed tuner's (shed-tuner.js, lbs-listen.js), fetched only if
 * someone chooses to play into it. The address remembers where you are
 * (#guide/ledger, #dojo/find), so the back button and a shared link both work.
 *
 * window.LBS_READ (printed by the plugin):
 *   sounds, ver       where the house band's sound files are, and the plugin's version
 *   tuner, listen     the two scripts for hearing a bass
 *   member            true for a signed-in member: the record is kept with their account
 *   record            {log, share} for a member
 *   rest, nonce       where a member's record is saved
 *   signin            where a visitor can sign in ('' for a member)
 */
(function () {
	'use strict';
	var RD = window.RD, M = window.RDM, ST = window.RDStave, FG = window.RDFigures, HE = window.HE, BASS = window.LBSBass, CFG = window.LBS_READ || {};
	var app = document.getElementById('rd');
	if (!app || !RD || !M || !ST || !RD.GUIDE) { return; }

	var $ = function (id) { return document.getElementById('rd-' + id); };
	var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
	var STORE = 'lbs.read.v1', LOGSTORE = 'lbs.read.log.v1';
	var MEMBER = !!CFG.member;
	var GUIDE = RD.GUIDE;
	if (CFG.sounds && HE && HE.sounds) { HE.sounds.base = CFG.sounds; HE.sounds.version = CFG.ver || ''; }
	function extend(a, b) { var o = {}, k; for (k in a) { o[k] = a[k]; } for (k in b) { o[k] = b[k]; } return o; }
	function now() { return window.performance && performance.now ? performance.now() : Date.now(); }
	function load(key, fallback) { try { var v = JSON.parse(window.localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; } }
	function keep(key, v) { try { window.localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* private window: fine without */ } }
	function secs(ms) { return ms == null ? '' : (ms / 1000).toFixed(1) + ' s'; }
	function nice(p) { return M.pretty(p); }

	/* ---------- what is remembered ---------- */

	var DEFAULTS = {
		strings: 4, maxFret: 12, voice: 'ebass', after: 'next',
		notes: { set: 'open', accidentals: 'none', key: 0 }, every: false, playLen: 6, playVia: 'tap',
		tap: { level: 1, bars: 2, counts: true, first: false, bpm: 0 }, latency: 0,
		hear: { level: 1 },
		rwrite: { level: 1 },
		sight: { level: 1, bpm: 0, band: 'click', tab: false, mic: false, look: 10 },
		band: { level: 1, bpm: 0, band: 'band', tab: false, mic: false, look: 10 },
		key: { range: 4, mode: 'major', clef: 'bass', reverse: false },
		int: { set: 'numbers', harmonic: false },
		chord: { set: 'diatonic', broken: false },
		map: 'all', strand: 'notes', drill: { notes: 'name', neck: 'find', rhythm: 'tap', sight: 'sight', theory: 'key' }
	};
	var saved = load(STORE, {});
	var SET = extend(DEFAULTS, saved.set || {});
	['notes', 'tap', 'hear', 'rwrite', 'sight', 'band', 'key', 'int', 'chord', 'drill'].forEach(function (k) { SET[k] = extend(DEFAULTS[k], (saved.set || {})[k] || {}); });
	function save() { keep(STORE, { set: SET, guide: G.id }); }
	// Sight read and With the band keep their own settings (level, tempo, who plays, TAB, the microphone)
	function SS() { return S && S.q && S.q.drill === 'band' ? SET.band : (currentDrill() === 'band' ? SET.band : SET.sight); }

	var REC = { log: [], share: false, pending: [] };
	if (MEMBER && CFG.record) { REC.log = CFG.record.log || []; REC.share = !!CFG.record.share; REC.pending = load(LOGSTORE + '.pending', []); }
	else { REC.log = load(LOGSTORE, []); }
	REC.pending.forEach(function (e) { if (!REC.log.some(function (x) { return x.t === e.t; })) { REC.log.push(e); } });

	var sendTimer = 0;
	function remember(line) {
		REC.log.push(line);
		if (REC.log.length > 4000) { REC.log = REC.log.slice(-4000); }
		sitting(line);
		if (!MEMBER) { keep(LOGSTORE, REC.log); return; }
		REC.pending.push(line);
		keep(LOGSTORE + '.pending', REC.pending);
		window.clearTimeout(sendTimer);
		sendTimer = window.setTimeout(send, 1500);
	}
	function post(body) {
		return window.fetch(CFG.rest, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': CFG.nonce || '' }, body: JSON.stringify(body) })
			.then(function (r) { if (!r.ok) { throw new Error('http ' + r.status); } return r.json(); });
	}
	function send() {
		if (!MEMBER || !CFG.rest || !REC.pending.length) { return; }
		var batch = REC.pending.slice(0, 300);
		post({ add: batch }).then(function () {
			REC.pending = REC.pending.filter(function (e) { return batch.indexOf(e) < 0; });
			keep(LOGSTORE + '.pending', REC.pending);
			if (REC.pending.length) { send(); }
		}).catch(function () { /* kept, and sent with the next answer or when back online */ });
	}
	window.addEventListener('online', send);

	// A sitting: time spent answering, for the practice diary. Gaps of more than two minutes don't count.
	var SIT = { ms: 0, last: 0, count: 0, diary: '' };
	function sitting(line) {
		var t = line.t;
		if (SIT.last && t - SIT.last < 120000) { SIT.ms += t - SIT.last; }
		SIT.last = t; SIT.count++;
	}

	/* ---------- sound ---------- */

	var Sound = {
		ok: function () { return !!(HE && HE.audio && HE.audio.supported && HE.synth); },
		ctx: function () { try { return HE.audio.unlock(); } catch (e) { return null; } },
		// one written note (or several at once), on the bass or another instrument
		note: function (written, o) {
			o = o || {};
			if (!Sound.ok()) { return; }
			var c = Sound.ctx(); if (!c) { return; }
			var list = Array.isArray(written) ? written : [written];
			var midis = list.map(function (p) { return M.midi(p) - (o.inst && o.inst !== 'ebass' && o.inst !== 'ubass' ? 0 : 12); });
			var inst = o.inst || SET.voice;
			HE.audio.level('bass', 0.9); HE.audio.level('keys', 0.8);
			HE.synth.note(inst, midis.length === 1 ? midis[0] : midis, c, { len: o.len || 1.2, vel: 0.85 }).then(function (part) {
				HE.audio.shot(part, inst === SET.voice ? 'bass' : 'keys');
			}).catch(function () { /* no sound this time */ });
		},
		playing: null,
		stop: function () {
			if (Sound.playing) { window.clearTimeout(Sound.playing.timer); window.cancelAnimationFrame(Sound.playing.raf); if (Sound.playing.onstop) { Sound.playing.onstop(); } }
			Sound.playing = null;
			try { if (HE && HE.audio) { HE.audio.stop(); } } catch (e) { /* nothing playing */ }
		}
	};

	/* What a piece of written music does in time, in quarter-note beats: every note and rest
	   in the order it is played (repeats and roadmaps followed), and where the beats fall. */
	function timeline(notes, time) {
		var bars = M.parseNotes(notes), first = [], i = 0;
		bars.forEach(function (b) { first.push(i); i += b.items.length; });
		var order = time ? RD.playOrder(bars) : bars.map(function (b, k) { return k; });
		var per = time ? M.barBeats(time) : null, t = 0, events = [], barStarts = [], nBars = 0;
		order.forEach(function (b) {
			barStarts.push(t);
			bars[b].items.forEach(function (it, k) {
				events.push({ i: first[b] + k, at: t + it.t, beats: it.beats, rest: !!it.rest, slash: !!it.slash, pitches: it.pitches || [], tie: !!it.tie, sym: it.sym || null, ghost: !!it.ghost });
			});
			// (a bar's own items carry t once parsed by the stave; parseNotes doesn't set it, so count here)
			var tt = 0; bars[b].items.forEach(function (it, k) { events[events.length - bars[b].items.length + k].at = t + tt; tt += it.beats; });
			// a multi-bar rest stands for several bars of time
			var span = bars[b].multi || 1;
			t += per ? per * span : tt; nBars += span;
		});
		var lastBar = order.length ? (per || 0) : 0;
		return { events: events, total: t, bars: nBars, per: per || (t / Math.max(1, nBars)), unit: time ? M.beatUnit(time) : 1, barStarts: barStarts, lastBar: lastBar };
	}

	/* A click, drawn into a buffer: a count-in bar and then the beat, accented at the bar.
	   (The house band's sticks count four, and Read needs threes and sixes too.) */
	function clickBuffer(c, tl, beatSec, countBars, clickOn) {
		var rate = c.sampleRate, barSec = tl.per * beatSec, total = (countBars + tl.bars) * barSec;
		var buf = c.createBuffer(1, Math.max(1, Math.ceil(total * rate)), rate), d = buf.getChannelData(0);
		function blip(t, accent, soft) {
			var f = accent ? 1900 : 1450, start = Math.floor(t * rate), n = Math.floor(0.05 * rate), amp = (soft ? 0.2 : accent ? 0.62 : 0.42);
			for (var k = 0; k < n && start + k < d.length; k++) { var x = k / rate; d[start + k] += amp * Math.exp(-x * 90) * Math.sin(2 * Math.PI * f * x); }
		}
		var unit = tl.unit, b, u;
		for (b = 0; b < countBars + tl.bars; b++) {
			if (b >= countBars && !clickOn) { continue; }
			for (u = 0; u < tl.per - 1e-6; u += unit) { blip(b * barSec + u * beatSec, u === 0, false); }
			// in six eight the quavers inside each beat tick softly too
			if (unit === 1.5) { for (u = 0.5; u < tl.per; u += 0.5) { if (Math.abs(u % 1.5) > 1e-6) { blip(b * barSec + u * beatSec, false, true); } } }
		}
		return { name: 'click', buffer: buf, lead: 0, length: total, gain: 1 };
	}

	/* The band under a bass part: the chords from the symbols over the notes, in the order played.
	   Before the first symbol (a bar or two of rest to start) the band plays the first chord. */
	function chordTrack(tl) {
		var segs = [];
		tl.events.forEach(function (ev) { if (ev.sym) { var c = M.parseSymbol(ev.sym); if (c) { segs.push({ at: ev.at, chord: c }); } } });
		if (segs.length) { segs[0].at = 0; }
		return function (q) { var hit = null; for (var k = 0; k < segs.length; k++) { if (segs[k].at <= q + 1e-6) { hit = segs[k].chord; } else { break; } } return hit; };
	}
	// How the keys play in each style: hits as [beat, length] in quarter notes, for one bar.
	var COMP = {
		held: [[0, 3.9]],
		eighths: [[0, 0.9], [1, 0.9], [2, 0.9], [3, 0.9]],
		two: [[0, 1.4], [1.5, 0.4], [2, 1.4], [3.5, 0.4]],
		swing: [[1, 0.6], [2.67, 0.3], [3, 0.6]],
		skank: [[1, 0.25], [3, 0.25]],
		stabs: [[0.5, 0.2], [1.75, 0.2], [2.5, 0.2], [3.75, 0.2]],
		six: [[0, 1.4], [1.5, 1.4]]
	};
	var lastVoicing = null;
	// The chord on the keys in a close voicing near middle C, moving as little as it can from the last one.
	function voicing(ch) {
		var tones = M.chord(ch.root + '3', ch.qual).map(M.midi), best = null;
		for (var inv = 0; inv < tones.length; inv++) {
			for (var shift = -12; shift <= 12; shift += 12) {
				var v = tones.slice(inv).concat(tones.slice(0, inv).map(function (m) { return m + 12; })).map(function (m) { return m + shift; });
				var lo = v[0], hi = v[v.length - 1];
				if (lo < 52 || hi > 74) { continue; }
				var cost = lastVoicing ? v.reduce(function (a, m, i) { return a + Math.abs(m - (lastVoicing[i] || lastVoicing[lastVoicing.length - 1])); }, 0) : Math.abs((lo + hi) / 2 - 62);
				if (!best || cost < best.cost) { best = { v: v, cost: cost }; }
			}
		}
		lastVoicing = best ? best.v : tones;
		return lastVoicing;
	}
	function compStrikes(tl, comp, countBars, specBeat) {
		var at = chordTrack(tl), out = [], pat = COMP[comp] || COMP.held;
		if (tl.per === 3 && comp !== 'held') { pat = COMP.six; }
		lastVoicing = null;
		for (var b = 0; b < tl.bars; b++) {
			var last = b === tl.bars - 1, hits = last ? [[0, tl.per - 0.1]] : pat;
			hits.forEach(function (h) {
				if (h[0] >= tl.per) { return; }
				var q = b * tl.per + h[0], ch = at(q);
				if (!ch) { return; }
				out.push({ beat: specBeat(q) + countBars * 4, len: specBeat(Math.min(h[1], tl.per - h[0])), notes: voicing(ch), vel: last || comp === 'held' ? 0.62 : 0.7 });
			});
		}
		return out;
	}
	// The drummer: the house band's loop for the style, laid end to end for the piece after the count,
	// with only the first beat of the loop on the last bar (the band stops together on one).
	function drumPart(cc, feel, tl, barSec, countBars) {
		var kits = HE.synth.kitsFor(feel), kit = kits.filter(function (id) { return HE.synth.usable(id); })[0] || (feel === 'Swing' || feel === 'Bossa' ? '808' : '909');
		var round = { bpm: 240 / barSec, feel: feel, drum: { source: 'synth', kit: kit, groove: 0 } };
		return Promise.resolve(HE.synth.drums(round, cc)).then(function (p) {
			if (!p || !p.buffer) { return null; }
			var rate = cc.sampleRate, src = p.buffer, lead = Math.round((p.lead || 0) * rate);
			var loop = Math.round((p.length || (src.duration - (p.lead || 0))) * rate), bar = Math.round(barSec * rate);
			var total = Math.ceil((countBars + tl.bars) * barSec * rate) + Math.round(rate);
			var out = cc.createBuffer(src.numberOfChannels, total, rate);
			for (var ch = 0; ch < src.numberOfChannels; ch++) {
				var from = src.getChannelData(ch), to = out.getChannelData(ch);
				for (var b = 0; b < tl.bars; b++) {
					var at = (countBars + b) * bar, off = (b * bar) % loop, n = b === tl.bars - 1 ? Math.round(bar / 4) : bar, fade = b === tl.bars - 1 ? Math.round(0.4 * rate) : 0;
					if (b === tl.bars - 1) { off = 0; }
					for (var k = 0; k < n + fade && lead + off + k < from.length && at + k < total; k++) {
						var g = k < n ? 1 : 1 - (k - n) / fade;
						to[at + k] += from[lead + ((off + k) % loop)] * g;
					}
				}
			}
			return { name: 'drums', buffer: out, lead: 0, length: (countBars + tl.bars) * barSec, gain: p.gain };
		}).catch(function () { return null; });
	}
	// Fetch the style's kit while the player is looking at the music, so the drummer is there in time.
	var kitsAsked = {};
	function wantKit(feel) {
		try {
			if (!feel || !HE.sounds || HE.sounds.lean()) { return; }
			var kit = HE.synth.kitsFor(feel)[0], c = Sound.ctx();
			if (!kit || kitsAsked[kit] || HE.synth.usable(kit) || !c) { return; }
			kitsAsked[kit] = true;
			HE.synth.kit(kit).packs.forEach(function (p) { HE.sounds.load(p, c).catch(function () { kitsAsked[kit] = false; }); });
		} catch (e) { /* the drawn kit plays instead */ }
	}

	/* Play written music: a bar of clicks first, then the music, with the click going on if wanted
	   and the bass playing the notes if wanted. o: {bpm (quarter notes; a dotted crotchet in six eight),
	   time, click, bass, loop, onNote(i), onEnd()}. Gives a promise of {startsAt, beatSec} (audio clock). */
	function playMusic(notes, o) {
		if (!Sound.ok()) { return Promise.reject(new Error('no-sound')); }
		Sound.stop();
		var c = Sound.ctx(); if (!c) { return Promise.reject(new Error('no-sound')); }
		var time = o.time === undefined ? '4/4' : o.time;
		var tl = timeline(notes, time);
		if (o.swing && tl.unit === 1) {
			// swung quavers: each beat's second half starts a third of a beat late, as a triplet's last note
			var sw = function (q) { var f = q - Math.floor(q); return Math.abs(f - 0.5) < 1e-6 ? Math.floor(q) + 2 / 3 : q; };
			tl.events.forEach(function (ev) { var a = sw(ev.at), e = sw(ev.at + ev.beats); ev.at = a; ev.beats = e - a; });
		}
		var qbpm = (o.bpm || 80) * (time && M.beatUnit(time) === 1.5 ? 1.5 : 1);
		var beatSec = 60 / qbpm, barSec = tl.per * beatSec, countBars = o.countIn === false ? 0 : 1;
		var roundBpm = 240 / barSec, specBeat = function (q) { return q * 4 / tl.per; };
		var strikes = [];
		if (o.bass !== false) {
			tl.events.forEach(function (ev, k) {
				if (ev.rest || ev.slash || !ev.pitches.length) { return; }
				var prev = tl.events[k - 1];
				if (prev && prev.tie && !prev.rest) { return; }
				var len = ev.beats, j = k;
				while (tl.events[j] && tl.events[j].tie && tl.events[j + 1]) { j++; len += tl.events[j].beats; }
				// a ghost note is a thud: short and quiet
				strikes.push({ beat: specBeat(ev.at) + countBars * 4, len: ev.ghost ? specBeat(Math.min(len, 0.12)) : specBeat(len) * 0.94, notes: ev.pitches.map(function (p) { return M.midi(p) - 12; }), vel: ev.ghost ? 0.35 : 0.8 });
			});
		}
		var round = { tag: 'read', bpm: roundBpm, bars: countBars + tl.bars };
		var spec = { bpm: roundBpm, bars: countBars + tl.bars, parts: [{ inst: SET.voice, strikes: strikes }] };
		// the band: keys on the chord symbols and, in four four, the drummer in the style's feel
		var band = !!o.band, drums = band && o.feel && tl.per === 4;
		var keys = band ? compStrikes(tl, o.comp || 'held', countBars, specBeat) : [];
		var upper = [];
		if (o.upper) {
			// a piano score's staves, on the piano at the pitch written (a piano doesn't sound an octave down as the bass does)
			[].concat(o.upper).forEach(function (src) { if (!src) { return; } timeline(src, time).events.forEach(function (ev, k, all) {
				if (ev.rest || !ev.pitches.length || (all[k - 1] && all[k - 1].tie)) { return; }
				upper.push({ beat: specBeat(ev.at) + countBars * 4, len: specBeat(ev.beats) * 0.94, notes: ev.pitches.map(M.midi), vel: 0.7 });
			}); });
		}
		var keysSpec = { bpm: roundBpm, bars: countBars + tl.bars, parts: [{ inst: o.keys || 'rhodes', strikes: keys.concat(upper) }] };
		var source = {
			more: function (r, cc) {
				// with a drummer, the click is the count only
				var jobs = [Promise.resolve(clickBuffer(cc, tl, beatSec, countBars, o.click !== false && !drums))];
				if (strikes.length) { jobs.push(HE.synth.score(spec, cc).then(function (p) { return { name: 'bass', buffer: p.buffer, lead: 0, length: p.length, gain: p.gain }; })); }
				if (keys.length || upper.length) { jobs.push(HE.synth.score(keysSpec, cc).then(function (p) { return { name: 'chords', buffer: p.buffer, lead: 0, length: p.length, gain: p.gain }; }, function () { return null; })); }
				if (drums) { jobs.push(drumPart(cc, o.feel, tl, barSec, countBars)); }
				return Promise.all(jobs).then(function (got) { return got.filter(Boolean); });
			}
		};
		HE.audio.level('click', o.click === false ? 0.5 : 0.75); HE.audio.level('bass', 0.85); HE.audio.level('chords', 0.6); HE.audio.level('drums', 0.7);
		return HE.audio.play(round, source, {}).then(function (res) {
			if (!res) { return null; }
			var start = res.startsAt + countBars * barSec;
			var me = { start: start, beatSec: beatSec, tl: tl, onstop: o.onStop };
			Sound.playing = me;
			var lit = -1;
			(function follow() {
				if (Sound.playing !== me) { return; }
				var t = (HE.audio.now ? HE.audio.now() : c.currentTime) - start, q = t / beatSec;
				if (o.loop) { q = ((q % tl.total) + tl.total) % tl.total; if (t < 0) { q = -1; } }
				var cur = -1;
				for (var k = 0; k < tl.events.length; k++) { var ev = tl.events[k]; if (q >= ev.at - 1e-3 && q < ev.at + ev.beats) { cur = k; break; } }
				if (cur !== lit) { lit = cur; if (o.onNote) { o.onNote(cur >= 0 ? tl.events[cur] : null, t); } }
				if (!o.loop && t > tl.total * beatSec + 0.15) { Sound.stop(); if (o.onEnd) { o.onEnd(); } return; }
				me.raf = window.requestAnimationFrame(follow);
			})();
			return { startsAt: start, beatSec: beatSec, tl: tl, ctx: c, perf0: now(), audio0: c.currentTime };
		});
	}

	/* ---------- where we are ---------- */

	var G = { id: saved.guide || '', figs: [] };
	var S = { view: 'dojo', strand: SET.strand, q: null, phase: 'idle', t0: 0, tries: 0, plan: null, said: null, busy: false };

	function go(hash, replace) {
		if (('#' + hash) === window.location.hash) { route(); return; }
		if (replace && window.history.replaceState) { window.history.replaceState(null, '', '#' + hash); route(); } else { window.location.hash = hash; }
	}
	function route() {
		var h = (window.location.hash || '').replace(/^#/, '');
		var parts = h.split('/');
		if (parts[0] === 'guide') { show('guide'); openGuide(parts[1] || ''); }
		else {
			show('dojo');
			if (parts[1]) {
				var hit = RD.STRANDS.filter(function (s) { return s.id === parts[1] || (s.drills || []).indexOf(parts[1]) >= 0; })[0];
				if (hit) { if (hit.drills && hit.drills.indexOf(parts[1]) >= 0) { SET.drill[hit.id] = parts[1]; } setStrand(hit.id, true); }
			} else if (!S.q && S.strand !== 'map' && S.strand !== 'today') { setStrand(S.strand, true); }
		}
	}
	function show(view) {
		S.view = view;
		$('view-guide').hidden = view !== 'guide';
		$('view-dojo').hidden = view !== 'dojo';
		[].forEach.call(app.querySelectorAll('[data-view]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-view') === view ? 'true' : 'false'); });
		if (view === 'guide') { Sound.stop(); }
	}
	app.querySelector('#rd-tabs').addEventListener('click', function (e) {
		var b = e.target.closest('[data-view]'); if (!b) { return; }
		go(b.getAttribute('data-view') === 'guide' ? 'guide' + (G.id ? '/' + G.id : '') : 'dojo/' + S.strand);
	});
	window.addEventListener('hashchange', route);

	/* ---------- the Guide ---------- */

	function pages() { var out = []; GUIDE.parts.forEach(function (p) { p.pages.forEach(function (pg) { out.push({ part: p, page: pg }); }); }); return out; }
	function findPage(id) { var all = pages(); for (var k = 0; k < all.length; k++) { if (all[k].page.id === id) { return all[k]; } } return null; }

	function renderIndex() {
		var html = '<p class="he-kicker">' + esc(GUIDE.subtitle) + '</p>';
		GUIDE.parts.forEach(function (p) {
			html += '<p class="he-kicker">' + esc(p.title) + '</p><div class="he-g-list">' + p.pages.map(function (pg) {
				return '<button type="button" class="he-g-link" data-go="' + esc(pg.id) + '"' + (G.id === pg.id ? ' aria-current="page"' : '') + '>' + esc(pg.title) + '</button>';
			}).join('') + '</div>';
		});
		$('g-index').innerHTML = html;
	}
	function openGuide(id) {
		var found = id ? findPage(id) : null;
		if (!found) { id = ''; found = pages()[0]; }
		Sound.stop();
		G.id = id;
		save();
		$('guide').setAttribute('data-pane', id ? 'page' : 'index');
		renderIndex();
		// (pages() makes fresh objects each time, so the page is found by its id, not by identity)
		var all = pages(), at = all.map(function (x) { return x.page.id; }).indexOf(found.page.id);
		var link = function (x, word) { return x ? '<button type="button" class="he-g-link" data-go="' + esc(x.page.id) + '"><span class="he-kicker">' + word + '</span>' + esc(x.page.title) + '</button>' : '<span></span>'; };
		$('g-page').innerHTML = '<p class="he-g-back"><button type="button" class="he-tog is-link" data-go="">&larr; Contents</button></p>' +
			'<p class="he-kicker">' + esc(found.part.title) + '</p><h2 class="he-g-title"><span class="he-g-name is-big">' + esc(found.page.title) + '</span></h2>' +
			'<div class="he-g-text rd-g-text">' + found.page.html + '</div>' +
			'<nav class="he-g-pager" aria-label="More of the guide">' + link(all[at - 1], 'Before this') + link(all[at + 1], 'After this') + '</nav>';
		drawFigures();
		if (id) { $('g-page').scrollIntoView({ block: 'start', behavior: 'auto' }); }
	}

	// The width a figure has, so notation is never squeezed or blown up.
	function boxWidth(el) { var w = el.getBoundingClientRect().width || el.parentNode.getBoundingClientRect().width || 640; return Math.max(260, Math.min(760, Math.floor(w))); }
	function narrow() { return window.innerWidth < 560; }

	function staveFigure(spec, width, mark) {
		var sp = extend(spec, { width: width, maxBars: narrow() ? 2 : spec.maxBars, strings: spec.strings || SET.strings, mark: mark || null, fit: true });
		return ST.render(sp);
	}
	function drawFigures() {
		[].forEach.call($('g-page').querySelectorAll('figure.rd-fig'), function (f) {
			var n = +f.getAttribute('data-fig'), fig = GUIDE.figs[n]; if (!fig) { return; }
			var w = boxWidth(f), html = '', cap = fig.caption ? '<figcaption class="he-small">' + fig.caption + '</figcaption>' : '';
			if (fig.type === 'stave') {
				var r = staveFigure(fig.spec, w);
				var playable = /[A-G]/.test(typeof fig.spec.notes === 'string' ? fig.spec.notes : JSON.stringify(fig.spec.notes));
				html = '<div class="rd-score">' + r.svg + '</div>' + (playable && Sound.ok() ? '<p class="rd-fig-play"><button type="button" class="he-btn is-quiet" data-play="' + n + '" aria-pressed="false"><i aria-hidden="true"></i>Play</button><label class="he-switch rd-mini"><input type="checkbox" data-loop="' + n + '"><span>Go round</span></label></p>' : '') + cap;
			} else if (fig.type === 'neck' && BASS) {
				html = '<div class="rd-neck">' + neckFor(fig.spec, w) + '</div>' + cap;
			} else if (fig.type === 'keys') {
				html = FG.keys(extend(fig.spec, { width: Math.min(w, 640) })) + cap;
			} else if (fig.type === 'circle') {
				html = '<div class="rd-circle-box">' + FG.circle(extend(fig.spec, { size: Math.min(w, 420) })) + '</div>' + cap;
			}
			f.innerHTML = html;
		});
	}
	function stringIndex(name, strings) { var tun = M.strings(strings); for (var k = 0; k < tun.length; k++) { if (M.parse(tun[k]).L === name) { return k; } } return -1; }
	function neckFor(spec, w) {
		var strings = spec.strings || SET.strings;
		var marks = (spec.marks || []).map(function (m) {
			var s = stringIndex(m.s, strings); if (s < 0) { return null; }
			var f = M.midi(m.p) - M.midi(M.strings(strings)[s]);
			return { string: s, fret: f, label: m.label || M.letterName(m.p), kind: m.kind || 'solid' };
		}).filter(Boolean);
		return BASS.fretboard({ strings: strings, from: spec.from || 0, to: spec.to == null ? 12 : spec.to, marks: marks, tap: true, width: w });
	}

	var guidePlaying = null;
	$('view-guide').addEventListener('click', function (e) {
		var b = e.target.closest('[data-go], [data-play], [data-dojo], [data-fb]');
		if (!b) { return; }
		if (b.hasAttribute('data-go')) { var id = b.getAttribute('data-go'); go('guide' + (id ? '/' + id : '')); return; }
		if (b.hasAttribute('data-dojo')) { var o = {}; try { o = JSON.parse(b.getAttribute('data-dojo')); } catch (x) { /* a plain button */ } openDojoFrom(o); return; }
		if (b.hasAttribute('data-fb')) { var sf = b.getAttribute('data-fb').split(','); Sound.note(M.atFret(+sf[0], +sf[1], { strings: SET.strings })); return; }
		if (b.hasAttribute('data-play')) {
			var n = +b.getAttribute('data-play'), fig = GUIDE.figs[n], fEl = b.closest('figure');
			if (guidePlaying === n) { Sound.stop(); return; }
			var loop = !!fEl.querySelector('[data-loop]') && fEl.querySelector('[data-loop]').checked;
			var w = boxWidth(fEl), time = fig.spec.time === undefined ? '4/4' : fig.spec.time;
			b.setAttribute('aria-pressed', 'true'); guidePlaying = n;
			var light = function (ev) { fEl.querySelector('.rd-score').innerHTML = staveFigure(fig.spec, w, ev ? (function () { var m = {}; m[ev.i] = 'cur'; return m; })() : null).svg; };
			if (fig.spec.clef === 'grand') {
				// the piano score is played on the piano, both staves; the count follows whichever staff has more in it
				var tr = fig.spec.notes.treble || '', bs = fig.spec.notes.bass || '';
				var main = timeline(bs, time || '4/4').total >= timeline(tr, time || '4/4').total ? bs : tr;
				playMusic(main, { time: time || '4/4', bpm: fig.spec.bpm || 76, loop: loop, bass: false, upper: [tr, bs], keys: 'grand',
					onStop: function () { guidePlaying = null; b.setAttribute('aria-pressed', 'false'); } })
					.catch(function () { guidePlaying = null; b.setAttribute('aria-pressed', 'false'); });
				return;
			}
			playMusic(time ? fig.spec.notes : M.parseNotes(fig.spec.notes).map(function (bar) { return bar.items.map(function (it) { return (it.rest ? 'r' : it.pitches.join('+')) + '/q'; }).join(' '); }).join(' '), {
				time: time || '4/4', bpm: fig.spec.bpm || fig.spec.tempo || (time === '6/8' || time === '12/8' ? 52 : time === 'C|' ? 96 : 76), loop: loop, onNote: light,
				swing: !!fig.spec.swing, band: !!fig.spec.band, feel: fig.spec.feel || null, comp: fig.spec.comp || 'held',
				onStop: function () { guidePlaying = null; b.setAttribute('aria-pressed', 'false'); light(null); }
			}).catch(function () { guidePlaying = null; b.setAttribute('aria-pressed', 'false'); });
		}
	});
	var resizeTimer = 0, lastW = window.innerWidth;
	window.addEventListener('resize', function () {
		if (Math.abs(window.innerWidth - lastW) < 40) { return; }
		lastW = window.innerWidth;
		window.clearTimeout(resizeTimer);
		resizeTimer = window.setTimeout(function () { if (S.view === 'guide') { drawFigures(); } else { renderQuestion(); } }, 200);
	});

	function openDojoFrom(o) {
		var drill = o.drill || 'name', strand = RD.DRILLS[drill] ? RD.DRILLS[drill].strand : 'notes';
		if (o.set) { SET.notes.set = o.set; }
		if (o.accidentals) { SET.notes.accidentals = o.accidentals; } else if (o.set) { SET.notes.accidentals = 'none'; }
		if (o.key != null) { SET.notes.key = o.key; } else if (o.set) { SET.notes.key = 0; }
		if (o.level && drill === 'tap') { SET.tap.level = o.level; }
		if (o.level && drill === 'hear') { SET.hear.level = o.level; }
		if (o.level && drill === 'rwrite') { SET.rwrite.level = o.level; }
		if (o.level && drill === 'sight') { SET.sight.level = o.level; }
		if (o.level && drill === 'band') { SET.band.level = o.level; }
		if (o.set && drill === 'int') { SET.int.set = o.set; SET.notes.set = 'open'; }
		if (o.set && drill === 'chord') { SET.chord.set = o.set; SET.notes.set = 'open'; }
		SET.drill[strand] = drill;
		S.plan = null;
		S.q = null;
		save();
		go('dojo/' + drill);
	}

	/* ---------- the Dojo: strands and drills ---------- */

	function setStrand(id, quiet) {
		Sound.stop();
		micOff();
		S.strand = id; SET.strand = id; save();
		if (id === 'today' && !quiet) { startToday(); }
		else if (id === 'today' && !S.plan) { startToday(); }
		else if (id !== 'today' && S.plan && S.plan.kind === 'today') { S.plan = null; }
		renderStrands();
		if (id === 'map') { S.q = null; renderMap(); renderSide(); return; }
		newQuestion();
	}
	function currentDrill() {
		if (S.plan && S.plan.parts[S.plan.i]) { return S.plan.parts[S.plan.i].drill; }
		var st = RD.STRANDS.filter(function (s) { return s.id === S.strand; })[0];
		return st && st.drills ? SET.drill[st.id] || st.drills[0] : 'name';
	}
	function renderStrands() {
		$('strands').innerHTML = RD.STRANDS.map(function (s) {
			return '<button type="button" class="he-tab" data-strand="' + s.id + '" aria-pressed="' + (S.strand === s.id) + '"' + (s.short ? ' aria-label="' + esc(s.title) + '"><span class="rd-wide">' + esc(s.title) + '</span><span class="rd-narrow" aria-hidden="true">' + esc(s.short) + '</span>' : '>' + esc(s.title)) + '</button>';
		}).join('');
		var st = RD.STRANDS.filter(function (s) { return s.id === S.strand; })[0];
		var drills = st && st.drills && !S.plan ? st.drills : [];
		$('drills').hidden = drills.length < 2;
		$('drills').innerHTML = drills.map(function (d) { return '<button type="button" class="he-tog" data-drill="' + d + '" aria-pressed="' + (currentDrill() === d) + '">' + esc(RD.DRILLS[d].title) + '</button>'; }).join('');
		var d = currentDrill();
		$('drill-note').textContent = S.strand === 'map' ? 'Every note on your neck, and how well each link is made.' : RD.DRILLS[d] ? RD.DRILLS[d].what : '';
		if (S.plan) { renderPlan(); }
	}
	$('strands').addEventListener('click', function (e) { var b = e.target.closest('[data-strand]'); if (b) { if (b.getAttribute('data-strand') === 'today') { S.plan = null; } go('dojo/' + b.getAttribute('data-strand')); } });
	$('drills').addEventListener('click', function (e) {
		var b = e.target.closest('[data-drill]'); if (!b) { return; }
		go('dojo/' + b.getAttribute('data-drill'));
	});

	/* ---------- one question ---------- */

	function optsFor(drill) {
		var part = S.plan ? S.plan.parts[S.plan.i] : null;
		var o = { strings: SET.strings, maxFret: SET.maxFret, set: SET.notes.set, accidentals: SET.notes.accidentals, key: +SET.notes.key || 0, every: SET.every, length: SET.playLen };
		if (drill === 'tap') { o = extend(o, { level: SET.tap.level, bars: SET.tap.bars, bpm: SET.tap.bpm || 0 }); }
		if (drill === 'hear') { o.level = SET.hear.level; }
		if (drill === 'rwrite') { o.level = SET.rwrite.level; o.avoid = S.q && S.q.drill === 'rwrite' ? S.q.notes : null; }
		if (drill === 'sight') { o = extend(o, { level: SET.sight.level }); }
		if (drill === 'band') { o = extend(o, { level: SET.band.level }); }
		if (drill === 'key') { o = extend(o, SET.key); }
		if (drill === 'int') { o = extend(o, SET.int); o.set = SET.int.set; }
		if (drill === 'chord') { o = extend(o, SET.chord); o.set = SET.chord.set; }
		if (part) {
			o = extend(o, part.opts || {});
			if (part.level) { o.level = part.level; }
			if (part.set) { o.set = part.set; }
			if (part.only) { o.only = part.seq ? part.left.slice(0, 1) : part.only; }
		}
		return o;
	}

	function newQuestion() {
		Sound.stop();
		micReset();
		var drill = currentDrill();
		var last = S.q && S.q.drill === drill ? S.q.item : null;
		S.q = RD.question(drill, optsFor(drill), REC.log, last, Math.random);
		S.phase = 'ask'; S.tries = 0; S.said = null; S.t0 = now(); S.found = []; S.placed = null; S.placedAcc = 0;
		S.lineAt = 0; S.lineMiss = false; S.taps = null; S.result = null; S.built = [];
		renderStrands();
		renderQuestion();
		renderSide();
		if (drill === 'write') { Sound.note(S.q.pitch); }
	}

	function kicker() {
		var d = currentDrill(), D = RD.DRILLS[d], bits = [];
		if (S.plan) {
			var p = S.plan.parts[S.plan.i];
			bits.push((S.plan.kind === 'today' ? 'Today' : 'Where am I?') + ' · part ' + (S.plan.i + 1) + ' of ' + S.plan.parts.length);
			bits.push((p.done || 0) + 1 + ' of ' + p.count);
		} else {
			bits.push(D.title);
			if (d === 'name' || d === 'find' || d === 'write' || d === 'play') { bits.push(RD.noteSet(SET.notes.set).name + (+SET.notes.key ? ' · ' + M.keyName(+SET.notes.key) : SET.notes.accidentals !== 'none' ? ' · with sharps and flats' : '')); }
			if (d === 'tap' || d === 'hear' || d === 'rwrite') { bits.push('Level ' + S.q.level + ': ' + RD.RHYTHM[S.q.level - 1].name); }
			if (d === 'sight') { bits.push('Level ' + S.q.level + ': ' + RD.SIGHT[S.q.level - 1].name); }
			if (d === 'band') { bits.push('Level ' + S.q.level + ': ' + RD.BASS[S.q.level - 1].name); }
		}
		return bits.join(' · ');
	}

	function renderQuestion() {
		if (S.strand === 'map') { renderMap(); return; }
		var q = S.q; if (!q) { return; }
		$('kicker').textContent = kicker();
		$('result').hidden = true; $('result').innerHTML = '';
		$('status').textContent = '';
		var d = q.drill;
		var w = boxWidth($('card'));
		var card = '', act = '', ask = '', commit = '';
		var showBtn = '<button type="button" class="he-btn is-quiet" data-act="show">Show me</button>';
		if (d === 'name' || d === 'find') {
			card = noteCard(q, null);
			if (d === 'name') {
				ask = head('What’s this note?', 'Tap its name, or type the letter (shift for ♯, alt for ♭).') + letterPad(q);
			} else {
				ask = head(q.box ? 'Find it in ' + q.boxName.toLowerCase() : q.every ? 'Find every place it lives' : 'Where is it on your neck?', q.box ? 'Frets ' + q.box[0] + ' to ' + q.box[1] + ', a finger a fret. Only a place inside the box counts.' : q.every ? 'Up to the ' + ordinal(SET.maxFret) + ' fret: ' + q.places.length + ' places.' : 'Tap it on the neck. Any place it lives is right.') +
					'<div class="rd-neck rd-neck-ask" id="rd-neck">' + neckAsk(q, w) + '</div>';
			}
			commit = showBtn;
		} else if (d === 'write') {
			card = '<div class="rd-neck">' + BASS.fretboard({ strings: SET.strings, from: 0, to: SET.maxFret, marks: [{ string: q.spot.s, fret: q.spot.f, kind: 'lit' }], width: w }) + '</div>' +
				'<p class="rd-under"><button type="button" class="he-btn is-quiet" data-act="hear">Hear it</button><span class="he-small">' + esc(q.spot.string) + ' string, ' + (q.spot.f ? ordinal(q.spot.f) + ' fret' : 'open') + '</span></p>';
			ask = head('Write it on the stave', 'Tap the line or space, choose ♭ ♮ or ♯ if it needs one, then Check.') +
				'<div class="rd-write" id="rd-write">' + writeStave(q, w) + '</div>' +
				'<div class="he-togs rd-accs" role="group" aria-label="Accidental">' + [[-1, '♭'], [0, '♮'], [1, '♯']].map(function (a) { return '<button type="button" class="he-tog" data-acc="' + a[0] + '" aria-pressed="' + (S.placedAcc === a[0]) + '">' + a[1] + '</button>'; }).join('') + '</div>';
			commit = '<button type="button" class="he-btn" data-act="check" ' + (S.placed == null ? 'disabled' : '') + '>Check</button>' + showBtn;
		} else if (d === 'play') {
			card = '<div class="rd-score" id="rd-score">' + lineSvg(q, w) + '</div>';
			ask = head('Play it on your bass', 'At your own pace: the next note lights up when you get one right. Eyes on the page.') +
				'<div class="he-togs" role="group" aria-label="How to answer">' + [['tap', 'Tap the neck'], ['mic', 'Play it (microphone)']].map(function (v) { return '<button type="button" class="he-tog" data-via="' + v[0] + '" aria-pressed="' + (SET.playVia === v[0]) + '">' + v[1] + '</button>'; }).join('') + '</div>' +
				(SET.playVia === 'mic' ? micPanel() : '<div class="rd-neck rd-neck-ask" id="rd-neck">' + BASS.fretboard({ strings: SET.strings, from: 0, to: SET.maxFret, marks: [], tap: true, width: w }) + '</div>');
			commit = '<button type="button" class="he-btn is-quiet" data-act="new">New line</button>';
		} else if (d === 'tap') {
			card = '<div class="rd-score" id="rd-score">' + ST.render({ notes: q.notes, time: q.time, width: w, fit: true, counts: SET.tap.counts, maxBars: narrow() ? 1 : 2 }).svg + '</div>';
			act = '<button type="button" class="he-go rd-tap" id="rd-tap" aria-pressed="false" aria-label="Start, then tap here"><i aria-hidden="true"></i><span>Start</span></button>';
			ask = head('Tap it in time', 'Press Start, listen to the bar of clicks, then tap the rhythm on the pad (or the space bar). Tap where each note starts; rests and tied notes are silent.') + tempoRow('tap', q);
			commit = '<button type="button" class="he-btn is-quiet" data-act="listen">Hear it played</button><button type="button" class="he-btn is-quiet" data-act="new">New rhythm</button>';
		} else if (d === 'rwrite') {
			card = '<div class="rd-score" id="rd-score">' + rwriteSvg(q, w, null) + '</div>';
			act = '<button type="button" class="he-go" data-act="playq" aria-pressed="false"><i aria-hidden="true"></i><span>Play it</span></button>';
			ask = head('Write the bar you hear', 'Play it, then build it from the pieces below, a beat at a time. Play it as often as you like.') +
				'<div class="rd-cells" id="rd-cells">' + cellPalette(q) + '</div>';
			commit = '<button type="button" class="he-btn is-quiet" data-act="undo">Undo</button><button type="button" class="he-btn is-quiet" data-act="clearbar">Clear</button><button type="button" class="he-btn" data-act="check" disabled>Check</button>' + showBtn;
		} else if (d === 'hear') {
			card = '<p class="rd-big">Which bar did you hear?</p>';
			act = '<button type="button" class="he-go" data-act="playq" aria-pressed="false"><i aria-hidden="true"></i><span>Play it</span></button>';
			ask = head('Choose the bar you heard', 'It is played on one note, after a bar of clicks. Play it as often as you like.') +
				'<div class="rd-choices">' + q.options.map(function (o, k) {
					return '<button type="button" class="rd-choice" data-choice="' + k + '"><span class="he-kicker">' + 'ABC'.charAt(k) + '</span>' + ST.render({ notes: o, time: q.time, width: Math.min(w, 420), plain: true, scale: 0.8, final: false }).svg + '</button>';
				}).join('') + '</div>';
			commit = showBtn;
		} else if (d === 'sight' || d === 'band') {
			var band = d === 'band', look = SS().look;
			card = '<div class="rd-score" id="rd-score">' + sightSvg(q, w, null) + '</div>';
			act = '<button type="button" class="he-go" data-act="sight" aria-pressed="false"><i aria-hidden="true"></i><span>Look, then play</span></button>';
			ask = (band ? head(q.keyName + ' · ' + q.styleName + ' · ' + timeName(q.time), look + ' seconds to look, a bar of clicks, then play the bass part with the band. Don’t stop: the band won’t.') +
					'<ol class="rd-scan" id="rd-scan"><li>The key, and the style</li><li>The time signature</li><li>The roadmap: sections, repeats, bars of rest to count</li><li>The chords, and where your hand goes</li><li>Any rhythm to say first</li></ol>'
				: head(q.keyName + ' · ' + timeName(q.time), look + ' seconds to look, a bar of clicks, then play it through without stopping.') +
					'<ol class="rd-scan" id="rd-scan"><li>The key</li><li>The time signature</li><li>The roadmap</li><li>The range, and where your hand goes</li><li>Any rhythm to say first</li></ol>') +
				tempoRow(d, q) + sightOptions(band);
			commit = '<button type="button" class="he-btn is-quiet" data-act="listen">Hear it played</button><button type="button" class="he-btn is-quiet" data-act="new">New piece</button>';
		} else if (d === 'key') {
			if (q.reverse) {
				card = '<p class="rd-big">' + esc(M.prettyName(q.answer)) + ' ' + q.mode + '</p>';
				ask = head('Which key signature?', '') + keySigPad();
			} else {
				card = '<div class="rd-score">' + ST.render({ notes: '', key: q.key, clef: q.clef, time: null, width: Math.min(w, 360), scale: 1.2, final: false }).svg + '</div>';
				ask = head('Which ' + q.mode + ' key is this?', q.mode === 'minor' ? 'The relative minor: three semitones below the major.' : 'Sharps: a semitone above the last sharp. Flats: the second last flat.') + keyNamePad(q);
			}
			commit = showBtn;
		} else if (d === 'int') {
			card = '<div class="rd-score">' + ST.render({ notes: q.notes, time: null, width: Math.min(w, 400), scale: 1.15, final: false }).svg + '</div>' +
				'<p class="rd-under"><button type="button" class="he-btn is-quiet" data-act="hear">Hear it</button></p>';
			ask = head(q.numbersOnly ? 'What number is the interval?' : 'Name the interval', q.numbersOnly ? 'Count the letters, both ends included.' : 'The number from the letters, then the quality from the frets.') + intervalPad(q);
			commit = showBtn;
		} else if (d === 'chord') {
			card = '<div class="rd-score">' + ST.render({ notes: q.notes, time: q.time, width: Math.min(w, q.broken ? 520 : 320), scale: 1.15, final: false }).svg + '</div>' +
				'<p class="rd-under"><button type="button" class="he-btn is-quiet" data-act="hear">Hear it</button></p>';
			ask = head('Name the chord', 'The root (the note it is built on), then what kind.') + chordPad(q);
			commit = '<button type="button" class="he-btn" data-act="check" disabled>Check</button>' + showBtn;
		}
		$('card').innerHTML = card;
		$('act').innerHTML = act;
		$('ask').innerHTML = ask;
		$('commit').innerHTML = commit;
		if (d === 'play') { lightLine(); }
	}

	function head(h, small) { return '<div class="he-ask-head"><h2 class="he-h">' + esc(h) + '</h2>' + (small ? '<p class="he-small">' + esc(small) + '</p>' : '') + '</div>'; }
	function ordinal(n) { var s = ['th', 'st', 'nd', 'rd']; var v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
	function timeName(t) { return t === '6/8' ? 'six eight' : t === '3/4' ? 'three four' : 'four four'; }

	function noteCard(q, mark) {
		var spec = q.grand ? { clef: 'grand', notes: { treble: q.clef === 'treble' ? q.pitch + '/w' : '', bass: q.clef === 'bass' ? q.pitch + '/w' : '' }, time: null, key: q.key, width: 300, scale: 1.1, final: false, mark: mark }
			: { notes: q.pitch + '/w', clef: q.clef, key: q.key, time: null, width: 300, scale: 1.3, final: false, mark: mark, names: !!(mark && mark[0]) };
		return '<div class="rd-score rd-one">' + ST.render(spec).svg + '</div>';
	}
	function letterPad(q) {
		var accs = SET.notes.accidentals !== 'none' || +SET.notes.key ? [1, 0, -1] : [0];
		if (S.plan) { accs = [1, 0, -1]; }
		var rows = accs.map(function (a) {
			return '<div class="rd-pad-row">' + 'ABCDEFG'.split('').map(function (L) {
				var odd = (a === 1 && (L === 'E' || L === 'B')) || (a === -1 && (L === 'F' || L === 'C'));
				if (odd && SET.notes.accidentals !== 'all' && !(+SET.notes.key)) { return '<span class="rd-pad-gap"></span>'; }
				return '<button type="button" class="he-tog rd-pad" data-name="' + L + ',' + a + '">' + L + (a === 1 ? '♯' : a === -1 ? '♭' : '') + '</button>';
			}).join('') + '</div>';
		}).join('');
		return '<div class="rd-pads" role="group" aria-label="Note names">' + rows + '</div>';
	}
	function neckAsk(q, w) {
		var marks = (S.found || []).map(function (f) { return { string: f.s, fret: f.f, kind: f.ok ? 'solid' : 'wrong', label: f.ok ? M.letterName(q.pitch) : '' }; });
		// in a position the neck shows the box and a fret either side of it
		var box = q.box;
		return BASS.fretboard({ strings: SET.strings, from: box ? Math.max(0, box[0] - 1) : 0, to: box ? box[1] + 1 : SET.maxFret, marks: marks, tap: true, width: w });
	}
	function writeRange() { var p = RD.pool({ set: SET.notes.set, neck: true, strings: SET.strings, maxFret: SET.maxFret }); var lo = 'E2', hi = 'A3'; p.forEach(function (x) { if (M.midi(x) < M.midi(lo)) { lo = x; } if (M.midi(x) > M.midi(hi)) { hi = x; } }); return { lo: M.midi(lo) < M.midi('E2') ? lo : 'E2', hi: hi }; }
	function writeStave(q, w, reveal) {
		var notes = '', mark = {};
		if (S.placed != null) {
			var p = M.fromStep(S.placed, S.placedAcc);
			notes = p + '/w';
			mark[0] = reveal ? (reveal.ok ? 'ok' : 'no') : 'hint';
			if (reveal && !reveal.ok) { notes += ' ' + q.pitch + '/w'; mark[1] = 'ok'; }
		} else if (reveal) { notes = q.pitch + '/w'; mark[0] = 'ok'; }
		var r = ST.render({ notes: notes, clef: 'bass', key: q.key, time: null, width: Math.min(w, 380), scale: 1.25, final: false, reserve: writeRange(), mark: mark, names: !!reveal, stretch: true });
		S.writeGeom = r;
		return r.svg;
	}
	function lineSvg(q, w) {
		var mark = {};
		(S.lineMarks || []).forEach(function (m, k) { if (m) { mark[k] = m; } });
		if (S.phase === 'ask') { mark[S.lineAt] = 'cur'; }
		return ST.render({ notes: q.notes, time: null, key: q.key, width: w, scale: 1.1, mark: mark, final: false, maxBars: 1 }).svg;
	}
	/* Write the rhythm: the bar as written so far (an empty bar to start), and the pieces to build it from */
	function builtBeats() { return (S.built || []).reduce(function (a, k) { return a + RD.CELLS[k].b; }, 0); }
	function rwriteSvg(q, w, mark, notes) {
		var src = notes || RD.cellsNotes(S.built || [], 'A2');
		var left = M.barBeats(q.time) - (notes ? M.barBeats(q.time) : builtBeats());
		// what isn't written yet shows as a space to fill: hidden rests, so the bar keeps its width
		if (left > 1e-6 && !notes) { src = (src ? src + ' ' : '') + 'r/' + ({ 4: 'w', 3: 'h.', 2: 'h', 1.5: 'q.', 1: 'q', 0.5: '8' }[left] || 'q'); }
		var out = ST.render({ notes: src, time: q.time, width: Math.min(w, 520), final: false, mark: mark }).svg;
		if (left > 1e-6 && !notes) {
			// fade the filler rests: they are the room left, not part of the answer
			var n = (RD.cellsNotes(S.built || [], 'A2').match(/\S+\/\S+/g) || []).length;
			out = out.replace(new RegExp('(<g data-i="' + n + '")'), '$1 opacity="0"');
		}
		return out;
	}
	function cellPalette(q) {
		var at = builtBeats();
		return q.palette.map(function (k) {
			var r = ST.render({ notes: RD.cellsNotes([k], 'A2'), time: null, plain: true, bare: true, scale: 0.9, width: 130, final: false });
			var label = (/aria-label="([^"]*)"/.exec(r.svg) || [])[1] || k;
			var fits = S.phase === 'ask' && RD.cellFits(q.level, k, at);
			return '<button type="button" class="rd-cell" data-cell="' + k + '" aria-label="' + label + '"' + (fits ? '' : ' disabled') + '>' + r.svg.replace(/ role="img" aria-label="[^"]*"/, ' aria-hidden="true"') + '</button>';
		}).join('');
	}
	function refreshRwrite() {
		var q = S.q, full = Math.abs(builtBeats() - M.barBeats(q.time)) < 1e-6;
		$('score').innerHTML = rwriteSvg(q, boxWidth($('card')), null);
		$('cells').innerHTML = cellPalette(q);
		var c = $('commit').querySelector('[data-act="check"]'); if (c) { c.disabled = !full || S.phase !== 'ask'; }
		$('status').textContent = full ? 'The bar is full. Check it, or Undo to change it.' : '';
	}
	function rwriteCheck() {
		var q = S.q; if (S.phase !== 'ask') { return; }
		var m = RD.mark(q, S.built);
		if (!m.ok) {
			wrongOnce(m.x);
			$('status').textContent = 'Not quite: ' + m.beats + ' of ' + m.of + ' beats right. Play it again and change what’s wrong, or Show me.';
			return;
		}
		firstAnswer(m.x);
		var ms = S.ms;
		finish(true, { noAuto: true });
		var ck = $('commit').querySelector('[data-act="check"]'); if (ck) { ck.disabled = true; }
		$('score').innerHTML = rwriteSvg(q, boxWidth($('card')), null, RD.cellsNotes(S.built, 'A2'));
		$('cells').innerHTML = cellPalette(q);
		result('<p class="he-verdict"><b>That’s it</b> · ' + (S.tries ? 'got there' : secs(ms)) + '</p>' + nextBtn());
	}
	function sightSvg(q, w, mark) { return ST.render({ notes: q.notes, key: q.key, time: q.time, width: w, mark: mark, tab: !!SS().tab, fit: true, tempo: q.drill === 'band' ? (SS().bpm || q.bpm) : null, style: q.drill === 'band' ? q.styleWord : null, strings: SET.strings, maxBars: narrow() ? 2 : 4 }).svg; }
	function tempoRow(kind, q) {
		var bpm = kind === 'tap' ? (SET.tap.bpm || q.bpm) : ((SET[kind] || SET.sight).bpm || q.bpm);
		return '<div class="he-fader-row rd-tempo"><label class="he-kicker" for="rd-bpm">Tempo</label><input class="he-fader" type="range" id="rd-bpm" data-bpm="' + kind + '" min="40" max="160" step="2" value="' + bpm + '"><output for="rd-bpm" id="rd-bpm-out">' + bpm + '</output></div>' +
			(kind === 'tap' ? '<div class="he-togs"><label class="he-switch rd-mini"><input type="checkbox" data-opt="counts"' + (SET.tap.counts ? ' checked' : '') + '><span>Show the count</span></label><label class="he-switch rd-mini"><input type="checkbox" data-opt="first"' + (SET.tap.first ? ' checked' : '') + '><span>Play it to me first</span></label></div>' : '');
	}
	function sightOptions(band) {
		var ss = SS(), who = band ? [['band', 'The band'], ['bandbass', 'The band and the bass part'], ['click', 'Click'], ['none', 'Nothing']] : [['click', 'Click'], ['bass', 'Click and the bass'], ['none', 'Nothing']];
		return '<div class="he-set"><p class="he-kicker">While you play</p><div class="he-togs" role="group" aria-label="Who plays with you">' +
			who.map(function (b) { return '<button type="button" class="he-tog" data-band="' + b[0] + '" aria-pressed="' + (ss.band === b[0]) + '">' + b[1] + '</button>'; }).join('') +
			'</div><div class="he-togs"><label class="he-switch rd-mini"><input type="checkbox" data-opt="mic"' + (ss.mic ? ' checked' : '') + '><span>Listen to me (microphone)</span></label><label class="he-switch rd-mini"><input type="checkbox" data-opt="tab"' + (ss.tab ? ' checked' : '') + '><span>Show the TAB</span></label></div>' +
			(ss.mic ? micPanel() : '') + '</div>';
	}
	// Who plays with a piece, as playMusic wants it
	function withWho(q, ss) {
		var b = ss.band, band = q.drill === 'band' && (b === 'band' || b === 'bandbass');
		return { time: q.time, bpm: ss.bpm || q.bpm, click: b !== 'none', bass: b === 'bass' || b === 'bandbass', band: band, feel: band ? q.feel : null, comp: q.comp };
	}
	function keyNamePad(q) {
		var list = [];
		for (var f = -7; f <= 7; f++) { if (Math.abs(f) <= Math.max(q.key < 0 ? -q.key : q.key, SET.key.range)) { list.push(q.mode === 'minor' ? M.minorOf(f) : M.majorOf(f)); } }
		return '<div class="he-togs rd-pads" role="group" aria-label="Keys">' + list.map(function (k) { return '<button type="button" class="he-tog rd-pad" data-keyname="' + k + '">' + esc(M.prettyName(k)) + (q.mode === 'minor' ? 'm' : '') + '</button>'; }).join('') + '</div>';
	}
	function keySigPad() {
		var out = [];
		for (var f = -SET.key.range; f <= SET.key.range; f++) { out.push('<button type="button" class="he-tog rd-pad" data-keysig="' + f + '">' + (f === 0 ? 'None' : Math.abs(f) + (f > 0 ? '♯' : '♭')) + '</button>'); }
		return '<div class="he-togs rd-pads" role="group" aria-label="Key signatures">' + out.join('') + '</div>';
	}
	function intervalPad(q) {
		if (q.numbersOnly) { return '<div class="he-togs rd-pads" role="group" aria-label="Numbers">' + ['1', '2', '3', '4', '5', '6', '7', '8'].map(function (n) { return '<button type="button" class="he-tog rd-pad" data-int="' + n + '">' + (n === '1' ? 'Unison' : n === '8' ? 'Octave' : ordinal(+n)) + '</button>'; }).join('') + '</div>'; }
		var codes = RD.INTERVALS[SET.int.set] || RD.INTERVALS.octave;
		return '<div class="he-togs rd-pads rd-int" role="group" aria-label="Intervals">' + codes.map(function (c) { return '<button type="button" class="he-tog rd-pad" data-int="' + c + '" title="' + esc(M.intervalName(c.replace(/\d+/, ''), +c.replace(/\D+/, ''))) + '">' + esc(c) + '</button>'; }).join('') + '</div>';
	}
	var CHORD_QUAL_NAMES = { M: 'major', m: 'minor', dim: 'dim', aug: 'aug', '7': '7', M7: 'maj7', m7: 'm7', h7: 'm7♭5', dim7: '°7' };
	function chordPad(q) {
		var cs = RD.CHORD_SETS[SET.chord.set] || RD.CHORD_SETS.triads;
		var roots = cs.diatonic ? ['C', 'D', 'E', 'F', 'G', 'A', 'B'] : ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
		var quals = cs.diatonic ? ['M', 'm', 'dim'] : cs.quals;
		return '<p class="he-kicker">Root</p><div class="he-togs rd-pads" role="group" aria-label="Root">' + roots.map(function (r) { return '<button type="button" class="he-tog rd-pad" data-root="' + r + '" aria-pressed="' + (S.said && S.said.root === r) + '">' + esc(M.prettyName(r)) + '</button>'; }).join('') + '</div>' +
			'<p class="he-kicker">Kind</p><div class="he-togs rd-pads" role="group" aria-label="Kind">' + quals.map(function (k) { return '<button type="button" class="he-tog rd-pad" data-qual="' + k + '" aria-pressed="' + (S.said && S.said.qual === k) + '">' + esc(CHORD_QUAL_NAMES[k] || k) + '</button>'; }).join('') + '</div>';
	}

	/* ---------- answering ---------- */

	function elapsed() { return Math.round(now() - S.t0); }

	function finish(ok, o) {
		o = o || {};
		var q = S.q;
		if (S.phase !== 'ask') { return; }
		S.phase = ok ? 'right' : 'shown';
		var line = RD.entry(q, ok && S.tries === 0, { ms: S.ms || elapsed(), tries: S.tries, shown: !!o.shown, said: S.firstSaid, via: o.via || 'tap', item: o.item, k: o.k });
		remember(line);
		renderSide();
		if (S.plan) { var part = S.plan.parts[S.plan.i]; part.done = (part.done || 0) + 1; if (part.seq) { part.left.shift(); } }
		var auto = ok && SET.after === 'next' && !o.noAuto;
		if (auto) { window.setTimeout(function () { if (S.q === q) { next(); } }, o.delay || 750); }
	}
	function next() {
		if (S.plan) {
			var part = S.plan.parts[S.plan.i];
			if ((part.done || 0) >= part.count) {
				S.plan.i++;
				if (S.plan.i >= S.plan.parts.length) { planDone(); return; }
			}
		}
		newQuestion();
	}
	function wrongOnce(said) {
		if (S.tries === 0) { S.firstSaid = said; S.ms = elapsed(); }
		S.tries++;
	}
	function firstAnswer(said) { if (S.tries === 0) { S.firstSaid = said; S.ms = elapsed(); } }

	function result(html) { $('result').innerHTML = html; $('result').hidden = false; }
	function nextBtn() { return '<p class="he-commit"><button type="button" class="he-btn" data-act="next">Next</button></p>'; }
	function speedWord(ms, drill) {
		var fast = RD.DRILLS[drill].fast; if (!fast || ms == null) { return ''; }
		return ms <= fast * 0.6 ? 'immediate' : ms <= fast ? 'quick' : 'still taking a moment';
	}
	function whereItLives(p) {
		var places = M.positions(p, { strings: SET.strings, maxFret: SET.maxFret });
		if (!places.length) { return ''; }
		return '<div class="rd-neck">' + BASS.fretboard({ strings: SET.strings, from: 0, to: SET.maxFret, marks: places.map(function (c) { return { string: c.s, fret: c.f, label: M.letterName(p), kind: 'solid' }; }), width: boxWidth($('card')) }) + '</div>' +
			'<p class="he-small">' + esc(M.pretty(p)) + ' lives ' + places.map(function (c) { return c.f ? 'on the ' + c.string + ' string at the ' + ordinal(c.f) + ' fret' : 'on the open ' + c.string + ' string'; }).join(', ') + '.</p>';
	}

	function answerName(L, a) {
		var q = S.q; if (S.phase !== 'ask') { return; }
		var m = RD.mark(q, { L: L, a: a });
		firstAnswer(m.x);
		[].forEach.call($('ask').querySelectorAll('[data-name]'), function (b) { if (b.getAttribute('data-name') === L + ',' + a) { b.classList.add(m.ok ? 'is-yes' : 'is-no'); } });
		if (!m.ok) {
			wrongOnce(m.x);
			$('status').textContent = m.sameSound ? 'Same sound, but on this line or space the letter is ' + M.parse(q.pitch).L + '.' : 'Not that one. Try again, or Show me.';
			return;
		}
		Sound.note(q.pitch);
		var mark = {}; mark[0] = 'ok';
		$('card').innerHTML = noteCard(q, mark);
		var ms = S.ms;
		finish(true);
		result('<p class="he-verdict"><b>' + esc(nice(q.pitch)) + '</b> ' + (S.tries ? 'got there' : 'right') + (S.tries === 0 ? ' · ' + secs(ms) + (speedWord(ms, 'name') ? ', ' + speedWord(ms, 'name') : '') : '') + '</p>' +
			(SET.after === 'next' && !S.tries ? '' : whereItLives(q.pitch) + nextBtn()));
	}
	function answerFind(s, f) {
		var q = S.q; if (S.phase !== 'ask') { return; }
		var m = RD.mark(q, { s: s, f: f, strings: SET.strings });
		var heard = M.atFret(s, f, { strings: SET.strings });
		Sound.note(heard);
		if (q.every) {
			if (S.found.some(function (x) { return x.s === s && x.f === f; })) { return; }
			S.found.push({ s: s, f: f, ok: m.ok });
			if (!m.ok) { wrongOnce('s' + s + '.' + f); $('status').textContent = 'That is ' + nice(heard) + '.'; }
			else { firstAnswer('s' + s + '.' + f); }
			$('neck').innerHTML = neckAsk(q, boxWidth($('neck')));
			var got = S.found.filter(function (x) { return x.ok; }).length;
			if (got >= q.places.length) {
				finish(true, { noAuto: true });
				result('<p class="he-verdict"><b>All ' + q.places.length + '</b> found · ' + secs(elapsed()) + '</p>' + nextBtn());
			} else { $('status').textContent = (m.ok ? 'Yes. ' : $('status').textContent + ' ') + (q.places.length - got) + ' to go.'; }
			return;
		}
		S.found.push({ s: s, f: f, ok: m.ok });
		$('neck').innerHTML = neckAsk(q, boxWidth($('neck')));
		if (!m.ok) {
			wrongOnce(m.x);
			$('status').textContent = m.outside ? 'That’s the note, but outside the position: find it between the ' + ordinal(q.box[0]) + ' and ' + ordinal(q.box[1]) + ' frets.' : m.octave ? 'Right letter, wrong octave: that is ' + nice(heard) + ', and the stave asks for the ' + (M.midi(heard) > M.midi(q.pitch) ? 'lower' : 'higher') + ' one.' : 'That is ' + nice(heard) + '. Try again, or Show me.';
			return;
		}
		firstAnswer(m.x);
		var ms = S.ms;
		finish(true);
		result('<p class="he-verdict"><b>' + esc(nice(q.pitch)) + '</b> ' + (S.tries ? 'got there' : 'right') + (S.tries === 0 ? ' · ' + secs(ms) + (speedWord(ms, 'find') ? ', ' + speedWord(ms, 'find') : '') : '') + '</p>' +
			(SET.after === 'next' && !S.tries ? '' : whereItLives(q.pitch) + nextBtn()));
	}
	function placeOnStave(evt) {
		var svg = $('write') && $('write').querySelector('svg'); if (!svg || S.phase !== 'ask') { return; }
		var pt = svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
		var u = pt.matrixTransform(svg.getScreenCTM().inverse());
		var sys = S.writeGeom.systems[0];
		var step = ST.stepAt(sys, 0, u.y);
		var r = writeRange();
		step = Math.max(M.step(r.lo) - 1, Math.min(M.step(r.hi) + 1, step));
		var acc = +SET.notes.key ? (M.keyAccidentals(+SET.notes.key)[M.fromStep(step, 0).charAt(0)] || 0) : 0;
		if (S.placed !== step) { S.placedAcc = acc; }
		S.placed = step;
		$('write').innerHTML = writeStave(S.q, boxWidth($('write')));
		syncWrite();
		Sound.note(M.fromStep(step, S.placedAcc));
	}
	function syncWrite() {
		[].forEach.call($('ask').querySelectorAll('[data-acc]'), function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-acc') === S.placedAcc)); });
		var c = $('commit').querySelector('[data-act="check"]'); if (c) { c.disabled = S.placed == null; }
	}
	function answerWrite() {
		var q = S.q; if (S.phase !== 'ask' || S.placed == null) { return; }
		var m = RD.mark(q, { step: S.placed, a: S.placedAcc });
		if (!m.ok) {
			wrongOnce(m.x);
			$('status').textContent = m.sameSound ? 'Same sound, but in ' + M.keyName(q.key) + ' it is written ' + nice(q.pitch) + '.' : m.octave ? 'Right letter, wrong octave. Count the lines again.' : 'Not quite: that is ' + nice(m.x) + '. Try again, or Show me.';
			return;
		}
		firstAnswer(m.x);
		var ms = S.ms;
		$('write').innerHTML = writeStave(q, boxWidth($('write')), { ok: true });
		finish(true, { noAuto: false });
		result('<p class="he-verdict"><b>' + esc(nice(q.pitch)) + '</b> ' + (S.tries ? 'got there' : 'right') + (S.tries === 0 ? ' · ' + secs(ms) : '') + '</p>' + (SET.after === 'next' && !S.tries ? '' : nextBtn()));
	}
	function chordCheck() {
		var q = S.q; if (S.phase !== 'ask' || !S.said || !S.said.root || !S.said.qual) { return; }
		var m = RD.mark(q, S.said);
		if (!m.ok) { wrongOnce(m.x); $('status').textContent = m.rootOk ? 'The root is right; listen again for the kind.' : m.qualOk ? 'The kind is right; find the root again (the note the stack is built on).' : 'Not that one. Try again, or Show me.'; return; }
		firstAnswer(m.x);
		Sound.note(q.tones, { inst: 'rhodes', len: 2 });
		finish(true);
		result('<p class="he-verdict"><b>' + esc(M.chordSymbol(q.root + '3', q.qual)) + '</b> ' + (q.inv ? '(' + (q.inv === 1 ? 'first' : 'second') + ' inversion: ' + esc(M.chordSymbol(q.root + '3', q.qual)) + '/' + esc(M.letterName(q.tones[0])) + ') ' : '') + (S.tries ? 'got there' : 'right · ' + secs(S.ms)) + '</p>' + (SET.after === 'next' && !S.tries ? '' : nextBtn()));
	}
	function showMe() {
		var q = S.q; if (!q || S.phase !== 'ask') { return; }
		if (S.tries === 0) { S.firstSaid = ''; S.ms = elapsed(); }
		var d = q.drill, html = '';
		if (d === 'name' || d === 'find') {
			var mark = {}; mark[0] = 'hint';
			$('card').innerHTML = noteCard(q, mark);
			html = '<p class="he-verdict"><b>' + esc(nice(q.pitch)) + '</b></p>' + whereItLives(q.pitch);
			Sound.note(q.pitch);
		} else if (d === 'write') {
			S.placed = null;
			$('write').innerHTML = writeStave(q, boxWidth($('write')), { ok: false });
			html = '<p class="he-verdict"><b>' + esc(nice(q.pitch)) + '</b></p>';
		} else if (d === 'key') {
			html = '<p class="he-verdict"><b>' + esc(M.keyName(q.key, q.mode)) + '</b> · ' + (q.key === 0 ? 'no sharps or flats' : M.keyList(q.key).join(' ')) + ' · relative ' + (q.mode === 'minor' ? 'major: ' + esc(M.keyName(q.key)) : 'minor: ' + esc(M.keyName(q.key, 'minor'))) + '</p>';
		} else if (d === 'int') {
			var iv = M.interval(q.lo, q.hi);
			html = '<p class="he-verdict"><b>' + esc(iv.name) + '</b> (' + iv.semis + ' frets)</p>' + intervalNeck(q);
			Sound.note([q.lo, q.hi]);
		} else if (d === 'chord') {
			html = '<p class="he-verdict"><b>' + esc(M.chordSymbol(q.root + '3', q.qual)) + '</b>: ' + q.tones.map(nice).join(' ') + '</p>';
			Sound.note(q.tones, { inst: 'rhodes', len: 2 });
		} else if (d === 'rwrite') {
			S.phase = 'shown';
			$('score').innerHTML = rwriteSvg(q, boxWidth($('card')), null, q.notes);
			$('cells').innerHTML = cellPalette(q);
			S.phase = 'ask';
			html = '<p class="he-verdict">The bar played</p><p class="he-small">It plays again now: follow it on the page, counting.</p>';
			var ck = $('commit').querySelector('[data-act="check"]'); if (ck) { ck.disabled = true; }
			playQuestionBar();
		} else if (d === 'hear') {
			var c = $('ask').querySelector('[data-choice="' + q.answer + '"]'); if (c) { c.classList.add('is-yes'); }
			html = '<p class="he-verdict"><b>' + 'ABC'.charAt(q.answer) + '</b></p>';
		}
		finish(false, { shown: true });
		result(html + nextBtn());
	}
	function intervalNeck(q) {
		var a = M.fingerLine([q.lo, q.hi], { strings: SET.strings, preferOpen: false });
		if (!a[0] || !a[1]) { return ''; }
		return '<div class="rd-neck">' + BASS.fretboard({ strings: SET.strings, from: 0, to: Math.max(5, Math.min(12, Math.max(a[0].f, a[1].f) + 2)), marks: [{ string: a[0].s, fret: a[0].f, label: '1', kind: 'solid' }, { string: a[1].s, fret: a[1].f, label: String(M.interval(q.lo, q.hi).num), kind: 'solid' }], width: boxWidth($('card')) }) + '</div>';
	}

	/* ---------- Play it: a line, at your own pace ---------- */

	function lightLine() { var el = $('score'); if (el) { el.innerHTML = lineSvg(S.q, boxWidth(el)); } }
	function playNote(soundingMidi, via) {
		var q = S.q; if (!q || q.drill !== 'play' || S.phase !== 'ask') { return; }
		var want = q.line[S.lineAt];
		var hit = RD.heardMatches(want, soundingMidi);
		S.lineMarks = S.lineMarks || [];
		if (!hit.ok) {
			if (!S.lineMiss) { S.lineMiss = true; }
			S.lineMarks[S.lineAt] = 'no';
			$('status').textContent = 'That was ' + M.letterName(M.fromMidi(soundingMidi + 12, { key: q.key })) + '. Look again: ' + M.pretty(want) + '.';
			lightLine();
			return;
		}
		var ms = Math.round(now() - S.t0);
		remember(RD.entry({ drill: 'play', item: want }, !S.lineMiss, { ms: ms, via: via, tries: S.lineMiss ? 1 : 0 }));
		S.lineMarks[S.lineAt] = S.lineMiss ? 'dim' : 'ok';
		S.lineTimes = S.lineTimes || []; S.lineTimes[S.lineAt] = ms;
		S.lineAt++; S.lineMiss = false; S.t0 = now();
		$('status').textContent = '';
		if (S.plan) { var part = S.plan.parts[S.plan.i]; part.done = (part.done || 0) + 1; }
		if (S.lineAt >= q.line.length) {
			S.phase = 'right';
			lightLine();
			renderSide();
			var right = S.lineMarks.filter(function (m) { return m === 'ok'; }).length;
			var slow = q.line.map(function (p, k) { return { p: p, ms: S.lineTimes[k] }; }).sort(function (a, b) { return b.ms - a.ms; })[0];
			result('<p class="he-verdict"><b>' + right + ' of ' + q.line.length + '</b> first time · slowest ' + esc(nice(slow.p)) + ' (' + secs(slow.ms) + ')</p>' + nextBtn());
			if (S.plan && (S.plan.parts[S.plan.i].done || 0) >= S.plan.parts[S.plan.i].count) { /* Next moves the plan on */ }
			return;
		}
		lightLine();
	}

	/* ---------- the microphone ---------- */

	var MIC = { state: 'off', listener: null, waiting: null, onnote: null };
	function micPanel() {
		return '<div class="rd-mic" id="rd-mic"><button type="button" class="he-btn is-quiet" data-act="mic">' + (MIC.state === 'on' ? 'Switch the microphone off' : 'Switch the microphone on') + '</button>' +
			'<span class="rd-meter" aria-hidden="true"><i id="rd-meter"></i></span><p class="he-small">' + (MIC.state === 'on' ? 'Listening. Use headphones for the click, so it hears only your bass.' : MIC.state === 'asking' ? 'Asking for the microphone…' : MIC.state === 'denied' ? 'The microphone wasn’t allowed. Your browser’s site settings can change that.' : 'It listens only while it is on, and nothing is recorded or sent anywhere.') + '</p></div>';
	}
	function script(src) { return new Promise(function (resolve, reject) { var t = document.createElement('script'); t.src = src; t.async = false; t.onload = resolve; t.onerror = reject; document.head.appendChild(t); }); }
	function micOn() {
		if (MIC.state === 'on' || MIC.state === 'asking') { return; }
		if (!CFG.tuner || !CFG.listen) { MIC.state = 'denied'; refreshMic(); return; }
		MIC.state = 'asking'; refreshMic();
		MIC.waiting = MIC.waiting || (window.LBSListen ? Promise.resolve() : script(CFG.tuner).then(function () { return script(CFG.listen); }));
		MIC.waiting.then(function () {
			MIC.listener = MIC.listener || window.LBSListen.create();
			MIC.listener.onnote = function (n) { if (MIC.onnote) { MIC.onnote(n); } else if (S.q && S.q.drill === 'play') { playNote(n.midi, 'mic'); } };
			MIC.listener.onlevel = function (level) { var m = $('meter'); if (m) { m.style.width = Math.min(100, Math.round(level * 400)) + '%'; } };
			return MIC.listener.start();
		}).then(function () { MIC.state = 'on'; refreshMic(); }).catch(function () { MIC.state = 'denied'; refreshMic(); });
	}
	function micOff() { if (MIC.listener && MIC.listener.running) { MIC.listener.stop(); } if (MIC.state !== 'denied') { MIC.state = 'off'; } }
	function micReset() { if (MIC.listener && MIC.listener.reset) { MIC.listener.reset(); } MIC.onnote = null; }
	function refreshMic() { var p = $('mic'); if (p) { p.outerHTML = micPanel(); } }

	/* ---------- Tap it: rhythm in time ---------- */

	var TAP = null;
	function tapBpm(q) { return SET.tap.bpm || q.bpm; }
	function startTap(listenOnly) {
		var q = S.q;
		if (!Sound.ok()) { $('status').textContent = 'Sound isn’t available in this browser, so there is no click to tap against.'; return; }
		var first = SET.tap.first && !listenOnly && !S.heardFirst;
		TAP = { taps: [], live: false, listen: listenOnly || first };
		var btn = $('tap');
		var score = $('score');
		var w = boxWidth(score);
		playMusic(q.notes, {
			time: q.time, bpm: tapBpm(q), click: true, bass: !!TAP.listen,
			onNote: function (ev) { var m = {}; if (ev) { m[ev.i] = 'cur'; } score.innerHTML = ST.render({ notes: q.notes, time: q.time, width: w, fit: true, counts: SET.tap.counts, maxBars: narrow() ? 1 : 2, mark: m }).svg; },
			onEnd: function () {
				if (TAP && TAP.listen) { S.heardFirst = true; TAP = null; if (btn) { btn.querySelector('span').textContent = 'Start'; } if (first) { startTap(false); } return; }
				scoreTap();
			},
			onStop: function () { if (btn) { btn.classList.remove('is-live'); btn.setAttribute('aria-pressed', 'false'); } }
		}).then(function (res) {
			if (!res || !TAP) { return; }
			TAP.res = res; TAP.live = !TAP.listen;
			if (btn) { btn.classList.add('is-live'); btn.setAttribute('aria-pressed', 'true'); btn.querySelector('span').textContent = TAP.listen ? 'Listen' : 'Tap'; }
		}).catch(function () { $('status').textContent = 'That wouldn’t play. Press Start again.'; });
		$('status').textContent = TAP.listen ? 'Listen first: the bass plays it once.' : 'A bar of clicks, then tap.';
	}
	function tapAt(evtTime) {
		if (!TAP || !TAP.live || !TAP.res) { return; }
		var r = TAP.res;
		// the moment of the tap on the audio clock, less how late the speakers are and how late this person taps
		var lat = (r.ctx.outputLatency || r.ctx.baseLatency || 0) + (SET.latency || 0) / 1000;
		var a = r.audio0 + ((evtTime || now()) - r.perf0) / 1000 - lat;
		TAP.taps.push(a - r.startsAt);
		var pad = $('tap'); if (pad) { pad.classList.remove('is-hit'); void pad.offsetWidth; pad.classList.add('is-hit'); }
	}
	function scoreTap() {
		var q = S.q; if (!TAP || !TAP.res) { return; }
		var beat = TAP.res.beatSec, tl = TAP.res.tl;
		var tg = []; tl.events.forEach(function (ev, k) { var prev = tl.events[k - 1]; if (!ev.rest && !(prev && prev.tie && !prev.rest)) { tg.push({ at: ev.at * beat, i: ev.i }); } });
		var sc = RD.scoreTaps(tg.map(function (x) { return x.at; }), TAP.taps.filter(function (t) { return t > -beat; }), { beat: beat });
		TAP.live = false;
		var mark = {};
		sc.notes.forEach(function (n, k) { mark[tg[k].i] = n.how === 'ok' ? 'ok' : n.how === 'miss' ? 'no' : 'hint'; });
		$('score').innerHTML = ST.render({ notes: q.notes, time: q.time, width: boxWidth($('score')), counts: true, maxBars: narrow() ? 1 : 2, mark: mark }).svg;
		var btn = $('tap'); if (btn) { btn.querySelector('span').textContent = 'Again'; }
		S.ms = 0;
		S.firstSaid = sc.onTime + '.' + sc.of;
		var shown = S.tries > 0;
		finish(sc.ok, { noAuto: true, via: 'tap', item: q.item, k: q.level });
		if (!sc.ok) { S.tries++; }
		S.phase = 'ask'; // a rhythm can be tried again straight away; only the first go counts
		var drift = Math.round(sc.mean * 1000);
		result('<p class="he-verdict"><b>' + sc.onTime + ' of ' + sc.of + '</b> on time' + (sc.extra.length ? ' · ' + sc.extra.length + ' extra tap' + (sc.extra.length > 1 ? 's' : '') : '') + '</p>' +
			'<p class="he-small">' + (Math.abs(drift) < 15 ? 'Centred on the beat.' : 'On average ' + Math.abs(drift) + ' ms ' + (drift < 0 ? 'early (ahead of the beat)' : 'late (behind the beat)') + '.') +
			(sc.notes.some(function (n) { return n.how === 'miss'; }) ? ' A red note was missed.' : '') + (sc.notes.some(function (n) { return n.how === 'early' || n.how === 'late'; }) ? ' A note in dark orange was early or late.' : '') + '</p>' +
			timingStrip(sc, tl, beat) + '<p class="he-commit"><button type="button" class="he-btn" data-act="next">Next rhythm</button></p>');
		if (shown) { /* nothing more */ }
	}
	function timingStrip(sc, tl, beat) {
		var total = tl.total * beat, W = 600, H = 46, x = function (t) { return 10 + (t / total) * (W - 20); };
		var out = '<svg class="rd-strip" viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Your taps against the notes: ' + sc.notes.map(function (n) { return n.how === 'miss' ? 'missed' : n.how === 'ok' ? 'on time' : Math.round(Math.abs(n.err) * 1000) + ' ms ' + n.how; }).join(', ') + '.">';
		for (var b = 0; b <= tl.bars; b++) { out += '<line x1="' + x(b * tl.per * beat) + '" y1="4" x2="' + x(b * tl.per * beat) + '" y2="' + (H - 4) + '" class="rd-strip-bar"/>'; }
		sc.notes.forEach(function (n) { out += '<line x1="' + x(n.t) + '" y1="10" x2="' + x(n.t) + '" y2="' + (H - 10) + '" class="rd-strip-note"/>'; if (n.tap != null) { out += '<circle cx="' + x(n.tap) + '" cy="' + H / 2 + '" r="5" class="rd-strip-' + n.how + '"/>'; } });
		sc.extra.forEach(function (t) { if (t >= 0 && t <= total) { out += '<circle cx="' + x(t) + '" cy="' + H / 2 + '" r="5" class="rd-strip-extra"/>'; } });
		return out + '</svg><p class="he-small rd-strip-key">Lines: where each note starts. Dots: your taps (filled on time; ringed early or late).</p>';
	}

	/* ---------- Sight read ---------- */

	var SIGHT = null;
	function sightGo() {
		var q = S.q;
		if (SIGHT) { Sound.stop(); SIGHT = null; renderQuestion(); return; }
		if (!Sound.ok()) { $('status').textContent = 'Sound isn’t available here, so there is no click. Read it through at your own tempo, then mark how it went.'; sightMarkPanel(null); return; }
		SIGHT = { phase: 'look', heard: [], marks: {} };
		var btn = $('act').querySelector('[data-act="sight"]');
		btn.setAttribute('aria-pressed', 'true');
		var secsLeft = SS().look, scan = $('scan');
		if (q.drill === 'band' && q.feel) { wantKit(q.feel); }
		if (scan) { scan.classList.add('is-on'); }
		var tick = function () {
			if (!SIGHT || SIGHT.phase !== 'look') { return; }
			btn.querySelector('span').textContent = secsLeft > 0 ? 'Look: ' + secsLeft : 'Here we go';
			if (secsLeft-- <= 0) { sightPlay(); return; }
			SIGHT.timer = window.setTimeout(tick, 1000);
		};
		tick();
		if (SS().mic) { micOn(); }
	}
	function sightPlay() {
		var q = S.q; if (!SIGHT) { return; }
		window.clearTimeout(SIGHT.timer);
		SIGHT.phase = 'play';
		var btn = $('act').querySelector('[data-act="sight"]');
		if (btn) { btn.querySelector('span').textContent = 'Stop'; }
		var w = boxWidth($('score'));
		micReset();
		var ss = SS();
		if (ss.mic) { MIC.onnote = function (n) { sightHeard(n); }; }
		playMusic(q.notes, extend(withWho(q, ss), {
			onNote: function (ev) { if (!SIGHT) { return; } SIGHT.cur = ev; var m = extend(SIGHT.marks, {}); if (ev && !m[ev.i]) { m[ev.i] = 'cur'; } $('score').innerHTML = sightSvg(q, w, m); },
			onEnd: function () { if (!SIGHT) { return; } SIGHT.phase = 'done'; MIC.onnote = null; sightMarkPanel(ss.mic ? SIGHT : null); },
			onStop: function () { if (SIGHT && SIGHT.phase === 'play') { SIGHT.phase = 'stopped'; } }
		})).then(function (res) { if (SIGHT && res) { SIGHT.res = res; } }).catch(function () { $('status').textContent = 'That wouldn’t play. Press the button again.'; SIGHT = null; });
	}
	// A note heard while reading: it belongs to the note sounding when it was struck (detection takes about a tenth of a second).
	function sightHeard(n) {
		if (!SIGHT || !SIGHT.res || SIGHT.phase !== 'play') { return; }
		var r = SIGHT.res, a = r.audio0 + (n.at - r.perf0) / 1000 - 0.1 - (r.ctx.outputLatency || 0);
		var q = (a - r.startsAt) / r.beatSec, tl = r.tl;
		for (var k = 0; k < tl.events.length; k++) {
			var ev = tl.events[k], prev = tl.events[k - 1];
			if (ev.rest || (prev && prev.tie && !prev.rest)) { continue; }
			if (q >= ev.at - 0.3 && q < ev.at + Math.max(ev.beats, 0.5) + 0.15) {
				if (SIGHT.got && SIGHT.got[k]) { return; }
				SIGHT.got = SIGHT.got || {};
				var ok = RD.heardMatches(ev.pitches[0], n.midi).ok;
				if (ok) { SIGHT.got[k] = true; SIGHT.marks[ev.i] = 'ok'; } else if (SIGHT.marks[ev.i] !== 'ok') { SIGHT.marks[ev.i] = 'no'; }
				return;
			}
		}
	}
	function sightMarkPanel(heard) {
		var q = S.q;
		var btn = $('act').querySelector('[data-act="sight"]'); if (btn) { btn.setAttribute('aria-pressed', 'false'); btn.querySelector('span').textContent = 'Read it again'; }
		var scan = $('scan'); if (scan) { scan.classList.remove('is-on'); }
		var html = '';
		if (heard && heard.res) {
			var tl = heard.res.tl, total = 0, right = 0;
			tl.events.forEach(function (ev, k) { var prev = tl.events[k - 1]; if (!ev.rest && !(prev && prev.tie && !prev.rest)) { total++; if (heard.got && heard.got[k]) { right++; } } });
			var pct = Math.round(100 * right / Math.max(1, total));
			$('score').innerHTML = sightSvg(q, boxWidth($('score')), heard.marks);
			S.firstSaid = String(pct); S.ms = 0;
			finish(pct >= 90, { noAuto: true, via: 'mic', item: q.item, k: q.level });
			html = '<p class="he-verdict"><b>' + right + ' of ' + total + '</b> notes heard right (' + pct + '%)</p><p class="he-small">' + (pct >= 90 ? 'That counts. Try the next piece, or this one a little faster.' : 'Play it again (it’s still reading practice), then try a new one at this level.') + '</p>';
			SIGHT = null;
			result(html + '<p class="he-commit"><button type="button" class="he-btn" data-act="new">New piece</button></p>');
			return;
		}
		SIGHT = null;
		result('<p class="he-verdict">How did it go?</p><div class="he-togs" role="group" aria-label="How it went">' +
			[['clean', 'Clean: I kept going and got it'], ['slips', 'A slip or two, but I kept going'], ['lost', 'I lost my place']].map(function (o) { return '<button type="button" class="he-tog" data-self="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>');
	}

	/* ---------- Hear it ---------- */

	function playQuestionBar() {
		var q = S.q; var b = $('act').querySelector('[data-act="playq"]');
		if (b && b.getAttribute('aria-pressed') === 'true') { Sound.stop(); return; }
		if (b) { b.setAttribute('aria-pressed', 'true'); }
		playMusic(q.notes, { time: q.time, bpm: q.bpm, click: true, bass: true, onStop: function () { if (b) { b.setAttribute('aria-pressed', 'false'); } } })
			.catch(function () { $('status').textContent = 'Sound isn’t available in this browser.'; });
	}

	/* ---------- the Map ---------- */

	function renderMap() {
		var w = boxWidth($('card'));
		var drills = SET.map === 'all' ? ['name', 'find', 'write', 'play'] : [SET.map];
		var cells = RD.map(REC.log, { strings: SET.strings, maxFret: SET.maxFret, drills: drills });
		var tun = M.strings(SET.strings), marks = [];
		cells.forEach(function (c) {
			tun.forEach(function (open, s) {
				var f = c.midi - M.midi(open);
				if (f < 0 || f > SET.maxFret) { return; }
				var kind = c.missed ? 'ring' : c.level === 3 ? 'solid' : c.level === 2 ? 'solid' : c.level === 1 ? 'open' : 'ghost';
				marks.push({ string: s, fret: f, kind: kind, label: c.level >= 2 || c.level === 1 || c.missed ? M.letterName(c.written) : '' });
			});
		});
		var count = function (lv) { return cells.filter(function (c) { return c.level === lv; }).length; };
		var immediate = cells.filter(function (c) { return c.level === 3; }).map(function (c) { return M.pretty(c.written); });
		var weak = RD.weakest(cells.filter(function (c) { return c.level > 0; }), 6);
		$('kicker').textContent = 'The Map · ' + (SET.map === 'all' ? 'every link' : RD.DRILLS[SET.map].title);
		$('card').innerHTML = '<div class="rd-neck">' + BASS.fretboard({ strings: SET.strings, from: 0, to: SET.maxFret, marks: marks, width: w, title: 'Your Map' }) + '</div>' +
			'<dl class="he-tiles rd-map-tiles"><div><dt>Immediate</dt><dd>' + count(3) + '</dd></div><div><dt>Known</dt><dd>' + count(2) + '</dd></div><div><dt>Working on</dt><dd>' + count(1) + '</dd></div><div><dt>Not met yet</dt><dd>' + count(0) + '</dd></div></dl>' +
			'<ul class="he-small rd-legend"><li><span class="rd-key rd-key-solid"></span>known (immediate once quick as well as right)</li><li><span class="rd-key rd-key-open"></span>still working it out</li><li><span class="rd-key rd-key-ring"></span>missed lately</li><li><span class="rd-key rd-key-ghost"></span>not met yet</li></ul>' +
			(immediate.length ? '<p class="he-small"><b>Immediate:</b> ' + esc(immediate.join(', ')) + '</p>' : '');
		$('act').innerHTML = '';
		$('ask').innerHTML = head('Which link', 'A note is only as immediate as its slowest link, so “every link” is the hard one.') +
			'<div class="he-togs" role="group" aria-label="Which link">' + [['all', 'Every link'], ['name', 'Name it'], ['find', 'Find it'], ['write', 'Write it'], ['play', 'Play it']].map(function (m) { return '<button type="button" class="he-tog" data-map="' + m[0] + '" aria-pressed="' + (SET.map === m[0]) + '">' + m[1] + '</button>'; }).join('') + '</div>' +
			(weak.length ? '<p class="he-small">Slowest or missed lately: ' + esc(weak.map(function (c) { return M.pretty(c.names[0] || c.written); }).join(', ')) + '</p>' : '');
		$('commit').innerHTML = (weak.length ? '<button type="button" class="he-btn" data-act="weak">Practise these</button>' : '') + '<button type="button" class="he-btn is-quiet" data-act="sweep">Where am I?</button>';
		$('result').hidden = true;
		$('status').textContent = '';
	}

	/* ---------- plans: Today, and Where am I? ---------- */

	function startToday() {
		var parts = RD.today(REC.log, Date.now(), { strings: SET.strings });
		S.plan = { kind: 'today', parts: parts.map(function (p) { return { drill: p.drill, count: p.count, set: p.set, level: p.level, only: p.only, why: p.why, done: 0 }; }), i: 0 };
		renderPlan();
	}
	function startSweep() {
		var naturals = M.rangeOfNaturals('E2', M.fromMidi(M.midi(M.strings(SET.strings)[SET.strings - 1]) + Math.min(12, SET.maxFret))).filter(function (p) { return M.positions(p, { strings: SET.strings, maxFret: SET.maxFret }).length; });
		var mk = function (drill) { var l = RD.shuffle(naturals); return { drill: drill, count: l.length, only: l, seq: true, left: l.slice(), done: 0, why: 'every natural note once' }; };
		S.plan = { kind: 'sweep', parts: [mk('name'), mk('find')], i: 0 };
		S.strand = 'today';
		renderStrands();
		renderPlan();
		newQuestion();
	}
	function renderPlan() {
		if (!S.plan) { return; }
		$('drill-note').innerHTML = '<span class="rd-plan">' + S.plan.parts.map(function (p, k) {
			return '<b class="' + (k === S.plan.i ? 'is-on' : '') + '">' + esc(RD.DRILLS[p.drill].title) + (p.level ? ' · level ' + p.level : '') + '</b> <span>' + esc(p.why || '') + '</span>';
		}).join('<br>') + '</span>';
	}
	function planDone() {
		var kind = S.plan.kind;
		S.plan = null;
		$('card').innerHTML = '<p class="rd-big">' + (kind === 'sweep' ? 'Done. Here is your Map.' : 'That’s today done.') + '</p>';
		$('act').innerHTML = ''; $('ask').innerHTML = ''; $('commit').innerHTML = '';
		result('<p class="he-small">' + (kind === 'sweep' ? 'Every natural note from the open E up, named and found once. Come back to it in a month and see what has changed.' : 'Little and often does it. Today’s set changes as your record does.') + '</p>' +
			(MEMBER ? '<p class="he-commit"><button type="button" class="he-btn is-quiet" data-act="diary">Add it to my practice diary</button></p>' : ''));
		if (kind === 'sweep') { S.strand = 'map'; renderStrands(); window.setTimeout(function () { if (S.strand === 'map') { renderMap(); } }, 1600); }
	}

	/* ---------- the side: in play, the set up, the record ---------- */

	function tog(attr, value, label, on) { return '<button type="button" class="he-tog" ' + attr + '="' + esc(value) + '" aria-pressed="' + !!on + '">' + label + '</button>'; }
	function renderSide() {
		var d = S.strand === 'map' ? 'map' : currentDrill(), html = '';
		if (S.plan) { html = '<p class="he-small">' + (S.plan.kind === 'today' ? 'Today’s set is chosen from your record. Pick a strand above to choose for yourself.' : 'Every natural note on your neck, once each.') + '</p>'; }
		else if (d === 'name' || d === 'find' || d === 'write' || d === 'play' || d === 'map') {
			var sets = RD.NOTE_SETS.filter(function (s) { return (d === 'name' || s.clef === 'bass') && (!s.strings || SET.strings >= s.strings); });
			html += '<div class="he-set"><p class="he-kicker">Notes</p><div class="he-togs">' + sets.map(function (s) { return tog('data-set', s.id, esc(s.name), SET.notes.set === s.id); }).join('') + '</div><p class="he-small">' + esc(RD.noteSet(SET.notes.set).about) + '</p></div>';
			html += '<div class="he-set"><p class="he-kicker">Sharps and flats</p><div class="he-togs">' + tog('data-accs', 'none', 'None', SET.notes.accidentals === 'none' && !+SET.notes.key) + tog('data-accs', 'some', 'Some', SET.notes.accidentals === 'some' && !+SET.notes.key) + tog('data-accs', 'all', 'Every spelling', SET.notes.accidentals === 'all' && !+SET.notes.key) + '</div></div>';
			var keys = []; for (var f = -5; f <= 5; f++) { keys.push(f); }
			html += '<div class="he-set"><p class="he-kicker">Or in a key</p><div class="he-togs">' + keys.map(function (f) { return tog('data-key', f, f === 0 ? 'C' : esc(M.prettyName(M.majorOf(f))), +SET.notes.key === f && (f !== 0 || SET.notes.accidentals === 'none')); }).join('') + '</div></div>';
			if (d === 'find') { html += '<label class="he-switch"><input type="checkbox" data-opt="every"' + (SET.every ? ' checked' : '') + '><span>Find every place it lives</span></label>'; }
			if (d === 'play') { html += '<div class="he-set"><p class="he-kicker">Notes in a line</p><div class="he-togs">' + [4, 6, 8, 12].map(function (n) { return tog('data-len', n, n, SET.playLen === n); }).join('') + '</div></div>'; }
		} else if (d === 'tap' || d === 'hear' || d === 'rwrite') {
			var lv = d === 'tap' ? SET.tap.level : d === 'rwrite' ? SET.rwrite.level : SET.hear.level;
			html += '<div class="he-set"><p class="he-kicker">Level</p><div class="rd-levels">' + RD.RHYTHM.map(function (R) { return tog('data-level', R.n, '<b>' + R.n + '</b><span>' + esc(R.name) + '</span>', lv === R.n); }).join('') + '</div><p class="he-small">' + esc(RD.RHYTHM[lv - 1].about) + '</p></div>';
			if (d === 'tap') { html += '<div class="he-set"><p class="he-kicker">Bars</p><div class="he-togs">' + [1, 2, 4].map(function (n) { return tog('data-bars', n, n, SET.tap.bars === n); }).join('') + '</div></div>'; }
		} else if (d === 'sight') {
			html += '<div class="he-set"><p class="he-kicker">Level</p><div class="rd-levels">' + RD.SIGHT.map(function (L) { return tog('data-level', L.n, '<b>' + L.n + '</b><span>' + esc(L.name) + '</span>', SET.sight.level === L.n); }).join('') + '</div></div>';
			html += '<div class="he-set"><p class="he-kicker">Time to look first</p><div class="he-togs">' + [5, 10, 20].map(function (n) { return tog('data-look', n, n + ' s', SET.sight.look === n); }).join('') + '</div></div>';
		} else if (d === 'band') {
			html += '<div class="he-set"><p class="he-kicker">Level</p><div class="rd-levels">' + RD.BASS.map(function (L) { return tog('data-level', L.n, '<b>' + L.n + '</b><span>' + esc(L.name) + '</span>', SET.band.level === L.n); }).join('') + '</div></div>';
			html += '<div class="he-set"><p class="he-kicker">Time to look first</p><div class="he-togs">' + [5, 10, 20].map(function (n) { return tog('data-look', n, n + ' s', SET.band.look === n); }).join('') + '</div></div>';
		} else if (d === 'key') {
			html += '<div class="he-set"><p class="he-kicker">Keys up to</p><div class="he-togs">' + [2, 4, 7].map(function (n) { return tog('data-krange', n, n + ' sharps or flats', SET.key.range === n); }).join('') + '</div></div>';
			html += '<div class="he-set"><p class="he-kicker">Name the</p><div class="he-togs">' + [['major', 'Major'], ['minor', 'Minor'], ['both', 'Either']].map(function (m) { return tog('data-kmode', m[0], m[1], SET.key.mode === m[0]); }).join('') + '</div></div>';
			html += '<div class="he-set"><p class="he-kicker">Clef</p><div class="he-togs">' + tog('data-kclef', 'bass', 'Bass', SET.key.clef === 'bass') + tog('data-kclef', 'treble', 'Treble', SET.key.clef === 'treble') + '</div></div>';
			html += '<label class="he-switch"><input type="checkbox" data-opt="reverse"' + (SET.key.reverse ? ' checked' : '') + '><span>The other way: from the name to the signature</span></label>';
		} else if (d === 'int') {
			html += '<div class="he-set"><p class="he-kicker">Ask for</p><div class="he-togs">' + [['numbers', 'The number'], ['octave', 'Number and quality'], ['wide', 'Up to a tenth']].map(function (m) { return tog('data-iset', m[0], m[1], SET.int.set === m[0]); }).join('') + '</div></div>';
			html += '<label class="he-switch"><input type="checkbox" data-opt="harmonic"' + (SET.int.harmonic ? ' checked' : '') + '><span>Both notes at once (a double stop)</span></label>';
		} else if (d === 'chord') {
			html += '<div class="he-set"><p class="he-kicker">Chords</p><div class="he-togs">' + Object.keys(RD.CHORD_SETS).map(function (k) { return tog('data-cset', k, esc(RD.CHORD_SETS[k].name), SET.chord.set === k); }).join('') + '</div></div>';
			html += '<label class="he-switch"><input type="checkbox" data-opt="broken"' + (SET.chord.broken ? ' checked' : '') + '><span>As an arpeggio, one note at a time</span></label>';
		}
		$('mix-body').innerHTML = html;

		// the set up
		$('setup-sum').textContent = SET.strings + ' strings · to fret ' + SET.maxFret + ' · ' + (SET.voice === 'ubass' ? 'upright' : 'electric');
		$('setup-body').innerHTML =
			'<div class="he-set"><p class="he-kicker">Strings on your bass</p><div class="he-togs">' + [4, 5, 6].map(function (n) { return tog('data-strings', n, n, SET.strings === n); }).join('') + '</div></div>' +
			'<div class="he-set"><p class="he-kicker">Up to fret</p><div class="he-togs">' + [4, 7, 12, 15].map(function (n) { return tog('data-maxfret', n, n, SET.maxFret === n); }).join('') + '</div></div>' +
			'<div class="he-set"><p class="he-kicker">The bass you hear</p><div class="he-togs">' + tog('data-voice', 'ebass', 'Electric', SET.voice === 'ebass') + tog('data-voice', 'ubass', 'Upright', SET.voice === 'ubass') + '</div></div>' +
			'<div class="he-set"><p class="he-kicker">After a right answer</p><div class="he-togs">' + tog('data-after', 'next', 'Straight on', SET.after === 'next') + tog('data-after', 'wait', 'Show me where it lives', SET.after === 'wait') + '</div></div>' +
			'<div class="he-set"><p class="he-kicker">Line up your taps</p><p class="he-small">Phones and Bluetooth speakers sound a little late. Tap along to eight clicks and Read allows for it' + (SET.latency ? ' (now ' + SET.latency + ' ms)' : '') + '.</p><div class="he-togs"><button type="button" class="he-btn is-quiet" data-act="calibrate">Line them up</button>' + (SET.latency ? '<button type="button" class="he-btn is-quiet" data-act="uncalibrate">Reset</button>' : '') + '</div></div>';

		renderRecord();
	}
	function renderRecord() {
		var st = RD.stats(REC.log).items, list = Object.keys(st).map(function (k) { return st[k]; });
		var by = function (d) { return list.filter(function (r) { return r.drill === d; }); };
		var notesKnown = list.filter(function (r) { return /^(name|find|write|play)$/.test(r.drill) && r.recognised; }).length;
		var imm = list.filter(function (r) { return r.immediate; }).length;
		var rhythm = by('tap').filter(function (r) { return r.recognised; }).map(function (r) { return +r.item.slice(1); });
		var sight = by('sight').filter(function (r) { return r.recognised; }).map(function (r) { return +r.item.slice(1); });
		var withBand = by('band').filter(function (r) { return r.recognised; }).map(function (r) { return +r.item.slice(1); });
		var today = REC.log.filter(function (e) { return Date.now() - e.t < 864e5; }).length;
		var html = '<dl class="he-tiles"><div><dt>Answered</dt><dd>' + REC.log.length + '</dd></div><div><dt>Today</dt><dd>' + today + '</dd></div><div><dt>Recognised</dt><dd>' + notesKnown + '</dd></div><div><dt>Immediate</dt><dd>' + imm + '</dd></div></dl>' +
			'<p class="he-small">' + (REC.log.length ? 'Rhythm level reached: ' + (rhythm.length ? Math.max.apply(null, rhythm) : 'none yet') + ' · sight reading level: ' + (sight.length ? Math.max.apply(null, sight) : 'none yet') + ' · with the band: ' + (withBand.length ? Math.max.apply(null, withBand) : 'none yet') + '.' : 'Nothing here yet. Every answer is timed and kept, and a note is recognised once you have it right first time four times in five, on two different days. It is immediate when it is quick as well.') + '</p>';
		if (MEMBER) {
			html += '<p class="he-commit"><button type="button" class="he-btn is-quiet" data-act="diary"' + (SIT.count ? '' : ' disabled') + '>Add it to my practice diary</button></p><p class="he-small" id="rd-diary-note"></p>' +
				'<label class="he-switch"><input type="checkbox" id="rd-share"' + (REC.share ? ' checked' : '') + '><span>Share my record with Jack</span></label><p class="he-small">' + (REC.share ? 'Jack can see your Map and what you miss, so sessions can go straight to it.' : 'Your record is yours. Switch this on and Jack can see it too.') + '</p>';
		} else {
			html += '<p class="he-small">Kept in this browser. ' + (CFG.signin ? '<a href="' + esc(CFG.signin) + '">Sign in</a> as a member and it is kept with your account, on any device.' : '') + '</p>';
		}
		html += '<p><button type="button" class="he-tog is-link" data-act="clear">Clear my record</button></p>';
		$('rec-body').innerHTML = html;
	}

	/* ---------- taps and keys ---------- */

	app.addEventListener('click', function (e) {
		if (S.view !== 'dojo') { return; }
		// (the neck's places are SVG, not buttons: they must be found here too, or a tap on the neck does nothing)
		var b = e.target.closest('button, input, [data-fb]');
		if (!b || !$('view-dojo').contains(b)) { return; }
		var a = b.getAttribute('data-act');
		if (b.hasAttribute('data-name')) { var p = b.getAttribute('data-name').split(','); answerName(p[0], +p[1]); return; }
		if (b.hasAttribute('data-fb')) {
			var sf = b.getAttribute('data-fb').split(',');
			if (S.q && S.q.drill === 'find') { answerFind(+sf[0], +sf[1]); }
			else if (S.q && S.q.drill === 'play') { Sound.note(M.atFret(+sf[0], +sf[1], { strings: SET.strings })); playNote(M.midi(M.atFret(+sf[0], +sf[1], { strings: SET.strings })) - 12, 'fb'); }
			else { Sound.note(M.atFret(+sf[0], +sf[1], { strings: SET.strings })); }
			return;
		}
		if (b.hasAttribute('data-acc')) { S.placedAcc = +b.getAttribute('data-acc'); if (S.placed != null) { $('write').innerHTML = writeStave(S.q, boxWidth($('write'))); Sound.note(M.fromStep(S.placed, S.placedAcc)); } syncWrite(); return; }
		if (b.hasAttribute('data-keyname')) { var mk = RD.mark(S.q, b.getAttribute('data-keyname')); simpleAnswer(b, mk, function () { return '<b>' + esc(M.keyName(S.q.key, S.q.mode)) + '</b> · ' + (S.q.key ? M.keyList(S.q.key).join(' ') : 'no sharps or flats'); }); return; }
		if (b.hasAttribute('data-keysig')) { var ks = RD.mark(S.q, +b.getAttribute('data-keysig')); simpleAnswer(b, ks, function () { return '<b>' + (S.q.key ? Math.abs(S.q.key) + (S.q.key > 0 ? ' sharps' : ' flats') : 'No sharps or flats') + '</b>' + (S.q.key ? ': ' + M.keyList(S.q.key).join(' ') : ''); }); return; }
		if (b.hasAttribute('data-int')) {
			var v = b.getAttribute('data-int'), mi = RD.mark(S.q, S.q.numbersOnly ? +v : v);
			simpleAnswer(b, mi, function () { var iv = M.interval(S.q.lo, S.q.hi); return '<b>' + esc(iv.name) + '</b> (' + iv.semis + ' frets)' + intervalNeck(S.q); });
			if (mi.ok) { Sound.note(S.q.harmonic ? [S.q.lo, S.q.hi] : S.q.lo); if (!S.q.harmonic) { window.setTimeout(function () { Sound.note(S.q.hi); }, 450); } }
			return;
		}
		if (b.hasAttribute('data-root')) { S.said = extend(S.said || {}, { root: b.getAttribute('data-root') }); syncChord(); return; }
		if (b.hasAttribute('data-qual')) { S.said = extend(S.said || {}, { qual: b.getAttribute('data-qual') }); syncChord(); return; }
		if (b.hasAttribute('data-choice')) {
			var k = +b.getAttribute('data-choice'), mh = RD.mark(S.q, k);
			simpleAnswer(b, mh, function () { return '<b>' + 'ABC'.charAt(S.q.answer) + '</b>'; });
			return;
		}
		if (b.hasAttribute('data-cell')) {
			var cell = b.getAttribute('data-cell');
			if (S.phase === 'ask' && S.q.drill === 'rwrite' && RD.cellFits(S.q.level, cell, builtBeats())) { if (!S.built.length && S.tries === 0) { S.ms = 0; } S.built.push(cell); refreshRwrite(); }
			return;
		}
		if (b.hasAttribute('data-via')) { SET.playVia = b.getAttribute('data-via'); save(); if (SET.playVia === 'mic') { micOn(); } else { micOff(); } renderQuestion(); return; }
		if (b.hasAttribute('data-band')) { SS().band = b.getAttribute('data-band'); save(); renderQuestion(); return; }
		if (b.hasAttribute('data-map')) { SET.map = b.getAttribute('data-map'); save(); renderMap(); return; }
		if (b.hasAttribute('data-self')) {
			var how = b.getAttribute('data-self');
			S.firstSaid = how; S.ms = 0;
			finish(how === 'clean', { noAuto: true, via: 'self', item: S.q.item, k: S.q.level });
			result('<p class="he-verdict">' + (how === 'clean' ? 'Noted. Try a new piece, or this one faster.' : how === 'slips' ? 'Noted. Keeping going is the skill: well done.' : 'Noted. Try it again slower, or a level down.') + '</p><p class="he-commit"><button type="button" class="he-btn" data-act="new">New piece</button><button type="button" class="he-btn is-quiet" data-act="again">Again</button></p>');
			return;
		}
		// the side
		if (b.hasAttribute('data-set')) { SET.notes.set = b.getAttribute('data-set'); changed(); return; }
		if (b.hasAttribute('data-accs')) { SET.notes.accidentals = b.getAttribute('data-accs'); SET.notes.key = 0; changed(); return; }
		if (b.hasAttribute('data-key')) { SET.notes.key = +b.getAttribute('data-key'); SET.notes.accidentals = 'none'; changed(); return; }
		if (b.hasAttribute('data-len')) { SET.playLen = +b.getAttribute('data-len'); changed(); return; }
		if (b.hasAttribute('data-level')) { var lvl = +b.getAttribute('data-level'), dd = currentDrill(); if (dd === 'tap') { SET.tap.level = lvl; SET.tap.bpm = 0; } else if (dd === 'hear') { SET.hear.level = lvl; } else if (dd === 'rwrite') { SET.rwrite.level = lvl; } else { SS().level = lvl; SS().bpm = 0; } changed(); return; }
		if (b.hasAttribute('data-bars')) { SET.tap.bars = +b.getAttribute('data-bars'); changed(); return; }
		if (b.hasAttribute('data-look')) { SS().look = +b.getAttribute('data-look'); save(); renderSide(); renderQuestion(); return; }
		if (b.hasAttribute('data-krange')) { SET.key.range = +b.getAttribute('data-krange'); changed(); return; }
		if (b.hasAttribute('data-kmode')) { SET.key.mode = b.getAttribute('data-kmode'); changed(); return; }
		if (b.hasAttribute('data-kclef')) { SET.key.clef = b.getAttribute('data-kclef'); changed(); return; }
		if (b.hasAttribute('data-iset')) { SET.int.set = b.getAttribute('data-iset'); changed(); return; }
		if (b.hasAttribute('data-cset')) { SET.chord.set = b.getAttribute('data-cset'); changed(); return; }
		if (b.hasAttribute('data-strings')) { SET.strings = +b.getAttribute('data-strings'); changed(); return; }
		if (b.hasAttribute('data-maxfret')) { SET.maxFret = +b.getAttribute('data-maxfret'); changed(); return; }
		if (b.hasAttribute('data-voice')) { SET.voice = b.getAttribute('data-voice'); save(); renderSide(); return; }
		if (b.hasAttribute('data-after')) { SET.after = b.getAttribute('data-after'); save(); renderSide(); return; }
		if (b.type === 'checkbox' && b.hasAttribute('data-opt')) {
			var o = b.getAttribute('data-opt'), on = b.checked;
			if (o === 'every') { SET.every = on; changed(); }
			else if (o === 'counts') { SET.tap.counts = on; save(); renderQuestion(); }
			else if (o === 'first') { SET.tap.first = on; save(); }
			else if (o === 'mic') { SS().mic = on; save(); if (on) { micOn(); } else { micOff(); } renderQuestion(); }
			else if (o === 'tab') { SS().tab = on; save(); renderQuestion(); }
			else if (o === 'reverse') { SET.key.reverse = on; changed(); }
			else if (o === 'harmonic') { SET.int.harmonic = on; changed(); }
			else if (o === 'broken') { SET.chord.broken = on; changed(); }
			return;
		}
		if (b.id === 'rd-share') { REC.share = b.checked; if (MEMBER) { post({ share: REC.share }).catch(function () { /* tried */ }); } renderRecord(); return; }
		if (!a) { return; }
		if (a === 'show') { showMe(); }
		else if (a === 'next' || a === 'new') { if (S.plan && S.q && S.q.drill === 'play') { next(); } else { next(); } }
		else if (a === 'again') { renderQuestion(); S.phase = 'ask'; }
		else if (a === 'undo') { if (S.phase === 'ask' && S.built && S.built.length) { S.built.pop(); refreshRwrite(); } }
		else if (a === 'clearbar') { if (S.phase === 'ask') { S.built = []; refreshRwrite(); } }
		else if (a === 'check') { if (S.q.drill === 'rwrite') { rwriteCheck(); } else if (S.q.drill === 'write') { answerWrite(); } else if (S.q.drill === 'chord') { chordCheck(); } }
		else if (a === 'hear') { if (S.q.drill === 'write') { Sound.note(S.q.pitch); } else if (S.q.drill === 'int') { if (S.q.harmonic) { Sound.note([S.q.lo, S.q.hi]); } else { Sound.note(S.q.down ? S.q.hi : S.q.lo); window.setTimeout(function () { Sound.note(S.q.down ? S.q.lo : S.q.hi); }, 500); } } else if (S.q.drill === 'chord') { if (S.q.broken) { playMusic(S.q.notes, { time: '4/4', bpm: 90, click: false }); } else { Sound.note(S.q.tones, { inst: 'rhodes', len: 2 }); } } }
		else if (a === 'listen') { playMusic(S.q.notes, S.q.drill === 'band' ? extend(withWho(S.q, extend(SET.band, { band: 'bandbass' })), {}) : { time: S.q.time, bpm: S.q.drill === 'tap' ? tapBpm(S.q) : (SET.sight.bpm || S.q.bpm), click: true, bass: true }).catch(function () { $('status').textContent = 'Sound isn’t available in this browser.'; }); }
		else if (a === 'playq') { playQuestionBar(); }
		else if (a === 'sight') { sightGo(); }
		else if (a === 'mic') { if (MIC.state === 'on') { micOff(); refreshMic(); } else { micOn(); } }
		else if (a === 'weak') { var cells = RD.map(REC.log, { strings: SET.strings, maxFret: SET.maxFret, drills: SET.map === 'all' ? ['name', 'find', 'write', 'play'] : [SET.map] }); var weak = RD.weakest(cells.filter(function (c) { return c.level > 0; }), 6); var drill = SET.map === 'all' ? 'find' : SET.map; S.plan = { kind: 'today', parts: [{ drill: drill, count: 12, only: weak.map(function (c) { return c.names[0] || c.written; }), why: 'the slowest notes on your Map', done: 0 }], i: 0 }; S.strand = 'today'; renderPlan(); newQuestion(); }
		else if (a === 'sweep') { startSweep(); }
		else if (a === 'calibrate') { calibrate(); }
		else if (a === 'uncalibrate') { SET.latency = 0; save(); renderSide(); }
		else if (a === 'diary') { addToDiary(); }
		else if (a === 'clear') { if (window.confirm ? true : true) { clearRecord(b); } }
	});
	// the tap pad answers on the way down, not on release: that is when a note starts
	app.addEventListener('pointerdown', function (e) {
		var pad = e.target.closest('#rd-tap');
		if (pad && S.q && S.q.drill === 'tap') { e.preventDefault(); if (TAP && TAP.live) { tapAt(e.timeStamp); } else if (!TAP) { startTap(false); } }
	});
	app.addEventListener('pointerdown', function (e) { var st = e.target.closest('#rd-write'); if (st) { placeOnStave(e); } });
	document.addEventListener('keydown', function (e) {
		if (S.view !== 'dojo' || !S.q || e.target.closest('input, textarea, select')) { return; }
		if (S.q.drill === 'tap' && (e.code === 'Space' || e.key === ' ')) { e.preventDefault(); if (TAP && TAP.live) { tapAt(e.timeStamp); } else if (!TAP) { startTap(false); } return; }
		if (S.q.drill === 'name' && /^[a-gA-G]$/.test(e.key) && !e.metaKey && !e.ctrlKey) { answerName(e.key.toUpperCase(), e.shiftKey ? 1 : e.altKey ? -1 : 0); return; }
		if (e.code && /^Key[A-G]$/.test(e.code) && e.altKey && S.q.drill === 'name') { answerName(e.code.slice(3), -1); return; }
		if (e.key === 'Enter' && S.phase !== 'ask') { next(); }
		if (e.key === 'Enter' && S.q.drill === 'write' && S.placed != null) { answerWrite(); }
	});
	app.addEventListener('input', function (e) {
		if (e.target.id !== 'rd-bpm') { return; }
		var v = +e.target.value, k = e.target.getAttribute('data-bpm');
		if (k === 'tap') { SET.tap.bpm = v; } else { (SET[k] || SET.sight).bpm = v; }
		$('bpm-out').textContent = v; save();
	});

	function simpleAnswer(btn, m, reveal) {
		if (S.phase !== 'ask') { return; }
		firstAnswer(m.x);
		btn.classList.add(m.ok ? 'is-yes' : 'is-no');
		if (!m.ok) { wrongOnce(m.x); $('status').textContent = 'Not that one. Try again, or Show me.'; return; }
		var ms = S.ms;
		finish(true);
		result('<p class="he-verdict">' + reveal() + ' · ' + (S.tries ? 'got there' : secs(ms)) + '</p>' + (SET.after === 'next' && !S.tries ? '' : nextBtn()));
	}
	function syncChord() {
		[].forEach.call($('ask').querySelectorAll('[data-root]'), function (b) { b.setAttribute('aria-pressed', String(S.said && S.said.root === b.getAttribute('data-root'))); });
		[].forEach.call($('ask').querySelectorAll('[data-qual]'), function (b) { b.setAttribute('aria-pressed', String(S.said && S.said.qual === b.getAttribute('data-qual'))); });
		var c = $('commit').querySelector('[data-act="check"]'); if (c) { c.disabled = !(S.said && S.said.root && S.said.qual); }
		if (S.said && S.said.root && S.said.qual) { chordCheck(); }
	}
	function changed() { save(); S.plan = null; renderSide(); if (S.strand === 'map') { renderMap(); } else { newQuestion(); } }

	function calibrate() {
		if (!Sound.ok()) { return; }
		var taps = [], c = Sound.ctx();
		$('status').textContent = 'Tap the pad or the space bar on every click, eight times.';
		var notes = 'A2/q A2/q A2/q A2/q | A2/q A2/q A2/q A2/q';
		var start = null, handler = function (e) { if (e.type === 'keydown' && e.code !== 'Space') { return; } if (e.type === 'keydown') { e.preventDefault(); } taps.push(e.timeStamp || now()); };
		document.addEventListener('keydown', handler); app.addEventListener('pointerdown', handler);
		playMusic(notes, { time: '4/4', bpm: 90, click: true, bass: false, countIn: true, onEnd: function () {
			document.removeEventListener('keydown', handler); app.removeEventListener('pointerdown', handler);
			if (!start) { return; }
			var offs = [];
			taps.forEach(function (t) {
				var a = start.audio0 + (t - start.perf0) / 1000 - (c.outputLatency || c.baseLatency || 0) - start.startsAt;
				var beat = Math.round(a / start.beatSec);
				if (beat >= 0 && beat < 8) { offs.push(a - beat * start.beatSec); }
			});
			if (offs.length < 5) { $('status').textContent = 'Not enough taps to go on. Try again.'; return; }
			offs.sort(function (x, y) { return x - y; });
			SET.latency = Math.max(-150, Math.min(250, Math.round(offs[offs.length >> 1] * 1000)));
			save(); renderSide();
			$('status').textContent = 'Lined up: your taps are allowed ' + SET.latency + ' ms.';
		} }).then(function (res) { start = res; });
	}
	function addToDiary() {
		if (!MEMBER || !CFG.rest) { return; }
		var min = Math.max(1, Math.round(SIT.ms / 60000));
		var note = 'Read: ' + SIT.count + ' answers.';
		post({ diary: { id: SIT.diary, min: min, note: note } }).then(function (r) {
			SIT.diary = r.diary || SIT.diary;
			var n = $('diary-note'); if (n) { n.textContent = 'In your practice diary: ' + min + ' min.'; }
		}).catch(function () { var n = $('diary-note'); if (n) { n.textContent = 'That didn’t save. Try again when you’re online.'; } });
	}
	function clearRecord(btn) {
		if (btn.getAttribute('data-sure') !== '1') { btn.setAttribute('data-sure', '1'); btn.textContent = 'Press again to clear it for good'; return; }
		REC.log = []; REC.pending = [];
		keep(LOGSTORE, []); keep(LOGSTORE + '.pending', []);
		if (MEMBER) { post({ clear: true }).catch(function () { /* tried */ }); }
		renderSide();
		if (S.strand === 'map') { renderMap(); }
	}

	/* ---------- start ---------- */

	renderIndex();
	renderStrands();
	if (!window.location.hash) { go(S.strand === 'map' ? 'dojo/map' : 'dojo/' + S.strand, true); } else { route(); }
	if (!S.q && S.view === 'dojo' && S.strand !== 'map') { setStrand(S.strand, true); }
	renderSide();
	send();
	// "Read" in tests: the page says it is ready
	app.setAttribute('data-ready', '1');
})();
