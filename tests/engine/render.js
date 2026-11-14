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
 * 4. Gjenopptak: pågående økt lagres i storage; refresh mister ikke fremgang (krav: ingen konto).
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

export const RENDER_VERSION = '0.4.0';

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
    return Array.isArray(arr) ? arr : [];
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

function letterOf(i) { return String.fromCharCode(65 + i); }

function injectStyles() {
  if (!document.head) return;
  const style = document.createElement('style');
  style.textContent = STYLES;
  document.head.appendChild(style);
}

const STYLES = `
.ba-test{--ba-bg:#0b0f14;--ba-fg:#e9eff5;--ba-dim:#9fb4c7;--ba-accent:#4dc3ff;--ba-warn:#ffb02e;
  background:var(--ba-bg);color:var(--ba-fg);font:16px/1.6 system-ui,sans-serif;
  max-width:40rem;margin:0 auto;padding:1rem;min-height:12rem}
.ba-test *,.ba-test *::before{box-sizing:border-box}
.ba-test-top{display:flex;flex-wrap:wrap;gap:.5rem 1rem;align-items:center;justify-content:space-between;margin-bottom:.75rem}
.ba-progress{flex:1 1 10rem;display:flex;align-items:center;gap:.5rem}
.ba-progressbar{position:relative;flex:1;height:.5rem;border-radius:.25rem;background:#1c2633;overflow:hidden}
.ba-progressbar-fill{position:absolute;inset:0;right:auto;width:0;background:var(--ba-accent);transition:width .25s ease}
.ba-progress-num{font-size:.85rem;color:var(--ba-dim);white-space:nowrap}
.ba-time{font-size:.85rem;color:var(--ba-dim);white-space:nowrap;font-variant-numeric:tabular-nums}
.ba-time--warn{color:var(--ba-warn);font-weight:600}
.ba-item{padding:.5rem 0 1rem}
.ba-item h2{font-size:1.05rem;font-weight:600;margin:0 0 .75rem}
.ba-hint{color:var(--ba-dim);font-size:.85rem;margin:0 0 .5rem}
.ba-options{display:flex;flex-direction:column;gap:.5rem}
.ba-opt{display:block;width:100%;text-align:left;min-height:2.75rem;padding:.5rem .75rem;border-radius:.5rem;
  border:1px solid #22303f;background:#101822;color:var(--ba-fg);font:inherit;cursor:pointer}
.ba-opt[aria-pressed="true"]{border-color:var(--ba-accent);background:#12233a}
.ba-opt:focus-visible,.ba-nav button:focus-visible,.ba-order button:focus-visible{outline:2px solid var(--ba-accent);outline-offset:1px}
.ba-order{display:flex;flex-direction:column;gap:.5rem}
.ba-order .ba-order-elem{display:flex;gap:.5rem;align-items:center}
.ba-order button{min-height:2.25rem;min-width:2.25rem;border-radius:.4rem;border:1px solid #22303f;background:#101822;color:var(--ba-fg);cursor:pointer;font:inherit}
.ba-order .ba-order-elem.sel button.ba-order-move{border-color:var(--ba-accent)}
.ba-nav{display:flex;justify-content:flex-end;margin-top:.75rem}
.ba-nav button{min-height:2.75rem;padding:.5rem 1.25rem;border-radius:.5rem;border:1px solid #22303f;background:#12233a;color:var(--ba-fg);font:inherit;cursor:pointer}
.ba-nav button:disabled{opacity:.45;cursor:not-allowed}
.ba-ad-slot{min-height:0}
.ba-terminal{margin-top:.75rem;color:var(--ba-dim)}
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
  let usedIds = loadUsedIds(storage, def.id);
  let rng;
  if (!validResume) {
    // NY økt: seed + teller bor I økten (persistert sammen med den).
    // opts.seedSeed (eksplisitt) = reproduserbar økt; ellers auto-seed.
    const rngState = newRngState(opts.seedSeed);
    rng = opts.rng || makeCountedRng(rngState);
    const sample = sampleSession(def, { usedIds, rng });
    if (sample.resetUsed) usedIds = [];
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
  nextBtn.textContent = t('ui.next');
  nextBtn.disabled = true;
  nav.appendChild(nextBtn);
  foot.appendChild(adSlot); foot.appendChild(nav);
  main.appendChild(head); main.appendChild(itemBox); main.appendChild(foot);
  rootEl.appendChild(main);

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
  }

  function renderAbility(item) {
    const lang = item.variants.some((v) => v.lang === session.lang) ? session.lang : item.variants[0].lang;
    const variant = item.variants.find((v) => v.lang === lang) || item.variants[0];
    if (!session.shuffle[item.id]) {
      session.shuffle[item.id] = shuffleInPlace(variant.options.map((_, i) => i), rng);
      saveSession(storage, session);
    }
    const displayOrder = session.shuffle[item.id];
    const h = el('h2');
    h.textContent = variant.prompt;
    h.tabIndex = -1;
    itemBox.appendChild(h);
    const group = el('div', 'ba-options');
    const answered = session.answers[item.id];
    const buttons = [];
    displayOrder.forEach((origIdx, displayIdx) => {
      const b = document.createElement('button');
      b.className = 'ba-opt';
      b.textContent = `${letterOf(displayIdx)}. ${variant.options[origIdx].label}`;
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
    // no-repeat-bokføring
    const merged = Array.from(new Set(usedIds.concat(session.itemIds)));
    saveUsedIds(storage, def.id, merged);
    clearSession(storage, def.id);
    stopTimer();
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
  };
}
