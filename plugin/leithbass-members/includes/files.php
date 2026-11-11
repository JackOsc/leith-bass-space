<?php
/**
 * Files behind the login: session PDFs and audio streamed from Nextcloud,
 * member recordings, and calendar (.ics) files for bookings.
 *
 * @package LeithBassMembers
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

/** File types the portal will serve, by extension. */
function lbs_mime_types() {
	return array(
		'pdf'  => 'application/pdf',
		'mp3'  => 'audio/mpeg',
		'm4a'  => 'audio/mp4',
		'aac'  => 'audio/aac',
		'wav'  => 'audio/wav',
		'aif'  => 'audio/aiff',
		'aiff' => 'audio/aiff',
		'flac' => 'audio/flac',
		'ogg'  => 'audio/ogg',
		'webm' => 'audio/webm',
		'mp4'  => 'video/mp4',
		'mov'  => 'video/quicktime',
		'png'  => 'image/png',
		'jpg'  => 'image/jpeg',
		'jpeg' => 'image/jpeg',
		'gp'   => 'application/octet-stream',
		'gpx'  => 'application/octet-stream',
		'gp5'  => 'application/octet-stream',
		'mscz' => 'application/octet-stream',
		'txt'  => 'text/plain; charset=utf-8',
	);
}

/** "pdf", "audio", "video", "image" or "file" — how the portal presents it. */
function lbs_file_kind( $name ) {
	$ext = strtolower( pathinfo( $name, PATHINFO_EXTENSION ) );
	if ( 'pdf' === $ext ) { return 'pdf'; }
	if ( in_array( $ext, array( 'mp3', 'm4a', 'aac', 'wav', 'aif', 'aiff', 'flac', 'ogg', 'webm' ), true ) ) { return 'audio'; }
	if ( in_array( $ext, array( 'mp4', 'mov' ), true ) ) { return 'video'; }
	if ( in_array( $ext, array( 'png', 'jpg', 'jpeg' ), true ) ) { return 'image'; }
	return 'file';
}

function lbs_file_url( $session_id, $index, $download = false ) {
	$args = array( 's' => (int) $session_id, 'f' => (int) $index );
	if ( $download ) { $args['dl'] = 1; }
	return lbs_portal_url( 'file', $args );
}

function lbs_file_fail( $status, $message ) {
	status_header( $status );
	header( 'Content-Type: text/plain; charset=utf-8' );
	echo esc_html( $message );
	exit;
}

/** /members/file/?s=SESSION&f=INDEX, ?r=RECORDING[&u=MEMBER] or ?lib=TOKEN (the Shelf) */
function lbs_serve_file() {
	if ( ! is_user_logged_in() ) { lbs_file_fail( 403, 'Please sign in to the member portal first.' ); }
	$me    = get_current_user_id();
	$admin = current_user_can( 'manage_options' );
	if ( ! $admin && ! lbs_can_access( $me ) ) { lbs_file_fail( 403, 'Portal access for this account is switched off.' ); }

	if ( isset( $_GET['lib'] ) ) {
		$lib = lbs_library_resolve( sanitize_text_field( wp_unslash( $_GET['lib'] ) ) );
		if ( is_wp_error( $lib ) ) { lbs_file_fail( 404, $lib->get_error_message() ); }
		$path = $lib['path'];
		$name = $lib['name'];
	} elseif ( isset( $_GET['r'] ) ) {
		$owner = $admin && isset( $_GET['u'] ) ? absint( $_GET['u'] ) : $me;
		if ( ! $admin && $owner !== $me ) { lbs_file_fail( 403, 'That file belongs to someone else.' ); }
		$rid = sanitize_key( wp_unslash( $_GET['r'] ) );
		$rec = null;
		foreach ( lbs_pr_get( $owner, 'recordings' ) as $r ) {
			if ( $r['id'] === $rid ) { $rec = $r; break; }
		}
		if ( ! $rec ) { lbs_file_fail( 404, 'That recording isn\'t there any more.' ); }
		$path = lbs_member_path( $owner, 'Recordings/' . $rec['file'] );
		$name = $rec['name'];
	} else {
		$sid = isset( $_GET['s'] ) ? absint( $_GET['s'] ) : 0;
		$idx = isset( $_GET['f'] ) ? absint( $_GET['f'] ) : 0;
		if ( ! $sid || LBS_CPT !== get_post_type( $sid ) ) { lbs_file_fail( 404, 'That session couldn\'t be found.' ); }
		$s = lbs_session( $sid );
		if ( ! $admin && ( $s['member'] !== $me || ! $s['published'] ) ) { lbs_file_fail( 403, 'That file belongs to someone else.' ); }
		if ( ! isset( $s['files'][ $idx ] ) ) { lbs_file_fail( 404, 'That file isn\'t attached to this session.' ); }
		$path = lbs_member_path( $s['member'], $s['files'][ $idx ] );
		$name = basename( $s['files'][ $idx ] );
	}

	$ext   = strtolower( pathinfo( $name, PATHINFO_EXTENSION ) );
	$types = lbs_mime_types();
	$type  = isset( $types[ $ext ] ) ? $types[ $ext ] : 'application/octet-stream';
	$disp  = ( ! empty( $_GET['dl'] ) || 'application/octet-stream' === $type ) ? 'attachment' : 'inline';
	$range = isset( $_SERVER['HTTP_RANGE'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_RANGE'] ) ) : '';

	while ( ob_get_level() ) { ob_end_clean(); }
	if ( function_exists( 'set_time_limit' ) ) { @set_time_limit( 0 ); } // phpcs:ignore -- long downloads.
	$sent = lbs_nc_stream( $path, $range, function ( $status, $headers ) use ( $type, $disp, $name ) {
		status_header( $status );
		header( 'Content-Type: ' . $type );
		if ( ! empty( $headers['content-length'] ) ) { header( 'Content-Length: ' . (int) $headers['content-length'] ); }
		if ( 206 === $status && ! empty( $headers['content-range'] ) ) { header( 'Content-Range: ' . $headers['content-range'] ); }
		header( 'Accept-Ranges: bytes' );
		header( 'Content-Disposition: ' . $disp . '; filename="' . str_replace( array( '"', "\r", "\n" ), '', $name ) . '"; filename*=UTF-8\'\'' . rawurlencode( $name ) );
		header( 'X-Content-Type-Options: nosniff' );
		header( 'Cache-Control: private, max-age=300' );
	} );
	if ( is_wp_error( $sent ) ) { lbs_file_fail( 'lbs_nc_missing' === $sent->get_error_code() ? 404 : 502, $sent->get_error_message() ); }
	exit;
}

/** One calendar event. */
function lbs_ics_event( $s ) {
	$start = lbs_dt( $s['date'], $s['start'] ? $s['start'] : '12:00' )->setTimezone( new DateTimeZone( 'UTC' ) );
	$end   = $start->modify( '+' . max( 15, $s['minutes'] ) . ' minutes' );
	// No time set yet: an all-day event on the day.
	$when  = $s['start'] ?
		array( 'DTSTART:' . $start->format( 'Ymd\THis\Z' ), 'DTEND:' . $end->format( 'Ymd\THis\Z' ) ) :
		array( 'DTSTART;VALUE=DATE:' . lbs_dt( $s['date'] )->format( 'Ymd' ), 'DTEND;VALUE=DATE:' . lbs_dt( $s['date'] )->modify( '+1 day' )->format( 'Ymd' ) );
	// Backslashes first, then commas and semicolons, then line breaks (RFC 5545, 3.3.11).
	$esc   = function ( $t ) { return str_replace( array( "\r\n", "\n" ), '\\n', preg_replace( '/([,;\\\\])/', '\\\\$1', $t ) ); };
	$host  = wp_parse_url( home_url(), PHP_URL_HOST );
	$cx    = in_array( $s['status'], array( 'cancelled_free', 'cancelled_charged' ), true );
	return array(
		'BEGIN:VEVENT',
		'UID:lbs-session-' . $s['id'] . '@' . $host,
		'DTSTAMP:' . gmdate( 'Ymd\THis\Z' ),
		'SEQUENCE:' . (int) get_post_modified_time( 'U', true, $s['id'] ),
		$when[0],
		$when[1],
		'SUMMARY:' . $esc( ( $cx ? 'Cancelled: ' : '' ) . 'Bass session with Jack' . ( $s['number'] ? ' (' . lbs_session_label( $s ) . ')' : '' ) ),
		'STATUS:' . ( $cx ? 'CANCELLED' : ( lbs_booking_confirmed( $s ) ? 'CONFIRMED' : 'TENTATIVE' ) ),
		'LOCATION:' . $esc( lbs_studio_address() ),
		'DESCRIPTION:' . $esc( trim( ( $s['prep'] ? $s['prep'] . "\n\n" : '' ) . lbs_door_note() . "\n\n" . lbs_portal_url() ) ),
		'URL:' . lbs_portal_url(),
		'END:VEVENT',
	);
}

/** How to get in, for calendar events and booking emails. */
function lbs_door_note() {
	return apply_filters( 'lbs_door_note', 'Lost Oscillation is in Music Base. There\'s always someone in the café or the rehearsal rooms to let you into the building, and Jack will meet you.' );
}

/**
 * Lines longer than 75 octets are folded (RFC 5545, 3.1), never splitting a
 * multi-byte character.
 */
function lbs_ics_fold( $line ) {
	if ( strlen( $line ) <= 75 ) { return $line; }
	$out = ''; $cur = ''; $limit = 75;
	foreach ( preg_split( '//u', $line, -1, PREG_SPLIT_NO_EMPTY ) as $ch ) {
		if ( strlen( $cur ) + strlen( $ch ) > $limit ) { $out .= $cur . "\r\n "; $cur = ''; $limit = 74; }
		$cur .= $ch;
	}
	return $out . $cur;
}

/** A member's weekly practice times, as repeating events in floating local time. */
function lbs_ics_practice_slots( $user_id ) {
	if ( ! lbs_pr_get( $user_id, 'tools' )['habit'] ) { return array(); }
	$h     = lbs_pr_get( $user_id, 'habit' );
	$slots = isset( $h['slots'] ) && is_array( $h['slots'] ) ? $h['slots'] : array();
	if ( empty( $h['slots_cal'] ) ) { return array(); }
	$days  = array( 'SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA' );
	$host  = wp_parse_url( home_url(), PHP_URL_HOST );
	$out   = array();
	foreach ( $slots as $i => $sl ) {
		$first = lbs_dt( lbs_today() );
		while ( (int) $first->format( 'w' ) !== (int) $sl['day'] ) { $first = $first->modify( '+1 day' ); }
		$start = lbs_dt( $first->format( 'Y-m-d' ), $sl['time'] );
		$out[] = array(
			'BEGIN:VEVENT',
			'UID:lbs-practice-' . $user_id . '-' . md5( $sl['day'] . $sl['time'] ) . '@' . $host,
			'DTSTAMP:' . gmdate( 'Ymd\THis\Z' ),
			'DTSTART:' . $start->format( 'Ymd\THis' ),
			'DURATION:PT' . max( 5, (int) $sl['min'] ) . 'M',
			'RRULE:FREQ=WEEKLY;BYDAY=' . $days[ (int) $sl['day'] ],
			'SUMMARY:Bass practice (' . max( 5, (int) $sl['min'] ) . ' min)',
			'DESCRIPTION:Your practice time. The Shed: ' . add_query_arg( 'tab', 'practice', lbs_portal_url() ),
			'TRANSP:TRANSPARENT',
			'END:VEVENT',
		);
	}
	return $out;
}

function lbs_ics_output( $events, $filename, $name = '' ) {
	$lines = array( 'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//The Leith Bass Space//Member portal//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH' );
	if ( $name ) { $lines[] = 'X-WR-CALNAME:' . $name; $lines[] = 'REFRESH-INTERVAL;VALUE=DURATION:PT6H'; $lines[] = 'X-PUBLISHED-TTL:PT6H'; }
	foreach ( $events as $e ) { $lines = array_merge( $lines, $e ); }
	$lines[] = 'END:VCALENDAR';
	$lines   = array_map( 'lbs_ics_fold', $lines );
	while ( ob_get_level() ) { ob_end_clean(); }
	header( 'Content-Type: text/calendar; charset=utf-8' );
	header( 'Content-Disposition: ' . ( $name ? 'inline' : 'attachment' ) . '; filename="' . $filename . '"' );
	echo implode( "\r\n", $lines ) . "\r\n"; // phpcs:ignore -- calendar text, escaped per field.
	exit;
}

/** /members/ics/?s=SESSION — a one-off calendar file for one booking. It doesn't update if the booking moves. */
function lbs_serve_ics() {
	if ( ! is_user_logged_in() ) { lbs_file_fail( 403, 'Please sign in to the member portal first.' ); }
	$me  = get_current_user_id();
	$sid = isset( $_GET['s'] ) ? absint( $_GET['s'] ) : 0;
	if ( ! $sid || LBS_CPT !== get_post_type( $sid ) ) { lbs_file_fail( 404, 'That booking couldn\'t be found.' ); }
	$s = lbs_session( $sid );
	if ( ! current_user_can( 'manage_options' ) && ( ! lbs_can_access( $me ) || $s['member'] !== $me || ! $s['published'] ) ) { lbs_file_fail( 403, 'That booking belongs to someone else.' ); }
	lbs_ics_output( array( lbs_ics_event( $s ) ), 'leith-bass-session-' . $s['date'] . '.ics' );
}

/**
 * /members/calendar/?u=ID&t=TOKEN — a private calendar feed. Calendar apps
 * check it every few hours, so moved or cancelled sessions update themselves.
 * The secret token can be renewed from Account if the link is ever shared.
 */
function lbs_serve_calendar_feed() {
	$uid   = isset( $_GET['u'] ) ? absint( $_GET['u'] ) : 0;
	$token = isset( $_GET['t'] ) ? sanitize_text_field( wp_unslash( $_GET['t'] ) ) : '';
	$saved = $uid ? (string) get_user_meta( $uid, '_lbs_cal_token', true ) : '';
	if ( ! $uid || strlen( $saved ) < 20 || ! hash_equals( $saved, $token ) || ! lbs_can_access( $uid ) ) {
		lbs_file_fail( 404, 'This calendar link isn\'t valid any more.' );
	}
	$from   = wp_date( 'Y-m-d', time() - 60 * DAY_IN_SECONDS );
	$events = array();
	foreach ( lbs_member_sessions( $uid ) as $s ) {
		if ( $s['date'] >= $from && ( 'upcoming' === $s['status'] || 'cancelled_free' === $s['status'] || 'cancelled_charged' === $s['status'] || 'done' === $s['status'] ) ) {
			$events[] = lbs_ics_event( $s );
		}
	}
	$events = array_merge( $events, lbs_ics_practice_slots( $uid ) );
	lbs_ics_output( $events, 'leith-bass-sessions.ics', 'Bass sessions with Jack' );
}
