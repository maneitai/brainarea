/**
 * Genererer tests/schema/demo/share-graf-demo.html — deterministisk demo av
 * delgraf-komponenten ([BYGG] FASE 3, todo #3790) mot EKTE compat-modul
 * (computePairCompatibility over to konstruerte profilvektorer).
 * MARKERT SOM FIXTURE: to demonpersoner med konstruerte skalaer — ikke ekte testdata.
 * Kjoer: node tests/schema/_rel_share_graph_demo.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { computePairCompatibility } from './_rel_compat_model.mjs';
import { renderShareGraphSvg } from './_rel_share_graph.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
mkdirSync(join(HERE, 'demo'), { recursive: true });

/* konstruerte profilvektorer (fixture) — samme par som selftest-G1 */
const A = { closeness: 50, openness: 80, conflict: 50, independence: 50 };
const B = { closeness: 90, openness: 40, conflict: 30, independence: 70 };
const compat = computePairCompatibility(A, B);
if (!compat.ok || compat.overall !== 80.0) throw new Error('demo: compat-fixture endret (forventet 80.0/band-aligned)');

const TEXTS = {
  title: { no: 'Samspill — par-kompatibilitet', en: 'Connection — pair compatibility' },
  contextLine: { no: 'DEMO med konstruerte data (Person 1 / Person 2) — viser delgrafen, ikke ekte testresultater.', en: 'DEMO with constructed data (Person 1 / Person 2) — shows the share graph, not real test results.' },
  overallPrefix: { no: 'Samspill', en: 'Connection' },
  personA: { no: 'Person 1', en: 'Person 1' },
  personB: { no: 'Person 2', en: 'Person 2' },
  pointLine: { no: '50 = skalaens midtpunkt (ikke et gjennomsnitt). Basert på to selvrapporteringer, ikke psykometrisk validert.', en: '50 = the scale midpoint (not an average). Based on two self-reports, not psychometrically validated.' },
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

const heading = { no: 'Delgraf-demo (fixture)', en: 'Share graph demo (fixture)' };
for (const lang of ['no', 'en']) {
  const svg = renderShareGraphSvg(compat, TEXTS, LABELS, lang, { a: A, b: B });
  if (!svg) throw new Error('demo: svg null');
  const html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${heading[lang]} | Brainarea</title>
</head>
<body style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;padding:16px;color:#111827;line-height:1.5">
<p style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:10px 14px;font-size:0.9em">${lang === 'no' ? 'DEMO med konstruerte data (Person 1 / Person 2). Viser delgraf-komponenten (#3790), ikke en ekte test.' : 'DEMO with constructed data (Person 1 / Person 2). Shows the share graph component (#3790), not a real test.'}</p>
<figure style="margin:0">
${svg}
</figure>
<p style="font-size:0.85em;color:#64748b">SVG viewBox 600&times;426. Skalerer proporsjonalt til feed-størrelse; minste font 12 i layoutkoordinater.</p>
</body>
</html>
`;
  writeFileSync(join(HERE, 'demo', `share-graf-demo-${lang}.html`), html);
  console.log('demo ok:', lang, html.length, 'bytes');
}
