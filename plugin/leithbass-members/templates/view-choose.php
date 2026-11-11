<?php
/**
 * An administrator visiting /members/ picks a member to preview.
 *
 * @package LeithBassMembers
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }
?>
<section class="mp-auth">
	<div class="wrap mp-auth-grid">
		<div class="mp-auth-copy">
			<p class="kicker">Member portal</p>
			<h1>Preview as a <span class="mp-knock">member</span></h1>
			<p>You're signed in as an administrator. Pick a member to see the portal exactly as they do. Nothing you click here changes their data.</p>
		</div>
		<div class="mp-card">
			<h3>Members</h3>
			<?php $lbs_members = lbs_members(); ?>
			<?php if ( $lbs_members ) : ?>
				<ul class="mp-list">
					<?php foreach ( $lbs_members as $lbs_m ) : ?>
						<li><a href="<?php echo esc_url( lbs_portal_url( 'home', array( 'as' => $lbs_m->ID ) ) ); ?>"><?php echo esc_html( $lbs_m->display_name ); ?></a></li>
					<?php endforeach; ?>
				</ul>
			<?php else : ?>
				<p>No members yet.</p>
			<?php endif; ?>
			<a class="mp-link" href="<?php echo esc_url( admin_url( 'admin.php?page=lbs-members' ) ); ?>">Manage members</a>
		</div>
	</div>
</section>
