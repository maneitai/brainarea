# FASE 3 [3-VEIS] Resultattekst evner/IQ — estimat-språk, retest-intervall, «måler ikke intelligens» (todo-run TR-4CF9780358E4)

Dato: 2026-11-16. Søster-steg til #3780/#3781 (personlighet-sporet): denne rapporten dekker
g-score/evne-sporet av FASE 3-resultattekstene. Metode: tre-families-kjede metodeskilt
in-context (samme modus som #3772–#3781 etter ask_agent-ukjent-chat-begrensningen i
run-kontekst): A = mekanisk skann + ordliste-les, B = deterministisk harness, C = syntese/anvending.

## Omfang og grunnlag

FASE 1 kontrakten (report-config.schema.json) sier at FASE 3-resultattekst-stegene erstatter
de oversatte strengene; configs forblir strukturelle. Personlighet-steget (#3780) rørte kun
trait-kontekst. Dette steget dekker det g-score-baserte laget i alle 3 rammekonfiger
(standard/personal/employer): total.g-score.heading/normNote, evne-relevant leseguide og
thirdParty, employer.conversationBasis + noteParaphrases['note.gscore.not-normed'],
dimensions.labels['g'], samt engine-noten note.gscore.not-normed (scoring.js byte-synkronisert
mot i18n no/en). Item-lagene (t1–t5) er ikke i omfanget — de er levert av _fase3_evne_verdict
+ troskaps-søsteren (TR-C38797038E06).

Baselinje re-avledet i økten før endring: report 74/74, scoring 27+27, integrasjon 5/5 — ikke antatt.

## Funn (5, alle rettet)

| # | Klasse | Hvor | Funn | Rettelse |
|---|--------|------|------|----------|
| F1 | i — omfangsfeil arvet fra personlighet-steg | personal+employer leseguide, thirdParty i alle 3 | Tekstene hevdet at rapporten måler «selvrapportering» og at retest-endring er «innbygd i verktøyet» — falskt for evnetester der svarene er objektive oppgavesvar (riktig/feil). Ingen selftest fanget det (semantikk pinnes ikke i dag). | R3: skoping til to testtyper i alle 3 rammer — selvrapportering (personlighet/triage: humør-sårbar, ikke intelligensmål, ikke prosentiler) vs oppgavetester med riktige svar (evner: råtrekk + estimat med usikkerhet, gjenspeiler testens oppgavesett, ikke helhetsvurdering av intelligens) |
| F2 | ii — renderer-avvik | renderer.mjs renderTotalGscore | Ved degenerert theta (alle riktige/alle feil — 1PL MLE udefinert) ble «θ ≈ null» rendret i rapporten. Aldri tidligere fanget: fixture-pathen bruker theta 0.41. | R-bugfix: theta-tekst og CI95 kun når estimert (th !== null). RENDERER_VERSION 1.0.0→1.0.1. Ingen kontraktendring. |
| F3 | i | alle 3 total.g-score.heading | «Ditt resultat» — samme identitet som threshold-blokken; feil identitet for evneresultatet. | R1: «Ditt evneresultat» / «Your ability-test result» (standard+personal); employer beholder «Resultat — grunnlag for samtale». |
| F4 | i | labels['g'] manglet i alle 3 | Fallback ville rendret rå id «g» i grafen for evneresultater — token uten betydning for fremmedleseren. | R4: «Generell evne (g)» / «General ability (g)» i alle 3, fundamentert i def-evne-*.json label/description, troskap verifisert. |
| F5 | i — engine-note | scoring.js + i18n no/en | Noten var rotete: «Gjenoppgitt ikke-kortest mulig intervall i theta-metrikken» + dobbel IQ-nekting. | R5: omformulert: råtrekk + estimert evnenivå (theta) med usikkerhetsintervall; ikke normert IQ-tall — IQ-skala (M=100, SD=15) krever normdata fra normerings-endpointen; intervallet er Wald (±1,96·SE) på theta-metrikken. Byte-synkronisert scoring.js ↔ i18n/no.js ↔ i18n/en.js (paritet verifisert). |

## Rettelser mot stegetekstens krav: estimat-språk og retest-intervall

- **Estimat-språk:** g-score-normNotene sier nå eksplisitt at råtrekk = antall riktige svar,
  at theta er ESTIMERT evnenivå og at intervallet er usikkerhet på estimatet (R2). Pin-fasen
  «ikke et normert IQ-tall» beholdes i alle varianter.
- **Retest-intervall:** standard og personal sier nå ærlig at en ny gjennomføring kan gi et
  annet estimat. INGEN talllovnad (f.eks. «±7 IQ-poeng») — det ville vært ny kvantifisering
  uten måledata; samme disiplin som mood-rettelsen i #3780 (beslutning 15-prinsippet).

## Holds (3, arvet/dokumentert)

1. **note-id-prefiks** («note.gscore.not-normed» som synlig token) — renderer-kontrakt siden
   #3728, krever egen renderer-versjon + schema-punch. Uendret arvet fra søster-verdikten.
2. **testId-fotnote + demo-fixture-banner** — tilsiktet sporbarhet.
3. **profileText tom i alle 3** — ingen pool leverer navngitte profiler; pin videreføres
   (FASE 4 resultat-surface).

## Pins (3)

- **P1:** navngitte profiltekster må designes som skala-band + forfattes per språk (FASE 4 resultat-surface) — arvet.
- **P2:** selftest-hull registrert: rapport-selftester låser struktur, ikke semantisk identitet
  eller family-skoping. Ny E-harness tests/schema/_fase3_gscore_verify.mjs (54 sjekker) dekker
  dette sporet og gjenbrukes i kommende FASE 3/4-steg.
- **P3:** normerings-endpointen er mock-verifisert (107/107) men aldri live (GAP-1, FASE 4);
  ved normering-kontrakt-binding må g-score-tekstene re-leses.

## Verifiseringsbevis (kjørt live i økten)

- **B-harness:** tests/schema/_fase3_gscore_verify.mjs — 54/54 PASS. Ekte scoringpath:
  scoreTest(def-evne-t1-matrise.no, 50 ability-svar hver-5-feil) → 40/50 (80 %), theta estimert
  med CI95, skala g normalisert 80 → renderReport alle 6 rammekonfig×språk: etiketter rendret,
  0 rå id-er, scanBanned 0 brudd, iqScale aldri i output. Degenerat-path (alle feil):
  theta null → «0/50» rendret UTEN theta-tekst (F2-bevis).
- **A-skann:** 232 strenger (3 configs + alle note-tekster): 0 mojibake-signaturer,
  0 kjente korrupt-klassemarkører.
- **Full regresjon etter endring:** report 74/74 · engine 72/72 · scoring 27+27 · integrasjon 5/5 ·
  attention 57/57 · resume 27/27 · repeat 25/25 · handcalc 27/27 · glm-three-resumes 46/46 ·
  i18n 22/22 · ipip50 ALL · evne itemspec + batch1/2/t5 ALL · nd 78/78 · persona ×3 ALL ·
  psykometrisk 31/31 · rel-verify ren · normering 107/107 · ads 42/42 · puzzle 99/99 ·
  puzzle-validitet 24/24 · hreflang 171/171 · SSG build 14 pages (out/ byte-identisk,
  0 git-diff) · demo regenerert for begge språk.

## Arbeidsmetode

- Config-endring via parse-redigering med whitelistet felt-diff (kun tilsiktede felt endret).
- scoring.js er CRLF-fil — første notendring normaliserte linjeavslutninger; gjenopprettet og
  redoet som 2-linjers byte-erstatning med CRLF bevart. Første forsøk feilet på usynkronisert
  anker (skrivefeil i gammel EN-konstant); anker lest direkte fra filen i andre runde.
- Renderer-kommentaren nektet å sitere gjettede brettsteg-id-er: F2-kommentaren refererer til
  run/funn, ikke til en tildelt todo-id (steget har ingen i run-kontekst).
- py_run-arkitekturen: E-harness og verdikt skrevet til _delt via fs_write, kopiert til prod-tre
  via cp (samme mønster som tidligere workers — fs_write lander i sandbox-arbeidskatalog).

Leveranse: tests/schema/_fase3_gscore_verdict.json (GJELDENDE) + rettelser i
report/configs/*.json + renderer 1.0.1 + scoring/i18n note-synk + rapport (denne filen).

---

## VERIFISER (søster-steg, beslutning 14, TR-BA7FC4DC775A) — 2026-11-16

Metode: A = fremmedlesing av alle rendret evne-tekster via ekte scoringpath
(6 ramme/språk-kombinasjoner), B = uavhengig estimat-harness
tests/schema/_fase3_estimat_verify.mjs, C = syntese med rettelse + re-verifisering.

Beslutningsgrunnlag rekonstruert fra arkivert samtalehistorikk (CHT-480D2D880C,
turer 14974–15024): beslutning 14 er IQ-premisset — «IQ måler bare hvor god du er
til å ta IQ-tester ... men det er det verden bruker» + preplan-konkretiseringen
(«vi selger ikke intelligens, vi selger et estimat i den skalaen verden kjenner»),
med retest-praksiseffekten som eksplisitt del av premissen.

### Funn V1 (klasse i, RETTET)

**Employer-rammens g-score normNote manglet retest-erkjennelsen som standard og
personal fikk i dette steget.** Produksjonsrapporten sier eksplisitt «standard og
personal sier nå ærlig at en ny gjennomføring kan gi et annet estimat» — employer
fikk kun IQ-nekting og utvelgelses-forbud. Beslutning 14s kjerne (score øker ved
gjentak) rammer nettopp mottakerleseren i employer-rammen, og #3782 oppgir
retest-intervall som krav uten ramme-unntak. Ingen selftest fanget det.

Rettelse: én setning no/en lagt til med søster-rammenes eksakte ordvalg —
«En ny gjennomføring kan gi et noe annet estimat.» / «A retake can give a somewhat
different estimate.» Ingen tall, ingen ny kvantifisering (beslutning-15-disiplin).
Whitelistet diff: kun de to strengene rørt.

### Estimat-harness (70/70 PASS etter rettelse)

- V1: estimat-/usikkerhets-/råtrekk-vokabular til stede i alle 6 kombinasjoner.
- V2/V3: forbudsord (IQ, intelligens, persentil, validert, sertifisering, Mensa,
  målekvalitets- og talllovnader) forekommer KUN i negert kontekst.
- V5: retest-erkjennelse til stede i alle tre rammer, no + en.
- V6: identiteter bevart; degenerat-path (alle feil) → 0/50 uten θ-tekst, retest-
  tekst beholdt; ingen IQ-tall i rendret output.
- V7: «Generell evne (g)»-etikett i alle 6.

### Re-verifisering og regresjon etter rettelse

Produsent-harness 54/54 uroet · report selftest 74/74 · engine 72/72 · scoring
27+27 · integrasjon 5/5 · attention 57/57 · resume 27/27 · repeat 25/25 ·
handcalc 27/27 · glm-three-resumes 46/46 · i18n 22/22 · ipip50/evne itemspec +
batch1/2 ALL · normering 107/107 · ads 42/42 + dims 67/67 · puzzle 99/99 +
validitet 24/24 · hreflang 171/171 · SSG 14 pages byte-identisk ut/ · demo
regenerert byte-identisk.

### Avkreftinger (2)

1. De 15 regexp-treffene på «diagnose/klinisk» i configs er forbidWord/
   prohibitions-lister — bevisste forbudsord, ikke lovninger.
2. «Ikke psykometrisk validert i denne implementasjonen» i standard-/personal-
   metodeblokken er eksplisitt negasjon (NV-markering), ikke lovning.

### Holds/pins

- H1 arvet uendret: note-id-prefiks («note.gscore.not-normed» som synlig token)
  er renderer-kontrakt siden #3728 — krever egen versjon/punch.
- Pin videreført: ved normerings-endpoint-binding (GAP-1, FASE 4) re-leses alle
  g-score-tekster mot beslutning 14 på nytt.

Leveranse: tests/schema/_fase3_gscore_verify_verdict.json (GJELDENDE) +
_fase3_estimat_verify.mjs + employer-normNote-rettelse + rapport-utvidelse
(denne seksjonen).
