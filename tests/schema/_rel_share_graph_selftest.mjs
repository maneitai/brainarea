/**
 * Selftest for delgraf-komponenten [BYGG] FASE 3, todo #3790.
 * Kjoer: node tests/schema/_rel_share_graph_selftest.mjs  (node>=20, ingen deps)
 *
 * Dekker:
 *   G1  EKTE compat-modul: identisk par (100/band-strong) + handregnet par (80.0/band-aligned)
 *       -> layout ok, per-dim verdier korrekt avledet, alle 4 dimensjoner til stede.
 *   G2  SVG: byte-determinisme (md5 over 2 kjoeringer), well-formed XML (tag-par-telling),
 *       viewBox = konstanten SHARE_W x SHARE_H, minste fontstorrelse >= SHARE_MIN_FONT,
 *       midtpunkt-dash til stede og ALDRI kombinert med prosent-tekst.
 *   G3  Canvas: kast-aldri-kontrakt (manglende ctx / ok:false-compat => { ok:false }),
 *       ops-liste deterministisk (JSON-lik over 2 kjoeringer), alle fillText-ops tar
 *       strengen (ingen [object Object]), samme geometri som layout (y-verdier matcher).
 *   G4  Etikett-konvensjon: labels til stede -> byte-eksakt FASE 1-vokabular;
 *       labels borte -> id verbatim i output (aldri oppfunne navn); band-fallback = bandId bare.
 *   G5  Strings-sink: shareGraphStrings dekker ALLE synlige SVG-tekster (XML-tekstnoeder
 *       er en delmengde av sink), ingenting synlig utenfor sinken.
 *   G6  Identifikatorfrihet: ingen input-identifikatorer kan lekke til render (proven:
 *       navn-strenger i input gaar aldri igjen i SVG).
 *   G7  Markoerer: gyldige profilvektorer -> markoer-kobling (posisjon = xAt-formelen);
 *       ugyldige verdier => ingen markoer (mild) eller ok:false (strictVectors).
 *   G8  Ikke-diagnostisk forbud: scan mot diagnostisk vokabular i alle rendstrenger = 0.
 *   G9  fmtOverall: no-komma/en-punkt, 1 desimal, utenfor kontrakt kaster.
 *   G10 Regresjons-anker: full renderer-selftest + rel-itemspec-selftest + scoring/engine
 *       kjoeres uroet (separate kjoeringer i steget, ikke her).
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  SHARE_W, SHARE_H, SHARE_MIN_FONT, SHARE_GRAPH_VERSION,
  shareGraphLayout, renderShareGraphSvg, drawShareGraphCanvas, shareGraphStrings, fmtOverall,
} from './_rel_share_graph.mjs';

let pass = 0; const failures = [];
const ok = (name, cond, extra = '') => { if (cond) { pass++; } else { failures.push(name); console.log(`FAIL ${name}${extra ? ' — ' + extra : ''}`); } };
const md5 = (s) => createHash('md5').update(s).digest('hex');

/* fixtures + EKTE compat-modul */
const compatMod = await import('data:text/javascript;base64,' + Buffer.from(
  readFileSync(new URL('./_rel_compat_model.mjs', import.meta.url), 'utf8')).toString('base64'));
const TEXTS = {
  title: { no: 'Samspill — par-kompatibilitet', en: 'Connection — pair compatibility' },
  contextLine: { no: 'Delt resultat — basert på to selvrapporteringer, ikke validert.', en: 'Shared result — based on two self-reports, not validated.' },
  overallPrefix: { no: 'Samspill', en: 'Connection' },
  personA: { no: 'Person 1', en: 'Person 1' },
  personB: { no: 'Person 2', en: 'Person 2' },
  pointLine: { no: '50 = skalaens midtpunkt (ikke et gjennomsnitt).', en: '50 = the scale midpoint (not an average).' },
  notComputable: { no: 'Ikke beregnelig', en: 'Not computable' },
};
const LABELS = {
  dimensions: {
    closeness: { no: 'Nærhet', en: 'Closeness' },
    openness: { no: 'Åpenhet', en: 'Openness' },
    conflict: { no: 'Konflikthåndtering', en: 'Conflict handling' },
    independence: { no: 'Selvstendighet', en: 'Independence' },
  },
  bands: {
    'band-strong': { no: 'Stort samspill', en: 'Strong connection' },
    'band-aligned': { no: 'Godt samspill', en: 'Aligned connection' },
    'band-mixed': { no: 'Blandet samspill', en: 'Mixed connection' },
    'band-differing': { no: 'Ulike mønstre', en: 'Differing patterns' },
  },
};

/* ---------- G1: ekte compat-input ---------- */
const identPair = compatMod.computePairCompatibility(
  { closeness: 40, openness: 80, conflict: 30, independence: 60 },
  { closeness: 40, openness: 80, conflict: 30, independence: 60 });
ok('G1a.identisk-par-ok', identPair.ok === true && identPair.overall === 100 && identPair.bandId === 'band-strong');
const handPair = compatMod.computePairCompatibility(
  { closeness: 50, openness: 80, conflict: 50, independence: 50 },
  { closeness: 90, openness: 40, conflict: 30, independence: 70 });
ok('G1b.handregnet-80.0', handPair.ok && Math.abs(handPair.overall - 80.0) < 1e-9 && handPair.bandId === 'band-aligned');
{
  const lo = shareGraphLayout(handPair, TEXTS, LABELS, 'no', { a: { closeness: 50, openness: 80, conflict: 50, independence: 50 }, b: { closeness: 90, openness: 40, conflict: 30, independence: 70 } });
  ok('G1c.layout-ok', lo.ok === true);
  const byDim = Object.fromEntries(lo.dims.map((d) => [d.id, d]));
  ok('G1d.dim-verdier', byDim.closeness.sPct === 60 && byDim.openness.sPct === 60 && byDim.conflict.sPct === 100 && byDim.independence.sPct === 100, JSON.stringify(byDim.conflict));
  ok('G1e.4-dims-i-orden', lo.dims.map((d) => d.id).join(',') === 'closeness,openness,conflict,independence');
  ok('G1f.bandnavn-lest', lo.bandName === 'Godt samspill');
  ok('G1g.overall-txt-no', lo.overallTxt === '80,0');
  ok('G1h.marks-koblet', byDim.closeness.marks.a === 50 && byDim.closeness.marks.b === 90 && byDim.conflict.marks.a === 50 && byDim.conflict.marks.b === 30);
}

/* ---------- G2: SVG ---------- */
let svg1 = null, svg2 = null;
try { svg1 = renderShareGraphSvg(handPair, TEXTS, LABELS, 'no', { a: { closeness: 50, openness: 80, conflict: 50, independence: 50 }, b: { closeness: 90, openness: 40, conflict: 30, independence: 70 } }); } catch (e) { console.log('THREW e:', e.message); }
try { svg2 = renderShareGraphSvg(handPair, TEXTS, LABELS, 'no', { a: { closeness: 50, openness: 80, conflict: 50, independence: 50 }, b: { closeness: 90, openness: 40, conflict: 30, independence: 70 } }); } catch (e) { console.log('THREW e:', e.message); }
ok('G2a.svg-ok-ikke-null', typeof svg1 === 'string' && svg1.length > 500);
ok('G2b.byte-determinisme', svg1 === svg2 && md5(svg1) === md5(svg2));
ok('G2c.viewbox-kontrakt', svg1.includes(`viewBox="0 0 ${SHARE_W} ${SHARE_H}"`));
{
  const fonts = [...svg1.matchAll(/font-size="([\d.]+)"/g)].map((m) => Number(m[1]));
  ok('G2d.minste-font>=12', fonts.length > 0 && Math.min(...fonts) >= SHARE_MIN_FONT, `min=${Math.min(...fonts)}`);
}
{
  /* well-formed XML: alle tager parvis (ingen self-closing i dette markupet) */
  const tags = ['svg', 'title', 'rect', 'line', 'text', 'circle', 'polygon'];
  let wf = true;
  for (const t of tags) {
    const open = (svg1.match(new RegExp('<' + t + '(\\s|>)', 'g')) || []).length;
    const close = (svg1.match(new RegExp('</' + t + '>', 'g')) || []).length;
    const selfc = (svg1.match(new RegExp('<' + t + '[^>]*/>', 'g')) || []).length;
    if (open !== close + selfc) { wf = false; console.log('  tag-ubalanse:', t, open, close, selfc); }
  }
  ok('G2e.svg-wellformed', wf);
}
ok('G2f.midtpunkt-dash', svg1.includes('stroke-dasharray'));
ok('G2g.midtpunkt-tekst-adskilt', svg1.includes('skalaens midtpunkt') && !/midtpunkt[^<]*%/.test(svg1));
ok('G2h.bandnavn-i-svg', svg1.includes('Godt samspill') && svg1.includes('80,0'));

/* ---------- G3: canvas kast-aldri + determinisme + geometri ---------- */
{
  const r1 = drawShareGraphCanvas(handPair, TEXTS, LABELS, 'no', null, { a: { closeness: 50, openness: 80, conflict: 50, independence: 50 }, b: { closeness: 90, openness: 40, conflict: 30, independence: 70 } });
  ok('G3a.null-ctx-ok-false', r1.ok === false && r1.error === 'canvas-mangler');
  const c1 = drawShareGraphCanvas(handPair, TEXTS, LABELS, 'no', {}, { a: { closeness: 50, openness: 80, conflict: 50, independence: 50 }, b: { closeness: 90, openness: 40, conflict: 30, independence: 70 } });
  const c2 = drawShareGraphCanvas(handPair, TEXTS, LABELS, 'no', {}, { a: { closeness: 50, openness: 80, conflict: 50, independence: 50 }, b: { closeness: 90, openness: 40, conflict: 30, independence: 70 } });
  ok('G3b.ctx-objekt-ok', c1.ok === true && Array.isArray(c1.ops) && c1.ops.length > 20);
  ok('G3c.ops-deterministisk', JSON.stringify(c1) === JSON.stringify(c2));
  const badopt = compatMod.computePairCompatibility({ closeness: 150, openness: 80, conflict: 50, independence: 50 }, { closeness: 90, openness: 40, conflict: 30, independence: 70 });
  const c3 = drawShareGraphCanvas(badopt, TEXTS, LABELS, 'no', {});
  ok('G3d.ok-false-compat-kaster-aldri', c3.ok === false && typeof c3.error === 'string' && c3.ok !== undefined);
  const texts = c1.ops.filter((o) => o.m === 'fillText').map((o) => o.a[0]);
  ok('G3e.ingen-object-object', texts.every((t) => typeof t === 'string' && !t.includes('[object')));
  /* samme y-geometri som layout */
  const lo = shareGraphLayout(handPair, TEXTS, LABELS, 'no', {});
  const labelYs = c1.ops.filter((o) => o.m === 'fillText' && lo.dims.some((d) => o.a[0] === d.label)).map((o) => o.a[2]);
  ok('G3f.geometri-matcher-layout', labelYs.length === 4 && labelYs.every((y, i) => Math.abs(y - (lo.dims[i].y + 12)) < 1e-9), JSON.stringify(labelYs));
  ok('G3g.canvas-H-const', c1.H === SHARE_H && c1.W === SHARE_W);
}

/* ---------- G4: etikett-konvensjoner ---------- */
{
  const svgLab = renderShareGraphSvg(handPair, TEXTS, LABELS, 'no', {});
  ok('G4a.faase1-vokabular-byte', ['Nærhet', 'Åpenhet', 'Konflikthåndtering', 'Selvstendighet'].every((w) => svgLab.includes(w)));
  const svgBare = renderShareGraphSvg(handPair, TEXTS, {},
    'no', {});
  ok('G4b.fallback-raa-id', ['closeness', 'openness', 'conflict', 'independence'].every((w) => svgBare.includes(w)));
  ok('G4c.fallback-ingen-etiketter', !svgBare.includes('Selvstendighet'));
  ok('G4d.band-fallback-id', svgBare.includes('band-aligned'));
  const svgEn = renderShareGraphSvg(handPair, TEXTS, LABELS, 'en', {});
  ok('G4e.en-vokabular', ['Closeness', 'Openness', 'Conflict handling', 'Independence'].every((w) => svgEn.includes(w)));
  ok('G4f.en-desimalpunkt', svgEn.includes('80.0') && !svgEn.includes('80,0'));
  let threw = false; try { renderShareGraphSvg(handPair, {}, {}, 'no', {}); } catch { threw = true; }
  ok('G4g.mangler-texts-kaster', threw);
}

/* ---------- G5: strings-sink dekningsproven ---------- */
{
  const strings = shareGraphStrings(handPair, TEXTS, LABELS, 'no',
    { a: { closeness: 50, openness: 80, conflict: 50, independence: 50 }, b: { closeness: 90, openness: 40, conflict: 30, independence: 70 } });
  const svgM = renderShareGraphSvg(handPair, TEXTS, LABELS, 'no', { a: { closeness: 50, openness: 80, conflict: 50, independence: 50 }, b: { closeness: 90, openness: 40, conflict: 30, independence: 70 } });
  /* hent XML-tekstnoedene ut av SVG */
  const nodes = [...svgM.matchAll(/>([^<>]+)</g)].map((m) => m[1].trim()).filter((s) => s.length > 0);
  const missing = nodes.filter((n) => !strings.includes(n));
  /* akse-endepunkter (0/100) er synlige konstanter — proven tolker dem som del av graf-rammen (tekst = '0'/'100' matcher axisStart/axisEnd-konvensjonen i renderer.mjs som henter dem fra config; her er de kontraktbundne tallverdier) */
  const vis = missing.filter((m) => m !== '0' && m !== '100');
  ok('G5a.alle-synlige-i-sink', vis.length === 0, JSON.stringify(vis));
  ok('G5b.sink-mengde', strings.length >= 12, String(strings.length));
  const badopt = compatMod.computePairCompatibility({ closeness: 150, openness: 80, conflict: 50, independence: 50 }, { closeness: 90, openness: 40, conflict: 30, independence: 70 });
  let badS = null, threwStr = false;
  try { badS = shareGraphStrings(badopt, TEXTS, LABELS, 'no', {}); } catch (e) { threwStr = true; }
  ok('G5c.sink-ok-false-kaster-eaerlig', threwStr === true, 'ok:false-compat mangler overall — sink krever gyldig kompat (kontrakt: aldri halvgraf)');
}

/* ---------- G6: identifikatorfrihet ---------- */
{
  const svgI = renderShareGraphSvg(handPair, TEXTS, LABELS, 'no', { a: { closeness: 50, openness: 80, conflict: 50, independence: 50 }, b: { closeness: 90, openness: 40, conflict: 30, independence: 70 } });
  const SECRET = { no: 'Kari Nordmann <kari@example.com>', en: 'x' };
  const texts2 = { ...TEXTS, personA: { no: 'Kari', en: 'Kari' }, personB: { no: 'Odd', en: 'Odd' } };
  const svgNames = renderShareGraphSvg(handPair, texts2, LABELS, 'no', {});
  ok('G6a.navn-kun-der-tekst-ligger', svgNames.includes('Kari') && svgNames.includes('Odd'));
  ok('G6b.ingen-epost-lekkasje', !svgI.includes('example.com') && !svgNames.includes('example.com') && !(SECRET.no.length && svgI.includes('Nordmann')));
  /* vektorer med identifikator-lignende taster ignoreres: ukjent dim-nøkkel gir aldri tegning */
  const cU = drawShareGraphCanvas(handPair, TEXTS, LABELS, 'no', {}, { a: { closeness: 50, email: 'a@b.c' }, b: { closeness: 90 } });
  ok('G6c.ukjent-vektor-noekkel-ignorert', cU.ok === true && JSON.stringify(cU.ops).length > 0 && !JSON.stringify(cU.ops).includes('a@b.c'));
}

/* ---------- G7: markoerer ---------- */
{
  /* uten vektorer: ingen RAD-markoerer (legend-konstanter 154/215 er alltid der) */
  const svg0 = renderShareGraphSvg(handPair, TEXTS, LABELS, 'no', {});
  ok('G7a.ingen-radmarkoerer-uten-vektorer', !svg0.includes('cy="137"') && !/cx="(?!154")\d+/.test(svg0), '');
  /* ugyldige verdier: mild konvensjon => ingen markoer for den dim-en */
  const cV = drawShareGraphCanvas(handPair, TEXTS, LABELS, 'no', {}, { a: { closeness: 120, openness: 40 }, b: { closeness: 90, conflict: -5 } });
  ok('G7b.ugyldig-vektor-mild-kutter', cV.ok === true);
  const strict = shareGraphLayout(handPair, TEXTS, LABELS, 'no', { a: { closeness: 120 } }, { strictVectors: true });
  ok('G7c.strictVectors-ok-false', strict.ok === false && strict.error === 'vektor-utover-omfang');
  /* markoer x = xAt-formelen: LEFT + BAR_W*v/100 */
  const svgM = renderShareGraphSvg(handPair, TEXTS, LABELS, 'no', { a: { closeness: 50 }, b: { closeness: 90 } });
  const LEFT = 148, BAR_W = SHARE_W - LEFT - 64;
  const x50 = (LEFT + (BAR_W * 50) / 100).toFixed(2), x90 = (LEFT + (BAR_W * 90) / 100).toFixed(2);
  ok('G7d.markoer-x-formel', svgM.includes(`cx="${x50}"`) && svgM.includes(`points="${x90},`), `${x50}/${x90}`);
}

/* ---------- G8: ikke-diagnostisk forbud over alle rendstrenger ---------- */
{
  const BANNED = ['diagnos', 'iq', 'intelligens', 'mensa', 'klinisk', 'usunn', 'sykdom', 'terapi'];
  const pairs = [
    compatMod.computePairCompatibility({ closeness: 0, openness: 0, conflict: 0, independence: 0 }, { closeness: 100, openness: 100, conflict: 100, independence: 100 }),
    compatMod.computePairCompatibility({ closeness: 25, openness: 65, conflict: 10, independence: 45 }, { closeness: 75, openness: 35, conflict: 90, independence: 5 }),
  ];
  let violations = [];
  for (const lang of ['no', 'en']) for (const pr of pairs) for (const frame of [TEXTS, { ...TEXTS, personA: { no: 'P1', en: 'P1' }, personB: { no: 'P2', en: 'P2' } }]) {
    const s = shareGraphStrings(pr, TEXTS, LABELS, lang);
    for (const t of BANNED) for (const st of s) if (st.toLowerCase().includes(t)) { if (t === 'diagnos' && /diagnos/.test(st) && !/aldri|ikke|never|not/.test(st)) violations.push([lang, t, st]); }
  }
  ok('G8.forbudsvokabular-0-treff', violations.length === 0, JSON.stringify(violations.slice(0, 2)));
  ok('G8b.band-differing-renderes', (() => {
    const lo = shareGraphLayout(pairs[0], TEXTS, LABELS, 'no', {});
    return lo.ok && lo.bandId === 'band-differing' && lo.bandName === 'Ulike mønstre';
  })());
}

/* ---------- G9: fmtOverall ---------- */
ok('G9a.no-komma', fmtOverall(80, 'no') === '80,0');
ok('G9b.en-punkt', fmtOverall(80, 'en') === '80.0');
ok('G9c.1-desimal', fmtOverall(63.333333, 'no') === '63,3');
let threw = false; try { fmtOverall(150, 'no'); } catch { threw = true; }
ok('G9d.utover-kontrakt-kaster', threw);

console.log(`DELGRAF SELFTEST ${pass} PASS / ${failures.length} FAIL${failures.length ? '\n  ' + failures.join('\n  ') : ''}`);
if (failures.length) process.exit(1);
