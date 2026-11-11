<?php
/**
 * The members' app in rooms (1.10.0).
 *
 * Leith Bass Space is installed once, from the portal. Inside it, beside
 * Home, Session Notes and the Shed, Ear Training and Harmonic Elements each
 * have a room of their own, so they open full screen from the app's bottom bar
 * and the app never sends a member out to the website:
 *
 *   /members/ear-training/   Ear Training for Bass Players
 *   /members/elements/       Harmonic Elements (the Guide and the Dojo)
 *   /members/read/           Read: reading notation for bass players (1.11.0)
 *
 * All of them stay inside the portal's scope, so the installed app keeps them in the
 * app, and the app's offline store keeps the last copy of each. Their public
 * pages on the website are unchanged and still work for visitors.
 *
 * A room is for a signed-in member. Until a trainer is launched (its tickbox
 * in Leith Bass Content), its room says it is coming soon; Jack, as an
 * administrator, sees the whole thing, as he does on the website.
 *
 * @package LeithBassMembers
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

/** The rooms: route => what it is called, and whether it can be used yet. */
function lbs_portal_rooms() {
	return array(
		'ear-training' => array(
			'name'  => 'Ear Training',
			'title' => 'Ear Training for Bass Players',
			'short' => 'Ear',
			'icon'  => 'M7 9.5a5.5 5.5 0 0 1 11 0c0 3.2-3.5 4.3-3.5 7.5a3 3 0 0 1-5.6 1.5M10.5 9.5a2 2 0 0 1 4 0c0 1.2-1 1.8-1.6 2.6',
			'open'  => function_exists( 'lbs_ear_may_use' ) && lbs_ear_may_use(),
			'soon'  => 'Intervals, chords, inversions, scales, lines and progressions, heard against home with the house band, and a Jam room to play over the home chords. Jack is putting the finishing touches to it.',
		),
		'elements'     => array(
			'name'  => 'Harmonic Elements',
			'title' => 'Harmonic Elements',
			'short' => 'Elements',
			'icon'  => 'M4 4h7v7H4zM13 4h7v7h-7zM13 13h7v7h-7zM7.5 13v7M4 16.5h7',
			'open'  => function_exists( 'lbs_he_may_use' ) && lbs_he_may_use(),
			'soon'  => 'The Guide and the Dojo: the chord loops of pop, rock, soul and jazz, one element at a time, and a place to test your ear on them. Jack is putting the finishing touches to it.',
		),
		'read'         => array(
			'name'  => 'Read',
			'title' => 'Read: reading notation for bass players',
			'short' => 'Read',
			'icon'  => 'M3 6h11M3 10h11M3 14h8M3 18h8M18 4v12M18 16c0 1.7-1.5 3-3.3 3-1.4 0-2.4-.8-2.4-1.9 0-1.5 1.6-2.7 3.4-2.7 1 0 1.8.4 2.3 1.1',
			'open'  => function_exists( 'lbs_read_may_use' ) && lbs_read_may_use(),
			'soon'  => 'The Guide and the Dojo for reading: the bass clef, rhythm, keys, intervals and chords, and a place to make the link from the page to your hands immediate. Jack is putting the finishing touches to it.',
		),
	);
}

/** The room this page is, for a signed-in member, or ''. */
function lbs_portal_room() {
	$route = lbs_portal_route();
	$rooms = lbs_portal_rooms();
	return isset( $rooms[ $route ] ) && lbs_portal_member_id() ? $route : '';
}

// The trainers fill the room's screen. (Later than the theme's filters, which only speak for their own pages.)
add_filter( 'lbs_ear_page', function ( $mode ) { return 'ear-training' === lbs_portal_room() ? 'full' : $mode; }, 30 );
add_filter( 'lbs_harmonic_page', function ( $mode ) { return 'elements' === lbs_portal_room() ? 'full' : $mode; }, 30 );
add_filter( 'lbs_read_page', function ( $mode ) { return 'read' === lbs_portal_room() ? 'full' : $mode; }, 30 );

add_filter( 'body_class', function ( $classes ) {
	$room = lbs_portal_room();
	if ( $room ) { $classes[] = 'lbs-room'; $classes[] = 'lbs-room-' . $room; }
	return $classes;
} );

add_filter( 'pre_get_document_title', function ( $title ) {
	$room = lbs_portal_room();
	if ( ! $room ) { return $title; }
	return lbs_portal_rooms()[ $room ]['title'] . ' | The Leith Bass Space';
}, 30 );

/**
 * The app's bottom bar: Home, Notes and the Shed (tabs of the portal page) and
 * the rooms. $current is a tab or a room; $tabs_here is true on the portal
 * page itself, where the tabs switch without loading the page again.
 */
function lbs_portal_appbar( $current, $tabs_here = false ) {
	$items = array(
		'overview' => array( 'Home', 'M4 11l8-7 8 7v9h-5v-6H9v6H4z' ),
		'notes'    => array( 'Notes', 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7' ),
		'practice' => array( 'Shed', 'M3 11l9-7 9 7M5 10v10h14V10M10 20v-5h4v5' ),
	);
	foreach ( lbs_portal_rooms() as $route => $r ) { $items[ $route ] = array( $r['short'], $r['icon'], true ); }
	echo '<nav class="mp-appbar" aria-label="The app">';
	foreach ( $items as $key => $it ) {
		$room = ! empty( $it[2] );
		$href = $room ? lbs_portal_url( $key ) : ( $tabs_here ? add_query_arg( 'tab', $key ) : lbs_portal_url( 'home', array( 'tab' => $key ) ) );
		$attr = $room ? '' : ( $tabs_here ? ' data-tabgo="' . esc_attr( $key ) . '" data-appbar="' . esc_attr( $key ) . '"' : '' );
		$here = $current === $key ? ' aria-current="page"' : '';
		echo '<a href="' . esc_url( $href ) . '"' . $attr . $here . '><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' . esc_attr( $it[1] ) . '"/></svg><span>' . esc_html( $it[0] ) . '</span></a>'; // phpcs:ignore -- built from fixed parts, escaped above.
	}
	echo '</nav>';
}

/*
 * A room is an instrument, and on a phone every line of the screen counts: WordPress's admin bar
 * (which an administrator using the app as themselves would otherwise get) stays out of the rooms.
 * The site's header is hidden in rooms on narrow screens by portal.css; the bottom bar is the way out.
 */
add_filter( 'show_admin_bar', function ( $show ) {
	$route = function_exists( 'lbs_portal_route' ) ? lbs_portal_route() : '';
	return ( $route && isset( lbs_portal_rooms()[ $route ] ) ) ? false : $show;
}, 20 );

