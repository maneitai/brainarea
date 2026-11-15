/**
 * Brainarea schema-selvtest — evne-itemspec (_evne_itemspec_spec.json).
 * [3-VEIS] FASE 2, todo #3736 "Itemspec evner: 5-6 temaer, vanskelighetsgrad-stige."
 * S1-S16: spec-intern konsistens + kontrakt mot ekte motor (scoring.js v1.0.0).
 * Kjoring: node _evne_itemspec_selftest.mjs [spec-path]
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS' : 'FAIL') + ' ' + m); if (!c) fails++; };

const specPath = process.argv[2] || new URL('./_evne_itemspec_spec.json', import.meta.url);
const spec = JSON.parse(readFileSync(specPath, 'utf8'));

const CANDIDATES = [
  '/mnt/f/maneit/prosjekter/filip-webside-prosjekter/brainarea',
  'F:/maneit/prosjekter/filip-webside-prosjekter/brainarea',
];
const found = CANDIDATES.filter(existsSync);
ok(found.length >= 1, 'S0 prod-tre funnet: ' + found.join(' | '));
const PROD = found[0];

const schema = JSON.parse(readFileSync(join(PROD, 'tests/schema/test-definition.schema.json'), 'utf8'));
delete schema.$schema;
const prodRequire = createRequire(join(PROD, 'tests/engine/scoring.js'));
const AjvCtor = prodRequire('ajv');
const validateSchemaV1 = AjvCtor ? (() => {
  const ajv = new AjvCtor({ strict: false, allErrors: true, validateSchema: false });
  return ajv.compile(schema);
})() : null;

/* ---------- S1: toppfelt ---------- */
const TOP = ['specVersion','id','type','status','statusMeaning','date','boardLeaf','formalStatus',
  'boardRefs','goal','planSources','themeCountDecision','themes','languagePlan','difficultyScale',
  'session','scoringContract','retestDesign','copyrightControl','engineGaps','batchMapping',
  'poolTotalPlan','defFilePlan','noteIds','normLinkage','selftestContract'];
for (const k of TOP) ok(spec[k] !== undefined, 'S1 toppfelt ' + k);

/* ---------- S2: tema-antall 5-6 ---------- */
const themes = spec.themes;
ok(themes.length >= 5 && themes.length <= 6, 'S2 tema-antall 5-6 (faktisk ' + themes.length + ')');

/* ---------- S3: trekksum + plan-sone ---------- */
const sum = (a) => a.reduce((x, y) => x + y, 0);
const draws = themes.map((t) => t.draw);
ok(sum(draws) === spec.session.taskCount, 'S3a trekksum ' + sum(draws) + ' = taskCount ' + spec.session.taskCount);
ok(spec.session.taskCount >= 36 && spec.session.taskCount <= 50, 'S3b taskCount i plan-sone 36-50: ' + spec.session.taskCount);

/* ---------- S4: pool >= 5x trekk per tema ---------- */
const ratios = themes.map((t) => t.poolMin / t.draw);
ok(ratios.every((r) => r >= 5), 'S4 pool >= 5x trekk: ' + ratios.map((r) => r.toFixed(2) + 'x').join(' '));

/* ---------- S5: optionsPerItem 2-8 ---------- */
ok(themes.every((t) => t.optionsPerItem >= 2 && t.optionsPerItem <= 8), 'S5 optionsPerItem 2-8 per tema');

/* ---------- S6: band-grenser kontinuerlige + innen [-4, 4] ---------- */
const bandParse = (s) => s.match(/-?[0-9.]+/g).map(Number);
const bL = bandParse(spec.difficultyScale.bands[0].bRange);
const bM = bandParse(spec.difficultyScale.bands[1].bRange);
const bH = bandParse(spec.difficultyScale.bands[2].bRange);
ok(bL[0] === -2.0 && bL[1] === -0.5 && bM[0] === -0.5 && bM[1] === 0.5 && bH[0] === 0.5 && bH[1] === 2.0,
  'S6 band-grenser [-2,-0.5> [-0.5,0.5> [0.5,2.0]');
ok(bL[0] >= -4 && bH[1] <= 4, 'S6b bands innen motor-vinduet [-4, 4]');

/* ---------- S7: kvote-tabeller ---------- */
const q = spec.difficultyScale.sessionQuotas;
for (const key of ['8-trekk', '7-trekk', '6-trekk']) {
  const e = q[key];
  const d = parseInt(key, 10);
  ok(e && (e.L + e.M + e.H === d), 'S7 kvote ' + key + ' summerer (' + (e ? (e.L + '+' + e.M + '+' + e.H) : 'mangler') + ')');
}

/* ---------- S8: poolandel-target sum 1.0 ---------- */
const pd = spec.difficultyScale.poolDistribution.targetShares;
ok(Math.abs(pd.L + pd.M + pd.H - 1.0) < 1e-9, 'S8 L+M+H = 1.0');

/* ---------- S9: batch-avstemming ---------- */
const poolMinSum = themes.reduce((s, t) => s + t.poolMin, 0);
ok(poolMinSum === 270, 'S9a poolMinSum 270 (faktisk ' + poolMinSum + ')');
ok(spec.poolTotalPlan.poolMinSum === poolMinSum, 'S9b poolTotalPlan samsvarer');
ok(spec.poolTotalPlan.batchOmfangTotal >= poolMinSum, 'S9c batch-omfang ' + spec.poolTotalPlan.batchOmfangTotal + ' >= poolMinSum');

/* ---------- S10: id-moenster ---------- */
const IDP = /^[a-z0-9]+(-[a-z0-9]+)*$/;
ok(new Set(themes.map((t) => t.idPrefix)).size === themes.length, 'S10a id-prefix unike');
ok(themes.every((t) => IDP.test(t.poolId) && IDP.test(t.idPrefix)), 'S10b poolId/idprefix matcher schema-moensteret');
ok(IDP.test(themes[0].idPrefix + '-0001'), 'S10c eksempel-id ' + themes[0].idPrefix + '-0001');

/* ---------- S11: spraakplan ---------- */
const themeDump = JSON.stringify(spec.themes);
ok(spec.languagePlan.languages.includes('no') && spec.languagePlan.languages.includes('en'), 'S11a NO+EN');
ok(themeDump.includes('SEPARAT per spr\u00e5k') || themeDump.includes('separat per spr\u00e5k'), 'S11b T3 separat per spraak');
ok(spec.languagePlan.future.includes('DE/FR/NL/PL'), 'S11c DE/FR/NL/PL strukturpreparert');

/* ---------- S12: copyright-forbud ---------- */
ok(spec.copyrightControl.forbidden.length >= 4, 'S12a >= 4 forbudspunkter');
ok(JSON.stringify(spec.copyrightControl).includes('#3749') && JSON.stringify(spec.copyrightControl).includes('#3751') && JSON.stringify(spec.copyrightControl).includes('#3753'), 'S12b hooks #3749/#3751/#3753');

/* ---------- S13: prod-filer ---------- */
for (const f of ['tests/engine/scoring.js', 'tests/engine/render.js', 'tests/schema/test-definition.schema.json', 'functions/normering.js']) {
  ok(existsSync(join(PROD, f)), 'S13 prodfil ' + f);
}

/* ---------- S14: normering + aarlighet ---------- */
const nl = spec.normLinkage;
ok(nl && nl.todo === '#3724' && String(nl.status).includes('bygget, ikke deployet') && nl.endpoint === 'functions/normering.js', 'S14a normLinkage #3724');
ok(spec.scoringContract.iqScale === null && spec.scoringContract.ci95 === true, 'S14b iqScale null + ci95 true');
ok(String(spec.scoringContract.iqScaleRule).includes('ALDRI IQ-tall uten normdata'), 'S14c ALDRI IQ-tall-tekst');
ok(JSON.stringify(spec.noteIds).includes('note.gscore.not-normed'), 'S14d noteIds');

/* ---------- S15: provkjoring mot EKTE scoring.js (data-URL import) ---------- */
const scoringSrc = readFileSync(join(PROD, 'tests/engine/scoring.js'), 'utf8');
ok(scoringSrc.includes('export function scoreTest') && scoringSrc.includes('export function estimateTheta1PL'), 'S15a scoring.js eksporterer scoreTest/estimateTheta1PL');
const engine = await import('data:text/javascript;base64,' + Buffer.from(scoringSrc).toString('base64'));

/* probe-def: 2 ability-items L (b=-1.2) + H (b=+1.2), AJV-validate, deretter 1 riktig / 1 feil */
const def = {
  schemaVersion: 1,
  id: 'evne-probe-2item',
  type: 'test-definition',
  family: 'evner',
  languages: ['no', 'en'],
  scoring: { type: 'g-score', metric: 'z100', ci95: true },
  dimensions: [{ id: 'g', label: 'g-score', labelLanguage: 'no', description: 'Generell evne (probe).' }],
  items: [
    {
      id: 'pr-0001', kind: 'ability', scales: [{ id: 'g', sign: 1 }],
      variants: [
        { lang: 'no', prompt: 'Hva er neste tall? 2, 4, 6, __', options: [{ label: '5' }, { label: '8' }, { label: '9' }], correctIndex: 1, difficulty: -1.2 },
        { lang: 'en', prompt: 'Next number? 2, 4, 6, __', options: [{ label: '5' }, { label: '8' }, { label: '9' }], correctIndex: 1, difficulty: -1.2 },
      ],
    },
    {
      id: 'pr-0002', kind: 'ability', scales: [{ id: 'g', sign: 1 }],
      variants: [
        { lang: 'no', prompt: 'Hva er neste tall? 1, 2, 4, 8, __', options: [{ label: '8' }, { label: '15' }, { label: '32' }], correctIndex: 2, difficulty: 1.2 },
        { lang: 'en', prompt: 'Next number? 1, 2, 4, 8, __', options: [{ label: '8' }, { label: '15' }, { label: '32' }], correctIndex: 2, difficulty: 1.2 },
      ],
    },
  ],
};
const aOk = validateSchemaV1(def);
ok(aOk, 'S15b probe-def AJV-valid' + (aOk ? '' : ': ' + JSON.stringify(validateSchemaV1.errors)));

const payload = { testId: def.id, lang: 'no', startedAt: 1, finishedAt: 2, itemIds: ['pr-0001', 'pr-0002'],
  answers: { 'pr-0001': { kind: 'ability', lang: 'no', abilityOriginalIndex: 1 }, 'pr-0002': { kind: 'ability', lang: 'no', abilityOriginalIndex: 0 } } };
const r = engine.scoreTest(def, payload);
ok(r.ok, 'S15c scoreTest ok: ' + r.errors.join('; '));
const tot = r.result.total;
ok(tot.type === 'g-score' && tot.correctCount === 1 && tot.answeredCount === 2, 'S15d totaltype/korrekt/answ: 1/2');
ok(tot.theta !== null && Math.abs(tot.theta) < 0.1, 'S15e theta ~0 (symmetrisk probe): ' + tot.theta);
ok(tot.thetaSe > 1.5 && tot.thetaSe < 2.0, 'S15f SE ~1.678: ' + tot.thetaSe);
ok(tot.ci95[0] < -3.2 && tot.ci95[1] > 3.2, 'S15g ci95 ~ +/-3.29 omslutter theta');
ok(tot.iqScale === null && tot.notNormed === true, 'S15h iqScale null + notNormed true');
ok(r.result.notes.some((n) => n.id === 'note.gscore.not-normed'), 'S15i note.gscore.not-normed til stede');

/* rawFallback: alle-riktig -> theta null + warning 'alle-riktig' */
const r2 = engine.scoreTest(def, { testId: def.id, lang: 'no', startedAt: 1, finishedAt: 2, itemIds: ['pr-0001', 'pr-0002'],
  answers: { 'pr-0001': { kind: 'ability', lang: 'no', abilityOriginalIndex: 1 }, 'pr-0002': { kind: 'ability', lang: 'no', abilityOriginalIndex: 2 } } });
ok(r2.ok && r2.result.total.theta === null, 'S15j alle-riktig -> theta null');
ok(r2.warnings.some((w) => w.includes('alle-riktig')), 'S15k warning alle-riktig til stede');

/* order-eksklusjon: order-item bidrar til skala g (raw), IKKE til theta */
const defO = JSON.parse(JSON.stringify(def));
defO.items.push({ id: 'od-0003', kind: 'order', lang: 'no', prompt: 'Sett i rekkefolge.', elements: ['a', 'b', 'c'], scales: [{ id: 'g', sign: 1 }] });
const r3 = engine.scoreTest(defO, { testId: defO.id, lang: 'no', startedAt: 1, finishedAt: 2, itemIds: ['pr-0001', 'pr-0002', 'od-0003'],
  answers: { 'pr-0001': { kind: 'ability', lang: 'no', abilityOriginalIndex: 1 }, 'pr-0002': { kind: 'ability', lang: 'no', abilityOriginalIndex: 0 },
             'od-0003': { kind: 'order', order: ['a', 'b', 'c'] } } });
ok(r3.ok && r3.result.scales.find((s) => s.id === 'g').raw === 4, 'S15l order-hits i skala g (raw 4)');
ok(r3.result.total.theta !== null && Math.abs(r3.result.total.theta) < 0.1, 'S15m theta ability-only ~0 med order-item til stede');

/* ---------- S16: order-eksklusjon dokumentert i spec ---------- */
const t5 = themes.find((t) => t.id === 'T5');
ok(t5 && t5.orderKindNote && t5.orderKindNote.includes('ekskludert fra v1') && t5.orderKindNote.includes('theta-bidrag'), 'S16 order-eksklusjon dokumentert i T5');

/* ---------- S0b: ajv-hentingsnotat (ajv kommer via prod-treet) ---------- */
console.log('  prod-tre: ' + PROD + ' | ajv via prodRequire: ' + (AjvCtor ? 'ok' : 'MANGLER'));

console.log(fails === 0 ? 'ALL PASS' : fails + ' FAILS');
process.exit(fails === 0 ? 0 : 1);
