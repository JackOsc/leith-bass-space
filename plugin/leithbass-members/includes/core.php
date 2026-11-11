<?php
/**
 * Core: settings, the Member role, routes, access checks, sessions,
 * objectives, member folders, guardians and preferences.
 *
 * Data lives in WordPress, not in the plugin folder:
 *   - members are users with the "Member" role (lbs_member);
 *   - sessions are a private post type (lbs_session) with meta;
 *   - credit, preferences and the Shed (practice tools) are user meta.
 *
 * @package LeithBassMembers
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'LBS_ROLE', 'lbs_member' );
define( 'LBS_CPT', 'lbs_session' );

/* -------------------------------------------------------------------------
 * Settings
 * ---------------------------------------------------------------------- */

function lbs_settings() {
	$defaults = array(
		'nav'           => 1,
		'nc_url'        => '',
		'nc_user'       => '',
		'nc_pass'       => '',
		'nc_root'       => '/LeithBass/Members',
		'library_root'  => '/LeithBass/Library',
		'he_root'       => '',        // Harmonic Elements loops; blank = "Harmonic Elements" beside the Members folder
		'he_open'       => 'members', // who hears the recorded loops: 'members' or 'everyone'
		'jack_email'    => '',
		'reminder_hour' => 7,
		'digest'        => 1,
		'block_months'  => 4,
		'upload_mb'     => 200,
		'quota_mb'      => 2048,
	);
	$saved = get_option( 'lbs_portal_settings', array() );
	return wp_parse_args( is_array( $saved ) ? $saved : array(), $defaults );
}

/** Where portal notifications for Jack go. */
function lbs_jack_email() {
	$s     = lbs_settings();
	$email = sanitize_email( $s['jack_email'] );
	if ( ! $email && function_exists( 'leithbass_val' ) ) { $email = sanitize_email( leithbass_val( 'contact_email' ) ); }
	return $email ? $email : get_option( 'admin_email' );
}

/** The studio address used in bookings and calendar files. */
function lbs_studio_address() {
	$addr = function_exists( 'leithbass_val' ) ? trim( wp_strip_all_tags( leithbass_val( 'studio_address' ) ) ) : '';
	return 'Lost Oscillation' . ( $addr ? ', ' . $addr : '' );
}

/* -------------------------------------------------------------------------
 * Role and access
 * ---------------------------------------------------------------------- */

add_action( 'init', function () {
	if ( ! get_role( LBS_ROLE ) ) {
		add_role( LBS_ROLE, 'Member', array( 'read' => true ) );
	}
}, 1 );

function lbs_is_member( $user_id = 0 ) {
	$user = $user_id ? get_userdata( $user_id ) : wp_get_current_user();
	return $user && $user->exists() && in_array( LBS_ROLE, (array) $user->roles, true );
}

function lbs_members() {
	return get_users( array( 'role' => LBS_ROLE, 'orderby' => 'display_name', 'order' => 'ASC' ) );
}

function lbs_member_disabled( $user_id ) {
	return (bool) get_user_meta( $user_id, '_lbs_disabled', true );
}

/**
 * The one access rule used everywhere: pages, files, calendars, the API and
 * password setting. A member whose access is switched off gets nothing.
 */
function lbs_can_access( $user_id ) {
	if ( ! $user_id ) { return false; }
	return ( lbs_is_member( $user_id ) && ! lbs_member_disabled( $user_id ) ) || lbs_admin_self( $user_id );
}

/**
 * Your own app (1.12.0). An administrator who switches it on (Members, Portal
 * settings, "Your own app") uses /members/ as a member does: their own Shed,
 * their own record in every room, and every room whether it has been launched
 * or not. They are still not a member: they are not in the members list, the
 * digests or the session screens, and previewing a member (?as=) works as
 * before. It is for Jack, to use and test the app as himself.
 */
function lbs_admin_self( $user_id = 0 ) {
	$user_id = $user_id ? (int) $user_id : get_current_user_id();
	return $user_id && user_can( $user_id, 'manage_options' ) && (bool) get_user_meta( $user_id, '_lbs_self', true );
}

function lbs_first_name( $user_id ) {
	$first = trim( (string) get_user_meta( $user_id, 'first_name', true ) );
	if ( $first ) { return $first; }
	$user  = get_userdata( $user_id );
	$parts = preg_split( '/\s+/', $user ? trim( $user->display_name ) : '' );
	return $parts && $parts[0] ? $parts[0] : 'there';
}

/* -------------------------------------------------------------------------
 * Routes
 * ---------------------------------------------------------------------- */

function lbs_portal_routes() {
	// ('harmonic' and 'loop' are Harmonic Elements' recorded loops; 'ear-training', 'elements' and 'read' are the app's rooms)
	return array( 'home', 'set-password', 'reset', 'file', 'ics', 'calendar', 'signout', 'manifest', 'sw', 'harmonic', 'loop', 'ear-training', 'elements', 'read' );
}

function lbs_add_rewrites() {
	add_rewrite_rule( '^members/?$', 'index.php?lbs_portal=home', 'top' );
	add_rewrite_rule( '^members/(set-password|reset|file|ics|calendar|signout|harmonic|loop|ear-training|elements|read)/?$', 'index.php?lbs_portal=$matches[1]', 'top' );
	add_rewrite_rule( '^members/manifest\.webmanifest$', 'index.php?lbs_portal=manifest', 'top' );
	add_rewrite_rule( '^members/sw\.js$', 'index.php?lbs_portal=sw', 'top' );
}

add_action( 'init', function () {
	lbs_add_rewrites();
	if ( get_option( 'lbs_portal_rewrite' ) !== LBS_VERSION ) {
		flush_rewrite_rules( false );
		update_option( 'lbs_portal_rewrite', LBS_VERSION );
	}
}, 20 );

add_filter( 'query_vars', function ( $vars ) {
	$vars[] = 'lbs_portal';
	return $vars;
} );

function lbs_portal_route() {
	$route = (string) get_query_var( 'lbs_portal' );
	return in_array( $route, lbs_portal_routes(), true ) ? $route : '';
}

/* A signed-in portal page leaves the website's footer out (1.3.0). */
add_filter( 'body_class', function ( $classes ) {
	if ( function_exists( 'lbs_is_portal' ) && lbs_is_portal() && lbs_portal_member_id() && ! in_array( lbs_portal_route(), array( 'set-password', 'reset' ), true ) ) { $classes[] = 'lbs-dash'; }
	return $classes;
} );

function lbs_is_portal() {
	return '' !== lbs_portal_route();
}

function lbs_portal_url( $route = 'home', $args = array() ) {
	if ( get_option( 'permalink_structure' ) ) {
		$paths = array( 'home' => '', 'manifest' => 'manifest.webmanifest', 'sw' => 'sw.js' );
		$url   = home_url( '/members/' . ( isset( $paths[ $route ] ) ? $paths[ $route ] : $route . '/' ) );
	} else {
		$url = add_query_arg( 'lbs_portal', $route, home_url( '/' ) );
	}
	return $args ? add_query_arg( $args, $url ) : $url;
}

add_filter( 'posts_pre_query', function ( $posts, $query ) {
	return ( $query->is_main_query() && $query->get( 'lbs_portal' ) ) ? array() : $posts;
}, 10, 2 );
add_filter( 'pre_handle_404', function ( $pre, $query ) {
	return $query->get( 'lbs_portal' ) ? true : $pre;
}, 10, 2 );
add_filter( 'redirect_canonical', function ( $redirect ) {
	return lbs_is_portal() ? false : $redirect;
} );

// Endpoints that answer without a page.
add_action( 'template_redirect', function () {
	$route = lbs_portal_route();
	if ( '' === $route ) { return; }
	if ( 'manifest' === $route ) { lbs_serve_manifest(); exit; }
	if ( 'sw' === $route ) { lbs_serve_sw(); exit; }
	// The ear trainer's loop list and its loops. These set their own caching.
	if ( 'harmonic' === $route ) { lbs_he_serve_listing(); exit; }
	if ( 'loop' === $route ) { lbs_he_serve_loop(); exit; }
	nocache_headers();
	header( 'X-Robots-Tag: noindex, nofollow', true );
	if ( 'file' === $route ) { lbs_serve_file(); exit; }
	if ( 'ics' === $route ) { lbs_serve_ics(); exit; }
	if ( 'calendar' === $route ) { lbs_serve_calendar_feed(); exit; }
	if ( 'signout' === $route ) { lbs_signout(); exit; }
}, 1 );

add_filter( 'template_include', function ( $template ) {
	return lbs_is_portal() ? LBS_DIR . 'templates/portal.php' : $template;
}, 99 );

add_filter( 'wp_robots', function ( $robots ) {
	return lbs_is_portal() ? array( 'noindex' => true, 'nofollow' => true ) : $robots;
}, 20 );

add_filter( 'pre_get_document_title', function ( $title ) {
	return lbs_is_portal() ? 'Members | The Leith Bass Space' : $title;
}, 20 );

/* -------------------------------------------------------------------------
 * Who is the portal showing?
 * ---------------------------------------------------------------------- */
function lbs_portal_member_id() {
	if ( ! is_user_logged_in() ) { return 0; }
	$me = get_current_user_id();
	if ( lbs_is_member( $me ) ) { return lbs_can_access( $me ) ? $me : 0; }
	if ( current_user_can( 'manage_options' ) && isset( $_GET['as'] ) ) {
		$as = absint( $_GET['as'] );
		if ( $as && lbs_is_member( $as ) ) { return $as; }
	}
	// an administrator using the app as themselves
	if ( lbs_admin_self( $me ) ) { return $me; }
	return 0;
}

function lbs_portal_is_preview() {
	if ( ! is_user_logged_in() || lbs_is_member() || ! current_user_can( 'manage_options' ) ) { return false; }
	// using the app as themselves, an administrator only previews when looking at someone else's portal
	if ( lbs_admin_self() ) { return lbs_portal_member_id() !== get_current_user_id(); }
	return true;
}

/* -------------------------------------------------------------------------
 * Small helpers
 * ---------------------------------------------------------------------- */

function lbs_lines( $text ) {
	$out = array();
	foreach ( preg_split( '/\r\n|\r|\n/', (string) $text ) as $line ) {
		$line = trim( preg_replace( '/^\s*(?:[-*•]|\d+[.)])\s+/u', '', $line ) );
		if ( '' !== $line ) { $out[] = $line; }
	}
	return $out;
}

function lbs_dt( $date, $time = '12:00' ) {
	try {
		return new DateTimeImmutable( $date . ' ' . ( $time ? $time : '12:00' ), wp_timezone() );
	} catch ( Exception $e ) {
		return new DateTimeImmutable( 'now', wp_timezone() );
	}
}

function lbs_today() {
	return wp_date( 'Y-m-d' );
}

function lbs_valid_date( $date ) {
	return is_string( $date ) && preg_match( '/^\d{4}-\d{2}-\d{2}$/', $date ) && checkdate( (int) substr( $date, 5, 2 ), (int) substr( $date, 8, 2 ), (int) substr( $date, 0, 4 ) );
}

/** Hours (float) to whole minutes. */
function lbs_minutes( $hours ) {
	return (int) round( (float) $hours * 60 );
}

/** Minutes to "1h 30m", "45m", "2h". Signed with $sign: "+10h", "−1h". */
function lbs_hm( $minutes, $sign = false ) {
	$minutes = (int) $minutes;
	$neg     = $minutes < 0;
	$m       = abs( $minutes );
	$h       = intdiv( $m, 60 );
	$r       = $m % 60;
	$out     = $h ? $h . 'h' . ( $r ? ' ' . $r . 'm' : '' ) : $r . 'm';
	if ( 0 === $m ) { $out = '0h'; }
	if ( $neg ) { return '−' . $out; }
	return ( $sign && $minutes > 0 ? '+' : '' ) . $out;
}

/** 1 → "1 hour", 1.5 → "1 hour 30 min", 0.75 → "45 min". */
function lbs_length_label( $hours ) {
	$m = lbs_minutes( $hours );
	$h = intdiv( $m, 60 );
	$r = $m % 60;
	if ( ! $h ) { return $r . ' min'; }
	return $h . ' hour' . ( 1 === $h ? '' : 's' ) . ( $r ? ' ' . $r . ' min' : '' );
}

function lbs_hours_short( $hours ) {
	return rtrim( rtrim( number_format( (float) $hours, 2, '.', '' ), '0' ), '.' );
}

function lbs_id() {
	return substr( str_replace( '-', '', wp_generate_uuid4() ), 0, 10 );
}

/* -------------------------------------------------------------------------
 * Sessions
 * ---------------------------------------------------------------------- */

function lbs_statuses() {
	return array(
		'upcoming'          => 'Upcoming',
		'done'              => 'Done',
		'cancelled_free'    => 'Cancelled, not charged',
		'cancelled_charged' => 'Cancelled, charged',
	);
}

/**
 * Objectives with permanent ids. Ticks are stored against the id, so
 * reordering or editing other objectives never moves a tick.
 */
function lbs_session_objectives( $post_id ) {
	$lines = lbs_lines( get_post_meta( $post_id, '_lbs_objectives', true ) );
	$ids   = get_post_meta( $post_id, '_lbs_obj_ids', true );
	$ids   = is_array( $ids ) ? array_values( $ids ) : array();
	$out   = array();
	foreach ( $lines as $i => $text ) {
		$out[] = array( 'id' => isset( $ids[ $i ] ) ? $ids[ $i ] : 'i' . $i, 'text' => $text );
	}
	return $out;
}

/** Save objectives, keeping ids for lines that are unchanged. */
function lbs_save_objectives( $post_id, $lines ) {
	$old    = lbs_session_objectives( $post_id );
	$by_txt = array();
	foreach ( $old as $o ) { $by_txt[ strtolower( $o['text'] ) ][] = $o['id']; }
	$ids = array();
	foreach ( $lines as $line ) {
		$k     = strtolower( $line );
		$ids[] = ! empty( $by_txt[ $k ] ) ? array_shift( $by_txt[ $k ] ) : 'o' . lbs_id();
	}
	update_post_meta( $post_id, '_lbs_objectives', implode( "\n", $lines ) );
	update_post_meta( $post_id, '_lbs_obj_ids', $ids );
}

/**
 * Sets from Jack (1.13.0): links into the app's rooms and tools, written on a session, one per line as
 * "Label | address". A set is how a drill with chosen things in play, or a metronome setup, reaches a member:
 * it shows on their Home as a button.
 *
 * Only addresses on this site are kept, so a set can never send a member somewhere else. A line with no
 * label takes the address's last part as its name. At most eight.
 */
function lbs_session_sets( $lines ) {
	$out  = array();
	$host = wp_parse_url( home_url(), PHP_URL_HOST );
	foreach ( (array) ( is_string( $lines ) ? lbs_lines( $lines ) : $lines ) as $line ) {
		if ( is_array( $line ) ) { $label = (string) ( $line['label'] ?? '' ); $url = (string) ( $line['url'] ?? '' ); }
		else {
			$cut   = strrpos( (string) $line, '|' );
			$label = false === $cut ? '' : trim( substr( $line, 0, $cut ) );
			$url   = trim( false === $cut ? $line : substr( $line, $cut + 1 ) );
		}
		if ( 0 === strpos( $url, '/' ) && 0 !== strpos( $url, '//' ) ) { $url = home_url( $url ); }
		$url   = esc_url_raw( $url, array( 'http', 'https' ) );
		$parts = $url ? wp_parse_url( $url ) : null;
		if ( ! $parts || empty( $parts['host'] ) || strtolower( $parts['host'] ) !== strtolower( (string) $host ) ) { continue; }
		$label = sanitize_text_field( $label );
		if ( '' === $label ) { $label = trim( (string) ( $parts['path'] ?? '' ), '/' ); $label = ucfirst( str_replace( '-', ' ', basename( $label ) ) ) ?: 'Open'; }
		$out[] = array( 'label' => mb_substr( $label, 0, 60 ), 'url' => $url );
		if ( count( $out ) >= 8 ) { break; }
	}
	return $out;
}

function lbs_session( $post_id ) {
	$post_id = (int) $post_id;
	$files   = get_post_meta( $post_id, '_lbs_files', true );
	$status  = (string) get_post_meta( $post_id, '_lbs_status', true );
	$title   = trim( (string) get_post_field( 'post_title', $post_id, 'raw' ) );
	$objs    = lbs_session_objectives( $post_id );
	return array(
		'id'         => $post_id,
		'member'     => (int) get_post_meta( $post_id, '_lbs_member', true ),
		'number'     => (int) get_post_meta( $post_id, '_lbs_number', true ),
		'date'       => (string) get_post_meta( $post_id, '_lbs_date', true ),
		'start'      => (string) get_post_meta( $post_id, '_lbs_start', true ),
		'length'     => (float) get_post_meta( $post_id, '_lbs_length', true ),
		'minutes'    => lbs_minutes( get_post_meta( $post_id, '_lbs_length', true ) ),
		'status'     => isset( lbs_statuses()[ $status ] ) ? $status : 'upcoming',
		'block'      => '1' === (string) get_post_meta( $post_id, '_lbs_block', true ),
		'paid'       => '1' === (string) get_post_meta( $post_id, '_lbs_paid', true ),
		'title'      => ( $title && __( '(no title)' ) !== $title && 'Auto Draft' !== $title ) ? $title : '',
		'summary'    => (string) get_post_meta( $post_id, '_lbs_summary', true ),
		'sets'       => lbs_session_sets( get_post_meta( $post_id, '_lbs_sets', true ) ),
		'objectives' => wp_list_pluck( $objs, 'text' ),
		'obj'        => $objs,
		'files'      => is_array( $files ) ? array_values( $files ) : array(),
		'prep'       => (string) get_post_meta( $post_id, '_lbs_prep', true ),
		'move'       => get_post_meta( $post_id, '_lbs_move_request', true ),
		'published'  => 'publish' === get_post_status( $post_id ),
	);
}

function lbs_session_label( $s ) {
	return $s['number'] ? 'Session ' . $s['number'] : 'Session';
}

function lbs_member_sessions( $user_id, $statuses = null, $include_drafts = false ) {
	$ids = get_posts( array(
		'post_type'      => LBS_CPT,
		'post_status'    => $include_drafts ? array( 'publish', 'draft', 'pending', 'future' ) : 'publish',
		'posts_per_page' => -1,
		'fields'         => 'ids',
		'no_found_rows'  => true,
		'meta_key'       => '_lbs_member',
		'meta_value'     => (int) $user_id,
	) );
	$out = array();
	foreach ( $ids as $id ) {
		$s = lbs_session( $id );
		if ( $statuses && ! in_array( $s['status'], (array) $statuses, true ) ) { continue; }
		$out[] = $s;
	}
	usort( $out, function ( $a, $b ) {
		return strcmp( $a['date'] . ' ' . $a['start'], $b['date'] . ' ' . $b['start'] );
	} );
	return $out;
}

function lbs_upcoming( $user_id ) {
	$today = lbs_today();
	return array_values( array_filter( lbs_member_sessions( $user_id, array( 'upcoming' ) ), function ( $s ) use ( $today ) {
		return $s['date'] >= $today;
	} ) );
}

function lbs_past_sessions( $user_id ) {
	return array_reverse( lbs_member_sessions( $user_id, array( 'done', 'cancelled_free', 'cancelled_charged' ) ) );
}

function lbs_latest_notes( $user_id ) {
	foreach ( lbs_past_sessions( $user_id ) as $s ) {
		if ( 'done' === $s['status'] && ( $s['summary'] || $s['files'] || $s['objectives'] ) ) { return $s; }
	}
	return null;
}

function lbs_next_number( $user_id ) {
	$max = 0;
	foreach ( lbs_member_sessions( $user_id, null, true ) as $s ) { $max = max( $max, $s['number'] ); }
	return $max + 1;
}

/** Other published sessions (any member) that overlap this one. */
function lbs_overlaps( $session ) {
	if ( ! $session['date'] || ! $session['start'] ) { return array(); }
	$start = lbs_dt( $session['date'], $session['start'] )->getTimestamp();
	$end   = $start + max( 15, $session['minutes'] ) * 60;
	$ids   = get_posts( array(
		'post_type'      => LBS_CPT,
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'fields'         => 'ids',
		'no_found_rows'  => true,
		'meta_key'       => '_lbs_date',
		'meta_value'     => $session['date'],
	) );
	$out = array();
	foreach ( $ids as $id ) {
		if ( (int) $id === (int) $session['id'] ) { continue; }
		$o = lbs_session( $id );
		if ( ! $o['start'] || in_array( $o['status'], array( 'cancelled_free', 'cancelled_charged' ), true ) ) { continue; }
		$os = lbs_dt( $o['date'], $o['start'] )->getTimestamp();
		$oe = $os + max( 15, $o['minutes'] ) * 60;
		if ( $os < $end && $oe > $start ) { $out[] = $o; }
	}
	return $out;
}

/* -------------------------------------------------------------------------
 * Member folders in Nextcloud
 *
 * Every member gets a permanent folder name when their account is made,
 * e.g. "Morven Kerr (k4f7q)". It never follows the display name, which the
 * member can change, and no two members can share one.
 * ---------------------------------------------------------------------- */

function lbs_clean_path( $path ) {
	$parts = array();
	foreach ( explode( '/', str_replace( '\\', '/', (string) $path ) ) as $part ) {
		$part = trim( $part );
		if ( '' === $part || '.' === $part || '..' === $part ) { continue; }
		$parts[] = $part;
	}
	return implode( '/', $parts );
}

/** Is this folder name already someone else's? */
function lbs_folder_taken( $folder, $except_user = 0 ) {
	$folder = strtolower( lbs_clean_path( $folder ) );
	foreach ( lbs_members() as $m ) {
		if ( (int) $m->ID === (int) $except_user ) { continue; }
		if ( strtolower( (string) get_user_meta( $m->ID, '_lbs_folder', true ) ) === $folder ) { return true; }
	}
	return false;
}

/** Give a member a permanent, unique folder name. */
function lbs_assign_folder( $user_id, $name = '' ) {
	$user = get_userdata( $user_id );
	$base = trim( preg_replace( '/[^\p{L}\p{N} ._\'-]+/u', '', $name ? $name : ( $user ? $user->display_name : '' ) ) );
	$base = $base ? $base : 'Member';
	do {
		$folder = $base . ' (' . strtolower( wp_generate_password( 5, false, false ) ) . ')';
	} while ( lbs_folder_taken( $folder, $user_id ) );
	update_user_meta( $user_id, '_lbs_folder', $folder );
	return $folder;
}

function lbs_member_folder( $user_id ) {
	$folder = lbs_clean_path( (string) get_user_meta( $user_id, '_lbs_folder', true ) );
	return '' !== $folder ? $folder : lbs_assign_folder( $user_id );
}

function lbs_member_path( $user_id, $file = '' ) {
	$root = lbs_clean_path( lbs_settings()['nc_root'] );
	$path = trim( $root . '/' . lbs_member_folder( $user_id ), '/' );
	if ( '' !== $file ) { $path .= '/' . lbs_clean_path( $file ); }
	return '/' . $path;
}

/* -------------------------------------------------------------------------
 * Guardians, preferences and calendar tokens
 * ---------------------------------------------------------------------- */

/** A parent or guardian who gets copies of the member's emails. */
function lbs_guardian( $user_id ) {
	$email = sanitize_email( (string) get_user_meta( $user_id, '_lbs_guardian_email', true ) );
	return $email ? array( 'email' => $email, 'name' => (string) get_user_meta( $user_id, '_lbs_guardian_name', true ) ) : null;
}

function lbs_prefs( $user_id ) {
	$prefs = get_user_meta( $user_id, '_lbs_prefs', true );
	return wp_parse_args( is_array( $prefs ) ? $prefs : array(), array( 'notes' => 1, 'remind' => 1, 'nudge' => 0, 'low' => 1 ) );
}

function lbs_calendar_token( $user_id, $renew = false ) {
	$token = (string) get_user_meta( $user_id, '_lbs_cal_token', true );
	if ( $renew || strlen( $token ) < 20 ) {
		$token = wp_generate_password( 32, false, false );
		update_user_meta( $user_id, '_lbs_cal_token', $token );
	}
	return $token;
}

function lbs_calendar_url( $user_id ) {
	return lbs_portal_url( 'calendar', array( 't' => lbs_calendar_token( $user_id ), 'u' => (int) $user_id ) );
}

/* -------------------------------------------------------------------------
 * Upgrades from the 3.6.0 theme build
 * ---------------------------------------------------------------------- */

add_action( 'admin_init', 'lbs_maybe_upgrade', 1 );

function lbs_maybe_upgrade() {
	$done = (string) get_option( 'lbs_data_version', '0' );
	if ( version_compare( $done, '1.0.0', '>=' ) ) { return; }

	// Freeze each existing member's folder so a name change can't move it,
	// and flag any two members who resolved to the same folder.
	$seen = array();
	$dups = array();
	foreach ( lbs_members() as $m ) {
		$folder = lbs_clean_path( (string) get_user_meta( $m->ID, '_lbs_folder', true ) );
		if ( '' === $folder ) {
			$folder = lbs_clean_path( $m->display_name );
			update_user_meta( $m->ID, '_lbs_folder', $folder );
		}
		$key = strtolower( $folder );
		if ( isset( $seen[ $key ] ) ) { $dups[] = array( $seen[ $key ], $m->ID ); } else { $seen[ $key ] = $m->ID; }
		lbs_pr_migrate( $m->ID );
	}
	update_option( 'lbs_folder_conflicts', $dups, false );

	// Remember each session's published state, so moves and cancellations
	// of existing bookings are emailed from now on.
	foreach ( get_posts( array( 'post_type' => LBS_CPT, 'post_status' => 'any', 'posts_per_page' => -1, 'fields' => 'ids' ) ) as $id ) {
		if ( '' === get_post_meta( $id, '_lbs_last_status', true ) ) { update_post_meta( $id, '_lbs_last_status', get_post_status( $id ) ); }
	}
	update_option( 'lbs_data_version', '1.0.0', false );
}
