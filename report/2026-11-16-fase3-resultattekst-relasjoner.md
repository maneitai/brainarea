# FASE 3 [3-VEIS] Resultattekst relasjoner — tredjepartslesbarhet (søster til #3782/#3783)

Dato: 2026-11-16. Kjede i run TR-FAE96A45F277 (iterasjon 2 av 41-stegs brett).
Metode: tre-families-kjede metodeskilt in-context (søster-konvensjon):
A = config/renderer-les + NAOB-kontroll, B = whitelistet parse-redigering,
C = deterministisk E-harness med ekte scoringpath.

## Omfang og grunnlag

Relasjonssporets item-lag finnes ikke ennå (FASE 2-pool-leddene #3754/#3756 skippet,
gjenoppkoblet som [BYGG]-kjeden #3822–#3825). Dette steget dekker det som finnes og
renderer i dag: rapportlaget (report/configs/*) som en rel-resultat-vask — etikett-lag,
tredjeparts-forklaringer, terminologi-uniformitet — låst på FASE 1-locked visning
(_rel_itemspec_spec.json: basen for dim-vokabularet; _fase3_rel_no_verdict.json:
rel-oversettelseskjedens 0-rettelses-verdikt).

Baselinje i økten før endring: report 74/74, scoring 27+27, i18n 22/22, gscore 54,
estimat 75, rel-verify 25 — ikke antatt.

## Funn (3, alle rettet)

| # | Klasse | Hvor | Funn | Rettelse |
|---|--------|------|------|----------|
| F1 | i (mangler) | dimensions.labels i alle 3 configs | rel-dims closeness/conflict/independence manglet etiketter; renderer-fallback ville rendret rå id ('closeness' osv.) i grafen for rel-resultater. openness var dekket kun ved id-kollisjon med Big Five-etiketten (verdi identisk). Ingenting fanget det: ingen def finnes for rel ennå, så hullet var usynlig til en def-rel dukker opp. | R1: 4/4 rel-dims no/en låst byte-eksakt til FASE 1-locked vokabular (i18n rel.* + spec.dimensionDecision): Nærhet/Closeness, Åpenhet/Openness, Konflikthåndtering/Conflict handling, Selvstendighet/Independence. |
| F2 | i/ii (form-split) | configs (6 NO-forekomster) vs engine-note | Formsplit i persentil-terminologien: alle 6 config-forekomster 'prosentiler' — scoring.js engine-note 'persentiler' (NAOB: 'persentil' er skjema-formen, 'prosentil' kun crossref). i18n not-lag allerede 'persentiler'. En fremmed leser to former for samme begrep i samme rapporttype. | R2: 'prosentiler'->'persentiler' ×6. Selftest-token S11.K1 + S2 t9-kommentar fulgt med. 'prosentiler' i scoring.js comment + norms-published-warning = hold (dev-note/debug-output, aldri rendret). |
| F3 | i (enumerasjon) | leseguide/thirdParty/conversationBasis (7 strenger, no/en) | Enumerasjonen av selvrapporteringstyper nevnte relasjonstesten ingen steder ('personlighet, triage' i standard-leseguiden, ingen enumerasjon i thirdParty/conversationBasis). Relasjonstesten er FASE 1-live med egen side, men sto usynlig i tekstlagene en tredjepartsleser faktisk får. | R3: '(personlighet, relasjoner, triage)' i alle 3 rammers tredjeparts-relevante tekstlag no/en. Employer-leseguiden beholdt per-type-forklaringen uendret (leses i samtalen, ikke som testkatalog — søster-mønster). |

## Holds (2)

1. **Item-lag-pin:** ingen rel-def finnes i prod ennå — F1 er en forsvarlig ferdigstilling
   av etikett-laget så renderer aldri viser rå dim-id når def-rel-16 kommer i #3822–#3825.
2. **Dev-notes:** 'prosentiler' i scoring.js-kommentar (l.26–27) + norms-published-warning
   (l.338) beholdt. Aldri rendret i rapport-output; scoring.js er CRLF-fil og byte-presisjon
   veier høyere enn terminologisk uniformitet i kodekommentarer.

## Pins (2)

- **Normerings-binding (FASE 4/GAP-1):** ved norms=published-kontrakt må trait-normNote og
  disclosures re-leses — 'ikke persentiler' blir da en kvantifiserings-påstand som trenger
  ny grunnvold (søster-prinsippet fra #3782: ingen tall uten måledata).
- **Harness-gjenbruk:** _fase3_rel_resulttext_verify.mjs (88 sjekker, ekte scoringpath,
  scanBanned-negert kontekst) brukes i verifiseringsleddene til #3822–#3825.

## Bevis (kjørt live i økten)

- **E-harness:** tests/schema/_fase3_rel_resulttext_verify.mjs — 88/88 PASS. Ekte
  scoringpath: konstruert rel-16-fixture (4 rel-dims, likert 1–5 med revers per dim,
  norms none) → scoreTest uniform midt-svar → alle skalaer nøyaktig 50, kompositt 50 →
  renderReport alle 6 ramme×språk: 4/4 etiketter per kombinasjon, 0 rå dim-id-er,
  0 'prosentil' i output, enumerasjon til stede i alle tredjeparts-lag, employer
  forbuds-ren via scanBanned-negert kontekst (søster-metoden fra _fase3_estimat_verify).
- **Full regresjon:** report 74/74 · scoring 27+27 · engine 72/72 · attention 57/57 ·
  integrasjon 5/5 · resume 27 · repeat 25 · handcalc 27 · glm-resumes 46 · i18n 22/22 ·
  ipip50/evne/nd/rel itemspec ALL · person×3 ALL · psykometrisk 31 · normering 107 ·
  ads 42+67 · puzzle 99+24 · hreflang 171 · SSG build 14 pages (out/ byte-identisk,
  0 git-diff) · demo regenerert (tekst-oppdatering synlig).
- **Verdikt:** tests/schema/_fase3_rel_resulttext_verdict.json — GJELDENDE.

## Kilder

- NAOB persentil/proentil/skår (hentet 2026-11-16 — substrat-kilder og web_fetch).
- tests/schema/_rel_itemspec_spec.json (dim-vokabular-lock, engineMapping, defFilePlan).
- tests/schema/_fase3_rel_no_verdict.json (rel-oversettelses-QC-verdikt, F4 speil-sync).
## VERIFISER (søster-leaf #3785-konvensjon, run TR-379C6007F82B)

Uavhengig tredjepartslesbarhets-verifikasjon av leveransen over — egen vinkel, ikke
repetisjon av C-kjeden. Harness: tests/schema/_fase3_rel_resulttext_3rdparty_verify.mjs.

### Metode (4 prover)

- **V3 — fallback-lagen begge veier:** renderer viser rå dim-id når config-etiketter
  mangler (renderer.mjs:120-121 fallback verbatim), og 4/4 rel-etiketter byte-eksakt
  når de finnes. F1-diagnosen dermed bevist i begge retninger, ikke bare antatt.
- **V1 — ekstremprofiler gjennom ekte scoringpath:** uniform pos=1/neg=5 (alle motsvar)
  og pos=5/neg=1 (alle maks): +-+- per dimensjon gir 0/100 per skala og kompositt 0/100
  (null-normaliserte ekstremer). 12 renders (3 rammer × no/en × 2 ekstremer): alle uten
  kast, 0 rå id, 4/4 etiketter, midtpunktstreken uforandret.
- **V4 — forbudsord-skann med negasjonsvindu:** plain-tekst skann over 12 renders —
  'prosentil' 0 treff; iq/intelligens/mensa/diagnos/personlighetsforstyrrelse/klinisk
  evaluert kun i negert kontekst («ikke et intelligensmål», «ikke diagnostiske», osv.).
- **V2 — ærlighetsprøven:** out/ har relasjoner + evne + persona, ingen triage-flate;
  enumerasjonen '(personlighet, relasjoner, triage)' er klarering av rapporttypespekteret
  (renderer-kontrakt), ikke en lovnad om at tre tester er offentlige i dag. Dokumentert
  som kildesannhet med existsSync-anker; flipper til bevis når triage-ruten kommer.

### Resultat

- Egen harness: **214 PASS / 0 FAIL** (Node v22.22.1, 2026-11-16).
- Bygg-leafens harness re-kjørt urørt: 88 PASS / 0 FAIL.
- Søster-tvilling evner: _fase3_estimat_verify.mjs 76 PASS / 0 FAIL.
- Regresjon i økten: report 74/74, i18n 22/22; SSG-rebuild byte-identisk (md5 ×19 filer);
  git-status additiv (kun verifier-harness + denne verdict-filen ny).

### Avkreftet (2)

1. «Renderer kan fabrikere profiltekst ved skalaens endepunkter» — avkreftet: 12/12
   ekstrem-renders gir ingen tolkning, ingen kvantifiserings-påstand, ingen
   profilnavn/band-navn.
2. «Forbudsskann finner påstående bruk av diagnose/intelligens-ord» — avkreftet: alle
   forekomster ligger i negert kontekst i alle 6 ramme/språk-kombinasjoner.

### Verdict

**TREDJEPARTSLESBARHET-VERDIKT: PASS** for relasjons-resultattekster: etikett-lag,
ekstremprofil-toleranse, persentil-form og forbudsord-klassen rene. Én ny pin:

- **Triage-flate-pin:** når triage-ruten lanseres må enumerasjonen + V2-ankeret
  åpnes (dokumentert-gap → bevis). Inntil da lover tekstlaget ikke mer enn UI-et viser,
  fordi teksten beskriver rapporttyper, ikke tester — les full begrunnelse i
  _fase3_rel_resulttext_3rdparty_verdict.json (GJELDENDE).

Full regnskap og ekte bevis-kontekster i _fase3_rel_resulttext_3rdparty_verdict.json.
