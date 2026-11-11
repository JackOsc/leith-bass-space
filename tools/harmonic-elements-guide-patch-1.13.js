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

const head = src.slice(0, src.indexOf('HE.GUIDE = ')), tail = '\n}(typeof window !== \'undefined\' ? window : globalThis));\n';
fs.writeFileSync(file, head + 'HE.GUIDE = ' + JSON.stringify(guide) + ';' + tail);
console.log('names changed in', swaps, 'places; method pages', guide.method.length, '; last:', guide.method[guide.method.length - 1].title);
