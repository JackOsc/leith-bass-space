<?php
/**
 * Member portal page (/members/). Chooses the view for this visitor.
 *
 * @package LeithBassMembers
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

$lbs_route  = lbs_portal_route();
$lbs_member = lbs_portal_member_id();

// One-time links travel in the URL, so don't pass them on as a referrer.
header( 'Referrer-Policy: no-referrer' );
// Tells the app's offline store whether this page is a member's own portal
// (keep a copy) or the signed-out page (clear everything).
header( 'X-LBS-Member: ' . ( $lbs_member && ! lbs_portal_is_preview() ? '1' : ( is_user_logged_in() ? 'x' : '0' ) ) );

require_once __DIR__ . '/parts.php';

if ( 'set-password' === $lbs_route ) {
	$lbs_view = 'view-set-password.php';
} elseif ( 'reset' === $lbs_route ) {
	$lbs_view = 'view-reset.php';
} elseif ( $lbs_member && isset( lbs_portal_rooms()[ $lbs_route ] ) ) {
	$lbs_view = 'view-room.php';
} elseif ( $lbs_member ) {
	$lbs_view = 'view-dashboard.php';
} elseif ( lbs_portal_is_preview() ) {
	$lbs_view = 'view-choose.php';
} else {
	$lbs_view = 'view-signin.php';
}

/** Views get their own scope so their variables never leak into globals. */
function lbs_render_view( $lbs_view, $lbs_member, $lbs_route ) {
	include __DIR__ . '/' . $lbs_view;
}

get_header();
echo '<div class="mp">';
lbs_render_view( $lbs_view, $lbs_member, $lbs_route );
echo '</div>';
get_footer();
