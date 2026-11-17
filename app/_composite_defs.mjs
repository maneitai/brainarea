/**
 * Brainarea composite-def builder (app/_composite_defs.mjs) — [BYGG] #3840.
 *
 * Bygger kjørbare test-definisjoner fra pool-defer + itemspec-spesifikasjoner,
 * deterministisk: samme pools gir byte-identisk output (ingen klokke, ingen rng
 * i bygget — rekkefølgen er pool-orden, ikke tilfeldig).
 *
 * Defs lander i tests/schema/composite/ (kilde-sannhet, comittes) og kopieres
 * til out/ av build.js.
 *
 * -------- Motor-kontrakter verifisert i kilden 2026-11-17 (todo #3840) --------
 * - render.js sessionSizeFor: likert/threshold/trait → ALLE items shuffles per
 *   økt; g-score → min(maxItems, items.length). maxItems=44 på evne-composite
 *   gir per-økt sampling 44 av 270 — ingen fil-regenerering ved repeat.
 * - scoring.js trait: skala = Σ(sign·p)/N over besvarte; g-score: theta over
 *   besvarte ability-items med difficulty fra valgt variant.
 * - render.js validateTestDef: duplikat item-id kaster → kollisjonsvak under
 *   fletting. Extrafelter i items er tillatt (tolærlige).
 * - sign bor i item.scales[].sign (rel-poolene: 30+/30- per dim); evne-pooler
 *   er rene ability-items med variants per språk (NO og EN-filene er egne
 *   def-filer, each languages:[lang]) — flettet per språk.
 *
 * -------- Spec-anker (ikke åpne beslutninger) --------
 * - evne: session.taskCount=44 (8/8/8/7/7/6 per T1–T6), timeBudgetSeconds=1680,
 *   scoring g-score z100 ci95 maxItems=44 (defFilePlan «Samledef», scoringContract).
 *   F2 bandkvoter/F3 sub-type frekvens = engineGaps G1/G3 — interim flatt trekk,
 *   per-økt, i motor-sampleren (den eider band-rapport i verifisering).
 * - rel: sessionFormDecision 16 = 4+4+4+4 (closeness/openness/conflict/
 *   independence), alle items per økt (motor-garanti: likert → alle, shuffles),
 *   ingen timebudget. Poolen (60/dim) er forfatterkorpus; de 16 live-ene velges
 *   DETERMINISTISK her: 4 per dim, 2+ / 2- sign-symmetri.
 * - puzzle (play-ruta) eies av puzzle-player/def-puzzle-v1 direkte — ikke composite.
 * */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const SCHEMA = join(REPO, 'tests', 'schema');
const OUT = join(SCHEMA, 'composite');

/* ---------------- helpers ---------------- */

function readJson(p) {
  return JSON.parse(readFileSync(p, 'utf8'));
}

function assertCond(cond, msg) {
  if (!cond) throw new Error('composite-build: ' + msg);
}

/* ---------------- evne-composite ---------------- */

/** Evne-temapoolene i spesifisert orden med trekk per tema (session-blokken). */
const EVNE_THEMES = [
  { dir: 'evne_pool', file: 'def-evne-t1-matrise', draw: 8 },
  { dir: 'evne_pool', file: 'def-evne-t2-numerisk', draw: 8 },
  { dir: 'evne_pool', file: 'def-evne-t3-verbal', draw: 8 },
  { dir: 'evne_pool', file: 'def-evne-t4-romlig', draw: 7 },
  { dir: 'evne_pool', file: 'def-evne-t5-sekvens', draw: 7 },
  { dir: 'evne_pool', file: 'def-evne-t6-deduksjon', draw: 6 },
];

function buildEvneComposite(lang) {
  const pools = EVNE_THEMES.map((t) => readJson(join(SCHEMA, t.dir, `${t.file}.${lang}.json`)));
  const def0 = pools[0];

  /* 1. skoring-kontrakt: samledef som g-score, maxItems = 44 (session-blokken) */
  const scoring = { type: 'g-score', metric: def0.scoring.metric || 'z100', ci95: def0.scoring.ci95 !== false, maxItems: 44 };

  /* 2. dimensjoner: id 'g' er identisk per pool — én dimensjon. */
  const dimensions = [def0.dimensions[0]];
  assertCond(dimensions[0] && dimensions[0].id === 'g', 'evne: forventet dims [g], fant ' + JSON.stringify(def0.dimensions));

  /* 3. items: samlig alle pool-items i pool-orden (deterministisk).
        sessionSampling merkes som extrafelt på def — beslutnings-arkiv. */
  const items = [];
  const seen = new Set();
  for (const pool of pools) {
    assertCond(pool.languages[0] === lang, `evne: pool-languages uventet: ${JSON.stringify(pool.languages)} (fil ${pool.id})`);
    assertCond(pool.scoring.type === 'g-score', 'evne: pool ikke g-score (' + pool.id + ')');
    assertCond(pool.items.every((i) => i.kind === 'ability'), 'evne: pool inneholder non-ability item (' + pool.id + ')');
    for (const item of pool.items) {
      assertCond(!seen.has(item.id), `evne: duplikat item-id på tvers av pooler: ${item.id}`);
      seen.add(item.id);
      /* item.scales[0].id = 'g' er garantert per pool; kopieres som er */
      items.push(item);
    }
  }
  assertCond(items.length === 270, `evne: forventet 270 pool-items, fant ${items.length}`);

  /* 4. per-tema draw (8/8/8/7/7/6) som extrafelt — runner-en leser dette som
        stratifisert trekkfordeling (flatt interim) og timebudsjettet */
  const themeDraws = EVNE_THEMES.map((t) => t.draw);
  const timeBudgetSeconds = 1680;

  return {
    schemaVersion: 1,
    type: 'test-definition',
    id: 'evne-g-44',
    family: 'evner',
    languages: [lang],
    scoring,
    dimensions,
    items,
    /* extrafelt (tolærlige i schema v1) — runner-byggets sesjonskontrakt */
    composite: {
      build: 'app/_composite_defs.mjs',
      version: 1,
      themePrefixes: ['mx-', 'nm-', 'vr-', 'sp-', 'sq-', 'dl-'],
      themeDraws,
      timeBudgetSeconds,
      sampling: 'interim flatt trekk per økt via sessionSizeFor (maxItems=44); F2 bandkvoter og F3 undertype-frekvens = engineGaps G1/G3, leveres i sampler-oppgradering',
    },
  };
}

/* ---------------- rel-composite ---------------- */

/** Rel-dimensjons-poolene i spesifisert orden (4 dims, 60/dim pool). */
const REL_DIMS = [
  { dir: 'rel_pool', file: 'def-rel-cl-60', dim: 'closeness' },
  { dir: 'rel_pool', file: 'def-rel-op-60', dim: 'openness' },
  { dir: 'rel_pool', file: 'def-rel-cf-60', dim: 'conflict' },
  { dir: 'rel_pool', file: 'def-rel-iv-60', dim: 'independence' },
];
const REL_PER_DIM = 4;

/**
 * Deterministisk seleksjon: 4 items per dimensjon, 2+/2− sign-symmetri.
 * Pool-orden: vi trekker de FØRSTE 2 items med sign +1 og de FØRSTE 2 med
 * sign −1 i pool-defens rekkefølge (ingen rng). (FASE 4 item-analyse kan
 * erstatte denne med psykometrisk utvelgelse — funksjonen er ren og byttbar.)
 */
function pickRelItems(pool, perDim) {
  const pos = [];
  const neg = [];
  for (const item of pool.items) {
    assertCond(item.kind === 'likert', `rel: non-likert item ${item.id}`);
    assertCond(item.scales && item.scales.length === 1, `rel: item ${item.id} uten enkelt-skala`);
    const sid = item.scales[0].id;
    const sign = item.scales[0].sign;
    if (sid !== pool.dimensions[0].id) continue; /* fremmed skala: ikke med */
    if (sign === 1) pos.push(item);
    else if (sign === -1) neg.push(item);
    else throw new Error(`rel: item ${item.id} med ukjent sign ${sign}`);
  }
  assertCond(pos.length >= 2 && neg.length >= 2, `rel: for få sign-items i pool ${pool.id} (+${pos.length}/-${neg.length})`);
  const picked = [...pos.slice(0, Math.ceil(perDim / 2)), ...neg.slice(0, Math.floor(perDim / 2))];
  assertCond(picked.length === perDim, `rel: seleksjon ga ${picked.length}, forventet ${perDim}`);
  return picked;
}

function buildRelComposite(lang) {
  const pools = REL_DIMS.map((d) => readJson(join(SCHEMA, d.dir, `${d.file}.${lang}.json`)));

  /* scoring: trait med 4 traits (session.scoring i spec-orden), norms none */
  const scoring = {
    type: 'trait',
    traits: REL_DIMS.map((d) => ({ id: d.dim, weight: 1 })),
    norms: 'none',
  };
  /* dimensjoner: én per pool (id+label+description verbatim) */
  const dimensions = pools.map((p, i) => {
    assertCond(p.dimensions.length === 1 && p.dimensions[0].id === REL_DIMS[i].dim,
      `rel: pool ${p.id} dims uventet (forventet ${REL_DIMS[i].dim})`);
    return p.dimensions[0];
  });

  /* items: 4 per dim i dim-orden, id-fersk kollisjonsvak */
  const items = [];
  const seen = new Set();
  for (let i = 0; i < REL_DIMS.length; i++) {
    const pool = pools[i];
    assertCond(pool.languages[0] === lang, `rel: pool-languages uventet: ${JSON.stringify(pool.languages)} (fil ${pool.id})`);
    const picked = pickRelItems(pool, REL_PER_DIM);
    for (const item of picked) {
      assertCond(!seen.has(item.id), `rel: duplikat item-id på tvers av pooler: ${item.id}`);
      seen.add(item.id);
      items.push(item);
    }
  }
  assertCond(items.length === 16, `rel: forventet 16 items, fant ${items.length}`);

  return {
    schemaVersion: 1,
    type: 'test-definition',
    id: 'rel-16',
    family: 'relations',
    languages: [lang],
    scoring,
    dimensions,
    items,
    composite: {
      build: 'app/_composite_defs.mjs',
      version: 1,
      perDim: REL_PER_DIM,
      selection: 'deterministisk: 4 per dim i pool-orden, 2+/2− sign-symmetri (FASE 4 item-analyse kan erstatte)',
      noTimeBudget: true,
    },
  };
}

/* ---------------- bygg ---------------- */

function buildComposite(lang) {
  const evne = buildEvneComposite(lang);
  const rel = buildRelComposite(lang);
  return [
    { name: `def-evne-g-44.${lang}.json`, def: evne },
    { name: `def-rel-16.${lang}.json`, def: rel },
  ];
}

export function writeCompositeDefs() {
  mkdirSync(OUT, { recursive: true });
  const written = [];
  for (const lang of ['no', 'en']) {
    for (const { name, def } of buildComposite(lang)) {
      const p = join(OUT, name);
      writeFileSync(p, JSON.stringify(def, null, 2) + '\n');
      written.push(p);
    }
  }
  return written;
}

/* ---------------- selftest (kjøres ved build) ---------------- */

export function selftestComposite(written) {
  const expect = [
    'def-evne-g-44.no.json', 'def-evne-g-44.en.json',
    'def-rel-16.no.json', 'def-rel-16.en.json',
  ];
  for (const name of expect) {
    const p = join(OUT, name);
    assertCond(existsSync(p), `composite: mangler ${name}`);
    const def = readJson(p);
    const v = def.scoring.type === 'g-score' ? { maxItems: 44 } : { perDim: 4 };
    if (def.scoring.type === 'g-score') {
      v.maxItemsReal = def.scoring.maxItems;
      assertCond(def.scoring.maxItems === 44, 'composite: evne maxItems != 44');
      assertCond(def.items.length === 270, 'composite: evne items != 270');
      assertCond(def.composite.timeBudgetSeconds === 1680, 'composite: evne timeBudget != 1680');
    } else {
      assertCond(def.scoring.traits.length === 4, 'composite: rel traits != 4');
      assertCond(def.items.length === 16, 'composite: rel items != 16');
      /* sign-symmetri per dimensjon: 2+/2- */
      for (const dim of def.dimensions) {
        const inDim = def.items.filter((i) => i.scales[0].id === dim.id);
        assertCond(inDim.length === 4, `composite: dim ${dim.id} har ${inDim.length} items, forventet 4`);
        const pos = inDim.filter((i) => i.scales[0].sign === 1).length;
        assertCond(pos === 2, `composite: dim ${dim.id} sign-symmetri (+${pos}) != 2/2`);
      }
    }
    /* item-id unike i hvert def */
    const ids = def.items.map((i) => i.id);
    assertCond(new Set(ids).size === ids.length, `composite: dublett-id i ${name}`);
  }
  return { ok: true, written, expect };
}

/* CLI: node app/_composite_defs.mjs */
const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const written = writeCompositeDefs();
  const st = selftestComposite(written);
  console.log(`composite-defs ok: ${written.length} filer (evne 270 items / rel 16 items, no+en) -> ${OUT}`);
}
