/*
 * Leith Bass Space: Harmonic Elements loop library.
 *
 * How the trainer finds its audio. The loops live in Nextcloud, in the folder
 * named in Members, Portal settings (by default "Harmonic Elements" beside
 * the Members folder):
 *
 *   Harmonic Elements/
 *     Chords/90bpm/C/Lean/minor i7 - Major IV7.mp3
 *     Chords/90bpm/C/Lean/Major I - Major IV.mp3
 *     Chords/90bpm/C/Lean/Major I - Major IV (v.2).mp3
 *     Chords/90bpm/C/Home/Sus 2.mp3
 *     Drums/90bpm/Neo soul (1).mp3
 *     Drums/90bpm/Neo soul (2).mp3
 *
 * A tempo folder and (for chords) a tone centre folder say what is inside
 * them, so the file only needs the element's or the feel's name. Tempo and
 * tone centre can also be written in the file name ("Dorian lean - C - 95bpm.wav"),
 * and a name always wins over its folders. Any other folders are ignored.
 *
 * VERSIONS. Any number of files can be the same thing: the same element on
 * the same tone centre at the same tempo, or the same feel at the same tempo.
 * Each is a version, and the trainer picks one at random each time. A number
 * or any other words after the name tell versions apart ("Dorian lean 2",
 * "Dorian lean - Rhodes"). The house band (the app's own instruments, see
 * he-synth.js) is one more version: which instrument and which kit it plays
 * on is chosen when the loop is, so it is listed here once, not once a sound.
 *
 * NAMING A CHORD LOOP. Either way works:
 *   by the element's course name          "Dorian lean", "Sus 2", "Major home"
 *   by its chords, as roman numerals      "minor i7 - Major IV7", "ii-V-I", "I - bVII (Mixo)"
 * In the second form a numeral's capitals say major or minor, and the words
 * "Major" and "Minor" in front of a numeral overrule them. Use the words where
 * two names would otherwise differ only by capitals ("I - IV" and "i - iv"),
 * because a Mac cannot keep both of those in one folder. Words in brackets
 * are a nickname ("(Phrygian)") or a version ("(v.2)").
 *
 * HE.library.chordPath(o) / drumPath(o)   the path a loop should have
 * HE.library.parse(path)                  read a path back, or say what's wrong with it
 * HE.library.build(o)                     a library from recorded files and/or the house band
 * HE.library.houseChords(...) / houseDrums(...)   the house band's version of a loop, at any tempo
 * HE.library.FEELS                        the feels the trainer knows by name
 *
 * A library answers: tempos(), feels(), keys(sound), chordVersions(...), drumVersions(...).
 * "sound" is 'both' | 'recorded' | 'synth' ('synth' is the house band: the word is kept
 * because it is in members' saved mixes and records).
 */
(function (root) {
	'use strict';
	var HE = root.HE;

	var KEY_PC = { 'c': 0, 'c#': 1, 'db': 1, 'd': 2, 'd#': 3, 'eb': 3, 'e': 4, 'f': 5, 'f#': 6, 'gb': 6, 'g': 7, 'g#': 8, 'ab': 8, 'a': 9, 'a#': 10, 'bb': 10, 'b': 11, 'cb': 11 };

	// The feels, with other names a drum file may use for them.
	var FEELS = [
		['Rock 8ths', ['rock', 'straight 8ths', 'rock straight 8ths']],
		['Pop 16ths', ['pop', 'pop 16th hats', 'pop 16s']],
		['Funky 16ths', ['funk', 'funky', 'funk 16ths', 'funky 16s', 'funk 16s', 'funk straight 16ths']],
		['Hip hop', ['hiphop', 'boom bap']],
		['Soul', ['motown', 'motown and soul']],
		['Shuffle', ['blues shuffle']],
		['Half-time', ['halftime', 'half time feel']],
		['Reggae', ['one drop', 'reggae one drop']],
		['Swing', ['jazz', 'jazz swing', 'swing ride']],
		['Bossa', ['bossa nova']],
		['Neo soul', ['neosoul']],
		['Four on the floor', ['4 on the floor', 'four to the floor', 'disco', 'house']],
		['Percussion', ['perc', 'hand percussion', 'congas']]
	];

	function norm(text) {
		return String(text).toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim();
	}

	var FEEL_BY = {};
	FEELS.forEach(function (f) {
		FEEL_BY[norm(f[0])] = f[0];
		f[1].forEach(function (a) { FEEL_BY[norm(a)] = f[0]; });
	});

	// (every element the app knows by name, including any that are out of it for now: a recording of one is
	// still recognised, and simply not used)
	var EL_BY = {};
	(HE.ALL || HE.ELEMENTS).forEach(function (el) {
		[el.file].concat(el.aliases).forEach(function (name) {
			var k = norm(name);
			if (EL_BY[k] && EL_BY[k] !== el) { throw new Error('Two elements answer to "' + name + '"'); }
			EL_BY[k] = el;
		});
	});

	function chordPath(o) {
		var el = typeof o.el === 'string' ? HE.byId(o.el) : o.el;
		var voicing = HE.voicingFor(el, o.voicing);
		return 'Chords/' + o.bpm + 'bpm/' + HE.keyByPc(o.keyPc).file + '/' + el.file + (voicing === 'sevenths' ? ' - sevenths' : '') + '.wav';
	}

	function drumPath(o) {
		return 'Drums/' + o.bpm + 'bpm/' + o.feel + '.wav';
	}

	function keyOf(text) {
		var k = String(text).trim().toLowerCase().replace('♭', 'b').replace('♯', '#');
		return Object.prototype.hasOwnProperty.call(KEY_PC, k) ? KEY_PC[k] : null;
	}

	// Whatever the file name leaves out, the folders above it can supply:
	// a folder called "95bpm" (or just "95") is a tempo, one called "Bb" is a tone centre.
	function fromFolders(folders, out, wantKey) {
		folders.forEach(function (name) {
			var m = /^(\d{2,3})\s*(?:bpm)?$/i.exec(name.trim());
			if (m) { if (!out.bpm) { out.bpm = +m[1]; } return; }
			if (wantKey && out.keyPc === null) { out.keyPc = keyOf(name); }
		});
	}

	/* ---------- chords written as roman numerals ---------- */

	var NUMERAL = { i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7' };
	var CHORD = /^(major|maj|minor|min)?\s*([b♭#♯]?)(vii|vi|iv|v|iii|ii|i)(ø7|ø|°7|°|dim7|dim|maj7|m7|7alt|alt|7|9|\+|aug|sus2|sus4|6)?$/i;
	// qualities that count as the same kind of chord when a name is looser than the catalogue ("V7" for V)
	var FAMILY = { 'M': 'M', '7': 'M', 'M7': 'M', '9': 'M', 'alt': 'M', '6': 'M', 'aug': 'M', 'm': 'm', 'm7': 'm', 'h7': 'd', 'dim': 'd', 'sus2': 's', 'sus4': 's' };

	// "Minor VI" -> {deg: '6', qual: 'm'}; "bVII" -> {deg: 'b7', qual: 'M'}; "minorI7" -> {deg: '1', qual: 'm7'}
	function chordToken(text) {
		var m = CHORD.exec(String(text).trim());
		if (!m) { return null; }
		var word = (m[1] || '').toLowerCase(), numeral = m[3], suffix = (m[4] || '').toLowerCase();
		var minor = word ? word.charAt(1) === 'i' : numeral === numeral.toLowerCase();
		var qual;
		if (suffix.charAt(0) === 'ø') { qual = 'h7'; }
		else if (suffix.charAt(0) === '°' || suffix.indexOf('dim') === 0) { qual = 'dim'; }
		else if (suffix === '+' || suffix === 'aug') { qual = 'aug'; }
		else if (suffix === 'sus2' || suffix === 'sus4' || suffix === '6') { qual = suffix; }
		else if (suffix === 'maj7') { qual = 'M7'; }
		else if (suffix === 'm7') { qual = 'm7'; }
		else if (suffix === 'alt' || suffix === '7alt') { qual = 'alt'; }
		else if (suffix === '9') { qual = minor ? 'm7' : '9'; }
		else if (suffix === '7') { qual = minor ? 'm7' : '7'; }
		else { qual = minor ? 'm' : 'M'; }
		return { deg: (m[2] ? (/[b♭]/.test(m[2]) ? 'b' : '#') : '') + NUMERAL[numeral.toLowerCase()], qual: qual };
	}

	// The element whose chords these are. Degrees must match exactly; qualities are scored,
	// so "I7 - IV7" finds the blues lean and "I - IV" the major lean.
	function byChords(named) {
		var best = null;
		(HE.ALL || HE.ELEMENTS).forEach(function (el) {
			(el.sev ? ['triads', 'sevenths'] : ['triads']).forEach(function (voicing) {
				var list = HE.chords(el, voicing);
				if (list.length !== named.length) { return; }
				var score = 0, wrong = 0;
				for (var i = 0; i < list.length; i++) {
					if (list[i].deg !== named[i].deg) { return; }
					if (list[i].qual === named[i].qual) { score += 3; }
					else if (FAMILY[list[i].qual] === FAMILY[named[i].qual]) { score += 2; }
					else { wrong++; }
				}
				if (!best || wrong < best.wrong || (wrong === best.wrong && score > best.score)) { best = { el: el, voicing: voicing, score: score, wrong: wrong }; }
			});
		});
		return best;
	}

	function backs(nicknames, el) {
		var hay = ' ' + [el.name].concat(el.aliases).map(norm).join(' ') + ' ';
		return nicknames.some(function (n) {
			var words = norm(n).split(' ').filter(Boolean);
			return words.length > 0 && words.every(function (w) { return hay.indexOf(' ' + w) !== -1; });
		});
	}

	// "Neo soul 2", "Neo soul v2", "Neo soul (2)", "Neo soul take 2": the name, and what tells this version apart.
	function named(text, table) {
		var whole = table[norm(text)];
		if (whole) { return { item: whole, label: '' }; }
		var m = /^(.*?)[\s_.-]*(?:v|ver|version|take|alt)?[\s_.-]*\(?(\d{1,2})\)?$/i.exec(String(text).trim());
		if (m && table[norm(m[1])]) { return { item: table[norm(m[1])], label: m[2] }; }
		return null;
	}

	function parse(path) {
		var segs = String(path).split('/').filter(Boolean);
		var file = segs[segs.length - 1] || '';
		var folders = segs.slice(0, -1);
		var kind = folders.some(function (s) { return /^drums?$/i.test(s.trim()); }) ? 'drums' : 'chords';
		var out = { path: path, kind: kind, bpm: 0, bars: 0, label: '' };
		var extra = [], nicknames = [], i, f, m, hit;
		// brackets hold a version ("(v.2)", "(2)") or a nickname ("(Dark Shadow)")
		var base = file.replace(/\.[a-z0-9]{2,4}$/i, '').replace(/\(([^)]*)\)/g, function (whole, inside) {
			var v = /^(?:v|ver|version|take)?[\s.]*(\d{1,2})$/i.exec(inside.trim());
			if (v) { extra.push(v[1]); } else if (inside.trim()) { nicknames.push(inside.trim()); }
			return ' ';
		}).replace(/\s+/g, ' ').trim();
		var fields = base.split(/\s+-\s+|_+/).map(function (f) { return f.trim(); }).filter(Boolean);

		function common(field) {
			if ((m = /^(\d+(?:\.\d+)?)\s*bpm$/i.exec(field))) { out.bpm = +m[1]; return true; }
			if ((m = /^(\d+)\s*bars?$/i.exec(field))) { out.bars = +m[1]; return true; }
			return false;
		}

		if (kind === 'drums') {
			out.meter = '4/4';
			hit = named(fields[0] || '', FEEL_BY);
			// A feel the trainer has no name for is still a feel: it is offered under the name on the file.
			out.feel = hit ? hit.item : (fields[0] || '').replace(/[\s_.-]*\(?\d{1,2}\)?$/, '').trim();
			if (hit && hit.label) { extra.push(hit.label); }
			else if (!hit && (m = /(\d{1,2})\)?$/.exec(fields[0] || '')) && out.feel) { extra.push(m[1]); }
			for (i = 1; i < fields.length; i++) {
				f = fields[i];
				if (common(f)) { continue; }
				if ((m = /^(\d+)-(\d+)$/.exec(f))) { out.meter = m[1] + '/' + m[2]; continue; }
				extra.push(f);
			}
			fromFolders(folders, out, false);
			out.label = extra.join(' ');
			if (!out.feel) { out.problem = 'No feel name at the start.'; }
			else if (!out.bpm) { out.problem = 'No tempo. Put it in a tempo folder (e.g. "95bpm") or in the name.'; }
			else if (out.meter !== '4/4') { out.problem = 'The trainer only pairs 4/4 drum loops for now.'; }
			// A missing bar count is not a problem: the player works it out from the file's length.
			return out;
		}

		// Chords spelt out as roman numerals? Take the run of chord names from the front.
		var tokens = base.split(/\s*(?:-|–|—|,|\bto\b)\s*/).map(function (t) { return t.trim(); }).filter(Boolean);
		var spelt = [];
		while (spelt.length < tokens.length && chordToken(tokens[spelt.length])) { spelt.push(chordToken(tokens[spelt.length])); }
		var el = null, near = null;
		out.voicing = 'triads';
		if (spelt.length >= 2) {
			var found = byChords(spelt);
			if (found && (found.wrong === 0 || backs(nicknames, found.el))) { el = found.el; out.voicing = found.voicing; }
			else { near = found; }
			fields = [tokens.slice(0, spelt.length).join(' - ')].concat(tokens.slice(spelt.length));
		} else {
			hit = named(fields[0] || '', EL_BY);
			el = hit ? hit.item : null;
			if (hit && hit.label) { extra.push(hit.label); }
		}
		out.el = el ? el.id : null;
		out.keyPc = null;
		out.feel = '';
		for (i = 1; i < fields.length; i++) {
			f = fields[i];
			if (common(f)) { continue; }
			if (/^(sevenths?|7ths?)$/i.test(f)) { out.voicing = 'sevenths'; }
			else if (/^triads?$/i.test(f)) { out.voicing = 'triads'; }
			else if (/^(straight|swing|swung)$/i.test(f)) { out.feel = /^sw/i.test(f) ? 'swing' : 'straight'; }
			else if (out.keyPc === null && keyOf(f) !== null) { out.keyPc = keyOf(f); }
			else { extra.push(f); }
		}
		fromFolders(folders, out, true);
		out.label = extra.join(' ');
		if (!el && spelt.length >= 2) {
			out.problem = near
				? 'No element has exactly these chords. The nearest is ' + near.el.roman + ' (' + near.el.name.replace(/^The /, 'the ') + ').'
				: 'No element in the course has these chords.';
		}
		else if (!el) { out.problem = '"' + (fields[0] || file) + '" isn\'t an element name from the course (e.g. "Dorian lean") or a set of chords (e.g. "ii-V-I").'; }
		else if (out.keyPc === null) { out.problem = 'No tone centre. Put it in a folder (e.g. "Bb") or in the name.'; }
		else if (!out.bpm) { out.problem = 'No tempo. Put it in a tempo folder (e.g. "95bpm") or in the name.'; }
		else if (out.voicing === 'sevenths' && !el.sev) { out.problem = 'The course gives no sevenths voicing for ' + el.file + '.'; }
		return out;
	}

	// The house band's version of a chord loop or a drum loop. It can play anything at any tempo,
	// so these can be made on the spot as well as listed in a library.
	function houseChords(elId, keyPc, bpm, voicing) {
		var el = HE.byId(elId), actual = HE.voicingFor(el, voicing);
		return { kind: 'chords', source: 'synth', el: el.id, keyPc: keyPc, bpm: bpm, voicing: actual, bars: HE.bars(el, actual), label: 'house band', path: '' };
	}
	function houseDrums(feel, bpm) {
		return { kind: 'drums', source: 'synth', feel: feel, bpm: bpm, bars: 4, label: 'house band', path: '' };
	}

	/*
	 * build({ files, synth })
	 *   files: recorded loops, each a path or {path, url, bars, lead, layout, ...}. Whatever
	 *          the entry states (bars measured from the audio, say) wins over the name.
	 *   synth: {tempos: [..], feels: [..]} adds the house band's version of every element on
	 *          every tone centre at those tempos, and of those feels.
	 */
	function build(o) {
		var chords = [], drums = [], problems = [];
		(o.files || []).forEach(function (entry) {
			var given = typeof entry === 'string' ? { path: entry } : entry;
			var r = parse(given.path);
			if (r.problem) { problems.push({ path: given.path, problem: r.problem }); return; }
			Object.keys(given).forEach(function (k) { if (given[k] !== undefined && given[k] !== null) { r[k] = given[k]; } });
			r.source = 'file';
			(r.kind === 'drums' ? drums : chords).push(r);
		});

		var recordedTempos = {};
		chords.concat(drums).forEach(function (v) { recordedTempos[v.bpm] = true; });

		if (o.synth) {
			var tempos = o.synth.tempos.slice();
			Object.keys(recordedTempos).map(Number).forEach(function (t) { if (tempos.indexOf(t) === -1) { tempos.push(t); } });
			HE.ELEMENTS.forEach(function (el) {
				HE.KEYS.forEach(function (k) {
					tempos.forEach(function (bpm) {
						(el.sev ? ['triads', 'sevenths'] : ['triads']).forEach(function (voicing) { chords.push(houseChords(el.id, k.pc, bpm, voicing)); });
					});
				});
			});
			o.synth.feels.forEach(function (feel) {
				tempos.forEach(function (bpm) { drums.push(houseDrums(feel, bpm)); });
			});
		}

		function wanted(v, sound) { return !sound || sound === 'both' || (sound === 'recorded') === (v.source === 'file'); }
		// A recording is what it is: it is offered whichever voicing the mix asks the synth for.
		function ck(elId, keyPc, bpm, voicing) { return [elId, keyPc, bpm, voicing].join('|'); }
		var chordIndex = {}, drumIndex = {};
		chords.forEach(function (c) {
			(c.source === 'file' ? ['triads', 'sevenths'] : [c.voicing]).forEach(function (voicing) {
				var k = ck(c.el, c.keyPc, c.bpm, voicing);
				(chordIndex[k] = chordIndex[k] || []).push(c);
			});
		});
		drums.forEach(function (d) { var k = d.feel + '|' + d.bpm; (drumIndex[k] = drumIndex[k] || []).push(d); });

		// feels in the trainer's own order, then any others in the order found
		var feelNames = [];
		FEELS.forEach(function (f) { if (drums.some(function (d) { return d.feel === f[0]; })) { feelNames.push(f[0]); } });
		drums.forEach(function (d) { if (feelNames.indexOf(d.feel) === -1) { feelNames.push(d.feel); } });

		return {
			chords: chords, drums: drums, problems: problems,
			recorded: { chords: chords.filter(function (c) { return c.source === 'file'; }).length, drums: drums.filter(function (d) { return d.source === 'file'; }).length },
			// tempos that have both a chord loop and a drum loop
			tempos: function (sound) {
				var seen = {};
				chords.forEach(function (c) { if (wanted(c, sound) && drums.some(function (d) { return d.bpm === c.bpm; })) { seen[c.bpm] = true; } });
				return Object.keys(seen).map(Number).sort(function (a, b) { return a - b; });
			},
			feels: function () { return feelNames.slice(); },
			// tone centres that have any chord loop of that kind
			keys: function (sound) {
				var seen = {};
				chords.forEach(function (c) { if (wanted(c, sound)) { seen[c.keyPc] = true; } });
				return HE.KEYS.map(function (k) { return k.pc; }).filter(function (pc) { return seen[pc]; });
			},
			chordVersions: function (elId, keyPc, bpm, voicing, sound) {
				return (chordIndex[ck(elId, keyPc, bpm, voicing)] || []).filter(function (v) { return wanted(v, sound); });
			},
			drumVersions: function (feel, bpm, sound) {
				return (drumIndex[feel + '|' + bpm] || []).filter(function (v) { return wanted(v, sound); });
			}
		};
	}

	HE.library = { chordPath: chordPath, drumPath: drumPath, parse: parse, build: build, houseChords: houseChords, houseDrums: houseDrums, FEELS: FEELS.map(function (f) { return f[0]; }) };
}(typeof window !== 'undefined' ? window : globalThis));
