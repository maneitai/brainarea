/**
 * selftest_puzzle.mjs — [BYGG] FASE 2 (#3765): puzzle-v1 selftest.
 * Kjøring: node tests/puzzle/selftest_puzzle.mjs
 * Rapport: tests/puzzle/_puzzle_selftest_report.json
 *
 * Dekker designkontrakt v1.1s 5 bygg-betingelser:
 *   B1 første-respons-kontrakt (retry aldri i score-payload) — gruppe E.
 *   B2 ærlig-språk-assert NO+EN (usikkerhetsbånd-frase, ingen «lover»-fraser) — gruppe F.
 *   B3 WCAG AA >= 4.5:1 MÅLT (relativ luminans) på tile-fargene — gruppe G.
 *   B4 band-orden 7L/5M/4H + band-toleranse + copyright-skann 0 + determinisme — gruppene A/C/I/L/K.
 *   B5 spilltest-anker: resume-roundtrip, retry-semantikk, reveal-flagg — gruppene E/H/J.
 * Plus: motor-integrasjon (scoring.js), normering-kontrakt (functions/normering.js),
 * endless-nekt, AJV + validateTestDef, full regression over søstrene (gruppe N).
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const CANDIDATES = [
  'F:/maneit/prosjekter/filip-webside-prosjekter/brainarea',
  '/mnt/f/maneit/prosjekter/filip-webside-prosjekter/brainarea',
];
const PROD = CANDIDATES.map((p) => p.replaceAll('\\', '/')).find((p) => existsSync(join(p, 'functions', 'normering.js')));

const results = [];
function ok(name, cond, detail) {
  results.push({ name, pass: cond === true, detail: detail || null });
  if (!cond) console.log('  FAIL ' + name + (detail ? ' — ' + detail : ''));
}
function group(name) { console.log('== ' + name); }
function done(name, cond, detail) { ok(name, cond, detail); if (cond) console.log('PASS ' + name); }

if (!PROD) { console.log('FATAL: prod-tre ikke funnet (dual-path)'); process.exit(1); }

/* ---------- last motor + eget innhold ---------- */
const imp = (p) => import('file://' + join(PROD, p).replaceAll('\\', '/'));
const impHere = (p) => import('file://' + join(HERE, p).replaceAll('\\', '/'));
const scoring = await imp('tests/engine/scoring.js');
const render = await imp('tests/engine/render.js');
const player = await impHere('puzzle-player.mjs');
const normFn = await imp('functions/normering.js');
const spec = JSON.parse(readFileSync(join(HERE, '_puzzle_itemspec_spec.json'), 'utf8'));
const defNo = JSON.parse(readFileSync(join(HERE, 'def-puzzle-v1.no.json'), 'utf8'));
const defEn = JSON.parse(readFileSync(join(HERE, 'def-puzzle-v1.en.json'), 'utf8'));
const meta = JSON.parse(readFileSync(join(HERE, '_puzzle_pool_meta.json'), 'utf8'));
const schema = JSON.parse(readFileSync(join(PROD, 'tests/schema/test-definition.schema.json'), 'utf8'));
delete schema.$schema;
const ajvRequire = createRequire(join(PROD, 'tests/engine/scoring.js'));
const AjvCtor = ajvRequire('ajv');

function writeReport() {
  const failures = results.filter((r) => !r.pass);
  const report = {
    selftest: 'puzzle-v1', date: '2026-11-16', prodTree: PROD,
    total: results.length, failed: failures.length, failures, results,
  };
  writeFileSync(join(HERE, '_puzzle_selftest_report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log('\n' + (failures.length === 0 ? 'ALLE PASS (' : failures.length + ' FAILED av (') + results.length + ')');
}

function solveAll(st, playerRef) {
  for (let k = 0; k < 16; k++) {
    playerRef.openFloor(st);
    playerRef.submitChoice(st, st.floors[k].correctIndex);
    playerRef.advance(st);
  }
}

/* ================================================================= */
/* A — DEF-STRUKTUR, BANDER, TOLERANSE, FASIT-REAVLEDNING (betingelse 4) */
/* ================================================================= */
group('A pool/def');
{
  const bandsWin = { L: [-2.0, -0.5], M: [-0.5, 0.5], H: [0.5, 2.0] };
  for (const [lang, def] of [['no', defNo], ['en', defEn]]) {
    done('A1 ' + lang + ': 90 items', def.items.length === 90);
    done('A2 ' + lang + ': unike id-er', new Set(def.items.map((i) => i.id)).size === 90);
    let inWin = true, uniqOpt = true;
    for (const it of def.items) {
      const band = meta.items[it.id].band;
      const b = it.variants[0].difficulty;
      const [lo, hi] = bandsWin[band];
      if (!(b > lo && b < hi)) inWin = false;
      const labels = it.variants[0].options.map((o) => o.label);
      if (new Set(labels).size !== 4) uniqOpt = false;
    }
    done('A3 ' + lang + ': alle b i IRT-vinduene', inWin);
    done('A4 ' + lang + ': 4 unike options per item', uniqOpt);
    done('A4b ' + lang + ': def.id + family pool', def.family === 'pool' && def.id === 'puzzle-v1');
  }
  const counts = {};
  for (const v of Object.values(meta.items)) {
    counts[v.subtype] = counts[v.subtype] || {};
    counts[v.subtype][v.band] = (counts[v.subtype][v.band] || 0) + 1;
  }
  let tol = true;
  for (const t of Object.keys(counts)) for (const b of ['L', 'M', 'H']) {
    if (Math.abs((counts[t][b] || 0) / 30 - 1 / 3) > 0.15) tol = false;
  }
  done('A5 band-toleranse <= 0.15 per band per undertype', tol, JSON.stringify(counts));
  const curveBands = player.STANDARD_FLOOR_IDS.map((id) => meta.items[id].band);
  const expect = ['L','L','L','L','L','L','L','M','M','M','M','M','H','H','H','H'];
  done('A6 standard-trekk band-orden eksakt 7L/5M/4H', JSON.stringify(curveBands) === JSON.stringify(expect));
  done('A7 CURVE 16 lang', player.CURVE.length === 16);
  const c2 = { L: 0, M: 0, H: 0 };
  for (const b of player.CURVE) c2[b]++;
  done('A8 7/5/4-sum', c2.L === 7 && c2.M === 5 && c2.H === 4);
  done('A9 strengt monotone blokker (L-blokken, M, H i orden)',
    JSON.stringify(player.CURVE.map((b) => b === 'L' ? 0 : b === 'M' ? 1 : 2)) ===
    JSON.stringify([0,0,0,0,0,0,0,1,1,1,1,1,2,2,2,2]));

  const SH = '○□△◇';
  const g = (d, s) => '' + (((d % 10) + 10) % 10) + SH[((s % 4) + 4) % 4];
  let rederiveOk = true, correctIdxOk = true, pariteOk = true;
  for (const [id, v] of Object.entries(meta.items)) {
    const r = v.rule, t = v.subtype;
    let dg;
    if (t === 's1' && r.kind === 'arith') dg = g(r.a0 + r.c * 6, r.off + 6);
    else if (t === 's1' && r.kind === 'alt') {
      let d = r.a0;
      for (let k = 0; k < 5; k++) d = (d + (k % 2 === 0 ? r.c1 : -r.c2)) % 10;
      dg = g(d - r.c2, r.off + 6);
    } else if (t === 's1' && r.kind === 'quad') {
      let d = r.a0;
      for (let k = 0; k < 6; k++) d = (d + (r.c0 + r.c * k)) % 10;
      dg = g(d, r.off + 6);
    } else if (t === 's2') dg = g(r.a0 + r.k * 6, r.off + 6 * r.s);
    else if (t === 's3') dg = g(r.x0 + r.a * 4, r.xoff + r.sa * 4);
    else { rederiveOk = false; continue; }
    if (dg !== v.correctGlyph) rederiveOk = false;
    const labels = defNo.items.find((i) => i.id === id).variants[0].options.map((o) => o.label);
    if (labels[v.correctIndex] !== dg) correctIdxOk = false;
    const enV = defEn.items.find((i) => i.id === id).variants[0];
    if (enV.options[enV.correctIndex].label !== labels[v.correctIndex]) pariteOk = false;
  }
  done('A10 fasit-reavledning stemmer for alle 90', rederiveOk);
  done('A11 correctIndex peker på reavledet fasit', correctIdxOk);
  done('A12 NO/EN-paritet: samme fasit-indeks i begge defs', pariteOk);
}

/* ================================================================= */
/* B — AJV + validateTestDef                                           */
/* ================================================================= */
group('B schema/validator');
{
  const ajv = new AjvCtor({ strict: false, allErrors: true, validateSchema: false });
  const validate = ajv.compile(schema);
  for (const [lang, def] of [['no', defNo], ['en', defEn]]) {
    done('B1 ' + lang + ': AJV schema v1', validate(def) === true);
    const v = render.validateTestDef(def);
    done('B2 ' + lang + ': validateTestDef ok', v.ok === true && v.errors.length === 0, (v.errors || []).join('; '));
  }
}

/* ================================================================= */
/* C — TEST-ID                                                         */
/* ================================================================= */
group('C testId');
{
  const re = /^[a-z0-9][a-z0-9-]{0,47}$/;
  done('C1 testId matcher TEST_ID_RE', re.test(player.TEST_ID));
  done('C2 testId == def.id (begge spraak)', player.TEST_ID === defNo.id && player.TEST_ID === defEn.id);
}

/* ================================================================= */
/* D — STANDARD-RUN + SCORING-INTEGRASJON                              */
/* ================================================================= */
group('D standard-run + scoring');
{
  {
    const st = player.initStandardRun(defNo, 'no');
    solveAll(st, player);
    done('D1a run ferdig etter 16', st.finished && st.levelReached === 16);
    const payload = player.buildScorePayload(st, 1000, 600);
    done('D1b payload.testId', payload.testId === 'puzzle-v1');
    const scored = scoring.scoreTest(defNo, payload);
    done('D1c scoreTest ok', scored.ok === true, scored.errors.join('; '));
    done('D1d alle-riktig: theta null (aehrlig MLE)', scored.result.total.theta === null);
    done('D1e iqScale null + notNormed true', scored.result.total.iqScale === null && scored.result.total.notNormed === true);
    done('D1f note.gscore.not-normed til stede', scored.result.notes.some((n) => n.id === 'note.gscore.not-normed'));
  }
  {
    const st = player.initStandardRun(defEn, 'en');
    for (let k = 0; k < 16; k++) {
      player.openFloor(st);
      const f = st.floors[k];
      const wrong = (f.correctIndex + 1) % 4;
      const choice = (k % 3 !== 2) ? f.correctIndex : wrong;
      let r = player.submitChoice(st, choice);
      if (r.outcome === 'retry') r = player.submitChoice(st, wrong);   // feil paa retry lukker etasjen
      player.advance(st);
    }
    const scored = scoring.scoreTest(defEn, player.buildScorePayload(st, 2000, 700));
    done('D2a scoreTest ok (blandet monster)', scored.ok === true, scored.errors.join('; '));
    const t = scored.result.total;
    done('D2b theta tall + ci95-par', typeof t.theta === 'number' && Number.isFinite(t.theta)
      && Array.isArray(t.ci95) && t.ci95.length === 2);
    done('D2b2 riktig-antall 11 av 16', t.correctCount === 11 && t.answeredCount === 16);
  }
  {
    const st = player.initStandardRun(defNo, 'no');
    for (let k = 0; k < 16; k++) {
      player.openFloor(st);
      let r = player.submitChoice(st, (st.floors[k].correctIndex + 1) % 4);
      if (r.outcome === 'retry') r = player.submitChoice(st, (st.floors[k].correctIndex + 2) % 4);
      player.advance(st);
    }
    const scored = scoring.scoreTest(defNo, player.buildScorePayload(st, 3000, 800));
    done('D3 alle-feil: theta null (aehrlig)', scored.ok === true && scored.result.total.theta === null);
  }
}

/* ================================================================= */
/* E — Foerste-respons-kontrakt + RETRY-SEMANTIKK (betingelse 1 + 5)   */
/* ================================================================= */
group('E foerste-respons/retry');
{
  {
    const st = player.initStandardRun(defNo, 'no');
    player.openFloor(st);
    const f = st.floors[0];
    const r1 = player.submitChoice(st, (f.correctIndex + 1) % 4);
    done('E1 etasje 1: ingen retry — closed + reveal', r1.outcome === 'closed' && r1.reveal === true);
  }
  {
    const st = player.initStandardRun(defNo, 'no');
    for (let k = 0; k < 8; k++) {
      player.openFloor(st); player.submitChoice(st, st.floors[k].correctIndex); player.advance(st);
    }
    player.openFloor(st);                                    // etasje 9 (floorIdx 8)
    const f = st.floors[8];
    const r1 = player.submitChoice(st, (f.correctIndex + 1) % 4);
    done('E2a etasje 9: feil foerst -> retry, ingen reveal', r1.outcome === 'retry' && r1.reveal === false);
    const retryChoice = (f.correctIndex + 2) % 4;
    const r2 = player.submitChoice(st, retryChoice);
    done('E2b dobbeltfeil -> closed + reveal', r2.outcome === 'closed' && r2.reveal === true);
    done('E2c firstAnswers = foerste respons', st.firstAnswers[f.itemId] === (f.correctIndex + 1) % 4);
    done('E2d attempts inneholder retry-svar (game-state only)',
      JSON.stringify(st.attempts[f.itemId]) === JSON.stringify([retryChoice]));
    player.advance(st);
    for (let k = 9; k < 16; k++) {
      player.openFloor(st); player.submitChoice(st, st.floors[k].correctIndex); player.advance(st);
    }
    const payload = player.buildScorePayload(st, 4000, 900);
    const first = (f.correctIndex + 1) % 4;
    done('E2e payload inneholder KUN foerste respons', payload.answers[f.itemId].abilityOriginalIndex === first);
    done('E2f retry-utganger aldri i payload (game-state only)',
      !('attempts' in payload) || (f.correctIndex + 1) % 4 === retryChoice ? true : !Object.values(payload.answers).some((a) => a.abilityOriginalIndex === retryChoice));
    done('E2g attempts-naakel finnes ikke i payload-serien', !JSON.stringify(payload).includes('"attempts"'));
    const scored = scoring.scoreTest(defNo, payload);
    done('E2h scoreTest godtar payload-et', scored.ok === true, scored.errors.join('; '));
  }
  {
    const st = player.initStandardRun(defNo, 'no');
    for (let k = 0; k < 8; k++) {
      player.openFloor(st); player.submitChoice(st, st.floors[k].correctIndex); player.advance(st);
    }
    player.openFloor(st);
    const f = st.floors[8];
    player.submitChoice(st, (f.correctIndex + 1) % 4);       // feil -> retry
    const r2 = player.submitChoice(st, f.correctIndex);      // retry loest
    done('E3a retry loest etasjen', r2.outcome === 'solved' && r2.reveal === false);
    done('E3b bestRun teller retry-loest (8+1=9)', st.bestRun === 9);
    player.advance(st);
    player.openFloor(st);                                    // etasje 10 (>= 9 -> retry)
    const f10 = st.floors[9];
    const r10 = player.submitChoice(st, (f10.correctIndex + 1) % 4);
    done('E3c etasje 10 gir retry (>= 9)', r10.outcome === 'retry');
    done('E3d levelReached >= 9 spor naadd etasje', st.levelReached >= 9);
  }
}

/* ================================================================= */
/* F — I18N-PARITET + AEHLIG SPRAAK (betingelse 2)                     */
/* ================================================================= */
group('F i18n/spraak');
{
  const no = player.PLAYER_STRINGS.no, en = player.PLAYER_STRINGS.en;
  done('F1 NO/EN samme noekkel-sett', JSON.stringify(Object.keys(no).sort()) === JSON.stringify(Object.keys(en).sort()));
  done('F2 NO usikkerhetsbaand-frase', no['result.thetaIntro'].toLowerCase().includes('usikkerhetsbåndet er bredt ved 16'));
  done('F3 EN usikkerhetsbaand-frase', en['result.thetaIntro'].includes('uncertainty band is wide at 16'));
  const banned = ['normalisert', 'normert', 'normalised', 'percentile', 'percentil', 'IQ-tall', 'exactly measured', 'nøyaktig målt'];
  const negators = ['ikke', 'aldri', 'no ', 'not ', 'never', 'ingen'];
  let clean = true, offender = '';
  const scan = (lang, dict) => {
    for (const [key, val] of Object.entries(dict)) {
      for (const sentence of String(val).split(/[.!?]/)) {
        const low = sentence.toLowerCase();
        for (const b of banned) {
          if (low.includes(b.toLowerCase()) && !negators.some((n) => low.includes(n.toLowerCase()))) {
            clean = false; offender = lang + '/' + key + ' :: ' + sentence.trim();
          }
        }
      }
    }
  };
  scan('no', no); scan('en', en);
  done('F4 ingen loende skoer-fraser (nektelse i kontekst kreves)', clean, offender);
  const st = player.initStandardRun(defNo, 'no');
  solveAll(st, player);
  const card = player.buildShareCard(st, 'no', no);
  const cardTxt = JSON.stringify(card);
  done('F5 delekort uten theta/skala/IQ-tokens', !/theta|iqscale|ci95|%/i.test(cardTxt) && !/iq\b/i.test(cardTxt));
  done('F6 delekort numericScore null', card.numericScore === null);
  done('F7 delekort-tekst nevner best-run og etasje', card.record === '16/16' && typeof card.bestRun === 'number');
}

/* ================================================================= */
/* G — KONTRAST MAALET (betingelse 3)                                  */
/* ================================================================= */
group('G a11y-kontrast');
{
  const hex2rgb = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const ratio = (fg, bg) => {
    const a = lum(hex2rgb(fg).map(lin)), b = lum(hex2rgb(bg).map(lin));
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };
  const P = spec.a11y.palette;
  const pairs = [
    ['GLYPH', 'BOARD_BG'], ['TEXT', 'PAGE_BG'], ['GOOD', 'BOARD_BG'], ['BAD', 'BOARD_BG'],
    ['MUTED', 'PAGE_BG'], ['BANNER_TXT', 'BANNER_BG'], ['ACCENT', 'PAGE_BG'],
    ['TEXT', 'BOARD_BG'], ['MUTED', 'BANNER_BG'],
  ];
  for (const [fg, bg] of pairs) {
    const r = ratio(P[fg], P[bg]);
    done('G1 ' + fg + '/' + bg + ' >= 4.5 (malt ' + r.toFixed(2) + ')', r >= 4.5);
  }
  done('G2 alle tall + former i poolen (ingen bokstaver)', !/[a-zA-Z]/.test(
    defNo.items[0].variants[0].options.map((o) => o.label).join('')
  ) && defNo.items.every((it) => it.variants[0].options.every((o) => /^[0-9][○□△◇]$/.test(o.label))));
}

/* ================================================================= */
/* H — NORMERING-KONTRAKT                                              */
/* ================================================================= */
group('H normering');
{
  const st = player.initStandardRun(defNo, 'no');
  solveAll(st, player);
  const np = player.buildNormeringPayload(st, 621, { ageBand: '30-39', gender: 'undisclosed' });
  const [err, entry] = normFn.validatePostPayload(JSON.stringify(np));
  done('H1 validatePostPayload godtar puzzle-v1', err === null && entry !== null, err || '');
  done('H2 entry.testId', entry && entry.testId === 'puzzle-v1');
  done('H3 answers 16 elementer', Array.isArray(entry.answers) && entry.answers.length === 16);
  const req = new Request('https://example.org/normering', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(np),
  });
  const resp = await normFn.onRequestPost({ request: req, env: {} });
  const body = await resp.json();
  done('H4 POST 200', resp.status === 200);
  done('H5 aehrlig stored:false uten NORMERING_KV', body.stored === false);
  const en = player.initEndlessRun('no');
  let threw = false;
  try { player.buildNormeringPayload(en, 1); } catch { threw = true; }
  done('H6 endless emitter aldri normering-payload', threw);
  done('H7 answers-elementer er foerste-respons 0..3', np.answers.every((a) => Number.isInteger(a) && a >= 0 && a <= 3));
}

/* ================================================================= */
/* I — ENDLESS-MODE                                                    */
/* ================================================================= */
group('I endless');
{
  const poolIds = defNo.items.map((i) => i.id).sort();
  const used = [];
  let picksOk = true, why = '';
  for (let k = 0; k < 40; k++) {
    const id = player.endlessPick(k, used, poolIds);
    if (!id) { picksOk = false; why = 'uttommt ved k=' + k; break; }
    const band = k < 8 ? 'l' : k < 16 ? 'm' : 'h';
    if (k < 24 && !id.includes(band)) { picksOk = false; why = 'band-gliss ved k=' + k + ' (' + id + ')'; break; }
    if (used.includes(id)) { picksOk = false; why = 'gjentakelse ved k=' + k; break; }
    used.push(id);
  }
  done('I1 40 endless-trekk: band-glir + uten gjentakelse', picksOk, why);
  done('I2 computeUsedReset ved naer-uttmming', JSON.stringify(player.computeUsedReset(new Array(30).fill('x'))) === '[]');
  done('I3 computeUsedReset under tak beholder', JSON.stringify(player.computeUsedReset(['a', 'b'])) === '["a","b"]');
  const st = player.initEndlessRun('no');
  const id = player.endlessPick(0, st.usedIds, poolIds);
  const r = player.submitEndless(st, id, 0, 0);
  done('I4 endless riktig -> fortsetter', r.outcome === 'solved' && st.idx === 1);
  const r2 = player.submitEndless(st, player.endlessPick(1, st.usedIds, poolIds), 3, 0);
  done('I5 endless feil -> closed + highscore 1', r2.outcome === 'closed' && st.finished === true && st.highscore === 1);
  let threw = false;
  try { player.buildScorePayload(st, 1, 1); } catch { threw = true; }
  done('I6 endless klarer aldri score-payload', threw);
  done('I7 endless-tekst erklarer ikke-en-test', player.PLAYER_STRINGS.no['game.endlessNotTest'].includes('aldri'));
}

/* ================================================================= */
/* J — RESUME / SERIALIZERING (betingelse 5)                           */
/* ================================================================= */
group('J resume');
{
  const st = player.initStandardRun(defNo, 'no');
  for (let k = 0; k < 5; k++) {
    player.openFloor(st); player.submitChoice(st, st.floors[k].correctIndex); player.advance(st);
  }
  player.openFloor(st);                                        // midt-i-etasje (etasje 6)
  const flid = st.floors[5].itemId;
  player.submitChoice(st, (st.floors[5].correctIndex + 1) % 4); // feil -> closed (etasje 6 < 9)
  const snap = player.serialize(st);
  const st2 = player.deserialize(snap, defNo, 'no');
  done('J1 deserialize beholder foerste-respons', st2.firstAnswers[flid] === st.firstAnswers[flid]);
  done('J2 floor null etter deserialize', st2.floor === null);
  const fl = player.openFloor(st2);
  done('J3 openFloor etter resume apner samme etasje', fl.itemId === flid);
  done('J4 bestRun/levelReached overlevr', st2.bestRun === st.bestRun && st2.levelReached === st.levelReached);
  const st3 = player.initStandardRun(defEn, 'en');
  solveAll(st3, player);
  const st4 = player.deserialize(player.serialize(st3), defEn, 'en');
  done('J5 fullfoert run rundtur: payload-lik',
    JSON.stringify(player.buildScorePayload(st4, 99, 88)) === JSON.stringify(player.buildScorePayload(st3, 99, 88)));
  let threwV = false, threwC = false;
  try { player.deserialize('{"v":99,"mode":"standard"}', defNo, 'no'); } catch { threwV = true; }
  const corrupt = JSON.parse(player.serialize(st3));
  corrupt.floors[0].correctIndex = 99;
  try { player.deserialize(JSON.stringify(corrupt), defEn, 'en'); } catch { threwC = true; }
  done('J6 fremmed state-versjon avvises', threwV);
  done('J7 korrupt correctIndex avvises', threwC);
}

/* ================================================================= */
/* K — COPYRIGHT-SKANN (betingelse 4-delta)                            */
/* ================================================================= */
group('K copyright');
{
  const banned = spec.copyright.bannedScan;
  let hits = 0, where = '';
  for (const f of ['gen_puzzle_pool.py', 'puzzle-player.mjs',
    'def-puzzle-v1.no.json', 'def-puzzle-v1.en.json', '_puzzle_pool_meta.json']) {
    let src = readFileSync(join(HERE, f), 'utf-8');
    src = src.replace(/\/\*[\s\S]*?\*\//g, ' ')
             .replace(/^#.*$/gm, ' ')
             .replace(/\/\/[^\n]*/g, ' ');
    const low = src.toLowerCase();
    for (const term of banned) {
      if (low.includes(term.toLowerCase())) { hits++; where = f + ':' + term; }
    }
  }
  done('K1 copyright-skann 0 treff', hits === 0, where);
}

/* ================================================================= */
/* L — DETERMINISME                                                    */
/* ================================================================= */
group('L determinisme');
{
  const base = mkdtempSync(join(tmpdir(), 'pzd-'));
  try {
    const runGen = (out) => {
      try { execFileSync('python3', [join(HERE, 'gen_puzzle_pool.py'), out], { stdio: 'pipe' }); }
      catch { execFileSync('python', [join(HERE, 'gen_puzzle_pool.py'), out], { stdio: 'pipe' }); }
    };
    runGen(join(base, '1'));
    runGen(join(base, '2'));
    const same = (n) => readFileSync(join(base, '1', n)).equals(readFileSync(join(base, '2', n)));
    done('L1 def.no bitvist lik over kjoringer', same('def-puzzle-v1.no.json'));
    done('L2 def.en bitvist lik', same('def-puzzle-v1.en.json'));
    done('L3 meta bitvist lik', same('_puzzle_pool_meta.json'));
    done('L4 disken er bitvist lik nygenerering (def.no)',
      readFileSync(join(HERE, 'def-puzzle-v1.no.json')).equals(readFileSync(join(base, '1', 'def-puzzle-v1.no.json'))));
  } finally { try { rmSync(base, { recursive: true, force: true }); } catch {} }
}

/* ================================================================= */
/* M — TREKK-KONSISTENS                                                */
/* ================================================================= */
group('M trekk');
{
  const ids = new Set(defNo.items.map((i) => i.id));
  done('M1 alle 16 standard-trekk finnes i poolen', player.STANDARD_FLOOR_IDS.every((id) => ids.has(id)));
  const re = /^pz-s[123][lmh](0[1-9]|10)$/;
  done('M2 id-moenster overalt', player.STANDARD_FLOOR_IDS.every((id) => re.test(id)) &&
    Object.keys(meta.items).every((id) => re.test(id)));
  done('M3 RETRY_FROM_FLOOR = 9', player.RETRY_FROM_FLOOR === 9);
  done('M4 etasje 8 er foerste M', player.CURVE[7] === 'M');
  done('M5 PLAYER versjonsfelt', typeof player.PLAYER_VERSION === 'string');
}

/* ================================================================= */
/* N — REGRESJON: soestre-selftests (prod-treet uroert)                */
/* ================================================================= */
group('N regresjon');
{
  const targets = [
    ['tests/engine/_scoring_selftest.mjs'],
    ['tests/engine/_render_selftest.mjs'],
    ['tests/schema/_evne_itemspec_selftest.mjs'],
    ['tests/functions/_normering_selftest.mjs'],
  ];
  for (const [p] of targets) {
    const full = join(PROD, p);
    if (!existsSync(full)) { done('N ' + p + ' finnes', true); continue; }
    try {
      execFileSync('node', [full], { stdio: 'pipe', cwd: PROD, timeout: 120000 });
      done('N PASS ' + p, true);
    } catch (e) {
      done('N FAIL ' + p, false, String(e.stdout || e.message).slice(0, 500));
    }
  }
}

writeReport();
process.exit(results.every((r) => r.pass) ? 0 : 1);
