<?php
/**
 * Ask for a password reset link.
 *
 * @package LeithBassMembers
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

$lbs_e = isset( $_GET['e'] ) ? sanitize_key( wp_unslash( $_GET['e'] ) ) : '';
?>
<section class="mp-auth">
	<div class="wrap mp-auth-grid">
		<div class="mp-auth-copy">
			<p class="kicker">Member portal</p>
			<h1>Reset your <span class="mp-knock">password</span></h1>
			<p>Enter the email you use with Jack and we'll send you a link to choose a new one.</p>
		</div>
		<form class="mp-card" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<h3>Send a reset link</h3>
			<?php if ( ! empty( $_GET['sent'] ) ) : ?>
				<p class="mp-notice" role="status">If that address has an account, a reset link is on its way. It works for one hour. Check your spam folder if it hasn't arrived in a few minutes.</p>
			<?php elseif ( 'email' === $lbs_e ) : ?>
				<p class="mp-notice err" role="alert">That email address doesn't look complete.</p>
			<?php elseif ( 'expired' === $lbs_e ) : ?>
				<p class="mp-notice err" role="alert">The page sat open too long. Please try again.</p>
			<?php endif; ?>
			<input type="hidden" name="action" value="lbs_reset">
			<?php wp_nonce_field( 'lbs_reset', 'lbs_nonce' ); ?>
			<div class="field"><label for="mp-reset-email">Email</label><input id="mp-reset-email" name="email" type="email" autocomplete="email" required></div>
			<button class="mp-btn block" type="submit"><?php echo empty( $_GET['sent'] ) ? 'Send link' : 'Send again'; ?></button>
			<a class="mp-link" href="<?php echo esc_url( lbs_portal_url() ); ?>">Back to sign in</a>
		</form>
	</div>
</section>
