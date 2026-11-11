<?php
/**
 * Template Name: Read
 *
 * Reading notation for bass players (3.19.0): a Guide to reading and a Dojo
 * that makes the page to neck link immediate. The room comes from the Leith
 * Bass Members plugin (1.11.0 and later); this page introduces it and gives it
 * somewhere to sit. With /play/ on the end it is the room alone, filling the
 * screen. A visitor's record is kept in their browser; a member's is kept with
 * their account, in the app.
 *
 * Until it's launched (Leith Bass Content → Read), everyone but an
 * administrator gets the Coming Soon page instead.
 *
 * @package LeithBass
 */

if ( ! leithbass_read_open() ) {
	get_template_part( 'template-parts/read-soon' );
	return;
}

$leithbass_app = function_exists( 'lbs_read_trainer' );

if ( $leithbass_app && leithbass_is_read_play() ) {
	get_template_part( 'template-parts/read-play' );
	return;
}

get_header();
leithbass_page_head( 'read' );
?>

<?php if ( ! leithbass_read_live() ) : ?>
<div class="harmonic-flag" role="note">
	<div class="wrap">
		<p><strong>Not launched.</strong> Only you can see this page. Everyone else gets the Coming Soon page.
		<a href="<?php echo esc_url( add_query_arg( 'coming-soon', '1', leithbass_read_url() ) ); ?>">See the Coming Soon page</a>
		<a href="<?php echo esc_url( admin_url( 'themes.php?page=leithbass-content&section=read' ) ); ?>">Launch it</a></p>
	</div>
</div>
<?php endif; ?>

<section class="section">
	<div class="wrap">
		<div class="prose prose-lead reveal">
			<?php leithbass_text( 'read_intro' ); ?>
		</div>
	</div>
</section>

<?php if ( $leithbass_app ) : ?>
<section class="harmonic-band" id="trainer" aria-label="Read: reading notation for bass players">
	<div class="wrap">
		<?php echo leithbass_app_room_line( 'read' ); // phpcs:ignore -- escaped where it is built. ?>
		<?php lbs_read_trainer( 'page', array( 'full_url' => leithbass_read_url( true ) ) ); ?>
	</div>
</section>
<?php endif; ?>

<section class="section section-ruled">
	<div class="wrap">
		<div class="grid-2">
			<div class="reveal">
				<span class="sub-label"><?php leithbass_text( 'read_how_sub' ); ?></span>
				<h2><?php leithbass_text( 'read_how_title' ); ?></h2>
			</div>
			<div class="prose reveal">
				<?php leithbass_text( 'read_how_body' ); ?>
			</div>
		</div>
		<ul class="tool-list reveal">
			<?php foreach ( leithbass_points( 'read_points' ) as $leithbass_point ) : ?>
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
				<span class="sub-label"><?php leithbass_text( 'read_access_sub' ); ?></span>
				<h2><?php leithbass_text( 'read_access_title' ); ?></h2>
			</div>
			<div class="prose reveal">
				<?php leithbass_text( 'read_access_body' ); ?>
				<?php if ( leithbass_portal_signin_url() && ! is_user_logged_in() ) : ?>
					<p><a href="<?php echo esc_url( leithbass_portal_signin_url() ); ?>">Member sign in</a></p>
				<?php endif; ?>
			</div>
		</div>
	</div>
</section>

<?php leithbass_more_tools( 'read' ); ?>

<section class="cta">
	<div class="wrap reveal">
		<h2><?php leithbass_text( 'read_cta_heading' ); ?></h2>
		<?php leithbass_text( 'read_cta_body' ); ?>
		<a class="btn" href="<?php echo esc_url( home_url( '/contact/' ) ); ?>"><?php leithbass_text( 'read_cta_label' ); ?></a>
	</div>
</section>

<?php get_footer(); ?>
