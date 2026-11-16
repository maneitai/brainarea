/**
 * Deterministisk verify-harness for FASE 3 ND (triage) NO-verdict
 * (_fase3_nd_triage_verdict.json). Lese-kontrakt: uavhengig av verdictens egen
 * tekst — leser mot kilder (def-filer, generator, meta, i18n, selftest, NAOB-
 * avledede regler kan ikke maskin-verifiseres og er holds, ikke påstander her).
 * Kjoring: node tests/schema/nd_pool/_fase3_nd_verify.mjs
 */
import { readFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

let fails = 0; let checks = 0;
const ok = (c, m) => { checks++; console.log((c ? 'PASS' : 'FAIL') + ' ' + m); if (!c) fails++; };
const J = (p) => JSON.parse(readFileSync(p, 'utf8'));

const PROD_CANDIDATES = [
  'F:/maneit/prosjekter/filip-webside-prosjekter/brainarea',
  '/mnt/f/maneit/prosjekter/filip-webside-prosjekter/brainarea',
];
const found = PROD_CANDIDATES.filter(existsSync);
ok(found.length >= 1, 'V0 prod-tre funnet');
const PROD = found[0];
const HERE = join(PROD, 'tests/schema/nd_pool');

/* V1: def-filer: 40 + 40 items, samme id-rekkefølge, språkfelt riktig */
const defNo = J(join(HERE, 'def-nd-triage-pool.no.json'));
const defEn = J(join(HERE, 'def-nd-triage-pool.en.json'));
ok(defNo.items.length === 40 && defEn.items.length === 40, 'V1a 40+40 items');
ok(JSON.stringify(defEn.items.map(i => i.id)) === JSON.stringify(defNo.items.map(i => i.id)),
  'V1b samme id-rekkefølge NO/EN');
ok(defNo.languages[0] === 'no' && defEn.languages[0] === 'en', 'V1c én fil per språk');
ok(defNo.items.every(it => it.kind === 'likert' && it.lang === 'no'), 'V1d NO-likert');
ok(defEn.items.every(it => it.kind === 'likert' && it.lang === 'en'), 'V1e EN-likert');

/* V2: mekanisk renhet på NO-korpuset (post-rettelse) */
const issues = [];
const wc = (t) => t.trim().split(/\s+/).filter(Boolean).length;
for (const it of defNo.items) {
  const t = it.text;
  const ws = t.split(/\s+/);
  for (let i = 1; i < ws.length; i++)
    if (ws[i].toLowerCase() === ws[i - 1].toLowerCase() && ws[i].length > 1) issues.push(it.id + ' dobbelord');
  if (/[öä]/.test(t)) issues.push(it.id + ' svensk vokal');
  if (/\wÅ\w*/.test(t)) issues.push(it.id + ' ø→Å-korrupsjon ' + JSON.stringify(t.match(/\w*Å\w*/g)));
  if (/ [,;.:]/.test(t)) issues.push(it.id + ' mellomrom-for-tegn');
  if (/,,|\.\.|;;/.test(t)) issues.push(it.id + ' dobbeltegn');
  if (/\s{2,}/.test(t)) issues.push(it.id + ' dobbeltmellomrom');
  if (/\bidè\b/.test(t)) issues.push(it.id + ' halv-idè (idè)');
  if (wc(t) < 8 || wc(t) > 14) issues.push(it.id + ' ordantall ' + wc(t));
  if (!/[.!?]$/.test(t)) issues.push(it.id + ' mangler slutttegn');
  if (/(alltid|aldri|always|never)/i.test(t)) issues.push(it.id + ' absolutt');
}
ok(issues.length === 0, 'V2 NO-korpus mekanisk rent 0 funn' + (issues.length ? ' — ' + issues.join('; ') : ''));
ok(new Set(defNo.items.map(i => i.text)).size === 40 && new Set([...defNo.items, ...defEn.items].map(i => i.text)).size === 80,
  'V2b korpus 40/40 unike per språk, 80 totalt');

/* V3: rettelsene er til stede OG de gamle formene borte (R1/R3/R5) */
const t0012 = defNo.items.find(i => i.id === 'ta-0012').text;
ok(t0012.includes('idé') && !t0012.includes('idè'), 'V3a R1 ta-0012: idè→idé anvendt i def (subsjekk — \\b bryter rundt é i JS)');
ok(!defNo.items.some(i => i.text.includes('idè')), 'V3a2 ingen idè igjen i NO-korpus (substring-skann)');
const t0020 = defNo.items.find(i => i.id === 'ta-0020').text;
ok(/glipper fra tanken/.test(t0020), 'V3b R3 ta-0020: glipper av→fra anvendt i def');
ok(!defNo.items.some(i => /glipper av tanken/.test(i.text)), 'V3b2 ingen «glipper av tanken» igjen');
const gen = readFileSync(join(HERE, 'gen_nd_triage_pool.py'), 'utf8');
ok(!/\btermenen\b/.test(gen), 'V3c R5 generator: termenen→terminen (nearNoteNo)');
const meta = J(join(HERE, '_nd_triage_pool_meta.json'));
const r0020 = meta.items.find(r => r.id === 'ta-0020');
ok(/terminen glipper/.test(r0020.nearNoteNo || ''), 'V3c2 meta ta-0020 nearNoteNo har terminen');
ok(!gen.includes('idè'), 'V3d generator mangler idè (regenerability-konvensjon, substring)');
ok(/idé/.test(gen), 'V3d2 generator har idé (ta-0012)');

/* V3e R6: meta-nøkkelsymmetri + død ternary borte */
let sym = true, noteEnLeftover = false;
for (const r of meta.items) {
  if (r.asrsNear && (!r.nearNoteNo || !r.nearNoteEn)) sym = false;
  if (Object.hasOwn(r, 'noteEn')) noteEnLeftover = true;
}
ok(sym && !noteEnLeftover, 'V3e R6 meta-nøkler: nearNoteNo+nearNoteEn symmetrisk på nær-rader, noteEn borte');
ok(!gen.includes('nn_en if near else nn_en'), 'V3e2 død ternary borte fra generator');

/* V4: regenerability — byte-paritet ved re-generering i temp-dir */
mkdirSync(join(HERE, '.tmp_regen'), { recursive: true });
try {
  execFileSync('python3', [join(HERE, 'gen_nd_triage_pool.py'), '--out', join(HERE, '.tmp_regen')], { stdio: 'pipe' });
} catch (e) {
  execFileSync('python', [join(HERE, 'gen_nd_triage_pool.py'), '--out', join(HERE, '.tmp_regen')], { stdio: 'pipe' });
}
for (const f of ['def-nd-triage-pool.no.json', 'def-nd-triage-pool.en.json', '_nd_triage_pool_meta.json']) {
  const a = readFileSync(join(HERE, f), 'utf8');
  const b = readFileSync(join(HERE, '.tmp_regen', f), 'utf8');
  ok(a === b, 'V4 byte-paritet ved re-generering: ' + f);
}
rmSync(join(HERE, '.tmp_regen'), { recursive: true, force: true });

/* V5: selftest grønn + spil-konvensjonsfiler + triage-modell intakt */
const st = execFileSync('node', [join(HERE, 'selftest_nd_triage_pool.mjs')], { stdio: 'pipe', encoding: 'utf8' });
ok(/78\/78 ALL PASS/.test(st), 'V5 selftest_nd_triage_pool 78/78 ALL PASS');
for (const f of ['tests/schema/_nd_itemspec_spec.json', 'tests/schema/_nd_itemspec_selftest.mjs', 'tests/schema/_nd_triage_model.mjs'])
  ok(existsSync(join(PROD, f)), 'V5 ' + f);
const tm = readFileSync(join(PROD, 'tests/schema/_nd_triage_model.mjs'), 'utf8');
ok(tm.includes('FLAGGED_GTE = 55') && tm.includes('out-adhd-autism'), 'V5 triage-modellen intakt (kontrakt + «begge»-utfall)');

/* V6: verdict-JSON konsistent */
const verdict = J(join(HERE, '_fase3_nd_triage_verdict.json'));
ok(verdict.status === 'GJELDENDE', 'V6a verdict GJELDENDE');
ok(Array.isArray(verdict.rettelser) && verdict.rettelser.length === 5, 'V6b 5 rettelser (fant ' + (verdict.rettelser || []).length + ')');
ok(Array.isArray(verdict.holds) && verdict.holds.length === 4, 'V6c 4 holds (fant ' + (verdict.holds || []).length + ')');
ok(Array.isArray(verdict.avkreftet) && verdict.avkreftet.length === 3, 'V6d 3 avkreftinger');
ok(String(verdict.scope).includes('triage'), 'V6e scope nevner triage');
const retr = verdict.rettelser.map(r => r.id);
ok(['ta-0012', 'ta-0020', 'ta-0020', 'meta', 'meta'].every(id => retr.includes(id)), 'V6f rettelses-id-ene matcher V3-leddene');
for (const r of verdict.rettelser)
  ok(r.before && r.after && r.klasse && r.grunn, 'V6g rettelse ' + r.id + ' har before/after/klasse/grunn');

/* V7: klinisk språk-voktering + lisens-voktering over hele korpuset */
const CLIN = /(diagnos|symptom|DSM|DIVA|Conners|SRS-2|CAT-Q|RAADS| AQ |AQ-|lidelse| disorder|ASRS)/i;
const badClin = [...defNo.items, ...defEn.items].filter(it => CLIN.test(it.text));
ok(badClin.length === 0, 'V7a ingen diagnostisk/instrument-tekst i 80 items' + (badClin.length ? ' — ' + badClin.map(i => i.id).join(',') : ''));
const risk = /(selvskade|selvmord|medisin|medication|harm)/i;
ok([...defNo.items, ...defEn.items].every(it => !risk.test(it.text)), 'V7b ingen ekstremrisiko-tekst i korpuset');
const { KEYS: NO_I18N } = await import('file://' + join(PROD, 'i18n/no.js'));
const { KEYS: EN_I18N } = await import('file://' + join(PROD, 'i18n/en.js'));
ok(NO_I18N.note['threshold.screening'] && EN_I18N.note['threshold.screening'], 'V7c i18n threshold.screening finnes NO+EN (note-ns)');
ok(/Screening, ikke diagnose/i.test(NO_I18N.note['threshold.screening']), 'V7d NO-disclaimer-teksten holder screening-ikke-diagnose-formen (note-ns)');

/* V8: options-paritet mot ipip-ankeren */
const ipipNo = J(join(PROD, 'tests/schema/def-ipip50-big5.no.json'));
const canon = (o) => JSON.stringify(o);
ok(defNo.items.every(it => canon(it.options) === canon(ipipNo.items[0].options)), 'V8 NO options byte-identiske med NOYAKTIGHET-ankeret');
const ipipEn = J(join(PROD, 'tests/schema/def-ipip50-big5.en.json'));
ok(defEn.items.every(it => canon(it.options) === canon(ipipEn.items[0].options)), 'V8b EN options byte-identiske med EN-ankeret');

/* V9: dyppoolene finnes IKKE ennå (scope-hjem: #3826-#3831) */
ok(!existsSync(join(PROD, 'tests/schema/nd_pool/def-nd-adhd-dyp-pool.no.json'))
  && !existsSync(join(PROD, 'tests/schema/nd_pool/def-nd-autisme-dyp-pool.no.json')),
  'V9 dyppool-filer finnes ikke (item-oversettelse der hører #3826-#3831 hjem)');

console.log('\n' + checks + ' sjekker, ' + fails + ' FAIL');
if (fails > 0) process.exit(1);
else console.log('VERIFY OK — verdict-paastander bekreftet mot kilder');
