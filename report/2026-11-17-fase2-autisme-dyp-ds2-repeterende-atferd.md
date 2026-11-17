# FASE 2 — Autisme-dyp pool del 2 «DS2 Repeterende atferd, sensorikk og interesser» levert: 35 originale items per språk

**Leaf:** [3-VEIS][BYGG] FASE 2 Autisme-dyp pool del 2: DS2 (todo #3831) — worker TR-24FC46366CBA, iterasjon 1.
**Brett:** Autisme-dyp-blokken (#3830 DS1 levert → #3831 denne → del 3 ds-0076..ds-0100) under #3760-arkitekturen. **Dato:** 2026-11-17.
**Kontrakt:** `tests/schema/_nd_itemspec_spec.json` (nd-itemspec-v1, PROPOSED; GJELDENDE ved #3813) + lisensverdikt DOC-C8C02AD272 (#3732, GJELDENDE).
**Søster-leveranser i sporet:** triage-pool (#3758), ADHD-dyp del 1–3 (da1/da2/da3, #3826–#3828), autisme-dyp del 1 (ds1, #3830) — samme konvensjon, samme options-anker, samme vaktstruktur.

## Leveranser (5 filer i `tests/schema/nd_pool/`)

| Fil | Innhold |
|---|---|
| `def-nd-autisme-dyp-pool-ds2.no.json` / `.en.json` | 35 likert-items per språk, family pool, scoring trait `[ds2 weight 1]` norms none, dim `[ds2]` med NO-etikett byte-identisk med spec `deepPoolDecision.autismThemes[1].name` («Repeterende atferd, sensorikk og interesser») |
| `_nd_autisme_dyp_meta_ds2.json` | 1 rad per item (id/dimension/theme/asrsNear), themeLabels x5 à 7, themeCounts 7/7/7/7/7, licenseBasis/authoringRule/optionsSource/keyingRule, asrsNearPolicy (tom-liste låst eksplisitt), holes.closes («75/100») + holes.opens (sammenslåing + FASE 4-trekk) |
| `gen_nd_autisme_pool_ds2.py` | deterministisk generator (ingen RNG) — assert_authoring re-kjøres ved hver kjøring: ordgrense 8–14, punktum/stor bokstav, absolutter, diagnose-/instrument-token (asperger/autism spectrum utvidet for autisme-sporet, arvet fra DS1), risiko/medisinering-token, 70 unike tekster, tema-kontinuitet (7×5), id-forkant-assert (ds-0041..ds-0075 eksplisitt), asrsNear tom-liste-assert, 5-gram-kryss mot triage-poolen OG DA1/DA2/DA3-poolene OG DS1-poolen begge språk, id-kontekstkontroll (id_chain) mot DS1-defen |
| `selftest_nd_autisme_dyp_ds2.mjs` | 95/95 ALL PASS i staging og prod (S0–S14, søsterkonvensjonen fra DS1) |

## Innhold og design

- **Tema-bånd (DS2-construct = spec autismThemes[1]):** ds2-t1 rutiner og rekkefølger (7), ds2-t2 endringsmotstand (7), ds2-t3 fokuserende interesser (7), ds2-t4 sensorisk toleranse og behov (7), ds2-t5 stimulering og regulering (7). Konstruktet «Rutiner og endringsmotstand, fokuserende interesser, sensorisk toleranse/behov, stimulering» er 4 konstruktlinjer oppdelt i 5 bånd for 7/7/7/7/7-symmetrien mot poolMin 35 (søster-mønsteret); endringsmotstand separert fra rutiner slik triage-kortformens ts-0012-formulering ikke blir overlappet.
- **Keying:** alle 35 items sign 1 mot skala `ds2` — screening i én retning (NG-4-avviket dokumentert i spec engineGaps, arvet), batch-scoring `[ds2 weight 1]`; 3-trait-formen (DS1+DS2+DS3) materialiseres ved autisme-dyp-sammenslåingen per scoringContracts.deepPools.
- **asrsNear: TOM-LISTE låst eksplisitt** — presedent triage-metaen (alle ts-False) og DS1-metaen (alle ds1-False); ASRS v1.1 6Q er ADHD-ankeret aldri autisme-ankeret, autisme-ankeret er BYGG-originale items. Feltet arves i skjemaet slik at DS3 holder samme radstruktur (S10c låser den, S10c2/S10c3 bekrefter presedensene).
- **Itemregler** (#3826-forbudet arvet): ett utsagn, første-person presens, 8–14 ord, ingen dobbeltspørsmål, ingen absolutter (alltid/aldri/always/never), ingen DSM-/instrument-språkbruk, ingen ekstrem risiko/selvskade/medisinering (token-skann i generator + selftest S4/S11d).
- **NO/EN separat forfattet** (Soester-konvensjonen): samme id-orden og tema per id, tekstene er ikke direkte oversettelser — 70 unike tekster verifisert.
- **Id-forkant (kontinuerlig nummerering):** ds-0041..ds-0075 — fortsetter DS1s ds-0001..ds-0040; del 3 tar ds-0076..ds-0100. S2c3 programmerer autisme-tallet eksplisitt: 40+35=75 unike ds-0001..ds-0075, ingen hull ingen overlap; S2c/S2c2 bekrefter at da-forkanten (da-0001..da-0100) er urokkert.

## Verifisering

- **Staging-først**: pool, meta og selftest bygget og kjørt i sandbox-staging (ND_POOL_DIR-override) — 95/95 — deretter prod-kjoring (generator + selftest): 95/95 ALL PASS i begge.
- **Ekte motor:** S7 probe håndregnet (raw 12 i vindu [3,15] → 75.0, komposit 75.0 — identisk semantikk med søster-probene); S8 alle-5 → 100.0, alle-1 → 0.0; S8b 55.0-grensen eksakt (ds-0041..ds-0045 sum 16 i vindu [5,25]); S8c sign −1-inversjon → 37.5; S14 sessionSizeFor 35.
- **Schema/motor:** AJV + validateTestDef ×2 ok; S3e NO-etikett byte-identisk med `autismThemes[1].name`; S3f DS1-etikett urokkert; S1c id `nd-autisme-dyp-pool-ds2` i alle tre filer.
- **Options:** byte-identisk 5-NOYAKTIGHET-anker fra `def-ipip50-big5.{no,en}.json` (S5a–S5e).
- **5-gram-kryss:** 0 sammenfall mot triage-poolen OG DA1/DA2/DA3-poolene OG DS1-poolen begge språk (S6f + generator-assert ved hver kjøring). Ekte fanget under bygging: 1 substans-kollisjon — ds-0052 NO («uforholdsmessig», dsm-substring) omformulert til «større plass i hodet enn de burde»; vaktene sto i 0-treff-tilstand ved leveranse.
- **Copyright-skann:** ASRS-6Q-formuleringsfragmenter fraværende (S4d), instrument-/diagnose-navn 0 (S11a, inkl. asperger/autism spectrum), risiko/medisinering 0 (S11d), absolutter 0 (S11b).
- **Determinisme:** generator re-kjøring byte-identisk (S13, md5).
- **Regresjon urokkert:** itemspec ALL PASS, triage 78/78, DA1 86/86, DA2 89/89, DA3 89/89, DS1 91/91, scoring 27/27 + DEL2 27/27, integrasjon 5/5, attention 57/57, i18n 22/22.

## Konvensjonsdetaljer (ærlige fanget under bygging)

1. **dsm-substring falsk positiven:** S11a blokk-skanner matcher substrings; NO-ordet «uforholdsmessig» inneholder «dsm». Omformulert fra «uforholdsmessig mye plass» til «større plass ... enn de burde» i stedet for å svekke vakten — vaktene er konvensjonen, teksten gis etter.
2. **5-gram 0-treff første kjøring:** DS2-forfattningen la seg bevisst i endringsmotstand- og stimulerings-vokabular (plan/kalender/rute; pace/vugg/fotpute) som ikke kolliderer med triage-kortformens ts-0008..ts-0014-rutine-/sensorisk-formuleringer («samme rekkefølge», «urolig når planer endres brått», «klesmerker og sømmer», «samme matvarene»); vakten fanget 0 likevel.
3. **tema-2-begrunnelse:** konstruktlinjen «Rutiner og endringsmotstand» er splittet i t1 (rutiner) og t2 (endringsmotstand) — to forskjellige adferdsuttrykk som triage-kortformen blander i ts-0008/ts-0012; separasjonen gir rentere FASE 4-trekk og holder 7-symmetrien.

## Hull-status

- **Autisme-dyp står i 75/100** (ds1 40 + ds2 35 levert; del 3 hverdagen/energi/tilpasning ds-0076..ds-0100 ~25 gjenstår). Samlet autisme-dyp-pool materialiseres i sammenslåings-steget (3-trait-scoring per scoringContracts.deepPools), deretter FASE 4-utvelgelse (trekk 8 per tema = 24 items).
