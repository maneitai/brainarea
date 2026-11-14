/**
 * Selftest for i18n-katalogen ([BYGG] FASE 1, todo #3716) — "i18n-nøkkelfil-struktur — EN=base, NO=overlay".
 * Kjør: node tests/i18n/_i18n_selftest.mjs  (node >= 20, ingen deps)
 * Rapport: tests/i18n/_i18n_selftest_report.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { KEYS as EN_KEYS, LANG as EN_LANG } from '../../i18n/en.js';
import { KEYS as NO_KEYS, LANG as NO_LANG } from '../../i18n/no.js';
import { makeT, registerOverlay, getT, hasKey, enKeys } from '../../i18n/index.js';

const HERE = fileURLToPath(new URL('.', import.meta.url));

let pass = 0;
const failures = [];
function check(name, cond) {
  if (cond) { pass++; console.log(`PASS ${name}`); }
  else { failures.push(name); console.log(`FAIL ${name}`); }
}

registerOverlay(NO_LANG, NO_KEYS);

/* S1 — EN fullt dekket: hvert EN-navnerumsnøkkel må eksistere i katalogen */
const enFlat = {};
for (const [ns, names] of Object.entries(EN_KEYS)) for (const [k, v] of Object.entries(names)) enFlat[`${ns}.${k}`] = v;
const enKeysList = Object.keys(enFlat).sort();
check('S1.EN.complete (≥15 nøkler)', enKeysList.length >= 15);
check('S1.EN.namespaces-orden (ui,note,aria,page)', JSON.stringify(Object.keys(EN_KEYS)) === JSON.stringify(['ui', 'note', 'aria', 'page']));

/* S2 — NO dekker ALLE EN-nøkler i katalogen (strukturell overlay-regel: hvert EN-navnerumsnøkkel må eksistere et sted) */
const noFlat = {};
for (const [ns, names] of Object.entries(NO_KEYS)) for (const [k, v] of Object.entries(names)) noFlat[`${ns}.${k}`] = v;
check('S2.NO.covers-all-EN-keys', enKeysList.every((k) => typeof noFlat[k] === 'string'));

/* S3 — ingen tomme strenger, ingen HTML, ingen tab */
const all = { ...enFlat, ...noFlat };
check('S3.no-empty', Object.values(all).every((v) => typeof v === 'string' && v.trim().length > 0));
check('S3.no-html', Object.values(all).every((v) => !/<[a-z][^>]*>/i.test(v)));
check('S3.no-concat-breaks', Object.values(all).every((v) => !v.includes('" +')));

/* S4 — placeholder-orden er identisk EN vs NO per nøkkel */
const phOrder = (s) => (s.match(/\{[ab]\}/g) || []).join('|');
const mism = Object.keys(enFlat).filter((k) => phOrder(enFlat[k]) !== phOrder(noFlat[k]));
check('S4.placeholder-order-identical-EN-NO', mism.length === 0);

/* S5 — resolver: NO-overlay slår EN; EN er base; ukjent språk -> EN */
const tNo = makeT('no');
const tEn = makeT('en');
check('S5.NO-overtakes-EN (ui.next=Neste)', tNo('ui.next') === 'Neste');
check('S5.EN-base (ui.next=Next)', tEn('ui.next') === 'Next');
check('S5.unknown-lang->EN (makeT("de") = Next)', makeT('de')('ui.next') === 'Next');
check('S5.unknown-key->keyself (tNo("ui.nope")="ui.nope")', tNo('ui.nope') === 'ui.nope');
check('S5.no-empty-throw', (() => { try { return typeof tNo('ui.next') === 'string'; } catch { return false; } })());

/* S6 — note-id-er matcher scoring.js pushNote-id-er */
check('S6.note.trait.not-normed', hasKey('note.trait.not-normed'));
check('S6.note.threshold.screening', hasKey('note.threshold.screening'));
check('S6.note.gscore.not-normed', hasKey('note.gscore.not-normed'));

/* S7 — aria-mønstre matcher render.js syntetiserte kontroller */
check('S7.aria.orderMoveUp.pattern (flytt X opp)', tNo('aria.orderMoveUp').replace('{a}', 'X') === 'flytt X opp');
check('S7.aria.orderMoveDown.pattern (flytt X ned)', tNo('aria.orderMoveDown').replace('{a}', 'X') === 'flytt X ned');
check('S7.aria.EN (move X up)', tEn('aria.orderMoveUp').replace('{a}', 'X') === 'move X up');

/* S8 — lazy-import (getT) resolver no via dynamisk import, ukjent -> EN */
const tLazy = await getT('no');
const tLazyEn = await getT('yy');
check('S8.getT("no")-overlay', tLazy('ui.finish') === 'Fullfør og vis resultat');
check('S8.getT("yy")-fall-back-til-EN', tLazyEn('ui.next') === 'Next');

/* S9 — determinisme: makeT er ren; samme kall -> samme streng */
check('S9.deterministic', makeT('no')('ui.resume') === makeT('no')('ui.resume') && makeT('no')('ui.resume').length > 0);

/* S10 — schema v1 tie-in: dim.*-namespace er IKKE definert i FASE 1 (ærlig gap) */
check('S10.dim-namespace-absent (FASE-1-gap dokumentert)', !enKeysList.some((k) => k.startsWith('dim.')));

/* Rapport */
const report = {
  suite: 'i18n-selftest',
  version: '1.0.0',
  todo: '#3716',
  pass,
  fail: failures.length,
  failures,
  detail: { enKeyCount: enKeysList.length, noKeyCount: Object.keys(noFlat).length },
};
writeFileSync(`${HERE}_i18n_selftest_report.json`, JSON.stringify(report, null, 2));
console.log(`\n${pass}/${pass + failures.length} PASS`);
if (failures.length) process.exit(1);
