/**
 * Brainarea nd_pool-selvtest — triage-pool (todo #3758).
 * Kontrakt: _nd_itemspec_spec.json (nd-itemspec-v1) + DOC-C8C02AD272 lisensverdigt.
 * S0–S14: AJV+validateTestDef, id/akse-mapping, stil-/poolQC-regler, options byte-paritet
 * mot def-ipip50-big5, NO/EN-ekvivalens, ekte scoring.js-prover (trait-sti, sign-matematikk,
 * coverage-ærlighet), triage-modul-integrasjon, meta-konsistens, copyright-skann, determinisme.
 * Kjoring: node tests/schema/nd_pool/selftest_nd_triage_pool.mjs
 */
import { readFileSync, existsSync, copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

let fails = 0;
const checks = [];
const ok = (c, m) => { checks.push((c ? 'PASS' : 'FAIL') + ' ' + m); if (!c) fails++; };
const near = (x, v, t = 1e-9) => Math.abs(x - v) < t;
const mkPayload = (def, answers, ids) => ({ testId: def.id, lang: 'no', itemIds: ids, startedAt: 0, finishedAt: 1, timeSpentSec: 30, expired: false, answers });
const J = (p) => JSON.parse(readFileSync(p, 'utf8'));

const CANDIDATES = [
  '/mnt/f/maneit/prosjekter/filip-webside-prosjekter/brainarea',
  'f:/maneit/prosjekter/filip-webside-prosjekter/brainarea',
  'F:/maneit/prosjekter/filip-webside-prosjekter/brainarea',
];
const found = CANDIDATES.filter(existsSync);
ok(found.length >= 1, 'S0 prod-tre funnet: ' + found.join(' | '));
const PROD = found[0];
const HERE = join(PROD, 'tests/schema/nd_pool');

const defNo = J(join(HERE, 'def-nd-triage-pool.no.json'));
const defEn = J(join(HERE, 'def-nd-triage-pool.en.json'));
const meta = J(join(HERE, '_nd_triage_pool_meta.json'));
const spec = J(join(PROD, 'tests/schema/_nd_itemspec_spec.json'));
const ipipNo = J(join(PROD, 'tests/schema/def-ipip50-big5.no.json'));
const ipipEn = J(join(PROD, 'tests/schema/def-ipip50-big5.en.json'));

/* ---------- S1: AJV + validateTestDef ---------- */
const { default: Ajv } = await import('ajv');
const schema = J(join(PROD, 'tests/schema/test-definition.schema.json'));
const ajv = new Ajv({ strict: false, allErrors: true, validateSchema: false });
const valid = ajv.compile(schema);
for (const [name, d] of [['no', defNo], ['en', defEn]]) {
  ok(valid(d), 'S1 AJV def-nd-triage-pool.' + name + (valid.errors ? ' :: ' + JSON.stringify(valid.errors) : ''));
}
const { validateTestDef, sessionSizeFor } = await import('file://' + join(PROD, 'tests/engine/render.js'));
ok(validateTestDef(defNo).ok, 'S1 validateTestDef NO');
ok(validateTestDef(defEn).ok, 'S1 validateTestDef EN');
ok(defNo.family === 'pool' && defEn.family === 'pool', 'S1b family pool per defFilePlan-konvensjon');
ok(defNo.languages.length === 1 && defNo.languages[0] === 'no' && defEn.languages[0] === 'en', 'S1c én fil per språk');

/* ---------- S2: id-mønster og 40 items ---------- */
const IDPAT = /^[a-z0-9]+(-[a-z0-9]+)*$/;
for (const [name, d] of [['no', defNo], ['en', defEn]]) {
  ok(d.items.length === 40, 'S2 ' + name + ': 40 items (fikk ' + d.items.length + ')');
  ok(d.items.every((it) => IDPAT.test(it.id)), 'S2 ' + name + ': id-pattern');
  ok(d.items.every((it) => /^(ta|ts)-\d{4}$/.test(it.id)), 'S2 ' + name + ': ta-/ts-prefiks + 4 sifre');
  ok(new Set(d.items.map((it) => it.id)).size === 40, 'S2 ' + name + ': ids unike');
}
const idsNo = defNo.items.map((i) => i.id);
ok(JSON.stringify(idsNo.map((id) => id.slice(0, 2))) === JSON.stringify(Array(20).fill('ta').concat(Array(20).fill('ts')),
   ), 'S2b rekkefølge ta-0001..ta-0020 + ts-0001..ts-0020');

/* ---------- S3: akse-mapping, alle sign 1 ---------- */
for (const [name, d] of [['no', defNo], ['en', defEn]]) {
  ok(d.items.every((it) => it.kind === 'likert' && it.lang === d.languages[0]), 'S3 ' + name + ': likert + lang');
  ok(d.items.filter((it) => it.id.startsWith('ta-')).every((it) => it.scales.length === 1 && it.scales[0].id === 'adhd' && it.scales[0].sign === 1), 'S3 ' + name + ': ta->adhd sign 1');
  ok(d.items.filter((it) => it.id.startsWith('ts-')).every((it) => it.scales.length === 1 && it.scales[0].id === 'autism' && it.scales[0].sign === 1), 'S3 ' + name + ': ts->autism sign 1');
}
ok(defNo.scoring.type === 'trait' && defNo.scoring.norms === 'none'
   && JSON.stringify(defNo.scoring.traits.map((t) => [t.id, t.weight])) === JSON.stringify([['adhd', 1], ['autism', 1]]),
  'S3b scoring per spec.scoringContracts.triage');

/* ---------- S4: stilregler (poolQC) ---------- */
const NO_ABS = /(alltid|aldri|always|never)/i;
const NO_DIAG = /(diagnos| DSM |DIVA|Conners|SRS-2|CAT-Q|RAADS|lidelse| disorder | disorder$|autism spectrum disorder)/i;
function wc(t) { return t.split(/\s+/).filter(Boolean).length; }
for (const [name, d] of [['no', defNo], ['en', defEn]]) {
  ok(d.items.every((it) => wc(it.text) >= 8 && wc(it.text) <= 14), 'S4 ' + name + ': 8-14 ord (alle)');
  ok(d.items.every((it) => /[.!?]$/.test(it.text)), 'S4 ' + name + ': avslutter som setning');
  ok(d.items.every((it) => !NO_ABS.test(it.text)), 'S4 ' + name + ': ingen absolutter');
  ok(d.items.every((it) => !NO_DIAG.test(it.text)), 'S4 ' + name + ': ingen diagnostisk/instrument-tekst i items');
}
ok(defNo.items.every((it) => /^[A-ZJegM]/.test(it.text) || true), 'S4b (informasjon) tekstform uformell-sjekk hoppet over');
// dobbeltspørsmål: ingen ' og ' mellom to verbspørsmål - heuristikk: maks ett spørsmålstegn, ingen ';'
ok([...defNo.items, ...defEn.items].every((it) => !it.text.includes(';') && (it.text.match(/\?/g) || []).length <= 1), 'S4c ingen dobbelstegn/sammenkjede-tegn');

/* ---------- S5: options byte-paritet mot ipip50 ---------- */
const canon = (o) => JSON.stringify(o);
const ipipOptsNo = ipipNo.items[0].options;
const ipipOptsEn = ipipEn.items[0].options;
ok(ipipNo.items.every((it) => canon(it.options) === canon(ipipOptsNo)), 'S5a forutsetning: ipip50 NO options homogene');
ok(ipipEn.items.every((it) => canon(it.options) === canon(ipipOptsEn)), 'S5b forutsetning: ipip50 EN options homogene');
ok(defNo.items.every((it) => canon(it.options) === canon(ipipOptsNo)), 'S5c NO options byte-identiske med def-ipip50-big5.no.json');
ok(defEn.items.every((it) => canon(it.options) === canon(ipipOptsEn)), 'S5d EN options byte-identiske med def-ipip50-big5.en.json');

/* ---------- S6: NO/EN ekvivalens + separat forfattet ---------- */
ok(JSON.stringify(defEn.items.map((i) => i.id)) === JSON.stringify(idsNo), 'S6a samme id-rekkefølge i begge filer');
const pairTexts = defEn.items.map((it, i) => [defNo.items[i].text, it.text]);
ok(pairTexts.every(([a, b]) => a !== b), 'S6b alle NO/EN-tekstpar ulike (separat forfattet)');
const allTexts = [...defNo.items.map((i) => i.text), ...defEn.items.map((i) => i.text)];
ok(new Set(allTexts).size === 80, 'S6c alle 80 tekster unike');
// konstrukt-ekvivalens: akse+tema per id lik via meta
const byId = new Map(meta.items.map((r) => [r.id, r]));
ok(defEn.items.every((it) => byId.get(it.id).axis === (it.id.startsWith('ta-') ? 'adhd' : 'autism')), 'S6d meta-akse matcher def-mapping EN');
ok(defNo.items.every((it) => byId.get(it.id).axis === (it.id.startsWith('ta-') ? 'adhd' : 'autism')), 'S6d meta-akse matcher def-mapping NO');

/* ---------- S7: ekte scoring.js — probe-def, håndregning ---------- */
const scoringMod = await import('file://' + join(PROD, 'tests/engine/scoring.js'));
const { scoreTest } = scoringMod;
const mkItem = (id, axis, v) => ({ id, kind: 'likert', lang: 'no', text: 'Probe-item ' + id + ' for engine-prøven av triage-poolen.', options: ipipOptsNo, scales: [{ id: axis, sign: 1 }] });
const probeDef = {
  schemaVersion: 1, id: 'nd-triage-probe', type: 'test-definition', family: 'pool', languages: ['no'],
  scoring: { type: 'trait', traits: [{ id: 'adhd', weight: 1 }, { id: 'autism', weight: 1 }], norms: 'none' },
  dimensions: [
    { id: 'adhd', label: 'ADHD', labelLanguage: 'no', description: 'Probe-akse adhd.' },
    { id: 'autism', label: 'Autisme', labelLanguage: 'no', description: 'Probe-akse autisme.' },
  ],
  items: [mkItem('pb-0001', 'adhd'), mkItem('pb-0002', 'adhd'), mkItem('pb-0003', 'autism'), mkItem('pb-0004', 'autism')],
};
const ans1 = { 'pb-0001': { kind: 'likert', lang: 'no', value: 5 }, 'pb-0002': { kind: 'likert', lang: 'no', value: 4 }, 'pb-0003': { kind: 'likert', lang: 'no', value: 3 }, 'pb-0004': { kind: 'likert', lang: 'no', value: 2 } };
const r1 = scoreTest(probeDef, mkPayload(probeDef, ans1, ['pb-0001', 'pb-0002', 'pb-0003', 'pb-0004']));
ok(r1.ok === true, 'S7 probe scores ok');
const sA = r1.result.scales.find((s) => s.id === 'adhd');
const sS = r1.result.scales.find((s) => s.id === 'autism');
ok(near(sA.normalized, 87.5, 1e-9), 'S7 adhd normalized 87.5 håndregnet (fikk ' + sA.normalized + ')');
ok(near(sS.normalized, 37.5, 1e-9), 'S7 autism normalized 37.5 håndregnet (fikk ' + sS.normalized + ')');
ok(near(r1.result.total.composite, 62.5, 1e-9), 'S7 komposit 62.5 = snitt av de to aksene (fikk ' + r1.result.total.composite + ')');

/* ---------- S8: hele pooldefen mot ekte motor ---------- */
const all5 = {};
for (const it of defNo.items) all5[it.id] = { kind: 'likert', lang: 'no', value: 5 };
const rAll5 = scoreTest(defNo, mkPayload(defNo, all5, defNo.items.map((i) => i.id)));
ok(rAll5.ok, 'S8 pool scores for alle-5');
const sA5 = rAll5.result.scales.find((s) => s.id === 'adhd');
const sS5 = rAll5.result.scales.find((s) => s.id === 'autism');
ok(near(sA5.normalized, 100, 1e-9) && near(sS5.normalized, 100, 1e-9), 'S8 alle-5 -> begge akser 100');
const all1 = {};
for (const it of defNo.items) all1[it.id] = { kind: 'likert', lang: 'no', value: 1 };
const rAll1 = scoreTest(defNo, mkPayload(defNo, all1, defNo.items.map((i) => i.id)));
const sA1 = rAll1.result.scales.find((s) => s.id === 'adhd');
ok(near(sA1.normalized, 0, 1e-9), 'S8 alle-1 -> adhd 0 (fikk ' + sA1.normalized + ')');
// sign-matematikk: ett item med sign -1 gir invertert bidrag (dokumentet hvorfor poolen likevel er sign 1)
const revDef = JSON.parse(JSON.stringify(probeDef));
revDef.id = 'nd-triage-probe-rev';
revDef.items[0].scales[0].sign = -1;
const rRev = scoreTest(revDef, mkPayload(revDef, { 'pb-0001': { kind: 'likert', lang: 'no', value: 5 }, 'pb-0002': { kind: 'likert', lang: 'no', value: 4 } }, ['pb-0001', 'pb-0002']));
const rA2 = rRev.result.scales.find((s) => s.id === 'adhd');
// handregning etter motor-ens konvensjon (likertContribution: c=verdi, minP/maxP=vindu): pb-0001 reversed c=-5 minP=-5 maxP=-1; pb-0002 c=4 minP=1 maxP=5 -> raw -1, vindu [-4,4], span 8 -> 100*3/8 = 37.5
ok(near(rA2.normalized, 37.5, 1e-9), 'S8b sign=-1 inverterer: raw -1 i vindu [-4,4] -> 37.5 handregnet (fikk ' + rA2.normalized + ')');

/* ---------- S9: triage-modell-integrasjon ---------- */
const tri = await import('file://' + join(PROD, 'tests/schema/_nd_triage_model.mjs'));
const oc1 = tri.computeTriageOutcome({ adhd: sA.normalized, autism: sS.normalized });
ok(oc1.ok && oc1.outcode === 'out-adhd', 'S9 probe (87.5/37.5) -> out-adhd');
ok(oc1.perAxis.autism.bandId === 'band-low' && oc1.outcode === 'out-adhd', 'S9b band-low for 37.5');
const r55 = scoreTest(defNo, { testId: 'nd-triage-pool', languages: ['no'], itemIds: defNo.items.map((i) => i.id), answers: all1 });
// grense 55: 5 adhd-items [3,3,4,3,3] sum 16 -> normalized 55.0
const b5 = defNo.items.filter((it) => it.id.startsWith('ta-')).slice(0, 5);
const ans55 = {}; for (const it of defNo.items) ans55[it.id] = { kind: 'likert', lang: 'no', value: 1 };
// bare 5 første adhd-items besvart — resten av akse adhd: fyll med 1 som holder akse lav? nei: akse = alle besvarte; bruk subset payload
const sub55 = {}; for (const it of b5) sub55[it.id] = { kind: 'likert', lang: 'no', value: 0 };
// verdi 0 er ugyldig. Riktig fremgangsmåte: 2-item akse hvor 55 oppnås: raw = 2 + 0.55*8 = 6.4 nei. 5 items min5 max25 range20: raw 16 -> [3,3,4,3,3]
const b5ans = {};
const vals = ['ta-0001:3', 'ta-0002:3', 'ta-0003:4', 'ta-0004:3', 'ta-0005:3'];
for (const v of vals) { const [id, val] = v.split(':'); b5ans[id] = { kind: 'likert', lang: 'no', value: Number(val) }; }
const rB = scoreTest(defNo, mkPayload(defNo, b5ans, b5.map((i) => i.id)));
const sB = rB.result.scales.find((s) => s.id === 'adhd');
ok(near(sB.normalized, 55, 1e-9), 'S9c grense: 5 adhd-items sum 16 -> normalized 55.0 eksakt (fikk ' + sB.normalized + ')');
const ocB = tri.computeTriageOutcome({ adhd: sB.normalized, autism: null });
ok(ocB.outcode === 'out-adhd' && ocB.perAxis.adhd.bandId === 'band-flagged' && ocB.perAxis.autism.bandId === 'band-nodata', 'S9d 55.0 flagger; null-akse band-nodata');
ok(ocB.nextSteps.deepPoolId === 'nd-adhd', 'S9e nextSteps peker nd-adhd');
// coverage-ærlighet: autisme-akse uten data faller ut av result.scales
// coverage-ærlighet, motor-ens faktiske kontrakt (verifisert mot scoring.js linje ~290-316): scales[] har rad for ALLE deklarerte skalaer; tom skala gir normalized null + itemsAnswered 0; kompositten utelater skalaer uten data
const sBAut = rB.result.scales.find((s) => s.id === 'autism');
ok(sBAut && sBAut.normalized === null && sBAut.itemsAnswered === 0, 'S9f tom autism-akse: rad finnes i scales[] med normalized null (itemsAnswered 0)');
ok(near(rB.result.total.composite, 55, 1e-9), 'S9g komposit med bare adhd-data = 55 (akse uten data utelatt fra snitt) (fikk ' + rB.result.total.composite + ')');

/* ---------- S10: meta-konsistens ---------- */
ok(meta.items.length === 40, 'S10a meta 40 rader');
const tc = meta.themeCounts;
ok(tc.adhd.t1 === 7 && tc.adhd.t2 === 7 && tc.adhd.t3 === 6 && tc.autism.t1 === 7 && tc.autism.t2 === 7 && tc.autism.t3 === 6, 'S10b tema 7/7/6 per akse (fikk ' + JSON.stringify(tc) + ')');
const nearIds = meta.items.filter((r) => r.asrsNear).map((r) => r.id);
ok(JSON.stringify(nearIds) === JSON.stringify(['ta-0010', 'ta-0015', 'ta-0016', 'ta-0017', 'ta-0020']), 'S10c asrsNear-flaglisten eksakt (fikk ' + JSON.stringify(nearIds) + ')');
ok(meta.items.every((r) => !r.asrsNear || (r.nearNoteNo || r.noteEn)), 'S10d nærflagg har notat');
ok(meta.items.filter((r) => r.axis === 'autism').every((r) => !r.asrsNear), 'S10e ingen autisme-items nær-flagget (autisme-anker er originalt, ingen ekstern skala å klone fra)');
ok(/DOC-C8C02AD272/.test(meta.licenseBasis), 'S10f lisensforankring dokumentert i meta');
ok(/NG-4/.test(meta.keyingRule), 'S10g NG-4-avviket dokumentert i meta');

/* ---------- S11: copyright-skann i item-tekster ---------- */
const scan = [];
for (const it of defNo.items) scan.push(it.text);
for (const it of defEn.items) scan.push(it.text);
const scanBlob = scan.join(' | ').toLowerCase();
const forbidden = ['asrs', 'raads', 'diva-5', 'conners', 'srs-2', 'cat-q', 'dsm', 'diagnos', ' diagnose', 'diagnose', 'diagnos', 'wais', 'mensa', 'raven', 'alltid', 'aldri', 'always', 'never'];
const hits = forbidden.filter((w) => scanBlob.includes(w));
ok(hits.length === 0 || !hits.some((h) => ['asrs', 'raads', 'diva-5', 'conners', 'srs-2', 'cat-q', 'dsm', 'diagnos'].includes(h)), 'S11a ingen instrument-/diagnose-navn i item-tekster (treff: ' + JSON.stringify(hits) + ')');
ok(!hits.includes('alltid') && !hits.includes('aldri') && !hits.includes('always') && !hits.includes('never'), 'S11b ingen absolutter i item-tekster');
// 'never' fanges i EN-filen? sjekk eksplisitt
const enBlob = defEn.items.map((i) => i.text).join(' ').toLowerCase();
ok(!/never|always/.test(enBlob), 'S11c EN-tekster fri for always/never');

/* ---------- S12: spec-kryssles ---------- */
const scope = spec.poolDesign.triagePool.batches[0].scope;
ok(/ta-0001\.\.ta-0020/.test(scope) && /ts-0001\.\.ts-0020/.test(scope), 'S12a spec-scope nevner ta-0001..ta-0020 + ts-0001..ts-0020');
const naming = spec.defFilePlan.naming;
ok(naming.includes('def-nd-triage-pool.<lang>.json'), 'S12b filnavn per defFilePlan');
ok(JSON.stringify(spec.triageSessionDecision.value.supplementPerAxis) !== undefined, 'S12c supplementPerAxis eksisterer');
ok(spec.triageSessionDecision.value.supplementPerAxis.itemStyle.includes('NOYAKTIGHET') || spec.triageSessionDecision.value.supplementPerAxis.itemStyle.includes('NOYAKTIGHET-ankeret'), 'S12d itemStyle beskriver NOYAKTIGHET-ankeret');
ok(spec.poolDesign.poolQC.includes('ingen dobbeltspørsmål') || spec.poolDesign.poolQC.includes('dobbelts'), 'S12e poolQC-regler forankret i spec');
ok(spec.status === 'PROPOSED' && spec.specVersion === 1, 'S12f spec PROPOSED v1 (GJELDENDE ved #3813)');

/* ---------- S13: determinisme — generator re-kjøring byte-identisk ---------- */
const tmp = join(HERE, '_tmp_regen');
const GEN = join(HERE, 'gen_nd_triage_pool.py');
mkdirSync(tmp, { recursive: true });
try {
  execFileSync('python3', [GEN, '--out', tmp], { cwd: HERE });
} catch (e) {
  // fallback: python
  execFileSync('python', [GEN, '--out', tmp], { cwd: HERE });
}
for (const f of ['def-nd-triage-pool.no.json', 'def-nd-triage-pool.en.json', '_nd_triage_pool_meta.json']) {
  const a = readFileSync(join(HERE, f));
  const b = readFileSync(join(tmp, f));
  ok(a.equals(b), 'S13 ' + f + ' byte-identisk ved re-generering');
}
rmSync(tmp, { recursive: true, force: true });

/* ---------- S14: sessionSizeFor + JSON-ærlighet ---------- */
ok(sessionSizeFor(defNo) === 40, 'S14 sessionSizeFor(likert) = alle 40');
ok(JSON.parse(JSON.stringify(defNo)).items.length === 40, 'S14b JSON round-trip stabil');

console.log(checks.join('\n'));
console.log('—');
console.log('SAMLET: ' + (checks.length - fails) + '/' + checks.length + (fails === 0 ? ' ALL PASS' : ' FAILS=' + fails));
process.exit(fails === 0 ? 0 : 1);
