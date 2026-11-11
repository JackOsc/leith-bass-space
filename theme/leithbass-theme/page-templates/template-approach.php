<?php
/**
 * Template Name: Approach
 *
 * @package LeithBass
 */
get_header();
leithbass_page_head( 'approach' );
?>

<section class="section">
	<div class="wrap">
		<div class="prose prose-lead reveal">
			<?php leithbass_text( 'approach_opening' ); ?>
		</div>
	</div>
</section>

<?php leithbass_band( 'band-basses', array( 1920, 1200, 600 ), 'A wall of bass guitars at Lost Oscillation studio' ); ?>

<section class="section">
	<div class="wrap">
		<div class="grid-2">
			<div class="reveal">
				<span class="sub-label"><?php leithbass_text( 'approach_who_sub' ); ?></span>
				<h2><?php leithbass_text( 'approach_who_title' ); ?></h2>
			</div>
			<div class="prose reveal">
				<?php leithbass_text( 'approach_who_body' ); ?>
			</div>
		</div>
	</div>
</section>

<section class="section">
	<div class="wrap">
		<div class="grid-2">
			<div class="reveal">
				<span class="sub-label"><?php leithbass_text( 'approach_s1_sub' ); ?></span>
				<h2><?php leithbass_text( 'approach_s1_title' ); ?></h2>
			</div>
			<div class="prose reveal">
				<?php leithbass_text( 'approach_s1_body_a' ); ?>
				<?php leithbass_text( 'approach_s1_body_b' ); ?>
			</div>
		</div>
	</div>
</section>

<?php leithbass_band( 'band-corridor', array( 1920, 1200, 600 ), 'The corridor at Lost Oscillation studio' ); ?>

<section class="section">
	<div class="wrap">
		<div class="grid-2">
			<div class="reveal">
				<span class="sub-label"><?php leithbass_text( 'approach_s2_sub' ); ?></span>
				<h2><?php leithbass_text( 'approach_s2_title' ); ?></h2>
			</div>
			<div class="prose reveal">
				<?php leithbass_text( 'approach_s2_body' ); ?>
				<?php leithbass_text( 'approach_s2_points_v2' ); ?>
			</div>
		</div>
	</div>
</section>

<section class="section">
	<div class="wrap">
		<div class="grid-2">
			<div class="reveal">
				<span class="sub-label"><?php leithbass_text( 'approach_s3_sub' ); ?></span>
				<h2><?php leithbass_text( 'approach_s3_title' ); ?></h2>
			</div>
			<div class="prose reveal">
				<?php leithbass_text( 'approach_s3_body' ); ?>
			</div>
		</div>
	</div>
</section>

<section class="cta">
	<div class="wrap reveal">
		<h2><?php leithbass_text( 'approach_cta_heading' ); ?></h2>
		<?php leithbass_text( 'approach_cta_body' ); ?>
		<a class="btn" href="<?php echo esc_url( home_url( '/contact/' ) ); ?>"><?php leithbass_text( 'approach_cta_label' ); ?></a>
	</div>
</section>

<?php get_footer(); ?>
