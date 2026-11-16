/**
 * Brainarea — delgraf-komponent v1 [BYGG] FASE 3, todo #3790.
 *
 * Kontrakt — SVG/canvas-delgraf som lesere compatibilityModel-output:
 * - Inndata er utdata-objektet fra tests/schema/_rel_compat_model.mjs
 *   computePairCompatibility(): { ok, version, perDimension, overall (0-100, 1 des), bandId }
 *   + valgfrie profilvektorer aVec/bVec ({<dimId>: 0-100}) for profil-markoerer.
 *   Transport-formatet (identifikatorfrit #fragment) eies av #3794 — denne modulen
 *   tar bare kompatible objekter, aldri lenker/rasvar.
 * - To tegneflate-bindinger pa ETT felles layout (shareGraphLayout):
 *   renderShareGraphSvg()   — deterministisk SVG-streng (moensteret fra report/renderer.mjs
 *                             renderDimensionsSvg), kaster paa konfigfeil (renderer-konvensjon).
 *   drawShareGraphCanvas()  — ren tegnefunksjon mot en CanvasRenderingContext2D;
 *                             KASTER ALDRI: { ok:false, error } paa ctx-mangler eller
 *                             ok:false-compat, { ok:true, ops } ellers (deterministisk
 *                             ops-liste — samme input gir identisk kallsekvens).
 * - Eierskap: band-NAVN og brukertekster eies av #3784. labels.bands[bandId] brukes
 *   naar levert, ellers bandId verbatim (fallback-konvensjonen: aldri oppfunne navn).
 *   Dimensjons-etiketter: labels.dimensions — mangler => id verbatim (renderer.mjs:120-121
 *   tilsvarende), aldri kast.
 * - Ikke-diagnostisk/identifikatorfrit: grafen tar aldri navn/e-post/identifikatorer;
 *   personene kalles kun texts.personA/personB (krevd). Ingen 'usunn'-klassifikasjon
 *   (compatibilityModel.why.noDangerousMorphism gjelder ogsaa grafen).
 * - Strings-sink fra dag én: shareGraphStrings() leverer ALLE synlige strenger
 *   (orden = tegnerorden) for ban-scan — renderer.mjs sitt strings-sink-dekningshull
 *   (FASE 3 ND-verifiser-funn F1, pin til renderer-bygg) gjentas IKKE her.
 * - Feed-lesbarhet (beslutning 16 / #3791): viewBox W=600, minste fontstorrelse 12,
 *   hovedtekster 13, tittel/samlet 16-30 — maalbare innebygde garantier; den dype
 *   les-i-feed-vurderingen eies av #3791.
 * - Kvalitetskontrakt arvet: midtpunkt ≠ gjennomsnitt (midtpunkt-dash + pointMidpointLegend
 *   pointLine-tekst, aldri kombinert med prosent-lesing); ingen falsk norm/diagnose;
 *   ok:false-compat => graf rendres aldri.
 * - Determinisme: samme inndata gir byte-lik SVG. Ingen klokke, ingen rng, ingen DOM.
 *
 * Kjoer: ren ES-modul — importeres av visningslaget (FASE 4 par-flyten) og tester.
 */

export const SHARE_GRAPH_VERSION = 'v1';

/* ---------- geometri (delt av SVG og canvas) ---------- */

export const SHARE_W = 600;          /* viewBox-bredde: feed-sikker */
export const SHARE_H = 426;          /* viewBox-hoyde (4 rader + hodet + legends) */
export const SHARE_MIN_FONT = 12;    /* minste fontstorrelse i layout-koordinater */

const LEFT = 148;                    /* etikettkolonne (lengste etikett: 'Konflikthaandtering' @13px ~137) */
const VALMARG = 64;                  /* hoeyre verdikolonne */
const BAR_W = SHARE_W - LEFT - VALMARG;
const TITLE_Y = 30;
const CONTEXTY = 52;
const OVERALL_Y = 80;
const AXIS_Y = 98;
const ROWS_Y0 = 112;
const ROW_H = 64;
const N_ROWS = 4;
const LEGEND_Y = 386;
const POINT_LEGEND_Y = 406;
/* SHARE_H now exported above */

const clamp100 = (x) => Math.max(0, Math.min(100, Number(x)));
const xAt = (pct) => LEFT + (BAR_W * clamp100(pct)) / 100;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* krevd bilingual streng — aldri stille EN-fallback (renderer L-konvensjon) */
function L(obj, lang, where) {
  if (!obj || typeof obj !== 'object') throw new Error(`sharegraph: ${where} mangler i config`);
  const v = obj[lang];
  if (typeof v !== 'string' || v.trim().length === 0) throw new Error(`sharegraph: ${where}.${lang} mangler/tom`);
  return v;
}

/* overall pa modellkontrakt 1 desimal — locale-skilt desimaltegn (no: komma) */
export function fmtOverall(v, lang) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100) throw new Error(`sharegraph: overall-utover-kontrakt: ${v}`);
  const fixed = (Math.round(n * 10) / 10).toFixed(1);
  return lang === 'no' ? fixed.replace('.', ',') : fixed;
}

/* alle synlige strenger i tegnerorden (ban-scan; renderer-eide verdier med) */
export function shareGraphStrings(compat, texts, labels, lang) {
  const strings = [];
  strings.push(L(texts.title, lang, 'texts.title'));
  strings.push(L(texts.contextLine, lang, 'texts.contextLine'));
  const pref = L(texts.overallPrefix, lang, 'texts.overallPrefix');
  strings.push(`${pref} ${fmtOverall(compat.overall, lang)}`);
  const band = (labels && labels.bands && labels.bands[compat.bandId]) ? L(labels.bands[compat.bandId], lang, `labels.bands.${compat.bandId}`) : compat.bandId;
  strings.push(band);
  const pa = L(texts.personA, lang, 'texts.personA');
  const pb = L(texts.personB, lang, 'texts.personB');
  for (const d of DIM_ORDER) {
    const lab = (labels && labels.dimensions && labels.dimensions[d]) ? L(labels.dimensions[d], lang, `labels.dimensions.${d}`) : d;
    strings.push(lab);
    const r = compat.perDimension && compat.perDimension[d];
    if (r && r.ok) strings.push(String(Math.round(r.value * 100)));
    else strings.push(L(texts.notComputable || { no: 'Ikke beregnelig', en: 'Not computable' }, lang, 'texts.notComputable'));
  }
  strings.push(pa, pb);
  strings.push(L(texts.pointLine, lang, 'texts.pointLine'));
  return strings;
}

const DIM_ORDER = ['closeness', 'openness', 'conflict', 'independence'];

/**
 * Felles layout: ren tallberegning delt av SVG og canvas.
 * Returnerer geometri eller { ok:false, error } for ok-false-compat (kast aldri her).
 * profileVectors: { a?: vec, b?: vec } — vec = {<dim>: 0-100}; ugyldige verdier i en
 * dim => den dim-en faar ingen markoer (aldri halvgrafer av falske tall).
 */
export function shareGraphLayout(compat, texts, labels, lang, profileVectors, opts = {}) {
  if (!compat || compat.ok !== true) return { ok: false, error: 'compat-ok-false-eller-mangler' };
  const dims = [];
  for (let i = 0; i < DIM_ORDER.length; i++) {
    const id = DIM_ORDER[i];
    const r = compat.perDimension && compat.perDimension[id];
    const label = (labels && labels.dimensions && labels.dimensions[id])
      ? L(labels.dimensions[id], lang, `labels.dimensions.${id}`)
      : String(id); /* fallback: id verbatim — aldri oppfunnet navn */
    const row = {
      id, label,
      y: ROWS_Y0 + i * ROW_H,
      sPct: (r && r.ok && Number.isFinite(r.value)) ? clamp100(r.value * 100) : null,
      valTxt: (r && r.ok) ? String(Math.round(r.value * 100)) : null,
      marks: {},
    };
    if (profileVectors && (profileVectors.a || profileVectors.b)) {
      const cand = { a: profileVectors.a && profileVectors.a[id], b: profileVectors.b && profileVectors.b[id] };
      for (const who of ['a', 'b']) {
        const v = cand[who];
        if (Number.isFinite(v) && v >= 0 && v <= 100) row.marks[who] = v;
        else if (v !== undefined && v !== null) {
          if (opts.strictVectors) return { ok: false, error: 'vektor-utover-omfang', dimId: id, who };
          /* mild konvensjon: ugyldig v => ingen markoer paa den dimensjonen */
        }
      }
    }
    dims.push(row);
  }
  const band = (labels && labels.bands && labels.bands[compat.bandId]) ? L(labels.bands[compat.bandId], lang, `labels.bands.${compat.bandId}`) : compat.bandId;
  return {
    ok: true,
    version: SHARE_GRAPH_VERSION,
    W: SHARE_W, H: SHARE_H,
    LEFT, BAR_W, VALMARG,
    title: L(texts.title, lang, 'texts.title'),
    contextLine: L(texts.contextLine, lang, 'texts.contextLine'),
    overallPrefix: L(texts.overallPrefix, lang, 'texts.overallPrefix'),
    overallTxt: fmtOverall(compat.overall, lang),
    bandId: compat.bandId, bandName: band,
    personA: L(texts.personA, lang, 'texts.personA'),
    personB: L(texts.personB, lang, 'texts.personB'),
    pointLine: L(texts.pointLine, lang, 'texts.pointLine'),
    notComputable: L(texts.notComputable || { no: 'Ikke beregnelig', en: 'Not computable' }, lang, 'texts.notComputable'),
    axis0Y: AXIS_Y, rowsY0: ROWS_Y0, rowH: ROW_H,
    legend0Y: LEGEND_Y, pointY: POINT_LEGEND_Y,
    dims,
  };
}

/** SVG-flaten: deterministisk streng. Kaster paa konfigfeil (renderer-konvensjon); ok-false-compat => null. */
export function renderShareGraphSvg(compat, texts, labels, lang, profileVectors, opts = {}) {
  const lo = shareGraphLayout(compat, texts, labels, lang, profileVectors, opts);
  if (!lo.ok) return null;
  const p = [];
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${SHARE_W}" height="${SHARE_H}" viewBox="0 0 ${SHARE_W} ${SHARE_H}" role="img" aria-label="${esc(lo.title)}">`);
  p.push(`<title>${esc(lo.title)}</title>`);
  p.push(`<rect x="0" y="0" width="${SHARE_W}" height="${SHARE_H}" fill="#ffffff"/>`);
  /* hode */
  p.push(`<text x="8" y="${TITLE_Y}" font-size="17" font-weight="700" fill="#111827">${esc(lo.title)}</text>`);
  p.push(`<text x="8" y="${CONTEXTY}" font-size="12" fill="#374151">${esc(lo.contextLine)}</text>`);
  p.push(`<text x="8" y="${OVERALL_Y}" font-size="30" font-weight="700" fill="#1e293b">${esc(`${lo.overallPrefix} ${lo.overallTxt}`)}</text>`);
  p.push(`<text x="8" y="${OVERALL_Y - 16}" font-size="14" font-weight="700" fill="#334155">${esc(lo.bandName)}</text>`);
  /* felles akse over kompatibilitets-bars: 0-100, midtpunkt-d */
  p.push(`<line x1="${LEFT}" y1="${AXIS_Y}" x2="${LEFT + BAR_W}" y2="${AXIS_Y}" stroke="#cbd5e1" stroke-width="1"/>`);
  p.push(`<text x="${LEFT}" y="${AXIS_Y - 6}" font-size="12" fill="#64748b" text-anchor="start">0</text>`);
  p.push(`<text x="${LEFT + BAR_W}" y="${AXIS_Y - 6}" font-size="12" fill="#64748b" text-anchor="end">100</text>`);
  for (const d of lo.dims) {
    const y = d.y;
    p.push(`<text x="8" y="${y + 12}" font-size="13" font-weight="600" fill="#111827">${esc(d.label)}</text>`);
    if (d.marks.a !== undefined || d.marks.b !== undefined) {
      /* profil-stripe: profilenes posisjon paa 0-100-adskilt fra s-baren */
      p.push(`<line x1="${LEFT}" y1="${y + 25}" x2="${LEFT + BAR_W}" y2="${y + 25}" stroke="#e2e8f0" stroke-width="2"/>`);
      p.push(`<line x1="${xAt(50)}" y1="${y + 23}" x2="${xAt(50)}" y2="${y + 27}" stroke="#94a3b8" stroke-width="1"/>`);
    }
    if (d.sPct !== null) {
      /* kompatibilitets-bar */
      p.push(`<rect x="${LEFT}" y="${y + 36}" width="${BAR_W}" height="16" rx="4" fill="#eef2f7"/>`);
      p.push(`<rect x="${LEFT}" y="${y + 36}" width="${((BAR_W * d.sPct) / 100).toFixed(2)}" height="16" rx="4" fill="#1d4ed8"/>`);
      p.push(`<line x1="${xAt(50).toFixed(2)}" y1="${y + 36}" x2="${xAt(50).toFixed(2)}" y2="${y + 52}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3 3"/>`);
      p.push(`<text x="${LEFT + BAR_W + 8}" y="${y + 49}" font-size="13" font-weight="600" fill="#111827">${esc(d.valTxt)}</text>`);
    } else {
      p.push(`<rect x="${LEFT}" y="${y + 36}" width="${BAR_W}" height="16" rx="4" fill="#eef2f7"/>`);
      p.push(`<text x="${LEFT + BAR_W + 8}" y="${y + 49}" font-size="13" fill="#64748b">${esc(lo.notComputable)}</text>`);
    }
    if (d.marks.a !== undefined) {
      p.push(`<circle cx="${xAt(d.marks.a).toFixed(2)}" cy="${y + 25}" r="5" fill="#1d4ed8" stroke="#ffffff" stroke-width="1.5"/>`);
    }
    if (d.marks.b !== undefined) {
      const cx = xAt(d.marks.b).toFixed(2), cy = y + 25;
      p.push(`<polygon points="${cx},${cy - 6} ${Number(cx) + 6},${cy} ${cx},${cy + 6} ${Number(cx) - 6},${cy}" fill="#b45309" stroke="#ffffff" stroke-width="1.5"/>`);
    }
  }
  /* legend: personformer + midtpunkt-linje */
  const ly = lo.legend0Y;
  p.push(`<circle cx="${LEFT + 6}" cy="${ly - 4}" r="5" fill="#1d4ed8"/>`);
  p.push(`<text x="${LEFT + 16}" y="${ly}" font-size="12" fill="#374151">${esc(lo.personA)}</text>`);
  const lx2 = LEFT + 6 + 20 + 46; /* personA-sirkel x + sirkelavstand + fast tekstrom for personA */
  p.push(`<polygon points="${lx2 - 5},${ly - 9} ${lx2 + 5},${ly - 4} ${lx2 - 5},${ly + 1} ${lx2 - 10},${ly - 4}" fill="#b45309"/>`);
  p.push(`<text x="${lx2 + 12}" y="${ly}" font-size="12" fill="#374151">${esc(lo.personB)}</text>`);
  p.push(`<text x="8" y="${lo.pointY}" font-size="12" fill="#64748b">${esc(lo.pointLine)}</text>`);
  p.push('</svg>');
  return p.join('\n');
}

/**
 * Canvas-flaten: KASTER ALDRI. Tegner mot en CanvasRenderingContext2D-lignende ctx
 * (fillRect/fillText/beginPath/arc/moveTo/lineTo/stroke/fill/save/restore).
 * Samme layout som SVG — geometriske garantier testes via shareGraphLayout.
 * Returnerer { ok:true, ops } med ops = deterministisk kall-liste
 * [{m:'fillRect', a:[...]}, ...], eller { ok:false, error }.
 */
export function drawShareGraphCanvas(compat, texts, labels, lang, ctx, profileVectors, opts = {}) {
  if (!ctx || typeof ctx !== 'object') return { ok: false, error: 'canvas-mangler' };
  const ops = [];
  const rec = (m, ...a) => ops.push({ m, a });
  const proxy = {
    save: () => rec('save'), restore: () => rec('restore'),
    clearRect: (...a) => rec('clearRect', ...a),
    fillRect: (...a) => rec('fillRect', ...a),
    strokeRect: (...a) => rec('strokeRect', ...a),
    beginPath: () => rec('beginPath'),
    closePath: () => rec('closePath'),
    arc: (...a) => rec('arc', ...a),
    moveTo: (...a) => rec('moveTo', ...a),
    lineTo: (...a) => rec('lineTo', ...a),
    stroke: () => rec('stroke'), fill: () => rec('fill'),
    fillText: (t, ...a) => rec('fillText', String(t), ...a),
    set fillStyle(v) { rec('fillStyle', v); },
    set strokeStyle(v) { rec('strokeStyle', v); },
    set font(v) { rec('font', v); },
    set lineWidth(v) { rec('lineWidth', v); },
    set textAlign(v) { rec('textAlign', v); },
    set textBaseline(v) { rec('textBaseline', v); },
    set globalAlpha(v) { rec('globalAlpha', v); },
  };
  const lo = shareGraphLayout(compat, texts, labels, lang, profileVectors, opts);
  if (!lo.ok) return { ok: false, error: lo.error };
  const draw = (fn) => { fn(proxy); };
  draw((g) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, SHARE_W, SHARE_H);
    g.fillStyle = '#111827'; g.font = '700 17px system-ui, sans-serif'; g.fillText(lo.title, 8, TITLE_Y);
    g.fillStyle = '#374151'; g.font = '12px system-ui, sans-serif'; g.fillText(lo.contextLine, 8, CONTEXTY);
    g.fillStyle = '#1e293b'; g.font = '700 30px system-ui, sans-serif';
    g.fillText(`${lo.overallPrefix} ${lo.overallTxt}`, 8, OVERALL_Y);
    g.font = '700 14px system-ui, sans-serif'; g.fillText(lo.bandName, 8, OVERALL_Y - 16);
    /* akse */
    g.strokeStyle = '#cbd5e1'; g.lineWidth = 1; g.beginPath(); g.moveTo(LEFT, AXIS_Y); g.lineTo(LEFT + BAR_W, AXIS_Y); g.stroke();
    g.fillStyle = '#64748b'; g.font = '12px system-ui, sans-serif';
    g.textAlign = 'start'; g.fillText('0', LEFT, AXIS_Y - 6);
    g.textAlign = 'end'; g.fillText('100', LEFT + BAR_W, AXIS_Y - 6);
    g.textAlign = 'start';
    for (const d of lo.dims) {
      const y = d.y;
      g.fillStyle = '#111827'; g.font = '600 13px system-ui, sans-serif'; g.fillText(d.label, 8, y + 12);
      if (d.marks.a !== undefined || d.marks.b !== undefined) {
        g.strokeStyle = '#e2e8f0'; g.lineWidth = 2; g.beginPath(); g.moveTo(LEFT, y + 25); g.lineTo(LEFT + BAR_W, y + 25); g.stroke();
        g.strokeStyle = '#94a3b8'; g.lineWidth = 1; g.beginPath(); g.moveTo(xAt(50), y + 23); g.lineTo(xAt(50), y + 27); g.stroke();
      }
      g.fillStyle = '#eef2f7'; g.fillRect(LEFT, y + 36, BAR_W, 16);
      if (d.sPct !== null) {
        g.fillStyle = '#1d4ed8'; g.fillRect(LEFT, y + 36, (BAR_W * d.sPct) / 100, 16);
      }
      g.strokeStyle = '#94a3b8'; g.lineWidth = 1; g.beginPath(); g.moveTo(xAt(50), y + 36); g.lineTo(xAt(50), y + 52); g.stroke();
      if (d.sPct !== null) {
        g.fillStyle = '#111827'; g.font = '600 13px system-ui, sans-serif'; g.fillText(d.valTxt, LEFT + BAR_W + 8, y + 49);
      } else {
        g.fillStyle = '#64748b'; g.fillText(lo.notComputable, LEFT + BAR_W + 8, y + 49);
      }
      if (d.marks.a !== undefined) {
        g.fillStyle = '#1d4ed8'; g.strokeStyle = '#ffffff'; g.lineWidth = 1.5;
        g.beginPath(); g.arc(xAt(d.marks.a), y + 25, 5, 0, Math.PI * 2); g.fill(); g.stroke();
      }
      if (d.marks.b !== undefined) {
        const cx = xAt(d.marks.b), cy = y + 25;
        g.fillStyle = '#b45309'; g.beginPath();
        g.moveTo(cx, cy - 6); g.lineTo(cx + 6, cy); g.lineTo(cx, cy + 6); g.lineTo(cx - 6, cy); g.closePath(); g.fill();
      }
    }
    /* legend */
    const ly = lo.legend0Y;
    g.fillStyle = '#1d4ed8'; g.beginPath(); g.arc(LEFT + 6, ly - 4, 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#374151'; g.font = '12px system-ui, sans-serif'; g.fillText(lo.personA, LEFT + 16, ly);
    g.fillStyle = '#b45309'; g.beginPath();
    const dx = LEFT + 6 + 20 + 46;
    g.moveTo(dx - 5, ly - 9); g.lineTo(dx + 5, ly - 4); g.lineTo(dx - 5, ly + 1); g.lineTo(dx - 10, ly - 4); g.closePath(); g.fill();
    g.fillStyle = '#374151'; g.fillText(lo.personB, dx + 12, ly);
    g.fillStyle = '#64748b'; g.fillText(lo.pointLine, 8, lo.pointY);
  });
  return { ok: true, version: SHARE_GRAPH_VERSION, H: SHARE_H, W: SHARE_W, ops };
}
