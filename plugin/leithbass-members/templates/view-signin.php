<?php
/**
 * Sign in.
 *
 * @package LeithBassMembers
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

$lbs_errors = array(
	'bad'     => 'That email and password don\'t match. Check both, or reset your password below.',
	'empty'   => 'Enter your email and password to sign in.',
	'wait'    => 'Too many attempts. Wait fifteen minutes, then try again.',
	'expired' => 'The page sat open too long. Please try again.',
	'off'     => 'Portal access for this account is switched off. Get in touch with Jack if that\'s unexpected.',
);
$lbs_e     = isset( $_GET['e'] ) ? sanitize_key( wp_unslash( $_GET['e'] ) ) : '';
$lbs_email = isset( $_GET['email'] ) ? sanitize_email( rawurldecode( wp_unslash( $_GET['email'] ) ) ) : '';
?>
<section class="mp-auth">
	<div class="wrap mp-auth-grid">
		<div class="mp-auth-copy">
			<p class="kicker">Member portal</p>
			<h1>Your sessions, <span class="mp-knock">on file</span></h1>
			<p>Notes, worksheets, bookings and the Shed, with your practice tools.</p>
			<p class="mp-small"><a href="<?php echo esc_url( home_url( '/portal/' ) ); ?>">The Portal</a> is for bassists who are working with Jack. Jack sends you an invite after your first session. <a href="<?php echo esc_url( home_url( '/contact/' ) ); ?>">Book an introductory session</a></p>
			<?php $lbs_shed_url = apply_filters( 'lbs_shed_tools_url', '' ); ?>
			<?php if ( $lbs_shed_url ) : ?>
				<p class="mp-small mp-try-link">Not a member yet? <a href="<?php echo esc_url( $lbs_shed_url ); ?>">Have a go with the Shed tools</a></p>
			<?php endif; ?>
			<p class="mp-small mp-app-hint" data-install-hint hidden></p>
		</div>
		<form class="mp-card" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<h3>Sign in</h3>
			<?php if ( ! empty( $_GET['out'] ) ) : ?><p class="mp-notice" role="status">You're signed out.</p><?php endif; ?>
			<?php if ( isset( $lbs_errors[ $lbs_e ] ) ) : ?><p class="mp-notice err" role="alert"><?php echo esc_html( $lbs_errors[ $lbs_e ] ); ?></p><?php endif; ?>
			<input type="hidden" name="action" value="lbs_login">
			<?php wp_nonce_field( 'lbs_login', 'lbs_nonce' ); ?>
			<div class="field"><label for="mp-email">Email</label><input id="mp-email" name="email" type="email" autocomplete="username" inputmode="email" autocapitalize="none" required value="<?php echo esc_attr( $lbs_email ); ?>"></div>
			<div class="field"><label for="mp-pass">Password</label><input id="mp-pass" name="password" type="password" autocomplete="current-password" required></div>
			<div class="mp-row">
				<label class="mp-check-row"><input type="checkbox" name="remember" value="1" checked> Keep me signed in</label>
				<a class="mp-link" href="<?php echo esc_url( lbs_portal_url( 'reset' ) ); ?>">Forgotten it?</a>
			</div>
			<button class="mp-btn block" type="submit">Sign in</button>
		</form>
	</div>
</section>
