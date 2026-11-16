# FASE 3 [3-VEIS] Resultattekst neurodivergent — KUN generisk deling, henvisning-ansvarsfraskrivelse (todo #3786)

Dato: 2026-11-16. Søster-steg til #3780/#3782/#3783/#3785 i kjeden #3778..#3787.
Metode: tre-families-kjede metodeskilt in-context (søster-konvensjon):
A = config/renderer/def/meta-les + substrat-kontrakt-les (itemspec, lisensverdict,
triagemodell), B = python round-trip-redigering av report/configs med assert per
anker (byte-stil bevart), C = deterministisk harness med EKTE scoringpath.
Kjede fullført i run TR-FB95AD82C8FC.

## Omfang og grunnlag

Mandatet ligger i `_nd_itemspec_spec.json` boardRefs.resultText: «#3786 (resultattekst
neurodivergent — KUN generisk deling)» og «#3787 (streng ikke-diagnose-kontroll)».
Triagemodellen (`_nd_triage_model.mjs`) er eksplisitt: «ingen henvisningstekst —
resultattekst er #3786/#3787 sitt område», og transport-lagen peker på #3794
(fragment-lenke, «ingen persondata krysser grensen»).

Dette steget dekker ND-sporet i rapportteks-laget som det finnes i dag: live
pool-def (nd-triage-pool, 40 items, 2 akser, selftest 78/78) og triage-modellens
fire utfall (out-none/out-adhd/out-autism/out-adhd-autism) — utfalls-avlesningen
er visningslagets (FASE 4), men tekstlaget må allerede i dag være ærlig om deling
og henvisning fordi renderer er generisk over configs. ASRS-6Q er lisensbundet
verbatim-adopsjon (verdict #3732 §2/§4), aldri oversettelsesobjekt, og finnes i
ingen def.

## Funn (2, begge klasse i — mangler, begge rettet)

| # | Hvor | Funn | Rettelse |
|---|------|------|----------|
| F1 | dimensions.labels i alle 3 configs | ND-akse-etikettene `adhd`/`autism` manglet — renderer-fallback (renderer.mjs labelOf, l.120-121) ville rendret rå id i grafen for triage-resultater. Nøyaktig samme hull som rel-F1; live def finnes allerede, så hullet er reelt. | R1: 2/2 akse-etiketter no/en i alle 3 configs, byte-låst til itemspec domainDecision + live def-filer: ADHD/ADHD, Autisme/Autism. Fallback-lagen provet begge veier (harness V2). |
| F2 | disclosures[] i alle 3 configs | Ingen tekst sa at et resultat aldri er en henvisning, og ingenting beskrev delte resultater som generiske — mens triage-sporet produserer utfallstekst og deling følger #3794-fragmentkonvensjonen. | R2: to disclosures i alle 3 configs, no/en: `not-referral` («aldri en henvisning — ingen anbefaling om utredning, erstatter ikke helsepersonell») og `generic-share` («delte resultater er generiske: ingen persondata, ikke dokumentasjon/vurdering av en person»). Verifisert rendret i alle 6 rammespraak-kombinasjoner. |

Ingen renderer-endring: disclosures rendres generisk per config-entry
(renderer.mjs:302-307) — hypotese om kontrakt-utvidelse avkreftet.

### Forbuds-kontekster (håndrefert, harness V4)

Alle 13 forbuds-treff i rendret output (24 renders: 3 rammer × no/en × 2
utfallsprofiler «lav» og «begge») ligger i negert klausul:

- standard no «klinisk»: «Resultatet er ikke medisinsk, psykologisk eller klinisk vurdert»
- standard no «diagnos»: «ikke diagnostiske» (trait-normNote)
- standard no «utredning»/«henvis»: disclosureen selv — «aldri en henvisning» / «ingen anbefaling om utredning»
- standard en «clinical»: «not medically, psychologically or clinically assessed»
- standard en «assessment» ×3: all disclosures + disclaimer-en; «not an overall assessment of intelligence» (leseguide, negert)
- employer no «klinisk»: «ikke en medisinsk, psykologisk eller klinisk vurdering»
- employer en «assessment» ×4 + «clinical»: conversationBasis («not a hiring tool», «not a medical, psychological or clinical assessment», «not a selection, medical or psychological assessment») + disclosures
- personal en «assessment» ×2: disclaimer + deling-disclosure

Teknikk: token-vindu (60 tegn / ≤4 tokens, kommatolerant) + setningsnivå-fallback
(enumerasjoner som «not a medical, psychological or clinical assessment» = 4 tokens
og klausul-negasjon «no recommendation for further assessment» ligger utenfor det
rene vinduet). Begge lagene er deterministiske; kontekstene over er håndreferte.

## Avkreftinger (3)

1. **Renderer trenger ny disclosure-kontrakt** — avkreftet: disclosures er generiske
   config-entries (id + no/en); hele steget er data, motorrørte filer 0.
2. **Forbudsvokteren trenger utvidelse for ND-sporet** — avkreftet i dette stegets
   omfang: threshold-forbidWord + employer-prohibitions fanger diagnostisk vokabular
   på konfig-nivå; ingen påstående kontekst fantes i 24 renders (V4 + dump over).
3. **Triagets trait-kompositt er misvisende og må skjules i tekstlaget** — avkreftet
   som steg-omfang: normNote-lagene forklarer allerede at samletallet er vektet
   gjennomsnitt (#3782-R1), og utfallet beregnes på akse-skårene, aldri komposit
   (itemspec scoringContracts + triage-model.why). Utfalls-lesetekster er FASE 4.

## Holds (3)

1. **ASRS-blokken finnes i ingen def** (verdict #3732 §4: NYU-bekreftelse på
   skjermbasert remediering mangler). Når den live-settes, rendres anker-skår
   separat med egen disclaimer (itemspec asrsIntegration) — tekstlaget røres
   ikke før da (pin).
2. **Utfalls-lesetekster per outcode + OBSERVED-band 40–54 mangler** —
   triagemodellen dokumenterer bandet som «tekst-område (#3786)»; delings-/
   ansvarsfraskrivelses-laget er levert her, per-utfalls-lese-tekster er
   FASE 4 resultat-surface (sammen med navngitte profiltekster, pin fra #3780).
3. **#3787 (streng ikke-diagnose-kontroll) er søster-steg og gjenstår bevisst** —
   den eier dyp-diagnostisk vokabular-kontroll på tvers av alle lag; dette steget
   leverer deling-og-henvisning-laget og har holdt config-nivå-skann ren.

## Pins (4)

- **FASE 4 resultat-surface:** utfalls-lesetekster per outcode + OBSERVED-band +
  navngitte profiltekster (pin videreført fra #3780) — én leveranse, ikke flere lag.
- **ASRS-live:** ved NYU-bekreftelse: re-les disclosures/disclaimer-lagen mot
  anker-visningens adskilte disclaimer-krav (itemspec asrsIntegration).
- **Normerings-binding** (videreført fra #3785): ved norms=published re-les
  «ikke persentiler»-avvisningene; da blir også generic-share/not-referral
  kvantifiserings-angrepet som trener ny grunnvold.
- **Delings-transport (#3794):** fragment-kodingen eier skåretransporten
  (identifikatorfritt). «generic-share»-forpligtelsen avhenger av at det holdes;
  denne steget knytter bare tekstlaget.

## Verifiseringsbevis (C-harness, kjørt live i økten)

`tests/schema/_fase3_nd_resulttext_verify.mjs` — **226/226 PASS, deterministisk**
(2 kjøringer, identisk output):

- **V1** ekte scoringpath mot nd-triage-pool (40 likert-items, uniform midt => begge
  akser 50): rendret i alle 6 rammespraak, 2/2 ND-etiketter byte-låst, 0 rå id,
  henvisning- + delings-disclosures rendret i alle 6.
- **V2** fallback-lagen provet begge veier (labels slettet => rå id synlig;
  labels til stede => byte-låste etiketter) — beviser F1-diagnosen, ikke antatt.
- **V3** triage-modellens fire utfall generert gjennom EKTE payloads
  (lav/adhd-høy/autism-høy/begge — positems 5, crossitems 1 via meta.axis-kartet):
  outcodes = enum-bare, 24 rendringer uten kast.
- **V4** forbuds-skann (diagnos*/henvis*/referral/utredning/assessment/klinisk/
  clinical/lidelse) med token-vindu + setningsfallback: 0 påstående kontekst.
- **V5** identifikatorfri render: ingen item-tekst i result eller HTML, ingen
  personfelt, likert-kun payload.

Full regresjon: report 74/74 · engine 72/72 · scoring 27+27 · integrasjon 5/5 ·
attention 57/57 · resume 27 · repeat 25 · handcalc 27 · glm 46 · i18n 22 ·
ipip50 ALL · nd-triage-pool 78/78 · rel-verify 88 + 3rdparty 214 · gscore 54 ·
estimat 76 · psykometrisk 31 · normering 107 (tre kjøringer; én transient
D.engine-72-blipp under parallel F:-IO, ikke reproduserbar) · ads 42 · puzzle 99 ·
SSG rebuild byte-identisk (out/ 0 diff) · demo regenerert (2 filer).

## Leveranse-omfang

report/configs/{standard,personal,employer}.json (labels + disclosures) + denne
rapporten + verdikt `tests/schema/_fase3_nd_resulttext_verdict.json` + harness
`tests/schema/_fase3_nd_resulttext_verify.mjs`. Demo-filene er avledet (renderer
re-kjørt), ikke håndredigert. out/ ikke bemoet: report-configs er ikke kilde for
out/, og ND-sporet har ingen offentlig testflate ennå (V2-kontrakt i
_fase3_rel_resulttext_3rdparty_verify.mjs flipper ved triage-lansering).

## VERIFISER (streng kontroll — søster-leaf, TR-153341E33660, 2026-11-16)

Uavhengig streng kontroll av leveransen over — «ingen setning som kan leses som
diagnose eller henvisning fra oss» (itemspec #3787-territoriet). Harness:
tests/schema/_fase3_nd_resulttext_3rdparty_verify.mjs — **326 PASS / 0 FAIL**
(Node v22.22.1, to kjøringer identiske). Verdict:
tests/schema/_fase3_nd_resulttext_3rdparty_verdict.json (GJELDENDE).

### Metode (6 prøver, egen vinkel — ikke bygg-harnessens kopi)

- **W1 — bred vokabular-skann:** 47 termer (~2× C-kjedens BANNED, pluss medisin/
  behandling/symptom/syndrom/forstyrrelse/lidelse/pasient/mensa/normal/abnormal/
  mild/moderat/alvorlig/severity osv.) over plain-tekst av ALLE 30 renders
  (5 triage-profiler × 3 rammer × no/en). Korpus er full rendret HTML strippet
  for markup — ikke rendererens strings-sank (se F1). 245 forekomster, og ALLE
  ligger i negert kontekst (token-vindu + setningsnivå-fallback). Alle 49 unike
  term/ramme-kontekster håndrefert: fraskrivelses- og normnote-formuleringer
  («aldri en henvisning», «ingen anbefaling om utredning», «not medically,
  psychologically or clinically assessed», «not percentiles», «no recommendation
  for further assessment», «ikke dokumentasjon eller vurdering av en person»).
  'prosentil': 0 treff (form-homogenitet videreført fra #3785-R2).
- **W4 — henvis-nullregul:** alle henvis/utredning/referral-treff ligger i
  not-referral-disclosureen (carrier-bevis). Henvis-AKSJON (17 mønstre: «ta
  kontakt», «kontakt lege», «søk hjelp», «seek help», «contact your», «referred
  to», «we recommend», «oppfordrer», «bør ta» …): **0 treff** i hele korpuset.
  Teksten går aldri fra fraskrivelse til aksjon.
- **W2 — profil-invarians:** plain html (uten svg) for lav/midt/adhd-høy/
  autism-høy/begge: identiske tekstelement-multimengder ved tallnormalisering i
  alle 6 ramme/språk-kombinasjoner — teksten er profil-uavhengig; ingenting kan
  leses som diagnose ved noe utfall. W2b beviser at ADHD/Autisme-etikett-swap
  mellom profiler forekommer KUN i personal-rammen (sort=desc, skårstyrt), aldri
  standard/employer (sort=def) — config-sort-kontrakten bekreftet begge veier.
- **W3 — lekkasjer:** nearNotes (meta, FASE 4-utvalg) og def.dimensions-
  beskrivelser forekommer aldri i rendret output (30 renders kombinert).
- **W5 — fabrikasjons-prøven:** profileText er tom i dag; renderReport med
  profileId kaster («aldri oppfinne tekst»-kontrakten hevdet i praksis).
- **W6 — korpus-kraft:** 18 korpus-rader, >15 000 tegn — prøven er reell.

### Funn (1, avvik i vokter/sank-laget — IKKE rettet her, motorrorende)

- **F1 — renderer strings-sanken har dekningshull** (renderer.mjs:
  class Strings:52-58, push tar kun ett argument): multi-arg-kall renner aldri
  inn i sanken — `strings.push(h, ...body)` (leseguide-kropper, :322),
  `strings.push(h, b)` (thirdParty.body, :335), `strings.push(scoreTxt,
  bandTxt)` (threshold, :199) og SVG-etikettene (:101-105, :121) mangler i
  `strings.list`, til tross for docstring-løftet «ALLE synlige renderede
  strenger (for ban-scan og QA)». Konsekvens: employer-vokteren
  `scanBanned(strings.list, prohibitions)` (:361) har blindsoner mot
  leseguide/thirdParty/graf-lagene — i dag ufarlig (skann over full korpus finner
  ingen forbuds-term i de ulandete lagene), men kontrakten er brutt og
  meta.strings-QA-avhengigheter underrapporteres. Rettelse følger neste
  renderer-bygg (variadisk push + sank av SVG-etiketter, låst med negasjonstest);
  VERIFISER-leaves i denne kjeden rører ingen motorfiler.
  Bevis: dekningsprov i harnessen + md5-anker under.

### Avkreftet (3)

1. «Rapporten fabrikkerer diagnostiske profilhistorier for flaggede profiler» —
   avkreftet: alle 5 profiler gir identisk tekstmengde (kun tall endres); utfalls-
   lese-tekster finnes ikke i dag (FASE 4-pin).
2. «Påstående diagnose/henvis-spraak finnes i rapportteksten» — avkreftet:
   47-term × 30-render-skann, alle 245 forekomster negert, 0 aksjonsformuleringer.
3. «profileId-kall kan få renderer til å oppfinne diagnostisk profiltekst» —
   avkreftet: hard-kast på tom profileText.

### Regresjon (kjørt live i økten)

report 74/74 · engine 72/72 · scoring 27+27 · integrasjon 5/5 · attention 57/57 ·
i18n 22/22 · nd-pool 78/78 · bygg-harness 226/226 (uroet) · rel-søstre 88 + 214 ·
estimat 76. Leveranse additiv: harness + dump + verdict + rapportutvidelse;
renderer.mjs/configs/def-filer urørt (md5-verifisert). Funn registrert via
finding_add (local, code, renderer strings-sank).
