<?php
/**
 * Ear Training for Bass Players before it's launched: a Coming Soon page with a short
 * text and three stills of the app. Nothing of the app itself is loaded.
 *
 * @package LeithBass
 */

get_header();
leithbass_page_head( 'ear-trainer' );
?>

<?php if ( current_user_can( 'manage_options' ) ) : ?>
<div class="harmonic-flag" role="note">
	<div class="wrap">
		<p><strong>This is what everyone else sees.</strong>
		<a href="<?php echo esc_url( leithbass_ear_url() ); ?>">Back to the full page</a>
		<a href="<?php echo esc_url( admin_url( 'themes.php?page=leithbass-content&section=ear-trainer' ) ); ?>">Edit or launch it</a></p>
	</div>
</div>
<?php endif; ?>

<section class="section section-soon">
	<div class="wrap">
		<div class="prose prose-lead reveal">
			<p class="soon-label"><?php leithbass_text( 'ear_soon_label' ); ?></p>
			<?php leithbass_text( 'ear_soon_body' ); ?>
		</div>
		<div class="screens-wrap">
			<div class="screens screens-three" tabindex="0" role="group" aria-label="Pictures of Ear Training">
				<?php for ( $leithbass_i = 1; $leithbass_i <= 3; $leithbass_i++ ) : ?>
					<figure class="shot reveal">
						<?php leithbass_ear_still( $leithbass_i ); ?>
						<figcaption><strong><?php leithbass_text( 'ear_soon_shot' . $leithbass_i . '_title' ); ?></strong><?php leithbass_text( 'ear_soon_shot' . $leithbass_i . '_caption' ); ?></figcaption>
					</figure>
				<?php endfor; ?>
			</div>
		</div>
	</div>
</section>

<?php leithbass_more_tools( 'ear-trainer' ); ?>

<section class="cta">
	<div class="wrap reveal">
		<h2><?php leithbass_text( 'ear_cta_heading' ); ?></h2>
		<?php leithbass_text( 'ear_cta_body' ); ?>
		<a class="btn" href="<?php echo esc_url( home_url( '/contact/' ) ); ?>"><?php leithbass_text( 'ear_cta_label' ); ?></a>
	</div>
</section>

<?php get_footer(); ?>
