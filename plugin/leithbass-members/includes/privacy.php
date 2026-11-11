<?php
/**
 * Privacy: data export and erasure (WordPress's Tools → Export/Erase
 * Personal Data), the member's own "Download my data", and suggested
 * privacy notice text under Settings → Privacy.
 *
 * @package LeithBassMembers
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

/** Everything the portal holds about one member. */
function lbs_export_data( $uid ) {
	$user = get_userdata( $uid );
	$pr   = lbs_pr_get( $uid );
	foreach ( $pr['recordings'] as &$r ) { unset( $r['file'] ); }
	unset( $r );
	$sessions = array();
	foreach ( lbs_member_sessions( $uid ) as $s ) {
		$sessions[] = array(
			'date'       => $s['date'],
			'start'      => $s['start'],
			'length'     => lbs_length_label( $s['length'] ),
			'status'     => lbs_statuses()[ $s['status'] ],
			'title'      => $s['title'],
			'summary'    => $s['summary'],
			'objectives' => $s['objectives'],
			'files'      => $s['files'],
		);
	}
	$ledger = lbs_ledger( $uid );
	return array(
		'exported'      => wp_date( 'c' ),
		'account'       => array(
			'name'     => $user->display_name,
			'email'    => $user->user_email,
			'phone'    => (string) get_user_meta( $uid, '_lbs_phone', true ),
			'guardian' => lbs_guardian( $uid ),
			'since'    => $user->user_registered,
			'emails'   => lbs_prefs( $uid ),
		),
		'sessions'      => $sessions,
		'credit'        => $ledger ? array_map( function ( $row ) { return array( 'date' => $row['date'], 'item' => $row['label'], 'change' => lbs_hm( $row['minutes'], true ), 'balance' => lbs_hm( $row['balance'] ) ); }, $ledger['rows'] ) : array(),
		'the_shed'      => $pr,
		'harmonic_elements' => lbs_he_record( $uid ),
		'ear_trainer'       => lbs_ear_record( $uid ),
		'read'              => function_exists( 'lbs_read_record' ) ? lbs_read_record( $uid ) : array(),
	);
}

add_filter( 'wp_privacy_personal_data_exporters', function ( $exporters ) {
	$exporters['leithbass-members'] = array(
		'exporter_friendly_name' => 'Leith Bass Space member portal',
		'callback'               => function ( $email ) {
			$user = get_user_by( 'email', $email );
			if ( ! $user || ! lbs_is_member( $user->ID ) ) { return array( 'data' => array(), 'done' => true ); }
			$data  = lbs_export_data( $user->ID );
			$items = array();
			foreach ( array( 'sessions' => 'Sessions', 'credit' => 'Lesson credit', 'the_shed' => 'The Shed (practice tools)', 'harmonic_elements' => 'Harmonic Elements ear trainer', 'ear_trainer' => 'Ear Training for Bass Players', 'read' => 'Read (reading notation)' ) as $key => $label ) {
				$items[] = array(
					'group_id'    => 'lbs-' . $key,
					'group_label' => $label,
					'item_id'     => 'lbs-' . $key . '-' . $user->ID,
					'data'        => array( array( 'name' => $label, 'value' => wp_json_encode( $data[ $key ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE ) ) ),
				);
			}
			return array( 'data' => $items, 'done' => true );
		},
	);
	return $exporters;
} );

add_filter( 'wp_privacy_personal_data_erasers', function ( $erasers ) {
	$erasers['leithbass-members'] = array(
		'eraser_friendly_name' => 'Leith Bass Space member portal',
		'callback'             => function ( $email ) {
			$user = get_user_by( 'email', $email );
			if ( ! $user || ! lbs_is_member( $user->ID ) ) { return array( 'items_removed' => false, 'items_retained' => false, 'messages' => array(), 'done' => true ); }
			foreach ( lbs_pr_get( $user->ID, 'recordings' ) as $r ) {
				if ( ! empty( $r['file'] ) && lbs_nc_ready() ) { lbs_nc_delete( lbs_member_path( $user->ID, 'Recordings/' . $r['file'] ) ); }
			}
			foreach ( array_keys( lbs_pr_defaults() ) as $key ) { delete_user_meta( $user->ID, '_lbs_pr_' . $key ); }
				delete_user_meta( $user->ID, LBS_HE_META );
				delete_user_meta( $user->ID, LBS_EAR_META );
				if ( defined( 'LBS_READ_META' ) ) { delete_user_meta( $user->ID, LBS_READ_META ); }
			foreach ( array( '_lbs_phone', '_lbs_guardian_email', '_lbs_guardian_name', '_lbs_cal_token' ) as $key ) { delete_user_meta( $user->ID, $key ); }
			return array(
				'items_removed'  => true,
				'items_retained' => true,
				'messages'       => array( 'Shed data (practice tools), the Harmonic Elements, Ear Training and Read records, recordings, phone and guardian details were removed. Session records and the credit statement are kept as business records; delete the account itself from Users when sessions have ended and records are no longer needed.' ),
				'done'           => true,
			);
		},
	);
	return $erasers;
} );

/** Suggested wording for the privacy notice (Settings → Privacy → Policy Guide). */
add_action( 'admin_init', function () {
	if ( ! function_exists( 'wp_add_privacy_policy_content' ) ) { return; }
	wp_add_privacy_policy_content( 'Leith Bass Space member portal', wp_kses_post( lbs_privacy_text() ) );
} );

function lbs_privacy_text() {
	return '<h2>The member portal</h2>'
		. '<p>If you have sessions with Jack, he may invite you to the member portal. There is no public sign-up.</p>'
		. '<p><strong>What we keep:</strong> your name, email address and, if you give it, a phone number; if you are under 16 and your parent or guardian would like them, their name and email address, so they receive copies of portal emails; your bookings, session notes, objectives and worksheets; your lesson credit statement; and anything you add in the Shed, your practice tools (practice diary and plans, your habit goal and practice times, questions, tempos, songs, goals, listening list, bass notes and recordings you choose to send); and, if you use Harmonic Elements or Ear Training while signed in, what you were asked and what you answered.</p>'
		. '<p><strong>Who sees it:</strong> Jack sees your bookings, session notes, questions, songs, goals and recordings you send. The practice diary, habit tracker, tempos, your listening picks and your Harmonic Elements and Ear Training records are only shown to him if sharing is on (you can switch it off in each tool; the two trainers&rsquo; sharing starts off). Your bass and strings notes are never shown to him in the portal. They are stored on this website like the rest of your account, so the site administrator could technically access them.</p>'
		. '<p><strong>Microphone:</strong> the tuner listens only while it is switched on, and so do Ear Training and Read when you choose to answer by playing. Nothing either of them hears is recorded or sent. Takes you make with the recorder stay on your phone or computer until you choose to send one to Jack; unsent takes never leave your device.</p>'
		. '<p><strong>Where it is kept:</strong> on this website&rsquo;s server, and worksheets and recordings in Jack&rsquo;s Nextcloud storage. The date, time and your name for each booking are also kept in Jack&rsquo;s Google Calendar, so that his diary and the portal stay in step. Tool settings (such as metronome and drone settings) and unsent recorder takes are stored in your browser on your own device.</p>'
		. '<p><strong>Cookies:</strong> signing in sets a login cookie. If you choose &ldquo;Keep me signed in&rdquo;, it lasts up to a year on that device. The home-screen app stores recent notes on your phone so they open without signal; signing out removes them.</p>'
		. '<p><strong>How long:</strong> while you are having sessions, and for up to 12 months after your last session, unless you ask us to delete it sooner. Session and payment records may be kept longer where the law requires.</p>'
		. '<p><strong>Your choices:</strong> you can download your data from Account in the portal, delete recordings yourself, and ask Jack to delete your account and data at any time.</p>';
}
