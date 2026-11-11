# Leith Bass Members 1.13.0: build notes (in progress)

Started 11 Nov 2026. One release for the whole programme in `claude/leith-bass-space-review-2026-11-11.md`, as decided in `claude/programme-decisions-2026-11-11.md`. **Nothing here is installed or launched.** Built on plugin 1.12.1 and theme 3.19.0.

This note is updated as each part is built. The newest checkpoint zip is what to work from: ask Jack to attach it if the working files are gone.

| Checkpoint | Date | What is in it |
| :-- | :-- | :-- |
| `leithbass-members-1.13.0-alpha.1.zip` | 11 Nov | Harmonic Elements (below). The theme is unchanged so far. |
| `leithbass-members-1.13.0-alpha.2.zip` | 11 Nov | Adds the metronome's new ways of practising (below). The theme is still unchanged. |
| `leithbass-members-1.13.0-alpha.4.zip` | 11 Nov | Adds the Guide's new order, Count it off, and the phone fixes in Ear Training and Read (below). |
| Branch `release-1.13.0`, alpha.5 | 11 Nov | Adds Several passages, At tempo in chunks, Blind bars and Strong and weak beats (below). No zip. |
| `leithbass-members-1.13.0-alpha.3.zip` | 11 Nov | Adds links: a metronome setup as a link, links into the Dojo, and Hear it from each home on the Guide's pages (below). |

## Programme status

| Part | Status |
| :-- | :-- |
| Harmonic Elements: home established, the two drills, cadences, the nineteen sorted, steps, Guide page, phone layout | **Built** (alpha.1), on the proposals in `claude/harmonic-elements-placeholders-and-names-proposal-2026-11-11.md` |
| Harmonic Elements: still to do | Jack's audition answers written in as the list of accepted homes; his names and lines for the eleven drafts; "The axis, minor view" filed as minor; the band landing on home when a round is answered; Hear it from each home on the Guide's cards; Today and a Map; the Guide's own order (it still opens "About the course", "How this document is organised"); the Play panel on Read's engraver; the course text in the Project brought into line (see below); the member card in wp-admin showing Find home |
| The metronome (Gebrian): Thin the click, 1 and 3, wider gaps, Click up a step at a time with a goal, the interleaved clicking up guide, flash defaults | **Built** (alpha.2) |
| The metronome and the Shed: still to do | Interleaved clicking up #2 (several passages, growing jumps) and at-tempo chunking; a strong, weak, medium, weak accent shape; the count in with a displaced click (check what it does now); blind bars measured by tapping; count it off; set list; a setup shared by link; five in a row, shuffle my plan and lucky dip in the diary; the free page's copy with a credit to Gebrian's book and the walking suggestion; whether the interleaved guide's progress should be saved to a member's account (it is kept on the device now) |
| Links (the start of the link scheme) | **Built** (alpha.3) for the metronome and the Elements Dojo. Still to do: links into Ear Training's drills and Read's drills (Read and Elements already have hash routes for pages), a drone link already exists, and "sets from Jack" as lists of links on a member's page |
| One app: Today on Home, Today and Map in every room, one engraver, one latency setting | Not started |
| Ear Training: cut off tabs, opens on Today, a short Guide | Not started |
| Read: touch targets | Not started |
| Worksheets skill 3.1 and style guide 2.0 | Not started |
| Theme: copy for the changed Dojo, Coming Soon stills | Not started. Theme 3.19.0's Harmonic Elements copy still describes 1.9.0's Dojo |
| GitHub repository | Waiting for Jack to connect GitHub |

## Harmonic Elements in alpha.1

### What changed for the player

- **Name it** now gives home and asks for the element only. **Find home** (new) gives nothing and asks for the key only. Which is which and Before and after are as they were.
- **Home is established by the band** in Name it, four ways (The mix → Home): Cue (default), Pedal, Bass, Loop only. A recorded loop from Nextcloud gets the cue whichever is chosen, because the band's bass can't follow a recording's own timing.
- **Home hit**: one bar of the home chord over the loop from the next bar line. Name it only.
- **Hear it from each home**: in every answer, one button per home, replaying the chords from that home with the band's bass on the roots.
- **Find home** says "This loop has two homes" before you answer, and accepts any of them.
- The room opens on the Dojo. On a phone (390×844) Check ends at 789 px in Name it with the default mix, and 838 px in Find home, both with the first visit's hint showing (about 48 px, gone after the first answer). Before: about 1,460 px.

### What changed underneath

- `he-catalogue.js`
  - `E()` takes `id` and `file` in its last argument, so a renamed element keeps its id and the name its recordings are filed under. The new name is added to its aliases.
  - `shape`: `'loop'` or `'cadence'`. A cadence has one home in `HE.keyHearings`, is its own sound in `HE.sameSound`, and is never offered as another loop's hearing. Cadences: the cadential cell, the minor cadence, the long cycle, the lift, the chain of dominants, the V of IV, the minor plagal cadence, the backdoor cadence, the altered dominant, the tritone substitution, the Aeolian cadence, the ii V into IV.
  - `out` (`'merged'` or `'dropped'`) and `into`: elements taken out by name. They are `retired`, stay in `HE.ALL`, and a Guide link to a merged one opens what it became.
  - `draft`: wording that is Claude's, for Jack to rewrite (eleven elements).
  - Active elements: 65 (was 73). Known by name: 84, unchanged. Loops with more than one home: 24 (was 33).
  - **The ii V into IV is played as an eight bar phrase**: I (2 bars), v7, I7, IV (2 bars), I (2 bars). As three chords going round it was ii V I in another key.
  - **The line cliché is in Stage 8**, not Stage 1 as first proposed: a Stage 1 element is a `home` in the code, and it has four chords.
  - Stages 11 to 13 ("More molecules") are `retired`, kept for the names of the elements that are out.
  - `HE.label(el)`: "I IV, the major lean". Not used on screen yet.
- `he-trainer.js`
  - `mix.home` is `'cued' | 'pedal' | 'bass' | 'plain'` (`HE.trainer.HOME_WAYS`). A saved `'hidden'` becomes `'cued'`.
  - `round.ask` is `'element'` or `'home'`. `mark()`: for `'home'` the key alone is judged; for `'element'` an element is right only if it is this loop from this home.
  - `entry()` writes `ask`. `stats()` returns `homes` and leaves Find home lines out of an element's attempts.
  - Presets: "More molecules" is gone, "Two homes" is new.
- `harmonic.js`: the two drills; `homeBassSpec`, `homeHit`, `hearingRound`, `hearFrom`; `source.more` plays `round.homeBass`; the mix's Home control; the room opens on the Dojo.
- `harmonic.css`: phone rules under 40rem. The home hit sits on the band's line using `:has()`; a browser without it stacks them.
- `includes/harmonic.php`: the `ask` field is kept by `lbs_he_clean_entry()`; the Home hit button and an id on the element question.
- `he-guide.js`: patched by `claude/harmonic-elements-guide-patch-1.13.js` (step names, the "12. Whose home is it?" page).

### The course text is behind (a debt)

`he-guide.js` is generated from the course text. For alpha.1 it was patched after the build, not rebuilt. **Until `claude/harmonic-elements-course-text-revised-2026-10-28.md` carries the same changes, run the patch script after any rebuild.** The changes the course text needs:
1. "shift" becomes "step" in the five card names and wherever those names are written.
2. A section at the end of Part One, "12. Whose home is it?".
3. Cards for the eleven kept molecules, once Jack has written them.
4. The Conventions and section 2 should say that Name it gives home and Find home accepts every home on the list.

### Decisions taken on Jack's behalf (to confirm)

- The keep, merge and drop list for the nineteen, as proposed.
- "Find home" as the drill's name, and "Home hit", "Cue", "Pedal", "Bass", "Loop only" as the control's words.
- Name it is marked strictly (the major pull is not right for C to F with home on C).
- A home has to be a chord of the loop.
- Old record lines (both halves asked) still count towards recognised as before.
- All wording on the "Whose home is it?" page, and every draft line, is Claude's.

### Checked

- `claude/harmonic-elements-rules-test-1.13.js`: **58,685 checks, all passing** (about 85 seconds). Self contained: it no longer needs a copy of 1.8.0. Covers the catalogue, ids and file names kept, every hearing being the same sound, Find home in every key and both voicings (right for every listed home, not yet for every other key), Name it against every other element in two keys, the record and its counts, the mix.
- Headless Chromium on a static page from the plugin's markup, 390×844 and 1280×900, no page errors: the room opens on the Dojo; the cue hands over to the loop; Home hit; a right and a wrong answer in Name it; Hear it from each home taking over at the join with the bass; Find home's feedback, Show me and record lines; the Bass way; Which is which and Before and after; the Guide's new page, a renamed card, a draft card, a link to a merged element, Stage 8's list. Ear Training's and Read's pages still load without errors.
- `node --check` on every Harmonic Elements script; `php -l` on the changed PHP.

### Not checked

- **Nobody has heard any of it.** The pedal, the bass and the home hit were measured for pitch and timing on the audition page, not listened to.
- WordPress itself, the REST save of the new `ask` field, the admin member card.
- Ear Training's full Node suite. Its Progressions drill now has 54 elements (was 61) and no "More molecules" set, so `claude/ear-training-rules-test.js` will need its expected counts changed.
- Safari, Firefox, a real phone, the installed app.

## The metronome in alpha.2

Built from `claude/gebrian-metronome-research-notes.md`, with the four answers Jack agreed on 11 Nov: the interleaved guide in the Shed with the same thing on the free page; each step finishes on the whole run at the goal; "step when ready" is the default in the guided setups; the screen goes still on silent beats when muting is on.

### What changed for the player

- **Thin the click** (a setup). Eight stages at one tempo: every beat; 1 and 3; beat one; beat one every 2, 3, 4, 8 and 16 bars. A row on the face says the stage, with Back, Next and Done.
- **Where the click falls** gains "1 and 3" (every other beat from beat one, named for the time signature), and beat one can be every 8 or 16 bars.
- **Click up**: a "Step when ready" switch (Next and Back on the face; the engine just plays the tempo). "Stop at" is now "Goal". "Start at half the goal". "Go 5% past the goal". Picks of 3, 5 and 10. A note under a step of 1 or 2. The timed Click up and its Ladder are unchanged when the switch is off. **The Build speed setup is now step when ready, by 5** (it was timed, by 4, with the ladder).
- **Interleaved clicking up** (a setup). Fields under "The passage": chunks (2 to 16), beats in a chunk, start, goal, step, build from the end. The face says "Play chunks 2 to 4 at 80", draws the chunks as boxes, and **Play it** counts one bar, clicks for the chunks and one more beat, then stops by itself. Next and Back move through the schedule. Changing the passage starts the schedule again.
- **Offbeat click** and **Beat one only** setups.
- Switching on Random mute or Gradual mute, or starting Thin the click, turns on Hide silent beats, with a line saying so.

### What changed underneath

- `shed-metronome.js`: `which: 'alt'`; `every` up to 16; `LBSMetronome.THIN`, `upStop(up)`, `upNext(bpm, up, back)`, `interleave({chunks, start, goal, by, back})`; saved settings gain `up.ready`, `up.past`, `thin {on, stage}` and `inter {on, chunks, beats, start, goal, by, back, at}`.
- `portal.js`: `metGuideRow()` (the rows on the face), `interPlay()`, the new setups, `altName()`, `thinName()`. A go of the interleaved guide forces a plain click on every beat with a bar's count, whatever else is set, and `met.onbeat` stops it after the landing beat.
- `portal.css`: `.mp-m-guide`, `.mp-m-inter`.
- **The interleaved schedule matches Figure 16.3 cell for cell** for steps 1 to 5 (start 60, by 5, goal 120), plus the whole run at the goal at the end of step 5, as agreed.

### Decisions taken on Jack's behalf (to confirm)

- A chunk is a number of beats, and the click runs for the chunks plus one beat. Her "a beat plus a note" is that for a chunk of one beat. Chunks smaller than a beat are not offered.
- The interleaved guide lives on the metronome's face as a setup, in the Shed and on the free page alike, and its place in the schedule is kept on the device with the rest of the metronome's settings.
- The names: Thin the click, Step when ready, Goal, Play it, The passage, Build from the end.
- Her demo video was not found or watched. Worth Jack checking the guide against it.

### Checked

- `claude/metronome-rules-test-1.13.js`: **988 checks, all passing**. The beats that sound for 1 and 3 (in four and in three), the backbeat unchanged, beat one every 8 and 16 bars, the ladder's stages, saved settings, the goal and 5% past it, Next and Back, and the interleaved schedule against the figure and for 45 other passages (every step ends on the whole run at the goal; forwards and from the end).
- Headless Chromium on a static page of the free metronome at 390×844, no page errors: all nine setups listed; Thin the click stepped and left; Build speed stepped; half the goal; the four choices of which beats; Random mute turning on Hide silent beats; the interleaved guide's fields, six steps of its schedule, and a go that stopped itself after 1.87 s at 240 bpm (a bar's count, two beats and the landing beat is 1.75 s, plus the tail).
- The metronome's own 1.8.0 suites (1,328 engine checks, 217 screen checks) are **not in the Project and were not rerun**.

### Not checked

- Nobody has heard it. The members' Shed (only the free page's markup was driven). A real phone.

## Links, and the Guide's hear buttons, in alpha.3

- **A metronome setup as a link.** `LBSMetronome.link(saved)` and `unlink(code)` in the engine. The code is the changed settings as JSON in base64 for addresses (a Thin the click setup is about 170 characters of address in all). `unlink` passes everything through `upgrade()`, so a link can bring in nothing the metronome doesn't understand; a Shelf loop is left out. `portal.js` reads `?m=` when it loads and offers "Copy a link to what is set now" under Setups. The address used is `LBS.metUrl` (new in `lbs_shed_sound_data()`, from the theme's `lbs_tool_url` filter) or else the page the link was made on. (Corrected in alpha.4's notes: the members' dashboard config in `leithbass-members.php` does include `lbs_shed_sound_data()`, so a link copied in the Shed is the free page's address as well, as long as the theme answers the `lbs_tool_url` filter for `'metronome'`, which 3.17.0 and later do. Not yet seen working on WordPress.)
- **Links into the Dojo.** `#dojo/<what>/<ids joined by +>`, where what is `name`, `home`, `pair` or `change`. `dojoLink()` in `harmonic.js` sets the mode and the mix's elements (ids that are unknown or out of the app are ignored). "Copy a link to this mix" is under The mix.
- **Hear it from each home on the Guide's element pages** (`guideHear()`), at the page player's key, tempo and feel. A card's "Key" row is now "Home, as the course hears it".
- Checked: 15 more metronome checks (1,003 in all: six setups there and back, nonsense refused, a hostile link tidied, a member's loop not travelling); in the browser, a link opened in a fresh profile showed the right stage of Thin the click, a bad link was ignored, a Dojo link set Find home with two elements, and the Guide's buttons played the pop axis from A minor and then from C major, joining on the bar. All earlier suites and flows rerun and passing.
- Decisions taken on Jack's behalf: the address forms (`?m=` and `#dojo/...`); that a metronome link carries the tempo.

## alpha.4: the Guide's order, Count it off, phone fixes

Jack's answers on 11 Nov: reorder the Guide as Claude thinks best; leave "the axis, minor view" as it is; the loop carries on after an answer (no landing on home).

- **The Guide's order** (`guideParts()`, `guideOrder()`, `renderIndex()` in `harmonic.js`). Start here: About the course, The idea, The relationships, Whose home is it? Then The Elements. Then the rest of The Method. Then Reference, which now begins with "How this document is organised" and Conventions. Only the order and the headings changed: ids, addresses and words are the same, and `he-guide.js` was not touched. The numbers on the method pages' titles ("4. Two more lenses") are left off on screen, since they are the document's order. Before this and After this follow the new order.
- **Count it off** (a metronome setup). `LBSMetronome.counted(times, target)` in the engine: the tempo from the middle one of the three gaps between four taps, how far off, and how uneven. On the face: the tempo to tap, a Tap button, the result, Hear it, Another, and "Between which tempos" (60 to 140 to begin with). Within 3% counts as there (Claude's figure). Nothing is logged yet: a record of these in the tempo tracker would show a trend.
- **Ear Training on a phone**: the strands are one scrolling row with whole names (`ear.css`).
- **Read on a phone**: the Guide and Dojo switch, the strands and the drills are 44 px tall (`read.css`). Measured at 390×844 on the static page, Write it's Check ends at 776 px.
- Checked: the metronome suite is 1,012 checks, passing; the Guide's contents, a page's Before and After, and the moved pages opened in the browser; Count it off tapped four times, heard and left; every earlier flow rerun with no page errors. The Elements suite was not rerun for alpha.4 (the catalogue and the trainer did not change).
- Still on the metronome's list: interleaved clicking up #2, at-tempo chunking, blind bars measured by tapping, the set list, the diary's five in a row, shuffle and lucky dip.

## alpha.5: three more practice methods in the metronome

Built in the repository (`JackOsc/leith-bass-space`, branch `release-1.13.0`). No zip for this checkpoint: the branch is the copy to work from.

**For the player**

- **Several passages** (Gebrian's interleaved clicking up #2). Passages are called A, B, C. Seven rounds for 60 to 120 in 5s: each clicked up by 5, then by 10, 20 and 30, then start, halfway and goal, then start and goal, then goal.
- **At tempo, in chunks** (her at-tempo chunking). All at the goal. Runs of 1 chunk, then 2, then 3, up to the whole passage, with every overlapping run.
- **Blind bars**. Two bars on, two off by default (the gap is still set under Where the click falls). A Tap button, timed when the finger lands. After each gap: "Steady through the gap", "Rushing: 60 ms ahead by the end" or "Dragging: 40 ms behind by the end".
- **Strong and weak beats** setup (accent, soft, normal, soft in 4/4).
- The three guided methods share one row. Under "The passage" there is a choice of method: Clicking up, Several passages, At tempo.

**Underneath**

- `MET.interleave()` takes `kind`: `'one'` (as before), `'several'`, `'chunking'`. Saved as `inter.kind`. `MET.drift(beats, taps)` is the Blind bars measure. `m.now()` is the audio clock less the speaker delay and the headphone offset, the clock a beat's `time` is on. Saved settings gain `blind {on}`. Both travel in a setup link.
- Drift is the average of the last two tap offsets in the gap less the average of the first two. A constant delay cancels. Taps are followed from the player's own running position, so someone more than half a beat out by the end is still measured. A gap needs three silent beats, and taps on at least half of them, or nothing is said.

**Decisions taken on Jack's behalf (to confirm)**

- 25 ms either way across a gap counts as steady. A guess: it wants trying with a bass in hand.
- In Several passages, rounds 3 to 5 go passage by passage (A at 60, 90, 120, then B). The book says "in turn", which could also mean A, B, C at 60, then at 90. One line to change.
- A jump is left out when it is as wide as the whole climb (30s from 100 to 120), and a step of 10 is not done twice.
- Blind bars is tapped on the screen, not heard through the microphone. Listening to the bass itself would be better and is a bigger job (onset detection, permission, latency). Not started.

**Checked**

- Node: `tests/metronome-rules-test-1.13.js`, 1,076 checks, all pass (62 new: schedules, drift, the engine's beat times).
- Headless Chromium at 390 by 844: the three methods' rows and wording, changing method, Play and Stop; Blind bars with even taps (steady), 4% fast (rushing) and 4% slow (dragging). No page errors.
- The count in with a displaced or thinned click: always four plain beats on the beat, then the setting starts. Nothing to fix.

**Not checked**

- A real finger on a real phone. Touch delay varies from tap to tap on some phones, and that would show as wobble.
- How any of it sounds. Real WordPress.

## Audition page

"Elements: audition page" (https://claude.ai/artifact/XzXJTLxZryKzfSfYM2wV1H), private to Jack. Built on 1.12.1's catalogue, so it still lists the 19 as they were. Jack's first reactions (11 Nov): Cue, Pedal and Bass are all useful; he suggested the Home hit; "step" is good; numerals should lead the names. His tick and cross answers per home are still to come.
