# FASE 2 — Evne-pool batch 2: T3 verbal + T4 romlig, 90 items (todo #3750, gjenopptak)

Dato: 2026-11-16. [3-VEIS] FASE 2, brett #3750 (gjenopptak via #3814 etter iterasjonsstopp). Pool-batch-leveranse til `_evne_itemspec_spec.json` — autorert mot T3/T4-feltene der (poolId, idPrefix, poolMin 50/40, optionsPerItem 5, bandvindu, copyrightControl.forbidden).

## Leveranser (prod-tre, commits 5650c87 + 13198b1)

- `tests/schema/evne_pool/def-evne-t3-verbal.no.json` + `.en.json` — 50 verbal-reasoning items, 5 options, tekstbåren (vr = oddone / analogi / klassifisering / leksikalsk).
- `tests/schema/evne_pool/def-evne-t4-romlig.no.json` + `.en.json` — 40 spatial items, 5 options, tekstbåren (posisjon/retning/koordinat/rotasjon/speiling/stabling/bretting/sti/bordrekk/avstand).
- `tests/schema/evne_pool/_evne_pool_batch2_meta.json` — provenance: akser/fasit/correctIndex/violation-tags/optionOrder_{no,en}/authoring-konvensjoner/kvote-margin.
- `tests/schema/evne_pool/gen_evne_pool_batch2.py` — deterministisk generator (ingen RNG, roteringssekvens ROT_SEQ).
- `tests/schema/evne_pool/selftest_evne_batch2.mjs` — S0–S16, 68 sjekker.

## Innholdsdesign

- **T3 (verbal):** bands L/M/H = 17/17/16 (34/34/32 %, innen ±0.15); undertyper 3 per band. NO/EN separat forfattet per språk med konstrukt-ekvivalens (samme band+subtype per indeks), 0 identiske prompts/fasitord over språkpar; EN vr-0045/0046 er egne konstruksjoner (15 frukter → 5 par; runde fire → 19:35) slik at fasitverdier aldri kolliderer over språk.
- **T4 (romlig):** bands 14/13/13; undertyper 12 totalt (6/7/8 L/M/H). Par-variant-konvensjon: prompt+valg oversatt, samme correctIndex og rotposisjon per språkpar.
- **Distraktorer:** semantisk nære med violationTags per alternativ (none på fasit) i meta.
- **Per-språk-filer:** én variant per fil i filens språk, variant-level difficulty i bandvinduene (batch 1-konvensjonen videreført).

## Verifisering (selftest S0–S16, 68/68 ALL PASS — re-kjørt 2026-11-16, 0 FAIL)

- S1/S2 AJV schema v1 + `validateTestDef` per fil (4 filer). S3 struktur (50+40, ids, family/scoring/poolId).
- S4 bandvindu + andeler per tema; S15c meta-bands == varianttellinger (T3 17/17/16, T4 14/13/13).
- S5 fasitkontrakt: 5 options, correctIndex i vindu.
- S6 ekte motorsjekk mot scoring.js v1.0.0: 2-item-probe → theta ≈ 0, SE ≈ 1.678, ci95, iqScale null, notNormed, note.gscore.not-normed; 49/50 og 39/40 → theta endelig; alle-riktig → theta null + warning.
- S7 optionOrder/violationTags/fasit-paritet 360 variant-sjekker (avvik 0); S7b construct-ekvivalens NO/EN; S7c separat-forfattet-kontroll; S7d T4 par-variant-rotposisjon.
- S8 tekstkontrakter (oddone 5 ord, ingen tomme prompts/labels); S9 copyright-skann 0 treff (Raven/WAIS/WISC/Mensa fraværende — grep re-verifisert uavhengig).
- S11 undertype-spredning ≥2 per band; S13 kvote-marginer mot 8/7-trekk-kvotene (T3 17≥5, T4 14≥4 osv.); S15a/b itemspec-kryssles (T3 vr poolMin 50/draw 8/5 opts, T4 sp poolMin 40/draw 7/5 opts); S16 G1 åpen til FASE 4, G2 full for T3/T4 (alle prompts ren tekst).

## Funn og rettinger underveis (fra #3750-kjeden, fangeslitt i 5650c87)

1. Meter-oddone utvidet 4→5 ord (hastighetsmåler lagt til).
2. Måne-klassifisering: måned→månering / month→moon ring — etymologisk falsk fasit unngått.
3. EN vr-0045/0046 erstattet med egne konstruksjoner (fasit-kollisjon over språk ville brutt S7c).
4. maxItems-funn (batch 1 G-max) videreført i S14: sessionQuota-maks 8 < scoring maxItems-min 10 per pool-tema — samledef-avgjørelse til sampler-bygget, ikke avgjort her.

## Speil-korreksjon (2026-11-16)

`tests/schema/evne_pool` var aldri rullert til speilet — batch 1 (5efb75a) og batch 2 lå kun i prod-treet. Hele katalogen inkl. begge batcher er nå synket til `F:\maneit\data\work\_delt\brainarea\tests\schema\evne_pool`, og `report/` er synket additivt.

## Engine-gaps (non-blokkerende, uforandrede fra spec)

- G1: sampleSession trekker flatt — ingen bandkvoter (FASE 4-sampleren).
- G2: ingen SVG v1 — T3/T4 kjører fullt på tekstbåren (komplett scoring, i motsetning til T1).
- G3: ingen per-item klokke — speed-konstruksjoner ekskludert i v1.

## Kryssles-status

Kryssles-kontroller bakt inn i selftesten (S15) som i persona-batchene; oppfølgingsleddet kan kjøre selftest + spot-sjekk mot meta.

## Regresjon

Uroert (commit 13198b1-kjoring): batch 1 ALL PASS, evne-itemspec/ipip50/nd/rel ALL PASS, engine 72/72, attention 57/57, scoring 27/27 + 27/27, integrasjon 5/5. Re-verifisert i denne kjøringen: engine 72/72 PASS, batch 2 selftest 68/68 ALL PASS.

