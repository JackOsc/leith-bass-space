# Input formats

Four JSON formats, one per script. All reject unknown fields, so a typo fails loudly instead of being ignored. Every example referenced here lives in `examples/`.

## Contents
1. Shared options: width, frame, show, theme
2. Exercise (render.js): scales, technique, chord tones, pitch studies
3. Groove (groove.js): anything with rhythm or technique beyond plain crotchets
4. Diagram (diagram.js): fretboards and keyboards
5. Worksheet (worksheet.js): the A4 document that combines them, and the portal text
6. Choosing between exercise and groove
7. Sizes at a glance

## 1. Shared options

| Field | Values | Default | Notes |
|---|---|---|---|
| `width` | `"auto"` or an integer (units) | `"auto"` | Auto sizes the figure to the music. All panels of one exercise share the widest panel's width, so stacked panels line up. Inside a worksheet, leave it out: the builder sets it. |
| `maxWidth` | integer | 2400 | Ceiling for auto width. |
| `frame` | `"panel"`, `"plain"` | `panel` standalone, `plain` in worksheets | Panel: cream or white card, orange border, Oswald heading (web). Plain: no border, no heading (documents, where the figure title does that job). |
| `show` | `"both"`, `"notation"`, `"tab"` | `both` | Exercise and groove only. TAB-only grooves keep the rhythm as stems above the TAB. |
| `theme` | `"cream"`, `"print"` | `cream` standalone, `print` in worksheets | Paper colour. |

Units: one staff space is always 24 units. Labels are 46 units (about 1.9 staff spaces), TAB digits 44, TAB lines 42 apart. On the web a panel shown at about a third of its unit width gives roughly 8 px staff spaces and 16 px labels.

## 2. Exercise (render.js)

The original contract is `references/specification.md` (version 2); version 3 changes only the geometry and adds the fields marked new. The schema is `references/exercise.schema.json`.

```json
{
  "title": "C major from A string",
  "timeSignature": [4, 4],
  "noteNames": true,
  "rowLabels": false,
  "theme": "cream",
  "frame": "panel",
  "show": "both",
  "accidentalPreference": "sharp",
  "instrument": { "name": "...", "writtenOctaveOffset": 12, "strings": [{ "name": "E", "openMidi": 28 }] },
  "panels": [{
    "heading": "C major: ascending",
    "slug": "ascending",
    "repeat": false,
    "altText": "Specific description of notes and locations",
    "description": "Optional longer description",
    "measures": [
      { "label": "", "notes": [{ "string": "A", "fret": 3, "finger": 2, "spelling": "C3", "courtesy": false }] },
      { "label": "Bb7", "string": "A", "frets": [1, 5], "fingers": [1, 4], "spellings": ["Bb2", "D3"], "courtesy": [false, true] }
    ]
  }]
}
```

- `timeSignature`: `[n, 4]` means every note is a crotchet and each bar holds exactly n notes (a genuine pickup may set `"incomplete": true`). `null` means an unmetered pitch study: no stems, no time signature.
- `spelling` is the **written** pitch (one octave above sounding on bass). A string fret 3 is written C3, not C2.
- `courtesy: true` forces an accidental the barline rule would hide, for example the D natural after Db in Bbm to Bb7.
- Measure `label` defaults to nothing. Use it for a chord symbol ("Bbm"), whose case is preserved; it sits over the first note of the bar.
- `rowLabels` (new): the quiet NOTE and FINGER labels to the left of those rows. Default on for `panel`, off for `plain` (explain the rows once in a caption instead).
- `repeat` (new): repeat barlines at both ends of the panel, on the staff and the TAB.
- Notes are spaced in equal slots per bar, with bar lines between slots, metered or not.
- Capacity: 1 to 6 bars per panel, 1 to 8 notes per bar. The renderer refuses fewer than 70 units per note (84 with note names) rather than shrinking type.
- `layout` is still accepted for old files but no longer changes anything: height always follows the music.

## 3. Groove (groove.js, engraved by LilyPond)

```json
{
  "title": "Em groove",
  "timeSignature": [4, 4],
  "key": { "tonic": "E", "mode": "minor" },
  "tempo": 84,
  "accidentalPreference": "sharp",
  "show": "both",
  "instrument": { "...": "same as the exercise format" },
  "panels": [{
    "heading": "Em groove",
    "repeat": true,
    "barsPerLine": 4,
    "altText": "...",
    "measures": [
      { "label": "Em", "incomplete": false, "events": [
        { "string": "E", "fret": 0, "duration": "8" },
        { "rest": true, "duration": "8" },
        { "string": "A", "fret": 2, "duration": "8t", "finger": 1, "hammer": true },
        { "string": "A", "fret": 4, "duration": "8t", "finger": 3 },
        { "string": "A", "fret": 2, "duration": "8t", "finger": 1 },
        { "notes": [{ "string": "E", "fret": 0 }, { "string": "D", "fret": 2, "finger": 1 }], "duration": "4", "tie": true },
        { "notes": [{ "string": "E", "fret": 0 }, { "string": "D", "fret": 2, "finger": 1 }], "duration": "8" },
        { "string": "A", "fret": 2, "duration": "8", "ghost": true }
      ] }
    ]
  }]
}
```

Event fields:

| Field | Meaning |
|---|---|
| `duration` | `"1"`, `"2"`, `"4"`, `"8"`, `"16"`; dotted `"4."`; triplet `"8t"` (groups of three of the same value, inside one bar). Bars must add up exactly. |
| `string`, `fret`, `finger`, `spelling` | One note. `spelling` is the written pitch, checked against the fret. |
| `notes` | A double stop or chord: 2 to 4 `{string, fret, finger?, spelling?}` on different strings. |
| `rest: true` | A rest; it may carry only `duration` and `label`. |
| `tie` | Joins to the next event, which must be the same string(s) and fret(s). May cross the barline. |
| `slide`, `hammer`, `pull` | Joins to the next single note on the same string: a slide changes fret, a hammer-on goes up, a pull-off goes down. Shown as a line, or a slur marked H or P. |
| `muted` | Dead note (x on staff and TAB). Cannot be tied. |
| `ghost` | Ghost note, shown in brackets on staff and TAB. |
| `accent`, `staccato` | Articulations. |
| `label` | A chord symbol over this event (bar `label` covers the first event). |

Panel and file fields:

- `timeSignature`: `[n, 2|4|8]`, for example `[6, 8]`. Never null: grooves are metered.
- `key`: `{ "tonic": "Eb", "mode": "major" }`. LilyPond then handles accidentals against the key.
- `tempo`: a number (beats per minute on the beat of the meter) or `{ "bpm": 60, "beat": "4.", "text": "Swung" }`.
- `repeat`: repeat barlines around the panel.
- `barsPerLine`: wraps a long panel onto several justified lines (up to 16 bars per panel). More than four bars needs it set.
- `show: "tab"` gives TAB with rhythm stems and fingers below; good for pupils not yet reading the staff. `show: "notation"` drops the TAB (theory papers).
- Width is natural LilyPond spacing (generous for teaching) unless that exceeds `maxWidth`, when the line is justified to fit; more than 15% compression is refused.
- Not supported yet (rejected): key changes within a panel, slurred phrasing beyond H and P, harmonics, tapping, two voices. See SKILL.md for how to extend.

### Rhythm lines, charts and final bars (3.2)

`"show": "rhythm"` engraves one line with no pitch. An event needs only a `duration` (plus `rest`, `tie`, `accent`, `staccato` as wanted). Every bar must still add up, and triplets still come in threes.

```json
{ "title": "Reading rhythm", "show": "rhythm", "frame": "plain", "tempo": 72,
  "panels": [ { "heading": "Line 1", "barsPerLine": 4, "end": "final", "measures": [
    { "events": [ {"duration":"4"}, {"duration":"8"}, {"duration":"8"}, {"duration":"4"}, {"rest":true,"duration":"4"} ] } ] } ] }
```

`"show": "chart"` engraves a chord chart: slashes on the stave, chord symbols above.

```json
{ "title": "Blues in Bb", "show": "chart", "frame": "plain", "tempo": { "bpm": 96, "text": "Shuffle" },
  "panels": [ { "heading": "Twelve bars", "barsPerLine": 4, "end": "final", "measures": [
    { "mark": "A", "chords": ["Bb7"] }, { "chords": ["Eb7"] }, { "chords": ["Bb7"] }, { "simile": true },
    { "chords": ["Cm7", "F7"] },
    { "events": [ {"duration":"4.","label":"Cm7"}, {"duration":"8","label":"F7","tie":true}, {"duration":"2"} ] } ] } ] }
```

- `chords`: the chords of the bar, sharing its beats equally (one, two or four in 4/4; one or three in 3/4). If they can't share equally, write the bar as `events`.
- `events` in a chart bar: a written rhythm in slashes (kicks, pushes), with a `label` where each chord falls.
- `simile: true`: the repeat the bar before sign. Not in a panel's first bar.
- `mark`: a boxed rehearsal letter over the bar.
- `repeat: true` on the panel puts repeat signs round it, as for any groove.
- Chord symbols are printed as typed, with real flat and sharp signs. Nothing checks that a symbol is a real chord.

`"end": "final"` on any groove panel ends it with a final double bar. Use it when the figure is a whole piece or exercise, and leave it off for an excerpt. A repeated panel ends with its repeat sign.

Full examples: `examples/grooves/rhythm-line.json`, `examples/grooves/blues-chart.json`.

## 4. Diagram (diagram.js)

Fretboard:

```json
{
  "type": "fretboard",
  "title": "C major shape from A string fret 3",
  "heading": "C major: the shape",
  "frets": [1, 6],
  "markers": [
    { "string": "A", "fret": 3, "role": "root" },
    { "string": "D", "fret": 2, "label": "3" },
    { "string": "G", "fret": 4, "role": "optional", "spelling": "Cb" }
  ],
  "legendLabels": { "root": "Root (C)", "tone": "Scale note" },
  "showOrientation": true,
  "accidentalPreference": "sharp",
  "instrument": { "...": "same as the exercise format" },
  "frame": "panel",
  "theme": "cream"
}
```

- `frets`: `[first, last]`, at most twelve frets. Include 0 to show open strings left of the nut.
- Strings are drawn highest at the top (player's view, as in TAB) and get thicker towards the lowest-sounding string.
- `role`: `root` (orange square), `tone` (charcoal circle, the default), `optional` (open ring), `target` (orange diamond). Shape carries the meaning as well as colour, as the style guide requires.
- `label`: up to three characters (a note name, interval "b3", or finger). Defaults to the note name; `spelling` sets a key-aware name ("Db" rather than "C#") and is checked against the fret.
- The orientation line ("Player's view, as in TAB...") satisfies the style guide's rule that a fretboard states orientation and tuning. Only turn it off when the surrounding text states both.
- Width defaults to auto (about 84 units per fret). Diagram units are not notation units: labels are 20 units, and worksheets print a diagram at 0.176 mm per unit so labels land at 10 pt.

Keyboard:

```json
{
  "type": "keyboard",
  "title": "Natural semitones",
  "range": ["C3", "C4"],
  "highlight": [{ "pitch": "E3", "role": "target", "label": "E" }],
  "legendLabels": { "target": "E to F, B to C: semitones with no black key between" }
}
```

`range` must start and end on white keys and span one to three octaves. Every C is labelled with its octave.

## 5. Worksheet (worksheet.js)

```json
{
  "title": "Session 6 note",
  "kicker": "Session note · Pupil Name · 3 November 2026",
  "aim": "One sentence learning aim.",
  "meta": "Leith Bass Space · Four-string bass in standard tuning",
  "level": "beginner",
  "notationSize": "standard",
  "orientation": "portrait",
  "figureTheme": "print",
  "figureFrame": "plain",
  "runningHeader": "Pupil Name · Session 6",
  "footer": "leithbass.space",
  "portal": { "member": "Pupil Name", "date": "2026-11-03", "start": "18:00", "covered": "...", "summary": "...",
              "objectives": ["..."], "answered": ["..."], "listen": ["..."], "nextTime": "..." },
  "blocks": [
    { "type": "heading", "text": "The idea", "level": 2 },
    { "type": "paragraph", "text": "Text with **bold** and *italic*." },
    { "type": "notation", "exercise": "../c-major-up-and-down.json", "panels": ["ascending"], "title": "Figure 2. Up", "caption": "...", "show": "both", "widthMm": 120, "align": "left" },
    { "type": "groove", "groove": "../grooves/em-eighths.json", "show": "tab", "title": "...", "caption": "..." },
    { "type": "diagram", "diagram": "../diagrams/c-major-shape.json", "title": "...", "caption": "..." },
    { "type": "image", "path": "photo.jpg", "alt": "Required alt text", "caption": "..." },
    { "type": "steps", "items": ["...", "..."] },
    { "type": "bullets", "items": ["...", "..."] },
    { "type": "callout", "label": "Listen for", "text": "..." },
    { "type": "table", "headers": ["Chord", "Tones"], "rows": [["Bb7", "Bb D F Ab"]], "columnWidths": [0.3, 0.7] },
    { "type": "link", "url": "https://leithbass.space/members/elements/#dojo/name/major-lean+major-pull", "label": "Practise it in the app", "text": "Name it, with the lean and the pull in play.", "show": "leithbass.space/members/elements" },
    { "type": "pagebreak" },
    { "type": "section", "orientation": "landscape" }
  ]
}
```

- `exercise`, `groove` and `diagram` accept a path (relative to the worksheet file) or an inline object.
- `level: "beginner"` sets body text to 12 pt; otherwise 11 pt. It does not change the notation size.
- `notationSize`: `compact` (1.6 mm staff space), `standard` (1.8 mm, the default, like most printed bass books), `large` (2.0 mm), or a number of millimetres from 1.5 to 2.6. Labels print at about 10 pt at standard; below 9 pt is refused.
- Figures default to their natural width (up to the text width of the current page) and sit left-aligned under their title. `widthMm` fixes a width instead; `align: "center"` centres one.
- `figureFrame` defaults to `plain`; `panel` puts the web-style card and heading in the document.
- `link` (3.1) prints a QR code beside a label, a line of text and the address in words: the page a pupil should open on their phone. `url` must be an https address of 600 characters or fewer. `show` is the address as printed (it defaults to the address without its query and fragment, so a long link into the app reads as `leithbass.space/members/elements`). The code is 24 mm across and grows for a long address. Get addresses from "Copy a link" in the Elements Dojo, Ear Training and the metronome. Keep to one or two per sheet, at the end.
- `link` with `steps` (3.2): `"steps": ["...", "..."]` (one to six) prints numbered practice steps on the left and the code with its words on the right, in one row. It saves the height of a separate steps block, which is often what keeps a sheet to one page.
- **Flats and sharps** (3.1): write `Bb`, `F#`, `Ebmaj7` in any text or label and they print with the real signs (B♭, F♯, E♭maj7). A sign typed as itself is kept. Pitches in data stay as they were (`"spelling": "Bb2"`). A flat is recognised where a note or chord name can end, so ordinary words are untouched. `m7b5` is left as written: write `m7♭5` if you want the sign there.
- `pagebreak` makes the next paragraph start a new page (no empty paragraph, so no stray blank page). A worksheet cannot end with one.
- `section` starts a new page in the given orientation and keeps it until the next section. Figures in a landscape section can be up to 261 mm wide; use it for long lines of music rather than shrinking them.
- `portal` writes `<slug>-portal.txt` in the Members portal session-notes format (see `references/session-notes.md`). The PDF is listed under Files automatically when `--pdf` is used.
- Outputs, in the output folder: `<slug>.docx` (fonts embedded), `<slug>.pdf` with `--pdf`, page previews and `<slug>-contact.png` (all pages side by side) with `--preview`, `<slug>.worksheet.json` (the source), `<slug>-audit.json` (every note of every figure), `<slug>-portal.txt` if `portal` is set, and `figures/` with each figure's JSON, SVG, PNG, manifest and, for grooves, the LilyPond file.
- With `--pdf`, the builder prints `Page flow:` warnings: a page that stops more than about a third short with more to come (the next block did not fit and moved on), and a last page that is barely used. Fix them by editing content: shorten or split the block that moved, make a figure a little narrower with `widthMm`, reorder, or put steps beside a link.

## 6. Choosing between exercise and groove

| Material | Use |
|---|---|
| Scales, arpeggios, finger-per-fret drills in steady crotchets | exercise, metered |
| Chord tones, note-name studies, anything where rhythm is not the point | exercise, `timeSignature: null` |
| Real bass lines: quavers, semiquavers, rests, ties, dots, triplets | groove |
| Slides, hammer-ons, pull-offs, ghost or muted notes, accents, double stops | groove |
| Key signatures, tempo marks, more than one line of music | groove |
| Where notes are on the neck, intervals, shapes | fretboard diagram |
| Semitone and tone relationships, note names in general | keyboard diagram |

The exercise renderer is the more precise of the two for note names (every notehead, name, finger and fret share one x position), so prefer it whenever the music is plain crotchets.

## 7. Sizes at a glance (print, standard notation size)

| Item | Size |
|---|---|
| Staff space / five-line staff | 1.8 mm / 7.2 mm |
| Note names, fingers, chord labels | about 10 pt |
| TAB digits | about 9.4 pt; TAB lines 3.15 mm apart |
| One 4/4 bar of crotchets with names | about 35 mm wide |
| Fretboard labels | 10 pt; about 15 mm per fret |
| Body text | 11 pt (12 pt beginner); captions 10 pt |
