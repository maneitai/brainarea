#!/usr/bin/env node
// Push-and-verify channel for Brainarea.
//   node scripts/push.mjs "commit message" [--publish]
//
// Gates BEFORE commit/push: npm test + npm run build must pass.
// AFTER push: waits for the `build` workflow on the pushed SHA and fails loudly
// if it does not go green. --publish also triggers the manual `pages`
// workflow and waits until the site is deployed.
import { execSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const G = (c, t = 60000) => execSync(c, { cwd: REPO, encoding: "utf8", timeout: t });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fail = (m) => { console.error("FAIL: " + m); process.exit(1); };

const msg = process.argv[2];
const doPublish = process.argv.includes("--publish");
if (!msg) fail('usage: node scripts/push.mjs "commit message" [--publish]');

const origin = G("git remote get-url origin").trim();
const slug = origin.replace(/.*github\.com[:\/]/, "").replace(/\.git$/, "");
if (!/^[^\/]+\/[^\/]+$/.test(slug)) fail("unexpected origin: " + origin);

let dirty = "";
try { dirty = G("git status --porcelain").trim(); } catch (e) { fail("not a git repo: " + e.message); }

if (!dirty) {
  console.log("OK: working tree clean, nothing to commit.");
} else {
  console.log("[1/6] npm test (engine invariants) ...");
  try { G("npm test", 180000); } catch (e) { fail("tests failed:\n" + (e.stdout || "") + (e.stderr || "")); }
  console.log("      tests OK");
  console.log("[2/6] npm run build (production export) ...");
  try { G("npm run build", 300000); } catch (e) { fail("build failed:\n" + (e.stdout || "") + (e.stderr || "")); }
  console.log("      build OK");
  console.log("[3/6] commit + push ...");
  G("git add -A");
  const c = spawnSync("git", ["commit", "-m", msg], { cwd: REPO, encoding: "utf8", timeout: 60000 });
  if (c.status !== 0) fail("commit failed:\n" + (c.stdout || "") + (c.stderr || ""));
  try { G("git push", 120000); } catch (e) { fail("push failed:\n" + (e.stdout || "") + (e.stderr || "")); }
  console.log("      pushed");
}

const sha = G("git rev-parse HEAD").trim();
const short = sha.slice(0, 7);
const runs = (wf) => {
  const out = G(`gh run list --repo ${slug} --workflow ${wf} --limit 20 --json databaseId,headSha,status,conclusion,displayTitle,createdAt`, 60000);
  return JSON.parse(out);
};

console.log("[4/6] waiting for CI on " + short + " ...");
const dl = Date.now() + 300000;
let run = null;
while (Date.now() < dl) {
  const rs = runs("build").filter((r) => r.headSha === sha);
  if (rs.length) { run = rs[0]; if (run.status === "completed") break; }
  await sleep(10000);
}
if (!run) fail("no CI run appeared for " + short + " within 5 min");
if (run.conclusion !== "success") fail("CI " + run.conclusion + ": https://github.com/" + slug + "/actions/runs/" + run.databaseId);
console.log("      CI green: https://github.com/" + slug + "/actions/runs/" + run.databaseId);

if (doPublish) {
  console.log("[5/6] publish: dispatching pages workflow ...");
  const before = new Set(runs("pages").map((r) => r.databaseId));
  G("gh workflow run pages --repo " + slug, 60000);
  let p = null;
  const dlP = Date.now() + 90000;
  while (!p && Date.now() < dlP) {
    const rs = runs("pages").filter((r) => !before.has(r.databaseId));
    if (rs.length) p = rs[0]; else await sleep(5000);
  }
  if (!p) fail("pages run did not appear within 90 s");
  while (p.status !== "completed") {
    await sleep(15000);
    const rs = runs("pages").filter((r) => r.databaseId === p.databaseId);
    if (rs.length) p = rs[0];
    if (Date.now() > Date.now() + 900000) fail("pages run timed out");
  }
  if (p.conclusion !== "success") fail("pages " + p.conclusion + ": https://github.com/" + slug + "/actions/runs/" + p.databaseId);
  console.log("      deployed: https://" + slug.split("/")[0] + ".github.io/" + slug.split("/")[1] + "/");
} else {
  console.log("[5/6] publish skipped (no --publish)");
}

console.log("[6/6] summary:");
console.log("  commit:  https://github.com/" + slug + "/commit/" + sha.slice(0, 7));
console.log("  CI:      green (" + run.conclusion + ")");
console.log("  site:    https://" + slug.split("/")[0] + ".github.io/" + slug.split("/")[1] + "/");
