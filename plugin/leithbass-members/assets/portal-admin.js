/* Session edit screen: member context, the Nextcloud file picker and "Paste your notes". */
(function () {
	'use strict';
	var A = window.LBS_ADMIN;
	if (!A) { return; }
	var $ = function (s, r) { return (r || document).querySelector(s); };
	var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
	var member = $('#lbs-member');
	var filesBox = $('#lbs-files');
	var filesInput = $('#lbs-files-json');
	var folderFiles = [];     // what's in the member's folder
	var openQuestions = [];   // the member's open questions
	var pending = null;       // parsed notes waiting for files/questions to load

	function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
	function post(action, data) {
		var fd = new FormData();
		fd.append('action', action);
		fd.append('nonce', A.nonce);
		Object.keys(data || {}).forEach(function (k) { fd.append(k, data[k]); });
		return fetch(A.ajax, { method: 'POST', credentials: 'same-origin', body: fd }).then(function (r) { return r.json(); });
	}
	function selected() { try { return JSON.parse(filesInput.value || '[]'); } catch (e) { return []; } }
	function setSelected(list) { filesInput.value = JSON.stringify(list); }
	function flash(el) { if (!el) { return; } el.classList.add('lbs-filled'); setTimeout(function () { el.classList.remove('lbs-filled'); }, 1600); }

	/* ---------- Files ---------- */
	function renderFiles(folder, error) {
		var sel = selected();
		var html = '';
		if (folder) { html += '<div class="path">' + esc(folder) + '</div>'; }
		if (error) { html += '<p class="missing">' + esc(error) + '</p>'; }
		var paths = folderFiles.map(function (f) { return f.path; });
		folderFiles.forEach(function (f) {
			html += '<label><input type="checkbox" value="' + esc(f.path) + '"' + (sel.indexOf(f.path) > -1 ? ' checked' : '') + '> ' + esc(f.path) + '<span class="tag">' + esc([f.size, f.modified].filter(Boolean).join(' · ')) + '</span></label>';
		});
		sel.filter(function (p) { return paths.indexOf(p) === -1; }).forEach(function (p) {
			html += '<label><input type="checkbox" value="' + esc(p) + '" checked> ' + esc(p) + '<span class="tag missing">' + (A.ncReady && folder ? 'not in folder' : 'attached') + '</span></label>';
		});
		if (!folderFiles.length && !sel.length && !error) { html += '<p class="description">' + (folder ? 'This folder is empty or doesn\'t exist yet. Save worksheets into it and press Refresh.' : 'Choose a member to see their folder.') + '</p>'; }
		filesBox.innerHTML = html;
	}
	filesBox.addEventListener('change', function () {
		setSelected($$('input[type=checkbox]:checked', filesBox).map(function (c) { return c.value; }));
	});
	$('#lbs-file-add-btn').addEventListener('click', function () {
		var inp = $('#lbs-file-add'), v = inp.value.trim().replace(/^\/+/, '');
		if (!v) { return; }
		var sel = selected(); if (sel.indexOf(v) === -1) { sel.push(v); }
		setSelected(sel); inp.value = ''; renderFiles(filesBox.getAttribute('data-folder'));
	});
	$('#lbs-files-refresh').addEventListener('click', function () { loadFiles(); });

	function loadFiles() {
		folderFiles = [];
		if (!member.value) { renderFiles(''); return Promise.resolve(); }
		if (!A.ncReady) { renderFiles('', ''); return Promise.resolve(); }
		filesBox.innerHTML = '<p class="description">Looking in Nextcloud…</p>';
		return post('lbs_member_files', { member: member.value }).then(function (res) {
			if (!res.success) { renderFiles('', res.data || 'Couldn\'t read the folder.'); return; }
			folderFiles = res.data.files;
			filesBox.setAttribute('data-folder', res.data.folder);
			renderFiles(res.data.folder);
		}).catch(function () { renderFiles('', 'Couldn\'t reach Nextcloud just now.'); });
	}

	/* ---------- Member context ---------- */
	function loadContext() {
		if (!member.value) { return Promise.resolve(); }
		return post('lbs_member_context', { member: member.value }).then(function (res) {
			if (!res.success) { return; }
			var c = res.data;
			$('#lbs-number').placeholder = c.number;
			if (A.isNew) {
				$('#lbs-block').checked = !!c.has_block;
				if (c.last && !$('#lbs-start').value) { $('#lbs-start').value = c.last.start; }
			}
			credit = c.free;
			creditNote();
			$('#lbs-prep-box').innerHTML = c.prep_html;
			$('#lbs-block-box').innerHTML = c.block_html;
			$('#lbs-questions').innerHTML = c.q_html;
			openQuestions = c.questions || [];
		});
	}
	/* ---------- Credit check for this booking ---------- */
	var credit = null; // minutes free after everything already booked (null = no blocks)
	function hm(m) { var neg = m < 0; m = Math.abs(Math.round(m)); var h = Math.floor(m / 60), r = m % 60; return (neg ? '−' : '') + (h ? h + 'h' + (r ? ' ' + r + 'm' : '') : r + 'm'); }
	function creditNote() {
		var note = $('#lbs-credit-note');
		if (!note) { return; }
		var counted = $('#lbs-block').checked && $('#lbs-status').value === 'upcoming';
		note.className = 'lbs-wide lbs-credit-note';
		if (!member.value || !counted) { note.textContent = ''; return; }
		var need = Math.round(parseFloat($('#lbs-length').value || '1') * 60);
		if ($('#lbs-paid').checked) { note.textContent = 'Paid separately, so it\'s confirmed whatever their credit.'; return; }
		if (credit === null) {
			note.classList.add('lbs-warn');
			note.textContent = 'They have no lesson credit yet. This booking stays provisional until you add a block or tick Paid.';
			return;
		}
		var avail = credit + (+A.counted || 0);
		if (need > avail) {
			note.classList.add('lbs-warn');
			note.textContent = 'Beyond their credit: ' + hm(Math.max(0, avail)) + ' free, this needs ' + hm(need) + '. It stays provisional until they buy more or you tick Paid.';
		} else {
			note.textContent = 'Covered by their credit. Leaves ' + hm(avail - need) + ' free after this.';
		}
	}
	['#lbs-block', '#lbs-status', '#lbs-length', '#lbs-paid'].forEach(function (sel) { var el = $(sel); if (el) { el.addEventListener('change', creditNote); } });

	member.addEventListener('change', function () {
		setSelected([]);
		Promise.all([loadContext(), loadFiles()]).then(applyPendingLate);
	});
	if (member.value) { loadContext(); loadFiles(); } else { renderFiles(''); }

	/* =====================================================================
	 * "Paste your notes"
	 * =================================================================== */
	var KEYS = {
		member: ['member', 'name', 'bassist', 'who'],
		date: ['date', 'day', 'when'],
		start: ['start', 'time', 'starts'],
		length: ['length', 'duration', 'hours'],
		number: ['session', 'session no', 'session number', 'no', 'number'],
		status: ['status'],
		block: ['block', 'count', 'count against block'],
		title: ['covered', 'title', 'what we covered', 'topic', 'subject'],
		summary: ['summary', 'notes'],
		objectives: ['objectives', 'objective', 'this week', 'homework', 'to practise', 'to practice', 'practise', 'practice'],
		files: ['files', 'file', 'worksheets', 'worksheet', 'attach', 'attachments'],
		answered: ['answered', 'answers', 'questions answered', 'questions'],
		listen: ['listen', 'listening', 'tracks', 'recommend'],
		next: ['next time', 'next', 'for next time', 'next session', 'before next time'],
		prep: ['before', 'before this session', 'bring']
	};
	var SINGLE = ['member', 'date', 'start', 'length', 'number', 'status', 'block', 'title', 'prep'];
	var LOOKUP = {};
	Object.keys(KEYS).forEach(function (k) { KEYS[k].forEach(function (w) { LOOKUP[w] = k; }); });

	function parse(text) {
		var out = {}, cur = null;
		text.replace(/\r\n?/g, '\n').split('\n').forEach(function (raw) {
			var line = raw.replace(/\s+$/, '');
			if (/^\s*#/.test(line)) { return; }
			var m = line.match(/^\s*([A-Za-z][A-Za-z .'’]{0,28}?)\s*[:=]\s*(.*)$/);
			if (m) {
				var key = LOOKUP[m[1].toLowerCase().replace(/[’']/g, '\'').replace(/\s+/g, ' ').trim()];
				// A single-line field only counts the first time, so "Time: 3 mins" inside a summary stays text.
				if (key && !(SINGLE.indexOf(key) > -1 && out[key] !== undefined)) {
					cur = key;
					out[key] = out[key] || [];
					if (m[2].trim()) { out[key].push(m[2].trim()); }
					return;
				}
			}
			if (cur) { (out[cur] = out[cur] || []).push(line); }
		});
		Object.keys(out).forEach(function (k) {
			if (SINGLE.indexOf(k) > -1) { out[k] = (out[k].filter(function (l) { return l.trim(); })[0] || '').trim(); }
		});
		return out;
	}
	function items(lines) {
		return (lines || []).map(function (l) { return l.replace(/^\s*(?:[-*•–]|\d+[.)])\s*/, '').trim(); }).filter(Boolean);
	}
	function paragraphs(lines) {
		return (lines || []).join('\n').replace(/^\s+|\s+$/g, '').replace(/\n{3,}/g, '\n\n');
	}

	var MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
	function pad(n) { return String(n).padStart(2, '0'); }
	function toIso(y, m, d) {
		var dt = new Date(y, m - 1, d);
		if (dt.getMonth() !== m - 1 || dt.getDate() !== d) { return ''; }
		return y + '-' + pad(m) + '-' + pad(d);
	}
	function parseDate(v) {
		v = (v || '').toLowerCase().trim();
		if (!v) { return ''; }
		var t = new Date(A.today + 'T12:00:00');
		if (v === 'today') { return A.today; }
		if (v === 'yesterday') { t.setDate(t.getDate() - 1); return toIso(t.getFullYear(), t.getMonth() + 1, t.getDate()); }
		var m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
		if (m) { return toIso(+m[1], +m[2], +m[3]); }
		m = v.match(/(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?/);
		if (m) { var y = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : t.getFullYear(); return toIso(y, +m[2], +m[1]); }
		m = v.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})\.?,?\s*(\d{2,4})?/);
		if (m && MONTHS.indexOf(m[2].slice(0, 3)) > -1) {
			var yr = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : t.getFullYear();
			return toIso(yr, MONTHS.indexOf(m[2].slice(0, 3)) + 1, +m[1]);
		}
		return '';
	}
	function parseTime(v) {
		v = (v || '').toLowerCase().replace(/\s+/g, '');
		var m = v.match(/^(\d{1,2})(?:[:.h]?(\d{2}))?(am|pm)?$/);
		if (!m) { return ''; }
		var h = +m[1], min = m[2] ? +m[2] : 0;
		if (m[3] === 'pm' && h < 12) { h += 12; }
		if (m[3] === 'am' && h === 12) { h = 0; }
		if (!m[3] && !m[2] && h >= 1 && h <= 9) { h += 12; } // "6" means 18:00 for evening sessions
		if (h > 23 || min > 59) { return ''; }
		return pad(h) + ':' + pad(min);
	}
	function parseLength(v) {
		v = (v || '').toLowerCase().replace(/\s+/g, ' ').trim();
		if (!v) { return 0; }
		var h = 0, m;
		if ((m = v.match(/(\d+(?:\.\d+)?)\s*h(?:ou)?r?s?/))) { h += +m[1]; }
		if ((m = v.match(/(\d+)\s*m(?:in)?s?(?:utes?)?\b/))) { h += +m[1] / 60; }
		if ((m = v.match(/^(\d+)h(\d{2})$/))) { h = +m[1] + +m[2] / 60; }
		if (!h && (m = v.match(/^(\d+(?:\.\d+)?)$/))) { h = +m[1] > 8 ? +m[1] / 60 : +m[1]; }
		return h;
	}
	function norm(s) { return String(s).toLowerCase().replace(/\.[a-z0-9]{2,4}$/, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
	function fuzzyFind(query, list, key) {
		var words = norm(query).split(' ').filter(Boolean);
		if (!words.length) { return null; }
		var hits = list.filter(function (x) { var n = norm(key ? x[key] : x); return words.every(function (w) { return n.indexOf(w) > -1; }); });
		return hits.length ? hits[0] : null;
	}
	function setVal(sel, v) { var el = $(sel); if (el && v !== undefined && v !== '') { el.value = v; flash(el); return true; } return false; }

	var report = [];
	function applyPendingLate() {
		if (!pending) { return; }
		var p = pending; pending = null;
		if (p.files) {
			var sel = selected();
			items(p.files).forEach(function (q) {
				var f = fuzzyFind(q, folderFiles, 'path');
				if (f) { if (sel.indexOf(f.path) === -1) { sel.push(f.path); } report.push('File: ' + f.path); }
				else { report.push('!No file in their folder matches "' + q + '"'); }
			});
			setSelected(sel); renderFiles(filesBox.getAttribute('data-folder'));
		}
		if (p.answered) {
			items(p.answered).forEach(function (q) {
				var hit = fuzzyFind(q, openQuestions, 'q');
				var box = hit && $('#lbs-questions input[value="' + hit.id + '"]');
				if (box) { box.checked = true; report.push('Answered: ' + hit.q); }
				else { report.push('!No open question matches "' + q + '"'); }
			});
		}
		showReport();
	}
	function showReport() {
		var out = $('#lbs-paste-out');
		var good = report.filter(function (r) { return r[0] !== '!'; });
		var bad = report.filter(function (r) { return r[0] === '!'; });
		out.innerHTML = (good.length ? 'Filled in ' + good.length + ' field' + (good.length === 1 ? '' : 's') + '. Check below, then publish.' : 'Nothing recognised. Use the template headings, like "Member:" and "Summary:".') +
			(bad.length ? '<ul>' + bad.map(function (b) { return '<li class="warn">' + esc(b.slice(1)) + '</li>'; }).join('') + '</ul>' : '');
	}

	$('#lbs-paste-go').addEventListener('click', function () {
		var p = parse($('#lbs-paste').value || '');
		report = [];
		var needsMember = false;

		if (p.member) {
			var opts = $$('option', member).filter(function (o) { return o.value; });
			var want = p.member.toLowerCase();
			var hit = opts.filter(function (o) { return o.textContent.toLowerCase() === want || (o.getAttribute('data-email') || '').toLowerCase() === want; })[0] ||
				opts.filter(function (o) { return o.textContent.toLowerCase().indexOf(want) > -1; })[0] ||
				opts.filter(function (o) { return want.indexOf(o.textContent.toLowerCase().split(' ')[0]) === 0; })[0];
			if (hit) {
				if (member.value !== hit.value) { member.value = hit.value; needsMember = true; setSelected([]); }
				flash(member); report.push('Member');
			} else { report.push('!No member called "' + p.member + '"'); }
		}
		var dt = parseDate(p.date);
		if (p.date && !dt) { report.push('!Couldn\'t read the date "' + p.date + '". Try 22/09/2026.'); }
		if (setVal('#lbs-date', dt)) { report.push('Date'); }
		var tm = parseTime(p.start);
		if (p.start && !tm) { report.push('!Couldn\'t read the start time "' + p.start + '". Try 18:00.'); }
		if (setVal('#lbs-start', tm)) { report.push('Start'); }
		var len = parseLength(p.length);
		if (len) {
			var sel = $('#lbs-length'), best = null;
			$$('option', sel).forEach(function (o) { if (best === null || Math.abs(+o.value - len) < Math.abs(+best.value - len)) { best = o; } });
			if (best) { sel.value = best.value; flash(sel); report.push('Length'); }
		}
		if (p.number && /^\d+$/.test(p.number)) { setVal('#lbs-number', p.number); report.push('Session no.'); }
		if (p.status) {
			var s = p.status.toLowerCase(), st = '';
			if (/cancel/.test(s)) { st = /charg|paid/.test(s) && !/not|no |free|un/.test(s) ? 'cancelled_charged' : 'cancelled_free'; }
			else if (/done|taken|complete|happened|yes/.test(s)) { st = 'done'; }
			else if (/up|book|next|plan/.test(s)) { st = 'upcoming'; }
			if (setVal('#lbs-status', st)) { report.push('Status'); } else { report.push('!Status "' + p.status + '" isn\'t one of done, upcoming or cancelled'); }
		} else if (p.summary || p.objectives) {
			setVal('#lbs-status', 'done'); report.push('Status (done)');
		}
		if (p.block) {
			var b = $('#lbs-block'); b.checked = /^(y|yes|true|1|on|block)/i.test(p.block); flash(b.parentElement); report.push('Block');
		}
		if (p.title) {
			var title = $('#title');
			title.value = p.title; flash(title);
			var prompt = $('#title-prompt-text'); if (prompt) { prompt.classList.add('screen-reader-text'); }
			report.push('Title');
		}
		if (p.prep) { setVal('#lbs-prep-note', p.prep); report.push('Before this session'); }
		if (p.summary && paragraphs(p.summary)) { setVal('#lbs-summary', paragraphs(p.summary)); report.push('Summary'); }
		if (p.objectives && items(p.objectives).length) { setVal('#lbs-objectives', items(p.objectives).join('\n')); report.push('Objectives'); }
		if (p.next && paragraphs(p.next)) { setVal('#lbs-next', paragraphs(p.next).replace(/\n+/g, ' ')); report.push('For next time'); }
		if (p.listen && items(p.listen).length) { setVal('#lbs-listen', items(p.listen).join('\n')); report.push('Tracks'); }

		var late = {};
		if (p.files && items(p.files).length) { late.files = p.files; }
		if (p.answered && items(p.answered).length) { late.answered = p.answered; }
		if (late.files || late.answered) {
			pending = late;
			if (needsMember) { Promise.all([loadContext(), loadFiles()]).then(applyPendingLate); }
			else { applyPendingLate(); }
		} else {
			if (needsMember) { Promise.all([loadContext(), loadFiles()]); }
			showReport();
		}
	});

	// Copy the blank template.
	document.addEventListener('click', function (e) {
		if (!e.target.closest('[data-lbs-copy-template]')) { return; }
		var ta = $('#lbs-paste');
		var done = function () { $('#lbs-paste-out').textContent = 'Blank template copied. Paste it into your notes app.'; };
		if (navigator.clipboard && navigator.clipboard.writeText) {
			navigator.clipboard.writeText(A.template).then(done, function () { ta.value = A.template; ta.select(); });
		} else { ta.value = A.template; ta.select(); }
	});
})();
