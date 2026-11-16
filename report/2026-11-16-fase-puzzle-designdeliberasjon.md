# FASE 2 — Puzzle-designdeliberasjon verifisert (3-VEIS komplett, brett #3764)

Dato: 2026-11-16. Kjede: utkast (A) → anonym kritikk (B) → revisjon (A) → syntese (C). Verdict: **GODKJENT MED BETINGELSER**.

## Kjeden
1. **Utkast (A):** tests/puzzle/_puzzle_design_draft_v1.md — Sekvens-ascension, 16 etasjer, IRT-bander fra _evne_itemspec_spec.json, theta+ci95 via scoring.js, endless mode, 90-item pool, delekort.
2. **Anonym kritikk (B, ask_agent JOB-CE2760AA):** verifiserte kritikken mot disk (scoring.js:125–168, render.js:118 computeUsedReset, normering.js:52 TEST_ID_RE tillater testId='puzzle-v1'). 8 punkter: B1 BLOKKERER (forkledd test: streak dør ved feil, fasit-lekkasje), B2 BLOKKERER (kurve summet 17≠16, L7/M8/H2 mot hevdet 7/5/4; kurven flatet ut), B3 MÅ FIKSES (n=16 θ, gyldighetspipeline #3767 udefinert, lokal n=1 ≠ bevis), B4 BLOKKERER (90-item pool har inget brettsteg), B5 MÅ FIKSES (bokstav-tiles bryter NO/EN-paritet, ingen a11y/fargeblindesikring), B6 MÅ FIKSES (pause-meny-annonse er ny plassering utenfor FASE 1-beslutningen, mid-game-refresh udefinert), B7 ØNSKES (delekort leses som skjult IQ; #3796 OG-avhengighet), B8 OK (preplan-kompatibel; #3726 må utvides).
3. **Revisjon (A):** tests/puzzle/_puzzle_design_v1_1.md — v1.1, revisjonslogg per punkt: retry (etasje ≥ 9) med første-respons-skår; eksakt kurve 16 = 7L (et 1–7) / 5M (et 8–12) / 4H (et 13–16), strengt monotone; gyldighetsanalyse som eget verifisersteg med utvalgsregler; nytt pool-brettsteg forespurt (pin hos operatøren); bokstav-tiles kastet ut av v1, form+farge-redundans, tastatur 1–4, aria, touch ≥ 48 px, WCAG AA; pause-slot og refresh utgår, én mid-game slot foreslått som [OP]-beslutning; delekort tallløst.
4. **Syntese (C, ask_agent JOB-10A02E3D, re-verifiserte kodeankrene mot disk):** alle 8 punkter lukket eller vilkåret. Konfliktgjennomgang: B rett i aritmetikk og annonseprosess; A rett i metode (tri-bands anker + ærlig bred-CI fremfor flatekurve). Ingen uløst konfliktpunkt.

## Designverdict: GODKJENT MED BETINGELSER
Byggbetingelser (verifiserbar i #3765/selftest):
1. Første-respons-kontrakt assertet (retry-svar kan aldri nå score-payload).
2. Ærlig-språk-assert (resultattext NO+EN må være «usikkerhetsbåndet er bredt»; ingen normalisert-skår-fraser).
3. A11y: WCAG AA (≥ 4.5:1) målt på tile-glyf, ikke «kontrastsjekket» uten formel.
4. Band+sum asserted: 7L/5M/4H strengt monotone per etasjekurve; endless-reset-prov; i18n-paritet; copyright-skann 0 treff.
5. Spilltest-anker: tidlig-M-oppgivelse, refresh midt-i-etasje (runState-kontrakt), dobbelt-fail-reveal-effekter.

## Pin-anbefalinger (operatøren avgjør)
1. **Puzzle-pool-steg [3-VEIS][BYGG]: PIN foran #3765** — 90 items (30/30/30 L/M/H), deterministisk generator, selftest med |andel−mål| ≤ 0.15, AJV + fasit-reavledning, copyright-skann, speil-synk. Steget kunne IKKE registreres av workeren (todo_add feilet i run-kontekst: «ukjent chat») — ligger som forespørsel.
2. **Gyldighetsanalyse-steg [VERIFISER FASE 4]: PIN** — definnerer og kjører korrelasjon puzzle-theta × evne-theta (utvalgsregler i v1.1 § 3).
3. Annonse mid-game: forslag er én statisk slot i **endless mode** (ikke standard, som er skåringssesjon) — enklere spørsmål, ingen konstitusjonssak.
4. #3726-utvidelsen (puzzle-felt i personvern) må få et hjem (mikro-edit eller FASE 3-tekstrunde).
5. Navn [kosmetisk]: NO «Sekvensmester» / EN «Sequence Master».

## Filleveranser
- tests/puzzle/_puzzle_design_draft_v1.md (utkast, arkivert)
- tests/puzzle/_puzzle_design_v1_1.md (designkontrakt — GJELDENDE med betingelsene over)
- B- og C-tekster: levert via ask_agent i hovedchatten (JOB-CE2760AA, JOB-10A02E3D), ikke synket til disk fra worker-konteksten.
- Speil _delt/brainarea: synkronisert med denne kjøringen.
