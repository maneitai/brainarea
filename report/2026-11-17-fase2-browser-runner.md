# Browser-runner — BA-RUN-bindingen mellom motor, rapport og sider ([BYGG] todo #3840)

Dato: 2026-11-17 · Worker-leaf av todo #3840 · Lukker hullene fra `2026-11-17-kjoretid-kartlegging.md` (punkter 1–4)

## Levert

1. **Composite-def builder** `app/_composite_defs.mjs` — deterministisk (ingen rng/klokke):
   - `def-evne-g-44.{no,en}.json`: alle 6 temapooler flettet (270 ability-items, id-kollisjonsvak),
     scoring `g-score z100 ci95 maxItems=44` (motor sampler 44 per økt via sessionSizeFor),
     composite.extrafelt: themeDraws 8/8/8/7/7/6, timeBudgetSeconds 1680 (session-blokken i
     _evne_itemspec_spec.json). F2 bandkvoter / F3 undertype-frekvens = engineGaps G1/G3 interim
     (flatt trekk per økt i motorsampleren — dokumentert i spec-en).
   - `def-rel-16.{no,en}.json`: 4 per dimensjon (closeness/openness/conflict/independence),
     2+/2− sign-symmetri, deterministisk pool-orden-seleksjon (FASE 4 item-analyse kan erstatte),
     16 items totalt, trait norms=none, ingen tidsbudsjett (sessionFormDecision).
   - Selftest i bygget (`selftestComposite`): kaster hardt ved drift i pooler.
   - re-bygg er byte-identisk (md5-verifisert).
2. **Runner** `app/run.js` — ES-bootstrap, kopieres til `out/_app/run.js` med `@BA@/ → ./`-rewrites:
   - BA-RUN-markør (`<script id="ba-run-boot" data-ba-run="TEST:LOCALE">`) → def-fetch (modul-
     relative `new URL(..., import.meta.url)` — works fra alle ruter/undermapper) →
     mountRenderer → onComplete → scoreTest(allowPartial:false) → evaluateAttention →
     renderReport (standard-frame, fetchet fra `_app/report/configs/standard.json`) → resultat-ui.
   - Ekstraresultat persistes lokalt (`ba-run:result:<defId>`); reload viser resultatet.
     «Gjenta» tømmer kun egen tests session/used/result-nøkler og reloader. Ingen konto.
   - Attention: DETEKSJON ≠ EKSKLUSJON — statuslinje (clean/flagged med teller fra
     summary.flags), dreper aldri skår.
   - PDF: dynamisk import + DejaVu-fonter som Uint8Array; feiler ærlig (knapp →
     «unavailable»-tekst), aldri stille.
   - Deling: FASE 3-delgrafen er DYADISK (rows:2, to personer) — enkeltbruker-resultat kan
     ikke generere den; ærlig delingstekst nå, par-graf er FASE 4 leveranse. Ingen falsk knapp.
   - Composite-interim: hvis evne-def 404-er, flettes pool-filene runtime (samme kontrakt,
     id `evne-g-44`) med «degradert»-banner; rel/pool-fallback finnes IKKE (seleksjonen er
     byggetid) — viser defMissing-feilboks ærlig.
   - i18n: 11 nye `run.*`-nøkler EN+NO (ui-namespace, EN=base-orden urokkert).
3. **build.js-utvidelse**: composite-defs bygges+valideres først; boot-tag injiseres på
   testruter (persona/evne/relasjoner begge locale; statiske ruter og play er fri);
   runner-pakken kopieres til `out/_app/` (engine, i18n, report, configs, pdf, fonts,
   defs composite + ipip + evne-pooler til `_app/defs/`).

## Selftest (krav: ALL PASS) — `tests/engine/_runner_selftest_driver.mjs`

Child-prosess per scenario (`_runner_selftest_child.mjs`), ekte modulgraf fra `out/_app/run.js`,
stubbede DOM/localStorage/fetch (data fra disken — ekte defs/pooler/config/fonts):

| Scenario | Resultat |
|---|---|
| persona:no (trait, 50 items, rapport, PDF 91 kB, retake) | 66 PASS / 0 FAIL |
| iq:en:degraded (composite 404 → runtime-fallback, g-score, 44 items) | 61 PASS / 0 FAIL |
| rel:en (4 dimensjoner trait) | 32 PASS / 0 FAIL |
| rel:no:missingdef (def 404 → ærlig feilboks) | 3 PASS / 0 FAIL |
| **Totalt** | **162 PASS / 0 FAIL — ALL PASS** |

Selftesten fanget og fikk fikset to ekte runner-feil: fallback-betingelsen sammenlignet
`test` (rutenavn `iq`) med `'evne'` (aldri sant → feilboks i stedet for fallback), og
attention-telleren lest `quality.flags` (liste) i stedet for `quality.summary.flags`
→ `[object Object]`-tekst.

## Regresjon (urokkert)

engine 72/72 · scoring-del1 27/27 · integrasjon 5/5 · attention 57/57 · resume 27/27 ·
repeat 25/25 · i18n 22/22 · ipip50 ALL · evne-itemspec ALL · rel-itemspec ALL ·
nd-itemspec ALL · nd-live-defs 74/0 · nd-triage 78/78 · evne-pool batch1/batch2/t5/t6 ALL ·
puzzle 99/99 · delgraf 46/0 · PDF 105/0 · g-score E-harness 54/0 · hreflang VERIFY OK.

## Ærlige grenser

- Ikke verifisert i ekte nettleser (stub-DOM); visuell QA og #3841-wiring avventes.
  Playwright-verifisering mot file:// kan gjenbruke _fase3_share_browserload-mønsteret.
- F2/F3 sampler-oppgradering (tema-stratifisert trekk, ingen undertype 2x på rad) er
  fortsatt åpen (engineGaps G1/G3) — nå trekt flatt per økt i motoren.
- Delingsgraf og normering-POST ligger i FASE 4 (dyadisk graf + Functions-grense).
- ND-sporet er ikke wired til ruter ennå (live-defs eksisterer fra #3843; wiring = #3841).
