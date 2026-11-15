# FASE 1 — samlet faseverifikasjon (todo #3812)

Dato: 2026-11-15. Utført som ett verify-steg: hele FASE 1 lest og kjørt i én økt,
per-steg-verifikatorene (3701/3703/3705/3707/3709/3711/3713/3715/3717/3719/3721
samt de reduserte 3723/3725/3727/3729/3731) foldet inn hit.

## Metode

- Alle 12 selftest/verify-harnesses kjørt fresh i prod-treet (HEAD ca4f9e7 før rapporten).
- Full sidebygg (app/build.js) verifisert 14 sider + robots + sitemap + 404.
- Hvert brettsteg 3700–3730 sporadmet mot stegetekst, preplanen (DOC-373E4AFEEB)
  og operator-beslutningene som er sitert i stegetekstene (beslutning 7/8, 9, 11).

## Resultater per område

| Område | Sjekk | Resultat |
|---|---|---|
| Motor/selftest (render+randomisering+lagring) | 72/72 | PASS |
| i18n-grammatikk EN=base/NO=overlay | 22/22 | PASS |
| Annonsekomponent (formater/mMarkup/determinisme/grammatikk) | 42/42 | PASS |
| Normerings-endpoint (anonymitet/validator/POST-OPTIONS/CORS/KV/bygg/kontrakt) | 107/107 | PASS |
| Scoring-ferdigsett del 1 + del 2 (g/matrix) | 27/27 + 27/27 | PASS |
| Scoring-integrasjon | 5/5 | PASS |
| Attention-check | 57/57 | PASS |
| Resume-verifier | 27/27 | PASS |
| Repeat-verifier (ulikt trekk, identisk skår) | 25/25 | PASS |
| Tre-resumes (avbrudt ×3) | 46/46 | PASS |
| Håndregn-scoring (manuel sammenligning) | 27/0 | PASS |
| Annonse-dimensjoner (beslutning 11) | 67/67 (verdict pass) | PASS |
| Rapport-render + standardramme S11 | 74/0 | PASS |
| hreflang/locale-inventar | 171/0 | PASS |
| Beslutning 9-anonymitet i normering.js | egne greps | PASS (ingen identifikatorfelt; betinget KV-lagring; ærlig stored:false) |
| Beslutning 7/8 i employer-rammen | egne greps | PASS («grunnlag for samtale» ×4; iqScale aldri rørt) |
| Beslutning 11-plassering | egne greps | PASS (2 slots på landing/om-testene/play ×begge språk; 0 i testruter/personvern) |
| i18n privacy+ad-nøkelparitet | node-sjekk | PASS (38/38, ingen differanse) |

## Samlet avviksliste

### AV-1 (avvik, mindre, brukersynlig): ø→Å-tekstkorrupsjon fra #3720
`i18n/no.js` linje 187 (kommentar: «spÅrsmål») og linje 191 (brukersynlig:
`'ad.disclaimer': '... annonser fÅr Google AdSense ...'` — skal være «før»).
Rendret ut på 3 landingssider per språk: `/`, `/om-testene/`, `/play/` (NO).
Innkomm i commit 350fb3f. Ingen selftest fanger tekstkvalitet, derfor usynlig
for 780 grønne sjekker. Foreslått fiks: «spørsmål»/«før» + rebuild. IKKE fikset
her — verifiseringssteget bygger ikke; fiks må gå som mikro-[BYGG] eller med
neste FASE 2-byggblokk.

### Å-1 (åpen, dokumentert, venter operatør)
Behandlingsansvarlig er udefinert: placeholder [BEHANDLINGSANSVARLIG — JURIDISK
ENHET IKKE FASTSATT] (EN: [DATA CONTROLLER — LEGAL ENTITY NOT YET DEFINED]) i
personvernteksten (#3726). Krever operator-beslutning om juridisk enhet før
publisering. Korrekt håndtert som eksplisitt placeholder — ikke fabrikkert.

### GAP-1 (ærlig gap per brettsteg, ikke avvik)
Normerings-endpointet er verified mot mock-KV (107 checks) men aldri live:
github.io bygger ikke Functions. Live-verifisering hører til FASE 4-livssyklusen
sammen med binding og samtykke-UI.

### UV-1 (ikke målt — usikkerhetsmarkering, ikke avvik)
WCAG 2.1 AA på rendert komponentoutput (kontrast ≥ 4,5:1, touchmål ≥ 44 px,
layout fra 380 px) er preplanens FASE-1-verifikad, men er målt verken i fasens
rapporter eller i denne økta (site.css er kompilert Tailwind). Anbefales målt
i QA-fasen før publisering.

## Konklusjon

FASE 1 er fullverdig bærende: 12/12 selftest-suiter grønne (780 checks), bygg
14 sider reproduserbart, begge språk fra samme kilde (ingen duplisert kode),
annonser/hreflang/normering/personvern/rapport samsvarer med brettstegene.
Ett reelt avvik (AV-1, to strenger), én åpen operator-beslutning (Å-1),
ett dokumentert gap (GAP-1), én umålt markering (UV-1). Ingen funksjonelle
defekter funnet.
