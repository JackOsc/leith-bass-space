<?php
/**
 * Helpers for The Portal and FAQ pages (3.7.0).
 *
 * @package LeithBass
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * One of the four portal screens: a real screenshot when one has been chosen
 * in Leith Bass Content, otherwise a drawn example with sample data.
 *
 * @return bool True when the drawn example was used.
 */
function leithbass_portal_screen( $n ) {
	$n  = max( 1, min( 4, (int) $n ) );
	$id = leithbass_image_id( 'portal-shot-' . $n );
	if ( $id ) {
		$alt = trim( (string) get_post_meta( $id, '_wp_attachment_image_alt', true ) );
		echo '<div class="phone phone-shot">';
		echo wp_get_attachment_image( $id, 'large', false, array(
			'alt'      => $alt ? $alt : wp_strip_all_tags( leithbass_val( 'portal_shot' . $n . '_title' ) ) . ' screen in the member portal',
			'loading'  => 'lazy',
			'decoding' => 'async',
			'sizes'    => '(min-width: 900px) 260px, 70vw',
		) );
		echo '</div>';
		return false;
	}

	$tabs = array( 'Home', 'Notes', 'Shed', 'Bookings' );
	$tabs_html = '<div class="ps-tabs">';
	foreach ( $tabs as $i => $tab ) {
		$tabs_html .= '<span' . ( $i + 1 === $n ? ' class="on"' : '' ) . '>' . esc_html( $tab ) . '</span>';
	}
	$tabs_html .= '</div>';

	echo '<div class="phone" aria-hidden="true"><div class="phone-screen">';

	if ( 1 === $n ) : ?>
		<div class="ps-hello"><span class="ps-label">Member portal</span><b>Hello, <em>Morven</em></b></div>
		<div class="ps-body">
			<p class="ps-kick">Next session</p>
			<div class="ps-ticket">
				<div class="ps-stub"><small>Fri</small><b>2</b><small>Oct</small></div>
				<div class="ps-tk"><span class="ps-label">Bass session</span><p class="ps-big">17:00 &ndash; 18:00</p><p>Lost Oscillation, Music Base</p></div>
			</div>
			<p class="ps-kick">This week&rsquo;s objectives</p>
			<ul class="ps-check">
				<li><span class="ps-box done"></span><span>Lean and Pull vamps in three new keys</span></li>
				<li><span class="ps-box done"></span><span>Name home before naming any chord</span></li>
				<li><span class="ps-box"></span><span>Hear each bond&rsquo;s flavour without the bass</span></li>
			</ul>
			<div class="ps-card">
				<p class="ps-label">Latest notes &middot; Tue 22 Sep</p>
				<p class="ps-pull">Find home before you chase the chords.</p>
			</div>
		</div>
	<?php elseif ( 2 === $n ) : ?>
		<div class="ps-top"><b>Session Notes</b><span>18 sessions</span></div>
		<div class="ps-body">
			<div class="ps-search">Search your notes</div>
			<div class="ps-list">
				<div class="ps-item"><b>Working out chords by ear</b><small>Tue 22 Sep &middot; 2 backing tracks</small></div>
				<div class="ps-item"><b>Lean and Pull: first pass</b><small>Fri 18 Sep &middot; worksheet</small></div>
				<div class="ps-item"><b>Chord tones through ii V I</b><small>Tue 15 Sep &middot; worksheet, audio</small></div>
				<div class="ps-item"><b>Finger per fret, part two</b><small>Fri 11 Sep</small></div>
				<div class="ps-item"><b>Reading eighths and rests</b><small>Tue 8 Sep &middot; worksheet</small></div>
				<div class="ps-item"><b>Setting up your preamp</b><small>Fri 4 Sep</small></div>
			</div>
		</div>
	<?php elseif ( 3 === $n ) : ?>
		<div class="ps-body ps-dark">
			<span class="ps-label">Shed tools</span>
			<p class="ps-shed">The <em>Shed</em></p>
			<div class="ps-start"><div><b>&#9656; Start practising</b><small>Start with: Lean vamp in A at 84</small></div><div class="ps-chain"><b>11</b><small>Day chain</small></div></div>
			<div class="ps-tiles">
				<div class="ps-tile"><i class="ps-ico diary"></i><b>Practice diary</b><small>4 days since session</small></div>
				<div class="ps-tile"><i class="ps-ico met"></i><b>Metronome</b><small>84 &middot; 2 and 4</small></div>
				<div class="ps-tile"><i class="ps-ico tuner"></i><b>Tuner</b><small>A = 440</small></div>
				<div class="ps-tile live"><i class="ps-ico drone"></i><b>Drone</b><small>D &middot; playing</small></div>
				<div class="ps-tile"><i class="ps-ico shelf"></i><b>The Shelf</b><small>2 new</small></div>
				<div class="ps-tile"><i class="ps-ico habit"></i><b>Habit tracker</b><small>4 of 5 days</small></div>
			</div>
		</div>
	<?php else : ?>
		<div class="ps-top"><b>Bookings</b><span>Upcoming</span></div>
		<div class="ps-body">
			<div class="ps-card accent">
				<p class="ps-big">Fri 2 Oct</p>
				<p>5pm to 6pm &middot; Lost Oscillation</p>
				<div class="ps-row ps-gap"><span class="ps-btn">Add to calendar</span><span class="ps-btn ghost">Ask to move</span></div>
			</div>
			<div class="ps-card"><p class="ps-big">Tue 6 Oct</p><p>5pm to 6pm &middot; Lost Oscillation</p></div>
			<div class="ps-card"><p class="ps-big">Fri 9 Oct</p><p>5pm to 6pm &middot; Lost Oscillation</p></div>
			<div class="ps-card">
				<p class="ps-label">Block of ten</p>
				<div class="ps-row"><span>4 used &middot; 6 left</span><span>to 14 Jan</span></div>
				<div class="ps-meter"><i style="width:40%"></i></div>
			</div>
		</div>
	<?php endif;

	echo $tabs_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from escaped parts above.
	echo '</div></div>';
	return true;
}

/** The link to the member sign in, or '' when the portal plugin isn't active. */
function leithbass_portal_signin_url() {
	return leithbass_portal_active() ? home_url( '/members/' ) : '';
}

/** The FAQ groups in page order, with an anchor for each. */
function leithbass_faq_groups() {
	$groups = array();
	for ( $i = 1; $i <= 4; $i++ ) {
		$body = trim( (string) leithbass_val( 'faq_group' . $i . '_body' ) );
		if ( '' === $body ) { continue; }
		$sub = wp_strip_all_tags( html_entity_decode( (string) leithbass_val( 'faq_group' . $i . '_sub' ), ENT_QUOTES, 'UTF-8' ) );
		$groups[ $i ] = array(
			'anchor' => sanitize_title( $sub ? $sub : 'questions-' . $i ),
			'sub'    => 'faq_group' . $i . '_sub',
			'title'  => 'faq_group' . $i . '_title',
			'body'   => 'faq_group' . $i . '_body',
		);
	}
	return $groups;
}

/**
 * Every question and answer on the FAQ page as plain text, read from the same
 * copy the page shows: each Heading 3 is a question, and what follows it
 * (up to the next Heading 3) is its answer.
 */
function leithbass_faq_pairs() {
	$pairs = array();
	foreach ( leithbass_faq_groups() as $group ) {
		$html  = wpautop( wp_kses_post( leithbass_val( $group['body'] ) ) );
		$parts = preg_split( '#<h3[^>]*>(.*?)</h3>#is', $html, -1, PREG_SPLIT_DELIM_CAPTURE );
		// $parts: [before, q1, a1, q2, a2, ...]
		for ( $j = 1; $j + 1 < count( $parts ); $j += 2 ) {
			$q = trim( preg_replace( '/\s+/', ' ', html_entity_decode( wp_strip_all_tags( $parts[ $j ] ), ENT_QUOTES, 'UTF-8' ) ) );
			$a = str_replace( array( '</p>', '<br>', '<br />', '</li>' ), ' ', $parts[ $j + 1 ] );
			$a = trim( preg_replace( '/\s+/', ' ', html_entity_decode( wp_strip_all_tags( $a ), ENT_QUOTES, 'UTF-8' ) ) );
			if ( $q && $a ) { $pairs[] = array( 'q' => $q, 'a' => $a ); }
		}
	}
	return $pairs;
}
