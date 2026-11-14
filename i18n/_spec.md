# Brainarea i18n — nøkkelfil-struktur (FASE 1)

Status: bygd som todo #3716. Verifiseres av #3717 (DeepSeek) mot denne spesifiseringen.

## Modell: EN = base, alt annet = overlay

- `en.js` — **base**: all UI-, note- og aria-tekst på engelsk. Komplett til enhver tid.
- `no.js` — **overlay**: norske tekster. Manglende nøkler resolves mot EN-basen via `index.js`.
  En nøkkel som fins i NO men peker på EN, er per definisjon mangelfull og fanges av selftesten
  (EN-nøkler må være fullt dekket i katalogen: hvert EN-navnerumsnøkkel må eksistere et sted).
- Senere: `de.js` overlay — identiske regler. De tre spesifikasjonsdokumentene (EN/NO/DE)
  er den eneste sanne kilden for strengene; motorens `BASE_DICT` er generert herfra.

## Nøkkel-grammatikk

- Format: `<namespace>.<name>` (prikk = nivågrense over AKTUELT to nivåer; name kan inneholde prikk, f.eks. `note.trait.not-normed`).
- Navnerum:
  - `ui.*` — engine UI-strenger (`render.js` BASE_DICT genereres herfra)
  - `nye` navnerum = spesifikasjon-endring (schema/i18n/_key-spec.schema.json)
  - `note.*` — scoring-notes; `note.<id>` matcher `result.notes[].id` (scoring.js pushNote)
  - `aria.*` — tilgjengelighetsetiketter for syntetiserte kontroller (order-move-knapper)
- Placeholders `{a} {b}` er posisjonelle — orden er fastlåst av EN; oversettelser endrer aldri rekkefølgen.

## Oppløsningskjede

```
t(key) => overlay[lang][key]  ->  EN[key]  ->  key
```

Ukjent språk → resolves mot EN (aldri kast, aldri tom streng). Dette samsvarer med render.js `uiDict` (
`base[lang] || BASE_DICT.en`; `overrides[key] || base[key] || en[key] || key`).
`index.js` er resolveren; render.js fases over til generert BASE_DICT i ett senere steg.

## Schema-tie-in (schema v1, test-definition.schema.json)

- `languages[]` — liste med full innholdsspråk, orden = fallback-orden (schema-driver).
  `resolveLang(def, wanted)` velger språk per test; ui/note/aria-nøkler oppslås deretter med `getT(lang)`/`makeT(lang).
  `languages[0]` er per schema "fallback order".
- `dimensions[].label` er forankret i `labelLanguage`; andre språk resolves via i18n nøkkelmønster
  `dim.<testid>.<dimension-id>` — namespace `dim.*` er planlagt, ikke definert i FASE 1 (ærlig gap, åpent).
  Når det åpnes, er det en spesifikasjon-endring via _key-spec.schema.json — ikke en kode-endring.
- Item-tekst (likert/order inline; ability per variant) er **ikke** i i18n-katalogen —
  schema v1 holder item-text inline per språk ved design; i18n-catalogen dekker kun engine-strenger (ui/note/aria).
- Noter fra scoring (`result.notes[].id`) → `note.<id>`-nøkler: i18n-katalogen er den eneste kilden; scoring.js pushNote-tekstene er generert fra katalogen.

## Selftest

`_i18n_selftest.mjs` — kjør: `node tests/i18n/_i18n_selftest Selve` (Node ≥ 20, ingen deps).
Dekker: nøkkel-grammatikk, EN-kompletthet, overlay-oppløsning, ukjent språk, fallback
(aldrig kast/tom), note-id-match mot scoring, aria-tekst-mønstre (flytt X opp/ned).
