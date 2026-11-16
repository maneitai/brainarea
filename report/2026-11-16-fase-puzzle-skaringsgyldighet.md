# FASE 2 — Puzzle skåringsgyldighet [3-VEIS][VERIFISER] — AVVIK BEKREFTET FRA PROMPTSIDEN, FIX-RETNING VERIFISERT, 1PL-«HIGHSCORE»-EGENSKAP DOKUMENTERT

Status: FULLFØRT 2026-11-16, run TR-6E5FD6B419B0 (todo-run worker TR-DA925E33DDCE steg 4 av 47). Bygget som testes: puzzle-pool-v1 (commit 4c2ff4a), player 0.1.0, scoring.js 1.0.0. Kjerne uroet: NEI (selftest 99/99 re-kjørt grønn etter leveransen; ingen motorfiler rørt).

## Leveranser
- tests/puzzle/_validitet_skaringsgyldighet.mjs — gyldighets-harness, 24/24 PASS (V0–V8).
- tests/puzzle/_validitet_skaringsgyldighet_report.json — maskinlesbar rapport med samtlige asserts og detaljer.
- Denne rapporten.

## Metode
Fasit-gyldighet løst med sirkularitetsfri metode (spilltestens A10-leksjon): regelerommet brute-forces og prediksjoner leses fra PROMPTEN (tile-rekker), aldri fra meta.rule. Tre simuleringsarmer mot EKTE scoring.js over EKTE 16-etagers-kurve via EKTE player-API (foerste-respons-kontrakten holdt): (1) as-is selvkonsistent X-leser (svarer buildlets s3-fasit), (2) san-regel-leser (s3: konsistent Y-lesing) møter buildlet, (3) kontrafaktisk fixed-instrument (s3-fasit flyttet til Y-leseren, v1.1 §3-fix-retningen). Simulering er seedet (mulberry32, seed 20261116) og eksplisitt merket som simulering — poolen selv er deterministisk (ingen RNG).

## Funn

### F1 — s3-slot-avvi­ket bekreftet kvantitativt fra promptsiden
- s1: eksakt-én regel-konsistent kandidat i alternativene for 30/30; tvetydighet 0; uløselige 0.
- s2: eksakt-én for 30/30; tvetydighet 0; uløselige 0.
- s3: eksakt-én kun 1/30 (s3h03 — fluke-kollisjonen der X p4 == Y p3), tvetydig 29/30: den regelmessige Y-lesingen og generatoren sin X-lesing er begge forenlige med alle ledd og begge ligger i alternativrommet. Kurve-etasjene E3/E6/E10/E15 (pz-s3l01/pz-s3l02/pz-s3m01/pz-s3h01) er blant de tvetydige — samstemmig med spilltesten (DOC-6FCBBA7126: 29/30 uløselige, s3h03-fluken).
- Kontrafaktisk sjekk: under streng posisjons-paritetslesing (pos 7 = Y-slot) er Y-fasiten eksakt-én for 30/30 → fix-retningen (fasit = Y p3) er verifiserbar og holder hele poolen.
- Distraktor-policy kvantifisert: s1 3/3 per item er 1-rule-off (policy holdt). s2: 2/3 per item — d1/d2 er 1-rule-off, d3 bryter begge regler samtidig (siffer og form) → meta.json-konvensjonen har ikke 1-per-ledd-dekning her, et dokumentasjonspunkt, ikke gyldighetshull. s3s tredje distraktor er en alternativ-lesing (Y-lesingen) — den er «gyldig regel-les», og er nøyaktig derfor s3 er tvetydig og ikke bare vanskelig.

### F2 — θ-rekonstruksjon (simulering, N=200 per nivå, nivåer [-2,-1,0,1,2])
- As-is med selvkonsistent (generatorens) lesing: θ̂ = -2.08/-1.05/-0.02/+0.99/+1.82 (θ* = -2/-1/0/1/2) — god gjenfinning, men verifiserer kun generatoren mot seg selv.
- San-regel-leser mot as-is-buildlet: θ̂(θ*=2) = +0.24, count-tak 11.1/16 — konsistent prompt-lesing STRAFFES systematisk (spilltestens contrafaktiske kalkyle: 12/16, θ +0.57; her målt i gjennomsnitt: 11.1/16, θ̂ +0.24). Dette er den reelle gyldighetsskaden: skåren misleser korrekt regel-lesing som lav evne.
- Fixed-instrument (fasit = Y p3): θ̂ = -2.07/-1.05/+0.10/+1.00/+1.80 — hele rekonstruksjonskurven gjenopprettes; θ̂(2) = 1.80 (straff-versjonen: 0.24). Vinduet er bevart.
- SE-profil (fast kurve, dokumentert ærlig): SE ≈ 0.56–0.60 midt i θ-spektret (ci95-bredde ≈ ±1.10–1.18 i θ-metrikken — designkontraktens «bredt bånd ved 16 items» er målt, ikke bare lovet), opptil ≈ 0.90 ved θ*=2 (taknære mistar informasjon; count=16-personer får ærlig θ̂ = null + warning).

### F3 — Svaret på selve spørsmålet: scoren er (i standard mode) en monoton transformasjon av highscore
1PL MLE over en FAST 16-item-kurve har råskåren som tilstrekkelig statistikk: θ̂ er EKSAKT en funksjon av count (målt spread < 1e-15 per count, både via direkte scoring og gjennom hele player-API-et), monoton i count (V6: 8 riktige uansett mønster/posisjon → identisk θ̂ -0.7854; 15/16 uansett hvilket item som feiler → identisk 2.3554). Pearson(θ̂, count) ≈ 0.992 (S-formen i mappingen gjør den ikke lineær); Spearman 1.0 utenfor takregionen. Konsekvensen er ærlig forpliktende: i standard mode skiller skåren IKKJE mønsterprofi­ler — skåringsmodellen legger i praksis bare til måleusikkerhet (SE/CI: SE varierer fra 0.56 til 0.90 per count-nivå) på toppen av «antall riktige». Konstruktvaliditeten kviler derfor på (a) item-innholdets regel-gyldighet (F1: s1/s2 eksakt-én, s3 avviket — blokkerende), (b) den faste band-kurven (7L/5M/4H), og (c) FASE 4-korrelasjonssteget (puzzle-θ × evne-θ) — ikke på skåringsmodellen. Designkontrakten v1.1 §3 antar allerede dette (ærlig bred-CI, ikkje IQ-skala); dette steget dokumenterer det eksplisitt med tall.

### F4 — Foerste-respons-kontrakten re-verifisert i simulering med retry
De to retry-etasjene (feil første-respons, riktig retry) scorer 14/16: retry-svaret bor KUN i state.attempts og når aldri payloadet; skåren inkluderer bevisst første-respons-feilen (θ̂ 1.54). Dette er kontrakten (B1), verifisert gjennom hele kjeden payload → scoring.js.

## Verdict
- s3-slot-avviket er nå bevist fra to uavhengige kilder (spilltestens spill-data + denne promptsiden-reduksjonen) og er BLOKKERENDE: fix (fasit = Y p3, prompt-basert re-avledning i A10, re-generering, re-spilltest) skjer i [BYGG]-steget etter planen — IKKE her.
- Fix-retningen er nå ogsaa kvantifisert på forhånd: kontrafaktisk instrument gjenoppretter θ-rekonstruksjonen fullt (1.80 vs 0.24 ved θ*=2).
- 1PL-egenskapen (score = monoton funksjon av highscore + SE) er dokumentert og er IKKE et avvik — det er Rasch-egenskapen ved fast kurve; FASE 4-korrelasjonssteget er stedet der konstruktvaliditeten faktisk avgjøres.
- s2-distraktor-deklarasjonen i meta.json (d3: begge-regler-av) bør rettes i samme [BYGG]-pass — dokumentasjon, ikke gyldighet.

## Begrensninger
- F2/F3-simulering er seedet statistikk (fast seed, reproducible), ikke levende-spiller-data; den avgjør strukturelle eigenskaper (tilstrekkeligstatistikk, slot-avviket), ikke norm-data.
- FASE 4-korrelasjonsanalysen (puzzle-θ × evne-θ, utvalgsregler per v1.1 §3) er fortsatt eget brettsteg og forblar uavklart her.
- A10 (selftest re-avledning) er fortsatt formel-mot-formel til [BYGG]-fixen; derfor fanger selftestet ikke s3-slottet og må erstattes med prompt-ro re-avledning i samme pass.

## Regresjon
- tests/puzzle/selftest_puzzle.mjs: 99/99 PASS re-kjort etterpå (uendret). Engine- og normering-selftests uroet ikke (ingen filer rørt utenom nye harness-filer).
