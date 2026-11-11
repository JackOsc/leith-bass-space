<?php
/**
 * Front page: editorial hero, studio proof, service routes and social proof.
 *
 * @package LeithBass
 */
get_header();
?>

<section class="hero">
	<div class="hero-copy">
		<div class="hero-copy-inner">
			<h1><?php leithbass_text( 'home_headline_v3' ); ?></h1>
			<p class="hero-lead"><?php leithbass_text( 'home_subheadline_v3' ); ?></p>
			<p class="hero-line"><?php leithbass_text( 'home_line_v3' ); ?></p>
			<div class="hero-actions">
				<a class="btn" href="<?php echo esc_url( home_url( '/contact/' ) ); ?>"><?php leithbass_text( 'home_hero_cta_label' ); ?></a>
				<a class="btn-ghost" href="<?php echo esc_url( home_url( '/approach/' ) ); ?>">See the approach <span aria-hidden="true">&rarr;</span></a>
			</div>
		</div>
	</div>
	<div class="split-seam hero-seam" aria-hidden="true"></div>
	<div class="hero-media" style="--hero-focal-y:<?php echo esc_attr( leithbass_image_setting( 'hero-home', 'focal', 50 ) ); ?>%">
		<?php leithbass_img( 'hero-home', array( 2048, 1280, 640 ), 'A one-to-one bass lesson in progress at The Leith Bass Space', '(max-width: 900px) 100vw, 60vw', true ); ?>
	</div>
</section>

<section class="home-proof" aria-labelledby="home-proof-title">
	<figure class="home-proof-media home-proof-studio">
		<?php leithbass_img( 'home-studio', array( 2048, 1280, 640 ), 'The Lost Oscillation control room, one of the teaching spaces used by The Leith Bass Space', '(max-width: 900px) 100vw, 60vw' ); ?>
	</figure>
	<div class="split-seam home-proof-seam" aria-hidden="true"></div>
	<div class="home-proof-copy">
		<div class="home-proof-copy-inner reveal">
			<p class="kicker"><?php leithbass_text( 'home_proof_kicker_v3' ); ?></p>
			<h2 class="home-proof-statement" id="home-proof-title"><?php leithbass_text( 'home_standfirst_v3' ); ?></h2>
		</div>
	</div>
</section>

<nav class="questions" aria-label="Explore lessons, teaching spaces and prices">
	<?php
	$cards = array(
		'approach' => array( 'label' => 'home_label_approach_v3', 'blurb' => 'home_blurb_approach' ),
		'spaces'   => array( 'label' => 'home_label_spaces_v3', 'blurb' => 'home_blurb_spaces' ),
		'prices'   => array( 'label' => 'home_label_prices_v3', 'blurb' => 'home_blurb_prices' ),
	);
	foreach ( leithbass_pages() as $slug => $p ) :
		if ( ! isset( $cards[ $slug ] ) ) { continue; }
		?>
		<a class="question reveal" href="<?php echo esc_url( home_url( '/' . $slug . '/' ) ); ?>">
			<span class="question-label"><?php leithbass_text( $cards[ $slug ]['label'] ); ?></span>
			<h2 class="question-title"><?php leithbass_knock( ucfirst( strtolower( $p['knock'] ) ), $p['img'], 'knock-block', '46', false ); ?></h2>
			<span class="question-blurb"><?php leithbass_text( $cards[ $slug ]['blurb'] ); ?></span>
		</a>
	<?php endforeach; ?>
</nav>

<section class="testimonials" aria-labelledby="testimonials-title">
	<div class="wrap">
		<header class="testimonials-head reveal">
			<p class="kicker"><?php leithbass_text( 'home_testimonials_kicker' ); ?></p>
			<h2 id="testimonials-title"><?php leithbass_text( 'home_testimonials_heading' ); ?></h2>
		</header>
		<div class="testimonial-grid">
			<figure class="testimonial reveal">
				<blockquote><?php leithbass_text( 'home_testimonial_sithu' ); ?></blockquote>
				<figcaption>&mdash; <cite><?php leithbass_text( 'home_testimonial_sithu_name' ); ?></cite></figcaption>
			</figure>
			<figure class="testimonial reveal">
				<blockquote><?php leithbass_text( 'home_testimonial_lorna' ); ?></blockquote>
				<figcaption>&mdash; <cite><?php leithbass_text( 'home_testimonial_lorna_name' ); ?></cite></figcaption>
			</figure>
		</div>
	</div>
</section>

<?php leithbass_band( 'band-lesson', array( 1920, 1200, 600 ), 'A bass session at Lost Oscillation studio' ); ?>

<section class="cta">
	<div class="wrap reveal">
		<p class="cta-lead"><?php leithbass_text( 'home_close_kicker' ); ?></p>
		<h2><?php leithbass_text( 'home_close_heading_v3' ); ?></h2>
		<?php leithbass_text( 'home_close_body' ); ?>
		<a class="btn" href="<?php echo esc_url( home_url( '/contact/' ) ); ?>"><?php leithbass_text( 'home_close_cta_label' ); ?></a>
	</div>
</section>

<?php get_footer(); ?>
