#!/usr/bin/env node
/**
 * Verifier for [BYGG] FASE 1 #3718 — hreflang + språkvelger + locale-routing.
 * Kjører mot et bygget out-tre (arg1, default ../out) + kildemodulene.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BASE, canonicalUrl, langSwitchHref, pathToLocale, ROUTES, LOCALES } from './locale.js';
import { RUTE_LISTE } from './pages-data.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, process.argv[2] || join('..', 'out'));

let pass = 0, fails = [];
const ok = (id, cond, extra) => { if (cond) { pass++; console.log('PASS', id); } else { fails.push(id); console.log('FAIL', id, extra ?? ''); } };

const ORIGIN = 'https://maneitai.github.io';
const unesc = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&copy;/g, '©');

/** Forventet URL-mengde per rute/locale fra locale.js. */
const expectedPairs = [];
for (const entry of RUTE_LISTE) for (const locale of LOCALES) expectedPairs.push([locale, entry.route]);

/* V1 — struktur: alle rutenes index.html finnes, og bare disse (+404). */
const built = [];
for (const [locale, route] of expectedPairs) {
  const p = '/brainarea/' + (locale === 'en' ? 'en/' : '') + (ROUTES[route][locale] ? ROUTES[route][locale] + '/' : '');
  const rel = p.slice(BASE.length);
  const file = join(OUT, ...rel.split('/'), 'index.html');
  ok(`V1.exists${locale}:${route}`, existsSync(file), file);
  built.push({ locale, route, path: p, file });
}
const allFiles = [];
(function walk(dir) { for (const f of readdirSync(dir, { withFileTypes: true })) { const fp = join(dir, f.name); if (f.isDirectory()) walk(fp); else allFiles.push(fp); } })(OUT);
const htmlFiles = allFiles.filter((f) => f.endsWith('.html'));
ok('V1.only-expected-html', htmlFiles.length === expectedPairs.length + 1, htmlFiles.length + ' vs ' + (expectedPairs.length + 1)); /* +1 = 404.html */

/* Load EN+NO i18n values for tekst-inventar. */
const { KEYS: EN_KEYS } = await import(pathToFileURL(join(__dirname, '..', 'i18n', 'en.js')).href);
const { KEYS: NO_KEYS } = await import(pathToFileURL(join(__dirname, '..', 'i18n', 'no.js')).href);
const flat = (K) => { const o = []; for (const [ns, names] of Object.entries(K)) for (const v of Object.values(names)) o.push(v); return o; };
const ALLOW = new Set(['Brainarea', '(c) 2026 Brainarea']);
/* switcher-chrome kommer fra pages-data.langSwitcher(), ikke i18n-katalogen: */
ALLOW.add('NO'); ALLOW.add('EN');

/* V2 — hreflang/canonical/switcher per side + V3 tekstkilde-inventar. */
for (const { locale, route, path, file } of built) {
  const s = readFileSync(file, 'utf8');
  const selfUrl = canonicalUrl(locale, route);
  const canon = s.match(/<link rel="canonical" href="([^"]+)"/);
  ok(`V2.canonical:${route}:${locale}`, canon && canon[1] === selfUrl, canon?.[1] + ' vs ' + selfUrl);
  const hNO = s.match(/<link rel="alternate" hreflang="nb-NO" href="([^"]+)"/);
  const hEN = s.match(/<link rel="alternate" hreflang="en" href="([^"]+)"/);
  const hXD = s.match(/<link rel="alternate" hreflang="x-default" href="([^"]+)"/);
  ok(`V2.hreflang.no:${route}:${locale}`, hNO && hNO[1] === canonicalUrl('no', route), hNO?.[1]);
  ok(`V2.hreflang.en:${route}:${locale}`, hEN && hEN[1] === canonicalUrl('en', route), hEN?.[1]);
  ok(`V2.hreflang.xdef:${route}:${locale}`, hXD && hXD[1] === canonicalUrl('no', route), hXD?.[1]);
  const langAttr = s.match(/<html lang="([^"]+)"/);
  ok(`V2.langattr:${route}:${locale}`, langAttr && langAttr[1] === locale);

  /* switcher: aktiv span + inaktiv lenke til motsatt språk, samme rute */
  const swA = s.match(/<a class="rounded-full px-3 py-1\.5 text-gray-400 transition hover:text-gray-600" href="([^"]+)" hreflang="([^"]+)"/);
  const want = langSwitchHref(path);
  ok(`V2.switcher:${route}:${locale}`, swA && swA[1] === want, swA?.[1] + ' vs ' + want);
  if (swA) ok(`V2.switcher-target-exists:${route}:${locale}`, existsSync(join(OUT, ...swA[1].slice(BASE.length).split('/'), 'index.html')), swA[1]);

  /* alle interne hrefs er BASE-relative */
  const hrefs = [...s.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  const bad = hrefs.filter((h) => h.startsWith('/') && !h.startsWith(BASE));
  ok(`V2.subpath-safe:${route}:${locale}`, bad.length === 0, JSON.stringify(bad));

  /* V3 — alle synlige tegn kommer fra i18n + statisk allowlist */
  const noHead = s.replace(/<head>[\s\S]*?<\/head>/, '').replace(/<!--[\s\S]*?-->/g, '');
  const texts = noHead.replace(/<[^>]*>/g, '\n').split('\n').map((x) => unesc(x.trim())).filter((x) => x.length > 0 && x !== '\n');
  const values = [...flat(locale === 'no' ? NO_KEYS : EN_KEYS), ...flat(locale === 'no' ? EN_KEYS : NO_KEYS)].sort((a, b) => b.length - a.length);
  let allCovered = true; let firstBad = '';
  for (const run of texts) {
    let rest = run;
    while (rest.length > 0) {
      const hit = values.find((v) => rest.startsWith(v)) || [...ALLOW].find((v) => rest.startsWith(v));
      if (!hit) { allCovered = false; firstBad = rest.slice(0, 80); break; }
      rest = rest.slice(hit.length).trimStart();
    }
    if (!allCovered) break;
  }
  ok(`V3.text-from-i18n:${route}:${locale}`, allCovered, JSON.stringify(firstBad));
}

/* V4 — locale-routing round-trip mot bygg */
for (const { locale, route, path } of built) {
  const hit = pathToLocale(path);
  ok(`V4.routing:${route}:${locale}`, hit.locale === locale && hit.route === route, JSON.stringify(hit));
}

/* V5 — ny kontrakt: EN-rutene; gamle EN-stier må ikke finnes */
for (const old of ['en/evne', 'en/relasjoner', 'en/om-testene', 'en/personvern']) {
  ok('V5.old-en-gone:' + old, !existsSync(join(OUT, ...old.split('/'))));
}
ok('V5.new-en-ability', existsSync(join(OUT, 'en', 'ability', 'index.html')));
ok('V5.new-en-relations', existsSync(join(OUT, 'en', 'relations', 'index.html')));

/* V6 — sitemap dekker alle ruter (16 etter #ND-WIRE; var 14 hardkodet) */
const sm = readFileSync(join(OUT, 'sitemap.xml'), 'utf8');
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const wantLocs = built.map((b) => canonicalUrl(b.locale, b.route)).sort();
ok('V6.sitemap-complete', locs.length === expectedPairs.length && JSON.stringify(locs.sort()) === JSON.stringify(wantLocs), locs.length + ' locs');

/* V7 — robots + 404 */
ok('V7.robots', readFileSync(join(OUT, 'robots.txt'), 'utf8').includes('Sitemap: https://maneitai.github.io/brainarea/sitemap.xml'));
const nf = readFileSync(join(OUT, '404.html'), 'utf8');
ok('V7.404-redirect', nf.includes('http-equiv="refresh"') === false && nf.includes('<a href="' + BASE + '">'));

/* V9 — ingen duplisert kode: en rute = to locale-medlemmer, verken mer eller mindre */
for (const [r, fam] of Object.entries(ROUTES)) {
  const members = Object.entries(fam).length;
  ok(`V9.pair:${r}`, members === 2);
}

console.log(`\n${pass} PASS, ${fails.length} FAIL`);
if (fails.length) { console.log('FAILED:', fails.join(' | ')); process.exit(1); }
console.log('VERIFY OK');