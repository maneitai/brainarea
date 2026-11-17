FASE 3 — [VERIFISER] Full plan-samsvarsgjennomgang mot preplanen (søster-leaf, TR-94CD8F5EE2CF, iter 1) — 2026-11-17

Metode-ramme: en familie som IKKE rørte arbeidet leser alle artefakter mot preplanen (DOC-373E4AFEEB, «Brainarea — fullverdig bygge- og lanseringsplan», faseinndelt v1) og rapporterer avvik. Ingen leveransekode er mutert i dette steget. Additivt: kun denne rapporten.

## 1. Metode og kildemarkering

- **[LEST]** Preplanen lest i fullversjon fra substratet (DOC-373E4AFEEB, 20 743 tegn): alle faser 0–10, DoD-liste (§10), åpne beslutninger (§11), ikke-validert-liste (§12), risiko (§13).
- **[LEST]** Alle 28 rapporter i report/ skannet med mønstersøk (åpen/blokkerende/hold/pin/kontrakt/beslutning); 8 lest i fulltekst (alpha, QC, delgraf, share-link, OG-kort, FASE 1-samlet, personvern, normering).
- **[KJØRT FRESH]** Selftest-batteriet re-kjørt i prod-tre (WSL-node v22.22.1) + bygg re-kjørt. Resultater i §2.
- **[SPOT-SJEKKET MOT DISK]** AV-1-korupsjon, verdict-filer, T5-pool-filer, .github-workflows.

## 2. Fresh-kjøringer i prod-tre (denne økten, alle 2026-11-17)

| Harness | Resultat | Merk |
|---|---|---|
| tests/engine/selftest.mjs | 72/72 PASS (×2) | exit 0 begge |
| tests/i18n/_i18n_selftest.mjs | 22/22 PASS | |
| tests/schema/_ipip50_selftest.mjs | ALL PASS | isomorfi-prov mot scoring.js |
| tests/schema/_fase3_og_selftest.mjs | 163/163 PASS | |
| tests/schema/_fase3_share_link_selftest.mjs | 108/108 PASS | stdout-md5 4ced62f590e8ef23a79bf3a9cb9ee86e — identisk med rapportens verdi |
| tests/schema/_rel_share_graph_selftest.mjs | 46/46 PASS | |
| tests/schema/_fase3_pdf_selftest.mjs | 105/105 PASS | |
| report/_report_selftest.mjs | 74/74 PASS | |
| app/_verify_hreflang.mjs | 171/171 PASS | |
| tests/functions/_normering_selftest.mjs | 106/107 → **107/107** | se F-N1; D-leddene (D.*-sjekkene) kjører engine/scoring/attention/resume/repeat/glm/handcalc/ads som subprosesser — full pass ved re-kjøring gir fresh-dekning for hele disse suitene |
| tests/schema/_alpha_sim.py | 19/19 PASS | teori≡sim, tall samsvarer med rapporten (0.9230/0.9501 band L/M) |
| app/build.js (full SSG) | build ok: 14 pages + robots + sitemap + 404 | basePath /brainarea/ holdt, E.build-deterministic PASS innenfor normering-suitten |

## 3. Preplan-premisser ([B]) — etterlevelse kryss mot leveranser

| [B]-premisse | Status | Bevis ([KJØRT]/[LEST]/[SPOT]) |
|---|---|---|
| Statisk klient, ingen backend; GitHub Pages først | HOLDT | [LEST] kun functions/normering.js (Cloudflare Pages Functions-monster), ærlig stored:false på github.io; bygg ren statisk SSG |
| Gratis side finansiert av reklame; ingen konto/betaling/Work-produkt | HOLDT | [LEST] ads mock-merket (beslutning 11), payment-avskjær verifisert i FASE 1-suite |
| NO+EN fullt ut | HOLDT | [KJØRT] 14 sider begge språk fra samme kilde; i18n-paritet 22/22 |
| Annonser aldri i spørsmålsflyten (beslutning 11) | HOLDT | [LEST] adSlots() kaster for testruter; plassering 2 enheter per landingsside × locale; testflyt annonsefri |
| IQ indikativt, ikke normert, ikke Mensa [NV] | HOLDT | [LEST+SPOT] ærlighets-etiketter i alle resultattekster; alpha/QC-rapportene merket «instrument-estimat, ikke måling»; normNote-nekting verifisert i 3rd-party-kjedene |
| Pools større enn trekk, seeded randomisering | HOLDT | [LEST] pool-batches 40–90 items per tema vs trekk ≤ 8; determinisme-batterier i engine-suite |
|PERSONA og evne er separate tester | HOLDT | [LEST] separate defs/scoring/ruter |
| Fullverdig ved FØRSTE publisering (ikke MVP) | IKKE MÅLBAR ENNÅ | FASE 8-QC/DoD ikke nådd — se §6 |

Par-kompatibilitet via URI-hash (beslutning 16/[A]): share-link-transport (#d=) bygget og verifisert (108/108, browser-load-verifikasjon foreligger), visningslager kobles FASE 4 — samsvarer med planen.

## 4. Åpne punkter arvet fra rapportene (konsolidert, alle dokumentert av eier-steg)

1. **AV-1 (FASE 1, mikro-bygg-eid):** ø→Å-tekstkorrupsjon i i18n/no.js:187 («spÅrsmå») og :191 («fÅr») — **[SPOT] bekreftet fortsatt til stede i prod i dag**. Tre søster-rapporter (rel/nd/personlighet-oversettelse) berører samme pin (H3-konvensjonen). Fix er mikro-[BYGG] + rebuild + i18n-tekstskann som ny selftjekk.
2. **Puzzle s3-slot-avvik (BLOKKERENDE for puzzle-sporet):** 29/30 s3-items uløselige fra prompten, bevist fra to uavhengige familier (spilltest TR-B55C8A22BA1A + skåringsgyldighet DOC-29CC9CFE0D). Fix rettes i [BYGG]-kjeden (fasit p3 + prompt-basert re-avledning). Alpha-rapporten er ærlig om at puzzle-α-tallene er maks-estimater inntil det.
3. **Fase 10 er målesteget:** α/QC-tallene er instrument-estimer under eksplisitte etiketter — ingen av rapportene fremstiller dem som målinger. Fire under-0.70-rader rapportert, ikke skjult (#3769 krever). Rel-pool α (R1–R4) er IKKE beregnet — rapportene er ærlige om det; brett #3825 eier egen leveranse-runde.
4. **Engine-gaps G1/G2/G3 (non-blokkerende, FASE 4-sampler):** flat sampling (ingen bandkvoter), ingen SVG-v1-visning, ingen per-item klokke. MaxItems-skillet (samledef 44 vs per-tema defs, schema-minimum 10) er åpent — begge deler schema-gyldige, avgjøres i sampler-bygget.
5. **PDF F-E/F-F (klasse ii):** fullførings-kontekst mangler i rendret innhold; demo-PDF mangler DEMO-badge. Laast, ikke rettet; G4-kontraktens demo-badge-krav er ikke gjennomført i PDF-planet.
6. **Ord-konsistens-hold:** «skåren»-ordformen (F2, hold), «skår»-harmonisering tvers filer (FASE 1-eid beslutning), ID-kollisjoner tvers pools (a-0001..e-0005-klassen — eskalert som design, per-pool selftest fanger det ikke).
7. **ND-resultattekst:** OBSERVED-band 40–54 + utfalls-lesetekster per outcode mangler (hold, dokumentert); ND-sporet mangler offentlig testflate (V2-kontrakt).
8. **Renderer strings-sink-hullet** (SVG-etiketter aldri i strings.list, pin fra #3786): delgraf og PDF har egne sinks; renderer-fiks hører neste renderer-bygg.
9. **FASE 4-visningslag:** #d=-lesing (delgraf + PDF mot lenke), route-eierskap (app/locale.js), dynamisk OG-forhåndsvisning → PIN-3.
10. **FASE 1-gap:** normerings-endpoint aldri live (GAP-1), WCAG AA umålt (UV-1), behandlingsansvarlig-placeholder (Å-1, operator-beslutning), #3726 puzzle-felt uten hjem, endless-mode static ad-slot [OP-beslutning].
11. **CI deploy:** OG-rapportens pin #2 (pages.yml = dispatch-only placeholder; live-URL 404 → «Under gjenoppbygging»-siden er fortsatt live) — søster-verifikasjon OGV-A2 bekræftet.

## 5. Nye funn fra denne gjennomgangen

- **N-1 (sev 1):** **build.yml er også en stub, ikke bare pages.yml.** build.yml trigges på push/PR mot main, men innholdet er «hvis package.json finnes → npm ci/test/build, ellers hopper over» — repoet har ingen package.json (bygger er ren node app/build.js). Konsekvens: **ingen CI push-gate kjører hverken selftester eller bygg i dag**; push til main produserer "Tomt canvas: hoppet over". Preplan fase 0-kontrakten («CI bygger, tester og deployer til staging-URL») er dermed ikke oppfylt på verken bygg-, test- eller deploy-siden. Hele selftest-veggen (1700+ checks) er bare bevist lokalt. Fix-vei: build.yml bør kjøre selftest-suiten + app/build.js og feile ved FAIL; deploy-wiring til pages.yml (eller Cloudflare fallback per preplanens [A]) er egen oppgave. [Faktum fra disk: .github/workflows/build.yml + pages.yml lest i fulltekst.]
- **N-2 (sev 0, observasjon):** normering-selftesten D.engine-72 feilet én gang (subprosessen tests/engine/selftest.mjs) og passet ved re-kjøring → transient flake under tung last, ikke defekt. Relevant når N-1 er fixet: en flaky subprosess-sjekk i CI gir falsk-rød. Anbefales re-kjøring-oppfasing i harnessen eller at D-sjekkene dokumenteres som best-effort.
- **N-3 (sev 0, husstand):** worktree er dirty — report/2026-11-17-fase3-og-kort.md bærer søster-stegets (DeepSeek 5/20) verify-append ucommitert. Ikke drift; bør committes med neste kjede-commit så sporet er rent.
- **N-4 (sev 0):** out/ inneholder fortsatt deploy-siden fra tidligere lokal bygg; live 404 er allerede dokumentert (OGV-A2, pin OG-2). Ingen ny handling ut over pin #2/#3 i OG-rapporten.

## 6. DoD-blikk (preplan §10) — kortstatus før grunder-testen

Dekket eller delvis: scoring-plugins verifisert (del1/del2/integrasjon/håndregn), determinisme/retest-suitene, ingen annonser i testflyt, ærlige NV-etiketter, delingslenke-funksjon (transport + browser-load), OG-bilder på plass, SEO-rutene direkte-lastbare lokalbygg, sitemap/robots/404 bygget deterministisk.

Ikke begynt (fasen 8-arbeid, forventet åpne): pilot på 3–5 personer (PERSONA), WCAG 2.1 AA-måling, enhetsmatrise (4 desktop + iOS/Android reelle), delingskort-eksport på iOS Safari/Android Chrome, offline-gjennomføringstest, Lighthouse-baseline, CI deploy fra main + rollback, operatør-gjennomgang. Disse er plan-ektemessig åpne, ikke avvik på dette steget.

## 7. Konklusjon

Samsvaret mot preplanen er tett: alle [B]-premisser som er målbare i dag er etterlevd i leveranser med fresh re-kjøring som bevis, og alle avvik som finnes står dokumentert hos eier-steg med verdict/pin-konvensjon. Én reel ny observasjon av vekt: **N-1 — CI push-gaten er en tom stub, ikke bare deploy-lenket** (bygger/test/deploy kjøres verken på push eller dispatch). Ingen nye funksjonelle avvik funnet utover de dokumenterte åpne punktene i §4. Verdict for denne gjennomgangen: **PASS (plan-samsvar) med N-1 som eneste nye leveranseverdig funn** — resten er avstemt og pinnet der det hører hjemme.

Kilder: DOC-373E4AFEEB (fulltekst), report/*.md (28 filer), prod-tre (F:\maneit\prosjekter\filip-webside-prosjekter\brainarea, HEAD 9d25273 + dirty append), fresh-kjøringer i §2.
