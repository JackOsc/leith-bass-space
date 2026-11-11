<?php
/**
 * The Shelf: an all-members library in Nextcloud, and the drum files the
 * metronome's grooves are built from.
 *
 * Inside the Library folder (default /LeithBass/Library):
 *
 *   Backing tracks/, Drones/, Harmonic Elements/, Transcriptions/ …
 *       Each top-level folder is a section on the Shelf. Its files, and the
 *       files one level of subfolders down, are listed for every member.
 *   Grooves/   drum loops for the metronome (not shown on the Shelf)
 *   Kit/       single drum hits for the metronome (not shown on the Shelf)
 *
 * Folders whose names start with "_" or "." are ignored, so work in progress
 * can sit in the Library without members seeing it.
 *
 * Files are streamed through the portal behind the login, exactly like
 * session files. A member can only fetch a file that's in the current
 * listing, so no other part of Nextcloud is reachable.
 *
 * @package LeithBassMembers
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'LBS_LIBRARY_CACHE', 'lbs_library_v1' );

/** The Library folder in Nextcloud. */
function lbs_library_root() {
	return '/' . lbs_clean_path( lbs_settings()['library_root'] );
}

/** Folder names with a special job (compared in lower case). */
function lbs_library_machine_folders() {
	return array( 'grooves' => 'grooves', 'kit' => 'kit' );
}

/** The default sections created by "Create the Library folders". */
function lbs_library_default_sections() {
	return array( 'Backing tracks', 'Drones', 'Transcriptions', 'Harmonic Elements', 'Grooves', 'Kit' );
}

function lbs_library_skip( $name ) {
	return '' === $name || '_' === $name[0] || '.' === $name[0];
}

/** "Blues_in_F - 90bpm.mp3" -> "Blues in F - 90bpm" */
function lbs_library_title( $file ) {
	$t = preg_replace( '/\.[a-z0-9]{2,4}$/i', '', $file );
	$t = str_replace( '_', ' ', $t );
	return trim( preg_replace( '/\s+/', ' ', $t ) );
}

/** A groove's title without the tempo, meter and bar count its name carries: "Pocket - 96bpm - 4-4 - 2 bars" → "Pocket". */
function lbs_groove_title( $file ) {
	$t = lbs_library_title( $file );
	$t = preg_replace( array( '/\b\d{2,3}(?:\.\d+)?\s*bpm\b/i', '/\b\d{1,2}[-\/](?:2|4|8|16)\b/', '/\b\d{1,2}\s*bars?\b/i' ), '', $t );
	$t = trim( preg_replace( array( '/(\s*-\s*)+/', '/\s+/' ), array( ' - ', ' ' ), $t ), " -\t" );
	return '' !== $t ? $t : lbs_library_title( $file );
}

/**
 * What a file name says about itself: tempo, key, meter and bars.
 * "Funk 16ths - 96bpm - 4-4 - 2 bars.wav", "Blues in Bb minor 90bpm.mp3".
 */
function lbs_library_parse( $name ) {
	$out = array( 'bpm' => 0, 'key' => '', 'meter' => '', 'bars' => 0 );
	if ( preg_match( '/(\d{2,3}(?:\.\d+)?)\s*bpm/i', $name, $m ) ) { $out['bpm'] = (float) $m[1]; }
	if ( preg_match( '/\b(?:in|key of)\s+([A-G])(#|b|\x{266F}|\x{266D})?(\s*(?:m|min|minor|maj|major)\b)?/iu', $name, $m ) ) {
		$acc  = isset( $m[2] ) ? str_replace( array( '#', 'b' ), array( "\u{266F}", "\u{266D}" ), $m[2] ) : '';
		$qual = isset( $m[3] ) ? strtolower( trim( $m[3] ) ) : '';
		$out['key'] = strtoupper( $m[1] ) . $acc . ( in_array( $qual, array( 'm', 'min', 'minor' ), true ) ? ' minor' : '' );
	}
	if ( preg_match( '/\b(\d{1,2})[-\/](2|4|8|16)\b/', $name, $m ) ) { $out['meter'] = $m[1] . '/' . $m[2]; }
	if ( preg_match( '/\b(\d{1,2})\s*bars?\b/i', $name, $m ) ) { $out['bars'] = (int) $m[1]; }
	return $out;
}

/** Recognised drum hit names for the Kit folder. */
function lbs_kit_instruments() {
	return array(
		'kick', 'snare', 'snare-ghost', 'cross-stick', 'rim', 'hat-closed', 'hat-open', 'hat-pedal',
		'ride', 'ride-bell', 'crash', 'tom-high', 'tom-mid', 'tom-floor', 'shaker', 'tambourine', 'clap', 'click',
	);
}

function lbs_kit_layers() {
	return array( 'soft', 'medium', 'hard' );
}

/**
 * Read (and cache for 15 minutes) everything in the Library.
 * Returns: ready, scanned, sections[], grooves[], kit{instrument:{layer:[paths]}}, problems[].
 */
function lbs_library_scan( $force = false ) {
	if ( ! $force ) {
		$cached = get_transient( LBS_LIBRARY_CACHE );
		if ( is_array( $cached ) ) { return $cached; }
	}
	$out = array( 'ready' => lbs_nc_ready(), 'scanned' => time(), 'root' => lbs_library_root(), 'sections' => array(), 'grooves' => array(), 'kit' => array(), 'problems' => array(), 'error' => '' );
	if ( ! $out['ready'] ) { return $out; }

	$top = lbs_nc_list( $out['root'] );
	if ( is_wp_error( $top ) ) {
		$out['error'] = $top->get_error_message();
		set_transient( LBS_LIBRARY_CACHE, $out, 2 * MINUTE_IN_SECONDS ); // try again soon
		return $out;
	}

	$machine = lbs_library_machine_folders();
	foreach ( $top as $item ) {
		if ( ! $item['dir'] || lbs_library_skip( $item['name'] ) ) { continue; }
		$lower = strtolower( $item['name'] );
		if ( 'grooves' === $lower ) { $out['grooves'] = lbs_library_scan_grooves( $item['name'], $out['problems'] ); continue; }
		if ( 'kit' === $lower ) { $out['kit'] = lbs_library_scan_kit( $item['name'], $out['problems'] ); continue; }
		if ( isset( $machine[ $lower ] ) ) { continue; }
		$section = lbs_library_scan_section( $item['name'] );
		if ( $section['items'] ) { $out['sections'][] = $section; }
	}
	set_transient( LBS_LIBRARY_CACHE, $out, 15 * MINUTE_IN_SECONDS );
	return $out;
}

/** One section: its files, then one level of subfolders as groups. */
function lbs_library_scan_section( $folder ) {
	$root    = lbs_library_root();
	$section = array( 'name' => $folder, 'items' => array() );
	$list    = lbs_nc_list( $root . '/' . $folder );
	if ( is_wp_error( $list ) ) { return $section; }
	$types = lbs_mime_types();
	$dirs  = 0;
	$add   = function ( $file, $group, $rel, $size, $mod ) use ( &$section, $types ) {
		$ext = strtolower( pathinfo( $file, PATHINFO_EXTENSION ) );
		if ( ! isset( $types[ $ext ] ) || count( $section['items'] ) >= 500 ) { return; }
		$section['items'][] = array_merge( array(
			'path'     => $rel,
			'title'    => lbs_library_title( $file ),
			'group'    => $group,
			'kind'     => lbs_file_kind( $file ),
			'size'     => (int) $size,
			'modified' => (int) $mod,
		), lbs_library_parse( $file ) );
	};
	foreach ( $list as $item ) {
		if ( lbs_library_skip( $item['name'] ) ) { continue; }
		if ( ! $item['dir'] ) {
			$add( $item['name'], '', $folder . '/' . $item['name'], $item['size'], $item['modified'] );
			continue;
		}
		if ( ++$dirs > 40 ) { continue; }
		$sub = lbs_nc_list( $root . '/' . $folder . '/' . $item['name'] );
		if ( is_wp_error( $sub ) ) { continue; }
		foreach ( $sub as $s ) {
			if ( ! $s['dir'] && ! lbs_library_skip( $s['name'] ) ) {
				$add( $s['name'], $item['name'], $folder . '/' . $item['name'] . '/' . $s['name'], $s['size'], $s['modified'] );
			}
		}
	}
	return $section;
}

/**
 * Grooves: audio loops, one level of subfolders allowed (the subfolder is the
 * style). Tempo, meter and bar count come from the file name, or from an
 * optional grooves.json in the Grooves folder, which wins where both exist:
 *
 *   [{"file": "Funk/Pocket 1.wav", "bpm": 96, "meter": "4/4", "bars": 2,
 *     "style": "Funk", "feel": "16ths", "swing": 0, "count_in": 0}]
 */
function lbs_library_scan_grooves( $folder, &$problems ) {
	$root   = lbs_library_root() . '/' . $folder;
	$audio  = array( 'wav', 'aif', 'aiff', 'flac', 'mp3', 'm4a', 'ogg' );
	$found  = array();
	$walk   = function ( $path, $style ) use ( &$walk, &$found, $root, $audio, $folder ) {
		$list = lbs_nc_list( $root . ( $path ? '/' . $path : '' ) );
		if ( is_wp_error( $list ) ) { return; }
		foreach ( $list as $item ) {
			if ( lbs_library_skip( $item['name'] ) ) { continue; }
			$rel = ( $path ? $path . '/' : '' ) . $item['name'];
			if ( $item['dir'] ) {
				if ( '' === $path ) { $walk( $rel, $item['name'] ); }
				continue;
			}
			if ( in_array( strtolower( pathinfo( $item['name'], PATHINFO_EXTENSION ) ), $audio, true ) ) {
				$found[ $rel ] = array_merge( array( 'path' => $folder . '/' . $rel, 'file' => $rel, 'title' => lbs_groove_title( $item['name'] ), 'style' => $style, 'feel' => '', 'swing' => 0, 'count_in' => 0, 'size' => (int) $item['size'] ), lbs_library_parse( $item['name'] ) );
			}
		}
	};
	$walk( '', '' );

	// Optional manifest.
	$res = lbs_nc_request( 'GET', $root . '/grooves.json' );
	if ( ! is_wp_error( $res ) && 200 === (int) wp_remote_retrieve_response_code( $res ) ) {
		$manifest = json_decode( wp_remote_retrieve_body( $res ), true );
		if ( ! is_array( $manifest ) ) {
			$problems[] = 'Grooves: grooves.json couldn\'t be read. Check it\'s valid JSON (a list of entries).';
		} else {
			foreach ( $manifest as $i => $entry ) {
				$file = isset( $entry['file'] ) ? lbs_clean_path( $entry['file'] ) : '';
				if ( ! $file || ! isset( $found[ $file ] ) ) {
					$problems[] = sprintf( 'Grooves: grooves.json entry %d names a file that isn\'t there (%s).', $i + 1, $file ? $file : 'no file given' );
					continue;
				}
				foreach ( array( 'bpm' => 'floatval', 'bars' => 'intval', 'swing' => 'intval', 'count_in' => 'intval' ) as $k => $fn ) {
					if ( isset( $entry[ $k ] ) ) { $found[ $file ][ $k ] = $fn( $entry[ $k ] ); }
				}
				foreach ( array( 'meter', 'style', 'feel', 'title' ) as $k ) {
					if ( isset( $entry[ $k ] ) ) { $found[ $file ][ $k ] = sanitize_text_field( $entry[ $k ] ); }
				}
			}
		}
	}

	$grooves = array();
	foreach ( $found as $g ) {
		if ( ! $g['meter'] ) { $g['meter'] = '4/4'; }
		if ( ! $g['bpm'] ) { $problems[] = 'Grooves: "' . $g['file'] . '" has no tempo. Add it to the name (e.g. "96bpm") or to grooves.json.'; continue; }
		if ( ! $g['bars'] ) { $problems[] = 'Grooves: "' . $g['file'] . '" has no bar count. Add it to the name (e.g. "2 bars") or to grooves.json.'; continue; }
		$grooves[] = $g;
	}
	usort( $grooves, function ( $a, $b ) { return strnatcasecmp( $a['style'] . ' ' . $a['title'], $b['style'] . ' ' . $b['title'] ); } );
	return $grooves;
}

/**
 * Kit: single hits named instrument_layer_number.wav, e.g. kick_soft_1.wav,
 * hat-closed_hard_3.wav. Several numbers per layer are played in turn so
 * repeated hits don't sound like a machine.
 */
function lbs_library_scan_kit( $folder, &$problems ) {
	$list = lbs_nc_list( lbs_library_root() . '/' . $folder );
	if ( is_wp_error( $list ) ) { return array(); }
	$known  = lbs_kit_instruments();
	$layers = lbs_kit_layers();
	$kit    = array();
	foreach ( $list as $item ) {
		if ( $item['dir'] || lbs_library_skip( $item['name'] ) ) { continue; }
		$base = strtolower( preg_replace( '/\.[a-z0-9]{2,4}$/i', '', $item['name'] ) );
		if ( ! preg_match( '/^([a-z-]+)_(soft|medium|hard)_(\d+)$/', $base, $m ) ) {
			$problems[] = 'Kit: "' . $item['name'] . '" doesn\'t follow instrument_layer_number (e.g. snare_hard_2.wav).';
			continue;
		}
		if ( ! in_array( $m[1], $known, true ) ) {
			$problems[] = 'Kit: "' . $item['name'] . '" uses an instrument name the metronome doesn\'t know (' . $m[1] . ').';
			continue;
		}
		$kit[ $m[1] ][ $m[2] ][] = $folder . '/' . $item['name'];
	}
	foreach ( $kit as $inst => $by ) {
		foreach ( $layers as $layer ) {
			if ( empty( $by[ $layer ] ) ) { $problems[] = 'Kit: ' . $inst . ' has no ' . $layer . ' hits yet. The nearest layer will stand in.'; }
		}
		foreach ( $by as $layer => $paths ) { natcasesort( $paths ); $kit[ $inst ][ $layer ] = array_values( $paths ); }
	}
	ksort( $kit );
	return $kit;
}

/** Every path a member may fetch from the Library. */
function lbs_library_allowed( $scan ) {
	$ok = array();
	foreach ( $scan['sections'] as $s ) { foreach ( $s['items'] as $i ) { $ok[ $i['path'] ] = true; } }
	foreach ( $scan['grooves'] as $g ) { $ok[ $g['path'] ] = true; }
	foreach ( $scan['kit'] as $by ) { foreach ( $by as $paths ) { foreach ( $paths as $p ) { $ok[ $p ] = true; } } }
	return $ok;
}

function lbs_library_token( $path ) {
	return rtrim( strtr( base64_encode( $path ), '+/', '-_' ), '=' );
}

function lbs_library_untoken( $token ) {
	$raw = base64_decode( strtr( (string) $token, '-_', '+/' ), true );
	return false === $raw ? '' : lbs_clean_path( $raw );
}

function lbs_library_url( $path, $download = false ) {
	$args = array( 'lib' => lbs_library_token( $path ) );
	if ( $download ) { $args['dl'] = 1; }
	return lbs_portal_url( 'file', $args );
}

/** Resolve ?lib= for lbs_serve_file(): the Nextcloud path and a file name, or WP_Error. */
function lbs_library_resolve( $token ) {
	$path = lbs_library_untoken( $token );
	if ( '' === $path ) { return new WP_Error( 'lbs_lib', 'That link isn\'t valid.' ); }
	$scan = lbs_library_scan();
	if ( ! isset( lbs_library_allowed( $scan )[ $path ] ) ) {
		// Maybe it's new since the last look: check once more, fresh.
		$scan = lbs_library_scan( true );
		if ( ! isset( lbs_library_allowed( $scan )[ $path ] ) ) { return new WP_Error( 'lbs_lib', 'That file isn\'t on the Shelf any more.' ); }
	}
	return array( 'path' => lbs_library_root() . '/' . $path, 'name' => basename( $path ) );
}

/** The Shelf as a member sees it (with links). */
function lbs_library_for_member() {
	$scan = lbs_library_scan();
	$sections = array();
	foreach ( $scan['sections'] as $s ) {
		$items = array();
		foreach ( $s['items'] as $i ) {
			$items[] = array(
				'title' => $i['title'],
				'group' => $i['group'],
				'kind'  => $i['kind'],
				'size'  => $i['size'],
				'bpm'   => $i['bpm'],
				'key'   => $i['key'],
				'new'   => $i['modified'] && $i['modified'] > time() - 14 * DAY_IN_SECONDS,
				'url'   => lbs_library_url( $i['path'] ),
				'dl'    => lbs_library_url( $i['path'], true ),
			);
		}
		$sections[] = array( 'name' => $s['name'], 'items' => $items );
	}
	$grooves = array();
	foreach ( $scan['grooves'] as $g ) {
		$grooves[] = array( 'title' => $g['title'], 'style' => $g['style'], 'feel' => $g['feel'], 'bpm' => $g['bpm'], 'meter' => $g['meter'], 'bars' => $g['bars'], 'swing' => $g['swing'], 'count_in' => $g['count_in'], 'url' => lbs_library_url( $g['path'] ) );
	}
	$kit = array();
	foreach ( $scan['kit'] as $inst => $by ) {
		foreach ( $by as $layer => $paths ) { $kit[ $inst ][ $layer ] = array_map( 'lbs_library_url', $paths ); }
	}
	return array( 'ok' => true, 'ready' => $scan['ready'] && ! $scan['error'], 'sections' => $sections, 'grooves' => $grooves, 'kit' => $kit );
}

add_action( 'rest_api_init', function () {
	register_rest_route( 'lbs/v1', '/library', array(
		'methods'             => 'GET',
		'callback'            => function () { return new WP_REST_Response( lbs_library_for_member() ); },
		'permission_callback' => function () { return current_user_can( 'manage_options' ) || lbs_can_access( get_current_user_id() ); },
	) );
} );

/* -------------------------------------------------------------------------
 * Admin: the Shelf box on Portal settings
 * ---------------------------------------------------------------------- */

function lbs_library_admin_box() {
	$scan = lbs_library_scan();
	?>
	<h2 id="shelf">The Shelf (all members)</h2>
	<p>Everything in <code><?php echo esc_html( lbs_library_root() ); ?></code> is available to every member on the Shelf in the Shed. Each top-level folder is a section. <strong>Grooves</strong> and <strong>Kit</strong> hold drum loops and single hits for the metronome and aren't listed on the Shelf. Start a folder name with an underscore to keep it hidden while you work on it.</p>
	<?php if ( ! $scan['ready'] ) : ?>
		<p><em>Connect Nextcloud above first.</em></p>
	<?php elseif ( $scan['error'] ) : ?>
		<div class="notice notice-error inline"><p><?php echo esc_html( $scan['error'] ); ?></p></div>
	<?php else : ?>
		<table class="widefat striped" style="max-width:48rem">
			<thead><tr><th>Section</th><th>Files</th></tr></thead>
			<tbody>
				<?php if ( ! $scan['sections'] ) : ?><tr><td colspan="2">Nothing on the Shelf yet.</td></tr><?php endif; ?>
				<?php foreach ( $scan['sections'] as $s ) : ?><tr><td><?php echo esc_html( $s['name'] ); ?></td><td><?php echo (int) count( $s['items'] ); ?></td></tr><?php endforeach; ?>
				<tr><td><strong>Grooves</strong> (metronome)</td><td><?php echo (int) count( $scan['grooves'] ); ?> ready</td></tr>
				<tr><td><strong>Kit</strong> (metronome)</td><td><?php echo $scan['kit'] ? esc_html( implode( ', ', array_keys( $scan['kit'] ) ) ) : 'No hits yet'; ?></td></tr>
			</tbody>
		</table>
		<?php if ( $scan['problems'] ) : ?>
			<h3>Worth fixing</h3>
			<ul style="list-style:disc;padding-left:1.5em;max-width:48rem"><?php foreach ( array_slice( $scan['problems'], 0, 40 ) as $p ) : ?><li><?php echo esc_html( $p ); ?></li><?php endforeach; ?></ul>
		<?php endif; ?>
		<p class="description">Last checked <?php echo esc_html( human_time_diff( $scan['scanned'] ) ); ?> ago. The Shelf refreshes itself every 15 minutes.</p>
	<?php endif; ?>
	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="lbs-inline-form">
		<input type="hidden" name="action" value="lbs_library">
		<?php wp_nonce_field( 'lbs_library' ); ?>
		<button type="submit" class="button" name="do" value="refresh">Refresh the Shelf now</button>
		<button type="submit" class="button" name="do" value="create">Create the Library folders</button>
	</form>
	<?php
}

add_action( 'admin_post_lbs_library', function () {
	lbs_admin_guard( 'lbs_library' );
	$do  = isset( $_POST['do'] ) ? sanitize_key( wp_unslash( $_POST['do'] ) ) : 'refresh';
	$msg = 'The Shelf has been refreshed.';
	if ( 'create' === $do ) {
		if ( ! lbs_nc_ready() ) {
			$msg = 'Connect Nextcloud first.';
		} else {
			foreach ( lbs_library_default_sections() as $name ) { lbs_nc_mkdirs( lbs_library_root() . '/' . $name ); }
			$msg = 'Created ' . implode( ', ', lbs_library_default_sections() ) . ' in ' . lbs_library_root() . ' (any that already existed were left as they were).';
		}
	}
	delete_transient( LBS_LIBRARY_CACHE );
	lbs_library_scan( true );
	wp_safe_redirect( add_query_arg( array( 'lbs_msg' => rawurlencode( $msg ), 'lbs_ok' => 1 ), admin_url( 'admin.php?page=lbs-portal-settings#shelf' ) ) );
	exit;
} );
