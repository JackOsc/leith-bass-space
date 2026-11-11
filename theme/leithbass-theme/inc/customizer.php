<?php
/**
 * Customizer: every field in the content registry becomes an editable control
 * under Appearance → Customize → Site Content.
 *
 * @package LeithBass
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

add_action( 'customize_register', function ( $wp_customize ) {
	$wp_customize->add_panel( 'leithbass_content', array(
		'title'       => 'Site Content',
		'description' => 'Edit the wording on every page. Clearing a field restores the original text.',
		'priority'    => 10,
	) );

	$sections = array();
	$priority = 0;
	foreach ( leithbass_content_registry() as $key => $field ) {
		list( $section_label, $label, $kind, $default ) = $field;
		$section_id = 'leithbass_' . sanitize_title( $section_label );
		if ( ! isset( $sections[ $section_id ] ) ) {
			$wp_customize->add_section( $section_id, array(
				'title'    => $section_label,
				'panel'    => 'leithbass_content',
				'priority' => count( $sections ),
			) );
			$sections[ $section_id ] = true;
		}
		$sanitize = 'wp_kses_post';
		if ( 'email' === $kind ) { $sanitize = 'sanitize_email'; }
		if ( 'url' === $kind )   { $sanitize = 'esc_url_raw'; }
		if ( 'plain_textarea' === $kind ) { $sanitize = 'sanitize_textarea_field'; }
		$wp_customize->add_setting( 'leithbass_' . $key, array(
			'default'           => $default,
			'type'              => 'theme_mod',
			'sanitize_callback' => $sanitize,
		) );
		$wp_customize->add_control( 'leithbass_' . $key, array(
			'label'    => $label,
			'section'  => $section_id,
			'type'     => in_array( $kind, array( 'textarea', 'plain_textarea', 'points' ), true ) ? 'textarea' : ( 'url' === $kind ? 'url' : ( 'email' === $kind ? 'email' : 'text' ) ),
			'priority' => $priority++,
		) );
	}
} );
