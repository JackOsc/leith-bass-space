<?php
/**
 * Portal emails, a log of every send, a retry queue for failures, and the
 * hourly job that sends reminders, nudges and Jack's morning prep.
 *
 * wp_mail() returning true only means the site handed the message on, not
 * that it arrived, so the log records what we know: sent, queued for retry,
 * or failed with the error the mailer gave. Failures are retried three times.
 *
 * @package LeithBassMembers
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

$GLOBALS['lbs_mail_error'] = '';
add_action( 'wp_mail_failed', function ( $error ) {
	$GLOBALS['lbs_mail_error'] = is_wp_error( $error ) ? $error->get_error_message() : 'Unknown mail error';
} );

function lbs_p( $text ) {
	return '<p style="margin:0 0 14px">' . $text . '</p>';
}

/** Wrap content in the portal's simple branded email. */
function lbs_mail_html( $heading, $body, $button = array(), $after = '' ) {
	$body = is_array( $body ) ? implode( '', $body ) : $body;
	$btn  = '';
	if ( $button ) {
		$btn = '<p style="margin:26px 0"><a href="' . esc_url( $button[1] ) . '" style="display:inline-block;background:#B05200;color:#ffffff;text-decoration:none;font-weight:600;font-size:13px;letter-spacing:.14em;text-transform:uppercase;padding:14px 24px">' . esc_html( $button[0] ) . '</a></p>';
	}
	return '<!doctype html><html><body style="margin:0;background:#F3EFE7;font-family:Helvetica,Arial,sans-serif;color:#333333;font-size:16px;line-height:1.6">'
		. '<div style="max-width:560px;margin:0 auto;padding:32px 20px">'
		. '<p style="margin:0 0 24px;font-size:20px;font-weight:300;color:#111111">leith<span style="color:#E87102">bass</span><span style="color:#8A8A8A">.space</span></p>'
		. '<div style="background:#FFFDF8;border-top:3px solid #111111;padding:28px 26px">'
		. '<h1 style="margin:0 0 16px;font-family:Oswald,\'Arial Narrow\',Arial,sans-serif;text-transform:uppercase;font-size:24px;line-height:1.1;color:#111111">' . esc_html( $heading ) . '</h1>'
		. $body . $btn . $after
		. '</div>'
		. '<p style="margin:20px 0 0;font-size:12px;color:#6F6C66">The Leith Bass Space · ' . esc_html( lbs_studio_address() ) . '<br>You can choose which emails you get in the member portal, under Account.</p>'
		. '</div></body></html>';
}

/**
 * Send an email, log it, and queue it for retry if the mailer refuses it.
 *
 * @param array $m to, subject, heading, body, button, reply_to, after, cc (array), kind.
 * @return string 'sent', 'queued' or 'failed'.
 */
function lbs_send( $m ) {
	$m       = wp_parse_args( $m, array( 'to' => '', 'cc' => array(), 'subject' => '', 'heading' => '', 'body' => '', 'button' => array(), 'reply_to' => '', 'after' => '', 'kind' => 'general' ) );
	$headers = array( 'Content-Type: text/html; charset=UTF-8' );
	if ( $m['reply_to'] && is_email( $m['reply_to'] ) ) { $headers[] = 'Reply-To: ' . $m['reply_to']; }
	foreach ( array_filter( (array) $m['cc'] ) as $cc ) {
		if ( is_email( $cc ) && strtolower( $cc ) !== strtolower( $m['to'] ) ) { $headers[] = 'Cc: ' . $cc; }
	}
	$item = array(
		'id'       => lbs_id(),
		'to'       => $m['to'],
		'subject'  => $m['subject'],
		'html'     => lbs_mail_html( $m['heading'], $m['body'], $m['button'], $m['after'] ),
		'headers'  => $headers,
		'kind'     => $m['kind'],
		'attempts' => 0,
	);
	return lbs_mail_attempt( $item );
}

/** Try one send; record the result; queue on failure. */
function lbs_mail_attempt( $item ) {
	$GLOBALS['lbs_mail_error'] = '';
	$ok = $item['to'] ? wp_mail( $item['to'], $item['subject'], $item['html'], $item['headers'] ) : false;
	$item['attempts']++;
	$queue = get_option( 'lbs_mail_queue', array() );
	$queue = is_array( $queue ) ? $queue : array();
	if ( $ok ) {
		unset( $queue[ $item['id'] ] );
		$status = 'sent';
	} elseif ( $item['attempts'] < 4 ) {
		$item['next_at']       = time() + $item['attempts'] * HOUR_IN_SECONDS;
		$item['error']         = $GLOBALS['lbs_mail_error'] ? $GLOBALS['lbs_mail_error'] : 'The site couldn\'t send the email.';
		$queue[ $item['id'] ] = $item;
		$status                = 'queued';
	} else {
		$item['error']         = $GLOBALS['lbs_mail_error'] ? $GLOBALS['lbs_mail_error'] : 'The site couldn\'t send the email.';
		$item['next_at']       = 0;
		$queue[ $item['id'] ] = $item; // Kept so Jack can retry or discard it.
		$status                = 'failed';
	}
	update_option( 'lbs_mail_queue', array_slice( $queue, -60, null, true ), false );
	lbs_mail_log( $item, $status );
	return $status;
}

function lbs_mail_log( $item, $status ) {
	$log = get_option( 'lbs_mail_log', array() );
	$log = is_array( $log ) ? $log : array();
	array_unshift( $log, array(
		'id'       => $item['id'],
		'at'       => time(),
		'to'       => $item['to'],
		'subject'  => $item['subject'],
		'kind'     => $item['kind'],
		'status'   => $status,
		'attempts' => $item['attempts'],
		'error'    => 'sent' === $status ? '' : ( isset( $item['error'] ) ? $item['error'] : '' ),
	) );
	update_option( 'lbs_mail_log', array_slice( $log, 0, 200 ), false );
}

/** Retry anything due in the queue (runs hourly). */
function lbs_mail_retry_queue( $force_id = '' ) {
	$queue = get_option( 'lbs_mail_queue', array() );
	if ( ! is_array( $queue ) ) { return; }
	foreach ( $queue as $id => $item ) {
		if ( $force_id && $force_id !== $id ) { continue; }
		if ( ! $force_id && ( empty( $item['next_at'] ) || $item['next_at'] > time() ) ) { continue; }
		if ( $force_id ) { $item['attempts'] = min( $item['attempts'], 2 ); }
		lbs_mail_attempt( $item );
	}
}

/** Recipients for a member's email: them, and their guardian in copy. */
function lbs_member_cc( $user_id ) {
	$g = lbs_guardian( $user_id );
	return $g ? array( $g['email'] ) : array();
}

function lbs_is_active( $user_id ) {
	return (bool) get_user_meta( $user_id, '_lbs_activated', true );
}

function lbs_when( $s ) {
	return wp_date( 'l j F', lbs_dt( $s['date'] )->getTimestamp() ) . ( $s['start'] ? ' at ' . $s['start'] : '' );
}

/* -------------------------------------------------------------------------
 * Member emails
 * ---------------------------------------------------------------------- */

function lbs_mail_invite( $user, $url ) {
	$status = lbs_send( array(
		'to'       => $user->user_email,
		'cc'       => lbs_member_cc( $user->ID ),
		'subject'  => 'Your member portal is ready',
		'heading'  => 'Your notes, all in one place',
		'kind'     => 'invite',
		'body'     => array(
			lbs_p( 'Hi ' . esc_html( lbs_first_name( $user->ID ) ) . ',' ),
			lbs_p( 'I&rsquo;ve set you up on the new member portal. From now on you&rsquo;ll find the notes and worksheets from every session there, along with your upcoming bookings and your lesson credit.' ),
			lbs_p( 'There&rsquo;s also the Shed, where your practice tools live: a practice diary, a metronome, a drone, the Shelf of backing tracks and a place to save up questions for me. You choose what I can see.' ),
			lbs_p( 'Set a password to get in. This link works for seven days.' ),
		),
		'button'   => array( 'Set your password', $url ),
		'reply_to' => lbs_jack_email(),
		'after'    => lbs_p( 'All the best,<br>Jack' ),
	) );
	return 'failed' !== $status;
}

function lbs_mail_reset( $user, $url ) {
	return 'failed' !== lbs_send( array(
		'to'      => $user->user_email,
		'subject' => 'Reset your member portal password',
		'heading' => 'Choose a new password',
		'kind'    => 'reset',
		'body'    => array(
			lbs_p( 'Someone (hopefully you) asked to reset the password for your Leith Bass Space member portal.' ),
			lbs_p( 'This link works for one hour. If you didn&rsquo;t ask, you can ignore this email and nothing will change.' ),
		),
		'button'  => array( 'Choose a new password', $url ),
	) );
}

function lbs_mail_notes_ready( $session_id ) {
	$s    = lbs_session( $session_id );
	$user = get_userdata( $s['member'] );
	if ( ! $user || ! lbs_prefs( $user->ID )['notes'] || ! lbs_can_access( $user->ID ) || ! lbs_is_active( $user->ID ) ) { return false; }
	$body = array( lbs_p( 'Hi ' . esc_html( lbs_first_name( $user->ID ) ) . ',' ) );
	$body[] = lbs_p( 'Notes from ' . esc_html( strtolower( lbs_session_label( $s ) ) ) . ( $s['title'] ? ' (<strong>' . esc_html( $s['title'] ) . '</strong>)' : '' ) . ' are in your portal.' );
	if ( $s['objectives'] ) {
		$body[] = lbs_p( '<strong>This week\'s objectives</strong>' ) . '<ul style="margin:0 0 14px;padding-left:20px">' . implode( '', array_map( function ( $o ) { return '<li>' . esc_html( $o ) . '</li>'; }, $s['objectives'] ) ) . '</ul>';
	}
	return 'failed' !== lbs_send( array(
		'to'       => $user->user_email,
		'cc'       => lbs_member_cc( $user->ID ),
		'subject'  => 'Notes from ' . strtolower( lbs_session_label( $s ) ),
		'heading'  => 'Your session notes are up',
		'kind'     => 'notes',
		'body'     => $body,
		'button'   => array( 'Open your notes', lbs_portal_url( 'home', array( 'tab' => 'notes' ) ) ),
		'reply_to' => lbs_jack_email(),
		'after'    => lbs_p( 'All the best,<br>Jack' ),
	) );
}

function lbs_mail_reminder( $s ) {
	$user = get_userdata( $s['member'] );
	if ( ! $user ) { return 'failed'; }
	$body = array(
		lbs_p( 'Hi ' . esc_html( lbs_first_name( $user->ID ) ) . ',' ),
		lbs_p( 'A reminder that your session with Jack is today at <strong>' . esc_html( ( $s['start'] ? $s['start'] . ', ' : '' ) . lbs_length_label( $s['length'] ) ) . '</strong>, at ' . esc_html( lbs_studio_address() ) . '.' ),
	);
	if ( ! lbs_booking_confirmed( $s ) ) { $body[] = lbs_p( 'This booking is still provisional until it&rsquo;s paid.' ); }
	if ( $s['prep'] ) { $body[] = lbs_p( esc_html( $s['prep'] ) ); }
	$body[] = lbs_p( 'If you&rsquo;ve got questions, add them to Questions in the Shed and Jack will see them before you arrive.' );
	return lbs_send( array(
		'to'       => $user->user_email,
		'cc'       => lbs_member_cc( $user->ID ),
		'subject'  => 'Your bass session is today at ' . $s['start'],
		'heading'  => 'See you today',
		'kind'     => 'reminder',
		'body'     => $body,
		'button'   => array( 'Open the portal', lbs_portal_url() ),
		'reply_to' => lbs_jack_email(),
	) );
}

/** A booking moved or was cancelled. Sent whether or not they use the portal. */
function lbs_mail_booking_changed( $s, $before, $change ) {
	$user = get_userdata( $s['member'] );
	if ( ! $user || lbs_member_disabled( $user->ID ) ) { return 'failed'; }
	if ( 'moved' === $change ) {
		$subject = 'Your session has moved to ' . lbs_when( $s );
		$heading = 'Session moved';
		$body    = array(
			lbs_p( 'Hi ' . esc_html( lbs_first_name( $user->ID ) ) . ',' ),
			lbs_p( 'Your session on ' . esc_html( lbs_when( $before ) ) . ' is now on <strong>' . esc_html( lbs_when( $s ) ) . '</strong>, at ' . esc_html( lbs_studio_address() ) . '.' ),
			lbs_p( 'If you downloaded a calendar file for the old time, delete that event. The calendar subscription in your portal updates by itself.' ),
		);
	} else {
		$subject = 'Session cancelled: ' . lbs_when( $before );
		$heading = 'Session cancelled';
		$body    = array(
			lbs_p( 'Hi ' . esc_html( lbs_first_name( $user->ID ) ) . ',' ),
			lbs_p( 'Your session on <strong>' . esc_html( lbs_when( $before ) ) . '</strong> is cancelled' . ( 'cancelled_charged' === $s['status'] ? ' and counts as used.' : ' and isn&rsquo;t charged.' ) ),
			lbs_p( 'Reply to this email if you&rsquo;d like to arrange another time.' ),
		);
	}
	return lbs_send( array(
		'to'       => $user->user_email,
		'cc'       => lbs_member_cc( $user->ID ),
		'subject'  => $subject,
		'heading'  => $heading,
		'kind'     => 'booking',
		'body'     => $body,
		'button'   => array( 'See your bookings', lbs_portal_url( 'home', array( 'tab' => 'bookings' ) ) ),
		'reply_to' => lbs_jack_email(),
		'after'    => lbs_p( 'All the best,<br>Jack' ),
	) );
}

function lbs_mail_nudge( $user_id, $days ) {
	$user = get_userdata( $user_id );
	return lbs_send( array(
		'to'      => $user->user_email,
		'subject' => 'A small nudge from the Shed',
		'heading' => 'Ten minutes in the Shed?',
		'kind'    => 'nudge',
		'body'    => array_filter( array(
			lbs_p( 'Hi ' . esc_html( lbs_first_name( $user_id ) ) . ',' ),
			lbs_p( 'When you next have ten minutes, pick one thing and give it your full attention. Short and focused counts for a lot.' ),
			( function () use ( $user_id ) {
				$latest = lbs_latest_notes( $user_id );
				return ( $latest && ! empty( $latest['objectives'][0] ) ) ? lbs_p( 'From your last session: <strong>' . esc_html( $latest['objectives'][0] ) . '</strong>' ) : '';
			} )(),
		) ),
		'button'  => array( 'Log some practice', lbs_portal_url( 'home', array( 'tab' => 'practice' ) ) ),
	) );
}

function lbs_mail_low_block( $user_id, $balance ) {
	$user = get_userdata( $user_id );
	$left = lbs_hm( max( 0, $balance ) );
	if ( lbs_prefs( $user_id )['low'] && lbs_is_active( $user_id ) ) {
		lbs_send( array(
			'to'       => $user->user_email,
			'cc'       => lbs_member_cc( $user_id ),
			'subject'  => 'Your lesson credit is nearly used up',
			'heading'  => $left . ' of credit left',
			'kind'     => 'credit',
			'body'     => array(
				lbs_p( 'Hi ' . esc_html( lbs_first_name( $user_id ) ) . ',' ),
				lbs_p( 'You have ' . esc_html( $left ) . ' of lesson credit left. Jack will be in touch about the next block, or just reply to this email.' ),
			),
			'button'   => array( 'See your statement', lbs_portal_url( 'home', array( 'tab' => 'bookings' ) ) ),
			'reply_to' => lbs_jack_email(),
		) );
	}
	lbs_send( array(
		'to'      => lbs_jack_email(),
		'subject' => $user->display_name . ' has ' . $left . ' of credit left',
		'heading' => 'Credit running low',
		'kind'    => 'jack',
		'body'    => lbs_p( esc_html( $user->display_name ) . ' has ' . esc_html( $left ) . ' of lesson credit left.' ),
		'button'  => array( 'Open member', admin_url( 'admin.php?page=lbs-members&member=' . $user_id ) ),
	) );
}

/* -------------------------------------------------------------------------
 * Jack's emails
 * ---------------------------------------------------------------------- */

function lbs_mail_to_jack( $user, $subject, $heading, $body, $button = array() ) {
	return lbs_send( array( 'to' => lbs_jack_email(), 'subject' => $subject, 'heading' => $heading, 'kind' => 'jack', 'body' => $body, 'button' => $button, 'reply_to' => $user->user_email ) );
}

function lbs_mail_move_request( $s, $message ) {
	$user = get_userdata( $s['member'] );
	return lbs_mail_to_jack( $user, 'Move request: ' . $user->display_name . ', ' . lbs_when( $s ), 'Can we move this one?', array(
		lbs_p( '<strong>' . esc_html( $user->display_name ) . '</strong> asked to move their session on <strong>' . esc_html( lbs_when( $s ) ) . '</strong>.' ),
		lbs_p( nl2br( esc_html( $message ) ) ),
		lbs_p( 'Reply to this email to answer them. Change the date on the booking and they&rsquo;re emailed the new time.' ),
	), array( 'Open the booking', admin_url( 'post.php?action=edit&post=' . $s['id'] ) ) );
}

function lbs_mail_session_request( $user_id, $message ) {
	$user = get_userdata( $user_id );
	return lbs_mail_to_jack( $user, 'Session request from ' . $user->display_name, 'Can we book a session?', array(
		lbs_p( '<strong>' . esc_html( $user->display_name ) . '</strong> would like to book their next session.' ),
		lbs_p( nl2br( esc_html( $message ) ) ),
	), array( 'Add a session', admin_url( 'post-new.php?post_type=' . LBS_CPT . '&member=' . $user_id ) ) );
}

function lbs_mail_recording( $user_id, $rec ) {
	$user = get_userdata( $user_id );
	return lbs_mail_to_jack( $user, 'New recording from ' . $user->display_name, 'A recording to hear', array(
		lbs_p( esc_html( $user->display_name ) . ' sent <strong>' . esc_html( $rec['name'] ) . '</strong>' . ( $rec['note'] ? ': &ldquo;' . esc_html( $rec['note'] ) . '&rdquo;' : '.' ) ),
		lbs_p( 'It&rsquo;s saved in their Nextcloud folder under Recordings.' ),
	), array( 'Listen', lbs_portal_url( 'file', array( 'r' => $rec['id'], 'u' => $user_id ) ) ) );
}

function lbs_mail_data_request( $user_id, $what, $message ) {
	$user = get_userdata( $user_id );
	return lbs_mail_to_jack( $user, 'Data request from ' . $user->display_name . ': ' . $what, 'Data request', array(
		lbs_p( '<strong>' . esc_html( $user->display_name ) . '</strong> asked: <strong>' . esc_html( $what ) . '</strong>.' ),
		$message ? lbs_p( nl2br( esc_html( $message ) ) ) : '',
		lbs_p( 'Tools → Erase Personal Data in WordPress removes their Shed (practice tools), questions and recordings list. Their account and session records can be removed from their member page.' ),
	), array( 'Open member', admin_url( 'admin.php?page=lbs-members&member=' . $user_id ) ) );
}

function lbs_mail_digest( $sessions ) {
	$body = array( lbs_p( 'Today you have ' . count( $sessions ) . ' session' . ( 1 === count( $sessions ) ? '' : 's' ) . '.' ) );
	foreach ( $sessions as $s ) {
		$user = get_userdata( $s['member'] );
		if ( ! $user ) { continue; }
		$body[] = '<div style="border-top:1px solid #dddddd;padding-top:14px;margin-top:14px">'
			. lbs_p( '<strong>' . esc_html( $s['start'] . ' · ' . $user->display_name ) . '</strong> · ' . esc_html( lbs_session_label( $s ) . ', ' . lbs_length_label( $s['length'] ) . ( lbs_booking_confirmed( $s ) ? '' : ', provisional' ) ) )
			. lbs_prep_html( $user->ID, true )
			. '</div>';
	}
	return lbs_send( array( 'to' => lbs_jack_email(), 'subject' => 'Today\'s sessions: prep', 'heading' => 'Today\'s sessions', 'kind' => 'digest', 'body' => $body, 'button' => array( 'Open Members', admin_url( 'admin.php?page=lbs-members' ) ) ) );
}

/* -------------------------------------------------------------------------
 * Hourly job: retries every hour; the daily work once, after the chosen
 * hour. Each item is marked done only once it's sent or safely queued, and
 * the day is marked complete only at the end, so a run that stops halfway
 * picks up where it left off next hour.
 * ---------------------------------------------------------------------- */

add_action( 'init', function () {
	if ( ! wp_next_scheduled( 'lbs_portal_hourly' ) ) {
		wp_schedule_event( time() + 300, 'hourly', 'lbs_portal_hourly' );
	}
} );

add_action( 'lbs_portal_hourly', 'lbs_mail_retry_queue' );
add_action( 'lbs_portal_hourly', 'lbs_portal_daily_jobs' );

function lbs_portal_daily_jobs() {
	$s     = lbs_settings();
	$today = lbs_today();
	if ( (int) wp_date( 'G' ) < (int) $s['reminder_hour'] || get_option( 'lbs_portal_daily' ) === $today ) { return; }
	$lock = lbs_lock( 'daily-jobs', 0.5 );
	if ( ! $lock ) { return; }

	$todays = array();
	foreach ( lbs_members() as $member ) {
		if ( ! lbs_can_access( $member->ID ) ) { continue; }
		$prefs  = lbs_prefs( $member->ID );
		$active = lbs_is_active( $member->ID );

		foreach ( lbs_upcoming( $member->ID ) as $session ) {
			if ( $session['date'] !== $today ) { continue; }
			$todays[] = $session;
			if ( $active && $prefs['remind'] && get_post_meta( $session['id'], '_lbs_reminded', true ) !== $today ) {
				if ( 'failed' !== lbs_mail_reminder( $session ) ) { update_post_meta( $session['id'], '_lbs_reminded', $today ); }
			}
		}

		if ( $active && $prefs['nudge'] ) {
			$tools = lbs_pr_get( $member->ID, 'tools' );
			if ( $tools['diary'] ) {
				$dates = wp_list_pluck( lbs_pr_get( $member->ID, 'diary' ), 'date' );
				$last  = $dates ? max( $dates ) : wp_date( 'Y-m-d', (int) get_user_meta( $member->ID, '_lbs_activated', true ) );
				$gap   = (int) floor( ( strtotime( $today ) - strtotime( $last ) ) / DAY_IN_SECONDS );
				$sent  = (string) get_user_meta( $member->ID, '_lbs_nudged', true );
				if ( $gap >= 3 && $sent < $last && 'failed' !== lbs_mail_nudge( $member->ID, $gap ) ) {
					update_user_meta( $member->ID, '_lbs_nudged', $today );
				}
			}
		}
	}

	$digest_ok = true;
	if ( $todays && $s['digest'] && get_option( 'lbs_portal_digest' ) !== $today ) {
		usort( $todays, function ( $a, $b ) { return strcmp( $a['start'], $b['start'] ); } );
		$digest_ok = 'failed' !== lbs_mail_digest( $todays );
		if ( $digest_ok ) { update_option( 'lbs_portal_digest', $today, false ); }
	}
	update_option( 'lbs_portal_daily', $today, false );
	lbs_unlock( $lock );
}
