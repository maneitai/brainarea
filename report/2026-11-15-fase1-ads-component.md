# FASE 1 — Annonse-komponent, 5 ekte formater, merket mock (todo #3720)

Status: bygget og selgtestet. Plassering i sider er EGET steg (#3722) — dette steget leverer kun komponent + data og rorer ikke ut-bygget.

## Levert

- `app/ads.js` — annonseslot-komponent ([BYGG] FASE 1, todo #3720):
  - `AD_FORMATS` — de 5 formatene fra preplanens beslutning 11 som rene,
    verifiserbare data: medium_rectangle 300x250, large_rectangle 336x280,
    leaderboard 728x90, mobile_banner 320x50, in_feed (fluid bredde,
    banded hoyde 130px). #3721 kan male koden mot denne tabellen direkte.
  - `adFormat(id)` — oppslag som kaster paa ukjent format (routing-konvensjonen:
    indeks-moduler kaster, i18n kaster aldri).
  - `renderAd({ format, slot, t })` — ren, deterministisk funksjon: samme
    argumenter gir bytevis identisk markup. Ingen klokke, ingen tilfeldighet.
  - Mock-kontrakt: `aria-label` + eksplisitt mock-merke (badge + `data-ba-mock="1"`).
  - Plasserings-kontrakt for #3722: `slot` er rensa slug (1-40 tegn, [a-z0-9-]),
    emitert som `data-ba-slot`; slot i seg selv endrer bare det attributtet.
  - Aktiveringsvakt: renderAd produserer ren statisk markup — ingen <script>,
    <iframe>, <img>, ingen ekstern URL, ingen klikk-through. Ingen tredjedels-
    forespoersel kan oppstaa foer reell AdSense-aktivering (ettersteget etter
    #3722); beslutning 11 krever merket mock fra dag een.
- `i18n/en.js` + `i18n/no.js` — 8 nye `page.ad.*`-noekler per spraak, paritet
  NO/EN (ad.label, ad.mockBadge, ad.disclaimer, ad.mock.<5 formater>).
  Mock-boxes tekster baerer dimensjonene (f.eks. "Mock-annonse 300x250").
- `tests/ads/_ads_selftest.mjs` — 42/42 PASS:
  - A: 5 formater, dimensjoner noeyaktig mot beslutning 11 (en avvikende
    bredde/hoyde = feil — samme maal-logikk #3721 bruker), fluid-flagg,
    ukjent format kaster.
  - B: determinisme, mock-merking (aria, data-flagg, badge), slot-emit,
    ingen ekstern ressurs, in-feed fluider, slot-diff er ren.
  - C: ad-noeklene i EN+NO med paritet, resolver gjennom getT (NO-tekst != EN-tekst),
    manglende t-funksjon kaster.
  - D: slot-grammatikk (gyldige plasseringsnoekler godtas; tom/ugyldig/for-lang kaster).
- `tests/ads/_ads_selftest_report.json` — maskinlesbar rapport (suite, todo,
  pass/fail, formatliste).

## Bevisst valg for dette steget

- Ad-komponenten er IKKE plukket opp av app/build.js ennaa — ingen side i
  out/ inneholder ad-markup (skannet: alle 15 HTML rene). Plassering
  (landingsider + ved/under resultat, aldri i testflyt, aldri mellom siste
  spoarsmaal og resultat) er hele #3722, og #3723 verifiserer den uavhengig.
- Tekstkontrakten holdes fra dag een: alle synlige strenger resolver gjennom
  i18n-katalogen (page.ad.*), slik at V3-tekstkilde-inventaret i
  app/_verify_hreflang.mjs fortsetter aa holde naar plasseringen lander.
- in_feed faar fluid bredde og banded hoyde (130px) i mocken — ekte in-feed
  annonser skalerer med feeden; den eksakte rendrede hoyden bestemmes av
  #3722s CSS, ikke av formatdataene (fluid != fast maal).

## Regresjon (uroert)

- i18n-selftest 22/22 (S1-orden ui,note,aria,page uendret — ad er en noekkel-
  gruppe i det eksisterende page-ns, ikke et nytt namespace).
- Bygg bytevis reproduserbart (diff -r clean over to loep).
- app/_verify_hreflang.mjs: 171 PASS / 0 FAIL.
