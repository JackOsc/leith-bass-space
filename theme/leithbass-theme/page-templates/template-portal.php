<?php
/**
 * Template Name: The Portal
 *
 * Explains the member portal to people who haven't joined yet.
 *
 * @package LeithBass
 */
get_header();
leithbass_page_head( 'portal' );
$leithbass_signin = leithbass_portal_signin_url();
?>

<section class="section">
	<div class="wrap">
		<div class="prose prose-lead reveal">
			<?php leithbass_text( 'portal_opening' ); ?>
		</div>

		<div class="screens-wrap">
			<div class="screens" tabindex="0" role="group" aria-label="Screens from the member portal">
				<?php
				$leithbass_drawn = false;
				for ( $i = 1; $i <= 4; $i++ ) :
					?>
					<figure class="shot reveal">
						<?php $leithbass_drawn = leithbass_portal_screen( $i ) || $leithbass_drawn; ?>
						<figcaption><strong><?php leithbass_text( 'portal_shot' . $i . '_title' ); ?></strong><?php leithbass_text( 'portal_shot' . $i . '_caption' ); ?></figcaption>
					</figure>
				<?php endfor; ?>
			</div>
			<?php if ( $leithbass_drawn ) : ?>
				<p class="screens-note"><?php leithbass_text( 'portal_shots_note' ); ?></p>
			<?php endif; ?>
		</div>
	</div>
</section>

<section class="section">
	<div class="wrap">
		<div class="grid-2 grid-2-wide">
			<div class="reveal">
				<span class="sub-label"><?php leithbass_text( 'portal_notes_sub' ); ?></span>
				<h2><?php leithbass_text( 'portal_notes_title' ); ?></h2>
				<div class="prose"><?php leithbass_text( 'portal_notes_body' ); ?></div>
			</div>
			<figure class="session-note-figure reveal">
				<div class="session-note">
					<div class="session-note-meta">
						<span>Session notes</span>
						<span><?php leithbass_text( 'portal_note_date' ); ?></span>
					</div>
					<h3><?php leithbass_text( 'portal_note_title' ); ?></h3>
					<?php
					$leithbass_covered = array_filter( array_map( 'trim', explode( ',', wp_strip_all_tags( leithbass_val( 'portal_note_covered' ) ) ) ) );
					if ( $leithbass_covered ) :
						?>
						<ul class="covered" aria-label="Covered">
							<?php foreach ( $leithbass_covered as $leithbass_topic ) : ?>
								<li><?php echo esc_html( $leithbass_topic ); ?></li>
							<?php endforeach; ?>
						</ul>
					<?php endif; ?>
					<div class="session-note-body"><?php leithbass_text( 'portal_note_body' ); ?></div>
					<?php if ( trim( leithbass_val( 'portal_note_next' ) ) ) : ?>
						<p class="session-note-next"><strong>Next time:</strong> <?php leithbass_text( 'portal_note_next' ); ?></p>
					<?php endif; ?>
				</div>
				<figcaption><?php leithbass_text( 'portal_note_caption' ); ?></figcaption>
			</figure>
		</div>
	</div>
</section>

<?php leithbass_band( 'band-lesson', array( 1920, 1200, 600 ), 'A session in progress at Lost Oscillation studio' ); ?>

<section class="section">
	<div class="wrap">
		<div class="grid-2">
			<div class="reveal">
				<span class="sub-label"><?php leithbass_text( 'portal_practice_sub' ); ?></span>
				<h2><?php leithbass_text( 'portal_practice_title' ); ?></h2>
			</div>
			<div class="prose reveal">
				<?php leithbass_text( 'portal_practice_body' ); ?>
				<?php
				$leithbass_names = array_filter( wp_list_pluck( leithbass_points( 'shed_tools' ), 'label' ) );
				if ( $leithbass_names ) :
					?>
					<ul class="tool-names" aria-label="The tools">
						<?php foreach ( $leithbass_names as $leithbass_name ) : ?>
							<li><?php echo wp_kses_post( $leithbass_name ); ?></li>
						<?php endforeach; ?>
					</ul>
				<?php endif; ?>
				<?php if ( function_exists( 'leithbass_shed_url' ) && leithbass_shed_url() ) : ?>
					<p><a class="btn" href="<?php echo esc_url( leithbass_shed_url() ); ?>"><?php leithbass_text( 'portal_shed_label' ); ?></a></p>
				<?php endif; ?>
			</div>
		</div>
	</div>
</section>

<section class="section">
	<div class="wrap">
		<div class="grid-2">
			<div class="reveal">
				<span class="sub-label"><?php leithbass_text( 'portal_bookings_sub' ); ?></span>
				<h2><?php leithbass_text( 'portal_bookings_title' ); ?></h2>
			</div>
			<div class="prose reveal">
				<?php leithbass_text( 'portal_bookings_body' ); ?>
				<?php leithbass_text( 'portal_bookings_points' ); ?>
			</div>
		</div>
	</div>
</section>

<section class="section section-ruled">
	<div class="wrap">
		<div class="grid-2">
			<div class="reveal">
				<span class="sub-label"><?php leithbass_text( 'portal_access_sub' ); ?></span>
				<h2><?php leithbass_text( 'portal_access_title' ); ?></h2>
			</div>
			<div class="prose reveal">
				<?php leithbass_text( 'portal_access_body' ); ?>
			</div>
		</div>
	</div>
</section>

<section class="cta">
	<div class="wrap reveal">
		<h2><?php leithbass_text( 'portal_cta_heading' ); ?></h2>
		<?php leithbass_text( 'portal_cta_body' ); ?>
		<a class="btn" href="<?php echo esc_url( home_url( '/contact/' ) ); ?>"><?php leithbass_text( 'portal_cta_label' ); ?></a>
		<?php if ( $leithbass_signin ) : ?>
			<a class="btn-ghost" href="<?php echo esc_url( $leithbass_signin ); ?>"><?php leithbass_text( 'portal_signin_label' ); ?></a>
		<?php endif; ?>
	</div>
</section>

<?php get_footer(); ?>
