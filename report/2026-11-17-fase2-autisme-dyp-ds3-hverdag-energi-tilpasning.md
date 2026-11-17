# FASE 2 — Autisme-dyp pool del 3 «DS3 Hverdagen, energi og tilpasning» levert: 25 originale items per språk — autisme-dypet er FULLT 100/100

**Leaf:** [3-VEIS][BYGG] FASE 2 Autisme-dyp pool del 3: DS3 Hverdag/energi/masking-tilpasning (todo #3832) — worker TR-882A360F4AAA, iterasjon 1.
**Brett:** Autisme-dyp-blokken (#3830 DS1 → #3831 DS2 → #3832 denne leder halerekken) under #3760-arkitekturen. **Dato:** 2026-11-17.
**Kontrakt:** `tests/schema/_nd_itemspec_spec.json` (nd-itemspec-v1, PROPOSED; GJELDENDE ved #3813) + lisensverdikt DOC-C8C02AD272 (#3732, GJELDENDE).
**Søster-leveranser i sporet:** triage-pool (#3758), ADHD-dyp del 1–3 (da1/da2/da3, #3826–#3828), autisme-dyp del 1–2 (ds1/ds2, #3830–#3831) — samme konvensjon, samme options-anker, samme vaktstruktur.

## Leveranser (5 filer i `tests/schema/nd_pool/`)

| Fil | Innhold |
|---|---|
| `def-nd-autisme-dyp-pool-ds3.no.json` / `.en.json` | 25 likert-items per språk, family pool, scoring trait `[ds3 weight 1]` norms none, dim `[ds3]` med NO-etikett byte-identisk med spec `deepPoolDecision.autismThemes[2].name` («Hverdagen, energi og tilpasning») |
| `_nd_autisme_dyp_meta_ds3.json` | 1 rad per item (id/dimension/theme/asrsNear), themeLabels x5 à 5, themeCounts 5/5/5/5/5, licenseBasis/authoringRule/optionsSource/keyingRule, asrsNearPolicy (tom-liste låst eksplisitt), holes.closes («autisme-dyp samlet er full: 100/100») + holes.opens (sammenslåing + FASE 4-trekk) |
| `gen_nd_autisme_pool_ds3.py` | deterministisk generator (ingen RNG) — assert_authoring re-kjøres ved hver kjøring: ordgrense 8–14, punktum/stor bokstav, absolutter, diagnose-/instrument-token (asperger/autism spectrum arvet fra DS1/DS2), risiko/medisinering-token, 50 unike tekster, tema-kontinuitet (5×5), id-forkant-assert (ds-0076..ds-0100 eksplisitt), asrsNear tom-liste-assert, 5-gram-kryss mot triage-poolen OG DA1/DA2/DA3-poolene OG DS1-poolen OG DS2-poolen begge språk, id-kontekstkontroll (id_chain) mot DS1- og DS2-defene (040/035-forkantene urokkert, unionen = ds-0001..ds-0100) |
| `selftest_nd_autisme_dyp_ds3.mjs` | 95/95 ALL PASS i staging og prod (S0–S14, søsterkonvensjonen fra DS2) |

## Innhold og design

- **Tema-bånd (DS3-construct = spec autismThemes[2]):** ds3-t1 energiforbruk i sosiale settinger (5), ds3-t2 masking-lignende tilpasning (5), ds3-t3 restitusjon (5), ds3-t4 omgivelses-tilpasninger (5), ds3-t5 etterslep over tid (5). Konstruktet «Energiforbruk i sosiale settinger, masking-lignende tilpasning, restitusjon, omgivelses-tilpasninger» er 4 konstruktlinjer oppdelt i 5 bånd for 5/5/5/5/5-symmetrien mot poolMin 25 (søster-mønsteret); etterslep over tid tilført som 5. bånd — funksjons-impact over tid arvet fra DA3-halerekken, i autisme-drakt (etterslep av gjøremål etter energislitasje, ikke oppmerksomhetsdrift).
- **Keying:** alle 25 items sign 1 mot skala `ds3` — screening i én retning (NG-4-avviket dokumentert i spec engineGaps, arvet), batch-scoring `[ds3 weight 1]`; 3-trait-formen (DS1+DS2+DS3) materialiseres ved autisme-dyp-sammenslåingen per scoringContracts.deepPools.
- **asrsNear: TOM-LISTE låst eksplisitt** — presedent triage-metaen (alle ts-False), DS1-metaen (alle ds1-False) og DS2-metaen (alle ds2-False); ASRS v1.1 6Q er ADHD-ankeret aldri autisme-ankeret, autisme-ankeret er BYGG-originale items. Feltet arves i skjemaet slik at sporets radstruktur holder seg identisk (S10c låser den, S10c2/S10c3 bekrefter presedensene).
- **Itemregler** (#3826-forbudet arvet): ett utsagn, første-person presens, 8–14 ord, ingen dobbeltspørsmål, ingen absolutter (alltid/aldri/always/never), ingen DSM-/instrument-språkbruk, ingen ekstrem risiko/selvskade/medisinering (token-skann i generator + selftest S4/S11d).
- **NO/EN separat forfattet** (Soester-konvensjonen): samme id-orden og tema per id, tekstene er ikke direkte oversettelser — 50 unike tekster verifisert.
- **Id-forkant (kontinuerlig numrering FULLFØRT):** ds-0076..ds-0100 — fullfører DS1s ds-0001..ds-0040 og DS2s ds-0041..ds-0075. S2c3 programmerer autisme-totalen eksplisitt: 40+35+25=100 unike ds-0001..ds-0100, ingen hull ingen overlap; S2c/S2c2 bekrefter at da-forkanten (da-0001..da-0100) er urokkert. Både ADHD-dypet (fra #3828) og autisme-dypet (fra denne) står nå i full 100-item forkant.

## Verifisering

- **Staging-først**: pool, meta og selftest bygget og kjørt i sandbox-staging (ND_POOL_DIR-override) — 95/95 — deretter prod-kjoring (generator + selftest): 95/95 ALL PASS i begge, byte-identisk output (md5-krysset determinisme).
- **Ekte motor:** S7 probe håndregnet (raw 12 i vindu [3,15] → 75.0, komposit 75.0 — identisk semantikk med søster-probene); S8 alle-5 → 100.0, alle-1 → 0.0; S8b 55.0-grensen eksakt (ds-0076..ds-0080 sum 16 i vindu [5,25]); S8c sign −1-inversjon → 37.5; S14 sessionSizeFor 25.
- **Schema/motor:** AJV + validateTestDef ×2 ok; S3e NO-etikett byte-identisk med `autismThemes[2].name`; S3f DS1/DS2-etiketter urokkerte; S1c id `nd-autisme-dyp-pool-ds3` i alle tre filer.
- **Options:** byte-identisk 5-NOYAKTIGHET-anker fra `def-ipip50-big5.{no,en}.json` (S5a–S5e).
- **5-gram-kryss:** 0 sammenfall mot triage-poolen OG DA1/DA2/DA3-poolene OG DS1-poolen OG DS2-poolen begge språk (S6f + generator-assert ved hver kjøring). Ekte fanget under bygging: 1 substans-kollisjon — ds-0085 NO («etter en hel dag med») omformulert til «En full dag med tilpasning til andre etterlater meg blank»; vaktene sto i 0-treff-tilstand ved leveranse.
- **Copyright-skann:** ASRS-6Q-formuleringsfragmenter fraværende (S4d), instrument-/diagnose-navn 0 (S11a, inkl. asperger/autism spectrum), risiko/medisinering 0 (S11d), absolutter 0 (S11b).

## Regresjon (urokkert)

nd-itemspec ALL PASS · triage-pool 78/78 · DA1 86/86 · DA2 89/89 · DA3 89/89 · DS1 91/91 · DS2 95/95 · scoring DEL1 27/27 · DEL2 27/27 · integrasjon 5/5 · attention 57/57 · i18n 22/22 · DS3 95/95.

## Hva som gjenstår (holes.opens)

Samlet autisme-dyp-pool (`def-nd-autisme-dyp-pool.<lang>.json` per defFilePlan.naming) materialiseres med DS1+DS2+DS3 samlet; kryssles-øster (kryssles mot lisensbekreftelsen og itemspec) følger brettet; FASE 4-utvelgelse (trekk 8 per tema = 24 items per poolDesign.deepPools liveDefPlan).

## CopyrightControl

Alle 50 tekster egne/original forfattet fra DS3-konstruktet i `_nd_itemspec_spec.json` — ikke direkte oversettelser, ingen instrumentnavn, ingen DSM-parafrase, ingen ekstrem risiko/selvskade/medisinering.
