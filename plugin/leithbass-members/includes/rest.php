<?php
/**
 * The portal's REST API (namespace lbs/v1). Every call acts on the signed-in
 * member's own data and passes the same access check as everything else.
 * Administrators previewing a member are read-only.
 *
 * @package LeithBassMembers
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

add_action( 'rest_api_init', function () {
	foreach ( array( 'action' => 'lbs_rest_action', 'recording' => 'lbs_rest_recording' ) as $route => $cb ) {
		register_rest_route( 'lbs/v1', '/' . $route, array( 'methods' => 'POST', 'callback' => $cb, 'permission_callback' => 'lbs_rest_can_write' ) );
	}
	register_rest_route( 'lbs/v1', '/export', array( 'methods' => 'GET', 'callback' => 'lbs_rest_export', 'permission_callback' => 'lbs_rest_can_write' ) );
} );

function lbs_rest_can_write() {
	return lbs_can_access( get_current_user_id() );
}

function lbs_rest_error( $message, $status = 400 ) {
	return new WP_REST_Response( array( 'ok' => false, 'message' => $message ), $status );
}

function lbs_txt( $value, $max = 400 ) {
	$value = trim( sanitize_textarea_field( (string) $value ) );
	return function_exists( 'mb_substr' ) ? mb_substr( $value, 0, $max ) : substr( $value, 0, $max );
}

function lbs_without( $list, $id ) {
	return array_values( array_filter( $list, function ( $item ) use ( $id ) { return ! isset( $item['id'] ) || $item['id'] !== $id; } ) );
}

function lbs_find_index( $list, $id ) {
	foreach ( $list as $i => $item ) {
		if ( isset( $item['id'] ) && $item['id'] === $id ) { return $i; }
	}
	return -1;
}

/* -------------------------------------------------------------------------
 * Cleaners: one per kind of item, used for adding, editing and undo.
 * ---------------------------------------------------------------------- */

function lbs_clean_item( $module, $in, $id = null ) {
	$in = is_array( $in ) ? $in : array();
	$id = $id ? $id : ( ! empty( $in['id'] ) ? sanitize_key( $in['id'] ) : lbs_id() );
	switch ( $module ) {
		case 'diary':
			$date = isset( $in['date'] ) && lbs_valid_date( $in['date'] ) && $in['date'] <= lbs_today() ? $in['date'] : lbs_today();
			$min  = (int) ( $in['min'] ?? 0 );
			if ( $min < 1 || $min > 600 ) { return new WP_Error( 'min', 'Choose how many minutes you practised.' ); }
			return array(
				'id'        => $id,
				'date'      => $date,
				'min'       => $min,
				'tags'      => array_values( array_slice( array_filter( array_map( function ( $t ) { return lbs_txt( $t, 160 ); }, (array) ( $in['tags'] ?? array() ) ) ), 0, 8 ) ),
				'easier'    => lbs_txt( $in['easier'] ?? '', 500 ),
				'attention' => lbs_txt( $in['attention'] ?? '', 500 ),
				'note'      => lbs_txt( $in['note'] ?? '', 4000 ),
				'plan'      => lbs_txt( $in['plan'] ?? '', 300 ),
				'next'      => lbs_txt( $in['next'] ?? '', 300 ),
				'reps'      => in_array( $in['reps'] ?? '', array( 'yes', 'nearly', 'notyet' ), true ) ? $in['reps'] : '',
				'timed'     => ! empty( $in['timed'] ),
			);
		case 'questions':
			$q = lbs_txt( $in['q'] ?? '', 500 );
			if ( '' === $q ) { return new WP_Error( 'q', 'Type your question first.' ); }
			$item = array( 'id' => $id, 'q' => $q, 'added' => isset( $in['added'] ) && lbs_valid_date( $in['added'] ) ? $in['added'] : lbs_today() );
			foreach ( array( 'answered', 'answered_on', 'answer_label' ) as $k ) { if ( ! empty( $in[ $k ] ) ) { $item[ $k ] = sanitize_text_field( $in[ $k ] ); } }
			return $item;
		case 'songs':
			$t = lbs_txt( $in['t'] ?? '', 120 );
			if ( '' === $t ) { return new WP_Error( 't', 'Add a song title.' ); }
			return array( 'id' => $id, 't' => $t, 'a' => lbs_txt( $in['a'] ?? '', 120 ), 's' => min( 2, max( 0, (int) ( $in['s'] ?? 2 ) ) ) );
		case 'goals':
			$text = lbs_txt( $in['text'] ?? '', 200 );
			if ( '' === $text ) { return new WP_Error( 'text', 'Describe the goal first.' ); }
			$status = sanitize_key( $in['status'] ?? 'not_yet' );
			return array( 'id' => $id, 'text' => $text, 'by' => lbs_txt( $in['by'] ?? '', 60 ), 'status' => in_array( $status, array( 'not_yet', 'started', 'on_track', 'done' ), true ) ? $status : 'not_yet' );
		case 'listening':
			$title = lbs_txt( $in['title'] ?? '', 150 );
			if ( '' === $title ) { return new WP_Error( 'title', 'Add a track title.' ); }
			return array( 'id' => $id, 'title' => $title, 'artist' => lbs_txt( $in['artist'] ?? '', 120 ), 'note' => lbs_txt( $in['note'] ?? '', 300 ), 'from' => 'member', 'added' => lbs_today() );
		case 'tempo':
			$name = lbs_txt( $in['name'] ?? '', 80 );
			if ( '' === $name ) { return new WP_Error( 'name', 'Give the exercise a name.' ); }
			$target = (int) ( $in['target'] ?? 0 );
			$log    = array();
			foreach ( (array) ( $in['log'] ?? array() ) as $p ) {
				if ( is_array( $p ) && isset( $p[0], $p[1] ) && lbs_valid_date( $p[0] ) ) {
					$log[] = array( $p[0], max( 20, min( 320, (int) $p[1] ) ), in_array( $p[2] ?? 'clean', array( 'clean', 'nearly', 'rough' ), true ) ? ( $p[2] ?? 'clean' ) : 'clean' );
				}
			}
			return array( 'id' => $id, 'name' => $name, 'target' => ( $target >= 20 && $target <= 320 ) ? $target : 0, 'log' => array_slice( $log, -150 ) );
	}
	return new WP_Error( 'module', 'Unknown tool.' );
}

/** Store limits per tool. */
function lbs_list_cap( $module ) {
	$caps = array( 'diary' => 1000, 'questions' => 200, 'songs' => 150, 'goals' => 30, 'listening' => 150, 'tempo' => 30 );
	return isset( $caps[ $module ] ) ? $caps[ $module ] : 100;
}

/* -------------------------------------------------------------------------
 * The action endpoint
 * ---------------------------------------------------------------------- */

function lbs_rest_action( WP_REST_Request $req ) {
	$uid    = get_current_user_id();
	$p      = $req->get_json_params();
	$p      = is_array( $p ) ? $p : $req->get_params();
	$action = sanitize_key( $p['action'] ?? '' );
	$id     = sanitize_key( $p['id'] ?? '' );
	$module = sanitize_key( $p['module'] ?? '' );
	$msg    = '';
	$extra  = array();
	$lists  = array( 'diary', 'questions', 'songs', 'goals', 'listening', 'tempo' );

	switch ( $action ) {
		case 'tool':
			$tool = sanitize_key( $p['tool'] ?? '' );
			if ( ! isset( lbs_pr_tools()[ $tool ] ) ) { return lbs_rest_error( 'Unknown tool.' ); }
			$r = lbs_pr_update( $uid, 'tools', function ( $t ) use ( $tool, $p ) { $t[ $tool ] = ! empty( $p['on'] ); return $t; } );
			break;

		case 'share':
			if ( ! in_array( $module, array( 'diary', 'habit', 'tempo', 'listening' ), true ) ) { return lbs_rest_error( 'That tool can\'t be shared.' ); }
			$r   = lbs_pr_update( $uid, 'share', function ( $s ) use ( $module, $p ) { $s[ $module ] = ! empty( $p['on'] ); return $s; } );
			$msg = ! empty( $p['on'] ) ? 'Jack can see this now.' : 'Hidden from Jack now.';
			break;

		// Add, edit, remove and undo for every list-based tool.
		case 'add':
		case 'edit':
		case 'restore':
			if ( ! in_array( $module, $lists, true ) ) { return lbs_rest_error( 'Unknown tool.' ); }
			$r = lbs_pr_update( $uid, $module, function ( $list ) use ( $action, $module, $p, $id ) {
				$i = $id ? lbs_find_index( $list, $id ) : -1;
				if ( 'edit' === $action ) {
					if ( $i < 0 ) { return new WP_Error( 'gone', 'That entry has been removed.' ); }
					$merged = array_merge( $list[ $i ], (array) ( $p['item'] ?? array() ) );
					if ( 'listening' === $module && 'jack' === $list[ $i ]['from'] ) { return new WP_Error( 'jack', 'Jack\'s recommendations can\'t be edited.' ); }
					$item = lbs_clean_item( $module, $merged, $list[ $i ]['id'] );
					if ( is_wp_error( $item ) ) { return $item; }
					if ( 'listening' === $module ) { $item['added'] = $list[ $i ]['added']; }
					$list[ $i ] = $item;
					return $list;
				}
				if ( 'restore' === $action && $i >= 0 ) { return $list; } // Already back.
				$item = lbs_clean_item( $module, (array) ( $p['item'] ?? array() ), 'restore' === $action ? null : lbs_id() );
				if ( is_wp_error( $item ) ) { return $item; }
				$at = isset( $p['at'] ) ? max( 0, min( count( $list ), (int) $p['at'] ) ) : null;
				if ( 'diary' === $module && 'add' === $action ) { array_unshift( $list, $item ); }
				elseif ( null !== $at ) { array_splice( $list, $at, 0, array( $item ) ); }
				else { $list[] = $item; }
				if ( 'diary' === $module ) { usort( $list, function ( $a, $b ) { return strcmp( $b['date'], $a['date'] ); } ); }
				$cap = lbs_list_cap( $module );
				return 'diary' === $module ? array_slice( $list, 0, $cap ) : array_slice( $list, -$cap );
			} );
			if ( ! is_wp_error( $r ) && 'add' === $action ) {
				$msg = array( 'diary' => 'Added to your diary.', 'questions' => 'Added. Jack will see it before your session.', 'songs' => 'Added.', 'goals' => 'Goal added.', 'listening' => 'Added to your list.', 'tempo' => 'Exercise added.' )[ $module ];
			} elseif ( ! is_wp_error( $r ) && 'edit' === $action ) {
				$msg = 'Saved.';
			}
			break;

		case 'remove':
			if ( ! in_array( $module, $lists, true ) ) { return lbs_rest_error( 'Unknown tool.' ); }
			$removed = null;
			$at      = -1;
			$r       = lbs_pr_update( $uid, $module, function ( $list ) use ( $id, $module, &$removed, &$at ) {
				$at = lbs_find_index( $list, $id );
				if ( $at < 0 ) { return $list; }
				if ( 'listening' === $module && 'jack' === $list[ $at ]['from'] ) { return new WP_Error( 'jack', 'Jack\'s recommendations stay on the list.' ); }
				$removed = $list[ $at ];
				array_splice( $list, $at, 1 );
				return $list;
			} );
			if ( $removed ) { $extra = array( 'undo' => array( 'module' => $module, 'item' => $removed, 'at' => $at ) ); $msg = 'Removed.'; }
			break;

		case 'song_move':
			$r = lbs_pr_update( $uid, 'songs', function ( $list ) use ( $id, $p ) {
				$i = lbs_find_index( $list, $id );
				if ( $i >= 0 ) { $list[ $i ]['s'] = min( 2, max( 0, (int) ( $p['s'] ?? 0 ) ) ); }
				return $list;
			} );
			break;

		case 'goal_status':
			$status = sanitize_key( $p['status'] ?? '' );
			if ( ! in_array( $status, array( 'not_yet', 'started', 'on_track', 'done' ), true ) ) { return lbs_rest_error( 'Unknown progress.' ); }
			$r = lbs_pr_update( $uid, 'goals', function ( $list ) use ( $id, $status ) {
				$i = lbs_find_index( $list, $id );
				if ( $i >= 0 ) { $list[ $i ]['status'] = $status; }
				return $list;
			} );
			break;

		case 'tempo_log':
			$bpm     = (int) ( $p['bpm'] ?? 0 );
			$quality = in_array( $p['quality'] ?? 'clean', array( 'clean', 'nearly', 'rough' ), true ) ? ( $p['quality'] ?? 'clean' ) : 'clean';
			if ( $bpm < 20 || $bpm > 320 ) { return lbs_rest_error( 'Enter a tempo between 20 and 320 bpm.' ); }
			$r = lbs_pr_update( $uid, 'tempo', function ( $list ) use ( $id, $bpm, $quality ) {
				$i = lbs_find_index( $list, $id );
				if ( $i < 0 ) { return new WP_Error( 'ex', 'Pick an exercise first.' ); }
				$list[ $i ]['log'][] = array( lbs_today(), $bpm, $quality );
				$list[ $i ]['log']   = array_slice( $list[ $i ]['log'], -150 );
				return $list;
			} );
			$msg = 'Logged ' . $bpm . ' bpm.';
			break;

		case 'tempo_unlog':
			$r = lbs_pr_update( $uid, 'tempo', function ( $list ) use ( $id ) {
				$i = lbs_find_index( $list, $id );
				if ( $i >= 0 && ! empty( $list[ $i ]['log'] ) ) { array_pop( $list[ $i ]['log'] ); }
				return $list;
			} );
			$msg = 'Last tempo removed.';
			break;

		case 'habit':
			$r = lbs_pr_update( $uid, 'habit', function ( $h ) use ( $p ) {
				if ( isset( $p['days'] ) || isset( $p['min'] ) ) {
					$days = max( 0, min( 7, (int) ( $p['days'] ?? $h['days'] ) ) );
					$min  = max( 0, min( 180, (int) ( $p['min'] ?? $h['min'] ) ) );
					if ( $days !== (int) $h['days'] || $min !== (int) $h['min'] ) { $h['by'] = 'member'; $h['set'] = lbs_today(); }
					$h['days'] = $days; $h['min'] = $min;
				}
				if ( isset( $p['rest'] ) ) {
					$h['rest'] = array_values( array_unique( array_filter( array_map( 'intval', (array) $p['rest'] ), function ( $d ) { return $d >= 0 && $d <= 6; } ) ) );
				}
				if ( isset( $p['slots'] ) ) {
					$slots = array();
					foreach ( array_slice( (array) $p['slots'], 0, 7 ) as $sl ) {
						if ( ! is_array( $sl ) || ! preg_match( '/^([01]\d|2[0-3]):[0-5]\d$/', (string) ( $sl['time'] ?? '' ) ) ) { continue; }
						$slots[] = array( 'day' => max( 0, min( 6, (int) ( $sl['day'] ?? 0 ) ) ), 'time' => $sl['time'], 'min' => max( 5, min( 180, (int) ( $sl['min'] ?? 20 ) ) ) );
					}
					usort( $slots, function ( $a, $b ) { return ( ( $a['day'] + 6 ) % 7 ) * 10000 + (int) str_replace( ':', '', $a['time'] ) - ( ( ( $b['day'] + 6 ) % 7 ) * 10000 + (int) str_replace( ':', '', $b['time'] ) ); } );
					$h['slots'] = $slots;
				}
				if ( isset( $p['slots_cal'] ) ) { $h['slots_cal'] = ! empty( $p['slots_cal'] ); }
				if ( array_key_exists( 'pause', $p ) ) {
					$pa = $p['pause'];
					if ( is_array( $pa ) && lbs_valid_date( $pa['from'] ?? '' ) && lbs_valid_date( $pa['to'] ?? '' ) && $pa['to'] >= $pa['from'] ) {
						$h['pause'] = array( 'from' => $pa['from'], 'to' => min( $pa['to'], lbs_dt( $pa['from'] )->modify( '+60 days' )->format( 'Y-m-d' ) ) );
					} elseif ( empty( $pa ) ) {
						$h['pause'] = null;
					} else {
						return new WP_Error( 'pause', 'Choose when the break starts and ends.' );
					}
				}
				return $h;
			} );
			$msg = 'Saved.';
			break;

		case 'gear':
			$r = lbs_pr_update( $uid, 'gear', function ( $g ) use ( $p ) {
				foreach ( array( 'bass', 'strings', 'setup' ) as $k ) { $g[ $k ] = lbs_txt( $p[ $k ] ?? '', 300 ); }
				$g['changed'] = lbs_valid_date( $p['changed'] ?? '' ) ? $p['changed'] : '';
				return $g;
			} );
			$msg = 'Saved.';
			break;

		case 'strings_today':
			$r   = lbs_pr_update( $uid, 'gear', function ( $g ) { $g['changed'] = lbs_today(); return $g; } );
			$msg = 'Noted. Fresh strings.';
			break;

		case 'rec_delete':
			$gone = null;
			$r    = lbs_pr_update( $uid, 'recordings', function ( $list ) use ( $id, &$gone ) {
				$i = lbs_find_index( $list, $id );
				if ( $i < 0 ) { return $list; }
				$gone = $list[ $i ];
				array_splice( $list, $i, 1 );
				return $list;
			} );
			if ( $gone ) {
				$del = lbs_nc_delete( lbs_member_path( $uid, 'Recordings/' . $gone['file'] ) );
				if ( is_wp_error( $del ) ) {
					lbs_pr_update( $uid, 'recordings', function ( $list ) use ( $gone ) { array_unshift( $list, $gone ); return $list; } );
					return lbs_rest_error( 'The recording couldn\'t be deleted just now. ' . $del->get_error_message() );
				}
			}
			$msg = 'Recording deleted, including Jack\'s copy.';
			break;

		case 'objective':
			$sid = (int) ( $p['session'] ?? 0 );
			$oid = sanitize_key( $p['obj'] ?? '' );
			$s   = $sid ? lbs_session( $sid ) : null;
			if ( ! $s || $s['member'] !== $uid || ! $s['published'] || ! in_array( $oid, wp_list_pluck( $s['obj'], 'id' ), true ) ) { return lbs_rest_error( 'That objective has changed. Refresh to see the latest.' ); }
			$r = lbs_pr_update( $uid, 'objdone', function ( $all ) use ( $sid, $oid, $p ) {
				$done = isset( $all[ $sid ] ) ? array_values( array_diff( (array) $all[ $sid ], array( $oid ) ) ) : array();
				if ( ! empty( $p['done'] ) ) { $done[] = $oid; }
				$all[ $sid ] = $done;
				return array_slice( $all, -60, null, true );
			} );
			break;

		case 'prefs':
			$key   = sanitize_key( $p['key'] ?? '' );
			$prefs = lbs_prefs( $uid );
			if ( ! array_key_exists( $key, $prefs ) ) { return lbs_rest_error( 'Unknown setting.' ); }
			$prefs[ $key ] = empty( $p['on'] ) ? 0 : 1;
			update_user_meta( $uid, '_lbs_prefs', $prefs );
			return new WP_REST_Response( array( 'ok' => true, 'message' => $prefs[ $key ] ? 'You\'ll get these emails.' : 'You won\'t get these emails.' ) );

		case 'account':
			$user  = wp_get_current_user();
			$name  = lbs_txt( $p['name'] ?? '', 80 );
			$email = sanitize_email( $p['email'] ?? '' );
			if ( '' === $name ) { return lbs_rest_error( 'Your name can\'t be empty.' ); }
			if ( ! is_email( $email ) ) { return lbs_rest_error( 'That email address doesn\'t look complete.' ); }
			$parts  = preg_split( '/\s+/', $name, 2 );
			$update = array( 'ID' => $uid, 'display_name' => $name, 'first_name' => $parts[0], 'last_name' => $parts[1] ?? '' );
			if ( strtolower( $email ) !== strtolower( $user->user_email ) ) {
				if ( ! wp_check_password( (string) ( $p['current'] ?? '' ), $user->user_pass, $uid ) ) { return lbs_rest_error( 'To change your email, enter your current password too.' ); }
				$other = email_exists( $email );
				if ( $other && (int) $other !== $uid ) { return lbs_rest_error( 'That email address is already in use.' ); }
				$update['user_email'] = $email;
			}
			$result = wp_update_user( $update );
			if ( is_wp_error( $result ) ) { return lbs_rest_error( $result->get_error_message() ); }
			update_user_meta( $uid, '_lbs_phone', lbs_txt( $p['phone'] ?? '', 40 ) );
			return new WP_REST_Response( array( 'ok' => true, 'message' => isset( $update['user_email'] ) ? 'Saved. Sign in with your new email from now on.' : 'Details saved.' ) );

		case 'password':
			$user = wp_get_current_user();
			$new  = (string) ( $p['new'] ?? '' );
			if ( ! wp_check_password( (string) ( $p['current'] ?? '' ), $user->user_pass, $uid ) ) { return lbs_rest_error( 'Your current password isn\'t right.' ); }
			if ( strlen( $new ) < LBS_MIN_PASSWORD ) { return lbs_rest_error( 'Your new password needs at least ' . LBS_MIN_PASSWORD . ' characters.' ); }
			if ( strtolower( $new ) === strtolower( $user->user_email ) ) { return lbs_rest_error( 'Pick something other than your email address.' ); }
			wp_set_password( $new, $uid );
			wp_set_auth_cookie( $uid, true, is_ssl() );
			return new WP_REST_Response( array( 'ok' => true, 'reload' => lbs_portal_url( 'home', array( 'tab' => 'account', 'pw' => 'changed' ) ) ) );

		case 'move':
			$sid     = (int) ( $p['session'] ?? 0 );
			$message = lbs_txt( $p['message'] ?? '', 1000 );
			$s       = $sid ? lbs_session( $sid ) : null;
			if ( ! $s || $s['member'] !== $uid || 'upcoming' !== $s['status'] || ! $s['published'] ) { return lbs_rest_error( 'That booking couldn\'t be found.' ); }
			if ( '' === $message ) { return lbs_rest_error( 'Add a line about when would suit, then send.' ); }
			if ( lbs_rate_limited( 'move-' . $uid, 10, DAY_IN_SECONDS ) ) { return lbs_rest_error( 'You\'ve sent a lot of requests today. Reply to one of Jack\'s emails instead.' ); }
			update_post_meta( $sid, '_lbs_move_request', array( 'message' => $message, 'at' => time() ) );
			lbs_mail_move_request( $s, $message );
			return new WP_REST_Response( array( 'ok' => true, 'message' => 'Sent to Jack. He\'ll confirm the new time by email.' ) );

		case 'request_session':
			$message = lbs_txt( $p['message'] ?? '', 1000 );
			if ( '' === $message ) { return lbs_rest_error( 'Add a line about what would suit.' ); }
			if ( lbs_rate_limited( 'req-' . $uid, 5, DAY_IN_SECONDS ) ) { return lbs_rest_error( 'Jack has your request. Reply to one of his emails if anything changes.' ); }
			lbs_mail_session_request( $uid, $message );
			return new WP_REST_Response( array( 'ok' => true, 'message' => 'Sent to Jack. He\'ll reply by email.' ) );

		case 'data_request':
			$what = 'delete' === ( $p['kind'] ?? '' ) ? 'Delete my account and data' : 'Something else about my data';
			if ( lbs_rate_limited( 'data-' . $uid, 3, DAY_IN_SECONDS ) ) { return lbs_rest_error( 'Jack has your request already.' ); }
			lbs_mail_data_request( $uid, $what, lbs_txt( $p['message'] ?? '', 1000 ) );
			return new WP_REST_Response( array( 'ok' => true, 'message' => 'Sent to Jack. He\'ll confirm by email.' ) );

		case 'calendar_renew':
			return new WP_REST_Response( array( 'ok' => true, 'message' => 'New calendar link made. The old one has stopped working.', 'calendar' => lbs_calendar_url_renewed( $uid ) ) );

		default:
			return lbs_rest_error( 'Unknown action.' );
	}

	if ( isset( $r ) && is_wp_error( $r ) ) {
		return lbs_rest_error( $r->get_error_message(), 'lbs_busy' === $r->get_error_code() ? 409 : 400 );
	}
	return new WP_REST_Response( array_merge( array( 'ok' => true, 'message' => $msg, 'state' => lbs_pr_view( $uid ) ), $extra ) );
}

function lbs_calendar_url_renewed( $uid ) {
	lbs_calendar_token( $uid, true );
	return lbs_calendar_url( $uid );
}

/* -------------------------------------------------------------------------
 * Recordings: type, size and space are checked on the server.
 * ---------------------------------------------------------------------- */

function lbs_recording_limits( $uid ) {
	$s     = lbs_settings();
	$max   = min( (int) $s['upload_mb'] * MB_IN_BYTES, (int) wp_max_upload_size() );
	$used  = array_sum( array_map( function ( $r ) { return (int) ( $r['size'] ?? 0 ); }, lbs_pr_get( $uid, 'recordings' ) ) );
	$quota = (int) $s['quota_mb'] * MB_IN_BYTES;
	return array( 'max' => $max, 'used' => $used, 'quota' => $quota, 'left' => max( 0, $quota - $used ) );
}

function lbs_rest_recording( WP_REST_Request $req ) {
	$uid    = get_current_user_id();
	$files  = $req->get_file_params();
	$limits = lbs_recording_limits( $uid );
	if ( ! lbs_pr_get( $uid, 'tools' )['recordings'] ) { return lbs_rest_error( 'Switch on "Send Jack a recording" first.' ); }
	if ( empty( $files['file'] ) || ! empty( $files['file']['error'] ) || ! is_uploaded_file( $files['file']['tmp_name'] ) ) {
		return lbs_rest_error( 'The upload didn\'t arrive. It may be bigger than ' . size_format( $limits['max'] ) . ', the largest this site accepts.' );
	}
	$file = $files['file'];
	$size = (int) filesize( $file['tmp_name'] );
	if ( $size > $limits['max'] ) { return lbs_rest_error( 'That file is ' . size_format( $size ) . '. The limit is ' . size_format( $limits['max'] ) . '. Trim it or send a shorter take.' ); }
	if ( $size > $limits['left'] ) { return lbs_rest_error( 'Your recordings space is full (' . size_format( $limits['quota'] ) . '). Delete an old recording first.' ); }

	// Check what the file really is, not just its name.
	$real = '';
	if ( function_exists( 'finfo_open' ) ) {
		$fi   = finfo_open( FILEINFO_MIME_TYPE );
		$real = (string) finfo_file( $fi, $file['tmp_name'] );
		finfo_close( $fi );
	}
	$ext = strtolower( pathinfo( $file['name'], PATHINFO_EXTENSION ) );
	$ok_ext  = in_array( lbs_file_kind( $file['name'] ), array( 'audio', 'video' ), true );
	$ok_type = '' === $real ? $ok_ext : ( 0 === strpos( $real, 'audio/' ) || 0 === strpos( $real, 'video/' ) || 'application/octet-stream' === $real && $ok_ext );
	if ( ! $ok_ext || ! $ok_type ) { return lbs_rest_error( 'Send an audio or video file (for example .m4a, .mp3, .wav or .mp4).' ); }
	if ( lbs_rate_limited( 'rec-' . $uid, 10, DAY_IN_SECONDS ) ) { return lbs_rest_error( 'That\'s plenty of recordings for one day. Try again tomorrow.' ); }

	$name   = sanitize_file_name( pathinfo( $file['name'], PATHINFO_FILENAME ) );
	$stored = wp_date( 'Y-m-d His' ) . ' ' . ( $name ? $name : 'recording' ) . '.' . $ext;
	$put    = lbs_nc_put( lbs_member_path( $uid, 'Recordings/' . $stored ), $file['tmp_name'] );
	if ( is_wp_error( $put ) ) { return lbs_rest_error( 'The recording couldn\'t be saved just now. ' . $put->get_error_message(), 502 ); }

	$rec = array( 'id' => lbs_id(), 'name' => sanitize_text_field( $file['name'] ), 'file' => $stored, 'size' => $size, 'added' => lbs_today(), 'note' => lbs_txt( $req->get_param( 'note' ), 300 ), 'listened' => false );
	lbs_pr_update( $uid, 'recordings', function ( $list ) use ( $rec ) { array_unshift( $list, $rec ); return array_slice( $list, 0, 100 ); } );
	lbs_mail_recording( $uid, $rec );
	return new WP_REST_Response( array( 'ok' => true, 'message' => 'Sent to Jack. He\'ll listen before your next session.', 'state' => lbs_pr_view( $uid ), 'limits' => lbs_recording_limits( $uid ) ) );
}

/** Everything the portal holds about the member, as JSON (Account → Download my data). */
function lbs_rest_export() {
	return new WP_REST_Response( lbs_export_data( get_current_user_id() ) );
}
