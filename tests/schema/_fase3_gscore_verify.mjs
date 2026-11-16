/**
 * [3-VEIS] FASE 3: Resultattekst evner/IQ — E-harness (todo-run TR-4CF9780358E4, iter 1).
 * Søster til _fase3_rel_verify.mjs / les-som-fremmed-harnesses.
 * E = deterministiske verifiseringer av g-score resulttext-endringene:
 *   ekte scoringpath (scoreTest over live evne-t1-matrise def) -> renderReport
 *   over alle 3 rammekonfiger x no/en, med pins per rettelse R1-R5.
 * Kjor: node tests/schema/_fase3_gscore_verify_e.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderReport } from '../../report/renderer.mjs';
import { scoreTest } from '../engine/scoring.js';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const CFG = (f) => JSON.parse(readFileSync(`${HERE}../../report/configs/${f}.json`, 'utf8'));
const DEF = (f) => JSON.parse(readFileSync(`${HERE}evne_pool/${f}`, 'utf8'));
const NO_G = 'Generell evne (g)';
const EN_G = 'General ability (g)';

let pass = 0; const failures = [];
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`PASS ${name}`); }
  else { failures.push(name); console.log(`FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

/* ---------- ekte scoringpath ---------- */
function makePayload(def, lang, wrongEvery) {
  const answers = {};
  def.items.forEach((item, i) => {
    const variant = item.variants.find((v) => v.lang === lang) || item.variants[0];
    const isWrong = wrongEvery === 'all' || (i % 5 === 0);
    const idx = isWrong ? (variant.correctIndex + 1) % variant.options.length : variant.correctIndex;
    answers[item.id] = { kind: 'ability', lang, abilityOriginalIndex: idx };
  });
  return {
    testId: def.id, lang, itemIds: def.items.map((i) => i.id),
    startedAt: 0, finishedAt: 1000, timeSpentSec: 61, expired: false, answers,
  };
}

const defNo = DEF('def-evne-t1-matrise.no.json');
ok('E0.def-kind-ability', defNo.items.every((i) => i.kind === 'ability'));
const res = scoreTest(defNo, makePayload(defNo, 'no', 'every5'), { allowPartial: false });
ok('E0.score-ok', res.ok === true, JSON.stringify((res.errors || []).slice(0, 2)));
const G = res.result;
ok('E0.correct-40/50', G.total.correctCount === 40 && G.total.answeredCount === 50 && Math.abs(G.total.proportion - 0.8) < 1e-12);
ok('E0.theta-estimert', G.total.theta !== null && Number.isFinite(G.total.theta) && Array.isArray(G.total.ci95) && G.total.ci95.length === 2);
ok('E0.iqScale-null-ikke-normed', G.total.iqScale === null && G.total.notNormed === true);
ok('E0.skala-g-normalisert-80', { const: (G.scales.find((s) => s.id === 'g') || {}).normalized === 80 }.const, JSON.stringify(G.scales.find((s) => s.id === 'g' || {})));
ok('E0.note-ny-tekst-scoring', G.notes.some((n) => n.id === 'note.gscore.not-normed' && n.no.includes('Wald-intervall') && n.no.includes('ikke-kortest') === false));

/* ---------- render alle 6 kombinasjoner ---------- */
const frames = ['standard', 'personal', 'employer'];
const combos = [];
for (const f of frames) for (const lang of ['no', 'en']) {
  const cfg = CFG(f);
  let r = null, threw = null;
  try { r = renderReport(G, cfg, { lang }); } catch (e) { threw = e; }
  ok(`E1.${f}.${lang}.render-uten-forbud-brudd`, threw === null && r !== null, threw && String(threw.message));
  if (r) combos.push({ f, lang, r });
}
const byKey = (f, lang) => combos.find((c) => c.f === f && c.lang === lang).r;

/* ---------- R1: heading-identitet ---------- */
ok('R1.standard.no.evneresultat', byKey('standard', 'no').html.includes('Ditt evneresultat'));
ok('R1.standard.en.heading', byKey('standard', 'en').html.includes('Your ability-test result'));
ok('R1.personal.no.evneresultat', byKey('personal', 'no').html.includes('Ditt evneresultat'));
ok('R1.employer.heading-uendret', byKey('employer', 'no').html.includes('Resultat — grunnlag for samtale'));

/* ---------- R2: normNote med estimat-sprak + retest ---------- */
ok('R2.standard.no.raatrekk-forklart', byKey('standard', 'no').html.includes('råtrekk (antall riktige svar)'));
ok('R2.standard.en.raatrekk-forklart', byKey('standard', 'en').html.includes('raw count (number of correct answers)'));
ok('R2.standard.no.retest', byKey('standard', 'no').html.includes('En ny gjennomføring kan gi et noe annet estimat'));
ok('R2.personal.no.retest', byKey('personal', 'no').html.includes('Gjentar du testen, kan estimatet bli noe annet'));
ok('R2.employer.no.normnote', byKey('employer', 'no').html.includes('kan ikke brukes til utvelgelse'));

/* ---------- renderer-mekanikk: theta/CI/iqScale uroet ---------- */
ok('E2.theta-vises', byKey('standard', 'no').html.includes('θ ≈'));
ok('E2.ci-vises', byKey('standard', 'no').html.includes('CI95:'));
ok('E2.ingen-IQ-tall', !/IQ\s*[:=]\s*\d/.test(byKey('standard', 'no').html));
ok('E2.iqScale-aldri-i-output', !byKey('employer', 'en').html.toLowerCase().includes('iqscale'));

/* ---------- R4: etikett-troskap + ingen ra id ---------- */
ok('R4.svg.label.no', byKey('standard', 'no').svg.includes(NO_G));
ok('R4.svg.label.en', byKey('standard', 'en').svg.includes(EN_G));
ok('R4.svg.label.employer-no', byKey('employer', 'no').svg.includes(NO_G));
ok('R4.ingen-ra-id-g', !/<text[^>]*>g</.test(byKey('standard', 'no').svg) && !/<text[^>]*>g</.test(byKey('employer', 'en').svg));
ok('R4.bar-andel-riktige', byKey('standard', 'no').svg.includes('80 %'));

/* ---------- R3: leseguide + tredjepart med skoping ---------- */
ok('R3.standard.guide.begge-typer', byKey('standard', 'no').html.includes('oppgavetester') && byKey('standard', 'no').html.includes('selvrapportering'));
ok('R3.standard.guide.intelligensmal-beholdt', byKey('standard', 'no').html.includes('ikke et intelligensmål'));
ok('R3.personal.guide.oppgaveutførelse', byKey('personal', 'no').html.includes('Evnetester måler i stedet oppgaveutførelse'));
ok('R3.employer.guide.andelen-riktige', byKey('employer', 'no').html.includes('andelen riktige oppgaver'));
ok('R3.standard.thirdparty.begge-typer', byKey('standard', 'no').html.includes('To typer') || byKey('standard', 'no').html.includes('to typer'));
ok('R3.employer.thirdparty.begge-typer', byKey('employer', 'no').html.includes('evnetester') && byKey('employer', 'no').html.includes('selvrapporteringstester'));
ok('R3.en.guide.intelligence-beholdt', byKey('standard', 'en').html.includes('not a measure of intelligence'));
ok('R3.en.employer.guide.taskshare', byKey('employer', 'en').html.includes('share of tasks answered correctly'));

/* ---------- employer-lag ---------- */
ok('E3.employer.convbasis.evne-skop', byKey('employer', 'no').html.includes('For evnetester er det råtrekk og estimater fra denne testens oppgavesett'));
ok('E3.employer.convbasis.selvportrett-beholdt', byKey('employer', 'no').html.includes('les resultatet som et selvportrett'));
ok('E3.employer.convbasis.en', byKey('employer', 'en').html.includes('GROUNDWORK FOR A CONVERSATION'));
ok('E3.employer.gpar.oppdatert', byKey('employer', 'no').html.includes('antall riktige svar og estimert evnenivå'));

/* ---------- R5: engine-note ---------- */
ok('R5.note.noWald', byKey('standard', 'no').html.includes('Wald-intervall (±1,96·SE)'));
ok('R5.note.wald-en', byKey('standard', 'en').html.includes('Wald interval (±1.96·SE)'));
ok('R5.note.gjenoppgitt-borte', !combos.some((c) => c.r.html.includes('Gjenoppgitt ikke-kortest')));
ok('R5.employer.note-paraphrase', byKey('employer', 'no').html.includes('note.gscore.not-normed') && byKey('employer', 'no').html.includes('ikke et normert måltall'));
ok('R5.employer.note-ikke-raa', !byKey('employer', 'no').html.includes('normdata fra normerings-endpointen'));

/* ---------- degenerat-honesthet: alle riktige -> theta null -> ingen fabrikk ---------- */
const resAll = scoreTest(defNo, makePayload(defNo, 'no', 'all'), { allowPartial: false });
ok('E4.alle-feil-theta-null', resAll.result.total.theta === null && resAll.result.total.ci95 === null);
ok('E4.warning-tegn', resAll.warnings.some((w) => /theta kan ikke estimeres/.test(w)));
const rAll = renderReport(resAll.result, CFG('standard'), { lang: 'no' });
ok('E4.render-uten-theta-ci', !rAll.html.includes('θ ≈') && !rAll.html.includes('CI95:') && !rAll.html.includes('θ ≈ null'));
ok('E4.raatrekk-0/50-vises', rAll.html.includes('0/50'));

/* ---------- struktur: strings + meta ---------- */
ok('E5.strings-nonempty', combos.every((c) => c.r.strings.length > 4 && c.r.strings.every((s) => typeof s === 'string' && s.trim().length > 0)));
ok('E5.employer-scans-logget', combos.filter((c) => c.f === 'employer').every((c) => (c.r.meta.scans || []).some((sc) => sc.scope === 'employer.all-strings' && sc.violations === 0)));

console.log(`\nE-HARNESS ${pass} PASS / ${failures.length} FAIL`);
if (failures.length) process.exit(1);
