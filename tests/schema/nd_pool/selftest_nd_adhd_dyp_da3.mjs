/*
 * Selftest — ADHD-dyp pool del 3: DA3 Hverdagsfungering/konsekvens (todo #3828).
 * S0–S14, konvensjon: selftest_nd_adhd_dyp_da2.mjs (søster i samme spor).
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
const FILES = ['def-nd-adhd-dyp-pool-da3.no.json', 'def-nd-adhd-dyp-pool-da3.en.json', '_nd_adhd_dyp_meta_da3.json', 'gen_nd_adhd_pool_da3.py'];
ok(FILES.every((f) => existsSync(join(HERE, f))), 'S0 leveransefiler til stede i ' + HERE);

const defNo = J(join(HERE, 'def-nd-adhd-dyp-pool-da3.no.json'));
const defEn = J(join(HERE, 'def-nd-adhd-dyp-pool-da3.en.json'));
const meta = J(join(HERE, '_nd_adhd_dyp_meta_da3.json'));
const spec = J(join(PROD, 'tests/schema/_nd_itemspec_spec.json'));
const ipipNo = J(join(PROD, 'tests/schema/def-ipip50-big5.no.json'));
const ipipEn = J(join(PROD, 'tests/schema/def-ipip50-big5.en.json'));
const triageNo = J(join(PROD, 'tests/schema/nd_pool/def-nd-triage-pool.no.json'));
const triageEn = J(join(PROD, 'tests/schema/nd_pool/def-nd-triage-pool.en.json'));
const da1No = J(join(PROD, 'tests/schema/nd_pool/def-nd-adhd-dyp-pool-da1.no.json'));
const da1En = J(join(PROD, 'tests/schema/nd_pool/def-nd-adhd-dyp-pool-da1.en.json'));
const da2No = J(join(PROD, 'tests/schema/nd_pool/def-nd-adhd-dyp-pool-da2.no.json'));
const da2En = J(join(PROD, 'tests/schema/nd_pool/def-nd-adhd-dyp-pool-da2.en.json'));

/* ---------- S1: AJV + validateTestDef ---------- */
let Ajv;
try { const m = await import('ajv'); Ajv = m.default; }
catch { Ajv = (await import('file://' + join(PROD, 'node_modules/ajv/lib/ajv.js'))).default; }
ok(typeof Ajv === 'function', 'S1 ajv lastet (lokal eller prod-fallback)');
const schema = J(join(PROD, 'tests/schema/test-definition.schema.json'));
const ajv = new Ajv({ strict: false, allErrors: true, validateSchema: false });
const valid = ajv.compile(schema);
ok(valid(defNo), 'S1 AJV def-nd-adhd-dyp-pool-da3.no :: ' + JSON.stringify(valid.errors || []));
ok(valid(defEn), 'S1 AJV def-nd-adhd-dyp-pool-da3.en :: ' + JSON.stringify(valid.errors || []));
const { validateTestDef, sessionSizeFor } = await import('file://' + join(PROD, 'tests/engine/render.js'));
const verrNo = validateTestDef(defNo), verrEn = validateTestDef(defEn);
const errsOf = (v) => (Array.isArray(v) ? v : (v && v.errors) || []);
ok(verrNo.ok !== false && errsOf(verrNo).length === 0, 'S1 validateTestDef NO :: ' + JSON.stringify(verrNo));
ok(verrEn.ok !== false && errsOf(verrEn).length === 0, 'S1 validateTestDef EN :: ' + JSON.stringify(verrEn));
ok(defNo.family === 'pool' && defEn.family === 'pool', 'S1b family pool per itemspec.defFilePlan (schema enum v1 har ikke egen ND-verdi)');
ok(defNo.id === 'nd-adhd-dyp-pool-da3' && defEn.id === 'nd-adhd-dyp-pool-da3' && meta.id === 'nd-adhd-dyp-pool-da3', 'S1c id nd-adhd-dyp-pool-da3 i alle tre filer');
ok(JSON.stringify(defNo.languages) === JSON.stringify(['no']) && JSON.stringify(defEn.languages) === JSON.stringify(['en']), 'S1d én fil per språk');

/* ---------- S2: id-mønster, rekkefølge, 25 items ---------- */
const IDPAT = /^[a-z0-9]+(-[a-z0-9]+)*$/;
for (const [name, d] of [['no', defNo], ['en', defEn]]) {
  ok(d.items.length === 25, 'S2 ' + name + ': 25 items');
  const ids = d.items.map((i) => i.id);
  ok(ids.every((id) => IDPAT.test(id)), 'S2 ' + name + ': alle ids matcher mønster ^[a-z0-9]+(-[a-z0-9]+)*$');
  const want = Array.from({ length: 25 }, (_, i) => 'da-' + String(i + 76).padStart(4, '0'));
  ok(JSON.stringify(ids) === JSON.stringify(want), 'S2 ' + name + ': da-0076..da-0100 i rekkefølge (del 3, halerekken av 100-item-forkanten)');
  ok(new Set(ids).size === 25, 'S2 ' + name + ': ids unike');
  ok(d.items.every((it) => it.kind === 'likert' && it.lang === (name === 'no' ? 'no' : 'en')), 'S2 ' + name + ': alle kind likert, riktig lang');
}
ok(defNo.items[0].id === 'da-0076' && da2No.items[34].id === 'da-0075' && da1No.items[39].id === 'da-0040', 'S2b forkant-kjede: da-0040 (del 1) -> da-0075 (del 2) -> da-0076 (del 3), null overlapping');
const allDa = [...da1No.items, ...da2No.items, ...defNo.items].map((i) => i.id);
ok(allDa.length === 100 && new Set(allDa).size === 100, 'S2c ADHD-total bekreftet: 40+35+25 = 100 items, 100 unike ids');
ok(JSON.stringify(allDa.slice().sort()) === JSON.stringify(Array.from({ length: 100 }, (_, i) => 'da-' + String(i + 1).padStart(4, '0'))), 'S2c2 union er nøyaktig da-0001..da-0100 (ingen hull, ingen overlap)');

/* ---------- S3: skala-mapping, alle sign 1 ---------- */
ok(defNo.items.every((it) => JSON.stringify(it.scales) === JSON.stringify([{ id: 'da3', sign: 1 }])), 'S3 alle skala-referanser { da3, sign 1 } (screening i én retning, NG-4 dokumentert)');
ok(defEn.items.every((it) => JSON.stringify(it.scales) === JSON.stringify([{ id: 'da3', sign: 1 }])), 'S3b EN samme skala-mapping');
ok(defNo.scoring.type === 'trait' && defNo.scoring.norms === 'none' && JSON.stringify(defNo.scoring.traits) === JSON.stringify([{ id: 'da3', weight: 1 }]), 'S3c scoring trait [da3 weight 1] norms none (batch-del; 3-trait-formen materialiseres ved sammenslåingen)');
ok(defNo.dimensions.length === 1 && defNo.dimensions[0].id === 'da3' && defNo.dimensions[0].labelLanguage === 'no', 'S3d dimension da3, labelLanguage no');
ok(spec.deepPoolDecision.adhdThemes[2].name === defNo.dimensions[0].label, 'S3e NO-etikett byte-identisk med spec deepPoolDecision.adhdThemes[2].name (fikk ' + defNo.dimensions[0].label + ')');
ok(spec.deepPoolDecision.adhdThemes[0].name === da1No.dimensions[0].label && spec.deepPoolDecision.adhdThemes[1].name === da2No.dimensions[0].label
  && da1No.dimensions[0].label !== da2No.dimensions[0].label && defNo.dimensions[0].label !== da1No.dimensions[0].label && defNo.dimensions[0].label !== da2No.dimensions[0].label,
  'S3f DA1/DA2-etiketter urokkert og adskilt fra DA3 — poolene skiller seg ad');

/* ---------- S4: stilregler (poolQC) ---------- */
const NO_ABS = /(alltid|aldri|always|never)/i;
const NO_DIAG = /(diagnos| DSM |DIVA|Conners|SRS-2|CAT-Q|RAADS|lidelse| disorder |autism spectrum disorder)/i;
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
const FRAGS = ['how often do you', 'careless mistakes', 'leave your seat', 'fidget with', 'difficulty waiting', 'unwinding', 'annoyed by', 'interrupt others'];
const blobAll = [defNo.items.map((i) => i.text), defEn.items.map((i) => i.text)].flat().join(' | ').toLowerCase();
ok(FRAGS.every((f) => !blobAll.includes(f)), 'S4d ingen ASRS-6Q-formuleringsfragmenter (verbatim-kontrakt: null reformulering/ellipse/parafrase)');

/* ---------- S5: options byte-paritet mot ipip50 ---------- */
const canon = (o) => JSON.stringify(o);
const ipipOptsNo = ipipNo.items[0].options;
const ipipOptsEn = ipipEn.items[0].options;
ok(ipipNo.items.every((it) => canon(it.options) === canon(ipipOptsNo)), 'S5a forutsetning: ipip50 NO options homogene');
ok(ipipEn.items.every((it) => canon(it.options) === canon(ipipOptsEn)), 'S5b forutsetning: ipip50 EN options homogene');
ok(defNo.items.every((it) => canon(it.options) === canon(ipipOptsNo)), 'S5c NO options byte-identisk med ipip50-ankeret');
ok(defEn.items.every((it) => canon(it.options) === canon(ipipOptsEn)), 'S5d EN options byte-identisk med ipip50-ankeret');
ok(defNo.items.every((it) => it.options.length === 5), 'S5e 5-punkts skala');

/* ---------- S6: separat forfattet — 50 unike + 5-gram-kryss ---------- */
const textsNo = defNo.items.map((i) => i.text), textsEn = defEn.items.map((i) => i.text);
const da1texts = [...da1No.items.map((i) => i.text), ...da1En.items.map((i) => i.text)];
const da2texts = [...da2No.items.map((i) => i.text), ...da2En.items.map((i) => i.text)];
ok(new Set([...textsNo, ...textsEn]).size === 50, 'S6a 50 unike tekster (NO og EN separat forfattet)');
ok(textsNo.every((t) => !textsEn.includes(t) && !da1texts.includes(t) && !da2texts.includes(t)), 'S6b ingen tekstdeling mot egen EN eller DA1/DA2');
const grams = (t) => {
  const toks = t.toLowerCase().normalize('NFC').replace(/[^a-zæøå0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  return new Set(toks.length >= 5 ? toks.slice(0, -4).map((_, i) => toks.slice(i, i + 5).join(' ')) : []);
};
const corpusDefs = { no: [triageNo, da1No, da2No], en: [triageEn, da1En, da2En] };
for (const [lang, mine] of [['no', defNo], ['en', defEn]]) {
  const g = new Set();
  for (const c of corpusDefs[lang]) for (const it of c.items) for (const x of grams(it.text)) g.add(x);
  let hits = [];
  for (const it of mine.items) { const inter = [...grams(it.text)].filter((x) => g.has(x)); if (inter.length) hits.push(it.id + ':' + inter[0]); }
  ok(hits.length === 0, 'S6f ' + lang + ': 5-gram-kryss mot triage-, DA1- og DA2-poolen 0 sammenfall (fikk ' + JSON.stringify(hits.slice(0, 3)) + ')');
}

/* ---------- S7: ekte scoring.js — probe-def, håndregning ---------- */
const scoringMod = await import('file://' + join(PROD, 'tests/engine/scoring.js'));
const { scoreTest } = scoringMod;
const mkItem = (id, v) => ({ id, kind: 'likert', lang: 'no', text: 'Probe-item ' + id + ' for engine-prøven av ADHD-dyp-pool-del-3.', options: ipipOptsNo, scales: [{ id: 'da3', sign: 1 }] });
const probeDef = {
  schemaVersion: 1, id: 'nd-adhd-dyp-da3-probe', type: 'test-definition', family: 'pool', languages: ['no'],
  scoring: { type: 'trait', traits: [{ id: 'da3', weight: 1 }], norms: 'none' },
  dimensions: [{ id: 'da3', label: 'Hverdagsfungering og konsekvens', labelLanguage: 'no', description: 'Probe-akse da3.' }],
  items: [mkItem('pb-0001'), mkItem('pb-0002'), mkItem('pb-0003')],
};
const ans1 = { 'pb-0001': { kind: 'likert', lang: 'no', value: 5 }, 'pb-0002': { kind: 'likert', lang: 'no', value: 4 }, 'pb-0003': { kind: 'likert', lang: 'no', value: 3 } };
const r1 = scoreTest(probeDef, mkPayload(probeDef, ans1, ['pb-0001', 'pb-0002', 'pb-0003']));
ok(r1.ok === true, 'S7 probe scores ok');
const sA = r1.result.scales.find((s) => s.id === 'da3');
ok(near(sA.normalized, 75, 1e-9), 'S7 da3 normalized 75.0 håndregnet (raw 12, vindu [3,15]) (fikk ' + sA.normalized + ')');
ok(near(r1.result.total.composite, 75, 1e-9), 'S7 komposit 75.0 = én skala weight 1 (fikk ' + r1.result.total.composite + ')');

/* ---------- S8: hele pooldefen mot ekte motor ---------- */
const mkAns = (d, v) => { const a = {}; for (const it of d.items) a[it.id] = { kind: 'likert', lang: 'no', value: v }; return a; };
const rAll5 = scoreTest(defNo, mkPayload(defNo, mkAns(defNo, 5), defNo.items.map((i) => i.id)));
ok(rAll5.ok, 'S8 pool scores for alle-5');
ok(near(rAll5.result.scales.find((s) => s.id === 'da3').normalized, 100, 1e-9) && near(rAll5.result.total.composite, 100, 1e-9), 'S8 alle-5 -> da3 100, komposit 100');
const rAll1 = scoreTest(defNo, mkPayload(defNo, mkAns(defNo, 1), defNo.items.map((i) => i.id)));
ok(near(rAll1.result.scales.find((s) => s.id === 'da3').normalized, 0, 1e-9), 'S8 alle-1 -> da3 0 (fikk ' + rAll1.result.scales.find((s) => s.id === 'da3').normalized + ')');
// 55.0-grensen over ekte motor på 5 items: raw 16 i vindu [5,25] -> 55.0 eksakt (da-0076..da-0080)
const b5 = defNo.items.slice(0, 5);
const b5ans = {};
for (const v of ['da-0076:3', 'da-0077:3', 'da-0078:4', 'da-0079:3', 'da-0080:3']) { const [id, val] = v.split(':'); b5ans[id] = { kind: 'likert', lang: 'no', value: Number(val) }; }
const rB = scoreTest(defNo, mkPayload(defNo, b5ans, b5.map((i) => i.id)));
ok(near(rB.result.scales.find((s) => s.id === 'da3').normalized, 55, 1e-9), 'S8b grense: 5 da3-items sum 16 -> normalized 55.0 eksakt (fikk ' + rB.result.scales.find((s) => s.id === 'da3').normalized + ')');
// sign=-1-inversjon: dokumenterer hvorfor poolen står i sign 1
const revDef = JSON.parse(JSON.stringify(probeDef));
revDef.id = 'nd-adhd-dyp-da3-probe-rev';
revDef.items[0].scales[0].sign = -1;
const rRev = scoreTest(revDef, mkPayload(revDef, { 'pb-0001': { kind: 'likert', lang: 'no', value: 5 }, 'pb-0002': { kind: 'likert', lang: 'no', value: 4 } }, ['pb-0001', 'pb-0002']));
ok(near(rRev.result.scales.find((s) => s.id === 'da3').normalized, 37.5, 1e-9), 'S8c sign=-1 inverterer: raw -1 i vindu [-4,4] -> 37.5 håndregnet (fikk ' + rRev.result.scales.find((s) => s.id === 'da3').normalized + ')');

/* ---------- S9: itemspec-kryssles ---------- */
const th = spec.deepPoolDecision.adhdThemes[2];
ok(th.id === 'DA3' && th.idPrefix === 'da' && th.poolMin === 25, 'S9a DA3-prefix da + poolMin 25 per spec');
ok(th.construct.includes('funksjons-impact') && th.construct.includes('administrasjon'), 'S9b DA3-konstrukt dekker temabåndene (funksjons-impact i konstruktet, administrasjon i bånd 3)');
const tl = meta.themeLabels;
ok(Object.keys(tl).length === 5 && tl['1'] && tl['5'], 'S9c themeLabels 5 bånd i meta');
ok(spec.poolDesign.deepPools[0].prefix === 'da' && spec.poolDesign.deepPools[0].poolMin === 100, 'S9d dyp-pool plan: prefix da, poolMin 100 (del 3 = 25 av 100, forkanten nå full)');
ok(spec.defFilePlan.naming.includes('def-nd-adhd-dyp-pool.<lang>.json'), 'S9e defFilePlan-naming foranlediger kanonisk poolnavn ved sammenslåingen');
ok((meta.holes.opens || '').includes('def-nd-adhd-dyp-pool'), 'S9f holes.opens dokumenterer sammenslåingen til kanonisk navn ved neste steg');
ok(spec.poolDesign.poolQC.includes('ingen dobbeltspørsmål') && spec.poolDesign.poolQC.includes('ingen klinisk-diagnostiske'), 'S9g poolQC-regler forankret i spec');
ok(JSON.stringify(spec.languagePlan.languages) === JSON.stringify(['no', 'en']), 'S9h languagePlan no+en');
ok(spec.scoringContracts.deepPools.includes('3 tema-id-er'), 'S9i scoringContracts.deepPools pinner 3 tema-skalaer i finalen');
ok(spec.anchorDecision.asrsPlacement.adhdDeep.includes('ASRS') && spec.anchorDecision.asrsPlacement.adhdDeep.includes('#3760'), 'S9j ASRS-blokken bor i live-def (#3760-ark), aldri i poolen — verbatim-kontrakt');
ok(spec.status === 'PROPOSED' && spec.specVersion === 1, 'S9k spec PROPOSED v1 (GJELDENDE ved #3813)');
ok(spec.noteIds.includes('scoring.not-diagnosis') && spec.noteIds.includes('note.threshold.screening'), 'S9l noteIds for visningslaget pinnede i spec (poolen leverer ingen egen disclaimer — schema v1: traitScoring har ikke disclaimer-felt)');
ok(/DOC-C8C02AD272/.test(meta.licenseBasis || ''), 'S9m licenseBasis refererer DOC-C8C02AD272 (ENDLIG VERDIKT #3732)');

/* ---------- S10: meta-konsistens ---------- */
ok(meta.items.length === 25, 'S10a meta 25 rader');
const tc = meta.themeCounts;
ok(tc['da3-t1'] === 5 && tc['da3-t2'] === 5 && tc['da3-t3'] === 5 && tc['da3-t4'] === 5 && tc['da3-t5'] === 5, 'S10b tema 5/5/5/5/5 (fikk ' + JSON.stringify(tc) + ')');
ok(Object.values(tc).reduce((a, b) => a + b, 0) === 25, 'S10b2 tema-sum 25');
const nearIds = meta.items.filter((r) => r.asrsNear).map((r) => r.id);
ok(JSON.stringify(nearIds) === JSON.stringify(['da-0076', 'da-0078', 'da-0086', 'da-0093', 'da-0096']), 'S10c asrsNear-flaglista eksakt (fikk ' + JSON.stringify(nearIds) + ')');
ok(meta.items.every((r) => !r.asrsNear || (r.nearNoteNo || r.nearNoteEn)), 'S10d nærflagg har notat');
ok((meta.holes.closes || '').includes('100/100'), 'S10e holes.closes: ADHD-dyp samlet 100/100 (da1 40 + da2 35 + da3 25)');
const byId = new Map(meta.items.map((r) => [r.id, r]));
const expTheme = (i) => 'da3-t' + (i < 5 ? 1 : i < 10 ? 2 : i < 15 ? 3 : i < 20 ? 4 : 5);
ok(defNo.items.every((it, i) => byId.get(it.id).theme === expTheme(i)), 'S10f tema-bånd 5/5/5/5/5 i rekkefølge i def + meta sammenfalle');
ok(defNo.items.every((it, i) => byId.get(it.id).theme === byId.get(defEn.items[i].id).theme), 'S10g NO/EN konstrukt-ekvivalens: samme tema per id via meta');
ok(meta.items.length === 25 && meta.items.every((r) => r.dimension === 'da3'), 'S10h alle meta-rader peker da3');

/* ---------- S11: copyright-/risiko-skann i item-tekster ---------- */
const forbidden = ['asrs', 'raads', 'diva', 'conners', 'srs-2', 'cat-q', 'dsm', 'wais', 'mensa', 'raven', 'diagnos'];
const hitWords = forbidden.filter((w) => blobAll.includes(w));
ok(hitWords.length === 0, 'S11a ingen instrument-/diagnose-navn i item-tekster (treff: ' + JSON.stringify(hitWords) + ')');
ok(!NO_ABS.test(blobAll), 'S11b ingen absolutter i item-tekster');
const riskHits = ['self-harm', 'suicid', 'medication', 'medicine', 'vold', 'våpen'].filter((w) => blobAll.includes(w));
ok(riskHits.length === 0, 'S11d ingen risiko/medisinering-tekster (treff: ' + JSON.stringify(riskHits) + ')');

/* ---------- S13: determinisme — generator re-kjøring byte-identisk ---------- */
const tmp = join(HERE, '_tmp_regen_da3');
let GEN = join(HERE, 'gen_nd_adhd_pool_da3.py');
mkdirSync(tmp, { recursive: true });
ok(existsSync(GEN), 'S13 generator til stede');
execFileSync('python3', [GEN, '--out', tmp], { cwd: HERE });
for (const f of ['def-nd-adhd-dyp-pool-da3.no.json', 'def-nd-adhd-dyp-pool-da3.en.json', '_nd_adhd_dyp_meta_da3.json']) {
  ok(md5(join(tmp, f)) === md5(join(HERE, f)), 'S13 ' + f + ' byte-identisk ved re-kjøring');
}

/* ---------- S14: sessionSizeFor — hele poolen shuffles (likert) ---------- */
const sz = sessionSizeFor(defNo);
ok(sz === 25, 'S14 sessionSizeFor -> 25 (alle items trekkbar per trekk) (fikk ' + sz + ')');

/* ---------- rapport ---------- */
const report = {
  id: 'nd_adhd_dyp_da3_selftest',
  date: '2026-11-17',
  boardTodo: '#3828',
  total: checks.length,
  fails,
  checks,
};
writeFileSync(join(HERE, '_nd_adhd_dyp_da3_selftest_report.json'), JSON.stringify(report, null, 2) + '\n');
console.log('TOTAL ' + checks.length + ' | FAILS ' + fails);
if (fails) { console.log(checks.filter((c) => c.startsWith('FAIL')).join('\n')); process.exit(1); }
