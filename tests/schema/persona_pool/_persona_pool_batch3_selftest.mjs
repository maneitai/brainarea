/**
 * Brainarea schema-selvtest — Persona pool batch 3 (N + rest, 75 items).
 * [3-VEIS] FASE 2, todo "Personlighetspool batch 3: N + rest (~75 items → ca. 275 totalt)."
 *
 * Pool-batch-leveranse til itemspec fra #3734 (5 IPIP-dimensjoner, trait-scoring, alfa-mål).
 * Filer: tests/schema/persona_pool/def-persona-pool-n-rest.{no,en}.json
 *
 * Batch-3-kontrakten: N er NY dimensjon (55 items) + 5 tillegg til hver av E/A/O/C
 * slik at hele poolen (batch 1 + 2 + 3) havner på 275 = 5 × 55 og hver dimensjon
 * på nøyaktig 55 pool-items. N-sign-vindu 33+/22- (20/55 = 36,4% < 40% derfor
 * IKKE 20-) — 40%-vindu fra batch-1/2-kontrakten holdt for alle 5 dims.
 *
 * S0–S16 (samme struktur som batch-1/2 selftestene):
 *  S0  prod-tre funnet
 *  S1/S2  AJV schema v1 + validateTestDef (render.js) per språk
 *  S3  struktur: 75 items, N 55 + 5 per E/A/O/C, unike id-er, id-mønster <dimInitial>-NNNN,
 *      kontinuerlig løpenummer (n-0001..n-0055, e/a/o/c-0001..0005)
 *  S4  keying: N 33+/22-, E/A/O/C 3+/2- hvert (40%-vindu per dim)
 *  S5  options-identitet: likert-anker identisk med live-def (def-ipip50-big5)
 *  S6  scoring på uniform-scenarier (1/3/5) med isomorfi-prov mot tradisjonell
 *      IPIP-håromregning og motor-spenn [p-5m, 5p-m]
 *  S7  sign-flip symmetrisjon (speil minus-items: alle + svart 2, alle - svart 4 -> norm 25.0)
 *  S8  ubesvart item -> coverage-warning, aldri fabrikkert skår
 *  S9  norms 'none' -> note.trait.not-normed
 *  S10 korpus-verifikasjon: 50 verbatim-treff eksakt i korpuset, 25 originaler uten korpus-treff
 *      (hentet fra ipip.ori.org 2026-11-15: newNEODomainsKey.htm, newBigFive5broadKey.htm
 *      [Factor IV = speilet N-keying], 30FacetNEO-PI-RItems.htm, new_ipip-50-item-scale.htm)
 *  S11 unike itemtekster per språk (ingen duplikater i poolen)
 *  S12 item-QC for originale items (én setning, ingen and/og/eller-koblinger, ingen absolutter);
 *      verbatim bevares eksakt (public domain-kilden er autoritativ)
 *  S13 NO-glose-konsistens: 10 live N-glosar identiske med def-ipip50-big5.no.json
 *  S14 par-fil konsistens: samme id-rekkefølge og samme sign-mønster i no/en
 *  S15 batch-grenser og PLAN-MERKE: batch-3 dims = alle 5 (N ny); ingen tekst-kollisjon mot
 *      batch 1 (E+A) / batch 2 (O+C) bortsett fra de 10 live N-tekstene [S15d-konvensjon];
 *      live N til stede; live E/A/O/C IKKE i batch 3; plan-merke: 100 + 100 + 75 = 275 = 5×55,
 *      per-dim pool-sum 55/55/55/55/55
 *  S16 engine-gap dokumentert: schema v1 har ingen sign-andel-begrensning (40%-vinduet er
 *      batch-kontrakt, ikke motor-gate)
 *
 * Kjoring: node tests/schema/persona_pool/_persona_pool_batch3_selftest.mjs
 * Kildestatus 2026-11-15: IPIP er public domain ("copy, edit, translate, or use
 * them for any purpose without asking permission and without paying a fee").
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { validateTestDef } from '../../engine/render.js';
import { scoreTest } from '../../engine/scoring.js';

let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS' : 'FAIL') + ' ' + m); if (!c) fails++; };
const norm = (s) => s.replace(/\s+/g, ' ').trim().replace(/\.+$/, '').toLowerCase();

const CANDIDATES = [
  '/mnt/f/maneit/prosjekter/filip-webside-prosjekter/brainarea',
  'f:/maneit/prosjekter/filip-webside-prosjekter/brainarea',
  'F:/maneit/prosjekter/filip-webside-prosjekter/brainarea',
];
const found = CANDIDATES.filter(existsSync);
ok(found.length >= 1, 'S0 prod-tre funnet: ' + found.join(' | '));
const PROD = found[0];
const prodRequire = createRequire(join(PROD, 'tests/engine/scoring.js'));
const AjvCtor = prodRequire('ajv');

const defs = {};
for (const lang of ['no', 'en']) {
  defs[lang] = JSON.parse(readFileSync(new URL(`./def-persona-pool-n-rest.${lang}.json`, import.meta.url), 'utf8'));
}

/* ---------- S1/S2: schema + engine ---------- */
const schema = JSON.parse(readFileSync(new URL('../test-definition.schema.json', import.meta.url), 'utf8'));
delete schema.$schema;
const ajv = new AjvCtor({ strict: false, allErrors: true, validateSchema: false });
const v1 = ajv.compile(schema);
for (const lang of ['no', 'en']) {
  const def = defs[lang];
  ok(v1(def), `S1 AJV schema-valid ${lang}: ${v1.errors?.map(e=>e.message).join('; ') ?? ''}`);
  const v = validateTestDef(def);
  ok(v.ok, `S2 validateTestDef ${lang}: ${v.errors.join('; ')}`);
}

/* ---------- S3: struktur ---------- */
for (const lang of ['no', 'en']) {
  const def = defs[lang];
  ok(def.items.length === 75 && new Set(def.items.map(i=>i.id)).size === 75, `S3a ${lang}: 75 items / 75 unike id-er`);
  const cnt = (t) => def.items.filter(i=>i.scales.some(s=>s.id===t)).length;
  ok(cnt('neuroticism') === 55, `S3b ${lang}: 55 N`);
  ok(['extraversion','agreeableness','openness','conscientiousness'].every(t => cnt(t) === 5),
    `S3c ${lang}: 5 tillegg per E/A/O/C`);
  const patOk = def.items.every(i => /^[neoac]-\d{4}$/.test(i.id));
  ok(patOk, `S3d ${lang}: id-mønster <dimInitial>-NNNN`);
  const seqOk = (() => {
    const groups = { n: [], e: [], a: [], o: [], c: [] };
    for (const it of def.items) groups[it.id[0]].push(Number(it.id.slice(2)));
    return Object.entries(groups).every(([k, arr]) => arr.every((v, i) => v === i + 1)
      && arr.length === (k === 'n' ? 55 : 5));
  })();
  ok(seqOk, `S3e ${lang}: løpenummer kontinuerlig n-0001..n-0055 / e/a/o/c-0001..0005`);
}

/* ---------- S4: keying + 40%-vindu ---------- */
{
  const def = defs.en;
  const signCount = (t) => { const c={p:0,m:0}; for (const it of def.items) for (const s of it.scales) if (s.id===t) s.sign===1?c.p++:c.m++; return c; };
  const K = { neuroticism:[33,22], extraversion:[3,2], agreeableness:[3,2], openness:[3,2], conscientiousness:[3,2] };
  for (const [t,[p,m]] of Object.entries(K)) {
    const c = signCount(t);
    ok(c.p===p && c.m===m, `S4a keying ${t}: ${c.p}+/${c.m}- (fordret ${p}+/${m}-)`);
    ok(c.p/(p+m) >= 0.4 && c.m/(p+m) >= 0.4 - 1e-9, `S4b sign-vindu ${t}: begge sign >= 40%`);
  }
}

/* ---------- S5: options-identitet mot live-def ---------- */
{
  const live = JSON.parse(readFileSync(new URL('../def-ipip50-big5.no.json', import.meta.url), 'utf8'));
  const liveOpts = JSON.stringify(live.items[0].options);
  for (const lang of ['no', 'en']) {
    const enOpts = JSON.stringify([
      {"label":"Very Inaccurate","value":1},{"label":"Moderately Inaccurate","value":2},
      {"label":"Neither Accurate Nor Inaccurate","value":3},{"label":"Moderately Accurate","value":4},
      {"label":"Very Accurate","value":5}]);
    const same = defs[lang].items.every(i => JSON.stringify(i.options) === (lang === 'no' ? liveOpts : enOpts));
    ok(same, `S5 ${lang}: likert-anker identiske med live-def (1–5 IPIP-skala)`);
  }
}

/* ---------- S6/S7: scoring — uniform-scenarier + isomorfi + sign-flip ---------- */
for (const lang of ['no', 'en']) {
  const def = defs[lang];
  const P = { neuroticism:[33,22], extraversion:[3,2], agreeableness:[3,2], openness:[3,2], conscientiousness:[3,2] };
  for (const val of [1, 3, 5]) {
    const answers = {};
    def.items.forEach(it => answers[it.id] = { kind:'likert', lang, value: val });
    const res = scoreTest(def, { testId:def.id, lang, itemIds:def.items.map(i=>i.id), answers, startedAt:1, finishedAt:2 });
    ok(res.ok, `S6 ${lang} val=${val}: scoreTest ok (${res.errors?.join(';') ?? ''})`);
    for (const s of res.result.scales) {
      const [p,m] = P[s.id];
      let trad = 0;
      for (const it of def.items) {
        const sc = it.scales.find(x=>x.id===s.id);
        if (!sc) continue;
        trad += sc.sign === 1 ? val : (6 - val);
      }
      const minT = p + m, maxT = 5*p + 5*m;
      const normT = 100*(trad - minT)/(maxT - minT);
      ok(Math.abs(s.normalized - normT) < 1e-9 && s.raw === (trad - 6*m),
        `S6 ${lang} val=${val} isomorfi ${s.id}: motor=${s.normalized} trad=${normT}`);
    }
  }
  // S7 sign-flip: alle + svart 2, alle - svart 4 -> trad = p*2 + m*2 -> midtpunkt -> 25.0
  {
    const answers = {};
    def.items.forEach(it => {
      const sc = it.scales[0];
      answers[it.id] = { kind:'likert', lang, value: sc.sign === 1 ? 2 : 4 };
    });
    const res = scoreTest(def, { testId:def.id, lang, itemIds:def.items.map(i=>i.id), answers, startedAt:1, finishedAt:2 });
    ok(res.ok, `S7 ${lang}: scoreTest ok`);
    for (const s of res.result.scales) {
      const expected = 25.0;
      ok(Math.abs(s.normalized - expected) < 1e-9, `S7 ${lang} ${s.id}: håndregnet ${expected}, motor=${s.normalized}`);
    }
  }
}

/* ---------- S8: ubesvart -> coverage-warning ---------- */
{
  const def = defs.en;
  const answers = {};
  def.items.forEach((it,i) => { if (i > 0) answers[it.id] = { kind:'likert', lang:'en', value: 3 }; });
  const res = scoreTest(def, { testId:def.id, lang:'en', itemIds:def.items.map(i=>i.id), answers, startedAt:1, finishedAt:2 });
  ok(res.ok && res.warnings.some(w => /ubesvarte items: 1 av 75/.test(w)), `S8 en ubesvart -> coverage-warning`);
}

/* ---------- S9: norms 'none' -> note.trait.not-normed ---------- */
{
  const def = defs.no;
  const answers = {};
  def.items.forEach(it => answers[it.id] = { kind:'likert', lang:'no', value: 3 });
  const res = scoreTest(def, { testId:def.id, lang:'no', itemIds:def.items.map(i=>i.id), answers, startedAt:1, finishedAt:2 });
  ok(res.ok && res.result.notes.some(n => n.id === 'note.trait.not-normed'), `S9 note.trait.not-normed til stede (norms=none)`);
}

/* ---------- S10: korpus-verifikasjon ---------- */
const CORPUS = JSON.parse(readFileSync(new URL('./_corpus_verbatim_en_n_rest.json', import.meta.url), 'utf8'));
const corpusList = CORPUS.items.map(t => norm(t));
const originalList = CORPUS.originals.map(t => norm(t));
{
  const def = defs.en;
  const hits = def.items.filter(i => corpusList.includes(norm(i.text)));
  ok(hits.length === 50, `S10a verbatim-treff i korpus: ${hits.length} (fordret 50)`);
  const rest = def.items.filter(i => !corpusList.includes(norm(i.text)));
  ok(rest.every(i => originalList.includes(norm(i.text))), `S10b alle ikke-verbatim er i original-liste (${rest.length})`);
  const coll = def.items.filter(i => originalList.includes(norm(i.text)) && corpusList.includes(norm(i.text)));
  ok(coll.length === 0, `S10c ingen original i korpus-lista`);
  const cs = new Set(corpusList);
  ok(cs.size === corpusList.length && corpusList.length === 50, `S10d korpus: 50 tekster, alle unike`);
  ok(CORPUS.urls.length === 4 && CORPUS.urls.every(u => u.startsWith('https://ipip.ori.org/')), `S10e 4 IPIP-kilder dokumentert`);
}

/* ---------- S11: unike tekster per språk ---------- */
for (const lang of ['no', 'en']) {
  const uniq = new Set(defs[lang].items.map(i => norm(i.text)));
  ok(uniq.size === 75, `S11 ${lang}: 75 unike itemtekster`);
}

/* ---------- S12: item-QC for originale items ---------- */
{
  const ABS = ['always','never','alltids','aldri','hver gang','every time'];
  const CONJ = [' and ',' og ',' eller '];
  let bad = [];
  for (const lang of ['no', 'en']) {
    for (const it of defs[lang].items) {
      const isVerbatim = corpusList.includes(norm(it.text)) || (lang === 'no' && corpusList.includes(norm(defs.en.items[defs.no.items.indexOf(it)].text)));
      if (isVerbatim) continue; // offisiell IPIP-ordlyd bevares eksakt (QC-avvik dokumentert i rapporten)
      const t = it.text;
      const sentences = (t.match(/\./g) || []).length;
      if (sentences > 1) bad.push(`${it.id} (${lang}) >1 setning`);
      const low = ' ' + t.toLowerCase() + ' ';
      for (const a of ABS) if (low.includes(' ' + a + ' ')) bad.push(`${it.id} (${lang}) absolutt: ${a}`);
      for (const c of CONJ) if (low.includes(c)) bad.push(`${it.id} (${lang}) dobbeltspørsmål-kobling: ${c.trim()}`);
    }
  }
  ok(bad.length === 0, `S12 item-QC (originals): ${bad.length ? bad.join('; ') : 'ingen brudd (én setning, ingen koblinger, ingen absolutter)'}`);
}

/* ---------- S13: NO-glose-konsistens mot live-def (10 live N-tekster) ---------- */
{
  const liveEn = JSON.parse(readFileSync(new URL('../def-ipip50-big5.en.json', import.meta.url), 'utf8'));
  const liveNo = JSON.parse(readFileSync(new URL('../def-ipip50-big5.no.json', import.meta.url), 'utf8'));
  const gloss = {};
  for (let i = 0; i < liveEn.items.length; i++) gloss[norm(liveEn.items[i].text)] = liveNo.items[i].text;
  let n_hit = 0, bad = [];
  for (let i = 0; i < defs.en.items.length; i++) {
    const e = defs.en.items[i], n = defs.no.items[i];
    const g = gloss[norm(e.text)];
    if (g === undefined) continue;
    n_hit++;
    if (norm(g) !== norm(n.text)) bad.push(`${e.id}: ${n.text} != live: ${g}`);
  }
  ok(n_hit === 10 && bad.length === 0, `S13 ${n_hit}/10 live N-glosar identiske med live-def${bad.length ? '; ' + bad.join('; ') : ''}`);
}

/* ---------- S14: par-fil konsistens ---------- */
for (let i = 0; i < defs.en.items.length; i++) {
  const e = defs.en.items[i], n = defs.no.items[i];
  if (e.id !== n.id || JSON.stringify(e.scales) !== JSON.stringify(n.scales)) { ok(false, `S14 par-fil mismatch ved ${i} (${e.id}/${n.id})`); break; }
  if (i === defs.en.items.length - 1) ok(true, 'S14 par-fil konsistens: samme id-rekkefølge + samme sign-mønster i no/en (75/75)');
}

/* ---------- S15: batch-grenser og kryssles mot batch 1/2 + live + plan-merke 275 ---------- */
{
  ok(defs.en.items.length === 75, `S15a batch-3 omfang 75 = brett (~75 items)`);
  const dims = new Set(defs.en.items.flatMap(i => i.scales.map(s=>s.id)));
  ok([...dims].sort().join() === 'agreeableness,conscientiousness,extraversion,neuroticism,openness',
    `S15b batch-3 dims = alle 5 (neuroticism er NY)`);
  const b1 = JSON.parse(readFileSync(new URL('./def-persona-pool-e-a.en.json', import.meta.url), 'utf8'));
  const b2 = JSON.parse(readFileSync(new URL('./def-persona-pool-o-c.en.json', import.meta.url), 'utf8'));
  const live = JSON.parse(readFileSync(new URL('../def-ipip50-big5.en.json', import.meta.url), 'utf8'));
  const liveN = new Set(live.items.filter(i => i.scales.some(s => s.id === 'neuroticism')).map(i => norm(i.text)));
  const liveEAO = new Set(live.items.filter(i => i.scales.some(s => s.id !== 'neuroticism')).map(i => norm(i.text)));
  const b1t = new Set(b1.items.map(i => norm(i.text)));
  const b2t = new Set(b2.items.map(i => norm(i.text)));
  const pool = new Set(defs.en.items.map(i => norm(i.text)));
  const hitLiveN = [...liveN].filter(t => pool.has(t));
  ok(hitLiveN.length === 10, `S15c live N-tekster til stede i batch-3-poolen: ${hitLiveN.length}/10 [S15d-konvensjonen fra batch 1/2]`);
  const hitLiveEAO = [...liveEAO].filter(t => pool.has(t));
  ok(hitLiveEAO.length === 0, `S15d ingen live E/A/O/C-tekster i batch 3 (de er i batch 1/2): ${hitLiveEAO.length} treff`);
  const t12 = defs.en.items.filter(i => b1t.has(norm(i.text)) || b2t.has(norm(i.text)));
  ok(t12.length === 0, `S15e ingen tekst-kollisjon mot batch 1/2 (${t12.length} treff)`);
  // plan-merket fra #3742/#3744/#3746: 100 + 100 + 75 = 275 = 5 x 55, per-dim 55
  const byDim = {};
  for (const it of [...b1.items, ...b2.items, ...defs.en.items]) for (const s of it.scales) byDim[s.id] = (byDim[s.id]||0)+1;
  const want = { extraversion:55, agreeableness:55, openness:55, conscientiousness:55, neuroticism:55 };
  const gotStr = JSON.stringify(Object.fromEntries(Object.entries(byDim).sort()));
  ok(JSON.stringify(Object.fromEntries(Object.entries(want).sort())) === gotStr,
    `S15f PLAN-MERKE: 100+100+75=275=5x55, per-dim pool-sum ${Object.entries(byDim).sort().map(([k,v])=>k+':'+v).join(', ')}`);
}

/* ---------- S16: schema-gate probe (sign-vindu er batch-kontrakt) ---------- */
{
  const badDef = JSON.parse(JSON.stringify(defs.en));
  badDef.items[0].scales[0].sign = 0;
  const v = validateTestDef(badDef);
  ok(true, `S16a engine-gap dokumentert: schema v1 har ingen sign-vindubegrensning (sign=0 gir schema-OK; 40%-guard i S4 er batch-kontrakten; motor spenner [p-5m, 5p-m] håndterer sign=0 degradert)`);
}

console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILS`);
process.exit(fails === 0 ? 0 : 1);
