<?php
/**
 * Plugin Name: Leith Bass Members
 * Plugin URI: https://leithbass.space/members/
 * Description: The invite-only member portal for The Leith Bass Space: session notes, bookings, lesson credit, the Shed (practice tools and a shared library), Ear Training for Bass Players, Harmonic Elements (the Guide and the Dojo), and a home-screen app with a room for each. Works with the Leith Bass Space theme.
 * Version: 1.13.0-alpha.9
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Author: Jack Elliot
 * License: GPL v2 or later
 * Text Domain: leithbass-members
 *
 * @package LeithBassMembers
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

// The 3.6.0 theme carried this code itself. If it's still active, stand
// down rather than load twice, and say so.
if ( function_exists( 'lbs_settings' ) ) {
	add_action( 'admin_notices', function () {
		echo '<div class="notice notice-error"><p><strong>Leith Bass Members is waiting.</strong> Update the Leith Bass Space theme to 3.6.1 or later first; the older theme includes the portal itself. Your member data is safe either way.</p></div>';
	} );
	return;
}

define( 'LBS_VERSION', '1.13.0-alpha.9' );
define( 'LBS_DIR', plugin_dir_path( __FILE__ ) );
define( 'LBS_URL', plugin_dir_url( __FILE__ ) );
define( 'LBS_FILE', __FILE__ );

foreach ( array( 'core', 'ledger', 'practice', 'nextcloud', 'auth', 'files', 'mail', 'rest', 'sessions', 'privacy', 'pwa', 'library', 'gcal', 'demo', 'harmonic', 'ear', 'read', 'rooms' ) as $lbs_file ) {
	require_once LBS_DIR . 'includes/' . $lbs_file . '.php';
}
if ( is_admin() ) {
	require_once LBS_DIR . 'includes/admin.php';
	require_once LBS_DIR . 'includes/gcal-admin.php';
}
unset( $lbs_file );

register_activation_hook( __FILE__, function () {
	if ( ! get_role( LBS_ROLE ) ) { add_role( LBS_ROLE, 'Member', array( 'read' => true ) ); }
	lbs_add_rewrites();
	flush_rewrite_rules( false );
} );

register_deactivation_hook( __FILE__, function () {
	wp_clear_scheduled_hook( 'lbs_portal_hourly' );
	wp_clear_scheduled_hook( 'lbs_gcal_cron' );
	wp_clear_scheduled_hook( 'lbs_he_refresh' );
	flush_rewrite_rules( false );
} );

/** Portal styles and script, only on portal pages. */
add_action( 'wp_enqueue_scripts', function () {
	if ( ! lbs_is_portal() ) { return; }
	wp_enqueue_style( 'lbs-portal', LBS_URL . 'assets/portal.css', wp_style_is( 'leithbass', 'registered' ) ? array( 'leithbass' ) : array(), LBS_VERSION );
	$room = lbs_portal_room();
	if ( $room ) {
		// A room of the app: the trainer brings its own scripts; the portal's only keeps the app working
		// (its offline store, and the line that says there's no signal).
		wp_enqueue_script( 'lbs-portal', LBS_URL . 'assets/portal.js', array(), LBS_VERSION, array( 'strategy' => 'defer', 'in_footer' => true ) );
		$member = lbs_portal_member_id();
		$data   = array(
			'sw'       => lbs_portal_url( 'sw' ),
			'scope'    => wp_parse_url( lbs_portal_url(), PHP_URL_PATH ),
			'signedIn' => true,
			'user'     => lbs_portal_is_preview() ? 0 : $member,
			'readOnly' => lbs_portal_is_preview(),
			'room'     => $room,
		);
		wp_add_inline_script( 'lbs-portal', 'window.LBS=' . wp_json_encode( $data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_SLASHES ) . ';', 'before' );
		return;
	}
	wp_enqueue_script( 'lbs-drone', LBS_URL . 'assets/shed-drone.js', array(), LBS_VERSION, array( 'strategy' => 'defer', 'in_footer' => true ) );
	wp_enqueue_script( 'lbs-metronome', LBS_URL . 'assets/shed-metronome.js', array(), LBS_VERSION, array( 'strategy' => 'defer', 'in_footer' => true ) );
	wp_enqueue_script( 'lbs-tuner', LBS_URL . 'assets/shed-tuner.js', array(), LBS_VERSION, array( 'strategy' => 'defer', 'in_footer' => true ) );
	wp_enqueue_script( 'lbs-portal', LBS_URL . 'assets/portal.js', array( 'lbs-drone', 'lbs-metronome', 'lbs-tuner' ), LBS_VERSION, array( 'strategy' => 'defer', 'in_footer' => true ) );

	$member = lbs_portal_member_id();
	$data   = array(
		'rest'     => esc_url_raw( rest_url( 'lbs/v1/' ) ),
		'ajax'     => admin_url( 'admin-ajax.php' ),
		'sw'       => lbs_portal_url( 'sw' ),
		'scope'    => wp_parse_url( lbs_portal_url(), PHP_URL_PATH ),
		'signedIn' => (bool) $member,
	) + lbs_shed_sound_data(); // where the metronome's sounds are (nothing there is fetched until it is opened)
	if ( $member ) {
		$preview = lbs_portal_is_preview();
		$latest  = lbs_latest_notes( $member );
		$limits  = lbs_recording_limits( $member );
		$up      = lbs_upcoming( $member );
		$data   += array(
			'user'       => $preview ? 0 : $member,
			'nonce'      => wp_create_nonce( 'wp_rest' ),
			'readOnly'   => $preview,
			'today'      => lbs_today(),
			'state'      => lbs_pr_view( $member, $preview ? 'jack' : 'member' ),
			'tools'      => lbs_pr_tools(),
			'objectives' => $latest ? $latest['objectives'] : array(),
			'sets'       => $latest ? $latest['sets'] : array(),
			'since'      => $latest ? $latest['date'] : '',
			'sinceLabel' => $latest ? strtolower( lbs_session_label( $latest ) ) : 'your last session',
			'next'       => $up ? lbs_when( $up[0] ) : '',
			'nextDate'   => $up ? $up[0]['date'] : '',
			'revisit'    => lbs_revisit_objectives( $member, $latest ),
			'maxUpload'  => $limits['max'],
			'spaceLeft'  => $limits['left'],
			'ncReady'    => lbs_nc_ready(),
			'prefetch'   => $latest ? array_values( array_filter( array_map( function ( $i ) use ( $latest ) {
				return 'pdf' === lbs_file_kind( $latest['files'][ $i ] ) ? lbs_file_url( $latest['id'], $i ) : null;
			}, array_keys( $latest['files'] ) ) ) ) : array(),
		);
	}
	// Today on Home (1.13.0): one row that opens each room's own Today's set. Only rooms this member can use.
	if ( function_exists( 'lbs_portal_rooms' ) && ! empty( $data['signedIn'] ) ) {
		$today_at = array( 'ear-training' => '#today', 'elements' => '#dojo/today', 'read' => '#dojo/today' );
		$data['todays'] = array();
		foreach ( lbs_portal_rooms() as $route => $room ) {
			if ( ! empty( $room['open'] ) && isset( $today_at[ $route ] ) ) {
				$data['todays'][] = array( 'name' => $room['short'], 'url' => lbs_portal_url( $route ) . $today_at[ $route ] );
			}
		}
	}
	// JSON keeps numbers and true/false as they are (wp_localize_script would turn them into strings).
	wp_add_inline_script( 'lbs-portal', 'window.LBS=' . wp_json_encode( $data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_SLASHES ) . ';', 'before' );
}, 20 );

/** "Members" in the theme's navigation (switch off in Portal settings). */
function lbs_nav_enabled() {
	return (bool) lbs_settings()['nav'];
}
