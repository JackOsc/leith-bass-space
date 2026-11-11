<?php
/**
 * Hidden-until-enabled Notes section and block-editor support.
 *
 * @package LeithBass
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

/** Whether the public Notes archive, articles and navigation item are enabled. */
function leithbass_notes_enabled() {
	return (bool) get_option( 'leithbass_notes_enabled', false );
}

/** Register Notes as a block-editor post type. */
function leithbass_register_notes() {
	register_post_type( 'leithbass_note', array(
		'labels' => array(
			'name'               => 'Notes',
			'singular_name'      => 'Note',
			'menu_name'          => 'Notes',
			'add_new'            => 'Add article',
			'add_new_item'       => 'Add Notes article',
			'edit_item'          => 'Edit Notes article',
			'new_item'           => 'New Notes article',
			'view_item'          => 'Preview Notes article',
			'search_items'       => 'Search Notes',
			'not_found'          => 'No Notes articles found.',
			'not_found_in_trash' => 'No Notes articles found in the bin.',
		),
		'public'              => true,
		'publicly_queryable'  => true,
		'show_ui'             => true,
		'show_in_menu'        => true,
		'show_in_rest'        => true,
		'rest_base'           => 'notes',
		'exclude_from_search' => ! leithbass_notes_enabled(),
		'has_archive'         => 'notes',
		'rewrite'             => array( 'slug' => 'notes', 'with_front' => false ),
		'menu_icon'           => 'dashicons-welcome-write-blog',
		'menu_position'       => 6,
		'supports'            => array( 'title', 'editor', 'excerpt', 'thumbnail', 'revisions' ),
		'taxonomies'          => array( 'category', 'post_tag' ),
		'template'            => array(
			array( 'core/paragraph', array( 'placeholder' => 'Open with the idea, problem or observation the article is about...' ) ),
			array( 'core/heading', array( 'level' => 2, 'placeholder' => 'Section heading' ) ),
			array( 'core/paragraph', array( 'placeholder' => 'Develop the thought here. Use the block inserter to add images, galleries, audio, video or embeds anywhere.' ) ),
		),
		'template_lock'       => false,
	) );
}
add_action( 'init', 'leithbass_register_notes' );

/** True on the public Notes archive or an individual Notes article. */
function leithbass_is_notes_request() {
	return is_post_type_archive( 'leithbass_note' ) || is_singular( 'leithbass_note' );
}

/**
 * Keep Notes fully private until its switch is enabled. Logged-in editors may
 * still use WordPress's signed preview URLs for drafts and published articles.
 */
function leithbass_protect_hidden_notes() {
	if ( leithbass_notes_enabled() || ! leithbass_is_notes_request() ) { return; }
	$post_id = get_queried_object_id();
	if ( is_singular( 'leithbass_note' ) && is_preview() && $post_id && current_user_can( 'edit_post', $post_id ) ) { return; }

	global $wp_query;
	$wp_query->set_404();
	status_header( 404 );
	nocache_headers();
	$template = get_404_template();
	if ( $template ) { include $template; }
	exit;
}
add_action( 'template_redirect', 'leithbass_protect_hidden_notes', 0 );

/** Do not expose published Notes through the public REST API while hidden. */
add_filter( 'rest_pre_dispatch', function ( $result, $server, $request ) {
	if ( ! leithbass_notes_enabled() && preg_match( '#^/wp/v2/notes(?:/|$)#', $request->get_route() ) && ! current_user_can( 'edit_posts' ) ) {
		return new WP_Error( 'rest_no_route', 'No route was found matching the URL and request method.', array( 'status' => 404 ) );
	}
	return $result;
}, 10, 3 );

/** Explain the hidden/public state and the modular blocks on Notes admin pages. */
add_action( 'admin_notices', function () {
	$screen = get_current_screen();
	if ( ! $screen || 'leithbass_note' !== $screen->post_type ) { return; }
	$settings = admin_url( 'themes.php?page=leithbass-content&section=notes' );
	?>
	<div class="notice notice-info">
		<p><strong><?php echo leithbass_notes_enabled() ? 'Notes is public.' : 'Notes is currently hidden from visitors and search engines.'; ?></strong>
		Use the block inserter (+) for paragraphs, headings, images, galleries, audio and video players, quotes, columns, buttons, or Spotify, YouTube and SoundCloud embeds. <?php if ( ! leithbass_notes_enabled() ) : ?>Save articles as drafts and use Preview while you prepare them.<?php endif; ?> <a href="<?php echo esc_url( $settings ); ?>">Notes settings</a>.</p>
	</div>
	<?php
} );

/** Keep Notes ordered newest first in the admin list and public archive. */
add_action( 'pre_get_posts', function ( $query ) {
	if ( ! $query->is_main_query() ) { return; }
	if ( ( is_admin() && 'leithbass_note' === $query->get( 'post_type' ) ) || ( ! is_admin() && $query->is_post_type_archive( 'leithbass_note' ) ) ) {
		$query->set( 'orderby', 'date' );
		$query->set( 'order', 'DESC' );
	}
} );
