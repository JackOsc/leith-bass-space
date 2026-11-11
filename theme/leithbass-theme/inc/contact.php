<?php
/**
 * Contact form handler. Renders on template-contact.php, submits via
 * admin-post.php, and mails the address saved in Leith Bass Content — no address or
 * phone number is ever shown in the page. Honeypot + nonce + a short
 * per-IP rate limit stand in for a CAPTCHA.
 *
 * @package LeithBass
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * Handle the POST from the contact form (both logged-in and anonymous
 * visitors — this site has no logged-in public users, but WordPress
 * requires both hooks to be registered).
 */
function leithbass_contact_handle() {
	$back = wp_get_referer();
	if ( ! $back ) {
		$back = home_url( '/contact/' );
	}
	$back = remove_query_arg( array( 'contact', 'cf' ), $back );

	// If anything goes wrong, keep what they typed for ten minutes so the form comes back filled in.
	$keep = function ( $status ) use ( $back ) {
		$token = wp_generate_password( 20, false );
		set_transient( 'leithbass_cf_' . strtolower( $token ), array(
			'name'    => isset( $_POST['name'] ) ? sanitize_text_field( wp_unslash( $_POST['name'] ) ) : '',
			'email'   => isset( $_POST['email'] ) ? sanitize_email( wp_unslash( $_POST['email'] ) ) : '',
			'message' => isset( $_POST['message'] ) ? sanitize_textarea_field( wp_unslash( $_POST['message'] ) ) : '',
		), 10 * MINUTE_IN_SECONDS );
		return add_query_arg( array( 'contact' => $status, 'cf' => strtolower( $token ) ), $back ) . '#contact-form';
	};

	if ( ! isset( $_POST['leithbass_contact_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['leithbass_contact_nonce'] ) ), 'leithbass_contact' ) ) {
		wp_safe_redirect( $keep( 'error' ) );
		exit;
	}

	// Honeypot: a hidden field real visitors never see or fill in.
	if ( ! empty( $_POST['website'] ) ) {
		wp_safe_redirect( add_query_arg( 'contact', 'sent', $back ) ); // Pretend success; drop silently.
		exit;
	}

	// Basic per-IP rate limit: one submission per 30 seconds.
	$ip  = isset( $_SERVER['REMOTE_ADDR'] ) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
	$key = 'leithbass_contact_' . md5( $ip );
	if ( get_transient( $key ) ) {
		wp_safe_redirect( $keep( 'wait' ) );
		exit;
	}
	set_transient( $key, 1, 30 );

	$name    = isset( $_POST['name'] ) ? sanitize_text_field( wp_unslash( $_POST['name'] ) ) : '';
	$email   = isset( $_POST['email'] ) ? sanitize_email( wp_unslash( $_POST['email'] ) ) : '';
	$message = isset( $_POST['message'] ) ? sanitize_textarea_field( wp_unslash( $_POST['message'] ) ) : '';

	if ( '' === $name || '' === $message || ! is_email( $email ) ) {
		wp_safe_redirect( $keep( 'invalid' ) );
		exit;
	}

	$subject = 'New enquiry via leithbass.space — ' . $name;
	$body    = "New enquiry from the leithbass.space contact form.\n\n";
	$body   .= "Name: $name\n";
	$body   .= "Email: $email\n\n";
	$body   .= "Message:\n$message\n";
	$headers = array( 'Reply-To: ' . $name . ' <' . $email . '>' );

	$recipient = sanitize_email( leithbass_val( 'contact_email' ) );
	$sent      = $recipient ? wp_mail( $recipient, $subject, $body, $headers ) : false;

	wp_safe_redirect( $sent ? add_query_arg( 'contact', 'sent', $back ) : $keep( 'error' ) );
	exit;
}
add_action( 'admin_post_leithbass_contact', 'leithbass_contact_handle' );
add_action( 'admin_post_nopriv_leithbass_contact', 'leithbass_contact_handle' );
