<?php
/**
 * Template Name: Contact
 *
 * @package LeithBass
 */
get_header();
leithbass_page_head( 'contact' );
?>

<section class="section">
	<div class="wrap">
		<div class="contact-grid">
			<div class="reveal">
				<h2><?php leithbass_text( 'contact_heading' ); ?></h2>
				<div class="prose"><?php leithbass_text( 'contact_body' ); ?></div>
				<?php leithbass_contact_form(); ?>
			</div>
			<div class="reveal">
				<h3><?php leithbass_text( 'contact_aside' ); ?></h3>
				<ul class="link-list">
					<li><a href="<?php echo esc_url( leithbass_val( 'instagram' ) ); ?>" rel="me noopener" target="_blank">Instagram</a></li>
					<li><a href="<?php echo esc_url( leithbass_val( 'jackaudio' ) ); ?>" rel="noopener" target="_blank">jackaud.io &mdash; recording &amp; production</a></li>
					<li><a href="<?php echo esc_url( leithbass_val( 'lostosc' ) ); ?>" rel="noopener" target="_blank">Lost Oscillation</a></li>
					<?php if ( leithbass_val( 'google_business_profile' ) ) : ?><li><a href="<?php echo esc_url( leithbass_val( 'google_business_profile' ) ); ?>" rel="me noopener" target="_blank">Google Business Profile</a></li><?php endif; ?>
				</ul>
				<p class="note">
					<?php echo esc_html( leithbass_studio_address() ); ?>
					<?php if ( leithbass_val( 'business_phone' ) ) : ?><br><a href="tel:<?php echo esc_attr( preg_replace( '/[^0-9+]/', '', leithbass_val( 'business_phone' ) ) ); ?>"><?php echo esc_html( leithbass_val( 'business_phone' ) ); ?></a><?php endif; ?>
				</p>
			</div>
		</div>
	</div>
</section>

<?php leithbass_band( 'band-basses', array( 1920, 1200, 600 ), 'A wall of bass guitars at Lost Oscillation studio' ); ?>

<?php get_footer(); ?>
