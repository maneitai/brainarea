// [VERIFISER GLM] "Åpne lenken i ren nettleser uten lagret tilstand — lastes resultatet?"
// Metode: Playwright chromium (ekte Windows-binaert), FERSK brukerdata-katalog (ingen lagret
// tilstand), file://-URL med #d= --fragment bygget av _share_link.mjs, leser lokal tilstand.
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');

const TREE = 'F:/maneit/prosjekter/filip-webside-prosjekter/brainarea/tests/schema';
const CHROME = 'C:/Users/krist/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe';

(async () => {
  // 1) EKTE koding -- samme modul som FASE 3-bygget, ekte modell-vektorer
  const mod = await import('file://F:/maneit/prosjekter/filip-webside-prosjekter/brainarea/tests/schema/_share_link.mjs');
  const compat = await import('file://F:/maneit/prosjekter/filip-webside-prosjekter/brainarea/tests/schema/_rel_compat_model.mjs');
  const triage = await import('file://F:/maneit/prosjekter/filip-webside-prosjekter/brainarea/tests/schema/_nd_triage_model.mjs');

  // Ekte compat-kjede: vektorer -> modell -> skar
  const a = { closeness: 60, openness: 70, conflict: 100, independence: 50 };
  const b = { closeness: 60, openness: 50, conflict: 100, independence: 60 };
  const c = compat.computePairCompatibility(a, b);
  console.log('compat:', JSON.stringify({ ok: c.ok, overall: c.overall, bandId: c.bandId }));

  const relRows = mod.rowsFromVectors('rel', [a, b]);
  const encRel = mod.encodeSharePayload({ type: 'rel', rows: relRows.rows });
  const dPath = TREE + '/demo/share-graf-demo-no.html';
  const uRel = mod.buildShareUrl(encRel.payload, { origin: 'file:///F:', path: dPath.slice(2).replaceAll('\\', '/') });
  console.log('rel-share ok:', encRel.ok, uRel.ok, 'url-len:', uRel.url.length);

  const ndVec = { adhd: 65, autism: 72 };
  const t = triage.computeTriageOutcome(ndVec);
  console.log('triage:', JSON.stringify({ outcode: t.outcode, ok: t.ok !== false }));
  const encNd = mod.encodeSharePayload({ type: 'nd', rows: mod.rowsFromVectors('nd', [ndVec]).rows });
  const uNd = mod.buildShareUrl(encNd.payload, { origin: 'file:///F:', path: TREE.slice(2).replaceAll('\\', '/') + '/demo/share-graf-demo-en.html' });
  console.log('nd-share ok:', encNd.ok, uNd.ok, 'url-len:', uNd.url.length);

  // 2) Node-side runde-kontroll
  const dec = mod.decodeSharePayload(encRel.payload);
  console.log('node decode round:', dec.ok, JSON.stringify(dec.rows));

  // 3) FERSK nettleser-profil: tom user-data-dir = ingen cookies/cache/localStorage
  const profileDir = 'C:/Users/krist/AppData/Local/Temp/glm-fresh-profile-' + Date.now();
  fs.mkdirSync(profileDir, { recursive: true });

  const ctx = await chromium.launchPersistentContext(profileDir, {
    headless: true,
    executablePath: CHROME,
    viewport: { width: 1280, height: 900 },
    args: ['--no-first-run', '--no-default-browser-check', '--disable-extensions']
  });

  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + String(e.message).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + String(m.text()).slice(0, 200)); });

  const out = [];
  for (const [name, url, file] of [
    ['rel -> demo/share-graf-demo-no.html', uRel.url, dPath],
    ['nd  -> demo/share-graf-demo-en.html', uNd.url, TREE + '/demo/share-graf-demo-en.html']
  ]) {
    const resp = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(400);
    const state = await page.evaluate(() => ({
      hash: window.location.hash.slice(0, 60),
      hashIsShare: window.location.hash.startsWith('#d='),
      title: document.title,
      bodyLen: document.body.innerText.length,
      headings: Array.from(document.querySelectorAll('h1,h2,figure figcaption,p')).slice(0, 4).map(e => (e.textContent || '').trim().slice(0, 60)),
      imgs: document.images.length,
      svgCount: document.querySelectorAll('svg').length,
      emptyBody: document.body.innerText.trim().length === 0
    }));
    out.push({ name, httpishStatus: resp ? resp.status() : null, ...state });
  }

  // Kontroll: aapne SIDEN UTEN fragment -- skal vise demo-badge, og for en rent
  // statisk demo fil (ingen leser-logikk) inneholde samme innhold.
  await page.goto('file:///F:/maneit/prosjekter/filip-webside-prosjekter/brainarea/tests/schema/demo/share-graf-demo-no.html', { waitUntil: 'load' });
  const noFrag = await page.evaluate(() => ({ bodyLen: document.body.innerText.length, empty: document.body.innerText.trim().length === 0 }));
  console.log('no-fragment control:', JSON.stringify(noFrag));

  await ctx.close();
  // rydd fersk profil
  try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch {}

  const verdict = {
    browser: 'chromium-1248 (ekte Windows-bin\xc3\xa6rt), fersk profil',
    freshProfile: true,
    results: out,
    noFragmentControl: noFrag,
    errors,
    urls: [uRel.url.slice(0, 90), uNd.url.slice(0, 90)]
  };
  fs.writeFileSync(TREE + '/_fase3_share_browserload_verdict.json', JSON.stringify(verdict, null, 1));
  console.log('WRITTEN verdict file');
  console.log(JSON.stringify(verdict, null, 1));
})().catch(e => { console.error('FAIL', e); process.exit(1); });
