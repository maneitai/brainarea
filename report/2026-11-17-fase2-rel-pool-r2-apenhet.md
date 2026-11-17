# FASE 2 — relasjonspool R2 «Åpenhet» (op) levert: 60 originale items per språk

**Leaf:** [3-VEIS][BYGG] FASE 2 relasjonspool per dimensjon: R2 åpenhet (op) — worker TR-17BAA4C6A5A0, iterasjon 1.
**Brett:** #3825-blokken (batch 1: R1+R2). **Dato:** 2026-11-17.
**Kontrakt:** `tests/schema/_rel_itemspec_spec.json` (rel-itemspec-v1, PROPOSED; GJELDENDE ved #3813) + lisensverdikt DOC-C8C02AD272 (kontrastgrunnlag — alt innhold egne/original).
**Søster-leveranse:** R1 nærhet (commit 226b3f1) — samme konvensjon, nye låser.

## Leveranser (5 filer i `tests/schema/rel_pool/`)

| Fil | Innhold |
|---|---|
| `def-rel-op-60.no.json` / `.en.json` | 60 likert-items per språk, family relations, scoring trait `[openness weight 1]` norms none, dims `[openness]` med etikett byte-låst til `dimensionDecision` (Åpenhet / Openness) |
| `_rel_pool_r2_meta.json` | 1 rad per item (dimension/theme/sign/seedNear/redundantWith), signPolicy, temaCounts 10+10+10 pos / 10+10+10 neg, holes.closes H-2-delen R2 |
| `gen_rel_pool_r2.py` | deterministisk generator — assert_authoring re-kjøres ved hver kjoring, inkl. 5-gram-kryss mot hele R1-korpuset |
| `selftest_rel_pool_r2.mjs` | 89/89 ALL PASS i prod-tre (S0–S14, speiler R1-konvensjonen) |

## Innhold og design

- **Tema-bånd (R2-construct):** op-t1 ytring av egne behov og grenser, op-t2 invitasjon til motpartens perspektiv, op-t3 tilbakemelding og diskusjonsvillighet — positivt keyede (op-0001..0030, sign 1); op-n1 tildekking av egne behov/grenser, op-n2 unngåelse av uenighet, op-n3 avvisning av tilbakemelding og motperspektiv — negativt keyede (op-0031..0060, sign −1).
- **Sign-policy:** 30/30, blokk-kontinuitet, begrunnet mot live `+-+-` per dimensjon (2 pos + 2 neg velges i FASE 4). Profilkeying i to retninger er dokumentert designvalg — ikke NG-4-avvik.
- **Itemregler (som R1):** ett utsagn, første-person presens, 8–14 ord, ingen dobbeltspørsmål, ingen absolutter (alltid/aldri/always/never), ingen instrument-/diagnose-navn; NO og EN separat forfattet med konstrukt-ekvivalens (Soester-konvensjonen — ikke direkte oversettelse).
- **Redundans:** 8 symmetriske par (redundantWith) til FASE 4-utvelgelse.
- **seedNear:** TOM — themes.R2 i itemspec har ingen exampleSeed (kun R1 har). Tom-listen er låst eksplisitt i S10i og seedPolicy dokumenterer hvorfor.

## Verifisering

- **Staging-først**: def/meta bygget og kjørt i staging (REL_POOL_DIR-override på `rel_pool`-lignende flat mappe) før prod-skriv — prod-kjøring 89/89 ALL PASS.
- **Ekte motor:** S7 håndregnet probe (raw 4, vindu [−8,8] → 75.0); S8 hele poolen (30 pos + 30 neg, span 240): alle-3 → 50.0, pos5/neg1 → 100.0, pos1/neg5 → 0.0; S8b sign −1-inversjon → 37.5.
- **Kryss mot R1:** generator-assert innebygd — programmert 5-gram-skann mot hele R1-korpuset (begge språk) ved hver generator-kjoring (byte-nivå 0 treff); selftest S11 fragment-skann mot kjente instrumentformuleringer: 0 treff; copyright-skann (Gottman/5LL/ENRICH/Prepare-Enrich/ASRS/AQ/RAADS-R/DSM): 0 treff i 120 tekster.
- **Compat-mottak:** `_rel_compat_model.DIMENSIONS[1].id === 'openness'`; pool-skår 50.0 matet inn i `computePairCompatibility` — ok, overall i [0,100].

## Konvensjonsdetaljer (ærlig fanget under bygging)

1. **4-gram → 5-gram-kryss mot R1:** førsteutkastets 4-gram-null-toleranse fanget naturlige domenefraser («folk jeg er glad i», «people in my life») som deler vokabular på tvers av dimensjoner — for strengt. Hevet til 5-gram; 1 reell kollisjon (op-0001 NO 5-gram «folk jeg er glad i») fanget og tekst reparert.
2. **S9c:** selftest-linjen antok at itemspec.defFilePlan.naming nevner «def-rel-op-60» bokstavelig — den gjør det ikke (naming pinner mal-eksemplet def-rel-cl-60 + id-rekkene op-0001..op-0060). Låst til det spec-en faktisk sier: naming-navnet er mal «def-rel-<prefix>-60» avledet etter R1-presedenten (commit 226b3f1), id-rekkene er det faktisk pinnede.
3. **Seed-policy:** R1s S10i låste en to-item-seedListe; R2 har ingen seed i spec og låser tom liste i stedet — speilkonvensjonen ble justert, ikke kopiert blindt.

## Regresjon (urokkert)

- `selftest_rel_pool_r1.mjs` 87/87 ALL PASS (R1-poolen urokkert av det nye kryss-vaktskriptet)
- `tests/schema/_rel_itemspec_selftest.mjs` ALL PASS
- `tests/engine/_scoring_selftest.mjs` DEL1 27/27 PASS

## Hull-status

- **H-2-delen R2 lukket** — rel-pool-status nå 120/240 (R1 60 + R2 60). H-2 forblir åpen til R3 (konflikthåndtering) og R4 (selvstendighet) er levert (batch 2: #3756/#3757).

## Speil

`_delt/brainarea/tests/schema/rel_pool/` + rapport — md5-verifisert byte-identisk synk.
