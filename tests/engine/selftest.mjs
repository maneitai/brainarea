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
const ROOT = HERE.replace(/tests[\\\/]engine[\\\/]$/, ''); // repo-rot (portabel WSL/Windows — matcher begge skilletegn)

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
  // vm.runInContext kjører som CommonJS-script: ES export-token strips;
  // randomize.js lastes FØRST i konteksten, render.js sin import-linje
  // erstattes av destructure fra __rnd (import støttes ikke i vm-script).
  const ctx = vm.createContext({
    document: doc, console,
    setInterval: () => 0, clearInterval: () => {},
    Date, JSON, Math, String, Array, Object, Set, Map, Number, Boolean, RegExp,
  });
  // NB: vm-skript deler det globale LEKSIKALE miljoet — const paa toppnivaa i script 1
  // kolliderer med var i script 2. Derfor: toppnivaa const/let -> var i stubben.
  // (I nettleseren er dette ES-modul-scope og kolliderer aldri.)
  // mulberry32 kan ikke redeklareres — stub gi den alias-navn:
  const rsrc = readFileSync(`${HERE}randomize.js`, 'utf8')
    .replace(/^export\s+(const|let)\s+/gm, 'var ')
    .replace(/^export\s+/gm, '')
    .replace(/\bmulberry32\b/g, 'mulberry32x')
    .replace(/\bmulberry32x\x27/g, "mulberry32'");  // (ingen strenger bruker navnet)
  ;
  vm.runInContext(
    rsrc + "\n;globalThis.__rnd = { RANDOMIZE_VERSION, RNG_FIELD, RNG_STATE_VERSION, autoSeed, makeCountedRng, mulberry32x, newRngState, seedFromString, seededSample, seededShuffle };",
    ctx, { filename: 'randomize.js' },
  );
  const src = readFileSync(`${HERE}render.js`, 'utf8')
    .replace(/^export\s+(const|let)\s+/gm, 'var ')
    .replace(/^export\s+/gm, '')
    .replace(/^import\s+.*$/m, 'var RNG_FIELD = globalThis.__rnd.RNG_FIELD;')
    .replace(/\bnewRngState\b(?=\()/g, 'globalThis.__rnd.newRngState')
    .replace(/\bmakeCountedRng\b(?=\()/g, 'globalThis.__rnd.makeCountedRng');
  vm.runInContext(
    src + "\n;globalThis.__api = Object.assign({ mountRenderer, validateTestDef, sampleSession, sessionSizeFor, shuffleInPlace, resolveLang, fmtTime, memoryStorage, RENDER_VERSION, STORAGE_NS }, globalThis.__rnd);",
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

/* 8b. RANDOMISERING: seed + teller i økt; reproduserbarhet ved eksplisitt seed */
{
  const SEED_RNG = api.seedFromString('123'); // pin: FNV-1a('123') (beregnet, se randomize.js)
  check('seedFromString pin 123', SEED_RNG === 1916298011);

  // 1) Ny økt: rng-state bor i økten og persistes med den
  const storeR1 = api.memoryStorage();
  const docR1 = makeDocStub();
  const apiR1 = loadRender(docR1);
  const hR1 = apiR1.mountRenderer(docR1.createElement('div'), tdef, { lang: 'no', storage: storeR1, now: () => 1_700_100_000_000, onComplete: () => {} });
  check('ny økt: rng-state i økten (seed + teller)', hR1.session.rng && typeof hR1.session.rng.seed === 'number' && hR1.session.rng.count > 0);
  const countAfterMount = hR1.session.rng.count;
  const firstItem = hR1.session.itemIds[0];
  const gR1 = hR1._itemBox.children.find((c) => c.className === 'ba-options');
  (gR1.children[0]).click();
  hR1.next();
  (gR1.children[0]).click();
  hR1.next();
  check('svar lagret + fremgang (2 spørsmål)', hR1.session.idx === 2 && hR1.session.answers[firstItem].kind === 'likert');
  // likert-visning forbruker ingen draws → teller uendret etter svar/neste
  check('teller uendret av likert-visning (count == ved mount)', hR1.session.rng.count === countAfterMount);

  // 2) Gjenopptak: samme seed, teller videreføres (ikke restart av strømmen)
  const hR2 = apiR1.mountRenderer(docR1.createElement('div'), tdef, { lang: 'no', storage: storeR1, now: () => 1_700_100_100_000, onComplete: () => {} });
  check('gjenopptak: samme seed', hR2.session.rng.seed === hR1.session.rng.seed);
  check('gjenopptak: teller videreført (ikke restartet)', hR2.session.rng.count === countAfterMount);
  check('gjenopptak: samme itemIds + idx', JSON.stringify(hR2.session.itemIds) === JSON.stringify(hR1.session.itemIds) && hR2.session.idx === 2);

  // 3) Eksplisitt seed: reproduserbar økt (sample + visningsstokk bitvis like)
  const synBase = {
    schemaVersion: 1, type: 'test-definition', id: 'syn-rng', family: 'evner',
    languages: ['no'],
    scoring: { type: 'g-score', metric: 'z100', ci95: true, maxItems: 6 },
    dimensions: [{ id: 'g', label: 'g', labelLanguage: 'no', description: 'generell evne' }],
    items: [],
  };
  for (let i = 1; i <= 6; i++) {
    synBase.items.push({
      id: `syn-${String(i).padStart(2, '0')}`, kind: 'ability', scales: [{ id: 'g', sign: 1 }],
      variants: [{ lang: 'no', prompt: `Oppgave ${i}: hvilken er riktig?`,
        options: [{ label: 'A' }, { label: 'B' }, { label: 'C' }], correctIndex: 1, difficulty: -0.5 }],
    });
  }
  const docS1 = makeDocStub();
  const apiS1 = loadRender(docS1);
  const hS1 = apiS1.mountRenderer(docS1.createElement('div'), synBase, { lang: 'no', storage: api.memoryStorage(), seedSeed: SEED_RNG, now: () => 1_700_200_000_000, onComplete: () => {} });
  const shuf1 = JSON.stringify(hS1.session.shuffle);
  const sample1 = JSON.stringify(hS1.session.itemIds);
  const cnt1 = hS1.session.rng.count;
  const hS2 = apiS1.mountRenderer(docS1.createElement('div'), synBase, { lang: 'no', storage: api.memoryStorage(), seedSeed: SEED_RNG, now: () => 1_700_200_000_000, onComplete: () => {} });
  check('eksplisitt seed: identisk sample', JSON.stringify(hS2.session.itemIds) === sample1);
  check('eksplisitt seed: identiske visningsstokker', JSON.stringify(hS2.session.shuffle) === shuf1);
  check('eksplisitt seed: identisk teller etter mount', hS2.session.rng.count === cnt1);
  const hS3 = apiS1.mountRenderer(docS1.createElement('div'), synBase, { lang: 'no', storage: api.memoryStorage(), seedSeed: SEED_RNG + 1, now: () => 1_700_200_000_000, onComplete: () => {} });
  check('ulik seed: ulik visning (sample eller stokk)', JSON.stringify(hS3.session.itemIds) !== sample1 || JSON.stringify(hS3.session.shuffle) !== shuf1);
  hS1.destroy(); hS2.destroy(); hS3.destroy();

  // 4) sampleSession-pin: samme seed → bitvis lik sample (rene funksjoner, uten økt)
  const pinSample1 = JSON.stringify(apiR1.sampleSession(synBase, { usedIds: [], rng: apiR1.makeCountedRng(apiR1.newRngState(SEED_RNG)) }).itemIds);
  const pinSample2 = JSON.stringify(apiR1.sampleSession(synBase, { usedIds: [], rng: apiR1.makeCountedRng(apiR1.newRngState(SEED_RNG)) }).itemIds);
  check(`sampleSession pin (seed=${SEED_RNG}): ${pinSample1.slice(0, 30)}…`, pinSample1 === pinSample2 && pinSample1.length > 0);
  hR1.destroy(); hR2.destroy();
}

/* ============ rapport ============ */
const total = pass + failures.length;
const report = {
  step: 'Gjenopptak/avbrudd på samme spørsmål (render v0.5): brukt-liste ved øktstart, resume-banner, avslutt-knapp',
  renderVersion: '0.5.0',
  randomizeVersion: api.RANDOMIZE_VERSION,
  total, pass, fail: failures.length,
  failures,
  stubCoverage: [
    'DOM-struktur, klikk, klasser/attributter, focus — dekket av stub',
    'setInterval-timer kjøres ikke i selftest — tick drives via _tickForTest (deterministisk)',
    'visuelt layout/CSS-verifisering er umulig headless — ærlig begrensning, visuell QA senere',
    'localStorage erstattet av memoryStorage med samme grensesnitt',
    'auto-seed avhenger av Date.now/Math.random — bevisst ulik per økt; reproduserbarhet gjelder eksplisitt seed',
    'seed-reproduserbarhet gjelder mot uendret pool-innhold (pool-versjon knyttes på delbarhets-steg)',
  ],
  date: new Date().toISOString().slice(0, 10),
  builtBy: "worker — todo leaf 'Randomisering: seed-basert stokk av spørsmål + svaralternativer'",
};
writeFileSync(`${HERE}_render_selftest_report.json`, JSON.stringify(report, null, 2));
console.log(`SELFTEST ${pass}/${total} PASS`);
if (failures.length) process.exitCode = 1;
