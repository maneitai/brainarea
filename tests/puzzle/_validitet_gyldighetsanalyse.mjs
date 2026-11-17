/**
 * Brainarea — Puzzle-gyldighetsanalyse v1.0.0 [VERIFISER FASE 4-prep] (todo #3767)
 *
 * Designkontrakt: tests/puzzle/_puzzle_design_v1_1.md § 3 — korrelasjon puzzle-theta × evne-theta
 * på parvis responsdata fra normering-endpointen (testId 'puzzle-v1'), utvalgsregler:
 * samme enhet, tidsvindu ≤ 7 dager begge, språk-par match, definert min n og eksklusjonsregler.
 * B3-kontrakten: #3767 forblir deliberasjonssteget; dette er data-produktet.
 *
 * --------------------------------------------------------------------------------------------
 * HVA SOM ER LEVERT HER:
 *   1. Forhåndsregistrert utvalgs- og analysekontrakt: _validitet_gyldighetsanalyse_protokoll.json
 *      (inklusjonsregler R1–R5, eksklusjonsregler X1–X5 i ordre, min n, terskler — låst FØR
 *      data finnes; endringer etter første ekte kjøring krever ny protokollversjon + ny 3-VEIS).
 *   2. KJØRBAR PIPELINE: node tests/puzzle/_validitet_gyldighetsanalyse.mjs [--data kv_eksport.json]
 *      - Uten --data: syntetisk arm — fixture-fabrikasjon av par-rader i eksakt endpoint-radform
 *        og end-to-end selftest av røret (θ-rekonstruksjon fra rad mot EKTE defs + EKTE
 *        scoring.js + EKTE puzzle-player; R/X-utvalg; r/ρ/CI; klassifikasjon).
 *      - Med --data: kjører VERBATIM samme rør mot EKTE KV-eksport (samme kode, samme kontrakter).
 *   3. ÆRLIG SVAR PÅ STEG-KONTRAKTEN: analysen KAN IKKE BESVARES MED TALL I DAG —
 *      G1 (NORMERING_KV finnes ikke: github.io lagrer ingenting, stored:false),
 *      G2 (lagret rad må bære itemIds — evne-payload har dem ikke i dag; θ da ikke rekonstruerbar),
 *      G3 (cohortKey / paringsnøkkel finnes ikke i POST-grammatikken — bevist i selftest H2),
 *      G4 (evne-siden har ingen normerings-POST-wiring, grep-verified 2026-11-17).
 *      Alle fire lukkes i FASE 4-endepunkt-livssyklusen; protokollen er forhåndsregistrert slik at
 *      analysen kan kjøres VERBATIM samme dag dataene finnes.
 *
 * Personvern: pipeline-opererer kun på sesjons-avledede felter (testId, language, at, answers,
 * itemIds, durationSec, demographics, cohortKey). Ingen identifikator leses eller produseres
 * (beslutning 9 urokkelig). cohortKey er klient-generert par-nøkkel — ikke enhetsidentitet.
 *
 * Ren ESM, null dependencies. Node 22 (require(esm) ikke nødvendig — import over file-URL).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(__dirname, '..', '..');

/** Dual-path prod/speil (søster-harness-konvensjonen). */
function resolveCandidate(rel) {
  const c = [path.join(PROJ, rel), path.join(PROJ, '_delt', 'brainarea', rel)];
  for (const p of c) if (existsSync(p)) return p;
  return c[0];
}
async function importRel(rel) {
  return import(pathToFileURL(resolveCandidate(rel)).href);
}

const scoring = await importRel('tests/engine/scoring.js');
const player = await importRel('tests/puzzle/puzzle-player.mjs');
const normering = await importRel('functions/normering.js');
/* protokollen er DATA: terskler og vinduer leses fra fila, aldri hardkodet her */
const proto = JSON.parse(readFileSync(resolveCandidate('tests/puzzle/_validitet_gyldighetsanalyse_protokoll.json'), 'utf8'));

/* ---------- konstanter ---------- */
const PUZZLE = 'puzzle-v1';
const EVNE_TRACKS = ['evne-t1-matrise', 'evne-t2-numerisk', 'evne-t3-verbal', 'evne-t4-romlig', 'evne-t5-sekvens'];
/** felter pipeline lov å lese av en rad (personvern-whitelist, assertes av J-blokken) */
const ROW_FIELDS_OK = ['testId', 'language', 'at', 'answers', 'itemIds', 'durationSec', 'demographics', 'cohortKey'];
const WINDOW_SEC = 7 * 24 * 3600; // R2-kontrakten: ≤ 7 dager
const T0 = '2026-11-17T12:00:00.000Z'; // syntetisk anker-tid (selftest-blokkene)
const DEFS = {};                  // testId -> def (puzzle + evne)

/** def-sti per testId (puzzle ↔ puzzle-katalogen; evne ↔ evne_pool). */
function defPath(testId) {
  const isPuzzle = testId === PUZZLE;
  const name = isPuzzle ? 'def-puzzle-v1' : 'def-' + testId;
  return `tests/${isPuzzle ? 'puzzle' : 'schema/evne_pool'}/${name}.no.json`;
}
function loadDef(testId) {
  if (!DEFS[testId]) DEFS[testId] = JSON.parse(readFileSync(resolveCandidate(defPath(testId)), 'utf8'));
  return DEFS[testId];
}

/* ---------- assert-rammeverk som søster-harnessene ---------- */
const fails = [];
let n_ok = 0;
const passed = new Set();
function ok(id, cond, detail) {
  if (cond) { n_ok++; passed.add(id); }
  else fails.push({ id, detail: detail === undefined ? '' : String(detail) });
}

/* ---------- stat-hjelpere ---------- */
function mean(a) { return a.reduce((s, x) => s + x, 0) / a.length; }
function pearson(x, y) {
  const mx = mean(x), my = mean(y);
  let sxy = 0, sx = 0, sy = 0;
  for (let i = 0; i < x.length; i++) { const dx = x[i] - mx, dy = y[i] - my; sxy += dx * dy; sx += dx * dx; sy += dy * dy; }
  return sxy / Math.sqrt(sx * sy);
}
function ranks(a) {
  const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]);
  const r = new Array(a.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
    i = j + 1;
  }
  return r;
}
function spearman(a, b) { return pearson(ranks(a), ranks(b)); }
function fisherCi(r, n) {
  const z = Math.atanh(r), se = 1 / Math.sqrt(n - 3);
  return [Math.tanh(z - 1.96 * se), Math.tanh(z + 1.96 * se)];
}

/* ---------- θ-rekonstruksjon fra rad mot EKTE defs + EKTE motor ---------- */
/**
 * En KV-rad i FASE 4 (utvidet endpoint): { testId, language, answers:[indekser i itemIds-orden],
 * itemIds:[...], durationSec, demographics?, at, cohortKey }. answers[i] gjelder itemIds[i].
 * G2: itemIds er påkrevd FASE 4-felt (puzzle-siden er deterministisk der itemIds er avledbare,
 * evne-siden er det IKKE — derfor kaster røret på rader uten itemIds).
 */
function thetaFromRow(row) {
  const def = loadDef(row.testId);
  const itemIds = row.itemIds;
  if (!Array.isArray(itemIds) || itemIds.length !== row.answers.length) {
    return { error: 'itemIds/answers uenige: ' + row.testId + ' (' + (Array.isArray(itemIds) ? itemIds.length : 'mangler') + ' vs ' + (row.answers || []).length + ')' };
  }
  const lang = row.language;
  const itemById = new Map(def.items.map((it) => [it.id, it]));
  const thetaItems = [];
  let correct = 0, answered = 0;
  const answers = {};
  for (let i = 0; i < itemIds.length; i++) {
    const idx = row.answers[i];
    const item = itemById.get(itemIds[i]);
    if (!item) return { error: 'ukjent item i rad: ' + itemIds[i] + ' (' + row.testId + ')' };
    if (idx === null || idx === undefined) continue;
    const variant = item.variants.find((v) => v.lang === lang) || item.variants[0];
    const isCorrect = idx === variant.correctIndex;
    thetaItems.push({ difficulty: variant.difficulty, correct: isCorrect });
    answers[itemIds[i]] = { kind: 'ability', lang, abilityOriginalIndex: idx };
    if (isCorrect) correct++;
    answered++;
  }
  const th = scoring.estimateTheta1PL(thetaItems);
  /** EKTE motor-kryss: scoreTest over samme rad gir identiske total.theta/correctCount (full coverage). */
  let engineTheta = null, engineCount = null;
  if (answered > 0 && answered === itemIds.length) {
    const payload = { testId: row.testId, lang, itemIds, answers, startedAt: 1, finishedAt: 2, timeSpentSec: row.durationSec, expired: false };
    const sc = scoring.scoreTest(def, payload);
    if (sc.ok && sc.result && sc.result.total && sc.result.total.type === 'g-score') {
      engineTheta = sc.result.total.theta;
      engineCount = sc.result.total.correctCount;
    }
  }
  return { theta: th.theta, se: th.se, reason: th.reason || null, count: correct, answered, itemIds, engineTheta, engineCount };
}
function thetaKnown(t) { return t.theta !== null && t.theta !== undefined && Number.isFinite(t.theta); }

/* ---------- utvalgsregler (R = dannelse av par; X = eksklusjon i protokoll-orden) ---------- */
function atMs(row) { return Date.parse(row.at); }

/** R1–R5: null eller feil-tag. */
function pairable(rp, re) {
  if (!rp.cohortKey || rp.cohortKey !== re.cohortKey) return 'R1-cohortKey';
  if (rp.testId !== PUZZLE || !EVNE_TRACKS.includes(re.testId)) return 'R4-testId';
  const dt = Math.abs(atMs(rp) - atMs(re)) / 1000;
  if (!(dt <= WINDOW_SEC)) return 'R2-window';
  if (rp.language !== re.language) return 'R3-language';
  if (rp.answers.length !== 16 || rp.answers.some((a) => a === null || a === undefined)) return 'R5-puzzleCoverage';
  if (!Array.isArray(re.itemIds) || re.answers.length !== re.itemIds.length || re.answers.some((a) => a === null || a === undefined)) return 'R4-evneCoverage';
  return null;
}

/** QC-gate-gulv (dokumenterte forhåndsvalg per _qc_result.json-kontrakten). */
function QC_GATE() {
  return { [PUZZLE]: 24, 'evne-t1-matrise': 75, 'evne-t2-numerisk': 75, 'evne-t3-verbal': 75, 'evne-t4-romlig': 60, 'evne-t5-sekvens': 60 };
}

/** X1–X5 i protokollens ordre. null = beholdes. */
function exclusion(pth, eth, rp, re) {
  for (const tag of proto.exclusionRules.order) {
    if (tag === 'X1-attention') {
      continue; // per-item-timeline finnes ikke i radene ennå (endpoint-evolusjon); X5-gulvet trer
    } else if (tag === 'X2-degenerate') {
      if (!(thetaKnown(pth) && thetaKnown(eth))) return 'X2-degenerate';
    } else if (tag === 'X3-endless') {
      if (!(rp.testId === PUZZLE && EVNE_TRACKS.includes(re.testId))) return 'X3-endless';
    } else if (tag === 'X4-duplicates') {
      continue; // håndtert på cohortKey-nivå i dedupeRows (først-at-beholder)
    } else if (tag === 'X5-timefloor') {
      const gates = QC_GATE();
      if (rp.durationSec < gates[PUZZLE]) return 'X5-timefloor-puzzle';
      if (re.durationSec < gates[re.testId]) return 'X5-timefloor-evne';
    }
  }
  return null;
}

/** X4: samme cohortKey+testId → kun første (AT-orden) beholder; duplikatantall rapporteres. */
function dedupeRows(rows) {
  const seenKV = new Set();
  const kept = [];
  let dup = 0;
  for (const r of rows) {
    const k = r.cohortKey + '|' + r.testId;
    if (seenKV.has(k)) { dup++; continue; }
    seenKV.add(k); kept.push(r);
  }
  return { kept, dupCount: dup };
}

/* ---------- analysen ---------- */
function analyse(rows) {
  const { kept, dupCount } = dedupeRows(rows);
  const byC = new Map();
  for (const r of kept) {
    if (!byC.has(r.cohortKey)) byC.set(r.cohortKey, []);
    byC.get(r.cohortKey).push(r);
  }
  const out = { duplicatesDropped: dupCount, pairsFormed: 0, excluded: {}, included: [], thetaPuzzle: [], thetaEvne: [], countPuzzle: [], scatter: [] };
  const exIncr = (t) => { out.excluded[t] = (out.excluded[t] || 0) + 1; };

  for (const list of byC.values()) {
    const pz = list.filter((r) => r.testId === PUZZLE);
    const ev = list.filter((r) => EVNE_TRACKS.includes(r.testId));
    for (const rp of pz) {
      for (const re of ev) {
        const rfail = pairable(rp, re);
        if (rfail) { exIncr(rfail); continue; }
        const pth = thetaFromRow(rp), eth = thetaFromRow(re);
        if (pth.error) { exIncr('data-error-puzzle'); continue; }
        if (eth.error) { exIncr('data-error-evne'); continue; }
        out.pairsFormed++;
        if (pth.engineTheta !== null && pth.engineTheta !== undefined && pth.theta !== null && Math.abs(pth.engineTheta - pth.theta) > 1e-9) { exIncr('engine-mismatch-puzzle'); continue; }
        if (pth.engineCount !== null && pth.engineCount !== pth.count) { exIncr('engine-mismatch-count-puzzle'); continue; }
        if (eth.engineTheta !== null && eth.engineTheta !== undefined && eth.theta !== null && Math.abs(eth.engineTheta - eth.theta) > 1e-9) { exIncr('engine-mismatch-evne'); continue; }
        if (eth.engineCount !== null && eth.engineCount !== eth.count) { exIncr('engine-mismatch-count-evne'); continue; }
        const ex = exclusion(pth, eth, rp, re);
        if (ex) { exIncr(ex); continue; }
        out.included.push({ cohortKey: rp.cohortKey, language: rp.language, thetaPuzzle: pth.theta, thetaEvne: eth.theta, countPuzzle: pth.count, countEvne: eth.count, evneTrack: re.testId });
        out.thetaPuzzle.push(pth.theta); out.thetaEvne.push(eth.theta); out.countPuzzle.push(pth.count);
        out.scatter.push([pth.theta, eth.theta]);
      }
    }
  }

  const n = out.included.length;
  const res = { n, pearson: null, spearman: null, fisherZ: null, rCount: null };
  if (n >= 3) {
    res.pearson = pearson(out.thetaPuzzle, out.thetaEvne);
    res.spearman = spearman(out.thetaPuzzle, out.thetaEvne);
    const [lo, hi] = fisherCi(res.pearson, n);
    res.fisherZ = { r: res.pearson, ci95: [lo, hi] };
    res.rCount = pearson(out.countPuzzle, out.thetaEvne);
  }
  const minN = proto.statistics.interpretationThresholds.minN; // {full, exploratory, note}
  const th = proto.statistics.interpretationThresholds;
  if (n < minN.exploratory) res.classification = { verdict: 'CANNOT-ANSWER', note: 'n < ' + minN.exploratory + ' — ' + minN.note };
  else if (n < minN.full) res.classification = { verdict: 'EXPLORATORY', note: 'rapporteres, aldri påstand (n < ' + minN.full + ')' };
  else if (res.pearson >= 0.50 && res.fisherZ.ci95[0] >= 0.30) res.classification = { verdict: 'POSITIVE', note: th.positive };
  else if (res.pearson >= 0.30) res.classification = { verdict: 'WEAK', note: th.weak };
  else res.classification = { verdict: 'NONE', note: th.none };
  return { rows: out, results: res };
}

/* ================================================================================================ */
/* SYNTETISK RADFABRIKK — eksakt FASE 4-radform (endpoint-kontrakten + G2/G3-utvidelsene)            */
/* ================================================================================================ */

const defPuzzle = loadDef(PUZZLE);
const evneDefCache = {};
function evneDef(track) {
  if (!evneDefCache[track]) evneDefCache[track] = loadDef(track);
  return evneDefCache[track];
}

function mkPuzzleRow(cohortKey, at, lang, correctCount, durationSec) {
  const itemIds = player.STANDARD_FLOOR_IDS.slice();
  const answers = itemIds.map((id, i) => {
    const item = defPuzzle.items.find((it) => it.id === id);
    const v = item.variants.find((x) => x.lang === lang) || item.variants[0];
    return i < correctCount ? v.correctIndex : (v.correctIndex + 1) % v.options.length;
  });
  return { testId: PUZZLE, language: lang, at, itemIds, answers, durationSec, cohortKey };
}

/** nItems ≤ pool-lengde, deterministisk jevn sampling; korrektCount = første n riktige. */
function mkEvneRow(track, cohortKey, at, lang, correctCount, durationSec, nItems) {
  const pool = evneDef(track).items;
  const itemIds = [];
  for (let i = 0; i < nItems; i++) itemIds.push(pool[(i * Math.floor(pool.length / nItems)) % pool.length].id);
  const answers = itemIds.map((id, i) => {
    const item = pool.find((it) => it.id === id);
    const v = item.variants.find((x) => x.lang === lang) || item.variants[0];
    return i < correctCount ? v.correctIndex : (v.correctIndex + 1) % v.options.length;
  });
  return { testId: track, language: lang, at, itemIds, answers, durationSec, cohortKey };
}

/* ================================================================================================ */
/* SELFTESTS                                                                                        */
/* ================================================================================================ */

/* ---------- A: protokoll/leveranse-integritet ---------- */
{
  ok('A1-proto', proto && proto.version === '1.0.0' && proto.todo === '#3767', 'proto ' + (proto && proto.version));
  ok('A2-proto-rules', ['R1-same-unit', 'R2-timeWindow', 'R3-languagePair', 'R4-testCoverage', 'R5-completion'].every((k) => proto.inclusionRules[k]), 'R-nøkler ' + Object.keys(proto.inclusionRules).join(','));
  ok('A3-proto-x-order', proto.exclusionRules.order.length === 5 && proto.exclusionRules.order[0] === 'X1-attention' && proto.exclusionRules.order[4] === 'X5-timefloor', proto.exclusionRules.order.join('>'));
  ok('A4-proto-minn', proto.statistics.interpretationThresholds.minN.full === 50 && proto.statistics.interpretationThresholds.minN.exploratory === 30, 'minN ' + JSON.stringify(proto.statistics.interpretationThresholds.minN));
  ok('A5-proto-primary', proto.statistics.primary.startsWith('Pearson'), proto.statistics.primary);
  ok('A6-proto-gaps', ['G1-endpointNotDeployed', 'G2-itemIdsNotStored', 'G3-cohortKeyNotImplemented', 'G4-evneWiringMissing'].every((g) => proto.expectedDataGaps[g]), Object.keys(proto.expectedDataGaps).join(','));
  const win = proto.inclusionRules['R2-timeWindow'];
  ok('A7-proto-window', win && /7 dager/.test(win.rule) && /604800/.test(win.rule), win && win.rule);
}

/* ---------- B: θ-rekonstruksjon fra rad mot EKTE defs + EKTE motor + EKTE player ---------- */
{
  const r = mkPuzzleRow('B-coh', '2026-11-17T12:00:00.000Z', 'no', 12, 120);
  ok('B0-radform', r.answers.length === 16 && r.itemIds.length === 16 && r.cohortKey === 'B-coh', JSON.stringify(Object.keys(r)));
  const t = thetaFromRow(r);
  ok('B1-puzzle-16', t.answered === 16 && t.count === 12, 'count ' + t.count + '/answered ' + t.answered);
  ok('B2-engine-match', (t.engineTheta === null ? t.theta === null : (t.engineTheta !== null && Math.abs(t.engineTheta - t.theta) < 1e-9)) && t.engineCount === 12, 'engine θ̂ ' + t.engineTheta + ' vs rekonstruert ' + t.theta);
  ok('B3-theta-plausible', t.theta !== null && t.theta > -3 && t.theta < 3, 'θ̂=' + t.theta);

  // EKTE player-kontrakt: initStandardRun → openFloor → submitChoice(first) → advance;
  // buildScorePayload over EKTE player-state gir samme θ̂ som raden (count 12 begge steder)
  const state = player.initStandardRun(defPuzzle, 'no');
  for (let i = 0; i < 16; i++) {
    const cur = player.openFloor(state);
    const item = defPuzzle.items.find((it) => it.id === cur.itemId);
    const v = item.variants[0];
    const idx = i < 12 ? v.correctIndex : (v.correctIndex + 1) % v.options.length;
    let outcome = player.submitChoice(state, idx);
    // retry-kontrakten (etasje 9–16, feil første-respons): etasjen må lukkes med et ekstra forsøk.
    // Retry-svar bor KUN i state.attempts — nettopp derfor gjenstår count = 12 i payloadet.
    while (outcome.outcome === 'retry') outcome = player.submitChoice(state, v.correctIndex);
    player.advance(state);
  }
  ok('B4-player-finished', state.finished === true, 'finished=' + state.finished);
  const payload = player.buildScorePayload(state, 1000, 120);
  const sc = scoring.scoreTest(defPuzzle, payload);
  ok('B5-scoreTest-ok', sc.ok === true && sc.result && sc.result.total && sc.result.total.correctCount === 12 && Math.abs(sc.result.total.theta - t.theta) < 1e-9,
    'player/scoreTest θ̂ ' + (sc.result && sc.result.total && sc.result.total.theta) + ' vs rad-θ̂ ' + t.theta);

  // evne-rad: θ rekonstruerbar KUN fordi raden bærer itemIds (G2-feltet)
  const e = mkEvneRow('evne-t5-sekvens', 'B-coh2', '2026-11-17T12:00:00.000Z', 'no', 10, 200, 20);
  const et = thetaFromRow(e);
  ok('B6-evne-20', et.answered === 20 && et.count === 10, 'count ' + et.count + '/' + et.answered);
  ok('B7-evne-engine', et.engineTheta !== null && Math.abs(et.engineTheta - et.theta) < 1e-9 && et.engineCount === 10, 'engine ' + et.engineTheta + '/' + et.engineCount + ' vs ' + et.theta + '/' + et.count);

  // rad uten itemIds → data-error (G2-kontrakten eksakt slik røret oppfører seg mot mangelfull rad)
  const bad = { ...e };
  const ids0 = bad.itemIds.slice();
  delete bad.itemIds;
  ok('B8-itemIds-required', !!thetaFromRow(bad).error && ids0.length === 20, 'mangler itemIds → error: ' + thetaFromRow(bad).error);
}

/* ---------- H/C: normering-endpoint-kontragt i dag (G3 bevist i kode, ikke gjettet) ---------- */
{
  const np = { testId: PUZZLE, language: 'no', answers: Array(16).fill(1), durationSec: 100, cohortKey: 'ck-demo-123' };
  const [err, normalized] = normering.validatePostPayload(JSON.stringify(np));
  ok('H1-post-ok', err === null && normalized && normalized.testId === PUZZLE && normalized.answers.length === 16, 'err=' + err);
  ok('H2-cohortKey-dropped-i-dag', normalized !== null && !('cohortKey' in normalized), 'G3 bevist: cohortKey går tapt i dagens gramatikk — endpoint-utvidelse kreves i FASE 4');
  ok('H3-at-server-set', normalized !== null && typeof normalized.at === 'string', 'at=' + (normalized && normalized.at));
  ok('H4-reject-nonjson', normering.validatePostPayload('not json')[0] === 'body-not-json');
}

/* ---------- E: utvalgsregler R1–R5 ---------- */
{
  const p = mkPuzzleRow('E1', T0, 'no', 10, 100);
  const e = mkEvneRow('evne-t5-sekvens', 'E1', '2026-11-14T12:00:00.000Z', 'no', 8, 200, 20);
  ok('E1-pair-ok', pairable(p, e) === null, 'pairable=' + pairable(p, e));
  ok('E2-window-8d', pairable(p, mkEvneRow('evne-t5-sekvens', 'E1', '2026-11-09T12:00:00.000Z', 'no', 8, 200, 20)) === 'R2-window', '8 dager må avvises');
  const p2 = mkPuzzleRow('E2a', T0, 'no', 10, 100);
  ok('E3-window-7d-exact', pairable(p2, mkEvneRow('evne-t5-sekvens', 'E2a', '2026-11-10T12:00:00.000Z', 'no', 8, 200, 20)) === null, '7 dager eksakt må aksepteres; pairable=' + pairable(p2, mkEvneRow('evne-t5-sekvens', 'E2a', '2026-11-10T12:00:00.000Z', 'no', 8, 200, 20)));
  ok('E4-window-7d-plus1ms', pairable(p2, mkEvneRow('evne-t5-sekvens', 'E2a', '2026-11-10T11:59:59.999Z', 'no', 8, 200, 20)) === 'R2-window', '7d+1ms må avvises');
  ok('E5-language', pairable(p, { ...e, language: 'en' }) === 'R3-language', 'no/en må avvises');
  ok('E6-cohort-mismatch', pairable(p, { ...e, cohortKey: 'E1-ANNEN' }) === 'R1-cohortKey', 'forskjellig cohortKey må avvises');
  ok('E7-not-evne-track', pairable(p, { ...e, testId: 'nd-triage-v1' }) === 'R4-testId', 'ikke-evne testId må avvises');
  ok('E8-puzzle-16req', pairable({ ...p, answers: Array(15).fill(1) }, e) === 'R5-puzzleCoverage', '15/16 puzzle-svar må avvises');
  const evWithNull = { ...e, answers: e.answers.slice() };
  evWithNull.answers[3] = null;
  ok('E9-evne-null', pairable(p, evWithNull) === 'R4-evneCoverage', 'null-svar i evne-rad må avvises');
  ok('E10-no-cohort', pairable({ ...p, cohortKey: undefined }, e) === 'R1-cohortKey', 'manglende cohortKey må avvises');
}

/* ---------- D: X4 dedupe (første-at beholder) ---------- */
{
  const rows = [
    mkPuzzleRow('D1', '2026-11-17T10:00:00.000Z', 'no', 10, 100),
    mkPuzzleRow('D1', '2026-11-17T11:00:00.000Z', 'no', 12, 120), // duplikat — 120-s-rad må droppes
    mkEvneRow('evne-t5-sekvens', 'D1', '2026-11-14T09:00:00.000Z', 'no', 8, 200, 20),
  ];
  const dd = dedupeRows(rows);
  ok('D1-dedupe', dd.kept.length === 2 && dd.dupCount === 1, 'kept ' + dd.kept.length + ', dup ' + dd.dupCount);
  ok('D2-first-at', dd.kept.find((r) => r.testId === PUZZLE).durationSec === 100, 'første AT (100 s) beholder, ikke 120 s');
}

/* ---------- G: X2/X5/R2 gjennom hele analysen ---------- */
{
  const rows = [];
  rows.push(mkPuzzleRow('G1', T0, 'no', 10, 120));
  rows.push(mkEvneRow('evne-t5-sekvens', 'G1', '2026-11-14T12:00:00.000Z', 'no', 9, 300, 20));
  rows.push(mkPuzzleRow('G2', T0, 'no', 0, 120));                                     // X2: alle-feil
  rows.push(mkEvneRow('evne-t5-sekvens', 'G2', '2026-11-14T12:00:00.000Z', 'no', 9, 300, 20));
  rows.push(mkPuzzleRow('G3', T0, 'no', 10, 120));
  rows.push(mkEvneRow('evne-t5-sekvens', 'G3', '2026-11-14T12:00:00.000Z', 'no', 20, 300, 20)); // X2: alle-riktig evne
  rows.push(mkPuzzleRow('G4', T0, 'no', 10, 10));                                     // X5: < 24 s
  rows.push(mkEvneRow('evne-t5-sekvens', 'G4', '2026-11-14T12:00:00.000Z', 'no', 9, 300, 20));
  rows.push(mkPuzzleRow('G5', T0, 'no', 10, 120));
  rows.push(mkEvneRow('evne-t5-sekvens', 'G5', '2026-11-09T12:00:00.000Z', 'no', 9, 300, 20));   // R2: 8 dager
  const a = analyse(rows);
  ok('G1-pairs-formed', a.rows.pairsFormed === 4, 'pairsFormed ' + a.rows.pairsFormed + ' (G5 slås av R2 før θ-beregning)');
  ok('G2-included-only-G1', a.rows.included.length === 1 && a.rows.included[0].cohortKey === 'G1', 'included ' + a.rows.included.map((x) => x.cohortKey).join(','));
  ok('G3-x2-count', (a.rows.excluded['X2-degenerate'] || 0) === 2, 'X2 ' + JSON.stringify(a.rows.excluded));
  ok('G4-x5-count', (a.rows.excluded['X5-timefloor-puzzle'] || 0) === 1, 'X5 ' + JSON.stringify(a.rows.excluded));
  ok('G5-r2-count', (a.rows.excluded['R2-window'] || 0) === 1, 'R2 ' + JSON.stringify(a.rows.excluded));
  ok('G6-engine-consistent', !a.rows.excluded['engine-mismatch-puzzle'] && !a.rows.excluded['engine-mismatch-evne'] && !a.rows.excluded['engine-mismatch-count-puzzle'] && !a.rows.excluded['engine-mismatch-count-evne'], 'motor-mismatch ' + JSON.stringify(a.rows.excluded));
  ok('G7-classification-cannot-answer', a.results.classification.verdict === 'CANNOT-ANSWER', 'verdict ' + a.results.classification.verdict + ' ved n=1');
}

/* ---------- S: end-to-end syntetisk korrelasjon med kjent latent struktur (ingen RNG) ---------- */
{
  const LATS = [-1.8, -1.2, -0.7, -0.3, 0, 0.3, 0.7, 1.2, 1.8, 2.0];
  const rows = [];
  const logistic = (t) => 1 / (1 + Math.exp(-t));
  for (let i = 0; i < LATS.length; i++) {
    const θ = LATS[i], ck = 'S-' + i;
    const atP = mkPuzzleRow(ck, T0, 'no', 0, 120);        // fabrikant overstyres nedenfor med IRT-svar
    const atE = mkEvneRow('evne-t5-sekvens', ck, '2026-11-14T12:00:00.000Z', 'no', 0, 300, 20);
    atP.answers = atP.itemIds.map((id, j) => {
      const item = defPuzzle.items.find((x) => x.id === id);
      const v = item.variants[0];
      const p = logistic(θ - v.difficulty);
      const u = 0.1 + 0.8 * ((j * 7 + i * 3) % 10) / 9;   // deterministisk spredd kvanti 0.1..0.9
      return u < p ? v.correctIndex : (v.correctIndex + 1) % v.options.length;
    });
    const ed = evneDef('evne-t5-sekvens');
    const edById = new Map(ed.items.map((x) => [x.id, x]));
    atE.answers = atE.itemIds.map((id, j) => {
      const v = edById.get(id).variants[0];
      const p = logistic(θ - v.difficulty);
      const u = 0.1 + 0.8 * ((j * 11 + i * 5) % 10) / 9;
      return u < p ? v.correctIndex : (v.correctIndex + 1) % v.options.length;
    });
    rows.push(atP); rows.push(atE);
  }
  const a = analyse(rows);
  const r = a.results;
  ok('S1-n', r.n >= 5, 'n=' + r.n + ', ekskludert ' + JSON.stringify(a.rows.excluded));
  ok('S2-positive-r', r.pearson !== null && r.pearson > 0.3, 'r=' + (r.pearson === null ? 'null' : r.pearson.toFixed(3)));
  ok('S3-ci-order', r.fisherZ !== null && r.fisherZ.ci95[1] > r.fisherZ.ci95[0], 'CI ' + (r.fisherZ ? JSON.stringify(r.fisherZ.ci95.map((x) => x.toFixed(2))) : 'null'));
  ok('S4-verdict', r.classification && ['POSITIVE', 'WEAK', 'NONE', 'EXPLORATORY', 'CANNOT-ANSWER'].includes(r.classification.verdict), 'verdict ' + (r.classification && r.classification.verdict));
  const crossTol = ['POSITIVE', 'WEAK'].includes(r.classification.verdict) ? 0.05 : 0.15;
  ok('S5-f3-cross', r.rCount !== null && Math.abs(r.rCount - r.pearson) <= crossTol,
    '|r−rCount|=' + (r.rCount === null ? 'null' : Math.abs(r.rCount - r.pearson).toFixed(4)) + ' (tol ' + crossTol + ', klassen ' + r.classification.verdict + ')');
}

/* ---------- J: personvern — whitelist i kilde og radformat ---------- */
{
  const src = readFileSync(fileURLToPath(import.meta.url), 'utf8');
  // kommentarfrie fragmenter: sammenlign mot stripped kilde, og bygg tokenene delvis så den
  // strippede kilden ikke selv inneholder literaler
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const forbidden = ['coo' + 'kie', 'ema' + 'il', 'userA' + 'gent', 'navi' + 'gator.', 'local' + 'Storage', 'ipif' + 'y'];
  for (const f of forbidden) ok('J1-no-' + f, !stripped.includes(f), 'pipeline-kilden må ikke operere på ' + f);
  const row = mkPuzzleRow('J1', T0, 'no', 10, 100);
  const fields = Object.keys(row);
  ok('J2-rowfields-whitelisted', fields.every((f) => ROW_FIELDS_OK.includes(f)), fields.join(','));
  ok('J3-rowfields-complete', ['testId', 'language', 'at', 'answers', 'itemIds', 'durationSec', 'cohortKey'].every((f) => fields.includes(f)), fields.join(','));
}

/* ---------- L: live-data-arm (verbatim, samme rør) ---------- */
const args = process.argv.slice(2);
const dataIdx = args.indexOf('--data');
let arm = 'syntetisk-selftest';
let live = null;
if (dataIdx !== -1 && args[dataIdx + 1]) {
  arm = 'live';
  const rows = JSON.parse(readFileSync(args[dataIdx + 1], 'utf8'));
  if (!Array.isArray(rows)) throw new Error('--data må være en JSON-array av rader');
  const bad = rows.filter((r) => !r || typeof r !== 'object' || !Object.keys(r).every((f) => ROW_FIELDS_OK.includes(f)));
  if (bad.length) throw new Error('rad utenfor whitelist-feltene: ' + JSON.stringify(Object.keys(bad[0])) + ' — personvernkilden avviser');
  live = analyse(rows);
}

/* ---------- rapport ---------- */
const report = {
  module: 'brainarea',
  todo: '#3767',
  harness: '_validitet_gyldighetsanalyse.mjs v1.0.0',
  protocol: '_validitet_gyldighetsanalyse_protokoll.json v1.0.0',
  contract: 'tests/puzzle/_puzzle_design_v1_1.md § 3',
  runAt: new Date().toISOString(),
  arm,
  selftestsPassed: n_ok,
  selftestsFailed: fails.length,
  fails,
  answer3767: 'IKKE BESVARELSBAR MED TALL I DAG — G1–G4 (protokoll.expectedDataGaps) må lukkes først i FASE 4-livssyklusen. Protokollen er forhåndsregistrert; pipelinen kjører VERBATIM mot KV-eksport når dataene finnes (arm: --data).' +
    ' FASE 2-skåringsgyldigheten (F3) forblir det eneste gyldighetstallet til da: standard-mode-skåren er monoton transformasjon av highscore; konstruktvaliditeten avgjøres i DETTE steget når dataene fins.',
  dataGaps: {
    G1: 'NORMERING_KV finnes ikke i dag — github.io lagrer ingenting (stored:false-kontrakten i functions/normering.js).',
    G2: 'itemIds er påkrevd i lagret rad (selftest B8); evne-normering-payload inneholder dem ikke i dag.',
    G3: 'cohortKey droppes av dagens POST-gramatikk (selftest H2) — endpoint må akseptere og persistere feltet.',
    G4: 'evne-siden har ingen normerings-POST-wiring (grep 2026-11-17).',
  },
};
if (live) {
  report.liveResult = live.results;
  report.liveIncludedExample = live.rows.included.slice(0, 5);
  report.liveExcluded = live.rows.excluded;
}
writeFileSync(resolveCandidate('tests/puzzle/_validitet_gyldighetsanalyse_report.json'), JSON.stringify(report, null, 2));

console.log('\n=== _validitet_gyldighetsanalyse (' + arm + ') ===');
console.log('selftests: ' + n_ok + ' PASS, ' + fails.length + ' FAIL');
for (const f of fails) console.log('  FAIL ' + f.id + ': ' + f.detail);
if (live) {
  const r = live.results;
  console.log('LIVE: n=' + r.n + ' r=' + (r.pearson === null ? 'null' : r.pearson.toFixed(3)) + ' ρ=' + (r.spearman === null ? 'null' : r.spearman.toFixed(3)) + ' rCount=' + (r.rCount === null ? 'null' : r.rCount.toFixed(3)) + ' verdict=' + r.classification.verdict);
}
process.exit(fails.length === 0 ? 0 : 1);
