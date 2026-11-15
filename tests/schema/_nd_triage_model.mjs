/**
 * Brainarea triage-modell v1.0.0 — [BYGG] FASE 2, todo leaf #3740
 * «Itemspec neurodivergent: triage (ADHD/autisme/BEGGE/ingen) + dyp ADHD + dyp autisme.»
 *
 * Ren funksjon: to normalized akse-skår (result.scales[].normalized fra scoring.js trait-sti)
 * -> fire utfall (out-none | out-adhd | out-autism | out-adhd-autism) + per-akse band-id.
 *
 * ---- Kontrakt ----
 * - Ikke en del av scoring-laget: scoring.js røres aldri. Visningslaget (FASE 3/4)
 *   importerer denne modulen og kaller den med skårene ALLEREDF beregnet av scoring.js.
 * - Deterministisk: samme inndata gir samme output. Kaster aldri — ugyldig inndata gir
 *   { ok:false, error } (samme konvensjon som _rel_compat_model.mjs).
 * - Aldri diagnose: output er 4-veis enum + band-id-er + referanser til neste steg i
 *   sporet. Ingen klinisk språk, ingen alvorlighetsgrad, ingen henvisningstekst —
 *   resultattekst er #3786/#3787 sitt område.
 *
 * ---- Avveininger (dokumentert i _nd_itemspec_spec.json triageModel.why) ----
 * 1. FLAGGED_GTE 55: screening-ikke-diagnose-asymmetrien — lav terskel favner de som
 *    kan ha nytte av dyp-screening. Dokumentert forhåndsvalg [A], kalibrerbare i FASE 10.
 * 2. OBSERVED 40–54: tekst-område (#3786), endrer ALDRI utfall — fire utfall holder
 *    brett-leddets kontrakt (ADHD/autisme/BEGGE/ingen) og «begge» oppstår naturlig
 *    uten spesialtilfelle (#3741-kriteriet).
 * 3. ASRS-anker-skår (asrs-anchor-skalaen) tas ALDRI som inngang her — triage-utfallet
 *    beregnes på supplement-akse; anker-skår vises separat i visningslaget.
 */

export const ND_TRIAGE_VERSION = '1.0.0';

export const FLAGGED_GTE = 55;
export const OBSERVED_GTE = 40;

export const OUTCODES = ['out-none', 'out-adhd', 'out-autism', 'out-adhd-autism'];

const AXES = ['adhd', 'autism'];
const isScore = (v) =>
  v === null || (Number.isFinite(v) && v >= 0 && v <= 100);

function axisBand(score) {
  if (score === null) return 'band-nodata';
  if (score >= FLAGGED_GTE) return 'band-flagged';
  if (score >= OBSERVED_GTE) return 'band-observed';
  return 'band-low';
}

/**
 * @param {{adhd: number|null, autism: number|null}} s - normalized akse-skår 0..100 eller null
 * @returns {{ok: boolean, error?: string, version: string, outcode?: string,
 *            perAxis?: {adhd: {bandId: string}, autism: {bandId: string}},
 *            nextSteps?: {deepPoolId: string|null}}}
 */
export function computeTriageOutcome(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) {
    return { ok: false, error: 'skor-objekt-mangler', version: ND_TRIAGE_VERSION };
  }
  for (const a of AXES) {
    if (!(a in s)) return { ok: false, error: 'mangler-akse-' + a, version: ND_TRIAGE_VERSION };
    if (!isScore(s[a])) return { ok: false, error: 'skor-utenfor-omfang', version: ND_TRIAGE_VERSION };
  }
  const adhdFlag = s.adhd !== null && s.adhd >= FLAGGED_GTE;
  const autismFlag = s.autism !== null && s.autism >= FLAGGED_GTE;

  let outcode;
  if (adhdFlag && autismFlag) outcode = 'out-adhd-autism';       // «begge» — naturlig utfall
  else if (adhdFlag) outcode = 'out-adhd';
  else if (autismFlag) outcode = 'out-autism';
  else outcode = 'out-none';

  return {
    ok: true,
    version: ND_TRIAGE_VERSION,
    outcode,
    perAxis: { adhd: { bandId: axisBand(s.adhd) }, autism: { bandId: axisBand(s.autism) } },
    nextSteps: {
      deepPoolId:
        outcode === 'out-adhd' ? 'nd-adhd'
        : outcode === 'out-autism' ? 'nd-autism'
        : outcode === 'out-adhd-autism' ? 'nd-adhd-autism'
        : null,
    },
  };
}

/**
 * Per-akse variant: beregn band for én akse. Nyttig for resultatvisning der
 * bare én akse er løst. Samme kast-aldri-konvensjon.
 */
export function axisBandFor(score) {
  if (!isScore(score)) return { ok: false, error: 'skor-utenfor-omfang', version: ND_TRIAGE_VERSION };
  return { ok: true, version: ND_TRIAGE_VERSION, bandId: axisBand(score) };
}
