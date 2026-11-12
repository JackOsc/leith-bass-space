# Leith Bass Space house style guide

kicker: Edition 2.0 · 12 November 2026
aim: One system for the website, the app, worksheets, session notes and notation.

## The character

Clear, warm and musically serious. A working musician's teaching practice in Leith: direct enough to be useful, thoughtful enough to earn trust, and distinctive without getting in the way of the music.

The ingredients are condensed Oswald for display, Inter for reading, cream and near black surfaces, orange accents, real studio photography and accurate notation. Every page, screen and sheet should make the reader's next action easier: understand an idea, play an exercise, find a session, contact Jack.

!! What changed in 2.0 :: This edition folds in amendments 1.1 and 1.2, and adds the app (section 5), the kinds of figure (section 6), the rules for building and releasing (section 9), and a fuller section on language. The summary of changes is at the end.

## 1. Identity and hierarchy

**Names.** Use "Leith Bass Space" in titles and prose. Use "leithbass.space" for the address and the wordmark. "lb.s" is shorthand for internal notes. The app's rooms are the Shed, Ear Training (Ear), Read and Harmonic Elements (Elements). Inside each room there is a Guide and a Dojo.

**The logo.** Use the supplied artwork, with its light version on dark backgrounds. Never rebuild it from type. Keep its proportions and leave clear space around it of at least the height of its lowercase letters.

**Priorities.** The reader should meet one main title, one opening statement and one obvious next step. On a worksheet the exercise is the focus. In the app the question and its answer buttons are the focus. On the website the teaching offer and the way to get in touch come first.

**Orange locates attention.** A link, a cue, an edge, a small highlighted detail. Large orange fields and torn edges are for editorial moments on the website. Don't use every brand device on every page.

**Two levels of intensity.** Display areas may be assertive: big condensed headings, strong crops, a torn edge. Teaching areas settle down: generous margins, simple columns, flat paper, precise graphics. An exercise never inherits a headline treatment that makes the notes harder to read.

**Case.** Uppercase for short display titles, navigation and small labels. Sentence case for long headings, instructions, captions and prose. Never uppercase a chord symbol, a key or a roman numeral through a blanket rule: B♭ is not BB, Em is not EM, and i is not I.

## 2. Colour

**Website and app.** These are the theme's values, unchanged since 3.3.1 and checked against theme 3.20.0. Use the named tokens so text and surface switch together.

| Role | Light | Dark |
| Canvas | #F3EFE7 | #090909 |
| Surface | #F5F2EC | #0C0E13 |
| Raised surface | #FFFDF8 | #12151B |
| Primary ink | #111111 | #F3F1EB |
| Secondary ink | #333333 | #D4D1CA |
| Muted text | #6F6C66 | #ACA89F |
| Orange, decorative | #E87102 | #E87102 |
| Orange, text and action fill | #B05200 | #F49542 |
| Text on action fill | #FFFFFF | #090909 |

The brighter orange is for graphic accents. The darker light mode orange is for text and buttons, where contrast matters. In the app, a right answer is green (#2F6A43 light, #7CC495 dark) and always carries a word or a mark as well.

**Notation and documents.**

| Role | Value | Use |
| Warm paper | #F5EFE2 | Notation panels on the web |
| Print paper | #FFFFFF | Figures in documents |
| Charcoal | #292724 | Music, TAB and main text |
| Orange | #D86B25 | Borders and emphasis on web panels |
| Dark orange | #A84912 | Finger numbers, chord labels, small labels |
| Muted brown grey | #6A645C | Secondary labels and captions |

**Rules of use.**

- Ordinary text needs a contrast of at least 4.5 to 1, large text 3 to 1. Small notation labels count as ordinary text.
- Colour is never the only cue. Links in prose are underlined. A changed note has a label. A selected button looks selected without its colour.
- Dark is the first visit presentation. Keep a visitor's own choice. Apply the theme before the first paint.
- Photographs stay photographs. Notation stays a light inset. Never invert an image or a diagram.
- Rules and separators are faint (ink at about 14% in light mode, warm light at about 16% in dark) and used sparingly.

## 3. Typography and spacing

| Role | Face | Guidance |
| Display headings | Oswald 700 | Short and confident. No stretched tracking |
| Body | Inter 400 | Sentence case, comfortable line length |
| Emphasis and labels | Inter 600 | Selective. Never a whole bold paragraph |
| Music symbols | Bravura (the app), LilyPond's Emmentaler (documents) | Real engraving glyphs, never drawn by hand |
| TAB digits | DejaVu Sans Mono Bold | Stable digits, kept apart from body type |

**Flats, sharps and naturals.** Always the real signs: B♭, F♯, D♮, ♭III. Never the letters b and # where a pupil reads. In worksheet data you may type `Bb` and `F#`: the scripts print the signs. The bundled Inter and Oswald carry the three signs, so a label never changes typeface because it has a flat in it.

**Documents.**

| Style | Size and spacing |
| Title | Oswald 30 to 34 pt |
| Section heading | Oswald 15 to 17 pt, 12 pt before, 5 pt after |
| Body | Inter 11 pt, about 1.25 line spacing (11 to 12 pt for young beginners) |
| Caption and footer | Inter 9 pt. Never an essential instruction at this size |
| Table | Inter 9.5 to 10.5 pt, with room in the cells |

Use real heading styles. Keep a heading with what follows it. No widows, no caption parted from its figure, no justified text.

**Web and app.** H1 36 to 64 px, H2 28 to 44 px, H3 22 to 28 px, body 16 to 18 px with a line height of about 1.5 to 1.65. Spacing comes from a 4 px base: 4, 8, 12, 16, 24, 32, 48, 64, 96. Content is at most 1180 px wide and prose about 40 rem.

## 4. The website

**Say the offer plainly.** Bass sessions, Leith and Edinburgh, who they are for, and what to do next. Navigation labels name destinations. One H1 a page, then H2 and H3 in order. Titles and captions are live text.

**Editorial splits.** About 40% text to 60% image where the image carries real context. On a phone they stack into one reading order with the heading close to its action. Torn orange edges belong to the first two splits of the home page. A tear never crosses text, a face, a hand or an instrument.

**Cards, buttons and links.** A card groups one decision. One primary action in view at a time. Every control is at least 44 px in each direction, has a visible focus state and says what it does.

**Articles.** Open with the practical question, explain the musical idea, show an example, give something to try. Paragraphs for reasoning, lists for steps.

**Give the tools away.** The metronome, drone and other free tools work without an account. A visitor should be able to use them straight away. They are the best advertisement for the teaching.

**Copy is stored as defaults.** The theme ships default wording and the site's owner can edit any of it. When a release changes a default, it adds a migration that clears saved wording only where it still matches the old default. Wording edited by hand is never overwritten.

## 5. The app

The app is the members' side of the site: the Shed (metronome, drone, practice timer and diary, songs), Ear Training, Read and Harmonic Elements. It is used mostly on a phone, often with a bass on the lap.

**One hand, one screen.** At 390 by 844 the question, the answer buttons and Check fit without scrolling. Controls are 44 px or more. Rows of choices scroll sideways in one line; they do not wrap into a wall of buttons. Settings sit below the work, never above it.

**Every room has the same parts.** A Guide to read and a Dojo to practise in. Today (a short set chosen from the pupil's own record). A map or record showing where they stand. The same words for the same things in every room.

**Numerals lead.** An element is shown as its roman numerals first and its name second: "I IV · The major lean". Lower case numerals are minor chords. Numerals count from home on the major scale, so ♭III is always a minor third above home.

**The course's words.** Use these, with these meanings, and no synonyms.

| Word | Meaning |
| Home | The note and chord that feel like rest |
| Key | Home and whether its chord is major or minor |
| Element | A named loop or cadence of chords, written in numerals |
| Bond | Two chords: home and one other |
| Molecule | Three or more chords built from bonds |
| Lean, pull, shadow, colour | The four relationships a chord can have to home |
| Step | A chord a tone or semitone from home (once called a shift) |
| Loop, cadence | A loop goes round. A cadence arrives, and has one home |
| Fixed, open | Notes the chords settle, and notes left to the player |

**Whose home is it.** Chords suggest a home; the bass decides. So the app never asks a pupil to guess a home it has not established. In Name it the band gives home (a cue, a pedal or its own bass). In Find home nothing is given, and where a loop has two homes both are right. A home must be a chord of the loop.

**How the app talks.** Short, plain and specific. "Play it again", not "Replay audio". "Four of your last five, on two days: recognised", not "Mastery achieved". It never scolds. A wrong answer is followed by what to listen for.

**Records are private.** A pupil's record is seen by the pupil and by Jack. Nothing is shared, ranked or published.

**Links.** A drill with chosen things in play, a metronome setup or a page of a Guide can be a link. Links are how a session note, a worksheet or a message sends a pupil to exactly the right place. Sets from Jack are links on a session, and may only point to this site.

**Sound.** Nobody building the app can hear it. Pitches and timings are measured, then Jack listens. Build notes say which has happened.

## 6. Documents and worksheets

**The page.** A4 portrait, margins of about 18 mm, white paper. Cream is a panel fill, not a page colour. The title is the topic ("Natural minor: building the chords"), not the session's number. The footer carries the address and the page number and nothing else.

**The sequence.** Title and a one sentence aim. A short explanation. One or more labelled examples. A few purposeful practice steps. Something to listen for. This is an order, not five boxes to fill. A session note may need one example and three instructions.

**One page where it can be.** A handout that runs a few lines onto a second page is tightened until it fits. A longer subject takes two full pages before it takes smaller type. The builder warns when a page stops well short or the last page is barely used.

**Kinds of figure.** Choose by what the pupil has to read.

| Figure | Use it for | Made by |
| Notation with TAB | Grooves, lines, anything with rhythm or technique | groove.js (LilyPond) |
| Pitch study | Scales, chord tones and drills in even crotchets, with names and fingers | render.js |
| Chord chart | The form of a tune. Slashes, chord symbols, rehearsal marks, repeat the bar signs | groove.js, show: chart |
| Rhythm line | Reading rhythm away from pitch | groove.js, show: rhythm |
| Fretboard, keyboard | Shapes, where notes sit, intervals | diagram.js |
| Element card | One element of the course on one page, in any key | element.js |

**Figure rules.**

- Size music by its staff: a 1.8 mm staff space by default, 1.6 mm for dense reference pages, 2.0 mm for young beginners.
- Figures in documents are plain. No border and no heading inside the image, because the figure title above names it.
- Write music as one continuous figure, two to four bars to the line, with the time signature once. Don't stack two bar panels that each restate the clef.
- End a whole exercise or piece with a final double bar. Leave an excerpt open.
- A figure title names the material. Its caption adds meaning. Use each once.
- Never put instructions inside a graphic and repeat them below it.
- Keep the whole neck map portrait where twelve frets fit. Landscape is for long lines of music.
- A fretboard says which way up it is and how it is tuned.

**A way into the app.** A sheet may end with one or two links: a QR code, a label, a line of text and the address in words. The address is always printed, so the code is never the only way in. Practice steps may sit beside the code.

**Tables and callouts.** Tables are for parallel information: chord, notes, function. Short cells, top aligned, no vertical rules. A callout is for one useful distinction or a listening cue. A paragraph does not become more helpful because it has an orange edge.

**Delivery.** An editable DOCX and a PDF that has been looked at, page by page. Session notes also have a plain text version for the portal.

## 7. Voice and language

**The voice.** An experienced working musician explaining something to a capable person. Direct, warm and specific. Technique is tied to sound, practice to purpose, theory to something you can hear or play. No inflated claims, no generic inspiration, no promises of quick mastery. First person where it is Jack's actual approach. Never an invented anecdote or quotation.

**Plain and short.** Short sentences. One idea at a time. Say the thing, then stop. If a sentence could appear on anyone's website, cut it or make it specific.

**Punctuation.** Use few dashes and few hyphens. Where a dash is tempting, use a comma, brackets or a new sentence. Write "two bar loop", "first time answer", "step by step". Keep a hyphen only where the word is spelled with one.

**It should not read as if a machine wrote it.** No triplets of adjectives. No "whether you're a beginner or a seasoned pro". No "unlock", "elevate", "journey", "dive in". No summary sentence restating the paragraph it ends.

**British English.** "Practise" is the verb and "practice" the noun. Colour, centre, organise, fretboard. Titles, quotations and names keep their own spelling.

**Sessions.** In worksheets and session notes, Jack's time with a pupil is a session: "session notes", "Session 4", "before our next session". The website's own wording about lessons is unchanged.

**Teaching language.** Give an action, a reason and something to notice. "Play the phrase slowly, keeping each note the same length. Listen for a steady pulse." Progress is growing familiarity and choice. Use try, notice, listen, return to. A clear correction and an encouraging tone go together.

| Avoid | Prefer |
| Unlock your bass potential | Build a practice routine you can use |
| Master this instantly | Start slowly enough to hear every note |
| Don't get this wrong | Keep the note ringing until the next one |
| Test yourself | Try naming the note before you play it |
| This scale works over everything | This note fits this chord because |
| Lesson 6 (on a worksheet) | The topic as the title; "Session 6" in the notes |

**Music in prose.** B♭7, B♭m, Em, Cmaj7, with their case kept and real signs. "D natural" where the word is clearer than the sign. Keep key, scale, mode and chord distinct: a borrowed chord is not a key change. Spell by function: the relative major of E♭ minor is G♭ major, not F♯. Check every theoretical claim against the example beside it.

**Published songs.** Name a song, an artist and a place in the recording. Never write out a published bass line or a lyric. Listening leads are checked against the recording before a pupil relies on them.

## 8. Photography, diagrams and notation

**Photography.** Real photographs of Jack, the instruments, sessions and the studio. Crop, straighten and grade them. Never regenerate their details. Natural colour, believable skin, no heavy orange wash. Text stays live and outside the image.

**Diagrams.** Clean vector shapes on a grid, one stroke weight. Colour highlights the idea and a label or shape gives the second cue. Label every string, unit and ratio. A keyboard shows the B to C and E to F semitones correctly. Numbers on a neck are scale steps from home unless the figure says otherwise.

**Notation is data.** Every pitch, fret and finger is written as data and the picture is calculated from it and checked. Never draw notation, TAB or a fretboard by hand or with image generation, and never retouch a finished figure. The bass sounds an octave below where it is written; TAB is never transposed.

**Engraving.** A real bass clef, correct spelling, literal TAB. Staff in charcoal, orange for teaching cues. A note, its name, its finger and its fret sit on one vertical line. Names have their own row. Accidentals reset at the bar line and a natural cancels an earlier sharp.

**Three engravers, three jobs.** LilyPond for all metred music in documents. The pitch study renderer for unmetred studies in documents. The app's own engraver (Read's) on screen, which should match LilyPond's proportions. They are not interchangeable, and one sheet should not mix the two document engravers without a reason.

**Captions and descriptions.** A caption says why to look. Alt text says what is there. A complex exercise gets a text equivalent, not a whole session squeezed into one description.

## 9. Building and releasing

These are the rules for anyone, person or AI, changing the site or the app.

- **Jack decides.** Explain a choice simply, act, and list every decision taken on his behalf so he can change it.
- **Nothing is launched by a build.** Launch tickboxes are Jack's. Installing a release turns nothing on.
- **No frameworks, no build step, no new dependencies.** Plain PHP, plain scripts, plain stylesheets.
- **Plugin and theme are versioned together**, each with a changelog entry and build notes.
- **Build notes say what was checked and what was not.** "Not run on WordPress", "not heard" and "not tried on a phone" are stated in those words when true.
- **Comments say why**, in plain English.
- **Ids are stable.** An element's id, a drill's id and a recording's file name never change, because records and links depend on them. Rename the label, keep the id.
- **Rules have tests.** A list that matters (the homes the course accepts, the elements in a stage) is pinned in a test, so it cannot move by accident.
- **Member data is private by default.**
- **Samples and fonts are credited**, with their licences kept beside them.
- **The Project copy is the source** for briefs, course text and build notes. Code lives in the repository; `main` is what is live.
- **One finished release** is preferred to many small ones.

## 10. Checks before anything goes out

| Area | Check |
| Content | One clear purpose. Specific instructions. Accurate claims |
| Language | Plain, short, British. Sessions. Few dashes. Real flat and sharp signs |
| Typography | Right faces, hierarchy and case. Readable at its final size |
| Colour | Named tokens. Both themes. Enough contrast |
| Layout | Room to breathe. Nothing clipped, overlapping or stranded. One page where it can be |
| Phone | The task fits one screen. Controls 44 px. Nothing needs two hands |
| Music | Tuning, octave, spelling, rhythm, TAB and fingering checked against the data |
| The course | Numerals lead. The course's words. Home established before it is asked for |
| Access | Real text and structure, alt text, focus states |
| Output | Editable source kept. Every page and image looked at |
| Honesty | What was checked and what was not, written down |

**Keeping this guide.** Colours are named tokens, document styles are real styles, notation is data. When a rule changes, change the source, this guide and an example together, and give the guide a new edition and date. An exception for one audience or medium is allowed: say why in the build notes, and do not let it become the default.

## What changed since edition 1.0

- **1.1 (31 October 2026).** Sessions, not lessons, in teaching material. Notation sized by its staff. Plain figures in documents.
- **1.2 (11 November 2026).** Real flat and sharp signs everywhere. Links with QR codes on worksheets.
- **2.0 (12 November 2026).** New section 5, the app: phone layout, the parts of a room, numerals first, the course's vocabulary, whose home it is, links, privacy, sound. Section 6 gains the kinds of figure, continuous figures, final bars, one page, and the worksheet's title as its topic. Section 7 gains plain and short, punctuation, machine sounding copy and published songs. New section 9, building and releasing. The brief for recreating the notation tool has moved out of the guide: the worksheets skill and its references are the specification now. Colour and type values are unchanged and were checked against theme 3.20.0.

**Sources.** W3C on contrast: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html. Oswald and Inter: fonts.google.com. Bravura: github.com/steinbergmedia/bravura. LilyPond: lilypond.org. Fonts are under the SIL Open Font License; their notices travel with them.
