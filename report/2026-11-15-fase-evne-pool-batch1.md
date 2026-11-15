# FASE 2 — Evne-pool batch 1: T1 matriselogikk + T2 numerisk, 100 items (todo #3748)

Dato: 2026-11-15. [3-VEIS] FASE 2, brett #3748. Pool-batch-leveranse til `_evne_itemspec_spec.json` (itemspec-evner v1) — autorert mot T1/T2-feltene der (poolId, idPrefix, poolMin 50, optionsPerItem 6/5, bandvindu, distraktorregler, copyrightControl.forbidden).

## Leveranser (prod-tre, commit 5efb75a)

- `tests/schema/evne_pool/def-evne-t1-matrise.no.json` + `.en.json` — 50 ability-items, 6 options, tekstbåren 3×3-symbolmatrise (engine-gap G2: ingen SVG i v1).
- `tests/schema/evne_pool/def-evne-t2-numerisk.no.json` + `.en.json` — 50 ability-items, 5 options.
- `tests/schema/evne_pool/_evne_pool_batch1_meta.json` — provenance: alle akser/params, fasit, correctIndex, violation-tags, bandDiff per item (korpus-analog av persona-batchene).
- `tests/schema/evne_pool/gen_evne_pool_batch1.py` — deterministisk generator (ingen RNG).
- `tests/schema/evne_pool/selftest_evne_batch1.mjs` — S0–S16.

## Innholdsdesign

- **T1 (matriselogikk):** celleformel `gi = (g0 + RG·c + CG·r) mod 4`, `q = k0 + RC·c + CC·r` over glyfsykluser A <^>v / B /-\|. Aktive akser = regelledd: L 17 (count-across 9 / count-down 8), M 17 (R+cross/D+cross/dual-count), H 16 (full-count/dual-glyph-RG/dual-glyph-CG). Alle viste counts i [1,7], fasit i [1,8]. Distraktorer «1-rule-off»: én RG/CG-glyfmutasjon (+1/−1/+2 mod 4) eller én RC/CC-tellemutasjon per alternativ — aksje-merket i meta (violation-tags).
- **T2 (numerisk):** L 17 (arith 9 / geom 8), M 17 (alternate/diffchain/muladd), H 16 (dual/fib-pairsum/quadratic-inc). Distraktorer: off-by-one, operatornære (≥2/4 innen ±2 steg — selvtest-verifisert), regelbryting (f.eks. drop av d2-ledd i alternate, ×2 som ikke er det neste mult-leddet i muladd). Alle tall rene heltall > 0; fasit aldri i vist sekvens.
- **Bands:** L/M/H = 17/17/16 per tema (34/34/32 %, innen ±0.15 mot spec-target 0.34/0.33/0.33). b-sykler: L −1.75…−1.15, M −0.4…0.4, H 0.6…1.7 — alle i bandvindua. SessionQuota-forutsetningen (8-trekk {L3,M3,H2}) er dekket med margin på begge pooler.
- **Id-mønster:** mx-0001…0050, nm-0001…0050, kontrollert per søsterkonvensjon.
- **Copyright:** alt originalt. Forbudliste (Raven / WAIS-WISC / Mensa / kommersielle banker) er selvtest-S12-verifisert — navnene forekommer ikke i innhold. Regelsekvensene er egne (akseformel), ikke reproducerte Raven-sequenser.

## Verifisering (selftest S0–S16, 1887 sjekker, ALL PASS)

- S1/S2 AJV schema v1 + `validateTestDef` per fil (4 filer). S3-struktur (50+50, unike id, id-mønster, family/scoring/poolId).
- S4 bandvindu + andeler per tema + meta.bandDiff == variant.difficulty.
- S5 fasitkontrakt (6/5 options, correctIndex i vindu).
- S6 **ekte motorsjekk mot scoring.js v1.0.0:** 2-item-probe → theta ≈ 0, SE ≈ 1.678, ci95 omslutter, iqScale null + notNormed true + note.gscore.not-normed; alle-riktig → theta null + warning «alle-riktig»; 49/50-riktig-scenario over hele T1-poolen → theta endelig.
- S7 meta-gjenoppbygging: grid/options/ci/difficulty reproduseres eksakt fra meta-aksene (t1) og seq/correct/distraktorer (t2) — gen-uavhengig avstemming.
- S8/S9 dypekontrakter (counts/vinduer, correctIndex-spredning ≥5/≥4 posisjoner, operatornærhet ≥2/4 per T2-item).
- S10 par-fil: samme id-rekkefølge/ci/labels/difficulty no↔en; prompt-tekst oversatt (labels delt — non-verbal bærer).
- S11 undertype-spredning ≥2 per band per tema. S12 copyright-navn fraværende. S13 kvoteforutsetning.
- S14 maxItems-funn (se under). S15 kryssles mot itemspec (T1/T2-felt + batch #3748-mapping + bandShare). S16 engine-gap G1 fortsatt åpen i render.js.

## Funn og korrigeringer underveis

1. **difficulty-format:** første generering la `difficulty` på item-nivå. Schema v1 har `additionalProperties: false` på item-nivå og krever `difficulty` per **variant**; itemspec-teksten leses lettest som item-level. Rettet til variant-level; selvtesten fanget det (S1/S2 fail → PASS). Skal noteres i #3749-kryssleset.
2. **per-språk-filer:** første generering bar begge varianter i hver fil; motor krever `variant.lang ∈ languages` → én variant per fil i filens språk. Fasita/labels/difficulty er identisk no/en per item (non-verbal bærer), bare prompt-tekst oversatt.
3. T2-items manglet difficulty i første kjøring (S4 fanget); fib-pairsum-sekvenser er 4-elementer, ikke 5 (selvtesten er generalisert).

## maxItems-funn (til sampler-bygget / #3755+)

`gScoreScoring.maxItems` har schema-minimum **10**. Per-tema defs (maks 8 trekk per tema per itemspec) er dermed **ugyldige som defs**. Alternativene er: (a) samledef def-evne-g-44 med `maxItems: 44` per spec.scoringContract.defShape, eller (b) schema v1.1-utvidelse som senker minimum. Itemspec sier avgjørelsen tilhører sampler-bygget — pekt på det, ikke besluttet her. Pool-defene leveres uten scoring.maxItems (kun samledef-shapeen kan legge det på).

## Engine-gaps (non-blokkerende, uforandrede fra spec)

- G1: sampleSession trekker flatt — ingen bandkvoter/undertype-spredning (FASE 4-sampleren).
- G2: Ingen SVG-v1 — T1/T2 kjører på tekstbærer (komplett scoring).
- G3: Ingen per-item klokke — speed-konstruksjoner ekskludert i v1.

## Kryssles-status

Som persona-batchene: kryssles-kontroller er bakt inn i selftesten (S15 kryssles mot itemspec-feltene; S7/S8/S9/S10/S12 erstatter per-item krossles). #3749 (verifiseringsside-leddet kan kjøres som kontroll) kan kjøre selftest + spot-sjekk av meta.

## Regresjon

Uroert: persona batch 1/2/3 (ALL PASS), ipip50 (ALL PASS), evne-itemspec (ALL PASS), rel-itemspec (ALL PASS), nd-itemspec (ALL PASS), engine 72/72, attention 57/57, scoring 27/27 + 27/27, integrasjon 5/5.
