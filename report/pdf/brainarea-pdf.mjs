/**
 * brainarea-pdf.mjs — rapport → PDF v1.0.0 ([BYGG] FASE 3, todo-run leaf «PDF-nedlasting av resultat»).
 *
 * Søster-leveranse i beslutning-16-kjeden («Delbarhet = hardt krav: SVG/canvas-delgraf,
 * PDF, tredjepartslesbar resultattekst …»), teknisk søsken til #3790-delgrafen:
 *  - ren ES-modul, ingen dependencies, ingen fs/nett — PDF bygges som bytes i minnet
 *  - deterministisk: samme input gir byte-identisk PDF (ingen klokke, ingen rng)
 *  - konfigfeil KASTER (renderer-konvensjonen) — aldri stille fallback
 *  - identifikatorfri dataflate: input er kun scoring-resultatet + tekster fra config
 *
 * Konsumerer (samme kontrakt som renderReport):
 *   result = scoring.js scoreTest()-utdata (schemaVersion 1)
 *   config = report-config.schema.json-konform ramme-config
 *   opts   = { lang: 'no'|'en', fontRegular?: Uint8Array, fontBold?: Uint8Array }
 *
 * Kvalitetskontrakten fra rapportlaget følges på PDF-flaten:
 *  1. normNote står ved alle skårblokker (fra config, verbatim)
 *  2. midtpunkt ≠ prosent-av-maks: midtdash tegnes egen farge/dash; legenden er egen linje
 *  3. iqScale leses aldri; θ bare når estimert (1.0.1-konvensjonen)
 *  4. employer-rammen: samtalegrunnlag-tekst + forbudsskann (scanBanned) over alle strenger
 *  5. alle synlige strenger samles i strings-sink (inkl. grafetiketter — sink-hullet
 *     fra renderer.svg er IKKE gjentatt her; grafetiketter går gjennom tekstsanken)
 *  6. tredjepartslesbar: thirdParty-tekst + kontekstlinje [frame] testId på side 1
 *
 * Grenser (ærlig, dokumentert):
 *  - PDF-en er en "flat" rendring: ingen lenker/anker/interaktive elementer.
 *  - Skrift: DejaVu Sans/Bold som TTF-bytes (kalleren leverer; prod-path bygger dem
 *    inn fra /fonts-pakken ved release-bygg). Tegnbegrensning håndheves i subsettet.
 *  - Ingen eksisterende HTML→CSS-transform: PDF-layouten er egen deterministisk tegning
 *    (samme data, samme tekst, egen tegnerorden — som delgrafens SVG/Canvas-tvillinger).
 *
 * Eksport:
 *   renderReportPdf(result, config, opts) -> { bytes, meta, strings }
 *     bytes  = Uint8Array (PDF-fil)
 *     meta   = { version, lang, frame, testId, pages, objects, fontBytes, pdfBytes }
 *     strings= alle synlige strenger i tegnerorden (ban-scan-sink)
 */

import { readTables, subsetFont } from './pdffont.mjs';

export const BRAINAREA_PDF_VERSION = '1.0.0';

/* ---------- konstante mål (pt, A4) ---------- */
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const CONTENT_W = PAGE_W - 2 * MARGIN; /* 499.28 */
/* farger (sRGB, samme palett som renderer-SVG'en) */
const INK = [17, 24, 39];        /* #111827 */
const SUB = [55, 65, 81];        /* #374151 */
const FAINT = [107, 114, 128];   /* #6b7280 */
const TRACK = [241, 245, 249];   /* #f1f5f9 */
const BAR = [30, 64, 175];       /* #1e40af */
const MID = [209, 213, 219];     /* #d1d5db */
const MIDW = [17, 24, 39];       /* midtpunktstrek: #111827 */
const RULE = [212, 212, 216];    /* #d4d4d8 */
const BADGE_BG = [254, 243, 199];/* #fef3c7 */
const BADGE_BD = [245, 158, 11]; /* #f59e0b */
const WHITE = [255, 255, 255];

/* ---------- verktøy ---------- */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** bilingual-oppslag — aldri stille EN-fallback (renderer-konvensjon L()). */
function L(obj, lang, where) {
  if (!obj || typeof obj !== 'object') throw new Error('brainarea-pdf: ' + where + ' mangler i config');
  const v = obj[lang];
  if (typeof v !== 'string' || v.trim().length === 0) throw new Error('brainarea-pdf: ' + where + '.' + lang + ' mangler/tom i config');
  return v;
}

/* negasjonsbevisst forbudsskann — samme semantikk som renderer.mjs (substring + chunk-negasjon) */
const NEG_CUE = /(^|[^A-Za-z\u00e6\u00f8\u00e5\u00c6\u00d8\u00c5])(ikke|aldri|no|not|never|kan\s+ikke|skal\s+ikke|m\u00e5\s+ikke|kan\s+aldri)\b/i;
const CHUNK_SPLIT = /(?<=[.!?;])\s+|\s+[-\u2014]\s+/;
export function scanPdfBanned(strings, terms) {
  const violations = [];
  const lower = terms.map((t) => String(t).toLowerCase());
  for (const s0 of strings) {
    for (const chunk of String(s0).split(CHUNK_SPLIT)) {
      const hasNeg = NEG_CUE.test(chunk);
      const low = chunk.toLowerCase();
      for (const t of lower) {
        if (t.length && low.includes(t) && !hasNeg) violations.push({ term: t, chunk: chunk.trim().slice(0, 120) });
      }
    }
  }
  return violations;
}

/* enkel tekst-brytning (vidd fra fontens width1000) */
function stringWidth(text, font, size) {
  let total = 0;
  for (const ch of String(text)) {
    const cp = ch.codePointAt(0);
    total += cp === 32 ? font.space1000 : font.width1000(cp);
  }
  return total / 1000 * size;
}

/** PDF-streng for Identity-H: code == unicode, 2 bytes high-endian per BMP-kodepunkt. */
function toPdfHex(text) {
  let out = '';
  for (const ch of String(text)) {
    const cp = ch.codePointAt(0);
    if (cp > 0xFFFF) throw new Error('brainarea-pdf: kodepunkt utenfor BMP i rendret tekst: U+' + cp.toString(16));
    out += cp.toString(16).toUpperCase().padStart(4, '0');
  }
  return '<' + out + '>';
}

function colPdf(c) { return `${c[0]/255} ${c[1]/255} ${c[2]/255}`; }

const DEFLO = () => ({ no: 'Ikke beregnelig i denne økten', en: 'Not computable in this session' });

/* ---------- flate: PageCtx med y-cursor og op-logging ---------- */
class Surface {
  constructor(strings) {
    this.strings = strings;              /* sink: alle synlige strenger i tegnerorden */
    this.pages = [];                     /* array av op-string[] */
    this.cur = [];
    this.y = PAGE_H - MARGIN;            /* baseline-cursor (PDF-koordinater: bunnen = 0) */
    this.strings = strings;
  }
  endPage() { this.pages.push(this.cur); this.cur = []; this.y = PAGE_H - MARGIN; }
  need(h) { if (this.y - h < MARGIN) this.endPage(); }
  rule(color = RULE, width = 0.75) {
    this.need(6);
    this.y -= 4;
    this.cur.push('0.75 w ' + colPdf(color) + ' RG ' + MARGIN + ' ' + this.y.toFixed(2) + ' m ' + (PAGE_W - MARGIN) + ' ' + this.y.toFixed(2) + ' l S');
    this.y -= 6;
  }
  /* prosentbar-rad (dims-graf) */
  barRow(y, label, pct, size) {
    const barX = MARGIN + 4, barW = CONTENT_W - 64, barH = 11;
    /* etikett */
    this.cur.push('BT /F1 ' + size.toFixed(2) + ' Tf ' + colPdf(INK) + ' rg 1 0 0 1 ' + barX.toFixed(2) + ' ' + (y + 3).toFixed(2) + ' Tm ' + toPdfHex(label) + ' Tj ET');
    /* spor + fyll */
    this.cur.push(colPdf(TRACK) + ' rg ' + barX.toFixed(2) + ' ' + (y - 6).toFixed(2) + ' ' + barW.toFixed(2) + ' ' + barH.toFixed(2) + ' re f');
    const w = Math.max(0, Math.min(100, pct)) / 100 * barW;
    if (w > 0) this.cur.push(colPdf(BAR) + ' rg ' + barX.toFixed(2) + ' ' + (y - 6).toFixed(2) + ' ' + w.toFixed(2) + ' ' + barH.toFixed(2) + ' re f');
    /* midtpunkt ved 50 — dash, skiller fra prosent-lesing (kvalitetskontrakt 1) */
    const xm = barX + barW / 2;
    this.cur.push(colPdf(MIDW) + ' RG 1 w [' + 2*barH/3 + ' ' + 2*barH/3 + '] 0 d ' + xm.toFixed(2) + ' ' + (y - 7).toFixed(2) + ' m ' + xm.toFixed(2) + ' ' + (y + barH - 5).toFixed(2) + ' l S [] 0 d');
    /* prosent */
    const pctTxt = Math.round(pct) + ' %';
    this.cur.push('BT /F1 ' + size.toFixed(2) + ' Tf ' + colPdf(INK) + ' rg 1 0 0 1 ' + (barX + barW + 6).toFixed(2) + ' ' + (y - 4).toFixed(2) + ' Tm ' + toPdfHex(pctTxt) + ' Tj ET');
  }
}

/* font-key-oppslag (stringWidthT/wrapTextT) — registry fylles i renderReportPdf */
const FONT_REGISTRY = {};
function fontFor(key) { const f = FONT_REGISTRY[key]; if (!f) throw new Error('brainarea-pdf: font ikke registrert: ' + key); return f; }
function stringWidthT(text, fontKey, size) {
  const f = fontFor(fontKey);
  let total = 0;
  for (const ch of String(text)) {
    const cp = ch.codePointAt(0);
    total += cp === 32 ? f.space1000 : f.width1000(cp);
  }
  return total / 1000 * size;
}
function wrapTextT(text, fontKey, size, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = null;
  for (const w of words) {
    const cand = line === null ? w : line + ' ' + w;
    if (line !== null && stringWidthT(cand, fontKey, size) > maxWidth) { lines.push(line); line = w; }
    else line = cand;
  }
  if (line !== null) lines.push(line);
  return lines;
}
/* legg stringWidthT inn i Surface.bruk */
function bindSurfaceMethods(S) {
  S.prototype.paraT = function (x, size, txt, opts = {}) {
    const color = opts.color || SUB;
    const fontKey = opts.bold ? 'F2' : 'F1';
    const fh = size * 1.45;
    const gap = opts.gap ?? size * 0.55;
    const width = opts.width ?? (CONTENT_W - (x - MARGIN));
    const lines = wrapTextT(txt, fontKey, size, width);
    this.need(fh * lines.length);
    const lns = [];
    for (const ln of lines) {
      this.y -= fh;
      this.cur.push('BT /' + fontKey + ' ' + size.toFixed(2) + ' Tf ' + colPdf(color) + ' rg 1 0 0 1 ' + x.toFixed(2) + ' ' + this.y.toFixed(2) + ' Tm ' + toPdfHex(ln) + ' Tj ET');
      lns.push(ln);
      this.strings.push(ln);
    }
    this.y -= gap;
    return lns;
  };
  S.prototype.headingT = function (txt, level = 2) {
    const size = level === 2 ? 13.5 : 11.5;
    const fh = size * 1.6;
    this.need(fh + 10);
    this.y -= fh;
    this.cur.push('BT /F2 ' + size.toFixed(2) + ' Tf ' + colPdf(INK) + ' rg 1 0 0 1 ' + MARGIN + ' ' + this.y.toFixed(2) + ' Tm ' + toPdfHex(txt) + ' Tj ET');
    this.strings.push(txt);
    this.y -= 5;
  };
  S.prototype.badgeT = function (txt) {
    const size = 8.5;
    const w = stringWidthT(txt, 'F1', size);
    const h = size * 2.2;
    this.need(h + 16);
    const bx = MARGIN, by = this.y - h;
    this.cur.push(colPdf(BADGE_BG) + ' rg ' + bx + ' ' + by.toFixed(2) + ' ' + (w + 12).toFixed(2) + ' ' + h.toFixed(2) + ' re f');
    this.cur.push(colPdf(BADGE_BD) + ' RG 0.8 w ' + bx + ' ' + by.toFixed(2) + ' ' + (w + 12).toFixed(2) + ' ' + h.toFixed(2) + ' re S');
    this.cur.push('BT /F1 ' + size.toFixed(2) + ' Tf ' + colPdf([146, 96, 8]) + ' rg 1 0 0 1 ' + (bx + 6) + ' ' + (by + h * 0.33).toFixed(2) + ' Tm ' + toPdfHex(txt) + ' Tj ET');
    this.strings.push(txt);
    this.y -= h + 10;
  };
  S.prototype.dimsBlock = function (result, config, lang, gl, labels) {
    if ((config.dimensions && config.dimensions.graphic) === 'none' || !Array.isArray(result.scales)) return;
    const size = 9.5;
    const rows = result.scales.slice();
    const sortMode = config.dimensions && config.dimensions.sort;
    if (sortMode === 'desc') rows.sort((a, b) => (b.normalized ?? -1) - (a.normalized ?? -1));
    else if (sortMode === 'asc') rows.sort((a, b) => (a.normalized ?? 101) - (b.normalized ?? 101));
    const barRows = rows.filter((r) => r.normalized !== null && r.normalized !== undefined);
    const ncRows = rows.filter((r) => r.normalized === null || r.normalized === undefined);
    const axisH = 14, rowH = 26, gapAfter = 10;
    const needH = axisH + barRows.length * rowH + ncRows.length * 18;
    /* en bar-graf brytes aldri over sider (lesbarhetskontrakt): hvis den ikke får plass, ny side */
    if (this.y - needH < MARGIN) { this.endPage(); }
    /* akse 0..100 med tikkskalaer */
    const barX = MARGIN + 4, barW = CONTENT_W - 64;
    this.y -= axisH;
    this.cur.push(colPdf(MID) + ' RG 0.75 w ' + barX.toFixed(2) + ' ' + this.y.toFixed(2) + ' m ' + (barX + barW).toFixed(2) + ' ' + this.y.toFixed(2) + ' l S');
    for (let v = 0; v <= 100; v += 25) {
      const xt = (barX + barW * v / 100).toFixed(2);
      this.cur.push(colPdf(MID) + ' RG 0.75 w ' + xt + ' ' + this.y.toFixed(2) + ' m ' + xt + ' ' + (this.y - 3).toFixed(2) + ' l S');
    }
    const lbl0 = { no: '0', en: '0' }, lbl100 = { no: '100', en: '100' };
    const a0 = L(lbl0, lang, 'axisStart'), a100 = L(lbl100, lang, 'axisEnd');
    this.strings.push(a0); this.strings.push(a100);
    this.cur.push('BT /F1 7.5 Tf ' + colPdf(FAINT) + ' rg 1 0 0 1 ' + barX.toFixed(2) + ' ' + (this.y + 3).toFixed(2) + ' Tm ' + toPdfHex(a0) + ' Tj ET');
    this.cur.push('BT /F1 7.5 Tf ' + colPdf(FAINT) + ' rg 1 0 0 1 ' + (barX + barW - stringWidthT(L(lbl100, lang, 'axisEnd'), 'F1', 7.5)).toFixed(2) + ' ' + (this.y + 3).toFixed(2) + ' Tm ' + toPdfHex(L(lbl100, lang, 'axisEnd')) + ' Tj ET');
    for (const r of barRows) {
      this.y -= rowH;
      const label = labels ? labels(r.id) : r.id;
      this.barRow(this.y + 10, label, Number(r.normalized), size);
      this.strings.push(label);
      this.strings.push(Math.round(r.normalized) + ' %');
    }
    /* midtpunktlegende: EGEN linje under grafen */
    if (config.dimensions && config.dimensions.midpointMarker && gl && gl.midpointLegend) {
      const lg = L(gl.midpointLegend, lang, 'dimensions.graphicLabels.midpointLegend');
      this.y -= 14;
      this.cur.push('BT /F1 8.2 Tf ' + colPdf(SUB) + ' rg 1 0 0 1 ' + (MARGIN + 4) + ' ' + this.y.toFixed(2) + ' Tm ' + toPdfHex(lg) + ' Tj ET');
      this.strings.push(lg);
    }
    for (const r of ncRows) {
      this.y -= 18;
      const label = labels ? labels(r.id) : r.id;
      const nc = L((config.dimensions && config.dimensions.graphicLabels && config.dimensions.graphicLabels.notComputable) || DEFLO(), lang, 'graphicLabels.notComputable');
      const txt = label + ' — ' + nc;
      this.cur.push('BT /F1 8.5 Tf ' + colPdf(FAINT) + ' rg 1 0 0 1 ' + (MARGIN + 4) + ' ' + this.y.toFixed(2) + ' Tm ' + toPdfHex(txt) + ' Tj ET');
      this.strings.push(txt);
    }
    this.y -= gapAfter;
  };
  S.prototype.listBlock = function (items) {
    for (const it of items) {
      const lines = wrapTextT('• ' + it, 'F1', 8.8, CONTENT_W);
      this.need(lines.length * 13);
      for (const ln of lines) {
        this.y -= 13;
        this.cur.push('BT /F1 8.8 Tf ' + colPdf(SUB) + ' rg 1 0 0 1 ' + MARGIN + ' ' + this.y.toFixed(2) + ' Tm ' + toPdfHex(ln) + ' Tj ET');
        this.strings.push(ln);
      }
      this.y -= 2;
    }
    this.y -= 6;
  };
  S.prototype.footer = function (pageIdx, pageTotal, contextLine) {
    /* bunntekst forankret bunnen av siden: aldri avslått av y-cursoren */
    const y = MARGIN * 0.55;
    this.cur.push(colPdf(RULE) + ' RG 0.6 w ' + MARGIN + ' ' + (y + 10) + ' m ' + (PAGE_W - MARGIN) + ' ' + (y + 10) + ' l S');
    const side = contextLine + '  ·  ' + pageIdx + ' / ' + pageTotal;
    this.cur.push('BT /F1 7 Tf ' + colPdf(FAINT) + ' rg 1 0 0 1 ' + MARGIN + ' ' + y.toFixed(2) + ' Tm ' + toPdfHex(side) + ' Tj ET');
  };
}
bindSurfaceMethods(Surface);

/* Forbudsskann og sink håndteres etter tegning; her: hovedfunksjonen. */

export function renderReportPdf(result, config, opts = {}) {
  const lang = opts.lang || 'no';
  if (lang !== 'no' && lang !== 'en') throw new Error('brainarea-pdf: lang må være "no"|"en"');
  if (!result || result.schemaVersion !== 1 || !Array.isArray(result.scales) || !result.total) {
    throw new Error('brainarea-pdf: resultat mangler eller følger ikke scoringkontrakten v1');
  }
  if (!config || config.schemaVersion !== 1) throw new Error('brainarea-pdf: config mangler eller schemaVersion != 1');
  const frame = config.frame;
  if (frame !== 'standard' && frame !== 'personal' && frame !== 'employer') throw new Error('brainarea-pdf: ukjent frame');
  if (opts.fontRegular === undefined || opts.fontBold === undefined) {
    throw new Error('brainarea-pdf: opts.fontRegular/fontBold (TTF-bytes) kreves — ingen skrift utenfor produktet lastes');
  }

  /* fonts: subsettes til de kodepunktene PDF-en faktisk tegner (hard-feil ved glippe) */
  const FONT_SRC = [
    ['F1', 'reg', opts.fontRegular],
    ['F2', 'bold', opts.fontBold],
  ];
  /* === Charset-samling FØR tegning: alt i result+config + drawReport sine faste konstanter. ===
     Konvensjon: drawReport skal aldri synge strenger som ikke er i result/config eller i
     FIXED_PDF_STRINGS under — en ny fast streng i tegnerordenen MÅ inn i denne lista
     (selftest G11 låser det: sink ⊔ fixed ⊇ alle config/result-strenger). */
  const FIXED_PDF_STRINGS = lang === 'no' ? [
    'Resultatrapport — Brainarea', 'Begrensninger',
    'DEMO med konstruerte data (testId fixture). Viser rammeverket, ikke en ekte test.',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '100', '50', '90', '55 %', '38 %', '20 %', '75 %', ' %', 'CI95:', 'SE:', 'θ ≈', '—', '·', ' / ', '[', ']', '• ', 0xB7 === 183 ? '·' : '·', 'Ikke beregnelig i denne økten',
  ] : [
    'Results report — Brainarea', 'Limitations',
    'Demo with constructed data (testId fixture). Shows the frame, not a real test.',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '100', '0 %', '55 %', 'CI95:', 'SE:', 'θ ≈', '—', '·', '·  /', '• ', '[', ']',
  ];
  const collectCps = (s) => { for (const ch of String(s)) { const cp = ch.codePointAt(0); if (cp <= 0xFFFF) set.add(cp); } };
  const set = new Set([32]);
  for (const s of FIXED_PDF_STRINGS) collectCps(s);
  /* result: testId, alle strenger i scales/total/notes */
  collectCps(result.testId);
  if (result.lang) collectCps(result.lang);
  for (const n of result.notes || []) { collectCps(n.id); for (const k of ['no', 'en']) if (typeof n[k] === 'string') collectCps(n[k]); }
  for (const sc of result.scales) { collectCps(sc.id); }
  /* config: alle synlige tekstfelt (bilingual-objekter no/en) */
  const walkCps = (v) => {
    if (typeof v === 'string') collectCps(v);
    else if (Array.isArray(v)) for (const x of v) walkCps(x);
    else if (v && typeof v === 'object') for (const x of Object.values(v)) walkCps(x);
  };
  walkCps(config);
  const allCps = set;

  /* subsett + registrer字体 før PASS 1 (vidder trengs i brytning allerede i første pass) */
  const fonts = {};
  for (const [key, kind, src] of FONT_SRC) {
    const tables = readTables(src);
    const sub = subsetFont(src, tables, allCps);
    sub.kind = kind; sub.space1000 = sub.width1000(32);
    fonts[kind] = sub; fonts[key] = sub;
  }
  FONT_REGISTRY.reg = fonts.reg; FONT_REGISTRY.bold = fonts.bold; FONT_REGISTRY.F1 = fonts.reg; FONT_REGISTRY.F2 = fonts.bold;

  /* === PASS 1+2: ÉN ekte tegning (sinken er allerede komplett fra charset-samlingen) === */
  const strings = [];
  const surface = new Surface(strings);
  const metaDraw = drawReport(surface, result, config, lang, fonts, opts);
  /* flush: endPage kalles kun ved sideskift — siste sidens innhold ligger fortsatt i cur
     (en 0-siders utdata betyr at HELE dokumentet ble kastet). Tom cur => tom side er ugyldig. */
  if (surface.cur.length === 0 && surface.pages.length === 0) {
    throw new Error('brainarea-pdf: tegningen produserte tomt dokument');
  }
  if (surface.cur.length) surface.endPage();

  /* employer-forbudsskann over HELE sinken (renderer-konvensjon; sink-hull gjentas ikke) */
  if (frame === 'employer') {
    const v = scanPdfBanned(strings, (config.employer && config.employer.prohibitions) || []);
    if (v.length) throw new Error('brainarea-pdf: employer-frame bryter prohibitions: ' + JSON.stringify(v[0]));
    if (!strings.some((s) => /grunnlag\s+for\s+samtale|groundwork\s+for\s+a\s+conversation/i.test(s))) {
      throw new Error('brainarea-pdf: employer-frame mangler eksplisitt «grunnlag for samtale»-formulering');
    }
  }

  /* ---------- PDF-serialisering ---------- */
  const serial = buildPdf(surface.pages, fonts, {
    title: 'Brainarea — ' + result.testId + ' (' + lang + ')',
    contextLine: metaDraw.contextLine,
  });
  const meta = {
    version: BRAINAREA_PDF_VERSION,
    lang, frame, testId: result.testId,
    pages: surface.pages.length,
    objects: serial.numObjects,
    fontBytes: Object.values(fonts).filter((f) => f.id !== undefined && f.kind === f.kind).length,
    pdfBytes: serial.bytes.byteLength,
  };
  const fontsInfo = {};
  for (const kind of ['reg', 'bold']) fontsInfo[kind] = fonts[kind].numGlyphs;
  meta.fontGlyphs = fontsInfo;
  return { bytes: serial.bytes, meta, strings: strings.slice() };
}

/* ---------- den delte tegnerordenen (begge pass) ---------- */
function drawReport(s, result, config, lang, fonts, opts) {
  const frame = config.frame;
  const st = result.scoringType;

  /* 1. fixture/demomerkning alltid øverst — PDF-en brukes til både demo og ekte resultater */
  const isFixture = /^fixture/i.test(String(result.testId));
  if (isFixture) {
    s.badgeT(lang === 'no'
      ? 'DEMO med konstruerte data (testId ' + result.testId + '). Viser rammeverket, ikke en ekte test.'
      : 'Demo with constructed data (testId ' + result.testId + '). Shows the frame, not a real test.');
  }
  const title = lang === 'no' ? 'Resultatrapport — Brainarea' : 'Results report — Brainarea';
  s.paraT(MARGIN, 17.5, title, { color: INK, bold: true, gap: 4 });
  const ctxLine = '[' + frame + '] ' + result.testId + ' · ' + lang;
  s.paraT(MARGIN, 8.5, ctxLine, { color: FAINT, gap: 8 });

  /* total-blokk per scoringtype — normNote er hardkrav (kvalitetskontrakt 1) */
  if (st === 'trait') {
    const c = config.total.trait;
    s.headingT(L(c.heading, lang, 'total.trait.heading'), 2);
    s.paraT(MARGIN, 8.8, L(c.normNote, lang, 'total.trait.normNote'), { color: SUB, gap: 3 });
    const t = result.total;
    if (t && typeof t.composite !== 'undefined') {
      if (t.composite === null) {
        const nc = L((config.dimensions && config.dimensions.graphicLabels && config.dimensions.graphicLabels.notComputable) || DEFLO(), lang, 'graphicLabels.notComputable');
        s.strings.push(nc);
        s.paraT(MARGIN, 12, nc, { color: FAINT, bold: false, gap: 10 });
      } else {
        const txt = Math.round(Number(t.composite)) + ' %';
        s.strings.push(txt);
        s.paraT(MARGIN, 13.5, txt, { color: INK, bold: true, gap: 10 });
      }
    }
    if (c.showBar === false) { /* vidde-respektert: blokk uten graf */ }
  } else if (st === 'threshold') {
    const c = config.total.threshold;
    s.headingT(L(c.heading, lang, 'total.threshold.heading'), 2);
    s.paraT(MARGIN, 8.8, L(c.normNote, lang, 'total.threshold.normNote'), { color: SUB, gap: 3 });
    const t = result.total;
    if (t) {
      const scoreTxt = String(t.score);
      const bandTxt = t.bandLabel ? String(t.bandLabel) : (t.bandId ? String(t.bandId) : '');
      const txt = scoreTxt + ' — ' + bandTxt;
      s.strings.push(scoreTxt); s.strings.push(bandTxt);
      s.paraT(MARGIN, 13.5, txt, { color: INK, bold: true, gap: 10 });
      if (c.forbidWord && c.forbidWord.length) {
        const v = scanPdfBanned([txt, s.strings[s.strings.length - 1]], c.forbidWord);
        if (v.length) throw new Error('brainarea-pdf: threshold-blokk bryter forbidWord: ' + JSON.stringify(v[0]));
      }
      if (typeof t.guidance === 'string' && t.guidance) {
        s.strings.push(t.guidance);
        s.paraT(MARGIN, 8.8, t.guidance, { color: SUB, gap: 8 });
      }
    }
  } else if (st === 'g-score') {
    const c = config.total['g-score'];
    s.headingT(L(c.heading, lang, 'g-score.heading'), 2);
    s.paraT(MARGIN, 8.8, L(c.normNote, lang, 'g-score.normNote'), { color: SUB, gap: 3 });
    const t = result.total;
    if (t) {
      const p = Number.isFinite(t.proportion) ? Math.round(t.proportion * 100) + ' %' : null;
      const th = Number.isFinite(t.theta) ? t.theta.toFixed(2) : null;
      const base = t.correctCount + '/' + t.answeredCount + (p ? ' (' + p + ')' : '');
      const body = th !== null ? base + ', θ ≈ ' + th : base;
      s.strings.push(body);
      s.paraT(MARGIN, 13.5, body, { color: INK, bold: true, gap: 3 });
      /* thetaSe og CI95 når estimert (1.0.1: aldri θ ved manglende estimat) */
      if (Number.isFinite(t.thetaSe)) {
        const seTxt = 'θ-SE: ' + t.thetaSe.toFixed(2);
        s.strings.push(seTxt);
        s.paraT(MARGIN, 8.8, seTxt, { color: SUB, gap: 2 });
      }
      if (Array.isArray(t.ci95) && t.ci95.length === 2 && t.ci95.every(Number.isFinite)) {
        const ciTxt = 'CI95: ' + t.ci95.map((x) => Number(x).toFixed(2)).join(' – ');
        s.strings.push(ciTxt);
        s.paraT(MARGIN, 8.8, ciTxt, { color: SUB, gap: 10 });
      }
      /* iqScale leses aldri (kode-nivå forbud, FASE 1). */
    }
  } else throw new Error('brainarea-pdf: ukjent scoringType ' + st);

  /* 2. dimensjonsgraf */
  const gl = config.dimensions && config.dimensions.graphicLabels;
  const labels = (config.dimensions && config.dimensions.labels) || {};
  s.dimsBlock(result, config, lang, gl, (id) => {
    const lab = labels[id];
    return lab ? L(lab, lang, 'dimensions.labels.' + id) : id; /* fallback: id verbatim */
  });
  /* prosent-legend under grafen (adskilt fra midtpunkt-legenden) */
  if (gl && gl.percentOfRange) {
    const lg = L(gl.percentOfRange, lang, 'dimensions.graphicLabels.percentOfRange');
    s.strings.push(lg);
    s.y -= 4;
    s.paraT(MARGIN + 4, 8.2, lg, { color: FAINT, gap: 8 });
  }

  /* 3. engine-notater */
  const notes = Array.isArray(result.notes) ? result.notes : [];
  for (const n of notes) {
    if (!n || typeof n.id !== 'string' || !n.id) throw new Error('brainarea-pdf: engine-note uten id');
    if (frame === 'employer') {
      const para = config.employer && config.employer.noteParaphrases && config.employer.noteParaphrases[n.id];
      if (!para) throw new Error('brainarea-pdf: employer-frame mangler noteParaphrases[' + n.id + ']');
      s.strings.push(L(para, lang, 'employer.noteParaphrases.' + n.id));
      s.paraT(MARGIN, 8.8, '• ' + L(para, lang, 'employer.noteParaphrases.' + n.id), { color: SUB, gap: 4 });
    } else {
      const txt = typeof n[lang] === 'string' && n[lang].trim() ? n[lang] : (typeof n.en === 'string' ? n.en : null);
      if (!txt) throw new Error('brainarea-pdf: note ' + n.id + ' har ingen ' + lang + '-tekst');
      s.strings.push(txt);
      s.paraT(MARGIN, 8.8, '• ' + txt, { color: SUB, gap: 4 });
    }
  }
  if (notes.length) s.y -= 2;

  /* 4. disclosures */
  if (Array.isArray(config.disclosures) && config.disclosures.length) {
    s.headingT(lang === 'no' ? 'Begrensninger' : 'Limitations', 3);
    const items = config.disclosures.map((d) => L({ no: d.no, en: d.en }, lang, 'disclosures.' + d.id));
    s.listBlock(items);
  }

  /* 5. profiltekst */
  if (opts.profileId) {
    const pt = config.profileText && config.profileText[opts.profileId];
    if (!pt) throw new Error('brainarea-pdf: profileId "' + opts.profileId + '" finnes ikke i config.profileText');
    s.strings.push(L(pt, lang, 'profileText.' + opts.profileId));
    s.paraT(MARGIN, 9.5, L(pt, lang, 'profileText.' + opts.profileId), { color: SUB });
  }

  /* 6. leseveiledning */
  if (config.readingGuide) {
    s.headingT(L(config.readingGuide.title, lang, 'readingGuide.title'), 3);
    const body = (config.readingGuide.body || []).map((b) => L(b, lang, 'readingGuide.body'));
    s.listBlock(body);
  }

  /* 7. tredjepartskontekst */
  if (config.thirdParty) {
    s.headingT(L(config.thirdParty.title, lang, 'thirdParty.title'), 3);
    s.paraT(MARGIN, 8.8, L(config.thirdParty.body, lang, 'thirdParty.body'), { color: SUB });
    s.strings.push('[' + frame + '] ' + result.testId);
  }

  /* 8. mood-effekt */
  if (config.moodEffect && config.moodEffect.text) {
    const txt = L(config.moodEffect.text, lang, 'moodEffect.text');
    s.strings.push(txt);
    s.paraT(MARGIN, 8.8, txt, { color: SUB });
  }

  /* 9. employer-blokk */
  if (frame === 'employer') {
    const e = config.employer;
    if (!e || typeof e !== 'object') throw new Error('brainarea-pdf: employer-frame krever config.employer');
    const cb = L(e.conversationBasis, lang, 'employer.conversationBasis');
    s.strings.push(cb);
    s.paraT(MARGIN, 9.5, cb, { color: INK, bold: true });
  }

  /* 10. disclaimer */
  const dis = L(config.disclaimer, lang, 'disclaimer');
  s.strings.push(dis);
  s.rule();
  s.paraT(MARGIN, 8, dis, { color: FAINT });

  const contextLine = '[' + frame + '] ' + result.testId + ' · ' + lang;
  return { contextLine };
}

/* ---------- PDF-serialisering (Type0/CIDFontType2, Identity-H, FlateDecode) ---------- */

function zlibDeflate(u8) {
  /* ren DEFLATE (RFC 1951) i zlib-wrapper (RFC 1950) — deterministisk, fast kompresjonsnivå-path */
  const adler = zlibAdler(u8);
  const blocks = deflateBlocks(u8);
  const out = new Uint8Array(2 + blocks.length + 4);
  out[0] = 0x78; out[1] = 0x9c;
  out.set(blocks, 2);
  const dv = new DataView(out.buffer);
  dv.setUint32(2 + blocks.length, adler);
  return out;
}

function zlibAdler(u8) {
  let a = 1, b = 0;
  for (let i = 0; i < u8.length; i++) {
    a = (a + u8[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

/* fixed-Huffman-less stored blocks (BTYPE=00) — byte-eksakt, ingen kompresjon: dokumentert valg
   for determinisme + liten kodeflate; PDF-størrelse er ikke et mål for denne leveransen. */
function deflateBlocks(u8) {
  const chunks = [];
  const MAX = 65535;
  for (let i = 0; i < u8.length; i += MAX) {
    const end = Math.min(u8.length, i + MAX);
    const isLast = end >= u8.length ? 1 : 0;
    const chunk = u8.subarray(i, end);
    const len = chunk.length, nlen = (0xFFFF - len) & 0xFFFF;
    const header = new Uint8Array(5);
    header[0] = isLast ? 1 : 0;
    header[1] = len & 0xFF; header[2] = (len >> 8) & 0xFF;
    header[3] = nlen & 0xFF; header[4] = (nlen >> 8) & 0xFF;
    chunks.push(header, chunk);
  }
  if (!chunks.length) {
    const header = new Uint8Array(5);
    header[0] = 1; header[1] = 0; header[2] = 0; header[3] = 0xFF; header[4] = 0xFF;
    chunks.push(header);
  }
  const total = chunks.reduce((a, c) => a + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

function buildPdf(pages, fonts, opts) {
  const objects = []; /* 1-basert id -> body (string|Uint8Array) */
  const add = (body) => { objects[objects.length + 1] = body; return objects.length; };

  /* fontobjektene reserveres FØRST så sidene kan referere dem: F1=reg, F2=bold */
  const fontObjIds = {};
  for (const key of ['reg', 'bold']) fontObjIds[key] = null;
  /* rekkefølge: 1 catalog, 2 pages, 3.. sidepar, deretter fontkjeder */
  const nPages = pages.length;
  const catalogId = 1, pagesId = 2;
  let nextObj = 3;
  const pageIds = [];
  for (let i = 0; i < nPages; i++) { pageIds.push(nextObj + 1); nextObj += 2; } /* [content, page] par */
  const fontChainIds = {};
  for (const key of ['reg', 'bold']) {
    fontChainIds[key] = { font: nextObj, desc: nextObj + 1, fd: nextObj + 2, tu: nextObj + 3 };
    nextObj += 4;
  }

  const objs = new Map();
  const setObj = (id, body) => objs.set(id, body);

  /* catalog + pages */
  const kids = pageIds.map((id) => id + ' 0 R').join(' ');
  setObj(catalogId, '<< /Type /Catalog /Pages ' + pagesId + ' 0 R >>');
  setObj(pagesId, '<< /Type /Pages /Count ' + nPages + ' /Kids [' + kids + '] /MediaBox [0 0 ' + PAGE_W.toFixed(2) + ' ' + PAGE_H.toFixed(2) + '] >>');

  /* resources: bare fontene — PDF-en har ingen eksterne avhengigheter */
  const resources = '<< /Font << /F1 ' + fontChainIds.reg.font + ' 0 R /F2 ' + fontChainIds.bold.font + ' 0 R >> /ProcSet [/PDF /Text] >>';

  /* sidene: content (flate-encoded) + page-objekt */
  for (let i = 0; i < nPages; i++) {
    const contentId = pageIds[i] - 1;
    const ops = pages[i].join('\n');
    const comp = zlibDeflate(new TextEncoder().encode(ops));
    setObj(contentId, { stream: comp, dict: '<< /Filter /FlateDecode /Length ' + comp.length + ' >>' });
    setObj(pageIds[i], '<< /Type /Page /Parent ' + pagesId + ' 0 R /Contents ' + contentId + ' 0 R /MediaBox [0 0 ' + PAGE_W.toFixed(2) + ' ' + PAGE_H.toFixed(2) + '] /Resources ' + resources + ' >>');
  }

  /* fontkjeder: Type0 -> CIDFontType2 -> FontDescriptor(FontFile2) + ToUnicode */
  for (const key of ['reg', 'bold']) {
    const f = fonts[key];
    const ids = fontChainIds[key];
    const baseFont = (key === 'reg' ? 'BrainareaSans-Regular-' : 'BrainareaSans-Bold-') + f.numGlyphs;
    setObj(ids.font, '<< /Type /Font /Subtype /Type0 /BaseFont /' + baseFont + ' /Encoding /Identity-H /DescendantFonts [' + ids.desc + ' 0 R] /ToUnicode ' + ids.tu + ' 0 R >>');
    setObj(ids.desc, '<< /Type /Font /Subtype /CIDFontType2 /BaseFont /' + baseFont + ' /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ' + ids.fd + ' 0 R /DW 1000 /CIDToGIDMap /Identity >>');
    const fcomp = zlibDeflate(f.fontBytes);
    setObj(ids.fd, { stream: fcomp, dict: '<< /Filter /FlateDecode /Length ' + fcomp.length + ' /Length1 ' + f.fontBytes.length + ' >>' });
    /* ToUnicode: code == unicode (Identity-H + UCS-codepoints) */
    const cps = [...f.exposedCps].sort((a, b) => a - b).filter((cp) => cp < 0x10000);
    const tu = [
      '/CIDInit /ProcSet findresource begin', '12 dict begin', 'begincmap',
      '/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def',
      '/CMapName /Adobe-Identity-UCS def', '/CMapType 2 def',
      '1 begincodespacerange', '<0000> <FFFF>', 'endcodespacerange',
      cps.length + ' beginbfchar',
      ...cps.map((cp) => '<' + cp.toString(16).toUpperCase().padStart(4, '0') + '> <' + cp.toString(16).toUpperCase().padStart(4, '0') + '>'),
      'endbfchar', 'endcmap', 'CMapName currentdict /CMap defineresource pop', 'end', 'end',
    ].join('\n');
    const tucomp = zlibDeflate(new TextEncoder().encode(tu));
    setObj(ids.tu, { stream: tucomp, dict: '<< /Filter /FlateDecode /Length ' + tucomp.length + ' >>' });
  }

  /* Info: title + CreationDate er fastsatt (determinisme) */
  const infoBody = '<< /Title (' + (opts.title || 'Brainarea').replace(/[()\\]/g, ' ') + ') /Producer (Brainarea pdf ' + BRAINAREA_PDF_VERSION + ') >>';
  /* serialisering */
  const maxId = Math.max(...objs.keys(), nextObj - 1);
  /* Info-objekt får siste id */
  const infoId = maxId + 1;
  setObj(infoId, infoBody);

  const out = [];
  const push = (s) => out.push(new TextEncoder().encode(s));
  push('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n');
  const offsets = new Map();
  const enc = new TextEncoder();
  for (let id = 1; id <= infoId; id++) {
    const body = objs.get(id);
    if (body === undefined) { offsets.set(id, null); continue; }
    offsets.set(id, out.reduce((a, c) => a + c.length, 0));
    push(id + ' 0 obj\n');
    if (body && body.stream) {
      push(body.dict + '\nstream\n');
      out.push(body.stream);
      push('\nendstream');
    } else push(body);
    push('\nendobj\n');
  }
  const xrefPos = out.reduce((a, c) => a + c.length, 0);
  let xref = 'xref\n0 ' + (infoId + 1) + '\n0000000000 65535 f \n';
  for (let id = 1; id <= infoId; id++) {
    const o = offsets.get(id);
    xref += (o === null || o === undefined) ? '0000000000 65535 f \n' : String(o).padStart(10, '0') + ' 00000 n \n';
  }
  xref += 'trailer\n<< /Size ' + (infoId + 1) + ' /Root 1 0 R /Info ' + infoId + ' 0 R >>\nstartxref\n' + xrefPos + '\n%%EOF\n';
  push(xref);
  const total = out.reduce((a, c) => a + c.length, 0);
  const bytes = new Uint8Array(total);
  let off = 0;
  for (const c of out) { bytes.set(c, off); off += c.length; }
  return { bytes, numObjects: infoId };
}
