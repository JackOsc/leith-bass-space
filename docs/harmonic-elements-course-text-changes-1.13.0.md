# Harmonic Elements: what the course text needs for 1.13.0

Written 11 Nov 2026. The app's Guide (`he-guide.js`) is built from the course text, `claude/harmonic-elements-course-text-revised-2026-10-28.md`. For 1.13.0 the Guide was patched after the build, not rebuilt, so **the course text is behind the app**. This note lists every change the course text needs, in the form the last one took (`claude/harmonic-elements-course-text-changes-1.9.0.md`).

Jack owns the words. Everything marked draft below is Claude's wording and is there to be rewritten.

Until the course text carries these changes, run `tools/harmonic-elements-guide-patch-1.13.js` after any rebuild of the Guide. Once it does, the patch script can be deleted.

## 1. Shifts become steps

Shift was retired as a relationship in 1.9.0, but five cards kept the word. Change the names wherever they are written. Ids and recording file names do not change.

| Numerals | Was | Now | Id (unchanged) |
| :-- | :-- | :-- | :-- |
| I ♭VII | The Mixolydian shift | The Mixolydian step | `mixolydian-shift` |
| i ♭VII | The minor shift | The minor step | `minor-shift` |
| I ii | The neo soul shift | The neo soul step | `neo-soul-shift` |
| I II | The Lydian shift | The Lydian step | `lydian-shift` |
| i ♭II | The Phrygian shift | The Phrygian step | `phrygian-shift` |

A sixth, the Dorian step (i ii, `dorian-shift`), is new to the stages: see section 3.

## 2. A new section at the end of Part One: "12. Whose home is it?"

This is the page every two homes card links to. Draft, as it stands in the app:

> A set of chords does not have a home. A band gives it one: by which chord starts the phrase, which chord is held longest, where the drummer's fill lands, and above all by what the bass does. Am, C, G and D over a bass that keeps returning to A is in A. The same four chords over a bass that keeps returning to G is in G. Nothing in the chords changed.
>
> That is why some loops in this course have two homes. It is not a flaw in the loop or in your ear. It is the bass player's decision, which makes it your business more than anyone's.
>
> **What the research says**
>
> People who study pop and rock harmony have found the same thing. Mark Richards looked at the four chords of the pop axis in every rotation and concluded that roman numerals struggle with them, because numerals are tied to one centre and the loop has more than one ("Tonal Ambiguity in Popular Music's Axis Progressions", *Music Theory Online* 23.3, 2017). Mark Spicer describes a "fragile tonic": the home chord is there, but weakened, for example by sitting in the middle of the phrase and not where phrases start or land ("Fragile, Emergent, and Absent Tonics in Pop and Rock Songs", *Music Theory Online* 23.2, 2017). Drew Nobile argues that some of these loops are not one key or the other but both at once, and Trevor de Clercq points out that working musicians in Nashville avoid the choice by numbering a minor home as six ("The Logic of Six-Based Minor", 2021).
>
> **What the Dojo does about it**
>
> - **Name it** never leaves home in doubt. The band establishes it first: a cue (two bars of the home chord), a pedal (a low home note under the loop), or the band's bass on the roots. A **home hit** lays one bar of the home chord over the loop whenever you ask.
> - **Find home** gives you nothing. Where a loop has two homes it says so, and either counts. A home has to be one of the chords of the loop: a key whose own chord never sounds is not accepted.
> - After any answer, **Hear it from each home** plays the same chords with the bass on the roots, phrased from each home in turn.
> - Cadences (ii V I, the backdoor cadence, the minor cadence and the like) are defined by where they arrive. They have one home.
>
> **What you do about it**
>
> Take one two homes loop, the Dorian loop or the pop axis. Play a bass line that makes the first home unmistakable: start your phrase on its root, return to it, land on it. Then, without the chords changing, do the same for the other home. When you can move the home at will, you own the loop.

Links used in the app: Richards https://mtosmt.org/ojs/index.php/mto/article/view/308/110, Spicer https://www.mtosmt.org/ojs/index.php/mto/article/view/342/112, de Clercq https://mtosmt.org/ojs/index.php/mto/article/view/759. The Nobile reference has no link in the app yet and wants a full citation before a student edition.

## 3. Eleven elements folded into the stages (cards needed)

These came from the nineteen "further molecules". Each needs a card in its stage, in the course's usual form. The listening line in the app is a draft.

| Stage | Id | Numerals | Name | Draft listening line |
| :-- | :-- | :-- | :-- | :-- |
| 6 | `climb` | I ii iii IV | The climb | The bass walking up the scale: 1, 2, 3, 4. Every change is a step and nothing pulls: the IV at the top leans back home. |
| 7 | `dorian-shift` | i ii | The Dorian step | Two minor chords a tone apart. The top of the second chord is 6, a semitone above where a plain minor key would put it. |
| 8 | `aeolian-cadence` | ♭VI ♭VII i | The Aeolian cadence | Two whole steps up in the bass, landing on a minor home. No leading note: ♭7 rises to 1 by a tone. Compare the lift, where the same climb lands on a major chord. |
| 8 | `dorian-loop` | i ♭III ♭VII IV | The Dorian loop | The 6 when the last chord arrives. Then ask whose home it is: the same four chords can sit on the third chord's root. Put a bass under each and hear the loop change. |
| 8 | `minor-rock-cell` | i ♭III IV | The minor rock cell | The bass climbing 1, ♭3, 4, then the brightness of 6 inside the last chord against a minor home. |
| 8 | `rock-cell` | I ♭III IV | The rock cell | The same bass climb over a major home. 3 sounds in the first chord, then ♭3 is the root of the second: the rub is the point. |
| 8 | `fifties-in-minor` | i ♭VI iv V | The fifties, in minor | The fifties progression's bass from a minor home. Wait for 7 in the last chord: it is the only note from outside the natural minor, and it pulls home. |
| 8 | `line-cliche` | i i(maj7) i7 i6 | The line cliché | One note falling by semitone inside a minor chord: 1, 7, ♭7, 6, while the bass can stay put. Sing the moving voice. |
| 9 | `ii-v-into-iv` | v7 I7 IV | The ii V into IV | Home turning dominant. ♭7 appears while the bass is still on 1, and falls to 6 as the IV arrives. |
| 9 | `diminished-passing-chord` | I ♯i°7 ii V | The diminished passing chord | The bass rising by semitone: 1, ♯1, 2. The diminished chord does the turnaround's job with a smoother bass. |
| 9 | `minor-blues-turn` | i ♭VI7 V7 | The minor blues turn | Two dominant chords a semitone apart, sliding down into home. The bass falls ♭6, 5, 1. |

Two notes on these:

- **The ii V into IV is played as an eight bar phrase** in the app: I (2 bars), v7, I7, IV (2 bars), I (2 bars). As three chords going round, it is a ii V I in another key and nothing else.
- **Names.** Several are nicknames Claude invented or kept (the climb, the rock cell, the minor rock cell, the fifties in minor, the minor blues turn). Jack asked for numerals to lead: the app can show "I ii iii IV, the climb" (`HE.label`) once the names are settled.

## 4. Eight elements taken out

Remove their cards, or fold what is worth keeping into the card named. They stay known to the app by id, so old records and links still read.

| Id | Numerals | Name | What happened |
| :-- | :-- | :-- | :-- |
| `axis-with-ii` | I V ii IV | The axis with ii | Merged into the Dorian loop (the same sound from its other home) |
| `deceptive-lift` | IV V vi | The deceptive lift | Merged into the Aeolian cadence (the same sound) |
| `mixolydian-sway` | I IV ♭VII IV | The Mixolydian sway | Merged into the Mixolydian cadence |
| `gospel-turn` | I III7 vi IV | The gospel turn | Merged into the descending soul cycle |
| `three-six-two-five` | iii VI7 ii V | The three six two five | Merged into the turnaround |
| `axis-lean-first` | I IV vi V | The axis, lean first | Dropped |
| `falling-shadows` | I iii vi IV | The falling shadows | Dropped |
| `walk-down` | IV iii ii I | The walk down | Dropped |

The three groups they sat in (Minor and modal, Pop and soul, Jazz: Stages 11 to 13) are gone from the app. If the course text has those headings, they go too.

## 5. Conventions, and section 2

Wherever the text says how the Dojo marks an answer, it should now say:

- **Name it** gives you home, and asks for the element. An answer is right only if it is this loop heard from this home. With home on C, C to F is I IV, not I V.
- **Find home** asks for the key alone. Where a loop is on the list of loops with more than one home, every home on the list is right.
- **A home must be a chord of the loop.**
- **Cadences have one home**: the cadential cell (ii V I), the minor cadence, the long cycle, the lift, the chain of dominants, the V of IV, the minor plagal cadence, the backdoor cadence, the altered dominant, the tritone substitution, the Aeolian cadence, the ii V into IV.
- A card's "Key" row is now "Home, as the course hears it".
- **Today** is a short set chosen from your record. **The map** shows every element by stage.

## 6. Still open for Jack

1. His answers from the audition page: for each loop with more than one home, which homes the course accepts. Until then the app's list is the one computed from the catalogue (24 loops).
2. Names and listening lines for the eleven in section 3.
3. The wording of section 2.
4. Whether the on screen name leads with numerals ("I IV, the major lean").
