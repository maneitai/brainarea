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
function byDataset(root, key, val) {
  const out = [];
  walk(root, (e) => { if (e._attrs && e._attrs.get(key) === val) out.push(e); });
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
const fetchCalls = [];
async function fetchStub(input, opts) {
  const method = (opts && opts.method) || 'GET';
  const url = new URL(String(input instanceof URL ? input.href : input));
  const path = decodeURIComponent(url.pathname);
  fetchCalls.push({ method, path });
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
globalThis.location = { origin: 'https://selftest.local', reload() { globalThis.__reloaded = true; } };
globalThis.URL = class extends URL { static createObjectURL(u) { createdObjectUrls.push(String(u)); return 'blob:stub:' + createdObjectUrls.length; } static revokeObjectURL() {} };
globalThis.window = globalThis.clicklog = undefined;

/* ---------------- kjør ---------------- */
const checks = [];
const ck = async (name, cond, detail) => { checks.push({ name, ok: Boolean(cond), detail: detail === undefined ? undefined : String(detail) }); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- puzzle-flyten (#3841) ---------------- */
/* Full spillgjennomgang i stub-DOM: start -> 16 etasjer (foerste valg + retry
   der det trengs) -> resultat (theta aehrlig) -> delekort -> endless -> POST. */
async function puzzleFlow() {
  const isNo = lang === 'no';
  const start = byDataset(mount, 'data-puz', 'start')[0];
  ck('P1.start-knapp', Boolean(start));
  if (!start) return;
  ck('P1.startskjerm-tekst', mount.textContent.includes(isNo ? 'Sekvensmester' : 'Sequence Master'));

  start.click(); await sleep(20);
  let tiles = byClass(mount, 'puz-tiles').flatMap((d) => d.children);
  let optBtns = byClass(mount, 'puz-opts').flatMap((d) => d.children).filter((b) => b.tagName === 'BUTTON');
  ck('P2.spill-synlig', tiles.length >= 4 && optBtns.length === 4, `tiles=${tiles.length} opts=${optBtns.length}`);
  ck('P2.flis-a11y', (tiles[0].getAttribute('aria-label') || '').length > 3);

  /* P3: spalle 16 etasjer — foerste valg = alternativ 0; der retry finnes, extra = alternativ 1 */
  let clicks = 0;
  for (let floor = 0; floor < 16; floor++) {
    const nb = byDataset(mount, 'data-puz', 'next')[0];
    if (nb && !nb._classes.includes('puz-hidden')) { /* lukket allerede (skulle vaert umulig her) */ }
    let tries = 0;
    for (; tries < 2; tries++) {
      const nextB = byDataset(mount, 'data-puz', 'next')[0];
      if (nextB && !nextB._classes.includes('puz-hidden')) break;
      const optsNow = byClass(mount, 'puz-opts').flatMap((d) => d.children).filter((b) => b.tagName === 'BUTTON' && !b.disabled);
      ck(`P3.velg-${floor}-${tries}`, optsNow.length === 4, 'fant ' + optsNow.length);
      if (optsNow.length < 4) return;
      optsNow[tries === 0 ? 0 : 1].click(); clicks++;
      await sleep(0);
    }
    const nb2 = byDataset(mount, 'data-puz', 'next')[0];
    ck(`P3.etasje-lukket-${floor}`, Boolean(nb2) && !nb2._classes.includes('puz-hidden'), ' NEXT ikke synlig etter ' + tries + ' valg');
    if (!nb2 || nb2._classes.includes('puz-hidden')) return;
    nb2.click(); await sleep(0);
  }

  /* P4: resultatet */
  const res = byClass(mount, 'puz-result')[0];
  ck('P4.resultat-synlig', Boolean(res) && !res._classes.includes('puz-hidden'));
  const allTxt = res ? res.textContent : '';
  ck('P4.theta-tekst', allTxt.includes(isNo ? 'estimat ' : 'estimate '), allTxt.slice(0, 60));
  ck('P4.nivaa', /etasje 16 av 16|floor 16 of 16/i.test(allTxt), allTxt.slice(40, 120));
  ck('P4.ikke-IQ-disclaimer', /ikke et IQ-tall|not an IQ number/.test(allTxt));

  /* P5: persistens-kontrakten */
  ck('P5.runState-lagret', mem.has('brainarea:puzzle-v1:runState:standard'));
  try {
    const st = JSON.parse(mem.get('brainarea:puzzle-v1:runState:standard'));
    ck('P5.finished', st.finished === true);
    ck('P5.foerste-respons-16', Object.keys(st.firstAnswers || {}).length === 16);
  } catch (e) { ck('P5.finished', false, String(e).slice(0, 80)); }
  ck('P5.ingen-runner-resultat', ![...mem.keys()].some((k) => k.startsWith('ba-run:result:')));

  /* P6: delekort */
  const sb = byDataset(mount, 'data-puz', 'share')[0];
  if (sb) { sb.click(); await sleep(0); }
  const shareEl = byClass(mount, 'puz-shareText')[0];
  ck('P6.deletekst', Boolean(shareEl) && shareEl.textContent.length > 10, shareEl ? shareEl.textContent.slice(0, 40) : 'mangler');

  /* P7: endless — klikk til run-et er over (feil avslutter) */
  const eb = byDataset(mount, 'data-puz', 'endless')[0];
  ck('P7.endless-knapp', Boolean(eb));
  if (eb) {
    eb.click(); await sleep(0);
    for (let i = 0; i < 40; i++) {
      /* SISTE puz-opts = endless-seksjonens (spill-seksjonens opts er disabled-
         rester fra siste etasje — stub-DOM ignorerer disabled ved klikk). */
      const optRows = byClass(mount, 'puz-opts');
      const eob = (optRows[optRows.length - 1] || { children: [] }).children.filter((b) => b.tagName === 'BUTTON');
      if (eob.length === 0) break; /* ferdig-run: opts tømt */
      eob[eob.length - 1].click(); await sleep(0);
    }
    const esec = byClass(mount, 'puz-endless')[0];
    ck('P7.endless-highscore', Boolean(esec) && /Endless-rekord|Endless record/.test(esec.textContent), esec ? esec.textContent.slice(0, 60) : 'mangler');
  }

  /* P8: normering-POST logget (FASE 4-endepunkt; stub svarer 404, svelges) */
  ck('P8.normering-POST', fetchCalls.some((c) => c.method === 'POST' && c.path.includes('/normering')),
    JSON.stringify(fetchCalls.filter((c) => c.method === 'POST')));
}

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

  if (test === 'puzzle') { await puzzleFlow(); finish(); return; }

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
