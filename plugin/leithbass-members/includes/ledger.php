<?php
/**
 * Lesson credit: blocks bought, sessions used, adjustments and expiry.
 *
 * Everything is worked in whole minutes. Usage comes off the block that
 * expires first. Nothing is deleted: a mistaken block is voided with a
 * reason, and corrections are recorded as adjustments, so the statement
 * always explains itself.
 *
 * @package LeithBassMembers
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

/** Blocks, oldest first. Each: id, date, hours, price, expires, void, void_reason. */
function lbs_blocks( $user_id, $include_void = true ) {
	$blocks = get_user_meta( $user_id, '_lbs_blocks', true );
	$blocks = is_array( $blocks ) ? $blocks : array();
	foreach ( $blocks as &$b ) {
		$b = wp_parse_args( $b, array( 'id' => lbs_id(), 'date' => lbs_today(), 'hours' => 0, 'price' => 0, 'expires' => '', 'void' => false, 'void_reason' => '' ) );
	}
	unset( $b );
	usort( $blocks, function ( $a, $b ) { return strcmp( $a['date'], $b['date'] ); } );
	return $include_void ? $blocks : array_values( array_filter( $blocks, function ( $b ) { return empty( $b['void'] ); } ) );
}

/** Default expiry for a block bought on $date, from Portal settings. */
function lbs_block_expiry( $date ) {
	$months = (int) lbs_settings()['block_months'];
	return $months > 0 ? lbs_dt( $date )->modify( '+' . $months . ' months' )->modify( '-1 day' )->format( 'Y-m-d' ) : '';
}

function lbs_add_block( $user_id, $date, $hours, $price, $expires = null ) {
	$blocks   = lbs_blocks( $user_id );
	$blocks[] = array(
		'id'      => lbs_id(),
		'date'    => $date,
		'hours'   => (float) $hours,
		'price'   => (float) $price,
		'expires' => null === $expires ? lbs_block_expiry( $date ) : $expires,
		'void'    => false,
	);
	update_user_meta( $user_id, '_lbs_blocks', $blocks );
}

function lbs_block_label( $block ) {
	$label = lbs_hm( lbs_minutes( $block['hours'] ) ) . ' block';
	if ( ! empty( $block['price'] ) ) { $label .= ', £' . lbs_hours_short( $block['price'] ); }
	return $label;
}

/** Manual adjustments: id, date, minutes (+/-), note, by, at. */
function lbs_adjustments( $user_id ) {
	$adj = get_user_meta( $user_id, '_lbs_adjustments', true );
	return is_array( $adj ) ? $adj : array();
}

/**
 * Work out the member's credit.
 *
 * Returns null for pay-as-you-go members (no blocks ever). Otherwise:
 *   rows       statement lines up to today (date, label, minutes, balance, type)
 *   balance    available credit now, in minutes (negative if overdrawn)
 *   booked     minutes of upcoming sessions set to count against credit
 *   covered    session id => true when credit covers that upcoming booking
 *   expiring   array( date, minutes ) for the next credit to expire, or null
 *   pool       minutes in the current (unexpired) blocks, for the meter
 *   next       the next upcoming counted session, or null
 */
function lbs_ledger( $user_id ) {
	$blocks = lbs_blocks( $user_id );
	if ( ! $blocks ) { return null; }
	$today  = lbs_today();
	$events = array();

	foreach ( $blocks as $b ) {
		if ( ! empty( $b['void'] ) ) {
			$events[] = array( 'date' => $b['date'], 'order' => 0, 'type' => 'void', 'label' => lbs_block_label( $b ) . ' (voided: ' . ( $b['void_reason'] ? $b['void_reason'] : 'no reason given' ) . ')', 'minutes' => 0 );
			continue;
		}
		$events[] = array( 'date' => $b['date'], 'order' => 0, 'type' => 'buy', 'label' => lbs_block_label( $b ), 'minutes' => lbs_minutes( $b['hours'] ), 'bucket' => $b['id'], 'expires' => $b['expires'] );
		if ( $b['expires'] ) {
			$events[] = array( 'date' => $b['expires'], 'order' => 3, 'type' => 'expire', 'bucket' => $b['id'], 'label' => 'Expired from ' . lbs_block_label( $b ) );
		}
	}
	foreach ( lbs_adjustments( $user_id ) as $a ) {
		$events[] = array( 'date' => $a['date'], 'order' => $a['minutes'] >= 0 ? 0 : 1, 'type' => $a['minutes'] >= 0 ? 'credit' : 'debit', 'label' => 'Adjustment: ' . $a['note'], 'minutes' => (int) $a['minutes'], 'bucket' => 'adj-' . $a['id'], 'expires' => '' );
	}
	$first = $blocks[0]['date'];
	foreach ( lbs_member_sessions( $user_id ) as $s ) {
		if ( ! $s['block'] || $s['date'] < $first ) { continue; }
		if ( 'done' === $s['status'] ) {
			$events[] = array( 'date' => $s['date'], 'order' => 1, 'type' => 'use', 'label' => lbs_session_label( $s ), 'minutes' => -$s['minutes'], 'session' => $s['id'] );
		} elseif ( 'cancelled_charged' === $s['status'] ) {
			$events[] = array( 'date' => $s['date'], 'order' => 1, 'type' => 'use', 'label' => lbs_session_label( $s ) . ', cancelled (charged)', 'minutes' => -$s['minutes'], 'session' => $s['id'] );
		} elseif ( 'cancelled_free' === $s['status'] ) {
			$events[] = array( 'date' => $s['date'], 'order' => 1, 'type' => 'cx', 'label' => lbs_session_label( $s ) . ', cancelled (not charged)', 'minutes' => 0 );
		} elseif ( 'upcoming' === $s['status'] && $s['date'] >= $today ) {
			$events[] = array( 'date' => $s['date'], 'order' => 2, 'type' => 'booked', 'label' => lbs_session_label( $s ) . ' (booked)', 'minutes' => -$s['minutes'], 'session' => $s['id'], 'session_data' => $s );
		}
	}
	usort( $events, function ( $a, $b ) {
		return strcmp( $a['date'] . $a['order'], $b['date'] . $b['order'] );
	} );

	$buckets  = array(); // id => array( remaining, expires, size )
	$owed     = 0;
	$rows     = array();
	$covered  = array();
	$booked   = 0;
	$next     = null;
	$balance  = 0;
	$take     = function ( $need, $date ) use ( &$buckets ) {
		uasort( $buckets, function ( $a, $b ) {
			$ea = $a['expires'] ? $a['expires'] : '9999-99-99';
			$eb = $b['expires'] ? $b['expires'] : '9999-99-99';
			return strcmp( $ea, $eb );
		} );
		foreach ( $buckets as &$bk ) {
			if ( $need <= 0 ) { break; }
			if ( $bk['remaining'] <= 0 || ( $bk['expires'] && $bk['expires'] < $date ) ) { continue; }
			$t                = min( $need, $bk['remaining'] );
			$bk['remaining'] -= $t;
			$need            -= $t;
		}
		unset( $bk );
		return $need; // uncovered minutes
	};

	foreach ( $events as $e ) {
		$future = $e['date'] > $today || 'booked' === $e['type'];

		switch ( $e['type'] ) {
			case 'buy':
			case 'credit':
				$buckets[ $e['bucket'] ] = array( 'remaining' => $e['minutes'], 'expires' => $e['expires'], 'size' => $e['minutes'], 'bought' => $e['date'] );
				if ( $owed > 0 ) {
					$pay = min( $owed, $e['minutes'] );
					$buckets[ $e['bucket'] ]['remaining'] -= $pay;
					$owed -= $pay;
				}
				$delta = $e['minutes'];
				break;
			case 'use':
			case 'debit':
				$owed += $take( -$e['minutes'], $e['date'] );
				$delta = $e['minutes'];
				break;
			case 'booked':
				$uncovered = $take( -$e['minutes'], $e['date'] );
				$covered[ $e['session'] ] = 0 === $uncovered;
				$owed   += $uncovered;
				$booked += -$e['minutes'];
				if ( ! $next ) { $next = $e['session_data']; }
				$delta = $e['minutes'];
				break;
			case 'expire':
				if ( $e['date'] >= $today ) { continue 2; } // Still valid today.
				$lost = isset( $buckets[ $e['bucket'] ] ) ? max( 0, $buckets[ $e['bucket'] ]['remaining'] ) : 0;
				if ( isset( $buckets[ $e['bucket'] ] ) ) { $buckets[ $e['bucket'] ]['remaining'] = 0; }
				$delta = -$lost;
				if ( ! $lost ) { continue 2; }
				break;
			default:
				$delta = 0;
		}

		if ( ! $future ) {
			$balance += $delta;
			$rows[]   = array( 'date' => $e['date'], 'label' => $e['label'], 'minutes' => $delta, 'balance' => $balance, 'type' => $e['type'] );
		}
	}

	// Credit that still expires in future, soonest first.
	$expiring = null;
	$pool     = 0;
	foreach ( lbs_blocks( $user_id, false ) as $b ) {
		if ( $b['expires'] && $b['expires'] < $today ) { continue; }
		$pool += lbs_minutes( $b['hours'] );
	}
	// Remaining credit per block as of today (before bookings), for the expiry notice.
	$state = lbs_ledger_buckets_today( $blocks, $user_id );
	foreach ( $state as $bk ) {
		if ( $bk['remaining'] > 0 && $bk['expires'] && $bk['expires'] >= $today ) {
			if ( ! $expiring || $bk['expires'] < $expiring['date'] ) { $expiring = array( 'date' => $bk['expires'], 'minutes' => $bk['remaining'] ); }
		}
	}

	return array(
		'rows'     => $rows,
		'balance'  => $balance,
		'booked'   => $booked,
		'covered'  => $covered,
		'expiring' => $expiring,
		'pool'     => max( $pool, $balance ),
		'next'     => $next,
		'last'     => end( $blocks ),
	);
}

/** Remaining minutes per unexpired block as of today (ignores bookings). */
function lbs_ledger_buckets_today( $blocks, $user_id ) {
	$today   = lbs_today();
	$buckets = array();
	$uses    = array();
	foreach ( $blocks as $b ) {
		if ( ! empty( $b['void'] ) ) { continue; }
		$buckets[ $b['id'] ] = array( 'remaining' => lbs_minutes( $b['hours'] ), 'expires' => $b['expires'], 'bought' => $b['date'] );
	}
	foreach ( lbs_adjustments( $user_id ) as $a ) {
		if ( $a['minutes'] >= 0 ) { $buckets[ 'adj-' . $a['id'] ] = array( 'remaining' => (int) $a['minutes'], 'expires' => '', 'bought' => $a['date'] ); }
		else { $uses[] = array( $a['date'], -(int) $a['minutes'] ); }
	}
	$first = $blocks ? $blocks[0]['date'] : $today;
	foreach ( lbs_member_sessions( $user_id, array( 'done', 'cancelled_charged' ) ) as $s ) {
		if ( $s['block'] && $s['date'] >= $first && $s['date'] <= $today ) { $uses[] = array( $s['date'], $s['minutes'] ); }
	}
	usort( $uses, function ( $a, $b ) { return strcmp( $a[0], $b[0] ); } );
	foreach ( $uses as $u ) {
		$need = $u[1];
		uasort( $buckets, function ( $a, $b ) { return strcmp( $a['expires'] ? $a['expires'] : '9999', $b['expires'] ? $b['expires'] : '9999' ); } );
		foreach ( $buckets as &$bk ) {
			if ( $need <= 0 ) { break; }
			if ( $bk['bought'] > $u[0] || $bk['remaining'] <= 0 || ( $bk['expires'] && $bk['expires'] < $u[0] ) ) { continue; }
			$t = min( $need, $bk['remaining'] );
			$bk['remaining'] -= $t;
			$need -= $t;
		}
		unset( $bk );
	}
	return $buckets;
}

/**
 * Is an upcoming booking confirmed? Paid sessions are; sessions counted
 * against credit are when the credit covers them. Everything else is
 * provisional until it's paid.
 */
function lbs_booking_confirmed( $session, $ledger = null ) {
	if ( $session['paid'] ) { return true; }
	if ( ! $session['block'] ) { return false; }
	if ( null === $ledger ) { $ledger = lbs_ledger( $session['member'] ); }
	return $ledger && ! empty( $ledger['covered'][ $session['id'] ] );
}

/** Record a change to anything that affects credit, for the audit trail. */
function lbs_audit( $user_id, $what ) {
	$log   = get_user_meta( $user_id, '_lbs_audit', true );
	$log   = is_array( $log ) ? $log : array();
	$me    = wp_get_current_user();
	$log[] = array( 'at' => time(), 'by' => $me && $me->exists() ? $me->display_name : 'system', 'what' => $what );
	update_user_meta( $user_id, '_lbs_audit', array_slice( $log, -200 ) );
}
