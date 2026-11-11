<?php
/**
 * Fallback template.
 *
 * @package LeithBass
 */
get_header();
?>
<div class="page-content">
	<div class="wrap">
		<?php
		while ( have_posts() ) :
			the_post();
			?>
			<h1><?php the_title(); ?></h1>
			<div class="entry"><?php the_content(); ?></div>
			<?php
		endwhile;
		?>
	</div>
</div>
<?php get_footer(); ?>
