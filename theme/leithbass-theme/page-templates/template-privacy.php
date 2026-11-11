<?php
/**
 * Template Name: Privacy
 *
 * @package LeithBass
 */
get_header();
leithbass_page_head( 'privacy' );
?>

<section class="section">
	<div class="wrap">
		<div class="prose reveal">
			<?php
			$privacy_content = '';
			if ( have_posts() ) {
				the_post();
				$privacy_content = get_the_content();
			}
			if ( trim( wp_strip_all_tags( $privacy_content ) ) ) :
				echo apply_filters( 'the_content', $privacy_content );
			else :
			?>
			<p><strong>Last updated: <?php echo function_exists( 'lbs_shed_tool' ) ? '7 October 2026' : ( function_exists( 'lbs_privacy_text' ) ? '26 September 2026' : '1 September 2026' ); ?></strong></p>
			<p>Jack Elliot is responsible for the personal information handled through The Leith Bass Space website. You can contact me through the website contact form.</p>

			<h2>What I collect and why</h2>
			<p>If you send an enquiry, I receive your name, email address and message. I use that information to reply, discuss possible sessions, and administer any teaching relationship that follows. The lawful bases are taking steps at your request before a contract and my legitimate interest in running the business and responding to enquiries.</p>
			<p>The website host may also keep limited technical and security logs, such as an IP address and browser information, to operate and protect the site.</p>

			<h2>Sharing and retention</h2>
			<p>I share personal information only with service providers needed to host the site and deliver email, or where the law requires it. I keep enquiry information only for as long as it is reasonably needed for the conversation, any resulting sessions, record keeping and legal obligations.</p>

			<h2>Cookies</h2>
			<p>This public website does not currently use advertising or analytics cookies. WordPress may use essential cookies for site administration. If that changes, this notice will be updated.</p>

			<?php if ( function_exists( 'lbs_shed_tool' ) ) : // the free tools come with Leith Bass Members 1.8.0 ?>
			<h2>The free tools</h2>
			<p>The metronome, the drone and the tuner on this site work without an account, and so do Harmonic Elements and Ear Training once they are open. What you set, and your record in either trainer, are stored in your own browser on your own device. They are not sent to me. The tuner uses the microphone only while it is switched on, and so does Ear Training if you choose to answer by playing. Nothing they hear is recorded or sent anywhere.</p>
			<?php endif; ?>

			<?php
			// The member portal's own section, whenever the portal plugin is active.
			if ( function_exists( 'lbs_privacy_text' ) ) { echo wp_kses_post( lbs_privacy_text() ); }
			?>

			<h2>Your rights</h2>
			<p>Depending on the circumstances, you may ask for access to, correction of, deletion of, or restriction on the use of your personal information, or object to its use. Use the contact form to make a request. You can also complain to the UK Information Commissioner&rsquo;s Office at <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noopener">ico.org.uk</a>.</p>
			<?php endif; ?>
		</div>
	</div>
</section>

<?php get_footer(); ?>
