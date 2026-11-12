---
name: leith-bass-worksheets
description: Make Leith Bass Space teaching material in the house style. Covers bass notation and TAB (scales, technique drills, chord tones, pitch studies), rhythmic bass grooves (quavers, semiquavers, rests, ties, triplets, slides, hammer-ons, double stops, engraved with LilyPond), TAB-only figures, chord charts with slashes and rehearsal marks, rhythm-only lines, one page element cards for the Harmonic Elements course, fretboard and keyboard diagrams, complete A4 worksheets and session notes as DOCX and PDF, and the Members portal session-notes text. Use this skill whenever Jack asks for a bass worksheet, session notes, a practice sheet, exercise, scale, groove, bass line, TAB, notation, fretboard diagram, chord-tone study, chart, rhythm reading line, element card or teaching graphic, anything for leithbass.space, or a pupil handout, even if he doesn't mention the skill or the house style by name. Never draw notation, TAB or fretboards by hand or with image generation; use these scripts.
---

# Leith Bass worksheets

Four deterministic renderers, a card maker and a document builder, sharing one palette, one set of fonts and one rule: **music is data**. Every pitch, fret and finger comes from JSON you write; the pictures are calculated from it and audited. Never edit a finished image to change the music. Change the JSON and rebuild.

| Script | Makes | Use for |
|---|---|---|
| `scripts/render.js` | notation and/or TAB panels (SVG/PNG) | scales, drills, chord tones, unmetered pitch studies (crotchets only) |
| `scripts/groove.js` | notation and/or TAB via LilyPond | anything rhythmic or with technique: quavers to semiquavers, rests, ties, triplets, slides, hammer-ons, pull-offs, ghost and muted notes, double stops, key and tempo, several lines |
| `scripts/groove.js` with `show: "chart"` | chord charts: slashes, chord symbols, rehearsal marks, simile bars, repeats | reading a chart; the form of a tune; anything where the notes are the player's choice |
| `scripts/groove.js` with `show: "rhythm"` | one line of rhythm, no pitch | reading rhythm away from the bass; clapping and counting |
| `scripts/element.js` | a one page card for an element of the Harmonic Elements course, in any key | "a card for the Dorian loop in B♭"; anything about a named element. The music on it comes from the app's own catalogue, so never write an element's chords or numerals by hand |
| `scripts/diagram.js` | fretboard and keyboard diagrams | shapes, where notes sit, intervals, semitones |
| `scripts/worksheet.js` | A4 DOCX (+ PDF, previews, contact sheet, audit, portal text) | handouts and session notes combining text and figures |
| `scripts/test.js` | acceptance tests | run after any change to the scripts |

Read `references/formats.md` before writing any JSON: it has every field for all four formats, a table for choosing between exercise and groove, and the print sizes. `references/session-notes.md` covers session notes and the portal text. `references/house-style.md` is the full style guide (edition 2.0, 12 November 2026: read section 7 before writing any words, section 5 for anything about the app, and section 6 for which figure to use); `references/notation-manual.md` is the manual Jack wrote for requesting material; `references/specification.md` is the original build contract for render.js.

## Language: sessions, not lessons

In worksheets and session notes, Jack calls his time with a pupil a **session**. Write "session note", "Session 6", "this session", "before next session", and name files `session-6-note.pdf`. Don't write "lesson" unless Jack does. This applies to teaching material only; leithbass.space page copy keeps its existing "lessons" wording.

## 0. Set up (once per session)

```bash
SKILL=$(dirname "$(ls -d /mnt/skills/*/leith-bass-worksheets/SKILL.md /root/.claude/skills/*/*/leith-bass-worksheets/SKILL.md 2>/dev/null | head -1)")
bash $SKILL/scripts/setup.sh              # fonts, PNG rasteriser, docx, jszip, checks
bash $SKILL/scripts/setup.sh --lilypond   # add this when a groove, chart, rhythm line or element card is needed (about a minute)
```

Work in `/home/claude/lbs-work/`. The skill folder is read-only, so write JSON and outputs elsewhere and point the scripts at them (paths inside a worksheet are relative to the worksheet file; absolute paths also work). If you have to patch a script for a job, patch a copy, say so in the reply, and list the change so it can go back into the skill.

## 1. Understand the teaching decision first

Before writing JSON, pin down the five things the manual asks for: **learning aim, musical material, physical location (string, fret, position), reading support (names, fingers, TAB and/or notation), destination (A4 worksheet or session note, web article, phone graphic)**. Also the pupil's level, what they can read (check their memory file), and their instrument (four, five or six strings; tuning).

If Jack gives a starting fret but not a fingering or position, choose a sensible one and **say which you chose and why** in your reply. The renderers check notation against data; they do not judge hand comfort, pick fingerings or know which spelling a key needs. Those are your decisions, and they must be musically right:

- Spell by function, not by fret: Gb major (not F#) as the relative major of Eb minor; Db to D natural for Bbm to Bb7. Pass explicit `spelling` values whenever the key matters; `accidentalPreference` is only a default for black keys.
- Spellings are **written** pitch, one octave above sounding. A string fret 3 is written C3.
- Use `courtesy: true` when an accidental that is the point of the material would otherwise vanish at the barline.
- Match the pupil's reading: `show: "tab"` for someone not yet reading the staff (grooves keep the rhythm as stems above the TAB), `show: "notation"` for theory papers, both otherwise.
- Check every fret against the pitch you intend before rendering. The audit file lets you prove it afterwards.

## 2. Write and validate the data

```bash
node $SKILL/scripts/render.js  exercise.json --check
node $SKILL/scripts/groove.js  groove.json   --check
node $SKILL/scripts/diagram.js diagram.json  --check
```

Validation errors are deliberate and specific (overfull bar, wrong written octave, hammer-on going down, unsupported field, crowded bar). Fix the music or the layout; never weaken a script to get past one. For crowding: fewer bars per panel (or `barsPerLine` in a groove), or a landscape section. Do not shrink type.

## 3. Build

A worksheet or session note (the usual deliverable):

```bash
node $SKILL/scripts/worksheet.js sheet.json --out-dir /home/claude/lbs-work/out --pdf --preview
```

Leave figure widths alone in worksheets. The builder sizes notation by its staff (1.8 mm staff space by default, as in printed bass books, with labels at about 10 pt), lets each figure take its natural width up to the text width, and draws document figures plain (no orange box or heading inside the image: the figure title does that). Use `"notationSize": "compact"` or `"large"` for the whole sheet if needed, and a `{ "type": "section", "orientation": "landscape" }` block for long lines of music.

Single figures, for the website or slides:

```bash
node $SKILL/scripts/render.js exercise.json --out-dir out --png --scale 2 --embed-fonts
node $SKILL/scripts/groove.js groove.json   --out-dir out --png --scale 2 --embed-fonts
node $SKILL/scripts/diagram.js diagram.json --out-dir out --png --scale 2 --embed-fonts
```

Standalone figures default to the web treatment: cream panel, orange border, Oswald heading, auto width. `--embed-fonts` makes the SVG self-contained (subsetted Oswald, Inter, DejaVu Sans Mono), so it looks the same on leithbass.space and on any computer. Always use it for web SVGs.

## 4. Inspect before delivering (not optional)

1. **Look at the contact sheet** (`<slug>-contact.png`, every page side by side) and then any page that needs a closer look, with the Read tool. For figures, zoom in: render the PDF page at 200 dpi and crop. Check: labels readable; noteheads, names, fingers and TAB aligned; nothing clipped; accidentals visible; nothing touching.
2. **Check the page flow.** The builder prints `Page flow:` warnings for a near-empty last page. Also look for a lone heading or callout at a page end, a figure separated from its title, or a half-empty page before a big figure. Fix by editing content (shorter steps, move a block, add a `pagebreak`, use a landscape section), not by shrinking figures.
3. **Read the audit** (`<slug>-audit.json` or the manifest) against what you meant to write: every string, fret, written pitch, duration.
4. Run `node $SKILL/scripts/test.js` if you changed any script.

### Element cards

```bash
node $SKILL/scripts/element.js --list                                   # every element, by stage
node $SKILL/scripts/element.js dorian-loop --key Bb --out-dir out --pdf --preview
node $SKILL/scripts/element.js "I IV" --key E --sevenths --out-dir out --pdf
```

The card is an ordinary worksheet (`<slug>.card.json` is written beside it), so to add a line to play, a photo or a note for one pupil, edit that file and rebuild it with `worksheet.js`. The numerals, chords, fixed and open notes, listening line and homes are the catalogue's: don't change them on the card. If they look wrong, the catalogue is where to fix it. `assets/elements.json` is a copy made by `tools/export-elements-for-worksheets.js` in the site's repository; if Jack says the app's elements have changed, it needs making again.

## 5. Deliver

Send the PDF first (it is what pupils open), then the DOCX, and the portal text when there is one. Mention that `figures/` and the worksheet JSON are the editable sources (offer them as a zip if Jack may revise later). For web figures, deliver the embedded-font SVG plus the PNG, and give suggested alt text from the manifest.

In the reply, state: the fingering or position choices you made, any spelling decisions that carry teaching weight, and anything the tools cannot show (for example a technique the notation implies but does not mark).

## House rules that affect content

The worksheet builder handles fonts, colours, spacing and page setup. These are the rules you control:

- **Worksheet sequence**: title and one-sentence aim; short explanation; clearly labelled examples; a few purposeful practice steps; a listening cue. A sequence, not five compulsory boxes.
- **Say each thing once.** Figure titles identify ("Figure 1. The shape"); captions add meaning. Explain finger numbers once, in a caption, not inside the graphic. No instructions inside images.
- **Voice**: an experienced working musician talking to a capable person. Direct, warm, specific. Give an action, a reason and something to notice. Use "try", "notice", "listen", "return to". No exam or self-test framing unless asked, no "unlock your potential", no promised instant progress. Never invent anecdotes, quotes from Jack, or what a pupil said or did.
- **British English**: practise (verb), practice (noun), colour, centre, organise, fretboard; crotchet, quaver, semiquaver are fine for pupils who know them.
- **Musical text keeps its case**: Bb7, Bbm, Em, Cmaj7. Never uppercase chord symbols. Use D natural in prose when it helps. Type flats and sharps as `b` and `#`: the scripts print the real signs (B♭7, F♯m) in figures and documents.
- **A way into the app**: where a sheet's material can be practised in the app, end with a `link` block (a QR code and the address). Ask Jack for the link, or build it from the forms in `references/formats.md`. One or two at most.
- **Accessibility**: every figure gets specific alt text naming notes and locations ("A3, A5, D2... where the letter is the string and the number is the fret"). Colour is never the only cue.
- **Web**: notation stays on its own cream or white panel in both site themes; never invert it with CSS filters. On phones, use one or two bars per panel and a nearby text equivalent.
- **Images**: never use image generation for notation, TAB, fretboards, keyboards or documentary photos of Jack, his basses or the studio. Real photos are supplied by Jack and inserted with the `image` block (PNG or JPEG).
- **Copyright**: never write out a published song's bass line, melody or lyrics in a figure. Describe it, or use an original line in the same style.

## Palette (for reference; the scripts already use it)

Notation and documents: cream #F5EFE2, print white #FFFFFF, charcoal #292724, orange #D86B25 (borders, rules, bullets), dark orange #A84912 (small accent text, fingers, labels), muted #6A645C. Document body text #111111. Website tokens are in the style guide section 2; use them only for web work.

## Extending

- New groove features (harmonics, tapping, two voices, key changes): add the field to `validateGroove` with strict validation, map it to LilyPond in `toLily`, add a test that proves the engraved output, then document it in `references/formats.md`. Reject it until then. LilyPond warnings already fail the build, so an unsupported combination cannot slip through silently.
- New diagram types: follow the fretboard pattern (strict keys, audit list, orientation stated, shape plus colour for meaning, `frame` support).
- Geometry lives in `HOUSE` at the top of `render.js` (24 units per staff space). Change sizes there, not per figure, and keep `groove.js`'s `LILY_FONT` in step so both engines match. `CHANGELOG.md` records what changed and why.
