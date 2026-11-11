/*
 * Leith Bass Space: the Harmonic Elements ear trainer, Jack's side.
 *
 * Two small views in the WordPress admin, both drawn with the trainer's own
 * rules (he-catalogue.js, he-library.js, he-trainer.js), so what Jack reads
 * here is exactly what the trainer makes of the same files and answers:
 *
 *   Portal settings   what's in the Harmonic Elements folder: the loops in
 *                     use, what's still to record, and any file whose name
 *                     couldn't be placed, with the reason;
 *   a member's page   their record, when they've chosen to share it.
 */
(function () {
  'use strict';
  var HE = window.HE;
  if (!HE || !HE.library || !HE.trainer) { return; }

  function el(tag, attrs, kids) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') { node.textContent = attrs[k]; } else { node.setAttribute(k, attrs[k]); }
    });
    (kids || []).forEach(function (kid) { if (kid) { node.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid); } });
    return node;
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function read(node, name) {
    try { return JSON.parse(node.getAttribute(name)) || []; } catch (e) { return []; }
  }
  function table(head, rows) {
    return el('table', { 'class': 'widefat striped', style: 'max-width:48rem' }, [
      el('thead', {}, [el('tr', {}, head.map(function (h) { return el('th', { text: h }); }))]),
      el('tbody', {}, rows.map(function (cells) { return el('tr', {}, cells.map(function (c) { return el('td', typeof c === 'string' ? { text: c } : {}, typeof c === 'string' ? [] : [c]); })); }))
    ]);
  }

  /* ---------- Portal settings: what's in the folder ---------- */

  function summary(box) {
    var paths = read(box, 'data-files'), other = read(box, 'data-other');
    var lib = HE.library.build({ files: paths });
    var keyName = function (pc) { return HE.keyByPc(pc).name; };
    box.textContent = '';

    if (!paths.length) {
      box.appendChild(el('p', { text: 'No audio files found in the folder yet. Until there are, the house band plays every loop.' }));
    } else {
      box.appendChild(el('p', {}, [el('strong', { text: plural(lib.recorded.chords, 'chord loop', 'chord loops') + ' and ' + plural(lib.recorded.drums, 'drum loop', 'drum loops') + ' in use' }),
        lib.problems.length ? ', and ' + plural(lib.problems.length, 'file', 'files') + ' not used (see below).' : '.']));
    }

    // chords: one row for each tempo and tone centre
    var groups = {}, order = [];
    lib.chords.forEach(function (c) {
      var k = c.bpm + '|' + c.keyPc;
      if (!groups[k]) { groups[k] = { bpm: c.bpm, keyPc: c.keyPc, loops: 0, els: {} }; order.push(k); }
      groups[k].loops++;
      groups[k].els[c.el] = (groups[k].els[c.el] || 0) + 1;
    });
    var keyOrder = HE.KEYS.map(function (k) { return k.pc; });
    order.sort(function (a, b) { return groups[a].bpm - groups[b].bpm || keyOrder.indexOf(groups[a].keyPc) - keyOrder.indexOf(groups[b].keyPc); });
    var drumTempos = {};
    lib.drums.forEach(function (d) {
      var at = drumTempos[d.bpm] = drumTempos[d.bpm] || {};
      at[d.feel] = (at[d.feel] || 0) + 1;
    });

    if (order.length) {
      box.appendChild(el('h3', { text: 'Chord loops' }));
      box.appendChild(table(['Tempo', 'Tone centre', 'Loops', 'Elements', 'Still to record'], order.map(function (k) {
        // (recordings of elements that are out of the app for now, the forms and the extra home chords, are kept but not counted)
        var g = groups[k], got = HE.ELEMENTS.filter(function (e) { return g.els[e.id]; }).length;
        var missing = HE.ELEMENTS.filter(function (e) { return !g.els[e.id] && !e.optional; });
        var twice = HE.ELEMENTS.filter(function (e) { return g.els[e.id] > 1; });
        var more = el('details', {}, [
          el('summary', { text: missing.length ? plural(missing.length, 'element', 'elements') : 'None' }),
          el('p', { style: 'margin:0.4em 0 0', text: missing.map(function (e) { return e.roman + ' (' + e.name.replace(/^The /, '') + ')'; }).join(', ') })
        ]);
        return [g.bpm + ' bpm', keyName(g.keyPc), String(g.loops), got + ' of ' + HE.ELEMENTS.length + (twice.length ? ', ' + twice.length + ' with more than one version' : ''), missing.length ? more : 'None'];
      })));
    }

    var tempos = Object.keys(drumTempos).map(Number).sort(function (a, b) { return a - b; });
    if (tempos.length) {
      box.appendChild(el('h3', { text: 'Drum loops' }));
      box.appendChild(table(['Tempo', 'Feels'], tempos.map(function (t) {
        var feels = drumTempos[t];
        return [t + ' bpm', lib.feels().filter(function (f) { return feels[f]; }).map(function (f) { return f + (feels[f] > 1 ? ' ×' + feels[f] : ''); }).join(', ')];
      })));
    }

    // things to put right
    var fix = [];
    var chordTempos = {};
    lib.chords.forEach(function (c) { chordTempos[c.bpm] = true; });
    Object.keys(chordTempos).forEach(function (t) {
      if (!drumTempos[t]) { fix.push(['Chords/' + t + 'bpm', 'There are chord loops at ' + t + ' bpm but no drum loops, so the trainer can\'t play them yet. Add at least one to Drums/' + t + 'bpm.']); }
    });
    tempos.forEach(function (t) {
      if (!chordTempos[t]) { fix.push(['Drums/' + t + 'bpm', 'There are drum loops at ' + t + ' bpm but no chord loops to go with them.']); }
    });
    lib.problems.forEach(function (p) { fix.push([p.path, p.problem]); });
    other.forEach(function (p) { fix.push([p, 'This kind of file doesn\'t play in most browsers. Export it as MP3, M4A or WAV.']); });
    if (fix.length) {
      box.appendChild(el('h3', { text: 'Worth fixing' }));
      box.appendChild(el('ul', { style: 'list-style:disc;padding-left:1.5em;max-width:48rem' }, fix.slice(0, 80).map(function (f) {
        return el('li', {}, [el('code', { text: f[0] }), el('br'), f[1]]);
      })));
      if (fix.length > 80) { box.appendChild(el('p', { 'class': 'description', text: 'And ' + (fix.length - 80) + ' more.' })); }
    }
  }

  /* ---------- a member's page: their record ---------- */

  function record(box) {
    var log = read(box, 'data-log').filter(function (e) { return e && HE.byId(e.el); });
    var st = HE.trainer.stats(log);
    var rows = HE.ELEMENTS.filter(function (e) { return st.elements[e.id]; });
    box.textContent = '';
    if (!rows.length) { box.appendChild(el('p', { 'class': 'description', text: 'Nothing answered yet.' })); return; }

    var last = log[log.length - 1], recognised = rows.filter(function (e) { return st.elements[e.id].recognised; }).length;
    var first = log.filter(function (e) { return e.ok; }).length;
    box.appendChild(el('p', {}, [
      el('strong', { text: plural(log.length, 'loop', 'loops') + ' answered' }),
      ', ' + first + ' right first time. ' + plural(recognised, 'element', 'elements') + ' recognised of the ' + rows.length + ' met so far. Last played ' +
      new Date(last.t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + '.'
    ]));

    // major and minor (1.9.0): answers that had home's note but not the chord on it
    var modes = log.filter(function (e) { return !e.mode && e.saidMode && e.keyMode && !e.home && e.saidMode !== e.keyMode && e.saidHome === e.key; }).length;
    if (modes) { box.appendChild(el('p', {}, [el('strong', { text: 'Major and minor: ' }), 'found home but heard ' + plural(modes, 'loop', 'loops') + ' in the other mode.'])); }
    var halves = [];
    if (st.halves.key.n) { halves.push('with the key shown, named the element first time ' + st.halves.key.ok + ' of ' + st.halves.key.n); }
    if (st.halves.element.n) { halves.push('with the element shown, found the key first time ' + st.halves.element.ok + ' of ' + st.halves.element.n); }
    if (halves.length) { box.appendChild(el('p', {}, [el('strong', { text: 'Half shown: ' }), halves.join('; ') + '.'])); }
    var mix = st.mixups.slice(0, 5).map(function (m) {
      return HE.byId(m.was).roman + ' taken for ' + HE.byId(m.said).roman + (m.times > 1 ? ' (' + m.times + ' times)' : '');
    });
    if (mix.length) { box.appendChild(el('p', {}, [el('strong', { text: 'Mixes up: ' }), mix.join('; ') + '.'])); }

    box.appendChild(table(['Element', 'Last five', 'Standing', 'Loops'], rows.map(function (e) {
      var r = st.elements[e.id], right = r.last.filter(Boolean).length;
      var dots = r.last.map(function (ok) { return ok ? '●' : '○'; }).join(' ');
      return [e.roman + '  ' + e.name.replace(/^The /, ''), el('span', { title: right + ' right of the last ' + r.last.length, style: 'letter-spacing:0.1em;white-space:nowrap', text: dots }),
        r.recognised ? 'Recognised' : right + ' of last ' + r.last.length, r.right + ' of ' + r.attempts + ' first time'];
    })));
    box.appendChild(el('p', { 'class': 'description', text: 'A filled dot is a first-time answer, the key and the element both, with nothing shown. Recognised means four of the last five, on two different days.' }));
  }

  var s = document.getElementById('lbs-he-summary'), r = document.getElementById('lbs-he-record');
  try { if (s) { summary(s); } } catch (e) { /* the plain count stays */ }
  try { if (r) { record(r); } } catch (e) { /* the plain count stays */ }
}());
