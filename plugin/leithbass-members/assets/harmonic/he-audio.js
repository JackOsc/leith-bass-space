/*
 * Leith Bass Space: Harmonic Elements loop player.
 *
 * Plays a round's loops together (chords, drums and any other parts, such
 * as a bass line), on the audio clock, until stopped. Every loop is cut to a
 * whole number of bars at the same tempo, so the player loops each on the bar
 * grid (not on the file's own length) and they stay locked however long they
 * run. No page timers are involved once a loop starts.
 *
 * The player doesn't care where the audio comes from. A "source" hands it
 * decoded buffers for a round. Any of the three may be missing (that part is
 * then silent):
 *
 *   source.chords(round, context) -> Promise<AudioBuffer | {buffer, lead, length, gain}>
 *   source.drums(round, context)  -> Promise<AudioBuffer | {buffer, lead, length, gain}>
 *   source.more(round, context)   -> Promise<[{name, buffer, lead, length, gain}]>   other parts, each with a name
 *
 * "lead" is how many seconds into the buffer the loop starts, "length" how
 * long the loop really is, and "gain" what to multiply it by so that every
 * loop sits at about the same level. HE.synth is the house band (he-synth.js): the app's own instruments.
 * HE.audio.fileSource(...) fetches and decodes recorded loops.
 * HE.audio.either(file, synth) sends each half of a round to whichever
 * source its chosen version came from, so a recorded chord loop can play
 * over the house band's drums and the other way round.
 *
 * HE.audio.unlock()                 call inside a tap, before anything else (phones need it)
 * HE.audio.play(round, source, o)   start a round; o.countIn adds a bar of sticks. Returns a promise
 *                                   of {bars, barDur, chords, drums, more, startsAt}, or of null if it was overtaken.
 *                                   With o.at === 'loop' and a loop sounding, the new round comes in exactly
 *                                   where the sounding loop next comes round, and the old one stops there:
 *                                   the music never breaks. If it isn't drawn in time it takes the join after.
 * HE.audio.shot(part, name, when)   play something once (a single note) through the fader of the part named,
 *                                   now or at a time on the audio clock. Gives {startsAt, stop()}.
 * HE.audio.now()                    the audio clock, or 0 before the first tap
 * HE.audio.ready(round, source)     get a round's loops fetched and drawn ahead of time, so it starts at once.
 *                                   Before the first tap only the house band's half is, as nothing can be decoded
 *                                   for certain until the browser says what sample rate it plays at: see "expect".
 * HE.audio.expect                   the sample rate to draw at before the first tap (the page remembers the last one)
 * HE.audio.rate                     the sample rate once there is a context, or 0
 * HE.audio.started                  true once there has been a first tap
 * HE.audio.stop()                   fade out and stop
 * HE.audio.level(name, 0..1)        'chords' | 'drums' | the name of any other part (a new one starts at 0.8)
 * HE.audio.position()               null, or {counting, bar, beat, loops, round} for the playhead (beat is 0 to 3;
 *                                   "round" is the round that is sounding, which changes at a join)
 * HE.audio.playing                  true while a loop is sounding (or counting in)
 *
 * RECORDED FILES AND CLEAN LOOPS. An MP3 is always a little longer than the
 * audio that went into it: the encoder pads the front and the back. Logic
 * writes the true figures into the file (the "iTunSMPB" tag). Safari reads
 * the tag and hands back exactly the loop; Chrome and Firefox hand back the
 * padding too, which would put a 50 ms hiccup into every pass. So the player
 * reads the tag itself, compares it with what the browser decoded, and loops
 * exactly the real audio either way. A WAV, or an MP3 without the tag, is
 * taken as it comes.
 */
(function (root) {
	'use strict';
	var HE = root.HE;
	var AC = root.AudioContext || root.webkitAudioContext;

	var ctx = null, master = null, gains = {};
	var levels = { chords: 0.8, drums: 0.7 };
	// A "play" is one round as it sounds: {round, sources, trims, levels, start, barDur, bars, period, counted}.
	// "trims" are its own gain nodes, one for each part: a play is faded out by those and by nothing else,
	// so fading one round never touches another.
	var live = null;    // the round that is sounding (or being counted in)
	var next = null;    // a round booked to take over where the sounding loop next comes round
	var shots = [];     // single notes still ringing
	var ticket = 0;     // guards against a slow load finishing after a newer play() or a stop()
	var FADE = 0.005;   // how long one round takes to hand over to the next at a join, in seconds

	// A fader for each named part. One that has never been heard of starts at 0.8.
	function fader(name) {
		if (!gains[name]) {
			if (levels[name] === undefined) { levels[name] = 0.8; }
			gains[name] = ctx.createGain();
			gains[name].gain.value = levels[name];
			gains[name].connect(master);
		}
		return gains[name];
	}

	function context() {
		if (!ctx) {
			if (!AC) { throw new Error('no-audio'); }
			ctx = new AC();
			master = ctx.createGain();
			// Two full-level loops added together can overshoot. A limiter on the way out catches the peaks.
			var limit = ctx.createDynamicsCompressor();
			limit.threshold.value = -6; limit.knee.value = 6; limit.ratio.value = 12; limit.attack.value = 0.003; limit.release.value = 0.15;
			master.connect(limit);
			limit.connect(ctx.destination);
			['chords', 'drums'].forEach(fader);
		}
		return ctx;
	}

	function unlock() {
		// On an iPhone the silent switch mutes a web page's sound unless the page says it is playing
		// music, the way a music app does. Safari has had a way to say so since 16.4.
		try { if (root.navigator && root.navigator.audioSession) { root.navigator.audioSession.type = 'playback'; } } catch (e) { /* fine without */ }
		var c = context();
		if (c.state === 'suspended' && c.resume) { c.resume(); }
		return c;
	}

	// Fade one play out over a twenty-fifth of a second and stop it.
	function quiet(p, t) {
		p.trims.forEach(function (g) {
			var v = g.gain.value;
			g.gain.cancelScheduledValues(t);
			g.gain.setValueAtTime(v, t);
			g.gain.linearRampToValueAtTime(0, t + 0.04);
		});
		p.sources.forEach(function (s) { try { s.stop(t + 0.05); } catch (e) { /* already stopped */ } });
	}

	function halt() {
		if (!live && !next) { return; }
		var t = ctx.currentTime;
		if (live) { quiet(live, t); }
		if (next) { quiet(next, t); }
		live = null; next = null;
	}

	// Once a join has happened the round that was waiting is the one that is sounding, and the old one can go.
	function settle() {
		if (!ctx || !next || ctx.currentTime < next.start) { return; }
		var old = live;
		live = next; next = null;
		// (it has been silent since the join: its own gains took it down to nothing)
		if (old) { old.sources.forEach(function (s) { try { s.stop(); } catch (e) { /* already stopped */ } }); }
	}

	// Take back a join that has been booked but has not happened: the round that was waiting never
	// sounds, and the round that is sounding carries on round as if nothing had been asked.
	function unbook() {
		var t = ctx.currentTime, was = next;
		next = null;
		was.sources.forEach(function (s) { try { s.stop(t); } catch (e) { /* already stopped */ } });
		if (live) {
			live.trims.forEach(function (g, i) {
				g.gain.cancelScheduledValues(t);
				g.gain.setValueAtTime(live.levels[i], t);
			});
		}
	}

	function stick(p, t, accent) {
		var o = ctx.createOscillator(), g = ctx.createGain();
		o.type = 'triangle';
		o.frequency.setValueAtTime(accent ? 1900 : 1500, t);
		g.gain.setValueAtTime(0.0001, t);
		g.gain.linearRampToValueAtTime(0.5 * levels.drums + 0.1, t + 0.002);
		g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
		o.connect(g); g.connect(p.count);
		o.start(t); o.stop(t + 0.08);
		p.sources.push(o);
	}

	// One part of a play, going round. "join" brings it in under the last moments of the round before:
	// it starts a few thousandths of a second early, on the tail end of its own loop, and is faded up,
	// so that its first beat falls exactly on the join and is there in full.
	// Gives back how long one pass really takes, in seconds.
	function looped(p, part, name, start, loopLen, join) {
		var s = ctx.createBufferSource(), trim = ctx.createGain();
		var lead = Math.max(0, Math.min(part.lead || 0, part.buffer.duration - 0.05));
		var level = part.gain || 1;
		s.buffer = part.buffer;
		s.loop = true;
		s.loopStart = lead;
		// Loop on the bar grid. A file a few samples long or short can't pull the two loops apart.
		s.loopEnd = Math.min(lead + loopLen, part.buffer.duration);
		s.connect(trim); trim.connect(fader(name));
		if (join) {
			var early = Math.min(FADE, s.loopEnd - s.loopStart);
			trim.gain.value = 0;
			trim.gain.setValueAtTime(0, start - early);
			trim.gain.linearRampToValueAtTime(level, start);
			s.start(start - early, s.loopEnd - early);
		} else {
			trim.gain.value = level;
			s.start(start, lead);
		}
		p.sources.push(s); p.trims.push(trim); p.levels.push(level);
		return s.loopEnd - s.loopStart;
	}

	function unpack(got) {
		if (!got) { return null; }
		return got.buffer ? got : got.getChannelData ? { buffer: got, lead: 0, length: 0, gain: 1 } : null;
	}

	// Everything a source has for a round: its chords, its drums and whatever else it plays. A part
	// the source hasn't got (no such function, or it gives nothing) is simply silent.
	function gather(round, source, c) {
		function ask(name) {
			return new Promise(function (resolve) { resolve(typeof source[name] === 'function' ? source[name](round, c) : null); });
		}
		return Promise.all([ask('chords'), ask('drums'), ask('more')]).then(function (got) {
			var more = [];
			(got[2] || []).forEach(function (x) { if (x && x.buffer && x.name) { more.push(x); } });
			return { chords: unpack(got[0]), drums: unpack(got[1]), more: more };
		});
	}

	function play(round, source, opts) {
		var c = unlock();
		var mine = ++ticket;
		settle();
		var joining = !!(opts && opts.at === 'loop' && (live || next));
		if (!joining) { halt(); }
		// a round still waiting for its join is replaced by this one (unless its join is upon us: then this one follows it)
		else if (next && c.currentTime < next.start - FADE - 0.003) { unbook(); }
		return gather(round, source, c).then(function (got) {
			return mine === ticket ? book(round, got, c, opts, mine) : null;
		});
	}

	function book(round, got, c, opts, mine) {
		settle();
		var joining = !!(opts && opts.at === 'loop');
		if (joining && next) {
			// a join is a few thousandths of a second away and can't be taken back: come back when it has happened
			return new Promise(function (resolve) { root.setTimeout(resolve, 25); }).then(function () {
				return mine === ticket ? book(round, got, c, opts, mine) : null;
			});
		}
		var chords = got.chords, drums = got.drums;
		var barDur = 240 / round.bpm; // 4/4
		// The audio says how many bars a loop is. A recording's true length comes with it;
		// otherwise the round's own count, or failing that the buffer's length.
		function count(part, known) {
			if (part.length) { return Math.max(1, Math.round(part.length / barDur)); }
			return known || Math.max(1, Math.round((part.buffer.duration - part.lead) / barDur));
		}
		var parts = [];
		if (chords) { parts.push({ name: 'chords', part: chords, bars: count(chords, round.bars) }); }
		if (drums) { parts.push({ name: 'drums', part: drums, bars: count(drums, round.drum && round.drum.bars) }); }
		got.more.forEach(function (x) { parts.push({ name: x.name, part: x, bars: count(x) }); });
		if (!parts.length) { throw new Error('nothing-to-play'); }

		var p = { round: round, sources: [], trims: [], levels: [], barDur: barDur, counted: false };
		var joinAt = 0;
		if (joining && live) {
			// where the sounding loop next comes round, far enough off for the hand-over to fit in before it
			var passes = Math.max(1, Math.ceil((c.currentTime + 0.08 - live.start) / live.period - 1e-9));
			joinAt = live.start + passes * live.period;
		}
		var t = joinAt || c.currentTime + 0.08;
		var start = t;
		if (!joinAt && opts && opts.countIn) {
			// (the sticks have a gain of their own, so that stopping part-way through the count is clean as well)
			p.count = c.createGain();
			p.count.connect(master);
			p.trims.push(p.count); p.levels.push(1);
			for (var i = 0; i < 4; i++) { stick(p, t + i * barDur / 4, i === 0); }
			start = t + barDur;
			p.counted = true;
		}
		// The loop the display follows, and the one a later round joins on: the chords, or without any the longest part.
		var lead = parts[0];
		parts.forEach(function (x) {
			x.period = looped(p, x.part, x.name, start, x.bars * barDur, !!joinAt);
			if (!chords && x.bars > lead.bars) { lead = x; }
		});
		p.start = start; p.bars = lead.bars; p.period = lead.period;
		if (joinAt) {
			// everything of the old round fades over the last few thousandths of a second before the join
			live.trims.forEach(function (g, n) {
				g.gain.setValueAtTime(live.levels[n], joinAt - FADE);
				g.gain.linearRampToValueAtTime(0, joinAt);
			});
			next = p;
			root.setTimeout(settle, Math.max(0, (joinAt - c.currentTime) * 1000) + 40);
		} else { live = p; }
		// The parts go back too, so the page can listen to a recording (he-listen.js).
		return { bars: p.bars, barDur: barDur, chords: chords, drums: drums, more: got.more, startsAt: start };
	}

	function stop() {
		ticket++;
		if (!ctx) { return; }
		halt();
		// and any single notes still ringing
		var t = ctx.currentTime;
		shots.slice().forEach(function (one) { hush(one, t); });
	}

	function hush(one, t) {
		var v = one.gain.gain.value;
		one.gain.gain.cancelScheduledValues(t);
		one.gain.gain.setValueAtTime(v, t);
		one.gain.gain.linearRampToValueAtTime(0, t + 0.04);
		try { one.source.stop(t + 0.05); } catch (e) { /* already stopped */ }
	}

	// Play something once (a single note, say: HE.synth.note makes them), through the fader of the part
	// named, now or at a time on the audio clock. It isn't a loop, so it doesn't count as "playing";
	// stop() silences it all the same. Gives back {startsAt, stop()}, so one note can be cut short by the next.
	function shot(part, name, when) {
		var c = unlock();
		part = unpack(part);
		if (!part) { return null; }
		var s = c.createBufferSource(), g = c.createGain();
		var t = when && when > c.currentTime ? when : 0;
		s.buffer = part.buffer;
		g.gain.value = part.gain || 1;
		s.connect(g); g.connect(fader(name || 'chords'));
		s.start(t, Math.max(0, Math.min(part.lead || 0, part.buffer.duration)));
		var one = { source: s, gain: g };
		shots.push(one);
		s.onended = function () {
			var i = shots.indexOf(one);
			if (i !== -1) { shots.splice(i, 1); }
			try { g.disconnect(); } catch (e) { /* gone already */ }
		};
		return { startsAt: t || c.currentTime, stop: function () { if (shots.indexOf(one) !== -1) { hush(one, ctx.currentTime); } } };
	}

	// A browser makes no audio context until the first tap, so until then it doesn't say what sample
	// rate it will play at. Nearly always that is 48000 (and the page remembers what it was last time),
	// so the house band's half of the first loop is drawn at that rate ahead of the tap, with this
	// standing in for the context. If the guess turns out wrong the loop is simply drawn again.
	var OAC = root.OfflineAudioContext || root.webkitOfflineAudioContext;
	var early = null;
	function standIn() {
		var rate = +HE.audio.expect || 48000;
		if (early && early.sampleRate === rate) { return early; }
		if (!OAC) { return null; }
		try {
			var oc = new OAC(1, 1, rate);
			early = { sampleRate: rate, decodeAudioData: function (data, ok, bad) { return oc.decodeAudioData(data, ok, bad); } };
		} catch (e) { early = null; }
		return early;
	}

	// Fetch and draw a round's loops before they are asked for. Nothing is said if it fails: play() will try again.
	function ready(round, source) {
		if (!round) { return; }
		var c = ctx || standIn();
		if (!c) { return; }
		function quietly(make) {
			try { var got = make(); if (got && got.catch) { got.catch(function () { /* later */ }); } } catch (e) { /* later */ }
		}
		[['chords', round.chord], ['drums', round.drum]].forEach(function (half) {
			if (typeof source[half[0]] !== 'function') { return; }
			// (a recording waits for the first tap: it is big, and it has to be decoded at the real rate)
			if (!ctx && !(half[1] && half[1].source === 'synth')) { return; }
			quietly(function () { return source[half[0]](round, c); });
		});
		// (the extra parts are lines the house band draws, so they can be got ready ahead of the first tap too)
		if (typeof source.more === 'function') { quietly(function () { return source.more(round, c); }); }
	}

	function level(name, value) {
		levels[name] = Math.max(0, Math.min(1, value));
		if (gains[name]) { gains[name].gain.setTargetAtTime(levels[name], ctx.currentTime, 0.02); }
	}

	function position() {
		settle();
		if (!live) { return null; }
		var t = ctx.currentTime - live.start, beatDur = live.barDur / 4;
		if (t < 0) {
			// the bar of sticks, if there is one, is the bar before the loop starts
			return { counting: true, bar: -1, beat: live.counted ? Math.max(0, Math.min(3, Math.floor((t + live.barDur) / beatDur))) : 0, loops: 0, round: live.round };
		}
		var bar = Math.floor(t / live.barDur);
		return { counting: false, bar: bar % live.bars, beat: Math.min(3, Math.floor((t - bar * live.barDur) / beatDur)), loops: Math.floor(bar / live.bars), round: live.round };
	}

	/* ---------- recorded loops ---------- */

	// The true length of an MP3, where its maker wrote one in: samples of padding
	// at the front and back, and samples of real audio between them.
	function gaplessTag(data) {
		var bytes = new Uint8Array(data, 0, Math.min(data.byteLength, 16384)), text = '';
		for (var i = 0; i < bytes.length; i++) { text += String.fromCharCode(bytes[i]); }
		var m = /iTunSMPB[\s\S]{0,12}?\s([0-9A-Fa-f]{8})\s([0-9A-Fa-f]{8})\s([0-9A-Fa-f]{8})\s([0-9A-Fa-f]{16})/.exec(text);
		return m ? { front: parseInt(m[2], 16), back: parseInt(m[3], 16), length: parseInt(m[4], 16) } : null;
	}

	var RATES = [48000, 44100, 96000, 88200, 32000, 24000, 22050, 16000];
	var DECODER_DELAY = 529; // samples every MP3 decoder adds ahead of the encoder's own padding

	// Where the real audio sits in what the browser decoded: {lead, length} in seconds.
	function window_(buffer, tag) {
		if (!tag || !tag.length) { return { lead: 0, length: 0 }; }
		for (var i = 0; i < RATES.length; i++) {
			var rate = RATES[i];
			var extra = buffer.duration * rate - tag.length; // samples beyond the real audio
			if (extra < -96 || extra > tag.front + tag.back + 96) { continue; } // not this sample rate
			// Nothing extra: the browser trimmed it. Otherwise whatever it left on is at the front
			// first (decoder delay, then encoder padding) and the rest is at the back.
			var lead = extra < 96 ? 0 : Math.max(0, Math.min(tag.front + DECODER_DELAY, DECODER_DELAY - tag.back + extra));
			return { lead: lead / rate, length: tag.length / rate };
		}
		return { lead: 0, length: 0 };
	}

	// What to multiply a loop by so that it sits level with the rest.
	var LEVEL = { chords: 0.09, drums: 0.06 };
	function levelFor(buffer, lead, length, kind) {
		var from = Math.floor(lead * buffer.sampleRate), to = length ? Math.min(buffer.length, from + Math.floor(length * buffer.sampleRate)) : buffer.length;
		var sum = 0, peak = 0, n = 0;
		for (var ch = 0; ch < buffer.numberOfChannels; ch++) {
			var d = buffer.getChannelData(ch);
			for (var i = from; i < to; i += 3) { var x = d[i]; sum += x * x; if (x > peak) { peak = x; } else if (-x > peak) { peak = -x; } n++; }
		}
		var rms = Math.sqrt(sum / Math.max(1, n));
		if (rms < 1e-5) { return 1; }
		return Math.min(LEVEL[kind] / rms, 0.95 / peak, 3);
	}

	// Recorded loops, fetched and decoded once each. A decoded loop is big (eight bars is about
	// eight megabytes), and the browser keeps the file itself, so only the few most recent are
	// held decoded: enough for what is playing and what is next, not enough to trouble a phone.
	//   urlFor(kind, round)  the address of the 'chords' or 'drums' file for a round
	//   o.keep               megabytes of decoded loops to hold on to (default 48)
	function fileSource(urlFor, o) {
		o = o || {};
		var cache = {}, order = [], held = 0, budget = (o.keep || 48) * 1e6;
		function drop(url) {
			var i = order.indexOf(url);
			if (i !== -1) { order.splice(i, 1); }
			if (cache[url]) { held -= cache[url].size; delete cache[url]; }
		}
		function load(kind, round, c) {
			var url = urlFor(kind, round);
			if (!url) { return Promise.reject(new Error('missing-loop')); }
			if (cache[url]) { order.splice(order.indexOf(url), 1); order.push(url); return cache[url].got; }
			var entry = { size: 0, got: fetch(url, { credentials: 'same-origin' }).then(function (res) {
				if (!res.ok) { throw new Error('missing-loop'); }
				return res.arrayBuffer();
			}).then(function (data) {
				var tag = gaplessTag(data); // read before decoding: decoding can empty the data
				return new Promise(function (resolve, reject) { c.decodeAudioData(data, resolve, reject); }).then(function (buffer) {
					var w = window_(buffer, tag);
					return { buffer: buffer, lead: w.lead, length: w.length, gain: levelFor(buffer, w.lead, w.length, kind) };
				});
			}) };
			cache[url] = entry; order.push(url);
			entry.got.then(function (part) {
				if (cache[url] !== entry) { return; }
				entry.size = part.buffer.length * part.buffer.numberOfChannels * 4;
				held += entry.size;
				// the two newest are the ones playing: they always stay
				while (held > budget && order.length > 2) { drop(order[0]); }
			}, function () { if (cache[url] === entry) { drop(url); } });
			return entry.got;
		}
		return {
			chords: function (round, c) { return load('chords', round, c); },
			drums: function (round, c) { return load('drums', round, c); }
		};
	}

	// Each half of a round goes to the source its version came from.
	function either(file, synth) {
		function from(version) { return version && version.source === 'file' ? file : synth; }
		return {
			chords: function (round, c) { return from(round.chord).chords(round, c); },
			drums: function (round, c) { return from(round.drum).drums(round, c); }
		};
	}

	HE.audio = {
		supported: !!AC, unlock: unlock, play: play, ready: ready, stop: stop, level: level, position: position, fileSource: fileSource, either: either,
		shot: shot,
		now: function () { return ctx ? ctx.currentTime : 0; },
		expect: 0,
		get rate() { return ctx ? ctx.sampleRate : 0; },
		get started() { return !!ctx; },
		get playing() { settle(); return !!live; }
	};
}(typeof window !== 'undefined' ? window : globalThis));
