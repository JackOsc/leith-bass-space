<?php
/**
 * Member sign-in, invites and password resets. There is no public sign-up:
 * the only way in is an invite from Members → All members.
 *
 * @package LeithBassMembers
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'LBS_INVITE_TTL', 7 * DAY_IN_SECONDS );
define( 'LBS_RESET_TTL', HOUR_IN_SECONDS );
define( 'LBS_MIN_PASSWORD', 10 );

/* -------------------------------------------------------------------------
 * One-time links (invite and reset). Only a keyed hash is stored.
 * ---------------------------------------------------------------------- */

function lbs_token_hash( $token ) {
	return hash_hmac( 'sha256', (string) $token, wp_salt( 'auth' ) );
}

function lbs_make_token( $user_id, $type ) {
	$token = wp_generate_password( 40, false, false );
	update_user_meta( $user_id, '_lbs_token', array(
		'hash' => lbs_token_hash( $token ),
		'type' => $type,
		'exp'  => time() + ( 'invite' === $type ? LBS_INVITE_TTL : LBS_RESET_TTL ),
	) );
	return $token;
}

/** The stored token record when the link is valid, otherwise false. */
function lbs_check_token( $user_id, $token ) {
	$rec = get_user_meta( $user_id, '_lbs_token', true );
	if ( ! $user_id || ! is_array( $rec ) || empty( $rec['hash'] ) || time() > (int) $rec['exp'] ) { return false; }
	return hash_equals( $rec['hash'], lbs_token_hash( $token ) ) ? $rec : false;
}

function lbs_set_password_url( $user_id, $token ) {
	return lbs_portal_url( 'set-password', array( 'u' => $user_id, 'k' => $token ) );
}

/** Email an invite (or a fresh one). Returns true when the email went. */
function lbs_send_invite( $user_id ) {
	$user = get_userdata( $user_id );
	if ( ! $user || ! lbs_can_access( $user_id ) ) { return false; }
	$token = lbs_make_token( $user_id, 'invite' );
	update_user_meta( $user_id, '_lbs_invited', time() );
	return lbs_mail_invite( $user, lbs_set_password_url( $user_id, $token ) );
}

/** Portal status for Jack's members list. */
function lbs_member_status( $user_id ) {
	if ( lbs_member_disabled( $user_id ) ) { return array( 'off', 'Access off' ); }
	if ( get_user_meta( $user_id, '_lbs_activated', true ) ) { return array( 'active', 'Active' ); }
	$invited = (int) get_user_meta( $user_id, '_lbs_invited', true );
	if ( ! $invited ) { return array( 'none', 'Not invited' ); }
	$rec = get_user_meta( $user_id, '_lbs_token', true );
	if ( is_array( $rec ) && 'invite' === $rec['type'] && time() > (int) $rec['exp'] ) { return array( 'expired', 'Invite expired' ); }
	return array( 'invited', 'Invited ' . wp_date( 'j M', $invited ) );
}

/* -------------------------------------------------------------------------
 * Rate limiting
 * ---------------------------------------------------------------------- */

function lbs_client_ip() {
	return isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : 'unknown';
}

/** True when this key has hit its limit. Otherwise counts one attempt. */
function lbs_rate_limited( $key, $max, $window ) {
	$key   = 'lbs_rl_' . md5( $key );
	$count = (int) get_transient( $key );
	if ( $count >= $max ) { return true; }
	set_transient( $key, $count + 1, $window );
	return false;
}

function lbs_rate_clear( $key ) {
	delete_transient( 'lbs_rl_' . md5( $key ) );
}

/* -------------------------------------------------------------------------
 * Form handlers (admin-post.php)
 * ---------------------------------------------------------------------- */

function lbs_back( $route, $args = array() ) {
	wp_safe_redirect( lbs_portal_url( $route, $args ) );
	exit;
}

/** Sign in. */
function lbs_handle_login() {
	if ( ! isset( $_POST['lbs_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['lbs_nonce'] ) ), 'lbs_login' ) ) {
		lbs_back( 'home', array( 'e' => 'expired' ) );
	}
	$email = isset( $_POST['email'] ) ? sanitize_email( wp_unslash( $_POST['email'] ) ) : '';
	$pass  = isset( $_POST['password'] ) ? (string) wp_unslash( $_POST['password'] ) : ''; // phpcs:ignore -- passwords are not sanitised.
	if ( ! $email || '' === $pass ) {
		lbs_back( 'home', array( 'e' => 'empty', 'email' => rawurlencode( $email ) ) );
	}
	$ip = lbs_client_ip();
	if ( lbs_rate_limited( 'login-ip-' . $ip, 20, 15 * MINUTE_IN_SECONDS ) || lbs_rate_limited( 'login-' . strtolower( $email ), 6, 15 * MINUTE_IN_SECONDS ) ) {
		lbs_back( 'home', array( 'e' => 'wait', 'email' => rawurlencode( $email ) ) );
	}
	$user = wp_signon( array(
		'user_login'    => $email,
		'user_password' => $pass,
		'remember'      => ! empty( $_POST['remember'] ),
	), is_ssl() );
	if ( is_wp_error( $user ) ) {
		$code = $user->get_error_code();
		lbs_back( 'home', array( 'e' => 'lbs_disabled' === $code ? 'off' : 'bad', 'email' => rawurlencode( $email ) ) );
	}
	lbs_rate_clear( 'login-' . strtolower( $email ) );
	lbs_back( 'home' );
}
add_action( 'admin_post_nopriv_lbs_login', 'lbs_handle_login' );
add_action( 'admin_post_lbs_login', 'lbs_handle_login' );

/** Choose a password from an invite or reset link. */
function lbs_handle_set_password() {
	$uid   = isset( $_POST['u'] ) ? absint( $_POST['u'] ) : 0;
	$token = isset( $_POST['k'] ) ? sanitize_text_field( wp_unslash( $_POST['k'] ) ) : '';
	$args  = array( 'u' => $uid, 'k' => $token );
	if ( ! isset( $_POST['lbs_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['lbs_nonce'] ) ), 'lbs_set_password' ) ) {
		lbs_back( 'set-password', $args + array( 'e' => 'expired' ) );
	}
	if ( lbs_rate_limited( 'setpw-' . lbs_client_ip(), 20, 15 * MINUTE_IN_SECONDS ) ) {
		lbs_back( 'set-password', $args + array( 'e' => 'wait' ) );
	}
	$rec = lbs_check_token( $uid, $token );
	if ( ! $rec || ! lbs_can_access( $uid ) ) {
		delete_user_meta( $uid, '_lbs_token' );
		lbs_back( 'set-password', $args );
	}
	$user = get_userdata( $uid );
	$p1   = isset( $_POST['password'] ) ? (string) wp_unslash( $_POST['password'] ) : ''; // phpcs:ignore
	$p2   = isset( $_POST['password2'] ) ? (string) wp_unslash( $_POST['password2'] ) : ''; // phpcs:ignore
	if ( strlen( $p1 ) < LBS_MIN_PASSWORD ) { lbs_back( 'set-password', $args + array( 'e' => 'short' ) ); }
	if ( strtolower( $p1 ) === strtolower( $user->user_email ) ) { lbs_back( 'set-password', $args + array( 'e' => 'email' ) ); }
	if ( $p1 !== $p2 ) { lbs_back( 'set-password', $args + array( 'e' => 'match' ) ); }

	wp_set_password( $p1, $uid );
	delete_user_meta( $uid, '_lbs_token' );
	if ( ! get_user_meta( $uid, '_lbs_activated', true ) ) { update_user_meta( $uid, '_lbs_activated', time() ); }
	wp_set_current_user( $uid );
	wp_set_auth_cookie( $uid, true, is_ssl() );
	lbs_back( 'home', array( 'welcome' => 'invite' === $rec['type'] ? 'new' : 'reset' ) );
}
add_action( 'admin_post_nopriv_lbs_set_password', 'lbs_handle_set_password' );
add_action( 'admin_post_lbs_set_password', 'lbs_handle_set_password' );

/** Ask for a reset link. The answer is the same whether or not the address exists. */
function lbs_handle_reset() {
	if ( ! isset( $_POST['lbs_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['lbs_nonce'] ) ), 'lbs_reset' ) ) {
		lbs_back( 'reset', array( 'e' => 'expired' ) );
	}
	$email = isset( $_POST['email'] ) ? sanitize_email( wp_unslash( $_POST['email'] ) ) : '';
	if ( ! is_email( $email ) ) { lbs_back( 'reset', array( 'e' => 'email' ) ); }
	if ( ! lbs_rate_limited( 'reset-ip-' . lbs_client_ip(), 6, HOUR_IN_SECONDS ) && ! lbs_rate_limited( 'reset-' . strtolower( $email ), 3, HOUR_IN_SECONDS ) ) {
		$user = get_user_by( 'email', $email );
		if ( $user && lbs_can_access( $user->ID ) ) {
			$token = lbs_make_token( $user->ID, 'reset' );
			lbs_mail_reset( $user, lbs_set_password_url( $user->ID, $token ) );
		}
	}
	lbs_back( 'reset', array( 'sent' => 1 ) );
}
add_action( 'admin_post_nopriv_lbs_reset', 'lbs_handle_reset' );
add_action( 'admin_post_lbs_reset', 'lbs_handle_reset' );

/** /members/signout/ */
function lbs_signout() {
	$nonce = isset( $_GET['_wpnonce'] ) ? sanitize_text_field( wp_unslash( $_GET['_wpnonce'] ) ) : '';
	if ( is_user_logged_in() && wp_verify_nonce( $nonce, 'lbs_signout' ) ) {
		wp_logout();
		lbs_back( 'home', array( 'out' => 1 ) );
	}
	lbs_back( 'home' );
}

/* -------------------------------------------------------------------------
 * Keep members out of wp-admin, away from the toolbar, and switched off
 * when Jack turns their access off.
 * ---------------------------------------------------------------------- */

add_filter( 'authenticate', function ( $user ) {
	if ( $user instanceof WP_User && lbs_is_member( $user->ID ) && lbs_member_disabled( $user->ID ) ) {
		return new WP_Error( 'lbs_disabled', 'Portal access for this account is switched off.' );
	}
	return $user;
}, 50 );

// Keep members out of the admin screens, but let front-end form handlers
// (admin-post.php, e.g. the contact form) and AJAX through: admin_init runs
// for those too.
add_action( 'admin_init', function () {
	global $pagenow;
	if ( wp_doing_ajax() || 'admin-post.php' === $pagenow || ! is_user_logged_in() ) { return; }
	$user = wp_get_current_user();
	if ( lbs_is_member( $user->ID ) && ! $user->has_cap( 'edit_posts' ) ) {
		wp_safe_redirect( lbs_portal_url() );
		exit;
	}
} );

// Members who tick "Keep me signed in" (and everyone who sets a password
// from an invite) stay signed in for a year, so the home-screen app rarely
// asks again. Administrators keep WordPress's normal 14 days.
add_filter( 'auth_cookie_expiration', function ( $length, $user_id, $remember ) {
	return ( $remember && lbs_is_member( $user_id ) ) ? YEAR_IN_SECONDS : $length;
}, 10, 3 );

add_filter( 'show_admin_bar', function ( $show ) {
	return lbs_is_member() ? false : $show;
} );

add_filter( 'login_redirect', function ( $redirect, $requested, $user ) {
	return ( $user instanceof WP_User && lbs_is_member( $user->ID ) ) ? lbs_portal_url() : $redirect;
}, 10, 3 );

// Members use the portal's reset page, not wp-login.php's.
add_filter( 'lostpassword_url', function ( $url ) {
	return lbs_is_portal() ? lbs_portal_url( 'reset' ) : $url;
} );

/** Switch a member's access off: sessions ended, outstanding links cancelled. */
function lbs_revoke_access( $user_id ) {
	update_user_meta( $user_id, '_lbs_disabled', 1 );
	delete_user_meta( $user_id, '_lbs_token' );
	delete_user_meta( $user_id, '_lbs_cal_token' );
	WP_Session_Tokens::get_instance( $user_id )->destroy_all();
}
