#!/usr/bin/env node
/**
 * Brainarea SSG — static build ([BYGG] FASE 1, todo #3718).
 *
 * Bygger 14 sider (7 ruter x 2 locale) + robots.txt + sitemap.xml + 404-redirect.
 * Deterministisk: ingen klokke i output. Kontrakter:
 * - locale.js: ROUTES / BASE / localizedPath / langSwitchHref / canonicalUrl
 * - pages-data.js: RUTE_LISTE / layout / homeCards / langSwitcher
 * - i18n/index.js: getT — alle synlige strenger resolver gjennom katalogen.
 *
 * Kjoer: node app/build.js [--out <dir>]
 */
import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getT } from '../i18n/index.js';
import { BASE, canonicalUrl, langSwitchHref, pathToLocale, localizedPath } from './locale.js';
import { RUTE_LISTE, layout, homeCards, langSwitcher, adSlots } from './pages-data.js';
import { renderAd } from './ads.js';
import { ogCardForRoute, ogMetaLines } from './og.js';
import { writeCompositeDefs, selftestComposite } from './_composite_defs.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..');
const argIx = process.argv.indexOf('--out');
const OUT = argIx > 0 ? resolve(process.argv[argIx + 1]) : join(REPO, 'out');

const ORIGIN = 'https://maneitai.github.io';

const HREFLANG_ORDER = { 'nb-NO': 0, en: 1, 'x-default': 2 };

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Render en pages-data slot-liste til HTML. */
function renderSlots(slots, ctx) {
  const html = [];
  for (const slot of slots) {
    if (slot.kind === 'node') html.push(renderNode(slot, 4, ctx));
    else if (slot.kind === 'cards') html.push(renderCards(slot, ctx));
    else if (slot.kind === 'test-mount') html.push(renderTestMount(slot, ctx));
    else if (slot.kind === 'ad') html.push(renderAd({ format: slot.format, slot: slot.slot, t: ctx.t }));
    else throw new Error('build: ukjent slot-kind ' + slot.kind);
  }
  return html.join('\n');
}

/** Render ett node-slot. parts = inline-kjede i én tag. */
function renderNode(node, indent, ctx) {
  const pad = '        '.slice(0, indent);
  const open = `<${node.tag}${node.cls ? ` class="${node.cls}"` : ''}${node.style ? ` style="${node.style}"` : ''}${node.href ? ` href="${node.href}"` : ''}>`;
  if (node.children) {
    /* section-tekning: barn rendres recursivt med ett ekstra innrykknivaa */
    const inner = node.children.map((child) => renderNode(child, indent + 2, ctx)).join('\n');
    const pad2 = '        '.slice(0, indent + 1);
    return `${pad}${open}\n${inner}\n${pad2}</${node.tag}>`;
  }
  if (!node.parts) {
    return `${pad}${open}${node.text == null ? '' : esc(node.text)}</${node.tag}>`;
  }
  const inner = node.parts.map((p) => renderPart(p)).join('');
  return `${pad}${open}${inner}</${node.tag}>`;
}

function renderPart(p) {
  const tag = p.tag || 'span';
  const attrs = (p.cls ? ` class="${p.cls}"` : '') + (p.style ? ` style="${p.style}"` : '') + (p.href ? ` href="${esc(p.href)}"` : '');
  return `<${tag}${attrs}>${esc(p.text)}</${tag}>${p.tailText ? esc(p.tailText) : ''}`;
}

/** Hjem-kortene og play-tiles: cards-slot. */
function renderCards(slot, ctx) {
  const { t, locale, route } = ctx;
  if (route === 'home') {
    const badge = t(slot.badgeKey || 'page.home.badge.open');
    const badgeCls = 'rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-white';
    return homeCards().map((card) => {
      const href = localizedPath(locale, card.route);
      return [
        `      <a class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" href="${href}">`,
        `        <div class="flex items-start justify-between gap-2">`,
        `          <h2 class="text-lg font-bold">${esc(t(card.titleKey))}</h2>`,
        `          <span class="${badgeCls}" style="background:var(--ba-accent-strong)">${esc(badge)}</span>`,
        `        </div>`,
        `        <p class="mt-2 text-sm leading-relaxed text-gray-600">${esc(t(card.descKey))}</p>`,
        `      </a>`,
      ].join('\n');
    }).join('\n');
  }
  if (route === 'play') {
    const badgeCls = 'rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-white';
    const tiles = ['work', 'press', 'creative'];
    return tiles.map((tile) => {
      const tk = `page.play.tile.${tile}`;
      return [
        `      <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">`,
        `        <div class="flex items-start justify-between gap-2">`,
        `          <h2 class="text-lg font-bold">${esc(t(tk + '.title'))}</h2>`,
        `          <span class="${badgeCls}" style="background:var(--ba-accent-strong)">${esc(t('page.play.badge.' + tile))}</span>`,
        `        </div>`,
        `        <p class="mt-2 text-sm leading-relaxed text-gray-600">${esc(t(tk + '.desc'))}</p>`,
        `      </div>`,
      ].join('\n');
    }).join('\n');
  }
  throw new Error('build: cards-slot uten cards-rute (' + route + ')');
}

/** test-mount: run-HTML injecteres ved deploy, statiske plassholdere med mount-merke. */
function renderTestMount(slot, ctx) {
  const { locale } = ctx;
  const mountId = `ba-run-${slot.testId}-${locale}`;
  return [
    `      <!--BA-RUN: id=${mountId} test=${slot.testId} locale=${locale}-->`,
    `      <div id="${mountId}" class="mt-6"></div>`,
  ].join('\n');
}

/** Språkvelger-markup: aktiv = span, inaktiv = a med langSwitchHref(ctx.path). */
function renderSwitcher(locale, ctx) {
  const sw = langSwitcher();
  const other = locale === 'no' ? 'en' : 'no';
  const otherHref = langSwitchHref(ctx.path);
  if (locale === 'no') {
    return [
      `        <span class="${sw.activeCls}" style="background:var(--ba-accent-strong)">${sw.badges.no}</span>`,
      `        <a class="${sw.inactiveCls}" href="${otherHref}" hreflang="en">${sw.badges.en}</a>`,
    ].join('\n');
  }
  return [
    `        <span class="${sw.activeCls}" style="background:var(--ba-accent-strong)">${sw.badges.en}</span>`,
    `        <a class="${sw.inactiveCls}" href="${otherHref}" hreflang="no">${sw.badges.no}</a>`,
  ].join('\n');
}

/** hreflang-alternates for en side: canonical = denne, alternates = NB-NO + EN + x-default. */
function hreflangLinkTags(locale, route) {
  return [
    `<link rel="canonical" href="${canonicalUrl(locale, route)}"/>`,
    `<link rel="alternate" hreflang="nb-NO" href="${canonicalUrl('no', route)}"/>`,
    `<link rel="alternate" hreflang="en" href="${canonicalUrl('en', route)}"/>`,
    `<link rel="alternate" hreflang="x-default" href="${canonicalUrl('no', route)}"/>`,
  ];
}

/** Relativ asset-prefiks fra en sides katalog til sitens rot (subpath-sikkert). */
function relPrefix(path) {
  const rel = path.slice(BASE.length).replace(/\/+$/, '');
  return rel ? '../'.repeat(rel.split('/').length) : '';
}

/** Full HTML-side: doctype, head, header med språkvelger, main, footer. */
function pageShell({ locale, route, path, title, desc, ogTitle, ogDesc, imageAlt, ogImageTags, ogImageUrl, mainHtml, bootScript }) {
  const assets = relPrefix(path);
  const homeHref = localizedPath(locale, 'home');
  const ogLocale = locale === 'no' ? 'nb_NO' : 'en_US';
  const ogAlt = locale === 'no' ? 'en_US' : 'nb_NO';
  return '<!DOCTYPE html>\n' +
`<html lang="${locale}" dir="ltr">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}"/>
  ${hreflangLinkTags(locale, route).join('\n  ')}
  <link rel="stylesheet" href="${assets}site.css"/>
  <link rel="icon" href="${assets}favicon.ico" type="image/x-icon"/>
${bootScript || ''}
  <meta property="og:site_name" content="Brainarea"/>
  <meta property="og:type" content="website"/>
  <meta property="og:locale" content="${ogLocale}"/>
  <meta property="og:locale:alternate" content="${ogAlt}"/>
  <meta property="og:title" content="${esc(ogTitle)}"/>
  <meta property="og:description" content="${esc(ogDesc)}"/>
  ${ogImageTags}
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${esc(ogTitle)}"/>
  <meta name="twitter:description" content="${esc(ogDesc)}"/>
  <meta name="twitter:image" content="${ogImageUrl}"/>
  <meta name="twitter:image:alt" content="${esc(imageAlt)}"/>
</head>
<body class="min-h-screen antialiased">
  <div class="flex min-h-screen flex-col">
    <header class="flex items-center justify-between px-5 pt-6 pb-2 sm:px-8">
      <a class="text-lg font-extrabold tracking-tight" href="${homeHref}">Brainarea</a>
      <nav class="flex gap-1 text-sm" aria-label="Language switcher">
${renderSwitcher(locale, { path })}
      </nav>
    </header>
    <main class="mx-auto w-full max-w-2xl flex-1 px-5 pt-8 pb-16 sm:px-8">
${mainHtml}
    </main>
    <footer class="px-5 pb-8 text-center text-xs text-gray-400">(c) 2026 Brainarea</footer>
  </div>
</body>
</html>
`;
}

const SITEMAP_LASTMOD = '2026-11-15'; /* oppdateres manuelt per release — deterministisk bygg */

function sitemapXml(pagePaths) {
  const urls = pagePaths
    .map((p) => 'https://maneitai.github.io' + p)
    .map((u) => `<url>\n<loc>${u}</loc>\n<lastmod>${SITEMAP_LASTMOD}</lastmod>\n<changefreq>monthly</changefreq>\n</url>`)
    .join('\n');
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '\n</urlset>\n';
}

function robotsTxt() {
  return 'User-agent: *\nAllow: /\n\nSitemap: https://maneitai.github.io/brainarea/sitemap.xml\n';
}

function notFoundHtml() {
  return '<!DOCTYPE html>\n<html lang="no">\n<head>\n<meta charset="utf-8"/>\n<title>404 — Brainarea</title>\n</head>\n<body>\n<p>Siden finnes ikke. <a href="' + BASE + '">Til forsiden</a></p>\n</body>\n</html>\n';
}

async function main() {
  /* [BYGG] #3840: composite-defs (evne 270 -> maxItems 44, rel 4x4) bygges
     deterministisk fra poolene per bygg og valideres (selftestComposite). */
  const compositeFiles = writeCompositeDefs();
  selftestComposite(compositeFiles); /* kaster hardt ved pool-drift (items/trekk/sign-symmetri) */
  for (const f of compositeFiles) console.log('  composite', f.split('/').slice(-1)[0]);

  const css = readFileSync(join(__dirname, 'site.css'));
  const favicon = readFileSync(join(__dirname, 'favicon.ico'));
  const t = { no: await getT('no'), en: await getT('en') };

  if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'site.css'), css);
  writeFileSync(join(OUT, 'favicon.ico'), favicon);
  /* OG-kortene (assets/og/*.png) er git-trackede statiske assets — kopieres
     til out/ slik at og:image-URL-ene peker på de deployede filene.
     Raster-regenerering skjer via app/_og_raster.mjs (krever sharp), aldri her. */
  const ogDir = join(REPO, 'assets', 'og');
  if (existsSync(ogDir)) {
    mkdirSync(join(OUT, 'assets', 'og'), { recursive: true });
    for (const f of readdirSync(ogDir)) {
      if (f.endsWith('.png')) writeFileSync(join(OUT, 'assets', 'og', f), readFileSync(join(ogDir, f)));
    }
  }
  /* [BYGG] #3840: runner-pakke — engine, i18n, rapport, composite-defs, fonts.
     run.js kopieres med '@BA@/' -> './' rewrites (import-konvensjon i run.js). */
  const copyIf = (src, destRel) => { const d = join(OUT, destRel); mkdirSync(dirname(d), { recursive: true }); writeFileSync(d, readFileSync(src)); };
  copyIf(join(__dirname, 'run.js'), join('_app', 'run.js')); /* rewrites under */
  { /* '@BA@/' -> './' */
    const dst = join(OUT, '_app', 'run.js');
    const src = readFileSync(OUT + '/_app/run.js', 'utf8');
    writeFileSync(dst, src.split('@BA@/').join('./'));
  }
  for (const f of ['render.js', 'scoring.js', 'attention.js', 'randomize.js']) copyIf(join(REPO, 'tests', 'engine', f), join('_app', 'tests', 'engine', f));
  /* [BYGG] #3841: puzzle-pakken — boot-modul (med '@BA@/'->'./' rewrite, samme
     konvensjon som run.js), player (ren state machine). Defs kommer i defTargets. */
  copyIf(join(__dirname, 'puzzle.mjs'), join('_app', 'puzzle.mjs'));
  {
    const dst = join(OUT, '_app', 'puzzle.mjs');
    const src = readFileSync(dst, 'utf8');
    writeFileSync(dst, src.split('@BA@/').join('./'));
  }
  copyIf(join(REPO, 'tests', 'puzzle', 'puzzle-player.mjs'), join('_app', 'tests', 'puzzle', 'puzzle-player.mjs'));
  for (const f of ['index.js', 'en.js', 'no.js']) copyIf(join(REPO, 'i18n', f), join('_app', 'i18n', f));
  copyIf(join(REPO, 'report', 'renderer.mjs'), join('_app', 'report', 'renderer.mjs'));
  copyIf(join(REPO, 'report', 'configs', 'standard.json'), join('_app', 'report', 'configs', 'standard.json'));
  copyIf(join(REPO, 'report', 'pdf', 'brainarea-pdf.mjs'), join('_app', 'pdf', 'brainarea-pdf.mjs'));
  copyIf(join(REPO, 'report', 'pdf', 'pdffont.mjs'), join('_app', 'pdf', 'pdffont.mjs'));
  for (const f of ['DejaVuSans.ttf', 'DejaVuSans-Bold.ttf']) copyIf(join(REPO, 'report', 'pdf', 'fonts', f), join('_app', 'fonts', f));
  const defTargets = [
    [join(REPO, 'tests', 'schema', 'def-ipip50-big5.no.json'), '_app/defs/def-ipip50-big5.no.json'],
    [join(REPO, 'tests', 'schema', 'def-ipip50-big5.en.json'), '_app/defs/def-ipip50-big5.en.json'],
    [join(REPO, 'tests', 'schema', 'composite', 'def-evne-g-44.no.json'), '_app/defs/def-evne-g-44.no.json'],
    [join(REPO, 'tests', 'schema', 'composite', 'def-evne-g-44.en.json'), '_app/defs/def-evne-g-44.en.json'],
    [join(REPO, 'tests', 'schema', 'composite', 'def-rel-16.no.json'), '_app/defs/def-rel-16.no.json'],
    [join(REPO, 'tests', 'schema', 'composite', 'def-rel-16.en.json'), '_app/defs/def-rel-16.en.json'],
    [join(REPO, 'tests', 'puzzle', 'def-puzzle-v1.no.json'), '_app/defs/pool/puzzle/def-puzzle-v1.no.json'],
    [join(REPO, 'tests', 'puzzle', 'def-puzzle-v1.en.json'), '_app/defs/pool/puzzle/def-puzzle-v1.en.json'],
  ];
  for (const [src, rel] of defTargets) { if (!existsSync(src)) throw new Error('runner-pakke: mangler ' + rel); copyIf(src, rel); }
  /* fallback-pooler (evne runtime-fallbacks): kopieres forstoerst — de er ogsaa levekår for #3841-wiring */
  for (const t of ['t1-matrise', 't2-numerisk', 't3-verbal', 't4-romlig', 't5-sekvens', 't6-deduksjon']) {
    for (const lang of ['no', 'en']) {
      const src = join(REPO, 'tests', 'schema', 'evne_pool', `def-evne-${t}.${lang}.json`);
      if (existsSync(src)) copyIf(src, join('_app', 'defs', 'pool', 'evne', `def-evne-${t}.${lang}.json`));
    }
  }
  writeFileSync(join(OUT, 'robots.txt'), robotsTxt());
  writeFileSync(join(OUT, 'sitemap.xml'), sitemapXml([])); /* fylles under */
  writeFileSync(join(OUT, '404.html'), notFoundHtml());

  const pagePaths = [];
  for (const entry of RUTE_LISTE) {
    const route = entry.route;
    for (const locale of ['no', 'en']) {
      const tt = t[locale];
      const path = localizedPath(locale, route);
      const rel = path.slice(BASE.length).replace(/\/+$/, '');
      const file = rel ? join(OUT, ...rel.split('/'), 'index.html') : join(OUT, 'index.html');
      const slots = layout(route, locale, tt);
      const mainHtml = renderSlots(slots, { t: tt, locale, route, path });
      const ogCard = ogCardForRoute({ locale, route, t: tt });
      const meta = {
        title: tt(`page.${route}.title`),
        desc: tt(`page.${route}.desc`),
        ogTitle: tt(`page.${route}.og.title`),
        ogDesc: tt(`page.${route}.og.desc`),
        imageAlt: ogCard.alt,
      };
      const ogImageUrl = ogCard.png.url;
      /* [BYGG] #3840: boot-tag for test-ruter — runner-en monterer i BA-RUN-slotten */
      let bootScript = '';
      if (RUTE_LISTE.find((r) => r.route === route).testId !== null) {
        bootScript = `<script id="ba-run-boot" type="module" src="${relPrefix(path)}_app/run.js" data-ba-run="${RUTE_LISTE.find((r) => r.route === route).testId}:${locale}"></script>`;
      }
      const ogImageTags = ogMetaLines({ locale, route, title: meta.ogTitle, desc: meta.ogDesc, alt: ogCard.alt }).join('\n  ');
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, pageShell({ locale, route, path, mainHtml, ogImageTags, ogImageUrl, bootScript, ...meta }));
      pagePaths.push(path);
      console.log('  page', path, '->', rel ? rel + '/index.html' : 'index.html');
    }
  }
  writeFileSync(join(OUT, 'sitemap.xml'), sitemapXml(pagePaths));
  console.log('build ok:', pagePaths.length, 'pages,', '+ robots + sitemap + 404 ->', OUT);
}

main().catch((e) => { console.error('build FAIL:', e.message); process.exit(1); });
