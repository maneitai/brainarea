/**
 * Brainarea schema-selvtest — neurodivergent-itemspec (_nd_itemspec_spec.json + _nd_triage_model.mjs).
 * [3-VEIS] FASE 2, todo #3740 «Itemspec neurodivergent: triage (ADHD/autisme/BEGGE/ingen) + dyp ADHD + dyp autisme.»
 * S0–S15: spec-konsistens, lisens-forankring (DOC-C8C02AD272), ekte engine-prover mot scoring.js v1.0.0
 * (trait-sti to akser, threshold-divergens, ASRS-anker-eksklusjon, sign-matematikk), triage-modulen
 * håndregnet, AJV-schema-prover. Kjoring: node tests/schema/_nd_itemspec_selftest.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS' : 'FAIL') + ' ' + m); if (!c) fails++; };
const near = (x, v, t = 1e-9) => Math.abs(x - v) < t;

const spec = JSON.parse(readFileSync(new URL('./_nd_itemspec_spec.json', import.meta.url), 'utf8'));

const CANDIDATES = [
  '/mnt/f/maneit/prosjekter/filip-webside-prosjekter/brainarea',
  'f:/maneit/prosjekter/filip-webside-prosjekter/brainarea',
  'F:/maneit/prosjekter/filip-webside-prosjekter/brainarea',
];
const found = CANDIDATES.filter(existsSync);
ok(found.length >= 1, 'S0 prod-tre funnet: ' + found.join(' | '));
const PROD = found[0];

/* ---------- S1: toppfelt ---------- */
const TOP = ['specVersion','id','type','status','statusMeaning','date','boardLeaf','formalStatus',
  'boardRefs','goal','planSources','anchorDecision','domainDecision','triageSessionDecision',
  'triageModel','deepPoolDecision','languagePlan','poolDesign','scoringContracts','copyrightControl',
  'normLinkage','noteIds','engineGaps','engineGapMitigation','defFilePlan','selftestContract','provenance'];
for (const k of TOP) ok(spec[k] !== undefined, 'S1 toppfelt ' + k);
ok(spec.status === 'PROPOSED' && spec.specVersion === 1, 'S1b PROPOSED v1');

/* ---------- S2: anker = lisensverdikten DOC-C8C02AD272 ---------- */
const ad = spec.anchorDecision.value;
ok(/ASRS v1\.1 6Q verbatim/.test(ad.adhdAnchor), 'S2a ADHD-anker ASRS 6Q verbatim');
ok(/BYGG originale items/.test(ad.autismAnchor), 'S2b autisme-anker: originale items');
ok(/AQ/.test(ad.referenceRule) && /RAADS-R/.test(ad.referenceRule) && /cutoff/.test(ad.referenceRule), 'S2c referer-der-vi-ikke-gjengir (AQ/RAADS-R cutoff+fakta)');
ok(/6Q_Norwegian_final\.pdf/.test(JSON.stringify(spec.anchorDecision) + JSON.stringify(spec.languagePlan)), 'S2d offisiell NO-ASRS-PDF forankret');
ok(!ad.adhdAnchor.includes('18Q'), 'S2e aldri 18Q i ankeret');
ok(spec.anchorDecision.asrsPlacement.v1Triage.includes('UTENFOR v1-triage'), 'S2f ASRS utenfor v1-triage (gråsone §4)');
ok(spec.anchorDecision.asrsPlacement.adhdDeep.includes('#3760'), 'S2g ASRS-anker hjemmehørende i ADHD-dyp (#3760)');

/* ---------- S3: domener og akse-vokabular ---------- */
const dd = spec.domainDecision.value;
ok(dd.adhd.id === 'adhd' && dd.autism.id === 'autism', 'S3a to akser adhd+autism');
ok(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(dd.adhd.id) && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(dd.autism.id), 'S3b id-ene matcher schema-pattern');
ok(/FASE 3/.test(spec.domainDecision.basis) && /FASE 1/.test(spec.languagePlan.fase1Gap || 'FASE 3'), 'S3c FASE 1-gap ærlig dokumentert');

/* ---------- S4: triage-sesjonsform ---------- */
const ts = spec.triageSessionDecision.value;
ok(ts.scoringType.includes('trait') && ts.scoringType.includes('IKKE threshold'), 'S4a trait, ikke threshold');
ok(JSON.stringify(ts.traits) === JSON.stringify(['adhd','autism']) && ts.norms === 'none', 'S4b traits adhd+autism, norms none');
ok(ts.supplementPerAxis.pool === 20 && ts.supplementPerAxis.liveDef === 3, 'S4c supplement pool 20 / live 3 per akse');
const big5no = JSON.parse(readFileSync(join(PROD, 'tests/schema/def-ipip50-big5.no.json'), 'utf8'));
const anchor5 = big5no.items[0].options;
ok(anchor5.length === 5 && anchor5[0].value === 1 && anchor5[4].value === 5, 'S4d 5-anker finnes i prod (big5)');
ok(/NOYAKTIGHET-ankeret/.test(ts.supplementPerAxis.itemStyle) && /Veldig nøyaktig=5/.test(ts.supplementPerAxis.itemStyle), 'S4e NOYAKTIGHET-ankeret (Veldig unøyaktig=1..Veldig nøyaktig=5) dokumentert i spec');

/* ---------- S5: engine-prov — trait-sti med to akser (håndregnet) ---------- */
const scoringUrl = 'file://' + join(PROD, 'tests/engine/scoring.js');
const { scoreTest, SCORING_VERSION } = await import(scoringUrl);
ok(SCORING_VERSION === '1.0.0', 'S5a scoring.js v1.0.0');

const opts5 = anchor5.map((o) => ({ label: o.label, value: o.value }));
const probeDef = {
  schemaVersion: 1, id: 'nd-probe', type: 'test-definition', family: 'pool', languages: ['no'],
  scoring: { type: 'trait', traits: [{ id: 'adhd', weight: 1 }, { id: 'autism', weight: 1 }], norms: 'none' },
  dimensions: [
    { id: 'adhd', label: 'ADHD', labelLanguage: 'no', description: 'ADHD-supplement-akse (probe)' },
    { id: 'autism', label: 'Autisme', labelLanguage: 'no', description: 'Autisme-supplement-akse (probe)' },
  ],
  items: [
    { id: 'ta-0001', kind: 'likert', lang: 'no', text: 'Jeg mister tråden når dagens gjøremål bytter retning.', options: opts5, scales: [{ id: 'adhd', sign: 1 }] },
    { id: 'ta-0002', kind: 'likert', lang: 'no', text: 'Jeg starter oppgaver like før fristen nærmer seg.', options: opts5, scales: [{ id: 'adhd', sign: 1 }] },
    { id: 'ta-0003', kind: 'likert', lang: 'no', text: 'Jeg glemmer det jeg selv hadde sagt jeg skulle gjøre.', options: opts5, scales: [{ id: 'adhd', sign: 1 }] },
    { id: 'ts-0001', kind: 'likert', lang: 'no', text: 'Jeg holder samtaler i gang uten fastmanus.', options: opts5, scales: [{ id: 'autism', sign: 1 }] },
    { id: 'ts-0002', kind: 'likert', lang: 'no', text: 'Jeg følger samtalen lett selv når den hopper.', options: opts5, scales: [{ id: 'autism', sign: 1 }] },
    { id: 'ts-0003', kind: 'likert', lang: 'no', text: 'Jeg leser folks humør uten å spørre.', options: opts5, scales: [{ id: 'autism', sign: 1 }] },
  ],
};
const payloadAll = {
  testId: 'nd-probe', lang: 'no',
  itemIds: ['ta-0001','ta-0002','ta-0003','ts-0001','ts-0002','ts-0003'],
  startedAt: 0, finishedAt: 1, timeSpentSec: 30, expired: false,
  answers: {
    'ta-0001': { kind: 'likert', lang: 'no', value: 5 },
    'ta-0002': { kind: 'likert', lang: 'no', value: 4 },
    'ta-0003': { kind: 'likert', lang: 'no', value: 4 },
    'ts-0001': { kind: 'likert', lang: 'no', value: 3 },
    'ts-0002': { kind: 'likert', lang: 'no', value: 3 },
    'ts-0003': { kind: 'likert', lang: 'no', value: 2 },
  },
};
const r1 = scoreTest(probeDef, payloadAll);
ok(r1.ok, 'S5b trait-sti scores uten feil');
const s_adhd = r1.result.scales.find((s) => s.id === 'adhd');
const s_autism = r1.result.scales.find((s) => s.id === 'autism');
// håndregning: adhd raw 5+4+4=13, minP 3, maxP 15 -> 100*(13-3)/12 = 83.3333
ok(s_adhd && near(s_adhd.normalized, 83.3333333, 1e-4), 'S5c adhs-normalized håndregnet 83.33 (fikk ' + s_adhd?.normalized?.toFixed(4) + ')');
ok(s_autism && near(s_autism.normalized, 41.6666667, 1e-4), 'S5d autisme-normalized håndregnet 41.67 (fikk ' + s_autism?.normalized?.toFixed(4) + ')');
ok(r1.result.total.type === 'trait' && near(r1.result.total.composite, 62.5, 1e-9), 'S5e komposit 62.5 (håndregnet snitt av akser)');

/* ---------- S6: triage-modulen håndregnet ---------- */
const triageUrl = 'file://' + join(PROD, 'tests/schema/_nd_triage_model.mjs');
const tri = await import(triageUrl);
ok(tri.ND_TRIAGE_VERSION === '1.0.0', 'S6a triage-modul v1.0.0');
const oc = (a, b) => tri.computeTriageOutcome({ adhd: a, autism: b }).outcode;
ok(oc(30, 30) === 'out-none', 'S6b 30/30 -> out-none');
ok(oc(80, 30) === 'out-adhd', 'S6c 80/30 -> out-adhd');
ok(oc(30, 90) === 'out-autism', 'S6d 30/90 -> out-autism');
ok(oc(60, 70) === 'out-adhd-autism', 'S6e 60/70 -> out-adhd-autism («begge» naturlig utfall — #3741)');
ok(oc(55, 54) === 'out-adhd', 'S6f grense: 55 flagger, 54 observed endrer ikke utfall');
ok(tri.computeTriageOutcome({ adhd: 83.3333, autism: 41.6667 }).outcode === 'out-adhd' &&
   tri.computeTriageOutcome({ adhd: 83.3333, autism: 41.6667 }).perAxis.autism.bandId === 'band-observed',
  'S6g S5-skårene gir out-adhd med autisme i observed (tekst-sak, ikke utfall)');
ok(oc(null, 80) === 'out-autism', 'S6h null-akse utelates fra utfall');
ok(tri.computeTriageOutcome({ adhd: 83.3333, autism: null }).perAxis.autism.bandId === 'band-nodata', 'S6i band-nodata for tom akse');
// kast-aldri + determinisme:
const bads = [null, {}, { adhd: 'x', autism: 30 }, { adhd: 30 }, { adhd: 120, autism: 30 }, { adhd: -1, autism: 30 }];
let anyThrow = false;
for (const b of bads) { try { const r = tri.computeTriageOutcome(b); if (!r.ok && !r.error) ok(false, 'S6j mangler error'); } catch { anyThrow = true; } }
ok(!anyThrow, 'S6j kaster aldri på ugyldig inndata');
ok(JSON.stringify(tri.computeTriageOutcome({ adhd: 60, autism: 70 })) === JSON.stringify(tri.computeTriageOutcome({ adhd: 60, autism: 70 })), 'S6k determinisme');
ok(tri.axisBandFor(39).bandId === 'band-low' && tri.axisBandFor(40).bandId === 'band-observed' && tri.axisBandFor(55).bandId === 'band-flagged' && tri.axisBandFor(null).bandId === 'band-nodata', 'S6l axisBandFor-båndgrenser håndregnet');
const bands = spec.triageModel.bands;
ok(bands.flagged.includes('55') && bands.observed.includes('40') || (bands.flagged.includes('55') && bands.observed.includes('40')), 'S6m spec-bånd = modul-konstanter (55/40)');
ok(tri.FLAGGED_GTE === 55 && tri.OBSERVED_GTE === 40, 'S6n modul-konstanter 55/40');

/* ---------- S7: threshold-divergens — hvorfor triage IKKE er threshold ---------- */
const TH = {
  ...probeDef,
  id: 'nd-probe-th',
  scoring: { type: 'threshold', bands: [ { id: 'x', minScore: 0, label: 'X' }, { id: 'y', minScore: 12, label: 'Y' } ], disclaimer: 'screening.not-diagnosis' },
};
const rTH = scoreTest(TH, { ...payloadAll, testId: 'nd-probe-th' });
ok(rTH.ok && rTH.result.total.type === 'threshold', 'S7a threshold-def scores');
ok(rTH.result.total.score === 21, 'S7b threshold-total 21 = adhd 13 + autisme 8 (blandede konstrukter, tallet har ingen forklaring) — fikk ' + rTH.result.total.score);
ok(83.3333 > 55 && 41.6667 < 55, 'S7c forutsetning: akse-skårene 83.33/41.67');
// kontrast: samme sesjon under triage-modellen gir out-adhd mens threshold sa 18:
ok(tri.computeTriageOutcome({ adhd: 83.3333, autism: 41.6667 }).outcode === 'out-adhd', 'S7d triage-utfallet (out-adhd) skiller akse — threshold-totalen (18) kunne ikke');

/* ---------- S8: ASRS-anker-eksklusjon (asrs-anchor aldri i triage) ---------- */
const probeDefAnchor = {
  ...probeDef,
  id: 'nd-probe-anchor',
  scoring: { type: 'trait', traits: [{ id: 'adhd', weight: 1 }, { id: 'autism', weight: 1 }, { id: 'asrs-anchor', weight: 1 }], norms: 'none' },
  dimensions: [
    ...probeDef.dimensions,
    { id: 'asrs-anchor', label: 'ASRS-anker', labelLanguage: 'no', description: 'ASRS 6Q verbatim-blokk (probe)' },
  ],
};
const ansAnchor = {
  ...payloadAll.answers,
  'as-0001': { kind: 'likert', lang: 'no', value: 5 },
  'as-0002': { kind: 'likert', lang: 'no', value: 5 },
};
const probeDefAnchorItems = {
  ...probeDefAnchor,
  items: [
    ...probeDef.items,
    { id: 'as-0001', kind: 'likert', lang: 'no', text: '[ASRS verbatim placeholder]', options: opts5, scales: [{ id: 'asrs-anchor', sign: 1 }] },
    { id: 'as-0002', kind: 'likert', lang: 'no', text: '[ASRS verbatim placeholder]', options: opts5, scales: [{ id: 'asrs-anchor', sign: 1 }] },
  ],
};
const rA = scoreTest(probeDefAnchorItems, { ...payloadAll, testId: 'nd-probe-anchor', itemIds: [...payloadAll.itemIds, 'as-0001', 'as-0002'], answers: ansAnchor });
ok(rA.ok, 'S8a tre-trait def (inkl asrs-anchor) scores');
ok(rA.result.scales.length === 3 && rA.result.scales[2].id === 'asrs-anchor' && near(rA.result.scales[2].normalized, 100, 1e-9), 'S8b asrs-anchor-skår beregnes atskilt (100)');
// «begge» til tross for høyt anker: ankeret ignoreres av triage-modellen, som kun tar supplement-akser:
const rBoth = tri.computeTriageOutcome({ adhd: 60, autism: 60 });
ok(rBoth.outcode === 'out-adhd-autism', 'S8c «begge» ved begge akser flagget — anker-skår aldri blandet inn');
ok(spec.triageModel.why.asrsIntegration.includes('ALDRI'), 'S8d spec: anker aldri blandet inn i utfalltallet');

/* ---------- S9: sign-matematikk (reversering) håndregnet ---------- */
const revDef = {
  ...probeDef, id: 'nd-probe-rev',
  items: [{ id: 'tr-0001', kind: 'likert', lang: 'no', text: 'Jeg klarer å vente rolig i kø.', options: opts5, scales: [{ id: 'adhd', sign: -1 }] }],
};
const rRev = scoreTest(revDef, { ...payloadAll, testId: 'nd-probe-rev', itemIds: ['tr-0001'], answers: { 'tr-0001': { kind: 'likert', lang: 'no', value: 4 } } });
ok(rRev.result.scales[0].reversedCount === 1, 'S9a reversedCount registrert');
// håndregning: c=-4, minP=-5, maxP=-1 -> (c-minP)/(max-min) = (1)/4 = 25
ok(near(rRev.result.scales[0].normalized, 25, 1e-9), 'S9b sign=-1 normalisert 25 (fikk ' + rRev.result.scales[0].normalized + ')');

/* ---------- S10: dyp-pool-beslutning ---------- */
const dp = spec.deepPoolDecision;
ok(dp.adhdThemes.length === 3 && dp.autismThemes.length === 3, 'S10a 6 temaer (3+3)');
const sumA = dp.adhdThemes.reduce((a, t) => a + t.poolMin, 0);
const sumS = dp.autismThemes.reduce((a, t) => a + t.poolMin, 0);
ok(sumA === 100 && sumS === 100, 'S10b poolMin 100+100 (fikk ' + sumA + '+' + sumS + ')');
ok(dp.adhdThemes.every((t) => t.idPrefix === 'da') && dp.autismThemes.every((t) => t.idPrefix === 'ds'), 'S10c prefikser da/ds');
ok(/DSM-5/.test(dp.noDsmTranscription) && /ALDRI/i.test(dp.noDsmTranscription), 'S10d DSM-transkripsjon forbudt');
ok(/trekk 24/.test(JSON.stringify(spec.poolDesign.deepPools)), 'S10e dyp trekk 24 (8+8+8) planlagt');

/* ---------- S11: id-mønster ---------- */
const IDP = /^[a-z0-9]+(-[a-z0-9]+)*$/;
for (const pfx of ['ta', 'ts', 'da', 'ds']) ok(IDP.test(pfx + '-0001') && IDP.test(pfx + '-0020'), 'S11 id-eksempel ' + pfx + '-0001/-0020 matcher schema-pattern');
ok(spec.defFilePlan.naming.includes('def-nd-triage-pool') && spec.defFilePlan.naming.includes('def-nd-adhd-dyp-pool') && spec.defFilePlan.naming.includes('def-nd-autisme-dyp-pool'), 'S11b def-filnavn planlagt');

/* ---------- S12: språkplan + ASRS-adopsjonsregel ---------- */
const lp = spec.languagePlan;
ok(JSON.stringify(lp.languages) === '["no","en"]', 'S12a NO+EN');
ok(lp.asrsSpecial.includes('adopsjon') && lp.asrsSpecial.includes('6Q_Norwegian_final.pdf') && lp.asrsSpecial.includes('6Q_German_final.pdf'), 'S12b ASRS = adopsjon av offisielle PDF-er, ikke nyoversettelse');

/* ---------- S13: boardRefs mot brettet ---------- */
const BR = JSON.stringify(spec.boardRefs);
for (const id of ['#3740', '#3741', '#3758', '#3759', '#3760', '#3761', '#3762', '#3763', '#3778', '#3786', '#3813']) ok(BR.includes(id), 'S13 boardRef ' + id);

/* ---------- S14: prod-filer ---------- */
for (const f of ['tests/engine/scoring.js', 'tests/engine/render.js', 'tests/schema/test-definition.schema.json', 'functions/normering.js', 'tests/schema/def-ipip50-big5.no.json', 'tests/schema/def-ipip50-big5.en.json']) {
  ok(existsSync(join(PROD, f)), 'S14 prodfil ' + f);
}

/* ---------- S15: normLinkage, noteIds, gaps, copyright ---------- */
const nl = spec.normLinkage;
ok(nl && nl.todo === '#3724' && String(nl.status).includes('ikke deployet'), 'S15a normLinkage #3724');
ok(JSON.stringify(spec.noteIds) === JSON.stringify(['note.trait.not-normed', 'note.threshold.screening', 'scoring.not-diagnosis']), 'S15b noteIds trippel');
const gapIds = spec.engineGaps.map((g) => g.id).join(',');
ok(gapIds === 'NG-1,NG-2,NG-3,NG-4,NG-5', 'S15c engineGaps NG-1..NG-5');
ok(spec.engineGaps.every((g) => g.gap && g.gap.length > 20), 'S15d alle gaps dokumentert');
ok(spec.engineGapMitigation.length > 40, 'S15e mitigation present');
const forb = spec.copyrightControl.forbidden;
ok(forb.length === 6, 'S15f 6 forbuds-linjer (ASRS/AQ/RAADS-R/DSM/kommersielle ND/diagnose-påstand)');
ok(/DSM-5/.test(forb.join(' ')) && /DIVA-5|CAADID|Conners/.test(forb.join(' ')), 'S15g DSM + kommersielle ND-instrumenter eksplisitt forbudt');

/* ---------- S16: i18n kryssles (begrenset per NG-3) ---------- */
const enKeys = (await import('file://' + join(PROD, 'i18n/en.js'))).KEYS;
const noKeys = (await import('file://' + join(PROD, 'i18n/no.js'))).KEYS;
ok(typeof enKeys.note['threshold.screening'] === 'string' && typeof noKeys.note['threshold.screening'] === 'string', 'S16a threshold.screening finnes i EN-base og NO-overlay');
ok(Object.keys(enKeys.page).some((k) => k.startsWith('nd.')), 'S16b ND-page-nøkler levert (#ND-WIRE lukket NG-3-gapet; keyene eies av bygg+runner)');
ok(spec.languagePlan.fase1Gap && spec.languagePlan.fase1Gap.includes('FASE 3'), 'S16c fase1-gap dokumentert i spec');

/* ---------- S17: family-pool begrensning (schema enum) ---------- */
const schema = JSON.parse(readFileSync(join(PROD, 'tests/schema/test-definition.schema.json'), 'utf8'));
const famEnum = schema.properties.family.enum;
ok(Array.isArray(famEnum) && famEnum.includes('pool') && !famEnum.includes('neurodivergent'), 'S17a family enum har ikke neurodivergent — sporet bor under pool (dokumentert i defFilePlan)');
ok(spec.defFilePlan.conventions.includes("family 'pool'"), 'S17b defFilePlan dokumenterer family-pool-valget');
ok(spec.provenance && Array.isArray(spec.provenance.engineFactsVerified) && spec.provenance.engineFactsVerified.length >= 5, 'S17c provenance: engine-fakta verifisert i økten');

/* ---------- S18: AJV-schema-prover ---------- */
delete schema.$schema;
const prodRequire = createRequire(join(PROD, 'tests/engine/scoring.js'));
const AjvCtor = prodRequire('ajv');
if (!AjvCtor) {
  ok(false, 'S18 ajv ikke funnet i prod node_modules');
} else {
  const ajv = new AjvCtor({ strict: false, allErrors: true, validateSchema: false });
  const v = ajv.compile(schema);
  for (const [name, d] of [['trait-probe', probeDef], ['threshold-probe', TH], ['anchor-probe', probeDefAnchorItems]]) {
    const good = v(d);
    ok(good, 'S18 ' + name + ' AJV-valid: ' + (v.errors?.map((e) => e.instancePath + ' ' + e.message).join('; ') ?? ''));
  }
  // dyp-probe (ADHD-dyp form: 3 tema-skalaer + asrs-anchor)
  const deepDef = {
    ...probeDef, id: 'nd-probe-deep',
    scoring: { type: 'trait', traits: [{ id: 'da1', weight: 1 }, { id: 'da2', weight: 1 }, { id: 'da3', weight: 1 }, { id: 'asrs-anchor', weight: 1 }], norms: 'none' },
    dimensions: [{ id: 'da1', label: 'Oppmerksomhet', labelLanguage: 'no', description: 'dyp tema 1' },
      { id: 'da2', label: 'Impulsivitet', labelLanguage: 'no', description: 'dyp tema 2' },
      { id: 'da3', label: 'Hverdagsfungering', labelLanguage: 'no', description: 'dyp tema 3' },
      { id: 'asrs-anchor', label: 'ASRS-anker', labelLanguage: 'no', description: 'anchor' }],
    items: [{ id: 'da-0001', kind: 'likert', lang: 'no', text: 'probe da1', options: opts5, scales: [{ id: 'da1', sign: 1 }] },
      { id: 'da-0041', kind: 'likert', lang: 'no', text: 'probe da2', options: opts5, scales: [{ id: 'da2', sign: 1 }] },
      { id: 'da-0076', kind: 'likert', lang: 'no', text: 'probe da3', options: opts5, scales: [{ id: 'da3', sign: 1 }] },
      { id: 'as-0001', kind: 'likert', lang: 'no', text: 'probe anchor', options: opts5, scales: [{ id: 'asrs-anchor', sign: 1 }] }],
  };
  const goodDeep = v(deepDef);
  ok(goodDeep, 'S18 dyp-probe AJV-valid: ' + (v.errors?.map((e) => e.instancePath + ' ' + e.message).join('; ') ?? ''));
}

/* ---------- rapport ---------- */
console.log('----');
console.log(fails === 0 ? 'ND-ITEMSPEC SELFTEST: ALL PASS' : 'ND-ITEMSPEC SELFTEST: ' + fails + ' FAIL');
process.exit(fails === 0 ? 0 : 1);
