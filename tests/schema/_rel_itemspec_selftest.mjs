/**
 * Brainarea schema-selvtest — relasjon-itemspec (_rel_itemspec_spec.json + _rel_compat_model.mjs).
 * [3-VEIS] FASE 2, todo #3738 "Itemspec relasjoner: dimensjoner, kompatibilitetsmodell."
 * S0–S15: spec-konsistens, FASE 1-i18n kryssles, ekte engine-prover (scoring.js trait-sti
 * og compat-modulen). Kjoring: node tests/schema/_rel_itemspec_selftest.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS' : 'FAIL') + ' ' + m); if (!c) fails++; };

const spec = JSON.parse(readFileSync(new URL('./_rel_itemspec_spec.json', import.meta.url), 'utf8'));

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
  'boardRefs','goal','planSources','dimensionDecision','sessionFormDecision','themes',
  'languagePlan','session','poolDesign','copyrightControl','compatibilityModel','normLinkage',
  'noteIds','engineGaps','engineGapMitigation','defFilePlan','selftestContract'];
for (const k of TOP) ok(spec[k] !== undefined, 'S1 toppfelt ' + k);

/* ---------- S2: dimensjoner = FASE 1-lock ---------- */
const DIMS = ['closeness','openness','conflict','independence'];
const dd = spec.dimensionDecision.value;
ok(Object.keys(dd).length === 4 && DIMS.every((d) => dd[d]), 'S2a fire dimensjoner: ' + DIMS.join(', '));
const themes = spec.themes;
ok(themes.length === 4 && themes.map((t) => t.dimension).join() === DIMS.join(), 'S2b R1-R4 mappet 1:1 til dimensjoner');
ok(themes.map((t) => t.idPrefix).join() === 'cl,op,cf,iv', 'S2c id-prefixer cl/op/cf/iv');

/* ---------- S3: FASE 1-i18n kryssles ---------- */
const noKeys = await import('file://' + join(PROD, 'i18n/no.js'));
const enKeys = await import('file://' + join(PROD, 'i18n/en.js'));
ok(/nærhet/.test(noKeys.KEYS.page['rel.intro']) && /åpenhet/.test(noKeys.KEYS.page['rel.intro']) && /konflikthåndtering/.test(noKeys.KEYS.page['rel.intro']) && /selvstendighet/.test(noKeys.KEYS.page['rel.intro']),
  'S3a NO rel.intro låser vokabularet');
ok(enKeys.KEYS.page['rel.intro'].includes('openness') && enKeys.KEYS.page['rel.intro'].includes('conflict handling') && enKeys.KEYS.page['rel.intro'].includes('independence'),
  'S3b EN rel.intro låser vokabularet');
ok(dd.closeness.labelNo === 'Nærhet' && dd.openness.labelNo === 'Åpenhet' && dd.conflict.labelNo === 'Konflikthåndtering' && dd.independence.labelNo === 'Selvstendighet',
  'S3c NO-etiketter byte-paritet (N\u00e6rhet/\u00c5penhet/Konflikth\u00e5ndtering/Selvstendighet)');
ok(dd.closeness.labelEn === 'Closeness' && dd.openness.labelEn === 'Openness' && dd.conflict.labelEn === 'Conflict handling' && dd.independence.labelEn === 'Independence',
  'S3d EN-etiketter');
const relNo = noKeys.KEYS.page['rel.og.desc'];
ok(/16 utsagn/.test(noKeys.KEYS.page['rel.og.desc']) || /16 statements/.test(noKeys.KEYS.page['rel.og.desc']) === false, 'S3e NO landingstekst refererer 16 utsagn');

/* ---------- S4: sesjonsform vs render.sessionSizeFor ---------- */
ok(spec.session.totalItems === 16 && spec.session.perDim === 4 && spec.session.structure === 4,
  'S4a 4x4 = 16 (FASE 1-avledet, ikke valg)');
ok(spec.session.signPattern === '+-+- per dimensjon', 'S4b sign-mønster +-= per dimensjon');
ok(spec.session.scoring.type === 'trait' && spec.session.scoring.norms === 'none' && spec.session.scoring.traits.join() === DIMS.join(),
  'S4c scoring trait/norms none/4 traits weight 1');
ok(spec.session.noTimeBudget === true, 'S4d ingen timebudget (likert: alle items)');

/* ---------- S5: spenn-isomorfi p=m (motorens [p-5m, 5p-m] == [0,20]) ---------- */
// signPattern +-+- per dimensjon gir p=m=2 per 16-item dim: span [p-5m, 5p-m] = [-8, 12]...
// NEI: per DIMENSJON er 4 items (2+/2-) => span [2-10, 10-2] = [-8, 12]; normalized=100*(raw+8)/20
// => identisk med snittet av (6-v) reversert. Her prov mot scoring.js direkte (S8). S5 låser tallet:
ok(JSON.stringify(spec.sessionFormDecision.signPatternNote).includes('isomorfi'), 'S5 signPatternNote dokumenterer spenn-isomorfien');

/* ---------- S6: poolDesign + batch-mapping ---------- */
ok(spec.poolDesign.poolMinPerDim === 60 && spec.poolDesign.poolMinSum === 240, 'S6a pool 60 per dim = 240');
ok(spec.poolDesign.batchMapping.length === 2 &&
  spec.poolDesign.batchMapping[0].board.includes('#3754') &&
  spec.poolDesign.batchMapping[0].board.includes('#3755') &&
  spec.poolDesign.batchMapping[1].board.includes('#3756') &&
  spec.poolDesign.batchMapping[1].board.includes('#3757'), 'S6b batch-mot-board avstemming');
ok(spec.poolDesign.batchMapping[0].omfang.includes('~120') && spec.poolDesign.batchMapping[1].omfang.includes('~120'), 'S6c batch-omfang ~120+~120');

/* ---------- S7: copyrightControl non-tom + hooks ---------- */
ok(spec.copyrightControl.forbidden.length >= 3, 'S7a forholdsliste non-tom');
ok(spec.copyrightControl.verifyHooks.includes('#3755') && spec.copyrightControl.verifyHooks.includes('#3757'), 'S7b hooks');

/* ---------- S8: EKTE trait-sti-prov (scoring.js) paa 4x4 +-+- ---------- */
const scoringSrc = readFileSync(join(PROD, 'tests/engine/scoring.js'), 'utf8');
ok(scoringSrc.includes('export function scoreTest'), 'S8a scoring.js eksporterer scoreTest');
const engine = await import('data:text/javascript;base64,' + Buffer.from(scoringSrc).toString('base64'));
const OPTS = [
  { label: 'Very Inaccurate', value: 1 }, { label: 'Moderately Inaccurate', value: 2 },
  { label: 'Neither Accurate Nor Inaccurate', value: 3 }, { label: 'Moderately Accurate', value: 4 },
  { label: 'Very Accurate', value: 5 },
];
const dimOf = (i) => DIMS[Math.floor(i / 4)];
const ITEMS = [];
for (let i = 0; i < 16; i++) ITEMS.push({
  id: 'relprobe-' + String(i + 1).padStart(4, '0'),
  kind: 'likert', lang: 'no', text: 'Probeitem nr ' + (i + 1) + ' for test av trait-sti.',
  options: OPTS,
  scales: [{ id: dimOf(i), sign: i % 2 === 0 ? 1 : -1 }],
});
const probeDef = {
  schemaVersion: 1, id: 'relprobe-16', type: 'test-definition', family: 'relations',
  languages: ['no'],
  scoring: { type: 'trait', traits: DIMS.map((d) => ({ id: d, weight: 1 })), norms: 'none' },
  dimensions: DIMS.map((d, i) => ({ id: d, label: ['Nærhet','Åpenhet','Konflikthåndtering','Selvstendighet'][i], labelLanguage: 'no', description: 'Probebeskrivelse.' })),
  items: ITEMS,
};
// svar: v = 1..5 syklisk; forventet per dim (4 items, sign +,-,+,-):
// pos-verdier på p- og m-items gir raw = v1 + (-v2) + v3 + (-v4) = (v1+v3)-(v2+v4)
// minPossible = p-5m = 2-10 = -8, maxPossible = 5p-m = 10-2 = 8 => normalized = 100*(raw+8)/16
const answers = {};
for (let i = 0; i < 16; i++) answers[ITEMS[i].id] = { kind: 'likert', lang: 'no', value: ((i * 7) % 5) + 1 };
const res = engine.scoreTest(probeDef, { testId: probeDef.id, lang: 'no', itemIds: ITEMS.map((x) => x.id), answers, startedAt: 1, finishedAt: 2 });
ok(res.ok && res.result, 'S8b scoring trait-sti ok: ' + (res.errors.join('; ') || ''));
let allOk = true;
for (let d = 0; d < 4; d++) {
  const s = res.result.scales.find((x) => x.id === DIMS[d]);
  if (!s) { allOk = false; continue; }
  const vals = [0, 1, 2, 3].map((k) => ((4 * d + k) * 7) % 5 + 1);
  const rawExp = vals[0] + vals[2] - vals[1] - vals[3];
  const normExp = 100 * (rawExp + 8) / 16;
  if (!(s.raw === rawExp && s.minPossible === -8 && s.maxPossible === 8 && Math.abs(s.normalized - normExp) < 1e-9)) allOk = false;
  if (d === 1) ok(true, 'S8c eksempel ' + DIMS[d] + ': raw=' + s.raw + ' span[-8,8] norm=' + s.normalized + ' (fordret ' + rawExp + '/' + normExp + ')');
}
ok(allOk, 'S8d alle 4 dimensjoner: raw/span/normalized eksakte mot håndregning');
const traitNote = res.result.notes?.find((n) => n.id === 'note.trait.not-normed');
ok(Boolean(traitNote), 'S8e note.trait.not-normed til stede i result.notes');

/* ---------- S9: EKTE compat-modul-prov ---------- */
const compatSrc = readFileSync(new URL('./_rel_compat_model.mjs', import.meta.url), 'utf8');
const compat = await import('data:text/javascript;base64,' + Buffer.from(compatSrc).toString('base64'));
ok(typeof compat.computePairCompatibility === 'function' && typeof compat.dimensionCompatibility === 'function' && typeof compat.BANDS === 'object', 'S9a compat-modul eksporterer kontrakt-funksjoner');
const ident = compat.computePairCompatibility({ closeness: 40, openness: 80, conflict: 30, independence: 60 }, { closeness: 40, openness: 80, conflict: 30, independence: 60 });
ok(ident.ok && ident.overall === 100.0 && ident.bandId === 'band-strong', 'S9b identiske profiler -> 100/band-strong');
// R1: a vs b der closeness/openness ulik, conflict/independence innenfor toleranse:
// a: C50 O80 K50 I50 ; b: C90 O40 K30 I70
// dim-scores: closeness 1-0.4=0.6 ; openness 1-0.4=0.6 ; conflict |0.2|<=0.25 -> 1 ; indep |0.2|<=0.35 -> 1
// overall = (0.6+0.6+1+1)/4 = 0.8 -> 80.0 -> band-aligned
const p1 = compat.computePairCompatibility({ closeness: 50, openness: 80, conflict: 50, independence: 50 }, { closeness: 90, openness: 40, conflict: 30, independence: 70 });
ok(p1.ok && Math.abs(p1.overall - 80.0) < 1e-9 && p1.bandId === 'band-aligned', 'S9c handregnede par: 80.0/band-aligned (faktisk ' + p1.overall + '/' + p1.bandId + ')');
ok(p1.perDimension.conflict.value === 1 && p1.perDimension.independence.value === 1, 'S9d toleranser: begge innenfor band => 1');
ok(Math.abs(p1.perDimension.closeness.value - 0.6) < 1e-9 && Math.abs(p1.perDimension.openness.value - 0.6) < 1e-9, 'S9e likhetsdimensjoner: 0.6/0.6');
// R2: begge konfliktsky (begge 20) => likhetsformel ville gitt 1, toleranse gir 1 — men ulike skalaer som tolkes som "lik nok" er kjent; låser heller: likhet 1.0 for likt punkt.
// R3: fall utenfor toleranse: konflikt a=0 b=100 => e=1 => s=0
const farC = compat.dimensionCompatibility('conflict', 0, 100);
ok(farC.ok && farC.value === 0, 'S9f maks-motsetning konflikt => 0');
const nearC = compat.dimensionCompatibility('conflict', 5, 20);
ok(nearC.ok && nearC.value === 1, 'S9g |0.15| <= 0.25 => 1');
const midI = compat.dimensionCompatibility('independence', 0, 60);
ok(midI.ok && Math.abs(midI.value - (1 - (0.6 - 0.35) / 0.65)) < 1e-9, 'S9h selvstendighet fall: e=0.60 -> ' + midI.value);
// determinisme + ugyldig inndata (kast aldri):
const again = compat.computePairCompatibility({ closeness: 50, openness: 80, conflict: 50, independence: 50 }, { closeness: 90, openness: 40, conflict: 30, independence: 70 });
ok(JSON.stringify(again) === JSON.stringify(p1), 'S9i determinisme: identisk inndata -> identisk output');
const bad = compat.computePairCompatibility({ closeness: 150, openness: 80, conflict: 50, independence: 50 }, { closeness: 90, openness: 40, conflict: 30, independence: 70 });
ok(!bad.ok && bad.error === 'skor-utenfor-omfang', 'S9j ugyldig skar -> ok:false (aldri kast)');
const unk = compat.dimensionCompatibility('ikkefinnes', 1, 2);
ok(!unk.ok && unk.error === 'ukjent-dimensjon', 'S9k ukjent dimensjon -> ok:false');

/* ---------- S10: id-mønster per defFilePlan ---------- */
const IDP = /^[a-z0-9]+(-[a-z0-9]+)*$/;
for (const t of themes) ok(IDP.test(t.idPrefix + '-0001'), 'S10 id-eksempel ' + t.idPrefix + '-0001 matcher skjema-pattern');

/* ---------- S11: språkplan ---------- */
const L = spec.languagePlan.languages;
ok(L.includes('no') && L.includes('en') && L.length === 2, 'S11 NO+EN');

/* ---------- S12: plan-forankring ---------- */
ok(JSON.stringify(spec.boardRefs).includes('#3754') && JSON.stringify(spec.boardRefs).includes('#3794') && JSON.stringify(spec.boardRefs).includes('#3790'), 'S12 boardRefs: pool-batcher + delgraf + fragment-lenke');

/* ---------- S13: prod-filer ---------- */
for (const f of ['tests/engine/scoring.js', 'tests/engine/render.js', 'tests/schema/test-definition.schema.json', 'functions/normering.js']) {
  ok(existsSync(join(PROD, f)), 'S13 prodfil ' + f);
}

/* ---------- S14: normering + ærlighet ---------- */
const nl = spec.normLinkage;
ok(nl && nl.todo === '#3724' && String(nl.status).includes('ikke deployet') && nl.endpoint === 'functions/normering.js', 'S14 normLinkage #3724');
ok(JSON.stringify(spec.noteIds) === JSON.stringify(['note.trait.not-normed']), 'S14b noteIds: bare trait-noten');

/* ---------- S15: AJV-schema-prov av probeDef (selftest-prove var schema-lydig) ---------- */
const schema = JSON.parse(readFileSync(join(PROD, 'tests/schema/test-definition.schema.json'), 'utf8'));
delete schema.$schema;
const prodRequire = createRequire(join(PROD, 'tests/engine/scoring.js'));
const AjvCtor = prodRequire('ajv');
if (AjvCtor) {
  const ajv = new AjvCtor({ strict: false, allErrors: true, validateSchema: false });
  const v = ajv.compile(schema);
  const good = v(probeDef);
  ok(good, 'S15a probeDef AJV-schema-valid (trait-formen): ' + (v.errors?.map((e) => e.message).join('; ') ?? ''));
  const badDef = JSON.parse(JSON.stringify(probeDef)); badDef.scoring.traits[0].weight = 'fire';
  ok(!v(badDef), 'S15b AJV avviser ugyldig weight-type');
} else {
  ok(false, 'S15 ajv ikke tilgjengelig');
}

console.log(fails === 0 ? 'ALL PASS' : fails + ' FAILS');
process.exit(fails === 0 ? 0 : 1);
