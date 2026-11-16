# Puzzle v1 — designutkast (3-VEIS instans A, 2026-11-16)

Status: UTKAST til anonym kritikk (instans B) og syntese (instans C). Board #3764.
Premisser [B-merket, fra operatøren]: statisk hosting (GitHub Pages/Cloudflare Pages), ingen backend, ingen konto, 18+, NO+EN, én spilltype i v1, økende vanskelighetsgrad, lett å begynne med, «gøy», delbarhet er hardt krav på tvers av siden, annonser til stede men ikke in-your-face.
Formål [B]: lengre økt-sesjonslengde (annonsevisninger) + konstrukt-signal som testerene kan stole på + viraliserbart delekort.

## 1. Mekanikk: Sekvens-ascension (standard mode)

16 «etasje»-etapper (floors). Hver etasje presenterer én sekvenspuzzle: en regel genererer en vist sekvens av tiles (tall, fargeblokker, form-tiles), spilleren trykker neste-element i sekvensen blant 4 alternativer. Umiddelbar feedback (riktig → etasje lyser; feil → korrekt løsning vises kort). Etasjene gjennomføres alltid i sin helhet — ingen «liv», ingen avbruddsfail: hele eksponeringssettet er deterministisk (nødvendig for theta-skår, se § 5). Streak-teller er UI-metning, ikke skåringsmekanikk.
- Ingen klokken tvinger spilleren (timerfri flyt); økt-timer kun for ærlig tidsbruk-telemetri (samme felt som testene).
- Tre undertyper fra og i utvidelse av T5-konstruktet (sekvens/arbeidsminne): (a) sekvensfortsettelse (tallmønstre), (b) oppdateringsregel (tile-tilstand oppdateres per steg), (c) sporingsregel (to parallelle regler samtidig). Display er språknøytrale tiles (forskjellige farger/kantformer) — ingen SVG-motor-avhengighet (lukker ikke engine-gap G2, men trenger den heller ikke).
- Bokstavregler (hvis brukt) begrenses til a–z uten æ/ø/å for paritet NO/EN.

## 2. Vanskelighetsstige

Items er b-merket med samme IRT 1PL-band som evne-itemspecen: L [-2.0,-0.5[, M [-0.5,0.5[, H [0.5,2.0]. Standard-mode-kurven er fast (ikke adaptiv):
- Floors 1–5: L (5 items) — «enkel start»-kravet.
- Floors 6–10: 3 × M + 2 × L.
- Floors 11–13: M (3 items).
- Floors 14–16: 2 × M + 2 × H.
Total 16 items: L 7 / M 5 / H 4. Alternativer vurdert: streak-basert adaptiv band-promotion — forkastes for v1: ikke-entydig b-eksponering gjør theta-estimatet udefinerbart per sesjon (spillfølelsen kan i stedet komme av etasje-stige + streak + fullføringsfeiring). Endless mode (§ 6) dekker spilldypet.
Fun-hånderkastet: lett start er et krav, men de første 5 etasjene skal ikke være nedverdigende — de er opplæring med visse visuelle hint (regel-fremhev i tile-farge) som fases ut.

## 3. Skåringsmodell (svar på #3767)

Standard mode emitterer et test-def-payload (family evner, kind ability, dims [g], difficulty per item) som scoring.js scorer med 1PL MLE: theta + ci95. iqScale forblir null og delekortet sier «ikke normalisert» til #3724-normeringen har levert populasjons-{mean,sd} — samme ærlighet som IQ-sporat.
- Konstruktgyldighet MEKKANISERES, ikke bare hevdes: puzzle-theta mot test-theta (T5-sporat og evne-batteriet) kan sammenlignes per bruker lokalt (localStorage), og anonymt inn via samme normerings-endpoint med testId='puzzle-v1' — da kan #3767 besvares MED TALL etter normerings-kjøring: korrelasjon puzzle-theta vs evne-theta.
- Gamey-laget skilles hardt fra konstrukt-laget: streak, highscore og «etasjer nådd» er underholdningsverdier og står aldrig i skårsammenheng i rapport/data.

## 4. Endless mode (oppdageles/løsning modus)

Låses opp etter fullført standard run. Trekker uten gjentakelse i økten (near-exhaustion reset som motor-regelen computeUsedReset), blanding over alle band, øker gradvis: band-spesifikk vekting glir L→M→H over 24 items, deretter forblir H-tyngde. Skår: ren highscore-telling, eksplisitt merket «ikke konstrukt-skår». Endless data innsendes aldri til normeringsskårberegning.

## 5. Innhold/volum/copyright

Egen puzzle-pool: 90 originale items (30/30/30 L/M/H). 90/16 ≈ 5,6× retest-vennlig i standard mode; endless reset-regel tåler flere gjennomføringer. Generator-skript deterministisk (ingen RNG) + selftest (AJV, bandvindu, fasit-reavledning, paritet NO/EN) + copyright-skann ingen Raven/WAIS/WISC/Mensa/Digit Span/n-back-monstre — samme konvensjon som evne/rel/ND-poolene. Alle items originale.

## 6. i18n, annonser, personvern

- NO+EN per søsterkonvensjonen; items i praksis språknøytrale (tall/farger/former); UI- og instruksjons-tekst via i18n-laget (EN-base, NO-overlay).
- Annonse: én banner-slot mellom etasjene og én i pause-menyen (mock-bannere som FASE 1) — ikke per-tile, ikke pop-up.
- 18+ gate delt med testene; GDPR-rammen fra FASE 1 gjelder uendret (anonym innsamling, valgfri demografi).

## 7. Delbarhet

Delekort med: etasje-nivå nådd, streak-rekord, fullført-tid, og puzzle-theta-bånd vist ærlig («skål X ± Y på vår egen skala — ikke normalisert ennå»). Samme delingsteknologi som test-resultat-kort. Ingen IQ-tall. Delekortene er laget for å stå alene i en feed.

## 8. Verifikasjonsplan for bygget (til #3765/#3767/#3813)

- Build: spillbar prototype med progresjon (§ 1, § 2), delekort (§ 7).
- Selftest: skårings-payload valideres mot schema; band-kurve eksakt som § 2; endless-reset regelen provet; i18n paritet; copyright-skann 0 treff.
- Gyldighetsmekanisme (§ 3) wiring-klar for normerings-kjøring.
- Samlet faseverifikasjon (#3813) kryssleser mot dette dokumentet.

## 9. Åpne punkter til operatøren

1. Spillnavn (kosmetisk, ikke avgjørende for skåringsmodellen): forslag NO «Sekvensmester» / EN «Sequence Master».
2. Om endless mode skal ligge i v1 eller v2: min anbefaling er i v1 (låses opp etter første fullførte run) — retningsverdi.
3. v2-typer (utvidelser, ikke blokkerende): figurmatrise-spill når SVG-visning bygges (G2), deduksjons-arena (T6-konstruktet).
