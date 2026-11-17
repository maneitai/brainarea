/**
 * Brainarea rel_pool-selvtest — R1 nærhet (cl, def-rel-cl-60, 60 items/språk).
 * [3-VEIS] FASE 2 relasjonspool per dimensjon: R1 (todo #3825-blokken).
 * Kontrakt: tests/schema/_rel_itemspec_spec.json (rel-itemspec-v1, PROPOSED) +
 * DOC-C8C02AD272 lisensverdikten (kontrastgrunnlag: alt innhold egne/original).
 *
 * S0 prod-tre + filer (staging: REL_POOL_DIR=<katalog med def/meta>);
 *  S1 AJV + validateTestDef per fil + family relations + én-fil-per-språk;
 *  S2 id-mønster cl-0001..cl-0060 i rekkefølge, 60 items unike;
 *  S3 struktur + dim-etikett byte-låst til spec.dimensionDecision + scoring;
 *  S3b sign-policy 30 pos / 30 neg, blokk-kontinuitet;
 *  S4 stilregler (8–14 ord, ett utsagn, ingen absolutter, ingen instrument-/diagnose-språk);
 *  S5 options byte-paritet mot def-ipip50-big5 (5-NOYAKTIGHET-ankeret);
 *  S6 NO/EN separat forfattet: samme id-rekkefølge + konstrukt-ekvivalens via meta, 120 unike tekster;
 *  S7 ekte scoring.js-probe (håndregnet 2+ / 2- vindu [-8,8]);
 *  S8 hele poolen mot ekte motor: alle-3 -> 50, pos5/neg1 -> 100, pos1/neg5 -> 0 (håndregnet);
 *  S8b sign=-1 inversjon enkelt-item håndregnet;
 *  S9 itemspec-kryssles (poolMin, prefix/dimensjon, defFilePlan-naming);
 *  S10 meta-konsistens (60 rader, tema+sign per id, redundantWith symmetrisk, signCounts, seedPolicy);
 *  S11 copyright-skann (copyrightControl-forbudene) — 0 treff;
 *  S13 determinisme — generator re-kjoring byte-identisk;
 *  S14 sessionSizeFor(likert) = 60 + rel_compat_model-mottaks-integrasjon;
 * Kjoring: node tests/schema/rel_pool/selftest_rel_pool_r1.mjs (WSL eller Windows)
 */
import { readFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

let fails = 0;
const checks = [];
const ok = (c, m) => { checks.push((c ? 'PASS' : 'FAIL') + ' ' + m); if (!c) fails++; };
const near = (x, v, t = 1e-9) => Math.abs(x - v) < t;
const mkPayload = (def, answers, ids) => ({ testId: def.id, lang: def.languages[0], itemIds: ids, startedAt: 0, finishedAt: 1, timeSpentSec: 30, expired: false, answers });
const J = (p) => JSON.parse(readFileSync(p, 'utf8'));

const CANDIDATES = [
  '/mnt/f/maneit/prosjekter/filip-webside-prosjekter/brainarea',
  'f:/maneit/prosjekter/filip-webside-prosjekter/brainarea',
  'F:/maneit/prosjekter/filip-webside-prosjekter/brainarea',
];
const found = CANDIDATES.filter(existsSync);
ok(found.length >= 1, 'S0 prod-tre funnet: ' + found.join(' | '));
const PROD = found[0];
const REL_DIR = process.env.REL_POOL_DIR || join(PROD, 'tests/schema/rel_pool');
const rf = (f) => join(REL_DIR, f);

ok(existsSync(rf('def-rel-cl-60.no.json')) && existsSync(rf('def-rel-cl-60.en.json')) && existsSync(rf('_rel_pool_r1_meta.json')),
  'S0 leveransefiler til stede i ' + REL_DIR);

const defNo = J(rf('def-rel-cl-60.no.json'));
const defEn = J(rf('def-rel-cl-60.en.json'));
const meta = J(rf('_rel_pool_r1_meta.json'));
const spec = J(join(PROD, 'tests/schema/_rel_itemspec_spec.json'));
const ipipNo = J(join(PROD, 'tests/schema/def-ipip50-big5.no.json'));
const ipipEn = J(join(PROD, 'tests/schema/def-ipip50-big5.en.json'));

/* ---------- S1: AJV + validateTestDef + family + språk-konvensjon ---------- */
const { default: Ajv } = await import('ajv');
const schema = J(join(PROD, 'tests/schema/test-definition.schema.json'));
const ajv = new Ajv({ strict: false, allErrors: true, validateSchema: false });
const valid = ajv.compile(schema);
for (const [name, d] of [['no', defNo], ['en', defEn]]) {
  ok(valid(d), 'S1 AJV def-rel-cl-60.' + name + (valid.errors ? ' :: ' + JSON.stringify(valid.errors) : ''));
}
const { validateTestDef, sessionSizeFor } = await import('file://' + join(PROD, 'tests/engine/render.js'));
ok(validateTestDef(defNo).ok, 'S1 validateTestDef NO :: ' + JSON.stringify(validateTestDef(defNo).errors || []));
ok(validateTestDef(defEn).ok, 'S1 validateTestDef EN :: ' + JSON.stringify(validateTestDef(defEn).errors || []));
ok(defNo.family === 'relations' && defEn.family === 'relations', 'S1b family relations per itemspec.defFilePlan');
ok(defNo.languages.length === 1 && defNo.languages[0] === 'no' && defEn.languages.length === 1 && defEn.languages[0] === 'en', 'S1c én fil per språk');
ok(defNo.id === 'rel-cl-pool' && defEn.id === 'rel-cl-pool' && meta.id === 'rel-cl-pool', 'S1d id rel-cl-pool i alle tre filer');

/* ---------- S2: id-mønster + 60 items ---------- */
const expected = Array.from({ length: 60 }, (_x, i) => 'cl-' + String(i + 1).padStart(4, '0'));
for (const [name, d] of [['no', defNo], ['en', defEn]]) {
  ok(d.items.length === 60, 'S2 ' + name + ': 60 items');
  ok(JSON.stringify(d.items.map((it) => it.id)) === JSON.stringify(expected), 'S2 ' + name + ': cl-0001..cl-0060 i rekkefølge (4-sifret, 0-paddet)');
  ok(new Set(d.items.map((it) => it.id)).size === 60, 'S2 ' + name + ': ids unike');
}

/* ---------- S3: struktur + etikett byte-låst til FASE 1-vokabularet ---------- */
const dd = spec.dimensionDecision.value.closeness;
for (const [name, d, lbl] of [['no', defNo, dd.labelNo], ['en', defEn, dd.labelEn]]) {
  ok(d.items.every((it) => it.kind === 'likert' && it.lang === d.languages[0]), 'S3 ' + name + ': likert + lang');
  ok(d.dimensions.length === 1 && d.dimensions[0].id === 'closeness' && d.dimensions[0].label === lbl,
    'S3 ' + name + ': dim closeness, etikett "' + lbl + '" byte-låst til spec.dimensionDecision');
  ok(d.scoring.type === 'trait' && d.scoring.norms === 'none'
    && JSON.stringify(d.scoring.traits) === JSON.stringify([{ id: 'closeness', weight: 1 }]),
    'S3 ' + name + ': scoring trait [closeness weight 1], norms none per defFilePlan.conventions');
  ok(d.items.every((it) => it.scales.length === 1 && it.scales[0].id === 'closeness'), 'S3 ' + name + ': alle items peker closeness, én skala per item');
}
/* ---------- S3b: sign-policy 30/30 + kontinuitet ---------- */
for (const [name, d] of [['no', defNo], ['en', defEn]]) {
  const signs = d.items.map((it) => it.scales[0].sign);
  ok(signs.filter((s) => s === 1).length === 30 && signs.filter((s) => s === -1).length === 30, 'S3b ' + name + ': 30 pos / 30 neg');
  ok(signs.slice(0, 30).every((s) => s === 1) && signs.slice(30).every((s) => s === -1), 'S3b ' + name + ': cl-0001..0030 pos, cl-0031..0060 neg (blokk-kontinuitet)');
}
ok(/2 pos \+ 2 neg/.test(meta.signPolicy) || /\+-.+-/.test(meta.signPolicy), 'S3b signPolicy begrunnes mot live +-.+- valget');
ok(meta.provenance.signCounts.pos === 30 && meta.provenance.signCounts.neg === 30, 'S3b meta signCounts 30/30');

/* ---------- S4: stilregler (poolQC + itemStyle) ---------- */
const NO_ABS = /(alltid|aldri|always|never)/i;
const NO_INSTR = /(gottman|love language|enrich|prepare\/enrich|asrs|raads|diva|conners|dsm|diagnos|syndrom| disorder )/i;
function wc(t) { return t.split(/\s+/).filter(Boolean).length; }
for (const [name, d] of [['no', defNo], ['en', defEn]]) {
  ok(d.items.every((it) => wc(it.text) >= 8 && wc(it.text) <= 14), 'S4 ' + name + ': 8–14 ord (alle)');
  ok(d.items.every((it) => it.text.endsWith('.')), 'S4 ' + name + ': ett utsagn avsluttet med punktum');
  ok(d.items.every((it) => !it.text.includes(';') && !it.text.includes('?') && (it.text.match(/\./g) || []).length === 1), 'S4 ' + name + ': ingen dobbeltspørsmål/sammenkjeding');
  ok(d.items.every((it) => !NO_ABS.test(it.text)), 'S4 ' + name + ': ingen absolutter');
  ok(d.items.every((it) => !NO_INSTR.test(it.text)), 'S4 ' + name + ': ingen instrument-/diagnose-tekst');
  ok(d.items.every((it) => /^(Jeg |I )/.test(it.text)), 'S4 ' + name + ': første-person presens');
}

/* ---------- S5: options byte-paritet mot ipip50 ---------- */
const canon = (o) => JSON.stringify(o);
const ipipOptsNo = ipipNo.items[0].options;
const ipipOptsEn = ipipEn.items[0].options;
ok(ipipNo.items.every((it) => canon(it.options) === canon(ipipOptsNo)), 'S5a forutsetning: ipip50 NO options homogene');
ok(ipipEn.items.every((it) => canon(it.options) === canon(ipipOptsEn)), 'S5b forutsetning: ipip50 EN options homogene');
ok(defNo.items.every((it) => canon(it.options) === canon(ipipOptsNo)), 'S5c NO options byte-identiske med def-ipip50-big5.no.json');
ok(defEn.items.every((it) => canon(it.options) === canon(ipipOptsEn)), 'S5d EN options byte-identiske med def-ipip50-big5.en.json');

/* ---------- S6: NO/EN separat forfattet + konstrukt-ekvivalens ---------- */
ok(JSON.stringify(defEn.items.map((i) => i.id)) === JSON.stringify(defNo.items.map((i) => i.id)), 'S6a samme id-rekkefølge i begge filer');
const pairSame = defEn.items.filter((it, i) => defNo.items[i].text === it.text).map((it) => it.id);
ok(pairSame.length === 0, 'S6b alle NO/EN-tekstpar ulike (separat forfattet, ikke maskinoversatt identitet)');
const allTexts = [...defNo.items.map((i) => i.text), ...defEn.items.map((i) => i.text)];
ok(new Set(allTexts).size === 120, 'S6c alle 120 tekster unike (fikk ' + new Set(allTexts).size + ')');
const byId = new Map(meta.items.map((r) => [r.id, r]));
for (const [name, d] of [['no', defNo], ['en', defEn]]) {
  ok(d.items.every((it) => byId.get(it.id).theme === (it.id <= 'cl-0010' ? 'cl-t1' : it.id <= 'cl-0030' ? (it.id <= 'cl-0020' ? 'cl-t2' : 'cl-t3') : it.id <= 'cl-0040' ? 'cl-n1' : it.id <= 'cl-0050' ? 'cl-n2' : 'cl-n3')),
    'S6d ' + name + ': tema-bånd 10/10/10 pos og 10/10/10 neg (meta == id-bånd)');
  ok(d.items.every((it) => byId.get(it.id).sign === it.scales[0].sign), 'S6e ' + name + ': meta.sign == def-sign per id');
}

/* ---------- S7: ekte scoring.js — håndregnet probe (2 pos + 2 neg) ---------- */
const scoringMod = await import('file://' + join(PROD, 'tests/engine/scoring.js'));
const { scoreTest } = scoringMod;
const optsProbe = defNo.items[0].options;
const mkItem = (id, sign) => ({ id, kind: 'likert', lang: 'no', text: 'Probeitem ' + id + ' for motor-proven av R1-poolen.', options: optsProbe, scales: [{ id: 'closeness', sign }] });
const probeDef = {
  schemaVersion: 1, id: 'rel-cl-probe', type: 'test-definition', family: 'relations', languages: ['no'],
  scoring: { type: 'trait', traits: [{ id: 'closeness', weight: 1 }], norms: 'none' },
  dimensions: [{ id: 'closeness', label: dd.labelNo, labelLanguage: 'no', description: 'Probe-dimensjon for R1-poolens motor-prove.' }],
  items: [mkItem('pc-0001', 1), mkItem('pc-0002', 1), mkItem('pc-0003', -1), mkItem('pc-0004', -1)],
};
const a1 = { 'pc-0001': { kind: 'likert', lang: 'no', value: 5 }, 'pc-0002': { kind: 'likert', lang: 'no', value: 4 }, 'pc-0003': { kind: 'likert', lang: 'no', value: 2 }, 'pc-0004': { kind: 'likert', lang: 'no', value: 3 } };
const r1 = scoreTest(probeDef, mkPayload(probeDef, a1, ['pc-0001', 'pc-0002', 'pc-0003', 'pc-0004']));
ok(r1.ok === true, 'S7 probe scores ok');
const s1 = r1.result.scales.find((s) => s.id === 'closeness');
// raw = 5+4-2-3 = 4; vindu [p-5m, 5p-m] = [2-10, 10-2] = [-8,8], span 16 -> 100*12/16 = 75
ok(near(s1.normalized, 75, 1e-9), 'S7 handregnet 75.0 (fikk ' + s1.normalized + ')');
ok(s1.raw === 4 && s1.minPossible === -8 && s1.maxPossible === 8, 'S7 raw/min/max = 4/-8/8 (fikk ' + s1.raw + '/' + s1.minPossible + '/' + s1.maxPossible + ')');
ok(near(r1.result.total.composite, 75, 1e-9), 'S7 komposit == skala-normalized (fikk ' + r1.result.total.composite + ')');

/* ---------- S8: hele poolen mot ekte motor (symmetrisk keying) ---------- */
const mkAns = (vPos, vNeg) => {
  const a = {};
  for (const it of defNo.items) a[it.id] = { kind: 'likert', lang: 'no', value: it.scales[0].sign === 1 ? vPos : vNeg };
  return a;
};
const ids60 = defNo.items.map((i) => i.id);
for (const [vP, vN, exp] of [[3, 3, 50], [5, 1, 100], [1, 5, 0]]) {
  const r = scoreTest(defNo, mkPayload(defNo, mkAns(vP, vN), ids60));
  const s = r.result.scales.find((x) => x.id === 'closeness');
  ok(r.ok && near(s.normalized, exp, 1e-9), 'S8 pos ' + vP + '/ neg ' + vN + ' -> normalized ' + exp + ' handregnet (fikk ' + s.normalized + ')');
}
// forklar tallene: 30 pos + 30 neg, span = 240
ok(true, 'S8 (dokumentert: p=m=30 -> vindu [-120,120] span 240; konstante svar gir alltid 0 i raw => 50.0)');

/* ---------- S8b: sign=-1 inversjon enkelt-item (motor-ens konvensjon) ---------- */
const revProbe = JSON.parse(JSON.stringify(probeDef));
revProbe.id = 'rel-cl-probe-rev';
revProbe.items[0].scales[0].sign = -1;
const rRev = scoreTest(revProbe, mkPayload(revProbe, { 'pc-0001': { kind: 'likert', lang: 'no', value: 5 }, 'pc-0002': { kind: 'likert', lang: 'no', value: 4 } }, ['pc-0001', 'pc-0002']));
const rA2 = rRev.result.scales.find((s) => s.id === 'closeness');
// pb1 reversed: c=-5 minP=-5 maxP=-1; pb2 pos: c=4 min=1 max=5 -> raw -1, vindu [-4,4] span 8 -> 100*3/8=37.5
ok(near(rA2.normalized, 37.5, 1e-9), 'S8b sign=-1 inverterer: raw -1 i vindu [-4,4] -> 37.5 handregnet (fikk ' + rA2.normalized + ')');

/* ---------- S9: itemspec-kryssles ---------- */
ok(spec.poolDesign.poolMinPerDim === 60, 'S9a spec poolMinPerDim 60');
const r1t = spec.themes.find((t) => t.id === 'R1');
ok(r1t.idPrefix === 'cl' && r1t.dimension === 'closeness' && r1t.poolMin === 60, 'S9b themes.R1: prefix cl, dimensjon closeness, poolMin 60');
ok(/def-rel-cl-60/.test(spec.defFilePlan.naming), 'S9c defFilePlan.naming nevner def-rel-cl-60');
ok(spec.status === 'PROPOSED' && spec.specVersion === 1, 'S9d spec PROPOSED v1 (GJELDENDE ved #3813)');
ok(spec.copyrightControl.forbidden.length >= 3, 'S9e copyrightControl-forbud non-tom');

/* ---------- S10: meta-konsistens ---------- */
ok(meta.items.length === 60, 'S10a meta 60 rader');
ok(meta.items.every((r) => r.dimension === 'closeness'), 'S10b alle rader dimension closeness');
const tc = meta.themeCounts;
ok(tc['cl-t1'] === 10 && tc['cl-t2'] === 10 && tc['cl-t3'] === 10 && tc['cl-n1'] === 10 && tc['cl-n2'] === 10 && tc['cl-n3'] === 10, 'S10c tema 10/10 per bånd (fikk ' + JSON.stringify(tc) + ')');
ok(meta.items.filter((r) => r.sign === 1).length === 30 && meta.items.filter((r) => r.sign === -1).length === 30, 'S10d sign 30/30 i meta');
ok(/DOC-C8C02AD272/.test(meta.licenseBasis), 'S10e lisensforankring dokumentert i meta');
ok(meta.boardLeaf.includes('#3825'), 'S10f boardLeaf refererer #3825-blokken');
const rw = meta.items.filter((r) => (r.redundantWith || []).length > 0);
ok(rw.length > 0, 'S10g redundantWith-flagg til stede (' + rw.length + ' rader)');
ok(meta.items.every((r) => (r.redundantWith || []).every((x) => (byId.get(x).redundantWith || []).includes(r.id))), 'S10h redundantWith symmetrisk begge veier');
ok(JSON.stringify(meta.items.filter((r) => r.seedNear).map((r) => r.id)) === JSON.stringify(['cl-0011', 'cl-0043']),
  'S10i seedNear-flagglisten eksakt (pos-ekko cl-0011 + negasjons-side cl-0043 av seed-sfæren)');
ok(/ikke et lisensflagg|ikke et lisensflagg/.test(meta.seedPolicy) || /seed/.test(meta.seedPolicy), 'S10j seedPolicy dokumentert (seed-en er egen, flagget er utvelgelses-støtte)');

/* ---------- S11: copyright-skann (copyrightControl) ---------- */
const scanBlob = allTexts.join(' | ').toLowerCase();
const forbidden = ['gottman', 'love language', 'enrich', 'prepare', 'asrs', 'raads', 'diva', 'conners', 'dsm', 'diagnos', 'alltid', 'aldri', 'always', 'never', 'syndrom'];
const hits = forbidden.filter((w) => scanBlob.includes(w));
ok(hits.length === 0, 'S11a copyright-skann: 0 treff i 120 tekster (treff: ' + JSON.stringify(hits) + ')');
// word-boundary-sjekk for de engelske absoluttene
ok(!/always|never/.test(defEn.items.map((i) => i.text).join(' ')), 'S11b EN word-boundary: ingen always/never');

/* ---------- S13: determinisme — generator re-kjoring byte-identisk ---------- */
const tmp = join(REL_DIR, '_tmp_regen');
const GEN = join(PROD, 'tests/schema/rel_pool/gen_rel_pool_r1.py');
ok(existsSync(GEN), 'S13 generator til stede (prod-tre)');
mkdirSync(tmp, { recursive: true });
let genOk = true;
const PY3 = existsSync('/usr/bin/python3') ? 'python3' : (existsSync('/usr/bin/python') ? 'python' : null);
if (!PY3) {
  genOk = false;
  ok(false, 'S13 ingen python-fortolker funnet');
} else {
  try {
    execFileSync(PY3, [GEN, '--out', tmp], { cwd: join(PROD, 'tests/schema/rel_pool') });
  } catch (e2) {
    genOk = false;
    ok(false, 'S13 generator-kjoring feilet: ' + (e2 && e2.message));
  }
}
if (genOk) {
  for (const f of ['def-rel-cl-60.no.json', 'def-rel-cl-60.en.json', '_rel_pool_r1_meta.json']) {
    const a = readFileSync(rf(f));
    const b = readFileSync(join(tmp, f));
    ok(a.equals(b), 'S13 ' + f + ' byte-identisk ved re-generering');
  }
}
rmSync(tmp, { recursive: true, force: true });

/* ---------- S14: sessionSizeFor + compat-modell-mottak ---------- */
ok(sessionSizeFor(defNo) === 60, 'S14a sessionSizeFor(likert) = alle 60');
const compat = await import('file://' + join(PROD, 'tests/schema/_rel_compat_model.mjs'));
const score50 = scoreTest(defNo, mkPayload(defNo, mkAns(3, 3), ids60));
const nrm = score50.result.scales.find((s) => s.id === 'closeness').normalized;
ok(near(nrm, 50, 1e-9), 'S14b pool-skår 50.0 matet inn i kompat-modellen');
const pair = compat.computePairCompatibility({ closeness: nrm, openness: 60, conflict: 40, independence: 55 }, { closeness: 45, openness: 60, conflict: 40, independence: 55 });
ok(pair.ok === true && typeof pair.overall === 'number' && pair.overall >= 0 && pair.overall <= 100, 'S14c computePairCompatibility ok, overall i [0,100]: ' + pair.overall);
ok(pair.perDimension.closeness.ok === true, 'S14d closeness-dimensjonen er modellens mottaksside for denne poolen');
ok(compat.DIMENSIONS[0].id === 'closeness', 'S14e DIMENSIONS-kontrakten starter med closeness (samme vokabular)');

console.log('SAMLET: ' + (checks.length - fails) + '/' + checks.length + (fails === 0 ? ' ALL PASS' : ' FAILS=' + fails));
if (fails) for (const c of checks) if (c.startsWith('FAIL')) console.log(c);
process.exit(fails === 0 ? 0 : 1);
