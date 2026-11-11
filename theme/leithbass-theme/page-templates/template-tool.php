<?php
/**
 * Template Name: Free tool (metronome, drone or tuner)
 *
 * One of the Shed's tools on a page of its own, free for anyone, with no
 * account: the metronome at /metronome/, the drone at /drone/ and the tuner at
 * /tuner/. The tool itself comes from the Leith Bass Members plugin. It sits
 * straight under the heading, so someone who came for a metronome has one
 * without scrolling; what it does, and the rest of the tools, come after.
 *
 * Which tool is shown goes by the page's address (see leithbass_pages()).
 *
 * @package LeithBass
 */

$leithbass_tool = leithbass_current_tool();
if ( ! $leithbass_tool ) {
	// The template has been given to some other page: show that page plainly.
	require get_template_directory() . '/index.php';
	return;
}
$leithbass_slug = (string) get_post_field( 'post_name', get_queried_object_id() );
$leithbass_key  = 'tool_' . $leithbass_tool . '_';
$leithbass_live = function_exists( 'lbs_shed_tool' );

get_header();
leithbass_page_head( $leithbass_slug );
?>

<section class="tool-stage" id="tool" aria-label="<?php echo esc_attr( ucfirst( $leithbass_tool ) ); ?>">
	<div class="wrap">
		<?php if ( $leithbass_live ) : ?>
			<?php lbs_shed_tool( $leithbass_tool ); ?>
			<p class="tool-note"><?php leithbass_text( $leithbass_key . 'note' ); ?></p>
		<?php else : ?>
			<p class="tool-note">The <?php echo esc_html( $leithbass_tool ); ?> isn&rsquo;t available at the moment.</p>
		<?php endif; ?>
	</div>
</section>

<section class="section section-tool-intro">
	<div class="wrap">
		<div class="prose prose-lead reveal">
			<?php leithbass_text( $leithbass_key . 'intro' ); ?>
		</div>
	</div>
</section>

<section class="section section-ruled">
	<div class="wrap">
		<div class="grid-2">
			<div class="reveal">
				<span class="sub-label"><?php leithbass_text( $leithbass_key . 'how_sub' ); ?></span>
				<h2><?php leithbass_text( $leithbass_key . 'how_title' ); ?></h2>
			</div>
			<div class="prose reveal">
				<?php leithbass_text( $leithbass_key . 'how_body' ); ?>
			</div>
		</div>
		<ul class="tool-list reveal">
			<?php foreach ( leithbass_points( $leithbass_key . 'points' ) as $leithbass_point ) : ?>
				<li>
					<?php if ( $leithbass_point['label'] ) : ?><h3><?php echo wp_kses_post( $leithbass_point['label'] ); ?></h3><?php endif; ?>
					<p><?php echo wp_kses_post( ucfirst( $leithbass_point['text'] ) ); ?></p>
				</li>
			<?php endforeach; ?>
		</ul>
	</div>
</section>

<?php leithbass_more_tools( $leithbass_slug ); ?>

<section class="cta">
	<div class="wrap reveal">
		<h2><?php leithbass_text( 'shed_cta_heading' ); ?></h2>
		<?php leithbass_text( 'shed_cta_body' ); ?>
		<a class="btn" href="<?php echo esc_url( home_url( '/contact/' ) ); ?>"><?php leithbass_text( 'shed_cta_label' ); ?></a>
	</div>
</section>

<?php get_footer(); ?>
