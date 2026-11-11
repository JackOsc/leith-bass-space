<?php
/**
 * Choose a password from an invite or reset link.
 *
 * @package LeithBassMembers
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

$lbs_uid   = isset( $_GET['u'] ) ? absint( $_GET['u'] ) : 0;
$lbs_token = isset( $_GET['k'] ) ? sanitize_text_field( wp_unslash( $_GET['k'] ) ) : '';
$lbs_rec   = lbs_check_token( $lbs_uid, $lbs_token );
$lbs_user  = ( $lbs_rec && lbs_can_access( $lbs_uid ) ) ? get_userdata( $lbs_uid ) : null;
$lbs_new   = $lbs_rec && 'invite' === $lbs_rec['type'];
$lbs_e     = isset( $_GET['e'] ) ? sanitize_key( wp_unslash( $_GET['e'] ) ) : '';
$lbs_errs  = array(
	'short'   => 'Your password needs at least ' . LBS_MIN_PASSWORD . ' characters.',
	'email'   => 'Pick something other than your email address.',
	'match'   => 'The two passwords don\'t match. Type them again.',
	'expired' => 'The page sat open too long. Please try again.',
	'wait'    => 'Too many attempts. Wait fifteen minutes, then try again.',
);
?>
<section class="mp-auth">
	<div class="wrap mp-auth-grid">
		<div class="mp-auth-copy">
			<p class="kicker">Member portal</p>
			<?php if ( $lbs_new ) : ?>
				<h1>Welcome <span class="mp-knock">in</span></h1>
				<p>Choose a password and you're done. You'll sign in with your email from now on.</p>
			<?php else : ?>
				<h1>New <span class="mp-knock">password</span></h1>
				<p>Choose a new password for your member portal.</p>
			<?php endif; ?>
		</div>

		<?php if ( ! $lbs_user ) : ?>
			<div class="mp-card">
				<h3>This link has expired</h3>
				<p>Links to set a password work once, and only for a limited time. Ask for a fresh one and it'll arrive by email.</p>
				<a class="mp-btn block" href="<?php echo esc_url( lbs_portal_url( 'reset' ) ); ?>">Send me a new link</a>
			</div>
		<?php else : ?>
			<form class="mp-card" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" id="mp-setpw">
				<h3><?php echo $lbs_new ? 'Set your password' : 'Choose a new password'; ?></h3>
				<?php if ( isset( $lbs_errs[ $lbs_e ] ) ) : ?><p class="mp-notice err" role="alert"><?php echo esc_html( $lbs_errs[ $lbs_e ] ); ?></p><?php endif; ?>
				<input type="hidden" name="action" value="lbs_set_password">
				<input type="hidden" name="u" value="<?php echo (int) $lbs_uid; ?>">
				<input type="hidden" name="k" value="<?php echo esc_attr( $lbs_token ); ?>">
				<?php wp_nonce_field( 'lbs_set_password', 'lbs_nonce' ); ?>
				<div class="field"><label for="mp-sp-email">Email</label><input id="mp-sp-email" name="username" type="email" value="<?php echo esc_attr( $lbs_user->user_email ); ?>" readonly autocomplete="username"></div>
				<div class="field"><label for="mp-sp-1">New password</label><input id="mp-sp-1" name="password" type="password" autocomplete="new-password" required minlength="<?php echo (int) LBS_MIN_PASSWORD; ?>"></div>
				<div class="field"><label for="mp-sp-2">Type it again</label><input id="mp-sp-2" name="password2" type="password" autocomplete="new-password" required></div>
				<ul class="mp-rules" id="mp-rules">
					<li data-r="len">At least <?php echo (int) LBS_MIN_PASSWORD; ?> characters</li>
					<li data-r="email">Not your email address</li>
					<li data-r="match">Both passwords match</li>
				</ul>
				<button class="mp-btn block" type="submit">Set password and continue</button>
			</form>
			<script>
			(function () {
				var f = document.getElementById('mp-setpw'); if (!f) { return; }
				var a = document.getElementById('mp-sp-1'), b = document.getElementById('mp-sp-2'), em = document.getElementById('mp-sp-email').value.toLowerCase();
				function check() {
					var r = { len: a.value.length >= <?php echo (int) LBS_MIN_PASSWORD; ?>, email: a.value.length > 0 && a.value.toLowerCase() !== em, match: a.value.length > 0 && a.value === b.value };
					[].forEach.call(document.querySelectorAll('#mp-rules li'), function (li) { li.classList.toggle('met', !!r[li.getAttribute('data-r')]); });
				}
				a.addEventListener('input', check); b.addEventListener('input', check);
			}());
			</script>
		<?php endif; ?>
	</div>
</section>
