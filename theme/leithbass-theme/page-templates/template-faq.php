<?php
/**
 * Template Name: FAQ
 *
 * Questions before you start. Each group's copy is a run of Heading 3
 * questions and paragraph answers, edited in Leith Bass Content.
 *
 * @package LeithBass
 */
get_header();
$leithbass_groups = leithbass_faq_groups();
leithbass_page_head( 'faq', leithbass_val( 'faq_intro' ) );
?>

<?php if ( count( $leithbass_groups ) > 1 ) : ?>
	<nav class="faq-jump-wrap" aria-label="Jump to a group of questions">
		<div class="wrap">
			<ul class="faq-jump">
				<?php foreach ( $leithbass_groups as $leithbass_group ) : ?>
					<li><a href="#<?php echo esc_attr( $leithbass_group['anchor'] ); ?>"><?php leithbass_text( $leithbass_group['sub'] ); ?></a></li>
				<?php endforeach; ?>
			</ul>
		</div>
	</nav>
<?php endif; ?>

<?php
$leithbass_n = 0;
foreach ( $leithbass_groups as $leithbass_group ) :
	$leithbass_n++;
	?>
	<section class="section faq-group" id="<?php echo esc_attr( $leithbass_group['anchor'] ); ?>">
		<div class="wrap">
			<div class="grid-2 grid-2-wide">
				<div class="reveal">
					<span class="sub-label"><?php leithbass_text( $leithbass_group['sub'] ); ?></span>
					<h2><?php leithbass_text( $leithbass_group['title'] ); ?></h2>
				</div>
				<div class="prose faq-answers reveal">
					<?php leithbass_text( $leithbass_group['body'] ); ?>
				</div>
			</div>
		</div>
	</section>
	<?php if ( 2 === $leithbass_n && count( $leithbass_groups ) > 2 ) : ?>
		<?php leithbass_band( 'band-corridor', array( 1920, 1200, 600 ), 'The corridor at Lost Oscillation studio' ); ?>
	<?php endif; ?>
<?php endforeach; ?>

<section class="cta">
	<div class="wrap reveal">
		<h2><?php leithbass_text( 'faq_cta_heading' ); ?></h2>
		<?php leithbass_text( 'faq_cta_body' ); ?>
		<a class="btn" href="<?php echo esc_url( home_url( '/contact/' ) ); ?>"><?php leithbass_text( 'faq_cta_label' ); ?></a>
		<a class="btn-ghost" href="<?php echo esc_url( home_url( '/prices/' ) ); ?>"><?php leithbass_text( 'faq_prices_label' ); ?></a>
	</div>
</section>

<?php get_footer(); ?>
