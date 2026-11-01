# Brainarea

Gratis tester av personlighet, evner og relasjoner — bygget som en rask,
mobil-først statisk side. Scoring skjer i nettleseren; ingen backend, ingen
konto, ingen sporing av testsvarene dine.

## Produktlinjer (v1)

- **PERSONA** — personlighetstest (Big Five, 60 utsagn)
- **IQ-/evnetest** — kognitiv profil med estimatbånd, ikke normert IQ
- **Relasjoner** — kompatibilitet og samspill
- **Play** — korte delbare tester

## Teknisk

- Next.js 16 med statisk eksport (`next.config.ts` → `output: "export"`)
- Tailwind CSS 4
- Målhosting: Cloudflare Pages (statisk output fra `out/`)

## Utvikling

```bash
npm install
npm run dev    # lokal utvikling
npm run build  # statisk build → out/
```
