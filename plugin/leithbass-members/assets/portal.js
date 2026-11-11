/* Leith Bass Space member portal.
 * Tabs, notes, bookings, account, the Shed (practice tools), and the app layer:
 * offline copy, a queue for changes made without signal, and home-screen install.
 */
(function () {
	'use strict';

	var L = window.LBS;
	if (!L) { return; }
	var $ = function (s, r) { return (r || document).querySelector(s); };
	var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
	var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	var DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	var RO = !!L.readOnly;
	var USER = +L.user || 0;
	var html = document.documentElement;

	function esc(s) {
		return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
		});
	}
	function d(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12); }
	function iso(dt) { return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0'); }
	function addDays(s, n) { var x = d(s); x.setDate(x.getDate() + n); return iso(x); }
	function nice(s) { var x = d(s); return DAY[x.getDay()] + ' ' + x.getDate() + ' ' + MON[x.getMonth()]; }
	function fmtMin(m) { m = Math.round(+m || 0); var h = Math.floor(m / 60), r = m % 60; return h ? h + 'h' + (r ? ' ' + r + 'm' : '') : r + 'm'; }
	function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
	function tmpId() { return 'tmp' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
	var demoMem = {};
	// The full screen demo behaves like the app, back button and all; the framed one keeps the page's address alone.
	var HIST = (!L.demo || !!L.demoFull) && !L.solo;
	function store(k, v) {
		// The try-it Shed keeps everything in memory: a reload starts it fresh, and a member's own settings are never touched.
		if (L.demo) {
			if (v === undefined) { return demoMem.hasOwnProperty(k) ? JSON.parse(demoMem[k]) : null; }
			if (v === null) { delete demoMem[k]; } else { demoMem[k] = JSON.stringify(v); }
			return null;
		}
		// A tool on a page of its own (the public metronome, drone and tuner) keeps what it is set to in the
		// browser, under names of its own, so a member's own settings are never disturbed.
		if (L.solo) { k = k.replace(/^lbs-/, 'lbs-solo-'); }
		try {
			if (v === undefined) { return JSON.parse(localStorage.getItem(k) || 'null'); }
			if (v === null) { localStorage.removeItem(k); } else { localStorage.setItem(k, JSON.stringify(v)); }
		} catch (e) { /* private mode: carry on without */ }
		return null;
	}
	var standalone = html.classList.contains('lbs-app') || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
	if (standalone) { html.classList.add('lbs-app'); }

	/* =====================================================================
	 * Service worker and the offline copy
	 * =================================================================== */
	function clearOffline() {
		var jobs = [];
		try {
			Object.keys(localStorage).forEach(function (k) { if (k.indexOf('lbs-q-') === 0 || k === 'lbs-shelf') { localStorage.removeItem(k); } });
		} catch (e) { /* nothing stored */ }
		if (window.caches) {
			jobs.push(caches.keys().then(function (keys) {
				return Promise.all(keys.filter(function (k) { return k.indexOf('lbs-data') === 0; }).map(function (k) { return caches.delete(k); }));
			}).catch(function () {}));
		}
		if (navigator.serviceWorker && navigator.serviceWorker.controller) {
			navigator.serviceWorker.controller.postMessage({ type: 'clear' });
		}
		return Promise.all(jobs);
	}

	if ('serviceWorker' in navigator && L.sw) {
		// A different person signing in on the same phone starts with a clean slate.
		var last = store('lbs-last-user');
		if (L.signedIn && USER && last && last !== USER) { clearOffline(); }
		if (L.signedIn && USER) { store('lbs-last-user', USER); }
		if (!L.signedIn) { clearOffline(); store('lbs-last-user', null); }

		window.addEventListener('load', function () {
			navigator.serviceWorker.register(L.sw, { scope: L.scope }).then(function () {
				return navigator.serviceWorker.ready;
			}).then(function (reg) {
				if (L.signedIn && USER && L.prefetch && L.prefetch.length && reg.active) {
					reg.active.postMessage({ type: 'prefetch', urls: L.prefetch });
				}
			}).catch(function () { /* the site works without it */ });
		});
	}

	document.addEventListener('click', function (e) {
		var out = e.target.closest('[data-signout]');
		if (!out) { return; }
		e.preventDefault();
		var href = out.getAttribute('href');
		clearOffline().then(function () { location.href = href; }, function () { location.href = href; });
	});

	/* =====================================================================
	 * Install: iPhone (Share → Add to Home Screen) and Android (install prompt)
	 * =================================================================== */
	var ua = navigator.userAgent || '';
	var isIOS = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
	var isAndroid = /android/i.test(ua);
	var iosSafari = isIOS && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(ua);
	var deferredPrompt = null;
	var IOS_TEXT = iosSafari ?
		'Tap the Share button, then “Add to Home Screen”. It opens full screen and keeps you signed in.' :
		'Open this page in Safari, tap the Share button, then “Add to Home Screen”.';

	function installText() {
		if (standalone) { return 'You\'re using the app. It keeps you signed in, and your latest notes and worksheets are saved for when there\'s no signal.'; }
		if (isIOS) { return IOS_TEXT; }
		if (deferredPrompt) { return 'Install it and it opens full screen from your home screen, keeps you signed in, and keeps your latest notes for when there\'s no signal.'; }
		if (isAndroid) { return 'In Chrome, open the ⋮ menu and choose “Add to Home screen” or “Install app”.'; }
		return 'On your phone, open this page in Safari (iPhone) or Chrome (Android) and add it to your home screen. It then opens like an app and keeps you signed in.';
	}
	function installDismissed() {
		var t = store('lbs-install-later');
		return t && Date.now() - t < 45 * 864e5;
	}
	function updateInstall() {
		var card = $('[data-install-card]');
		if (card) {
			var show = L.signedIn && !RO && !standalone && !installDismissed() && (isIOS || !!deferredPrompt);
			card.hidden = !show;
			if (show) {
				$('[data-install-text]', card).textContent = installText();
				$('[data-install-go]', card).hidden = !deferredPrompt;
			}
		}
		var appText = $('[data-app-text]');
		if (appText) {
			appText.textContent = installText();
			var box = $('[data-app-box]');
			var btn = box && $('[data-install-go]', box);
			if (deferredPrompt && box && !btn) {
				btn = document.createElement('button');
				btn.type = 'button'; btn.className = 'mp-btn sm'; btn.setAttribute('data-install-go', '');
				btn.textContent = 'Install the app';
				var wrap = document.createElement('div'); wrap.appendChild(btn); box.appendChild(wrap);
			}
			if (btn && !deferredPrompt) { btn.parentElement.remove(); }
		}
		var hint = $('[data-install-hint]');
		if (hint && !standalone && (isIOS || isAndroid)) {
			hint.hidden = false;
			hint.textContent = 'Tip: once you\'re signed in, add the portal to your home screen and it works like an app. ' + (isIOS ? IOS_TEXT : 'Chrome will offer to install it.');
		}
	}
	window.addEventListener('beforeinstallprompt', function (e) {
		e.preventDefault();
		deferredPrompt = e;
		updateInstall();
	});
	window.addEventListener('appinstalled', function () { deferredPrompt = null; updateInstall(); toast('Installed. Open it from your home screen.'); });
	document.addEventListener('click', function (e) {
		if (e.target.closest('[data-install-go]') && deferredPrompt) {
			var p = deferredPrompt;
			deferredPrompt = null;
			p.prompt();
			(p.userChoice || Promise.resolve()).then(updateInstall, updateInstall);
		}
		if (e.target.closest('[data-install-dismiss]')) {
			store('lbs-install-later', Date.now());
			updateInstall();
		}
	});

	/* =====================================================================
	 * Toast, with an optional Undo
	 * =================================================================== */
	var toastTimer, toastUndo = null;
	function toast(msg, undo) {
		var el = $('#mp-toast');
		if (!el || !msg) { return; }
		$('[data-toast-text]', el).textContent = msg;
		var u = $('[data-undo]', el);
		toastUndo = undo || null;
		u.hidden = !undo;
		el.classList.add('show');
		clearTimeout(toastTimer);
		toastTimer = setTimeout(function () { el.classList.remove('show'); toastUndo = null; }, undo ? 7000 : 3800);
	}
	document.addEventListener('click', function (e) {
		if (!e.target.closest('[data-undo]') || !toastUndo) { return; }
		var fn = toastUndo;
		toastUndo = null;
		$('#mp-toast').classList.remove('show');
		fn();
	});

	/* =====================================================================
	 * A room of the app (Ear Training, Harmonic Elements): the trainer runs
	 * itself, and nothing below this is wanted, only the offline line.
	 * =================================================================== */
	if (L.room) {
		var roomLine = function () {
			var on = navigator.onLine !== false;
			$$('[data-offline]').forEach(function (b) { b.hidden = on; });
			html.classList.toggle('lbs-offline', !on);
		};
		window.addEventListener('online', roomLine);
		window.addEventListener('offline', roomLine);
		roomLine();
		return;
	}

	/* =====================================================================
	 * Talking to the site
	 * =================================================================== */
	var QUEUEABLE = { add: ['diary', 'questions'], tempo_log: 1, objective: 1 };
	var QKEY = 'lbs-q-' + USER;
	var state = L.state || {};

	function canQueue(data) {
		var q = QUEUEABLE[data.action];
		return !!q && (q === 1 || q.indexOf(data.module) > -1);
	}
	function refreshNonce() {
		return fetch(L.ajax + '?action=rest-nonce', { credentials: 'same-origin' }).then(function (r) { return r.text(); }).then(function (t) {
			t = String(t).trim();
			if (!/^[a-f0-9]{6,}$/i.test(t)) { throw new Error('signed-out'); }
			L.nonce = t;
			return t;
		});
	}
	function post(path, body, retried) {
		return fetch(L.rest + path, {
			method: 'POST',
			credentials: 'same-origin',
			headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': L.nonce },
			body: JSON.stringify(body)
		}).then(function (r) {
			return r.json().catch(function () { return { ok: false, message: 'Something went wrong on the site. Try again in a moment.' }; }).then(function (res) {
				res = res || {};
				res.status = r.status;
				if (!retried && (res.code === 'rest_cookie_invalid_nonce' || (r.status === 403 && !res.hasOwnProperty('ok')))) {
					return refreshNonce().then(function () { return post(path, body, true); }, function () {
						return { ok: false, signedOut: true, message: 'You\'ve been signed out. Sign in again to carry on.' };
					});
				}
				return res;
			});
		});
	}

	/**
	 * api({action…}, {btn, quiet}) → Promise of the response.
	 * Never rejects: failures resolve with ok:false (and are shown in a toast
	 * unless quiet). Offline, changes that can wait are queued instead.
	 */
	/* The try-it Shed on the Portal page: changes stay on the page, nothing is sent. */
	var demoWarned = false;
	function demoApi(data) {
		var st = state, m = data.module, ok = { ok: true, state: st };
		var listOf = function (k) { return (st[k] = st[k] || []); };
		var find = function (k, id) { return listOf(k).filter(function (x) { return x.id === id; })[0]; };
		switch (data.action) {
			case 'tool': (st.tools = st.tools || {})[data.tool] = !!data.on; break;
			case 'share': (st.share = st.share || {})[m] = !!data.on; break;
			case 'add':
				var it = Object.assign({ id: tmpId() }, data.item || {});
				if (m === 'questions') { it.added = L.today; }
				if (m === 'tempo') { it.log = []; }
				if (m === 'listening') { it.from = 'member'; it.added = L.today; }
				if (m === 'diary') { listOf('diary').unshift(it); st.diary.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }); } else { listOf(m).push(it); }
				break;
			case 'edit': var ex = find(m, data.id); if (ex) { Object.assign(ex, data.item || {}); } break;
			case 'remove': st[m] = listOf(m).filter(function (x) { return x.id !== data.id; }); break;
			case 'tempo_log': var te = find('tempo', data.id); if (te) { (te.log = te.log || []).push([L.today, data.bpm, data.quality || 'clean']); } break;
			case 'tempo_unlog': var tu = find('tempo', data.id); if (tu && tu.log) { tu.log.pop(); } break;
			case 'song_move': var so = find('songs', data.id); if (so) { so.s = data.s; } break;
			case 'goal_status': var go = find('goals', data.id); if (go) { go.status = data.status; } break;
			case 'habit':
				var hb = st.habit = st.habit || {};
				['days', 'min', 'rest', 'slots', 'slots_cal'].forEach(function (k) { if (data[k] !== undefined) { hb[k] = data[k]; } });
				if ('pause' in data) { hb.pause = data.pause; }
				if (data.days !== undefined) { hb.by = 'member'; }
				break;
			case 'gear': st.gear = { bass: data.bass, strings: data.strings, changed: data.changed, setup: data.setup }; break;
			case 'strings_today': (st.gear = st.gear || {}).changed = L.today; break;
			default: break;
		}
		if (!demoWarned && !L.demoFull && !L.solo) { demoWarned = true; ok.message = 'This is a demo: it works, but nothing is saved.'; }
		return ok;
	}

	function api(data, opts) {
		opts = opts || {};
		if (L.demo || L.solo) {
			var dres = demoApi(data);
			if (dres.message && !opts.silent) { toast(dres.message); }
			return Promise.resolve(dres);
		}
		if (RO) { toast('This is a preview. Nothing can be changed here.'); return Promise.resolve({ ok: false, readOnly: true }); }
		if (!navigator.onLine && canQueue(data)) { return Promise.resolve(enqueue(data)); }
		var btn = opts.btn;
		if (btn) { if (btn.disabled) { return Promise.resolve({ ok: false, busy: true }); } btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }
		return post('action', data).then(function (res) {
			if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); }
			if (res.signedOut) { toast(res.message); setTimeout(function () { location.reload(); }, 2500); return res; }
			if (!res.ok) { if (!opts.quiet) { toast(res.message || 'That didn\'t save. Try again.'); } return res; }
			if (res.state) { state = res.state; }
			if (res.message && !opts.silent) { toast(res.message, res.undo ? function () { restore(res.undo); } : null); }
			return res;
		}, function () {
			if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); }
			if (canQueue(data)) { return enqueue(data); }
			toast('You seem to be offline. Try again when you have signal.');
			return { ok: false, offline: true };
		});
	}

	function restore(undo) {
		api({ action: 'restore', module: undo.module, item: undo.item, at: undo.at }).then(function (res) {
			if (res.ok) { renderModule(undo.module); toast('Put back.'); }
		});
	}

	/* ---- Offline queue ---- */
	function queue() { return store(QKEY) || []; }
	function enqueue(data) {
		data = JSON.parse(JSON.stringify(data));
		if (data.action === 'add' && data.item && !data.item.id) { data.item.tmp = tmpId(); }
		var q = queue();
		q.push({ data: data, t: Date.now() });
		store(QKEY, q.slice(-100));
		applyOptimistic(data);
		toast('Saved on this phone. It\'ll sync when you\'re back online.');
		return { ok: true, queued: true };
	}
	function applyOptimistic(data) {
		if (data.action === 'add' && data.module === 'diary') {
			var it = Object.assign({ id: data.item.tmp, pending: true }, data.item);
			state.diary = [it].concat(state.diary || []).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
		} else if (data.action === 'add' && data.module === 'questions') {
			(state.questions = state.questions || []).push({ id: data.item.tmp, q: data.item.q, added: L.today, pending: true });
		} else if (data.action === 'tempo_log') {
			(state.tempo || []).forEach(function (ex) { if (ex.id === data.id) { (ex.log = ex.log || []).push([L.today, data.bpm, data.quality || 'clean', 'pending']); } });
		} else if (data.action === 'objective') {
			var all = state.objdone || (state.objdone = {});
			var list = (all[data.session] || []).filter(function (o) { return o !== data.obj; });
			if (data.done) { list.push(data.obj); }
			all[data.session] = list;
			$$('input[data-obj="' + data.session + ':' + data.obj + '"]').forEach(function (b) { b.checked = !!data.done; });
		}
	}
	var flushing = false;
	function flushQueue() {
		if (flushing || RO || !USER || !navigator.onLine) { return; }
		var q = queue();
		if (!q.length) { return; }
		flushing = true;
		var sent = 0, dropped = 0;
		(function next() {
			var item = queue()[0];
			if (!item) { return done(); }
			var body = JSON.parse(JSON.stringify(item.data));
			if (body.item) { delete body.item.tmp; }
			post('action', body).then(function (res) {
				if (res.signedOut) { flushing = false; return; } // Keep the queue until they sign in again.
				if (res.ok) { sent++; if (res.state) { state = res.state; } } else { dropped++; }
				store(QKEY, queue().slice(1));
				next();
			}, function () { done(); });
		}());
		function done() {
			flushing = false;
			if (sent || dropped) {
				renderRoom();
				toast(sent ? 'Synced ' + plural(sent, 'change') + ' made offline.' + (dropped ? ' ' + dropped + ' couldn\'t be saved.' : '') : 'Some offline changes couldn\'t be saved.');
			}
		}
	}
	// Changes still waiting from last time show straight away.
	if (!RO && USER) { queue().forEach(function (it) { applyOptimistic(it.data); }); }

	/* ---- Online / offline ---- */
	function updateOnline() {
		var on = navigator.onLine;
		$$('[data-offline]').forEach(function (b) { b.hidden = on; });
		html.classList.toggle('lbs-offline', !on);
		if (on) { flushQueue(); }
	}
	window.addEventListener('online', updateOnline);
	window.addEventListener('offline', updateOnline);

	/* ---- Coming back to the app after a while: fetch the latest ---- */
	var hiddenAt = 0;
	document.addEventListener('visibilitychange', function () {
		if (document.hidden) { hiddenAt = Date.now(); return; }
		if (!hiddenAt || !L.signedIn || RO || !navigator.onLine) { return; }
		var away = Date.now() - hiddenAt;
		hiddenAt = 0;
		if (away < 30 * 60 * 1000) { return; }
		var typing = $$('.mp input[type=text], .mp input[type=number], .mp textarea').some(function (el) { return el.value.trim() !== '' && el.defaultValue !== el.value; });
		if (typing || queue().length || (met && met.running) || (drone && drone.playing)) { refreshNonce().catch(function () {}); return; }
		location.reload();
	});

	/* =====================================================================
	 * Tabs (top tabs and the app's bottom bar)
	 * =================================================================== */
	var TABS = $$('.mp-tab').map(function (t) { return t.getAttribute('data-tab'); });
	function setTab(name, opt) {
		opt = opt || {};
		var tab = $('.mp-tab[data-tab="' + name + '"]');
		if (!tab) { return; }
		$$('.mp-tab').forEach(function (t) {
			var on = t === tab;
			t.setAttribute('aria-selected', String(on));
			t.tabIndex = on ? 0 : -1;
		});
		$$('.mp-panel[role="tabpanel"]').forEach(function (p) { p.hidden = p.id !== 'mp-pn-' + name; });
		$$('[data-appbar]').forEach(function (a) {
			if (a.getAttribute('data-appbar') === name) { a.setAttribute('aria-current', 'page'); } else { a.removeAttribute('aria-current'); }
		});
		if (opt.push !== false) {
			try {
				var u = new URL(location.href);
				u.searchParams.set('tab', name);
				['welcome', 'pw', 'source'].forEach(function (k) { u.searchParams.delete(k); });
				if (name !== 'practice') { u.searchParams.delete('tool'); } else if (ui && ui.open) { u.searchParams.set('tool', ui.open); }
				history.replaceState(name === 'practice' && ui && ui.open ? { lbsTool: ui.open } : null, '', u.toString());
			} catch (e) { /* old browsers keep the link */ }
		}
		// A tool fills the phone screen only while the Shed is the tab showing.
		html.classList.toggle('mp-tool-open', name === 'practice' && !!(ui && ui.open));
		if (name === 'overview') { renderOverview(); }
		if (opt.focusTab) { tab.focus(); }
		if (opt.focusPanel) { var pn = $('#mp-pn-' + name); if (pn) { pn.focus({ preventScroll: true }); } }
	}
	$$('.mp-tab').forEach(function (t) {
		t.addEventListener('click', function (e) { e.preventDefault(); setTab(t.getAttribute('data-tab')); });
	});
	var tabList = $('.mp-tabs');
	if (tabList) {
		tabList.addEventListener('keydown', function (e) {
			var i = TABS.indexOf((document.activeElement && document.activeElement.getAttribute('data-tab')) || '');
			if (i < 0) { return; }
			var n = null;
			if (e.key === 'ArrowRight') { n = (i + 1) % TABS.length; }
			if (e.key === 'ArrowLeft') { n = (i + TABS.length - 1) % TABS.length; }
			if (e.key === 'Home') { n = 0; }
			if (e.key === 'End') { n = TABS.length - 1; }
			if (n === null) { return; }
			e.preventDefault();
			setTab(TABS[n], { focusTab: true });
		});
	}
	document.addEventListener('click', function (e) {
		var go = e.target.closest('[data-tabgo]');
		if (!go) { return; }
		e.preventDefault();
		setTab(go.getAttribute('data-tabgo'), { focusPanel: !!go.closest('.mp-appbar') });
		window.scrollTo({ top: 0 });
	});
	// The page may come from the phone's offline copy, so trust the address bar.
	try {
		var want = new URL(location.href).searchParams.get('tab');
		if (want && TABS.indexOf(want) > -1) { setTab(want, { push: false }); }
	} catch (e) { /* fine */ }

	/* =====================================================================
	 * Session notes
	 * =================================================================== */
	var showOlder = false;
	document.addEventListener('click', function (e) {
		var row = e.target.closest('.mp-sess-row');
		if (!row) { return; }
		var box = row.parentElement, det = box.querySelector('.mp-sess-detail');
		var open = det.hidden;
		det.hidden = !open;
		box.classList.toggle('open', open);
		row.setAttribute('aria-expanded', String(open));
	});
	var search = $('#mp-search');
	if (search) {
		search.addEventListener('input', function () {
			var q = search.value.trim().toLowerCase(), n = 0;
			$$('#mp-sessions .mp-sess').forEach(function (s) {
				var hit = !q || s.getAttribute('data-search').indexOf(q) > -1;
				var older = s.hasAttribute('data-older') && !showOlder;
				s.hidden = !hit || (older && !q);
				if (!s.hidden) { n++; }
			});
			$('#mp-search-count').textContent = plural(n, 'session') + (q ? ' match' : '');
			$('#mp-search-empty').hidden = n > 0;
		});
	}
	var olderBtn = $('#mp-older');
	if (olderBtn) {
		olderBtn.addEventListener('click', function () {
			showOlder = true;
			$$('#mp-sessions [data-older]').forEach(function (s) { s.hidden = false; });
			olderBtn.parentElement.hidden = true;
		});
	}

	/* ---- Audio and video play in the page (streamed, never stored) ---- */
	document.addEventListener('click', function (e) {
		var b = e.target.closest('[data-play]');
		if (!b) { return; }
		if (!navigator.onLine) { toast('Audio and video need signal. Worksheets you\'ve opened before still work offline.'); return; }
		var kind = b.getAttribute('data-kind') === 'video' ? 'video' : 'audio';
		var wrap = document.createElement('div');
		wrap.className = 'mp-player';
		var media = document.createElement(kind);
		media.controls = true;
		media.preload = 'metadata';
		media.setAttribute('playsinline', '');
		media.src = b.getAttribute('data-play');
		media.setAttribute('aria-label', (b.querySelector('.nm') || b).textContent);
		wrap.appendChild(media);
		b.parentElement.appendChild(wrap);
		b.remove();
		media.focus();
		var p = media.play();
		if (p && p.catch) { p.catch(function () { /* the controls are there */ }); }
	});

	/* ---- Objectives: ticks follow each objective's own id ---- */
	function updateObjCounts() {
		$$('[data-obj-count]').forEach(function (el) {
			var sid = el.getAttribute('data-obj-count');
			var boxes = $$('input[data-obj^="' + sid + ':"]', el.closest('.mp-box'));
			var n = boxes.filter(function (b) { return b.checked; }).length;
			el.textContent = boxes.length ? n + ' of ' + boxes.length + ' ticked' : '';
		});
	}
	document.addEventListener('change', function (e) {
		var cb = e.target.closest('input[data-obj]');
		if (!cb) { return; }
		var key = cb.getAttribute('data-obj'), cut = key.indexOf(':');
		var sid = +key.slice(0, cut), obj = key.slice(cut + 1), on = cb.checked;
		var copies = $$('input[data-obj="' + key + '"]');
		copies.forEach(function (o) { o.checked = on; });
		updateObjCounts();
		api({ action: 'objective', session: sid, obj: obj, done: on }, { silent: true }).then(function (res) {
			if (!res.ok) { copies.forEach(function (o) { o.checked = !on; }); updateObjCounts(); }
		});
	});
	updateObjCounts();

	/* =====================================================================
	 * Bookings
	 * =================================================================== */
	function inlineForm(cls, id, label, placeholder, sendLabel) {
		var f = document.createElement('form');
		f.className = cls;
		f.noValidate = true;
		f.innerHTML = '<div class="field"><label for="' + id + '">' + esc(label) + '</label><textarea id="' + id + '" maxlength="1000" placeholder="' + esc(placeholder) + '"></textarea></div>' +
			'<div class="mp-actions"><button class="mp-btn sm" type="submit">' + esc(sendLabel) + '</button><button class="mp-link" type="button" data-cancel>Cancel</button></div>';
		return f;
	}
	document.addEventListener('click', function (e) {
		var m = e.target.closest('[data-move]');
		if (m) {
			var row = m.closest('.mp-bk');
			var existing = row.querySelector('.mp-bk-form');
			if (existing) { existing.remove(); m.setAttribute('aria-expanded', 'false'); return; }
			var f = inlineForm('mp-bk-form', 'mp-mv-' + m.getAttribute('data-move'), 'What works better?', 'e.g. Could we do Wednesday at 18:00 that week instead?', 'Send to Jack');
			row.appendChild(f);
			m.setAttribute('aria-expanded', 'true');
			f.querySelector('textarea').focus();
			return;
		}
		var rq = e.target.closest('[data-request-session]');
		if (rq) {
			var slot = rq.closest('.mp-box, .mp-empty').querySelector('[data-request-slot]');
			if (slot.firstChild) { slot.innerHTML = ''; return; }
			var rf = inlineForm('mp-rq-form', 'mp-rq-' + Math.random().toString(36).slice(2, 7), 'What would suit?', 'Days and times that usually work for you', 'Send to Jack');
			slot.appendChild(rf);
			rf.querySelector('textarea').focus();
			return;
		}
		var c = e.target.closest('[data-cancel]');
		if (c) {
			var form = c.closest('form');
			var opener = form.classList.contains('mp-bk-form') ? form.closest('.mp-bk').querySelector('[data-move]') : null;
			form.remove();
			if (opener) { opener.setAttribute('aria-expanded', 'false'); opener.focus(); }
		}
	});
	document.addEventListener('submit', function (e) {
		var f = e.target.closest('.mp-bk-form, .mp-rq-form');
		if (!f) { return; }
		e.preventDefault();
		var ta = f.querySelector('textarea');
		if (!ta.value.trim()) { ta.focus(); toast('Add a line about when would suit, then send.'); return; }
		var btn = f.querySelector('button[type=submit]');
		if (f.classList.contains('mp-rq-form')) {
			api({ action: 'request_session', message: ta.value }, { btn: btn }).then(function (res) {
				if (!res.ok) { return; }
				var p = document.createElement('p');
				p.className = 'mp-small'; p.setAttribute('role', 'status');
				p.textContent = 'Sent. Jack will reply by email.';
				f.replaceWith(p);
			});
			return;
		}
		var row = f.closest('.mp-bk');
		api({ action: 'move', session: +row.getAttribute('data-session'), message: ta.value }, { btn: btn }).then(function (res) {
			if (!res.ok) { return; }
			f.remove();
			var pill = row.querySelector('.mp-pill.ok, .mp-pill.warn');
			if (pill) { pill.className = 'mp-pill muted'; pill.textContent = 'Move requested'; pill.removeAttribute('title'); }
			var b = row.querySelector('[data-move]');
			if (b) { b.remove(); }
		});
	});

	/* ---- Calendar subscription ---- */
	function copyText(text) {
		if (navigator.clipboard && window.isSecureContext) { return navigator.clipboard.writeText(text); }
		return new Promise(function (ok, no) {
			var ta = document.createElement('textarea');
			ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
			document.body.appendChild(ta); ta.select();
			try { document.execCommand('copy') ? ok() : no(); } catch (err) { no(); }
			ta.remove();
		});
	}
	document.addEventListener('click', function (e) {
		var cp = e.target.closest('[data-copy]');
		if (cp) {
			copyText(cp.getAttribute('data-copy')).then(function () { toast('Link copied. Paste it into your calendar app.'); }, function () { window.prompt('Copy this link:', cp.getAttribute('data-copy')); });
			return;
		}
		var rn = e.target.closest('[data-cal-renew]');
		if (rn) {
			if (!window.confirm('Make a new calendar link? The old one stops working, so any calendar using it needs the new link.')) { return; }
			api({ action: 'calendar_renew' }, { btn: rn }).then(function (res) {
				if (!res.ok || !res.calendar) { return; }
				var link = $('[data-cal-link]'), copy = $('[data-copy]');
				if (link) { link.href = res.calendar.replace(/^https?:\/\//, 'webcal://'); }
				if (copy) { copy.setAttribute('data-copy', res.calendar); }
			});
		}
	});

	/* =====================================================================
	 * Account
	 * =================================================================== */
	var details = $('#mp-details');
	if (details) {
		var origEmail = $('#mp-ac-email').value.toLowerCase();
		$('#mp-ac-email').addEventListener('input', function () {
			$('#mp-ac-current-wrap').hidden = this.value.trim().toLowerCase() === origEmail;
		});
		details.addEventListener('submit', function (e) {
			e.preventDefault();
			var err = details.querySelector('.mp-err');
			err.hidden = true;
			api({ action: 'account', name: $('#mp-ac-name').value, email: $('#mp-ac-email').value, phone: $('#mp-ac-phone').value, current: $('#mp-ac-current').value }, { btn: details.querySelector('button[type=submit]'), quiet: true }).then(function (res) {
				if (!res.ok) { if (!res.readOnly) { err.textContent = res.message || 'That didn\'t save.'; err.hidden = false; } return; }
				origEmail = $('#mp-ac-email').value.toLowerCase();
				$('#mp-ac-current').value = '';
				$('#mp-ac-current-wrap').hidden = true;
				var hidden = $('#mp-password input[name=username]');
				if (hidden) { hidden.value = $('#mp-ac-email').value; }
			});
		});
	}
	var pwForm = $('#mp-password');
	if (pwForm) {
		pwForm.addEventListener('submit', function (e) {
			e.preventDefault();
			var err = pwForm.querySelector('.mp-err');
			err.hidden = true;
			api({ action: 'password', current: $('#mp-pw-cur').value, 'new': $('#mp-pw-new').value }, { btn: pwForm.querySelector('button[type=submit]'), quiet: true }).then(function (res) {
				if (!res.ok) { if (!res.readOnly) { err.textContent = res.message || 'That didn\'t work.'; err.hidden = false; } return; }
				if (res.reload) { location.href = res.reload; }
			});
		});
	}
	$$('[data-pref]').forEach(function (t) {
		t.addEventListener('change', function () {
			api({ action: 'prefs', key: t.getAttribute('data-pref'), on: t.checked }).then(function (res) { if (!res.ok) { t.checked = !t.checked; } });
		});
	});
	document.addEventListener('click', function (e) {
		var ex = e.target.closest('[data-export]');
		if (ex) {
			if (RO) { toast('This is a preview.'); return; }
			ex.disabled = true;
			fetch(L.rest + 'export', { credentials: 'same-origin', headers: { 'X-WP-Nonce': L.nonce } }).then(function (r) {
				if (!r.ok) { throw new Error('export'); }
				return r.blob();
			}).then(function (blob) {
				var a = document.createElement('a');
				a.href = URL.createObjectURL(blob);
				a.download = 'leith-bass-my-data-' + L.today + '.json';
				document.body.appendChild(a); a.click(); a.remove();
				setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
				toast('Your data is downloading.');
			}).catch(function () {
				toast('That didn\'t download. Refresh the page and try again.');
			}).then(function () { ex.disabled = false; });
			return;
		}
		var del = e.target.closest('[data-delete-request]');
		if (del) {
			if (!window.confirm('Ask Jack to delete your portal account and everything in it? He\'ll confirm by email first, and can send you a copy of your data before he does.')) { return; }
			api({ action: 'data_request', kind: 'delete' }, { btn: del });
		}
	});

	/* =====================================================================
	 * The Shed: practice tools
	 * =================================================================== */
	var room = $('#mp-practice');
	var ui = { chooser: false, minutes: 20, when: 0, diaryAll: false, ex: null, addEx: false, editing: null, open: null, pushed: false, metPanel: '' };
	try { var wantTool = new URL(location.href).searchParams.get('tool'); if (wantTool && HIST) { ui.open = wantTool; } } catch (e) { /* fine */ }
	// Solo: one tool standing on a page of its own, for anyone. It is the tool and nothing round it.
	if (L.solo) { ui.open = L.solo; }
	var VIS = { shared: ['shared', 'Jack sees this'], 'private': ['private', 'Just for you'], choose: ['muted', 'You choose'], from: ['muted', 'From Jack'], send: ['muted', 'Private until you send'] };
	var ORDER = Object.keys(L.tools || {});
	var QUALITY = { clean: 'Clean', nearly: 'Nearly there', rough: 'Rough' };
	var EDIT_FIELDS = {
		diary: [['min', 'Minutes', 'number'], ['plan', 'Aimed to', 'text'], ['easier', 'What got easier?', 'text'], ['attention', 'What needs attention?', 'text'], ['next', 'Next time, start with', 'text'], ['note', 'Journal', 'textarea']],
		questions: [['q', 'Question', 'textarea']],
		songs: [['t', 'Song', 'text'], ['a', 'Artist', 'text']],
		goals: [['text', 'Goal', 'text'], ['by', 'By when', 'text']],
		listening: [['title', 'Track', 'text'], ['artist', 'Artist', 'text'], ['note', 'Why it\'s worth a listen', 'text']],
		tempo: [['name', 'Exercise', 'text'], ['target', 'Target bpm (optional)', 'number']]
	};

	function list(k) { return state[k] || []; }
	function visOf(tool) {
		var v = L.tools[tool][2];
		return v === 'choose' ? ((state.share || {})[tool] ? 'shared' : 'private') : v;
	}
	function isPrivateHere(tool) { return RO && visOf(tool) === 'private'; }
	function visPill(tool) { var v = visOf(tool); return '<span class="mp-pill ' + VIS[v][0] + '">' + VIS[v][1] + '</span>'; }
	function head(tool, right) {
		if (L.solo) { return ''; } // the page it stands on has the heading
		var title = tool === 'practice' ? 'Practising' : L.tools[tool][0];
		return '<div class="mp-tool-bar"><button type="button" class="mp-back" data-close>' + BACK + '<span>The Shed</span></button>' +
			'<h2 id="mp-h-' + tool + '" tabindex="-1">' + esc(title) + '</h2>' + (right != null ? right : (tool === 'practice' ? '<span></span>' : visPill(tool))) + '</div>';
	}
	function shareRow(tool, label) {
		if (RO) { return ''; }
		return '<label class="mp-share"><span>' + esc(label) + '</span><input class="mp-tgl" type="checkbox" data-share="' + tool + '"' + ((state.share || {})[tool] ? ' checked' : '') + '></label>';
	}
	function acts(module, item, opts) {
		opts = opts || {};
		if (RO || item.pending) { return item.pending ? '<span class="mp-pill muted">Waiting to sync</span>' : ''; }
		var key = module + ':' + item.id;
		return '<span class="mp-item-acts">' +
			(opts.noEdit ? '' : '<button type="button" class="mp-x" data-edit="' + esc(key) + '" aria-label="Edit ' + esc(opts.label || '') + '">Edit</button>') +
			'<button type="button" class="mp-x" data-remove="' + esc(key) + '" aria-label="Remove ' + esc(opts.label || '') + '">Remove</button></span>';
	}
	function editing(module, item) { return ui.editing && ui.editing.m === module && ui.editing.id === item.id; }
	function editForm(module, item) {
		var fields = EDIT_FIELDS[module];
		return '<form class="mp-edit" data-edit-form="' + module + '" data-id="' + esc(item.id) + '" novalidate>' + fields.map(function (f, i) {
			var id = 'mp-ed-' + module + '-' + f[0];
			var v = item[f[0]] == null ? '' : item[f[0]];
			if (f[0] === 'target' && !+v) { v = ''; }
			var input = f[2] === 'textarea' ?
				'<textarea id="' + id + '" data-k="' + f[0] + '" maxlength="1000">' + esc(v) + '</textarea>' :
				'<input id="' + id + '" data-k="' + f[0] + '" type="' + f[2] + '"' + (f[2] === 'number' ? ' inputmode="numeric" min="1" max="600"' : ' maxlength="300"') + ' value="' + esc(v) + '"' + (i === 0 ? ' data-first' : '') + '>';
			return '<div class="field"><label for="' + id + '">' + esc(f[1]) + '</label>' + input + '</div>';
		}).join('') + '<div class="mp-actions"><button class="mp-btn sm" type="submit">Save</button><button class="mp-link" type="button" data-edit-cancel>Cancel</button></div></form>';
	}
	function privateNote(text) { return '<p class="mp-note">' + esc(text || 'Kept private. Only they can see this.') + '</p>'; }

	/* ---- Diary ---- */
	function sinceEntries() { return list('diary').filter(function (e) { return !L.since || e.date > L.since; }); }
	function diaryStats() {
		var recent = sinceEntries(), days = {};
		recent.forEach(function (e) { days[e.date] = 1; });
		return { days: Object.keys(days).length, total: recent.reduce(function (a, e) { return a + (+e.min || 0); }, 0) };
	}
	/* A practice in progress: planned, timed, then reflected on. Kept on the
	 * device so it survives the screen locking or the page reloading. */
	var prac = store('lbs-prac');
	if (prac && prac.user !== USER) { prac = null; store('lbs-prac', null); }
	var pracTimer = null;
	var REPS = [['yes', 'Yes'], ['nearly', 'Nearly'], ['notyet', 'Not yet']];
	function pracSave() { store('lbs-prac', prac); }
	function pracElapsed() {
		if (!prac || !prac.started) { return 0; }
		var end = prac.pauseAt || Date.now();
		return Math.max(0, end - prac.started - (prac.paused || 0));
	}
	function clock(ms) { var s = Math.floor(ms / 1000), m = Math.floor(s / 60); return (m >= 60 ? Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0') : m) + ':' + String(s % 60).padStart(2, '0'); }
	function pracTick() {
		clearInterval(pracTimer); pracTimer = null;
		if (!prac || prac.stage !== 'run') { return; }
		pracTimer = setInterval(function () {
			var el = room && room.querySelector('[data-prac-time]');
			if (el) { el.textContent = clock(pracElapsed()); }
			var sg = room && room.querySelector('[data-prac-segs]');
			if (sg) { sg.innerHTML = pracSegs(); }
		}, 1000);
	}
	function lastNext() {
		var e = list('diary').filter(function (x) { return x.next; })[0];
		return e ? e.next : '';
	}
	function focusGroups() {
		var g = [];
		if ((L.objectives || []).length) { g.push([L.demo ? 'This week\'s objectives · an example from Jack\'s notes' : 'This week\'s objectives', L.objectives.slice(0, 6)]); }
		if ((L.revisit || []).length) { g.push(['Worth coming back to', L.revisit]); }
		var ex = list('tempo').map(function (x) { return x.name; }).slice(0, 6);
		if (ex.length && (state.tools || {}).tempo) { g.push(['Tempo exercises', ex]); }
		var songs = list('songs').filter(function (s) { return +s.s === 0; }).map(function (s) { return s.t; }).slice(0, 6);
		if (songs.length && (state.tools || {}).songs) { g.push(['Songs you\'re learning', songs]); }
		return g;
	}
	function chipsHtml(groups, chosen, name) {
		return groups.map(function (g, gi) {
			return '<div class="mp-prac-group"><span class="mp-lbl">' + esc(g[0]) + '</span><div class="mp-chips">' + g[1].map(function (t, i) {
				return '<label class="mp-chip" title="' + esc(t) + '"><input type="checkbox" data-' + name + '="' + esc(t) + '" data-f="' + name + gi + '-' + i + '"' + (chosen.indexOf(t) >= 0 ? ' checked' : '') + '><span>' + esc(t) + '</span></label>';
			}).join('') + '</div></div>';
		}).join('');
	}
	/* How long this practice is aiming for: the habit goal, else 20 minutes. */
	function pracAimMin() { var hb = habitData(); return Math.max(10, +hb.min || 20); }
	function pracSegs() {
		var n = 20, done = Math.min(n, Math.floor(pracElapsed() / 60000 / pracAimMin() * n));
		var out = '';
		for (var i = 0; i < n; i++) { out += '<i' + (i < done ? ' class="on"' : '') + '></i>'; }
		return out;
	}
	var TORN = '<svg class="mp-torn" viewBox="0 0 390 16" preserveAspectRatio="none" aria-hidden="true"><path d="M0 16V9l14-4 13 5 14-6 15 4 14-5 14 6 15-3 14 5 15-7 14 3 15-5 14 7 15-4 14 5 15-4 14-3 15 6 14-4 15 6 14-5 15-3 14 5 15-3 14 5 15-6 14 4 16-3v11z"/></svg>';
	function renderPracticeView() {
		if (!prac) { prac = { user: USER, stage: 'plan', focus: [], plan: '', first: null }; pracSave(); }
		var st = prac && prac.stage;
		var h = head('practice', st === 'run' ? '<button type="button" class="mp-sq-ico" data-prac="' + (prac.pauseAt ? 'resume' : 'pause') + '" aria-label="' + (prac.pauseAt ? 'Carry on' : 'Pause') + '">' + (prac.pauseAt ? '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 2l12 7-12 7z" fill="currentColor"/></svg>' : '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 2h4v14H3zM11 2h4v14h-4z" fill="currentColor"/></svg>') + '</button>' : null);
		if (!st) { return h + '<p class="mp-note">Nothing on the go.</p>'; }
		if (st === 'plan') {
			var groups = focusGroups();
			return h + '<form class="mp-practising" data-form="prac-plan" novalidate>' +
				'<p class="mp-kick">Before you start</p>' +
				(groups.length ? '<p class="mp-small" style="margin:0">What are you working on? Pick one or two.</p>' + chipsHtml(groups, prac.focus || [], 'pfocus') : '') +
				'<div class="field"><label for="mp-p-plan">By the end of this practice I want to…</label><input id="mp-p-plan" type="text" data-f="p-plan" maxlength="300" value="' + esc(prac.plan || '') + '" placeholder="e.g. Play the vamp in A three times clean at 84"><span class="hint">Something you\'ll know you\'ve done. Specific beats general.</span></div>' +
				'<div class="field"><label for="mp-p-first">Start with</label><input id="mp-p-first" type="text" data-f="p-first" maxlength="300" value="' + esc(prac.first != null ? prac.first : lastNext()) + '" placeholder="The first thing you\'ll play"></div>' +
				'<div class="mp-inst-go"><button class="mp-btn block big" type="submit">Start the timer</button><button type="button" class="mp-link" data-prac="cancel">Not now</button></div></form>';
		}
		if (st === 'run') {
			var paused = !!prac.pauseAt;
			var tempoEx = list('tempo').filter(function (x) { return (prac.focus || []).indexOf(x.name) >= 0; })[0];
			var clickAt = tempoEx ? (cleanNow(tempoEx.log || []) || metOpts.bpm) : metOpts.bpm;
			var tools = '';
			if ((state.tools || {}).metronome && met) { tools += '<button type="button" class="mp-quick" data-quick-met="' + clickAt + '">' + icon('metronome', 18) + '<span>Click at ' + clickAt + '</span></button>'; }
			if ((state.tools || {}).drone && drone) { tools += '<button type="button" class="mp-quick' + (droneState !== 'stopped' ? ' is-live' : '') + '" data-open="drone">' + icon('drone', 18) + '<span>' + (droneState !== 'stopped' ? 'Drone on ' : 'Drone, ') + window.LBSDrone.NOTE_NAMES[droneOpts.note] + '</span></button>'; }
			return h + '<div class="mp-practising">' +
				'<div class="mp-prac-clock2"><b class="mp-num" data-prac-time>' + clock(pracElapsed()) + '</b><span>' + (paused ? 'Paused' : 'aiming for') + '<br><b>' + pracAimMin() + ' minutes</b></span></div>' +
				'<div class="mp-prac-segs" data-prac-segs aria-hidden="true">' + pracSegs() + '</div>' +
				(prac.plan ? '<div class="mp-prac-aim"><span class="mp-kick">The aim</span><b>' + esc(prac.plan) + '</b></div>' : '') +
				(prac.first ? '<p class="mp-prac-line"><span class="mp-kick">Start with</span>' + esc(prac.first) + '</p>' : '') +
				((prac.focus || []).length ? '<div class="mp-chips-ro">' + prac.focus.map(function (f) { return '<span>' + esc(f) + '</span>'; }).join('') + '</div>' : '') +
				(tools ? '<div class="mp-quicks">' + tools + '</div>' : '') +
				'</div>' +
				'<div class="mp-paper">' + TORN + '<div class="mp-paper-body">' +
				'<div class="mp-paper-head"><label for="mp-p-jot">Journal</label><span>' + nice(L.today) + ' · kept on your phone as you go</span></div>' +
				'<textarea id="mp-p-jot" data-prac-jot rows="6" maxlength="4000" placeholder="Jot things down as you go: what you tried, what worked, what didn\'t.">' + esc(prac.jot || '') + '</textarea>' +
				'<div class="mp-paper-acts"><button type="button" class="mp-btn big" data-prac="finish">Finish</button><button type="button" class="mp-btn-ghost" data-prac="' + (paused ? 'resume' : 'pause') + '">' + (paused ? 'Carry on' : 'Pause') + '</button></div>' +
				'<p class="mp-paper-tip">Short breaks help. A few minutes on, a minute off, and switch between things rather than repeating one for ages. <button type="button" class="mp-link" data-prac="cancel">Discard this practice</button></p>' +
				'</div></div>';
		}
		// reflect
		var mins = Math.max(1, Math.round(pracElapsed() / 60000));
		return h + '<div class="mp-paper mp-paper-full">' + TORN + '<form class="mp-paper-body" data-form="prac-done" novalidate>' +
			'<div class="mp-paper-head"><span class="mp-paper-title">How did it go?</span><span class="mp-num">' + clock(pracElapsed()) + '</span></div>' +
			(prac.plan ? '<p class="mp-prac-line"><span class="mp-kick">You aimed to</span>' + esc(prac.plan) + '</p>' : '') +
			'<div class="field"><label for="mp-p-note">Journal</label><textarea id="mp-p-note" data-f="p-note" maxlength="4000" rows="5" placeholder="What you worked on, how it went, anything you noticed">' + esc(prac.jot || '') + '</textarea></div>' +
			pracTempoRows() +
			'<div class="mp-two"><div class="field"><label for="mp-p-min">Minutes</label><input id="mp-p-min" type="number" inputmode="numeric" min="1" max="600" data-f="p-min" value="' + mins + '"></div>' +
			'<div><span class="mp-lbl" id="mp-p-reps-l">Three times in a row without a slip?</span><div class="mp-seg mp-seg-wide" role="group" aria-labelledby="mp-p-reps-l">' + REPS.map(function (r) { return '<button type="button" data-reps="' + r[0] + '" aria-pressed="' + (prac.reps === r[0]) + '">' + r[1] + '</button>'; }).join('') + '</div></div></div>' +
			'<div class="mp-two"><div class="field"><label for="mp-p-easier">What got easier?</label><input id="mp-p-easier" type="text" data-f="p-easier" maxlength="500"></div>' +
			'<div class="field"><label for="mp-p-attention">What needs attention?</label><input id="mp-p-attention" type="text" data-f="p-attention" maxlength="500"></div></div>' +
			'<div class="field"><label for="mp-p-next">Next time, start with…</label><input id="mp-p-next" type="text" data-f="p-next" maxlength="300" placeholder="It\'ll be waiting for you next time"></div>' +
			'<div class="mp-paper-acts"><button class="mp-btn big" type="submit">Add to diary</button><button type="button" class="mp-btn-ghost" data-prac="back">Back to the timer</button></div></form></div>';
	}
	/* Tempo exercises picked as a focus can be logged in the same step. */
	function pracTempoRows() {
		if (!(state.tools || {}).tempo) { return ''; }
		var exs = list('tempo').filter(function (x) { return (prac.focus || []).indexOf(x.name) >= 0; });
		if (!exs.length) { return ''; }
		return '<div class="mp-prac-tempos"><span class="mp-lbl">Log a tempo (optional)</span>' + exs.map(function (x) {
			var nowT = cleanNow(x.log || []);
			return '<div class="mp-inline"><span class="mp-prac-ex">' + esc(x.name) + '</span><input type="number" inputmode="numeric" min="20" max="320" data-prac-bpm="' + esc(x.id) + '" data-f="pt-' + esc(x.id) + '" placeholder="' + (nowT ? 'Last clean ' + nowT : 'bpm') + '" aria-label="Tempo for ' + esc(x.name) + '">' +
				'<select data-prac-q="' + esc(x.id) + '" data-f="pq-' + esc(x.id) + '" aria-label="How it felt">' + Object.keys(QUALITY).map(function (k) { return '<option value="' + k + '">' + QUALITY[k] + '</option>'; }).join('') + '</select></div>';
		}).join('') + '</div>';
	}
	/* The day before a session (or the day of it): a look back at the week. */
	function renderLookBack() {
		if (RO || !L.nextDate || (L.nextDate !== L.today && L.nextDate !== addDays(L.today, 1))) { return ''; }
		if (store('lbs-lookback') === L.nextDate) { return ''; }
		var recent = sinceEntries(), st = diaryStats();
		var lines = [];
		recent.forEach(function (e) { if (e.attention) { lines.push(e.attention); } if (e.next && lines.indexOf(e.next) < 0) { lines.push(e.next); } });
		lines = lines.filter(function (x, i) { return lines.indexOf(x) === i; }).slice(0, 6);
		var qOn = (state.tools || {}).questions;
		return '<div class="mp-lookback"><div class="mp-row"><span class="kicker">' + (L.nextDate === L.today ? 'Session today' : 'Session tomorrow') + '</span><button type="button" class="mp-x" data-lookback-hide>Hide</button></div>' +
			'<p>' + (st.days ? 'Since ' + esc(L.sinceLabel) + ' you practised on <b>' + plural(st.days, 'day') + '</b> (' + fmtMin(st.total) + ').' : 'Nothing logged since ' + esc(L.sinceLabel) + '. That\'s fine: bring what you\'ve got.') + '</p>' +
			(lines.length ? '<p class="mp-small" style="margin:0">You noted these. Anything to ask Jack about?</p><div class="mp-chips">' + lines.map(function (l, i) { return '<label class="mp-chip"><input type="checkbox" data-lookq="' + esc(l) + '" data-f="lb' + i + '"><span>' + esc(l) + '</span></label>'; }).join('') + '</div>' +
				(qOn ? '<div><button type="button" class="mp-btn-ghost sm" data-lookback-send>Add the ticked ones to Questions</button></div>' : '') : '') +
			'</div>';
	}
	function renderDiary() {
		var h = head('diary');
		if (isPrivateHere('diary')) { return h + privateNote(); }
		var st = diaryStats(), diary = list('diary');
		var week = [];
		for (var i = 6; i >= 0; i--) {
			var ds = addDays(L.today, -i);
			week.push({ ds: ds, m: diary.filter(function (e) { return e.date === ds; }).reduce(function (a, e) { return a + (+e.min || 0); }, 0) });
		}
		var max = Math.max.apply(null, [60].concat(week.map(function (w) { return w.m; })));
		var tags = (L.objectives || []).slice(0, 6);
		var mins = [10, 15, 20, 30, 45, 60, 90];
		var shown = ui.diaryAll ? diary.slice(0, 40) : diary.slice(0, 3);
		h += renderLookBack();
		h += '<div class="mp-big"><b class="mp-num">' + st.days + '</b><span>' + (st.days === 1 ? 'day' : 'days') + ' practised ' + (L.since ? 'since ' + esc(L.sinceLabel) : 'so far') + (st.total ? ' · ' + fmtMin(st.total) : '') + '</span></div>';
		h += '<div class="mp-week" role="img" aria-label="Practice over the last seven days: ' + esc(week.map(function (w) { return (w.ds === L.today ? 'today' : DAY[d(w.ds).getDay()]) + ' ' + (w.m ? w.m + ' minutes' : 'none'); }).join(', ')) + '">' + week.map(function (w) {
			var t = w.ds === L.today;
			return '<div class="col' + (t ? ' is-today' : '') + (w.m ? ' did' : '') + '"><div class="bar-wrap"><span class="v">' + (w.m || '') + '</span><div class="bar' + (t ? ' today' : '') + '" style="height:' + Math.round((w.m / max) * 78) + 'px"></div></div><span class="dl">' + (t ? 'Today' : DAY[d(w.ds).getDay()]) + '</span></div>';
		}).join('') + '</div>';
		if (!RO) {
			var going = prac && prac.stage, nx = lastNext();
			h += '<div class="mp-diary-go">' + (nx && !going ? '<p class="mp-prac-next"><span class="mp-kick">Last time you said to start with</span>' + esc(nx) + '</p>' : '') +
				'<div class="mp-row" style="justify-content:flex-start;gap:1rem"><button type="button" class="mp-btn" data-open="practice">' + (going ? 'Carry on practising' : 'Start practising') + '</button>' +
				(going ? '' : '<button type="button" class="mp-link" data-prac="quick" aria-expanded="' + !!ui.quick + '">' + (ui.quick ? 'Close' : 'Log without the timer') + '</button>') + '</div></div>';
		}
		if (!RO && ui.quick && !(prac && prac.stage)) {
			h += '<form class="mp-diary-form" data-form="diary" novalidate>' +
				'<div class="mp-row" style="justify-content:flex-start"><span class="kicker">Log practice</span>' +
				'<select class="mp-inline-sel" data-when data-f="d-when" aria-label="When">' + ['Today', 'Yesterday', '2 days ago'].map(function (l, i) { return '<option value="' + i + '"' + (ui.when === i ? ' selected' : '') + '>' + l + '</option>'; }).join('') + '</select></div>' +
				'<div class="mp-row" style="justify-content:flex-start"><div class="mp-seg" role="group" aria-label="Minutes">' + mins.map(function (m) { return '<button type="button" data-min="' + m + '" aria-pressed="' + (ui.minutes === m) + '">' + m + '</button>'; }).join('') + '</div><span class="mp-small">minutes</span></div>' +
				(tags.length ? '<div class="mp-chips" role="group" aria-label="What you worked on">' + tags.map(function (t, i) { return '<label class="mp-chip" title="' + esc(t) + '"><input type="checkbox" data-tag="' + esc(t) + '" data-f="d-tag' + i + '"><span>' + esc(t) + '</span></label>'; }).join('') +
				'<label class="mp-chip"><input type="checkbox" data-tag="Something else" data-f="d-tagx"><span>Something else</span></label></div>' : '') +
				'<div class="field"><label for="mp-d-note">Journal</label><textarea id="mp-d-note" data-f="d-note" maxlength="4000" rows="4" placeholder="What you worked on, how it went, anything you noticed"></textarea></div>' +
				'<div class="mp-two"><div class="field"><label for="mp-d-easier">What got easier?</label><input id="mp-d-easier" type="text" data-f="d-easier" maxlength="500" placeholder="e.g. The shift in bar 3"></div>' +
				'<div class="field"><label for="mp-d-attention">What needs attention?</label><input id="mp-d-attention" type="text" data-f="d-attention" maxlength="500" placeholder="e.g. Keeping the fills in time"></div></div>' +
				'<div class="field"><label for="mp-d-next">Next time, start with… (optional)</label><input id="mp-d-next" type="text" data-f="d-next" maxlength="300"></div>' +
				'<div><button class="mp-btn sm" type="submit">Add to diary</button></div></form>';
		}
		h += '<div class="mp-entries">' + (shown.length ? shown.map(function (e) {
			if (editing('diary', e)) { return '<div class="mp-entry">' + editForm('diary', e) + '</div>'; }
			var lines = '';
			if (e.note) { lines += '<p class="mp-journal">' + esc(e.note).replace(/\n/g, '<br>') + '</p>'; }
			if (e.plan) { lines += '<p><span class="mp-lbl">Aimed to</span> ' + esc(e.plan) + (e.reps ? ' <span class="mp-pill ' + (e.reps === 'yes' ? 'shared' : 'muted') + '">' + { yes: 'Three clean', nearly: 'Nearly', notyet: 'Not yet' }[e.reps] + '</span>' : '') + '</p>'; }
			else if (e.reps) { lines += '<p><span class="mp-lbl">Three in a row</span> ' + { yes: 'Yes', nearly: 'Nearly', notyet: 'Not yet' }[e.reps] + '</p>'; }
			if (e.easier) { lines += '<p><span class="mp-lbl">Easier</span> ' + esc(e.easier) + '</p>'; }
			if (e.attention) { lines += '<p><span class="mp-lbl">Needs attention</span> ' + esc(e.attention) + '</p>'; }
			if (e.next) { lines += '<p><span class="mp-lbl">Next time</span> ' + esc(e.next) + '</p>'; }
			return '<div class="mp-entry"><div class="top"><b>' + (e.date === L.today ? 'Today' : nice(e.date)) + '</b><span class="mp-num">' + esc(e.min) + ' min' + (e.timed ? ' ⏱' : '') + '</span><span>' + esc((e.tags || []).join(' · ')) + '</span>' + acts('diary', e, { label: nice(e.date) + ' entry' }) + '</div>' + lines + '</div>';
		}).join('') : '<p class="mp-note">Nothing logged yet. Ten minutes counts.</p>') + '</div>';
		if (diary.length > 3) { h += '<div><button type="button" class="mp-link" data-diary-all aria-expanded="' + ui.diaryAll + '">' + (ui.diaryAll ? 'Show fewer' : 'Show more entries') + '</button></div>'; }
		h += shareRow('diary', 'Share my diary with Jack');
		return h;
	}

	/* ---- Habit tracker ---- */
	var WEEKDAYS = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']];
	function habitData() { return Object.assign({ days: 0, min: 0, by: '', rest: [], pause: null }, state.habit || {}); }
	function dayMinutes() {
		var h = habitData();
		if (RO && h.log && !list('diary').length) { return h.log; }
		var m = {};
		list('diary').forEach(function (e) { m[e.date] = (m[e.date] || 0) + (+e.min || 0); });
		return m;
	}
	function mondayOf(s) { var x = d(s), dow = (x.getDay() + 6) % 7; return addDays(s, -dow); }
	/* Mirrors lbs_habit_stats() in practice.php. */
	function habitStats(h, days, today) {
		var goal = Math.max(1, +h.min || 0), weekGoal = Math.max(1, Math.min(7, +h.days || 0));
		var rest = (h.rest || []).map(Number), pause = h.pause;
		var keys = Object.keys(days).sort();
		var first = keys.length && keys[0] < today ? keys[0] : today;
		function kind(ds) {
			if ((days[ds] || 0) >= goal) { return 'done'; }
			if (pause && ds >= pause.from && ds <= pause.to) { return 'skip'; }
			if (rest.indexOf(d(ds).getDay()) >= 0) { return 'skip'; }
			return 'miss';
		}
		var chain = 0, best = 0, missed = 0;
		for (var ds = first; ds <= today; ds = addDays(ds, 1)) {
			var k = kind(ds);
			if (k === 'done') { chain++; missed = 0; best = Math.max(best, chain); }
			else if (k === 'miss' && ds !== today) { missed++; if (missed >= 2) { chain = 0; } }
		}
		var monday = mondayOf(today);
		function count(mon) { var n = 0; for (var i = 0; i < 7; i++) { if (kind(addDays(mon, i)) === 'done') { n++; } } return n; }
		var thisWeek = count(monday), run = 0, bestW = 0;
		for (var w = mondayOf(first); w < monday; w = addDays(w, 7)) {
			var paused = pause && w >= pause.from && addDays(w, 6) <= pause.to;
			if (count(w) >= weekGoal) { run++; bestW = Math.max(bestW, run); } else if (!paused) { run = 0; }
		}
		var weeks = run + (thisWeek >= weekGoal ? 1 : 0);
		return { chain: chain, best: best, weeks: weeks, bestWeeks: Math.max(bestW, weeks), thisWeek: thisWeek, goalDays: weekGoal, goalMin: +h.min, kind: kind, missedYesterday: kind(addDays(today, -1)) === 'miss' };
	}
	function renderHabit() {
		var h = head('habit');
		var hb = habitData();
		if (hb.private) { return h + privateNote(); }
		var goalSet = +hb.days > 0 && +hb.min > 0;
		var pausedNow = hb.pause && L.today >= hb.pause.from && L.today <= hb.pause.to;
		if (goalSet) {
			var days = dayMinutes(), s = habitStats(hb, days, L.today);
			var todayMin = days[L.today] || 0;
			var msg;
			if (pausedNow) { msg = 'On a break until ' + nice(hb.pause.to) + '. The chain is waiting for you.'; }
			else if (todayMin >= hb.min) { msg = 'Today\'s in. ' + (s.thisWeek >= s.goalDays ? 'This week\'s goal is met too.' : plural(s.goalDays - s.thisWeek, 'more day') + ' this week meets the goal.'); }
			else if (s.missedYesterday && s.chain) { msg = 'Yesterday slipped by. Practise today and the chain holds.'; }
			else if (!s.chain) { msg = 'Start a new chain today: ' + hb.min + ' minutes is enough.'; }
			else { msg = (todayMin ? (hb.min - todayMin) + ' more minutes today' : hb.min + ' minutes today') + ' keeps the chain going.'; }
			// A milestone gets its moment, like a page title on the site.
			var MILES = { 7: 'Seven days', 14: 'A fortnight', 21: 'Three weeks', 30: 'Thirty days', 50: 'Fifty days', 100: 'A hundred days', 200: 'Two hundred days', 365: 'A whole year' };
			if (MILES[s.chain] && todayMin >= hb.min) { h += '<p class="mp-milestone"><span class="mp-knock">' + MILES[s.chain] + '</span></p>'; }
			var toNext = [7, 14, 21, 30, 50, 100, 200, 365].filter(function (m) { return m > s.chain; })[0];
			h += '<div class="mp-chain"><b class="mp-num">' + s.chain + '</b><span class="t">Day<br>chain</span><span class="s">Best ' + s.best + ' · ' + plural(s.weeks, 'week') + ' in a row</span></div>';
			h += '<p class="mp-habit-msg">' + esc(msg) + (toNext && !pausedNow ? ' <span>' + (toNext - s.chain === 1 ? 'Tomorrow makes ' : plural(toNext - s.chain, 'more day') + ' to ') + MILES[toNext].toLowerCase() + '.</span>' : '') + '</p>';
			// This week as faders against the day's goal.
			var mon = mondayOf(L.today), top = Math.max(hb.min * 2.4, 30), faders = '';
			for (var wd = 0; wd < 7; wd++) {
				var dsw = addDays(mon, wd), mm = days[dsw] || 0, kd = dsw > L.today ? 'future' : s.kind(dsw);
				faders += '<div class="mp-fader' + (dsw === L.today ? ' today' : '') + ' k-' + kd + (mm ? '' : ' none') + '"><span class="track"><i class="cap" style="bottom:' + Math.min(92, Math.round(mm / top * 92)) + '%"></i></span><b>' + DAY[d(dsw).getDay()].charAt(0) + '</b></div>';
			}
			h += '<div class="mp-week-head"><h3>This week</h3><span class="mp-small">' + s.thisWeek + ' of ' + s.goalDays + ' days · ' + hb.min + ' min a day</span></div>' +
				'<div class="mp-faders" role="img" aria-label="' + esc('This week: ' + s.thisWeek + ' of ' + s.goalDays + ' days met the goal') + '" style="--goal-n:' + (Math.round(hb.min / top * 92) / 100) + '"><span class="goal"><em>' + hb.min + ' min</em></span>' + faders + '</div>';
			// The last eight weeks, a cross for every day that counted.
			var start = addDays(mondayOf(L.today), -49), cells = '', said = [];
			var firstDay = Object.keys(days).sort()[0] || L.today;
			for (var i = 0; i < 56; i++) {
				var ds = addDays(start, i), k = ds > L.today || ds < firstDay ? 'future' : s.kind(ds);
				if (k === 'done') { said.push(ds); }
				cells += '<span class="hc-' + k + (ds === L.today ? ' hc-today' : '') + '" title="' + esc(nice(ds) + (days[ds] ? ', ' + days[ds] + ' min' : '')) + '">' + (k === 'done' ? '×' : '') + '</span>';
			}
			h += '<div class="mp-week-head"><h3>Eight weeks</h3><span class="mp-small">One miss is fine. Two in a row ends a chain.</span></div>' +
				'<div class="mp-poster" role="img" aria-label="' + esc('Last eight weeks: ' + said.length + ' days met the goal.') + '">' + cells + '</div>';
			if ((hb.slots || []).length) { h += '<div class="mp-slots-row"><span class="mp-lbl">Your practice times · in your calendar</span><div>' + hb.slots.map(function (sl) { return '<span>' + WEEKDAYS.filter(function (w) { return w[0] === sl.day; })[0][1] + ' ' + esc(sl.time) + ' · ' + sl.min + ' min</span>'; }).join('') + '</div></div>'; }
			h += '<p class="mp-small mp-habit-goal">Goal: ' + plural(+hb.days, 'day') + ' a week, ' + hb.min + ' minutes a day' + (hb.by === 'jack' ? ', agreed with Jack' : hb.by === 'member' ? ', set by you' : '') + '. Missing one day won\'t break the chain; two in a row will.' + ((hb.rest || []).length ? ' Rest days: ' + WEEKDAYS.filter(function (w) { return hb.rest.indexOf(w[0]) >= 0; }).map(function (w) { return w[1]; }).join(', ') + '.' : '') + '</p>';
		} else {
			h += '<p class="mp-note">' + (RO ? 'No goal set yet. Set one on their member page.' : 'No goal yet. Agree one with Jack at your next session, or set your own below. Small and regular beats big and rare.') + '</p>';
		}
		if (!RO) {
			var g = ui.habitDraft || { days: +hb.days || 4, min: +hb.min || 15 };
			h += '<details data-f-open="habit-set"' + (goalSet ? '' : ' open') + '><summary>Goal, rest days and breaks</summary><div class="mp-met-opts">' +
				'<div><span class="mp-lbl">Days a week</span><div class="mp-seg mp-seg-wide" role="group" aria-label="Days a week">' + [1, 2, 3, 4, 5, 6, 7].map(function (n) { return '<button type="button" data-hg-days="' + n + '" aria-pressed="' + (g.days === n) + '">' + n + '</button>'; }).join('') + '</div></div>' +
				'<div><span class="mp-lbl">Minutes a day</span><div class="mp-seg mp-seg-wide" role="group" aria-label="Minutes a day">' + [5, 10, 15, 20, 30, 45, 60].map(function (n) { return '<button type="button" data-hg-min="' + n + '" aria-pressed="' + (g.min === n) + '">' + n + '</button>'; }).join('') + '</div></div>' +
				'<div><button type="button" class="mp-btn sm" data-hg-save' + (goalSet && g.days === +hb.days && g.min === +hb.min ? ' disabled' : '') + '>' + (goalSet ? 'Change goal' : 'Set goal') + '</button></div>' +
				'<div><span class="mp-lbl">Rest days (they never break the chain)</span><div class="mp-seg mp-seg-wide" role="group" aria-label="Rest days">' + WEEKDAYS.map(function (w) { return '<button type="button" data-hg-rest="' + w[0] + '" aria-pressed="' + ((hb.rest || []).indexOf(w[0]) >= 0) + '">' + w[1] + '</button>'; }).join('') + '</div></div>' +
				'<div><span class="mp-lbl">When will you practise?</span><p class="mp-small" style="margin:0 0 .4rem">Deciding the day and time in advance makes it far more likely to happen. They go into your calendar feed too (Bookings → Add to your calendar).</p>' +
				((hb.slots || []).length ? '<ul class="mp-list mp-slots">' + hb.slots.map(function (sl, i) { return '<li><span><b>' + WEEKDAYS.filter(function (w) { return w[0] === sl.day; })[0][1] + ' ' + esc(sl.time) + '</b><small>' + sl.min + ' minutes</small></span><button type="button" class="mp-x" data-hg-slot-del="' + i + '">Remove</button></li>'; }).join('') + '</ul>' : '') +
				((hb.slots || []).length < 7 ? '<div class="mp-inline"><select data-hg-slot-day data-f="hs-day" aria-label="Day">' + WEEKDAYS.map(function (w) { return '<option value="' + w[0] + '">' + w[1] + '</option>'; }).join('') + '</select><input type="time" data-hg-slot-time data-f="hs-time" value="18:00" aria-label="Time" step="300"><select data-hg-slot-min data-f="hs-min" aria-label="Minutes">' + [10, 15, 20, 30, 45, 60].map(function (m) { return '<option value="' + m + '"' + (m === (+hb.min || 20) ? ' selected' : '') + '>' + m + ' min</option>'; }).join('') + '</select><button type="button" class="mp-btn-ghost sm" data-hg-slot-add>Add</button></div>' : '') +
				((hb.slots || []).length ? '<label class="mp-check-row mp-small" style="margin-top:.4rem"><input type="checkbox" data-hg-slotcal' + (hb.slots_cal !== false ? ' checked' : '') + '> Show them in my calendar feed</label>' : '') + '</div>' +
				(hb.pause && hb.pause.to >= L.today ?
					'<p class="mp-small" style="margin:0">' + (pausedNow ? 'On a break' : 'A break is booked') + ' from ' + nice(hb.pause.from) + ' to ' + nice(hb.pause.to) + '. <button type="button" class="mp-link" data-hg-unpause>End the break</button></p>' :
					'<div><span class="mp-lbl">Going away? Pause the tracker</span><div class="mp-inline"><input type="date" data-hg-from data-f="hg-from" aria-label="Break starts" value="' + L.today + '" min="' + L.today + '"><input type="date" data-hg-to data-f="hg-to" aria-label="Break ends" min="' + L.today + '"><button type="button" class="mp-btn-ghost sm" data-hg-pause>Pause</button></div></div>') +
				'</div></details>';
			h += shareRow('habit', 'Share my habit tracker with Jack');
		}
		return h;
	}

	/* ---- Questions ---- */
	function renderQuestions() {
		var qs = list('questions');
		var open = qs.filter(function (q) { return !q.answered; });
		var done = qs.filter(function (q) { return q.answered; }).reverse();
		var h = head('questions');
		h += '<p class="mp-note">' + (L.next ? 'Jack reads these before your next session, ' + esc(L.next) + '.' : 'Jack reads these before your next session.') + '</p>';
		h += '<ul class="mp-list">' + (open.length ? open.map(function (q) {
			if (editing('questions', q)) { return '<li class="wide">' + editForm('questions', q) + '</li>'; }
			return '<li><span>' + esc(q.q) + '<small>Added ' + (q.added === L.today ? 'today' : nice(q.added)) + '</small></span>' + acts('questions', q, { label: 'question' }) + '</li>';
		}).join('') : '<li><span class="mp-note">Nothing yet. Add anything you want to ask.</span></li>') + '</ul>';
		if (!RO) { h += '<form class="mp-inline" data-form="q" novalidate><input type="text" data-q data-f="q-new" placeholder="Something to ask Jack" aria-label="New question" maxlength="500"><button class="mp-btn sm" type="submit">Add</button></form>'; }
		if (done.length) {
			h += '<details data-f-open="q-done"><summary>Answered (' + done.length + ')</summary><ul class="mp-list" style="margin-top:.5rem">' + done.slice(0, 20).map(function (q) {
				return '<li><span class="ans">' + esc(q.q) + '<small>' + esc(q.answer_label || 'Answered') + '</small></span>' + acts('questions', q, { noEdit: true, label: 'question' }) + '</li>';
			}).join('') + '</ul></details>';
		}
		return h;
	}

	/* ---- Tempo ---- */
	function cleanNow(log) {
		for (var i = log.length - 1; i >= 0; i--) { if (!log[i][2] || log[i][2] === 'clean') { return log[i][1]; } }
		return 0;
	}
	function spark(ex) {
		var log = ex.log || [];
		if (log.length < 2) {
			return '<p class="mp-note">' + (log.length ? 'One tempo logged. Log another on a different day to see the line.' : 'Log the tempo you can play it at, and how it felt, and it\'ll chart here.') + '</p>';
		}
		var W = 320, H = 124, Lp = 30, R = 12, T = 12, B = 22;
		var vals = log.map(function (x) { return x[1]; });
		if (ex.target) { vals.push(ex.target); }
		var lo = Math.floor((Math.min.apply(null, vals) - 6) / 10) * 10;
		var hi = Math.ceil((Math.max.apply(null, vals) + 4) / 10) * 10;
		if (hi - lo < 20) { hi = lo + 20; }
		var n = log.length;
		// Evenly spaced by entry, so several logs on one day stay readable.
		var x = function (i) { return Lp + (n === 1 ? 0 : i / (n - 1)) * (W - Lp - R); };
		var y = function (v) { return T + (1 - (v - lo) / (hi - lo)) * (H - T - B); };
		var clean = [];
		log.forEach(function (p, i) { if (!p[2] || p[2] === 'clean') { clean.push([x(i), y(p[1])]); } });
		var line = clean.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
		var step = (hi - lo) > 40 ? 20 : 10, ticks = [];
		for (var v = lo; v <= hi; v += step) { ticks.push(v); }
		var fd = function (s) { var q = d(s); return q.getDate() + ' ' + MON[q.getMonth()]; };
		var font = 'font-size="11" font-family="Inter, Helvetica, sans-serif"';
		var svg = ticks.map(function (v) {
			return '<line x1="' + Lp + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="var(--rule)" stroke-width="1"/><text x="' + (Lp - 6) + '" y="' + (y(v) + 3.5) + '" text-anchor="end" ' + font + ' fill="var(--dust)">' + v + '</text>';
		}).join('');
		if (ex.target) {
			svg += '<line x1="' + Lp + '" x2="' + (W - R) + '" y1="' + y(ex.target) + '" y2="' + y(ex.target) + '" stroke="var(--orange)" stroke-width="1.5" stroke-dasharray="4 4"/>' +
				'<text x="' + (W - R) + '" y="' + (y(ex.target) - 5) + '" text-anchor="end" ' + font + ' font-weight="600" fill="var(--orange-ink)">TARGET ' + ex.target + '</text>';
		}
		if (clean.length > 1) { svg += '<path d="' + line + '" fill="none" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"/>'; }
		svg += log.map(function (p, i) {
			var ok = !p[2] || p[2] === 'clean', last = i === n - 1;
			return '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p[1]).toFixed(1) + '" r="' + (last ? 4.5 : 3) + '" fill="' + (ok ? (last ? 'var(--orange)' : 'var(--ink)') : 'var(--surface)') + '" stroke="' + (last ? 'var(--orange)' : 'var(--ink)') + '" stroke-width="1.5"/>';
		}).join('');
		svg += '<text x="' + Lp + '" y="' + (H - 5) + '" ' + font + ' fill="var(--dust)">' + fd(log[0][0]) + '</text><text x="' + (W - R) + '" y="' + (H - 5) + '" text-anchor="end" ' + font + ' fill="var(--dust)">' + fd(log[n - 1][0]) + '</text>';
		var desc = log.slice(-6).map(function (p) { return fd(p[0]) + ' ' + p[1] + ' bpm ' + (QUALITY[p[2] || 'clean'] || '').toLowerCase(); }).join(', ');
		return '<svg class="mp-spark" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Tempo log for ' + esc(ex.name) + ': ' + esc(desc) + '">' + svg + '</svg>' +
			'<p class="mp-legend"><span class="c">Clean</span><span class="o">Nearly there or rough</span></p>';
	}
	function renderTempo() {
		var h = head('tempo');
		if (isPrivateHere('tempo')) { return h + privateNote(); }
		var exs = list('tempo');
		if (!exs.some(function (e) { return e.id === ui.ex; })) { ui.ex = exs.length ? exs[0].id : null; }
		var ex = exs.filter(function (e) { return e.id === ui.ex; })[0];
		if (ex) {
			var log = ex.log || [], now = cleanNow(log);
			h += '<div class="field"><label for="mp-tempo-ex">Exercise</label><select id="mp-tempo-ex" data-ex data-f="t-ex">' + exs.map(function (e) { return '<option value="' + esc(e.id) + '"' + (e.id === ui.ex ? ' selected' : '') + '>' + esc(e.name) + '</option>'; }).join('') + '</select></div>';
			if (ex.example && L.demo) { h += '<p class="mp-demo-ex"><b>Example</b> A few weeks of logged tempos. Yours fill in as you log them.</p>'; }
			if (editing('tempo', ex)) {
				h += editForm('tempo', ex);
			} else {
				h += '<div class="mp-tempo-now"><div><b class="mp-num">' + (now || '–') + '</b><span>Clean now</span></div><div><b class="mp-num">' + (log.length ? log[0][1] : '–') + '</b><span>Started</span></div><div><b class="mp-num">' + (ex.target || '–') + '</b><span>Target</span></div></div>';
				h += spark(ex);
				if (!RO && (state.tools || {}).metronome && met) {
					var practiseAt = now || (log.length ? log[log.length - 1][1] : 0) || ex.target || 80;
					h += '<div><button type="button" class="mp-btn-ghost sm" data-met-practise="' + practiseAt + '">Practise at ' + practiseAt + ' bpm with the metronome</button></div>';
				}
				if (!RO) {
					h += '<form class="mp-inline" data-form="tempo" novalidate><input type="number" inputmode="numeric" min="20" max="320" data-bpm data-f="t-bpm" placeholder="Tempo (bpm)" aria-label="Tempo you played at">' +
						'<select data-quality data-f="t-quality" aria-label="How it felt">' + Object.keys(QUALITY).map(function (k) { return '<option value="' + k + '">' + QUALITY[k] + '</option>'; }).join('') + '</select>' +
						'<button class="mp-btn sm" type="submit">Log</button></form>';
					h += '<p class="mp-note">Dropping the tempo to play it cleaner counts as progress too.</p>';
					h += '<div class="mp-row"><span class="mp-item-acts">' + (log.length ? '<button type="button" class="mp-x" data-tempo-unlog>Undo last entry</button>' : '') + acts('tempo', ex, { label: ex.name }) + '</span><button type="button" class="mp-link" data-add-ex aria-expanded="' + ui.addEx + '">' + (ui.addEx ? 'Close' : 'Add an exercise') + '</button></div>';
				}
			}
		} else {
			h += '<p class="mp-note">' + (RO ? 'No exercises yet.' : 'Add the exercises you\'re working on, like a groove or a scale, and log the tempo you can play each one at.') + '</p>';
			ui.addEx = true;
		}
		if (ui.addEx && !RO) {
			h += '<form class="mp-inline" data-form="tempo_ex" novalidate><input type="text" data-ex-name data-f="t-name" placeholder="Exercise, e.g. Groove 3" aria-label="Exercise name" maxlength="80"><input type="number" data-ex-target data-f="t-target" min="20" max="320" placeholder="Target bpm" aria-label="Target tempo (optional)" style="flex:0 1 8rem"><button class="mp-btn sm" type="submit">Add</button></form>';
		}
		h += shareRow('tempo', 'Share my tempos with Jack');
		return h;
	}

	/* ---- Metronome ---- */
	/*
	 * The engine is shed-metronome.js. This is its face: the tempo, the beats of the bar, the three
	 * functions Jack named (Random mute, Gradual mute, Click up), setups, and five panels for the rest.
	 * What is saved (metOpts) is what the screen shows; engineOpts() turns it into what the engine takes.
	 */
	var MET = window.LBSMetronome || null;
	if (MET && L.he) { MET.setup({ base: L.he, version: L.ver || '' }); }
	var met = MET ? MET.create() : null;
	var METERS = [
		['2/4', 'simple'], ['3/4', 'simple'], ['4/4', 'simple'], ['5/4', 'simple'], ['6/4', 'simple'], ['7/4', 'simple'], ['2/2', 'simple', 'Cut time'],
		['6/8', 'compound'], ['9/8', 'compound'], ['12/8', 'compound'],
		['5/8:2+3', 'odd'], ['5/8:3+2', 'odd'], ['7/8:2+2+3', 'odd'], ['7/8:3+2+2', 'odd'], ['7/8:2+3+2', 'odd'], ['9/8:2+2+2+3', 'odd'], ['11/8:2+2+3+2+2', 'odd']
	];
	var SUBS = {
		simple: [[1, 'Beats'], [2, 'Eighths'], [3, 'Triplets'], [4, 'Sixteenths'], [5, 'Fives'], [6, 'Sixes']],
		compound: [[1, 'Beats'], [3, 'Eighths'], [6, 'Sixteenths']],
		odd: [[1, 'Groups'], [2, 'Every eighth']]
	};
	var MET_EVERY = [[1, 'Every bar'], [2, 'Every 2'], [3, 'Every 3'], [4, 'Every 4']];
	var MET_WHERE = {
		simple: [['on', 'On it'], ['e', 'The “e”'], ['and', 'The “and”'], ['a', 'The “a”'], ['mid', 'Triplet, middle'], ['last', 'Triplet, last']],
		compound: [['on', 'On it'], ['mid', 'Second eighth'], ['last', 'Third eighth']],
		odd: [['on', 'On it']]
	};
	var MET_GAPS = [['0', 'Off'], ['1-1', '1 on, 1 off'], ['2-2', '2 on, 2 off'], ['4-4', '4 on, 4 off']];
	var LEVEL_NAME = { accent: 'accent', normal: 'normal', soft: 'soft', mute: 'silent' };
	var MET_FN = { random: 'Random mute', gradual: 'Gradual mute', up: 'Click up' };
	// Somewhere to start from. A starter leaves the tempo, the sound and the volumes as they are.
	var MET_STARTERS = [
		['Plain click', {}],
		['2 and 4', { which: 'backbeat' }],
		['Bar on, bar off', { gap: '1-1' }],
		['Fade the click', { gradual: { on: true, to: 75, over: 32, keepOne: false, bars: false } }],
		['Build speed', { up: { on: true, by: 4, every: 4, stopAt: '', ladder: true } }],
		['Swing, brushes', { which: 'backbeat', groove: { kind: 'feel', feel: 'Swing', groove: 0, kit: 'brushes', name: 'Swing' } }]
	];
	var metOpts = MET ? MET.upgrade(store('lbs-met')) : {};
	var metUi = { tap: {}, last: 0, startedAt: 0, beat: -1, fn: '', typing: false, now: 0, reached: 0, played: '', warm: false, he: false };
	var metLean = !!((navigator.connection || {}).saveData);

	function meterInfo(key) {
		var row = METERS.filter(function (x) { return x[0] === key; })[0] || METERS[2];
		var parts = row[0].split(':'), md = parts[0].split('/').map(Number);
		return { key: row[0], kind: row[1], meter: md, groups: parts[1] ? parts[1].split('+').map(Number) : null, label: row[2] || (parts[0] + (parts[1] ? ' (' + parts[1] + ')' : '')) };
	}
	function unitName(mi) {
		if (mi.kind === 'compound') { return 'dotted quarters'; }
		if (mi.kind === 'odd') { return 'eighth notes'; }
		return mi.meter[1] === 2 ? 'half notes' : 'quarter notes';
	}
	function shelfLoops() { return (shelf.data && shelf.data.grooves) || []; }
	function hasKit() { return !!(shelf.data && shelf.data.kit && Object.keys(shelf.data.kit).length); }
	function heKit() { return window.HE && window.HE.kit ? window.HE.kit : null; }
	function metWhere(mi) { return MET_WHERE[mi.kind].some(function (w) { return w[0] === metOpts.where; }) ? metOpts.where : 'on'; }
	/* The engine's settings, from what's saved. */
	function engineOpts() {
		var o = metOpts, mi = meterInfo(o.meter), g = null;
		var subs = SUBS[mi.kind].map(function (s) { return s[0]; });
		var gap = o.gap && o.gap !== '0' ? o.gap.split('-').map(Number) : null;
		if (o.groove && o.groove.kind === 'loop') {
			// Loop links are refreshed from the Shelf, so an old saved link still works.
			var fresh = shelfLoops().filter(function (x) { return x.title === o.groove.title && x.style === o.groove.style; })[0];
			if (fresh) { g = { kind: 'loop', url: fresh.url, bpm: fresh.bpm, meter: fresh.meter, bars: fresh.bars, title: fresh.title }; }
		} else if (o.groove && o.groove.kind === 'feel') {
			g = { kind: 'feel', feel: o.groove.feel, groove: +o.groove.groove || 0, kit: o.groove.kit || 'studio' };
		} else if (o.groove && MET.GROOVES[o.groove.id]) {
			g = o.groove.kit === 'kyle' && hasKit() ? { kind: 'kit', id: o.groove.id } : { kind: 'pattern', id: o.groove.id, kit: !o.groove.kit || o.groove.kit === 'kyle' ? 'studio' : o.groove.kit };
		}
		var r = o.random, gr = o.gradual, up = o.up;
		return {
			bpm: o.bpm, meter: mi.meter, groups: mi.groups, sub: subs.indexOf(+o.sub) >= 0 ? +o.sub : 1,
			swing: mi.kind === 'simple' && (+o.sub === 2 || +o.sub === 4) ? +o.swing : 0,
			accents: o.accents, sound: o.sound, vol: o.vol, which: o.which, every: +o.every, where: metWhere(mi),
			gap: gap ? { on: gap[0], off: gap[1] } : null,
			mute: r.on ? { kind: 'random', share: +r.share, keepOne: !!r.keepOne, wholeBars: !!r.bars } : gr.on ? { kind: 'gradual', to: +gr.to, over: +gr.over, keepOne: !!gr.keepOne, wholeBars: !!gr.bars } : null,
			clickUp: up.on && +up.by ? { by: +up.by, every: +up.every, stopAt: up.stopAt === '' ? null : +up.stopAt, ladder: !!up.ladder } : null,
			countIn: o.countIn, groove: g, offsetMs: +o.offsetMs
		};
	}
	function metStore() { store('lbs-met', metOpts); }
	function metSave(patch, redraw) {
		var meterBefore = metOpts.meter, accBefore = metOpts.accents;
		Object.assign(metOpts, patch || {});
		// A written pattern brings its own time signature with it, and the house drummer plays in 4/4.
		var pg = patch && patch.groove;
		if (pg && pg.kind === 'feel') { metOpts.meter = '4/4'; }
		if (pg && pg.id && MET && MET.GROOVES[pg.id]) {
			var gp = MET.GROOVES[pg.id];
			metOpts.meter = gp.meter.join('/') + (gp.groups ? ':' + gp.groups.join('+') : '');
		}
		if (pg && pg.kind === 'loop' && pg.meter && meterInfo(pg.meter).key === pg.meter) { metOpts.meter = pg.meter; }
		if (metOpts.meter !== meterBefore) {
			metOpts.accents = null;
			var sb = SUBS[meterInfo(metOpts.meter).kind].map(function (s) { return s[0]; });
			if (sb.indexOf(+metOpts.sub) < 0) { metOpts.sub = 1; }
		} else if (!(patch && patch.accents)) { metOpts.accents = accBefore; }
		metStore();
		if (met) {
			if (engineOpts().groove && engineOpts().groove.kind === 'kit') { met.kitUrls = shelf.data.kit; }
			met.set(engineOpts());
			if (!metOpts.accents) { metOpts.accents = met.opts.accents.slice(); metStore(); }
			// whatever the new settings need (a kit, the recorded clicks) is fetched now, so it is there by Start
			if (!metLean && ui.open === 'metronome') { met.prepare(); }
		}
		metUi.played = '';
		if (redraw !== false) { renderModule('metronome'); }
	}
	function metNowBpm() { return met && met.running ? met.currentBpm() : metOpts.bpm; }
	function marking(bpm) {
		return bpm < 40 ? 'Grave' : bpm < 60 ? 'Largo' : bpm < 66 ? 'Larghetto' : bpm < 76 ? 'Adagio' : bpm < 108 ? 'Andante' : bpm < 120 ? 'Moderato' : bpm < 168 ? 'Allegro' : bpm < 200 ? 'Presto' : 'Prestissimo';
	}
	/* "2 and 4" in four; in other time signatures, the even beats by number. */
	function backbeatName(n) {
		var ev = [];
		for (var i = 2; i <= n; i += 2) { ev.push(i); }
		return ev.length < 2 ? 'Beat 2' : ev.slice(0, -1).join(', ') + ' and ' + ev[ev.length - 1];
	}
	function whichName(n) {
		var o = metOpts;
		return o.which === 'backbeat' ? backbeatName(n) : o.which === 'one' ? (+o.every > 1 ? 'Beat one, every ' + o.every + ' bars' : 'Beat one') : 'Every beat';
	}
	function whereName(mi) {
		var w = metWhere(mi);
		return w === 'on' ? 'on the beat' : 'on ' + MET_WHERE[mi.kind].filter(function (x) { return x[0] === w; })[0][1].replace(/^The /, 'the ').replace(/^(Triplet|Second|Third)/, function (x) { return 'the ' + x.toLowerCase(); });
	}
	/* A word or two for the tile on the Shed's front page and the dock. */
	function clickLabel() {
		var o = metOpts;
		return o.up.on ? 'Click up' : o.random.on ? 'Random mute' : o.gradual.on ? 'Gradual mute' : o.groove ? 'with drums' : o.which === 'all' && o.where === 'on' ? 'every beat' : whichName(meterInfo(o.meter).meter[0]).toLowerCase();
	}
	/* The line under the beats when it is stopped: what the click will do. */
	function metStatus() {
		var o = metOpts, mi = meterInfo(o.meter), n = met ? met.opts.beats.length : 4, bits = [];
		if (metUi.played) { return metUi.played; }
		if (o.which !== 'all' || metWhere(mi) !== 'on') { bits.push(whichName(n) + ', ' + whereName(mi)); }
		if (o.gap !== '0') { bits.push(o.gap.replace('-', ' on, ') + ' off'); }
		return bits.length ? bits.join(' · ') : unitName(mi).replace(/^./, function (c) { return c.toUpperCase(); }) + ' at ' + o.bpm + ' bpm';
	}
	/* What each of the three functions is set to, in a line. */
	function metFnLine(key) {
		var o = metOpts, r = o.random, g = o.gradual, u = o.up, by = Math.abs(+u.by) || 4, way = +u.by < 0 ? 'Down' : 'Up';
		if (key === 'random') { return r.share + '% of ' + (r.bars ? 'bars' : 'beats') + ' skipped at random' + (r.keepOne ? ', beat one kept' : ''); }
		if (key === 'gradual') { return 'Every beat at first, ' + g.to + '%' + (g.bars ? ' of bars' : '') + ' gone after ' + plural(+g.over, 'bar') + (g.keepOne ? ', beat one kept' : ''); }
		return (u.ladder ? way + ' ' + by + ' then back ' + Math.max(1, Math.round(by / 2)) + ', every ' + plural(+u.every, 'bar') : way + ' ' + by + ' bpm every ' + plural(+u.every, 'bar')) + (u.stopAt !== '' ? ', to ' + u.stopAt : '');
	}
	/* The same line while it runs, from what the engine says is happening. */
	function metFnLive(key, ev) {
		var m = ev.mute, u = ev.up;
		if (key === 'up' && u) {
			return ev.bpm + ' bpm. ' + (u.done ? 'Holding there.' : (u.by < 0 ? 'Down ' : 'Up ') + Math.abs(u.by) + ' in ' + plural(u.inBars, 'bar') + '.');
		}
		if (key === 'random' && m && m.kind === 'random') { return m.now + '% asked. ' + m.gone + ' of ' + plural(m.beats, 'beat') + ' muted so far.'; }
		if (key === 'gradual' && m && m.kind === 'gradual') { return m.done ? m.now + '% muted. Holding there.' : m.now + '% muted now, heading for ' + m.to + '%'; }
		return '';
	}
	function metTile(key, label, value, wide) {
		var on = ui.metPanel === key;
		return '<button type="button" class="mp-m-tile' + (on ? ' is-open' : '') + (wide ? ' wide' : '') + '" data-met-panel="' + key + '" aria-expanded="' + on + '"><span>' + esc(label) + '</span><b>' + esc(value) + '</b></button>';
	}
	function metSeg(name, items, cur, label, wrap) {
		return '<div class="mp-caps' + (wrap ? ' mp-m-wrap' : '') + '" role="group" aria-label="' + esc(label) + '">' + items.map(function (it) {
			return '<button type="button" data-met-' + name + '="' + it[0] + '" aria-pressed="' + (String(cur) === String(it[0])) + '">' + esc(it[1]) + '</button>';
		}).join('') + '</div>';
	}
	/* A real switch: a button that says whether it is on. */
	function metSwitch(key, on, label, hint) {
		return '<button type="button" class="mp-m-sw" role="switch" aria-checked="' + !!on + '" data-m-sw="' + key + '"><span><b>' + esc(label) + '</b>' + (hint ? '<small>' + esc(hint) + '</small>' : '') + '</span><i class="mp-sw" aria-hidden="true"></i></button>';
	}
	/* A number to type, with a button either side and a few quick picks. path: 'random.share' and the like. */
	var MET_NUM = { 'random.share': [0, 100, 30], 'gradual.to': [0, 100, 75], 'gradual.over': [1, 999, 32], 'up.by': [-60, 60, 4], 'up.every': [1, 64, 4], 'up.stopAt': [20, 300, ''] };
	function metNumField(path, label, unit, step, picks) {
		var p = path.split('.'), val = metOpts[p[0]][p[1]], lim = MET_NUM[path], id = 'mp-m-' + p.join('-');
		return '<div class="mp-m-num"><label for="' + id + '">' + esc(label) + '</label><div class="mp-m-step">' +
			'<button type="button" data-m-step="' + path + ':' + (-step) + '" aria-label="' + esc(label) + ': ' + step + ' less">−</button>' +
			'<input id="' + id + '" type="number"' + (path === 'up.by' ? '' : ' inputmode="numeric"') + ' min="' + lim[0] + '" max="' + lim[1] + '" step="1" value="' + esc(val) + '" data-m-num="' + path + '" data-f="m-' + path + '"' + (path === 'up.stopAt' ? ' placeholder="None"' : '') + '>' +
			'<button type="button" data-m-step="' + path + ':' + step + '" aria-label="' + esc(label) + ': ' + step + ' more">+</button>' +
			'<span>' + esc(unit) + '</span></div>' +
			(picks ? '<div class="mp-m-picks" role="group" aria-label="' + esc(label) + ', quick picks">' + picks.map(function (v) { return '<button type="button" data-m-pick="' + path + ':' + v + '" aria-pressed="' + (+val === v) + '">' + v + '</button>'; }).join('') + '</div>' : '') + '</div>';
	}
	function metMuteBody(key, n) {
		var x = metOpts[key], most = Math.round(100 * (n - 1) / n), ask = key === 'random' ? +x.share : +x.to;
		return (key === 'random' ?
				metNumField('random.share', 'Skip', x.bars ? '% of bars' : '% of beats', 5, [10, 25, 50, 75]) :
				metNumField('gradual.to', 'Go as far as', x.bars ? '% of bars' : '% of beats', 5, [50, 75, 100]) + metNumField('gradual.over', 'Take', 'bars to get there', 4, [16, 32, 64])) +
			metSwitch(key + '.keepOne', x.keepOne, 'Keep beat one', 'The first beat of the bar always sounds.') +
			metSwitch(key + '.bars', x.bars, 'Mute whole bars', 'The choice is made bar by bar, not beat by beat.') +
			(x.keepOne && !x.bars && ask > most ? '<p class="mp-note">With beat one kept, ' + most + '% is the most that can go in this time signature.</p>' : '') +
			'<p class="mp-note">' + (key === 'random' ?
				'A muted beat is silent all the way through: the click, anything between the beats, and the drummer. It still passes on the display, hollow, so you can see where it was.' :
				'It starts with every beat sounding and takes more away at random, bar by bar, then holds. Muted beats pass on the display, hollow.') +
			' Random mute and Gradual mute take turns: switching one on switches the other off.</p>';
	}
	function metUpBody() {
		var u = metOpts.up, cur = metOpts.bpm, behind = u.stopAt !== '' && (+u.stopAt - cur) * (+u.by < 0 ? -1 : 1) <= 0;
		return '<div class="mp-m-two">' + metNumField('up.by', 'Change by', 'bpm', 1) + metNumField('up.every', 'Every', 'bars', 1) + '</div>' +
			metNumField('up.stopAt', 'Stop at', 'bpm', 5) +
			metSwitch('up.ladder', u.ladder, 'Ladder', 'Up a step, then back half a step, so each new tempo is followed by an easier one.') +
			(behind ? '<p class="mp-note">Stop at is ' + (+u.by < 0 ? 'above' : 'below') + ' the tempo showing, so it will be passed over.</p>' : '') +
			'<p class="mp-note">It starts from the tempo showing. A minus number brings the tempo down. Leave Stop at empty and it keeps going, as far as ' + (+u.by < 0 ? MET.BOTTOM : MET.TOP) + '.</p>';
	}
	function metFnRow(key, body) {
		var on = !!metOpts[key].on, open = metUi.fn === key;
		return '<section class="mp-m-fn' + (on ? ' is-on' : '') + (open ? ' is-open' : '') + '">' +
			'<div class="mp-m-fn-top"><button type="button" class="mp-m-fn-head" data-fn-open="' + key + '" aria-expanded="' + open + '"' + (open ? ' aria-controls="mp-m-fn-' + key + '"' : '') + '><b>' + MET_FN[key] + '</b><span data-fn-line="' + key + '">' + esc(metFnLine(key)) + '</span></button>' +
			'<button type="button" class="mp-m-fn-sw" role="switch" aria-checked="' + on + '" data-fn-sw="' + key + '" aria-label="' + MET_FN[key] + '"><i class="mp-sw" aria-hidden="true"></i></button></div>' +
			(open ? '<div class="mp-m-fn-body" id="mp-m-fn-' + key + '">' + body() + '</div>' : '') + '</section>';
	}
	function grooveName() {
		var g = metOpts.groove, K = heKit();
		if (!g) { return 'Just the click'; }
		if (g.kind === 'loop') { return g.title; }
		if (g.kind === 'feel') { return g.feel + ' · ' + ((K && K.kit(g.kit || 'studio') || {}).name || 'House kit'); }
		if (!MET.GROOVES[g.id]) { return 'Just the click'; }
		return MET.GROOVES[g.id].name + (g.kit === 'kyle' && hasKit() ? ' · Kyle’s kit' : '');
	}
	function renderMetronome() {
		var h = head('metronome');
		if (RO) { return h + privateNote('Their own metronome.'); }
		if (!met) { return h + '<p class="mp-note">The metronome needs a browser that can play sound.</p>'; }
		if (!shelf.data && !shelf.loading && !shelf.failed && L.ncReady) { setTimeout(loadShelf, 0); }
		if (!metOpts.accents || metOpts.accents.length !== met.opts.beats.length) { met.set(engineOpts()); metOpts.accents = met.opts.accents.slice(); }
		if (!metUi.warm) {
			// The first time it is opened: bring the engine up to date and fetch what it will need (never before).
			metUi.warm = true;
			met.set(engineOpts());
			if (!metLean) { setTimeout(function () { met.prepare(); }, 0); }
		}
		var o = metOpts, mi = meterInfo(o.meter), eo = engineOpts(), beats = met.opts.beats, run = met.running, n = beats.length;
		var bpmNow = metNowBpm();
		var tempoLog = (state.tools || {}).tempo && list('tempo').length;
		var subName = (SUBS[mi.kind].filter(function (s) { return s[0] === +eo.sub; })[0] || SUBS[mi.kind][0])[1].toLowerCase();
		var swung = +o.swing && mi.kind === 'simple' && (+o.sub === 2 || +o.sub === 4);
		var more = [o.countIn ? 'Count in' : '', +o.offsetMs ? 'delay' : '', o.flash ? 'flash' : '', o.vibrate ? 'vibrate' : ''].filter(Boolean).join(', ');
		h += '<div class="mp-m' + (o.flash ? ' can-flash' : '') + '" data-m-root>' +
			'<div class="mp-m-main">' +
				'<div class="mp-m-read">' +
					'<div class="mp-m-tempo" data-met-swipe tabindex="0" role="slider" aria-label="Tempo in beats per minute. Press Enter to type one. Swipe up or down, or use the arrow keys, to change it." aria-valuemin="' + MET.BOTTOM + '" aria-valuemax="' + MET.TOP + '" aria-valuenow="' + bpmNow + '">' +
						'<span class="mp-m-mark" data-met-mark>' + marking(bpmNow) + ' · tap or swipe</span>' +
						'<span class="mp-m-numrow">' + (metUi.typing ?
metTypeHtml(bpmNow) : '<b class="mp-num" data-bpm-val>' + bpmNow + '</b>') + '<small>bpm</small></span>' +
					'</div>' +
					'<div class="mp-m-where"><b class="mp-knock">' + esc(mi.label) + '</b><span data-met-bar>' + (run ? 'Bar ' + (metUi.bars || 1) + ' · ' + clock(Date.now() - metUi.startedAt) : esc(unitName(mi)) + '<br>' + esc(subName)) + '</span></div>' +
				'</div>' +
				'<div class="mp-m-nudge" role="group" aria-label="Change the tempo">' +
					'<button type="button" data-met="half" aria-label="Half the tempo">½</button>' +
					'<button type="button" data-met="-5" aria-label="5 slower">−5</button><button type="button" data-met="-1" aria-label="1 slower">−1</button>' +
					'<button type="button" class="tap" data-met="tap" aria-label="Tap the tempo">Tap</button>' +
					'<button type="button" data-met="1" aria-label="1 faster">+1</button><button type="button" data-met="5" aria-label="5 faster">+5</button>' +
					'<button type="button" data-met="double" aria-label="Double the tempo">2×</button></div>' +
				'<div class="mp-m-beats' + (n > 5 ? ' many' : '') + '" style="grid-template-columns:' + beats.map(function (b) { return b.units + 'fr'; }).join(' ') + '" role="group" aria-label="The beats of the bar. Tap a beat to change it: accent, normal, soft or silent.">' + beats.map(function (b, i) {
					var lv = o.accents[i] || 'normal';
					return '<button type="button" class="lv-' + lv + '" data-met-cell="' + i + '" aria-label="Beat ' + (i + 1) + ', ' + LEVEL_NAME[lv] + '"><span class="n">' + (i + 1) + '</span><span class="lv">' + (lv === 'mute' ? 'Silent' : lv === 'soft' ? 'Soft' : lv === 'accent' ? 'Accent' : '') + '</span></button>';
				}).join('') + '</div>' +
				'<p class="mp-m-status" data-met-status aria-live="off">' + esc(metStatus()) + '</p>' +
				(metUi.reached && !run ? '<div class="mp-m-keep"><span>Click up got to <b>' + metUi.reached + ' bpm</b>. The tempo is back where it started.</span><button type="button" class="mp-btn-ghost sm" data-met-keep="' + metUi.reached + '">Keep ' + metUi.reached + '</button></div>' : '') +
				(metUi.last && !run && tempoLog ? '<div class="mp-met-log"><span>Log <b>' + metUi.last + ' bpm</b> for ' + esc((list('tempo').filter(function (x) { return x.id === ui.ex; })[0] || list('tempo')[0]).name) + '?</span><span class="mp-item-acts">' + Object.keys(QUALITY).map(function (k) { return '<button type="button" class="mp-x" data-met-log="' + k + '">' + QUALITY[k] + '</button>'; }).join('') + '<button type="button" class="mp-x" data-met-log="">Not now</button></span></div>' : '') +
			'</div>' +
			'<div class="mp-m-side">' +
				'<div class="mp-m-fns">' +
					metFnRow('random', function () { return metMuteBody('random', n); }) +
					metFnRow('gradual', function () { return metMuteBody('gradual', n); }) +
					metFnRow('up', metUpBody) +
				'</div>' +
				'<div class="mp-m-setups"><div class="mp-m-setups-head"><h3>Setups</h3><button type="button" class="mp-link" data-met-panel="setups" aria-expanded="' + (ui.metPanel === 'setups') + '">' + (ui.metPanel === 'setups' ? 'Close' : 'Save this, or tidy up') + '</button></div>' +
					'<div class="mp-m-chips" role="group" aria-label="Setups. Tap one to set the metronome up that way.">' +
						o.setups.map(function (su, i) { return '<button type="button" class="mine" data-met-setup="u:' + i + '">' + esc(su.name) + '</button>'; }).join('') +
						MET_STARTERS.map(function (su, i) { return '<button type="button" data-met-setup="s:' + i + '">' + esc(su[0]) + '</button>'; }).join('') +
					'</div></div>' +
				(ui.metPanel === 'setups' ? '<div class="mp-m-panel">' + metPanel('setups', o, mi, eo) + '</div>' : '') +
				'<div class="mp-m-tiles">' +
					metTile('place', 'Where the click falls', whichName(n) + ', ' + whereName(mi) + (o.gap !== '0' ? ' · ' + o.gap.replace('-', ' on, ') + ' off' : ''), true) +
					metTile('groove', 'Groove', grooveName()) +
					metTile('time', 'Time', mi.label + ' · ' + subName + (swung ? ' · swing ' + Math.round(o.swing * 100) + '%' : '')) +
					metTile('sound', 'Sound', MET.SOUNDS[o.sound]) +
					metTile('more', 'More', more || 'Count in, delay, flash') +
				'</div>' +
				(ui.metPanel && ui.metPanel !== 'setups' ? '<div class="mp-m-panel">' + metPanel(ui.metPanel, o, mi, eo) + '</div>' : '') +
			'</div>' +
			'<div class="mp-inst-go mp-m-go"><button type="button" class="mp-btn block big' + (run ? ' is-on' : '') + '" data-met="go" aria-pressed="' + run + '">' + (run ? '<i class="sq"></i>Stop' : 'Start') + '</button></div>' +
			'<p class="mp-small mp-met-keys">Space starts and stops. Arrows change the tempo (Shift for 5). T taps. Enter types a tempo.</p>' +
		'</div>';
		return h;
	}
	function kitBytes(k) {
		var P = (window.HE && window.HE.PACKS) || {}, t = 0;
		(k.packs || []).forEach(function (nm) { t += (P[nm] || {}).bytes || 0; });
		return t;
	}
	function metKitNote(g) {
		var K = heKit(), k = K && K.kit(g.kit || 'studio'), st = met.info().kit;
		if (!k) { return ''; }
		if (st === 'failed') { return '<p class="mp-note">The kit did not arrive. Check your connection. The click carries on without it.</p>'; }
		if (st === 'waiting' && met.running) { return '<p class="mp-note">Fetching the kit. ' + (g.kind === 'feel' ? 'The click plays alone until it is here, and the drummer comes in on a bar line.' : 'Synthesised drums play until it is here.') + '</p>'; }
		return '<p class="mp-note">' + (k.drawn ? 'A drum machine, made on your phone. Nothing to fetch.' : 'Recorded drums: ' + fmtSize(kitBytes(k)) + ' to fetch the first time, then kept.') + '</p>';
	}
	function metPanel(key, o, mi, eo) {
		var K = heKit(), g = o.groove, h = '';
		if (key === 'setups') {
			return '<form class="mp-m-save" data-form="met-setup" novalidate><div class="field"><label for="mp-m-setup-name">Save what is set now as</label><input id="mp-m-setup-name" type="text" maxlength="40" data-f="m-setup-name" placeholder="e.g. Scales, 2 and 4"></div><button class="mp-btn-ghost sm" type="submit">Save</button></form>' +
				(o.setups.length ? '<ul class="mp-m-mine">' + o.setups.map(function (su, i) { return '<li><span>' + esc(su.name) + '</span><button type="button" class="mp-x" data-met-setup-del="' + i + '" aria-label="Delete the setup ' + esc(su.name) + '">Delete</button></li>'; }).join('') + '</ul>' : '') +
				'<p class="mp-note">A setup keeps everything on this screen: tempo, time signature, sound, the lot. Tap its name above to bring it back. The ones that come with the metronome leave your tempo and sound alone.</p>';
		}
		if (key === 'place') {
			var n = met.opts.beats.length, w = metWhere(mi);
			return '<div><span class="mp-lbl">Which beats</span>' + metSeg('which', [['all', 'Every beat'], ['backbeat', backbeatName(n)], ['one', 'Beat one']], o.which, 'Which beats') + '</div>' +
				(o.which === 'one' ? '<div><span class="mp-lbl">How often</span>' + metSeg('every', MET_EVERY, o.every, 'How often') + '</div>' : '') +
				(mi.kind === 'odd' ? '<p class="mp-note">In an odd time signature the click stays on the beat.</p>' :
					'<div><span class="mp-lbl">Where in the beat</span>' + metSeg('where', MET_WHERE[mi.kind], w, 'Where in the beat', true) + '</div>' +
					(w !== 'on' ? '<p class="mp-note">Only that one click sounds in each beat. The beat itself is yours to keep.</p>' : '')) +
				'<div><span class="mp-lbl">Bars on, bars off</span>' + metSeg('gap', MET_GAPS, o.gap, 'Bars on, bars off') + '</div>' +
				'<p class="mp-note">Bars of click, then bars of silence. Keep time through the gap and hear where you land.</p>';
		}
		if (key === 'groove') {
			var loops = shelfLoops();
			if (!K && !metUi.he) {
				// the list of feels and kits lives with the drummers: fetched the first time this panel is opened
				metUi.he = true;
				MET.band(true).then(function () { if (ui.metPanel === 'groove') { renderModule('metronome'); } }, function () {});
			}
			h = '<div class="field"><label for="mp-met-groove">Play along with</label><select id="mp-met-groove" data-met-groove><option value="">Just the click</option>' +
				(K ? '<optgroup label="The house drummer (4/4)">' + K.FEELS.map(function (f) { return '<option value="f:' + esc(f.name) + '"' + (g && g.kind === 'feel' && g.feel === f.name ? ' selected' : '') + '>' + esc(f.name.replace('Half-time', 'Half time')) + '</option>'; }).join('') + '</optgroup>' :
					(g && g.kind === 'feel' ? '<option value="f:' + esc(g.feel) + '" selected>' + esc(g.feel) + '</option>' : '')) +
				'<optgroup label="Written patterns">' + Object.keys(MET.GROOVES).map(function (id) { return '<option value="p:' + id + '"' + (g && g.id === id ? ' selected' : '') + '>' + esc(MET.GROOVES[id].name) + '</option>'; }).join('') + '</optgroup>' +
				(loops.length ? '<optgroup label="Loops from the Shelf">' + loops.map(function (lp, i) { return '<option value="l:' + i + '"' + (g && g.kind === 'loop' && g.title === lp.title && g.style === lp.style ? ' selected' : '') + '>' + esc((lp.style ? lp.style + ': ' : '') + lp.title + ' (' + Math.round(lp.bpm) + ')') + '</option>'; }).join('') + '</optgroup>' : '') +
				'</select></div>';
			if (g && g.kind !== 'loop' && K) {
				var suits = g.kind === 'feel' ? K.kitsFor(g.feel) : [], kits = K.KITS.filter(function (k) { return !k.hidden || suits.indexOf(k.id) >= 0; });
				kits.sort(function (a, b) { return (suits.indexOf(a.id) < 0 ? 99 : suits.indexOf(a.id)) - (suits.indexOf(b.id) < 0 ? 99 : suits.indexOf(b.id)); });
				if (g.kind === 'feel') { h += '<div><span class="mp-lbl">Groove</span>' + metSeg('gnum', [[0, 'One'], [1, 'Two'], [2, 'Three']], +g.groove || 0, 'Groove') + '</div>'; }
				h += '<div class="field"><label for="mp-met-kit">Kit</label><select id="mp-met-kit" data-met-kitsel>' +
					(g.kind !== 'feel' && hasKit() ? '<option value="kyle"' + (g.kit === 'kyle' ? ' selected' : '') + '>Kyle’s kit (recorded at Lost Oscillation)</option>' : '') +
					kits.map(function (k) { return '<option value="' + k.id + '"' + ((g.kit || 'studio') === k.id ? ' selected' : '') + '>' + esc(k.name) + (suits.length && suits[0] === k.id ? ' (suits it best)' : '') + '</option>'; }).join('') + '</select></div>' +
					(g.kit === 'kyle' && hasKit() ? '' : metKitNote(g));
			}
			if (g && g.kind === 'feel') { h += '<p class="mp-note">Each feel has three grooves, and every four bars ends with a small fill. The house drummer plays in 4/4, so choosing a feel sets the time signature to 4/4. Change the time signature and the drummer sits out.</p>'; }
			if (g && g.id) { h += '<p class="mp-note">A written pattern brings its own time signature with it.</p>'; }
			if (g && g.kind === 'loop') { h += '<p class="mp-note">Recorded at ' + Math.round(g.bpm) + ' bpm. It follows the tempo, and sounds most natural near where it was played.</p>'; }
			return h + '<div class="field"><label for="mp-met-gvol">Band volume</label><input id="mp-met-gvol" type="range" min="0" max="100" value="' + Math.round(o.vol.groove * 100) + '" data-met-vol="groove"></div>' +
				'<p class="mp-note">The click carries on with the groove, and a muted beat mutes the drummer too. Turn the beats down under Sound if you only want drums.</p>';
		}
		if (key === 'time') {
			var drummerSwings = g && ((g.kind === 'feel' && /^(Shuffle|Swing|Hip hop|Neo soul)$/.test(g.feel)) || (g.id && MET.GROOVES[g.id] && MET.GROOVES[g.id].spb === 3));
			return '<div class="mp-met-row">' +
				'<div class="field"><label for="mp-met-meter">Time signature</label><select id="mp-met-meter" data-met-meter>' + ['simple', 'compound', 'odd'].map(function (kind) {
					return '<optgroup label="' + { simple: 'Simple', compound: 'Compound', odd: 'Odd, grouped in eighths' }[kind] + '">' + METERS.filter(function (x) { return x[1] === kind; }).map(function (x) { var mm = meterInfo(x[0]); return '<option value="' + x[0] + '"' + (x[0] === mi.key ? ' selected' : '') + '>' + esc(mm.label) + '</option>'; }).join('') + '</optgroup>';
				}).join('') + '</select></div>' +
				'<div class="field"><label for="mp-met-sub">Clicks per beat</label><select id="mp-met-sub" data-met-sub>' + SUBS[mi.kind].map(function (s) { return '<option value="' + s[0] + '"' + (+eo.sub === s[0] ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select></div>' +
				'</div>' +
				(mi.kind === 'simple' && (+o.sub === 2 || +o.sub === 4) ? '<div class="field"><label for="mp-met-swing">Swing <span class="mp-small" data-swing-val>' + (+o.swing ? Math.round(o.swing * 100) + '%' : 'Straight') + '</span></label><input id="mp-met-swing" type="range" min="0" max="100" step="5" value="' + Math.round(o.swing * 100) + '" data-met-swing><span class="hint">0% is straight, 100% is a full triplet swing.' + (drummerSwings ? ' While a groove that swings is playing, the drummer sets it.' : '') + '</span></div>' : '') +
				(g && g.kind === 'feel' ? '<p class="mp-note">The house drummer plays in 4/4. Pick another time signature and the drummer sits out.</p>' : '') +
				(metWhere(mi) !== 'on' ? '<p class="mp-note">The click is set to fall off the beat (see Where the click falls), so it sounds once in each beat whatever is chosen here.</p>' : '');
		}
		if (key === 'sound') {
			return '<div><span class="mp-lbl">Sound</span><div class="mp-caps mp-m-wrap" role="group" aria-label="Sound">' + Object.keys(MET.SOUNDS).map(function (k) { return '<button type="button" data-met-sound="' + k + '" aria-pressed="' + (o.sound === k) + '">' + esc(MET.SOUNDS[k]) + '</button>'; }).join('') + '</div></div>' +
				'<p class="mp-note">Tap one to hear it: accent, beat, subdivision, beat. ' + (MET.RECORDED[o.sound] ? 'This one is a recording' + (met.info().clicks === 'recorded' ? '.' : ', fetched the first time (45 KB). Until it arrives a stand in plays.') : 'This one is made on your phone, with nothing to fetch.') + '</p>' +
				'<div class="mp-met-grid">' + [['accent', 'Accents'], ['beat', 'Beats'], ['sub', 'Subdivisions'], ['groove', 'Band']].map(function (v) { return '<div class="field"><label for="mp-met-v-' + v[0] + '">' + v[1] + '</label><input id="mp-met-v-' + v[0] + '" type="range" min="0" max="100" value="' + Math.round(o.vol[v[0]] * 100) + '" data-met-vol="' + v[0] + '"></div>'; }).join('') + '</div>' +
				'<p class="mp-note">Every sound is equally loud at the same setting, so changing the sound never changes the balance.</p>';
		}
		return metSwitch('countIn', o.countIn, 'Count in', 'One bar of plain clicks before it starts.') +
			'<div class="field"><label for="mp-met-offset">Wireless headphones delay <span class="mp-small" data-offset-val>' + (+o.offsetMs ? o.offsetMs + ' ms' : 'Off') + '</span></label><input id="mp-met-offset" type="range" min="0" max="300" step="10" value="' + o.offsetMs + '" data-met-offset><span class="hint">Bluetooth makes the sound arrive late. If the display looks early, nudge this until they line up.</span></div>' +
			metSwitch('flash', o.flash, 'Flash on the beat', 'The whole readout flashes, for when the phone is across the room.') +
			(navigator.vibrate ? metSwitch('vibrate', o.vibrate, 'Vibrate on the beat', 'A short buzz on each beat. It is rougher than the click: feel the beat with it, judge your time by the sound.') : '') +
			metSwitch('hideSilent', o.hideSilent, 'Hide silent beats', 'Nothing lights or moves while the click is silent, for testing yourself without the screen.') +
			'<p class="mp-note">The screen stays awake while the metronome runs. On an iPhone it sounds with the silent switch on.</p>';
	}
	function setBpm(v, quiet) {
		metOpts.bpm = Math.max(MET.BOTTOM, Math.min(MET.TOP, Math.round(v)));
		metUi.reached = 0; metUi.played = '';
		$$('[data-bpm-val]').forEach(function (el) { el.textContent = metOpts.bpm; });
		$$('[data-met-swipe]').forEach(function (el) { el.setAttribute('aria-valuenow', metOpts.bpm); });
		$$('[data-met-mark]').forEach(function (el) { el.textContent = marking(metOpts.bpm) + ' · tap or swipe'; });
		$$('.mp-m-keep').forEach(function (el) { el.remove(); });
		metStore();
		if (met) { met.set({ bpm: metOpts.bpm }); }
		if (!quiet) { var s = $('[data-met-status]'); if (s && !met.running) { s.textContent = metStatus(); } }
		refreshTiles(); updateDock();
	}
	/* Where the keyboard is, as something that can be found again once the screen has been drawn afresh. */
	function metFocus() {
		var a = document.activeElement, mod = room && room.querySelector('[data-mod="metronome"]'), i;
		var keys = ['data-met', 'data-fn-open', 'data-fn-sw', 'data-m-sw', 'data-met-panel', 'data-met-cell', 'data-met-setup', 'data-m-step', 'data-m-pick'];
		if (!a || !mod || !mod.contains(a)) { return null; }
		if (a.hasAttribute('data-met-swipe')) { return '[data-met-swipe]'; }
		if (a.id) { return '#' + a.id; }
		for (i = 0; i < keys.length; i++) { if (a.hasAttribute(keys[i])) { return '[' + keys[i] + '="' + a.getAttribute(keys[i]) + '"]'; } }
		return null;
	}
	function startMet() {
		if (!met) { return; }
		var eo = engineOpts();
		if (eo.groove && eo.groove.kind === 'kit') { met.kitUrls = shelf.data.kit; }
		met.set(eo);
		metUi.last = 0; metUi.reached = 0; metUi.played = ''; metUi.now = metOpts.bpm; metUi.bars = 0;
		metUi.startedAt = Date.now();
		met.start().catch(function () { toast('Sound isn\'t available in this browser.'); });
	}
	function stopMet() {
		if (!met || !met.running) { return; }
		var played = Date.now() - metUi.startedAt;
		var bpm = met.currentBpm();
		met.stop();
		metUi.last = played > 20000 ? bpm : 0;
		renderModule('metronome', { focus: metFocus() });
	}
	/* Type a tempo: the big number becomes a field, and goes back when Enter is pressed or the field is left.
	 * Only the number is swapped, not the whole screen, so a tap on Start while typing is not lost. */
	function metTypeHtml(bpm) {
		return '<input class="mp-m-type mp-num" type="number" inputmode="numeric" min="' + MET.BOTTOM + '" max="' + MET.TOP + '" value="' + bpm + '" data-met-type data-f="m-type" aria-label="Tempo in beats per minute">';
	}
	function metType(on, value, refocus) {
		var row = room && room.querySelector('.mp-m-numrow');
		if (!row || on === metUi.typing) { return; }
		metUi.typing = on;
		var tmp = document.createElement('span');
		tmp.innerHTML = on ? metTypeHtml(metNowBpm()) : '<b class="mp-num" data-bpm-val>' + metNowBpm() + '</b>';
		row.replaceChild(tmp.firstChild, row.firstChild);
		if (on) { row.firstChild.focus(); row.firstChild.select(); return; }
		if (value != null && +value >= 1) { setBpm(+value); }
		if (refocus) { var sl = room.querySelector('[data-met-swipe]'); if (sl) { sl.focus({ preventScroll: true }); } }
	}
	if (met) {
		met.onbeat = function (ev) {
			var mod = room && room.querySelector('[data-mod="metronome"]');
			metUi.now = ev.bpm; if (!ev.countIn && ev.sub === 0) { metUi.bars = ev.bar + 1; }
			if (ev.sub === 0 && ev.audible && metOpts.vibrate && navigator.vibrate) { navigator.vibrate(ev.level === 'accent' ? 35 : 18); }
			if (!mod) { return; }
			var cells = mod.querySelectorAll('[data-met-cell]'), i;
			var show = ev.audible || !metOpts.hideSilent || ev.countIn, gone = (ev.muted || ev.off) && !ev.countIn;
			if (ev.sub === 0 || metUi.beat !== ev.beat) {
				// the beat passing: lit if it sounds, hollow if it was muted on purpose
				for (i = 0; i < cells.length; i++) { cells[i].classList.toggle('on', i === ev.beat && show && !gone); cells[i].classList.toggle('gone', i === ev.beat && show && gone); cells[i].classList.remove('hit'); }
				metUi.beat = ev.beat;
			}
			if (ev.audible && cells[ev.beat]) {
				var c = cells[ev.beat]; c.classList.remove('hit'); void c.offsetWidth; c.classList.add('hit');
				if (metOpts.flash && ev.sub === 0) { var rt = mod.querySelector('[data-m-root]'); if (rt) { rt.classList.remove('flash'); void rt.offsetWidth; rt.classList.add('flash'); } }
			}
			var bv = mod.querySelector('[data-bpm-val]');
			if (bv && +bv.textContent !== ev.bpm) { bv.textContent = ev.bpm; var mk = mod.querySelector('[data-met-mark]'); if (mk) { mk.textContent = marking(ev.bpm) + ' · tap or swipe'; } }
			if (ev.sub === 0) {
				var bar = mod.querySelector('[data-met-bar]');
				if (bar) { bar.textContent = ev.countIn ? 'Count ' + (ev.beat + 1) : 'Bar ' + (ev.bar + 1) + ' · ' + clock(Date.now() - metUi.startedAt); }
				var st = mod.querySelector('[data-met-status]'), n = cells.length, mi = meterInfo(metOpts.meter);
				if (st) { st.textContent = ev.countIn ? 'Counting in' : whichName(n) + ', ' + whereName(mi) + (metOpts.gap !== '0' ? ' · ' + (ev.off ? 'bar off' : 'bar on') : ''); }
				['random', 'gradual', 'up'].forEach(function (k) {
					var el = metOpts[k].on && !ev.countIn ? mod.querySelector('[data-fn-line="' + k + '"]') : null, line = el ? metFnLive(k, ev) : '';
					if (el && line && el.textContent !== line) { el.textContent = line; }
				});
			}
		};
		met.onstate = function (s) {
			var mod = room && room.querySelector('[data-mod="metronome"]');
			if (s === 'sounds') {
				// a pack or a kit has come in (or failed to): the panel that says so is brought up to date
				if (mod && (ui.metPanel === 'groove' || ui.metPanel === 'sound')) { renderModule('metronome', { focus: metFocus() }); }
				return;
			}
			if (s === 'up-done') { toast('Click up has got to ' + met.currentBpm() + ' bpm. It holds there until you stop.'); return; }
			if (s === 'stopped') {
				// Click up moved the tempo: the readout goes back to where it started, and the tempo reached is offered
				metUi.reached = metOpts.up.on && metUi.now && metUi.now !== metOpts.bpm ? metUi.now : 0;
				metUi.played = metUi.bars ? 'Played ' + plural(metUi.bars, 'bar') + ' in ' + clock(Date.now() - metUi.startedAt) + '.' : '';
			}
			metUi.beat = -1;
			if (mod) { renderModule('metronome', { focus: metFocus() }); }
			refreshTiles(); updateDock();
		};
	}
	function tapTempo() {
		var bpm = MET.tap(metUi.tap, performance.now());
		if (bpm) { setBpm(bpm); }
	}
	/* Swipe the tempo: up is faster. About one bpm for every 8px. A tap that doesn't move opens the field to type in. */
	var swipe = null;
	document.addEventListener('pointerdown', function (e) {
		var s = e.target.closest && e.target.closest('[data-met-swipe]');
		if (!s || !met || metUi.typing) { return; }
		swipe = { y: e.clientY, bpm: metNowBpm(), id: e.pointerId, moved: false, at: Date.now() };
		try { s.setPointerCapture(e.pointerId); } catch (x) { /* fine */ }
	});
	document.addEventListener('pointermove', function (e) {
		if (!swipe || e.pointerId !== swipe.id) { return; }
		var dy = swipe.y - e.clientY;
		if (Math.abs(dy) > 4) { swipe.moved = true; }
		if (swipe.moved) { e.preventDefault(); setBpm(swipe.bpm + Math.round(dy / 8), true); }
	}, { passive: false });
	document.addEventListener('pointerup', function (e) {
		var was = swipe;
		swipe = null;
		if (was && !was.moved && e.pointerId === was.id && Date.now() - was.at < 600) { metType(true); }
	});
	document.addEventListener('pointercancel', function () { swipe = null; });
	document.addEventListener('keydown', function (e) {
		var mod = room && room.querySelector('[data-mod="metronome"]');
		if (!mod || !met || !mod.contains(document.activeElement)) { return; }
		var k = e.key;
		if (e.target.matches('[data-met-type]')) {
			if (k === 'Enter') { e.preventDefault(); metType(false, e.target.value, true); }
			if (k === 'Escape') { e.preventDefault(); metType(false, null, true); }
			return;
		}
		if (e.target.matches('input:not([type=range]):not([type=checkbox]), select, textarea') || e.metaKey || e.ctrlKey || e.altKey) { return; }
		if (k === ' ' && !e.target.matches('button, summary, input')) { e.preventDefault(); if (met.running) { stopMet(); } else { startMet(); } }
		else if (k === 'Enter' && e.target.matches('[data-met-swipe]')) { e.preventDefault(); metType(true); }
		else if ((k === 'ArrowUp' || k === 'ArrowRight') && !e.target.matches('input[type=range]')) { e.preventDefault(); setBpm(metNowBpm() + (e.shiftKey ? 5 : 1)); }
		else if ((k === 'ArrowDown' || k === 'ArrowLeft') && !e.target.matches('input[type=range]')) { e.preventDefault(); setBpm(metNowBpm() - (e.shiftKey ? 5 : 1)); }
		else if (k === 't' || k === 'T') { tapTempo(); }
	});
	/* One of the numbers in Random mute, Gradual mute or Click up, typed or stepped. */
	function metNum(path, raw, focusSel) {
		var p = path.split('.'), lim = MET_NUM[path], grp = Object.assign({}, metOpts[p[0]]), v = Math.round(+raw);
		if (path === 'up.stopAt' && (raw === '' || raw == null || !+raw)) { v = ''; }
		else if (isNaN(v) || (path === 'up.by' && !v)) { v = grp[p[1]] === '' || !+grp[p[1]] ? lim[2] : grp[p[1]]; }
		else { v = Math.max(lim[0], Math.min(lim[1], v)); }
		grp[p[1]] = v;
		var patch = {}; patch[p[0]] = grp;
		metSave(patch, false);
		// the field shows what was taken (a typed 500 becomes 100), so its half typed text is dropped
		var field = room.querySelector('[data-m-num="' + path + '"]');
		renderModule('metronome', { focus: focusSel || '[data-m-num="' + path + '"]', clear: field ? field.parentNode : null });
	}
	/* Switch one of the three functions on or off. Random mute and Gradual mute take turns. */
	function metFnSwitch(key) {
		var patch = {}, other = key === 'random' ? 'gradual' : key === 'gradual' ? 'random' : '';
		patch[key] = Object.assign({}, metOpts[key], { on: !metOpts[key].on });
		if (patch[key].on && other && metOpts[other].on) {
			patch[other] = Object.assign({}, metOpts[other], { on: false });
			toast(MET_FN[other] + ' is off now. The two take turns.');
		}
		if (patch[key].on && !metUi.fn) { metUi.fn = key; }
		metSave(patch, false);
		renderModule('metronome', { focus: '[data-fn-sw="' + key + '"]' });
	}
	/* Bring a setup back: a saved one is the whole screen, a starter leaves the tempo, sound and volumes alone. */
	function metRecall(code) {
		var i = +code.slice(2), mine = code.charAt(0) === 'u', su = mine ? metOpts.setups[i] : MET_STARTERS[i], keep = metOpts.setups;
		if (!su) { return; }
		if (mine) { metOpts = MET.upgrade(JSON.parse(JSON.stringify(su.s))); }
		else { metOpts = MET.upgrade(Object.assign({ v: 2, bpm: metOpts.bpm, sound: metOpts.sound, vol: metOpts.vol, offsetMs: metOpts.offsetMs, flash: metOpts.flash, vibrate: metOpts.vibrate, hideSilent: metOpts.hideSilent }, JSON.parse(JSON.stringify(su[1])))); }
		metOpts.setups = keep;
		metUi.reached = 0; metUi.fn = metOpts.up.on ? 'up' : metOpts.random.on ? 'random' : metOpts.gradual.on ? 'gradual' : '';
		metSave({ groove: metOpts.groove }, false);
		renderModule('metronome', { focus: '[data-met-setup="' + code + '"]' });
		toast('“' + (mine ? su.name : su[0]) + '” is set.');
	}

	/* ---- Drone ---- */
	var drone = window.LBSDrone ? window.LBSDrone.create() : null;
	var droneOpts = Object.assign({ note: 2, first: 'pa', register: 0, pace: 'medium', a4: 440, volume: 0.8, tuning: 'just' }, store('lbs-drone') || {});
	// A link can choose the note: ?note=9 (from 0 for C), as Ear Training's links do.
	try { var wantNote = new URL(location.href).searchParams.get('note'); if (wantNote !== null && /^(\d|1[01])$/.test(wantNote)) { droneOpts.note = +wantNote; } } catch (e) { /* the note kept from last time */ }
	var droneState = 'stopped';
	var DRONE_FIRST = [['pa', 'Pa', 'the fifth'], ['ma', 'Ma', 'the fourth'], ['ni', 'Ni', 'the major seventh'], ['sa', 'Sa', 'Sa only']];
	var DRONE_REG = [[-1, 'Lower'], [0, 'Standard'], [1, 'Higher']];
	var DRONE_PACE = [['slow', 'Slow'], ['medium', 'Medium'], ['fast', 'Fast']];
	var DRONE_TUNING = [['just', 'Just'], ['equal', 'Equal']];
	function segHtml(name, items, cur, label) {
		return '<div class="mp-seg mp-seg-wide" role="group" aria-label="' + esc(label) + '">' + items.map(function (it) {
			return '<button type="button" data-drone-' + name + '="' + it[0] + '" aria-pressed="' + (String(cur) === String(it[0])) + '">' + esc(it[1]) + '</button>';
		}).join('') + '</div>';
	}
	/* Circle-of-fifths order around the wheel (note numbers count from C). */
	var FIFTHS = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
	var DRONE_TIPS = [
		'Play a scale slowly against it. Hold each note until it stops beating against the drone, then move on.',
		'Sing the note before you play it. Then play it and check.',
		'Try each interval in turn: stay on it until you can hear its colour, not just its pitch.'
	];
	function renderDrone() {
		var h = head('drone');
		if (RO) { return h + privateNote('Their own drone.'); }
		if (!drone) { return h + '<p class="mp-note">The drone needs a browser that can play sound.</p>'; }
		var names = window.LBSDrone.NOTE_NAMES;
		var strs = window.LBSDrone.strings(droneOpts);
		var firstLabel = DRONE_FIRST.filter(function (f) { return f[0] === droneOpts.first; })[0];
		var on = droneState !== 'stopped';
		var strLabels = [droneOpts.first === 'sa' ? 'Sa' : firstLabel[1], 'Sa', 'Sa', 'Sa'];
		var wheel = FIFTHS.map(function (n, i) {
			var a = i * 30;
			return '<button type="button" class="mp-wheel-note' + (n === droneOpts.note ? ' on' : '') + '" style="--a:' + a + 'deg" data-drone-note="' + n + '" aria-pressed="' + (n === droneOpts.note) + '" aria-label="' + esc(names[n].replace('♯', ' sharp').replace('♭', ' flat')) + '"><span>' + names[n] + '</span></button>';
		}).join('');
		var strings = [129, 153, 177, 201].map(function (x, i) {
			return '<g class="mp-str" data-drone-str="' + i + '"><line x1="' + x + '" y1="108" x2="' + x + '" y2="222" stroke-width="' + (i === 3 ? 2.6 : i === 0 ? 2 : 1.6) + '"></line><text x="' + x + '" y="98" text-anchor="middle">' + strLabels[i].toUpperCase() + '</text>' + (i === 3 ? '<text class="low" x="' + x + '" y="240" text-anchor="middle">low</text>' : '') + '</g>';
		}).join('');
		h += '<div class="mp-drone2">' +
			'<div class="mp-wheel' + (on ? ' is-on' : '') + '" data-drone-wheel>' +
				'<svg viewBox="0 0 330 330" aria-hidden="true"><circle class="ring1" cx="165" cy="165" r="104"></circle><circle class="ring2" cx="165" cy="165" r="92"></circle><circle class="core" cx="165" cy="165" r="80"></circle>' + strings + '</svg>' +
				'<div class="mp-wheel-notes" role="group" aria-label="Note, in circle-of-fifths order">' + wheel + '</div>' +
			'</div>' +
			'<div class="mp-drone-read"><div><b class="mp-drone-name">' + names[droneOpts.note] + ' <span class="mp-knock">' + (droneOpts.first === 'sa' ? 'Sa' : 'Sa · ' + firstLabel[1]) + '</span></b>' +
				'<span class="mp-small" data-drone-status>' + (droneState === 'tuning' ? 'Tuning the strings…' : on ? 'Playing until you stop it' : 'Low Sa ' + strs[3].f.toFixed(1) + ' Hz · ' + (droneOpts.tuning === 'just' ? 'just' : 'equal') + ' · A = ' + droneOpts.a4) + '</span></div>' +
				'<button type="button" class="mp-sq-big' + (on ? ' is-on' : '') + '" data-drone-go aria-pressed="' + on + '" aria-label="' + (on ? 'Stop the drone' : 'Play the drone') + '">' + (on ? '<i class="sq"></i>' : '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M6 3l13 8-13 8z" fill="currentColor"/></svg>') + '</button></div>' +
			'<div class="mp-drone-opts2">' +
				'<div><span class="mp-lbl">First string</span><div class="mp-caps" role="group" aria-label="First string">' + DRONE_FIRST.map(function (f) { return '<button type="button" data-drone-first="' + f[0] + '" aria-pressed="' + (droneOpts.first === f[0]) + '">' + (f[0] === 'sa' ? 'Sa only' : f[1] + ' · ' + { pa: '5th', ma: '4th', ni: '7th' }[f[0]]) + '</button>'; }).join('') + '</div></div>' +
				'<div class="mp-two"><div><span class="mp-lbl">Register</span><div class="mp-caps" role="group" aria-label="Register">' + DRONE_REG.map(function (r) { return '<button type="button" data-drone-reg="' + r[0] + '" aria-pressed="' + (+droneOpts.register === r[0]) + '">' + { '-1': 'Low', '0': 'Mid', '1': 'High' }[r[0]] + '</button>'; }).join('') + '</div></div>' +
				'<div><span class="mp-lbl">Intonation</span><div class="mp-caps" role="group" aria-label="Intonation">' + DRONE_TUNING.map(function (t) { return '<button type="button" data-drone-tuning="' + t[0] + '" aria-pressed="' + (droneOpts.tuning === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div></div></div>' +
				'<p class="mp-small" style="margin:0">' + (droneOpts.first === 'sa' ? 'With Sa only, just and equal sound the same.' : droneOpts.tuning === 'just' ? 'Just: pure intervals, as a tanpura is tuned by ear.' : 'Equal: the first string matches your frets exactly.') + '</p>' +
				'<details data-f-open="drone-more"><summary>Pace, tuning and volume</summary><div class="mp-met-opts">' +
				'<div><span class="mp-lbl">Pace</span><div class="mp-caps" role="group" aria-label="Pace">' + DRONE_PACE.map(function (p) { return '<button type="button" data-drone-pace="' + p[0] + '" aria-pressed="' + (droneOpts.pace === p[0]) + '">' + p[1] + '</button>'; }).join('') + '</div></div>' +
				'<div class="field"><label for="mp-drone-a4">Reference</label><select id="mp-drone-a4" data-drone-a4>' + [438, 439, 440, 441, 442, 443, 444].map(function (f) { return '<option value="' + f + '"' + (f === droneOpts.a4 ? ' selected' : '') + '>A = ' + f + ' Hz</option>'; }).join('') + '</select></div>' +
				'<div class="field"><label for="mp-drone-vol">Volume</label><input id="mp-drone-vol" type="range" min="0" max="100" value="' + Math.round(droneOpts.volume * 100) + '" data-drone-vol></div>' +
				'</div></details>' +
			'</div>' +
			'<p class="mp-tip"><b>Jack\'s tip</b><span>' + DRONE_TIPS[new Date().getDate() % DRONE_TIPS.length] + '</span></p>' +
			'</div>';
		return h;
	}
	function droneChange(patch) {
		Object.assign(droneOpts, patch);
		store('lbs-drone', droneOpts);
		if (drone.playing || droneState === 'tuning') { drone.play(droneOpts); } else { drone.set(droneOpts); }
		renderModule('drone');
	}
	if (drone) {
		drone.onstate = function (st) {
			var was = droneState;
			droneState = st;
			if ((was === 'stopped') !== (st === 'stopped') || st === 'tuning' || was === 'tuning') { renderModule('drone', { focus: room && room.querySelector('[data-mod="drone"]') && room.querySelector('[data-mod="drone"]').contains(document.activeElement) ? '[data-drone-go]' : null }); }
			refreshTiles(); updateDock();
		};
		drone.onpluck = function (i) {
			var el = room && room.querySelector('[data-drone-str="' + i + '"]');
			if (!el) { return; }
			el.classList.remove('hit'); void el.getBoundingClientRect(); el.classList.add('hit');
		};
	}

	/* ---- Tuner ---- */
	var tuner = window.LBSTuner ? window.LBSTuner.create() : null;
	var TUNER_STRINGS = [['B', 23], ['E', 28], ['A', 33], ['D', 38], ['G', 43], ['C', 48]];
	var tunerHold = 0, tunerDone = {}, tunerIn = { midi: 0, since: 0 };
	function midiHz(m) { return droneOpts.a4 * Math.pow(2, (m - 69) / 12); }
	function tunerArc() {
		var out = '', cx = 165, cy = 210, R = 150;
		for (var c = -50; c <= 50; c += 5) {
			var a = (c * 1.2 - 90) * Math.PI / 180, len = c % 25 === 0 ? 22 : 14;
			out += '<line class="' + (c === 0 ? 'zero' : c % 25 === 0 ? 'major' : 'minor') + '" x1="' + (cx + R * Math.cos(a)).toFixed(1) + '" y1="' + (cy + R * Math.sin(a)).toFixed(1) + '" x2="' + (cx + (R - len) * Math.cos(a)).toFixed(1) + '" y2="' + (cy + (R - len) * Math.sin(a)).toFixed(1) + '"></line>';
		}
		return out + '<text x="23" y="122">−50</text><text x="165" y="44">0</text><text x="307" y="122">+50</text>';
	}
	function renderTuner() {
		var h = head('tuner');
		if (RO) { return h + privateNote('Their own tuner.'); }
		if (!tuner || !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) { return h + '<p class="mp-note">The tuner needs a browser that can use the microphone.</p>'; }
		var on = tuner.running;
		h += '<div class="mp-tuner2' + (on ? ' is-on' : '') + '" data-tn-box>' +
			'<div class="mp-tn-dial"><svg viewBox="0 0 330 220" aria-hidden="true">' + tunerArc() + '<line class="needle" data-tn-needle x1="165" y1="112" x2="165" y2="54" transform="rotate(0 165 210)"></line></svg>' +
				'<div class="mp-tn-note"><b data-tn-note>' + (on ? '·' : '–') + '</b><small data-tn-oct></small></div></div>' +
			'<p class="mp-tn-state" data-tn-state aria-live="polite">' + (on ? 'Play an open string' : 'Tap Listen, then play one string') + '</p>' +
			'<p class="mp-tn-hint mp-num" data-tn-hint>' + (on ? 'Let it ring' : 'Reads down to a low B') + '</p>' +
			'<div class="mp-strobe" aria-hidden="true"><i data-tn-strobe></i></div>' +
			'<p class="mp-small mp-strobe-note">Strobe: drifts right when sharp, left when flat, stands still when you\'re in tune.</p>' +
			'<div class="mp-tn-strings" aria-label="Strings">' + TUNER_STRINGS.map(function (s) { return '<span data-tn-str="' + s[1] + '" class="' + (tunerDone[s[1]] ? 'done' : '') + '"><b>' + s[0] + '</b><small>' + midiHz(s[1]).toFixed(1) + '</small></span>'; }).join('') + '</div>' +
			'<div class="field mp-tn-ref"><label for="mp-tn-a4">Reference</label><select id="mp-tn-a4" data-tn-a4>' + [438, 439, 440, 441, 442, 443, 444].map(function (f) { return '<option value="' + f + '"' + (f === droneOpts.a4 ? ' selected' : '') + '>A = ' + f + ' Hz</option>'; }).join('') + '</select></div>' +
			'<div class="mp-inst-go"><button type="button" class="mp-btn block big' + (on ? ' is-on' : '') + '" data-tn-go aria-pressed="' + on + '">' + (on ? 'Stop listening' : 'Listen') + '</button></div>' +
			'<p class="mp-tip"><b>Jack\'s tip</b><span>Let each string ring and pluck it gently over the neck. The drone uses the same reference, so they always agree.</span></p>' +
			'</div>';
		return h;
	}
	if (tuner) {
		tuner.onpitch = function (r) {
			var mod = room && room.querySelector('[data-mod="tuner"]');
			if (!mod) { return; }
			var box = mod.querySelector('[data-tn-box]'), noteEl = mod.querySelector('[data-tn-note]'), stEl = mod.querySelector('[data-tn-state]'), hint = mod.querySelector('[data-tn-hint]'), needle = mod.querySelector('[data-tn-needle]'), strobe = mod.querySelector('[data-tn-strobe]');
			if (!box) { return; }
			if (!r) {
				if (Date.now() - tunerHold > 1500) { box.classList.remove('has-note', 'in-tune'); stEl.textContent = 'Play an open string'; hint.textContent = 'Let it ring'; strobe.style.animationPlayState = 'paused'; }
				return;
			}
			tunerHold = Date.now();
			var n = window.LBSTuner.note(r.hz, droneOpts.a4), c = Math.max(-50, Math.min(50, n.cents)), ac = Math.abs(n.cents);
			noteEl.textContent = n.name;
			mod.querySelector('[data-tn-oct]').textContent = n.octave;
			needle.setAttribute('transform', 'rotate(' + (c * 1.2).toFixed(1) + ' 165 210)');
			var inTune = ac < 3;
			box.classList.add('has-note'); box.classList.toggle('in-tune', inTune);
			stEl.textContent = inTune ? 'In tune' : Math.round(ac) + ' cents ' + (n.cents > 0 ? 'sharp' : 'flat');
			hint.textContent = r.hz.toFixed(1) + ' Hz · ' + (inTune ? 'next string' : n.cents > 0 ? (ac < 15 ? 'ease the peg back a touch' : 'tune down') : (ac < 15 ? 'bring it up a touch' : 'tune up'));
			strobe.style.animationDuration = Math.max(0.25, Math.min(6, 12 / Math.max(ac, 0.5))).toFixed(2) + 's';
			strobe.style.animationDirection = n.cents > 0 ? 'normal' : 'reverse';
			strobe.style.animationPlayState = inTune ? 'paused' : 'running';
			// A string held in tune for most of a second is ticked off.
			if (inTune) {
				if (tunerIn.midi !== n.midi) { tunerIn = { midi: n.midi, since: Date.now() }; }
				else if (Date.now() - tunerIn.since > 800 && !tunerDone[n.midi]) { tunerDone[n.midi] = true; }
			} else { tunerIn = { midi: 0, since: 0 }; }
			$$('[data-tn-str]', mod).forEach(function (el) { var m = +el.getAttribute('data-tn-str'); el.classList.toggle('on', m === n.midi); el.classList.toggle('done', !!tunerDone[m]); });
		};
		document.addEventListener('visibilitychange', function () {
			if (document.hidden && tuner.running) { tuner.stop(); renderModule('tuner'); }
		});
	}

	/* ---- Recorder: takes stay on this device until sent ---- */
	var takesDb = null;
	function db() {
		if (takesDb) { return takesDb; }
		takesDb = new Promise(function (res, rej) {
			if (!window.indexedDB) { rej(new Error('noidb')); return; }
			var req = indexedDB.open('lbs-takes', 1);
			req.onupgradeneeded = function () { req.result.createObjectStore('takes', { keyPath: 'id' }); };
			req.onsuccess = function () { res(req.result); };
			req.onerror = function () { rej(req.error); };
		});
		return takesDb;
	}
	function takesDo(mode, fn) {
		return db().then(function (d2) {
			return new Promise(function (res, rej) {
				var tx = d2.transaction('takes', mode), out = fn(tx.objectStore('takes'));
				tx.oncomplete = function () { res(out && out.result !== undefined ? out.result : out); };
				tx.onerror = function () { rej(tx.error); };
			});
		});
	}
	var rec = { takes: [], loaded: false, mr: null, stream: null, chunks: [], started: 0, timer: null, level: 0, ac: null, an: null, urls: {} };
	function loadTakes() {
		if (L.demo) { rec.loaded = true; rec.noStore = true; renderModule('recordings'); return Promise.resolve(); }
		return takesDo('readonly', function (s) { return s.getAll(); }).then(function (all) {
			rec.takes = (all || []).filter(function (t) { return t.user === USER; }).sort(function (a, b) { return b.created - a.created; });
			rec.loaded = true;
			renderModule('recordings');
		}).catch(function () { rec.loaded = true; rec.noStore = true; renderModule('recordings'); });
	}
	function takeUrl(t) { if (!rec.urls[t.id]) { rec.urls[t.id] = URL.createObjectURL(t.blob); } return rec.urls[t.id]; }
	function takeName(t) { var dt = new Date(t.created); return 'Take ' + dt.getDate() + ' ' + MON[dt.getMonth()] + ' ' + String(dt.getHours()).padStart(2, '0') + '.' + String(dt.getMinutes()).padStart(2, '0'); }
	function recMime() {
		var opts = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'];
		if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) { return ''; }
		for (var i = 0; i < opts.length; i++) { if (MediaRecorder.isTypeSupported(opts[i])) { return opts[i]; } }
		return '';
	}
	function recStart() {
		if (!window.MediaRecorder || !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) { toast('Recording needs a newer browser. You can still send a file from your phone\'s voice memos.'); return; }
		navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }).then(function (stream) {
			var mime = recMime();
			rec.stream = stream; rec.chunks = [];
			rec.mr = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 128000 } : undefined);
			rec.mr.ondataavailable = function (e) { if (e.data && e.data.size) { rec.chunks.push(e.data); } };
			rec.mr.onstop = recSaved;
			rec.mr.start(1000);
			rec.started = Date.now();
			try {
				rec.ac = rec.ac || new (window.AudioContext || window.webkitAudioContext)();
				rec.an = rec.ac.createAnalyser(); rec.an.fftSize = 1024;
				rec.ac.createMediaStreamSource(stream).connect(rec.an);
			} catch (e) { rec.an = null; }
			var lv = new Float32Array(1024);
			rec.timer = setInterval(function () {
				var mod = room && room.querySelector('[data-mod="recordings"]');
				var t = mod && mod.querySelector('[data-rec-time]');
				if (t) { t.textContent = clock(Date.now() - rec.started); }
				if (rec.an && mod) {
					rec.an.getFloatTimeDomainData(lv);
					var peak = 0; for (var i = 0; i < lv.length; i++) { peak = Math.max(peak, Math.abs(lv[i])); }
					var m = mod.querySelector('[data-rec-level]');
					if (m) { m.style.setProperty('--lv', Math.min(1, peak).toFixed(3)); m.classList.toggle('clip', peak > 0.98); }
				}
				if (Date.now() - rec.started > 20 * 60000) { recStop(); toast('Stopped at 20 minutes. Shorter takes are easier to send.'); }
			}, 100);
			renderModule('recordings', { focus: '[data-rec-stop]' });
		}).catch(function () { toast('The microphone wasn\'t allowed. You can switch it on in your browser\'s settings for this site.'); });
	}
	function recStop() {
		clearInterval(rec.timer); rec.timer = null;
		if (rec.mr && rec.mr.state !== 'inactive') { rec.mr.stop(); }
		if (rec.stream) { rec.stream.getTracks().forEach(function (tr) { tr.stop(); }); }
	}
	function recSaved() {
		var mime = (rec.mr && rec.mr.mimeType) || (rec.chunks[0] && rec.chunks[0].type) || 'audio/webm';
		var blob = new Blob(rec.chunks, { type: mime.split(';')[0] });
		var take = { id: tmpId(), user: USER, created: rec.started, dur: Date.now() - rec.started, mime: blob.type, blob: blob };
		rec.mr = null; rec.stream = null; rec.chunks = [];
		if (take.dur < 1500) { renderModule('recordings'); return; }
		rec.takes.unshift(take);
		if (!L.demo) takesDo('readwrite', function (s) { return s.put(take); }).catch(function () { toast('This take can\'t be kept after you leave the page, so send it or download it now.'); });
		renderModule('recordings', { focus: '[data-take-play="' + take.id + '"]' });
	}
	function takeExt(t) { return /mp4|m4a|aac/.test(t.mime) ? 'm4a' : /ogg/.test(t.mime) ? 'ogg' : 'webm'; }
	function takeDelete(id) {
		rec.takes = rec.takes.filter(function (t) { return t.id !== id; });
		if (rec.urls[id]) { URL.revokeObjectURL(rec.urls[id]); delete rec.urls[id]; }
		return takesDo('readwrite', function (s) { return s['delete'](id); }).catch(function () {});
	}
	function renderRecorder() {
		if (RO) { return ''; }
		if (!rec.loaded) { setTimeout(loadTakes, 0); }
		var recording = !!rec.mr;
		var h = '<div class="mp-recorder">' +
			(recording ?
				'<div class="mp-rec-live"><span class="mp-rec-dot" aria-hidden="true"></span><b class="mp-num" data-rec-time>' + clock(Date.now() - rec.started) + '</b><span class="mp-rec-level" data-rec-level aria-hidden="true"><i></i></span><button type="button" class="mp-btn" data-rec-stop>Stop</button></div>' :
				'<div class="mp-row" style="justify-content:flex-start;gap:1rem"><button type="button" class="mp-btn" data-rec-start>Record</button><span class="mp-small">Takes stay on this phone until you send one.</span></div>');
		if (rec.takes.length) {
			h += '<ul class="mp-list mp-takes">' + rec.takes.map(function (t) {
				return '<li class="wide"><div class="mp-row"><b>' + esc(takeName(t)) + '</b><span class="mp-small mp-num">' + clock(t.dur) + ' · ' + fmtSize(t.blob.size) + '</span></div>' +
					'<audio controls preload="metadata" src="' + takeUrl(t) + '" data-take-play="' + t.id + '"></audio>' +
					(L.ncReady ? '<input type="text" class="mp-in" data-take-note="' + t.id + '" data-f="tk-' + t.id + '" placeholder="Anything Jack should listen for? (optional)" aria-label="Note for Jack" maxlength="300">' : '') +
					'<div class="mp-row" style="justify-content:flex-start;gap:.9rem">' + (L.ncReady ? '<button type="button" class="mp-btn sm" data-take-send="' + t.id + '">Send to Jack</button>' : '') +
					'<a class="mp-x" href="' + takeUrl(t) + '" download="' + esc(takeName(t)) + '.' + takeExt(t) + '">Download</a><button type="button" class="mp-x" data-take-del="' + t.id + '">Delete</button>' +
					'<span class="mp-progress" data-take-progress="' + t.id + '" hidden><progress max="100" value="0"></progress><span class="mp-small mp-num"></span></span></div></li>';
			}).join('') + '</ul>';
		}
		return h + '</div>';
	}

	/* ---- The Shelf (shared library) ---- */
	var shelf = { data: store('lbs-shelf'), loading: false, failed: false, q: '' };
	function loadShelf() {
		if (L.demo) { shelf.data = L.demoShelf || { ok: true, sections: [] }; renderModule('shelf'); return; }
		if (shelf.loading || !navigator.onLine) { return; }
		shelf.loading = true;
		fetch(L.rest + 'library', { credentials: 'same-origin', headers: { 'X-WP-Nonce': L.nonce } }).then(function (r) { return r.json(); }).then(function (res) {
			shelf.loading = false;
			if (!res || !res.ok) { shelf.failed = true; } else { shelf.data = res; shelf.failed = false; if (!RO) { store('lbs-shelf', res); } }
			renderModule('shelf');
			if ((state.tools || {}).metronome && res && res.ok && ((res.grooves || []).length || Object.keys(res.kit || {}).length)) { renderModule('metronome'); }
		}, function () { shelf.loading = false; shelf.failed = true; renderModule('shelf'); });
	}
	/* Practice player: slow a track down without changing its pitch, and loop a section. */
	var player = { audio: null, item: null, a: null, b: null, raf: 0, rate: 1 };
	var SPEEDS = [0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 1];
	function mmss(s) { s = Math.max(0, s || 0); return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'); }
	function playerAudio() {
		if (player.audio) { return player.audio; }
		var a = new Audio();
		a.preload = 'auto';
		a.preservesPitch = true; a.mozPreservesPitch = true; a.webkitPreservesPitch = true;
		['play', 'pause', 'loadedmetadata', 'ended'].forEach(function (ev) { a.addEventListener(ev, playerSync); });
		['play', 'pause', 'ended'].forEach(function (ev) { a.addEventListener(ev, function () { updateDock(); refreshTiles(); }); });
		player.audio = a;
		return a;
	}
	function playerLoop() {
		cancelAnimationFrame(player.raf);
		var a = player.audio;
		if (!a || a.paused) { return; }
		if (player.a != null && player.b != null && a.currentTime >= player.b) { a.currentTime = player.a; }
		playerSync();
		player.raf = requestAnimationFrame(playerLoop);
	}
	function playerSync() {
		var a = player.audio, box = room && room.querySelector('[data-player-box]');
		if (!a || !box) { return; }
		var hd = box.querySelector('[data-pl-head]'), go = box.querySelector('[data-pl="play"]'), t = box.querySelector('[data-pl-time]'), wv = box.querySelector('[data-pl-wave]');
		if (hd && a.duration) { hd.style.left = (a.currentTime / a.duration * 100).toFixed(2) + '%'; }
		if (wv) { wv.setAttribute('aria-valuenow', Math.round(a.currentTime)); }
		if (t) { t.textContent = mmss(a.currentTime) + ' / ' + mmss(a.duration); }
		if (go && (go.getAttribute('aria-pressed') === 'true') === a.paused) { renderModule('shelf'); return; }
		if (!a.paused && !player.raf) { player.raf = requestAnimationFrame(playerLoop); }
		if (a.paused) { cancelAnimationFrame(player.raf); player.raf = 0; }
	}
	function fmtSize(b) { return b >= 1048576 ? (b / 1048576).toFixed(b >= 10485760 ? 0 : 1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
	/* The waveform of the track in the player: 96 peaks, worked out once per track. */
	var peaksCache = {};
	function loadPeaks(url) {
		if (peaksCache[url]) { return; }
		peaksCache[url] = 'loading';
		var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
		if (!OAC) { return; }
		fetch(url, { credentials: 'same-origin' }).then(function (r) { return r.arrayBuffer(); }).then(function (ab) {
			return new Promise(function (res, rej) { var c = new OAC(1, 2, 44100); var p = c.decodeAudioData(ab, res, rej); if (p && p.then) { p.then(res, rej); } });
		}).then(function (buf) {
			var ch = buf.getChannelData(0), n = 96, size = Math.floor(ch.length / n), peaks = [], max = 0;
			for (var i = 0; i < n; i++) { var m = 0; for (var j = i * size; j < (i + 1) * size; j += 16) { var v = Math.abs(ch[j]); if (v > m) { m = v; } } peaks.push(m); if (m > max) { max = m; } }
			peaksCache[url] = peaks.map(function (p) { return max ? p / max : 0; });
			if (player.item && player.item.url === url) { renderModule('shelf'); }
		}).catch(function () { peaksCache[url] = 'none'; });
	}
	function renderPlayer() {
		var it = player.item;
		if (!it) { return ''; }
		var a = playerAudio();
		var loop = player.a != null && player.b != null, dur = a.duration || 0;
		var peaks = peaksCache[it.url];
		if (!peaks) { setTimeout(function () { loadPeaks(it.url); }, 0); }
		var bars = Array.isArray(peaks) ? peaks : null;
		var wave = bars ? bars.map(function (p, i) {
			var at = (i + 0.5) / bars.length * dur, inLoop = loop && at >= player.a && at <= player.b;
			return '<i style="height:' + Math.max(8, Math.round(p * 100)) + '%"' + (inLoop ? ' class="in"' : '') + '></i>';
		}).join('') : '<i class="flat"></i>';
		var pct = function (t) { return dur ? (t / dur * 100).toFixed(2) + '%' : '0%'; };
		return '<div class="mp-player2" data-player-box>' +
			'<div class="mp-player-top"><div><b class="mp-player-title">' + esc(it.title) + '</b><span class="mp-small">' + (player.rate === 1 ? 'Full speed' : 'Slowed to ' + Math.round(player.rate * 100) + '%') + (it.bpm ? ' · ' + Math.round(it.bpm * player.rate) + ' bpm' : '') + ' · same pitch</span></div>' +
				'<button type="button" class="mp-sq-big' + (a.paused ? '' : ' is-on') + '" data-pl="play" aria-pressed="' + !a.paused + '" aria-label="' + (a.paused ? 'Play' : 'Pause') + '">' + (a.paused ? '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3l12 7-12 7z" fill="currentColor"/></svg>' : '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 2h4v14H3zM11 2h4v14h-4z" fill="currentColor"/></svg>') + '</button></div>' +
			'<div class="mp-wave" data-pl-wave role="slider" tabindex="0" aria-label="Position in the track" aria-valuemin="0" aria-valuemax="' + Math.round(dur) + '" aria-valuenow="' + Math.round(a.currentTime) + '">' + wave +
				(loop ? '<span class="loop" style="left:' + pct(player.a) + ';width:' + (dur ? ((player.b - player.a) / dur * 100).toFixed(2) : 0) + '%"><em>A</em><em class="b">B</em></span>' : player.a != null ? '<span class="loop" style="left:' + pct(player.a) + ';width:2px"><em>A</em></span>' : '') +
				'<span class="head" data-pl-head style="left:' + pct(a.currentTime) + '"></span></div>' +
			'<div class="mp-row mp-player-row"><span class="mp-small mp-num" data-pl-time>' + mmss(a.currentTime) + ' / ' + mmss(dur) + '</span>' +
				'<span class="mp-item-acts"><button type="button" class="mp-x" data-pl="back" aria-label="Back 5 seconds">−5 s</button><button type="button" class="mp-x" data-pl="fwd" aria-label="Forward 5 seconds">+5 s</button>' +
				'<button type="button" class="mp-x" data-pl="a">' + (player.a != null ? 'A ' + mmss(player.a) : 'Set A') + '</button><button type="button" class="mp-x" data-pl="b"' + (player.a == null ? ' disabled' : '') + '>' + (player.b != null ? 'B ' + mmss(player.b) : 'Set B') + '</button>' + (player.a != null ? '<button type="button" class="mp-x" data-pl="clear">Clear loop</button>' : '') + '<button type="button" class="mp-x" data-pl="close">Close</button></span></div>' +
			'<div class="mp-caps" role="group" aria-label="Speed">' + SPEEDS.map(function (s) { return '<button type="button" data-pl-rate="' + s + '" aria-pressed="' + (player.rate === s) + '">' + Math.round(s * 100) + '%</button>'; }).join('') + '</div>' +
			'</div>';
	}
	function prettyKey(k) {
		return String(k || '').replace(/^([A-G])b/, '$1♭').replace(/^([A-G])#/, '$1♯').replace(/\s*minor$/i, 'm').replace(/\s*major$/i, '').trim();
	}
	// The sleeve shows the tempo already, so a "90bpm" in the file name is noise.
	function sleeveTitle(t) { return String(t || '').replace(/\s*[-–·,]?\s*\b\d{2,3}\s?bpm\b/ig, '').replace(/\s*[-–]\s*$/, '').trim() || t; }
	function sleeve(it, si, idx, n) {
		var v = n % 3, playing = player.item && player.item.url === it.url;
		var big = it.key ? prettyKey(it.key) : it.kind === 'pdf' ? 'PDF' : (it.title.match(/[A-Za-z0-9]/) || ['·'])[0].toUpperCase();
		var bigCls = it.key ? 'key' : it.kind === 'pdf' ? 'tag' : 'letter';
		var meta = [it.bpm ? Math.round(it.bpm) + ' bpm' : '', it.group || '', it.kind === 'pdf' ? '' : ''].filter(Boolean).join(' · ') || fmtSize(it.size);
		var inner = '<span class="sv-top"><span class="sv-big ' + bigCls + '">' + esc(big) + '</span>' + (playing ? '<span class="sv-badge">Now playing</span>' : it.new ? '<span class="sv-badge">New</span>' : '') + '</span>' +
			'<span class="sv-bottom"><span class="sv-title">' + esc(sleeveTitle(it.title)) + '</span><span class="sv-meta">' + esc(meta) + '</span></span>';
		if (it.locked) { return '<button type="button" class="mp-sleeve v' + v + ' is-locked" data-demo-lock>' + inner.replace('</span></span>', '</span><span class="sv-lock">Members</span></span>') + '</button>'; }
		if (it.kind === 'audio') { return '<button type="button" class="mp-sleeve v' + v + (playing ? ' is-playing' : '') + '" data-pl-open="' + si + ':' + idx + '" aria-label="' + esc('Play ' + it.title) + '">' + inner + '</button>'; }
		return '<a class="mp-sleeve v' + v + '" href="' + esc(it.kind === 'file' ? it.dl : it.url) + '" target="_blank" rel="noopener">' + inner + '</a>';
	}
	function renderShelf() {
		var h = head('shelf');
		if (!shelf.data && !shelf.loading) { setTimeout(loadShelf, 0); }
		if (!shelf.data) { return h + '<p class="mp-note">' + (shelf.failed ? 'The Shelf couldn\'t be reached. Try again when you\'re online.' : 'Fetching the Shelf…') + '</p>'; }
		var sections = shelf.data.sections || [];
		if (!sections.length) { return h + '<p class="mp-note">Nothing on the Shelf yet. Backing tracks, drones and course material will appear here as Jack adds them.</p>'; }
		var q = shelf.q.trim().toLowerCase();
		h += '<div class="field mp-shelf-search"><label for="mp-shelf-q">Search the Shelf</label><input id="mp-shelf-q" type="search" data-shelf-q data-f="shelf-q" placeholder="Try a key, a tempo or a title" value="' + esc(shelf.q) + '"></div>';
		var shown = 0, n = 0;
		h += sections.map(function (sec, si) {
			var items = sec.items.filter(function (it) { return !q || (it.title + ' ' + it.group + ' ' + (it.key || '') + ' ' + (it.bpm ? it.bpm + ' bpm' : '') + ' ' + sec.name).toLowerCase().indexOf(q) !== -1; });
			if (!items.length) { return ''; }
			shown += items.length;
			var newN = items.filter(function (it) { return it.new; }).length;
			return '<section class="mp-shelf-row"><div class="mp-shelf-row-head"><h3>' + esc(sec.name) + '</h3><span class="mp-small mp-num">' + items.length + (newN ? ' · ' + newN + ' new' : '') + '</span></div>' +
				'<div class="mp-sleeves' + (q ? ' wrap' : '') + '">' + items.map(function (it) { return sleeve(it, si, sec.items.indexOf(it), n++); }).join('') + '</div></section>';
		}).join('');
		if (!shown) { h += '<p class="mp-note">Nothing matches that. Try a key or a tempo.</p>'; }
		h += '<p class="mp-small">Tap a track to play it in the practice player, where you can slow it down and loop a section. Worksheets and transcriptions open in a new tab.</p>';
		h += renderPlayer();
		return h;
	}

	/* ---- Songs ---- */
	function renderSongs() {
		var cols = ['Learning', 'Can play', 'Want to learn'];
		var moves = [[1, 'Can play now'], [0, 'Back to learning'], [0, 'Start learning']];
		var h = head('songs');
		h += '<div class="mp-songs">' + cols.map(function (c, ci) {
			var items = list('songs').filter(function (s) { return +s.s === ci; });
			return '<div><h5>' + c + '</h5><ul>' + (items.length ? items.map(function (s) {
				if (editing('songs', s)) { return '<li>' + editForm('songs', s) + '</li>'; }
				return '<li><b>' + esc(s.t) + '</b>' + (s.a ? '<small>' + esc(s.a) + '</small>' : '') + (RO ? '' : '<span class="row"><button type="button" data-song-move="' + esc(s.id) + '" data-s="' + moves[ci][0] + '">' + moves[ci][1] + '</button>' + acts('songs', s, { label: s.t }) + '</span>') + '</li>';
			}).join('') : '<li class="none"><small>Nothing here yet</small></li>') + '</ul></div>';
		}).join('') + '</div>';
		if (!RO) { h += '<form class="mp-inline" data-form="song" novalidate><input type="text" data-song-t data-f="s-t" placeholder="Song" aria-label="Song title" maxlength="120"><input type="text" data-song-a data-f="s-a" placeholder="Artist" aria-label="Artist" maxlength="120"><button class="mp-btn sm" type="submit">Want to learn</button></form>'; }
		return h;
	}

	/* ---- Goals ---- */
	function renderGoals() {
		var labels = { not_yet: 'Not yet', started: 'Started', on_track: 'On track', done: 'Done' };
		var h = head('goals');
		var gs = list('goals');
		h += '<ul class="mp-list">' + (gs.length ? gs.map(function (g) {
			if (editing('goals', g)) { return '<li class="wide">' + editForm('goals', g) + '</li>'; }
			return '<li><span><b>' + esc(g.text) + '</b>' + (g.by ? '<small>By ' + esc(g.by) + '</small>' : '') + '</span><span class="mp-item-acts">' +
				(RO ? '<span class="mp-pill muted">' + esc(labels[g.status] || 'Not yet') + '</span>' : '<select data-goal="' + esc(g.id) + '" aria-label="Progress on ' + esc(g.text) + '">' + Object.keys(labels).map(function (k) { return '<option value="' + k + '"' + (g.status === k ? ' selected' : '') + '>' + labels[k] + '</option>'; }).join('') + '</select>' + acts('goals', g, { label: g.text })) + '</span></li>';
		}).join('') : '<li><span class="mp-note">What are you working towards? A gig, reading a chart, a particular song.</span></li>') + '</ul>';
		if (!RO) { h += '<form class="mp-inline" data-form="goal" novalidate><input type="text" data-goal-text data-f="g-text" placeholder="A goal" aria-label="Goal" maxlength="200"><input type="text" data-goal-by data-f="g-by" placeholder="By when" aria-label="By when" style="flex:0 1 8rem" maxlength="60"><button class="mp-btn sm" type="submit">Add</button></form>'; }
		h += '<p class="mp-note">You and Jack look at these together at the end of each block.</p>';
		return h;
	}

	/* ---- Recordings ---- */
	function mb(bytes) { return bytes >= 1073741824 ? (bytes / 1073741824).toFixed(1) + ' GB' : Math.max(1, Math.round(bytes / 1048576)) + ' MB'; }
	function renderRecordings() {
		var h = head('recordings');
		h += renderRecorder();
		if (L.demo) { return h + '<p class="mp-note">Record yourself and listen back. In the portal, a take you like goes straight to Jack, and the rest stay on your phone.</p>'; }
		if (!L.ncReady) { return h + '<p class="mp-note">' + (RO ? 'Sending isn\'t switched on yet.' : 'Sending takes to Jack isn\'t switched on yet. You can record and listen back in the meantime.') + '</p>'; }
		if (!RO) {
			h += '<details data-f-open="rec-file"><summary>Send a file instead</summary><form class="mp-drop" data-form="rec" novalidate><label class="mp-small" for="mp-rec-file">A phone recording is fine. Audio or video, up to ' + mb(L.maxUpload) + '.</label>' +
				'<input id="mp-rec-file" type="file" data-rec-file accept="audio/*,video/*,.m4a,.mp3,.wav,.aac,.mp4,.mov">' +
				'<input type="text" class="mp-in" data-rec-note data-f="r-note" placeholder="Anything Jack should listen for? (optional)" aria-label="Note for Jack" maxlength="300">' +
				'<div class="mp-progress" data-rec-progress hidden><progress max="100" value="0"></progress><span class="mp-small mp-num" aria-live="polite"></span></div>' +
				'<div class="mp-row"><button class="mp-btn sm" type="submit">Send to Jack</button><span class="mp-small">' + mb(L.spaceLeft) + ' of space left</span></div></form></details>';
		}
		var recs = list('recordings');
		h += '<h5 class="mp-sub">Sent to Jack</h5><ul class="mp-list">' + (recs.length ? recs.map(function (r) {
			return '<li><span><a href="' + esc(r.url) + '" target="_blank" rel="noopener"><b>' + esc(r.name) + '</b></a><small>Sent ' + (r.added === L.today ? 'today' : nice(r.added)) + (r.listened ? ' · Jack listened' : ' · Not heard yet') + (r.note ? ' · ' + esc(r.note) : '') + '</small></span>' +
				(RO ? '' : '<button type="button" class="mp-x" data-rec-del="' + esc(r.id) + '" aria-label="Delete ' + esc(r.name) + '">Delete</button>') + '</li>';
		}).join('') : '<li><span class="mp-note">Nothing sent yet.</span></li>') + '</ul>';
		if (!RO && recs.length) { h += '<p class="mp-note">Deleting a recording removes it from Jack\'s files too.</p>'; }
		return h;
	}

	/* ---- Listening ---- */
	function renderListening() {
		var h = head('listening');
		var items = list('listening').slice().reverse();
		h += '<ul class="mp-list">' + (items.length ? items.map(function (l) {
			if (editing('listening', l)) { return '<li class="wide">' + editForm('listening', l) + '</li>'; }
			return '<li><span><b>' + esc(l.title) + (l.artist ? ', ' + esc(l.artist) : '') + '</b><small>' + (l.from === 'jack' ? 'From Jack' : 'Your pick') + (l.note ? ' · ' + esc(l.note) : '') + '</small></span>' + (l.from === 'member' ? acts('listening', l, { label: l.title }) : '') + '</li>';
		}).join('') : '<li><span class="mp-note">Tracks you and Jack have recommended for each other will collect here.</span></li>') + '</ul>';
		if (isPrivateHere('listening')) { h += privateNote('Their own picks are kept private.'); }
		if (!RO) { h += '<form class="mp-inline" data-form="listen" novalidate><input type="text" data-l-title data-f="l-title" placeholder="Track" aria-label="Track" maxlength="150"><input type="text" data-l-artist data-f="l-artist" placeholder="Artist" aria-label="Artist" maxlength="120"><input type="text" data-l-note data-f="l-note" placeholder="Why it\'s worth a listen (optional)" aria-label="Note" maxlength="300" style="flex-basis:100%"><button class="mp-btn sm" type="submit">Recommend</button></form>'; }
		h += shareRow('listening', 'Share my picks with Jack');
		return h;
	}

	/* ---- Gear ---- */
	function renderGear() {
		var h = head('gear');
		if (RO) { return h + privateNote(); }
		var g = state.gear || {};
		var ago = '';
		if (g.changed) {
			var weeks = Math.floor((d(L.today) - d(g.changed)) / (7 * 864e5));
			ago = weeks <= 0 ? 'this week' : plural(weeks, 'week') + ' ago';
		}
		h += '<form class="mp-stack" style="gap:.8rem" data-form="gear" novalidate>' +
			'<div class="field"><label for="mp-g-bass">Bass</label><input id="mp-g-bass" data-g="bass" data-f="g-bass" type="text" value="' + esc(g.bass) + '" placeholder="e.g. Fender Jazz Bass, 4 string"></div>' +
			'<div class="field"><label for="mp-g-strings">Strings</label><input id="mp-g-strings" data-g="strings" data-f="g-strings" type="text" value="' + esc(g.strings) + '" placeholder="e.g. Roundwound 45 to 105"></div>' +
			'<div class="field"><label for="mp-g-changed">Strings last changed</label><input id="mp-g-changed" data-g="changed" data-f="g-changed" type="date" value="' + esc(g.changed) + '"><span class="hint">' + (ago ? 'That was ' + ago + '.' : '') + '</span></div>' +
			'<div class="field"><label for="mp-g-setup">Set-up notes</label><textarea id="mp-g-setup" data-g="setup" data-f="g-setup" placeholder="Action, pickup height, anything Jack adjusted">' + esc(g.setup) + '</textarea></div>' +
			'<div class="mp-actions"><button class="mp-btn sm" type="submit">Save</button><button type="button" class="mp-btn-ghost sm" data-strings-today>I changed my strings today</button></div></form>';
		return h;
	}

	var RENDER = { practice: renderPracticeView, diary: renderDiary, habit: renderHabit, questions: renderQuestions, tempo: renderTempo, metronome: renderMetronome, drone: renderDrone, tuner: renderTuner, shelf: renderShelf, songs: renderSongs, goals: renderGoals, recordings: renderRecordings, listening: renderListening, gear: renderGear };
	/* Tools that open as instruments: dark, full screen, one big readout (1.3.0). */
	var INSTRUMENT = { metronome: 1, drone: 1, tuner: 1, recordings: 1, practice: 1 };
	var ICONS = {
		diary: '<rect x="5" y="3" width="14" height="18"/><path d="M8 8h8M8 12h8" /><path d="M8 16h4" class="o"/>',
		habit: '<rect x="3" y="4" width="18" height="17"/><path d="M3 9h18"/><path d="M8 14l3 3 5-5" class="o"/>',
		metronome: '<path d="M8 3h8l4 18H4z"/><path d="M12 17l5-11" class="o"/>',
		tuner: '<path d="M3 17a9 9 0 0 1 18 0"/><path d="M12 17l2.5-8" class="o"/>',
		drone: '<path d="M5 3v18M15 3v18M20 3v18"/><path d="M10 3c1.5 3-1.5 6 0 9s-1.5 6 0 9" class="o"/>',
		shelf: '<path d="M3 4h4v16H3zM8.5 4h4v16h-4z"/><path d="M14 5.5l3.9-.8 3.1 15-3.9.8z" class="o"/>',
		questions: '<path d="M4 5h16v11H10l-5 4v-4H4z"/><path d="M10 9.5a2 2 0 1 1 2.6 1.9c-.4.2-.6.5-.6 1" class="o"/>',
		tempo: '<path d="M3 21h18"/><path d="M3 18l6-5 4 2 8-9" class="o"/>',
		recordings: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5" class="f"/>',
		songs: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3" class="o"/>',
		goals: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2" class="f"/>',
		listening: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="7"/><rect x="17" y="14" width="4" height="7" class="o"/>',
		gear: '<path d="M7 21V9l5-6 5 6v12"/><path d="M10 12h4M10 15h4M10 18h4" class="o"/>'
	};
	function icon(k, size) { return '<svg class="mp-ico" width="' + (size || 24) + '" height="' + (size || 24) + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[k] || '') + '</svg>'; }
	var BACK = '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M11 3L5 9l6 6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';

	function renderChooser() {
		if (RO) { return ''; }
		return '<div class="mp-chooser" id="mp-chooser"' + (ui.chooser ? '' : ' hidden') + '>' +
			'<div class="mp-row"><h4>Your tools</h4><span class="mp-small">Switch on what you\'ll use. You can change this any time.</span></div>' +
			'<div class="mp-chooser-list">' + ORDER.map(function (k) {
				var v = VIS[L.tools[k][2]];
				return '<label class="mp-ch"><b>' + esc(L.tools[k][0]) + '</b><small>' + esc(L.tools[k][1]) + '</small><span class="mp-pill ' + v[0] + '">' + v[1] + '</span><input class="mp-tgl" type="checkbox" data-tool="' + k + '"' + ((state.tools || {})[k] ? ' checked' : '') + ' aria-label="Use ' + esc(L.tools[k][0]) + '"></label>';
			}).join('') + '</div><div><button type="button" class="mp-btn sm" data-chooser-done>Done</button></div></div>';
	}
	function onTools() { return ORDER.filter(function (k) { return (state.tools || {})[k]; }); }

	/* What each tile says about its tool right now. */
	function tileInfo(k) {
		var t = { line: '', badge: '', live: false, mini: '' };
		if (k === 'diary') {
			var st = diaryStats();
			t.line = st.days ? plural(st.days, 'day') + ' since ' + (L.since ? L.sinceLabel : 'you started') : 'Nothing logged yet';
		} else if (k === 'habit') {
			var hb = habitData();
			if (!hb.private && +hb.days && +hb.min) {
				var hs = habitStats(hb, dayMinutes(), L.today);
				t.line = hs.thisWeek + ' of ' + hs.goalDays + ' days this week';
				var wk = [];
				for (var i = 0; i < 7; i++) { var ds = addDays(mondayOf(L.today), i), mm = dayMinutes()[ds] || 0; wk.push('<i style="height:' + Math.max(2, Math.min(18, Math.round(mm / hb.min * 12))) + 'px"' + (mm >= hb.min ? ' class="on"' : '') + '></i>'); }
				t.mini = '<span class="mp-tile-faders">' + wk.join('') + '</span>';
			} else { t.line = hb.private ? 'Kept private' : 'Set a goal'; }
		} else if (k === 'questions') {
			var n = list('questions').filter(function (q) { return !q.answered; }).length;
			t.line = n ? plural(n, 'question') + ' ready' : 'Nothing yet';
		} else if (k === 'tempo') {
			var ex = list('tempo')[0];
			t.line = ex ? ex.name + ' ' + (cleanNow(ex.log || []) || '–') + (ex.target ? ' → ' + ex.target : '') : 'Add an exercise';
		} else if (k === 'metronome') {
			t.line = (met && met.running ? met.currentBpm() : metOpts.bpm) + ' · ' + clickLabel();
			t.live = !!(met && met.running);
		} else if (k === 'drone') {
			t.line = (window.LBSDrone ? window.LBSDrone.NOTE_NAMES[droneOpts.note] : '') + ' · ' + (droneOpts.first === 'sa' ? 'Sa only' : 'Sa and ' + droneOpts.first.charAt(0).toUpperCase() + droneOpts.first.slice(1));
			t.live = droneState !== 'stopped';
		} else if (k === 'tuner') {
			t.line = 'A = ' + droneOpts.a4; t.live = !!(tuner && tuner.running);
		} else if (k === 'shelf') {
			var newN = 0; ((shelf.data && shelf.data.sections) || []).forEach(function (s) { s.items.forEach(function (it) { if (it.new) { newN++; } }); });
			t.line = 'Tracks, drones, courses'; t.badge = newN ? newN + ' new' : '';
			t.live = !!(player.audio && !player.audio.paused);
		} else if (k === 'recordings') {
			var un = rec.takes.length;
			t.line = rec.mr ? 'Recording' : un ? plural(un, 'take') + ' not sent' : 'Record and send';
			t.live = !!rec.mr;
		} else if (k === 'songs') {
			var ln = list('songs').filter(function (s) { return +s.s === 0; }).length;
			t.line = ln ? ln + ' learning' : 'Your repertoire';
		} else if (k === 'goals') {
			t.line = list('goals').length ? plural(list('goals').length, 'goal') : 'The bigger picture';
		} else if (k === 'listening') {
			t.line = list('listening').length ? plural(list('listening').length, 'track') : 'Tracks to hear';
		} else if (k === 'gear') {
			t.line = (state.gear || {}).bass || 'Your bass and strings';
		}
		return t;
	}
	function tileHtml(k) {
		var t = tileInfo(k);
		return '<button type="button" class="mp-tile' + (t.live ? ' is-live' : '') + '" data-open="' + k + '" data-tile="' + k + '">' +
			'<span class="mp-tile-top">' + icon(k) + (t.live ? '<span class="mp-live">Playing</span>' : t.badge ? '<span class="mp-pill new">' + esc(t.badge) + '</span>' : t.mini) + '</span>' +
			'<span class="mp-tile-name">' + esc(L.tools[k][0]) + '</span><span class="mp-tile-line">' + esc(t.line) + '</span></button>';
	}
	function renderHome() {
		var on = onTools();
		var hb = habitData(), chain = 0;
		if (!hb.private && +hb.days && +hb.min) { chain = habitStats(hb, dayMinutes(), L.today).chain; }
		var nx = lastNext();
		var slab = '';
		if (!RO && (state.tools || {}).diary) {
			var going = prac && prac.stage;
			slab = '<button type="button" class="mp-start" data-open="practice">' +
				'<span class="mp-start-main"><span class="mp-start-title"><svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3l12 7-12 7z" fill="currentColor"/></svg>' + (going ? 'Carry on practising' : 'Start practising') + '</span>' +
				'<span class="mp-start-sub">' + (going && prac.stage === 'run' ? 'Timer running: ' + clock(pracElapsed()) : nx ? '<b>Start with:</b> ' + esc(nx) : 'Pick what to work on, set an aim, and the timer runs.') + '</span></span>' +
				(chain ? '<span class="mp-start-chain"><b class="mp-num">' + chain + '</b><span>day chain</span></span>' : '') + '</button>';
		}
		return '<div class="mp-shed-home">' +
			'<div class="mp-shed-top"><p class="kicker">Shed tools' + (L.next ? ' · Next session ' + esc(L.next) : '') + '</p><h2 class="mp-shed-title">The <em>Shed</em></h2>' +
			(RO ? '<p class="mp-small">Their practice space between sessions. Private tools show as kept private.</p>' : '') + '</div>' +
			slab +
			(on.length ? '<div class="mp-tiles">' + on.map(tileHtml).join('') + '</div>' : '<p class="mp-empty">No tools switched on yet.' + (RO ? '' : ' Choose some below.') + '</p>') +
			(RO ? '' : '<div class="mp-shed-foot"><button type="button" class="mp-link" data-chooser aria-expanded="' + ui.chooser + '" aria-controls="mp-chooser">Choose your tools (' + on.length + ' of ' + ORDER.length + ')</button><span class="mp-small">Every tool says whether Jack can see it.</span></div>') +
			renderChooser() + '</div>';
	}
	function refreshTiles() {
		if (!room) { return; }
		$$('[data-tile]', room).forEach(function (el) {
			var k = el.getAttribute('data-tile');
			var tmp = document.createElement('div');
			tmp.innerHTML = tileHtml(k);
			var fresh = tmp.firstChild;
			el.className = fresh.className;
			el.innerHTML = fresh.innerHTML;
		});
	}

	/* ---- Opening and closing a tool (the phone's back button closes it) ---- */
	function toolAllowed(k) { return k === 'practice' ? !RO && !!(state.tools || {}).diary : !!(state.tools || {})[k] && !!L.tools[k]; }
	function setToolUrl(k, push) {
		if (!HIST) { return; }
		try {
			var u = new URL(location.href);
			if (k) { u.searchParams.set('tool', k); u.searchParams.set('tab', 'practice'); } else { u.searchParams.delete('tool'); }
			if (push) { history.pushState({ lbsTool: k }, '', u.toString()); } else { history.replaceState(k ? { lbsTool: k } : null, '', u.toString()); }
		} catch (e) { /* the view still changes */ }
	}
	function openTool(k, opt) {
		opt = opt || {};
		if (!toolAllowed(k)) { return; }
		if (k === 'practice' && !prac) { prac = { user: USER, stage: 'plan', focus: [], plan: '', first: null }; pracSave(); }
		ui.open = k; ui.editing = null; ui.chooser = false;
		if (opt.push !== false) { setToolUrl(k, true); ui.pushed = true; }
		renderRoom();
		var top = room.getBoundingClientRect().top + window.pageYOffset - (L.demo ? 0 : 70);
		if (L.demoFull) { window.scrollTo(0, 0); }
		else if (!L.demo && window.pageYOffset > top) { window.scrollTo({ top: Math.max(0, top) }); }
		else if (L.demo && room.closest('.mp-demo-screen')) { room.closest('.mp-demo-screen').scrollTop = 0; }
		var h = $('#mp-h-' + k); if (h && opt.focus !== false) { h.focus({ preventScroll: true }); }
	}
	function closeTool(opt) {
		opt = opt || {};
		var was = ui.open;
		if (!was || L.solo) { return; }
		if (!opt.fromPop && ui.pushed && HIST && history.state && history.state.lbsTool) { ui.pushed = false; history.back(); return; }
		ui.open = null; ui.editing = null;
		if (!opt.fromPop) { setToolUrl(null, false); }
		renderRoom();
		var tile = room.querySelector('[data-tile="' + was + '"]') || room.querySelector('[data-open="practice"]');
		if (tile && opt.focus !== false) { tile.focus({ preventScroll: false }); }
	}
	if (HIST) {
		window.addEventListener('popstate', function (e) {
			var k = e.state && e.state.lbsTool;
			if (k && toolAllowed(k)) { ui.open = k; ui.pushed = false; renderRoom(); } else if (ui.open) { closeTool({ fromPop: true }); }
		});
	}

	/* Under a tool on a page of its own: one quiet line that there is more where it came from. */
	function soloMore(k) {
		if (!L.shedUrl) { return ''; }
		var others = { metronome: 'a drone and a tuner', drone: 'a metronome and a tuner', tuner: 'a metronome and a drone' }[k] || 'more tools';
		return '<p class="mp-solo-more">This ' + esc(L.tools[k][0].toLowerCase()) + ' is one of the tools in the Shed. There is ' + others + ' there too, and for pupils a practice diary, a recorder and backing tracks. <a href="' + esc(L.shedUrl) + '">See the Shed</a></p>';
	}
	function renderRoom() {
		if (!room) { renderOverview(); return; }
		var k = ui.open && toolAllowed(ui.open) ? ui.open : null;
		ui.open = k;
		var panel = room.closest('.mp-panel') || room.parentNode;
		if (k && L.solo) {
			room.innerHTML = '<section class="mp-mod mp-view mp-inst" data-mod="' + k + '" aria-label="' + esc(L.tools[k][0]) + '">' + RENDER[k]() + '</section>' + soloMore(k);
		} else if (k) {
			room.innerHTML = '<section class="mp-mod mp-view' + (INSTRUMENT[k] ? ' mp-inst' : '') + '" data-mod="' + k + '" aria-labelledby="mp-h-' + k + '">' + RENDER[k]() + '</section>';
		} else {
			room.innerHTML = renderHome();
		}
		if (panel) { panel.classList.toggle('mp-pn-inst', !!(k && INSTRUMENT[k])); }
		html.classList.toggle('mp-tool-open', !!k && !(panel && panel.hidden));
		renderOverview();
		updateDock();
	}

	/**
	 * Re-draw one tool, keeping anything half typed and where the focus was.
	 * opt.focus: a selector to focus afterwards. opt.clear: drop half-typed text
	 * (after it has been saved). A tool that isn't open refreshes its tile.
	 */
	function renderModule(k, opt) {
		opt = opt || {};
		var el = room && room.querySelector('[data-mod="' + k + '"]');
		if (!el) { refreshTiles(); renderOverview(); updateDock(); return; }
		if (k !== 'practice' && !(state.tools || {})[k]) { closeTool({ focus: false }); return; }
		var drafts = {}, opened = {}, active = document.activeElement, focusKey = null, hadFocus = el.contains(active);
		if (opt.clear !== true) {
			$$('[data-f]', el).forEach(function (f) {
				if (f.type === 'file' || (opt.clear && opt.clear.contains(f))) { return; }
				drafts[f.getAttribute('data-f')] = f.type === 'checkbox' ? f.checked : f.value;
			});
		}
		$$('details[data-f-open]', el).forEach(function (x) { opened[x.getAttribute('data-f-open')] = x.open; });
		if (hadFocus && active.hasAttribute('data-f')) { focusKey = '[data-f="' + active.getAttribute('data-f') + '"]'; }
		var caret = hadFocus && typeof active.selectionStart === 'number' ? [active.selectionStart, active.selectionEnd] : null;

		el.innerHTML = RENDER[k]();

		Object.keys(drafts).forEach(function (key) {
			var f = $('[data-f="' + key + '"]', el);
			if (!f) { return; }
			if (f.type === 'checkbox') { f.checked = drafts[key]; } else if (f.tagName !== 'SELECT' || key === 't-quality') { f.value = drafts[key]; }
		});
		Object.keys(opened).forEach(function (key) { var x = $('details[data-f-open="' + key + '"]', el); if (x) { x.open = opened[key]; } });

		var target = opt.focus ? $(opt.focus, el) : (focusKey ? $(focusKey, el) : null);
		if (!target && hadFocus && !el.contains(document.activeElement)) { target = $('h2[tabindex]', el); }
		if (target) {
			target.focus({ preventScroll: !opt.scroll });
			if (caret && target === $(focusKey, el) && target.setSelectionRange) { try { target.setSelectionRange(caret[0], caret[1]); } catch (e) { /* number inputs */ } }
		}
		renderOverview();
		updateDock();
		// The habit tracker counts diary minutes.
		if (k === 'diary' && !opt.chained) { renderModule('habit', { chained: true }); }
	}

	/* ---- Now playing: anything making sound (or timing) stays in view on every tab ---- */
	var dock = null;
	function dockEl() {
		if (dock) { return dock; }
		var host = (room && room.closest('.mp-demo-screen')) || $('.mp') || document.body;
		dock = document.createElement('div');
		dock.className = 'mp-dock';
		dock.setAttribute('role', 'region');
		dock.setAttribute('aria-label', 'Now playing');
		dock.hidden = true;
		host.appendChild(dock);
		dock.addEventListener('click', function (e) {
			var s = e.target.closest('[data-dock-stop]'), o = e.target.closest('[data-dock-open]');
			if (s) {
				var what = s.getAttribute('data-dock-stop');
				if (what === 'drone' && drone) { drone.stop(); }
				if (what === 'metronome') { stopMet(); }
				if (what === 'tuner' && tuner) { tuner.stop(); renderModule('tuner'); }
				if (what === 'shelf' && player.audio) { player.audio.pause(); }
				if (what === 'recordings') { recStop(); }
				updateDock();
				return;
			}
			if (o) {
				var k = o.getAttribute('data-dock-open');
				if (!L.demo) { var tab = $('.mp-tab[data-tab="practice"]'); if (tab && tab.getAttribute('aria-selected') !== 'true') { setTab('practice'); } }
				openTool(k);
			}
		});
		return dock;
	}
	function updateDock() {
		if (!room || RO) { return; }
		var items = [];
		if (prac && prac.stage === 'run') { items.push(['practice', (prac.pauseAt ? 'Paused at ' : 'Practising ') + clock(pracElapsed()), '', false]); }
		if (droneState !== 'stopped' && window.LBSDrone) { items.push(['drone', 'Drone on ' + window.LBSDrone.NOTE_NAMES[droneOpts.note], droneState === 'tuning' ? 'Tuning…' : '', true]); }
		if (met && met.running) { items.push(['metronome', 'Metronome ' + met.currentBpm(), clickLabel(), true]); }
		if (tuner && tuner.running) { items.push(['tuner', 'Tuner listening', '', true]); }
		if (player.audio && !player.audio.paused && player.item) { items.push(['shelf', player.item.title, Math.round(player.rate * 100) + '% speed', true]); }
		if (rec.mr) { items.push(['recordings', 'Recording ' + clock(Date.now() - rec.started), '', true]); }
		var shown = items.filter(function (it) { return it[0] !== ui.open; });
		var d = dockEl();
		d.hidden = !shown.length;
		html.classList.toggle('mp-has-dock', !!shown.length);
		d.innerHTML = shown.map(function (it) {
			return '<div class="mp-dock-row"><span class="mp-dock-dot" aria-hidden="true"></span><button type="button" class="mp-dock-open" data-dock-open="' + it[0] + '"><b>' + esc(it[1]) + '</b>' + (it[2] ? '<small>' + esc(it[2]) + '</small>' : '') + '</button>' +
				(it[3] ? '<button type="button" class="mp-dock-stop" data-dock-stop="' + it[0] + '" aria-label="Stop ' + esc(it[1]) + '"><i></i></button>' : '') + '</div>';
		}).join('');
		html.style.setProperty('--dock-h', (shown.length && getComputedStyle(d).position === 'fixed' ? d.offsetHeight : 0) + 'px');
	}
	setInterval(function () {
		if ((prac && prac.stage === 'run' && !prac.pauseAt) || rec.mr) { updateDock(); if (!ui.open) { var s = room && room.querySelector('.mp-start-sub'); if (s && prac && prac.stage === 'run') { s.textContent = 'Timer running: ' + clock(pracElapsed()); } } }
	}, 1000);

	/* ---- Overview summary ---- */
	function renderOverview() {
		var box = $('#mp-ov-practice');
		if (!box) { return; }
		var rows = [], t = state.tools || {};
		if (t.diary && !isPrivateHere('diary')) {
			var st = diaryStats();
			rows.push(['Practised', st.days ? plural(st.days, 'day') + (L.since ? ' since ' + L.sinceLabel : '') + ' (' + fmtMin(st.total) + ')' : 'Nothing logged yet' + (L.since ? ' since ' + L.sinceLabel : '')]);
		}
		if (t.habit) {
			var hb = habitData();
			if (!hb.private && +hb.days && +hb.min) {
				var hs = habitStats(hb, dayMinutes(), L.today);
				rows.push(['Habit', hs.chain + ' day chain · ' + hs.thisWeek + ' of ' + hs.goalDays + ' this week']);
			}
		}
		if (t.questions) {
			var n = list('questions').filter(function (q) { return !q.answered; }).length;
			rows.push(['For Jack', n ? plural(n, 'question') + ' ready' : 'No questions yet']);
		}
		if (t.tempo && list('tempo').length && !isPrivateHere('tempo')) {
			var ex = list('tempo')[0], now = cleanNow(ex.log || []);
			if (now) { rows.push([ex.name, now + ' bpm clean']); }
		}
		if (t.recordings) {
			var waiting = list('recordings').filter(function (r) { return !r.listened; }).length;
			if (waiting) { rows.push(['Recordings', waiting + ' waiting for Jack']); }
		}
		if (!rows.length) { rows.push(['Tools', RO ? 'Nothing shared yet' : 'Choose some in the Shed']); }
		box.innerHTML = rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('');
	}

	/* ---- The Shed: events ---- */
	function keyParts(v) { var i = v.indexOf(':'); return { m: v.slice(0, i), id: v.slice(i + 1) }; }

	if (room) {
		renderRoom();
		pracTick();

		room.addEventListener('click', function (e) {
			var t = e.target;
			// a tap anywhere else takes the tempo being typed (an iPhone leaves the cursor in a field when a button is tapped)
			if (metUi.typing && !t.closest('[data-met-type]')) { var tf = room.querySelector('[data-met-type]'); metType(false, tf ? tf.value : null); }
			if (t.closest('[data-demo-lock]')) { toast('That one\'s on the Shelf for members. Jack adds backing tracks, drones and course material.'); return; }
			var op = t.closest('[data-open]');
			if (op) { openTool(op.getAttribute('data-open')); return; }
			if (t.closest('[data-close]')) { closeTool(); return; }
			var qm = t.closest('[data-quick-met]');
			if (qm && met) { setBpm(+qm.getAttribute('data-quick-met')); if (!met.running) { startMet(); } openTool('metronome'); return; }
			var c = t.closest('[data-chooser]');
			if (c) {
				ui.chooser = !ui.chooser;
				$('#mp-chooser').hidden = !ui.chooser;
				c.setAttribute('aria-expanded', String(ui.chooser));
				if (ui.chooser) { var first = $('#mp-chooser [data-tool]'); if (first) { first.focus(); } }
				return;
			}
			if (t.closest('[data-chooser-done]')) {
				ui.chooser = false;
				renderRoom();
				var cb = room.querySelector('[data-chooser]');
				if (cb) { cb.focus(); }
				return;
			}
			var ed = t.closest('[data-edit]');
			if (ed) {
				var k = keyParts(ed.getAttribute('data-edit'));
				ui.editing = k;
				renderModule(k.m, { focus: '[data-edit-form] [data-k]' });
				return;
			}
			if (t.closest('[data-edit-cancel]')) {
				var was = ui.editing;
				ui.editing = null;
				if (was) { renderModule(was.m, { focus: '[data-edit="' + was.m + ':' + was.id + '"]' }); }
				return;
			}
			var rm = t.closest('[data-remove]');
			if (rm) {
				var r = keyParts(rm.getAttribute('data-remove'));
				api({ action: 'remove', module: r.m, id: r.id }, { btn: rm }).then(function (res) {
					if (!res.ok) { return; }
					if (ui.editing && ui.editing.id === r.id) { ui.editing = null; }
					renderModule(r.m, { focus: '#mp-h-' + r.m });
				});
				return;
			}
			var mv = t.closest('[data-song-move]');
			if (mv) {
				api({ action: 'song_move', id: mv.getAttribute('data-song-move'), s: +mv.getAttribute('data-s') }, { btn: mv }).then(function (res) {
					if (res.ok) { renderModule('songs', { focus: '#mp-h-songs' }); }
				});
				return;
			}
			var del = t.closest('[data-rec-del]');
			if (del) {
				if (!window.confirm('Delete this recording? It\'s removed from Jack\'s files too, and can\'t be undone.')) { return; }
				api({ action: 'rec_delete', id: del.getAttribute('data-rec-del') }, { btn: del }).then(function (res) {
					if (res.ok) { renderModule('recordings', { focus: '#mp-h-recordings' }); }
				});
				return;
			}
			if (t.closest('[data-tempo-unlog]')) {
				var ex = list('tempo').filter(function (x) { return x.id === ui.ex; })[0];
				var lastLog = ex && ex.log && ex.log[ex.log.length - 1];
				api({ action: 'tempo_unlog', id: ui.ex }, { btn: t.closest('[data-tempo-unlog]'), silent: true }).then(function (res) {
					if (!res.ok) { return; }
					renderModule('tempo', { focus: '[data-f="t-bpm"]' });
					if (lastLog) {
						toast('Removed ' + lastLog[1] + ' bpm.', function () {
							api({ action: 'tempo_log', id: ex.id, bpm: lastLog[1], quality: lastLog[2] || 'clean' }, { silent: true }).then(function (r2) { if (r2.ok) { renderModule('tempo'); toast('Put back.'); } });
						});
					}
				});
				return;
			}
			if (t.closest('[data-strings-today]')) {
				api({ action: 'strings_today' }, { btn: t.closest('[data-strings-today]') }).then(function (res) { if (res.ok) { renderModule('gear', { focus: '#mp-g-changed' }); } });
				return;
			}
			if (t.closest('[data-tn-go]')) {
				if (tuner.running) { tuner.stop(); renderModule('tuner', { focus: '[data-tn-go]' }); }
				else { tunerDone = {}; tuner.start().then(function () { renderModule('tuner', { focus: '[data-tn-go]' }); }, function () { toast('The microphone wasn\'t allowed. You can switch it on in your browser\'s settings for this site.'); }); }
				return;
			}
			if (t.closest('[data-rec-start]')) { recStart(); return; }
			if (t.closest('[data-rec-stop]')) { recStop(); return; }
			var tks = t.closest('[data-take-send]');
			if (tks) { sendTake(tks.getAttribute('data-take-send'), tks); return; }
			var tkd = t.closest('[data-take-del]');
			if (tkd) {
				if (!window.confirm('Delete this take? It hasn\'t been sent, so it\'ll be gone for good.')) { return; }
				takeDelete(tkd.getAttribute('data-take-del')).then(function () { renderModule('recordings', { focus: '#mp-h-recordings' }); });
				return;
			}
			var plo = t.closest('[data-pl-open]');
			if (plo) {
				var ix = plo.getAttribute('data-pl-open').split(':').map(Number), sec = shelf.data.sections[ix[0]], item = sec && sec.items[ix[1]];
				if (!item) { return; }
				$$('audio', room.querySelector('[data-mod="shelf"]')).forEach(function (el) { el.pause(); });
				var au = playerAudio();
				var fresh = !player.item || player.item.url !== item.url;
				if (fresh) { au.src = item.url; player.a = player.b = null; }
				player.item = item; au.playbackRate = player.rate;
				if (fresh || au.paused) { au.play().catch(function () { toast('That track couldn\'t play. Check you\'re online.'); }); }
				renderModule('shelf', { focus: '[data-pl="play"]' });
				var pbx = room.querySelector('[data-player-box]'); if (pbx) { pbx.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
				return;
			}
			var plb = t.closest('[data-pl]');
			if (plb && player.audio) {
				var pk = plb.getAttribute('data-pl'), au2 = player.audio;
				if (pk === 'play') { if (au2.paused) { au2.play().catch(function () { toast('That track couldn\'t play. Check you\'re online.'); }); } else { au2.pause(); } return; }
				if (pk === 'back') { au2.currentTime = Math.max(0, au2.currentTime - 5); }
				if (pk === 'fwd') { au2.currentTime = Math.min(au2.duration || 0, au2.currentTime + 5); }
				if (pk === 'a') { player.a = au2.currentTime; if (player.b != null && player.b <= player.a) { player.b = null; } }
				if (pk === 'b') { if (au2.currentTime > player.a + 0.3) { player.b = au2.currentTime; au2.currentTime = player.a; } else { toast('Set B a little after A.'); } }
				if (pk === 'clear') { player.a = player.b = null; }
				if (pk === 'close') { au2.pause(); player.item = null; renderModule('shelf', { focus: '#mp-h-shelf' }); return; }
				if (pk === 'a' || pk === 'b' || pk === 'clear') { renderModule('shelf', { focus: '[data-pl="' + pk + '"]' }); }
				playerSync();
				return;
			}
			var wave = t.closest('[data-pl-wave]');
			if (wave && player.audio && player.audio.duration) {
				var rct = wave.getBoundingClientRect();
				player.audio.currentTime = Math.max(0, Math.min(1, (e.clientX - rct.left) / rct.width)) * player.audio.duration;
				playerSync();
				return;
			}
			var plr = t.closest('[data-pl-rate]');
			if (plr && player.audio) { player.rate = +plr.getAttribute('data-pl-rate'); player.audio.playbackRate = player.rate; renderModule('shelf', { focus: '[data-pl-rate="' + player.rate + '"]' }); return; }
			var pb = t.closest('[data-prac]');
			if (pb) {
				var pa = pb.getAttribute('data-prac'), nowMs = Date.now();
				if (pa === 'quick') { ui.quick = !ui.quick; renderModule('diary', { focus: ui.quick ? '#mp-d-note' : '[data-prac="quick"]' }); return; }
				if (pa === 'plan') { prac = { user: USER, stage: 'plan', focus: [], plan: '', first: null }; }
				if (pa === 'cancel') {
					if (prac && prac.stage === 'run' && pracElapsed() > 60000 && !window.confirm('Discard this practice without adding it to your diary?')) { return; }
					prac = null; pracSave(); pracTick(); closeTool();
					return;
				}
				if (pa === 'pause' && prac) { prac.pauseAt = nowMs; }
				if ((pa === 'resume' || pa === 'back') && prac) { if (prac.pauseAt) { prac.paused = (prac.paused || 0) + nowMs - prac.pauseAt; prac.pauseAt = null; } prac.stage = 'run'; }
				if (pa === 'finish' && prac) { if (!prac.pauseAt) { prac.pauseAt = nowMs; } prac.stage = 'reflect'; }
				pracSave(); pracTick();
				if (ui.open !== 'practice') { openTool('practice'); return; }
				renderModule('practice', { focus: { plan: '#mp-p-plan', finish: '#mp-p-note', pause: '[data-prac="resume"]', resume: '[data-prac="pause"]', back: '[data-prac="finish"]' }[pa] });
				return;
			}
			var rp = t.closest('[data-reps]');
			if (rp && prac) { prac.reps = prac.reps === rp.getAttribute('data-reps') ? '' : rp.getAttribute('data-reps'); pracSave(); $$('[data-reps]', room).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-reps') === prac.reps)); }); return; }
			if (t.closest('[data-lookback-hide]')) { store('lbs-lookback', L.nextDate); renderModule('diary', { focus: '#mp-h-diary' }); return; }
			var lbs = t.closest('[data-lookback-send]');
			if (lbs) {
				var qs = $$('[data-lookq]:checked', room).map(function (c) { return c.getAttribute('data-lookq'); });
				if (!qs.length) { toast('Tick the ones you want to ask about.'); return; }
				qs.reduce(function (p, q) { return p.then(function () { return api({ action: 'add', module: 'questions', item: { q: q } }, { silent: true }); }); }, Promise.resolve()).then(function () {
					store('lbs-lookback', L.nextDate);
					renderModule('questions'); renderModule('diary', { focus: '#mp-h-diary' });
					toast(qs.length === 1 ? 'Added to your questions.' : plural(qs.length, 'question') + ' added.');
				});
				return;
			}
			var hgd = t.closest('[data-hg-days], [data-hg-min]');
			if (hgd) {
				var hbd = habitData();
				ui.habitDraft = ui.habitDraft || { days: +hbd.days || 4, min: +hbd.min || 15 };
				if (hgd.hasAttribute('data-hg-days')) { ui.habitDraft.days = +hgd.getAttribute('data-hg-days'); } else { ui.habitDraft.min = +hgd.getAttribute('data-hg-min'); }
				renderModule('habit', { focus: hgd.hasAttribute('data-hg-days') ? '[data-hg-days="' + ui.habitDraft.days + '"]' : '[data-hg-min="' + ui.habitDraft.min + '"]' });
				return;
			}
			if (t.closest('[data-hg-save]')) {
				var dr = ui.habitDraft || { days: 4, min: 15 };
				api({ action: 'habit', days: dr.days, min: dr.min }, { btn: t.closest('[data-hg-save]') }).then(function (res) { if (res.ok) { ui.habitDraft = null; renderModule('habit', { focus: '#mp-h-habit' }); } });
				return;
			}
			var hr = t.closest('[data-hg-rest]');
			if (hr) {
				var rest = (habitData().rest || []).slice(), wd = +hr.getAttribute('data-hg-rest'), at = rest.indexOf(wd);
				if (at >= 0) { rest.splice(at, 1); } else { rest.push(wd); }
				if (rest.length > 4) { toast('Keep at least three practice days in the week.'); return; }
				api({ action: 'habit', rest: rest }, { silent: true }).then(function (res) { if (res.ok) { renderModule('habit', { focus: '[data-hg-rest="' + wd + '"]' }); } });
				return;
			}
			if (t.closest('[data-hg-pause]')) {
				var pf = room.querySelector('[data-hg-from]').value, pt = room.querySelector('[data-hg-to]').value;
				if (!pf || !pt || pt < pf) { toast('Choose when the break starts and ends.'); room.querySelector(pt ? '[data-hg-from]' : '[data-hg-to]').focus(); return; }
				api({ action: 'habit', pause: { from: pf, to: pt } }, { btn: t.closest('[data-hg-pause]') }).then(function (res) { if (res.ok) { renderModule('habit', { clear: true, focus: '[data-hg-unpause]' }); toast('Paused. Enjoy the break.'); } });
				return;
			}
			if (t.closest('[data-hg-slot-add]')) {
				var slots = (habitData().slots || []).slice();
				var tm = room.querySelector('[data-hg-slot-time]').value;
				if (!/^\d{2}:\d{2}$/.test(tm)) { toast('Choose a time.'); return; }
				slots.push({ day: +room.querySelector('[data-hg-slot-day]').value, time: tm, min: +room.querySelector('[data-hg-slot-min]').value });
				api({ action: 'habit', slots: slots }, { btn: t.closest('[data-hg-slot-add]') }).then(function (res) { if (res.ok) { renderModule('habit', { clear: true, focus: '[data-hg-slot-day]' }); } });
				return;
			}
			var sdel = t.closest('[data-hg-slot-del]');
			if (sdel) {
				var slots2 = (habitData().slots || []).slice();
				slots2.splice(+sdel.getAttribute('data-hg-slot-del'), 1);
				api({ action: 'habit', slots: slots2 }, { silent: true }).then(function (res) { if (res.ok) { renderModule('habit', { focus: '[data-hg-slot-day]' }); } });
				return;
			}
			if (t.closest('[data-hg-unpause]')) {
				api({ action: 'habit', pause: null }, { btn: t.closest('[data-hg-unpause]') }).then(function (res) { if (res.ok) { renderModule('habit', { focus: '#mp-h-habit' }); } });
				return;
			}
			var min = t.closest('[data-min]');
			if (min) { ui.minutes = +min.getAttribute('data-min'); $$('[data-min]', room).forEach(function (b) { b.setAttribute('aria-pressed', String(b === min)); }); return; }
			if (t.closest('[data-diary-all]')) { ui.diaryAll = !ui.diaryAll; renderModule('diary', { focus: '[data-diary-all]' }); return; }
			if (t.closest('[data-add-ex]')) { ui.addEx = !ui.addEx; renderModule('tempo', { focus: ui.addEx ? '[data-ex-name]' : '[data-add-ex]' }); return; }
			if (t.closest('[data-drone-go]')) {
				if (drone.playing || droneState === 'tuning') { drone.stop(); } else { drone.play(droneOpts).catch(function () { toast('Sound isn\'t available in this browser.'); }); }
				return;
			}
			var dn = t.closest('[data-drone-note]');
			if (dn) { droneChange({ note: +dn.getAttribute('data-drone-note') }); var again = room.querySelector('[data-drone-note="' + droneOpts.note + '"]'); if (again) { again.focus(); } return; }
			var df = t.closest('[data-drone-first]');
			if (df) { droneChange({ first: df.getAttribute('data-drone-first') }); return; }
			var dr = t.closest('[data-drone-reg]');
			if (dr) { droneChange({ register: +dr.getAttribute('data-drone-reg') }); return; }
			var dt = t.closest('[data-drone-tuning]');
			if (dt) { droneChange({ tuning: dt.getAttribute('data-drone-tuning') }); return; }
			var dp = t.closest('[data-drone-pace]');
			if (dp) { droneChange({ pace: dp.getAttribute('data-drone-pace') }); return; }
			var m = t.closest('[data-met]');
			if (m) {
				var mk = m.getAttribute('data-met');
				if (/^[-+]?\d+$/.test(mk)) { setBpm(metNowBpm() + +mk); }
				if (mk === 'half') { setBpm(metNowBpm() / 2); }
				if (mk === 'double') { setBpm(metNowBpm() * 2); }
				if (mk === 'go') { if (met.running) { stopMet(); } else { startMet(); } }
				if (mk === 'tap') { tapTempo(); }
				return;
			}
			var fo = t.closest('[data-fn-open]');
			if (fo) {
				metUi.fn = metUi.fn === fo.getAttribute('data-fn-open') ? '' : fo.getAttribute('data-fn-open');
				renderModule('metronome', { focus: '[data-fn-open="' + fo.getAttribute('data-fn-open') + '"]' });
				return;
			}
			var fsw = t.closest('[data-fn-sw]');
			if (fsw) { metFnSwitch(fsw.getAttribute('data-fn-sw')); return; }
			var msw = t.closest('[data-m-sw]');
			if (msw) {
				var sk = msw.getAttribute('data-m-sw').split('.'), sp = {};
				if (sk.length === 2) { sp[sk[0]] = Object.assign({}, metOpts[sk[0]]); sp[sk[0]][sk[1]] = !metOpts[sk[0]][sk[1]]; }
				else { sp[sk[0]] = sk[0] === 'countIn' ? (metOpts.countIn ? 0 : 1) : !metOpts[sk[0]]; }
				metSave(sp, false);
				renderModule('metronome', { focus: '[data-m-sw="' + msw.getAttribute('data-m-sw') + '"]' });
				return;
			}
			var mstep = t.closest('[data-m-step], [data-m-pick]');
			if (mstep) {
				var pick = mstep.hasAttribute('data-m-pick'), sv = mstep.getAttribute(pick ? 'data-m-pick' : 'data-m-step').split(':'), sg = sv[0].split('.'), cur = metOpts[sg[0]][sg[1]];
				var nv = pick ? +sv[1] : (cur === '' ? Math.round(metOpts.bpm / 5) * 5 : +cur) + +sv[1];
				if (sv[0] === 'up.by' && !nv) { nv = +sv[1] > 0 ? 1 : -1; } // from 1 down, the next step is minus 1: nothing changes the tempo by nought
				metNum(sv[0], nv, pick ? '[data-m-pick="' + sv[0] + ':' + sv[1] + '"]' : '[data-m-step="' + sv[0] + ':' + sv[1] + '"]');
				return;
			}
			var msu = t.closest('[data-met-setup]');
			if (msu) { metRecall(msu.getAttribute('data-met-setup')); return; }
			var msd = t.closest('[data-met-setup-del]');
			if (msd) {
				var di = +msd.getAttribute('data-met-setup-del'), gone = metOpts.setups[di];
				metOpts.setups = metOpts.setups.filter(function (x, i) { return i !== di; });
				metStore();
				renderModule('metronome', { focus: '#mp-m-setup-name' });
				toast('Deleted “' + gone.name + '”.', function () { metOpts.setups.splice(di, 0, gone); metStore(); renderModule('metronome'); });
				return;
			}
			var mkeep = t.closest('[data-met-keep]');
			if (mkeep) { setBpm(+mkeep.getAttribute('data-met-keep')); renderModule('metronome', { focus: '[data-met-swipe]' }); return; }
			var mpan = t.closest('[data-met-panel]');
			if (mpan) {
				ui.metPanel = ui.metPanel === mpan.getAttribute('data-met-panel') ? '' : mpan.getAttribute('data-met-panel');
				renderModule('metronome', { focus: '[data-met-panel="' + mpan.getAttribute('data-met-panel') + '"]' });
				if (ui.metPanel) { var pnl = room.querySelector('.mp-m-panel'); if (pnl && pnl.scrollIntoView) { pnl.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } }
				return;
			}
			var cell = t.closest('[data-met-cell]');
			if (cell) {
				var ci = +cell.getAttribute('data-met-cell'), acc = metOpts.accents.slice();
				acc[ci] = MET.LEVELS[(MET.LEVELS.indexOf(acc[ci]) + 1) % MET.LEVELS.length];
				metSave({ accents: acc }, false);
				cell.classList.remove('lv-accent', 'lv-normal', 'lv-soft', 'lv-mute'); cell.classList.add('lv-' + acc[ci]);
				cell.setAttribute('aria-label', 'Beat ' + (ci + 1) + ', ' + LEVEL_NAME[acc[ci]]);
				var lvl = cell.querySelector('.lv'); if (lvl) { lvl.textContent = { mute: 'Silent', soft: 'Soft', accent: 'Accent', normal: '' }[acc[ci]]; }
				return;
			}
			var mseg = t.closest('[data-met-which], [data-met-every], [data-met-where], [data-met-gap], [data-met-sound], [data-met-gnum]');
			if (mseg) {
				var patch = {}, pkey = '';
				['which', 'every', 'where', 'gap', 'sound', 'gnum'].forEach(function (k) { if (mseg.hasAttribute('data-met-' + k)) { pkey = k; patch[k] = mseg.getAttribute('data-met-' + k); } });
				var pval = patch[pkey];
				if (patch.every) { patch.every = +patch.every; }
				if (pkey === 'gnum') { patch = { groove: Object.assign({}, metOpts.groove, { groove: +pval }) }; }
				metSave(patch);
				// choosing a sound plays it, unless the metronome is already doing that
				if (pkey === 'sound' && !met.running) { met.preview(); }
				var again2 = room.querySelector('[data-met-' + pkey + '="' + pval + '"]');
				if (again2) { again2.focus(); }
				return;
			}
			var ml = t.closest('[data-met-log]');
			if (ml) {
				var q = ml.getAttribute('data-met-log'), lbpm = metUi.last;
				metUi.last = 0;
				if (!q) { renderModule('metronome'); return; }
				var exId = ui.ex || (list('tempo')[0] || {}).id;
				api({ action: 'tempo_log', id: exId, bpm: lbpm, quality: q }, { btn: ml, silent: true }).then(function (res) {
					renderModule('metronome');
					if (res.ok) { renderModule('tempo'); toast('Logged ' + lbpm + ' bpm.'); }
				});
				return;
			}
			var mp = t.closest('[data-met-practise]');
			if (mp) {
				if (!(state.tools || {}).metronome) { return; }
				setBpm(+mp.getAttribute('data-met-practise'));
				if (metOpts.up.on) { metSave({ up: Object.assign({}, metOpts.up, { on: false }) }, false); }
				renderModule('metronome');
				var mm = room.querySelector('[data-mod="metronome"]');
				if (mm) { mm.scrollIntoView({ behavior: 'smooth', block: 'start' }); var go = mm.querySelector('[data-met="go"]'); if (go) { go.focus({ preventScroll: true }); } }
				if (!met.running) { startMet(); }
				return;
			}
		});

		room.addEventListener('input', function (e) {
			if (e.target.matches('[data-met-swing]')) { var sw = e.target.value / 100; metSave({ swing: sw }, false); var sv = room.querySelector('[data-swing-val]'); if (sv) { sv.textContent = sw ? Math.round(sw * 100) + '%' : 'Straight'; } }
			if (e.target.matches('[data-met-vol]')) { var vv = {}; vv[e.target.getAttribute('data-met-vol')] = e.target.value / 100; metSave({ vol: Object.assign({}, metOpts.vol, vv) }, false); }
			if (e.target.matches('[data-met-offset]')) { metSave({ offsetMs: +e.target.value }, false); var ov = room.querySelector('[data-offset-val]'); if (ov) { ov.textContent = +e.target.value ? e.target.value + ' ms' : 'Off'; } }
			if (e.target.matches('[data-drone-vol]')) { droneOpts.volume = e.target.value / 100; store('lbs-drone', droneOpts); drone.set({ volume: droneOpts.volume }); }
			if (e.target.matches('[data-prac-jot]') && prac) { prac.jot = e.target.value; pracSave(); }
			if (e.target.matches('[data-shelf-q]')) { shelf.q = e.target.value; renderModule('shelf'); }
			if (e.target.matches('[data-pl-pos]') && player.audio) { player.audio.currentTime = e.target.value / 10; playerSync(); }
		});

		// Leaving the tempo field takes what was typed.
		room.addEventListener('focusout', function (e) {
			if (metUi.typing && e.target.matches && e.target.matches('[data-met-type]')) { metType(false, e.target.value); }
		});

		room.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && e.target.closest('[data-edit-form]')) {
				var cancel = e.target.closest('[data-edit-form]').querySelector('[data-edit-cancel]');
				if (cancel) { cancel.click(); }
			}
		});

		room.addEventListener('change', function (e) {
			var t = e.target;
			if (t.matches('[data-tool]')) {
				var tool = t.getAttribute('data-tool');
				if (tool === 'metronome' && !t.checked) { stopMet(); }
					if (tool === 'drone' && !t.checked && drone) { drone.stop(); }
				if (tool === 'tuner' && !t.checked && tuner) { tuner.stop(); }
				if (tool === 'recordings' && !t.checked && rec.mr) { recStop(); }
				if (tool === 'shelf' && !t.checked && player.audio) { player.audio.pause(); }
				api({ action: 'tool', tool: tool, on: t.checked }, { silent: true }).then(function (res) {
					if (!res.ok) { t.checked = !t.checked; return; }
					renderModule(tool);
					var btn = room.querySelector('[data-chooser]');
					if (btn) { btn.textContent = 'Choose your tools (' + onTools().length + ' of ' + ORDER.length + ')'; }
				});
				return;
			}
			if (t.matches('[data-share]')) {
				var mod = t.getAttribute('data-share');
				api({ action: 'share', module: mod, on: t.checked }).then(function (res) {
					if (res.ok) { renderModule(mod, { focus: '[data-share="' + mod + '"]' }); } else { t.checked = !t.checked; }
				});
				return;
			}
			if (t.matches('[data-when]')) { ui.when = +t.value; return; }
			if (t.matches('[data-ex]')) { ui.ex = t.value; ui.editing = null; renderModule('tempo', { focus: '#mp-tempo-ex' }); return; }
			if (t.matches('[data-goal]')) {
				var before = (list('goals').filter(function (g) { return g.id === t.getAttribute('data-goal'); })[0] || {}).status;
				api({ action: 'goal_status', id: t.getAttribute('data-goal'), status: t.value }, { silent: true }).then(function (res) {
					if (!res.ok && before) { t.value = before; }
					renderOverview();
				});
				return;
			}
			if (t.matches('[data-met-meter]')) {
				// a loop keeps to its own bar; the house drummer and the written patterns stay only if the bar still fits them
				var mg = metOpts.groove, fits = mg && (mg.kind === 'loop' || (mg.kind === 'feel' && t.value === '4/4') || (mg.id && MET.GROOVES[mg.id] && MET.GROOVES[mg.id].meter.join('/') === t.value.split(':')[0]));
				if (mg && !fits) { toast(mg.kind === 'feel' ? 'The house drummer plays in 4/4, so the drummer sits out.' : 'That pattern is in another time signature, so the drums sit out.'); }
				metSave({ meter: t.value, groove: fits ? mg : null }, true);
				var mf = room.querySelector('[data-met-meter]'); if (mf) { mf.focus(); }
				return;
			}
			if (t.matches('[data-met-sub]')) { metSave({ sub: +t.value }); var sf = room.querySelector('[data-met-sub]'); if (sf) { sf.focus(); } return; }
			if (t.matches('[data-m-num]')) { metNum(t.getAttribute('data-m-num'), t.value); return; }
			if (t.matches('[data-met-type]')) { metType(false, t.value); return; }
			if (t.matches('[data-met-groove]')) {
				var gv = t.value, gnew = null, K = heKit();
				if (gv.indexOf('f:') === 0) {
					// a feel comes on the kit that suits it best, unless the kit already chosen suits it too
					var feel = gv.slice(2), suits = K ? K.kitsFor(feel) : ['studio'], had = metOpts.groove && metOpts.groove.kind === 'feel' ? metOpts.groove.kit : '';
					gnew = { kind: 'feel', feel: feel, groove: 0, kit: suits.indexOf(had) >= 0 ? had : suits[0] };
				}
				if (gv.indexOf('p:') === 0) { gnew = { kind: 'pattern', id: gv.slice(2), kit: hasKit() ? 'kyle' : (metOpts.groove && metOpts.groove.id && metOpts.groove.kit) || 'studio' }; }
				if (gv.indexOf('l:') === 0) { var lp = shelfLoops()[+gv.slice(2)]; if (lp) { gnew = { kind: 'loop', title: lp.title, style: lp.style, bpm: lp.bpm, meter: lp.meter }; } }
				metSave({ groove: gnew });
				if (gnew && gnew.kind === 'loop') { setBpm(Math.round(gnew.bpm)); }
				var gf = room.querySelector('[data-met-groove]'); if (gf) { gf.focus(); }
				return;
			}
			if (t.matches('[data-met-kitsel]')) {
				metSave({ groove: Object.assign({}, metOpts.groove, { kit: t.value }) });
				var kf = room.querySelector('[data-met-kitsel]'); if (kf) { kf.focus(); }
				return;
			}
			if (t.matches('[data-drone-a4]')) { droneChange({ a4: +t.value }); }
			if (t.matches('[data-hg-slotcal]')) { api({ action: 'habit', slots_cal: t.checked }, { silent: true }).then(function (res) { if (!res.ok) { t.checked = !t.checked; } }); return; }
			if (t.matches('[data-tn-a4]')) { droneOpts.a4 = +t.value; store('lbs-drone', droneOpts); if (drone) { drone.set(droneOpts); } renderModule('tuner', { focus: '[data-tn-a4]' }); renderModule('drone'); }
		});

		room.addEventListener('submit', function (e) {
			var f = e.target;
			var btn = f.querySelector('button[type=submit]');
			var val = function (s) { var el = f.querySelector(s); return el ? el.value.trim() : ''; };
			var need = function (s) { if (val(s)) { return true; } f.querySelector(s).focus(); return false; };
			var after = function (module, focusSel, extra) {
				return function (res) {
					if (!res.ok) { return; }
					if (extra) { extra(res); }
					renderModule(module, { clear: f, focus: focusSel });
				};
			};

			if (f.matches('[data-edit-form]')) {
				e.preventDefault();
				var module = f.getAttribute('data-edit-form'), id = f.getAttribute('data-id'), item = {};
				$$('[data-k]', f).forEach(function (el) { item[el.getAttribute('data-k')] = el.type === 'number' ? (+el.value || 0) : el.value; });
				api({ action: 'edit', module: module, id: id, item: item }, { btn: btn }).then(function (res) {
					if (!res.ok) { return; }
					ui.editing = null;
					renderModule(module, { focus: '[data-edit="' + module + ':' + id + '"]' });
				});
				return;
			}
			var kind = f.getAttribute('data-form');
			if (!kind) { return; }
			e.preventDefault();
			if (kind === 'met-setup') {
				var sname = val('#mp-m-setup-name');
				if (!sname) { f.querySelector('#mp-m-setup-name').focus(); toast('Give the setup a name first.'); return; }
				var snap = JSON.parse(JSON.stringify(metOpts)), swapped = metOpts.setups.some(function (x) { return x.name === sname; });
				delete snap.setups;
				metOpts.setups = [{ name: sname, s: snap }].concat(metOpts.setups.filter(function (x) { return x.name !== sname; })).slice(0, 24);
				metStore();
				renderModule('metronome', { clear: f, focus: '[data-met-setup="u:0"]' });
				toast(swapped ? 'Saved. It replaces the setup that had that name.' : 'Saved. It is first in the row of setups.');
			} else if (kind === 'diary') {
				var tags = $$('[data-tag]:checked', f).map(function (c) { return c.getAttribute('data-tag'); });
				api({ action: 'add', module: 'diary', item: { date: addDays(L.today, -ui.when), min: ui.minutes, tags: tags, easier: val('#mp-d-easier'), attention: val('#mp-d-attention'), next: val('#mp-d-next'), note: val('#mp-d-note') } }, { btn: btn })
					.then(after('diary', '#mp-h-diary', function () { ui.when = 0; ui.quick = false; }));
			} else if (kind === 'prac-plan') {
				prac.focus = $$('[data-pfocus]:checked', f).map(function (c) { return c.getAttribute('data-pfocus'); });
				prac.plan = val('#mp-p-plan'); prac.first = val('#mp-p-first');
				prac.stage = 'run'; prac.started = Date.now(); prac.paused = 0; prac.pauseAt = null;
				pracSave(); pracTick();
				renderModule('practice', { clear: true, focus: '[data-prac-jot]' });
			} else if (kind === 'prac-done') {
				var pm = +val('#mp-p-min');
				if (!pm || pm < 1 || pm > 600) { f.querySelector('#mp-p-min').focus(); toast('Enter the minutes you practised.'); return; }
				var pday = iso(new Date(prac.started));
				if (pday > L.today) { pday = L.today; }
				var tlogs = $$('[data-prac-bpm]', f).filter(function (el) { return +el.value >= 20 && +el.value <= 320; }).map(function (el) {
					var tid = el.getAttribute('data-prac-bpm');
					return { action: 'tempo_log', id: tid, bpm: +el.value, quality: (f.querySelector('[data-prac-q="' + tid + '"]') || {}).value || 'clean' };
				});
				api({ action: 'add', module: 'diary', item: { date: pday, min: pm, tags: prac.focus || [], plan: prac.plan || '', reps: prac.reps || '', easier: val('#mp-p-easier'), attention: val('#mp-p-attention'), next: val('#mp-p-next'), note: val('#mp-p-note'), timed: true } }, { btn: btn })
					.then(function (res) {
						if (!res.ok) { return res; }
						return tlogs.reduce(function (p, t) { return p.then(function () { return api(t, { silent: true }); }); }, Promise.resolve()).then(function () { if (tlogs.length) { renderModule('tempo'); } return res; });
					})
					.then(function (res) {
						if (!res || !res.ok) { return; }
						prac = null; pracSave(); pracTick();
						ui.open = 'diary'; setToolUrl('diary', false);
						renderRoom();
						var hh = $('#mp-h-diary'); if (hh) { hh.focus(); }
					});
			} else if (kind === 'q') {
				if (!need('[data-q]')) { return; }
				api({ action: 'add', module: 'questions', item: { q: val('[data-q]') } }, { btn: btn }).then(after('questions', '[data-q]'));
			} else if (kind === 'tempo') {
				var bpm = +val('[data-bpm]');
				if (!bpm || bpm < 20 || bpm > 320) { f.querySelector('[data-bpm]').focus(); toast('Enter a tempo between 20 and 320 bpm.'); return; }
				api({ action: 'tempo_log', id: ui.ex, bpm: bpm, quality: val('[data-quality]') || 'clean' }, { btn: btn }).then(after('tempo', '[data-bpm]'));
			} else if (kind === 'tempo_ex') {
				if (!need('[data-ex-name]')) { return; }
				api({ action: 'add', module: 'tempo', item: { name: val('[data-ex-name]'), target: +val('[data-ex-target]') || 0 } }, { btn: btn }).then(after('tempo', '[data-bpm]', function () {
					ui.addEx = false;
					var exs = list('tempo');
					ui.ex = exs.length ? exs[exs.length - 1].id : null;
				}));
			} else if (kind === 'song') {
				if (!need('[data-song-t]')) { return; }
				api({ action: 'add', module: 'songs', item: { t: val('[data-song-t]'), a: val('[data-song-a]'), s: 2 } }, { btn: btn }).then(after('songs', '[data-song-t]'));
			} else if (kind === 'goal') {
				if (!need('[data-goal-text]')) { return; }
				api({ action: 'add', module: 'goals', item: { text: val('[data-goal-text]'), by: val('[data-goal-by]') } }, { btn: btn }).then(after('goals', '[data-goal-text]'));
			} else if (kind === 'listen') {
				if (!need('[data-l-title]')) { return; }
				api({ action: 'add', module: 'listening', item: { title: val('[data-l-title]'), artist: val('[data-l-artist]'), note: val('[data-l-note]') } }, { btn: btn }).then(after('listening', '[data-l-title]'));
			} else if (kind === 'gear') {
				var g = { action: 'gear' };
				$$('[data-g]', f).forEach(function (el) { g[el.getAttribute('data-g')] = el.value; });
				api(g, { btn: btn }).then(after('gear', '#mp-h-gear'));
			} else if (kind === 'rec') {
				uploadRecording(f);
			}
		});
	} else {
		renderOverview();
	}

	/* ---- Recordings: upload with progress ---- */
	var REC_EXT = /\.(m4a|mp3|wav|aac|ogg|oga|flac|aif|aiff|caf|mp4|m4v|mov|webm|3gp)$/i;
	/* Checks, then sends one file with progress. Resolves with the server's reply. */
	function postRecording(file, note, onprogress) {
		return new Promise(function (resolve) {
			if (RO) { resolve({ ok: false, message: 'This is a preview. Nothing can be changed here.' }); return; }
			if (!navigator.onLine) { resolve({ ok: false, message: 'Sending a recording needs signal. Try again when you\'re back online.' }); return; }
			if (!/^(audio|video)\//.test(file.type) && !REC_EXT.test(file.name)) { resolve({ ok: false, message: 'Send an audio or video file (for example .m4a, .mp3, .wav or .mp4).' }); return; }
			if (file.size > L.maxUpload) { resolve({ ok: false, message: 'That file is ' + mb(file.size) + '. The limit is ' + mb(L.maxUpload) + '. Trim it, or send a shorter take.' }); return; }
			if (file.size > L.spaceLeft) { resolve({ ok: false, message: 'Your recordings space is nearly full. Delete an old recording first.' }); return; }
			function send(retried) {
				var fd = new FormData();
				fd.append('file', file, file.name);
				fd.append('note', note || '');
				var xhr = new XMLHttpRequest();
				xhr.open('POST', L.rest + 'recording');
				xhr.withCredentials = true;
				xhr.setRequestHeader('X-WP-Nonce', L.nonce);
				xhr.upload.onprogress = function (ev) { if (ev.lengthComputable && onprogress) { onprogress(Math.round(ev.loaded / ev.total * 100)); } };
				xhr.onload = function () {
					var res = {};
					try { res = JSON.parse(xhr.responseText); } catch (err) { res = { ok: false, message: xhr.status === 413 ? 'That file is bigger than the site accepts. Trim it, or send a shorter take.' : 'The upload didn\'t finish. Try again.' }; }
					if (!retried && res.code === 'rest_cookie_invalid_nonce') { refreshNonce().then(function () { send(true); }, function () { resolve({ ok: false, message: 'You\'ve been signed out. Sign in again, then send it.' }); }); return; }
					resolve(res);
				};
				xhr.onerror = function () { resolve({ ok: false, message: 'The upload didn\'t finish. Check your connection and try again.' }); };
				xhr.send(fd);
			}
			send(false);
		}).then(function (res) {
			if (res.ok) { state = res.state || state; if (res.limits) { L.spaceLeft = res.limits.left; } }
			return res;
		});
	}
	function uploadRecording(f) {
		var input = f.querySelector('[data-rec-file]');
		var file = input.files && input.files[0];
		if (!file) { input.focus(); toast('Choose a recording first.'); return; }
		var btn = f.querySelector('button[type=submit]');
		var prog = f.querySelector('[data-rec-progress]'), bar = prog.querySelector('progress'), label = prog.querySelector('span');
		btn.disabled = true;
		prog.hidden = false; bar.value = 0; label.textContent = 'Sending…';
		postRecording(file, (f.querySelector('[data-rec-note]') || {}).value || '', function (pc) {
			bar.value = pc; label.textContent = pc < 100 ? 'Sending… ' + pc + '%' : 'Saving to Jack\'s files…';
		}).then(function (res) {
			btn.disabled = false; prog.hidden = true;
			if (!res.ok) { toast(res.message || 'That didn\'t send.'); return; }
			renderModule('recordings', { clear: true, focus: '#mp-h-recordings' });
			toast(res.message || 'Sent to Jack.');
		});
	}
	function sendTake(id, btn) {
		var t = rec.takes.filter(function (x) { return x.id === id; })[0];
		if (!t) { return; }
		var mod = room.querySelector('[data-mod="recordings"]');
		var prog = mod.querySelector('[data-take-progress="' + id + '"]'), bar = prog.querySelector('progress'), label = prog.querySelector('span');
		var noteEl = mod.querySelector('[data-take-note="' + id + '"]');
		var file;
		try { file = new File([t.blob], takeName(t) + '.' + takeExt(t), { type: t.mime }); } catch (e) { file = t.blob; file.name = takeName(t) + '.' + takeExt(t); }
		btn.disabled = true; prog.hidden = false; label.textContent = 'Sending…';
		postRecording(file, noteEl ? noteEl.value : '', function (pc) { bar.value = pc; label.textContent = pc < 100 ? pc + '%' : 'Saving…'; }).then(function (res) {
			btn.disabled = false; prog.hidden = true;
			if (!res.ok) { toast(res.message || 'That didn\'t send.'); return; }
			takeDelete(id).then(function () { renderModule('recordings', { focus: '#mp-h-recordings' }); });
			toast('Sent to Jack. It\'s in your sent list now.');
		});
	}

	/* =====================================================================
	 * Start
	 * =================================================================== */
	if (RO) { document.body.classList.add('mp-readonly'); }
	updateInstall();
	updateOnline();
})();
