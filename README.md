# Brainarea

Gratis tester av personlighet, evner og relasjoner — bygget som en rask,
mobil-først statisk side. Scoring skjer i nettleseren; ingen backend, ingen
konto, ingen sporing av testsvarene.

## Produktlinjer (v1)

- **PERSONA** — personlighetstest (IPIP Big-Five, 50 utsagn, norsk)
- **IQ-/evnetest** — kognitiv profil med estimatbånd, ikke normert IQ
- **Relasjoner** — kompatibilitet og samspill
- **Play** — korte delbare tester

## Teknisk

- Next.js 16 med statisk eksport (`next.config.ts` → `output: "export"`)
- Tailwind CSS 4
- Data-drevet testmotor: tester er spec-filer (`data/`), ikke kode per test
- Målhosting: Cloudflare Pages (statisk output fra `out/`)

## Metodikk (ærlighet)

- Instrument: Goldberg (1992), IPIP Big-Five Factor Markers — public domain
- Scoring: positive items 1–5, reverserte items 5–1, snitt per dimensjon
- Ingen norske normer; resultatene er ikke persentiler mot befolkningen
- Norsk arbeidsoversettelse er ikke psykometrisk validert

## Utvikling

```bash
npm install
npm run dev    # lokal utvikling
npm run build  # statisk build → out/
```