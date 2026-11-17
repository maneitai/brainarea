/**
 * Brainarea test renderer v0.4 (seed-rng: ./randomize.js) — [BYGG] FASE 2, todo leaf "Render: ett spørsmål per skjerm, progressbar, resterende tid."
 *
 * Renset ES-modul (ingen dependencies). Statisk vevenn: <script type="module"> eller bunter.
 * Gjengir en test definert etter tests/schema/test-definition.schema.json (v1) som en
 * test-økt med ETT spørsmål per skjerm.
 *
 * ---- Kontrakt mot andre moduler ----
 * - Inndata: test-definisjon validert av validateTestDef() (strukturelle sjekker; dyp
 *   psykometri-utholdenhetsvalidasjon eies av engine-load/skjøringssteget).
 * - Utdata: onComplete({ testId, lang, itemIds, startedAt, finishedAt, timeSpentSec, expired,
 *   answers }) der answers[itemId] = { kind, lang, value? | abilityOriginalIndex? | order? }.
 *   Skjøringsmodulen (senere board-steg) leser denne formen; renderer lagrer aldri tolkning.
 *
 * ---- Beslutninger i dette steget (dokumentert, ikke usynlige) ----
 * 1. TID: tidsbudsjett er sesjonsnivå (opts.timeBudgetSeconds), fordi schema v1
 *    bevisst ikke har tidsfelt. Uten budsjett vises forløpt tid. Ved utløp: økt avsluttes
 *    automatisk, besvarte svar bevares, expired=true. Ingen budsjett-default er oppfunnet
 *    for evne-tester (ville forvrengt resultater).
 * 2. UTEN GJENTAK: sampleSession() ekskluderer item-ider brukt i tidligere økter
 *    (localStorage per test). For g-score-pooler: når brukt >= pool - sessionSize resettes
 *    listen (schema v1: "sampled without repeats across sessions until pool near-exhaustion").
 *    Likert/threshold-tester sampler alle items (ingen sampling), rekkefølge shuffles per økt.
 * 3. ANNONSE-SPOR: footer inneholder <div class="ba-ad-slot" data-reserved="ads" hidden>.
 *    Annonse-steget fyller sporet; renderer endres ikke da.
 * 4. GJENOPPTAK: pågående økt lagres i storage; refresh mister ikke fremgang (krav: ingen konto).
 *    AVBRUDD (leaf 11): items bokføres i brukt-liste VED ØKTSTART, ikke ved finish — en
 *    avbrutt økt må aldri gjenbruke sine spørsmål i neste økt (no-repeat på tvers av avbrudd).
 *    finish() beholder Set-idempotent healing. Gjenopptak med fremgang viser banner
 *    «fortsett der du slapp» med valgfri «avslutt nå»-knapp; avslutt BEHOLDER økten.
 * 4a. brukt-liste dedupes ved les (Set) — listestørrelse forblir ren over mange økter.
 * 5. Order-kind: elementer shuffles per økt; svar = rekkefølgen brukeren sender inn.
 * 6. Ability: valgkort shuffles i visning; lagres som ORIGINAL option-indeks (data-nivå),
 *    ikke visningsposisjon.
 *
 * ---- Kjente begrensninger (ærlig) ----
 * - Nettleserspesifikke visningsavvik er ikke testbare headless; selftest dekker logikk +
 *   DOM-struktur via stub. Visuell QA skjer i senere side-steg og av grunder.
 * - Ingen auto-avansering (bevisst: eksplisitt Neste holder svarkontrakten deterministisk).
 */

import { makeCountedRng, newRngState, RNG_FIELD } from './randomize.js';

export const RENDER_VERSION = '0.6.0';

export const STORAGE_NS = 'brainarea:v1:';

/* ------------------------------------------------------------------ */
/* Validering (strukturell, render-klar)                               */
/* ------------------------------------------------------------------ */

export function validateTestDef(def, { allowUnresolvedPools = false } = {}) {
  const errors = [];
  if (!def || typeof def !== 'object') return { ok: false, errors: ['def mangler eller er ikke objekt'] };
  const req = ['schemaVersion', 'id', 'type', 'family', 'languages', 'scoring', 'dimensions', 'items'];
  for (const k of req) if (def[k] === undefined) errors.push(`mangler toppfelt: ${k}`);
  if (def.schemaVersion !== 1) errors.push('schemaVersion må være 1');
  if (def.type !== 'test-definition') errors.push('type må være "test-definition"');
  if (!Array.isArray(def.languages) || def.languages.length === 0) errors.push('languages må være ikke-tom liste');
  const langs = def.languages || [];
  if (Array.isArray(def.scoring) || !def.scoring || typeof def.scoring.type !== 'string') {
    errors.push('scoring.type mangler');
  } else if (!['trait', 'threshold', 'g-score'].includes(def.scoring.type)) {
    errors.push(`ukjent scoring.type: ${def.scoring.type}`);
  }
  const dimIds = new Set((def.dimensions || []).map((d) => d.id));
  const ids = new Set();
  for (const item of def.items || []) {
    if (item.id === undefined) { errors.push('item mangler id'); continue; }
    if (ids.has(item.id)) errors.push(`duplikat item-id: ${item.id}`);
    ids.add(item.id);
    if (!['likert', 'ability', 'order'].includes(item.kind)) errors.push(`${item.id}: ukjent kind ${item.kind}`);
    if (item.pool && !item.text && !item.variants) {
      if (!allowUnresolvedPools) errors.push(`${item.id}: pool "${item.pool}" ikke merget (ingen innhold på item)`);
      continue; // innhold kommer fra /tests/pool; strukturell sjekk av merget innhold skjer der
    }
    if (item.kind === 'likert') {
      if (!item.text || item.text.length < 1) errors.push(`${item.id}: likert mangler text`);
      if (!item.options || item.options.length < 2) errors.push(`${item.id}: likert må ha ≥2 options`);
      if (item.lang && langs.length && !langs.includes(item.lang)) errors.push(`${item.id}: item.lang "${item.lang}" ikke i languages`);
    }
    if (item.kind === 'order' && (!item.elements || item.elements.length < 3)) {
      errors.push(`${item.id}: order krever ≥3 elements`);
    }
    if (item.kind === 'ability') {
      for (const v of item.variants || []) {
        if (v.lang && langs.length && !langs.includes(v.lang)) errors.push(`${item.id}: variant.lang "${v.lang}" ikke i languages`);
        if (v.correctIndex === undefined || !Array.isArray(v.options)) errors.push(`${item.id}: variant mangler correctIndex/options`);
        else if (v.correctIndex < 0 || v.correctIndex >= v.options.length) errors.push(`${item.id}: correctIndex utenfor options (${v.correctIndex}/${v.options.length})`);
      }
    }
    for (const s of item.scales || []) {
      if (!dimIds.has(s.id)) errors.push(`${item.id}: scale "${s.id}" er ikke deklarert i dimensions`);
    }
  }
  for (const d of def.dimensions || []) {
    if (!d.id || !d.label || !d.labelLanguage || !d.description) errors.push(`dimension "${d.id || '?'}": mangler id/label/labelLanguage/description`);
  }
  return { ok: errors.length === 0, errors };
}

export function resolveLang(def, wanted) {
  if (def.languages.includes(wanted)) return wanted;
  return def.languages[0]; // schema v1: order = fallback order
}

/* ------------------------------------------------------------------ */
/* Sampling og øktlogikk (rene funksjoner)                             */
/* ------------------------------------------------------------------ */

export function sessionSizeFor(def) {
  if (def.scoring.type === 'g-score') {
    return Math.min(def.scoring.maxItems || 25, def.items.length);
  }
  return def.items.length; // likert/threshold/order: alle items, shuffles
}

export function computeUsedReset(def, usedIds) {
  const size = sessionSizeFor(def);
  return usedIds.length >= def.items.length - size; // "near-exhaustion"
}

export function shuffleInPlace(arr, rng = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function sampleSession(def, { usedIds = [], rng = Math.random } = {}) {
  const sessionSize = sessionSizeFor(def);
  const pool = def.items.map((i) => i.id);
  let resetUsed = false;
  if (sessionSize < def.items.length) {
    let available = pool.filter((id) => !usedIds.includes(id));
    if (available.length < sessionSize) { resetUsed = true; available = pool; }
    shuffleInPlace(available, rng);
    return { itemIds: available.slice(0, sessionSize), resetUsed, sampleSize: sessionSize };
  }
  const copy = pool.slice();
  shuffleInPlace(copy, rng);
  return { itemIds: copy, resetUsed, sampleSize: copy.length };
}

export function newSessionState(def, lang, sample) {
  return {
    v: 1,
    testId: def.id,
    lang,
    renderVersion: RENDER_VERSION,
    itemIds: sample.itemIds,
    answers: {},
    shuffle: {},      // itemId -> visningsrekkefølge (ability: orgIndexer; order: elementer)
    idx: 0,
    startedAt: Date.now(),
    finished: false,
  };
}

/* ---------------------- tid ---------------------- */

export function fmtTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const p = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${p(h)}:${p(m)}:${p(ss)}` : `${p(m)}:${p(ss)}`;
}

/* ---------------------- storage ---------------------- */

export function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

function defaultStorage() {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch { /* node/stub */ }
  return memoryStorage();
}

export function saveSession(store, session) {
  store.setItem(STORAGE_NS + 'session:' + session.testId, JSON.stringify(session));
}
export function loadSession(store, testId) {
  try {
    const raw = store.getItem(STORAGE_NS + 'session:' + testId);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s && s.itemIds ? s : null;
  } catch { return null; }
}
export function clearSession(store, testId) {
  store.removeItem(STORAGE_NS + 'session:' + testId);
}
export function saveUsedIds(store, testId, usedIds) {
  store.setItem(STORAGE_NS + 'used:' + testId, JSON.stringify(usedIds));
}
export function loadUsedIds(store, testId) {
  try {
    const raw = store.getItem(STORAGE_NS + 'used:' + testId);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? Array.from(new Set(arr)) : []; // dedup ved les: brukt-liste forblir ren over mange økter
  } catch { return []; }
}

/* ---------------------- UI-tekster ---------------------- */

const BASE_DICT = {
  no: {
    'ui.next': 'Neste',
    'ui.finish': 'Fullfør og vis resultat',
    'ui.questionOf': 'Spørsmål {a} av {b}',
    'ui.timeLeft': 'Tid igjen',
    'ui.timeUsed': 'Tid brukt',
    'ui.timeExpired': 'Tiden er ute — dine svar er lagret.',
    'ui.orderHint': 'Sett elementene i riktig rekkefølge:',
    'ui.orderSelect': 'Velg et element, bruk pil-knappene for å flytte.',
    'ui.progressLabel': 'Testfremgang',
    'ui.resume': 'Avbrutt økt funnet: {a}/{b} besvarte spørsmål. Fortsetter automatisk der du slapp. Kan avsluttes nedenfor.',
    'ui.resumeQuit': 'Avslutt økten nå',
    'ui.resumeBye': 'Økten er lagret på denne enheten — fortsett senere.',
  },
  en: {
    'ui.next': 'Next',
    'ui.finish': 'Finish and show result',
    'ui.questionOf': 'Question {a} of {b}',
    'ui.timeLeft': 'Time left',
    'ui.timeUsed': 'Time used',
    'ui.timeExpired': 'Time is up — your answers have been saved.',
    'ui.orderHint': 'Put the elements in the correct order:',
    'ui.orderSelect': 'Select an element, use the arrow buttons to move it.',
    'ui.progressLabel': 'Test progress',
    'ui.resume': 'Interrupted session found: {a}/{b} answered questions. Continuing automatically where you left off. Can be ended below.',
    'ui.resumeQuit': 'End the session now',
    'ui.resumeBye': 'Session is saved on this device — continue later.',
  },
};

function uiDict(lang, overrides = {}) {
  const base = BASE_DICT[lang] || BASE_DICT.en;
  const en = BASE_DICT.en;
  return (key) => (overrides[key] || base[key] || en[key] || key);
}

/* ---------------------- visningslag ---------------------- */

function el(tag, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

/* ---------------- figur-lag (VISUELL-A, todo #3849) ---------------- */
/* Matrise-celler og pil-tiles tegnes som vektorfigur (SVG i ekte DOM; tekst-ekvivalent
 * i stub-DOM uten createElementNS). Defs røres aldri: parseren leser ASCII-formene
 * i def-JSON; ukjent form -> eksakt gammel visning (textContent). Ingen import,
 * ingen klokke, ingen rng => byte-deterministisk. Tekst finnes ikke i figuren
 * (ren linje-geometri) => ingen fontavhengighet. Svarformat urokkelig: klikk lagrer
 * fortsatt {kind:'ability', abilityOriginalIndex}. */

const BAF_RETN = '<>^v/\\|-';

function bafParseSymbolToken(s) {
  if (typeof s !== 'string') return null;
  const re = new RegExp('^\\[(\\?|[' + BAF_RETN + ']+)\\]$');
  const m = re.exec(s);
  return m ? m[1] : null;
}

function bafParseGridCells(raw) {
  if (typeof raw !== 'string') return null;
  const lines = raw.split('\n');
  if (lines.length !== 4) return null;
  const re = /\[(\?|[<>^v/\\|-]+)\]/g;
  const rows = [];
  for (let r = 0; r < 3; r++) {
    const row = [];
    let m;
    while ((m = re.exec(lines[r + 1])) !== null) row.push(m[1]);
    if (row.length !== 3) return null;
    rows.push(row);
  }
  return rows;
}

/* pilsegmenter per retningstegn (skoletrom [-1,1]; y ned = nedover):
 * hovedlinje + vinger ved spissen; ren linje for '|' og '-'. */
const BAF_SEGS = {
  '<': [[0.55, 0, -0.45, 0], [-0.45, 0, -0.05, -0.35], [-0.45, 0, -0.05, 0.35]],
  '>': [[-0.55, 0, 0.45, 0], [0.45, 0, 0.05, -0.35], [0.45, 0, 0.05, 0.35]],
  '^': [[0, 0.55, 0, -0.45], [0, -0.45, -0.35, -0.05], [0, -0.45, 0.35, -0.05]],
  'v': [[0, -0.55, 0, 0.45], [0, 0.45, -0.35, 0.05], [0, 0.45, 0.35, 0.05]],
  '/': [[-0.5, 0.5, 0.5, -0.5], [0.5, -0.5, 0.05, -0.5], [0.5, -0.5, 0.5, -0.05]],
  '\\': [[-0.5, -0.5, 0.5, 0.5], [0.5, 0.5, 0.05, 0.5], [0.5, 0.5, 0.5, 0.05]],
  '-': [[-0.6, 0, 0.6, 0]],
  '|': [[0, -0.6, 0, 0.6]],
};
const BAF_FG = 'var(--ba-text)';
const BAF_FRAME = 'var(--ba-border)';
const BAF_Q = 'var(--ba-accent-deep)';
const BAF_NS = 'http://www.w3.org/2000/svg';

/* SVG-node med deterministisk tekst-ekvivalent i stub-DOM
 * (stub mangler createElementNS; da returneres <pre>). */
function bafSvg(tag, attrs, klass) {
  let n = null;
  if (typeof document.createElementNS === 'function') {
    try { n = document.createElementNS(BAF_NS, tag); } catch { n = null; }
  }
  if (n && typeof n.setAttribute === 'function' && typeof n.appendChild === 'function') {
    for (const k of Object.keys(attrs)) n.setAttribute(k, attrs[k]);
    if (klass) n.setAttribute('class', klass);
    return n;
  }
  const e = el('pre', klass || 'ba-fig-text');
  e.textContent = attrs.__text || '';
  return e;
}

function bafIsSvg(n) {
  return Boolean(n) && typeof n.tagName === 'string' &&
    String(n.tagName).toUpperCase() === 'SVG' &&
    typeof n.appendChild === 'function' &&
    typeof n.setAttribute === 'function';
}

/* n identiske symboler i sentrert rad (antalls-lesning, Raven-stil). */
function bafSymbolRow(s, tokenInner, x, y, w, slotCap) {
  const n = tokenInner.length;
  const slot = n === 1 ? slotCap : Math.min(slotCap, (w * 0.92) / n);
  const half = slot * 0.44;
  const startX = x + (w - n * slot) / 2;
  const cw = Math.max(1.5, half * 0.22);
  const segs = BAF_SEGS[tokenInner[0]] || BAF_SEGS['<'];
  for (let i = 0; i < n; i++) {
    const cx = startX + slot * (i + 0.5);
    for (let k = 0; k < segs.length; k++) {
      const sg = segs[k];
      s.appendChild(bafSvg('line', {
        x1: (cx + sg[0] * half).toFixed(2), y1: (y + sg[1] * half).toFixed(2),
        x2: (cx + sg[2] * half).toFixed(2), y2: (y + sg[3] * half).toFixed(2),
        stroke: BAF_FG, 'stroke-width': cw.toFixed(2), 'stroke-linecap': 'round',
        __text: tokenInner[0],
      }));
    }
  }
}

function bafSymbolRowText(tokenInner, cellW) {
  const n = tokenInner.length;
  const slot = n === 1 ? 18 : Math.min(18, (cellW * 0.92) / n);
  const pad = Math.max(0, Math.round((cellW - slot * n) / 2));
  return ' '.repeat(Math.round(pad / 3)) + tokenInner[0].repeat(n);
}

function bafTileFigure(tokenInner) {
  const s = bafSvg('svg', { viewBox: '0 0 240 72', role: 'img', __text: '[' + tokenInner + ']' }, 'ba-fig ba-fig-tile');
  if (bafIsSvg(s)) bafSymbolRow(s, tokenInner, 4, 36, 232, 26);
  return s;
}

function bafGridFigure(rows) {
  const text = rows.map((r) => r.map((c) => '[' + c + ']').join(' ')).join('\n');
  const s = bafSvg('svg', { viewBox: '0 0 316 316', role: 'img', __text: text }, 'ba-fig ba-fig-grid');
  if (!bafIsSvg(s)) return s;
  const cell = 100, gap = 4;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const inner = rows[r][c];
      const x = gap + c * (cell + gap);
      const y = gap + r * (cell + gap);
      s.appendChild(bafSvg('rect', {
        x: String(x), y: String(y), width: String(cell), height: String(cell), rx: '8',
        fill: 'none', stroke: inner === '?' ? BAF_Q : BAF_FRAME, 'stroke-width': '2',
        'stroke-dasharray': inner === '?' ? '5 5' : 'none', __text: '[' + inner + ']',
      }));
      if (inner === '?') {
        s.appendChild(bafSvg('text', {
          x: String(x + cell / 2), y: String(y + cell * 0.72), 'font-size': '58',
          fill: BAF_Q, 'text-anchor': 'middle', 'font-family': 'system-ui, sans-serif',
          __text: '?',
        }));
      } else {
        bafSymbolRow(s, inner, x + 6, y + cell / 2, cell - 12, cell - 24);
      }
    }
  }
  return s;
}

export function letterOf(i) { return String.fromCharCode(65 + i); }

/* anker-lag (VISUELL-B, todo #3851): endeanker for likert-skalaer, lest direkte
 * fra def-objektets egne options (laveste/hoyeste verdi med label). Ingen nye
 * datafelt oppfinnes: mangler tallverdier/non-empty labels => ingen anker-rad
 * (eksakt gammel visning). Ren div/span, ingen rng/klokke => byte-deterministisk. */
export function bafScaleAnchors(item) {
  const opts = item && Array.isArray(item.options) ? item.options : null;
  if (!opts || opts.length < 2) return null;
  let lo = null, hi = null;
  for (const o of opts) {
    if (!o || typeof o.label !== 'string' || !o.label.trim()) return null;
    if (typeof o.value !== 'number' || !Number.isFinite(o.value)) return null;
    if (lo === null || o.value < lo.value) lo = o;
    if (hi === null || o.value > hi.value) hi = o;
  }
  if (lo === null || hi === null || lo === hi) return null;
  return { min: lo, max: hi };
}

function injectStyles() {
  if (!document.head) return;
  const style = document.createElement('style');
  style.textContent = STYLES;
  document.head.appendChild(style);
}

const STYLES = `
.ba-test{--ba-bg:transparent;--ba-fg:var(--ba-text);--ba-dim:var(--ba-text-muted);--ba-accent:var(--ba-accent-deep);--ba-warn:var(--ba-warn);
  background:transparent;color:var(--ba-fg);font:inherit;
  max-width:40rem;margin:0 auto;padding:1rem;min-height:12rem}
.ba-test *,.ba-test *::before{box-sizing:border-box}
.ba-test-top{display:flex;flex-wrap:wrap;gap:.5rem 1rem;align-items:center;justify-content:space-between;margin-bottom:.75rem}
.ba-progress{flex:1 1 10rem;display:flex;align-items:center;gap:.5rem}
.ba-progressbar{position:relative;flex:1;height:.5rem;border-radius:.25rem;background:var(--ba-surface-2);overflow:hidden}
.ba-progressbar-fill{position:absolute;inset:0;right:auto;width:0;background:var(--ba-accent);transition:width .25s ease}
.ba-progress-num{font-size:.85rem;color:var(--ba-dim);white-space:nowrap}
.ba-time{font-size:.85rem;color:var(--ba-dim);white-space:nowrap;font-variant-numeric:tabular-nums}
.ba-time--warn{color:var(--ba-warn);font-weight:600}
.ba-item{padding:.5rem 0 1rem}
.ba-item h2{font-size:1.05rem;font-weight:600;margin:0 0 .75rem}
.ba-hint{color:var(--ba-dim);font-size:.85rem;margin:0 0 .5rem}
.ba-options{display:flex;flex-direction:column;gap:.5rem}
.ba-opt{display:block;width:100%;text-align:left;min-height:2.75rem;padding:.5rem .75rem;border-radius:.5rem;
  border:1px solid var(--ba-border);background:var(--ba-surface);color:var(--ba-fg);font:inherit;cursor:pointer;
  transition:border-color .15s ease,background-color .15s ease}
.ba-opt:hover{border-color:var(--ba-text-dim)}
.ba-opt[aria-pressed="true"]{border-color:var(--ba-accent);background:var(--ba-surface-2);box-shadow:inset 3px 0 0 var(--ba-accent)}
.ba-opt:focus-visible,.ba-nav button:focus-visible,.ba-order button:focus-visible{outline:2px solid var(--ba-accent);outline-offset:1px}
.ba-order{display:flex;flex-direction:column;gap:.5rem}
.ba-order .ba-order-elem{display:flex;gap:.5rem;align-items:center}
.ba-order button{min-height:2.75rem;min-width:2.75rem;border-radius:.4rem;border:1px solid var(--ba-border);background:var(--ba-surface);color:var(--ba-fg);cursor:pointer;font:inherit}
.ba-order .ba-order-elem.sel button.ba-order-move{border-color:var(--ba-accent)}
.ba-nav{display:flex;justify-content:flex-end;margin-top:.75rem}
.ba-nav button{min-height:2.75rem;padding:.5rem 1.25rem;border-radius:.5rem;border:1px solid var(--ba-border);background:var(--ba-surface-2);color:var(--ba-fg);font:inherit;cursor:pointer}
.ba-nav button:disabled{opacity:.45;cursor:not-allowed}
.ba-ad-slot{min-height:0}
.ba-terminal{margin-top:.75rem;color:var(--ba-dim)}
.ba-resume{display:flex;flex-wrap:wrap;gap:.5rem 1rem;align-items:center;justify-content:space-between;
  border:1px solid var(--ba-border);border-radius:.5rem;background:var(--ba-surface);color:var(--ba-fg);
  padding:.6rem .8rem;margin-bottom:.75rem;max-width:40rem}
.ba-resume-text{margin:0}
.ba-resume-actions{display:flex}
.ba-resume-quit{min-height:2.75rem;padding:.35rem .85rem;border-radius:.4rem;border:1px solid var(--ba-border);cursor:pointer;font:inherit;background:var(--ba-surface);color:var(--ba-fg)}
.ba-resume-quit:focus-visible{outline:2px solid var(--ba-accent);outline-offset:1px}
.ba-fig{display:block;max-width:100%;height:auto;margin:.25rem 0 .75rem}
.ba-fig-tile{height:2.6rem}
.ba-fig-grid{width:min(20rem,100%)}
.ba-fig-text{display:block;white-space:pre;font:15px/1.35 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--ba-fg);margin:0 0 .75rem;overflow-x:auto}
.ba-scale-anchors{display:flex;justify-content:space-between;gap:1rem;color:var(--ba-dim);font-size:.85rem;line-height:1.4;padding:0 .25rem;margin-top:-.15rem}
.ba-scale-anchor{min-width:0;overflow:hidden;text-overflow:ellipsis}
@media (prefers-reduced-motion: reduce){.ba-progressbar-fill{transition:none}}
`;

/**
 * Montrer renderer i et DOM-element. Timer injiseres via opts.now (testbar uten ekte setInterval).
 *
 * opts: { lang?, dict?, timeBudgetSeconds?, rng?, now?, storage?, onComplete?, onProgress? }
 * returnerer håndtak: { session, next, finish, destroy, _tickForTest, _bar, _nextBtn, _itemBox }
 */
export function mountRenderer(rootEl, def, opts = {}) {
  const errors = validateTestDef(def, { allowUnresolvedPools: true });
  if (!errors.ok) throw new Error('render: ugyldig test-definisjon: ' + errors.errors.join('; '));

  const t = uiDict(resolveLang(def, opts.lang || 'no'), opts.dict);
  const now = opts.now || (() => Date.now());
  const storage = opts.storage || defaultStorage();
  const budget = opts.timeBudgetSeconds | 0;

  injectStyles();
  rootEl.classList.add('ba-root');

  // økt: gjenopptak eller ny
  let session = loadSession(storage, def.id);
  const idsSet = new Set(def.items.map((i) => i.id));
  const validResume = session && !session.finished && session.testId === def.id &&
    Array.isArray(session.itemIds) && session.itemIds.every((id) => idsSet.has(id)) &&
    session.idx <= session.itemIds.length;
  // avbruddsdeteksjon: gjenopptakbar økt med fremgang = "fortsett der du slapp"
  const isResume = Boolean(validResume) &&
    (session.idx > 0 || (session.answers && Object.keys(session.answers).length > 0));
  const answeredCount = session && session.answers ? Object.keys(session.answers).length : 0;
  const totalItems = session && Array.isArray(session.itemIds) ? session.itemIds.length : 0;
  let usedIds = loadUsedIds(storage, def.id);
  let rng;
  if (!validResume) {
    // NY økt: seed + teller bor I økten (persistert sammen med den).
    // opts.seedSeed (eksplisitt) = reproduserbar økt; ellers auto-seed.
    const rngState = newRngState(opts.seedSeed);
    rng = opts.rng || makeCountedRng(rngState);
    const sample = sampleSession(def, { usedIds, rng });
    if (sample.resetUsed) usedIds = sample.itemIds.slice(); // reset: brukt-liste starter på nytt med dagens økt
    else usedIds = usedIds.concat(sample.itemIds); // umiddelbar bokføring: økt-items tilhører "brukt" straks de er skåret ut (avbrudd må ikke gjenbruke dem)
    saveUsedIds(storage, def.id, usedIds); // persistert NÅ — tablukk uten fullføring respekterer no-repeat
    session = newSessionState(def, resolveLang(def, opts.lang || 'no'), sample);
    session.startedAt = now(); // injisert klokke styrer økt-start (testbar tid)
    session[RNG_FIELD] = rngState;
    saveSession(storage, session);
  } else {
    // GJENOPPTAK: samme seed + samme teller = samme strøm der økten slapp.
    const rngState = session[RNG_FIELD] || newRngState(opts.seedSeed); // gamle økter uten rng-felt
    session[RNG_FIELD] = rngState;
    rng = opts.rng || makeCountedRng(rngState);
    saveSession(storage, session);
  }

  /* ---------- DOM-struktur ---------- */
  const main = el('main', 'ba-test');
  const head = el('header', 'ba-test-top');
  const prog = el('div', 'ba-progress');
  const bar = el('div', 'ba-progressbar');
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-valuemin', '0');
  const barFill = el('div', 'ba-progressbar-fill');
  bar.appendChild(barFill);
  const progNum = el('span', 'ba-progress-num');
  prog.appendChild(bar); prog.appendChild(progNum);
  const timeChip = el('span', 'ba-time');
  head.appendChild(prog); head.appendChild(timeChip);
  const itemBox = el('div', 'ba-item');
  const foot = el('footer', 'ba-test-foot');
  const adSlot = el('div', 'ba-ad-slot');
  adSlot.setAttribute('data-reserved', 'ads');
  adSlot.hidden = true;
  const nav = el('div', 'ba-nav');
  const nextBtn = document.createElement('button');
  // resume-state: banner "fortsett der du slapp" påvises/skjules etter samtykke
  const resumeText = isResume
    ? t('ui.resume').replace('{a}', String(Math.min(answeredCount, totalItems))).replace('{b}', String(totalItems))
    : null;
  nextBtn.textContent = t('ui.next');
  nextBtn.disabled = true;
  nav.appendChild(nextBtn);
  foot.appendChild(adSlot); foot.appendChild(nav);
  main.appendChild(head); main.appendChild(itemBox); main.appendChild(foot);
  rootEl.appendChild(main);

  // resume-banner: vist bare når økt er gjenopptatt med fremgang — "fortsett der du slapp"
  let resumeBanner = null;
  let resumeQuitBtn = null;
  function setResumeVisible(on) {
    if (!resumeText) return;
    if (on) {
      if (!resumeBanner) {
        resumeBanner = el('section', 'ba-resume');
        resumeBanner.setAttribute('role', 'status');
        const txt = el('p', 'ba-resume-text');
        txt.textContent = resumeText;
        resumeBanner.appendChild(txt);
        const actions = el('div', 'ba-resume-actions');
        resumeQuitBtn = document.createElement('button');
        resumeQuitBtn.className = 'ba-opt ba-resume-quit';
        resumeQuitBtn.textContent = t('ui.resumeQuit');
        resumeQuitBtn.addEventListener('click', () => {
          stopTimer();
          setResumeVisible(false);
          itemBox.textContent = '';
          const bye = el('p', 'ba-terminal');
          bye.textContent = t('ui.resumeBye');
          itemBox.appendChild(bye);
          nextBtn.disabled = true;
        });
        actions.appendChild(resumeQuitBtn);
        resumeBanner.appendChild(actions);
      }
      if (rootEl.contains && !rootEl.contains(resumeBanner)) {
        // banner over testen i ekte DOM; stub-DOM (uten insertBefore) degraderer til appendChild
        if (typeof rootEl.insertBefore === 'function') rootEl.insertBefore(resumeBanner, main);
        else rootEl.appendChild(resumeBanner);
      }
    } else if (resumeBanner && rootEl.contains && rootEl.contains(resumeBanner)) {
      rootEl.removeChild(resumeBanner);
    }
  }
  setResumeVisible(isResume);

  /* ---------- timer ---------- */
  let timerHandle = null;
  let expired = false;
  function tick(nowMs) {
    const elapsed = Math.max(0, (nowMs - session.startedAt) / 1000);
    if (budget > 0) {
      const left = Math.max(0, budget - elapsed);
      timeChip.textContent = `${t('ui.timeLeft')} ${fmtTime(left)}`;
      timeChip.classList.toggle('ba-time--warn', left <= 60 && left > 0);
      if (left <= 0 && !session.finished) { finish(true); return elapsed; }
      return elapsed;
    }
    timeChip.textContent = `${t('ui.timeUsed')} ${fmtTime(elapsed)}`;
    return elapsed;
  }
  function startTimer() {
    if (budget <= 0 || timerHandle || typeof setInterval === 'undefined') return;
    timerHandle = setInterval(() => tick(now()), 1000);
  }
  function stopTimer() {
    if (timerHandle && typeof clearInterval !== 'undefined') clearInterval(timerHandle);
    timerHandle = null;
  }

  /* ---------- gjeldende spørsmål ---------- */
  function itemById(id) { return def.items.find((i) => i.id === id); }
  function currentItem() { return session.idx < session.itemIds.length ? itemById(session.itemIds[session.idx]) : null; }

  function render() {
    const total = session.itemIds.length;
    const idx = Math.min(session.idx, total);
    bar.setAttribute('aria-valuemax', String(total));
    bar.setAttribute('aria-valuenow', String(idx));
    const progLabel = idx >= total ? t('ui.finish') : t('ui.questionOf').replace('{a}', String(idx + 1)).replace('{b}', String(total));
    bar.setAttribute('aria-label', progLabel);
    progNum.textContent = idx >= total ? '' : `${idx + 1}/${total}`;
    barFill.style.width = `${total ? Math.round((idx / total) * 100) : 0}%`;
    nextBtn.disabled = true;
    itemBox.textContent = '';
    if (idx >= total) return;

    const item = currentItem();
    if (item.kind === 'likert') renderLikert(item);
    else if (item.kind === 'ability') renderAbility(item);
    else if (item.kind === 'order') renderOrder(item);
    nextBtn.textContent = session.idx + 1 >= total ? t('ui.finish') : t('ui.next');
    focusHeading();
  }

  function renderLikert(item) {
    const h = el('h2');
    h.textContent = item.text;
    h.tabIndex = -1;
    itemBox.appendChild(h);
    const group = el('div', 'ba-options');
    group.setAttribute('role', 'radiogroup');
    group.setAttribute('aria-label', item.text);
    const answered = session.answers[item.id];
    item.options.forEach((opt) => {
      const b = document.createElement('button');
      b.className = 'ba-opt';
      b.textContent = opt.label;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-pressed', String(Boolean(answered && answered.value === opt.value)));
      b.addEventListener('click', () => {
        session.answers[item.id] = { kind: 'likert', lang: item.lang, value: opt.value };
        for (const x of group.children) x.setAttribute('aria-pressed', 'false');
        b.setAttribute('aria-pressed', 'true');
        nextBtn.disabled = false;
        saveSession(storage, session);
      });
      if (answered && answered.value === opt.value) nextBtn.disabled = false;
      group.appendChild(b);
    });
    itemBox.appendChild(group);
    /* VISUELL-B (#3851): endeanker under skalaen — defs egne 1/5-labels.
       Sibling utenfor .ba-options (gruppe-kontrakten til selftests er urort).
       aria-hidden: betydningen bor i knappene — raden er visuell redundans. */
    const anch = bafScaleAnchors(item);
    if (anch) {
      const row = el('div', 'ba-scale-anchors');
      row.setAttribute('aria-hidden', 'true');
      const aLo = el('span', 'ba-scale-anchor');
      aLo.textContent = `${anch.min.value} · ${anch.min.label}`;
      const aHi = el('span', 'ba-scale-anchor');
      aHi.textContent = `${anch.max.value} · ${anch.max.label}`;
      row.appendChild(aLo); row.appendChild(aHi);
      itemBox.appendChild(row);
    }
  }

  function renderAbility(item) {
    const lang = item.variants.some((v) => v.lang === session.lang) ? session.lang : item.variants[0].lang;
    const variant = item.variants.find((v) => v.lang === lang) || item.variants[0];
    if (!session.shuffle[item.id]) {
      session.shuffle[item.id] = shuffleInPlace(variant.options.map((_, i) => i), rng);
      saveSession(storage, session);
    }
    const displayOrder = session.shuffle[item.id];
    /* VISUELL-A (#3849): prompt med 3x3 matriseformer tegnes som figur; ukjent form
       -> eksakt gammel visning (textContent). Svarformat urokkelig. */
    const gridRows = bafParseGridCells(variant.prompt);
    const h = el('h2');
    h.tabIndex = -1;
    if (gridRows) {
      h.textContent = variant.prompt.split('\n')[0];
      itemBox.appendChild(h);
      const fig = bafGridFigure(gridRows);
      fig.setAttribute('aria-label', variant.prompt);
      itemBox.appendChild(fig);
    } else {
      h.textContent = variant.prompt;
      itemBox.appendChild(h);
    }
    const group = el('div', 'ba-options');
    const answered = session.answers[item.id];
    const buttons = [];
    displayOrder.forEach((origIdx, displayIdx) => {
      const b = document.createElement('button');
      b.className = 'ba-opt';
      const bafTok = bafParseSymbolToken(variant.options[origIdx].label);
      if (bafTok !== null) {
        b.appendChild(bafTileFigure(bafTok));
        b.setAttribute('aria-label', `${letterOf(displayIdx)}. ${variant.options[origIdx].label}`);
      } else {
        b.textContent = `${letterOf(displayIdx)}. ${variant.options[origIdx].label}`;
      }
      b.setAttribute('aria-pressed', String(Boolean(answered && answered.abilityOriginalIndex === origIdx)));
      b.addEventListener('click', () => {
        session.answers[item.id] = { kind: 'ability', lang: variant.lang, abilityOriginalIndex: origIdx };
        buttons.forEach((x) => x.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', 'true');
        nextBtn.disabled = false;
        saveSession(storage, session);
      });
      if (answered && answered.abilityOriginalIndex === origIdx) nextBtn.disabled = false;
      buttons.push(b);
      group.appendChild(b);
    });
    itemBox.appendChild(group);
  }

  function renderOrder(item) {
    if (!session.shuffle[item.id]) {
      session.shuffle[item.id] = shuffleInPlace(item.elements.slice(), rng);
      saveSession(storage, session);
    }
    const shuffled = session.shuffle[item.id];
    const h = el('h2');
    h.textContent = item.prompt || t('ui.orderHint');
    h.tabIndex = -1;
    itemBox.appendChild(h);
    const hint = el('p', 'ba-hint');
    hint.textContent = t('ui.orderSelect');
    itemBox.appendChild(hint);
    const list = el('div', 'ba-order');
    function draw(list) {
      list.textContent = '';
      shuffled.forEach((elem, i) => {
        const row = el('div', 'ba-order-elem');
        const badge = el('span');
        badge.textContent = `${i + 1}.`;
        const label = el('span');
        label.textContent = elem;
        label.style.flex = '1';
        const up = document.createElement('button');
        up.className = 'ba-order-move';
        up.textContent = '↑';
        up.setAttribute('aria-label', `flytt ${elem} opp`);
        up.addEventListener('click', () => {
          if (i === 0) return;
          [shuffled[i - 1], shuffled[i]] = [shuffled[i], shuffled[i - 1]];
          draw(list);
        });
        const down = document.createElement('button');
        down.className = 'ba-order-move';
        down.textContent = '↓';
        down.setAttribute('aria-label', `flytt ${elem} ned`);
        down.addEventListener('click', () => {
          if (i === shuffled.length - 1) return;
          [shuffled[i + 1], shuffled[i]] = [shuffled[i], shuffled[i + 1]];
          draw(list);
        });
        row.appendChild(badge); row.appendChild(label); row.appendChild(up); row.appendChild(down);
        list.appendChild(row);
      });
    }
    draw(list);
    itemBox.appendChild(list);
    nextBtn.disabled = false; // rekkefølge kan sendes inn som den er
  }

  function focusHeading() {
    const h = itemBox.querySelector && itemBox.querySelector('h2');
    if (h && typeof h.focus === 'function') h.focus();
  }

  /* ---------- navigasjon ---------- */
  nextBtn.addEventListener('click', () => {
    if (nextBtn.disabled) return;
    // order: svaret ER den viste rekkefølgen — lagres før avansement
    const cur = currentItem();
    if (cur && cur.kind === 'order' && session.shuffle[cur.id]) {
      session.answers[cur.id] = { kind: 'order', order: session.shuffle[cur.id].slice() };
    }
    session.idx += 1;
    if (session.idx >= session.itemIds.length) {
      saveSession(storage, session);
      finish(false);
      return;
    }
    saveSession(storage, session); // bokført ETTER inkrement: refresh midt i økt mister ingen fremdrift
    if (opts.onProgress) opts.onProgress(session.idx, session.itemIds.length);
    render();
  });

  /* ---------- fullføring ---------- */
  function finish(byTimeout) {
    if (session.finished) return;
    session.finished = true;
    expired = Boolean(byTimeout);
    const finishedAt = now();
    const timeSpentSec = Math.max(0, (finishedAt - session.startedAt) / 1000);
    // no-repeat-bokføring — idempotent: items er allerede bokført ved økt-start
    // (avbruddssikkerhet), denne linjen gjør finish uavhengig healing og gamle sessjoner
    const merged = Array.from(new Set(usedIds.concat(session.itemIds)));
    saveUsedIds(storage, def.id, merged);
    clearSession(storage, def.id);
    stopTimer();
    setResumeVisible(false); // fullført/utløpt økt: banner "fortsett der du slapp" fjernes
    if (expired) {
      const term = el('p', 'ba-terminal');
      term.textContent = t('ui.timeExpired');
      itemBox.textContent = '';
      itemBox.appendChild(term);
      nextBtn.disabled = true;
    }
    if (opts.onComplete) {
      opts.onComplete({
        testId: def.id,
        lang: session.lang,
        itemIds: session.itemIds,
        startedAt: session.startedAt,
        finishedAt,
        timeSpentSec,
        expired,
        answers: session.answers,
      });
    }
  }

  startTimer();
  tick(now());
  render();

  return {
    get session() { return session; },
    next: () => { if (!nextBtn.disabled) nextBtn.click(); },
    finish: (byTimeout = false) => finish(byTimeout),
    destroy: () => { stopTimer(); if (rootEl.contains && rootEl.contains(main)) rootEl.removeChild(main); },
    _tickForTest: (nowMs) => tick(nowMs),
    _bar: bar,
    _barFill: barFill,
    _nextBtn: nextBtn,
    _itemBox: itemBox,
    _setResumeVisible: setResumeVisible,
    _resumeBanner: () => resumeBanner,
    _resumeQuitBtn: () => resumeQuitBtn,
  };
}
