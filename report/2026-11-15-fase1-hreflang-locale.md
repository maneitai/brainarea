# FASE 1 — hreflang + språkvelger + locale-routing (todo #3718)

## Levert

- `app/locale.js` — routing-muterbar kilde: BASE (`/brainarea/`), ROUTES-familier
  (7 ruter × 2 locale, EN-URL-navn: ability/relations/about/privacy som erstatning
  for de root-absolutte `/en/...`-navnene i det gamle Next-bygget — subpath-sikre),
  `localizedPath/canonicalUrl/langSwitchHref/pathToLocale/kaster ved ukjente`.
- `app/pages-data.js` — layout-sjiktet: RUTE_LISTE (7 ruter, testId til motoren),
  layout(route, locale, t) — alle synlige strenger resolvvet gjennom i18n (getT).
- `app/build.js` — SSG-generator: out/ med 14 index.html (7×2), site.css, favicon,
  robots.txt, sitemap.xml (14 locs), 404.html. Deterministisk: re-build bytevis
  identisk (diff -r clean). Bygg: `node app/build.js` (default ../out, --out valgfri).
- `app/site.css` + `app/favicon.ico` — repo-eide kilder (hentet fra det gamle
  out-bygget; bygget er ikke lenger avhengig av artefakter).
- `i18n/en.js`+`no.js` — page-ns lagt til (128 nøkler per språk, full paritet,
  byte-ekakte verdier fra live-sitene). Schema `_key-spec.schema.json` -> v1.1
  (page-ns i required, dokumenterte slots), `_spec.md` utvidet med page-kontrakten.
- `app/_verify_hreflang.mjs` — verifier: 171 PASS / 0 FAIL:
  V1 struktur (14+404, ingen andre HTML), V2 per side canonical=selv,
  hreflang nb-NO/en/x-default, lang-attr, språkvelger-target finnes,
  subpath-sikre lenker, V3 alle synlige tegn fra i18n+allowlist (NO/EN-badge,
  «Brainarea», «(c) 2026 Brainarea»), V4 routing round-trip, V5 ny/old EN-ruter,
  V6 sitemap komplett, V7 robots/404, V9 rute-par = 2 locale.
- Selftester: i18n 22/22 (S1-orden oppdatert til ui,note,aria,page).
- Motor-regresjon uroert: render 72/72, scoring 27/27 + g 27/27 + integrasjon,
  attention 57/57, resume 27/27, repeat 25/25, glm-three-resumes 46/46,
  handcalc-deepseek 27/27.

## Bevisst utelatt i dette steget

- Play-tiles og evne/persona/rel sin kjørende test-flyt: test-mount-merket
  `<!--BA-RUN: id=… test=… locale=…-->` er deploy-punktet; engasjerende
  run-lim (engine render.js mot mount-punktet) tilhører FASE 2-stegene.
- `HREFLANG_ORDER`-konstanten i build.js er død kode (skrevet før alternativ-
  orden ble fast); fjernes i første vedlikeholds-runde.
- Sitemap-lastmod er dato-pinnet (deterministisk bygg).

## Divergens mot gamle byggefeil (bevisst rettet)

- Per-side canonical (gammel: alle undersider pekte på hjem).
- Root-absolutte lenker (gammel: /en/, /favicon.ico brekker under /brainarea/).
- EN-rute-navn som kolliderer med NO (gammel: en/evne en/relasjoner).
