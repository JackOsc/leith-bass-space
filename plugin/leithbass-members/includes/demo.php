<?php
/**
 * Try the Shed (1.3.0, blank start and full screen in 1.4.0): the real Shed
 * tools on the public Shed tools page. Sound only starts when a visitor taps;
 * nothing is saved or sent. The theme calls lbs_shed_demo() where it wants it.
 *
 * The Shed's tools standing on their own (1.8.0): the metronome, the drone and
 * the tuner, each as the whole of a public page, for anyone, with no login.
 * The theme supplies the page; lbs_shed_tool( 'metronome' ) prints the tool.
 *
 * @package LeithBassMembers
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * Where the house band's sounds are, for the Shed's metronome: the clicks pack
 * and the drum kits it shares with Harmonic Elements. Nothing there is fetched
 * until the metronome is opened. Goes into window.LBS wherever that is printed.
 */
function lbs_shed_sound_data() {
	return array(
		'he'  => LBS_URL . 'assets/harmonic/',
		'ver' => LBS_VERSION,
	);
}

/**
 * The demo starts blank, so it feels like the visitor's own Shed: finish a
 * practice and the diary, habit chain and Start with line fill in. Only what
 * needs history to make sense carries an example (one tempo exercise, and two
 * objectives from Jack's notes), and those are labelled as examples.
 */
function lbs_demo_state() {
	$today = lbs_dt( lbs_today() );
	$ago   = function ( $n ) use ( $today ) { return $today->modify( '-' . $n . ' days' )->format( 'Y-m-d' ); };
	return array(
		'tools'      => array_fill_keys( array_keys( lbs_pr_tools() ), true ),
		'share'      => array( 'diary' => true, 'habit' => true, 'tempo' => true, 'listening' => true ),
		'diary'      => array(),
		'habit'      => array( 'days' => 5, 'min' => 15, 'by' => 'jack', 'set' => $today->format( 'Y-m-d' ), 'rest' => array(), 'pause' => null, 'slots' => array(), 'slots_cal' => false ),
		'questions'  => array(),
		'tempo'      => array( array( 'id' => 't1', 'name' => 'Lean vamp in A', 'target' => 96, 'example' => true, 'log' => array( array( $ago( 17 ), 70, 'clean' ), array( $ago( 12 ), 74, 'clean' ), array( $ago( 8 ), 78, 'nearly' ), array( $ago( 5 ), 78, 'clean' ), array( $ago( 1 ), 84, 'nearly' ) ) ) ),
		'songs'      => array(),
		'goals'      => array(),
		'listening'  => array(),
		'recordings' => array(),
		'gear'       => array(),
		'objdone'    => array(),
	);
}

/** A small sample Shelf: one track to play, the rest shown as members-only. */
function lbs_demo_shelf() {
	$track = apply_filters( 'lbs_demo_track_url', LBS_URL . 'assets/demo-vamp-in-a-90bpm.mp3' );
	$lock  = function ( $title, $group = '', $key = '', $bpm = 0, $kind = 'audio' ) { return array( 'title' => $title, 'group' => $group, 'key' => $key, 'bpm' => $bpm, 'kind' => $kind, 'size' => 0, 'new' => false, 'locked' => true, 'url' => '', 'dl' => '' ); };
	return array(
		'ok'       => true,
		'sections' => array(
			array( 'name' => 'Backing tracks', 'items' => array(
				array( 'title' => 'Vamp in A', 'group' => 'Try it', 'key' => 'A minor', 'bpm' => 90, 'kind' => 'audio', 'size' => 256776, 'new' => true, 'url' => $track, 'dl' => $track ),
				$lock( 'Blues in F', '', 'F', 90 ),
				$lock( 'Lean vamp', 'Lean and Pull', "E\u{266D}", 80 ),
			) ),
			array( 'name' => 'Drones and course', 'items' => array(
				$lock( 'D drone', 'Drones' ),
				$lock( 'Lean and Pull', 'Harmonic Elements, unit 1', '', 0, 'pdf' ),
				$lock( 'What\'s Going On, bass', 'Transcriptions', '', 0, 'pdf' ),
			) ),
		),
		'grooves'  => array(),
		'kit'      => array(),
	);
}

/**
 * Which demo this page shows: false, 'frame' (inside a page, in a phone frame)
 * or 'full' (the whole screen, like the app). The theme's Shed tools page says
 * so through the lbs_demo_page filter; true means 'frame'.
 */
function lbs_demo_mode() {
	$mode = apply_filters( 'lbs_demo_page', is_page_template( 'page-templates/template-shed.php' ) );
	if ( ! $mode ) { return false; }
	return 'full' === $mode ? 'full' : 'frame';
}
function lbs_demo_page() { return (bool) lbs_demo_mode(); }
add_action( 'wp_enqueue_scripts', function () { $m = lbs_demo_mode(); if ( $m ) { lbs_shed_demo_enqueue( $m ); } }, 20 );

function lbs_shed_demo_enqueue( $mode = 'frame' ) {
	static $done = false;
	if ( $done ) { return; }
	$done  = true;
	$today = lbs_today();
	wp_enqueue_style( 'lbs-portal', LBS_URL . 'assets/portal.css', wp_style_is( 'leithbass', 'registered' ) ? array( 'leithbass' ) : array(), LBS_VERSION );
	wp_enqueue_script( 'lbs-drone', LBS_URL . 'assets/shed-drone.js', array(), LBS_VERSION, array( 'in_footer' => true ) );
	wp_enqueue_script( 'lbs-metronome', LBS_URL . 'assets/shed-metronome.js', array(), LBS_VERSION, array( 'in_footer' => true ) );
	wp_enqueue_script( 'lbs-tuner', LBS_URL . 'assets/shed-tuner.js', array(), LBS_VERSION, array( 'in_footer' => true ) );
	wp_enqueue_script( 'lbs-portal', LBS_URL . 'assets/portal.js', array( 'lbs-drone', 'lbs-metronome', 'lbs-tuner' ), LBS_VERSION, array( 'in_footer' => true ) );
	$data = array(
		'demo'       => true,
		'demoFull'   => 'full' === $mode,
		'signedIn'   => false,
		'user'       => 0,
		'readOnly'   => false,
		'today'      => $today,
		'state'      => lbs_demo_state(),
		'tools'      => lbs_pr_tools(),
		'objectives' => apply_filters( 'lbs_demo_objectives', array( 'Lean and Pull vamps in three new keys', 'Name home before naming any chord' ) ),
		'revisit'    => array(),
		'since'      => '',
		'sinceLabel' => 'your last session',
		'next'       => '',
		'nextDate'   => '',
		'ncReady'    => false,
		'maxUpload'  => 0,
		'spaceLeft'  => 0,
		'demoShelf'  => lbs_demo_shelf(),
	) + lbs_shed_sound_data();
	wp_add_inline_script( 'lbs-portal', 'window.LBS=' . wp_json_encode( $data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_SLASHES ) . ';', 'before' );
}

/**
 * The markup. Call it where the demo should appear: lbs_shed_demo() inside a
 * page, or lbs_shed_demo( 'full' ) for a page that is only the demo.
 */
function lbs_shed_demo( $mode = 'frame' ) {
	static $shown = false;
	if ( $shown ) { return; }
	$shown = true;
	$mode  = 'full' === $mode ? 'full' : 'frame';
	lbs_shed_demo_enqueue( $mode );
	echo '<div class="mp mp-demo' . ( 'full' === $mode ? ' mp-demo-full' : '' ) . '"><div class="mp-demo-screen" tabindex="-1"><div class="mp-demo-room" id="mp-practice"></div>'
		. '<div class="mp-toast" id="mp-toast" role="status" aria-live="polite"><span data-toast-text></span><button type="button" class="mp-toast-undo" data-undo hidden>Undo</button></div></div></div>';
}

/* -------------------------------------------------------------------------
 * The tools standing on their own (1.8.0)
 * ---------------------------------------------------------------------- */

/** The tools that can stand on a page of their own: none of them needs to know who is using it. */
function lbs_shed_solo_tools() {
	return array( 'metronome', 'drone', 'tuner' );
}

/** Where "there is more in the Shed" points: the theme's Shed page, unless a filter says otherwise. */
function lbs_shed_url() {
	return apply_filters( 'lbs_shed_url', home_url( '/shed/' ) );
}

/**
 * A page can say which tool it shows through the lbs_shed_tool_page filter
 * (return 'metronome', 'drone' or 'tuner'), and the styles and scripts are
 * then enqueued in good time. Calling lbs_shed_tool_enqueue() from the
 * theme's own wp_enqueue_scripts does the same. Under the tool there is a
 * line saying there is more in the Shed, with a link (lbs_shed_url filter);
 * a page that says so in its own words can return false from the
 * lbs_shed_tool_more filter to leave the line out.
 */
add_action( 'wp_enqueue_scripts', function () {
	$tool = apply_filters( 'lbs_shed_tool_page', '' );
	if ( $tool ) { lbs_shed_tool_enqueue( $tool ); }
}, 20 );

/**
 * Styles, scripts and settings for one tool on a page of its own. Only the
 * engine that tool needs is loaded beside the app, all of it deferred, so
 * nothing holds up the page being drawn. One tool to a page.
 */
function lbs_shed_tool_enqueue( $tool ) {
	static $done = false;
	if ( $done || ! in_array( $tool, lbs_shed_solo_tools(), true ) ) { return; }
	$done   = true;
	$engine = array( 'metronome' => 'shed-metronome', 'drone' => 'shed-drone', 'tuner' => 'shed-tuner' );
	$tools  = lbs_pr_tools();
	$defer  = array( 'strategy' => 'defer', 'in_footer' => true );
	wp_enqueue_style( 'lbs-portal', LBS_URL . 'assets/portal.css', wp_style_is( 'leithbass', 'registered' ) ? array( 'leithbass' ) : array(), LBS_VERSION );
	wp_enqueue_script( 'lbs-' . $tool, LBS_URL . 'assets/' . $engine[ $tool ] . '.js', array(), LBS_VERSION, $defer );
	wp_enqueue_script( 'lbs-portal', LBS_URL . 'assets/portal.js', array( 'lbs-' . $tool ), LBS_VERSION, $defer );
	$data = array(
		'solo'     => $tool,
		'signedIn' => false,
		'user'     => 0,
		'readOnly' => false,
		'today'    => lbs_today(),
		'state'    => array( 'tools' => array( $tool => true ) ),
		'tools'    => array( $tool => $tools[ $tool ] ),
		'ncReady'  => false,
		// The line under the tool that says there is more in the Shed. A page that says so itself can turn it off.
		'shedUrl'  => apply_filters( 'lbs_shed_tool_more', true, $tool ) ? esc_url_raw( lbs_shed_url() ) : '',
	) + lbs_shed_sound_data();
	wp_add_inline_script( 'lbs-portal', 'window.LBS=' . wp_json_encode( $data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_SLASHES ) . ';', 'before' );
}

/**
 * The markup. Call it where the tool should appear: lbs_shed_tool( 'metronome' ).
 * Until the script has run it says what the tool is and that it is loading;
 * without JavaScript it says so.
 */
function lbs_shed_tool( $tool ) {
	static $shown = false;
	if ( $shown || ! in_array( $tool, lbs_shed_solo_tools(), true ) ) { return; }
	$shown = true;
	lbs_shed_tool_enqueue( $tool );
	$tools = lbs_pr_tools();
	$name  = $tools[ $tool ][0];
	echo '<div class="mp mp-solo mp-solo-' . esc_attr( $tool ) . '"><div class="mp-solo-room" id="mp-practice">'
		. '<div class="mp-solo-wait"><p class="mp-solo-name">' . esc_html( $name ) . '</p><p>Loading the ' . esc_html( strtolower( $name ) ) . '.</p></div>'
		. '<noscript><p>The ' . esc_html( strtolower( $name ) ) . ' needs JavaScript switched on.</p></noscript>'
		. '</div><div class="mp-toast" id="mp-toast" role="status" aria-live="polite"><span data-toast-text></span><button type="button" class="mp-toast-undo" data-undo hidden>Undo</button></div></div>';
}
