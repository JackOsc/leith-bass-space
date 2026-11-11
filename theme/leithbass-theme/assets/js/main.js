/* Leith Bass Space theme JS: color theme, parallax, sticky header, mobile nav, scroll reveal. */
(function () {
	'use strict';

	document.documentElement.classList.add('js');

	/* Light/dark color theme. The small head script applies the preference before
	 * paint; this controller keeps the button, browser chrome and saved choice in
	 * sync. First-time visitors start in dark mode. */
	var root = document.documentElement;
	var themeToggle = document.querySelector('[data-theme-toggle]');
	var themeColor = document.getElementById('leithbass-theme-color');
	var themeKey = 'leithbass-theme';

	function savedTheme() {
		var saved;
		try { saved = window.localStorage.getItem(themeKey); } catch (error) { saved = null; }
		return saved === 'light' || saved === 'dark' ? saved : null;
	}

	function applyTheme(theme, save) {
		var dark = theme === 'dark';
		root.setAttribute('data-theme', dark ? 'dark' : 'light');
		root.style.colorScheme = dark ? 'dark' : 'light';
		if (themeColor) { themeColor.setAttribute('content', dark ? '#090909' : '#F3EFE7'); }
		if (themeToggle) {
			themeToggle.setAttribute('aria-pressed', dark ? 'true' : 'false');
			themeToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
		}
		if (save) {
			try { window.localStorage.setItem(themeKey, dark ? 'dark' : 'light'); } catch (error) { /* Storage may be disabled. */ }
		}
	}

	applyTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light', false);
	if (themeToggle) {
		themeToggle.addEventListener('click', function () {
			applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
		});
	}
	var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
	var reduced = motionQuery.matches;

	/* Sticky header state */
	var header = document.getElementById('site-header');
	function onScrollHeader() {
		if (header) {
			header.classList.toggle('scrolled', window.scrollY > 40);
		}
	}
	onScrollHeader();

	/* Load below-the-fold knockout photographs only as they approach the viewport.
	 * The text stays legible in the current ink colour until the image is ready. */
	var lazyKnockouts = [].slice.call(document.querySelectorAll('[data-knockout-image]'));

	function loadKnockout(el) {
		var url = el.getAttribute('data-knockout-image');
		if (!url) { return; }
		el.removeAttribute('data-knockout-image');
		var photo = new Image();
		photo.onload = function () {
			el.style.backgroundImage = 'url("' + url.replace(/["\\]/g, '\\$&') + '")';
			el.classList.add('has-image');
			if (bgLayers) { onScroll(); }
		};
		photo.src = url;
	}

	if ('IntersectionObserver' in window) {
		var knockoutObserver = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) {
					loadKnockout(entry.target);
					knockoutObserver.unobserve(entry.target);
				}
			});
		}, { rootMargin: '400px 0px' });
		lazyKnockouts.forEach(function (el) { knockoutObserver.observe(el); });
	} else {
		lazyKnockouts.forEach(loadKnockout);
	}

	/* Scroll-linked parallax. The image layer is taller than its clipped frame;
	 * as the frame crosses the viewport, the layer travels from the top of that
	 * spare area to the bottom. This creates continuous, visible movement while
	 * keeping every image edge outside the frame. */
	var layers = [].slice.call(document.querySelectorAll('[data-parallax]'));
	var bgLayers = [].slice.call(document.querySelectorAll('[data-parallax-bg]'));
	var ticking = false;

	/* 0 on entry, 0.5 at the viewport centre, 1 on exit. */
	function progress(rect, vh) {
		var value = (vh - rect.top) / (vh + rect.height);
		return Math.max(0, Math.min(1, value));
	}

	function updateParallax() {
		ticking = false;
		var vh = window.innerHeight;

		layers.forEach(function (el) {
			var frame = el.parentElement;
			var rect = frame.getBoundingClientRect();
			if (rect.bottom < -80 || rect.top > vh + 80) {
				el.classList.remove('is-parallax-active');
				return;
			}
			el.classList.add('is-parallax-active');
			var strength = parseFloat(el.getAttribute('data-parallax'));
			strength = isNaN(strength) ? 0.82 : Math.max(0, Math.min(1, strength));
			var room = Math.max(0, (el.offsetHeight - frame.clientHeight) / 2 - 2);
			var shift = (progress(rect, vh) * 2 - 1) * room * strength;
			el.style.setProperty('--parallax-y', shift.toFixed(2) + 'px');
		});

		bgLayers.forEach(function (el) {
			if (!el.classList.contains('has-image')) { return; }
			var rect = el.getBoundingClientRect();
			if (rect.bottom < -80 || rect.top > vh + 80) {
				el.classList.remove('is-parallax-active');
				return;
			}
			el.classList.add('is-parallax-active');
			var amount = parseFloat(el.getAttribute('data-parallax-bg'));
			var focal = parseFloat(el.getAttribute('data-parallax-focal')) || 50;
			amount = isNaN(amount) ? 58 : Math.max(0, Math.min(100, amount));
			var range = amount * 0.48;
			var position = focal + (0.5 - progress(rect, vh)) * 2 * range;
			position = Math.max(1, Math.min(99, position));
			el.style.backgroundPosition = 'center ' + position.toFixed(2) + '%';
		});
	}

	function resetParallax() {
		layers.forEach(function (el) {
			el.style.removeProperty('--parallax-y');
			el.classList.remove('is-parallax-active');
		});
		bgLayers.forEach(function (el) {
			var focal = parseFloat(el.getAttribute('data-parallax-focal')) || 50;
			el.style.backgroundPosition = 'center ' + focal + '%';
			el.classList.remove('is-parallax-active');
		});
	}

	function onScroll() {
		onScrollHeader();
		if (!reduced && !ticking && (layers.length || bgLayers.length)) {
			ticking = true;
			window.requestAnimationFrame(updateParallax);
		}
	}
	window.addEventListener('scroll', onScroll, { passive: true });
	window.addEventListener('resize', onScroll, { passive: true });
	window.addEventListener('orientationchange', onScroll, { passive: true });
	// images finishing, a restored scroll position, or a bfcache restore all
	// change the maths, so recompute rather than leaving a layer mid-travel
	window.addEventListener('load', onScroll);
	window.addEventListener('pageshow', onScroll);
	layers.forEach(function (el) {
		var image = el.querySelector('img');
		if (image && !image.complete) { image.addEventListener('load', onScroll, { once: true }); }
	});
	if ('ResizeObserver' in window && (layers.length || bgLayers.length)) {
		var resizeObserver = new ResizeObserver(onScroll);
		layers.forEach(function (el) { resizeObserver.observe(el.parentElement); });
	}
	if (!reduced) { updateParallax(); }
	if (motionQuery.addEventListener) {
		motionQuery.addEventListener('change', function (event) {
			reduced = event.matches;
			if (reduced) { resetParallax(); } else { updateParallax(); }
		});
	}

	/* Mobile nav */
	var toggle = document.querySelector('.nav-toggle');
	var nav = document.getElementById('site-nav');
	if (toggle && nav) {
		var toggleLabel = toggle.querySelector('.nav-toggle-label');
		var labelClosed = toggle.getAttribute('data-label-closed') || 'Menu';
		var labelOpen = toggle.getAttribute('data-label-open') || 'Close';
		function setNav(open, restoreFocus) {
			nav.classList.toggle('open', open);
			document.body.classList.toggle('nav-open', open);
			toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
			toggle.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
			if (toggleLabel) { toggleLabel.textContent = open ? labelOpen : labelClosed; }
			if (open) {
				// The phone list is the visible one; skip the hidden desktop list.
				var firstLink = [].filter.call(nav.querySelectorAll('a'), function (a) { return a.offsetParent !== null; })[0];
				if (firstLink) { firstLink.focus(); }
			} else if (restoreFocus) {
				toggle.focus();
			}
		}
		toggle.addEventListener('click', function () {
			setNav(!nav.classList.contains('open'), false);
		});
		nav.addEventListener('click', function (e) {
			if (e.target.tagName === 'A') {
				setNav(false, false);
			}
		});
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && nav.classList.contains('open')) {
				setNav(false, true);
				return;
			}
			if (e.key === 'Tab' && nav.classList.contains('open')) {
				var links = [].slice.call(nav.querySelectorAll('a, button')).filter(function (el) {
					return el.offsetParent !== null;
				});
				var focusable = [toggle].concat(links);
				var first = focusable[0];
				var last = focusable[focusable.length - 1];
				if (e.shiftKey && document.activeElement === first) {
					e.preventDefault(); last.focus();
				} else if (!e.shiftKey && document.activeElement === last) {
					e.preventDefault(); first.focus();
				}
			}
		});
	}

	/* Dropdowns. The arrow button opens and closes a main item's pages (hover
	 * also opens them on desktop, in CSS). Escape or a click elsewhere closes. */
	var subnavs = [].slice.call(document.querySelectorAll('[data-subnav]'));
	function setSub(item, open) {
		item.classList.toggle('open', open);
		var button = item.querySelector('.sub-toggle');
		if (button) { button.setAttribute('aria-expanded', open ? 'true' : 'false'); }
	}
	subnavs.forEach(function (item) {
		var button = item.querySelector('.sub-toggle');
		if (!button) { return; }
		button.addEventListener('click', function () {
			var open = !item.classList.contains('open');
			subnavs.forEach(function (other) { if (other !== item) { setSub(other, false); } });
			setSub(item, open);
		});
		// Leaving the item with the keyboard closes it on desktop.
		item.addEventListener('focusout', function (e) {
			if (nav && nav.classList.contains('open')) { return; }
			if (!item.contains(e.relatedTarget)) { setSub(item, false); }
		});
	});
	document.addEventListener('click', function (e) {
		if (nav && nav.classList.contains('open')) { return; }
		subnavs.forEach(function (item) { if (!item.contains(e.target)) { setSub(item, false); } });
	});
	document.addEventListener('keydown', function (e) {
		if (e.key !== 'Escape' || (nav && nav.classList.contains('open'))) { return; }
		subnavs.forEach(function (item) {
			if (item.classList.contains('open')) {
				setSub(item, false);
				var button = item.querySelector('.sub-toggle');
				if (button && item.contains(document.activeElement)) { button.focus(); }
			}
		});
	});

	/* Form responses arrive after a redirect. Place keyboard and assistive-tech
	 * focus on the result instead of leaving it at the top of the page. */
	var formNotice = document.querySelector('.form-notice[tabindex="-1"]');
	if (formNotice) { formNotice.focus(); }

	/* External links open in a new tab. The PHP filter handles theme and post
	 * content; this is the catch-all for anything rendered by a plugin. */
	(function () {
		var host = location.hostname.replace(/^www\./i, '').toLowerCase();
		[].forEach.call(document.querySelectorAll('a[href]'), function (a) {
			var url;
			try { url = new URL(a.getAttribute('href'), location.href); } catch (e) { return; }
			if (url.protocol !== 'http:' && url.protocol !== 'https:') { return; }
			if (url.hostname.replace(/^www\./i, '').toLowerCase() === host) { return; }
			a.setAttribute('target', '_blank');
			var rel = (a.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
			['noopener', 'noreferrer'].forEach(function (v) {
				if (rel.indexOf(v) === -1) { rel.push(v); }
			});
			a.setAttribute('rel', rel.join(' '));
		});
	})();

	/* Reveal on scroll */
	if ('IntersectionObserver' in window && !reduced) {
		var io = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) {
					entry.target.classList.add('visible');
					io.unobserve(entry.target);
				}
			});
		}, { rootMargin: '0px 0px -8% 0px' });
		[].forEach.call(document.querySelectorAll('.reveal'), function (el) { io.observe(el); });
	} else {
		[].forEach.call(document.querySelectorAll('.reveal'), function (el) { el.classList.add('visible'); });
	}
})();
