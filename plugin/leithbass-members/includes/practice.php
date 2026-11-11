<?php
/**
 * The Shed (practice tools): storage, privacy and Jack's prep.
 *
 * Each tool is stored separately (user meta _lbs_pr_{tool}) and every change
 * happens inside a short per-member, per-tool lock, so two changes at once
 * (two tabs, or Jack answering a question while the member adds one) can't
 * overwrite each other.
 *
 * @package LeithBassMembers
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

/** Tools, in display order (everyday tools first): name, description, who can see it. */
function lbs_pr_tools() {
	return array(
		'diary'      => array( 'Practice diary', 'Your practice journal. Plan a practice, time it, write about what you worked on, and note what to start with next time.', 'choose' ),
		'metronome'  => array( 'Metronome', 'A click that can drop out so your own time does more: Random mute, Gradual mute, and Click up to build speed. With a house drummer and odd meters.', 'private' ),
		'tuner'      => array( 'Tuner', 'A chromatic tuner that reads down to a low B. It listens only while it\'s on, and nothing is recorded or sent.', 'private' ),
		'drone'      => array( 'Drone', 'A tanpura on any note, playing until you stop it. For scales, intonation and hearing how notes sit.', 'private' ),
		'shelf'      => array( 'The Shelf', 'Backing tracks, drones, course material and transcriptions Jack has put up for everyone.', 'from' ),
		'questions'  => array( 'Questions for Jack', 'Jot things down as they come up. Jack reads them before your next session.', 'shared' ),
		'tempo'      => array( 'Tempo tracker', 'Log the tempo you can play each exercise cleanly. Slowing down to play it cleaner counts as progress too.', 'choose' ),
		'recordings' => array( 'Recorder', 'Record yourself, listen back, and send Jack the takes you\'d like him to hear. Takes stay on your phone until you send them.', 'send' ),
		'habit'      => array( 'Habit tracker', 'A practice goal you set with Jack, and a chain of days to keep going. Missing one day won\'t break it.', 'choose' ),
		'songs'      => array( 'Songs', 'What you\'re learning, what you can play, what you want to learn next.', 'shared' ),
		'goals'      => array( 'Long-term goals', 'The bigger picture, reviewed with Jack at the end of each block.', 'shared' ),
		'listening'  => array( 'Listening list', 'Tracks you and Jack have recommended for each other.', 'choose' ),
		'gear'       => array( 'Bass & strings', 'Your instrument, set-up notes and when you last changed strings.', 'private' ),
	);
}

function lbs_pr_defaults() {
	return array(
		'tools'      => array( 'diary' => true, 'habit' => true, 'questions' => true, 'tempo' => true, 'metronome' => true, 'drone' => true, 'tuner' => true, 'shelf' => true, 'songs' => false, 'goals' => false, 'recordings' => true, 'listening' => false, 'gear' => false ),
		'share'      => array( 'diary' => true, 'habit' => true, 'tempo' => false, 'listening' => true ),
		'diary'      => array(),
		'questions'  => array(),
		'tempo'      => array(),
		'songs'      => array(),
		'goals'      => array(),
		'listening'  => array(),
		'recordings' => array(),
		'gear'       => array( 'bass' => '', 'strings' => '', 'changed' => '', 'setup' => '' ),
		'objdone'    => array(),
		'habit'      => lbs_habit_defaults(),
	);
}

/* -------------------------------------------------------------------------
 * Habit tracker (1.2.0)
 *
 * A goal of days a week and minutes a day, set by Jack with the member (or by
 * the member). A day counts when the diary holds at least the day's minutes.
 * The chain survives one missed day; two missed days in a row start it again
 * (missing a single day doesn't set back habit forming: Lally et al. 2010).
 * Rest days and a holiday pause never break it.
 * ---------------------------------------------------------------------- */

function lbs_habit_defaults() {
	return array( 'days' => 0, 'min' => 0, 'by' => '', 'set' => '', 'rest' => array(), 'pause' => null, 'slots' => array(), 'slots_cal' => true );
}

/** Minutes practised per date, from a diary list. */
function lbs_habit_day_minutes( $diary ) {
	$m = array();
	foreach ( (array) $diary as $e ) {
		if ( empty( $e['date'] ) ) { continue; }
		$m[ $e['date'] ] = ( $m[ $e['date'] ] ?? 0 ) + (int) ( $e['min'] ?? 0 );
	}
	return $m;
}

/**
 * Chain, weeks in a row, this week and bests. Mirrors habitStats() in portal.js.
 * $days: date => minutes.
 */
function lbs_habit_stats( $habit, $days, $today = null ) {
	$today = $today ? $today : lbs_today();
	$goal  = max( 1, (int) $habit['min'] );
	$week  = max( 1, min( 7, (int) $habit['days'] ) );
	$rest  = array_map( 'intval', (array) $habit['rest'] );
	$pause = is_array( $habit['pause'] ) ? $habit['pause'] : null;
	$first = $days ? min( array_keys( $days ) ) : $today;
	if ( $first > $today ) { $first = $today; }
	$kind  = function ( $ds ) use ( $days, $goal, $rest, $pause ) {
		if ( ( $days[ $ds ] ?? 0 ) >= $goal ) { return 'done'; }
		if ( $pause && $ds >= $pause['from'] && $ds <= $pause['to'] ) { return 'skip'; }
		if ( in_array( (int) lbs_dt( $ds )->format( 'w' ), $rest, true ) ) { return 'skip'; }
		return 'miss';
	};
	// Walk forward from the first entry: the chain, and the best chain.
	$chain = 0; $best = 0; $missed = 0;
	$d   = lbs_dt( $first );
	$end = lbs_dt( $today );
	while ( $d <= $end ) {
		$ds = $d->format( 'Y-m-d' );
		$k  = $kind( $ds );
		if ( 'done' === $k ) { $chain++; $missed = 0; $best = max( $best, $chain ); }
		elseif ( 'miss' === $k && $ds !== $today ) { $missed++; if ( $missed >= 2 ) { $chain = 0; } }
		$d = $d->modify( '+1 day' );
	}
	// Weeks (Monday to Sunday) that met the goal, counting back from last week;
	// this week joins the run once it's met. A week wholly paused doesn't break it.
	$monday = lbs_dt( $today )->modify( 'monday this week' );
	$count  = function ( $mon ) use ( $kind ) {
		$n = 0; $x = $mon;
		for ( $i = 0; $i < 7; $i++ ) { if ( 'done' === $kind( $x->format( 'Y-m-d' ) ) ) { $n++; } $x = $x->modify( '+1 day' ); }
		return $n;
	};
	$this_week = $count( $monday );
	$best_w = 0; $run = 0;
	$w = lbs_dt( $first )->modify( 'monday this week' );
	while ( $w < $monday ) {
		$sun    = $w->modify( '+6 days' )->format( 'Y-m-d' );
		$paused = $pause && $w->format( 'Y-m-d' ) >= $pause['from'] && $sun <= $pause['to'];
		if ( $count( $w ) >= $week ) { $run++; $best_w = max( $best_w, $run ); } elseif ( ! $paused ) { $run = 0; }
		$w = $w->modify( '+7 days' );
	}
	$weeks = $run + ( $this_week >= $week ? 1 : 0 );
	return array( 'chain' => $chain, 'best' => $best, 'weeks' => $weeks, 'bestWeeks' => max( $best_w, $weeks ), 'thisWeek' => $this_week, 'goalDays' => $week, 'goalMin' => (int) $habit['min'] );
}

/** Split the 3.6.0 single blob into per-tool records. */
function lbs_pr_migrate( $user_id ) {
	$blob = get_user_meta( $user_id, '_lbs_pr', true );
	if ( ! is_array( $blob ) ) { return; }
	foreach ( lbs_pr_defaults() as $key => $default ) {
		if ( isset( $blob[ $key ] ) && '' === get_user_meta( $user_id, '_lbs_pr_' . $key, true ) ) {
			$value = $blob[ $key ];
			if ( 'objdone' === $key ) {
				// Ticks were stored by position; positions map to legacy ids "i0", "i1"…
				foreach ( $value as $sid => $list ) {
					$value[ $sid ] = array_map( function ( $i ) { return is_int( $i ) || ctype_digit( (string) $i ) ? 'i' . $i : (string) $i; }, (array) $list );
				}
			}
			update_user_meta( $user_id, '_lbs_pr_' . $key, $value );
		}
	}
	delete_user_meta( $user_id, '_lbs_pr' );
}

/** One tool's data (or everything when $key is null). */
function lbs_pr_get( $user_id, $key = null ) {
	if ( get_user_meta( $user_id, '_lbs_pr', true ) ) { lbs_pr_migrate( $user_id ); }
	$defaults = lbs_pr_defaults();
	if ( null === $key ) {
		$all = array();
		foreach ( array_keys( $defaults ) as $k ) { $all[ $k ] = lbs_pr_get( $user_id, $k ); }
		return $all;
	}
	$value = get_user_meta( $user_id, '_lbs_pr_' . $key, true );
	if ( ! is_array( $value ) ) { return $defaults[ $key ]; }
	return in_array( $key, array( 'tools', 'share', 'gear', 'habit' ), true ) ? array_merge( $defaults[ $key ], $value ) : $value;
}

/* -------------------------------------------------------------------------
 * Locking
 * ---------------------------------------------------------------------- */

function lbs_lock( $name, $wait = 3.0 ) {
	global $wpdb;
	$option = 'lbs_lock_' . md5( $name );
	$until  = microtime( true ) + $wait;
	do {
		// INSERT IGNORE is atomic: only one request can create the row.
		$ok = $wpdb->query( $wpdb->prepare( "INSERT IGNORE INTO {$wpdb->options} (option_name, option_value, autoload) VALUES (%s, %s, 'no')", $option, (string) time() ) ); // phpcs:ignore
		if ( $ok ) { return $option; }
		$since = (int) $wpdb->get_var( $wpdb->prepare( "SELECT option_value FROM {$wpdb->options} WHERE option_name = %s", $option ) ); // phpcs:ignore
		if ( $since && time() - $since > 15 ) { lbs_unlock( $option ); continue; } // Abandoned lock.
		usleep( 60000 );
	} while ( microtime( true ) < $until );
	return false;
}

function lbs_unlock( $option ) {
	global $wpdb;
	if ( $option ) { $wpdb->delete( $wpdb->options, array( 'option_name' => $option ) ); }
}

/**
 * Change one tool's data safely. $fn receives the current value and returns
 * the new one (or a WP_Error to abandon the change).
 */
function lbs_pr_update( $user_id, $key, $fn ) {
	$lock = lbs_lock( 'pr-' . $user_id . '-' . $key );
	if ( ! $lock ) { return new WP_Error( 'lbs_busy', 'Another change is still saving. Try again in a moment.' ); }
	wp_cache_delete( $user_id, 'user_meta' );
	$current = lbs_pr_get( $user_id, $key );
	$next    = $fn( $current );
	if ( ! is_wp_error( $next ) ) { update_user_meta( $user_id, '_lbs_pr_' . $key, $next ); }
	lbs_unlock( $lock );
	return $next;
}

/* -------------------------------------------------------------------------
 * Views of the data
 * ---------------------------------------------------------------------- */

/**
 * The Shed as a given viewer may see it.
 * 'member': everything (it's theirs).
 * 'jack':   only shared tools and what the member chooses to share. Private
 *           tools and objective ticks are left out entirely.
 */
function lbs_pr_view( $user_id, $viewer = 'member' ) {
	$pr = lbs_pr_get( $user_id );
	foreach ( $pr['recordings'] as &$r ) {
		$r['url'] = lbs_portal_url( 'file', array( 'r' => $r['id'] ) + ( 'jack' === $viewer ? array( 'u' => $user_id ) : array() ) );
		unset( $r['file'] );
	}
	unset( $r );
	$pr['diary'] = array_slice( $pr['diary'], 0, 300 );
	if ( 'jack' === $viewer ) {
		$pr['objdone'] = array();
		$pr['gear']    = lbs_pr_defaults()['gear'];
		// The habit tracker can be shared without the diary: Jack then sees minutes per day, nothing written.
		if ( ! empty( $pr['share']['habit'] ) ) {
			$pr['habit']['log'] = array_slice( lbs_habit_day_minutes( $pr['diary'] ), 0, 400, true );
		} else {
			$pr['habit'] = array_merge( lbs_habit_defaults(), array( 'days' => $pr['habit']['days'], 'min' => $pr['habit']['min'], 'by' => $pr['habit']['by'], 'private' => true ) );
		}
		if ( empty( $pr['share']['diary'] ) ) { $pr['diary'] = array(); }
		if ( empty( $pr['share']['tempo'] ) ) { $pr['tempo'] = array(); }
		if ( empty( $pr['share']['listening'] ) ) {
			$pr['listening'] = array_values( array_filter( $pr['listening'], function ( $l ) { return 'jack' === $l['from']; } ) );
		}
		$pr['private'] = true;
	}
	return $pr;
}

/**
 * Objectives from sessions two to four weeks back, not repeated in the latest
 * notes: worth coming back to (spaced practice).
 */
function lbs_revisit_objectives( $user_id, $latest = null ) {
	$from = lbs_dt( lbs_today() )->modify( '-28 days' )->format( 'Y-m-d' );
	$to   = lbs_dt( lbs_today() )->modify( '-12 days' )->format( 'Y-m-d' );
	$now  = $latest ? array_map( 'strtolower', $latest['objectives'] ) : array();
	$out  = array();
	foreach ( lbs_past_sessions( $user_id ) as $s ) {
		if ( 'done' !== $s['status'] || $s['date'] < $from || $s['date'] > $to || ( $latest && $s['id'] === $latest['id'] ) ) { continue; }
		foreach ( $s['objectives'] as $o ) {
			if ( ! in_array( strtolower( $o ), $now, true ) && ! in_array( $o, $out, true ) ) { $out[] = $o; }
		}
	}
	return array_slice( $out, 0, 4 );
}

function lbs_open_questions( $user_id ) {
	return array_values( array_filter( lbs_pr_get( $user_id, 'questions' ), function ( $q ) { return empty( $q['answered'] ); } ) );
}

function lbs_add_track( $user_id, $title, $artist, $note, $from = 'jack' ) {
	$title = sanitize_text_field( $title );
	if ( '' === $title ) { return; }
	lbs_pr_update( $user_id, 'listening', function ( $list ) use ( $title, $artist, $note, $from ) {
		$list[] = array( 'id' => lbs_id(), 'title' => $title, 'artist' => sanitize_text_field( $artist ), 'note' => sanitize_text_field( $note ), 'from' => $from, 'added' => lbs_today() );
		return array_slice( $list, -150 );
	} );
	if ( 'jack' === $from ) {
		lbs_pr_update( $user_id, 'tools', function ( $t ) { $t['listening'] = true; return $t; } );
	}
}

/* -------------------------------------------------------------------------
 * Jack's prep: only what the member has shared
 * ---------------------------------------------------------------------- */

function lbs_prep( $user_id ) {
	$pr    = lbs_pr_view( $user_id, 'jack' );
	$t     = $pr['tools'];
	$last  = lbs_latest_notes( $user_id );
	$since = $last ? $last['date'] : '0000-00-00';
	$prep  = array( 'since' => $last );

	if ( $t['questions'] ) { $prep['questions'] = lbs_open_questions( $user_id ); }
	if ( $t['diary'] ) {
		if ( ! empty( $pr['share']['diary'] ) ) {
			$recent = array_values( array_filter( $pr['diary'], function ( $e ) use ( $since ) { return $e['date'] > $since; } ) );
			$prep['diary'] = array(
				'minutes' => array_sum( wp_list_pluck( $recent, 'min' ) ),
				'days'    => count( array_unique( wp_list_pluck( $recent, 'date' ) ) ),
				'notes'   => array_slice( array_values( array_filter( $recent, function ( $e ) {
					return '' !== trim( (string) ( $e['easier'] ?? '' ) . ( $e['attention'] ?? '' ) . ( $e['note'] ?? '' ) . ( $e['plan'] ?? '' ) . ( $e['next'] ?? '' ) );
				} ) ), 0, 3 ),
			);
		} else {
			$prep['diary'] = 'private';
		}
	}
	if ( $t['tempo'] ) { $prep['tempo'] = ! empty( $pr['share']['tempo'] ) ? $pr['tempo'] : 'private'; }
	if ( ! empty( $t['habit'] ) ) {
		$h = lbs_pr_get( $user_id, 'habit' );
		if ( empty( $pr['share']['habit'] ) ) { $prep['habit'] = 'private'; }
		elseif ( (int) $h['days'] && (int) $h['min'] ) { $prep['habit'] = lbs_habit_stats( $h, lbs_habit_day_minutes( lbs_pr_get( $user_id, 'diary' ) ) ); }
		else { $prep['habit'] = 'nogoal'; }
	}
	if ( $t['songs'] ) { $prep['songs'] = array_values( array_filter( $pr['songs'], function ( $s ) { return 2 === (int) $s['s']; } ) ); }
	if ( $t['goals'] ) { $prep['goals'] = $pr['goals']; }
	if ( $t['recordings'] ) { $prep['recordings'] = array_values( array_filter( lbs_pr_get( $user_id, 'recordings' ), function ( $r ) { return empty( $r['listened'] ); } ) ); }
	if ( $t['listening'] && ! empty( $pr['share']['listening'] ) ) {
		$prep['listening'] = array_values( array_filter( $pr['listening'], function ( $l ) { return 'member' === $l['from']; } ) );
	}
	return $prep;
}

function lbs_minutes_label( $minutes ) {
	return lbs_hm( $minutes );
}

/** Latest clean tempo for an exercise (falls back to the latest of any kind). */
function lbs_tempo_now( $ex ) {
	$log = isset( $ex['log'] ) ? (array) $ex['log'] : array();
	for ( $i = count( $log ) - 1; $i >= 0; $i-- ) {
		if ( empty( $log[ $i ][2] ) || 'clean' === $log[ $i ][2] ) { return (int) $log[ $i ][1]; }
	}
	return $log ? (int) end( $log )[1] : 0;
}

function lbs_prep_html( $user_id, $for_email = false ) {
	$off = function ( $text ) use ( $for_email ) {
		return $for_email ? '<p style="color:#6F6C66;margin:0 0 8px">' . esc_html( $text ) . '</p>' : '<p class="lbs-off">' . esc_html( $text ) . '</p>';
	};
	if ( ! get_user_meta( $user_id, '_lbs_activated', true ) ) { return $off( 'Hasn\'t signed in to the portal yet.' ); }
	$p  = lbs_prep( $user_id );
	$h5 = function ( $text ) use ( $for_email ) {
		return $for_email ? '<p style="margin:14px 0 4px;font-weight:600">' . esc_html( $text ) . '</p>' : '<h4>' . esc_html( $text ) . '</h4>';
	};
	$out = array();

	if ( isset( $p['questions'] ) ) {
		$out[] = $h5( 'Questions' ) . ( $p['questions'] ? '<ul>' . implode( '', array_map( function ( $q ) { return '<li>' . esc_html( $q['q'] ) . '</li>'; }, $p['questions'] ) ) . '</ul>' : $off( 'No questions this time.' ) );
	}
	if ( isset( $p['diary'] ) ) {
		$html = $h5( 'Practice diary' );
		if ( 'private' === $p['diary'] ) {
			$html .= $off( 'Kept private.' );
		} elseif ( ! $p['diary']['days'] ) {
			$html .= $off( 'Nothing logged since the last session.' );
		} else {
			$html .= '<p><strong>' . (int) $p['diary']['days'] . ' day' . ( 1 === (int) $p['diary']['days'] ? '' : 's' ) . '</strong> of practice (' . esc_html( lbs_hm( $p['diary']['minutes'] ) ) . ') since the last session.</p>';
			foreach ( $p['diary']['notes'] as $n ) {
				$bits = array();
				if ( ! empty( $n['easier'] ) ) { $bits[] = 'Easier: ' . $n['easier']; }
				if ( ! empty( $n['plan'] ) ) { $bits[] = 'Aimed to: ' . $n['plan']; }
				if ( ! empty( $n['reps'] ) ) { $bits[] = 'Three clean in a row: ' . array( 'yes' => 'yes', 'nearly' => 'nearly', 'notyet' => 'not yet' )[ $n['reps'] ]; }
				if ( ! empty( $n['attention'] ) ) { $bits[] = 'Needs attention: ' . $n['attention']; }
				if ( ! empty( $n['next'] ) ) { $bits[] = 'Next time: ' . $n['next']; }
				if ( ! empty( $n['note'] ) ) { $bits[] = $n['note']; }
				$html .= '<p>' . esc_html( implode( ' · ', $bits ) ) . ' <em>(' . esc_html( wp_date( 'D j M', lbs_dt( $n['date'] )->getTimestamp() ) ) . ')</em></p>';
			}
		}
		$out[] = $html;
	}
	if ( isset( $p['habit'] ) ) {
		$html = $h5( 'Habit' );
		if ( 'private' === $p['habit'] ) { $html .= $off( 'Kept private.' ); }
		elseif ( 'nogoal' === $p['habit'] ) { $html .= $off( 'No goal set yet. Agree one together and set it below.' ); }
		else {
			$s     = $p['habit'];
			$html .= '<p>Goal: ' . (int) $s['goalDays'] . ' day' . ( 1 === (int) $s['goalDays'] ? '' : 's' ) . ' a week, ' . (int) $s['goalMin'] . ' minutes. <strong>' . (int) $s['thisWeek'] . ' of ' . (int) $s['goalDays'] . '</strong> this week. Chain: ' . (int) $s['chain'] . ' day' . ( 1 === (int) $s['chain'] ? '' : 's' ) . ' (best ' . (int) $s['best'] . '). Weeks in a row: ' . (int) $s['weeks'] . '.</p>';
		}
		$out[] = $html;
	}
	if ( isset( $p['tempo'] ) ) {
		$html = $h5( 'Tempos' );
		if ( 'private' === $p['tempo'] ) {
			$html .= $off( 'Kept private.' );
		} elseif ( ! $p['tempo'] ) {
			$html .= $off( 'No exercises yet.' );
		} else {
			$html .= '<ul>';
			foreach ( $p['tempo'] as $ex ) {
				$now   = lbs_tempo_now( $ex );
				$html .= '<li>' . esc_html( $ex['name'] ) . ': ' . ( $now ? (int) $now . ' bpm clean' : 'nothing logged' ) . ( ! empty( $ex['target'] ) ? ' (target ' . (int) $ex['target'] . ')' : '' ) . '</li>';
			}
			$html .= '</ul>';
		}
		$out[] = $html;
	}
	if ( ! empty( $p['recordings'] ) ) {
		$html = $h5( 'Recordings to hear' ) . '<ul>';
		foreach ( $p['recordings'] as $r ) {
			$html .= '<li><a href="' . esc_url( lbs_portal_url( 'file', array( 'r' => $r['id'], 'u' => $user_id ) ) ) . '">' . esc_html( $r['name'] ) . '</a>' . ( ! empty( $r['note'] ) ? ': ' . esc_html( $r['note'] ) : '' ) . '</li>';
		}
		$out[] = $html . '</ul>';
	}
	if ( ! empty( $p['songs'] ) ) {
		$out[] = $h5( 'Wants to learn' ) . '<ul>' . implode( '', array_map( function ( $s ) { return '<li>' . esc_html( $s['t'] . ( $s['a'] ? ', ' . $s['a'] : '' ) ) . '</li>'; }, $p['songs'] ) ) . '</ul>';
	}
	if ( ! empty( $p['goals'] ) ) {
		$labels = array( 'not_yet' => 'Not yet', 'started' => 'Started', 'on_track' => 'On track', 'done' => 'Done' );
		$out[]  = $h5( 'Goals' ) . '<ul>' . implode( '', array_map( function ( $g ) use ( $labels ) { return '<li>' . esc_html( $g['text'] ) . ' (' . esc_html( isset( $labels[ $g['status'] ] ) ? $labels[ $g['status'] ] : 'Not yet' ) . ')</li>'; }, $p['goals'] ) ) . '</ul>';
	}
	if ( ! empty( $p['listening'] ) ) {
		$out[] = $h5( 'Tracks they recommend' ) . '<ul>' . implode( '', array_map( function ( $l ) { return '<li>' . esc_html( $l['title'] . ( $l['artist'] ? ', ' . $l['artist'] : '' ) ) . '</li>'; }, $p['listening'] ) ) . '</ul>';
	}
	if ( ! $out ) { return $off( 'Nothing shared from the Shed yet.' ); }
	return $for_email ? implode( '', $out ) : '<div class="lbs-prep">' . implode( '', array_map( function ( $o ) { return '<div>' . $o . '</div>'; }, $out ) ) . '</div>';
}
