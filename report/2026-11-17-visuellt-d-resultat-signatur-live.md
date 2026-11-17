# VISUELL-D (#3852) — Resultatside visuell signatur, live-verifisert

Dato: 17.11.2026 · Run: TR-5A7A9A85F00F (leaf 4/5 på TR-33F04462C5CE-brettet) · Commit: 549ca00 · Verdict: `report/_visuellt_d_verdict.json`

## Hva steget leverte

1. **Identitetslinje øverst i resultatet** — `ba-run-title` (testnavnet, f.eks. PERSONA) rendres som første element i resultatvisningen, før «Ditt resultat». Verifisert i ekte DOM (titleOrder = 0).
2. **Band-målestreng** — SVG (viewBox 0 0 320 34) med track (304), fill (skåret proporsjonalt mot skalaens omfang), midtlinje (x=160) og caption på formen «36 % av skalaens omfang». Språket beskriver skalaens omfang, ikke normer eller persentiler — beslutning 13–14-språket står. Tegnes kun ved `scoringType:'trait'` med ikke-klippet, ikke-notComputable composite; ellers vises den ikke heller ikke (gate-testet i S15c-3).
3. **Dimensjonsgraf urokkelig** — eksisterende SVG-dimensjonsgraf (#3790) vises fortsatt under signaturen.
4. **Delingsseksjon under** — `ba-run-share`: merkevarekort («Brainarea» + tagline «Tester du kan stole på — skåret lokalt, ingenting sendt.» på NO, egen EN-tekst) og tre ekte rute-lenker per locale (persona / relasjoner / nevrodiversitet). Aldri lenke uten mål (`shareHref`-gate).
5. **Touchmål** — lenkene målt til 44,1 px klikkhøyde i ekte nettleser (padding `.7rem 0`).

## Underveis-fiks

`ensureFocusRing` kalte `document.head.appendChild` når engine-testene injiserer `head: null` → «Cannot read properties of null» på alle 19 runner-prøver. Fikset med guard i run.js; hele regresjonen grønn etterpå.

## Verifikasjon

- S15c-selftest 37/37 (fixtur-def, e2e-kjede boot→def→scoring→rapport→showResult i stub-DOM, metrisk ærlighet, regresjon, kilde-konsistens) + runner-driver 497/497 (11 scenarier inkl. deep/ND).
- Dobbelt-bygg byte-identisk; GitHub Actions build = success; pages-deploy = success.
- **Live-verifisering** (ekte Chromium mot https://maneitai.github.io/brainarea/persona/, 2026-11-17): full 50-items-gjennomløkking til resultat; PERSONA-linje (order 0), band track 304 / fill 109 / midtlinje 160, caption «36 % av skalaens omfang», delingskort med 3 ekte NO-lenker à 44,1 px, null JS-feil. Deployed run.js bekreftet identisk med HEAD (ba-run-share 16 treff, padding, i18n-nøkler).
- Skjermbilder: `tmp/vd_live_top.png`, `tmp/vd_live_share.png` (+ kopier i `_delt`).

## Åpne avvik

Ingen.
