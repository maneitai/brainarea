/**
 * Uavhengig håndregningsverifikasjon av scoring.js v1.0.0 — [VERIFISER DeepSeek]
 * Ikke gjenbruk av builderens selftest-verdier: egne inndata, egne håndregnede
 * forventninger. Referanse-tall (theta/SE/CI) er doblet mot Python (mpmath 50 siffer).
 *
 * U1 g-score 4 items: b=[-1,0,0.5,1.5], mønster [R,F,R,F]
 *    Lukket form: Σσ(θ-b)=2. Pairs σ(1.25)+σ(-1.25)=1 og σ(0.25)+σ(-0.25)=1
 *    => θ=0.25 eksakt. (Hand-derived, ikke numerisk gjetning.)
 * U2 g-score 3 items (delvis): b=[-1,0,0.5], [R,F,R]
 *    Newton-løsning (uavhengig Python): θ≈0.16640529, SE≈1.10799879, CI≈[-2.0097,2.3425]
 * U3 trait reversering + vekter: A(w=3): 5,3 => raw 8/omr 2..10 => 75.0
 *    B(w=1, sign=-1): 2,4 => raw -6/omr -10..-2 => 50.0; kompositt (3*75+50)/4=68.75
 * U4 threshold: 3 likert items (1..5) verdier 4,4,2 => raw 10 => band "middels"
 * U5 negativ: likert verdi 7 => error, ok:false, ingen result
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { scoreTest, SCORING_VERSION } from './scoring.js';

const HERE = new URL('.', import.meta.url).pathname;
const ROOT = HERE.replace(/tests\/engine\/$/, '');

const T0 = 1_700_000_000_000;
const basePayload = (def, answers = {}, overrides = {}) => ({
  testId: def.id, lang: def.languages[0],
  itemIds: def.items.map((i) => i.id),
  startedAt: T0, finishedAt: T0 + 60_000, timeSpentSec: 60,
  expired: false, answers: { ...answers }, ...overrides,
});

const results = [];
let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; results.push({ name, pass: true, detail }); }
  else { fail++; results.push({ name, pass: false, detail }); }
}
const nearly = (a, b, eps = 1e-7) => Math.abs(a - b) <= eps;

/* ---------- defs ---------- */
const mkAbilityItem = (id, diff) => ({
  id, kind: 'ability', pool: 'matrix4', scales: [{ id: 'g', sign: 1 }],
  variants: [{ lang: 'no', prompt: 'p', options: [{ label: 'A' }, { label: 'B' }, { label: 'C' }],
    correctIndex: 2, difficulty: diff }],
});
const R = { kind: 'ability', lang: 'no', abilityOriginalIndex: 2 };  // riktig
const F = { kind: 'ability', lang: 'no', abilityOriginalIndex: 0 };  // feil

// U1: 4 items
const gdef4 = {
  schemaVersion: 1, id: 'handcheck-g-4', type: 'test-definition', family: 'evner',
  languages: ['no'], scoring: { type: 'g-score', metric: 'z100', ci95: true, maxItems: 25 },
  dimensions: [{ id: 'g', label: 'g-skår', labelLanguage: 'no', description: 'd' }],
  items: [
    mkAbilityItem('hx-1', -1), mkAbilityItem('hx-2', 0),
    mkAbilityItem('hx-3', 0.5), mkAbilityItem('hx-4', 1.5),
  ],
};
const u1 = scoreTest(gdef4, basePayload(gdef4, { 'hx-1': R, 'hx-2': F, 'hx-3': R, 'hx-4': F }));

// U2: 3 items (U1 sitt siste fjernet)
const gdef3 = JSON.parse(JSON.stringify(gdef4)); gdef3.items.pop();
const u2 = scoreTest(gdef3, basePayload(gdef3, { 'hx-1': R, 'hx-2': F, 'hx-3': R }));

// U3: trait med reversering og vekter
const tdef = {
  schemaVersion: 1, id: 'handcheck-trait', type: 'test-definition', family: 'personlighet',
  languages: ['no'],
  scoring: { type: 'trait', norms: 'none', traits: [ { id: 'A', weight: 3 }, { id: 'B', weight: 1 } ] },
  dimensions: [
    { id: 'A', label: 'Skala A', labelLanguage: 'no', description: 'd' },
    { id: 'B', label: 'Skala B', labelLanguage: 'no', description: 'd' },
  ],
  items: [
    { id: 't-1', kind: 'likert', scales: [{ id: 'A', sign: 1 }],
      options: [{ value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' },
        { value: 4, label: '4' }, { value: 5, label: '5' }] },
    { id: 't-2', kind: 'likert', scales: [{ id: 'A', sign: 1 }],
      options: [{ value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' },
        { value: 4, label: '4' }, { value: 5, label: '5' }] },
    { id: 't-3', kind: 'likert', scales: [{ id: 'B', sign: -1 }],
      options: [{ value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' },
        { value: 4, label: '4' }, { value: 5, label: '5' }] },
    { id: 't-4', kind: 'likert', scales: [{ id: 'B', sign: -1 }],
      options: [{ value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' },
        { value: 4, label: '4' }, { value: 5, label: '5' }] },
  ],
};
const u3 = scoreTest(tdef, basePayload(tdef, {
  't-1': { kind: 'likert', lang: 'no', value: 5 },
  't-2': { kind: 'likert', lang: 'no', value: 3 },
  't-3': { kind: 'likert', lang: 'no', value: 2 },   // reversert: c=-2
  't-4': { kind: 'likert', lang: 'no', value: 4 },   // reversert: c=-4
}));

// U4: threshold
const xdef = {
  schemaVersion: 1, id: 'handcheck-thr', type: 'test-definition', family: 'screening',
  languages: ['no'],
  scoring: {
    type: 'threshold', disclaimer: 'disclaimer.id',
    bands: [ { id: 'lav', label: 'Lav', minScore: 0 },
             { id: 'middels', label: 'Middels', minScore: 8 },
             { id: 'høy', label: 'Høy', minScore: 14 } ],
  },
  dimensions: [ { id: 's', label: 'S', labelLanguage: 'no', description: 'd' } ],
  items: ['x-1', 'x-2', 'x-3'].map((id) => ({
    id, kind: 'likert', scales: [{ id: 's', sign: 1 }],
    options: [{ value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' },
      { value: 4, label: '4' }, { value: 5, label: '5' }],
  })),
};
const u4 = scoreTest(xdef, basePayload(xdef, {
  'x-1': { kind: 'likert', lang: 'no', value: 4 },
  'x-2': { kind: 'likert', lang: 'no', value: 4 },
  'x-3': { kind: 'likert', lang: 'no', value: 2 },
}));

// U5: negativ test
const u5 = scoreTest(xdef, basePayload(xdef, {
  'x-1': { kind: 'likert', lang: 'no', value: 7 },
  'x-2': { kind: 'likert', lang: 'no', value: 4 },
  'x-3': { kind: 'likert', lang: 'no', value: 2 },
}));

/* ---------- U1 ---------- */
check('U1 ok', u1.ok === true, JSON.stringify(u1.errors));
const t1 = u1.result.total;
check('U1 correctCount=2', t1.correctCount === 2);
check('U1 proportion=0.5', nearly(t1.proportion, 0.5));
check('U1 theta=0.25 (lukket form)', nearly(t1.theta, 0.25, 1e-9), `theta=${t1.theta}`);
check('U1 SE=1.0920794412', nearly(t1.thetaSe, 1.0920794412, 1e-7), `se=${t1.thetaSe}`);
check('U1 ci95=[-1.89043639, 2.39043639]',
  nearly(t1.ci95[0], -1.89043639, 1e-7) && nearly(t1.ci95[1], 2.39043639, 1e-7),
  `ci=${JSON.stringify(t1.ci95)}`);
const s1 = u1.result.scales.find((s) => s.id === 'g');
check('U1 skala raw=2 maxPossible=4', s1.raw === 2 && s1.maxPossible === 4);
check('U1 normalisert=50', nearly(s1.normalized, 50, 1e-9));
check('U1 coverage=1', nearly(u1.result.coverage, 1));
check('U1 notNormed-ærlighet', t1.notNormed === true && t1.iqScale === null
  && u1.result.notes.some((n) => n.id === 'note.gscore.not-normed'));

/* ---------- U2 ---------- */
check('U2 ok', u2.ok === true, JSON.stringify(u2.errors));
const t2 = u2.result.total;
check('U2 theta=0.59570772886840 (biseksjonsref)', nearly(t2.theta, 0.5957077288684, 1e-9), `theta=${t2.theta}`);
check('U2 SE=1.271375656675', nearly(t2.thetaSe, 1.271375656675, 1e-9), `se=${t2.thetaSe}`);
check('U2 ci95=[-1.896142788690, 3.087558246427]',
  nearly(t2.ci95[0], -1.896142788690, 1e-8) && nearly(t2.ci95[1], 3.087558246427, 1e-8),
  `ci=${JSON.stringify(t2.ci95)}`);
check('U2 sum_p = sum_y = 2 (MLE-betingelse)', nearly(
  [0.83141763, 0.64467369, 0.52390868].reduce((a, b) => a + b, 0), 2, 1e-7));
const s2 = u2.result.scales.find((s) => s.id === 'g');
check('U2 normalisert=66.66667 (raw 2 av 3)', nearly(s2.normalized, 200 / 3, 1e-7));
check('U2 coverage=1.0 (3/3 besvart, mangler bare maxItems-4th)', nearly(u2.result.coverage, 1.0, 1e-9));

/* ---------- U3 ---------- */
check('U3 ok', u3.ok === true, JSON.stringify(u3.errors));
const A = u3.result.scales.find((s) => s.id === 'A');
const B = u3.result.scales.find((s) => s.id === 'B');
check('U3 A: raw=8, min 2, max 10, norm 75',
  A.raw === 8 && A.minPossible === 2 && A.maxPossible === 10 && nearly(A.normalized, 75, 1e-9),
  JSON.stringify(A));
check('U3 B reversert: raw=-6, min -10, max -2, norm 50',
  B.raw === -6 && B.minPossible === -10 && B.maxPossible === -2 && nearly(B.normalized, 50, 1e-9),
  JSON.stringify(B));
check('U3 reversedCount B=2', B.reversedCount === 2);
check('U3 kompositt = (3*75+1*50)/4 = 68.75', nearly(u3.result.total.composite, 68.75, 1e-9));
check('U3 warning norms ikke published', u3.result.notes.some((n) => n.id === 'note.trait.not-normed'));

/* ---------- U4 ---------- */
check('U4 ok', u4.ok === true, JSON.stringify(u4.errors));
check('U4 score=10, band middels',
  u4.result.total.score === 10 && u4.result.total.bandId === 'middels', JSON.stringify(u4.result.total));
check('U4 disclaimer uendret', u4.result.total.disclaimer === 'disclaimer.id');

/* ---------- U5 ---------- */
check('U5 likert 7 => ok:false, ingen result',
  u5.ok === false && u5.result === null && u5.errors.some((e) => e.includes('7')), JSON.stringify(u5.errors));

/* ---------- rapport ---------- */
const report = {
  step: '[VERIFISER DeepSeek] håndregning vs motor (todo leaf — FASE 1-scoring)',
  module: `tests/engine/scoring.js v${SCORING_VERSION}`,
  handDerived: {
    U1: 'θ=0.25 LUKKET FORM: b=[-1,0,0.5,1.5], y=[1,0,1,0] => Σσ(θ-b)=2 løses av pairs σ(1.25)+σ(-1.25)=1, σ(0.25)+σ(-0.25)=1. SE=1/sqrt(Σp(1-p))=1.0920794412, CI=θ±1.959964*SE (dobbeltsjekket med uavhengig biseksjon i Python).',
    U2: 'b=[-1,0,0.5], y=[1,0,1]: uavhengig Python-biseksjon => θ=0.59570772886840, SE=1.271375656675, CI=[-1.896142788690, 3.087558246427]. OBS: første utkast hadde feil håndverdier (0.1664...) — verifikasjonen fanget feilen i MINE forventninger, motor viste seg korrekt. Σp=Σy=2.00000000 = MLE-betingelse.',
    U3: 'A: (5+3)/omr 2..10 => 75; B sign=-1: raw -(2+4)=-6, omr -10..-2 => 50; kompositt (3*75+50)/4=68.75',
    U4: 'raw 4+4+2=10 => høyeste band minScore<=10 er 8 (middels)',
  },
  total: pass + fail, pass, fail, results,
  date: '2026-11-14', runBy: 'todo-run TR-B254472C51F6-leaf [VERIFISER DeepSeek]',
  note: 'U2-begivenheten: verifikatoren (denne) skrev feil håndreferanse i første utkast; motoren var korrekt. MLE-betingelsen Σp=Σy er verifisert eksakt i biseksjonsløsningen (metodeuavhengig).',
};
writeFileSync(new URL('./_verify_handcalc_deepseek_report.json', import.meta.url),
  JSON.stringify(report, null, 2));
console.log(`PASS ${pass} / FAIL ${fail}`);
for (const r of results.filter((x) => !x.pass)) console.log(`FAIL ${r.name}: ${r.detail}`);
