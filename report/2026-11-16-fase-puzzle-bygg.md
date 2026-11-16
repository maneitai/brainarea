# FASE 2 — Puzzle bygget (#3765): leveranserapport

**Status: FULLFØRT OG VERIFISERT — selftest 99/99 PASS, regresjon uroert.**
Dato 2026-11-16. Run: TR-181B683411DC (todo-run worker, [BYGG] FASE 2). Designkontrakt: `tests/puzzle/_puzzle_design_v1_1.md` (3-VEIS v1.1, verdict GODKJENT MED BETINGELSER, DOC-A7A491D0D0). Speil `_delt/brainarea` synkronisert.

## Leveranser (tests/puzzle)

| Fil | Innhold |
|---|---|
| `_puzzle_itemspec_spec.json` | Kontrakt: identitet (testId 'puzzle-v1', family 'pool'), pool 90 = 30/30/30 L/M/H × 3 undertyper (S1 sekvensfortsettelse, S2 oppdateringsregel, S3 sporingsregel), b-vinduer L[-2,-0.5› M[-0.5,0.5› H[0.5,2.0›, standardrun 16 etasjer 7L/5M/4H, retry fra etasje 9, endless-reglene, delekort tallløst, palett med MÅLTE kontraster,PLAYER-stringer NO/EN |
| `gen_puzzle_pool.py` | Deterministisk generator (ingen RNG): 90 items × NO/EN + meta med full fasitreavledning (regelnøkler per item). To kjøringer = bitvist like filer (selftestet) |
| `def-puzzle-v1.no.json` / `.en.json` | 90 ability-items, 4 options, korrekt fasit-indeks i begge språk (identiske glyph-tokens → eksakt NO/EN-paritet), difficulty i vinduene (L -1.925..-0.575, M -0.425..0.925, H 0.575..1.925) |
| `_puzzle_pool_meta.json` | Per item: undertype, band, b, regel (maskinlesbar), viste tiles, fasit, distraktorer |
| `puzzle-player.mjs` v0.1.0 | Ren state machine (ingen DOM/fs/RNG): start/open/submit/advance, retry-semantikk (etasje ≥ 9, ett ekstra forsøk), første-respons-bokføring, endless-mode (highscore, band-glir L→M→H, H-tyngde fra trekk 24), serialize/deserialize (resume), payloads (score + anonym normering), delekort-tallløs, PLAYER_STRINGS NO/EN |
| `puzzle-demo.html` | Spillbar prototype (tynn wrapper): 16 etasjer med progresjonsbar, retry-status, reveal ved dobbeltfeil, resultat-estimat med BREDT bånd-tekst, delekort, endless, resume-banner, språkvelger NO/EN, tastatur 1–4, aria-labels, annonsfri spillflyt |
| `selftest_puzzle.mjs` | 99 sjekker i 14 grupper, rapport `_puzzle_selftest_report.json` |
| `_puzzle_selftest_report.json` | 99/99 PASS (generert) |

## Designkontraktens 5 bygg-betingelser — alle verified

1. **Første-respons-kontrakt**: `submitChoice` bokfører første valg i `state.firstAnswers` umiddelbart; retry-svar bor utelukkende i `state.attempts`. Score-payload inneholder kun første respons (assertet: E2e–E2g), og `attempts`-nøkkelen finnes aldri i payloadet. Retry-svar KAN aldri nå scoring.
2. **Ærlig språk-assert**: NO+EN resultatspråk inneholder «usikkerhetsbåndet er bredt ved 16 spørsmål» / «the uncertainty band is wide at 16 questions»; skann avviser lover-fraser (normalisert/normert/percentile/IQ-tall) uten bortforklaring (F2–F4). Delekort er talløst (F5–F7).
3. **WCAG AA MÅLT**: relativ luminans beregnet i selftest (G1 × 9 par, min målt 6.53) — ikke «kontrastsjekket». Form+farge-redundans: alle tiles er siffer+form, ingen bokstaver (G2).
4. **Band+sum**: 7L/5M/4H eksakt og strengt monotone blokker (A6–A9); band-toleranse |andel−1/3| ≤ 0.15 per band per undertype (A5 = 10/10/10, perfekt); copyright-skann 0 treff (K1); determinisme bitvis (L1–L4).
5. **Spilltest-anker**: retry-semantikk, reveal-flagg og resume-roundtrip er assertet (E2/E3/J1–J7). Selve spilletesten («er det gøy?» — tidlig-M-frustrasjon, dobbelt-fail-reveal-effekter) eies av #3766 som planlagt; leveransen gir ankerne.

## Verifisert mot ekte motor (ikke stubs)

- `scoring.js v1.0.0 scoreTest`: alle-riktig og alle-feil → theta null med ærlig warning; blandet mønster → theta + ci95; `iqScale:null`, `notNormed:true`, note `note.gscore.not-normed` arvet (D1–D3).
- `render.js v0.5.0 validateTestDef`: begge defs OK (B2).
- AJV mot `test-definition.schema.json v1`: begge defs OK (B1) — id-mønsteret `pz-s<k><band><nn>` er lowercase for schema-kompatibilitet.
- `functions/normering.js validatePostPayload`: puzzle-v1 aksepteres (TEST_ID_RE), 16 svar, `durationSec`, valgfri demografi; POST uten KV → ærlig `stored:false` (H1–H5).
- Endless-nekt: `buildScorePayload`/`buildNormeringPayload` kaster på endless-state (H6, I6) — gamey-laget kan aldri lekke til skår eller normering.
- **Regression over søstrene uroert** (gruppe N): scoring, render, evne-itemspec, normering — alle PASS.

## Viktig avgrensning: #3832-overlapp

Designkontrakt §5 sier «#3765-bygget kan starte med generator-output umiddelbart ettersom generator + selftest er pool-stegets leveranse». Pool-steg #3832 var **ikke pinnet** ved run-start; derfor er generator + pool + selftest bygget HER som én leveranse. **#3832s verifikasjonsled kan gjenbruke `selftest_puzzle.mjs` (gruppene A/C/K/L) og er dermed delvis dekket — gjenstår for #3832s eier: 3-veiskontroll av innholdet og pin-formell godkjenning.** Ingen dobbeltbygging nødvendig.

## Eksterne avhengigheter / åpne punkter (uendret fra kontrakten)

- Delekort-bilde: OG-generator puzzle-variant (#3796-avhengighet) — ikke bygget her.
- Normerings-POSTen peker på `/normering` relativt; fungerer når endepunktet er deployet (#3724).
- Annonser: spillflyt er annonsfri (beslutning 11). Én statisk slot i endless mode er fortsatt [OP-beslutning], ikke bygget.
- #3726 personverntekst-utvidelse med puzzle-felter: fortsatt uten hjem (operatørens plassering).
- Side-promotion (i18n page-rute, build-integrasjon, BA-RUN-mount) er et eget steg — denne leveransen er spilleren + poolen + prototypen.

## Gjenbruk

- Spilleren er dom-fri: side-steget kan montere den direkte (se `puzzle-demo.html` for wiring-eksempel).
- Selftesten kan kjøres i prod-tre OG speil: `node tests/puzzle/selftest_puzzle.mjs` (dual-path: F:/ og /mnt/f).
