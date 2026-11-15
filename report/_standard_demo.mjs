/**
 * Genererer report/demo/standard-ramme-demo.html — deterministisk sample av
 * standard-rammen rendret av report/renderer.mjs mot report/configs/standard.json
 * og fixture-resultat i _fixtures.mjs ([BYGG] FASE 1, todo #3730).
 * MARKERT SOM FIXTURE: testId 'fixture-big5', ingen ekte testdata.
 * Kjør: node report/_standard_demo.mjs
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderReport } from './renderer.mjs';
import { RESULT_TRAIT } from './_fixtures.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const config = JSON.parse(readFileSync(HERE + 'configs/standard.json', 'utf8'));

mkdirSync(HERE + 'demo', { recursive: true });
for (const lang of ['no', 'en']) {
  const r = renderReport(RESULT_TRAIT, config, { lang });
  const heading = lang === 'no' ? 'Standard-rammen — demo (fixture)' : 'Standard frame — demo (fixture)';
  const fixtureNote = lang === 'no'
    ? 'DEMO med konstruerte data (testId fixture-big5). Viser rammen, ikke en ekte test.'
    : 'Demo with constructed data (testId fixture-big5). Shows the frame, not a real test.';
  const html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${heading} | Brainarea</title>
</head>
<body style="font-family:system-ui,sans-serif;max-width:720px;margin:0 auto;padding:24px;color:#111827;line-height:1.6">
<p style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:10px 14px;font-size:0.9em">${fixtureNote}</p>
${r.svg ? `<figure class="ba-rep-dimensions">\n${r.svg}\n</figure>` : ''}
${r.html}
</body>
</html>
`;
  writeFileSync(HERE + `demo/standard-ramme-demo-${lang}.html`, html);
  console.log('demo ok:', lang, html.length, 'bytes');
}
