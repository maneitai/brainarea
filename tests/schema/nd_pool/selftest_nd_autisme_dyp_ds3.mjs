/*
 * Selftest — Autisme-dyp pool del 3: DS3 Hverdagen, energi og tilpasning (todo #3832).
 * S0–S14, konvensjon: selftest_nd_autisme_dyp_ds2.mjs (søster i samme spor).
 * Staging: env ND_POOL_DIR peker på leveransekatalog; motor/ajv/spec krysset fra prod-tre.
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const checks = [];
let fails = 0;
const ok = (c, m) => { checks.push((c ? 'PASS' : 'FAIL') + ' ' + m); if (!c) fails++; };
const near = (x, v, t = 1e-9) => Math.abs(x - v) < t;
const md5 = (p) => createHash('md5').update(readFileSync(p)).digest('hex');
const J = (p) => JSON.parse(readFileSync(p, 'utf8'));
const mkPayload = (def, answers, ids) => ({ testId: def.id, lang: 'no', itemIds: ids, startedAt: 0, finishedAt: 1, timeSpentSec: 30, expired: false, answers });

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
ok(!!HERE, 'S0 leveransekatalog: ' + HERE);
const FILES = ['def-nd-autisme-dyp-pool-ds3.no.json', 'def-nd-autisme-dyp-pool-ds3.en.json', '_nd_autisme_dyp_meta_ds3.json', 'gen_nd_autisme_pool_ds3.py'];
ok(FILES.every((f) => existsSync(join(HERE, f))), 'S0 leveransefiler til stede i ' + HERE);

const defNo = J(join(HERE, 'def-nd-autisme-dyp-pool-ds3.no.json'));
const defEn = J(join(HERE, 'def-nd-autisme-dyp-pool-ds3.en.json'));
const meta = J(join(HERE, '_nd_autisme_dyp_meta_ds3.json'));
const spec = J(join(PROD, 'tests/schema/_nd_itemspec_spec.json'));
const ipipNo = J(join(PROD, 'tests/schema/def-ipip50-big5.no.json'));
const ipipEn = J(join(PROD, 'tests/schema/def-ipip50-big5.en.json'));
const triageNo = J(join(PROD, 'tests/schema/nd_pool/def-nd-triage-pool.no.json'));
const triageEn = J(join(PROD, 'tests/schema/nd_pool/def-nd-triage-pool.en.json'));
const da1No = J(join(PROD, 'tests/schema/nd_pool/def-nd-adhd-dyp-pool-da1.no.json'));
const da1En = J(join(PROD, 'tests/schema/nd_pool/def-nd-adhd-dyp-pool-da1.en.json'));
const da2No = J(join(PROD, 'tests/schema/nd_pool/def-nd-adhd-dyp-pool-da2.no.json'));
const da2En = J(join(PROD, 'tests/schema/nd_pool/def-nd-adhd-dyp-pool-da2.en.json'));
const da3No = J(join(PROD, 'tests/schema/nd_pool/def-nd-adhd-dyp-pool-da3.no.json'));
const da3En = J(join(PROD, 'tests/schema/nd_pool/def-nd-adhd-dyp-pool-da3.en.json'));
const ds1No = J(join(PROD, 'tests/schema/nd_pool/def-nd-autisme-dyp-pool-ds1.no.json'));
const ds1En = J(join(PROD, 'tests/schema/nd_pool/def-nd-autisme-dyp-pool-ds1.en.json'));
const ds2No = J(join(PROD, 'tests/schema/nd_pool/def-nd-autisme-dyp-pool-ds2.no.json'));
const ds2En = J(join(PROD, 'tests/schema/nd_pool/def-nd-autisme-dyp-pool-ds2.en.json'));
const ds1Meta = J(join(PROD, 'tests/schema/nd_pool/_nd_autisme_dyp_meta_ds1.json'));
const ds2Meta = J(join(HERE, '_nd_autisme_dyp_meta_ds2.json'));

/* ---------- S1: AJV + validateTestDef ---------- */
let Ajv;
try { const m = await import('ajv'); Ajv = m.default; }
catch { Ajv = (await import('file://' + join(PROD, 'node_modules/ajv/lib/ajv.js'))).default; }
const ajv = new Ajv({ strict: false, allErrors: true, validateSchema: false });
const schema = J(join(PROD, 'tests/schema/test-definition.schema.json'));
const valid = ajv.compile(schema);
ok(typeof Ajv === 'function', 'S1 ajv lastet (lokal eller prod-fallback)');
ok(valid(defNo), 'S1 AJV def-nd-autisme-dyp-pool-ds3.no :: ' + JSON.stringify(valid.errors || []));
ok(valid(defEn), 'S1 AJV def-nd-autisme-dyp-pool-ds3.en :: ' + JSON.stringify(valid.errors || []));
const { validateTestDef, sessionSizeFor } = await import('file://' + join(PROD, 'tests/engine/render.js'));
const verrNo = validateTestDef(defNo), verrEn = validateTestDef(defEn);
const errsOf = (v) => (Array.isArray(v) ? v : (v && v.errors) || []);
ok(verrNo.ok !== false && errsOf(verrNo).length === 0, 'S1 validateTestDef NO :: ' + JSON.stringify(verrNo));
ok(verrEn.ok !== false && errsOf(verrEn).length === 0, 'S1 validateTestDef EN :: ' + JSON.stringify(verrEn));
ok(defNo.family === 'pool' && defEn.family === 'pool', 'S1b family pool per itemspec.defFilePlan (schema enum v1 har ikke egen ND-verdi)');
ok(defNo.id === 'nd-autisme-dyp-pool-ds3' && defEn.id === 'nd-autisme-dyp-pool-ds3' && meta.id === 'nd-autisme-dyp-pool-ds3', 'S1c id nd-autisme-dyp-pool-ds3 i alle tre filer');
ok(JSON.stringify(defNo.languages) === JSON.stringify(['no']) && JSON.stringify(defEn.languages) === JSON.stringify(['en']), 'S1d én fil per språk');

/* ---------- S2: id-mønster, rekkefølge, 25 items, forkant-kjede ---------- */
const IDPAT = /^[a-z0-9]+(-[a-z0-9]+)*$/;
for (const [name, d] of [['no', defNo], ['en', defEn]]) {
  ok(d.items.length === 25, 'S2 ' + name + ': 25 items');
  const ids = d.items.map((i) => i.id);
  ok(ids.every((id) => IDPAT.test(id)), 'S2 ' + name + ': alle ids matcher mønster ^[a-z0-9]+(-[a-z0-9]+)*$');
  const want = Array.from({ length: 25 }, (_, i) => 'ds-' + String(i + 76).padStart(4, '0'));
  ok(JSON.stringify(ids) === JSON.stringify(want), 'S2 ' + name + ': ds-0076..ds-0100 i rekkefølge (halerekken fullfører 100-item-forkanten)');
  ok(new Set(ids).size === 25, 'S2 ' + name + ': ids unike');
  ok(d.items.every((it) => it.kind === 'likert' && it.lang === (name === 'no' ? 'no' : 'en')), 'S2 ' + name + ': alle kind likert, riktig lang');
}
ok(ds1No.items[39].id === 'ds-0040' && ds2No.items[0].id === 'ds-0041' && ds2No.items[34].id === 'ds-0075' && defNo.items[0].id === 'ds-0076', 'S2b id-forkantkjede: ds-0040 (DS1-slutt) -> ds-0041 (DS2-start) -> ds-0075 (DS2-slutt) -> ds-0076 (DS3-start) eksplisitt');
ok(da1No.items[39].id === 'da-0040' && da2No.items[0].id === 'da-0041' && da3No.items[0].id === 'da-0076', 'S2c da-forkanten urokkert: da-0040/da-0041/da-0076 som de var');
// ADHD-total eksplisitt programmert: 100 unike da-0001..da-0100, ingen hull, ingen overlap — urokkert av denne leveransen
const daIds = [...da1No.items, ...da2No.items, ...da3No.items].map((i) => i.id);
ok(JSON.stringify(daIds) === JSON.stringify(Array.from({ length: 100 }, (_, i) => 'da-' + String(i + 1).padStart(4, '0'))), 'S2c2 ADHD-total eksplisitt: da-0001..da-0100 kontinuerlig, ingen hull ingen overlap');
// autisme-total FULLFØRT eksplisitt programmert: DS1+DS2+DS3 = 100 unike ds-0001..ds-0100, ingen hull, ingen overlap
const dsIds = [...ds1No.items, ...ds2No.items, ...defNo.items].map((i) => i.id);
ok(JSON.stringify(dsIds) === JSON.stringify(Array.from({ length: 100 }, (_, i) => 'ds-' + String(i + 1).padStart(4, '0'))), 'S2c3 autisme-total eksplisitt: 40+35+25=100 unike ds-0001..ds-0100 kontinuerlig, ingen hull ingen overlap');

/* ---------- S3: skala-mapping, alle sign 1 ---------- */
ok(defNo.items.every((it) => JSON.stringify(it.scales) === JSON.stringify([{ id: 'ds3', sign: 1 }])), 'S3 alle skala-referanser { ds3, sign 1 } (screening i én retning, NG-4 dokumentert)');
ok(defEn.items.every((it) => JSON.stringify(it.scales) === JSON.stringify([{ id: 'ds3', sign: 1 }])), 'S3b EN samme skala-mapping');
ok(defNo.scoring.type === 'trait' && defNo.scoring.norms === 'none' && JSON.stringify(defNo.scoring.traits) === JSON.stringify([{ id: 'ds3', weight: 1 }]), 'S3c scoring trait [ds3 weight 1] norms none (batch-del; 3-trait-formen materialiseres ved autism-dyp-merge)');
ok(defNo.dimensions.length === 1 && defNo.dimensions[0].id === 'ds3' && defNo.dimensions[0].labelLanguage === 'no', 'S3d dimension ds3, labelLanguage no');
ok(spec.deepPoolDecision.autismThemes[2].name === defNo.dimensions[0].label, 'S3e NO-etikett byte-identisk med spec deepPoolDecision.autismThemes[2].name');
ok(ds1No.dimensions[0].label === spec.deepPoolDecision.autismThemes[0].name && ds2No.dimensions[0].label === spec.deepPoolDecision.autismThemes[1].name && ds1No.dimensions[0].label !== defNo.dimensions[0].label && ds2No.dimensions[0].label !== defNo.dimensions[0].label, 'S3f DS1/DS2-etiketter urokkerte — poolene skiller seg ad');

/* ---------- S4: stilregler (poolQC) ---------- */
const NO_ABS = /(alltid|aldri|always|never)/i;
const NO_DIAG = /(diagnos| DSM |DIVA|Conners|SRS-2|CAT-Q|RAADS|autism spectrum|asperger|lidelse| disorder )/i;
const NO_RISK = /(vold|violens|våpen|weapon|violence|slåss|fight|selvskade|selvmord|self[- ]harm|suicid|hurt myself|skade meg selv|medisin|medikament|medication|medicine|pill |dose)/i;
const wc = (t) => t.split(/\s+/).filter(Boolean).length;
for (const [name, d] of [['no', defNo], ['en', defEn]]) {
  ok(d.items.every((it) => wc(it.text) >= 8 && wc(it.text) <= 14), 'S4 ' + name + ': 8-14 ord (alle)');
  ok(d.items.every((it) => /[.!?]$/.test(it.text)), 'S4 ' + name + ': avslutter som setning');
  ok(d.items.every((it) => !NO_ABS.test(it.text)), 'S4 ' + name + ': ingen absolutter');
  ok(d.items.every((it) => !NO_DIAG.test(it.text)), 'S4 ' + name + ': ingen diagnostisk/instrument-tekst i items');
  ok(d.items.every((it) => !NO_RISK.test(it.text)), 'S4 ' + name + ': ingen ekstrem risiko/selvskade/medisinering-token');
}
ok([...defNo.items, ...defEn.items].every((it) => !it.text.includes(';') && (it.text.match(/\?/g) || []).length <= 1), 'S4c ingen sammenkjede-tegn/høyest ett spørsmålstegn');

/* ---------- S4d: ASRS-6Q-fragment-stammen er fraværende (verbatim-kloning forbudt) ---------- */
const FRAGS = ['how often do you', 'careless mistakes', 'leave your seat', 'fidget with', 'difficulty waiting', 'unwinding', 'annoyed by', 'interrupt others', 'how often do'];
const blobAll = [defNo.items.map((i) => i.text), defEn.items.map((i) => i.text)].flat().join(' | ').toLowerCase();
ok(FRAGS.every((f) => !blobAll.includes(f)), 'S4d ingen ASRS-6Q-formuleringsfragmenter (verbatim-kontrakt: null reformulering/ellipse/parafrase)');

/* ---------- S5: options byte-paritet mot ipip50 ---------- */
const canon = (o) => JSON.stringify(o);
const ipipOptsNo = ipipNo.items[0].options;
const ipipOptsEn = ipipEn.items[0].options;
ok(ipipNo.items.every((it) => canon(it.options) === canon(ipipOptsNo)), 'S5a forutsetning: ipip50 NO options homogene');
ok(ipipEn.items.every((it) => canon(it.options) === canon(ipipOptsEn)), 'S5b forutsetning: ipip50 EN options homogene');
ok(defNo.items.every((it) => canon(it.options) === canon(ipipOptsNo)), 'S5c NO options byte-identiske med def-ipip50-big5.no.json');
ok(defEn.items.every((it) => canon(it.options) === canon(ipipOptsEn)), 'S5d EN options byte-identiske med def-ipip50-big5.en.json');
ok(canon(ipipOptsNo) !== canon(ipipOptsEn), 'S5e NO/EN options forskjellige (språk-ankeret)');

/* ---------- S6: NO/EN ekvivalens + separat forfattet ---------- */
const idsNo = defNo.items.map((i) => i.id);
ok(JSON.stringify(defEn.items.map((i) => i.id)) === JSON.stringify(idsNo), 'S6a samme id-rekkefølge i begge filer');
const pairTexts = defEn.items.map((it, i) => [defNo.items[i].text, it.text]);
ok(pairTexts.every(([a, b]) => a !== b), 'S6b alle NO/EN-tekstpar ulike (separat forfattet)');
const allTexts = [...defNo.items.map((i) => i.text), ...defEn.items.map((i) => i.text)];
ok(new Set(allTexts).size === 50, 'S6c alle 50 tekster unike');
// 5-gram kryss mot triage + DA1/DA2/DA3 + DS1 + DS2 (begge språk, 0 toleranse)
const grams = (t) => {
  const toks = t.toLowerCase().replace(/[^a-zæøå0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  const out = new Set();
  for (let i = 0; i + 4 < toks.length; i++) out.add(toks.slice(i, i + 5).join(' '));
  return out;
};
for (const [lang, mine, tri] of [['no', defNo, triageNo], ['en', defEn, triageEn]]) {
  let g = new Set();
  for (const it of tri.items) for (const x of grams(it.text)) g.add(x);
  for (const other of [da1No, da1En, da2No, da2En, da3No, da3En, ds1No, ds1En, ds2No, ds2En]) {
    for (const it of other.items) for (const x of grams(it.text)) g.add(x);
  }
  let hits = [];
  for (const it of mine.items) { const inter = [...grams(it.text)].filter((x) => g.has(x)); if (inter.length) hits.push(it.id + ':' + inter[0]); }
  ok(hits.length === 0, 'S6f ' + lang + ': 5-gram-kryss mot triage + DA1/DA2/DA3 + DS1 + DS2 0 sammenfall (fikk ' + JSON.stringify(hits.slice(0, 3)) + ')');
}

/* ---------- S7: ekte scoring.js — probe-def, håndregning ---------- */
const scoringMod = await import('file://' + join(PROD, 'tests/engine/scoring.js'));
const { scoreTest } = scoringMod;
const mkItem = (id, v) => ({ id, kind: 'likert', lang: 'no', text: 'Probe-item ' + id + ' for engine-prøven av autisme-dyp-pool-del-3.', options: ipipOptsNo, scales: [{ id: 'ds3', sign: 1 }] });
const probeDef = {
  schemaVersion: 1, id: 'nd-autisme-dyp-ds3-probe', type: 'test-definition', family: 'pool', languages: ['no'],
  scoring: { type: 'trait', traits: [{ id: 'ds3', weight: 1 }], norms: 'none' },
  dimensions: [{ id: 'ds3', label: 'Hverdagen, energi og tilpasning', labelLanguage: 'no', description: 'Probe-akse ds3.' }],
  items: [mkItem('pb-0001'), mkItem('pb-0002'), mkItem('pb-0003')],
};
const ans1 = { 'pb-0001': { kind: 'likert', lang: 'no', value: 5 }, 'pb-0002': { kind: 'likert', lang: 'no', value: 4 }, 'pb-0003': { kind: 'likert', lang: 'no', value: 3 } };
const r1 = scoreTest(probeDef, mkPayload(probeDef, ans1, ['pb-0001', 'pb-0002', 'pb-0003']));
ok(r1.ok === true, 'S7 probe scores ok');
const sA = r1.result.scales.find((s) => s.id === 'ds3');
ok(near(sA.normalized, 75, 1e-9), 'S7 ds3 normalized 75.0 håndregnet (raw 12, vindu [3,15]) (fikk ' + sA.normalized + ')');
ok(near(r1.result.total.composite, 75, 1e-9), 'S7 komposit 75.0 = én skala weight 1 (fikk ' + r1.result.total.composite + ')');

/* ---------- S8: hele pooldefen mot ekte motor ---------- */
const mkAns = (d, v) => { const a = {}; for (const it of d.items) a[it.id] = { kind: 'likert', lang: 'no', value: v }; return a; };
const rAll5 = scoreTest(defNo, mkPayload(defNo, mkAns(defNo, 5), defNo.items.map((i) => i.id)));
ok(rAll5.ok, 'S8 pool scores for alle-5');
ok(near(rAll5.result.scales.find((s) => s.id === 'ds3').normalized, 100, 1e-9) && near(rAll5.result.total.composite, 100, 1e-9), 'S8 alle-5 -> ds3 100, komposit 100');
const rAll1 = scoreTest(defNo, mkPayload(defNo, mkAns(defNo, 1), defNo.items.map((i) => i.id)));
ok(near(rAll1.result.scales.find((s) => s.id === 'ds3').normalized, 0, 1e-9), 'S8 alle-1 -> ds3 0 (fikk ' + rAll1.result.scales.find((s) => s.id === 'ds3').normalized + ')');
// 55.0-grensen over ekte motor på 5 items: raw 16 i vindu [5,25] -> 55.0 eksakt (ds-0076..ds-0080)
const b5 = defNo.items.slice(0, 5);
const b5ans = {};
for (const v of ['ds-0076:3', 'ds-0077:3', 'ds-0078:3', 'ds-0079:4', 'ds-0080:3']) { const [id, val] = v.split(':'); b5ans[id] = { kind: 'likert', lang: 'no', value: Number(val) }; }
const rB = scoreTest(defNo, mkPayload(defNo, b5ans, b5.map((i) => i.id)));
ok(near(rB.result.scales.find((s) => s.id === 'ds3').normalized, 55, 1e-9), 'S8b grense: 5 ds3-items sum 16 -> normalized 55.0 eksakt (fikk ' + rB.result.scales.find((s) => s.id === 'ds3').normalized + ')');
// sign=-1-inversjon: dokumenterer hvorfor poolen står i sign 1
const revDef = JSON.parse(JSON.stringify(probeDef));
revDef.id = 'nd-autisme-dyp-ds3-probe-rev';
revDef.items[0].scales[0].sign = -1;
const rRev = scoreTest(revDef, mkPayload(revDef, { 'pb-0001': { kind: 'likert', lang: 'no', value: 5 }, 'pb-0002': { kind: 'likert', lang: 'no', value: 4 } }, ['pb-0001', 'pb-0002']));
ok(near(rRev.result.scales.find((s) => s.id === 'ds3').normalized, 37.5, 1e-9), 'S8c sign=-1 inverterer: raw -1 i vindu [-4,4] -> 37.5 håndregnet (fikk ' + rRev.result.scales.find((s) => s.id === 'ds3').normalized + ')');

/* ---------- S9: itemspec-kryssles ---------- */
const th = spec.deepPoolDecision.autismThemes[2];
ok(th.id === 'DS3' && th.idPrefix === 'ds' && th.poolMin === 25, 'S9a DS3-prefix ds + poolMin 25 per spec');
ok(th.construct.includes('Energiforbruk') && th.construct.includes('masking'), 'S9b DS3-konstrukt dekker temabåndene');
const tl = meta.themeLabels;
ok(Object.keys(tl).length === 5 && tl['1'] && tl['5'], 'S9c themeLabels 5 bånd i meta');
ok(spec.poolDesign.deepPools[1].prefix === 'ds' && spec.poolDesign.deepPools[1].poolMin === 100, 'S9d dyp-pool plan: prefix ds, poolMin 100 (del 3 = 25 av 100, autisme-forkanten nå full 100/100)');
ok(spec.defFilePlan.naming.includes('def-nd-autisme-dyp-pool.<lang>.json'), 'S9e defFilePlan-naming foranlediger kanonisk poolnavn ved merge');
ok((meta.holes.opens || '').includes('def-nd-autisme-dyp-pool'), 'S9f holes.opens dokumenterer sammenslåingen til kanonisk navn');
ok(spec.poolDesign.poolQC.includes('ingen dobbeltspørsmål') && spec.poolDesign.poolQC.includes('ingen klinisk-diagnostiske'), 'S9g poolQC-regler forankret i spec');
ok(JSON.stringify(spec.languagePlan.languages) === JSON.stringify(['no', 'en']), 'S9h languagePlan no+en');
ok(spec.scoringContracts.deepPools.includes('3 tema-id-er'), 'S9i scoringContracts.deepPools pinner 3 tema-skalaer i finalen');
ok(spec.anchorDecision.value.autismAnchor.includes('BYGG') || /BYGG|null/i.test(spec.anchorDecision.value.autismAnchor), 'S9j autisme-ankeret er BYGG-originale items — ASRS aldri autisme-anker (verbatim-kontrakt ADHD-ankeret)');
ok(spec.status === 'PROPOSED' && spec.specVersion === 1, 'S9k spec PROPOSED v1 (GJELDENDE ved #3813)');
ok(spec.noteIds.includes('scoring.not-diagnosis') && spec.noteIds.includes('note.threshold.screening'), 'S9l noteIds for visningslaget pinnede i spec (poolen leverer ingen egen disclaimer — schema v1: traitScoring har ikke disclaimer-felt)');
ok(/DOC-C8C02AD272/.test(meta.licenseBasis), 'S9m lisensforankring i meta');
ok(/NG-4/.test(meta.keyingRule), 'S9n NG-4-avviket dokumentert i meta');
ok(meta.boardLeaf.includes('#3832'), 'S9o boardLeaf #3832');

/* ---------- S10: meta-konsistens ---------- */
ok(meta.items.length === 25, 'S10a meta 25 rader');
const tc = meta.themeCounts;
ok(tc['ds3-t1'] === 5 && tc['ds3-t2'] === 5 && tc['ds3-t3'] === 5 && tc['ds3-t4'] === 5 && tc['ds3-t5'] === 5, 'S10b tema 5/5/5/5/5 (fikk ' + JSON.stringify(tc) + ')');
const nearIds = meta.items.filter((r) => r.asrsNear).map((r) => r.id);
ok(JSON.stringify(nearIds) === JSON.stringify([]), 'S10c asrsNear tom-liste låst (triage-presedenten + ASRS aldri autisme-anker) — fikk ' + JSON.stringify(nearIds));
ok(ds1Meta.items.every((r) => !r.asrsNear) && ds2Meta.items.every((r) => !r.asrsNear), 'S10c2 autisme-presedens bekreftet: alle ds1/ds2-items i metaene står asrsNear False');
const triageMeta = J(join(PROD, 'tests/schema/nd_pool/_nd_triage_pool_meta.json'));
ok(triageMeta.items.filter((r) => r.id.startsWith('ts-')).every((r) => !r.asrsNear), 'S10c3 triage-presedent bekreftet: alle ts-items står asrsNear False');
ok(meta.items.every((r) => r.dimension === 'ds3' && /^ds3-t[1-5]$/.test(r.theme)), 'S10d radene har dimension ds3 + tema ds3-t1..t5');
ok((meta.asrsNearPolicy || '').includes('TOM-liste'), 'S10e asrsNearPolicy dokumenterer tom-listen');
ok((meta.holes.closes || '').includes('100/100'), 'S10f holes.closes: autisme-dyp full 100/100');
const byId = new Map(meta.items.map((r) => [r.id, r]));
const expTheme = (i) => 'ds3-t' + (i < 5 ? 1 : i < 10 ? 2 : i < 15 ? 3 : i < 20 ? 4 : 5);
ok(defNo.items.every((it, i) => byId.get(it.id).theme === expTheme(i)), 'S10g tema-bånd 5/5/5/5/5 i rekkefølge i def + meta sammenfalle');
ok(defNo.items.every((it, i) => byId.get(it.id).theme === byId.get(defEn.items[i].id).theme), 'S10h NO/EN konstrukt-ekvivalens: samme tema per id via meta');

/* ---------- S11: copyright-/risiko-skann i item-tekster ---------- */
const forbidden = ['asrs', 'raads', 'diva', 'conners', 'srs-2', 'cat-q', 'dsm', 'wais', 'mensa', 'raven', 'diagnos', 'asperger'];
const hitWords = forbidden.filter((w) => blobAll.includes(w));
ok(hitWords.length === 0, 'S11a ingen instrument-/diagnose-navn i item-tekster (treff: ' + JSON.stringify(hitWords) + ')');
ok(!NO_ABS.test(blobAll), 'S11b ingen absolutter i item-tekster');
const riskHits = ['self-harm', 'suicid', 'medication', 'medicine', 'vold', 'våpen'].filter((w) => blobAll.includes(w));
ok(riskHits.length === 0, 'S11d ingen risiko/medisinering-tekster (treff: ' + JSON.stringify(riskHits) + ')');

/* ---------- S13: determinisme — generator re-kjoring byte-identisk ---------- */
const tmp = join(HERE, '_tmp_regen_ds3');
let GEN = join(HERE, 'gen_nd_autisme_pool_ds3.py');
mkdirSync(tmp, { recursive: true });
ok(existsSync(GEN), 'S13 generator til stede');
// S13 trenger corpus-filer i HERE — leveres allerede i staging-katalogen
execFileSync('python3', [GEN, '--out', tmp], { cwd: HERE });
for (const f of ['def-nd-autisme-dyp-pool-ds3.no.json', 'def-nd-autisme-dyp-pool-ds3.en.json', '_nd_autisme_dyp_meta_ds3.json']) {
  ok(md5(join(tmp, f)) === md5(join(HERE, f)), 'S13 ' + f + ' byte-identisk ved re-kjoring');
}

/* ---------- S14: sessionSizeFor + engine-motor ---------- */
ok(sessionSizeFor(defNo) === 25, 'S14a sessionSizeFor -> 25 (alle pool-items)');
ok(sessionSizeFor(defEn) === 25, 'S14b sessionSizeFor EN -> 25');

/* ---------- rapport ---------- */
const report = {
  id: 'nd_autisme_dyp_ds3_selftest',
  date: '2026-11-17',
  boardTodo: '#3832',
  total: checks.length,
  fails,
  checks,
};
writeFileSync(join(HERE, '_nd_autisme_dyp_ds3_selftest_report.json'), JSON.stringify(report, null, 2) + '\n');
console.log('TOTAL ' + checks.length + ' | FAILS ' + fails);
if (fails) { console.log(checks.filter((c) => c.startsWith('FAIL')).join('\n')); process.exit(1); }
