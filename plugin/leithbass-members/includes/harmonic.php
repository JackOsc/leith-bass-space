<?php
/**
 * Harmonic Elements: the Guide and the Dojo (the ear trainer came in 1.5.0,
 * the Guide and the launch switch in 1.6.0, the house band in 1.7.0).
 *
 * The Dojo: a loop of chords and a loop of drums play together until the
 * player has named the key (home, and whether it is major or minor) and the element (the chords, as
 * roman numerals). The Guide: the course text, an element at a time, with the
 * same loops to play along with. Both are the JavaScript in assets/harmonic/
 * (the course text is he-guide.js, made from Jack's document). This file is
 * the site's side of it:
 *
 *   - every loop can be played by the house band: the app's own instruments
 *     and drum kits (assets/harmonic/he-band.js, he-kit.js and the small
 *     sound files in assets/harmonic/sounds/). They need nothing from
 *     Nextcloud, so there is always something to play. Recorded loops are
 *     offered as well as these, never instead of them;
 *
 *   - the recorded loops are read straight from a Nextcloud folder, by
 *     default "Harmonic Elements" beside the Members folder:
 *
 *       Harmonic Elements/Chords/90bpm/C/Lean/Major I - Major IV.mp3
 *       Harmonic Elements/Drums/90bpm/Neo soul (1).mp3
 *
 *     Nothing is copied to the website. The list of files is remembered and
 *     checked again every 15 minutes, and each loop is passed through from
 *     Nextcloud when a browser asks for it. Folders and files whose names
 *     start with "_" or "." are left out, so work in progress can sit there.
 *
 *   - what a file IS comes from its name and its folders, and is worked out
 *     in the browser (assets/harmonic/he-library.js), so there is one set of
 *     naming rules and Portal settings shows exactly what the trainer sees;
 *
 *   - a signed-in member's record is kept with their account. Jack sees it
 *     only if the member switches sharing on;
 *
 *   - the theme puts the trainer on a page by calling lbs_harmonic_trainer().
 *
 * @package LeithBassMembers
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'LBS_HE_LISTING', 'lbs_he_listing' );
define( 'LBS_HE_META', '_lbs_he' );
define( 'LBS_HE_FRESH', 15 * MINUTE_IN_SECONDS );
define( 'LBS_HE_LOG_MAX', 2000 );

/* -------------------------------------------------------------------------
 * Settings
 * ---------------------------------------------------------------------- */

/** Where the loops would be if no folder has been named: beside the Members folder. */
function lbs_he_default_root() {
	$members = lbs_clean_path( lbs_settings()['nc_root'] );
	$cut     = strrpos( $members, '/' );
	return '/' . ( false === $cut ? '' : substr( $members, 0, $cut ) . '/' ) . 'Harmonic Elements';
}

/** The Harmonic Elements folder in Nextcloud. */
function lbs_he_root() {
	$set = lbs_clean_path( lbs_settings()['he_root'] );
	return '' !== $set ? '/' . $set : lbs_he_default_root();
}

/** Who hears the recorded loops: 'members' (everyone else gets the house band) or 'everyone'. */
function lbs_he_open() {
	return 'everyone' === lbs_settings()['he_open'] ? 'everyone' : 'members';
}

/**
 * Has Harmonic Elements been launched? The theme decides (the Launch tickbox
 * in Leith Bass Content) and says so through the lbs_harmonic_live filter.
 * With no theme to say otherwise, it is.
 */
function lbs_he_live() {
	return (bool) apply_filters( 'lbs_harmonic_live', true );
}

/** Until it is launched, only an administrator can use it: no trainer, no loops, no record for anyone else. */
function lbs_he_may_use() {
	return lbs_he_live() || current_user_can( 'manage_options' );
}

/** May whoever is asking be sent the recorded loops? */
function lbs_he_may_listen() {
	if ( ! lbs_he_may_use() ) { return false; }
	if ( 'everyone' === lbs_he_open() ) { return true; }
	return is_user_logged_in() && ( current_user_can( 'manage_options' ) || lbs_can_access( get_current_user_id() ) );
}

/** Audio a browser can decode. */
function lbs_he_playable() {
	return array( 'mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg' );
}

/* -------------------------------------------------------------------------
 * The list of loops
 * ---------------------------------------------------------------------- */

function lbs_he_blank() {
	return array( 'scanned' => 0, 'root' => lbs_he_root(), 'error' => '', 'files' => array(), 'other' => array(), 'requests' => 0, 'complete' => true, 'took' => 0 );
}

/**
 * Read the folder from Nextcloud and remember what's in it. Returns the new
 * listing, or null if another request is already reading it.
 */
function lbs_he_scan() {
	if ( ! lbs_nc_ready() ) { return null; }
	if ( get_transient( 'lbs_he_scanning' ) ) { return null; }
	set_transient( 'lbs_he_scanning', 1, 4 * MINUTE_IN_SECONDS );
	if ( function_exists( 'set_time_limit' ) ) { @set_time_limit( 240 ); } // phpcs:ignore -- a big folder on a slow connection.

	$out     = lbs_he_blank();
	$started = microtime( true );
	$tree    = lbs_nc_tree( $out['root'], 'lbs_library_skip' );
	if ( is_wp_error( $tree ) ) {
		$out['error'] = $tree->get_error_message();
		// A blip in the connection shouldn't empty the trainer: keep the last good list.
		$old = get_option( LBS_HE_LISTING );
		if ( is_array( $old ) && ! empty( $old['files'] ) && isset( $old['root'] ) && $old['root'] === $out['root'] ) {
			$out['files'] = $old['files'];
			$out['other'] = isset( $old['other'] ) ? $old['other'] : array();
		}
	} else {
		$playable = lbs_he_playable();
		foreach ( $tree['files'] as $f ) {
			$ext = strtolower( pathinfo( $f['path'], PATHINFO_EXTENSION ) );
			if ( in_array( $ext, $playable, true ) ) {
				$out['files'][] = array( $f['path'], (int) $f['size'], (int) $f['modified'] );
			} elseif ( in_array( $ext, array( 'aif', 'aiff', 'caf', 'wma', 'mid', 'midi' ), true ) ) {
				$out['other'][] = $f['path'];
			}
		}
		$out['requests'] = (int) $tree['requests'];
		$out['complete'] = (bool) $tree['complete'];
	}
	$out['scanned'] = time();
	$out['took']    = round( microtime( true ) - $started, 1 );
	update_option( LBS_HE_LISTING, $out, false );
	delete_transient( 'lbs_he_scanning' );
	return $out;
}
add_action( 'lbs_he_refresh', 'lbs_he_scan' );

/** Have the folder read again shortly, without making anyone wait for it. */
function lbs_he_refresh_soon() {
	if ( get_transient( 'lbs_he_scanning' ) ) { return; }
	if ( ! wp_next_scheduled( 'lbs_he_refresh' ) ) { wp_schedule_single_event( time(), 'lbs_he_refresh' ); }
	if ( ! get_transient( 'lbs_he_poked' ) ) {
		set_transient( 'lbs_he_poked', 1, MINUTE_IN_SECONDS );
		spawn_cron();
	}
}

/**
 * The remembered listing: scanned, root, error, files [[path, size, modified]],
 * other [paths that aren't playable], requests, complete, took.
 *
 * $refresh: 'auto'  use what's remembered, and have it read again in the
 *                   background once it's 15 minutes old (read it now if
 *                   there's nothing remembered at all);
 *           'now'   read the folder before answering;
 *           'never' only what's remembered.
 */
function lbs_he_listing( $refresh = 'auto' ) {
	$stored = get_option( LBS_HE_LISTING );
	$have   = is_array( $stored ) && ! empty( $stored['scanned'] ) && isset( $stored['root'] ) && $stored['root'] === lbs_he_root();
	if ( ! lbs_nc_ready() ) { return lbs_he_blank(); }
	if ( 'now' === $refresh || ( ! $have && 'auto' === $refresh ) ) {
		$fresh = lbs_he_scan();
		if ( $fresh ) { return $fresh; }
	} elseif ( $have && 'auto' === $refresh ) {
		$age = time() - (int) $stored['scanned'];
		if ( $age > ( $stored['error'] ? 2 * MINUTE_IN_SECONDS : LBS_HE_FRESH ) ) { lbs_he_refresh_soon(); }
	}
	return $have ? array_merge( lbs_he_blank(), $stored ) : lbs_he_blank();
}

/** A loop's id: it changes whenever the file does, so a browser can keep a loop for good. */
function lbs_he_id( $file ) {
	return substr( sha1( $file[0] . '|' . $file[1] . '|' . $file[2] ), 0, 16 );
}

/** The file with this id, as [path, size, modified], or null. */
function lbs_he_find( $id ) {
	foreach ( lbs_he_listing( 'never' )['files'] as $file ) {
		if ( lbs_he_id( $file ) === $id ) { return $file; }
	}
	return null;
}

/* -------------------------------------------------------------------------
 * Serving: the list (/members/harmonic/) and one loop (/members/loop/?f=ID)
 * ---------------------------------------------------------------------- */

function lbs_he_cache_header( $seconds, $forever = false ) {
	$who = 'everyone' === lbs_he_open() ? 'public' : 'private';
	header( 'Cache-Control: ' . $who . ', max-age=' . (int) $seconds . ( $forever ? ', immutable' : '' ) );
}

function lbs_he_serve_listing() {
	header( 'X-Robots-Tag: noindex, nofollow', true );
	header( 'Content-Type: application/json; charset=utf-8' );
	header( 'X-Content-Type-Options: nosniff' );
	$out = array( 'ok' => true, 'recorded' => false, 'pending' => false, 'files' => array() );
	if ( lbs_he_may_listen() && lbs_nc_ready() ) {
		$listing         = lbs_he_listing();
		$out['recorded'] = true;
		$out['pending']  = empty( $listing['scanned'] );
		foreach ( $listing['files'] as $file ) { $out['files'][] = array( $file[0], lbs_he_id( $file ) ); }
		lbs_he_cache_header( $out['pending'] ? 0 : 120 );
	} else {
		header( 'Cache-Control: private, no-store' );
	}
	echo wp_json_encode( $out, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ); // phpcs:ignore -- JSON.
	exit;
}

function lbs_he_serve_loop() {
	header( 'X-Robots-Tag: noindex, nofollow', true );
	if ( ! lbs_he_may_listen() ) {
		nocache_headers();
		lbs_file_fail( 403, 'The recorded loops are for members. Sign in to the member portal first.' );
	}
	$id   = isset( $_GET['f'] ) ? preg_replace( '/[^a-f0-9]/', '', strtolower( sanitize_text_field( wp_unslash( $_GET['f'] ) ) ) ) : ''; // phpcs:ignore
	$file = 16 === strlen( $id ) ? lbs_he_find( $id ) : null;
	if ( ! $file ) {
		nocache_headers();
		lbs_file_fail( 404, 'That loop has changed or gone. Reload the page.' );
	}

	// The id names one version of one file, so a copy the browser already has is still good.
	$etag = '"' . $id . '"';
	if ( isset( $_SERVER['HTTP_IF_NONE_MATCH'] ) && false !== strpos( wp_unslash( $_SERVER['HTTP_IF_NONE_MATCH'] ), $etag ) ) { // phpcs:ignore
		status_header( 304 );
		header( 'ETag: ' . $etag );
		lbs_he_cache_header( YEAR_IN_SECONDS, true );
		exit;
	}

	$ext   = strtolower( pathinfo( $file[0], PATHINFO_EXTENSION ) );
	$types = lbs_mime_types();
	$type  = isset( $types[ $ext ] ) ? $types[ $ext ] : 'application/octet-stream';
	$range = isset( $_SERVER['HTTP_RANGE'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_RANGE'] ) ) : '';

	while ( ob_get_level() ) { ob_end_clean(); }
	if ( function_exists( 'set_time_limit' ) ) { @set_time_limit( 0 ); } // phpcs:ignore
	$sent = lbs_nc_stream( lbs_he_root() . '/' . $file[0], $range, function ( $status, $headers ) use ( $type, $etag ) {
		status_header( $status );
		header( 'Content-Type: ' . $type );
		if ( ! empty( $headers['content-length'] ) ) { header( 'Content-Length: ' . (int) $headers['content-length'] ); }
		if ( 206 === $status && ! empty( $headers['content-range'] ) ) { header( 'Content-Range: ' . $headers['content-range'] ); }
		header( 'Accept-Ranges: bytes' );
		header( 'ETag: ' . $etag );
		header( 'X-Content-Type-Options: nosniff' );
		lbs_he_cache_header( YEAR_IN_SECONDS, true );
	}, true );
	if ( is_wp_error( $sent ) ) {
		nocache_headers();
		// Gone from Nextcloud since the folder was last read: read it again, so the next page has it right.
		if ( 'lbs_nc_missing' === $sent->get_error_code() ) { lbs_he_refresh_soon(); }
		lbs_file_fail( 'lbs_nc_missing' === $sent->get_error_code() ? 404 : 502, $sent->get_error_message() );
	}
	exit;
}

/* -------------------------------------------------------------------------
 * A member's record
 *
 * {log: [one line per loop answered], share: true|false}. The trainer reads
 * the log to decide what to play next and which elements count as recognised.
 * ---------------------------------------------------------------------- */

function lbs_he_record( $user_id ) {
	$rec = get_user_meta( $user_id, LBS_HE_META, true );
	$rec = is_array( $rec ) ? $rec : array();
	return array(
		'log'   => isset( $rec['log'] ) && is_array( $rec['log'] ) ? array_values( $rec['log'] ) : array(),
		'share' => ! empty( $rec['share'] ),
	);
}

/** One line of the record, as the trainer writes it (HE.trainer.entry), or null if it isn't one. */
function lbs_he_clean_entry( $e ) {
	if ( ! is_array( $e ) || empty( $e['t'] ) || empty( $e['el'] ) ) { return null; }
	$slug = function ( $v ) { return substr( preg_replace( '/[^a-z0-9-]/', '', strtolower( (string) $v ) ), 0, 60 ); };
	$pc   = function ( $v ) { return ( is_numeric( $v ) && (int) $v >= 0 && (int) $v <= 11 ) ? (int) $v : null; };
	$t    = (float) $e['t'];
	$now  = microtime( true ) * 1000;
	if ( $t < 1.6e12 || $t > $now + DAY_IN_SECONDS * 1000 ) { return null; } // a time in milliseconds, not in the future
	$el = $slug( $e['el'] );
	if ( '' === $el || null === $pc( isset( $e['key'] ) ? $e['key'] : null ) ) { return null; }
	$out = array(
		't'        => (int) round( $t ),
		'el'       => $el,
		'key'      => $pc( $e['key'] ),
		'bpm'      => isset( $e['bpm'] ) ? max( 20, min( 400, (int) $e['bpm'] ) ) : 0,
		'feel'     => isset( $e['feel'] ) ? lbs_txt( $e['feel'], 40 ) : '',
		'voicing'  => isset( $e['voicing'] ) && 'sevenths' === $e['voicing'] ? 'sevenths' : 'triads',
		'sound'    => isset( $e['sound'] ) && 'file' === $e['sound'] ? 'file' : 'synth',
		'ok'       => ! empty( $e['ok'] ),
		'home'     => ! empty( $e['home'] ),
		'element'  => ! empty( $e['element'] ),
		'saidEl'   => isset( $e['saidEl'] ) && '' !== $slug( $e['saidEl'] ) ? $slug( $e['saidEl'] ) : null,
		'saidHome' => $pc( isset( $e['saidHome'] ) ? $e['saidHome'] : null ),
		'tries'    => isset( $e['tries'] ) ? max( 0, min( 99, (int) $e['tries'] ) ) : 0,
		'shown'    => ! empty( $e['shown'] ),
	);
	// A drill's line (1.8.0): which drill it was, and what the element was heard against.
	if ( isset( $e['mode'] ) && in_array( $e['mode'], array( 'pair', 'change' ), true ) ) {
		$out['mode']  = $e['mode'];
		$out['other'] = isset( $e['other'] ) ? $slug( $e['other'] ) : '';
	}
	// The key (1.9.0): whether the course hears home as major or minor, what was said, and which half was shown first.
	$scale = function ( $v ) { return in_array( $v, array( 'major', 'minor' ), true ) ? $v : null; };
	if ( isset( $e['keyMode'] ) && $scale( $e['keyMode'] ) ) { $out['keyMode'] = $e['keyMode']; }
	if ( isset( $e['saidMode'] ) && $scale( $e['saidMode'] ) ) { $out['saidMode'] = $e['saidMode']; }
	if ( isset( $e['showed'] ) && in_array( $e['showed'], array( 'key', 'element' ), true ) ) { $out['showed'] = $e['showed']; }
	// What was asked (1.13.0): the element with home established by the band, or the key alone (Find home).
	if ( isset( $e['ask'] ) && in_array( $e['ask'], array( 'element', 'home' ), true ) ) { $out['ask'] = $e['ask']; }
	return $out;
}

add_action( 'rest_api_init', function () {
	register_rest_route( 'lbs/v1', '/harmonic', array( 'methods' => 'POST', 'callback' => 'lbs_he_rest_record', 'permission_callback' => 'lbs_rest_can_write' ) );
} );

/** POST {add: [lines], share: true|false, clear: true}: any or all of them. */
function lbs_he_rest_record( WP_REST_Request $req ) {
	$uid = get_current_user_id();
	if ( ! lbs_he_may_use() ) { return lbs_rest_error( 'Harmonic Elements isn\'t open yet.', 403 ); }
	$in  = $req->get_json_params();
	if ( ! is_array( $in ) ) { $in = $req->get_params(); }
	$lock = lbs_lock( 'he-' . $uid );
	if ( ! $lock ) { return lbs_rest_error( 'Another change is still saving. Try again in a moment.', 409 ); }
	wp_cache_delete( $uid, 'user_meta' );
	$rec = lbs_he_record( $uid );
	if ( ! empty( $in['clear'] ) ) { $rec['log'] = array(); }
	if ( isset( $in['add'] ) && is_array( $in['add'] ) ) {
		$seen = array();
		foreach ( $rec['log'] as $e ) { $seen[ $e['t'] ] = true; }
		foreach ( array_slice( $in['add'], 0, 300 ) as $raw ) {
			$e = lbs_he_clean_entry( $raw );
			if ( $e && ! isset( $seen[ $e['t'] ] ) ) { $rec['log'][] = $e; $seen[ $e['t'] ] = true; }
		}
		usort( $rec['log'], function ( $a, $b ) { return $a['t'] <=> $b['t']; } );
		if ( count( $rec['log'] ) > LBS_HE_LOG_MAX ) { $rec['log'] = array_slice( $rec['log'], -LBS_HE_LOG_MAX ); }
	}
	if ( array_key_exists( 'share', $in ) ) { $rec['share'] = (bool) $in['share']; }
	update_user_meta( $uid, LBS_HE_META, $rec );
	lbs_unlock( $lock );
	return new WP_REST_Response( array( 'ok' => true, 'count' => count( $rec['log'] ), 'share' => $rec['share'] ) );
}

/* -------------------------------------------------------------------------
 * On the page
 * ---------------------------------------------------------------------- */

/**
 * Which trainer this page shows: false, 'page' (inside a page) or 'full' (the
 * whole screen). The theme's Harmonic Elements page says so through the
 * lbs_harmonic_page filter; true means 'page'.
 */
function lbs_harmonic_mode() {
	$mode = apply_filters( 'lbs_harmonic_page', is_page_template( 'page-templates/template-harmonic.php' ) );
	if ( ! $mode || ! lbs_he_may_use() ) { return false; }
	return 'full' === $mode ? 'full' : 'page';
}
add_action( 'wp_enqueue_scripts', function () { if ( lbs_harmonic_mode() ) { lbs_harmonic_enqueue(); } }, 20 );

function lbs_harmonic_scripts() {
	// In order: each needs the ones before it. he-packs to he-synth are the house band.
	return array( 'he-catalogue', 'he-library', 'he-trainer', 'he-audio', 'he-packs', 'he-sounds', 'he-kit', 'he-band', 'he-synth', 'he-listen', 'he-guide' );
}

function lbs_harmonic_enqueue() {
	static $done = false;
	if ( $done ) { return; }
	$done = true;
	$base = LBS_URL . 'assets/harmonic/';
	wp_enqueue_style( 'lbs-harmonic', $base . 'harmonic.css', wp_style_is( 'leithbass', 'registered' ) ? array( 'leithbass' ) : array(), LBS_VERSION );
	$deps = array();
	foreach ( lbs_harmonic_scripts() as $name ) {
		wp_enqueue_script( 'lbs-' . $name, $base . $name . '.js', $deps, LBS_VERSION, array( 'in_footer' => true ) );
		$deps = array( 'lbs-' . $name );
	}
	wp_enqueue_script( 'lbs-harmonic', $base . 'harmonic.js', $deps, LBS_VERSION, array( 'in_footer' => true ) );

	$me     = get_current_user_id();
	$member = $me && lbs_can_access( $me );
	$listen = lbs_he_may_listen() && lbs_nc_ready();
	$data   = array(
		// the house band's instruments: fetched one small file at a time, as a loop first needs each
		'sounds' => $base . 'sounds/',
		'ver'    => LBS_VERSION,
		// notation, TAB and the fretboard: fetched the first time the Guide's "Play" is opened
		'bass'   => LBS_URL . 'assets/lbs-bass.js?ver=' . rawurlencode( LBS_VERSION ),
		'list'   => $listen ? lbs_portal_url( 'harmonic' ) : '',
		'loop'   => $listen ? add_query_arg( 'f', 'LOOPID', lbs_portal_url( 'loop' ) ) : '',
		'member' => (bool) $member,
		'admin'  => current_user_can( 'manage_options' ),
		'signin' => $member ? '' : lbs_portal_url(),
	);
	if ( $member ) {
		$data['rest']   = esc_url_raw( rest_url( 'lbs/v1/harmonic' ) );
		$data['nonce']  = wp_create_nonce( 'wp_rest' );
		$data['record'] = lbs_he_record( $me );
	}
	wp_add_inline_script( 'lbs-harmonic', 'window.LBS_HE=' . wp_json_encode( $data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_SLASHES ) . ';', 'before' );
}

/**
 * The markup. Call it where the trainer should appear: lbs_harmonic_trainer()
 * inside a page, or lbs_harmonic_trainer( 'full', $args ) for a page that is
 * only the trainer. $args: 'full_url' adds a "Full screen" link (page mode).
 */
function lbs_harmonic_trainer( $mode = 'page', $args = array() ) {
	static $shown = false;
	if ( $shown || ! lbs_he_may_use() ) { return; }
	$shown = true;
	$full  = 'full' === $mode;
	lbs_harmonic_enqueue();
	$mix_icon = '<svg width="20" height="20" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><line x1="3" y1="6" x2="19" y2="6"></line><line x1="3" y1="11" x2="19" y2="11"></line><line x1="3" y1="16" x2="19" y2="16"></line><circle cx="8" cy="6" r="2" fill="#E87102" stroke="none"></circle><circle cx="14" cy="11" r="2" fill="#E87102" stroke="none"></circle><circle cx="10" cy="16" r="2" fill="#E87102" stroke="none"></circle></svg>';
	?>
	<div class="he<?php echo $full ? ' he-full' : ''; ?>" id="he">
		<div class="he-bar">
			<?php if ( $full ) : ?><p class="he-title">Harmonic <span class="is-outline">Elements</span></p><?php endif; ?>
			<div class="he-tabs" id="he-tabs" role="group" aria-label="The two rooms">
				<button type="button" class="he-tab" id="he-tab-guide" data-view="guide" aria-pressed="false">The Guide</button>
				<button type="button" class="he-tab" id="he-tab-dojo" data-view="dojo" aria-pressed="true">The Dojo</button>
			</div>
			<div class="he-bar-links">
				<?php if ( ! $full && ! empty( $args['full_url'] ) ) : ?><a href="<?php echo esc_url( $args['full_url'] ); ?>">Full screen</a><?php endif; ?>
				<a href="#he-mix" id="he-mix-link" aria-label="Change the mix"><?php echo $mix_icon; // phpcs:ignore -- fixed markup above. ?><span class="he-wide">Change the mix</span><span class="he-narrow" aria-hidden="true">Mix</span></a>
			</div>
		</div>

		<noscript><p class="he-note"><b>Switched off</b><span>Harmonic Elements needs JavaScript to play its loops.</span></p></noscript>

		<div class="he-view" id="he-view-guide" hidden>
			<div class="he-guide" id="he-guide" data-pane="index">
				<nav class="he-g-index" id="he-g-index" aria-label="The guide's contents"></nav>
				<article class="he-g-page" id="he-g-page"></article>
			</div>
		</div>

		<div class="he-view" id="he-view-dojo">
		<div class="he-cols">
			<div class="he-rig">
				<div class="he-modes">
					<div class="he-togs" id="he-modes" role="group" aria-label="What the Dojo asks"></div>
					<p class="he-small" id="he-mode-note"></p>
				</div>
				<section class="he-display" id="he-display" aria-label="This loop">
					<p class="he-kicker" id="he-d-kicker"></p>
					<div class="he-d-main">
						<div class="he-d-cell"><span>KEY</span><span class="he-glyph is-outline" id="he-d-home">?</span><span class="he-d-mode" id="he-d-mode"></span></div>
						<div class="he-d-cell"><span>ELEMENT</span><span class="he-roman is-outline" id="he-d-roman">?</span><span class="he-d-name" id="he-d-name"></span></div>
					</div>
					<ul class="he-turns" id="he-d-turns" aria-hidden="true" hidden></ul>
					<div class="he-pips" id="he-d-pips" aria-hidden="true"></div>
					<ul class="he-changes" id="he-d-changes" hidden></ul>
				</section>

				<div class="he-ask">
					<button type="button" class="he-go" id="he-go" aria-pressed="false"><i aria-hidden="true"></i><span id="he-go-label">Play the loop</span></button>
					<p class="he-who-plays"><span class="he-kicker">The band</span><span id="he-band"></span></p>
					<button type="button" class="he-btn is-quiet he-hit" id="he-hit" hidden>Home hit<span class="he-small"> one bar of the home chord over the loop</span></button>
					<p class="he-status" id="he-status" role="status"></p>
				</div>

				<section class="he-ask" id="he-ask-home" aria-labelledby="he-q-home">
					<div class="he-ask-head"><h2 class="he-h" id="he-q-home">What's the key?</h2><p class="he-small" id="he-q-home-note"></p></div>
					<div class="he-homes" id="he-homes" role="group" aria-label="Home"></div>
					<div class="he-kmodes" id="he-kmodes" role="group" aria-label="Major or minor"></div>
					<details class="he-more"><summary>What am I choosing?</summary><p class="he-small">The key: home, and whether home is major or minor. Home is the one note that feels like rest: find it on your bass first. Then listen to the chord on it, major or minor. Plenty of loops can be heard from more than one home (the same chords, with a different chord feeling like rest), and any hearing the course allows counts.</p><p class="he-small">The numerals count from home on the major scale, so ♭III is always a minor third above home, in a major key or a minor one. In C minor, Cm E♭ F is i ♭III IV: ♭III is in the key, and the major IV is its Dorian colour.</p></details>
				</section>

				<section class="he-ask" id="he-ask-el" aria-labelledby="he-q-el">
					<div class="he-ask-head"><h2 class="he-h" id="he-q-el">What's the element?</h2><p class="he-small" id="he-q-el-note">The chords, as roman numerals from home.</p></div>
					<p class="he-small" id="he-els-note" hidden></p>
					<div class="he-els" id="he-els" role="group" aria-labelledby="he-q-el"></div>
				</section>

				<div class="he-commit">
					<button type="button" class="he-btn" id="he-check" disabled>Check</button>
					<div class="he-shows" role="group" aria-labelledby="he-show-label">
						<span class="he-kicker" id="he-show-label">Show me</span>
						<button type="button" class="he-btn is-quiet" id="he-show-key" aria-label="Show me the key">The key</button>
						<button type="button" class="he-btn is-quiet" id="he-show-el" aria-label="Show me the element">The element</button>
					</div>
				</div>

				<section class="he-result" id="he-result" aria-live="polite" hidden></section>
			</div>

			<div class="he-side">
				<section class="he-panel" aria-labelledby="he-h-mixer">
					<h2 class="he-h" id="he-h-mixer">Mixer</h2>
					<div class="he-fader-row"><label class="he-kicker" for="he-lv-chords">Chords</label><input class="he-fader" type="range" id="he-lv-chords" data-level="chords" min="0" max="100" step="1"><output data-level-out="chords" for="he-lv-chords"></output></div>
					<div class="he-fader-row"><label class="he-kicker" for="he-lv-drums">Drums</label><input class="he-fader" type="range" id="he-lv-drums" data-level="drums" min="0" max="100" step="1"><output data-level-out="drums" for="he-lv-drums"></output></div>
					<label class="he-switch"><input type="checkbox" id="he-countin"><span>Count me in with a bar of sticks</span></label>
				</section>

				<section class="he-panel" id="he-mix" aria-labelledby="he-h-mix">
					<div class="he-ask-head"><h2 class="he-h" id="he-h-mix">The mix</h2><p class="he-small" id="he-mix-sum"></p></div>
					<p class="he-small">What can come up, and what you choose between. A change takes effect on the next loop.</p>
					<div class="he-set"><p class="he-kicker">Start from</p><div class="he-togs" id="he-presets"></div></div>
					<div class="he-set"><p class="he-kicker">Elements</p><div class="he-stages" id="he-stages"></div></div>
					<div class="he-set"><p class="he-kicker">Home</p><div class="he-togs" id="he-homecue"></div><p class="he-small" id="he-homecue-note"></p></div>
					<div class="he-set"><button type="button" class="he-btn is-quiet" id="he-mix-link">Copy a link to this mix</button><p class="he-small">The link opens the Dojo asking the same thing of the same elements. Put it in session notes or send it to a pupil.</p></div>
					<div class="he-set"><p class="he-kicker">Where home can be, in the cycle of fourths</p><div class="he-togs" id="he-keys"></div><div class="he-togs" id="he-key-sets"></div><p class="he-small" id="he-keys-note" hidden>A dot marks the notes for home and the tempos with recorded loops.</p></div>
					<div class="he-set"><p class="he-kicker">Tempo</p><div class="he-togs" id="he-tempos"></div></div>
					<div class="he-set"><p class="he-kicker">Feel</p><div class="he-togs" id="he-feels"></div></div>
					<div class="he-set"><p class="he-kicker">Voicing</p><div class="he-togs" id="he-voicing"></div><p class="he-small" id="he-voicing-note" hidden>This is for the house band. A recording plays as it was recorded.</p></div>
					<div class="he-set" id="he-sound-set" hidden><p class="he-kicker">Who plays</p><div class="he-togs" id="he-sound"></div><p class="he-small">A loop can have several versions: each recording, and the house band. One is picked at random each time.</p></div>
					<details class="he-fold" id="he-band-fold">
						<summary><span class="he-h">The house band</span><span class="he-small" id="he-band-sum"></span></summary>
						<div class="he-fold-body">
							<p class="he-small">The app's own players. Each loop gets a chord sound, a kit and a groove picked from the ones switched on here, and not the ones you just heard.</p>
							<div class="he-set"><p class="he-kicker">How the chords are played</p><div class="he-togs" id="he-playing"></div><p class="he-small" id="he-playing-note"></p></div>
							<div class="he-set"><p class="he-kicker">Chord sounds</p><div class="he-groups" id="he-players"></div></div>
							<div class="he-set"><p class="he-kicker">Drum kits</p><div class="he-togs" id="he-kits"></div><p class="he-small">Every feel has three grooves, and is played on whichever of these kits suit it.</p></div>
						</div>
					</details>
				</section>

				<section class="he-panel" aria-labelledby="he-h-rec">
					<div class="he-ask-head"><h2 class="he-h" id="he-h-rec">Your record</h2><p class="he-small" id="he-rec-sum"></p></div>
					<dl class="he-tiles" id="he-rec-tiles"></dl>
					<ul class="he-rec" id="he-rec-list"></ul>
					<p class="he-small" id="he-rec-mix"></p>
					<p class="he-small" id="he-rec-drills"></p>
					<label class="he-switch" id="he-share-row" hidden><input type="checkbox" id="he-share"><span>Share my record with Jack</span></label>
					<p class="he-small" id="he-share-note"></p>
					<div class="he-togs" id="he-rec-tools"></div>
				</section>

				<section class="he-behind" id="he-behind" hidden>
					<p class="he-kicker">Only you see this</p>
					<p class="he-small" id="he-lib-sum"></p>
					<pre id="he-files"></pre>
					<p class="he-small"><a href="<?php echo esc_url( admin_url( 'admin.php?page=lbs-portal-settings#harmonic' ) ); ?>">The loops and their names, in Portal settings</a></p>
				</section>
			</div>
		</div>
		</div>

		<p class="he-note" id="he-note" hidden><b id="he-note-label">Loops</b><span id="he-note-text"></span></p>

		<?php // Play, stop and the next step, in reach of a thumb once the big button has scrolled away. ?>
		<div class="he-dock" id="he-dock" role="group" aria-label="This loop" hidden>
			<button type="button" class="he-dock-go" id="he-dock-go" aria-pressed="false" aria-label="Play the loop"><i aria-hidden="true"></i></button>
			<p class="he-dock-text"><span class="he-kicker" id="he-dock-kicker"></span><b id="he-dock-line"></b></p>
			<button type="button" class="he-btn" id="he-dock-act">Check</button>
		</div>
	</div>
	<?php
}

/* -------------------------------------------------------------------------
 * Admin: the box on Portal settings, and a member's record on their page.
 * The names are read by the same script the trainer uses, so what is shown
 * here is what the trainer makes of each file.
 * ---------------------------------------------------------------------- */

add_action( 'admin_enqueue_scripts', function ( $hook ) {
	if ( false === strpos( (string) $hook, 'lbs-portal-settings' ) && false === strpos( (string) $hook, 'lbs-members' ) ) { return; }
	$base = LBS_URL . 'assets/harmonic/';
	$deps = array();
	foreach ( array( 'he-catalogue', 'he-library', 'he-trainer' ) as $name ) {
		wp_enqueue_script( 'lbs-' . $name, $base . $name . '.js', $deps, LBS_VERSION, true );
		$deps = array( 'lbs-' . $name );
	}
	wp_enqueue_script( 'lbs-harmonic-admin', $base . 'harmonic-admin.js', $deps, LBS_VERSION, true );
} );

/** The published page with the trainer on it, or ''. */
function lbs_harmonic_page_url() {
	return (string) apply_filters( 'lbs_harmonic_url', '' );
}

function lbs_he_admin_box() {
	$ready   = lbs_nc_ready();
	$listing = $ready ? lbs_he_listing() : lbs_he_blank();
	$page    = lbs_harmonic_page_url();
	$paths   = array();
	foreach ( $listing['files'] as $file ) { $paths[] = $file[0]; }
	?>
	<h2 id="harmonic">Harmonic Elements: the Guide and the Dojo</h2>
	<?php if ( ! lbs_he_live() ) : ?>
		<div class="notice notice-info inline"><p><strong>Not launched yet.</strong> Only you, signed in, can open it. Everyone else sees the Coming Soon page, and no loops are sent to them. Launch it under Appearance → Leith Bass Content → Harmonic Elements.</p></div>
	<?php endif; ?>
	<p>The trainer plays a chord loop and a drum loop together, read straight from <code><?php echo esc_html( lbs_he_root() ); ?></code> in Nextcloud. Nothing is copied to the website.<?php if ( $page ) : ?> <a href="<?php echo esc_url( $page ); ?>" target="_blank" rel="noopener">Open the trainer</a>.<?php endif; ?></p>
	<p class="description" style="max-width:48rem">Every loop can also be played by the house band: the app's own instruments and drum kits, which need nothing from Nextcloud. A recording here is one more version of its loop, heard as well as the house band, never instead of it.</p>
	<p><code>Chords/90bpm/C/&hellip;/Major I - Major IV.mp3</code> &nbsp; <code>Drums/90bpm/Neo soul (1).mp3</code></p>
	<p class="description" style="max-width:48rem">A tempo folder and (for chords) a tone centre folder say what's inside them; any folders below those are yours to arrange. A chord loop is named by its element ("Dorian lean", "Pop axis") or by its chords as roman numerals ("ii-V-I", "Minor I - Major bVI"). Several files can be the same loop: each is a version, and one is picked at random. Start a folder or file name with an underscore to keep it out while you work on it. Loops can be any whole number of bars.</p>
	<?php if ( ! $ready ) : ?>
		<p><em>Connect Nextcloud above first.</em></p>
	<?php else : ?>
		<?php if ( $listing['error'] ) : ?>
			<div class="notice notice-error inline"><p><?php echo esc_html( $listing['error'] ); ?><?php echo $paths ? ' The trainer is carrying on with the loops it found last time.' : ''; ?></p></div>
		<?php endif; ?>
		<?php if ( ! $listing['complete'] ) : ?>
			<div class="notice notice-warning inline"><p>The folder took too long to read all the way through, so some loops may be missing. Refresh to try again.</p></div>
		<?php endif; ?>
		<div id="lbs-he-summary" data-files="<?php echo esc_attr( wp_json_encode( $paths, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) ); ?>" data-other="<?php echo esc_attr( wp_json_encode( $listing['other'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) ); ?>">
			<p><?php echo (int) count( $paths ); ?> audio <?php echo 1 === count( $paths ) ? 'file' : 'files'; ?> found.</p>
		</div>
		<p class="description">
			<?php if ( $listing['scanned'] ) : ?>Last checked <?php echo esc_html( human_time_diff( $listing['scanned'] ) ); ?> ago<?php echo $listing['requests'] ? ' (' . esc_html( $listing['took'] ) . 's, ' . ( 1 === (int) $listing['requests'] ? 'one request' : (int) $listing['requests'] . ' requests' ) . ' to Nextcloud)' : ''; ?>. <?php endif; ?>
			The list refreshes itself every 15 minutes while the trainer is in use.
		</p>
	<?php endif; ?>
	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="lbs-inline-form">
		<input type="hidden" name="action" value="lbs_he_refresh">
		<?php wp_nonce_field( 'lbs_he_refresh' ); ?>
		<button type="submit" class="button">Refresh the loops now</button>
	</form>
	<?php
}

add_action( 'admin_post_lbs_he_refresh', function () {
	lbs_admin_guard( 'lbs_he_refresh' );
	delete_transient( 'lbs_he_scanning' );
	$listing = lbs_nc_ready() ? lbs_he_listing( 'now' ) : null;
	if ( ! $listing ) {
		$args = array( 'lbs_msg' => rawurlencode( 'Connect Nextcloud first.' ) );
	} elseif ( $listing['error'] ) {
		$args = array( 'lbs_msg' => rawurlencode( $listing['error'] ) );
	} else {
		$n    = count( $listing['files'] );
		$args = array( 'lbs_msg' => rawurlencode( sprintf( 'Found %d audio %s in %s.', $n, 1 === $n ? 'file' : 'files', $listing['root'] ) ), 'lbs_ok' => 1 );
	}
	wp_safe_redirect( add_query_arg( $args, admin_url( 'admin.php?page=lbs-portal-settings#harmonic' ) ) );
	exit;
} );

/** A member's record, on their page in Members. Shown only if they share it. */
function lbs_he_member_card( $uid ) {
	$rec = lbs_he_record( $uid );
	if ( ! $rec['log'] && ! $rec['share'] ) { return; }
	?>
	<section class="lbs-card" id="harmonic">
		<h2>Harmonic Elements</h2>
		<?php if ( ! $rec['share'] ) : ?>
			<p class="description">They've used the ear trainer and keep their record to themselves.</p>
		<?php elseif ( ! $rec['log'] ) : ?>
			<p class="description">Sharing is on, and they haven't answered a loop yet.</p>
		<?php else : ?>
			<div id="lbs-he-record" data-log="<?php echo esc_attr( wp_json_encode( $rec['log'] ) ); ?>"><p class="description"><?php echo (int) count( $rec['log'] ); ?> loops answered.</p></div>
		<?php endif; ?>
	</section>
	<?php
}
