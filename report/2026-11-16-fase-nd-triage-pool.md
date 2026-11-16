# FASE 2 — ND triage-pool (todo #3758)

Dato: 2026-11-16. Prod-tre: filip-webside-prosjekter/brainarea. Speil _delt/brainarea synkronisert.
Kontrakt: tests/schema/_nd_itemspec_spec.json (nd-itemspec-v1, PROPOSED) + DOC-C8C02AD272 (lisensverdigt #3732, GJELDENDE).

## Leveranser (tests/schema/nd_pool/)

- def-nd-triage-pool.{no,en}.json — 40 originale likert-items: ta-0001..ta-0020 (ADHD) + ts-0001..ts-0020 (autisme), temaer 7/7/6 per akse, scoring trait (adhd+autism, weight 1), norms none, options byte-identisk 5-NOYAKTIGHET-anker fra def-ipip50-big5, alle sign 1 (NG-4-dokumentert avvik, ingen reverserte items).
- _nd_triage_pool_meta.json — provenance per item: akse, tema, asrsNear-flagg (5 ta-items) med notater, forfatterregel, themeCounts, motorfakta verifisert.
- gen_nd_triage_pool.py — deterministisk (ingen RNG); re-kjoring byte-identisk (S13).
- selftest_nd_triage_pool.mjs — S0–S14, 78/78 ALL PASS.

## Forfattering

- NO og EN separat forfattet (ingen oversettelse), konstrukt-ekvivalens: samme id-rekkefølge, akse+tema og asrsNear per id; alle 80 tekster unike (S6).
- Stil: førsteperson, presens, 8–14 ord verifisert per item, én setning, ingen dobbeltspørsmål, ingen absolutter (regex + always/never-fri EN), ingen diagnostisk/instrumentspråk (skann 0 treff).
- Kopirett: ingen ASRS/AQ/RAADS-R/DSM/instrument-gjengivelser; ASRS-ankeret bor i live-def (#3760) per verdikten §2/§3 — poolen er 100% originale items; 5 asrsNear-flagg er symptomfamilie-nære vinkler (IKKE kloninger), flagget for FASE 4-utvelgelsen mot ankerets seks formuleringer.

## Verifisering

| Sjekk | Resultat |
|---|---|
| AJV begge defs + ekte validateTestDef | PASS |
| Egen selftest S0–S14 (78 sjekker) | 78/78 ALL PASS |
| Skåring mot ekte scoring.js: probe 2+2 items håndregnet (87.5/37.5, komposit 62.5) | PASS eksakt |
| Hele poolen: alle-5 → 100/100, alle-1 → 0/0 mot ekte motor | PASS |
| sign=-1 inversjon håndregnet etter motor-ens c=verdi-konvensjon (likertContribution, linje ~112) | 37.5 eksakt |
| Triagemodell-integrasjon: akse-skår 55.0 eksakt grense → band-flagged, out-adhd, nextSteps nd-adhd; null-akse band-nodata | PASS |
| Determinisme: generator re-kjøring byte-identisk (3 filer) | PASS |
| Søster-regresjon: nd-itemspec, ipip50, evne-itemspec, rel-itemspec, evne batch1/2/t5, pool ×3 | ALL PASS |
| Motor-regresjon: selftest 72/72, scoring 27/27 + 27/27, attention 57/57, integrasjon 5/5, resume 27/27, repeat 25/25, glm-three-resumes 46/46, handcalc-deepseek 27/27, i18n 22/22 | ALL PASS |

## Funn

- F1 (motorfakta vs spec-ordlyd): spec sier «tom skala faller ut» av trait-kompositten — motor-ens faktiske kontrakt (scoring.js ~290–316): scales[]-raden finnes for ALLE deklarerte skalaer (normalized null, itemsAnswered 0); kompositten utelater skala uten data. Besørende korrigert i selftest S9f/S9g; ingen spec-endring (PROPOSED til #3813).
- F2 (avklart): sign=-1 inverterer ikke symmetrisk — c = rå verdi, vindu [-max,-min]; med én reversert og én normal item ble raw −1 i vindu [−4,4] → 37.5, ikke 25. Dokumentert med tall i S8b.
- F3: temanavn i spec-et har skrivefeil («distraksjones-sårbarhet», «Funksjons-konsegvens»); poolen bruker grammatisk normaliserte former, dokumentert i meta — innhold uendret.

## Åpne punkter

- Skriftlig NYU-bekreftelse (NG-2) før ASRS-blokken settes live (#3760).
- #3759-kryssleset (denne poolen mot lisensbekreftelsen + itemspec) er kjedens verifier-node.
