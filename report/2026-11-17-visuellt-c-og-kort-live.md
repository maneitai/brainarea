# VISUELL-C — OG-/delingskort: live-verifikasjon, palett-korreksjon, OGV-A1-fix

Dato: 2026-11-17 · todo-run TR-C73417966E3C (steg 2/5 av TR-33F04462C5CE)

## Utgangspunkt

OG-kortene fantes allerede fullt wiret i prod (FASE 3-bygget, commit de72c02):
`app/og.js` (render + meta), `app/_og_raster.mjs` (sharp), 16 kort (8 ruter × no/en), PNG-git-tracked, build.js-kopiert til `out/`, meta wired i pageShell. Selftest 181/181 på plass.

Dette steget gjorde tre ting:

1. **Live-verifiserte alt** (meta-tags + PNG-er på github.io).
2. **Fikk frem det verdictet allerede sa**: kortene brukte den gamle hvite/blå paletten — avvik mot tasken OG mot siten.
3. **Rettet avvikene** (palett + OGV-A1) og regenererte alt.

## Funn og rettelser

### 1. Palett-avvik (hovedsak)

Sitens tema er mørkt: `--ba-bg:#101623`, `--ba-accent:#8b95f7` osv. (app/site.css `:root`).
OG-kortene (`app/og.js` konstanten `C`) avbildet fortsatt `#ffffff`/`#1d4ed8` — kortene ville ha sett ut som et annet produkt enn siten i delingsforhåndsvisninger.

**Fix:** paletten mapet verbatim mot `--ba-*`-variablene (`#101623` bg, `#8b95f7` brand/bar, `#e9e7e2` tittel, `#a8b2c6` desc). Raster regenerert for alle 16 kort på Windows-node v24.19.0 + sharp.

**Piksel-prove (sharp raw):** bg (5,5) = 16,22,35 = `#101623`; accent-bar (600,625) = 139,149,247 = `#8b95f7`. 1200×630.

### 2. OGV-A1 (dobbelt-emitterte twitter-tagger) — rettet

`ogMetaLines` sluttet å emitte twitter:*-linjer; pageShell (build.js) eier den komplette
twitter-blokken. Byggoutput: nøyaktig 1 × twitter:card og 1 × og:image per side (9 sider prøvet),
0 duplikater. Selftest G7 oppdatert: `count-5`, `twitter-none`, `alt-required` bevart → 182/182 PASS.

### 3. OGV-A2 (404 på homepage-PNG) — utdatert

Verdictens avvik var fra tiden før deploy. Live-sjekk: alle 16 PNG-er = HTTP 200 image/png,
byte-likte mot MANIFEST.md5.

## Verifikasjonssum (all grønn)

| Sjekk | Resultat |
|---|---|
| Selftest (incl. raster-manifest) | 182/182 PASS |
| Hreflang/routing/canonical | 194/194 PASS |
| i18n | 22/22 PASS |
| Dobbelt-bygg determinisme (HTML+PNG) | diff -r = 0 |
| Live meta NO (+EN) | rute-unik og:image/og:title/og:description + twitter:card, absolutte URL-er |
| Live PNG | 16/16 = HTTP 200 image/png |

## SVG-pålitelighet (eksplisitt rapportert per task)

SVG som og:image er upålitelig i delingsplattformer. Løsningen i repoet følger den
dokumenterte kilden (opengraphdebug.com, 2026-11-17): **PNG er leveransen og det som
wiret som og:image**; SVG-masterne ligger som byte-deterministiske bevis-spor i
`assets/og/*.svg` og refereres aldri av meta. PNG-konvertering skjer i raster-bygget
(sharp, ad hoc), aldri i CI-bygget (no-npm; pages.yml trenger aldri sharp).
Ren-Node-PNG-writer ble vurdert og droppet — sharp finnes og er allerede husets raster-verktøy.

## Deploy-status

- Push til main trigger build.yml (bygg-gate).
- pages.yml er **workflow_dispatch** — deploy dispatches separat med `gh workflow run pages` (gh 2.86.0 autentisert som maneitai, workflow-scope).
- Kris visuelle sjekk av de 8 nye mørke kortene gjenstår (2 ruter deler bilde: home/play-no; dermed 8 unike — i2-8).
