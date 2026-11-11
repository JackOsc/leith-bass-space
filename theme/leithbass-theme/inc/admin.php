<?php
/**
 * WordPress-native content and image editing tools.
 *
 * @package LeithBass
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

/** Map registry section labels to the tabs in the editor. */
function leithbass_admin_section_slug( $label ) {
	$label = strtolower( wp_strip_all_tags( $label ) );
	if ( 0 === strpos( $label, 'homepage' ) ) { return 'home'; }
	if ( 0 === strpos( $label, 'approach' ) ) { return 'approach'; }
	if ( 0 === strpos( $label, 'portal' ) ) { return 'portal'; }
	if ( 0 === strpos( $label, 'shed' ) ) { return 'shed'; }
	if ( 0 === strpos( $label, 'harmonic' ) ) { return 'harmonic-elements'; }
	if ( 0 === strpos( $label, 'ear trainer' ) || 0 === strpos( $label, 'ear training' ) ) { return 'ear-trainer'; }
	if ( 0 === strpos( $label, 'read page' ) ) { return 'read'; }
	if ( 0 === strpos( $label, 'free tools' ) ) { return 'tools'; }
	if ( 0 === strpos( $label, 'faq' ) ) { return 'faq'; }
	if ( 0 === strpos( $label, 'spaces' ) ) { return 'spaces'; }
	if ( 0 === strpos( $label, 'prices' ) ) { return 'prices'; }
	if ( 0 === strpos( $label, 'notes' ) ) { return 'notes'; }
	if ( 0 === strpos( $label, 'contact & links' ) ) { return 'global'; }
	if ( 0 === strpos( $label, 'contact' ) ) { return 'contact'; }
	return 'seo';
}

/** The editor tabs and their plain-language descriptions. */
function leithbass_admin_sections() {
	return array(
		'home'     => array( 'Homepage', 'Edit the homepage copy and photographs.' ),
		'approach' => array( 'Approach', 'Edit the teaching approach, supporting copy and photographs.' ),
		'portal'   => array( 'The Portal', 'Edit the page that explains the member portal: its copy, the four example screens (or your own screenshots) and the example session notes.' ),
		'shed'     => array( 'Shed tools', 'Edit the Shed tools page: its copy, the tool list, the call to action and the strip above the full screen demo. The demo itself comes from the member portal plugin.' ),
		'harmonic-elements' => array( 'Harmonic Elements', 'Launch Harmonic Elements when it\'s ready, and edit its page: the Coming Soon wording and pictures, the copy around the Guide and the Dojo, and the strip above the full screen version. The Guide, the Dojo and their loops come from the member portal plugin (Members, Portal settings).' ),
		'ear-trainer' => array( 'Ear Training', 'Launch Ear Training for Bass Players when it\'s ready, and edit its page: the Coming Soon wording and pictures, the copy around the trainer, and the strip above the full screen version. The trainer itself comes from the member portal plugin.' ),
		'read'     => array( 'Read', 'Launch Read when it\'s ready (its page and its room in the members\' app), and edit its page: the Coming Soon wording and pictures, the copy around the Guide and the Dojo, and the strip above the full screen version. Read itself comes from the member portal plugin.' ),
		'tools'    => array( 'Free tools', 'Edit the pages for the free metronome, drone and tuner (/metronome/, /drone/ and /tuner/): each one\'s heading and copy, the photograph in their headings, and the More tools list that appears under them. The tools themselves come from the member portal plugin. Their search titles are under Search previews.' ),
		'faq'      => array( 'FAQ', 'Edit the questions and answers. In each group, set each question as Heading 3 with its answer in paragraphs beneath; the same text feeds the FAQ search data.' ),
		'spaces'   => array( 'The Space', 'Edit the studio description and its photographs.' ),
		'prices'   => array( 'Prices', 'Edit prices, booking terms and calls to action.' ),
		'notes'    => array( 'Notes', 'Prepare the Notes section, manage its manuscript heading and choose when it becomes public.' ),
		'contact'  => array( 'Contact', 'Edit the contact-page copy and heading photograph.' ),
		'global'   => array( 'Links & footer', 'Edit contact details, external links, the form destination and the footer.' ),
		'seo'      => array( 'Search previews', 'Edit page titles, descriptions and the social-sharing image. The verification field normally stays unchanged.' ),
	);
}

/** Add the editor beneath Appearance. */
function leithbass_admin_menu() {
	add_theme_page(
		'Leith Bass Content',
		'Leith Bass Content',
		'edit_theme_options',
		'leithbass-content',
		'leithbass_content_admin_page'
	);
}
add_action( 'admin_menu', 'leithbass_admin_menu' );

/** A front-end shortcut for logged-in administrators. */
function leithbass_admin_bar_link( $admin_bar ) {
	if ( ! current_user_can( 'edit_theme_options' ) || is_admin() ) { return; }
	$section = function_exists( 'leithbass_hero_slug' ) ? leithbass_hero_slug() : 'home';
	if ( function_exists( 'leithbass_tool_pages' ) && isset( leithbass_tool_pages()[ $section ] ) ) { $section = 'tools'; }
	if ( 'privacy' === $section || ( 'notes' === $section && is_singular( 'leithbass_note' ) ) ) {
		$url = get_edit_post_link( get_queried_object_id(), 'raw' );
	} else {
		$allowed = leithbass_admin_sections();
		if ( ! isset( $allowed[ $section ] ) ) { $section = 'home'; }
		$url = admin_url( 'themes.php?page=leithbass-content&section=' . $section );
	}
	if ( $url ) {
		$admin_bar->add_node( array( 'id' => 'leithbass-edit-content', 'title' => 'Edit Leith Bass content', 'href' => $url ) );
	}
}
add_action( 'admin_bar_menu', 'leithbass_admin_bar_link', 85 );

/** Load the Media Library and the editor's small supporting assets only here. */
function leithbass_admin_assets( $hook ) {
	if ( 'appearance_page_leithbass-content' !== $hook ) { return; }
	wp_enqueue_media();
	wp_enqueue_style( 'leithbass-admin', get_template_directory_uri() . '/assets/css/admin.css', array(), LEITHBASS_VERSION );
	wp_enqueue_script( 'leithbass-admin', get_template_directory_uri() . '/assets/js/admin.js', array(), LEITHBASS_VERSION, true );
}
add_action( 'admin_enqueue_scripts', 'leithbass_admin_assets' );

/** The bundled fallback image shown before a Media Library replacement is set. */
function leithbass_admin_default_image_url( $slug, $width ) {
	if ( ! $width && in_array( $slug, array( 'og-default', 'og-portal' ), true ) ) {
		return get_template_directory_uri() . '/assets/img/' . $slug . '.jpg';
	}
	$registry = leithbass_image_registry();
	if ( ! empty( $registry[ $slug ]['placeholder'] ) ) {
		// No bundled photograph: the page draws an example screen instead.
		return get_template_directory_uri() . '/assets/img/portal-shot-placeholder.svg';
	}
	return get_template_directory_uri() . '/assets/img/' . $slug . '-' . absint( $width ) . '.webp';
}

/** Render the dedicated content editor. */
function leithbass_content_admin_page() {
	if ( ! current_user_can( 'edit_theme_options' ) ) { return; }

	$sections = leithbass_admin_sections();
	$current  = isset( $_GET['section'] ) ? sanitize_key( wp_unslash( $_GET['section'] ) ) : 'home';
	if ( ! isset( $sections[ $current ] ) ) { $current = 'home'; }
	?>
	<div class="wrap jackaudio-admin">
		<h1>Leith Bass Content</h1>
		<p class="jackaudio-admin-intro">Change the site without editing theme files. Text, images, focal points and scroll movement are saved in WordPress and remain in place when the theme is updated.</p>

		<nav class="nav-tab-wrapper" aria-label="Content sections">
			<?php foreach ( $sections as $slug => $section ) : ?>
				<a class="nav-tab <?php echo $current === $slug ? 'nav-tab-active' : ''; ?>" href="<?php echo esc_url( admin_url( 'themes.php?page=leithbass-content&section=' . $slug ) ); ?>"><?php echo esc_html( $section[0] ); ?></a>
			<?php endforeach; ?>
			<a class="nav-tab" href="<?php echo esc_url( admin_url( 'edit.php?post_type=leithbass_note' ) ); ?>">Notes articles</a>
		</nav>

		<?php if ( isset( $_GET['updated'] ) ) : ?>
			<div class="notice notice-success is-dismissible"><p>Changes saved.</p></div>
		<?php endif; ?>

		<h2><?php echo esc_html( $sections[ $current ][0] ); ?></h2>
		<p><?php echo esc_html( $sections[ $current ][1] ); ?></p>

		<form action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post">
			<input type="hidden" name="action" value="leithbass_save_content">
			<input type="hidden" name="leithbass_section" value="<?php echo esc_attr( $current ); ?>">
			<?php wp_nonce_field( 'leithbass_save_content_' . $current, 'leithbass_content_nonce' ); ?>

			<?php if ( 'harmonic-elements' === $current ) : ?>
				<section class="jackaudio-publish-control">
					<label for="leithbass-harmonic-live">
						<input id="leithbass-harmonic-live" name="leithbass_harmonic_live" type="checkbox" value="1" <?php checked( leithbass_harmonic_live() ); ?>>
						<strong>Launch Harmonic Elements: open the Guide and the Dojo to everyone</strong>
					</label>
					<p>Leave this unticked while it's being built. Visitors and members get the Coming Soon page below, the menu says Coming soon, search engines are asked not to list the page, and no loops are sent to anyone but you. Signed in as an administrator, you get the full page.</p>
					<?php if ( function_exists( 'leithbass_harmonic_url' ) && leithbass_harmonic_url() ) : ?>
						<p><a class="button" href="<?php echo esc_url( leithbass_harmonic_url() ); ?>" target="_blank" rel="noopener">Open the full page</a> <a class="button button-secondary" href="<?php echo esc_url( add_query_arg( 'coming-soon', '1', leithbass_harmonic_url() ) ); ?>" target="_blank" rel="noopener">See the Coming Soon page</a></p>
					<?php endif; ?>
				</section>
			<?php endif; ?>

			<?php if ( 'read' === $current ) : ?>
				<section class="jackaudio-publish-control">
					<label for="leithbass-read-live">
						<input id="leithbass-read-live" name="leithbass_read_live" type="checkbox" value="1" <?php checked( leithbass_read_live() ); ?>>
						<strong>Launch Read: open its page to everyone and its room to members</strong>
					</label>
					<p>Leave this unticked while you're trying it. Visitors get the Coming Soon page below, members see Coming soon in its room, the menu says Coming soon, and search engines are asked not to list the page. Signed in as an administrator, you get the whole thing (and with "Use the app as yourself" on in Members, Portal settings, your own record in the app). It has its own switch, so it can be launched before or after the other rooms.</p>
					<?php if ( function_exists( 'leithbass_read_url' ) && leithbass_read_url() ) : ?>
						<p><a class="button" href="<?php echo esc_url( leithbass_read_url() ); ?>" target="_blank" rel="noopener">Open the full page</a> <a class="button button-secondary" href="<?php echo esc_url( add_query_arg( 'coming-soon', '1', leithbass_read_url() ) ); ?>" target="_blank" rel="noopener">See the Coming Soon page</a><?php if ( function_exists( 'lbs_portal_url' ) ) : ?> <a class="button button-secondary" href="<?php echo esc_url( lbs_portal_url( 'read' ) ); ?>" target="_blank" rel="noopener">Open the room in the app</a><?php endif; ?></p>
					<?php endif; ?>
				</section>
			<?php endif; ?>

			<?php if ( 'ear-trainer' === $current ) : ?>
				<section class="jackaudio-publish-control">
					<label for="leithbass-ear-live">
						<input id="leithbass-ear-live" name="leithbass_ear_live" type="checkbox" value="1" <?php checked( leithbass_ear_live() ); ?>>
						<strong>Launch Ear Training: open it to everyone</strong>
					</label>
					<p>Leave this unticked while you're trying it. Visitors and members get the Coming Soon page below, the menu says Coming soon, search engines are asked not to list the page, and the trainer is sent to nobody but you. Signed in as an administrator, you get the full page. It has its own switch, so it can be launched before or after Harmonic Elements.</p>
					<?php if ( function_exists( 'leithbass_ear_url' ) && leithbass_ear_url() ) : ?>
						<p><a class="button" href="<?php echo esc_url( leithbass_ear_url() ); ?>" target="_blank" rel="noopener">Open the full page</a> <a class="button button-secondary" href="<?php echo esc_url( add_query_arg( 'coming-soon', '1', leithbass_ear_url() ) ); ?>" target="_blank" rel="noopener">See the Coming Soon page</a></p>
					<?php endif; ?>
				</section>
			<?php endif; ?>

			<?php if ( 'tools' === $current && function_exists( 'leithbass_tool_pages' ) ) : ?>
				<section class="jackaudio-publish-control">
					<p><strong>These three pages are open to everyone, with no sign in.</strong> They're in the sitemap and the footer, and the Shed tools page links to them.</p>
					<p>
						<?php foreach ( leithbass_tool_pages() as $leithbass_slug => $leithbass_tool ) : ?>
							<?php if ( leithbass_page_url( $leithbass_slug ) ) : ?>
								<a class="button" href="<?php echo esc_url( leithbass_page_url( $leithbass_slug ) ); ?>" target="_blank" rel="noopener">Open the <?php echo esc_html( $leithbass_tool ); ?></a>
							<?php endif; ?>
						<?php endforeach; ?>
					</p>
				</section>
			<?php endif; ?>

			<?php if ( 'notes' === $current ) : ?>
				<section class="jackaudio-publish-control">
					<label for="leithbass-notes-enabled">
						<input id="leithbass-notes-enabled" name="leithbass_notes_enabled" type="checkbox" value="1" <?php checked( leithbass_notes_enabled() ); ?>>
						<strong>Make Notes public and add Notes to the site navigation</strong>
					</label>
					<p>Leave this unticked while preparing articles. Notes remains available in WordPress, and administrators can preview drafts, but visitors and search engines receive a normal page-not-found response.</p>
					<p><a class="button" href="<?php echo esc_url( admin_url( 'edit.php?post_type=leithbass_note' ) ); ?>">Manage Notes articles</a> <a class="button button-secondary" href="<?php echo esc_url( admin_url( 'post-new.php?post_type=leithbass_note' ) ); ?>">Add a new article</a></p>
				</section>
			<?php endif; ?>

			<div class="jackaudio-fields">
				<?php foreach ( leithbass_content_registry() as $key => $field ) : ?>
					<?php
					list( $section_label, $label, $kind ) = $field;
					if ( $current !== leithbass_admin_section_slug( $section_label ) ) { continue; }
					$value = leithbass_val( $key );
					?>
					<section class="jackaudio-field">
						<label for="leithbass-field-<?php echo esc_attr( $key ); ?>"><strong><?php echo esc_html( $label ); ?></strong></label>
						<?php if ( 'textarea' === $kind || 'points' === $kind ) : ?>
							<?php
							wp_editor( $value, 'leithbass-field-' . $key, array(
								'textarea_name' => 'leithbass_content[' . $key . ']',
								'textarea_rows' => 7,
								'media_buttons' => false,
								'teeny'         => true,
								'quicktags'     => true,
							) );
							?>
						<?php elseif ( 'plain_textarea' === $kind ) : ?>
							<textarea class="large-text" id="leithbass-field-<?php echo esc_attr( $key ); ?>" name="leithbass_content[<?php echo esc_attr( $key ); ?>]" rows="4"><?php echo esc_textarea( $value ); ?></textarea>
						<?php else : ?>
							<input class="regular-text" id="leithbass-field-<?php echo esc_attr( $key ); ?>" name="leithbass_content[<?php echo esc_attr( $key ); ?>]" type="<?php echo 'url' === $kind ? 'url' : ( 'email' === $kind ? 'email' : 'text' ); ?>" value="<?php echo esc_attr( $value ); ?>">
						<?php endif; ?>
					</section>
				<?php endforeach; ?>
			</div>

			<?php
			$has_images = false;
			foreach ( leithbass_image_registry() as $slug => $image ) {
				if ( $current === leithbass_admin_section_slug( $image['section'] ) ) { $has_images = true; break; }
			}
			?>
			<?php if ( $has_images ) : ?>
				<h2 class="jackaudio-image-heading">Images</h2>
				<p>Choose replacements from the Media Library. Focal point controls what stays central in cropped images; scroll movement controls how far moving images travel.</p>
				<div class="jackaudio-image-grid">
					<?php foreach ( leithbass_image_registry() as $slug => $image ) : ?>
						<?php
						$section_label = $image['section'];
						$label         = $image['label'];
						$width         = $image['width'];
						$parallax      = $image['parallax'];
						$default_focal = $image['focal'];
						$default_motion = $image['motion'];
						$static_focal  = ! empty( $image['static_focal'] );
						if ( $current !== leithbass_admin_section_slug( $section_label ) ) { continue; }
						$attachment_id = leithbass_image_id( $slug );
						$default_url   = leithbass_admin_default_image_url( $slug, $width );
						$preview_url   = $attachment_id ? wp_get_attachment_image_url( $attachment_id, 'medium_large' ) : $default_url;
						$focal         = leithbass_image_setting( $slug, 'focal', $default_focal );
						$motion        = leithbass_image_setting( $slug, 'motion', $default_motion );
						?>
						<section class="jackaudio-image-card" data-image-card data-default-url="<?php echo esc_url( $default_url ); ?>">
							<h3><?php echo esc_html( $label ); ?></h3>
							<div class="jackaudio-image-preview"><img src="<?php echo esc_url( $preview_url ); ?>" alt=""></div>
							<input type="hidden" class="jackaudio-image-id" name="leithbass_images[<?php echo esc_attr( $slug ); ?>][id]" value="<?php echo esc_attr( $attachment_id ); ?>">
							<p class="jackaudio-image-actions">
								<button class="button jackaudio-image-choose" type="button">Choose image</button>
								<button class="button-link-delete jackaudio-image-reset" type="button"<?php echo $attachment_id ? '' : ' hidden'; ?>><?php echo empty( $image['placeholder'] ) ? 'Use bundled image' : 'Use the drawn example'; ?></button>
							</p>
							<?php if ( $parallax || $static_focal ) : ?>
								<label class="jackaudio-range">Vertical focal point <output><?php echo esc_html( round( $focal ) ); ?>%</output>
									<input type="range" min="0" max="100" step="1" name="leithbass_images[<?php echo esc_attr( $slug ); ?>][focal]" value="<?php echo esc_attr( $focal ); ?>">
								</label>
							<?php endif; ?>
							<?php if ( $parallax ) : ?>
								<label class="jackaudio-range">Scroll movement <output><?php echo esc_html( round( $motion ) ); ?>%</output>
									<input type="range" min="0" max="100" step="1" name="leithbass_images[<?php echo esc_attr( $slug ); ?>][motion]" value="<?php echo esc_attr( $motion ); ?>">
								</label>
							<?php endif; ?>
						</section>
					<?php endforeach; ?>
				</div>
			<?php endif; ?>

			<?php submit_button( 'Save changes' ); ?>
			<p class="description">Clearing a text field or removing a replacement image restores the bundled default.</p>
		</form>
	</div>
	<?php
}

/** Sanitize and save one editor tab. */
function leithbass_save_content() {
	if ( ! current_user_can( 'edit_theme_options' ) ) { wp_die( 'You do not have permission to edit this site.' ); }

	$sections = leithbass_admin_sections();
	$current  = isset( $_POST['leithbass_section'] ) ? sanitize_key( wp_unslash( $_POST['leithbass_section'] ) ) : '';
	if ( ! isset( $sections[ $current ] ) ) { wp_die( 'Unknown content section.' ); }
	check_admin_referer( 'leithbass_save_content_' . $current, 'leithbass_content_nonce' );

	$submitted = isset( $_POST['leithbass_content'] ) && is_array( $_POST['leithbass_content'] ) ? wp_unslash( $_POST['leithbass_content'] ) : array();
	if ( 'harmonic-elements' === $current ) {
		update_option( 'leithbass_harmonic_live', isset( $_POST['leithbass_harmonic_live'] ) ? 1 : 0, false );
	}
	if ( 'ear-trainer' === $current ) {
		update_option( 'leithbass_ear_live', isset( $_POST['leithbass_ear_live'] ) ? 1 : 0, false );
	}
	if ( 'read' === $current ) {
		update_option( 'leithbass_read_live', isset( $_POST['leithbass_read_live'] ) ? 1 : 0, false );
	}
	if ( 'notes' === $current ) {
		$was_enabled = leithbass_notes_enabled();
		$is_enabled  = isset( $_POST['leithbass_notes_enabled'] ) ? 1 : 0;
		update_option( 'leithbass_notes_enabled', $is_enabled, false );
		if ( (bool) $is_enabled !== $was_enabled ) { flush_rewrite_rules( false ); }
	}
	foreach ( leithbass_content_registry() as $key => $field ) {
		list( $section_label, $label, $kind ) = $field;
		if ( $current !== leithbass_admin_section_slug( $section_label ) || ! array_key_exists( $key, $submitted ) ) { continue; }
		$value = $submitted[ $key ];
		if ( 'url' === $kind ) {
			$value = esc_url_raw( $value );
		} elseif ( 'email' === $kind ) {
			$value = sanitize_email( $value );
		} elseif ( 'plain_textarea' === $kind ) {
			$value = sanitize_textarea_field( $value );
		} else {
			$value = wp_kses_post( $value );
		}
		if ( '' === trim( (string) $value ) ) { remove_theme_mod( 'leithbass_' . $key ); }
		else { set_theme_mod( 'leithbass_' . $key, $value ); }
	}
	update_option( 'leithbass_content_modified', time(), false ); // For the sitemap's lastmod.

	$images = isset( $_POST['leithbass_images'] ) && is_array( $_POST['leithbass_images'] ) ? wp_unslash( $_POST['leithbass_images'] ) : array();
	foreach ( leithbass_image_registry() as $slug => $image ) {
		if ( $current !== leithbass_admin_section_slug( $image['section'] ) || ! isset( $images[ $slug ] ) ) { continue; }
		$attachment_id = isset( $images[ $slug ]['id'] ) ? absint( $images[ $slug ]['id'] ) : 0;
		if ( $attachment_id && 'attachment' === get_post_type( $attachment_id ) && wp_attachment_is_image( $attachment_id ) ) {
			set_theme_mod( 'leithbass_image_' . $slug, $attachment_id );
		} else {
			remove_theme_mod( 'leithbass_image_' . $slug );
		}
		foreach ( array( 'focal', 'motion' ) as $setting ) {
			if ( isset( $images[ $slug ][ $setting ] ) ) {
				set_theme_mod( 'leithbass_' . $setting . '_' . $slug, max( 0, min( 100, (int) $images[ $slug ][ $setting ] ) ) );
			}
		}
	}

	wp_safe_redirect( admin_url( 'themes.php?page=leithbass-content&section=' . $current . '&updated=1' ) );
	exit;
}
add_action( 'admin_post_leithbass_save_content', 'leithbass_save_content' );
