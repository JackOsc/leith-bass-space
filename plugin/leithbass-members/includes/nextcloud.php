<?php
/**
 * A small Nextcloud WebDAV client. Files stay in Nextcloud; WordPress fetches
 * them behind the member login, so nothing needs a public share link.
 *
 * Credentials: set them in Members → Portal settings (the app password is
 * stored encrypted), or define these in wp-config.php to keep them out of the
 * database entirely:
 *   define( 'LBS_NEXTCLOUD_URL', 'https://cloud.example.com' );
 *   define( 'LBS_NEXTCLOUD_USER', 'jack' );
 *   define( 'LBS_NEXTCLOUD_PASSWORD', 'xxxxx-xxxxx-xxxxx-xxxxx-xxxxx' );
 *
 * @package LeithBassMembers
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

/* -------------------------------------------------------------------------
 * Credentials
 * ---------------------------------------------------------------------- */

function lbs_nc_key() {
	return sodium_crypto_generichash( wp_salt( 'secure_auth' ) . '|lbs-nextcloud', '', SODIUM_CRYPTO_SECRETBOX_KEYBYTES );
}

/** Can we store the app password encrypted? (WordPress ships a Sodium fallback, so normally yes.) */
function lbs_nc_can_encrypt() {
	return function_exists( 'sodium_crypto_secretbox' ) && function_exists( 'sodium_crypto_generichash' );
}

/** Encrypt the app password. Returns '' when encryption isn't available: it is never stored in the clear. */
function lbs_nc_encrypt( $plain ) {
	if ( '' === (string) $plain || ! lbs_nc_can_encrypt() ) { return ''; }
	$nonce = random_bytes( SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
	return 'sb:' . base64_encode( $nonce . sodium_crypto_secretbox( $plain, $nonce, lbs_nc_key() ) );
}

function lbs_nc_decrypt( $stored ) {
	$stored = (string) $stored;
	if ( 0 === strpos( $stored, 'sb:' ) && function_exists( 'sodium_crypto_secretbox_open' ) ) {
		$raw = base64_decode( substr( $stored, 3 ), true );
		if ( false === $raw || strlen( $raw ) <= SODIUM_CRYPTO_SECRETBOX_NONCEBYTES ) { return ''; }
		$plain = sodium_crypto_secretbox_open( substr( $raw, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES ), substr( $raw, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES ), lbs_nc_key() );
		return false === $plain ? '' : $plain;
	}
	return ''; // Anything else (including the old unencrypted fallback) is refused.
}

function lbs_nc_config() {
	$s = lbs_settings();
	return array(
		'url'  => untrailingslashit( defined( 'LBS_NEXTCLOUD_URL' ) ? LBS_NEXTCLOUD_URL : $s['nc_url'] ),
		'user' => defined( 'LBS_NEXTCLOUD_USER' ) ? LBS_NEXTCLOUD_USER : $s['nc_user'],
		'pass' => defined( 'LBS_NEXTCLOUD_PASSWORD' ) ? LBS_NEXTCLOUD_PASSWORD : lbs_nc_decrypt( $s['nc_pass'] ),
	);
}

function lbs_nc_ready() {
	$c = lbs_nc_config();
	return $c['url'] && $c['user'] && $c['pass'];
}

/* -------------------------------------------------------------------------
 * Requests
 * ---------------------------------------------------------------------- */

/**
 * The folders and file name in a path. Normally each is tidied (lbs_clean_path).
 * $exact keeps them just as Nextcloud listed them, because a name there can
 * begin or end with a space; it still drops anything that would climb out.
 */
function lbs_nc_segments( $path, $exact = false ) {
	if ( ! $exact ) { return array_filter( explode( '/', lbs_clean_path( $path ) ), 'strlen' ); }
	$segs = array();
	foreach ( explode( '/', (string) $path ) as $seg ) {
		if ( '' === $seg || '.' === $seg || '..' === $seg || false !== strpos( $seg, "\0" ) ) { continue; }
		$segs[] = $seg;
	}
	return $segs;
}

/** WebDAV URL for a path in Jack's Nextcloud files. */
function lbs_nc_href( $path, $exact = false ) {
	$c    = lbs_nc_config();
	$segs = array_map( 'rawurlencode', lbs_nc_segments( $path, $exact ) );
	return $c['url'] . '/remote.php/dav/files/' . rawurlencode( $c['user'] ) . '/' . implode( '/', $segs );
}

/** $args takes wp_remote_request()'s options, plus 'exact' => true for a path used just as listed. */
function lbs_nc_request( $method, $path, $args = array() ) {
	if ( ! lbs_nc_ready() ) {
		return new WP_Error( 'lbs_nc_setup', 'Nextcloud isn\'t connected yet. Add its details in Members → Portal settings.' );
	}
	$c       = lbs_nc_config();
	$exact   = ! empty( $args['exact'] );
	unset( $args['exact'] );
	$headers = isset( $args['headers'] ) ? $args['headers'] : array();
	$args    = array_merge( array( 'method' => $method, 'timeout' => 30, 'redirection' => 0 ), $args );
	$args['headers'] = array_merge( array( 'Authorization' => 'Basic ' . base64_encode( $c['user'] . ':' . $c['pass'] ) ), $headers );
	return wp_remote_request( lbs_nc_href( $path, $exact ), $args );
}

/**
 * List a folder (one level). Returns an array of items, [] when the folder
 * doesn't exist yet, or WP_Error.
 */
function lbs_nc_list( $path ) {
	$body = '<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:"><d:prop><d:getcontentlength/><d:getlastmodified/><d:getcontenttype/><d:resourcetype/></d:prop></d:propfind>';
	$res  = lbs_nc_request( 'PROPFIND', $path, array( 'headers' => array( 'Depth' => '1', 'Content-Type' => 'application/xml; charset=utf-8' ), 'body' => $body ) );
	if ( is_wp_error( $res ) ) { return $res; }
	$code = (int) wp_remote_retrieve_response_code( $res );
	if ( 404 === $code ) { return array(); }
	if ( 401 === $code ) { return new WP_Error( 'lbs_nc_auth', 'Nextcloud refused the username or app password.' ); }
	if ( 207 !== $code ) { return new WP_Error( 'lbs_nc_http', sprintf( 'Nextcloud answered with an unexpected status (%d). Check the server address.', $code ) ); }

	$prev = libxml_use_internal_errors( true );
	$xml  = simplexml_load_string( wp_remote_retrieve_body( $res ) );
	libxml_use_internal_errors( $prev );
	if ( false === $xml ) { return new WP_Error( 'lbs_nc_xml', 'Nextcloud sent a folder listing that couldn\'t be read.' ); }

	$self  = rtrim( rawurldecode( (string) wp_parse_url( lbs_nc_href( $path ), PHP_URL_PATH ) ), '/' );
	$items = array();
	$xml->registerXPathNamespace( 'd', 'DAV:' );
	foreach ( $xml->xpath( '//d:response' ) as $resp ) {
		$resp->registerXPathNamespace( 'd', 'DAV:' );
		$href = $resp->xpath( 'd:href' );
		if ( ! $href ) { continue; }
		$href = rtrim( rawurldecode( (string) $href[0] ), '/' );
		if ( $href === $self || '' === $href ) { continue; }
		$len  = $resp->xpath( './/d:getcontentlength' );
		$mod  = $resp->xpath( './/d:getlastmodified' );
		$type = $resp->xpath( './/d:getcontenttype' );
		$items[] = array(
			'name'     => basename( $href ),
			'dir'      => (bool) $resp->xpath( './/d:resourcetype/d:collection' ),
			'size'     => $len ? (int) $len[0] : 0,
			'modified' => $mod ? strtotime( (string) $mod[0] ) : 0,
			'type'     => $type ? (string) $type[0] : '',
		);
	}
	usort( $items, function ( $a, $b ) {
		if ( $a['dir'] !== $b['dir'] ) { return $a['dir'] ? 1 : -1; }
		return strnatcasecmp( $a['name'], $b['name'] );
	} );
	return $items;
}

/**
 * Files in a member's folder, including one level of subfolders
 * (Recordings excluded), as paths relative to the member folder.
 */
function lbs_nc_member_files( $user_id ) {
	$base  = lbs_member_path( $user_id );
	$items = lbs_nc_list( $base );
	if ( is_wp_error( $items ) ) { return $items; }
	$files = array();
	$dirs  = 0;
	foreach ( $items as $item ) {
		if ( ! $item['dir'] ) {
			$files[] = array( 'path' => $item['name'], 'size' => $item['size'], 'modified' => $item['modified'] );
			continue;
		}
		if ( 'recordings' === strtolower( $item['name'] ) || ++$dirs > 12 ) { continue; }
		$sub = lbs_nc_list( $base . '/' . $item['name'] );
		if ( is_wp_error( $sub ) ) { continue; }
		foreach ( $sub as $s ) {
			if ( ! $s['dir'] ) {
				$files[] = array( 'path' => $item['name'] . '/' . $s['name'], 'size' => $s['size'], 'modified' => $s['modified'] );
			}
		}
	}
	return $files;
}

/**
 * One PROPFIND, read as paths relative to the folder asked about. Unlike
 * lbs_nc_list() the names are kept exactly as Nextcloud has them, and $depth
 * can be 'infinity' for everything beneath the folder in a single request.
 * Returns items {rel, dir, size, modified}, [] for a missing folder, or WP_Error.
 */
function lbs_nc_propfind( $path, $depth = '1' ) {
	$body = '<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:"><d:prop><d:getcontentlength/><d:getlastmodified/><d:resourcetype/></d:prop></d:propfind>';
	$res  = lbs_nc_request( 'PROPFIND', $path, array( 'exact' => true, 'timeout' => 'infinity' === $depth ? 90 : 30, 'headers' => array( 'Depth' => $depth, 'Content-Type' => 'application/xml; charset=utf-8' ), 'body' => $body ) );
	if ( is_wp_error( $res ) ) { return $res; }
	$code = (int) wp_remote_retrieve_response_code( $res );
	if ( 404 === $code ) { return array(); }
	if ( 401 === $code ) { return new WP_Error( 'lbs_nc_auth', 'Nextcloud refused the username or app password.' ); }
	if ( 207 !== $code ) { return new WP_Error( 'lbs_nc_http', sprintf( 'Nextcloud answered with an unexpected status (%d).', $code ) ); }

	$prev = libxml_use_internal_errors( true );
	$xml  = simplexml_load_string( wp_remote_retrieve_body( $res ), 'SimpleXMLElement', LIBXML_NONET );
	libxml_use_internal_errors( $prev );
	if ( false === $xml ) { return new WP_Error( 'lbs_nc_xml', 'Nextcloud sent a folder listing that couldn\'t be read.' ); }

	$found = array();
	$self  = null;
	$xml->registerXPathNamespace( 'd', 'DAV:' );
	foreach ( $xml->xpath( '//d:response' ) as $resp ) {
		$resp->registerXPathNamespace( 'd', 'DAV:' );
		$href = $resp->xpath( 'd:href' );
		if ( ! $href ) { continue; }
		$href = rtrim( rawurldecode( (string) wp_parse_url( (string) $href[0], PHP_URL_PATH ) ), '/' );
		if ( '' === $href ) { continue; }
		// The folder itself is always in the answer, and nothing in it has a shorter address.
		if ( null === $self || strlen( $href ) < strlen( $self ) ) { $self = $href; }
		$len = $resp->xpath( './/d:getcontentlength' );
		$mod = $resp->xpath( './/d:getlastmodified' );
		$found[] = array(
			'href'     => $href,
			'dir'      => (bool) $resp->xpath( './/d:resourcetype/d:collection' ),
			'size'     => $len ? (int) $len[0] : 0,
			'modified' => $mod ? (int) strtotime( (string) $mod[0] ) : 0,
		);
	}
	$items = array();
	foreach ( $found as $f ) {
		if ( $f['href'] === $self || 0 !== strpos( $f['href'], $self . '/' ) ) { continue; }
		$f['rel'] = substr( $f['href'], strlen( $self ) + 1 );
		unset( $f['href'] );
		$items[] = $f;
	}
	return $items;
}

/**
 * Every file beneath a folder, however deep: [{path, size, modified}], with
 * paths relative to the folder. It asks for the whole tree at once; where
 * Nextcloud only answers one level at a time, it walks the folders instead.
 * $skip( $name ) says which folders and files to leave out. Returns
 * {files, requests, complete} or WP_Error.
 */
function lbs_nc_tree( $root, $skip = null, $max_requests = 800, $seconds = 110 ) {
	$started = microtime( true );
	$items   = lbs_nc_propfind( $root, 'infinity' );
	if ( is_wp_error( $items ) && ! in_array( $items->get_error_code(), array( 'lbs_nc_setup', 'lbs_nc_auth' ), true ) ) {
		$items = lbs_nc_propfind( $root, '1' ); // a server that won't list a whole tree, or took too long over it
	}
	if ( is_wp_error( $items ) ) { return $items; }

	$requests = 1;
	$files    = array();
	$dirs     = array(); // path => has its contents been listed?
	$hidden   = function ( $rel ) use ( $skip ) {
		if ( ! $skip ) { return false; }
		foreach ( explode( '/', $rel ) as $seg ) { if ( $skip( $seg ) ) { return true; } }
		return false;
	};
	$take = function ( $list, $prefix ) use ( &$files, &$dirs, $hidden ) {
		foreach ( $list as $i ) {
			$rel = $prefix . $i['rel'];
			if ( $hidden( $rel ) ) { continue; }
			// Anything inside a folder shows that folder has been listed.
			$up = $rel;
			while ( false !== ( $cut = strrpos( $up, '/' ) ) ) { $up = substr( $up, 0, $cut ); $dirs[ $up ] = true; }
			if ( $i['dir'] ) {
				if ( ! isset( $dirs[ $rel ] ) ) { $dirs[ $rel ] = false; }
			} else {
				$files[ $rel ] = array( 'path' => $rel, 'size' => $i['size'], 'modified' => $i['modified'] );
			}
		}
	};
	$take( $items, '' );

	// Folders with nothing listed inside: empty, or the server stopped at one level.
	$complete = true;
	while ( true ) {
		$todo = array_keys( array_filter( $dirs, function ( $listed ) { return ! $listed; } ) );
		if ( ! $todo ) { break; }
		foreach ( $todo as $dir ) {
			if ( $requests >= $max_requests || microtime( true ) - $started > $seconds ) { $complete = false; break 2; }
			$dirs[ $dir ] = true;
			$sub = lbs_nc_propfind( rtrim( $root, '/' ) . '/' . $dir, '1' );
			$requests++;
			if ( is_wp_error( $sub ) ) { $complete = false; continue; }
			$take( $sub, $dir . '/' );
		}
	}
	ksort( $files, SORT_NATURAL | SORT_FLAG_CASE );
	return array( 'files' => array_values( $files ), 'requests' => $requests, 'complete' => $complete );
}

/** Path to WordPress's bundled certificate authorities, for direct cURL calls. */
function lbs_nc_curl_base( $path, $exact = false ) {
	$c  = lbs_nc_config();
	$ch = curl_init( lbs_nc_href( $path, $exact ) );
	curl_setopt( $ch, CURLOPT_USERPWD, $c['user'] . ':' . $c['pass'] );
	curl_setopt( $ch, CURLOPT_FOLLOWLOCATION, false );
	curl_setopt( $ch, CURLOPT_CONNECTTIMEOUT, 15 );
	curl_setopt( $ch, CURLOPT_TIMEOUT, 600 );
	$bundle = ABSPATH . WPINC . '/certificates/ca-bundle.crt';
	if ( is_readable( $bundle ) ) { curl_setopt( $ch, CURLOPT_CAINFO, $bundle ); }
	return $ch;
}

function lbs_nc_status_error( $code ) {
	if ( 404 === $code ) { return new WP_Error( 'lbs_nc_missing', 'That file isn\'t in Nextcloud any more.' ); }
	if ( 401 === $code ) { return new WP_Error( 'lbs_nc_auth', 'Nextcloud refused the username or app password.' ); }
	return new WP_Error( 'lbs_nc_http', sprintf( 'Nextcloud couldn\'t send the file (%d).', $code ) );
}

/**
 * Stream a file from Nextcloud straight to the browser, chunk by chunk, so
 * large recordings never sit in memory or on disk. Byte ranges are passed
 * through (Safari needs them to play audio). $on_headers( $status, $headers )
 * is called once, just before the first byte, so the caller can send its own
 * headers. Returns true, or WP_Error if nothing was sent. $exact: see
 * lbs_nc_segments().
 */
function lbs_nc_stream( $path, $range, $on_headers, $exact = false ) {
	if ( ! lbs_nc_ready() ) { return new WP_Error( 'lbs_nc_setup', 'Nextcloud isn\'t connected yet.' ); }
	$range = ( $range && preg_match( '/^bytes=\d*-\d*$/', $range ) ) ? $range : '';

	if ( ! function_exists( 'curl_init' ) ) {
		// Fallback: via a temporary file (uses disk, not memory).
		if ( ! function_exists( 'wp_tempnam' ) ) { require_once ABSPATH . 'wp-admin/includes/file.php'; }
		$tmp = wp_tempnam( 'lbs-nc' );
		$res = lbs_nc_request( 'GET', $path, array( 'exact' => $exact, 'stream' => true, 'filename' => $tmp, 'timeout' => 300, 'headers' => $range ? array( 'Range' => $range ) : array() ) );
		if ( is_wp_error( $res ) ) { @unlink( $tmp ); return $res; } // phpcs:ignore
		$code = (int) wp_remote_retrieve_response_code( $res );
		if ( 200 !== $code && 206 !== $code ) { @unlink( $tmp ); return lbs_nc_status_error( $code ); } // phpcs:ignore
		$on_headers( $code, array( 'content-length' => (string) filesize( $tmp ), 'content-range' => (string) wp_remote_retrieve_header( $res, 'content-range' ) ) );
		readfile( $tmp ); // phpcs:ignore
		@unlink( $tmp ); // phpcs:ignore
		return true;
	}

	$status  = 0;
	$headers = array();
	$started = false;
	$ch      = lbs_nc_curl_base( $path, $exact );
	if ( $range ) { curl_setopt( $ch, CURLOPT_HTTPHEADER, array( 'Range: ' . $range ) ); }
	curl_setopt( $ch, CURLOPT_HEADERFUNCTION, function ( $ch, $line ) use ( &$status, &$headers ) {
		if ( preg_match( '#^HTTP/\S+\s+(\d{3})#', $line, $m ) ) { $status = (int) $m[1]; $headers = array(); }
		elseif ( false !== strpos( $line, ':' ) ) {
			list( $k, $v )                    = explode( ':', $line, 2 );
			$headers[ strtolower( trim( $k ) ) ] = trim( $v );
		}
		return strlen( $line );
	} );
	curl_setopt( $ch, CURLOPT_WRITEFUNCTION, function ( $ch, $data ) use ( &$status, &$headers, &$started, $on_headers ) {
		if ( ! $started ) {
			if ( 200 !== $status && 206 !== $status ) { return 0; } // Abort: an error page, not the file.
			$on_headers( $status, $headers );
			$started = true;
		}
		echo $data; // phpcs:ignore -- file bytes.
		flush();
		return strlen( $data );
	} );
	curl_exec( $ch );
	$error = curl_error( $ch );
	curl_close( $ch );
	if ( ! $started ) {
		if ( 200 === $status || 206 === $status ) { $on_headers( $status, $headers ); return true; } // Empty file.
		return $status ? lbs_nc_status_error( $status ) : new WP_Error( 'lbs_nc_net', 'Couldn\'t reach Nextcloud: ' . $error );
	}
	return true;
}

/** Create every folder along a path (existing folders are fine). */
function lbs_nc_mkdirs( $path ) {
	$current = '';
	foreach ( array_filter( explode( '/', lbs_clean_path( $path ) ), 'strlen' ) as $seg ) {
		$current .= '/' . $seg;
		lbs_nc_request( 'MKCOL', $current );
	}
}

/**
 * Upload a local file to Nextcloud, creating folders as needed. With cURL the
 * file is streamed from disk, so big phone videos don't fill PHP's memory.
 */
function lbs_nc_put( $path, $local ) {
	$attempt = function () use ( $path, $local ) {
		if ( function_exists( 'curl_init' ) ) {
			$fh = fopen( $local, 'rb' ); // phpcs:ignore
			$ch = lbs_nc_curl_base( $path );
			curl_setopt( $ch, CURLOPT_UPLOAD, true );
			curl_setopt( $ch, CURLOPT_INFILE, $fh );
			curl_setopt( $ch, CURLOPT_INFILESIZE, filesize( $local ) );
			curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );
			curl_setopt( $ch, CURLOPT_HTTPHEADER, array( 'Content-Type: application/octet-stream' ) );
			curl_exec( $ch );
			$code  = (int) curl_getinfo( $ch, CURLINFO_RESPONSE_CODE );
			$error = curl_error( $ch );
			curl_close( $ch );
			fclose( $fh ); // phpcs:ignore
			return $code ? $code : new WP_Error( 'lbs_nc_net', 'Couldn\'t reach Nextcloud: ' . $error );
		}
		$res = lbs_nc_request( 'PUT', $path, array( 'timeout' => 300, 'body' => file_get_contents( $local ), 'headers' => array( 'Content-Type' => 'application/octet-stream' ) ) ); // phpcs:ignore
		return is_wp_error( $res ) ? $res : (int) wp_remote_retrieve_response_code( $res );
	};
	$code = $attempt();
	if ( ! is_wp_error( $code ) && in_array( $code, array( 404, 409 ), true ) ) {
		lbs_nc_mkdirs( dirname( $path ) );
		$code = $attempt();
	}
	if ( is_wp_error( $code ) ) { return $code; }
	return in_array( $code, array( 200, 201, 204 ), true ) ? true : new WP_Error( 'lbs_nc_put', sprintf( 'Nextcloud didn\'t accept the upload (%d).', $code ) );
}

/** Delete a file. Missing files count as deleted. */
function lbs_nc_delete( $path ) {
	$res = lbs_nc_request( 'DELETE', $path );
	if ( is_wp_error( $res ) ) { return $res; }
	$code = (int) wp_remote_retrieve_response_code( $res );
	return in_array( $code, array( 200, 204, 404 ), true ) ? true : new WP_Error( 'lbs_nc_delete', sprintf( 'Nextcloud didn\'t delete the file (%d).', $code ) );
}

/** Settings-page check: can we list the members root? */
function lbs_nc_test() {
	$root  = '/' . lbs_clean_path( lbs_settings()['nc_root'] );
	$items = lbs_nc_list( $root );
	if ( is_wp_error( $items ) ) { return $items; }
	$folders = count( array_filter( $items, function ( $i ) { return $i['dir']; } ) );
	return sprintf( 'Connected. %s has %d member folder%s.', $root, $folders, 1 === $folders ? '' : 's' );
}
