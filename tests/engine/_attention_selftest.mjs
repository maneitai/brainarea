/**
 * Selftest attention.js v1.0.0 — [BYGG] FASE 1, todo leaf #3714
 * "Attention-check-mekanikk — straightlining-flagg + tidsbruk-terskel."
 *
 * Alle forventninger er håndregnet i kommentaren ved hver check (samme
 * prinsipp som _verify_handcalc_deepseek for scoring.js: forventningenes
 * aritmetikk står i testen, ikke bare i motorutgangen).
 * Kjør: node _attention_selftest.mjs  (node >= 20, ingen dependencies)
 * Rapport: _attention_selftest_report.json
 */
import { writeFileSync } from 'node:fs';
import { evaluateAttention, straightlineIndex, ATTENTION_VERSION, DEFAULTS } from './attention.js';

let pass = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`PASS ${name}${detail !== undefined ? ` — ${detail}` : ''}`); }
  else { failures.push(name); console.log(`FAIL ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ''}`); }
}

/* ================================================================== */
/* fixtures — kun schema v1 egenskaper, lukket objekt                  */
/* ================================================================== */

const OPT5 = Array.from({ length: 5 }, (_, i) => ({ label: ['Svært uenig', 'Uenig', 'Nøytral', 'Enig', 'Svært enig'][i], value: i + 1 }));

function traitDef() {
  return {
    schemaVersion: 1,
    id: 'qc-trait',
    type: 'test-definition',
    family: 'persona',
    languages: ['no', 'en'],
    scoring: {
      type: 'trait',
      traits: [
        { id: 'soc', weight: 1 },
        { id: 'open', weight: 1 },
        { id: 'best', weight: 3 },
      ],
      norms: 'none',
    },
    dimensions: [
      { id: 'soc', label: 'Sosial atferd', labelLanguage: 'no', description: 'sosial' },
      { id: 'open', label: 'Åpenhet', labelLanguage: 'no', description: 'åpenhet' },
      { id: 'best', label: 'Bestemmthet', labelLanguage: 'no', description: 'bestemmthet' },
    ],
    items: [
      ...Array.from({ length: 6 }, (_, i) => ({ id: `li-soc-${i + 1}`, kind: 'likert', lang: 'no', text: `Uttalelse soc ${i + 1}`, options: OPT5, scales: [{ id: 'soc', sign: -1 }] })),
      { id: 'li-op-1', kind: 'likert', lang: 'no', text: 'Uttalelse open 1', options: OPT5, scales: [{ id: 'open', sign: 1 }] },
      { id: 'li-op-2', kind: 'likert', lang: 'no', text: 'Uttalelse open 2', options: OPT5, scales: [{ id: 'open', sign: 1 }] },
      ...Array.from({ length: 4 }, (_, i) => ({ id: `li-best-${i + 1}`, kind: 'likert', lang: 'no', text: `Uttalelse best ${i + 1}`, options: OPT5, scales: [{ id: 'best', sign: 1 }] })),
    ],
  };
}

function thresholdDef() {
  return {
    schemaVersion: 1,
    id: 'qc-thr',
    type: 'test-definition',
    family: 'persona',
    languages: ['no'],
    scoring: {
      type: 'threshold',
      bands: [
        { id: 'lav', minScore: 0, label: 'Lav' },
        { id: 'middels', minScore: 8, label: 'Middels' },
      ],
      disclaimer: 'qc.disclaimer',
    },
    dimensions: [{ id: 'soc', label: 'Sosial', labelLanguage: 'no', description: 's' }],
    items: Array.from({ length: 5 }, (_, i) => ({ id: `th-i-${i + 1}`, kind: 'likert', lang: 'no', text: `Påstand ${i + 1}`, options: OPT5, scales: [{ id: 'soc', sign: 1 }] })),
  };
}

const TRAIT = traitDef();
const THR = thresholdDef();
const TRAIT_IDS = TRAIT.items.map((i) => i.id); // 12 items
const THR_IDS = THR.items.map((i) => i.id); // 5 items

function payloadOf(def, values, extra = {}) {
  const answers = {};
  for (const [id, v] of Object.entries(values)) answers[id] = { kind: 'likert', lang: 'no', value: v };
  return Object.assign({
    testId: def.id,
    lang: 'no',
    itemIds: def.items.map((i) => i.id),
    startedAt: 1000,
    finishedAt: 9999,
    timeSpentSec: 0,
    expired: false,
    answers,
  }, extra);
}

/* ================================================================== */
/* 0. enhet: straightlineIndex                                          */
/* ================================================================== */
{
  const s0 = straightlineIndex([]);
  check('E0 a: tom seq => length 0', s0.length === 0 && s0.ids.length === 0);
  const s1 = straightlineIndex([{ id: 'a', value: 1 }, { id: 'b', value: 1 }, { id: 'c', value: 2 }, { id: 'd', value: 2 }, { id: 'e', value: 2 }]);
  check('E0 b: lengste run vinner (3 vs 2)', s1.length === 3 && JSON.stringify(s1.ids) === '["c","d","e"]');
  const s2 = straightlineIndex([{ id: 'a', value: 5 }, { id: 'b', value: 4 }, { id: 'c', value: 5 }]);
  check('E0 c: vekslende => run 1', s2.length === 1);
}

/* ================================================================== */
/* A. straightlining: håndregnet                                        */
/* ================================================================== */
{
  // session: alle 12 items med verdi 2 => lengste run 12 (hele sekvensen identisk)
  const vals = {};
  for (const id of TRAIT_IDS) vals[id] = 2;
  const p = payloadOf(TRAIT, vals, { timeSpentSec: 600 });
  const r = evaluateAttention(TRAIT, p);
  check('A a: ok', r.ok === true, r.errors);
  const ls = r.quality.metrics.longstring;
  // HÅND: alle 12 likert-verdier identiske (2) => longstring = 12, alle item-ider
  check('A b: longstring 12 over hele økten', ls.length === 12, ls.length);
  check('A c: run-ider i presentasjonsrekkefølge', JSON.stringify(ls.ids) === JSON.stringify(TRAIT_IDS));
  check('A d: flagg kind=straightline, severity medium', r.quality.flags.some((f) => f.kind === 'straightline' && f.severity === 'medium'));
  // K=5, L=12 => p = 5^(1-12) = 1/48828125
  check('A e: iid-overslag 5^-11 = 1/48828125', ls.runWindowProbability && ls.runWindowProbability.estimate === 5 ** -11, ls.runWindowProbability);
  check('A f: status flagged', r.quality.status === 'flagged');
  check('A g: tidsflagg fraværende (600 s >> gulv)', !r.quality.flags.some((f) => f.kind === 'fast-session'));

  // 6 run + 4 run < terskel 6: [2,2,2,2,2,2, 4,4,4,4] → kun 6-run flagges
  const def2 = traitDef();
  def2.items = [def2.items[0], def2.items[1], def2.items[2], def2.items[3], def2.items[4], def2.items[5], def2.items[9], def2.items[10], def2.items[11], def2.items[8]].map((it) => ({ ...it }));
  const ids2 = def2.items.map((i) => i.id); // soc1..soc6, op2 (id list order matters)
  const vals2 = {}; for (const id of ids2.slice(0, 6)) vals2[id] = 2; for (const id of ids2.slice(6)) vals2[id] = 4;
  const r2 = evaluateAttention(def2, payloadOf(def2, vals2, { timeSpentSec: 600 }));
  // HÅND: run(2)=6 => flagg; run(4)=4 < 6 => intet flagg
  const sl2 = r2.quality.flags.filter((f) => f.kind === 'straightline');
  check('A h: 6-run flagges, 4-run ikke (>= er strict grense)', sl2.length === 1 && sl2[0].itemIds.length === 6, r2.quality.flags);
  // run=5 overstyring: 4-run forblir under, 6-run fanges med 5
  const r3 = evaluateAttention(def2, payloadOf(def2, vals2, { timeSpentSec: 600 }), { straightline: { run: 5 } });
  check('A i: oversteing run=5 fanger 6-run', r3.quality.flags.some((f) => f.kind === 'straightline' && f.itemIds.length === 6));
  // ikke-konsernutvalg: mixed verdier => ingen run >= 2 når ingen to like ligger sammen
  const vals4 = {};
  const pat = [1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2];
  TRAIT_IDS.forEach((id, i) => { vals4[id] = pat[i]; });
  const r4 = evaluateAttention(TRAIT, payloadOf(TRAIT, vals4, { timeSpentSec: 600 }));
  check('A j: vekslende mønster gir ingen straightline-flagg', !r4.quality.flags.some((f) => f.kind === 'straightline') && r4.quality.metrics.longstring.length === 1);
}

/* ================================================================== */
/* B. tidsbruk per item (itemTimes) — håndregnet                        */
/* ================================================================== */
{
  const vals = {};
  for (const id of TRAIT_IDS) vals[id] = 3;
  const itemTimes = {};
  for (const id of TRAIT_IDS) itemTimes[id] = id.startsWith('li-soc') ? 1.2 : 7.5; // 6 raske, 6 ok
  const r = evaluateAttention(TRAIT, payloadOf(TRAIT, vals, { timeSpentSec: 600 }), { itemTimes });
  // HÅND: gulv likert = 2.0; 6 items på 1.2 s < 2.0 => 6 fast-item flagg
  const fi = r.quality.flags.filter((f) => f.kind === 'fast-item');
  check('B a: 6 fast-item flagg (1.2 s < 2.0 s gulv)', fi.length === 6, fi.length);
  check('B b: coverage 12/12', r.quality.metrics.perItemTime && r.quality.metrics.perItemTime.coverage === 1);
  check('B c: sesjonsregel IKKE brukt når per-item levert', r.quality.metrics.sessionTime === null);
  check('B d: note nevner dobbelttellings-unngang', r.quality.notes.some((n) => n.id === 'note.time.per-item-source'));
  check('B e: fast-item detalj inneholder tallene', fi[0].detail.includes('1.20') && fi[0].detail.includes('2'));

  // overstyring: likert-gulv = 1.0 => ingen fast-item
  const r2 = evaluateAttention(TRAIT, payloadOf(TRAIT, vals, { timeSpentSec: 600 }), { itemTimes, timeFloor: { likert: 1.0 } });
  check('B f: gulv-overstyring 1.0 s fjerner flagg', r2.ok && !r2.quality.flags.some((f) => f.kind === 'fast-item'));
}

/* ================================================================== */
/* C. tidsbruk via timeline (ms-tidsstempler) + delvis dekning          */
/* ================================================================== */
{
  const vals = {};
  for (const id of THR_IDS) vals[id] = 3;
  const durations = [1.5, 2.0, 3.0, 10.0, 0.8]; // sekunder; HÅND: fast = 1.5 og 0.8 (gulv 2.0)
  const timeline = THR_IDS.map((id, i) => ({ itemId: id, presentedAtMs: 1000 + i * 1000, submittedAtMs: 1000 + i * 1000 + durations[i] * 1000 }));
  const r = evaluateAttention(THR, payloadOf(THR, vals, { timeSpentSec: 17.3 }), { timeline });
  const fi = r.quality.flags.filter((f) => f.kind === 'fast-item');
  check('C a: to fast-items (1.5 s og 0.8 s < 2.0 s)', fi.length === 2 && fi.map((f) => f.itemId).sort().join(',') === 'th-i-1,th-i-5', fi.map((f) => f.itemId));
  check('C b: 2.0 s === gulv er IKKE flagg (streng <)', !r.quality.flags.some((f) => f.itemId === 'th-i-2'));
  check('C c: coverage 5/5, kilde timeline', r.quality.metrics.perItemTime.coverage === 1 && r.quality.metrics.perItemTime.source === 'timeline');
  check('C d: sesjonsregel ikke dobbelttelt', r.quality.metrics.sessionTime === null);
}

/* ================================================================== */
/* D. sesjonsnivå-fallback (kun timeSpentSec) — håndregnet              */
/* ================================================================== */
{
  const vals = {};
  for (const id of TRAIT_IDS) vals[id] = 3;
  // 12 likert-besvarte => Σ gulv = 12 * 2.0 = 24 s; factor 0.5 => terskel 12.0 s
  const r1 = evaluateAttention(TRAIT, payloadOf(TRAIT, vals, { timeSpentSec: 11.9 }));
  check('D a: 11.9 s < 12.0 s => fast-session flagg', r1.quality.flags.some((f) => f.kind === 'fast-session'), r1.quality.metrics.sessionTime);
  const r2 = evaluateAttention(TRAIT, payloadOf(TRAIT, vals, { timeSpentSec: 12 }));
  // HÅND: 12 === 12*0.5 er IKKE < => ingen flagg (streng ulikhet)
  check('D b: 12.0 s === terskel er ikke flagg', !r2.quality.flags.some((f) => f.kind === 'fast-session'));
  // HÅND: D-blocken bruker uniform 3 — det er selv straightlining (A e beviser
  // motoren fanger 12-run). Vekslende mønster her isolerer tids-regelen:
  const valsAlt = {};
  const alt = [1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2];
  TRAIT_IDS.forEach((id, i) => { valsAlt[id] = alt[i]; });
  const r3 = evaluateAttention(TRAIT, payloadOf(TRAIT, valsAlt, { timeSpentSec: 30 }));
  check('D c: vekslende mønster + 30 s => clean (0 flagg)', r3.quality.status === 'clean' && r3.quality.summary.flags === 0, r3.quality.summary);
  const agg = r3.quality.metrics.sessionTime;
  check('D d: aggregateFloor = 24 (12 × 2.0), factor 0.5', agg.aggregateFloor === 24 && agg.factor === 0.5, agg);

  // ingen tid i det hele tatt: fabrikkeres aldri
  const pl = payloadOf(TRAIT, valsAlt); // vekslende — ellers fanger straightline-regelen uniform-3
  delete pl.timeSpentSec;
  const r4 = evaluateAttention(TRAIT, pl);
  check('D e: ingen tid => sessionTime null + note, ingen flagg', r4.quality.metrics.sessionTime === null && r4.quality.summary.flags === 0
    && r4.quality.notes.some((n) => n.id === 'note.time.unavailable'));
}

/* ================================================================== */
/* E. attention-checks (3-veis: fail / missing+not-sampled / pass)      */
/* ================================================================== */
{
  const vals = {};
  for (const id of TRAIT_IDS) vals[id] = 3;
  vals['li-soc-1'] = 3; // gitt 3; accepted=[5] => FAIL
  const r1 = evaluateAttention(TRAIT, payloadOf(TRAIT, vals, { timeSpentSec: 600 }), { attentionItems: [{ id: 'li-soc-1', accepted: [5] }] });
  const f1 = r1.quality.flags.filter((f) => f.severity === 'high');
  check('E a: feil instruert svar => high-flagg attention-failed', f1.length === 1 && f1[0].kind === 'attention-failed', r1.quality.flags);
  check('E b: attentionChecks rad med ok=false', r1.quality.metrics.attentionChecks[0].ok === false && r1.quality.metrics.attentionChecks[0].given === 3);

  // ikke-samplet: item finnes i def men ikke i itemIds
  const pl2 = payloadOf(TRAIT, vals, { timeSpentSec: 600 });
  pl2.itemIds = pl2.itemIds.filter((id) => id !== 'li-soc-1');
  const r2 = evaluateAttention(TRAIT, pl2, { attentionItems: [{ id: 'li-soc-1', accepted: [5] }] });
  check('E c: ikke i økten => ok=null, ingen flagg', r2.quality.metrics.attentionChecks[0].ok === null && r2.quality.summary.high === 0, r2.quality.attentionChecks);

  // presentert men ubesvart
  const pl3 = payloadOf(TRAIT, vals, { timeSpentSec: 600 });
  delete pl3.answers['li-soc-2']; // check-item på li-soc-2
  const r3 = evaluateAttention(TRAIT, pl3, { attentionItems: [{ id: 'li-soc-2', accepted: [5] }] });
  const f3 = r3.quality.flags.filter((f) => f.kind === 'attention-missing');
  check('E d: presentert men ubesvart => attention-missing (high)', f3.length === 1 && r3.quality.metrics.attentionChecks[0].ok === false, r3.quality.flags);

  // pass: accepted=[3], gitt 3
  const r4 = evaluateAttention(TRAIT, payloadOf(TRAIT, vals, { timeSpentSec: 600 }), { attentionItems: [{ id: 'li-soc-1', accepted: [3] }] });
  check('E e: riktig instruert svar => ok=true, ingen high', r4.quality.metrics.attentionChecks[0].ok === true && r4.quality.summary.high === 0);
}

/* ================================================================== */
/* F. scoring-uavhengighet: def/payload ikke mutert; determinisme       */
/* ================================================================== */
{
  const vals = {};
  for (const id of TRAIT_IDS) vals[id] = 2;
  const p = payloadOf(TRAIT, vals, { timeSpentSec: 5 });
  const opts = { itemTimes: { 'li-soc-1': 0.9 }, attentionItems: [{ id: 'li-soc-1', accepted: [5] }] };
  const snapD = JSON.stringify(TRAIT);
  const snapP = JSON.stringify(p);
  const snapO = JSON.stringify(opts);
  const r1 = evaluateAttention(TRAIT, p, opts);
  const r2 = evaluateAttention(TRAIT, p, opts);
  check('F a: def uforandret (bitvis)', JSON.stringify(TRAIT) === snapD);
  check('F b: payload uforandret (bitvis)', JSON.stringify(p) === snapP);
  check('F c: opts uforandret (bitvis)', JSON.stringify(opts) === snapO);
  check('F d: determinisme — to kall identisk output', JSON.stringify(r1) === JSON.stringify(r2));
}

/* ================================================================== */
/* G. konfigfeil => ok:false, ingen quality (feil vs advarsel-ordning)  */
/* ================================================================== */
{
  const vals = {};
  for (const id of TRAIT_IDS) vals[id] = 3;
  const okP = payloadOf(TRAIT, vals, { timeSpentSec: 600 });
  check('G a: run < 2 nektet', evaluateAttention(TRAIT, okP, { straightline: { run: 1 } }).ok === false);
  check('G b: ikke-endelig timeFloor nektet', evaluateAttention(TRAIT, okP, { timeFloor: { likert: 'xx' } }).ok === false);
  check('G c: ukjent kind i timeFloor nektet', evaluateAttention(TRAIT, okP, { timeFloor: { likert7: 1 } }).ok === false);
  check('G d: factor ute av (0..1] nektet', evaluateAttention(TRAIT, okP, { sessionFastFactor: 1.4 }).ok === false);
  check('G e: itemTimes ikke-objekt nektet', evaluateAttention(TRAIT, okP, { itemTimes: 'x' }).ok === false);
  check('G f: timeline ikke-liste nektet', evaluateAttention(TRAIT, okP, { timeline: {} }).ok === false);
  {
    // HÅND: regelen er at tid for UBSVARTE items ignoreres stille — invalid-testen
    // må derfor gi itemet et svar først, ellers er oppføringen uten objekt å feile på.
    const thrVals = {}; for (const id of THR_IDS) thrVals[id] = 4;
    const r = evaluateAttention(THR, payloadOf(THR, thrVals, { timeSpentSec: 600 }), { timeline: [{ itemId: 'th-i-1', presentedAtMs: 2000, submittedAtMs: 1000 }] });
    check('G g: submitted < presented (besvart item) => feil', r.ok === false && r.errors.some((e) => e.includes('th-i-1')), r.errors);
    // og: samme invalid-stempel for Ubesvart item => ignoreres stille (regelen, testet)
    const pl2 = payloadOf(THR, {});
    pl2.timeSpentSec = 600;
    const r2 = evaluateAttention(THR, pl2, { timeline: [{ itemId: 'th-i-1', presentedAtMs: 2000, submittedAtMs: 1000 }] });
    check('G n: invalid stempel for ubesvart item ignoreres stille', r2.ok === true, r2.errors);
  }
  check('G h: attentionItems id ukjent i def => feil', evaluateAttention(TRAIT, okP, { attentionItems: [{ id: 'finnes-ikke', accepted: [1] }] }).ok === false);
  check('G i: attentionItems tom accepted => feil', evaluateAttention(TRAIT, okP, { attentionItems: [{ id: 'li-soc-1', accepted: [] }] }).ok === false);
  {
    const pl = payloadOf(TRAIT, vals);
    pl.testId = 'feil-id';
    check('G j: testId-mismatch => feil', evaluateAttention(TRAIT, pl).ok === false);
  }
  {
    const pl = payloadOf(TRAIT, vals);
    pl.itemIds = [...pl.itemIds, 'spokelse'];
    check('G k: ukjent itemId => feil', evaluateAttention(TRAIT, pl).ok === false);
  }
  {
    // gyldig men redusert: per-item tid dekker delmengde => warning, ikke error
    const r = evaluateAttention(TRAIT, okP, { itemTimes: { 'li-op-1': 0.5 } });
    check('G l: delvis per-item-dekning => warning (ok:true)', r.ok === true && r.warnings.some((w) => w.includes('dekker 1 av 12')), r.warnings);
  }
  {
    // itemTimes for ubesvart item ignoreres stille (ubesvart har ingen tid)
    const pl = payloadOf(TRAIT, vals, { timeSpentSec: 600 });
    pl.itemIds = pl.itemIds.filter((id) => id !== 'li-op-2');
    const r = evaluateAttention(TRAIT, pl, { itemTimes: { 'li-op-2': 4.2 } });
    check('G m: tid for ubesvart item ignoreres stille', r.ok === true, r.errors);
  }
}

/* ================================================================== */
/* H. kompositt-kompatibilitet med scoring.js (kontrakten bevares)      */
/* ================================================================== */
{
  const vals = {};
  for (const id of TRAIT_IDS) vals[id] = 2; // soc: -1*12=-12, norm (-12+30)/24=75; best: 16, norm (16-4)/16=100; open: [3,1] norm (4-2)/8=25
  const p = payloadOf(TRAIT, vals, { timeSpentSec: 600 });
  const att = await import('./attention.js');
  const att1 = att.evaluateAttention(TRAIT, p);
  // HÅND: p har uniform 2 på alle 12 likert-items => nøyaktig ett straightline-flagg
  // (12-run), tid 600 s => ingen tidsflagg. Deteksjon ≠ eksklusjon:
  // scoring på samme payload (H b-d) er urokkelig uavhengig av flaggene.
  check('H a: attention ok, nøyaktig ett straightline-flagg (uniform 2), ingen tidsflagg',
    att1.ok === true && att1.quality.summary.flags === 1 && att1.quality.summary.medium === 1
    && att1.quality.flags[0].kind === 'straightline', att1.quality.summary);
  // scoring på samme (def, payload): kjør hvis scoring.js er tilgjengelig
  try {
    const { scoreTest } = await import('./scoring.js');
    const sc = scoreTest(TRAIT, p);
    // HÅND: best raw 8, norm (8-4)/16*100=... se kommentar: verdier [2,2,2,2] sign+1 => raw 8, min 4, max 20 => 25
    const best = sc.result.scales.find((s) => s.id === 'best');
    const soc = sc.result.scales.find((s) => s.id === 'soc');
    check('H b: scoring ok på samme payload', sc.ok === true, sc.errors);
    check('H c: hand: best norm 25 (raw 8, område 4..20)', best.normalized === 25, best.normalized);
    check('H d: hand: soc norm 75 (sign=-1, raw -12, omr -30..-6)', soc.normalized === 75, soc.normalized);
  } catch (e) {
    check('H b/c/d: scoring.js utilgjengelig i denne konteksten', false, String(e));
  }
  check('H e: DEFAULTS eksportert med dokumenterte verdier', DEFAULTS.straightlineRun === 6 && DEFAULTS.timeFloor.likert === 2 && DEFAULTS.timeFloor.ability === 3 && DEFAULTS.sessionFastFactor === 0.5);
  check('H f: versjon 1.0.0', ATTENTION_VERSION === '1.0.0');
}

/* ================================================================== */
const total = pass + failures.length;
console.log(`\nSELFTEST ${pass}/${total} PASS`);
const report = {
  step: '[BYGG] FASE 1, todo #3714: attention-check-mekanikk',
  module: 'tests/engine/attention.js v1.0.0',
  total,
  pass,
  fail: failures.length,
  failures,
  thresholds: {
    straightline: 'run >= 6 like likert-verdier i rekkefølge (i.i.d. 5-punkts sjanse for enkeltvindu på 6: 5^-5 = 0.032%)',
    timeFloor: 'likert 2.0 s, ability/order 3.0 s per item (lesegulv); sesjons-fallback 0.5 × Σgulv',
    attention: 'instruerte items (accepted-verdier): feil/ubesvart => high',
  },
  principper: ['deteksjon ≠ eksklusjon — ingen svar forkastes eller vektes', 'ingen fabrikasjon: ingen tid => ingen tidsflagg + note', 'per-item tid kun ved eksplisitt leveranse; sesjonsregel da inaktiv (ingen dobbelttell)'],
  kjentBegrensning: 'terskler er dokumenterte forhåndsvalg, ikke kalibrert mot innsamlede data — kontrolleres av #3715/[VERIFISER] og FASE 2 QC-rapport',
  date: '2026-11-14',
};
writeFileSync(new URL('./_attention_selftest_report.json', import.meta.url), JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
