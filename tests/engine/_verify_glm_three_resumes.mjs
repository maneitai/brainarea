import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';

let ENG = 'F:/maneit/prosjekter/filip-webside-prosjekter/brainarea/tests/engine/';
try { readFileSync(ENG + 'randomize.js'); } catch { ENG = '/mnt/f/maneit/prosjekter/filip-webside-prosjekter/brainarea/tests/engine/'; }

/* ---- egen DOM-stub (uavhengig av byggemesterens stub) ---- */
class El {
  constructor(tag){
    this.tagName = tag.toUpperCase(); this.children = []; this._cls = new Set();
    this._attr = new Map(); this._lis = {}; this._txt = '';
    this.style = { setProperty(){}, width: undefined };
    this.hidden = false; this.disabled = false; this.parentElement = null; this.tabIndex = undefined;
  }
  get textContent(){ return this._txt; }
  set textContent(v){ this._txt = String(v); this.children = []; }
  appendChild(c){ if(!c) return c; if(c.parentElement) c.parentElement.removeChild(c); c.parentElement = this; this.children.push(c); return c; }
  removeChild(c){ const i = this.children.indexOf(c); if(i>=0) this.children.splice(i,1); c.parentElement = null; return c; }
  contains(x){ if(!x) return false; for(const c of this.children){ if(c===x || c.contains(x)) return true; } return false; }
  setAttribute(k,v){ this._attr.set(k, String(v)); }
  getAttribute(k){ return this._attr.has(k) ? String(this._attr.get(k)) : null; }
  addEventListener(t,f){ (this._lis[t] = this._lis[t] || []).push(f); }
  click(){ (this._lis.click || []).forEach(f=>f({ preventDefault(){} })); }
  focus(){ this._focused = true; }
  get classList(){ const s=this._cls; return { add:(...cs)=>cs.forEach(c=>c&&s.add(c)), remove:(...cs)=>cs.forEach(c=>s.delete(c)), contains:(c)=>s.has(c) }; }
  set className(v){ this._cls.clear(); String(v).split(/\s+/).filter(Boolean).forEach(c=>this._cls.add(c)); }
  get className(){ return [...this._cls].join(' '); }
}
const doc = { createElement:(t)=>new El(t), head: new El('head') };

/* ---- last PRODUCTION randomize.js + render.js i vm ---- */
let rndSrc = readFileSync(ENG + 'randomize.js', 'utf8').replace(/^export\s+/gm, '');
const ctx = vm.createContext({ document: doc, console, setInterval: ()=>0, clearInterval: ()=>{},
  Date, JSON, Math, String, Array, Object, Set, Map, Number, Boolean, RegExp });
vm.runInContext(rndSrc + "\n;globalThis.__rnd = { RANDOMIZE_VERSION, RNG_FIELD, RNG_STATE_VERSION, autoSeed, makeCountedRng, newRngState, seedFromString, seededSample, seededShuffle };", ctx, { filename: 'randomize.js' });
let rsrc = readFileSync(ENG + 'render.js', 'utf8')
  .replace(/^import\s+.*$/m, '')
  .replace(/^export\s+/gm, '')
  .replace(/\bRNG_FIELD\b/g, '__rnd.RNG_FIELD')
  .replace(/\bnewRngState\b(?=\()/g, '__rnd.newRngState')
  .replace(/\bmakeCountedRng\b(?=\()/g, '__rnd.makeCountedRng');
vm.runInContext(rsrc + "\n;globalThis.__api = { RENDER_VERSION, STORAGE_NS, validateTestDef, sessionSizeFor, sampleSession, loadSession, clearSession, loadUsedIds, saveUsedIds, mountRenderer, memoryStorage };", ctx, { filename: 'render.js' });
const api = ctx.__api;

/* ---- ramme ---- */
let pass = 0; const fails = [];
const check = (n,c) => { if(c){ pass++; console.log('PASS ' + n); } else { fails.push(n); console.log('FAIL ' + n); } };
const mem = () => { const m = new Map(); return { getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,String(v)), removeItem:k=>m.delete(k) }; };
const T = 1_700_000_000_000;
const NS = api.STORAGE_NS;
const txtOf = (n) => (n && n._txt || '') + (n && n.children || []).map(txtOf).join(' ');
const byCls = (n, cls, out) => { out = out || []; for(const c of (n && n.children || [])){ if((c.className||'').split(/\s+/).indexOf(cls) >= 0) out.push(c); byCls(c, cls, out); } return out; };
const h2Of = (n) => { if(n && n.tagName === 'H2') return n; for(const c of (n && n.children || [])){ const r = h2Of(c); if(r) return r; } return null; };
const h2Text = (h) => { const e = h2Of(h._itemBox); return e ? e._txt : ''; };
const groupOf = (h) => byCls(h._itemBox, 'ba-options')[0];
const ov = (a,b) => a.filter(x=>b.indexOf(x) >= 0).length;

function likertDef(count){
  const items = [];
  for(let i=1;i<=count;i++){
    items.push({ id: 'L' + String(i).padStart(2,'0'), kind: 'likert', lang: 'no', text: 'Setning nummer ' + i + ' om meg.',
      options: [{label:'1',value:1},{label:'2',value:2},{label:'3',value:3},{label:'4',value:4},{label:'5',value:5}],
      scales: [{id:'o',sign:1}] });
  }
  return { schemaVersion:1, type:'test-definition', id:'likert-verify-GLM', family:'personlighet', languages:['no'],
    scoring:{ type:'trait', traits:[{id:'o',weight:1}], norms:'none' },
    dimensions:[{id:'o',label:'O',labelLanguage:'no',description:'o'}], items };
}
function gClone(nItems){
  const items = [];
  for(let i=1;i<=nItems;i++){
    items.push({ id: 'M' + String(i).padStart(3,'0'), kind:'ability', scales:[{id:'g',sign:1}],
      variants:[{ lang:'no', prompt:'Oppgave ' + i + ' av matrisen.', options:[{label:'A'},{label:'B'},{label:'C'}], correctIndex: i % 3, difficulty: ((i%5)-2)/2 }] });
  }
  return { schemaVersion:1, type:'test-definition', id:'g-verify-GLM-' + nItems, family:'evner', languages:['no'],
    scoring:{ type:'g-score', metric:'z100', ci95:true, maxItems:25 },
    dimensions:[{id:'g',label:'g',labelLanguage:'no',description:'g'}], items };
}
const ansLikert = (h,def) => groupOf(h).children[0].click();
const ansAbility = (h,def) => groupOf(h).children[0].click();
function runToCompletion(h,def,ansFn){ let g=0; while(!h.session.finished && g++ < 500){ ansFn(h,def); h.next(); } return h.session.finished; }

console.log('KJEMOT: render.js RENDER_VERSION = ' + api.RENDER_VERSION);

/* ================= SCENARIO 1: AVBRUDD MIDGET I OEKTEN (likert, 10 items) ================= */
{
  const def = likertDef(10);
  const store = mem();
  let completed = null; let completions = 0;
  const onComplete = (p) => { completed = p; completions++; };
  const root1 = doc.createElement('div');
  const h1 = api.mountRenderer(root1, def, { lang:'no', storage:store, now:()=>T, onComplete });
  for(let i=0;i<3;i++){ ansLikert(h1,def); h1.next(); }
  check('A1 3/10 besvart foer avbrudd', h1.session.idx === 3 && Object.keys(h1.session.answers).length === 3);
  check('A2 ingen fullfoerings-payload ved avbrudd', completions === 0 && completed === null);
  const used1 = JSON.parse(store.getItem(NS + 'used:' + def.id));
  check('A3 brukt-liste bokfoert ved oektstart (10 items)', used1.length === 10);
  const ids1 = JSON.stringify(h1.session.itemIds);
  const seed1 = h1.session.rng.seed; const cnt1 = h1.session.rng.count;
  // ---- AVBRUDD: fanen lukkes her. Ingen finish(), ingen kjoerende kode. ----
  const root2 = doc.createElement('div');
  const h2 = api.mountRenderer(root2, def, { lang:'no', storage:store, now:()=>T+60000, onComplete });
  check('A4 gjenopptak: samme trekk (samme itemIds)', JSON.stringify(h2.session.itemIds) === ids1);
  check('A5 gjenopptak: idx bevart = 3 (starter der slapp)', h2.session.idx === 3);
  check('A6 gjenopptak: 3 bokfoerte svar fulgt med', Object.keys(h2.session.answers).length === 3);
  check('A7 gjenopptak: rng-strøm videreføres (samme seed)', h2.session.rng.seed === seed1);
  check('A8 gjenopptak: rng-teller ikke nullstilt', h2.session.rng.count === cnt1);
  check('A9 banner vises ved gjenopptak', Boolean(h2._resumeBanner()));
  check('A10 banner viser 3/10', txtOf(h2._resumeBanner()).indexOf('3/10') >= 0);
  check('A11 avslutt-knapp finnes i banner', Boolean(h2._resumeQuitBtn()));
  const it4 = def.items.find(x => x.id === h2.session.itemIds[3]);
  check('A12 viser neste ubesvarte spoersmaal (4)', h2Text(h2) === it4.text);
  check('A13 progressbar står på 3', h2._bar.getAttribute('aria-valuenow') === '3');
  // klikk 'Avslutt økten nå'
  h2._resumeQuitBtn().click();
  check('A14 avslutt: banner borte', h2._resumeBanner().parentElement === null);
  check('A15 avslutt: terminaltekst om lagret oekt', txtOf(h2._itemBox).indexOf('fortsett senere') >= 0);
  check('A16 avslutt: neste-knapp deaktivert', h2._nextBtn.disabled === true);
  check('A17 avslutt: oekten er BEHOLDT (fortsett senere æres)', api.loadSession(store, def.id) !== null);
  check('A18 avslutt: brukt-liste uendret (10)', JSON.parse(store.getItem(NS + 'used:' + def.id)).length === 10);
  const root3 = doc.createElement('div');
  const h3 = api.mountRenderer(root3, def, { lang:'no', storage:store, now:()=>T+90000, onComplete });
  check('A19 remount etter avslutt: fortsatt samme oekt + banner', h3.session.idx === 3 && JSON.stringify(h3.session.itemIds) === ids1 && Boolean(h3._resumeBanner()));
  const fin = runToCompletion(h3, def, ansLikert);
  check('A20 gjenopptatt oekt fullfoeres', fin === true);
  check('A21 payload ved fullfoering: 10/10 svar', completed && completions === 1 && Object.keys(completed.answers).length === 10);
  check('A22 oekt tømt etter fullfoering', api.loadSession(store, def.id) === null);
  check('A23 brukt-liste forblir 10 unike (Set-idempotens)', JSON.parse(store.getItem(NS + 'used:' + def.id)).length === 10);
  check('A24 banner fjernet etter fullfoering', h3._resumeBanner().parentElement === null);
}

/* ============ SCENARIO 2: AVBRUDD PAA SISTE SPØRSMÅL (g-klone 60, oekt 25) ============ */
{
  const def = gClone(60);
  const store = mem();
  let completed = null;
  const onComplete = (p) => { completed = p; };
  const h1 = api.mountRenderer(doc.createElement('div'), def, { lang:'no', storage:store, now:()=>T, onComplete });
  check('B1 oekt = 25 av 60 (g-score maxItems)', h1.session.itemIds.length === 25);
  const ids1 = h1.session.itemIds.slice();
  for(let i=0;i<24;i++){ ansAbility(h1,def); h1.next(); }
  check('B2 stander paa SISTE spoersmaal (24 besvart, siste ubesvart)', h1.session.idx === 24);
  const cntB = h1.session.rng.count;   // leses ETTER de 24 fremskrittene (hver avanse trekker shuffle for neste item)
  const seedB = h1.session.rng.seed;
  // ---- avbrudd her: siste spoersmaal vist men ubesvart ----
  const h2 = api.mountRenderer(doc.createElement('div'), def, { lang:'no', storage:store, now:()=>T+5000, onComplete });
  check('B3 gjenopptak: fortsatt paa siste spoersmaal', h2.session.idx === 24 && JSON.stringify(h2.session.itemIds) === JSON.stringify(ids1));
  check('B4 banner viser 24/25', txtOf(h2._resumeBanner()).indexOf('24/25') >= 0);
  check('B5 24 svar bevart', Object.keys(h2.session.answers).length === 24);
  check('B6 progressbar 24/25', h2._bar.getAttribute('aria-valuenow') === '24');
  const last = def.items.find(x => x.id === h2.session.itemIds[24]);
  check('B7 siste spoersmaal vises', h2Text(h2) === last.variants[0].prompt);
  // rng: seed uendret; teller gjenopptar der oekten slapp (24 shuffle-draws allerede gjort)
  check('B8a rng-seed videreført ved gjenopptak', h2.session.rng.seed === seedB);
  check('B8b rng-teller videreført: 24 shuffle-draws fra mønt opp til avbrudd', h2.session.rng.count === cntB);
  ansAbility(h2, def); h2.next();
  check('B9 fullfoering fra siste-spoersmaal-avbrudd', completed !== null && h2.session.finished === true);
  check('B10 payload: 25/25 svar, samme 25 items', Object.keys(completed.answers).length === 25 && JSON.stringify(completed.itemIds) === JSON.stringify(ids1));
  check('B11 oekt tømt + brukt = 25 unike', api.loadSession(store, def.id) === null && JSON.parse(store.getItem(NS + 'used:' + def.id)).length === 25);

  // ---- variant: avbrudd paa siste spoersmaal + klikk avslutt ----
  const storeQ = mem();
  const q1 = api.mountRenderer(doc.createElement('div'), def, { lang:'no', storage:storeQ, now:()=>T, onComplete:()=>{} });
  for(let i=0;i<24;i++){ ansAbility(q1,def); q1.next(); }
  const q2 = api.mountRenderer(doc.createElement('div'), def, { lang:'no', storage:storeQ, now:()=>T+5000, onComplete:()=>{} });
  q2._resumeQuitBtn().click();
  check('B12 avslutt paa siste spoersmaal: oekt beholdt (24/25)', api.loadSession(storeQ, def.id) !== null && q2.session.idx === 24);
  const q3 = api.mountRenderer(doc.createElement('div'), def, { lang:'no', storage:storeQ, now:()=>T+9000, onComplete:()=>{} });
  check('B13 remount etter avslutt: fortsatt gjenopptak paa 24', q3.session.idx === 24 && Boolean(q3._resumeBanner()));
  runToCompletion(q3, def, ansAbility);
  check('B14 fullfoering OK etter avslutt-omvei', q3.session.finished === true);
}

/* ============ SCENARIO 3: RETUR ETTER RESULTAT (fullfoert oekt) ============ */
{
  const def = gClone(60);
  const store = mem();
  let p1 = null;
  const onComplete = (p) => { p1 = p; };
  const h1 = api.mountRenderer(doc.createElement('div'), def, { lang:'no', storage:store, now:()=>T, onComplete });
  const fin1 = runToCompletion(h1, def, ansAbility);
  check('C1 foerste oekt fullfoert med payload', fin1 === true && p1 !== null && Object.keys(p1.answers).length === 25);
  check('C2 oektkey tømt etter fullfoering', api.loadSession(store, def.id) === null);
  // ---- nytt besøk ETTER at resultatet er sett ----
  const h2 = api.mountRenderer(doc.createElement('div'), def, { lang:'no', storage:store, now:()=>T+120000, onComplete:()=>{} });
  check('C3 ny oekt (ingen gjenopptak av fullfoert)', h2.session.idx === 0 && h2.session.finished === false);
  check('C4 ingen banner ved fersk oekt', !h2._resumeBanner());
  check('C5 null overlap mot fullfoert oekt (no-repeat på tvers av resultat)', ov(h2.session.itemIds, p1.itemIds) === 0);
  check('C6 brukt-liste 50 unike etter to oekter', JSON.parse(store.getItem(NS + 'used:' + def.id)).length === 50);
  const fin2 = runToCompletion(h2, def, ansAbility);
  check('C7 andre oekt fullfoeres', fin2 === true);
}

const total = pass + fails.length;
const report = { step: '[VERIFISER GLM] Avbrudds-flyt: tre scenarier (midt i, siste spørsmål, etter resultat)',
  verdict_by: 'GLM-verifiseringsfamilie — uavhengig harness, ikke byggemesterens stub',
  tested_against: 'PRODUCTION brainarea/tests/engine/render.js v0.5.0 (md5 24A09A90C6211D2C1B988F23711C0596) + randomize.js (816DF79C…), node v24.19.0, vm + egen DOM-stub',
  total, pass, fail: fails.length, failures: fails,
  what_resumes: [
    'midt i oekt: samme trekk + idx + alle bokfoerte svar + rng-seed/teller; banner N/M; viser neste ubesvarte spoersmaal',
    'avslutt-knapp: stopper visningen, beholder oekten i lagring (fortsett senere aeres), neste-knapp deaktivert',
    'siste spoersmaal: gjenopptar paa ubesvart siste (24/25-banner), fullfoering fra der gir full payload',
    'etter resultat: ingenting gjenopptas — ny oekt, null overlap mot fullfoert trekk, brukt-liste Set-idempotent'
  ],
  limits: [ 'stub-DOM i node-vm — ekte nettleser-QA er egne senere GLM-steg' ],
  date: new Date().toISOString().slice(0, 10) };
writeFileSync(new URL('./_verify_glm_three_resumes_report.json', import.meta.url), JSON.stringify(report, null, 2));
console.log('GLM-THREE-RESUMES ' + pass + '/' + total + ' PASS');
if(fails.length) process.exitCode = 1;
