# Leith Bass Notation
## AI handoff & reconstruction specification
A platform-neutral blueprint for rebuilding the teaching tool.

Version 2.0 • 19 September 2026

> **Version 3.0 note (31 October 2026).** render.js 3.0 keeps every musical rule in this document (pitch, transposition, spelling, accidentals, meter, validation, audit) and changes the geometry at Jack's request, because printed notation was about 2.4 times larger than book engraving relative to the text. Differences from the geometry below: labels 46 units, TAB digits 44, TAB spacing 42, stems 84 (3.5 staff spaces); width "auto" by default; notes in equal slots per bar; measure labels default to nothing; time signature on the staff only; `frame` (panel or plain), `show` (both, notation, tab), `rowLabels` and panel `repeat` are added. Where the geometry sections below disagree, `scripts/render.js` and `references/formats.md` are current. The acceptance checks in section 6 still apply and pass.

### Outcome
Build a deterministic tool that turns explicit bass string/fret data into clean, accurate bass-clef notation and TAB, using the Leith Bass visual system. It must work without private conversation history, proprietary agent memory or a particular AI platform.

The tool is the notation capability used by Leith Bass Space. This specification is not a brief to rebuild the teaching website or its booking system. It includes the brand rules needed to make the notation feel native to that website and its documents.

### Two valid implementation routes
Reuse the installed source, glyphs, fonts, examples and references when they are available. The existing implementation is a small Node.js program, with Inkscape for PNG export and no npm runtime dependencies.

If the source is unavailable, implement the behaviour described here in another language or use an established engraving engine behind the same input contract. Reproduce musical semantics and output legibility first. Byte-for-byte identical SVG is not a requirement; pitch, string placement, spelling, rhythm, case and alignment are.

### Required deliverables from the receiving agent
A runnable renderer; a machine-readable schema; input examples; licensed music symbols and fonts or an explicit dependency list; automated acceptance tests; SVG and PNG sample outputs; a note audit; and concise usage instructions. Identify any feature that is not implemented.

### Contents
1. Architecture and input contract.
2. Pitch and spelling model.
3. Engraving and layout model.
4. Output, accessibility and portability.
5. Acceptance tests and realistic tasks.
6. Build procedure, migration and extension rules.

---
# 1. Architecture and input contract
Use this pipeline: parse input → reject unsupported data → normalise tuning and notes → derive sounding/written pitches → validate meter → lay out the panel → render → export → inspect.

Keep music data separate from layout data. Never infer a written note by looking at a generated picture. A renderer can be implemented as pure functions plus file I/O; it does not require an LLM at runtime.

| Top-level field | Contract |
|---|---|
| title | Required non-empty text |
| slug | Optional output stem; otherwise derive from title |
| instrument | Optional; standard E1 A1 D2 G2, written offset +12 |
| timeSignature | Default [4,4]; [n,4] for n=1–9; null for unmetered |
| accidentalPreference | sharp or flat; default sharp |
| noteNames | Boolean, default false |
| theme | cream or print; default cream |
| width | Integer 800–2400; default 1600 |
| panels | Non-empty array of independently rendered panels |
| $schema | Optional editor reference, not musical data |

Each panel requires `heading` and `measures`; optional `slug`, `altText` and `description`. Each panel has 1–6 measures. Slugs must be non-empty and unique after normalisation. Preserve the case of heading and label text.

Each measure uses exactly one representation: a `notes` array, or a single `string` with parallel `frets`, optional `fingers` and optional `spellings` arrays. Both forms permit `label` and `incomplete`. Arrays contain 1–8 notes. A non-empty fingers/spellings array must match the fret count. An empty label suppresses the printed label.

A note contains `string`, integer `fret` 0–36, optional `finger` 1–4 or null, and optional written `spelling`. Reject unknown properties at every object level; never silently discard duration, rest, key signature or articulation data.

Instrument strings are a list of 4–6 objects with distinct `name` and integer `openMidi` 0–127, ordered strictly low to high. `writtenOctaveOffset` is an integer, normally 12. Reject sounding or written notes outside MIDI 0–127.

---
# 2. A complete portable example
This example needs no prior conversation. It defines eight ascending notes in two bars, with explicit fingering and computed note-name labels.

```json
{
  "title": "C major from A string",
  "width": 900,
  "timeSignature": [4, 4],
  "noteNames": true,
  "theme": "cream",
  "panels": [{
    "heading": "C major: ascending",
    "altText": "C major ascending from A-string fret 3, in bass notation and TAB.",
    "measures": [
      {"label": "", "notes": [
        {"string": "A", "fret": 3, "finger": 2},
        {"string": "A", "fret": 5, "finger": 4},
        {"string": "D", "fret": 2, "finger": 1},
        {"string": "D", "fret": 3, "finger": 2}
      ]},
      {"label": "", "notes": [
        {"string": "D", "fret": 5, "finger": 4},
        {"string": "G", "fret": 2, "finger": 1},
        {"string": "G", "fret": 4, "finger": 3},
        {"string": "G", "fret": 5, "finger": 4}
      ]}
    ]
  }]
}
```

Expected written pitches are C3 D3 E3 F3 G3 A3 B3 C4. Sounding pitches are C2 D2 E2 F2 G2 A2 B2 C3. TAB is exactly A3 A5 D2 D3 D5 G2 G4 G5, where letters name strings and numbers name frets.

For the compact form, a measure such as `{"string":"E","frets":[9,10,11,12],"fingers":[1,2,3,4]}` expands to four notes. The default label is E STRING. This form must not coexist with a notes array in that measure.

A one-note pickup in 4/4 may set `incomplete: true`. Do not infer pickups from short bars. A null time signature deliberately removes meter and stems; the output must be called an unmetered pitch study.

---
# 3. Musical calculations
### Pitch source of truth
For each event: sounding MIDI = open-string MIDI + fret. Written MIDI = sounding MIDI + writtenOctaveOffset. The staff uses written MIDI and its spelling; TAB uses the original string and fret.

For natural letters, pitch classes are C=0, D=2, E=4, F=5, G=7, A=9, B=11. A spelled note has MIDI value `12 × (octave + 1) + natural pitch class + alteration`. Alteration is +1 for sharp, −1 for flat, 0 for natural. Scientific pitch notation has middle C = C4 = MIDI 60.

Parse spellings as a letter A–G, an optional single # or b, and a signed integer octave. Accept Unicode ♯/♭ by normalising to #/b. Preserve the diatonic letter and octave rather than respelling from MIDI. B#2 and C3 share MIDI 48 but occupy different diatonic positions; Cb3 and B2 share MIDI 47. Double accidentals are outside this renderer’s contract.

If an explicit spelling’s MIDI differs from the derived written MIDI, reject it. Without a spelling, use a chromatic sharp or flat name table and derive octave with floor(MIDI/12)−1. Do not pretend this default table supplies key-aware scale spelling.

### Standard tuning examples
| Instrument | Low-to-high open MIDI | Written offset |
|---|---|---|
| Four-string E A D G | 28, 33, 38, 43 | +12 |
| Five-string B E A D G | 23, 28, 33, 38, 43 | +12 |
| Six-string B E A D G C | 23, 28, 33, 38, 43, 48 | +12 |

These are examples, not assumptions about a user’s instrument. A high-C five-string or alternative tuning must be specified explicitly.

### Accidentals and meter
Maintain accidental state by letter plus written octave, reset for each measure. Begin with natural because this renderer has no key signatures. Show an accidental when the desired alteration differs from the previous state. Show a natural sign when returning to natural. Repeated altered notes in the same bar need no repeated sign.

In metered mode, every event is one quarter note. Require denominator 4 and event count equal to numerator. An explicitly incomplete measure may contain fewer notes; never more. In unmetered mode, draw neither stems nor time signatures. Do not invent rhythmic information.

---
# 4. Engraving and geometry
### Coordinate model
Use an SVG viewBox with width 800–2400 and dynamic height. The reference implementation starts at width 1600 and minimum height 650. Staff-space size is 24 units; TAB line gap is 38. Left margin is 72; right edge is width−70; musical measures begin at x=185 after the clef/meter area.

The five bass-staff lines, bottom to top, are G2 B2 D3 F3 A3 in written pitch. Assign C,D,E,F,G,A,B diatonic indices 0–6. For a spelled note, d = 7×octave + letter index. Bottom staff line G2 has d=18. Its y coordinate is `staffBottom − (d−18) × 12`.

The reference staff top is at least 250. If high notes need more room, raise the staff’s numeric y position so their noteheads remain below the label zone: compute each relative y as `96 − (d−18)×12`, then staffTop = max(250, ceil(176−minRelativeY)). Staff bottom = staffTop+96.

Draw ledger lines at each complete staff-space interval beyond the top/bottom staff, as far as the note requires. Use short lines centred on the notehead. Bravura paths are scaled by 24/250 from their font-space unit system and flipped vertically for SVG. Position the F-clef origin on F3, the fourth line from the bottom.

### Columns and text rows
Divide the available measure region evenly. For each measure, inset the first note by min(56,18% of measure width) and the last by min(46,15%). Distribute centres evenly; centre a single note. Reuse the identical x coordinate for notehead, note name, finger and TAB.

Reject centre spacing below 54 units. Reject headings and labels that fail a conservative fit estimate, then inspect actual text. For a fresh implementation, measured glyph/text bounds are preferable to character-count estimates. Do not squeeze or distort type to force a fit.

Place the base label row below both staff and low notes: max(420, staffBottom+74, lowestNoteY+55). If names are enabled, use that row for NOTE, then put FINGER 42 units lower. TAB begins at least 50 units below the final row. Height must contain the last TAB line plus 66 units of bottom clearance.

### Marks
Stem down on/above the middle staff line, up below it; reference stem length 66 units. Use true music-font noteheads and accidentals. Place accidentals left of noteheads using glyph bounds with 7 units of clearance. Mask TAB lines behind digits with the panel background. Draw 4–6 TAB lines in reverse tuning order. Preserve literal fret values and chord-symbol case.

---
# 5. Visual system, outputs and accessibility
| Role | Default |
|---|---|
| Panel | #F5EFE2 cream, or #FFFFFF print |
| Music / primary text | #292724 charcoal |
| Border | #D86B25 orange, 6 units, 26-unit radius |
| Small accent text | #A84912 dark orange |
| Secondary text | #6A645C |
| Heading | Oswald 700, 34 units; preserve musical case |
| Labels / note names | Inter; labels 18, note names 21 units |
| Fingering | 21 units, semibold/bold, dark orange |
| TAB digits | DejaVu Sans Mono bold, 24 units |

These notation colours intentionally differ slightly from the web canvas. Treat the graphic as a warm paper inset in either site theme. Keep instructional prose outside the figure. If full brand assets are absent, use documented fallback fonts and say that exact typography requires Oswald/Inter; never invent a matching font.

### Output contract
For each panel, output `<exercise-slug>-<panel-slug>.svg`, optionally `.png`, and one exercise manifest. Use lowercase hyphenated slugs, escape XML text, avoid path traversal, and create files only under the requested output directory. The current slug function retains ASCII a–z and digits, replacing other runs with hyphens; reject empty results and duplicate panel slugs.

The SVG needs a title and description, `role="img"`, a viewBox and explicit dimensions. If inline SVGs share a page, prefix accessibility IDs per panel to avoid duplicate title/description IDs. For external image elements, also supply alt text in the page markup.

Manifest schema 2 includes rendererVersion, title, slug, instrument, meter, theme, noteNames and per-panel files/dimensions, alt text and note audit. Each audit event records measure/note index, string, fret, finger, soundingPitch, writtenPitch and semitoneOffset. Record incomplete bar indices and whether all offsets agree with the instrument definition.

### Display and export
SVG is the scalable graphic master, JSON the editable music source. PNG export can use Inkscape; another faithful SVG rasteriser is acceptable if verified. Preserve font licences and Bravura’s OFL notice. Do not rebuild music symbols from generative images or decorative Unicode characters.

At actual display size, aim for teaching text of at least 16 CSS px on screen and 10 pt in print. A large raster pixel count does not make a heavily reduced graphic readable. Build shorter mobile panels, offer zoom/scroll when necessary and include a text equivalent. Do not claim automatic responsive reflow: version 2 does not implement it.

---
# 6. Acceptance tests
An equivalent tool must pass musical tests, validation tests and visual checks. Screenshots alone cannot establish pitch correctness.

| Test input | Required observation |
|---|---|
| Open E, standard bass | Sound E1/MIDI28; written E2/MIDI40; fret 0 on bottom TAB line |
| A-string fret 3 | Sound C2; written C3; unchanged fret 3 |
| G-string fret 12 | Sound G3; written G4; ledger lines correct |
| E-string frets 2,2,1,2 | Written F#2,F#2,F2,F#2; sharp, no repeated sign, natural, sharp |
| F# again after barline | Sharp reappears |
| A fret 2 spelled Cb3 | Accepted, MIDI47; diatonic C position |
| A fret 3 spelled B#2 | Accepted, MIDI48; diatonic B position |
| A fret 3 spelled C2 | Rejected: wrong written octave |
| Chord label Bb7 / Em | Exact case survives rendering |
| 3 quarter notes in 4/4 | Rejected unless explicitly incomplete |
| 5 quarter notes in 4/4 | Rejected even if incomplete |
| Null meter | No time signature and no stems |
| duration or rest field | Rejected as unsupported |
| Notes plus compact frets | Rejected as ambiguous |
| Six-string open B / C | Sound B0/C3; written B1/C4; six TAB lines |
| Crowded narrow panel | Clear error; no illegible export claimed successful |

Also test Unicode accidentals, XML characters in titles, duplicate slugs, invalid string names, arrays of inconsistent length, notes outside MIDI range and non-integer frets. Verify exported filenames remain within the output directory.

### Realistic end-to-end tasks
Create C major ascending from A-string fret 3 with names and fingering, two bars at 900 px. Compare every event against the example on page 3. Inspect the final worksheet placement.

Create a Bbm-to-Bb7 pitch study with explicit Bb, Db/D, F and Ab spellings. Use mixed-case chord labels and show why the third changes. Confirm no rhythmic claim is implied.

Create a six-string open-string study. Confirm B is the bottom line and C the top. Resize for the destination without altering pitch or TAB.

Ask an independent receiving agent to complete one of these tasks using only the tool and this brief. Check what it actually produces, not whether it says it followed the instructions.

---
# 7. Rebuild and extend responsibly
### Suggested implementation sequence
1. Implement parsing, strict field validation, tuning normalisation and pitch calculation. Test the musical invariants before drawing.
2. Implement diatonic staff placement, accidentals and reverse-order TAB. Use licensed music-font outlines with known anchors and metrics.
3. Add aligned note-name/finger rows, protected label zones, bounded width and dynamic height. Preserve musical case.
4. Write deterministic SVG, a note audit and optional raster export. Add actionable errors and the complete example set.
5. Run acceptance tests; inspect every example at source size and its intended document/phone size. Check font substitution.
6. Package instructions, schema, examples, scripts and required assets. Explain dependencies and unsupported features.

### Suggested package layout
```text
SKILL.md or equivalent agent entrypoint
scripts/render.js (or renderer in another language)
scripts/test.js
references/exercise.schema.json
references/specification.md
references/house-style.md
references/brand-system.md
references/reconstruction.md
examples/c-major.json
examples/bbm-bb7.json
examples/finger-per-fret.json
assets/bravura-glyphs.json and OFL notice
assets/fonts/ and licences
```

An agent that cannot execute code should prepare a valid specification and instructions for a code-capable environment, and clearly state that rendering has not run. A generated-looking music picture is not a substitute.

### Migration and extensions
Version 2 deliberately rejects old inputs whose quarter-note bars do not match their meter, and fields the old renderer silently ignored. Correct the music rather than weakening validation. Keep normal existing four-string quarter-note exercises compatible.

Before adding richer rhythm, introduce explicit durations and rational beat totals. Before adding key signatures, define their accidental state and cancellation rules. Before adding ties, define cross-bar accidental treatment. Before adding simultaneous notes, implement collision and voice layout. Use a mature engraving engine when this is the safer engineering choice.

The human manual and House Style Guide accompany this specification. The style guide repeats the core recreation requirements so it can travel independently. Maintain one canonical schema and test suite in the implementation; do not let prose examples evolve separately from executable behaviour.

