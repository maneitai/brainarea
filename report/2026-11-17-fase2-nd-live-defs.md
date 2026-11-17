# FASE 2 — ND live-defs (todo #3843)

Dato: 2026-11-17. Prod-tre: filip-webside-prosjekter/brainarea. Speil _delt/brainarea synkronisert.
Kontrakt: tests/schema/_nd_itemspec_spec.json (nd-itemspec-v1, PROPOSED) + DOC-C8C02AD272 (#3732-verdikten).

## Leveranser (tests/schema/nd_pool/)

- def-nd-triage.{no,en}.json — 6 items: ta-0010/0015/0016 (ADHD, alle asrsNear, lavest id
  per ANKER-familie fra nearNote: asrs-uro / asrs-husk / asrs-oppgaver) + ts-0001/0008/0015
  (autisme, temaspredning t1/t2/t3; ingen ts har asrsNear). scoring trait (adhd+autism,
  weight 1), norms none, options byte-identisk 5-NOYAKTIGHET-ankeret fra def-ipip50-big5.
- def-nd-adhd.{no,en}.json — 24 items stratifisert 10/8/6 over fasett-poolene da1/da2/da3
  via round-robin per temabaand (pool-orden, lavest id per baand), deterministisk.
- def-nd-autisme.{no,en}.json — 24 items, samme regel over ds1/ds2/ds3.
- _nd_live_defs_meta.json — utvelgelsesregler, ANKER-familier, asrsNearChosen,
  deep-picks + themeCounts, lisensbasis, ASRS-reservasjon.
- gen_nd_live_defs.py — deterministisk (ingen RNG); re-kjoring byte-identisk (S13).
- selftest_nd_live_defs.mjs — S0–S13, 74/74 ALL PASS; rapport _nd_live_defs_selftest_report.json.

## Utvelgelsesbeslutninger

- Triagedef adhd: asrsNear-familiene går på nearNote-ANKERet (ta-0010 = sitte-uro-ankeret,
  ta-0016/17 = anker-1-familien ufullførte oppgaver, ta-0015/20 = anker-3-familien huske).
  Lavest id per ANKER-familie gir ta-0010, ta-0015, ta-0016. (Pool-tema adhd-t3 alene ville
  gitt feil utvalg — tema spriker i anker.)
- Triagedef autisme: ingen ts-items flagget; temaspredning t1/t2/t3 lavest id per tema.
- Dyp: round-robin over temabaand (10/8/6) — dekker alle temaer i hver fasett.
- ASRS-blokken (verbatim, 6Q, shaded patient-versjon) er IKKE i live-def v1 — design-reservert
  per triageSessionDecision.asrsPlaceholder (schema additionalProperties:false + NG-2-bekreftelse
  mangler); traits-entry 'asrs-anchor' + 6→12-utvidelse skjer ved #3760 uten strukturendring.

## Verifisering

| Sjekk | Resultat |
|---|---|
| AJV + ekte validateTestDef, 6 defs × 2 språk | PASS |
| Triage-utvelgelse mot asrsNear-anker-familier + temaspredning | PASS |
| Dyp-stratifikasjon 24 = 10/8/6 per fasett (adhd + autisme) | PASS |
| Options byte-identisk NOYAKTIGHET-anker, alle 54 items | PASS |
| Itemtekster byte-identiske med pool-kildene (54 items) | PASS |
| Konstrukt-ekvivalens NO/EN: id-orden, skalaer+sign | PASS |
| Ekte scoring.js: alle5/alle1 (100/0, komposit 50), alle-3 (50/50), halvbesvart (null + warning), da1-kun (100/null/null, vindu [10,50]), alle-4 (75/75/75) | PASS eksakt |
| Triage-modul: 4 utfall, 55-grense, null-akse, deepPoolId-er peker på leverte def-filer | PASS |
| Tekstregler 8–14 ord + forbudte token-skann | PASS |
| Meta-konsistens + lisensbasis + ASRS-reservasjon | PASS |
| sessionSizeFor(likert) = alle items (6/24/24) | PASS |
| Determinisme: re-generering byte-identisk (7 filer) | PASS |
| Søster-regresjon: triage-pool 78/78, da1 86/86, da2 89/89, da3 89/89, ds1 91/91, ds2 95/95, ds3 95/95, nd-itemspec ALL PASS, ipip50 ALL PASS | ALL PASS |

## Grenser

- Defene er katalogdata (family pool) — visning/routing i sporet er FASE 3/4-arbeid; browser-runner (#3840, parallelt leaf) kobler defene til siden.
- Score-tallene er mot ekte motor med håndregnede forventninger; «estimater»-språk følger sporets ærlighetsprinsipp (norms none).

## Åpne punkter

- Skriftlig NYU-bekreftelse (NG-2) før ASRS-blokken settes live (#3760).
- Triagemodell-utgave for live-spor: deepPoolId 'nd-adhd-autism' trenger en egen live-def (samme 24+24-sett) når «begge»-utfallet skal ha nestesteg — ikke blokkerende for denne leveransen.
