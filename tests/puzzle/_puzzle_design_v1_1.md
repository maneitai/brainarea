# Puzzle v1 — designkontrakt v1.1 (3-VEIS instans A, revisjon etter anonym kritikk, 2026-11-16)

Kjede: instans A utkast (_puzzle_design_draft_v1.md) → instans B anonym kritikk (ask_agent-JOB-CE2760AA, 2026-11-16) → instans A revisjon (denne) → instans C syntese. Brett #3764. Premisser uendret fra utkastet ([B]-merket): statisk hosting, ingen backend, ingen konto, 18+, NO+EN, én spilltype i v1, økende vanskelighetsgrad, lett å begynne, delbarhet hardt krav, annonser til stede men ikke in-your-face.

## Revise-logg (B-punkt → beslutning)
- B1 (mekanikk, BLOKKERER): **INNARBEIDET** — retry, streak-omdefinering, scoring på første respons.
- B2 (kurve-aritmetikk, BLOKKERER): **INNARBEIDET** — 7L/5M/4H eksakt, strengt monotone blokker.
- B3 (skåring/#3767): **INNARBEIDET** — n-16-begrensning ærlig, gyldighetspipelinen blir eget brettsteg, lokalt n=1 nedgradert til personlig innsikt (ikke bevis).
- B4 (pool-hemmelighet, BLOKKERER): **INNARBEIDET** — nytt brettsteg for pool-bygg (pin-beslutning hos operatøren).
- B5 (i18n/a11y): **INNARBEIDET** — bokstav-regler kastes helt ut av v1 (tall/form-tiles kun), former skiller aldri farger alene, tastatur + aria, kontrastkrav.
- B6 (annonser): **DELVIS** — pause-meny-slot og mid-game-refresh utgår fra v1; én enkelt mid-game breakpoint foreslått som operatørbeslutning [OP], ikke byggeforutsetning.
- B7 (delekort som skjult IQ): **INNARBEIDET** — tallløs kortvariant, OG-generator-avhengighet eksplisitt.
- B8 (preplan-kompatibilitet, OK): uendret; GDPR/tekststeg #3726 utvides med puzzle-felt (sesjonslengde, lokal lagring).

## 1. Mekanikk: Sekvens-ascension (standard mode)

16 etasjer, én sekvenspuzzle per etasje: en regel genererer en vist sekvens av tiles (tall- og form-tiles), spilleren velger neste element blant 4 alternativer. Ingen liv, ingen avbruddsfail — full eksponering er fast for theta (§ 3). Endringer etter B1:
- **Retry:** etasje ≥ 9 gir ett forsøk til ved feil (fasit vises aldri; ved dobbeltfeil vises riktig tiles kort etter etasjen er låst). Retry er spillfølelse — **skåringen teller kun første respons per item** (kontrakt i § 3).
- **Streak omdefinert:** streak = lengste feilfri strekk hittil i run-et («best run») + «nivå nådd». Begge lever videre etter feil — streak dør aldri som progressjonsfølelse.
- Umiddelbar feedback beholdes (riktig → etasje lyser), men fasit-lekkasje (B1 «multiple-choice med tap-skjerm») fanges av retry-ordningen og kort-løsning-visning kun ved dobbeltfeil.
- Tre undertyper (T5-familien): sekvensfortsettelse (tallmønstre), oppdateringsregel, sporingsregel (to parallelle regler). 
- **Ingen bokstav-tiles i v1** (B5): tall + form/tile-stil kun; språkpariteten blir dermed eksakt (ingen æ/ø/å-spørsmål).
- Onboarding: etasje 1 har ett tap-demo («trykk neste med tall-tastene eller berør») — begynner-kravet.
- Progress: localStorage-runState (etasje, items brukt, best run) — resume-prompt ved retur; ingen konto.

## 2. Vanskelighetsstige (eksakt, korrigert)

Items er b-merket med IRT 1PL-bandene fra evne-itemspecen: L [-2.0,-0.5[, M [-0.5,0.5[, H [0.5,2.0]. Standard-mode-kurven er fast og **strengt monotone blokker**:
- Etasje 1–7: L (7 items)
- Etasje 8–12: M (5 items)
- Etasje 13–16: H (4 items)
Totalt 16 = 7/5/4 — aritmetisk eksakt, «lett start» (7 L før noget M) og høyeste band sist. B2s monobekymring motvirket: theta-estimatet har anker i alle tre bandene (samme logikk som evne-batteriet; H-blokker gir høy informasjon ved høy theta, ikke identifikasjons-degenerering). Selftestet verifiserer band-orden per etasje og 7/5/4-summen.

## 3. Skåringsmodell — begrensningene er akseptert og skrevet ned

- Standard mode emitterer test-def-payload (family evner, kind ability, dims [g]) → scoring.js 1PL MLE: theta + ci95. **n=16 er tett:** ci95 er uundgåelig bred; resultatspråket (NO/EN) sier «usikkerhetsbåndet er bredt ved 16 spørsmål» og delekortet viser tallløs skår (§ 7). iqScale null + not-normed som søster-sporene.
- **Første-respons-kontrakt:** retry-svar registreres i game-state, aldri i score-payloadet. Selftest kryssleser dette.
- **#3767-gjeldighetspipeline (B3-INNARBEIDET), konkretisert:** (a) normering-endpoint tar imot puzzle-sessjoner (testId='puzzle-v1' — TEST_ID_RE verifisert av B); (b) NYTT brettsteg [VERIFISER] definerer og kjører gyldighetsanalysen: korrelasjon puzzle-theta × evne-theta på parvis responsdata med definerte utvalgsregler (samme enhet, tidsvinduet ≤ 7 dager begge, språk-par match, min n og eksklusjon, hvem kjører analysen og når — i FASE 4-verkøyet, ikke i v1-kode). Selve #3767 forblir deliberasjonssteget; data-produktet har nå et sted å bo.
- «Sammenligning per bruker lokalt» beholdes kun som personlig innsikt-funksjon, markert «ikke bevis» (B3).
- Gamey-laget (streak/best-run/nivå/endless-highscore) står på egen lagringssøn og brukes aldri i skår eller data.

## 4. Endless mode

Låses opp ved fullført standard run. Utslag uten gjentakelse i økten (used-ids i localStorage, computeUsedReset-konvensjonen), band-glir L→M→H over den første 24, deretter H-tyngde. Skår: highscore (antall riktige), eksplisitt «ikke en testskår». Endless-data innsendes aldri til normering.

## 5. Pool — 90 items, med eget byggsteg

Pool 90 originale items (30/30/30 L/M/H), undertyper representert i alle tre band (≥ 4 items per band per undertype). Byggverktøy som søster-poolene: deterministisk generator-skript (ingen RNG), selftest med spec-standardband-toleranse (|andel-mål| ≤ 0.15 per band), AJV + validateTestDef, fasit-reavledning fra prompt, NO/EN-paritet (triviel her: ingen språkbundne tiles), copyright-skann (ingen Raven/WAIS/WISC/Mensa/Digit Span/n-back-monstre, alle items originale). **Nytt brettsteg registrert** (pin-beslutning hos operatøren, se steg-tekst i brettet); #3765-bygget kan starte med generator-output umiddelbart ettersom generator + selftest er pool-stegets leveranse.

## 6. i18n, annonser, a11y

- NO+EN per søsterkonvensjonen; alle items språknøytrale (tall/form), UI-tekster via i18n-laget (EN-base, NO-overlay).
- Annonser v1: beholdes på de innarbeidede plasseringene (landingsider, under resultat). In-gen-splassering [OP-beslutning]: foreslå **én** mid-game banner-slot etter etasje 8 (statisk, ingen refresh i økt), pause-meny-slot **utgår**. Mid-game-refresh: ingen.
- A11y (B5): tiles er alltid farge+form-redundante (farger skiller aldri alene, alder-døyv-tekst-vennlig); kontrastsjekket-palette (logo-paletten tilpasset kontrast — tile-bakgrunn mørk med lys innholdstegn, ikke cyan På lilla direkte); tastatur (tall-taster 1–4), aria-labels på tiles og alternativer, touch-target ≥ 48 px, mobil-først (portrett-tested), ingen tidsmåling som press.

## 7. Delbarhet

Delekort (OG-generator utvides med puzzle-variant — avhengighet av #3796-bygget registrert): etasje-rekord «X/16», best-run, fullført-tid, og tekstdag «du nådd etasje X av 16 — kan du lengre?» **Ingen tall på skår/skala** på kortet (B7: skjult-IQ-effekten unngås ved å fjerne theta-bånd fra del-data; «ikke normalisert-»-notatk bor i test-resultatet, ikke på delekort). Del-utløser umiddelbart etter etasje 16 og ved ny rekord i endless.

## 8. GDPR/tekststeg

#3726-tekstene utvides med puzzle-felter: anonym testId, sesjonslengde, tidsbruk per item, ingen konto, lokal lagring av rekord. (Koblet til brettsteg-teksten; operatøren godkjenner plasseringen.)

## 9. Bygg- og verifikasjonsplan (til #3765/#3767/#3813)

- Bygg: spillbar prototype (mekanikk § 1, kurve § 2), delekort-variant, resume-prompt.
- Selftest: AJV + validateTestDef, band-orden og 7/5/4-sum, første-respons-kontrakt, endless-reset, i18n-paritet, copyright-skann 0 treff, a11y-sjekk (form+kontrast).
- Gyldighetsanalyse på eget brettsteg (se § 3), ikke i v1-kode.
- Samlet faseverifikasjon (#3813) kryssleset mot denne kontrakten.

## 10. Åpne punkter til operatøren
1. Pin-deisjon: puzzle-pool-steg (ny) og gyldighetsanalyse-steg (ny) begge skal ligge FØR #3765 respektive FASE 3/4-kjeden.
2.annonseplassering mid-game: foreslag ÉN slot etter etasje 8 — godkjennes eller utgår.
3. Spillnavn [kosmetisk]: NO «Sekvensmester» / EN «Sequence Master» — forslag.
4. v2-typer (utvidelser, ikke i v1): figurmatrise-arena (G2), deduksjons-arena (T6).
