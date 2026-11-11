<?php
/**
 * 404 template.
 *
 * @package LeithBass
 */
get_header();
?>
<div class="page-content">
	<div class="wrap">
		<h1>Page not found</h1>
		<div class="entry">
			<p>That page doesn't exist (or has moved). Try the <a href="<?php echo esc_url( home_url( '/' ) ); ?>">homepage</a>, or <a href="<?php echo esc_url( home_url( '/contact/' ) ); ?>">get in touch</a>.</p>
		</div>
	</div>
</div>
<?php get_footer(); ?>
