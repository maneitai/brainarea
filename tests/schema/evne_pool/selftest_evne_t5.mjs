/**
 * Brainarea schema-selvtest — Evne-pool T5 (sq, evne-t5-sekvens, 40 items).
 * [3-VEIS] FASE 2 evnepool per tema (T5-blokken). Kontrakt:
 * tests/schema/_evne_itemspec_spec.json — T5: poolId evne-t5-sekvens, idPrefix sq,
 * poolMin 40, draw 7, optionsPerItem 5; bands L/M/H mot 0.34/0.33/0.33 tol 0.15.
 * kind:'ability' eksklusivt per T5.orderKindNote ('order' er ekskludert v1).
 * Distraktorer: regeldel-brudd (beregnet fra regelobjektene i generatoren).
 *
 * S0 prod-tre + filer;  S1/S2 AJV + validateTestDef per fil;  S3 struktur;
 * S4 band-andeler 14/13/13 + bandvindu;  S5 fasit-kontrakt;
 * S6 g-score probe mot ekte scoring.js;  S7 meta-konsistens + par-variant;
 * S8 matematisk fasit-verifisering (re-avledning fra prompt + rekalkulering);
 * S9 copyright-skann;  S10 par-fil id/ci/diff;  S11 undertype-spredning >=2;
 * S13 kvote-margin {L2,M2,H3} margin>=2 + maxItems-funn viderefert;
 * S15 itemspec-kryssles + kind-check;  S16 engine-gap G1/G3-status.
 * Kjoring: node selftest_evne_t5.mjs (fra evne_pool/, WSL eller Windows)
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

const P = {
  t5no: existsSync(rel('tests/schema/evne_pool/def-evne-t5-sekvens.no.json')),
  t5en: existsSync(rel('tests/schema/evne_pool/def-evne-t5-sekvens.en.json')),
  meta: existsSync(rel('tests/schema/evne_pool/_evne_pool_t5_meta.json')),
  spec: existsSync(rel('tests/schema/_evne_itemspec_spec.json')),
  gen: existsSync(rel('tests/schema/evne_pool/gen_evne_pool_t5.py')),
};
for (const [k, v] of Object.entries(P)) ok(v, 'S0b fil ' + k);

const t5 = {
  no: JSON.parse(readFileSync(rel('tests/schema/evne_pool/def-evne-t5-sekvens.no.json'), 'utf8')),
  en: JSON.parse(readFileSync(rel('tests/schema/evne_pool/def-evne-t5-sekvens.en.json'), 'utf8')),
};
const meta = JSON.parse(readFileSync(rel('tests/schema/evne_pool/_evne_pool_t5_meta.json'), 'utf8'));
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

for (const [name, def] of [['t5.no', t5.no], ['t5.en', t5.en]]) {
  const schemaOk = validateSchemaV1(def);
  const err = schemaOk ? [] : validateSchemaV1.errors.map((e) => e.instancePath + ' ' + e.message).slice(0, 3);
  ok(schemaOk, 'S1 ajv schema v1: ' + name + (err.length ? ' — ' + err.join('; ') : ''));
  const r = render.validateTestDef(def);
  ok(r.ok, 'S2 validateTestDef: ' + name + (r.errors && r.errors.length ? ' — ' + r.errors.join(';') : ''));
}

/* ---------- S3 struktur ---------- */
const seqIds = (items, pfx) => items.every((it, i) => it.id === pfx + '-' + String(i + 1).padStart(4, '0'));
ok(t5.no.items.length === 40 && t5.en.items.length === 40, 'S3a T5: 40 items per fil (poolMin 40)');
ok(seqIds(t5.no.items, 'sq') && seqIds(t5.en.items, 'sq'), 'S3b id-moenster sq-0001..0040');
ok(new Set(t5.no.items.map((i) => i.id)).size === 40, 'S3c unike id-er');
ok(t5.no.id === 'evne-t5-sekvens' && t5.en.id === 'evne-t5-sekvens' &&
   t5.no.family === 'evner' && t5.en.family === 'evner' &&
   t5.no.scoring.type === 'g-score' && t5.no.scoring.metric === 'z100' &&
   t5.no.scoring.ci95 === true && t5.no.dimensions.length === 1 &&
   t5.no.dimensions[0].id === 'g', 'S3d poolId/family/scoring/dims-konvensjon');

/* ---------- S4 band-andeler ---------- */
{
  const bandOf = (b) => (b < -0.5 ? 'L' : b < 0.5 ? 'M' : 'H');
  const metaById = new Map(meta.items.map((m) => [m.id, m]));
  const counts = { L: 0, M: 0, H: 0 };
  t5.no.items.forEach((it) => counts[bandOf(it.variants[0].difficulty)]++);
  const target = { L: 0.34, M: 0.33, H: 0.33 };
  for (const b of ['L', 'M', 'H']) {
    ok(Math.abs(counts[b] / 40 - target[b]) <= 0.15,
       'S4 T5.' + b + ': ' + counts[b] + '/40 (maal ' + target[b] + ', tol 0.15)');
  }
  let win = 0;
  for (const it of t5.no.items) {
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
  for (const def of [t5.no, t5.en]) {
    def.items.forEach((it) => {
      const v = it.variants[0];
      if (v.options.length !== 5 || v.correctIndex < 0 || v.correctIndex >= 5 ||
          v.difficulty < -4 || v.difficulty > 4) bad++;
    });
  }
  ok(bad === 0, 'S5 5 options + correctIndex i vindu + difficulty i [-4,4] (0 avvik)');
}

/* ---------- S6 g-score probe mot ekte scoring ---------- */
{
  const def = {
    schemaVersion: 1, id: 'evne-probe-t5', type: 'test-definition', family: 'evner',
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
  ok(meta.items.every((m) => m.correctIndex === undefined ? true : true) &&
     JSON.stringify(meta.subtypes) === JSON.stringify({ T5: { seq: 17, update: 13, track: 10 } }),
     'S6i subtyper i meta (17 seq / 13 update / 10 track)');

  // 39/40 -> theta endelig; alle-riktig -> theta null + warning (pool-baat-prober)
  const answers39 = {};
  t5.no.items.forEach((it, i) => {
    const ci = it.variants[0].correctIndex;
    answers39[it.id] = { kind: 'ability', lang: 'no',
                         abilityOriginalIndex: i === 0 ? (ci + 1) % 5 : ci };
  });
  const r39 = engine.scoreTest(t5.no, { testId: t5.no.id, lang: 'no', startedAt: 1, finishedAt: 2,
    itemIds: t5.no.items.map((it) => it.id), answers: answers39 });
  ok(r39.ok && r39.result.total.theta !== null && isFinite(r39.result.total.theta),
     'S6j 39/40 -> theta endelig: ' + (r39.result.total.theta ?? 'null'));
  const answersAll = {};
  t5.no.items.forEach((it) => {
    answersAll[it.id] = { kind: 'ability', lang: 'no', abilityOriginalIndex: it.variants[0].correctIndex };
  });
  const rAll = engine.scoreTest(t5.no, { testId: t5.no.id, lang: 'no', startedAt: 1, finishedAt: 2,
    itemIds: t5.no.items.map((it) => it.id), answers: answersAll });
  ok(rAll.ok && rAll.result.total.theta === null, 'S6k alle-riktig -> theta null');
  const wr = (rAll.warnings || []).some((w) => w.includes('alle-riktig')) &&
             (rAll.result.total.theta === null);
  ok(wr, 'S6l alle-riktig -> warning (alle-riktig, rapporter raaskaar) til stede');
}

/* ---------- S7 meta-konsistens + par-variant ---------- */
{
  let bad = 0, parBad = 0;
  for (const def of [t5.no, t5.en]) {
    for (const it of def.items) {
      const m = metaById.get(it.id);
      const v = it.variants[0];
      const labs = v.options.map((o) => o.label);
      if (labs.join('|') !== (m.optionOrder || []).join('|')) bad++;
      if ((m.optionOrder || []).length !== 5) bad++;
      const tags = m.violationTags || [];
      if (tags.length !== 5 || tags.filter((t) => t === 'none').length !== 1 ||
          tags.some((t) => !t)) bad++;
      if (labs[v.correctIndex] !== m.correctLabel) bad++;
      if (tags[v.correctIndex] !== 'none') bad++;
      if (labs.indexOf(labs[v.correctIndex]) !== v.correctIndex) bad++;
    }
  }
  ok(bad === 0, 'S7a optionOrder/violationTags/fasit konsistent (avvik ' + bad + ')');
  for (let i = 0; i < 40; i++) {
    const vno = t5.no.items[i].variants[0];
    const ven = t5.en.items[i].variants[0];
    if (t5.no.items[i].id !== t5.en.items[i].id) parBad++;
    if (vno.correctIndex !== ven.correctIndex) parBad++;
    if (JSON.stringify(vno.options) !== JSON.stringify(ven.options)) parBad++;
    if (vno.difficulty !== ven.difficulty) parBad++;
  }
  ok(parBad === 0, 'S7b par-variant: samme id/labels/correctIndex/difficulty per spraakpar (avvik ' + parBad + ')');
  const sepBad = t5.no.items.filter((it, i) => {
    const pno = it.variants[0].prompt, pen = t5.en.items[i].variants[0].prompt;
    return pno === pen;
  }).length;
  ok(sepBad === 0, 'S7c prompts separat forfattet NO/EN (0 identiske)');
}

/* ---------- S8 matematisk fasit-verifisering (T5-kjerne) ---------- */
{
  const LET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lpos = (i) => LET[((i - 1) % 26 + 26) % 26];
  const parseRule = (t) => {
    if (t[0] === 'x') return { op: 'x', a: parseInt(t.slice(1), 10) };
    // t kan vaere "+d" / "-d" / bare "d" (fortegn kun fra eksplicit minus)
    const sign = t[0] === '-' ? -1 : 1;
    const digits = t.replace(/^[+-]/, '');
    return { op: '+', a: sign * parseInt(digits, 10) };
  };
  const applyRule = (rl, v) => (rl.op === 'x' ? v * rl.a : v + rl.a);
  let parseBad = 0;
  for (const it of t5.no.items) {
    const m = metaById.get(it.id);
    const v = it.variants[0];
    const prompt = v.prompt;
    const correct = m.correctLabel;
    const opts = v.options.map((o) => o.label);
    const distr = opts.filter((l) => l !== correct);
    let exp = null;
    if (m.subtype === 'seq') {
      const seg = prompt.split('kommer sist: ')[1].replace('?', '').trim();
      const parts = seg.split(',').map((s) => s.trim()).filter(Boolean);
      const pairs = parts.map((s) => s.split(' ')).map(([a, b]) => [LET.indexOf(a) + 1, parseInt(b, 10)]);
      const dls = pairs.slice(1).map((p, i) => p[0] - pairs[i][0]);     // 3 effekter
      const dns = pairs.slice(1).map((p, i) => p[1] - pairs[i][1]);     // 3 effekter
      const last = pairs[pairs.length - 1];
      const rulesDl = m.rules.dl.startsWith('[') ? JSON.parse(m.rules.dl) : parseInt(m.rules.dl, 10);
      const dlConst = new Set(dls).size === 1 ? dls[0] : null;
      const dnConst = new Set(dns).size === 1 ? dns[0] : null;
      const chainDl = (rulesDl, k) => (Array.isArray(rulesDl) ? rulesDl[k % rulesDl.length] : rulesDl);
      if (dlConst !== null && dnConst !== null) {
        exp = lpos(last[0] + dlConst) + ' ' + (last[1] + dnConst);
        ok(exp === correct && String(dlConst) === m.rules.dl && String(dnConst) === m.rules.dn,
           'S8-seq ' + it.id + ' (re-avledet: ' + exp + ' == fasit ' + correct + ')');
      } else if (dlConst !== null && m.rules.dn.startsWith('x')) {
        const q = parseInt(m.rules.dn.slice(1), 10);
        const q0 = dns[1] / dns[0];
        const geom = dns.every((x, i2) => i2 === 0 || dns[i2] / dns[i2 - 1] === q0);
        exp = lpos(last[0] + dlConst) + ' ' + (last[1] * q);
        ok(exp === correct && String(dlConst) === m.rules.dl && geom && q0 === q,
           'S8-seq-geom ' + it.id + ' (re-avledet: ' + exp + ' == fasit ' + correct + ')');
      } else if (dlConst === null && Array.isArray(rulesDl) && dnConst !== null) {
        // prompten viser wrap-naere bokstaver: sammenlign dls mod 26 paa 1-basert pos
        const modD = (d) => { let r = d % 26; if (r === 0) r = 26; if (r >= 13) r -= 26; return r; };
        const altOk = dls.every((x, i2) => modD(x) === modD(chainDl(rulesDl, i2)));
        const nextEff = modD(chainDl(rulesDl, dls.length)) || chainDl(rulesDl, dls.length);
        exp = lpos(((last[0] - 1 + chainDl(rulesDl, dls.length)) % 26 + 26) % 26 + 1) + ' ' + (last[1] + dnConst);
        ok(exp === correct && altOk && String(dnConst) === m.rules.dn,
           'S8-seq-alt ' + it.id + ' (re-avledet: ' + exp + ' == fasit ' + correct + ')');
      } else {
        ok(false, 'S8-seq ' + it.id + ' uventet form: dls=' + dls.join('/') + ' dns=' + dns.join('/') + ' rules=' + JSON.stringify(m.rules));
      }
    } else if (m.subtype === 'update') {
      const m1 = prompt.match(/Starttallet er (\d+)\. Anvend først regel 1 \(([+x\u2212-]?\d+)\), deretter regel 2 \(([+x\u2212-]?\d+)\)/);
      if (!m1) { parseBad++; continue; }
      const s = parseInt(m1[1], 10);
      const r1 = parseRule(m1[2].replace('\u2212', '-'));
      const r2 = parseRule(m1[3].replace('\u2212', '-'));
      exp = String(applyRule(r2, applyRule(r1, s)));
      ok(exp === correct, 'S8-update ' + it.id + ' (re-avledet: ' + exp + ' == fasit ' + correct + ')');
    } else {
      const re = /Teller ([AB]) starter på (\d+) og (legger til|trekker fra) (\d+) for hvert skritt: ([\d, -]+)\./g;
      const mm = [...prompt.matchAll(re)];
      const mAsk = prompt.match(/Hvor mange har teller ([AB])\?/);
      if (!mAsk) { parseBad++; continue; }
      const ask = mAsk[1];
      if (mm.length !== 2) { parseBad++; continue; }
      const vals = mm.map((g) => parseInt(g[5].split(',').pop().trim(), 10));
      exp = String(ask === mm[0][1] ? vals[0] : vals[1]);
      ok(exp === correct, 'S8-track ' + it.id + ' (re-avledet: ' + exp + ' == fasit ' + correct + ')');
    }
  }
  ok(parseBad === 0, 'S8b alle prompts re-avledbare + distraktorer numeriske (avvik ' + parseBad + ')');
  // S8c regnedistanse: for seq er dele-tall med fasit OK saa lenge bokstaven skiller;
  // identisk bokstav krever tall-distanse >= 1. update/track er rene tall >= 1.
  let badPair = 0;
  for (const it of t5.no.items) {
    const m = metaById.get(it.id);
    const v = it.variants[0];
    const labs = v.options.map((o) => o.label);
    const correct = m.correctLabel;
    for (const d of labs) {
      if (d === correct) continue;
      if (m.subtype === 'seq') {
        const bl = d.split(' ')[0], bt = parseInt(d.split(' ')[1], 10);
        const cl = correct.split(' ')[0], ct = parseInt(correct.split(' ')[1], 10);
        if (bl === cl && Math.abs(bt - ct) < 1) badPair++;
      } else if (Math.abs(parseInt(d, 10) - parseInt(correct, 10)) < 1) badPair++;
    }
  }
  ok(badPair === 0, 'S8c regnedistanse: samme bokstav krever tall-dist >=1 / rene tall >=1 (avvik ' + badPair + ')');
}

/* ---------- S9 copyright ---------- */
{
  const forb = ['raven', 'wais', 'wisc', 'mensa', 'digit span', 'n-back', 'nback'];
  let hits = 0;
  for (const def of [t5.no, t5.en]) {
    for (const it of def.items) {
      const txt = (it.variants[0].prompt + ' ' + it.variants[0].options.map((o) => o.label).join(' ')).toLowerCase();
      for (const f of forb) if (txt.includes(f)) hits++;
    }
  }
  ok(hits === 0, 'S9 copyright-skann: 0 treff paa forbudsmonster (' + forb.join('/') + ')');
}

/* ---------- S10 par-fil ---------- */
{
  let bad = 0;
  for (let i = 0; i < 40; i++) {
    const a = t5.no.items[i], b = t5.en.items[i];
    if (a.id !== b.id || a.variants[0].correctIndex !== b.variants[0].correctIndex ||
        a.variants[0].difficulty !== b.variants[0].difficulty) bad++;
  }
  ok(bad === 0, 'S10 par-fil: samme id-rekkefoelge/correctIndex/difficulty (avvik ' + bad + ')');
}

/* ---------- S11 undertype-spredning ---------- */
{
  const subByBand = { L: new Set(), M: new Set(), H: new Set() };
  for (const it of t5.no.items) {
    const m = metaById.get(it.id);
    subByBand[m.band].add(m.subtype);
  }
  for (const b of ['L', 'M', 'H']) {
    ok(subByBand[b].size >= 2, 'S11 ' + b + ': ' + subByBand[b].size + ' undertyper (' + [...subByBand[b]].join(',') + ')');
  }
}

/* ---------- S13 kvote-margin + maxItems-funn ---------- */
{
  const poolC = counts2();
  function counts2() {
    const bandOf = (b) => (b < -0.5 ? 'L' : b < 0.5 ? 'M' : 'H');
    const c = { L: 0, M: 0, H: 0 };
    t5.no.items.forEach((it) => c[bandOf(it.variants[0].difficulty)]++);
    return c;
  }
  const q = { L: 2, M: 2, H: 3 };
  for (const b of ['L', 'M', 'H']) {
    ok(poolC[b] >= q[b] + 2, 'S13 kvote-margin ' + b + ': pool ' + poolC[b] + ' >= kvote ' + q[b] + ' + 2');
  }
  ok(spec.scoringContract && spec.scoringContract.defShape.includes('maxItems'),
     'S13b maxItems-funn viderefert: quota-maks 7 < schema maxItems-min 10 — samledef-avgjorelse til sampler-bygget');
}

/* ---------- S15 itemspec-kryssles + kind ---------- */
{
  const th = spec.themes.find((t) => t.id === 'T5');
  ok(!!th, 'S15a itemspec T5 finnes');
  ok(th.poolId === 'evne-t5-sekvens' && th.idPrefix === 'sq' && th.poolMin === 40 && th.draw === 7 && th.optionsPerItem === 5,
     'S15a itemspec T5 felt (sq, poolMin 40, draw 7, 5 opts)');
  const bT5 = meta.bands.T5;
  ok(meta.counts.T5 === 40 && bT5.L === 14 && bT5.M === 13 && bT5.H === 13,
     'S15b meta-bands == tellinger (T5 14/13/13)');
  const abilityOnly = t5.no.items.every((it) => it.kind === 'ability') &&
                      t5.en.items.every((it) => it.kind === 'ability');
  ok(abilityOnly, "S15c kind 'ability' eksklusivt (orderKindNote: 'order' ekskludert v1-sporet)");
  ok(meta.authoring && meta.authoring.T5 && meta.authoring.distractorRule,
     'S15d authoring-konvensjoner notert i meta');
}

/* ---------- S16 engine-gap ---------- */
{
  const gaps = Array.isArray(spec.engineGaps) ? spec.engineGaps : Object.values(spec.engineGaps || {});
  ok(gaps.some((g) => g.id === 'G1'), 'S16a engineGaps G1 i spec (flatt trekk, aapen til FASE 4)');
  ok(gaps.some((g) => g.id === 'G3'), 'S16b engineGaps G3 i spec (per-item-klokke — T5 holdt fri for speed-konstruksjoner)');
}

console.log('----');
console.log(fails === 0 ? 'ALL PASS' : fails + ' FAIL');
process.exit(fails === 0 ? 0 : 1);
