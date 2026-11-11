# Leith Bass Space house style guide, edition 1.0 (text extract, with skill amendments 1.1 and 1.2)

> **Amendments 1.1 (31 October 2026), made in the worksheet skill at Jack's request (sessions, and less bulky notation):** (a) in worksheets and session notes, Jack's time with a pupil is a *session*, not a lesson (website wording is unchanged); (b) notation is sized by its staff (1.8 mm staff space by default, matching book engraving) rather than by panel width; (c) document figures are plain (no orange box, no heading inside the image), while web panels keep the cream panel and orange border. Changed passages are marked [1.1]. The master PDF/DOCX in the Project has not been updated yet.

> **Amendments 1.2 (11 November 2026), made in the worksheet skill:** (a) flats and sharps are printed with the real signs (B♭, F♯), never as the letters b and #, in every figure and document; the signs come from the bundled "LBS Signs" fonts because Inter and Oswald have none; (b) a worksheet may end with one or two links into the app, each a QR code with a label, a line of text and the address in words. A code is never the only way to reach something: the address is always printed beside it.
>
> Text extracted from the PDF edition dated 19 September 2026. Tables are flattened; the PDF is the master. Note: the contents list on page 1 names nine sections, but the body has ten (notation colour is its own section 3, so later numbers shift by one).

```text
Leith Bass Space
House style guide
A practical design and editorial system for the website, worksheets, documents and notation.
Edition 1.0 • 19 September 2026

The character
Clear, warm and musically serious. A working musician’s teaching practice in Leith: direct enough
to be useful, thoughtful enough to earn trust, and visually distinctive without distracting from the
music.
The core ingredients are condensed Oswald display type, readable Inter text, cream and near-
black surfaces, orange accents, real studio photography and accurate notation. Every application
should make the reader’s next action easier: understand an idea, play an exercise, find a lesson or
contact Jack.

How this guide defines the system
The established baseline is the saved Leith Bass website theme 3.3.1 and the existing Leith Bass
Notation assets. Website colour/font values and the notation palette below are taken from those
sources. Document typography, spacing scales, accessibility pairings and component rules are the
new standard defined by this guide.
Where the two existing systems differ, this guide names their roles instead of pretending they were
identical. Website surfaces retain their tokens; notation retains its warm-paper identity. New work
should follow the rules here. Existing assets need not be recoloured merely to remove a purposeful
difference.

Contents
1.   Identity and hierarchy.
2.   Colour and contrast.
3.   Typography and spacing.
4.   Website components and behaviour.
5.   Documents and worksheets.
6.   Voice, language and musical terminology.
7.   Photography, diagrams and notation.
8.   Recreating the notation tool.
9.   Quality checks and governance.

                                                                                  LEITH BASS SPACE /   1

1. Identity and hierarchy
Names and marks
Use “Leith Bass Space” in formal document titles and explanatory prose. Use “leithbass.space” for
the website address and established wordmark. “lb.s” is an informal shorthand in internal notes or
where the full identity is already clear. Use “Leith Bass Notation” for the notation tool.
Use the supplied logo artwork from the theme, including its light version on dark backgrounds. Do
not reconstruct it by typing similar letters. Preserve aspect ratio and a clear area around it of at
least the height of the lowercase wordmark letters. Do not place it over a busy photographic region
without a reliable contrast treatment.

Visual priorities
The reader should encounter one main title, one clear opening statement and one obvious next
step. On a worksheet, the exercise is the focal point. On a lesson page, the teaching offer and
contact route take priority. On a technical document, navigation and accurate information take
priority.
Use orange to locate attention: a link, a brief cue, an edge or a small highlighted detail. Reserve
large orange fields and torn edges for editorial moments. Do not use every available brand device
on every page.

Display language and teaching language
Display areas may be assertive: large condensed headings, strong cropping, broad dark/light
contrasts and a restrained torn edge. Teaching areas should settle down: generous margins,
simple columns, flat paper surfaces and precise musical graphics.
This is one identity at two levels of intensity. A bass exercise should not inherit a photographic
knockout headline if it makes the notes harder to read. A website hero can have more atmosphere
than a practice checklist.

Case rules
Use uppercase for short generic display titles, navigation and small category labels when it helps
the hierarchy. Use sentence case for long headings, instructions, captions and prose. Keep one
convention within each heading level and medium.
Never uppercase chord symbols, key names or mixed-case music text through a blanket
transformation. Bb is not BB; Em is not EM; Bbm is not BBM. Apply display styling to a wrapper or
separate label rather than rewriting musical content.

                                                                                LEITH BASS SPACE /    2

2. Website colour system
These are the theme 3.3.1 values. Use semantic tokens so text and surfaces switch together.

 Role                              Light mode                         Dark mode
 Canvas                            #F3EFE7                            #090909
 Surface                           #F5F2EC                            #0C0E13
 Raised surface                    #FFFDF8                            #12151B
 Primary ink                       #111111                            #F3F1EB
 Secondary ink                     #333333                            #D4D1CA
 Muted text                        #6F6C66                            #ACA89F
 Orange decorative accent          #E87102                            #E87102
 Orange text / action fill         #B05200                            #F49542
 Text on action fill               #FFFFFF                            #090909

The brighter orange is for graphic accents. The darker light-mode orange is for text and action fills
where contrast matters. Do not substitute the decorative orange everywhere because it appears
more vivid.

Rules and separators
Use low-contrast rules sparingly: the existing theme uses dark ink at about 14% opacity in light
mode and warm light at about 16% in dark mode. A rule divides information; it is not decoration to
put beneath every heading.

Theme behaviour
A dark first-visit presentation is the defined brand preference. Preserve a visitor’s explicit choice
across visits. Apply the theme before the first painted frame where possible. Honour reduced-
motion preferences for animated transitions.
Both editorial split sections must respond to the theme together with the rest of the page. Surfaces,
text, links and rules need a complete mapping. Do not leave one section’s fixed charcoal
background paired with newly dark text.
Photographs remain photographs. Notation stays a cream/white inset unless an individually
checked dark notation variant is deliberately created. Do not use global invert filters on images or
diagrams.

Colour is never the only cue
Links in body text should also be underlined. Changed notes need a label, spelling or explanation
as well as colour. Interactive controls need a visible focus state, meaningful text and a distinct
selected state.

                                                                                   LEITH BASS SPACE /   3

3. Notation colour and accessibility
 Notation role                     Value                             Use
 Warm paper                        #F5EFE2                           Default notation panel
 Print paper                       #FFFFFF                           Low-ink document output
 Charcoal                          #292724                           Music, TAB and primary text
 Orange                            #D86B25                           Border and decorative emphasis
 Dark orange                       #A84912                           Small finger numbers and labels
 Muted brown-grey                  #6A645C                           Secondary notation labels

The darker accent text is a new readability refinement. Keep the familiar orange border on web panels;
document figures are plain [1.1]. Notation
backgrounds intentionally differ from the web canvas; this is a named inset treatment, not an
accidental mismatch.

Contrast rules
Use a minimum 4.5:1 contrast for ordinary text and 3:1 for large text, following W3C’s contrast
guidance. For this design system, treat small notation labels as ordinary text even when their
source-image dimensions look large. Their final displayed size is what matters.
Do not assume white text works on every orange. Use the defined action pairings, and recalculate
contrast if either colour changes. Check muted captions and disabled-looking text as carefully as
headings. Decorative borders can be subtle, but an essential control boundary or musical mark
must remain clearly perceivable.

Reading size and alternatives
Aim for body text of 16–18 CSS px on the website, 11 pt in normal documents and 11–12 pt on
beginner worksheets. Teaching graphic labels should normally reach at least 16 CSS px on screen
or 10 pt in print. These are house targets, not claims that one size suits every reader.
A 24 px TAB digit in a 1600 px image becomes only 9 px when displayed at 600 px wide. Higher
export resolution cannot fix that proportion. Use fewer bars per panel, a different layout, or an
accessible zoom/scroll option. Always provide a useful text description or adjacent explanation of
the exercise.

Accessible structure
Use actual heading styles, readable link labels and real tables. Add alt text to meaningful images;
leave decorative textures unannounced. Do not turn paragraphs into screenshots. PDF page
design should remain legible when printed in greyscale. Preserve an editable document version
alongside PDF, and check reading order when producing an accessible distribution PDF.
Source: W3C, Understanding SC 1.4.3 Contrast (Minimum),
https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html

                                                                                   LEITH BASS SPACE /   4

4. Typography and spacing
Font system
 Role                              Face and weight                        Guidance
 Display headings                  Oswald 700                             Short, confident; avoid stretched
                                                                          tracking
 Body                              Inter 400                              Sentence case, comfortable line
                                                                          length
 Emphasis / labels                 Inter 600                              Prefer selective emphasis over all-
                                                                          bold paragraphs
 Music symbols                     Bravura outlines                       Real engraving glyphs and anchors
 TAB / code                        DejaVu Sans Mono                       Stable digits; keep separate from
                                                                          body typography

The theme supplies Oswald 700 and Inter 400/600. The notation package includes licensed
desktop conversions for document and raster use. If unavailable, use Arial Narrow/Arial for display
and Arial/Helvetica for body, then review line breaks. A fallback is an explicit compromise, not a
new brand font.

New document standard
 Style                                                Size / spacing
 Cover title                                          Oswald 30–34 pt, 1.05 line spacing
 Page or major section title                          Oswald 22–24 pt, 12–18 pt space after
 Subheading                                           Oswald 15–17 pt, 12 pt before / 5 pt after
 Body                                                 Inter 11 pt, about 1.25 line spacing, 6–8 pt after
 Caption / footer                                     Inter 9 pt; concise, never essential instructions at this
                                                      size
 Table                                                Inter 9.5–10.5 pt, adequate cell padding

Use heading styles rather than manual imitation. Keep headings with the next paragraph. Avoid
widows, isolated list items and captions separated from their figures. Do not justify body text or
use hard line breaks to shape ordinary prose.

Web standard
Retain Oswald and Inter. Use a coherent hierarchy rather than reproducing inconsistent historical
size overrides. A practical new scale is H1 36–64 px, H2 28–44 px, H3 22–28 px, body 16–18 px,
with responsive sizes and roughly 1.5–1.65 body line height. Keep display line height around 1.0–
1.15, increasing it if a heading wraps awkwardly.

Spacing tokens
Use a 4 px base: 4, 8, 12, 16, 24, 32, 48, 64 and 96 px. Prefer a few recurring gaps to many
almost-identical values. Body copy should usually remain around 60–75 characters per line. The
existing web maximum content width is 1180 px and reading measure 40 rem; retain these as the
starting grid.

                                                                                          LEITH BASS SPACE /      5

5. Website layout and components
Opening and navigation
State the offer plainly: bass lessons, Leith/Edinburgh, who they are for and the next action. Keep
the main call to action specific, such as “Book a lesson” or “Ask about lessons”. Navigation labels
should describe destinations rather than require the reader to decode a slogan.
Use one H1 per page and a logical sequence of H2/H3 headings. Article titles and image captions
should remain live text. Put meaningful information early; visual atmosphere supports it.

Editorial split sections
Use a roughly 40% text / 60% image balance when the image carries genuine context, then adapt
to the content. On small screens, stack into a coherent reading sequence with the heading and
explanation close to their action. Preserve the important subject in the crop.
Torn orange edges may appear on the first and second homepage splits as an established motif.
Keep their geometry consistent and their contrast deliberate. Do not allow a tear to intrude into text
or obscure a face, hand or instrument. Use the motif selectively elsewhere.

Cards, buttons and links
Keep card padding consistent and titles aligned. A card should group one decision or topic, not
become a border around every paragraph. Use clear primary/secondary button hierarchy; avoid
several equal primary actions in one viewport.
Make controls comfortably usable by touch, with a house target around 44 px in each interactive
dimension. Preserve visible keyboard focus and sensible tab order. Underline text links in prose
and avoid vague “click here” wording.

Articles and teaching posts
Open with the practical question or problem, explain the musical idea, then show an example and
an action the reader can try. Use paragraphs for connected reasoning; use lists for steps or
genuine comparisons. Avoid a succession of one-line paragraphs that makes a short article feel
artificially long.

Motion, images and performance
Use real scroll-linked effects only when they add useful depth. Disable or simplify them for
reduced motion. Prevent image layout shifts with dimensions/aspect ratios. Deliver appropriately
sized images; preserve sharp detail in notation. Confirm dark/light behaviour at mobile and desktop
widths before publishing.
This guide defines visual and editorial behaviour. It does not claim a completed performance,
accessibility or SEO audit of the live site.

                                                                                  LEITH BASS SPACE /   6

6. Documents and worksheets
Page system
Use A4 portrait by default. Set margins around 18 mm, with a slightly larger lower allowance for
page numbers. Keep the page white for economical printing; use cream as a restrained panel fill. A
full charcoal page is a cover or digital presentation choice, not the default pupil worksheet.
Put the document title, short purpose and relevant date/version at the beginning. Use a quiet
running identifier and page number for longer references. Keep one-page teaching sheets simpler.
A large logo and dense footer should not compete with the exercise.

Worksheet sequence
1.   Title and one-sentence learning aim.
2.   A short explanation of the idea.
3.   One or more clearly labelled musical examples.
4.   A small set of purposeful practice steps.
5.   A listening cue or suggested musical application.
This is a sequence, not a requirement to fill five boxes. A short session note [1.1] may need one example and
three instructions. A longer concept may need two pages rather than reduced type.

Notation placement [1.1]
Size notation by its staff, as music books do: a 1.8 mm staff space (7.2 mm five-line staff) by
default, 1.6 mm (compact) for dense reference pages, 2.0 mm (large) for young beginners. At 1.8 mm
note names, fingers and chord labels print at about 10 pt. Figures take their natural width (about
35 mm per bar of four crotchets with names), up to the text width; two to four bars per line is
typical. In documents, figures are plain: no border and no heading inside the image, because the
figure title above identifies it. Keep space above and below. Use the dedicated NOTE and FINGER
rows when needed. Use a landscape section when a long line of music needs the width.
Do not put captions, tempo advice or explanatory paragraphs inside the graphic and then repeat
them beneath it.
A figure title identifies the material; its caption adds meaning. “C major ascending” and “Say the
names as you play” have different jobs. Use each once.

Tables and callouts
Use tables for parallel information: chord, chord tones, function; band comment and response; task
and purpose. Keep cells brief and top-aligned. Repeat header rows across pages; prevent short
rows splitting. Use subtle cream header fills or dark headers with clearly contrasting text. Avoid
unnecessary vertical rules.
Use a callout only for a useful distinction, a listening instruction or a key safety/comfort cue. A full
paragraph does not become more helpful merely because it has an orange border.

Delivery
Retain an editable DOCX and a visually checked PDF. Inspect every rendered page after layout
changes. Check all music glyphs, tables, figure sizes, headers and page breaks. Do not describe a
PDF as fully accessibility-certified merely because it looks correct.

                                                                                     LEITH BASS SPACE /    7

7. Voice, language and musical terms
The voice
Write as an experienced working musician explaining something to a capable person. Be direct,
warm and specific. Connect technique to sound, practice to musical purpose and theory to
something the reader can hear or play.
Avoid inflated claims, generic inspiration and an impersonal academic voice. Do not promise
effortless mastery, instant progress or guaranteed outcomes. Authority comes from accurate
explanation and useful choices. Speak in the first person where it expresses Jack’s actual
approach; never invent anecdotes or quotations.

British English
Use “practise” as the verb and “practice” as the noun: “Practise this slowly”; “a practice routine”;
“Practice makes permanent.” Use “colour”, “centre”, “organise” and “fretboard”. Preserve the
spelling of titles, quotations and proper names.

Teaching language
In worksheets and session notes, Jack's time with a pupil is a session: “session notes”, “Session 4”,
“in our next session”, not “lesson” [1.1]. Website wording is unchanged. Give an action, a reason and something to notice. “Play the phrase slowly, keeping each note the
same length. Listen for a steady pulse.” For younger learners, shorten the explanation while
keeping its musical substance. Avoid patronising praise or implying that a mistake measures their
ability.
Frame progress as increasing familiarity and choice. Use “try”, “notice”, “listen” and “return to”.
Avoid a self-test or exam framing unless it is specifically wanted. A clear technical correction is
compatible with an encouraging tone.

 Avoid                                              Prefer
 Unlock your bass potential                         Build a practice routine you can use
 Master this instantly                              Start slowly enough to hear every note
 Don’t get this wrong                               Keep the note ringing until the next one
 Test yourself                                      Try naming the note before you play it
 This scale works over everything                   This note choice fits this harmony because…

Musical notation in prose
Use Bb7, Bbm, Em and Cmaj7 consistently; preserve case. Use proper ♭/♯ where the font and
destination support them, or ASCII b/# consistently in technical data. Write “D natural” when a
prose explanation benefits from clarity.
Distinguish key, scale, mode and chord. A borrowed or altered chord does not automatically mean
a key change. Spell the relative major of Eb minor as Gb major. When explaining Bbm → Bb7,
identify Db → D natural and preserve the other relevant notes. Verify every specific theoretical
claim against the musical example.

                                                                                      LEITH BASS SPACE /   8

8. Photography, diagrams and notation
Photography
Use original photographs of Jack, instruments, lessons and the studio. Preserve the real basses,
amplifier controls, hands, rooms and equipment. Crop, straighten, grade and composite authentic
source images; do not regenerate their details when the purpose is documentary.
Keep colour treatment natural, with warm neutrals and believable skin tones. Avoid excessive
clarity, crushed shadows and strong orange overlays. Do not repeat the same image close together
merely to fill a space. Use the image that supports the section’s meaning.
For collages, preserve the original pixels of musical equipment and people. Decorative tears can
frame the photos; they should not replace them. Keep text live and separate wherever practical. Do
not generate heading text inside an image.

Concept diagrams
Use clean vector shapes for keyboards, fretboards, ratios, interval relationships and practice
sequences. Colour should highlight the concept, with a label or shape providing a second cue. Use
a consistent stroke weight and alignment grid; avoid decorative arrows that do not encode a
relationship.
Label every axis, string, unit or ratio needed to understand the figure. A keyboard must accurately
show the B–C and E–F semitone relationships. A fretboard must state its orientation and tuning. For
a ratio diagram, identify what is being compared; do not substitute attractive proportions for
numerical correctness.

Music engraving
Use deterministic notation software, not image generation. The standard is a real bass clef, correct
note spelling, literal TAB and the electric bass’s written octave. Treat sound, pitch spelling, string
location and fingering as distinct but connected information.
Keep the staff charcoal and use orange for structure or teaching cues. Keep all aligned
representations of a note on one vertical axis. Note-name labels need their own row, never the
same space as noteheads. Check natural signs, ledger lines and the clearance around very low or
high notes.

Captions and descriptions
A caption explains why the reader should look. Alt text describes the useful visual information.
They may overlap, but should not both repeat a heading without adding meaning. Provide a text
equivalent for a complex exercise rather than forcing an entire lesson into one alt attribute.

                                                                                  LEITH BASS SPACE /   9

9. Recreate Leith Bass Notation
This section is a compact, self-contained brief for another agent. The companion AI Handoff
expands the schema, geometry and tests.

Build contract
Create a deterministic renderer in a language available to the receiving platform. Accept JSON with
a title, optional tuning, meter, accidental preference, noteNames, theme, width and an array of
panels. Each panel has a heading and 1–6 measures. Each measure contains 1–8 notes identified by
string name and fret; optional finger and written spelling are supported.
Default tuning is E1 A1 D2 G2, MIDI 28,33,38,43. Allow 4–6 named strings, ordered low to high.
Calculate sounding MIDI = open MIDI + fret; written MIDI = sounding MIDI + 12 by default. TAB is
never transposed. Validate explicit spellings against written MIDI.
For pitch names, MIDI = 12×(octave+1) + natural-letter pitch class + alteration. C,D,E,F,G,A,B pitch
classes are 0,2,4,5,7,9,11. Preserve spelling: enharmonic equivalence does not mean identical staff
position. Use a five-line bass staff, with G2 on the bottom line and A3 on the top.

Rendering rules
Use Bravura or another properly licensed music font. Reverse the tuning order for visual TAB. Align
notehead, optional name, optional finger and fret number by x coordinate. Reset accidental state
each measure; show naturals when cancelling previous alterations.
Support quarter-note meter [n,4], with each complete bar containing n notes. Permit a shorter bar
only when explicitly marked incomplete. Support timeSignature:null for deliberately unmetered,
stemless pitch studies. Reject unsupported fields; route complex rhythm, key signatures and
polyphony to a full engraving engine.
Use the notation palette on page 4, 24-unit staff spaces, 42-unit TAB spacing, 46-unit labels,
84-unit stems, charcoal music, Oswald headings and Inter labels [1.1]. Width is "auto" by default:
calculated from the music and shared by all panels of one exercise. Web panels have an orange
border and heading; document figures are plain. Make height depend on register and string count. Separate name/finger
rows and reject crowding rather than shrinking type.

Outputs and proof
Produce SVG, optional PNG, editable input JSON and an audit listing every fret, sounding pitch and
written pitch. Add accessible descriptions and preserve font licences. Inspect outputs at their final
size.
Required checks: open E sounds E1/writes E2; A3 sounds C2/writes C3; Bb7 and Em retain case; a
natural cancels an earlier sharp; accidentals reset at the barline; six strings yield six TAB lines;
overfull bars and incorrect spellings fail. The receiving agent must demonstrate these, not merely
describe them.

                                                                                LEITH BASS SPACE /   10

10. Quality control and maintenance
Before releasing any material
 Area                                              Release check
 Content                                           One clear purpose; specific instructions; accurate
                                                   claims
 Typography                                        Correct faces, hierarchy, case and readable final sizes
 Colour                                            Semantic tokens; complete theme mapping; suitable
                                                   contrast
 Layout                                            Enough space; no overlap, clipping or isolated captions
 Photography                                       Authentic source details and appropriate crop
 Music                                             Tuning, octave, spelling, rhythm, TAB and fingering
                                                   checked
 Accessibility                                     Real text/structure, alt text, focus states where relevant
 Output                                            Editable source retained; every final page/image
                                                   inspected

Maintenance rules
Maintain colours as named tokens, document styles as actual styles and notation as data-driven
output. If a rule changes, update the source tokens, this guide and representative examples
together. Assign a new version and date; describe whether the change is visual, editorial or
behavioural.
A deliberate exception may suit a particular audience or medium. State its reason in production
notes and retain the musical and accessibility requirements. Do not turn an isolated exception into
an accidental new default.

Baseline and scope
The visual baseline for this edition is the saved theme 3.3.1 (style.css, its font assets and logo
variants) and Leith Bass Notation’s original references and renderer. The updated notation tool is
version 2.0. New document/spacing rules and darker notation accent text are defined by this
edition.
This guide does not change the live website. It is the standard for future design and content work.
When a later theme changes, inspect its actual assets before claiming that they match this edition.

External references
W3C contrast guidance: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
Oswald family: https://fonts.google.com/specimen/Oswald
Inter family: https://fonts.google.com/specimen/Inter
Bravura source and licence: https://github.com/steinbergmedia/bravura
Keep copyright and SIL Open Font License notices with redistributed font assets. The notation tool
includes these notices for its bundled music glyphs and text fonts.

                                                                                     LEITH BASS SPACE /      11
```
