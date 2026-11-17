/**
 * Runner selftest — child-prosess, ett scenario (test:lang[:flag]) — [BYGG] #3840.
 *
 * Emulerer en testside i node: ekte ES-modulgraf fra out/_app/run.js (produksjons-
 * kopien med '@BA@/'-rewrites), stubbede dokument/localStorage/fetch/Blob/URL.
 * Driveren (søsterfila) spawn'er dette per scenario og aggregerer.
 *
 * Scenarier:
 *   persona:no            — trait-path, 50 items, rapport + PDF + retake
 *   iq:en:degraded        — composite-def 404 → runtime-fallback → g-score path, 44 items
 *   rel:en                — 16 items, fire dimensjoner
 *   rel:no:missingdef     — def 404 → ærlig feilboks (defMissing)
 *
 * Stdout: siste linje = JSON { pass, fail, checks:[{name,ok,detail?}] }.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const APP = join(REPO, 'out', '_app');

/* ---------------- scenario: test:lang[:flag] ---------------- */
const scenario = process.argv[2] || '';
const [test, lang, flag] = scenario.split(':');
if (!test || !lang) throw new Error('child: bruk _runner_selftest_child.mjs <test>:<lang>[:flag]');

/* ---------------- DOM-stub ---------------- */
class StyleObj { constructor() {} setProperty() {} }
class E {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parentElement = null;
    this._classes = '';
    this._attrs = new Map();
    this._listeners = {};
    this.style = new StyleObj();
    this._text = '';
    this._innerHTML = '';
    this.tabIndex = undefined;
    this.hidden = false;
    this.disabled = false;
    this.dataset = {};
  }
  get className() { return this._classes; }
  set className(v) { this._classes = String(v || ''); }
  get textContent() { return this.children.length ? this.children.map((c) => c.textContent).join('') : this._text; }
  set textContent(v) { this._text = String(v); this.children = []; this._innerHTML = ''; }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(v) { this._innerHTML = String(v); this.children = []; this._text = ''; }
  get classList() {
    const self = this;
    const set = new Set(self._classes.split(/\s+/).filter(Boolean));
    return {
      add: (...cs) => { cs.forEach((c) => set.add(c)); self._classes = [...set].join(' '); },
      remove: (...cs) => { cs.forEach((c) => set.delete(c)); self._classes = [...set].join(' '); },
      contains: (c) => set.has(c),
      toggle: (c, force) => {
        const want = force === undefined ? !set.has(c) : Boolean(force);
        if (want) set.add(c); else set.delete(c);
        self._classes = [...set].join(' ');
        return want;
      },
    };
  }
  setAttribute(k, v) { this._attrs.set(k, String(v)); if (k === 'class') this._classes = String(v); }
  getAttribute(k) { return this._attrs.has(k) ? String(this._attrs.get(k)) : null; }
  addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); }
  removeEventListener() {}
  click() { for (const f of this._listeners.click || []) f({ preventDefault() {} }); }
  focus() {}
  appendChild(c) { if (!c) return c; if (c.parentElement) c.parentElement.removeChild(c); c.parentElement = this; this.children.push(c); return c; }
  removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentElement = null; }
  contains(x) { return this.children.includes(x); }
}
function walk(root, fn) {
  for (const c of root.children.slice()) { fn(c); walk(c, fn); }
}
function byClass(root, cls) {
  const out = [];
  walk(root, (e) => { if (typeof e.className === 'string' && e.className.split(/\s+/).includes(cls)) out.push(e); });
  return out;
}

const realTest = { rel: 'relational' }[test] || test;
const mount = new E('div');
const bootScript = new E('script');
bootScript.dataset.baRun = `${realTest}:${lang}`;
const headEl = new E('head');
const bodyEl = new E('body');
const documentStub = {
  readyState: 'complete',
  head: headEl,
  body: bodyEl,
  createElement: (tag) => new E(tag),
  getElementById: (id) => (id === 'ba-run-boot' ? bootScript : id === mount.id ? mount : null),
  addEventListener: () => {},
};
mount.id = `ba-run-${realTest}-${lang}`;

/* ---------------- localStorage-stub ---------------- */
const mem = new Map();
const storageStub = {
  get length() { return mem.size; },
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { mem.set(String(k), String(v)); },
  removeItem: (k) => { mem.delete(String(k)); },
  key: (i) => [...mem.keys()][i] ?? null,
};

/* ---------------- fetch-stub (disk over out/_app + 404-flagg) ---------------- */
async function fetchStub(input) {
  const url = new URL(String(input instanceof URL ? input.href : input));
  const path = decodeURIComponent(url.pathname);
  let miss = false;
  if (flag === 'degraded' && path.includes('def-evne-g-44.')) miss = true;
  if (flag === 'missingdef' && path.includes(`def-${{persona:'ipip50-big5',relational:'rel-16',iq:'evne-g-44'}[realTest]}.`)) miss = true;
  if (!miss && existsSync(path)) {
    const buf = readFileSync(path);
    return {
      ok: true, status: 200,
      arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      json: async () => JSON.parse(buf.toString('utf8')),
      text: async () => buf.toString('utf8'),
    };
  }
  return { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0), json: async () => { throw new Error('404'); }, text: async () => '' };
}

/* ---------------- globaler ---------------- */
class BlobStub { constructor(parts, opts) { this.parts = parts; this.type = (opts && opts.type) || ''; BlobStub.lastLen = parts && parts[0] && parts[0].length || 0; BlobStub.count = (BlobStub.count||0)+1; } }
const createdObjectUrls = [];
globalThis.document = documentStub;
globalThis.localStorage = storageStub;
globalThis.fetch = fetchStub;
globalThis.Blob = BlobStub;
globalThis.location = { reload() { globalThis.__reloaded = true; } };
globalThis.URL = class extends URL { static createObjectURL(u) { createdObjectUrls.push(String(u)); return 'blob:stub:' + createdObjectUrls.length; } static revokeObjectURL() {} };
globalThis.window = globalThis.clicklog = undefined;

/* ---------------- kjør ---------------- */
const checks = [];
const ck = async (name, cond, detail) => { checks.push({ name, ok: Boolean(cond), detail: detail === undefined ? undefined : String(detail) }); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await import('file://' + join(APP, 'run.js'));

  /* S1: css injisert, boot leste markøren */
  await sleep(150);
  ck('S1.css-injisert', headEl.children.some((e) => e.tagName === 'STYLE'));
  if (flag === 'missingdef') {
    /* ærlig feilboks: defMissing-tekst */
    const errs = byClass(mount, 'ba-run-result');
    ck('S1.err-box', errs.length === 1);
    const txt = errs.map((e) => e.textContent).join('');
    ck('S1.err-defMissing-tekst', /spørsmålsdata mangler/.test(txt) || /question data missing/.test(txt), txt.slice(0, 60));
    finish();
    return;
  }

  /* S2: motor mountet (main.ba-test) og første spørsmål synlig */
  let mains = byClass(mount, 'ba-test');
  for (let i = 0; i < 50 && mains.length === 0; i++) { await sleep(60); mains = byClass(mount, 'ba-test'); }
  if (mains.length === 0) {
    const dump = [];
    walk(mount, (e) => dump.push(e.tagName + '.' + (e.className || '') + ':' + String(e.textContent || '').slice(0, 40)));
    ck('S2.mount', false, 'mount-tomme; innhold: ' + dump.join(' | ').slice(0, 300));
    finish();
    return;
  }
  ck('S2.mount', mains.length === 1);
  if (mains.length !== 1) { finish(); return; }
  if (flag === 'degraded') {
    const note = byClass(mount, 'ba-run-note').map((e) => e.textContent).join(' ');
    const classDump = []; walk(mount, (e) => { if ((e.className||'').includes('ba-run')) classDump.push(e.className); });
    ck('S2.degraded-banner', /Nedgradert modus/.test(note) || /Degraded mode/.test(note), 'note=[' + note.slice(0,60) + '] klasser=' + classDump.join(',').slice(0,120));
  }

  const expectedLen = test === 'persona' ? 50 : test === 'iq' ? 44 : 16;

  /* S3: besvar alt (første alternativ + Neste) til resultatet vises */
  let clicks = 0;
  for (let i = 0; i < expectedLen + 6; i++) {
    const result = byClass(mount, 'ba-run-result');
    if (result.length > 0) break;
    const opts = byClass(mount, 'ba-opt').filter((b) => !b._classes.includes('ba-resume-quit'));
    ck(`S3.opt-${i}`, opts.length >= 2, 'fant ' + opts.length);
    if (opts.length < 2) { finish(); return; }
    opts[0].click(); clicks++;
    await sleep(0);
    const nav = byClass(mount, 'ba-nav');
    const nextBtn = nav.flatMap((n) => n.children).find((c) => c.tagName === 'BUTTON' && !c.disabled);
    if (!nextBtn) { ck('S3.neste-' + i, false, 'neste disabled/ukjent'); finish(); return; }
    nextBtn.click();
    await sleep(0);
  }
  const resultBoxes = byClass(mount, 'ba-run-result');
  ck('S3.resultat-etter-fullføring', resultBoxes.length === 1, 'clicks=' + clicks);
  if (resultBoxes.length !== 1) { finish(); return; }
  ck('S3.antall-svar', clicks === expectedLen, `${clicks} != ${expectedLen}`);

  /* S4: rapportinnhold — esc-et renderReport-HTML med testId + normNote */
  const reportHtml = resultBoxes[0].children.flatMap((c) => (c.className || '').includes('ba-run-report') ? [c._innerHTML] : []).join('');
  const idMap = { persona: 'ipip50-big5', iq: 'evne-g-44', relational: 'rel-16' };
  const defId = idMap[realTest] || idMap[test];
  ck('S4.testId-i-rapport', reportHtml.includes(`[${defId}`) || reportHtml.includes(defId), defId + ' fantes ikke');
  const normMarkers = { persona: 'prosent av skalaens omfang', iq: 'IQ', relational: 'prosent av skalaens omfang' };
  const nm = normMarkers[realTest] || normMarkers[test] || 'skala';
  ck('S4.normnote', reportHtml.toLowerCase().includes(nm.toLowerCase()) || reportHtml.includes('not normed'), '');

  /* S5: persistens */
  ck('S5.result-lagret', mem.has(`ba-run:result:${defId}`));
  ck('S5.økt-tømt', ![...mem.keys()].some((k) => k.startsWith('brainarea:v1:session:')));

  /* S6: attention-linje (clean eller flagged) */
  const att = byClass(mount, 'ba-run-att').map((e) => e.textContent).join(' ');
  ck('S6.attention-linje', /kontrollert|checked/.test(att), att.slice(0, 60));

  /* S7: delingstekst — dyadisk graf er FASE 4 (ærlig tekst, ingen falsk knapp) */
  ck('S7.delingslinje', /delbar|shareable/i.test(att));

  /* S8: PDF via ekte renderReportPdf */
  const pdfBtn = byClass(mount, 'ba-run-actions').flatMap((a) => a.children).find((b) => b.tagName === 'BUTTON');
  ck('S8.pdf-knapp', Boolean(pdfBtn));
  if (pdfBtn) {
    pdfBtn.click();
    await sleep(120);
    ck('S8.pdf-bytes', BlobStub.lastLen > 1000, 'lastLen=' + BlobStub.lastLen);
    ck('S8.object-url', createdObjectUrls.length >= 1);
  }
  /* retake-knappen */
  const btns = byClass(mount, 'ba-run-actions').flatMap((a) => a.children).filter((b) => b.tagName === 'BUTTON');
  ck('S9.to-knapper', btns.length === 2, String(btns.length));
  const retakeBtn = btns[1];
  if (retakeBtn) {
    retakeBtn.click();
    await sleep(30);
    ck('S9.retake-tømmer', !mem.has(`ba-run:result:${defId}`) && ![...mem.keys()].some((k) => k.startsWith('brainarea:v1:')));
    ck('S9.reload', globalThis.__reloaded === true);
  }
  finish();
}

function finish() {
  const pass = checks.filter((c) => c.ok).length;
  const fail = checks.length - pass;
  console.log(JSON.stringify({ pass, fail, checks }));
  process.exit(fail ? 1 : 0);
}

process.on('unhandledRejection', (e) => {
  checks.push({ name: 'UNHANDLED-REJECTION', ok: false, detail: (e && e.message) || String(e) });
  finish();
});
process.on('uncaughtException', (e) => {
  checks.push({ name: 'UNCAUGHT-EXCEPTION', ok: false, detail: (e && e.message) || String(e) });
  finish();
});
main().catch((e) => { checks.push({ name: 'FATAL', ok: false, detail: e.message }); finish(); });
