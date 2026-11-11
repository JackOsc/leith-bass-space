</main>

<footer class="site-footer">
	<div class="wrap">
		<div class="footer-grid<?php echo ( function_exists( 'leithbass_tool_pages' ) && leithbass_tool_pages() ) ? ' footer-grid-four' : ''; ?>">
			<div>
				<span class="footer-logo"><?php echo leithbass_inline_svg( 'logo-light.svg' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- trusted bundled SVG. ?></span>
				<p><?php leithbass_text( 'footer_line' ); ?></p>
				<div class="footer-social">
					<a href="<?php echo esc_url( leithbass_val( 'instagram' ) ); ?>" aria-label="Instagram" rel="me noopener" target="_blank">
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.8-.4 2.2a3.8 3.8 0 0 1-.9 1.4c-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.2-2.2-.4a3.8 3.8 0 0 1-1.4-.9 3.8 3.8 0 0 1-.9-1.4c-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2m0-2.2C8.7 0 8.3 0 7 .1 5.8.2 4.9.4 4.1.7c-.8.3-1.5.7-2.2 1.4A6 6 0 0 0 .7 4.1C.4 4.9.2 5.8.1 7 0 8.3 0 8.7 0 12s0 3.7.1 5c.1 1.2.3 2.1.6 2.9.3.8.7 1.5 1.4 2.2a6 6 0 0 0 2.2 1.4c.8.3 1.7.5 2.9.6 1.3.1 1.7.1 5 .1s3.7 0 5-.1c1.2-.1 2.1-.3 2.9-.6a6 6 0 0 0 2.2-1.4 6 6 0 0 0 1.4-2.2c.3-.8.5-1.7.6-2.9.1-1.3.1-1.7.1-5s0-3.7-.1-5c-.1-1.2-.3-2.1-.6-2.9a6 6 0 0 0-1.4-2.2A6 6 0 0 0 19.9.7c-.8-.3-1.7-.5-2.9-.6C15.7 0 15.3 0 12 0Zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4Zm0 10.2a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm7.8-10.4a1.4 1.4 0 1 1-2.9 0 1.4 1.4 0 0 1 2.9 0Z"/></svg>
					</a>
					<a href="<?php echo esc_url( home_url( '/contact/' ) ); ?>" aria-label="Contact">
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 4h20a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm10 8.6L3.5 6.2v11.6h17V6.2L12 12.6ZM4.7 6h14.6L12 10.9 4.7 6Z"/></svg>
					</a>
				</div>
			</div>
			<div>
				<h4>The site</h4>
				<ul>
					<?php foreach ( leithbass_nav_pages() as $slug => $p ) : ?>
						<li><a href="<?php echo esc_url( home_url( '/' . $slug . '/' ) ); ?>"><?php echo esc_html( $p['label'] ); ?></a></li>
						<?php foreach ( array_slice( leithbass_nav_children( $slug ), 1, null, true ) as $child_slug => $child ) : ?>
							<li><a href="<?php echo esc_url( home_url( '/' . $child_slug . '/' ) ); ?>"><?php echo esc_html( $child['label'] ); ?></a></li>
						<?php endforeach; ?>
					<?php endforeach; ?>
				</ul>
			</div>
			<?php $leithbass_free = function_exists( 'leithbass_tool_pages' ) ? array_filter( array_keys( leithbass_tool_pages() ), 'leithbass_page_url' ) : array(); ?>
			<?php if ( $leithbass_free ) : ?>
			<div>
				<h4>Free tools</h4>
				<ul>
					<?php $leithbass_all = leithbass_pages(); ?>
					<?php foreach ( $leithbass_free as $leithbass_slug ) : ?>
						<li><a href="<?php echo esc_url( leithbass_page_url( $leithbass_slug ) ); ?>"><?php echo esc_html( $leithbass_all[ $leithbass_slug ]['label'] ); ?></a></li>
					<?php endforeach; ?>
				</ul>
			</div>
			<?php endif; ?>
			<div>
				<h4>Elsewhere</h4>
				<ul>
					<li><a href="<?php echo esc_url( leithbass_val( 'lostosc' ) ); ?>" rel="noopener" target="_blank">Lost Oscillation</a>, <?php echo esc_html( leithbass_studio_address() ); ?></li>
					<li><a href="<?php echo esc_url( leithbass_val( 'jackaudio' ) ); ?>" rel="noopener" target="_blank">About Jack (jackaud.io)</a></li>
					<li><a href="<?php echo esc_url( leithbass_val( 'instagram' ) ); ?>" rel="me noopener" target="_blank">Instagram</a></li>
					<li><a href="<?php echo esc_url( leithbass_val( 'slowkarma' ) ); ?>" rel="noopener" target="_blank">Slow Karma</a></li>
				</ul>
			</div>
		</div>
		<div class="footer-bottom">
			<span>&copy; <?php echo esc_html( gmdate( 'Y' ) ); ?> The Leith Bass Space · Jack Elliot · <a href="<?php echo esc_url( home_url( '/privacy/' ) ); ?>">Privacy</a></span>
		</div>
	</div>
</footer>
<?php wp_footer(); ?>
</body>
</html>
