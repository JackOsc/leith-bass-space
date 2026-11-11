<?php
/**
 * Editable content registry. Every entry appears in both the Customizer and
 * Appearance → Leith Bass Content, and is rendered by leithbass_text().
 * The defaults below are the shipped copy, so clearing a field restores it.
 *
 * kind: text | textarea | plain_textarea | points | email | url
 * ('points' = one bullet per line; text before a colon is shown bold)
 *
 * @package LeithBass
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

function leithbass_content_registry() {
	static $r = null;
	if ( $r ) { return $r; }
	$r = array(

		/* ---- Homepage ---- */
		'home_headline_v3'    => array( 'Homepage', 'Hero: heading (H1)', 'text', 'One-to-one bass lessons in Leith, Edinburgh' ),
		'home_subheadline_v3' => array( 'Homepage', 'Hero: lead', 'text', 'Learn with a working bassist in a beautiful, fully equipped studio. Practise better. Play better.' ),
		'home_line_v3'        => array( 'Homepage', 'Hero: supporting text', 'text', 'From your first note to advanced technique, harmony and musicianship. Music, by way of the bass. All ages and levels welcome.' ),
		'home_proof_kicker_v3' => array( 'Homepage', 'Studio introduction: label', 'text', 'Meet Jack' ),
		'home_standfirst_v3'   => array( 'Homepage', 'Studio introduction: statement', 'text', 'I&rsquo;m Jack. I&rsquo;ve played bass for over twenty years, on stages and on records, and I teach in the kind of space I always wanted to learn in.' ),

		'home_blurb_approach' => array( 'Homepage', 'Block: Approach line', 'text', 'Collaborative sessions built around your goals, with notes, bookings and practice tools in your own member portal between them.' ),
		'home_blurb_spaces'   => array( 'Homepage', 'Block: Studio line', 'text', 'A working recording studio in Leith, with a full professional setup at your disposal.' ),
		'home_blurb_prices'   => array( 'Homepage', 'Block: Prices line', 'text', '&pound;40 an hour, ten-hour blocks at &pound;360, and shorter or longer sessions by arrangement.' ),
		'home_label_approach_v3' => array( 'Homepage', 'Block: Approach label', 'text', 'How sessions work' ),
		'home_label_spaces_v3'   => array( 'Homepage', 'Block: Spaces label', 'text', 'Where you&rsquo;ll learn' ),
		'home_label_prices_v3'   => array( 'Homepage', 'Block: Prices label', 'text', 'Prices &amp; booking' ),

		'home_testimonials_kicker'     => array( 'Homepage', 'Testimonials: label', 'text', 'On stage and in the studio' ),
		'home_testimonials_heading'    => array( 'Homepage', 'Testimonials: heading', 'text', 'What artists say about working with Jack' ),
		'home_testimonial_sithu'       => array( 'Homepage', 'Testimonial: Sithu Aye', 'textarea', 'Not only is Jack a consummate professional on and off the stage, but he also brings a joy and energy to performances that is infectious to both his bandmates and the crowd. While I could have had Jack just plug and play the parts, which he would have been more than capable of doing, that would have been a waste of his talents. Giving him the freedom to experiment with parts and arrangements gives spontaneity and life to performances during long and often gruelling tours. Jack is an absolute joy to work with and share the stage with.' ),
		'home_testimonial_sithu_name'  => array( 'Homepage', 'Testimonial: Sithu Aye attribution', 'text', 'Sithu Aye' ),
		'home_testimonial_lorna'       => array( 'Homepage', 'Testimonial: Lorna Brooks', 'textarea', 'I had the pleasure of working with Jack on the recording of my latest album and the live launch, and I can confidently say he&rsquo;s an outstanding bass player. His groove is impeccable, always playing with purpose and feeling that perfectly complements the song. Beyond his skill, Jack is also a joy to collaborate with&mdash;professional and easygoing. Highly recommend him for any project!' ),
		'home_testimonial_lorna_name'  => array( 'Homepage', 'Testimonial: Lorna Brooks attribution', 'text', 'Lorna Brooks' ),

		'home_close_kicker'  => array( 'Homepage', 'Closing: line above', 'text', 'Every player I work with started with a conversation.' ),
		'home_close_heading_v3' => array( 'Homepage', 'Closing: heading', 'text', 'Start with an introductory session.' ),
		'home_hero_cta_label'  => array( 'Homepage', 'Hero: button label', 'text', 'Enquire about lessons' ),
		'home_close_cta_label' => array( 'Homepage', 'Closing: button label', 'text', 'Book an introductory session (&pound;20)' ),
		'home_close_body'    => array( 'Homepage', 'Closing: text', 'textarea', 'Half an hour to meet, talk about where you&rsquo;d like to get to, and see how we work together. It&rsquo;s &pound;20, and we&rsquo;ll arrange a time as soon as you get in touch.' ),

		/* ---- Approach page ---- */
		'approach_page_h1' => array( 'Approach page', 'Page heading', 'text', 'How I teach bass in Leith, Edinburgh' ),
		'approach_opening' => array( 'Approach page', 'Opening text', 'textarea', 'Learning music is one of the best gifts you can give yourself. It has given me lifelong friends, discipline, patience and a great deal of joy, and I love passing that on.' . "\n\n" . 'I teach bass as a way into music itself, not just the bass in isolation: ears, reading, harmony, groove and confidence. From your very first lesson through to advanced technique and musicianship, all ages and abilities are welcome.' . "\n\n" . 'Sessions are collaborative and built around your goals, whether you&rsquo;re picking up a bass for the first time, working towards exams or a tour, or an experienced player after a coach&rsquo;s perspective.' ),

		'approach_who_title' => array( 'Approach page', 'Who is teaching: heading', 'text', 'Who you&rsquo;re learning from' ),
		'approach_who_sub'   => array( 'Approach page', 'Who is teaching: subheading', 'text', 'Twenty years of playing, still working' ),
		'approach_who_body'  => array( 'Approach page', 'Who is teaching: text', 'textarea', 'I&rsquo;ve played bass for over twenty years, on stages and on records in the UK, Europe and North America. I&rsquo;ve toured internationally with Sithu Aye, done years of session work across genres, and I play with Edinburgh&rsquo;s <a href="https://slowkarma.bandcamp.com">Slow Karma</a>. I read notation and charts, and I still take session and live work.' . "\n\n" . 'Which mostly matters for one reason: a lot of what we work on is something I did last week, rather than something I learned once and now repeat. If you want to hear the other half of the job, the recording and production work is at <a href="https://jackaud.io">jackaud.io</a>.' ),

		'approach_s1_title'  => array( 'Approach page', 'Section 1: heading', 'text', 'Sessions, not lessons' ),
		'approach_s1_sub'    => array( 'Approach page', 'Section 1: subheading', 'text', 'Collaborative, and built around you' ),
		'approach_s1_body_a' => array( 'Approach page', 'Section 1: text (left column)', 'textarea', 'I think of our time together as sessions rather than lessons: time spent on your goals, your playing and your musicianship. I bring the experience, the plan and the feedback, and I&rsquo;ll always be clear about what you&rsquo;re working on and why. But it&rsquo;s a conversation, not a lecture. You&rsquo;ll have a say in where we go, and I may well learn as much from you as you do from me.' ),
		'approach_s1_body_b' => array( 'Approach page', 'Section 1: text (right column)', 'textarea', 'Every plan is bespoke, shaped by your goals, your learning style and your circumstances. Whether it&rsquo;s jamming along to a favourite song or untangling a theory concept, my aim is for sessions to be a highlight of your week.' ),

		'approach_s2_title'  => array( 'Approach page', 'Section 2: heading', 'text', 'Beyond technique' ),
		'approach_s2_sub'    => array( 'Approach page', 'Section 2: subheading', 'text', 'Becoming a well-rounded musician' ),
		'approach_s2_body'   => array( 'Approach page', 'Section 2: text', 'textarea', 'Technique matters, and we&rsquo;ll look after the fundamentals: mechanical efficiency, posture and comfort, a realistic practice schedule, and active listening.' . "\n\n" . 'But the work reaches further, into performance psychology, self-expression, collaboration and composition. After all, great bass playing is great musicianship.' ),
		'approach_s2_points_v2' => array( 'Approach page', 'Section 2: bullet points (one per line; text before a colon appears bold)', 'points', 'Individual approach: every player is unique, and their learning should be too.' . "\n" . 'Creative expression: a safe, encouraging space to experiment and find your voice.' . "\n" . 'Understanding music: the aim is to learn music, not just the bass. Reading, harmony and theory arrive at the right time, so investing in the fundamentals now saves time later and opens up greater musicianship, expression and enjoyment. As a teacher of mine put it: &ldquo;the only shortcut is the long way.&rdquo;' . "\n" . 'Enjoyment of music: progress should feel rewarding, and learning should be fun.' ),

		'approach_s3_title'  => array( 'Approach page', 'Section 3: heading', 'text', 'Between sessions' ),
		'approach_s3_sub'    => array( 'Approach page', 'Section 3: subheading', 'text', 'The work carries on after you leave the studio' ),
		'approach_s3_body'   => array( 'Approach page', 'Section 3: text', 'textarea', 'Most of your progress happens between sessions, so I make sure you&rsquo;re never guessing what to work on. After each session I write up what we covered, This week&rsquo;s objectives, and any worksheets or backing tracks that go with them. It all lands in your own member portal, alongside your bookings and the Shed, where your practice tools live, at no extra cost. Where we both feel it would help, we can record sessions too.' . "\n\n" . '<a href="/portal/">See how the Portal works</a>, or <a href="/shed/">try the Shed tools</a>.' ),

		'approach_cta_heading' => array( 'Approach page', 'Call-to-action: heading', 'text', 'Sound like your kind of learning?' ),
		'approach_cta_body'    => array( 'Approach page', 'Call-to-action: text', 'textarea', 'Get in touch about booking lessons and we&rsquo;ll arrange an introductory session.' ),
		'approach_cta_label'   => array( 'Approach page', 'Call-to-action: button label', 'text', 'Get in touch' ),

		/* ---- The Portal page (3.7.0) ---- */
		'portal_page_h1'   => array( 'Portal page', 'Page heading', 'text', 'Session notes, bookings and the Shed, all in one place' ),
		'portal_opening'   => array( 'Portal page', 'Opening text', 'textarea', 'Most of your progress happens between sessions, so I make sure you&rsquo;re never guessing what to work on.' . "\n\n" . 'After each session I write up what we covered, This week&rsquo;s objectives, and any worksheets, backing tracks or recordings that go with them. It all lands in your own member portal, which comes with your sessions at no extra cost. Your bookings sit alongside, and so does the Shed, with the tools for the work you do on your own.' ),
		'portal_shot1_title'   => array( 'Portal page', 'Screen 1: label', 'text', 'Overview' ),
		'portal_shot1_caption' => array( 'Portal page', 'Screen 1: caption', 'text', 'Your next session, this week&rsquo;s objectives and the latest notes, the moment you open it.' ),
		'portal_shot2_title'   => array( 'Portal page', 'Screen 2: label', 'text', 'Session Notes' ),
		'portal_shot2_caption' => array( 'Portal page', 'Screen 2: caption', 'text', 'Every session written up and searchable, with its worksheets and recordings attached.' ),
		'portal_shot3_title'   => array( 'Portal page', 'Screen 3: label', 'text', 'The Shed' ),
		'portal_shot3_caption' => array( 'Portal page', 'Screen 3: caption', 'text', 'Shed tools for the work between sessions: a practice diary with a journal, a metronome, tuner and drone, and a habit to keep.' ),
		'portal_shot4_title'   => array( 'Portal page', 'Screen 4: label', 'text', 'Bookings' ),
		'portal_shot4_caption' => array( 'Portal page', 'Screen 4: caption', 'text', 'What&rsquo;s coming up, straight into your phone&rsquo;s calendar, with a button to ask for a change.' ),
		'portal_shots_note'    => array( 'Portal page', 'Note under the drawn example screens (hidden once all four are real screenshots)', 'text', 'Example screens with sample data.' ),

		'portal_notes_sub'   => array( 'Portal page', 'Session Notes: subheading', 'text', 'Session Notes' ),
		'portal_notes_title' => array( 'Portal page', 'Session Notes: heading', 'text', 'Notes you can come back to' ),
		'portal_notes_body'  => array( 'Portal page', 'Session Notes: text', 'textarea', 'Each set of notes records what we worked on, what I noticed, and what to do next. I write them for you to use at the instrument, so they&rsquo;re specific: a tempo to aim for, a fingering to try, a track to listen to.' . "\n\n" . 'Worksheets and backing tracks open straight from the note, and because every session is kept, you can search back through months of work when something we did in the spring suddenly makes sense.' . "\n\n" . 'This is a real set of notes, shared with permission, from a session on working out chords by ear.' ),
		'portal_note_date'    => array( 'Portal page', 'Example notes: date', 'text', 'Tuesday 22 September' ),
		'portal_note_title'   => array( 'Portal page', 'Example notes: title', 'text', 'Working out chords by ear' ),
		'portal_note_covered' => array( 'Portal page', 'Example notes: topics covered (separate with commas)', 'text', 'Tone, Lean and Pull, Ear training' ),
		'portal_note_body'    => array( 'Portal page', 'Example notes: the notes (a numbered list shows as steps; a bulleted list shows as objectives)', 'textarea', '<strong>Tone.</strong> We looked at the EQ on your J Retro preamp: what each boost and cut frequency does, and where each one is useful. Most of our time went on the mids. The range of the mid control is significant, so a small move changes the sound a lot.' . "\n\n" . '<strong>Lean and Pull in context.</strong> We played the Lean and Pull bonds from Harmonic Elements over backing tracks, moving each vamp through several keys. You found this a useful way to train your ear, so we&rsquo;ll keep using it. Ear training apps can lack context, such as a key centre, and a backing track in a key is much closer to a real bandstand. After a long spell on I IV V and i iv v, it was interesting how hard a ii V I was to pick out.' . "\n\n" . '<h4>Working out chords: an order of operations</h4>' . "\n" . '<ol>' . "\n" . '<li><strong>Find home.</strong> Rather than chasing every chord, listen for the root of the I (or i) and get a feel for the key centre first.</li>' . "\n" . '<li><strong>Work out the progression.</strong> Follow the bass movement and name each chord by where its root sits against home.</li>' . "\n" . '<li><strong>Play it safe.</strong> Lines on 1, 5 and 8 fit every chord, because they don&rsquo;t commit to major or minor.</li>' . "\n" . '<li><strong>Test the quality.</strong> Try the 3 on weak beats to hear whether each chord is major or minor.</li>' . "\n" . '</ol>' . "\n\n" . 'Once you know whether home is major or minor, diatonic theory gives likely answers for the rest. If the I is major, the IV and V are probably major, and the ii, iii and vi probably minor. Probably, not certainly.' . "\n\n" . '<h4>This week&rsquo;s objectives</h4>' . "\n" . '<ul>' . "\n" . '<li>Keep working through the Lean and Pull backing tracks in new keys, finding home first each time.</li>' . "\n" . '<li>Get to know the flavour of each bond and molecule (its feel, or emotional colour) well enough to recognise it on sound alone.</li>' . "\n" . '</ul>' ),
		'portal_note_next'    => array( 'Portal page', 'Example notes: next time', 'text', 'The First molecules, with a key centre quiz.' ),
		'portal_note_caption' => array( 'Portal page', 'Example notes: caption', 'text', 'Real session notes, shared with permission. Name removed.' ),

		'portal_practice_sub'   => array( 'Portal page', 'The Shed: subheading', 'text', 'The Shed' ),
		'portal_practice_title' => array( 'Portal page', 'The Shed: heading', 'text', 'Every shed needs tools' ),
		'portal_practice_body'  => array( 'Portal page', 'The Shed: text', 'textarea', 'Between sessions, the Shed has the tools for the work you do on your own. You choose which ones you use, and which ones I can see. They&rsquo;re on their own page too, where you can have a go before you join.' ),
		'portal_shed_label'     => array( 'Portal page', 'The Shed: button to the Shed tools page', 'text', 'Try the Shed tools' ),


		'portal_bookings_sub'    => array( 'Portal page', 'Bookings: subheading', 'text', 'Bookings' ),
		'portal_bookings_title'  => array( 'Portal page', 'Bookings: heading', 'text', 'Your sessions, on your phone' ),
		'portal_bookings_body'   => array( 'Portal page', 'Bookings: text', 'textarea', 'Your upcoming sessions are listed with the time and place, ready to add to your phone&rsquo;s calendar. If you&rsquo;re on a block of ten, you can see how many hours are left and when the block ends. If you need to move a session, you can ask from the same screen.' ),
		'portal_bookings_points' => array( 'Portal page', 'Bookings: points (one per line; text before a colon appears bold)', 'points', 'Works on any phone: it runs in your browser and can sit on your home screen like an app, so your latest notes are there even in a practice room with no signal.' . "\n" . 'Private to you: invite only, behind your own sign in. Your notes, files and diary aren&rsquo;t public.' . "\n" . 'Parents kept in the loop: for anyone under 16, a parent or guardian can get a copy of every email the portal sends, if they&rsquo;d like to.' ),

		'portal_access_sub'   => array( 'Portal page', 'Getting access: subheading', 'text', 'Getting access' ),
		'portal_access_title' => array( 'Portal page', 'Getting access: heading', 'text', 'Who the Portal is for' ),
		'portal_access_body'  => array( 'Portal page', 'Getting access: text', 'textarea', 'The Portal is for bassists who are working with me. You&rsquo;ll get an invitation after your first session, and everything in it is included with your sessions.' . "\n\n" . 'If you have questions about how sessions work, the <a href="/faq/">FAQ</a> covers the common ones, and <a href="/prices/">Prices</a> sets out the rates and how booking works.' ),

		'portal_cta_heading'  => array( 'Portal page', 'Call-to-action: heading', 'text', 'Start with an introductory session.' ),
		'portal_cta_body'     => array( 'Portal page', 'Call-to-action: text', 'textarea', 'Half an hour to meet, talk about where you&rsquo;d like to get to, and see how we work together. It&rsquo;s &pound;20, and we&rsquo;ll arrange a time as soon as you get in touch.' ),
		'portal_cta_label'    => array( 'Portal page', 'Call-to-action: button label', 'text', 'Book an introductory session (&pound;20)' ),
		'portal_signin_label' => array( 'Portal page', 'Call-to-action: sign in button label', 'text', 'Member sign in' ),

		'shed_page_h1'      => array( 'Shed tools page', 'Page heading', 'text', 'Practice tools for the time between sessions' ),
		'shed_intro'        => array( 'Shed tools page', 'Opening text', 'textarea', 'Jazz musicians call serious practice woodshedding: taking yourself off somewhere quiet until you&rsquo;ve got it. The Shed is that place in the member portal, with the tools to hand.' . "\n\n" . 'Have a go. It starts empty, just like yours would: set the metronome going and let the click drop out, pick a drone from the circle of fifths, tune up, or start a practice and write in the journal.' ),
		'shed_try_note'     => array( 'Shed tools page', 'Try it: small print', 'text', 'Sound only plays when you tap. Nothing you do here is saved.' ),
		'shed_try_hint'     => array( 'Shed tools page', 'Try it: hint beside the phone (larger screens)', 'text', 'Tap a tool to open it. The arrow at the top brings you back to the Shed.' ),
		'shed_open_label'   => array( 'Shed tools page', 'Try it: button on phones', 'text', 'Open the Shed' ),
		'shed_open_note'    => array( 'Shed tools page', 'Try it: line under the button on phones', 'text', 'It opens full screen, just like the app.' ),
		'shed_tools_sub'    => array( 'Shed tools page', 'The tools: subheading', 'text', 'The tools' ),
		'shed_tools_title'  => array( 'Shed tools page', 'The tools: heading', 'text', 'What each one is for' ),
		'shed_tools_body'   => array( 'Shed tools page', 'The tools: text', 'textarea', 'You choose which tools you use, and which ones I can see. Anything you keep private stays private, even from me.' ),
		'shed_aside'        => array( 'Shed tools page', 'The tools: line from Jack', 'text', 'I use these tools for my own practice too.' ),
		'shed_tools'        => array( 'Shed tools page', 'The tools (one per line; the name goes before a colon)', 'points', 'Practice diary: plan what you&rsquo;ll work on, time the practice, then note what got easier and what to start with next time. It&rsquo;s waiting for you when you come back.' . "\n" . 'Habit tracker: a goal we agree together (so many days a week, so many minutes) and a chain of days to keep going. Miss one day and the chain holds.' . "\n" . 'Metronome: ways to let the click do less (on 2 and 4, a bar on and a bar off, Random mute, Gradual mute) so your own time does more. Click up to build speed, a house drummer to play along with, and odd time signatures.' . "\n" . 'Tempo tracker: log the tempo you can play something cleanly and watch it climb, one honest step at a time.' . "\n" . 'Drone: a tanpura on any of the twelve notes, playing until you stop it. For scales, intonation, and hearing how each note sits.' . "\n" . 'Tuner: a chromatic tuner that reads right down to a low B.' . "\n" . 'The Shelf: backing tracks, drones, course material and transcriptions I&rsquo;ve put up for everyone, with a player that slows a track down without changing its pitch and loops the tricky bit.' . "\n" . 'Questions for Jack: save a question when it occurs to you, rather than trying to remember it on the way to the studio.' . "\n" . 'Recorder: record yourself in the app and listen back. Takes stay on your phone until you choose to send one, and I&rsquo;ll listen before we next meet.' ),
		'shed_free_sub'     => array( 'Shed tools page', 'Free tools: subheading', 'text', 'Free to use' ),
		'shed_free_title'   => array( 'Shed tools page', 'Free tools: heading', 'text', 'Three of them are open to everyone' ),
		'shed_free_body'    => array( 'Shed tools page', 'Free tools: text', 'textarea', 'You don&rsquo;t need to be a pupil to use the metronome, the drone or the tuner. Each has a page of its own here, with nothing to sign up for. Bookmark the one you need.' ),
		'shed_access_sub'   => array( 'Shed tools page', 'Getting them: subheading', 'text', 'Getting them' ),
		'shed_access_title' => array( 'Shed tools page', 'Getting them: heading', 'text', 'They come with your sessions' ),
		'shed_access_body'  => array( 'Shed tools page', 'Getting them: text', 'textarea', 'The Shed is part of the member portal, alongside your session notes and bookings. You&rsquo;ll get an invitation after your first session, and it&rsquo;s all included with your sessions.' . "\n\n" . '<a href="/portal/">See how the Portal works</a>' ),
		'shed_cta_heading'  => array( 'Shed tools page', 'Call-to-action: heading', 'text', 'Start with an introductory session.' ),
		'shed_cta_body'     => array( 'Shed tools page', 'Call-to-action: text', 'textarea', 'Half an hour to meet, talk about where you&rsquo;d like to get to, and see how we work together. It&rsquo;s &pound;20, and we&rsquo;ll arrange a time as soon as you get in touch.' ),
		'shed_cta_label'    => array( 'Shed tools page', 'Call-to-action: button label', 'text', 'Book an introductory session (&pound;20)' ),
		'shed_strip_text'   => array( 'Shed tools page', 'Full screen demo: line in the top strip', 'text', 'A demo of the Shed. Nothing is saved.' ),
		'shed_strip_book'   => array( 'Shed tools page', 'Full screen demo: button in the top strip', 'text', 'Book' ),

		/* ---- Harmonic Elements page (3.12.0; Coming Soon in 3.13.0) ---- */
		'harmonic_page_h1'      => array( 'Harmonic Elements page', 'Page heading', 'text', 'A practical bass course in note choice and harmonic recognition' ),
		'harmonic_soon_label'   => array( 'Harmonic Elements page', 'Coming Soon: label', 'text', 'Coming soon' ),
		'harmonic_soon_body'    => array( 'Harmonic Elements page', 'Coming Soon: text', 'textarea', 'Harmonic Elements is how I teach harmony on the bass: a small set of chord movements that turn up in song after song, learned by ear and under the hands. I&rsquo;m building it into something you can use here.' . "\n\n" . 'There will be two parts. The Guide takes one element at a time: what the chords are, what to listen for, and a loop to play along with. The Dojo is an ear trainer: a loop of chords and drums plays, with no bass, until you&rsquo;ve found home and named what you&rsquo;re hearing.' . "\n\n" . 'It isn&rsquo;t open yet. The loops are still being recorded.' ),
		'harmonic_soon_shot1_title'   => array( 'Harmonic Elements page', 'Coming Soon: picture 1 label', 'text', 'The Guide' ),
		'harmonic_soon_shot1_caption' => array( 'Harmonic Elements page', 'Coming Soon: picture 1 caption', 'text', 'One element at a time, with its loop to play along with.' ),
		'harmonic_soon_shot2_title'   => array( 'Harmonic Elements page', 'Coming Soon: picture 2 label', 'text', 'The Dojo' ),
		'harmonic_soon_shot2_caption' => array( 'Harmonic Elements page', 'Coming Soon: picture 2 caption', 'text', 'A loop plays until you&rsquo;ve found the key and named the element.' ),
		'harmonic_soon_shot3_title'   => array( 'Harmonic Elements page', 'Coming Soon: picture 3 label', 'text', 'The answer' ),
		'harmonic_soon_shot3_caption' => array( 'Harmonic Elements page', 'Coming Soon: picture 3 caption', 'text', 'The changes, spelled out, and what to listen for next time.' ),
		'harmonic_intro'        => array( 'Harmonic Elements page', 'Opening text', 'textarea', 'This course develops two connected skills: hearing familiar chord relationships and choosing notes that make those relationships audible on the bass.' . "\n\n" . 'It comes in two parts. The Guide is the course itself: pick an element, read what it is, play its loop in any key, and see its notes on the neck. The Dojo trains your ear on the same material: a loop of chords and drums plays, with no bass, until you&rsquo;ve found the key and named the element.' ),
		'harmonic_how_sub'      => array( 'Harmonic Elements page', 'How it works: subheading', 'text', 'How it works' ),
		'harmonic_how_title'    => array( 'Harmonic Elements page', 'How it works: heading', 'text', 'Read it, play it, then test your ear' ),
		'harmonic_how_body'     => array( 'Harmonic Elements page', 'How it works: text', 'textarea', 'Every loop is a chord part and a drum part. The space where the bass would be is yours. In the Dojo, take as long as you like: the loop keeps going round, and you can change your answer as often as you need to before you check it.' ),
		'harmonic_points'       => array( 'Harmonic Elements page', 'How it works: the parts (one per line; the name goes before a colon)', 'points', 'The Guide: the course, an element at a time. What the chords fix and leave open, what to listen for and where to hear it, with the loop to play along with.' . "\n" . 'Play: under every element in the Guide. The notes the chords fix and leave open, on a fretboard drawn for your bass, and bass lines written in stave and TAB, from roots alone up to sevenths. A reference bass can play the line, or take turns with you.' . "\n" . 'The key: home, the note and chord that feel like rest, and whether that chord is major or minor. Plenty of loops can be heard from more than one home, and every hearing the course allows counts.' . "\n" . 'The element: the chords as roman numerals from home, such as I IV or i &#9837;VII. The numerals count from home on the major scale, so &#9837;III is always a minor third above home.' . "\n" . 'The mix: choose which elements, notes for home, tempos and feels can come up in the Dojo, from a couple of vamps to the whole course and a further set of molecules. A home cue can play the home chord before each loop, as a first step.' . "\n" . 'Show me: stuck on one half? Show the key, or the element, and find the other yourself.' . "\n" . 'Which is which, and Before and after: two more things the Dojo can ask. Tell apart two elements that are easily mixed up, or hear the change when one is altered.' . "\n" . 'The band: every loop can be played by the house band. Pianos, electric pianos, organ, guitars, vibraphone, strings and brass, on their own or a few together, over seven drum kits with three grooves for every feel, so an element doesn&rsquo;t sound the same each time it comes round.' . "\n" . 'Your record: a dot for every loop you answer. Four first-time answers from the last five, on two different days, with nothing shown, and an element counts as recognised.' ),
		'harmonic_access_sub'   => array( 'Harmonic Elements page', 'Members: subheading', 'text', 'If you have sessions with me' ),
		'harmonic_access_title' => array( 'Harmonic Elements page', 'Members: heading', 'text', 'Your record, kept with your account' ),
		'harmonic_access_body'  => array( 'Harmonic Elements page', 'Members: text', 'textarea', 'Sign in to the member portal before you start, and your record in the Dojo is kept with your account, so it follows you from your phone to your laptop.' . "\n\n" . 'It&rsquo;s yours alone unless you switch on sharing. If you do, I can see which elements you recognise and which you mix up, and we can go straight to them in sessions.' ),
		'harmonic_cta_heading'  => array( 'Harmonic Elements page', 'Call-to-action: heading', 'text', 'Want to work on this together?' ),
		'harmonic_cta_body'     => array( 'Harmonic Elements page', 'Call-to-action: text', 'textarea', 'Get in touch about lessons and we&rsquo;ll arrange an introductory session.' ),
		'harmonic_cta_label'    => array( 'Harmonic Elements page', 'Call-to-action: button label', 'text', 'Get in touch' ),
		'harmonic_strip_text'   => array( 'Harmonic Elements page', 'Full screen: line in the top strip', 'text', 'Harmonic Elements' ),
		'harmonic_strip_book'   => array( 'Harmonic Elements page', 'Full screen: button in the top strip', 'text', 'Book' ),

		/* ---- Ear Training page (3.15.0; renamed from the LBS Ear Trainer in 3.17.0) ---- */
		'ear_page_h1' => array( 'Ear Training page', 'Page heading', 'text', 'Ear training for bass players, always against a tone centre' ),
		'ear_soon_label' => array( 'Ear Training page', 'Coming Soon: label', 'text', 'Coming soon' ),
		'ear_soon_body' => array( 'Ear Training page', 'Coming Soon: text', 'textarea', 'Ear Training for Bass Players is ear training built for the bass. Most ear trainers play you two notes out of nowhere. Here the band holds a tone centre, a bass asks a question against it, and you answer: by tapping, on a fretboard, or by playing it back on your own bass.' . "\n\n" . 'It covers intervals, chord flavours, scales and inversions, then short lines to write down and the roots of the progressions in Harmonic Elements, with a Jam room for playing over the home chords. Every answer is written out on the stave, in TAB and on the neck.' . "\n\n" . 'It isn&rsquo;t open yet.' ),
		'ear_soon_shot1_title' => array( 'Ear Training page', 'Coming Soon: picture 1 label', 'text', 'The question' ),
		'ear_soon_shot1_caption' => array( 'Ear Training page', 'Coming Soon: picture 1 caption', 'text', 'The band holds home. Bar one asks, bar two is yours.' ),
		'ear_soon_shot2_title' => array( 'Ear Training page', 'Coming Soon: picture 2 label', 'text', 'Your answer' ),
		'ear_soon_shot2_caption' => array( 'Ear Training page', 'Coming Soon: picture 2 caption', 'text', 'Tap it, find it on the neck, or play it on your bass.' ),
		'ear_soon_shot3_title' => array( 'Ear Training page', 'Coming Soon: picture 3 label', 'text', 'Written out' ),
		'ear_soon_shot3_caption' => array( 'Ear Training page', 'Coming Soon: picture 3 caption', 'text', 'The answer on the stave, in TAB and on the fretboard.' ),
		'ear_intro' => array( 'Ear Training page', 'Opening text', 'textarea', 'Most ear trainers play you two notes out of nowhere. Music doesn&rsquo;t work like that: every note you play is heard against a home. So here the band holds a tone centre, a bass asks a question against it, and you answer.' . "\n\n" . 'Each question keeps going round. The first half asks; the second is yours: tap the answer, find it on a fretboard, or play it back on your bass. Then you see it written out on the stave, in TAB and on the neck, and you can hear the answer you nearly gave beside the right one.' . "\n\n" . 'Not sure where to start? Today chooses a few minutes of work from your record: what you&rsquo;ve missed lately, what you haven&rsquo;t heard for a while, and something new.' ),
		'ear_how_sub' => array( 'Ear Training page', 'How it works: subheading', 'text', 'How it works' ),
		'ear_how_title' => array( 'Ear Training page', 'How it works: heading', 'text', 'Six things to hear, and a room to play in' ),
		'ear_how_body' => array( 'Ear Training page', 'How it works: text', 'textarea', 'Start with intervals and work along, or let Today choose. You decide what can come up, from two possibilities to all of them. The band stays on one tone centre for eight questions, then moves round the cycle of fourths to the next.' ),
		'ear_points' => array( 'Ear Training page', 'How it works: the parts (one per line; the name goes before a colon)', 'points', 'Intervals: first a single note against home, named by its degree (1, &#9837;3, 5 and so on). Then the distance between two notes, one after the other or both at once, up to the tenths a bassist plays.' . "\n" . 'Chord flavours: the bass holds home and the band plays one chord on top of it. Major or minor to begin with, then the other triads, the sevenths and the colours.' . "\n" . 'Scales: the bass plays a scale up from home over a bare fifth. Major and minor first, then the pentatonics, the modes and the kinds of minor, with the note that gives each one away.' . "\n" . 'Inversions: the band holds a chord and the bass takes one of its notes. You name which is at the bottom: the root, the third, the fifth or the seventh.' . "\n" . 'Lines: the bass plays a short phrase over the band and you write it down as degrees, note by note. Two notes to begin with, up to eight, from the notes of the chord to the whole scale with passing notes.' . "\n" . 'Progressions: the band plays a progression from Harmonic Elements, round and round, and you name the roots, or the bass sits out and you play them.' . "\n" . 'The Jam room: no questions. Choose a home chord (major, minor, sus, sixths, sevenths, diminished and augmented), a home note, a tempo and a feel, and play over it for as long as you like, with its notes and a scale that fits it on the neck.' . "\n" . 'Three ways to answer: tap a pad, tap a fretboard drawn for the number of strings on your bass, or switch on the microphone and play the answer. If you play it, use headphones, so the microphone hears only you.' . "\n" . 'Stave and TAB, always: every answer is shown in bass clef, in TAB and on the neck. Tap a note to hear it again.' . "\n" . 'Your record: four first-time answers from the last five, on two different days, and it counts as recognised. It also shows what you mix up with what.' ),
		'ear_access_sub' => array( 'Ear Training page', 'Members: subheading', 'text', 'If you have sessions with me' ),
		'ear_access_title' => array( 'Ear Training page', 'Members: heading', 'text', 'Your record, kept with your account' ),
		'ear_access_body' => array( 'Ear Training page', 'Members: text', 'textarea', 'Sign in to the member portal before you start, and your record is kept with your account, so it follows you from your phone to your laptop. You can add a sitting to your practice diary too, where it counts towards your habit. In the member app, Ear Training has a room of its own, beside the Shed and Harmonic Elements.' . "\n\n" . 'It&rsquo;s yours alone unless you switch on sharing. If you do, I can see what you hear easily and what you mix up, and we can go straight to it in sessions.' ),
		'ear_cta_heading' => array( 'Ear Training page', 'Call-to-action: heading', 'text', 'Want to work on your ear together?' ),
		'ear_cta_body' => array( 'Ear Training page', 'Call-to-action: text', 'textarea', 'Get in touch about lessons and we&rsquo;ll arrange an introductory session.' ),
		'ear_cta_label' => array( 'Ear Training page', 'Call-to-action: button label', 'text', 'Get in touch' ),
		'ear_strip_text' => array( 'Ear Training page', 'Full screen: line in the top strip', 'text', 'Ear Training for Bass Players' ),
		'ear_strip_book' => array( 'Ear Training page', 'Full screen: button in the top strip', 'text', 'Book' ),
		'read_page_h1' => array( 'Read page', 'Page heading', 'text', 'Reading notation for bass players, from the page to your hands' ),
		'read_soon_label' => array( 'Read page', 'Coming Soon: label', 'text', 'Coming soon' ),
		'read_soon_body' => array( 'Read page', 'Coming Soon: text', 'textarea', 'Read is a course and a trainer for reading music on the bass: the bass clef, rhythm, keys, intervals and chords, for beginners and for players whose playing has run ahead of their reading.' . "\n\n" . 'Reading is three connections made immediate: the dot on the page to its name, to the place on your neck, and to how it sounds and where it falls in time. Read works on each of them, times every answer, and shows you which notes are immediate and which still take a moment.' . "\n\n" . 'It isn&rsquo;t open yet.' ),
		'read_soon_shot1_title' => array( 'Read page', 'Coming Soon: picture 1 label', 'text', 'The Guide' ),
		'read_soon_shot1_caption' => array( 'Read page', 'Coming Soon: picture 1 caption', 'text', 'The course, a page at a time, every example written out and playable.' ),
		'read_soon_shot2_title' => array( 'Read page', 'Coming Soon: picture 2 label', 'text', 'The Dojo' ),
		'read_soon_shot2_caption' => array( 'Read page', 'Coming Soon: picture 2 caption', 'text', 'Name it, find it on the neck, play it, and tap the rhythm in time.' ),
		'read_soon_shot3_title' => array( 'Read page', 'Coming Soon: picture 3 label', 'text', 'The Map' ),
		'read_soon_shot3_caption' => array( 'Read page', 'Coming Soon: picture 3 caption', 'text', 'Every note on your neck, and how quickly you know it.' ),
		'read_intro' => array( 'Read page', 'Opening text', 'textarea', 'Reading music is three connections, made so often that they become immediate: the dot on the page to its name, the dot to its place on your neck, and the symbol to how it sounds and where it falls in time. TAB gives you the second for free, which is why so many good players can play far better than they can read.' . "\n\n" . 'Read works on all three. The Guide is the course, from the bass clef to sight reading, every example written out and playable. The Dojo is where the connections get made, in both directions, with every answer timed.' ),
		'read_how_sub' => array( 'Read page', 'How it works: subheading', 'text', 'How it works' ),
		'read_how_title' => array( 'Read page', 'How it works: heading', 'text', 'A guide, a dojo, and a map of your neck' ),
		'read_how_body' => array( 'Read page', 'How it works: text', 'textarea', 'Start at the beginning of the Guide, or go straight to the Dojo and let Today choose. Right is the first goal; right and quick is the real one. A note counts as immediate when you have it right first time, four times in five, on two different days, and quickly.' ),
		'read_points' => array( 'Read page', 'How it works: the parts (one per line; the name goes before a colon)', 'points', 'The Guide: the bass clef, ledger lines, the open strings and first position; every rhythm from semibreves to triplets; repeats and roadmaps; sharps, flats and keys; the treble clef and the piano score; intervals, chords and sight reading.' . "\n" . 'Notes and the neck: name a note on the stave, write one from the neck, find it on your bass, and play a line at your own pace (tap the neck, or play it into the microphone).' . "\n" . 'Rhythm: tap a rhythm in time over a click and see every note marked on time, early, late or missed, or pick out a bar you hear. Twelve levels.' . "\n" . 'Sight reading: short pieces in twelve levels and bass lines with the band, with time to look first and a bar of clicks, then straight through without stopping.' . "\n" . 'Keys, intervals and chords: read them on the stave, then see them on the neck.' . "\n" . 'The Map: every note on your neck, and how well you know it. Most of us have a patch that is slow. The Map finds yours.' ),
		'read_access_sub' => array( 'Read page', 'Members: subheading', 'text', 'If you have sessions with me' ),
		'read_access_title' => array( 'Read page', 'Members: heading', 'text', 'Your record, kept with your account' ),
		'read_access_body' => array( 'Read page', 'Members: text', 'textarea', 'Here your record is kept in this browser. In the members&rsquo; app it is kept with your account, so it follows you from your phone to your laptop, and a sitting can go in your practice diary, where it counts towards your habit.' . "\n\n" . 'It&rsquo;s yours alone unless you switch on sharing. If you do, I can see which notes are slow for you and what you miss, and we can go straight to it in sessions.' ),
		'read_cta_heading' => array( 'Read page', 'Call-to-action: heading', 'text', 'Want to work on your reading together?' ),
		'read_cta_body' => array( 'Read page', 'Call-to-action: text', 'textarea', 'Get in touch about lessons and we&rsquo;ll arrange an introductory session.' ),
		'read_cta_label' => array( 'Read page', 'Call-to-action: button label', 'text', 'Get in touch' ),
		'read_strip_text' => array( 'Read page', 'Full screen: line in the top strip', 'text', 'Read: reading notation for bass' ),
		'read_strip_book' => array( 'Read page', 'Full screen: button in the top strip', 'text', 'Book' ),

		/* ---- Free tools: the metronome, drone and tuner on pages of their own (3.15.0) ---- */
		'tool_metronome_h1' => array( 'Free tools pages', 'Metronome: page heading', 'text', 'A free online metronome that drops out, so your own time takes over' ),
		'tool_metronome_note' => array( 'Free tools pages', 'Metronome: small print under the tool', 'text', 'Free to use, with no account. Sound only plays when you tap, and what you set is remembered in this browser.' ),
		'tool_metronome_intro' => array( 'Free tools pages', 'Metronome: opening text', 'textarea', 'Most metronomes keep time for you. This one is built to hand the job back. It can leave beats out at random, fade itself away over a number of bars, or sit on 2 and 4, so you find out how steady your own time is.' . "\n\n" . 'It&rsquo;s the metronome from the Shed, the set of practice tools my pupils get in the member portal. It&rsquo;s free to use here.' ),
		'tool_metronome_how_sub' => array( 'Free tools pages', 'Metronome: what it does, subheading', 'text', 'What it does' ),
		'tool_metronome_how_title' => array( 'Free tools pages', 'Metronome: what it does, heading', 'text', 'A click that does less, so you do more' ),
		'tool_metronome_how_body' => array( 'Free tools pages', 'Metronome: what it does, text', 'textarea', 'A click on every beat tells you where the time is. Take some of those clicks away and you find out whether you knew. These are the ways it can step back, and the rest of what it does.' ),
		'tool_metronome_points' => array( 'Free tools pages', 'Metronome: what it does (one per line; the name goes before a colon)', 'points', 'Random mute: choose what percentage of beats are skipped, and it leaves them out at random. Keep beat one sounding if you like, or have it mute whole bars.' . "\n" . 'Gradual mute: every beat sounds at first, then more and more of them drop out, over as many bars as you choose.' . "\n" . 'Click up: set a goal, start at half of it, and step the tempo up when the last one was clean. Or let it climb by itself every few bars.' . "\n" . 'Thin the click: one tempo, and the click walks away a stage at a time. Every beat, then 1 and 3, then beat one, then beat one every 2, 4, 8 and 16 bars.' . "\n" . 'Guided speed work: three methods from Molly Gebrian&rsquo;s book Learn Faster, Perform Better. The metronome tells you which part of the passage to play and at what tempo, counts you in, and stops when you land.' . "\n" . 'Blind bars: the click goes silent for a few bars and you tap on through. When it comes back you&rsquo;re told whether you held the tempo, rushed or dragged.' . "\n" . 'Count it off: no click at all. A tempo is named, you tap four beats as if counting a band in, and you see how close you were.' . "\n" . 'Where the click falls: every beat, 2 and 4, beat one only, or pushed onto the &ldquo;and&rdquo;. Or bars of click followed by bars of silence.' . "\n" . 'A house drummer: play along with a drummer instead of a bare click, in a range of feels and kits. A muted beat mutes the drummer too.' . "\n" . 'Time and sound: simple, compound and odd time signatures, subdivisions and swing, with recorded woodblock, claves, cowbell, cross stick and hi hat.' . "\n" . 'Setups and set lists: save what you&rsquo;ve set under a name and bring it back with one tap. Save one for each song and step through them as a set list. A setup can be sent to someone as a link.' . "\n" . 'Away from the bass: put the click on and walk to it. Time is easier to feel with the whole body than with two fingers.' ),
		'tool_drone_h1' => array( 'Free tools pages', 'Drone: page heading', 'text', 'A free tanpura drone on any note, for intonation and scales' ),
		'tool_drone_note' => array( 'Free tools pages', 'Drone: small print under the tool', 'text', 'Free to use, with no account. It plays until you stop it.' ),
		'tool_drone_intro' => array( 'Free tools pages', 'Drone: opening text', 'textarea', 'A drone gives you a home to play against. Put one on, play a scale slowly over it, and you hear how each note sits: which ones feel settled, which ones want to move, and whether you&rsquo;re in tune.' . "\n\n" . 'It&rsquo;s the drone from the Shed, the set of practice tools my pupils get in the member portal. It&rsquo;s free to use here.' ),
		'tool_drone_how_sub' => array( 'Free tools pages', 'Drone: what it does, subheading', 'text', 'What it does' ),
		'tool_drone_how_title' => array( 'Free tools pages', 'Drone: what it does, heading', 'text', 'A home to play against' ),
		'tool_drone_how_body' => array( 'Free tools pages', 'Drone: what it does, text', 'textarea', 'It&rsquo;s at its most useful on fretless and upright bass, where the intonation is yours to find. It&rsquo;s just as good on a fretted bass for hearing what each degree of a scale sounds like against home.' ),
		'tool_drone_points' => array( 'Free tools pages', 'Drone: what it does (one per line; the name goes before a colon)', 'points', 'Any of the twelve notes: laid out round the circle of fifths, so the nearest tone centres are next door.' . "\n" . 'A tanpura&rsquo;s four strings: choose whether the first string is the fifth, the fourth, the seventh, or home on its own.' . "\n" . 'Three registers: low, mid or high, to sit under or over where you&rsquo;re playing.' . "\n" . 'Just or equal intonation: pure intervals, as a tanpura is tuned, or the same tuning as a piano.' . "\n" . 'Your reference pitch: A = 440, or anywhere from 438 to 444.' ),
		'tool_tuner_h1' => array( 'Free tools pages', 'Tuner: page heading', 'text', 'A free bass tuner that reads down to a low B' ),
		'tool_tuner_note' => array( 'Free tools pages', 'Tuner: small print under the tool', 'text', 'Free to use, with no account. It listens only while it&rsquo;s on, and nothing is recorded or sent anywhere.' ),
		'tool_tuner_intro' => array( 'Free tools pages', 'Tuner: opening text', 'textarea', 'A chromatic tuner made for the bass. It reads right down to the low B of a five string, and shows you the note two ways: a needle for getting close, and a strobe for getting it exact.' . "\n\n" . 'It&rsquo;s the tuner from the Shed, the set of practice tools my pupils get in the member portal. It&rsquo;s free to use here. Your browser will ask to use the microphone the first time.' ),
		'tool_tuner_how_sub' => array( 'Free tools pages', 'Tuner: what it does, subheading', 'text', 'What it does' ),
		'tool_tuner_how_title' => array( 'Free tools pages', 'Tuner: what it does, heading', 'text', 'Made for low strings' ),
		'tool_tuner_how_body' => array( 'Free tools pages', 'Tuner: what it does, text', 'textarea', 'Pluck one string gently over the neck and let it ring. The note shows as soon as it settles.' ),
		'tool_tuner_points' => array( 'Free tools pages', 'Tuner: what it does (one per line; the name goes before a colon)', 'points', 'Chromatic: it names whatever note you play, and shows how far sharp or flat you are.' . "\n" . 'Needle and strobe: the strobe drifts right when you&rsquo;re sharp, left when you&rsquo;re flat, and stands still when you&rsquo;re in tune.' . "\n" . 'Four, five and six strings: B, E, A, D, G and C are each marked off as you tune them.' . "\n" . 'Your reference pitch: A = 440, or anywhere from 438 to 444. The drone uses the same one, so the two always agree.' . "\n" . 'Private: it listens only while it&rsquo;s on, and the sound never leaves your phone.' ),
		'tool_more_sub' => array( 'Free tools pages', 'More tools: subheading', 'text', 'More tools' ),
		'tool_more_title' => array( 'Free tools pages', 'More tools: heading', 'text', 'There&rsquo;s more in the Shed' ),
		'tool_more_body' => array( 'Free tools pages', 'More tools: text', 'textarea', 'The metronome, the drone and the tuner are free for anyone to use. They come from the Shed, the practice space in the member portal that everyone who has sessions with me gets. In there they sit alongside a practice diary, a habit tracker, a tempo tracker, a recorder and a shelf of backing tracks, and it all works as an app on your phone.' ),
		'tool_card_free' => array( 'Free tools pages', 'More tools: the line at the foot of each free tool', 'text', 'Free to use' ),
		'tool_metronome_card' => array( 'Free tools pages', 'More tools: the metronome in a line', 'text', 'A click that drops out, so your own time takes over.' ),
		'tool_drone_card' => array( 'Free tools pages', 'More tools: the drone in a line', 'text', 'A tanpura on any note, for intonation and scales.' ),
		'tool_tuner_card' => array( 'Free tools pages', 'More tools: the tuner in a line', 'text', 'A chromatic tuner that reads down to a low B.' ),
		'tool_harmonic_card' => array( 'Free tools pages', 'More tools: Harmonic Elements in a line (shown once it is launched)', 'text', 'Chord changes: a guide to read and play, and a dojo for your ear.' ),
		'tool_ear_card' => array( 'Free tools pages', 'More tools: Ear Training in a line (shown once it is launched)', 'text', 'Intervals, chords, scales, inversions, lines and progressions, against a tone centre.' ),
		'tool_read_card' => array( 'Free tools pages', 'More tools: Read in a line (shown once it is launched)', 'text', 'Reading notation for bass: from the page to your hands, with every answer timed.' ),
		'tool_shed_card_title' => array( 'Free tools pages', 'More tools: the Shed, name', 'text', 'The Shed' ),
		'tool_shed_card' => array( 'Free tools pages', 'More tools: the Shed in a line', 'text', 'The whole set of practice tools, for pupils. Have a go with the demo.' ),
		'tool_shed_card_go' => array( 'Free tools pages', 'More tools: the line at the foot of the Shed', 'text', 'Try the Shed' ),

		/* ---- FAQ page (3.7.0) ----
		 * Each group's text is a run of questions (Heading 3) and answers
		 * (paragraphs). The same text feeds the FAQ structured data. */
		'faq_page_h1' => array( 'FAQ page', 'Page heading', 'text', 'Questions before you start' ),
		'faq_intro'   => array( 'FAQ page', 'Introduction', 'text', 'What people usually ask before booking bass sessions in Leith, from first notes to finding the studio. If your question isn&rsquo;t here, <a href="/contact/">get in touch</a>.' ),

		'faq_group1_sub'   => array( 'FAQ page', 'Group 1: subheading (also the jump link)', 'text', 'Getting started' ),
		'faq_group1_title' => array( 'FAQ page', 'Group 1: heading', 'text', 'Your first session' ),
		'faq_group1_body'  => array( 'FAQ page', 'Group 1: questions (Heading 3) and answers', 'textarea', '<h3>What happens after I get in touch?</h3>' . "\n" . 'I&rsquo;ll reply within a couple of days to arrange your introductory session. It&rsquo;s thirty minutes and costs &pound;20, which you can pay when we book it, or afterwards by invoice and bank transfer.' . "\n\n" . 'If we&rsquo;re getting on well, the half hour often runs on to a full hour and becomes your first proper session, and plenty of people book a block of ten from there. After your first session you&rsquo;ll get an invitation to <a href="/portal/">the Portal</a>.' . "\n\n" . '<h3>I&rsquo;ve never played anything. Is that all right?</h3>' . "\n" . 'Yes. Plenty of people I work with started from their first note. We&rsquo;ll set a clear plan together in the first session, and I&rsquo;ll lead the way through it: what to practise, in what order, and why.' . "\n\n" . '<h3>I&rsquo;ve been playing for years. Is this for me?</h3>' . "\n" . 'Very much so. I really enjoy working with experienced bassists, whether you&rsquo;re gigging, recording, coming back after time away, or simply after a coach&rsquo;s ear. We&rsquo;ll start from where your playing is now and work on whatever will move it forward.' . "\n\n" . '<h3>Do I need to read music?</h3>' . "\n" . 'No. We&rsquo;ll use whatever gets you playing, whether that&rsquo;s TAB, notation, chord charts or your ears. Reading comes in when it&rsquo;s useful to you, and plenty of people find they enjoy it.' . "\n\n" . '<h3>Do I need my own bass?</h3>' . "\n" . 'Not to start. The studio has house basses you can play in your sessions, so you can find out what suits you before buying one. They stay at the studio, so they aren&rsquo;t available to take home. If you&rsquo;re thinking of buying, bring it up in your first session and we&rsquo;ll talk it through.' . "\n\n" . '<h3>What should I bring?</h3>' . "\n" . 'Your bass if you have one, and any music you&rsquo;d like to learn. Leads, amps, headphones, stands and a metronome are all here. A notebook is optional, since your notes arrive in the Portal after each session.' ),

		'faq_group2_sub'   => array( 'FAQ page', 'Group 2: subheading (also the jump link)', 'text', 'Sessions and the Portal' ),
		'faq_group2_title' => array( 'FAQ page', 'Group 2: heading', 'text', 'Once we&rsquo;re underway' ),
		'faq_group2_body'  => array( 'FAQ page', 'Group 2: questions (Heading 3) and answers', 'textarea', '<h3>What is the Portal?</h3>' . "\n" . 'Your own private space on this site. After each session I write up what we covered and This week&rsquo;s objectives, and attach any worksheets or backing tracks. Your bookings are there too, along with the Shed: practice tools from a diary and tempo tracker to a drone, and a shelf of backing tracks. It&rsquo;s included with your sessions. <a href="/portal/">See how the Portal works</a>.' . "\n\n" . '<h3>How do the blocks of ten hours work?</h3>' . "\n" . 'Ten hours for &pound;360 (a &pound;40 saving), diarised up front and valid for four months. The Portal shows how much time you have left, what&rsquo;s booked, and when the block ends.' . "\n\n" . '<h3>What if I need to cancel or move a session?</h3>' . "\n" . 'Confirmed sessions can move by mutual agreement at any time. With 48 hours&rsquo; notice there&rsquo;s no charge; with less notice the fee is usually forfeited, though I use discretion when life happens. You can ask to move a session straight from the Portal.' ),

		'faq_group3_sub'   => array( 'FAQ page', 'Group 3: subheading (also the jump link)', 'text', 'Young people and parents' ),
		'faq_group3_title' => array( 'FAQ page', 'Group 3: heading', 'text', 'Younger bassists' ),
		'faq_group3_body'  => array( 'FAQ page', 'Group 3: questions (Heading 3) and answers', 'textarea', '<h3>Do you teach young people?</h3>' . "\n" . 'Yes, of all ages. With younger bassists, listening to and enjoying music can matter as much as understanding it or playing it, especially to begin with.' . "\n\n" . 'Learning to appreciate music, learning how to learn a skill, and getting into the cycle of input, discipline, output and fun can be more important at first than the bass itself.' . "\n\n" . '<h3>Will I hear how sessions are going?</h3>' . "\n" . 'For anyone under 16, a parent or guardian can get a copy of every email the Portal sends: notes, reminders and booking changes. It&rsquo;s up to you whether you&rsquo;d like them.' . "\n\n" . '<h3>Can parents stay during sessions?</h3>' . "\n" . 'You&rsquo;re very welcome to. The studio is comfortable, and there&rsquo;s a caf&eacute; upstairs if you&rsquo;d rather catch up on some work. Or you can simply listen in.' ),

		'faq_group4_sub'   => array( 'FAQ page', 'Group 4: subheading (also the jump link)', 'text', 'Finding the studio' ),
		'faq_group4_title' => array( 'FAQ page', 'Group 4: heading', 'text', 'Getting here' ),
		'faq_group4_body'  => array( 'FAQ page', 'Group 4: questions (Heading 3) and answers', 'textarea', '<h3>Where is the studio, and how do I get in?</h3>' . "\n" . 'Sessions are at Lost Oscillation, 125 Great Junction Street, Leith, Edinburgh EH6 5JB. There&rsquo;s always someone working in the caf&eacute; or the rehearsal rooms to let you into the building, and I&rsquo;ll meet you inside.' . "\n\n" . '<h3>Is the building accessible?</h3>' . "\n" . 'Yes. Lost Oscillation is part of Music Base, a community of music businesses in a converted bonded warehouse, and the building is accessible. If you have any access needs, mention them when you get in touch and we&rsquo;ll make sure the session suits you.' ),

		'faq_cta_heading'  => array( 'FAQ page', 'Call-to-action: heading', 'text', 'Ready when you are.' ),
		'faq_cta_body'     => array( 'FAQ page', 'Call-to-action: text', 'textarea', 'Half an hour to meet, talk about where you&rsquo;d like to get to, and see how we work together. It&rsquo;s &pound;20, and we&rsquo;ll arrange a time as soon as you get in touch.' ),
		'faq_cta_label'    => array( 'FAQ page', 'Call-to-action: button label', 'text', 'Book an introductory session (&pound;20)' ),
		'faq_prices_label' => array( 'FAQ page', 'Call-to-action: second button label', 'text', 'See prices' ),

		/* ---- Spaces page ---- */
		'spaces_page_h1'       => array( 'Spaces page', 'Page heading', 'text', 'Where lessons happen: a professional recording studio in Leith' ),
		'spaces_opening'       => array( 'Spaces page', 'Opening text', 'textarea', 'Lessons happen at Lost Oscillation, a working recording studio on Great Junction Street. It is a proper professional room, and a session has the run of it.' ),
		'spaces_studio_title'  => array( 'Spaces page', 'Studio: heading', 'text', 'The Studio' ),
		'spaces_studio_sub'    => array( 'Spaces page', 'Studio: subheading', 'text', 'Lost Oscillation &middot; 125 Great Junction Street' ),
		'spaces_studio_text'   => array( 'Spaces page', 'Studio: text', 'textarea', 'Sessions at <a href="https://lostosc.com">Lost Oscillation</a>, the recording studio I co-founded, put a full professional environment at your disposal: a baby grand piano, a drum kit, a complete recording setup and a Dolby Atmos listening room.' . "\n\n" . 'And some rather special bass gear. A handmade MacIntyre six-string, Fender Precisions and Jazzes, signature and fretless options, and a range of DI, amp and modelling chains. Bring your own instrument or play a house bass. If you want to hear yourself properly recorded, we can do that too.' ),
		'spaces_cta_heading'   => array( 'Spaces page', 'Call-to-action: heading', 'text', 'Come and see it' ),
		'spaces_cta_body'      => array( 'Spaces page', 'Call-to-action: text', 'textarea', 'Have a look around before you commit to anything. Tell me what suits you and we&rsquo;ll take it from there.' ),
		'spaces_cta_label'     => array( 'Spaces page', 'Call-to-action: button label', 'text', 'Arrange a visit' ),

		/* ---- Prices page ---- */
		'prices_page_h1'       => array( 'Prices page', 'Page heading', 'text', 'Bass lesson prices and how booking works' ),
		'prices_start_heading' => array( 'Prices page', 'Getting started: heading', 'text', 'Getting started' ),
		'prices_start_body'    => array( 'Prices page', 'Getting started: text', 'textarea', 'New players begin with a thirty-minute introductory session: a chance to meet, get a sense of where you are on your journey, and see whether we&rsquo;re a good fit. Get in touch about booking lessons and we&rsquo;ll arrange a time.' ),
		'prices_card1_title'   => array( 'Prices page', 'Card 1: title', 'text', 'Introductory session' ),
		'prices_card1_price'   => array( 'Prices page', 'Card 1: price line', 'text', '&pound;20 <span>30 minutes</span>' ),
		'prices_card1_body'    => array( 'Prices page', 'Card 1: text', 'textarea', 'A short first session at the standard rate. Meet, talk about your goals, play a little, and see how it feels.' ),
		'prices_card2_title'   => array( 'Prices page', 'Card 2: title', 'text', 'Single session' ),
		'prices_card2_price'   => array( 'Prices page', 'Card 2: price line', 'text', '&pound;40 <span>per hour</span>' ),
		'prices_card2_body'    => array( 'Prices page', 'Card 2: text', 'textarea', 'Standalone or recurring. An hour is the default and I recommend at least one a week. Shorter and longer sessions are available on request, charged pro rata.' ),
		'prices_card3_title'   => array( 'Prices page', 'Card 3: title', 'text', 'Ten-hour block' ),
		'prices_card3_price'   => array( 'Prices page', 'Card 3: price line', 'text', '&pound;360 <span>save &pound;40</span>' ),
		'prices_card3_body'    => array( 'Prices page', 'Card 3: text', 'textarea', 'Ten hours of sessions, diarised up front and valid for four months.' ),
		'prices_enquire_v2'    => array( 'Prices page', 'Enquiry line under the cards', 'textarea', 'I&rsquo;m currently opening a small number of new teaching slots. To enquire about a session or a regular time, <a href="/contact/">send a message</a>. Questions first? The <a href="/faq/">FAQ</a> covers the common ones.' ),

		'prices_booking_title' => array( 'Prices page', 'Booking section: heading', 'text', 'How booking works' ),
		'prices_booking_sub'   => array( 'Prices page', 'Booking section: subheading', 'text', 'The practical bits, in plain English' ),
		'prices_points_a'      => array( 'Prices page', 'Booking points, left column (one per line; text before a colon appears bold)', 'points', 'An hour is the default: shorter and longer sessions can be arranged on request, charged pro rata.' . "\n" . 'Booking is by the contact form: we&rsquo;ll find times that suit you, as a one-off or a weekly slot.' . "\n" . 'Payment in advance confirms your session: unpaid sessions aren&rsquo;t held, so the time may be taken by other bookings. The introductory session can be paid on the day or by invoice afterwards.' . "\n" . 'Everything goes in the calendar: bookings sync with my Google Calendar, and the portal gives you a calendar link that keeps your phone up to date, so we&rsquo;re always working from the same times.' ),
		'prices_points_b'      => array( 'Prices page', 'Booking points, right column (one per line; text before a colon appears bold)', 'points', 'Confirmed sessions can move: by mutual agreement, at any time.' . "\n" . '48 hours&rsquo; notice reschedules at no cost: shorter notice usually means the fee is forfeited, though I apply discretion when life happens.' . "\n" . 'Notes and your member portal are included: after each session you get a written summary, This week&rsquo;s objectives and any materials, all kept in <a href="/portal/">your own login</a> with your bookings and the Shed, your practice tools.' ),
		'prices_cta_heading'   => array( 'Prices page', 'Call-to-action: heading', 'text', 'Ready when you are' ),
		'prices_cta_body'      => array( 'Prices page', 'Call-to-action: text', 'text', 'Get in touch about booking lessons and we&rsquo;ll arrange an introductory session.' ),
		'prices_cta_label'     => array( 'Prices page', 'Call-to-action: button label', 'text', 'Book an introductory session' ),

		/* ---- Contact page ---- */
		'contact_page_h1_v3' => array( 'Contact page', 'Page heading', 'text', 'Enquire about bass lessons in Leith' ),
		'contact_heading' => array( 'Contact page', 'Heading', 'text', 'Tell me where you are with the bass.' ),
		'contact_body'    => array( 'Contact page', 'Text', 'textarea', 'Complete beginner, returning after twenty years off, or already gigging and after a coach&rsquo;s ear. A sentence or two is plenty. I&rsquo;ll reply within a couple of days to arrange an introductory session (thirty minutes, &pound;20).' ),
		'contact_aside'   => array( 'Contact page', 'Side column: heading', 'text', 'Elsewhere' ),

		/* ---- Contact & links ---- */
		'studio_address'  => array( 'Contact & links', 'Studio street address', 'text', '125 Great Junction St, Leith' ),
		'studio_postcode' => array( 'Contact & links', 'Studio postcode', 'text', 'EH6 5JB' ),
		'instagram'       => array( 'Contact & links', 'Instagram URL', 'url', 'https://www.instagram.com/jackaud.io' ),
		'lostosc'         => array( 'Contact & links', 'Lost Oscillation URL', 'url', 'https://lostosc.com' ),
		'jackaudio'       => array( 'Contact & links', 'jackaud.io URL', 'url', 'https://jackaud.io' ),
		'slowkarma'       => array( 'Contact & links', 'Slow Karma URL', 'url', 'https://slowkarma.bandcamp.com' ),
		'google_business_profile' => array( 'Contact & links', 'Google Business Profile URL (optional)', 'url', '' ),
		'business_phone'   => array( 'Contact & links', 'Public telephone number (optional)', 'text', '' ),
		'footer_line'     => array( 'Contact & links', 'Footer strapline', 'text', 'One-to-one bass sessions with Jack Elliot.<br>Leith, Edinburgh.' ),
		'contact_email'   => array( 'Contact & links', 'Contact-form destination email', 'email', LEITHBASS_EMAIL ),

		/* ---- Notes ---- */
		'notes_archive_h1'    => array( 'Notes', 'Archive heading', 'text', 'Notes on bass, musicianship and practice' ),
		'notes_archive_intro' => array( 'Notes', 'Archive introduction', 'textarea', 'Writing about learning the bass, practising well, musicianship and making progress that lasts.' ),
		'notes_service_kicker_v3'  => array( 'Notes', 'Article service link: label', 'text', 'Put it into practice' ),
		'notes_service_heading_v3' => array( 'Notes', 'Article service link: heading', 'text', 'Bring the ideas into the room.' ),
		'notes_service_body_v3'    => array( 'Notes', 'Article service link: text', 'text', 'Explore how sessions work, see prices and booking, or get in touch about lessons.' ),
		'notes_service_cta_label'  => array( 'Notes', 'Article service link: button label', 'text', 'Enquire about lessons' ),

		/* ---- Search previews ---- */
		'seo_home_title' => array( 'SEO', 'Homepage: search title', 'text', 'Bass Lessons in Leith, Edinburgh | The Leith Bass Space' ),
		'seo_home_desc'  => array( 'SEO', 'Homepage: description', 'plain_textarea', 'One-to-one bass lessons in Leith, Edinburgh with Jack Elliot. All ages and abilities, taught in a professional recording studio, with introductory sessions by arrangement.' ),
		'seo_approach_title_v3' => array( 'SEO', 'Approach: search title', 'text', 'How Bass Lessons Work | The Leith Bass Space' ),
		'seo_approach_desc'  => array( 'SEO', 'Approach: description', 'plain_textarea', 'Learning music by way of the bass: ears, reading, harmony, groove and confidence. Sessions tailored to your goals, with a written summary each time.' ),
		'seo_portal_title' => array( 'SEO', 'The Portal: search title', 'text', 'The Member Portal: Session Notes and Practice Tools | The Leith Bass Space' ),
		'seo_portal_desc'  => array( 'SEO', 'The Portal: description', 'plain_textarea', 'Every bassist working with Jack gets a private member portal: written notes after each session, worksheets and backing tracks, bookings, and the Shed: practice tools including a practice diary, habit tracker, metronome, tuner, drone and a shelf of backing tracks.' ),
		'seo_shed_title'   => array( 'SEO', 'Shed tools: search title', 'text', 'Shed Tools: Practice Tools for Bassists | The Leith Bass Space' ),
		'seo_shed_desc'    => array( 'SEO', 'Shed tools: description', 'plain_textarea', 'Try the Shed: the practice tools in the Leith Bass Space member portal. A metronome that lets your own time take over, a tanpura drone, a tuner, a practice diary with a journal, and a habit tracker. Included with sessions with Jack.' ),
		'seo_harmonic_title' => array( 'SEO', 'Harmonic Elements: search title', 'text', 'Harmonic Elements: A Bass Course in Hearing Chord Changes | The Leith Bass Space' ),
		'seo_harmonic_desc'  => array( 'SEO', 'Harmonic Elements: description', 'plain_textarea', 'A practical bass course in note choice and harmonic recognition. Read about each chord movement and play along with its loop, then train your ear: find home on your bass and name the progression.' ),
		'seo_ear_title' => array( 'SEO', 'Ear Training: search title', 'text', 'Ear Training for Bass Players | The Leith Bass Space' ),
		'seo_ear_desc' => array( 'SEO', 'Ear Training: description', 'plain_textarea', 'Ear training for bass players that never loses the tone centre. Intervals, chord flavours, scales, inversions, lines and progressions, answered by tapping, on a fretboard or on your own bass, and a room to jam over the home chords.' ),
		'seo_read_title' => array( 'SEO', 'Read: search title', 'text', 'Read: Reading Notation for Bass Players | The Leith Bass Space' ),
		'seo_read_desc' => array( 'SEO', 'Read: description', 'plain_textarea', 'Learn to read music on the bass: the bass clef, rhythm, keys and sight reading, with a trainer that times every answer and maps how well you know each note on your neck.' ),
		'seo_tool_metronome_title' => array( 'SEO', 'Metronome: search title', 'text', 'Free Online Metronome with Random Mute and Click Up | The Leith Bass Space' ),
		'seo_tool_metronome_desc' => array( 'SEO', 'Metronome: description', 'plain_textarea', 'A free online metronome that drops beats so your own time takes over: random mute, gradual mute, Click up to build speed, and a house drummer. No sign up.' ),
		'seo_tool_drone_title' => array( 'SEO', 'Drone: search title', 'text', 'Free Online Drone: A Tanpura on Any Note | The Leith Bass Space' ),
		'seo_tool_drone_desc' => array( 'SEO', 'Drone: description', 'plain_textarea', 'A free tanpura drone on any of the twelve notes, in just or equal intonation. For intonation, scales and hearing how each note sits against home.' ),
		'seo_tool_tuner_title' => array( 'SEO', 'Tuner: search title', 'text', 'Free Online Bass Tuner, Down to a Low B | The Leith Bass Space' ),
		'seo_tool_tuner_desc' => array( 'SEO', 'Tuner: description', 'plain_textarea', 'A free chromatic tuner made for bass, reading down to a low B, with a needle and a strobe. It listens only while it is on, and nothing is recorded.' ),
		'seo_faq_title'    => array( 'SEO', 'FAQ: search title', 'text', 'Bass Lessons in Leith: Questions and Answers | The Leith Bass Space' ),
		'seo_faq_desc'     => array( 'SEO', 'FAQ: description', 'plain_textarea', 'Answers to common questions about bass lessons in Leith, Edinburgh: introductory sessions, beginners and experienced players, young people, what to bring and finding the studio.' ),
		'seo_spaces_title' => array( 'SEO', 'Spaces: search title', 'text', 'Where Bass Lessons Happen in Leith | The Leith Bass Space' ),
		'seo_spaces_desc'  => array( 'SEO', 'Spaces: description', 'plain_textarea', 'Bass lessons at Lost Oscillation, a professional recording studio on Great Junction Street in Leith, Edinburgh. House basses, full backline and a Dolby Atmos room.' ),
		'seo_prices_title' => array( 'SEO', 'Prices: search title', 'text', 'Prices &amp; Booking for Bass Lessons | The Leith Bass Space' ),
		'seo_prices_desc_v3'  => array( 'SEO', 'Prices: description', 'plain_textarea', 'Bass sessions at £40 per hour, ten-hour blocks at £360 and a £20 thirty-minute introductory session. Shorter and longer sessions on request. Booking is through the contact form.' ),
		'seo_contact_title_v3' => array( 'SEO', 'Contact: search title', 'text', 'Enquire About Bass Lessons | The Leith Bass Space' ),
		'seo_contact_desc_v3'  => array( 'SEO', 'Contact: description', 'plain_textarea', 'Enquire about one-to-one bass lessons in Leith, Edinburgh. Get in touch and we’ll arrange an introductory session. All ages and levels are welcome.' ),
		'seo_privacy_title' => array( 'SEO', 'Privacy: search title', 'text', 'Privacy Notice | The Leith Bass Space' ),
		'seo_privacy_desc'  => array( 'SEO', 'Privacy: description', 'plain_textarea', 'How The Leith Bass Space handles personal information submitted through the website contact form.' ),
		'seo_notes_title'   => array( 'SEO', 'Notes: search title', 'text', 'Bass Practice &amp; Musicianship Notes | The Leith Bass Space' ),
		'seo_notes_desc'    => array( 'SEO', 'Notes: description', 'plain_textarea', 'Articles by Jack Elliot on bass playing, effective practice, musicianship and learning music.' ),

		/* ---- Technical ---- */
		'google_site_verification' => array( 'Technical', 'Google Search Console verification code', 'text', '' ),
	);
	return $r;
}

/**
 * Image slots that can be replaced from the WordPress Media Library.
 * The asset slug keeps the bundled image as a safe fallback.
 * Named values keep the editor and rendering code self-documenting.
 */
function leithbass_image_registry() {
	return array(
		'hero-home'      => array( 'section' => 'Homepage', 'label' => 'Hero photograph', 'width' => 1280, 'parallax' => false, 'focal' => 50, 'motion' => 0, 'static_focal' => true ),
		'home-studio'    => array( 'section' => 'Homepage', 'label' => 'Studio proof photograph', 'width' => 1280, 'parallax' => false, 'focal' => 50, 'motion' => 0, 'static_focal' => true ),
		'band-lesson'    => array( 'section' => 'Homepage', 'label' => 'Closing image band (also used on The Portal)', 'width' => 1200, 'parallax' => true, 'focal' => 50, 'motion' => 70, 'static_focal' => false ),
		'knock-approach' => array( 'section' => 'Approach page', 'label' => 'Photograph inside APPROACH headings', 'width' => 1280, 'parallax' => true, 'focal' => 50, 'motion' => 46, 'static_focal' => false ),
		'band-basses'    => array( 'section' => 'Approach page', 'label' => 'Bass-wall band (also used on Contact)', 'width' => 1200, 'parallax' => true, 'focal' => 50, 'motion' => 70, 'static_focal' => false ),
		'band-corridor'  => array( 'section' => 'Approach page', 'label' => 'Studio-corridor band (also used on Prices and FAQ)', 'width' => 1200, 'parallax' => true, 'focal' => 50, 'motion' => 70, 'static_focal' => false ),
		'knock-portal'   => array( 'section' => 'Portal page', 'label' => 'Photograph inside PORTAL heading', 'width' => 1280, 'parallax' => true, 'focal' => 50, 'motion' => 46, 'static_focal' => false ),
		'knock-shed'     => array( 'section' => 'Shed tools page', 'label' => 'Photograph inside SHED heading', 'width' => 1280, 'parallax' => true, 'focal' => 50, 'motion' => 46, 'static_focal' => false ),
		'knock-elements' => array( 'section' => 'Harmonic Elements page', 'label' => 'Photograph inside ELEMENTS heading', 'width' => 1280, 'parallax' => true, 'focal' => 50, 'motion' => 46, 'static_focal' => false ),
		'elements-shot-1' => array( 'section' => 'Harmonic Elements page', 'label' => 'Coming Soon: picture 1 (the Guide)', 'width' => 780, 'parallax' => false, 'focal' => 50, 'motion' => 0, 'static_focal' => false ),
		'elements-shot-2' => array( 'section' => 'Harmonic Elements page', 'label' => 'Coming Soon: picture 2 (the Dojo)', 'width' => 780, 'parallax' => false, 'focal' => 50, 'motion' => 0, 'static_focal' => false ),
		'elements-shot-3' => array( 'section' => 'Harmonic Elements page', 'label' => 'Coming Soon: picture 3 (the answer)', 'width' => 780, 'parallax' => false, 'focal' => 50, 'motion' => 0, 'static_focal' => false ),
		'knock-ear'      => array( 'section' => 'Ear Training page', 'label' => 'Photograph inside EAR TRAINING heading', 'width' => 1280, 'parallax' => true, 'focal' => 50, 'motion' => 46, 'static_focal' => false ),
		'ear-shot-1'     => array( 'section' => 'Ear Training page', 'label' => 'Coming Soon: picture 1 (the question)', 'width' => 780, 'parallax' => false, 'focal' => 50, 'motion' => 0, 'static_focal' => false ),
		'ear-shot-2'     => array( 'section' => 'Ear Training page', 'label' => 'Coming Soon: picture 2 (your answer)', 'width' => 780, 'parallax' => false, 'focal' => 50, 'motion' => 0, 'static_focal' => false ),
		'ear-shot-3'     => array( 'section' => 'Ear Training page', 'label' => 'Coming Soon: picture 3 (written out)', 'width' => 780, 'parallax' => false, 'focal' => 50, 'motion' => 0, 'static_focal' => false ),
		'knock-read'     => array( 'section' => 'Read page', 'label' => 'Photograph inside READ heading', 'width' => 1280, 'parallax' => true, 'focal' => 50, 'motion' => 46, 'static_focal' => false ),
		'read-shot-1'    => array( 'section' => 'Read page', 'label' => 'Coming Soon: picture 1 (the Guide)', 'width' => 780, 'parallax' => false, 'focal' => 50, 'motion' => 0, 'static_focal' => false ),
		'read-shot-2'    => array( 'section' => 'Read page', 'label' => 'Coming Soon: picture 2 (the Dojo)', 'width' => 780, 'parallax' => false, 'focal' => 50, 'motion' => 0, 'static_focal' => false ),
		'read-shot-3'    => array( 'section' => 'Read page', 'label' => 'Coming Soon: picture 3 (the Map)', 'width' => 780, 'parallax' => false, 'focal' => 50, 'motion' => 0, 'static_focal' => false ),
		'knock-tools'    => array( 'section' => 'Free tools pages', 'label' => 'Photograph inside the METRONOME, DRONE and TUNER headings', 'width' => 1280, 'parallax' => true, 'focal' => 50, 'motion' => 46, 'static_focal' => false ),
		'portal-shot-1'  => array( 'section' => 'Portal page', 'label' => 'Screen 1 (a real screenshot; leave empty to show the drawn example)', 'width' => 0, 'parallax' => false, 'focal' => 50, 'motion' => 0, 'static_focal' => false, 'placeholder' => true ),
		'portal-shot-2'  => array( 'section' => 'Portal page', 'label' => 'Screen 2 (a real screenshot; leave empty to show the drawn example)', 'width' => 0, 'parallax' => false, 'focal' => 50, 'motion' => 0, 'static_focal' => false, 'placeholder' => true ),
		'portal-shot-3'  => array( 'section' => 'Portal page', 'label' => 'Screen 3 (a real screenshot; leave empty to show the drawn example)', 'width' => 0, 'parallax' => false, 'focal' => 50, 'motion' => 0, 'static_focal' => false, 'placeholder' => true ),
		'portal-shot-4'  => array( 'section' => 'Portal page', 'label' => 'Screen 4 (a real screenshot; leave empty to show the drawn example)', 'width' => 0, 'parallax' => false, 'focal' => 50, 'motion' => 0, 'static_focal' => false, 'placeholder' => true ),
		'knock-faq'      => array( 'section' => 'FAQ page', 'label' => 'Photograph inside FAQ heading', 'width' => 1280, 'parallax' => true, 'focal' => 50, 'motion' => 46, 'static_focal' => false ),
		'knock-spaces'   => array( 'section' => 'Spaces page', 'label' => 'Photograph inside SPACES headings', 'width' => 1280, 'parallax' => true, 'focal' => 50, 'motion' => 46, 'static_focal' => false ),
		'band-studio'    => array( 'section' => 'Spaces page', 'label' => 'Studio image band', 'width' => 1200, 'parallax' => true, 'focal' => 50, 'motion' => 70, 'static_focal' => false ),
		'tile-basses'    => array( 'section' => 'Spaces page', 'label' => 'First studio tile', 'width' => 900, 'parallax' => false, 'focal' => 50, 'motion' => 0, 'static_focal' => false ),
		'tile-headstock' => array( 'section' => 'Spaces page', 'label' => 'Second studio tile', 'width' => 900, 'parallax' => false, 'focal' => 50, 'motion' => 0, 'static_focal' => false ),
		'tile-corridor'  => array( 'section' => 'Spaces page', 'label' => 'Third studio tile', 'width' => 900, 'parallax' => false, 'focal' => 50, 'motion' => 0, 'static_focal' => false ),
		'knock-prices'   => array( 'section' => 'Prices page', 'label' => 'Photograph inside PRICES headings', 'width' => 1280, 'parallax' => true, 'focal' => 50, 'motion' => 46, 'static_focal' => false ),
		'knock-contact'  => array( 'section' => 'Contact page', 'label' => 'Photograph inside CONTACT heading', 'width' => 1280, 'parallax' => true, 'focal' => 50, 'motion' => 46, 'static_focal' => false ),
		'knock-notes'    => array( 'section' => 'Notes', 'label' => 'Manuscript inside NOTES heading', 'width' => 1280, 'parallax' => true, 'focal' => 50, 'motion' => 36, 'static_focal' => false ),
		'og-default'     => array( 'section' => 'SEO', 'label' => 'Social sharing image', 'width' => 0, 'parallax' => false, 'focal' => 50, 'motion' => 0, 'static_focal' => false ),
		'og-portal'      => array( 'section' => 'SEO', 'label' => 'Social sharing image for the Portal page', 'width' => 0, 'parallax' => false, 'focal' => 50, 'motion' => 0, 'static_focal' => false ),
	);
}

/** Return the Media Library attachment selected for an image slot. */
function leithbass_image_id( $slug ) {
	$id = absint( get_theme_mod( 'leithbass_image_' . $slug, 0 ) );
	return ( $id && wp_attachment_is_image( $id ) ) ? $id : 0;
}

/** Return a numeric image setting, constrained to 0–100. */
function leithbass_image_setting( $slug, $setting, $fallback ) {
	$registry = leithbass_image_registry();
	$default  = isset( $registry[ $slug ][ $setting ] ) ? $registry[ $slug ][ $setting ] : $fallback;
	$value    = get_theme_mod( 'leithbass_' . $setting . '_' . $slug, $default );
	return max( 0, min( 100, (float) $value ) );
}

/**
 * Raw value of an editable field (Customizer override, or shipped default).
 */
function leithbass_val( $key ) {
	$reg = leithbass_content_registry();
	$default = isset( $reg[ $key ] ) ? $reg[ $key ][3] : '';
	$v = get_theme_mod( 'leithbass_' . $key, $default );
	$v = str_replace( 'https://lostoscillation.com', 'https://lostosc.com', (string) $v );
	return ( '' === trim( (string) $v ) ) ? $default : $v;
}

/**
 * Echo an editable field, rendered according to its kind.
 */
function leithbass_text( $key ) {
	$reg  = leithbass_content_registry();
	$kind = isset( $reg[ $key ] ) ? $reg[ $key ][2] : 'text';
	$v    = leithbass_val( $key );
	if ( 'textarea' === $kind ) {
		$out = wpautop( wp_kses_post( $v ) );
	} elseif ( 'points' === $kind ) {
		$out = '<ul class="deflist">';
		foreach ( preg_split( '/\r\n|\r|\n/', $v ) as $line ) {
			$line = trim( $line );
			if ( '' === $line ) { continue; }
			$pos = strpos( $line, ':' );
			if ( false !== $pos ) {
				$line = '<strong>' . substr( $line, 0, $pos + 1 ) . '</strong>' . substr( $line, $pos + 1 );
			}
			$out .= '<li>' . wp_kses_post( $line ) . '</li>';
		}
		$out .= '</ul>';
	} else {
		$out = wp_kses_post( $v );
	}
	// External links open in a new tab (see leithbass_external_links()).
	echo apply_filters( 'leithbass_rendered_html', $out );
}

/** The studio's street address with its postcode, as shown on the site. */
function leithbass_studio_address() {
	$address  = trim( (string) leithbass_val( 'studio_address' ) );
	$postcode = trim( (string) leithbass_val( 'studio_postcode' ) );
	if ( $postcode && false === stripos( $address, $postcode ) ) {
		$address .= ', ' . $postcode;
	}
	return $address;
}

/**
 * Lines of a 'points' field as label/text pairs, for layouts other than the
 * standard bullet list. Text before the first colon is the label.
 */
function leithbass_points( $key ) {
	$out = array();
	foreach ( preg_split( '/\r\n|\r|\n/', (string) leithbass_val( $key ) ) as $line ) {
		$line = trim( $line );
		if ( '' === $line ) { continue; }
		$pos = strpos( $line, ':' );
		$out[] = array(
			'label' => false !== $pos ? trim( substr( $line, 0, $pos ) ) : '',
			'text'  => trim( false !== $pos ? substr( $line, $pos + 1 ) : $line ),
		);
	}
	return $out;
}
