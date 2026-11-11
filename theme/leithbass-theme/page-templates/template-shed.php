<?php
/**
 * Template Name: Shed tools
 *
 * The Shed's practice tools, working, for people who haven't joined yet.
 * On a larger screen the demo sits in a phone frame beside the text; on a
 * phone it opens full screen at /shed/try/, like the app itself.
 *
 * @package LeithBass
 */

$leithbass_demo = function_exists( 'lbs_shed_demo' );

if ( $leithbass_demo && leithbass_is_shed_try() ) {
	get_template_part( 'template-parts/shed-try' );
	return;
}

get_header();
leithbass_page_head( 'shed' );
$leithbass_try = $leithbass_demo ? leithbass_shed_url( true ) : '';
?>

<section class="section section-try" id="try-the-shed">
	<div class="wrap">
		<div class="try-grid">
			<div class="try-copy">
				<div class="prose prose-lead"><?php leithbass_text( 'shed_intro' ); ?></div>
				<?php if ( $leithbass_demo ) : ?>
					<div class="try-open">
						<a class="btn" href="<?php echo esc_url( $leithbass_try ); ?>"><?php leithbass_text( 'shed_open_label' ); ?></a>
						<p><?php leithbass_text( 'shed_open_note' ); ?> <?php leithbass_text( 'shed_try_note' ); ?></p>
					</div>
					<p class="try-note"><?php leithbass_text( 'shed_try_note' ); ?></p>
					<p class="try-hint"><?php leithbass_text( 'shed_try_hint' ); ?></p>
				<?php endif; ?>
			</div>
			<div class="try-phone">
				<?php if ( $leithbass_demo ) : ?>
					<div class="phone phone-live"><?php lbs_shed_demo(); ?></div>
					<a class="try-still" href="<?php echo esc_url( $leithbass_try ); ?>" aria-hidden="true" tabindex="-1"><?php leithbass_portal_screen( 3 ); ?></a>
				<?php else : ?>
					<div class="try-still try-still-only"><?php leithbass_portal_screen( 3 ); ?></div>
				<?php endif; ?>
			</div>
		</div>
	</div>
</section>

<section class="section section-ruled">
	<div class="wrap">
		<div class="grid-2">
			<div class="reveal">
				<span class="sub-label"><?php leithbass_text( 'shed_tools_sub' ); ?></span>
				<h2><?php leithbass_text( 'shed_tools_title' ); ?></h2>
			</div>
			<div class="prose reveal">
				<?php leithbass_text( 'shed_tools_body' ); ?>
				<?php if ( trim( leithbass_val( 'shed_aside' ) ) ) : ?>
					<p class="aside-quote"><?php leithbass_text( 'shed_aside' ); ?></p>
				<?php endif; ?>
			</div>
		</div>
		<ul class="tool-list reveal">
			<?php foreach ( leithbass_points( 'shed_tools' ) as $leithbass_tool ) : ?>
				<li>
					<?php if ( $leithbass_tool['label'] ) : ?><h3><?php echo wp_kses_post( $leithbass_tool['label'] ); ?></h3><?php endif; ?>
					<p><?php echo wp_kses_post( ucfirst( $leithbass_tool['text'] ) ); ?></p>
				</li>
			<?php endforeach; ?>
		</ul>
	</div>
</section>

<?php leithbass_more_tools( 'shed', false ); ?>

<section class="section section-ruled">
	<div class="wrap">
		<div class="grid-2">
			<div class="reveal">
				<span class="sub-label"><?php leithbass_text( 'shed_access_sub' ); ?></span>
				<h2><?php leithbass_text( 'shed_access_title' ); ?></h2>
			</div>
			<div class="prose reveal">
				<?php leithbass_text( 'shed_access_body' ); ?>
			</div>
		</div>
	</div>
</section>

<section class="cta">
	<div class="wrap reveal">
		<h2><?php leithbass_text( 'shed_cta_heading' ); ?></h2>
		<?php leithbass_text( 'shed_cta_body' ); ?>
		<a class="btn" href="<?php echo esc_url( home_url( '/contact/' ) ); ?>"><?php leithbass_text( 'shed_cta_label' ); ?></a>
	</div>
</section>

<?php get_footer(); ?>
