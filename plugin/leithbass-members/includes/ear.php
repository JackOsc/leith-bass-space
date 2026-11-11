<?php
/**
 * Ear Training for Bass Players (1.8.0; renamed from the LBS Ear Trainer, and
 * given lines, progressions, Today's set and the Jam room, in 1.10.0).
 *
 * Ear training for bassists that never loses the tone centre: the house band
 * holds home, the bass asks a question against it (a degree, an interval, a
 * chord flavour, a scale, an inversion), and the answer is tapped, found on a
 * fretboard or played on a real bass. Everything it plays is drawn in the
 * browser by the same house band Harmonic Elements uses, so there is nothing
 * here to fetch from Nextcloud and nothing to set up.
 *
 *   What is asked and how it is marked   assets/ear/ear-data.js
 *   The page                             assets/ear/ear.js, ear.css (on top of harmonic.css)
 *   Notation, TAB and the fretboard      assets/lbs-bass.js
 *   Hearing a bass through a microphone  assets/shed-tuner.js and lbs-listen.js (fetched only if "Play it" is chosen)
 *
 * Anyone can use it once it is launched. A visitor's record is kept in their
 * browser. A member's is kept with their account (user meta _lbs_ear), they
 * can choose to share it with Jack, and a sitting can be added to their
 * practice diary, where it counts towards their habit.
 *
 * The theme decides whether it is launched and where it sits (the
 * lbs_ear_live and lbs_ear_page filters), and calls lbs_ear_trainer() where
 * it wants it. In the members' app it is a room of its own,
 * /members/ear-training/ (includes/rooms.php).
 *
 * @package LeithBassMembers
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'LBS_EAR_META', '_lbs_ear' );
define( 'LBS_EAR_LOG_MAX', 3000 );

/** Has the ear trainer been launched? The theme says so; with no theme to say otherwise, it is. */
function lbs_ear_live() {
	return (bool) apply_filters( 'lbs_ear_live', true );
}

/** Until it is launched, only an administrator can use it. */
function lbs_ear_may_use() {
	return lbs_ear_live() || current_user_can( 'manage_options' );
}

/* -------------------------------------------------------------------------
 * A member's record
 *
 * {log: [one line per question answered], share: true|false}. The page reads
 * the log to decide what to ask next and what counts as recognised.
 * ---------------------------------------------------------------------- */

function lbs_ear_record( $user_id ) {
	$rec = get_user_meta( $user_id, LBS_EAR_META, true );
	$rec = is_array( $rec ) ? $rec : array();
	return array(
		'log'   => isset( $rec['log'] ) && is_array( $rec['log'] ) ? array_values( $rec['log'] ) : array(),
		'share' => ! empty( $rec['share'] ),
	);
}

/** The drills, and what each is called. (The page's own list is in ear-data.js.) */
function lbs_ear_drills() {
	return array( 'deg' => 'Degrees', 'int' => 'Intervals', 'chord' => 'Chord flavours', 'scale' => 'Scales', 'inv' => 'Inversions', 'line' => 'Lines', 'roots' => 'Roots of a progression' );
}

/** One line of the record, as the page writes it (EAR.entry), or null if it isn't one. */
function lbs_ear_clean_entry( $e ) {
	if ( ! is_array( $e ) || empty( $e['t'] ) || empty( $e['d'] ) || ! isset( $e['q'] ) ) { return null; }
	// what was asked is a short code: "b3", "#4", "m7b5", "P5", "dorian", "four", "dorian-lean";
	// what was said can be a line or a progression, its degrees joined with dots: "1.b3.5.4"
	$code = function ( $v ) { return substr( preg_replace( '/[^A-Za-z0-9#.\-]/', '', (string) $v ), 0, 40 ); };
	$t    = (float) $e['t'];
	$now  = microtime( true ) * 1000;
	if ( $t < 1.6e12 || $t > $now + DAY_IN_SECONDS * 1000 ) { return null; } // a time in milliseconds, not in the future
	if ( ! isset( lbs_ear_drills()[ $e['d'] ] ) || '' === $code( $e['q'] ) ) { return null; }
	$k = isset( $e['k'] ) && is_numeric( $e['k'] ) ? (int) $e['k'] : 0;
	return array(
		't'  => (int) round( $t ),
		'd'  => (string) $e['d'],
		'q'  => $code( $e['q'] ),
		'k'  => max( 0, min( 11, $k ) ),
		'ok' => ! empty( $e['ok'] ),
		'n'  => isset( $e['n'] ) ? max( 0, min( 99, (int) $e['n'] ) ) : 0,
		's'  => ! empty( $e['s'] ),
		'x'  => isset( $e['x'] ) ? $code( $e['x'] ) : '',
		'v'  => isset( $e['v'] ) && in_array( $e['v'], array( 'tap', 'fb', 'mic' ), true ) ? $e['v'] : 'tap',
	);
}

add_action( 'rest_api_init', function () {
	register_rest_route( 'lbs/v1', '/ear', array( 'methods' => 'POST', 'callback' => 'lbs_ear_rest', 'permission_callback' => 'lbs_rest_can_write' ) );
} );

/**
 * POST {add: [lines], share: true|false, clear: true, diary: {id, min, note}}: any or all of them.
 * "diary" puts a sitting in the member's practice diary (or brings the entry it made earlier up to date).
 */
function lbs_ear_rest( WP_REST_Request $req ) {
	$uid = get_current_user_id();
	if ( ! lbs_ear_may_use() ) { return lbs_rest_error( 'Ear Training isn\'t open yet.', 403 ); }
	$in = $req->get_json_params();
	if ( ! is_array( $in ) ) { $in = $req->get_params(); }
	$out = array( 'ok' => true );

	if ( isset( $in['add'] ) || ! empty( $in['clear'] ) || array_key_exists( 'share', $in ) ) {
		$lock = lbs_lock( 'ear-' . $uid );
		if ( ! $lock ) { return lbs_rest_error( 'Another change is still saving. Try again in a moment.', 409 ); }
		wp_cache_delete( $uid, 'user_meta' );
		$rec = lbs_ear_record( $uid );
		if ( ! empty( $in['clear'] ) ) { $rec['log'] = array(); }
		if ( isset( $in['add'] ) && is_array( $in['add'] ) ) {
			$seen = array();
			foreach ( $rec['log'] as $e ) { $seen[ $e['t'] ] = true; }
			foreach ( array_slice( $in['add'], 0, 400 ) as $raw ) {
				$e = lbs_ear_clean_entry( $raw );
				if ( $e && ! isset( $seen[ $e['t'] ] ) ) { $rec['log'][] = $e; $seen[ $e['t'] ] = true; }
			}
			usort( $rec['log'], function ( $a, $b ) { return $a['t'] <=> $b['t']; } );
			if ( count( $rec['log'] ) > LBS_EAR_LOG_MAX ) { $rec['log'] = array_slice( $rec['log'], -LBS_EAR_LOG_MAX ); }
		}
		if ( array_key_exists( 'share', $in ) ) { $rec['share'] = (bool) $in['share']; }
		update_user_meta( $uid, LBS_EAR_META, $rec );
		lbs_unlock( $lock );
		$out['count'] = count( $rec['log'] );
		$out['share'] = $rec['share'];
	}

	if ( isset( $in['diary'] ) && is_array( $in['diary'] ) ) {
		$d    = $in['diary'];
		$min  = max( 1, min( 600, (int) ( $d['min'] ?? 0 ) ) );
		$note = lbs_txt( $d['note'] ?? '', 300 );
		$id   = ! empty( $d['id'] ) ? sanitize_key( $d['id'] ) : '';
		$made = '';
		$r    = lbs_pr_update( $uid, 'diary', function ( $list ) use ( $min, $note, $id, &$made ) {
			$list = is_array( $list ) ? $list : array();
			// the entry this sitting made earlier, if it is still there and still today's: bring it up to date
			foreach ( $list as $i => $e ) {
				if ( $id && isset( $e['id'] ) && $e['id'] === $id && $e['date'] === lbs_today() ) {
					$list[ $i ]['min']  = $min;
					$list[ $i ]['note'] = $note;
					$made = $id;
					return $list;
				}
			}
			$item = lbs_clean_item( 'diary', array( 'min' => $min, 'tags' => array( 'Ear Training' ), 'note' => $note, 'timed' => true ) );
			if ( is_wp_error( $item ) ) { return $item; }
			$made = $item['id'];
			array_unshift( $list, $item );
			usort( $list, function ( $a, $b ) { return strcmp( $b['date'], $a['date'] ); } );
			return array_slice( $list, 0, lbs_list_cap( 'diary' ) );
		} );
		if ( is_wp_error( $r ) ) { return lbs_rest_error( $r->get_error_message(), 409 ); }
		$out['diary'] = $made;
	}
	return new WP_REST_Response( $out );
}

/* -------------------------------------------------------------------------
 * On the page
 * ---------------------------------------------------------------------- */

/**
 * Does this page show the ear trainer, and which kind: false, 'page' (inside
 * a page) or 'full' (the whole screen, like an app)? The theme's page says so
 * through the lbs_ear_page filter; true means 'page'.
 */
function lbs_ear_mode() {
	if ( ! lbs_ear_may_use() ) { return false; }
	$mode = apply_filters( 'lbs_ear_page', false );
	if ( ! $mode ) { return false; }
	return 'full' === $mode ? 'full' : 'page';
}
add_action( 'wp_enqueue_scripts', function () { if ( lbs_ear_mode() ) { lbs_ear_enqueue(); } }, 20 );

/**
 * In order: each needs the ones before it. The first six are the house band
 * (shared with Harmonic Elements, which loads its course on top of them; the
 * ear trainer needs none of that). All of it is deferred, so nothing holds up
 * the page being drawn, and no sound file is fetched until a question needs it.
 */
function lbs_ear_scripts() {
	return array(
		// the course's catalogue: the progressions in Ear Training are its elements
		'he-catalogue' => 'harmonic/he-catalogue.js',
		'he-packs'  => 'harmonic/he-packs.js',
		'he-sounds' => 'harmonic/he-sounds.js',
		'he-audio'  => 'harmonic/he-audio.js',
		'he-kit'    => 'harmonic/he-kit.js',
		'he-band'   => 'harmonic/he-band.js',
		'he-synth'  => 'harmonic/he-synth.js',
		'bass'      => 'lbs-bass.js',
		'ear-data'  => 'ear/ear-data.js',
		'ear'       => 'ear/ear.js',
	);
}

function lbs_ear_enqueue() {
	static $done = false;
	if ( $done ) { return; }
	$done  = true;
	$base  = LBS_URL . 'assets/';
	$defer = array( 'strategy' => 'defer', 'in_footer' => true );
	wp_enqueue_style( 'lbs-harmonic', $base . 'harmonic/harmonic.css', wp_style_is( 'leithbass', 'registered' ) ? array( 'leithbass' ) : array(), LBS_VERSION );
	wp_enqueue_style( 'lbs-ear', $base . 'ear/ear.css', array( 'lbs-harmonic' ), LBS_VERSION );
	$deps = array();
	foreach ( lbs_ear_scripts() as $name => $file ) {
		wp_enqueue_script( 'lbs-' . $name, $base . $file, $deps, LBS_VERSION, $defer );
		$deps = array( 'lbs-' . $name );
	}
	$me     = get_current_user_id();
	$member = $me && lbs_can_access( $me );
	$data   = array(
		'sounds' => $base . 'harmonic/sounds/',
		'ver'    => LBS_VERSION,
		// only fetched if someone chooses to answer by playing their bass
		'tuner'  => $base . 'shed-tuner.js?ver=' . rawurlencode( LBS_VERSION ),
		'listen' => $base . 'lbs-listen.js?ver=' . rawurlencode( LBS_VERSION ),
		'member' => (bool) $member,
		'signin' => $member ? '' : lbs_portal_url(),
		// where a progression's card is in Harmonic Elements, and a drone on a note (NOTE is 0 for C to 11):
		// in the members' app for a member, on the website for anyone else
		'elements' => lbs_ear_elements_url( $member ),
		'drone'    => lbs_ear_drone_url( $member ),
	);
	if ( $member ) {
		$data['rest']   = esc_url_raw( rest_url( 'lbs/v1/ear' ) );
		$data['nonce']  = wp_create_nonce( 'wp_rest' );
		$data['record'] = lbs_ear_record( $me );
	}
	wp_add_inline_script( 'lbs-ear', 'window.LBS_EAR=' . wp_json_encode( $data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_SLASHES ) . ';', 'before' );
}

/** Harmonic Elements, for a link from a progression: the room in the app for a member, or the public page. */
function lbs_ear_elements_url( $member ) {
	if ( ! function_exists( 'lbs_he_may_use' ) || ! lbs_he_may_use() ) { return ''; }
	if ( $member ) { return lbs_portal_url( 'elements' ); }
	return lbs_harmonic_page_url();
}

/** A drone on a note: the Shed's drone for a member, the free drone page for anyone else. NOTE is replaced by 0 to 11. */
function lbs_ear_drone_url( $member ) {
	if ( $member ) { return lbs_portal_url( 'home', array( 'tab' => 'practice', 'tool' => 'drone', 'note' => 'NOTE' ) ); }
	$page = (string) apply_filters( 'lbs_tool_url', '', 'drone' );
	return $page ? add_query_arg( 'note', 'NOTE', $page ) : '';
}

/** The public Ear Training page, or ''. The theme says where it is. */
function lbs_ear_page_url() {
	return (string) apply_filters( 'lbs_ear_url', '' );
}

/**
 * The markup. Call it where the trainer should appear: lbs_ear_trainer()
 * inside a page, or lbs_ear_trainer( 'full' ) for a page that is only the
 * trainer. $args: 'full_url' adds a "Full screen" link (page mode).
 */
function lbs_ear_trainer( $mode = 'page', $args = array() ) {
	static $shown = false;
	if ( $shown || ! lbs_ear_may_use() ) { return; }
	$shown = true;
	$full  = 'full' === $mode;
	lbs_ear_enqueue();
	$fader = function ( $name, $label ) {
		return '<div class="he-fader-row"><label class="he-kicker" for="ear-lv-' . $name . '">' . $label . '</label><input class="he-fader" type="range" id="ear-lv-' . $name . '" data-level="' . $name . '" min="0" max="100" step="1"><output data-level-out="' . $name . '" for="ear-lv-' . $name . '"></output></div>';
	};
	?>
	<div class="he ear<?php echo $full ? ' he-full' : ''; ?>" id="ear">
		<div class="he-bar">
			<?php if ( $full ) : ?><p class="he-title">Ear <span class="is-outline">Training</span></p><?php endif; ?>
			<div class="he-tabs ear-strands" id="ear-strands" role="group" aria-label="What to work on"></div>
			<?php if ( ! $full && ! empty( $args['full_url'] ) ) : ?><div class="he-bar-links"><a href="<?php echo esc_url( $args['full_url'] ); ?>">Full screen</a></div><?php endif; ?>
		</div>
		<noscript><p class="he-note"><b>Switched off</b><span>Ear Training needs JavaScript to play its questions.</span></p></noscript>

		<div class="he-cols">
			<div class="he-rig">
				<div class="he-modes">
					<div class="he-togs" id="ear-drills" role="group" aria-label="Which drill" hidden></div>
					<p class="he-small" id="ear-drill-note"></p>
				</div>

				<section class="ear-jam" id="ear-jam" aria-label="The Jam room" hidden><div id="ear-jam-body"></div></section>

				<section class="he-display" id="ear-display" aria-label="This question" data-quiz>
					<p class="he-kicker" id="ear-kicker"></p>
					<div class="he-d-main">
						<div class="he-d-cell"><span>HOME</span><span class="he-glyph" id="ear-home">C</span></div>
						<div class="he-d-cell"><span id="ear-against">AGAINST HOME</span><span class="he-roman is-outline" id="ear-answer">?</span><span class="he-d-name" id="ear-name"></span></div>
					</div>
					<ul class="he-turns ear-bars" id="ear-bars" aria-hidden="true"><li><span>Bar one</span><b>Listen</b></li><li><span>Bar two</span><b>Your turn</b></li></ul>
				</section>

				<div class="he-ask">
					<button type="button" class="he-go" id="ear-go" aria-pressed="false" data-quiz><i aria-hidden="true"></i><span id="ear-go-label">Start</span></button>
					<p class="he-who-plays" data-quiz><span class="he-kicker">The band</span><span id="ear-band"></span></p>
					<p class="he-status" id="ear-status" role="status"></p>
				</div>

				<section class="he-ask" aria-labelledby="ear-q" data-quiz>
					<div class="he-ask-head"><h2 class="he-h" id="ear-q"></h2><p class="he-small" id="ear-q-note"></p></div>
					<div class="he-togs" id="ear-ways" role="group" aria-label="How to answer"></div>
					<div class="ear-fb" id="ear-fb" hidden></div>
					<div class="ear-mic" id="ear-mic" hidden></div>
					<div class="ear-slots" id="ear-slots" aria-live="polite" hidden></div>
					<div class="he-els ear-pad" id="ear-pad" role="group" aria-labelledby="ear-q"></div>
				</section>

				<div class="he-commit ear-commit" data-quiz>
					<button type="button" class="he-btn is-quiet" id="ear-show">Show me</button>
				</div>

				<section class="he-result" id="ear-result" aria-live="polite" hidden></section>
			</div>

			<div class="he-side">
				<section class="he-panel" aria-labelledby="ear-h-mixer">
					<h2 class="he-h" id="ear-h-mixer">Mixer</h2>
					<?php echo $fader( 'bass', 'Bass' ) . $fader( 'chords', 'Keys' ) . $fader( 'drums', 'Drums' ); // phpcs:ignore -- fixed markup above. ?>
				</section>

				<section class="he-panel" id="ear-mix" aria-labelledby="ear-mix-h">
					<div class="he-ask-head"><h2 class="he-h" id="ear-mix-h">In play</h2><p class="he-small" id="ear-mix-sum"></p></div>
					<p class="he-small">What can be asked, and so what you choose between. A change takes effect from the next question.</p>
					<div class="he-set"><p class="he-kicker">Start from</p><div class="he-togs" id="ear-sets"></div></div>
					<div class="he-set"><p class="he-kicker">Or choose</p><div class="he-togs" id="ear-items"></div></div>
					<div class="he-set" id="ear-opts" hidden></div>
					<div class="he-set"><button type="button" class="he-btn is-quiet" id="ear-link">Copy a link to this</button><p class="he-small">The link opens this drill with the same things in play. Put it in session notes, or send it to someone.</p></div>
				</section>

				<section class="he-panel" aria-labelledby="ear-h-setup">
					<details class="he-fold" id="ear-setup">
						<summary><span class="he-h" id="ear-h-setup">The set up</span><span class="he-small" id="ear-setup-sum"></span></summary>
						<div class="he-fold-body">
							<div class="he-set"><p class="he-kicker">The bass asking the questions</p><div class="he-togs" id="ear-voice"></div></div>
							<div class="he-set"><p class="he-kicker">Strings on your bass</p><div class="he-togs" id="ear-strings"></div><p class="he-small">The TAB and the fretboards are drawn for it.</p></div>
							<div class="he-set"><p class="he-kicker">Tempo</p><div class="he-togs" id="ear-tempo"></div></div>
							<div class="he-set"><p class="he-kicker">The band</p><div class="he-togs" id="ear-bandset"></div><div class="he-togs" id="ear-keys"></div></div>
							<div class="he-set"><p class="he-kicker">Tone centres, in the cycle of fourths</p><div class="he-togs" id="ear-centres"></div><div class="he-togs" id="ear-centre-sets"></div><p class="he-small">Eight questions stay on one tone centre, then the band moves to the next.</p></div>
							<div class="he-set"><p class="he-kicker">After a right answer</p><div class="he-togs" id="ear-auto"></div></div>
						</div>
					</details>
				</section>

				<section class="he-panel" aria-labelledby="ear-h-rec">
					<div class="he-ask-head"><h2 class="he-h" id="ear-h-rec">Your record</h2><p class="he-small" id="ear-rec-sum"></p></div>
					<dl class="he-tiles" id="ear-rec-tiles"></dl>
					<ul class="he-rec" id="ear-rec-list"></ul>
					<p class="he-small" id="ear-rec-mix"></p>
					<div class="ear-diary" id="ear-diary" hidden>
						<button type="button" class="he-btn is-quiet" id="ear-diary-go" disabled>Add it to my practice diary</button>
						<p class="he-small" id="ear-diary-note" role="status"></p>
					</div>
					<label class="he-switch" id="ear-share-row" hidden><input type="checkbox" id="ear-share"><span>Share my record with Jack</span></label>
					<p class="he-small" id="ear-share-note"></p>
					<div class="he-togs" id="ear-rec-tools"></div>
				</section>
			</div>
		</div>

		<div class="he-dock" id="ear-dock" role="group" aria-label="This question" hidden>
			<button type="button" class="he-dock-go" id="ear-dock-go" aria-pressed="false" aria-label="Start"><i aria-hidden="true"></i></button>
			<p class="he-dock-text"><span class="he-kicker" id="ear-dock-kicker"></span><b id="ear-dock-line"></b></p>
			<button type="button" class="he-btn is-quiet" id="ear-dock-act">Show me</button>
		</div>
	</div>
	<?php
}

/* -------------------------------------------------------------------------
 * In wp-admin
 * ---------------------------------------------------------------------- */

/** A member's record, on their page in Members. Shown only if they share it. */
function lbs_ear_member_card( $uid ) {
	$rec = lbs_ear_record( $uid );
	if ( ! $rec['log'] && ! $rec['share'] ) { return; }
	?>
	<section class="lbs-card" id="ear-trainer">
		<h2>Ear Training</h2>
		<?php if ( ! $rec['share'] ) : ?>
			<p class="description">They've used the ear trainer and keep their record to themselves.</p>
		<?php elseif ( ! $rec['log'] ) : ?>
			<p class="description">Sharing is on, and they haven't answered a question yet.</p>
		<?php else : ?>
			<?php
			// A line for each drill: how many answered, how many first time, and what is missed most.
			$by = array();
			foreach ( $rec['log'] as $e ) {
				$d = $e['d'];
				if ( ! isset( $by[ $d ] ) ) { $by[ $d ] = array( 'n' => 0, 'ok' => 0, 'miss' => array(), 'last' => 0 ); }
				$by[ $d ]['n']++;
				if ( ! empty( $e['ok'] ) ) { $by[ $d ]['ok']++; } else { $by[ $d ]['miss'][ $e['q'] ] = ( $by[ $d ]['miss'][ $e['q'] ] ?? 0 ) + 1; }
				$by[ $d ]['last'] = max( $by[ $d ]['last'], (int) $e['t'] );
			}
			$show = function ( $code ) { return str_replace( array( 'b', '#' ), array( '♭', '♯' ), $code ); };
			?>
			<table class="widefat striped" style="max-width:46rem">
				<thead><tr><th>Drill</th><th>Answered</th><th>First time</th><th>Missed most</th><th>Last used</th></tr></thead>
				<tbody>
				<?php foreach ( lbs_ear_drills() as $id => $name ) : if ( empty( $by[ $id ] ) ) { continue; } $row = $by[ $id ]; arsort( $row['miss'] ); ?>
					<tr>
						<td><?php echo esc_html( $name ); ?></td>
						<td><?php echo (int) $row['n']; ?></td>
						<td><?php echo (int) $row['ok']; ?> (<?php echo (int) round( 100 * $row['ok'] / max( 1, $row['n'] ) ); ?>%)</td>
						<td><?php
							$top = array();
							foreach ( array_slice( $row['miss'], 0, 3, true ) as $code => $times ) { $top[] = ( 'deg' === $id ? $show( $code ) : $code ) . ' (' . (int) $times . ')'; }
							echo esc_html( $top ? implode( ', ', $top ) : 'Nothing' );
						?></td>
						<td><?php echo esc_html( wp_date( 'j M Y', (int) ( $row['last'] / 1000 ) ) ); ?></td>
					</tr>
				<?php endforeach; ?>
				</tbody>
			</table>
			<p class="description">What was asked is shown by its code: P5 is a perfect fifth, m7b5 a half diminished chord, and so on.</p>
		<?php endif; ?>
	</section>
	<?php
}
