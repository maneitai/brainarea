# FASE 1 — Rapport-konfig: 3 rammer + én renderer (#3728)

**Dato:** 2026-11-15
**Status:** Bygget og selverifisert (58 PASS / 0 FAIL). Renderer + alle tre configs parsar og renderar ein trait/threshold/g-score-fixture headless på no+en. Standard-rammen (graf + leseguide + profiltekst-plassholdarbygning) byggast vidare på same renderer i #3730 — i denne steget er plomberingen komplett.

## Filer

- `report/report-config.schema.json` — config-schema v1 (draft 2020-12). `frame` ∈ {standard, personal, employer}; `total` har eitt felt per scoringType (trait/threshold/g-score) KVAR med påkrevd `heading`+`normNote` (no/en); `dimensions` (labels, graphic bar|none, midpointMarker, sort, **graphicLabels** — renderer-eigde graford); `profileText` (FASE 3-fyll); `readingGuide`; `thirdParty`; `moodEffect`; `disclosures`; `employer` (conversationBasis + prohibitions + **noteParaphrases**, påkrevd på employer-frame); `share`; `disclaimer`.
- `report/configs/standard.json` — standard-rammen (no/en). Alle tre total-blokkene med ærlige normNotes («prosent av skalaens omfang, ikke normert/diagnostisk», midtpunkt ≠ gjennomsnitt), readingGuide 4 ledd, thirdParty-kontekst, moodEffect påkrevd og present, disclosure-id-ane self-report/no-norms.
- `report/configs/personal.json` — personleg rammme: førstepersons-lesing med eksplisitt «kan bety, aldri hva du ER»; desc-sorterte dimensjoner.
- `report/configs/employer.json` — arbeidsgiver-rammen: KVAR heading/normNote = «Resultat — grunnlag for samtale»; conversationBasis («GRUNNLAG FOR SAMTALE … ikkje ansettelsesverktøy»); prohibitions-liste (ansett/ansettelse/utvelgelse/hire/hiring/candidate/kandidat/selection/diagnose/clinical/klinisk/screening/shortlist); noteParaphrases for alle 3 engine-note-id-ar (arbeidsgiver-rammen siterer aldri engine-notar rått); readingGuide med samtalestart-formuleringar; disclaimer utan ansettelsesvokabular.

## Renderer (`report/renderer.mjs`, v1.0.0 — rensket ES, null dependensar)

`renderReport(result, config, {lang, profileId?}) → {lang, frame, html, svg, strings, meta}`:

1. **Eitt total-blokk per scoringType** (trait composite % / threshold skor-bande / g-score θ+CI95) — KVAR krever `normNote` i config; manglar = hard-feil (ingen skår utan ærlig notering).
2. **Dimensjonsgraf-SVG**: bar 0–100 per skala, midtpunktstrek (dashed) ved 50 med EIGA legend «50 = skalaens midtpunkt (ikke et gjennomsnitt)», skilt frå prosentvissingar og frå `percentOfRange`-figcaption; null/degenererte skalaer får eksplisitt «Ikke beregnelig i denne økten»-tekst — aldri falsk bar.
3. **Engine-notatar** (`result.notes`) verbatim for standard/personal, noteParaphrases-onkraj for employer (ukjent note-id utan paraphrase = hard-feil, aldri stille drop).
4. **Disclosures + leseguide + thirdParty + moodEffect** frå config; profiltekst berre ved eksplisitt `profileId` (aldri oppfinne namn).
5. **Forbuds-scan**: employer-frame scanar ALLE rendera strengar (case-insensitiv substring) mot `employer.prohibitions` med NEKASJONSBEVISSTE regel — «ikke et ansettelsesverktøy» slepr gjennom, «et ansettelsesverktøy» (utan negasjon) kastar. threshold-blokk scanar sine strengar mot `forbidWord`. **positivt krav**: minst ein streng må matche /grunnlag for samtale|groundwork for a conversation/i.
6. **iqScale-negasjon**: `result.total.iqScale` les ALDRI (kode-nivå forbud) — g-score skriv berre θ + CI, aldri IQ-tall.
7. Alle synlege strengar sankerast i `strings[]` (deterministisk orden) — brukt av scans, selftest og QA; same input gir md5-identisk html+svg (S5).

## Verifisering (kjørt)

- `node report/_report_selftest.mjs` — **58 PASS / 0 FAIL**: config-parse ×3, employer-vokabular-forbud (ansettelse/hire/kandidat/candidate), noteParaphrase-kontrakt, renderer over 3 scoringTypar × 3 rammer × 2 språk, normNote-hardkrav (S7 kaster), employer-forbudskast (S8), negasjonsdurchslipp, paraphrase-bruk, ukjent-noteid-hardkrav, determinisme (md5 html+svg), SVG well-formedness (balansetagar).
- Regressionen uroet: `node app/build.js` 14 sider OK; `hreflang-verifier` 171 PASS / 0 FAIL; `i18n-selftest` 22/22 (renderer + configs rører ikkje page-tre).
- Fixture-resultata (trait/threshold/g-score) er HANDKONSTRUERTE i test-fila etter scoringkontrakt v1 — inga engine-avhengigheit i selftesten.

## Bevisste valg

- Bilingual no/en INLINE i configs (ikkje i18n-katalogen): rapportstrengane er del av innhaldsproduseringa (FASE 3-resultattekstar #3778+#3780 overstyrer), medan i18n-katalogen er engine/page-strengar — to ulike kjelder, dokumentert i schema-description.
- **noteParaphrases-onkraj på employer**: engine-notattekstar inneheld screen/diagnose-vokabular av design («Screening, ikke diagnose») — i arbeidsgiver-rammen paraphrasast dei, aldri siterast. (Sikrar mot at «screening»-ordet dukkar opp utan negasjon i ein arbeidsgiver-kontekst.)
- `strings[]`-sank er ein arkitekturgrep, ikkje dekorasjon: forbuds-scan, determinisme-hash og QA les samme lista — ein kjelde for alle synlege ord.
- Schema `additionalProperties:false` overalt i total-blokkane — ukjende scoringTypar i config feilar hardt i staden for å bli stille droppa.

## Åpne punkter

1. `profileText` er tom i alle configs — FASE 3-resultattekst steg (#3780) fyller namngjorte profilar. Renderer nektar å oppfinne tekst i mellomtida (ukjent profileId = kast).
2. Dimensjonslabels (norske/engelske namn per dimensjons-id) fyllast når itemspec-blokkane (#3734+) festar dimensjons-id-ar; i mellomtida viser grafen dimensjons-id verbatim (dokumentert fallback — aldri oppfunne namn).
3. Employer-rammen er renderbar men ikkje eksponerad som side n\u00e5 (ingen rute refererar ho) — utplassering skjer i FASE 3/4 resultatsurface-avgrensinga (#3722-rest avgrensar ad-plass, ikkje report-plass).
4. Negasjons-scanneren er heuristisk (negasjonsmarkør i same setningschunk); #3729-verifieraren les HELE employer-config mot beslutning 7/8 — menneskeleg gjennomgang er slutt-kontrollen, scanneren er berre vokter.


## Addendum — standard-rammen fullført (#3730, samme steg-kjede)

#3730 leveres på toppen av #3728-plomberingen: standard-rammen er nå rendret end-to-end og kvalitetskravene er sjekket mot faktisk utdata (ikke kun config):

- **S11-utvidelsen i `report/_report_selftest.mjs` (74 PASS / 0 FAIL totalt)** sjekker de fire kvalitetskravene fra stegeteksten mot RENDRET html+svg:
  - K1 midtpunkt ≠ prosent-av-maks: dashed midtpunktstrek ved 50 + legend «50 = skalaens midtpunkt (ikke et gjennomsnitt)» vs. prosent-figcaption + % fra bars — to ulike verbale og visuelle lag.
  - K2 ingen norm/diagnose/sertifiserings-påstand: regex-forbud mot percentil-/IQ-/certified-uttrykk + normNote + engine-note («note.trait.not-normed») gjengitt.
  - K3 mood-effekt: moodEffect-teksten er i html (krav på standard-rammen, kaster hvis mangler).
  - K4 tredjepartslesbar: thirdParty-seksjon («For deg som ikke tok testen»), leseguide, kontekstlinje `[standard] fixture-big5` (ramme + testId), begrensninger i ren tekst.
  - K5 håndregnet sanity: kompositt 54.5 = (50+75+20+37.5+90)/5 (like vekter), rundes til 55 % i html.
  - K6 EN-komplett: readingGuide/graf/thirdParty på engelsk; dimensjons-ids vises verbatim (dokumentert fallback til FASE 3-labels finnes).

- **`report/_standard_demo.mjs`** genererer deterministisk demo (fixture-markert) for menneskelig inspektion og #3812-samlet faseverifikasjon:
  - `report/demo/standard-ramme-demo-no.html`
  - `report/demo/standard-ramme-demo-en.html`
  Demo-teksten er eksplisitt merket «DEMO med konstruerte data (testId fixture-big5)».

- Resultat-til-rute-koblingen (hvor standard-rammen vises på siten) er bevisst LIGGENDE: test-rutene er engine-sjiktet (`test-mount`), og resultat-surface-koblingen hører til FASE 3-resultattext-stegene (#3780+) der profiltekstene finnes. Ingen tom rame eksponeres.

**Selftest etter #3730: 74 PASS / 0 FAIL.**
