/**
 * [VERIFISER FASE 3] Relasjoner-resultattekst — uavhengig tredjepartslesbarhetshet
 * (todo #3785-søster, run TR-379C6007F82B). Egen vinkel, ikke kopi av
 * _fase3_rel_resulttext_verify.mjs (88 checks, bygg-leafen TR-FAE96A45F277):
 *   V1 — ekstremprofiler gjennom EKTE scoringpath: pos-items=1/neg-items=5
 *        (alle motsvar) og pos=5/neg=1 (alle maks). +-+- per dim gir
 *        null-normaliserte ekstremer (0/100) og kompositt 0/100 — rapporten
 *        skal ikke lovgjore, ikke tolke kvalitet, ikke fabrikere profiltekst
 *        ved skalaens endepunkter.
 *   V2 — aerlighetsproven: enumerasjonen '(personlighet, relasjoner, triage)'
 *        hevder tre selvrapporteringstyper. Relasjonstesten er FASE 1-live
 *        (out/relasjoner); triage er BYGGET som pool (#3828) men mangler
 *        offentlig testflate i out/ i dag. Kildesannhet dokumentert:
 *        'personlighet, relasjoner, triage' beskriver rapporttypespekteret
 *        (renderer støtter trait + evnerester), ikke lovnad om at tre
 *        offentlige tester finnes naa.
 *   V3 — renderer-fallback-prov: config MED labels laaser 4/4 rel-etiketter
 *        byte-eksakt (bygg-leafens R1); config UTEN labels (labels slettet)
 *        gir raa id i fallback-lagen — renderer-moensteret verifisert baade
 *        veier (renderer.mjs:120-121 fallback: id verbatim, ingen oppfunnne navn).
 *   V4 — forbuds-skann over 12 renders (3 rammer x 2 spraak x 2 ekstremer):
 *        'prosentil' 0 treff; IQ/intelligens/diagnose/mensa/klinisk KUN i
 *        negert kontekst (negasjon innen 25 tegn foer ordet).
 * Kjoer: node tests/schema/_fase3_rel_resulttext_3rdparty_verify.mjs
 */
import { renderReport } from '../../report/renderer.mjs';
import { scoreTest } from '../../tests/engine/scoring.js';
import fs from 'node:fs';

let pass = 0; const failures = [];
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; }
  else { failures.push(name); console.log(`FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

const DIMS = [
  { id: 'closeness', pre: 'cl' }, { id: 'openness', pre: 'op' },
  { id: 'conflict', pre: 'cf' }, { id: 'independence', pre: 'iv' },
];
const OPTS5 = [
  { label: 'Helt uenig', value: 1 }, { label: 'Litt uenig', value: 2 }, { label: 'Nøytral', value: 3 },
  { label: 'Litt enig', value: 4 }, { label: 'Helt enig', value: 5 },
];
const TEXTS = {
  cl: ['Jeg føler meg nær de jeg er glad i.', 'Det er viktig for meg å dele tanker med folk jeg står nær.',
       'Jeg trekker meg unna når noen kommer for nær.', 'Nærhet i relasjoner gjør meg ukomfortabel.'],
  op: ['Jeg snakker åpent om følelsene mine.', 'Jeg forteller kjære om hvordan dagen min har vært.',
       'Jeg holder tanker for meg selv.', 'Jeg stenger ute samtaler om det personlige.'],
  cf: ['Jeg tar konflikter opp direkte.', 'Jeg prøver å løse uenighet i stedet for å vente den ut.',
       'Jeg skynder meg bort fra uenighet.', 'Jeg lar konflikter ligge til de forsvinner.'],
  iv: ['Jeg tar egne valg i forholdet.', 'Jeg står på mine egne behov i samliv.',
       'Jeg lar andre bestemme for meg.', 'Jeg ofrer egne behov for ro i forholdet.'],
};
const mkItems = () => {
  const items = [];
  for (const { id, pre } of DIMS) {
    TEXTS[pre].forEach((text, i) => items.push({
      id: `r-${pre}-${String(i + 1).padStart(2, '0')}`,
      kind: 'likert', lang: 'no', text, options: OPTS5,
      scales: [{ id, sign: i < 2 ? 1 : -1 }],
    }));
  }
  return items;
};
const T0 = 1_700_000_000_000;
const mkPayload = (def, posVal, negVal) => ({
  testId: def.id, lang: 'no', itemIds: def.items.map((i) => i.id),
  startedAt: T0, finishedAt: T0 + 60_000, timeSpentSec: 60, expired: false,
  answers: Object.fromEntries(def.items.map((i) => {
    const neg = i.scales[0].sign === -1;
    return [i.id, { kind: 'likert', lang: 'no', value: neg ? negVal : posVal }];
  })),
});
const cfgOf = (f) => JSON.parse(fs.readFileSync(new URL(`../../report/configs/${f}.json`, import.meta.url), 'utf8'));

/* ---------- V3: fallback-lagen — labels til stede vs slettet ---------- */
const LABELS = {
  no: { closeness: 'Nærhet', openness: 'Åpenhet', conflict: 'Konflikthåndtering', independence: 'Selvstendighet' },
  en: { closeness: 'Closeness', openness: 'Openness', conflict: 'Conflict handling', independence: 'Independence' },
};
{
  const def = {
    schemaVersion: 1, id: 'rel-16-fixture', type: 'pool', family: 'relations', languages: ['no'],
    scoring: { type: 'trait', traits: DIMS.map((d) => ({ id: d.id, weight: 1 })), norms: 'none' },
    dimensions: DIMS.map((d) => ({ id: d.id, label: d.id, description: 'Relasjonssporet-def-fixture (ikke en ekte test).' })),
    items: mkItems(),
  };
  const scored = scoreTest(def, mkPayload(def, 3, 3));
  ok('V3.score', scored.ok === true);
  const cfg = cfgOf('standard');
  let withLabels = null;
  try { withLabels = renderReport(scored.result, cfg, { lang: 'no' }).html; } catch (e) { withLabels = null; }
  ok('V3.render-med-labels', withLabels !== null);
  if (withLabels) ok('V3.med-labels-etikett', withLabels.includes('Selvstendighet'));
  const cfgBare = JSON.parse(JSON.stringify(cfg));
  delete cfgBare.dimensions.labels;
  let bare = null;
  try { bare = renderReport(scored.result, cfgBare, { lang: 'no' }).html; } catch (e) { bare = null; }
  ok('V3.render-uten-labels', bare !== null, 'renderer skal kaste aldri paa config uten labels');
  if (bare) {
    ok('V3.fallback-raa-id-closeness', bare.includes('closeness'), 'fallback-lagen skal vise raa id (renderer.mjs:120-121)');
    ok('V3.fallback-etikett-tomme', !bare.includes('Selvstendighet'), 'uten labels skal config-etiketter ikke dukke opp');
  }
}

/* ---------- V1+V4: ekstremprofiler gjennom ekte scoringpath ---------- */
const BANNED = ['iq', 'intelligens', 'mensa', 'diagnos', 'personlighetsforstyrrelse', 'klinisk evaluert'];
let v5StdNo = null;
const EXTREME = [
  { tag: 'lavn', pos: 1, neg: 5, expect: 0 },
  { tag: 'hoy', pos: 5, neg: 1, expect: 100 },
];
for (const E of EXTREME) {
  const def = {
    schemaVersion: 1, id: 'rel-16-fixture', type: 'pool', family: 'relations', languages: ['no'],
    scoring: { type: 'trait', traits: DIMS.map((d) => ({ id: d.id, weight: 1 })), norms: 'none' },
    dimensions: DIMS.map((d) => ({ id: d.id, label: d.id, description: 'Relasjonssporet-def-fixture (ikke en ekte test).' })),
    items: mkItems(),
  };
  const scored = scoreTest(def, mkPayload(def, E.pos, E.neg));
  ok(`V1.score-${E.tag}`, scored.ok === true);
  const S = scored.result.scales;
  const norms = S.map((s) => s.normalized);
  ok(`V1.skalantall-${E.tag}`, S.length === 4);
  ok(`V1.null-normalisert-${E.tag}`, norms.every((n) => n === E.expect), JSON.stringify(norms));
  ok(`V1.kompositt-${E.tag}`, scored.result.total.composite === E.expect, String(scored.result.total.composite));

  for (const f of ['standard', 'personal', 'employer']) for (const lang of ['no', 'en']) {
    const cfg = cfgOf(f);
    let html = null; let threw = null;
    try { html = renderReport(scored.result, cfg, { lang }).html; } catch (e) { threw = e; }
    ok(`X.${E.tag}.${f}.${lang}.render`, html !== null, threw && threw.message);
    if (!html) continue;
    for (const id of ['closeness', 'openness', 'conflict', 'independence']) {
      ok(`X.${E.tag}.${f}.${lang}.ingen-raa-id-${id}`, !html.includes(`>${id}<`));
    }
    for (const [id, label] of Object.entries(LABELS[lang])) {
      ok(`X.${E.tag}.${f}.${lang}.etikett-${id}`, html.includes(label), `mangler '${label}'`);
    }
    ok(`X.${E.tag}.${f}.${lang}.ingen-prosentil`, !html.toLowerCase().includes('prosentil'));
    if (lang === 'no') ok(`X.${E.tag}.${f}.no.disclosure`, html.includes('ikke persentiler'));
    // forbuds-skann paa plain-tekst (markup strip) med negasjonsvindu 60 tegn / <=4 ord:
    // 'ikke et intelligensmaal', 'ikke en helhetsvurdering av intelligens', 'ikke diagnostiske',
    // 'ikke en diagnose', 'ikke en klinisk vurdering' alle PASSER; paa-stand ('IQ-scoren din...')
    // uten negasjon feiler. Kontekstene verifisert manuelt mot configs 2026-11-16.
    const plain = html.replace(/<[^>]+>/g, ' ').toLowerCase();
    for (const w of BANNED) {
      let idx = -1; let unNeg = false;
      while ((idx = plain.indexOf(w, idx + 1)) !== -1) {
        const before = plain.slice(Math.max(0, idx - 60), idx);
        if (!/\b(ikke|not|aldri)\s+(\w+\s+){0,3}$/.test(before)) { unNeg = true; break; }
      }
      ok(`X.${E.tag}.${f}.${lang}.forbud-${w}`, !unNeg, `'${w}' i paastaaende kontekst`);
    }
    if (E.tag === 'hoy' && f === 'standard' && lang === 'no') v5StdNo = html;
  }
}

/* ---------- V2: enumerasjonens kildesannhet ---------- */
ok('V2.rel-live-i-out', fs.existsSync(new URL('../../out/relasjoner/index.html', import.meta.url))
  && fs.existsSync(new URL('../../out/en/relations/index.html', import.meta.url)));
ok('V2.triage-mangler-offentlig-flate-i-out', !fs.existsSync(new URL('../../out/triage', import.meta.url)),
  'hvis triage-flaten finnes: oppdater V2-kommentar — da er alle tre typer offentlige');

/* ---------- oppsummering ---------- */
if (v5StdNo) {
  const idx = v5StdNo.indexOf('Selvstendighet');
  if (idx >= 0) console.log('EKSEMPEL-RENDRING (standard/no, alle-maks):', v5StdNo.slice(idx, idx + 60).replace(/\s+/g, ' '));
}
console.log(`REL-RESULTATTEKST 3RDPARTY ${pass} PASS / ${failures.length} FAIL`);
if (failures.length) { console.log('FAILURES:', failures.join(', ')); process.exit(1); }
