/*
 * Leith Bass Space: Harmonic Elements trainer logic.
 *
 * Chooses what plays next, marks an answer, and reads a member's record.
 * No page or audio code: the same rules run in the browser and can be
 * checked on their own.
 *
 * HE.trainer.defaultMix(library)        the starting mix (Lean and Pull, four keys)
 * HE.trainer.cleanMix(mix, library)     a saved mix made safe against the current library
 * HE.trainer.pick(mix, library, log, last, random)   the next round
 * HE.trainer.drill(kind, mix, library, last, random)  the next round of a drill: 'pair' (two neighbours take
 *                                       turns: which comes first?) or 'change' (a loop, then the same loop with
 *                                       something done to it: what did it become?)
 * HE.trainer.mark(round, answer)        {verdict, home, note, element, heardAs}. An answer is {homePc, mode, elId}:
 *                                       a key (home, major or minor) and an element. See HE.keyHearings.
 * HE.trainer.entry(round, first, firstAnswer, tries, shown, now, showed)   a line for the record ("showed" is
 *                                       'key' or 'element' when one half was shown before the answer)
 * HE.trainer.stats(log)                 per-element record and the commonest mix-ups
 * HE.trainer.PRESETS                    ready-made mixes from the course
 *
 * A mix is {elements:[id], keys:[pc], tempos:[bpm], feels:[name], voicing:'triads'|'sevenths'|'both',
 *           sound:'both'|'recorded'|'synth', players:[id] | null, kits:[id] | null, playing:'feel'|'held',
 *           home:'hidden'|'cued'}.
 *           "keys" are where home can be: its note (each element says whether home is major or minor).
 *           "home" is 'cued' when the house band plays two bars of the home chord before each loop. "sound" says whether recordings,
 *           the house band (kept as 'synth' in saved mixes) or both can come up. "players" and "kits" are
 *           which of the house band's chord sounds and drum kits can (null is all of them, so new ones
 *           join in by themselves), and "playing" is whether its chords comp in the feel or are held.
 * A round is {el, keyPc, bpm, feel, voicing, chord, drum, bars, choices:[id], homeGiven, elementGiven},
 *           where chord and drum are the versions chosen from the library (a recorded file or the synth).
 * A drill's round also has {mode: 'pair' | 'change', other, parts: [round, round], widened}: "parts" are the
 *           two loops that take turns (each one a round the player can play), "el" is the one to be named
 *           (the first of a pair; what a transformation became) and "other" is its partner. The house band
 *           plays both, on the same sound and kit, so the harmony is the only thing that changes.
 */
(function (root) {
	'use strict';
	var HE = root.HE;

	function ids(test) { return HE.ELEMENTS.filter(test).map(function (el) { return el.id; }); }

	var PRESETS = [
		{ id: 'lean', name: 'Lean', elements: ids(function (el) { return el.stage === 2; }) },
		{ id: 'pull', name: 'Pull', elements: ids(function (el) { return el.stage === 3; }) },
		{ id: 'lean-pull', name: 'Lean and Pull', elements: ids(function (el) { return el.stage === 2 || el.stage === 3; }) },
		// The course's core route, less the blues form.
		{ id: 'core', name: 'Core route', elements: ['major-lean', 'dorian-lean', 'minor-lean', 'major-pull', 'modal-minor-pull', 'functional-minor-pull', 'cadential-cell', 'relative-shadow', 'pop-axis', 'minor-shift'] },
		{ id: 'more', name: 'More molecules', elements: ids(function (el) { return el.stage > 10; }) }
	];
	// The forms, while they are in the app, are a preset of their own and left out of Everything (one pass of a form is a long listen).
	if (HE.SHOW_FORMS) { PRESETS.push({ id: 'forms', name: 'Forms', elements: ids(function (el) { return el.kind === 'form'; }) }); }
	PRESETS.push({ id: 'all', name: 'Everything', elements: ids(function (el) { return el.kind !== 'form'; }) });

	function defaultMix(library) {
		// Start on the tone centres and the tempo that have recordings, if any do.
		var recorded = library.keys('recorded');
		var tempos = library.tempos('recorded').length ? library.tempos('recorded') : library.tempos();
		var mid = tempos[Math.floor(tempos.length / 2)];
		return {
			elements: PRESETS[2].elements.slice(), keys: recorded.length ? recorded : [0, 5, 10, 3],
			tempos: [mid], feels: library.feels(), voicing: 'triads', sound: 'both', players: null, kits: null, playing: 'feel', home: 'hidden'
		};
	}

	function cleanMix(mix, library) {
		var d = defaultMix(library);
		if (!mix || typeof mix !== 'object') { return d; }
		function keep(list, ok, fallback) {
			var out = Array.isArray(list) ? list.filter(ok) : [];
			return out.length ? out : fallback;
		}
		var tempos = library.tempos(), feels = library.feels();
		// a saved choice of players or kits, less any the house band no longer has; all of them if that leaves none
		function band(list, which) {
			if (!Array.isArray(list) || !HE.synth) { return null; }
			var have = HE.synth[which].map(function (x) { return x.id; });
			var out = list.filter(function (id) { return have.indexOf(id) !== -1; });
			return out.length && out.length < have.length ? out : null;
		}
		return {
			elements: keep(mix.elements, function (id) { return HE.isActive(id); }, d.elements),
			keys: keep(mix.keys, function (pc) { return !!HE.keyByPc(pc); }, d.keys),
			tempos: keep(mix.tempos, function (t) { return tempos.indexOf(t) !== -1; }, d.tempos),
			feels: keep(mix.feels, function (f) { return feels.indexOf(f) !== -1; }, d.feels),
			voicing: ['triads', 'sevenths', 'both'].indexOf(mix.voicing) !== -1 ? mix.voicing : 'triads',
			sound: ['both', 'recorded', 'synth'].indexOf(mix.sound) !== -1 ? mix.sound : 'both',
			players: band(mix.players, 'SOUNDS'), kits: band(mix.kits, 'KITS'),
			playing: mix.playing === 'held' ? 'held' : 'feel',
			home: mix.home === 'cued' ? 'cued' : 'hidden'
		};
	}

	function weighted(items, weight, random) {
		var total = 0, i;
		var w = items.map(function (it) { var x = weight(it); total += x; return x; });
		var r = random() * total;
		for (i = 0; i < items.length; i++) { r -= w[i]; if (r < 0) { return items[i]; } }
		return items[items.length - 1];
	}

	function any(items, random) { return items[Math.floor(random() * items.length)]; }

	// One of several versions, and not the one just heard if there is another.
	function version(list, lastOne, random) {
		var fresh = list.filter(function (v) { return v !== lastOne; });
		return any(fresh.length ? fresh : list, random);
	}

	// The drum versions a mix can use at a tempo. The mix's choice of sound narrows
	// the feels to those that have it; if none of them has, any version will do.
	function drumsFor(mix, library, bpm) {
		function gather(sound) {
			var out = [];
			mix.feels.forEach(function (feel) {
				var list = library.drumVersions(feel, bpm, sound);
				if (list.length) { out.push({ feel: feel, versions: list }); }
			});
			return out;
		}
		var strict = gather(mix.sound);
		return strict.length ? strict : gather('both');
	}

	function pick(mix, library, log, last, random) {
		random = random || Math.random;
		var record = stats(log || []).elements;

		// Every chord loop the mix allows and the library holds. Naming a loop asks where home is, so an
		// element whose home never sounds (ii V held open, say) is left to the Guide and the drills,
		// unless the mix has nothing else.
		var options = [], drums = {};
		var named = mix.elements.filter(function (id) { return !HE.byId(id).homeAbsent; });
		if (!named.length) { named = mix.elements.slice(); }
		named.forEach(function (id) {
			var el = HE.byId(id);
			var voicings = mix.voicing === 'both' ? ['triads', 'sevenths'] : [mix.voicing];
			mix.keys.forEach(function (pc) {
				mix.tempos.forEach(function (bpm) {
					if (!drums[bpm]) { drums[bpm] = drumsFor(mix, library, bpm); }
					if (!drums[bpm].length) { return; }
					var seen = {};
					voicings.forEach(function (v) {
						var actual = HE.voicingFor(el, v);
						if (seen[actual]) { return; }
						seen[actual] = true;
						var versions = library.chordVersions(id, pc, bpm, actual, mix.sound);
						if (versions.length) { options.push({ el: el, keyPc: pc, bpm: bpm, voicing: actual, versions: versions }); }
					});
				});
			});
		});
		if (!options.length) { return null; }

		// Choose the element first, so one with many loops isn't heard more often.
		// Elements that have been missed lately, or never heard, come round sooner.
		var elIds = [];
		options.forEach(function (o) { if (elIds.indexOf(o.el.id) === -1) { elIds.push(o.el.id); } });
		var elId = weighted(elIds, function (id) {
			var r = record[id];
			var w = r ? 1 + r.last.filter(function (ok) { return !ok; }).length : 2;
			return last && last.el.id === id && elIds.length > 1 ? w * 0.25 : w;
		}, random);

		var mine = options.filter(function (o) { return o.el.id === elId; });
		var fresh = mine.filter(function (o) { return !(last && last.el.id === elId && last.keyPc === o.keyPc); });
		var chosen = any(fresh.length ? fresh : mine, random);

		// Then a version of that loop, a feel, and a version of that feel.
		var chord = version(chosen.versions, last && last.chord, random);
		var beat = any(drums[chosen.bpm], random);
		var drum = version(beat.versions, last && last.drum, random);

		return {
			el: chosen.el, keyPc: chosen.keyPc, bpm: chosen.bpm, feel: beat.feel,
			// a recording brings its own voicing; the mix's choice is for the synth
			voicing: chord.source === 'file' ? HE.voicingFor(chosen.el, chord.voicing) : chosen.voicing,
			chord: chord, drum: drum,
			bars: chord.bars || HE.bars(chosen.el, chosen.voicing),
			choices: named,
			homeGiven: mix.keys.length === 1,
			elementGiven: mix.elements.length === 1
		};
	}

	/* ---------- drills: two loops that take turns ---------- */

	// One of a drill's two loops, as a round the player can play. "el" may be something the catalogue
	// only knows as what a transformation was made from: it has chords, and that is all this needs.
	function part(el, keyPc, bpm, feel, voicing) {
		var actual = HE.voicingFor(el, voicing);
		return {
			el: el, keyPc: keyPc, bpm: bpm, feel: feel, voicing: actual,
			chord: { kind: 'chords', source: 'synth', el: el.id, keyPc: keyPc, bpm: bpm, voicing: actual, bars: HE.bars(el, actual), label: 'house band', path: '' },
			drum: HE.library.houseDrums(feel, bpm),
			bars: HE.bars(el, actual)
		};
	}

	function drill(kind, mix, library, last, random) {
		random = random || Math.random;
		var mine = kind === 'pair' ? HE.pairsFor(mix.elements) : HE.changesFor(mix.elements);
		// nothing of the kind among the mix's elements: use them all, and say so
		var widened = !mine.length;
		// (drawn from all of them, a pair of whole forms is left out: twelve bars each is a long way round for a first go)
		var list = !widened ? mine : kind === 'change' ? HE.CHANGES : HE.PAIRS.filter(function (p) { return HE.byId(p[0]).kind !== 'form' && HE.byId(p[1]).kind !== 'form'; });
		var was = last && last.mode === kind ? last.drillKey : '';
		function keyOf(x) { return kind === 'pair' ? x[0] + '/' + x[1] : x.after.id; }
		var fresh = list.filter(function (x) { return keyOf(x) !== was; });
		var chosen = any(fresh.length ? fresh : list, random);

		// the house band plays drills, so the tempo and the feel have to be ones it has
		var feels = mix.feels.filter(function (f) { return HE.synth && HE.synth.FEELS.indexOf(f) !== -1; });
		if (!feels.length) { feels = HE.synth ? HE.synth.FEELS.slice() : mix.feels.slice(); }
		var tempos = mix.tempos.filter(function (t) { return feels.some(function (f) { return library.drumVersions(f, t, 'synth').length > 0; }); });
		if (!tempos.length) { tempos = library.tempos('synth'); }
		if (!tempos.length) { return null; }
		var bpm = any(tempos, random), feel = any(feels, random), keyPc = any(mix.keys, random);
		var voicing = mix.voicing === 'both' ? any(['triads', 'sevenths'], random) : mix.voicing;

		var a, b, el, other, choices;
		if (kind === 'pair') {
			var flip = random() < 0.5;
			a = HE.byId(chosen[flip ? 1 : 0]); b = HE.byId(chosen[flip ? 0 : 1]);
			el = a; other = b; choices = [chosen[0], chosen[1]];
		} else {
			a = chosen.before; b = chosen.after;
			el = b; other = a;
			choices = (widened ? HE.CHANGES : mine).map(function (c) { return c.after.id; });
		}
		// both in the same voicing: the expanded one only if each of them has one
		if (voicing === 'sevenths' && !(a.sev && b.sev)) { voicing = 'triads'; }
		var parts = [part(a, keyPc, bpm, feel, voicing), part(b, keyPc, bpm, feel, voicing)];
		return {
			mode: kind, el: el, other: other, keyPc: keyPc, bpm: bpm, feel: feel, voicing: parts[kind === 'pair' ? 0 : 1].voicing,
			chord: parts[0].chord, drum: parts[0].drum, bars: parts[0].bars,
			parts: parts, choices: choices, homeGiven: true, elementGiven: false,
			widened: widened, drillKey: keyOf(chosen)
		};
	}

	// An answer is right if it names this loop in a key it can be heard in: the course's own, or another
	// hearing of the same chords ("whose home is it?", HE.keyHearings). The element can be named as any
	// element that is this sound. "home" is the whole key; "note" is home's note alone, major or minor aside.
	function mark(round, answer) {
		if (round.mode) {
			// a drill asks one thing: which element (home is given)
			var hit = answer.elId === round.el.id;
			return { verdict: hit ? 'right' : 'not-yet', home: true, note: true, element: hit, heardAs: null };
		}
		var heard = HE.keyHearings(round.el, round.voicing);
		var pcOf = function (h) { return (round.keyPc + h.offset) % 12; };
		var match = heard.filter(function (h) { return pcOf(h) === answer.homePc && h.mode === answer.mode; })[0] || null;
		var note = heard.some(function (h) { return pcOf(h) === answer.homePc; });
		var element = HE.sameSound(round.el, round.voicing).indexOf(answer.elId) !== -1;
		var right = !!match && element;
		var own = right && match.own && answer.elId === round.el.id;
		return {
			verdict: right ? (own ? 'right' : 'hearing') : 'not-yet',
			home: !!match, note: note, element: element,
			heardAs: right && !own ? { hearing: match, tonicPc: pcOf(match), elId: answer.elId } : null
		};
	}

	function day(t) {
		var d = new Date(t);
		return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
	}

	// One line of the record. "ok" is the first answer only: getting there on
	// the third try, or being shown, is useful practice but isn't recognition yet.
	function entry(round, first, firstAnswer, tries, shown, now, showed) {
		var e = {
			t: now || Date.now(), el: round.el.id, key: round.keyPc, bpm: round.bpm, feel: round.feel, voicing: round.voicing,
			sound: round.chord ? round.chord.source : 'synth',
			// (with one half shown, the other half is still worth knowing about, but it isn't recognition)
			ok: !!first && first.verdict !== 'not-yet' && !showed,
			home: !!first && first.home, element: !!first && first.element,
			saidEl: firstAnswer ? firstAnswer.elId : null, saidHome: firstAnswer ? firstAnswer.homePc : null,
			tries: tries, shown: !!shown
		};
		// a drill's line says which drill it was, and what the element was heard against
		if (round.mode) { e.mode = round.mode; e.other = round.other.id; }
		else {
			// the key (1.9.0): whether the course's home is major or minor, what was said, and what was shown
			e.keyMode = round.el.mode;
			e.saidMode = firstAnswer && firstAnswer.mode ? firstAnswer.mode : null;
			if (showed) { e.showed = showed; }
		}
		return e;
	}

	// The course's local checkpoint: four right from five fresh examples, on two different days.
	// Only naming a loop cold counts towards that. The drills are practice for it, and are counted on their own.
	function stats(log) {
		var elements = {}, pairs = {}, drills = { pair: { n: 0, ok: 0 }, change: { n: 0, ok: 0 } };
		// rounds where one half was shown first: how often the other half was right first time
		var halves = { key: { n: 0, ok: 0 }, element: { n: 0, ok: 0 } };
		log.forEach(function (e) {
			if (!HE.byId(e.el)) { return; }
			if (e.mode) {
				if (drills[e.mode]) { drills[e.mode].n++; if (e.ok) { drills[e.mode].ok++; } }
				return;
			}
			if (e.showed && halves[e.showed]) {
				halves[e.showed].n++;
				if (e.showed === 'key' ? e.element : e.home) { halves[e.showed].ok++; }
			}
			var r = elements[e.el] || (elements[e.el] = { id: e.el, attempts: 0, right: 0, last: [], days: [] });
			r.attempts++;
			if (e.ok) { r.right++; }
			r.last.push(e.ok);
			r.days.push(day(e.t));
			if (!e.element && e.saidEl && e.saidEl !== e.el && HE.byId(e.saidEl)) {
				var k = e.el + '>' + e.saidEl;
				pairs[k] = (pairs[k] || 0) + 1;
			}
		});
		Object.keys(elements).forEach(function (id) {
			var r = elements[id];
			var days = r.days.slice(-5), last = r.last.slice(-5), okDays = {};
			last.forEach(function (ok, i) { if (ok) { okDays[days[i]] = true; } });
			r.last = last;
			r.recognised = last.length === 5 && last.filter(Boolean).length >= 4 && Object.keys(okDays).length >= 2;
			delete r.days;
		});
		var mixups = Object.keys(pairs).map(function (k) {
			var p = k.split('>');
			return { was: p[0], said: p[1], times: pairs[k] };
		}).sort(function (a, b) { return b.times - a.times; });
		return { elements: elements, mixups: mixups, drills: drills, halves: halves };
	}

	// How many files a mix asks for, so the recording job can be sized.
	function size(mix) {
		var chords = 0;
		mix.elements.forEach(function (id) {
			var el = HE.byId(id);
			var voicings = mix.voicing === 'both' && el.sev ? 2 : 1;
			chords += voicings * mix.keys.length * mix.tempos.length;
		});
		return { chords: chords, drums: mix.feels.length * mix.tempos.length };
	}

	HE.trainer = { PRESETS: PRESETS, defaultMix: defaultMix, cleanMix: cleanMix, pick: pick, drill: drill, mark: mark, entry: entry, stats: stats, size: size };
}(typeof window !== 'undefined' ? window : globalThis));
