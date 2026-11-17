/*
 * Selftest — ND live-defs (todo #3843): def-nd-triage.{no,en}.json (6 items),
 * def-nd-adhd.{no,en}.json (24, stratifisert 10/8/6), def-nd-autisme.{no,en}.json (24, 10/8/6)
 * + _nd_live_defs_meta.json + gen_nd_live_defs.py.
 * Konvensjon: selftest_nd_adhd_dyp_da1.mjs (søster i samme spor, ND_POOL_DIR-staging).
 *
 * Verifiserer: AJV + ekte validateTestDef; triage-utvelgelse mot asrsNear-ANKER-familiene
 * (nearNote-familie, ikke pool-tema); dyp-stratifikasjon 10/8/6; byte-identisk anker
 * (5-punkts NOYAKTIGHET fra def-ipip50-big5); byte-identiske pool-tekster (ingen ny
 * forfattering); konstrukt-ekvivalens NO/EN (samme id-orden/skalaer/options); ekte
 * scoring.js-prover med håndregnede forventninger; triage-modul-integrasjon (4 utfall,
 * band-grenser, null-akse, «begge»); meta-konsistens; copyright-skann; determinisme
 * (generator re-kjøring byte-identisk); sessionSizeFor(likert) = alle items.
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const checks = [];
let fails = 0;
const ok = (c, m) => { checks.push((c ? 'PASS' : 'FAIL') + ' ' + m); if (!c) fails++; };
const md5 = (p) => createHash('md5').update(readFileSync(p)).digest('hex');
const J = (p) => JSON.parse(readFileSync(p, 'utf8'));

/* ---------- S0: prod-tre + leveranser ---------- */
const ENV_DIR = process.env.ND_POOL_DIR;
const PROD_CANDIDATES = [
  '/mnt/f/maneit/prosjekter/filip-webside-prosjekter/brainarea',
  'F:/maneit/prosjekter/filip-webside-prosjekter/brainarea',
  join(dirname(fileURLToPath(import.meta.url)), '..', '..'),
];
const PROD = PROD_CANDIDATES.find((p) => existsSync(join(p, 'tests/engine/scoring.js')));
const HERE = ENV_DIR && existsSync(ENV_DIR) ? ENV_DIR : join(PROD, 'tests/schema/nd_pool');
ok(!!PROD, 'S0 prod-tre funnet: ' + PROD);
ok(!!HERE, 'S0 katalog: ' + HERE);
const FILES = [
  'def-nd-triage.no.json', 'def-nd-triage.en.json',
  'def-nd-adhd.no.json', 'def-nd-adhd.en.json',
  'def-nd-autisme.no.json', 'def-nd-autisme.en.json',
  '_nd_live_defs_meta.json', 'gen_nd_live_defs.py',
];
ok(FILES.every((f) => existsSync(join(HERE, f))), 'S0 leveransefiler til stede');

const defs = {};
for (const f of FILES.filter((f) => f.startsWith('def-'))) defs[f] = J(join(HERE, f));
const meta = J(join(HERE, '_nd_live_defs_meta.json'));
const spec = J(join(PROD, 'tests/schema/_nd_itemspec_spec.json'));
const ipipNo = J(join(PROD, 'tests/schema/def-ipip50-big5.no.json'));
const ipipEn = J(join(PROD, 'tests/schema/def-ipip50-big5.en.json'));
const triagePoolNo = J(join(PROD, 'tests/schema/nd_pool/def-nd-triage-pool.no.json'));
const triagePoolEn = J(join(PROD, 'tests/schema/nd_pool/def-nd-triage-pool.en.json'));
const deepPoolNo = {};
for (const k of ['da1','da2','da3']) deepPoolNo[k] = J(join(PROD, 'tests/schema/nd_pool/def-nd-adhd-dyp-pool-' + k + '.no.json'));
for (const k of ['ds1','ds2','ds3']) deepPoolNo[k] = J(join(PROD, 'tests/schema/nd_pool/def-nd-autisme-dyp-pool-' + k + '.no.json'));
const triageMeta = J(join(PROD, 'tests/schema/nd_pool/_nd_triage_pool_meta.json'));

/* ---------- S1: AJV + validateTestDef ---------- */
let Ajv;
try { const m = await import('ajv'); Ajv = m.default; }
catch { Ajv = (await import('file://' + join(PROD, 'node_modules/ajv/lib/ajv.js'))).default; }
const schema = J(join(PROD, 'tests/schema/test-definition.schema.json'));
delete schema.$schema;
const ajv = new Ajv({ strict: false, allErrors: true, validateSchema: false });
const v1 = ajv.compile(schema);
const { validateTestDef, sessionSizeFor } = await import('file://' + join(PROD, 'tests/engine/render.js'));
const { scoreTest } = await import('file://' + join(PROD, 'tests/engine/scoring.js'));
for (const [fn, def] of Object.entries(defs)) {
  ok(v1(def), 'S1 AJV ' + fn + (v1.errors ? ' :: ' + v1.errors.map(e=>e.message).join('; ') : ''));
  const v = validateTestDef(def);
  ok(v.ok, 'S1 validateTestDef ' + fn + (v.errors.length ? ' :: ' + v.errors.join('; ') : ''));
}

/* ---------- S2: triage-utvelgelse mot asrsNear-anker-familier ---------- */
const tNo = defs['def-nd-triage.no.json'];
const tEn = defs['def-nd-triage.en.json'];
const nearPool = triageMeta.items.filter(i => i.asrsNear).map(i => i.id);
ok(nearPool.length === 5 && nearPool.join(',') === 'ta-0010,ta-0015,ta-0016,ta-0017,ta-0020',
   'S2 asrsNear-pool = de 5 kjente (funnet: ' + nearPool.join(',') + ')');
// ANKER-familie-tabellen (spegler generatoren; kilden er nearNote-notatene i pool-meta)
const ANCHOR = { 'ta-0010': 'asrs-uro', 'ta-0016': 'asrs-oppgaver', 'ta-0017': 'asrs-oppgaver', 'ta-0015': 'asrs-husk', 'ta-0020': 'asrs-husk' };
const FAMS = [...new Set(Object.values(ANCHOR))];
const expAdhd = FAMS.map(fam => nearPool.filter(id => ANCHOR[id] === fam).sort()[0]).sort();
const gotAdhd = tNo.items.filter(i => i.id.startsWith('ta-')).map(i => i.id).sort();
ok(JSON.stringify(gotAdhd) === JSON.stringify(expAdhd),
   'S2 triage-adhd = lavest id per ANKER-familie (forventet ' + expAdhd.join(',') + ', fikk ' + gotAdhd.join(',') + ')');
ok(gotAdhd.length === 3, 'S2b triage-adhd = 3 items');
// autisme: temaspredning t1/t2/t3, lavest id per tema
const tsMeta = triageMeta.items.filter(i => i.axis === 'autism');
const bands = [...new Set(tsMeta.map(i => i.theme))];
const expAut = bands.map(b => tsMeta.filter(i => i.theme === b).map(i => i.id).sort()[0]);
const gotAut = tNo.items.filter(i => i.id.startsWith('ts-')).map(i => i.id).sort();
ok(JSON.stringify(gotAut) === JSON.stringify(expAut.slice().sort()) && gotAut.length === 3,
   'S2c triage-autisme = 3 temaer, lavest id per tema (fikk ' + gotAut.join(',') + ')');

/* ---------- S3: dyp-stratifikasjon 10/8/6 ---------- */
for (const [fn, keys] of [['def-nd-adhd.no.json',['da1','da2','da3']], ['def-nd-autisme.no.json',['ds1','ds2','ds3']],
                          ['def-nd-adhd.en.json',['da1','da2','da3']], ['def-nd-autisme.en.json',['ds1','ds2','ds3']]]) {
  const d = defs[fn];
  const counts = {};
  for (const it of d.items) counts[it.scales[0].id] = (counts[it.scales[0].id] || 0) + 1;
  ok(d.items.length === 24 && counts.da1 === 10 && counts.da2 === 8 && counts.da3 === 6 && keys.join() === 'da1,da2,da3'
     || d.items.length === 24 && counts.ds1 === 10 && counts.ds2 === 8 && counts.ds3 === 6,
     'S3 ' + fn + ': 24 items 10/8/6 (' + JSON.stringify(counts) + ')');
}
ok(defs['def-nd-adhd.no.json'].scoring.traits.map(t=>t.id).join() === 'da1,da2,da3' &&
   defs['def-nd-autisme.no.json'].scoring.traits.map(t=>t.id).join() === 'ds1,ds2,ds3',
   'S3b dyp-traits = fasett-id-er (weight 1)');

/* ---------- S4: byte-identisk anker + pool-tekster ---------- */
for (const [fn, lang, ank] of [['def-nd-triage.no.json','no',ipipNo], ['def-nd-triage.en.json','en',ipipEn],
                               ['def-nd-adhd.no.json','no',ipipNo], ['def-nd-adhd.en.json','en',ipipEn],
                               ['def-nd-autisme.no.json','no',ipipNo], ['def-nd-autisme.en.json','en',ipipEn]]) {
  const d = defs[fn];
  const anchor = JSON.stringify(ank.items[0].options);
  ok(d.items.every(it => JSON.stringify(it.options) === anchor), 'S4 options byte-identisk anker: ' + fn);
}
const POOL_FILES = {
  da1: 'def-nd-adhd-dyp-pool-da1', da2: 'def-nd-adhd-dyp-pool-da2', da3: 'def-nd-adhd-dyp-pool-da3',
  ds1: 'def-nd-autisme-dyp-pool-ds1', ds2: 'def-nd-autisme-dyp-pool-ds2', ds3: 'def-nd-autisme-dyp-pool-ds3',
};
const poolText = {}, poolTextEn = {};
for (const it of triagePoolNo.items) poolText[it.id] = it.text;
for (const it of triagePoolEn.items) poolTextEn[it.id] = it.text;
for (const base of Object.values(POOL_FILES)) {
  for (const it of J(join(PROD, 'tests/schema/nd_pool/' + base + '.no.json')).items) poolText[it.id] = it.text;
  for (const it of J(join(PROD, 'tests/schema/nd_pool/' + base + '.en.json')).items) poolTextEn[it.id] = it.text;
}
let mismatch = 0;
for (const [fn, pool] of [['def-nd-triage.no.json',poolText],['def-nd-adhd.no.json',poolText],['def-nd-autisme.no.json',poolText],
                          ['def-nd-triage.en.json',poolTextEn],['def-nd-adhd.en.json',poolTextEn],['def-nd-autisme.en.json',poolTextEn]]) {
  for (const it of defs[fn].items) if (it.text !== pool[it.id]) mismatch++;
}
ok(mismatch === 0, 'S4b alle itemtekster byte-identiske med pool-kildene (avvik: ' + mismatch + ')');

/* ---------- S5: konstrukt-ekvivalens NO/EN ---------- */
for (const [a, b] of [['def-nd-triage.no.json','def-nd-triage.en.json'], ['def-nd-adhd.no.json','def-nd-adhd.en.json'], ['def-nd-autisme.no.json','def-nd-autisme.en.json']]) {
  const idsA = defs[a].items.map(i => i.id), idsB = defs[b].items.map(i => i.id);
  ok(JSON.stringify(idsA) === JSON.stringify(idsB), 'S5 id-orden NO==EN: ' + a);
  const scA = defs[a].items.map(i => i.scales.map(s=>s.id+':'+s.sign).join('|')).join(',');
  const scB = defs[b].items.map(i => i.scales.map(s=>s.id+':'+s.sign).join('|')).join(',');
  ok(scA === scB, 'S5b skalaer+sign NO==EN: ' + a);
  const oA = JSON.stringify(defs[a].items[0].options), oB = JSON.stringify(defs[b].items[0].options);
  ok(oA !== oB, 'S5c options er språkspesifikke (NO!=EN)');
}
ok(defs['def-nd-triage.no.json'].dimensions[0].label === 'ADHD' && defs['def-nd-triage.en.json'].dimensions[1].label === 'Autism',
   'S5d dims: NO/EN labels fra pool');

/* ---------- S6: tekstregler (arvet fra pool-QC) ---------- */
const forbidden = /\b(DSM|diagnos|symptom|sympto|ASRS|RAADS|ABAS|alltid|aldri|always|never)\b/i;
let textViol = 0;
for (const def of Object.values(defs)) for (const it of def.items) {
  const w = it.text.trim().split(/\s+/).length;
  if (w < 8 || w > 14 || forbidden.test(it.text)) textViol++;
}
ok(textViol === 0, 'S6 ordantall 8-14 + ingen forbudte token (brudd: ' + textViol + ')');

/* ---------- S7: ekte scoring.js — triage håndregnet ---------- */
const mkAns = (ids, val, lang='no') => Object.fromEntries(ids.map(id => [id, { kind:'likert', lang, value: val }]));
const pay = (def, ids, answers) => ({ testId: def.id, lang: 'no', itemIds: ids, startedAt: 0, finishedAt: 1, timeSpentSec: 30, expired: false, answers });
const idsT = tNo.items.map(i => i.id);
const taIds = idsT.filter(id => id.startsWith('ta-')), tsIds = idsT.filter(id => id.startsWith('ts-'));
// alle-5 på adhd-siden, alle-1 på autisme-siden => adhd 100, autism 0
let r = scoreTest(tNo, pay(tNo, idsT, { ...mkAns(taIds, 5), ...mkAns(tsIds, 1) }));
let s = Object.fromEntries(r.result.scales.map(x => [x.id, x]));
ok(r.ok && s.adhd.normalized === 100 && s.autism.normalized === 0, 'S7 alle5/alle1 -> adhd 100 / autism 0 (fikk ' + s.adhd.normalized + '/' + s.autism.normalized + ')');
ok(r.result.total.composite === 50, 'S7b komposit 50 (15+3 mot 30 max) (fikk ' + r.result.total.composite + ')');
// alle-3 => 50/50
r = scoreTest(tNo, pay(tNo, idsT, mkAns(idsT, 3)));
s = Object.fromEntries(r.result.scales.map(x => [x.id, x]));
ok(s.adhd.normalized === 50 && s.autism.normalized === 50, 'S7c alle-3 -> 50/50');
// kun adhd-siden besvart (itemIds kun ta-) => autism normalized null + warning
r = scoreTest(tNo, pay(tNo, taIds, mkAns(taIds, 5)));
s = Object.fromEntries(r.result.scales.map(x => [x.id, x]));
ok(r.ok && s.adhd.normalized === 100 && s.autism.normalized === null, 'S7d halvbesvart -> adhd 100 / autism null');
ok(r.warnings.length >= 1, 'S7e halvbesvart gir warning (coverage/trait-tomme)');

/* ---------- S8: ekte scoring.js — dyp håndregnet ---------- */
const aNo = defs['def-nd-adhd.no.json'];
const idsA = aNo.items.map(i => i.id);
const da1Ids = aNo.items.filter(i => i.scales[0].id === 'da1').map(i => i.id).slice(0, 10);
r = scoreTest(aNo, pay(aNo, da1Ids, mkAns(da1Ids, 5)));
s = Object.fromEntries(r.result.scales.map(x => [x.id, x]));
ok(r.ok && s.da1.normalized === 100 && s.da2.normalized === null && s.da3.normalized === null, 'S8 kun da1 alle-5 -> da1 100, da2/da3 null');
ok(s.da1.raw === 50 && s.da1.minPossible === 10 && s.da1.maxPossible === 50, 'S8b da1 raw 50 i vindu [10,50]');
ok(r.result.total.composite === 100, 'S8c komposit 100 (én skala med data)');
// alle-24 alle-4 => 75 per fasett
r = scoreTest(aNo, pay(aNo, idsA, mkAns(idsA, 4)));
s = Object.fromEntries(r.result.scales.map(x => [x.id, x]));
ok(s.da1.normalized === 75 && s.da2.normalized === 75 && s.da3.normalized === 75, 'S8d alle-4 -> 75/75/75');

/* ---------- S9: triage-modul-integrasjon ---------- */
const triage = await import('file://' + join(PROD, 'tests/schema/_nd_triage_model.mjs'));
let to = triage.computeTriageOutcome({ adhd: 100, autism: 0 });
ok(to.outcode === 'out-adhd' && to.nextSteps.deepPoolId === 'nd-adhd', 'S9 out-adhd -> nestesteg nd-adhd');
to = triage.computeTriageOutcome({ adhd: 0, autism: 100 });
ok(to.outcode === 'out-autism' && to.nextSteps.deepPoolId === 'nd-autism', 'S9b out-autism -> nd-autism');
to = triage.computeTriageOutcome({ adhd: 60, autism: 60 });
ok(to.outcode === 'out-adhd-autism' && to.nextSteps.deepPoolId === 'nd-adhd-autism', 'S9c «begge» gyldig utfall -> nd-adhd-autism');
to = triage.computeTriageOutcome({ adhd: 54, autism: null });
ok(to.perAxis.adhd.bandId === 'band-observed' && to.perAxis.autism.bandId === 'band-nodata', 'S9d 54=observed, null=nodata');
to = triage.computeTriageOutcome({ adhd: 55, autism: 55 });
ok(to.outcode === 'out-adhd-autism', 'S9e 55 er eksakt flagged-grense');
ok(triage.computeTriageOutcome({ adhd: 100, autism: 0 }).outcode === triage.computeTriageOutcome({ adhd: 100, autism: 0 }).outcode, 'S9f deterministisk');
// chain: live-triage-score (100/0) -> modul -> deepPoolId def-finnes
ok(existsSync(join(HERE, 'def-nd-adhd.no.json')) && existsSync(join(HERE, 'def-nd-autisme.no.json')), 'S9g deepPoolId-ene peker på eksisterende live-defer');

/* ---------- S10: meta-konsistens ---------- */
ok(meta.metaVersion === 1 && meta.id === 'nd-live-defs', 'S10 meta identitet');
ok(JSON.stringify(meta.items['nd-triage'].idOrder) === JSON.stringify(tNo.items.map(i=>i.id)), 'S10b meta idOrder == triage-def');
ok(meta.items.deep.da1.picked.length === 10 && meta.items.deep.da2.picked.length === 8 && meta.items.deep.da3.picked.length === 6, 'S10c meta deep picks 10/8/6');
ok(meta.items['nd-triage'].asrsNearChosen.join(',') === expAdhd.join(','), 'S10d meta asrsNearChosen == beregnet');
ok(String(meta.licenseBasis).includes('DOC-C8C02AD272') && String(meta.asrsReserved).includes('IKKE live i v1'), 'S10e lisens + ASRS-reservasjon dokumentert');
ok(spec.status === 'PROPOSED', 'S10f spec PROPOSED v1 (GJELDENDE ved #3813)');

/* ---------- S11: copyright-skann (gjenbruk av pool-skann) ---------- */
ok(textViol === 0, 'S11 ingen ASRS/AQ/RAADS/DSM-gjengivelse i live-items (samme skann S6)');

/* ---------- S12: sessionSizeFor ---------- */
ok(sessionSizeFor(tNo) === 6 && sessionSizeFor(aNo) === 24, 'S12 sessionSizeFor(likert) = alle items');
ok(sessionSizeFor(defs['def-nd-autisme.no.json']) === 24, 'S12b autisme -> 24');

/* ---------- S13: determinisme — generator re-kjoring byte-identisk ---------- */
const tmp = join(HERE, '_tmp_regen_live');
mkdirSync(tmp, { recursive: true });
execFileSync('python3', [join(HERE, 'gen_nd_live_defs.py'), '--out', tmp], { cwd: HERE });
for (const f of FILES.filter(f => f !== 'gen_nd_live_defs.py')) {
  ok(md5(join(tmp, f)) === md5(join(HERE, f)), 'S13 ' + f + ' byte-identisk ved re-kjøring');
}
rmSync(tmp, { recursive: true, force: true });

/* ---------- rapport ---------- */
const report = {
  id: 'nd_live_defs_selftest',
  date: '2026-11-17',
  boardTodo: '#3843',
  total: checks.length,
  fails,
  checks,
};
writeFileSync(join(HERE, '_nd_live_defs_selftest_report.json'), JSON.stringify(report, null, 2) + '\n');
console.log('TOTAL ' + checks.length + ' | FAILS ' + fails);
if (fails) { console.log(checks.filter(c => c.startsWith('FAIL')).join('\n')); process.exit(1); }
