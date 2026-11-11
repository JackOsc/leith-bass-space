<?php
/**
 * Ear Training for Bass Players on its own (/ear-trainer/play/): the trainer and nothing
 * else, like an app on a phone, under a slim strip that leads back to the site.
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
	// The trainer is an instrument: it is dark whichever theme the visitor has chosen for the site.
	document.documentElement.setAttribute('data-theme', 'dark');
	document.documentElement.style.colorScheme = 'dark';
}());
</script>
<?php wp_head(); ?>
</head>
<body <?php body_class( 'harmonic-play ear-play' ); ?>>
<?php wp_body_open(); ?>
<header class="try-strip">
	<a class="try-strip-logo" href="<?php echo esc_url( leithbass_ear_url() ); ?>" aria-label="Back to the Ear Training page on leithbass.space"><svg width="26" height="20" viewBox="0 0 44 36" aria-hidden="true"><rect y="0" width="44" height="4.6" rx="2.3" fill="#F3F1EB"/><rect y="11" width="44" height="3.8" rx="1.9" fill="#F3F1EB"/><rect y="22" width="44" height="3" rx="1.5" fill="#F3F1EB"/><rect y="33" width="44" height="2.4" rx="1.2" fill="#F3F1EB"/><circle cx="14" cy="12.9" r="5.4" fill="#E87102"/><circle cx="32" cy="23.5" r="5.4" fill="#E87102"/></svg><span>leith<b>bass</b>.space</span></a>
	<p class="try-strip-text"><?php leithbass_text( 'ear_strip_text' ); ?></p>
	<a class="try-strip-book" href="<?php echo esc_url( home_url( '/contact/' ) ); ?>"><?php leithbass_text( 'ear_strip_book' ); ?></a>
</header>
<main id="main" class="harmonic-main">
	<h1 class="screen-reader-text">Ear Training for Bass Players</h1>
	<?php lbs_ear_trainer( 'full' ); ?>
</main>
<?php wp_footer(); ?>
</body>
</html>
