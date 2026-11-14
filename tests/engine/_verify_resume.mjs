import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';

const ENG = 'F:/maneit/prosjekter/filip-webside-prosjekter/brainarea/tests/engine/';
const SCH = 'F:/maneit/prosjekter/filip-webside-prosjekter/brainarea/tests/schema/';

/* ==== uavhengig DOM-stub (sama mal som _verify_repeat) ==== */
class El {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this._cls = new Set();
    this._attr = new Map();
    this._lis = {};
    this.style = { setProperty(){}, width: undefined, flex: undefined, display: undefined };
    this._txt = '';
    this.tabIndex = undefined; this.hidden = false; this.disabled = false;
    this.parentElement = null;
  }
  get textContent(){ return this._txt; }
  set textContent(v){ this._txt = String(v); this.children = []; }
  appendChild(c){ if(c.parentElement) c.parentElement.removeChild(c); c.parentElement = this; this.children.push(c); return c; }
  removeChild(c){ const i = this.children.indexOf(c); if(i>=0) this.children.splice(i,1); c.parentElement = null; return c; }
  contains(x){ return this.children.includes(x); }
  setAttribute(k,v){ this._attr.set(k, String(v)); }
  getAttribute(k){ return this._attr.has(k) ? this._attr.get(k) : null; }
  addEventListener(t,f){ (this._lis[t] = this._lis[t]||[]).push(f); }
  click(){ (this._lis.click||[]).forEach(f=>f({preventDefault(){}})); }
  focus(){ this._focused = true; }
  get classList(){ const s=this._cls; return {
    add:(...cs)=>cs.forEach(c=>c&&s.add(c)),
    remove:(...cs)=>cs.forEach(c=>s.delete(c)),
    toggle:(c,on)=>{ const t=(on===undefined)? !s.has(c): Boolean(on); t? s.add(c): s.delete(c); },
    contains:(c)=>s.has(c) }; }
  set className(v){ this._cls.clear(); String(v).split(/\s+/).filter(Boolean).forEach(c=>this._cls.add(c)); }
  get className(){ return [...this._cls].join(' '); }
}
const doc = { createElement:(t)=>new El(t), head: new El('head') };

let __rnd;
{
  const rsrc = readFileSync(ENG+'randomize.js','utf8').replace(/^export\s+/gm,'');
  const ctx = vm.createContext({ console, Date, Math });
  vm.runInContext(rsrc + "\n;globalThis.__rndOut = { mulberry32, RANDOMIZE_VERSION, seedFromString, autoSeed, seededShuffle, seededSample, RNG_FIELD, RNG_STATE_VERSION, newRngState, makeCountedRng };", ctx, { filename:'randomize.js' });
  __rnd = ctx.__rndOut;
}
let api;
{
  let src = readFileSync(ENG+'render.js','utf8');
  src = src.replace(/^import\s+.*$/m, '')
           .replace(/^export\s+/gm, '')
           .replace(/\bmakeCountedRng\b/g,'__rnd.makeCountedRng')
           .replace(/\bnewRngState\b/g,'__rnd.newRngState')
           .replace(/\bRNG_FIELD\b/g,'__rndRNGFIELD');
  const ctx = vm.createContext({
    document: doc, console,
    setInterval: () => 0, clearInterval: () => {},
    Date, JSON, Math, String, Array, Object, Set, Map, Number, Boolean, RegExp,
    __rnd, __rndRNGFIELD: __rnd.RNG_FIELD,
  });
  vm.runInContext(src + "\n;globalThis.__api = { RENDER_VERSION, STORAGE_NS, validateTestDef, resolveLang, sessionSizeFor, computeUsedReset, shuffleInPlace, sampleSession, newSessionState, saveSession, loadSession, clearSession, saveUsedIds, loadUsedIds, mountRenderer };", ctx, { filename:'render.js' });
  api = ctx.__api;
}

/* ==== hjelpere ==== */
let pass = 0; const fails = [];
const check = (n,c)=>{ if(c){pass++; console.log('PASS '+n);} else {fails.push(n); console.log('FAIL '+n);} };
const mem = () => { const m = new Map(); return { getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,String(v)), removeItem:k=>m.delete(k) }; };
const T = 1_700_000_000_000;
const NS = api.STORAGE_NS;

function makeGClone(nItems){
  const items = [];
  for(let i=1;i<=nItems;i++){
    items.push({ id:'mxv-'+String(i).padStart(4,'0'), kind:'ability',
      scales:[{id:'g',sign:1}],
      variants:[{ lang:'no', prompt:'Oppgave '+i+': hvilken er riktig?',
        options:[{label:'A'},{label:'B'},{label:'C'}], correctIndex:i%3, difficulty:((i%5)-2)/2 }] });
  }
  return { schemaVersion:1, type:'test-definition', id:'mxv-'+nItems, family:'evner', languages:['no'],
    scoring:{ type:'g-score', metric:'z100', ci95:true, maxItems:25 },
    dimensions:[{ id:'g', label:'g', labelLanguage:'no', description:'g' }], items };
}
function ansCurrent(h, def){
  const itemId = h.session.itemIds[h.session.idx];
  const item = def.items.find(x=>x.id===itemId);
  const group = h._itemBox.children.find(c=>c.className==='ba-options');
  const disp = h.session.shuffle[item.id];
  group.children[disp ? disp.indexOf(1) : 0].click();
}
function runToCompletion(h, def){
  let guard = 0;
  while(!h.session.finished && guard++ < 500){
    ansCurrent(h, def);
    h.next();
  }
  return h.session.finished;
}
const ov = (a,b)=>a.filter(x=>b.includes(x)).length;
const usedOf = (store, id)=>JSON.parse(store.getItem(NS+'used:'+id));
// stub-tekst er ikke rekursiv (ekte DOM textContent er det) — samle hele subtreet:
const txtOf = (n)=> (n._txt||'') + (n.children||[]).map(txtOf).join(' ');

/* ================= W1: avbrudd bokfoeres umiddelbart ================= */
{
  const def = makeGClone(60);
  const store = mem();
  let completed = null;
  const h = api.mountRenderer(doc.createElement('div'), def, { lang:'no', storage:store, now:()=>T, onComplete:p=>{completed=p;} });
  const ids0 = JSON.stringify(h.session.itemIds);
  ansCurrent(h, def); h.next();      // svar et, ga videre — avbryt deretter ( ingen finish )
  const used = usedOf(store, def.id);
  check('W1a brukt-liste bokfoert VED OEKTSTART (ikke ved finish)', Array.isArray(used) && used.length === 25);
  check('W1b avbrutte oekt-items er i brukt-liste', ov(h.session.itemIds, used) === 25);
  check('W1c ingen fullfoerings-payload ved avbrudd', completed === null);
  // gjenopptak: samme storage, ny mount
  const usedBeforeResume = JSON.stringify(used);
  const h2 = api.mountRenderer(doc.createElement('div'), def, { lang:'no', storage:store, now:()=>T+5_000, onComplete:p=>{completed=p;} });
  check('W1d gjenopptak samme trekk + idx', JSON.stringify(h2.session.itemIds)===ids0 && h2.session.idx === 1);
  check('W1e gjenopptak dobbeltbokfoerer IKKE (sett-idempotens)', JSON.stringify(usedOf(store, def.id)) === usedBeforeResume);
}

/* ================= W2: ny oekt etter avbrudd respekterer no-repeat ================= */
{
  const def = makeGClone(60);
  const store = mem();
  const h = api.mountRenderer(doc.createElement('div'), def, { lang:'no', storage:store, now:()=>T, onComplete:()=>{} });
  const abandonedIds = h.session.itemIds.slice();
  ansCurrent(h, def); h.next(); // avbrudd
  // "start paany"-stien: sesjonsnoekkel fjernes (som en start-om-igjen-knapp ville gjort);
  // brukt-listen skal da fortsatt inneholde de avbrutte itemsene
  store.removeItem(NS+'session:'+def.id);
  const used = usedOf(store, def.id);
  check('W2a avbrutte items overlever sesjonssletting (brukt-liste eier bokfoeringen)', ov(abandonedIds, used) === 25);
  let completed = null;
  const h2 = api.mountRenderer(doc.createElement('div'), def, { lang:'no', storage:store, now:()=>T+9_000, onComplete:p=>{completed=p;} });
  runToCompletion(h2, def);
  check('W2b fullfoert ny oekt', completed !== null && completed.itemIds.length === 25);
  check('W2c null overlap vs avbrutt oekt (no-repeat på tvers av avbrudd)', ov(completed.itemIds, abandonedIds) === 0);
  check('W2d brukt-liste = 50 unike etter avbrudd + fullfoering (sett dedup)', usedOf(store, def.id).length === 50);
}

/* ================= W3: gjenopptaksbanner + avslutt-knapp ================= */
{
  const def = makeGClone(60);
  const store = mem();
  const h = api.mountRenderer(doc.createElement('div'), def, { lang:'no', storage:store, now:()=>T, onComplete:()=>{} });
  ansCurrent(h, def); h.next(); // 1 besvart
  check('W3a ingen banner ved fersk oekt', h._resumeBanner() === null);
  const h2 = api.mountRenderer(doc.createElement('div'), def, { lang:'no', storage:store, now:()=>T+6_000, onComplete:()=>{} });
  const banner = h2._resumeBanner();
  check('W3b banner vises ved gjenopptak med fremgang', Boolean(banner));
  check('W3c banner tekst nevner 1/25', banner && txtOf(banner).includes('1/25'));
  check('W3d avslutt-knapp finnes', Boolean(h2._resumeQuitBtn()));
  const itemBoxBefore = txtOf(h2._itemBox);
  check('W3e test spørsmål 2 vises bak banneret', itemBoxBefore.length > 0 && h2.session.idx === 1);
  h2._resumeQuitBtn().click();
  check('W3f avslutt: banner borte', !h2._resumeBanner().parentElement);
  check('W3g avslutt: terminaltekst om lagret oekt', txtOf(h2._itemBox).includes('fortsett senere'));
  check('W3h avslutt: neste-knapp deaktivert', h2._nextBtn.disabled === true);
  check('W3i avslutt SLETTER IKKE oekten (fortsett senere respektert)', api.loadSession(store, def.id) !== null);
  check('W3j avslutt endrer ikke brukt-liste', usedOf(store, def.id).length === 25);
  // tredje mount: fortsetter fortsatt samme oekt med banner
  const h3 = api.mountRenderer(doc.createElement('div'), def, { lang:'no', storage:store, now:()=>T+7_000, onComplete:()=>{} });
  check('W3k ny mount etter avslutt: fortsatt gjenopptak', h3.session.idx === 1 && Boolean(h3._resumeBanner()));
  // fullfoer: banner fjernes ved fullfoering
  const fin = runToCompletion(h3, def);
  check('W3l fullfoering OK fra avbrutt tilstand', fin === true);
  check('W3m banner fjernet etter fullfoering', !h3._resumeBanner().parentElement);
  check('W3n sesjon tømt etter fullfoering', api.loadSession(store, def.id) === null);
  // W3o korrigert forventning: økten gjenopptas (ikke ny økt) og fullføres — samme 25 items.
  // Set-idempotens gir 25 unike i brukt-liste (25 + 25 med duplikater dedupet).
  check('W3o brukt-liste: 25 unike (samme oekt gjenopptatt — Set-idempotens)', usedOf(store, def.id).length === 25);
}

/* ================= W4: likert-oekt — avbrudd + gjenopptak med banner ================= */
{
  const tdef = JSON.parse(readFileSync(SCH+'fixture-trait-big5.no.json','utf8'));
  const store = mem();
  const h = api.mountRenderer(doc.createElement('div'), tdef, { lang:'no', storage:store, now:()=>T, onComplete:()=>{} });
  const g = h._itemBox.children.find(c=>c.className==='ba-options');
  g.children[0].click(); h.next();
  const h2 = api.mountRenderer(doc.createElement('div'), tdef, { lang:'no', storage:store, now:()=>T+4_000, onComplete:()=>{} });
  check('W4a likert gjenopptar med samme idx (1)', h2.session.idx === 1);
  check('W4b likert banner vises', Boolean(h2._resumeBanner()));
  check('W4c likert: brukt bokfoert ved start', usedOf(store, tdef.id).length === tdef.items.length);
}

/* ================= rapport ================= */
const total = pass + fails.length;
const report = { step:'[BYGG] FASE 1: Lokal lagring — avbrudd → gjenopptak på samme spørsmål (verify-resume)', total, pass, fail: fails.length, failures: fails,
  notes: [ 'brukt-liste bokfoeres ved oektstart (avbruddssikkert) + Set-merge i finish (idempotent)', 'gjenopptak: banner + avslutt-knapp; avslutt beholder oekten', 'W2 simulerer start-om-igjen-stien mot brukt-listen' ],
  date: new Date().toISOString().slice(0,10) };
writeFileSync(ENG+'_verify_resume_report.json', JSON.stringify(report, null, 2));
console.log('VERIFY-RESUME '+pass+'/'+total+' PASS');
if(fails.length) process.exitCode = 1;
