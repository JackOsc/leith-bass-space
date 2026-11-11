<?php
/**
 * Read (1.11.0): reading notation for bass players.
 *
 * A course and a trainer for reading the bass clef, rhythm, keys, intervals
 * and chords, for beginners and for players whose playing has run ahead of
 * their reading (from TAB, or by ear). Like Harmonic Elements it has two
 * rooms: the Guide (the course, every example engraved and playable) and the
 * Dojo (where the links are made: page to name, page to neck, neck to page,
 * page to hands, symbol to time). Every answer is timed, and the Map shows
 * which notes on a member's neck are immediate and which still take a moment.
 *
 *   The theory, the notation string and the neck   assets/read/rd-music.js
 *   The engraver (rhythms, keys, ties, roadmaps)    assets/read/rd-stave.js, rd-glyphs.js
 *   What the Dojo asks, marking, Today, the Map     assets/read/rd-data.js
 *   The course text                                 assets/read/rd-guide.js (built from claude/read-course-text.md)
 *   Keyboard and circle of fifths                   assets/read/rd-figures.js
 *   The page                                        assets/read/read.js, read.css (on top of harmonic.css)
 *   Necks                                           assets/lbs-bass.js
 *   Sound                                           the house band (assets/harmonic/he-*.js)
 *   Hearing a bass through a microphone             assets/shed-tuner.js and lbs-listen.js (fetched only if chosen)
 *
 * It is a room of the members' app, /members/read/ (includes/rooms.php), and
 * since 1.12.0 it also sits on the theme's public page, /read/, where a
 * visitor's record is kept in their browser. In the app, a
 * member's record is kept with their account (user meta _lbs_read); they can
 * share it with Jack, and add a sitting to their practice diary (tag
 * "Reading"), where it counts towards their habit.
 *
 * The theme says whether it is launched (the lbs_read_live filter). Until
 * then only an administrator can use it.
 *
 * @package LeithBassMembers
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'LBS_READ_META', '_lbs_read' );
define( 'LBS_READ_LOG_MAX', 4000 );

/** Has Read been launched? The theme says so; with no theme to say otherwise, it hasn't. */
function lbs_read_live() {
	return (bool) apply_filters( 'lbs_read_live', false );
}

/** Until it is launched, only an administrator can use it. */
function lbs_read_may_use() {
	return lbs_read_live() || current_user_can( 'manage_options' );
}

/* -------------------------------------------------------------------------
 * A member's record: {log: [one line per answer], share: true|false}
 * ---------------------------------------------------------------------- */

function lbs_read_record( $user_id ) {
	$rec = get_user_meta( $user_id, LBS_READ_META, true );
	$rec = is_array( $rec ) ? $rec : array();
	return array(
		'log'   => isset( $rec['log'] ) && is_array( $rec['log'] ) ? array_values( $rec['log'] ) : array(),
		'share' => ! empty( $rec['share'] ),
	);
}

/** The drills, and what each is called. (The page's own list is in rd-data.js.) */
function lbs_read_drills() {
	return array(
		'name'  => 'Name it',
		'write' => 'Write it',
		'find'  => 'Find it',
		'play'  => 'Play it',
		'tap'   => 'Tap it (rhythm)',
		'hear'  => 'Hear it (rhythm)',
		'rwrite' => 'Write it (rhythm)',
		'sight' => 'Sight read',
		'band'  => 'Sight read with the band',
		'key'   => 'Keys',
		'int'   => 'Intervals',
		'chord' => 'Chords',
	);
}

/** One line of the record, as the page writes it (RD.entry), or null if it isn't one. */
function lbs_read_clean_entry( $e ) {
	if ( ! is_array( $e ) || empty( $e['t'] ) || empty( $e['d'] ) || ! isset( $e['q'] ) ) { return null; }
	// what was asked is a short code: a written pitch ("C#3", "Bb2"), a level ("R7", "S4"), a key ("k-3"), an interval ("m3") or a chord kind ("m7")
	$code = function ( $v ) { return substr( preg_replace( '/[^A-Za-z0-9#.\-]/', '', (string) $v ), 0, 40 ); };
	$t    = (float) $e['t'];
	$now  = microtime( true ) * 1000;
	if ( $t < 1.6e12 || $t > $now + DAY_IN_SECONDS * 1000 ) { return null; } // a time in milliseconds, not in the future
	if ( ! isset( lbs_read_drills()[ $e['d'] ] ) || '' === $code( $e['q'] ) ) { return null; }
	return array(
		't'  => (int) round( $t ),
		'd'  => (string) $e['d'],
		'q'  => $code( $e['q'] ),
		'k'  => isset( $e['k'] ) && is_numeric( $e['k'] ) ? max( -12, min( 24, (int) $e['k'] ) ) : 0,
		'ok' => ! empty( $e['ok'] ),
		'n'  => isset( $e['n'] ) ? max( 0, min( 99, (int) $e['n'] ) ) : 0,
		's'  => ! empty( $e['s'] ),
		'x'  => isset( $e['x'] ) ? $code( $e['x'] ) : '',
		'v'  => isset( $e['v'] ) && in_array( $e['v'], array( 'tap', 'fb', 'mic', 'self' ), true ) ? $e['v'] : 'tap',
		'ms' => isset( $e['ms'] ) ? max( 0, min( 600000, (int) $e['ms'] ) ) : 0,
	);
}

add_action( 'rest_api_init', function () {
	register_rest_route( 'lbs/v1', '/read', array( 'methods' => 'POST', 'callback' => 'lbs_read_rest', 'permission_callback' => 'lbs_rest_can_write' ) );
} );

/**
 * POST {add: [lines], share: true|false, clear: true, diary: {id, min, note}}: any or all of them.
 * "diary" puts a sitting in the member's practice diary (or brings the entry it made earlier up to date).
 */
function lbs_read_rest( WP_REST_Request $req ) {
	$uid = get_current_user_id();
	if ( ! lbs_read_may_use() ) { return lbs_rest_error( 'Read isn\'t open yet.', 403 ); }
	$in = $req->get_json_params();
	if ( ! is_array( $in ) ) { $in = $req->get_params(); }
	$out = array( 'ok' => true );

	if ( isset( $in['add'] ) || ! empty( $in['clear'] ) || array_key_exists( 'share', $in ) ) {
		$lock = lbs_lock( 'read-' . $uid );
		if ( ! $lock ) { return lbs_rest_error( 'Another change is still saving. Try again in a moment.', 409 ); }
		wp_cache_delete( $uid, 'user_meta' );
		$rec = lbs_read_record( $uid );
		if ( ! empty( $in['clear'] ) ) { $rec['log'] = array(); }
		if ( isset( $in['add'] ) && is_array( $in['add'] ) ) {
			$seen = array();
			foreach ( $rec['log'] as $e ) { $seen[ $e['t'] . $e['q'] ] = true; }
			foreach ( array_slice( $in['add'], 0, 400 ) as $raw ) {
				$e = lbs_read_clean_entry( $raw );
				// (several notes of a line can be answered in the same millisecond, so the time alone isn't a key)
				if ( $e && ! isset( $seen[ $e['t'] . $e['q'] ] ) ) { $rec['log'][] = $e; $seen[ $e['t'] . $e['q'] ] = true; }
			}
			usort( $rec['log'], function ( $a, $b ) { return $a['t'] <=> $b['t']; } );
			if ( count( $rec['log'] ) > LBS_READ_LOG_MAX ) { $rec['log'] = array_slice( $rec['log'], -LBS_READ_LOG_MAX ); }
		}
		if ( array_key_exists( 'share', $in ) ) { $rec['share'] = (bool) $in['share']; }
		update_user_meta( $uid, LBS_READ_META, $rec );
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
			$item = lbs_clean_item( 'diary', array( 'min' => $min, 'tags' => array( 'Reading' ), 'note' => $note, 'timed' => true ) );
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
 * Does this page show Read, and which kind: false, 'page' or 'full'? The
 * room in the app says 'full' through the lbs_read_page filter (rooms.php).
 */
function lbs_read_mode() {
	if ( ! lbs_read_may_use() ) { return false; }
	$mode = apply_filters( 'lbs_read_page', false );
	if ( ! $mode ) { return false; }
	return 'full' === $mode ? 'full' : 'page';
}
add_action( 'wp_enqueue_scripts', function () { if ( lbs_read_mode() ) { lbs_read_enqueue(); } }, 20 );

/**
 * In order: each needs the ones before it. The first six are the house band
 * (only for sound: Read draws its own notation). All of it is deferred, so
 * nothing holds up the page being drawn, and no sound file is fetched until
 * something is played.
 */
function lbs_read_scripts() {
	return array(
		'he-catalogue' => 'harmonic/he-catalogue.js',
		'he-packs'     => 'harmonic/he-packs.js',
		'he-sounds'    => 'harmonic/he-sounds.js',
		'he-audio'     => 'harmonic/he-audio.js',
		'he-kit'       => 'harmonic/he-kit.js',
		'he-band'      => 'harmonic/he-band.js',
		'he-synth'     => 'harmonic/he-synth.js',
		'bass'         => 'lbs-bass.js',
		'rd-glyphs'    => 'read/rd-glyphs.js',
		'rd-music'     => 'read/rd-music.js',
		'rd-stave'     => 'read/rd-stave.js',
		'rd-figures'   => 'read/rd-figures.js',
		'rd-data'      => 'read/rd-data.js',
		'rd-guide'     => 'read/rd-guide.js',
		'read'         => 'read/read.js',
	);
}

function lbs_read_enqueue() {
	static $done = false;
	if ( $done ) { return; }
	$done  = true;
	$base  = LBS_URL . 'assets/';
	$defer = array( 'strategy' => 'defer', 'in_footer' => true );
	wp_enqueue_style( 'lbs-harmonic', $base . 'harmonic/harmonic.css', wp_style_is( 'leithbass', 'registered' ) ? array( 'leithbass' ) : array(), LBS_VERSION );
	wp_enqueue_style( 'lbs-read', $base . 'read/read.css', array( 'lbs-harmonic' ), LBS_VERSION );
	$deps = array();
	foreach ( lbs_read_scripts() as $name => $file ) {
		wp_enqueue_script( 'lbs-' . $name, $base . $file, $deps, LBS_VERSION, $defer );
		$deps = array( 'lbs-' . $name );
	}
	$me     = get_current_user_id();
	$member = $me && lbs_can_access( $me );
	$data   = array(
		'sounds' => $base . 'harmonic/sounds/',
		'ver'    => LBS_VERSION,
		// only fetched if someone chooses to play into the microphone
		'tuner'  => $base . 'shed-tuner.js?ver=' . rawurlencode( LBS_VERSION ),
		'listen' => $base . 'lbs-listen.js?ver=' . rawurlencode( LBS_VERSION ),
		'member' => (bool) $member,
		'signin' => $member ? '' : lbs_portal_url(),
	);
	if ( $member ) {
		$data['rest']   = esc_url_raw( rest_url( 'lbs/v1/read' ) );
		$data['nonce']  = wp_create_nonce( 'wp_rest' );
		$data['record'] = lbs_read_record( $me );
	}
	wp_add_inline_script( 'lbs-read', 'window.LBS_READ=' . wp_json_encode( $data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_SLASHES ) . ';', 'before' );
}

/**
 * The markup. lbs_read_trainer( 'full' ) for the room or a page that is only
 * Read; lbs_read_trainer() inside a page (the theme's /read/ page, 3.19.0),
 * where $args 'full_url' adds a "Full screen" link. The page fills it in.
 */
function lbs_read_trainer( $mode = 'page', $args = array() ) {
	static $shown = false;
	if ( $shown || ! lbs_read_may_use() ) { return; }
	$shown = true;
	$full  = 'full' === $mode;
	lbs_read_enqueue();
	?>
	<div class="he rd<?php echo $full ? ' he-full' : ''; ?>" id="rd">
		<div class="he-bar">
			<p class="he-title">Read <span class="is-outline">the dots</span></p>
			<div class="he-tabs" id="rd-tabs" role="group" aria-label="The two rooms">
				<button type="button" class="he-tab" data-view="guide" aria-pressed="false">The Guide</button>
				<button type="button" class="he-tab" data-view="dojo" aria-pressed="true">The Dojo</button>
			</div>
			<?php if ( ! $full && ! empty( $args['full_url'] ) ) : ?><div class="he-bar-links"><a href="<?php echo esc_url( $args['full_url'] ); ?>">Full screen</a></div><?php endif; ?>
		</div>
		<noscript><p class="he-note"><b>Switched off</b><span>Read needs JavaScript to draw its music and play it.</span></p></noscript>

		<div class="he-view" id="rd-view-guide" hidden>
			<div class="he-guide" id="rd-guide" data-pane="index">
				<nav class="he-g-index" id="rd-g-index" aria-label="The guide's contents"></nav>
				<article class="he-g-page" id="rd-g-page"></article>
			</div>
		</div>

		<div class="he-view" id="rd-view-dojo">
			<div class="he-tabs rd-strands" id="rd-strands" role="group" aria-label="What to work on"></div>
			<div class="he-cols">
				<div class="he-rig">
					<div class="he-modes">
						<div class="he-togs" id="rd-drills" role="group" aria-label="Which drill" hidden></div>
						<p class="he-small" id="rd-drill-note"></p>
					</div>
					<section class="he-display rd-display" id="rd-display" aria-label="This question">
						<p class="he-kicker" id="rd-kicker"></p>
						<div class="rd-card" id="rd-card"></div>
					</section>
					<div class="he-ask" id="rd-act"></div>
					<p class="he-status" id="rd-status" role="status"></p>
					<section class="he-ask" id="rd-ask" aria-live="polite"></section>
					<div class="he-commit" id="rd-commit"></div>
					<section class="he-result" id="rd-result" aria-live="polite" hidden></section>
				</div>

				<div class="he-side">
					<section class="he-panel" id="rd-mix" aria-labelledby="rd-mix-h">
						<div class="he-ask-head"><h2 class="he-h" id="rd-mix-h">In play</h2></div>
						<p class="he-small">What can be asked. A change takes effect from the next question.</p>
						<div id="rd-mix-body"></div>
					</section>
					<section class="he-panel" aria-labelledby="rd-h-setup">
						<details class="he-fold" id="rd-setup">
							<summary><span class="he-h" id="rd-h-setup">The set up</span><span class="he-small" id="rd-setup-sum"></span></summary>
							<div class="he-fold-body" id="rd-setup-body"></div>
						</details>
					</section>
					<section class="he-panel" aria-labelledby="rd-h-rec">
						<div class="he-ask-head"><h2 class="he-h" id="rd-h-rec">Your record</h2></div>
						<div id="rd-rec-body"></div>
					</section>
				</div>
			</div>
		</div>
	</div>
	<?php
}

/* -------------------------------------------------------------------------
 * In wp-admin
 * ---------------------------------------------------------------------- */

/**
 * A member's record, on their page in Members. Shown only if they share it:
 * how much they've done in each drill, the levels reached, and the notes
 * that are slowest or missed lately (where their reading most needs a session).
 */
function lbs_read_member_card( $uid ) {
	$rec = lbs_read_record( $uid );
	if ( ! $rec['log'] && ! $rec['share'] ) { return; }
	?>
	<section class="lbs-card" id="read">
		<h2>Read</h2>
		<?php if ( ! $rec['share'] ) : ?>
			<p class="description">They've used Read and keep their record to themselves.</p>
		<?php elseif ( ! $rec['log'] ) : ?>
			<p class="description">Sharing is on, and they haven't answered anything yet.</p>
		<?php else : ?>
			<?php
			$by    = array();
			$items = array();
			foreach ( $rec['log'] as $e ) {
				$d = $e['d'];
				if ( ! isset( $by[ $d ] ) ) { $by[ $d ] = array( 'n' => 0, 'ok' => 0, 'last' => 0 ); }
				$by[ $d ]['n']++;
				if ( ! empty( $e['ok'] ) ) { $by[ $d ]['ok']++; }
				$by[ $d ]['last'] = max( $by[ $d ]['last'], (int) $e['t'] );
				$key = $d . ':' . $e['q'];
				if ( ! isset( $items[ $key ] ) ) { $items[ $key ] = array( 'd' => $d, 'q' => $e['q'], 'last' => array(), 'ms' => array() ); }
				$items[ $key ]['last'][] = ! empty( $e['ok'] );
				if ( ! empty( $e['ok'] ) && ! empty( $e['ms'] ) ) { $items[ $key ]['ms'][] = (int) $e['ms']; }
			}
			// the notes to look at: missed in the last three, or the slowest right answers
			$notes = array();
			foreach ( $items as $it ) {
				if ( ! in_array( $it['d'], array( 'name', 'find', 'write', 'play' ), true ) ) { continue; }
				$last   = array_slice( $it['last'], -3 );
				$missed = in_array( false, $last, true );
				$ms     = array_slice( $it['ms'], -5 );
				sort( $ms );
				$median = $ms ? $ms[ (int) floor( count( $ms ) / 2 ) ] : 0;
				$notes[] = array( 'label' => $it['q'] . ' (' . lbs_read_drills()[ $it['d'] ] . ')', 'score' => ( $missed ? 100000 : 0 ) + $median );
			}
			usort( $notes, function ( $a, $b ) { return $b['score'] <=> $a['score']; } );
			$level = function ( $d, $prefix ) use ( $items ) {
				$best = 0;
				foreach ( $items as $it ) {
					if ( $it['d'] !== $d ) { continue; }
					$last = array_slice( $it['last'], -5 );
					if ( count( $last ) === 5 && count( array_filter( $last ) ) >= 4 ) { $best = max( $best, (int) substr( $it['q'], strlen( $prefix ) ) ); }
				}
				return $best;
			};
			$show = function ( $code ) { return str_replace( array( 'b', '#' ), array( '♭', '♯' ), $code ); };
			?>
			<table class="widefat striped" style="max-width:46rem">
				<thead><tr><th>Drill</th><th>Answered</th><th>First time</th><th>Last used</th></tr></thead>
				<tbody>
				<?php foreach ( lbs_read_drills() as $id => $name ) : if ( empty( $by[ $id ] ) ) { continue; } $row = $by[ $id ]; ?>
					<tr>
						<td><?php echo esc_html( $name ); ?></td>
						<td><?php echo (int) $row['n']; ?></td>
						<td><?php echo (int) $row['ok']; ?> (<?php echo (int) round( 100 * $row['ok'] / max( 1, $row['n'] ) ); ?>%)</td>
						<td><?php echo esc_html( wp_date( 'j M Y', (int) ( $row['last'] / 1000 ) ) ); ?></td>
					</tr>
				<?php endforeach; ?>
				</tbody>
			</table>
			<p>Rhythm level reached: <strong><?php echo (int) $level( 'tap', 'R' ) ?: 'none yet'; ?></strong> · sight reading level: <strong><?php echo (int) $level( 'sight', 'S' ) ?: 'none yet'; ?></strong> · with the band: <strong><?php echo (int) $level( 'band', 'B' ) ?: 'none yet'; ?></strong></p>
			<?php if ( $notes ) : ?>
				<p>Slowest or missed lately: <?php echo esc_html( $show( implode( ', ', array_column( array_slice( $notes, 0, 8 ), 'label' ) ) ) ); ?></p>
			<?php endif; ?>
			<p class="description">Notes are shown as written pitch: the open E string is E2, middle C is C4.</p>
		<?php endif; ?>
	</section>
	<?php
}
