# Kjøretid-kartlegging — hvorfor ingen test er spillbar på live

Dato: 2026-11-17 · Steg: #3839 · Utredning initiert av operatør (kunne ikke teste noen test på https://maneitai.github.io/brainarea/)

## Funnet (verifisert i kjørende repo + live output)

Siden serverer landingssidene fullt — men test-rutene (persona / evne / relasjoner / play) har
**tom mounts**. build.js linje 107 skriver `<!--BA-RUN: id=... test=... locale=...-->` + tom div,
med kommentaren «run-HTML injecteres ved deploy». **Injeksjonssteget ble aldri bygget.** FASE 1–3
leverte motor, pooler, rapport- og delingslag — men ikke bindet mellom dem:

1. Ingen browser-bootstrap: ingen modul laster render.js i nettleseren, henter def-JSON,
   kobler onComplete → scoring → rapport.
2. Ingen runner-side i out/: BA-RUN-markørene står urørt i det statiske HTML-et.
3. Kompositt-hull: testId'ene i rutene har ingen direkte def-fil.
   - `persona` → def-ipip50-big5.{no,en}.json (50 items, trait, ferdig spillet def) ✓
   - `iq` → **ingen composite-def-fil, men spesifikasjonen finnes**: session-blokken i
     tests/schema/_evne_itemspec_spec.json fastsetter flettet tverr-tema-sesjon:
     44 items (8/8/8/7/7/6 trekk per tema t1–t6), timeBudgetSeconds 1680 (28 min),
     F2 bandkvoter per tema krever tema-stratifisert sampler (engineGaps.G1 — dagens
     sampleSession trekker flatt; interim: flatt trekk aksepteres for pilot,
     bandrapport leveres i verifisering).
   - `relational` → **ingen composite-def**: 4 dimensjonspooler (rel-cl 60, rel-op 60,
     rel-cf 60, rel-iv 60; trait 1-dim hver) må flettes.
   - `puzzle` (play-ruta) → def-puzzle-v1.{no,en}.json (90 items) + puzzle-player.mjs (eget
     stateflyt, ikke render.js), demo finnes i tests/puzzle/puzzle-demo.html men er ikke wired.

## Kjøretids-moduler som finnes og er nettleser-klare (rene ES-moduler, null deps)

- tests/engine/render.js — mountRenderer(rootEl, def, opts); opts: lang, dict, storage,
  seedSeed, timeBudgetSeconds, now, rng. Håndterer validate, resume, progressbar, styles
  via injectStyles(). onComplete-payload: {testId, lang, itemIds, answers, timeSpentSec, ...}
- tests/engine/scoring.js — scoreTest(def, payload): trait → skårscales 0–100;
  g-score → theta z100 + CI95. validatePayload(def, payload).
- tests/engine/attention.js — evaluateAttention(def, payload): straightlining + terskler.
- tests/engine/randomize.js — makeCountedRng/newRngState: seed-basert, persistert i sesjon.
- report/renderer.mjs v1.0.1 — renderReport(result, config, opts) → {lang, frame, html,
  svg, strings, meta}; opts: lang, profileId, includeSvg. Config: report/configs/
  standard|personal|employer.json. Innebygde kvalitetsvakter (normNote hard-feil,
  midtpunkt ≠ prosent-av-maks, moodEffect, forblods-skanner).
- report/pdf/brainarea-pdf.mjs — renderReportPdf(result, config, opts) + scanPdfBanned;
  importert modul report/pdf/pdffont.mjs (subsetFont, readTables). **Nettleser-trygg:
  zlib/DEFLATE er hånd-implementert i ren JS (zlibDeflate/zlibAdler/deflateBlocks),
  ingen node:fs/node:zlib-import i produktmodulene** (kun selftester leser fs). Font:
  report/pdf/fonts/DejaVuSans*.ttf, subsetting i kjøretid.
- tests/schema/_share_link.mjs — selv-bærende delingslenke (#d=<b64url>), ren ASCII-JS,
  registry v1 (rel 2 rader, nd 1 rad) — nettleser-klar per kontraktsheader.
- tests/schema/_rel_share_graph.mjs — renderShareGraphSvg: ren SVG — nettleser-klar.
- tests/puzzle/puzzle-player.mjs — initStandardRun/submitChoice/advance/buildScorePayload/
  buildNormeringPayload/buildShareCard/initEndlessRun/serialize/deserialize — eget
  spiller-lag for puzzle-v1.

## Def-filer (alle NO+EN par)

- persona: def-ipip50-big5 (50) — spillebar som-is, trait, 5 dimensjoner.
- evne: def-evne-t1-matrise (50), t2-numerisk (50), t3-verbal (50), t4-romlig (40),
  t5-sekvens (40), t6-deduksjon (40) — g-score z100+ci95, samlet 270 items.
- relasjon: rel-cl/op/cf/iv-pool (60×4) — trait 1-dim hver, samlet 240 items.
- nd (ikke wired til side ennå): nd-triage-pool (40), adhd-dyp da1-3 (40+35+25),
  autisme-dyp ds1-3 (40+35+25).
- puzzle: def-puzzle-v1 (90) — L/M/H 30/30/30.

## Mangler for spillbare tester

1. **Runner/bootstrap** (app/run.js eller tilsvarende): les BA-RUN-markør → hent def →
   mountRenderer → onComplete → validatePayload/scoreTest → evaluateAttention →
   renderReport (standard.json-rammen) → delingslenke → PDF der modulen tåler nettleser.
2. **Composite-def builder**: iq (6 temapooler) og relational (4 dimensjonspooler) må
   flettes til kjørbare def-filer eller resolves i runner-laget ved load.
3. **Puzzle-wiring** på play-ruta via puzzle-player (ikke render.js).
4. **build.js-utvidelse**: injiser bootstrap-script-tag i test-sidene, kopier engine-moduler
   og def-JSON til out/ med /brainarea/-base-path. I dag kopieres kun brosjyre-sider.
5. Normering-POST utsettes til FASE 4 (github.io kan ikke ta imot POST — Functions-grensen).

## Composite-spesifikasjoner (allerede bestemt — ikke åpne beslutninger)

- **iq** (session-blokken i _evne_itemspec_spec.json): flettet tverr-tema-sesjon,
  44 items (8/8/8/7/7/6 per tema), timeBudgetSeconds 1680. F2 bandkvoter krever
  tema-stratifisert sampler — engineGaps.G1: dagens sampleSession trekker flatt;
  interim flatt trekk aksepteres for pilot med bandrapport i verifisering.
  F3: ingen samme undertype to ganger på rad (samme sampleroppgradering).
- **rel** (session-blokken i _rel_itemspec_spec.json): flettet sesjon 16 items
  (4 per dimensjon, +−+− signaturmønster), trait-skår på alle 4 dimensjoner,
  ingen tidsbudsjett (sessionSizeFor gir alle 16 shuffles).

## Runner-byggets tekniske ansvarsforkylling for #3840

1. **Composite-def builder**: bygg kjørbare def-filer fra pooler + session-spec
   (iq: 6 pooler → 44-trekk-sesjon; rel: 4 pooler → 16-item sesjon). Builderen
   må også kunne flette items med ulike kind (likert/order/ability) — rel-poolene
   er likert, evne-poolene er ability/order/likert mikset med variants.
2. **Runner** (app/run.js): BA-RUN-markør → def-last → validateTestDef →
   mountRenderer(rootEl, def, {lang, dict: i18n-katalog, timeBudgetSeconds}) →
   onComplete → validatePayload → scoreTest → evaluateAttention → renderReport
   (report/renderer.mjs + configs/standard.json) → delingslenke (_share_link) →
   PDF-knapp (brainarea-pdf, nettleser-trygg) der config tillater det.
3. **Puzzle på play-ruta**: puzzle-demo.html sin tynne wrapper over puzzle-player
   gjenbrukes som mount, ikke render.js (eget spiller-lag, egen storage-nøkkel).
4. **Normering-POST**: utsettes til FASE 4 (github.io: POST gir 405; koden i
   functions/normering.js lagrer bare ved NORMERING_KV-binding).

