#!/usr/bin/env node
/**
 * Independent verifier for todo #3721 (DeepSeek family) — dimension measurement
 * of the mock-ad component against preplan DECISION 11.
 *
 * Decision 11 (preplan, chat 1183 turn 15015, preplan turn 15017 — ad rules:
 * test flow is ad-free, ads on landing pages + at/below result, explicitly
 * marked) fixes EXACTLY five real display formats for the mock slots:
 *   medium_rectangle 300x250, large_rectangle 336x280, leaderboard 728x90,
 *   mobile_banner 320x50 (non-sticky), in-feed units between landing sections.
 *
 * Method: this harness does NOT import app/ads.js — it reads the SOURCE TEXT
 * and matches the AD_FORMATS table with line regexes, then re-derives the
 * rendered-markup contract from the renderAd body. A builder selftest that
 * imports the module tests the same code path the builder used; this harness
 * measures the artifact on disk. One deviating width or height = FAIL.
 *
 * Run:  node tests/ads/_verify_dimensions_deepseek.mjs   (node >= 20, no deps)
 * Exit: 0 = pass, 1 = fail. Report JSON written next to this file.
 */
import { writeFileSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
// Dual-path: primary F:/ (Windows node), fallback /mnt/f (WSL) — same pattern
// as the #3716 verifier harnesses.
const CANDIDATES = [
  resolve(HERE, '..', '..'),              // repo root relative to this file
  '/mnt/f/maneit/prosjekter/filip-webside-prosjekter/brainarea',
];
const ROOT = CANDIDATES.find((p) => existsSync(join(p, 'app', 'ads.js')));
if (!ROOT) { console.error('FAIL harness.root-not-found', CANDIDATES); process.exit(1); }

let pass = 0;
const failures = [];
const checks = [];
function check(name, cond, extra) {
  const rec = { name, pass: !!cond, detail: extra === undefined ? null : String(extra) };
  checks.push(rec);
  if (cond) { pass++; console.log(`PASS ${name}`); }
  else { failures.push(name + (extra !== undefined ? ` | ${extra}` : '')); console.log(`FAIL ${name}`, extra ?? ''); }
}

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const src = read('app/ads.js');
const en = read('i18n/en.js');
const no = read('i18n/no.js');

/* ---------- A: AD_FORMATS table vs decision 11 (source-text measurement) ---------- */
const DECISION11 = {
  medium_rectangle: { w: 300, h: 250 },
  large_rectangle:  { w: 336, h: 280 },
  leaderboard:      { w: 728, h: 90 },
  mobile_banner:    { w: 320, h: 50 },
  in_feed:          'fluid',
};
const rowRe = /id:\s*'([a-z_]+)'\s*,\s*w:\s*(\d+|null)\s*,\s*h:\s*(\d+|null)\s*,\s*fluid:\s*(true|false)\s*,\s*spec:\s*'([^']*)'/g;
const rows = {}; let rowCount = 0; let m;
while ((m = rowRe.exec(src)) !== null) {
  rowCount++;
  rows[m[1]] = {
    w: m[2] === 'null' ? null : parseInt(m[2], 10),
    h: m[3] === 'null' ? null : parseInt(m[3], 10),
    fluid: m[4] === 'true', spec: m[5],
  };
}
check('A1.formats-count-is-5', rowCount === 5, String(rowCount));
check('A2.format-id-set-exact',
  Object.keys(rows).sort().join(',') === Object.keys(DECISION11).sort().join(','),
  Object.keys(rows).sort().join(','));
for (const [id, want] of Object.entries(DECISION11)) {
  const row = rows[id];
  if (!row) { check(`A3.${id}.exists`, false, 'missing from AD_FORMATS'); continue; }
  if (want === 'fluid') {
    check(`A3.${id}.fluid`, row.w === null && row.fluid === true, `w=${row.w}, fluid=${row.fluid}`);
    check(`A4.${id}.banded-height-130`, row.h === 130, `h=${row.h}`);
    check(`A5.${id}.spec-in-feed`, row.spec === 'in-feed', row.spec);
    continue;
  }
  const dev = [];
  if (row.w !== want.w) dev.push(`width ${row.w} != ${want.w}`);
  if (row.h !== want.h) dev.push(`height ${row.h} != ${want.h}`);
  if (row.fluid !== false) dev.push(`fluid=${row.fluid}`);
  if (row.spec !== `${want.w}\u00d7${want.h}`) dev.push(`spec "${row.spec}"`);
  check(`A3.${id}.dimensions-${want.w}x${want.h}`, dev.length === 0, dev.length ? dev.join('; ') : 'exact');
}
// V12: no other size literals hiding anywhere in ads.js
const sizeLits = [...new Set([...src.matchAll(/(\d{2,4})\u00d7(\d{2,4})/g)].map((x) => `${x[1]}\u00d7${x[2]}`))];
const known = new Set(['300\u00d7250', '336\u00d7280', '728\u00d790', '320\u00d750']);
const strays = sizeLits.filter((s) => !known.has(s));
check('A6.no-stray-size-literals', strays.length === 0, strays.join(', '));

/* ---------- B: dimension data reaches the rendered markup ---------- */
const raM = src.match(/function renderAd[\s\S]*?\n\}/);
const ra = raM ? raM[0] : '';
check('B1.renderAd-found', !!raM);
check('B2.fixed-style-from-wh', /width:\$\{f\.w\}px;height:\$\{f\.h\}px/.test(ra), 'width/height emitted from w/h data');
check('B3.fluid-box-height-130', /height:130px/.test(ra), 'in-feed banded height');
check('B4.data-ba-format-split', /f\.fluid \? 'fluid' : `\$\{f\.w\}x\$\{f\.h\}`/.test(ra), 'data-ba-format=fluid | WxH');
check('B5.no-script-iframe-img', !/<(script|iframe|img)\b/.test(ra), 'mock renders pure static markup');

/* ---------- C: explicit mock marking (decision 11 requires it) ---------- */
check('C1.mock-data-flag', /data-ba-mock="1"/.test(ra));
check('C2.aria-label', src.includes('aria-label="${label}"') || src.includes('aria-label=\\"${label}"'));
check('C3.mock-badge-span', /ba-ad__badge/.test(ra) && /page\.ad\.mockBadge/.test(ra));
check('C4.disclaimer-span', /page\.ad\.disclaimer/.test(ra));

/* ---------- D: i18n mock texts carry the same dimensions (EN + NO parity) ---------- */
const FIXED = { medium_rectangle: [300, 250], large_rectangle: [336, 280], leaderboard: [728, 90], mobile_banner: [320, 50] };
const adKeyRe = /'ad\.([a-zA-Z_.]+)':/g;
const keyIds = (text) => [...new Set([...text.matchAll(adKeyRe)].map((x) => x[1]))].sort();
const enKeys = keyIds(en), noKeys = keyIds(no);
check('D1.en-8-ad-keys', enKeys.length === 8, enKeys.join(','));
check('D2.key-parity-en-no', enKeys.join(',') === noKeys.join(','), `${enKeys.length} vs ${noKeys.length}`);
for (const [file, text] of [['EN', en], ['NO', no]]) {
  for (const [id, [w, h]] of Object.entries(FIXED)) {
    // Source files escape U+00D7 as literal \u00d7 — match that exact spelling.
    const has = text.includes(`ad.mock.${id}`) && new RegExp(`${w}[^\\n]*u00d7[^\\n]*${h}`).test(text);
    check(`D3.${file}.${id}.dim-text`, has, `expected ${w}x${h} in page.ad.mock.${id}`);
  }
  check(`D4.${file}.in-feed-fluid-text`, /(fluid|flytende)/i.test(text) && text.includes('ad.mock.in_feed'));
  check(`D5.${file}.in-feed-no-fixed-dims`, !/in_feed'?:\s*'[^']*(300|336|728|320)[^']*'/.test(text), 'in-feed must stay fluid');
}

/* ---------- E: scope boundaries — placement-transition (todo #3722) ----------
 * Denne verifikatoren ble bygget for #3721 (komponent-only: build.js rørte ikke
 * ads). #3722 er nøyaktig den dokumenterte overgangen (E-kommentar 2026-11-14:
 * "336x280 result / 320×50 mobile placement CSS arrives with #3722"). Etter
 * #3722 testes scope-grensene videre EKSAKT: build.js importerer kun renderAd
 * ( aldri script/AdSense/aktivering), out-treet inneholder mock-annonser KUN
 * på de tre landingsrutene home/play/about i begge locale — aldri på
 * test-rutene (persona/evne/rel) eller privacy, og aldri script/iframe/img.
 */
const build = read('app/build.js');
check('E1.build-imports-ads-render-only', /import \{ renderAd \} from \'\.\/ads\.js\'/.test(build) && !/(adsbygoogle|googlesyndication|<script)/i.test(build), 'renderAd-import, ingen aktivering');
let outHtml = [];
try { outHtml = walkOut(join(ROOT, 'out')); } catch { outHtml = []; }
function walkOut(dir) {
  const acc = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) acc.push(...walkOut(p));
    else if (e.endsWith('.html')) { if (readFileSync(p, 'utf8').includes('data-ba-ad')) acc.push(p); }
  }
  return acc;
}
const LANDING_SET = ['out/index.html', 'out/play/index.html', 'out/om-testene/index.html', 'out/en/index.html', 'out/en/play/index.html', 'out/en/about/index.html'];
const outSet = outHtml.map((p) => p.slice(ROOT.length + 1).replaceAll('\\', '/')).sort();
check('E2.ads-only-on-landing-routes', JSON.stringify(outSet) === JSON.stringify([...LANDING_SET].sort()), outSet.join(', '));
let css = '';
try { css = read('app/site.css'); } catch { css = ''; }check('E3.ads-css-no-sticky-fixed', !/\.ba-ad[^{]*\{[^}]*(sticky|fixed|position\s*:\s*fixed)/i.test(css) && css.includes('.ba-ad{'), 'ingen sticky/fixed; CSS-leveranse med #3722');

/* ---------- F: placement semantics (todo #3722, decision 11) ----------
 * For each landing page (both locales): exactly 2 mock ads; in-feed first,
 * leaderboard last right before the footer; first ad sits between sections
 * (home: after the cards, before method/disclaimer — play/about: after the
 * intro), never as the FIRST element of <main> (never above the fold as the
 * first thing seen); no external resources. Decision 11:
 * test flow ad-free (E2 excludes the test routes), never between the last
 * question and the result (static pages only), no popup/interstitial/sticky
 * (F5: no sticky/fixed CSS on .ba-ad, verified again here from the OUT tree).
 */
const LANDING = [
  { rel: 'out/index.html', inFeed: 'home-after-cards', bottom: 'home-bottom' },
  { rel: 'out/play/index.html', inFeed: 'play-intro-after', bottom: 'play-bottom' },
  { rel: 'out/om-testene/index.html', inFeed: 'about-intro-after', bottom: 'about-bottom' },
  { rel: 'out/en/index.html', inFeed: 'home-after-cards', bottom: 'home-bottom' },
  { rel: 'out/en/play/index.html', inFeed: 'play-intro-after', bottom: 'play-bottom' },
  { rel: 'out/en/about/index.html', inFeed: 'about-intro-after', bottom: 'about-bottom' },
];
for (const { rel, inFeed, bottom } of LANDING) {
  const h = read(rel);
  const slots = [...h.matchAll(/data-ba-slot="([a-z-]+)"/g)].map((x) => x[1]);
  check(`F1.${rel}.exactly-2-ads-in-order`, slots.length === 2 && slots[0] === inFeed && slots[1] === bottom, slots.join(','));
  const formats = [...h.matchAll(/data-ba-format="([a-z0-9x]+)"/g)].map((x) => x[1]);
  check(`F2.${rel}.in-feed-then-leaderboard`, formats.length === 2 && formats[0] === 'fluid' && formats[1] === '728x90', formats.join(','));
  check(`F3.${rel}.both-mock-marked`, (h.match(/data-ba-mock="1"/g) || []).length === 2);
  const iMain = h.indexOf('<main');
  const iFeed = h.indexOf(`data-ba-slot="${inFeed}"`);
  const iFoot = h.indexOf('<footer');
  const afterIntro = h.indexOf('</p>', iMain);
  check(`F4.${rel}.not-above-fold-after-intro-before-footer`, iMain > -1 && h.indexOf('ba-ad', iMain) > iMain && h.indexOf('ba-ad', iMain) - iMain > 300 && iFeed > afterIntro && h.lastIndexOf('data-ba-slot', iFoot) > -1 && h.lastIndexOf('data-ba-ad', iFoot) > -1 && h.indexOf('data-ba-ad', iFeed) < (h.indexOf('data-ba-ad', iFoot) === -1 ? h.length : h.indexOf('data-ba-ad', iFoot)))
    ;
  check(`F5.${rel}.no-external-resources`, !/<script|<iframe|<img/i.test(h));
}
check('F6.no-sticky-or-fixed-css-on-ba-ad',
  !/\.ba-ad[^{]*\{[^}]*(sticky|position\s*:\s*fixed)/i.test(read('out/site.css')));

/* ---------- verdict + report ---------- */
const verdict = failures.length === 0 ? 'pass' : 'fail';
console.log('---');
console.log(`VERDICT: ${verdict} - ${pass} checks OK${failures.length ? `, ${failures.length} failures` : ''}`);
const report = {
  todo: 3721,
  title: '[VERIFISER DeepSeek] Dimensjonsmaal av ads-komponenten mot beslutning 11',
  decision11: { fixed: FIXED, fluid: 'in_feed' },
  verdict, checks, pass, fail: failures.length, failures,
  root: ROOT, sources: ['app/ads.js', 'i18n/en.js', 'i18n/no.js', 'app/build.js', 'out/ (scan)', 'app/site.css'],
  method: 'source-text regex measurement (no import of app/ads.js), independent of #3720 selftest',
};
writeFileSync(join(HERE, '_verify_dimensions_deepseek_report.json'), JSON.stringify(report, null, 2));
process.exit(verdict === 'pass' ? 0 : 1);
