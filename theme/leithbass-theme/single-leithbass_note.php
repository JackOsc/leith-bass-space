<?php
/**
 * Individual Notes article.
 *
 * @package LeithBass
 */
get_header();
while ( have_posts() ) : the_post();
?>

<article <?php post_class( 'note-article' ); ?>>
	<header class="note-article-head">
		<div class="wrap">
			<a class="note-back" href="<?php echo esc_url( get_post_type_archive_link( 'leithbass_note' ) ); ?>">Notes</a>
			<h1><?php the_title(); ?></h1>
			<p class="note-meta"><time datetime="<?php echo esc_attr( get_the_date( 'c' ) ); ?>"><?php echo esc_html( get_the_date( 'j F Y' ) ); ?></time></p>
		</div>
	</header>

	<?php if ( has_post_thumbnail() ) : ?>
		<figure class="note-featured">
			<?php the_post_thumbnail( 'full', array( 'loading' => 'eager', 'fetchpriority' => 'high' ) ); ?>
			<?php if ( wp_get_attachment_caption( get_post_thumbnail_id() ) ) : ?><figcaption><?php echo wp_kses_post( wp_get_attachment_caption( get_post_thumbnail_id() ) ); ?></figcaption><?php endif; ?>
		</figure>
	<?php endif; ?>

	<div class="note-body">
		<?php the_content(); ?>
	</div>

	<aside class="note-service" aria-labelledby="note-service-title">
		<div class="wrap">
			<p class="kicker"><?php leithbass_text( 'notes_service_kicker_v3' ); ?></p>
			<h2 id="note-service-title"><?php leithbass_text( 'notes_service_heading_v3' ); ?></h2>
			<p><?php leithbass_text( 'notes_service_body_v3' ); ?></p>
			<nav class="note-service-links" aria-label="Bass lesson information">
				<a href="<?php echo esc_url( home_url( '/approach/' ) ); ?>">How sessions work</a>
				<a href="<?php echo esc_url( home_url( '/prices/' ) ); ?>">Prices &amp; booking</a>
					<a href="<?php echo esc_url( home_url( '/contact/' ) ); ?>"><?php leithbass_text( 'notes_service_cta_label' ); ?></a>
			</nav>
		</div>
	</aside>

	<?php if ( has_category() || has_tag() ) : ?>
		<footer class="note-taxonomy wrap">
			<p><?php if ( has_category() ) : ?><strong>Filed under:</strong> <?php the_category( ', ' ); ?><?php endif; ?><?php if ( has_category() && has_tag() ) : ?> &middot; <?php endif; ?><?php if ( has_tag() ) : ?><strong>Tagged:</strong> <?php the_tags( '', ', ' ); ?><?php endif; ?></p>
		</footer>
	<?php endif; ?>
</article>

<nav class="note-post-nav" aria-label="More Notes">
	<div class="nav-links">
		<div><?php previous_post_link( '%link', '<span aria-hidden="true">&larr;</span> %title' ); ?></div>
		<div><?php next_post_link( '%link', '%title <span aria-hidden="true">&rarr;</span>' ); ?></div>
	</div>
</nav>

<?php endwhile; get_footer(); ?>
