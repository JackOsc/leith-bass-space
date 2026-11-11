<?php
/**
 * Lightweight SEO: titles, descriptions, social cards and structured data.
 * Stops cleanly when a dedicated SEO plugin is active, avoiding duplicates.
 *
 * @package LeithBass
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

/** Whether a commonly used SEO plugin is already responsible for metadata. */
function leithbass_has_seo_plugin() {
	return defined( 'WPSEO_VERSION' )
		|| defined( 'RANK_MATH_VERSION' )
		|| defined( 'AIOSEO_VERSION' )
		|| defined( 'SEOPRESS_VERSION' );
}

/** Per-page SEO copy, keyed by the hero slug. */
function leithbass_seo_data() {
	return array(
		'home'     => array(
			'title' => leithbass_val( 'seo_home_title' ),
			'desc'  => leithbass_val( 'seo_home_desc' ),
		),
		'approach' => array(
			'title' => leithbass_val( 'seo_approach_title_v3' ),
			'desc'  => leithbass_val( 'seo_approach_desc' ),
		),
		'portal'   => array(
			'title' => leithbass_val( 'seo_portal_title' ),
			'desc'  => leithbass_val( 'seo_portal_desc' ),
		),
		'shed'     => array(
			'title' => leithbass_val( 'seo_shed_title' ),
			'desc'  => leithbass_val( 'seo_shed_desc' ),
		),
		'harmonic-elements' => array(
			'title' => leithbass_val( 'seo_harmonic_title' ),
			'desc'  => leithbass_val( 'seo_harmonic_desc' ),
		),
		'ear-trainer' => array(
			'title' => leithbass_val( 'seo_ear_title' ),
			'desc'  => leithbass_val( 'seo_ear_desc' ),
		),
		'read'     => array(
			'title' => leithbass_val( 'seo_read_title' ),
			'desc'  => leithbass_val( 'seo_read_desc' ),
		),
		'metronome' => array(
			'title' => leithbass_val( 'seo_tool_metronome_title' ),
			'desc'  => leithbass_val( 'seo_tool_metronome_desc' ),
		),
		'drone'    => array(
			'title' => leithbass_val( 'seo_tool_drone_title' ),
			'desc'  => leithbass_val( 'seo_tool_drone_desc' ),
		),
		'tuner'    => array(
			'title' => leithbass_val( 'seo_tool_tuner_title' ),
			'desc'  => leithbass_val( 'seo_tool_tuner_desc' ),
		),
		'faq'      => array(
			'title' => leithbass_val( 'seo_faq_title' ),
			'desc'  => leithbass_val( 'seo_faq_desc' ),
		),
		'spaces'   => array(
			'title' => leithbass_val( 'seo_spaces_title' ),
			'desc'  => leithbass_val( 'seo_spaces_desc' ),
		),
		'contact'  => array(
			'title' => leithbass_val( 'seo_contact_title_v3' ),
			'desc'  => leithbass_val( 'seo_contact_desc_v3' ),
		),
		'prices'   => array(
			'title' => leithbass_val( 'seo_prices_title' ),
			'desc'  => leithbass_val( 'seo_prices_desc_v3' ),
		),
		'privacy'  => array(
			'title' => leithbass_val( 'seo_privacy_title' ),
			'desc'  => leithbass_val( 'seo_privacy_desc' ),
		),
		'notes'    => array(
			'title' => leithbass_val( 'seo_notes_title' ),
			'desc'  => leithbass_val( 'seo_notes_desc' ),
		),
	);
}

/** SEO title and description for the current public page. */
function leithbass_seo_current() {
	if ( is_404() || is_search() ) { return null; }
	if ( is_singular( 'leithbass_note' ) ) {
		$post_id = get_queried_object_id();
		$desc    = has_excerpt( $post_id ) ? get_the_excerpt( $post_id ) : wp_trim_words( wp_strip_all_tags( strip_shortcodes( get_post_field( 'post_content', $post_id ) ) ), 32, '…' );
		return array(
			'title' => get_the_title( $post_id ) . ' | Notes | The Leith Bass Space',
			'desc'  => $desc ? $desc : leithbass_val( 'seo_notes_desc' ),
		);
	}
	$data = leithbass_seo_data();
	$slug = function_exists( 'leithbass_hero_slug' ) ? leithbass_hero_slug() : '';
	return isset( $data[ $slug ] ) ? $data[ $slug ] : null;
}

/** Canonical URL for a page this theme deliberately exposes to search. */
function leithbass_seo_url() {
	if ( is_front_page() ) { return home_url( '/' ); }
	if ( is_post_type_archive( 'leithbass_note' ) ) {
		$paged = (int) get_query_var( 'paged' );
		return $paged > 1 ? get_pagenum_link( $paged ) : get_post_type_archive_link( 'leithbass_note' );
	}
	if ( is_singular( array( 'page', 'leithbass_note' ) ) ) { return get_permalink(); }
	return '';
}

/** Social-image URL, dimensions and accessible description. */
function leithbass_seo_image() {
	$id  = is_singular( 'leithbass_note' ) ? get_post_thumbnail_id() : 0;
	$portal = is_page_template( 'page-templates/template-portal.php' ) || is_page_template( 'page-templates/template-shed.php' ) || is_page_template( 'page-templates/template-tool.php' );
	if ( ! $id && $portal ) {
		// The Portal page shares the Shed (and so do the free tools): its own image, or the bundled one.
		$id = leithbass_image_id( 'og-portal' );
		if ( ! $id ) {
			$path = get_template_directory() . '/assets/img/og-portal.jpg';
			$dims = is_readable( $path ) ? getimagesize( $path ) : false;
			if ( $dims ) {
				return array(
					'url'    => get_template_directory_uri() . '/assets/img/og-portal.jpg',
					'width'  => (int) $dims[0],
					'height' => (int) $dims[1],
					'mime'   => 'image/jpeg',
					'alt'    => 'The Shed practice tools in the Leith Bass Space member portal: a metronome and a drone on a phone',
				);
			}
		}
	}
	$id  = $id ? $id : leithbass_image_id( 'og-default' );
	$alt = '';

	if ( $id ) {
		$source = wp_get_attachment_image_src( $id, 'full' );
		$alt    = trim( (string) get_post_meta( $id, '_wp_attachment_image_alt', true ) );
		if ( $source ) {
				return array(
					'url'    => $source[0],
					'width'  => (int) $source[1],
					'height' => (int) $source[2],
					'mime'   => (string) get_post_mime_type( $id ),
					'alt'    => $alt ? $alt : ( is_singular( 'leithbass_note' ) ? get_the_title() : 'A one-to-one bass lesson at The Leith Bass Space' ),
				);
		}
	}

	$path = get_template_directory() . '/assets/img/og-default.jpg';
	$dims = is_readable( $path ) ? getimagesize( $path ) : false;
	return array(
		'url'    => get_template_directory_uri() . '/assets/img/og-default.jpg',
		'width'  => $dims ? (int) $dims[0] : 1200,
		'height' => $dims ? (int) $dims[1] : 630,
		'mime'   => 'image/jpeg',
		'alt'    => 'A one-to-one bass lesson at The Leith Bass Space',
	);
}

/** Custom document title. */
add_filter( 'pre_get_document_title', function ( $title ) {
	if ( leithbass_has_seo_plugin() ) { return $title; }
	$seo = leithbass_seo_current();
	return $seo ? html_entity_decode( $seo['title'], ENT_QUOTES, 'UTF-8' ) : $title;
} );

/** Description, canonical URL, Open Graph and complete Twitter card data. */
add_action( 'wp_head', function () {
	if ( leithbass_has_seo_plugin() ) { return; }
	$seo = leithbass_seo_current();
	$url = leithbass_seo_url();
	if ( ! $seo || ! $url ) { return; }

	$desc  = wp_strip_all_tags( html_entity_decode( $seo['desc'], ENT_QUOTES, 'UTF-8' ) );
	$title = html_entity_decode( $seo['title'], ENT_QUOTES, 'UTF-8' );
	$image = leithbass_seo_image();
	$type  = is_singular( 'leithbass_note' ) ? 'article' : 'website';

	echo '<meta name="description" content="' . esc_attr( $desc ) . '">' . "\n";
	echo '<link rel="canonical" href="' . esc_url( $url ) . '">' . "\n";
	echo '<meta property="og:locale" content="en_GB">' . "\n";
	echo '<meta property="og:type" content="' . esc_attr( $type ) . '">' . "\n";
	echo '<meta property="og:site_name" content="The Leith Bass Space">' . "\n";
	echo '<meta property="og:title" content="' . esc_attr( $title ) . '">' . "\n";
	echo '<meta property="og:description" content="' . esc_attr( $desc ) . '">' . "\n";
	echo '<meta property="og:url" content="' . esc_url( $url ) . '">' . "\n";
	echo '<meta property="og:image" content="' . esc_url( $image['url'] ) . '">' . "\n";
	if ( $image['mime'] ) { echo '<meta property="og:image:type" content="' . esc_attr( $image['mime'] ) . '">' . "\n"; }
	echo '<meta property="og:image:width" content="' . absint( $image['width'] ) . '">' . "\n";
	echo '<meta property="og:image:height" content="' . absint( $image['height'] ) . '">' . "\n";
	echo '<meta property="og:image:alt" content="' . esc_attr( $image['alt'] ) . '">' . "\n";
	if ( is_singular( 'leithbass_note' ) ) {
		echo '<meta property="article:published_time" content="' . esc_attr( get_the_date( 'c' ) ) . '">' . "\n";
		echo '<meta property="article:modified_time" content="' . esc_attr( get_the_modified_date( 'c' ) ) . '">' . "\n";
	}
	echo '<meta name="twitter:card" content="summary_large_image">' . "\n";
	echo '<meta name="twitter:title" content="' . esc_attr( $title ) . '">' . "\n";
	echo '<meta name="twitter:description" content="' . esc_attr( $desc ) . '">' . "\n";
	echo '<meta name="twitter:image" content="' . esc_url( $image['url'] ) . '">' . "\n";
	echo '<meta name="twitter:image:alt" content="' . esc_attr( $image['alt'] ) . '">' . "\n";
}, 4 );

/** The first £ amount in an editable price line ("&pound;40 <span>per hour</span>" → "40"). */
function leithbass_price_from( $key, $fallback ) {
	$text = wp_strip_all_tags( html_entity_decode( (string) leithbass_val( $key ), ENT_QUOTES, 'UTF-8' ) );
	return preg_match( '/£\s*([0-9]+(?:\.[0-9]{1,2})?)/u', $text, $m ) ? $m[1] : $fallback;
}

/** "£20–£360", built from the prices you've set in Leith Bass Content. */
function leithbass_price_range() {
	$all = array_map( 'floatval', array( leithbass_price_from( 'prices_card1_price', '20' ), leithbass_price_from( 'prices_card2_price', '40' ), leithbass_price_from( 'prices_card3_price', '360' ) ) );
	$fmt = function ( $n ) { return '£' . ( floor( $n ) == $n ? number_format( $n ) : number_format( $n, 2 ) ); };
	return $fmt( min( $all ) ) . '–' . $fmt( max( $all ) );
}

/** One lesson offer with a reusable, explicit Service entity. */
function leithbass_schema_offer( $name, $description, $price, $url ) {
	return array(
		'@type'         => 'Offer',
		'name'          => $name,
		'description'   => $description,
		'price'         => $price,
		'priceCurrency' => 'GBP',
		'url'           => $url,
		'itemOffered'   => array(
			'@type'       => 'Service',
			'name'        => $name,
			'serviceType' => 'One-to-one bass tuition',
			'provider'    => array( '@id' => home_url( '/#school' ) ),
			'areaServed'  => array( '@type' => 'City', 'name' => 'Edinburgh' ),
		),
	);
}

/** JSON-LD graph: business, locations, services, webpage and Notes articles. */
add_action( 'wp_head', function () {
	if ( leithbass_has_seo_plugin() ) { return; }
	$seo = leithbass_seo_current();
	$url = leithbass_seo_url();
	if ( ! $seo || ! $url ) { return; }

	$school_id = home_url( '/#school' );
	$person_id = home_url( '/#jack-elliot' );
	$site_id   = home_url( '/#website' );
	$page_id   = trailingslashit( $url ) . '#webpage';
	$prices    = home_url( '/prices/' );
	$contact   = home_url( '/contact/' );
	$image     = leithbass_seo_image();
	$desc      = wp_strip_all_tags( html_entity_decode( $seo['desc'], ENT_QUOTES, 'UTF-8' ) );
	$same_as   = array_filter( array( leithbass_val( 'instagram' ), leithbass_val( 'google_business_profile' ) ) );

	$school = array(
		'@type'       => array( 'LocalBusiness', 'EducationalOrganization' ),
		'@id'         => $school_id,
		'name'        => 'The Leith Bass Space',
		'url'         => home_url( '/' ),
		'image'       => array( '@type' => 'ImageObject', 'url' => $image['url'], 'width' => $image['width'], 'height' => $image['height'] ),
		'description' => 'One-to-one bass lessons in Leith, Edinburgh, for all ages and levels.',
		'priceRange'  => leithbass_price_range(),
		'address'     => array(
			'@type'           => 'PostalAddress',
			'streetAddress'   => leithbass_val( 'studio_address' ),
			'postalCode'      => leithbass_val( 'studio_postcode' ),
			'addressLocality' => 'Edinburgh',
			'addressRegion'   => 'Scotland',
			'addressCountry'  => 'GB',
		),
		'location'    => array(
			array(
				'@type'   => 'Place',
				'name'    => 'Lost Oscillation',
				'url'     => leithbass_val( 'lostosc' ),
				'address' => array( '@type' => 'PostalAddress', 'streetAddress' => leithbass_val( 'studio_address' ), 'postalCode' => leithbass_val( 'studio_postcode' ), 'addressLocality' => 'Edinburgh', 'addressRegion' => 'Scotland', 'addressCountry' => 'GB' ),
			),
		),
		'areaServed'  => array( '@type' => 'City', 'name' => 'Edinburgh' ),
		'founder'     => array( '@id' => $person_id ),
		'sameAs'      => array_values( $same_as ),
		'hasOfferCatalog' => array(
			'@type'           => 'OfferCatalog',
			'name'            => 'Bass lesson prices',
			'itemListElement' => array(
				leithbass_schema_offer( 'Introductory bass session', 'A 30 minute first session to meet, discuss your goals and see whether the lessons are a good fit.', leithbass_price_from( 'prices_card1_price', '20' ), $contact ),
				leithbass_schema_offer( 'One-to-one bass session', 'A one-hour bass lesson with written notes, materials and access to the member portal.', leithbass_price_from( 'prices_card2_price', '40' ), $prices ),
				leithbass_schema_offer( 'Ten-hour bass session block', 'Ten hours of sessions, diarised in advance and valid for four months.', leithbass_price_from( 'prices_card3_price', '360' ), $prices ),
			),
		),
	);
	$phone = trim( (string) leithbass_val( 'business_phone' ) );
	if ( $phone ) { $school['telephone'] = $phone; }

	$graph = array(
		$school,
		array(
			'@type'    => 'Person',
			'@id'      => $person_id,
			'name'     => 'Jack Elliot',
			'url'      => leithbass_val( 'jackaudio' ),
			'jobTitle' => 'Bassist and bass tutor',
			'worksFor' => array( '@id' => $school_id ),
			'sameAs'   => array_values( array_filter( array( leithbass_val( 'instagram' ), leithbass_val( 'jackaudio' ) ) ) ),
		),
		array(
			'@type'      => 'WebSite',
			'@id'        => $site_id,
			'name'       => 'The Leith Bass Space',
			'url'        => home_url( '/' ),
			'inLanguage' => 'en-GB',
			'publisher'  => array( '@id' => $school_id ),
		),
		array(
			'@type'              => 'WebPage',
			'@id'                => $page_id,
			'url'                => $url,
			'name'               => html_entity_decode( $seo['title'], ENT_QUOTES, 'UTF-8' ),
			'description'        => $desc,
			'inLanguage'         => 'en-GB',
			'isPartOf'           => array( '@id' => $site_id ),
			'about'              => array( '@id' => $school_id ),
			'primaryImageOfPage' => array( '@type' => 'ImageObject', 'url' => $image['url'], 'width' => $image['width'], 'height' => $image['height'] ),
		),
	);

	$slug = function_exists( 'leithbass_hero_slug' ) ? leithbass_hero_slug() : '';
	if ( ! is_front_page() ) {
		$crumbs = array(
			array( '@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => home_url( '/' ) ),
		);
		if ( is_singular( 'leithbass_note' ) ) {
			$crumbs[] = array( '@type' => 'ListItem', 'position' => 2, 'name' => 'Notes', 'item' => get_post_type_archive_link( 'leithbass_note' ) );
			$crumbs[] = array( '@type' => 'ListItem', 'position' => 3, 'name' => get_the_title(), 'item' => $url );
		} else {
			$pages = leithbass_pages();
			$name  = 'notes' === $slug ? 'Notes' : ( isset( $pages[ $slug ] ) ? $pages[ $slug ]['label'] : get_the_title() );
			// Pages in a dropdown sit beneath their parent (Home > Approach > FAQ),
			// and the free tools beneath the Shed tools page (Home > Shed tools > Metronome).
			$above = isset( $pages[ $slug ]['parent'] ) ? $pages[ $slug ]['parent'] : ( isset( $pages[ $slug ]['under'] ) ? $pages[ $slug ]['under'] : '' );
			if ( $above && isset( $pages[ $above ] ) ) {
				$crumbs[] = array( '@type' => 'ListItem', 'position' => 2, 'name' => $pages[ $above ]['label'], 'item' => home_url( '/' . $above . '/' ) );
			}
			$crumbs[] = array( '@type' => 'ListItem', 'position' => count( $crumbs ) + 1, 'name' => $name, 'item' => $url );
		}
		$graph[] = array( '@type' => 'BreadcrumbList', '@id' => trailingslashit( $url ) . '#breadcrumb', 'itemListElement' => $crumbs );
	}

	if ( 'notes' === $slug && ( is_post_type_archive( 'leithbass_note' ) || is_singular( 'leithbass_note' ) ) ) {
		$graph[] = array(
			'@type'       => 'Blog',
			'@id'         => get_post_type_archive_link( 'leithbass_note' ) . '#blog',
			'name'        => 'Notes by Jack Elliot',
			'description' => leithbass_val( 'seo_notes_desc' ),
			'url'         => get_post_type_archive_link( 'leithbass_note' ),
			'author'      => array( '@id' => $person_id ),
			'publisher'   => array( '@id' => $school_id ),
		);
	}

	if ( 'notes' === $slug && is_singular( 'leithbass_note' ) ) {
		$post_id = get_queried_object_id();
		$article = array(
			'@type'            => 'BlogPosting',
			'@id'              => get_permalink( $post_id ) . '#article',
			'headline'         => get_the_title( $post_id ),
			'description'      => $desc,
			'datePublished'    => get_the_date( 'c', $post_id ),
			'dateModified'     => get_the_modified_date( 'c', $post_id ),
			'mainEntityOfPage' => array( '@id' => $page_id ),
			'isPartOf'         => array( '@id' => get_post_type_archive_link( 'leithbass_note' ) . '#blog' ),
			'author'           => array( '@id' => $person_id ),
			'publisher'        => array( '@id' => $school_id ),
			'image'            => array( '@type' => 'ImageObject', 'url' => $image['url'], 'width' => $image['width'], 'height' => $image['height'] ),
		);
		$graph[] = $article;
	}

	// The free tools (and the ear trainer, once it's launched) are applications anyone can use in a browser.
	$is_tool = function_exists( 'leithbass_tool_pages' ) && isset( leithbass_tool_pages()[ $slug ] );
	if ( $is_tool || ( 'ear-trainer' === $slug && leithbass_ear_live() ) || ( 'read' === $slug && leithbass_read_live() ) ) {
		$pages   = leithbass_pages();
		$graph[] = array(
			'@type'               => 'WebApplication',
			'@id'                 => trailingslashit( $url ) . '#app',
			'name'                => ( $is_tool ? $pages[ $slug ]['label'] : ( 'read' === $slug ? 'Read: reading notation for bass players' : 'Ear Training for Bass Players' ) ) . ' | The Leith Bass Space',
			'url'                 => $url,
			'description'         => $desc,
			'applicationCategory' => $is_tool ? 'MusicApplication' : 'EducationalApplication',
			'operatingSystem'     => 'Any',
			'browserRequirements' => 'Requires JavaScript and Web Audio',
			'isAccessibleForFree' => true,
			'inLanguage'          => 'en-GB',
			'offers'              => array( '@type' => 'Offer', 'price' => '0', 'priceCurrency' => 'GBP' ),
			'author'              => array( '@id' => $person_id ),
			'publisher'           => array( '@id' => $school_id ),
			'mainEntityOfPage'    => array( '@id' => $page_id ),
		);
	}

	// The FAQ page's questions and answers, read from the copy the page shows.
	if ( 'faq' === $slug && function_exists( 'leithbass_faq_pairs' ) ) {
		$questions = array();
		foreach ( leithbass_faq_pairs() as $pair ) {
			$questions[] = array(
				'@type'          => 'Question',
				'name'           => $pair['q'],
				'acceptedAnswer' => array( '@type' => 'Answer', 'text' => $pair['a'] ),
			);
		}
		if ( $questions ) {
			$graph[] = array( '@type' => 'FAQPage', '@id' => trailingslashit( $url ) . '#faq', 'isPartOf' => array( '@id' => $page_id ), 'mainEntity' => $questions );
		}
	}

	echo '<script type="application/ld+json">' . wp_json_encode( array( '@context' => 'https://schema.org', '@graph' => $graph ), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . '</script>' . "\n";
}, 5 );
