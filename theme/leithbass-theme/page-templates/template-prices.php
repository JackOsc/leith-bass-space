<?php
/**
 * Template Name: Prices
 *
 * @package LeithBass
 */
get_header();
leithbass_page_head( 'prices' );
?>

<section class="section">
	<div class="wrap">
		<div class="prose prose-lead reveal">
			<h2><?php leithbass_text( 'prices_start_heading' ); ?></h2>
			<?php leithbass_text( 'prices_start_body' ); ?>
		</div>

		<div class="price-cards">
			<?php for ( $i = 1; $i <= 3; $i++ ) : ?>
				<div class="price-card reveal">
					<h3><?php leithbass_text( 'prices_card' . $i . '_title' ); ?></h3>
					<p class="price"><?php leithbass_text( 'prices_card' . $i . '_price' ); ?></p>
					<?php leithbass_text( 'prices_card' . $i . '_body' ); ?>
				</div>
			<?php endfor; ?>
		</div>

		<div class="prose enquire reveal">
			<?php leithbass_text( 'prices_enquire_v2' ); ?>
		</div>
	</div>
</section>

<?php leithbass_band( 'band-corridor', array( 1920, 1200, 600 ), 'The corridor at Lost Oscillation studio' ); ?>

<section class="section">
	<div class="wrap">
		<div class="grid-2">
			<div class="reveal">
				<span class="sub-label"><?php leithbass_text( 'prices_booking_sub' ); ?></span>
				<h2><?php leithbass_text( 'prices_booking_title' ); ?></h2>
			</div>
			<div class="reveal">
				<?php leithbass_text( 'prices_points_a' ); ?>
				<?php leithbass_text( 'prices_points_b' ); ?>
			</div>
		</div>
	</div>
</section>

<section class="cta">
	<div class="wrap reveal">
		<h2><?php leithbass_text( 'prices_cta_heading' ); ?></h2>
		<p><?php leithbass_text( 'prices_cta_body' ); ?></p>
		<a class="btn" href="<?php echo esc_url( home_url( '/contact/' ) ); ?>"><?php leithbass_text( 'prices_cta_label' ); ?></a>
	</div>
</section>

<?php get_footer(); ?>
