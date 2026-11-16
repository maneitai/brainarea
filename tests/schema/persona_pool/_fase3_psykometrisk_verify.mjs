// FASE 3 [VERIFISER] psykometrisk nivaa av NO-oversettelsen (persona_pool).
// Sjekker noekling-integritet, gloss-laasing, rettelser, holds, balanse og artefakter.
// Kjoer: node _fase3_psykometrisk_verify.mjs   -> ALLE PASS | exit 1
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const J = p => JSON.parse(fs.readFileSync(p, "utf8"));
const norm = s => String(s).trim().replace(/\s+/g, " ").toLowerCase();
let n = 0, f = 0;
const P = (ok, tag, msg) => { n++; if (!ok) f++; console.log((ok ? "PASS " : "FAIL ") + tag + " " + msg); };

const POOLS = ["e-a", "o-c", "n-rest"];
const pools = {}, ens = {};
for (const s of POOLS) { pools[s] = J(path.join(here, "def-persona-pool-" + s + ".no.json")); ens[s] = J(path.join(here, "def-persona-pool-" + s + ".en.json")); }
const liveNo = J(path.join(root, "def-ipip50-big5.no.json"));
const liveEn = J(path.join(root, "def-ipip50-big5.en.json"));
const gloss = J(path.join(here, "_live_gloss_map.json"));
const sheet = J(path.join(here, "_oversettelse_review_sheet.json"));
const verdict = J(path.join(here, "_fase3_personality_verdict.json"));

// 1. volum + id-paritet
for (const s of POOLS) {
  const noIds = pools[s].items.map(i => i.id).sort(), enIds = ens[s].items.map(i => i.id).sort();
  P(JSON.stringify(noIds) === JSON.stringify(enIds) && noIds.length === 100 * (s === "n-rest" ? 0.75 : 1), "IDS", s + " " + noIds.length + " items en==no");
}
P(POOLS.reduce((a, s) => a + pools[s].items.length, 0) === 275, "COUNT", "275 items totalt");

// 2. noekling-paritet per item: kind + scales(id,sign) + option-value-sekvens EN==NO
const parBad = [];
for (const s of POOLS) {
  const en = Object.fromEntries(ens[s].items.map(i => [i.id, i]));
  for (const it of pools[s].items) {
    const e = en[it.id];
    if (!e || it.kind !== e.kind || JSON.stringify(it.scales) !== JSON.stringify(e.scales) || JSON.stringify(it.options.map(o => o.value)) !== JSON.stringify(e.options.map(o => o.value))) parBad.push(s + "/" + it.id);
  }
}
P(parBad.length === 0, "KEYING", "kind+scales+option-verdier identiske EN==NO for 275/275; avvik: " + (parBad.join(",") || "none"));

// 3. options-labels: NO-sett == live-NO, EN-sett == live-EN (S5-kontrakten)
const oNo = JSON.stringify(liveNo.items[0].options.map(o => [o.label, o.value]));
const oEn = JSON.stringify(liveEn.items[0].options.map(o => [o.label, o.value]));
let lBad = 0, eBad = 0;
for (const s of POOLS) for (const it of pools[s].items) if (JSON.stringify(it.options.map(o => [o.label, o.value])) !== oNo) lBad++;
for (const s of POOLS) for (const it of ens[s].items) if (JSON.stringify(it.options.map(o => [o.label, o.value])) !== oEn) eBad++;
P(lBad === 0 && eBad === 0, "OPTIONS", "alle 275 NO-optionsett == live-NO og 275 EN-optionsett == live-EN (avvik NO:" + lBad + " EN:" + eBad + ")");

// 4. gloss-laget: alle items hvis EN-tekst finnes i gloss-maapet har NO == gloss-verdi
const gNorm = {}; Object.keys(gloss).forEach(k => { gNorm[norm(k)] = norm(gloss[k]); });
const glossIds = new Set(); const gDev = [];
for (const s of POOLS) {
  const en = Object.fromEntries(ens[s].items.map(i => [i.id, i.text]));
  for (const it of pools[s].items) {
    const g = gNorm[norm(en[it.id] || "")];
    if (g !== undefined) { glossIds.add(s + "/" + it.id); if (norm(it.text) !== g) gDev.push(s + "/" + it.id); }
  }
}
P(gDev.length === 0, "GLOSS", "gloss-laaste items: " + glossIds.size + " (e-a/o-c/n-rest forventet 50), avvik mot live-def: " + (gDev.join(",") || "0"));

// 5. rettelser anvendt (pool-noeklet; dimension.* paa dims) — gloss-lauste items uroert
const lockedCorrected = [];
for (const r of verdict.rettelser) {
  if (String(r.id).startsWith("dimension.")) {
    const [_, dimId, fld] = r.id.split(".");
    const dim = pools[r.pool].dimensions.find(d => d.id === dimId);
    if (!dim || norm(String(dim[fld])) !== norm(String(r.after))) { P(false, "REFTELSE", r.pool + " " + r.id); continue; }
    P(true, "REFTELSE", r.pool + " " + r.id + " = '" + r.after + "'");
    continue;
  }
  const it = pools[r.pool].items.find(i => i.id === r.id);
  const ok = it && norm(it.text) === norm(r.after);
  if (ok && glossIds.has(r.pool + "/" + r.id)) lockedCorrected.push(r.id);
  P(!!ok, "REFTELSE", r.pool + "/" + r.id + " [" + r.klasse + "] anvendt");
}
P(lockedCorrected.length === 0, "GLOSS-UREART", "rettelser som roerer gloss-laust lag: " + (lockedCorrected.join(",") || "ingen"));

// 6. holds fortsatt til stede
let hOk = 0;
for (const h of verdict.holds) { const it = pools[h.pool] && pools[h.pool].items.find(i => i.id === h.id); if (it && norm(it.text) === norm(h.no)) hOk++; }
P(hOk === verdict.holds.length, "HOLDS", hOk + "/" + verdict.holds.length + " holds uendret");

// 7. per-dimensjon balanse: 55 items hver tvers pools; negativandel i [0.3,0.7]
const perDim = {}, negShare = {};
for (const s of POOLS) for (const it of pools[s].items) { const sc = it.scales[0]; perDim[sc.id] = (perDim[sc.id] || 0) + 1; const k = s + ":" + sc.id; negShare[k] = negShare[k] || [0, 0]; negShare[k][1]++; if (sc.sign < 0) negShare[k][0]++; }
P(Object.keys(perDim).length === 5 && Object.values(perDim).every(v => v === 55), "BALANSE", "5x55=275 per dimensjon: " + JSON.stringify(perDim));
P(Object.entries(negShare).every(([, [neg, tot]]) => neg / tot >= 0.3 && neg / tot <= 0.7), "SIGN-VINDU", "negativandel per pool:dim innen 30-70%: " + JSON.stringify(Object.fromEntries(Object.entries(negShare).map(([k, [a, b]]) => [k, Math.round(100 * a / b) + "%"]))));

// 8. nordiske artefakter
const arts = [];
for (const s of POOLS) for (const it of pools[s].items) if (/[öä]/.test(it.text) || /\boch\b/i.test(it.text) || /\bked\b|\baf\b/i.test(it.text) || /Planmessighet|målrettethet/.test(it.text)) arts.push(s + "/" + it.id);
P(arts.length === 0, "ARTEFAKTER", (arts.join(",") || "0 (svensk/dansk/legacy-formuleringer borte)"));

// 9. ingen identiske NO-tekster in-pool eller tvers pools
const seen = {}; const dups = [];
for (const s of POOLS) for (const it of pools[s].items) { const k = norm(it.text); if (seen[k]) dups.push(s + "/" + it.id + " (ogsaa " + seen[k] + ")"); else seen[k] = s + "/" + it.id; }
P(dups.length === 0, "DUBLIKATER", (dups.join(" | ") || "0 identiske NO-tekster"));

// 10. re-noeklings-sonde: kjente positiv-restrukturerte items beholder EN-sign
const restr = [["e-a", "e-0005"], ["o-c", "c-0027"]];
let rOk = 0;
for (const [s, id] of restr) { const no_ = pools[s].items.find(i => i.id === id), en = ens[s].items.find(i => i.id === id); if (JSON.stringify(no_.scales) === JSON.stringify(en.scales)) rOk++; }
P(rOk === restr.length, "RESTRUKTURERING", "positiv-omformulerte items (e-0005, c-0027) beholder EN-sign/nøkling: " + rOk + "/" + restr.length);

// 11. sheet-arkivrolle: pre-fix snapshot skal skille seg fra fil akkurat paa de 13 rettede radene
const stale = [];
for (const sh of sheet) { const cur = pools[sh.batch] && pools[sh.batch].items.find(i => i.id === sh.id); if (!cur) { stale.push(sh.batch + "/" + sh.id + "?"); continue; } if (norm(cur.text) !== norm(sh.no)) stale.push(sh.batch + "/" + sh.id); }
P(new Set(stale).size === 13 && stale.every(x => !x.includes("?")), "SHEET-ARKIV", "review-sheet = pre-fix snapshot; avvikende rader = akkurat de 13 rettede (" + stale.join(", ") + ")");

console.log(f === 0 ? "ALLE PASS (" + n + " sjekker)" : "FEIL: " + f + " av " + n);
process.exit(f === 0 ? 0 : 1);
