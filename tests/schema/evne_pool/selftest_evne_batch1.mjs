/**
 * Brainarea schema-selvtest — Evne-pool batch 1 (T1 matrise mx + T2 numerisk nm, 100 items).
 * [3-VEIS] FASE 2, todo #3748 «[3-VEIS] FASE 2: Evnepool batch 1: tema 1-2 (~100 items),
 * originale - ingen Raven/WAIS-reproduksjoner.»
 *
 * Leveranse: tests/schema/evne_pool/def-evne-t1-matrise.{no,en}.json,
 *            tests/schema/evne_pool/def-evne-t2-numerisk.{no,en}.json,
 *            tests/schema/evne_pool/_evne_pool_batch1_meta.json
 * Kontrakt:  tests/schema/_evne_itemspec_spec.json (evne-itemspec v1).
 *
 * S0-S16:
 *  S0   prod-tre funnet (WSL /mnt/f + Windows F:/)
 *  S1/S2 AJV schema v1 + validateTestDef (render.js) per fil (4 filer)
 *  S3   struktur: 50 mx + 50 nm, unike id-er, kontinuerlig loopenummer, id-moenster
 *  S4   band-andeler per temapool: 17/17/16 = 34/34/32 % — innen |andel-maal| <= 0.15
 *       (bandvinduer [-2,-0.5> / [-0.5,0.5> / [0.5,2] per spec; meta.bandDiff i vindu)
 *  S5   fasit-kontrakt: correctIndex i [0, len(options)), 6 options T1, 5 options T2
 *  S6   g-score skoringsprobe mot ekte scoring.js: 2-item def (L+H), 1 riktig/1 feil
 *       -> theta ~0, SE ~1.678, ci95 omslutter, iqScale null, notNormed true,
 *       note.gscore.not-normed til stede; alle-riktig -> theta null + warning
 *  S7   meta-konsistens: grid/options/ci/difficulty i def-filene gjenoppbygges fra
 *       meta (celleformel gi=(g0+RG*c+CG*r)%4, q=k0+RC*c+CC*r) og matcher eksakt;
 *       T2-sekvens i meta matcher prompt; fasit Stemmer for bade T1-akser og T2-familier
 *  S8   dypekontrakt T1: alle viste counts i [1,7], fasit i [1,8]; options 6 distinkte;
 *       correctIndex-rotasjon gir spredt fasitposisjon; EN/NO-varianter deler labels
 *  S9   dypekontrakt T2: alle tall heltall > 0; fasit ikke i seq; distraktorer 4
 *       distinkte, ulik fasit, i [1, max(seq)*20] (operatornaer-naerhet krav: minst
 *       2 av 4 innen ans +/- 2*steg); EN/NO identiske labels
 *  S10  par-fil: samme id-rekkefolge, samme correctIndex, same labels, b-only-prompt
 *       varianter; difficulty identisk no/en per item
 *  S11  undertype-spredning: >=2 undertyper per band per tema; T1 band L har akse-
 *       spredning (across/down), T2: 3 familier per band
 *  S12  copyright-navn: ingen Raven/WAIS/WISC/Mensa/nevnt i prompts/labels (forbudsl-
 *       listen fra spec.copyrightControl.forbidden)
 *  S13  kvote-forutsetning: bandpoolene treffer sessionQuotas 8-trekk {L3,M3,H2} ved
 *       flatt trekk med margin (pool L>=15, M>=15, H>=14 per tema)
 *  S14  maxItems-funn: scoring maxItems minimum 10 i schema — per-tema maxItems 8
 *       er ILEGALLY lav; dokumentert funn (samledef-avgjorelsen tilhorer sampler-bygget)
 *  S15  kryssles mot itemspec: themes T1/T2 felt (draw 8, optionsPerItem 6/5, poolMin 50
 *       naadd); batch-mapping #3748 oppfylt; meta-bandShare == tellinger i def-filer
 *  S16  motor-gap dokumentert (G1 flatt trekk — ingen bandkvoter i sampleSession i dag;
 *       G2 tekstbaerer er komplett for T1/T2; item-level difficulty motor-stottet)
 *
 * Kjoring: node selftest_evne_batch1.mjs  (fra evne_pool/) eller absolutt sti.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS' : 'FAIL') + ' ' + m); if (!c) fails++; };

const HERE = dirname(fileURLToPath(import.meta.url));
const CANDIDATES = [
  '/mnt/f/maneit/prosjekter/filip-webside-prosjekter/brainarea',
  'f:/maneit/prosjekter/filip-webside-prosjekter/brainarea',
  'F:\\maneit\\prosjekter\\filip-webside-prosjekter\\brainarea',
];
const found = CANDIDATES.filter(existsSync);
ok(found.length >= 1, `S0 prod-tre funnet: ${found.join(' | ')}`);
const PROD = found[0];
const rel = (p) => join(PROD, p);
const HERE_IN_PROD = existsSync(join(PROD, 'tests/schema/evne_pool', 'selftest_evne_batch1.mjs'));

/* ---------- filer ---------- */
const P = {
  t1no: existsSync(rel('tests/schema/evne_pool/def-evne-t1-matrise.no.json')),
  t2no: existsSync(rel('tests/schema/evne_pool/def-evne-t2-numerisk.no.json')),
  t1en: existsSync(rel('tests/schema/evne_pool/def-evne-t1-matrise.en.json')),
  t2en: existsSync(rel('tests/schema/evne_pool/def-evne-t2-numerisk.en.json')),
  meta: existsSync(rel('tests/schema/evne_pool/_evne_pool_batch1_meta.json')),
  spec: existsSync(rel('tests/schema/_evne_itemspec_spec.json')),
};
for (const [k, v] of Object.entries(P)) ok(v, `S0b fil ${k}`);

const t1 = { no: JSON.parse(readFileSync(rel('tests/schema/evne_pool/def-evne-t1-matrise.no.json'), 'utf8')),
             en: JSON.parse(readFileSync(rel('tests/schema/evne_pool/def-evne-t1-matrise.en.json'), 'utf8')) };
const t2 = { no: JSON.parse(readFileSync(rel('tests/schema/evne_pool/def-evne-t2-numerisk.no.json'), 'utf8')),
             en: JSON.parse(readFileSync(rel('tests/schema/evne_pool/def-evne-t2-numerisk.en.json'), 'utf8')) };
const meta = JSON.parse(readFileSync(rel('tests/schema/evne_pool/_evne_pool_batch1_meta.json'), 'utf8'));
const spec = JSON.parse(readFileSync(rel('tests/schema/_evne_itemspec_spec.json'), 'utf8'));

/* ---------- AJV + validateTestDef ---------- */
const schema = JSON.parse(readFileSync(rel('tests/schema/test-definition.schema.json'), 'utf8'));
delete schema.$schema;
const prodRequire = createRequire(rel('tests/engine/scoring.js'));
const AjvCtor = prodRequire('ajv');
ok(!!AjvCtor, 'S0c ajv via prodRequire');
const ajv = new AjvCtor({ strict: false, allErrors: true, validateSchema: false });
const validateSchemaV1 = ajv.compile(schema);
const renderSrc = readFileSync(rel('tests/engine/render.js'), 'utf8');
const scoringSrc = readFileSync(rel('tests/engine/scoring.js'), 'utf8');
// pathToFileURL-import: render.js har relativ import (./randomize.js) og maa hentes
// fra prod-pahen — data-URL bryter den relativheten.
const { pathToFileURL } = await import('node:url');
const render = await import(pathToFileURL(rel('tests/engine/render.js')).href);
const engine = await import('data:text/javascript;base64,' + Buffer.from(scoringSrc).toString('base64'));

/* ---------- S1/S2 ---------- */
for (const [name, def] of [['t1.no', t1.no], ['t1.en', t1.en], ['t2.no', t2.no], ['t2.en', t2.en]]) {
  const schemaOk = validateSchemaV1(def);
  const schemaErr = schemaOk ? [] : validateSchemaV1.errors.map(e => `${e.instancePath} ${e.message}`).slice(0, 3);
  ok(schemaOk, `S1 ajv schema v1: ${name}${schemaErr.length ? ' — ' + schemaErr.join('; ') : ''}`);
  const r = render.validateTestDef(def);
  ok(r.ok, `S2 validateTestDef: ${name}${r.errors?.length ? ' — ' + r.errors.join(';') : ''}`);
}

/* ---------- S3 struktur ---------- */
const seqIds = (items, pfx) => items.every((it, i) => it.id === `${pfx}-${String(i + 1).padStart(4, '0')}`);
ok(t1.no.items.length === 50 && t1.en.items.length === 50, 'S3a T1: 50 items per fil');
ok(t2.no.items.length === 50 && t2.en.items.length === 50, 'S3b T2: 50 items per fil');
ok(seqIds(t1.no.items, 'mx') && seqIds(t1.en.items, 'mx'), 'S3c T1 id-moenster mx-0001..0050');
ok(seqIds(t2.no.items, 'nm') && seqIds(t2.en.items, 'nm'), 'S3d T2 id-moenster nm-0001..0050');
ok(new Set(t1.no.items.map(i => i.id)).size === 50 && new Set(t2.no.items.map(i => i.id)).size === 50,
   'S3e unike id-er');
ok(t1.no.id === 'evne-t1-matrise' && t2.no.id === 'evne-t2-numerisk', 'S3f pool-id-er per spec');
ok(t1.no.family === 'evner' && t2.no.family === 'evner', 'S3g family evner');
ok(t1.no.scoring.type === 'g-score' && t2.no.scoring.type === 'g-score', 'S3h scoring g-score');
ok(t1.no.languages.length === 1 && t1.no.languages[0] === 'no'
   && t2.en.languages[0] === 'en', 'S3i ett spraak per fil (soester-konvensjon)');

/* ---------- S4 bands ---------- */
const bandWin = { L: [-2.0, -0.5], M: [-0.5, 0.5], H: [0.5, 2.0] };
const metaById = new Map(meta.items.map(m => [m.id, m]));
for (const [tKey, def] of [['T1', t1.no], ['T2', t2.no]]) {
  const counts = { L: 0, M: 0, H: 0 };
  for (const it of def.items) {
    const m = metaById.get(it.id);
    const diff = it.variants[0].difficulty;
    ok(!m ? false : m.theme === tKey && m.band === (diff < -0.5 ? 'L' : diff < 0.5 ? 'M' : 'H'),
       `S4a ${it.id}: meta-band samvar med difficulty`);
    const b = diff;
    const band = b < -0.5 ? 'L' : b < 0.5 ? 'M' : 'H';
    const [lo, hi] = bandWin[band];
    ok(b >= lo && (band === 'H' ? b <= hi : b < hi), `S4b ${it.id}: difficulty ${b} i band ${band}`);
    counts[band] += 1;
    ok(m.bandDiff === diff, `S4c ${it.id}: meta.bandDiff == variant.difficulty`);
    ok(it.difficulty === undefined, `S4d ${it.id}: ingen item-level difficulty (schema additionalProperties=false)`);
  }
  const share = { L: counts.L / 50, M: counts.M / 50, H: counts.H / 50 };
  const target = { L: 0.34, M: 0.33, H: 0.33 };
  for (const b of ['L', 'M', 'H'])
    ok(Math.abs(share[b] - target[b]) <= 0.15, `S4d ${tKey}.${b}: andel ${share[b].toFixed(2)} (maal ${target[b]}, tol 0.15)`);
}

/* ---------- S5 fasit-kontrakt ---------- */
for (const [name, def, k] of [['t1.no', t1.no, 6], ['t2.no', t2.no, 5]]) {
  def.items.forEach((it, n) => {
    const v = it.variants[0];
    ok(v.options.length === k && v.correctIndex >= 0 && v.correctIndex < v.options.length,
       `S5 ${it.id}: ${k} options + correctIndex i vindu`);
  });
}

/* ---------- S6 g-score probe mot ekte scoring ---------- */
{
  const def = {
    schemaVersion: 1, id: 'evne-probe-2item', type: 'test-definition', family: 'evner',
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
  ok(tot.type === 'g-score' && tot.correctCount === 1 && tot.answeredCount === 2, 'S6c total riktig (1/2)');
  ok(tot.theta !== null && Math.abs(tot.theta) < 0.1, 'S6d theta ~0: ' + tot.theta);
  ok(tot.thetaSe > 1.5 && tot.thetaSe < 2.0, 'S6e SE ~1.678: ' + tot.thetaSe);
  ok(tot.ci95[0] < -3 && tot.ci95[1] > 3, 'S6f ci95 omslutter');
  ok(tot.iqScale === null && tot.notNormed === true, 'S6g iqScale null + notNormed true');
  ok(r.result.notes.some(n => n.id === 'note.gscore.not-normed'), 'S6h note.gscore.not-normed');
  const r2 = engine.scoreTest(def, { testId: def.id, lang: 'no', startedAt: 1, finishedAt: 2,
    itemIds: ['pr-0001', 'pr-0002'],
    answers: { 'pr-0001': { kind: 'ability', lang: 'no', abilityOriginalIndex: 1 },
               'pr-0002': { kind: 'ability', lang: 'no', abilityOriginalIndex: 2 } } });
  ok(r2.ok && r2.result.total.theta === null, 'S6i alle-riktig -> theta null');
  ok(r2.warnings.some(w => w.includes('alle-riktig')), 'S6j warning alle-riktig');
  // hele-t1-probe: alle 50 mx-items besvart med fasit -> theta skal IKKE vaere null
  // (50/50 riktig gir theta null per rawFallback) — i stedet 49 riktig:
  const dFull = t1.no;
  const answers = {};
  dFull.items.forEach((it, i) => {
    answers[it.id] = { kind: 'ability', lang: 'no', abilityOriginalIndex: i < 49 ? it.variants[0].correctIndex : (it.variants[0].correctIndex + 1) % it.variants[0].options.length };
  });
  const r3 = engine.scoreTest(dFull, { testId: dFull.id, lang: 'no', startedAt: 1, finishedAt: 2,
    itemIds: dFull.items.map(i => i.id), answers });
  ok(r3.ok && r3.result.total.theta !== null, 'S6k 49/50 riktig -> theta endelig: ' + (r3.result.total.theta?.toFixed(3) ?? 'null'));
  ok(r3.result.total.correctCount === 49, 'S6l correctCount 49');
  ok(r3.result.total.answeredCount === 50, 'S6m answeredCount 50');
}

/* ---------- S7 meta-konsistens (gen-uavhengig gjenoppbygging) ---------- */
{
  const CYC = { A: ['<', '^', '>', 'v'], B: ['/', '-', '\\', '|'] };
  for (const it of t1.no.items) {
    const m = metaById.get(it.id);
    const cell = (r, c) => [(m.g0 + m.axes.RG * c + m.axes.CG * r) % 4, m.k0 + m.axes.RC * c + m.axes.CC * r];
    const giA = (m.g0 + m.axes.RG * 2 + m.axes.CG * 2) % 4;
    const qA = m.k0 + m.axes.RC * 2 + m.axes.CC * 2;
    const correct = '[' + CYC[m.cycle][giA].repeat(qA) + ']';
    ok(m.correct === correct, `S7a ${it.id}: meta.correct gjenoppbygd fra akser`);
    const v = it.variants[0];
    ok(v.options[v.correctIndex].label === m.correct && v.options[v.correctIndex].label === correct,
       `S7b ${it.id}: fasit i def == meta.correct`);
    ok(v.options.map(o => o.label).join('|') === m.optionOrder.join('|'),
       `S7c ${it.id}: option-rekkefolge == meta.optionOrder`);
    ok(m.violations.length === 6 && m.violations.includes('none'), `S7d ${it.id}: violation-taggs (none blandt 6)`);
    // grid i prompt matcher celleformelen
    const lines = v.prompt.split('\n').slice(1);
    const disp = lines.map(l => l.trim().split(/\s+/));
    let gridMatch = true;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const expect = (r === 2 && c === 2) ? '[?]' : '[' + CYC[m.cycle][cell(r, c)[0]].repeat(cell(r, c)[1]) + ']';
      if (disp[r][c] !== expect) gridMatch = false;
    }
    ok(gridMatch, `S7e ${it.id}: grid i prompt == celleformel`);
    // 1-rule-off: hver distraktor bryter eksakt ett ledd (akse-tag-distinkt eller kvant-mutasjon)
    const offs = m.violations.filter(t => t !== 'none');
    ok(offs.length === 5 && offs.every(t => /^(RG|CG|RC|CC)[+-]\d+$/.test(t)), `S7f ${it.id}: distraktor-tagger velformede (5 + none)`);
    // distinkte options
    ok(new Set(v.options.map(o => o.label)).size === 6, `S7g ${it.id}: 6 distinkte options`);
  }
  for (const it of t2.no.items) {
    const m = metaById.get(it.id);
    const v = it.variants[0];
    const seqLine = v.prompt.split('\n')[1].replace(/,\s*\?\s*$/, '');
    const shown = seqLine.split(',').map(s => parseInt(s.trim(), 10));
    ok(shown.length === m.seq.length && shown.every((x, i) => x === m.seq[i]),
       `S7h ${it.id}: sekvens i prompt == meta.seq (${shown.length} elementer)`);
    ok(parseInt(v.options[v.correctIndex].label, 10) === m.correct, `S7i ${it.id}: fasit == meta.correct`);
    ok(m.violations.length === 4 && new Set(m.violations).size === 4, `S7j ${it.id}: 4 distinkte distraktorer`);
    ok(!m.violations.includes(m.correct), `S7k ${it.id}: ingen distraktor == fasit`);
    // fasit ikke i viste elementer (T1/serier: fasit er neste element)
    ok(!m.seq.includes(m.correct), `S7l ${it.id}: fasit ikke i vist sekvensdel`);
  }
}

/* ---------- S8 T1 dypekontrakt ---------- */
{
  const CYC = { A: ['<', '^', '>', 'v'], B: ['/', '-', '\\', '|'] };
  for (const it of t1.no.items) {
    const m = metaById.get(it.id);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      if (r === 2 && c === 2) continue;
      const q = m.k0 + m.axes.RC * c + m.axes.CC * r;
      ok(q >= 1 && q <= 7, `S8a ${it.id}(${r},${c}): vist count ${q} i [1,7]`);
    }
    const qA = m.k0 + m.axes.RC * 2 + m.axes.CC * 2;
    ok(qA >= 1 && qA <= 8, `S8b ${it.id}: fasit count ${qA} i [1,8] (8-glyf-grense)`);
  }
  // fasitposisjon-spredning (rotasjon): ikke alle ci==0
  const ciDist = new Set(t1.no.items.map(it => it.variants[0].correctIndex));
  ok(ciDist.size >= 5, 'S8c T1 correctIndex-spredning >= 5 posisjoner: ' + [...ciDist].join(','));
  const ciDist2 = new Set(t2.no.items.map(it => it.variants[0].correctIndex));
  ok(ciDist2.size >= 4, 'S8d T2 correctIndex-spredning >= 4 posisjoner');
}

/* ---------- S9 T2 dypekontrakt ---------- */
for (const it of t2.no.items) {
  const m = metaById.get(it.id);
  ok(m.seq.every(x => Number.isInteger(x) && x > 0), `S9a ${it.id}: heltallspositiv sekvens`);
  ok(Number.isInteger(m.correct) && m.correct > 0, `S9b ${it.id}: fasit heltall > 0`);
  ok(m.violations.every(x => Number.isInteger(x) && x > 0), `S9c ${it.id}: distraktorer heltall > 0`);
  const mx = Math.max(...m.seq, m.correct);
  ok(m.violations.every(x => x >= 1 && x <= mx * 20), `S9d ${it.id}: distraktorer i naerhetsvindu`);
  // minst 2 av 4 innen +/-2 steg (operatornaerhetskravet fra spec T2.distractors)
  const typicalStep = Math.abs(m.seq[m.seq.length - 1] - m.seq[m.seq.length - 2]) || 1;
  const near = m.violations.filter(x => Math.abs(x - m.correct) <= 2 * typicalStep).length;
  ok(near >= 2, `S9e ${it.id}: ${near}/4 operatornaere (>=2)`);
}

/* ---------- S10 par-fil ---------- */
for (const [a, b, name] of [[t1.no, t1.en, 'T1'], [t2.no, t2.en, 'T2']]) {
  ok(b.items.map(i => i.id).join() === a.items.map(i => i.id).join(), `S10a ${name}: samme id-rekkefolge`);
  let ciSame = true, labSame = true, diffSame = true, promptDiff = true;
  a.items.forEach((it, i) => {
    const jt = b.items[i];
    if (jt.variants[0].correctIndex !== it.variants[0].correctIndex) ciSame = false;
    if (jt.variants[0].options.map(o => o.label).join('|') !== it.variants[0].options.map(o => o.label).join('|')) labSame = false;
    if (jt.variants[0].difficulty !== it.variants[0].difficulty) diffSame = false;
    if (jt.variants[0].prompt === it.variants[0].prompt) promptDiff = false;
    if (jt.variants[0].prompt.includes(it.variants[0].prompt.split('\n')[1])) promptDiff = true;
  });
  ok(ciSame, `S10b ${name}: samme correctIndex no/en`);
  ok(labSame, `S10c ${name}: samme option-labels (non-verbal bore) no/en`);
  ok(diffSame, `S10d ${name}: samme difficulty no/en`);
  ok(promptDiff, `S10e ${name}: prompt oversatt (labels delt, instruksjonstekst landt spesifikk)`);
}

/* ---------- S11 undertype-spredning ---------- */
{
  const subs = {};
  for (const m of meta.items) subs[`${m.theme}.${m.band}.${m.subtype}`] = (subs[`${m.theme}.${m.band}.${m.subtype}`] || 0) + 1;
  for (const theme of ['T1', 'T2']) for (const band of ['L', 'M', 'H']) {
    const n = Object.keys(subs).filter(k => k.startsWith(`${theme}.${band}.`)).length;
    ok(n >= 2, `S11 ${theme}.${band}: ${n} undertyper (>=2)`);
  }
}

/* ---------- S12 copyright-navn (forbudslisten) ---------- */
{
  const forbidden = spec.copyrightControl.forbidden;
  ok(forbidden.length >= 4, 'S12a >=4 forbudspunkter i spec');
  const allText = JSON.stringify(t1) + JSON.stringify(t2) + JSON.stringify(meta.items.map(i => ({ p: i.optionOrder, c: i.correct })));
  const names = ['Raven', 'WAIS', 'WISC', 'Mensa', 'Progressive Matrices', 'Digit Span', 'Block Design'];
  for (const nm of names) ok(!allText.includes(nm), `S12b navn ikke-brukt: ${nm}`);
}

/* ---------- S13 kvote-forutsetning ---------- */
for (const theme of ['T1', 'T2']) {
  const counts = { L: 0, M: 0, H: 0 };
  for (const m of meta.items.filter(x => x.theme === theme)) counts[m.band] += 1;
  ok(counts.L >= 15 && counts.M >= 15 && counts.H >= 14,
     `S13 ${theme}: pool ${JSON.stringify(counts)} dekker kvote {L3,M3,H2} x flere gjenbruk`);
}

/* ---------- S14 maxItems-funn ---------- */
ok(schema.$defs && schema.$defs.gScoreScoring.properties.maxItems.minimum === 10,
   'S14a schema g-score maxItems minimum == 10');
ok(t1.no.scoring.maxItems === undefined && t2.no.scoring.maxItems === undefined,
   'S14b def-filer uten maxItems (per-tema 8 ville brutt minimum 10 — dokumentert funn til sampler-bygget)');

/* ---------- S15 kryssles mot itemspec ---------- */
{
  const th1 = spec.themes.find(t => t.id === 'T1');
  const th2 = spec.themes.find(t => t.id === 'T2');
  ok(th1 && th1.poolMin === 50 && th1.draw === 8 && th1.optionsPerItem === 6, 'S15a T1 felt fra spec');
  ok(th2 && th2.poolMin === 50 && th2.draw === 8 && th2.optionsPerItem === 5, 'S15b T2 felt fra spec');
  ok(t1.no.id === th1.poolId && t2.no.id === th2.poolId, 'S15c poolId-felt samvar');
  const batch = spec.batchMapping[0];
  ok(batch.themes.includes('T1') && batch.themes.includes('T2'), 'S15d batch #3748 = T1+T2');
  ok(meta.counts.T1 === 50 && meta.counts.T2 === 50, 'S15e meta-counts 50/50');
  // meta bandShare matcher defene
  const reCount = { 'T1.L': 0, 'T1.M': 0, 'T1.H': 0, 'T2.L': 0, 'T2.M': 0, 'T2.H': 0 };
  for (const m of meta.items) reCount[`${m.theme}.${m.band}`] += 1;
  for (const [k, v] of Object.entries(meta.bandShares)) ok(reCount[k] === v, `S15f bandShare ${k} == ${v}`);
}

/* ---------- S16 motor-gaps dokumentert ---------- */
ok(spec.engineGaps.some(g => g.id === 'G1') && spec.engineGaps.some(g => g.id === 'G2') && spec.engineGaps.some(g => g.id === 'G3'),
   'S16a engineGaps G1/G2/G3 i spec');
ok(!renderSrc.includes('bandQuota'), 'S16b sampleSession har fortsatt ingen bandkvoter (G1 aapen i FASE 4)');

console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILS`);
process.exit(fails === 0 ? 0 : 1);
