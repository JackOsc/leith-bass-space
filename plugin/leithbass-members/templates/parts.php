<?php
/**
 * Small rendering helpers for the portal views.
 *
 * @package LeithBassMembers
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

/** Big date cell: "15" over "Tue · Sep". */
function lbs_ui_date( $date ) {
	$ts = lbs_dt( $date )->getTimestamp();
	return '<span class="mp-date"><span class="d mp-num">' . esc_html( wp_date( 'j', $ts ) ) . '</span><span class="m"><span class="dw">' . esc_html( wp_date( 'D', $ts ) ) . ' · </span>' . esc_html( wp_date( 'M', $ts ) ) . '</span></span>';
}

function lbs_ui_nice_date( $date, $format = 'D j M' ) {
	return wp_date( $format, lbs_dt( $date )->getTimestamp() );
}

/** File buttons for a session's attachments. */
function lbs_ui_files( $s ) {
	if ( ! $s['files'] ) { return ''; }
	$out = '<div class="mp-files">';
	foreach ( $s['files'] as $i => $path ) {
		$name = basename( $path );
		$kind = lbs_file_kind( $name );
		$url  = lbs_file_url( $s['id'], $i );
		$ext  = strtoupper( pathinfo( $name, PATHINFO_EXTENSION ) );
		$ext  = $ext ? substr( $ext, 0, 4 ) : 'FILE';
		$ic   = '<span class="ic ' . esc_attr( $kind ) . '">' . esc_html( $ext ) . '</span>';
		$nm   = '<span><span class="nm">' . esc_html( pathinfo( $name, PATHINFO_FILENAME ) ) . '</span><span class="meta">' . esc_html( 'pdf' === $kind ? 'PDF worksheet' : ( 'audio' === $kind ? 'Audio' : ( 'video' === $kind ? 'Video' : $ext . ' file' ) ) ) . '</span></span>';
		if ( 'audio' === $kind || 'video' === $kind ) {
			$out .= '<div><button type="button" class="mp-file" data-play="' . esc_url( $url ) . '" data-kind="' . esc_attr( $kind ) . '">' . $ic . $nm . '<span class="go">Play</span></button></div>';
		} else {
			$out .= '<a class="mp-file" href="' . esc_url( $url ) . '" target="_blank" rel="noopener">' . $ic . $nm . '<span class="go">' . ( 'file' === $kind ? 'Download' : 'Open' ) . '</span></a>';
		}
	}
	return $out . '</div>';
}

/** Objectives with ticks. Ticks follow the objective's permanent id. */
function lbs_ui_objectives( $s, $done, $readonly = false ) {
	if ( ! $s['obj'] ) { return ''; }
	$ticked = isset( $done[ $s['id'] ] ) ? (array) $done[ $s['id'] ] : array();
	$out    = '<ul class="mp-checklist">';
	foreach ( $s['obj'] as $o ) {
		$out .= '<li><label><input type="checkbox" data-obj="' . (int) $s['id'] . ':' . esc_attr( $o['id'] ) . '" ' . checked( in_array( $o['id'], $ticked, true ), true, false ) . disabled( $readonly, true, false ) . '><span>' . esc_html( $o['text'] ) . '</span></label></li>';
	}
	return $out . '</ul>';
}

/**
 * The credit meter: one cell per hour in the current blocks. Filled = used,
 * striped = booked, empty = free. Overdrawn credit shows as a warning, not zero.
 */
function lbs_ui_meter( $ledger ) {
	$pool   = max( 60, $ledger['pool'] );
	$cells  = min( 24, max( 1, (int) ceil( $pool / 60 ) ) );
	$per    = $pool / $cells;
	$used   = max( 0, $pool - max( 0, $ledger['balance'] ) );
	$booked = max( 0, min( $ledger['booked'], max( 0, $ledger['balance'] ) ) );
	$html   = '';
	for ( $i = 0; $i < $cells; $i++ ) {
		$f   = max( 0, min( 1, ( $used - $i * $per ) / $per ) );
		$bk  = max( 0, min( 1, ( $used + $booked - $i * $per ) / $per ) );
		$html .= '<i class="' . ( $bk > $f ? 'next-h' : '' ) . '" style="--f:' . esc_attr( round( $f, 3 ) ) . '"></i>';
	}
	return '<div class="mp-meter" style="--cells:' . (int) $cells . '" aria-hidden="true">' . $html . '</div>';
}

function lbs_ui_chev() {
	return '<svg class="mp-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
}

/** The credit summary box. */
function lbs_ui_credit( $ledger, $link = true ) {
	$bal  = $ledger['balance'];
	$html = '<div class="mp-box">';
	$html .= '<div class="mp-box-head"><h4>Lesson credit</h4>' . ( $link ? '<a class="mp-link" href="' . esc_url( add_query_arg( 'tab', 'bookings' ) ) . '" data-tabgo="bookings">Statement</a>' : '' ) . '</div>';
	$html .= '<div class="mp-big"><b class="mp-num' . ( $bal < 0 ? ' mp-neg' : '' ) . '">' . esc_html( lbs_hm( $bal ) ) . '</b><span>' . ( $bal < 0 ? 'over your credit' : 'available' ) . '</span></div>';
	$html .= lbs_ui_meter( $ledger );
	$html .= '<div class="mp-legend"><span class="u">Used</span>' . ( $ledger['booked'] ? '<span class="b">Booked</span>' : '' ) . '<span>Free</span></div>';
	$bits = array();
	if ( $ledger['booked'] ) { $bits[] = esc_html( lbs_hm( $ledger['booked'] ) ) . ' already booked, leaving ' . esc_html( lbs_hm( $bal - $ledger['booked'] ) ) . ( $bal - $ledger['booked'] < 0 ? ' (some bookings are provisional until you top up)' : '' ) . '.'; }
	if ( $ledger['expiring'] ) { $bits[] = esc_html( lbs_hm( $ledger['expiring']['minutes'] ) ) . ' expires on ' . esc_html( wp_date( 'j F Y', lbs_dt( $ledger['expiring']['date'] )->getTimestamp() ) ) . '.'; }
	if ( $bal < 0 ) { $bits[] = 'Jack will sort the difference with you.'; }
	if ( $bits ) { $html .= '<p class="mp-small">' . implode( ' ', $bits ) . '</p>'; }
	return $html . '</div>';
}
