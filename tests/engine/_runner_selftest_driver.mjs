/**
 * Runner selftest — driver [BYGG] #3840.
 *
 * Spawn'er _runner_selftest_child.mjs for alle fire scenarioene og aggregerer:
 *   persona:no          — trait-path, ekte def, rapport + PDF + retake
 *   iq:en:degraded      — composite 404 → runtime-fallback → g-score path
 *   rel:en              — fire dimensjoner, trait
 *   rel:no:missingdef   — def 404 → ærlig feilboks
 *
 * Kjør: node tests/engine/_runner_selftest_driver.mjs
 * Rapport: tests/engine/_runner_selftest_report.json
 * Exit 0 kun ved 0 feil på tvers av alle scenarioene.
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CHILD = join(HERE, '_runner_selftest_child.mjs');
const SCENARIOS = ['persona:no', 'iq:en:degraded', 'rel:en', 'rel:no:missingdef'];

const results = [];
let fails = 0;
let passes = 0;
for (const sc of SCENARIOS) {
  const r = spawnSync(process.execPath, [CHILD, sc], { encoding: 'utf8', timeout: 120000 });
  const lines = String(r.stdout || '').trim().split('\n');
  const last = lines[lines.length - 1] || '';
  let parsed = null;
  try { parsed = JSON.parse(last); } catch { /* fanges under */ }
  if (!parsed) {
    results.push({ scenario: sc, pass: 0, fail: 1, checks: [{ name: 'SPAWN', ok: false, detail: (r.stderr || String(r.stdout || '')).slice(0, 400) }] });
    fails += 1;
    continue;
  }
  results.push({ scenario: sc, pass: parsed.pass, fail: parsed.fail, checks: parsed.checks });
  passes += parsed.pass;
  fails += parsed.fail;
}

const okAll = fails === 0;
console.log('=== runner selftest ===');
for (const r of results) {
  console.log(`${okAll ? '' : ''}${r.scenario}: ${r.pass} PASS, ${r.fail} FAIL`);
  if (r.fail > 0) for (const c of r.checks.filter((c) => !c.ok)) console.log('   FAIL', c.name, '—', (c.detail || '').slice(0, 160));
}
const report = { run: new Date().toISOString(), scenarios: results, passes, fails, allPass: okAll };
writeFileSync(join(HERE, '_runner_selftest_report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`TOTAL: ${passes} PASS, ${fails} FAIL ${okAll ? '— ALL PASS' : '— FEIL'}`);
process.exit(okAll ? 0 : 1);
