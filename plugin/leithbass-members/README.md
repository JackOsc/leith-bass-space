# Leith Bass Members

The invite-only member portal for The Leith Bass Space, at **/members/**. Bassists who are working with Jack see their session notes, bookings, lesson credit and the Shed (their practice tools and a shared library), and can add the portal to their phone's home screen so it works like an app.

Everything is stored in WordPress (users, a private Sessions post type and user meta), so it survives theme updates and theme changes. Worksheets and recordings stay in Nextcloud and are streamed through WordPress behind the login, so nothing needs a public share link.

Version 1.12.1. Needs WordPress 6.0+, PHP 7.4+ with the sodium extension (standard since PHP 7.2), and the Leith Bass Space theme 3.6.1 or later for the matching look (3.15.0 for the LBS Ear Trainer's page and the free tool pages, 3.18.0 for Read's Launch tickbox, 3.19.0 for Read's public page).

## Upgrading from theme 3.6.0

Theme 3.6.0 carried the portal inside the theme. From 3.6.1 it lives in this plugin, so the order matters:

1. Upload and activate **theme 3.6.1** first. The portal disappears for a moment; no data is touched.
2. Upload and activate **Leith Bass Members** (Plugins → Add New → Upload Plugin).
3. Visit **Settings → Permalinks** and click Save once.
4. Open **Members → All members** once. On that first admin visit the plugin tidies the 3.6.0 data: each member's Nextcloud folder is fixed permanently (it no longer follows their display name), Practice Room data is split per tool, and objective ticks move to permanent IDs. If two members pointed at the same folder, a notice asks you to choose.

If the plugin is activated while the old theme is still active, it waits and shows a notice rather than loading twice.

## First-time setup

1. In Nextcloud, go to **Personal settings → Security → Devices & sessions** and create an app password called "leithbass.space".
2. In WordPress, open **Members → Portal settings**. Add the Nextcloud address, your username and the app password, and the folder that holds member folders (default `/LeithBass/Members`). Click **Test the Nextcloud connection**.
3. To keep the credentials out of the database, add these to `wp-config.php` instead (they override the settings page):
   `define( 'LBS_NEXTCLOUD_URL', 'https://cloud.example.com' );`
   `define( 'LBS_NEXTCLOUD_USER', 'jack' );`
   `define( 'LBS_NEXTCLOUD_PASSWORD', 'xxxxx-xxxxx-xxxxx-xxxxx-xxxxx' );`
4. Check **Block length** (default 4 months, matching the Prices page), **Largest recording** and **Recording space per member**.
5. Add the portal wording to your privacy notice: **Settings → Privacy → Policy guide** has a suggested section under "Leith Bass Members". Check the retention period (it suggests 12 months after the last session) matches how you work.
6. Send yourself a test: add a member with a second email address of your own, open the invite, and look around. **Preview their portal** on any member page shows what they see, with their private tools and ticks hidden.

## Day to day

- **Add a member:** Members → All members → Add a member. Their Nextcloud folder is created from their name plus a short code, and never changes after that. For under-18s, add a parent or guardian email: they are copied into every portal email.
- **Credit:** add a block on the member's page (hours, price, date bought; expiry fills in from the block length). Use **Adjust credit** for goodwill minutes or corrections, with a note. **Void** a block bought in error rather than deleting it. Every change is kept in the member's change history.
- **Book sessions:** Add session, choose the member, date and time, leave Status on Upcoming and publish. "Also book the same slot for the next N weeks" creates the rest in one go. The edit screen tells you as you go whether their credit covers the booking.
- **Provisional or confirmed:** a booking is confirmed when it is covered by credit or ticked **Paid separately**. Anything else shows as Provisional to the member, and in your session list. You are warned when a booking overlaps another or goes beyond their credit.
- **Moving or cancelling:** change the date, time or status on a published booking and the member gets an email with the change. Their calendar subscription updates on its own.
- **After a session:** paste your notes into **Paste your notes** (template below) or fill in the boxes, tick the files from their folder, set Status to Done and click Update. They get an email with the notes and This week's objectives.
- **Before a session:** the Session prep box, the Dashboard widget and the morning digest show what the member has shared: questions, diary, tempos, recordings, songs and goals. Private tools never appear.
- **Emails:** Members → Email log shows every portal email and whether it went. Failed ones retry hourly (up to four times) and can be retried or discarded by hand. The Dashboard widget flags failures.

## The app (no App Store needed)

The portal is a web app. On a phone:

- **iPhone:** open leithbass.space/members in Safari, tap the Share button, then **Add to Home Screen**.
- **Android:** open it in Chrome and tap **Install** when offered (or ⋮ → Add to Home screen).

It then opens full screen from its own icon with a bottom bar (Home, Notes, Shed, Ear, Elements), stays signed in (the sign-in lasts a year when "Keep me signed in" is ticked), and works with the phone's password manager. The last copy of the portal and the latest session's worksheets are kept on the phone for practice rooms with no signal. Diary entries, questions, tempo logs and objective ticks made offline are saved on the phone and sync when signal returns. Signing out clears everything stored on the phone.

Members see a one-time prompt on their Overview explaining how to install it, and the Account tab always has the instructions.

**One app, three rooms (1.10.0).** Beside the portal and the Shed, Ear Training and Harmonic Elements each have a room inside the app: **/members/ear-training/** and **/members/elements/**. They open full screen from the bottom bar, so a member never leaves the app for the website, and the app keeps the last copy of each for when there's no signal (the house band draws its own sound, so a room plays offline once its instruments have been used). On a phone, Bookings and Account move from the bottom bar to two links under the greeting; on a wide screen the rooms sit beside the tabs. A long press on the app's icon offers the Shed and both rooms. Until a trainer is launched its room says it is coming soon; signed in as an administrator you see the whole thing. The public pages on the website are unchanged and still work for visitors, and a signed-in member there sees a line pointing to the room in the app (theme 3.17.0).

## Privacy

- Members can download everything the portal holds about them (Account → Download my data), and ask for deletion from the same place.
- WordPress's own **Tools → Export Personal Data / Erase Personal Data** include portal data. Erasing removes Shed data (practice tools), recordings, phone and guardian details; session records and the credit statement are kept as business records until you delete the user.
- Private tools (and the private parts of diary, tempos and listening when the member hasn't shared them) are left out of everything you see, including the preview and prep.

## Try the Shed (on the Shed tools page)

The theme's Shed tools page lets visitors use the real Shed tools. It starts blank, like a new member's Shed would, so finishing a practice fills in the diary, lights up today on the habit tracker and starts a chain. Only things that need some history carry an example, and each says so: one tempo exercise, two objectives "from Jack's notes" on the practice plan, and the Shelf's sample track. Nothing plays until the visitor taps, nothing is sent to the site, and nothing is kept in their browser: a reload starts it fresh.

- **Two ways to show it.** `lbs_shed_demo()` puts it inside a page, in a phone frame. `lbs_shed_demo( 'full' )` makes a page that is only the Shed, full screen like the app, with the phone's back button working between tools. The theme uses the frame on larger screens and the full screen page (/shed/try/) on phones.
- The `lbs_demo_page` filter tells the plugin a page shows the demo (return `true`, or `'full'` for the full screen kind), so its scripts load in the page head.
- The playable backing track is a short vamp in A bundled with the plugin; return another URL from `lbs_demo_track_url` to use your own. `lbs_demo_objectives` changes the two example objectives.
- The sign in page links to the Shed tools page when the theme provides one (the `lbs_shed_tools_url` filter).
- The app itself stays members only.

## The metronome

Rebuilt in 1.8.0 around one idea: a click that can do less, so the player's own time does more.

- **Random mute.** Choose what percentage of beats are skipped, and they are left out at random. The share is honest: beats are dealt from a shuffled bag a few bars at a time, so 30% means 30% and never a long run of luck. *Keep beat one* always sounds the first beat of the bar; *Mute whole bars* makes the choice bar by bar.
- **Gradual mute.** Every beat sounds at first, then more and more drop out, reaching the share you set over the number of bars you set, and holding there. (This replaces "Wean me off"; a saved setting of that kind loads as Gradual mute.)
- **Click up.** The tempo changes by so many bpm every so many bars: both numbers are the player's, as is an optional tempo to stop at. Negative steps slow down. *Ladder* goes up a step and back half a step. When it stops, the tempo goes back to where it started, with a button to keep the tempo it reached. (This replaces the speed trainer; a saved one loads as Click up.)
- Random mute and Gradual mute take turns (switching one on switches the other off). Click up works with either.
- **Where the click falls.** Every beat, the backbeat or beat one (every one, two, three or four bars); on the beat, or pushed onto the "and", the "e", the "a" or a triplet's middle or last; and bars on, bars off.
- **Sounds.** Recorded woodblock, claves, cowbell, cross stick and hi hat (public domain recordings in one 45 KB file, fetched when the metronome is first opened), and a beep and a click made in the browser. Every sound is equally loud at the same setting, an accent is 2 dB over a beat and a beat 3 dB over a subdivision.
- **The house drummer.** Any of Harmonic Elements' feels, with three grooves each, on any of its kits, played live so that it follows a moving tempo and a muted beat mutes the drummer too. In 4/4; in another time signature the drummer sits out. Written patterns, Kyle's kit and loops from the Shelf work as before.
- **Setups.** Six that come with it (Plain click, 2 and 4, Bar on bar off, Fade the click, Build speed, Swing with brushes), and any number of the player's own, saved by name.
- **Timing.** Every click was measured to land within half a sample of where it should, with Click up running, with swing, displaced, and with a drummer playing.
- **With no signal** (the installed app): the recorded clicks are kept when the app is installed, and each kit once it has been used, so a practice room without reception gets the same metronome.

## The free tools: the metronome, drone and tuner on pages of their own

Three of the Shed's tools need to know nothing about who is using them, so each can stand as the whole of a public page, for anyone, with no account. The theme (3.15.0) puts them at /metronome/, /drone/ and /tuner/.

- `lbs_shed_tool( 'metronome' )` (or `'drone'`, `'tuner'`) prints the tool where it is called. One tool to a page.
- The `lbs_shed_tool_page` filter tells the plugin which tool a page shows (return its name), so its styles and scripts are enqueued in the page head. Only that tool's engine is loaded beside the app's script, all of it deferred.
- What a visitor sets is kept in their own browser, under names of its own, so a member's settings in the app are never disturbed. Nothing is sent to the site.
- Under the tool there is a line saying there is more in the Shed, linking to `lbs_shed_url` (a filter; the theme's Shed tools page). A page that says so in its own words returns false from `lbs_shed_tool_more`.
- The tuner asks for the microphone only when Listen is tapped, and nothing it hears is recorded or sent.

## The Shelf: a library for every member

Everything in the **Library folder** in Nextcloud (default `/LeithBass/Library`, set in Portal settings) appears on the Shelf in every member's Shed. Portal settings shows what's there and anything worth fixing, with buttons to refresh and to create the standard folders.

- Each top-level folder is a section: Backing tracks, Drones, Harmonic Elements, Transcriptions, or anything you like.
- Files in a section are listed, along with the files one subfolder down (the subfolder becomes a heading).
- Start a folder name with an underscore (`_Drafts`) to keep it hidden while you work on it.
- Put the key and tempo in file names and members can search by them: `Blues in F - 90bpm.mp3`, `Lean vamp in Eb minor 80bpm.wav`.
- Files stream through the portal behind the login. Members can only open files that are on the Shelf.
- The Shelf refreshes itself every 15 minutes.

### Grooves and Kit (for the metronome)

These two folders feed the metronome's drum grooves and aren't shown on the Shelf.

- **Grooves:** drum loops, optionally in style subfolders (`Grooves/Funk/`). Each needs a tempo and a bar count, in the name (`Pocket - 96bpm - 4-4 - 2 bars.wav`) or in an optional `grooves.json` in the Grooves folder: `[{"file": "Funk/Pocket.wav", "bpm": 96, "meter": "4/4", "bars": 2, "feel": "16ths", "swing": 0, "count_in": 0}]`. The manifest wins where both say something.
- **Kit:** single hits named `instrument_layer_number.wav`, for example `kick_soft_1.wav`, `snare_hard_3.wav`, `hat-closed_medium_2.wav`. Layers are soft, medium and hard. Instruments: kick, snare, snare-ghost, cross-stick, rim, hat-closed, hat-open, hat-pedal, ride, ride-bell, crash, tom-high, tom-mid, tom-floor, shaker, tambourine, clap, click.

## Harmonic Elements: the Guide and the Dojo

Two rooms on the theme's Harmonic Elements page, sharing one set of loops.

**The Dojo** is the ear trainer. A loop of chords and a loop of drums play together, with no bass, until the player has named **the key** (home, and whether home is major or minor) and **the element** (the chords, as roman numerals from home).

**Keys and hearings (1.9.0).** An element is a sound: its chords, wherever the loop is taken to start and whatever key it is played in. Plenty of sounds can be heard from more than one home (the Dorian loop on A is also I V ii IV in G major), and the course says so. Each element lists the hearings the Dojo accepts: the course's own; every other element of the catalogue that is the same loop, from its own home; and the loop heard from any of its own major or minor chords, where that puts no chord outside the key, or fewer than the course's own hearing does (`HE.keyHearings`). Choosing Major or Minor shows each element as it sounds from a home of that kind, so the pad itself follows the key. The answer shows every other hearing under **Also heard as**, and the Guide's pages show them too. Numerals count from home on the major scale, so ♭III is always a minor third above home. Elements whose home never sounds (ii V held open, IV V iii vi, IV V vi, iii VI7 ii V) are left out of Name it, since it asks where home is; they still come up in the drills and have their pages in the Guide.

**Show me (1.9.0)** comes in two halves: **the key** and **the element**. Each shows its half and leaves the other to be found; both is the whole answer. A round with one half shown counts for nothing towards "recognised", and the record keeps how often the other half was right.

**Home cued (1.9.0).** Under The mix → Home, *Cue it* has the house band play two bars of the home chord, held, before each loop comes in: a first step towards finding home without help. *Find it* (the default) starts the loop straight away.

**The Guide** is the course text. Its contents list Part One (the method), the ten stages with every element, and Part Three (reference and appendices). An element's page has its facts, the course's notes on it (sound, note choice, listen for, whose home, contrast with, listening leads) and a player for its loop: any tone centre, any tempo from 50 to 160, any feel, and under **The band** who plays it (each recording there is, or any of the house band's sounds and kits), the base or expanded voicing, and whether the chords are played in the feel or held. Changing anything while it plays carries straight on. **Test Stage N in the Dojo** at the foot of a page sets the Dojo's mix to that stage's elements and goes there. The Dojo's answer links to the element's page, and the address keeps your place (`#guide/dorian-lean`, `#dojo`), so the back button and a shared link both work.

**Out of the app for now (1.9.0): the forms and the five extra home chords.** While the course concentrates on the small units, Stage 10 (the compounds) and the five extra home chords (sus 2, sus 4, 6, augmented, diminished: chord flavours rather than homes, which belong with the LBS Ear Trainer) are switched off at the top of `he-catalogue.js` (`SHOW_FORMS`, `SHOW_EXTRA_HOMES`). Nothing offers them and the Guide leaves Stage 10 out; the twelve bar blues card in Stage 4 keeps its text and has no player. A recording named for one is still recognised (and left unused), and old lines of a record for one are kept. Flip the switch to bring them back.

**Forms and more molecules (1.8.0).** Stage 10's forms are loops too: the twelve bar blues, the quick change, the minor blues, the jazz blues, rhythm changes (thirty two bars, AABA) and the major and relative minor cadences. A form shows as a map of its bars, with two chords in a bar where the form has them, and the bar that is sounding lit. Nineteen further molecules sit after the course's own stages under **More molecules**, in three groups: Minor and modal, Pop and soul, Jazz. Their names, "built from" and "listen for" lines are placeholders for you to rewrite (they are in `he-catalogue.js`, each on one line), and their Guide pages are made from the catalogue, since the course text has none for them yet. "Everything" in the mix means the course's own elements and the further molecules; the forms are a preset of their own, because a twelve or thirty two bar loop asks a different question.

**Two more things the Dojo can ask (1.8.0),** beside naming a loop. *Which is which* plays two elements that the course says to contrast (sixty pairs, taken from the cards' "Contrast with" lines), turn and turn about on the same tone centre, same band, joined on the bar; the answer is which came first. *Before and after* does the same with the fourteen transformations (now in Stages 7 to 9): the plain version and the altered one. Both are counted apart from "recognised", so a drill can't inflate the record.

**Play (1.8.0),** in a fold under every element's player in the Guide. A fretboard drawn for the player's bass (four, five or six strings, a choice shared with the ear trainer) shows the notes the chords fix and leave open, lit as each chord comes round. Below it, a bass line written in stave and TAB, at any of the levels the course's own ladder gives: roots held, roots in time, root fifth and octave, the triad, with the seventh, and the thirds, fifths or sevenths alone. A reference bass (electric or upright) can play the written line, or take turns with the player, a time through each. The fixed and open degrees are worked out from the chords, and were checked against all ninety eight rows of the Guide's own cards.

**The house band** is the app's own players (1.7.0), so every element can be heard on every tone centre, at any tempo, in any feel, with nothing recorded and nothing from Nextcloud. Your recordings are heard **as well as** the house band, never instead of it.

- **Chord sounds (18).** Keys: electric piano, grand piano, upright piano, organ, glass electric piano, vibraphone. Guitars: electric, nylon. Strings and brass: strings, warm pad, brass. Bands (two or three players at once): piano and strings, electric piano and pad, guitar and organ, soul band, horns and electric piano, vibes and guitar, nylon guitar and strings.
- **Drum kits (7).** Studio kit, Tight kit, Big kit, Brushes, Dusty kit, 808 and 909, with hand percussion for the Percussion feel. Each of the thirteen feels has three grooves, a fill in the fourth bar, and a list of the kits that suit it.
- **How the chords are played.** *In the feel*: comping written for each feel (a strummed guitar, piano stabs, an organ bubble and a guitar skank for reggae, and so on), voiced so that each chord moves to the next by the shortest route. *Held*: each chord struck once and left to ring. Over a recorded drum loop the house band keeps to plain rhythms, since it can't know how that drummer swings.
- **In the Dojo** each loop the house band plays gets a sound, a kit and a groove at random (not the ones just heard), from those switched on under The mix → The house band. The line under the play button says who is playing.
- **Where the sound comes from.** The grand, the upright, the vibraphone, the electric guitar, three drum kits and the hand percussion are recordings of real instruments, all in the public domain (CC0): eight small MP3s in `assets/harmonic/sounds/` (about 1.5 MB in all), with their makers listed in `CREDITS.txt` beside them. Everything else (electric pianos, organ, strings, pad, brass, nylon guitar, 808, 909) is made in the browser and needs no download at all.
- **What it costs in speed.** Nothing is fetched until a loop needs it, and then only the one or two files that loop uses; the browser keeps them. A loop takes a fraction of a second to draw, and is drawn while nothing else is happening: the Dojo's first loop while the page settles, and each next loop while you're answering the current one, so Play and Next start at once. A visitor who has asked their browser to save data gets the sounds that need no download.
- **To change the recorded instruments**, `build_packs.py` and `sources.py` (kept with the project notes) rebuild the eight files and `he-packs.js` from the sample libraries named in the credits.

- **Where the text comes from.** `assets/harmonic/he-guide.js` is made from the Google Doc "Harmonic Elements" (revised teaching draft, September 2026, with the October 2026 revision for 1.9.0: Shadow, Colour and Applied in place of Shift and Transformations) by a small script, `build_guide.py`, kept with the project notes. The words are the document's, unchanged; only the wrapping is different. Left out, because the app's own navigation replaces them: the Contents list, and each stage's "In this stage" line. To change the Guide, edit the document and build the file again.
- **What isn't there.** The document's notation pictures (Appendix H) don't come through with the text, so those studies have their words and no stave. Six cards have no loop of their own and so no player: Swap by third, The deceptive cadence, The blues transformation, AABA song form, Vamp and release, and Key changes. (One of the further molecules, IV V vi, is a deceptive cadence under a placeholder name; if you rename it to match, the card can be given its player.) The three operation cards (Swap by third, The deceptive cadence, The blues transformation) now sit beside what they make, in Stages 6 and 4.
- **Launching.** The theme has a Launch tickbox (Leith Bass Content → Harmonic Elements). Until it's ticked, only an administrator can use either room: everyone else gets the theme's Coming Soon page, the loop list is empty for them, loops are refused and no record is saved. Another theme can say the same through the `lbs_harmonic_live` filter; with no filter, it counts as launched.

**The loops come straight from Nextcloud.** They are read from a folder called `Harmonic Elements` beside your Members folder (or whichever folder you name in Portal settings). Nothing is copied to the website: the list of files is remembered and checked again every 15 minutes, and each loop is passed through from Nextcloud when a browser asks for it, then kept by that browser.

    Harmonic Elements/
      Chords/90bpm/C/Lean/Major I - Major IV.mp3
      Chords/90bpm/C/Lean/Major I - Major IV (v.2).mp3
      Chords/90bpm/C/Home/Sus 2.mp3
      Drums/90bpm/Neo soul (1).mp3
      Drums/90bpm/Neo soul (2).mp3

- **Folders say the tempo and the tone centre.** A folder called `90bpm` (or just `90`) is a tempo; under Chords, a folder called `C`, `Bb` or `F#` is a tone centre. Any folders below those (Lean, Pull, Home and so on) are yours to arrange and aren't read. Tempo and tone centre can also go in the file name (`Dorian lean - C - 95bpm.wav`), and a name wins over its folders.
- **Naming a chord loop.** Either by the element's course name (`Dorian lean`, `Pop axis`, `Major home`) or by its chords as roman numerals (`ii-V-I`, `I - bVII (Mixo)`, `minor i7 - Major IV7`). A numeral's capitals say major or minor, and the words Major and Minor in front of a numeral overrule them. Use the words where two names would differ only by capitals (`I - IV` and `i - iv`), because a Mac can't keep both of those in one folder. Words in brackets are a nickname or a version.
- **Naming a drum loop.** By its feel: Rock 8ths, Pop 16ths, Funky 16ths, Hip hop, Soul, Shuffle, Half-time, Reggae, Swing, Bossa, Neo soul, Four on the floor, Percussion. Any other name becomes a feel of its own (`Afrobeat`), which only your recordings play.
- **Versions.** Any number of files can be the same loop: the same element on the same tone centre at the same tempo, or the same feel at the same tempo. One is picked at random each time, and not the one just heard if there's another. The house band's version of every element, on every tone centre, is always among them, so nothing is ever missing. In the Dojo, The mix → Who plays chooses between recordings and the house band, recordings only, or the house band only.
- **Length.** A loop can be any whole number of bars; the trainer measures it. Where a recording is longer than its element as written, the trainer listens to it once to tell whether the changes come round again or each chord is held for longer, so the display lights the right chord on the right bar. The file name doesn't have to say.
- **MP3s loop cleanly.** An MP3 is always a little longer than the audio that went into it. Logic writes the true length into the file, and the trainer reads it, so there's no gap at the turnaround. WAV, M4A, FLAC and OGG work too. AIFF doesn't play in most browsers.
- **Work in progress.** Start a folder or file name with an underscore to keep it out.
- **Portal settings shows what the trainer sees:** how many loops are in use for each tempo and tone centre, which elements are still to record, and under Worth fixing any file whose name couldn't be placed, with the reason. Names are read by the same script the trainer uses, so the two can't disagree. **Refresh the loops now** reads the folder again straight away.

**Who hears the recordings** is a switch in Portal settings. *Members only* (the default): anyone else who opens the trainer hears the house band and is pointed to the member sign in. *Everyone*: any visitor hears your recordings, passed through from your Nextcloud.

**On a phone.** Once the play button has scrolled out of sight, play and stop sit in a strip along the bottom of the screen: with Check (then Next) in the Dojo, and with a way back to the player in the Guide, so a loop can be stopped or an answer checked from anywhere on the page. With one note for home in the mix, the twelve home buttons step aside (major or minor is still asked). On an iPhone the page asks Safari to treat the loops as music, so the silent switch shouldn't mute them (Safari 16.4 and later; this is the one thing here that could only be tried on a real phone).

**The record.** Every loop answered adds a line: what was played, and whether the first answer had the key and the element right (1.9.0: and which key was said, major or minor, and whether one half was shown first). Four first-time answers from the last five, on two different days, and an element counts as recognised; the trainer brings back sooner the ones that were missed. A signed-in member's record is kept with their account and follows them between devices. You only see it, on their page under Members, if they switch on **Share my record with Jack**, which starts off. A visitor's record stays in their own browser. The record is included in Download my data and removed by WordPress's Erase Personal Data.

For the theme: `lbs_harmonic_trainer()` prints the trainer inside a page and `lbs_harmonic_trainer( 'full' )` a page that is only the trainer. The `lbs_harmonic_page` filter tells the plugin a page shows it (return `true`, or `'full'`), so its styles load in the page head, and `lbs_harmonic_url` gives the plugin the page's address.

## Ear Training for Bass Players

(Called the LBS Ear Trainer until 1.10.0.) Ear training for bassists that never loses the tone centre. The house band holds home; a bass asks a question against it; the answer is tapped, found on a fretboard or played on a real bass. It stands apart from Harmonic Elements (the Dojo asks about chord movement; this asks about single sounds against home) and shares its band, its look and its way of keeping a record.

- **A question is two bars, going round.** Bar one asks. Bar two is the player's: the bass drops out and the band keeps home. A run is eight questions on one tone centre, opened by a bar that says where home is, and then the band moves a fourth round the cycle to the next of the tone centres chosen.
- **Today** (1.10.0) chooses a short set from the record, the way a spaced schedule does: up to three parts of four questions, what was missed lately first, then what hasn't been heard for a while, then something new. With no record it starts on 1, 3 and 5.
- **Six strands, in the order to learn them.**
  - *Intervals*: **Degrees** (home, then another note: which degree is it, 1 to 7 with the flats and the sharp four) and **Intervals** (two notes of the home scale: what is the distance, going up or coming down; the answer also says where else in the scale that interval lives).
  - *Chord flavours*: the bass holds home and the keys play one chord on it. Twenty one flavours in four sets: major or minor, the triads, the sevenths, the colours.
  - *Scales*: the bass plays a scale from home to home over a bare fifth. Twelve scales (major and natural minor, the two pentatonics and the blues scale, the modes, harmonic and melodic minor), each with the note that gives it away.
  - *Inversions*: the keys hold a chord on home and the bass takes one of its notes: the root, third, fifth or seventh.
  - *Lines* (1.10.0, melodic dictation): the bass plays a phrase of two to eight notes over the band and it is written down as degrees, note by note, into a row of slots. A wrong go is ticked note by note and the line keeps going round. *Made of*: 1, 3 and 5; the pentatonic; the whole scale; with passing notes. *Starts on*: home, or 1, 3 or 5. Lines are made to sound like bass lines (mostly steps and small leaps, no trills, low homes lifted an octave for small speakers).
  - *Progressions* (1.10.0): the band plays one of 61 progressions from Harmonic Elements, round and round, and the roots are named as degrees in order (from any point in the loop, since a loop has no first chord). *The bass*: plays the roots to be named, or sits out so the player supplies them. The answer names the element and links to its card in Harmonic Elements.
  - Intervals can also be asked as a **double stop** (both notes at once), and include the **minor and major tenth**.
- **Hear the other choice** (1.10.0): after an answer, its near neighbours (♭3 beside 3, Dorian beside natural minor, the third beside the fifth in the bass) are a tap away, played once round on the same home before the question comes back.
- **The Jam room** (1.10.0): no questions. A home chord goes round, four bars at a time, for as long as you like: fifteen flavours (the triads including sus 2, sus 4, augmented and diminished, the sixths and sevenths, and the ninth), any of the twelve homes, 70 to 115 bpm, eleven feels, the chord played in the feel or held, six chord sounds, and the band's bass either leaving the bass to you or playing roots and fifths. The neck shows the chord's notes solid and a scale that fits it as rings (a choice of two to four per chord, with a line on why); every note can be tapped to hear it against the chord. *Test these degrees* opens the Degrees drill with those notes in play, on that home; a drone on the same note is one tap away. These are the home chords Harmonic Elements leaves out for now.
- **In play** chooses what can be asked, from two things to all of them, and so what the answer pads offer. Sets give sensible starting points; any item can be switched on or off.
- **Three ways to answer.** *Tap it*: a pad for each possibility. *On the fretboard* (the single note drills): a neck drawn for four, five or six strings, with home marked. *Play or sing it*: the app listens through the microphone and hears the notes played on a bass, down to a low B, or sung (since 1.10.0, any octave counts). A degree is one note, an interval two in order, a chord its arpeggio from the root, a scale the scale from home to home. While the band plays it listens only in bar two, so it doesn't hear the question; with the band stopped it listens all the time. It asks for headphones, so the microphone hears only the bass. Nothing is recorded or sent, and the two small scripts it needs are fetched only if Play it is chosen.
- **Every answer is written out**: in bass clef, in TAB and on the neck, spelt for the tone centre, with the degrees named. Tapping a note plays it. (Double flats are shown by their plain names, so the diminished seventh of C reads A.)
- **The set up.** An electric or an upright bass asks the questions (recordings, public domain); the keys take turns between an electric piano, a grand piano and a warm pad, or stay on one; drums on or off; 66, 80 or 96 bpm; which tone centres; whether a right answer moves straight on.
- **The record** works as the Dojo's does. Every question answered adds a line. Four first time answers from the last five, on two different days, and a thing counts as recognised; what was missed comes back sooner, and the page says what is being taken for what. A visitor's record stays in their browser. A member's is kept with their account (user meta `_lbs_ear`, the newest 3000 lines), follows them between devices, and is shown to you on their page under Members only if they switch on **Share my record with Jack**. It is in Download my data and is removed by Erase Personal Data.
- **Into the practice diary.** For a member, a sitting of a minute or more can be added to their practice diary with one button (tagged Ear Training, with what was worked on and how it went), where it counts towards their habit. Pressing it again later in the same sitting brings the same entry up to date.
- **Launching.** The theme has a Launch tickbox of its own (Leith Bass Content → Ear Training). Until it is ticked only an administrator can use it. Another theme can say the same through the `lbs_ear_live` filter; with no filter, it counts as launched.
- **What it costs in speed.** The page is its markup, two small stylesheets and nine deferred scripts (about 100 KB compressed, most of it the house band it shares with Harmonic Elements). No sound is fetched until Start is on the screen, and then the bass (160 KB) while the page is idle; a drum kit joins from the next question once it has arrived. Start is answered in about a third of a second.

For the theme: `lbs_ear_trainer()` prints the trainer inside a page and `lbs_ear_trainer( 'full' )` a page that is only the trainer; `array( 'full_url' => … )` as a second argument adds a Full screen link. The `lbs_ear_page` filter tells the plugin a page shows it (return `true`, or `'full'`).

**Notation and fretboards** for both apps come from one file, `assets/lbs-bass.js` (38 KB, 16 KB compressed): bass clef and TAB on the house style's cream panel, with the music glyphs drawn from Bravura's outlines (SIL Open Font Licence), and a fretboard that can be tapped. Harmonic Elements fetches it only when Play is opened.

## Read: reading notation for bass players

A room of the members' app, **/members/read/**, for reading the bass clef, rhythm, keys, intervals and chords. It is for beginners, and for players whose playing has run ahead of their reading (from TAB, or by ear). Like Harmonic Elements it has two rooms.

- **The Guide** is the course: 30 pages from "Why read?" through the stave, ledger lines, the open strings and first position, every rhythm from semibreves to triplets and six eight, repeats and roadmaps, sharps and flats, C major, A minor, C minor and E♭ major, key signatures, the circle of fifths, the treble clef and the piano score (and why the bass is written an octave up), intervals, chords, bass notation (ghost notes, slides, hammer ons, articulations), reading a chart, swing, shuffle, twelve eight and cut time, and sight reading. Every example is engraved and can be played (with a bar of clicks, and round and round if wanted), with TAB under it where that helps. Buttons on each page open the Dojo on the matching drill. The text is built from `claude/read-course-text.md` in the Project by `claude/read-build-guide.py`.
- **The Dojo** makes the links, in both directions, and times every answer: **Name it** (a note on the stave: its name), **Write it** (a place on the neck: write it on the stave), **Find it** (a note on the stave: find it on the neck, or every place it lives), **Play it** (a line on the stave, played on your bass at your own pace, through the microphone or by tapping the neck), **Tap it** (a rhythm, tapped in time over a click and marked note by note as on time, early, late or missed, with a strip showing every tap), **Hear it** (which of three bars was played), **Write it** under Rhythm (a bar is played; build it from the level's beat-sized pieces and check it, marked beat by beat; a tie and a longer note that sound the same are both right), **Sight read** (a short piece in twelve graded levels: ten seconds to look, a bar of clicks, then straight through without stopping; the microphone can mark each note), **With the band** (bass parts in a dozen styles, roots and fifths to funk, reggae, bossa, walking and six eight, over chord progressions in twelve levels, with the house band's keys and drums playing along; the later levels are charts with rehearsal marks, simile bars, slashes and bars of rest to count), **Keys**, **Intervals** and **Chords**.
- **Positions**: Find it and Write it can keep to second, fifth, seventh or ninth position, a box of four frets. Only a place inside the box counts, and the neck shows the box.
- **Today** picks up to three parts from the record: the notes that are slowest or missed lately, a rhythm at the level reached, and one piece at the sight reading level reached (every other day, once the early levels are going well, a bass part with the band instead).
- **The Map** shows every note on the member's neck (to the chosen fret, for 4, 5 or 6 strings) and how well each link is made: not met yet, still working it out, known, and **immediate** (known, and quick as well). A note is only as immediate as its slowest link. **Practise these** drills the weakest six; **Where am I?** names and finds every natural note once, to fill the Map in one go.
- **Recognised** is the house rule: four first-time answers from the last five, on two different days. **Immediate** adds speed: the median time of those right answers is under the drill's own limit (1.8 s to name a note, 2.5 s to find it or play it, 3 s to write it).
- **The engraver** (`assets/read/rd-stave.js`) is Read's own, in lbs-bass.js's units and house style (cream panel, orange border, charcoal, Bravura): every note value from a semibreve to a semiquaver, dots, ties, rests, beams by the beat, triplets, chords, accidentals that last the bar with courtesy naturals, key and time signatures, repeats, first and second time bars, D.C., D.S., coda and Fine, chord symbols, slashes, dynamics and articulations, treble clef and the grand staff, TAB under the bass with a finger per fret fingering, names, counts, and the position of every note for lighting and for writing on the stave.
- **Sound** is the house band's bass (electric or upright) and a click drawn for each time signature; the microphone is the Shed tuner's, fetched only if chosen, and listens only while it is on.
- **Line up your taps** (The set up) measures how late this phone or speaker sounds, from eight taps, and allows for it.
- **The record** is in user meta `_lbs_read` (newest 4000 lines), REST `lbs/v1/read`, shared with Jack only if the member switches it on. A sitting can go in the practice diary (tag "Reading"). Jack's page for a member shows their drills, levels and slowest notes when they share. It is in Download my data and removed by Erase Personal Data.
- **Launch**: Read is behind its own tickbox (theme 3.19.0: Leith Bass Content, the Read tab). Until it is ticked, members see Coming soon in its room, visitors to **/read/** see a Coming Soon page (not indexed), and an administrator sees everything. Once launched, /read/ is a public page like Ear Training's, with the app in it and a full screen version at /read/play/.
- **Your own app**: Members → Portal settings → **Use the app as yourself**. With it on, your own login gets a dashboard, a Shed and records of your own, and every room, launched or not, so you can test before members see anything. Your records are kept like a member's. Turn it off to go back to the administrator's preview.

## Calendar sync (Google)

**Members → Calendar sync** connects your Google Calendar, both ways.

1. In Google Cloud → Credentials, turn on the Google Calendar API and create an OAuth client ID (Web application) with the redirect URI shown on the page. While the app is in testing, add your own Google account as a test user.
2. Paste in the client ID and secret, then **Connect Google Calendar**. (Or define `LBS_GOOGLE_CLIENT_ID` and `LBS_GOOGLE_CLIENT_SECRET` in wp-config.php.)
3. Choose a calendar. A calendar of its own, such as "Bass sessions", is tidiest. Every upcoming booking is added straight away.

From then on:

- Published bookings go into Google, and follow when they move, are cancelled (removed from Google) or deleted. Provisional bookings say so in the title.
- Every 15 minutes (or **Sync now**) changes in Google come back. Move a booking in Google and it moves in the portal, and the member is emailed as usual. If both sides changed, the later change wins. Each booking's edit screen shows its sync history.
- Delete a booking in Google and it's listed under **Needs a look**, not cancelled, because cancelling changes credit. Cancel it in the portal, or put it back in Google.
- A new event in Google with a member as a guest becomes a **draft** booking for you to check and publish. Other events with a member's name in the title are listed under **From Google**, to make into a booking or ignore.
- The refresh token is stored encrypted. Disconnecting revokes it; bookings already in Google stay there.

## Session notes template

Download it from **Members → Portal settings** (or `assets/session-notes-template.txt`). Every line is optional except Member.

```
Member: Morven
Date: 22/09/2026          (also: today, yesterday, 22 Sep)
Start: 18:00              (also: 6pm)
Length: 1h                (also: 90m, 1.5)
Status: done              (upcoming, cancelled, cancelled charged)
Block: yes

Covered: Walking lines, part two: approach notes

Summary:
Chromatic approach notes into each chord, landing on the root on beat one.

Objectives:
- Walking in F with approach notes, 70 bpm, four choruses
- Sing the roots while you play

Files:                    (a few words from each file name is enough)
- S14 walking

Answered:                 (a few words from the member's question)
- thumb anchor

Listen:                   (Title, Artist: what to listen for)
- What's Going On, Marvin Gaye: how quiet the ghost notes are

Next time:                (shown on their next booking)
Bring the walking line at 70 bpm.
```

## Limits worth knowing

- Recordings are checked on the server for type (audio or video), size and each member's space before they reach Nextcloud. They are saved to `Recordings` inside the member's folder; deleting one in the portal deletes the file.
- Audio, video and PDFs stream from Nextcloud in chunks with byte-range support, so large files don't fill the server's memory and audio seeks in Safari.
- Reminders, nudges and your digest run hourly on WordPress's scheduler, on the first visit after the hour set in Portal settings. For exact timing, point a server cron job at `wp-cron.php` every 15 minutes.
- The portal is excluded from search engines and the sitemap.
- Answering the ear trainer by playing was tested with the house band's own recorded bass fed in as the microphone, not with a real bass in a real room. It needs a quiet room and headphones; an amp in the same room as a phone's microphone is the thing to try first.
- The house band is drawn in the browser, so it needs Web Audio (every current browser has it). It was balanced and checked by measurement, note by note and hit by hit; how it sounds to a musician is for your ears to judge, and the levels of each instrument and kit piece are single numbers in `he-band.js` and `he-kit.js` if anything wants turning up or down.

## Changelog

### 1.13.0 (in progress: not for installing yet)

One release for the whole programme agreed on 11 Nov 2026 (`claude/leith-bass-space-review-2026-11-11.md`). Built so far: Harmonic Elements, and the metronome's new ways of practising.

**The metronome** (after Molly Gebrian, *Learn Faster, Perform Better*, chapters 14 and 16):

- **Thin the click**, a setup that walks the click away a stage at a time at one tempo: every beat, 1 and 3, beat one, then beat one every 2, 3, 4, 8 and 16 bars. Back, Next and Done on the face.
- **1 and 3** (every other beat from beat one) beside the backbeat under Where the click falls, and **beat one every 8 or 16 bars**.
- **Click up, a step at a time.** "Step when ready" moves the tempo when you tap Next, not by the clock. The Stop at field is now the **Goal**, with "Start at half the goal" and "Go 5% past the goal". Quick picks of 3, 5 and 10 for the step, and a note when the step is too small to feel. The Build speed setup now works this way.
- **Interleaved clicking up**, a guide to Gebrian's own method. Say how many chunks the passage has, how long a chunk is, the start, the goal and the step. The face then says what to play ("Play chunks 2 to 4 at 80"), counts a bar, clicks for exactly those chunks and one beat more to land on, and stops. Next, Back, and where you are in the schedule is kept. It can build from the end of the passage.
- **Offbeat click** and **Beat one only** as named setups.
- **The screen goes still on silent beats** when Random mute or Gradual mute is switched on, and in Thin the click: eyes keep time too. It can be switched back under More.
- **Count it off** (a setup). No click: a tempo is named, you tap four beats as if counting a band in, and it says what you tapped and how far off. Within 3% counts as there. Hear the tempo, or draw another, between two tempos you set.
- **Several passages** (her interleaved clicking up #2), a setup. For three to five passages that all need speed. The face names the passage and the tempo ("Play passage B at 80"): each clicked up in small steps, then in steps of 10, 20 and 30, then start, halfway and goal, then start and goal, then the goal alone.
- **At tempo, in chunks** (her at-tempo chunking), a setup. Everything at the goal: one chunk at a time, then every two that sit together (the overlapping pairs too), then every three, until the whole passage.
- **Blind bars**, a setup. Bars of click, bars of silence, and a Tap button. Tap every beat and keep tapping through the silence. After each gap it says whether the beat held, rushed or dragged, and by how many milliseconds. It measures how the taps moved across the gap, so the phone's own touch delay does not count.
- **Strong and weak beats**, a setup: a bar of four as strong, weak, medium, weak.
- **Set list.** Under Setups, "Run these as a set list" steps through your saved setups in their order, one tap from song to song, with the song's name in big type and the next one shown. The click stops between songs. Up moves a setup earlier in the order.
- **A setup as a link.** "Copy a link to what is set now" (under Setups) gives an address that opens the metronome with the same tempo and everything the click is doing: `…/metronome/?m=…`. The sound, the volumes and saved setups stay the reader's own, and a member's own Shelf loop does not travel. The theme says where the free metronome is (`lbs_tool_url`); without one the link opens the page it was made on.

**One app:**

- **Today on Home.** A row on the Shed's Home opens each room's own Today's set: Ear, Elements, Read. Only rooms the member can use are shown.
- **Links into Ear Training**: `#drill/deg/1+3+5` (a drill and what is in play), `#drill/chord`, `#today`, `#jam`. "Copy a link to this" is under In play.
- **Fixed:** the Elements "Copy a link to this mix" button (new in this release) shared an id with the "Change the mix" link, so the wrong one answered the tap.

**The practice (the Shed's timer and diary):**

- **Five in a row.** Clean and Slip buttons while the timer runs. A slip sends the count back to nothing. Three or more in a row ticks the diary's "three times in a row" for you.
- **Shuffle.** With two or more things picked to work on, the practice says which to play now. Switch draws another (never the same twice running), by hand or every 3 or 5 minutes.
- **Lucky dip.** Draws a key, a pattern, a way of playing it and a tempo, with the click and the drone one tap away.

**Harmonic Elements:**

- **Today** in the Dojo: twelve rounds of Name it on a few elements chosen from your record. Up to three you are working on (the shakiest first), up to two recognised ones left alone longest, and the next new one in the course's order. No element is ever alone of its kind (major or minor), so there is always a choice.
- **The map** in Your record: every element by stage, marked recognised, met or still to come. Tap one for its Guide page. "Practise" beside a stage sets Name it to that stage.
- **Home is established, then heard.** The Dojo asks one thing at a time. **Name it**: the band gives you home, and you name the element. **Find home**: nothing is given, and you find the key. Where a loop has two homes Find home says so, and either counts.
- **Four ways for the band to establish home** in Name it (The mix → Home): **Cue** (two bars of the home chord, the default), **Pedal** (a low home note under the loop), **Bass** (the band's bass on each chord's root) and **Loop only**. Pedal and Bass are the house band's: a recorded loop gets the cue.
- **Home hit.** While a loop is going round in Name it, one bar of the home chord is laid over it from the next bar line.
- **Hear it from each home.** After any answer, the same chords with the band's bass on the roots, phrased from each home the loop has.
- **Cadences have one home.** Elements defined by where they arrive (ii V I, the minor cadence, the backdoor cadence, the V of IV and others) are marked `shape: 'cadence'`: no second hearing, and never another loop's hearing. A ii V I in C is no longer accepted as G major in the expanded voicing.
- **Name it is marked strictly.** With home on C, C to F is I IV and not "I V".
- **The nineteen further molecules sorted.** Eleven stay, folded into Stages 6 to 9 with draft wording; five are merged into the element that is the same sound or idea; three are dropped. Merged and dropped elements keep their ids and are still known by name. "More molecules" is gone from the mix, the presets and the Guide.
- **Steps, not shifts.** The six "shift" elements are steps (the Mixolydian step). Their ids and their recordings' file names are unchanged, and a recording filed under the new name is read too.
- **A Guide page, "12. Whose home is it?"**, linked from every two homes card. Draft wording.
- **The room opens on the Dojo**, and on a phone a question and its Check fit one screen.
- **Hear it from each home on the Guide's pages too**, at the key, tempo and feel the page's player is set to. A card's "Key" row now reads "Home, as the course hears it".
- **The Guide is in reading order for the app.** Start here (About the course, The idea, The relationships, Whose home is it?), then The Elements, then the rest of The Method, then Reference, where "How this document is organised" and Conventions now sit. Every page keeps its address and its words; the document's section numbers are left off the titles.
- **Links into the Dojo**: `#dojo/name/major-lean+major-pull`, `#dojo/home/dorian-loop`, `#dojo/pair`. A link sets what is asked and the mix's elements. "Copy a link to this mix" is under The mix. This is how a set from Jack reaches a pupil.
- **The record** gains `ask` (`element` or `home`). Find home is counted on its own and does not count towards an element being recognised.

**Ear Training and Read, on a phone:**

- Ear Training's strands are one row that scrolls sideways, with their names whole ("Chord flavours" and "Progressions" were cut off).
- Read's Guide and Dojo switch, strands and drills are 44 px tall to tap (they were 34 to 36). Write it's Check still clears the bottom bar.

### 1.12.1

- **Tapping the neck works again in Read** (Find it, Play it). The taps never reached the page in 1.11.0 and 1.12.0, on any device: the page only listened for buttons, and the neck's places are drawn shapes.
- **More of a room on a phone.** In the app's rooms, below 900 px wide, the site header (logo, light and dark switch, Book, Menu) is gone: the room's title row is the top of the screen and the bottom bar is the way out. WordPress's admin bar is left out of the rooms at every width.
- **Read's top on a phone** is three short lines: the title with the Guide and Dojo switch, one row of strands (Sight, Theory and Map in short), one row of drills. The line describing the drill is left out on a phone, and the gaps are tighter, so Write it's neck, stave and Check fit on one screen.

### 1.12.0

- **Use the app as yourself** (Members → Portal settings): an administrator's own login gets the full app, with their own records, and every room before it is launched. Previewing a member with ?as= still works.
- **With the band**, a new Sight read drill: generated bass parts in twelve levels and eleven styles over chord progressions (and the twelve bar blues), with chord symbols, a style and tempo mark, and charts with rehearsal marks, repeats, simile bars, rhythm slashes and multi bar rests. The house band's keys comp in the style and the drums play its feel; choose the band, the band and the bass part, a click, or nothing. Every piece ends at home.
- **Write it** (rhythm dictation), a new Rhythm drill: hear a bar, build it from the level's pieces, check it beat by beat.
- **Positions**: second, fifth, seventh and ninth position sets for Find it and Write it, marking a place outside the box as outside.
- **The engraver** draws multi bar rests, simile bars, boxed rehearsal marks, tempo marks with a style word (dotted in compound time), ghost notes (cross heads, x in the TAB), slides, open and dotted rhythm slashes and ties between slashes, and squeezes a line a little rather than leave a bar alone on the next.
- **Sound**: the piano score plays on the piano; swung quavers play swung; ghost notes are short and quiet; multi bar rests count their bars.
- **The Guide** gains Swing, shuffle and other metres; Bass notation; Reading a chart; other positions; and Write it and With the band buttons. Fixed: the Guide's Before this and After this links always pointed at the first page.
- Record codes `B1` to `B12` (With the band) and drill `rwrite`; Jack's member page shows the band level.
- Checked: 213,930 Node checks (`claude/read-rules-test.js`), headless Chromium on the static page and on real WordPress (own app, rooms, REST saves, member card, public page), PHP lint.

### 1.11.0

- **Read**, a fourth room of the members' app (/members/read/): the Guide (a 27 page course in reading notation, every example engraved and playable) and the Dojo (Name it, Write it, Find it, Play it, Tap it, Hear it, Sight read, Keys, Intervals, Chords, Today and the Map). See "Read" above.
- **A full engraver** for the site (`assets/read/rd-stave.js`): rhythms, keys, ties, roadmaps, chords, treble clef and the grand staff, in the house style. lbs-bass.js is unchanged and still draws Harmonic Elements' and Ear Training's crotchet lines.
- **The bottom bar** takes as many rooms as there are (six now), one column each.
- **The app** keeps Read's last copy for no signal, and offers it on a long press of the icon.
- Record `_lbs_read`, REST `lbs/v1/read`, in Download my data and Erase Personal Data; Jack's member page shows it when shared.

### 1.10.0

- **One app, three rooms.** Ear Training and Harmonic Elements each have a room in the members' app (/members/ear-training/, /members/elements/), full screen, kept for offline use, reached from a new bottom bar: Home, Notes, Shed, Ear, Elements. Bookings and Account move under the greeting on a phone. The manifest gains shortcuts to the Shed and the rooms. The public pages are unchanged.
- **The LBS Ear Trainer is now Ear Training for Bass Players** ("Ear Training" inside the app). The page address stays /ear-trainer/.
- **New in Ear Training:** Today's set; Lines (melodic dictation); Progressions (the roots of Harmonic Elements' progressions, named or played); intervals as double stops, and tenths; Hear the other choice; links from an answer to its card in Harmonic Elements and to a drone on its home; and the Jam room, with the home chords Harmonic Elements leaves out for now.
- The record takes the new drills (`line`, `roots`); a line's or a progression's answer is kept as its degrees joined with dots. Codes may now be up to 40 characters and include `-` and `.`.
- The Shed's drone takes a note from its address (`?note=0` for C to `11`), on the portal and on the free drone page.
- Checked: 17,348 Node checks on the drills (every set, every tone centre: questions, sounds in range, marking, variants, record codes, Today), the 21,451 Harmonic Elements checks unchanged, headless Chromium through every strand, Today, the Jam room and a room at phone and desktop widths, PHP lint.

### 1.9.0

- **Harmonic Elements asks for a key**: home and whether home is major or minor, two small steps. The element pad follows the choice, showing each element as it sounds from a home of that kind.
- **Elements are sounds with hearings** (`HE.keyHearings`, `HE.sameSound`): any hearing the course allows counts, and the answer and the Guide's pages list them under Also heard as. The Dorian loop heard as I V ii IV in G major is now right.
- **Two Show me buttons**, the key and the element, each showing its half. A half shown doesn't count towards recognised; the record keeps how the other half went.
- **Home cued**, a setting under The mix: two bars of the home chord before each loop.
- **The forms and the five extra home chords are out of the app for now**, behind two switches in `he-catalogue.js`. Recordings and records of them are kept.
- **The course's relationships are relabelled**: Home, Lean, Pull, Shadow, Colour, Applied. Shift is gone. Stage 7 is Colour, Stage 8 Colour molecules, Stage 9 Applied. ii and ♭VII in minor (the neo soul and minor shifts) move to Shadow, the borrowed chords and chromatic mediants to Colour, and the three operation cards sit beside what they make. Every element's Built from line is rewritten to match. The Guide is rebuilt from the revised course text.
- **Elements whose home never sounds** are left out of Name it (still in the drills and the Guide).
- Every file name the 1.8.0 library read (10,880 tried) is read the same way. Saved mixes and records carry over: a record line gains `keyMode`, `saidMode` and, where one half was shown, `showed`.

### 1.8.0

- **The metronome is rebuilt** (see above): Random mute, Gradual mute and Click up; recorded click sounds; the house drummer from Harmonic Elements; where in the beat the click falls; setups that can be saved. Old settings carry over (the speed trainer becomes Click up, "Wean me off" becomes Gradual mute).
- **The metronome, the drone and the tuner can each stand on a public page** (`lbs_shed_tool()`), free for anyone, with what they set kept in their own browser. The theme's 3.15.0 gives them /metronome/, /drone/ and /tuner/.
- **The LBS Ear Trainer** (see above): intervals, chord flavours, scales and inversions against a tone centre, answered by tapping, on a fretboard or by playing a bass into the microphone, with every answer in stave, TAB and on the neck. Open to everyone once launched; a member's record is kept with their account and a sitting can go into their practice diary.
- **Harmonic Elements:** the Stage 10 forms as loops with a form map (half bar chords included); nineteen further molecules in three groups, with placeholder names for you to rewrite; two new drills in the Dojo (Which is which, Before and after); and **Play** in the Guide: the notes on a fretboard, bass lines in stave and TAB, and a reference bass that plays the line or takes turns.
- **The house band gains a bass player**: an electric bass (a five string played with the fingers, chosen by ear after a first, harder sounding one was turned down) and an upright bass (both recordings, in the public domain), with a bass made in the browser standing in when a visitor has asked to save data. The band can now play a part written note by note, plays two chords in a bar, and brings a new loop in exactly on the bar while another is sounding.
- **The installed app keeps the metronome's sounds** for use with no signal: the recorded clicks from the moment it is installed, each kit once it has been used.
- Three more sound files (two basses and the clicks, 350 KB between them), fetched only by what uses them. 184 reference loops were drawn before and after the engine changes and come out identical to the last bit.
- Saved mixes, records and metronome settings carry over unchanged.

### 1.7.0

- **The house band** (see above): eighteen chord sounds and seven drum kits of the app's own, with three grooves for every feel, in place of the single synthesised sound. Sampled pianos, vibraphone, guitar and drum kits (public domain recordings, eight small files fetched only as a loop needs them) beside instruments made in the browser. Recordings from Nextcloud are heard as well as the house band, exactly as before.
- **The Dojo** has a line saying who is playing, new settings under The mix (who plays, how the chords are played, which sounds and kits), and gets the next loop ready while you answer, so Next starts at once. The first loop is ready before the first tap.
- **The Guide's player** plays at any tempo from 50 to 160, in any feel, on any of the house band's sounds and kits, in the base or expanded voicing, comped or held. A new groove comes round each time the loop is started again.
- **On a phone:** play, stop and Check stay in reach in a strip along the bottom once the play button has scrolled away; the top of the page is shorter; the explanation of a tone centre folds away; with one tone centre in the mix the home buttons step aside.
- **The bar that is sounding fills a beat at a time**, the count-in counts, and Enter is Check (then Next) on the full screen page, beside the space bar for play and stop.
- **Your record** has three figures at the top (elements recognised, loops answered, first-time answers in a row), and the answer says when an element has just become recognised or a run is building.
- **Test Stage N in the Dojo** on every element's and stage's page in the Guide.
- **Ten Stage 9 loops gain the expanded voicing their Guide page gives** (the turnaround, the descending soul cycle, the chain of dominants, the V of IV, the borrowed minor lean, the minor plagal cadence, the backdoor cadence and the three chromatic mediants), so the page and its loop agree. Files already named for these read exactly as before.
- **Percussion** is a feel the house band plays too (congas, shaker, claves, cowbell).
- On an iPhone the page asks Safari to treat the loops as music, so the silent switch shouldn't mute them (Safari 16.4 and later). Worth a try on your own phone: it is the one change that couldn't be tested without one.
- Saved mixes and records carry over unchanged. The theme needs no change; 3.14.0 has new wording and pictures to match.

### 1.6.0

- **The Guide** joins the ear trainer, which is now called **the Dojo** (see above): the whole course text, an element at a time, with its loops to play along with.
- **Closed until launched.** Until the theme's Launch tickbox is ticked, only an administrator can open either room, fetch a loop or save a record.
- **Personal data export fixed.** WordPress's Tools → Export Personal Data left the Shed section empty, because it asked for it under the Practice Room's old name. It now carries everything a member has added in the Shed. (Download my data in the portal was never affected.)
- A recorded loop being fetched now shows "Tuning up" rather than "Stop", and the current pick keeps its colour on a phone after a tap.
- Needs Leith Bass Space theme 3.13.0 for the Coming Soon page and the tickbox.

### 1.5.0

- **The Harmonic Elements ear trainer** (see above): chord and drum loops read straight from a Nextcloud folder, any number of recorded versions of each loop alongside a synthesised one, each member's record kept with their account, and sharing with Jack that the member switches on.
- Portal settings gains the **Harmonic Elements folder**, the **Recorded loops are for** switch, and a box showing the loops in use and any file names worth fixing.
- A member's page shows their ear trainer record when they share it.
- The Nextcloud connection can list a whole folder tree in one request, and can fetch a file whose folder name begins or ends with a space.
- Needs Leith Bass Space theme 3.12.0 for the page.

### 1.4.0

- **The demo starts blank.** Diary, journal, practice plan, questions, the habit chain and the rest start empty, so a visitor's first finished practice fills them in. The one tempo exercise, the two objectives and the Shelf track that stay are marked as examples.
- **Full screen demo** for phones (`lbs_shed_demo( 'full' )`): the Shed on its own page, like the app, with no box scrolling inside a page. The back button moves between tools, and the now playing bar sits at the bottom of the screen.
- The sign in page has a quiet "Not a member yet? Have a go with the Shed tools" line.
- On phones, an open tool's main button and the now playing bar no longer overlap, and the bar sits at the very bottom when the tab bar steps aside.
- Objectives on the practice plan show in full instead of being cut short.

### 1.3.0

The Shed gets the studio gear look from the design review. The place is still **the Shed**; the kit inside it is **Shed tools**.

- **The Shed home:** a big Start practising slab (with what you said to start with next and your day chain), then a tile for each tool with a live line (tempo, drone note, days this week) and the Choose your tools link underneath.
- **Tools open full screen:** one tool at a time, with a back arrow to the Shed. Each tool has its own address (`?tool=metronome`), so the phone's back button and home screen links work. On phones the tab bar steps aside while a tool is open.
- **Instruments are always dark:** the metronome, drone, tuner, recorder and the practising screen use the dark instrument style in light mode too.
- **Now playing:** anything making sound (metronome, drone, the Shelf player, a practice timer or a take being recorded) shows in a slim bar at the bottom of every screen, with a stop button.
- **Metronome:** a big tempo you can swipe, the Italian marking, a bar counter, beat blocks you tap to change, and a "Let the click do less" ladder (every beat, 2 and 4, beat one, every 2 bars, bar off, random) with a Wean me off button that steps down by itself. Grooves, the speed trainer, time and sound sit behind four tiles.
- **Drone:** the notes on a circle of fifths around a tanpura, strings that pluck as it plays, and the first string, register and intonation as simple buttons.
- **Tuner:** a needle dial, a strobe band that drifts sharp or flat and stands still when you're in tune, plain hints ("ease the peg back a touch"), and each string ticked off once it's held in tune.
- **Practising:** a big clock with a bar that fills towards your aim, one tap for the click or the drone, and the journal on a torn sheet of paper. Finishing goes straight to the diary.
- **Habit tracker:** the chain as a big number, milestones (seven days, a fortnight and on), the week as faders against the goal line, and eight weeks as a poster of crosses.
- **The Shelf:** tracks as record sleeves with the key in big type, and a player with a waveform you can tap to jump to, with the A to B loop marked on it.
- **Overview:** the next session as a ticket stub, and the first line of the latest notes pulled out.
- **Try the Shed** on the Portal page (moved to its own Shed tools page in 1.4.0).
- Tidier chrome: sentence case buttons, a slim footer with sign out, and shorter tab bar labels (Home, Notes, Shed, Bookings, Account).
- Removes a development script that was left in the 1.2.1 package by mistake. It did nothing on a live site.

### 1.2.1

- The Shed's tools are in everyday order: diary, metronome, tuner, drone, the Shelf, questions, tempo tracker, recorder, then the habit tracker, songs, goals, listening list and bass notes.
- The practice diary has a proper **Journal**: a larger free-writing box, first in both the timed and quick forms, with room for 4,000 characters. While the timer runs you can jot notes as you go; they're kept on the device and waiting in the journal when you finish. Journal text leads each diary entry.
- Tempo exercises picked as a focus can have their tempo logged in the same finishing step, so there's no second trip to the Tempo tracker.

### 1.2.0

- **Metronome, rebuilt.** Clicks are scheduled on the audio clock from a timer in a background worker, so they stay steady when the page is busy, and it looks further ahead while the screen is locked. Tempo 20 to 300 with ±1, ±5, tap and keyboard shortcuts; simple, compound (6/8, 9/8, 12/8) and grouped odd meters (5/8, 7/8, 9/8, 11/8); subdivisions up to sextuplets with swing; accent, normal, soft or silent on each beat; six sounds with separate volumes; count-in; full screen; a wireless headphones delay.
- **Internal time** (after Molly Gebrian): clicks on 2 and 4, offbeats only, beat one only or once every 2 to 4 bars, bar on and bar off, random silence at 25, 50 or 75%, and **Wean me off**, which steps through all of these, 8 bars each. The flashing can hide when the click is silent.
- **Speed trainer:** from, to, step and bars, rising or falling, with a ladder option (up a step, back half a step).
- **Grooves:** eleven drum patterns (rock, pop, funk, Motown, shuffle, half-time, reggae, swing, bossa, 6/8, 7/8), played on Kyle's kit when its hits are in the Kit folder, and loops from the Grooves folder that follow the tempo.
- Tempo tracker links: **Practise at N bpm** starts the metronome at your last clean tempo, and stopping after a proper go offers to log the tempo.
- **Practice diary loop:** Start practising, pick what you're working on (this week's objectives, older objectives worth coming back to, tempo exercises, songs), set an aim, and a timer runs (it survives the screen locking or a reload). Finish with what got easier, what needs attention, whether it went three times in a row, and what to start with next time, which is waiting for you when you come back. Logging without the timer is still there.
- **Look back:** the day before a session, the diary sums up the week and turns your notes into questions for Jack in one tap.
- **Habit tracker:** a goal of days a week and minutes a day, set by Jack on the member page or by the member. A day chain that survives one missed day, weeks in a row, bests, an eight-week calendar, rest days, a holiday pause, and weekly practice times that appear in the member's calendar feed. Shared with Jack unless switched off; the prep shows it.
- **Tuner:** chromatic, reads down to a low B, shares its reference pitch with the drone.
- **Recorder:** record in the app with a level meter; takes stay on the device until sent, then go to Jack as before. Sending a file still works. The tool is now on by default and shows as "Private until you send".
- **The Shelf's practice player:** slow a track to 50 to 90% without changing its pitch, and loop from A to B.
- **Calendar:** two-way Google Calendar sync (see above). The members' feed now folds long lines, carries the door note, shows untimed bookings as all-day, and fixes a doubled backslash in event notes.
- Groove titles on the Shelf drop the tempo, meter and bar count from the file name.
- Privacy text covers the new tools, the microphone and Google Calendar.

### 1.1.0

- The Practice Room is now **the Shed**, throughout the portal, emails, privacy text and the app. The tab keeps its address (`?tab=practice`), so old links still work.
- **Drone:** a tanpura on any of the twelve notes (Pa, Sa, Sa, low Sa, with the jawari shimmer) that plays until stopped. First string Pa, Ma, Ni or Sa only; Just or Equal intonation; three registers; pace, tuning (A = 438 to 444) and volume. It loops on the audio clock, keeps the screen awake, and sounds on iPhone with the ring switch off.
- **The Shelf:** the all-members library from Nextcloud, with search by title, key and tempo, audio that plays in place, and "New" on files added in the last fortnight.
- Grooves and Kit folders are read and checked, ready for the metronome's drum grooves.
- The practice nudge now invites rather than counts missed days, and names the first objective from the last session.
- Guardian wording in the privacy text now says under 16, at the parent or guardian's choice.

### 1.0.1

- The sign in screen links "The Portal" to the public page that explains it (/portal/).
- The guardian field when adding a member now reads "under 16s, if they'd like copies", to match what the site says.

### 1.0.0

- The portal moves out of the theme into this plugin.
- Home-screen app: manifest, icons, offline copy, offline queue, bottom tab bar, install prompts, year-long sign-in.
- Permanent member folders; consistent access checks on every route; access switched off revokes invites, sign-ins and calendar links.
- Lesson credit in hours and minutes with block expiry, adjustments, voided blocks, negative balances and a change history.
- Provisional and confirmed bookings, overlap and credit warnings, move and cancellation emails, and a calendar subscription that updates itself.
- Practice Room: edit and undo everywhere, per-tool saving so nothing overwrites anything else, diary "what got easier / what needs attention", tempo logs with how it felt.
- Guardian copies, data download, deletion requests and privacy tools.
- Email log with retries; recordings checked on the server with per-member space.
