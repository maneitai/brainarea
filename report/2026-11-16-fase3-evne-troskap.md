# FASE 3 [VERIFISER] evne_pool NO-oversettelse — troskaps-/invarians-kontroll (søster-verify, TR-C38797038E06)

Dato: 2026-11-16. Søster-verify til verdict `_fase3_evne_verdict.json` (TR-D2CA262EE725, GJELDENDE).
Kontrollen leser mot NO- og EN-defene, meta-filene og generatorene — uavhengig av verdictens eget
svarområde og av generator-kode (fasitene re-avledet fra ren prompt-tekst, ikke fra meta).

## Verdict: OVERENSKENDE — ingen oversettelses-sak strider mot verdicten

Alle 5 rettelser er verifisert satt i def + generator + meta (regenerability bevart).
Alle 5 avkreftinger bekreftes som avkreftet. Alle 3 hold står uendret. De 2 pins er reelle
og ligger i FASE 4-mandat. Én referansebug i verdicten (hold-id) er dokumentert under —
tekstfeil i verdiktet, ikke i data.

## 1. Rettelser verifisert anvendt (def + gen + meta, tre steder hver)

| Rettelse | Def | Generator | Meta |
|---|---|---|---|
| «Følgjen» → «Følgen» (t5, 17x) | 17 treff / 0 «Følgjen» | grep 1 malstreng «Følgen», 0 bug-streng | 0 «følgj» i meta |
| «himlen» → «himmelen» (t4 sp-0018, 1x) | 0 «himlen», 1 «himmelen» (label) | gen_batch2 1 «himmelen», 0 «himlen» | 0 «himlen» i meta |
| «to:nummer» → «to numre, ett fra hver ende» (t4 sp-0034) | opt3 = «Mia har to numre, ett fra hver ende»; 0 kolon-tegn i NO-korpus | — (ingen kolon i gen) | 0 «to:» i meta |
| calque «hører ikke hjemme med» → «hører ikke sammen med» (t3 NEG-mal, 12x) | 0 «hjemme med», 12 neg-mal + 9 pos-mal «hører sammen med de andre» | gen_batch2 12 «hører ikke sammen med», 0 calque | 0 calque i meta |
| «Ferjeferden → Fergeferden» (vr-0028, 3x) | 0 «ferje», 3 «ferge» i item | gen_batch2 0 «ferje» | 0 «ferje», 3 «fergeferden» i meta |

## 2. Fasit-invarians, uavhengig re-avledning (verdictens metode + nytt lag)

**t1 (matrise, 50+50):** eksakt lineær løsning av lengde-feltet (v = A + B·r + C·c, rasjonell
eliminasjon; unik løsning for hver 8-celle-grid) + tegn-trådregel per kolonne/hoveddiagonal.
Resultat: **50/50 NO og 50/50 EN** — hvert fasit-ledd er eksakt regelverdien, i både språkpar.
Distraktorer: rotasjons-family (same length other char = lovelig distraktor).

**t2 (numerisk, 50):** råsekvenser avledet fra prompt; familier verifisert fra regel-signaturer:
arith/geom/diffchain/quadinc/muladd/dual/fib-pairsum 100% bekreftet. alternate-familien
(nm-0018..0023): fasiten er v5 + d₁ + d₂ (terminen ETTER neste); naturlig neste (v5 + d₁)
ligger i opsjonslisten bare i nm-0018 ('20') — et **design-avvik fra konvensjonen "manglende
ledd = umiddelbar neste"** som 5 av 6 alternate-items har løst ved at naturlig neste IKKE er
blant opsjonene. Verdicts hold-liste har nr-0009 (nm-0026) som diffchain-tolvil; alternate-
konvensjonen er **under-kommentert i verdicten** (konvensjonsrisiko, ikke fasitfeil:
distraktor-mønsteret 22/24/26 rundt farsit 23 er konsistent med reglereglene).

**t5 (40):** 17 seq-items re-avledet med mod-26 bokstavwrapping (sq-0031 B,C,A,B,Z → «A 26» er
korrekt med wrap-konvensjonen; uten wrap ville det vært feil) — 17/17; 13 update + 10 track
re-beregnet fra ren prompt-tekst — 23/23.

**t4/t3:** strukturelt verificert; t4-facit via meta correct_no/correct_en + optionOrder
(82/90 resolved + 8/90 index-lik = 90/90); t3-oddone-familien håndgodkjent kategorisk.

## 3. Hold-observasjoner (verdict-tillegg, ikke motstrid)

1. **Hold-id «nr-0009» finnes ikke** — t2-id-rommet er nm-*; henspillingen må leses som
   **nm-0026** («4, 8, 16, 28, 44 → 64»). Tekstfeil i verdict-fil, datafilene er rene.
   Foreslått fix i dette verdiktet: rett hold-referanse ved neste redigeringsanledning.
2. **«sq-0007/0017 bokstav-sprang +3»** — sq-0007 er A,C,E,G,I = **+2**; sq-0017 er +3.
   Blandet referanse; innholdet (annet sprang enn nestebokstav, akseptert mangel på
   undertype-krav) står seg.
3. **Alternate-konvensjonen** (t2) bør navngis eksplisitt i FASE 4-protocol-design: items er
   gyldige, men den naturlige «neste»-forventningen er ikke opsjon i 5/6 — testpersoner kan
   lese det som manglende fasit. Ligger i mandat-gap-mellom item-design og presentasjon.

## 4. Pins re-verifisert

- t1: 10 stimulus-identiske grupper (20 items, per prompt-tekst-count) — bekreftet; mx-0010/mx-0016
  identiske cells + violations + correct, b = −1,55 vs −1,15.
- t2: 5 stimulus-identiske grupper; maks b-divergens nm-0024/nm-0046 = 0,0 vs 1,7 — bekreftet.
- Identiteten finnes identisk EN==NO (duplikater stammer fra generatorkonstruksjon, ikke fra
  oversettelse) — verdictens klassifisering «pool-design-spor, EN-side frosset» holder.

## 5. Regresjon (kjørt live i denne økten)

engine selftest 72/72 · scoring del1 27/27 · del2 27/27 · integrasjon 5/5 · attention 57/57 ·
ipip50 ALL PASS · evne-itemspec ALL PASS · evne batch1/batch2/t5 ALL PASS ×3 ·
nd_triage_pool 78/78 · persona selftest ×3 ALL PASS · _fase3_psykometrisk_verify 31/31 ·
i18n 22/22 · normering 107/107 · puzzle 99/99.

## 6. Arbeidsmetode-notat

- Regenerability bevist via git (byte-identisk re-generering; c7e6acb uroet, arb.træt clean).
- py_run-økter som leste F:-sti med cp1252 ga midlertidig mojibake (0xA5=YEN) — probe-feil,
  ikke datafeil; utf8-lesing bekreftet ren (0 YEN i t5.NO utf8).
- Verdict-filen bruker '¶'-erstatninger i enkelte tekstfelter (encoding-kvant i verdict-
  genereringen); innholds betydning er urokkelig, men bør renskes ved neste skriving.
