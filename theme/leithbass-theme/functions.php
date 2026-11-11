<?php
/**
 * Leith Bass Space theme functions.
 *
 * @package LeithBass
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'LEITHBASS_VERSION', '3.20.0-alpha.1' );

/* -------------------------------------------------------------------------
 * Site-wide constants — edit these in one place.
 * ---------------------------------------------------------------------- */
define( 'LEITHBASS_EMAIL', 'jack@lostoscillation.com' ); // Used only as the contact-form mail-to target — never displayed.
define( 'LEITHBASS_INSTAGRAM', 'https://www.instagram.com/jackaud.io' );
define( 'LEITHBASS_LOSTOSC', 'https://lostosc.com' );
define( 'LEITHBASS_JACKAUDIO', 'https://jackaud.io' );


/* -------------------------------------------------------------------------
 * The pages. One place defines the nav label, the knockout word, the
 * descriptive H1 and the photo that runs through the letterforms.
 * ---------------------------------------------------------------------- */
function leithbass_pages() {
	$pages = array(
		'approach' => array(
			'nav'      => true,
			'label'    => 'Approach',
			'knock'    => 'APPROACH',
			'title'    => 'My Approach',
			'template' => 'page-templates/template-approach.php',
			'h1_key'   => 'approach_page_h1',
			'img'      => 'knock-approach',
			// How the page appears inside its own dropdown.
			'menu_label' => 'My approach',
			'menu_desc'  => 'How I teach, and what sessions are like',
			'menu_line'  => 'How I teach',
		),
		'portal'   => array(
			'nav'       => false,
			'parent'    => 'approach',
			'label'     => 'The Portal',
			'menu_desc' => 'Your notes, bookings and the Shed',
			'menu_line' => 'Notes, bookings and practice',
			'knock'     => 'PORTAL',
			'title'     => 'The Portal',
			'template'  => 'page-templates/template-portal.php',
			'h1_key'    => 'portal_page_h1',
			'img'       => 'knock-portal',
		),
		'shed'     => array(
			'nav'       => false,
			'parent'    => 'approach',
			'label'     => 'Shed tools',
			'menu_desc' => 'Try the practice tools',
			'menu_line' => 'Try the practice tools',
			'knock'     => 'SHED',
			'title'     => 'Shed tools',
			'template'  => 'page-templates/template-shed.php',
			'h1_key'    => 'shed_page_h1',
			'img'       => 'knock-shed',
		),
		'harmonic-elements' => array(
			'nav'       => false,
			'parent'    => 'approach',
			'label'     => 'Harmonic Elements',
			'menu_desc' => 'Chord changes: a guide to read and play, and a dojo for your ear',
			'menu_line' => 'Hear and play chord changes',
			'knock'     => 'ELEMENTS',
			'title'     => 'Harmonic Elements',
			'template'  => 'page-templates/template-harmonic.php',
			'h1_key'    => 'harmonic_page_h1',
			'img'       => 'knock-elements',
		),
		'ear-trainer' => array(
			'nav'       => false,
			'parent'    => 'approach',
			'label'     => 'Ear Training',
			'menu_desc' => 'Intervals, chords, scales, lines and progressions, against a tone centre',
			'menu_line' => 'Intervals, chords, lines and progressions by ear',
			'knock'     => 'EAR TRAINING',
			'title'     => 'Ear Training for Bass Players',
			'template'  => 'page-templates/template-ear.php',
			'h1_key'    => 'ear_page_h1',
			'img'       => 'knock-ear',
		),
		'read'     => array(
			'nav'       => false,
			'parent'    => 'approach',
			'label'     => 'Read',
			'menu_desc' => 'Reading notation for bass: a guide, and a dojo for your eyes and hands',
			'menu_line' => 'Read the dots, from the page to your hands',
			'knock'     => 'READ',
			'title'     => 'Read',
			'template'  => 'page-templates/template-read.php',
			'h1_key'    => 'read_page_h1',
			'img'       => 'knock-read',
		),
		'faq'      => array(
			'nav'       => false,
			'parent'    => 'approach',
			'label'     => 'FAQ',
			'menu_desc' => 'Questions before you start',
			'menu_line' => 'Questions before you start',
			'knock'     => 'FAQ',
			'title'     => 'FAQ',
			'template'  => 'page-templates/template-faq.php',
			'h1_key'    => 'faq_page_h1',
			'img'       => 'knock-faq',
		),
		'spaces'   => array(
			'nav'      => true,
			'label'    => 'The Space',
			'menu_line' => 'The studio in Leith',
			'knock'    => 'SPACE',
			'title'    => 'The Space',
			'template' => 'page-templates/template-spaces.php',
			'h1_key'   => 'spaces_page_h1',
			'img'      => 'knock-spaces',
		),
		'prices'   => array(
			'nav'      => true,
			'label'    => 'Prices',
			'menu_line' => 'Rates and booking',
			'knock'    => 'PRICES',
			'title'    => 'Prices & Booking',
			'template' => 'page-templates/template-prices.php',
			'h1_key'   => 'prices_page_h1',
			'img'      => 'knock-prices',
		),
		'contact'  => array(
			'nav'      => true,
			'label'    => 'Contact',
			'menu_line' => 'Get in touch',
			'knock'    => 'CONTACT',
			'title'    => 'Contact',
			'template' => 'page-templates/template-contact.php',
			'h1_key'   => 'contact_page_h1_v3',
			'img'      => 'knock-contact',
		),
		'privacy'  => array(
			'nav'      => false,
			'label'    => 'Privacy',
			'knock'    => 'PRIVACY',
			'title'    => 'Privacy',
			'template' => 'page-templates/template-privacy.php',
			'h1'       => 'Privacy notice',
			'img'      => 'knock-contact',
		),
		// Three of the Shed's tools on pages of their own, free for anyone (3.15.0).
		// 'tool' says which; 'under' is the page they belong beneath (they aren't in the menu).
		'metronome' => array(
			'nav'      => false,
			'under'    => 'shed',
			'tool'     => 'metronome',
			'label'    => 'Metronome',
			'knock'    => 'METRONOME',
			'title'    => 'Metronome',
			'template' => 'page-templates/template-tool.php',
			'h1_key'   => 'tool_metronome_h1',
			'img'      => 'knock-tools',
		),
		'drone'     => array(
			'nav'      => false,
			'under'    => 'shed',
			'tool'     => 'drone',
			'label'    => 'Drone',
			'knock'    => 'DRONE',
			'title'    => 'Drone',
			'template' => 'page-templates/template-tool.php',
			'h1_key'   => 'tool_drone_h1',
			'img'      => 'knock-tools',
		),
		'tuner'     => array(
			'nav'      => false,
			'under'    => 'shed',
			'tool'     => 'tuner',
			'label'    => 'Tuner',
			'knock'    => 'TUNER',
			'title'    => 'Tuner',
			'template' => 'page-templates/template-tool.php',
			'h1_key'   => 'tool_tuner_h1',
			'img'      => 'knock-tools',
		),
	);
	// Until Harmonic Elements and the ear trainer are launched, the menu says so.
	if ( ! leithbass_harmonic_live() ) {
		$pages['harmonic-elements']['menu_desc'] = 'Coming soon: a guide to chord changes, and a dojo for your ear';
		$pages['harmonic-elements']['menu_line'] = 'Coming soon';
	}
	if ( ! leithbass_ear_live() ) {
		$pages['ear-trainer']['menu_desc'] = 'Coming soon: intervals, chords, scales, lines and progressions';
		$pages['ear-trainer']['menu_line'] = 'Coming soon';
	}
	if ( ! leithbass_read_live() ) {
		$pages['read']['menu_desc'] = 'Coming soon: reading notation for bass';
		$pages['read']['menu_line'] = 'Coming soon';
	}
	return $pages;
}

/** The free tool pages: page address => which of the Shed's tools stands on it. */
function leithbass_tool_pages() {
	$tools = array();
	foreach ( leithbass_pages() as $slug => $page ) {
		if ( ! empty( $page['tool'] ) ) { $tools[ $slug ] = $page['tool']; }
	}
	return $tools;
}

/** Pages shown in the main header, footer and homepage navigation. */
function leithbass_nav_pages() {
	$nav = array_filter( leithbass_pages(), function ( $page ) {
		return ! empty( $page['nav'] );
	} );
	if ( function_exists( 'leithbass_notes_enabled' ) && leithbass_notes_enabled() ) {
		$contact = isset( $nav['contact'] ) ? $nav['contact'] : null;
		unset( $nav['contact'] );
		$nav['notes'] = array( 'nav' => true, 'label' => 'Notes', 'knock' => 'NOTES', 'img' => 'knock-notes', 'menu_line' => 'Writing on bass and practice' );
		if ( $contact ) { $nav['contact'] = $contact; }
	}
	if ( function_exists( 'lbs_nav_enabled' ) && lbs_nav_enabled() ) {
		// Tells a newcomer what the link is; a signed-in member sees their own space.
		$nav['members'] = array( 'nav' => true, 'label' => is_user_logged_in() ? 'Your portal' : 'Member sign in', 'signin' => true );
	}
	return $nav;
}

/**
 * The pages in a main navigation item's dropdown, the item itself first.
 * Empty for items without a dropdown.
 */
function leithbass_nav_children( $parent ) {
	$pages    = leithbass_pages();
	$children = array_filter( $pages, function ( $page ) use ( $parent ) {
		return isset( $page['parent'] ) && $parent === $page['parent'];
	} );
	if ( ! $children || ! isset( $pages[ $parent ] ) ) { return array(); }
	return array_merge( array( $parent => $pages[ $parent ] ), $children );
}

/** The main navigation item a page sits under: itself, or its dropdown parent. */
function leithbass_nav_section( $slug ) {
	$pages = leithbass_pages();
	return isset( $pages[ $slug ]['parent'] ) ? $pages[ $slug ]['parent'] : $slug;
}

/**
 * A small copy of a page's heading photograph for its menu word. Uses the
 * Media Library replacement when one is chosen, else the bundled 480px copy.
 */
function leithbass_nav_image_url( $img_slug ) {
	$attachment_id = leithbass_image_id( $img_slug );
	if ( $attachment_id ) {
		$url = wp_get_attachment_image_url( $attachment_id, 'medium_large' );
		if ( $url ) { return $url; }
	}
	$file = '/assets/img/' . $img_slug . '-480.webp';
	if ( is_readable( get_template_directory() . $file ) ) {
		return get_template_directory_uri() . $file;
	}
	return leithbass_img_url( $img_slug, 1280 );
}

/**
 * A menu word set like its page's heading: the photograph through the
 * letters, with the orange outline. Plain text for anything without a photo.
 */
function leithbass_nav_word( $page ) {
	$word = isset( $page['knock'] ) ? $page['knock'] : $page['label'];
	if ( empty( $page['img'] ) ) {
		return '<span class="nav-kn nav-kn-plain">' . esc_html( $word ) . '</span>';
	}
	$style = '--nav-img:url("' . esc_url( leithbass_nav_image_url( $page['img'] ) ) . '")';
	return '<span class="nav-kn" style="' . esc_attr( $style ) . '">' . esc_html( $word ) . '</span>';
}

/** True when the Leith Bass Members plugin is providing the portal. */
function leithbass_portal_active() {
	return function_exists( 'lbs_nav_enabled' ) || function_exists( 'lbs_is_portal' );
}

/* -------------------------------------------------------------------------
 * Setup
 * ---------------------------------------------------------------------- */
function leithbass_setup() {
	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'html5', array( 'search-form', 'gallery', 'caption', 'style', 'script' ) );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'align-wide' );
	add_theme_support( 'editor-styles' );
	add_editor_style( 'assets/css/editor.css' );
	add_image_size( 'leithbass-knockout', 1280, 1280, false );
	remove_theme_support( 'core-block-patterns' );
}
add_action( 'after_setup_theme', 'leithbass_setup' );

/* -------------------------------------------------------------------------
 * Assets
 * ---------------------------------------------------------------------- */
function leithbass_assets() {
	wp_enqueue_style( 'leithbass', get_stylesheet_uri(), array(), LEITHBASS_VERSION );
	wp_enqueue_script( 'leithbass', get_template_directory_uri() . '/assets/js/main.js', array(), LEITHBASS_VERSION, array( 'strategy' => 'defer', 'in_footer' => true ) );
}
add_action( 'wp_enqueue_scripts', 'leithbass_assets' );

/**
 * Return one of the theme's trusted inline SVG assets. A per-request cache
 * avoids reading the light wordmark twice for the header and footer.
 */
function leithbass_inline_svg( $filename ) {
	static $cache = array();
	$allowed = array( 'logo.svg', 'logo-light.svg' );
	if ( ! in_array( $filename, $allowed, true ) ) { return ''; }
	if ( ! isset( $cache[ $filename ] ) ) {
		$path = get_template_directory() . '/assets/img/' . $filename;
		$cache[ $filename ] = is_readable( $path ) ? (string) file_get_contents( $path ) : '';
	}
	return $cache[ $filename ];
}

/**
 * Preload the three deliberately retained font files and the current page's
 * hero image for fast, stable first rendering.
 */
function leithbass_preloads() {
	$dir = get_template_directory_uri();
	foreach ( array( 'oswald-latin-700-normal', 'inter-latin-400-normal', 'inter-latin-600-normal' ) as $f ) {
		echo '<link rel="preload" href="' . esc_url( $dir . '/assets/fonts/' . $f . '.woff2' ) . '" as="font" type="font/woff2" crossorigin>' . "\n";
	}

	$hero  = leithbass_hero_slug();
	$pages = leithbass_pages();
	if ( is_front_page() ) {
		$attachment_id = leithbass_image_id( 'hero-home' );
		if ( $attachment_id ) {
			$src    = wp_get_attachment_image_url( $attachment_id, 'full' );
			$srcset = wp_get_attachment_image_srcset( $attachment_id, 'full' );
			if ( $src ) {
				echo '<link rel="preload" as="image" href="' . esc_url( $src ) . '"' . ( $srcset ? ' imagesrcset="' . esc_attr( $srcset ) . '" imagesizes="(max-width: 900px) 100vw, 60vw"' : '' ) . ' fetchpriority="high">' . "\n";
			}
		} else {
			$img = $dir . '/assets/img/hero-home';
			echo '<link rel="preload" as="image" href="' . esc_url( $img . '-2048.webp' ) . '" imagesrcset="' . esc_attr( "$img-640.webp 640w, $img-1280.webp 1280w, $img-2048.webp 2048w" ) . '" imagesizes="(max-width: 900px) 100vw, 60vw" fetchpriority="high">' . "\n";
		}
	} elseif ( isset( $pages[ $hero ] ) ) {
		echo '<link rel="preload" as="image" href="' . esc_url( leithbass_img_url( $pages[ $hero ]['img'], 1280 ) ) . '" fetchpriority="high">' . "\n";
	} elseif ( 'notes' === $hero && is_post_type_archive( 'leithbass_note' ) ) {
		echo '<link rel="preload" as="image" href="' . esc_url( leithbass_img_url( 'knock-notes', 1280 ) ) . '" fetchpriority="high">' . "\n";
	}
	echo '<link rel="icon" href="' . esc_url( $dir . '/assets/img/favicon.svg' ) . '" type="image/svg+xml">' . "\n";
}
add_action( 'wp_head', 'leithbass_preloads', 2 );

/** Output Google Search Console's verification tag once its code is saved. */
function leithbass_google_site_verification() {
	$code = preg_replace( '/[^A-Za-z0-9_-]/', '', (string) leithbass_val( 'google_site_verification' ) );
	if ( $code ) {
		echo '<meta name="google-site-verification" content="' . esc_attr( $code ) . '">' . "\n";
	}
}
add_action( 'wp_head', 'leithbass_google_site_verification', 3 );

/**
 * Which hero image does the current page use?
 */
function leithbass_hero_slug() {
	if ( function_exists( 'lbs_is_portal' ) && lbs_is_portal() ) { return 'members'; }
	if ( is_front_page() ) { return 'home'; }
	if ( is_post_type_archive( 'leithbass_note' ) || is_singular( 'leithbass_note' ) ) { return 'notes'; }
	$tpl   = get_page_template_slug();
	$tpl   = $tpl ? basename( $tpl ) : '';
	$pages = leithbass_pages();
	// Pages that share a template (the free tools) are told apart by their own address.
	if ( $tpl && is_page() ) {
		$here = (string) get_post_field( 'post_name', get_queried_object_id() );
		if ( isset( $pages[ $here ] ) && basename( $pages[ $here ]['template'] ) === $tpl ) { return $here; }
	}
	foreach ( $pages as $slug => $p ) {
		if ( basename( $p['template'] ) === $tpl ) { return $slug; }
	}
	return '';
}

/* -------------------------------------------------------------------------
 * Performance: strip what this site doesn't use.
 * ---------------------------------------------------------------------- */
function leithbass_cleanup() {
	remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
	remove_action( 'wp_print_styles', 'print_emoji_styles' );
	remove_action( 'admin_print_scripts', 'print_emoji_detection_script' );
	remove_action( 'admin_print_styles', 'print_emoji_styles' );
	remove_action( 'wp_head', 'wp_generator' );
	remove_action( 'wp_head', 'wlwmanifest_link' );
	remove_action( 'wp_head', 'rsd_link' );
	remove_action( 'wp_head', 'wp_shortlink_wp_head' );
	remove_action( 'wp_head', 'rest_output_link_wp_head' );
	remove_action( 'wp_head', 'wp_oembed_add_discovery_links' );
	remove_action( 'wp_head', 'wp_oembed_add_host_js' );
	remove_action( 'wp_head', 'rel_canonical' );
}
add_action( 'init', 'leithbass_cleanup' );

/** The sites serve a UK audience even when WordPress is configured en_US. */
add_filter( 'language_attributes', function ( $output ) {
	return preg_replace( '/lang=(["\'])en-US\1/i', 'lang=$1en-GB$1', $output );
} );

function leithbass_dequeue_styles() {
	if ( ! is_singular( 'leithbass_note' ) ) {
		wp_dequeue_style( 'wp-block-library' );
		wp_dequeue_style( 'wp-block-library-theme' );
	}
	wp_dequeue_style( 'classic-theme-styles' );
	wp_dequeue_style( 'global-styles' );
}
add_action( 'wp_enqueue_scripts', 'leithbass_dequeue_styles', 100 );

/* -------------------------------------------------------------------------
 * External links open in a new tab.
 * ---------------------------------------------------------------------- */

/** Hosts that count as "this site" and so stay in the current tab. */
function leithbass_internal_hosts() {
	$hosts = array();
	foreach ( array( home_url(), site_url() ) as $url ) {
		$h = wp_parse_url( $url, PHP_URL_HOST );
		if ( $h ) { $hosts[] = strtolower( preg_replace( '/^www\./i', '', $h ) ); }
	}
	/** Filterable so extra first-party hosts can be treated as internal. */
	return array_unique( apply_filters( 'leithbass_internal_hosts', $hosts ) );
}

/** True when a href points somewhere off this site. */
function leithbass_is_external_url( $href ) {
	$href = trim( (string) $href );
	if ( '' === $href ) { return false; }
	// Anchors, relative paths, mail/tel/sms and javascript: are never external.
	if ( preg_match( '#^(/|\#|\?|\.)#', $href ) ) { return false; }
	if ( preg_match( '#^(mailto|tel|sms|javascript|data):#i', $href ) ) { return false; }
	$host = wp_parse_url( $href, PHP_URL_HOST );
	if ( ! $host ) { return false; }
	$host = strtolower( preg_replace( '/^www\./i', '', $host ) );
	return ! in_array( $host, leithbass_internal_hosts(), true );
}

/**
 * Add target="_blank" and rel="noopener noreferrer" to every off-site link in
 * a block of HTML. Existing target and rel attributes are respected/merged.
 */
function leithbass_external_links( $html ) {
	if ( ! is_string( $html ) || false === stripos( $html, '<a ' ) ) { return $html; }

	return preg_replace_callback(
		'#<a\s([^>]*)>#i',
		function ( $m ) {
			$attrs = $m[1];
			if ( ! preg_match( '#href\s*=\s*("|\')(.*?)\1#is', $attrs, $h ) ) { return $m[0]; }
			if ( ! leithbass_is_external_url( html_entity_decode( $h[2], ENT_QUOTES, 'UTF-8' ) ) ) { return $m[0]; }

			// Merge rel values, keeping anything already there (e.g. rel="me").
			$rel = array( 'noopener', 'noreferrer' );
			if ( preg_match( '#rel\s*=\s*("|\')(.*?)\1#is', $attrs, $r ) ) {
				$rel   = array_unique( array_filter( array_merge( preg_split( '/\s+/', trim( $r[2] ) ), $rel ) ) );
				$attrs = str_replace( $r[0], '', $attrs );
			}
			// Drop any existing target so we do not end up with two.
			$attrs = preg_replace( '#target\s*=\s*("|\').*?\1#is', '', $attrs );

			$attrs = trim( preg_replace( '/\s+/', ' ', $attrs ) );
			return '<a ' . $attrs . ' target="_blank" rel="' . esc_attr( implode( ' ', $rel ) ) . '">';
		},
		$html
	);
}

// Post/page/note body copy, excerpts, widgets and comment text.
add_filter( 'the_content', 'leithbass_external_links', 25 );
add_filter( 'the_excerpt', 'leithbass_external_links', 25 );
add_filter( 'widget_text_content', 'leithbass_external_links', 25 );
add_filter( 'comment_text', 'leithbass_external_links', 25 );
// Editable theme content (see leithbass_text()).
add_filter( 'leithbass_rendered_html', 'leithbass_external_links', 25 );

/* -------------------------------------------------------------------------
 * Template helpers
 * ---------------------------------------------------------------------- */

/**
 * Responsive theme image tag.
 */
function leithbass_img( $slug, $widths, $alt, $sizes = '(min-width: 800px) 50vw, 100vw', $eager = false ) {
	$attachment_id = leithbass_image_id( $slug );
	$focal         = leithbass_image_setting( $slug, 'focal', 50 );
	if ( $attachment_id ) {
		$media_alt = trim( (string) get_post_meta( $attachment_id, '_wp_attachment_image_alt', true ) );
		$attrs     = array(
			'alt'      => $media_alt ? $media_alt : $alt,
			'sizes'    => $sizes,
			'decoding' => 'async',
			'style'    => '--image-focal-y:' . $focal . '%',
		);
		if ( $eager ) {
			$attrs['fetchpriority'] = 'high';
			$attrs['loading']       = false;
		} else {
			$attrs['loading'] = 'lazy';
		}
		echo wp_get_attachment_image( $attachment_id, 'full', false, $attrs );
		return;
	}

	$widths = array_values( array_unique( array_filter( array_map( 'absint', (array) $widths ) ) ) );
	sort( $widths, SORT_NUMERIC );
	if ( ! $widths ) { return; }

	$dir    = get_template_directory_uri() . '/assets/img/';
	$srcset = array();
	foreach ( $widths as $w ) {
		$srcset[] = $dir . $slug . '-' . $w . '.webp ' . $w . 'w';
	}
	$largest = max( $widths );
	$src     = $dir . $slug . '-' . $largest . '.webp';
	$path    = get_template_directory() . '/assets/img/' . $slug . '-' . $largest . '.webp';
	$dims    = is_readable( $path ) ? getimagesize( $path ) : false;
	$size    = $dims ? ' width="' . absint( $dims[0] ) . '" height="' . absint( $dims[1] ) . '"' : '';
	$attr    = $eager ? 'loading="eager" fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"';
	echo '<img src="' . esc_url( $src ) . '" srcset="' . esc_attr( implode( ', ', $srcset ) ) . '" sizes="' . esc_attr( $sizes ) . '" alt="' . esc_attr( $alt ) . '" style="--image-focal-y:' . esc_attr( $focal ) . '%"' . $size . ' ' . $attr . '>';
}

/**
 * URL of a theme image at a given width.
 */
function leithbass_img_url( $slug, $width ) {
	$attachment_id = leithbass_image_id( $slug );
	if ( $attachment_id ) {
		$size = $width <= 1280 ? 'leithbass-knockout' : 'full';
		$url  = wp_get_attachment_image_url( $attachment_id, $size );
		if ( $url ) { return $url; }
	}
	return get_template_directory_uri() . '/assets/img/' . $slug . '-' . $width . '.webp';
}

/**
 * Knockout type: a word set enormous with a photograph running through the
 * letterforms, drifting behind them as you scroll. Decorative by design —
 * every page still carries a real <h1>.
 */
function leithbass_knock( $text, $img_slug, $class = '', $range = '46', $decorative = true, $eager = false ) {
	$range = leithbass_image_setting( $img_slug, 'motion', $range );
	$focal = leithbass_image_setting( $img_slug, 'focal', 50 );
	$url   = leithbass_img_url( $img_slug, 1280 );
	$a11y  = $decorative ? ' aria-hidden="true"' : '';
	$classes = trim( 'knock ' . $class . ( $eager ? ' has-image' : '' ) );
	$style   = ( $eager ? 'background-image:url("' . $url . '");' : '' ) . 'background-position:center ' . $focal . '%';
	$image   = ' class="' . esc_attr( $classes ) . '" style="' . esc_attr( $style ) . '"';
	if ( ! $eager ) {
		$image .= ' data-knockout-image="' . esc_url( $url ) . '"';
	}
	printf(
		'<span%1$s%2$s data-parallax-bg="%3$s" data-parallax-focal="%4$s">%5$s</span>',
		$image,
		$a11y,
		esc_attr( $range ),
		esc_attr( $focal ),
		esc_html( $text )
	);
}

/**
 * Standard opener for an inner page: knockout word, then the descriptive h1.
 */
function leithbass_page_head( $slug, $subtitle = '' ) {
	$pages = leithbass_pages();
	if ( ! isset( $pages[ $slug ] ) ) { return; }
	$p = $pages[ $slug ];
	?>
	<header class="pagehead pagehead-<?php echo esc_attr( $slug ); ?><?php echo empty( $p['tool'] ) ? '' : ' pagehead-tool'; ?>">
		<div class="wrap">
			<?php leithbass_knock( $p['knock'], $p['img'], '', '46', true, true ); ?>
			<h1><?php echo esc_html( isset( $p['h1_key'] ) ? leithbass_val( $p['h1_key'] ) : $p['h1'] ); ?></h1>
			<?php if ( $subtitle ) : ?><p class="subtitle"><?php echo wp_kses_post( $subtitle ); ?></p><?php endif; ?>
		</div>
	</header>
	<?php
}

/**
 * Full-bleed parallax image band between sections.
 */
function leithbass_band( $img_slug, $widths, $alt = '', $speed = '0.82', $class = '', $focal = '50%' ) {
	$motion = leithbass_image_setting( $img_slug, 'motion', (float) $speed * 100 ) / 100;
	$focal  = leithbass_image_setting( $img_slug, 'focal', (float) $focal );
	?>
	<div class="band <?php echo esc_attr( $class ); ?>">
		<div class="band-media" data-parallax="<?php echo esc_attr( $motion ); ?>" style="--band-focal-y: <?php echo esc_attr( $focal ); ?>%">
			<?php leithbass_img( $img_slug, $widths, $alt, '100vw' ); ?>
		</div>
	</div>
	<?php
}

/**
 * The contact form. Lives on the Contact page.
 */
function leithbass_contact_form() {
	$status = isset( $_GET['contact'] ) ? sanitize_text_field( wp_unslash( $_GET['contact'] ) ) : '';
	// After an error, put back what they typed (kept briefly on the server, never in the URL).
	$kept = array( 'name' => '', 'email' => '', 'message' => '' );
	if ( 'sent' !== $status && isset( $_GET['cf'] ) ) {
		$saved = get_transient( 'leithbass_cf_' . sanitize_key( wp_unslash( $_GET['cf'] ) ) );
		if ( is_array( $saved ) ) { $kept = array_merge( $kept, $saved ); }
	}
	?>
	<?php if ( 'sent' === $status ) : ?>
		<p class="form-notice form-notice-success" role="status" tabindex="-1">Thanks &mdash; your message is on its way. I&rsquo;ll be in touch soon.</p>
	<?php elseif ( 'invalid' === $status ) : ?>
		<p class="form-notice form-notice-error" role="alert" tabindex="-1">Please fill in your name, a valid email address and a message.</p>
	<?php elseif ( 'wait' === $status ) : ?>
		<p class="form-notice form-notice-error" role="alert" tabindex="-1">That was quick &mdash; please wait a moment and try again.</p>
	<?php elseif ( 'error' === $status ) : ?>
		<p class="form-notice form-notice-error" role="alert" tabindex="-1">Something went wrong sending your message. Please try again, or reach out via Instagram instead.</p>
	<?php endif; ?>

	<form class="contact-form" id="contact-form" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
		<input type="hidden" name="action" value="leithbass_contact">
		<?php wp_nonce_field( 'leithbass_contact', 'leithbass_contact_nonce' ); ?>
		<div class="hp-field" aria-hidden="true">
			<label for="lb-website">Leave this field blank</label>
			<input type="text" id="lb-website" name="website" tabindex="-1" autocomplete="off">
		</div>
		<div class="field">
			<label for="lb-name">Name</label>
			<input type="text" id="lb-name" name="name" autocomplete="name" required value="<?php echo esc_attr( $kept['name'] ); ?>">
		</div>
		<div class="field">
			<label for="lb-email">Email</label>
			<input type="email" id="lb-email" name="email" autocomplete="email" required value="<?php echo esc_attr( $kept['email'] ); ?>">
		</div>
		<div class="field">
			<label for="lb-message">Where are you with the bass?</label>
			<textarea id="lb-message" name="message" rows="6" required><?php echo esc_textarea( $kept['message'] ); ?></textarea>
		</div>
		<button class="btn" type="submit">Send message</button>
		<p class="form-privacy">I&rsquo;ll use the details you send only to respond to your enquiry. See the <a href="<?php echo esc_url( home_url( '/privacy/' ) ); ?>">privacy notice</a>.</p>
	</form>
	<?php
}

/* -------------------------------------------------------------------------
 * SEO
 * ---------------------------------------------------------------------- */
require_once get_template_directory() . '/inc/content.php';
require_once get_template_directory() . '/inc/notes.php';
require_once get_template_directory() . '/inc/customizer.php';
require_once get_template_directory() . '/inc/seo.php';
require_once get_template_directory() . '/inc/contact.php';
require_once get_template_directory() . '/inc/admin.php';
require_once get_template_directory() . '/inc/pages.php';
// The member portal lives in the Leith Bass Members plugin from 3.6.1.

/* -------------------------------------------------------------------------
 * Keep WordPress starter content and thin utility URLs out of search.
 * ---------------------------------------------------------------------- */
add_action( 'template_redirect', function () {
	$map = array(
		'/hello-world' => '/',
		'/sample-page' => '/',
	);
	$path = untrailingslashit( wp_parse_url( wp_unslash( $_SERVER['REQUEST_URI'] ), PHP_URL_PATH ) );
	if ( isset( $map[ $path ] ) ) {
		wp_safe_redirect( home_url( $map[ $path ] ), 301 );
		exit;
	}
}, 2 );

/** Use the curated sitemap below instead of core's broad default sitemap. */
add_filter( 'wp_sitemaps_enabled', '__return_false' );

/** Keep utility and thin archive pages accessible to people but out of search. */
add_filter( 'wp_robots', function ( $robots ) {
	if ( is_page( 'privacy' ) || is_author() || is_category() || is_tag() || is_date() || is_search() || is_attachment() || ( function_exists( 'leithbass_is_notes_request' ) && leithbass_is_notes_request() && ! leithbass_notes_enabled() ) ) {
		unset( $robots['index'], $robots['nofollow'] );
		$robots['noindex'] = true;
		$robots['follow']  = true;
	}
	return $robots;
} );

/* -------------------------------------------------------------------------
 * A small, self-contained XML sitemap at /sitemap.xml — no rewrite-rule
 * flush required, since it hooks the request before WP's 404 handling.
 * ---------------------------------------------------------------------- */
add_action( 'template_redirect', function () {
	if ( function_exists( 'leithbass_has_seo_plugin' ) && leithbass_has_seo_plugin() ) { return; }
	if ( '/sitemap.xml' !== parse_url( $_SERVER['REQUEST_URI'], PHP_URL_PATH ) ) {
		return;
	}
	header( 'Content-Type: application/xml; charset=UTF-8' );
	// WordPress has already marked /sitemap.xml as not found; this is the page.
	status_header( 200 );
	$urls     = array();
	$front_id = (int) get_option( 'page_on_front' );
	if ( $front_id && 'publish' === get_post_status( $front_id ) ) {
		$urls['/'] = $front_id;
	}
	foreach ( array( 'approach', 'portal', 'shed', 'metronome', 'drone', 'tuner', 'harmonic-elements', 'ear-trainer', 'read', 'faq', 'spaces', 'prices', 'contact' ) as $slug ) {
		if ( 'harmonic-elements' === $slug && ! leithbass_harmonic_live() ) { continue; } // only a Coming Soon page until it's launched
		if ( 'ear-trainer' === $slug && ! leithbass_ear_live() ) { continue; }
		if ( 'read' === $slug && ! leithbass_read_live() ) { continue; }
		$page = get_page_by_path( $slug );
		if ( $page && 'publish' === $page->post_status ) {
			$urls[ '/' . $slug . '/' ] = $page->ID;
		}
	}
	if ( function_exists( 'leithbass_notes_enabled' ) && leithbass_notes_enabled() ) {
		$note_ids = get_posts( array(
			'post_type'      => 'leithbass_note',
			'post_status'    => 'publish',
			'posts_per_page' => -1,
			'orderby'        => 'modified',
			'order'          => 'DESC',
			'fields'         => 'ids',
			'no_found_rows'  => true,
		) );
		if ( $note_ids ) {
			$urls['/notes/'] = $note_ids[0];
			foreach ( $note_ids as $note_id ) {
				$note_path = wp_parse_url( get_permalink( $note_id ), PHP_URL_PATH );
				if ( $note_path ) { $urls[ $note_path ] = $note_id; }
			}
		}
	}
	echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
	echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
	foreach ( $urls as $path => $post_id ) {
		$lastmod = get_post_modified_time( 'U', true, $post_id );
		// Page copy is edited in Leith Bass Content, not the page itself.
		$content_ts = (int) get_option( 'leithbass_content_modified', 0 );
		if ( 'leithbass_note' !== get_post_type( $post_id ) && '/notes/' !== $path && $content_ts > (int) $lastmod ) { $lastmod = $content_ts; }
		$lastmod = $lastmod ? gmdate( 'c', (int) $lastmod ) : '';
		echo '<url><loc>' . esc_xml( home_url( $path ) ) . '</loc>';
		if ( $lastmod ) {
			echo '<lastmod>' . esc_xml( $lastmod ) . '</lastmod>';
		}
		echo '</url>' . "\n";
	}
	echo '</urlset>';
	exit;
}, 1 ); // Priority 1: must run before core's redirect_canonical (priority 10),
// which otherwise redirects /sitemap.xml to /wp-sitemap.xml first and 404s.

/** Point crawlers at the sitemap from robots.txt. */
add_filter( 'robots_txt', function ( $output ) {
	if ( function_exists( 'leithbass_has_seo_plugin' ) && leithbass_has_seo_plugin() ) { return $output; }
	$output = preg_replace( '/^Sitemap:.*$/mi', '', $output );
	return rtrim( $output ) . "\n\nSitemap: " . home_url( '/sitemap.xml' ) . "\n";
} );

/* -------------------------------------------------------------------------
 * One-time setup on theme activation: create the pages and assign templates.
 * ---------------------------------------------------------------------- */
function leithbass_activate() {
	$pages = array( 'home' => array( 'title' => 'Home', 'template' => '' ) );
	foreach ( leithbass_pages() as $slug => $p ) {
		$pages[ $slug ] = array( 'title' => $p['title'], 'template' => $p['template'] );
	}
	foreach ( $pages as $slug => $p ) {
		$page = get_page_by_path( $slug );
		if ( ! $page ) {
			$id = wp_insert_post( array(
				'post_title'   => $p['title'],
				'post_name'    => $slug,
				'post_type'    => 'page',
				'post_status'  => 'publish',
				'post_content' => '',
			) );
		} else {
			$id = $page->ID;
		}
		if ( $id && $p['template'] ) {
			update_post_meta( $id, '_wp_page_template', $p['template'] );
		}
		if ( 'home' === $slug && $id ) {
			update_option( 'show_on_front', 'page' );
			update_option( 'page_on_front', $id );
		}
	}
	flush_rewrite_rules();
}
add_action( 'after_switch_theme', 'leithbass_activate' );

/* -------------------------------------------------------------------------
 * 3.4.0 content migration: retire the free-introductory-session copy.
 *
 * Wording saved in the Customizer is stored as a theme_mod and takes priority
 * over the defaults shipped in the content registry, so a theme update alone
 * cannot change it. This clears the saved value for the affected fields when
 * it is still the old shipped wording (or still carries the retired phrases),
 * which restores the new bundled default. Anything genuinely rewritten by hand
 * that does not mention the old offer is left exactly as it is.
 * ---------------------------------------------------------------------- */
function leithbass_migrate_intro_copy() {
	$keys = array(
		'home_blurb_prices', 'home_close_kicker', 'home_close_heading_v3', 'home_close_body',
		'approach_cta_body', 'spaces_cta_body',
		'prices_start_body', 'prices_card1_title', 'prices_card1_price', 'prices_card1_body',
		'prices_card2_body', 'prices_points_a', 'prices_cta_body',
		'contact_page_h1_v3', 'contact_body',
		'notes_service_body_v3',
		'seo_home_desc', 'seo_prices_desc_v3', 'seo_contact_title_v3', 'seo_contact_desc_v3',
	);

	// Wording retired in 3.4.0. Matched loosely so a lightly edited copy is caught too.
	$retired = array(
		'/\bfree\b[^.]{0,40}\bintroductory\b/i',
		'/\bintroductory\b[^.]{0,40}\bfree\b/i',
		'/longer sessions are very welcome/i',
		'/costs? you nothing/i',
		'/it costs nothing/i',
		'/\bfree\b\s*(<[^>]+>)?\s*20/i',
		'/20\s*(&ndash;|&#8211;|–|-)\s*30 minute/i',
		'/no obligation on either side/i',
	);

	foreach ( $keys as $key ) {
		$mod = get_theme_mod( 'leithbass_' . $key, null );
		if ( null === $mod || '' === trim( (string) $mod ) ) { continue; }

		$plain = html_entity_decode( wp_strip_all_tags( (string) $mod ), ENT_QUOTES, 'UTF-8' );
		$plain = trim( preg_replace( '/\s+/', ' ', $plain ) );

		foreach ( $retired as $pattern ) {
			if ( preg_match( $pattern, $plain ) || preg_match( $pattern, (string) $mod ) ) {
				remove_theme_mod( 'leithbass_' . $key );
				break;
			}
		}
	}
}

/* -------------------------------------------------------------------------
 * 3.5.0 content migration: one teaching space, not two.
 *
 * The Library section, its address line and its schema entry are gone from the
 * templates. This clears any Customizer wording that still describes a second
 * room, so the single-studio defaults come through, and drops the saved values
 * for the three retired Library fields so they do not linger in the database.
 * ---------------------------------------------------------------------- */
function leithbass_migrate_single_space() {
	// Fields that no longer exist: remove their saved values outright.
	foreach ( array( 'spaces_library_title', 'spaces_library_sub', 'spaces_library_body', 'library_address' ) as $gone ) {
		remove_theme_mod( 'leithbass_' . $gone );
	}

	$keys = array(
		'spaces_page_h1', 'spaces_opening', 'spaces_cta_heading', 'spaces_cta_body',
		'home_blurb_spaces', 'seo_home_desc', 'seo_spaces_title', 'seo_spaces_desc',
	);

	// Wording that describes a second space.
	$retired = array(
		'/\blibrary\b/i',
		'/\bnorth fort\b/i',
		'/two (rooms|spaces|teaching)/i',
		'/teaching (room|space)/i',
		'/either space/i',
		'/come and see them/i',
		'/a quiet room/i',
		'/both in leith/i',
	);

	foreach ( $keys as $key ) {
		$mod = get_theme_mod( 'leithbass_' . $key, null );
		if ( null === $mod || '' === trim( (string) $mod ) ) { continue; }

		$plain = html_entity_decode( wp_strip_all_tags( (string) $mod ), ENT_QUOTES, 'UTF-8' );
		$plain = trim( preg_replace( '/\s+/', ' ', $plain ) );

		foreach ( $retired as $pattern ) {
			if ( preg_match( $pattern, $plain ) ) {
				remove_theme_mod( 'leithbass_' . $key );
				break;
			}
		}
	}
}

/* -------------------------------------------------------------------------
 * 3.7.0 content migration: the Portal, the FAQ and clearer next steps.
 *
 * Saving a Leith Bass Content tab stores every field on it, so wording that
 * was never actually changed is still held as a saved value and would hide
 * the new defaults. This clears a saved value only when it still matches the
 * 3.6.1 wording (ignoring formatting). Anything rewritten by hand is kept.
 * ---------------------------------------------------------------------- */
function leithbass_migration_plain( $html ) {
	$text = html_entity_decode( wp_strip_all_tags( (string) $html ), ENT_QUOTES, 'UTF-8' );
	$text = str_replace( array( "\xC2\xA0", '&nbsp;' ), ' ', $text );
	return trim( preg_replace( '/\s+/u', ' ', $text ) );
}

function leithbass_migrate_portal_copy() {
	$retired = array(
		'home_blurb_approach' => 'Collaborative sessions built around your goals, whether that&rsquo;s your first note, an exam, a tour, or the next level.',
		'home_close_cta_label' => 'Arrange an introductory session',
		'home_close_body' => 'Half an hour to meet, talk about where you&rsquo;d like to get to, and see how we work together. Get in touch about lessons and we&rsquo;ll arrange one.',
		'approach_s1_body_a' => 'I think of our time together as sessions rather than lessons: time spent working on your goals, your playing and your musicianship. I bring experience, knowledge and resources (and yes, sometimes a lesson plan and a whiteboard), but it&rsquo;s never a hierarchical teacher-and-student relationship. I may well learn as much from you as you learn from me.',
		'approach_s3_title' => 'Support between sessions',
		'approach_s3_sub' => 'The learning continues after you leave',
		'approach_s3_body' => 'After each session I send a written summary covering what we worked on, next steps, and any relevant materials, at no extra charge. You&rsquo;re welcome to keep your own notes too, and where we both feel it would help, there&rsquo;s the option to record sessions.',
		'prices_enquire_v2' => 'I&rsquo;m currently opening a small number of new teaching slots. To enquire about a session or a regular time, <a href="/contact/">send a message</a>.',
		'prices_points_b' => 'Confirmed sessions can move: by mutual agreement, at any time.
48 hours&rsquo; notice reschedules at no cost: shorter notice usually means the fee is forfeited, though I apply discretion when life happens.
Every session includes a written summary: what we covered, next steps and materials, at no extra charge.',
		'contact_body' => 'Complete beginner, returning after twenty years off, or already gigging and after a coach&rsquo;s ear. A sentence or two is plenty, and we&rsquo;ll arrange an introductory session from there.',
	);

	foreach ( $retired as $key => $old ) {
		$mod = get_theme_mod( 'leithbass_' . $key, null );
		if ( null === $mod ) { continue; }
		if ( leithbass_migration_plain( $mod ) === leithbass_migration_plain( $old ) ) {
			remove_theme_mod( 'leithbass_' . $key );
		}
	}

	// The booking points may have been edited elsewhere; swap just the summary line.
	$points = get_theme_mod( 'leithbass_prices_points_b', null );
	if ( null !== $points ) {
		$registry = leithbass_content_registry();
		$new_line = preg_split( '/\r\n|\r|\n/', $registry['prices_points_b'][3] );
		$new_line = end( $new_line );
		$lines    = preg_split( '/(\r\n|\r|\n)/', (string) $points, -1, PREG_SPLIT_DELIM_CAPTURE );
		$changed  = false;
		foreach ( $lines as $i => $line ) {
			if ( 0 === stripos( leithbass_migration_plain( $line ), 'Every session includes a written summary' ) ) {
				// Keep any paragraph wrapper the editor added around the line.
				$lines[ $i ] = preg_match( '#^(\s*<p[^>]*>)#i', $line, $open ) ? $open[1] . $new_line . '</p>' : $new_line;
				$changed     = true;
			}
		}
		if ( $changed ) { set_theme_mod( 'leithbass_prices_points_b', implode( '', $lines ) ); }
	}
}

/* -------------------------------------------------------------------------
 * 3.8.1 content migration: the Practice Room becomes the Shed.
 *
 * Clears saved wording that still matches the 3.8.0 defaults, so the new
 * defaults show. The payment line on Prices gains the introductory-session
 * exception even where the rest of that field has been edited.
 * ---------------------------------------------------------------------- */
function leithbass_migrate_shed_copy() {
	$retired = array(
		'approach_s3_body' => 'Most of your progress happens between sessions, so I make sure you&rsquo;re never guessing what to work on. After each session I write up what we covered, This week&rsquo;s objectives, and any worksheets or backing tracks that go with them. It all lands in your own member portal, alongside your bookings and a Practice Room, at no extra cost. Where we both feel it would help, we can record sessions too.

<a href="/portal/">See how the Portal works</a>',
		'portal_page_h1' => 'Session notes, bookings and a Practice Room, all in one place',
		'portal_opening' => 'Most of your progress happens between sessions, so I make sure you&rsquo;re never guessing what to work on.

After each session I write up what we covered, This week&rsquo;s objectives, and any worksheets, backing tracks or recordings that go with them. It all lands in your own member portal, which comes with your sessions at no extra cost. Your bookings sit alongside, and so does a Practice Room for the work you do on your own.',
		'portal_shot3_title' => 'Practice Room',
		'portal_practice_sub' => 'Practice Room',
		'portal_practice_title' => 'A place for the work you do on your own',
		'portal_practice_body' => 'The Practice Room is a set of simple tools for the time between sessions. You choose which ones you use, and which ones I can see.',
		'portal_practice_aside' => 'I use the Practice Room for my own practice too.',
		'portal_practice_tools' => 'Practice diary: a line or two after each practice: what you played, for how long, and what you noticed. Patterns show up quickly.
Tempo tracker: log the tempo you can play something cleanly and watch it climb, one honest step at a time.
Questions for Jack: save a question when it occurs to you, rather than trying to remember it on the way to the studio.
Recordings: send me a recording of yourself playing, and I&rsquo;ll listen before we next meet so we can start from where you are.',
		'faq_group2_body' => '<h3>What is the Portal?</h3>
Your own private space on this site. After each session I write up what we covered and This week&rsquo;s objectives, and attach any worksheets or backing tracks. Your bookings are there too, along with a Practice Room for your diary, tempos and questions. It&rsquo;s included with your sessions. <a href="/portal/">See how the Portal works</a>.

<h3>How do the blocks of ten hours work?</h3>
Ten hours for &pound;360 (a &pound;40 saving), diarised up front and valid for four months. The Portal shows how much time you have left, what&rsquo;s booked, and when the block ends.

<h3>What if I need to cancel or move a session?</h3>
Confirmed sessions can move by mutual agreement at any time. With 48 hours&rsquo; notice there&rsquo;s no charge; with less notice the fee is usually forfeited, though I use discretion when life happens. You can ask to move a session straight from the Portal.',
		'prices_points_a' => 'An hour is the default: shorter and longer sessions can be arranged on request, charged pro rata.
Booking is by the contact form: we&rsquo;ll find times that suit you, as a one-off or a weekly slot.
Payment in advance confirms your session: unpaid sessions aren&rsquo;t held, so the time may be taken by other bookings.
Everything goes in the calendar: sessions are diarised in Google Calendar and invites shared with you, so we&rsquo;re always working from the same information.',
		'prices_points_b' => 'Confirmed sessions can move: by mutual agreement, at any time.
48 hours&rsquo; notice reschedules at no cost: shorter notice usually means the fee is forfeited, though I apply discretion when life happens.
Notes and your member portal are included: after each session you get a written summary, This week&rsquo;s objectives and any materials, all kept in <a href="/portal/">your own login</a> with your bookings and a Practice Room.',
		'seo_portal_desc' => 'Every bassist working with Jack gets a private member portal: written notes after each session, worksheets and backing tracks, bookings, and a Practice Room with a diary and tempo tracker.',
	);
	foreach ( $retired as $key => $old ) {
		$mod = get_theme_mod( 'leithbass_' . $key, null );
		if ( null !== $mod && leithbass_migration_plain( $mod ) === leithbass_migration_plain( $old ) ) {
			remove_theme_mod( 'leithbass_' . $key );
		}
	}
	// Any remaining saved wording: swap "a Practice Room" / "the Practice Room" for "the Shed".
	foreach ( array_keys( $retired ) as $key ) {
		$mod = get_theme_mod( 'leithbass_' . $key, null );
		if ( null === $mod || false === stripos( (string) $mod, 'Practice Room' ) ) { continue; }
		$new = preg_replace_callback( '/\b(a|the)\s+Practice Room\b/i', function ( $m ) { return ctype_upper( $m[1][0] ) ? 'The Shed' : 'the Shed'; }, (string) $mod );
		$new = str_ireplace( 'Practice Room', 'The Shed', $new );
		set_theme_mod( 'leithbass_' . $key, $new );
	}
	// The payment rule and its exception.
	$points = get_theme_mod( 'leithbass_prices_points_a', null );
	if ( null !== $points && false !== stripos( (string) $points, 'Payment in advance' ) && false === stripos( (string) $points, 'introductory session can be paid' ) ) {
		$new = preg_replace( '/(so the time may be taken by other bookings\.)/i', '$1 The introductory session can be paid on the day or by invoice afterwards.', (string) $points, 1 );
		if ( $new !== $points ) { set_theme_mod( 'leithbass_prices_points_a', $new ); }
	}
}

/**
 * 3.9.0 content migration: wording for the new Shed tools (member portal 1.2.0)
 * and the Google Calendar sync. Saved wording that still matches the 3.8.1
 * defaults is cleared, so the new defaults show; anything Jack edited stays.
 */
function leithbass_migrate_tools_copy() {
	$retired = array(
		'portal_practice_tools' => 'Practice diary: a line or two after each practice: what you played, for how long, and what you noticed. Patterns show up quickly.' . "\n" . 'Tempo tracker: log the tempo you can play something cleanly and watch it climb, one honest step at a time.' . "\n" . 'Drone: a tanpura on any of the twelve notes, playing until you stop it. For scales, intonation, and hearing how each note sits.' . "\n" . 'The Shelf: backing tracks, drones, course material and transcriptions I&rsquo;ve put up for everyone.' . "\n" . 'Questions for Jack: save a question when it occurs to you, rather than trying to remember it on the way to the studio.' . "\n" . 'Recordings: send me a recording of yourself playing, and I&rsquo;ll listen before we next meet so we can start from where you are.',
		'portal_shot3_caption' => 'A diary, your tempos over time, and questions saved for our next session.',
		'seo_portal_desc' => 'Every bassist working with Jack gets a private member portal: written notes after each session, worksheets and backing tracks, bookings, and the Shed: practice tools including a diary, tempo tracker, drone and a shelf of backing tracks.',
		'prices_points_a' => 'An hour is the default: shorter and longer sessions can be arranged on request, charged pro rata.' . "\n" . 'Booking is by the contact form: we&rsquo;ll find times that suit you, as a one-off or a weekly slot.' . "\n" . 'Payment in advance confirms your session: unpaid sessions aren&rsquo;t held, so the time may be taken by other bookings. The introductory session can be paid on the day or by invoice afterwards.' . "\n" . 'Everything goes in the calendar: sessions are diarised in Google Calendar and invites shared with you, so we&rsquo;re always working from the same information.',
	);
	foreach ( $retired as $key => $old ) {
		$mod = get_theme_mod( 'leithbass_' . $key, null );
		if ( null !== $mod && leithbass_migration_plain( $mod ) === leithbass_migration_plain( $old ) ) {
			remove_theme_mod( 'leithbass_' . $key );
		}
	}
}

/**
 * 3.10.0 content migration: Screen 1 and 3 captions for the redrawn Shed (member portal 1.3.0)
 */
function leithbass_migrate_shed_screen_copy() {
	$retired = array(
		'portal_shot1_caption' => 'Your next session, this week&rsquo;s objectives and how much of your block is left, the moment you open it.',
		'portal_shot3_caption' => 'A diary that plans and times your practice, your tempos over time, and questions saved for our next session.',
	);
	foreach ( $retired as $key => $old ) {
		$mod = get_theme_mod( 'leithbass_' . $key, null );
		if ( null !== $mod && leithbass_migration_plain( $mod ) === leithbass_migration_plain( $old ) ) {
			remove_theme_mod( 'leithbass_' . $key );
		}
	}
}

/**
 * 3.11.0 content migration: the Shed gets its own page. Wording edited for the
 * Portal page's tool list, Jack's line and the try-it small print moves with
 * it, and the Approach page's Portal link gains the Shed tools link.
 */
function leithbass_migrate_shed_page() {
	$moves = array(
		'portal_practice_tools' => 'shed_tools',
		'portal_practice_aside' => 'shed_aside',
		'portal_try_note'       => 'shed_try_note',
		'portal_try_hint'       => 'shed_try_hint',
	);
	foreach ( $moves as $from => $to ) {
		$mod = get_theme_mod( 'leithbass_' . $from, null );
		if ( null !== $mod && null === get_theme_mod( 'leithbass_' . $to, null ) ) {
			set_theme_mod( 'leithbass_' . $to, $mod );
		}
		remove_theme_mod( 'leithbass_' . $from );
	}
	$body = get_theme_mod( 'leithbass_portal_practice_body', null );
	if ( null !== $body && leithbass_migration_plain( $body ) === leithbass_migration_plain( 'Jazz musicians call serious practice woodshedding: taking yourself off somewhere quiet until you&rsquo;ve got it. The Shed is that place, with the tools to hand. You choose which ones you use, and which ones I can see.' ) ) {
		remove_theme_mod( 'leithbass_portal_practice_body' );
	}
	foreach ( array( 'portal_try_sub', 'portal_try_title', 'portal_try_body' ) as $gone ) {
		remove_theme_mod( 'leithbass_' . $gone );
	}
	$s3 = get_theme_mod( 'leithbass_approach_s3_body', null );
	if ( null !== $s3 && false === strpos( (string) $s3, '/shed/' ) ) {
		$link = '<a href="/portal/">See how the Portal works</a>';
		if ( false !== strpos( (string) $s3, $link ) ) {
			set_theme_mod( 'leithbass_approach_s3_body', str_replace( $link, $link . ', or <a href="/shed/">try the Shed tools</a>.', (string) $s3 ) );
		}
	}
}

/**
 * 3.15.0 content migration: the rebuilt metronome and the new parts of
 * Harmonic Elements (forms, drills, Play). Saved wording that still matches
 * the 3.14.0 defaults is cleared, so the new defaults show; anything edited
 * by hand stays as it is.
 */
function leithbass_migrate_tools_pages_copy() {
	$retired = array(
		'shed_tools' => 'Practice diary: plan what you&rsquo;ll work on, time the practice, then note what got easier and what to start with next time. It&rsquo;s waiting for you when you come back.' . "\n" . 'Habit tracker: a goal we agree together (so many days a week, so many minutes) and a chain of days to keep going. Miss one day and the chain holds.' . "\n" . 'Metronome: grooves, odd time signatures, a speed trainer, and ways to let the click do less (on 2 and 4, a bar on and a bar off, random gaps) so your own time does more.' . "\n" . 'Tempo tracker: log the tempo you can play something cleanly and watch it climb, one honest step at a time.' . "\n" . 'Drone: a tanpura on any of the twelve notes, playing until you stop it. For scales, intonation, and hearing how each note sits.' . "\n" . 'Tuner: a chromatic tuner that reads right down to a low B.' . "\n" . 'The Shelf: backing tracks, drones, course material and transcriptions I&rsquo;ve put up for everyone, with a player that slows a track down without changing its pitch and loops the tricky bit.' . "\n" . 'Questions for Jack: save a question when it occurs to you, rather than trying to remember it on the way to the studio.' . "\n" . 'Recorder: record yourself in the app and listen back. Takes stay on your phone until you choose to send one, and I&rsquo;ll listen before we next meet.',
		'harmonic_intro' => 'This course develops two connected skills: hearing familiar chord relationships and choosing notes that make those relationships audible on the bass.' . "\n\n" . 'It comes in two parts. The Guide is the course itself: pick an element, read what it is, and play its loop on any tone centre. The Dojo is the ear trainer: a loop of chords and drums plays, with no bass, until you&rsquo;ve found home and named the element.',
		'harmonic_points' => 'The Guide: the course, an element at a time. What the chords fix and leave open, what to listen for and where to hear it, with the loop to play along with.' . "\n" . 'Home: the tone centre, which is the root of the chord that feels like rest. It isn&rsquo;t a key, so C can be major or minor, and the element says which.' . "\n" . 'The element: the chords as roman numerals from home, such as I IV or i &#9837;VII.' . "\n" . 'The mix: choose which elements, tone centres, tempos and feels can come up in the Dojo, from a couple of vamps to the whole course.' . "\n" . 'The band: every loop can be played by the house band. Pianos, electric pianos, organ, guitars, vibraphone, strings and brass, on their own or a few together, over seven drum kits with three grooves for every feel, so an element doesn&rsquo;t sound the same each time it comes round.' . "\n" . 'Your record: a dot for every loop you answer. Four first-time answers from the last five, on two different days, and an element counts as recognised.',
	);
	foreach ( $retired as $key => $old ) {
		$mod = get_theme_mod( 'leithbass_' . $key, null );
		if ( null !== $mod && leithbass_migration_plain( $mod ) === leithbass_migration_plain( $old ) ) {
			remove_theme_mod( 'leithbass_' . $key );
		}
	}
}

/**
 * 3.16.0 content migration: Harmonic Elements asks for a key (home, major or
 * minor), has two Show me buttons and a home cue, and leaves the forms out for
 * now. Saved wording that still matches the 3.15.0 defaults is cleared, so the
 * new defaults show; anything edited by hand stays as it is.
 */
function leithbass_migrate_harmonic_key_copy() {
	$retired = array(
		'harmonic_soon_shot2_caption' => 'A loop plays until you&rsquo;ve found home and named the element.',
		'harmonic_intro'  => 'This course develops two connected skills: hearing familiar chord relationships and choosing notes that make those relationships audible on the bass.' . "\n\n" . 'It comes in two parts. The Guide is the course itself: pick an element, read what it is, play its loop on any tone centre, and see its notes on the neck. The Dojo trains your ear on the same material: a loop of chords and drums plays, with no bass, until you&rsquo;ve found home and named the element.',
		'harmonic_points' => 'The Guide: the course, an element at a time. What the chords fix and leave open, what to listen for and where to hear it, with the loop to play along with.' . "\n" . 'Play: under every element in the Guide. The notes the chords fix and leave open, on a fretboard drawn for your bass, and bass lines written in stave and TAB, from roots alone up to sevenths. A reference bass can play the line, or take turns with you.' . "\n" . 'Home: the tone centre, which is the root of the chord that feels like rest. It isn&rsquo;t a key, so C can be major or minor, and the element says which.' . "\n" . 'The element: the chords as roman numerals from home, such as I IV or i &#9837;VII.' . "\n" . 'The mix: choose which elements, tone centres, tempos and feels can come up in the Dojo, from a couple of vamps to the whole course, the forms (the twelve bar blues, rhythm changes) and a further set of molecules.' . "\n" . 'Which is which, and Before and after: two more things the Dojo can ask. Tell apart two elements that are easily mixed up, or hear the change when one is altered.' . "\n" . 'The band: every loop can be played by the house band. Pianos, electric pianos, organ, guitars, vibraphone, strings and brass, on their own or a few together, over seven drum kits with three grooves for every feel, so an element doesn&rsquo;t sound the same each time it comes round.' . "\n" . 'Your record: a dot for every loop you answer. Four first-time answers from the last five, on two different days, and an element counts as recognised.',
	);
	foreach ( $retired as $key => $old ) {
		$mod = get_theme_mod( 'leithbass_' . $key, null );
		if ( null !== $mod && leithbass_migration_plain( $mod ) === leithbass_migration_plain( $old ) ) {
			remove_theme_mod( 'leithbass_' . $key );
		}
	}
}

/**
 * 3.17.0 content migration: the LBS Ear Trainer is now Ear Training for Bass
 * Players, with lines, progressions, Today's set and the Jam room. Saved
 * wording that still matches the 3.16.0 defaults is cleared, so the new
 * defaults show; anything edited by hand stays as it is. The page keeps its
 * address (/ear-trainer/); its title changes only if it is still the old one.
 */
function leithbass_migrate_ear_training_copy() {
	$retired = array(
		'ear_soon_body' => 'The LBS Ear Trainer is ear training built for the bass. Most ear trainers play you two notes out of nowhere. Here the band holds a tone centre, a bass asks a question against it, and you answer: by tapping, on a fretboard, or by playing it back on your own bass.' . "\n\n" . 'It starts with intervals and chord flavours, then scales, then inversions, and every answer is written out on the stave, in TAB and on the neck.' . "\n\n" . 'It isn&rsquo;t open yet.',
		'ear_intro' => 'Most ear trainers play you two notes out of nowhere. Music doesn&rsquo;t work like that: every note you play is heard against a home. So here the band holds a tone centre, a bass asks a question against it, and you answer.' . "\n\n" . 'Each question is two bars long, and it keeps going round. Bar one asks. Bar two is yours: tap the answer, find it on a fretboard, or play it back on your bass. Then you see it written out on the stave, in TAB and on the neck.',
		'ear_how_title' => 'Four things to hear, one at a time',
		'ear_how_body' => 'Start with intervals and work along. You choose what can come up, from two possibilities to all of them. The band stays on one tone centre for eight questions, then moves round the cycle of fourths to the next.',
		'ear_points' => 'Intervals: first a single note against home, named by its degree (1, &#9837;3, 5 and so on). Then the distance between two notes of the home scale, going up or coming down.' . "\n" . 'Chord flavours: the bass holds home and the band plays one chord on top of it. Major or minor to begin with, then the other triads, the sevenths and the colours.' . "\n" . 'Scales: the bass plays a scale up from home over a bare fifth. Major and minor first, then the pentatonics, the modes and the kinds of minor, with the note that gives each one away.' . "\n" . 'Inversions: the band holds a chord and the bass takes one of its notes. You name which is at the bottom: the root, the third, the fifth or the seventh.' . "\n" . 'Three ways to answer: tap a pad, tap a fretboard drawn for the number of strings on your bass, or switch on the microphone and play the answer. If you play it, use headphones, so the microphone hears only you.' . "\n" . 'Stave and TAB, always: every answer is shown in bass clef, in TAB and on the neck. Tap a note to hear it again.' . "\n" . 'The band: an electric or an upright bass asks the questions, over keys and drums from the Harmonic Elements house band.' . "\n" . 'Your record: four first-time answers from the last five, on two different days, and it counts as recognised. It also shows what you mix up with what.',
		'ear_access_body' => 'Sign in to the member portal before you start, and your record is kept with your account, so it follows you from your phone to your laptop. You can add a sitting to your practice diary too, where it counts towards your habit.' . "\n\n" . 'It&rsquo;s yours alone unless you switch on sharing. If you do, I can see what you hear easily and what you mix up, and we can go straight to it in sessions.',
		'ear_strip_text' => 'LBS Ear Trainer',
		'tool_ear_card' => 'Intervals, chord flavours, scales and inversions, against a tone centre.',
		'seo_ear_title' => 'LBS Ear Trainer: Ear Training for Bass Players | The Leith Bass Space',
		'seo_ear_desc' => 'Ear training for bass players that never loses the tone centre. Intervals, chord flavours, scales and inversions, answered by tapping, on a fretboard or on your own bass.',
	);
	foreach ( $retired as $key => $old ) {
		$mod = get_theme_mod( 'leithbass_' . $key, null );
		if ( null !== $mod && leithbass_migration_plain( $mod ) === leithbass_migration_plain( $old ) ) {
			remove_theme_mod( 'leithbass_' . $key );
		}
	}
	$page = get_page_by_path( 'ear-trainer' );
	if ( $page && 'LBS Ear Trainer' === $page->post_title ) {
		wp_update_post( array( 'ID' => $page->ID, 'post_title' => 'Ear Training for Bass Players' ) );
	}
}

/**
 * Content migrations run in order on the first admin page load after new files
 * are in place. A fresh install has no saved wording, so they are no-ops there.
 */
add_action( 'admin_init', function () {
	$done = (string) get_option( 'leithbass_content_migration', '0' );
	if ( version_compare( $done, '3.17.0', '>=' ) ) { return; }

	if ( version_compare( $done, '3.4.0', '<' ) ) { leithbass_migrate_intro_copy(); }
	if ( version_compare( $done, '3.5.0', '<' ) ) { leithbass_migrate_single_space(); }
	if ( version_compare( $done, '3.7.0', '<' ) ) { leithbass_migrate_portal_copy(); }
	if ( version_compare( $done, '3.8.1', '<' ) ) { leithbass_migrate_shed_copy(); }
	if ( version_compare( $done, '3.9.0', '<' ) ) { leithbass_migrate_tools_copy(); }
	if ( version_compare( $done, '3.10.0', '<' ) ) { leithbass_migrate_shed_screen_copy(); }
	if ( version_compare( $done, '3.11.0', '<' ) ) { leithbass_migrate_shed_page(); }
	if ( version_compare( $done, '3.15.0', '<' ) ) { leithbass_migrate_tools_pages_copy(); }
	if ( version_compare( $done, '3.16.0', '<' ) ) { leithbass_migrate_harmonic_key_copy(); }
	if ( version_compare( $done, '3.17.0', '<' ) ) { leithbass_migrate_ear_training_copy(); }

	update_option( 'leithbass_content_migration', '3.17.0' );
}, 5 );

/**
 * Uploading a new zip over an installed theme does not fire after_switch_theme,
 * so re-run the page setup once per version on the next admin page load.
 */
add_action( 'admin_init', function () {
	if ( get_option( 'leithbass_setup_version' ) === LEITHBASS_VERSION ) { return; }
	leithbass_activate();
	update_option( 'leithbass_setup_version', LEITHBASS_VERSION );
} );

/* -------------------------------------------------------------------------
 * Shed tools (3.11.0): the page, and its full screen demo at /shed/try/.
 * ---------------------------------------------------------------------- */
add_action( 'init', function () { add_rewrite_endpoint( 'try', EP_PAGES ); } );

/** True on the full screen demo: the Shed tools page with /try/ on the end. */
function leithbass_is_shed_try() {
	global $wp_query;
	return $wp_query && isset( $wp_query->query_vars['try'] ) && is_page_template( 'page-templates/template-shed.php' );
}

/** The published Shed tools page, or 0. */
function leithbass_shed_page_id() {
	$page = get_page_by_path( 'shed' );
	return ( $page && 'publish' === $page->post_status ) ? (int) $page->ID : 0;
}

/** The Shed tools page, or its full screen demo. '' when there's no page. */
function leithbass_shed_url( $try = false ) {
	$id = leithbass_shed_page_id();
	if ( ! $id ) { return ''; }
	$url = get_permalink( $id );
	return $try ? user_trailingslashit( trailingslashit( $url ) . 'try' ) : $url;
}

/** Tells the member portal where the demo is and which kind to show. */
add_filter( 'lbs_demo_page', function ( $mode ) {
	if ( is_page_template( 'page-templates/template-shed.php' ) ) { return leithbass_is_shed_try() ? 'full' : true; }
	return $mode;
} );
add_filter( 'lbs_shed_tools_url', function ( $url ) {
	$shed = leithbass_shed_url();
	return $shed ? $shed : $url;
} );

/** The full screen demo points search engines back to the page it belongs to. */
add_filter( 'wp_robots', function ( $robots ) {
	if ( leithbass_is_shed_try() ) { $robots['noindex'] = true; $robots['follow'] = true; }
	return $robots;
} );

/* -------------------------------------------------------------------------
 * Harmonic Elements (3.12.0; Coming Soon and the launch switch in 3.13.0).
 *
 * The page holds the Guide and the Dojo, which come from the Leith Bass
 * Members plugin. With /play/ on the end it is those alone, filling the
 * screen. Until the Launch tickbox in Leith Bass Content is ticked, everyone
 * except an administrator gets a Coming Soon page instead, and the plugin
 * sends them no loops.
 * ---------------------------------------------------------------------- */
add_action( 'init', function () { add_rewrite_endpoint( 'play', EP_PAGES ); } );

/** Has Harmonic Elements been launched? (Appearance → Leith Bass Content → Harmonic Elements.) */
function leithbass_harmonic_live() {
	return (bool) get_option( 'leithbass_harmonic_live', false );
}

/**
 * May whoever is looking use it? Everyone once it's launched. Before that,
 * only an administrator, who can add ?coming-soon to the address to see the
 * page as everyone else does.
 */
function leithbass_harmonic_open() {
	if ( leithbass_harmonic_live() ) { return true; }
	return current_user_can( 'manage_options' ) && ! isset( $_GET['coming-soon'] ); // phpcs:ignore -- a view switch, nothing is saved.
}

/** True on the full screen version: the Harmonic Elements page with /play/ on the end. */
function leithbass_is_harmonic_play() {
	global $wp_query;
	return $wp_query && isset( $wp_query->query_vars['play'] ) && is_page_template( 'page-templates/template-harmonic.php' );
}

/** The Harmonic Elements page, or its full screen version. '' when there's no page. */
function leithbass_harmonic_url( $play = false ) {
	$page = get_page_by_path( 'harmonic-elements' );
	if ( ! $page || 'publish' !== $page->post_status ) { return ''; }
	$url = get_permalink( $page->ID );
	return $play ? user_trailingslashit( trailingslashit( $url ) . 'play' ) : $url;
}

/** One of the three stills on the Coming Soon page: a screen of the app in a phone frame. */
function leithbass_harmonic_still( $n ) {
	$n    = max( 1, min( 3, (int) $n ) );
	$alts = array(
		1 => 'The Guide on a phone: the page for the Dorian lean, with its chords and a button to play the loop',
		2 => 'The Dojo on a phone: a loop playing, the band named under the stop button, with twelve notes to choose home from',
		3 => 'The Dojo on a phone after a right answer: the chords of the loop named, and what to listen for',
	);
	echo '<div class="phone phone-shot">';
	leithbass_img( 'elements-shot-' . $n, array( 780 ), $alts[ $n ], '(min-width: 900px) 280px, 70vw' );
	echo '</div>';
}

/** Tells the member portal plugin whether it's launched, where it is and which kind to show. */
add_filter( 'lbs_harmonic_live', function () { return leithbass_harmonic_live(); } );
add_filter( 'lbs_harmonic_page', function ( $mode ) {
	if ( ! is_page_template( 'page-templates/template-harmonic.php' ) ) { return $mode; }
	if ( ! leithbass_harmonic_open() ) { return false; }
	return leithbass_is_harmonic_play() ? 'full' : true;
} );
add_filter( 'lbs_harmonic_url', function ( $url ) {
	$page = leithbass_harmonic_url();
	return $page ? $page : $url;
} );

/** Before launch there is no full screen version for visitors: send them to the Coming Soon page. */
add_action( 'template_redirect', function () {
	if ( leithbass_is_harmonic_play() && ! leithbass_harmonic_open() ) {
		wp_safe_redirect( leithbass_harmonic_url(), 302 );
		exit;
	}
}, 5 );

/** Search engines: the full screen version points back to the page, and nothing is indexed before launch. */
add_filter( 'wp_robots', function ( $robots ) {
	if ( leithbass_is_harmonic_play() || ( is_page_template( 'page-templates/template-harmonic.php' ) && ! leithbass_harmonic_live() ) ) {
		unset( $robots['index'] );
		$robots['noindex'] = true;
		$robots['follow']  = true;
	}
	return $robots;
} );

/* -------------------------------------------------------------------------
 * Ear Training for Bass Players (3.15.0, as the LBS Ear Trainer; renamed in 3.17.0).
 *
 * The page holds the trainer, which comes from the Leith Bass Members plugin.
 * With /play/ on the end it is the trainer alone, filling the screen. It has
 * its own Launch tickbox in Leith Bass Content: until that is ticked,
 * everyone except an administrator gets a Coming Soon page instead.
 * ---------------------------------------------------------------------- */

/** Has Ear Training been launched? (Appearance → Leith Bass Content → Ear Training.) */
function leithbass_ear_live() {
	return (bool) get_option( 'leithbass_ear_live', false );
}

/** May whoever is looking use it? Everyone once it's launched; before that an administrator (who can add ?coming-soon to see what everyone else gets). */
function leithbass_ear_open() {
	if ( leithbass_ear_live() ) { return true; }
	return current_user_can( 'manage_options' ) && ! isset( $_GET['coming-soon'] ); // phpcs:ignore -- a view switch, nothing is saved.
}

/** True on the full screen version: the ear trainer page with /play/ on the end. */
function leithbass_is_ear_play() {
	global $wp_query;
	return $wp_query && isset( $wp_query->query_vars['play'] ) && is_page_template( 'page-templates/template-ear.php' );
}

/** The ear trainer page, or its full screen version. '' when there's no page. */
function leithbass_ear_url( $play = false ) {
	$page = get_page_by_path( 'ear-trainer' );
	if ( ! $page || 'publish' !== $page->post_status ) { return ''; }
	$url = get_permalink( $page->ID );
	return $play ? user_trailingslashit( trailingslashit( $url ) . 'play' ) : $url;
}

/** One of the three stills on the Coming Soon page: a screen of the trainer in a phone frame. */
function leithbass_ear_still( $n ) {
	$n    = max( 1, min( 3, (int) $n ) );
	$alts = array(
		1 => 'Ear Training on a phone: home is C, two bars marked Listen and Your turn, and seven degrees to choose from',
		2 => 'Ear Training on a phone: a fretboard to answer on, with home marked on the neck',
		3 => 'Ear Training on a phone after a right answer: the notes on the stave, in TAB and on the neck',
	);
	echo '<div class="phone phone-shot">';
	leithbass_img( 'ear-shot-' . $n, array( 780 ), $alts[ $n ], '(min-width: 900px) 280px, 70vw' );
	echo '</div>';
}

/** Tells the member portal plugin whether it's launched, and which kind of page this is. */
add_filter( 'lbs_ear_live', function () { return leithbass_ear_live(); } );

/*
 * Read: reading notation for bass players. A room of the members' app
 * (/members/read/, 3.18.0) and, since 3.19.0, a page of its own (/read/),
 * as Ear Training has. Both come from the Leith Bass Members plugin. It has its
 * own Launch tickbox (Leith Bass Content → Read): until it is ticked, members
 * see Coming soon in its room, everyone else the Coming Soon page, and only an
 * administrator gets the whole thing.
 */
function leithbass_read_live() {
	return (bool) get_option( 'leithbass_read_live', false );
}

/** May whoever is looking use it? Everyone once it's launched; before that an administrator (who can add ?coming-soon to see what everyone else gets). */
function leithbass_read_open() {
	if ( leithbass_read_live() ) { return true; }
	return current_user_can( 'manage_options' ) && ! isset( $_GET['coming-soon'] ); // phpcs:ignore -- a view switch, nothing is saved.
}

/** True on the full screen version: the Read page with /play/ on the end. */
function leithbass_is_read_play() {
	global $wp_query;
	return $wp_query && isset( $wp_query->query_vars['play'] ) && is_page_template( 'page-templates/template-read.php' );
}

/** The Read page, or its full screen version. '' when there's no page. */
function leithbass_read_url( $play = false ) {
	$page = get_page_by_path( 'read' );
	if ( ! $page || 'publish' !== $page->post_status ) { return ''; }
	$url = get_permalink( $page->ID );
	return $play ? user_trailingslashit( trailingslashit( $url ) . 'play' ) : $url;
}

/** One of the three stills on the Coming Soon page: a screen of Read in a phone frame. */
function leithbass_read_still( $n ) {
	$n    = max( 1, min( 3, (int) $n ) );
	$alts = array(
		1 => 'Read on a phone: the Guide, with a line of music and its TAB',
		2 => 'Read on a phone: a note on the stave to name, with the letters to choose from',
		3 => 'Read on a phone: the Map, every note on the neck and how well each is known',
	);
	echo '<div class="phone phone-shot">';
	leithbass_img( 'read-shot-' . $n, array( 780 ), $alts[ $n ], '(min-width: 900px) 280px, 70vw' );
	echo '</div>';
}

/** Tells the member portal plugin whether Read is launched, and which kind of page this is. */
add_filter( 'lbs_read_live', function () { return leithbass_read_live(); } );
add_filter( 'lbs_read_page', function ( $mode ) {
	if ( ! is_page_template( 'page-templates/template-read.php' ) ) { return $mode; }
	if ( ! leithbass_read_open() ) { return false; }
	return leithbass_is_read_play() ? 'full' : true;
} );
add_filter( 'lbs_read_url', function ( $url ) {
	$page = leithbass_read_url();
	return $page ? $page : $url;
} );

/** Before launch there is no full screen version for visitors: send them to the Coming Soon page. */
add_action( 'template_redirect', function () {
	if ( leithbass_is_read_play() && ! leithbass_read_open() ) {
		wp_safe_redirect( leithbass_read_url(), 302 );
		exit;
	}
}, 5 );

/** Search engines: the full screen version points back to the page, and nothing is indexed before launch. */
add_filter( 'wp_robots', function ( $robots ) {
	if ( leithbass_is_read_play() || ( is_page_template( 'page-templates/template-read.php' ) && ! leithbass_read_live() ) ) {
		unset( $robots['index'] );
		$robots['noindex'] = true;
		$robots['follow']  = true;
	}
	return $robots;
} );
add_filter( 'lbs_ear_page', function ( $mode ) {
	if ( ! is_page_template( 'page-templates/template-ear.php' ) ) { return $mode; }
	if ( ! leithbass_ear_open() ) { return false; }
	return leithbass_is_ear_play() ? 'full' : true;
} );

/** Before launch there is no full screen version for visitors: send them to the Coming Soon page. */
add_action( 'template_redirect', function () {
	if ( leithbass_is_ear_play() && ! leithbass_ear_open() ) {
		wp_safe_redirect( leithbass_ear_url(), 302 );
		exit;
	}
}, 5 );

/** Search engines: the full screen version points back to the page, and nothing is indexed before launch. */
add_filter( 'wp_robots', function ( $robots ) {
	if ( leithbass_is_ear_play() || ( is_page_template( 'page-templates/template-ear.php' ) && ! leithbass_ear_live() ) ) {
		unset( $robots['index'] );
		$robots['noindex'] = true;
		$robots['follow']  = true;
	}
	return $robots;
} );

/* -------------------------------------------------------------------------
 * The free tools (3.15.0): the Shed's metronome, drone and tuner, each on a
 * page of its own, for anyone, with no account. The tool comes from the Leith
 * Bass Members plugin (lbs_shed_tool()); the page gives it a heading, says
 * what it does, and points to the rest of the tools.
 * ---------------------------------------------------------------------- */

/** Which tool the page being shown is for ('metronome', 'drone', 'tuner'), or ''. */
function leithbass_current_tool() {
	if ( ! is_page_template( 'page-templates/template-tool.php' ) ) { return ''; }
	$slug  = (string) get_post_field( 'post_name', get_queried_object_id() );
	$tools = leithbass_tool_pages();
	return isset( $tools[ $slug ] ) ? $tools[ $slug ] : '';
}

/** A published page's address by its slug, or ''. */
function leithbass_page_url( $slug ) {
	$page = get_page_by_path( $slug );
	return ( $page && 'publish' === $page->post_status ) ? get_permalink( $page->ID ) : '';
}

/** Tells the member portal plugin which tool this page shows, and where the Shed tools page is. */
add_filter( 'lbs_shed_tool_page', function ( $tool ) {
	$here = leithbass_current_tool();
	return $here ? $here : $tool;
} );
add_filter( 'lbs_shed_url', function ( $url ) {
	$shed = leithbass_shed_url();
	return $shed ? $shed : $url;
} );
/** Where each free tool's page is (3.17.0): Ear Training links to the drone on the note it was on. */
add_filter( 'lbs_tool_url', function ( $url, $tool = '' ) {
	if ( ! in_array( $tool, array( 'metronome', 'drone', 'tuner' ), true ) ) { return $url; }
	$page = leithbass_page_url( $tool );
	return $page ? $page : $url;
}, 10, 2 );
/** Where Ear Training's page is, for the plugin. */
add_filter( 'lbs_ear_url', function ( $url ) {
	$page = leithbass_ear_url();
	return $page ? $page : $url;
} );

/**
 * For a member, a line by a trainer on the website: the same thing has a room of
 * its own in the members' app, where their record is kept. '' for anyone else.
 */
function leithbass_app_room_line( $room ) {
	if ( ! function_exists( 'lbs_portal_url' ) || ! function_exists( 'lbs_portal_rooms' ) || ! is_user_logged_in() ) { return ''; }
	if ( ! function_exists( 'lbs_can_access' ) || ! lbs_can_access( get_current_user_id() ) ) { return ''; }
	$rooms = lbs_portal_rooms();
	if ( ! isset( $rooms[ $room ] ) ) { return ''; }
	return '<p class="app-room-line">' . esc_html( $rooms[ $room ]['name'] ) . ' has a room of its own in the members&rsquo; app. <a href="' . esc_url( lbs_portal_url( $room ) ) . '">Open it in the app</a></p>';
}

/** The page says there is more in the Shed in its own words, so the plugin's line under the tool is left out. */
add_filter( 'lbs_shed_tool_more', function ( $show ) {
	return leithbass_current_tool() ? false : $show;
} );

/**
 * Everything free to use on the site, in the order it's listed: the three
 * tools, then Harmonic Elements and the ear trainer once each is launched.
 * slug => array( name, the content key of its one line ).
 */
function leithbass_free_tools() {
	$tools = array(
		'metronome' => array( 'Metronome', 'tool_metronome_card' ),
		'drone'     => array( 'Drone', 'tool_drone_card' ),
		'tuner'     => array( 'Tuner', 'tool_tuner_card' ),
	);
	if ( leithbass_harmonic_live() ) { $tools['harmonic-elements'] = array( 'Harmonic Elements', 'tool_harmonic_card' ); }
	if ( leithbass_ear_live() ) { $tools['ear-trainer'] = array( 'Ear Training', 'tool_ear_card' ); }
	if ( leithbass_read_live() ) { $tools['read'] = array( 'Read', 'tool_read_card' ); }
	foreach ( $tools as $slug => $tool ) {
		if ( ! leithbass_page_url( $slug ) ) { unset( $tools[ $slug ] ); }
	}
	return $tools;
}

/**
 * "More tools": links to the other free tools, and to the Shed, where the
 * rest of them are. Leaves out the page it's shown on. $with_shed false on
 * the Shed tools page itself.
 */
function leithbass_more_tools( $current = '', $with_shed = true ) {
	$tools = leithbass_free_tools();
	unset( $tools[ $current ] );
	// On the Shed tools page the list is of the Shed's own tools that are free: the three, and nothing else.
	if ( ! $with_shed ) { $tools = array_intersect_key( $tools, leithbass_tool_pages() ); }
	$shed = $with_shed ? leithbass_shed_url() : '';
	if ( ! $tools && ! $shed ) { return; }
	?>
	<section class="section section-ruled section-more-tools" id="more-tools">
		<div class="wrap">
			<div class="grid-2">
				<div class="reveal">
					<span class="sub-label"><?php leithbass_text( $with_shed ? 'tool_more_sub' : 'shed_free_sub' ); ?></span>
					<h2><?php leithbass_text( $with_shed ? 'tool_more_title' : 'shed_free_title' ); ?></h2>
				</div>
				<div class="prose reveal">
					<?php leithbass_text( $with_shed ? 'tool_more_body' : 'shed_free_body' ); ?>
				</div>
			</div>
			<ul class="tool-links reveal">
				<?php foreach ( $tools as $slug => $tool ) : ?>
					<li><a href="<?php echo esc_url( leithbass_page_url( $slug ) ); ?>">
						<h3><?php echo esc_html( $tool[0] ); ?></h3>
						<p><?php leithbass_text( $tool[1] ); ?></p>
						<span class="tool-links-go"><?php leithbass_text( 'tool_card_free' ); ?></span>
					</a></li>
				<?php endforeach; ?>
				<?php if ( $shed ) : ?>
					<li class="is-shed"><a href="<?php echo esc_url( $shed ); ?>">
						<h3><?php leithbass_text( 'tool_shed_card_title' ); ?></h3>
						<p><?php leithbass_text( 'tool_shed_card' ); ?></p>
						<span class="tool-links-go"><?php leithbass_text( 'tool_shed_card_go' ); ?></span>
					</a></li>
				<?php endif; ?>
			</ul>
		</div>
	</section>
	<?php
}
