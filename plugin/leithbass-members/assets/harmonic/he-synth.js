/*
 * Leith Bass Space: Harmonic Elements, the loops the app plays itself.
 *
 * Any element, on any tone centre, at any tempo, in any feel: a chord loop
 * from the band (he-band.js) and a drum loop from the drummers (he-kit.js),
 * so nothing is ever missing. Recorded loops from Nextcloud sit alongside
 * these as further versions of the same thing; they are never replaced.
 *
 * Each loop is drawn once into a buffer, exactly a whole number of bars long,
 * and handed to the player (he-audio.js) like a recorded file. Drawing one
 * takes a fraction of a second and nothing is drawn until a loop is asked
 * for, so the page itself is no slower for any of this. The recorded
 * instruments are fetched the first time a loop needs them (each is one
 * small file the browser then keeps). If one can't be fetched, the loop is
 * played on an instrument that needs no download, so there is always sound.
 *
 * A round says what it wants in its two versions:
 *   round.chord   {source: 'synth', sound: 'grand', playing: 'feel' | 'held', take: 0}
 *   round.drum    {source: 'synth', kit: 'studio', groove: 0}
 * Anything left out is filled in sensibly for the feel.
 *
 * HE.synth.chords(round, context) / drums(round, context)   a promise of {buffer, lead, length, gain}
 * HE.synth.FEELS      the feels it can play, by name
 * HE.synth.SOUNDS     the chord sounds: [{id, name, group, packs}]
 * HE.synth.KITS       the drum kits: [{id, name, packs}]
 * HE.synth.GROOVES    how many grooves each feel has (three)
 * HE.synth.kitsFor(feel)      kit ids that suit a feel, best first
 * HE.synth.needs(packs)       true if any of these packs has still to be fetched
 * HE.synth.soundFor(feel)      the chord sound that suits a feel, when nobody has chosen
 * HE.synth.pick(o)            a sound, a kit and a groove chosen at random: see below
 * HE.synth.who(round)         {chords, drums}: the names of what plays a round ('' for a half that is a recording)
 * HE.synth.score(spec, context)   a promise of {buffer, lead, length, gain, bars, stoodIn}: a loop written out
 *                             note by note (HE.band.score says what a spec holds), kept with the other loops
 * HE.synth.note(inst, midi, context, o)   a promise of {buffer, gain, lead, stoodIn}: one note to play once
 *                             (HE.audio.shot plays it). o: {len, vel, spread, muted, room}
 * In both, an instrument whose recording can't be fetched is played by its stand in, and "stoodIn" names it.
 */
(function (root) {
	'use strict';
	var HE = root.HE, SND = HE.sounds, KIT = HE.kit, BAND = HE.band;
	var OAC = root.OfflineAudioContext || root.webkitOfflineAudioContext;

	/* ---------- the loops already drawn ---------- */

	// Kept by how much memory they take, not how many there are: a long loop is several megabytes.
	// (enough for what is playing, what is next and a few to go back to; less on a device short of memory)
	var cache = {}, order = [], held = 0, BUDGET = root.navigator && root.navigator.deviceMemory && root.navigator.deviceMemory <= 2 ? 20e6 : 36e6;
	function forget(key) {
		var i = order.indexOf(key);
		if (i !== -1) { order.splice(i, 1); }
		if (cache[key]) { held -= cache[key].size; delete cache[key]; }
	}
	function once(key, make) {
		if (cache[key]) { order.splice(order.indexOf(key), 1); order.push(key); return cache[key].made; }
		var entry = { made: make(), size: 0 };
		cache[key] = entry; order.push(key);
		entry.made.then(function (part) {
			if (cache[key] !== entry) { return; }
			entry.size = part.buffer.length * part.buffer.numberOfChannels * 4;
			held += entry.size;
			// the two newest are the ones playing: they always stay
			while (held > BUDGET && order.length > 2) { forget(order[0]); }
		}, function () { if (cache[key] === entry) { forget(key); } });
		return entry.made;
	}

	// What to multiply a loop by so that it sits level with a recorded one (the same sum he-audio.js does).
	var LEVEL = { chords: 0.09, drums: 0.06 };
	function levelled(part, kind) {
		var buffer = part.buffer, sum = 0, peak = 0, n = 0;
		for (var ch = 0; ch < buffer.numberOfChannels; ch++) {
			var d = buffer.getChannelData(ch), i, x;
			for (i = 0; i < d.length; i++) { x = d[i]; if (x > peak) { peak = x; } else if (-x > peak) { peak = -x; } }
			for (i = 0; i < d.length; i += 3) { x = d[i]; sum += x * x; n++; }
		}
		var rms = Math.sqrt(sum / Math.max(1, n));
		var gain = rms < 1e-5 ? 1 : Math.min(LEVEL[kind] / rms, 0.95 / peak, 6);
		return { buffer: buffer, lead: 0, length: part.length, gain: gain, bars: part.bars, took: part.took };
	}

	function loadAll(names, c) {
		return Promise.all(names.map(function (name) { return SND.load(name, c); })).then(function (list) {
			var packs = {};
			list.forEach(function (p) { packs[p.name] = p; });
			return packs;
		});
	}

	/* ---------- chords ---------- */

	var PLAIN_SOUND = 'rhodes'; // needs no download: what plays if a pack can't be fetched

	function chords(round, c) {
		var rate = c.sampleRate, v = round.chord || {};
		var sound = soundOf(round);
		var strict = !!(round.drum && round.drum.source === 'file');
		var spec = {
			seq: HE.sequence(round.el, round.keyPc, round.voicing), bpm: round.bpm, feel: round.feel,
			sound: sound.id, playing: v.playing === 'held' ? 'held' : 'feel', strict: strict, take: v.take || 0
		};
		var key = ['c', round.el.id, round.keyPc, round.bpm, round.voicing, spec.feel, spec.sound, spec.playing, strict ? 1 : 0, spec.take, rate].join('|');
		return once(key, function () {
			return loadAll(sound.packs, c).then(function (packs) {
				return BAND.draw(spec, packs, rate);
			}, function () {
				// the instrument couldn't be fetched: play it on one that needs nothing
				spec.sound = PLAIN_SOUND;
				return BAND.draw(spec, {}, rate);
			}).then(function (part) { return levelled(part, 'chords'); });
		});
	}

	/* ---------- written out scores, and single notes ---------- */

	// A copy of a score with any instrument whose recording could not be fetched swapped for its
	// stand in (which needs no download), and the names of the ones that were swapped.
	function playable(spec, packs) {
		var out = {}, swapped = [], k;
		for (k in spec) { if (Object.prototype.hasOwnProperty.call(spec, k)) { out[k] = spec[k]; } }
		out.parts = (spec.parts || []).map(function (p) {
			var what = BAND.INSTRUMENTS[p.inst];
			if (!what || !what.pack || packs[what.pack]) { return p; }
			var copy = {}, j;
			for (j in p) { if (Object.prototype.hasOwnProperty.call(p, j)) { copy[j] = p[j]; } }
			copy.inst = BAND.STAND_IN[p.inst] || PLAIN_SOUND;
			if (swapped.indexOf(p.inst) === -1) { swapped.push(p.inst); }
			return copy;
		});
		return { spec: out, swapped: swapped };
	}
	// Whichever of these packs can be fetched: a missing one is simply left out.
	function loadAny(names, c) {
		return Promise.all(names.map(function (name) {
			return SND.load(name, c).then(function (p) { return p; }, function () { return null; });
		})).then(function (list) {
			var packs = {};
			list.forEach(function (p) { if (p) { packs[p.name] = p; } });
			return packs;
		});
	}

	// A loop written out note by note (HE.band.score says what a spec holds), kept with the other loops.
	function score(spec, c) {
		var rate = c.sampleRate;
		return once('s|' + rate + '|' + JSON.stringify(spec), function () {
			return loadAny(BAND.packsFor(spec), c).then(function (packs) {
				var can = playable(spec, packs);
				return BAND.score(can.spec, packs, rate).then(function (part) {
					return { buffer: part.buffer, lead: 0, length: part.length, gain: part.gain, bars: part.bars, took: part.took, stoodIn: can.swapped };
				});
			});
		});
	}

	// Single notes, for sounding one the moment it is tapped. They are kept apart from the loops, in a
	// small store of their own, so that tapping all over a fretboard can't push out the loop that is playing.
	var notes = {}, noteOrder = [], noteHeld = 0, NOTE_BUDGET = BUDGET / 3;
	function note(inst, midi, c, o) {
		o = o || {};
		var rate = c.sampleRate;
		var key = [inst, typeof midi === 'number' ? midi : (midi || []).join('.'), o.len === undefined ? '' : o.len, o.vel === undefined ? '' : o.vel, o.muted ? 1 : 0, o.spread || 0, o.room === undefined ? '' : o.room, rate].join('|');
		if (notes[key]) { noteOrder.splice(noteOrder.indexOf(key), 1); noteOrder.push(key); return notes[key].made; }
		function drop(k) {
			var i = noteOrder.indexOf(k);
			if (i !== -1) { noteOrder.splice(i, 1); }
			if (notes[k]) { noteHeld -= notes[k].size; delete notes[k]; }
		}
		var entry = { size: 0, made: loadAny(BAND.packsFor({ parts: [{ inst: inst }] }), c).then(function (packs) {
			var can = playable({ parts: [{ inst: inst }] }, packs);
			return BAND.note(can.spec.parts[0].inst, midi, o, packs, rate).then(function (part) {
				return { buffer: part.buffer, gain: part.gain, lead: 0, stoodIn: can.swapped };
			});
		}) };
		notes[key] = entry; noteOrder.push(key);
		entry.made.then(function (part) {
			if (notes[key] !== entry) { return; }
			entry.size = part.buffer.length * part.buffer.numberOfChannels * 4;
			noteHeld += entry.size;
			while (noteHeld > NOTE_BUDGET && noteOrder.length > 1) { drop(noteOrder[0]); }
		}, function () { if (notes[key] === entry) { drop(key); } });
		return entry.made;
	}

	/* ---------- drums ---------- */

	var PLAIN_KIT = '909';

	function usable(kitId) {
		var kit = KIT.kit(kitId);
		return !!kit && kit.packs.every(function (p) { return SND.loaded(p); });
	}
	// The kit a feel gets when nobody has chosen: the first that suits it and is ready, or failing that the first.
	function kitFor(feel) {
		var list = KIT.kitsFor(feel);
		return list[0];
	}

	function drums(round, c) {
		var rate = c.sampleRate, v = round.drum || {};
		var on = kitOf(round), feel = on.feel, kit = on.kit;
		var spec = { feel: feel, kit: kit, groove: v.groove || 0, bpm: round.bpm };
		var key = ['d', feel, kit, spec.groove, round.bpm, rate].join('|');
		return once(key, function () {
			return loadAll(KIT.kit(kit).packs, c).then(function (packs) {
				return KIT.draw(spec, packs, rate);
			}, function () {
				spec.kit = PLAIN_KIT;
				return KIT.draw(spec, {}, rate);
			}).then(function (part) { return levelled(part, 'drums'); });
		});
	}

	/* ---------- choosing, for the Dojo ---------- */

	function needs(packs) { return (packs || []).some(function (p) { return !SND.loaded(p); }); }

	/*
	 * pick({feel, sounds, kits, random, last, light})
	 *   sounds, kits   the ids allowed (leave out for all of them)
	 *   last           {sound, kit}: what the loop before used, so the next is different if it can be
	 *   light          true for a loop that is got ready before anyone has asked for it (the first one):
	 *                  it keeps to sounds that are one instrument, so there is less to fetch
	 * Returns {sound, kit, groove, take}. When the visitor has asked to save data,
	 * it keeps to what needs no download or has been fetched already.
	 */
	function pick(o) {
		var random = o.random || Math.random, lean = SND.lean(), last = o.last || {};
		function any(list) { return list[Math.floor(random() * list.length)]; }
		function fresh(list, was) { var f = list.filter(function (x) { return x !== was; }); return f.length ? f : list; }

		var sounds = BAND.SOUNDS.map(function (s) { return s.id; }).filter(function (id) { return !o.sounds || o.sounds.indexOf(id) !== -1; });
		if (!sounds.length) { sounds = [PLAIN_SOUND]; }
		if (lean) {
			var light = sounds.filter(function (id) { return !needs(BAND.sound(id).packs); });
			if (light.length) { sounds = light; }
		} else if (o.light) {
			var single = sounds.filter(function (id) { return BAND.sound(id).packs.length <= 1; });
			if (single.length) { sounds = single; }
		}
		var suited = KIT.kitsFor(o.feel);
		var kits = suited.filter(function (id) { return !o.kits || o.kits.indexOf(id) !== -1 || id === 'hand'; });
		if (!kits.length) { kits = suited; }
		if (lean) {
			var lightKits = kits.filter(function (id) { return !needs(KIT.kit(id).packs); });
			kits = lightKits.length ? lightKits : suited.filter(function (id) { return KIT.kit(id).drawn; });
			if (!kits.length) { kits = [PLAIN_KIT]; }
		}
		// the kits are listed best first, and the first few suit the feel best: lean towards those
		var weighted = [];
		kits.forEach(function (id, i) { for (var n = 0; n < Math.max(1, 4 - i); n++) { weighted.push(id); } });
		var feel = KIT.feel(o.feel);
		return {
			sound: any(fresh(sounds, last.sound)),
			kit: any(fresh(weighted, last.kit)),
			groove: Math.floor(random() * (feel ? feel.grooves.length : 1)),
			take: Math.floor(random() * 2)
		};
	}

	// The chord sound each feel gets when nobody has chosen one (the Guide's "suits the feel").
	var SUITS = {
		'Rock 8ths': 'guitar', 'Pop 16ths': 'grand', 'Funky 16ths': 'rhodes', 'Hip hop': 'rhodes-pad',
		'Soul': 'soul-band', 'Shuffle': 'upright', 'Half-time': 'piano-strings', 'Reggae': 'guitar-organ',
		'Swing': 'grand', 'Bossa': 'nylon', 'Neo soul': 'rhodes', 'Four on the floor': 'horns-rhodes',
		'Percussion': 'vibes'
	};
	function soundFor(feel) { return BAND.sound(SUITS[feel]) ? SUITS[feel] : PLAIN_SOUND; }

	// The sound and the kit a round will really be played on.
	function soundOf(round) {
		var v = round.chord || {};
		return BAND.sound(v.sound) || BAND.sound(PLAIN_SOUND);
	}
	function kitOf(round) {
		var v = round.drum || {};
		var feel = KIT.feel(round.feel) ? round.feel : KIT.FEELS[0].name;
		var kit = KIT.kit(v.kit) ? v.kit : kitFor(feel);
		// the Percussion feel is hand percussion whichever kit was asked for, unless it is a drum machine
		if (feel === 'Percussion' && !KIT.kit(kit).drawn) { kit = 'hand'; }
		return { feel: feel, kit: kit };
	}

	// Who is playing a round, by name.
	function who(round) {
		var out = { chords: '', drums: '' };
		if (round && round.chord && round.chord.source === 'synth') { out.chords = soundOf(round).name; }
		if (round && round.drum && round.drum.source === 'synth') { out.drums = KIT.kit(kitOf(round).kit).name; }
		return out;
	}

	HE.synth = {
		supported: !!OAC,
		FEELS: KIT.FEELS.map(function (f) { return f.name; }),
		SOUNDS: BAND.SOUNDS.map(function (s) { return { id: s.id, name: s.name, group: s.group, packs: s.packs.slice() }; }),
		KITS: KIT.KITS.filter(function (k) { return !k.hidden; }).map(function (k) { return { id: k.id, name: k.name, packs: k.packs.slice() }; }),
		GROOVES: 3,
		sound: function (id) { return BAND.sound(id); },
		kit: function (id) { return KIT.kit(id); },
		// (the hand percussion that plays the Percussion feel isn't a kit to choose: any recorded kit stands for it)
		kitsFor: function (feel) {
			var out = [];
			KIT.kitsFor(feel).forEach(function (id) { var use = KIT.kit(id).hidden ? 'studio' : id; if (out.indexOf(use) === -1) { out.push(use); } });
			return out;
		},
		needs: needs,
		usable: usable,
		soundFor: soundFor,
		pick: pick,
		who: who,
		chords: chords,
		drums: drums,
		score: score,
		note: note
	};
}(typeof window !== 'undefined' ? window : globalThis));
