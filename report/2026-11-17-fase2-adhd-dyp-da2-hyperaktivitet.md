# FASE 2 — ADHD-dyp pool del 2 «DA2 Hyperaktivitet/impulsivitet» levert: 35 originale items per språk

**Leaf:** [3-VEIS][BYGG] FASE 2 ADHD-dyp pool del 2: DA2 (todo #3827) — worker TR-044804AEA811, iterasjon 1.
**Brett:** ADHD-dyp-blokken (#3826 → #3827 → #3828) under #3760-arkitekturen. **Dato:** 2026-11-17.
**Kontrakt:** `tests/schema/_nd_itemspec_spec.json` (nd-itemspec-v1, PROPOSED; GJELDENDE ved #3813) + lisensverdikt DOC-C8C02AD272 (#3732, GJELDENDE).
**Søster-leveranser i sporet:** triage-pool (#3758), ADHD-dyp del 1 DA1 (#3826) — samme konvensjon, samme options-anker, samme vaktstruktur.

## Leveranser (5 filer i `tests/schema/nd_pool/`)

| Fil | Innhold |
|---|---|
| `def-nd-adhd-dyp-pool-da2.no.json` / `.en.json` | 35 likert-items per språk, family pool, scoring trait `[da2 weight 1]` norms none, dim `[da2]` med NO-etikett byte-identisk med spec `deepPoolDecision.adhdThemes[1].name` («Hyperaktivitet og impulsivitet») |
| `_nd_adhd_dyp_meta_da2.json` | 1 rad per item (id/dimension/theme/asrsNear/nearNote), themeLabels x5, themeCounts 7/7/7/7/7, licenseBasis/authoringRule/optionsSource/keyingRule, holes.closes («75/100») + holes.opens (sammenslåing ved #3828) |
| `gen_nd_adhd_pool_da2.py` | deterministisk generator (ingen RNG) — assert_authoring re-kjøres ved hver kjoring: ordgrense, absolutter, diagnose-/instrument-token, risiko/medisinering-token, ASRS-fragment-vakt, 70 unike tekster, tema-kontinuitet, id-orden da-0041..da-0075, asrsNear-liste, 5-gram-kryss mot triage-poolen OG DA1-poolen |
| `selftest_nd_adhd_dyp_da2.mjs` | 89/89 ALL PASS i prod-tre (S0–S14) |

## Innhold og design

- **Tema-bånd (DA2-construct):** da2-t1 indre uro (7), da2-t2 motorisk rastløshet (7), da2-t3 vending-impuls i samtale (7), da2-t4 beslutnings-impuls (7), da2-t5 ventetoleranse (7). Konstruktet er spec-ens «Indre uro, motorisk rastløshet, vending-impuls, beslutnings-impuls, ventetoleranse» — én til én i rekkefølge, alle items første-person, virkelighetsnære observabler.
- **Keying:** alle 35 items sign 1 mot skala `da2` — screening i én retning (NG-4-avviket dokumentert i spec engineGaps, arvet fra triage-konvensjonen). Batch-scoring `[da2 weight 1]`; 3-trait-formen (DA1+DA2+DA3) materialiseres ved sammenslåingen i #3828 per scoringContracts.deepPools.
- **asrsNear-flagg:** 6 items (da-0042, da-0047, da-0048, da-0058, da-0065, da-0070) markerer anker-familienær vinkel mot hyperaktivitets-/impulsivitets-familiene (uro i stillhet, vanskelig å holde stille, flikking, å bryte inn, å vente) med per-item vinkelnotat NO+EN i metaen — ikke kloninger. Familie-nummerering (f1/f2/f3) er bevisst utelatt i DA2-notatene: anchorens item-orden transkriberes først ved #3760-bygg, DA1-notatenes f-nummerering er en DA1-konvensjon. FASE 4-utvelgelsen (trekk 8 av 35) velger mot ASRS-blokkens formuleringer. Blokken bor per spec scoringContracts.asrsAnchorShape i live-deffen (#3760-ark), aldri i poolen — null ASRS-tekst her (S4d verifiserer fragment-stammen fraværende).
- **Itemregler** (#3826-forbudet arvet): ett utsagn, første-person presens, 8–14 ord, ingen dobbeltspørsmål, ingen absolutter (alltid/aldri/always/never), ingen DSM-/instrument-språkbruk, ingen ekstrem risiko/selvskade/medisinering (token-skann i generator + selftest S4/S11d).
- **NO/EN separat forfattet** (Soester-konvensjonen): samme id-orden og tema per id, tekstene er ikke direkte oversettelser.
- **Id-forkant:** da-0041..da-0075 — fortsetter DA1s kontinuerlige 100-item-numrering (DA1: 0001–0040, DA3 tar 0076–0100). S2b verifiserer kontakten eksplisitt mot DA1-defens siste id.

## Verifisering

- **Prod-kjøring:** generator kjørt direkte i prod-tre (assert_authoring + 5-gram-kryss passerte første gangs — ingen reparasjonsrunder), selftest 89/89 ALL PASS.
- **Ekte motor:** S7 probe håndregnet (raw 12 i vindu [3,15] → 75.0, komposit 75.0 — samme håndregnede verdier som DA1-proben, da scoring-semantikken er identisk); S8 hele poolen alle-5 → 100.0, alle-1 → 0.0; S8b 55.0-grensen eksakt (5 items sum 16 i vindu [5,25]); S8c sign −1-inversjon → 37.5; S14 sessionSizeFor 35.
- **Schema/motor:** AJV + validateTestDef ×2 ok; S3e NO-etikett byte-identisk med `deepPoolDecision.adhdThemes[1].name`; S1c `nd-adhd-dyp-pool-da2` i alle tre filer.
- **Options:** byte-identisk 5-NOYAKTIGHET-anker fra `def-ipip50-big5.{no,en}.json` (S5a–S5e).
- **5-gram-kryss:** 0 sammenfall mot triage-poolen OG DA1-poolen begge språk (S6f + generator-assert ved hver kjoring — DA2 utvider kryset fra DA1-mønsteret fordi nabo-tokenet «fidget»-famen kunne kollidere med anker-fragmentene; ingen kollisjoner fanget, vaktene sto klar).
- **Copyright-skann:** ASRS-6Q-formuleringsfragmenter fraværende (S4d + generator-assert), instrument-/diagnose-navn 0 (S11a), risiko/medisinering 0 (S11d), absolutter 0 (S11b).
- **Determinisme:** generator re-kjoring byte-identisk (S13, md5).

## Konvensjonsdetaljer (ærlige fanget under bygging)

1. **Ingen korreksjonsrunder**: generator og selftest passerte på første kjøring. Vaktene (absolutt-token, ASRS-fragment, 5-gram-kryss mot korpus) kjørte alle med 0 treff — de sto klare i tilfelle, men fanget ingenting i DA2-tekstene.
2. **Etikett-utfall mot spec:** spec `adhdThemes[1].name` («Hyperaktivitet og impulsivitet») valgt byte-identisk; EN-etikett «Hyperactivity and impulsiveness» separat forfattet, låst i metaen (S3e-verifiserer bare NO, EN er låst via metaens dimensionLabel).
3. **asrsNear-notater uten f-nummerering:** avvik fra DA1s «Anker-1-familien»-notasjon er bevisst og dokumentert i metaens asrsNearPolicy — anchorens hyperaktivitets-items transkriberes ved #3760, og DA2 notater peker kun på familienavn, ikke item-ordens nummer.
4. **S8b-proben gjenbruker DA1s grense-case** (raw 16 i vindu [5,25] → 55.0): valgt fordi den er den samme matematiske grensen — ikke en kopi-error; verdien er håndregnet og stemmer over ekte motor for da2-skalaen likt da1-skalaen.

## Regresjon (urokkert)

- `tests/schema/_nd_itemspec_selftest.mjs` — ALL PASS
- `nd_pool/selftest_nd_triage_pool.mjs` — 78/78 ALL PASS
- `tests/engine/_scoring_selftest.mjs` DEL1 27/27 PASS; `_scoring_integration.mjs` 5/5 PASS

## Hull-status

- **ADHD-dyp samlet: 75/100** (del 1: 40 + del 2: 35). Del 3 hverdagsfungering/konsekvens (#3828, 25 = da-0076..da-0100) gjenstår; kanonisk `def-nd-adhd-dyp-pool.<lang>.json` per defFilePlan.naming materialiseres ved #3828 med 3-trait-scoring og asrs-anchor-kobling. Kryssles-østrene (vakt-kontroll mot lisensbekreftelsen og itemspec) følger brettet.
- ASRS-forankring i live-def er uendret operatør-åpent punkt (verdict §4, NG-2) — berører ikke pool-bygget.

## Speil

Speilkopier til `_delt/brainarea/tests/schema/nd_pool/` synket med md5-verifisering. NB-prod-stien i denne økten er `/mnt/f/maneit/prosjekter/filip-webside-prosjekter/brainarea` (WSL-siden av prod-treet); fs_write-verktøyet lander i `_delt`-speilet og overføres videre derfra.
