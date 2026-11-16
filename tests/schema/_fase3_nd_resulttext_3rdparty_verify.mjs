/**
 * [VERIFISER FASE 3] Neurodivergent-resultattekst — STRENG kontroll:
 * ingen setning som kan leses som diagnose eller henvisning fra oss.
 * (søster-leaf til _fase3_nd_resulttext_verify.mjs og til
 *  _fase3_rel_resulttext_3rdparty_verify.mjs — egen vinkel, ikke kopi)
 *
 *   W1 — BRED VOKABULAR-SKANN over alle renderede strenger (5 triage-profiler ×
 *        3 rammer × no/en = 30 renders), termliste vesentlig bredere enn C-kjedens
 *        BANNED (pluss medisin/behandling/symptom/forstyrrelse/syndrom/terapi/
 *        normal/pasient/mensa osv.). Alle treff DUMPES med kontekst
 *        (_fase3_nd_3rdparty_term_dump.json) og klassifiseres deterministisk
 *        (token-vindu + setningsnivå-fallback): påstående treff = FAIL,
 *        negert treff = PASS (alle kontekster håndrefert i rapporten).
 *        Korpus: plain-tekst av FULL html — rendererens strings-sank har
 *        dekningshull (funn F1 under), så strings som korpus hadde gitt falsk trygghet.
 *   W4 — henvis-vokabular nullregulert: alle "henvis-/utredning/referral"-treff
 *        skal ligge i not-referral-disclosureen (den negerte fraskrivelsen), og
 *        henvis-AKSJON ('ta kontakt', 'søk hjelp', 'contact your' …) skal
 *        forekomme 0 ganger — i noen profile, ramme eller språk.
 *   W2 — profilsvarians-invarians: html for «lav» vs «begge» vs midt vs
 *        én-akse-høy skiller seg KUN i skårtallene — alle ikke-numeriske
 *        strenger identiske (bevis: teksten er profil-uavhengig; ingen
 *        profilbetinget formulering kan leses som diagnose).
 *   W3 — meta/def-lekkasjer: nearNotes (meta, FASE 4-utvalgsnotater) og
 *        def.dimensions-beskrivelser dukker ALDRI opp i rendret output.
 *   W5 — profileText er tom i dag ({}) — et profilId-kall SKAL kaste (renderer
 *        nekter å fabrikere tekst); streng kontroll av «aldri oppfinne tekst».
 *   W6 — skannekorpus-størrelse bevist (proven har kraft) + deterministisk orden.
 */
import { renderReport } from '../../report/renderer.mjs';
import { scoreTest } from '../../tests/engine/scoring.js';
import { computeTriageOutcome } from './_nd_triage_model.mjs';
import fs from 'node:fs';

let pass = 0; const failures = [];
const ok = (name, cond, extra = '') => {
  if (cond) pass++;
  else { failures.push(name); console.log(`FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};
const cfgOf = (f) => JSON.parse(fs.readFileSync(new URL(`../../report/configs/${f}.json`, import.meta.url), 'utf8'));
const DEF = JSON.parse(fs.readFileSync(new URL('./nd_pool/def-nd-triage-pool.no.json', import.meta.url), 'utf8'));
const META = JSON.parse(fs.readFileSync(new URL('./nd_pool/_nd_triage_pool_meta.json', import.meta.url), 'utf8'));
const AXIS_BY_ID = Object.fromEntries(META.items.map((m) => [m.id, m.axis]));
const T0 = 1_700_000_000_000;
const mkPayload = (valFn) => ({
  testId: DEF.id, lang: 'no', itemIds: DEF.items.map((i) => i.id),
  startedAt: T0, finishedAt: T0 + 60_000, timeSpentSec: 60, expired: false,
  answers: Object.fromEntries(DEF.items.map((i) => [i.id, { kind: 'likert', lang: 'no', value: valFn(i) }])),
});

/* 5 profiler: triage-modellens fire utfall + midt (OBSERVED-området 40–54) */
const PROFILER = [
  { tag: 'lav', val: () => 1, expect: 'out-none' },
  { tag: 'midt', val: () => 3, expect: 'out-none' },
  { tag: 'adhd-hoy', val: (i) => (AXIS_BY_ID[i.id] === 'adhd' ? 5 : 1), expect: 'out-adhd' },
  { tag: 'autism-hoy', val: (i) => (AXIS_BY_ID[i.id] === 'autism' ? 5 : 1), expect: 'out-autism' },
  { tag: 'begge', val: () => 5, expect: 'out-adhd-autism' },
];

const RENDER = [];
for (const P of PROFILER) {
  const scored = scoreTest(DEF, mkPayload(P.val));
  for (const f of ['standard', 'personal', 'employer']) for (const lang of ['no', 'en']) {
    ok(`W0.${P.tag}.score`, scored.ok === true, (scored.errors || []).join('; '));
  }
  if (!scored.ok) continue;
  const s = Object.fromEntries(scored.result.scales.map((sc) => [sc.id, sc.normalized]));
  const tri = computeTriageOutcome(s);
  ok(`W0.triage-${P.tag}`, tri.ok === true && tri.outcode === P.expect, `${tri.outcode}`);
  RENDER.push({ tag: P.tag, result: scored.result });
}

const collect = (result) => {
  const rows = [];
  for (const f of ['standard', 'personal', 'employer']) for (const lang of ['no', 'en']) {
    const out = renderReport(result, cfgOf(f), { lang });
    for (const s0 of out.strings) rows.push({ fl: `${f}.${lang}`, s: String(s0) });
  }
  return rows;
};

/* ---------- W1: bred vokabular-skann, deterministisk negasjonsklassifisering ---------- */
const TERMS = [
  'diagnos', 'diagnosis', 'diagnosed', 'diagnostic',
  'henvis', 'henvise', 'henvisning', 'referral', 'referert',
  'utredning', 'assessment', 'assessed', 'evaluering',
  'klinisk', 'clinical', 'clinic',
  'medisin', 'medic', 'behandling', 'treatment', 'therap', 'terapi',
  'symptom', 'syndrom', 'disorder', 'forstyrrelse', 'lidelse',
  'pasient', 'patient', 'psykologisk vurdering', 'psychological assessment', 'vurdering av en person', 'diagnostiser',
  'persentil', 'prosentil', 'percentile', 'iq', 'mensa',
  'normal', 'abnormal', 'suffer', 'mild', 'moderat', 'alvorlig', 'severity',
  'sindssyg', 'helsepersonell',
];
const SENT_SPLIT = /(?<=[.!?;])\s+|\s+[-\u2014]\s+/;
const NEGATORS = /\b(ikke|aldri|never|ingen|not|no|intet)\b/i;
const NEG_WINDOW = /\b(ikke|aldri|not|never|ingen|intet)\s+(\S+\s+){0,3}$/i;

/* KORPUS: plain-tekst av FULL rendret html (strip tags) — ikke rendererens strings
 * sank. Bakgrunn (funn F1, dette steget): strings-sanken har dekningshull
 * (push tar kun et argument; leseguide-body, thirdParty.body og SVG-etiketter
 * mangler i strings.list) — kontroll-skann over plain-html er fulldekkende og
 * er samme metode som soester-harnessene (rel-3rdparty V4, nd C-harness V4). */
const plainOf = (result) => {
  const rows = [];
  for (const f of ['standard', 'personal', 'employer']) for (const lang of ['no', 'en']) {
    const html = renderReport(result, cfgOf(f), { lang }).html;
    rows.push({ fl: `${f}.${lang}`, s: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), raw: html });
  }
  return rows;
};

const dump = [];
for (const { tag, result } of RENDER) {
  for (const { fl, s } of plainOf(result)) {
    const low = s.toLowerCase();
    for (const t of TERMS) {
      let idx = low.indexOf(t);
      if (idx === -1) continue;
      const hits = [];
      while (idx !== -1) {
        const chunks = s.split(SENT_SPLIT);
        for (const ch of chunks) {
          const cl = ch.toLowerCase();
          if (!cl.includes(t)) continue;
          /* token-vindu: negatør ≤ 60 tegn (≤4 ord) foran treffet, ELLER negatør
             i setningen (setningsnivå-fallback: enumerasjoner og klausul-negasjoner) */
          const pos = cl.indexOf(t);
          const pre = cl.slice(Math.max(0, pos - 60), pos);
          const neg = NEG_WINDOW.test(pre) || NEGATORS.test(ch);
          hits.push(neg);
        }
        idx = low.indexOf(t, idx + t.length);
      }
      /* én term kan gi flere chunk-treff per streng; hits.length >= antall forekomster er ok —
         kravet er: alle klassifiserte hits er negert */
      const nHits = hits.length;
      const allNeg = nHits > 0 && hits.every((h) => h === true);
      ok(`W1.${tag}.${fl}.term-${t.replace(/\W+/g, '_')}`, allNeg, `påstående forekomst i: ${s.slice(0, 140)}`);
      dump.push({ profile: tag, frame_lang: fl, term: t, nHits, allNeg, string: s });
    }
  }
}
ok('W1.term-treff-fantes', dump.length > 0, 'termlisten traff ingenting — skann uten kraft');

fs.writeFileSync(new URL('./_fase3_nd_3rdparty_term_dump.json', import.meta.url),
  JSON.stringify({ meta: { date: '2026-11-16', renders: RENDER.length * 6, terms: TERMS.length, allNegatedOnly: dump.every((d) => d.allNeg) },
    hits: dump.sort((a, b) => (a.term + a.frame_lang).localeCompare(b.term + b.frame_lang)) }, null, 1));

/* ---------- W4: henvis-vokabular kun i fraskrivelsen; henvis-aksjon 0 treff ---------- */
const disclosureCarrier = (s) => s.includes('aldri en henvisning') || s.includes('never a referral');
for (const t of ['henvis', 'henvisning', 'referral', 'utredning']) {
  const rows = dump.filter((d) => d.term === t);
  ok(`W4.henvistreff-antall:${t}`, rows.length > 0, 'term aldri rendret — W4-proven haver');
  ok(`W4.henvis-vokabular-kun-i-fraskrivelse:${t}`, rows.every((d) => disclosureCarrier(d.string)),
    JSON.stringify(rows.filter((d) => !disclosureCarrier(d.string)).slice(0, 2)));
}
const ACTION = ['ta kontakt', 'kontakt lege', 'kontakt helse', 'kontakt din', 'søk hjelp', 'søke hjelp',
  'seek help', 'seek support', 'contact a', 'contact your', 'contact healthcare',
  'henvises til', 'referred to', 'we recommend', 'vi anbefaler', 'oppfordrer', 'bør ta'];
const allStrings = [];
for (const tag of ['lav', 'midt', 'begge']) {
  const r = RENDER.find((x) => x.tag === tag);
  for (const { s } of plainOf(r.result)) allStrings.push(s);
}
for (const a of ACTION) {
  const hit = allStrings.find((s) => s.toLowerCase().includes(a));
  ok(`W4.aksjon-null:${a.replace(/\s+/g, '-')}`, hit === undefined, hit && hit.slice(0, 140));
}

/* ---------- W2: profil-svarians invarians — teksten skiller seg bare i tall ---------- */
/* W2 korpus: plain html UTEN svg — barerekkefoelgen er config-styrt sortering
 * (personal-rammen sorterer desc paa skaar; ADHD/Autisme bytter plass mellom
 * profiler deterministisk) og er ikke tekstlagets innhold. SVG-etikettene er
 * allerede innholdskontrollert i W1 over full korpus. */
const stringsOf = (result) => plainOf(result).map((r) => r.raw.replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/\s+/g, ' ').trim());
const normStr = (s) => s.replace(/\d+\s?%/g, '%').replace(/\d+/g, '#');
const bag = (arr) => arr.map(normStr).sort().join('|||');
const lavS = stringsOf(RENDER.find((r) => r.tag === 'lav').result);
const beggeS = stringsOf(RENDER.find((r) => r.tag === 'begge').result);
const adhiS = stringsOf(RENDER.find((r) => r.tag === 'adhd-hoy').result);
const autiS = stringsOf(RENDER.find((r) => r.tag === 'autism-hoy').result);
const midS = stringsOf(RENDER.find((r) => r.tag === 'midt').result);
ok('W2.lav-vs-begge.tekst-identisk', bag(lavS) === bag(beggeS));
ok('W2.lav-vs-adhd-hoy.tekst-identisk', bag(lavS) === bag(adhiS));
ok('W2.lav-vs-autism-hoy.tekst-identisk', bag(lavS) === bag(autiS));
ok('W2.lav-vs-midt.tekst-identisk', bag(lavS) === bag(midS));
ok('W2.proven-ikke-tom', normStr(lavS[0] || 'x') !== '' && lavS.length === 6, `lavS.length=${lavS.length}`);
/* W2b: ADHD/Autisme-swap mellom adhd-hoy/autism-hoy skal forekomme KUN i
 * personal-rammen (sort=desc, skaarstyrt), aldri i standard/employer (sort=def) */
const swapProbe = (frame) => {
  const g = (res) => plainOf(res).find((r) => r.fl === frame + '.no').raw.match(/<svg[\s\S]*?<\/svg>/) || [''];
  const a = g(RENDER.find((r) => r.tag === 'adhd-hoy').result)[0];
  const b = g(RENDER.find((r) => r.tag === 'autism-hoy').result)[0];
  const ai = a.indexOf('ADHD'), bi = b.indexOf('ADHD');
  return ai !== -1 && bi !== -1 && a.indexOf('Autisme') !== -1 && b.indexOf('Autisme') !== -1 && ai !== bi;
};
ok('W2b.swap-kun-i-personal', swapProbe('personal') && !swapProbe('standard') && !swapProbe('employer'),
  'etikett-swap monstret avviker fra config-sort-kontrakten');

/* ---------- W3: meta/def-lekkasjer ---------- */
const metaStrings = (obj, out = []) => {
  if (Array.isArray(obj)) { obj.forEach((o) => metaStrings(o, out)); return out; }
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string' && v.length > 25 && (k.toLowerCase().includes('near') || k.toLowerCase().includes('asrs'))) out.push(v);
      else metaStrings(v, out);
    }
  }
  return out;
};
const NEAR = [...new Set(metaStrings(META))].filter((s) => s.startsWith('Anker') || s.startsWith('ASRS') || s.startsWith('Enkelte'));
ok('W3.nearNotes-fantes-i-meta', NEAR.length > 0, 'meta-mønstret endret — W3-proven haver, re-les');
const DEF_DESCS = DEF.dimensions.map((d) => d.description);
ok('W3.defBeskrivelser-fantes', DEF_DESCS.length === 2);
const combinedHtml = RENDER.map((r) => [
  renderReport(r.result, cfgOf('standard'), { lang: 'no' }).html,
  renderReport(r.result, cfgOf('standard'), { lang: 'en' }).html,
  renderReport(r.result, cfgOf('personal'), { lang: 'no' }).html,
  renderReport(r.result, cfgOf('personal'), { lang: 'en' }).html,
  renderReport(r.result, cfgOf('employer'), { lang: 'no' }).html,
  renderReport(r.result, cfgOf('employer'), { lang: 'en' }).html,
].join('')).join('');
for (const s0 of NEAR) ok(`W3.ingen-nearnote-lekkasje:${s0.slice(0, 26)}`, !combinedHtml.includes(s0.slice(0, 40)), 'nearNote-lekkasje i rendret html');
for (const s0 of DEF_DESCS) ok(`W3.ingen-defBeskrivelse-lekkasje:${s0.slice(0, 26)}`, !combinedHtml.includes(s0.slice(0, 40)), 'def-beskrivelse-lekkasje i rendret html');

/* ---------- W5: profileText tom => profileId-kall SKAL kaste ---------- */
{
  const cfg = cfgOf('standard');
  ok('W5.profileText-tom-i-dag', Object.keys(cfg.profileText || {}).length === 0, 'profileText ikke lenger tom — FASE 4 har landet, da re-les denne');
  let threw = false;
  try { renderReport(RENDER[0].result, cfg, { lang: 'no', profileId: 'adhd-high' }); } catch { threw = true; }
  ok('W5.profileId-kaster-paa-tom-config', threw, 'renderer lagde tekst på egen hånd');
}

/* ---------- W6: korpus-størrelse (skannen har kraft) ---------- */
ok('W6.korpus-storre', allStrings.length === 18, `allStrings.length=${allStrings.length}`);
/* 3 profiler x 6 ramme-spraak-rows; total tegn bevist under */
ok('W6.korpus-tegn', allStrings.join('').length > 15000, `korpus tegn=${allStrings.join('').length}`);
ok('W6.renders-alle', RENDER.length === 5, `RENDER.length=${RENDER.length}`);

/* ---------- oppsummering ---------- */
console.log(`_fase3_nd_resulttext_3rdparty_verify: ${pass} PASS / ${failures.length} FAIL (renders=${RENDER.length}x6, terms=${TERMS.length}, dump-hits=${dump.length})`);
if (failures.length) { console.log('FAILURES:', failures.join(', ')); process.exit(1); }
