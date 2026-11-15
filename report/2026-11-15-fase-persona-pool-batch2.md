# FASE 2 — Personlighetspool batch 2: O + C, 100 items (todo #3744)

Dato: 2026-11-15. [3-VEIS] FASE 2, brett #3744. Pool-batch-leveranse til itemspec fra #3734; søster-nummer til batch 1 (#3742, E + A, 100 items, samme dag).

## Leveranser

- `tests/schema/persona_pool/def-persona-pool-o-c.no.json` + `.en.json` — pool-def, 100 likert-items (50 Åpenhet/Openness, 50 Planmessighet/Conscientiousness), family `pool`, scoring trait, norms `none`, options identiske med live-def (1–5 IPIP-anker).
- `tests/schema/persona_pool/_corpus_verbatim_en_o_c.json` — korpuslistene brukt til S10 (87 verbatim EN-tekster fra 4 offisielle IPIP-sider + 13 originale), med kilder.
- `tests/schema/persona_pool/_persona_pool_batch2_selftest.mjs` — S0–S16, samme struktur som batch-1-selftesten.

## Innholdsblanding per dimensjon

| Dim | +/− | verbatim | original | Kilder for verbatim |
|---|---|---|---|---|
| Openness | 30+/20− | 45 | 5 | BigFive Factor V key 20-item (17 av 20), NEO-domene key 20-item (12 av 15 ny-tegnede), Johnson-2014-facets O1–O5 (8) |
| Conscientiousness | 30+/20− | 42 | 8 | BigFive Factor III key 20-item (18 av 20), NEO-domene key 20-item (11 av 14 ny-tegnede), Johnson-2014-facets C1–C6 (9) |

- EN-tekstene er verbatim fra ipip.ori.org (public domain: «copy, edit, translate, or use them for any purpose without asking permission and without paying a fee», hentet 2026-11-15). Kilder: newBigFive5broadKey.htm (Factor III/Factor V 20-item), newNEODomainsKey.htm, 30FacetNEO-PI-RItems.htm, new_ipip-50-item-scale.htm (O/C-tekster delmengde av O20/C20).
- NO: 20 gjenbrukte glosar verbatim fra `def-ipip50-big5.no.json` (alle 10 O- og 10 C-tekstene i live-testen — samme tekst som live-testen for samme konstrukt, S13), 67 egne oversettelser, 13 egne original-NO.
- Sign-profil: begge dim 30+/20− (60 %/40 %), innenfor 40 %-vinduet (S4b). Pluss-tegnede utvalgt fra korpusets pluss-tungheit; 5 originale O-items + 8 originale C-items fyller pluss-slotsene jevnt (O: posisjon 5/11/17/23/29, C: 4/8/12/16/20/24/27/29 i pluss-rekkefølgen).
- Id-mønster `<dimInitial>-NNNN` (o-0001…o-0050, c-0001…c-0050) viderefører søster-konvensjonen; batch 3 fortsetter n-….
- Presentasjonsstruktur per dim: [+, −, +, −, +] × 10 blokker (alternerte tegn i presentasjonsrekkefølge, i tråd med IPIPs eget anbefalt prinsipp om å blande +/−keyed items).

## Utvelgelsesbeslutninger (dokumentert, ikke skjult)

- **O6-verditekster ekskludert** (12 av 17): politiske og tillitsverdier hører til A-begrepet i vår konstruktforståelse og ville doble A-innhold i O-poolen; O6 +/−-par i BigFive-området ('Tend to vote for liberal/conservative political candidates.') er bevart fordi de er del av NEO O-definisjonen i seg selv.
- **'Feel others' emotions.' ekskludert** — eksakt batch-1-dupe (a-pool, verbatim); kollisjon verifisert i batch-1-defen.
- **3 C-minus-semantiske duplikater droppet**: 'Mess things up.' (≈'Make a mess of things.'), 'Rush into things.' og 'Act without thinking.' (≈'Jump into things without thinking.'); C-minus ble 20 av 23 tilgjengelige.
- **3 NEO-O-pluss 6/…-duplikater mot BigFive-O20 utelatt** ('Enjoy hearing new ideas.' osv. — teller nøyaktig i tabellen ovenfor).

## Verifisering (selftest S0–S16, alle PASS)

- S1/S2 AJV schema v1 + render.js `validateTestDef` per språk. S3 struktur (100/50/50, unike id-er, kontinuerlig løpenummer). S4 keying + 40 %-vindu (begge dim 30+/20−).
- S5 anker-identitet mot live-def. S6 scoring på uniform-scenarier (1/3/5 begge dim) med håndregnede forventninger og isomorfi mot tradisjonell IPIP-håromregning (Σ+v + Σ−(6−v)); motor-spenn [p−5m, 5p−m] bevist eksakt.
- S7 sign-flip symmetri (håndregnet 25.0 begge dim, motor eksakt). S8 ubesvart → coverage-warning. S9 `note.trait.not-normed` til stede (norms `none`).
- S10 korpus-verifikasjon: 87 verbatim-treff eksakt, 13 originale uten korpus-kollisjon, korpuset duplikatfritt, 4 kilder dokumentert.
- S11 unike tekster per språk. S12 item-QC for originale items (én setning, ingen and/og/eller-koblinger, ingen absolutter).
- S13 NO-glose-konsistens mot live-def (20/20 identiske). S14 no/en par-konsistens (samme id-rekkefølge, samme sign-mønster).
- S15 batch-mot-brett (#3744 ~100; O/C slipper ikke inn i batch 1/3; ingen tekst-kollisjon mot batch 1; alle 20 live O/C-tekster verifisert til stede i poolen). S16 engine-gap dokumentert.

## QC-avvik som er dokumentert, ikke rettet

Verbatim-items 'Am always prepared.' (offisiell IPIP-ordlyd) bryter den strenge original-QC-en (absolutt-ordet 'always'). Bevares eksakt — public domain-kilden er autoritativ; QC-regelen gjelder originale items, samme praksis som batch 1 ('Am always busy', 'Am always on the go').

## Kryssles-status

Kryssles-funksjonen er bakt inn i selftesten (samme konvensjon som batch 1): per-item korpus-sjekk (S10), duplikat-/QC-sjekk (S11/S12), glose-konsistens (S13), batch-grenser og kollisjoner (S15). Totalt-omfang (~275) bekreftes i batch 3 (#3746).

## Engine-gaps (arvet fra batch 1)

- Personlighetssporet har ingen pool-sampler (live-persona er fast 50-item). Poolen er forfatterkorpus og utvalgskilde; designvalg hører fase 10 til.
- Schema v1 har ingen sign-andel-begrensning; 40 %-vinduet er batch-kontrakt (S4b), ikke motor-gate.

## Regresjon (uroert)

`_persona_pool_selftest` (batch 1) ALL PASS · `_persona_pool_batch2_selftest` ALL PASS · `_ipip50_selftest` ALL PASS · `_evne_itemspec_selftest` ALL PASS · `_rel_itemspec_selftest` ALL PASS · `_nd_itemspec_selftest` ALL PASS · engine selftest 72/72 PASS · attention 57/57 PASS · scoring del1 27/27 + del2 27/27 PASS · integrasjon 5/5 PASS.
