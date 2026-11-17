/**
 * Brainarea — OG-kort per test ([BYGG] FASE 3, todo #3796-slekten).
 *
 * Kontrakt — delingsforhåndsvisning (og:image) for alle 7 ruter × no/en:
 * - Ett SVG-master per kort, 1200×630 (Open Graph-referansemålet: 1.91:1;
 *   kilde: opengraphdebug.com/posts/og-image-requirements, hentet 2026-11-17 —
 *   «Recommended size: 1200 × 630 px», «Avoid: SVG» som og:image — dermed er
 *   LEVERANSEN PNG; SVG-en er deterministisk master inntil rasteren).
 * - Tekstmateriell (tittel/desc/alt) resolver KUN gjennom i18n-katalogen —
 *   modulen tar resolvede strenger inn, aldri nøkler. i18n-eierskap uroet.
 * - Tekst-brytning via fontens EKTE vidder (hmtx fra DejaVu Sans TTF — samme
 *   font-bibliotek som PDF-steget, report/pdf/fonts/). Ingen anslag: målt.
 *   assert: tittel ≤ 2 linjer, desc ≤ 3 linjer, siste baslinje < OG_LAYOUT_MAX_Y.
 * - Identifikatorfrihet (delingskontrakt #3794): ingen navn/e-post/tidsstempel
 *   i kortet. Kortet er statisk per rute+språk — skårer og delingslenke-fragmenter
 *   aldri involvert (dynamisk skår-forhåndsvisning er FASE 4-eie, ikke denne).
 * - Strings-sink fra dag én: ogGraphStrings() = alle synlige strenger i
 *   tegnerorden (ban-scan-konvensjonen fra delgrafen/dokumenten).
 * - Determinisme: samme inndata gir byte-lik SVG. Ingen klokke, ingen rng, ingen DOM.
 *   PNG-raster (librsvg via sharp) er deterministisk per raster-vert; PNG-md5
 *   assertes ikke CI-vs-lokal (raster-vertssjikt dokumentert i verdict).
 * - HTML-meta: ogMetaLines() leverer meta-linjene (og:image + dim/type/alt,
 *   twitter:card summary_large_image + tittel/desc/alt). Absolutte URL-er
 *   (canonical-kontrakten), image-path under assets/og/.
 * - Kvalitetskontrakt arvet: alt-tekst er nødvendig (a11y); ingen forbudt
 *   diagnostisk vokabular (renderer-forbudsvokabularet gjenbrukes i selftest);
 *   i18n-plain-strenger: aldri HTML i kortet (esc hele veien).
 *
 * Kjør: ren ES-modul — importeres av app/build.js (SSG-wire) + raster-bygget
 * (_og_raster via windows-node og tests/schema/_fase3_og_selftest.mjs).
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalUrl, ROUTES, LOCALES } from './locale.js';

export const OG_VERSION = 'v1';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ---------- måltal ---------- */

export const OG_W = 1200;               /* viewBox-bredde — OG-referanse 1200×630 */
export const OG_H = 630;                /* viewBox-høyde */
export const OG_ASSETS_DIR = 'assets/og/'; /* under BASE i out-treet */

/* layout (i viewBox-koordinater) */
const MARGIN_X = 64;
const BRAND = 'Brainarea';
const BRAND_SIZE = 30;
const BRAND_Y = 96;
const TITLE_SIZE = 56;
const TITLE_LINE_H = 70;
const TITLE_Y0 = 196;
const DESC_SIZE = 32;
const DESC_LINE_H = 44;
const DESC_GAP = 28;
export const OG_LAYOUT_MAX_Y = 570;     /* siste baseline-grense (accent-bar under) */
const TEXT_W = OG_W - 2 * MARGIN_X;     /* 1072 */
const BAR_H = 10;                       /* accent-bar nederst */

/* fargepalett — sitens gråskala + én accent (blå #1d4ed8) */
const C = {
  bg: '#ffffff',
  brand: '#111827',
  title: '#1e293b',
  desc: '#374151',
  bar: '#1d4ed8',
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------- måling: EKTE glyfvidder fra DejaVu TTF (hmtx) ---------- */

/* mini-parser som følger pdffont.mjs-mønsteret (big-endian, kun lesetabeller) */
class Rd { constructor(d) { this.d = d; } u16(o) { return (this.d[o] << 8) | this.d[o + 1]; } i16(o) { const v = this.u16(o); return v >= 0x8000 ? v - 0x10000 : v; } u32(o) { return (((this.d[o] << 8) | this.d[o + 1]) << 8 | this.d[o + 2]) << 8 | this.d[o + 3]; } }

function loadMetrics(absTtfPath) {
  const data = readFileSync(absTtfPath);
  let r = new Rd(data);
  const numTables = r.u16(4);
  const tables = new Map();
  for (let i = 0; i < numTables; i++) {
    const off = 12 + i * 16;
    tables.set(String.fromCharCode(data[off], data[off + 1], data[off + 2], data[off + 3]), { offset: r.u32(off + 8), length: r.u32(off + 12) });
  }
  if (!tables.has('cmap') || !tables.has('hmtx') || !tables.has('hhea') || !tables.has('head') || !tables.has('maxp')) {
    throw new Error('ogfont: mangler tabeller i ' + absTtfPath);
  }
  const cmapOff = tables.get('cmap').offset;
  const nSub = r.u16(cmapOff + 2);
  let sub4 = null, sub12 = null;
  for (let i = 0; i < nSub; i++) {
    const rec = cmapOff + 4 + i * 8;
    const plat = r.u16(rec), enc = r.u16(rec + 2), off = r.u32(rec + 4);
    const fmt = r.u16(cmapOff + off);
    if (fmt === 4) sub4 = cmapOff + off;
    if (fmt === 12) sub12 = cmapOff + off;
  }
  const gidOfCp = (cp) => {
    if (sub12) {
      const sub = sub12, nGroups = r.u32(sub + 12);
      let lo = 0, hi = nGroups - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1, go = sub + 16 + mid * 12;
        const startCp = r.u32(go), endCp = r.u32(go + 4), gid = r.u32(go + 8);
        if (cp < startCp) hi = mid - 1;
        else if (cp > endCp) lo = mid + 1;
        else return gid + (cp - startCp);
      }
      return 0;
    }
    if (sub4) {
      const sub = sub4, segX2 = r.u16(sub + 6);
      const segs = segX2 / 2;
      const ends = sub + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ranges = deltas + segX2;
      let si = -1;
      for (let s = 0; s < segs; s++) if (r.u16(ends + s * 2) >= cp) { si = s; break; }
      if (si < 0) return 0;
      const startCp = r.u16(starts + si * 2);
      if (cp < startCp) return 0;
      const delta = r.i16(deltas + si * 2);
      const rangeOff = r.u16(ranges + si * 2);
      if (rangeOff === 0) return (cp + delta) & 0xffff;
      const gidIdx = ranges + si * 2 + rangeOff + (cp - startCp) * 2;
      const g = r.u16(gidIdx);
      return g === 0 ? 0 : (g + delta) & 0xffff;
    }
    return 0;
  };
  const upem = r.u16(tables.get('head').offset + 18);
  const numH = r.u16(tables.get('hhea').offset + 34);
  const hm = tables.get('hmtx').offset;
  const awLast = r.u16(hm + (numH - 1) * 4);
  const widthOfGid = (gid) => (gid < numH ? r.u16(hm + gid * 4) : awLast);
  const cache = new Map();
  const width1000 = (cp) => {
    let w = cache.get(cp);
    if (w === undefined) { w = gidOfCp(cp) === 0 ? 0 : Math.round((widthOfGid(gidOfCp(cp)) / upem) * 1000); cache.set(cp, w); }
    return w;
  };
  return { width1000, upem };
}

const FONT_DIR = join(__dirname, '..', 'report', 'pdf', 'fonts');
let M1 = null, M2 = null; /* regular / bold */
function metricsBold() { if (!M2) M2 = loadMetrics(join(FONT_DIR, 'DejaVuSans-Bold.ttf')); return M2; }
function metricsReg() { if (!M1) M1 = loadMetrics(join(FONT_DIR, 'DejaVuSans.ttf')); return M1; }

/** Målt streng-vidde i viewBox-px. */
export function ogStringWidth(text, { bold = false, size = 1 } = {}) {
  const m = bold ? metricsBold() : metricsReg();
  let total = 0;
  for (const ch of String(text)) {
    const cp = ch.codePointAt(0);
    total += (cp === 32 ? m.width1000(32) : m.width1000(cp));
  }
  return (total / 1000) * size;
}

/** Ord-brytning på mått vidde. Gir aldri tomme linjer; ord klippes aldri. */
export function wrapMeasured(text, size, maxWidth, { bold = false } = {}) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = null;
  for (const w of words) {
    const cand = line === null ? w : line + ' ' + w;
    if (line !== null && ogStringWidth(cand, { bold, size }) > maxWidth) { lines.push(line); line = w; }
    else line = cand;
  }
  if (line !== null) lines.push(line);
  return lines;
}

/* ---------- SVG-master ---------- */

/**
 * Deterministisk OG-kort-SVG. renderOgSvg({ title, desc }) — kaster på
 * konfigfeil (renderer-konvensjonen): tomme/mangler strenger, layout-brudd.
 * returnerer { svg, strings, lines: { title: [...], desc: [...] } }.
 */
export function renderOgSvg({ title, desc } = {}) {
  if (typeof title !== 'string' || title.trim().length === 0) throw new Error('og: tittel mangler/tom');
  if (typeof desc !== 'string' || desc.trim().length === 0) throw new Error('og: desc mangler/tom');
  if (/[{}<>]/.test(title) || /[{}<>]/.test(desc) || /[\r\n]/.test(title) || /[\r\n]/.test(desc)) {
    throw new Error('og: ugyldige tegn i kortmateriell (HTML/linjeskift aldri tillatt)');
  }
  const titleLines = wrapMeasured(title, TITLE_SIZE, TEXT_W, { bold: true });
  const descLines = wrapMeasured(desc, DESC_SIZE, TEXT_W);
  if (titleLines.length > 2) throw new Error(`og: tittel (${titleLines.length} linjer) > 2`);
  if (descLines.length > 3) throw new Error(`og: desc (${descLines.length} linjer) > 3`);
  const titleYs = titleLines.map((_, i) => TITLE_Y0 + i * TITLE_LINE_H);
  const descY0 = (titleYs.length ? titleYs[titleYs.length - 1] : TITLE_Y0) + DESC_GAP + DESC_LINE_H;
  const descYs = descLines.map((_, i) => descY0 + i * DESC_LINE_H);
  const lastY = descYs[descYs.length - 1];
  if (lastY > OG_LAYOUT_MAX_Y) throw new Error(`og: siste baseline ${lastY.toFixed(1)} > ${OG_LAYOUT_MAX_Y}`);

  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}" viewBox="0 0 ${OG_W} ${OG_H}" role="img" aria-label="${esc(title)}">`);
  parts.push(`<title>${esc(title)}</title>`);
  parts.push(`<rect x="0" y="0" width="${OG_W}" height="${OG_H}" fill="${C.bg}"/>`);
  parts.push(`<rect x="0" y="${OG_H - BAR_H}" width="${OG_W}" height="${BAR_H}" fill="${C.bar}"/>`);
  parts.push(`<text x="${MARGIN_X}" y="${BRAND_Y}" font-family="DejaVu Sans" font-weight="700" font-size="${BRAND_SIZE}" fill="${C.brand}">${esc(BRAND)}</text>`);
  titleLines.forEach((ln, i) => {
    parts.push(`<text x="${MARGIN_X}" y="${titleYs[i]}" font-family="DejaVu Sans" font-weight="700" font-size="${TITLE_SIZE}" fill="${C.title}">${esc(ln)}</text>`);
  });
  descLines.forEach((ln, i) => {
    parts.push(`<text x="${MARGIN_X}" y="${descYs[i]}" font-family="DejaVu Sans" font-size="${DESC_SIZE}" fill="${C.desc}">${esc(ln)}</text>`);
  });
  parts.push('</svg>');
  const svg = parts.join('\n') + '\n';
  const strings = [BRAND, ...titleLines, ...descLines]; /* sink: tegnerorden */
  return { svg, strings, lines: { title: titleLines, desc: descLines, titleYs, descYs } };
}

/* ---------- kort-resolve (i18n eier materialet — modulen tar strenger) ---------- */

/**
 * Bygger hele kortbåndet for en rute+språk. t = i18n-resolver for locale
 * (build.js' tt / selftestens getT-loader). Kaster på ukjent rute/locale
 * eller manglende t-funksjon (byggfeil-konvensjonen, locale.js-lik).
 */
export function ogCardForRoute({ locale, route, t } = {}) {
  if (!LOCALES.includes(locale)) throw new Error('og: ukjent locale ' + locale);
  if (!(route in ROUTES)) throw new Error('og: ukjent rute ' + route);
  if (typeof t !== 'function') throw new Error('og: t-resolver mangler (i18n-katalogen eier kortmaterialet)');
  const title = t(`page.${route}.og.title`);
  const desc = t(`page.${route}.og.desc`);
  const alt = t(`page.${route}.og.alt`);
  const { svg, strings, lines } = renderOgSvg({ title, desc });
  const file = `${route}-${locale}.png`;
  const rel = OG_ASSETS_DIR + file;
  const url = 'https://maneitai.github.io' + BASE_SLASH + rel;
  return { ok: true, locale, route, title, desc, alt, svg, strings, lines, png: { rel, url, width: OG_W, height: OG_H } };
}

const BASE_SLASH = '/brainarea/'; /* = app/locale.js BASE — duplikat med vilje: locale.js eier rute-URL-er, og:image er fil-URL under samme rot */

/** Alle ruter × locale i pages-data orden (kildesite-orden). */
export function ogCardOrder() {
  return ['home', 'persona', 'evne', 'rel', 'play', 'about', 'privacy']
    .filter((r) => r in ROUTES)
    .flatMap((route) => LOCALES.map((locale) => ({ route, locale })));
}

/* ---------- HTML-meta-linjer (wire i pageShell) ---------- */

/**
 * Meta-linjene for head. Alt + twitter-stort kort. Absolutte URL-er.
 * Forventer resolvede strenger title/desc/alt (pageShell har dem).
 */
export function ogMetaLines({ locale, route, title, desc, alt } = {}) {
  if (alt === undefined || alt === null || String(alt).trim() === '') {
    throw new Error(`og: imageAlt mangler for ${route}/${locale} (i18n-page.${route}.og.alt)`);
  }
  const file = `${route}-${locale}.png`;
  const url = 'https://maneitai.github.io' + BASE_SLASH + OG_ASSETS_DIR + file;
  return [
    `<meta property="og:image" content="${esc(url)}"/>`,
    `<meta property="og:image:width" content="${OG_W}"/>`,
    `<meta property="og:image:height" content="${OG_H}"/>`,
    `<meta property="og:image:type" content="image/png"/>`,
    `<meta property="og:image:alt" content="${esc(alt)}"/>`,
    `<meta name="twitter:card" content="summary_large_image"/>`,
    `<meta name="twitter:image" content="${esc(url)}"/>`,
    `<meta name="twitter:image:alt" content="${esc(alt)}"/>`,
  ];
}
