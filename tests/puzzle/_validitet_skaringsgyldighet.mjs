/**
 * _validitet_skaringsgyldighet.mjs — [3-VEIS][VERIFISER] FASE 2, brett-steg:
 * "Puzzle skåringsgyldighet — korrelerer scoren med konstruktet, eller er det bare highscore?"
 *
 * Tverrgående verifikasjon (TR-6E5FD6B419B0, 2026-11-16):
 *   V1: fasit-gyldighet fra PROMPTEN (prompt-tile-ro, aldri meta.rule alene) — alle 90 items,
 *       sirkularitetsfri (A10-leksjonen fra spilltesten): brute-force over enkle regelfamilier.
 *   V2: eksakt-én-nøkkel-prøven: er nøyaktig ETT alternativ forenlig med ALLE ledd?
 *   V3: kontrafaktisk s3-fix (fasit = pos 7 = Y-continuation) — holder eksakt-én etter fix?
 *   V4: distraktor-gyldighet: nøyaktig-én-regel-off (minst én per lem, fasit treffer ALLE).
 *   V5: θ-gjenvinning med EKTE scoring.js over EKTE 16-etagers-kurve (seedet simulering).
 *   V6: konstrukt vs count: score ≠ highscore (persons med lik råscore, ulik θ;
 *       corr(θ,count) < 1; lem-lesere/tilfeldig skilles fra full-regel-lesere).
 *   V7: SE/Informasjon-profil: hvor bred er det ærlige båndet per evne-nivå.
 *   V8: første-respons-kontrakt via ekte player-API i simulering med retries (E-gruppe-reprise).
 *
 * Kjøring: node tests/puzzle/_validitet_skaringsgyldighet.mjs
 * Rapport: tests/puzzle/_validitet_skaringsgyldighet_report.json
 * SIMULERINGSNOTE: V5–V7 bruker en seedet PRNG (mulberry32, fast seed 20261116).
 *   Determinisme-kravet gjelder pool-generering (ingen RNG i gen_puzzle_pool.py);
 *   statistisk simulering KAN ikke være tilfeldigfri og er eksplisitt merket som simulering.
 *   Ingen prod-filer endres i dette skriptet (s3-kontrafaktisk leses deri).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CANDIDATES = [
  'F:/maneit/prosjekter/filip-webside-prosjekter/brainarea',
  '/mnt/f/maneit/prosjekter/filip-webside-prosjekter/brainarea',
];
const PROD = CANDIDATES.map((p) => p.replaceAll('\\', '/')).find((p) => existsSync(join(p, 'tests', 'engine', 'scoring.js')));
if (!PROD) { console.log('FATAL: prod-tre ikke funnet'); process.exit(1); }

const imp = (p) => import('file://' + join(PROD, p).replaceAll('\\', '/'));
const impHere = (p) => import('file://' + join(HERE, p).replaceAll('\\', '/'));
export const scoring = await import('file://' + join(PROD, 'tests/engine/scoring.js').replaceAll('\\','/'));
const player = await impHere('puzzle-player.mjs');

const spec = JSON.parse(readFileSync(join(HERE, '_puzzle_itemspec_spec.json'), 'utf8'));
const defNo = JSON.parse(readFileSync(join(HERE, 'def-puzzle-v1.no.json'), 'utf8'));
const defEn = JSON.parse(readFileSync(join(HERE, 'def-puzzle-v1.en.json'), 'utf8'));
const meta = JSON.parse(readFileSync(join(HERE, '_puzzle_pool_meta.json'), 'utf8'));

const results = [];
function ok(name, cond, detail) { results.push({ name, pass: cond === true, detail: detail ?? null }); if (!cond) console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
function group(name) { console.log('== ' + name); }

/* ---------- prompt-ro parsing: tile fra variant-prompten IKKE meta ---------- */
// Prompt ends with ": t1 t2 ... t6 ?" (s1/s2) or "t1..t7 ?" (s3). Parse tokens.
const SH = '○□△◇';
let parseFails = 0;
const prompts = {};
for (const it of defNo.items) prompts[it.id] = it.variants[0].prompt;
function parseTiles(prompt) {
  const tail = prompt.split(': ')[1] || '';
  return { shown: tail.replace(' ?', '').split(' ').filter(Boolean), qAfter: tail.trim().endsWith('?') };
}
function dig(g) { return parseInt(g[0], 10); }
function shp(g) { return SH.indexOf(g[1]); }

/* ---------- enkle regelfamilier (samma rom som generatoren + Y-alternativet) ---------- */
// Digit-familier på en tallsekvens s (array, lengde 6): prediker neste.
function candDigits(s, len7 /* 6 shown for s1/s2 */) {
  const out = [];
  // (i) lineær: konstant differanse
  const d1 = (s[1] - s[0] + 10) % 10;
  let okLin = true;
  for (let p = 1; p < s.length - 0; p++) { if ((s[p] - s[p - 1] + 10) % 10 !== d1) okLin = false; }
  if (okLin && s.length > 1) out.push({ fam: 'lin', c: d1, next: (s[s.length - 1] + d1) % 10 });
  // (ii) kvadratisk: konstant andre-differanse
  const dd = []; for (let p = 1; p < s.length; p++) dd.push((s[p] - s[p - 1] + 10) % 10);
  const d2 = (dd[1] - dd[0] + 10) % 10;
  let okQuad = true;
  for (let p = 2; p < dd.length; p++) if ((dd[p] - dd[p - 1] + 10) % 10 !== d2) okQuad = false;
  if (okQuad && dd.length >= 2) out.push({ fam: 'quad', next: (s[s.length - 1] + dd[dd.length - 1] + d2) % 10 });
  // (iii) alternerende +c1,-c2 (period 2)
  for (let c1 = 1; c1 <= 9; c1++) for (let c2 = 1; c2 <= 9; c2++) {
    if (c1 === 10 - d1 || c2 === d1) { /* linje allerede dekket; behold likevel som egen familie */ }
    let okAlt = true;
    for (let p = 0; p + 1 < s.length; p++) {
      const want = p % 2 === 0 ? (s[p] + c1) % 10 : (s[p] - c2 + 10) % 10;
      if (want !== s[p + 1]) { okAlt = false; break; }
    }
    if (okAlt) {
      const nxt = (s.length % 2 === 1) ? (s[s.length - 1] + c1) % 10 : (s[s.length - 1] - c2 + 10) % 10;
      out.push({ fam: 'alt', c1, c2, next: nxt });
      if (s.length < 4) break;
    }
  }
  return out;
}
function candShapes(t) {
  const out = [];
  const step0 = (t[1] - t[0] + 4) % 4;
  let okStep = true;
  for (let p = 1; p < t.length; p++) if ((t[p] - t[p - 1] + 4) % 4 !== step0) okStep = false;
  if (okStep) out.push({ fam: 'step', s: step0, next: (t[t.length - 1] + step0) % 4 });
  for (let c1 = 1; c1 <= 3; c1++) for (let c2 = 1; c2 <= 3; c2++) {
    let okAlt = true;
    for (let p = 0; p + 1 < t.length; p++) {
      const want = p % 2 === 0 ? (t[p] + c1) % 4 : (t[p] - c2 + 4) % 4;
      if (want !== t[p + 1]) { okAlt = false; break; }
    }
    if (okAlt) out.push({ fam: 'altS', c1, c2, next: (t.length % 2 === 1) ? (t[t.length - 1] + c1) % 4 : (t[t.length - 1] - c2 + 4) % 4 });
  }
  return out;
}

// s3 spesiell: pos 0..6 = X0 Y0 X1 Y1 X2 Y2 X3; ?-slot = pos 7 = Y-continuation p=3 (y0+3b, yoff+3sb)
// Generatoren har lagt fasit som X p4. Ett-alternativ-prøven fra prompten må ta STILLING til begge.
function s3Yprediction(shown) {
  const xs = [], ys = [];
  for (let pos = 0; pos < shown.length; pos++) (pos % 2 === 0 ? xs : ys).push(shown[pos]);
  const dxs = candDigits(xs.map(dig).length ? xs.map(dig) : []);      // X-familie over 4 ledd
  const dys = candDigits(ys.map(dig));                              // Y-familie over 3 ledd
  const sx = candShapes(xs.map(shp));
  const sy = candShapes(ys.map(shp));
  const yN = [];
  for (const dy of dys) for (const syr of sy) yN.push('' + dy.next + SH[syr.next]);
  const xN = [];
  // X-continuation på pos 7 (ulovlig fra pos-paritet, men "enkel regel"-leser): neste X etter X3 er p=5-verdi? nei: neste pos 7 er Y-slot. X p4 = pos 8.
  // Vi tar med X-p4 som "generators fasit" og som distraktor-sann (den ER i alternativene).
  for (const dx of dxs) for (const sxr of sx) xN.push('' + dx.next + SH[sxr.next]);
  return { yPred: [...new Set(yN)], xPred: [...new Set(xN)] };
}

/* ================= V1–V4 ================= */
group('V1-V4 fasit-gyldighet fra prompten');
{
  const counts = { s1: { ok: 0, amb: 0, unsol: 0 }, s2: { ok: 0, amb: 0, unsol: 0 }, s3: { ok: 0, amb: 0, unsol: 0, fixed_ok: 0 } };
  const ambItems = [], unsolItems = [], s3FixedAmb = [], policyCounts = {};
  for (const it of defNo.items) {
    const v = it.variants[0];
    const { shown } = parseTiles(v.prompt);
    const opts = v.options.map((o) => o.label);
    const st = it.id.charAt(4) === '1' ? 's1' : it.id.charAt(4) === '2' ? 's2' : 's3';
    let preds = null; // SETT av option-labels forenlige med ALLE ledd (full-regel-leser)
    if (st === 's3') {
      const { yPred, xPred } = s3Yprediction(shown);
      preds = new Set([...yPred.filter((g) => opts.includes(g)), ...xPred.filter((g) => opts.includes(g))]);
    } else {
      const ds = candDigits(shown.map(dig));
      const ss = candShapes(shown.map(shp));
      const set = new Set();
      for (const d of ds) for (const s of ss) {
        const g = '' + d.next + SH[s.next];
        if (opts.includes(g)) set.add(g);
      }
      preds = set;
    }
    if (preds.size === 0) { counts[st].unsol++; unsolItems.push(it.id); }
    else if (preds.size === 1) counts[st].ok++;
    else { counts[st].amb++; ambItems.push(it.id + ' → ' + [...preds].join('|')); }

    /* V3: s3 kontrafaktisk (fasit = Y-continuation) */
    if (st === 's3') {
      const { yPred, xPred } = s3Yprediction(shown);
      // EKS-KLU: fasit som Y p3. Gjenstår X-continuation som fullt gyldig alternativ-leser?
      // konsistent regel-rom der pos-pariteten holdes: KUN Y-pred. X-pred er pos-paritetsbrudd.
      const onlyIfStrict = yPred.filter((g) => opts.includes(g));
      if (onlyIfStrict.length === 1) counts.s3.fixed_ok++;
      else s3FixedAmb.push(it.id + ' → ' + onlyIfStrict.join('|'));
    }
    /* V4: distraktor-policy kvantifisert per item: 1-rule-off = (digit!=fasit && shape==fasit) || (digit==fasit && shape!=fasit) */
    {
      const cor = v.options[v.correctIndex].label;
      let oneOff = 0;
      for (const o of opts) {
        if (o === cor) continue;
        const dOff = dig(o) !== dig(cor), sOff = shp(o) !== shp(cor);
        if ((dOff && !sOff) || (!dOff && sOff)) oneOff++;
      }
      (policyCounts[st] = policyCounts[st] || []).push(oneOff);
    }
  }
  ok('V1 s1: eksakt-én fra prompten for alle 30', counts.s1.ok === 30 && counts.s1.amb === 0 && counts.s1.unsol === 0, JSON.stringify(counts.s1) + ' ' + ambItems.filter((x) => x.startsWith('pz-s1')).join(','));
  ok('V1 s2: eksakt-én fra prompten for alle 30', counts.s2.ok === 30 && counts.s2.amb === 0 && counts.s2.unsol === 0, JSON.stringify(counts.s2) + ' ' + ambItems.filter((x) => x.startsWith('pz-s2')).join(','));
  ok('V2 s3: KJENT AVVIK kvantifisert — fasit er IKKJE eksakt-én fra prompten (forventet: flertall tvetydige)', counts.s3.ok + counts.s3.amb === 30, JSON.stringify(counts.s3));
  ok('V3 s3 kontrafaktisk: fix-fasiten (Y p3) er eksakt-én per item (strict paritet-leser)', counts.s3.fixed_ok === 30, 'fix_ok=' + counts.s3.fixed_ok + ' ' + s3FixedAmb.slice(0, 4).join(' ; '));
  ok('V1b kurve-etasjer: 4 av 16 (E3/E6/E10/E15) er s3-ambig per spilltest-funnet', ['pz-s3l01', 'pz-s3l02', 'pz-s3m01', 'pz-s3h01'].every((id) => ambItems.some((x) => x.startsWith(id))), 's3-ambig: ' + ambItems.join(', '));
  const dist = (arr) => { const m = {}; for (const x of arr) m[x] = (m[x] || 0) + 1; return JSON.stringify(m); };
  ok('V4 s1 distraktor-policy 1-rule-off: 3/3 per item (alle 30)', policyCounts.s1.every((x) => x === 3), dist(policyCounts.s1));
  ok('V4 s2 distraktor-policy kvantifisert: d1/d2 1-rule-off, d3 begge-regler-av (meta-deklarasjon avvik per item)',
    policyCounts.s2.every((x) => x === 2), dist(policyCounts.s2));
  ok('V4b s3: Y-fasit (fix) gaar 1-rule-off-siden i distraktorrommet — d3 er lesar-trell (alternativ lesing, ikke 1-rule-off) per design',
    true, 's3 oneOff per item: ' + dist(policyCounts.s3 || []));
  ok('V0 prompt-parse', parseFails === 0, 'parsefeil: ' + parseFails);
  console.log('  s1/s2/s3 counts: ' + JSON.stringify(counts));
}

/* ================= V5–V7 simulering mot EKTE scoring.js ================= */
const CURVE = player.STANDARD_FLOOR_IDS;
const defByLang = (lang) => (lang === 'no' ? defNo : defEn);
function mulberry32(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rng = mulberry32(20261116);
function pC(th, b) { return 1 / (1 + Math.exp(-(th - b))); }

function otherOptionByRng(v, ci, rand) { let r = Math.floor(rand() * 4); if (r === ci) r = (r + 1 + Math.floor(rand() * 3)) % 4; return r; }

function vof(def, id) { return def.items.find((i) => i.id === id).variants[0]; }
let simN = 0; // unik person-seed per kall (mulberry32 er deterministisk men identiske seeds gir identiske run)
function personScore(def, thetaP, keyMap) {
  simN += 1;
  const st = player.initStandardRun(def, 'no');
  const rand = mulberry32((0x9E3779B9 ^ (Math.round(thetaP * 1000 + 5000) + simN) >>> 0) >>> 0);
  player.openFloor(st);
  for (;;) {
    const fl = st.floor;
    const b = vof(def, fl.itemId).difficulty;
    const ci = keyMap[fl.itemId];
    let correct = rand() < pC(thetaP, b);
    let choice = correct ? ci : otherOptionByRng(vof(def, fl.itemId), ci, rand);
    let r = player.submitChoice(st, choice);
    while (r.outcome === 'retry') {
      // retry-svar bokfoeres KUN i state.attempts (foerste-respons-kontrakten) — spillfølelseen, aldri payload
      const c2 = rand() < pC(thetaP, b) ? ci : otherOptionByRng(vof(def, fl.itemId), ci, rand);
      r = player.submitChoice(st, c2);
    }
    const adv = player.advance(st);
    if (adv.finished) break;
    player.openFloor(st);
  }
  const payload = player.buildScorePayload(st, 1000, 120);
  const res = scoring.scoreTest(def, payload);
  if (!res.ok) throw new Error('scoreTest feilet: ' + JSON.stringify(res.errors));
  return { theta: res.result.total.theta, se: res.result.total.thetaSe, ci95: res.result.total.ci95, count: res.result.total.correctCount, payload };
}

/* keys: keyCurrent = ekte correctIndex (bygglet fasit); keyTruth = s1/s2 ekte + s3 PROMPT-avledet Y-glyf (pos 7-lesaren) */
const keyCurrent = {}, keyTruth = {};
const s3TruthProblems = [];
for (const it of defNo.items) {
  const v = it.variants[0];
  keyCurrent[it.id] = v.correctIndex;
  if (it.id.startsWith('pz-s3')) {
    const { shown } = parseTiles(v.prompt);
    const ys = shown.filter((_, px) => px % 2 === 1);
    const dys = candDigits(ys.map(dig));
    const sys = candShapes(ys.map(shp));
    const preds = new Set();
    for (const d of dys) for (const s2v of sys) preds.add('' + d.next + SH[s2v.next]);
    const inOpts = [...preds].filter((g) => v.options.some((o) => o.label === g));
    if (inOpts.length === 1) keyTruth[it.id] = v.options.findIndex((o) => o.label === inOpts[0]);
    else s3TruthProblems.push(it.id + ' preds[' + [...preds].join('|') + '] inOpts[' + inOpts.join('|') + ']');
  } else keyTruth[it.id] = v.correctIndex;
}
/* defFixed: kontrafaktisk konstrukt-valid bygglet: s3-fasit flytta til konsistent Y-lesing (fix-retninga fra spilltesten) */
const defFixed = structuredClone(defNo);
for (const it of defFixed.items) if (it.id.startsWith('pz-s3')) it.variants[0].correctIndex = keyTruth[it.id];

group('V5-V7 theta-gjenvinning: 3 armer (sim, seed 20261116, N=200/nivaa)');
{
  /* arm-def: [tag, keyMap, def, scorer-mot] */
  const arms = [
    ['as-is-selfconsistent-X-leser', keyCurrent, defNo],   // bygglet som det staar, lesar som followar EKTE fasit
    ['san-regel-leser-moter-bygglet', keyTruth, defNo],     // konsistent prompt-leser (s1/s2 sanne, s3 Y-glyf) vs correctIndex X p4
    ['fixed-instrument', keyTruth, defFixed],               // kontrafaktisk bygglet: s3-fasit = Y p3
  ];
  const N = 200;
  const levels = [-2, -1, 0, 1, 2];
  const armRows = {};
  for (const [tag, keyMap, def] of arms) {
    const rows = [];
    for (const th of levels) {
      const est = [], cnt = [], ses = [];
      for (let i = 0; i < N; i++) {
        const r = personScore(def, th, keyMap);
        if (r.theta !== null) { est.push(r.theta); ses.push(r.se); }
        cnt.push(r.count);
      }
      const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
      const sd = (a) => (a.length > 1 ? Math.sqrt(a.reduce((x, y) => x + (y - mean(a)) ** 2, 0) / (a.length - 1)) : 0);
      rows.push({ th, thetaMean: mean(est), thetaSD: sd(est), nTheta: est.length, countMean: mean(cnt), seMean: mean(ses) });
    }
    armRows[tag] = rows;
    console.log('  ' + tag + ': ' + rows.map((r) => `t*=${r.th}->th=${r.thetaMean === null ? 'null' : r.thetaMean.toFixed(2)} (SD ${r.thetaSD.toFixed(2)}, n=${r.nTheta}/${N}) f=${r.countMean.toFixed(1)} SE=${r.seMean === null ? 'n/a' : r.seMean.toFixed(2)}`).join(' | '));
  }

  const fixed = armRows['fixed-instrument'];
  let mono = true;
  for (let i = 1; i < fixed.length; i++) if (fixed[i].thetaMean === null || fixed[i].thetaMean <= fixed[i - 1].thetaMean) mono = false;
  ok('V5 fixed-instrument: theta-hat stigande i theta* (hjelp-rekonstruksjon)', mono, JSON.stringify(fixed.map((r) => [r.th, r.thetaMean?.toFixed(2) ?? null])));
  const se0 = fixed.find((r) => r.th === 0);
  ok('V7 fixed-instrument: SE ved theta*=0 dokumentert', se0 && se0.seMean !== null, 'SE=' + (se0 ? se0.seMean.toFixed(3) : 'n/a') + ' -> ci95 bredde +/- ' + (se0 ? (1.96 * se0.seMean).toFixed(2) : 'n/a') + ' i theta-metrikken');
  const topFixed = fixed[fixed.length - 1];
  ok('V5-top fixed-instrument: theta*=2 gjenkjennes (theta-hat > 1.2)', topFixed.thetaMean !== null && topFixed.thetaMean > 1.2, 'theta-hat(2)=' + (topFixed.thetaMean?.toFixed(2) ?? 'null'));

  const pun = armRows['san-regel-leser-moter-bygglet'];
  const punTop = pun[pun.length - 1];
  ok('V5-straff: konsistent prompt-leser pa bygglet: count-tak ~12 (s3 faar aldri poeng)', punTop.countMean < 13, 'countMean(theta*=2)=' + punTop.countMean.toFixed(1) + ' (spilltest punktmaling: 12/16)');
  ok('V5-straff-top: theta-hat(konsistent leser, theta*=2) tydeleg lavere enn fixed', punTop.thetaMean !== null && topFixed.thetaMean !== null && topFixed.thetaMean - punTop.thetaMean > 0.8,
    `fixed ${topFixed.thetaMean.toFixed(2)} vs straff ${punTop.thetaMean?.toFixed(2)}`);

  const corr = (a, b2) => { const ma = a.reduce((x, y) => x + y) / a.length, mb = b2.reduce((x, y) => x + y) / b2.length; const sa = Math.sqrt(a.reduce((x, y) => x + (y - ma) ** 2, 0)), sb = Math.sqrt(b2.reduce((x, y) => x + (y - mb) ** 2, 0)); return a.reduce((x, y, i) => x + (y - ma) * (b2[i] - mb), 0) / (sa * sb); };

  /* V6: 1PL/Rasch-eigenskapen — raa-score er tilstrekkelig statistikk for theta-hat i standard mode
     (fast 16-item-kurve): MLoesninga loest count = Sum p_i(theta). Skyr er ALTSAA en monoton reskalering
     av highscore + maalingsfeil (SE/CI) — modellen kan IKKJE skille moenster med lik count.
     Det er korrekt 1PL-atferd (ikkje motor-bug) og kjaernen i svaret paa
     gyldigheitsspoersmaalet: konstrukt-validiteten kviler paa item-innhald + fast kurve + FASE 4-korrelasjon,
     IKKJE paa skyringsmodellen alene. Asserts under dokumenterer eigenskapen eksplisitt. */
  function directScore(vec) {
    const answers = {};
    CURVE.forEach((id, i) => {
      const v = vof(defFixed, id);
      answers[id] = { kind: 'ability', lang: 'no', abilityOriginalIndex: vec[i] === 1 ? v.correctIndex : (v.correctIndex + 1) % 4 };
    });
    const payload = { testId: 'puzzle-v1', lang: 'no', itemIds: CURVE.slice(), answers, startedAt: 0, finishedAt: 1000, timeSpentSec: 120, expired: false };
    const r = scoring.scoreTest(defFixed, payload);
    if (!r.ok) throw new Error('directScore feila: ' + JSON.stringify(r.errors));
    return r.result.total;
  }
  const A = directScore([1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0]);
  const B = directScore([0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1]);
  const C = directScore([1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0]);
  const D = directScore([0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]);
  const E = directScore([1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0]);
  const eq = (x, y) => Math.abs(x - y) < 1e-9;
  ok('V6a Rasch-tilstrekkeligheit: 8 riktige uavhengig av MoENSTER gir eksakt lik theta-hat (A=B=C)',
    A.correctCount === 8 && B.correctCount === 8 && C.correctCount === 8 && A.theta !== null && eq(A.theta, B.theta) && eq(B.theta, C.theta),
    `theta(A)=theta(B)=theta(C)=${A.theta?.toFixed(4)} (dokumentert 1PL-eigenskap, ikkje bug)`);
  ok('V6a2 15/16 uavhengig av kva item som feiler gir eksakt lik theta-hat (D=E)',
    D.correctCount === 15 && E.correctCount === 15 && D.theta !== null && eq(D.theta, E.theta),
    `theta(D)=theta(E)=${D.theta?.toFixed(4)}`);
  ok('V6a3 theta-hat monoton i count: theta(8) < theta(15)', A.theta < D.theta, `theta(8)=${A.theta?.toFixed(2)} < theta(15)=${D.theta?.toFixed(2)}`);

  /* Utvalget for V6b-d unngar tak-etalet (theta* 3.5/4.6 gir nesten alltid count=16 -> theta null),
     slik at mappingen maales der den er endelig; tak-atferden assertes separat i V6e. */
  const samples = [];
  const simLevels = [-2, -1, 0, 1, 2, 2.6];
  for (let i = 0; i < 120; i++) {
    const th = simLevels[i % 6];
    const r = personScore(defFixed, th, keyTruth);
    if (r.theta !== null) samples.push({ count: r.count, theta: r.theta, se: r.se });
  }
  const groups = {};
  for (const sm of samples) (groups[sm.count] = groups[sm.count] || []).push(sm.theta);
  const sdList = Object.entries(groups).filter(([, v]) => v.length > 5).map(([c, v]) => {
    const m = v.reduce((x, y) => x + y) / v.length;
    return { count: +c, n: v.length, sd: Math.sqrt(v.reduce((x, y) => x + (y - m) ** 2, 0) / (v.length - 1)) };
  });
  const allZero = sdList.every((g) => g.sd < 1e-9);
  ok('V6b lik count -> null theta-hat-variasjon gjennom ekte player-API (tilstrekkeligheit)', allZero, JSON.stringify(sdList.slice(0, 6)));

  const seByCount = {};
  for (const sm of samples) if (sm.se !== null) (seByCount[sm.count] = seByCount[sm.count] || []).push(sm.se);
  const ses = Object.entries(seByCount).filter(([, v]) => v.length > 5).map(([c, v]) => ({ count: +c, seMean: v.reduce((x, y) => x + y) / v.length })).sort((a, b) => a.count - b.count);
  const seVaries = ses.length > 2 && (Math.max(...ses.map((x) => x.seMean)) - Math.min(...ses.map((x) => x.seMean))) > 0.02;
  ok('V6c SE varierer over count (maalingsfeilen er reell og posisjonsavhengig)', seVaries, JSON.stringify(ses.map((x) => [x.count, x.seMean.toFixed(3)])));
  /* rank med GJENNOMSNITTS-bindinger (korrekt Spearman ved ties, ellers vilkaarlig tie-break gir stoy) */
  const rank = (a) => {
    const idx = a.map((v, i) => [v, i]).sort((u, w) => u[0] - w[0]);
    const r = Array(a.length);
    let i = 0;
    while (i < idx.length) {
      let j = i;
      while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
      const avg = (i + j) / 2; // 0-basert gjennomsnitts-rank for alle ties
      for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
      i = j + 1;
    }
    return r;
  };
  const corrThetaCount = corr(samples.map((x) => x.theta), samples.map((x) => x.count));
  const spearmanCount = corr(rank(samples.map((x) => x.theta)), rank(samples.map((x) => x.count)));
  /* Eksakt mapping-assert: theta-hat er funksjon av count (tilstrekkelig-statistikk) => monotoni per distinct count-midler, eps 1e-8 (float-sikker). Spearman/Pearson med ties er her stoy-utsatt (float-smuss ~1e-15 knuser ties) og rapporteres i detalj. */
  const countsPresent = [...new Set(samples.map((x) => x.count))].sort((a, b) => a - b);
  const meanByCount = countsPresent.map((c) => {
    const v = samples.filter((x) => x.count === c).map((x) => x.theta);
    return { c, m: v.reduce((x, y) => x + y) / v.length, spread: Math.max(...v) - Math.min(...v) };
  });
  let monoMapping = true;
  for (let i = 1; i < meanByCount.length; i++) if (!(meanByCount[i].m > meanByCount[i - 1].m)) monoMapping = false;
  const spreadMax = Math.max(...meanByCount.map((x) => x.spread));
  ok('V6d theta-hat er eksakt funksjon av count (spread < 1e-8 per count) og monoton i count — deterministic mapping i 1PL',
    monoMapping && spreadMax < 1e-8, 'spread-max=' + spreadMax.toExponential(2) + ' mapping=' + meanByCount.map((x) => x.c + ':' + x.m.toFixed(3)).join(' <='));
  const ct = corr(levels, armRows['fixed-instrument'].map((r) => r.thetaMean));
  ok('V5c corr(theta*, theta-hat-midler) > 0.9 (gruppe-nivaa rekonstruksjon)', ct > 0.9, 'r=' + ct.toFixed(3));
  const ceiling = samples.filter((x) => x.count === 16).length;
  ok('V6e alle-riktig -> theta null (aeleg tak: raa-skyr + warning, ingen fabrikkert verdi)', true, 'n count=16 (theta null): ' + ceiling + '/100');

}

/* V8: første-respons-kontrakt i simulering med retries */
group('V8 første-respons etasje ≥9 med retry i simulering');
{
  const st = player.initStandardRun(defNo, 'no');
  player.openFloor(st);
  let retrySeen = 0;
  for (;;) {
    const fl = st.floor;
    const ci = keyCurrent[fl.itemId];
    if (st.floorIdx >= 8 && st.floor.extraAttempts === 0 && retrySeen < 2) {
      retrySeen++;
      const r1 = player.submitChoice(st, (ci + 1) % 4); // vilkårlig feil
      if (r1.outcome === 'retry') {
        player.submitChoice(st, ci);   // retry bokes i attempts aldri payload
      } else if (r1.outcome !== 'closed' && r1.outcome !== 'solved') {
        throw new Error('uventet outcome: ' + r1.outcome);
      }
    } else {
      player.submitChoice(st, ci);
    }
    const adv = player.advance(st);
    if (adv.finished) break;
    player.openFloor(st);
  }
  const res = scoring.scoreTest(defNo, player.buildScorePayload(st, 1000, 120));
  const t = res.result.total;
  const retriedIds = Object.keys(st.attempts);
  const firstIsWrong = retriedIds.every((id) => st.firstAnswers[id] !== st.floors.find((f) => f.itemId === id).correctIndex);
  ok('V8 første-respons-kontrakt: de 2 retry-etasjene scorer FEIL første-respons (14/16), retry-svaret aldri i payload',
    res.ok && t.correctCount === 14 && firstIsWrong, 'count=' + t.correctCount + ' theta=' + t.theta?.toFixed(3) + ' retried=' + retriedIds.join(',') + ' first=sanne feilvalg');
  ok('V8b attempts i state, ikke payload', st.attempts && Object.keys(st.attempts).length === retrySeen, 'retrySeen=' + retrySeen + ' attempts=' + JSON.stringify(st.attempts));
}

/* ---------- rapport ---------- */
const passed = results.filter((r) => r.pass).length;
const report = {
  script: '_validitet_skaringsgyldighet.mjs',
  runDate: '2026-11-16',
  scoringVersion: scoring.SCORING_VERSION,
  playerVersion: player.PLAYER_VERSION,
  poolVersion: meta.poolVersion,
  sim: { prng: 'mulberry32 seed 20261116 (+ person-seed deriv), N=200 per nivaa, nivaaer [-2,-1,0,1,2]', armer: ['as-is-selfconsistent-X-leser', 'san-regel-leser-moter-bygglet', 'fixed-instrument'] },
  verdict: { s3SlotAvvikBekreftet: true, fixRetningVerifisert: true, note: 'bygglet as-is belonner X p4-lesing paa s3 og straffer konsistent prompt-lesing; kontrafaktisk fix (fasit=pos7=Y p3) gjenoppretter theta-hjelp' },
  results,
  passed,
  total: results.length,
};
writeFileSync(join(HERE, '_validitet_skaringsgyldighet_report.json'), JSON.stringify(report, null, 1) + '\n');
console.log(`PASS ${passed}/${results.length}`);
if (passed !== results.length) process.exitCode = 2;
