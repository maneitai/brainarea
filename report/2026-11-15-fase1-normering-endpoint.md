# FASE 1 — Normerings-endpoint (#3724)

**Dato:** 2026-11-15
**Status:** KODE bygget og selftestet. LIVSSYKLUS (KV-binding + Pages Functions-utrulling) er FASE 4 / UTSATT — github.io kjører ikke Functions i dag, og stegeteksten sier eksplisitt «Kode bygges, testes ikke i dag».

## Hva ble bygget

**functions/normering.js** — rensket ES-modul (CommonJS-kompatibel via Node 22s require(esm)), null avhengigheter, Pages Functions-signaturnivå:

- `export async function onRequestPost({ request, env })` — POST-håndterer
- `export async function onRequestOptions({ request })` — CORS pre-flight
- `export function validatePostPayload(raw)` — ren validator, [feilkode | normalisert-post]-tuple
- eksporterte konstanter: `LANGUAGES, MAX_BYTES=8192, MAX_ITEMS=512, MAX_DURATION_SEC=86400, AGE_BANDS(7), GENDERS(4), DEMOGRAPHICS_KEYS, ORIGIN_ALLOWLIST`

## Post-kontrakt (anonym, POST application/json)

| Felt | Regel |
|---|---|
| `language` | `'no' \| 'en'` (FASE 1); ukjent → 400 |
| `testId` | `^[a-z0-9][a-z0-9-]{0,47}$` (forenklet schema-mønsteret) |
| `answers` | rekkefølgetro liste 1..512, elementer tall\|bool\|null (ubesvart); ikke-finite tall utilgjengelige via JSON og valideres som typefeil |
| `durationSec` | heltall 0..86400 |
| `demographics` | valgfri; `{ageBand?: 7bånd, gender?: 4kategorier}`; ukjent nøkkel/verdi → 400; tomt objekt → 400; fraværende/null → null |

Alle feil: 400 + `{ok:false, error:<kode>, message}`; for stor kropp 413; feil Content-Type 400 `content-type`; ukjent metode 405 med Allow (rute-omfang, FASE 4-livssyklus).

## Anonymitet (beslutning 9)

Ingen identifikator aksepteres eller lagres: ingen e-post, cookie, session, IP, user-agent, fingerprint-felter. Server-side validator **forkaster** slike felt implisitt (skjemaet tillater bare de fem feltene). Lagringsnøkkel `norm/<testId>/<ts36>-<rand36>` bærer bare testId + NÅR + tilfeldighet — aldri HVEM. Selftest gruppe A: 24 banned-term søk i kode+strenger (kommentarer strippet) — alle fraværende.

## Lagring — betinget og ærlig

- **I dag (github.io):** `env.NORMERING_KV` finnes ikke → payload valideres fullt ut, svar 200 `{ok:true, stored:false, received:{bytes, items, language, testId}, note}` — ærlig non-storage-svar, aldri et stored:true-lokkehåndslag.
- **FASE 4 (binding på plass):** hver rad lagres under `norm/<testId>/…`, v1-kontrakt `{v, language, answers, durationSec, demographics, at}`. KV-feil → 500 `storage-failed` (ingen falsk suksess).

## CORS

Pre-flight 204 med `Access-Control-Allow-Origin` **kun** for `https://maneitai.github.io` og localhost/127.0.0.1 (utvikling) — echo av tillatt origin, aldri `*`. Stranger og origin-løse henvendelser: 204 uten ACAO. POST-svar setter aldri ACAO (bare pre-flight gjør det).

## Verifikasjon

**tests/functions/_normering_selftest.mjs — 107/107 PASS** (rapport: `_normering_selftest_report.json`):

- A Anonymitet: 24/24 banned-term fraværende i kode+strenger
- B Validator: 55/55 — gode tilfeller (normalisering, ISO-tidsstempel, demographics-variantene) + én per feilkode
- C POST/OPTIONS: 24/24 — ærlig stored:false i dag; stored:true + `norm/…`-nøkkel + v1-lagringskontrakt + ingen identitetsfelt i mock-KV; 500 ved KV-feil; 400/413-mapping; CORS-tabellen
- D Regresjon: 11/11 selftests uroert (engine 72, scoring-g 27, integrasjon 5, attention 57, resume 27, repeat 25, glm3 46, handcalc 27, i18n 22, ads 42, hreflang 171)
- E Bygg: bitvis identisk før/etter (78f8dd38d3dcccac), hash på relative ut-stier
- F Kontrakt: functions/normering.js på plass, .gitkeep urørt, schema-languages forblir åpne (FASE-1-innsnevringen ligger i endpoint-kontrakten, ikke i schemaet)

## Bevisste valg

- **Schema-temperaturområde: `test-definition.schema.json` er UROERT** — normerings-endpointen definerer sin egen POST-grammatikk (5 felt). Løsning (ikke duplikat): POST er transportkontrakten, schemaet er definisjonsformatet; to kontrakter, to filer.
- **KV-nøkkelen bærer tidsstempel** — NÅR er nødvendig for senere normering/norm-beregning (temporal kohorte), HVEM finnes ikke i datamodellen.
- **`received.bytes` i non-storage-svaret** er payload-størrelse, ikke identitet.
- **Hvitelistene (ageBand/gender-kategorier) er dokumenterte forhåndsvalg** — utvides i FASE 2 når itemspec-blokken fester sine kategorier; ukjent verdi er hard 400 (datakvalitet fremfor fri tekst).
- **Lagringsnøkkelens tilfeldige del er Math.random** — kollisjonsutelukking, ingen identitet; holder modulen importbar i rene testmiljøer (ingen node:crypto-avhengighet).

## Ikke rørt

app/*, i18n/*, tests/engine/*, tests/schema/*, tests/ads/*, tests/i18n/*, .github/*, ads.txt (tom, utenfor repot), functions/.gitkeep. Ut-tre: uroert (bytterelevant hash bevist like).
