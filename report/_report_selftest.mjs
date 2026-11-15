#!/usr/bin/env node
/**
 * Selftest for rapport-konfig + renderer ([BYGG] FASE 1, todo #3728/#3730).
 * Kjør: node report/_report_selftest.mjs   (node >= 20, ingen deps)
 * Dekker: config-parse (3 rammer), schema-nøkkelfelt, renderer-hardkrav
 * (midtpunkt ≠ prosent-av-maks, normNote-krav, iqScale-ikon, employer-forbud),
 * determinisme (hash), og headless SVG-parse-sjekk.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { renderReport, scanBanned, RENDERER_VERSION } from './renderer.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
let pass = 0; const failures = [];
const ok = (name, cond, extra) => { if (cond) { pass++; console.log('PASS', name); } else { failures.push(name); console.log('FAIL', name, extra ?? ''); } };
const md5 = (s) => createHash('md5').update(s).digest('hex');
const load = (f) => JSON.parse(readFileSync(HERE + 'configs/' + f, 'utf8'));

const configs = { standard: load('standard.json'), personal: load('personal.json'), employer: load('employer.json') };

/* S1 — configs parses og har rammekontrakt */
for (const [name, c] of Object.entries(configs)) {
  ok(`S1.${name}.schemaVersion`, c.schemaVersion === 1);
  ok(`S1.${name}.frame`, c.frame === name);
  ok(`S1.${name}.total`, !!c.total);
  ok(`S1.${name}.disclaimer-bilingual`, typeof c.disclaimer?.no === 'string' && c.disclaimer.no.length > 0 && c.disclaimer.en.length > 0);
}

/* S2 — employer-rammen: samtalegrunnlag, aldri ansettelse (beslutning 7/8, dok) */
const emp = configs.employer;
ok('S2.employer.conversationBasis', !!emp.employer?.conversationBasis?.no && /grunnlag\s+for\s+samtale/i.test(emp.employer.conversationBasis.no));
ok('S2.employer.en-basis', /groundwork\s+for\s+a\s+conversation/i.test(emp.employer.conversationBasis.en));
ok('S2.employer.prohibitions>=4', Array.isArray(emp.employer?.prohibitions) && emp.employer.prohibitions.length >= 4);
const hiringWords = ['ansettelse', 'ansett', 'hire', 'hiring', 'candidate', 'kandidat'];
for (const w of hiringWords) {
  const v = scanBanned([emp.employer.conversationBasis.no, emp.employer.conversationBasis.en, emp.disclaimer.no, emp.disclaimer.en], [w]);
  ok(`S2.employer.basis-fri-for-${w}`, v.length === 0, v[0]?.chunk);
}
ok('S2.employer.noteParaphrases-alle-3', ['note.trait.not-normed', 'note.threshold.screening', 'note.gscore.not-normed'].every((id) => emp.employer?.noteParaphrases?.[id]));

/* S3 — standard-rammen: normNote på alle 3 total-blokkene + mood + thirdParty */
for (const t of ['trait', 'threshold', 'g-score']) {
  ok(`S3.standard.${t}.normNote.no`, typeof configs.standard.total?.[t]?.normNote?.no === 'string' && configs.standard.total[t].normNote.no.length > 10);
}
ok('S3.standard.mood', /hum\u00f8r|mood/i.test(configs.standard.moodEffect.text.no + configs.standard.moodEffect.text.en));
ok('S3.standard.thirdParty', !!configs.standard.thirdParty?.body?.no);
ok('S3.midtpunktLegend-adskilt', configs.standard.dimensions.graphicLabels.midpointLegend.no.includes('midtpunkt') && !configs.standard.dimensions.graphicLabels.midpointLegend.no.includes('gjennomsnittet'));
ok('S3.percentOfRange-egen', configs.standard.dimensions.graphicLabels.percentOfRange.no.includes('omfang'));

/* ---- scoring-fixture: miniatyr trait-resultat i scoringkontrakt v1 ---- */
const RESULT_TRAIT = {
  schemaVersion: 1, testId: 'fixture-big5', family: 'persona', lang: 'no', scoringType: 'trait',
  completed: true, expired: false, timeSpentSec: 612, answeredCount: 50, totalItems: 50, coverage: 1,
  scales: [
    { id: 'ekstroversi', weight: 1, itemsAnswered: 10, raw: 30, minPossible: 10, maxPossible: 50, normalized: 50, reversedCount: 3, itemIds: [] },
    { id: 'medmenneskelighet', weight: 1, itemsAnswered: 10, raw: 40, minPossible: 10, maxPossible: 50, normalized: 75, reversedCount: 2, itemIds: [] },
    { id: 'planlegging', weight: 1, itemsAnswered: 10, raw: 18, minPossible: 10, maxPossible: 50, normalized: 20, reversedCount: 4, itemIds: [] },
    { id: 'emosjonell-stabilitet', weight: 1, itemsAnswered: 10, raw: 25, minPossible: 10, maxPossible: 50, normalized: 37.5, reversedCount: 2, itemIds: [] },
    { id: '\u00e5penhet', weight: 1, itemsAnswered: 10, raw: 46, minPossible: 10, maxPossible: 50, normalized: 90, reversedCount: 0, itemIds: [] },
    { id: 'tom-skala', weight: 1, itemsAnswered: 0, raw: 0, minPossible: 0, maxPossible: 0, normalized: null, reversedCount: 0, itemIds: [] },
  ],
  total: { type: 'trait', composite: 54.5, norms: 'none', normsFile: null },
  notes: [{ id: 'note.trait.not-normed', no: 'Sk\u00e5r er prosent av skala-omfang, ikke persentiler \u2014 ingen normer er brukt.', en: 'Score is percent of scale range, not percentiles \u2014 no norms are applied.' }],
};
const RESULT_THRESHOLD = { ...RESULT_TRAIT, scoringType: 'threshold', testId: 'fixture-adhd',
  total: { type: 'threshold', score: 14, bandId: 'moderat', bandLabel: 'Moderat omfang', guidance: null, disclaimer: 'disclaimer.triage' },
  notes: [{ id: 'note.threshold.screening', no: 'Screening, ikke diagnose \u2014 disclaimer id gjengis p\u00e5 resultatsiden.', en: 'Screening, not diagnosis \u2014 disclaimer id is rendered on the result page.' }], scales: RESULT_TRAIT.scales.slice(0, 2) };
const RESULT_G = { ...RESULT_TRAIT, scoringType: 'g-score', testId: 'fixture-evne',
  total: { type: 'g-score', metric: 'z100', correctCount: 21, answeredCount: 32, proportion: 0.65625, theta: 0.41, thetaSe: 0.33, ci95: [-0.24, 1.06], iqScale: null, notNormed: true },
  notes: [{ id: 'note.gscore.not-normed', no: 'Kun r\u00e5trekk og theta. Not an IQ number.', en: 'Raw count and theta only. Not an IQ number.' }], scales: RESULT_TRAIT.scales.slice(0, 2) };

/* S4 — renderer: trait over alle 3 rammer, begge språk */
for (const [frame, cfg] of Object.entries(configs)) {
  for (const lang of ['no', 'en']) {
    const r = renderReport(RESULT_TRAIT, cfg, { lang });
    ok(`S4.${frame}.${lang}.render`, r.html.length > 200 && r.svg.includes('<svg'));
    ok(`S4.${frame}.${lang}.strings-nonempty`, r.strings.length > 4 && r.strings.every((s) => typeof s === 'string' && s.trim().length > 0));
  }
}
/* G-score-resultat: g-score-blokken renderes, ikonet iqScale aldri i output */
const rg = renderReport(RESULT_G, configs.standard, { lang: 'no' });
ok('S4.gscore.theta-vises', rg.html.includes('\u03b8') || rg.html.includes('0.41'));
ok('S4.gscore.ikke-IQ-tall', !/IQ\s*[:=]\s*\d/.test(rg.html));
ok('S4.gscore.normNote-bæres', rg.html.includes('ikke et normert IQ-tall'));

/* S5 — determinisme: samme input = bytes-identisk output, hash */
const h1 = md5(renderReport(RESULT_TRAIT, configs.standard, { lang: 'no' }).html);
const h2 = md5(renderReport(RESULT_TRAIT, configs.standard, { lang: 'no' }).html);
ok('S5.deterministisk-html', h1 === h2, h1 + ' vs ' + h2);
const hs1 = md5(renderReport(RESULT_TRAIT, configs.standard, { lang: 'no' }).svg);
const hs2 = md5(renderReport(RESULT_TRAIT, configs.standard, { lang: 'no' }).svg);
ok('S5.deterministisk-svg', hs1 === hs2);

/* S6 — kvalitetskontrakt: midtpunkt vs prosent-av-maks i graf + tekst */
const svg = renderReport(RESULT_TRAIT, configs.standard, { lang: 'no' }).svg;
ok('S6.midtpunktstrek-i-svg', svg.includes('x1="' + (30 + 560 / 2)) && svg.includes('stroke-dasharray'));
ok('S6.midtpunktLegend-i-svg', svg.includes('skalaens midtpunkt'));
ok('S6.prosent-i-svg-adskilt', svg.includes('Prosent av skalaens omfang') && svg.includes('%'));
ok('S6.tom-skala-renderes-eaerlig', renderReport(RESULT_TRAIT, configs.standard, { lang: 'no' }).html.includes('Ikke beregnelig i denne økten')); /* null-skala får eksplisitt notComputable-tekst, aldri en falsk bar med skår */
const svgNo = renderReport(RESULT_TRAIT, configs.standard, { lang: 'no' }).svg;
ok('S6.notComputable-for-tom-skala', svgNo.includes('tom-skala') && svgNo.includes('Ikke beregnelig i denne økten'));

/* S7 — hardkrav: manglende normNote = render-nekt (ingen falsk norm) */
const broken = JSON.parse(JSON.stringify(configs.standard));
delete broken.total.trait.normNote;
let threw = false;
try { renderReport(RESULT_TRAIT, broken, { lang: 'no' }); } catch { threw = true; }
ok('S7.mangler-normNote-kaster', threw);

/* S8 — employer-forbud: renderer kaster på kandidat-vokabular i config */
const bad = JSON.parse(JSON.stringify(configs.employer));
bad.disclosures.push({ id: 'ulovlig', no: 'God for rask ansett vurdering av kandidat.', en: 'Good for fast hiring assessment of candidates.' });
let threw2 = false;
try { renderReport(RESULT_TRAIT, bad, { lang: 'no' }); } catch { threw2 = true; }
ok('S8.employer-forbud-kaster', threw2);
/* negasjonsregel: "ikke ansettelsesverktøy" er lov (negasjon på stedet) */
const negOk = scanBanned(['Dette er ikke et ansettelsesverktøy.'], ['ansettelse']);
ok('S8.negasjon-gjennomslipp', negOk.length === 0);

/* S9 — employer + g-score note: paraphrase kreves (ukjent note-id kaster) */
const reG = renderReport(RESULT_G, configs.employer, { lang: 'no' });
ok('S9.employer-note-paraphrase', reG.html.includes('estimert evneniv\u00e5') && !reG.html.includes('1PL'));
const unknown = JSON.parse(JSON.stringify(configs.employer));
/* ukjent id UTEN paraphrase = hard-feil (ingen stille utelatelse) */
const rUnk = { ...RESULT_TRAIT, notes: [{ id: 'note.fremmed', no: 'noen tekst', en: 'some text' }] };
let threw3 = false;
try { renderReport(rUnk, unknown, { lang: 'no' }); } catch (e) { threw3 = e.message.includes('fremmed'); }
ok('S9.ukjent-note-id-uten-paraphrase-kaster', threw3);
/* ukjent id MED paraphrase renderes kontrollert (paraphrase-teksten brukes, aldri rånoten) */
unknown.employer.noteParaphrases['note.fremmed'] = { no: 'kontrollert omtale', en: 'controlled mention' };
const rPar = renderReport(rUnk, unknown, { lang: 'no' });
ok('S9.ukjent-note-id-med-paraphrase-rendres', rPar.html.includes('kontrollert omtale') && !rPar.html.includes('noen tekst'));

/* S10 — SVG parses som XML (well-formed) */
const svgXml = renderReport(RESULT_TRAIT, configs.standard, { lang: 'no' }).svg;
ok('S10.svg-wellformed', (() => { try {
  /* lettheuristikk: balanse av åpnings/lukketags på de kjente elementene */
  const tags = ['svg', 'title', 'text', 'line', 'rect'];
  for (const t of tags) {
    const open = (svgXml.match(new RegExp('<' + t + '[\\s>]', 'g')) || []).length;
    const close = (svgXml.match(new RegExp('</' + t + '>', 'g')) || []).length;
    const selfc = (svgXml.match(new RegExp('<' + t + '[^>]*/>', 'g')) || []).length;
    if (open - selfc !== close) return false;
  }
  return true; } catch { return false; } })());

console.log(`\nSELFTEST ${pass} PASS / ${failures.length} FAIL`);
if (failures.length) process.exit(1);
