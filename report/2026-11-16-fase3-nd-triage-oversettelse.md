# FASE 3 — ND-sporet (triage): NO-oversettelse kvalitetskontroll (3-VEIS, brett #3778)

Dato: 2026-11-16. Run: TR-1E0F3E50D2BE (todo-run worker). Kjede: A-utkast-verdikt (full korpus-lesing) → B-kritikk (deterministisk verify-harness) → C-syntese (verdict-JSON + denne rapporten). Verdict: **GJELDENDE — 5 rettelser, 4 holds, 3 avkreftinger.**

## 0. Scope-ærlighet

ND-sporets eksisterende tekslag ved stegstart er **triage-poolen** (40 originale likert-items × NO/EN, ta-0001..0020 + ts-0001..0020, bygd i #3758 commit 65096b3, NO/EN separat forfattet per `spec.languagePlan`) + metaens 5 asrsNear-nearNotes + dimensions-beskrivelsene. **Dyppoolene ADHD/autisme (100+100 items) er ikke bygget** — hjem #3826–#3831, hver med egen NO+EN-separat forfattning (ikke oversettelse). **ASRS-blokken (6Q) er lisensbundet verbatim-adopsjon** fra NYUs offisielle 6Q_Norwegian_final.pdf (`spec.languagePlan.asrsSpecial`) — ikke FASE 3-oversettelsesobjekt, og den finnes ennå ikke i noen def (holdt utenfor live per verdikt #3732 §4 til NYU-skriftlig bekreftelse om skjermbasert remediering foreligger). Dimensions-etikettene (ADHD/Autisme) er låste kontrakt-id-er fra itemspec `domainDecision`.

Stegmandatet «NO-oversettelse neurodivergent (triage + ADHD + autisme)» dekker dermed det som finnes: triage-laget. Item-lagene som mangler kan ikke oversettes, og deres QC hjemmes i pool-bygg-leddene.

## 1. Metode

- Full lesing av alle 80 item-tekster (NO+EN) + 10 nearNotes + 4 dimensions-beskrivelser.
- Mekanisk skann: dobbeltord, dobbeltmellomrom, mellomrom-for-tegn, doblete tegn, svenske vokaler (ö/ä), ø→Å-korrupsjon, halvbokstavsformer (`idè`-klassen), ordantall 8–14, slutttegn, absolutter.
- Full ordliste-gjennomgang; NAOB-oppslag for ordvalgs-suspekter (glippe, idè/idé, halvferdig/halvveis — hentet 2026-11-16).
- Kryssles EN↔NO konstrukt-ekvivalens (id-rekkefølge, akse+tema, asrsNear per id, options byte-paritet).
- Uavhengig maskinverifikasjon i deterministisk harness `tests/schema/nd_pool/_fase3_nd_verify.mjs` — **44/44 PASS** (V0–V9: korpus-renhet, rettelses-bevis, regenerability-byte-paritet, selftest-rekjoring, verdict-konsistens, klinisk/lisens-voktering, options-paritet, dyppool-scope).
- Full regresjon over hele selftest-settet (se §5).

## 2. Rettelser (5, alle anvendt i generator + re-generert inn i def/meta)

| id | klasse | before → after | grunn |
|---|---|---|---|
| ta-0012 | i | `idè` → `idé` | `idè` finnes ikke i norsk ordliste |
| ta-0020 | iii | `glipper av tanken` → `glipper fra tanken` | NAOB: glippe = «ikke holde, gli, smette (fra noen)»; fra-konstruksjonen er den dokumenterte («glippe fra minne/hodet») |
| ta-0020 nearNoteNo (meta) | iii | `termenen` → `terminen` | stavefeil i FASE 4-utvalgsnotatet |
| meta-bygg (generator) | i | `row["noteEn"] = nn_en if near else nn_en` → `row["nearNoteEn"] = nn_en` | død ternary (begge grener identiske) + asymmetrisk nøkkel mot `nearNoteNo` — meta-nøkkel-symmetri var i stykker for de 5 nær-radene |
| selftest S10d | i | `r.nearNoteNo \|\| r.noteEn` → `r.nearNoteNo \|\| r.nearNoteEn` | følger nøkkel-konsolideringen; 78/78 grønn etter |

Regenerability holdt: alle rettelser i `gen_nd_triage_pool.py`, def/meta re-generert, **S13 byte-paritet grønn** ved re-kjoring, og B-harness V4 re-genererer i temp-dir og sammenligner byte-for-byte.

## 3. Avkreftinger

- `halvferdig` (ta-0016) / `halvveis` (ta-0017) er corret sammensetninger — ikke samme klasse som `idè`. RENT.
- NO/EN-parene er separat forfattede (konstrukt-ekvivalente, ordret ulike) — ingen calque-mønster. RENT (S6b/S6c + recount).
- Manglende dyppool-oversettelser er ikke et hull i dette steget — pool-byggingen eies av #3826–#3831. SCOPE-klart.

## 4. Holds

- **H1** ta-0014 har `nearNoteEn` med `asrsNear=False` — note-teksten er selvforklarende («ikke-nær men notert»); forfattervalg beholdt.
- **H2** ASRS-6Q-blokken finnes i ingen def; dens NO-tekst er verbatim-adopsjon (NYU-PDF), ikke oversettelse — scope-avgrensning, eies av lisenskjeden (#3760) og verdikt #3732 §4.
- **H3** FASE 1-mikro-bygget («skåren»→«scoren», «fÅr»→«før», «spÅrsmå»→«spørsmål») fortsatt ufixet i prod i18n — sammenfallende pin fra personlighet/evne/relasjons-kjedene; FASE 1-live-eid tekst, ikke rørt her.
- **H4** ts-0020 «Jeg lar heller telefonen ringe ut enn å svare uten forberedelse.» — komprimert men grammatisk konstruksjon; EN-paret speiler strukturen; godkjent som design.

## 5. Regresjon (full brett, etter rettelsene)

| Sjekk | Resultat |
|---|---|
| nd triage-pool selftest (S0–S14) | 78/78 ALL PASS |
| **_fase3_nd_verify.mjs (B-harness)** | **44/44 PASS — VERIFY OK** |
| nd-itemspec / ipip50 / rel-itemspec / evne-itemspec | ALL PASS ×4 |
| engine / scoring del1+del2 / integrasjon / attention | 72/72 / 27+27 / 5/5 / 57/57 |
| evne b1/b2/t5 + persona b1/b2/b3 | ALL PASS ×6 |
| normering / i18n / ads / puzzle | 107/107 / 22/22 / 42/42 / 99 PASS |
| fase3-rel verify + fase3 psykometrisk verify (søster-kontrakter) | VERIFY OK / 31/31 |
| SSG rebuild + hreflang | 14 pages byte-identisk; VERIFY OK |

## 6. Klinisk språk-voktering (forberedelse til #3779)

Ingenting i de 80 item-tekstene kan leses som diagnose, henvisning eller alvorlighetsvurdering; diagnostisk/instrument-vokabular-skann = 0 treff; ingen ekstremrisiko/selvskade/medisinering; i18n-disclaimerens «Screening, ikke diagnose»-form (note-ns `threshold.screening`) er intakt NO+EN. Triagemodellen klassifiserer aldri personen (out-enum + band-id-er kun). Foreløpig A+B-kontroll — #3779s egen familie-kontroll gjenstår.

## 7. Pins (til operatøren)

1. **P1 — FASE 1-mikro-bygg** (sammenfallende pin fra 4 kjeder): «skåren»→«scoren», «fÅr»→«før», «spÅrsmå»→«spørsmål»; rebuild + full regresjon. Én billig build.
2. **P2 — 3-VEIS-metode**: ask_agent-spawning fra todo-run-kontekst feiler («ukjent chat»); uavhengigheten her er metodeskilt (A-lesing vs B-disk-lesemønster), ikke kontekstkilt — samme dokumenterte modus som personlighet-verdikten. Ønskes ekte kontekstkilt-uavhengighet for #3779: kjør den fra hovedchatten.
3. **P3 — eierskap**: dyppool-item-tekst QC → #3826–#3831; ASRS-tekst → lisenskjeden (#3760 + NYU-bekreftelse); #3779 bør lese denne verdikten + triage-modellen sammen.

## Leveranser

- `tests/schema/nd_pool/_fase3_nd_triage_verdict.json` — verdict, GJELDENDE.
- `tests/schema/nd_pool/_fase3_nd_verify.mjs` — deterministisk verify-harness, 44/44 PASS.
- Rettelser: `gen_nd_triage_pool.py` + re-genererte `def-nd-triage-pool.no.json` (2 tekstrettelser), `_nd_triage_pool_meta.json` (termin-notat + nearNoteEn-nøkler), `selftest_nd_triage_pool.mjs` (S10d-nøkkel).
- Denne rapporten; speil-synk følger commit.
