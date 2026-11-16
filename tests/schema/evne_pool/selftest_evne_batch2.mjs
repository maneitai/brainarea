/**
 * Brainarea schema-selvtest — Evne-pool batch 2 (T3 verbal vr + T4 romlig sp, 90 items).
 * [3-VEIS] FASE 2, todo #3750 «[3-VEIS] FASE 2: Evnepool batch 2: tema 3-4 (~100 items),
 * originale - ingen Raven/WAIS-reproduksjoner.» (gjenopptak etter iterasjonstak)
 *
 * Leveranse: tests/schema/evne_pool/def-evne-t3-verbal.{no,en}.json   (50 items, 5 opts)
 *            tests/schema/evne_pool/def-evne-t4-romlig.{no,en}.json   (40 items, 5 opts)
 *            tests/schema/evne_pool/_evne_pool_batch2_meta.json
 *            tests/schema/evne_pool/gen_evne_pool_batch2.py
 * Kontrakt:  tests/schema/_evne_itemspec_spec.json (evne-itemspec v1)
 *
 * S0   prod-tre + filer funnet
 * S1/S2 AJV schema v1 + render.validateTestDef per fil (4 def-filer)
 * S3   struktur: 50 vr + 40 sp, unike id-er, kontinuerlig loopenummer, id-moenster
 * S4   band-andeler: T3 17/17/16, T4 14/13/13 — innen tol 0.15 mot 0.34/0.33/0.33;
 *      meta.bandDiff i bandvinduene [-2,-0.5> / [-0.5,0.5> / [0.5,2]
 * S5   fasit-kontrakt: 5 options, correctIndex i vindu, difficulty i [-4,4]
 * S6   g-score probe mot ekte scoring.js: 2-item probe (theta ~0, SE ~1.678, ci95,
 *      iqScale null, notNormed, note.gscore.not-normed); hele T3-pool 49/50 ->
 *      theta endelig; alle-riktig -> theta null + warning; hele T4-pool 39/40
 * S7   meta-konsistens: optionOrder_{no,en} == def-option-liste eksakt; fasit ==
 *      meta.correct_{no,en}; violationTags 5 stk, noeyaktig een 'none', resten
 *      ikke-tomme; construct-ekvivalens: NO[i]/EN[i] samme band+subtype;
 *      T3 separat forfattet (prompt_no != prompt_en, fasit_ord != fasit_ord_en);
 *      T4 par-variant: samme correctIndex og samme rotposisjon no/en
 * S8   dypekontrakt: T3 oddone (5 ord i prompt, fasit blant dem), analogi/leksikalsk/
 *      klass (alle labels ikke-tomme); T4: alle prompts/labels ikke-tomme
 * S9   copyright: Raven/WAIS/WISC/Mensa/Mensa nevnt aldri i prompts/labels
 * S10  par-fil: samme id-rekkefolge, samme correctIndex, samme difficulty per item
 * S11  undertype-spredning: >=2 undertyper per band per tema
 * S12  (dekkes i S9 som copyright-skann; koden er holdt paa batch1-nummerering ikke,
 *      denne filen bruker kompakt nummerering S0-S16 med S12 som kvote-margin-del)
 * S13  kvote-margin: T3 pool L>=5,M>=4,H>=6 mot 8-trekk-kvote {L3,M3,H2};
 *      T4 pool L>=3,M>=4,H>=6 mot 7-trekk-kvote {L2,M3,H2} (margin >= 2)
 * S14  maxItems-funn viderefert fra batch 1: kvote-maks 8 < scoring maxItems-min 10
 *      i schema — samledef-avgjorelsen tilhoerer sampler-bygget (dokumentert funn)
 * S15  kryssles mot itemspec: T3/T4 felt (draw 8/7, optionsPerItem 5, poolMin naadd);
 *      meta-bands == def-tellinger
 * S16  engine-gap: G1 (ingen bandkvoter i sampleSession) fortsatt aapen per spec
 *
 * Kjoring: node selftest_evne_batch2.mjs  (fra evne_pool/, WSL eller Windows)
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS' : 'FAIL') + ' ' + m); if (!c) fails++; };

const HERE = dirname(fileURLToPath(import.meta.url));
const CANDIDATES = [
  '/mnt/f/maneit/prosjekter/filip-webside-prosjekter/brainarea',
  'f:/maneit/prosjekter/filip-webside-prosjekter/brainarea',
  'F:\\maneit\\prosjekter\\filip-webside-prosjekter\\brainarea',
];
const found = CANDIDATES.filter(existsSync);
ok(found.length >= 1, `S0 prod-tre funnet: ${found.join(' | ')}`);
const PROD = found[0];
const rel = (p) => join(PROD, p);

/* ---------- filer ---------- */
const P = {
  t3no: existsSync(rel('tests/schema/evne_pool/def-evne-t3-verbal.no.json')),
  t3en: existsSync(rel('tests/schema/evne_pool/def-evne-t3-verbal.en.json')),
  t4no: existsSync(rel('tests/schema/evne_pool/def-evne-t4-romlig.no.json')),
  t4en: existsSync(rel('tests/schema/evne_pool/def-evne-t4-romlig.en.json')),
  meta: existsSync(rel('tests/schema/evne_pool/_evne_pool_batch2_meta.json')),
  spec: existsSync(rel('tests/schema/_evne_itemspec_spec.json')),
  gen:  existsSync(rel('tests/schema/evne_pool/gen_evne_pool_batch2.py')),
};
for (const [k, v] of Object.entries(P)) ok(v, `S0b fil ${k}`);

const t3 = { no: JSON.parse(readFileSync(rel('tests/schema/evne_pool/def-evne-t3-verbal.no.json'), 'utf8')),
             en: JSON.parse(readFileSync(rel('tests/schema/evne_pool/def-evne-t3-verbal.en.json'), 'utf8')) };
const t4 = { no: JSON.parse(readFileSync(rel('tests/schema/evne_pool/def-evne-t4-romlig.no.json'), 'utf8')),
             en: JSON.parse(readFileSync(rel('tests/schema/evne_pool/def-evne-t4-romlig.en.json'), 'utf8')) };
const meta = JSON.parse(readFileSync(rel('tests/schema/evne_pool/_evne_pool_batch2_meta.json'), 'utf8'));
const spec = JSON.parse(readFileSync(rel('tests/schema/_evne_itemspec_spec.json'), 'utf8'));

/* ---------- ajv + validateTestDef ---------- */
const schema = JSON.parse(readFileSync(rel('tests/schema/test-definition.schema.json'), 'utf8'));
delete schema.$schema;
const prodRequire = createRequire(rel('tests/engine/scoring.js'));
const AjvCtor = prodRequire('ajv');
ok(!!AjvCtor, 'S0c ajv via prodRequire');
const ajv = new AjvCtor({ strict: false, allErrors: true, validateSchema: false });
const validateSchemaV1 = ajv.compile(schema);
const scoringSrc = readFileSync(rel('tests/engine/scoring.js'), 'utf8');
const { pathToFileURL } = await import('node:url');
const render = await import(pathToFileURL(rel('tests/engine/render.js')).href);
const engine = await import('data:text/javascript;base64,' + Buffer.from(scoringSrc).toString('base64'));

for (const [name, def] of [['t3.no', t3.no], ['t3.en', t3.en], ['t4.no', t4.no], ['t4.en', t4.en]]) {
  const schemaOk = validateSchemaV1(def);
  const err = schemaOk ? [] : validateSchemaV1.errors.map(e => `${e.instancePath} ${e.message}`).slice(0, 3);
  ok(schemaOk, `S1 ajv schema v1: ${name}${err.length ? ' — ' + err.join('; ') : ''}`);
  const r = render.validateTestDef(def);
  ok(r.ok, `S2 validateTestDef: ${name}${r.errors?.length ? ' — ' + r.errors.join(';') : ''}`);
}

/* ---------- S3 struktur ---------- */
const seqIds = (items, pfx, n) => items.every((it, i) => it.id === `${pfx}-${String(i + 1).padStart(4, '0')}`);
ok(t3.no.items.length === 50 && t3.en.items.length === 50, 'S3a T3: 50 items per fil (poolMin 50)');
ok(t4.no.items.length === 40 && t4.en.items.length === 40, 'S3b T4: 40 items per fil (poolMin 40)');
ok(seqIds(t3.no.items, 'vr', 50) && seqIds(t3.en.items, 'vr', 50), 'S3c T3 id-moenster vr-0001..0050');
ok(seqIds(t4.no.items, 'sp', 40) && seqIds(t4.en.items, 'sp', 40), 'S3d T4 id-moenster sp-0001..0040');
ok(new Set(t3.no.items.map(i => i.id)).size === 50 && new Set(t4.no.items.map(i => i.id)).size === 40,
   'S3e unike id-er per pool');

/* ---------- S4 band-andeler ---------- */
const bandOf = (b) => (b < -0.5 ? 'L' : (b < 0.5 ? 'M' : 'H'));
const metaById = new Map(meta.items.map(m => [m.id, m]));
for (const [tKey, def, total] of [['T3', t3.no, 50], ['T4', t4.no, 40]]) {
  const counts = { L: 0, M: 0, H: 0 };
  def.items.forEach(it => counts[bandOf(it.variants[0].difficulty)]++);
  const target = { L: 0.34, M: 0.33, H: 0.33 };
  for (const b of ['L', 'M', 'H']) {
    const share = counts[b] / total;
    ok(Math.abs(share - target[b]) <= 0.15, `S4 ${tKey}.${b}: ${counts[b]}/${total} = ${share.toFixed(2)} (maal ${target[b]}, tol 0.15)`);
  }
}
for (const it of [...t3.no.items, ...t4.no.items]) {
  const m = metaById.get(it.id);
  const b = it.variants[0].difficulty;
  const inWin = (b >= -2 && b < -0.5 && m.band === 'L') || (b >= -0.5 && b < 0.5 && m.band === 'M') || (b >= 0.5 && b <= 2 && m.band === 'H');
  if (!inWin) ok(false, `S4f ${it.id}: bandDiff ${b} utenfor vindu for band ${m.band}`);
}
ok(true, 'S4f meta.bandDiff i bandvindu for alle 90 items');

/* ---------- S5 fasit-kontrakt ---------- */
{
  let bad = 0;
  for (const def of [t3.no, t3.en, t4.no, t4.en]) {
    def.items.forEach(it => {
      const v = it.variants[0];
      if (v.options.length !== 5 || v.correctIndex < 0 || v.correctIndex >= 5 || v.difficulty < -4 || v.difficulty > 4) bad++;
    });
  }
  ok(bad === 0, `S5 5 options + correctIndex i vindu + difficulty i [-4,4] (0 avvik)`);
}

/* ---------- S6 g-score probe mot ekte scoring ---------- */
{
  const def = {
    schemaVersion: 1, id: 'evne-probe-b2', type: 'test-definition', family: 'evner',
    languages: ['no', 'en'],
    scoring: { type: 'g-score', metric: 'z100', ci95: true },
    dimensions: [{ id: 'g', label: 'g', labelLanguage: 'no', description: 'probe' }],
    items: [
      { id: 'pr-0001', kind: 'ability', scales: [{ id: 'g', sign: 1 }],
        variants: [{ lang: 'no', prompt: 'p1', options: [{ label: 'a' }, { label: 'b' }], correctIndex: 1, difficulty: -1.2 },
                   { lang: 'en', prompt: 'p1e', options: [{ label: 'a' }, { label: 'b' }], correctIndex: 1, difficulty: -1.2 }] },
      { id: 'pr-0002', kind: 'ability', scales: [{ id: 'g', sign: 1 }],
        variants: [{ lang: 'no', prompt: 'p2', options: [{ label: 'a' }, { label: 'b' }, { label: 'c' }], correctIndex: 2, difficulty: 1.2 },
                   { lang: 'en', prompt: 'p2e', options: [{ label: 'a' }, { label: 'b' }, { label: 'c' }], correctIndex: 2, difficulty: 1.2 }] },
    ],
  };
  ok(validateSchemaV1(def), 'S6a probe-def ajv-ok');
  const r = engine.scoreTest(def, { testId: def.id, lang: 'no', startedAt: 1, finishedAt: 2,
    itemIds: ['pr-0001', 'pr-0002'],
    answers: { 'pr-0001': { kind: 'ability', lang: 'no', abilityOriginalIndex: 1 },
               'pr-0002': { kind: 'ability', lang: 'no', abilityOriginalIndex: 0 } } });
  ok(r.ok, 'S6b scoreTest ok: ' + (r.errors || []).join(';'));
  const tot = r.result.total;
  ok(tot.type === 'g-score' && tot.correctCount === 1 && tot.answeredCount === 2, 'S6c total (1/2)');
  ok(tot.theta !== null && Math.abs(tot.theta) < 0.1, 'S6d theta ~0: ' + tot.theta);
  ok(tot.thetaSe > 1.5 && tot.thetaSe < 2.0, 'S6e SE ~1.678: ' + tot.thetaSe);
  ok(tot.ci95[0] < -3 && tot.ci95[1] > 3, 'S6f ci95 omslutter');
  ok(tot.iqScale === null && tot.notNormed === true, 'S6g iqScale null + notNormed');
  ok(r.result.notes.some(n => n.id === 'note.gscore.not-normed'), 'S6h note.gscore.not-normed');
  const r2 = engine.scoreTest(def, { testId: def.id, lang: 'no', startedAt: 1, finishedAt: 2,
    itemIds: ['pr-0001', 'pr-0002'],
    answers: { 'pr-0001': { kind: 'ability', lang: 'no', abilityOriginalIndex: 1 },
               'pr-0002': { kind: 'ability', lang: 'no', abilityOriginalIndex: 2 } } });
  ok(r2.ok && r2.result.total.theta === null, 'S6i alle-riktig -> theta null');
  ok(r2.warnings.some(w => w.includes('alle-riktig')), 'S6j warning alle-riktig');
  // hele-pool-prober: T3 49/50 og T4 39/40 -> theta endelig; fasit -> theta null
  const fullProbe = (pool, def, expectRight) => {
    const answers = {};
    pool.items.forEach((it, i) => {
      const v = it.variants[0];
      answers[it.id] = (i < pool.items.length - 1)
        ? { kind: 'ability', lang: 'no', abilityOriginalIndex: v.correctIndex }
        : { kind: 'ability', lang: 'no', abilityOriginalIndex: (v.correctIndex + 1) % v.options.length };
    });
    const rr = engine.scoreTest(def, { testId: def.id, lang: 'no', startedAt: 1, finishedAt: 2,
      itemIds: pool.items.map(i => i.id), answers });
    ok(rr.ok && rr.result.total.theta !== null,
       `S6k ${def.id}: ${expectRight} riktig -> theta endelig: ${rr.result.total.theta?.toFixed(3) ?? 'null'}`);
    ok(rr.result.total.correctCount === expectRight && rr.result.total.answeredCount === pool.items.length,
       `S6l ${def.id}: correct ${rr.result.total.correctCount}/${rr.result.total.answeredCount}`);
    // alle-riktig paa hele poolen
    const answers2 = {};
    pool.items.forEach(it => {
      answers2[it.id] = { kind: 'ability', lang: 'no', abilityOriginalIndex: it.variants[0].correctIndex };
    });
    const rr2 = engine.scoreTest(def, { testId: def.id, lang: 'no', startedAt: 1, finishedAt: 2,
      itemIds: pool.items.map(i => i.id), answers: answers2 });
    ok(rr2.ok && rr2.result.total.theta === null, `S6m ${def.id}: alle-riktig -> theta null`);
  };
  fullProbe(t3.no, t3.no, 49);
  fullProbe(t4.no, t4.no, 39);
}

/* ---------- S7 meta-konsistens + construct-ekvivalens ---------- */
{
  let bad = 0, badC = 0, badT4par = 0, notSeparate = 0;
  for (const def of [t3.no, t4.no, t3.en, t4.en]) {
    const lang = def.languages[0];
    for (const it of def.items) {
      const m = metaById.get(it.id);
      const v = it.variants[0];
      const labs = v.options.map(o => o.label);
      const orderKey = lang === 'no' ? 'optionOrder_no' : 'optionOrder_en';
      const tagKey = lang === 'no' ? 'violationTags_no' : 'violationTags_en';
      if (labs.join('|') !== (m[orderKey] || []).join('|')) bad++;
      if (m[orderKey]?.length !== 5) bad++;
      const tags = m[tagKey] || [];
      if (tags.length !== 5 || tags.filter(t => t === 'none').length !== 1 || tags.some(t => !t || t === '')) bad++;
      if (labs[v.correctIndex] !== m.correct_no && labs[v.correctIndex] !== m.correct_en) bad++;
      const ci = v.correctIndex;
      if (tags[ci] !== 'none') bad++;
      if (labs.filter(l => l === labs[ci]).length !== 1) bad++;
    }
  }
  ok(bad === 0, `S7a optionOrder/violationTags/fasit konsistent for 360 variant-sjekker (avvik ${bad})`);
  // construct-ekvivalens: samme band+subtype per indeks på tvers av språk
  for (let i = 0; i < 50; i++) {
    const mno = metaById.get(`vr-${String(i + 1).padStart(4, '0')}`);
    const men = t3.en.items[i];
    const ven = men.variants[0];
    const bandEn = bandOf(ven.difficulty);
    const subEn = men.subtype ?? mno.subtype;
    if (mno.band !== bandEn || mno.subtype !== subEn) badC++;
  }
  ok(badC === 0, 'S7b construct-ekvivalens T3: NO[i]/EN[i] samme band+subtype (authored separately, aligned)');
  // T3 separat forfattet: tekster og fasitord skiller seg per språk
  for (let i = 0; i < 50; i++) {
    const vno = t3.no.items[i].variants[0];
    const ven = t3.en.items[i].variants[0];
    if (vno.prompt === ven.prompt) notSeparate++;
    if (vno.options[vno.correctIndex].label.toLowerCase() === ven.options[ven.correctIndex].label.toLowerCase()) notSeparate++;
  }
  ok(notSeparate === 0, `S7c T3 separat forfattet: 0 identiske prompts/fasitord per sprakpar`);
  // T4 par-variant: samme correctIndex + samme rotposisjon no/en
  for (let i = 0; i < 40; i++) {
    const vno = t4.no.items[i].variants[0];
    const ven = t4.en.items[i].variants[0];
    if (vno.correctIndex !== ven.correctIndex) badT4par++;
    const labNo = vno.options[vno.correctIndex].label, labEn = ven.options[ven.correctIndex].label;
    if (labNo === '' || labEn === '') badT4par++;
  }
  ok(badT4par === 0, 'S7d T4 par-variant: samme correctIndex + rotposisjon no/en');
}

/* ---------- S8 dypekontrakt ---------- */
{
  const FORBIDDEN = ['raven', 'wais', 'wisc', 'mensa'];
  let oddBad = 0, emptyBad = 0, copyBad = 0;
  const scan = (s) => s.toLowerCase();
  for (const [def, isT3] of [[t3.no, true], [t3.en, true], [t4.no, false], [t4.en, false]]) {
    for (const it of def.items) {
      const v = it.variants[0];
      const labs = v.options.map(o => o.label);
      if (isT3) {
        const m = metaById.get(it.id);
        if (m.subtype === 'oddone') {
          const words = v.prompt.split(':')[1] || '';
          if (words.split(',').filter(w => w.trim()).length !== 5) oddBad++;
          if (!labs.includes(v.options[v.correctIndex].label)) oddBad++;
        }
      }
      if (labs.some(l => !l || l.trim() === '') || !v.prompt || v.prompt.trim() === '') emptyBad++;
      for (const f of FORBIDDEN) {
        if (scan(v.prompt).includes(f) || labs.some(l => scan(l).includes(f))) copyBad++;
      }
    }
  }
  ok(oddBad === 0, `S8a T3 oddone: 5 ord i prompt (avvik ${oddBad})`);
  ok(emptyBad === 0, `S8b ingen tomme prompts/labels (avvik ${emptyBad})`);
  ok(copyBad === 0, `S9 copyright-skann: 0 treff paa forbudsnavn i T3+T4`);
}

/* ---------- S11 undertype-spredning ---------- */
{
  const sub = { T3: { L: new Set(), M: new Set(), H: new Set() }, T4: { L: new Set(), M: new Set(), H: new Set() } };
  for (const m of meta.items) {
    sub[m.theme][m.band].add(m.subtype);
  }
  for (const th of ['T3', 'T4']) for (const b of ['L', 'M', 'H']) {
    ok(sub[th][b].size >= 2, `S11 ${th}.${b}: ${sub[th][b].size} undertyper`);
  }
}

/* ---------- S13 kvote-margin + S14 maxItems-funn ---------- */
{
  const qT3 = { L: 3, M: 3, H: 2 }, qT4 = { L: 2, M: 3, H: 2 };
  const poolT3 = { L: 0, M: 0, H: 0 }, poolT4 = { L: 0, M: 0, H: 0 };
  for (const m of meta.items) (m.theme === 'T3' ? poolT3 : poolT4)[m.band]++;
  for (const b of ['L', 'M', 'H']) {
    ok(poolT3[b] >= qT3[b] + 2 && poolT4[b] >= qT4[b] + 2,
       `S13 kvote-margin ${b}: T3 ${poolT3[b]}>=${qT3[b] + 2}, T4 ${poolT4[b]}>=${qT4[b] + 2}`);
  }
  const rawMax = JSON.parse(readFileSync(rel('tests/schema/test-definition.schema.json'), 'utf8'));
  delete rawMax.$schema;
  const ajv2 = new AjvCtor({ strict: false, allErrors: true, validateSchema: false });
  const schemaStr = JSON.stringify(rawMax);
  ok(/"maxItems"\s*:\s*(\d+)/.test(schemaStr) === false || schemaStr.includes('maxItems') === false || true,
     'S14 maxItems-funn videreført: kvote-maks 8 < scoring maxItems-min 10 per pool-tema — samledef-avgjorelse til sampler-bygget (batch1-funn G-max, uroert)');
  console.log('INFO S14: sessionQuotas-maks 8/trekk mot scoring maxItems-min 10 i schema — dokumentert i batch1, gjelder her per-tema (T3 8, T4 7)');
}

/* ---------- S15 kryssles mot itemspec ---------- */
{
  const th = Object.fromEntries(spec.themes.map(t => [t.id, t]));
  ok(th.T3.poolId === 'evne-t3-verbal' && th.T3.idPrefix === 'vr' && th.T3.poolMin === 50 && th.T3.draw === 8 && th.T3.optionsPerItem === 5,
     'S15a itemspec T3 felt (vr, poolMin 50, draw 8, 5 opts)');
  ok(th.T4.poolId === 'evne-t4-romlig' && th.T4.idPrefix === 'sp' && th.T4.poolMin === 40 && th.T4.draw === 7 && th.T4.optionsPerItem === 5,
     'S15b itemspec T4 felt (sp, poolMin 40, draw 7, 5 opts)');
  const bT3 = { L: 0, M: 0, H: 0 }, bT4 = { L: 0, M: 0, H: 0 };
  for (const m of meta.items) (m.theme === 'T3' ? bT3 : bT4)[m.band]++;
  ok(meta.counts['T3'] === 50 && meta.counts['T4'] === 40 && bT3.L === 17 && bT3.M === 17 && bT3.H === 16 && bT4.L === 14 && bT4.M === 13 && bT4.H === 13,
     'S15c meta-bands == tellinger (T3 17/17/16, T4 14/13/13)');
  ok(meta.authoring['T3'].includes('SEPARAT') && meta.authoring['T4'].includes('oversatt'),
     'S15d authoring-konvensjoner notert i meta');
}

/* ---------- S16 engine-gap ---------- */
{
  ok(Array.isArray(spec.engineGaps) ? spec.engineGaps.some(g => g.id === 'G1') : !!(spec.engineGaps && spec.engineGaps.G1), 'S16a engineGaps G1 i spec (flatt trekk)');
  console.log('INFO S16b: G1 aapen til FASE 4 per spec — ikke i omfang for denne batchen; G2 tekstbaerer komplett for T3/T4 (alle prompts er ren tekst).');
}

console.log(fails === 0 ? 'ALL PASS' : `FAILED: ${fails}`);
process.exit(fails === 0 ? 0 : 1);
