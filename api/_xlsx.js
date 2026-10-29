// Hand-built .xlsx for list delivery. Zero dependencies: SpreadsheetML + a tiny zip writer.
// Three tabs: "Start here" (cover), the list itself (styled, filters, Status dropdown, colored
// statuses, frozen header), and "Pipeline" (live counts from the Status column).
import { isSectorSlug } from './_lib.js';
import zlib from 'node:zlib';

// ---------- brand ----------
const C = {
  ink: '1F1B16',
  ink2: '3B3630',
  muted: '7A7266',
  paper: 'FBF5EA',
  paper2: 'F3EADA',
  paper3: 'E8DCC6',
  card: 'FFFDF8',
  orange: 'FF7A1A',
  orangeDeep: 'E8690F',
  peach: 'FFB27A',
  linkedin: '0A66C2',
  white: 'FFFFFF',
};
const BODY = 'Arial';
const DISPLAY = 'Georgia';

export const STATUSES = [
  { name: 'To contact', fill: 'F1ECE3', font: '5E574D' },
  { name: 'Researching', fill: 'E3EEF9', font: '1F4E79' },
  { name: 'Emailed', fill: 'FFF1D6', font: '8A5A00' },
  { name: 'Followed up', fill: 'FFE2CC', font: 'A04A00' },
  { name: 'Replied', fill: 'DDF3EC', font: '0B6B50' },
  { name: 'Meeting booked', fill: 'C9EDD3', font: '14632D', bold: true },
  { name: 'In diligence', fill: 'ECE3F7', font: '4B2A7B', bold: true },
  { name: 'Passed', fill: 'FBE1E1', font: '8B1E1E' },
  { name: 'Not a fit', fill: 'EEEEEE', font: '8A8A8A' },
];

const SENIORITY = [
  { name: 'Decision maker', fill: 'FFE7D1', font: 'A84A00', bold: true },
  { name: 'Senior', fill: 'F3EADA', font: '3B3630', bold: false },
  { name: 'Investment team', fill: 'F7F3EC', font: '7A7266', bold: false },
];

export function seniority(title) {
  const t = String(title || '');
  if (!t) return '';
  const u = t.replace(/vice[ -]president/gi, 'VP');
  if (/chief investment|\bcio\b|managing partner|founder|chairman|\bceo\b|chief executive|president|owner|principal of the family/i.test(u)) return 'Decision maker';
  if (/partner|managing director|head of|\bdirector\b|principal|\bvp\b|\bsvp\b|\bevp\b/i.test(u)) return 'Senior';
  return 'Investment team';
}

// ---------- helpers ----------
const esc = (s) =>
  String(s)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function colName(i) {
  let s = '';
  i += 1;
  while (i > 0) {
    const m = (i - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}
const ref = (c, r) => `${colName(c)}${r}`;

const clean = (v) => (v === null || v === undefined ? '' : String(v).trim());
function url(u) {
  const s = clean(u);
  if (!s) return '';
  return /^https?:\/\//i.test(s) ? s.replace(/^http:\/\/(www\.)?linkedin/i, 'https://www.linkedin') : `https://${s}`;
}
const bareHost = (u) => clean(u).replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');

function excelDate(d) {
  return Math.floor((d.getTime() - Date.UTC(1899, 11, 30)) / 86400000);
}
const fmtDate = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Lisbon' });

// ---------- styles registry ----------
class Styles {
  constructor() {
    this.fonts = [];
    this.fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
    this.borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>'];
    this.numFmts = [];
    this.xfs = [];
    this.xfKey = new Map();
    this.dxfs = [];
    this.font({}); // default font, index 0
    this.get({}); // default xf, index 0
  }
  _idx(arr, xml) {
    let i = arr.indexOf(xml);
    if (i === -1) {
      arr.push(xml);
      i = arr.length - 1;
    }
    return i;
  }
  font({ size = 10, color = C.ink, bold, italic, underline, name = BODY, strike } = {}) {
    const xml = `<font>${bold ? '<b/>' : ''}${italic ? '<i/>' : ''}${strike ? '<strike/>' : ''}${underline ? '<u/>' : ''}<sz val="${size}"/><color rgb="FF${color}"/><name val="${name}"/><family val="2"/></font>`;
    return this._idx(this.fonts, xml);
  }
  fill(color) {
    if (!color) return 0;
    return this._idx(this.fills, `<fill><patternFill patternType="solid"><fgColor rgb="FF${color}"/><bgColor indexed="64"/></patternFill></fill>`);
  }
  border(b) {
    if (!b) return 0;
    const side = (k) => (b[k] ? `<${k} style="${b[k][0]}"><color rgb="FF${b[k][1]}"/></${k}>` : `<${k}/>`);
    return this._idx(this.borders, `<border>${side('left')}${side('right')}${side('top')}${side('bottom')}<diagonal/></border>`);
  }
  numFmt(code) {
    if (!code) return 0;
    const builtin = { '0': 1, '0%': 9, '0.0%': null };
    if (builtin[code]) return builtin[code];
    let i = this.numFmts.indexOf(code);
    if (i === -1) {
      this.numFmts.push(code);
      i = this.numFmts.length - 1;
    }
    return 164 + i;
  }
  // s: { font:{}, fill, border:{bottom:['thin','E8DCC6']}, h:'center', v:'center', wrap, indent, numFmt }
  get(s) {
    const key = JSON.stringify(s);
    if (this.xfKey.has(key)) return this.xfKey.get(key);
    const fontId = this.font(s.font || {});
    const fillId = this.fill(s.fill);
    const borderId = this.border(s.border);
    const numFmtId = this.numFmt(s.numFmt);
    const align =
      s.h || s.v || s.wrap || s.indent
        ? `<alignment${s.h ? ` horizontal="${s.h}"` : ''} vertical="${s.v || 'center'}"${s.wrap ? ' wrapText="1"' : ''}${s.indent ? ` indent="${s.indent}"` : ''}/>`
        : '<alignment vertical="center"/>';
    const xml = `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"${numFmtId ? ' applyNumberFormat="1"' : ''}>${align}</xf>`;
    this.xfs.push(xml);
    const id = this.xfs.length - 1;
    this.xfKey.set(key, id);
    return id;
  }
  dxf({ fill, color, bold, strike }) {
    this.dxfs.push(
      `<dxf><font>${bold ? '<b/>' : ''}${strike ? '<strike/>' : ''}<color rgb="FF${color}"/></font><fill><patternFill patternType="solid"><fgColor rgb="FF${fill}"/><bgColor rgb="FF${fill}"/></patternFill></fill></dxf>`,
    );
    return this.dxfs.length - 1;
  }
  xml() {
    const nf = this.numFmts.length
      ? `<numFmts count="${this.numFmts.length}">${this.numFmts.map((c, i) => `<numFmt numFmtId="${164 + i}" formatCode="${esc(c)}"/>`).join('')}</numFmts>`
      : '';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${nf}<fonts count="${this.fonts.length}">${this.fonts.join('')}</fonts><fills count="${this.fills.length}">${this.fills.join('')}</fills><borders count="${this.borders.length}">${this.borders.join('')}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${this.xfs.length}">${this.xfs.join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="${this.dxfs.length}">${this.dxfs.join('')}</dxfs><tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/></styleSheet>`;
  }
}

// ---------- sheet builder ----------
class Sheet {
  constructor(name, { tab, gridlines = true } = {}) {
    this.name = name;
    this.tab = tab;
    this.gridlines = gridlines;
    this.rows = new Map(); // r -> { height, cells: Map(c -> xml) }
    this.cols = [];
    this.merges = [];
    this.links = []; // { ref, target, tooltip }
    this.cf = [];
    this.validations = [];
    this.freeze = null;
    this.filter = null;
    this.maxC = 0;
    this.maxR = 0;
    this.landscape = false;
  }
  row(r, height) {
    if (!this.rows.has(r)) this.rows.set(r, { height: undefined, cells: new Map() });
    const row = this.rows.get(r);
    if (height) row.height = height;
    this.maxR = Math.max(this.maxR, r);
    return row;
  }
  set(c, r, value, style = 0, { formula, link, tooltip } = {}) {
    const row = this.row(r);
    this.maxC = Math.max(this.maxC, c);
    const a = ref(c, r);
    let xml;
    if (formula) xml = `<c r="${a}" s="${style}"><f>${esc(formula)}</f></c>`;
    else if (value === '' || value === null || value === undefined) xml = `<c r="${a}" s="${style}"/>`;
    else if (typeof value === 'number') xml = `<c r="${a}" s="${style}"><v>${value}</v></c>`;
    else xml = `<c r="${a}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`;
    row.cells.set(c, xml);
    if (link) this.links.push({ ref: a, target: link, tooltip });
  }
  fillRow(r, c0, c1, style) {
    for (let c = c0; c <= c1; c++) if (!this.row(r).cells.has(c)) this.set(c, r, '', style);
  }
  merge(c0, r0, c1, r1) {
    this.merges.push(`${ref(c0, r0)}:${ref(c1, r1)}`);
  }
  xml() {
    const rows = [...this.rows.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([r, row]) => {
        const cells = [...row.cells.entries()].sort((a, b) => a[0] - b[0]).map(([, x]) => x).join('');
        return `<row r="${r}"${row.height ? ` ht="${row.height}" customHeight="1"` : ''}>${cells}</row>`;
      })
      .join('');
    const cols = this.cols.length
      ? `<cols>${this.cols.map((w, i) => (w ? `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>` : '')).join('')}</cols>`
      : '';
    let pane = '';
    if (this.freeze) {
      const [c, r] = this.freeze; // first unfrozen col/row (0-based col, 1-based row)
      const tl = ref(c, r);
      const attrs = `${c ? ` xSplit="${c}"` : ''}${r > 1 ? ` ySplit="${r - 1}"` : ''}`;
      const active = c && r > 1 ? 'bottomRight' : r > 1 ? 'bottomLeft' : 'topRight';
      pane = `<pane${attrs} topLeftCell="${tl}" activePane="${active}" state="frozen"/><selection pane="${active}" activeCell="${tl}" sqref="${tl}"/>`;
    }
    const dim = `A1:${ref(Math.max(this.maxC, 0), Math.max(this.maxR, 1))}`;
    const linkRels = this.links.map((l, i) => ({ ...l, rid: `rId${i + 1}` }));
    this.rels = linkRels;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr>${this.tab ? `<tabColor rgb="FF${this.tab}"/>` : ''}<pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="${dim}"/><sheetViews><sheetView workbookViewId="0"${this.gridlines ? '' : ' showGridLines="0"'} zoomScale="110" zoomScaleNormal="110">${pane}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${rows}</sheetData>${this.filter ? `<autoFilter ref="${this.filter}"/>` : ''}${this.merges.length ? `<mergeCells count="${this.merges.length}">${this.merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''}${this.cf.join('')}${this.validations.length ? `<dataValidations count="${this.validations.length}">${this.validations.join('')}</dataValidations>` : ''}${linkRels.length ? `<hyperlinks>${linkRels.map((l) => `<hyperlink ref="${l.ref}" r:id="${l.rid}"${l.tooltip ? ` tooltip="${esc(l.tooltip)}"` : ''}/>`).join('')}</hyperlinks>` : ''}<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup orientation="${this.landscape ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="0"/><headerFooter><oddFooter>&amp;L&amp;8Climate Insiders Investor Lists&amp;R&amp;8Page &amp;P of &amp;N</oddFooter></headerFooter></worksheet>`;
  }
  relsXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${this.rels
      .map((l) => `<Relationship Id="${l.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${esc(l.target)}" TargetMode="External"/>`)
      .join('')}</Relationships>`;
  }
}

// ---------- zip ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function zip(files) {
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8');
    const data = Buffer.isBuffer(f.data) ? f.data : Buffer.from(f.data, 'utf8');
    const comp = zlib.deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0x0800, 6);
    lh.writeUInt16LE(8, 8);
    lh.writeUInt16LE(dosTime, 10);
    lh.writeUInt16LE(dosDate, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(comp.length, 18);
    lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(name.length, 26);
    lh.writeUInt16LE(0, 28);
    locals.push(lh, name, comp);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt16LE(8, 10);
    ch.writeUInt16LE(dosTime, 12);
    ch.writeUInt16LE(dosDate, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(comp.length, 20);
    ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(name.length, 28);
    ch.writeUInt32LE(offset, 42);
    centrals.push(ch, name);
    offset += 30 + name.length + comp.length;
  }
  const cdSize = centrals.reduce((a, b) => a + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cdSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

// ---------- the workbook ----------
export function xlsxFilename(list) {
  return String(list.csv_filename || `${list.slug}.csv`).replace(/\.csv$/i, '') + '.xlsx';
}

// entries: rows from getEntries (already ordered: most complete first)
export function toXlsx(entries, list, { name, date = new Date() } = {}) {
  const st = new Styles();
  const sectorList = isSectorSlug(list.slug); // people rows with stage + cheque size, never a fund directory
  const isFunds = !sectorList && entries.some((e) => e.extra && (e.extra.stage || e.extra.sector));
  const listTab = String(list.short_name || list.name || 'List').replace(/[\\/?*[\]:]/g, '').slice(0, 28);
  const sheetName = isFunds ? 'Funds' : listTab;
  const qs = `'${sheetName.replace(/'/g, "''")}'`;
  const first = 5;
  const last = first + Math.max(entries.length, 1) - 1;

  // shared styles
  const bandTitle = st.get({ font: { name: DISPLAY, size: 20, bold: true, color: C.white }, fill: C.ink, indent: 1 });
  const bandSub = st.get({ font: { size: 10, color: C.peach }, fill: C.ink, indent: 1 });
  const stripe = st.get({ fill: C.orange });
  const head = st.get({ font: { bold: true, size: 10, color: C.ink }, fill: C.paper2, border: { bottom: ['medium', C.orange] }, indent: 1 });
  const headC = st.get({ font: { bold: true, size: 10, color: C.ink }, fill: C.paper2, border: { bottom: ['medium', C.orange] }, h: 'center' });
  const rule = ['thin', C.paper3];
  const zebra = (i) => (i % 2 ? C.paper : C.card);
  const cell = (i, extra = {}) => st.get({ fill: zebra(i), border: { bottom: rule }, indent: extra.h ? undefined : 1, ...extra, font: { size: 10, color: C.ink, ...(extra.font || {}) } });

  // ===== list sheet =====
  const sh = new Sheet(sheetName, { tab: C.orange, gridlines: false });
  sh.landscape = true;
  const cols = isFunds
    ? [
        { h: '#', w: 6, center: true },
        { h: 'Fund', w: 30 },
        { h: 'HQ', w: 16 },
        { h: 'Invests in', w: 30 },
        { h: 'Stage', w: 26 },
        { h: 'Sectors', w: 44 },
        { h: 'Ticket (m EUR)', w: 15, center: true },
        { h: 'Website', w: 26 },
        { h: 'Status', w: 17, center: true },
        { h: 'Last touch', w: 13, center: true },
        { h: 'Notes', w: 40 },
      ]
    : [
        { h: '#', w: 6, center: true },
        { h: 'Name', w: 24 },
        { h: 'Title', w: 34 },
        { h: 'Firm', w: 30 },
        { h: 'Seniority', w: 17, center: true },
        { h: 'Email', w: 34 },
        { h: 'LinkedIn', w: 14, center: true },
        { h: 'City', w: 16 },
        { h: 'Country', w: 16 },
        { h: 'Website', w: 24 },
        ...(sectorList ? [{ h: 'Stage', w: 24 }, { h: 'Cheque size', w: 18, center: true }] : []),
        { h: 'Status', w: 17, center: true },
        { h: 'Last touch', w: 13, center: true },
        { h: 'Notes', w: 40 },
      ];
  const lastCol = cols.length - 1;
  sh.cols = cols.map((c) => c.w);
  const withEmail = entries.filter((e) => clean(e.email)).length;
  const withLi = entries.filter((e) => clean(e.linkedin_url)).length;
  const countries = new Set(entries.map((e) => clean(e.country)).filter(Boolean)).size;

  sh.row(1, 40);
  sh.set(0, 1, `${list.name}`, bandTitle);
  sh.fillRow(1, 1, lastCol, bandTitle);
  sh.merge(0, 1, lastCol, 1);
  const subBits = [
    'Climate Insiders Investor Lists',
    name ? `prepared for ${name}, ${fmtDate(date)}` : fmtDate(date),
    isFunds ? `${entries.length} funds` : `${entries.length} contacts, ${withEmail} with a direct email`,
    'most complete rows first',
  ];
  sh.row(2, 22);
  sh.set(0, 2, subBits.join('    |    '), bandSub);
  sh.fillRow(2, 1, lastCol, bandSub);
  sh.merge(0, 2, lastCol, 2);
  sh.row(3, 5);
  sh.fillRow(3, 0, lastCol, stripe);
  sh.row(4, 28);
  cols.forEach((c, i) => sh.set(i, 4, c.h, c.center ? headC : head));

  const statusCol = cols.findIndex((c) => c.h === 'Status');
  const touchCol = statusCol + 1;
  const notesCol = statusCol + 2;
  const senCol = cols.findIndex((c) => c.h === 'Seniority');

  entries.forEach((e, i) => {
    const r = first + i;
    sh.row(r, 21);
    const n = st.get({ fill: zebra(i), border: { bottom: rule }, h: 'center', font: { size: 9, color: C.muted } });
    sh.set(0, r, Number(e.sort_order) || i + 1, n);
    if (isFunds) {
      const x = e.extra || {};
      sh.set(1, r, clean(e.firm), cell(i, { font: { bold: true } }));
      sh.set(2, r, clean(e.city), cell(i));
      sh.set(3, r, clean(e.region), cell(i));
      sh.set(4, r, clean(x.stage), cell(i));
      sh.set(5, r, clean(x.sector), cell(i, { font: { color: C.ink2 } }));
      const min = clean(x.min);
      const max = clean(x.max);
      sh.set(6, r, min && max ? `${min} to ${max}` : min || max, cell(i, { h: 'center' }));
      const w = clean(e.website);
      sh.set(7, r, w ? bareHost(w) : '', cell(i, { font: { color: C.orangeDeep, underline: !!w } }), w ? { link: url(w), tooltip: 'Open website' } : {});
    } else {
      sh.set(1, r, clean(e.name), cell(i, { font: { bold: true } }));
      sh.set(2, r, clean(e.title), cell(i, { font: { color: C.ink2 } }));
      sh.set(3, r, clean(e.firm), cell(i));
      const sen = seniority(e.title);
      const sv = SENIORITY.find((s) => s.name === sen);
      sh.set(4, r, sen, sv ? st.get({ fill: sv.fill, border: { bottom: rule }, h: 'center', font: { size: 9, bold: sv.bold, color: sv.font } }) : cell(i, { h: 'center' }));
      const em = clean(e.email);
      if (em) sh.set(5, r, em.toLowerCase(), cell(i, { font: { color: C.orangeDeep, underline: true } }), { link: `mailto:${em}`, tooltip: `Email ${clean(e.name) || em}` });
      else if (clean(e.linkedin_url)) sh.set(5, r, 'reach via LinkedIn', cell(i, { font: { color: C.muted, italic: true, size: 9 } }));
      else sh.set(5, r, '', cell(i));
      const li = clean(e.linkedin_url);
      sh.set(6, r, li ? 'View profile' : '', cell(i, { h: 'center', font: { color: C.linkedin, underline: !!li, size: 9, bold: !!li } }), li ? { link: url(li), tooltip: 'Open LinkedIn profile' } : {});
      const city = clean(e.city);
      const country = clean(e.country) || clean(e.region);
      sh.set(7, r, city && city.toLowerCase() !== country.toLowerCase() ? city : '', cell(i));
      sh.set(8, r, country, cell(i));
      const w = clean(e.website);
      sh.set(9, r, w ? bareHost(w) : '', cell(i, { font: { color: C.orangeDeep, underline: !!w } }), w ? { link: url(w), tooltip: 'Open website' } : {});
      if (sectorList) {
        sh.set(10, r, clean(e.extra?.stage), cell(i));
        sh.set(11, r, clean(e.extra?.check), cell(i, { h: 'center' }));
      }
    }
    sh.set(statusCol, r, 'To contact', cell(i, { h: 'center', font: { size: 9 } }));
    sh.set(touchCol, r, '', cell(i, { h: 'center', numFmt: 'd mmm yyyy' }));
    sh.set(notesCol, r, '', cell(i, { font: { color: C.ink2 } }));
  });

  sh.freeze = [2, first];
  sh.filter = `${ref(0, 4)}:${ref(lastCol, last)}`;
  const sRange = `${ref(statusCol, first)}:${ref(statusCol, last)}`;
  sh.validations.push(
    `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" errorTitle="Pick a status" error="Choose one of the options in the list." promptTitle="Status" prompt="Track where you are with this investor." sqref="${sRange}"><formula1>"${STATUSES.map((s) => s.name).join(',')}"</formula1></dataValidation>`,
    `<dataValidation type="date" operator="greaterThan" allowBlank="1" showInputMessage="1" showErrorMessage="1" errorTitle="Date" error="Type a date, for example 3 Nov 2026." promptTitle="Last touch" prompt="Date of your last email, call or meeting." sqref="${ref(touchCol, first)}:${ref(touchCol, last)}"><formula1>36526</formula1></dataValidation>`,
  );
  let prio = 1;
  const rules = STATUSES.map(
    (s) =>
      `<cfRule type="cellIs" dxfId="${st.dxf({ fill: s.fill, color: s.font, bold: s.bold, strike: s.name === 'Not a fit' })}" priority="${prio++}" operator="equal"><formula>"${s.name}"</formula></cfRule>`,
  ).join('');
  sh.cf.push(`<conditionalFormatting sqref="${sRange}">${rules}</conditionalFormatting>`);
  // Whole row goes soft green once a meeting is booked.
  const rowRange = `${ref(1, first)}:${ref(lastCol, last)}`;
  const greenRow = st.dxf({ fill: 'EAF7EE', color: C.ink });
  sh.cf.push(
    `<conditionalFormatting sqref="${rowRange}"><cfRule type="expression" dxfId="${greenRow}" priority="${prio++}"><formula>OR($${colName(statusCol)}${first}="Meeting booked",$${colName(statusCol)}${first}="In diligence")</formula></cfRule></conditionalFormatting>`,
  );
  if (senCol >= 0) void senCol;

  // ===== Pipeline =====
  const pl = new Sheet('Pipeline', { tab: '14632D', gridlines: false });
  pl.cols = [3, 24, 12, 12, 40, 3];
  const plTitle = st.get({ font: { name: DISPLAY, size: 20, bold: true, color: C.ink }, v: 'bottom' });
  const plNote = st.get({ font: { size: 10, color: C.muted, italic: true } });
  const plHead = st.get({ font: { bold: true, size: 10 }, fill: C.paper2, border: { bottom: ['medium', C.orange] }, indent: 1 });
  const plHeadC = st.get({ font: { bold: true, size: 10 }, fill: C.paper2, border: { bottom: ['medium', C.orange] }, h: 'center' });
  pl.row(2, 34);
  pl.set(1, 2, 'Your pipeline', plTitle);
  pl.set(1, 3, `Updates itself from the Status column in the ${sheetName} tab.`, plNote);
  pl.row(5, 24);
  ['Status', 'Count', 'Share', ''].forEach((h, i) => pl.set(1 + i, 5, h, i === 0 || i === 3 ? plHead : plHeadC));
  const sRangeAbs = `${qs}!$${colName(statusCol)}$${first}:$${colName(statusCol)}$${last}`;
  STATUSES.forEach((s, i) => {
    const r = 6 + i;
    pl.row(r, 22);
    pl.set(1, r, s.name, st.get({ fill: s.fill, font: { size: 10, bold: true, color: s.font }, border: { bottom: ['thin', C.white] }, indent: 1 }));
    pl.set(2, r, '', st.get({ h: 'center', border: { bottom: rule }, font: { size: 11, bold: true } }), { formula: `COUNTIF(${sRangeAbs},"${s.name}")` });
    pl.set(3, r, '', st.get({ h: 'center', border: { bottom: rule }, numFmt: '0%', font: { size: 10, color: C.muted } }), {
      formula: `IFERROR(${colName(2)}${r}/SUM($${colName(2)}$6:$${colName(2)}$${5 + STATUSES.length}),0)`,
    });
    pl.set(4, r, '', st.get({ border: { bottom: rule } }), { formula: `${colName(2)}${r}` });
  });
  const lastS = 5 + STATUSES.length;
  pl.cf.push(
    `<conditionalFormatting sqref="E6:E${lastS}"><cfRule type="dataBar" priority="1"><dataBar showValue="0" minLength="0" maxLength="100"><cfvo type="num" val="0"/><cfvo type="max"/><color rgb="FFFF7A1A"/></dataBar></cfRule></conditionalFormatting>`,
  );
  const kpiL = st.get({ font: { size: 10, color: C.muted }, indent: 1 });
  const kpiV = st.get({ font: { name: DISPLAY, size: 16, bold: true, color: C.ink }, h: 'center', numFmt: '0%' });
  const kpiN = st.get({ font: { name: DISPLAY, size: 16, bold: true, color: C.ink }, h: 'center' });
  const k = lastS + 2;
  const cnt = (name) => `${colName(2)}${6 + STATUSES.findIndex((s) => s.name === name)}`;
  pl.row(k, 26);
  pl.set(1, k, 'Investors contacted', kpiL);
  pl.set(2, k, '', kpiN, { formula: `${cnt('Emailed')}+${cnt('Followed up')}+${cnt('Replied')}+${cnt('Meeting booked')}+${cnt('In diligence')}+${cnt('Passed')}` });
  pl.row(k + 1, 26);
  pl.set(1, k + 1, 'Reply rate', kpiL);
  pl.set(2, k + 1, '', kpiV, { formula: `IFERROR((${cnt('Replied')}+${cnt('Meeting booked')}+${cnt('In diligence')}+${cnt('Passed')})/${colName(2)}${k},0)` });
  pl.row(k + 2, 26);
  pl.set(1, k + 2, 'Meetings', kpiL);
  pl.set(2, k + 2, '', kpiN, { formula: `${cnt('Meeting booked')}+${cnt('In diligence')}` });
  if (!isFunds) {
    const t = k + 4;
    pl.row(t, 24);
    ['Seniority', 'Count', 'Emailable', ''].forEach((h, i) => pl.set(1 + i, t, h, i === 0 || i === 3 ? plHead : plHeadC));
    const senRange = `${qs}!$${colName(senCol)}$${first}:$${colName(senCol)}$${last}`;
    const emRange = `${qs}!$${colName(5)}$${first}:$${colName(5)}$${last}`;
    SENIORITY.forEach((s, i) => {
      const r = t + 1 + i;
      pl.row(r, 22);
      pl.set(1, r, s.name, st.get({ fill: s.fill, font: { size: 10, bold: true, color: s.font }, border: { bottom: ['thin', C.white] }, indent: 1 }));
      pl.set(2, r, '', st.get({ h: 'center', border: { bottom: rule }, font: { size: 11, bold: true } }), { formula: `COUNTIF(${senRange},"${s.name}")` });
      pl.set(3, r, '', st.get({ h: 'center', border: { bottom: rule }, font: { size: 10, color: C.muted } }), { formula: `COUNTIFS(${senRange},"${s.name}",${emRange},"*@*")` });
    });
  }

  // ===== Start here =====
  const cv = new Sheet('Start here', { tab: C.ink, gridlines: false });
  cv.cols = [3, 30, 22, 22, 22, 3];
  const pageFill = C.paper;
  const pg = (s = {}) => st.get({ fill: pageFill, ...s, font: { size: 10, color: C.ink, ...(s.font || {}) } });
  for (let r = 1; r <= 34; r++) cv.fillRow(r, 0, 5, pg());
  cv.row(2, 18);
  cv.set(1, 2, 'CLIMATE INSIDERS INVESTOR LISTS', pg({ font: { size: 9, bold: true, color: C.orangeDeep } }));
  cv.row(3, 44);
  cv.set(1, 3, list.name, pg({ font: { name: DISPLAY, size: 24, bold: true }, v: 'bottom' }));
  cv.merge(1, 3, 4, 3);
  cv.row(4, 20);
  cv.set(1, 4, clean(list.tagline), pg({ font: { size: 11, color: C.ink2 } }));
  cv.merge(1, 4, 4, 4);
  cv.row(5, 18);
  cv.set(1, 5, name ? `Prepared for ${name} on ${fmtDate(date)}` : `Prepared on ${fmtDate(date)}`, pg({ font: { size: 10, italic: true, color: C.muted } }));
  cv.row(6, 6);
  for (let c = 1; c <= 4; c++) cv.set(c, 6, '', st.get({ fill: pageFill, border: { bottom: ['medium', C.orange] } }));

  const statBox = st.get({ fill: C.card, font: { name: DISPLAY, size: 22, bold: true, color: C.ink }, h: 'center', v: 'bottom', border: { top: ['thin', C.paper3], left: ['thin', C.paper3], right: ['thin', C.paper3] } });
  const statLbl = st.get({ fill: C.card, font: { size: 9, color: C.muted }, h: 'center', v: 'top', border: { bottom: ['thin', C.paper3], left: ['thin', C.paper3], right: ['thin', C.paper3] } });
  const stats = isFunds
    ? [
        [entries.length, 'climate funds'],
        [entries.filter((e) => clean(e.website)).length, 'with a website'],
        [entries.filter((e) => e.extra && clean(e.extra.min)).length, 'with ticket sizes'],
        [entries.filter((e) => e.extra && /lead|yes/i.test(clean(e.extra.lead))).length || new Set(entries.map((e) => clean(e.city)).filter(Boolean)).size, entries.some((e) => e.extra && /lead|yes/i.test(clean(e.extra.lead))) ? 'take the lead' : 'HQ cities'],
      ]
    : [
        [entries.length, 'contacts'],
        [withEmail, 'direct emails'],
        [withLi, 'LinkedIn profiles'],
        [countries, countries === 1 ? 'country' : 'countries'],
      ];
  cv.row(8, 36);
  cv.row(9, 18);
  stats.forEach(([v, l], i) => {
    cv.set(1 + i, 8, v, statBox);
    cv.set(1 + i, 9, l, statLbl);
  });

  const h2 = pg({ font: { name: DISPLAY, size: 13, bold: true }, v: 'bottom' });
  const p = pg({ font: { size: 10, color: C.ink2 }, wrap: true, v: 'top' });
  const num = pg({ font: { name: DISPLAY, size: 13, bold: true, color: C.orange }, h: 'right', v: 'top' });
  cv.row(11, 26);
  cv.set(1, 11, "How I'd work this list", h2);
  const tips = isFunds
    ? [
        'Filter Stage and Sectors to your round first. A fund that never writes your ticket size is a no, however famous.',
        'Open the website, find the partner who led their last deal in your space, and write to that person by name.',
        'Log every touch in Status. The Pipeline tab counts replies and meetings for you.',
      ]
    : [
        'Filter Seniority to "Decision maker" and start there. Fewer emails, better answers.',
        "Before you write, read their last 3 deals. If you can't say in one line why they'd care, skip them.",
        'Log every touch in Status and Last touch. The Pipeline tab counts replies and meetings for you.',
      ];
  tips.forEach((t, i) => {
    const r = 12 + i;
    cv.row(r, 32);
    cv.set(0, r, i + 1, num);
    cv.set(1, r, t, p);
    cv.merge(1, r, 4, r);
  });

  cv.row(16, 26);
  cv.set(1, 16, 'Status colors', h2);
  STATUSES.forEach((s, i) => {
    const r = 17 + Math.floor(i / 3);
    const c = 1 + (i % 3);
    cv.row(r, 22);
    cv.set(c, r, s.name, st.get({ fill: s.fill, font: { size: 10, bold: true, color: s.font }, h: 'center', border: { bottom: ['thick', pageFill], right: ['thick', pageFill] } }));
  });
  cv.row(21, 30);
  cv.set(1, 21, `Click the ${sheetName} tab below to start. The Status cell on every row is a dropdown.`, pg({ font: { size: 10, color: C.ink2 } }));
  cv.merge(1, 21, 4, 21);
  cv.row(22, 22);
  cv.set(1, 22, 'Found a wrong row? Reply to the email it came with and I fix it.', pg({ font: { size: 10, color: C.ink2 } }));
  cv.merge(1, 22, 4, 22);
  cv.row(24, 24);
  cv.set(1, 24, 'Yoann', pg({ font: { name: 'Segoe Script', size: 16, color: C.orangeDeep } }));
  cv.set(1, 25, 'Climate Insiders', pg({ font: { size: 9, color: C.muted } }));
  cv.set(1, 27, 'Every list:', pg({ font: { size: 9, color: C.muted } }));
  cv.set(2, 27, 'lists.climateinsiders.com/all', pg({ font: { size: 9, color: C.orangeDeep, underline: true } }), { link: 'https://lists.climateinsiders.com/all' });

  // ===== package =====
  const sheets = [cv, sh, pl];
  const sheetXml = sheets.map((s) => s.xml());
  const files = [
    {
      name: '[Content_Types].xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets
        .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
        .join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`,
    },
    {
      name: '_rels/.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`,
    },
    {
      name: 'docProps/core.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(list.name)}</dc:title><dc:subject>Climate Insiders Investor Lists</dc:subject><dc:creator>Yoann Berno, Climate Insiders</dc:creator><cp:lastModifiedBy>Climate Insiders</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${date.toISOString().replace(/\.\d+Z$/, 'Z')}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${date.toISOString().replace(/\.\d+Z$/, 'Z')}</dcterms:modified></cp:coreProperties>`,
    },
    {
      name: 'docProps/app.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Microsoft Excel</Application><Company>Climate Insiders</Company></Properties>`,
    },
    {
      name: 'xl/workbook.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${sheets
        .map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
        .join('')}</sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="1" hidden="1">${esc(`${qs}!$A$4:$${colName(lastCol)}$${last}`)}</definedName><definedName name="_xlnm.Print_Titles" localSheetId="1">${esc(`${qs}!$4:$4`)}</definedName></definedNames><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
        .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
        .join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    { name: 'xl/styles.xml', data: st.xml() },
  ];
  sheets.forEach((s, i) => {
    files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml[i] });
    if (s.rels.length) files.push({ name: `xl/worksheets/_rels/sheet${i + 1}.xml.rels`, data: s.relsXml() });
  });
  return zip(files);
}
