/**
 * Brainarea — kompatibilitetsmodell v1 (referanseimplementasjon, ren funksjon).
 * [3-VEIS] FASE 2, todo #3738 "Itemspec relasjoner: dimensjoner, kompatibilitetsmodell."
 *
 * Kontrakt:
 * - Inndata: to normalized skalprofiler (result.scales[].normalized 0-100 per dimensjon),
 *   transportert identifikatorfrit via #fragment-deling (#3794 eier kodingen).
 * - Utdata: { ok, perDimension, overall (0-100, 1 desimal), bandId } eller { ok:false, error }.
 * - Determinisme: samme inndata gir alltid samme utdata. Ingen klokke, ingen rng, ingen DOM.
 * - Denne modulen er KONTRAKTEN: scoring.js paerer aldri to-oeKt-parring; #3790/#3794
 *   (FASE 3/4) importerer denne referanseimplementasjonen.
 *
 * Hoesthet: modellen er en deterministisk regnefunksjon paa to selvinnsikt-profiler —
 * ALDRI prediksjon av relasjonskvalitet. Rationale per dimensjon ligger i
 * _rel_itemspec_spec.json (compatibilityModel.rationale) og er kryssles-kriteriet i #3739.
 */

export const COMPAT_MODEL_VERSION = 'v1';

export const DIMENSIONS = [
  { id: 'closeness', kind: 'similarity' },
  { id: 'openness', kind: 'similarity' },
  { id: 'conflict', kind: 'tolerance', tol: 0.25 },
  { id: 'independence', kind: 'tolerance', tol: 0.35 },
];

/** Band-id-er er kontrakten; band-NAVN og brukertekster eies av #3784. */
export const BANDS = [
  { id: 'band-strong', min: 0.85 },
  { id: 'band-aligned', min: 0.70 },
  { id: 'band-mixed', min: 0.55 },
  { id: 'band-differing', min: 0.0 },
];

const byId = new Map(DIMENSIONS.map((d) => [d.id, d]));
const round1 = (x) => Math.round(x * 10) / 10;

/** Likhet/toleranse-skore per dimensjon. value i [0,1]. Ugyldig inndata => { ok:false } (kast aldri). */
export function dimensionCompatibility(dimId, a, b) {
  const d = byId.get(dimId);
  if (!d) return { ok: false, error: 'ukjent-dimensjon', dimId, value: null };
  if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || a > 100 || b < 0 || b > 100) {
    return { ok: false, error: 'skor-utenfor-omfang', dimId, value: null };
  }
  const e = Math.abs(a - b) / 100;
  let s;
  if (d.kind === 'similarity') {
    s = 1 - e;
  } else if (d.kind === 'tolerance') {
    s = e <= d.tol ? 1 : Math.max(0, 1 - (e - d.tol) / (1 - d.tol));
  } else {
    return { ok: false, error: 'ukjent-kind', dimId, value: null };
  }
  return { ok: true, dimId, kind: d.kind, e, value: s };
}

/** Full parring: fire dimensjonsskorer i [0,100] per person. */
export function computePairCompatibility(aVec, bVec) {
  if (!aVec || typeof aVec !== 'object' || !bVec || typeof bVec !== 'object') {
    return { ok: false, error: 'vektor-mangler' };
  }
  const perDimension = {};
  let sum = 0;
  for (const d of DIMENSIONS) {
    const r = dimensionCompatibility(d.id, aVec[d.id], bVec[d.id]);
    perDimension[d.id] = r;
    if (!r.ok) return { ok: false, error: r.error, dimId: d.id, perDimension };
    sum += r.value;
  }
  const overall = round1((sum / DIMENSIONS.length) * 100);
  let bandId = BANDS[BANDS.length - 1].id;
  for (const band of BANDS) {
    if (overall >= band.min * 100) { bandId = band.id; break; }
  }
  return { ok: true, version: COMPAT_MODEL_VERSION, perDimension, overall, bandId };
}
