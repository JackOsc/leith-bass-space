<?php
/**
 * Template Name: Spaces
 *
 * @package LeithBass
 */
get_header();
leithbass_page_head( 'spaces' );
?>

<section class="section">
	<div class="wrap">
		<div class="prose prose-lead reveal">
			<?php leithbass_text( 'spaces_opening' ); ?>
		</div>
	</div>
</section>

<?php leithbass_band( 'band-studio', array( 1920, 1200, 600 ), 'The control room at Lost Oscillation studio' ); ?>

<section class="section" id="studio">
	<div class="wrap">
		<div class="grid-2">
			<div class="reveal">
				<span class="sub-label"><?php leithbass_text( 'spaces_studio_sub' ); ?></span>
				<h2><?php leithbass_text( 'spaces_studio_title' ); ?></h2>
			</div>
			<div class="prose reveal">
				<?php leithbass_text( 'spaces_studio_text' ); ?>
			</div>
		</div>
	</div>
</section>

<section class="tiles" aria-label="The studio">
	<figure class="tile reveal"><?php leithbass_img( 'tile-basses', array( 1440, 900, 450 ), 'A row of bass guitars at Lost Oscillation studio', '(min-width: 700px) 33vw, 100vw' ); ?></figure>
	<figure class="tile reveal"><?php leithbass_img( 'tile-headstock', array( 1440, 900, 450 ), 'Close-up of a bass headstock', '(min-width: 700px) 33vw, 100vw' ); ?></figure>
	<figure class="tile reveal"><?php leithbass_img( 'tile-corridor', array( 1440, 900, 450 ), 'The corridor and logo at Lost Oscillation studio', '(min-width: 700px) 33vw, 100vw' ); ?></figure>
</section>

<section class="cta">
	<div class="wrap reveal">
		<h2><?php leithbass_text( 'spaces_cta_heading' ); ?></h2>
		<?php leithbass_text( 'spaces_cta_body' ); ?>
		<a class="btn" href="<?php echo esc_url( home_url( '/contact/' ) ); ?>"><?php leithbass_text( 'spaces_cta_label' ); ?></a>
	</div>
</section>

<?php get_footer(); ?>
