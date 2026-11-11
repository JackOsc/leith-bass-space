<?php
/**
 * Public Notes archive. Visibility is controlled in Appearance -> Leith Bass Content -> Notes.
 *
 * @package LeithBass
 */
get_header();
?>

<header class="pagehead pagehead-notes">
	<div class="wrap">
		<?php leithbass_knock( 'NOTES', 'knock-notes', 'knock-notes', '36', true, true ); ?>
		<h1><?php leithbass_text( 'notes_archive_h1' ); ?></h1>
		<div class="subtitle"><?php leithbass_text( 'notes_archive_intro' ); ?></div>
	</div>
</header>

<section class="section notes-index">
	<div class="wrap">
		<?php if ( have_posts() ) : ?>
			<div class="notes-grid">
				<?php while ( have_posts() ) : the_post(); ?>
					<article <?php post_class( 'note-card' ); ?>>
						<?php if ( has_post_thumbnail() ) : ?>
							<a class="note-card-image" href="<?php the_permalink(); ?>" tabindex="-1" aria-hidden="true"><?php the_post_thumbnail( 'large', array( 'loading' => 'lazy', 'alt' => '' ) ); ?></a>
						<?php endif; ?>
						<p class="note-meta"><time datetime="<?php echo esc_attr( get_the_date( 'c' ) ); ?>"><?php echo esc_html( get_the_date( 'j F Y' ) ); ?></time></p>
						<h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
						<div class="note-card-excerpt"><?php echo wpautop( esc_html( has_excerpt() ? get_the_excerpt() : wp_trim_words( wp_strip_all_tags( strip_shortcodes( get_the_content() ) ), 32 ) ) ); ?></div>
						<p><a class="note-card-link" href="<?php the_permalink(); ?>">Read article <span aria-hidden="true">&rarr;</span></a></p>
					</article>
				<?php endwhile; ?>
			</div>
			<div class="notes-pagination"><?php the_posts_pagination( array( 'mid_size' => 1, 'prev_text' => '&larr; Newer', 'next_text' => 'Older &rarr;' ) ); ?></div>
		<?php else : ?>
			<div class="prose"><p>No articles have been published yet.</p></div>
		<?php endif; ?>
	</div>
</section>

<?php get_footer(); ?>
