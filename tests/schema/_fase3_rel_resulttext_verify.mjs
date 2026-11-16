/**
 * [3-VEIS] FASE 3: Resultattekst relasjoner — tredjepartslesbarhet (C-harness, todo-run-søster).
 * Kjede: A = config-les + renderer-les, B = whitelistet parse-redigering + full regresjon,
 * C = denne deterministiske verifiseringen.
 * Ekte scoringpath: konstruert def-rel-16-fixture (4 rel-dims, likert 1–5, én revers per dim,
 * norms none) -> scoreTest med uniform midt-svar (3 på alle 16) -> hver skala nøyaktig 50,
 * kompositt 50 -> renderReport alle 3 rammekonfiger x no/en.
 * Låser: etikett-troskap (rel-dims no/en), ingen rå dim-id, persentil-formen,
 * enumerasjon (relasjoner som selvrapporteringstype), employer-samtalegrunnlag,
 * engine-note verbatim i standard/personal, forbudsord-ren.
 * Kjør: node tests/schema/_fase3_rel_resulttext_verify.mjs
 */
import { renderReport } from '../../report/renderer.mjs';
import { scoreTest } from '../engine/scoring.js';

let pass = 0; const failures = [];
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`PASS ${name}`); }
  else { failures.push(name); console.log(`FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

/* ---------- def-rel-16-fixture (mønster: fixture-trait-big5) ---------- */
const DIMS = [
  { id: 'closeness',    items: ['cl', 'Nærhet'] },
  { id: 'openness',     items: ['op', 'Åpenhet'] },
  { id: 'conflict',     items: ['cf', 'Konflikthåndtering'] },
  { id: 'independence', items: ['iv', 'Selvstendighet'] },
];
const OPTS5 = [
  { label: 'Helt uenig', value: 1 }, { label: 'Litt uenig', value: 2 }, { label: 'Nøytral', value: 3 },
  { label: 'Litt enig', value: 4 }, { label: 'Helt enig', value: 5 },
];
const TEXTS = {
  cl: ['Jeg føler meg nær de jeg er glad i.', 'Det er viktig for meg å dele tanker med folk jeg står nær.',
       'Jeg trekker meg unna når noen kommer for nær.', 'Nærhet i relasjoner gjør meg ukomfortabel.'],
  op: ['Jeg snakker åpent om følelsene mine.', 'Jeg forteller kjære om hvordan dagen min har vært.',
       'Jeg holder tanker for meg selv.', 'Jeg stenger ute samtaler om det personlige.'],
  cf: ['Jeg tar konflikter opp direkte.', 'Jeg prøver å løse uenighet i stedet for å vente den ut.',
       'Jeg skynder meg bort fra uenighet.', 'Jeg lar konflikter ligge til de forsvinner.'],
  iv: ['Jeg tar egne valg i forholdet.', 'Jeg står på mine egne behov i samliv.',
       'Jeg lar andre bestemme for meg.', 'Jeg ofrer egne behov for ro i forholdet.'],
};
const items = [];
for (const { id, items: [pre] } of DIMS) {
  TEXTS[pre].forEach((text, i) => {
    items.push({
      id: `r-${pre}-${String(i + 1).padStart(2, '0')}`,
      kind: 'likert', lang: 'no', text, options: OPTS5,
      scales: [{ id, sign: i < 2 ? 1 : -1 }],
    });
  });
}
const def = {
  schemaVersion: 1, id: 'rel-16-fixture', type: 'pool', family: 'relations', languages: ['no'],
  scoring: { type: 'trait', traits: DIMS.map((d) => ({ id: d.id, weight: 1 })), norms: 'none' },
  dimensions: DIMS.map(({ id, items: [_, label] }) => ({ id, label, labelLanguage: 'no', description: 'Relasjonssporet-def-fixture (ikke en ekte test).' })),
  items,
};

/* ---------- ekte scoringpath: uniform midt-svar => alle skalaer 50 ---------- */
const T0 = 1_700_000_000_000;
const payload = {
  testId: def.id, lang: 'no', itemIds: def.items.map((i) => i.id),
  startedAt: T0, finishedAt: T0 + 60_000, timeSpentSec: 60, expired: false,
  answers: Object.fromEntries(def.items.map((i) => [i.id, { kind: 'likert', lang: 'no', value: 3 }])),
};
const scored = scoreTest(def, payload);
ok('E0.score-ok', scored.ok === true, JSON.stringify((scored.errors || []).slice(0, 2)));
const S = scored.result.scales;
ok('E0.fire-skalaer', S.length === 4);
ok('E0.alle-50', S.every((s) => s.normalized === 50), JSON.stringify(S.map((s) => s.normalized)));
ok('E0.kompositt-50', scored.result.total.composite === 50, String(scored.result.total.composite));
ok('E0.note-trait-finnes', scored.result.notes.some((n) => n.id === 'note.trait.not-normed'));

/* ---------- render alle 6 kombinasjoner ---------- */
const frames = ['standard', 'personal', 'employer'];
const combos = [];
for (const f of frames) for (const lang of ['no', 'en']) {
  const fs = await import('node:fs');
  const cfg = JSON.parse(fs.readFileSync(new URL(`../../report/configs/${f}.json`, import.meta.url), 'utf8'));
  let r = null, threw = null;
  try { r = renderReport(scored.result, cfg, { lang }); } catch (e) { threw = e; }
  ok(`E1.${f}.${lang}.render-uten-forbud-brudd`, threw === null && r !== null, threw && String(threw.message));
  if (r) combos.push({ f, lang, r });
}
const byKey = (f, lang) => combos.find((c) => c.f === f && c.lang === lang).r;

/* ---------- R1: etikett-troskap + ingen rå dim-id ---------- */
const LABELS = {
  no: { closeness: 'Nærhet', openness: 'Åpenhet', conflict: 'Konflikthåndtering', independence: 'Selvstendighet' },
  en: { closeness: 'Closeness', openness: 'Openness', conflict: 'Conflict handling', independence: 'Independence' },
};
for (const { f, lang, r } of combos) {
  for (const [id, label] of Object.entries(LABELS[lang])) {
    ok(`R1.${f}.${lang}.${id}-etikett`, r.svg.includes(label), `mangler '${label}' (renderer ville vist rå id '${id}')`);
  }
  for (const id of ['closeness', 'openness', 'conflict', 'independence']) {
    ok(`R1.${f}.${lang}.ingen-raa-id-${id}`, !r.svg.includes(`>${id}<`));
  }
}

/* ---------- R2: tredjepartsleseren får korrekt enumerasjon ---------- */
ok('R2.standard.no.thirdparty-enum', byKey('standard', 'no').html.includes('selvrapportering (personlighet, relasjoner, triage:'));
ok('R2.standard.en.thirdparty-enum', byKey('standard', 'en').html.includes('self-report (personality, relations, triage:'));
ok('R2.personal.no.thirdparty-enum', byKey('personal', 'no').html.includes('For selvrapporteringstester (personlighet, relasjoner, triage)'));
ok('R2.personal.en.thirdparty-enum', byKey('personal', 'en').html.includes('For self-report tests (personality, relations, triage)'));
ok('R2.employer.no.conversation-enum', byKey('employer', 'no').html.includes('For selvrapporteringstester (personlighet, relasjoner, triage) har den testede svart om seg selv'));
ok('R2.employer.en.conversation-enum', byKey('employer', 'en').html.includes('For self-report tests (personality, relations, triage), the test-taker answered about themselves'));

/* ---------- R3: persentil-formen (NAOB 2026-11-16) — old form utryddet, rett form til stede ---------- */
for (const { f, lang, r } of combos) {
  ok(`R3.${f}.${lang}.ingen-prosentil`, !r.html.toLowerCase().includes('prosentil'), "'prosentil' i rendret output");
  if (lang === 'no') ok(`R3.${f}.no.persentil-form-i-disclosure`, r.html.includes('ikke persentiler'), 'disclosure mangler rettet form');
}

/* ---------- R4: enumerasjon — relasjoner er selvrapporteringstype ---------- */
ok('R4.standard.no.enum', byKey('standard', 'no').html.includes('(personlighet, relasjoner, triage)'));
ok('R4.standard.en.enum', byKey('standard', 'en').html.includes('(personality, relations, triage)'));

/* ---------- R5: engine-note verbatim i standard/personal (samme rute som trait-noter) ---------- */
ok('R5.standard.no.note-verbatim', byKey('standard', 'no').html.includes('prosent av skala-omfang, ikke persentiler'));
ok('R5.personal.en.note-verbatim', byKey('personal', 'en').html.includes('percent of scale range, not percentiles'));

/* ---------- R6: employer-samtalegrunnlag + scanBanned negert kontekst (søster-metoden) ---------- */
ok('R6.employer.no.samtalegrunnlag', byKey('employer', 'no').html.includes('GRUNNLAG FOR SAMTALE'));
ok('R6.employer.en.groundwork', byKey('employer', 'en').html.includes('GROUNDWORK FOR A CONVERSATION'));
const neg = (ctx) => /ikke|aldri|not |never |cannot |must not|kan ikke|ingen|intet|no /i.test(ctx);
const CH = (s) => s.split(/(?<=[.!?;:])\s+/);
const forbidden = { no: ['ansettelse', 'utvelgelse', 'shortlist', 'kandidat'], en: ['hiring', 'selection', 'candidate'] };
for (const { f, lang, r } of combos) {
  const terms = forbidden[lang];
  const chunks = CH(r.html);
  let bad = null;
  for (const chunk of chunks) {
    for (const term of terms) {
      let idx = chunk.toLowerCase().indexOf(term);
      if (idx === -1) continue;
      const ctx = chunk.slice(Math.max(0, idx - 70), idx + 90);
      if (!neg(ctx)) { bad = `${term}: …${ctx}…`; }
    }
  }
  ok(`R6.${f}.${lang}.forbud-negert`, bad === null, `ikke-negert forbudsord: ${bad ?? ''}`);
}

/* ---------- R7: midtpunkt-grafen ærlig ved uniform 50 ---------- */
ok('R7.midtpunktstreken', byKey('standard', 'no').svg.includes('stroke-dasharray') && byKey('standard', 'no').svg.includes('skalaens midtpunkt'));
ok('R7.uniform-50-ingen-bar-kravleggende', !/<tspan[^>]*>(prosentil|persentil)/i.test(byKey('standard', 'no').svg));

console.log(`\nREL-RESULTATTEKST ${pass} PASS / ${failures.length} FAIL`);
if (failures.length) { console.log('FAILURES:', failures.join(', ')); process.exit(1); }
