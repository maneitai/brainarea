/**
 * Brainarea browser-runner (app/run.js) — [BYGG] #3840.
 *
 * Bindingen mellom motor (tests/engine), rapport (report) og sidene:
 *   BA-RUN-markør i statisk HTML → readMark → def-henting → validateTestDef
 *   (i mountRenderer) → mountRenderer → onComplete → scoreTest(allowPartial:
 *   false) → evaluateAttention(never ekskluderer) → renderReport(standard-frame)
 *   → resultat-ui (ærlig språk, delingstekst, PDF-knapp, gjenta).
 *   Gjenopptaksbanner kommer fra render.js sin storage-kontrakt — runner-en
 *   skriver aldri tolkning og berører aldri økt-tilstand direkte.
 *
 * ---- Beslutninger (dokumentert) ----
 * 1. Ingen annonser i testflyten (beslutning 11): runner-en renderer ingen
 *    ad-slots; render.js footers reserverte spor forblir tomt/hidden.
 * 2. Delgraf/samarbeidsgraf: FASE 3-komponenten er DYADISK (to profilvektorer —
 *    rows:2 i _share_link). Enkeltbruker-resultat kan ikke generere den —
 *    ærlig delingstekst nå, par-graf er FASE 4 leveranse. Ingen falsk knapp.
 * 3. PDF: report/pdf/* er rene ES-moduler (ingen node-api), fonts levere vi som
 *    Uint8Array ved klikk (tr Lazy fetch). Import-kast → knapp markerer
 *    utilgjengelig (ærlig feil, aldri stille).
 * 4. Attention: DETEKSJON ≠ EKSKLUSJON (motor-kontrakt) — flagg vises, dreper
 *    aldri skår og filtrerer aldri svar.
 * 5. Resultat persistes lokalt (RUN_NS) — etter fullføring vises resultatet ved
 *    reload; «Gjenta» tømmer session/used og starter på nytt (ingen konto).
 * 6. Composite-interim: hvis evne-def mangler, flettes pool-filene i runtime
 *    (samme kontrakt) med banner «degradert» — rel/pool-fallback finnes IKKE
 *    (deterministisk 4-per-dim seleksjon er byggetid).
 *
 * ---- Bygge-kontrakt (build.js #3840) ----
 *   out/_app/run.js (denne filen med '@BA@/' → './' rewrites)
 *   out/_app/tests/engine/*.js, out/_app/i18n/*.js, out/_app/report/renderer.mjs
 *   out/_app/report/configs/standard.json, out/_app/defs/**, out/_app/fonts/*.ttf
 *   out/_app/pdf/brainarea-pdf.mjs (+ pdffont.mjs)
 *   Alle data-fetches er modul-relative (new URL('...', import.meta.url)) —
 *   fungerer fra alle side-URL-er (/no/persona/, /en/relations/ osv.).
 */
import { mountRenderer, STORAGE_NS } from '@BA@/tests/engine/render.js';
import { scoreTest } from '@BA@/tests/engine/scoring.js';
import { evaluateAttention } from '@BA@/tests/engine/attention.js';
import { registerOverlay, makeT } from '@BA@/i18n/index.js';
import { KEYS as NO_KEYS } from '@BA@/i18n/no.js';
import { renderReport } from '@BA@/report/renderer.mjs';
import { mountPuzzleGames } from '@BA@/puzzle.mjs';

const RUN_NS = 'ba-run:';

/* ---------- data-URLs (modul-relative — uavhengig av side-URL) ---------- */
const URL_CONFIG = new URL('report/configs/standard.json', import.meta.url);
const URL_DEFS = (name) => new URL(`defs/${name}`, import.meta.url);
const URL_FONT = (name) => new URL(`fonts/${name}`, import.meta.url);

/* ---------- markørens lesning ---------- */
function readMark() {
  const script = document.getElementById('ba-run-boot');
  if (!script) return null;
  const [test, locale] = (script.dataset.baRun || '').split(':');
  if (!test || !locale) return null;
  return { test, locale, mountId: `ba-run-${test}-${locale}` };
}

class DefMissingError extends Error {}

/* ---------- evne-fallback: flett pool-filer til kjørbar def (interim) ---------- */
const EVNE_POOLS = [
  'def-evne-t1-matrise', 'def-evne-t2-numerisk', 'def-evne-t3-verbal',
  'def-evne-t4-romlig', 'def-evne-t5-sekvens', 'def-evne-t6-deduksjon',
];
async function loadEvnePools(lang) {
  const items = [];
  let dims = null;
  let metric = 'z100';
  for (const file of EVNE_POOLS) {
    const res = await fetch(URL_DEFS(`pool/evne/${file}.${lang}.json`));
    if (!res.ok) throw new DefMissingError('evne-pool: HTTP ' + res.status);
    const p = await res.json();
    if (!dims) dims = p.dimensions;
    if (p.scoring && p.scoring.metric) metric = p.scoring.metric;
    for (const it of p.items) {
      if (items.some((x) => x.id === it.id)) continue;
      items.push(it);
    }
  }
  return {
    schemaVersion: 1, type: 'test-definition',
    id: 'evne-g-44', family: 'evner',
    languages: [lang],
    scoring: { type: 'g-score', metric, ci95: true, maxItems: 44 },
    dimensions: dims,
    items,
    composite: { version: 1, runtimeFallback: true, timeBudgetSeconds: 1680 },
  };
}

/* ---------- def-henting ---------- */
const DEFS = {
  persona: 'def-ipip50-big5',
  iq: 'def-evne-g-44',
  relational: 'def-rel-16',
};
const PUZZLE_TESTS = new Set(['puzzle']);
async function loadDef(test, lang) {
  const name = DEFS[test];
  if (!name) throw new DefMissingError('ukjent test: ' + test);
  let res;
  try {
    res = await fetch(URL_DEFS(`${name}.${lang}.json`), { cache: 'no-cache' });
  } catch (e) {
    throw new DefMissingError(String(e));
  }
  if (res.ok) return { def: await res.json(), degraded: false };
  if (name === DEFS.iq) {
    return { def: await loadEvnePools(lang), degraded: true };
  }
  throw new DefMissingError(`def ${name}.${lang}: HTTP ${res.status}`);
}

/* ---------- resultat-persistens (lokal, identifierfri) ---------- */
function readResult(store, testId) {
  try {
    const raw = store.getItem(RUN_NS + 'result:' + testId);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function writeResult(store, data) {
  store.setItem(RUN_NS + 'result:' + data.result.testId, JSON.stringify(data));
}

/* ---------- runner-CSS (motor-stilene eies av render.js) ---------- */
const RUN_CSS = `
.ba-run-result{max-width:40rem;margin:1.5rem auto 0;padding:1.25rem;border:1px solid #22303f;border-radius:.75rem;background:#0b0f14;color:#e9eff5;font:16px/1.6 system-ui,sans-serif}
.ba-run-result h2{margin:0 0 .75rem;font-size:1.25rem;font-weight:700}
.ba-run-note{max-width:40rem;margin:0 auto .75rem;padding:.75rem 1rem;border:1px solid #22303f;border-left:3px solid #ffb02e;border-radius:.5rem;background:#0b0f14;color:#9fb4c7;font:14px/1.5 system-ui,sans-serif}
.ba-run-actions{display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1.25rem}
.ba-run-actions button{border:1px solid #22303f;background:#12233a;color:#e9eff5;border-radius:.5rem;padding:.5rem 1rem;cursor:pointer;font:inherit}
.ba-run-actions button:disabled{opacity:.5;cursor:not-allowed}
.ba-run-att{margin:1.1rem 0 0;padding:.7rem .95rem;border-radius:.5rem;border:1px solid #22303f;background:#101822;color:#9fb4c7;font-size:.9rem}
.ba-run-att--clean{border-left:3px solid #37d67a}
`;
(function injectRunCss() {
  if (!document.head) return;
  const style = document.createElement('style');
  style.textContent = RUN_CSS;
  document.head.appendChild(style);
})();

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

/* ================================================================ */
/* boot                                                             */
/* ================================================================ */

async function boot() {
  const mark = readMark();
  const container = mark ? document.getElementById(mark.mountId) : null;
  if (!container) return; /* ikke en testside — runner-en gjør ingenting */

  registerOverlay('no', NO_KEYS);
  const t = makeT(mark.locale);
  const tt = (key, vars) => {
    let s = t(key);
    for (const [k, v] of Object.entries(vars || {})) s = s.split(`{${k}}`).join(v);
    return s;
  };

  container.textContent = '';

  if (PUZZLE_TESTS.has(mark.test)) {
    await mountPuzzleGames(container, tt, mark);
    return;
  }

  let def, degraded;
  try {
    ({ def, degraded } = await loadDef(mark.test, mark.locale));
  } catch (e) {
    container.appendChild(el('div', 'ba-run-result',
      e instanceof DefMissingError ? tt('ui.run.err.defMissing') : tt('ui.run.err.generic')));
    return;
  }

  /* tidligere fullført resultat? → vis det, ikke en ny økt */
  const prior = readResult(localStorage, def.id);
  if (prior && prior.report) {
    showResult(container, def, tt, prior, {});
    return;
  }

  const opts = {
    lang: mark.locale,
    storage: localStorage,
    onComplete: (payload) => handleComplete(container, def, tt, mark, payload),
  };
  if (def.composite && def.composite.timeBudgetSeconds) opts.timeBudgetSeconds = def.composite.timeBudgetSeconds;

  if (degraded) {
    const card = el('div', 'ba-run-note');
    card.appendChild(el('strong', null, tt('ui.run.err.degradedTitle')));
    card.appendChild(el('p', null, tt('ui.run.err.degradedBody')));
    container.appendChild(card);
  }
  mountRenderer(container, def, opts);
}

/* ================================================================ */
/* onComplete → scoring → rapport → resultat-ui                     */
/* ================================================================ */

async function fetchConfig() {
  const res = await fetch(URL_CONFIG, { cache: 'no-cache' });
  if (!res.ok) throw new Error('config: HTTP ' + res.status);
  return res.json();
}

async function handleComplete(container, def, tt, mark, payload) {
  const scored = scoreTest(def, payload, { allowPartial: false });
  if (!scored.ok) {
    container.textContent = '';
    container.appendChild(el('div', 'ba-run-result', tt('ui.run.err.generic')));
    return;
  }
  const result = scored.result;

  /* attention: vises aldri som eksklusjon — bare status */
  let att = null;
  try { att = evaluateAttention(def, payload, {}); } catch { att = null; }

  let report;
  try {
    const cfg = await fetchConfig();
    report = renderReport(result, cfg, { lang: mark.locale });
  } catch (e) {
    container.textContent = '';
    container.appendChild(el('div', 'ba-run-result', tt('ui.run.err.generic')));
    return;
  }

  const persist = { result, report };
  writeResult(localStorage, persist);
  showResult(container, def, tt, persist, { att });
}

function showResult(container, def, tt, persist, { att } = {}) {
  const { report, result } = persist;
  const box = el('div', 'ba-run-result');
  box.appendChild(el('h2', null, tt('ui.run.result')));

  const content = el('div', 'ba-run-report');
  content.innerHTML = report.html; /* renderReport-HTML er deterministisk og esc-et */
  box.appendChild(content);

  if (att && att.quality) {
    const n = (att.quality.summary && att.quality.summary.flags) || 0;
    const div = el('div', 'ba-run-att' + (n === 0 ? ' ba-run-att--clean' : ''));
    div.textContent = n === 0 ? tt('ui.run.attention.clean') : tt('ui.run.attention.flagged', { a: String(n) });
    box.appendChild(div);
  }

  /* deling: dyadisk par-graf er FASE 4 — ærlig tekst, ingen falsk knapp */
  const share = el('div', 'ba-run-att', tt('ui.run.share.done'));
  box.appendChild(share);

  const actions = el('div', 'ba-run-actions');

  const pdfBtn = el('button', null, tt('ui.run.pdf.button'));
  pdfBtn.addEventListener('click', () => downloadPdf(result, markLocale(def), tt, pdfBtn));
  actions.appendChild(pdfBtn);

  const retakeBtn = el('button', null, tt('ui.run.retake'));
  retakeBtn.addEventListener('click', () => retake(def));
  actions.appendChild(retakeBtn);

  box.appendChild(actions);
  container.textContent = '';
  container.appendChild(box);
}

function markLocale(def) {
  /* språk fra persistert resultat-tråd: def.languages[0] er den som ble lastet */
  return (def.languages && def.languages[0]) || 'no';
}

function retake(def) {
  /* tøm kun denne testens motor-tilstand + resultat, behold alt annet */
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
  for (const k of keys) {
    if (k.startsWith(STORAGE_NS + 'session:' + def.id) || k.startsWith(STORAGE_NS + 'used:' + def.id) || k === RUN_NS + 'result:' + def.id) {
      localStorage.removeItem(k);
    }
  }
  location.reload();
}

/* ================================================================ */
/* PDF — valgfri modul, ærlige feil                                 */
/* ================================================================ */

let fontsCache = null;
async function loadFonts() {
  if (fontsCache) return fontsCache;
  const [reg, bold] = await Promise.all([
    fetch(URL_FONT('DejaVuSans.ttf')).then((r) => { if (!r.ok) throw new Error('font'); return r.arrayBuffer(); }),
    fetch(URL_FONT('DejaVuSans-Bold.ttf')).then((r) => { if (!r.ok) throw new Error('font'); return r.arrayBuffer(); }),
  ]);
  fontsCache = { fontRegular: new Uint8Array(reg), fontBold: new Uint8Array(bold) };
  return fontsCache;
}

async function downloadPdf(result, lang, tt, btn) {
  btn.disabled = true;
  try {
    const { renderReportPdf } = await import('./pdf/brainarea-pdf.mjs');
    const fonts = await loadFonts();
    const cfg = await fetchConfig();
    const pdf = renderReportPdf(result, cfg, { lang, ...fonts });
    if (!pdf || !pdf.bytes) throw new Error('tom pdf');
    const blob = new Blob([pdf.bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = el('a');
    a.href = url;
    a.download = 'brainarea-resultat.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (e) {
    btn.textContent = tt('ui.run.pdf.unavailable');
  } finally {
    btn.disabled = false;
  }
}

/* ---------- boot når DOM står ---------- */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { boot(); });
} else {
  boot();
}
