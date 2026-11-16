# FASE 3 — Relasjonssporet: NO-oversettelse kvalitetskontroll (3-VEIS, brett #3776)

Dato: 2026-11-16. Kjede: utkast-verdict (A) → B-kritikk (maskin-harness) → C-syntese (denne rapporten). Verdict: **GJELDENDE — 0 rettelser, 2 holds, 3 avkreftinger, 1 scope-notat.**

## 0. Status og scope-ærlighet

Relasjonssporets **item-lag finnes ikke ennå**: relasjonspoolen (60 items × 4 dimensjoner = 240 per `_rel_itemspec_spec.json`) ble aldri bygd — FASE 2-pool-leddene #3754/#3756 ble SKIPPET og er gjenoppkoblet som ny [BYGG]-kjede **#3822–#3825** (per dimensjon: cl/op/cf/iv, NO+EN separat forfattet). «NO-oversettelse relasjoner» kan derfor ikke være «rett pool-tekstene» som personlighet- og evne-kjedene var, fordi det ikke finnes pool-tekster å rette.

Det som **finnes** av NO-tekst i relasjonssporet ved stegstart:

1. **i18n page-ns `rel.*`-laget**: 15 strenger × 2 språk (no.js/en.js), full nøkkel-paritet, rendret live i `out/relasjoner/` + `out/en/relations/`.
2. **Itemspec-ens dimensjons-etiketter** (Nærhet/Åpenhet/Konflikthåndtering/Selvstendighet + engelsk-pars) — låst byte-eksakt mellom i18n og `spec.dimensionDecision`.
3. **Compat-modulens feiltekster** (kode-grep, ikke brukersynlige).

Dette steget er dermed en full deliberasjon over det eksisterende rel-NO-laget + scope-avklaring + eskaleringer. Item-nivå-oversettelses-QC hører hjem i verifiseringsleddene til #3822–#3825.

## 1. Metode

- Full lesing av alle 15 `rel.*`-strenger per språk og den rendrede HTML (gjenoppbygg `node app/build.js` — byte-identisk output, build ok 14 sider; hreflang-verif 171/171).
- Mekanisk gate: dobbeltord, dobbeltmellomrom, mellomrom-for-tegn, doblete tegn, svenske vokaler (ö/ä), ø→Å-korrupsjon (samme klasse som FASE 1-AV-1), ordstamme-suspekter (drömmer/hjemme/ked/ferje-klassen).
- Full ordliste-gjennomgang (73 unike ord i rel-korpuset).
- Ordvalgs-suspekt kontroll mot Det Norske Akademis ordbok (NAOB, hentet 2026-11-16).
- Kryssles EN↔NO paritet, etikett-lock mot spec, og rendret-matching mot i18n-kilden.
- Uavhengig maskinverifikasjon i deterministisk harness `tests/schema/_fase3_rel_verify.mjs` — **25/25 PASS**.
- Full regresjon over hele selftest-settet (se §5).

## 2. Funn

**F1 — rel-korpuset er rent (0 mekaniske brudd).** 15 strenger, 0 funn på alle skannerne; ordlisten ren; rendret HTML matcher i18n eksakt. Ingen rettelser krevdes.

**F2 — `skåren` er feil ordform for test-resultat (HOLD, ikke rettet).** `rel.methodBody` («og skåren per dimensjon er gjennomsnittet ...») og `home.disclaimer` («IQ-skåren vises kun som estimatbånd») bruker «skåren» der NAOBs leksikalske dekning gir «score» som test-resultat-ordet («mål- eller poengstilling ... resultat ved testing»); «skåre»/«skår» i NAOB betyr hakk/sprekk/stripe, og «skåren» er bestemt form av en hunkjønnsform med den betydningen. Formen er derfor subtilt feil, men **begge strengene er FASE 1-live-eide** — samme mottak som personlighet-kjedens uttalelse 3 (option-labels «live-eid, FASE 1-eid live-sak, dokumentert»). Rettelse krever mikro-[BYGG] med rebuild + regresjon. Eskalert i pin-liste sammen med F3 (én billig build fanger begge).

**F3 — AV-1-tekstkorrupsjonen (ø→Å) fra FASE 1 er fortsatt ufixet i prod (FORPLEVET).** `ad.disclaimer` «fÅr» (linje 191) + kodekommentar «spÅrsmå» (linje 187) i `i18n/no.js` — allerede dokumentert i FASE 1-samlet-verifikasjon med spesifisert fiks («før»/«spørsmål»), fortsatt ikke utført. Ikke rel-spor (stegmandatet), men forpletvet i denne filen og gjenganger-suspekt for samme tekstkodeks-klasse. Eskalert i pin-liste.

**F4 — speil-treet (F:\maneit\data\work\_delt\brainarea) manglet #3726-privacy-nøklene i i18n** — synkronisert prod→speil i dette steget (byte-verifisert begge veier). Rel-filene (spec/selftest/compat) var allerede byte-synkronisert.

**F5 — legacy Next-prototype funnet men ikke kilde.** `.next/(no)/relasjoner` (2026-11-02, pre-FASE 1) inneholder Kris' opprinnelige 16-items Samspill-side med hardkodede items (ne/åp/ko/se-ids) — utenfor git, ingen provenans, eldre enn alle FASE 1-konvensjoner. Ikke del av QC-korpuset og ikke kopierbar rett inn i #3822–#3825, men innholdsvis nær spec-vokabularet; kan inspirere pool-forfatterstegene så lenge provenanseksperter dokumenteres.

## 3. Avkreftinger

- **Etikett-divergens `rel.intro` vs `home.card.rel.desc`** («konflikthåndtering» vs «konflikt») → bevisst forkortelse på hjem-kortet; samme 4-dimensjonsvokabular; RENT.
- **Svensk/dansk form i rel-spor** → 0 treff; RENT (korrupsjonsklassen bor i ads-nøkkelen, ikke rel).
- **Manglende item-lag som hull i dette steget** → ikke et hull: pool-byggingen eies av #3822–#3825; oversettelse av det som ikke finnes er umulig, og pool-leddene har 3-VEIS + verify-egne ledd. SCOPE-klart.

## 4. Uttalelser

1. `rel.og.desc` (16 ord) og `rel.methodBody` (21 ord): normale lengder; ingen formulering som utsetter den lovede tidsrammen («ca. 3 minutter»/«rundt fire minutter») eller scorer mer enn motor-ene leverer.
2. Compat-modulen har ingen brukersynlige NO-strenger; band-navn (band-strong/aligned/mixed/differing) og brukertekster eies av #3784 per spec — ingenting å QC-e her.
3. EN-side korrekt og komplett for alle 15 par; ingen endringer (frosen per konvensjon).

## 5. Regresjon (fullt selftest-sett, alle kjørt i dette steget)

| Suite | Resultat |
|---|---|
| rel-itemspec selftest | ALL PASS (75 PASS-linjer) + verify-harness 25/25 |
| engine selftest / scoring del1+del2 | 72/72 / 27+27 PASS |
| scoring-integrasjon / attention | 5/5 / 57/57 PASS |
| ipip50 / nd-itemspec / nd-triage-pool | ALL PASS / ALL PASS / 78/78 |
| evne batch1/batch2/t5 | ALL PASS ×3 |
| persona selftests ×3 | ALL PASS ×3 |
| normering | 107/107 PASS |
| i18n / ads / puzzle | 22/22 / 42/42 / 99 ALL PASS |
| SSG rebuild + hreflang | build ok 14 pages byte-identisk; 171/171 |
| prod↔speil i18n sync | byte-identisk etter synk (F4) |

## 6. Pins (til operatøren)

1. **FASE 1-mikro-[BYGG]** (én billig build håndterer alle): «skåren»→«scoren» i `rel.methodBody` + `home.disclaimer`; «fÅr»→«før» + «spÅrsmå»→«spørsmål» i ad-disclaimer+kommentar; rebuild + full regresjon.
2. **Pool-kjeden #3822–#3825** er item-oversettelsens faktiske hjem — NO/EN separat forfattning per spec.languagePlan gjelder der.

## Leveranser

- `tests/schema/_fase3_rel_no_verdict.json` — verdict, GJELDENDE.
- `tests/schema/_fase3_rel_verify.mjs` — deterministisk verify-harness, 25/25 PASS.
- Denne rapporten.
- Speilsynk: i18n/no.js+en.js prod→speil (F4).
