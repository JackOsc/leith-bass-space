# Changelog

## 3.2.0 · 12 November 2026

The rest of the list from the review of 11 Nov 2026 (section 7), at Jack's request: "continue to improve style guide and worksheet skill".

### Added
- **Chord charts** (`show: "chart"` in a groove): slashes with chord symbols, `chords` shared across a bar, written rhythms for kicks, `simile` bars (engraved as LilyPond's own percent repeat), boxed rehearsal `mark`s, repeats.
- **Rhythm lines** (`show: "rhythm"`): one line, no pitch, an event needs only a duration.
- **`end: "final"`** on a groove panel: a final double bar.
- **Element cards** (`scripts/element.js`): a one page card for any of the 65 elements of the Harmonic Elements course, in any key: the loop as a chart, numerals over chords, what it is built from, the listening line, the notes the chords fix on a five fret neck, the other homes, three practice steps, and a code to its page in the Guide. The music is read from `assets/elements.json`, a copy of the app's catalogue, so card and app cannot disagree.
- **Steps beside a link**: `steps` on a `link` block.
- **Page flow warnings** for a page that stops well short with more to come, and for a last page that is barely used (measured from the PDF itself).
- **setup.sh installs LilyPond without apt** where there is none, from the Python package index (2.24.3), and the engraver finds it there.

### Style guide
- **`references/house-style.md` is now edition 2.0 of the house style guide**, written out in full (it was a text extract of edition 1.0 with two notes of amendment). New: the app (phone layout, the parts of a room, numerals first, the course's vocabulary, whose home it is, links, privacy, sound); the kinds of figure and when to use each; one page where it can be; plain and short language, few dashes, copy that does not read as machine written; published songs; the rules for building and releasing. The brief for recreating the notation tool has left the guide: this skill is the specification. The guide as a DOCX and PDF, built with this skill, is in the site repository under `docs/`.

### Fixed
- **A label with a flat in it changed typeface.** 3.1 put the three signs in fonts of their own. The figure renderer sets a whole label in one font, so "Home (B♭)" and "B♭maj7" came out in DejaVu Sans Mono. The signs are now inside the bundled Inter and Oswald themselves (`tools/add-signs-to-fonts.py` in the site repository; outlines from DejaVu Sans, whose own additions are public domain; Inter and Oswald are OFL with no reserved name). Documents still set each sign in "LBS Signs", so a copy of Inter already installed on a machine cannot lose them.
- **A blank last page after a table or a link.** The empty paragraph a table must be followed by was full height and could fall alone onto a new page. It is now 2 pt tall.
- **A tempo word ("Shuffle") was set in the TAB digits' typeface** and ran into the metronome mark. It is set in Inter.
- **A fretboard's orientation note ran off the edge** of a narrow figure. It now says as much as fits.

### Changed
- A link's code is 24 mm across (was 30) for a short address. Read back from a PDF at 150 dpi.

### Checked
- 63 acceptance tests pass with LilyPond 2.24.3 (11 new). LilyPond 2.25 from the package index fails one existing test (TAB digits are engraved differently), which is why setup pins 2.24.3.
- **All 65 element cards were built to PDF, each in a different key: every one is a single page, with no errors.** Eight were looked at.
- A chart sheet (twelve bar blues with marks and simile bars, a rhythm line, a link) was built and looked at.

### Not done
- Printing on paper and scanning a code with a phone.
- Chord symbols in a chart are not checked against anything.
- An element's twelve bar forms have no card (they are not in the catalogue copy).

## 3.1.0 · 11 November 2026

Part of the programme agreed with Jack on 11 Nov 2026 (the review in the Project, section on the worksheets skill).

### Added
- **Real flat and sharp signs.** `Bb`, `F#` and `Ebmaj7` in headings, labels, note names, captions, tables and body text print as B♭, F♯ and E♭maj7. Inter and Oswald have no such glyphs, so two small fonts, `lbs-signs-400.ttf` and `lbs-signs-600.ttf`, carry the three signs (flat, natural, sharp), cut from DejaVu Sans 2.37 and renamed "LBS Signs" as its licence asks. They are embedded in the DOCX and, with `--embed-fonts`, in SVGs that use a sign. The rule (`signs()` in render.js) only takes a `b` as a flat where a note or chord name can end, so "Abbey" and "Ebony" are untouched.
- **`link` block** in worksheets: a QR code, a label, a line of text and the address in words. For a drill in the app with chosen things in play, a metronome setup, a backing track. The code is made with the `qrcode` package (setup.sh installs it) and written as a one bit PNG by the builder.

### Changed
- A chord label such as `Bb7` now prints as B♭7 (it printed as typed before). Data, audits and file names are unchanged.

### Checked
- 52 acceptance tests pass (two new, one changed). A test sheet in B♭ was built to PDF and looked at: signs in the title (Oswald), headings, body, bold, callout, table, figure title, caption, chord labels and note names. Both QR codes were read back out of the PDF by a scanner.
- LilyPond was not installed for this run, so the engraved groove tests that need it were skipped, as the test file reports.

### Not done in 3.1 (still on the list)
- Continuous figures across a page, a chart page, a rhythm only line, an element card for Harmonic Elements, and page flow checks beyond the last page warning.

## 3.0.0 · 31 October 2026

Requested by Jack: correct the fretboard string weights, say "session" rather than "lesson", and make notation and TAB less big and clumsy (reference: a printed chord-harmony book page with a 1.7 mm staff space). Plus a full review of the skill and the problems found in recent session notes.

### Fixed
- **Fretboard string weights were upside down**: the highest string was drawn thickest. The lowest-sounding string is now the thickest on four-, five- and six-string diagrams, with a regression test.
- **Notation was about 2.4 times too large** relative to the text (a 4.3 mm printed staff space against about 1.8 mm in books). Notation is now sized by its staff: 1.8 mm by default, with labels at about 10 pt. Labels, TAB digits, stems and TAB spacing were rebalanced against the staff (see `HOUSE` in render.js and LILY_FONT in groove.js).
- **Duplicated headings and heavy boxes in documents**: every figure carried an orange border and an Oswald heading repeating the figure title. Document figures are now plain; the bordered panel remains for the web.
- **Cramped spacing across barlines** in unmetered and metered panels: notes now sit in equal slots per bar.
- **Blank pages from page breaks**: `pagebreak` now sets "page break before" on the next paragraph instead of inserting an empty paragraph.
- **Missing dependency**: setup.sh now installs `jszip` (and checks Pillow).
- Groove finger numbers used LilyPond's serif music digits; they now use Inter, like everything else.
- The TAB time signature in render.js was oversized and duplicated the staff's; it is now shown on the staff only (and on the TAB in TAB-only figures).

### Changed
- "Session" is the default language for worksheets and session notes (docs, examples, style guide amendments 1.1). Website wording in the style guide is unchanged.
- Width is `"auto"` by default for exercises, grooves and diagrams: calculated from the music, shared across an exercise's panels, capped by `maxWidth`. Old fixed widths still work.
- Measure labels default to nothing (no "E STRING" captions inside graphics).
- Captions are 10 pt (were 9 pt); more space after captions and before figure titles.
- Figures are left-aligned under their title by default (`align: "center"` available).
- PNGs embedded in documents are rendered at about 600 dpi.

### Added
- `frame: "panel" | "plain"` and `show: "both" | "notation" | "tab"` for exercises and grooves; `frame` for diagrams.
- TAB-only grooves with rhythm stems and fingers (for pupils not yet reading the staff), and notation-only figures (theory papers).
- Grooves: double stops and chords (`notes`), slides, hammer-ons, pull-offs, ghost notes, accents, staccato, triplets (`"8t"`), key signatures, tempo marks, repeat barlines, multi-line figures (`barsPerLine`, up to 16 bars). Each has validation (for example, a hammer-on must go up the same string).
- Exercises: panel `repeat`; `rowLabels`.
- Worksheets: `notationSize` (compact, standard, large or millimetres), landscape and portrait `section` blocks, JPEG images, `portal` (writes the Members portal session-notes text), a contact sheet of all pages with `--preview`, and `Page flow:` warnings for a near-empty last page.
- `references/session-notes.md` and `examples/worksheets/session-note.json`; `examples/c-major-thirds.json`; `examples/grooves/em-techniques.json`.
- Tests grew from 37 to 50.

### Confirmed by Jack (31 October 2026)
Plain document figures (no border, no heading in the image), the 1.8 mm default staff space, and leaving the website wording as it was.

### Not changed
All musical rules: pitch and transposition, spelling, accidental state, meter checks, validation and audits.
