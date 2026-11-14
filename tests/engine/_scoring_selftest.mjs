/**
 * Selftest for scoring.js (del 1: validering, trait, threshold) — [BYGG] FASE 1, todo leaf #3712
 * "Scoring-engine — vekter → dimensjonsskår → total."
 *
 * Kjør: node _scoring_selftest.mjs   (node >= 20, ingen dependencies)
 * Del 2 (g-score, partial, determinisme): _scoring_selftest_g.mjs
 * Rapport: _scoring_selftest_report.json (denne filen skriver del 1-feltene)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { scoreTest, validatePayload } from './scoring.js';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = HERE.replace(/tests[\\/]engine[\\/]$/, '');

let pass = 0;
const failures = [];
function check(name, cond) {
  if (cond) { pass++; console.log(`PASS ${name}`); }
  else { failures.push(name); console.log(`FAIL ${name}`); }
}
const nearly = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

/* -------- fixtures -------- */
const FIX = ['fixture-trait-big5.no.json', 'fixture-threshold-adhd.no.json', 'fixture-gscore-matrix.no.json']
  .map((n) => JSON.parse(readFileSync(`${ROOT}/tests/schema/${n}`, 'utf8')));
const tdef = FIX.find((f) => f.scoring.type === 'trait');       // big5-matrix-50
const thedef = FIX.find((f) => f.scoring.type === 'threshold'); // adhd-screening

const T0 = 1_700_000_000_000;
function basePayload(def, answers = {}, overrides = {}) {
  return {
    testId: def.id,
    lang: def.languages[0],
    itemIds: def.items.map((i) => i.id),
    startedAt: T0,
    finishedAt: T0 + 60_000,
    timeSpentSec: 60,
    expired: false,
    answers: { ...answers },
    ...overrides,
  };
}

/* ============ S1 — payload-validering ============ */
{
  const full = {};
  for (const it of tdef.items) full[it.id] = { kind: 'likert', lang: 'no', value: 3 };
  const p1 = basePayload(tdef, full);
  check('S1 v1: gyldig full utfylt payload validerer', validatePayload(tdef, p1).ok === true);
  const r1 = scoreTest(tdef, p1);
  check('S1 v2: full utfylt trait-sesjon scorer ok', r1.ok === true);
  check('S1 v3: alle svar value=3 => trait-normalisert 50 per skala',
    r1.result.scales.every((s) => s.normalized === null || nearly(s.normalized, 50)));

  const p2 = basePayload(tdef);
  p2.answers[tdef.items[0].id] = { kind: 'ability', lang: 'no', abilityOriginalIndex: 0 };
  check('S1 v4: kind-mismatch fanges', validatePayload(tdef, p2).ok === false);

  const p3 = basePayload(tdef);
  p3.answers[tdef.items[0].id] = { kind: 'likert', lang: 'no', value: 99 };
  const r3 = validatePayload(tdef, p3);
  check('S1 v5: likert-verdi utenfor options fanges',
    r3.ok === false && r3.errors.some((e) => e.includes('ikke et av option values')));

  const p4 = basePayload(tdef);
  p4.itemIds = ['finnes-ikke'];
  check('S1 v6: ukjent itemId fanges', validatePayload(tdef, p4).ok === false);

  const orderItem = { id: 'o1', kind: 'order', lang: 'no', prompt: 'ordne', elements: ['x', 'y', 'z', 'w'], scales: [{ id: 'x', sign: 1 }] };
  const mini = { id: 'x', languages: ['no'], items: [orderItem] };
  const p5 = basePayload(mini);
  p5.answers.o1 = { kind: 'order', order: ['x', 'x', 'q', 'w'] };
  const r5 = validatePayload(mini, p5);
  check('S1 v7: order duplikat + fremmed element fanges',
    r5.ok === false
    && r5.errors.some((e) => e.includes('duplikat-elementer'))
    && r5.errors.some((e) => e.includes('finnes ikke i item.elements')));

  const p6 = basePayload(tdef); // ingen svar
  const v6 = validatePayload(tdef, p6);
  check('S1 v8: tom økt gir warning om ubesvarte', v6.ok === true && v6.warnings.some((w) => w.includes('ubesvarte')));
}
/* ============ S2 — trait: reversering + normalisering + vekter ============ */
{
  const answers = {
    'bo-openness-01': { kind: 'likert', lang: 'no', value: 5 },   // +5
    'bo-openness-02': { kind: 'likert', lang: 'no', value: 1 },   // revers: -1
    'bc-order-01':  { kind: 'likert', lang: 'no', value: 2 },    // +2
    'bc-order-02':  { kind: 'likert', lang: 'no', value: 4 },    // revers: -4
  };
  const r = scoreTest(tdef, basePayload(tdef, answers));
  check('S2 t1: trait scorer ok', r.ok === true);
  const open = r.result.scales.find((s) => s.id === 'openness');
  const cons = r.result.scales.find((s) => s.id === 'conscientiousness');
  check('S2 t2: åpenhet raw = 4 (5 + (-1))', open.raw === 4);
  check('S2 t3: åpenhet min/max = -4/4', open.minPossible === -4 && open.maxPossible === 4);
  check('S2 t4: åpenhet normalisert = 100', nearly(open.normalized, 100));
  check('S2 t5: planlagthet raw = -2 (2 + (-4))', cons.raw === -2);
  check('S2 t6: planlagthet normalisert = 25', nearly(cons.normalized, 25));
  check('S2 t7: reversedCount = 1 per skala', open.reversedCount === 1 && cons.reversedCount === 1);
  // kompositt: vekter alle 1 => gjennomsnitt av de to skalaene med data (andre har 0 items)
  const composit = r.result.total.composite;
  check('S2 t8: kompositt = gjennomsnitt av skalaer med data', nearly(composit, 62.5));
  check('S2 t9: norms none => ingen prosentilnoter, not.trait.not-normed finnes',
    r.result.total.norms === 'none' && r.result.notes.some((n) => n.id === 'note.trait.not-normed'));
  check('S2 t10: 2 ubrukte traits gir warning', r.warnings.filter((w) => w.includes('ingen besvarte items')).length === 3);

  // vekter: openness 3, consc 1 => kompositt (3*100 + 1*25)/4 = 81.25
  const wdef = JSON.parse(JSON.stringify(tdef));
  wdef.scoring.traits.find((t) => t.id === 'openness').weight = 3;
  wdef.scoring.traits.find((t) => t.id === 'conscientiousness').weight = 1;
  const rw = scoreTest(wdef, basePayload(wdef, answers));
  check('S2 t11: vekter driver kompositten (3:1 => 81.25)', nearly(rw.result.total.composite, 81.25));

  // norms=published uten data => warning, ikke prosentiler
  const ndef = JSON.parse(JSON.stringify(tdef));
  ndef.scoring.norms = 'published';
  const rn = scoreTest(ndef, basePayload(ndef, answers));
  check('S2 t12: norms published uten normsdata => warning (fabrikkeres aldri)',
    rn.warnings.some((w) => w.includes('fabrikkeres aldri')));
}

/* ============ S3 — threshold: band + guidance + disclaimer ============ */
{
  // 5-punkts skala: begge likert 5 => raw 10 => top-band (minScore 6)
  const p5 = basePayload(thedef, {
    'ah-01': { kind: 'likert', lang: 'no', value: 5 },
    'ah-02': { kind: 'likert', lang: 'no', value: 5 },
  });
  const r5 = scoreTest(thedef, p5);
  check('S3 h1: threshold ok', r5.ok === true);
  check('S3 h2: score = 10', r5.result.total.score === 10);
  check('S3 h3: band = top', r5.result.total.bandId === 'top');
  check('S3 h4: guidance følger bandet', typeof r5.result.total.guidance === 'string' && r5.result.total.guidance.includes('ADHD'));
  check('S3 h5: disclaimer passeres', r5.result.total.disclaimer === 'screening.not-diagnosis');

  // begge 2 => raw 4 => mid
  const p4 = basePayload(thedef, {
    'ah-01': { kind: 'likert', lang: 'no', value: 2 },
    'ah-02': { kind: 'likert', lang: 'no', value: 2 },
  });
  check('S3 h6: raw 4 => band mid', scoreTest(thedef, p4).result.total.bandId === 'mid');

  // 1 => raw 2: under mid-grense 4, over low 0 => low
  const p2 = basePayload(thedef, {
    'ah-01': { kind: 'likert', lang: 'no', value: 1 },
    'ah-02': { kind: 'likert', lang: 'no', value: 1 },
  });
  check('S3 h7: raw 2 => band low', scoreTest(thedef, p2).result.total.bandId === 'low');
}

/* -------- rapport -------- */
const report = {
  part: 1,
  step: '[BYGG] FASE 1: Scoring-engine — vekter → dimensjonsskår → total (produsent-selftest)',
  total: pass + failures.length,
  pass,
  fail: failures.length,
  failures,
};
writeFileSync(`${HERE}_scoring_selftest_report.json`, JSON.stringify({ ...report, date: '2026-11-14', note: 'del 2 (g-score/partial/determinisme) ligger i _scoring_selftest_g_report.json' }, null, 2));
console.log(`SELFTEST-DEL1 ${pass}/${pass + failures.length} PASS`);
if (failures.length) process.exit(1);
