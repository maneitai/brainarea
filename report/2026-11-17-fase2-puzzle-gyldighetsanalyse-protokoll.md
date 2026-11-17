# FASE 2 — Puzzle-gyldighetsanalyse: forhåndsregistrert protokoll + kjørbar pipeline (#3767, FASE 4-korrelasjonssteg)

Status: FULLFØRT 2026-11-17. Leveranse i prod-treet (`F:\maneit\prosjekter\filip-webside-prosjekter\brainarea`), run TR-4363145F6F06 (todo-run worker, [VERIFISER FASE 4]-steget). Designkontrakt: `tests/puzzle/_puzzle_design_v1_1.md` § 3, B3-innarbeidet. Søster-rapport: `report/2026-11-16-fase-puzzle-skaringsgyldighet.md` (F3). Speil `_delt/brainarea` synket.

## Ærlig hovedsvar på steg-kontrakten

**Korrelasjonen puzzle-θ × evne-θ KAN IKKE BESVARES MED TALL I DAG.** Fire datagap står i veien, alle verifisert i kode/fil (ikke gjettet):

| Gap | Bevis | Konsekvens |
|---|---|---|
| G1 — endpoint ikke deployet | `functions/normering.js` header: lagring kun hvis `NORMERING_KV`-binding finnes; github.io gir ærlig `stored:false` | Ingen rader finnes i dag |
| G2 — itemIds lagres ikke | player v0.1.0 `buildNormeringPayload`: `{testId, language, answers[16], durationSec, demographics?}` — ingen itemIds | evne-θ kan ikke rekonstrueres fra en rad (evne-poolene er 40–50 items, uttaket er klientsidig); puzzle-siden er deterministisk (`STANDARD_FLOOR_IDS`) |
| G3 — ingen paringsnøkkel | `validatePostPayload`: payload har per beslutning 9 INGEN enhetsidentifikator; selftest H2 beviser at et cohortKey-felt droppes av dagens grammatikk | «samme enhet» kan ikke etableres per design i dag |
| G4 — evne-wiring mangler | grep 2026-11-17: ingen normerings-POST utenfor puzzle (`puzzle-demo.html:305`) | ingen motpart-rader |

Dette er ikke stegets fiasko — kontrakten § 3 forutsier det eksplisitt og gir dette steget oppgaven å definere analysen («hvem kjører analysen og når — i FASE 4-øyeblikket, ikke i v1-kode»). Leveransen gjør dermed det som kan gjøres: **forhåndsregistrere alt av utvalg og analyse FØR data finnes, og bygge/kvalifisere hele røret på syntetisk data** — slik at FASE 4-korrelasjonssteget kan kjøres verbatim samme dag dataene fins, uten at analysedesign kan driftes etterpå.

## Leveranser (tests/puzzle)

| Fil | Innhold |
|---|---|
| `_validitet_gyldighetsanalyse_protokoll.json` v1.0.0 | **Forhåndsregistrert utvalgs- og analysekontrakt**: inkusjonsregler R1–R5 (sammen cohortKey-par [G3-gap dokumentert], tidsvindu ≤ 7 dager = 604800 s, språk-eksakt-par, testId-whitelist 5 evne-spor + puzzle-v1 med 16/16-krav, fullført-krav); eksklusjonsregler X1–X5 **i låst orden**; min n (full 50 / utforskende 30 / < 30 «kan ikke besvares», begrenset av Fisher-z CI [0.27, 0.68] på r=0.5 ved n=50); tolkningsterskler POSITIVE (r ≥ 0.50 og CI-nedre ≥ 0.30) / WEAK (0.30–0.50) / NONE (< 0.30); runRule (FASE 4-worker verbatim, første kjøring ≥ 30 dager etter G1–G4 lukket, kvartalsvis kadens); personvernavsnitt (beslutning 9 urokkelig, cohortKey ikke enhetsidentitet); G1–G4-katalogen. Endringer etter første ekte kjøring krever ny protokollversjon + ny 3-VEIS. |
| `_validitet_gyldighetsanalyse.mjs` v1.0.0 | **Kjørbar pipeline**, ren ESM, null deps: to armer — (1) syntetisk selftest-arm (default): fabrikkerer par-rader i eksakt endpoint-radform og tester røret end-to-end; (2) live-arm `--data <kv_eksport.json>`: **verbatim samme rør** mot ekte KV-eksport. θ per rad rekonstrueres mot **ekte defs** (def-puzzle-v1.no.json, def-evne-t*.no.json), **ekte `estimateTheta1PL`** og **ekte `scoreTest`** (konsistens-kryss per par — mismatch = eksklusjon), plus EKTE puzzle-player end-to-end (`initStandardRun → openFloor → submitChoice(retry-kontrakt) → advance → buildScorePayload → scoreTest`) beviser θ-rader ≡ spill-skår. Personvern: whitelist-felt-read (`ROW_FIELDS_OK`), J1-skann av egen kilde (comment-stripped, delte tokens), rad-format assert. |
| `_validitet_gyldighetsanalyse_report.json` | Generert rapport (52/52 PASS). |
| Denne rapporten. | |

## Selftest — 52/52 PASS

Gruppesammendrag (fra `_validitet_gyldighetsanalyse_report.json`):
- **A (protokoll)** 7: protokollversjon/todo, R-nøkler, X-orden, minN, primary-metode, G-gap-nøkler, R2-vindutekst.
- **B (θ-rekonstruksjon)** 8: puzzle-radar (16/16, count 12), engine-kryss θ̂ identisk < 1e-9, plausible θ-verdi, **ekte player end-to-end m/retry-kontrakt til identisk θ̂**, evne-rad (20 items, count 10) med engine-kryss, rad uten itemIds → data-error (G2-kontrakten).
- **H (endpoint-kontrakt i dag)** 4: POST OK (16 answers), **cohortKey droppes (G3 bevist)**, server-satt `at`, non-JSON → 400.
- **E (R1–R5)** 10: par OK, 8 dager avvises, 7 dager eksakt aksepteres, 7d+1ms avvises, språk avvises, cohort-mismatch avvises, ikke-evne testId avvises, 15/16 puzzle avvises, null-svar evne avvises, manglende cohortKey avvises.
- **D (X4)** 2: dedupe keeper kun første-AT-rad av to like cohortKey+testId-rader.
- **G (X2/X5/R2 gjennom analysen)** 7: par-dannelse teller riktig (4 av 5), kun-det-gyldige-par-inkludering, X2 fanget 2 (alle-feil + alle-riktig), X5 fanget kort puzzle (< 24 s), R2 fanget 8-dags-par, ingen engine-mismatch, klassifikasjon CANNOT-ANSWER ved n=1.
- **S (end-to-end korrelasjon, ingen RNG)** 5: deterministisk IRT-svargenerator (logistisk sannsynlighet × spredt kvanti) over den latente evne-dimensjonen gir r = 0.871 (n=8 etter X2-ekskludering av 2 taknære), CI ordnet, verdict-klassen gyldig, F3-kryss |r − rCount| innenfor 0.05.
- **J (personvern)** 6: kildeskann (comment-stripped, delte tokens: cookie/email/userAgent/navigator/localStorage/ipify = 0 treff), rad-felter ⊂ whitelist, radfelter komplette.
  I tillegg kryss-sjekk: **uavhengig håndberegning** — count 12 på STANDARD_FLOOR_IDS gir θ̂ 0.5713/SE 0.6284, identisk med rør-output.

## Live-arm kvalifisert (syntetisk eksport, verbatim-kjøring)

80-raders eksport i endpoint-radform → `--data /tmp/...` → **n = 40 par, r = 0.903, ρ = 0.934, rCount = 0.910, verdict EXPLORATORY** — minN-logikken korrekt: 40 er under full-grensen (50), rapporteres så aldri som påstand. Røret er da fasetestet i begge armer med identisk funksjonell oppførsel.

## Metode-kontrakter sett

- **cohortKey (R1)**: klientsidig, tilfeldig, per parring generert — lagres KUN i de to radene som skal matches, ingen localStorage/eksport, ingen HVEM-semantikk. Tidsnærhets-heuristikk alene (som alternativ) er forhåndsforkastet: matcher fremmede uten identitet.
- **R2-tolkningen** er forhåndsregistrert: «≤ 7 dager begge» = maks 7 døgns mellomrom mellom de to sesjonene i paret, uavhengig av rekkefølge.
- **X1-attention** er implementert som noop i dag (ingen per-item-tidslinje i radene ennå); X5-gulvene (QC-kontrakten: puzzle 24 s, t1–t3 75 s, t4/t5 60 s) trer og er i koden.
- **F3-falsifiseringskrysset**: r (θ) og rCount (råscore) skal bevege seg likt; |r − rCount| > 0.15 rapporteres som avvik per protokoll (verifiserings-løftet er da at skåren bærer mer enn highscore-informasjon).

## Verdict

- Analyse-svaret i dag: **CANNOT-ANSWER (G1–G4)** — dokumentert i protokoll + rapport, aldri tall påstand.
- Leveransen står som **data-produktet for steget** kontrakten § 3 krever: med protokollen forhåndsregistrert, røret verbatim-kompatibelt mot ekte data og alle fire gap dokumentert med bevis i kode, avgjøres korrelasjonen i FASE 4 samme dag dataene fins.
- **#3767-selv (deliberasjons-steget)** forblir eget/åpent per B3-kontrakten — dette steget leverer dets data-forutsetninger, ikke dets konklusjon.

## Regresjon

- `tests/puzzle/selftest_puzzle.mjs` **99/99 PASS** (uendret, re-kjørt).
- `tests/functions/_normering_selftest.mjs` **107/107 PASS**.
- `tests/engine/selftest.mjs` **72/72 PASS**; `_scoring_integration.mjs` **5/5 PASS**; `_scoring_selftest_g.mjs` **27/27 PASS**.
- Ingen motorfiler rørt — kun nye leveranser i `tests/puzzle/`.

## Gjenbruk (FASE 4-livssyklusen)

1. Deploy endpoint med `NORMERING_KV` + cohortKey/itemIds-utvidelse (G1+G2+G3); i samme pass: evne-wiring (G4).
2. Samle ≥ 30 dager. Eksporter rader som JSON-array (endpoint-radform).
3. `node tests/puzzle/_validitet_gyldighetsanalyse.mjs --data <kv_eksport.json>` — verbatim.
4. Les `LIVE:`-linja: n, r, ρ, rCount, verdict (POSITIVE/WEAK/NONE/EXPLORATORY/CANNOT-ANSWER). Rapportér og lås protokollversjonen ved første kjøring.
