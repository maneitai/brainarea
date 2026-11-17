# FASE 2 — relasjonspool R4 «Selvstendighet» (iv) levert: 60 originale items per språk — H-2 LUKKET (240/240)

**Leaf:** [3-VEIS][BYGG] FASE 2 relasjonspool per dimensjon: R4 selvstendighet (iv) — 60 originale items, ingen normalisering av ekstrempolene (worker TR-58667D9E69B0, iterasjon 3).
**Brett:** #3825-blokken (batch 2: R3+R4). **Dato:** 2026-11-17.
**Kontrakt:** `tests/schema/_rel_itemspec_spec.json` (rel-itemspec-v1, PROPOSED; GJELDENDE ved #3813) + lisensverdikt DOC-C8C02AD272 (kontrastgrunnlag — alt innhold egne/original).
**Søster-leveranser:** R1 nærhet (commit 226b3f1) + R2 åpenhet (commit 5660b8f) + R3 konflikthåndtering (commit 04fe929) — samme konvensjon, nytt tema.

## Leveranser (5 filer + selftest-rapport i `tests/schema/rel_pool/`, commit 37d4e78)

| Fil | Innhold |
|---|---|
| `def-rel-iv-60.no.json` / `.en.json` | 60 likert-items per språk, family relations, scoring trait `[independence weight 1]` norms none, dims `[independence]` med etikett byte-låst til `dimensionDecision` (Selvstendighet / Independence) |
| `_rel_pool_r4_meta.json` | 1 rad per item (dimension/theme/sign/seedNear/redundantWith), signPolicy, temaCounts 10+10+10 pos / 10+10+10 neg, holes.closes H-2-delen R4 = 240/240 |
| `gen_rel_pool_r4.py` | deterministisk generator — assert_authoring re-kjøres ved hver kjoring, inkl. 5-gram-kryss mot hele **R1+R2+R3-korpuset**, arvet vold/ekstremrisiko-token-skann (41 termer) og R4-ekstra normativ-token-forbud |
| `selftest_rel_pool_r4.mjs` | **99/99 ALL PASS** i prod-tre (S0–S14 + S4b/S9f/S10k/S10l/S11d/S11e R4-utvidelser) |
| `_rel_pool_r4_selftest_report.json` | maskinlesbar selftest-rapport (99 checks) |

## Innhold og design

- **Tema-bånd (R4-construct: «Egen tid, egne venner/interesser, graden av autonomi i nære relasjoner (såvel samliv som vennskap), balanse mellom fellesskap og 'vi'»):** iv-t1 egen tid og eget rom, iv-t2 egne venner og interesser, iv-t3 balansen mellom 'vi' og 'jeg' — positivt keyede (iv-0001..0030, sign 1); iv-n1 sammen-tid trekkes foran egen tid (fusjonstrekk), iv-n2 egen rytme/eget rom løser seg opp (oppgitt autonomi), iv-n3 ubehag med andres autonomi — negativt keyede (iv-0031..0060, sign −1).
- **R4-ekstra regel (themes.R4.itemStyle):** ingen item normaliserer enten ekstrem (full fusjon eller full uavhengighet) — begge ender er gyldige profiler. Håndhevet programmert: alle items forfattet som førstepersons-preferanser/beskrivelser (aldri norm-språk «burde/should/sunt/healthy/normal/ideal») — normativ-token-skann i `assert_authoring` (NORM_TOKENS) ved hver kjoring + selftest S11e (ordgrense-regex, 15 termer, 0 treff i 120 tekster). Absolutter ('alltid'/'aldri'/'always'/'never') var uansett forbudt per stilreglen; endepunkt-formuleringer holdt ute ved forfattering.
- **Sign-policy:** 30/30, blokk-kontinuitet, begrunnet mot live `+-+-` per dimensjon (2 pos + 2 neg velges i FASE 4). Profilkeying i to retninger er dokumentert designvalg — ikke NG-4-avvik (samme begrunnelse som R1/R2/R3). Poolen keyer preferansegrad, aldri normaliserende «god oppløsning».
- **Itemregler (som R1/R2/R3):** ett utsagn, første-person presens, 8–14 ord, ingen dobbeltspørsmål, ingen absolutter, ingen instrument-/diagnose-navn; NO og EN separat forfattet med konstrukt-ekvivalens (Soester-konvensjonen — ikke direkte oversettelse).
- **Redundans:** 6 symmetriske par (redundantWith) til FASE 4-utvelgelse.
- **seedNear:** TOM — themes.R4 i itemspec har ingen exampleSeed (kun R1 har). Tom-listen er låst eksplisitt i S10i; seedPolicy dokumenterer hvorfor.

## Verifisering

- **Prod-tre-kjøring:** alt arbeid utført direkte mot prod-treet via WSL 9p-montering av F: (samme arbeidsmønster som #3716-økten); selftest kjører mot ekte prod-motor (render.js/scoring.js/_rel_compat_model.mjs, ajv via prod node_modules-fallback) — 99/99 ALL PASS.
- **Ekte motor (håndregnet):** S7 probe raw 4 i vindu [−8,8] → 75.0; S8 hele poolen (30 pos + 30 neg, span 240): alle-3 → 50.0, pos5/neg1 → 100.0, pos1/neg5 → 0.0; S8b sign −1-inversjon → 37.5.
- **Kryss mot R1+R2+R3:** programmert 5-gram-skann mot hele korpuset (begge språk, 360 tekster) i assert_authoring — 0 sammenfall; **7 reelle kollisjoner/token-funn fanget og reparert underveis** (iv-0022/0027/0035/0038/0051/0060 5-gram, iv-0029 «never»); intern 5-gram-skann innen R4 (120 tekster): 0 kollisjoner.
- **Substring-pseudotreff (ærlig fanget):** «whenever» ⊃ «never» (iv-0035, iv-0052) og «thoughts» ⊃ «ought» (iv-0005 EN) fanget av arvede substring-baserte vakter (S4b EN, S11a/b). Presedens valgt: **vaktene omdefineres ikke per pool** (R3-presedens reparerte også innholdet) — 3 EN-formuleringer reformulert. S11d vold-skann (arvet R3-liste) ble stående på ordgrense-regex: 0 treff.
- **R4 normativ-token-skann:** S11e 0 treff (ordgrense-regex, 15 termer); assert_authoring håndhever samme vakt (NORM_TOKENS, re-kjøres ved hver kjoring).
- **Compat-mottak:** `_rel_compat_model.DIMENSIONS[3]` = `{independence, tolerance, tol 0.35}` — tolerance-formelen provet håndregnet: |a−b| = 35 → s = 1, |a−b| = 100 → s = 0; pool-skår 50 matet inn i `computePairCompatibility` → overall i [0,100].

## Konvensjonsdetaljer (ærlig fanget under bygging)

1. **7 reelle forfattersjekk-funn** fanget av assert_authoring og reparert (6 5-gram-kollisjoner mot R1–R3-korpuset + 1 «never»-token) — assert re-kjøring fanget dem på plass i generator-loop.
2. **3 substring-pseudotreff** i arvede vakter («whenever»/«thoughts») — vakter stående uendret (konvensjonsparitet med R1–R3-skannene); innholdet reformulert.
3. **15 NO-grammatikk-klargjøringer** under egen-QC-forfatterrunde (a/á-forvekslinger, «ordner sine ting»-forbenning, fragmentarisk EN-halvsetning i iv-0033) — ferdig før selftest skrevet; ingen av selftest-vaktene fanges av disse (de er stil/grammatikk, ikke kontraktsbrudd).

## Regresjon (urokkert etter commit 37d4e78)

- rel_pool_r1 87/87 ALL PASS, rel_pool_r2 89/89 ALL PASS, rel_pool_r3 94/94 ALL PASS
- rel-itemspec ALL PASS; scoring 27/27 + integrasjon 5/5

## H-2 status

**LUKKET.** holes.closes i `_rel_pool_r4_meta.json` dokumenterer 240/240: R1 cl 60/60 (226b3f1) + R2 op 60/60 (5660b8f) + R3 cf 60/60 (04fe929) + R4 iv 60/60 (37d4e78). Alle fire dimensjons-poolene er levert; FASE 4-utvelgelse (16 live-items, 4 per dimensjon, `+-+-`-valg) kan ta fatt.

CopyrightControl: alle 120 tekster egne/original forfattet fra themes.R4-construct'en, ingen instrumentnavn (Gottman/5LL/ENRICH/Prepare-Enrich/ASRS/AQ/RAADS-R/DSM), ingen normative utsagn, ingen ekstrempol-normalisering.

Speil `_delt/brainarea/tests/schema/rel_pool` synket (md5-verifisert identisk).
