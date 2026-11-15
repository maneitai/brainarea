# FASE 2 — Itemspec evner: spesifikasjon (6 temaer, vanskelighetsgrad-stige) bygget og verifisert

Status: FULLFØRT OG VERIFISERT (selftest S0–S16 ALL PASS, med ekte motorsjekk mot scoring.js; regresjon uroert: _ipip50_selftest ALL PASS, engine selftest 72/72; dato 2026-11-15, todo #3736).

## 1. Leveranse

- `tests/schema/_evne_itemspec_spec.json` — maskinlesbar spesifikasjon (specVersion 1, status PROPOSED → GJELDENDE ved #3813).
- `tests/schema/_evne_itemspec_selftest.mjs` — S0–S16, 71 sjekker (S1 har 26 toppfelt-sjekker).

## 2. Innhold i spesifikasjonen

- **Temaer (6):** 3x50-pooler T1 abstrakt matriselogikk (mx), T2 numerisk resonnering (nm), T3 verbal resonnering — separat forfattet per språk (vr); 3x40-pooler T4 romlig/relasjonell tenkning (sp), T5 sekvens og arbeidsminne (sq), T6 formell deduksjon (dl). Poolmin-sum 270, batch-omfang ~300 (buffer mot copyright-QC-avvisning).
- **Trekk:** 44 totalt (8+8+8+7+7+6) innen planens «ca. 40 oppgaver / 20–30 min» (36–50-sonen er selftest-verifisert). Sesjonsbudsjett 1680 s (28 min, [A]-forhåndsvalg) som opts.timeBudgetSeconds.
- **Vanskelighetsstige:** IRT b i 3 kontinuerlige bands: L [-2, -0.5> / M [-0.5, 0.5> / H [0.5, 2.0] (schema-vindu [-4,4] holdes i reserve). Pool-andel-target 0.34/0.33/0.33 ± 0.15. Sesjonskvoter per trekk (8/7/6) definert — kravet tilhører sampleren, ikke poolen (engine-gap G1).
- **Retest (#3737-kriteriet, pre-verifisert):** pool ≥ 5×trekk per tema — faktisk 6.25/6.25/6.25/5.71/5.71/6.67×; worst case friske items etter 4 gjennomføringer: 18≥8, 12≥7, 16≥6. Reset-logikk (computeUsedReset) er motor-gitt.
- **Språk:** NO+EN per søsterkonvensjonen (én fil per språk); T3 forfattes separat per språk, resten bæres/oversettes. DE/FR/NL/PL strukturpreparert (normering.js-språkhvitelisten utvides da).
- **Lisens:** alt innhold originalt — ingen lisensavklaring. Kloningsforbud mot Raven/WAIS-WISC/Mensa/kommersielle banker er eksplisitt listet med verify-hooks #3749/#3751/#3753.
- **Scoring-kontrakt:** g-score = theta (1PL MLE) + ci95 på theta; iqScale forblir null og note.gscore.not-normed vises til normerings-endpointen (#3724, bygget ikke deployet) har levert populasjons-{mean,sd}. IKKE IQ-tall innen da — motor og spesifikasjon håndhever dette hver for seg.

## 3. Verifisering (selftest, S0–S16)

- S1–S14: intern konsistens (toppfelt, tema-antall 5–6, trekksum 44, pool-ratio ≥5×, band-grenser, kvotesummer, batch-avstemming, id-mønster mot schema, språkplan, copyright-hooks, prod-filer, normering-kobling).
- **S15: ekte motorsjekk** — scoring.js importeres (data-URL), 2-item probe-def (b=-1.2/+1.2) AJV-valideres og scores: theta ≈ 0 (2.3e-16 — symmetrisk probes forutsigelse), SE 1.6765 (prediksjon 1.678), ci95 omslutter, iqScale null + notNormed true + note id til stede; alle-riktig → theta null + warning «alle-riktig»; order-item gir raw 4 i skala g men theta ability-only (order-eksklusjon bevist).
- S16: order-ekskljusjonen fra v1-spoet er dokumentert i T5.orderKindNote (mot: theta-estimator leser kun kind:'ability').

Feil funnet og rettet under verifisering: spec sa poolMinSum 250 (regnefeil — korrekt 270, fanget av S9a).

## 4. Engine-gaps (dokumentert, non-blokkerende for pool-batchene)

- **G1** sampling er flat (ingen tema/band-stratifikasjon) → stratifisert sampler i FASE 4.
- **G2** ingen SVG/figurvisning i schema v1 → T1/T4 kjører på tekstbærer; svg-felt = schema v1.1-utvidelse.
- **G3** ingen per-item klokke → speed-konstruksjoner ekskludert fra v1.

## 5. Åpne punkter

- #3737 (verifiser retest) kan krysslese kriteriet — det er pre-verifisert i S4 her.
- Pool-batchene #3748–#3752 autoriserer direkte mot spec (tema 1–2, 3–4, 5–6; id-mønster <prefix>-NNNN).
- maxItems-skiller (samledef 44 vs per-tema defs) avgjøres i sampler-bygget — begge deler schema-gyldige.
