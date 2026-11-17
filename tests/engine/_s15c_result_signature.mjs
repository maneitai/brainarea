/**
 * Selftest S15c — VISUELL-D resultat-signatur (todo #3852, app/run.js).
 *
 * Verifiserer den reelle fullføringskjeden i stub-DOM via out/_app/run.js
 * (produksjonskopien med '@BA@/'->'./'-rewrites — bygg FØRST):
 *   boot -> def-henting -> mountRenderer -> svar -> scoreTest -> renderReport
 *   -> showResult (identitetslinje, band-målestreng, delingsseksjon).
 *
 * Kjør: node app/build.js; deretter node tests/engine/_s15c_result_signature.mjs
 * Kaster hardt ved manglende produksjonsbygg (runner-driverens konvensjon).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const APP = join(REPO, 'out', '_app');

const fails = [];
let pass = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`PASS ${name}`); }
  else { fails.push(name); console.log(`FAIL ${name}${detail !== undefined ? ' — ' + String(detail).slice(0, 180) : ''}`); }
}

if (!existsSync(join(APP, 'run.js'))) throw new Error('out/_app/run.js mangler — kjør node app/build.js først');

/* ---------------- stub-DOM (runner-childens konvensjon) ---------------- */
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
    this.tabIndex = undefined;
    this.hidden = false;
    this.disabled = false;
    this.id = '';
    this.dataset = {};
  }
  get textContent() { return this.children.length ? this.children.map((c) => c.textContent).join('') : this._text; }
  set textContent(v) { this._text = String(v); this.children = []; this._innerHTML = ''; }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(v) { this._innerHTML = String(v); this.children = []; this._text = ''; }
  get className() { return this._classes; }
  set className(v) { this._classes = String(v || ''); }
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
  click() { for (const f of this._listeners.click || []) f({ preventDefault() {} }); }
  focus() {}
  appendChild(c) { if (!c) return c; if (c.parentElement) c.parentElement.removeChild(c); c.parentElement = this; this.children.push(c); return c; }
  removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentElement = null; }
}
function walk(root, fn) { for (const c of root.children.slice()) { fn(c); walk(c, fn); } }
function byClass(root, cls) {
  const out = [];
  walk(root, (e) => { if (typeof e.className === 'string' && e.className.split(/\s+/).includes(cls)) out.push(e); });
  return out;
}

/* ---------------- stub-miljø ---------------- */
const mem = new Map();
const storageStub = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  key: (i) => ([...mem.keys()][i]) ?? null,
  get length() { return mem.size; },
};
async function fetchStub(input) {
  const url = input instanceof URL ? input.href : String(input);
  const path = decodeURIComponent(url.replace(/^file:\/\//, '')).replace(/^\/([A-Za-z]:\/)/, '$1');
  if (existsSync(path)) {
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
const mount = new E('div');
mount.id = 'ba-run-persona-no'; /* readMark => mountId ba-run-<test>-<locale> */
const bootScript = new E('script');
bootScript.dataset.baRun = 'persona:no';
globalThis.document = {
  readyState: 'complete',
  head: new E('head'),
  body: new E('body'),
  createElement: (t) => new E(t),
  getElementById: (id) => (id === 'ba-run-boot' ? bootScript : id === mount.id ? mount : null),
  addEventListener: () => {},
};
globalThis.localStorage = storageStub;
globalThis.fetch = fetchStub;
globalThis.location = { origin: 'https://selftest.local', reload() { globalThis.__reloaded = true; } };

/* boot() kjører ved import (readyState=complete) */
await import('file://' + join(APP, 'run.js'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function untilResult(timeoutMs = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const r = byClass(mount, 'ba-run-result');
    if (r.length === 1 && r[0].children.length > 0 && byClass(mount, 'ba-run-report').length === 1) return r[0];
    await sleep(25);
  }
  const dump = [];
  walk(mount, (e) => dump.push(e.tagName + '.' + (e.className || '') + ':' + String(e.textContent || '').slice(0, 30)));
  throw new Error('resultatet sto ikke (mount-innhold): ' + dump.join(' | ').slice(0, 400));
}

async function answerAll(expectedLen) {
  /* S2-vente: motor-mount (main.ba-test) — 50×60ms som runner-childen */
  let mains = byClass(mount, 'ba-test');
  for (let i = 0; i < 50 && mains.length === 0; i++) { await sleep(60); mains = byClass(mount, 'ba-test'); }
  if (mains.length === 0) throw new Error('motoren monterte aldri (ingen main.ba-test)');
  let clicks = 0;
  for (let i = 0; i < expectedLen + 6; i++) {
    const result = byClass(mount, 'ba-run-result');
    if (result.length === 1 && result[0].children.length > 0 && byClass(mount, 'ba-run-report').length === 1) return clicks;
    const opts = byClass(mount, 'ba-opt').filter((b) => !b._classes.includes('ba-resume-quit'));
    if (opts.length < 2) throw new Error('besvaring stoppet: ' + opts.length + ' alternativer (steg ' + i + ')');
    opts[0].click(); clicks++;
    await sleep(0);
    const nav = byClass(mount, 'ba-nav');
    const nextBtn = nav.flatMap((n) => n.children).find((c) => c.tagName === 'BUTTON' && !c.disabled);
    if (!nextBtn) throw new Error('neste disabled ved steg ' + i);
    nextBtn.click();
    await sleep(0);
  }
  throw new Error('besvaring: ingen resultatbox etter ' + (expectedLen + 6) + ' steg');
}

/* ============ S15c-2: e2e persona:no ============ */
let capPct = null;
{
  const clicks = await answerAll(50);
  check('S15c-2.50-besvart', clicks === 50, String(clicks));
  const box = await untilResult();

  const titles = byClass(mount, 'ba-run-title');
  check('S15c-2.identitetslinje-tekst', titles.length === 1 && titles[0]._text === 'PERSONA', titles.map((t) => t._text).join(','));
  const h2 = box.children.find((c) => c.tagName === 'H2');
  check('S15c-2.identitetslinje-før-h2', titles.length === 1 && Boolean(h2) && box.children.indexOf(h2) === box.children.indexOf(titles[0]) + 1);

  const bands = byClass(mount, 'ba-run-band');
  check('S15c-2.band-tilstede', bands.length === 1, bands.length);
  const sv = bands[0] ? bands[0].children.find((c) => c.tagName === 'SVG') : null;
  check('S15c-2.band-svg-viewBox', Boolean(sv) && sv.getAttribute('viewBox') === '0 0 320 34', sv && sv.getAttribute('viewBox'));
  check('S15c-2.band-role-img-aria', Boolean(sv) && sv.getAttribute('role') === 'img' && (sv.getAttribute('aria-label') || '').includes('%'));
  const rects = sv ? sv.children.filter((c) => c.tagName === 'RECT') : [];
  check('S15c-2.band-2-rects', rects.length === 2, rects.length);
  const track = rects[0], fill = rects[1];
  check('S15c-2.band-track', track.getAttribute('x') === '8' && track.getAttribute('width') === '304', JSON.stringify([track.getAttribute('x'), track.getAttribute('width')]));
  const fillW = Number(fill.getAttribute('width'));
  const frac = fillW / 304;
  check('S15c-2.band-fill-i-spenn', fillW > 0 && fillW <= 304, String(fillW));
  check('S15c-2.band-fill-width-identitet', fill.getAttribute('width') === String(Math.round(304 * frac)), fill.getAttribute('width'));
  check('S15c-2.band-fill-rx', fill.getAttribute('rx') === '5');
  const mid = sv.children.filter((c) => c.tagName === 'LINE');
  check('S15c-2.band-midtlinje', mid.length === 1 && mid[0].getAttribute('x1') === mid[0].getAttribute('x2') && mid[0].getAttribute('stroke-dasharray') === '3 3');
  check('S15c-2.band-midt-x', mid[0] && mid[0].getAttribute('x1') === String(Math.round(8 + 304 * 0.5)), mid[0] && mid[0].getAttribute('x1'));
  const cap = bands[0].children.find((c) => c.className === 'ba-run-band-cap');
  check('S15c-2.band-caption-tekst', Boolean(cap) && /av skalaens omfang/.test(cap._text), cap && cap._text);
  capPct = cap ? Number((cap._text.match(/(\d+)\s?%/) || [])[1]) : NaN;
  check('S15c-2.band-caption-matcher-fill', Number.isFinite(capPct) && capPct === Math.round(frac * 100), `pct=${capPct} frac=${frac.toFixed(4)}`);
  check('S15c-2.band-caption-semantikk', Boolean(cap) && !/(gjennomsnitt|average|percentile|persentil|norm)/i.test(cap._text));

  const persisted = JSON.parse(mem.get('ba-run:result:ipip50-big5'));
  check('S15c-2.persist-5-scales', Array.isArray(persisted.result.scales) && persisted.result.scales.length === 5, String((persisted.result.scales || []).length));
  const composite = persisted.result.total.composite;
  check('S15c-2.composite-0-100', Number.isFinite(composite) && composite >= 0 && composite <= 100, String(composite));
  check('S15c-2.composite-match-toleranse1pp', Math.abs(Math.round(composite) - capPct) <= 1, `composite=${composite.toFixed(2)} pct=${capPct}`);

  check('S15c-2.share-seksjon', byClass(mount, 'ba-run-share').length === 1);
  check('S15c-2.share-head-DELING', (byClass(mount, 'ba-run-share-head')[0] || {})._text === 'DELING');
  const name = byClass(mount, 'ba-run-share-name');
  const tag = byClass(mount, 'ba-run-share-tag');
  check('S15c-2.share-brand', name.length === 1 && name[0]._text === 'Brainarea' && Boolean(tag[0]) && tag[0]._text.length > 10);
  const links = byClass(mount, 'ba-run-share-links')[0];
  check('S15c-2.share-tre-lenker', Boolean(links) && links.children.length === 3, links && links.children.length);
  const hrefs = (links ? links.children : []).map((a) => a.getAttribute('href'));
  check('S15c-2.share-href-persona', hrefs.includes('/brainarea/persona/'), hrefs.join(' | '));
  check('S15c-2.share-href-rel', hrefs.includes('/brainarea/relasjoner/'), hrefs.join(' | '));
  check('S15c-2.share-href-nd', hrefs.includes('/brainarea/nevrodiversitet/'), hrefs.join(' | '));
  const labels = (links ? links.children.flatMap((a) => [a._text]) : []).join(' ');
  check('S15c-2.share-labels-no', labels === 'Ta personlighetstesten Ta relasjonstesten Ta nevrodiverse-screeningen', labels);
  check('S15c-2.resultat-kort-urokket-ellers', byClass(mount, 'ba-run-actions').length === 1 && byClass(mount, 'ba-run-report').length === 1);
}

/* ============ S15c-3: metrisk ærlighet (kildefix-lesing av prod-kopien) ============ */
{
  const src = readFileSync(join(APP, 'run.js'), 'utf8');
  const iFn = src.indexOf('function bandGaugeData');
  const iEnd = src.indexOf('const BAND_W', iFn);
  check('S15c-3.bandGaugeData-i-prod', iFn > 0 && iEnd > iFn);
  const fn = iEnd > iFn ? src.slice(iFn, iEnd) : '';
  check('S15c-3.gate-scoringType-trait', /scoringType\s*!==\s*'trait'/.test(fn));
  check('S15c-3.gate-composite-klipping', /Math\.max\(0,\s*Math\.min\(100,/.test(fn));
  check('S15c-3.notComputable-flyt', /kind:\s*'notComputable'/.test(fn));
  check('S15c-3.caption-kun-i18n-noekkel', /ui\.run\.band\.percent/.test(src));
  const iShow = src.indexOf('function showResult');
  const iShareEnd = src.indexOf("const actions = el('div', 'ba-run-actions')", iShow);
  const show = iShareEnd > iShow ? src.slice(iShow, iShareEnd) : '';
  check('S15c-3.showResult-band-betinget', /bandGaugeNode\(result, tt\)/.test(show) && /if \(bandNode\) box\.appendChild\(bandNode\)/.test(show));
  check('S15c-3.showResult-share-seksjon', /ba-run-share/.test(show));
  const shareSlice = show.slice(show.indexOf('ba-run-share'));
  check('S15c-3.share-aldri-falsk-knapp', !/el\('button'/.test(shareSlice));
  check('S15c-3.tittel-katalog-begrenset', /RESULT_TITLE_IDS\.has\(/.test(src));
}

/* ============ rapport ============ */
const total = pass + fails.length;
console.log(`S15C ${pass}/${total} PASS`);
const report = {
  step: 'S15c VISUELL-D #3852 — resultat-signatur: identitetslinje, band-målestreng, delingsseksjon (stub-DOM over out/_app produksjonskjede)',
  total, pass, fail: fails.length,
  failures: fails,
  stubCoverage: [
    'stub-DOM uten layout/CSS — geometri verifiseres som attributt-identiteter (håndregnet); visuell QA separat i playwright-probe',
    'boot-sideeffekt: modulen kjører boot() ved import (readyState=complete)',
    'fetch-stub leser reelle filer fra out/_app (defs/config) — runner-driverens konvensjon',
    'ikke e2e her: g-score-bandfravær unit-verifisert i S15c-3; nd-kjede-verifisert i runner-selftest N1-N6',
  ],
  date: new Date().toISOString().slice(0, 10),
  builtBy: 'worker — todo leaf [BYGG][VISUELL-D] #3852',
};
writeFileSync(join(HERE, '_s15c_result_signature_report.json'), JSON.stringify(report, null, 2));
if (fails.length) process.exitCode = 1;
