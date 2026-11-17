#!/usr/bin/env node
/**
 * Raster-bygg for OG-kortene ([BYGG] FASE 3) — SVG-master -> PNG 1200×630.
 *
 * Bruk: node app/_og_raster.mjs [--out <dir>]
 * - Standard ut: <repo>/assets/og/ — DEN KANONISKE LEVERANSEN: PNG-ene er
 *   git-trackede statiske assets; app/build.js kopierer dem til out/ (byggoutput),
 *   så CI-bygget trenger ALDRI sharp. Dette skriptet er regenereringsverktøy.
 * - Krevd avhengighet: sharp (repoets node_modules) — krever node med
 *   plattform-binært (windows-x64: fungerer; ved linux-node med windows-binært
 *   failer modullen med klar beskjed). Feiler ALDRI stille.
 * - Determinisme: SVG-masterne er byte-deterministiske; PNG-md5 er
 *   raster-vertsavhengig (librsvg innebygd i sharp) — vertssjiktet
 *   dokumenteres i verdiktet; determinisme-påstand gjelder per vert.
 */
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { getT, registerOverlay } from '../i18n/index.js';
import { KEYS as NO_KEYS, LANG as NO_LANG } from '../i18n/no.js';
import { ogCardForRoute, ogCardOrder, OG_W, OG_H, OG_ASSETS_DIR } from './og.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const argIx = process.argv.indexOf('--out');
const OUT = argIx > 0 ? resolve(process.argv[argIx + 1]) : join(__dirname, '..', ...OG_ASSETS_DIR.split('/').filter(Boolean));

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch (e) {
  console.error('og-raster FAIL: sharp kan ikke lastes (' + e.message.split('\n')[0] + ').');
  console.error('  Raster kræver sharp med plattform-binært — kjør på en vert der det er installert.');
  process.exit(2);
}

registerOverlay(NO_LANG, NO_KEYS);
const t = { no: await getT('no'), en: await getT('en') };

mkdirSync(OUT, { recursive: true });
const lines = [];
for (const { route, locale } of ogCardOrder()) {
  const card = ogCardForRoute({ locale, route, t: t[locale] });
  const png = await sharp(Buffer.from(card.svg, 'utf8'), { density: 96 })
    .resize(OG_W, OG_H, { fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toBuffer();
  const file = join(OUT, `${route}-${locale}.png`);
  writeFileSync(file, png);
  const md5 = createHash('md5').update(png).digest('hex');
  writeFileSync(join(OUT, `${route}-${locale}.svg`), card.svg, 'utf8'); /* deterministisk master, bevis-spor; aldri referert av og:image */
  const svgMd5 = createHash('md5').update(card.svg, 'utf8').digest('hex');
  lines.push(`${route}-${locale}.png md5=${md5} bytes=${png.length} svgmd5=${svgMd5}`);
  console.log('  og-raster', `${route}-${locale}.png`, png.length, 'bytes, md5', md5.slice(0, 12), '| svg', svgMd5.slice(0, 12));
}
writeFileSync(join(OUT, 'MANIFEST.md5'), lines.join('\n') + '\n');
console.log('og-raster ok:', lines.length, 'PNG-er ->', OUT);
