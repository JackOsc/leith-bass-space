<?php
/**
 * Members → Calendar sync: connect Google Calendar, choose the calendar, and
 * deal with anything the sync couldn't decide on its own.
 *
 * @package LeithBassMembers
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

add_action( 'admin_menu', function () {
	add_submenu_page( 'lbs-members', 'Calendar sync', 'Calendar sync', 'manage_options', 'lbs-calendar', 'lbs_gcal_page' );
}, 12 );

function lbs_gcal_back( $flag, $extra = array() ) {
	wp_safe_redirect( add_query_arg( array_merge( array( 'page' => 'lbs-calendar', 'lbs' => $flag ), $extra ), admin_url( 'admin.php' ) ) );
	exit;
}

function lbs_gcal_notice() {
	$flags = array(
		'client'       => array( 'success', 'Saved. Now connect your Google account.' ),
		'connected'    => array( 'success', 'Connected. Choose which calendar the bookings go into.' ),
		'denied'       => array( 'error', 'Google didn\'t connect. Try again, and choose Allow on Google\'s screen.' ),
		'badstate'     => array( 'error', 'That connection attempt had expired. Try again.' ),
		'failed'       => array( 'error', 'Google didn\'t connect.' ),
		'disconnected' => array( 'success', 'Disconnected. Bookings already in Google stay there.' ),
		'calendar'     => array( 'success', 'Calendar chosen. Upcoming bookings have been added to it.' ),
		'synced'       => array( 'success', 'Synced.' ),
		'booked'       => array( 'success', 'Booking made. It\'s linked to the Google event, so moves on either side keep them together.' ),
		'ignored'      => array( 'success', 'Ignored. It won\'t be suggested again.' ),
		'putback'      => array( 'success', 'Put back in Google Calendar.' ),
	);
	$f = isset( $_GET['lbs'] ) ? sanitize_key( $_GET['lbs'] ) : '';
	if ( ! isset( $flags[ $f ] ) ) { return; }
	$msg = $flags[ $f ][1];
	if ( isset( $_GET['msg'] ) ) { $msg .= ' ' . sanitize_text_field( wp_unslash( $_GET['msg'] ) ); }
	echo '<div class="notice notice-' . esc_attr( $flags[ $f ][0] ) . ' is-dismissible"><p>' . esc_html( $msg ) . '</p></div>';
}

function lbs_gcal_page() {
	if ( ! current_user_can( 'manage_options' ) ) { return; }
	$o      = lbs_gcal_opt();
	$client = lbs_gcal_client();
	$locked = defined( 'LBS_GOOGLE_CLIENT_ID' );
	$form   = function ( $action, $inner, $class = 'lbs-inline-form' ) {
		return '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" class="' . esc_attr( $class ) . '"><input type="hidden" name="action" value="' . esc_attr( $action ) . '">' . wp_nonce_field( $action, '_wpnonce', true, false ) . $inner . '</form>';
	};
	?>
	<div class="wrap lbs-admin">
		<h1>Calendar sync</h1>
		<?php lbs_gcal_notice(); ?>
		<p class="description" style="max-width:48rem">Bookings go into your Google Calendar and follow it when they move, are cancelled or deleted. Moves you make in Google come back to the portal every 15 minutes, and the member is emailed as usual. Whichever side changed last wins, and each booking keeps a history of what the sync did.</p>

		<section class="lbs-card" style="max-width:52rem">
			<h2>1. Your Google OAuth client</h2>
			<p>In <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener">Google Cloud → Credentials</a>, turn on the Google Calendar API, then create an <strong>OAuth client ID</strong> of type <strong>Web application</strong> with this redirect URI:</p>
			<p><code><?php echo esc_html( lbs_gcal_redirect() ); ?></code></p>
			<p class="description">While the app is in testing, add your own Google account as a test user on the OAuth consent screen. It only needs your calendar, and only you ever sign in to it.</p>
			<?php
			echo $form( 'lbs_gcal_client', // phpcs:ignore -- built from escaped parts.
				'<p><label for="lbs-g-id">Client ID</label><br><input type="text" class="large-text" id="lbs-g-id" name="client_id" value="' . esc_attr( $client['id'] ) . '"' . disabled( $locked, true, false ) . '></p>' .
				'<p><label for="lbs-g-secret">Client secret</label><br><input type="password" class="regular-text" id="lbs-g-secret" name="client_secret" autocomplete="new-password" placeholder="' . ( $client['secret'] ? 'Saved. Leave blank to keep it.' : '' ) . '"' . disabled( $locked, true, false ) . '></p>' .
				( $locked ? '<p class="description">Set in wp-config.php.</p>' : get_submit_button( 'Save client', 'secondary', 'submit', false ) ), 'lbs-form' );
			?>
		</section>

		<section class="lbs-card" style="max-width:52rem">
			<h2>2. Connect</h2>
			<?php if ( lbs_gcal_connected() ) : ?>
				<p>Connected<?php echo $o['email'] ? ' as <strong>' . esc_html( $o['email'] ) . '</strong>' : ''; ?>.</p>
				<?php echo $form( 'lbs_gcal_disconnect', get_submit_button( 'Disconnect', 'secondary', 'submit', false ) ); // phpcs:ignore ?>
			<?php elseif ( $client['id'] && $client['secret'] ) : ?>
				<p><a class="button button-primary" href="<?php echo esc_url( lbs_gcal_auth_url() ); ?>">Connect Google Calendar</a></p>
			<?php else : ?>
				<p class="description">Save the client ID and secret first.</p>
			<?php endif; ?>
			<?php if ( $o['last_error'] ) : ?><p class="lbs-off" style="color:#b32d2e"><?php echo esc_html( $o['last_error'] ); ?></p><?php endif; ?>
		</section>

		<?php if ( lbs_gcal_connected() ) : ?>
		<section class="lbs-card" style="max-width:52rem">
			<h2>3. Which calendar</h2>
			<?php
			$cals = lbs_gcal_calendars();
			if ( is_wp_error( $cals ) ) {
				echo '<p style="color:#b32d2e">' . esc_html( $cals->get_error_message() ) . '</p>';
			} else {
				$opts = '';
				foreach ( $cals as $id => $name ) { $opts .= '<option value="' . esc_attr( $id ) . '"' . selected( $o['calendar'], $id, false ) . '>' . esc_html( $name ) . '</option>'; }
				echo $form( 'lbs_gcal_calendar', '<p><select name="calendar"><option value="">Choose…</option>' . $opts . '</select> ' . get_submit_button( $o['calendar'] ? 'Change calendar' : 'Use this calendar', 'primary', 'submit', false ) . '</p><p class="description">A calendar of its own (say, "Bass sessions") keeps them easy to show or hide. Changing it adds all upcoming bookings to the new one.</p>', 'lbs-form' ); // phpcs:ignore
			}
			?>
		</section>
		<?php endif; ?>

		<?php if ( lbs_gcal_ready() ) : ?>
		<section class="lbs-card" style="max-width:52rem">
			<h2>Sync</h2>
			<p><?php echo $o['last_sync'] ? 'Last synced ' . esc_html( human_time_diff( $o['last_sync'] ) ) . ' ago.' : 'Not synced yet.'; ?> It runs every 15 minutes on its own.</p>
			<?php echo $form( 'lbs_gcal_sync_now', get_submit_button( 'Sync now', 'secondary', 'submit', false ) ); // phpcs:ignore ?>
		</section>

		<?php
		$att = array_filter( $o['attention'], function ( $v, $k ) { return LBS_CPT === get_post_type( $k ); }, ARRAY_FILTER_USE_BOTH );
		if ( $att ) :
			?>
		<section class="lbs-card" style="max-width:52rem">
			<h2>Needs a look</h2>
			<p class="description">These were deleted in Google Calendar. They haven't been cancelled here, because that changes lesson credit.</p>
			<table class="widefat striped"><tbody>
			<?php foreach ( $att as $sid => $why ) : $s = lbs_session( $sid ); $u = get_userdata( $s['member'] ); ?>
				<tr><td><strong><?php echo esc_html( $u ? $u->display_name : 'Member' ); ?></strong>, <?php echo esc_html( lbs_when( $s ) ); ?></td>
				<td style="text-align:right"><a class="button" href="<?php echo esc_url( get_edit_post_link( $sid ) ); ?>">Open to cancel it</a>
				<?php echo $form( 'lbs_gcal_putback', '<input type="hidden" name="session" value="' . (int) $sid . '">' . get_submit_button( 'Put back in Google', 'secondary', 'submit', false ) ); // phpcs:ignore ?></td></tr>
			<?php endforeach; ?>
			</tbody></table>
		</section>
		<?php endif; ?>

		<?php
		$inbox = $o['inbox'];
		uasort( $inbox, function ( $a, $b ) { return strcmp( $a['date'] . $a['start'], $b['date'] . $b['start'] ); } );
		if ( $inbox ) :
			$members = lbs_members();
			?>
		<section class="lbs-card" style="max-width:52rem">
			<h2>From Google</h2>
			<p class="description">Events you made in Google that look like sessions. Make one a booking and it's linked from then on. (Events with a member as a guest become draft bookings on their own, under Sessions.)</p>
			<table class="widefat striped"><tbody>
			<?php foreach ( $inbox as $gid => $it ) : ?>
				<tr><td><strong><?php echo esc_html( $it['summary'] ? $it['summary'] : '(no title)' ); ?></strong><br><?php echo esc_html( wp_date( 'D j M', lbs_dt( $it['date'] )->getTimestamp() ) . ( $it['start'] ? ', ' . $it['start'] : '' ) ); ?></td>
				<td style="text-align:right">
					<?php
					$sel = '<select name="member">';
					foreach ( $members as $m ) { $sel .= '<option value="' . (int) $m->ID . '"' . selected( (int) $it['member'], $m->ID, false ) . '>' . esc_html( $m->display_name ) . '</option>'; }
					$sel .= '</select> ';
					echo $form( 'lbs_gcal_inbox_book', '<input type="hidden" name="event" value="' . esc_attr( $gid ) . '">' . $sel . get_submit_button( 'Make it a booking', 'primary', 'submit', false ) ); // phpcs:ignore
					echo $form( 'lbs_gcal_inbox_ignore', '<input type="hidden" name="event" value="' . esc_attr( $gid ) . '">' . get_submit_button( 'Ignore', 'link', 'submit', false ) ); // phpcs:ignore
					?>
				</td></tr>
			<?php endforeach; ?>
			</tbody></table>
		</section>
		<?php endif; ?>
		<?php endif; ?>
	</div>
	<?php
}

function lbs_gcal_guard( $action ) {
	if ( ! current_user_can( 'manage_options' ) ) { wp_die( 'You do not have permission to do that.' ); }
	check_admin_referer( $action );
}

add_action( 'admin_post_lbs_gcal_client', function () {
	lbs_gcal_guard( 'lbs_gcal_client' );
	if ( defined( 'LBS_GOOGLE_CLIENT_ID' ) ) { lbs_gcal_back( 'client' ); }
	$o      = lbs_gcal_opt();
	$id     = trim( sanitize_text_field( wp_unslash( $_POST['client_id'] ?? '' ) ) );
	$secret = trim( (string) wp_unslash( $_POST['client_secret'] ?? '' ) );
	lbs_gcal_save( array( 'client_id' => $id, 'client_secret' => '' !== $secret ? lbs_nc_encrypt( $secret ) : $o['client_secret'] ) );
	lbs_gcal_back( 'client' );
} );

add_action( 'admin_post_lbs_gcal_callback', function () {
	if ( ! current_user_can( 'manage_options' ) ) { wp_die( 'You do not have permission to do that.' ); }
	if ( ! empty( $_GET['error'] ) ) { lbs_gcal_back( 'denied' ); }
	$state = sanitize_text_field( wp_unslash( $_GET['state'] ?? '' ) );
	$want  = get_transient( 'lbs_gcal_state_' . get_current_user_id() );
	delete_transient( 'lbs_gcal_state_' . get_current_user_id() );
	if ( ! $want || ! hash_equals( (string) $want, $state ) ) { lbs_gcal_back( 'badstate' ); }
	$r = lbs_gcal_exchange_code( sanitize_text_field( wp_unslash( $_GET['code'] ?? '' ) ) );
	if ( is_wp_error( $r ) ) { lbs_gcal_back( 'failed', array( 'msg' => $r->get_error_message() ) ); }
	lbs_gcal_back( 'connected' );
} );

add_action( 'admin_post_lbs_gcal_disconnect', function () {
	lbs_gcal_guard( 'lbs_gcal_disconnect' );
	$refresh = lbs_nc_decrypt( lbs_gcal_opt()['refresh'] );
	if ( $refresh ) { wp_remote_post( apply_filters( 'lbs_gcal_revoke_url', 'https://oauth2.googleapis.com/revoke' ), array( 'timeout' => 10, 'body' => array( 'token' => $refresh ) ) ); }
	delete_transient( 'lbs_gcal_access' );
	lbs_gcal_save( array( 'refresh' => '', 'calendar' => '', 'calendar_name' => '', 'sync_token' => '', 'email' => '' ) );
	wp_clear_scheduled_hook( 'lbs_gcal_cron' );
	lbs_gcal_back( 'disconnected' );
} );

add_action( 'admin_post_lbs_gcal_calendar', function () {
	lbs_gcal_guard( 'lbs_gcal_calendar' );
	$cal = sanitize_text_field( wp_unslash( $_POST['calendar'] ?? '' ) );
	if ( '' === $cal ) { lbs_gcal_back( 'failed', array( 'msg' => 'Choose a calendar.' ) ); }
	$changed = lbs_gcal_opt()['calendar'] !== $cal;
	lbs_gcal_save( array( 'calendar' => $cal, 'sync_token' => $changed ? '' : lbs_gcal_opt()['sync_token'], 'inbox' => $changed ? array() : lbs_gcal_opt()['inbox'] ) );
	if ( $changed ) { lbs_gcal_push_all_upcoming(); }
	$r = lbs_gcal_sync();
	lbs_gcal_back( 'calendar', is_wp_error( $r ) ? array( 'msg' => $r->get_error_message() ) : array() );
} );

add_action( 'admin_post_lbs_gcal_sync_now', function () {
	lbs_gcal_guard( 'lbs_gcal_sync_now' );
	$r = lbs_gcal_sync();
	if ( is_wp_error( $r ) ) { lbs_gcal_back( 'failed', array( 'msg' => $r->get_error_message() ) ); }
	$bits = array();
	if ( $r['pushed'] ) { $bits[] = $r['pushed'] . ' sent to Google'; }
	if ( $r['moved'] ) { $bits[] = $r['moved'] . ' moved from Google'; }
	if ( $r['drafts'] ) { $bits[] = $r['drafts'] . ' new draft booking' . ( 1 === $r['drafts'] ? '' : 's' ); }
	if ( $r['flagged'] ) { $bits[] = $r['flagged'] . ' deleted in Google (see below)'; }
	lbs_gcal_back( 'synced', array( 'msg' => $bits ? implode( ', ', $bits ) . '.' : 'Nothing had changed.' ) );
} );

add_action( 'admin_post_lbs_gcal_putback', function () {
	lbs_gcal_guard( 'lbs_gcal_putback' );
	$sid = absint( $_POST['session'] ?? 0 );
	delete_post_meta( $sid, '_lbs_gcal_id' );
	$r = lbs_gcal_push( $sid );
	lbs_gcal_back( is_wp_error( $r ) ? 'failed' : 'putback', is_wp_error( $r ) ? array( 'msg' => $r->get_error_message() ) : array() );
} );

add_action( 'admin_post_lbs_gcal_inbox_book', function () {
	lbs_gcal_guard( 'lbs_gcal_inbox_book' );
	$gid   = sanitize_text_field( wp_unslash( $_POST['event'] ?? '' ) );
	$inbox = lbs_gcal_opt()['inbox'];
	if ( ! isset( $inbox[ $gid ] ) ) { lbs_gcal_back( 'failed', array( 'msg' => 'That event has gone from the list.' ) ); }
	$id = lbs_gcal_make_booking( $inbox[ $gid ]['event'], absint( $_POST['member'] ?? 0 ), true );
	unset( $inbox[ $gid ] );
	lbs_gcal_save( array( 'inbox' => $inbox ) );
	if ( ! $id ) { lbs_gcal_back( 'failed', array( 'msg' => 'The booking couldn\'t be made.' ) ); }
	wp_safe_redirect( add_query_arg( 'lbs_gcal', 'booked', get_edit_post_link( $id, 'raw' ) ) );
	exit;
} );

add_action( 'admin_post_lbs_gcal_inbox_ignore', function () {
	lbs_gcal_guard( 'lbs_gcal_inbox_ignore' );
	$gid = sanitize_text_field( wp_unslash( $_POST['event'] ?? '' ) );
	$o   = lbs_gcal_opt();
	unset( $o['inbox'][ $gid ] );
	lbs_gcal_save( array( 'inbox' => $o['inbox'], 'ignored' => array_slice( array_merge( $o['ignored'], array( $gid ) ), -300 ) ) );
	lbs_gcal_back( 'ignored' );
} );

/* The sync history on each booking. */
add_action( 'add_meta_boxes_' . LBS_CPT, function ( $post ) {
	if ( ! lbs_gcal_ready() && ! get_post_meta( $post->ID, '_lbs_gcal_history', true ) ) { return; }
	add_meta_box( 'lbs-gcal', 'Google Calendar', function ( $post ) {
		$gid = get_post_meta( $post->ID, '_lbs_gcal_id', true );
		$h   = get_post_meta( $post->ID, '_lbs_gcal_history', true );
		echo '<p>' . ( $gid ? 'Linked to an event in your Google Calendar.' : ( lbs_gcal_ready() ? 'Not in Google Calendar yet. Published bookings are added when you save.' : 'Sync is off.' ) ) . '</p>';
		if ( is_array( $h ) && $h ) {
			echo '<ul style="margin:0">';
			foreach ( array_reverse( $h ) as $row ) { echo '<li><small>' . esc_html( wp_date( 'j M, H:i', $row[0] ) ) . ' · ' . ( 'in' === $row[1] ? 'From Google: ' : '' ) . esc_html( $row[2] ) . '</small></li>'; }
			echo '</ul>';
		}
	}, LBS_CPT, 'side', 'low' );
} );
