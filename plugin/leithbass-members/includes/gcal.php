<?php
/**
 * Two-way Google Calendar sync (1.2.0).
 *
 * Out: every published booking goes into Jack's chosen Google calendar, and
 * follows it when it moves, is cancelled or is deleted.
 * In: every 15 minutes (and on "Sync now") changes made in Google come back.
 *  - A portal booking moved in Google moves in the portal, and the member is
 *    told, exactly as if Jack had moved it here. Whichever side changed last
 *    wins, and each change is kept in the booking's sync history.
 *  - A portal booking deleted in Google is flagged for Jack rather than
 *    cancelled, because cancelling changes lesson credit.
 *  - A new event in Google with a member as a guest becomes a draft booking
 *    for Jack to check and publish. Other new events that look like sessions
 *    (a member's name in the title) are listed under "From Google".
 *
 * Google is reached with Jack's own OAuth client (Google Cloud → Credentials →
 * OAuth client ID, "Web application"). The refresh token is stored encrypted.
 *
 * @package LeithBassMembers
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

/* -------------------------------------------------------------------------
 * Settings and tokens
 * ---------------------------------------------------------------------- */

function lbs_gcal_opt() {
	$o = get_option( 'lbs_gcal', array() );
	return wp_parse_args( is_array( $o ) ? $o : array(), array(
		'client_id' => '', 'client_secret' => '', 'refresh' => '', 'email' => '',
		'calendar' => '', 'calendar_name' => '', 'sync_token' => '', 'last_sync' => 0, 'last_error' => '',
		'inbox' => array(), 'ignored' => array(), 'attention' => array(),
	) );
}

function lbs_gcal_save( $patch ) {
	update_option( 'lbs_gcal', array_merge( lbs_gcal_opt(), $patch ), false );
}

function lbs_gcal_client() {
	$o = lbs_gcal_opt();
	return array(
		'id'     => defined( 'LBS_GOOGLE_CLIENT_ID' ) ? LBS_GOOGLE_CLIENT_ID : $o['client_id'],
		'secret' => defined( 'LBS_GOOGLE_CLIENT_SECRET' ) ? LBS_GOOGLE_CLIENT_SECRET : lbs_nc_decrypt( $o['client_secret'] ),
	);
}

function lbs_gcal_api() { return apply_filters( 'lbs_gcal_api', 'https://www.googleapis.com/calendar/v3' ); }
function lbs_gcal_token_url() { return apply_filters( 'lbs_gcal_token_url', 'https://oauth2.googleapis.com/token' ); }
function lbs_gcal_auth_base() { return apply_filters( 'lbs_gcal_auth_url', 'https://accounts.google.com/o/oauth2/v2/auth' ); }
function lbs_gcal_redirect() { return admin_url( 'admin-post.php?action=lbs_gcal_callback' ); }

function lbs_gcal_connected() { return '' !== lbs_gcal_opt()['refresh']; }
function lbs_gcal_ready() { $o = lbs_gcal_opt(); return '' !== $o['refresh'] && '' !== $o['calendar']; }

function lbs_gcal_auth_url() {
	$state = wp_generate_password( 24, false );
	set_transient( 'lbs_gcal_state_' . get_current_user_id(), $state, 15 * MINUTE_IN_SECONDS );
	return add_query_arg( array(
		'client_id'     => rawurlencode( lbs_gcal_client()['id'] ),
		'redirect_uri'  => rawurlencode( lbs_gcal_redirect() ),
		'response_type' => 'code',
		'scope'         => rawurlencode( 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.calendarlist.readonly' ),
		'access_type'   => 'offline',
		'prompt'        => 'consent',
		'state'         => $state,
	), lbs_gcal_auth_base() );
}

function lbs_gcal_token_request( $args ) {
	$c   = lbs_gcal_client();
	$res = wp_remote_post( lbs_gcal_token_url(), array(
		'timeout' => 15,
		'body'    => array_merge( array( 'client_id' => $c['id'], 'client_secret' => $c['secret'] ), $args ),
	) );
	if ( is_wp_error( $res ) ) { return $res; }
	$body = json_decode( wp_remote_retrieve_body( $res ), true );
	if ( 200 !== (int) wp_remote_retrieve_response_code( $res ) || empty( $body['access_token'] ) ) {
		$err = is_array( $body ) && ! empty( $body['error'] ) ? $body['error'] : 'http_' . wp_remote_retrieve_response_code( $res );
		return new WP_Error( $err, 'invalid_grant' === $err ? 'Google no longer accepts the connection. Connect again.' : 'Google didn\'t hand over a token (' . $err . ').' );
	}
	set_transient( 'lbs_gcal_access', $body['access_token'], max( 60, (int) ( $body['expires_in'] ?? 3600 ) - 120 ) );
	return $body;
}

/** Swap the code from Google's consent screen for tokens. */
function lbs_gcal_exchange_code( $code ) {
	$body = lbs_gcal_token_request( array( 'code' => $code, 'grant_type' => 'authorization_code', 'redirect_uri' => lbs_gcal_redirect() ) );
	if ( is_wp_error( $body ) ) { return $body; }
	if ( empty( $body['refresh_token'] ) ) { return new WP_Error( 'norefresh', 'Google didn\'t give a lasting connection. Remove the app\'s access in your Google account, then connect again.' ); }
	lbs_gcal_save( array( 'refresh' => lbs_nc_encrypt( $body['refresh_token'] ), 'last_error' => '', 'sync_token' => '' ) );
	return true;
}

function lbs_gcal_access_token( $fresh = false ) {
	$t = $fresh ? false : get_transient( 'lbs_gcal_access' );
	if ( $t ) { return $t; }
	$refresh = lbs_nc_decrypt( lbs_gcal_opt()['refresh'] );
	if ( '' === $refresh ) { return new WP_Error( 'notconnected', 'Google Calendar isn\'t connected.' ); }
	$body = lbs_gcal_token_request( array( 'refresh_token' => $refresh, 'grant_type' => 'refresh_token' ) );
	if ( is_wp_error( $body ) ) {
		if ( 'invalid_grant' === $body->get_error_code() ) { lbs_gcal_save( array( 'refresh' => '', 'last_error' => $body->get_error_message() ) ); }
		return $body;
	}
	return $body['access_token'];
}

/**
 * One Calendar API call. Returns the decoded body (array, or true for an empty
 * success) or a WP_Error whose code is the HTTP status for 404/410.
 */
function lbs_gcal_request( $method, $path, $body = null, $query = array(), $retry = true ) {
	$token = lbs_gcal_access_token();
	if ( is_wp_error( $token ) ) { return $token; }
	$url  = lbs_gcal_api() . $path . ( $query ? '?' . http_build_query( $query, '', '&', PHP_QUERY_RFC3986 ) : '' );
	$args = array( 'method' => $method, 'timeout' => 20, 'headers' => array( 'Authorization' => 'Bearer ' . $token, 'Accept' => 'application/json' ) );
	if ( null !== $body ) { $args['headers']['Content-Type'] = 'application/json'; $args['body'] = wp_json_encode( $body ); }
	$res = wp_remote_request( $url, $args );
	if ( is_wp_error( $res ) ) { return $res; }
	$code = (int) wp_remote_retrieve_response_code( $res );
	if ( 401 === $code && $retry ) { delete_transient( 'lbs_gcal_access' ); return lbs_gcal_request( $method, $path, $body, $query, false ); }
	$data = json_decode( wp_remote_retrieve_body( $res ), true );
	if ( $code >= 200 && $code < 300 ) { return is_array( $data ) ? $data : true; }
	$msg = is_array( $data ) && ! empty( $data['error']['message'] ) ? $data['error']['message'] : 'HTTP ' . $code;
	return new WP_Error( in_array( $code, array( 404, 410, 412 ), true ) ? 'http_' . $code : 'gcal', 'Google Calendar: ' . $msg );
}

function lbs_gcal_calendars() {
	$r = lbs_gcal_request( 'GET', '/users/me/calendarList', null, array( 'minAccessRole' => 'writer' ) );
	if ( is_wp_error( $r ) ) { return $r; }
	$out = array();
	foreach ( (array) ( $r['items'] ?? array() ) as $c ) {
		$out[ $c['id'] ] = ( $c['summaryOverride'] ?? $c['summary'] ?? $c['id'] ) . ( ! empty( $c['primary'] ) ? ' (main calendar)' : '' );
		if ( ! empty( $c['primary'] ) ) { lbs_gcal_save( array( 'email' => $c['id'] ) ); }
	}
	return $out;
}

/* -------------------------------------------------------------------------
 * Out: bookings to Google
 * ---------------------------------------------------------------------- */

function lbs_gcal_host() { return (string) wp_parse_url( home_url(), PHP_URL_HOST ); }

/** Google wants an IANA zone name; a bare offset goes into the time instead. */
function lbs_gcal_time( $date, $time ) {
	$tz = wp_timezone_string();
	$dt = lbs_dt( $date, $time );
	if ( preg_match( '/^[+-]\d{2}:\d{2}$/', $tz ) || 'UTC' === $tz ) { return array( 'dateTime' => $dt->format( 'c' ) ); }
	return array( 'dateTime' => $dt->format( 'Y-m-d\TH:i:s' ), 'timeZone' => $tz );
}

function lbs_gcal_event_body( $s ) {
	$user = $s['member'] ? get_userdata( $s['member'] ) : null;
	$name = $user ? $user->display_name : 'Member';
	$body = array(
		'summary'     => 'Bass: ' . $name . ( $s['number'] ? ' (' . lbs_session_label( $s ) . ')' : '' ) . ( lbs_booking_confirmed( $s ) ? '' : ', provisional' ),
		'location'    => lbs_studio_address(),
		'description' => trim( ( $s['prep'] ? 'Prep: ' . $s['prep'] . "\n\n" : '' ) . 'In the portal: ' . admin_url( 'post.php?post=' . $s['id'] . '&action=edit' ) ),
		'extendedProperties' => array( 'private' => array( 'lbs_session' => (string) $s['id'], 'lbs_site' => lbs_gcal_host() ) ),
		'status'      => 'confirmed',
	);
	if ( $s['start'] ) {
		$body['start'] = lbs_gcal_time( $s['date'], $s['start'] );
		$body['end']   = lbs_gcal_time( $s['date'], lbs_dt( $s['date'], $s['start'] )->modify( '+' . max( 15, $s['minutes'] ) . ' minutes' )->format( 'H:i' ) );
		// A session running past midnight: rare, but keep the end after the start.
		if ( $body['end']['dateTime'] <= $body['start']['dateTime'] ) {
			$end = lbs_dt( $s['date'], $s['start'] )->modify( '+' . max( 15, $s['minutes'] ) . ' minutes' );
			$body['end'] = lbs_gcal_time( $end->format( 'Y-m-d' ), $end->format( 'H:i' ) );
		}
	} else {
		$body['start'] = array( 'date' => $s['date'] );
		$body['end']   = array( 'date' => lbs_dt( $s['date'] )->modify( '+1 day' )->format( 'Y-m-d' ) );
	}
	return $body;
}

/** Should this booking be in Google at all? */
function lbs_gcal_wanted( $post_id ) {
	if ( 'publish' !== get_post_status( $post_id ) ) { return false; }
	$s = lbs_session( $post_id );
	return $s['member'] && in_array( $s['status'], array( 'upcoming', 'done' ), true );
}

function lbs_gcal_history( $post_id, $dir, $what ) {
	$h   = get_post_meta( $post_id, '_lbs_gcal_history', true );
	$h   = is_array( $h ) ? $h : array();
	$h[] = array( time(), $dir, $what );
	update_post_meta( $post_id, '_lbs_gcal_history', array_slice( $h, -20 ) );
}

function lbs_gcal_push( $post_id ) {
	if ( ! lbs_gcal_ready() || LBS_CPT !== get_post_type( $post_id ) ) { return false; }
	$cal    = rawurlencode( lbs_gcal_opt()['calendar'] );
	$gid    = (string) get_post_meta( $post_id, '_lbs_gcal_id', true );
	$wanted = lbs_gcal_wanted( $post_id );
	delete_post_meta( $post_id, '_lbs_gcal_dirty' );

	if ( ! $wanted ) {
		if ( ! $gid ) { return true; }
		// A draft made from one of Jack's own Google events leaves that event alone.
		if ( 'google' === get_post_meta( $post_id, '_lbs_gcal_origin', true ) && in_array( get_post_status( $post_id ), array( 'draft', 'pending', 'auto-draft' ), true ) ) { return true; }
		$r = lbs_gcal_request( 'DELETE', '/calendars/' . $cal . '/events/' . rawurlencode( $gid ) );
		if ( is_wp_error( $r ) && ! in_array( $r->get_error_code(), array( 'http_404', 'http_410' ), true ) ) { update_post_meta( $post_id, '_lbs_gcal_dirty', 1 ); lbs_gcal_save( array( 'last_error' => $r->get_error_message() ) ); return $r; }
		delete_post_meta( $post_id, '_lbs_gcal_id' );
		delete_post_meta( $post_id, '_lbs_gcal_updated' );
		lbs_gcal_history( $post_id, 'out', 'Removed from Google Calendar' );
		return true;
	}

	$body = lbs_gcal_event_body( lbs_session( $post_id ) );
	$r    = $gid ? lbs_gcal_request( 'PATCH', '/calendars/' . $cal . '/events/' . rawurlencode( $gid ), $body ) : null;
	if ( ! $gid || ( is_wp_error( $r ) && in_array( $r->get_error_code(), array( 'http_404', 'http_410' ), true ) ) ) {
		$r = lbs_gcal_request( 'POST', '/calendars/' . $cal . '/events', $body );
	}
	if ( is_wp_error( $r ) ) { update_post_meta( $post_id, '_lbs_gcal_dirty', 1 ); lbs_gcal_save( array( 'last_error' => $r->get_error_message() ) ); return $r; }
	update_post_meta( $post_id, '_lbs_gcal_id', $r['id'] );
	update_post_meta( $post_id, '_lbs_gcal_updated', (string) ( $r['updated'] ?? '' ) );
	lbs_gcal_history( $post_id, 'out', ( $gid ? 'Updated in' : 'Added to' ) . ' Google Calendar' );
	$att = lbs_gcal_opt()['attention'];
	if ( isset( $att[ $post_id ] ) ) { unset( $att[ $post_id ] ); lbs_gcal_save( array( 'attention' => $att ) ); }
	return true;
}

/* Changes are collected during the request and sent once everything is saved. */
$GLOBALS['lbs_gcal_dirty']   = array();
$GLOBALS['lbs_gcal_pulling'] = false;

function lbs_gcal_mark( $post_id ) {
	if ( $GLOBALS['lbs_gcal_pulling'] || LBS_CPT !== get_post_type( $post_id ) || wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) { return; }
	if ( ! lbs_gcal_ready() ) { return; }
	update_post_meta( $post_id, '_lbs_gcal_dirty', 1 );
	$GLOBALS['lbs_gcal_dirty'][ $post_id ] = true;
}
add_action( 'save_post_' . LBS_CPT, function ( $post_id ) { lbs_gcal_mark( $post_id ); }, 30 );
add_action( 'transition_post_status', function ( $new, $old, $post ) { if ( $post && LBS_CPT === $post->post_type && $new !== $old ) { lbs_gcal_mark( $post->ID ); } }, 10, 3 );
add_action( 'updated_post_meta', function ( $mid, $post_id, $key ) {
	if ( in_array( $key, array( '_lbs_date', '_lbs_start', '_lbs_length', '_lbs_status', '_lbs_member', '_lbs_paid' ), true ) ) { lbs_gcal_mark( $post_id ); }
}, 10, 3 );
add_action( 'before_delete_post', function ( $post_id ) {
	if ( LBS_CPT !== get_post_type( $post_id ) || ! lbs_gcal_ready() ) { return; }
	$gid = (string) get_post_meta( $post_id, '_lbs_gcal_id', true );
	if ( $gid ) { lbs_gcal_request( 'DELETE', '/calendars/' . rawurlencode( lbs_gcal_opt()['calendar'] ) . '/events/' . rawurlencode( $gid ) ); }
} );
add_action( 'shutdown', function () {
	if ( empty( $GLOBALS['lbs_gcal_dirty'] ) ) { return; }
	$ids = array_keys( $GLOBALS['lbs_gcal_dirty'] );
	$GLOBALS['lbs_gcal_dirty'] = array();
	foreach ( array_slice( $ids, 0, 30 ) as $id ) { lbs_gcal_push( $id ); } // Anything left over goes with the next sync.
} );

/** Bookings whose last push failed, or that were changed while Google was unreachable. */
function lbs_gcal_push_pending() {
	$ids = get_posts( array( 'post_type' => LBS_CPT, 'post_status' => 'any', 'posts_per_page' => 50, 'fields' => 'ids', 'no_found_rows' => true, 'meta_key' => '_lbs_gcal_dirty', 'meta_value' => '1' ) );
	foreach ( $ids as $id ) { lbs_gcal_push( $id ); }
	return count( $ids );
}

/** Put every upcoming booking into a newly chosen calendar. */
function lbs_gcal_push_all_upcoming() {
	$ids = get_posts( array( 'post_type' => LBS_CPT, 'post_status' => 'publish', 'posts_per_page' => 300, 'fields' => 'ids', 'no_found_rows' => true, 'meta_query' => array( array( 'key' => '_lbs_date', 'value' => lbs_today(), 'compare' => '>=' ) ) ) );
	foreach ( $ids as $id ) { delete_post_meta( $id, '_lbs_gcal_id' ); update_post_meta( $id, '_lbs_gcal_dirty', 1 ); }
	return lbs_gcal_push_pending();
}

/* -------------------------------------------------------------------------
 * In: Google to the portal
 * ---------------------------------------------------------------------- */

/** An event's start as [date, 'H:i' or '', minutes] in the site's time zone. */
function lbs_gcal_event_when( $e ) {
	if ( ! empty( $e['start']['date'] ) ) { return array( $e['start']['date'], '', 0 ); }
	if ( empty( $e['start']['dateTime'] ) ) { return null; }
	// Google sends an offset with every time; a bare time is read in the event's own zone.
	$parse = function ( $part ) {
		$zone = wp_timezone();
		if ( ! empty( $part['timeZone'] ) ) { try { $zone = new DateTimeZone( $part['timeZone'] ); } catch ( Exception $ex ) { $zone = wp_timezone(); } }
		return ( new DateTimeImmutable( $part['dateTime'], $zone ) )->setTimezone( wp_timezone() );
	};
	try {
		$s = $parse( $e['start'] );
		$f = ! empty( $e['end']['dateTime'] ) ? $parse( $e['end'] ) : $s->modify( '+60 minutes' );
	} catch ( Exception $ex ) { return null; }
	return array( $s->format( 'Y-m-d' ), $s->format( 'H:i' ), max( 15, (int) round( ( $f->getTimestamp() - $s->getTimestamp() ) / 60 ) ) );
}

/** Which member an outside event is probably for: [user id, how sure]. */
function lbs_gcal_guess_member( $e ) {
	$emails = array();
	foreach ( (array) ( $e['attendees'] ?? array() ) as $a ) { if ( ! empty( $a['email'] ) ) { $emails[] = strtolower( $a['email'] ); } }
	$title = ' ' . strtolower( (string) ( $e['summary'] ?? '' ) ) . ' ';
	$by_name = 0;
	foreach ( lbs_members() as $m ) {
		if ( in_array( strtolower( $m->user_email ), $emails, true ) ) { return array( $m->ID, 'guest' ); }
		$full  = strtolower( $m->display_name );
		$first = strtolower( strtok( $m->display_name, ' ' ) );
		if ( $full && false !== strpos( $title, $full ) ) { $by_name = $m->ID; }
		elseif ( ! $by_name && strlen( $first ) > 2 && preg_match( '/\b' . preg_quote( $first, '/' ) . '\b/u', $title ) ) { $by_name = $m->ID; }
	}
	return $by_name ? array( $by_name, 'name' ) : array( 0, '' );
}

function lbs_gcal_session_by_event( $gid ) {
	$ids = get_posts( array( 'post_type' => LBS_CPT, 'post_status' => 'any', 'posts_per_page' => 1, 'fields' => 'ids', 'no_found_rows' => true, 'meta_key' => '_lbs_gcal_id', 'meta_value' => $gid ) );
	return $ids ? (int) $ids[0] : 0;
}

/** Make a booking from a Google event. Draft (for Jack to check) or published. */
function lbs_gcal_make_booking( $e, $member, $publish ) {
	$when = lbs_gcal_event_when( $e );
	if ( ! $when || ! lbs_is_member( $member ) ) { return 0; }
	$GLOBALS['lbs_gcal_pulling'] = ! $publish;
	$id = wp_insert_post( array( 'post_type' => LBS_CPT, 'post_status' => $publish ? 'publish' : 'draft', 'post_title' => '' ) );
	if ( ! $id || is_wp_error( $id ) ) { $GLOBALS['lbs_gcal_pulling'] = false; return 0; }
	update_post_meta( $id, '_lbs_member', $member );
	update_post_meta( $id, '_lbs_number', lbs_next_number( $member ) );
	update_post_meta( $id, '_lbs_date', $when[0] );
	update_post_meta( $id, '_lbs_start', $when[1] );
	update_post_meta( $id, '_lbs_length', $when[2] ? round( $when[2] / 60, 2 ) : 1 );
	update_post_meta( $id, '_lbs_status', 'upcoming' );
	update_post_meta( $id, '_lbs_block', '1' );
	update_post_meta( $id, '_lbs_last_status', $publish ? 'publish' : 'draft' );
	update_post_meta( $id, '_lbs_gcal_id', $e['id'] );
	update_post_meta( $id, '_lbs_gcal_origin', 'google' );
	update_post_meta( $id, '_lbs_gcal_updated', (string) ( $e['updated'] ?? '' ) );
	lbs_gcal_history( $id, 'in', 'Made from a Google Calendar event: ' . (string) ( $e['summary'] ?? '' ) );
	$GLOBALS['lbs_gcal_pulling'] = false;
	if ( $publish ) { lbs_gcal_mark( $id ); } // Adds our link to the event, so later changes match up.
	return $id;
}

function lbs_gcal_apply( $e, &$report ) {
	$o   = lbs_gcal_opt();
	$gid = (string) ( $e['id'] ?? '' );
	if ( '' === $gid ) { return; }
	$priv = $e['extendedProperties']['private'] ?? array();
	$sid  = ( ! empty( $priv['lbs_session'] ) && ( $priv['lbs_site'] ?? '' ) === lbs_gcal_host() ) ? (int) $priv['lbs_session'] : 0;
	$post = $sid && LBS_CPT === get_post_type( $sid ) ? $sid : lbs_gcal_session_by_event( $gid );

	if ( $post ) {
		$known = (string) get_post_meta( $post, '_lbs_gcal_updated', true );
		if ( ( $e['updated'] ?? '' ) === $known ) { return; } // Our own change coming back.
		if ( 'cancelled' === ( $e['status'] ?? '' ) ) {
			if ( lbs_gcal_wanted( $post ) ) {
				$att          = $o['attention'];
				$att[ $post ] = array( 'deleted', time() );
				lbs_gcal_save( array( 'attention' => $att ) );
				delete_post_meta( $post, '_lbs_gcal_id' );
				lbs_gcal_history( $post, 'in', 'Deleted in Google Calendar' );
				$report['flagged']++;
			}
			return;
		}
		// Last change wins: a booking edited here since the last sync is sent out again instead.
		if ( get_post_meta( $post, '_lbs_gcal_dirty', true ) ) { return; }
		$when = lbs_gcal_event_when( $e );
		if ( ! $when ) { return; }
		$before = lbs_session( $post );
		$len    = $when[2] ? round( $when[2] / 60, 2 ) : $before['length'];
		update_post_meta( $post, '_lbs_gcal_updated', (string) ( $e['updated'] ?? '' ) );
		if ( $before['date'] === $when[0] && $before['start'] === $when[1] && abs( $before['length'] - $len ) < 0.01 ) { return; }
		$GLOBALS['lbs_gcal_pulling'] = true;
		update_post_meta( $post, '_lbs_date', $when[0] );
		update_post_meta( $post, '_lbs_start', $when[1] );
		update_post_meta( $post, '_lbs_length', $len );
		if ( $before['move'] ) { delete_post_meta( $post, '_lbs_move_request' ); }
		$GLOBALS['lbs_gcal_pulling'] = false;
		clean_post_cache( $post );
		$after = lbs_session( $post );
		lbs_gcal_history( $post, 'in', 'Moved in Google Calendar from ' . $before['date'] . ' ' . $before['start'] . ' to ' . $after['date'] . ' ' . $after['start'] );
		if ( $after['member'] && 'publish' === get_post_status( $post ) && 'upcoming' === $after['status'] && $before['date'] >= lbs_today() && ( $before['date'] !== $after['date'] || $before['start'] !== $after['start'] ) ) {
			lbs_mail_booking_changed( $after, $before, 'moved' );
		}
		$report['moved']++;
		return;
	}

	// Someone else's event, or one of Jack's own.
	$inbox = $o['inbox'];
	if ( 'cancelled' === ( $e['status'] ?? '' ) ) {
		if ( isset( $inbox[ $gid ] ) ) { unset( $inbox[ $gid ] ); lbs_gcal_save( array( 'inbox' => $inbox ) ); }
		return;
	}
	if ( in_array( $gid, $o['ignored'], true ) ) { return; }
	$when = lbs_gcal_event_when( $e );
	if ( ! $when || $when[0] < lbs_today() || $when[0] > lbs_dt( lbs_today() )->modify( '+120 days' )->format( 'Y-m-d' ) ) { return; }
	list( $member, $how ) = lbs_gcal_guess_member( $e );
	if ( ! $member ) { if ( isset( $inbox[ $gid ] ) ) { unset( $inbox[ $gid ] ); lbs_gcal_save( array( 'inbox' => $inbox ) ); } return; }
	if ( 'guest' === $how && '' !== $when[1] ) {
		if ( lbs_gcal_make_booking( $e, $member, false ) ) { $report['drafts']++; }
		unset( $inbox[ $gid ] );
		lbs_gcal_save( array( 'inbox' => $inbox ) );
		return;
	}
	$inbox[ $gid ] = array( 'summary' => (string) ( $e['summary'] ?? '' ), 'date' => $when[0], 'start' => $when[1], 'minutes' => $when[2], 'member' => $member, 'event' => array_intersect_key( $e, array_flip( array( 'id', 'summary', 'start', 'end', 'updated' ) ) ) );
	lbs_gcal_save( array( 'inbox' => $inbox ) );
	$report['inbox']++;
}

/** Fetch what changed in Google since last time (everything from a week ago on the first run). */
function lbs_gcal_pull() {
	$o      = lbs_gcal_opt();
	$cal    = rawurlencode( $o['calendar'] );
	$report = array( 'moved' => 0, 'flagged' => 0, 'drafts' => 0, 'inbox' => 0, 'seen' => 0 );
	$query  = $o['sync_token'] ? array( 'syncToken' => $o['sync_token'], 'singleEvents' => 'true', 'showDeleted' => 'true' ) : array( 'timeMin' => gmdate( 'c', time() - WEEK_IN_SECONDS ), 'singleEvents' => 'true', 'showDeleted' => 'true', 'maxResults' => 250 );
	$page   = '';
	for ( $guard = 0; $guard < 20; $guard++ ) {
		$q = $query + ( $page ? array( 'pageToken' => $page ) : array() );
		$r = lbs_gcal_request( 'GET', '/calendars/' . $cal . '/events', null, $q );
		if ( is_wp_error( $r ) ) {
			if ( 'http_410' === $r->get_error_code() && $o['sync_token'] ) { lbs_gcal_save( array( 'sync_token' => '' ) ); return lbs_gcal_pull(); } // Token expired: start again.
			return $r;
		}
		foreach ( (array) ( $r['items'] ?? array() ) as $e ) { $report['seen']++; lbs_gcal_apply( $e, $report ); }
		if ( ! empty( $r['nextPageToken'] ) ) { $page = $r['nextPageToken']; continue; }
		if ( ! empty( $r['nextSyncToken'] ) ) { lbs_gcal_save( array( 'sync_token' => $r['nextSyncToken'] ) ); }
		break;
	}
	return $report;
}

function lbs_gcal_sync() {
	if ( ! lbs_gcal_ready() ) { return new WP_Error( 'notready', 'Connect Google Calendar and choose a calendar first.' ); }
	$lock = lbs_lock( 'gcal-sync', 1 );
	if ( ! $lock ) { return new WP_Error( 'busy', 'A sync is already running.' ); }
	$pushed = lbs_gcal_push_pending();
	$r      = lbs_gcal_pull();
	lbs_unlock( $lock );
	if ( is_wp_error( $r ) ) { lbs_gcal_save( array( 'last_error' => $r->get_error_message() ) ); return $r; }
	lbs_gcal_save( array( 'last_sync' => time(), 'last_error' => '' ) );
	$r['pushed'] = $pushed;
	return $r;
}

/* -------------------------------------------------------------------------
 * Every 15 minutes
 * ---------------------------------------------------------------------- */

add_filter( 'cron_schedules', function ( $s ) {
	$s['lbs_quarter_hour'] = array( 'interval' => 15 * MINUTE_IN_SECONDS, 'display' => 'Every 15 minutes' );
	return $s;
} );
add_action( 'init', function () {
	if ( lbs_gcal_ready() && ! wp_next_scheduled( 'lbs_gcal_cron' ) ) { wp_schedule_event( time() + 60, 'lbs_quarter_hour', 'lbs_gcal_cron' ); }
	if ( ! lbs_gcal_ready() && wp_next_scheduled( 'lbs_gcal_cron' ) ) { wp_clear_scheduled_hook( 'lbs_gcal_cron' ); }
} );
add_action( 'lbs_gcal_cron', 'lbs_gcal_sync' );
