/**
 * [VERIFISER FASE 3] Evneresultattekst: hvert estimat-ord kontroll mot beslutning 14.
 * Uavhengig verifier (søster til _fase3_gscore_verify.mjs): leser ALLE rendret
 * evne-tekst-strenger (6 rammekonfig×språk via ekte scoringpath) og kontrollerer
 * at ingen setning lover mer enn testen holder.
 * Beslutning 14 (operatør, preplan v3 steg #3826): IQ er indikativt estimat — ikke normert,
 * ikke intelligensmål, praksiseffekt erkjent via retest-intervall-tekst, ingen tall
 * eller sertifisering uten målegrunnlag (beslutning-15-disiplin: ingen kvantifisering
 * uten måledata). Forbudspatterns bruker negasjonsvinduer (±60/±70 tegn) — ord som
 * 'validert'/'certified'/'percentile' er tillatt KUN i negert kontekst.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderReport } from '../../report/renderer.mjs';
import { scoreTest } from '../engine/scoring.js';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const CFG = (f) => JSON.parse(readFileSync(`${HERE}../../report/configs/${f}.json`, 'utf8'));
const DEF = (f) => JSON.parse(readFileSync(`${HERE}evne_pool/${f}`, 'utf8'));

let pass = 0; const failures = [];
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`PASS ${name}`); }
  else { failures.push(name); console.log(`FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

function makePayload(def, lang, mode) {
  const answers = {};
  def.items.forEach((item, i) => {
    const variant = item.variants.find((v) => v.lang === lang) || item.variants[0];
    const isWrong = mode === 'all-wrong' || (mode === 'every5' && i % 5 === 0);
    const idx = isWrong ? (variant.correctIndex + 1) % variant.options.length : variant.correctIndex;
    answers[item.id] = { kind: 'ability', lang, abilityOriginalIndex: idx };
  });
  return {
    testId: def.id, lang, itemIds: def.items.map((i) => i.id),
    startedAt: 0, finishedAt: 1000, timeSpentSec: 61, expired: false, answers,
  };
}

const defNo = DEF('def-evne-t1-matrise.no.json');
const res = scoreTest(defNo, makePayload(defNo, 'no', 'every5'), {});
if (!res.ok) throw new Error('scoring feilet: ' + JSON.stringify(res.errors));

const combos = [];
for (const f of ['standard', 'personal', 'employer']) for (const lang of ['no', 'en']) {
  const r = renderReport(res.result, CFG(f), { lang });
  combos.push({ f, lang, r });
}
const byKey = (f, lang) => combos.find((c) => c.f === f && c.lang === lang).r;

/* ---------- V1: estimat-språk er til stede i alle 6 ---------- */
for (const { f, lang, r } of combos) {
  const h = r.html;
  if (lang === 'no') {
    ok(`V1.${f}.no.estimat-ord`, /estimat|estimert/i.test(h), 'mangler estimat-ord');
    ok(`V1.${f}.no.usikkerhet`, /usikkerhetsintervall/i.test(h), 'mangler usikkerhet');
    ok(`V1.${f}.no.raatrekk`, /råtrekk/i.test(h), 'mangler råtrekk');
  } else {
    ok(`V1.${f}.en.estimate-ord`, /estimate|estimated/i.test(h));
    ok(`V1.${f}.en.uncertainty`, /uncertainty/i.test(h));
    ok(`V1.${f}.en.rawCount`, /raw count/i.test(h));
  }
}

/* ---------- V2/3/4 kombinert: forbudsord kun i negert kontekst ---------- */
const neg = (ctx) => /ikke|aldri|not |never |cannot |must not|kan ikke|ingen|intet|No norms|not normed|not compared/i.test(ctx);
const watch = [
  /IQ/g,
  /intelligens|intelligence/gi,
  /persentil|percentile/gi,
  /validert|validated/gi,
  /certifi|sertifis/gi,
  /Mensa/gi,
  /måler godt|good measure|kan måle/gi,
  /[+±]\s?\d+\s?(IQ|poeng)/g,  // talllovnad — beslutning-15-disiplin
  /IQ[- ]?\d/g,
];
for (const { f, lang, r } of combos) {
  const h = r.html;
  for (const pat of watch) {
    for (const m of h.matchAll(pat)) {
      const a = Math.max(0, m.index - 70); const b = Math.min(h.length, m.index + 90);
      const ctx = h.slice(a, b);
      ok(`V3.${f}.${lang}.${pat.source.slice(0, 18)}`, neg(ctx), `ikke-negert treff '${m[0]}': ${ctx}`);
    }
  }
}
ok('V3.watch-skann-kjort', true);

/* ---------- V5: retest-feltet — beslutning 14 kjernen ---------- */
const retestNo = /En ny gjennomføring kan gi et noe annet estimat|Gjentar du testen, kan estimatet bli noe annet|også en ny gjennomføring kan gi noe annet/i;
const retestEn = /Retaking can give|Retaking may yield|A retake can give|retaking can also give/i;
for (const f of ['standard', 'personal', 'employer']) {
  ok(`V5.${f}.no.retest-setning`, retestNo.test(byKey(f, 'no').html), 'mangler retest-erkjennelse (beslutning 14)');
  ok(`V5.${f}.en.retest-setning`, retestEn.test(byKey(f, 'en').html), 'mangler retest-erkjennelse (beslutning 14)');
}

/* ---------- V6: identitet + ingen fabrikkert θ + ingen IQ-tall i output ---------- */
ok('V6.standard.no.heading', byKey('standard', 'no').html.includes('Ditt evneresultat'));
ok('V6.personal.no.heading', byKey('personal', 'no').html.includes('Ditt evneresultat'));
ok('V6.employer.no.heading', byKey('employer', 'no').html.includes('Resultat — grunnlag for samtale'));

const resAll = scoreTest(defNo, makePayload(defNo, 'no', 'all-wrong'), {});
const rAll = renderReport(resAll.result, CFG('employer'), { lang: 'no' });
ok('V6.degenerat-uten-theta', !rAll.html.includes('θ ≈') && rAll.html.includes('0/50'));
ok('V6.degenerat-retest-beholdt', retestNo.test(rAll.html));
ok('V6.degenerat-retest-en', retestEn.test(renderReport(resAll.result, CFG('employer'), { lang: 'en' }).html));

/* ---------- V7: labels — aldri rå id 'g' ---------- */
for (const { f, lang, r } of combos) {
  ok(`V7.${f}.${lang}.generell-evne-etikett`, r.html.includes(lang === 'no' ? 'Generell evne (g)' : 'General ability (g)'));
}

console.log(`\nESTIMAT-VERIFISER ${pass} PASS / ${failures.length} FAIL`);
if (failures.length) process.exit(1);
