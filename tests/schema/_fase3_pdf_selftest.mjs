/**
 * Selftest for rapport-PDF-laget [BYGG] FASE 3, todo-run leaf «PDF-nedlasting av resultat».
 * Kjoer: node tests/schema/_fase3_pdf_selftest.mjs  (node>=20, ingen deps)
 *
 * Soester til _rel_share_graph_selftest.mjs (#3790) — samme konvensjoner:
 *   G1  EKTE scoringpath: trait (ipip50 big5), trait (nd-triage midt), g-score (gscore-matrix),
 *       mini-threshold-def -> scoreTest -> renderReportPdf per rammekonfig.
 *   G2  Byte-determinisme: samme input gir identisk PDF (md5 over 2 kjoeringer, alle cases).
 *   G3  Immutabilitet: kallerens font-Buffer er uendret etter render (subsettet kopierer ved
 *       inngang — Buffer.slice deler minne og muterte ellers originalen; regresjonsprove).
 *   G4  Kvalitetskontrakt i sinken: normNote, ctxLine, bandtekst, theta/CI95, disclosures,
 *       employer «GRUNNLAG FOR SAMTALE», demo-badge, ND-etiketter fra config.
 *   G5  PDF-struktur: %PDF-1.4-header, %%EOF, xref-offsets peker paantekst 'N 0 obj'.
 *   G6  Tekst-i-innhold: hver sink-streng finnes som Identity-H hex i dekomprimerte
 *       content-streams (node:zlib, latin1-skanning = byte-presis offsets).
 *   G7  Subset-gyldighet: begge FontFile2 dekomprimeres, re-parses (glyf/loca/cmap/maxp),
 *       maxp.numGlyphs == meta.fontGlyphs, og union av begge cmaps dekker alle sinke-tegn
 *       (det som faktisk tegnes finnes i innbakede fonter — ingen .notdef-tomme bokser).
 *   G8  Forbudslaser: negasjonsbevisst skann (passer/fanger), threshold forbidWord kaster,
 *       glyph-glipp i config kaster, >BMP-kodepunkt kaster.
 *   G9  Meta-kontrakt: objects = 11 + 2*pages, pages >= 1 (regresjon mot flush-buggen),
 *       pdfBytes == bytes.length, fontGlyphs >= 70.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { renderReportPdf, scanPdfBanned } from '../../report/pdf/brainarea-pdf.mjs';
import { readTables, readCmap } from '../../report/pdf/pdffont.mjs';
import { scoreTest } from '../engine/scoring.js';

let pass = 0; const failures = [];
const ok = (name, cond, extra = '') => { if (cond) { pass++; } else { failures.push(name); console.log(`FAIL ${name}${extra ? ' — ' + extra : ''}`); } };
const md5 = (x) => createHash('md5').update(x).digest('hex');
const dec = new TextDecoder(); /* brukes KUN paa utf8-datar (content streams), aldri paa hele PDF-en */

const HERE = new URL('.', import.meta.url);
const ROOT = new URL('../../', HERE);
const CFG = (f) => JSON.parse(readFileSync(new URL(`report/configs/${f}.json`, ROOT), 'utf8'));
const DEFJSON = (p) => JSON.parse(readFileSync(new URL(p, HERE), 'utf8'));
const REG = readFileSync(new URL('report/pdf/fonts/DejaVuSans.ttf', ROOT));
const BOLD = readFileSync(new URL('report/pdf/fonts/DejaVuSans-Bold.ttf', ROOT));
const md5RegBefore = md5(REG), md5BoldBefore = md5(BOLD);
const FONT_OPTS = { fontRegular: REG, fontBold: BOLD };
const T0 = 1_700_000_000_000;
const mkLikert = (def, val) => ({
  testId: def.id, lang: 'no', itemIds: def.items.map((i) => i.id),
  startedAt: T0, finishedAt: T0 + 60_000, timeSpentSec: 60, expired: false,
  answers: Object.fromEntries(def.items.map((i) => [i.id, { kind: 'likert', lang: 'no', value: val }])),
});
const mkAbility = (def, correctFn) => ({
  testId: def.id, lang: 'no', itemIds: def.items.map((i) => i.id),
  startedAt: T0, finishedAt: T0 + 120_000, timeSpentSec: 120, expired: false,
  answers: Object.fromEntries(def.items.map((i, idx) => {
    const v = i.variants[0];
    const n = v.options.length;
    const idx2 = correctFn(idx) ? v.correctIndex : (v.correctIndex + 1) % n;
    return [i.id, { kind: 'ability', abilityOriginalIndex: idx2 }];
  })),
});

/* ---------- EKTE defs ---------- */
const IPIP = DEFJSON('def-ipip50-big5.no.json');
const ND = DEFJSON('nd_pool/def-nd-triage-pool.no.json');
const GDEF = DEFJSON('evne_pool/def-evne-t1-matrise.no.json');
/* mini threshold-def (samme shape som _nd_itemspec_selftest S7 provet) */
const THDEF = {
  schemaVersion: 1, id: 'fixture-pdf-threshold', family: 'neurodivergent', lang: 'no',
  languages: ['no', 'en'], scoringType: ['threshold'],
  scoring: { type: 'threshold', bands: [{ id: 'lav', minScore: 0, label: 'Lav' }, { id: 'moderat', minScore: 12, label: 'Moderat' }, { id: 'hoy', minScore: 22, label: 'Hoy' }], disclaimer: 'screening.not-diagnosis' },
  dimensions: [{ id: 'adhd', label: 'ADHD', minLabel: '', maxLabel: '' }],
  items: Array.from({ length: 18 }, (_, i) => ({
    id: `th-${String(i + 1).padStart(4, '0')}`, kind: 'likert', lang: 'no',
    text: `Utsagn ${i + 1} i screening-skalaen.`,
    options: [{ value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4' }, { value: 5, label: '5' }],
    scales: [{ id: 'adhd', sign: 1 }], weight: 1,
  })),
};

const scoredTraitI = scoreTest(IPIP, mkLikert(IPIP, 3));
ok('G1a.ipip50-score', scoredTraitI.ok === true, JSON.stringify(scoredTraitI.error ?? scoredTraitI.warnings ?? null));
const scoredTraitN = scoreTest(ND, mkLikert(ND, 3));
ok('G1b.nd-score', scoredTraitN.ok === true, JSON.stringify(scoredTraitN.error ?? null));
const scoredG = scoreTest(GDEF, mkAbility(GDEF, (i) => i % 3 !== 0));
ok('G1c.gscore-score', scoredG.ok === true, JSON.stringify(scoredG.error ?? null));
const scoredTh = scoreTest(THDEF, mkLikert(THDEF, 3));
ok('G1d.threshold-score', scoredTh.ok === true, JSON.stringify(scoredTh.errors ?? scoredTh.error ?? null));
const TRAIT_I = scoredTraitI.result, TRAIT_N = scoredTraitN.result, RES_G = scoredG.result, RES_TH = scoredTh.result;
ok('G1e.th-shape', RES_TH.total && RES_TH.total.type === 'threshold' && typeof RES_TH.total.score === 'number');
ok('G1f.g-shape', RES_G.total && RES_G.total.type === 'g-score');

const cases = [
  ['ipip-standard-no', TRAIT_I, CFG('standard'), 'no'],
  ['ipip-standard-en', TRAIT_I, CFG('standard'), 'en'],
  ['nd-personal-en', TRAIT_N, CFG('personal'), 'en'],
  ['g-standard-no', RES_G, CFG('standard'), 'no'],
  ['th-standard-no', RES_TH, CFG('standard'), 'no'],
  ['th-employer-no', RES_TH, CFG('employer'), 'no'],
  ['trait-fixture-personal', { ...TRAIT_I, testId: 'fixture-pdf-big5' }, CFG('personal'), 'no'],
];

/* ---------- G2/G3/G9 + stream-ekstraksjon: alle cases ---------- */
/* latin1 = byte-presis strukturskanning av PDF-er med innebakede binaere fontstreams */
function* scanStreams(bytes) {
  /* kun dicts som BAK en 'obj\n'-grense kan vaere objekt-dicts; komprimerte bytes kan
     aldri produsere et ASCII-moenster som '/<< \/Filter...>>\nstream' innad i stream */
  const s = Buffer.from(bytes).toString('latin1');
  const re = /(\d+ 0 obj\n)?<< \/Filter \/FlateDecode \/Length (\d+)( \/Length1 (\d+))? >>\nstream\n/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    if (!m[1]) throw new Error('pdffont: stream-dict uten objektgrense (' + m.index + ')');
    yield { hasL1: !!m[4], l1: m[4] ? +m[4] : null, len: +m[2], binStart: m.index + m[0].length };
  }
}
const pdfBufs = {};
for (const [name, result, config, lang] of cases) {
  let a, b;
  try {
    a = renderReportPdf(result, config, { lang, ...FONT_OPTS });
    b = renderReportPdf(result, config, { lang, ...FONT_OPTS });
  } catch (e) { failures.push('render:' + name); console.log(`FAIL render ${name} — ${e.message}`); continue; }
  pdfBufs[name] = { ...a, config, result, lang };
  ok(`G2.det-${name}`, a.bytes && b.bytes && md5(a.bytes) === md5(b.bytes));
  ok(`G9.meta-${name}`, a.meta.pages >= 1 && a.meta.objects === 11 + 2 * a.meta.pages && a.meta.pdfBytes === a.bytes.length && a.meta.fontGlyphs.reg >= 70 && a.meta.fontGlyphs.bold >= 70, JSON.stringify(a.meta));
}

/* ---------- G7 subset-gyldighet + G6 tekst-i-innhold + G5 struktur ---------- */
for (const [name, P] of Object.entries(pdfBufs)) {
  const bytes = P.bytes;
  ok(`G5.hdr-${name}`, dec.decode(bytes.subarray(0, 9)) === '%PDF-1.4\n');
  ok(`G5.eof-${name}`, dec.decode(bytes.subarray(bytes.length - 6)) === '%%EOF\n');
  const s = Buffer.from(bytes).toString('latin1');
  const xr = /startxref\n(\d+)\n%%EOF/.exec(s);
  ok(`G5.startxref-${name}`, !!xr);
  if (xr) {
    const xrefBlock = s.slice(+xr[1], s.indexOf('trailer', +xr[1]));
    const rows = [...xrefBlock.matchAll(/^(\d{10}) 00000 n /gm)];
    let bad = 0;
    for (const r of rows) if (!/^\d+ 0 obj/.test(s.slice(+r[1], +r[1] + 20))) bad++;
    ok(`G5.xref-${name}`, rows.length > 0 && bad === 0, `${rows.length} rader, ${bad} peker feil`);
  }

  const streams = [...scanStreams(bytes)];
  const contents = streams.filter((o) => !o.hasL1);
  const fonts = streams.filter((o) => o.hasL1);
  ok(`G7.to-fonts-${name}`, fonts.length === 2, `${fonts.length}`);
  /* G6: hent alle hex-klodder (én klodd = én tegnet tekstlinje), dekod hver for seg.
     Kriterium — kortstreng (<=30 tegn): finnes som substring i klodd-tekstene.
     Lang paragraf: wrapper deler til linjer, saa kriteriet er ord-dekning (hvert ord
     >= 2 tegn finnes i tegnede linjer) + start- og slutanker (foerste/siste 3-ords-sekvens
     finnes som substring i linjeblob med mellomrom-joining). */
  const linesText = [];
  const hexRe = /<([0-9A-F]+)>/g;
  const decodeHex = (h) => { let out = ''; for (let i = 0; i + 4 <= h.length; i += 4) out += String.fromCharCode(parseInt(h.slice(i, i + 4), 16)); return out; };
  const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
  for (const o of contents) {
    const t = dec.decode(inflateSync(bytes.slice(o.binStart, o.binStart + o.len)));
    let m;
    while ((m = hexRe.exec(t)) !== null) linesText.push(norm(decodeHex(m[1])));
  }
  const blobSp = linesText.join(' ');
  const wordSet = new Set();
  for (const ln of linesText) for (const w of ln.split(' ')) if (w) wordSet.add(w);
  const hexOf = (str) => '<' + [...str].map((ch) => ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join('') + '>';
  const missing = P.strings.filter((str) => {
    const n = norm(str);
    if (!n) return false;
    if (n.length <= 30) return !blobSp.includes(n);
    const words = n.split(' ');
    if (words.some((w) => w.length >= 2 && !wordSet.has(w))) return true;
    const first3 = words.slice(0, 3).join(' ');
    const last3 = words.slice(-3).join(' ');
    return !(blobSp.includes(first3) && blobSp.includes(last3));
  });
  ok(`G6.tekst-${name}`, missing.length === 0, JSON.stringify(missing.slice(0, 3)));

  /* G6b: §7-tredjepartskontekstlinjen pushes i sinken men TEGNES aldri som egen klodd
     (avvik, pin: drawReport legger den i sinken og returnerer contextLine til meta; §1-linjen
     er '[frame] testId · lang' — en annen streng). Bevis: ingen Tj-klodd ER eksakt ctx. */
  const ctx = '[' + P.config.frame + '] ' + P.result.testId;
  const ctxPushes = P.strings.filter((x) => x === ctx).length;
  let ctxDrawnAlone = false;
  for (const o of contents) {
    const t = dec.decode(inflateSync(bytes.slice(o.binStart, o.binStart + o.len)));
    if (new RegExp(hexOf(ctx) + ' Tj').test(t)) ctxDrawnAlone = true;
  }
  ok(`G6b.ctxsink-${name}`, ctxPushes === 1 && !ctxDrawnAlone, JSON.stringify({ ctxPushes, ctxDrawnAlone }));

  /* G7: dekomprimer begge fontstreams i id-orden, re-parse */
  try {
    const parsed = fonts.map((o) => {
      const raw = inflateSync(bytes.slice(o.binStart, o.binStart + o.len)); /* slice paa KOMPRIMERT len */
      const ftab = readTables(raw);
      const { map } = readCmap(raw, ftab);
      const maxpGlyphs = (raw[ftab.get('maxp').offset + 4] << 8) | raw[ftab.get('maxp').offset + 5];
      return { ftab, map, maxpGlyphs };
    });
    const kinds = ['reg', 'bold'];
    ok(`G7.parse-${name}`, parsed.every((p) => p.ftab.has('glyf') && p.ftab.has('loca') && p.ftab.has('cmap') && p.ftab.has('head') && p.ftab.has('maxp')));
    ok(`G7.numglyphs-${name}`, parsed.every((p, i) => p.maxpGlyphs === P.meta.fontGlyphs[kinds[i]]), JSON.stringify(parsed.map((p) => p.maxpGlyphs)) + ' vs ' + JSON.stringify(P.meta.fontGlyphs));
    /* union-cmap dekker ALLE sink-tegn (det som tegnes finnes i innbakede fonter) */
    let missCp = [];
    for (const str of P.strings) for (const ch of str) {
      const cp = ch.codePointAt(0);
      if (cp > 0xFFFF || cp === 32) continue;
      if (!parsed.some((p) => p.map.has(cp)) && !missCp.includes(cp)) missCp.push(cp);
    }
    ok(`G7.cmap-dekning-${name}`, missCp.length === 0, missCp.slice(0, 5).map((c) => 'U+' + c.toString(16).toUpperCase()).join(','));
  } catch (e) { failures.push('G7:' + name); console.log(`FAIL G7 ${name} — ${e.message}`); }
}

/* ---------- G3 immutabilitet etter alle renders ---------- */
ok('G3.fontbuf-uendret', md5(REG) === md5RegBefore && md5(BOLD) === md5BoldBefore);

/* ---------- G4 kvalitetskontrakt-nokler i sinken ---------- */
{
  const t = pdfBufs['ipip-standard-no'];
  ok('G4.normnote', t.strings.some((x) => x.includes('prosent av') || x.includes('Skårene')), JSON.stringify(t.strings.slice(0, 5)));
  ok('G4.ctxline', t.strings.some((x) => x === '[standard] ' + t.result.testId + ' · no'));
  ok('G4.disclosures', t.strings.some((x) => x.startsWith('• ')));
  const g = pdfBufs['g-standard-no'];
  ok('G4.theta', g.strings.some((x) => /θ ≈ /.test(x)), JSON.stringify(g.strings.filter((x) => x.includes('θ'))));
  ok('G4.ci95', g.strings.some((x) => x.startsWith('CI95:')));
  const th = pdfBufs['th-standard-no'];
  ok('G4.bandtekst', th.strings.some((x) => / — /.test(x)), JSON.stringify(th.strings.slice(0, 8)));
  const em = pdfBufs['th-employer-no'];
  ok('G4.samtalegrunnlag', em.strings.some((x) => /GRUNNLAG FOR SAMTALE/i.test(x)), JSON.stringify(em.strings.slice(-6)));
  const fx = pdfBufs['trait-fixture-personal'];
  ok('G4.demobadge', fx.strings.some((x) => x.startsWith('DEMO med konstruerte data')));
  const nd = pdfBufs['nd-personal-en'];
  ok('G4.nd-etiketter', ['ADHD', 'Autism'].every((l) => nd.strings.includes(l)), JSON.stringify(nd.strings.filter((x) => x.length < 12).slice(0, 10)));
}

/* ---------- G8 forbudslaser ---------- */
{
  /* DOKUMENTERT AVVIK (pin): scanPdfBanned arver renderer-NEG_CUE — 'ingen'/'mangler' er
     ikke negasjonsmarkoerer der, mens 3rd-party-verifikatoren (fase3-nd) bruker et bredere
     vokabular. Lases som naavarende atferd med registrert avvik; laases i renderer-bygget. */
  ok('G8.negasjon-semantikk', scanPdfBanned(['Ikke et ansettelsesverktøy'], ['ansettelses']).length === 0
    && scanPdfBanned(['Ingen anbefaling om å ansette'], ['ansett']).length === 1
    && scanPdfBanned(['Ukjente mangler gjør ansettelse uheldig'], ['ansettelse']).length === 1,
    'avvik: ingen/mangler dekkes ikke av NEG_CUE-vinduet');
  ok('G8.paastand-fanges', scanPdfBanned(['Vi ansetter basert på dette'], ['ansett']).length === 1);
  const bad = { ...RES_TH, total: { ...RES_TH.total, bandLabel: 'Diagnose-nivå' }, notes: [] };
  let th1 = null;
  try { renderReportPdf(bad, CFG('personal'), { lang: 'no', ...FONT_OPTS }); } catch (e) { th1 = e; }
  ok('G8.forbudsord-kaster', th1 && /forbidWord/.test(th1.message), th1 && th1.message);
  const cfg2 = JSON.parse(JSON.stringify(CFG('standard')));
  cfg2.thirdParty.body.no += ' ᚠ';
  let th2 = null;
  try { renderReportPdf(TRAIT_I, cfg2, { lang: 'no', ...FONT_OPTS }); } catch (e) { th2 = e; }
  ok('G8.glyph-glipp-kaster', th2 && /glyf mangler|vidd krever/.test(th2.message), th2 && th2.message);
  let th3 = null;
  try { renderReportPdf({ ...RES_TH, testId: 'fixture-𝕏' }, CFG('standard'), { lang: 'no', ...FONT_OPTS }); } catch (e) { th3 = e; }
  ok('G8.supplementary-kaster', th3 && /kodepunkt utenfor BMP|vidd krever/.test(th3.message), th3 && th3.message);
}

console.log(`\nPDF SELFTEST ${pass} PASS / ${failures.length} FAIL`);
if (failures.length) { console.log('FAILED:', failures.join(', ')); process.exit(1); }
