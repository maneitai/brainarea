# FASE 3 [BYGG] SVG/canvas-delgraf (todo #3790) — leveranserapport

Dato: 2026-11-16. Run TR-8E75DEFB6C3B. Søsterverifisering: #3791 [VERIFISER GLM]
 («lesbar i feed-størrelse») står bevisst åpent og eier skala-lesing av bildet.

## Kontrakt (hva komponenten er)

Delgraf-komponenten leser compatibilityModel-output: `_rel_compat_model.mjs`
 computePairCompatibility() -> { ok, perDimension, overall (0–100, 1 des), bandId }.
 Én felles layout (`shareGraphLayout`), to tegneflater:

- **renderShareGraphSvg** — deterministisk SVG 600×426; kaster på konfigfeil
  (renderer-konvensjon), `null` ved ok:false-compat.
- **drawShareGraphCanvas** — kaster ALDRI; tegner mot et
  CanvasRenderingContext2D-lignende objekt og returnerer `{ ok, ops }` med en
  deterministisk kall-liste (testebar i Node uten DOM).

Eierskap: band-navn og brukertekster eies av #3784 (labels.bands er config).
Etikett-fallback = id verbatim, aldri oppfunne navn (renderer.mjs:120-121-mønster).
`shareGraphStrings()` leverer alle synlige strenger i tegnerorden — ban-scan-sink
fra dag én (renderer-sink-hullet med SVG-etiketter gjentas ikke her).

## Bevis (kjørt i økten)

- **E-harness** tests/schema/_rel_share_graph_selftest.mjs — **46/46 PASS**
  (stdout-md5 identisk over 2 kjøringer):
  - G1 ekte compat-modul (data-URL-import, itemspec-S9-metoden): identiske
    profiler -> 100/band-strong; håndregnet par (C50/O80/K50/I50 vs
    C90/O40/K30/I70) -> per-dim 0.6/0.6/1/1 -> 80.0 band-aligned.
  - G2 SVG: byte-determinisme (md5), well-formed tag-par, viewBox = 600×426,
    minste font ≥ 12, midtpunkt-dash til stede og aldri kombinert med %-tekst.
  - G3 Canvas: kast-aldri (null-ctx, ok:false-compat -> `{ ok:false, error }`),
    ops deterministiske, geometry matcher layout (label-y proven), ingen
    '[object Object]'.
  - G4 etiketter: labels til stede -> FASE 1-vokabularet byte-eksakt; labels
    borte -> id verbatim; band-fallback = bandId bare; en/no desimal.
  - G5 strings-sink: XML-tekstnoder ⊆ sink (0 utenfor).
  - G6 identifikatorfrihet: navn kun der person-teksen ligger; ukjente
    vektor-nøkler ignoreres; e-post former når aldri rendret.
  - G7 markørm-disiplin: ingen rad-markører uten vektorer; ugyldige verdier ->
    ingen markør (mild) / ok:false (strictVectors); x = xAt-formelen proven.
  - G8 forbudsvokabular (diagnos/iq/intelligens/mensa/klinisk/…) = 0 treff over
    alle rendstrenger ved band-endepunktene (0/100-motpar + blandet par).
  - G9 fmtOverall: no-komma/en-punkt, 1 desimal, utover kontrakt kaster.
- **Demo** tests/schema/demo/share-graf-demo-{no,en}.html — fixture-markert,
  byte-deterministisk regenerering (md5-stabil over kjøringer).
- **Regresjon**: 13/13 suiter grønne (report 74, engine 72, integrasjon 5,
  attention, ipip, rel-itemspec, rel 88+214, nd 226+326, gscore 54, estimat,
  sharegraph 46). SSG 14 pages byte-identisk (0 diff). Prod-tre uroet, hele
  steget additivt (4 nye filer, 0 muterte).

## Ikke-diagnostisk og identifikatorfrit

Input er kun skår-vektorer + tekster (G6-proven). Band-ordre arver
modellens `why.noDangerousMorphism`: grafen klassifiserer aldri relasjoner som
usunne — demo-band-navn er forholds-vokabular (Stort/Godt/Blandet/Ulike
mønstre). texts.pointLine-kontrakten krever midtpunkt-tekst med
«ikke et gjennomsnitt»-ordlyd og demoens nonValidated-nyanses.

## Pins

1. **Demo-band-navn** er demo-vokabular; #3784 eier de renderte band-tekstene.
2. **Feed-lesbarhet-prove** (screenshot-skala, mørkt tema) eies av #3791 —
   komponenten leverer de målbare garantiene (600×426 viewBox, ≥12px fonts).
3. **#3794** eier identifikatorfri koding av profilvektorene (delgrafen tar
   bare dekodede vektorer; kobles i FASE 4 par-flyten).
4. **Renderer strings-sink-hullet** (SVG-etiketter aldri i strings.list)
   står fortsatt som pin fra #3786 — delgraf har egen sink; renderer-fiks
   hører til neste renderer-bygg.

---

## VERIFISER — feed-lesbarhet (#3791-søster, kjørt 2026-11-16, leaf i TR-DA925E33DDCE)

«Lesbar i feed-størrelse, ikke bare på desktop» — beslutning 16 / PIN-2 fra
bygg-verdiktet. Metode: EKTE modulkjede (computePairCompatibility 80.0 /
band-aligned -> renderShareGraphSvg) rasterisert med cairosvg i 320/400/480/600
px (no) + 320 px (en), proporsjonal viewBox-skaleringsprobe, deretter
bilde-lesing av alle fem PNG-verds. Selftest re-proven 46/46.

| Skala | Dom |
|---|---|
| 600 px (desktop) | PASS — full lesbarhet, alle tekster |
| 480 px | PASS |
| 400 px (mobil feed) | PASS — alt data-innhold lesbar @1x; pointLine marginal @1x, klar på retina |
| 320 px (embed-small, no+en) | PASS med grense — primær-innhold (tittel/samspill/band/rader/verdier/markører/legend) lesbar; minste tekster (12–13px layout) på grense @1x |

Verdict: `tests/schema/_rel_share_graph_feedverify_verdict.json` — konklusjon:
beslutning-16-feed-sporet VERIFISERT, komponenten krever ingen kodeendring.
Rasters + SVG md5-er + metode dokumentert i verdiktet (regenererbare).
Grense-observasjon F-feed-grense: ved 320 @1x er minste tekster i grenseland;
SPAK-1 (droppe contextLine/pointLine fra feed-variant) og SPAK-2
(SHARE_MIN_FONT 12->14) står som mulige handlingsrom eid av #3790, ikke utført.
Canvas-banen ikke rasterisert her (ingen canvas-runtime i Node) — geometrisk
derivt fra samme layout (G3f-proven). Verifiserings-leafen er additiv: 1
verdikt-JSON + denne rapport-appenden, 0 kode-filer mutert.
