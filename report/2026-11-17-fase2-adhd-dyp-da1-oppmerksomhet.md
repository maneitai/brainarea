# FASE 2 — ADHD-dyp pool del 1 «DA1 Oppmerksomhet/eksekutivt» levert: 40 originale items per språk

**Leaf:** [3-VEIS][BYGG] FASE 2 ADHD-dyp pool del 1: DA1 (todo #3826) — worker TR-50A1A38A4C89, iterasjon 1.
**Brett:** ADHD-dyp-blokken (#3826 → #3827 → #3828) under #3760-arkitekturen. **Dato:** 2026-11-17.
**Kontrakt:** `tests/schema/_nd_itemspec_spec.json` (nd-itemspec-v1, PROPOSED; GJELDENDE ved #3813) + lisensverdikt DOC-C8C02AD272 (#3732, GJELDENDE).
**Søster-leveranse i sporet:** triage-pool (#3758, `def-nd-triage-pool.{no,en}.json`) — samme konvensjon, samme options-anker, samme vaktstruktur.

## Leveranser (5 filer i `tests/schema/nd_pool/`)

| Fil | Innhold |
|---|---|
| `def-nd-adhd-dyp-pool-da1.no.json` / `.en.json` | 40 likert-items per språk, family pool, scoring trait `[da1 weight 1]` norms none, dim `[da1]` med NO-etikett byte-identisk med spec `deepPoolDecision.adhdThemes[0].name` («Oppmerksomhet og eksekutive funksjoner») |
| `_nd_adhd_dyp_meta_da1.json` | 1 rad per item (id/dimension/theme/asrsNear/nearNote), themeLabels x6, themeCounts 7/7/7/7/7/5, licenseBasis/authoringRule/optionsSource/keyingRule, holes.closes («40/100») + holes.opens (sammenslåing ved #3828) |
| `gen_nd_adhd_pool_da1.py` | deterministisk generator (ingen RNG) — assert_authoring re-kjøres ved hver kjoring: ordgrense, absolutter, diagnose-/instrument-token, risiko/medisinering-token, 80 unike tekster, tema-kontinuitet, asrsNear-liste, 5-gram-kryss mot triage-poolen |
| `selftest_nd_adhd_dyp_da1.mjs` | 86/86 ALL PASS i prod-tre (S0–S14) |

## Innhold og design

- **Tema-bånd (DA1-construct):** da1-t1 fokushold og gjennomføring av én ting (7), da1-t2 distraksjons-sårbarhet i hverdagen (7), da1-t3 hverdagshukommelse (7), da1-t4 oppstartsmotstand (7), da1-t5 organisering av ting og tid (7), da1-t6 oppfølging over tid (5). Konstruktet er spec-ens «Fokushold, distraksjoner, hukommelse i hverdagen, oppstarts-motstand, organisering» — dekket i rekkefølge, alle items første-person virkelighetsnære observabler.
- **Keying:** alle 40 items sign 1 mot skala `da1` — screening i én retning (NG-4-avviket dokumentert i spec engineGaps, arvet fra triage-konvensjonen). Batch-scoring `[da1 weight 1]`; 3-trait-formen (DA1+DA2+DA3) materialiseres ved sammenslåingen i #3828 per scoringContracts.deepPools.
- **asrsNear-flagg:** 6 items (da-0001, da-0019, da-0029, da-0032, da-0037, da-0040) markerer anker-familienær vinkel (f1 avslutning, f2 organisering, f3 huske-forpliktelser) med per-item vinkelnotat NO+EN i metaen — ikke kloninger; FASE 4-utvelgelsen (trekk 8 av 40) velger mot ASRS-blokkens formuleringer. Blokken bor per spec scoringContracts.asrsAnchorShape i live-deffen (#3760-ark), aldri i poolen — null ASRS-tekst her.
- **Itemregler:** ett utsagn, første-person presens, 8–14 ord, ingen dobbeltspørsmål, ingen absolutter (alltid/aldri/always/never), ingen DSM-/instrument-språkbruk, ingen ekstrem risiko/selvskade/medisinering (#3826-forbudet, håndhevet som token-skann i generator + selftest S4/S11d).
- **NO/EN separat forfattet** (Soester-konvensjonen): samme id-orden og tema per id, tekstene er ikke direkte oversettelser.

## Verifisering

- **Staging-først:** def/meta bygget og kjørt i staging (miljøoverride `ND_POOL_DIR`) før prod-skriv — prod-kjøring 86/86 ALL PASS.
- **Ekte motor:** S7 probe håndregnet (raw 12 i vindu [3,15] → 75.0, komposit 75.0); S8 hele poolen alle-5 → 100.0, alle-1 → 0.0; S8b 55.0-grensen eksakt (5 items sum 16); S8c sign −1-inversjon → 37.5; S14 sessionSizeFor 40.
- **Schema/motor:** AJV + validateTestDef ×2 ok; id-mønster `da-0001..da-0040` i forkanten av den kontinuerlige 100-item-numreringen (DA2 tar 0041–0075, DA3 0076–0100).
- **Options:** byte-identisk 5-NOYAKTIGHET-anker fra `def-ipip50-big5.{no,en}.json` (S5a–S5d).
- **5-gram-kryss mot triage-poolen:** 0 sammenfall begge språk (S6f + generator-assert ved hver kjoring).
- **Copyright-skann:** ASRS-6Q-formuleringsfragmenter fraværende (S4d), instrument-/diagnose-navn 0 (S11a), risiko/medisinering 0 (S11d).
- **Determinisme:** generator re-kjoring byte-identisk (S13, md5).

## Konvensjonsdetaljer (ærlig fanget under bygging)

1. **Absolutt-vakten fanget «whenever»** (substring av «never») i da-0003 EN — teksten reparert («when», ikke «whenever»); substring-vakten beholdes bevisst streng.
2. **5-gram-kryss fanget 1 reell kollisjon:** da-0021 EN delt 5-gram «and have to ask for» med ta-0007 EN — teksten omformulert (NO-søstertekst justert i takt), gjenkjøring 0 treff.
3. **Meta-feltet `items` manglet i første generator-utkast** — fanget av S10a (TypeError → assert), reparert.
4. **To selftest-assertion-feil** (validateTestDef returnerer `{ok,errors}`-objekt, ikke array; S10g-uttrykk misformet) fanget under staging-kjøring og reparert — ingen leveransefeil bak dem.

## Regresjon (urokkert)

- `tests/schema/_nd_itemspec_selftest.mjs` — ALL PASS
- `nd_pool/selftest_nd_triage_pool.mjs` — 78/78 ALL PASS
- `tests/engine/_scoring_selftest.mjs` DEL1 27/27 PASS; `_scoring_integration.mjs` 5/5 PASS

## Hull-status

- **ADHD-dyp samlet: 40/100** (del 1 levert). Del 2 hyperaktivitet/impulsivitet (#3827, 35 = da-0041..da-0075) og del 3 hverdagsfungering/konsekvens (#3828, 25 = da-0076..da-0100) gjenstår; kanonisk `def-nd-adhd-dyp-pool.<lang>.json` per defFilePlan.naming materialiseres ved #3828 med 3-trait-scoring og asrs-anchor-kobling. Kryssles-østrene (vakt-kontroll mot lisensbekreftelsen og itemspec) følger brettet.
- ASRS-forankring i live-def er uendret operatør-åpent punkt (verdict §4, NG-2) — berører ikke pool-bygget.

## Speil

`_delt/brainarea/tests/schema/nd_pool/` + rapport — md5-verifisert synk.
