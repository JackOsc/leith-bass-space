# Leith Bass Notation practical manual, version 2.0 (text extract)

> Text extracted from the PDF dated 19 September 2026. Written for people requesting worksheets; the specification file is the build contract.

```text
Leith Bass Notation
The practical manual
A clear guide to making, checking and using bass notation and TAB.
Version 2.0 • 19 September 2026
Leith Bass Notation turns a precise description of what to play into a consistent teaching graphic.
The staff, note names and TAB come from one musical source, so changing a fret changes the
written note with it.
It is designed for scales, technique exercises and short chord-tone studies. Its strength is
dependable, readable teaching material: a pupil should be able to see what to play, hear what it
means and return to the exercise without deciphering the layout.
The skill combines instructions, a small rendering program, examples, music-symbol artwork, fonts
and checks. You can ask an AI assistant for an exercise in ordinary language; the assistant
prepares the musical data and runs the tool. You do not have to write code to request or revise a
worksheet.

In this manual
1.   What the tool does, and where its limits sit.
2.   How staff notation, TAB, note names and fingering fit together.
3.   How to request and revise an exercise.
4.   How to use the files on a website or in a worksheet.
5.   How to check the result and solve common problems.
6.   What changed in version 2.

A useful first request
“Use Leith Bass Notation to make C major ascending from fret 3 on the A string. Show bass-clef
notation, TAB, note names and fretting-hand fingers in two bars of 4/4. Make it suitable for an A4
worksheet. Explain the task once, beneath the image.”
The starting fret alone does not determine every later fingering. When you have a preferred
position or string crossing, include it. Otherwise the assistant should choose a playable pattern and
make the choice clear.

                                                                                 LEITH BASS SPACE /   1

1. Reading the graphic
The staff is the five-line system at the top. TAB is the string diagram beneath it. Both describe the
same notes; each notehead is vertically aligned with its TAB number.

Staff and TAB
Bass-clef notation shows musical pitch and, in a metered exercise, quarter-note rhythm. TAB
shows the physical location: a number is the fret to play; 0 means an open string. The top TAB line
is the highest-pitched open string. Standard four-string TAB reads G, D, A, E from top to bottom.
The NOTE row spells each pitch class, such as C or Bb. It is optional and particularly useful when
connecting shapes to note names. The FINGER row gives fretting-hand fingers: 1 index, 2 middle, 3
ring, 4 little finger. These are suggestions for the specified exercise, not alternative fret numbers.

Why the staff looks an octave higher
Electric bass is normally written one octave above the sound it produces. Open E sounds E1 but is
written E2. This is normal bass notation. The tool adds twelve semitones for the staff and keeps the
TAB exactly as played. It never adds twelve frets to the TAB.

 Played location                    Sounding pitch                   Written pitch
 Open E                             E1                               E2
 A string, fret 3                   C2                               C3
 Open G                             G2                               G3
 G string, fret 12                  G3                               G4

Octave numbers in the data distinguish pitches precisely; ordinary note-name labels omit them to
reduce clutter.

                                                                                     LEITH BASS SPACE /   2

2. Choosing the right exercise
Supported directly
The bundled renderer makes one image per panel. A panel contains one to six measures or pitch
groups, with one to eight notes in each. The practical capacity depends on width: a narrow
worksheet panel usually wants one or two bars.
It supports four to six strings, explicit tuning, frets 0–36, optional fingers 1–4, sharps, flats and
naturals, named pitches, bass clef, simple metered quarter notes and unmetered studies. A custom
tuning must list the strings from lowest to highest open pitch.

Rhythm: two clear modes
For a rhythmic exercise, specify a meter such as 4/4 or 3/4. Every note is a quarter note. A bar of
4/4 must therefore contain four notes. A genuine shorter pickup can be marked incomplete; an
overfull bar is always rejected.
For a study concerned only with pitches, choose the unmetered mode. The image shows stemless
noteheads and no time signature. Its group boundaries organise the material; they do not imply a
bar duration. It must be described as a pitch study in the surrounding text.
Do not ask the assistant to remove rhythm merely to make an unsupported passage fit. Eighth
notes, rests, ties, beams, tuplets, simultaneous staff chords, key signatures and full scores need a
more complete engraving engine. Leith Bass house styling and checking rules still apply to that
engine’s output.

Spelling is part of the teaching point
A fret may have more than one name. The same pitch can be F# or Gb; the correct choice depends
on the harmony. In Eb minor, use Gb major as the relative major spelling, not F# major. For the
Bbm-to-Bb7 change, Db becomes D natural while the root remains Bb.
“Prefer flats” is only a default for choosing black-key names. It does not understand keys or
guarantee a correctly spelled scale. Give explicit spellings when musical function matters,
including Cb and E# where appropriate. The tool checks that each spelling matches the fret’s pitch;
the teacher or assistant checks that it makes musical sense.

What remains a human judgement
The renderer does not assess hand comfort, assign fingering, infer a scale from its name, explain
harmony or decide how much information a learner needs. Those are teaching decisions. It checks
the relationship between supplied data and the resulting notation.

                                                                                 LEITH BASS SPACE /    3

3. Requesting and revising material
Give the assistant five things
 Decision                                           Example
 Learning aim                                       Connect the C-major shape to note names
 Musical material                                   C major ascending and descending
 Physical location                                  Begin on A-string fret 3; stay in this position
 Reading support                                    Show note names and fingering; use two bars per
                                                    panel
 Destination                                        A4 worksheet, web article or phone-friendly graphic

Add a tuning when it differs from E–A–D–G or when using five/six strings. Add rhythm, key spelling
and any required string crossing. Specify concert pitch only if you deliberately want to depart from
normal bass notation.

Three ready-to-use prompts
“Make an ascending and descending C-major scale from A-string fret 3. Use separate panels,
written bass pitch, named notes and TAB. Keep the practice instruction outside the graphics. Use
encouraging language for a bright eleven-year-old.”
“Show the chord tones of Bbm and Bb7 as an unmetered study. Preserve the chord-symbol case.
Explain how Db changes to D natural. Include notation, TAB and a note-name row.”
“Revise this exercise so that the G is on D-string fret 5. Preserve the other notes and page layout.
Recalculate the notation from the changed TAB, and tell me if that position changes the proposed
fingering.”

A reliable revision sequence
1.   Make the change in the exercise data, not in the finished picture.
2.   Validate pitch, spelling, rhythm and supported fields.
3.   Regenerate the images and the audit file.
4.   Inspect the revised image and its placement in the final document.
For “make it cleaner”, first remove redundant explanation, then reduce the number of bars per
panel, then adjust the width. Do not solve crowding by making everything smaller. If names collide
with notation, use the dedicated NOTE row; do not drag individual labels around by eye.

Keep the session positive and specific
Prefer “Play slowly enough to name each note” to “Test yourself until you stop making mistakes.”
Give a musical listening cue: “Let each note ring evenly” or “Hear how D pulls towards Eb.” Add
challenge by changing the task, not by adding pressure. Avoid an exam or “self-test” frame unless
requested.

                                                                                        LEITH BASS SPACE /   4

4. Files, commands and publishing
What you keep
 File                                               Purpose
 Exercise JSON                                      The editable musical source and layout choices
 SVG                                                Scalable vector image; best source for web and design
                                                    work
 PNG                                                Stable picture for Word, slides and image upload
                                                    workflows
 Manifest JSON                                      Note-by-note audit, file names, dimensions and
                                                    descriptions

Keep the exercise JSON beside the final images. SVG is a graphic master, but the exercise JSON is
the musical source for revisions. The manifest makes verification possible; it is not a MIDI
performance, MusicXML score or editable notation project.

Running it yourself
Install Node.js to run the program. Run scripts/setup.sh for PNG export, fonts and the worksheet packages. Install the bundled
Oswald and Inter fonts using your operating system’s font installer. Work from the skill folder or
replace the script path below with its full path.
node scripts/render.js examples/c-major.json --check
node scripts/render.js examples/c-major.json --out-dir output --png
node scripts/test.js
Omit --png to create SVG only. The renderer has no npm package dependencies. If PNG export
fails, the SVG may already exist; the tool reports an error rather than pretending PNG succeeded.

In a worksheet
The worksheet builder sizes notation by its staff: a 1.8 mm staff space by default (the size of
most printed bass books), which puts note names, fingers and TAB digits at about 10 pt. Figures
are plain on white, with the figure title and caption in the document text. Ask for "compact"
or "large" notation if a page needs it. Keep the figure and its caption together. Explain finger numbers outside the image once, if the reader needs that
explanation.

On the website
Use a descriptive filename and specific alt text. Keep SVG music on its own cream panel in both
site themes; do not invert the image with a CSS filter. Use width: 100%; height: auto, but check
the resulting text size. A wide image scaled to a phone can become unreadable. Provide shorter
panels or a labelled zoom/scroll option and a nearby text equivalent.
A good text equivalent identifies the notes and locations: “C major ascending: A3, A5, D2, D3, D5,
G2, G4, G5, where the letter is the string and the number is the fret.” Clarify that compact notation
convention whenever you use it.

                                                                                     LEITH BASS SPACE /     5

5. Checking and troubleshooting
Before sharing
Read the graphic as a pupil would. Is the starting string obvious? Do noteheads, note names,
fingers and TAB align? Are the lowest notes clear of labels? Are accidentals visible? Is the exercise
legible at its actual size? Does the text explain the task once?
The program verifies tuning plus fret, written octave and explicit pitch spelling. Its crowding checks
are conservative guards, not a full engraving or collision engine. Visual inspection is still required,
especially at extreme registers or after a font change.

 Symptom                                            Action
 Wrong-looking octave                               Check written offset is 12, then compare a known open
                                                    string
 “Spelling does not match”                          Use the written octave in spelling; check string and fret
 Incorrect bar length                               Correct the grouping; mark a genuine pickup; use
                                                    unmetered only for pitch studies
 Crowded panel                                      Use fewer measures or increase width; retain readable
                                                    type
 Unexpected chord capitals                          Keep the supplied case and remove external
                                                    uppercase styling
 Font looks different                               Install the bundled fonts and regenerate the PNG
 Unsupported field error                            Correct a typo or route unsupported music to a full
                                                    engraving engine
 PNG unavailable                                    Install Inkscape or deliver the SVG explicitly

Version 2 review and improvements
The previous tool’s strongest feature was its single source of pitch truth. That remains. The update
adds bar-length validation and rejects unsupported properties instead of silently ignoring them.
This prevents plausible-looking pictures that misrepresent the requested music.
Chord-bearing headings and labels now preserve case. Note names have their own row, separated
from noteheads and fingering. Four-, five- and six-string instruments use the same transposition
rules. New examples cover a beginner C-major scale and the Bbm-to-Bb7 change.
Print mode uses white paper. Width can be set between 800 and 2400 px. Darker orange
instructional text improves readability while retaining the familiar orange border. Oswald and Inter
bring notation headings and supporting text closer to the website.

Deliberate limits
The update does not add a full rhythmic score editor, automatic mobile reflow or automatic
fingering. These should not be implied in future instructions. Use a full engraving engine for
complex music; use shorter panels for small screens; choose fingering as a teacher.

Related documents
The House Style Guide defines the visual and editorial system across media. The AI Handoff &
Reconstruction Specification gives a platform-neutral blueprint, data contract, calculations and
acceptance tests for building an equivalent tool.

                                                                                       LEITH BASS SPACE /       6
```
