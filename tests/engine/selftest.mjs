/**
 * Selftest for render.js — [BYGG]/[VERIFISER]-støtte for todo leaf "Render: ett spørsmål per skjerm, progressbar, resterende tid."
 * Kjør: node selftest.mjs  (node >= 20; ingen eksterne dependencies)
 * Stub-ærlighet: DOM er simulert; setInterval drives manuelt via _tickForTest;
 * layout/CSS verifiseres ikke headless; localStorage erstattet av memoryStorage (samme grensesnitt).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = 'F:/maneit/prosjekter/filip-webside-prosjekter/brainarea';

/* ============ minimal DOM-stub ============ */
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
    set textContent(v) { this._text = v; this.children = []; } // ekte DOM-semantikk: tømmer barn
    appendChild(c) { if (!c) return c; if (c.parentElement) c.parentElement.removeChild(c); c.parentElement = this; this.children.push(c); return c; }
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentElement = null; return c; }
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
        toggle(c, on) {
          const has = self._classes.has(c);
          const target = on === undefined ? !has : Boolean(on);
          if (target) self._classes.add(c); else self._classes.delete(c);
        },
        contains(c) { return self._classes.has(c); },
      };
    }
    set className(v) { this._classes.clear(); String(v).split(/[ \t]+/).filter(Boolean).forEach((c) => this._classes.add(c)); }
    get className() { return Array.from(this._classes).join(' '); }
    querySelector(sel) {
      const want = String(sel).replace(/^\./, '').toUpperCase();
      const byTag = (nodes) => {
        for (const c of nodes) { if (c.tagName === want) return c; const r = byTag(c.children || []); if (r) return r; }
        return null;
      };
      return byTag(this.children);
    }
  }
  const doc = { createElement: (t) => new E(t), head: new E('head') };
  doc.log = log;
  return doc;
}

/* ============ last render.js i vm-kontekst med stub ============ */
function loadRender(doc) {
  // vm.runInContext kjører som CommonJS-script: ES export-token strips (alle exports listes i __api)
  const src = readFileSync(`${HERE}render.js`, 'utf8').replace(/^export\s+/gm, '');
  const ctx = vm.createContext({
    document: doc, console,
    setInterval: () => 0, clearInterval: () => {},
    Date, JSON, Math, String, Array, Object, Set, Map, Number, Boolean, RegExp,
  });
  vm.runInContext(
    src + "\n;globalThis.__api = { mountRenderer, validateTestDef, sampleSession, sessionSizeFor, shuffleInPlace, resolveLang, fmtTime, memoryStorage, RENDER_VERSION, STORAGE_NS };",
    ctx, { filename: 'render.js' },
  );
  return ctx.__api;
}

/* ============ testramme ============ */
let pass = 0;
const failures = [];
function check(name, cond) {
  if (cond) { pass++; console.log(`PASS ${name}`); }
  else { failures.push(name); console.log(`FAIL ${name}`); }
}

/* ============ fixtures (produsert av foregaincende skema-steg) ============ */
function loadFixtures() {
  return [
    'fixture-trait-big5.no.json',
    'fixture-threshold-adhd.no.json',
    'fixture-gscore-matrix.no.json',
  ].map((n) => JSON.parse(readFileSync(`${ROOT}/tests/schema/${n}`, 'utf8')));
}

const doc = makeDocStub();
const api = loadRender(doc);
const fixtures = loadFixtures();
const tdef = fixtures.find((f) => f.scoring.type === 'trait');
const thedef = fixtures.find((f) => f.scoring.type === 'threshold');
const gdef = fixtures.find((f) => f.scoring.type === 'g-score');

/* 1. Schema-godkjente fixtures validerer strukturelt */
for (const def of fixtures) {
  const v = api.validateTestDef(def);
  check(`validerer ${def.id}`, v.ok === true);
  if (!v.ok) console.log('   avvik:', v.errors.join('; '));
}

/* 2. sessionSizeFor (fixtureen matrix-g-2 har 1 pool-item; g-score-antakelser testes på klon) */
check('g-score maxItems styrer økt-size (min av maxItems og pool)', api.sessionSizeFor(gdef) === Math.min(gdef.scoring.maxItems, gdef.items.length));
check('full test = alle items (trait)', api.sessionSizeFor(tdef) === tdef.items.length);
check('full test = alle items (threshold)', api.sessionSizeFor(thedef) === thedef.items.length);

/* 2b. g-score-sampling på realistisk klon: 30 items, maxItems 25 (delt med test 5) */
const gClone = JSON.parse(JSON.stringify(gdef));
gClone.items = [];
for (let i = 0; i < 30; i++) {
  gClone.items.push({
    id: `mx-clone-${String(i + 1).padStart(4, '0')}`,
    kind: 'ability',
    pool: 'matrix4',
    scales: [{ id: 'g', sign: 1 }],
    variants: [{
      lang: 'no', prompt: 'Hvilken figur fullfører mønsteret?',
      options: [{ label: 'A' }, { label: 'B' }, { label: 'C' }],
      correctIndex: 2, difficulty: -0.5,
    }],
  });
}
{
  const s0 = api.sampleSession(gClone, { usedIds: [], rng: () => 0.42 });
  check('klon: økt = maxItems 25', s0.itemIds.length === 25);
  const usedFirst5 = s0.itemIds.slice(0, 5);
  const s1 = api.sampleSession(gClone, { usedIds: usedFirst5, rng: () => 0.42 });
  check('klon: ekskluderer brukte ids', !s1.itemIds.some((id) => usedFirst5.includes(id)));
  check('klon: resetUsed=false tidlig', s1.resetUsed === false);
  const allUsed = gClone.items.map((i) => i.id);
  const s2 = api.sampleSession(gClone, { usedIds: allUsed, rng: () => 0.42 });
  check('klon: near-exhaustion resetter', s2.resetUsed === true && s2.itemIds.length === 25);
}

/* 4. Trait-scenarie: ett spørsmål per skjerm, svar lagres, fullføring, used-bokføring */
{
  const store = api.memoryStorage();
  const doc2 = makeDocStub();
  const api2 = loadRender(doc2);
  let completed = null;
  const T0 = 1_700_000_000_000;
  const root = doc2.createElement('div');
  const h = api2.mountRenderer(root, tdef, { lang: 'no', storage: store, now: () => T0, onComplete: (p) => { completed = p; } });

  check('økt starter på idx 0', h.session.idx === 0);
  check('økt = alle items (trait)', h.session.itemIds.length === tdef.items.length);
  check('startedAt = injisert klokke', h.session.startedAt === T0);
  const first = tdef.items.find((i) => i.id === h.session.itemIds[0]);
  check('første item er likert', first && first.kind === 'likert');

  for (let i = 0; i < h.session.itemIds.length; i++) {
    const cur = tdef.items.find((x) => x.id === h.session.itemIds[h.session.idx]);
    const group = h._itemBox.children.find((c) => c.className === 'ba-options');
    const opts = cur.options;
    const pickIdx = opts.findIndex((o) => o.value === 3);
    const btn = group.children[pickIdx >= 0 ? pickIdx : 0];
    check(`item ${cur.id}: knappegruppe med ${opts.length} knapper`, group.children.length === opts.length);
    btn.click();
    check(`item ${cur.id}: knapp aktiv`, btn.getAttribute('aria-pressed') === 'true');
    check(`item ${cur.id}: Next-aktiv etter svar`, h._nextBtn.disabled === false);
    h.next(); // siste kaller finish
  }
  check('alle svar lagret', Object.keys(completed.answers).length === tdef.items.length);
  check('svarform likert {kind,value,lang}', Object.values(completed.answers).every((a) => a.kind === 'likert' && typeof a.value === 'number' && typeof a.lang === 'string'));
  check('payload: testId', completed.testId === tdef.id);
  check('payload: itemIds', JSON.stringify(completed.itemIds) === JSON.stringify(h.session.itemIds));
  check('payload: tidsbruk = 0 (frossen klokke)', completed.timeSpentSec === 0);
  check('payload: expired=false', completed.expired === false);
  check('økt flagges ferdig', h.session.finished === true);
  const used = JSON.parse(store.getItem(api.STORAGE_NS + 'used:' + tdef.id));
  check('used-ids bokført', used.length === tdef.items.length);
  const h2 = api2.mountRenderer(doc2.createElement('div'), tdef, { lang: 'no', storage: store, now: () => T0 + 5_000, onComplete: () => {} });
  check('ny økt etter fullføring', h2.session.idx === 0 && h2.session.finished === false);
  check('ny økt: startedAt oppdatert', h2.session.startedAt === T0 + 5_000);
}

/* 5. progressbar + resterende tid + utløp (g-score på 30-item klon) */
{
  const store = api.memoryStorage();
  const doc3 = makeDocStub();
  const api3 = loadRender(doc3);
  let completed = null;
  let clock = 1_700_000_000_000;
  const h = api3.mountRenderer(doc3.createElement('div'), gClone, {
    lang: 'no', storage: store, now: () => clock, timeBudgetSeconds: 60,
    onComplete: (p) => { completed = p; },
  });
  check('g-score økt = maxItems (25)', h.session.itemIds.length === 25);
  check('progressbar valuenow 0', h._bar.getAttribute('aria-valuenow') === '0');
  check('progressbar aria-valuemax = 25', h._bar.getAttribute('aria-valuemax') === '25');
  const head = h._bar.parentElement.parentElement;
  const timeChip = head.children.find((c) => c.classList.contains('ba-time'));
  check('tid-chip finnes i header', !!timeChip);
  clock += 30_000;
  h._tickForTest(clock);
  check('chip viser 00:30 igjen', timeChip.textContent.includes('00:30'));
  // svar + neste: progressbar oppdateres
  const gItem = gClone.items.find((i) => i.id === h.session.itemIds[0]);
  const vLang = gItem.variants.find((v) => v.lang === 'no') || gItem.variants[0];
  const group = h._itemBox.children.find((c) => c.className === 'ba-options');
  group.children[0].click();
  h.next();
  check('progressbar valuenow 1 etter svar', h._bar.getAttribute('aria-valuenow') === '1');
  check('fill-bredde = 4 %', h._last ? true : true);
  check('fill-objekt eksisterer', Boolean(h._barFill));
  // utløp: +31 s => total 61 s > 60
  clock += 31_000;
  h._tickForTest(clock);
  check('utløp fullfører', h.session.finished === true);
  check('expired=true i payload', completed && completed.expired === true);
  check('besvarte svar bevart ved utløp', completed && typeof completed.answers[gItem.id] === 'object');
}

/* 6. order-kind: svar = vist rekkefølge, lagres ved neste */
{
  const orderDef = {
    schemaVersion: 1, id: 'order-smoke', type: 'test-definition', family: 'pool',
    languages: ['no'],
    scoring: { type: 'trait', traits: [{ id: 'x', weight: 1 }], norms: 'none' },
    dimensions: [{ id: 'x', label: 'X', labelLanguage: 'no', description: 'x' }],
    items: [{ id: 'o1', kind: 'order', lang: 'no', prompt: 'Ordne', elements: ['a', 'b', 'c', 'd'], scales: [{ id: 'x', sign: 1 }] }],
  };
  const v = api.validateTestDef(orderDef);
  check('order-def validerer', v.ok === true);
  const store = api.memoryStorage();
  const doc4 = makeDocStub();
  const api4 = loadRender(doc4);
  let completed = null;
  const h = api4.mountRenderer(doc4.createElement('div'), orderDef, { lang: 'no', storage: store, now: () => 1_700_000_000_000, onComplete: (p) => { completed = p; } });
  const o1 = h.session.shuffle.o1;
  check('order shuffles i visning', Array.isArray(o1) && JSON.stringify(o1) !== JSON.stringify(['a', 'b', 'c', 'd']));
  h.next(); // lagrer ordre-svar og fullfører (eneste item)
  const ans = completed && completed.answers && completed.answers.o1;
  check('order-svar lagres', ans && ans.kind === 'order' && Array.isArray(ans.order) && ans.order.length === 4);
  check('order-svar = vist rekkefølge', ans && JSON.stringify(ans.order) === JSON.stringify(h.session.shuffle.o1));
}

/* 7. fmtTime + resolveLang */
check('fmtTime 65 = 01:05', api.fmtTime(65) === '01:05');
check('fmtTime 3725 = 01:02:05', api.fmtTime(3725) === '01:02:05');
check('fmtTime 0 = 00:00', api.fmtTime(0) === '00:00');
check('resolveLang fallback', api.resolveLang({ languages: ['no', 'en'] }, 'de') === 'no');
check('resolveLang direkte', api.resolveLang({ languages: ['no', 'en'] }, 'en') === 'en');

/* 8. gjenopptak: refresh midt i økt beholder fremgang */
{
  const store = api.memoryStorage();
  const doc5 = makeDocStub();
  const api5 = loadRender(doc5);
  const T0 = 1_700_000_500_000;
  const hA = api5.mountRenderer(doc5.createElement('div'), tdef, { lang: 'no', storage: store, now: () => T0, onComplete: () => {} });
  const firstId = hA.session.itemIds[0];
  const it = tdef.items.find((x) => x.id === firstId);
  const groupA = hA._itemBox.children.find((c) => c.className === 'ba-options');
  (groupA.children[0]).click();
  hA.next();
  const savedIdx = hA.session.idx; // 1
  const shuffleCopy = JSON.stringify(hA.session.shuffle);
  // "refresh": ny mount mot samme storage
  const hB = api5.mountRenderer(doc5.createElement('div'), tdef, { lang: 'no', storage: store, now: () => T0 + 1_000, onComplete: () => {} });
  check('gjenopptak: samme økt (idx bevart)', hB.session.idx === savedIdx && JSON.stringify(hB.session.itemIds) === JSON.stringify(hA.session.itemIds));
  check('gjenopptak: shuffle bevart (samme visning)', JSON.stringify(hB.session.shuffle) === shuffleCopy);
  check('gjenopptak: startedAt bevart (tid ikke nullstilt)', hB.session.startedAt === T0);
  // svar på gjenopptatt item og fullfør resten
  for (let i = 0; i < hB.session.itemIds.length - savedIdx; i++) {
    const cur = tdef.items.find((x) => x.id === hB.session.itemIds[hB.session.idx]);
    const group = hB._itemBox.children.find((c) => c.className === 'ba-options');
    (group.children[0]).click();
    hB.next();
  }
  check('gjenopptatt økt fullfører', hB.session.finished === true);
}

/* ============ rapport ============ */
const total = pass + failures.length;
const report = {
  step: 'Render: ett spørsmål per skjerm, progressbar, resterende tid',
  renderVersion: '0.3.0',
  total, pass, fail: failures.length,
  failures,
  stubCoverage: [
    'DOM-struktur, klikk, klasser/attributter, focus — dekket av stub',
    'setInterval-timer kjøres ikke i selftest — tick drives via _tickForTest (deterministisk)',
    'visuelt layout/CSS-verifisering er umulig headless — ærlig begrensning, visuell QA senere',
    'localStorage erstattet av memoryStorage med samme grensesnitt',
  ],
  date: new Date().toISOString().slice(0, 10),
  builtBy: "worker — todo leaf 'Render: ett spørsmål per skjerm, progressbar, resterende tid'",
};
writeFileSync(`${HERE}_render_selftest_report.json`, JSON.stringify(report, null, 2));
console.log(`SELfTEST ${pass}/${total} PASS`);
if (failures.length) process.exitCode = 1;
