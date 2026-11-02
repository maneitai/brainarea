# Brainarea

Free tests of personality, abilities and relationships. Next.js 16 + Tailwind 4,
fully static export (`out/`). No backend — all scoring runs in the browser,
answers are never sent anywhere.

## Commands

```bash
npm ci            # install
npm run build     # static export to out/
npm test          # engine invariants (node --experimental-strip-types)
node scripts/push.mjs "<message>"        # gates (npm test + build) -> commit -> push -> wait for CI green
node scripts/push.mjs "<message>" --publish  # same, plus dispatches the manual pages workflow
```

## Local preview of the exported site

Static export needs an HTTP server (not file://):

```bash
npx serve out
```

## Publishing to GitHub Pages (manual, at launch time)

The site publishes from `main` via the manually triggered **pages** workflow:

1. GitHub repo → **Settings → Pages → Source: GitHub Actions**.
2. **Actions → pages → Run workflow** → branch `main` → **Run**.
3. The workflow builds with `NEXT_PUBLIC_BASE_PATH=/brainarea` and deploys
   `out/` to `https://maneitai.github.io/brainarea/`.

No keys or tokens are needed — the build is fully local.

## Hosting note

GitHub Pages terms disallow running a general "online business" from Pages.
A fully static site with no backend and no data collection fits project use
now, but before commercial operation, advertising (AdSense) or user accounts,
move to a proper host (e.g. Cloudflare Pages). Recorded decision: GitHub
Pages is the launch channel for now; re-evaluate in the phase before ads.

## Adding a new test

1. Create `data/<name>.ts` with a `TestSpec` (items + dimensions).
2. Create `app/<name>/page.tsx` rendering `TestRun` with the spec.
3. `npm test` verifies engine invariants; `npm run build` verifies the route.