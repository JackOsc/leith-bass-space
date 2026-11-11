# Leith Bass Space — custom WordPress theme for leithbass.space

A fast, conversion- and SEO-focused custom theme for The Leith Bass Space: a disciplined Oswald/Inter type system, cream and charcoal colour modes, authentic photography, orange editorial gestures and restrained responsive motion.

## Installing

1. In WordPress admin, go to **Appearance → Themes → Add New Theme → Upload Theme**.
2. Upload the versioned theme zip and click **Install Now**, then **Replace current with uploaded** when updating the existing `leithbass-theme` folder.
3. Activation automatically creates Home, My Approach, The Spaces, Prices & Booking, Contact and Privacy, assigns their templates, and sets Home as the static front page.
4. Check **Settings → Permalinks** is set to "Post name" (click Save once either way to refresh rewrite rules).

## Editing content

Use **Appearance → Leith Bass Content**. The page-by-page tabs let an administrator edit:

- page copy, headings and calls to action;
- footer, contact details, external links and the contact-form destination;
- search titles, meta descriptions and the social-sharing image; and
- photographs, their vertical focal points and their parallax strength.

The older **Appearance → Customize → Site Content** controls remain available and use the same saved values. Edits are WordPress settings, so they survive later theme updates. Clearing a field or choosing **Use bundled image** restores the theme default.

When an administrator is logged in, **Edit Leith Bass content** in the toolbar opens the controls for the page currently being viewed.

The Privacy page can be edited with the normal WordPress page editor under **Pages → Privacy**. Until custom page content is added, the bundled privacy notice remains in place.

## Notes

Notes articles are managed from **Notes** in the WordPress menu. They use the block editor and support modular paragraphs, headings, images, galleries, audio/video players, columns, quotes, buttons and provider embeds, plus excerpts, featured images, revisions, categories and tags.

The section is private by default. Prepare and preview articles while logged in, then use **Appearance → Leith Bass Content → Notes → Make Notes public** when it is ready. That one switch enables the archive and articles, adds Notes to the navigation, and includes published articles in the sitemap.

## Images

All bundled photos are pre-optimised responsive WebP files in `assets/img`. Replacements chosen through **Leith Bass Content** use WordPress's responsive image sizes automatically. For best results, upload a high-quality landscape image at least 1920px wide for heroes and full-width bands, and complete the image's alt text in the Media Library.

## Performance notes

- No jQuery and no plugins required; one small CSS file and one deferred JS file.
- Three deliberately chosen Oswald and Inter font files are self-hosted and preloaded; four unused weights were removed.
- The LCP hero image is preloaded. Below-the-fold photographs use native lazy loading, and photographic card headings load only as they approach the viewport.
- Emoji scripts, embeds and unused block-editor CSS are removed outside Notes articles.
- Parallax runs only near the viewport, is adjustable per image, and is disabled when reduced motion is preferred.
- Fallback images carry intrinsic dimensions to prevent layout shift, and oversized unused derivatives are excluded from the theme.
- The theme outputs canonical URLs, Open Graph/Twitter image dimensions and alt text, local service/offer schema, two teaching locations, breadcrumbs and article schema. It stands down automatically when a recognised SEO plugin is active.

## Version 2.3.0

- Makes `/sitemap.xml` the only advertised sitemap and disables WordPress's broad default sitemap.
- Adds accurate modification dates and includes only the five public, search-focused pages.
- Redirects WordPress starter content and keeps privacy and thin archive pages out of search results.

## Version 3.0.0

- Adds an accessible light/dark mode switch, remembers the visitor's choice and defaults first visits to dark mode.
- Introduces the cream `#F3EFE7` light canvas and charcoal `#090909` / `#0C0E13` dark backgrounds.
- Uses a darker accessibility orange for small links and controls while retaining the brighter brand orange for decorative accents.
- Adds a fine orange outline to all knockout headings in both colour modes and sets each inner page's principal statement in accessible orange.
- Rebuilds image bands as continuous scroll-linked parallax with responsive overscan, focal-point controls, adjustable movement and reduced-motion support.
- Adds **Appearance → Leith Bass Content** for rich-text copy, page headings, footer/contact details, SEO previews, image replacement, focal points and movement controls without editing the theme.
- Adds a private-by-default **Notes** article system with the block editor, featured images, excerpts, revisions, categories, tags, archive/article templates, SEO metadata and structured data.
- Uses the same manuscript photograph as jackaud.io inside the NOTES knockout heading.
- Improves the mobile menu's keyboard behaviour and focus handling.
- Removes the photography credit and places Instagram directly above Slow Karma in the Elsewhere links.

## Version 3.1.0

- Rebuilds the homepage hero as a responsive 40/60 editorial split: focused charcoal copy beside an unaltered lesson photograph.
- Adds a single torn-paper and orange seam between the two panels, becoming a horizontal gesture on small screens.
- Adds dedicated H1, H2 and supporting-copy controls plus direct introductory-session and teaching-approach actions.
- Replaces the hero fallback with responsive derivatives from the original 2048px lesson photograph and removes hero parallax.

## Version 3.2.0

- Replaces the isolated homepage standfirst with an inverse 60/40 editorial split that directly pairs the introduction with the Lost Oscillation control room.
- Adds the bass-wall photograph as a secondary studio detail beneath the charcoal statement panel.
- Carries the torn-paper and orange gesture through the new section, switching to a horizontal divider on smaller screens.
- Adds responsive 640px, 1280px and 2048px WebP fallbacks plus editable Homepage image slots for both new photographs.

## Version 3.3.0

- Removes the duplicated bass-wall panel from the homepage and gives the studio introduction a cleaner 60/40 image-and-copy composition with one precise orange rule.
- Consolidates the visual system around Oswald 700 for display type and Inter 400/600 for copy, navigation and controls; sentence case and uppercase now have defined roles.
- Tightens the homepage proposition, route labels and calls to action around one conversion goal: an introductory bass session.
- Adds full professional endorsements from Sithu Aye and Lorna Brooks, clearly introduced as artist testimony about working with Jack rather than student reviews.
- Replaces the Prices knockout photograph with the unused smiling studio portrait supplied for this release.
- Adds useful service links to Notes articles and improves contact-form result focus for keyboard and screen-reader users.
- Delivers leaner responsive assets, below-the-fold knockout lazy loading, reduced parallax work and layout-stable fallback image dimensions.
- Expands social metadata and structured data for the business, Jack, both teaching locations, priced offers, pages, breadcrumbs, Notes and articles.
- Refactors the image registry to named values and caches trusted inline wordmark SVGs for cleaner, easier-to-maintain code.

## Version 3.3.1

- Makes the homepage hero, studio proof and testimonial panels respond fully to the light/dark control instead of remaining permanently charcoal.
- Adds the torn-paper and orange seam to the second 60/40 split, mirrored on desktop and shared with the hero as a horizontal transition on smaller screens.
- Switches the homepage wordmark and mobile controls for legibility when the light editorial panel sits behind the fixed header.

## Version 3.4.0

- Removes every reference to a free introductory session. The first session is now a paid thirty-minute introduction at £20 (the standard hourly rate, pro rata), and the calls to action elsewhere invite an enquiry rather than advertising an offer.
- Reframes the closing copy on the homepage, Approach and Prices pages around getting in touch to arrange a session, in place of the no-obligation, costs-you-nothing language.
- Makes the six call-to-action button labels editable per page under **Leith Bass Content**, so each one can suit the page it sits on instead of repeating a single sentence site-wide.
- States on the Prices page that an hour is the default and that shorter and longer sessions are available on request, charged pro rata. Drops "longer sessions are very welcome".
- Opens every external link in a new tab. A server-side filter covers theme content, Notes, pages, excerpts and widgets, merging `rel="noopener noreferrer"` without disturbing existing values such as `rel="me"`; a small script catches anything a plugin renders.
- Updates the search titles, meta descriptions and the JSON-LD offer catalogue to match the new introductory session and its £20 price.

## Version 3.4.1

- Adds a one-time migration that clears Customizer-saved wording still carrying the retired free-introductory-session copy, so the new 3.4.0 defaults actually appear. Saved wording that does not mention the old offer is left untouched.

## Version 3.5.0

- Removes The Library throughout: the second section on the Spaces page, both address lines (footer and contact), the `Place` entry in the structured data and the bundled address constant. Lessons are now presented as happening at Lost Oscillation alone.
- Rewrites the Spaces page heading, opening and call to action, the homepage Spaces line and the Spaces and homepage search descriptions around a single room.
- Renames the page's navigation label and knockout heading to the singular The Space and SPACE, matching the site's own name. The `/spaces/` URL is unchanged, so no existing link or search result breaks.
- Adds a migration that clears saved wording still describing a second space and drops the saved values for the four retired Library fields. Content migrations now run in order from a single stored version marker.

## Version 3.5.2

- Adds a BOOK button to the header on mobile, sitting between the colour-mode toggle and the menu and linking to the Contact page. It is hidden from 901px up, where the full navigation already carries a Contact link.
- Replaces the hamburger icon with a bordered MENU button that reads CLOSE while the overlay is open. Keyboard and screen-reader behaviour (`aria-expanded`, `aria-label`, focus handling, Escape to close) is unchanged.
- Scales the wordmark and the three header controls down below 700px and again below 400px so the row fits small phones without wrapping.

## Post-update checks

1. Clear any page, object and CDN caches after installing the zip.
2. Confirm the homepage, Prices and Contact pages in both colour modes and at a mobile width.
3. Submit `/sitemap.xml` in Google Search Console and add the verification code under **Leith Bass Content → Search previews** if it is not already present.
4. Run the homepage and Contact page through PageSpeed Insights after the production cache is warm. Enable full-page caching, Brotli compression and long-lived cache headers for WebP, WOFF2, CSS and JS at the host or CDN.
5. Test one public URL with Google Rich Results Test or Schema Markup Validator. Add the optional public telephone number and Google Business Profile URL in **Links & footer** when available; the visible contact details and schema update together.
6. Check the currently installed WordPress version against the theme header before raising the `Tested up to` value; this release keeps the last verified value rather than claiming an untested compatibility level.

## Version 3.19.0

Goes with **Leith Bass Members 1.12.0**. Install the plugin first, then the theme.

- **Read has a public page**, **/read/**, built like Ear Training's: a Coming Soon page until launch (not indexed, kept out of the sitemap, with three stills), then the page with the app in it, a full screen version at **/read/play/**, a card on the free tools page and its own search title, description and WebApplication schema. Signed in as an administrator you see the whole page before launch, flagged Not launched.
- **Read's Launch tickbox** moves to a **Read** tab of its own in Leith Bass Content, with the page's wording (heading, intro, how it works, Coming Soon text, the full screen strip, search preview) and its pictures.
- The header image (manuscript paper) is cut from the existing notes picture; the three Coming Soon stills are phone captures of the Guide, Name it and the Map.
- No wording changed on existing pages, so there is no content migration.

## Version 3.18.0

Goes with **Leith Bass Members 1.11.0**. Install the plugin first, then the theme.

- **Read**, the new reading room in the members' app (/members/read/), has its own **Launch** tickbox on the **The Portal** tab of Leith Bass Content. Until it is ticked, members see Coming soon in its room; signed in as an administrator you get the whole thing.
- Tells the plugin whether Read is launched (the `lbs_read_live` filter).
- No public page for Read yet, and no wording changed, so there is no content migration in this version.

## Version 3.17.0

Goes with **Leith Bass Members 1.10.0**. Install the plugin first, then the theme.

- **The LBS Ear Trainer is now Ear Training for Bass Players**: menu, page title, heading word (EAR TRAINING), Coming Soon page, full screen strip, More tools card, search title and description, privacy page and Leith Bass Content (the tab is now Ear Training). The page keeps its address, **/ear-trainer/**, and its Launch tickbox.
- **Its copy covers what is new**: lines, progressions, double stops and tenths, Today's set, hearing the other choice, and the Jam room. A 3.17.0 content migration clears only wording still matching the 3.16.0 defaults (and renames the page in Pages only if it is still called LBS Ear Trainer); anything edited by hand stays.
- **For a signed-in member**, the Ear Training and Harmonic Elements pages say each has a room of its own in the members' app, with a link to open it.
- Tells the plugin where the free tools and the Ear Training page are (`lbs_tool_url`, `lbs_ear_url`), so Ear Training can link to the drone on the note a question was on.
- The three Coming Soon stills are unchanged (they still show 3.15.0's questions, which are all still there).

## Version 3.16.0

Goes with **Leith Bass Members 1.9.0**. Install the plugin first, then the theme.

- **Harmonic Elements copy** follows the plugin: the Dojo asks for the key (home, major or minor), Show me comes in two halves, a home cue can play the home chord first, and the forms are out of the app for now. The opening text, the "How it works" list and the Coming Soon caption for the Dojo pick up the new wording on the first admin page load, unless you have edited them by hand.
- **The three Coming Soon stills are retaken** from 1.9.0: the Guide (the Dorian lean, played in C minor), the Dojo asking for the key, and an answer with its other hearing.

## Version 3.15.0

Goes with **Leith Bass Members 1.8.0**. Install the plugin first, then the theme. The first time you open wp-admin after updating, the theme creates four pages (LBS Ear Trainer, Metronome, Drone, Tuner); nothing else needs doing.

- **Three free tools, each on a page of its own:** the Shed's metronome at **/metronome/**, its drone at **/drone/** and its tuner at **/tuner/**, open to anyone with no account. The tool sits straight under the heading, so on a phone the whole metronome and its Start button are on the first screen. Below it: what the tool does, the other free tools, and what else is in the Shed. They are in the sitemap, each has a search title, description and breadcrumb of its own (Home, Shed tools, Metronome) and is described to search engines as a free web application. They are linked from a new **Free tools** list in the footer and from the Shed tools page, and are deliberately not in the header menu. Their copy is under **Leith Bass Content → Free tools**.
- **The LBS Ear Trainer** has a page at **/ear-trainer/**, under Approach in the menu, with a full screen version at /ear-trainer/play/. It has a **Launch tickbox of its own** (Leith Bass Content → LBS Ear Trainer), separate from Harmonic Elements'. Until it is ticked, visitors and members get a Coming Soon page with three stills, the menu says Coming soon, search engines are asked not to list it, and the trainer itself is sent to nobody but an administrator. Signed in as an administrator you get the full page, with a line saying it isn't launched and a link to see what everyone else sees.
- **More tools**, a section under each of those pages and under Harmonic Elements: a card for each of the other free things (Harmonic Elements and the ear trainer appear once each is launched) and one for the Shed, which is where it says there is more for pupils.
- **The Shed tools page** gains a section saying three of its tools are open to everyone, with links, and its line about the metronome describes the new one.
- **Harmonic Elements' page** describes what the plugin's 1.8.0 adds (Play, the two new drills, the forms and further molecules), and its three Coming Soon pictures are new stills. Wording you have edited yourself is left exactly as it is; only fields still holding the 3.14.0 wording pick up the new defaults.
- **Two new heading photographs**, cut from photographs already in the theme (the headstock for EAR TRAINER, the bass wall for the three tools). Each can be replaced from the Media Library like any other.
- A list with an odd number of entries no longer leaves an empty cell at the end (the last entry takes the whole row).
- **The privacy notice** (the bundled one; if you have written your own under Pages → Privacy, add a line to it) gains a short section on the free tools: settings and records stay in the visitor's browser, and the microphone is used only while the tuner or Play it is switched on.
- The theme works with Members 1.7.0 too: the tool pages then say the tool isn't available, and the ear trainer's page shows its words without the trainer. Update the plugin first and that is never seen.

## Version 3.14.0

- **Goes with Leith Bass Members 1.7.0**, which gives Harmonic Elements a house band (eighteen chord sounds and seven drum kits of the app's own) and a strip along the bottom of a phone's screen for play, stop and Check. All of that is in the plugin; the theme's part is words and pictures.
- **The How it works list gains a line, The band**, saying what plays the loops. If you've already edited that list it is left as you wrote it: add a line of your own under Leith Bass Content → Harmonic Elements if you'd like one.
- **The three Coming Soon pictures are new stills of the app as it now is** (the Guide's player, the Dojo with the band named under the stop button, and a right answer). If you've chosen pictures of your own from the Media Library, those stay.
- Nothing else changes, and nothing needs doing after the update. The theme works with Members 1.6.0 too, but the new line and pictures describe 1.7.0.

## Version 3.13.0

- **Coming Soon, and a Launch tickbox.** Harmonic Elements stays closed until you tick **Launch Harmonic Elements** under Leith Bass Content → Harmonic Elements. Until then every visitor and member gets a Coming Soon page at /harmonic-elements/ (a label, a short text and three pictures of the app), the menu line reads Coming soon, the page is left out of the sitemap and search engines are asked not to list it. No part of the app is loaded for them, and the plugin sends them no loops.
- **You still get the full page.** Signed in as an administrator, /harmonic-elements/ and /harmonic-elements/play/ work as they will after launch, under a line that says it isn't launched. Add `?coming-soon` to the address (or use the buttons beside the tickbox) to see the page as everyone else does.
- The Coming Soon wording and its three pictures are in the same tab. The pictures are stills of the app; replace them from the Media Library whenever the app changes.
- **The page now holds two rooms**, the Guide and the Dojo (Leith Bass Members 1.6.0). The page heading, opening text and the How it works list have new default wording to match; anything you had already edited is left as you wrote it.
- Needs Leith Bass Members 1.6.0.

## Version 3.12.0

- **A Harmonic Elements page** (/harmonic-elements/, in the Approach menu after Shed tools): the ear trainer. A loop of chords and drums plays until the player has named home (the tone centre) and the element (the chords, as roman numerals). The trainer sits in a dark band under the opening text, whichever colour mode the site is in, with a **Full screen** link to the trainer on its own at /harmonic-elements/play/.
- The page is created for you on the first admin page load after the update. Its words are in Leith Bass Content → Harmonic Elements, along with the photograph in the ELEMENTS heading (a crop of the keyboard racks until you choose another). Its search title and description are under Search previews.
- The trainer itself, its loops and each member's record come from the member portal plugin. Without the plugin the page shows its text and nothing else.
- The full screen trainer tells search engines to index the Harmonic Elements page instead. The page is in the sitemap.
- Needs Leith Bass Members 1.5.0.

## Version 3.11.0

- **A Shed tools page** (/shed/, in the Approach menu after the Portal). The demo sits right under the heading: in a phone frame beside the text on larger screens, and on phones as a picture of the Shed with an **Open the Shed** button. That opens the demo full screen at /shed/try/, like the app, with a slim strip saying it's a demo and a Book button. Below it: what each tool is for, how members get them, and the introductory session.
- The page is created for you on the first admin page load after the update. Its words are in Leith Bass Content → Shed tools, and the photograph in the SHED heading is under the same tab (a crop of the bass wall until you choose another).
- **The Portal page is lighter.** The full tool list and the demo move to the Shed tools page; the Shed section keeps its heading and a short paragraph, with the tool names and a Try the Shed tools button. Wording you'd edited for the tool list and your line about using the tools yourself moves with them.
- The Approach page's Portal link now reads "See how the Portal works, or try the Shed tools", in edited wording too.
- The full screen demo tells search engines to index the Shed tools page instead, and both pages share the Shed link preview image.
- Needs Leith Bass Members 1.4.0.

## Version 3.10.0

- **Try the Shed** on the Portal page: the real Shed tools, working, with sample practice data, beside the Shed section. On a desktop it sits in a phone frame next to the text; on a phone it fills the width. Sound only plays when the visitor taps, and nothing is saved. The heading, text, small print and hint are in Leith Bass Content → Portal page. The section only appears when Leith Bass Members 1.3.0 is active.
- The drawn example screens for the Overview and the Shed are redrawn in the new look (the session ticket, and the Shed home with its tiles), with captions to match. Edited captions are kept; unedited ones update themselves.
- The Portal page has its own link preview image showing the metronome and drone. Replace it under Leith Bass Content → SEO if you like.
- Needs Leith Bass Members 1.3.0 for the demo and the new look.

## Version 3.9.0

- The Portal page lists the new Shed tools (habit tracker, metronome, tuner, recorder, and the Shelf's practice player), with a new Screen 3 caption and search description. Wording you've edited in Leith Bass Content is kept; unedited wording updates itself.
- Prices: the calendar point now describes the Google Calendar sync and the portal's calendar link.
- Privacy: when the member portal plugin is active, the built-in privacy notice includes the portal's own section (what's kept, who sees it, the microphone, and where it's stored). A privacy page with its own text in the editor is left as it is: paste the section in from Settings → Privacy → Policy Guide.
- Needs Leith Bass Members 1.2.0 for the tools it describes.

## Version 3.8.1

- The Practice Room becomes **the Shed** everywhere on the site: the Portal page, the Approach and Prices copy, the FAQ, the menu and search descriptions. The Portal page explains the name (woodshedding) and lists the new Drone and the Shelf among the tools.
- Prices: the payment point now says the introductory session can be paid on the day or by invoice afterwards, matching the FAQ.
- Fixes the version number in the theme header, which still said 3.6.1 in 3.7.0 and 3.8.0.
- A one-time migration brings saved wording up to date where it still matches the old default, and swaps "Practice Room" for "the Shed" where it's been edited.
- Pairs with Leith Bass Members 1.1.0.

## Version 3.8.0

- Each menu item is now a small version of its page's heading: the page's photograph running through Oswald capitals with the fine orange outline. The words are larger (about 26px on a wide screen, stepping down on smaller laptops), and the page or section you're in is underlined in orange.
- Menu labels match the page headings: APPROACH, SPACE, PRICES, NOTES, CONTACT, and PORTAL and FAQ in the Approach dropdown. Member sign in stays a plain outlined button.
- On the homepage, a soft shade across the top of the photograph and a slight glow keep the words readable over the picture. It fades once you scroll.
- Phones get one flat menu: every page is its own entry with a short line underneath, with PORTAL and FAQ straight after APPROACH. The page you're on gets an orange edge.
- The menu uses small 480px copies of the heading photographs (about 75KB for all seven). A photograph you've replaced in Leith Bass Content is used in the menu too.
- Pairs with Leith Bass Members 1.0.1, which links "The Portal" on the sign in screen to /portal/.

## Version 3.7.0

- Adds **The Portal** (`/portal/`), a public page that explains the member portal: session notes, bookings and the Practice Room. It shows four portal screens (drawn examples until you choose real screenshots in **Leith Bass Content → The Portal**) and a real set of session notes.
- Adds **FAQ** (`/faq/`): questions before you start, in four groups with jump links. Each group is edited as Heading 3 questions with paragraph answers, and the same text feeds FAQ structured data for search.
- The header menu now has dropdowns. **Approach** opens to My approach, The Portal and FAQ: hover or use the arrow on desktop, tap the arrow in the phone menu. The footer lists the new pages too.
- The Members link reads **Member sign in**, or **Your portal** once someone is signed in, and is set apart as a small outlined button.
- Approach: section 3 becomes **Between sessions** and links to The Portal; section 1 is clearer about who leads the plan.
- Homepage: the Approach card mentions the portal; the closing text and button give the £20 price.
- Prices: the summary booking point now describes the portal, and the enquiry line links to the FAQ. The PRICES heading photograph is now the bass wall, replacing the portrait.
- Contact: says you'll reply within a couple of days and gives the introductory session's length and price.
- Adds a **Studio postcode** field (EH6 5JB) under Links & footer. The footer, Contact page and search data show it.
- Search: titles and descriptions for both new pages, both in the sitemap, breadcrumbs that show Approach as their parent, and FAQPage structured data.
- A one-time migration swaps in the new wording only where a field still holds the 3.6.1 wording. Anything you've rewritten is left alone.

### After installing 3.7.0

1. Visit any admin page once: this creates the Portal and FAQ pages and runs the migration.
2. Check **Leith Bass Content → Approach, Prices, Contact and Homepage**. If you had rewritten a field this release changes, your version is kept, so compare it with the new wording and paste in what you want.
3. If you chose your own photograph for the PRICES heading, it still shows. Use **Use bundled image** there to switch to the bass wall.
4. When you have them, add four phone screenshots under **Leith Bass Content → The Portal**. The "example screens" note disappears once all four are real.
5. The Leith Bass Members plugin decides who gets guardian email copies. The site now says a parent or guardian of anyone under 16 can receive them if they'd like to, so check the plugin's setting matches.

## Member portal

From 3.6.1 the member portal lives in its own plugin, **Leith Bass Members**, so it survives theme changes and updates independently. Its README covers setup, day-to-day use and the home-screen app. The theme styles it and adds "Members" to the navigation when the plugin is active.

**Upgrading from 3.6.0:** install this theme first, then upload and activate the plugin, then save **Settings → Permalinks** once. No member data is lost: it was always stored in the database, not the theme.

## Version 3.6.1

- The member portal moves to the Leith Bass Members plugin (see above).
- The page header lets the portal use the full screen on phones with a notch.
- Search: the price range in the structured data now follows the prices you set in Leith Bass Content; sitemap dates reflect copy edits made in Leith Bass Content; later pages of Notes have their own canonical address.
- Contact form: if a message can't be sent (or the page sat open too long), the form comes back with what was typed.

## Version 3.6.0

- Adds the invite-only member portal: Overview, Session Notes, Practice Room, Bookings and Account.
- Adds Members, Sessions and Portal settings to wp-admin, with a paste-in session notes template, Nextcloud file picker, session prep and weekly repeat bookings.
- Adds "Members" to the site navigation (switch off in Portal settings).
