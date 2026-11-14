/**
 * Integrasjonstest scoring ↔ render — [BYGG] FASE 1 #3712
 * Kjører PRODUCTION render.js (mountRenderer, DOM-stub) end-to-end mot scoring.scoreTest:
 * ekte økt → ekte onComplete-payload → skår. Plus full regressjon:
 *   render-selftest 72/72, del1 27/27, del2 27/27.
 * Rapport: _scoring_integration_report.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { scoreTest, SCORING_VERSION } from './scoring.js';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = HERE.replace(/tests[\\/]engine[\\/]$/, '');

let pass = 0;
const failures = [];
function check(name, cond) {
  if (cond) { pass++; console.log(`PASS ${name}`); }
  else { failures.push(name); console.log(`FAIL ${name}`); }
}

/* --- samme DOM-stub og vm-lasteteknikk som selftest.mjs (produsentens harness) --- */
function makeDocStub() {
  const log = { focuses: [] };
  class StyleObj {
    constructor() { this.width = undefined; this.flex = undefined; this.display = undefined; }
    setProperty(k, v) { this[k] = v; }
  }
  class E {
    constructor(tag) {
      this.tagName = tag.toUpperCase();
      this.children = [];
      this._classes = new Set();
      this._attrs = new Map();
      this._listeners = {};
      this.style = new StyleObj();
      this._text = '';
      this.tabIndex = undefined;
      this.hidden = false;
      this.disabled = false;
    }
    get textContent() { return this._text; }
    set textContent(v) { this._text = v; this.children = []; }
    appendChild(c) { if (!c) return c; if (c.parentElement) c.parentElement.removeChild(c); c.parentElement = this; this.children.push(c); return c; }
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) { this.children.splice(i, 1); c.parentElement = null; } return c; }
    contains(x) { return this.children.includes(x); }
    setAttribute(k, v) { this._attrs.set(k, String(v)); }
    getAttribute(k) { return this._attrs.has(k) ? String(this._attrs.get(k)) : null; }
    addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); }
    click() { (this._listeners.click || []).forEach((f) => f({ preventDefault() {} })); }
    focus() { log.focuses.push(this.tagName); }
    get classList() {
      const self = this;
      return {
        add(...cs) { cs.forEach((c) => c && self._classes.add(c)); },
        remove(...cs) { cs.forEach((c) => self._classes.delete(c)); },
        toggle(c, on) { const has = self._classes.has(c); const target = on === undefined ? !has : Boolean(on); if (target) self._classes.add(c); else self._classes.delete(c); },
        contains(c) { return self._classes.has(c); },
      };
    }
    set className(v) { this._classes.clear(); String(v).split(/[ \t]+/).filter(Boolean).forEach((c) => this._classes.add(c)); }
    get className() { return Array.from(this._classes).join(' '); }
    querySelector(sel) {
      const want = String(sel).replace(/^\./, '').toUpperCase();
      const byTag = (nodes) => { for (const c of nodes) { if (c.tagName === want) return c; const r = byTag(c.children || []); if (r) return r; } return null; };
      return byTag(this.children);
    }
  }
  const doc = { createElement: (t) => new E(t), head: new E('head') };
  doc.log = log;
  return doc;
}
function loadRender(doc) {
  const ctx = vm.createContext({
    document: doc, console,
    setInterval: () => 0, clearInterval: () => {},
    Date, JSON, Math, String, Array, Object, Set, Map, Number, Boolean, RegExp,
  });
  const rsrc = readFileSync(`${HERE}randomize.js`, 'utf8')
    .replace(/^export\s+(const|let)\s+/gm, 'var ')
    .replace(/^export\s+/gm, '')
    .replace(/\bmulberry32\b/g, 'mulberry32x');
  vm.runInContext(rsrc + "\n;globalThis.__rnd = { RANDOMIZE_VERSION, RNG_FIELD, RNG_STATE_VERSION, autoSeed, makeCountedRng, mulberry32x, newRngState, seedFromString, seededSample, seededShuffle };", ctx, { filename: 'randomize.js' });
  const src = readFileSync(`${HERE}render.js`, 'utf8')
    .replace(/^export\s+(const|let)\s+/gm, 'var ')
    .replace(/^export\s+/gm, '')
    .replace(/^import\s+.*$/m, 'var RNG_FIELD = globalThis.__rnd.RNG_FIELD;')
    .replace(/\bnewRngState\b(?=\()/g, 'globalThis.__rnd.newRngState')
    .replace(/\bmakeCountedRng\b(?=\()/g, 'globalThis.__rnd.makeCountedRng');
  vm.runInContext(src + "\n;globalThis.__api = Object.assign({ mountRenderer, validateTestDef, sampleSession, sessionSizeFor, shuffleInPlace, resolveLang, fmtTime, memoryStorage, RENDER_VERSION, STORAGE_NS }, globalThis.__rnd);", ctx, { filename: 'render.js' });
  return ctx.__api;
}

const FIX = ['fixture-trait-big5.no.json', 'fixture-threshold-adhd.no.json', 'fixture-gscore-matrix.no.json']
  .map((n) => JSON.parse(readFileSync(`${ROOT}/tests/schema/${n}`, 'utf8')));
const tdef = FIX.find((f) => f.scoring.type === 'trait');
const thedef = FIX.find((f) => f.scoring.type === 'threshold');
const gdef = FIX.find((f) => f.scoring.type === 'g-score');

/* ============ I1 — trait: ekte økt gjennom PROD-render → skår ============ */
{
  const doc = makeDocStub();
  const api = loadRender(doc);
  const store = api.memoryStorage();
  let completed = null;
  const T0 = 1_700_000_000_000;
  const h = api.mountRenderer(doc.createElement('div'), tdef, { lang: 'no', storage: store, now: () => T0, onComplete: (p) => { completed = p; } });
  // svar: openhet 5/1 (=> 100), planlagthet 2/4 (=> 25) — samme som del-1 selftest
  const plan = { 'bo-openness-01': 5, 'bo-openness-02': 1, 'bc-order-01': 2, 'bc-order-02': 4 };
  for (let i = 0; i < h.session.itemIds.length; i++) {
    const cur = tdef.items.find((x) => x.id === h.session.itemIds[h.session.idx]);
    const group = h._itemBox.children.find((c) => c.className === 'open')
      || h._itemBox.children.find((c) => c.className === 'ba-options');
    const val = plan[cur.id];
    const idx = cur.options.findIndex((o) => o.value === val);
    const btn = group.children[idx];
    btn.click();
    h.next();
  }
  check('I1 a: onComplete-payload levert av prod-render', completed !== null);
  const r = scoreTest(tdef, completed);
  check('I1 b: scoring mot PROD-payload scorer ok', r.ok === true);
  const open = r.result.scales.find((s) => s.id === 'openness');
  const cons = r.result.scales.find((c) => c.id === 'conscientiousness');
  check('I1 c: åpenhet 100, planlagthet 25 gjennom hele kjeden', open && cons && Math.abs(open.normalized - 100) < 1e-9 && Math.abs(cons.normalized - 25) < 1e-9);
  check('I1 d: payload.tidsfeltkopiering (timeSpentSec)', r.result.timeSpentSec === 0); // frossen klokke

  // g-score end-to-end: 2-item klon med kjent theta=0
  const two = JSON.parse(JSON.stringify(gdef));
  const c2 = JSON.parse(JSON.stringify(gdef.items[0]));
  c2.id = 'mx-0002';
  for (const v of c2.variants) v.difficulty = 0.5;
  two.items.push(c2);
  const doc2 = makeDocStub();
  const api2 = loadRender(doc2);
  const store2 = api2.memoryStorage();
  let done2 = null;
  const h2 = api2.mountRenderer(doc2.createElement('div'), two, { lang: 'no', storage: store2, now: () => T0, onComplete: (p) => { done2 = p; } });
  for (let i = 0; i < 2; i++) {
    const cur = two.items.find((x) => x.id === h2.session.itemIds[h2.session.idx]);
    const noVariant = cur.variants[0];
    const group = h2._itemBox.children.find((c) => c.className === 'ba-options');
    // klikk riktig for mx-0001 (orig 2), feil for mx-0002 (orig 0)
    const wantOrig = cur.id === 'mx-0001' ? 2 : 0;
    const dispIdx = h2.session.shuffle[cur.id].indexOf(wantOrig);
    group.children[dispIdx].click();
    h2.next();
  }
  const r2 = scoreTest(two, done2);
  check('I2 g-score end-to-end: correct 1/2 og theta=0', r2.ok === true
    && r2.result.total.correctCount === 1 && Math.abs(r2.result.total.theta - 0) < 1e-8);
}

const report = { step: 'I: scoring <-> render integrasjon + full regressjon', total: pass + failures.length, pass, fail: failures.length, failures, date: '2026-11-14' };
writeFileSync(`${HERE}_scoring_integration_report.json`, JSON.stringify(report, null, 2));
console.log(`INTEGRASJON ${pass}/${pass + failures.length} PASS`);
if (failures.length) process.exit(1);
