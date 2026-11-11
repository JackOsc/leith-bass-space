/*
 * Leith Bass Space: Harmonic Elements catalogue.
 *
 * Every element the ear trainer can play, taken from the Harmonic Elements
 * course: homes, bonds and molecules (stages 1 to 9), and the compounds that are
 * whole forms (stage 10: the blues and its relatives, rhythm changes). Eleven
 * further molecules the course has no cards for yet sit in the stages they
 * belong to, marked as drafts.
 *
 * Each element lists its chords as scale degrees from home, so the same entry
 * works in all twelve keys. "tri" is the course's base voicing and "sev" its
 * expanded voicing (where the course gives one). A chord is written
 * degree.quality.bars; "h" for the bars is half a bar (two beats).
 *
 * HE.KEYS                         the twelve keys, in the cycle of fourths
 * HE.STAGES / HE.ELEMENTS         the catalogue
 * HE.byId(id)                     one element
 * HE.voicingFor(el, wanted)       'triads' | 'sevenths' actually available
 * HE.sequence(el, pc, voicing)    chords in order: [{pc, qual, bars}]
 * HE.bars(el, voicing)            loop length in bars
 * HE.hearings(el, pc, voicing)    other (element, home) pairs that are the same loop
 * HE.keyHearings(el, voicing)     the keys (home, major or minor) the Dojo accepts the loop in, the course's own first
 * HE.sameSound(el, voicing)       the ids of the elements that are this sound
 * HE.keyName(el, hearing, pc)     "A minor": a hearing's key, with the course's home on pc
 * HE.ALL / HE.isActive(id)        every element known by name, and whether the app offers it (see SHOW_FORMS)
 * HE.spell(el, pc, voicing)       note names: {tonic, chords:[{name, roman, bars}]}
 * HE.tip(el, pc, voicing)         the course's listen-for line, in this key
 * HE.degrees(el, voicing)         {fixed: ['1', 'b3', ...], open: [2, 6]}: the degrees the chords fix, and
 *                                 the ones they leave to the player
 * HE.chordDegrees(el, voicing)    each chord as the degrees from home it sounds: [['1', '3', '5'], ...]
 * HE.stageLabel(n)                'Stage 4. First molecules', or 'More molecules. Jazz'
 * HE.PAIRS                        neighbours worth hearing back to back: [[id, id], ...]
 * HE.CHANGES                      transformations: [{after: id, before: id | {roman, name, chords}}]
 * HE.pairsFor(ids) / HE.changesFor(ids)   the ones a mix allows
 * HE.FORM_CARDS                   the Guide's pages for forms whose element has another id
 *
 * No page or audio code in here: it runs the same in the browser and on the server.
 */
(function (root) {
	'use strict';
	var HE = root.HE = root.HE || {};

	var LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
	var TIP_NOTE = /\{([#b]?\d)\}/g; // a degree in a listen-for line, e.g. {b7}, named in the round's key
	var NATURAL = [0, 2, 4, 5, 7, 9, 11];

	// degree: [letters above home, semitones above home]
	var DEG = {
		'1': [0, 0], '#1': [0, 1], 'b2': [1, 1], '2': [1, 2], 'b3': [2, 3], '3': [2, 4], '4': [3, 5], '#4': [3, 6],
		'b5': [4, 6], '5': [4, 7], '#5': [4, 8], 'b6': [5, 8], '6': [5, 9], 'b7': [6, 10], '7': [6, 11]
	};

	// chord qualities: the notes sounded, and how the symbol is written
	var QUAL = {
		'M': { tones: [0, 4, 7], suffix: '' },
		'm': { tones: [0, 3, 7], suffix: 'm' },
		'7': { tones: [0, 4, 7, 10], suffix: '7' },
		'M7': { tones: [0, 4, 7, 11], suffix: 'maj7' },
		'm7': { tones: [0, 3, 7, 10], suffix: 'm7' },
		'h7': { tones: [0, 3, 6, 10], suffix: 'ø7' },
		'9': { tones: [0, 4, 7, 10, 14], suffix: '9' },
		'alt': { tones: [0, 4, 8, 10, 13], suffix: '7alt' },
		'sus2': { tones: [0, 2, 7], suffix: 'sus2' },
		'sus4': { tones: [0, 5, 7], suffix: 'sus4' },
		'6': { tones: [0, 4, 7, 9], suffix: '6' },
		'aug': { tones: [0, 4, 8], suffix: '+' },
		'dim': { tones: [0, 3, 6], suffix: '°' },
		'dim7': { tones: [0, 3, 6, 9], suffix: '°7' },
		'mM7': { tones: [0, 3, 7, 11], suffix: 'm(maj7)' },
		'm6': { tones: [0, 3, 7, 9], suffix: 'm6' }
	};

	// The practice order in the course: each new tonic a fourth above the last.
	var KEYS = [
		{ pc: 0, name: 'C', file: 'C' }, { pc: 5, name: 'F', file: 'F' }, { pc: 10, name: 'B♭', file: 'Bb' },
		{ pc: 3, name: 'E♭', file: 'Eb' }, { pc: 8, name: 'A♭', file: 'Ab' }, { pc: 1, name: 'D♭', file: 'Db' },
		{ pc: 6, name: 'G♭', file: 'Gb' }, { pc: 11, name: 'B', file: 'B' }, { pc: 4, name: 'E', file: 'E' },
		{ pc: 9, name: 'A', file: 'A' }, { pc: 2, name: 'D', file: 'D' }, { pc: 7, name: 'G', file: 'G' }
	];

	// Ways to name each tonic. The first is the default; the second is used when it spells the chords more simply.
	var TONIC_NAMES = {
		0: ['C'], 1: ['D♭', 'C♯'], 2: ['D'], 3: ['E♭', 'D♯'], 4: ['E'], 5: ['F'],
		6: ['G♭', 'F♯'], 7: ['G'], 8: ['A♭', 'G♯'], 9: ['A'], 10: ['B♭', 'A♯'], 11: ['B', 'C♭']
	};

	var STAGES = [
		{ n: 1, name: 'Home', about: 'One chord, and the notes it leaves open' },
		{ n: 2, name: 'Lean', about: 'Bonds with the chord a fifth below home (IV)' },
		{ n: 3, name: 'Pull', about: 'Bonds with the chord a fifth above home (V)' },
		{ n: 4, name: 'First molecules', about: 'Lean and pull combined' },
		{ n: 5, name: 'Shadow', about: 'Bonds with the chords of the key that stand in for home, lean and pull' },
		{ n: 6, name: 'Shadow molecules', about: 'Substitution arrives, and the pop axis' },
		{ n: 7, name: 'Colour', about: 'Bonds with a chord from outside the key, bringing one note of another mode' },
		{ n: 8, name: 'Colour molecules', about: 'Shadows and colours combined' },
		{ n: 9, name: 'Applied', about: 'Pulls aimed at chords other than home' },
		// Stage 10 is in the course, but out of the app for now (Oct 2026): see SHOW_FORMS below.
		{ n: 10, name: 'Compounds', about: 'Molecules joined into forms', retired: true },
		// Three groups of further molecules that were in the app in 1.8.0 to 1.12.1. In Nov 2026 eleven of them were
		// folded into the stages above and the rest merged or dropped (see "out" below); the groups are kept for the names.
		{ n: 11, name: 'Minor and modal', about: 'More molecules from minor homes and the modes', was: true, retired: true },
		{ n: 12, name: 'Pop and soul', about: 'More molecules that songs are written on', was: true, retired: true },
		{ n: 13, name: 'Jazz', about: 'More molecules: turnarounds and passing chords', was: true, retired: true }
	];

	function parseChords(text) {
		return text.split(' ').map(function (part) {
			var p = part.split('.');
			// (the last part is how many bars it lasts: "h" is half a bar)
			var bars = p[2] === 'h' ? 0.5 : +p[2];
			if (!DEG[p[0]] || !QUAL[p[1]] || !(bars > 0)) { throw new Error('Bad chord in catalogue: ' + part); }
			return { deg: p[0], qual: p[1], bars: bars };
		});
	}

	function fileToken(name) {
		var t = name.replace(/^The\s+/, '').replace(/,/g, '').trim();
		return t.charAt(0).toUpperCase() + t.slice(1);
	}

	function slug(text) {
		return text.toLowerCase().replace(/é/g, 'e').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
	}

	/*
	 * Out of the app for now (Oct 2026), kept here so that they can come back by flipping a switch:
	 * the forms (Stage 10, the compounds), and the five extra home chords (sus 2, sus 4, 6, augmented,
	 * diminished), which are chord flavours rather than homes and belong with the LBS Ear Trainer.
	 * While a switch is off its elements are not in HE.ELEMENTS: nothing offers them, and the Guide
	 * leaves them out. They are still in HE.ALL, so a recording named for one is still recognised
	 * (and left unused), and an old line of a member's record for one is still read.
	 */
	var SHOW_FORMS = false;
	var SHOW_EXTRA_HOMES = false;
	var EXTRA_HOMES = ['Isus2', 'Isus4', 'I6', 'I+', 'i°'];

	var ELEMENTS = [], ALL = [];
	// stage, roman numerals, course name, built from, base voicing, expanded voicing, listen-for line
	function E(stage, roman, name, rel, tri, sev, tip, extra) {
		var el = {
			// (an id, and the name a recording is filed under, outlive a change of name: Ear Training's records and links hold the id)
			id: (extra && extra.id) || slug(fileToken(name)), stage: stage, roman: roman, name: name, rel: rel, file: (extra && extra.file) || fileToken(name),
			kind: stage === 1 ? 'home' : stage === 10 ? 'form' : (tri.split(' ').length === 2 ? 'bond' : 'molecule'),
			tri: parseChords(tri), sev: sev ? parseChords(sev) : null, tip: tip, optional: !!(extra && extra.optional),
			// other names a loop file may use for this element
			aliases: ((extra && extra.aliases) || []).concat(extra && extra.file && extra.file !== fileToken(name) ? [fileToken(name)] : []),   // (a renamed element's new name is read too)
			// one numeral per chord, where the loop has more chords than the element's name (I IV V is played I IV V IV)
			romans: ((extra && extra.romans) || roman).split(' '),
			// how a recording longer than the written loop fills its bars, unless the file says otherwise:
			// the changes come round again ('repeat'), or every chord lasts longer ('stretch')
			long: (extra && extra.long) || 'repeat',
			// 'loop': it goes round, and may be heard from more than one home. 'cadence': it is defined by where it
			// is going, so it has the one home it arrives at, and is never another loop heard from elsewhere.
			shape: (extra && extra.shape) || 'loop',
			// taken out of the app by name (Nov 2026): 'merged' into the element named in "into", or 'dropped'
			out: (extra && extra.out) || '', into: (extra && extra.into) || '',
			// the name and the lines are a draft for Jack to rewrite
			draft: !!(extra && extra.draft)
		};
		if (el.romans.length !== el.tri.length || (el.sev && el.sev.length !== el.tri.length)) { throw new Error('Roman numerals and chords disagree: ' + name); }
		// The key the course hears it in: home, and whether home is major or minor (from the chord on
		// degree 1). Where no chord sits on home ("home absent"), the key is major in every case so far.
		var homeChord = el.tri.filter(function (c) { return c.deg === '1'; })[0];
		el.homeAbsent = !homeChord;
		el.mode = homeChord && MINORISH[homeChord.qual] ? 'minor' : 'major';
		el.retired = (stage === 10 && !SHOW_FORMS) || (EXTRA_HOMES.indexOf(roman) !== -1 && !SHOW_EXTRA_HOMES) || !!el.out;
		el.hear = extra && extra.hear !== undefined ? extra.hear : true;   // false: no hearings worked out beyond the course's own
		ALL.push(el);
		if (!el.retired) { ELEMENTS.push(el); }
	}
	// chord qualities heard as minor (a minor home, or a lower-case numeral)
	var MINORISH = { 'm': true, 'm7': true, 'mM7': true, 'm6': true, 'h7': true, 'dim': true, 'dim7': true };

	// Stage 1. Home
	E(1, 'I', 'The major home', 'Home alone', '1.M.4', '1.M7.4', 'The ♮4 as a note with somewhere to go, the ♯4 as a note that is happy where it is.', { aliases: ['Major', 'Maj', 'Major chord', 'Home major'] });
	E(1, 'I7', 'The dominant home', 'Home alone', '1.7.4', '1.9.4', 'The ♭7 heard as colour rather than tension. The ♭3 bending towards the 3.', { aliases: ['Dominant', 'Dom', 'Dom 7', 'Dominant 7', 'Dominant 7th', '7', 'Home dominant'] });
	E(1, 'i', 'The minor home', 'Home alone', '1.m.4', '1.m7.4', 'Sing ♮6 then ♭6 against the drone. Then name which one a record is using.', { aliases: ['Minor', 'Min', 'Minor chord', 'Home minor'] });
	// The next five are Jack's additions (Oct 2026). Their listen-for lines are placeholders for him to rewrite.
	E(1, 'Isus2', 'The sus 2 home', 'Home alone', '1.sus2.4', null, 'No third, so it is neither major nor minor. The {2} sits a tone above home and never has to resolve.', { aliases: ['Sus 2', 'Sus2', 'Suspended 2', 'Suspended 2nd', 'Home sus 2', 'Home sus2', 'Sus2 home'] });
	E(1, 'Isus4', 'The sus 4 home', 'Home alone', '1.sus4.4', null, 'No third. The {4} sits where the third would be, waiting to fall to {3}.', { aliases: ['Sus 4', 'Sus4', 'Sus', 'Suspended 4', 'Suspended 4th', 'Home sus 4', 'Home sus4', 'Sus4 home'] });
	E(1, 'I6', 'The sixth home', 'Home alone', '1.6.4', null, 'A major chord with the {6} added. Sweeter than the plain triad, with no seventh pulling anywhere.', { aliases: ['6', '6th', 'Sixth', 'Six', 'Major 6', 'Maj 6', 'Major 6th', 'Home 6', '6 home', '6th home'] });
	E(1, 'I+', 'The augmented home', 'Home alone', '1.aug.4', null, 'A major chord with its fifth raised to {#5}. Every note is a major third from the next, so it never quite settles.', { aliases: ['Augmented', 'Aug', 'Home augmented', 'Home aug', 'Aug home'] });
	E(1, 'i°', 'The diminished home', 'Home alone', '1.dim.4', null, 'Two minor thirds stacked: {1}, {b3}, {b5}. The lowered fifth is the note that won\'t sit still.', { aliases: ['Diminished', 'Dim', 'Home diminished', 'Home dim', 'Dim home'] });

	// Stage 2. Lean
	E(2, 'I IV', 'The major lean', 'Home, lean', '1.M.2 4.M.2', '1.M7.2 4.M7.2', 'The semitone from {3} up to {4}. It is the tell for this bond.');
	E(2, 'I7 IV7', 'The blues lean', 'Home, lean', '1.7.2 4.7.2', '1.9.2 4.9.2', 'Two semitone falls happen on the change: {3} to {b3} and {b7} to {6}. They are the whole sound of the bond.', { hear: false });
	E(2, 'i7 IV7', 'The Dorian lean', 'Home, lean, colour (IV brings ♮6: Dorian)', '1.m.2 4.M.2', '1.m7.2 4.7.2', 'The {6} arriving. It is the brightness.');
	E(2, 'i iv', 'The minor lean', 'Home, lean', '1.m.2 4.m.2', '1.m7.2 4.m7.2', '{5} rising a semitone to {b6}. The darkening.');

	// Stage 3. Pull
	E(3, 'I V', 'The major pull', 'Home, pull', '1.M.2 5.M.2', '1.M7.2 5.7.2', '{1} falling a semitone to {7} as the change arrives.');
	E(3, 'I v', 'The Mixolydian pull', 'Home, pull, colour (v brings ♭7: Mixolydian)', '1.M.2 5.m.2', '1.7.2 5.m7.2', '{b7} where {7} would be. The missing pull.');
	E(3, 'i v', 'The modal minor pull', 'Home, pull', '1.m.2 5.m.2', '1.m7.2 5.m7.2', 'The absence of pull, and the {b7} where a {7} would make it cadence.');
	E(3, 'i V', 'The functional minor pull', 'Home, pull', '1.m.2 5.7.2', '1.m7.2 5.7.2', '{7} pulling up to {1}.');
	E(3, 'ii V', 'The suspended cadence', 'Shadow (ii for IV), pull (home absent)', '2.m.2 5.M.2', '2.m7.2 5.7.2', 'The guide tones: {1} falling to {7} and {4} held. The resolution you keep expecting.');

	// Stage 4. First molecules
	// The loops follow Jack's recordings: I IV V goes back through IV, and the two minor molecules return to i.
	E(4, 'I IV V', 'The parent molecule', 'Home, lean, pull', '1.M.1 4.M.1 5.M.1 4.M.1', '1.M7.1 4.M7.1 5.7.1 4.M7.1', 'IV to V is a step, the only move with no shared notes. Hear the lift before the pull home.', { romans: 'I IV V IV', long: 'stretch' });
	E(4, 'V IV I', 'The backwards cadence', 'Home, lean, pull', '5.M.1 4.M.1 1.M.2', '5.7.1 4.7.1 1.7.2', 'V to IV is a falling step. Nothing resolves until IV leans home.', { long: 'stretch' });
	E(4, 'i iv v', 'The modal minor molecule', 'Home, lean, pull', '1.m.1 4.m.1 5.m.1 1.m.1', '1.m7.1 4.m7.1 5.m7.1 1.m7.1', 'The v arriving without any pull.', { romans: 'i iv v i', long: 'stretch' });
	E(4, 'i iv V', 'The functional minor molecule', 'Home, lean, pull', '1.m.1 4.m.1 5.M.1 1.m.1', '1.m7.1 4.m7.1 5.7.1 1.m7.1', 'The {7}. Play this back to back with i iv v in the same key until the difference stops being a concept.', { romans: 'i iv V i', long: 'stretch' });
	E(4, 'ii V I', 'The cadential cell', 'Home, pull, shadow (ii for IV)', '2.m.1 5.M.1 1.M.2', '2.m7.1 5.7.1 1.M7.2', 'Two falling fifths in a row. Then the guide tones on their own.', { long: 'stretch', shape: 'cadence' });
	E(4, 'ii V I IV', 'The cadence as a comma', 'Home, lean, pull, shadow (ii for IV)', '2.m.1 5.M.1 1.M.1 4.M.1', '2.m7.1 5.7.1 1.M7.1 4.M7.1', 'The lean after the arrival, and the way it sets up the next ii.');
	E(4, 'iiø7 V7 i', 'The minor cadence', 'Home, pull, shadow (iiø for iv)', '2.h7.1 5.7.1 1.m.2', '2.h7.1 5.7.1 1.m7.2', '{b6} in the approach chord, {7} in the dominant, {b3} in the arrival.', { shape: 'cadence' });

	// Stage 5. Shadow
	E(5, 'I vi', 'The relative shadow', 'Home, shadow (vi for I)', '1.M.2 6.m.2', '1.M7.2 6.m7.2', 'The root falling a third while the upper notes stay put.', { aliases: ['Relative minor'] });
	E(5, 'I iii', 'The upper shadow', 'Home, shadow (iii for I)', '1.M.2 3.m.2', '1.M7.2 3.m7.2', '{1} falling to {7} while {3} and {5} stay.', { aliases: ['Bright shadow'] });
	E(5, 'i ♭III', 'The relative major', 'Home, shadow (♭III for i)', '1.m.2 b3.M.2', '1.m7.2 b3.M7.2', 'The lift into major with only one note moving.');
	E(5, 'i ♭VI', 'The dark shadow', 'Home, shadow (♭VI for iv)', '1.m.2 b6.M.2', '1.m7.2 b6.M7.2', '{5} rising a semitone to {b6}, the same darkening as in i iv but with the bass falling instead.');

	// Stage 6. Shadow molecules
	E(6, 'I vi IV V', 'The fifties progression', 'Home, lean, pull, shadow (vi for I)', '1.M.1 6.m.1 4.M.1 5.M.1', '1.M7.1 6.m7.1 4.M7.1 5.7.1', 'Two falling thirds, one step, one falling fifth.');
	E(6, 'I vi ii V', 'The fifties, strengthened', 'Home, pull, shadow (vi for I, ii for IV)', '1.M.1 6.m.1 2.m.1 5.M.1', '1.M7.1 6.m7.1 2.m7.1 5.7.1', 'The {2} in the bass where {4} was.');
	E(6, 'I iii IV V', 'The rising line', 'Home, lean, pull, shadow (iii for I)', '1.M.1 3.m.1 4.M.1 5.M.1', '1.M7.1 3.m7.1 4.M7.1 5.7.1', 'The bass rising {1}, {3}, {4}, {5}.');
	E(6, 'I IV iii V', 'The surprise shadow', 'Home, lean, pull, shadow (iii for I)', '1.M.1 4.M.1 3.m.1 5.M.1', '1.M7.1 4.M7.1 3.m7.1 5.7.1', 'The bass stepping down from {4} to {3}.');
	E(6, 'IV V iii vi', 'The ascending soul cell', 'Lean, pull, shadow (iii, vi) (home absent)', '4.M.1 5.M.1 3.m.1 6.m.1', '4.M7.1 5.7.1 3.m7.1 6.m7.1', 'V moving to iii before vi. It avoids a direct V to I arrival.');
	E(6, 'iii vi ii V I', 'The long cycle', 'Home, pull, shadow (iii, vi, ii)', '3.m.1 6.m.1 2.m.1 5.M.1 1.M.4', '3.m7.1 6.m7.1 2.m7.1 5.7.1 1.M7.4', 'Each root falling a fifth, and the sense of the chain gathering speed.', { shape: 'cadence' });
	E(6, 'I V vi IV', 'The pop axis', 'Home, lean, pull, shadow (vi for I)', '1.M.1 5.M.1 6.m.1 4.M.1', '1.M7.1 5.M.1 6.m7.1 4.M7.1', 'V moving up a step to vi, where the fifties progression would have gone home.');
	E(6, 'vi IV I V', 'The axis, minor view', 'Home, lean, pull, shadow (vi for I)', '6.m.1 4.M.1 1.M.1 5.M.1', '6.m7.1 4.M7.1 1.M7.1 5.M.1', 'Where the loop seems to begin, and which chord you feel as home.');

	// Stage 7. Colour (with two of Stage 5's shadows that sit a step from home)
	E(7, 'I ♭VII', 'The Mixolydian step', 'Home, colour (♭VII brings ♭7: Mixolydian)', '1.M.2 b7.M.2', '1.M.2 b7.M7.2', 'Every note falling a step at once.', { id: 'mixolydian-shift', file: 'Mixolydian shift', aliases: ['The Mixolydian shift'] });
	E(5, 'i ♭VII', 'The minor step', 'Home, shadow (♭VII for v)', '1.m.2 b7.M.2', '1.m7.2 b7.M.2', 'The parallel step, and then whichever 6 the melody chooses.', { id: 'minor-shift', file: 'Minor shift', aliases: ['The minor shift'] });
	E(5, 'I ii', 'The neo soul step', 'Home, shadow (ii for IV)', '1.M.2 2.m.2', '1.M7.2 2.m7.2', 'The root rising a step with the texture moving in parallel.', { id: 'neo-soul-shift', file: 'Neo soul shift', aliases: ['The neo soul shift'] });
	E(7, 'I II', 'The Lydian step', 'Home, colour (II brings ♯4: Lydian)', '1.M.2 2.M.2', '1.M7.2 2.7.2', '{#4} in the second chord, heard against the home that stays major.', { optional: true, id: 'lydian-shift', file: 'Lydian shift', aliases: ['The Lydian shift'] });
	E(7, 'i ♭II', 'The Phrygian step', 'Home, colour (♭II brings ♭2: Phrygian)', '1.m.2 b2.M.2', '1.m7.2 b2.M7.2', 'The semitone rise in the bass.', { optional: true, id: 'phrygian-shift', file: 'Phrygian shift', aliases: ['The Phrygian shift'] });

	// Stage 8. Colour molecules
	E(8, 'i ♭VII ♭VI ♭VII', 'The modal descent', 'Home, shadow (♭VII for v, ♭VI for iv)', '1.m.1 b7.M.1 b6.M.1 b7.M.1', '1.m7.1 b7.M.1 b6.M7.1 b7.M.1', 'The bass turning back up where a cadence might have been.');
	E(8, 'i ♭VII ♭VI V', 'The Andalusian cadence', 'Home, shadow (♭VII, ♭VI), pull', '1.m.1 b7.M.1 b6.M.1 5.M.1', '1.m7.1 b7.M.1 b6.M7.1 5.7.1', 'The moment {b7} becomes {7}.');
	E(8, 'I ♭VII IV', 'The Mixolydian cadence', 'Home, colour (♭VII), lean', '1.M.1 b7.M.1 4.M.2', null, 'The IV to I lean where you might expect V to I.');
	E(8, '♭VI ♭VII I', 'The lift', 'Colour (♭VI, ♭VII, from minor), home', 'b6.M.1 b7.M.1 1.M.2', 'b6.M7.1 b7.M.1 1.M.2', 'The {3} arriving on the last chord.', { shape: 'cadence' });

	// Stage 9. Applied, with the borrowed and mediant colours that were Stage 9's in the first draft. The expanded voicings are the
	// ones the Guide's pages give; the four with none there (the V of V detour, the Creep progression, the
	// altered dominant and the tritone substitution) have none here.
	E(9, 'I VI7 ii V', 'The turnaround', 'Home, applied (VI7, the V of ii), shadow (ii), pull', '1.M.1 6.7.1 2.m.1 5.7.1', '1.M7.1 6.7.1 2.m7.1 5.7.1', 'vi made dominant to pull into ii. The first chromatic note: {#1}.');
	E(9, 'I II7 IV I', 'The V of V detour', 'Home, applied (II7, the V of V), lean', '1.M.1 2.7.1 4.M.1 1.M.1', null, 'A secondary dominant that does not go where it points.');
	E(9, 'IV III7 vi', 'The descending soul cycle', 'Lean, applied (III7, the V of vi), shadow (vi)', '4.M.1 3.7.1 6.m.2', '4.M7.1 3.7.1 6.m7.2', 'III7 pulling into vi. {#5} enters.');
	E(9, 'III7 VI7 II7 V7 I', 'The chain of dominants', 'Home, applied (III7, VI7 and II7, each the V of the next), pull', '3.7.1 6.7.1 2.7.1 5.7.1 1.M.4', '3.7.1 6.7.1 2.7.1 5.7.1 1.M7.4', 'The long cycle with dominant-seventh approach chords. Guide tones fall by semitone.', { shape: 'cadence' });
	E(9, 'I I7 IV', 'The V of IV', 'Home, applied (I7, the V of IV), lean', '1.M.1 1.7.1 4.M.2', '1.M7.1 1.7.1 4.M7.2', 'The home chord gains {b7} and becomes a dominant, pulling into IV.', { shape: 'cadence' });
	E(7, 'I iv', 'The borrowed minor lean', 'Home, lean, colour (iv brings ♭6, from minor)', '1.M.2 4.m.2', '1.M7.2 4.m7.2', 'The minor iv imported into a major key. {b6} enters.');
	E(8, 'IV iv I', 'The minor plagal cadence', 'Home, lean, colour (iv brings ♭6, from minor)', '4.M.1 4.m.1 1.M.2', '4.M7.1 4.m7.1 1.M7.2', '{6} falls to {b6}, then to {5}. The amen with a tear in it.', { shape: 'cadence' });
	E(8, 'I III IV iv', 'The Creep progression', 'Home, lean, colour (III brings ♯5, iv brings ♭6)', '1.M.1 3.M.1 4.M.1 4.m.1', null, 'A chromatic mediant and a borrowed iv in one loop.');
	E(8, 'iv7 ♭VII7 I', 'The backdoor cadence', 'Home, colour (iv7 and ♭VII7, from minor)', '4.m.1 b7.7.1 1.M.2', '4.m7.1 b7.7.1 1.M7.2', 'Arriving home from below, without the dominant.', { shape: 'cadence' });
	E(7, 'I ♭III', 'The flat mediant', 'Home, colour (♭III, a chromatic mediant)', '1.M.2 b3.M.2', '1.M7.2 b3.M7.2', 'Roots a third apart without shared key. Sideways, cinematic.');
	E(7, 'I III', 'The major mediant', 'Home, colour (III, a chromatic mediant)', '1.M.2 3.M.2', '1.M7.2 3.7.2', 'A bright chromatic lift. {#5} enters.');
	E(7, 'I ♭VI', 'The flat submediant', 'Home, colour (♭VI, a chromatic mediant)', '1.M.2 b6.M.2', '1.M7.2 b6.M7.2', 'Dark shadow borrowed into major. {1} shared.');
	E(9, 'ii V7alt I', 'The altered dominant', 'Home, shadow (ii), pull (altered)', '2.m7.1 5.alt.1 1.M7.2', null, 'Maximum tension on the dominant. Every altered tension resolves by step.', { shape: 'cadence' });
	E(9, 'ii ♭II7 I', 'The tritone substitution', 'Home, shadow (ii), applied (♭II7 for V)', '2.m7.1 b2.7.1 1.M7.2', null, 'The V replaced by the dominant a tritone away. The bass falls by semitone.', { shape: 'cadence' });

	// Stage 10. Compounds: the ones that are whole forms. Their chords and their listen-for lines are the
	// Guide's own. ("roman" is a short tag here, since the numerals of a whole form won't fit on a button.)
	var RC_A = '1.M.h 6.m.h 2.m.h 5.7.h 1.M.h 6.m.h 2.m.h 5.7.h 1.M.h 1.7.h 4.M.h 4.m.h 1.M.h 5.7.h ';
	var RC_A_ROMANS = 'I vi ii V I vi ii V I I7 IV iv I V ';
	E(10, 'Blues', 'The twelve bar blues', 'I7 IV7 (bars one to eight), V IV I (bars nine to eleven), a V7 turnaround',
		'1.7.1 4.7.1 1.7.2 4.7.2 1.7.2 5.7.1 4.7.1 1.7.1 5.7.1', null,
		'Where each molecule begins. Call out the bond, the backwards cadence and the turnaround as they arrive.',
		{ romans: 'I7 IV7 I7 IV7 I7 V7 IV7 I7 V7', aliases: ['12 bar blues', 'Twelve bar blues', 'Blues'] });
	E(10, 'Quick change', 'The blues, revisited', 'The Stage 4 blues, plus the turnaround (I VI7 ii V) and ii V in place of the backwards cadence',
		'1.7.1 4.7.1 1.7.2 4.7.2 1.7.1 6.7.1 2.m7.1 5.7.1 1.7.h 6.7.h 2.m7.h 5.7.h', null,
		'Bar eight, and whether bars nine and ten are V IV or ii V.',
		{ romans: 'I7 IV7 I7 IV7 I7 VI7 ii7 V7 I7 VI7 ii7 V7', aliases: ['Quick change blues', 'Quick change and turnaround'] });
	E(10, 'Minor blues', 'The minor blues', 'i iv (bars one to eight), a stepwise approach from ♭VI7 into V7, and the functional minor pull',
		'1.m7.4 4.m7.2 1.m7.2 b6.7.1 5.7.1 1.m7.1 5.7.1', null,
		'The semitone slide from ♭VI7 to V7.',
		{ romans: 'i7 iv7 i7 ♭VI7 V7 i7 V7' });
	E(10, 'Jazz blues', 'The jazz blues', 'The revisited blues plus v7 I7 (ii V into IV) in bar four',
		'1.7.1 4.7.1 1.7.1 5.m7.h 1.7.h 4.7.2 1.7.1 6.7.1 2.m7.1 5.7.1 1.7.h 6.7.h 2.m7.h 5.7.h', null,
		'Bar four and bar eight, the two new signposts.',
		{ romans: 'I7 IV7 I7 v7 I7 IV7 I7 VI7 ii7 V7 I7 VI7 ii7 V7' });
	E(10, 'Rhythm', 'Rhythm changes', 'I vi ii V, the V of IV, the borrowed iv, and the chain of dominants as the bridge (AABA)',
		RC_A + '1.M.h 5.7.h ' + RC_A + '1.M.h 5.7.h 3.7.2 6.7.2 2.7.2 5.7.2 ' + RC_A + '1.M.1', null,
		'The bridge arriving, and the iv in bar six.',
		{ romans: RC_A_ROMANS + 'I V ' + RC_A_ROMANS + 'I V III7 VI7 II7 V7 ' + RC_A_ROMANS + 'I' });
	E(10, 'Two homes', 'Major and relative minor cadences', 'ii V I IV, then iiø7 V7 i in the relative minor',
		'2.m7.1 5.7.1 1.M7.1 4.M7.1 7.h7.1 3.7.1 6.m.2', null,
		'The III7, and the moment the ear accepts the sixth degree as home.',
		{ romans: 'ii7 V7 I IV iiø7 V7 i', aliases: ['Two homes'] });

	/*
	 * The nineteen further molecules of 1.8.0 (minor and modal, pop and soul, jazz), sorted in Nov 2026 by
	 * one test: an element stays if it brings a new sound (not the same chords in another order), is common
	 * in the music pupils play, and has a clear home once home is cued, or is one of the few loops taught on
	 * purpose as having two homes. Eleven stay, in the stages they belong to. Their names and lines are still
	 * drafts for Jack ("draft"). Five are merged into the element that is the same sound or the same idea,
	 * and three are dropped: those keep their ids and are known by name, like the forms, and nothing offers them.
	 */
	// Kept. Stage 6
	E(6, 'I ii iii IV', 'The climb', 'Home, shadow (ii, iii), lean', '1.M.1 2.m.1 3.m.1 4.M.1', '1.M7.1 2.m7.1 3.m7.1 4.M7.1', 'The bass walking up the scale: {1}, {2}, {3}, {4}. Every change is a step and nothing pulls: the IV at the top leans back home.', { draft: true });
	// Kept. Stage 7
	E(7, 'i ii', 'The Dorian step', 'Home, colour (ii brings ♮6: Dorian)', '1.m.2 2.m.2', '1.m7.2 2.m7.2', 'Two minor chords a tone apart. The top of the second chord is {6}, a semitone above where a plain minor key would put it.', { draft: true, id: 'dorian-shift', file: 'Dorian shift', aliases: ['The Dorian shift'] });
	// Kept. Stage 8
	E(8, '♭VI ♭VII i', 'The Aeolian cadence', 'Shadow (♭VI for iv, ♭VII for v), home', 'b6.M.1 b7.M.1 1.m.2', 'b6.M7.1 b7.M.1 1.m7.2', 'Two whole steps up in the bass, landing on a minor home. No leading note: {b7} rises to {1} by a tone. Compare the lift, where the same climb lands on a major chord.', { draft: true, shape: 'cadence' });
	E(8, 'i ♭III ♭VII IV', 'The Dorian loop', 'Home, shadow (♭III, ♭VII), colour (IV brings ♮6: Dorian)', '1.m.1 b3.M.1 b7.M.1 4.M.1', '1.m7.1 b3.M7.1 b7.M.1 4.7.1', 'The {6} when the last chord arrives. Then ask whose home it is: the same four chords can sit on the third chord’s root. Put a bass under each and hear the loop change.', { draft: true });
	E(8, 'i ♭III IV', 'The minor rock cell', 'Home, shadow (♭III), colour (IV brings ♮6)', '1.m.1 b3.M.1 4.M.2', '1.m7.1 b3.M7.1 4.7.2', 'The bass climbing {1}, {b3}, {4}, then the brightness of {6} inside the last chord against a minor home.', { draft: true });
	E(8, 'I ♭III IV', 'The rock cell', 'Home, colour (♭III, from minor), lean', '1.M.1 b3.M.1 4.M.2', null, 'The same bass climb over a major home. {3} sounds in the first chord, then {b3} is the root of the second: the rub is the point.', { draft: true });
	E(8, 'i ♭VI iv V', 'The fifties, in minor', 'Home, shadow (♭VI for iv), lean, pull', '1.m.1 b6.M.1 4.m.1 5.M.1', '1.m7.1 b6.M7.1 4.m7.1 5.7.1', 'The fifties progression’s bass from a minor home. Wait for {7} in the last chord: it is the only note from outside the natural minor, and it pulls home.', { draft: true });
	E(8, 'i i(maj7) i7 i6', 'The line cliché', 'Home alone, with one voice moving', '1.m.1 1.mM7.1 1.m7.1 1.m6.1', null, 'One note falling by semitone inside a minor chord: {1}, {7}, {b7}, {6}, while the bass can stay put. Sing the moving voice.', { draft: true });
	// Kept. Stage 9. (The ii V into IV is played as a phrase: home, the ii V aimed at IV, IV, and home again. Going round as
	// three chords it was simply ii V I in the key a fourth up, which is how it came to be accepted as a hearing of that.)
	E(9, 'v7 I7 IV', 'The ii V into IV', 'Home, applied (v7 I7, a ii V aimed at IV), lean', '1.M.2 5.m7.1 1.7.1 4.M.2 1.M.2', '1.M7.2 5.m7.1 1.7.1 4.M7.2 1.M7.2', 'Home turning dominant. {b7} appears while the bass is still on {1}, and falls to {6} as the IV arrives.', { draft: true, shape: 'cadence', romans: 'I v7 I7 IV I' });
	E(9, 'I ♯i°7 ii V', 'The diminished passing chord', 'Home, applied (♯i°7, in place of VI7), shadow (ii), pull', '1.M.1 #1.dim7.1 2.m.1 5.7.1', '1.M7.1 #1.dim7.1 2.m7.1 5.7.1', 'The bass rising by semitone: {1}, {#1}, {2}. The diminished chord does the turnaround’s job with a smoother bass.', { draft: true });
	E(9, 'i ♭VI7 V7', 'The minor blues turn', 'Home, colour (♭VI7), pull', '1.m.2 b6.7.1 5.7.1', '1.m7.2 b6.7.1 5.7.1', 'Two dominant chords a semitone apart, sliding down into home. The bass falls {b6}, {5}, {1}.', { draft: true });
	// Merged: the same sound, or the same idea, as an element that stays.
	E(12, 'I V ii IV', 'The axis with ii', 'Home, pull, shadow (ii for IV), lean', '1.M.1 5.M.1 2.m.1 4.M.1', '1.M7.1 5.7.1 2.m7.1 4.M7.1', 'The Dorian loop heard from its other home.', { out: 'merged', into: 'dorian-loop' });
	E(12, 'IV V vi', 'The deceptive lift', 'Lean, pull, shadow (vi) (home absent)', '4.M.1 5.M.1 6.m.2', '4.M7.1 5.7.1 6.m7.2', 'The Aeolian cadence heard from the relative major, whose home never sounds.', { out: 'merged', into: 'aeolian-cadence' });
	E(11, 'I IV ♭VII IV', 'The Mixolydian sway', 'Home, lean, colour (♭VII brings ♭7)', '1.M.1 4.M.1 b7.M.1 4.M.1', null, 'The Mixolydian cadence’s chords, going out and back.', { out: 'merged', into: 'mixolydian-cadence' });
	E(12, 'I III7 vi IV', 'The gospel turn', 'Home, applied (III7, the V of vi), shadow (vi), lean', '1.M.1 3.7.1 6.m.1 4.M.1', '1.M7.1 3.7.1 6.m7.1 4.M7.1', 'The descending soul cycle’s applied chord, from home.', { out: 'merged', into: 'descending-soul-cycle' });
	E(13, 'iii VI7 ii V', 'The three six two five', 'Shadow (iii, ii), applied (VI7), pull (home absent)', '3.m.1 6.7.1 2.m.1 5.7.1', '3.m7.1 6.7.1 2.m7.1 5.7.1', 'The turnaround with iii standing in for I.', { out: 'merged', into: 'turnaround' });
	// Dropped for now: the same chords as something else in another order.
	E(12, 'I IV vi V', 'The axis, lean first', 'Home, lean, shadow (vi for I), pull', '1.M.1 4.M.1 6.m.1 5.M.1', '1.M7.1 4.M7.1 6.m7.1 5.7.1', 'The four chords of the pop axis in another order.', { out: 'dropped' });
	E(12, 'I iii vi IV', 'The falling shadows', 'Home, shadow (iii, vi), lean', '1.M.1 3.m.1 6.m.1 4.M.1', '1.M7.1 3.m7.1 6.m7.1 4.M7.1', 'No V anywhere.', { out: 'dropped' });
	E(12, 'IV iii ii I', 'The walk down', 'Home, shadow (ii, iii), lean', '4.M.1 3.m.1 2.m.1 1.M.1', '4.M7.1 3.m7.1 2.m7.1 1.M7.1', 'The climb in reverse.', { out: 'dropped' });

	var BY_ID = {};
	ALL.forEach(function (el) {
		if (BY_ID[el.id]) { throw new Error('Two elements share an id: ' + el.id); }
		BY_ID[el.id] = el;
	});

	// The cards whose line is "what it teaches" rather than "listen for" (they were Stage 9's, Transformations, in the first draft).
	['turnaround', 'v-of-v-detour', 'descending-soul-cycle', 'chain-of-dominants', 'v-of-iv', 'borrowed-minor-lean', 'minor-plagal-cadence',
		'creep-progression', 'backdoor-cadence', 'flat-mediant', 'major-mediant', 'flat-submediant', 'altered-dominant', 'tritone-substitution'
	].forEach(function (id) { BY_ID[id].teaches = true; });

	function voicingFor(el, wanted) { return wanted === 'sevenths' && el.sev ? 'sevenths' : 'triads'; }
	function chords(el, voicing) { return voicingFor(el, voicing) === 'sevenths' ? el.sev : el.tri; }
	function bars(el, voicing) { return chords(el, voicing).reduce(function (n, c) { return n + c.bars; }, 0); }

	function sequence(el, tonicPc, voicing) {
		return chords(el, voicing).map(function (c) {
			return { pc: (tonicPc + DEG[c.deg][1]) % 12, qual: c.qual, bars: c.bars };
		});
	}

	// The notes a chord sounds, whatever it is called. With no bass in the
	// loop, Csus2 and Gsus4 are the same sound, and so are C+, E+ and A♭+.
	function notes(c) {
		var seen = {};
		QUAL[c.qual].tones.forEach(function (t) { seen[(c.pc + t) % 12] = true; });
		return Object.keys(seen).map(Number).sort(function (a, b) { return a - b; }).join(' ');
	}

	// A loop has no first chord once it is going round, and a chord repeated
	// across the join is one longer chord. Reduce a sequence to that.
	function asLoop(seq) {
		var out = [];
		seq.forEach(function (c) {
			var last = out[out.length - 1], set = notes(c);
			if (last && last.set === set) { last.bars += c.bars; } else { out.push({ set: set, bars: c.bars }); }
		});
		if (out.length > 1 && out[0].set === out[out.length - 1].set) { out[0].bars += out.pop().bars; }
		return out;
	}

	function sameLoop(a, b) {
		if (a.length !== b.length) { return false; }
		for (var shift = 0; shift < a.length; shift++) {
			var ok = true;
			for (var i = 0; i < a.length && ok; i++) {
				var x = a[i], y = b[(i + shift) % b.length];
				ok = x.set === y.set && x.bars === y.bars;
			}
			if (ok) { return true; }
		}
		return false;
	}

	// "Whose home is it?" Every other element and home that gives exactly these
	// notes for exactly these lengths. C to F is I IV in C and I V in F.
	function hearings(el, tonicPc, voicing) {
		var mine = asLoop(sequence(el, tonicPc, voicing));
		var out = [];
		ELEMENTS.forEach(function (other) {
			for (var pc = 0; pc < 12; pc++) {
				if (other === el && pc === tonicPc) { continue; }
				if (sameLoop(mine, asLoop(sequence(other, pc, voicing)))) { out.push({ el: other, tonicPc: pc }); }
			}
		});
		return out;
	}

	/*
	 * KEYS AND HEARINGS (1.9.0). In the Dojo an answer is a key (home, and whether home is major or
	 * minor) and an element. An element is a sound: its chords, wherever the loop is taken to start and
	 * whatever key it is played in. Plenty of sounds can be heard from more than one home, and the course
	 * says so ("whose home is it?"). keyHearings(el, voicing) lists the hearings the Dojo accepts:
	 *   - the course's own, first;
	 *   - every other element of the catalogue that is the same loop, heard from its own home;
	 *   - and, from any chord of the loop that could be home (a major or a minor chord), the loop heard
	 *     from there, if that puts no chord outside its key, or fewer than the course's own hearing does.
	 * A major key's notes are the major scale's. A minor key's are natural minor's and the raised
	 * seventh (V and vii° belong to a minor key). Numerals always count from home on the major scale,
	 * so ♭III is a minor third above home whatever the key.
	 * Each hearing: {offset (semitones from the course's home to this one), mode, own, label, romans,
	 * chords ([{deg, qual, bars}] from this home, starting on it), via (the id of the element it is, if
	 * it is another one)}.
	 */
	var MAJOR_SET = [0, 2, 4, 5, 7, 9, 11], MINOR_SET = [0, 2, 3, 5, 7, 8, 10, 11];
	var ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
	var SUFFIX = { 'M': '', 'm': '', '7': '7', 'M7': 'maj7', 'm7': '7', 'h7': 'ø7', '9': '9', 'alt': '7alt', 'sus2': 'sus2', 'sus4': 'sus4', '6': '6', 'aug': '+', 'dim': '°', 'dim7': '°7', 'mM7': '(maj7)', 'm6': '6' };
	var HOMELY = { 'M': 'major', '7': 'major', 'M7': 'major', '9': 'major', '6': 'major', 'm': 'minor', 'm7': 'minor', 'mM7': 'minor', 'm6': 'minor' };

	// How many chords of a list (degrees from home) sound a note outside the key.
	function outside(list, mode) {
		var set = mode === 'minor' ? MINOR_SET : MAJOR_SET;
		return list.filter(function (c) {
			return QUAL[c.qual].tones.some(function (t) { return set.indexOf((DEG[c.deg][1] + t) % 12) === -1; });
		}).length;
	}
	// A degree from one home, counted instead from another degree.
	function degFrom(deg, home) {
		var a = DEG[deg], h = DEG[home], hit = null;
		var letters = (a[0] - h[0] + 7) % 7, semis = (a[1] - h[1] + 12) % 12;
		Object.keys(DEG).forEach(function (d) { if (DEG[d][0] === letters && DEG[d][1] === semis) { hit = d; } });
		return hit || BY_SEMI[semis];
	}
	function romanOf(c) {
		var d = c.deg, acc = d.charAt(0) === 'b' ? '♭' : d.charAt(0) === '#' ? '♯' : '';
		var n = ROMAN[DEG[d][0]];
		return acc + (MINORISH[c.qual] ? n.toLowerCase() : n) + SUFFIX[c.qual];
	}
	// The loop heard from another of its chords, starting on that chord.
	function rehome(list, at) {
		var home = list[at].deg, out = [];
		for (var i = 0; i < list.length; i++) {
			var c = list[(at + i) % list.length];
			out.push({ deg: degFrom(c.deg, home), qual: c.qual, bars: c.bars });
		}
		return out;
	}

	var HEARD = {};
	function keyHearings(el, voicing) {
		var v = voicingFor(el, voicing), k = el.id + '|' + v;
		if (HEARD[k]) { return HEARD[k]; }
		var list = chords(el, v);
		var out = [{ offset: 0, mode: el.mode, own: true, label: el.roman, romans: el.romans.slice(), chords: list, via: null }];
		function add(h) {
			// one hearing for each key: the first found (another element, if one is this loop)
			if (out.some(function (x) { return x.offset === h.offset && x.mode === h.mode; })) { return; }
			out.push(h);
		}
		// a cadence is defined by where it arrives: one home, the course's own
		if (el.shape === 'cadence') { HEARD[k] = out; return out; }
		hearings(el, 0, v).forEach(function (h) {
			if (h.el.homeAbsent || h.el.shape === 'cadence') { return; }
			add({ offset: h.tonicPc, mode: h.el.mode, own: false, label: h.el.roman, romans: h.el.romans.slice(), chords: chords(h.el, v), via: h.el.id });
		});
		if (el.hear) {
			var mine = outside(list, el.mode);
			list.forEach(function (c, i) {
				var mode = HOMELY[c.qual], offset = DEG[c.deg][1] % 12;
				if (!mode || (offset === 0 && mode === el.mode)) { return; }
				var heard = rehome(list, i), n = outside(heard, mode);
				if (n === 0 || n < mine) {
					var romans = heard.map(romanOf);
					add({ offset: offset, mode: mode, own: false, label: romans.join(' '), romans: romans, chords: heard, via: null });
				}
			});
		}
		HEARD[k] = out;
		return out;
	}
	// The ids of the elements that are this sound (itself among them), leaving out any with home absent.
	function sameSound(el, voicing) {
		var out = [el.id];
		if (el.shape === 'cadence') { return out; }
		hearings(el, 0, voicingFor(el, voicing)).forEach(function (h) { if (!h.el.homeAbsent && h.el.shape !== 'cadence' && out.indexOf(h.el.id) === -1) { out.push(h.el.id); } });
		return out;
	}
	// Something spell() and tip() can be given for a hearing: the element itself, or the loop as heard from elsewhere.
	function hearingElement(el, h) {
		if (h.own) { return el; }
		if (h.via) { return BY_ID[h.via]; }
		return { id: el.id, stage: el.stage, roman: h.label, name: el.name, rel: el.rel, tri: h.chords, sev: null, tip: '', romans: h.romans, mode: h.mode, kind: el.kind, long: el.long };
	}
	// "A minor", "G major": the key of a hearing when the course's home is on keyPc.
	function keyName(el, h, keyPc) {
		var pc = (keyPc + h.offset) % 12;
		return spell(hearingElement(el, h), pc, 'triads').tonic + ' ' + h.mode;
	}

	function parts(name) {
		var li = LETTERS.indexOf(name.charAt(0));
		var acc = (name.split('♯').length - 1) - (name.split('♭').length - 1);
		return { li: li, pc: ((NATURAL[li] + acc) % 12 + 12) % 12 };
	}

	function accidental(n) { return n === 0 ? '' : n > 0 ? new Array(n + 1).join('♯') : new Array(-n + 1).join('♭'); }

	function degreeNote(tonicName, deg) {
		var p = parts(tonicName), d = DEG[deg];
		var li = (p.li + d[0]) % 7;
		var acc = (((p.pc + d[1]) - NATURAL[li]) % 12 + 12) % 12;
		if (acc > 6) { acc -= 12; }
		return { name: LETTERS[li] + accidental(acc), acc: acc };
	}

	// Pick the tonic name that spells things most simply (F♯m to D, not G♭m to E♭♭),
	// counting the chord roots and any notes the listen-for line names.
	function tonicName(el, tonicPc, voicing) {
		var degs = chords(el, voicing).map(function (c) { return c.deg; });
		el.tip.replace(TIP_NOTE, function (m, deg) { degs.push(deg); return m; });
		var best = null, bestScore = Infinity;
		TONIC_NAMES[tonicPc].forEach(function (name) {
			var score = 0;
			degs.forEach(function (deg) {
				var a = Math.abs(degreeNote(name, deg).acc);
				score += a + (a > 1 ? 10 : 0);
			});
			if (score < bestScore) { best = name; bestScore = score; }
		});
		return best;
	}

	function spell(el, tonicPc, voicing) {
		var list = chords(el, voicing);
		var tonic = tonicName(el, tonicPc, voicing);
		var romans = el.romans;
		return {
			tonic: tonic,
			chords: list.map(function (c, i) {
				return { name: degreeNote(tonic, c.deg).name + QUAL[c.qual].suffix, roman: romans[i], bars: c.bars };
			})
		};
	}

	function tip(el, tonicPc, voicing) {
		var tonic = tonicName(el, tonicPc, voicing);
		return el.tip.replace(TIP_NOTE, function (m, deg) { return degreeNote(tonic, deg).name; });
	}

	// What the chords fix and what they leave open, counted from home. Fixed: every note some chord
	// sounds. Open: a degree number (2, 4, 6, 7...) none of them sounds in any form, so which version
	// of it to play is the player's choice.
	var DEG_ORDER = ['1', '#1', 'b2', '2', 'b3', '3', '4', '#4', 'b5', '5', '#5', 'b6', '6', 'b7', '7'];
	var BY_SEMI = { 0: '1', 1: 'b2', 2: '2', 3: 'b3', 4: '3', 5: '4', 6: '#4', 7: '5', 8: 'b6', 9: '6', 10: 'b7', 11: '7' };
	// The degree from home that one note of a chord is ("3", "b7"...): c is {deg, qual}, i counts up the chord from its root.
	function toneDegree(c, i) {
		var root = DEG[c.deg], semi = (root[1] + QUAL[c.qual].tones[i]) % 12;
		// spelt by its place in the chord (a third is two letters above the root, a fifth four...)
		var steps = [0, 2, 4, 6, 1, 3, 5][Math.min(i, 6)];
		if (c.qual === 'sus2' && i === 1) { steps = 1; }
		if (c.qual === 'sus4' && i === 1) { steps = 3; }
		if ((c.qual === '6' || c.qual === 'm6') && i === 3) { steps = 5; }
		var letter = (root[0] + steps) % 7, name = null;
		DEG_ORDER.forEach(function (d) { if (DEG[d][1] % 12 === semi && DEG[d][0] === letter) { name = d; } });
		return name || BY_SEMI[semi];
	}
	// Every chord of an element as the degrees from home it sounds: [['1', '3', '5'], ['4', '6', '1'], ...].
	function chordDegrees(el, voicing) {
		return chords(el, voicing).map(function (c) { return QUAL[c.qual].tones.map(function (t, i) { return toneDegree(c, i); }); });
	}
	function degrees(el, voicing) {
		var sounded = {}, numbers = {};
		chords(el, voicing).forEach(function (c) {
			QUAL[c.qual].tones.forEach(function (t, i) {
				var semi = (DEG[c.deg][1] + t) % 12, name = toneDegree(c, i);
				sounded[semi] = sounded[semi] || name;
				numbers[DEG[name][0]] = true;
			});
		});
		var fixed = Object.keys(sounded).map(function (k) { return sounded[k]; });
		fixed.sort(function (a, b) { return DEG[a][1] - DEG[b][1] || DEG[a][0] - DEG[b][0]; });
		var open = [];
		for (var n = 0; n < 7; n++) { if (!numbers[n]) { open.push(n + 1); } }
		return { fixed: fixed, open: open };
	}

	function stageLabel(n) {
		var st = STAGES[n - 1];
		return !st ? '' : (st.more || st.was) ? 'More molecules. ' + st.name : 'Stage ' + n + '. ' + st.name;
	}

	/*
	 * CONTRAST. "Drill the element back to back against a neighbour already owned, usually one that
	 * differs by a single note." These are the neighbours each card of the Guide names under
	 * "Contrast with" (where both are loops the app can play, and are not simply the same loop heard
	 * from another home), and a few for the further molecules.
	 */
	var PAIRS = [
		['major-home', 'dominant-home'], ['dominant-home', 'minor-home'], ['major-home', 'minor-home'],
		['major-lean', 'dorian-lean'], ['major-lean', 'blues-lean'], ['dorian-lean', 'minor-lean'],
		['major-pull', 'mixolydian-pull'], ['modal-minor-pull', 'functional-minor-pull'],
		['parent-molecule', 'backwards-cadence'], ['parent-molecule', 'mixolydian-cadence'], ['backwards-cadence', 'cadential-cell'],
		['modal-minor-molecule', 'functional-minor-molecule'], ['cadential-cell', 'minor-cadence'], ['cadential-cell', 'cadence-as-a-comma'],
		['relative-shadow', 'upper-shadow'], ['relative-shadow', 'relative-major'], ['upper-shadow', 'major-pull'], ['dark-shadow', 'minor-lean'],
		['fifties-progression', 'fifties-strengthened'], ['fifties-progression', 'pop-axis'], ['rising-line', 'surprise-shadow'],
		['rising-line', 'parent-molecule'], ['long-cycle', 'cadential-cell'], ['long-cycle', 'chain-of-dominants'],
		['mixolydian-shift', 'mixolydian-pull'], ['mixolydian-shift', 'minor-shift'], ['neo-soul-shift', 'major-lean'],
		['neo-soul-shift', 'lydian-shift'], ['phrygian-shift', 'minor-shift'],
		['modal-descent', 'andalusian-cadence'],
		['turnaround', 'fifties-strengthened'], ['v-of-iv', 'major-lean'], ['borrowed-minor-lean', 'major-lean'],
		['backdoor-cadence', 'cadential-cell'], ['flat-mediant', 'upper-shadow'], ['major-mediant', 'upper-shadow'],
		['flat-submediant', 'relative-shadow'], ['altered-dominant', 'cadential-cell'], ['tritone-substitution', 'cadential-cell'],
		['twelve-bar-blues', 'jazz-blues'], ['twelve-bar-blues', 'blues-revisited'], ['twelve-bar-blues', 'minor-blues'], ['blues-revisited', 'jazz-blues'],
		['aeolian-cadence', 'lift'], ['dorian-loop', 'modal-descent'], ['minor-rock-cell', 'rock-cell'], ['dorian-shift', 'neo-soul-shift'],
		['fifties-in-minor', 'fifties-progression'], ['mixolydian-sway', 'parent-molecule'],
		['axis-lean-first', 'pop-axis'], ['falling-shadows', 'fifties-progression'], ['axis-with-ii', 'pop-axis'], ['climb', 'walk-down'],
		['climb', 'rising-line'], ['gospel-turn', 'falling-shadows'],
		['three-six-two-five', 'turnaround'], ['ii-v-into-iv', 'v-of-iv'], ['diminished-passing-chord', 'turnaround'],
		['minor-blues-turn', 'andalusian-cadence'], ['line-cliche', 'minor-home']
	];

	/*
	 * BEFORE AND AFTER. Stage 9's elements are operations on something already owned. "before" is what
	 * each was made from (the Guide's "Contrast with"): an element, or where the catalogue has no such
	 * loop, the chords written out.
	 */
	var CHANGES = [
		{ after: 'turnaround', before: 'fifties-strengthened' },
		{ after: 'v-of-v-detour', before: { roman: 'I ii IV I', name: 'The same loop with ii as it comes', chords: '1.M.1 2.m.1 4.M.1 1.M.1' } },
		{ after: 'descending-soul-cycle', before: { roman: 'IV iii vi', name: 'The same loop with iii as it comes', chords: '4.M.1 3.m.1 6.m.2' } },
		{ after: 'chain-of-dominants', before: 'long-cycle' },
		{ after: 'v-of-iv', before: 'major-lean' },
		{ after: 'borrowed-minor-lean', before: 'major-lean' },
		{ after: 'minor-plagal-cadence', before: { roman: 'IV I', name: 'The plain plagal cadence', chords: '4.M.2 1.M.2' } },
		{ after: 'creep-progression', before: { roman: 'I iii IV', name: 'The diatonic version', chords: '1.M.1 3.m.1 4.M.2' } },
		{ after: 'backdoor-cadence', before: 'cadential-cell' },
		{ after: 'flat-mediant', before: 'upper-shadow' },
		{ after: 'major-mediant', before: 'upper-shadow' },
		{ after: 'flat-submediant', before: 'relative-shadow' },
		{ after: 'altered-dominant', before: 'cadential-cell' },
		{ after: 'tritone-substitution', before: 'cadential-cell' }
	];
	PAIRS.forEach(function (p) { if (!BY_ID[p[0]] || !BY_ID[p[1]]) { throw new Error('A contrast pair names an element the catalogue has not got: ' + p.join(' / ')); } });
	CHANGES.forEach(function (c) {
		if (!BY_ID[c.after] || (typeof c.before === 'string' && !BY_ID[c.before])) { throw new Error('A transformation names an element the catalogue has not got: ' + c.after); }
		// a "before" that is not an element is made into something that can be played like one
		if (typeof c.before !== 'string') {
			var b = c.before, tri = parseChords(b.chords);
			c.before = { id: 'before-' + c.after, stage: 0, roman: b.roman, name: b.name, rel: '', kind: 'molecule', tri: tri, sev: null, tip: '', optional: false, aliases: [], romans: b.roman.split(' '), long: 'repeat', file: '', loose: true };
		} else { c.before = BY_ID[c.before]; }
		c.after = BY_ID[c.after];
	});
	// (a pair with an element that is out of the app is out too)
	PAIRS = PAIRS.filter(function (p) { return !BY_ID[p[0]].retired && !BY_ID[p[1]].retired || BY_ID[p[0]].kind === 'form' || BY_ID[p[1]].kind === 'form'; });
	// The pairs and the transformations a mix allows: both of a pair's elements have to be in it; a
	// transformation only has to be in it itself (what it was made from is given, not asked).
	function pairsFor(ids) {
		return PAIRS.filter(function (p) { return ids.indexOf(p[0]) !== -1 && ids.indexOf(p[1]) !== -1; });
	}
	function changesFor(ids) {
		return CHANGES.filter(function (c) { return ids.indexOf(c.after.id) !== -1; });
	}

	HE.KEYS = KEYS;
	HE.STAGES = STAGES;
	HE.ELEMENTS = ELEMENTS;     // what the app offers
	HE.ALL = ALL;               // and what it still knows by name (the forms and extra homes, while they are out)
	HE.isActive = function (id) { return !!BY_ID[id] && !BY_ID[id].retired; };
	HE.keyHearings = keyHearings;
	HE.sameSound = sameSound;
	HE.hearingElement = hearingElement;
	HE.keyName = keyName;
	HE.SHOW_FORMS = SHOW_FORMS;
	HE.QUAL = QUAL;
	HE.chords = chords;
	HE.byId = function (id) { return BY_ID[id] || null; };
	HE.keyByPc = function (pc) { for (var i = 0; i < KEYS.length; i++) { if (KEYS[i].pc === pc) { return KEYS[i]; } } return null; };
	HE.stage = function (n) { return STAGES[n - 1]; };
	HE.voicingFor = voicingFor;
	HE.sequence = sequence;
	HE.bars = bars;
	HE.hearings = hearings;
	HE.spell = spell;
	HE.tip = tip;
	HE.degrees = degrees;
	HE.chordDegrees = chordDegrees;
	HE.stageLabel = stageLabel;
	// How an element is spoken of: its numerals first, then the words. "I IV, the major lean".
	HE.label = function (el) { return el.roman + ', ' + el.name.charAt(0).toLowerCase() + el.name.slice(1); };
	HE.PAIRS = PAIRS;
	HE.CHANGES = CHANGES;
	HE.pairsFor = pairsFor;
	HE.changesFor = changesFor;
	// Two of the Guide's pages are about a form whose element has a different id.
	HE.FORM_CARDS = { 'twelve-bar-blues-the-first-compound': 'twelve-bar-blues', 'quick-change-and-turnaround': 'blues-revisited' };
}(typeof window !== 'undefined' ? window : globalThis));
