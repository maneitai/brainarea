# FASE 2 — Puzzle spilltest [#3766-pod, [VERIFISER x2]]: AVVIKS FUNNET OG SAMMENSLÅTT

**Status: FULLFØRT — 1 BLOKKERENDE avvik funnet, sammenslått fra 2 uavhengige familier, FIX-RETNING klar (rett rettes i [BYGG]-steg, ikke her). Spilltestet run: TR-B55C8A22BA1A (worker-kontekst), 2026-11-16.**

## Metode (2 familier, uavhengige metoder)

- **Familie A (intuitiv spiller):** løste alle 16 standard-etasjer fra PROMPT-teksten alene (regelresonnering siffer + form), spilte dem gjennom den EKTE player-API-kjedingen (`puzzle-player.mjs` v0.1.0: initStandardRun → openFloor → submitChoice → advance), med retry-semantikk der etasje ≥ 9 tillater det. Fasit ble lest fra def kun etter at valget var løst fra prompten.
- **Familie B (systematisk tvetydighetssøk):** genererte alle enkle konsistente regler (konstant tall-diff mod 10 / form-sykluser mod 4 / to-sporing X-partisjon og Y-partisjon) per item fra den viste raden, og sjekkede hvilke konsistente neste-tiles som finnes i alternativene.
- ask_agent-delegasjon var utilgjengelig fra worker-konteksten (sammenlign #3764:s todo_add-svakhetsklasse); de to metodene er reelt uavhengige (spill-API vs. regel-enumerasjon) og konvergerte, som er x2-verdien her.

## Resultat familie A — spill for spill (16/16 etasjer spilt)

| Etasje | Item | Band | A (1.) | Utfall | Fasit | Klassifisering |
|---|---|---|---|---|---|---|
| 1 | pz-s1l01 | L | 7△ | løst | 7△ | OK |
| 2 | pz-s2l01 | L | 7△ | løst | 7△ | OK |
| 3 | pz-s3l01 | L | 8△ | closed + reveal | 5○ | **BROKEN s3** (Y p3 = 8△) |
| 4 | pz-s1l02 | L | 6◇ | løst | 6◇ | OK |
| 5 | pz-s2l02 | L | 8○ | closed + reveal | 8◇ | A-avlesningsfeil (form-retning), itemet entydig |
| 6 | pz-s3l02 | L | 3◇ | closed + reveal | 8□ | **BROKEN s3** (Y p3 = 3◇) |
| 7 | pz-s1l03 | L | 8○ | løst | 8○ | OK |
| 8 | pz-s1m01 | M | 8◇ | løst | 8◇ | OK (første M) |
| 9 | pz-s2m01 | M | 1○ | løst | 1○ | OK |
| 10 | pz-s3m01 | M | 4□ → retry 0○ | løst (retry) | 0○ | **BROKEN s3** (Y p3 = 4□) |
| 11 | pz-s1m02 | M | 2○ | løst | 2○ | OK |
| 12 | pz-s2m02 | M | 2□ | løst | 2□ | OK |
| 13 | pz-s1h01 | H | 0○ | closed (etasje 13 ingen retry på feil? retry ga ret) | 5○ | tvetydig wrap-lesning, fasit entydig under kvadratregel |
| 14 | pz-s2h01 | H | 5△ | løst | 5△ | OK |
| 15 | pz-s3h01 | H | 6○ → retry | løst (retry) | 0○ | **BROKEN s3** (Y p3 = 6○) |
| 16 | pz-s1h02 | H | 8□ | løst | 8□ | OK (partisk tall-diff, form pendlende — lesbar) |

Første-respons: **10/16 riktige** · retry-bruk: 3 (E10, E15; alle reddet) · reveals: 3 (E3, E5, E6 — **alle i L-båndet**) · attempts forble i game-state, payload inneholdt dem aldri (kontrakt verifisert live). Score på A-runn: raw 10/16, θ = -0.14, ci95 [-1.27, 0.98].

## SAMMENSLÅTT AVVIK (2 familier enige om samme rotårsak)

### AVVIK-1 [BLOKKERENDE]: s3-generatoren svarer på feil slot — 29/30 s3-items er uløselige fra prompten

- `make_s3` viser 7 ledd: pos 0–6 = X0 Y0 X1 Y1 X2 Y2 X3 (X = partall-posisjon, Y = oddetall). **?-slotten er pos 7 = NEXT Y-led (p3).** Men fasiten blir beregnet som X p4 (pos 8, `make_s3`: `xn = (x0 + a*4)` ) — ett ledd FOR LANGT.
- Konsekvens: den konsistente, regel-avledbare fasiten for «?» er Y p3 — som ligger **i distraktorene for 29/30 s3-items** (s3h03 er fluke-kollisjonen der X p4 tilfeldig == Y p3, dvs. 1/30 OK). En spiller som leser «to regler gjelder annenhvert ledd» konsistent riktig, velger Y p3 og teller FEIL.
- Verifisert pool-omfattende: 30/30 s3-items har fasit = X p4 med Y p3 tilgjengelig som distraktor; s1/s2 (60 items) er konsistente (fasit = ekte fortsettelse, formelformel-verifisert, 0 avvik).
- **4 s3-trekk i standardkurven (E3 L, E6 L, E10 M, E15 H) er uløselige** — alle tre band ramma. Kontrafaktisk run (perfekt konsistent spiller): 12/16, θ = +0.57, ci95 [-0.66, 1.80] — dvs. spilleren leser ALLE regler riktig og skårer likevel middels. Skårsystemet straffes for korrekt lesning.
- **Selftest fanget det aldri (sirkularitet):** A10 «fasit-reavledning stemmer for alle 90» re-avleder fra `meta.rule` med SAMME formel generatoren bruker (x0 + a*4). Re-avledning verifiserer formel-mot-formel, aldri prompt-tile-ro → feilen sitter i formelen og er dermed usynlig for A10/C1/K1-bandene. M1 sjekker ids, ikke regel-konsistens. Dette er en metode-leksjon til pool-selftestene generelt: re-avledningen må løses fra PROMPTEN, ikke fra meta.

### AVVIK-2 [SPILLFØLELSE, non-blokkerende]: 3 reveals i L-båndet

Designantakelsen var at L-raden (7 etasjer) er feilfri terreng; reveals på E3/E5/E6 betyr at til og med gode spillere får fasit-avsløring tidlig. AVVIK-1 forklarer E3/E6 (s3). E5 var A-avlesningsfeil (form-syklus +1 vs -1), itemet er entydig — men «vanskelig form-retning-lesning i L» er et design-læringspunkt (overvei om s2-L-form-regler skal være kun +1, aldri tvetydig med det synlige vinduet).

### AVVIK-3 [SKÅR-MENINGSLØSHET, del av AVVIK-1]: theta underbelønner korrekt lesning

Strukturelt: alle s3-trekk straffer korrekt lesning med -1 item, θ trekkes uforholdsmessig ned (kontrafaktisk beregnet over). Skåren er i dag IKKE meningsfull for s3; dette løses automatisk av AVVIK-1-fix.

### Kjedelig / resten

Ingen av familiene fant kjedelighet utover AVVIK-2. Retry-flyt (E10/E15), progress, reveal-fornuft ved dobbeltfeil, delekort-tallløshet og score/ny-normeringsnekt fungerte; første-respons-kontrakten holdt live.

## FIX-RETNING (til neste [BYGG] — rettes IKKE i dette steget)

1. `make_s3`: fasit = **Y p3** (`(y0 + b*3, yoff + sb*3)`); X p4 holder som distraktor. Alt annet (ids, bands, b-verdier, prompten) upåvirket.
2. Regenerer def/meta (deterministisk — byte-idempotent), oppdater A10-reavledningsformelen TIL prompt-basert avledning (tile-ro → neste) for å fjerne sirkulariteten, re-kjør selftest (nye distraktorkollisjoner håndteres av `uniq()`).
3. Re-kjør spilltesten (E3/E6/E10/E15 må da løses konsistent, reveals i L forsvinner).
4. Metode-notat: pool-selftestenes fasit-kontroll skal ALDRI re-avlede fra `meta.rule` alene — det er definisjonskirket.

## Verifisering av kjernen uroet? Nei.

Selftest uendelig-pass (99/99 forut for dette avviket), ingen prod-kode rørt i dette steget. Rapportfilen dette dokumentet er levert i prod-treet + speil `_delt`.
