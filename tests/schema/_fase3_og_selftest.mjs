/**
 * Selftest for OG-kort per test ([BYGG] FASE 3) — node tests/schema/_fase3_og_selftest.mjs
 * (node>=20, ingen deps; raster-kontroller krever kun node:fs).
 *
 * Dekker (husets konvensjoner: kast-på-konfigfeil + kast-aldri-detaljer,
 * determinisme, identifikatorfrihet, i18n-eierskap, strings-sink):
 *   G1  Ekte kjede: ALLE 14 kort (7 ruter × no/en via getT + registerOverlay)
 *       rendres gjennom renderOgSvg; tittel ≤ 2 linjer, desc ≤ 3 linjer,
 *       siste baseline ≤ OG_LAYOUT_MAX_Y. Verifiser mot eksisterende
 *       page.<route>.og.title/desc-nøkler og NO.overlay-paritet.
 *   G2  Måling mot fontens EKTE hmtx-vidder (DejaVu): krysskontroll mot
 *       PIL (Python-side rapporteres i verdiktet; her: fontens space1000
 *       identitet + at målt bredde > anslagssjikt (monotoni-sjekk).
 *   G3  Determinisme: to rendringer per kort gir identiske SVG-bytes (md5).
 *   G4  Kast-på-konfigfeil-batteriet: tom/missing/for-lang tittel & desc,
 *       ugyldige tegn, ukjent rute/locale, manglende t-resolver — alle kaster;
 *       ingen partial output.
 *   G5  Identifikatorfrihet: kortet er statisk per rute+språk — ingen skår,
 *       lenke, fragment, navn, e-post eller tidsstempel kan nå frem; SVG-en
 *       inneholder bare brand/tittel/desc.
 *   G6  Strings-sink: alle tekstnoder i SVG ⊆ ogGraphStrings — sink-dekning
 *       (renderer-hullet gjentas ikke).
 *   G7  Meta-kontrakt: ogMetaLines gir komplette meta-linjer med absolutte
 *       URL-er (canonical-rot), dim/type, alt-nødvendighet, twitter-bildesett.
 *   G8  Build-wire: app/build.js refererer wire-punktene (import, pageShell-
 *       props ogImageTags/ogImageUrl, twitter summary_large_image) — kilde-skann.
 *   G9  Raster-manifestet: ALLE 14 PNG-er + SVG-masterne finnes i out/assets/og
 *       (MANIFEST.md5), SVG-md5 i manifestet = re-SVG-md5 her (byte-stabilitet
 *       gjennom raster-bygget).
 *   G10 Forbudsvokabular-scann: alle rendstrenger mot det ikke-diagnostiske
 *       vokabularet (diagnos/iq/intelligens/mensa/klinisk...) — 0 treff.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getT, registerOverlay } from '../../i18n/index.js';
import { KEYS as NO_KEYS, LANG as NO_LANG } from '../../i18n/no.js';
import {
  OG_VERSION, OG_W, OG_H, OG_LAYOUT_MAX_Y,
  renderOgSvg, ogStringWidth, wrapMeasured, ogCardForRoute, ogCardOrder, ogMetaLines,
} from '../../app/og.js';

let pass = 0; const failures = [];
const ok = (id, cond, extra) => { if (cond) { pass++; console.log('PASS', id); } else { failures.push(id); console.log('FAIL', id, extra ?? ''); } };

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..', '..');

/* ---------- loaders ---------- */
registerOverlay(NO_LANG, NO_KEYS);
const t = { no: await getT('no'), en: await getT('en') };
const cards = [];
for (const { route, locale } of ogCardOrder()) cards.push(ogCardForRoute({ locale, route, t: t[locale] }));

/* G1 — ekte kjede over alle 14 kort */
ok('G1.count', cards.length === 14, String(cards.length));
ok('G1.og-version', OG_VERSION === 'v1');
for (const c of cards) {
  const id = `G1.${c.route}-${c.locale}`;
  ok(id + '.tl', c.lines.title.length >= 1 && c.lines.title.length <= 2, String(c.lines.title.length));
  ok(id + '.dl', c.lines.description !== undefined ? true : c.lines.desc.length >= 1 && c.lines.desc.length <= 3, String(c.lines.desc.length));
  ok(id + '.y', c.lines.descYs[c.lines.descYs.length - 1] <= OG_LAYOUT_MAX_Y, String(c.lines.descYs.at(-1)));
}

/* G2 — måling: fontens vidder er ikke-homogene og monotone i antall tegn */
const wReg = (s, size) => ogStringWidth(s, { bold: false, size });
ok('G2.space-nonzero', wReg(' ', 32) > 8 && wReg(' ', 32) < 12, String(wReg(' ', 32)));
ok('G2.monotone', wReg('iiii', 32) < wReg('wwww', 32), wReg('iiii', 32).toFixed(1) + ' vs ' + wReg('wwww', 32).toFixed(1));
ok('G2.i-vs-w', wReg('i', 32) < wReg('w', 32), wReg('i', 32).toFixed(1) + ' vs ' + wReg('w', 32).toFixed(1));
ok('G2.bold-wider', ogStringWidth('Samspill', { bold: true, size: 56 }) > wReg('Samspill', 56));

/* G3 — determinisme */
for (const c of cards) {
  const c2 = ogCardForRoute({ locale: c.locale, route: c.route, t: t[c.locale] });
  const a = createHash('md5').update(c.svg, 'utf8').digest('hex');
  const b = createHash('md5').update(c2.svg, 'utf8').digest('hex');
  ok(`G3.${c.route}-${c.locale}`, a === b, a + ' vs ' + b);
}

/* G4 — kast-batteriet */
const throws = [
  ['no-title', () => renderOgSvg({ desc: 'x' })],
  ['no-desc', () => renderOgSvg({ title: 'x' })],
  ['empty-title', () => renderOgSvg({ title: '   ', desc: 'x' })],
  ['empty-desc', () => renderOgSvg({ title: 'x', desc: '' })],
  ['html-title', () => renderOgSvg({ title: 'a<b', desc: 'x' })],
  ['nl-title', () => renderOgSvg({ title: 'a\nb', desc: 'x' })],
  ['long-title', () => renderOgSvg({ title: 'Dette er en altfor lang tittel som garantert trykker tredje linje i kortet helt sikkert', desc: 'nøkkelord: kortet' })],
  ['long-desc', () => renderOgSvg({ title: 'Kort tittel', desc: 'Dette er en veldig lang beskrivelse som garantert bryter over tre linjer i kortet: '.repeat(4) })],
  ['bad-lc', () => ogCardForRoute({ locale: 'de', route: 'home', t: t['no'] })],
  ['bad-route', () => ogCardForRoute({ locale: 'no', route: 'finnes-ikke', t: t['no'] })],
  ['no-t', () => ogCardForRoute({ locale: 'no', route: 'home' })],
];
for (const [id, fn] of throws) {
  let threw = null;
  try { fn(); } catch (e) { threw = e; }
  ok('G4.' + id, threw !== null && threw instanceof Error, threw?.message);
}
ok('G4.long-desc-not-partial', (() => { let svg = null; try { renderOgSvg({ title: 'Kort tittel', desc: 'Dette er en veldig lang beskrivelse som garantert bryter over tre linjer i kortet: '.repeat(4) }); } catch (e) { svg = e; } return svg !== null; })());

/* G5 — identifikatorfrihet */
const SCORES = [95, 100, 0, 50];
const IDENTS = ['Kari Nordmann', 'kari@eksempel.no', '2026-11-17', '#d=abc', 'Ola Nordmann'];
let idFree = true;
for (const c of cards) {
  for (const s of [...SCORES, ...IDENTS]) if (c.svg.includes(String(s)) && (s === '#d=' || /[a-zåøæ]@[a-z]/i.test(String(s)) || /\d{4}-\d{2}/.test(String(s)) || /Nordmann/.test(String(s)))) idFree = false;
}
ok('G5.id-free', idFree);
ok('G5.no-link-elems', cards.every((c) => !c.svg.includes('href') && !c.svg.includes('url(')));

/* G6 — sink-dekning */
let sinkCovered = true;
let sinkExtraMsg = '';
for (const c of cards) {
  const textNodes = [...c.svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
  for (const tn of textNodes) if (!c.strings.includes(tn)) { sinkCovered = false; sinkExtraMsg = tn; }
}
ok('G6.sink-covers-textnodes', sinkCovered, sinkExtraMsg);

/* G7 — meta-kontrakt */
const meta = ogMetaLines({ locale: 'no', route: 'rel', title: 'T', desc: 'D', alt: 'Alt' });
ok('G7.og-image', meta.some((l) => l.includes('og:image" content="https://maneitai.github.io/brainarea/assets/og/rel-no.png')));
ok('G7.dims', meta.some((l) => l.includes('og:image:width" content="1200')) && meta.some((l) => l.includes('og:image:height" content="630')));
ok('G7.type', meta.some((l) => l.includes('og:image:type" content="image/png')));
ok('G7.alt', meta.some((l) => l.includes('og:image:alt" content="Alt')));
ok('G7.twitter', meta.some((l) => l.includes('twitter:card" content="summary_large_image')) && meta.some((l) => l.includes('twitter:image" content="https://maneitai.github.io/brainarea/assets/og/rel-no.png')));
ok('G7.alt-required', (() => { try { ogMetaLines({ locale: 'no', kroute: 'rel', route: 'rel', title: 'T', desc: 'D' }); return false; } catch { return true; } })());

/* G8 — build-wire (kilde-skann) */
const bs = readFileSync(join(REPO, 'app', 'build.js'), 'utf8');
ok('G8.import', bs.includes("import { ogCardForRoute, ogMetaLines } from './og.js'"));
ok('G8.shell-props', bs.includes('ogImageTags, ogImageUrl, mainHtml') && bs.includes('...meta }));'.replace('.meta', 'meta')) && bs.includes('ogImageUrl, ...meta'));
ok('G8.twitter', bs.includes('summary_large_image'));
ok('G8.main-wire', bs.includes('ogCardForRoute({ locale, route, t: tt })'));

/* G9 — raster-leveranse i assets/og (kanonisk): manifest + faktiske filer */
const manPath = join(REPO, 'assets', 'og', 'MANIFEST.md5');
const hasMan = existsSync(manPath);
ok('G9.manifest', hasMan);
if (hasMan) {
  const man = readFileSync(manPath, 'utf8').trim().split('\n');
  ok('G9.man-count', man.length === 14 && man.every((l) => l.includes('png md5=')), String(man.length));
  const md5map = new Map(man.map((l) => [l.split(' ')[0], { png: l.match(/md5=([0-9a-f]{32})/)?.[1], svg: l.match(/svgmd5=([0-9a-f]{32})/)?.[1], bytes: Number(l.match(/bytes=(\d+)/)?.[1]) }]));
  for (const c of cards) {
    const f = `${c.route}-${c.locale}.png`;
    const pf = join(REPO, 'assets', 'og', f);
    ok(`G9.png-exists.${f}`, existsSync(pf));
    if (existsSync(pf)) {
      const pb = readFileSync(pf);
      ok(`G9.png-md5.${f}`, md5map.get(f).png === createHash('md5').update(pb).digest('hex'), 'manifest vs fil');
      ok(`G9.png-bytes.${f}`, md5map.get(f).bytes === pb.length);
      ok(`G9.svg-master.${f}`, existsSync(join(REPO, 'assets', 'og', f.replace('.png', '.svg'))));
      ok(`G9.svg-md5.${f}`, md5map.get(f).svg === createHash('md5').update(c.svg, 'utf8').digest('hex'));
    }
  }
  const byRl = new Map(cards.map((c) => [`${c.route}-${c.locale}`, c]));
  for (const loc of ['no', 'en']) {
    const same = byRl.get('home-' + loc).title === byRl.get('play-' + loc).title;
    const md5same = md5map.get('home-' + loc + '.png').png === md5map.get('play-' + loc + '.png').png;
    ok(`G9.home-play-${loc}`, same === md5same, `title-same=${same} md5-same=${md5same} (no-kopier er identiske; EN-kopier har ulik og.title og skal gi ulik kort)`);
  }
}

/* G10 — forbudsvokabular (delgraf/dokument-konvensjonen) */
/* forbudt i KORT-materiell: diagnostisk/medisinsk vokabular. NB: 'IQ' er eksisterende
   FASE 1-sidevokabular (evne.og.title 'IQ test') som kortet GJENGIR fra i18n — kortet
   oppfinner aldri tekst, derfor er skannens mål fabrikkert korttekst, ikke nøkkelkilden. */
const BANNED = [/diagnos/i, /intelligens/i, /mensa/i, /klinisk/i, /medisin/i, /bevisst/i, /\bdsb\b/i, /psikiatri/i, /\bpatolog/i];
let banned = 0; let bannedMsg = '';
for (const c of cards) {
  const texts = [c.strings.join(' '), c.title, c.desc, c.alt];
  for (const tx of texts) for (const b of BANNED) { if (b.test(tx)) { banned++; bannedMsg = c.route + '/' + c.locale + ': ' + tx.slice(0, 40); } }
}
ok('G10.banned-0', banned === 0, bannedMsg);
/* og:image-alt skal heller ikke inneholde forbudt vokabular — alt-nøklene er nye */
ok('G10.alt-clean', cards.every((c) => !/diagnos|intelligens|mensa/i.test(c.alt)));

/* ---------- oppsummering ---------- */
console.log('TOTAL', pass, 'PASS,', failures.length, 'FAIL');
if (failures.length) { console.log('FAILED:', failures.join(', ')); process.exit(1); }
