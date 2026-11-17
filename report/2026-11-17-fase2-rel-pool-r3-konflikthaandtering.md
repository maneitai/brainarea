# FASE 2 — relasjonspool R3 «Konflikthåndtering» (cf) levert: 60 originale items per språk

**Leaf:** [3-VEIS][BYGG] FASE 2 relasjonspool per dimensjon: R3 konflikthåndtering (cf) — 60 originale items (worker TR-7D65F7941837, iterasjon 1).
**Brett:** #3825-blokken (batch 1: R1+R2 levert; batch 2: R3+R4). **Dato:** 2026-11-17.
**Kontrakt:** `tests/schema/_rel_itemspec_spec.json` (rel-itemspec-v1, PROPOSED; GJELDENDE ved #3813) + lisensverdikt DOC-C8C02AD272 (kontrastgrunnlag — alt innhold egne/original).
**Søster-leveranser:** R1 nærhet (commit 226b3f1) + R2 åpenhet (commit 5660b8f) — samme konvensjon, nytt tema.

## Leveranser (5 filer + selftest-rapport i `tests/schema/rel_pool/`)

| Fil | Innhold |
|---|---|
| `def-rel-cf-60.no.json` / `.en.json` | 60 likert-items per språk, family relations, scoring trait `[conflict weight 1]` norms none, dims `[conflict]` med etikett byte-låst til `dimensionDecision` (Konflikthåndtering / Conflict handling) |
| `_rel_pool_r3_meta.json` | 1 rad per item (dimension/theme/sign/seedNear/redundantWith), signPolicy, temaCounts 10+10+10 pos / 10+10+10 neg, holes.closes H-2-delen R3 |
| `gen_rel_pool_r3.py` | deterministisk generator — assert_authoring re-kjøres ved hver kjoring, inkl. 5-gram-kryss mot hele **R1+R2-korpuset** og R3-ekstra vold/ekstremrisiko-token-skann |
| `selftest_rel_pool_r3.mjs` | **94/94 ALL PASS** i prod-tre (S0–S14 + S9f/S10k/S11d R3-utvidelser) |
| `_rel_pool_r3_selftest_report.json` | maskinlesbar selftest-rapport (94 checks) |

## Innhold og design

- **Tema-bånd (R3-construct: «Møte med uenighet: gjenopptaking vs. eskalering, direkte adressering, reparasjonsatferd, regulering av egne reaksjoner»):** cf-t1 taktfull direkte adressering, cf-t2 regulering av egne reaksjoner, cf-t3 reparasjon og oppfølging — positivt keyede (cf-0001..0030, sign 1); cf-n1 eskalering av konflikten, cf-n2 unngåelse av konflikt, cf-n3 manglende reparasjon og oppfølging — negativt keyede (cf-0031..0060, sign −1). De tre negative båndene er speilbildene av de tre positive — konflikt-utsagn MÅ kunne formuleres i begge retninger (themes.R3.itemStyle).
- **Sign-policy:** 30/30, blokk-kontinuitet, begrunnet mot live `+-+-` per dimensjon (2 pos + 2 neg velges i FASE 4). Profilkeying i to retninger er dokumentert designvalg — ikke NG-4-avvik (samme begrunnelse som R1/R2).
- **Itemregler (som R1/R2):** ett utsagn, første-person presens, 8–14 ord, ingen dobbeltspørsmål, ingen absolutter (alltid/aldri/always/never), ingen instrument-/diagnose-navn; NO og EN separat forfattet med konstrukt-ekvivalens (Soester-konvensjonen — ikke direkte oversettelse).
- **R3-ekstra regel (themes.R3.itemStyle):** ingen item refererer ekstrem risiko eller vold (poolen er forbrukertest, ikke sikkerhets-screening) — håndhevet programmert: token-skann i `assert_authoring` (41 termer, NO+EN) ved hver generator-kjoring + selftest S11d (ordgrense-regex, 0 treff i 120 tekster).
- **Redundans:** 6 symmetriske par (redundantWith) til FASE 4-utvelgelse.
- **seedNear:** TOM — themes.R3 i itemspec har ingen exampleSeed (kun R1 har). Tom-listen er låst eksplisitt i S10i; seedPolicy dokumenterer hvorfor.

## Verifisering

- **Staging-først:** def/meta bygget og selftestkjøring i staging-katalog (`REL_POOL_DIR`-override, ajv via prod-fallback) før prod-skriv via WSL-copy — prod-kjøring 94/94 ALL PASS.
- **Ekte motor (håndregnet):** S7 probe raw 4 i vindu [−8,8] → 75.0; S8 hele poolen (30 pos + 30 neg, span 240): alle-3 → 50.0, pos5/neg1 → 100.0, pos1/neg5 → 0.0; S8b sign −1-inversjon → 37.5.
- **Kryss mot R1+R2:** programmert 5-gram-skann mot hele R1+R2-korpuset (begge språk, 240 tekster) i assert_authoring — 0 sammenfall; **2 reelle EN kollisjoner fanget og reparert underveis** (cf-0001 «with people close to me», cf-0013 — samme EN-gram to ganger); fragment-skann S11c: 0 treff; copyright-skann S11a: 0 treff i 120 tekster.
- **R3 vold/ekstremrisiko:** S11d 0 treff (ordgrense-regex, 41 termer); assert_authoring håndhever samme vakt (re-kjøres ved hver kjoring).
- **Compat-mottak:** `_rel_compat_model.DIMENSIONS[2]` = `{conflict, tolerance, tol 0.25}` — tolerance-formelen provet håndregnet: |a−b| = 25 → s = 1, |a−b| = 100 → s = 0; pool-skår 50 matet inn i `computePairCompatibility` → overall i [0,100].

## Konvensjonsdetaljer (ærlig fanget under bygging)

1. **2 EN 5-gram-kollisjoner mot R1+R2-korpuset** (cf-0001, cf-0013 — begge «with people close to me») fanget av assert_authoring og reparert; NO-side grønn i første run.
2. **S11d substring-feilpositiv:** «slår» i guard-listen traff inni «foreslår» (cf-0026, cf-0027) — skannen byttet fra substring til ordgrense-regex med prefix-grense (fanger fleksjoner, ikke innvendige substrings). Guard-termer og skannemodus dokumentert.
3. **Staging-ajv:** staging-katalogen mangler node_modules — selftestens ajv-import har eksplisitt prod-fallback (`node_modules/ajv/lib/ajv.js`); i prod-tre brukes lokal ajv.

## Registre

- **H-2 (rel-pool-hull):** R3 lukker sin del — rel-pool-status 180/240 etter R1+R2; fortsatt åpen til R4 er levert.
- **Normering-endepunktet (#3724):** urørt av denne leveransen; står i kjeden som planlagt arbeid.
- FASE 4-utvelgelsen velger 4 items per dimensjon fra poolen (2 pos + 2 neg, maks ett per redundantWith-par).
