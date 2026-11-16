# FASE 3 — Selv-bærende delingslenke (#fragment) [BYGG] (todo #3794)

Dato: 2026-11-17. Leaf i TR-74F671D756ED (todo-run brettet). Søster til #3790-delgrafen og PDF-bygget i beslutning 16-kjeden.

## Leveranse

- `tests/schema/_share_link.mjs` — transport-modul v1 (257 linjer). Hele resultatet ligger i URL-fragmentet `#d=<b64url>`; ingen server, ingen lagring, ingen request inneholder resultatet (HTTP-grammatikken sender aldri fragmentet). Lesing skjer 100 % lokalt i nettleseren.
- `tests/schema/_fase3_share_link_selftest.mjs` — 108/108 PASS, stdout-md5 `4ced62f590e8ef23a79bf3a9cb9ee86e` identisk over 2 kjøringer.
- Verdikt: `tests/schema/_fase3_share_link_verdict.json` (GJELDENDE).

## Kontrakt

Identifikatorfritt: lenken bærer KUN skårtall (0–100, 4 desimaler via SHARE_SCALE=10000), type-tagg og versjon — ingen navn, e-post, identifikatorer, tidsstempler eller item-tekst (generic-share-forpliktelsen fra #3786-F2). Registry v1 er byte-låst til `_rel_compat_model.mjs` DIMENSIONS (rel: closeness/openness/conflict/independence, 2 rader) og `_nd_triage_model.mjs` AXES v1.0.0 (nd: adhd/autism, 1 rad); ny type = registry-utvidelse med versjonsbump. Codec er ren JS b64url over ASCII — ingen Buffer/atob/DOM, node- og browser-identisk (G8-skann). Kast-aldri hele veien: ugyldig inndata gir `{ok:false, error}`, aldri halvgraf. Dyadisk granularitet (rel 1.5625 = 100/64, nd 1.25 = 100/80) transporteres eksakt; ikke-dyadisk ≤ 5e-5 per verdi (dokumentert grense). `payloadFromHash` godtar kun `#d=`-prefiks (skilt fra #anker-bruk); verstefall-URL ≤ 2000 tegn asseres; SHARE_MAX_PAYLOAD = 4096 tegn DoS-grense før dekoding.

## Bevis (G1–G9)

G1 realkjede: EKTE `computePairCompatibility`/`computeTriageOutcome`-output → rowsFromVectors → encode → decode → rowsToVectors → verifisert på nytt i modulene — band/utfall uroet gjennom hele transportet. G2 eksakthet (dyadisk eksakt, ikke-dyadisk målt ≤5e-5). G3 determinisme + kanonisk form. G4 kast-aldri-batteriet, inkl. ikke-kanonisk b64url avvist. G5/G6 identifikatorfrihet: hver transportert byte gjennomgått — persondata gjenfinnes aldri; D-tasting tar kun radmatrise av tall. G7 URL-kontrakt + verstefall-tak. G8 forbudstoken-skann av modulkilden. G9 ekte URL.parser-grammatikk — ingen %-koding nødvendig.

## Regresjon

delgraf 46/46, rel-itemspec ALL PASS, nd-itemspec ALL PASS, evne-itemspec ALL PASS. Prod-tre ellers uroet — additivt: 2 filer (commit d038014), 0 muterte. Speil `_delt/brainarea` synket (selftest re-kjørt der; merk: speiltreet manglet `_nd_triage_model.mjs`, kopiert fra prod).

## Pins

- Visningslags-kobling (delgraf + PDF-leser mot `#d=`-lenken) → FASE 4 par-flyten (delgraf-verdikt PIN-3).
- Route-eierskap for origin/path → `app/locale.js` / FASE 4-leseren.

## [VERIFISER GLM] Browser-load uten lagret tilstand (søster-leaf, TR-C81074672D21, commit 6a41e81)

Spørsmål: «Åpne lenken i ren nettleser uten lagret tilstand — lastes resultatet?»

**Metode.** Chromium-1248 (ekte Windows-binært via Playwright), fersk user-data-dir per løp — ingen cookies, cache eller localStorage. Delings-URL bygget av `_share_link.mjs` med EKTE modell-kjede: `computePairCompatibility` (overall 95.0, band-strong) → rel-encode → `buildShareUrl` (222 tegn URL); `computeTriageOutcome` (out-adhd-autism) → nd-encode (159 tegn URL). file://-URL med `#d=`-fragment mot demo-flatene no/en.

**Resultat — JA, laster.** Begge flatene: status 200, tittel rendret, SVG-render (svgCount=1), ingen pageerror/console-error, `#d=`-fragment intakt etter last. Tom-fragment-kontroll: samme side uten fragment gir identisk bodyLen (551) — flatene laster uavhengig av fragment (de har ingen leser-logikk ennå; #3794-transportkontrakten er det som er bevist). Node-side runde-kontroll av dekoding: eksakt (rows [[60,70,100,50],[60,50,100,60]]).

**Leveranser:** harness `tests/schema/_fase3_share_browserload_verify.mjs` + verdict `tests/schema/_fase3_share_browserload_verdict.json` (GJELDENDE). Speil `_delt/brainarea` synket; speil-selftest re-proven 108/108 PASS (identisk stdout-md5 `4ced62f590e8ef23a79bf3a9cb9ee86e`). Additivt: 2 filer, 0 muterte.

**Grenser:** ikke rendret skår-UI i nettleseren — leserlaget mot `#d=` er FASE 4 par-flyten (delgraf-verdikt PIN-3). Beviset dekker: transportlenke bygges av ekte kjede, og flatene laster reint uten lagret tilstand.
