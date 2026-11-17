# FASE 2 — ADHD-dyp pool del 3 «DA3 Hverdagsfungering/konsekvens» levert: 25 originale items per språk

**Leaf:** [3-VEIS][BYGG] FASE 2 ADHD-dyp pool del 3: DA3 (todo #3828) — worker TR-71B2788AAC12.
**Brett:** ADHD-dyp-blokken (#3826 → #3827 → #3828) under #3760-arkitekturen. **Dato:** 2026-11-17.
**Kontrakt:** `tests/schema/_nd_itemspec_spec.json` (nd-itemspec-v1, PROPOSED; GJELDENDE ved #3813) + lisensverdikt DOC-C8C02AD272 (#3732, GJELDENDE).
**Søster-leveranser i sporet:** triage-pool (#3758), ADHD-dyp del 1 DA1 (#3826), del 2 DA2 (#3827) — samme konvensjon, samme options-anker, samme vaktstruktur.

## Leveranser (5 filer i `tests/schema/nd_pool/`)

| Fil | Innhold |
|---|---|
| `def-nd-adhd-dyp-pool-da3.no.json` / `.en.json` | 25 likert-items per språk, family pool, scoring trait `[da3 weight 1]` norms none, dim `[da3]` med NO-etikett byte-identisk med spec `deepPoolDecision.adhdThemes[2].name` («Hverdagsfungering og konsekvens») |
| `_nd_adhd_dyp_meta_da3.json` | 1 rad per item (id/dimension/theme/asrsNear/nearNote), themeLabels x5, themeCounts 5/5/5/5/5, licenseBasis/authoringRule/optionsSource/keyingRule, holes.closes («100/100») + holes.opens (sammenslåing + 3-trait-scoring + FASE 4-utvelgelse) |
| `gen_nd_adhd_pool_da3.py` | deterministisk generator (ingen RNG) — assert_authoring re-kjøres og re-verifiseres ved S13-utskrift: ordgrense, absolutter, diagnose-/instrument-token, risiko/medisinering-token, ASRS-fragment-vakt, 50 unike tekster, tema-kontinuitet, id-orden da-0076..da-0100, asrsNear-liste, 5-gram-kryss mot triage-poolen OG DA1- OG DA2-poolene |
| `selftest_nd_adhd_dyp_da3.mjs` | 89/89 ALL PASS i staging (ND_POOL_DIR-override) OG i prod-tre (S0–S14) |

## Innhold og design

- **Tema-bånd (DA3-konstruktet):** da3-t1 jobb og studier (5), da3-t2 hjem og husholdning (5), da3-t3 administrasjon og frister (5), da3-t4 sosiale konsekvenser (5), da3-t5 etterslep over tid (5). Konstruktet er spec-ens «Følger av ovenstående i jobb/studier/hjem/administrasjon — funksjons-impact, ikke symtomtelling»: itemene registrerer konsekvens-nivået (hva som faktisk ryker), ikke symtomtelling — DA1 og DA2 dekker oppmerksomhets- og hyperaktivitetskonstruktene ovenfra.
- **Keying:** alle 25 items sign 1 mot skala `da3` — screening i én retning (NG-4-avviket dokumentert i spec engineGaps, arvet fra triage- og søster-konvensjonen). Batch-scoring `[da3 weight 1]`; 3-trait-formen (DA1+DA2+DA3) materialiseres ved sammenslåingen per scoringContracts.deepPools.
- **asrsNear-flagg:** 5 items (da-0076, da-0078, da-0086, da-0093, da-0096) markerer anker-familienær vinkel mot konsekvens-nivået av ankerfamiliene (gjenlesing som fanger uforsiktige feil før andre; huske-forpliktelser som reddes i siste øyeblikk; frist-press som bryter venting; rolle-ombytting i køen; avslutning som bremser neste start) med per-item vinkelnotat NO+EN i metaen — ikke kloninger. Familie-nummerering brukes ikke (DA2-konvensjonen arvet): anchorens item-orden transkriberes først ved #3760-bygg. FASE 4-utvelgelsen (trekk 8 av 25) velger mot ASRS-blokkens formuleringer; blokken bor per spec scoringContracts.asrsAnchorShape i live-deffen (#3760-ark), aldri i poolen — null ASRS-tekst her (S4d verifiserer fragment-stammen fraværende).
- **Itemregler** (#3826-forbudet arvet): ett utsagn, første-person presens, 8–14 ord, ingen dobbeltspørsmål, ingen absolutter (alltid/aldri/always/never), ingen DSM-/instrument-språkbruk, ingen ekstrem risiko/selvskade/medisinering (token-skann i generator + selftest S4/S11d).
- **NO/EN separat forfattet** (søster-konvensjonen): samme id-orden og tema per id, tekstene er ikke direkte oversettelser.
- **Id-halerekke:** da-0076..da-0100 — fullfører den kontinuerlige 100-item-forkanten (DA1: 0001–0040, DA2: 0041–0075). **S2c/S2c2 bekrefter ADHD-total eksplisitt: 40+35+25 = 100 items, 100 unike ids, unionen er nøyaktig da-0001..da-0100 — ingen hull, ingen overlap.**

## Verifisering

- **Prod-kjøring:** generator kjørt direkte i prod-tre i iterasjon 1 (assert_authoring + 5-gram-kryss mot triage/DA1/DA2 passerte første gangs — ingen reparasjonsrunder på poolen), selftest 89/89 ALL PASS i staging og prod i iterasjon 2.
- **Ekte motor:** S7 probe håndregnet (raw 12 i vindu [3,15] → 75.0, komposit 75.0 — samme håndregnede verdier som DA1/DA2-probene, da scoring-semantikken er identisk); S8 hele poolen alle-5 → 100.0, alle-1 → 0.0; S8b 55.0-grensen eksakt (5 items da-0076..da-0080 sum 16 i vindu [5,25]); S8c sign −1-inversjon → 37.5; S14 sessionSizeFor 25.
- **Schema/motor:** AJV + validateTestDef ×2 ok; S3e NO-etikett byte-identisk med `deepPoolDecision.adhdThemes[2].name` («Hverdagsfungering og konsekvens»); S3f DA1/DA2-etiketter urokkert; S1c `nd-adhd-dyp-pool-da3` i alle tre filer.
- **Options:** byte-identisk 5-NOYAKTIGHET-anker fra `def-ipip50-big5.{no,en}.json` (S5a–S5e).
- **5-gram-kryss:** 0 sammenfall mot triage-poolen OG DA1- OG DA2-poolene begge språk (S6f + generator-assert ved hver kjoring).
- **Copyright-skann:** ASRS-6Q-formuleringsfragmenter fraværende (S4d + generator-assert), instrument-/diagnose-navn 0 (S11a), risiko/medisinering 0 (S11d), absolutter 0 (S11b).

## Konvensjonsdetaljer (ærlige fanget under bygging)

- Selftest-leveransen i iterasjon 1 var en delskrevet placeholder (feilaktig ipip-EN-import og manglende FILES_EXIST), overskrevet fullstendig i iterasjon 2 før første kjøring — poolen, metaen og generatoren er urokkert fra iterasjon 1.
- S2c2 (union-sjekken) fanget en feil i sjekken selv ved første kjøring: en overflødig `String('') +`-paranoia gjorde forventet side til komma-streng i stedet for array. Dataet viste seg perfekt i hånd-debuggen (100/100 unike, 0 diffs mot da-0001..da-0100); sjekken ble rettet, ikke dataet. Det er selftest-tilbudet som fant sin egen feil — samme mønster som DA1s egen-fanget 5-gram-kollisjon, men i testmønsteret denne gangen.
- Sjekk-tellingen: 87 ved først fullstendig skriving, 89 etter de eksplisitte total-kontrollene S2c/S2c2 (oppgavens «Bekreft ADHD-total 100 items»-punkt materialisert som programmerte checks, ikke bare rapporttekst).

## Regresjon (urokkert)

- nd-itemspec selftest: ALL PASS.
- Triage-pool selftest: 78/78 ALL PASS.
- Scoring selftest del 1 (likert): 27/27 PASS. Del 2 (g): 27/27 PASS.
- DA1 søster: 86/86 ALL PASS. DA2 søster: 89/89 ALL PASS.

## Hull-status

- **Lukket:** ADHD-dyp del 3 (d3) — 25 items levert. **ADHD-dyp samlet står i 100/100** (da1 40 + da2 35 + da3 25 = poolMin fra poolDesign.deepPools oppnådd; S2c programmert).
- **Åpner:** Samlet ADHD-dyp-pool (`def-nd-adhd-dyp-pool.<lang>.json` per defFilePlan.naming) materialiseres i sammenslåings-steget — da1/da2/da3 smeltes sammen og får 3-trait-scoringen (traits da1/da2/da3) per scoringContracts.deepPools; deretter FASE 4-utvelgelse (trekk 8 per tema = 24 items) og ASRS-forankring ved #3760-ark.

## Speil

Speiltre `_delt/brainarea` synkronisert og md5-verifisert for alle leveransefiler + rapport (6 filer). Sandbox-arbeidskatalogen er worker-scrap og mottar ingenting her; kanonisk tre er prod.
