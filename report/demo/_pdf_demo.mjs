/**
 * PDF-demo-generator [BYGG] FASE 3, todo-run leaf «PDF-nedlasting av resultat».
 * Kjoer: node report/demo/_pdf_demo.mjs  (node>=20, ingen deps)
 *
 * Regenererer deterministische demo-PDF-er fra EKTE scoringpath (ipip50-big5, alle
 * likert-svar = 3) i standard-rammen, no + en. Skriver:
 *   report/demo/pdf-demo-no.pdf
 *   report/demo/pdf-demo-en.pdf
 * Re-kjoering er byte-identisk (asserts), samme determinismekonvensjon som
 * share-graf-demon (report/_rel_share_graph_demo.mjs-moensteret).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { renderReportPdf } from '../pdf/brainarea-pdf.mjs';
import { scoreTest } from '../../tests/engine/scoring.js';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = fileURLToPath(new URL('../..', import.meta.url));/* ingen trailing slash */
const CFG = (f) => JSON.parse(readFileSync(new URL(`../../report/configs/${f}.json`, import.meta.url), 'utf8'));
const IPIP = JSON.parse(readFileSync(new URL('../../tests/schema/def-ipip50-big5.no.json', import.meta.url), 'utf8'));
const REG = new Uint8Array(readFileSync(new URL('../pdf/fonts/DejaVuSans.ttf', import.meta.url)));
const BOLD = new Uint8Array(readFileSync(new URL('../pdf/fonts/DejaVuSans-Bold.ttf', import.meta.url)));
const md5b = (u8) => createHash('md5').update(u8).digest('hex');
const T0 = 1_700_000_000_000;

const payload = {
  testId: IPIP.id, lang: 'no', itemIds: IPIP.items.map((i) => i.id),
  startedAt: T0, finishedAt: T0 + 60_000, timeSpentSec: 60, expired: false,
  answers: Object.fromEntries(IPIP.items.map((i) => [i.id, { kind: 'likert', lang: 'no', value: 3 }])),
};
const scored = scoreTest(IPIP, payload);
if (!scored.ok) throw new Error('pdf-demo: scoring feilet: ' + JSON.stringify(scored.errors || scored.error));

for (const lang of ['no', 'en']) {
  const a = renderReportPdf(scored.result, CFG('standard'), { lang, fontRegular: REG, fontBold: BOLD });
  const b = renderReportPdf(scored.result, CFG('standard'), { lang, fontRegular: REG, fontBold: BOLD });
  if (md5b(a.bytes) !== md5b(b.bytes)) throw new Error('pdf-demo: ikke deterministisk (' + lang + ')');
  writeFileSync(HERE + `pdf-demo-${lang}.pdf`, a.bytes);
  console.log(`pdf-demo-${lang}.pdf`, a.meta.pages + ' sider,', a.meta.pdfBytes, 'bytes, md5', md5b(a.bytes));
}
console.log('PDF-DEMO REGEN OK (byte-deterministisk)');
