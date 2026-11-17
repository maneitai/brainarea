# [VERIFISER][REL] Rel-stall ved item 11 — interaktiv reprodusksjon og utfall

Datum: 2026-11-17 · Todo: leaf-kjede TR-33F04462C5CE (steg 4/5) · Kjørt på host (Windows-node + chrome-headless-shell via pwtest/playwright-core)

## Spørsmålet
Står stallen ved item 11 for en brukervendt bug (ikke-klikkbare alternativer), eller er den artefakt fra automasjon-heuristikken?

## Metode
Playwright (ekte Chrome headless-shell, 390x844) mot lokal bygg (tmp/_srv_3851.js på :8973): out/relasjoner/ (NO) og out/en/relations/ (EN), ekte klikk (.click() — ikke evaluate), per-skjerm-instrumentasjon: aria-valuenow, item-tekst, antall alternativer, hver knapps tag/disabled/pointer-events/offset-size.

## Funn

1. **Ingen brukervendt bug ved item 11.** Rel-16 består av 16 ordinære likert-items; item 11 (cf-0031, NO: "Jeg høyner tonen mer enn saken krever, midt i en diskusjon." / EN: "I use the sore spots people shared when I want to win the argument.") er samme komponent som alle andre: BUTTON, disabled:false, pointer-events:auto, 318x44px (>= 44px touch-mål), aria-pressed-håndtering urørt. Item 11 klikkes fint i begge språkene med menneskelig klikk-tempo (>=300ms mellom klikk).
2. **Stallen er en race ved fullføring — uansett item.** Ved klikk på «Fullfør» (siste item) kjører run.js onComplete asynkront (scoreTest → await fetchConfig(renderReport) → showResult). Først når den kjører renderes resultatet; containeren tømmes ved rendering. En automasjonssløyfe som klikker videre innenfor dette vinduet må vente på en knapp som aldri blit interaktiv igjen → locator-wait til timeout → «stall». Bevis: probe med 0ms mellom klikk hang ved «spørsmål 16 av 16» (idx 15) i ALLE tre klikkvarianter (op 0/1/4); probe med 2,5s timeout fanget klikket som hang på en knapp fra den foregående skjermen — og resultatet rendret umiddelbart etterpå (resultAfterWait: true, finalRes: 1).
3. **Attention-markingen er probe-artefakt, ikke bug.** 120ms-sonden fikk "1 markering registrert" (tidsbruk terskel, attention-laget v1.0.0). Samme kjøring med menneskelig tempo (2s per skjerm): "Svarmønsteret er kontrollert — ingen uvanlige mønstre oppdaget" (ba-run-att--clean). Enheten: DETEKSJON ≠ EKSKLUSJON — flagget endrer aldri skår, bare statuslinje.
4. **EN/relations/ identisk grønn:** 16/16 skjermer, item 11 likt klikkbar (318x44, pe:auto), full gjennomlokking + resultat renderet, 0 sidefeil.

## Konklusjon
**ARTEFAKT — ingen render.js-fix nødvendig.** Stallen oppstår kun når automasjon klikker videre mot en side som asynkront bytter til resultatkortet ved final-klikk. Brukeropplevelsen urokket: alle knapper ekte, oppfylte touch-mål, ingen blokkering ved item 11. Attention-markering ved probe-tempo er forventet oppførsel (tidsbruk-heuristikk) og clean ved menneskelig tempo.

## Rekommandasjon til automasjon-siden (FASE-4/visuelle prober)
Ekte klikk-looper mot disse sidene bør vente eksplisitt på .ba-run-result etter siste Neste/Fullfør, i stedet for å klikke videre i vinduet mellom finish og render (maks ~1 raf). Alternativt: klikke med kort timeout + fallback waitForSelector('.ba-run-result').

## Replikering
- Server: node tmp/_srv_3851.js (port 8973)
- Prober: tmp/_rel_stall_probe5.js (A race-bevis + B 120ms), tmp/_rel_stall_probe6.js (2s: clean), tmp/_rel_en_probe.js (EN: grønn + item 11 klikkbar)
