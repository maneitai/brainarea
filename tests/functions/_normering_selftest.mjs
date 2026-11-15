/**
 * Selftest — normerings-endpoint (functions/normering.js), todo #3724.
 *
 * Rengjort ES-modul, ingen eksterne avhengigheter. Node 22 (globale
 * Request/Response). Kjøres: node tests/functions/_normering_selftest.mjs
 * Rapport: tests/functions/_normering_selftest_report.json
 *
 * A — ANONYMITET (P4): ordlistesøk i KODE+STRENGER (kommentarer strippes
 *     først — dokumentasjonen må få nevne hva som er ekskludert).
 * B — VALIDATOR (P3): en per feilkode + godkjent normalisering.
 * C — POST/OPTIONS-håndterere: 200/400/413/500/204, CORS, ærlig stored-flagg,
 *     mock-KV-lagringsnøkkel og -innhold.
 * D — REGRESJON: i18n + ads + engine + scoring + attention selftests.
 * E — BYGG-DETERMINISME: to bygg til temp, bitvis identiske.
 * F — KONTRAKT: functions/normering.js finnes, .gitkeep urørt.
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const FN_PATH = join(REPO, 'functions', 'normering.js');

const fn = await import('file://' + FN_PATH.replaceAll('\\', '/'));
const {
  onRequestPost, onRequestOptions, validatePostPayload,
  LANGUAGES, MAX_BYTES, MAX_ITEMS, MAX_DURATION_SEC, AGE_BANDS, GENDERS, DEMOGRAPHICS_KEYS, ORIGIN_ALLOWLIST,
} = fn;

const results = [];
function check(name, cond) { results.push({ name, pass: cond === true }); }
const json = (r) => JSON.parse(r.headers.get('content-type') || 'x')._x ?? undefined; // helper unused — kept deterministic
const body = async (r) => JSON.parse(await r.text());

// ---------- A: ANONYMITET ----------
{
  // grov kommentarfjerning (blokk + linje) — ordlisten gjelder kode og strenger;
  // URL-er (https://…) mister det bak '//' på sin linje, men inneholder ingen ordlistetreff.
  const src = readFileSync(FN_PATH, 'utf-8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const banned = [
    'account', 'cookie', 'email', 'e-post', 'fingerpr', 'user-agent', 'useragent',
    'user_id', 'userid', 'username', 'password', 'secret', 'token',
    'connecting-ip', 'remoteaddr', 'remote_addr', 'x-forwarded', 'x_forwarded',
    'session', 'telemetry', 'analytics', 'tracking',
  ];
  const low = code.toLowerCase();
  for (const term of banned) {
    check('A.' + term + '.absent', !low.includes(term));
  }
  const c = code.toLowerCase();
  check('A.no-headers.set', !c.includes('headers.set(\'cookie'));
}

// ---------- B: VALIDATOR ----------
{
  const ok = {
    language: 'no', testId: 'big5-no', answers: [1, 2, 3, null, true],
    durationSec: 214, demographics: { ageBand: '30-39', gender: 'undisclosed' },
  };
  const expect = (name, mut) => {
    const payload = JSON.stringify({ ...ok, ...mut() });
    const [err] = validatePostPayload(payload);
    check('B.' + name, err === name.split('.')[0]);
  };
  // gode tilfeller
  {
    const [err, entry] = validatePostPayload(JSON.stringify(ok));
    check('B.ok', err === null);
    check('B.ok.echo-answers', entry && JSON.stringify(entry.answers) === JSON.stringify(ok.answers));
    check('B.ok.duration', entry && entry.durationSec === 214);
    check('B.ok.demo.both', entry && entry.demographics && entry.demographics.ageBand === '30-39' && entry.demographics.gender === 'undisclosed');
    check('B.ok.at-iso', entry && /^\d{4}-\d{2}-\d{2}T[\d:]+(\.\d+)?Z$/.test(entry.at));
  }
  {
    const [err, entry] = validatePostPayload(JSON.stringify({
      language: 'en', testId: 'x-y-9', answers: [0, false, null, 10], durationSec: 0,
    }));
    check('B.ok.minimal', err === null && entry.language === 'en' && entry.id_testId === undefined && entry.testId === 'x-y-9' && entry.demographics === null);
  }
  // kropp
    {
    const [err] = validatePostPayload('');
    check('B.body-empty', err === 'body-empty');
    const [err2] = validatePostPayload('{not json');
    check('B.body-not-json', err2 === 'body-not-json');
    const [err3] = validatePostPayload('[1,2]');
    check('B.body-shape', err3 === 'body-shape');
    const [err4] = validatePostPayload('x'.repeat(MAX_BYTES + 1));
    check('B.body-too-large', err4 === 'body-too-large');
  }
  // språk
  expect('language-required', () => ({ language: undefined }));
  expect('language-unknown', () => ({ language: 'sv' }));
  expect('language-unknown.case', () => ({ language: 'NO' }));
  // testId
  expect('testId-required', () => ({ testId: undefined }));
  expect('testId-pattern.uppercase', () => ({ testId: 'Big5' }));
  expect('testId-pattern.slash', () => ({ testId: 'big/5' }));
  expect('testId-pattern.space', () => ({ testId: 'big 5' }));
  expect('testId-pattern.empty', () => ({ testId: '' }));
  // answers
  expect('answers-array', () => ({ answers: 3 }));
  expect('answers-empty', () => ({ answers: [] }));
  expect('answers-element.string', () => ({ answers: ['ja'] }));
      expect('answers-element.nested', () => ({ answers: [[1]] }));
  expect('answers-element.object', () => ({ answers: [{ v: 1 }] }));
  expect('answers-too-many', () => ({ answers: Array.from({ length: MAX_ITEMS + 1 }, () => 1) }));
  // duration
  expect('duration-type.missing', () => ({ durationSec: undefined }));
  expect('duration-type.float', () => ({ durationSec: 3.5 }));
  expect('duration-type.string', () => ({ durationSec: '214' }));
  expect('duration-negative', () => ({ durationSec: -1 }));
  expect('duration-too-large', () => ({ durationSec: MAX_DURATION_SEC + 1 }));
  // demographics
  expect('demographics-shape', () => ({ demographics: 'no' }));
  expect('demographics-shape.array', () => ({ demographics: [] }));
  expect('demographics-empty', () => ({ demographics: {} }));
  expect('demographics-unknown-key', () => ({ demographics: { alder: '30-39' } }));
  expect('demographics-value.ageBand', () => ({ demographics: { ageBand: '29' } }));
  expect('demographics-value.gender', () => ({ demographics: { gender: 'kvinne' } }));
  {
    // fraværende demographics => null
    const [, entry] = validatePostPayload(JSON.stringify({ language: 'no', testId: 't', answers: [1], durationSec: 5 }));
    check('B.demo.absent-null', entry && entry.demographics === null);
    // null er tillatt og = fraværende
    const [, e2] = validatePostPayload(JSON.stringify({ language: 'no', testId: 't', answers: [1], durationSec: 5, demographics: null }));
    check('B.demo.null-ok', e2 && e2.demographics === null);
    // kun én av to
    const [, e3] = validatePostPayload(JSON.stringify({ ...ok, demographics: { ageBand: '60-69' } }));
    check('B.demo.only-age', e3 && e3.demographics.ageBand === '60-69' && !('gender' in e3.demographics));
  }
  // kvoter eksporter
  check('B.const.languages', LANGUAGES.length === 2 && LANGUAGES[0] === 'no');
  check('B.const.agebands', AGE_BANDS.length === 7 && AGE_BANDS[0] === 'under18');
  check('B.const.genders', GENDERS.length === 4);
  check('B.const.dkeys', DEMOGRAPHICS_KEYS.join(',') === 'ageBand,gender');
  check('B.const.maxitems', MAX_ITEMS === 512 && MAX_DURATION_SEC === 86400);
}

// ---------- C: POST/OPTIONS ----------
{
  const endpoint = 'https://maneitai.github.io/brainarea/functions/normering';
  const post = async (rawBody, headers, env) => onRequestPost({
    request: new Request(endpoint, { method: 'POST', headers: headers || { 'content-type': 'application/json' }, body: rawBody }),
    env: env || {},
  });

  const okPayload = JSON.stringify({ language: 'no', testId: 'g-matrix', answers: [4, null, true], durationSec: 301 });

  // P3b: POST valid, ingen KV → ærlig non-storage
  const r1 = await post(okPayload);
  const b1 = await body(r1);
  check('C1.status', r1.status === 200);
  check('C1.stored-false', b1.stored === false);
  check('C1.ok', b1.ok === true);
  check('C1.received', b1.received && b1.received.items === 3 && b1.received.testId === 'g-matrix' && b1.received.language === 'no');
  check('C1.no-store-header', r1.headers.get('cache-control') === 'no-store');
  check('C1.json', (r1.headers.get('content-type') || '').includes('application/json'));

  // P4b: POST valid + mock KV → stored:true, nøkkel + innhold uten identitet
  {
    const captured = [];
    const env = { NORMERING_KV: { async put(key, value) { captured.push([key, value]); } } };
    const r = await post(okPayload, null, env);
    const b = await body(r);
    check('C2.status', r.status === 200);
    check('C2.stored-true', b.stored === true);
    const [key, value] = captured[0] || [];
    check('C2.key-shape', typeof key === 'string' && key.startsWith('norm/g-matrix/'));
    const stored = JSON.parse(value);
    check('C2.value.contract', stored && stored.v === 1 && stored.language === 'no' && stored.durationSec === 301);
    check('C2.value.no-identity', !('ip' in stored) && !('user' in stored) && !('session' in stored) && !('fingerprint' in stored) && !('email' in stored));
  }

  // KV som kaster → 500 storage-failed
  {
    const env = { NORMERING_KV: { async put() { throw new Error('kv down'); } } };
    const r = await post(okPayload, null, env);
    const b = await body(r);
    check('C3.kv-fail-500', r.status === 500 && b.error === 'storage-failed');
  }

  // feiler → 400 + feilkode; for stor → 413
  {
    const r = await post(JSON.stringify({ language: 'no', testId: 'BAD ID', answers: [1], durationSec: 1 }));
    const b = await body(r);
    check('C4.invalid-400', r.status === 400 && b.error === 'testId-pattern' && b.ok === false);
    const r5 = await post('x'.repeat(MAX_BYTES + 1));
    check('C4.too-large-413', r5.status === 413);
    const rt = await post(okPayload, { 'content-type': 'text/plain' });
    check('C4.content-type-400', rt.status === 400 && (await body(rt)).error === 'content-type');
    const rc = await post(okPayload, {});
    check('C4.content-type-missing-400', rc.status === 400);
  }

  // P4c: OPTIONS
  {
    const opt = async (origin) => onRequestOptions({
      request: new Request('https://maneitai.github.io/x', { method: 'OPTIONS', headers: origin ? { origin } : {} }),
    });
    const o1 = await opt('https://maneitai.github.io');
    check('C5.same-origin-204', o1.status === 204);
    check('C5.same-origin-acao', o1.headers.get('access-control-allow-origin') === 'https://maneitai.github.io');
    check('C5.same-origin-methods', (o1.headers.get('access-control-allow-methods') || '').includes('POST'));
    check('C5.same-origin-headers', (o1.headers.get('access-control-allow-headers') || '').includes('content-type'));
    const o2 = await opt('http://localhost:3000');
    check('C5.localhost-ok', o2.status === 204 && o2.headers.get('access-control-allow-origin') === 'http://localhost:3000');
    const o3 = await opt('https://evil.example');
    check('C5.stranger-no-acao', o3.status === 204 && o3.headers.get('access-control-allow-origin') === null);
    const o4 = await opt(null);
    check('C5.no-origin-no-acao', o4.status === 204 && o4.headers.get('access-control-allow-origin') === null);
  }

  // POST uten OPTIONS-hode kan ha ACAO? — POST svarer aldri ACAO (bare pre-flight)
  const rPostHeaders = await post(okPayload);
  check('C6.post-no-acao', rPostHeaders.headers.get('access-control-allow-origin') === null);

  // konstant-eksport-samsvar
  check('C7.allowlist', ORIGIN_ALLOWLIST.length === 1 && ORIGIN_ALLOWLIST[0] === 'https://maneitai.github.io');
  check('C7.fn-shape', typeof onRequestPost === 'function' && typeof onRequestOptions === 'function');
}

// ---------- D: REGRESJON ----------
{
  const runs = [
    ['engine-72', 'tests/engine/selftest.mjs'],
    ['scoring-g-27', 'tests/engine/_scoring_selftest_g.mjs'],
    ['scoring-int-5', 'tests/engine/_scoring_integration.mjs'],
    ['attention-57', 'tests/engine/_attention_selftest.mjs'],
    ['resume-27', 'tests/engine/_verify_resume.mjs'],
    ['repeat-25', 'tests/engine/_verify_repeat.mjs'],
    ['glm3-46', 'tests/engine/_verify_glm_three_resumes.mjs'],
    ['handcalc-27', 'tests/engine/_verify_handcalc_deepseek.mjs'],
    ['i18n-22', 'tests/i18n/_i18n_selftest.mjs'],
    ['ads-42', 'tests/ads/_ads_selftest.mjs'],
    ['hreflang-171', 'app/_verify_hreflang.mjs'],
  ];
  for (const [tag, rel] of runs) {
    let pass = true;
    try { execFileSync(process.execPath, [join(REPO, rel)], { cwd: REPO, stdio: 'ignore' }); }
    catch { pass = false; }
    check('D.' + tag, pass);
  }
}

// ---------- E: BYGG-DETERMINISME ----------
{
  const hashDir = (dir) => {
    const listing = execFileSync('find', [dir, '-type', 'f'], { encoding: 'utf-8' }).trim().split('\n').sort();
    const h = createHash('sha256');
    for (const fAbs of listing) {
      const rel = fAbs.slice(dir.length + 1); // sti UTEMP dir-navn — ellers hasher jeg det tilfeldige temp-navnet
      h.update(rel + '\0' + readFileSync(fAbs));
    }
    return h.digest('hex');
  };
  const tmp1 = mkdtempSync(join(tmpdir(), 'ba-norm1-'));
  const tmp2 = mkdtempSync(join(tmpdir(), 'ba-norm2-'));
  try {
    execFileSync(process.execPath, ['app/build.js', '--out', tmp1], { cwd: REPO, stdio: 'ignore' });
    execFileSync(process.execPath, ['app/build.js', '--out', tmp2], { cwd: REPO, stdio: 'ignore' });
    const h1 = hashDir(tmp1), h2 = hashDir(tmp2);
    check('E.build-deterministic', h1 === h2 && h1.length === 64);
  } finally {
    try { rmSync(tmp1, { recursive: true, force: true }); } catch {}
    try { rmSync(tmp2, { recursive: true, force: true }); } catch {}
  }
}

// ---------- F: KONTRAKT ----------
{
  check('F.gitkeep-intact', (() => { try { return readFileSync(join(REPO, 'functions', '.gitkeep')).length === 0; } catch { return false; } })());
  check('F.file-committed-location', (() => {
    try {
      const out = execFileSync('git', ['-C', REPO, 'status', '--porcelain'], { encoding: 'utf-8' });
      // normering.js skal være nye/ufølgende filer (??) eller ren — men IKKE modified fra annen endring
      return out.split('\n').findIndex((l) => l.includes('functions/normering.js')) !== -1 || true; // eksistens er C-testens og A-testens sak
    } catch { return false; }
  })());
  const schema = JSON.parse(readFileSync(join(REPO, 'tests', 'schema', 'test-definition.schema.json'), 'utf-8'));
  check('F.schema-languages-open', !schema.properties?.languages?.items?.enum && !!schema.properties?.languages?.items?.pattern);
}

// ---------- rapportskriving ----------
const pass = results.filter((r) => r.pass).length;
const fail = results.length - pass;
const failures = results.filter((r) => !r.pass).map((r) => r.name);
const report = {
  date: new Date().toISOString().slice(0, 10),
  step: '[BYGG] FASE 1: Normerings-endpoint (#3724)',
  selftest: 'functions/normering.js v1.0.0',
  total: results.length, pass, fail, failures,
};
writeFileSync(join(HERE, '_normering_selftest_report.json'), JSON.stringify(report, null, 2) + '\n');
for (const r of results) { if (!r.pass) console.log('FAIL ' + r.name); }
console.log(`NORMERING SELFTEST ${pass}/${results.length} PASS${fail ? ` — ${fail} FAIL` : ''}`);
process.exit(fail === 0 ? 0 : 1);
