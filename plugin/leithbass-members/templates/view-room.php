<?php
/**
 * A room of the members' app: Ear Training, Harmonic Elements or Read, full screen,
 * with the app's bottom bar. (includes/rooms.php says what the rooms are.)
 *
 * @package LeithBassMembers
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

$room  = $lbs_route;
$rooms = lbs_portal_rooms();
$r     = $rooms[ $room ];
?>
<?php if ( lbs_portal_is_preview() ) : ?>
	<div class="mp-preview"><div class="wrap">Previewing as <?php echo esc_html( get_userdata( $lbs_member )->display_name ); ?>. A room shows the trainer as they would see it; nothing is saved to their record from here.</div></div>
<?php endif; ?>
<div class="mp-offline" data-offline hidden><div class="wrap">You're offline. The house band plays without signal; what you answer is sent when you're back online.</div></div>

<main class="mp-room" id="main">
	<h1 class="screen-reader-text"><?php echo esc_html( $r['title'] ); ?></h1>
	<?php if ( $r['open'] ) : ?>
		<?php
		if ( 'ear-training' === $room ) { lbs_ear_trainer( 'full' ); }
		if ( 'elements' === $room ) { lbs_harmonic_trainer( 'full' ); }
		if ( 'read' === $room ) { lbs_read_trainer( 'full' ); }
		?>
	<?php else : ?>
		<div class="mp-room-soon">
			<p class="kicker">Coming soon</p>
			<p class="mp-room-title"><?php echo esc_html( strtok( $r['name'], ' ' ) ); ?> <em><?php echo esc_html( trim( substr( $r['name'], strlen( strtok( $r['name'], ' ' ) ) ) ) ); ?></em></p>
			<p><?php echo esc_html( $r['soon'] ); ?></p>
			<p>It will open here, in the app, as soon as it's ready.</p>
			<p><a class="mp-btn" href="<?php echo esc_url( lbs_portal_url() ); ?>">Back to the portal</a></p>
		</div>
	<?php endif; ?>
</main>

<?php lbs_portal_appbar( $room ); ?>
