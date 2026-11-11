/*
 * Harmonic Elements: the Guide's changes for 1.13.0, applied to he-guide.js after it is built.
 *
 *   node harmonic-elements-guide-patch-1.13.js path/to/assets/harmonic/he-guide.js
 *
 * he-guide.js is made by harmonic-elements-build-guide.py from the course text. Until the course text in
 * the Project (claude/harmonic-elements-course-text-revised-2026-10-28.md) carries these same changes, run
 * this after every rebuild. It is safe to run twice. What it does:
 *   1. The five "shift" cards are "steps" (Shift was retired as a relationship in 1.9.0).
 *   2. A page at the end of Part One, "12. Whose home is it?". DRAFT WORDING BY CLAUDE for Jack to rewrite.
 *   3. Cards for the eleven elements folded into Stages 6 to 9, in the course's form. WORDING BY CLAUDE.
 */
const fs = require('fs'), vm = require('vm');
const file = process.argv[2];
const src = fs.readFileSync(file, 'utf8');
const ctx = { }; ctx.globalThis = ctx; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(src, ctx);
const G = ctx.HE.GUIDE;

// 1. shifts become steps, wherever the five names are written
const NAMES = [['Mixolydian shift', 'Mixolydian step'], ['minor shift', 'minor step'], ['neo soul shift', 'neo soul step'], ['Lydian shift', 'Lydian step'], ['Phrygian shift', 'Phrygian step']];
let text = JSON.stringify(G), swaps = 0;
NAMES.forEach(([a, b]) => { const n = text.split(a).length - 1; swaps += n; text = text.split(a).join(b); });
const guide = JSON.parse(text);

// 2. the page
const A = (href, words) => '<a href="' + href + '" target="_blank" rel="noopener">' + words + '</a>';
const page = {
	id: 'method-whose-home-is-it',
	title: '12. Whose home is it?',
	html: [
		'<p>A set of chords does not have a home. A band gives it one: by which chord starts the phrase, which chord is held longest, where the drummer’s fill lands, and above all by what the bass does. Am, C, G and D over a bass that keeps returning to A is in A. The same four chords over a bass that keeps returning to G is in G. Nothing in the chords changed.</p>',
		'<p>That is why some loops in this course have two homes. It is not a flaw in the loop or in your ear. It is the bass player’s decision, which makes it your business more than anyone’s.</p>',
		'<h3 class="he-g-h">What the research says</h3>',
		'<p>People who study pop and rock harmony have found the same thing. Mark Richards looked at the four chords of the pop axis in every rotation and concluded that roman numerals struggle with them, because numerals are tied to one centre and the loop has more than one (' + A('https://mtosmt.org/ojs/index.php/mto/article/view/308/110', '“Tonal Ambiguity in Popular Music’s Axis Progressions”') + ', 2017). Mark Spicer describes a “fragile tonic”: the home chord is there, but weakened, for example by sitting in the middle of the phrase and not where phrases start or land (' + A('https://www.mtosmt.org/ojs/index.php/mto/article/view/342/112', '“Fragile, Emergent, and Absent Tonics in Pop and Rock Songs”') + ', 2017). Drew Nobile argues that some of these loops are not one key or the other but both at once, and Trevor de Clercq points out that working musicians in Nashville avoid the choice by numbering a minor home as six (' + A('https://mtosmt.org/ojs/index.php/mto/article/view/759', '“The Logic of Six-Based Minor”') + ', 2021).</p>',
		'<h3 class="he-g-h">What the Dojo does about it</h3>',
		'<ul><li><b>Name it</b> never leaves home in doubt. The band establishes it first: a cue (two bars of the home chord), a pedal (a low home note under the loop), or the band’s bass on the roots. A <b>home hit</b> lays one bar of the home chord over the loop whenever you ask.</li>' +
		'<li><b>Find home</b> gives you nothing. Where a loop has two homes it says so, and either counts. A home has to be one of the chords of the loop: a key whose own chord never sounds is not accepted.</li>' +
		'<li>After any answer, <b>Hear it from each home</b> plays the same chords with the bass on the roots, phrased from each home in turn.</li>' +
		'<li>Cadences (ii V I, the backdoor cadence, the minor cadence and the like) are defined by where they arrive. They have one home.</li></ul>',
		'<h3 class="he-g-h">What you do about it</h3>',
		'<p>Take one two homes loop, the Dorian loop or the pop axis. Play a bass line that makes the first home unmistakable: start your phrase on its root, return to it, land on it. Then, without the chords changing, do the same for the other home. When you can move the home at will, you own the loop.</p>'
	].join('')
};
guide.method = guide.method.filter(m => m.id !== page.id).concat([page]);

// 3. cards for the eleven elements folded into Stages 6 to 9. WORDING BY CLAUDE for Jack to fine tune.
//    Listening leads are from memory and must be checked against the recordings before a student edition.
vm.runInContext(fs.readFileSync(require('path').join(require('path').dirname(file), 'he-catalogue.js'), 'utf8'), ctx);
const HE = ctx.HE;
const SHOW = { '1': '1', '#1': '♯1', 'b2': '♭2', '2': '2', 'b3': '♭3', '3': '3', '4': '4', '#4': '♯4', 'b5': '♭5', '5': '5', '#5': '♯5', 'b6': '♭6', '6': '6', 'b7': '♭7', '7': '7' };
const CARDS = [
	['climb', 'rises a step, rises a step, rises a step, falls a fourth (as a loop)',
		'Home climbing through its shadows to the lean. Nothing here pulls: it is all one key, walked up a step at a time.',
		'C, D, E, F in the bass is the line already. Roots alone say everything. To add to it, approach each root from the note below, or hold a high C through all four chords and hear it change meaning.',
		'Every change is a step up, and the IV at the top leans back home.',
		'I iii IV V (the rising line), which skips the ii and ends on a pull.',
		'“Lean on Me”, “Like a Rolling Stone” (verse), “Here, There and Everywhere” (verse).'],
	['dorian-shift', 'rises a step, falls a step',
		'A minor vamp with light in it. The second chord brings the major sixth, which a plain minor key does not have.',
		'Cm to Dm. The A in the Dm chord is the Dorian note: C Dorian is C D E♭ F G A B♭. Play A♭ over this and it will sound wrong, which is the quickest way to learn why the mode matters.',
		'Two minor chords a tone apart, and the 6 at the top of the second one.',
		'i ♭VII (the minor step), where the second chord sits below home, and I ii (the neo soul step), the same move from a major home.',
		'“Moondance” (verse), “Light My Fire” (the solo section).'],
	['aeolian-cadence', 'rises a step, rises a step',
		'Arriving at a minor home from below, by two whole steps, with no leading note. Rock’s way of saying “the end” in minor.',
		'A♭, B♭, C in the bass. Stay inside C natural minor: B♭ rises to C by a tone, and a B natural would turn it into a different cadence. The same three chords heard from E♭ are IV V vi, a deceptive ending in major.',
		'Two whole steps up in the bass, landing on a minor chord.',
		'♭VI ♭VII I (the lift), where the same climb lands on a major chord.',
		'“All Along the Watchtower”, “Layla” (chorus), “Running Up That Hill”.'],
	['dorian-loop', 'rises a third, rises a fifth, rises a fifth, falls a fourth (as a loop)',
		'A minor loop that never darkens. The major IV at the end keeps lifting it.',
		'Cm, E♭, B♭, F. The F chord’s A natural is the Dorian sixth. This loop has two homes: from B♭ the same chords are ii IV I V. Play a line that returns to C, then one that returns to B♭, over the same chords.',
		'The 6 when the last chord arrives. Then ask whose home it is.',
		'i ♭VII ♭VI ♭VII (the modal descent), which stays in natural minor.',
		'“Mad World”, “Wonderwall” (verse), “Boulevard of Broken Dreams” (verse).'],
	['minor-rock-cell', 'rises a third, rises a step, falls a fourth',
		'Three chords and a riff. The bass climbs the first three notes of the minor pentatonic.',
		'C, E♭, F in the bass: 1, ♭3, 4. The F chord is major, so its third is A natural, the Dorian sixth, bright against a minor home. The minor pentatonic fits all three chords.',
		'The bass climbing 1, ♭3, 4, then the brightness inside the last chord.',
		'I ♭III IV (the rock cell), the same climb from a major home.',
		'“Smoke on the Water” (the riff), “The House of the Rising Sun” (its first three chords).'],
	['rock-cell', 'rises a third, rises a step, falls a fourth',
		'A major home with a chord borrowed from minor on the way to the lean. The clash between the two thirds is the sound of rock and blues.',
		'C, E♭, F. The C chord has E natural; the next chord’s root is E♭. Do not smooth it over. The bass can play the minor pentatonic throughout while the chord above home stays major.',
		'3 in the first chord, then ♭3 as the root of the second. The rub is the point.',
		'i ♭III IV (the minor rock cell).',
		'“Purple Haze” (verse), “Get It On”.'],
	['fifties-in-minor', 'falls a third, falls a third, rises a step, falls a fifth (as a loop)',
		'The fifties progression’s bass line from a minor home. The last chord is major, and it pulls.',
		'Cm, A♭, Fm, G. Natural minor for three chords, then B natural in the G chord: the leading note, the only note from outside the key. Aim for it.',
		'The 7 in the last chord, pulling home.',
		'I vi IV V (the fifties progression), and i ♭VII ♭VI V (the Andalusian cadence), which reaches the same V by stepping down.',
		''],
	['line-cliche', 'the bass holds; one voice falls by semitone',
		'One chord, and a single voice walking down inside it. It sounds like harmony moving, but home never leaves.',
		'Cm throughout, with C, B, B♭, A falling in one voice. The bass has two choices: hold C under all of it, or take the falling line itself. Try both. The last chord’s A is the major sixth.',
		'One note falling by semitone while everything else stands still. Sing the moving voice.',
		'i ♭VII ♭VI ♭VII (the modal descent), where the whole chord moves.',
		'“My Funny Valentine” (opening), “Stairway to Heaven” (introduction).'],
	['ii-v-into-iv', 'rises a fifth, falls a fifth, falls a fifth, rises a fifth (as the phrase is played)',
		'Home turns into a dominant and resolves down a fifth. A ii V aimed at IV: for two bars the IV is treated as a home of its own.',
		'In C: Gm7, C7, F. The note that changes everything is B♭, the ♭7 of home. It appears while the bass is still on C and falls to A as the F arrives. Heard as three chords going round, this is simply ii V I in F, so the course plays it as a phrase that starts and ends on C.',
		'♭7 appearing over home, and falling to 6 as the IV arrives.',
		'I I7 IV (the V of IV), the same move without the ii.',
		'“Satin Doll” (into the bridge), “Misty” (second bar), “Cherokee” (bars three to five).'],
	['diminished-passing-chord', 'rises a semitone, rises a semitone, rises a fourth, falls a fifth (as a loop)',
		'A turnaround with a chromatic bass. The diminished chord stands in for VI7 and joins home to ii by semitone.',
		'C, C♯, D, G in the bass. C♯°7 is A7 with its root left out and a ♭9 added, so it does the same job as the turnaround’s VI7 with a smoother line. Over the diminished chord, its own four notes are the safest choice.',
		'The bass rising by semitone: 1, ♯1, 2.',
		'I VI7 ii V (the turnaround).',
		'“Ain’t Misbehavin’” (opening), “It Could Happen to You” (opening).'],
	['minor-blues-turn', 'falls a third, falls a semitone, falls a fifth',
		'The last four bars of a minor blues. Two dominant chords a semitone apart slide down into home.',
		'Cm, A♭7, G7. The A♭7 is a tritone substitute for the chord that would normally set up G7. Its G♭ and the G7’s B natural are both outside C minor: land on the chord tones and the line explains itself.',
		'Two dominant chords a semitone apart. The bass falls ♭6, 5, 1.',
		'iiø7 V7 i (the minor cadence), which sets up the same V from above.',
		'“Mr. P.C.”, “Equinox”.']
];
let added = 0;
CARDS.forEach(([id, motion, sound, choice, listen, contrast, leads]) => {
	const el = HE.byId(id); if (!el) { throw new Error('no element ' + id); }
	const inC = v => HE.spell(el, 0, v).chords.map(c => c.name).join(' ');
	const fo = v => { const d = HE.degrees(el, v); return d.fixed.map(x => SHOW[x]).join(' ') + ' | open: ' + (d.open.length ? d.open.join(', ') : 'None'); };
	const rows = [['In C', inC('triads')]];
	if (el.sev) { rows.push(['Expanded voicing', inC('sevenths')]); }
	rows.push(['Built from', el.rel], ['Motion', motion], ['Fixed, open', fo('triads')]);
	const paras = [['Sound', sound], ['Note choice', choice], ['Listen for', listen], ['Contrast with', contrast]];
	if (leads) { paras.push(['Listening leads', leads]); }
	guide.cards[id] = { id, stage: el.stage, roman: el.roman, name: el.name, optional: false, el: id, rows, paras };
	const st = guide.stages.filter(x => x.n === el.stage)[0];
	if (st.cards.indexOf(id) === -1) { st.cards.push(id); added++; }
	if (Array.isArray(guide.uncarded)) { guide.uncarded = guide.uncarded.filter(x => x !== id); }
});
console.log('cards written', CARDS.length, '(new to their stages:', added + ')');

const head = src.slice(0, src.indexOf('HE.GUIDE = ')), tail = '\n}(typeof window !== \'undefined\' ? window : globalThis));\n';
fs.writeFileSync(file, head + 'HE.GUIDE = ' + JSON.stringify(guide) + ';' + tail);
console.log('names changed in', swaps, 'places; method pages', guide.method.length, '; last:', guide.method[guide.method.length - 1].title);
