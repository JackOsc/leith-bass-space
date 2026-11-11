/*
 * Leith Bass Space: the bass on paper. Note names, where a line sits on the
 * neck, bass clef with TAB beneath, and a fretboard that can be tapped.
 *
 * The Harmonic Elements trainer and the LBS Ear Trainer both have to show a
 * bassist what the notes are. Jack's rule is "stave and TAB, always", and the
 * pupil says how many strings their bass has. This file does that work and
 * never touches the page: every function hands back plain data or a string of
 * SVG, so it runs in Node as well as in a browser.
 *
 * ONE THING TO HOLD ON TO. Bass guitar is written an octave above where it
 * sounds. Every pitch that goes into or comes out of this file is the SOUNDING
 * pitch as a MIDI number (the open E string is 28). The octave is added at the
 * moment of engraving and nowhere else.
 *
 * The notation is Jack's worksheet engraving (render.js in the notation tool)
 * brought into the browser: the same proportions and the same Bravura shapes,
 * on its own cream panel. The panel is never inverted, on a dark page or a
 * light one. The fretboard is the other way round: it belongs to the dark
 * instrument register and takes its colours from the page.
 *
 * LBSBass.TUNINGS                 open strings, lowest first, for 4, 5 and 6 strings
 * LBSBass.tuning(strings)         the list for 4, 5 or 6 (anything else gives 4)
 * LBSBass.stringName(strings, i)  'E', 'A', 'D', 'G', 'B' or 'C'; 0 is the lowest string
 * LBSBass.parse(name)             'Eb' or 'E♭' -> {letter: 'E', acc: -1, pc: 3}, or null
 * LBSBass.show(name)              the same name with real ♭ and ♯ signs ('Ebmaj7' and 'b3' work too)
 * LBSBass.spell(tonic, degree)    the ♭3 of E♭ -> {name: 'G♭', letter, acc, pc, simplified}
 * LBSBass.nameOf(midi, prefer)    a bare number's name, 'flat' (the default) or 'sharp'
 * LBSBass.spots(midi, o)          every {string, fret} that sounds this pitch
 * LBSBass.place(midis, o)         one {string, fret} for each note of a line, as a player would
 * LBSBass.stave(notes, o)         SVG: bass clef and TAB, note for note, on the cream panel
 * LBSBass.fretboard(o)            SVG: a neck with marks on it, and tap targets if asked
 * LBSBass.VERSION
 *
 * The options are listed above each function. What the stave does not do:
 * rhythms other than quarter notes, key signatures, ties, two notes at once.
 *
 * The music symbols are outlines from the Bravura font, Copyright © 2015,
 * Steinberg Media Technologies GmbH (http://www.steinberg.net/), with Reserved
 * Font Name "Bravura". Bravura is licensed under the SIL Open Font License,
 * Version 1.1, which is available with a FAQ at http://scripts.sil.org/OFL
 */
(function (root) {
	'use strict';

	var LETTERS = 'CDEFGAB';
	var NATURAL = [0, 2, 4, 5, 7, 9, 11];
	var FLATS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
	var SHARPS = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
	var TUNINGS = { 4: [28, 33, 38, 43], 5: [23, 28, 33, 38, 43], 6: [23, 28, 33, 38, 43, 48] };

	function mod(a, n) { return ((a % n) + n) % n; }
	function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
	function rep(s, n) { var out = ''; while (n-- > 0) { out += s; } return out; }
	function r1(v) { return Math.round(v * 10) / 10; }
	function esc(s) {
		return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	}

	/* ---------- names ---------- */

	function signs(acc) { return rep(acc < 0 ? '♭' : '♯', Math.abs(acc)); }

	function parse(name) {
		var m = /^([A-G])(b{0,3}|#{1,3}|x)$/.exec(String(name == null ? '' : name)
			.replace(/\s+/g, '').replace(/𝄫/g, 'bb').replace(/𝄪/g, 'x')
			.replace(/♭/g, 'b').replace(/♯/g, '#').replace(/♮/g, ''));
		if (!m) { return null; }
		var a = m[2], acc = a === 'x' ? 2 : a.charAt(0) === '#' ? a.length : -a.length;
		return { letter: m[1], acc: acc, pc: mod(NATURAL[LETTERS.indexOf(m[1])] + acc, 12) };
	}

	// A plain note name comes back tidied. Anything else (a chord symbol, a
	// degree) has its # signs changed, and a b only where it must mean a flat:
	// in front of a number, or straight after a note letter, unless a word
	// carries on ("Ebmaj7" and "Abm" are chords, "Above" is not).
	function show(name) {
		var p = parse(name);
		if (p) { return p.letter + signs(p.acc); }
		return String(name == null ? '' : name).replace(/#/g, '♯')
			.replace(/([A-G])(b+)(?![b-ce-ln-rt-z])/g, function (all, letter, bs) { return letter + rep('♭', bs.length); })
			.replace(/b(?=[b♭]*\d)/g, '♭');
	}

	// Spelt by function. The letter is counted up from the tonic's letter (a
	// third is always two letters on), then the accidental is whatever makes
	// the pitch right. If that would take a double sharp or a double flat, the
	// plain name is given instead, because bass players read simple names.
	// A single sharp or flat is never changed: the 7 of F♯ is E♯.
	function spell(tonic, degree) {
		var t = parse(tonic);
		var m = /^([b#♭♯]*)(\d+)$/.exec(String(degree).replace(/^R$/i, '1'));
		if (!t || !m || m[2] < 1) { return null; }
		var up = (m[2] - 1) % 7, alt = 0, i;
		for (i = 0; i < m[1].length; i++) { alt += /[b♭]/.test(m[1].charAt(i)) ? -1 : 1; }
		var li = (LETTERS.indexOf(t.letter) + up) % 7;
		var pc = mod(t.pc + NATURAL[up] + alt, 12);
		var acc = mod(pc - NATURAL[li] + 6, 12) - 6;
		var simple = acc > 1 || acc < -1;
		var out = simple ? parse((acc < 0 ? FLATS : SHARPS)[pc]) : { letter: LETTERS.charAt(li), acc: acc, pc: pc };
		out.name = out.letter + signs(out.acc);
		out.simplified = simple;
		return out;
	}

	function nameOf(midi, prefer) { return (prefer === 'sharp' ? SHARPS : FLATS)[mod(Math.round(midi), 12)]; }

	// For a screen reader, which may say nothing at all for ♭.
	function say(name) { return name.replace(/♭/g, ' flat').replace(/♯/g, ' sharp'); }

	/* ---------- where on the neck ---------- */

	// A list of open strings is taken as it is, so a page can pass its own tuning.
	function tuning(strings) {
		return (strings && strings.length && typeof strings !== 'string' ? strings : TUNINGS[strings] || TUNINGS[4]).slice();
	}
	function tuningOf(o) { return tuning(o.tuning && o.tuning.length ? o.tuning : o.strings); }
	function stringName(strings, index) {
		var t = tuning(strings);
		return index >= 0 && index < t.length ? nameOf(t[index]) : '';
	}

	// o: {strings, tuning, maxFret: 15}. Lowest string first.
	function spots(midi, o) {
		o = o || {};
		var t = tuningOf(o), max = o.maxFret == null ? 15 : o.maxFret, out = [], s, f;
		for (s = 0; s < t.length; s++) {
			f = midi - t[s];
			if (f >= 0 && f <= max) { out.push({ string: s, fret: f }); }
		}
		return out;
	}

	// o: {strings, tuning, maxFret: 15, span: 4, open: true, around: null}
	//   span    how many frets the hand covers without moving (one finger a fret)
	//   open    whether open strings may be used (if not, an open string is
	//           still given for a note that can be played no other way)
	//   around  the fret the first finger would like to sit at; null means low
	//
	// The hand is thought of as sitting in a position: first finger at fret p,
	// covering p to p + span - 1. Open strings belong to every position. The
	// line is walked once, keeping for every position the cheapest way of
	// having got there, where a shift costs far more than anything else, a
	// longer shift more than a shorter one, then a high position more than a
	// low one, then a high string more than a low one (the lower string is the
	// fuller sound). So a line that fits one position stays in it, and one
	// that does not moves as seldom and as little as it can.
	function place(midis, o) {
		o = o || {};
		var max = o.maxFret == null ? 15 : o.maxFret, span = o.span || 4;
		var top = Math.max(1, max - span + 1);
		var want = o.around == null ? null : clamp(o.around, 1, top);
		var out = [], line = [], i, k, p, q, f, list, c, best, cost, from, last;

		for (i = 0; i < midis.length; i++) {
			out.push(null);
			list = midis[i] == null || isNaN(midis[i]) ? [] : spots(+midis[i], o);
			if (!list.length) { continue; }
			// the same pitch twice running is one decision, so it cannot be split by a shift
			last = line[line.length - 1];
			if (last && last.midi === +midis[i]) { last.at.push(i); continue; }
			c = [];
			for (p = 1; p <= top; p++) {
				c[p] = null;
				for (k = 0; k < list.length && !c[p]; k++) {
					f = list[k].fret;
					if ((f >= p && f < p + span) || (f === 0 && (o.open !== false || list.length === 1))) { c[p] = list[k]; }
				}
			}
			line.push({ midi: +midis[i], at: [i], c: c, cost: [], from: [] });
		}

		for (i = 0; i < line.length; i++) {
			for (p = 1; p <= top; p++) {
				c = line[i].c[p];
				best = c && !i ? 0 : Infinity;
				from = 0;
				for (q = 1; c && i && q <= top; q++) {
					cost = line[i - 1].cost[q] + (q === p ? 0 : 1e8 + Math.abs(p - q) * 1e4);
					if (cost < best) { best = cost; from = q; }
				}
				line[i].cost[p] = c ? best + (want == null ? p : Math.abs(p - want)) + c.string * 1e-4 : Infinity;
				line[i].from[p] = from;
			}
		}

		if (line.length) {
			last = line[line.length - 1].cost;
			for (p = 1, q = 2; q <= top; q++) { if (last[q] < last[p]) { p = q; } }
			for (i = line.length - 1; i >= 0; i--) {
				c = line[i].c[p];
				for (k = 0; k < line[i].at.length; k++) { out[line[i].at[k]] = { string: c.string, fret: c.fret }; }
				p = line[i].from[p] || p;
			}
		}
		return out;
	}

	/* ---------- the engraving ---------- */

	// The house style, in the notation tool's own units: a stave space is 24
	// and a TAB space 38. One unit is drawn 0.64 of a CSS pixel, which makes a
	// TAB number about 15 px tall and puts the closest notes about 34 px apart.
	var CREAM = '#F5EFE2', INK = '#292724', ORANGE = '#D86B25', ACCENT = '#A84912';
	var BODY = "var(--font-body,'Inter','Helvetica Neue',Arial,sans-serif)";
	var MONO = "'DejaVu Sans Mono',ui-monospace,Menlo,Consolas,'Liberation Mono',monospace";
	var K = 24 / 250;       // Bravura draws a stave space as 250 of its own units
	var HW = 295 * K / 2;   // half the width of a note head

	// Bravura outlines: [path, left edge, right edge], in the font's own units with y going up.
	var G = {
		clef: ['M252 262C78 262 0 135 0 39C0-41 42-110 123-110C186-110 229-66 229-4C229 60 182 100 133 100C106 100 96 93 83 93C70 93 67 101 67 111C67 151 127 224 229 224C335 224 381 120 381-37C381-140 359-260 297-356C237-449 134-534 10-605C1-610-5-615-5-623C-5-629-1-635 8-635C13-635 19-633 25-630C158-565 286-489 392-375C479-281 531-159 531-28C531 146 425 262 252 262ZM629 180C598 180 574 156 574 125C574 94 598 70 629 70C660 70 684 94 684 125C684 156 660 180 629 180ZM630-71C599-71 576-94 576-125C576-156 599-179 630-179C661-179 684-156 684-125C684-94 661-71 630-71Z', -5, 684],
		head: ['M97-125C186-125 295-43 295 42C295 93 255 125 198 125C88 125 0 44 0-42C0-94 43-125 97-125Z', 0, 295],
		flat: ['M12-170C15-174 18-175 21-175C24-175 27-173 27-173C57-156 81-129 106-112C195-50 226 11 226 57C226 114 182 150 136 153C129 153 122 152 115 150C104 147 92 143 81 136C75 131 64 122 59 122C57 122 56 122 54 123C47 126 43 133 43 140C44 162 50 402 50 422C50 433 41 439 31 439C17 439 1 429 0 411C0 411 4-160 12-170ZM47-81C47-81 44-21 44 19C44 35 45 47 46 51C50 63 76 85 90 93C99 98 108 100 116 100C126 100 135 96 141 89C151 78 157 61 157 42C157 24 152 3 140-18C127-42 98-74 68-93C64-95 61-96 58-96C49-96 47-86 47-81Z', 0, 226],
		natural: ['M141 181C139 181 138 180 137 180C137 180 73 157 47 157C41 157 37 158 37 162V329C37 336 31 341 25 341H12C5 341 0 336 0 329V-186C0-192 3-195 8-195C9-195 11-194 12-194C12-194 14-194 15-193C29-187 85-163 114-163C124-163 131-166 131-174V-323C131-330 136-335 143-335H156C162-335 168-330 168-323V179C168 184 164 187 160 187C159 187 157 187 156 186ZM37 39C37 53 98 79 122 79C128 79 131 78 131 74V-29C131-47 74-70 49-70C42-70 37-68 37-64Z', 0, 168],
		sharp: ['M237 118C244 121 249 129 249 135V206C249 211 246 214 242 214C240 214 239 214 237 213C237 213 217 205 212 204C205 204 198 209 198 217V339C198 345 192 350 184 350C174 350 168 345 168 339V209C167 199 164 186 155 180C143 173 109 159 92 155C83 155 80 167 80 175V295C80 301 73 306 66 306C56 306 50 301 50 295V160C50 146 44 136 38 133C32 130 12 122 12 122C5 120 0 112 0 106V35C0 29 3 26 8 26C9 26 11 27 12 27C12 27 27 33 34 37C35 37 36 38 37 38C44 38 50 28 50 20V-79C50-90 45-99 39-102C33-104 12-113 12-113C5-115 0-123 0-129V-200C0-206 3-209 8-209C9-209 11-208 12-208C12-208 26-202 35-199C36-198 37-198 38-198C45-198 50-209 50-214V-337C50-343 56-348 63-348C73-348 80-343 80-337V-198C80-185 85-178 90-176L151-151C152-151 154-150 155-150C163-150 168-162 168-168V-293C168-299 174-304 181-304C192-304 198-299 198-293V-151C198-143 202-131 209-128C216-125 237-117 237-117C244-114 249-106 249-100V-29C249-24 246-21 242-21C240-21 239-21 237-22L211-32C205-32 198-26 198-14V79C198 86 203 105 211 108ZM168-45C162-65 115-85 92-85C86-85 81-83 80-80C78-76 77-54 77-30C77 1 78 36 80 44C82 61 128 82 153 82C160 82 166 80 168 76C170 71 172 46 172 19C172-8 170-36 168-45Z', 0, 249],
		rest: ['M78-38C94-58 108-77 121-98C123-102 127-110 127-112C127-113 127-115 126-116C124-120 120-121 115-121C111-121 103-119 99-118C94-118 88-115 83-115C40-115 1-158 1-211C1-261 44-310 117-366C125-372 135-375 143-375C150-375 157-373 158-369C159-366 160-364 160-362C160-353 152-345 144-338C131-338 120-311 118-302C115-294 114-285 114-276C114-245 129-210 161-204C166-203 171-203 177-203C206-203 239-214 255-220C256-220 257-221 258-221C261-222 263-222 265-222C268-222 270-221 270-218C270-206 244-173 233-161C195-115 164-78 164-22C164-18 165-13 165-9C169 49 205 97 231 138C234 143 235 148 235 153C235 163 231 172 231 172C231 172 83 348 66 365C61 370 54 373 48 373C38 373 28 366 28 352C28 347 29 342 32 336C36 325 93 274 93 202C93 165 78 122 33 75C23 65 19 54 19 46C19 32 29 22 29 22Z', 1, 270],
		t2: ['M421-91C421-79 416-77 409-77C401-77 398-81 396-87C396-88 395-89 395-90C385-114 377-133 356-133C351-133 346-132 339-130C326-125 319-124 309-119C289-111 242-95 201-95C188-95 175-97 164-101C186-65 271-35 293-29C308-25 350-17 383 10C407 29 426 58 426 102C426 149 406 183 380 205C329 248 251 254 229 254C202 254 168 253 142 247C107 240 72 219 48 191C31 170 20 145 20 118C20 104 23 90 29 75C44 44 75 20 111 20C172 20 181 83 181 108C181 168 112 171 112 191C114 205 132 229 191 229C280 229 281 162 281 133C281 95 269 60 247 31C211-17 183-41 134-71C79-106 40-155 23-218C23-220 22-222 22-224C22-235 29-248 40-255C43-257 46-257 48-257C70-257 82-196 141-196C181-196 196-250 285-250C328-250 405-246 421-91Z', 20, 426],
		t3: ['M213 248C208 248 203 249 198 249C112 249 26 192 26 139C26 106 45 62 107 58H112C156 58 178 90 178 123V131C175 168 150 170 145 172C140 174 125 172 125 186V190C127 207 158 215 167 215C252 215 260 162 260 138V131C260 57 201 28 138 25C128 24 114 19 114 8C114-4 131-4 139-4C254-4 263-82 263-95C263-201 209-213 187-213C183-213 179-212 178-212C170-211 151-211 150-196V-191C150-169 172-154 173-125C173-115 172-104 168-94C157-69 128-53 101-53C97-53 94-53 90-54C73-57 54-67 42-80C25-95 20-119 20-141C22-219 93-249 191-251H200C299-251 401-200 401-112V-105C400-91 398-77 392-64C388-54 381-44 373-35C367-27 359-20 349-14L328-2L295 7C290 8 287 8 285 12C284 14 284 15 284 17C284 21 285 25 288 26C299 29 310 30 319 35C334 42 347 49 358 62C374 80 380 103 380 126C380 218 255 245 213 248Z', 20, 401],
		t4: ['M362-74V140C362 148 361 157 350 157C341 157 336 155 330 148L235 33C231 28 226 22 226 10V-74H91C171-6 331 221 334 232C334 234 335 235 335 237C335 245 328 251 320 251C311 251 270 249 252 249C234 249 189 251 181 251C172 251 158 248 158 232C158 108 60-31 30-73L24-81C24-82 23-83 23-84C21-88 20-92 20-95C20-105 28-112 40-112H226V-175C226-202 204-210 186-210C170-210 163-219 163-229C163-239 167-250 182-250H395C405-250 415-243 415-229C415-215 403-209 393-209C383-209 362-203 362-171V-112H435C445-112 450-105 450-93C450-81 446-74 435-74Z', 20, 450],
		t5: ['M76 59C76 59 80 115 81 124C82 132 87 137 96 137H100C110 135 157 128 198 128C337 128 342 208 342 224C342 237 339 245 328 245C315 245 237 236 205 236C173 236 87 244 70 246C52 246 47 237 46 229L35 7V5C35-8 45-10 55-10C65-10 66-1 77 10C87 20 111 43 145 43C179 43 248 24 248-87C248-197 189-211 163-211C155-211 147-211 140-208C135-205 129-201 128-194C128-187 135-183 140-180C163-166 178-141 178-113C178-69 143-35 100-35C46-35 24-74 21-109C20-115 20-121 20-127C20-210 74-251 197-251C317-251 383-177 383-87C383 4 309 78 218 78C160 78 117 68 85 49C83 48 81 48 80 48C76 48 76 52 76 55Z', 20, 383],
		t6: ['M260 100C272 88 289 83 305 83C313 83 322 85 330 87C361 95 385 127 385 159C385 163 385 166 384 170C379 203 351 227 321 238C297 248 268 251 242 251C166 250 95 213 59 145C37 103 20 50 20 3V-1C21-47 29-99 51-139C72-177 106-218 145-235C170-246 200-249 225-249C270-249 320-242 356-213C391-185 414-140 414-95C414-39 384-5 352 19C325 39 294 50 263 50C231 50 198 38 172 15C170 13 168 13 166 13C160 13 157 21 157 37C160 222 219 227 240 227C260 227 273 222 273 212C273 198 254 186 248 174C243 165 241 155 241 145C241 130 246 115 256 104C257 102 259 101 260 100ZM222 2C254 2 281-48 281-110C281-172 254-222 222-222C190-222 164-172 164-110C164-48 190 2 222 2Z', 20, 414],
		t7: ['M421 204C421 231 421 244 404 244C403 244 387 240 383 233C376 221 362 164 337 164C312 164 265 249 182 249C124 249 109 226 95 213C81 200 75 196 68 195C60 195 47 209 42 219C40 223 35 226 30 226C25 226 20 223 20 214V49C20 49 21 33 31 33C39 33 42 42 46 53C56 78 69 136 114 136C154 136 202 61 260 61C288 61 302 76 310 82C313 84 317 86 319 86C323 86 325 83 326 77C326 49 249-7 189-78C151-122 120-180 120-219C120-240 120-250 139-250C157-250 179-241 204-241C229-241 276-250 286-250C296-250 302-242 302-213C302-46 421 97 421 200Z', 20, 421]
	};

	function ln(x1, y1, x2, y2, more) {
		return '<line x1="' + r1(x1) + '" y1="' + r1(y1) + '" x2="' + r1(x2) + '" y2="' + r1(y2) + '"' + (more || '') + '/>';
	}
	function box(x, y, w, h, more) {
		return '<rect x="' + r1(x) + '" y="' + r1(y) + '" width="' + r1(w) + '" height="' + r1(h) + '"' + (more || '') + '/>';
	}
	function txt(x, y, s, more) {
		return '<text x="' + r1(x) + '" y="' + r1(y) + '"' + (more || '') + '>' + esc(s) + '</text>';
	}
	function glyph(name, x, y, more) {
		return '<path transform="translate(' + r1(x) + ' ' + r1(y) + ') scale(.096 -.096)" d="' + G[name][0] + '"' + (more || '') + '/>';
	}
	// One figure of a time signature, centred on cx. Only 2 to 7 are carried.
	function figure(n, cx, y) {
		var g = G['t' + n];
		return glyph('t' + n, cx - (g[1] + g[2]) / 2 * K, y);
	}

	// notes: [{midi, name, string, fret, label, chord, mark, bar, rest}]
	//   midi          the sounding pitch (every note but a rest needs it)
	//   name          the spelling, 'E♭'; left out, it is nameOf(midi, o.prefer)
	//   string, fret  where to play it; if any note lacks them the whole line goes to place()
	//   label         a short text in a row under the stave, '♭3' or 'R'
	//   chord         a chord symbol above the stave at this note
	//   mark          true draws the note in orange, with a ring round its fret number
	//   bar           true puts a barline before this note (pitch studies only)
	//   rest          true is a silent beat: a quarter rest, and nothing in the TAB
	// o: {strings, tuning, meter, width, final, prefer, labels, title, stretch, scale}
	//   meter    null is a pitch study (black heads, no stems, no time signature);
	//            [4, 4] and the like (2 to 7 in a bar) give quarter notes with
	//            stems, a time signature, and barlines counted out from the meter
	//   width    640: the room there is, in CSS pixels. The line is broken into
	//            as many rows as it takes to keep the notes apart, never shrunk
	//   final    true: a final barline at the very end
	//   labels   'under' (the row between stave and TAB), or 'none'
	//   title    the accessible name; left empty, one is written from the notes
	//   stretch  false: a short line takes only the width it needs. True spreads
	//            it across the whole width, as the printed worksheets do
	//   scale    1: a multiplier on the drawn size, if a page wants it larger
	//   also maxFret, span, open and around, which are handed on to place()
	function stave(notes, o) {
		o = o || {};
		notes = notes || [];
		var tun = tuningOf(o), strings = tun.length;
		var meter = o.meter && o.meter.length > 1 ? o.meter : null;
		var per = meter ? Math.max(1, Math.round(meter[0] * 4 / meter[1])) : 0;
		var closing = o.final !== false, labelled = o.labels !== 'none' && o.labels !== false;
		var S = 0.64 * (o.scale || 1);
		var i, j, k, v, it, nt, p, x, y;

		// 1. Each note: where it is played, and where it is written.
		var midis = [], given = true, list = [], words = ['Bass clef and TAB.'];
		for (i = 0; i < notes.length; i++) {
			nt = notes[i];
			// a note with no pitch cannot be written, so it is drawn as a rest
			midis.push(nt.rest || nt.midi == null || isNaN(nt.midi) ? null : +nt.midi);
			if (midis[i] !== null && (nt.string == null || nt.fret == null)) { given = false; }
		}
		var placed = given ? null : place(midis, o);
		for (i = 0; i < notes.length; i++) {
			nt = notes[i];
			it = {
				i: i, rest: midis[i] === null, mark: !!nt.mark,
				label: labelled && nt.label != null ? show(nt.label) : '',
				chord: nt.chord ? show(nt.chord) : '',
				bar: i > 0 && (per ? i % per === 0 : !!nt.bar)
			};
			if (it.rest) {
				words.push('Rest.');
			} else {
				// A name that does not fit the pitch, or needs a double sharp or flat, is not trusted.
				p = parse(nt.name);
				v = midis[i] + 12;
				if (!p || p.acc > 1 || p.acc < -1 || mod(v - p.pc, 12)) { p = parse(nameOf(v, o.prefer)); }
				it.acc = p.acc;
				// How far above the bottom line (G) the head sits, counting lines and spaces.
				// The letter's own octave is used, so C♭ is written as a C and B♯ as a B.
				it.step = (Math.floor((v - p.acc) / 12) - 1) * 7 + LETTERS.indexOf(p.letter) - 18;
				it.spot = given ? { string: +nt.string, fret: +nt.fret } : placed[i];
				p = say(p.letter + signs(p.acc));
				v = it.spot;
				words.push(!v ? p + ', not on this neck.' :
					p + ' on the ' + say(stringName(tun, v.string)) + ' string, ' + (v.fret ? 'fret ' + v.fret : 'open') + '.');
			}
			list.push(it);
		}

		// 2. Bars, and which notes need a sign in front of them. There is no key
		// signature, so every letter starts each bar natural; a sign holds to the
		// barline and a natural cancels it. A pitch study with no barlines is one bar.
		var bars = [], bar, state, need = 54;
		for (i = 0; i < list.length; i++) {
			it = list[i];
			if (!bar || it.bar) { bar = []; bars.push(bar); state = {}; }
			bar.push(it);
			if (!it.rest) {
				it.sign = (state[it.step] || 0) !== it.acc;
				state[it.step] = it.acc;
				if (it.sign && it.acc) { need = 64; }   // a sharp or a flat needs elbow room
			}
		}

		// 3. Across the page. Notes are never closer than "need". Barline to first
		// note, and last note to barline, are the reference's 56 and 46, eased in
		// when room is short.
		var W = Math.max(380, Math.round((o.width || 640) / S));
		var pad = clamp(Math.round(W * 0.055), 30, 72), right = W - pad, tail = closing ? 16 : 0;
		function lead(first) { return pad + (meter && first ? 120 : 84); }
		function wide(count, g) { return Math.min(56, 0.8 * g) + Math.min(46, 0.66 * g) + (count - 1) * g; }

		// A bar too long for one row is cut into equal pieces; otherwise a bar is never split.
		var pieces = [], room = right - lead(true) - tail, parts, size, at;
		for (i = 0; i < bars.length; i++) {
			bar = bars[i];
			parts = 1;
			while (parts < bar.length && wide(Math.ceil(bar.length / parts), need) > room) { parts++; }
			for (k = 0, at = 0; k < parts; k++) {
				size = Math.ceil((bar.length - at) / (parts - k));
				pieces.push({ notes: bar.slice(at, at + size), cont: k > 0, end: k < parts - 1 ? '' : 'bar' });
				at += size;
			}
		}
		if (pieces.length) {
			pieces[pieces.length - 1].end = closing ? 'final' : meter && bar.length === per ? 'bar' : '';
		}

		// Fill each row in turn. Then try again pretending the rows are narrower,
		// and keep the narrowest that needs no more rows: that evens them out, so
		// eight notes on a phone come out as four and four, not six and two.
		function rowsAt(share) {
			var rows = [[]], used = 0, w, n;
			for (n = 0; n < pieces.length; n++) {
				w = wide(pieces[n].notes.length, need) + (n === pieces.length - 1 ? tail : 0);
				if (used && used + w > (right - lead(rows.length === 1)) * share) { rows.push([]); used = 0; }
				rows[rows.length - 1].push(pieces[n]);
				used += w;
			}
			return rows;
		}
		var rows = rowsAt(1), tried;
		for (v = 0.5; v < 1; v += 0.05) {
			tried = rowsAt(v);
			if (tried.length <= rows.length) { rows = tried; break; }
		}

		// A short line on one row takes only the width it needs.
		var gaps = 0, natural;
		if (rows.length === 1 && !o.stretch) {
			for (k = 0; k < pieces.length; k++) { gaps += pieces[k].notes.length - 1; }
			natural = lead(true) + (gaps ? 102 * pieces.length + 104 * gaps : 170 * Math.max(1, pieces.length)) + tail;
			if (natural < right) { right = natural; W = right + pad; }
		}

		// 4. Down the page, a row at a time, drawing as we go.
		var thin = '', ledger = '', thick = '', shapes = '', masks = '', frets = '', text = '';
		var y0 = 34, row, r, n, g, a, b, hi, lo, chords, labels, seen, top, bot, ly, tt, tb, tc, more, len, sx, e;
		for (r = 0; r < rows.length; r++) {
			row = rows[r];
			n = row.length;
			x = lead(!r);
			a = right - x - (r === rows.length - 1 ? tail : 0);
			for (k = 0, gaps = 0; k < n; k++) { gaps += row[k].notes.length - 1; }
			g = gaps ? (a - 102 * n) / gaps : 1e9;
			if (g < 70) { g = a / (1.46 * n + gaps); }
			b = Math.min(46, 0.66 * g);
			if (gaps) { a = Math.min(56, 0.8 * g); } else { b = a / n * 46 / 102; a = a / n - b; }

			hi = 36;
			lo = 48;
			chords = labels = false;
			seen = {};
			for (k = 0; k < n; k++) {
				x += a;
				for (j = 0; j < row[k].notes.length; j++) {
					it = row[k].notes[j];
					it.x = x;
					if (j < row[k].notes.length - 1) { x += g; }
					chords = chords || !!it.chord;
					labels = labels || !!it.label;
					if (it.rest) { continue; }
					// A row that starts part way through a bar says its sharps and flats again.
					if (!k && row[k].cont && it.acc && !seen[it.step]) { it.sign = true; }
					seen[it.step] = 1;
					// hi is the highest ink (a flat stands 42 above its note), lo the lowest head
					hi = Math.min(hi, 96 - it.step * 12 - (it.sign ? 42 : 12));
					lo = Math.max(lo, 96 - it.step * 12);
				}
				x += b;
				row[k].x = x;
			}

			// High notes push the stave down, low notes push the TAB down, so nothing collides.
			top = y0 + (chords ? Math.max(72, 40 - hi) : Math.max(10, 2 - hi));
			bot = top + 96;
			if (labels) { ly = Math.max(bot + 74, top + lo + 55); tt = ly + 50; } else { tt = Math.max(bot + 100, top + lo + 62); }
			tb = tt + 38 * (strings - 1);
			tc = (tt + tb) / 2;

			for (k = 0; k < 5; k++) { thin += ln(pad, top + k * 24, right, top + k * 24); }
			for (k = 0; k < strings; k++) { thin += ln(pad, tt + k * 38, right, tt + k * 38); }
			shapes += glyph('clef', pad, top + 24);
			for (k = 0; k < 3; k++) { text += txt(pad + 20, tc + (k - 1) * 27 + 6, 'TAB'.charAt(k)); }
			if (meter && !r && G['t' + meter[0]] && G['t' + meter[1]]) {
				shapes += figure(meter[0], pad + 94, top + 24) + figure(meter[1], pad + 94, top + 72) +
					figure(meter[0], pad + 85, tc - 24) + figure(meter[1], pad + 85, tc + 24);
			}

			for (k = 0; k < n; k++) {
				for (j = 0; j < row[k].notes.length; j++) {
					it = row[k].notes[j];
					x = it.x;
					more = it.mark ? ' fill="' + ORANGE + '"' : '';
					if (it.chord) {
						// set from the left of the head as on a lead sheet, unless that would run off the panel
						v = x - HW + it.chord.length * 14 > W - 14;
						text += txt(v ? x + HW : x - HW, y0 + 22, it.chord, ' font-size="24" fill="' + ACCENT + '" text-anchor="' + (v ? 'end' : 'start') + '"');
					}
					if (it.label) { text += txt(x, ly, it.label, it.mark ? ' fill="' + ACCENT + '"' : ''); }
					if (it.rest) {
						shapes += glyph('rest', x - 13, top + 48);
						continue;
					}
					y = bot - it.step * 12;
					for (v = top - 24; v >= y; v -= 24) { ledger += ln(x - 25, v, x + 25, v); }
					for (v = bot + 24; v <= y; v += 24) { ledger += ln(x - 25, v, x + 25, v); }
					if (it.sign) {
						e = it.acc < 0 ? 'flat' : it.acc > 0 ? 'sharp' : 'natural';
						shapes += glyph(e, x - HW - 7 - G[e][2] * K, y, more);
					}
					shapes += glyph('head', x - HW, y, more + ' data-note="' + it.i + '"');
					if (meter) {
						// Stems go down from the middle line upwards, and always reach the middle line.
						v = y <= top + 48;
						len = Math.max(66, Math.abs(y - top - 48));
						sx = v ? x - HW + 1 : x + HW - 1;
						thick += ln(sx, y, sx, v ? y + len : y - len, it.mark ? ' stroke="' + ORANGE + '"' : '');
					}
					p = it.spot;
					if (p && p.string >= 0 && p.string < strings) {
						// the number hides the line behind it; a marked note gets a ring as well as a colour
						v = tb - p.string * 38;
						len = String(p.fret).length > 1 ? 44 : 36;
						masks += it.mark ? box(x - len / 2, v - 17, len, 34, ' rx="17" stroke="' + ORANGE + '" stroke-width="2.4"') :
							box(x - len / 2, v - 16, len, 32, ' rx="5"');
						frets += txt(x, v + 9, p.fret, (it.mark ? ' fill="' + ACCENT + '"' : '') + ' data-note="' + it.i + '"');
					}
				}
				e = row[k].end;
				x = row[k].x;
				if (e === 'final') {
					thick += ln(right - 19.6, top, right - 19.6, bot) + ln(right - 19.6, tt, right - 19.6, tb) +
						ln(right - 5, top - 1.2, right - 5, bot + 1.2, ' stroke-width="10"') +
						ln(right - 5, tt - 1.2, right - 5, tb + 1.2, ' stroke-width="10"');
				} else if (e) {
					thick += ln(x, top, x, bot) + ln(x, tt, x, tb);
				}
			}
			y0 = tb + 100;
		}
		var H = Math.round(y0 - 54);

		return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="' +
			esc(o.title || words.join(' ')) + '"' + (o.stretch ? '' : ' style="max-width:' + Math.round(W * S) + 'px"') + '>' +
			box(3, 3, W - 6, H - 6, ' rx="26" fill="' + CREAM + '" stroke="' + ORANGE + '" stroke-width="6"') +
			'<g stroke="' + INK + '" stroke-width="2.4">' + thin + '</g>' +
			'<g stroke="' + INK + '" stroke-width="2.8">' + ledger + '</g>' +
			'<g stroke="' + INK + '" stroke-width="3.2">' + thick + '</g>' +
			'<g fill="' + INK + '">' + shapes + '</g>' +
			'<g fill="' + CREAM + '">' + masks + '</g>' +
			'<g fill="' + INK + '" text-anchor="middle" font-weight="700" font-size="24" style="font-family:' + MONO + '">' + frets + '</g>' +
			'<g fill="' + INK + '" text-anchor="middle" font-weight="600" font-size="21" style="font-family:' + BODY + '">' + text + '</g>' +
			'</svg>';
	}

	/* ---------- the fretboard ---------- */

	// The neck as TAB is read: lowest string at the bottom, nut on the left.
	// o: {strings, tuning, from, to, marks, tap, names, prefer, width, title}
	//   from, to  0 and 12: the frets shown. From 0 the open strings sit to the
	//             left of a heavy nut; higher up there is no nut, only the numbers
	//   marks     [{string, fret, label, kind}]; a label is drawn only if one is given
	//             'solid'  a filled disc, the default (a fixed degree, a right answer)
	//             'open'   a ring (an open degree: pencilled in)
	//             'lit'    an orange disc (sounding now, the current pick)
	//             'ring'   an orange ring (somewhere to go)
	//             'ghost'  a small faint dot, no label
	//             'wrong'  a ring with a stroke through it
	//   tap       true lays an unseen target over every string and fret shown,
	//             with data-fb="string,fret" and data-midi. The page listens
	//   names     true writes every note's name faintly where it lives
	//   width     640, in CSS pixels; one unit of the drawing is one pixel
	//   title     the accessible name; left empty, the marks are described
	// The colours come from the page (--lbs-fb-ink, -ground, -rule, -faint and
	// -orange) and fall back to the Shed's own, so no stylesheet is needed.
	var FB = {
		ink: 'var(--lbs-fb-ink,#F3F1EB)', ground: 'var(--lbs-fb-ground,#12151B)',
		rule: 'var(--lbs-fb-rule,rgba(243,241,235,.42))', faint: 'var(--lbs-fb-faint,rgba(243,241,235,.2))',
		orange: 'var(--lbs-fb-orange,#E87102)'
	};
	var HOW = { open: ', outlined', lit: ', lit', ring: ', ringed', wrong: ', crossed out' };
	function fill(c) { return ' style="fill:' + FB[c] + '"'; }
	function stroke(c, w) { return ' style="fill:' + (w < 0 ? 'none' : FB.ground) + ';stroke:' + FB[c] + ';stroke-width:' + Math.abs(w) + '"'; }
	function disc(x, y, r, more) { return '<circle cx="' + r1(x) + '" cy="' + r1(y) + '" r="' + r1(r) + '"' + more + '/>'; }

	function fretboard(o) {
		o = o || {};
		var tun = tuningOf(o), n = tun.length;
		var from = clamp(o.from | 0, 0, 36), to = clamp(o.to == null ? 12 : o.to | 0, from, 36);
		var W = +o.width || 640, gut = 18, cols = to - from + 1;
		var cell = (W - gut - 4) / cols;
		// Tap targets must be 40 high for a thumb. A drawing that is only looked at can sit closer.
		var gap = o.tap ? 40 : clamp(cell * 0.85, 26, 36);
		var rad = Math.max(4, Math.min(15, gap / 2 - 3, cell / 2 - 2));
		var top = gap / 2 + 4, bottom = top + gap * (n - 1), dots = bottom + gap / 2 + 8, H = Math.round(dots + 28);
		var marks = o.marks || [], taken = {}, said = [], out = '', s, f, i, x, y, m, size, label, kind;
		function cx(fret) { return gut + (fret - from + 0.5) * cell; }
		function cy(string) { return bottom - string * gap; }

		out += box(0, 0, W, H, ' rx="8"' + fill('ground'));
		// frets; the nut is the left edge of fret 1, so it is drawn whenever fret 1 is
		for (f = Math.max(from, 1); f <= to; f++) {
			x = gut + (f - from + 1) * cell;
			if (f === 1) { out += ln(x - cell, top - 9, x - cell, bottom + 9, ' style="stroke:' + FB.ink + ';stroke-width:' + r1(clamp(cell * 0.14, 3, 5)) + '"'); }
			else if (f === from) { out += ln(x - cell, top - 9, x - cell, bottom + 9, ' style="stroke:' + FB.faint + ';stroke-width:2"'); }
			out += ln(x, top - 9, x, bottom + 9, ' style="stroke:' + FB.faint + ';stroke-width:2"');
			// side dots under the board, as on the edge of a real neck, where no mark can cover them
			if (f % 12 === 0) { out += disc(cx(f) - 5, dots, 3, fill('rule')) + disc(cx(f) + 5, dots, 3, fill('rule')); }
			else if (f % 12 % 2 && f % 12 > 1 && f % 12 < 11) { out += disc(cx(f), dots, 3, fill('rule')); }
		}
		// strings, heavier towards the low side, each with its name
		for (s = 0; s < n; s++) {
			out += ln(gut, cy(s), W - 4, cy(s), ' style="stroke:' + FB.rule + ';stroke-width:' + r1(1.2 + 0.5 * (n - 1 - s)) + '"');
		}
		out += '<g text-anchor="middle" font-weight="600" style="font-family:' + BODY + '">';
		for (s = 0; s < n; s++) { out += txt(gut / 2, cy(s) + 4.6, stringName(tun, s), ' font-size="13"' + fill('ink')); }
		for (f = from; f <= to; f++) { out += txt(cx(f), dots + 19, f, ' font-size="12" fill-opacity=".72"' + fill('ink')); }

		for (i = 0; i < marks.length; i++) {
			m = marks[i] || {};
			s = +m.string;
			f = +m.fret;
			if (!(f >= from && f <= to && s >= 0 && s < n)) { continue; }
			kind = m.kind || 'solid';
			x = cx(f);
			y = cy(s);
			if (kind !== 'ghost') {
				taken[s + ',' + f] = 1;
				said.push(say(nameOf(tun[s] + f, o.prefer)) + ' on the ' + say(stringName(tun, s)) + ' string, ' +
					(f ? 'fret ' + f : 'open') + (HOW[kind] || '') + '.');
			}
			if (kind === 'ghost') { out += disc(x, y, Math.min(5, rad * 0.4), fill('rule')); continue; }
			out += kind === 'lit' ? disc(x, y, rad, fill('orange')) :
				kind === 'ring' ? disc(x, y, rad - 1.25, stroke('orange', 2.5)) :
				kind === 'open' || kind === 'wrong' ? disc(x, y, rad - 1, stroke('ink', 2)) : disc(x, y, rad, fill('ink'));
			label = m.label == null ? '' : show(m.label);
			if (label) {
				size = Math.max(8, rad * (label.length < 2 ? 1.05 : label.length < 3 ? 0.9 : 0.72));
				out += txt(x, y + size * 0.36, label, ' font-size="' + r1(size) + '"' + fill(kind === 'solid' || kind === 'lit' ? 'ground' : 'ink'));
			}
			if (kind === 'wrong') { out += ln(x - rad, y + rad, x + rad, y - rad, stroke('ink', -2)); }
		}

		if (o.names) {
			size = clamp(cell * 0.4, 8, 11);
			for (s = 0; s < n; s++) {
				for (f = from; f <= to; f++) {
					if (taken[s + ',' + f]) { continue; }
					label = nameOf(tun[s] + f, o.prefer);
					// a patch of ground behind each name, so the string does not run through it
					out += box(cx(f) - size * 0.9, cy(s) - size * 0.7, size * 1.8, size * 1.4, fill('ground')) +
						txt(cx(f), cy(s) + size * 0.36, label, ' font-size="' + r1(size) + '" fill-opacity=".55"' + fill('ink'));
				}
			}
		}
		out += '</g>';

		if (o.tap) {
			// Lowest string first, so the keyboard walks the neck in order of pitch. The targets
			// are drawn last, over the marks, and tile the board with no gaps between them.
			out += '<g fill="transparent" pointer-events="all" style="cursor:pointer">';
			for (s = 0; s < n; s++) {
				for (f = from; f <= to; f++) {
					out += box(cx(f) - cell / 2, cy(s) - gap / 2, cell, gap,
						' data-fb="' + s + ',' + f + '" data-midi="' + (tun[s] + f) + '" role="button" tabindex="0" aria-label="' +
						esc(say(stringName(tun, s)) + ' string, ' + (f ? 'fret ' + f : 'open') + ', ' + say(nameOf(tun[s] + f, o.prefer))) + '"');
				}
			}
			out += '</g>';
		}

		label = o.title || 'Bass neck, ' + n + ' strings, ' + (from ? 'frets ' + from : 'open strings') + ' to ' + (from ? '' : 'fret ') + to + '.' +
			(said.length ? ' ' + said.join(' ') : '');
		// With targets inside, it is a group of buttons; a picture would hide them from a screen reader.
		return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="' + (o.tap ? 'group' : 'img') +
			'" aria-label="' + esc(label) + '">' + out + '</svg>';
	}

	root.LBSBass = {
		VERSION: '1.0.0',
		TUNINGS: TUNINGS,
		tuning: tuning,
		stringName: stringName,
		parse: parse,
		show: show,
		spell: spell,
		nameOf: nameOf,
		spots: spots,
		place: place,
		stave: stave,
		fretboard: fretboard
	};
})(typeof window !== 'undefined' ? window : globalThis);
