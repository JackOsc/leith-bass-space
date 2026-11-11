/* Leith Bass Space member portal: service worker (served from /members/sw.js).
 *
 * - The portal page and the app's two rooms (Ear Training, Harmonic Elements)
 *   are fetched fresh when there's signal, and the last good copy of each is
 *   kept for when there isn't. The house band in both draws its own sound, so
 *   with its instruments stored (below) a room plays with no signal at all.
 * - Worksheet PDFs are kept once opened (and the latest session's are fetched
 *   ahead of time), so they open in a practice room with no signal.
 * - Your recordings and the Shelf's tracks are always streamed; they aren't stored.
 * - The house band's recorded instruments and drum kits (small files, the same
 *   for everyone: the metronome's clicks among them) are kept once they have
 *   been used, so they are there with no signal.
 * - Signing out, or signing in as someone else, clears everything stored.
 */
'use strict';

var VERSION = '__VERSION__';
var SHELL = 'lbs-shell-' + VERSION;
var DATA = 'lbs-data-v1';
var SCOPE = new URL(self.registration.scope).pathname; // e.g. /members/
var SHELL_URLS = __SHELL__;
var MAX_PDF = 25 * 1024 * 1024;

self.addEventListener('install', function (event) {
	event.waitUntil(
		caches.open(SHELL).then(function (c) {
			return Promise.all(SHELL_URLS.map(function (u) { return c.add(u).catch(function () {}); }));
		}).then(function () { return self.skipWaiting(); })
	);
});

self.addEventListener('activate', function (event) {
	event.waitUntil(
		caches.keys().then(function (keys) {
			return Promise.all(keys.filter(function (k) { return k.indexOf('lbs-shell-') === 0 && k !== SHELL; }).map(function (k) { return caches.delete(k); }));
		}).then(function () { return self.clients.claim(); })
	);
});

// The portal page, and the app's rooms (Ear Training, Harmonic Elements, Read): each kept as its own last good copy.
var ROOMS = ['ear-training/', 'elements/', 'read/'];
function isPortalPage(url) { return url.pathname === SCOPE || ROOMS.some(function (r) { return url.pathname === SCOPE + r; }); }
function isSessionFile(url) { return url.pathname === SCOPE + 'file/' && url.searchParams.has('s'); }
function isAsset(url) { return /\/wp-content\/(themes|plugins)\/.+\.(css|js|woff2|png|svg|webp)$/.test(url.pathname); }
// The house band's sound packs (the metronome's clicks and kits). Their address carries the version, so a stored copy never goes stale.
function isSound(url) { return /\/wp-content\/plugins\/.+\/assets\/harmonic\/sounds\/[^\/]+\.mp3$/.test(url.pathname); }
function pageKey(url) { return new Request(url && url.pathname !== SCOPE ? url.pathname : SCOPE); }

function offlinePage() {
	return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title>' +
		'<body style="margin:0;background:#090909;color:#F3F1EB;font:16px/1.6 Helvetica,Arial,sans-serif;display:grid;place-items:center;min-height:100vh;padding:24px;text-align:center">' +
		'<div><p style="font-size:22px;font-weight:600;margin:0 0 8px">You\'re offline</p><p style="margin:0;color:#B7B2A8">Open the portal once with signal and your latest notes will be here next time.</p></div>',
		{ headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

self.addEventListener('fetch', function (event) {
	var req = event.request;
	if (req.method !== 'GET') { return; }
	var url = new URL(req.url);
	if (url.origin !== self.location.origin) { return; }
	if (/^\/(wp-json|wp-admin|wp-login)/.test(url.pathname) || url.searchParams.has('rest_route')) { return; }

	// The portal page: network first, last good copy when offline.
	if (req.mode === 'navigate' && isPortalPage(url)) {
		event.respondWith(
			fetch(req).then(function (res) {
				var who = res.headers.get('X-LBS-Member');
				if (res.ok && who === '1') {
					var copy = res.clone();
					caches.open(DATA).then(function (c) { c.put(pageKey(url), copy); });
				} else if (who === '0') {
					caches.delete(DATA); // Signed out: nothing personal stays on the phone.
				}
				return res;
			}).catch(function () {
				return caches.open(DATA).then(function (c) { return c.match(pageKey(url)); }).then(function (hit) { return hit || offlinePage(); });
			})
		);
		return;
	}

	// Worksheets: network first, stored copy when offline. Never byte ranges.
	if (isSessionFile(url) && !req.headers.has('range')) {
		event.respondWith(
			fetch(req).then(function (res) {
				var type = res.headers.get('Content-Type') || '';
				var len = parseInt(res.headers.get('Content-Length') || '0', 10);
				if (res.ok && type.indexOf('application/pdf') === 0 && len < MAX_PDF) {
					var copy = res.clone();
					caches.open(DATA).then(function (c) { c.put(req, copy); });
				}
				return res;
			}).catch(function () {
				return caches.open(DATA).then(function (c) { return c.match(req); }).then(function (hit) {
					return hit || new Response('This worksheet hasn\'t been opened on this phone yet, so it isn\'t available offline.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
				});
			})
		);
		return;
	}

	// The metronome's sounds: the stored copy if there is one, else fetched and kept (whole files only).
	if (isSound(url) && !req.headers.has('range')) {
		event.respondWith(
			caches.open(SHELL).then(function (c) {
				return c.match(req).then(function (hit) {
					return hit || fetch(req).then(function (res) { if (res.status === 200) { c.put(req, res.clone()); } return res; });
				});
			})
		);
		return;
	}

	// Styles, scripts, fonts and icons: use the stored copy, refresh it quietly.
	if (isAsset(url)) {
		event.respondWith(
			caches.open(SHELL).then(function (c) {
				return c.match(req).then(function (hit) {
					var net = fetch(req).then(function (res) { if (res.ok) { c.put(req, res.clone()); } return res; }).catch(function () { return hit; });
					return hit || net;
				});
			})
		);
	}
});

self.addEventListener('message', function (event) {
	var msg = event.data || {};
	if (msg.type === 'clear') {
		event.waitUntil(caches.delete(DATA));
	}
	if (msg.type === 'prefetch' && Array.isArray(msg.urls)) {
		event.waitUntil(caches.open(DATA).then(function (c) {
			return Promise.all(msg.urls.slice(0, 8).map(function (u) {
				return c.match(u).then(function (hit) {
					if (hit) { return; }
					return fetch(u, { credentials: 'same-origin' }).then(function (res) {
						var type = res.headers.get('Content-Type') || '';
						if (res.ok && type.indexOf('application/pdf') === 0) { return c.put(u, res); }
					}).catch(function () {});
				});
			}));
		}));
	}
});
