#!/usr/bin/env node
/**
 * Selftest for ads-komponenten ([BYGG] FASE 1, todo #3720) — mock-kontrakten.
 * Kjør: node tests/ads/_ads_selftest.mjs  (node >= 20, ingen deps)
 *
 * Hva testes (mot preplan beslutning 11 og todo #3721):
 *  A1–A6 — de 5 formatene fins med NØYAKTIG beslutning-11-dimensjoner
 *          (300×250, 336×280, 728×90, 320×50, in-feed fluid) — én avvikende
 *          bredde/høyde = feil ("mål dimensjonene mot beslutning 11").
 *  B1–B10 — markup: mock-merking eksplisitt (aria + data-ba-mock + badge),
 *          determinisme (samme inn -> bytevis lik HTML), ren slot-diff,
 *          ingen ekstern ressurs (<script>/<iframe>/<img>/<url>).
 *  C1–C5 — i18n: alle nøkler i EGEN ad-gruppe i page-ns, paritet NO/EN,
 *          resolver gjennom katalogen (getT); manglende funksjon = hard feil.
 *  D1–D5 — validering: ukjent format, dårlig slot, manglende t => throw;
 *          slot-grammatikk aksepterer reelle plasseringsnøkler.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { AD_FORMATS, adFormat, renderAd } from '../../app/ads.js';
import { KEYS as EN_KEYS } from '../../i18n/en.js';
import { KEYS as NO_KEYS } from '../../i18n/no.js';
import { getT } from '../../i18n/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0;
const failures = [];
function check(name, cond, extra) {
  if (cond) { pass++; console.log(`PASS ${name}`); }
  else { failures.push(name); console.log(`FAIL ${name}`, extra ?? ''); }
}

/* A — formatdata mot beslutning 11 */
const want = {
  medium_rectangle: [300, 250],
  large_rectangle: [336, 280],
  leaderboard: [728, 90],
  mobile_banner: [320, 50],
  in_feed: [null, 130],
};
check('A1.antall-formater-er-5', AD_FORMATS.length === 5, AD_FORMATS.length);
for (const [id, [w, h]] of Object.entries(want)) {
  let f = null;
  try { f = adFormat(id); } catch { /* flagges i A2 */ }
  check(`A2.${id}.eksisterer`, !!f);
  if (f) {
    check(`A3.${id}.dimensjoner=${w}x${h}`, f.w === w && f.h === h, `${f.w}x${f.h}`);
    check(`A4.${id}.spec-streng`, f.spec === (w === null ? 'in-feed' : `${w}×${h}`), f.spec);
    check(`A5.${id}.fluid-flagg`, f.fluid === (w === null));
  }
}
check('A6.ukjent-format-kaster', (() => { try { adFormat('skybanner'); return false; } catch { return true; } })());

/* B — markup-kontrakt */
const tNo = await getT('no');
const tEn = await getT('en');
const htmlNo = renderAd({ format: 'medium_rectangle', slot: 'home-bottom', t: tNo });
const htmlNoAgain = renderAd({ format: 'medium_rectangle', slot: 'home-bottom', t: tNo });
check('B1.determinisme', htmlNo === htmlNoAgain);
check('B2.mock-merket-aria', htmlNo.includes('aria-label="'));
check('B3.mock-data-flagg', htmlNo.includes('data-ba-mock="1"'));
check('B4.mock-badge-tekst', htmlNo.includes(tNo('page.ad.mockBadge')));
check('B5.slot-emit', htmlNo.includes('data-ba-slot="home-bottom"'));
check('B6.ingen-ekstern-ressurs', !/<script|<iframe|<img|src=|http/i.test(htmlNo), 'skal være ren statisk markup');
check('B7.format-attr', htmlNo.includes('data-ba-format="300x250"'));
check('B8.in-feed-fluider', (() => {
  const h = renderAd({ format: 'in_feed', slot: 'about-after', t: tEn });
  return h.includes('data-ba-format="fluid"') && h.includes('ba-ad__box--fluid') && h.includes('height:130px');
})());
check('B9.engelsk-badge-en', renderAd({ format: 'leaderboard', slot: 'home-top', t: tEn }).includes(tEn('page.ad.mockBadge')));
check('B10.slot-endrer-kun-slot', (() => {
  const a = renderAd({ format: 'leaderboard', slot: 'home-top', t: tEn });
  const b = renderAd({ format: 'leaderboard', slot: 'result-under', t: tEn });
  return a.replace('home-top', 'result-under') === b;
})());

/* C — i18n: ad-gruppe i page-ns, paritet, resolver */
const adKeys = ['ad.label', 'ad.mockBadge', 'ad.disclaimer', 'ad.mock.medium_rectangle', 'ad.mock.large_rectangle', 'ad.mock.leaderboard', 'ad.mock.mobile_banner', 'ad.mock.in_feed'];
check('C1.EN-ad.label-eksisterer', typeof EN_KEYS.page['ad.label'] === 'string');
check('C2.EN-alle-8-ad-noekler', adKeys.every((k) => typeof EN_KEYS.page[k] === 'string'));
check('C3.NO-paritet-med-EN(ad.*)', adKeys.every((k) => typeof NO_KEYS.page[k] === 'string'));
check('C4.t-funksjon-kreves', (() => { try { renderAd({ format: 'mobile_banner', slot: 'x-1', t: null }); return false; } catch { return true; } })());
check('C5.i18n-resolver-brukt', tNo('page.ad.mockBadge') !== tEn('page.ad.mockBadge'));

/* D — slot-grammatikk + hard-feil-kontrakt */
const goodSlots = ['home-bottom', 'evne-result-after', 'about-after', 'rel-top', '1'];
check('D1.gyldige-slots-aksepteres', goodSlots.every((s) => {
  try { renderAd({ format: 'in_feed', slot: s, t: tEn }); return true; } catch { return false; }
}));
check('D2.tom-slot-kaster', (() => { try { renderAd({ format: 'in_feed', slot: '', t: tEn }); return false; } catch { return true; } })());
check('D3.ugyldig-tegn-kaster', (() => { try { renderAd({ format: 'in_feed', slot: 'Home_Bot!', t: tEn }); return false; } catch { return true; } })());
check('D4.for-lang-slot-kaster', (() => { try { renderAd({ format: 'in_feed', slot: 'x'.repeat(41), t: tEn }); return false; } catch { return true; } })());
check('D5.slot-maks-40-ok', (() => { try { renderAd({ format: 'in_feed', slot: 'x'.repeat(40), t: tEn }); return true; } catch { return false; } })());

/* Rapport (deterministisk orden, ingen klokke) */
const report = {
  suite: 'ads-selftest',
  version: '1.0.0',
  todo: '#3720',
  pass,
  fail: failures.length,
  failures,
  detail: { formats: AD_FORMATS.map((f) => `${f.id}=${f.spec}`), i18nKeys: adKeys.length },
};
writeFileSync(resolve(HERE, '_ads_selftest_report.json'), JSON.stringify(report, null, 2));
console.log(`\n${pass}/${pass + failures.length} PASS`);
if (failures.length) process.exit(1);
