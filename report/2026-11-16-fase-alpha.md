# FASE 2 — Alpha-beregning per skala for alle pooler (EN) — INSTRUMENT-ESTIMATER, QC-RAPPORT (todo #3768)

Dato: 2026-11-16. Leveranse i prod-treet (filip-webside-prosjekter/brainarea), speil _delt/brainarea synkroniseres.
Søster-innramming: [BYGG] FASE 2-kjeden (brett #1183, run TR-DA925E33DDCE steg 5/47), kontraktstekst: «[BYGG] FASE 2: Alpha-beregning per skala for alle pooler (EN), resultat i QC-rapport» (#3768); etterfølger #3769 (samme familie leser resultatet: under .70 rapporteres, ikke skjules).

## 0. Ærlig etikett først (kontrakten krever den)

**Ingen av tallene i denne rapporten er målte respondentdata.**
Normerings-endpointen (functions/normering.js, FASE 1) er en anonym POST-samler; på github.io
lagres ingenting (stored:false), og den eksponerer per design ingen parvis respondens.
Dette steget leverer derfor **instrument-estimater under eksplisitte modellantagelser**,
verifiserte mot hverandre (teori ≡ simulering) og mot publiserte kildetall der slike finnes.
Fase 10 (alfa ≥ 0.70 på ekte responsdata) er fortsatt målesteget; #3769-kontrakten gjelder
etikettsiden her: alle verdier under .70 **rapporteres** (se «Funn»-tabellet — fire skala-rader
er flagget), ikke skjules.

## 1. Leveranser

- `tests/schema/_alpha_sim.py` — v3-final harness: likert-teori (eksakt Simpson-kvadratur over
  theta, totalvarianssetningen), likert-simulering (mulberry32 seed 20261116, N=300/pool),
  ability-teori/-sim (2PL, KR-20 via sum-trekset), innholdsmikse-arm over corpus-verbatim-filene.
  Selftest S0–S7: **19/19 PASS** (kjørbar i seg selv, ingen tredjepartsavhengigheter, ren python).
- `tests/schema/_alpha_result.json` — maskinlesbar rapport (pools × skalaer, teori/sim/mix,
  sensitivitetstabeller λ og a, selftest-logg).
- Denne rapporten.
- Ingen produksjonsmotor-filer er rørt; full regresjon uroet (se §7).

## 2. Metode (kort, presis)

- **Likert-graderingsmodell** (persona-pooler + nd-triage): latent θ ~ N(0,1); per item
  x = s·λ·θ + e, e ~ N(0, 1−λ²); kategori K = 1..5 over kuttene [−1.0676, −0.5243, 0,
  +0.5243, +1.0676]; skår = K (+keyed) / 6−K (−keyed) — IPIP 6−v-konvensjonen.
- **λ-kalibrering:** implisitt λ funnet slik at eksakt teori for en 10-item-skala treffer
  de **publiserte** IPIP-kildetallene (newBigFive5broadKey.htm, hentet 2026-11-15):
  E .87 → λ=.657, A .82 → λ=.581, C .79 → λ=.544, N(ES-speilet, α-invariant) .86 → λ=.635,
  O .84 → λ=.609. ND-triage: ingen kildetall → dokumentert λ=.65 + sensitivitetstabell
  (.8950/.9186/.9374/.9527/.9652 fra λ=.60 til .80, k=20).
- **Eksakt teori (n → ∞):** E[S(θ)]/Var over Simpson-grid (−7…7, 1400 intervaller), med
  Var(skår) = Var(E[skår|θ]) + E[Var(skår|θ)] og Var(Σ-skår) = Var(Σ-middler) + Σ-feilvarians.
- **Simulering:** mulberry32 (bit-eksakt JS-port, seed 20261116 — samme konvensjon som
  puzzle-harnessen), N=300 per pool, én rng-strøm per leveranse.
- **Ability (evne 5 EN-pooler + puzzle):** 2PL, p = logist(a·(θ−b)), **ekte b-verdier**
  fra `_evne_pool_batch1_meta.json` / `batch2` / `t5` (bandDiff per item) og
  `_puzzle_pool_meta.json` (b-slots L/M/H). Felles a=1.5 (ikke underbygget — sensitivitet
  rapportert). KR-20 ved n→∞ via sum-trekset: Var(S)=E[S²]−E[S]² over grid, S=Σ p_i(θ).
- **Innholdsmikse-arm (persona):** per skala: verbatim-andel fra korpusfilene
  (_corpus_verbatim_en*.json, 79/50/87 tekster over tre filer, kilder ipip.ori.org 2026-11-15),
  r_verbatim = r(10-item-kildetall), r_original = λ₀.60² = .36, r_mix = vandelingsvektet,
  α = k·r̄/(1+(k−1)r̄).

## 3. Resultat — likert-poolene (hovedtall: eksakt teori; sim = MCMC-kontroll)

### 3.1 Persona-pooler (EN)

| Pool × skala | k | keying | α teoretisk (k→∞ samme k) | α simulert (N=300) | MIX α_k→∞ | Flag |
|---|---|---|---|---|---|---|
| e-a × extraversion | 50 | 30+/20− | **0.9710** | 0.9712 | 0.9699 (39/50 verbatim) | — |
| e-a × agreeableness | 50 | 25+/25− | **0.9579** | 0.9495 | 0.9597 (40/50) | — |
| o-c × openness | 50 | 30+/20− | **0.9633** | 0.9643 | 0.9635 (45/50) | — |
| o-c × conscientiousness | 50 | 30+/20− | **0.9495** | 0.9402 | 0.9527 (42/50) | — |
| n-rest × neuroticism | 55 | 33+/22− | **0.9713** | 0.9737 | 0.9706 (41/55) | — |
| n-rest × extraversion | 5 | 3+/2− | 0.7699 | 0.7644 | 0.7511 (2/5) | — |
| n-rest × agreeableness | 5 | 3+/2− | **0.6949** | 0.7092 | **0.6949** (5/5 verbatim) | **under-0.70 (mix)** |
| n-rest × conscientiousness | 5 | 3+/2− | **0.6529** | 0.6438 | 0.7068 (2/5) | **under-0.70 (kalibrert)** |
| n-rest × openness | 5 | 3+/2− | 0.7241 | 0.6853 | 0.7377 (0/5) | — |

Lesebrille: de fem store skala-armene sitter på 50–55 items og er på 0.94–0.97 uansett arm;
de fire fillers-skalene (k=5) er **strukturelt begrenset av k** (α(5, r̄≈.35) → 0.59–0.77)
og lander ved α≈0.65–0.77 — **mindre enn «skala»**, mer enn «fylle»; fase 10-sammendraget
må ikke presentere fyll-slots som målbare skalaer. Ved k=50 med samme r̄ ville de samme
items gi α≥.95 — det er k, ikke itemene, som binder.

### 3.2 ND-triage (EN, 40 items)

| Skala | k | keying | α teoretisk | α simulert | λ-sens (0.60→0.80) |
|---|---|---|---|---|---|
| adhd | 20 | 20+/0− | **0.9282** | 0.9276 | 0.8950 → 0.9652 |
| autism | 20 | 20+/0− | **0.9282** | 0.9236 | 0.8950 → 0.9652 |

Alle items er sign=1 (NG-4-dokumentert avvik fra #3758, ingen reverserte); likert-prosessen
og keying-håndteringen er derfor identisk på begge akser. λ=.65 er dokumentert konvensjon:
**etiketten på dette tallet er «modell-anslag med sensitivitetssalve, ikke måling»**.

## 4. Resultat — ability-poolene (2PL-estimater)

| Tema | k | b-spread (ekte) | KR-20 teoretisk | α simulert | a-sens (1.00→2.00) | Flag |
|---|---|---|---|---|---|---|
| T1 matriselogikk | 50 | [−1.75, 1.70] | **0.9548** | 0.9342 | 0.8793 → 0.9681 | — |
| T2 numerisk | 50 | [−1.75, 1.70] | **0.9548** | 0.9387 | 0.8793 → 0.9681 | — |
| T3 verbal | 50 | [−1.75, 1.70] | **0.9548** | 0.9389 | 0.8793 → 0.9681 | — |
| T4 romlig | 40 | [−1.75, 1.70] | **0.9430** | 0.9205 | 0.8793 → 0.9681 | — |
| T5 sekvens | 40 | [−1.75, 1.70] | **0.9430** | 0.9255 | 0.8793 → 0.9681 | — |
| Puzzle (hel pool) | 90 | [−1.93, 1.77] | **0.9758** | 0.9701 | 0.9480 → 0.9867 | — |
| Puzzle band L | 30 | [−1.93, −0.60] | 0.9230 | 0.9014 | — | — |
| Puzzle band M | 30 | [−0.43, 0.35] | 0.9501 | 0.9208 | — | — |
| Puzzle band H | 30 | [0.57, 1.77] | 0.9288 | 0.9156 | — | — |

Puzzle-tallene er **as-is** på nivå-siden: s3-slot-avviket (DOC-29CC9CFE0D, BLOKKERENDE,
fix er tidsplanlagt i [BYGG]-kjeden) er IKKE modellert — reell løsningsprosess på de 30
s3-items vil senke effektive b-verdier og dermed sannsynligvis senke mixed-session-alfa
nedenfor estimatet. Etiketten på puzzle-tallene er derfor «maks-estimat under antakelsen
korrekt fasit-lesing».

## 5. Selftest (19/19) — hva hver sjekk fanger

- S1a–c: mulberry32-portens helse (gj.snitt, lag-1-korrelasjon, 10-bin-symmetri).
  S1b er **v1-bug-fangedefensen**: feil bit-aritmetikk i v1-porten ga lag-1-korrelerte
  draws og *negative* alpha for sign-blandede pooler.
- S2: α↔r̄ runde-tur (eksakt).
- S3: teori≡sim per likert-skala (gap .0002–.0084; toleranse .06).
- S4: KR-20≡sim per ability-pool (gap .006–.023; toleranse .07→.05 i v3).
- S5a: teoretisk sign-reverserings-invarians (eksakt likhet 0.9823…).
- S5b: simulert reversering over 4 seeds (gap .0006).
- S7a/b: theta-momenter fra ekte strøm (var .995, kurt 2.99) — fangede en v2.5-bug
  (cos-only Box-Muller ga var=.5/kurt=1.5 og dermed lav parvis kovarians).
- S6: ingen negative alpha-verdier i noen arm (end-stasjon for S1-feilklassen).

## 6. Bugs fanget av verifisering (dokumentert, ikke skjult)

1. **v1 mulberry32-porten** hadde feil bit-aritmetikk (imul-overflow) → lag-1-korrelerte
   draws → **negative alpha** på sign-blanede pooler; fanget av S1b/S6.
2. **v2 Box-Muller-gren:** bare cos-grenen ble brukt → θ var=.5, kurt=1.5 → alle
   ability-S4-gaps for støre (0.06–0.08) og likert-miks-dekorrert; fanget av S7a/b.
3. **v2 likert-sign-modell:** pro-skår-prosess med 6−K som felt dekorrert Σ-skåren med θ
   (m(−x) = 6−m(x) gjør ikke x=−λθ til en skårsentral prosess) → teoretisk α −2.3e9/−0.25;
   korrigert til IPIP-prosessen x = s·λ·θ, skår 6−K, **empirisk validert**: 3-variant-
   eksperimentet viser 5+/5− ≡ 10+ ≡ 10− (0.9392/0.9398/0.9393) og blandet ≥ ren.
4. **v2.75 var_total-koherens:** sum- middel-varian uten feilvarians-ledd ga α=0.45 for
   mix-5-item-skalaer (umulig — identisk med all-plus); lagt til feilvarians og r̄-formel;
   teori faller nå eksakt sammen med all-plus-manuell beregning og sim (gap < .009).

## 7. Regresjon (uroet — ingen motorfil rørt)

`_ipip50_selftest` ALL PASS · `selftest_nd_triage_pool` 78/78 · `tests/engine/selftest.mjs`
72/72 · `_evne_itemspec_selftest` ALL PASS · `evne batch1/2/t5` ALL PASS ·
`_nd_triage_model` ALL PASS · `persona batch1/2/3 selftests` ALL PASS ·
`_rel_itemspec_selftest` ALL PASS · `selftest_puzzle` 99/99 · `normering` 107/107.

## 8. Åpne punkter (bordsøstre, ikke dette steget)

- **#3769** leser dette resultatet (kontrakten er oppfylt: fire under-0.70-rader står i
  tabellene over, none er skjult — det er poenget med etiketten i § 0).
- **Fase 10** forblir målesteget: α på **ekte** responsdata (normering-endpointen NORMERING_KV
  i FASE 4-binding samler parvise rader anonymt; per-item- og per-scales-utdeler må
  deretter konsumeres fra KV — ikke fra denne teorien).
- **Fillers-skalene (k=5)** bør i fase 10 enten utvides til målbar k, eller tydelig
  deklareres som «fyll-slots, ingen skala-paastand» i rapport-laget.
- **Relasjons-poolen** (240 items, R1–R4) mangler EN-dim-distribution i dette steget:
  α-estimat for R1–R4 er IKKE beregnet her (itemspec fra #3738 + pool-batches #3781–#3784
  er strukturell input, men de tilhører egen leveranse-runde i henhold til brett #3825);
  rapporten må ikke brukes som bevis for relasjonspoolens α.
- **a i 2PL** (evne/puzzle) er fast 1.5 — før FASE 4-korrelasjonssteg (#3833, PIN) er det
  ingen data-veg til å estimere diskriminering; sensitivitetstabellene i
  _alpha_result.json er inntil videre rapportens ærlige grense.
