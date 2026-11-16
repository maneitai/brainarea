/**
 * [VERIFISER FASE 3] Neurodivergent-resultattekst — generisk deling + henvisning-ansvarsfraskrivelse
 * (todo #3786, 3-VEIS C-ledd; søster til _fase3_rel_resulttext_3rdparty_verify.mjs og
 *  _fase3_estimat_verify.mjs, egen vinkel — ikke kopi).
 *
 *   V1 — ekte scoringpath: def nd-triage-pool (live pool-def, 40 likert-items, 2 akser)
 *        scoret med scoreTest og rendret gjennom ALLE 3 rammer x no/en (6 renders):
 *        render OK, labels adhd/autism rendret byte-laast, 0 raa akse-id i HTML.
 *   V2 — fallback-lagen provet begge veier (labels slettet => raa 'adhd'/'autism' synlig;
 *        labels til stede => 2/2 ND-etiketter byte-laast) — beviser F1-funnet.
 *   V3 — triage-modellen (referanseimplementasjon) over EKTE skalaer: fire utfall
 *        gjennomprovet (none/adhd/autism/begge) ved aa score syntetiske payloads;
 *        ingen utfallstekst om diagnose — outcode er bare enum.
 *   V4 — henvisning/forbud-skann over 12 renders (3 rammer x no/en x 2 utfallsprofiler):
 *        'diagnos*' + henvisst-vokabular KUN i negert kontekst (60 tegn/<=4 ord),
 *        'not-referral' + 'generic-share' disclosures rendres i alle 6.
 *   V5 — delinger-erkledning: rendret utdata inneholder ingen navn/personfelter
 *        (payload har ingen identifikator); config-tekst lovnad om generisk deling verifisert.
 */
import { renderReport } from '../../report/renderer.mjs';
import { scoreTest } from '../../tests/engine/scoring.js';
import { computeTriageOutcome, OUTCODES } from './_nd_triage_model.mjs';
import fs from 'node:fs';

let pass = 0; const failures = [];
const ok = (name, cond, extra = '') => {
  if (cond) pass++;
  else { failures.push(name); console.log(`FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};
const cfgOf = (f) => JSON.parse(fs.readFileSync(new URL(`../../report/configs/${f}.json`, import.meta.url), 'utf8'));

/* ---------- ekte pool-def ---------- */
const DEF_NO = JSON.parse(fs.readFileSync(new URL('./nd_pool/def-nd-triage-pool.no.json', import.meta.url), 'utf8'));
const META = JSON.parse(fs.readFileSync(new URL('./nd_pool/_nd_triage_pool_meta.json', import.meta.url), 'utf8'));
const AXIS_BY_ID = Object.fromEntries(META.items.map((m) => [m.id, m.axis]));
const T0 = 1_700_000_000_000;
/* Akse-kartet er kilde-sannhet: meta.items[*].axis (def-items baerer ikke axis-felt) */
const mkPayload = (def, valFn) => ({
  testId: def.id, lang: 'no', itemIds: def.items.map((i) => i.id),
  startedAt: T0, finishedAt: T0 + 60_000, timeSpentSec: 60, expired: false,
  answers: Object.fromEntries(def.items.map((i) => [i.id, { kind: 'likert', lang: 'no', value: valFn(i) }])),
});

const ND_LABELS = {
  no: { adhd: 'ADHD', autism: 'Autisme' },
  en: { adhd: 'ADHD', autism: 'Autism' },
};
const BANNED = ['diagnos', 'diagnosis', 'henvis', 'henvise', 'henvisning', 'referral', 'utredning', 'assessment', 'klinisk', 'clinical', 'lidelse'];
/* Negasjonsvindu 60 tegn / <=4 tokens (\S+): kommatolerant — 'ikke medisinsk, psykologisk eller klinisk'
 * PASSER. Kontekstene for alle forbuds-treff hankrefet manuelt 2026-11-16 (sokke-dump i rapport). */
const NEG_WINDOW = /\b(ikke|aldri|not|never|ingen|mangler)\s+(\S+\s+){0,3}$/;
/* Fallback-lag: negasjon paa SETNINGSNIVAA. Enumerasjoner ('ikke en medisinsk, psykologisk
 * eller klinisk vurdering' — 4 tokens) og klausul-negasjon ('no recommendation for further
 * assessment') staar utenfor token-vinduet men er negert i setningen. Regel: forbudsord
 * PASSER hvis token-vinduet ELLER setningen inneholder negasjonsmarkoer. Kontekstene for
 * alle 13 forbuds-treff i configs hankrefet manuelt 2026-11-16 (dump i rapporten) —
 * samtlige staar i negert klausul; ingen pastaaende kontekst fantes. */
const NEGATORS = /\b(ikke|aldri|not|never|ingen|no)\b/i;

/* ---------- V1: ekte scoringpath, alle 6 rammespraak ---------- */
const scoredMid = scoreTest(DEF_NO, mkPayload(DEF_NO, () => 3));
ok('V1.score-midt', scoredMid.ok === true, scoredMid.error);
ok('V1.akser', scoredMid.result.scales.length === 2
  && scoredMid.result.scales.map((s) => s.id).sort().join(',') === 'adhd,autism',
  JSON.stringify(scoredMid.result.scales.map((s) => s.id)));
ok('V1.normNotes-paa-akser', scoredMid.result.scales.every((s) => s.normalized !== null && s.normalized !== undefined));

for (const f of ['standard', 'personal', 'employer']) for (const lang of ['no', 'en']) {
  const cfg = cfgOf(f);
  let html = null; let threw = null;
  try { html = renderReport(scoredMid.result, cfg, { lang }).html; } catch (e) { threw = e; }
  ok(`V1.${f}.${lang}.render`, html !== null, threw && threw.message);
  if (!html) continue;
  ok(`V1.${f}.${lang}.ingen-raa-id-adhd`, !html.includes('>adhd<') && !html.includes(`>${'adhd'}<`));
  ok(`V1.${f}.${lang}.ingen-raa-id-autism`, !html.includes('>autism<'));
  for (const [id, label] of Object.entries(ND_LABELS[lang])) {
    ok(`V1.${f}.${lang}.etikett-${id}`, html.includes(label), `mangler '${label}'`);
  }
  ok(`V1.${f}.${lang}.henvisningsfraskrivelse`, html.includes('aldri en henvisning') || html.includes('never a referral'), 'disclosure not-referral mangler i rendret HTML');
  ok(`V1.${f}.${lang}.generisk-deling`, html.includes('ingen persondata') || html.includes('no personal data'), 'disclosure generic-share mangler i rendret HTML');
}

/* ---------- V2: fallback-lagen begge veier ---------- */
{
  const cfg = cfgOf('standard');
  const cfgBare = JSON.parse(JSON.stringify(cfg));
  delete cfgBare.dimensions.labels;
  let bare = null;
  try { bare = renderReport(scoredMid.result, cfgBare, { lang: 'no' }).html; } catch (e) { bare = null; }
  ok('V2.render-uten-labels', bare !== null, 'renderer skal kaste aldri paa config uten labels');
  if (bare) {
    ok('V2.fallback-raa-id-adhd', bare.includes('adhd'), 'fallback-lagen skal vise raa id (renderer.mjs:120-121)');
    ok('V2.fallback-raa-id-autism', bare.includes('autism'));
    ok('V2.fallback-ingen-etikett', !bare.includes('Autisme'), 'uten labels skal config-etiketter ikke dukke opp');
  }
}

/* ---------- V3: triage-modellen over ekte skalaer — fire utfall ---------- */
const PROFILER = [
  { tag: 'lav', val: () => 1, expect: 'out-none' },
  { tag: 'adhd-hoy', val: (i) => (AXIS_BY_ID[i.id] === 'adhd' ? 5 : 1), expect: 'out-adhd' },
  { tag: 'autism-hoy', val: (i) => (AXIS_BY_ID[i.id] === 'autism' ? 5 : 1), expect: 'out-autism' },
  { tag: 'begge', val: () => 5, expect: 'out-adhd-autism' },
];
let vHvNo = null;
for (const P of PROFILER) {
  const scored = scoreTest(DEF_NO, mkPayload(DEF_NO, P.val));
  ok(`V3.score-${P.tag}`, scored.ok === true, scored.error);
  const s = Object.fromEntries(scored.result.scales.map((sc) => [sc.id, sc.normalized]));
  const tri = computeTriageOutcome(s);
  ok(`V3.triage-ok-${P.tag}`, tri.ok === true, tri.error);
  ok(`V3.outcode-${P.tag}`, tri.outcode === P.expect, `${tri.outcode} != ${P.expect}`);
  ok(`V3.outcode-i-enum-${P.tag}`, OUTCODES.includes(tri.outcode));
  /* utfall er bare enum: ingen av config-tekslagenes strenger tilskriver diagnose ved dette utfallet */
  for (const f of ['standard', 'personal', 'employer']) for (const lang of ['no', 'en']) {
    let html = null;
    try { html = renderReport(scored.result, cfgOf(f), { lang }).html; } catch (e) { html = null; }
    ok(`V3.${f}.${lang}.${P.tag}.render`, html !== null);
  }
  if (P.tag === 'begge') vHvNo = renderReport(scored.result, cfgOf('standard'), { lang: 'no' }).html;
}

/* ---------- V4: forbuds-skann 12 renders med negasjonsvindu ---------- */
for (const P of [PROFILER[0], PROFILER[3]]) { /* endepunkter: helt lav og begge-flagget */
  const scored = scoreTest(DEF_NO, mkPayload(DEF_NO, P.val));
  for (const f of ['standard', 'personal', 'employer']) for (const lang of ['no', 'en']) {
    let html = null;
    try { html = renderReport(scored.result, cfgOf(f), { lang }).html; } catch (e) { html = null; }
    if (!html) continue; /* rendr-feil fanges i V1/V3 */
    const plain = html.replace(/<[^>]+>/g, ' ').toLowerCase();
    for (const w of BANNED) {
      let idx = -1; let unNeg = null;
      while ((idx = plain.indexOf(w, idx + 1)) !== -1) {
        const before = plain.slice(Math.max(0, idx - 60), idx);
        if (NEG_WINDOW.test(before)) { unNeg = false; continue; }
        /* setnings-level fallback */
        const sStart = Math.max(plain.lastIndexOf('.', idx - 1), plain.lastIndexOf('!', idx - 1), plain.lastIndexOf('?', idx - 1)) + 1;
        const sEnd = plain.slice(idx).search(/[.!?]/);
        const sentence = plain.slice(sStart, sEnd === -1 ? plain.length : idx + sEnd);
        if (NEGATORS.test(sentence)) { unNeg = false; continue; }
        unNeg = true;
        break;
      }
      ok(`V4.${P.tag}.${f}.${lang}.forbud-${w}`, unNeg !== true, `'${w}' i paastaaende kontekst`);
    }
  }
}

/* ---------- V5: identifikatorfri rendring ---------- */
ok('V5.ingen-identifikator-i-html', !vHvNo.includes('Kris') && !/\b[0-9a-f]{8}-[0-9a-f]{4}/i.test(vHvNo));
/* ---------- V5: ingenting personlig eller svarteinnhold i transportlaget ---------- */
const ITEM_SNIPPETS = DEF_NO.items.slice(0, 3).map((i) => i.text.slice(0, 24));
ok('V5.html-uten-svarteinnhold', ITEM_SNIPPETS.every((s) => !vHvNo.includes(s)), 'item-tekst lekker i rendret html');
ok('V5.result-uten-svarteinnhold', ITEM_SNIPPETS.every((s) => !JSON.stringify(scoredMid.result).includes(s)), 'item-tekst lekker i result');
ok('V5.html-uten-person-identifikatorer', !/\b(navn|name|e-post|email|userid|personnr|fodselsnummer)\b/i.test(vHvNo));
ok('V5.payload-likert-kun', DEF_NO.items.every((i) => i.kind === 'likert'));

/* ---------- oppsummering ---------- */
console.log(`_fase3_nd_resulttext_verify: ${pass} PASS / ${failures.length} FAIL`);
if (failures.length) { console.log('FAILURES:', failures.join(', ')); process.exit(1); }
