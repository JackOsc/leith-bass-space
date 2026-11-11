<?php
/**
 * Jack's side: Members menu, member pages, lesson credit, portal settings,
 * the email log and a dashboard widget for today's sessions.
 *
 * @package LeithBassMembers
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

/* -------------------------------------------------------------------------
 * Menu and assets
 * ---------------------------------------------------------------------- */

add_action( 'admin_menu', function () {
	add_menu_page( 'Members', 'Members', 'manage_options', 'lbs-members', 'lbs_members_page', 'dashicons-groups', 7 );
	add_submenu_page( 'lbs-members', 'All members', 'All members', 'manage_options', 'lbs-members', 'lbs_members_page' );
}, 9 ); // Before core adds the Sessions list, so "All members" comes first.

add_action( 'admin_menu', function () {
	add_submenu_page( 'lbs-members', 'Add session', 'Add session', 'manage_options', 'post-new.php?post_type=' . LBS_CPT );
	add_submenu_page( 'lbs-members', 'Email log', 'Email log', 'manage_options', 'lbs-email-log', 'lbs_email_log_page' );
	add_submenu_page( 'lbs-members', 'Portal settings', 'Portal settings', 'manage_options', 'lbs-portal-settings', 'lbs_settings_page' );
}, 11 );

function lbs_admin_notice_from_query() {
	$map = array(
		'added'    => array( 'success', 'Member added.' ),
		'invited'  => array( 'success', 'Invite sent.' ),
		'queued'   => array( 'warning', 'The invite couldn\'t be sent straight away. It\'ll be retried; see Members → Email log.' ),
		'noinvite' => array( 'error', 'The invite couldn\'t be sent. Check that portal access is on, and see Members → Email log.' ),
		'saved'    => array( 'success', 'Saved.' ),
		'block'    => array( 'success', 'Block added.' ),
		'void'     => array( 'success', 'Block voided. It stays on the statement with your reason.' ),
		'adjusted' => array( 'success', 'Adjustment recorded.' ),
		'listened' => array( 'success', 'Marked as listened.' ),
		'track'    => array( 'success', 'Added to their listening list.' ),
		'habit'    => array( 'success', 'Practice goal saved. They\'ll see it in their Habit tracker.' ),
		'access'   => array( 'success', 'Portal access updated.' ),
		'exists'   => array( 'error', 'Someone already uses that email address.' ),
		'invalid'  => array( 'error', 'Add a name and a valid email address.' ),
		'folder'   => array( 'error', 'Another member already uses that folder. Each member needs their own.' ),
		'reason'   => array( 'error', 'Give a reason, so the statement explains itself.' ),
		'retried'  => array( 'success', 'Tried again. The log below shows the result.' ),
	);
	$key = isset( $_GET['lbs'] ) ? sanitize_key( wp_unslash( $_GET['lbs'] ) ) : '';
	if ( isset( $map[ $key ] ) ) {
		echo '<div class="notice notice-' . esc_attr( $map[ $key ][0] ) . ' is-dismissible"><p>' . esc_html( $map[ $key ][1] ) . '</p></div>';
	}
	if ( isset( $_GET['lbs_msg'] ) ) {
		$ok = ! empty( $_GET['lbs_ok'] );
		echo '<div class="notice notice-' . ( $ok ? 'success' : 'error' ) . ' is-dismissible"><p>' . esc_html( sanitize_text_field( wp_unslash( $_GET['lbs_msg'] ) ) ) . '</p></div>';
	}
}

// Folder clashes found while upgrading from the 3.6.0 theme.
add_action( 'admin_notices', function () {
	$dups = get_option( 'lbs_folder_conflicts', array() );
	if ( ! $dups || ! current_user_can( 'manage_options' ) ) { return; }
	$names = array();
	foreach ( $dups as $pair ) {
		$a = get_userdata( $pair[0] );
		$b = get_userdata( $pair[1] );
		if ( $a && $b && strtolower( get_user_meta( $a->ID, '_lbs_folder', true ) ) === strtolower( get_user_meta( $b->ID, '_lbs_folder', true ) ) ) { $names[] = $a->display_name . ' and ' . $b->display_name; }
	}
	if ( ! $names ) { delete_option( 'lbs_folder_conflicts' ); return; }
	echo '<div class="notice notice-error"><p><strong>Two members share a Nextcloud folder:</strong> ' . esc_html( implode( '; ', $names ) ) . '. Give one of them a new folder on their member page (and move their files in Nextcloud to match).</p></div>';
} );

add_action( 'admin_enqueue_scripts', function ( $hook ) {
	$screen  = get_current_screen();
	$session = $screen && LBS_CPT === $screen->post_type;
	$ours    = false !== strpos( (string) $hook, 'lbs-' ) || $session || 'index.php' === $hook;
	if ( ! $ours ) { return; }
	wp_enqueue_style( 'lbs-admin', LBS_URL . 'assets/portal-admin.css', array(), LBS_VERSION );
	if ( $session && in_array( $hook, array( 'post.php', 'post-new.php' ), true ) ) {
		global $post;
		wp_enqueue_script( 'lbs-admin', LBS_URL . 'assets/portal-admin.js', array(), LBS_VERSION, true );
		wp_localize_script( 'lbs-admin', 'LBS_ADMIN', array(
			'ajax'     => admin_url( 'admin-ajax.php' ),
			'nonce'    => wp_create_nonce( 'lbs_admin' ),
			'template' => lbs_proforma_blank(),
			'ncReady'  => lbs_nc_ready(),
			'today'    => lbs_today(),
			'isNew'    => $post && 'auto-draft' === $post->post_status,
			'counted'  => $post ? ( 'upcoming' === get_post_meta( $post->ID, '_lbs_status', true ) && '1' === get_post_meta( $post->ID, '_lbs_block', true ) && 'publish' === $post->post_status ? lbs_minutes( get_post_meta( $post->ID, '_lbs_length', true ) ) : 0 ) : 0,
		) );
	}
} );

function lbs_proforma_blank() {
	$path = LBS_DIR . 'assets/session-notes-template.txt';
	return is_readable( $path ) ? (string) file_get_contents( $path ) : ''; // phpcs:ignore
}

/** "1h 30m", "90", "1.5" or "-2h" → minutes. */
function lbs_parse_minutes( $text ) {
	$text = strtolower( trim( (string) $text ) );
	$neg  = 0 === strpos( $text, '-' ) || 0 === strpos( $text, '−' );
	$text = ltrim( $text, "-−+ \t" );
	$m    = 0;
	if ( preg_match( '/^(\d+(?:\.\d+)?)$/', $text, $x ) ) { $m = (int) round( (float) $x[1] * 60 ); }
	else {
		if ( preg_match( '/(\d+(?:\.\d+)?)\s*h/', $text, $x ) ) { $m += (int) round( (float) $x[1] * 60 ); }
		if ( preg_match( '/(\d+)\s*m/', $text, $x ) ) { $m += (int) $x[1]; }
	}
	return $neg ? -$m : $m;
}

/* -------------------------------------------------------------------------
 * Members list
 * ---------------------------------------------------------------------- */

function lbs_members_page() {
	if ( ! current_user_can( 'manage_options' ) ) { return; }
	$member = isset( $_GET['member'] ) ? absint( $_GET['member'] ) : 0;
	if ( $member && lbs_is_member( $member ) ) { lbs_member_detail( $member ); return; }
	$members = lbs_members();
	?>
	<div class="wrap lbs-admin">
		<h1 class="wp-heading-inline">Members</h1>
		<a class="page-title-action" href="#lbs-add">Add member</a>
		<a class="page-title-action" href="<?php echo esc_url( admin_url( 'post-new.php?post_type=' . LBS_CPT ) ); ?>">Add session</a>
		<hr class="wp-header-end">
		<?php lbs_admin_notice_from_query(); ?>

		<?php if ( $members ) : ?>
			<table class="widefat striped lbs-table">
				<thead><tr><th>Member</th><th>Portal</th><th>Credit</th><th>Next session</th><th>For you</th><th></th></tr></thead>
				<tbody>
				<?php foreach ( $members as $m ) :
					$status = lbs_member_status( $m->ID );
					$ledger = lbs_ledger( $m->ID );
					$next   = lbs_upcoming( $m->ID );
					$next   = $next ? $next[0] : null;
					$prep   = lbs_prep( $m->ID );
					$flags  = array();
					if ( ! empty( $prep['questions'] ) ) { $flags[] = count( $prep['questions'] ) . ' question' . ( 1 === count( $prep['questions'] ) ? '' : 's' ); }
					if ( ! empty( $prep['recordings'] ) ) { $flags[] = count( $prep['recordings'] ) . ' recording' . ( 1 === count( $prep['recordings'] ) ? '' : 's' ); }
					if ( $next && $next['move'] ) { $flags[] = 'move request'; }
					?>
					<tr>
						<td><strong><a href="<?php echo esc_url( admin_url( 'admin.php?page=lbs-members&member=' . $m->ID ) ); ?>"><?php echo esc_html( $m->display_name ); ?></a></strong><br><span class="description"><?php echo esc_html( $m->user_email ); ?><?php echo lbs_guardian( $m->ID ) ? ' · guardian copied' : ''; ?></span></td>
						<td><span class="lbs-pill lbs-pill-<?php echo esc_attr( $status[0] ); ?>"><?php echo esc_html( $status[1] ); ?></span></td>
						<td class="num"><?php
						if ( ! $ledger ) { echo 'Pay as you go'; }
						else {
							echo '<span class="' . ( $ledger['balance'] < 0 ? 'lbs-warn' : '' ) . '">' . esc_html( lbs_hm( $ledger['balance'] ) ) . ' available</span>';
							if ( $ledger['booked'] ) { echo '<br><span class="description">' . esc_html( lbs_hm( $ledger['booked'] ) ) . ' booked</span>'; }
						}
						?></td>
						<td><?php echo $next ? '<a href="' . esc_url( get_edit_post_link( $next['id'] ) ) . '">' . esc_html( wp_date( 'D j M', lbs_dt( $next['date'] )->getTimestamp() ) . ( $next['start'] ? ', ' . $next['start'] : '' ) ) . '</a><br><span class="description">' . ( lbs_booking_confirmed( $next, $ledger ) ? 'Confirmed' : 'Provisional' ) . '</span>' : '<span class="description">None booked</span>'; ?></td>
						<td><?php echo $flags ? esc_html( implode( ', ', $flags ) ) : '<span class="description">—</span>'; ?></td>
						<td class="lbs-actions">
							<?php if ( in_array( $status[0], array( 'none', 'invited', 'expired' ), true ) ) : ?>
								<?php lbs_action_button( 'lbs_send_invite', $m->ID, 'none' === $status[0] ? 'Send invite' : 'Resend invite' ); ?>
							<?php endif; ?>
						</td>
					</tr>
				<?php endforeach; ?>
				</tbody>
			</table>
		<?php else : ?>
			<p>No members yet. Add your first below. They get an email to set a password, and there's no public sign-up form, so nobody else can get in.</p>
		<?php endif; ?>

		<h2 id="lbs-add">Add a member</h2>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="lbs-card lbs-form">
			<input type="hidden" name="action" value="lbs_add_member">
			<?php wp_nonce_field( 'lbs_add_member' ); ?>
			<div class="lbs-grid">
				<p><label for="lbs-new-name">Name</label><input type="text" id="lbs-new-name" name="name" required></p>
				<p><label for="lbs-new-email">Email</label><input type="email" id="lbs-new-email" name="email" required></p>
				<p><label for="lbs-new-gname">Parent or guardian (under 16s, if they&rsquo;d like copies)</label><input type="text" id="lbs-new-gname" name="guardian_name" placeholder="Name"></p>
				<p><label for="lbs-new-gemail">Guardian's email</label><input type="email" id="lbs-new-gemail" name="guardian_email" placeholder="Gets copies of portal emails"></p>
				<p><label for="lbs-new-hours">Block bought (hours)</label><input type="number" step="0.5" min="0" id="lbs-new-hours" name="hours" placeholder="e.g. 10"></p>
				<p><label for="lbs-new-price">Price (£)</label><input type="number" step="1" min="0" id="lbs-new-price" name="price" placeholder="e.g. 360"></p>
				<p><label for="lbs-new-date">Bought on</label><input type="date" id="lbs-new-date" name="date" value="<?php echo esc_attr( lbs_today() ); ?>"></p>
			</div>
			<p class="description">Their Nextcloud folder is created for them with a permanent name, e.g. "Morven Kerr (k4f7q)", inside <?php echo esc_html( lbs_settings()['nc_root'] ); ?>. <?php echo (int) lbs_settings()['block_months'] ? 'Blocks expire after ' . (int) lbs_settings()['block_months'] . ' months (change this in Portal settings).' : 'Blocks don\'t expire (change this in Portal settings).'; ?></p>
			<p><label><input type="checkbox" name="invite" value="1" checked> Email them an invite now</label></p>
			<?php submit_button( 'Add member', 'primary', 'submit', false ); ?>
		</form>
	</div>
	<?php
}

function lbs_action_button( $action, $member, $label, $extra = array(), $class = 'button' ) {
	echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" class="lbs-inline-form">';
	echo '<input type="hidden" name="action" value="' . esc_attr( $action ) . '"><input type="hidden" name="member" value="' . (int) $member . '">';
	foreach ( $extra as $k => $v ) { echo '<input type="hidden" name="' . esc_attr( $k ) . '" value="' . esc_attr( $v ) . '">'; }
	wp_nonce_field( $action . '_' . $member );
	echo '<button type="submit" class="' . esc_attr( $class ) . '">' . esc_html( $label ) . '</button></form>';
}

function lbs_action_button_html( $action, $member, $label, $extra = array() ) {
	ob_start();
	lbs_action_button( $action, $member, $label, $extra, 'button button-small' );
	return ob_get_clean();
}

/* -------------------------------------------------------------------------
 * One member
 * ---------------------------------------------------------------------- */

function lbs_member_detail( $uid ) {
	$user     = get_userdata( $uid );
	$status   = lbs_member_status( $uid );
	$ledger   = lbs_ledger( $uid );
	$recs     = lbs_pr_get( $uid, 'recordings' );
	$nc       = lbs_nc_config();
	$guardian = lbs_guardian( $uid );
	$audit    = get_user_meta( $uid, '_lbs_audit', true );
	?>
	<div class="wrap lbs-admin">
		<p><a href="<?php echo esc_url( admin_url( 'admin.php?page=lbs-members' ) ); ?>">&larr; All members</a></p>
		<h1 class="wp-heading-inline"><?php echo esc_html( $user->display_name ); ?></h1>
		<span class="lbs-pill lbs-pill-<?php echo esc_attr( $status[0] ); ?>"><?php echo esc_html( $status[1] ); ?></span>
		<hr class="wp-header-end">
		<?php lbs_admin_notice_from_query(); ?>

		<div class="lbs-toolbar">
			<a class="button button-primary" href="<?php echo esc_url( admin_url( 'post-new.php?post_type=' . LBS_CPT . '&member=' . $uid ) ); ?>">Add session</a>
			<a class="button" href="<?php echo esc_url( admin_url( 'edit.php?post_type=' . LBS_CPT . '&lbs_m=' . $uid ) ); ?>">All their sessions</a>
			<a class="button" href="<?php echo esc_url( lbs_portal_url( 'home', array( 'as' => $uid ) ) ); ?>" target="_blank" rel="noopener">Preview their portal</a>
			<?php if ( $nc['url'] ) : ?><a class="button" href="<?php echo esc_url( $nc['url'] . '/apps/files/?dir=' . rawurlencode( lbs_member_path( $uid ) ) ); ?>" target="_blank" rel="noopener">Open folder in Nextcloud</a><?php endif; ?>
			<?php if ( ! lbs_member_disabled( $uid ) ) { lbs_action_button( 'lbs_send_invite', $uid, 'active' === $status[0] ? 'Send a set-password link' : ( 'none' === $status[0] ? 'Send invite' : 'Resend invite' ) ); } ?>
			<?php lbs_action_button( 'lbs_toggle_access', $uid, lbs_member_disabled( $uid ) ? 'Switch portal access on' : 'Switch portal access off', array(), 'button-link lbs-danger' ); ?>
		</div>
		<p class="description">Preview shows what they see, without their private tools or ticks.</p>

		<div class="lbs-cols">
			<div>
				<section class="lbs-card">
					<h2>Before their next session</h2>
					<?php echo lbs_prep_html( $uid ); // phpcs:ignore -- escaped inside. ?>
				</section>

				<?php if ( $recs ) : ?>
				<section class="lbs-card">
					<h2>Recordings</h2>
					<table class="widefat striped"><tbody>
					<?php foreach ( $recs as $r ) : ?>
						<tr>
							<td><a href="<?php echo esc_url( lbs_portal_url( 'file', array( 'r' => $r['id'], 'u' => $uid ) ) ); ?>" target="_blank" rel="noopener"><?php echo esc_html( $r['name'] ); ?></a><?php echo ! empty( $r['note'] ) ? '<br><span class="description">' . esc_html( $r['note'] ) . '</span>' : ''; ?></td>
							<td><?php echo esc_html( wp_date( 'j M', lbs_dt( $r['added'] )->getTimestamp() ) . ( ! empty( $r['size'] ) ? ' · ' . size_format( $r['size'] ) : '' ) ); ?></td>
							<td><?php echo ! empty( $r['listened'] ) ? 'Listened' : lbs_action_button_html( 'lbs_mark_listened', $uid, 'Mark listened', array( 'rec' => $r['id'] ) ); // phpcs:ignore ?></td>
						</tr>
					<?php endforeach; ?>
					</tbody></table>
				</section>
				<?php endif; ?>

				<?php lbs_he_member_card( $uid ); ?>
				<?php lbs_ear_member_card( $uid ); ?>
				<?php if ( function_exists( 'lbs_read_member_card' ) ) { lbs_read_member_card( $uid ); } ?>

				<section class="lbs-card" id="credit">
					<h2>Lesson credit</h2>
					<?php if ( $ledger ) : ?>
						<p><strong class="<?php echo $ledger['balance'] < 0 ? 'lbs-warn' : ''; ?>"><?php echo esc_html( lbs_hm( $ledger['balance'] ) ); ?> available</strong><?php echo $ledger['booked'] ? ', ' . esc_html( lbs_hm( $ledger['booked'] ) ) . ' booked' : ''; ?><?php echo $ledger['expiring'] ? '. ' . esc_html( lbs_hm( $ledger['expiring']['minutes'] ) ) . ' expires ' . esc_html( wp_date( 'j M Y', lbs_dt( $ledger['expiring']['date'] )->getTimestamp() ) ) : ''; ?>.</p>
						<table class="widefat striped lbs-ledger"><thead><tr><th>Date</th><th>Item</th><th class="num">Change</th><th class="num">Balance</th></tr></thead><tbody>
						<?php foreach ( $ledger['rows'] as $row ) : ?>
							<tr class="lbs-row-<?php echo esc_attr( $row['type'] ); ?>"><td><?php echo esc_html( wp_date( 'j M Y', lbs_dt( $row['date'] )->getTimestamp() ) ); ?></td><td><?php echo esc_html( $row['label'] ); ?></td><td class="num"><?php echo esc_html( lbs_hm( $row['minutes'], true ) ); ?></td><td class="num"><?php echo esc_html( lbs_hm( $row['balance'] ) ); ?></td></tr>
						<?php endforeach; ?>
						</tbody></table>
						<details><summary>Blocks</summary>
							<table class="widefat striped"><tbody>
							<?php foreach ( lbs_blocks( $uid ) as $b ) : ?>
								<tr><td><?php echo esc_html( wp_date( 'j M Y', lbs_dt( $b['date'] )->getTimestamp() ) . ': ' . lbs_block_label( $b ) ); ?><br><span class="description"><?php echo $b['void'] ? 'Voided: ' . esc_html( $b['void_reason'] ) : ( $b['expires'] ? 'Expires ' . esc_html( wp_date( 'j M Y', lbs_dt( $b['expires'] )->getTimestamp() ) ) : 'Doesn\'t expire' ); ?></span></td>
								<td><?php if ( ! $b['void'] ) : ?>
									<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="lbs-inline">
										<input type="hidden" name="action" value="lbs_void_block"><input type="hidden" name="member" value="<?php echo (int) $uid; ?>"><input type="hidden" name="block" value="<?php echo esc_attr( $b['id'] ); ?>">
										<?php wp_nonce_field( 'lbs_void_block_' . $uid ); ?>
										<input type="text" name="reason" placeholder="Reason for voiding" aria-label="Reason for voiding" required>
										<button type="submit" class="button-link lbs-danger">Void</button>
									</form>
								<?php endif; ?></td></tr>
							<?php endforeach; ?>
							</tbody></table>
						</details>
					<?php else : ?>
						<p>Pay as you go. Add a block when they buy one; sessions ticked "Count against their credit" come off it.</p>
					<?php endif; ?>

					<h3>Add a block</h3>
					<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="lbs-grid lbs-form">
						<input type="hidden" name="action" value="lbs_add_block"><input type="hidden" name="member" value="<?php echo (int) $uid; ?>">
						<?php wp_nonce_field( 'lbs_add_block_' . $uid ); ?>
						<p><label for="lbs-b-date">Bought on</label><input type="date" id="lbs-b-date" name="date" value="<?php echo esc_attr( lbs_today() ); ?>"></p>
						<p><label for="lbs-b-hours">Hours</label><input type="number" step="0.5" min="0.5" id="lbs-b-hours" name="hours" value="10"></p>
						<p><label for="lbs-b-price">Price (£)</label><input type="number" step="1" min="0" id="lbs-b-price" name="price" value="360"></p>
						<p><label for="lbs-b-exp">Expires</label><input type="date" id="lbs-b-exp" name="expires" placeholder="Default"><span class="description">Blank: <?php echo (int) lbs_settings()['block_months'] ? (int) lbs_settings()['block_months'] . ' months' : 'never'; ?></span></p>
						<p class="lbs-end"><button type="submit" class="button">Add block</button></p>
					</form>

					<h3>Adjust credit</h3>
					<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="lbs-grid lbs-form">
						<input type="hidden" name="action" value="lbs_adjust"><input type="hidden" name="member" value="<?php echo (int) $uid; ?>">
						<?php wp_nonce_field( 'lbs_adjust_' . $uid ); ?>
						<p><label for="lbs-a-date">Date</label><input type="date" id="lbs-a-date" name="date" value="<?php echo esc_attr( lbs_today() ); ?>"></p>
						<p><label for="lbs-a-amt">Amount</label><input type="text" id="lbs-a-amt" name="amount" placeholder="+1h, -30m, 1h 30m" required></p>
						<p class="lbs-wide"><label for="lbs-a-note">Reason (shown on their statement)</label><input type="text" id="lbs-a-note" name="note" placeholder="e.g. Goodwill hour, correction for 8 Sep" required></p>
						<p class="lbs-end"><button type="submit" class="button">Record adjustment</button></p>
					</form>

					<?php if ( is_array( $audit ) && $audit ) : ?>
						<details><summary>Change history (<?php echo count( $audit ); ?>)</summary>
							<ul class="lbs-list">
							<?php foreach ( array_reverse( array_slice( $audit, -50 ) ) as $a ) : ?>
								<li><?php echo esc_html( wp_date( 'j M Y, H:i', $a['at'] ) . ' · ' . $a['by'] . ': ' . $a['what'] ); ?></li>
							<?php endforeach; ?>
							</ul>
						</details>
					<?php endif; ?>
				</section>
			</div>

			<div>
				<section class="lbs-card">
					<h2>Details</h2>
					<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="lbs-form">
						<input type="hidden" name="action" value="lbs_update_member"><input type="hidden" name="member" value="<?php echo (int) $uid; ?>">
						<?php wp_nonce_field( 'lbs_update_member_' . $uid ); ?>
						<p><label for="lbs-d-name">Name</label><input type="text" id="lbs-d-name" name="name" value="<?php echo esc_attr( $user->display_name ); ?>"></p>
						<p><label for="lbs-d-email">Email</label><input type="email" id="lbs-d-email" name="email" value="<?php echo esc_attr( $user->user_email ); ?>"></p>
						<p><label for="lbs-d-phone">Phone</label><input type="text" id="lbs-d-phone" name="phone" value="<?php echo esc_attr( get_user_meta( $uid, '_lbs_phone', true ) ); ?>"></p>
						<p><label for="lbs-d-gname">Parent or guardian</label><input type="text" id="lbs-d-gname" name="guardian_name" value="<?php echo esc_attr( $guardian ? $guardian['name'] : '' ); ?>"></p>
						<p><label for="lbs-d-gemail">Guardian's email</label><input type="email" id="lbs-d-gemail" name="guardian_email" value="<?php echo esc_attr( $guardian ? $guardian['email'] : '' ); ?>"><span class="description">Copied into notes, reminders, booking and credit emails.</span></p>
						<p><label for="lbs-d-folder">Nextcloud folder</label><input type="text" id="lbs-d-folder" name="folder" value="<?php echo esc_attr( lbs_member_folder( $uid ) ); ?>"><span class="description"><?php echo esc_html( lbs_member_path( $uid ) ); ?>. Permanent: it doesn't follow their name. If you change it, move their files in Nextcloud too.</span></p>
						<?php submit_button( 'Save details', 'secondary', 'submit', false ); ?>
					</form>
				</section>

				<section class="lbs-card">
					<h2>Practice goal</h2>
					<?php $habit = lbs_pr_get( $uid, 'habit' ); ?>
					<p class="description">Agree it together. It shows in their Habit tracker as set with you, and they can change it.<?php echo $habit['by'] ? ' Last set by ' . ( 'jack' === $habit['by'] ? 'you' : 'them' ) . ( $habit['set'] ? ', ' . esc_html( wp_date( 'j M', lbs_dt( $habit['set'] )->getTimestamp() ) ) : '' ) . '.' : ''; ?></p>
					<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="lbs-grid lbs-form">
						<input type="hidden" name="action" value="lbs_habit_goal"><input type="hidden" name="member" value="<?php echo (int) $uid; ?>">
						<?php wp_nonce_field( 'lbs_habit_goal_' . $uid ); ?>
						<p><label for="lbs-h-days">Days a week</label><select id="lbs-h-days" name="days"><option value="0">No goal</option><?php for ( $i = 1; $i <= 7; $i++ ) { echo '<option value="' . (int) $i . '"' . selected( (int) $habit['days'], $i, false ) . '>' . (int) $i . '</option>'; } ?></select></p>
						<p><label for="lbs-h-min">Minutes a day</label><select id="lbs-h-min" name="min"><?php foreach ( array( 5, 10, 15, 20, 25, 30, 45, 60, 90 ) as $m ) { echo '<option value="' . (int) $m . '"' . selected( (int) $habit['min'] ? (int) $habit['min'] : 15, $m, false ) . '>' . (int) $m . '</option>'; } ?></select></p>
						<p><?php submit_button( 'Set goal', 'secondary', 'submit', false ); ?></p>
					</form>
				</section>

				<section class="lbs-card">
					<h2>Recommend a track</h2>
					<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="lbs-form">
						<input type="hidden" name="action" value="lbs_add_track"><input type="hidden" name="member" value="<?php echo (int) $uid; ?>">
						<?php wp_nonce_field( 'lbs_add_track_' . $uid ); ?>
						<p><label for="lbs-t-title">Track</label><input type="text" id="lbs-t-title" name="title" required></p>
						<p><label for="lbs-t-artist">Artist</label><input type="text" id="lbs-t-artist" name="artist"></p>
						<p><label for="lbs-t-note">What to listen for</label><input type="text" id="lbs-t-note" name="note"></p>
						<?php submit_button( 'Add to their list', 'secondary', 'submit', false ); ?>
					</form>
				</section>

				<section class="lbs-card">
					<h2>Upcoming</h2>
					<?php $up = lbs_upcoming( $uid ); ?>
					<?php if ( $up ) : ?>
						<ul class="lbs-list">
						<?php foreach ( array_slice( $up, 0, 10 ) as $s ) : ?>
							<li><a href="<?php echo esc_url( get_edit_post_link( $s['id'] ) ); ?>"><?php echo esc_html( wp_date( 'D j M', lbs_dt( $s['date'] )->getTimestamp() ) . ( $s['start'] ? ', ' . $s['start'] : '' ) . ' · ' . lbs_session_label( $s ) ); ?></a>
								<span class="description"><?php echo lbs_booking_confirmed( $s, $ledger ) ? 'Confirmed' : 'Provisional'; ?></span>
								<?php echo $s['move'] ? ' <span class="lbs-flag">Move requested</span>' : ''; ?></li>
						<?php endforeach; ?>
						</ul>
					<?php else : ?>
						<p class="description">Nothing booked.</p>
					<?php endif; ?>
				</section>
			</div>
		</div>
	</div>
	<?php
}

/* -------------------------------------------------------------------------
 * Member actions (admin-post.php)
 * ---------------------------------------------------------------------- */

function lbs_admin_guard( $action, $member = 0 ) {
	if ( ! current_user_can( 'manage_options' ) ) { wp_die( 'You do not have permission to do that.' ); }
	check_admin_referer( $member ? $action . '_' . $member : $action );
}

function lbs_admin_back( $member, $flag ) {
	$url = $member ? admin_url( 'admin.php?page=lbs-members&member=' . $member ) : admin_url( 'admin.php?page=lbs-members' );
	wp_safe_redirect( add_query_arg( 'lbs', $flag, $url ) );
	exit;
}

function lbs_post_text( $key ) {
	return isset( $_POST[ $key ] ) ? sanitize_text_field( wp_unslash( $_POST[ $key ] ) ) : ''; // phpcs:ignore
}

function lbs_save_guardian( $uid ) {
	$email = sanitize_email( lbs_post_text( 'guardian_email' ) );
	update_user_meta( $uid, '_lbs_guardian_email', is_email( $email ) ? $email : '' );
	update_user_meta( $uid, '_lbs_guardian_name', lbs_post_text( 'guardian_name' ) );
}

add_action( 'admin_post_lbs_add_member', function () {
	lbs_admin_guard( 'lbs_add_member' );
	$name  = lbs_post_text( 'name' );
	$email = sanitize_email( lbs_post_text( 'email' ) );
	if ( '' === $name || ! is_email( $email ) ) { lbs_admin_back( 0, 'invalid' ); }
	if ( email_exists( $email ) ) { lbs_admin_back( 0, 'exists' ); }

	$login = sanitize_user( strtolower( strstr( $email, '@', true ) ), true );
	$login = $login ? $login : 'member';
	$base  = $login;
	for ( $i = 2; username_exists( $login ); $i++ ) { $login = $base . $i; }
	$parts = preg_split( '/\s+/', $name, 2 );
	$uid   = wp_insert_user( array(
		'user_login'   => $login,
		'user_email'   => $email,
		'user_pass'    => wp_generate_password( 32, true, true ),
		'display_name' => $name,
		'first_name'   => $parts[0],
		'last_name'    => $parts[1] ?? '',
		'role'         => LBS_ROLE,
	) );
	if ( is_wp_error( $uid ) ) { wp_die( esc_html( $uid->get_error_message() ) ); }

	lbs_save_guardian( $uid );
	lbs_assign_folder( $uid, $name );
	if ( lbs_nc_ready() ) { lbs_nc_mkdirs( lbs_member_path( $uid ) ); }
	lbs_calendar_token( $uid );

	$hours = isset( $_POST['hours'] ) ? (float) $_POST['hours'] : 0;
	if ( $hours > 0 ) {
		$date = lbs_post_text( 'date' );
		lbs_add_block( $uid, lbs_valid_date( $date ) ? $date : lbs_today(), $hours, isset( $_POST['price'] ) ? max( 0, (float) $_POST['price'] ) : 0 );
	}
	$flag = 'added';
	if ( ! empty( $_POST['invite'] ) ) { $flag = lbs_send_invite( $uid ) ? 'invited' : 'noinvite'; }
	lbs_admin_back( $uid, $flag );
} );

add_action( 'admin_post_lbs_send_invite', function () {
	$uid = isset( $_POST['member'] ) ? absint( $_POST['member'] ) : 0;
	lbs_admin_guard( 'lbs_send_invite', $uid );
	lbs_admin_back( $uid, lbs_send_invite( $uid ) ? 'invited' : 'noinvite' );
} );

add_action( 'admin_post_lbs_update_member', function () {
	$uid = isset( $_POST['member'] ) ? absint( $_POST['member'] ) : 0;
	lbs_admin_guard( 'lbs_update_member', $uid );
	$name  = lbs_post_text( 'name' );
	$email = sanitize_email( lbs_post_text( 'email' ) );
	if ( '' === $name || ! is_email( $email ) ) { lbs_admin_back( $uid, 'invalid' ); }
	$other = email_exists( $email );
	if ( $other && (int) $other !== $uid ) { lbs_admin_back( $uid, 'exists' ); }
	$folder = lbs_clean_path( lbs_post_text( 'folder' ) );
	if ( '' !== $folder && lbs_folder_taken( $folder, $uid ) ) { lbs_admin_back( $uid, 'folder' ); }
	$parts = preg_split( '/\s+/', $name, 2 );
	wp_update_user( array( 'ID' => $uid, 'display_name' => $name, 'user_email' => $email, 'first_name' => $parts[0], 'last_name' => $parts[1] ?? '' ) );
	update_user_meta( $uid, '_lbs_phone', lbs_post_text( 'phone' ) );
	lbs_save_guardian( $uid );
	if ( '' !== $folder && $folder !== lbs_member_folder( $uid ) ) {
		lbs_audit( $uid, 'Nextcloud folder changed from "' . lbs_member_folder( $uid ) . '" to "' . $folder . '"' );
		update_user_meta( $uid, '_lbs_folder', $folder );
	}
	lbs_admin_back( $uid, 'saved' );
} );

add_action( 'admin_post_lbs_add_block', function () {
	$uid = isset( $_POST['member'] ) ? absint( $_POST['member'] ) : 0;
	lbs_admin_guard( 'lbs_add_block', $uid );
	$hours = isset( $_POST['hours'] ) ? (float) $_POST['hours'] : 0;
	if ( $hours > 0 ) {
		$date = lbs_post_text( 'date' );
		$date = lbs_valid_date( $date ) ? $date : lbs_today();
		$exp  = lbs_post_text( 'expires' );
		lbs_add_block( $uid, $date, $hours, isset( $_POST['price'] ) ? max( 0, (float) $_POST['price'] ) : 0, lbs_valid_date( $exp ) ? $exp : null );
		lbs_audit( $uid, 'Block added: ' . lbs_hm( lbs_minutes( $hours ) ) . ' bought ' . $date );
	}
	lbs_admin_back( $uid, 'block' );
} );

add_action( 'admin_post_lbs_void_block', function () {
	$uid = isset( $_POST['member'] ) ? absint( $_POST['member'] ) : 0;
	lbs_admin_guard( 'lbs_void_block', $uid );
	$id     = sanitize_key( lbs_post_text( 'block' ) );
	$reason = lbs_post_text( 'reason' );
	if ( '' === $reason ) { lbs_admin_back( $uid, 'reason' ); }
	$blocks = lbs_blocks( $uid );
	foreach ( $blocks as &$b ) {
		if ( $b['id'] === $id && empty( $b['void'] ) ) {
			$b['void']        = true;
			$b['void_reason'] = $reason;
			$b['void_at']     = time();
			lbs_audit( $uid, 'Block voided: ' . lbs_block_label( $b ) . ' bought ' . $b['date'] . ' (' . $reason . ')' );
		}
	}
	unset( $b );
	update_user_meta( $uid, '_lbs_blocks', $blocks );
	lbs_admin_back( $uid, 'void' );
} );

add_action( 'admin_post_lbs_adjust', function () {
	$uid = isset( $_POST['member'] ) ? absint( $_POST['member'] ) : 0;
	lbs_admin_guard( 'lbs_adjust', $uid );
	$minutes = lbs_parse_minutes( lbs_post_text( 'amount' ) );
	$note    = lbs_post_text( 'note' );
	$date    = lbs_post_text( 'date' );
	if ( '' === $note || ! $minutes ) { lbs_admin_back( $uid, 'reason' ); }
	$adj   = lbs_adjustments( $uid );
	$me    = wp_get_current_user();
	$adj[] = array( 'id' => lbs_id(), 'date' => lbs_valid_date( $date ) ? $date : lbs_today(), 'minutes' => $minutes, 'note' => $note, 'by' => $me->display_name, 'at' => time() );
	update_user_meta( $uid, '_lbs_adjustments', $adj );
	lbs_audit( $uid, 'Adjustment ' . lbs_hm( $minutes, true ) . ': ' . $note );
	lbs_admin_back( $uid, 'adjusted' );
} );

add_action( 'admin_post_lbs_mark_listened', function () {
	$uid = isset( $_POST['member'] ) ? absint( $_POST['member'] ) : 0;
	lbs_admin_guard( 'lbs_mark_listened', $uid );
	$id = sanitize_key( lbs_post_text( 'rec' ) );
	lbs_pr_update( $uid, 'recordings', function ( $list ) use ( $id ) {
		foreach ( $list as &$r ) { if ( $r['id'] === $id ) { $r['listened'] = true; } }
		unset( $r );
		return $list;
	} );
	lbs_admin_back( $uid, 'listened' );
} );

add_action( 'admin_post_lbs_habit_goal', function () {
	$uid = isset( $_POST['member'] ) ? absint( $_POST['member'] ) : 0;
	lbs_admin_guard( 'lbs_habit_goal', $uid );
	$days = max( 0, min( 7, (int) lbs_post_text( 'days' ) ) );
	$min  = max( 5, min( 180, (int) lbs_post_text( 'min' ) ) );
	lbs_pr_update( $uid, 'habit', function ( $h ) use ( $days, $min ) {
		$h['days'] = $days; $h['min'] = $days ? $min : 0; $h['by'] = 'jack'; $h['set'] = lbs_today();
		return $h;
	} );
	if ( $days ) { lbs_pr_update( $uid, 'tools', function ( $t ) { $t['habit'] = true; return $t; } ); }
	lbs_admin_back( $uid, 'habit' );
} );

add_action( 'admin_post_lbs_add_track', function () {
	$uid = isset( $_POST['member'] ) ? absint( $_POST['member'] ) : 0;
	lbs_admin_guard( 'lbs_add_track', $uid );
	lbs_add_track( $uid, lbs_post_text( 'title' ), lbs_post_text( 'artist' ), lbs_post_text( 'note' ), 'jack' );
	lbs_admin_back( $uid, 'track' );
} );

add_action( 'admin_post_lbs_toggle_access', function () {
	$uid = isset( $_POST['member'] ) ? absint( $_POST['member'] ) : 0;
	lbs_admin_guard( 'lbs_toggle_access', $uid );
	if ( lbs_member_disabled( $uid ) ) {
		delete_user_meta( $uid, '_lbs_disabled' );
		lbs_audit( $uid, 'Portal access switched on' );
	} else {
		lbs_revoke_access( $uid );
		lbs_audit( $uid, 'Portal access switched off (sessions ended, links cancelled)' );
	}
	lbs_admin_back( $uid, 'access' );
} );

/* -------------------------------------------------------------------------
 * Email log
 * ---------------------------------------------------------------------- */

function lbs_email_log_page() {
	if ( ! current_user_can( 'manage_options' ) ) { return; }
	$log   = get_option( 'lbs_mail_log', array() );
	$queue = get_option( 'lbs_mail_queue', array() );
	?>
	<div class="wrap lbs-admin">
		<h1>Email log</h1>
		<?php lbs_admin_notice_from_query(); ?>
		<p>Every email the portal tries to send. "Sent" means the site handed it to its mail service; it can't confirm delivery. Failed emails are retried three times, an hour or more apart. If you see failures, an SMTP plugin usually fixes them, and fixes the contact form too.</p>
		<?php if ( $queue ) : ?>
			<h2>Waiting or failed</h2>
			<table class="widefat striped"><thead><tr><th>To</th><th>Subject</th><th>Tries</th><th>Error</th><th></th></tr></thead><tbody>
			<?php foreach ( $queue as $id => $q ) : ?>
				<tr><td><?php echo esc_html( $q['to'] ); ?></td><td><?php echo esc_html( $q['subject'] ); ?></td><td><?php echo (int) $q['attempts']; ?><?php echo ! empty( $q['next_at'] ) ? '<br><span class="description">next ' . esc_html( wp_date( 'j M H:i', $q['next_at'] ) ) . '</span>' : ''; ?></td><td><?php echo esc_html( $q['error'] ?? '' ); ?></td>
				<td><?php lbs_mail_button( 'retry', $id, 'Try again' ); ?> <?php lbs_mail_button( 'discard', $id, 'Discard', 'button-link lbs-danger' ); ?></td></tr>
			<?php endforeach; ?>
			</tbody></table>
		<?php endif; ?>
		<h2>Recent</h2>
		<?php if ( $log ) : ?>
			<table class="widefat striped"><thead><tr><th>When</th><th>To</th><th>Subject</th><th>Result</th></tr></thead><tbody>
			<?php foreach ( array_slice( $log, 0, 100 ) as $l ) : ?>
				<tr><td><?php echo esc_html( wp_date( 'j M Y, H:i', $l['at'] ) ); ?></td><td><?php echo esc_html( $l['to'] ); ?></td><td><?php echo esc_html( $l['subject'] ); ?></td><td><span class="lbs-pill lbs-pill-<?php echo 'sent' === $l['status'] ? 'active' : ( 'queued' === $l['status'] ? 'invited' : 'off' ); ?>"><?php echo esc_html( ucfirst( $l['status'] ) ); ?></span><?php echo $l['error'] ? '<br><span class="description">' . esc_html( $l['error'] ) . '</span>' : ''; ?></td></tr>
			<?php endforeach; ?>
			</tbody></table>
		<?php else : ?>
			<p class="description">Nothing sent yet.</p>
		<?php endif; ?>
	</div>
	<?php
}

function lbs_mail_button( $do, $id, $label, $class = 'button button-small' ) {
	echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" class="lbs-inline-form"><input type="hidden" name="action" value="lbs_mail_' . esc_attr( $do ) . '"><input type="hidden" name="id" value="' . esc_attr( $id ) . '">';
	wp_nonce_field( 'lbs_mail_' . $do );
	echo '<button class="' . esc_attr( $class ) . '">' . esc_html( $label ) . '</button></form>';
}

add_action( 'admin_post_lbs_mail_retry', function () {
	lbs_admin_guard( 'lbs_mail_retry' );
	lbs_mail_retry_queue( sanitize_key( lbs_post_text( 'id' ) ) );
	wp_safe_redirect( admin_url( 'admin.php?page=lbs-email-log&lbs=retried' ) );
	exit;
} );

add_action( 'admin_post_lbs_mail_discard', function () {
	lbs_admin_guard( 'lbs_mail_discard' );
	$queue = get_option( 'lbs_mail_queue', array() );
	unset( $queue[ sanitize_key( lbs_post_text( 'id' ) ) ] );
	update_option( 'lbs_mail_queue', $queue, false );
	wp_safe_redirect( admin_url( 'admin.php?page=lbs-email-log' ) );
	exit;
} );

/* -------------------------------------------------------------------------
 * Portal settings
 * ---------------------------------------------------------------------- */

function lbs_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) { return; }
	$s      = lbs_settings();
	$locked = defined( 'LBS_NEXTCLOUD_URL' ) || defined( 'LBS_NEXTCLOUD_USER' ) || defined( 'LBS_NEXTCLOUD_PASSWORD' );
	?>
	<div class="wrap lbs-admin">
		<h1>Portal settings</h1>
		<?php lbs_admin_notice_from_query(); ?>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="lbs_save_settings">
			<?php wp_nonce_field( 'lbs_save_settings' ); ?>

			<h2>Your own app</h2>
			<table class="form-table" role="presentation">
				<tr><th scope="row">Use the app as yourself</th><td><label><input type="checkbox" name="self" value="1" <?php checked( lbs_admin_self() ); ?>> Open <a href="<?php echo esc_url( lbs_portal_url() ); ?>">/members/</a> as a member would, with your own Shed and your own record in every room, and every room open whether it has been launched or not.</label><p class="description">For trying things before members see them. It applies to your account only, and you are not added to the members list. To see a member's portal instead, use Preview their portal on their page.</p></td></tr>
			</table>

			<h2>The portal</h2>
			<table class="form-table" role="presentation">
				<tr><th scope="row">Address</th><td><a href="<?php echo esc_url( lbs_portal_url() ); ?>" target="_blank" rel="noopener"><?php echo esc_html( lbs_portal_url() ); ?></a><p class="description">Members sign in here, and add it to their home screen as an app. It's hidden from search engines.</p></td></tr>
				<tr><th scope="row">Navigation</th><td><label><input type="checkbox" name="nav" value="1" <?php checked( $s['nav'] ); ?>> Show "Members" in the site navigation</label></td></tr>
			</table>

			<h2>Lesson credit and recordings</h2>
			<table class="form-table" role="presentation">
				<tr><th scope="row"><label for="lbs-months">Blocks expire after</label></th><td><select id="lbs-months" name="block_months"><?php foreach ( array( 0, 2, 3, 4, 6, 9, 12 ) as $mo ) : ?><option value="<?php echo (int) $mo; ?>" <?php selected( (int) $s['block_months'], $mo ); ?>><?php echo $mo ? (int) $mo . ' months' : 'Never'; ?></option><?php endforeach; ?></select><p class="description">Applies to blocks added from now on. Each block's expiry can be set individually on the member's page.</p></td></tr>
				<tr><th scope="row"><label for="lbs-upmb">Largest recording</label></th><td><input type="number" min="10" max="2048" id="lbs-upmb" name="upload_mb" value="<?php echo (int) $s['upload_mb']; ?>" class="small-text"> MB <p class="description">Your server currently accepts uploads up to <?php echo esc_html( size_format( wp_max_upload_size() ) ); ?>; the smaller of the two applies.</p></td></tr>
				<tr><th scope="row"><label for="lbs-quota">Recording space per member</label></th><td><input type="number" min="100" max="102400" id="lbs-quota" name="quota_mb" value="<?php echo (int) $s['quota_mb']; ?>" class="small-text"> MB</td></tr>
			</table>

			<h2>Nextcloud</h2>
			<p>Create an app password in Nextcloud under <em>Personal settings → Security → Devices &amp; sessions</em>, then paste it here.</p>
			<?php if ( ! lbs_nc_can_encrypt() && ! defined( 'LBS_NEXTCLOUD_PASSWORD' ) ) : ?><div class="notice notice-error inline"><p>This server can't encrypt the app password, so it won't be stored here. Add <code>LBS_NEXTCLOUD_PASSWORD</code> to wp-config.php instead (see below).</p></div><?php endif; ?>
			<?php if ( $locked ) : ?><p><strong>Some of these are set in wp-config.php and can't be changed here.</strong></p><?php endif; ?>
			<table class="form-table" role="presentation">
				<tr><th scope="row"><label for="lbs-nc-url">Server address</label></th><td><input type="url" class="regular-text" id="lbs-nc-url" name="nc_url" value="<?php echo esc_attr( defined( 'LBS_NEXTCLOUD_URL' ) ? LBS_NEXTCLOUD_URL : $s['nc_url'] ); ?>" placeholder="https://cloud.example.com" <?php disabled( defined( 'LBS_NEXTCLOUD_URL' ) ); ?>></td></tr>
				<tr><th scope="row"><label for="lbs-nc-user">Username</label></th><td><input type="text" class="regular-text" id="lbs-nc-user" name="nc_user" value="<?php echo esc_attr( defined( 'LBS_NEXTCLOUD_USER' ) ? LBS_NEXTCLOUD_USER : $s['nc_user'] ); ?>" autocomplete="off" <?php disabled( defined( 'LBS_NEXTCLOUD_USER' ) ); ?>></td></tr>
				<tr><th scope="row"><label for="lbs-nc-pass">App password</label></th><td><input type="password" class="regular-text" id="lbs-nc-pass" name="nc_pass" value="" autocomplete="new-password" placeholder="<?php echo ( $s['nc_pass'] || defined( 'LBS_NEXTCLOUD_PASSWORD' ) ) ? 'Saved. Leave blank to keep it.' : ''; ?>" <?php disabled( defined( 'LBS_NEXTCLOUD_PASSWORD' ) ); ?>><p class="description">Stored encrypted. To keep it out of the database entirely, define <code>LBS_NEXTCLOUD_URL</code>, <code>LBS_NEXTCLOUD_USER</code> and <code>LBS_NEXTCLOUD_PASSWORD</code> in wp-config.php.</p></td></tr>
				<tr><th scope="row"><label for="lbs-nc-root">Members folder</label></th><td><input type="text" class="regular-text" id="lbs-nc-root" name="nc_root" value="<?php echo esc_attr( $s['nc_root'] ); ?>"><p class="description">Each member gets their own folder inside this. Recordings they send go in a Recordings folder inside theirs.</p></td></tr>
				<tr><th scope="row"><label for="lbs-lib-root">Library folder (all members)</label></th><td><input type="text" class="regular-text" id="lbs-lib-root" name="library_root" value="<?php echo esc_attr( $s['library_root'] ); ?>"><p class="description">Backing tracks, drones, course material and transcriptions for everyone, shown on the Shelf in the Shed. <a href="#shelf">See what's there</a>.</p></td></tr>
				<tr><th scope="row"><label for="lbs-he-root">Harmonic Elements folder</label></th><td><input type="text" class="regular-text" id="lbs-he-root" name="he_root" value="<?php echo esc_attr( $s['he_root'] ); ?>" placeholder="<?php echo esc_attr( lbs_he_default_root() ); ?>"><p class="description">The chord and drum loops for the ear trainer. Leave it blank to use <code><?php echo esc_html( lbs_he_default_root() ); ?></code>, beside the Members folder. <a href="#harmonic">See what's there</a>.</p></td></tr>
			</table>

			<h2>Harmonic Elements ear trainer</h2>
			<table class="form-table" role="presentation">
				<tr><th scope="row">Recorded loops are for</th><td>
					<fieldset>
						<label><input type="radio" name="he_open" value="members" <?php checked( 'members', lbs_he_open() ); ?>> Members only. Anyone else who opens the trainer hears the house band (the app&rsquo;s own instruments and drum kits), and is pointed to the member sign in.</label><br>
						<label><input type="radio" name="he_open" value="everyone" <?php checked( 'everyone', lbs_he_open() ); ?>> Everyone. Any visitor hears your recordings, passed through from Nextcloud.</label>
					</fieldset>
					<p class="description">Either way a signed-in member's record is kept with their account, and you only see it if they switch sharing on.</p>
				</td></tr>
			</table>

			<h2>Emails</h2>
			<table class="form-table" role="presentation">
				<tr><th scope="row"><label for="lbs-jack">Send portal notifications to</label></th><td><input type="email" class="regular-text" id="lbs-jack" name="jack_email" value="<?php echo esc_attr( $s['jack_email'] ); ?>" placeholder="<?php echo esc_attr( lbs_jack_email() ); ?>"><p class="description">Move and session requests, recordings, credit running low, data requests and your morning prep.</p></td></tr>
				<tr><th scope="row"><label for="lbs-hour">Morning emails go out at</label></th><td><select id="lbs-hour" name="reminder_hour"><?php for ( $h = 5; $h <= 11; $h++ ) : ?><option value="<?php echo (int) $h; ?>" <?php selected( (int) $s['reminder_hour'], $h ); ?>><?php echo esc_html( sprintf( '%02d:00', $h ) ); ?></option><?php endfor; ?></select><p class="description">Session-day reminders, practice nudges and your prep digest, on the first site visit after this hour.</p></td></tr>
				<tr><th scope="row">Prep digest</th><td><label><input type="checkbox" name="digest" value="1" <?php checked( $s['digest'] ); ?>> Email me each member's questions and practice on session days</label></td></tr>
			</table>
			<?php submit_button( 'Save settings' ); ?>
		</form>

		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="lbs-inline-form">
			<input type="hidden" name="action" value="lbs_test_nc">
			<?php wp_nonce_field( 'lbs_test_nc' ); ?>
			<button type="submit" class="button">Test the Nextcloud connection</button>
		</form>

		<?php lbs_library_admin_box(); ?>

		<?php lbs_he_admin_box(); ?>

		<h2 id="template">Session notes template</h2>
		<p>Write notes in this format in any notes app, then paste them into <strong>Paste your notes</strong> at the top of <a href="<?php echo esc_url( admin_url( 'post-new.php?post_type=' . LBS_CPT ) ); ?>">Add session</a>. Every line is optional except Member.</p>
		<p><a class="button" href="<?php echo esc_url( LBS_URL . 'assets/session-notes-template.txt' ); ?>" download>Download the template</a></p>
		<textarea class="large-text code" rows="18" readonly><?php echo esc_textarea( lbs_proforma_blank() ); ?></textarea>

		<h2>Privacy notice</h2>
		<p>Suggested wording for your Privacy page is under <a href="<?php echo esc_url( admin_url( 'options-privacy.php?tab=policyguide' ) ); ?>">Settings → Privacy → Policy guide</a>. Check the retention period suits you before publishing it.</p>
	</div>
	<?php
}

add_action( 'admin_post_lbs_save_settings', function () {
	lbs_admin_guard( 'lbs_save_settings' );
	$old  = lbs_settings();
	$in   = wp_unslash( $_POST );
	$pass = isset( $in['nc_pass'] ) ? trim( $in['nc_pass'] ) : '';
	$enc  = '' !== $pass ? lbs_nc_encrypt( $pass ) : $old['nc_pass'];
	$new  = array(
		'nav'           => empty( $in['nav'] ) ? 0 : 1,
		'nc_url'        => isset( $in['nc_url'] ) ? esc_url_raw( untrailingslashit( trim( $in['nc_url'] ) ) ) : $old['nc_url'],
		'nc_user'       => isset( $in['nc_user'] ) ? sanitize_text_field( $in['nc_user'] ) : $old['nc_user'],
		'nc_pass'       => $enc,
		'nc_root'       => '/' . lbs_clean_path( isset( $in['nc_root'] ) ? sanitize_text_field( $in['nc_root'] ) : $old['nc_root'] ),
		'library_root'  => '/' . lbs_clean_path( isset( $in['library_root'] ) && '' !== trim( $in['library_root'] ) ? sanitize_text_field( $in['library_root'] ) : $old['library_root'] ),
		'he_root'       => isset( $in['he_root'] ) ? ( '' !== lbs_clean_path( sanitize_text_field( $in['he_root'] ) ) ? '/' . lbs_clean_path( sanitize_text_field( $in['he_root'] ) ) : '' ) : $old['he_root'],
		'he_open'       => isset( $in['he_open'] ) ? ( 'everyone' === $in['he_open'] ? 'everyone' : 'members' ) : $old['he_open'],
		'jack_email'    => isset( $in['jack_email'] ) ? sanitize_email( $in['jack_email'] ) : '',
		'reminder_hour' => isset( $in['reminder_hour'] ) ? max( 5, min( 11, (int) $in['reminder_hour'] ) ) : 7,
		'digest'        => empty( $in['digest'] ) ? 0 : 1,
		'block_months'  => isset( $in['block_months'] ) ? max( 0, min( 24, (int) $in['block_months'] ) ) : 4,
		'upload_mb'     => isset( $in['upload_mb'] ) ? max( 10, min( 2048, (int) $in['upload_mb'] ) ) : 200,
		'quota_mb'      => isset( $in['quota_mb'] ) ? max( 100, min( 102400, (int) $in['quota_mb'] ) ) : 2048,
	);
	update_option( 'lbs_portal_settings', $new, false );
	if ( empty( $in['self'] ) ) { delete_user_meta( get_current_user_id(), '_lbs_self' ); } else { update_user_meta( get_current_user_id(), '_lbs_self', 1 ); }
	$flag = ( '' !== $pass && '' === $enc ) ? array( 'lbs_msg' => rawurlencode( 'Settings saved, but the app password wasn\'t: this server can\'t encrypt it. Put it in wp-config.php instead.' ) ) : array( 'lbs' => 'saved' );
	wp_safe_redirect( add_query_arg( $flag, admin_url( 'admin.php?page=lbs-portal-settings' ) ) );
	exit;
} );

add_action( 'admin_post_lbs_test_nc', function () {
	lbs_admin_guard( 'lbs_test_nc' );
	$r    = lbs_nc_test();
	$args = is_wp_error( $r ) ? array( 'lbs_msg' => rawurlencode( $r->get_error_message() ) ) : array( 'lbs_msg' => rawurlencode( $r ), 'lbs_ok' => 1 );
	wp_safe_redirect( add_query_arg( $args, admin_url( 'admin.php?page=lbs-portal-settings' ) ) );
	exit;
} );

/* -------------------------------------------------------------------------
 * Dashboard widget
 * ---------------------------------------------------------------------- */

add_action( 'wp_dashboard_setup', function () {
	if ( ! current_user_can( 'manage_options' ) ) { return; }
	wp_add_dashboard_widget( 'lbs_today', 'Sessions today and tomorrow', function () {
		$today    = lbs_today();
		$tomorrow = wp_date( 'Y-m-d', time() + DAY_IN_SECONDS );
		$rows     = array();
		foreach ( lbs_members() as $m ) {
			foreach ( lbs_upcoming( $m->ID ) as $s ) {
				if ( $s['date'] === $today || $s['date'] === $tomorrow ) { $rows[] = array( $s, $m ); }
			}
		}
		usort( $rows, function ( $a, $b ) { return strcmp( $a[0]['date'] . $a[0]['start'], $b[0]['date'] . $b[0]['start'] ); } );
		$failed = count( array_filter( (array) get_option( 'lbs_mail_queue', array() ), function ( $q ) { return empty( $q['next_at'] ); } ) );
		if ( $failed ) { echo '<p class="lbs-warn">' . (int) $failed . ' portal email' . ( 1 === $failed ? '' : 's' ) . ' failed. <a href="' . esc_url( admin_url( 'admin.php?page=lbs-email-log' ) ) . '">Email log</a></p>'; }
		if ( ! $rows ) {
			echo '<p>Nothing booked for today or tomorrow. <a href="' . esc_url( admin_url( 'post-new.php?post_type=' . LBS_CPT ) ) . '">Add a session</a></p>';
			return;
		}
		echo '<ul class="lbs-dash">';
		foreach ( $rows as $r ) {
			list( $s, $m ) = $r;
			$q = count( lbs_open_questions( $m->ID ) );
			echo '<li><strong>' . esc_html( ( $s['date'] === $today ? 'Today' : 'Tomorrow' ) . ( $s['start'] ? ' ' . $s['start'] : '' ) ) . '</strong> · <a href="' . esc_url( admin_url( 'admin.php?page=lbs-members&member=' . $m->ID ) ) . '">' . esc_html( $m->display_name ) . '</a>'
				. ( lbs_booking_confirmed( $s ) ? '' : ' · provisional' )
				. ( $q ? ' · ' . (int) $q . ' question' . ( 1 === $q ? '' : 's' ) : '' )
				. ( $s['move'] ? ' · <span class="lbs-flag">move requested</span>' : '' )
				. ' · <a href="' . esc_url( get_edit_post_link( $s['id'] ) ) . '">Add notes</a></li>';
		}
		echo '</ul>';
	} );
} );
