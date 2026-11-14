# FASE 1 — Annonse-dimensjoner målt mot beslutning 11 (todo #3721, verify)

Status: PASS — 36/36 sjekker under Windows-node og 36/36 under WSL-node (dual-path, samme konvensjon som #3716-harnessene).

## Hva ble målt

Beslutning 11 (preplanen, godkjent av operatøren) låser 5 ekte annonseformater for mock-slots:
medium_rectangle 300×250 · large_rectangle 336×280 · leaderboard 728×90 · mobile_banner 320×50 (non-sticky) · in-feed (fluid bredde, mellom landingsseksjoner).

Metode: harnessen `tests/ads/_verify_dimensions_deepseek.mjs` importerer IKKE app/ads.js — den leser KILDETEKSTEN på disk og matcher AD_FORMATS-tabellen med linje-regex, deretter utledes markup-kontrakten fra renderAd-body. En bygger-selftest som importerer modulen tester samme kodevei byggeren brukte; denne harnessen måler artefakten. Én avvikende bredde/høyde = FAIL.

## Resultat

- AD_FORMATS-tabellen: 5 rader, id-sett eksakt, dimensjoner eksakt 300×250 / 336×280 / 728×90 / 320×50, in_feed fluid (w=null, banded høyde 130, spec «in-feed»).
- Ingen fremmed størrelsesliteral i ads.js (A6).
- Dimensjonsdata når rendert markup: width/height emitert fra w/h-data, in-feed-boks fast høyde 130, data-ba-format = «fluid | WxH».
- Mock-merking: data-ba-mock="1", aria-label, badge («Mock ad»/«Mock-annonse»), disclaimer — beslutning 11 krever eksplisitt merking.
- i18n: 8 ad-nøkler i EN, paritet EN/NO, alle 4 faste formater bærer sin dimensjon i mock-teksten (escape \u00d7), in-feed-tekst holder seg fluid uten fast dimensjon.
- Scope-grenser: build.js importerer ikke ads.js ennå, out/-treet inneholder 0 HTML-filer med ad-markup, ingen sticky-CSS — plassering er #3722, verifisering av den er #3723.

## Regresjon

- tests/ads/_ads_selftest.mjs (byggerens egen): 42/42 PASS (re-kjørt under Windows-node).
- Motor-regresjon uroert: harnessen rører kun tests/ads/ + report/.
- out/-bygg uroert (E2-sjekk).

## Rapport

Maskinlesbar: tests/ads/_verify_dimensions_deepseek_report.json (verdict, alle 36 sjekker, metode).
