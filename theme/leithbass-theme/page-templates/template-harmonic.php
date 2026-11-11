<?php
/**
 * Template Name: Harmonic Elements
 *
 * The course as an app: the Guide (read about an element and play its loop)
 * and the Dojo (the ear trainer). Both come from the Leith Bass Members
 * plugin; this page introduces them and gives them somewhere to sit. With
 * /play/ on the end it is those alone, filling the screen.
 *
 * Until it's launched (Leith Bass Content → Harmonic Elements), everyone but
 * an administrator gets the Coming Soon page instead.
 *
 * @package LeithBass
 */

if ( ! leithbass_harmonic_open() ) {
	get_template_part( 'template-parts/harmonic-soon' );
	return;
}

$leithbass_app = function_exists( 'lbs_harmonic_trainer' );

if ( $leithbass_app && leithbass_is_harmonic_play() ) {
	get_template_part( 'template-parts/harmonic-play' );
	return;
}

get_header();
leithbass_page_head( 'harmonic-elements' );
?>

<?php if ( ! leithbass_harmonic_live() ) : ?>
<div class="harmonic-flag" role="note">
	<div class="wrap">
		<p><strong>Not launched.</strong> Only you can see this page. Everyone else gets the Coming Soon page.
		<a href="<?php echo esc_url( add_query_arg( 'coming-soon', '1', leithbass_harmonic_url() ) ); ?>">See the Coming Soon page</a>
		<a href="<?php echo esc_url( admin_url( 'themes.php?page=leithbass-content&section=harmonic-elements' ) ); ?>">Launch it</a></p>
	</div>
</div>
<?php endif; ?>

<section class="section">
	<div class="wrap">
		<div class="prose prose-lead reveal">
			<?php leithbass_text( 'harmonic_intro' ); ?>
		</div>
	</div>
</section>

<?php if ( $leithbass_app ) : ?>
<section class="harmonic-band" id="trainer" aria-label="Harmonic Elements: the Guide and the Dojo">
	<div class="wrap">
		<?php echo leithbass_app_room_line( 'elements' ); // phpcs:ignore -- escaped where it is built. ?>
		<?php lbs_harmonic_trainer( 'page', array( 'full_url' => leithbass_harmonic_url( true ) ) ); ?>
	</div>
</section>
<?php endif; ?>

<section class="section section-ruled">
	<div class="wrap">
		<div class="grid-2">
			<div class="reveal">
				<span class="sub-label"><?php leithbass_text( 'harmonic_how_sub' ); ?></span>
				<h2><?php leithbass_text( 'harmonic_how_title' ); ?></h2>
			</div>
			<div class="prose reveal">
				<?php leithbass_text( 'harmonic_how_body' ); ?>
			</div>
		</div>
		<ul class="tool-list reveal">
			<?php foreach ( leithbass_points( 'harmonic_points' ) as $leithbass_point ) : ?>
				<li>
					<?php if ( $leithbass_point['label'] ) : ?><h3><?php echo wp_kses_post( $leithbass_point['label'] ); ?></h3><?php endif; ?>
					<p><?php echo wp_kses_post( ucfirst( $leithbass_point['text'] ) ); ?></p>
				</li>
			<?php endforeach; ?>
		</ul>
	</div>
</section>

<section class="section section-ruled">
	<div class="wrap">
		<div class="grid-2">
			<div class="reveal">
				<span class="sub-label"><?php leithbass_text( 'harmonic_access_sub' ); ?></span>
				<h2><?php leithbass_text( 'harmonic_access_title' ); ?></h2>
			</div>
			<div class="prose reveal">
				<?php leithbass_text( 'harmonic_access_body' ); ?>
				<?php if ( leithbass_portal_signin_url() && ! is_user_logged_in() ) : ?>
					<p><a href="<?php echo esc_url( leithbass_portal_signin_url() ); ?>">Member sign in</a></p>
				<?php endif; ?>
			</div>
		</div>
	</div>
</section>

<?php leithbass_more_tools( 'harmonic-elements' ); ?>

<section class="cta">
	<div class="wrap reveal">
		<h2><?php leithbass_text( 'harmonic_cta_heading' ); ?></h2>
		<?php leithbass_text( 'harmonic_cta_body' ); ?>
		<a class="btn" href="<?php echo esc_url( home_url( '/contact/' ) ); ?>"><?php leithbass_text( 'harmonic_cta_label' ); ?></a>
	</div>
</section>

<?php get_footer(); ?>
