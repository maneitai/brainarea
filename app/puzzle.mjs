/**
 * Brainarea puzzle boot-modul — [BYGG] #3841.
 *
 * Binder puzzle-player.mjs (ren state machine, #3765) til /play-rutene via
 * runner-boot-merket (ba-run-boot, data-ba-run="puzzle:<locale>").
 * Logikken er en 1:1-port av tests/puzzle/puzzle-demo.html wrapperen:
 *   - Standard mode: 16 etasjer (7L/5M/4H), retry fra etasje 9,
 *     foerste-respons-skår, resume via STORAGE_KEY_PREFIX-anafringen.
 *   - Endless mode: laases opp etter fullfoert standard-run; aldri scoring-
 *     eller normering-payload (player-kontrakten).
 *   - Skår: scoreTest(def, buildScorePayload) -> theta/ci95 vises aehrlig
 *     (ikke normalisert, ikke IQ-tall) — renderReport brukes IKKE her
 *     (ingen norms, config.testIds inneholder ikke puzzle-v1; demo-kontrakt).
 *   - Normering-PPOST til /normering (FASE 4-endepunkt): best-effort, feil
 *     svelges aehrlig (statisk hosting svarer ikke i dag).
 *
 * Kontrakter innfris (verifisert mot kilder [BYGG] #3841):
 *   player:    tests/puzzle/puzzle-player.mjs v0.1.0 — self-contained,
 *              ingen DOM/fetch/RNG; state.machine-funksjonene brukes verbatim.
 *   stub-DOM:  tests/engine/_runner_selftest_child.mjs-stubben har ikke
 *              element.remove()/setTimeout-garantier -> wrapperen bygger
 *              rader via innerHTML='' og bruker aldri .remove()/setTimeout.
 *   annonser:  /play er statisk landingssrute (beslutning 11) — denne modulen
 *              legger INGEN annonse, og roerer ikke AD_PLACEMENTS.
 *
 * Klassene er puz-* prefikset: site.css har ingen .tile/.opts/.banner/
 * .board-klasser (grep verifisert) — ingen kollisjon med brosjyre-laget.
 */

import {
  STORAGE_KEY_PREFIX, PLAYER_STRINGS, CURVE,
  initStandardRun, openFloor, submitChoice, advance,
  buildScorePayload, buildNormeringPayload, buildShareCard,
  initEndlessRun, endlessPick, submitEndless, serialize, deserialize,
} from '@BA@/tests/puzzle/puzzle-player.mjs';
import { scoreTest } from '@BA@/tests/engine/scoring.js';

const URL_DEF = (lang) => new URL(`defs/pool/puzzle/def-puzzle-v1.${lang}.json`, import.meta.url);

/* Normering-PPOST-endepunktet er FASE 4; github.io i dag svarer 404 — svelges. */
const NORMERING_URL = (typeof location !== 'undefined' && location.origin ? location.origin : '') + '/brainarea/normering';

/* ---------------- mini-DOM-hjelpere (stub-sikre) ---------------- */

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

const PUZ_CSS = `
.puz-board{max-width:34rem;margin:0 auto;padding:1.1rem;border:1px solid #22303f;border-radius:.9rem;background:#101820;color:#d7e4ee;font:16px/1.55 system-ui,sans-serif}
.puz-board + .puz-board{margin-top:.9rem}
.puz-title{margin:0 0 .35rem;font-size:1.3rem;font-weight:800;color:#e8f4ff}
.puz-muted{color:#9fb4c7;font-size:.92rem;margin:.3rem 0}
.puz-prog{height:8px;border-radius:4px;background:#22303f;overflow:hidden;margin:.6rem 0 .2rem}
.puz-prog > div{height:100%;background:#39d0d8}
.puz-floorLabel{font-size:.9rem;color:#9fb4c7;margin:.4rem 0}
.puz-tiles{display:flex;flex-wrap:wrap;gap:8px;margin:.8rem 0}
.puz-tile{width:52px;height:62px;border-radius:10px;background:#0b0f14;border:1px solid #2c3a48;color:#e8f4ff;display:flex;align-items:center;justify-content:center;font-size:1.55rem}
.puz-tile-next{color:#39d0d8;border-style:dashed}
.puz-tile-reveal{background:rgba(57,208,216,.18)}
.puz-opts{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:.5rem 0}
.puz-opts button{min-height:48px;min-width:48px;border-radius:10px;cursor:pointer;border:1px solid #2c3a48;color:#d7e4ee;background:#0b0f14;font-size:1.25rem;display:flex;align-items:center;justify-content:center}
.puz-status{min-height:1.4em;font-size:.95rem;margin:.5rem 0}
.puz-status--ok{color:#7de2a6}
.puz-status--bad{color:#ff9a9a}
.puz-banner{background:#10303a;color:#c8f4f6;border-radius:10px;padding:.6rem .8rem;margin:.6rem 0}
.puz-btn{margin-top:.7rem;border:1px solid #2c3a48;background:#12233a;color:#e9eff5;border-radius:.5rem;padding:.55rem 1.1rem;cursor:pointer;font:inherit}
.puz-btn-primary{border-color:#39d0d8}
.puz-btn:disabled{opacity:.5;cursor:not-allowed}
.puz-hidden{display:none}
.puz-shareText{user-select:all}
`;
(function injectPuzCss() {
  if (!document.head) return;
  const style = document.createElement('style');
  style.textContent = PUZ_CSS;
  document.head.appendChild(style);
})();

/* ---------------- boot-modulen ---------------- */

/**
 * Monterer spill-UI-et i runner-slotten. Fristilt feil -> aehrlig feilboks
 * (samme kontrakt som runner-en for trait-flow).
 */
export async function mountPuzzleGames(container, tt, mark) {
  const lang = mark.locale;

  let def;
  try {
    const res = await fetch(URL_DEF(lang), { cache: 'no-cache' });
    if (!res.ok) throw new Error('puzzle-def: HTTP ' + res.status);
    def = await res.json();
  } catch (e) {
    container.textContent = '';
    container.appendChild(el('div', 'puz-board', tt('ui.run.err.defMissing')));
    return;
  }

  const dict = PLAYER_STRINGS[lang] || PLAYER_STRINGS.no;
  const fmt = (key, ...args) => {
    let s = dict[key];
    if (typeof s !== 'string') throw new Error('puzzle: mangler tekst: ' + key);
    return s.replace(/\{a\}/g, String(args[0] ?? '')).replace(/\{b\}/g, String(args[1] ?? '')).replace(/\{c\}/g, String(args[2] ?? ''));
  };

  /* CSS: en puz-skjerm per tilstand (stub-sikker: ingen .remove()/setTimeout) */
  const board = el('div', 'puz-board');
  const banner = el('div', 'puz-banner puz-hidden');
  const startSection = el('div', 'puz-start');
  const gameSection = el('div', 'puz-game puz-hidden');
  const resultSection = el('div', 'puz-result puz-hidden');
  const endlessSection = el('div', 'puz-endless puz-hidden');
  container.textContent = '';
  container.appendChild(banner);
  container.appendChild(startSection);
  container.appendChild(gameSection);
  container.appendChild(resultSection);
  container.appendChild(endlessSection);

  const show = (which) => {
    for (const [sec, name] of [[startSection, 'start'], [gameSection, 'game'], [resultSection, 'result'], [endlessSection, 'endless']]) {
      sec.classList.toggle('puz-hidden', name !== which);
    }
  };

  /* ---------- start-skjerm ---------- */
  const startTitle = el('h2', 'puz-title', fmt('game.title'));
  const startLead = el('p', 'puz-muted', lang === 'no'
    ? '16 etasjer med sekvenspuzzler. Fra etasje 9 faar du ett forsok til. Svaret ditt telles fra forste valg.'
    : '16 floors of sequence puzzles. From floor 9 you get one more attempt. Scoring uses your first choice.');
  const startBtn = el('button', 'puz-btn puz-btn-primary', fmt('game.start'));
  startBtn.setAttribute('data-puz', 'start');
  const restartNote = el('p', 'puz-muted');
  startSection.appendChild(startTitle);
  startSection.appendChild(startLead);
  startSection.appendChild(startBtn);
  startSection.appendChild(restartNote);

  /* ---------- spill-skjerm ---------- */
  const prog = el('div', 'puz-prog');
  const progBar = el('div');
  prog.appendChild(progBar);
  prog.setAttribute('aria-valuemin', '0'); prog.setAttribute('aria-valuemax', '100');
  const floorLabel = el('p', 'puz-floorLabel');
  const tileLabel = el('p', 'puz-muted', lang === 'no' ? 'Sekvensen:' : 'The sequence:');
  const tileRow = el('div', 'puz-tiles');
  tileRow.setAttribute('role', 'img');
  const opts = el('div', 'puz-opts');
  const status = el('p', 'puz-status');
  status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const nextBtn = el('button', 'puz-btn puz-btn-primary puz-hidden');
  nextBtn.setAttribute('data-puz', 'next');
  gameSection.appendChild(prog);
  gameSection.appendChild(floorLabel);
  gameSection.appendChild(tileLabel);
  gameSection.appendChild(tileRow);
  gameSection.appendChild(opts);
  gameSection.appendChild(status);
  gameSection.appendChild(nextBtn);

  /* ---------- resultat-skjerm ---------- */
  const resTitle = el('h2', 'puz-title', fmt('result.title'));
  const resIntro = el('p', 'puz-muted');
  const resLevel = el('p');
  const resBest = el('p', 'puz-muted');
  const shareBtn = el('button', 'puz-btn', fmt('result.sharePrompt'));
  shareBtn.setAttribute('data-puz', 'share');
  const shareText = el('p', 'puz-muted puz-shareText');
  const endlessNote = el('p', 'puz-muted', fmt('game.endlessNotTest'));
  const endlessBtn = el('button', 'puz-btn puz-btn-primary', fmt('game.endlessStart'));
  endlessBtn.setAttribute('data-puz', 'endless');
  const restartBtn = el('button', 'puz-btn', fmt('game.restart'));
  resultSection.appendChild(resTitle);
  resultSection.appendChild(resIntro);
  resultSection.appendChild(resLevel);
  resultSection.appendChild(resBest);
  resultSection.appendChild(shareBtn);
  resultSection.appendChild(shareText);
  resultSection.appendChild(endlessNote);
  resultSection.appendChild(endlessBtn);
  resultSection.appendChild(restartBtn);

  /* ---------- endless-skjerm ---------- */
  const endlessTileLabel = el('p', 'puz-muted', lang === 'no' ? 'Sekvensen:' : 'The sequence:');
  const endlessTileRow = el('div', 'puz-tiles');
  const endlessOpts = el('div', 'puz-opts');
  const endlessScore = el('p', 'puz-status');
  const endlessRunLbl = el('p', 'puz-muted');
  const endlessLeave = el('button', 'puz-btn puz-btn-primary', lang === 'no' ? 'Tilbake til resultatet' : 'Back to result');
  endlessSection.appendChild(endlessTileLabel);
  endlessSection.appendChild(endlessTileRow);
  endlessSection.appendChild(endlessOpts);
  endlessSection.appendChild(endlessScore);
  endlessSection.appendChild(endlessRunLbl);
  endlessSection.appendChild(endlessLeave);

  /* ---------------- state + flow ---------------- */

  let state = null;
  let timer = null;
  let endless = null;

  const saveState = () => { try { localStorage.setItem(STORAGE_KEY_PREFIX + 'standard', serialize(state)); } catch { /* aehrlig: resume er best effort */ } };
  const loadSave = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PREFIX + 'standard');
      return raw ? deserialize(raw, def, lang) : null;
    } catch { return null; }
  };
  const startTimer = () => {
    if (timer != null) clearInterval(timer);
    timer = setInterval(() => { if (state) state.elapsedSec += 1; }, 1000);
  };

  function paintTile(target, glyph, cls) {
    target.textContent = glyph;
    target.setAttribute('aria-label', (lang === 'no' ? 'flis ' : 'tile ') + glyph[0] + ', ' + glyph.slice(1));
    if (cls) target.classList.add(cls);
  }

  function buildTiles(row, v) {
    /* prompt-kontrakten: "…: g1 g2 … ?" — demo-spliten, verbatim.
       Ekte appendChild: stub-DOM-en i tester ser innerHTML-barn, og hver
       flis skal ha egen aria-label (farge+form-redundans, a11y-kontrakten). */
    const seq = String(v.prompt).split(': ')[1].split(' ');
    row.textContent = '';
    for (const gl of seq.slice(0, seq.length - 1)) {
      const d = el('div', 'puz-tile');
      paintTile(d, gl);
      row.appendChild(d);
    }
    const q = el('div', 'puz-tile puz-tile-next');
    paintTile(q, '?');
    row.appendChild(q);
  }

  function buildOpts(into, v, onPick) {
    into.textContent = '';
    v.options.forEach((o, ix) => {
      const b = el('button', 'puz-tile');
      paintTile(b, o.label);
      b.setAttribute('aria-label', fmt('game.a11y.option', ix + 1, o.label));
      b.disabled = false;
      b.addEventListener('click', () => onPick(ix));
      into.appendChild(b);
    });
  }

  function renderFloor() {
    show('game');
    const floorNo = state.floorIdx + 1;
    const pct = Math.round((state.floorIdx / 16) * 100);
    progBar.style.setProperty('width', pct + '%');
    prog.setAttribute('aria-valuenow', String(pct));
    prog.setAttribute('aria-label', fmt('game.a11y.progressLabel'));
    floorLabel.textContent = fmt('game.floorProgress', floorNo, 16)
      + ' · ' + (lang === 'no' ? 'rekkefolje: ' : 'band: ') + CURVE[state.floorIdx]
      + ' · ' + (lang === 'no' ? 'beste feilfrie strekk: ' : 'best run: ') + state.bestRun;
    const item = def.items.find((i) => i.id === state.floor.itemId);
    const v = item.variants[0];
    buildTiles(tileRow, v);
    buildOpts(opts, v, choose);
    status.textContent = '';
    status.className = 'puz-status';
    nextBtn.classList.add('puz-hidden');
    if (floorNo < 9) restartNoteFix();
  }

  function restartNoteFix() { /* plassholdertekst for retry-statusen vises i status, ikke her */ }

  function choose(ix) {
    const res = submitChoice(state, ix);
    if (res.outcome === 'retry') {
      status.textContent = fmt('game.retryAvailable');
      status.className = 'puz-status';
      return;
    }
    saveState();
    if (res.outcome === 'solved') {
      status.textContent = fmt('game.floorSolved');
      status.className = 'puz-status puz-status--ok';
    } else {
      status.textContent = fmt('game.floorMissed');
      status.className = 'puz-status puz-status--bad';
      /* dobbeltfeil-reveal: riktig flis lyser KORT — stub-sikker uten
         setTimeout: neste render (Videre/ny etasje) bygger raden paany. */
      const v = def.items.find((i) => i.id === state.floor.itemId).variants[0];
      const rev = el('div', 'puz-tile puz-tile-reveal', '');
      paintTile(rev, v.options[v.correctIndex].label, 'puz-tile-reveal');
      tileRow.appendChild(rev);
    }
    for (const b of opts.children) b.disabled = true;
    nextBtn.classList.remove('puz-hidden');
    nextBtn.textContent = state.floorIdx + 1 >= 16 ? fmt('game.finishStandard') : fmt('game.continue');
  }

  nextBtn.addEventListener('click', () => {
    const r = advance(state);
    saveState();
    if (r.finished) { clearInterval(timer); renderResult(); }
    else { openFloor(state); renderFloor(); }
  });

  function renderResult() {
    show('result');
    const scored = scoreTest(def, buildScorePayload(state, Date.now(), state.elapsedSec));
    if (!scored.ok) throw new Error('puzzle: scoreTest avviste payload: ' + (scored.errors || []).join('; '));
    const t = scored.result.total;
    resIntro.textContent = fmt('result.thetaIntro')
      + (t.theta !== null && t.ci95 ? ' (' + (lang === 'no' ? 'estimat ' : 'estimate ') + t.theta.toFixed(2)
        + (lang === 'no' ? ', bredt band ' : ', wide band ') + t.ci95[0].toFixed(2) + ' – ' + t.ci95[1].toFixed(2) + ')' : '');
    resLevel.textContent = fmt('result.levelReached', state.levelReached, 16);
    resBest.textContent = fmt('result.bestRun', state.bestRun);
    const card = buildShareCard(state, lang, dict);
    shareBtn.textContent = fmt('result.sharePrompt');
    shareBtn.addEventListener('click', () => {
      shareText.textContent = card.text;
      try { if (typeof navigator !== 'undefined' && navigator.clipboard) navigator.clipboard.writeText(card.text); } catch { /* best effort */ }
    });
    restartBtn.textContent = fmt('game.restart');
    /* normering-PPOST: anonym foerste-respons-rekke til FASE 4-endepunktet.
       Best effort — statisk hosting (github.io i dag) svarer ikke, feilen
       svelges og payload-et lagres aldri lokalt (identifierfritt per kontrakt). */
    const np = buildNormeringPayload(state, state.elapsedSec);
    try {
      fetch(NORMERING_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(np) }).catch(() => {});
    } catch { /* aehrlig: ingen transport */ }
  }

  /* ---------- endless ---------- */
  endlessBtn.addEventListener('click', () => {
    endless = initEndlessRun(lang);
    show('endless');
    renderEndless();
  });
  endlessLeave.addEventListener('click', () => show('result'));

  function renderEndless() {
    if (endless.finished) {
      endlessScore.textContent = fmt('game.endlessHighscore', endless.highscore);
      endlessOpts.innerHTML = '';
      endlessTileRow.innerHTML = '';
      return;
    }
    const id = endlessPick(endless.idx, endless.usedIds, def.items.map((i) => i.id).sort());
    if (!id) { endless.usedIds = []; return renderEndless(); } /* computeUsedReset-konvensjonen */
    const item = def.items.find((i) => i.id === id);
    const v = item.variants[0];
    buildTiles(endlessTileRow, v);
    buildOpts(endlessOpts, v, (ix) => {
      const r = submitEndless(endless, id, ix, v.correctIndex);
      if (r.outcome === 'solved') { renderEndless(); return; }
      try { localStorage.setItem(STORAGE_KEY_PREFIX + 'endless', String(endless.highscore)); } catch { /* best effort */ }
      renderEndless();
    });
    endlessScore.textContent = '';
    endlessRunLbl.textContent = fmt('game.endlessHighscore', endless.highscore)
      + (lang === 'no' ? ' · na: ' : ' · now: ') + endless.currentRun;
  }

  /* ---------- start/resume ---------- */
  function startNew() {
    state = initStandardRun(def, lang);
    state.startedAt = Date.now();
    saveState();
    startTimer();
    openFloor(state);
    renderFloor();
  }
  function resume() {
    state = loadSave();
    if (!state) return startNew();
    const floorNo = Math.min(state.floorIdx + 1, 16);
    banner.classList.remove('puz-hidden');
    banner.textContent = fmt('game.resumeBanner', floorNo);
    startTimer();
    if (!state.finished) { openFloor(state); renderFloor(); }
    else { clearInterval(timer); renderResult(); }
  }
  function wantResume() {
    return localStorage.getItem(STORAGE_KEY_PREFIX + 'standard') != null;
  }

  startBtn.addEventListener('click', () => {
    try { localStorage.removeItem(STORAGE_KEY_PREFIX + 'standard'); } catch { /* best effort */ }
    startNew();
  });
  restartBtn.addEventListener('click', () => {
    try { localStorage.removeItem(STORAGE_KEY_PREFIX + 'standard'); } catch { /* best effort */ }
    startNew();
  });

  /* foerstelast: resume-banner-mulighet, ellers startbilde */
  if (wantResume()) {
    try {
      const st = loadSave();
      if (st && !st.finished) {
        resume();
        return;
      }
      if (st && st.finished) {
        /* ferdig run: vis resultatet direkte (samme som retake-landingen) */
        state = st;
        renderResult();
        return;
      }
    } catch { /* uleselig state -> startbilde */ }
  }
  banner.classList.add('puz-hidden');
  show('start');
}
