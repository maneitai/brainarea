# Brainarea FASE 1 — annonse-plassering (#3722)

Dato: 2026-11-15. Todo #3722 — «[BYGG] FASE 1: Plasser annonser — landingsider + ved/under resultat».

## Hva er levert

Mock-annonse-plassering i det deterministiske SSG-bygget. `app/ads.js` (beslutning-11-komponenten,
todo #3720) er nå importert av `app/build.js` og rendres på de pålagte plasseringene.
Status: **FASE 1 = landingsider** (home/play/about). **"Ved/under resultat" på
test-rutene (evne-result-after / result-under) leveres som todo #3723** — plasseringsvakten
nekter allerede test-ruter, så resultat-etterspørselen er strukturert, ikke glemt.

## Plasseringskart (2 enheter per rute, per locale — 12 enheter totalt)

| Rute | in_feed (mellom seksjoner) | leaderboard (nederst) |
|---|---|---|
| home | `home-after-cards` (mellom kortene og metode/disclaimer) | `home-bottom` |
| play | `play-intro-after` (etter intro, før tile-cards) | `play-bottom` |
| about | `about-intro-after` (etter intro) | `about-bottom` |

Privacy: ingen annonser. Test-rutene (persona/evne/rel): ingen annonser og hard nektelse i
`adSlots()` (kaster — beslutning 11-vakt: testflyten er alltid annonsesfri).

## Beslutning 11-etterlevelse

- Plassert på LANDINGSIDENE ✓ (home/play/about — utsalgsflatene, ikke testflyten)
- Aldri i testflyten ✓ (adSlots() kaster hardt på persona/evne/rel; F/E-sjekker i verifikator)
- Aldri mellom siste spørsmål og resultat ✓ (statiske sider kun; kjøresjiktet rører ikke ads)
- Aldri over folden som første element ✓ (in-feed etter kort/intro; F4-sjekk måler avstand fra <main>)
- Ingen popup/interstitial/sticky ✓ (statisk flyt-markup; F6-sjekk Banner sticky/fixed CSS)
- Eksplisitt mock-merking ✓ (aria-label + badge + data-ba-mock="1" + disclaimer på alle 12)
- Ingen script/iframe/img/ekstern URL ✓ (aktivering = eget senere steg; AdSense-script hører ikke hjemme her)

## Endrede filer

- `app/pages-data.js` — AD_PLACEMENTS-kart + `adSlots(route)`-eksport (vakt mot test-ruter),
  ad-slots spredd inn i de tre landingslayoutene.
- `app/build.js` — import av `adSlots` + `renderAd`; `'ad'`-gren i `renderSlots` (én linje,
  kaller renderAd med format/slot/t — feiler hardt ved ukjent format/slot).
- `app/site.css` — `.ba-ad*`-blokk (11 rader): statisk flyt-plassering, boks-klopping
  (max-width:100%) som holder 728px-leaderboard inne i max-w-2xl-kolonnen; ingen sticky/fixed.
- `tests/ads/_verify_dimensions_deepseek.mjs` — E-scope ombygget (den dokumenterte overgangen:
  «placement CSS arrives with #3722»), pluss ny F-gruppe (42 permanente plasserings-sjekker:
  order, format-par, mock-merking, over-folden-vakt, footer-posisjon, eksterne ressurser,
  sticky/fixed-vakt — per side per locale).

## Verifisering

- `tests/ads/_verify_dimensions_deepseek.mjs`: **67/67 PASS** (36 eksisterende + E-ombygging 3
  + F-gruppe 28). Rapport-JSON og run.log oppdatert.
- `tests/ads/_ads_selftest.mjs`: 42/42 PASS (uroert).
- Regresjon: i18n 22/22, engine 72/72, verify-hreflang 171 PASS / 0 FAIL,
  resume/repeat/glm-three-resumes/handcalc = alle exit 0.
- Bygg: bytevis reproduserbart (md5 sammenlignet over to bygg, med og uten verifikator-runs imellom).
- out-tre: 12/14 sider rene; 6 landingsider med nøyaktig [in_feed, leaderboard] i riktig orden.

## Bevisst ikke gjort

- `ads.txt` (roten av filip-webside-prosjekter, tom) — ikke flyttet, ikke referert i kode eller
  bygget. Adsense-utgiver-ID finnes ikke ennå; aktivering er separert fra plassering.
- Script-basert vekslende in-feed-høyde (130px-båndet er der), dynamisk formathåndtering i
  out-treet — mock-kontrakten fikser dimensjonene; FASE 1 holder det statisk.
- Resultat-plassering (evne-result-after / result-under, 336×280 + 320×50) = todo #3723.
