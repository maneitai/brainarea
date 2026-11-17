/**
 * Brainarea schema-selvtest — Evne-pool T6 (dl, evne-t6-deduksjon, 40 items).
 * [3-VEIS] FASE 2 evnepool per tema (T6-blokken, lukker H-1/N-1). Kontrakt:
 * tests/schema/_evne_itemspec_spec.json — T6: poolId evne-t6-deduksjon, idPrefix dl,
 * poolMin 40, draw 6, optionsPerItem 4; bands L/M/H 14/13/13 mot 0.34/0.33/0.33 tol 0.15.
 * kind:'ability' eksklusivt per T6.orderKindNote.
 * Distraktorer: kvantorforvirring (alle<->noen), omvendt antecedent-konklusjon,
 * konstruksjonsnaere tellingfeil — ALLE re-avledet/refutert her uavhengig av generatoren.
 *
 * S0 prod-tre + filer;  S1/S2 AJV + validateTestDef per fil;  S3 struktur;
 * S4 band-andeler 14/13/13 + bandvindu;  S5 fasit-kontrakt;
 * S6 g-score probe mot ekte scoring.js (+39/40 endelig, alle-riktig -> null);
 * S7 meta-konsistens + par-variant (oversatte labels: samme orden + ci, ikke byte-identiske);
 * S8 MAT re-avledning: eigen verdensenum (FOL + eksistenskonvensjon) for syl/cond,
 *    eksplisitt teller for combi — fasit OG distraktorer sjekket fra ren prompttekst;
 * S9 copyright-skann;  S10 par-fil id/ci/diff;  S11 undertype-spredning >=2;
 * S13 kvote-margin {L2,M2,H2} margin>=2 + maxItems-funn viderefert;
 * S15 itemspec-kryssles + kind-check;  S16 engine-gap G1/G3-status.
 * Kjoring: node selftest_evne_t6.mjs (fra evne_pool/, WSL eller Windows)
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS' : 'FAIL') + ' ' + m); if (!c) fails++; };

const CANDIDATES = [
  '/mnt/f/maneit/prosjekter/filip-webside-prosjekter/brainarea',
  'f:/maneit/prosjekter/filip-webside-prosjekter/brainarea',
  'F:\\maneit\\prosjekter\\filip-webside-prosjekter\\brainarea',
];
const found = CANDIDATES.filter((p) => existsSync(p));
ok(found.length >= 1, 'S0 prod-tre funnet: ' + found.join(' | '));
const PROD = found[0];
const rel = (p) => join(PROD, p);
// staging-kjoring: T6_EVNE_DIR=<abs katalog med def/meta-filene>
const EVNE_DIR = process.env.T6_EVNE_DIR || join(PROD, 'tests/schema/evne_pool');
const ev = (f) => join(EVNE_DIR, f);

const P = {
  t6no: existsSync(ev('def-evne-t6-deduksjon.no.json')),
  t6en: existsSync(ev('def-evne-t6-deduksjon.en.json')),
  meta: existsSync(ev('_evne_pool_t6_meta.json')),
  spec: existsSync(rel('tests/schema/_evne_itemspec_spec.json')),
  gen: existsSync(ev('gen_evne_pool_t6.py')),
};
for (const [k, v] of Object.entries(P)) ok(v, 'S0b fil ' + k);

const t6 = {
  no: JSON.parse(readFileSync(ev('def-evne-t6-deduksjon.no.json'), 'utf8')),
  en: JSON.parse(readFileSync(ev('def-evne-t6-deduksjon.en.json'), 'utf8')),
};
const meta = JSON.parse(readFileSync(ev('_evne_pool_t6_meta.json'), 'utf8'));
const spec = JSON.parse(readFileSync(rel('tests/schema/_evne_itemspec_spec.json'), 'utf8'));
const metaById = new Map(meta.items.map((m) => [m.id, m]));
const schema = JSON.parse(readFileSync(rel('tests/schema/test-definition.schema.json'), 'utf8'));
delete schema.$schema;
const prodRequire = createRequire(rel('tests/engine/scoring.js'));
const AjvCtor = prodRequire('ajv');
ok(!!AjvCtor, 'S0c ajv via prodRequire');
const ajv = new AjvCtor({ strict: false, allErrors: true, validateSchema: false });
const validateSchemaV1 = ajv.compile(schema);
const scoringSrc = readFileSync(rel('tests/engine/scoring.js'), 'utf8');
const { pathToFileURL } = await import('node:url');
const render = await import(pathToFileURL(rel('tests/engine/render.js')).href);
const engine = await import('data:text/javascript;base64,' + Buffer.from(scoringSrc).toString('base64'));

for (const [name, def] of [['t6.no', t6.no], ['t6.en', t6.en]]) {
  const schemaOk = validateSchemaV1(def);
  const err = schemaOk ? [] : validateSchemaV1.errors.map((e) => e.instancePath + ' ' + e.message).slice(0, 3);
  ok(schemaOk, 'S1 ajv schema v1: ' + name + (err.length ? ' — ' + err.join('; ') : ''));
  const r = render.validateTestDef(def);
  ok(r.ok, 'S2 validateTestDef: ' + name + (r.errors && r.errors.length ? ' — ' + r.errors.join(';') : ''));
}

/* ---------- S3 struktur ---------- */
const seqIds = (items, pfx) => items.every((it, i) => it.id === pfx + '-' + String(i + 1).padStart(4, '0'));
ok(t6.no.items.length === 40 && t6.en.items.length === 40, 'S3a T6: 40 items per fil (poolMin 40)');
ok(seqIds(t6.no.items, 'dl') && seqIds(t6.en.items, 'dl'), 'S3b id-moenster dl-0001..0040');
ok(new Set(t6.no.items.map((i) => i.id)).size === 40, 'S3c unike id-er');
ok(t6.no.id === 'evne-t6-deduksjon' && t6.en.id === 'evne-t6-deduksjon' &&
   t6.no.family === 'evner' && t6.en.family === 'evner' &&
   t6.no.scoring.type === 'g-score' && t6.no.scoring.metric === 'z100' &&
   t6.no.scoring.ci95 === true && t6.no.dimensions.length === 1 &&
   t6.no.dimensions[0].id === 'g', 'S3d poolId/family/scoring/dims-konvensjon');
const optCount4 = t6.no.items.every((it) => it.variants[0].options.length === 4) &&
                  t6.en.items.every((it) => it.variants[0].options.length === 4);
ok(optCount4, 'S3e optionsPerItem 4 alle 80 varianter');

/* ---------- S4 band-andeler ---------- */
{
  const bandOf = (b) => (b < -0.5 ? 'L' : b < 0.5 ? 'M' : 'H');
  const counts = { L: 0, M: 0, H: 0 };
  t6.no.items.forEach((it) => counts[bandOf(it.variants[0].difficulty)]++);
  const target = { L: 0.34, M: 0.33, H: 0.33 };
  for (const b of ['L', 'M', 'H']) {
    ok(counts[b] === { L: 14, M: 13, H: 13 }[b], 'S4 T6.' + b + ': ' + counts[b] + '/40 (plan 14/13/13)');
    ok(Math.abs(counts[b] / 40 - target[b]) <= 0.15, 'S4tol ' + b);
  }
  let win = 0;
  for (const it of t6.no.items) {
    const m = metaById.get(it.id);
    const b = it.variants[0].difficulty;
    const inWin = (b >= -2 && b < -0.5 && m.band === 'L') ||
                  (b >= -0.5 && b < 0.5 && m.band === 'M') ||
                  (b >= 0.5 && b <= 2 && m.band === 'H');
    if (!inWin) win++;
  }
  ok(win === 0, 'S4f meta.bandDiff i bandvindu for alle 40 (avvik ' + win + ')');
}

/* ---------- S5 fasit-kontrakt ---------- */
{
  let bad = 0;
  for (const [lang, def] of [['no', t6.no], ['en', t6.en]]) {
    for (const it of def.items) {
      const m = metaById.get(it.id);
      const v = it.variants[0];
      const labs = v.options.map((o) => o.label);
      const langCap = lang[0].toUpperCase() + lang.slice(1);   // 'No' / 'En'
      const orderKey = 'optionOrder' + langCap;
      const tagKey = 'tags' + langCap;
      const cKey = 'correctLabel' + langCap;   // correctLabelNo / correctLabelEn
      if (labs.join('|') !== (m[orderKey] || []).join('|')) bad++;
      if ((m[orderKey] || []).length !== 4) bad++;
      const tags = m[tagKey] || [];
      if (tags.length !== 4 || tags.filter((t) => t === 'none').length !== 1 ||
          tags.some((t) => !t)) bad++;
      if (labs[v.correctIndex] !== m[cKey]) bad++;
      if (tags[v.correctIndex] !== 'none') bad++;
      if (labs.indexOf(labs[v.correctIndex]) !== v.correctIndex) bad++;
      if (new Set(labs).size !== 4) bad++;
    }
  }
  ok(bad === 0, 'S5 optionOrder/tags/fasit konsistent per spraakpar (avvik ' + bad + ')');
  const rotSpread = new Set(meta.items.map((m) => m.correctIndex)).size;
  ok(rotSpread === 4, 'S5b fasit-posisjon spreidt (4 distinkte posisjoner, aldri fast 0)');
}

/* ---------- S6 g-score probe mot ekte scoring.js ---------- */
{
  const def = {
    schemaVersion: 1, id: 'evne-probe-t6', type: 'test-definition', family: 'evner',
    languages: ['no', 'en'],
    scoring: { type: 'g-score', metric: 'z100', ci95: true },
    dimensions: [{ id: 'g', label: 'g', labelLanguage: 'no', description: 'probe' }],
    items: [
      { id: 'pr-0001', kind: 'ability', scales: [{ id: 'g', sign: 1 }],
        variants: [{ lang: 'no', prompt: 'p1', options: [{ label: 'a' }, { label: 'b' }], correctIndex: 1, difficulty: -1.2 },
                   { lang: 'en', prompt: 'p1e', options: [{ label: 'a' }, { label: 'b' }], correctIndex: 1, difficulty: -1.2 }] },
      { id: 'pr-0002', kind: 'ability', scales: [{ id: 'g', sign: 1 }],
        variants: [{ lang: 'no', prompt: 'p2', options: [{ label: 'a' }, { label: 'b' }, { label: 'c' }], correctIndex: 2, difficulty: 1.2 },
                   { lang: 'en', prompt: 'p2e', options: [{ label: 'a' }, { label: 'b' }, { label: 'c' }], correctIndex: 2, difficulty: 1.2 }] },
    ],
  };
  ok(validateSchemaV1(def), 'S6a probe-def ajv-ok');
  const r = engine.scoreTest(def, { testId: def.id, lang: 'no', startedAt: 1, finishedAt: 2,
    itemIds: ['pr-0001', 'pr-0002'],
    answers: { 'pr-0001': { kind: 'ability', lang: 'no', abilityOriginalIndex: 1 },
               'pr-0002': { kind: 'ability', lang: 'no', abilityOriginalIndex: 0 } } });
  ok(r.ok, 'S6b scoreTest ok: ' + (r.errors || []).join(';'));
  const tot = r.result.total;
  ok(tot.type === 'g-score' && tot.correctCount === 1 && tot.answeredCount === 2, 'S6c total (1/2)');
  ok(tot.theta !== null && Math.abs(tot.theta) < 0.1, 'S6d theta ~0: ' + tot.theta);
  ok(tot.thetaSe > 1.5 && tot.thetaSe < 2.0, 'S6e SE ~1.678: ' + tot.thetaSe);
  ok(tot.ci95[0] < -3 && tot.ci95[1] > 3, 'S6f ci95 omslutter');
  ok(tot.iqScale === null && tot.notNormed === true, 'S6g iqScale null + notNormed');
  ok(r.result.notes.some((n) => n.id === 'note.gscore.not-normed'), 'S6h note.gscore.not-normed');
  ok(JSON.stringify(meta.subtypes) === JSON.stringify({ T6: { syl: 22, cond: 12, combi: 6 } }),
     'S6i subtyper i meta (22 syl / 12 cond / 6 combi)');

  // 39/40 -> theta endelig; alle-riktig -> theta null + warning
  const answers39 = {};
  t6.no.items.forEach((it, i) => {
    const ci = it.variants[0].correctIndex;
    answers39[it.id] = { kind: 'ability', lang: 'no',
                         abilityOriginalIndex: i === 0 ? (ci + 1) % 4 : ci };
  });
  const r39 = engine.scoreTest(t6.no, { testId: t6.no.id, lang: 'no', startedAt: 1, finishedAt: 2,
    itemIds: t6.no.items.map((it) => it.id), answers: answers39 });
  ok(r39.ok && r39.result.total.theta !== null && isFinite(r39.result.total.theta),
     'S6j 39/40 -> theta endelig: ' + (r39.result.total.theta ?? 'null'));
  const answersAll = {};
  t6.no.items.forEach((it) => {
    answersAll[it.id] = { kind: 'ability', lang: 'no', abilityOriginalIndex: it.variants[0].correctIndex };
  });
  const rAll = engine.scoreTest(t6.no, { testId: t6.no.id, lang: 'no', startedAt: 1, finishedAt: 2,
    itemIds: t6.no.items.map((it) => it.id), answers: answersAll });
  ok(rAll.ok && rAll.result.total.theta === null, 'S6k alle-riktig -> theta null');
  const wr = (rAll.warnings || []).some((w) => w.includes('alle-riktig'));
  ok(wr, 'S6l alle-riktig -> warning til stede');
}

/* ---------- S7 meta-konsistens + par-variant ---------- */
{
  let bad = 0;
  for (const lang of ['no', 'en']) {
    const def = t6[lang];
    for (const it of def.items) {
      const m = metaById.get(it.id);
      const v = it.variants[0];
      const labs = v.options.map((o) => o.label);
      const langCap = lang[0].toUpperCase() + lang.slice(1);
      if ((m['optionOrder' + langCap] || []).length !== 4) bad++;
      const tags = m['tags' + langCap] || [];
      if (tags.length !== 4 || tags.filter((t) => t === 'none').length !== 1) bad++;
      if (labs[v.correctIndex] !== m['correctLabel' + langCap]) bad++;
    }
  }
  ok(bad === 0, 'S7a meta-rader konsistente (avvik ' + bad + ')');
  let parBad = 0;
  for (let i = 0; i < 40; i++) {
    const vno = t6.no.items[i].variants[0];
    const ven = t6.en.items[i].variants[0];
    if (t6.no.items[i].id !== t6.en.items[i].id) parBad++;
    if (vno.correctIndex !== ven.correctIndex) parBad++;
    if (vno.difficulty !== ven.difficulty) parBad++;
    // samme options-ORDEN struktur: posisjon-for-posisjon oversatt parallel
    // (labels er oversatt tekst — byte-identisk kun for combi-tall)
  }
  ok(parBad === 0, 'S7b par-variant: samme id/correctIndex/difficulty per spraakpar (avvik ' + parBad + ')');
  // oversatt-parallel-kontroll: hver posisjon pa tilsvarer samme konklusjonsstruktur
  // (verifisert i S8 via uavhengig re-avledning per sprak — her: 0+0 = identiske
  // string-lister ville vaere copy-feil; combi-tall kan vaere identiske)
  let idLabs = 0;
  for (let i = 0; i < 40; i++) {
    const lno = t6.no.items[i].variants[0].options.map((o) => o.label);
    const len = t6.en.items[i].variants[0].options.map((o) => o.label);
    const m = metaById.get(t6.no.items[i].id);
    if (m.subtype === 'combi') continue;
    if (lno.join('|') === len.join('|')) idLabs++;
  }
  ok(idLabs === 0, 'S7c syl/cond-labels oversatt (0 byte-identiske par-lister)');
  const sepBad = t6.no.items.filter((it, i) => {
    const pno = it.variants[0].prompt, pen = t6.en.items[i].variants[0].prompt;
    return pno === pen;
  }).length;
  ok(sepBad === 0, 'S7d prompts separat forfattet NO/EN (0 identiske)');
}

/* ---------- S8 MAT re-avledning (T6-kjerne) ---------- */
/* Uavhengig JS-implementation av verdensenum + parse avren promptene.
 * Samme semantikk som generatoren, ny kode — fasit OG distraktorer kontrolleres. */
{
  const FORM_WORD = {
    no: { 'Alle': 'A', 'Ingen': 'E', 'Noen': 'I' },
    en: { 'All': 'A', 'No': 'E', 'Some': 'I' },
  };
  // --- verdensenum over v kategorier; verden = bitmask over regioner ---
  const WCACHE = {};
  function worlds(v) {
    if (WCACHE[v]) return WCACHE[v];
    const n = 1 << (1 << v);
    const arr = [];
    for (let wm = 0; wm < n; wm++) arr.push(wm);
    WCACHE[v] = arr;
    return arr;
  }
  function holdsStmt(wm, form, i, j, v) {
    const nReg = 1 << v;
    if (form === 'A') {
      for (let r = 0; r < nReg; r++) {
        if ((wm & (1 << r)) && ((r >> i) & 1) && !((r >> j) & 1)) return false;
      }
      return true;
    }
    if (form === 'E') {
      for (let r = 0; r < nReg; r++) {
        if ((wm & (1 << r)) && ((r >> i) & 1) && ((r >> j) & 1)) return false;
      }
      return true;
    }
    if (form === 'I') {
      for (let r = 0; r < nReg; r++) {
        if ((wm & (1 << r)) && ((r >> i) & 1) && ((r >> j) & 1)) return true;
      }
      return false;
    }
    throw new Error('form ' + form);
  }
  function entails(wms, premiseForms, concl, v, existential) {
    for (const wm of wms) {
      // eksistens: hver kategori present i minst en region
      if (existential) {
        let okE = true;
        for (let k = 0; k < v && okE; k++) {
          let any = false;
          for (let r = 0; r < (1 << v); r++) {
            if ((wm & (1 << r)) && ((r >> k) & 1)) { any = true; break; }
          }
          if (!any) okE = false;
        }
        if (!okE) continue;
      }
      if (!premiseForms.every(([f, i, j]) => holdsStmt(wm, f, i, j, v))) continue;
      if (!holdsStmt(wm, concl[0], concl[1], concl[2], v)) return false;
    }
    return true;
  }

  // --- syl-parse ---
  function parseSyl(prompt, lang) {
    const body = prompt.replace(lang === 'no'
      ? / Hvilken konklusjon følger nødvendigvis\?$/
      : / Which conclusion necessarily follows\?$/, '');
    const re = lang === 'no' ? /^(Alle|Ingen|Noen)\s+(.+?)\s+er\s+(.+?)\.$/ : /^(All|No|Some)\s+(.+?)\s+are\s+(.+?)\.$/;
    const sents = body.split(/(?<=\.)\s+/).map((s) => s.trim()).filter(Boolean);
    const cats = [];
    const prem = [];
    for (const s of sents) {
      const m = s.match(re);
      if (!m) return null;
      const form = FORM_WORD[lang][m[1]];
      if (!form) return null;
      const idx = (name) => {
        let k = cats.indexOf(name);
        if (k < 0) { k = cats.push(name) - 1; }
        return k;
      };
      prem.push([form, idx(m[2]), idx(m[3])]);
    }
    return { cats, prem, v: cats.length };
  }
  function parseStmtOpt(label, cats, lang) {
    const re = lang === 'no' ? /^(Alle|Ingen|Noen)\s+(.+?)\s+er\s+(.+?)\.$/ : /^(All|No|Some)\s+(.+?)\s+are\s+(.+?)\.$/;
    const m = label.match(re);
    if (!m) return null;
    const form = FORM_WORD[lang][m[1]];
    if (!form) return null;
    const i = cats.indexOf(m[2]), j = cats.indexOf(m[3]);
    if (i < 0 || j < 0) return null;
    return [form, i, j];
  }
  // --- cond-parse ---
  function parseCond(prompt, lang) {
    let m, rule, scope, fact;
    if (lang === 'no') {
      m = prompt.match(/^Hvis en person liker (.+?), liker personen (.+?)\. Regelen gjelder både (.+?) og (.+?)\. (.+?) (liker ikke|liker) (.+?)\. /);
      if (!m) return null;
      rule = { P: m[1], Q: m[2] };
      scope = { A: m[3], B: m[4] };
      fact = { person: m[5], neg: m[6] === 'liker ikke', cat: m[7] };
    } else {
      m = prompt.match(/^If a person likes (.+?), the person likes (.+?)\. The rule applies to both (.+?) and (.+?)\. (.+?) (does not like|likes) (.+?)\. /);
      if (!m) return null;
      rule = { P: m[1], Q: m[2] };
      scope = { A: m[3], B: m[4] };
      fact = { person: m[5], neg: m[6] === 'does not like', cat: m[7] };
    }
    if (m[5] !== scope.A) return null;
    return { rule, scope, fact, rest: prompt.slice(m[0].length) };
  }
  function classifyCondOpt(label, lang, scope) {
    // rekkefølge: nodef og overB FOERST (mer spesifikke), atomA SIST — atomA-regexen
    // 'Da liker ...' sluker ellers 'Da liker også B cat' (ikke-girsk grense).
    if (lang === 'no') {
      let m;
      if ((m = label.match(/^Det trekkes ikke nødvendigvis noen bestemt konklusjon om (\S+?) og (.+?)\.$/))) {
        if (m[1] !== scope.A) return null;
        return { t: 'nodef', cat: m[2] };
      }
      if ((m = label.match(/^Da liker ikke heller (\S+?) (.+?)\.$/))) {
        if (m[1] !== scope.B) return null;
        return { t: 'overB', neg: true, cat: m[2] };
      }
      if ((m = label.match(/^Da liker også (\S+?) (.+?)\.$/))) {
        if (m[1] !== scope.B) return null;
        return { t: 'overB', neg: false, cat: m[2] };
      }
      if ((m = label.match(/^Da (liker ikke|liker) (\S+?) (.+?)\.$/))) {
        const [_, negw, person, cat] = m;
        if (person !== scope.A) return null;
        if (cat === scope.B) return null;   // 'Da liker også B ...' er fanget over
        return { t: 'atomA', neg: negw === 'liker ikke', cat, person };
      }
      return null;
    }
    let m;
    if ((m = label.match(/^No definite conclusion about (\S+?) and (.+?) necessarily follows\.$/))) {
      if (m[1] !== scope.A) return null;
      return { t: 'nodef', cat: m[2] };
    }
    if ((m = label.match(/^Then (\S+) does not like (.+?) either\.$/))) {
      if (m[1] !== scope.B) return null;
      return { t: 'overB', neg: true, cat: m[2] };
    }
    if ((m = label.match(/^Then (\S+) also likes (.+?)\.$/))) {
      if (m[1] !== scope.B) return null;
      return { t: 'overB', neg: false, cat: m[2] };
    }
    if ((m = label.match(/^Then (\S+) (does not like|likes) (.+?)\.$/))) {
      const [_, person, negw, cat] = m;
      if (person !== scope.A) return null;
      return { t: 'atomA', neg: negw === 'does not like', cat, person };
    }
    return null;
  }
  // --- combi-parse ---
  function parseCombi(prompt, lang) {
    let m;
    if (lang === 'no') {
      if ((m = prompt.match(/selger (\d+) skjorter og (\d+) bukser/))) {
        return { kind: 'shirt', a: +m[1], b: +m[2] };
      }
      if ((m = prompt.match(/er det (\d+) personer/) ) && /håndhilsinger/.test(prompt)) {
        return { kind: 'pairwise', a: +m[1] };
      }
      if ((m = prompt.match(/gruppe på (\d+) personer skal (\d+) velges/))) {
        return { kind: 'committee', a: +m[1], b: +m[2] };
      }
    } else {
      if ((m = prompt.match(/sells (\d+) shirts and (\d+) trousers/))) {
        return { kind: 'shirt', a: +m[1], b: +m[2] };
      }
      if ((m = prompt.match(/there are (\d+) people/) ) && /handshakes/.test(prompt)) {
        return { kind: 'pairwise', a: +m[1] };
      }
      if ((m = prompt.match(/group of (\d+) people, (\d+) are to be chosen/))) {
        return { kind: 'committee', a: +m[1], b: +m[2] };
      }
    }
    return null;
  }

  let parseBad = 0, mathBad = 0, distBad = 0;
  const langCap8 = (l) => l[0].toUpperCase() + l.slice(1);
  for (const lang of ['no', 'en']) {
    const def = t6[lang];
    for (const it of def.items) {
      const m = metaById.get(it.id);
      const v = it.variants[0];
      const labs = v.options.map((o) => o.label);
      let verdict = null;
      if (m.subtype === 'syl') {
        const p = parseSyl(v.prompt, lang);
        if (!p || p.v < 3 || p.v > 4) { parseBad++; continue; }
        const wms = worlds(p.v);
        const conclOf = (lab) => parseStmtOpt(lab, p.cats, lang);
        let follows = labs.map((lab) => {
          const c = conclOf(lab);
          if (!c) return null;
          return entails(wms, p.prem, c, p.v, false) ? 'fol' :
                 entails(wms, p.prem, c, p.v, true) ? 'exist' : 'no';
        });
        // fasit: nøyaktig én option folger under BEGGE konvensjoner (i=FOL follow
        // MA follows også eksistens); alle andre MA følge under NONE av dem
        const correctPos = follows.indexOf('fol');
        if (correctPos < 0 || follows.some((x, k) => k !== correctPos && x !== 'no')) {
          console.log('S8-debug syl-math: ' + it.id + ' ' + lang + ' :: ' + follows.map((x,k) => k + ':' + x).join(' ') + ' :: ' + labs.join(' || ') + ' :: ci=' + v.correctIndex + ' meta=' + m['correctLabel' + langCap8(lang)]);
          mathBad++;
          continue;
        }
        // eksistens-konvensjon: fasiten folger ogsaa der, og ingen distraktor folger der
        const correctStmt = conclOf(labs[correctPos]);
        if (!entails(wms, p.prem, correctStmt, p.v, true)) {
          console.log('S8-debug syl-exist: ' + it.id + ' ' + lang + ' :: fasiten folger ikke under eksistens :: ' + labs.join(' || '));
          mathBad++;
        }
        verdict = labs[correctPos];
      } else if (m.subtype === 'cond') {
        const pc = parseCond(v.prompt, lang);
        if (!pc) { parseBad++; continue; }
        const { rule, scope, fact } = pc;
        // premiss-verdener for A: (LP, LQ) filtrert pa regel + faktum
        // premiss-verdener for A: regel-gyldige (LP->LQ) + faktum-sann (om P eller Q)
        const wsA2 = [];
        for (let LP = 0; LP <= 1; LP++) for (let LQ = 0; LQ <= 1; LQ++) {
          if (LP === 1 && LQ === 0) continue;              // regel brutt
          const val = fact.cat === rule.P ? LP : fact.cat === rule.Q ? LQ : null;
          if (val === null) continue;
          if (fact.neg ? val !== 0 : val !== 1) continue;
          wsA2.push([LP, LQ]);
        }
        if (wsA2.length === 0) { console.log('S8-debug cond-empty: ' + it.id + ' ' + lang + ' :: rule=' + JSON.stringify(rule) + ' fact=' + JSON.stringify(fact)); mathBad++; continue; }
        // B-verdener: regel-gyldige; overgen-atom: 'B liker kat(ikke)'
        const wsB = [];
        for (let LP = 0; LP <= 1; LP++) for (let LQ = 0; LQ <= 1; LQ++) {
          if (LP === 1 && LQ === 0) continue;
          wsB.push([LP, LQ]);
        }
        // klassifiser alle 4 valgene:
        const cl = labs.map((lab) => classifyCondOpt(lab, lang, scope));
        if (cl.some((x) => !x)) { parseBad++; continue; }
        // entailet atom om A (om noen):
        const entA = cl.map((c) => {
          if (c.t !== 'atomA') return false;
          const catCode = c.cat === rule.P ? 'P' : c.cat === rule.Q ? 'Q' : null;
          if (catCode === null) return false;
          return wsA2.every(([LP, LQ]) => {
            const val = catCode === 'P' ? LP : LQ;
            return (c.neg ? val === 0 : val === 1);
          });
        });
        // nodef er korrekt <=> ingen atomA er entailed
        const anyEnt = entA.some(Boolean);
        // overB: atom om B — nodvendig <=> sann i alle regel-gyldige B-verdener
        const necB = cl.map((c) => {
          if (c.t !== 'overB') return null;
          return wsB.every(([LP, LQ]) => {
            const v2 = c.cat === rule.Q ? LQ : c.cat === rule.P ? LP : null;
            if (v2 === null) return false;
            return c.neg ? v2 === 0 : v2 === 1;
          });
        });
        // korrekt = entA (MP/MT) eller nodef (AC/DA); alle distraktorer ma vaere
        // refuterbare: atomA ikke-entailed, overB ikke nodvendig, nodef bare naa
        // naar et atom ER entailed (ellers 'ingen bestemt' ville ogsaa vaere sann)
        const correctPos = entA.indexOf(true);
        let cPos = -1, err = null;
        if (correctPos >= 0) {
          // nodef MA vaere distraktor her -> den er usann nettopp fordi ent finnes
          const nodefPos = cl.findIndex((c) => c.t === 'nodef');
          if (nodefPos < 0) err = 'mangler nodef';
          cPos = correctPos;
        } else {
          const nodefPos = cl.findIndex((c) => c.t === 'nodef');
          if (nodefPos < 0) err = 'mangler nodef (AC/DA)';
          else if (anyEnt) err = 'nodef korrekt men atom entailed';
          else cPos = nodefPos;
        }
        if (err || cPos < 0) { mathBad++; continue; }
        for (let k = 0; k < 4; k++) {
          if (k === cPos) continue;
          const c = cl[k];
          if (c.t === 'atomA' && entA[k]) { err = 'distraktor entailed'; break; }
          if (c.t === 'nodef' && !anyEnt) { err = 'nodef-distraktor er sann'; break; }
          if (c.t === 'overB' && necB[k]) { err = 'overB-distraktor er nodvendig'; break; }
        }
        if (err) { console.log('S8-debug cond-math: ' + it.id + ' ' + lang + ' :: ' + err + ' :: ' + labs.join(' || ') + ' :: ci=' + v.correctIndex + ' meta=' + m['correctLabel' + langCap8(lang)]); mathBad++; continue; }
        verdict = labs[cPos];
        // AC/DA-felle-kontroll: korrekt-valget 'ingen bestemt' krever at begge
        // atomene om testkategorien er ikke-entailed (ingen annen vei)
      } else {
        const pc = parseCombi(v.prompt, lang);
        if (!pc) { console.log('S8-debug combi-parse: ' + it.id + ' ' + lang + ' :: ' + v.prompt); parseBad++; continue; }
        let exp;
        if (pc.kind === 'shirt') {
          exp = 0;
          for (let i = 0; i < pc.a; i++) for (let j = 0; j < pc.b; j++) exp++;
        } else {
          exp = 0;
          for (let i = 0; i < pc.a; i++) for (let j = i + 1; j < pc.a; j++) exp++;
        }
        const correct = labs[v.correctIndex];
        if (parseInt(correct, 10) !== exp) { console.log('S8-debug combi-math: ' + it.id + ' ' + lang + ' :: exp=' + exp + ' :: labs=' + labs.join(' || ') + ' :: ci=' + v.correctIndex); mathBad++; continue; }
        // distraktorer: distinct + ulik fasit + heltall
        const ds = labs.filter((l) => l !== correct);
        if (ds.length !== 3 || new Set(ds).size !== 3 ||
            ds.some((d) => !/^\d+$/.test(d) || parseInt(d, 10) === exp)) distBad++;
        verdict = correct;
      }
      if (verdict !== m['correctLabel' + langCap8(lang)]) {
          console.log('S8-debug verdict: ' + it.id + ' ' + lang + ' :: subtype=' + m.subtype + ' :: verdict=[' + verdict + '] :: meta=[' + m['correctLabel' + langCap8(lang)] + '] :: labs=' + labs.join(' || ') + ' :: ci=' + v.correctIndex);
          mathBad++;
        }
    }
  }
  if (parseBad > 0 || mathBad > 0) {
    for (const lang of ['no', 'en']) {
      for (const it of t6[lang].items) {
        const m = metaById.get(it.id);
        const v = it.variants[0];
        const labs = v.options.map((o) => o.label);
        if (m.subtype === 'syl') {
          const p = parseSyl(v.prompt, lang);
          if (!p || p.v < 3) console.log('S8-debug syl-parse: ' + it.id + ' ' + lang + ' :: ' + v.prompt.slice(0, 140));
        } else if (m.subtype === 'cond') {
          const pc = parseCond(v.prompt, lang);
          if (!pc) console.log('S8-debug cond-parse: ' + it.id + ' ' + lang + ' :: ' + v.prompt);
          else {
            const cl0 = labs.map((lab) => classifyCondOpt(lab, lang, pc.scope));
            if (cl0.some((x) => !x)) console.log('S8-debug cond-opt: ' + it.id + ' ' + lang + ' :: ' + labs.join(' || '));
          }
        }
      }
    }
  }
  ok(parseBad === 0, 'S8a alle prompts re-avledbare (avvik ' + parseBad + ')');
  ok(mathBad === 0, 'S8b uavhengig matematisk re-avledning: naoyaktig ett folgende valg per item == fasit (avvik ' + mathBad + ')');
  ok(distBad === 0, 'S8c combi-distraktorer rene (avvik ' + distBad + ')');
}

/* ---------- S9 copyright ---------- */
{
  const forb = ['raven', 'wais', 'wisc', 'mensa', 'digit span', 'n-back', 'nback'];
  let hits = 0;
  for (const def of [t6.no, t6.en]) {
    for (const it of def.items) {
      const txt = (it.variants[0].prompt + ' ' + it.variants[0].options.map((o) => o.label).join(' ')).toLowerCase();
      for (const f of forb) if (txt.includes(f)) hits++;
    }
  }
  ok(hits === 0, 'S9 copyright-skann: 0 treff av forbudte instrumentnavn');
}

/* ---------- S10 par-fil id/ci/diff ---------- */
{
  let bad = 0;
  for (let i = 0; i < 40; i++) {
    if (t6.no.items[i].id !== t6.en.items[i].id) bad++;
    if (t6.no.items[i].variants[0].correctIndex !== t6.en.items[i].variants[0].correctIndex) bad++;
    if (t6.no.items[i].variants[0].difficulty !== t6.en.items[i].variants[0].difficulty) bad++;
  }
  ok(bad === 0, 'S10 par-fil id/ci/diff aligned (avvik ' + bad + ')');
}

/* ---------- S11 undertype-spredning ---------- */
{
  const subByBand = { L: new Set(), M: new Set(), H: new Set() };
  for (const it of t6.no.items) {
    const m = metaById.get(it.id);
    subByBand[m.band].add(m.subtype);
  }
  for (const b of ['L', 'M', 'H']) {
    ok(subByBand[b].size >= 2, 'S11 ' + b + ': ' + subByBand[b].size + ' undertyper (' + [...subByBand[b]].join(',') + ')');
  }
}

/* ---------- S13 kvote-margin + maxItems-funn ---------- */
{
  const bandOf = (b) => (b < -0.5 ? 'L' : b < 0.5 ? 'M' : 'H');
  const c = { L: 0, M: 0, H: 0 };
  t6.no.items.forEach((it) => c[bandOf(it.variants[0].difficulty)]++);
  const q = { L: 2, M: 2, H: 2 };   // spec.sessionQuotas['6-trekk']
  for (const b of ['L', 'M', 'H']) {
    ok(c[b] >= q[b] + 2, 'S13 kvote-margin ' + b + ': pool ' + c[b] + ' >= kvote ' + q[b] + ' + 2');
  }
  ok(spec.scoringContract && spec.scoringContract.defShape.includes('maxItems'),
     'S13b maxItems-funn viderefert til sampler-bygget');
}

/* ---------- S15 itemspec-kryssles + kind ---------- */
{
  const th = spec.themes.find((t) => t.id === 'T6');
  ok(!!th, 'S15a itemspec T6 finnes');
  ok(th.poolId === 'evne-t6-deduksjon' && th.idPrefix === 'dl' && th.poolMin === 40 && th.draw === 6 && th.optionsPerItem === 4,
     'S15a itemspec T6 felt (dl, poolMin 40, draw 6, 4 opts)');
  const bT6 = meta.bands.T6;
  ok(meta.counts.T6 === 40 && bT6.L === 14 && bT6.M === 13 && bT6.H === 13,
     'S15b meta-bands == tellinger (T6 14/13/13)');
  const abilityOnly = t6.no.items.every((it) => it.kind === 'ability') &&
                      t6.en.items.every((it) => it.kind === 'ability');
  ok(abilityOnly, "S15c kind 'ability' eksklusivt (orderKindNote)");
  ok(meta.authoring && meta.authoring.T6 && meta.authoring.distractorRule && meta.authoring.validity && meta.holes && meta.holes.closes && meta.holes.closes.includes('H-1'),
     'S15d authoring/validity/H-1-lukking notert i meta');
  ok(meta.items.every((m) => m.logicConvention && m.logicConvention.includes('FOL')),
     'S15e logikk-konvensjon dokumentert per item');
}

/* ---------- S16 engine-gap ---------- */
{
  const gaps = Array.isArray(spec.engineGaps) ? spec.engineGaps : Object.values(spec.engineGaps || {});
  ok(gaps.some((g) => g.id === 'G1'), 'S16a engineGaps G1 i spec (flatt trekk, aapen til FASE 4)');
  ok(gaps.some((g) => g.id === 'G3'), 'S16b engineGaps G3 i spec (per-item-klokke — T6 holdt fri for speed-konstruksjoner)');
}

/* ---------- slutt ---------- */
console.log('---');
console.log(fails === 0 ? 'ALL PASS' : fails + ' FAIL(s)');
process.exit(fails === 0 ? 0 : 1);
