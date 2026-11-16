# FASE 3 [3-VEIS] Resultattekst personlighet — ærlig språk, mood-effekt, tredjepartslesbar (#3780)

Dato: 2026-11-16. Run TR-9B62C02C4557. Søster-steg til #3781 (les som fremmed).
Metode: tre-families-kjede metodeskilt in-context (samme modus som #3772/#3774/#3776/#3778
etter ask_agent-ukjent-chat-begrensningen i run-kontekst): A = mekanisk skann + ordliste-les,
B = deterministiske verifiseringer, C = syntese/anvending.

## Omfang og grunnlag

Første FASE 3-steg mot resultat-/rapportlaget. FASE 1 bygde renderer + 3 rammekonfiger
(#3728/#3730) med eksplisitt kontrakt: «FASE 3 result-text steps (#3778..#3787) will
replace the translated strings; configs stay structural» (report-config.schema.json
description) — dette steget er personlighets-sporet av den serien: standard+personal+
employer-rammens personlighets-relevante tekstlag for trait-scoring.

## Rettelser (4, alle anvendt i report/configs/*.json)

| # | Klasse | Fil | Før | Etter | Grunn |
|---|--------|-----|-----|-------|-------|
| R1 | i (mangler) | alle 3 | dimensions.labels = {} | 5 Big-Five-etiketter no/en | FASE 1-rapporten plasserte fyll-ansvaret på #3780. Etikettene låses til etikett-verdiktet fra #3772-kjeden (Planlagthet enforced) og live-def-ipip50-big5 |
| R2 | ii (ærlighet) | standard | «Humor og tilstand kan påvirke hvordan en test av deg svarer — …skyve et par prosentpoeng opp eller ned» | «Humør og tilstand kan påvirke svarene dine i en test — humøret når du tar den kan flytte skårene opp eller ned» | klussfest («en test … svarer») + kvantifiseringsløfte («et par prosentpoeng») uten målegrunnlag |
| R3 | ii (ærlighet) | standard (EN) | «…may push a few percentage points up or down» | «…can move your scores up or down» | samme kvantifisering på EN — beslutning 15 gir mood-**forklaring**, ikke tall |
| R4 | i/iii | standard + personal | «prosent-tallet»; «se standard-rammen for hele lesingen av grafen» | «prosenttallet»; «les standard-rammens veiledning til grafen» (EN samordnet) | typo/konstruksjon — minimalt inngrep |

Mood-effect-tekstene i standard/moodEffect.text og moodEffect-forklaringene i leseguiden
behaldt ærlige (øyeblikksbilde-rammen). Ingen av endringene rører det rendret output
formatet; alle er data i configs.

## Holds (2)

1. **profileText forblir tom i alle 3 configs.** Navngitte resultatprofiler («Den
   nysgjerrige strategen»-prinsippet) er levert av ingen FASE 2/3-pool — ingen itemspec
   definerer profilband, og renderer nekter å oppfinne tekst (ukjent profileId = hard-feil).
   Å finne navnavne profiler = eget FASE 4-resultat-surface-steg, ikke dette språksteget.
2. **Fixture-idsene i _fixtures.mjs ('ekstroversi','planlegging' osv.) er norske kallenavn,
   ikke formelle dim-id-er** — de treffer ikke labels-dekningen og rendres verbatim.
   Beholdt bevisst: selftest S11.K6 («en-dim-ids-fallback-dokumentert») ankre akkurat
   den dokumenterte fallback-lagen. Ekte kjøringer bruker formelle dim-ids
   (openness/conscientiousness/…) og rendres nå fullt etikettert.

## Avkreftinger (3)

1. «Ikke et intelligensmål» i standard-lesing (personal-rammen) — negativ påstand,
   teknisk korrekt og utenfor personlighet-striden i trait-konteksten: hold.
2. Employer-konfigen (conversationBasis, prohibitions, noteParaphrases) trengte ingen
   personlighets-endring: forbud-skann ren før og etter.
3. Demoverdi-endringer i demo-filene er avledet (renderer re-kjørt), ikke håndredigert.

## Verifiseringsbevis (B-harness, kjørt live i økten)

- Etikett-troskap: config.labels == live-def-ipip50-big5 (no+en) == alle 3 persona-pooler
  (no+en), 5/5 — PASS.
- Ekte-scoring-path: renderer over persona-lik fixture med formelle dim-ids — labels
  5/5 rendret no+en, 0 rå id-er synlige — PASS.
- Forbud-skann (deterministisk scanBanned) over rendered strings for standard+personal
  (no+en): 0 treff på norm/diagnose/sertifiserings-vokabular.
- Selftester: report 74/74 · engine 72/72 · scoring 27+27 · integrasjon 5/5 · attention
  57/57 · resume 27/27 · repeat 25/25 · handcalc 27/27 · i18n 22/22 · ipip50 ALL ·
  persona 3× ALL · nd 78/78 · rel-verify 25/25 · psykometrisk 31/31 · normering 107/107 ·
  ads 42/42 · puzzle 99/99 · hreflang 171/171 · SSG 14 sider + byte-identisk demo.

## Pin-forslag (operatør-avgjørelse)

- [PIN-kandidat] Navngitte profiltekster (profileText) må designes som skala-band +
  forfattes per språk — blokkerer «navngitt resultat»-kravet fra produktarkitektur v2.
  Forelå posisjon: FASE 4-resultat-surface (sammen med #3722-rest ad-plasser).
- Metode-lignende pin (kjent fra #3764/#3772): re-kjør ekte 3-familier-simulering via
  ask_agent fra hovedchat-kontekst når run-løsningen tillater det.

---

## VERIFISER (sister-steg, les som fremmed, TR-93FA84F1D79E) — 2026-11-16

Metode: A = les-som-fremmed-gjennomgang av rendret output, B = deterministisk harness
(scoreTest(def-ipip50-big5.no, 50× likert=4) → renderReport alle 6 kombinasjoner
standard/personal/employer × no/en; samt fixture-path), C = syntese med rettelse +
re-verifikasjon.

Ekte scoringpath: komposit 57 %, 5/5 Big-Five-etiketter rendret i alle 6, 0 rå dim-id
synlige, scanBanned 0 treff i alle 6 rendringer.

### Funn V1 (klasse i, RETTET)

**Komposit-tallet manglet leserforankring.** «55 %»/«57 %» rendret uten at noen
tekst sier hva tallet er: normNote forklarer prosent-begrepet for skårene generelt,
leseguiden forklarer stolpene — men ikke at samletallet er (vektet) gjennomsnittet
av dimensjonsprosentene. En fremmed kan tolke det som persentil eller ferdighetsnivå
— akkurat det rapporten lover å ikke være.

Rettelse (ett setning no+en per ramme, anvendt):

- standard: «Samletallet er gjennomsnittet av dimensjonsprosentene dine (like
  vekter).» / «The overall figure is the average of your dimension percentages
  (equal weights).»
- personal: samme setning innfelt i eksisterende normNote (før «Det personlige er
  lesingen …»).
- employer: «Samletallet er gjennomsnittet av dimensjonsprosentene (like vekter),
  og leses som en del av samtalegrunnlaget — ikke som en karakter.» / «The overall
  figure is the average of the dimension percentages (equal weights) and is read as
  part of the groundwork for conversation — not as a grade.»

Re-verifikasjon: report-selftest 74/74 (uroert), ekte-path 6/6 rendringer med
composite-expl til stede + forbud ren + etiketter rendret, demo regenerert
(9667/9540 B) + composite-expl til stede i begge, i18n 22/22, ipip50 ALL,
persona_pool ALL, scoring 27/27, hreflang 171 PASS, SSG 14 pages OK.

### Holds (3)

1. **note.trait.not-normed rendres med rå note-id som synlig prefiks** —
   renderer-kontrakt siden #3728 (notat matchbar på id; noteParaphrases-logikken i
   employer-rammen krever id-en). Fremmedleseren møter tokenet; endring krever egen
   renderer-versjon + schema-punch — utenfor dette steget.
2. **testId-fotnoten («[standard] ipip50-big5») + demo-fixture-banner** er tilsiktet
   sporbarhet, ikke støy.
3. **profileText forblir tom** — bekrefter #3780-HOLD: ingen pool leverer navngitte
   profiler; pin videreføres (FASE 4 resultat-surface).

Leveranse: tests/schema/persona_pool/_fase3_resultattekst_verify_verdict.json
(GJELDENDE) + rettelsene i report/configs/*.json + re-genererte demo-sider.
