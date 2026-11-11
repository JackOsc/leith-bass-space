<?php
/**
 * The portal as an app: installable from Safari or Chrome ("Add to Home
 * Screen"), full screen with its own icon, and usable offline. No app store
 * or developer account involved.
 *
 * @package LeithBassMembers
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

/** /members/manifest.webmanifest */
function lbs_serve_manifest() {
	$icons = LBS_URL . 'assets/icons/';
	$scope = wp_parse_url( lbs_portal_url(), PHP_URL_PATH );
	$data  = array(
		'id'               => $scope,
		'name'             => 'Leith Bass Space',
		'short_name'       => 'Leith Bass',
		'description'      => 'Your session notes and bookings, the Shed, Ear Training for Bass Players, Harmonic Elements and Read.',
		'start_url'        => $scope . '?source=app',
		'scope'            => $scope,
		'display'          => 'standalone',
		'orientation'      => 'portrait',
		'background_color' => '#090909',
		'theme_color'      => '#090909',
		// long press on the icon: straight to a room
		'shortcuts'        => array(
			array( 'name' => 'The Shed', 'url' => $scope . '?tab=practice&source=app' ),
			array( 'name' => 'Ear Training', 'url' => $scope . 'ear-training/?source=app' ),
			array( 'name' => 'Harmonic Elements', 'url' => $scope . 'elements/?source=app' ),
			array( 'name' => 'Read', 'url' => $scope . 'read/?source=app' ),
		),
		'icons'            => array(
			array( 'src' => $icons . 'icon-192.png', 'sizes' => '192x192', 'type' => 'image/png', 'purpose' => 'any' ),
			array( 'src' => $icons . 'icon-512.png', 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'any' ),
			array( 'src' => $icons . 'icon-maskable-512.png', 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'maskable' ),
		),
	);
	header( 'Content-Type: application/manifest+json; charset=utf-8' );
	header( 'Cache-Control: public, max-age=86400' );
	echo wp_json_encode( $data, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT ); // phpcs:ignore
}

/** /members/sw.js — served from inside /members/ so its scope is the portal. */
function lbs_serve_sw() {
	$shell = array(
		LBS_URL . 'assets/portal.css?ver=' . LBS_VERSION,
		LBS_URL . 'assets/portal.js?ver=' . LBS_VERSION,
		LBS_URL . 'assets/shed-drone.js?ver=' . LBS_VERSION,
		LBS_URL . 'assets/shed-metronome.js?ver=' . LBS_VERSION,
		LBS_URL . 'assets/shed-tuner.js?ver=' . LBS_VERSION,
		LBS_URL . 'assets/icons/icon-192.png',
		// What the metronome fetches when it is first opened: the list of sounds, their player and the
		// recorded clicks (45 KB), so that it sounds the same with no signal. Kits are kept as they are used.
		LBS_URL . 'assets/harmonic/he-packs.js?ver=' . LBS_VERSION,
		LBS_URL . 'assets/harmonic/he-sounds.js?ver=' . LBS_VERSION,
		LBS_URL . 'assets/harmonic/he-kit.js?ver=' . LBS_VERSION,
		LBS_URL . 'assets/harmonic/sounds/clicks.mp3?v=' . LBS_VERSION,
	);
	$theme_css = get_stylesheet_uri();
	if ( $theme_css ) { $shell[] = add_query_arg( 'ver', wp_get_theme()->get( 'Version' ), $theme_css ); }
	foreach ( array( 'oswald-latin-700-normal', 'inter-latin-400-normal', 'inter-latin-600-normal' ) as $font ) {
		$path = get_template_directory() . '/assets/fonts/' . $font . '.woff2';
		if ( is_readable( $path ) ) { $shell[] = get_template_directory_uri() . '/assets/fonts/' . $font . '.woff2'; }
	}
	$js = (string) file_get_contents( LBS_DIR . 'assets/sw.js' ); // phpcs:ignore
	$js = str_replace( array( '__VERSION__', '__SHELL__' ), array( LBS_VERSION, wp_json_encode( array_values( $shell ), JSON_UNESCAPED_SLASHES ) ), $js );
	header( 'Content-Type: application/javascript; charset=utf-8' );
	header( 'Cache-Control: no-cache' );
	header( 'Service-Worker-Allowed: ' . wp_parse_url( lbs_portal_url(), PHP_URL_PATH ) );
	echo $js; // phpcs:ignore
}

/** Home-screen tags on portal pages, and the app-mode class before first paint. */
add_action( 'wp_head', function () {
	if ( ! lbs_is_portal() ) { return; }
	$icons = LBS_URL . 'assets/icons/';
	echo '<link rel="manifest" href="' . esc_url( lbs_portal_url( 'manifest' ) ) . '">' . "\n";
	echo '<link rel="apple-touch-icon" href="' . esc_url( $icons . 'apple-touch-icon.png' ) . '">' . "\n";
	echo '<meta name="apple-mobile-web-app-capable" content="yes">' . "\n";
	echo '<meta name="mobile-web-app-capable" content="yes">' . "\n";
	echo '<meta name="apple-mobile-web-app-title" content="Leith Bass">' . "\n";
	echo '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">' . "\n";
	echo "<script>(function(){try{if((window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||window.navigator.standalone){document.documentElement.classList.add('lbs-app');}}catch(e){}}());</script>\n";
}, 1 );

// The theme's header asks for its viewport; let the portal reach under the notch.
add_filter( 'leithbass_viewport', function ( $content ) {
	return lbs_is_portal() ? $content . ', viewport-fit=cover' : $content;
} );
