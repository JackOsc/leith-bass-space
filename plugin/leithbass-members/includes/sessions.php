<?php
/**
 * Sessions: the private post type Jack uses for bookings and notes.
 * One record per session: book it (Upcoming), then after the session add
 * the notes and files and set it to Done. Only published sessions reach
 * the member.
 *
 * @package LeithBassMembers
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

add_action( 'init', function () {
	register_post_type( LBS_CPT, array(
		'labels'              => array(
			'name'               => 'Sessions',
			'singular_name'      => 'Session',
			'menu_name'          => 'Sessions',
			'all_items'          => 'Sessions',
			'add_new'            => 'Add session',
			'add_new_item'       => 'Add session',
			'edit_item'          => 'Edit session',
			'new_item'           => 'New session',
			'search_items'       => 'Search sessions',
			'not_found'          => 'No sessions yet.',
			'not_found_in_trash' => 'No sessions in the bin.',
		),
		'public'              => false,
		'publicly_queryable'  => false,
		'exclude_from_search' => true,
		'show_ui'             => true,
		'show_in_menu'        => 'lbs-members',
		'show_in_rest'        => false,
		'query_var'           => false,
		'rewrite'             => false,
		'supports'            => array( 'title' ),
		'capability_type'     => 'post',
		'map_meta_cap'        => true,
	) );
} );

add_filter( 'use_block_editor_for_post_type', function ( $use, $type ) {
	return LBS_CPT === $type ? false : $use;
}, 10, 2 );

add_filter( 'enter_title_here', function ( $text, $post ) {
	return LBS_CPT === $post->post_type ? 'What we covered (leave blank for a booking)' : $text;
}, 10, 2 );

// Friendlier "Published" wording on this screen.
add_filter( 'post_updated_messages', function ( $messages ) {
	$messages[ LBS_CPT ] = array(
		1  => 'Session updated. The member can see it.',
		4  => 'Session updated.',
		6  => 'Session published. The member can see it now.',
		7  => 'Session saved.',
		10 => 'Draft saved. The member can\'t see it yet.',
	);
	return $messages;
} );

/* -------------------------------------------------------------------------
 * Edit screen
 * ---------------------------------------------------------------------- */

/** The paste box sits straight under the title. */
add_action( 'edit_form_after_title', function ( $post ) {
	if ( LBS_CPT !== $post->post_type ) { return; }
	?>
	<div class="lbs-paste postbox">
		<div class="lbs-paste-head">
			<h2>Paste your notes</h2>
			<p>Paste notes written in the session template and the form below fills itself in. Check it, then publish. <button type="button" class="button-link" data-lbs-copy-template>Copy a blank template</button></p>
		</div>
		<textarea id="lbs-paste" rows="7" placeholder="Member: Morven Kerr&#10;Date: 22/09/2026&#10;Covered: Walking lines, part two&#10;&#10;Summary:&#10;…&#10;&#10;Objectives:&#10;- …"></textarea>
		<p class="lbs-paste-actions"><button type="button" class="button button-primary" id="lbs-paste-go">Fill in the form</button> <span class="lbs-paste-out" id="lbs-paste-out" aria-live="polite"></span></p>
	</div>
	<?php
} );

add_action( 'add_meta_boxes_' . LBS_CPT, function ( $post ) {
	add_meta_box( 'lbs-box-session', 'Session', 'lbs_box_session', LBS_CPT, 'normal', 'high' );
	add_meta_box( 'lbs-box-notes', 'Notes for the member', 'lbs_box_notes', LBS_CPT, 'normal', 'high' );
	add_meta_box( 'lbs-box-files', 'Files from Nextcloud', 'lbs_box_files', LBS_CPT, 'normal', 'default' );
	add_meta_box( 'lbs-box-extras', 'Questions and listening', 'lbs_box_extras', LBS_CPT, 'normal', 'default' );
	add_meta_box( 'lbs-box-prep', 'Session prep', 'lbs_box_prep', LBS_CPT, 'side', 'default' );
	add_meta_box( 'lbs-box-block', 'Block', 'lbs_box_block', LBS_CPT, 'side', 'default' );
	remove_meta_box( 'slugdiv', LBS_CPT, 'normal' );
} );

/** Current values for the edit screen, with sensible defaults for a new one. */
function lbs_edit_values( $post ) {
	$s = lbs_session( $post->ID );
	if ( ! $s['member'] && isset( $_GET['member'] ) ) { $s['member'] = absint( $_GET['member'] ); }
	if ( 'auto-draft' === $post->post_status ) {
		if ( ! $s['date'] ) { $s['date'] = lbs_today(); }
		if ( ! $s['length'] ) { $s['length'] = 1; }
		$last = $s['member'] ? lbs_member_sessions( $s['member'] ) : array();
		if ( $last ) { $prev = end( $last ); $s['start'] = $prev['start']; $s['length'] = $prev['length'] ? $prev['length'] : 1; }
		$ledger     = $s['member'] ? lbs_ledger( $s['member'] ) : null;
		$s['block'] = $ledger && ( $ledger['balance'] - $ledger['booked'] ) > 0;
		$s['new']   = true;
	}
	$s['can_repeat'] = in_array( $post->post_status, array( 'auto-draft', 'draft', 'pending' ), true ) && ! get_post_meta( $post->ID, '_lbs_repeated', true );
	return $s;
}

function lbs_box_session( $post ) {
	$s = lbs_edit_values( $post );
	wp_nonce_field( 'lbs_save_session', 'lbs_session_nonce' );
	$lengths = array( '0.5' => '30 min', '0.75' => '45 min', '1' => '1 hour', '1.5' => '1 hour 30 min', '2' => '2 hours', '3' => '3 hours' );
	$len_key = lbs_hours_short( $s['length'] ? $s['length'] : 1 );
	if ( ! isset( $lengths[ $len_key ] ) ) { $lengths[ $len_key ] = lbs_length_label( $s['length'] ); }
	?>
	<div class="lbs-grid">
		<p class="lbs-wide"><label for="lbs-member">Member</label>
			<select id="lbs-member" name="lbs_member" required>
				<option value="">Choose a member…</option>
				<?php foreach ( lbs_members() as $m ) : ?>
					<option value="<?php echo (int) $m->ID; ?>" data-email="<?php echo esc_attr( $m->user_email ); ?>" <?php selected( $s['member'], $m->ID ); ?>><?php echo esc_html( $m->display_name ); ?></option>
				<?php endforeach; ?>
			</select>
			<?php if ( ! lbs_members() ) : ?><span class="description">No members yet. <a href="<?php echo esc_url( admin_url( 'admin.php?page=lbs-members' ) ); ?>">Add one first</a>.</span><?php endif; ?>
		</p>
		<p><label for="lbs-number">Session no.</label><input type="number" min="1" id="lbs-number" name="lbs_number" value="<?php echo $s['number'] ? (int) $s['number'] : ''; ?>" placeholder="<?php echo $s['member'] ? (int) lbs_next_number( $s['member'] ) : 'auto'; ?>"></p>
		<p><label for="lbs-status">Status</label>
			<select id="lbs-status" name="lbs_status">
				<?php foreach ( lbs_statuses() as $k => $label ) : ?>
					<option value="<?php echo esc_attr( $k ); ?>" <?php selected( $s['status'], $k ); ?>><?php echo esc_html( $label ); ?></option>
				<?php endforeach; ?>
			</select></p>
		<p><label for="lbs-date">Date</label><input type="date" id="lbs-date" name="lbs_date" value="<?php echo esc_attr( $s['date'] ); ?>" required></p>
		<p><label for="lbs-start">Start</label><input type="time" id="lbs-start" name="lbs_start" value="<?php echo esc_attr( $s['start'] ); ?>" step="300"></p>
		<p><label for="lbs-length">Length</label>
			<select id="lbs-length" name="lbs_length">
				<?php foreach ( $lengths as $k => $label ) : ?>
					<option value="<?php echo esc_attr( $k ); ?>" <?php selected( $len_key, (string) $k ); ?>><?php echo esc_html( $label ); ?></option>
				<?php endforeach; ?>
			</select></p>
		<p class="lbs-check"><label><input type="checkbox" id="lbs-block" name="lbs_block" value="1" <?php checked( $s['block'] ); ?>> Count against their credit</label></p>
		<p class="lbs-check"><label><input type="checkbox" id="lbs-paid" name="lbs_paid" value="1" <?php checked( $s['paid'] ); ?>> Paid separately</label></p>
		<p class="lbs-wide lbs-credit-note" id="lbs-credit-note" aria-live="polite"></p>
		<p class="lbs-wide"><label for="lbs-prep-note">Before this session (shown on their booking)</label>
			<input type="text" class="widefat" id="lbs-prep-note" name="lbs_prep" value="<?php echo esc_attr( $s['prep'] ); ?>" placeholder="e.g. Bring the ghost-note groove at 80 bpm."></p>
		<?php if ( $s['can_repeat'] ) : ?>
			<p class="lbs-wide"><label for="lbs-repeat">Also book the same slot for the next</label>
				<select id="lbs-repeat" name="lbs_repeat">
					<?php for ( $i = 0; $i <= 12; $i++ ) : ?><option value="<?php echo (int) $i; ?>"><?php echo 0 === $i ? 'No repeats' : (int) $i . ' week' . ( 1 === $i ? '' : 's' ); ?></option><?php endfor; ?>
				</select>
				<span class="description">Creates weekly Upcoming bookings when you publish.</span></p>
		<?php endif; ?>
	</div>
	<?php
	if ( 'upcoming' === $s['status'] && $s['member'] && ! empty( $s['published'] ) ) {
		$ok = lbs_booking_confirmed( $s );
		echo '<p class="lbs-booking-state"><span class="lbs-pill lbs-pill-' . ( $ok ? 'active' : 'invited' ) . '">' . ( $ok ? 'Confirmed' : 'Provisional' ) . '</span> ' . esc_html( $ok ? ( $s['paid'] ? 'Paid separately.' : 'Covered by their credit.' ) : ( $s['block'] ? 'Their credit doesn\'t cover this one yet. It confirms when they buy more, or tick Paid.' : 'Tick Paid when it\'s paid to confirm it.' ) ) . '</p>';
	}
	if ( $s['move'] && is_array( $s['move'] ) ) {
		echo '<div class="notice notice-warning inline"><p><strong>Move requested ' . esc_html( wp_date( 'j M, H:i', (int) $s['move']['at'] ) ) . ':</strong> ' . esc_html( $s['move']['message'] ) . '<br><span class="description">Change the date or time and update: they\'re emailed the new time and this clears.</span></p></div>';
	}
}

function lbs_box_notes( $post ) {
	$s        = lbs_session( $post->ID );
	$notified = (int) get_post_meta( $post->ID, '_lbs_notified', true );
	?>
	<p><label for="lbs-summary"><strong>Summary</strong></label>
		<textarea class="widefat" rows="5" id="lbs-summary" name="lbs_summary" placeholder="What you worked on and what to listen for."><?php echo esc_textarea( $s['summary'] ); ?></textarea></p>
	<p><label for="lbs-objectives"><strong>Objectives</strong> <span class="description">One per line. These become "This week's objectives" on their Overview. Edit freely: ticks stay with the right objective.</span></label>
		<textarea class="widefat" rows="4" id="lbs-objectives" name="lbs_objectives"><?php echo esc_textarea( implode( "\n", $s['objectives'] ) ); ?></textarea></p>
	<p><label for="lbs-next"><strong>For next time</strong> <span class="description">Shown on their next booking.</span></label>
		<input type="text" class="widefat" id="lbs-next" name="lbs_next" value=""></p>
	<p class="lbs-check"><label><input type="checkbox" id="lbs-notify" name="lbs_notify" value="1" <?php checked( ! $notified ); ?>> Email the member that their notes are ready (when published and Done)</label>
		<?php if ( $notified ) : ?><span class="description">Last emailed <?php echo esc_html( wp_date( 'j M Y, H:i', $notified ) ); ?>.</span><?php endif; ?></p>
	<?php
}

function lbs_box_files( $post ) {
	$s = lbs_session( $post->ID );
	?>
	<input type="hidden" id="lbs-files-json" name="lbs_files_json" value="<?php echo esc_attr( wp_json_encode( $s['files'] ) ); ?>">
	<div id="lbs-files" class="lbs-files" data-ready="<?php echo lbs_nc_ready() ? '1' : '0'; ?>">
		<?php if ( ! lbs_nc_ready() ) : ?>
			<p>Nextcloud isn't connected yet. <a href="<?php echo esc_url( admin_url( 'admin.php?page=lbs-portal-settings' ) ); ?>">Connect it in Portal settings</a>, or type a file path below.</p>
		<?php else : ?>
			<p class="description">Choose a member to see their folder.</p>
		<?php endif; ?>
	</div>
	<p class="lbs-inline"><input type="text" id="lbs-file-add" class="regular-text" placeholder="Or type a path inside their folder, e.g. S14 Walking lines.pdf"> <button type="button" class="button" id="lbs-file-add-btn">Add</button> <button type="button" class="button-link" id="lbs-files-refresh">Refresh folder</button></p>
	<?php
}

function lbs_box_extras( $post ) {
	$member = lbs_edit_values( $post )['member'];
	?>
	<div class="lbs-two">
		<div>
			<h4>Answered in this session</h4>
			<div id="lbs-questions"><?php lbs_questions_checklist( $member ); ?></div>
		</div>
		<div>
			<h4>Recommend tracks</h4>
			<textarea class="widefat" rows="3" id="lbs-listen" name="lbs_listen" placeholder="One per line: Title, Artist: what to listen for"></textarea>
			<p class="description">Added to their Listening list when you save.</p>
		</div>
	</div>
	<?php
}

function lbs_questions_checklist( $member ) {
	$qs = $member ? lbs_open_questions( $member ) : array();
	if ( ! $member ) { echo '<p class="description">Choose a member first.</p>'; return; }
	if ( ! $qs ) { echo '<p class="description">No open questions.</p>'; return; }
	foreach ( $qs as $q ) {
		echo '<label class="lbs-q"><input type="checkbox" name="lbs_answered[]" value="' . esc_attr( $q['id'] ) . '"> ' . esc_html( $q['q'] ) . '</label>';
	}
}

function lbs_box_prep( $post ) {
	$member = lbs_edit_values( $post )['member'];
	echo '<div id="lbs-prep-box">' . ( $member ? lbs_prep_html( $member ) : '<p class="description">Choose a member to see what they\'ve shared.</p>' ) . '</div>'; // phpcs:ignore -- escaped inside.
}

function lbs_box_block( $post ) {
	$member = lbs_edit_values( $post )['member'];
	echo '<div id="lbs-block-box">' . lbs_block_summary_html( $member ) . '</div>'; // phpcs:ignore -- escaped inside.
}

function lbs_block_summary_html( $member ) {
	if ( ! $member ) { return '<p class="description">Choose a member.</p>'; }
	$l    = lbs_ledger( $member );
	$link = '<a href="' . esc_url( admin_url( 'admin.php?page=lbs-members&member=' . $member . '#credit' ) ) . '">Statement and credit</a>';
	if ( ! $l ) { return '<p>Pay as you go.</p><p>' . $link . '</p>'; }
	$html  = '<p><strong>' . esc_html( lbs_hm( $l['balance'] ) ) . '</strong> available.' . ( $l['booked'] ? ' ' . esc_html( lbs_hm( $l['booked'] ) ) . ' already booked.' : '' ) . '</p>';
	$free  = $l['balance'] - $l['booked'];
	$html .= '<p class="' . ( $free < 0 ? 'lbs-warn' : 'description' ) . '">' . ( $free < 0 ? 'Bookings are ' . esc_html( lbs_hm( -$free ) ) . ' beyond their credit.' : esc_html( lbs_hm( $free ) ) . ' not yet booked.' ) . '</p>';
	if ( $l['expiring'] ) { $html .= '<p class="description">' . esc_html( lbs_hm( $l['expiring']['minutes'] ) ) . ' expires ' . esc_html( wp_date( 'j M Y', lbs_dt( $l['expiring']['date'] )->getTimestamp() ) ) . '.</p>'; }
	return $html . '<p>' . $link . '</p>';
}

/* -------------------------------------------------------------------------
 * AJAX for the edit screen
 * ---------------------------------------------------------------------- */

add_action( 'wp_ajax_lbs_member_context', function () {
	check_ajax_referer( 'lbs_admin', 'nonce' );
	if ( ! current_user_can( 'edit_posts' ) ) { wp_send_json_error( 'Not allowed.' ); }
	$member = isset( $_POST['member'] ) ? absint( $_POST['member'] ) : 0;
	if ( ! lbs_is_member( $member ) ) { wp_send_json_error( 'Choose a member.' ); }
	$l = lbs_ledger( $member );
	ob_start();
	lbs_questions_checklist( $member );
	$questions_html = ob_get_clean();
	wp_send_json_success( array(
		'number'     => lbs_next_number( $member ),
		'has_block'  => $l && ( $l['balance'] - $l['booked'] ) > 0,
		'free'       => $l ? $l['balance'] - $l['booked'] : null,
		'block_html' => lbs_block_summary_html( $member ),
		'prep_html'  => lbs_prep_html( $member ),
		'q_html'     => $questions_html,
		'questions'  => array_map( function ( $q ) { return array( 'id' => $q['id'], 'q' => $q['q'] ); }, lbs_open_questions( $member ) ),
		'last'       => ( function () use ( $member ) { $all = lbs_member_sessions( $member ); $p = end( $all ); return $p ? array( 'start' => $p['start'], 'length' => lbs_hours_short( $p['length'] ) ) : null; } )(),
	) );
} );

add_action( 'wp_ajax_lbs_member_files', function () {
	check_ajax_referer( 'lbs_admin', 'nonce' );
	if ( ! current_user_can( 'edit_posts' ) ) { wp_send_json_error( 'Not allowed.' ); }
	$member = isset( $_POST['member'] ) ? absint( $_POST['member'] ) : 0;
	if ( ! lbs_is_member( $member ) ) { wp_send_json_error( 'Choose a member.' ); }
	$files = lbs_nc_member_files( $member );
	if ( is_wp_error( $files ) ) { wp_send_json_error( $files->get_error_message() ); }
	wp_send_json_success( array(
		'folder' => lbs_member_path( $member ),
		'files'  => array_map( function ( $f ) {
			return array( 'path' => $f['path'], 'size' => size_format( $f['size'] ), 'modified' => $f['modified'] ? wp_date( 'j M', $f['modified'] ) : '' );
		}, $files ),
	) );
} );

/* -------------------------------------------------------------------------
 * Save
 * ---------------------------------------------------------------------- */

add_action( 'save_post_' . LBS_CPT, 'lbs_save_session', 10, 2 );

function lbs_save_session( $post_id, $post ) {
	if ( ! isset( $_POST['lbs_session_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['lbs_session_nonce'] ) ), 'lbs_save_session' ) ) { return; }
	if ( wp_is_post_autosave( $post_id ) || wp_is_post_revision( $post_id ) || ! current_user_can( 'edit_post', $post_id ) ) { return; }

	$before     = lbs_session( $post_id );
	$was_public = 'publish' === get_post_meta( $post_id, '_lbs_last_status', true );
	$in         = wp_unslash( $_POST );
	$member = isset( $in['lbs_member'] ) ? absint( $in['lbs_member'] ) : 0;
	if ( $member && ! lbs_is_member( $member ) ) { $member = 0; }
	$date   = isset( $in['lbs_date'] ) && lbs_valid_date( $in['lbs_date'] ) ? $in['lbs_date'] : lbs_today();
	$start  = isset( $in['lbs_start'] ) && preg_match( '/^\d{2}:\d{2}$/', $in['lbs_start'] ) ? $in['lbs_start'] : '';
	$length = isset( $in['lbs_length'] ) ? max( 0.25, min( 8, (float) $in['lbs_length'] ) ) : 1;
	$status = isset( $in['lbs_status'] ) && isset( lbs_statuses()[ $in['lbs_status'] ] ) ? $in['lbs_status'] : 'upcoming';
	$number = isset( $in['lbs_number'] ) ? absint( $in['lbs_number'] ) : 0;
	if ( ! $number && $member ) { $number = lbs_next_number( $member ); }

	$files = json_decode( isset( $in['lbs_files_json'] ) ? (string) $in['lbs_files_json'] : '[]', true );
	$files = is_array( $files ) ? array_slice( array_values( array_unique( array_filter( array_map( 'lbs_clean_path', $files ) ) ) ), 0, 30 ) : array();

	update_post_meta( $post_id, '_lbs_member', $member );
	update_post_meta( $post_id, '_lbs_number', $number );
	update_post_meta( $post_id, '_lbs_date', $date );
	update_post_meta( $post_id, '_lbs_start', $start );
	update_post_meta( $post_id, '_lbs_length', $length );
	update_post_meta( $post_id, '_lbs_status', $status );
	update_post_meta( $post_id, '_lbs_block', empty( $in['lbs_block'] ) ? '0' : '1' );
	update_post_meta( $post_id, '_lbs_paid', empty( $in['lbs_paid'] ) ? '0' : '1' );
	update_post_meta( $post_id, '_lbs_prep', sanitize_text_field( isset( $in['lbs_prep'] ) ? $in['lbs_prep'] : '' ) );
	update_post_meta( $post_id, '_lbs_summary', sanitize_textarea_field( isset( $in['lbs_summary'] ) ? $in['lbs_summary'] : '' ) );
	lbs_save_objectives( $post_id, lbs_lines( sanitize_textarea_field( isset( $in['lbs_objectives'] ) ? $in['lbs_objectives'] : '' ) ) );
	update_post_meta( $post_id, '_lbs_files', $files );
	update_post_meta( $post_id, '_lbs_last_status', $post->post_status );
	$after = lbs_session( $post_id );

	// Anything that changes credit after the fact goes in the member's audit trail.
	$counted = function ( $x ) { return $x['block'] && in_array( $x['status'], array( 'done', 'cancelled_charged' ), true ); };
	if ( $member && $was_public && ( $counted( $before ) || $counted( $after ) ) ) {
		$desc = function ( $x ) { return lbs_statuses()[ $x['status'] ] . ', ' . lbs_hm( $x['minutes'] ) . ', ' . $x['date'] . ( $x['block'] ? ', counted' : ', not counted' ); };
		if ( $desc( $before ) !== $desc( $after ) ) {
			lbs_audit( $member, lbs_session_label( $after ) . ' changed from "' . $desc( $before ) . '" to "' . $desc( $after ) . '"' );
		}
	}

	// A new date or time answers a move request.
	if ( $before['move'] && ( $before['date'] !== $date || $before['start'] !== $start ) ) {
		delete_post_meta( $post_id, '_lbs_move_request' );
	}

	if ( $member ) {
		// Questions answered in this session.
		$answered = isset( $in['lbs_answered'] ) ? array_map( 'sanitize_key', (array) $in['lbs_answered'] ) : array();
		if ( $answered ) {
			$label = 'Answered in ' . strtolower( lbs_session_label( $after ) );
			lbs_pr_update( $member, 'questions', function ( $qs ) use ( $answered, $post_id, $date, $label ) {
				foreach ( $qs as &$q ) {
					if ( in_array( $q['id'], $answered, true ) ) {
						$q['answered']     = $post_id;
						$q['answered_on']  = $date;
						$q['answer_label'] = $label;
					}
				}
				unset( $q );
				return $qs;
			} );
		}

		// Tracks for their listening list: "Title, Artist: note".
		foreach ( lbs_lines( isset( $in['lbs_listen'] ) ? sanitize_textarea_field( $in['lbs_listen'] ) : '' ) as $line ) {
			$note = '';
			if ( false !== strpos( $line, ':' ) ) { list( $line, $note ) = array_map( 'trim', explode( ':', $line, 2 ) ); }
			$bits = array_map( 'trim', explode( ',', $line, 2 ) );
			lbs_add_track( $member, $bits[0], isset( $bits[1] ) ? $bits[1] : '', $note, 'jack' );
		}

		// "For next time" goes on their next booking.
		$next_note = sanitize_text_field( isset( $in['lbs_next'] ) ? $in['lbs_next'] : '' );
		if ( '' !== $next_note ) {
			foreach ( lbs_member_sessions( $member, array( 'upcoming' ), true ) as $u ) {
				if ( $u['id'] !== $post_id && $u['date'] >= $date ) { update_post_meta( $u['id'], '_lbs_prep', $next_note ); break; }
			}
		}
	}

	$published = 'publish' === $post->post_status;

	// Weekly repeats, once, on first publish.
	$repeat = isset( $in['lbs_repeat'] ) ? min( 12, absint( $in['lbs_repeat'] ) ) : 0;
	if ( $repeat && $member && $published && ! get_post_meta( $post_id, '_lbs_repeated', true ) ) {
		update_post_meta( $post_id, '_lbs_repeated', 1 );
		remove_action( 'save_post_' . LBS_CPT, 'lbs_save_session', 10 );
		$base = lbs_dt( $date );
		for ( $i = 1; $i <= $repeat; $i++ ) {
			$new = wp_insert_post( array( 'post_type' => LBS_CPT, 'post_status' => 'publish', 'post_title' => '' ) );
			if ( ! $new || is_wp_error( $new ) ) { continue; }
			update_post_meta( $new, '_lbs_member', $member );
			update_post_meta( $new, '_lbs_number', $number + $i );
			update_post_meta( $new, '_lbs_date', $base->modify( '+' . ( 7 * $i ) . ' days' )->format( 'Y-m-d' ) );
			update_post_meta( $new, '_lbs_start', $start );
			update_post_meta( $new, '_lbs_length', $length );
			update_post_meta( $new, '_lbs_status', 'upcoming' );
			update_post_meta( $new, '_lbs_block', empty( $in['lbs_block'] ) ? '0' : '1' );
			update_post_meta( $new, '_lbs_repeated', 1 );
			update_post_meta( $new, '_lbs_last_status', 'publish' );
		}
		add_action( 'save_post_' . LBS_CPT, 'lbs_save_session', 10, 2 );
	}

	if ( $member && $published && 'done' === $status && ! empty( $in['lbs_notify'] ) ) {
		if ( lbs_mail_notes_ready( $post_id ) ) { update_post_meta( $post_id, '_lbs_notified', time() ); }
	}

	// A published booking that moves or is cancelled: tell the member.
	$notices = array();
	if ( $member && $published && $was_public && 'upcoming' === $before['status'] && $before['date'] >= lbs_today() ) {
		if ( 'upcoming' === $status && ( $before['date'] !== $date || $before['start'] !== $start ) ) {
			$sent      = lbs_mail_booking_changed( $after, $before, 'moved' );
			$notices[] = array( 'failed' === $sent ? 'error' : 'success', 'failed' === $sent ? 'The member couldn\'t be emailed about the new time. See Members → Email log.' : 'The member has been emailed the new time.' );
		} elseif ( in_array( $status, array( 'cancelled_free', 'cancelled_charged' ), true ) ) {
			$sent      = lbs_mail_booking_changed( $after, $before, 'cancelled' );
			$notices[] = array( 'failed' === $sent ? 'error' : 'success', 'failed' === $sent ? 'The member couldn\'t be emailed about the cancellation. See Members → Email log.' : 'The member has been emailed about the cancellation.' );
		}
	}

	// Warnings for Jack: clashes, and bookings beyond credit.
	if ( $member && 'upcoming' === $status ) {
		foreach ( lbs_overlaps( $after ) as $o ) {
			$who       = get_userdata( $o['member'] );
			$notices[] = array( 'warning', 'This overlaps ' . ( $who ? $who->display_name . '\'s ' : 'another ' ) . 'session at ' . $o['start'] . ' on the same day.' );
		}
		if ( $after['block'] && ! $after['paid'] && $published ) {
			$l = lbs_ledger( $member );
			if ( $l && empty( $l['covered'][ $post_id ] ) ) {
				$notices[] = array( 'warning', 'Their credit doesn\'t cover this booking, so it shows as provisional until they buy more or you tick Paid.' );
			}
		}
	}
	if ( $notices ) { set_transient( 'lbs_notices_' . get_current_user_id(), $notices, 120 ); }

	// Credit running low: tell the member (if they want) and Jack, once per purchase.
	if ( $member && $published && in_array( $status, array( 'done', 'cancelled_charged' ), true ) && ! empty( $in['lbs_block'] ) ) {
		$l = lbs_ledger( $member );
		if ( $l && $l['balance'] <= 60 ) {
			$key = $l['last']['id'];
			if ( get_user_meta( $member, '_lbs_low_sent', true ) !== $key ) {
				lbs_mail_low_block( $member, $l['balance'] );
				update_user_meta( $member, '_lbs_low_sent', $key );
			}
		}
	}
}

/* -------------------------------------------------------------------------
 * Sessions list
 * ---------------------------------------------------------------------- */

add_filter( 'manage_' . LBS_CPT . '_posts_columns', function () {
	return array(
		'cb'         => '<input type="checkbox">',
		'title'      => 'Session',
		'lbs_member' => 'Member',
		'lbs_when'   => 'When',
		'lbs_status' => 'Status',
		'lbs_files'  => 'Notes',
	);
} );

add_action( 'manage_' . LBS_CPT . '_posts_custom_column', function ( $col, $post_id ) {
	$s = lbs_session( $post_id );
	switch ( $col ) {
		case 'lbs_member':
			$u = $s['member'] ? get_userdata( $s['member'] ) : null;
			echo $u ? '<a href="' . esc_url( admin_url( 'admin.php?page=lbs-members&member=' . $u->ID ) ) . '">' . esc_html( $u->display_name ) . '</a>' : '—';
			break;
		case 'lbs_when':
			echo $s['date'] ? esc_html( wp_date( 'D j M Y', lbs_dt( $s['date'] )->getTimestamp() ) . ( $s['start'] ? ', ' . $s['start'] : '' ) ) : '—';
			echo '<br><span class="description">' . esc_html( lbs_length_label( $s['length'] ) ) . ( $s['block'] ? ' · credit' : '' ) . ( $s['paid'] ? ' · paid' : '' ) . '</span>';
			break;
		case 'lbs_status':
			echo '<span class="lbs-status lbs-status-' . esc_attr( $s['status'] ) . '">' . esc_html( lbs_statuses()[ $s['status'] ] ) . '</span>';
			if ( 'upcoming' === $s['status'] && $s['member'] ) { echo '<br><span class="description">' . ( lbs_booking_confirmed( $s ) ? 'Confirmed' : 'Provisional' ) . '</span>'; }
			if ( $s['move'] ) { echo '<br><span class="lbs-flag">Move requested</span>'; }
			if ( 'upcoming' === $s['status'] && $s['date'] && $s['date'] < lbs_today() ) { echo '<br><span class="lbs-flag">Add notes</span>'; }
			break;
		case 'lbs_files':
			$bits = array();
			if ( $s['summary'] ) { $bits[] = 'summary'; }
			if ( $s['objectives'] ) { $bits[] = count( $s['objectives'] ) . ' objective' . ( 1 === count( $s['objectives'] ) ? '' : 's' ); }
			if ( $s['files'] ) { $bits[] = count( $s['files'] ) . ' file' . ( 1 === count( $s['files'] ) ? '' : 's' ); }
			echo esc_html( $bits ? implode( ', ', $bits ) : '—' );
			break;
	}
}, 10, 2 );

// Title fallback in the list for bookings without one.
add_filter( 'the_title', function ( $title, $post_id = 0 ) {
	if ( ! is_admin() || ! $post_id || '' !== trim( (string) $title ) || LBS_CPT !== get_post_type( $post_id ) ) { return $title; }
	$s = lbs_session( $post_id );
	return lbs_session_label( $s ) . ( 'upcoming' === $s['status'] ? ' (booking)' : '' );
}, 10, 2 );

add_filter( 'manage_edit-' . LBS_CPT . '_sortable_columns', function ( $cols ) {
	$cols['lbs_when'] = 'lbs_when';
	return $cols;
} );

add_action( 'restrict_manage_posts', function ( $type ) {
	if ( LBS_CPT !== $type ) { return; }
	$current = isset( $_GET['lbs_m'] ) ? absint( $_GET['lbs_m'] ) : 0;
	echo '<select name="lbs_m"><option value="">All members</option>';
	foreach ( lbs_members() as $m ) {
		echo '<option value="' . (int) $m->ID . '" ' . selected( $current, $m->ID, false ) . '>' . esc_html( $m->display_name ) . '</option>';
	}
	echo '</select>';
} );

add_action( 'pre_get_posts', function ( $q ) {
	if ( ! is_admin() || ! $q->is_main_query() || LBS_CPT !== $q->get( 'post_type' ) ) { return; }
	$orderby = $q->get( 'orderby' );
	if ( ! $orderby || 'lbs_when' === $orderby ) {
		$q->set( 'meta_key', '_lbs_date' );
		$q->set( 'orderby', 'meta_value' );
		if ( ! $q->get( 'order' ) || ! isset( $_GET['order'] ) ) { $q->set( 'order', 'DESC' ); }
	}
	if ( ! empty( $_GET['lbs_m'] ) ) {
		$q->set( 'meta_query', array( array( 'key' => '_lbs_member', 'value' => absint( $_GET['lbs_m'] ) ) ) );
	}
} );

/** Show save-time notices (booking emails, clashes, credit) on the next screen. */
add_action( 'admin_notices', function () {
	$key     = 'lbs_notices_' . get_current_user_id();
	$notices = get_transient( $key );
	if ( ! $notices ) { return; }
	delete_transient( $key );
	foreach ( $notices as $n ) {
		echo '<div class="notice notice-' . esc_attr( $n[0] ) . ' is-dismissible"><p>' . esc_html( $n[1] ) . '</p></div>';
	}
} );
