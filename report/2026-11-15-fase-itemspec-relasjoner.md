# FASE 2 — Itemspec relasjoner: dimensjoner + kompatibilitetsmodell (todo #3738)

Dato: 2026-11-15. Commit 730519b i prod-treet. Speil _delt/brainarea synkronisert.

## Leveranser

- tests/schema/_rel_itemspec_spec.json — specVersion 1, PROPOSED → GJELDENDE ved #3813
- tests/schema/_rel_compat_model.mjs — kompatibilitetsmodell v1 (referanseimplementasjon)
- tests/schema/_rel_itemspec_selftest.mjs — S0–S15, 66 sjekker

## Verifisering

| Sjekk | Resultat |
|---|---|
| Selftest rel-itemspec (S0–S15, ekte scoring.js- og compat-prover) | 66/66 ALL PASS |
| AJV schema-validitet av trait-probe-def + ugyldig weight avvist | PASS (S15a/b) |
| Spenn-isomorfi p=m mot scoring.js: raw=1, span[-8,8], norm=56.25 eksakt | PASS (S8) |
| Compat: 100/band-strong identisk par; 80.0/band-aligned håndregnet par; determinisme; kast-aldri | PASS (S9) |
| FASE 1-i18n kryssles (dimensionDecision vs rel.intro NO/EN) | PASS (S3) |
| Regresjon: _ipip50_selftest / _evne_itemspec_selftest / engine selftest 72/72 | ALL PASS / ALL PASS / PASS |

## Kort

4 dimensjoner laast fra FASE 1-i18n (nærhet/åpenhet/konflikthåndtering/selvstendighet); 4×4=16 likert-items (avledet av rel.methodBody-lovet snittskår, isomorfi bevist); pool 60/dim med batch-mot-brett #3754–#3757; kompatibilitetsmodell v1: likhet for nærhet/åpenhet, toleranser 0.25/0.35 for konflikt/selvstendighet, band-strong/aligned/mixed/differing — alle avveininger dokumentert i spec-en compatibilityModel.why.

Åpne punkter: #3739 kryssles; poolbatchene autoriserer mot spec-en; alfa ≥ 0.70 måles i fase 10; norms 'none' til normdata finnes.
