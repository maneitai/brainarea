/**
 * Selftest for scoring.js (del 2: g-score, partial/coverage, determinisme) — [BYGG] FASE 1, #3712
 * Kjør: node _scoring_selftest_g.mjs   (node >= 20, ingen dependencies)
 * Rapport: _scoring_selftest_g_report.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { scoreTest, estimateTheta1PL, thetaToIq, SCORING_VERSION } from './scoring.js';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = HERE.replace(/tests[\\/]engine[\\/]$/, '');

let pass = 0;
const failures = [];
function check(name, cond) {
  if (cond) { pass++; console.log(`PASS ${name}`); }
  else { failures.push(name); console.log(`FAIL ${name}`); }
}
const nearly = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

const FIX = ['fixture-gscore-matrix.no.json', 'fixture-trait-big5.no.json']
  .map((n) => JSON.parse(readFileSync(`${ROOT}/tests/schema/${n}`, 'utf8')));
const gdef = FIX.find((f) => f.scoring.type === 'g-score');
const tdef = FIX.find((f) => f.scoring.type === 'trait');

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

/* ============ G1 — theta-estimator mot håndregnede verdier ============ */
{
  const rAllWrong = estimateTheta1PL([{ difficulty: -1, correct: false }, { difficulty: 0.5, correct: false }]);
  check('G1 a: alle-feil => theta null (mle uendelig)', rAllWrong.theta === null && rAllWrong.reason === 'alle-feil');
  const rAllRight = estimateTheta1PL([{ difficulty: -1, correct: true }, { difficulty: 0.5, correct: true }]);
  check('G1 b: alle-riktig => theta null', rAllRight.theta === null && rAllRight.reason === 'alle-riktig');

  // y=[1,0], b=[-0.5, +0.5]: p1+p2=1 => 2u^2=1, u=e^t => t = -0.5*ln(2) ≈ -0.34657359
  const r = estimateTheta1PL([{ difficulty: -0.5, correct: true }, { difficulty: 0.5, correct: false }]);
  check('G1 c: theta = 0 (lukket form: y=[1,0], b=[±0.5] => p1+p2=1 <=> e^-2t=1)', nearly(r.theta, 0, 1e-9));
  check('G1 d: CI symmetrisk rundt theta, theta i midten',
    nearly((r.ci95[0] + r.ci95[1]) / 2, r.theta, 1e-9) && r.ci95[0] < r.theta && r.theta < r.ci95[1]);
  check('G1 e: metode ledd', r.method === '1pl-mle' && r.n === 2);

  // fire items 2 riktig 2 feil, symmetrisk vanskelighetsgrad => theta = midt i symmetri (=0)
  const r4 = estimateTheta1PL([
    { difficulty: -1.5, correct: true }, { difficulty: -0.5, correct: false },
    { difficulty: 0.5, correct: true }, { difficulty: 1.5, correct: false },
  ]);
  // symmetri: theta=0 gir p=(0.818,0.378?) — ikke eksakt null-krav; bare plausibilitetsbånd
  check('G1 f: fire items, endelig theta, CI straddler', r4.theta !== null && r4.ci95[0] < r4.theta && r4.theta < r4.ci95[1]);

  // thetaToIq: kun med gyldige normer
  check('G1 g: thetaToIq null uten normer', thetaToIq(0, null) === null && thetaToIq(0, { mean: 'x', sd: 0 }) === null);
  check('G1 h: theta = norm-mean => 100', nearly(thetaToIq(-0.5 * Math.LN2, { mean: -0.5 * Math.LN2, sd: 1 }), 100, 1e-9));
  check('G1 i: sd=0 => null (ingen fabrikkerte normer)', thetaToIq(0, { mean: 0, sd: 0 }) === null);
  check('G1 j: +1 sd => 115', nearly(thetaToIq(0, { mean: -1, sd: 1 }), 115, 1e-9));
}

/* ============ G2 — g-score payload end-to-end ============ */
{
  // riktig indeks (2) => correct=1; feil indeks (0) => correct=0
  const ok = basePayload(gdef, { 'mx-0001': { kind: 'ability', lang: 'no', abilityOriginalIndex: 2 } });
  const rok = scoreTest(gdef, ok);
  check('G2 a: riktig svart ability => correct=1', rok.ok === true && rok.result.total.correctCount === 1);
  check('G2 b: theta=+inf->null ved alle-riktig (1 item)', rok.result.total.theta === null
    && rok.result.total.ci95 === null && rok.warnings.some((w) => w.includes('alle-riktig')));
  check('G2 c: proportion = 1', nearly(rok.result.total.proportion, 1));
  check('G2 d: not-normed-ærlighet', rok.result.total.notNormed === true && rok.result.total.iqScale === null
    && rok.result.notes.some((n) => n.id === 'note.gscore.not-normed'));

  const wrong = basePayload(gdef, { 'mx-0001': { kind: 'ability', lang: 'no', abilityOriginalIndex: 0 } });
  const rw = scoreTest(gdef, wrong);
  check('G2 e: feil svart => correct=0, theta null (alle-feil)', rw.result.total.correctCount === 0 && rw.result.total.theta === null);
  // sign=-1 på ability => warning
  const sdef = JSON.parse(JSON.stringify(gdef));
  sdef.items[0].scales[0].sign = -1;
  const rs = scoreTest(sdef, ok);
  check('G2 f: ability sign=-1 => warning (ignorert)', rs.warnings.some((w) => w.includes('sign ignorert')));

  // to items (klon), 1 riktig 1 feil, b=[-0.5,+0.5] => theta = -0.5*ln2
  const two = JSON.parse(JSON.stringify(gdef));
  const clone2 = JSON.parse(JSON.stringify(two.items[0]));
  clone2.id = 'mx-0002';
  clone2.variants[0].difficulty = 0.5;
  clone2.variants[1].difficulty = 0.5;
  two.items.push(clone2);
  const p2 = basePayload(two, {
    'mx-0001': { kind: 'ability', lang: 'no', abilityOriginalIndex: 2 }, // riktig (b=-0.5)
    'mx-0002': { kind: 'ability', lang: 'no', abilityOriginalIndex: 0 }, // feil (b=+0.5)
  });
  const r2 = scoreTest(two, p2);
  check('G2 g: to items (b=±0.5, 1 riktig 1 feil) => theta = 0', nearly(r2.result.total.theta, 0, 1e-8));
  check('G2 h: ci95 finnes og straddler theta', Array.isArray(r2.result.total.ci95)
    && r2.result.total.ci95[0] < r2.result.total.theta && r2.result.total.theta < r2.result.total.ci95[1]);
  check('G2 i: correctCount = 1 av 2', r2.result.total.correctCount === 1 && r2.result.total.answeredCount === 2);
}

/* ============ G3 — partial/coverage ============ */
{
  const p = basePayload(tdef, {
    'bo-openness-01': { kind: 'likert', lang: 'no', value: 5 },
    'bo-openness-02': { kind: 'likert', lang: 'no', value: 1 },
  });
  p.finishedAt = undefined; // ufullført
  const rNo = scoreTest(tdef, p);
  check('G3 a: ufullført nektet uten allowPartial', rNo.ok === false);
  p.finishedAt = T0 + 30_000; // fullført-tidsstempel, men 2/4 besvart
  const r = scoreTest(tdef, p);
  check('G3 b: 2/4 besvart => coverage 0.5 + warning', r.ok === true && nearly(r.result.coverage, 0.5)
    && r.warnings.some((w) => w.includes('ubesvarte')));
  const open = r.result.scales.find((s) => s.id === 'openness');
  check('G3 c: full openhet på 2 items => 100', nearly(open.normalized, 100));
  // tom økt med allowPartial
  const empty = basePayload(tdef);
  const re = scoreTest(tdef, empty, { allowPartial: true });
  check('G3 d: tom + allowPartial => composite null', re.ok === true && re.result.total.composite === null
    && nearly(re.result.coverage, 0));
  // ubesvart ability-item holdes utenfor theta
  const gp = basePayload(gdef); // ingen svar
  const rg = scoreTest(gdef, gp, { allowPartial: true });
  check('G3 e: g-score tom økt => proportion null', rg.ok === true && rg.result.total.proportion === null);
}

/* ============ G4 — determinisme + imutabilitet ============ */
{
  const answers = {
    'bo-openness-01': { kind: 'likert', lang: 'no', value: 4 },
    'bo-openness-02': { kind: 'likert', lang: 'no', value: 2 },
    'bc-order-01': { kind: 'likert', lang: 'no', value: 3 },
    'bc-order-02': { kind: 'likert', lang: 'no', value: 5 },
  };
  const def1 = JSON.parse(JSON.stringify(tdef));
  const pay1 = JSON.parse(JSON.stringify(basePayload(tdef, answers)));
  const defSnap = JSON.stringify(def1);
  const paySnap = JSON.stringify(pay1);
  const r1 = scoreTest(def1, pay1);
  const r2 = scoreTest(def1, pay1);
  check('G4 a: samme input => bitvis identisk output', JSON.stringify(r1) === JSON.stringify(r2));
  check('G4 b: def og payload muteres ikke', JSON.stringify(def1) === defSnap && JSON.stringify(pay1) === paySnap);
  check('G4 c: versjonsledd satt', r1.result.engine.scoring === SCORING_VERSION);
}

const report = {
  part: 2,
  step: '[BYGG] FASE 1: Scoring-engine — vekter → dimensjonsskår → total (g-score/partial/determinisme)',
  total: pass + failures.length,
  pass,
  fail: failures.length,
  failures,
  handVerifiable: {
    theta_two_items: '0 (y=[1,0], b=[-0.5,+0.5]: p1+p2=1 <=> e^-2t=1; numerisk: p1=0.6225+p2=0.3775=1.0000),',
    thetaToIq: 'theta=norm-mean => 100; +1sd => 115',
  },
  date: '2026-11-14',
};
writeFileSync(`${HERE}_scoring_selftest_g_report.json`, JSON.stringify(report, null, 2));
console.log(`SELFTEST-DEL2 ${pass}/${pass + failures.length} PASS`);
if (failures.length) process.exit(1);
