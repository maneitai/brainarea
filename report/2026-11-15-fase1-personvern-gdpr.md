# FASE 1 — Personverntekst + GDPR-samtykkelinje (#3726)

**Dato:** 2026-11-15
**Status:** Bygget og selverifisert. Én åpen post: behandlingsansvarlig juridisk enhet er ikke fastsatt noe sted i repoet eller i docs — eksplisitt placeholder i teksten, ikke fabrikkert (se «Åpne punkter»).

## Kildegrunnlag (verifisert mot koden, ikke antatt)

- `functions/normering.js` (#3724) aksepterer KUN: `language` ('no'|'en'), `testId` (mønster), `answers` (rekkefølgetro liste, tall|bool|null), `durationSec` (0..86400), `demographics` (valgfri: ageBand 7 bånd, gender 4 kategorier). Ingen andre felt (beslutning 9-anonymitet).
- `grep -rn "fetch(" app tests/engine i18n` = **0 treff**: klienten sender ingenting i dag. Endpointet validerer, men NORMERING_KV-binding (persistens) er FASE 4-livssyklus.
- Eksisterende personvernerklæring sier «vi mottar ikke svarene» — fortsatt sant i FASE 1. Den nye teksten varsler derfor den PLANLAGTE innsamlingen før noe aktiveres, i stedet for å late som innsamling skjer nå.

## Endringer

**`i18n/en.js` (EN base) + `i18n/no.js` (NO overlay) — 9 nye `page.privacy.*`-nøkler hver, full EN/NO-paritet:**

| Nøkkel | Innhold |
|---|---|
| `privacy.h.updates` / `.p.updates` | Planlagte endringer varsles her først; eksakt feltliste fra endpointet; ingen identifikasjon |
| `privacy.h.retention` / `.p.retention` | Lagringstid: innsamling lagres maks 24 måneder, deretter aut. sletting av rådata (anonyme sammendrag beholdes); i dag ingen innsamling |
| `privacy.h.rights` / `.p.rights` | GDPR-rettighetene (innsyn/retting/sletting/begrensning/portabilitet/innsigelse + klage); ærlig grense: ingen lagring → ingen data å utøve mot ennå |
| `privacy.h.responsible` / `.p.responsible` | Behandlingsansvarlig — **placeholder `[BEHANDLINGSANSVARLIG — JURIDISK ENHET IKKE FASTSATT]`** (EN-ekvivalent), kontakt e-post fortsatt manieten@pm.me |
| `privacy.consentLine` | Samtykkelinjen: eksakt feltliste, «uten navn, e-post, cookier eller annen identifikasjon», frivillighet, testene kan tas uten samtykke |
| `privacy.h.consent` | Overskrift for samtykkeseksjonen, merket «planlagt» |

**`app/pages-data.js` — privacy-ruta (+5 linjer):**
- Nye seksjonsnoder: updates, retention, rights, responsible (etter eksisterende owner-blokk).
- Consent-boks: `section` med samtykkelinjen som uthevet brødtekst — samtykkelinjen er TEKST PÅ SIDEN (kontrollert utplassering), ikke en innlastingsmekanisme; selve samtykke-UI-et (avkrysningsboks knyttet til normerings-POST) er FASE 4-livssyklus sammen med bindingen.

## Verifikasjon (kjørt)

- `node app/build.js` — 14 sider, OK.
- `node tests/i18n/_i18n_selftest.mjs` — **22/22 PASS** (EN/NO-paritet, placeholder-orden, ingen tomme/HTML).
- `node app/_verify_hreflang.mjs` — **171 PASS / 0 FAIL**: V3-tekstinventaret fanger alle nye synlige strenger (de går gjennom i18n-katalogen) — beviser at ingen fritekst slipp gjennom.
- Motor-regresjon uroet: engine 72/72, scoring 27/27 + g 27/27, attention 57/57, resume 27/27, repeat 25/25, integrasjon 5/5, handcalc 27/27, glm3 46/46, normering-selftest 107/107, ads 42/42.
- Bygd HTML spot-sjekket: samtykkeseksjon + placeholder med i out/personvern/ og out/en/privacy/.
- CRLF bevart i `app/pages-data.js`; i18n-filer forble LF. Git-diff kun +36 linjer, ingen rewrite.

## Bevisste valg

- **Varsel-i-fortid**: FASE 1 har ingen sending, men teksten beskriver den planlagte (ikke aktive) innsamlingen — preplanens GDPR-krav (formål/lagringstid/rettigheter/ansvarlig) innfris før en eneste byte sendes, ikke etter.
- **Lagringstid = maks 24 måneder** for den planlagte innsamlingen: konkret premiss er ikke satt noe sted i repoet/docs; tallet er et arbeidspremiss i teksten (anonyme sammendrag beholdes).
- **Placeholder framfor fabrikasjon**: dokumentert som åpent punkt nedenfor.

## Åpne punkter (rapporteres videre)

1. **Behandlingsansvarlig (juridisk enhet) er udefinert** i repoet og i docs («Brainarea — fullverdig bygge- og lanseringsplan» omtaler ikke juridisk enhet). Teksten har eksplisitt placeholder. Beslutning trengs: enhetsnavn/organisasjonsform.
2. Samtykke-UI (avkrysningsboks → normerings-POST) implementeres i FASE 4-livssyklusen sammen med NORMERING_KV — linjen er på plass, koblingen mangler med vilje.
3. 24-måneders lagringstid er arbeidspremiss; kan justeres når innsamlingen faktisk aktiveres.
