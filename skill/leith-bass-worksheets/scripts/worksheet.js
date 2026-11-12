#!/usr/bin/env node
// Leith Bass worksheet builder.
//   node scripts/worksheet.js <worksheet.json> --out-dir <dir> [--pdf] [--preview]
// Produces <slug>.docx (house styles, embedded fonts), optional <slug>.pdf, page previews and
// a contact sheet, an audit of every note, optional portal session-notes text, and a figures/
// folder holding every figure's JSON, SVG, PNG and manifest.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const { HOUSE, validateSpec, renderFiles, signs } = require('./render.js');
const { renderDiagramFiles, LABEL_UNITS } = require('./diagram.js');
const { validateGroove, renderGrooveFiles } = require('./groove.js');

const globalRoot = execSync('npm root -g').toString().trim();
const req = (name) => {
  try {
    return require(require.resolve(name, { paths: [process.cwd(), __dirname, globalRoot, path.join(globalRoot, 'docx')] }));
  } catch (error) {
    throw new Error(`The ${name} package is missing. Run scripts/setup.sh first.`);
  }
};
const docx = req('docx');
const JSZip = req('jszip');
const {
  AlignmentType, BorderStyle, LineRuleType, TabStopType, Document, Footer, Header, HeadingLevel, ImageRun, LevelFormat, Packer,
  PageOrientation, PageNumber, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType, VerticalAlign,
} = docx;

const FONT_DIR = path.join(__dirname, '..', 'assets', 'fonts');

// A QR code as a PNG (3.1), for a "link" block: the page a pupil should open on their phone. The pattern comes
// from the qrcode package; the PNG is written here, one bit per pixel, so nothing has to be rasterised.
function qrPng(url) {
  const zlib = require('zlib');
  const qr = req('qrcode').create(url, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size, quiet = 4, scale = 8, size = (n + quiet * 2) * scale, rowBytes = Math.ceil(size / 8);
  const raw = Buffer.alloc((rowBytes + 1) * size, 0xff);
  for (let y = 0; y < size; y++) {
    raw[y * (rowBytes + 1)] = 0;   // (each row starts with its filter type: none)
    for (let x = 0; x < size; x++) {
      const mx = Math.floor(x / scale) - quiet, my = Math.floor(y / scale) - quiet;
      if (mx >= 0 && my >= 0 && mx < n && my < n && qr.modules.get(my, mx)) raw[y * (rowBytes + 1) + 1 + (x >> 3)] &= ~(0x80 >> (x & 7));
    }
  }
  const crcTable = Array.from({ length: 256 }, (_, i) => { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type), data]); const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body)); return Buffer.concat([len, body, sum]); };
  const head = Buffer.alloc(13); head.writeUInt32BE(size, 0); head.writeUInt32BE(size, 4); head[8] = 1; head[9] = 0;   // 1 bit, greyscale
  return { data: Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', head), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]), modules: n };
}
const C = {
  ink: '111111', secondary: '333333', muted: '625F59', accentInk: 'A84912', orange: 'D86B25',
  cream: 'F5EFE2', rule: 'D9D4CA',
};
const MM = 56.7; // twips per millimetre
const A4 = { short: 210, long: 297 };
const MARGIN_MM = 18;
const PAGE = { margin: Math.round(MARGIN_MM * MM), bottom: Math.round(22 * MM) };
const PX_PER_MM = 96 / 25.4; // docx image sizes are in CSS pixels
const PT_PER_MM = 2.8346;
const PRINT_DPI = 600;

// Physical staff space for notation and grooves. 1.8 mm is close to standard engraving (a
// 7.2 mm staff) and keeps note names, fingers and chord labels at about 10 pt.
const NOTATION_SIZES = { compact: 1.6, standard: 1.8, large: 2.0 };
const DIAGRAM_MM_PER_UNIT = 0.1764; // diagram labels (20 units) print at 10 pt
const MIN_LABEL_PT = 9;

function fail(message) { throw new Error(message); }
function keys(value, allowed, where) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${where} must be an object.`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`${where}: unsupported field ${key}.`);
}
function slugify(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function contentMm(orientation) {
  return (orientation === 'landscape' ? A4.long : A4.short) - 2 * MARGIN_MM;
}

// Inline markup: **bold**, *italic*. Everything else is literal (chord symbols keep their case).
function runs(text, base = {}) {
  if (typeof text !== 'string') fail('Text must be a string.');
  // The flat, natural and sharp signs are set in the small signs font beside whatever the words are in (3.1):
  // Inter and Oswald have no such glyphs, and a reader's own fallback font would not match from one machine to the next.
  const withSigns = (run) => {
    const heavy = run.font === 'Inter SemiBold' || run.bold || base.heavySigns;
    const { heavySigns, ...clean } = run;
    return String(run.text).split(/([\u266D-\u266F]+)/).filter(Boolean).map((piece) =>
      new TextRun(/[\u266D-\u266F]/.test(piece) ? { ...clean, text: piece, font: heavy ? 'LBS Signs SemiBold' : 'LBS Signs' } : { ...clean, text: piece }));
  };
  return signs(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean).flatMap((part) => {
    if (part.startsWith('**')) return withSigns({ ...base, text: part.slice(2, -2), font: 'Inter SemiBold' });
    if (part.startsWith('*') && part.length > 2) return withSigns({ ...base, text: part.slice(1, -1), italics: true });
    return withSigns({ ...base, text: part });
  });
}

function imageSize(buffer, file) {
  if (buffer.readUInt32BE(0) === 0x89504e47) return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), type: 'png' };
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let i = 2;
    while (i < buffer.length) {
      const marker = buffer[i + 1];
      const len = buffer.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xc3) return { height: buffer.readUInt16BE(i + 5), width: buffer.readUInt16BE(i + 7), type: 'jpg' };
      i += 2 + len;
    }
  }
  return fail(`${file} must be a PNG or JPEG image.`);
}

class Builder {
  constructor(sheet, baseDir, outDir) {
    this.sheet = sheet;
    this.baseDir = baseDir;
    this.outDir = outDir;
    this.figDir = path.join(outDir, 'figures');
    fs.mkdirSync(this.figDir, { recursive: true });
    this.audit = [];
    this.bodySize = sheet.level === 'beginner' ? 24 : 22; // half-points: 12 pt beginner, 11 pt otherwise
    this.staffMm = typeof sheet.notationSize === 'number' ? sheet.notationSize : NOTATION_SIZES[sheet.notationSize || 'standard'];
    this.orientation = sheet.orientation || 'portrait';
    this.breakNext = false;
    this.figureCount = 0;
  }

  // Every paragraph goes through here, so a pagebreak block can become "page break before"
  // on the next real paragraph instead of an empty paragraph (which could leave a blank page).
  p(options) {
    if (this.breakNext) { this.breakNext = false; return new Paragraph({ ...options, pageBreakBefore: true }); }
    return new Paragraph(options);
  }

  load(ref, where) {
    if (typeof ref === 'string') {
      const p = path.resolve(this.baseDir, ref);
      try { return { data: JSON.parse(fs.readFileSync(p, 'utf8')), file: p }; } catch (e) { fail(`${where}: could not read ${ref}: ${e.message}`); }
    }
    if (ref && typeof ref === 'object') return { data: JSON.parse(JSON.stringify(ref)), file: null };
    return fail(`${where}: expected a file path or an inline object.`);
  }

  get maxMm() { return contentMm(this.orientation); }

  checkWidth(mm, where) {
    if (typeof mm !== 'number' || mm < 30 || mm > this.maxMm) fail(`${where}: widthMm must be between 30 and ${this.maxMm} on a ${this.orientation} page.`);
    return mm;
  }

  figure(file, mm, alt, caption, title, align) {
    const data = fs.readFileSync(file);
    const { width, height, type } = imageSize(data, file);
    const w = Math.round(mm * PX_PER_MM);
    const h = Math.round((w * height) / width);
    const out = [];
    if (title) out.push(this.p({ style: 'FigureTitle', keepNext: true, keepLines: true, children: runs(title, { heavySigns: true }) }));
    out.push(this.p({
      alignment: align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
      keepNext: Boolean(caption),
      keepLines: true,
      spacing: { before: title ? 60 : 160, after: caption ? 80 : 240, line: 240, lineRule: LineRuleType.AUTO },
      children: [new ImageRun({
        type, data, transformation: { width: w, height: h },
        altText: { title: title || alt.slice(0, 60), description: alt, name: path.basename(file) },
      })],
    }));
    if (caption) out.push(this.p({ style: 'Caption', children: runs(caption) }));
    return out;
  }

  // notation and grooves share the staff-space scale
  musicSetup(block, data, where) {
    const unitMm = this.staffMm / HOUSE.staffGap;
    data.theme = block.theme || this.sheet.figureTheme || 'print';
    data.frame = block.frame || this.sheet.figureFrame || 'plain';
    if (block.show) data.show = block.show;
    if (block.widthMm !== undefined) data.width = Math.round(this.checkWidth(block.widthMm, where) / unitMm);
    else { data.width = 'auto'; data.maxWidth = Math.min(HOUSE.maxWidth, Math.floor(this.maxMm / unitMm)); }
    const labelPt = HOUSE.type.label * unitMm * PT_PER_MM;
    if (labelPt < MIN_LABEL_PT) fail(`notationSize ${this.staffMm} mm would print labels at ${labelPt.toFixed(1)} pt (minimum ${MIN_LABEL_PT} pt).`);
    return { unitMm, scale: Math.min(4, Math.max(1, (PRINT_DPI / 25.4) * unitMm)) };
  }

  notation(block, index) {
    keys(block, ['type', 'exercise', 'panels', 'title', 'caption', 'theme', 'frame', 'show', 'widthMm', 'layout', 'align'], `blocks[${index}]`);
    const { data } = this.load(block.exercise, `blocks[${index}].exercise`);
    const { unitMm, scale } = this.musicSetup(block, data, `blocks[${index}]`);
    if (block.layout) data.layout = block.layout;
    const spec = validateSpec(data);
    const wanted = block.panels || spec.panels.map((p) => p.slug);
    const { manifest } = renderFiles(spec, this.figDir, { png: true, scale });
    fs.writeFileSync(path.join(this.figDir, `${spec.slug}.exercise.json`), `${JSON.stringify(data, null, 2)}\n`);
    const out = [];
    wanted.forEach((slug, i) => {
      const panel = manifest.panels.find((p) => p.slug === slug);
      if (!panel) fail(`blocks[${index}]: panel "${slug}" not found in ${spec.title}.`);
      this.audit.push({ block: index, kind: 'notation', exercise: spec.title, panel: slug, notes: panel.notes, transpositionVerified: panel.transpositionVerified });
      const caption = i === wanted.length - 1 ? block.caption : undefined;
      out.push(...this.figure(path.join(this.figDir, panel.files.png), panel.dimensions.width * unitMm, panel.altText, caption, i === 0 ? block.title : undefined, block.align));
    });
    return out;
  }

  groove(block, index) {
    keys(block, ['type', 'groove', 'panels', 'title', 'caption', 'theme', 'frame', 'show', 'widthMm', 'align'], `blocks[${index}]`);
    const { data } = this.load(block.groove, `blocks[${index}].groove`);
    const { unitMm, scale } = this.musicSetup(block, data, `blocks[${index}]`);
    const spec = validateGroove(data);
    const { manifest } = renderGrooveFiles(spec, this.figDir, { png: true, scale, keepLy: true });
    fs.writeFileSync(path.join(this.figDir, `${spec.slug}.groove.json`), `${JSON.stringify(data, null, 2)}\n`);
    const wanted = block.panels || manifest.panels.map((p) => p.slug);
    const out = [];
    wanted.forEach((slug, i) => {
      const panel = manifest.panels.find((p) => p.slug === slug);
      if (!panel) fail(`blocks[${index}]: panel "${slug}" not found in ${spec.title}.`);
      this.audit.push({ block: index, kind: 'groove', title: spec.title, panel: slug, events: panel.notes });
      out.push(...this.figure(path.join(this.figDir, panel.files.png), panel.dimensions.width * unitMm, panel.altText,
        i === wanted.length - 1 ? block.caption : undefined, i === 0 ? block.title : undefined, block.align));
    });
    return out;
  }

  diagram(block, index) {
    keys(block, ['type', 'diagram', 'title', 'caption', 'theme', 'frame', 'widthMm', 'align'], `blocks[${index}]`);
    const { data } = this.load(block.diagram, `blocks[${index}].diagram`);
    data.theme = block.theme || this.sheet.figureTheme || 'print';
    data.frame = block.frame || this.sheet.figureFrame || 'plain';
    if (block.widthMm !== undefined) data.width = Math.round(this.checkWidth(block.widthMm, `blocks[${index}]`) / DIAGRAM_MM_PER_UNIT);
    const scale = Math.min(4, Math.max(1, (PRINT_DPI / 25.4) * DIAGRAM_MM_PER_UNIT));
    const result = renderDiagramFiles(data, this.figDir, { png: true, scale });
    fs.writeFileSync(path.join(this.figDir, `${result.manifest.slug}.diagram.json`), `${JSON.stringify(data, null, 2)}\n`);
    let mm = result.width * DIAGRAM_MM_PER_UNIT;
    if (mm > this.maxMm) mm = this.maxMm;
    const labelPt = (LABEL_UNITS / result.width) * mm * PT_PER_MM;
    if (labelPt < MIN_LABEL_PT) fail(`Diagram "${data.title}" would print labels at ${labelPt.toFixed(1)} pt; show fewer frets or keys.`);
    this.audit.push({ block: index, kind: data.type, title: data.title, items: result.audit });
    return this.figure(path.join(this.figDir, result.files.png), mm, result.altText, block.caption, block.title, block.align);
  }

  image(block, index) {
    keys(block, ['type', 'path', 'alt', 'title', 'caption', 'widthMm', 'align'], `blocks[${index}]`);
    if (typeof block.alt !== 'string' || !block.alt.trim()) fail(`blocks[${index}]: image needs alt text.`);
    const p = path.resolve(this.baseDir, block.path);
    if (!/\.(png|jpe?g)$/i.test(p)) fail(`blocks[${index}]: image must be a PNG or JPEG.`);
    const mm = block.widthMm === undefined ? this.maxMm : this.checkWidth(block.widthMm, `blocks[${index}]`);
    return this.figure(p, mm, block.alt, block.caption, block.title, block.align || 'center');
  }

  // (The paragraph after a table, here and in table(): a table must be followed by one, and a full height empty
  // paragraph could fall alone onto a new page when the table ended near the foot. 3.2 makes it 2 pt tall.)
  // A link to open on a phone: a QR code beside a label, a line of text and the address in words.
  // For a drill in the app with chosen things in play, a metronome setup, a backing track.
  link(block, index) {
    keys(block, ['type', 'url', 'label', 'text', 'show', 'steps'], `blocks[${index}]`);
    if (block.steps !== undefined && (!Array.isArray(block.steps) || !block.steps.length || block.steps.length > 6 || block.steps.some((t) => typeof t !== 'string'))) fail(`blocks[${index}].steps must be one to six lines of text.`);
    if (typeof block.url !== 'string' || !/^https:\/\/[^\s]+$/.test(block.url)) fail(`blocks[${index}].url must be an https address.`);
    if (block.url.length > 600) fail(`blocks[${index}].url is too long for a code that scans easily (600 characters at most).`);
    const qr = qrPng(block.url);
    // 24 mm across up to 45 modules (over half a millimetre a module), then bigger, so a long address still scans
    const mm = qr.modules <= 45 ? 24 : qr.modules <= 65 ? 32 : 42, px = Math.round(mm * 96 / 25.4);
    const contentTwips = Math.round(this.maxMm * MM), left = Math.round((mm + 6) * MM), right = contentTwips - left;
    const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, borders = { top: none, bottom: none, left: none, right: none };
    const shown = block.show || block.url.replace(/^https:\/\//, '').replace(/[?#].*$/, '').replace(/\/$/, '');
    const out = [];
    if (this.breakNext) out.push(this.p({ spacing: { before: 0, after: 0, line: 40, lineRule: LineRuleType.EXACT }, children: [] }));
    const code = (width, align) => new TableCell({ width: { size: width, type: WidthType.DXA }, borders, verticalAlign: VerticalAlign.CENTER, margins: { top: 60, bottom: 60, left: 0, right: 120 },
      children: [new Paragraph({ spacing: { after: 0 }, alignment: align, children: [new ImageRun({ type: 'png', data: qr.data, transformation: { width: px, height: px },
        altText: { title: 'QR code', description: `QR code for ${shown}`, name: `qr-${index}.png` } })] })] });
    const words = (align) => [
      ...(block.label ? [new Paragraph({ spacing: { after: 40 }, alignment: align, children: runs(block.label, { font: 'Inter SemiBold', color: C.accentInk }) })] : []),
      ...(block.text ? [new Paragraph({ spacing: { after: 60 }, alignment: align, children: runs(block.text) })] : []),
      new Paragraph({ spacing: { after: 0 }, alignment: align, children: [new TextRun({ text: shown, size: 18, color: C.muted })] }),
    ];
    let row;
    if (block.steps) {
      // Practice steps on the left, the code and its words on the right: what to do, and where to do it, side by side.
      // (three cells in one row, not a table inside a table: LibreOffice sent the nested form to a new page)
      const codeW = Math.round((mm + 4) * MM), wordsW = Math.round(36 * MM), main = contentTwips - codeW - wordsW;
      row = { widths: [main, codeW, wordsW], cells: [
        new TableCell({ width: { size: main, type: WidthType.DXA }, borders, verticalAlign: VerticalAlign.TOP, margins: { top: 60, bottom: 60, left: 0, right: 240 },
          children: block.steps.map((item) => new Paragraph({ numbering: { reference: `steps-${index}`, level: 0 }, keepLines: true, spacing: { after: 80 }, children: runs(item) })) }),
        code(codeW),
        new TableCell({ width: { size: wordsW, type: WidthType.DXA }, borders, verticalAlign: VerticalAlign.CENTER, margins: { top: 60, bottom: 60, left: 60, right: 0 }, children: words() }),
      ] };
    } else {
      row = { widths: [left, right], cells: [code(left),
        new TableCell({ width: { size: right, type: WidthType.DXA }, borders, verticalAlign: VerticalAlign.CENTER, margins: { top: 60, bottom: 60, left: 120, right: 0 }, children: words() })] };
    }
    out.push(new Table({ width: { size: contentTwips, type: WidthType.DXA }, columnWidths: row.widths, rows: [new TableRow({ cantSplit: true, children: row.cells })] }),
      new Paragraph({ spacing: { before: 0, after: 80, line: 40, lineRule: LineRuleType.EXACT }, children: [] }));
    this.links = (this.links || []).concat([{ url: block.url, label: block.label || '' }]);
    return out;
  }

  table(block, index) {
    keys(block, ['type', 'headers', 'rows', 'columnWidths'], `blocks[${index}]`);
    const contentTwips = Math.round(this.maxMm * MM);
    const cols = block.headers.length;
    if (block.columnWidths && (block.columnWidths.length !== cols || Math.abs(block.columnWidths.reduce((a, b) => a + b, 0) - 1) > 0.01)) {
      fail(`blocks[${index}].columnWidths must have ${cols} fractions adding up to 1.`);
    }
    const widths = block.columnWidths
      ? block.columnWidths.map((f) => Math.round(f * contentTwips))
      : Array(cols).fill(Math.floor(contentTwips / cols));
    const border = { style: BorderStyle.SINGLE, size: 4, color: C.rule };
    const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const cell = (text, i, header) => new TableCell({
      width: { size: widths[i], type: WidthType.DXA },
      verticalAlign: VerticalAlign.TOP,
      shading: header ? { type: ShadingType.CLEAR, fill: C.cream, color: 'auto' } : undefined,
      margins: { top: 90, bottom: 90, left: 120, right: 120 },
      borders: { top: border, bottom: border, left: none, right: none },
      children: [new Paragraph({ style: 'TableText', children: runs(String(text), header ? { font: 'Inter SemiBold' } : {}) })],
    });
    const out = [];
    if (this.breakNext) out.push(this.p({ spacing: { before: 0, after: 0, line: 40, lineRule: LineRuleType.EXACT }, children: [] }));
    out.push(new Table({
      width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
      columnWidths: widths,
      rows: [
        new TableRow({ tableHeader: true, cantSplit: true, children: block.headers.map((h, i) => cell(h, i, true)) }),
        ...block.rows.map((r) => {
          if (r.length !== cols) fail(`blocks[${index}]: every row needs ${cols} cells.`);
          return new TableRow({ cantSplit: true, children: r.map((t, i) => cell(t, i, false)) });
        }),
      ],
    }), new Paragraph({ spacing: { before: 0, after: 80, line: 40, lineRule: LineRuleType.EXACT }, children: [] }));
    return out;
  }

  block(block, index) {
    if (!block || typeof block.type !== 'string') fail(`blocks[${index}] needs a type.`);
    switch (block.type) {
      case 'heading':
        keys(block, ['type', 'text', 'level'], `blocks[${index}]`);
        return [this.p({ heading: block.level === 3 ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_2, children: runs(block.text, { heavySigns: true }) })];
      case 'paragraph':
        keys(block, ['type', 'text'], `blocks[${index}]`);
        return [this.p({ children: runs(block.text) })];
      case 'steps':
      case 'bullets':
        keys(block, ['type', 'items'], `blocks[${index}]`);
        if (!Array.isArray(block.items) || !block.items.length) fail(`blocks[${index}].items must be a non-empty list.`);
        return block.items.map((item, i) => this.p({
          numbering: { reference: block.type === 'steps' ? `steps-${index}` : 'bullets', level: 0 },
          keepLines: true,
          keepNext: i < block.items.length - 1 && block.items.length <= 4,
          spacing: { after: 80 },
          children: runs(item),
        }));
      case 'callout':
        keys(block, ['type', 'label', 'text'], `blocks[${index}]`);
        return [this.p({
          style: 'Callout',
          children: [
            ...(block.label ? runs(`${block.label}  `, { font: 'Inter SemiBold', color: C.accentInk }) : []),
            ...runs(block.text),
          ],
        })];
      case 'notation': return this.notation(block, index);
      case 'diagram': return this.diagram(block, index);
      case 'groove': return this.groove(block, index);
      case 'image': return this.image(block, index);
      case 'table': return this.table(block, index);
      case 'link': return this.link(block, index);
      case 'pagebreak':
        keys(block, ['type'], `blocks[${index}]`);
        this.breakNext = true;
        return [];
      default: return fail(`blocks[${index}]: unknown type "${block.type}". Use heading, paragraph, steps, bullets, callout, notation, groove, diagram, image, table, link, pagebreak or section.`);
    }
  }

  pageProperties(orientation) {
    const landscape = orientation === 'landscape';
    return {
      page: {
        // docx-js swaps width and height itself when orientation is landscape
        size: { width: Math.round(A4.short * MM), height: Math.round(A4.long * MM), orientation: landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT },
        margin: { top: PAGE.margin, bottom: PAGE.bottom, left: PAGE.margin, right: PAGE.margin, footer: Math.round(10 * MM), header: Math.round(9 * MM) },
      },
    };
  }

  footer(orientation) {
    const s = this.sheet;
    const footerRun = { font: 'Inter', size: 18, color: C.muted };
    return new Footer({ children: [new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: Math.round(contentMm(orientation) * MM) }], children: [
      new TextRun({ ...footerRun, text: s.footer || 'leithbass.space' }),
      new TextRun({ ...footerRun, children: ['\t', PageNumber.CURRENT] }),
    ] })] });
  }

  document() {
    const s = this.sheet;
    const body = this.bodySize;
    const sections = [];
    let current = { orientation: this.orientation, children: [] };
    const push = (...items) => current.children.push(...items);
    if (s.kicker) push(this.p({ style: 'Kicker', children: runs(s.kicker, { heavySigns: true }) }));
    push(this.p({ heading: HeadingLevel.TITLE, children: runs(s.title, { heavySigns: true }) }));
    if (s.aim) push(this.p({ style: 'Aim', children: runs(s.aim) }));
    if (s.meta) push(this.p({ style: 'Meta', children: runs(s.meta) }));
    s.blocks.forEach((b, i) => {
      if (b && b.type === 'section') {
        keys(b, ['type', 'orientation'], `blocks[${i}]`);
        if (!['portrait', 'landscape'].includes(b.orientation)) fail(`blocks[${i}].orientation must be portrait or landscape.`);
        if (current.children.length) sections.push(current);
        this.breakNext = false; // a new section already starts a new page
        this.orientation = b.orientation;
        current = { orientation: b.orientation, children: [] };
        return;
      }
      push(...this.block(b, i));
    });
    if (!current.children.length) fail('The worksheet ends with a section break and nothing after it.');
    sections.push(current);

    const stepRefs = s.blocks.map((b, i) => (b.type === 'steps' || (b.type === 'link' && b.steps) ? i : null)).filter((i) => i !== null);
    const numbering = {
      config: [
        { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 400, hanging: 260 } }, run: { color: C.orange } } }] },
        ...stepRefs.map((i) => ({ reference: `steps-${i}`, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 400, hanging: 400 } }, run: { font: 'Inter SemiBold', color: C.accentInk } } }] })),
      ],
    };

    const footerRun = { font: 'Inter', size: 18, color: C.muted };
    const header = s.runningHeader
      ? new Header({ children: [new Paragraph({ children: [new TextRun({ ...footerRun, text: s.runningHeader.toUpperCase(), characterSpacing: 10 })] })] })
      : undefined;

    const fontData = (file) => fs.readFileSync(path.join(FONT_DIR, file));
    return new Document({
      creator: 'Leith Bass Space',
      title: s.title,
      description: s.aim || '',
      fonts: [
        { name: 'Oswald', data: fontData('oswald-latin-700-normal.ttf'), characterSet: '00' },
        { name: 'Inter', data: fontData('inter-latin-400-normal.ttf'), characterSet: '00' },
        { name: 'Inter SemiBold', data: fontData('inter-latin-600-normal.ttf'), characterSet: '00' },
        { name: 'LBS Signs', data: fontData('lbs-signs-400.ttf'), characterSet: '00' },
        { name: 'LBS Signs SemiBold', data: fontData('lbs-signs-600.ttf'), characterSet: '00' },
      ],
      styles: {
        default: { document: { run: { font: 'Inter', size: body, color: C.ink }, paragraph: { spacing: { after: 140, line: 300, lineRule: LineRuleType.AUTO } } } },
        paragraphStyles: [
          { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', run: { font: 'Oswald', bold: true, size: 60, color: C.ink }, paragraph: { spacing: { before: 0, after: 120, line: 252, lineRule: LineRuleType.AUTO }, keepNext: true } },
          { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Oswald', bold: true, size: 32, color: C.ink }, paragraph: { spacing: { before: 300, after: 100, line: 264, lineRule: LineRuleType.AUTO }, keepNext: true, keepLines: true, outlineLevel: 1 } },
          { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Inter SemiBold', size: body + 2, color: C.ink }, paragraph: { spacing: { before: 220, after: 80 }, keepNext: true, keepLines: true, outlineLevel: 2 } },
          { id: 'Kicker', name: 'Kicker', basedOn: 'Normal', next: 'Title', run: { font: 'Inter SemiBold', size: 18, color: C.accentInk, characterSpacing: 16, allCaps: true }, paragraph: { spacing: { after: 60 }, keepNext: true } },
          { id: 'Aim', name: 'Aim', basedOn: 'Normal', next: 'Normal', run: { size: body + 4, color: C.secondary }, paragraph: { spacing: { after: 120, line: 300, lineRule: LineRuleType.AUTO } } },
          { id: 'Meta', name: 'Meta', basedOn: 'Normal', next: 'Normal', run: { size: 18, color: C.muted }, paragraph: { spacing: { after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.rule, space: 8 } } } },
          { id: 'FigureTitle', name: 'Figure Title', basedOn: 'Normal', next: 'Normal', run: { font: 'Inter SemiBold', size: body, color: C.ink }, paragraph: { spacing: { before: 240, after: 40 }, keepNext: true } },
          { id: 'Caption', name: 'Caption', basedOn: 'Normal', next: 'Normal', run: { size: 20, color: C.muted }, paragraph: { spacing: { before: 0, after: 280, line: 276, lineRule: LineRuleType.AUTO } } },
          { id: 'TableText', name: 'Table Text', basedOn: 'Normal', run: { size: 20 }, paragraph: { spacing: { after: 0, line: 264, lineRule: LineRuleType.AUTO } } },
          { id: 'Callout', name: 'Callout', basedOn: 'Normal', next: 'Normal', run: { size: body }, paragraph: {
            spacing: { before: 160, after: 220, line: 300, lineRule: LineRuleType.AUTO }, indent: { left: 200, right: 120 }, keepLines: true,
            shading: { type: ShadingType.CLEAR, fill: C.cream, color: 'auto' },
            border: { left: { style: BorderStyle.SINGLE, size: 24, color: C.orange, space: 10 }, top: { style: BorderStyle.SINGLE, size: 2, color: C.cream, space: 6 }, bottom: { style: BorderStyle.SINGLE, size: 2, color: C.cream, space: 6 } },
          } },
        ],
      },
      numbering,
      sections: sections.map((section) => ({
        properties: this.pageProperties(section.orientation),
        headers: header ? { default: header } : undefined,
        footers: { default: this.footer(section.orientation) },
        children: section.children,
      })),
    });
  }
}

// docx-js only embeds fonts in the regular slot. Oswald ships as a bold face, so move it
// to the bold slot (the styles ask for Oswald bold) and ask Word to keep embedded fonts.
async function fixFontEmbedding(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  let table = await zip.file('word/fontTable.xml').async('string');
  table = table.replace(/(<w:font w:name="Oswald">[\s\S]*?)<w:embedRegular([^>]*)\/>/, '$1<w:embedBold$2/>');
  zip.file('word/fontTable.xml', table);
  const settingsFile = zip.file('word/settings.xml');
  if (settingsFile) {
    let settings = await settingsFile.async('string');
    if (!settings.includes('w:embedTrueTypeFonts')) settings = settings.replace(/(<w:settings[^>]*>)/, '$1<w:embedTrueTypeFonts/><w:saveSubsetFonts/>');
    zip.file('word/settings.xml', settings);
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

// Portal session notes: the text Jack pastes into Members > Add session > "Paste your notes".
const PORTAL_FIELDS = ['member', 'date', 'start', 'length', 'status', 'block', 'covered', 'summary', 'objectives', 'files', 'answered', 'listen', 'nextTime'];
function portalText(portal, pdfName) {
  keys(portal, PORTAL_FIELDS, 'portal');
  if (typeof portal.member !== 'string' || !portal.member.trim()) fail('portal.member is required.');
  const list = (v, where) => {
    if (v === undefined) return [];
    if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) fail(`portal.${where} must be a list of text items.`);
    return v;
  };
  const files = list(portal.files, 'files');
  if (pdfName && !files.includes(pdfName)) files.unshift(pdfName);
  const lines = ['# THE LEITH BASS SPACE · SESSION NOTES', '# Paste into Members > Add session > "Paste your notes".', ''];
  lines.push(`Member: ${portal.member}`);
  for (const [k, label, dflt] of [['date', 'Date'], ['start', 'Start'], ['length', 'Length', '1h'], ['status', 'Status', 'done'], ['block', 'Block', 'yes']]) {
    const v = portal[k] === undefined ? dflt : portal[k];
    if (v !== undefined && v !== '') lines.push(`${label}: ${v}`);
  }
  const textField = (label, v) => { if (v) lines.push('', `${label}:`, String(v)); };
  const listField = (label, v) => { if (v.length) lines.push('', `${label}:`, ...v.map((x) => `- ${x}`)); };
  textField('Covered', portal.covered);
  textField('Summary', portal.summary);
  listField('Objectives', list(portal.objectives, 'objectives'));
  listField('Files', files);
  listField('Answered', list(portal.answered, 'answered'));
  listField('Listen', list(portal.listen, 'listen'));
  textField('Next time', portal.nextTime);
  return `${lines.join('\n')}\n`;
}

function validateSheet(sheet) {
  keys(sheet, ['$schema', 'title', 'slug', 'kicker', 'aim', 'meta', 'level', 'figureTheme', 'figureFrame', 'notationSize', 'orientation', 'runningHeader', 'footer', 'portal', 'blocks'], 'worksheet');
  if (typeof sheet.title !== 'string' || !sheet.title.trim()) fail('worksheet title is required.');
  if (sheet.level !== undefined && !['beginner', 'standard'].includes(sheet.level)) fail('level must be beginner or standard.');
  if (sheet.figureTheme !== undefined && !['print', 'cream'].includes(sheet.figureTheme)) fail('figureTheme must be print or cream.');
  if (sheet.figureFrame !== undefined && !['plain', 'panel'].includes(sheet.figureFrame)) fail('figureFrame must be plain or panel.');
  if (sheet.orientation !== undefined && !['portrait', 'landscape'].includes(sheet.orientation)) fail('orientation must be portrait or landscape.');
  const ns = sheet.notationSize;
  if (ns !== undefined && !(ns in NOTATION_SIZES) && !(typeof ns === 'number' && ns >= 1.5 && ns <= 2.6)) {
    fail('notationSize must be compact, standard, large, or a staff space in millimetres from 1.5 to 2.6.');
  }
  if (!Array.isArray(sheet.blocks) || !sheet.blocks.length) fail('blocks must be a non-empty list.');
  const last = sheet.blocks[sheet.blocks.length - 1];
  if (last && ['pagebreak', 'section'].includes(last.type)) fail(`A worksheet cannot end with a ${last.type} (it would add a blank page).`);
}

function contactSheet(previews, file) {
  const script = `
import sys
from PIL import Image
paths = sys.argv[2:]
ims = [Image.open(p).convert('RGB') for p in paths]
h = max(i.height for i in ims)
ims = [i.resize((round(i.width * h / i.height), h)) for i in ims]
cols = min(4, len(ims))
rows = (len(ims) + cols - 1) // cols
w = max(i.width for i in ims)
sheet = Image.new('RGB', (cols * w + (cols + 1) * 16, rows * h + (rows + 1) * 16), (120, 120, 120))
for n, im in enumerate(ims):
    sheet.paste(im, (16 + (n % cols) * (w + 16), 16 + (n // cols) * (h + 16)))
sheet.save(sys.argv[1])
`;
  const r = spawnSync('python3', ['-c', script, file, ...previews], { encoding: 'utf8' });
  return r.status === 0 && fs.existsSync(file) ? file : null;
}

// Page-flow check on the finished PDF: a nearly empty last page, or a page that is only a
// heading, usually means content should be tightened or moved. Advisory, not an error.
// How far down each page its content reaches, as a fraction of the space above the footer (3.2). The page is
// rasterised small and grey, and the lowest row with ink in it found. Returns [] if pdftoppm is not there.
function pageFill(pdfPath) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lbs-flow-'));
  const r = spawnSync('pdftoppm', ['-r', '20', '-gray', pdfPath, path.join(dir, 'p')]);
  const out = [];
  if (!r.error && r.status === 0) {
    for (const f of fs.readdirSync(dir).sort()) {
      const buf = fs.readFileSync(path.join(dir, f));
      const head = buf.toString('latin1', 0, 40).match(/^P5\s+(\d+)\s+(\d+)\s+(\d+)\s/);
      if (!head) continue;
      const [w, h] = [Number(head[1]), Number(head[2])];
      const start = head[0].length;
      const top = Math.round(h * 0.06), foot = Math.round(h * 0.91);   // the margins; the footer sits below 91%
      let last = top;
      for (let y = top; y < foot; y++) { for (let x = 0; x < w; x++) { if (buf[start + y * w + x] < 200) { last = y; break; } } }
      out.push((last - top) / (foot - top));
    }
  }
  fs.rmSync(dir, { recursive: true, force: true });
  return out;
}

function flowWarnings(pdfPath) {
  const info = spawnSync('pdfinfo', [pdfPath], { encoding: 'utf8' });
  const pages = Number(((info.stdout || '').match(/Pages:\s+(\d+)/) || [])[1] || 0);
  const imageList = spawnSync('pdfimages', ['-list', pdfPath], { encoding: 'utf8' }).stdout || '';
  const imagesOn = (n) => imageList.split('\n').slice(2).filter((l) => Number(l.trim().split(/\s+/)[0]) === n).length;
  const warnings = [];
  for (let n = 1; n <= pages; n += 1) {
    const text = spawnSync('pdftotext', ['-f', String(n), '-l', String(n), '-layout', pdfPath, '-'], { encoding: 'utf8' }).stdout || '';
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
      .filter((l) => !/^leithbass\.space\s+\d+$/.test(l) && !/^\d+$/.test(l)); // footer
    const words = lines.join(' ').split(/\s+/).filter(Boolean).length;
    if (n === pages && pages > 1 && imagesOn(n) === 0 && words < 45) {
      warnings.push(`Page ${n} (the last page) holds only about ${words} words. Tighten earlier content or move a block so it fits, or add useful material.`);
    }
  }
  // a page that stops well short, with more to come: something big did not fit and was carried over
  const fill = pageFill(pdfPath);
  fill.forEach((f, i) => {
    const n = i + 1;
    if (n < fill.length && f < 0.68) warnings.push(`Page ${n} stops ${Math.round((1 - f) * 100)}% short of its foot: the next block did not fit and moved to page ${n + 1}. Shorten or split that block, set a figure's widthMm a little smaller, or reorder so a short block fills the space.`);
    if (n === fill.length && fill.length > 1 && f < 0.22 && !warnings.some((w) => w.startsWith(`Page ${n} `))) warnings.push(`Page ${n} (the last page) is used for only its top ${Math.round(f * 100)}%. Tighten earlier content so it fits on ${n - 1} page${n - 1 === 1 ? '' : 's'}, or add useful material.`);
  });
  return warnings;
}

async function build(sheetPath, outDir, options = {}) {
  const sheet = JSON.parse(fs.readFileSync(sheetPath, 'utf8'));
  validateSheet(sheet);
  const slug = slugify(sheet.slug || sheet.title);
  fs.mkdirSync(outDir, { recursive: true });
  const builder = new Builder(sheet, path.dirname(path.resolve(sheetPath)), outDir);
  const doc = builder.document();
  const docxPath = path.join(outDir, `${slug}.docx`);
  fs.writeFileSync(docxPath, await fixFontEmbedding(await Packer.toBuffer(doc)));
  fs.writeFileSync(path.join(outDir, `${slug}.worksheet.json`), `${JSON.stringify(sheet, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, `${slug}-audit.json`), `${JSON.stringify({ title: sheet.title, notationStaffSpaceMm: builder.staffMm, figures: builder.audit }, null, 2)}\n`);
  const result = { docxPath };
  if (sheet.portal) {
    const portalPath = path.join(outDir, `${slug}-portal.txt`);
    fs.writeFileSync(portalPath, portalText(sheet.portal, options.pdf ? `${slug}.pdf` : null));
    result.portalPath = portalPath;
  }
  if (options.pdf) {
    const soffice = '/mnt/skills/public/docx/scripts/office/soffice.py';
    // Keep figures lossless and at full resolution: LibreOffice otherwise recompresses them as
    // 300 dpi JPEG, which softens staff lines and tints white backgrounds.
    const filter = 'pdf:writer_pdf_Export:{"UseLosslessCompression":{"type":"boolean","value":"true"},"ReduceImageResolution":{"type":"boolean","value":"false"},"EmbedStandardFonts":{"type":"boolean","value":"true"}}';
    const args = fs.existsSync(soffice)
      ? ['python3', [soffice, '--headless', '--convert-to', filter, '--outdir', outDir, docxPath]]
      : ['soffice', ['--headless', '--convert-to', filter, '--outdir', outDir, docxPath]];
    const r = spawnSync(args[0], args[1], { encoding: 'utf8' });
    const pdfPath = path.join(outDir, `${slug}.pdf`);
    if (!fs.existsSync(pdfPath)) fail(`PDF conversion failed: ${(r.stderr || r.stdout || '').trim()}`);
    result.pdfPath = pdfPath;
    if (options.preview) {
      for (const f of fs.readdirSync(outDir)) if (f.startsWith(`${slug}-preview`)) fs.unlinkSync(path.join(outDir, f));
      spawnSync('pdftoppm', ['-png', '-r', '80', pdfPath, path.join(outDir, `${slug}-preview`)]);
      result.previews = fs.readdirSync(outDir).filter((f) => f.startsWith(`${slug}-preview`)).sort().map((f) => path.join(outDir, f));
      const sheetFile = result.previews.length ? contactSheet(result.previews, path.join(outDir, `${slug}-contact.png`)) : null;
      if (sheetFile) result.contactSheet = sheetFile;
    }
    result.warnings = flowWarnings(pdfPath);
  }
  return result;
}

async function main(argv = process.argv.slice(2)) {
  try {
    if (!argv.length || argv.includes('--help')) {
      process.stdout.write('Usage: node scripts/worksheet.js <worksheet.json> --out-dir <dir> [--pdf] [--preview]\n');
      return;
    }
    const o = argv.indexOf('--out-dir');
    const outDir = path.resolve(o > -1 ? argv[o + 1] : 'output');
    const result = await build(argv[0], outDir, { pdf: argv.includes('--pdf'), preview: argv.includes('--preview') });
    const { warnings = [], ...files } = result;
    for (const value of Object.values(files)) process.stdout.write(`${Array.isArray(value) ? value.join('\n') : value}\n`);
    for (const w of warnings) process.stderr.write(`Page flow: ${w}\n`);
  } catch (error) {
    process.stderr.write(`Error: ${error.message}\n`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();
module.exports = { build, portalText, NOTATION_SIZES };
