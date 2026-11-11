<?php
/**
 * The member's portal: Overview, Session Notes, the Shed, Bookings, Account,
 * and links to the app's rooms, Ear Training, Harmonic Elements and Read.
 *
 * @package LeithBassMembers
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

$uid      = $lbs_member;
$user     = get_userdata( $uid );
$preview  = lbs_portal_is_preview();
// Jack using the app as himself: no point asking himself for a session
$as_self  = lbs_admin_self() && lbs_portal_member_id() === get_current_user_id();
$objdone  = $preview ? array() : lbs_pr_get( $uid, 'objdone' );
$upcoming = lbs_upcoming( $uid );
$next     = $upcoming ? $upcoming[0] : null;
$past     = lbs_past_sessions( $uid );
$latest   = lbs_latest_notes( $uid );
$ledger   = lbs_ledger( $uid );
$prefs    = lbs_prefs( $uid );
$guardian = lbs_guardian( $uid );
$today    = lbs_today();
$tabs     = array(
	'overview' => array( 'Overview', 'M4 11l8-7 8 7v9h-5v-6H9v6H4z' ),
	'notes'    => array( 'Session Notes', 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7' ),
	'practice' => array( 'The Shed', 'M3 11l9-7 9 7M5 10v10h14V10M10 20v-5h4v5' ),
	'bookings' => array( 'Bookings', 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5' ),
	'account'  => array( 'Account', 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0' ),
);
$tab = isset( $_GET['tab'] ) ? sanitize_key( wp_unslash( $_GET['tab'] ) ) : 'overview';
$tab = isset( $tabs[ $tab ] ) ? $tab : 'overview';

$first    = lbs_member_sessions( $uid );
$since_ts = $first ? lbs_dt( $first[0]['date'] )->getTimestamp() : strtotime( $user->user_registered );

$notices = array();
if ( isset( $_GET['welcome'] ) ) { $notices[] = 'new' === $_GET['welcome'] ? 'Welcome in. Your password is set and you\'re signed in.' : 'Your new password is set.'; }

$status_pill = function ( $s ) use ( $ledger ) {
	if ( $s['move'] ) { return '<span class="mp-pill muted">Move requested</span>'; }
	return lbs_booking_confirmed( $s, $ledger ) ? '<span class="mp-pill ok">Confirmed</span>' : '<span class="mp-pill warn" title="Confirmed once it\'s paid">Provisional</span>';
};
?>
<?php if ( $preview ) : ?>
	<div class="mp-preview"><div class="wrap">Previewing <?php echo esc_html( $user->display_name ); ?>'s portal, as Jack sees it: private tools and ticks are hidden, and nothing can be changed. <a href="<?php echo esc_url( admin_url( 'admin.php?page=lbs-members&member=' . $uid ) ); ?>">Back to their member page</a></div></div>
<?php endif; ?>
<div class="mp-offline" data-offline hidden><div class="wrap">You're offline. Showing what was saved on this device; changes will sync when you're back online.</div></div>

<div class="mp-band">
	<div class="wrap">
		<p class="kicker">Member portal · Member since <?php echo esc_html( wp_date( 'F Y', $since_ts ) ); ?></p>
		<h1>Hello, <em><?php echo esc_html( lbs_first_name( $uid ) ); ?></em></h1>
		<div class="mp-tabrow">
			<div class="mp-tabs" role="tablist" aria-label="Portal sections">
				<?php foreach ( $tabs as $key => $t ) : ?>
					<a class="mp-tab" role="tab" id="mp-tab-<?php echo esc_attr( $key ); ?>" href="<?php echo esc_url( add_query_arg( 'tab', $key ) ); ?>" aria-controls="mp-pn-<?php echo esc_attr( $key ); ?>" aria-selected="<?php echo $tab === $key ? 'true' : 'false'; ?>" tabindex="<?php echo $tab === $key ? '0' : '-1'; ?>" data-tab="<?php echo esc_attr( $key ); ?>"><?php echo esc_html( $t[0] ); ?></a>
				<?php endforeach; ?>
			</div>
			<nav class="mp-rooms" aria-label="The app's rooms">
				<?php foreach ( lbs_portal_rooms() as $route => $r ) : ?>
					<a class="mp-room-link" href="<?php echo esc_url( lbs_portal_url( $route ) ); ?>"><?php echo esc_html( $r['name'] ); ?></a>
				<?php endforeach; ?>
			</nav>
		</div>
		<?php /* On a phone the bottom bar has Home, Notes, the Shed and the rooms: these two are here instead. */ ?>
		<nav class="mp-more" aria-label="More of the portal">
			<a href="<?php echo esc_url( add_query_arg( 'tab', 'bookings' ) ); ?>" data-tabgo="bookings">Bookings</a>
			<a href="<?php echo esc_url( add_query_arg( 'tab', 'account' ) ); ?>" data-tabgo="account">Account</a>
		</nav>
	</div>
</div>

<?php /* ================= Overview ================= */ ?>
<div class="mp-panel" role="tabpanel" id="mp-pn-overview" aria-labelledby="mp-tab-overview" tabindex="-1" <?php echo 'overview' === $tab ? '' : 'hidden'; ?>>
	<div class="wrap">
		<?php if ( $notices ) : ?><div class="mp-notices"><?php foreach ( $notices as $n ) { echo '<p class="mp-notice" role="status">' . esc_html( $n ) . '</p>'; } ?></div><?php endif; ?>
		<div class="mp-install" data-install-card hidden>
			<div><h4>Add Leith Bass to your home screen</h4><p class="mp-small" data-install-text></p></div>
			<div class="mp-actions"><button type="button" class="mp-btn sm" data-install-go hidden>Install</button><button type="button" class="mp-link" data-install-dismiss>Not now</button></div>
		</div>
		<div class="mp-grid">
			<div class="mp-stack">
				<div class="mp-stack" style="gap:.8rem">
					<div class="mp-box-head"><h4>Next session</h4><?php if ( $next && $next['date'] === $today ) : ?><span class="mp-pill today">Today</span><?php endif; ?></div>
					<?php if ( $next ) : $ts = lbs_dt( $next['date'] )->getTimestamp(); $end = $next['start'] ? lbs_dt( $next['date'], $next['start'] )->modify( '+' . max( 15, $next['minutes'] ) . ' minutes' )->format( 'H:i' ) : ''; ?>
						<div class="mp-ticket">
							<div class="stub"><span class="m"><?php echo esc_html( wp_date( 'D', $ts ) ); ?></span><span class="d mp-num"><?php echo esc_html( wp_date( 'j', $ts ) ); ?></span><span class="m"><?php echo esc_html( wp_date( 'M', $ts ) ); ?></span></div>
							<div class="body">
								<span class="k">Bass session<?php echo $next['number'] ? ' · No. ' . (int) $next['number'] : ''; ?></span>
								<span class="when mp-num"><?php echo esc_html( $next['start'] ? $next['start'] . ' – ' . $end : lbs_length_label( $next['length'] ) . ', time to be confirmed' ); ?></span>
								<span class="where">Lost Oscillation, Music Base. <?php echo esc_html( function_exists( 'lbs_door_note' ) ? 'Someone in the café or rehearsal rooms will let you in.' : '' ); ?></span>
								<span><?php echo $status_pill( $next ); // phpcs:ignore -- fixed markup. ?></span>
								<?php if ( $next['prep'] ) : ?><span class="prep"><?php echo esc_html( $next['prep'] ); ?></span><?php endif; ?>
							</div>
						</div>
						<div class="mp-ticket-acts">
							<a class="mp-btn-ghost sm" href="<?php echo esc_url( add_query_arg( 'tab', 'bookings' ) ); ?>" data-tabgo="bookings">Bookings and calendar</a>
						</div>
					<?php else : ?>
						<div class="mp-box">
							<p>Nothing booked yet.</p>
							<?php if ( ! $preview && ! $as_self ) : ?><div><button type="button" class="mp-btn sm" data-request-session>Ask Jack for a session</button></div><div data-request-slot></div><?php endif; ?>
						</div>
					<?php endif; ?>
				</div>

				<?php if ( $latest && $latest['obj'] ) : ?>
					<div class="mp-box">
						<div class="mp-box-head"><h4>This week's objectives</h4><span class="mp-small mp-num" data-obj-count="<?php echo (int) $latest['id']; ?>"></span></div>
						<?php echo lbs_ui_objectives( $latest, $objdone, $preview ); // phpcs:ignore -- escaped inside. ?>
						<?php if ( ! $preview ) : ?><p class="mp-small">Ticks are just for you.</p><?php endif; ?>
					</div>
				<?php endif; ?>

				<?php if ( $latest ) : ?>
					<div class="mp-box raised">
						<div class="mp-box-head">
							<div><p class="kicker">Latest notes · <?php echo esc_html( lbs_ui_nice_date( $latest['date'] ) ); ?></p><h3><?php echo esc_html( $latest['title'] ? $latest['title'] : lbs_session_label( $latest ) ); ?></h3></div>
							<?php if ( ( strtotime( $today ) - strtotime( $latest['date'] ) ) < 8 * DAY_IN_SECONDS ) : ?><span class="mp-pill new">New</span><?php endif; ?>
						</div>
						<?php if ( $latest['summary'] ) :
							// The opening sentence, pulled out large; the rest as written.
							$lbs_sum   = trim( $latest['summary'] );
							$lbs_quote = preg_match( '/^(.{20,180}?[.!?])(\s|$)/su', $lbs_sum, $lbs_m ) ? $lbs_m[1] : '';
							$lbs_rest  = $lbs_quote ? trim( mb_substr( $lbs_sum, mb_strlen( $lbs_quote ) ) ) : $lbs_sum;
							?>
							<?php if ( $lbs_quote ) : ?><p class="mp-pull">&ldquo;<?php echo esc_html( $lbs_quote ); ?>&rdquo;</p><?php endif; ?>
							<?php if ( $lbs_rest ) : ?><p style="white-space:pre-line"><?php echo esc_html( $lbs_rest ); ?></p><?php endif; ?>
						<?php endif; ?>
						<?php echo lbs_ui_files( $latest ); // phpcs:ignore -- escaped inside. ?>
						<div><a class="mp-link" href="<?php echo esc_url( add_query_arg( 'tab', 'notes' ) ); ?>" data-tabgo="notes">All session notes</a></div>
					</div>
				<?php else : ?>
					<div class="mp-box raised"><h3>Session notes</h3><p>Notes and worksheets from your sessions will appear here after your first one.</p></div>
				<?php endif; ?>
			</div>

			<div class="mp-stack">
				<div class="mp-box">
					<div class="mp-box-head"><h4>The Shed</h4><a class="mp-link" href="<?php echo esc_url( add_query_arg( 'tab', 'practice' ) ); ?>" data-tabgo="practice">Open</a></div>
					<dl class="mp-kv" id="mp-ov-practice"></dl>
				</div>
				<?php if ( $ledger ) { echo lbs_ui_credit( $ledger ); } // phpcs:ignore -- escaped inside. ?>
			</div>
		</div>
	</div>
</div>

<?php /* ================= Session Notes ================= */ ?>
<div class="mp-panel" role="tabpanel" id="mp-pn-notes" aria-labelledby="mp-tab-notes" tabindex="-1" <?php echo 'notes' === $tab ? '' : 'hidden'; ?>>
	<div class="wrap">
		<?php if ( $past ) : ?>
			<div class="mp-toolbar">
				<div class="field"><label for="mp-search">Search your notes</label><input id="mp-search" type="search" placeholder="Try a technique, a key or a song"></div>
				<p class="mp-small mp-num" id="mp-search-count" aria-live="polite"><?php echo count( $past ) . ' session' . ( 1 === count( $past ) ? '' : 's' ); ?></p>
			</div>
			<div class="mp-sessions" id="mp-sessions">
				<?php foreach ( $past as $i => $s ) :
					$cancelled = 'done' !== $s['status'];
					$open      = 0 === $i && ! $cancelled;
					$files_n   = count( $s['files'] );
					$search    = strtolower( $s['title'] . ' ' . $s['summary'] . ' ' . implode( ' ', $s['objectives'] ) . ' ' . implode( ' ', $s['files'] ) );
					?>
					<div class="mp-sess<?php echo $cancelled ? ' cancelled' : ''; ?><?php echo $open ? ' open' : ''; ?>" data-search="<?php echo esc_attr( $search ); ?>" <?php echo $i >= 8 ? 'data-older hidden' : ''; ?>>
						<button type="button" class="mp-sess-row" aria-expanded="<?php echo $open ? 'true' : 'false'; ?>" aria-controls="mp-s-<?php echo (int) $s['id']; ?>">
							<?php echo lbs_ui_date( $s['date'] ); // phpcs:ignore ?>
							<span>
								<span class="s-title"><?php echo esc_html( $cancelled ? ( 'cancelled_free' === $s['status'] ? 'Cancelled' : 'Cancelled (charged)' ) : ( $s['title'] ? $s['title'] : lbs_session_label( $s ) ) ); ?></span>
								<span class="s-meta">
									<?php if ( $cancelled ) : ?>
										<span class="mp-pill muted"><?php echo 'cancelled_free' === $s['status'] ? 'Not charged' : 'Charged'; ?></span>
									<?php else : ?>
										<span><?php echo esc_html( lbs_session_label( $s ) ); ?></span><span class="mp-num"><?php echo esc_html( lbs_length_label( $s['length'] ) ); ?></span><?php if ( $files_n ) : ?><span><?php echo (int) $files_n . ' file' . ( 1 === $files_n ? '' : 's' ); ?></span><?php endif; ?>
									<?php endif; ?>
								</span>
							</span>
							<?php echo lbs_ui_chev(); // phpcs:ignore ?>
						</button>
						<div class="mp-sess-detail" id="mp-s-<?php echo (int) $s['id']; ?>" <?php echo $open ? '' : 'hidden'; ?>>
							<div class="mp-stack" style="gap:1rem">
								<?php if ( $s['summary'] ) : ?><p><?php echo esc_html( $s['summary'] ); ?></p><?php elseif ( $cancelled ) : ?><p class="mp-small"><?php echo 'cancelled_free' === $s['status'] ? 'Not taken from your credit.' : 'This one counted towards your credit.'; ?></p><?php endif; ?>
								<?php if ( $s['obj'] ) : ?><div><h4>Objectives</h4><?php echo lbs_ui_objectives( $s, $objdone, $preview ); // phpcs:ignore ?></div><?php endif; ?>
							</div>
							<?php if ( $s['files'] ) : ?><div><h4>Notes &amp; files</h4><?php echo lbs_ui_files( $s ); // phpcs:ignore ?></div><?php endif; ?>
						</div>
					</div>
				<?php endforeach; ?>
			</div>
			<p class="mp-empty" id="mp-search-empty" hidden>Nothing matches that. Try a technique, a key or a file name.</p>
			<?php if ( count( $past ) > 8 ) : ?>
				<p style="padding-top:1rem"><button type="button" class="mp-btn-ghost sm" id="mp-older">Show <?php echo (int) ( count( $past ) - 8 ); ?> earlier sessions</button></p>
			<?php endif; ?>
		<?php else : ?>
			<p class="mp-empty">Your notes will appear here after your first session.</p>
		<?php endif; ?>
	</div>
</div>

<?php /* ================= The Shed (practice tools) ================= */ ?>
<div class="mp-panel" role="tabpanel" id="mp-pn-practice" aria-labelledby="mp-tab-practice" tabindex="-1" <?php echo 'practice' === $tab ? '' : 'hidden'; ?>>
	<div class="wrap" id="mp-practice">
		<noscript><p>The Shed needs JavaScript switched on.</p></noscript>
	</div>
</div>

<?php /* ================= Bookings ================= */ ?>
<div class="mp-panel" role="tabpanel" id="mp-pn-bookings" aria-labelledby="mp-tab-bookings" tabindex="-1" <?php echo 'bookings' === $tab ? '' : 'hidden'; ?>>
	<div class="wrap mp-grid">
		<div class="mp-stack" style="gap:.4rem">
			<h4>Upcoming</h4>
			<div style="border-top:2px solid var(--ink)">
				<?php if ( ! $upcoming ) : ?>
					<div class="mp-empty"><p>Nothing booked yet.</p><?php if ( ! $preview && ! $as_self ) : ?><p style="margin-top:.8rem"><button type="button" class="mp-btn sm" data-request-session>Ask Jack for a session</button></p><div data-request-slot></div><?php endif; ?></div>
				<?php endif; ?>
				<?php foreach ( $upcoming as $b ) : ?>
					<div class="mp-bk" data-session="<?php echo (int) $b['id']; ?>">
						<?php echo lbs_ui_date( $b['date'] ); // phpcs:ignore ?>
						<span>
							<span class="s-title mp-num"><?php echo esc_html( ( $b['start'] ? $b['start'] . ' · ' : '' ) . lbs_length_label( $b['length'] ) ); ?></span>
							<span class="s-meta"><span><?php echo esc_html( lbs_session_label( $b ) ); ?></span><span>Lost Oscillation</span>
								<?php if ( $b['date'] === $today ) : ?><span class="mp-pill today">Today</span><?php endif; ?>
								<?php echo $status_pill( $b ); // phpcs:ignore ?>
							</span>
							<?php if ( ! $b['move'] && ! lbs_booking_confirmed( $b, $ledger ) ) : ?><span class="mp-small" style="display:block;margin-top:.35rem">Provisional until it's paid<?php echo $b['block'] ? ' or covered by credit' : ''; ?>.</span><?php endif; ?>
							<?php if ( $b['prep'] ) : ?><span class="mp-small" style="display:block;margin-top:.35rem"><?php echo esc_html( $b['prep'] ); ?></span><?php endif; ?>
						</span>
						<span class="acts">
							<a class="mp-btn-ghost sm" href="<?php echo esc_url( lbs_portal_url( 'ics', array( 's' => $b['id'] ) ) ); ?>" title="A one-off file: it won't update if the time changes">Calendar file</a>
							<?php if ( ! $b['move'] && ! $preview ) : ?><button type="button" class="mp-link" data-move="<?php echo (int) $b['id']; ?>">Ask to move</button><?php endif; ?>
						</span>
					</div>
				<?php endforeach; ?>
			</div>
			<p class="mp-small" style="margin-top:.8rem">Requests to move a session go straight to Jack, who'll confirm by email. If a session moves, you'll get an email with the new time.</p>

			<?php if ( ! $preview ) : ?>
				<div class="mp-box" style="margin-top:1.5rem">
					<h4>Your sessions in your calendar</h4>
					<p class="mp-small">Subscribe once and your calendar keeps itself up to date, including moves and cancellations. Calendar apps check for changes every few hours.</p>
					<div class="mp-actions">
						<a class="mp-btn sm" href="<?php echo esc_url( preg_replace( '#^https?://#', 'webcal://', lbs_calendar_url( $uid ) ), array( 'webcal' ) ); ?>" data-cal-link>Subscribe</a>
						<button type="button" class="mp-btn-ghost sm" data-copy="<?php echo esc_attr( lbs_calendar_url( $uid ) ); ?>">Copy link</button>
					</div>
					<p class="mp-small">For Google Calendar: copy the link, then Other calendars → From URL. <button type="button" class="mp-link" data-cal-renew>Make a new link</button> if you ever share this one by mistake.</p>
				</div>
			<?php endif; ?>
		</div>
		<div class="mp-stack">
			<?php if ( $ledger ) : ?>
				<?php echo lbs_ui_credit( $ledger, false ); // phpcs:ignore ?>
				<div class="mp-box raised">
					<h4>Statement</h4>
					<div class="mp-ledger-wrap">
						<table class="mp-ledger">
							<thead><tr><th>Date</th><th>Item</th><th class="r">Change</th><th class="r">Balance</th></tr></thead>
							<tbody>
								<?php foreach ( array_slice( $ledger['rows'], -25 ) as $row ) : ?>
									<tr class="<?php echo esc_attr( $row['type'] ); ?>"><td><?php echo esc_html( lbs_ui_nice_date( $row['date'], 'j M y' ) ); ?></td><td><?php echo esc_html( $row['label'] ); ?></td><td class="r"><?php echo esc_html( lbs_hm( $row['minutes'], true ) ); ?></td><td class="r"><?php echo esc_html( lbs_hm( $row['balance'] ) ); ?></td></tr>
								<?php endforeach; ?>
							</tbody>
						</table>
					</div>
				</div>
			<?php else : ?>
				<div class="mp-box"><h4>Paying</h4><p>You're paying session by session. Ask Jack about a block of sessions if you'd like one.</p></div>
			<?php endif; ?>
		</div>
	</div>
</div>

<?php /* ================= Account ================= */ ?>
<div class="mp-panel" role="tabpanel" id="mp-pn-account" aria-labelledby="mp-tab-account" tabindex="-1" <?php echo 'account' === $tab ? '' : 'hidden'; ?>>
	<div class="wrap">
		<?php if ( isset( $_GET['pw'] ) ) : ?><div class="mp-notices"><p class="mp-notice" role="status">Password changed.</p></div><?php endif; ?>
		<div class="mp-acct">
			<div class="mp-stack">
				<form class="mp-box raised" id="mp-details" novalidate>
					<h4>Your details</h4>
					<div class="field"><label for="mp-ac-name">Name</label><input id="mp-ac-name" name="name" type="text" autocomplete="name" value="<?php echo esc_attr( $user->display_name ); ?>"></div>
					<div class="field"><label for="mp-ac-email">Email</label><input id="mp-ac-email" name="email" type="email" autocomplete="email" value="<?php echo esc_attr( $user->user_email ); ?>"><span class="hint">You sign in with this.</span></div>
					<div class="field" id="mp-ac-current-wrap" hidden><label for="mp-ac-current">Current password</label><input id="mp-ac-current" name="current" type="password" autocomplete="current-password"><span class="hint">Needed to change your email.</span></div>
					<div class="field"><label for="mp-ac-phone">Phone (optional)</label><input id="mp-ac-phone" name="phone" type="tel" autocomplete="tel" value="<?php echo esc_attr( get_user_meta( $uid, '_lbs_phone', true ) ); ?>"><span class="hint">Only used if Jack needs to reach you on the day.</span></div>
					<?php if ( $guardian ) : ?><p class="mp-small">Copies of your portal emails also go to <?php echo esc_html( $guardian['name'] ? $guardian['name'] . ' (' . $guardian['email'] . ')' : $guardian['email'] ); ?>. Ask Jack to change this.</p><?php endif; ?>
					<p class="mp-err" role="alert" hidden></p>
					<div><button class="mp-btn sm" type="submit">Save details</button></div>
				</form>

				<div class="mp-box">
					<h4>Your data</h4>
					<p class="mp-small">Your notes, bookings and the Shed are stored on this website, and worksheets and recordings in Jack's file storage. Jack can see your questions, songs, goals and recordings, and your diary, tempos and listening picks only if you share them. Private tools stay out of his view.</p>
					<div class="mp-actions">
						<button type="button" class="mp-btn-ghost sm" data-export>Download my data</button>
						<button type="button" class="mp-link" data-delete-request>Ask Jack to delete my account</button>
					</div>
					<p class="mp-small"><a href="<?php echo esc_url( home_url( '/privacy/' ) ); ?>">Privacy notice</a></p>
				</div>
			</div>

			<div class="mp-stack">
				<form class="mp-box raised" id="mp-password" novalidate>
					<h4>Password</h4>
					<input type="email" name="username" autocomplete="username" value="<?php echo esc_attr( $user->user_email ); ?>" hidden>
					<div class="field"><label for="mp-pw-cur">Current password</label><input id="mp-pw-cur" name="current" type="password" autocomplete="current-password"></div>
					<div class="field"><label for="mp-pw-new">New password</label><input id="mp-pw-new" name="new" type="password" autocomplete="new-password"><span class="hint">At least <?php echo (int) LBS_MIN_PASSWORD; ?> characters.</span></div>
					<p class="mp-err" role="alert" hidden></p>
					<div><button class="mp-btn-ghost sm" type="submit">Change password</button></div>
				</form>
				<div class="mp-box">
					<h4>Emails from the portal</h4>
					<div>
						<?php
						$lbs_pref_rows = array(
							'notes'  => array( 'New notes are posted', 'A short email with a link when Jack adds notes to a session.' ),
							'remind' => array( 'Session reminder', 'The morning of each session.' ),
							'nudge'  => array( 'Practice nudge', 'If nothing\'s gone in your diary for three days.' ),
							'low'    => array( 'Credit running low', 'When an hour or less of lesson credit is left.' ),
						);
						foreach ( $lbs_pref_rows as $key => $row ) :
							?>
							<label class="mp-switch"><span><b><?php echo esc_html( $row[0] ); ?></b><small><?php echo esc_html( $row[1] ); ?></small></span><input class="mp-tgl" type="checkbox" data-pref="<?php echo esc_attr( $key ); ?>" <?php checked( ! empty( $prefs[ $key ] ) ); ?> <?php disabled( $preview ); ?>></label>
						<?php endforeach; ?>
					</div>
					<p class="mp-small">Changes to your bookings are always emailed.</p>
				</div>
				<div class="mp-box" data-app-box>
					<h4>The app</h4>
					<p class="mp-small" data-app-text>Add the portal to your home screen and it opens full screen like an app, keeps you signed in, and keeps your latest notes for when there's no signal.</p>
				</div>
				<div class="mp-row">
					<span class="mp-small">Signed in as <?php echo esc_html( $user->user_email ); ?></span>
					<?php if ( ! $preview ) : ?><a class="mp-btn-ghost sm" href="<?php echo esc_url( wp_nonce_url( lbs_portal_url( 'signout' ), 'lbs_signout' ) ); ?>" data-signout>Sign out</a><?php endif; ?>
				</div>
			</div>
		</div>
	</div>
</div>

<?php lbs_portal_appbar( $tab, true ); ?>

<footer class="mp-foot"><div class="wrap"><span>leith<b>bass</b>.space</span><a href="<?php echo esc_url( home_url( '/' ) ); ?>">The website</a><a href="<?php echo esc_url( home_url( '/privacy/' ) ); ?>">Privacy</a><?php if ( ! $preview ) : ?><a href="<?php echo esc_url( wp_nonce_url( lbs_portal_url( 'signout' ), 'lbs_signout' ) ); ?>" data-signout>Sign out</a><?php endif; ?></div></footer>

<div class="mp-toast" id="mp-toast" role="status" aria-live="polite"><span data-toast-text></span><button type="button" class="mp-toast-undo" data-undo hidden>Undo</button></div>
