# FASE 3 — Personlighet-sporet: NO-oversettelse kvalitetskontroll (3-VEIS, brett «FASE 3: NO-oversettelse personlighet»)

Dato: 2026-11-16. Kjede: utkast-verdict (A) → anonym kritikk (B) → syntese (C). Verdict: **GJELDENDE — 16 rettelser anvendt, 5 holds, 2 pins.**

## 0. Status og metode-ærlighet

Det eksisterte allerede et komplett NO-lag: alle 275 personlighets-items (poolene e-a/o-c/n-rest) har NO-tekst, 50 av dem gloss-låst verbatim mot live-defen (`def-ipip50-big5.no.json`). Steget er dermed **ikke** «oversett fra tomrom» men «deliberasjon over eksisterende oversettelse med tre-families metode». EN-side (verbatim fra ipip.ori.org, public domain, + 34 originale) er frossen — EN-endringer er utenfor dette stegets mandat.

Metodeskille in-context (ask_agent-spawning fra todo-run-kontekst feiler med «ukjent chat» — samme feilmodus som #3764-pin-forespørselen): uavhengighet er metodeskilt (ulike scan-familier per familie), ikke kontekstskilt. Pin-forslag: re-kjør en ekte B-simulering via ask_agent fra hovedchatt-kontekst.

## 1. Verifiserte grunnlag (maskinfunn)

- 50 gloss-par i `_live_gloss_map.json` → verifisert 0 avvik mot live-defen (EN-tekst → id → live-NO-tekst-kjede). **Gloss-laget er intakt.**
- Options-paritet: alle 6 pool-defer har options identiske med live-def (no/en), S5-kontrakten holdt.
- Ingen NO-tekst-dubletter på tvers pools (verifisert før og etter rettinger).
- Korpus-kryss: 216 verbatim-EN-tekster bekreftet mot 4 IPIP-kilder; originalsiden skiller renset (13 o-c + 21 e-a + n-rest originals). EN «Am always prepared.»-style absolutter er kildetro — bevares (FASE 2-premiss).
- EN-side preposisjonsbug funnet i original-item e-0027 («take part **at**»); EN er frossen, dokumentert utenfor mandat; NO-tekst er korrekt.

## 2. Rettelser (16) — full liste i `_fase3_personality_verdict.json` + `_oversettelse_rettinger.json`

Klasse i (mekanisk, 5): a-0024 innledende mellomrom; e-0012 «muntre → munterer opp»; n-0021 «ked av det» → «nedstemt» (danskism + gloss-konsistens mot n-0010); o-0002 «drömmer → drømmer» (svensk vokal); etikett+beskrivelse C-dimensjon samordnet mot live-def («Planmessighet → Planlagthet», «målrettethet → målretting»).

Klasse ii (betydningsskifte, 4): e-0007 «overtar styringen → tar styringen» (EN «Take charge» antar ikke eksisterende leder); n-0012 «mister humøret → mister besinningen» (EN «Lose my temper» er sinneutbrudd); a-0045 «elsker en tøff krangel → liker en skikkelig krangel» (overdrivelse rettet); C-etikett-divergens (samme som klasse ii her — konsistens IS korrekthet).

Klasse iii (register/naturlighet, 7): e-0011 «raskt varm med andre folk → kommer raskt på god fot med andre»; e-0013 «store selskaper → store fester»; e-0043 «folkemengder → store folkemengder»; e-0047 «utkjørt → utmattet»; a-0048 «høyt syn på meg selv → høyt selvbilde» (adskiller seg fra søsteritem a-0047); c-0032 konsentrasjonsformulering strammet; n-0055 «ut av spilled → ryster meg ikke» (spill-metafor brukt feil).

## 3. Holds (5) — dokumentert, ikke rettet

a-0031 («Cut others to pieces.» → «Jeg kritiserer folk brutalt.» — metafor uten etablert NO-motpart), n-0015 («Go on binges.» → «Jeg går på spiseorgier.» — smalning til mat er facet-tro, litt klinisk register, godkjent med tvil), e-0038, n-0030, a-0030 ( «skarp tunge» — dialektladet alternativ vurdert, holdt). Verdict per hold: funksjonelt ekvivalente, minimal-intervensjonsprinsippet.

## 4. Uttalelser (4) — beslutningsklare, ingen kode berørt

1. **Gloss-låste (50):** ingen ekte bokmålsfeil; 0 avvik mot live-def. Endring krever eget live-steg.
2. **Dimensjons-etiketter:** conscientiousness = **Planlagthet** i alle defs. Enforced i o-c (was Planmessighet). Beskrivelse samordnet («målretting»).
3. **Option-labels:** NO «Hverken unøyaktig eller nøyactlig» avviker i leddrekkefølge fra EN («Neither Accurate Nor Inaccurate») men er semantisk lik og S5-låst mot live-def. Ikke-rørbart fra pool-nivå; FASE 1-eid live-sak, dokumentert.
4. **«folk»-registeret:** e-a's folkelig «folk»-kvoten (27 tekster) er en bevisst stilkvote, ikke harmoniseres mot o-c/n-rest. Employer-rammens formalitet håndteres i render-sjiktet, ikke item-tekster.

## 5. Eskalasjoner (design, ikke språk)

**ID-kollisjoner tvers pools:** a-0001..a-0005/e-0001..e-0005 finnes i både e-a og n-rest med ulike tekster; samme for o/c-0001..0005 (o-c vs n-rest). Per-pool selftester skriker ikke (per-pool-scope), men alle senere fase-ledd som nøkler på item-id tvers pools (renderer-referanser, QC-oppslag, normering-ankre) har tvetydig nøkkel. **Pin-forslag: eget steg for tvers-pool id-uniqueness (endre n-rest-ids til n-a-0001-mønster eller liknende), med selftest-oppdatering.**

## 6. Regresjon (etter rettinger)

Persona-batch selftests 1/2/3: ALL PASS ×3. Engine selftest 72/72. IPIP-50 selftest ALL PASS. ND-itemspec selftest ALL PASS. Normering selftest 107/107. — Ingen andre bindings ble brast.

## 7. Filleveranser

- `tests/schema/persona_pool/def-persona-pool-{e-a,o-c,n-rest}.no.json` — rettelser anvendt (16)
- `tests/schema/persona_pool/_fase3_personality_verdict.json` — maskinlesbar verdict (rettelser/holds/uttalelser/pins/summary)
- `tests/schema/persona_pool/_oversettelse_review_sheet.json` — 275 par med gloss-ref (bevis)
- `tests/schema/persona_pool/_spraak_skann_result.json` — mekanisk språkskann
- `report/2026-11-16-fase3-personlighet-oversettelse.md` — denne rapporten
- Speil _delt/brainarea: synkronisert under kjøring

## 8. Pins (operatøren avgjør)

1. Ekte B-familie-simulering (ask_agent fra hovedchatt-kontekst).
2. Id-kollisjons-steg (tvers-pool item-id-uniqueness) før FASE-nivå som nøkler tvers pools.
