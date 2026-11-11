<?php
/**
 * The full screen Shed demo (/shed/try/): the tools and nothing else, like the
 * app on a phone, under a slim strip that says it's a demo.
 *
 * @package LeithBass
 */
?><!DOCTYPE html>
<html data-theme="dark" <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#090909" id="leithbass-theme-color">
<script>
(function () {
	var theme;
	try { theme = window.localStorage.getItem('leithbass-theme'); } catch (error) { theme = null; }
	if (theme !== 'light' && theme !== 'dark') { theme = 'dark'; }
	document.documentElement.setAttribute('data-theme', theme);
	document.documentElement.style.colorScheme = theme;
}());
</script>
<?php wp_head(); ?>
</head>
<body <?php body_class( 'shed-try' ); ?>>
<?php wp_body_open(); ?>
<header class="try-strip">
	<a class="try-strip-logo" href="<?php echo esc_url( leithbass_shed_url() ); ?>" aria-label="Leave the demo: back to Shed tools on leithbass.space"><svg width="26" height="20" viewBox="0 0 44 36" aria-hidden="true"><rect y="0" width="44" height="4.6" rx="2.3" fill="#F3F1EB"/><rect y="11" width="44" height="3.8" rx="1.9" fill="#F3F1EB"/><rect y="22" width="44" height="3" rx="1.5" fill="#F3F1EB"/><rect y="33" width="44" height="2.4" rx="1.2" fill="#F3F1EB"/><circle cx="14" cy="12.9" r="5.4" fill="#E87102"/><circle cx="32" cy="23.5" r="5.4" fill="#E87102"/></svg><span>leith<b>bass</b>.space</span></a>
	<p class="try-strip-text"><?php leithbass_text( 'shed_strip_text' ); ?></p>
	<a class="try-strip-book" href="<?php echo esc_url( home_url( '/contact/' ) ); ?>"><?php leithbass_text( 'shed_strip_book' ); ?></a>
</header>
<main id="main" class="try-main">
	<h1 class="screen-reader-text">Shed tools: a demo</h1>
	<?php lbs_shed_demo( 'full' ); ?>
</main>
<?php wp_footer(); ?>
</body>
</html>
