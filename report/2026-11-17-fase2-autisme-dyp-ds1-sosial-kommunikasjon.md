# FASE 2 — Autisme-dyp pool del 1 «DS1 Sosial kommunikasjon/resiprositet» levert: 40 originale items per språk

**Leaf:** [3-VEIS][BYGG] FASE 2 Autisme-dyp pool del 1: DS1 (todo #3830) — worker TR-9233A8B27027, iterasjon 1.
**Brett:** Autisme-dyp-blokken (#3830 → #3831 → del 3) under #3760-arkitekturen. **Dato:** 2026-11-17.
**Kontrakt:** `tests/schema/_nd_itemspec_spec.json` (nd-itemspec-v1, PROPOSED; GJELDENDE ved #3813) + lisensverdikt DOC-C8C02AD272 (#3732, GJELDENDE).
**Søster-leveranser i sporet:** triage-pool (#3758), ADHD-dyp del 1–3 (da1/da2/da3, #3826–#3828) — samme konvensjon, samme options-anker, samme vaktstruktur.

## Leveranser (5 filer i `tests/schema/nd_pool/`)

| Fil | Innhold |
|---|---|
| `def-nd-autisme-dyp-pool-ds1.no.json` / `.en.json` | 40 likert-items per språk, family pool, scoring trait `[ds1 weight 1]` norms none, dim `[ds1]` med NO-etikett byte-identisk med spec `deepPoolDecision.autismThemes[0].name` («Sosial kommunikasjon og resiprositet») |
| `_nd_autisme_dyp_meta_ds1.json` | 1 rad per item (id/dimension/theme/asrsNear), themeLabels x5 à 8, themeCounts 8/8/8/8/8, licenseBasis/authoringRule/optionsSource/keyingRule, asrsNearPolicy (tom-liste låst eksplisitt), holes.closes («40/100») + holes.opens (sammenslåing + FASE 4-trekk) |
| `gen_nd_autisme_pool_ds1.py` | deterministisk generator (ingen RNG) — assert_authoring re-kjøres ved hver kjøring: ordgrense 8–14, punktum/stor bokstav, absolutter, diagnose-/instrument-token (inkl. «asperger» og «autism spectrum» utvidet for autisme-sporet), risiko/medisinering-token, 80 unike tekster, tema-kontinuitet (8×5), asrsNear tom-liste-assert, 5-gram-kryss mot triage-poolen OG DA1/DA2/DA3-poolene begge språk |
| `selftest_nd_autisme_dyp_ds1.mjs` | 91/91 ALL PASS i staging og prod (S0–S14, søsterkonvensjonen fra DA1/DA2) |

## Innhold og design

- **Tema-bånd (DS1-construct):** ds1-t1 samtale-rytme og tur-taking (8), ds1-t2 nonverbalt samspill (8), ds1-t3 tolking av sosiale signaler (8), ds1-t4 relasjonsbygging og vennskap (8), ds1-t5 sosial energi i samspill (8). Konstruktet er spec-ens «Samtale-rytme, nonverbalt samspill, relasjonsbygging, tolking av sosiale signaler (selvrapportert)» — én til én i rekkefølge; ds1-t5 bærer energi-delen av konstruktet (konstruktlinjene er 4, temaene 5: energi og restitusjon lå i DA3-para «hverdagen», men DS1-konstruktet gir «sosial energi i samspill» som naturlig femte bånd for å holde 8/8/8/8/8-symmetrien mot poolMin 40).
- **Keying:** alle 40 items sign 1 mot skala `ds1` — screening i én retning (NG-4-avviket dokumentert i spec engineGaps, arvet fra triage-konvensjonen). Batch-scoring `[ds1 weight 1]`; 3-trait-formen (DS1+DS2+DS3) materialiseres ved autisme-dyp-sammenslåingen per scoringContracts.deepPools.
- **asrsNear: TOM-LISTE låst eksplisitt** — presedent triage-metaen (alle ts-items False) + verdiktens forankring: ASRS v1.1 6Q er ADHD-ankeret, aldri autisme-ankeret; autisme-ankeret er BYGG-originale items (spec anchorDecision.autismAnchor). Da-poolenes anker-familienotater har aldri noen motpart i autisme-sporet. Feltet arves likevel i skjemaet slik at DS2/DS3 holder samme radstruktur. (Egen vurdering under bygging: første utkast markerte 5 items True med anker-familienotater — det impliciterte en ASRS-nærhet autisme-items ikke har; korrigert til tom liste før leveranse, S10c låser den.)
- **Itemregler** (#3826-forbudet arvet): ett utsagn, første-person presens, 8–14 ord, ingen dobbeltspørsmål, ingen absolutter (alltid/aldri/always/never), ingen DSM-/instrument-språkbruk, ingen ekstrem risiko/selvskade/medisinering (token-skann i generator + selftest S4/S11d).
- **NO/EN separat forfattet** (Soester-konvensjonen): samme id-orden og tema per id, tekstene er ikke direkte oversettelser — 80 unike tekster verifisert.
- **Id-forkant:** ds-0001..ds-0040 — første del av autisme-sporets kontinuerlige 100-item-numrering (DS2 tar 0041–0075 ved #3831, del 3 tar 0076–0100). S2b verifiserer at da-forkanten (da-0040..da-0100) er urokkert og uten overlap.

## Verifisering

- **Staging-først**: pool, meta og selftest bygget og kjørt i staging (ND_POOL_DIR-override) før prod-skriv; selftest 91/91 i staging, deretter prod-kjoring (generator + selftest) — 91/91 ALL PASS i begge.
- **Ekte motor:** S7 probe håndregnet (raw 12 i vindu [3,15] → 75.0, komposit 75.0 — samme håndregnede verdier som DA1/DA2/DA3-probene, da scoring-semantikken er identisk); S8 hele poolen alle-5 → 100.0, alle-1 → 0.0; S8b 55.0-grensen eksakt (5 items ds-0001..ds-0005 sum 16 i vindu [5,25]); S8c sign −1-inversjon → 37.5; S14 sessionSizeFor 40.
- **Schema/motor:** AJV + validateTestDef ×2 ok; S3e NO-etikett byte-identisk med `autismThemes[0].name`; S3f DA1-etikett urokkert; S1c `nd-autisme-dyp-pool-ds1` i alle tre filer.
- **Options:** byte-identisk 5-NOYAKTIGHET-anker fra `def-ipip50-big5.{no,en}.json` (S5a–S5e).
- **5-gram-kryss:** 0 sammenfall mot triage-poolen OG DA1/DA2/DA3-poolene begge språk (S6f + generator-assert ved hver kjøring). Ekte fanget under bygging: ds-0005 (tur-taking-formulering kolliderte med ts-0005), ds-0011, ds-0017 (mener-annet-formulering kolliderte med ts-0007) — 4 tekst-omformuleringer, deretter 0 treff.
- **Copyright-skann:** ASRS-6Q-formuleringsfragmenter fraværende (S4d + generator-assert), instrument-/diagnose-navn 0 (S11a, inkl. asperger/autism spectrum), risiko/medisinering 0 (S11d), absolutter 0 (S11b).
- **Determinisme:** generator re-kjøring byte-identisk (S13, md5).

## Konvensjonsdetaljer (ærlige fanget under bygging)

1. **asrsNear-policy-korreksjon:** første utkast flagget 5 ds-items True med «Anker-familien»-notater etter DA2-mønsteret; ved konsolidering ble dette trukket tilbake — autisme-sporet har ingen eksternt anker å være «nær», og triage-presedenten (alle ts-False) er den riktige søsteren. Tom-listen er låst i generator-assert, selftest S10c/S10c2 og metaens asrsNearPolicy.
2. **5-gram-vaktene fanget 4 kollisjoner** (ds-0005 NO/EN, ds-0011 NO/EN, ds-0017 NO/EN), alle mot triage-poolens samspillsformuleringer — reparert ved omformulering, ikke ved å senke vakten. Vaktene sto i 0-treff-tilstand ved leveranse.
3. **Instrument-skann utvidet for autisme-sporet:** NO_DIAG inkluderer nå «asperger» og «autism spectrum» ved siden av DA-mønsterets liste — vokabulær som er naturlig i dette domenet men forbudt i item-tekster per copyrightControl.
4. **ds1-t5-begrunnelse:** DS1-konstruktlinjene er 4, men poolMin 40 med 5 à 8-symmetrien (søster-mønsteret) gir naturlig femte bånd «Sosial energi i samspill»; energi-delen er trukket fra spec deepPoolDecision.autismThemes[2] («Energiforbruk i sosiale settinger») men holdt på samspill-nivå så DS3 beholder sin konstruksjon. Dokumentert her som designvalg, ikke i spec-en.

## Regresjon (urokkert)

- `tests/schema/_nd_itemspec_selftest.mjs` — ALL PASS
- `nd_pool/selftest_nd_triage_pool.mjs` — 78/78 ALL PASS
- `nd_pool/selftest_nd_adhd_dyp_da1.mjs` — 86/86; `da2` — 89/89; `da3` — 89/89
- `tests/engine/_scoring_selftest.mjs` 27/27 + DEL2 27/27; `_scoring_integration.mjs` 5/5; `_attention_selftest.mjs` 57/57; `tests/i18n/_i18n_selftest.mjs` 22/22

## Hull-status

- **Autisme-dyp står i 40/100** (ds1 40 levert; ds2 repeterende atferd/sensorikk/interesser #3831 ~35 og s3 hverdagen/energi/tilpasning ~25 gjenstår). Samlet autisme-dyp-pool materialiseres i sammenslåings-steget (3-trait-scoring per scoringContracts.deepPools), deretter FASE 4-utvelgelse (trekk 8 per tema = 24 items).
