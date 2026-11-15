/**
 * Brainarea schema-selvtest — IPIP-50 Big Five defs (def-ipip50-big5.no/en.json).
 * [BYGG] FASE 2, todo "Itemspec personlighet: 5 IPIP-dimensjoner, skalaoppsett, alfa-mål."
 *
 * Verifiserer: (1) schema v1-oppfyllelse, (2) render.js validateTestDef-strukturelle gate,
 * (3) keying mot offisiell IPIP scoring key (ipip.ori.org/newBigFive5broadKey.htm):
 *     E 5+/5- (alfa .87), A 6+/4- (.82), C 6+/4- (.79), ES->N speiling 2+/8- off./8+/2- def (.86),
 *     O 7+/3- (.84); (4) håndregnede uniform-scenarier (alle-1/3/5) mot motorens
 *     signerte alternativspenn [p-5m, 5p-m]; (5) ISOMORFI-prov: motorens normaliserte
 *     skår == tradisjonell IPIP-håräkning Σ_+v + Σ_-(6-v) over [p+m, 5p+5m]
 *     (raw er skiftet med -6m; normalisert er identisk til flytende komma).
 *
 * Kjoring: node tests/schema/_ipip50_selftest.mjs   (node >= 20; ajv fra repo node_modules)
 * Kildestatus 2026-11-15: alle itemtekster verbatim fra ipip.ori.org/new_ipip-50-item-scale.htm
 * (public domain: "copy, edit, translate ... without asking permission and without paying a fee").
 * Norsk tekst er egen oversettelse (ingen fullfort offisiell engvik/clearing-house NO-50 finnes
 * som nedlastbar fil); IPIP tillater eksplisitt egen oversettelse.
 */
import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
import { validateTestDef } from '../engine/render.js';
import { scoreTest } from '../engine/scoring.js';

let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS' : 'FAIL') + ' ' + m); if (!c) fails++; };

for (const lang of ['no', 'en']) {
  const def = JSON.parse(readFileSync(new URL(`./def-ipip50-big5.${lang}.json`, import.meta.url), 'utf8'));

  // 1. Schema v1
  const schema = JSON.parse(readFileSync(new URL('./test-definition.schema.json', import.meta.url), 'utf8'));
  delete schema.$schema;
  const ajv = new Ajv({ strict: false, allErrors: true, validateSchema: false });
  const v1 = ajv.compile(schema);
  ok(v1(def), `AJV schema-valid ${lang}: ${v1.errors?.map(e=>e.message).join('; ') ?? ''}`);

  // 2. Engine-struktur
  const v = validateTestDef(def);
  ok(v.ok, `validateTestDef ${lang}: ${v.errors.join('; ')}`);
  ok(def.languages.length === 1 && def.languages[0] === lang, `languages=[${lang}]`);
  ok(def.items.length === 50 && new Set(def.items.map(i=>i.id)).size === 50, `50 items / 50 unike id-er`);

  // 3. Keying (N skåres N-retning 8+/2-; offisiell key skårer ES 2+/8- → N = full speiling av ES)
  const signCount = (t) => { const c={p:0,m:0}; for (const it of def.items) for (const s of it.scales) if (s.id===t) s.sign===1?c.p++:c.m++; return c; };
  const K = { extraversion:[5,5], agreeableness:[6,4], conscientiousness:[6,4], neuroticism:[8,2], openness:[7,3] };
  for (const [t,[p,m]] of Object.entries(K)) {
    const c = signCount(t);
    ok(c.p===p && c.m===m, `keying ${t}: ${c.p}+/${c.m}- (fordret ${p}+/${m}-)`);
  }

  // 4. Uniform-scenarier. Motor-spenn er option-basert og fast per skala: [p-5m, 5p-m] (=tradisjonelt [p+m, 5p+5m] skiftet -6m).
  const scen = [
    { val:1, raw:(p,m)=>p-m,   norm:(p,m)=>{ const r=p-m, a=p-5*m, b=5*p-m; return 100*(r-a)/(b-a); } },
    { val:3, raw:(p,m)=>3*p-3*m, norm:(p,m)=>{ const r=3*p-3*m, a=p-5*m, b=5*p-m; return 100*(r-a)/(b-a); } },
    { val:5, raw:(p,m)=>5*p-5*m, norm:(p,m)=>{ const r=5*p-5*m, a=p-5*m, b=5*p-m; return 100*(r-a)/(b-a); } },
  ];
  for (const sc of scen) {
    const answers = {};
    def.items.forEach(it => answers[it.id] = { kind:'likert', lang, value: sc.val });
    const res = scoreTest(def, { testId:def.id, lang, itemIds:def.items.map(i=>i.id), answers, startedAt:1, finishedAt:2 });
    ok(res.ok, `score alle-${sc.val} ${lang}: ${res.errors.join('; ')}`);
    for (const s of res.result.scales) {
      const [p,m] = K[s.id];
      const eRaw = sc.raw(p,m), eNorm = sc.norm(p,m);
      ok(s.raw===eRaw && s.minPossible===p-5*m && s.maxPossible===5*p-m && Math.abs(s.normalized-eNorm)<1e-9,
        `alle-${sc.val} ${s.id}: raw=${s.raw} span[${s.minPossible},${s.maxPossible}] norm=${s.normalized} (fordret ${eRaw}[${p-5*m},${5*p-m}] ${eNorm})`);
    }
  }

  // 5. ISOMORFI: motor-normalisert == tradisjonell IPIP-håräkning (6−v reversering) på deterministisk tilfeldig mønster.
  //    trad per skala: raw = Σ_+(v) + Σ_−(6−v); min = p+m; max = 5p+5m; norm = 100*(raw-min)/(max-min).
  const answers = {};
  for (let i=0;i<def.items.length;i++) {
    const v = ((i * 7) % 5) + 1;
    answers[def.items[i].id] = { kind:'likert', lang, value: v };
  }
  const res = scoreTest(def, { testId:def.id, lang, itemIds:def.items.map(i=>i.id), answers, startedAt:1, finishedAt:2 });
  ok(res.ok, `score random ${lang}: ${res.errors.join('; ')}`);
  for (const s of res.result.scales) {
    const [p,m] = K[s.id];
    let trad = 0;
    for (const it of def.items) {
      const sc = it.scales.find((x) => x.id === s.id);
      if (!sc) continue;
      const v = answers[it.id].value;
      trad += sc.sign === 1 ? v : (6 - v);
    }
    const minT = p + m, maxT = 5*p + 5*m;
    const normT = 100*(trad - minT)/(maxT - minT);
    ok(Math.abs(s.normalized - normT) < 1e-9 && s.raw === (trad - 6*m) , `isomorfi ${s.id}: motor=${s.normalized} trad=${normT} (raw ${s.raw} = trad ${trad} - 6*${m})`);
  }
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILS`);
process.exit(fails === 0 ? 0 : 1);
