# FASE 3 — OG-kort per test [BYGG] (leaf i TR-8834DDCC1B74, steg 4/20)

Dato: 2026-11-17. Søster til #3790-delgrafen, #3794-delingslenken og PDF-bygget.
Delingsforhåndsvisning (og:image) for alle 7 ruter × no/en = 14 kort.

## Spørsmålet og svaret

Steget lød «statisk SVG/HTML». Kilder hentet 2026-11-17 (opengraphdebug.com,
OpenGraph Image Requirements): **SVG er ikke et gyldig og:image-format** —
crawlers rendrer den ikke; PNG/JPG 1200×630, absolutt URL, eksplisitte
dimensjoner er kravene. Derfor: **leveransen er PNG**, med byte-deterministiske
SVG-mastere som bygggrunnlag og bevis (begge i assets/og/, kun PNG-en refereres
av meta-taggene).

## Kontrakt

- **app/og.js** (modul v1): `renderOgSvg({title, desc})` — deterministisk
  SVG 1200×630 (brand «Brainarea», accent-bar #1d4ed8 nederst, sitens
  gråskala-palette); kaster på konfigfeil (tom/mangler/for-lang/ulovlige
  tegn — tittel ≤ 2 linjer, desc ≤ 3 linjer, siste baseline ≤ 570).
  Måling mot fontens ekte vidder: mini-hmtx-parser over DejaVu Sans
  (+Bold fra report/pdf/fonts/ — samme font-leveranse som PDF-steget).
  `ogStringWidth`/`wrapMeasured` eksportert (målt ord-brytning, ingen anslag).
  `ogCardForRoute({locale, route, t})` tar i18n-resolveren — modulen
  oppfinner aldri tekst; `ogCardOrder()` = 7 ruter × no/en;
  `ogMetaLines()` = head-meta med absolutte URL-er (canonical-rot).
- **i18n**: 7×2 nye nøkler `page.<route>.og.alt` (EN base + NO overlay,
  +7 hver — 170 nøkler total), imageAlt-kontrakten på plass.
  Eksisterende `page.<route>.og.title/.og.desc` brukes som kortmateriale.
- **app/build.js**: pageShell emitterer `og:image` + `og:image:width/height/
  type/alt` og `twitter:card=summary_large_image` + `twitter:image(+alt)`.
  PNG-ene (git-trackede i assets/og/) kopieres til out/ per bygg — **CI
  trenger aldri sharp** (deploy-bygget er raster-fritt).
- **app/_og_raster.mjs**: regenereringsverktøy — SVG-master → PNG via sharp
  (librsvg). Krever plattform-binært sharp; skriver PNG+SVG+MANIFEST.md5
  til assets/og/. Feiler aldri stille.

## Bevis

- Selftest `tests/schema/_fase3_og_selftest.mjs` — **163/163 PASS**: G1 ekte
  kjede over alle 14 kort, G2 måling, G3 byte-determinisme, G4 kast-batteri
  (11 tilfeller), G5 identifikatorfrihet (ingen skår/lenke/navn — kortene er
  statiske per rute), G6 strings-sink-dekning, G7 meta-kontrakt, G8 build-wire,
  G9 raster-manifest mot faktiske filer (md5+bytes+svg-master), G10 forbudstokener.
- **Målingskryss**: uavhengig Python-hmtx-parse + PIL `getlength` — i, w, M,
  å, Æ, space: identiske verdier med modulen (0 avvik).
- **To ekte feil funnet og fikset underveis**: format-12-cmap-gid-mappingen
  manglet intra-gruppe-offset (`gid + cp − startCp`) — alle tegn fikk
  gruppens første glyf-vidde; nGroups-offset feilet posisjon. Fanget av
  selftest-G2 + PIL-krysset, ikke skrevet rett for hånd.
- **Raster**: 14/14 PNG 1200×630; ink-zoner verifisert; visuell lesing av
  rel-no + home-en OK (layout/lesbarhet); home-no.png == play-no.png (identiske
  strenger → identisk kort, forventet), home-en ≠ play-en (ulike og.title-nøkler).
- **@font-face-blindhet i librsvg** probe-verifisert (identisk md5 med brutt
  font-URL): rasteren bruker systemfont — PNG-md5 er vertsavhengig;
  byte-asserter gjelder SVG-mastrene (maskinuavhengige). Vertssjikt pinnes.

## Regresjon

Alle grønne: og 163/163, i18n 22/22 (170 nøkler), share-link 108/108
(stdout-md5 4ced62f5… uroet), delgraf 46/46, hreflang 171/171, engine 72/72,
integrasjon 5/5, report 74/74, pdf 105/105, nd-resulttext 226/226,
nd-3rdparty 326/326, rel-resulttext 88/88, rel-3rdparty 214/214, estimat 76/76,
gscore 54/54, itemspec×3 ALL PASS, pdf-demo byte-identisk (78a08e8a…).

## Leveranseliste

Additivt: app/og.js, app/_og_raster.mjs, assets/og/ (14 png + 14 svg + manifest),
tests/schema/_fase3_og_selftest.mjs, tests/schema/_fase3_og_verdict.json,
denne rapporten. Mutert: app/build.js (wire), i18n/en.js + i18n/no.js (+7
nøkler hver), 2 regenerte selftest-rapport-JSON-er (dato/nøkkeltall).

## Pins

1. Kris' visuelle sjekk av 14 kort før deploy (2 lest av modellen).
2. CI deploy mangler fortsatt i tre (pages.yml-fallback placeholder) — ikke dette leafet.
3. Dynamisk skår-forhåndsvisning mot #d=-lenker er FASE 4 (par-flyten PIN-3);
   dette leafet leverer kun statiske rute-kort.

## VERIFISER (DeepSeek-steg 5/20, TR-BF0669B27CBA, iter 1) — 2026-11-17

Selvstendig re-verifisering av leveransen mot OG-spes (kilde: opengraphdebug.com 2026-11-17):

- **Selftest re-kjørt i prod-tre** (node v22.22.1): 163/163 PASS, 0 FAIL.
- **Manifest re-verifisert uavhengig** (vert-Python, egen md5-beregning): 14/14 PNG md5+bytes + svgmd5 OK, 0 formatavvik. Alle PNG 1200×630, maks 45 263 B (<5 MB). Alle SVG-master viewBox `0 0 1200 630`.
- **out/-kopier**: 14/14 PNG byte-identiske med assets/og. SVG-master bevisst ikke i out/ (kun PNG deployes — SVG er forbudt som og:image).
- **Meta per side ×14**: unik `og:image` per rute/locale som peker på egen fil, absolutt URL under canonical-roten, eksplisitte dimensjoner + type, alt fra i18n `page.<route>.og.alt`; `og:title`/`og:description` unike per side og locale; twitter `summary_large_image` på plass.
- **Verdict: PASS** — bilde, tittel og beskrivelse på plass per test. Verdict-fil: `_fase3_og_verify_verdict.json`.
- **Avvik OGV-A1 (sev 1)**: twitter-taggene emittes dobbelt per side — `ogMetaLines()` og `pageShell()` overlapper på card/image/image:alt (identisk content, funksjonelt ufarlig). Ryddes i egen micro-fix; selftest G7 justes da.
- **Avvik OGV-A2 (sev 1, fakta)**: deployed URL 404 — live-siden er fortsatt «Under gjenoppbygging.»-placeholderen; deploy mangler i kjeden. Lokal bygg komplett; 404 er ikke kortfeil.
- Observasjon: `og:url` emittes ikke; `link rel=canonical` på plass per side (lav prioritet, ikke i OP-spes-utdraget).
