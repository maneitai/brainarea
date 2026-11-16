/**
 * Deterministisk verify-harness for FASE 3 relasjoner NO-verdict
 * (_fase3_rel_no_verdict.json, TR-9791D6980CFA). Lese-kontrakt: uavhengig av
 * verdictens egen tekst — verifiserer mot kilder (i18n, out/, spec, NAOB-avledede
 * regler kan ikke verifiseres maskinelt og er H1/H2-holds, ikke påstander her).
 * Kjoring: node tests/schema/_fase3_rel_verify.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

let fails = 0; let checks = 0;
const ok = (c, m) => { checks++; console.log((c ? 'PASS' : 'FAIL') + ' ' + m); if (!c) fails++; };

const PROD_CANDIDATES = [
  '/mnt/f/maneit/prosjekter/filip-webside-prosjekter/brainarea',
  'f:/maneit/prosjekter/filip-webside-prosjekter/brainarea',
  'F:/maneit/prosjekter/filip-webside-prosjekter/brainarea',
];
const found = PROD_CANDIDATES.filter(existsSync);
ok(found.length >= 1, 'V0 prod-tre funnet');
const PROD = found[0];

const { KEYS: NO } = await import('file://' + join(PROD, 'i18n/no.js'));
const { KEYS: EN } = await import('file://' + join(PROD, 'i18n/en.js'));

/* V1: 15 rel.* strenger per språk, full paritet */
const relNo = Object.entries(NO.page).filter(([k]) => k.startsWith('rel.'));
const relEn = Object.entries(EN.page).filter(([k]) => k.startsWith('rel.'));
ok(relNo.length === 15, 'V1a NO rel.* = 15 (fant ' + relNo.length + ')');
ok(relEn.length === 15, 'V1b EN rel.* = 15 (fant ' + relEn.length + ')');
const noKeys = new Set(relNo.map(([k]) => k)); const enKeys = new Set(relEn.map(([k]) => k));
ok([...noKeys].every(k => enKeys.has(k)) && [...enKeys].every(k => noKeys.has(k)),
  'V1c nøkkel-paritet 15/15 begge veier');

/* V2: mekanisk renhet på rel-korpuset (samme regler som verdictens A-scan) */
const issues = [];
for (const [k, v] of relNo) {
  const ws = v.trim().split(/\s+/);
  for (let i = 1; i < ws.length; i++)
    if (ws[i].toLowerCase() === ws[i-1].toLowerCase() && ws[i].length > 1) issues.push(k + ' dobbelord');
  if (/[öä]/.test(v)) issues.push(k + ' svensk vokal');
  if (/\wÅ\w*/.test(v)) issues.push(k + ' ø→Å-korrupsjon ' + JSON.stringify(v.match(/\w*Å\w*/g)));
  if (/ [,;.:]/.test(v)) issues.push(k + ' mellomrom-for-tegn');
  if (/,,|\.\.|;;/.test(v)) issues.push(k + ' dobbeltegn');
  if (/\s{2,}/.test(v)) issues.push(k + ' dobbeltmellomrom');
}
ok(issues.length === 0, 'V2 mekanisk renhet 0 funn' + (issues.length ? ' — ' + issues.join('; ') : ''));

/* V3: etikett-lock: 4 dimensjonsnavn byte-eksakt i henholdsvis rel.intro og EN-rel.intro */
ok(/nærhet/.test(NO.page['rel.intro']) && /åpenhet/.test(NO.page['rel.intro']) &&
   /konflikthåndtering/.test(NO.page['rel.intro']) && /selvstendighet/.test(NO.page['rel.intro']),
  'V3a NO rel.intro inneholder alle 4 etiketter');
ok(/openness/.test(EN.page['rel.intro']) && /conflict handling/.test(EN.page['rel.intro']) &&
   /independence/.test(EN.page['rel.intro']) && /closeness/.test(EN.page['rel.intro']),
  'V3b EN rel.intro inneholder alle 4 etiketter');

/* V4: verdictens rendret-HTML-paastand — out/ inneholder i18n-strengene eksakt */
for (const [file, keys] of [
  ['out/relasjoner/index.html', ['rel.h1', 'rel.intro', 'rel.methodBody', 'rel.nonValidated']],
  ['out/en/relations/index.html', ['rel.h1', 'rel.intro', 'rel.methodBody', 'rel.nonValidated']],
]) {
  const p = join(PROD, file);
  if (!existsSync(p)) { ok(false, 'V4 ' + file + ' finnes ikke'); continue; }
  const src = readFileSync(p, 'utf8');
  const table = file.includes('/en/') || file.includes('en/relations') ? EN.page : NO.page;
  for (const k of keys) {
    const needle = table[k].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    ok(src.includes(needle), 'V4 ' + file + ' :: ' + k + ' rendret fra i18n');
  }
}

/* V5: holds er reelt ufixet i prod i18n (H1/H2-paastanden er at DET IKKE er rettet her) */
ok(String(NO.page['rel.methodBody']).includes('skåren'), 'V5_H1 rel.methodBody inneholder fortsatt skåren (hold, ikke rettet)');
ok(String(NO.page['ad.disclaimer']).includes('fÅr'), 'V5_H2 ad.disclaimer inneholder fortsatt fÅr (hold, ikke rettet)');

/* V6: verdict-JSON konsistent: scope-tall (15 strenger), 0 rettelser, 2 holds, 2 avkreftinger */
const verdict = JSON.parse(readFileSync(new URL('./_fase3_rel_no_verdict.json', import.meta.url), 'utf8'));
ok(verdict.status === 'GJELDENDE', 'V6a verdict GJELDENDE');
ok(verdict.rettelser.length === 0, 'V6b 0 rettelser (ingenting mekanisk brudd å rette)');
ok(verdict.holds.length === 2, 'V6c 2 holds');
ok(verdict.avkreftet.length === 3, 'V6d 3 avkreftinger');
ok(String(verdict.scope).includes('15 page.i18n rel.*-strenger'), 'V6e scope nevner 15 strenger');

/* V7: spil-convention: spec + selftest + compat finnes (relasjonssporets kontrakt trent til stede) */
for (const f of ['tests/schema/_rel_itemspec_spec.json', 'tests/schema/_rel_itemspec_selftest.mjs', 'tests/schema/_rel_compat_model.mjs'])
  ok(existsSync(join(PROD, f)), 'V7 ' + f);

console.log('\n' + checks + ' sjekker, ' + fails + ' FAIL');
if (fails > 0) process.exit(1);
else console.log('VERIFY OK — verdict-paastander bekreftet mot kilder');
