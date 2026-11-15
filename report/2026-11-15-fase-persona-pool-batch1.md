# FASE 2 — Personlighetspool batch 1: E + A, 100 items (todo #3742)

Dato: 2026-11-15. [3-VEIS] FASE 2, brett #3742. Pool-batch-leveranse til itemspec fra #3734 (IPIP-50-defs commit 18c87e9).

## Leveranser

- `tests/schema/persona_pool/def-persona-pool-e-a.no.json` + `.en.json` — pool-def, 100 likert-items (50 Ekstroversjon, 50 Medmenneskelighet), family `pool`, scoring trait, norms `none`, options identiske med live-def (1–5 IPIP-anker).
- `tests/schema/persona_pool/_corpus_verbatim_en.json` — korpuslistene brukt til S10 (79 verbatim EN-tekster fra 4 offisielle IPIP-sider + 21 originale), med kilder.
- `tests/schema/persona_pool/_persona_pool_selftest.mjs` — S0–S16.

## Innholdsblanding per dimensjon

| Dim | +/− | verbatim | original | Kilder for verbatim |
|---|---|---|---|---|
| Ekstroversjon | 30+/20− | 39 | 11 | IPIP-50 key (10), NEO-domene key (8), Johnson-2014-facets (21) |
| Medmenneskelighet | 25+/25− | 40 | 10 | IPIP-50 key (10), NEO-domene key (12), Johnson-2014-facets (18) |

- EN-tekstene er verbatim fra ipip.ori.org (public domain: «copy, edit, translate, or use them for any purpose without asking permission and without paying a fee», hentet 2026-11-15). Kilder: new_ipip-50-item-scale.htm, newBigFive5broadKey.htm, newNEODomainsKey.htm, 30FacetNEO-PI-RItems.htm.
- NO: 20 gjenbrukte glosar verbatim fra `def-ipip50-big5.no.json` (samme tekst som live-testen for samme konstrukt — S13), 80 nyforfattede.
- Sign-profil: E følger korpusets naturlige asymmetri med 40 %-vindu (begge tegn ≥ 40 % av pool, hard-grense i S4b); A balanseres 25+/25− fordi A-facet-korpuset er minus-tungt (9+/17− i A1–A6).
- Id-mønster `<dimInitial>-NNNN` (e-0001…e-0050, a-0001…a-0050) viderefører søster-konvensjonen; batch 2/3 fortsetter o-…, c-…, n-….

## Verifisering (selftest S0–S16, alle PASS)

- S1/S2 AJV schema v1 + render.js `validateTestDef` per språk. S3 struktur (100/50/50, unike id-er, kontinuerlig løpenummer). S4 keying + 40 %-vindu.
- S5 anker-identitet mot live-def. S6 scoring på uniform-scenarier (1/3/5 begge dim) med håndregnede forventninger og isomorfi mot tradisjonell IPIP-håromregning (Σ_+v + Σ_−(6−v)); motor-spenn [p−5m, 5p−m] bevist eksakt.
- S7 sign-flip symmetri (håndregnet 25.0 begge dim, motor eksakt). S8 ubesvart → coverage-warning. S9 `note.trait.not-normed` til stede (norms `none`).
- S10 korpus-verifikasjon: 79 verbatim-treff eksakt, 21 originale uten korpus-kollisjon.
- S11 unike tekster per språk. S12 item-QC (én setning, ingen and/eller-koblinger, ingen absolutter) for originale items.
- S13 NO-glose-konsistens mot live-def (20/20 identiske). S14 no/en par-konsistens (samme id-rekkefølge, samme sign-mønster). S15 batch-mot-brett (#3742 ~100; dimensjonene slipper ikke inn i batch 2/3). S16 engine-gap dokumentert.

## QC-avvik som er dokumentert, ikke rettet

Verbatim-items «Am always busy», «Am always on the go», «Act wild and crazy» (offisiell IPIP-ordlyd) bryter den strenge original-QC-en (absolutter/koblingsord). De bevares eksakt — public domain-kilden er autoritativ; QC-regelen gjelder originale items. e-0027 ble flyttet fra + til − under verifiseringen for å holde 40 %-vinduet (E var 31/19 = 38 % minus).

## Kryssles-status

Brett #3743/#3745/#3747 er SKIPPET (operatørens subskripsjonsbesparelse, 15.11). Kryssles-funksjonen er bakt inn i selftesten: per-item korpus-sjekk (S10), duplikat/QC (S11/S12), glose-konsistens (S13), batch-grenser (S15). Total-omfang (~275) bekreftes i batch 3.

## Engine-gaps

- Personlighetssporet har ingen pool-sampler (live-persona er fast 50-item). Poolen er forfatterkorpus og utvalgskilde; designvalg (trekk, forkortede utgaver) hører fase 10 til.
- Schema v1 har ingen sign-andel-begrensning; 40 %-vinduet er batch-kontrakt (S4b), ikke motor-gate.

## Regresjon (uroert)

`_ipip50_selftest` ALL PASS · `_evne_itemspec_selftest` ALL PASS · `_rel_itemspec_selftest` ALL PASS · `_nd_itemspec_selftest` ALL PASS · engine selftest 72/72 PASS.
