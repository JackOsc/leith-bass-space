<?php
/**
 * Site header.
 *
 * @package LeithBass
 */
$leithbass_over_hero = is_front_page(); // only the front page has a dark image behind the header
?><!DOCTYPE html>
<html data-theme="dark" <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="<?php echo esc_attr( apply_filters( 'leithbass_viewport', 'width=device-width, initial-scale=1' ) ); ?>">
<meta name="theme-color" content="#090909" id="leithbass-theme-color">
<script>
(function () {
	var theme;
	try { theme = window.localStorage.getItem('leithbass-theme'); } catch (error) { theme = null; }
	if (theme !== 'light' && theme !== 'dark') {
		theme = 'dark';
	}
	document.documentElement.setAttribute('data-theme', theme);
	document.documentElement.style.colorScheme = theme;
	document.getElementById('leithbass-theme-color').setAttribute('content', theme === 'dark' ? '#090909' : '#F3EFE7');
}());
</script>
<?php wp_head(); ?>
</head>
<body <?php body_class( $leithbass_over_hero ? 'over-hero' : 'solid-header' ); ?>>
<?php wp_body_open(); ?>
<a class="skip-link" href="#main"><?php esc_html_e( 'Skip to content', 'leithbass' ); ?></a>

<header class="site-header" id="site-header">
	<div class="wrap">
		<a class="site-logo" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="The Leith Bass Space — home">
			<span class="logo-light"><?php echo leithbass_inline_svg( 'logo-light.svg' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- trusted bundled SVG. ?></span>
			<span class="logo-dark"><?php echo leithbass_inline_svg( 'logo.svg' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- trusted bundled SVG. ?></span>
		</a>
		<div class="header-actions">
			<button class="theme-toggle" type="button" aria-pressed="true" aria-label="Switch to light mode" data-theme-toggle>
				<svg class="theme-icon-moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 15.4A8.4 8.4 0 0 1 8.6 4 8.5 8.5 0 1 0 20 15.4Z"></path></svg>
				<svg class="theme-icon-sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3.75"></circle><path d="M12 2v2.25M12 19.75V22M4.93 4.93l1.59 1.59M17.48 17.48l1.59 1.59M2 12h2.25M19.75 12H22M4.93 19.07l1.59-1.59M17.48 6.52l1.59-1.59"></path></svg>
			</button>
			<a class="header-book" href="<?php echo esc_url( home_url( '/contact/' ) ); ?>"><?php esc_html_e( 'Book', 'leithbass' ); ?></a>
			<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Menu" data-label-closed="<?php esc_attr_e( 'Menu', 'leithbass' ); ?>" data-label-open="<?php esc_attr_e( 'Close', 'leithbass' ); ?>">
				<span class="nav-toggle-label"><?php esc_html_e( 'Menu', 'leithbass' ); ?></span>
			</button>
		</div>
		<nav class="site-nav" id="site-nav" aria-label="Main">
			<?php
			$current = leithbass_hero_slug();
			$section = leithbass_nav_section( $current );
			$nav     = leithbass_nav_pages();
			$lock    = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><rect x="3" y="7" width="10" height="7"></rect><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"></path></svg>';
			$signin  = '';
			?>
			<ul class="nav-main">
				<?php
				// Desktop: each page's heading word, with dropdowns.
				foreach ( $nav as $slug => $p ) {
					$children = leithbass_nav_children( $slug );
					$aria     = ( $current === $slug ) ? ' aria-current="page"' : '';
					$href     = esc_url( home_url( '/' . $slug . '/' ) );

					if ( ! empty( $p['signin'] ) ) {
						$signin = '<a class="nav-signin" href="' . $href . '"' . $aria . '>' . $lock . esc_html( $p['label'] ) . '</a>';
						echo '<li class="nav-signin-item">' . $signin . '</li>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above.
						continue;
					}

					if ( ! $children ) {
						echo '<li><a class="nav-word" href="' . $href . '"' . $aria . '>' . leithbass_nav_word( $p ) . '</a></li>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in leithbass_nav_word().
						continue;
					}

					// A main item with a dropdown: the word still goes to its own page,
					// and the arrow button opens the list for keyboard and touch.
					$menu_id = 'nav-sub-' . $slug;
					$in_here = ( $section === $slug ) ? ' is-current' : '';
					echo '<li class="has-sub' . $in_here . '" data-subnav>';
					echo '<div class="sub-head"><a class="nav-word" href="' . $href . '"' . $aria . '>' . leithbass_nav_word( $p ) . '</a>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
					echo '<button class="sub-toggle" type="button" aria-expanded="false" aria-controls="' . esc_attr( $menu_id ) . '" aria-label="' . esc_attr( sprintf( 'Show %s pages', $p['label'] ) ) . '"><svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M2 4l4 4 4-4"></path></svg></button></div>';
					echo '<ul class="submenu" id="' . esc_attr( $menu_id ) . '">';
					foreach ( $children as $child_slug => $child ) {
						$child_aria = ( $current === $child_slug ) ? ' aria-current="page"' : '';
						echo '<li><a href="' . esc_url( home_url( '/' . $child_slug . '/' ) ) . '"' . $child_aria . '>' . leithbass_nav_word( $child ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
						if ( ! empty( $child['menu_desc'] ) ) {
							echo '<span class="sm-desc">' . esc_html( $child['menu_desc'] ) . '</span>';
						}
						echo '</a></li>';
					}
					echo '</ul></li>';
				}
				?>
			</ul>
			<ul class="nav-phone">
				<?php
				// Phones: one flat list, every page its own entry with a short line.
				// Pages from a dropdown follow straight after their parent.
				foreach ( $nav as $slug => $p ) {
					if ( ! empty( $p['signin'] ) ) { continue; }
					$group = leithbass_nav_children( $slug );
					$group = $group ? $group : array( $slug => $p );
					if ( isset( $group[ $slug ] ) ) { $group[ $slug ] = array_merge( $group[ $slug ], $p ); }
					foreach ( $group as $item_slug => $item ) {
						$here = ( $current === $item_slug ) ? ' aria-current="page"' : '';
						echo '<li><a href="' . esc_url( home_url( '/' . $item_slug . '/' ) ) . '"' . $here . '>' . leithbass_nav_word( $item ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
						if ( ! empty( $item['menu_line'] ) ) {
							echo '<span class="nav-line">' . esc_html( $item['menu_line'] ) . '</span>';
						}
						echo '</a></li>';
					}
				}
				if ( $signin ) {
					echo '<li class="nav-phone-signin">' . $signin . '</li>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built above.
				}
				?>
			</ul>
		</nav>
	</div>
</header>
<main id="main">
