/**
 * Brainarea puzzle-player v0.1.0 — [BYGG] FASE 2 (#3765).
 *
 * Ren state machine for «Sekvensmester / Sequence Master» (puzzle-v1).
 * Ingen DOM, ingen fs-imports, ingen RNG: wrapperen (demo/selftest/side)
 * injiserer def (def-puzzle-v1.no/en.json) og kaller funksjonene.
 *
 * ---- Kontrakt mot designkontrakt v1.1 (tests/puzzle/_puzzle_design_v1_1.md) ----
 * - 16 etasjer, eksakt 7L (etasje 1–7) / 5M (8–12) / 4H (13–16), strengt monotone blokker.
 * - Retry: etasje >= 9 (RETRY_FROM_FLOOR) gir ETT ekstra forsok. Fasit vises aldri;
 *   dobbeltfeil => kort reveal (reveal-flagg), etasjen lases, run gaar videre.
 * - Foerste-respons-kontrakt: score-payload inneholder KUN foerste respons per item
 *   (firstAnswers). Retry-svar bor i state.attempts og naar ALDRI payload-et.
 * - Streak omdefinert: currentRun telles per loest etasje (foerste forsok eller retry,
 *   begge teller som loest), nullstilles per lukket etasje med feil. bestRun = maks.
 *   Gamey-laget (bestRun/currentRun/levelReached/endless highscore) deles ALDRI
 *   med skoering eller normering.
 * - Endless: laases opp etter fullfoert standard run; 1 forsok per tile, feil avslutter
 *   run-et; highscore = antall riktige (erklart: ikke en testskore). Endless-emitter
 *   ALDRI score-payload og ALDRI normering-payload.
 * - used-ids: computeUsedReset-konvensjonen fra engine/render.js (naer-uttmming -> reset).
 * - normering-payload: { testId, language, answers[16], durationSec, demographics? }
 *   der answers er foerste-respons-indekser i itemIds-orden — validateert mot
 *   functions/normering.js validatePostPayload i selftestet.
 * - resume: serialize/deserialize rundtur; refresh midt-i-etasje gjenopptar samme etasje.
 */

export const PLAYER_VERSION = '0.1.0';
export const TEST_ID = 'puzzle-v1';
export const STATE_VERSION = 1;
export const RETRY_FROM_FLOOR = 9;          // etasje 9-16 gir ett ekstra forsok (1-basert)
export const FLOORS_TOTAL = 16;

/** Etasjekurven: eksakt 7L/5M/4H. Indeks = etasje-1. */
export const CURVE = [
  'L', 'L', 'L', 'L', 'L', 'L', 'L',
  'M', 'M', 'M', 'M', 'M',
  'H', 'H', 'H', 'H',
];

/** Deterministisk standard-trekk: rotasjon over undertyper innen hvert band. */
export const STANDARD_FLOOR_IDS = [
  'pz-s1l01', 'pz-s2l01', 'pz-s3l01', 'pz-s1l02', 'pz-s2l02', 'pz-s3l02', 'pz-s1l03',
  'pz-s1m01', 'pz-s2m01', 'pz-s3m01', 'pz-s1m02', 'pz-s2m02',
  'pz-s1h01', 'pz-s2h01', 'pz-s3h01', 'pz-s1h02',
];

/** UI-tekster (NO+EN med eksakt paritet — selvtestet). Ingen HTML, fulle setninger. */
export const PLAYER_STRINGS = {
  no: {
    'game.title': 'Sekvensmester',
    'game.start': 'Start spillet',
    'game.restart': 'Begynn på nytt',
    'game.floorProgress': 'Etasje {a} av {b}',
    'game.retryAvailable': 'Ett forsøk til i denne etasjen.',
    'game.floorSolved': 'Etasjen er løst.',
    'game.floorMissed': 'Etasjen er låst — riktig flis lyser kort.',
    'game.continue': 'Videre',
    'game.finishStandard': 'Se resultat og delekort',
    'game.endlessLocked': 'Endless mode låses opp etter en fullført runde.',
    'game.endlessStart': 'Start endless mode',
    'game.endlessHighscore': 'Endless-rekord: {a} riktige på rad',
    'game.endlessNotTest': 'Endless mode er ikke en test og innsendes aldri som skår.',
    'game.resumeBanner': 'Lagret runde funnet: gjenopptar i etasje {a}.',
    'game.resumeQuit': 'Avslutt runden',
    'game.a11y.progressLabel': 'Sekvensmester-progresjon',
    'game.a11y.tileRow': 'Sekvensen som skal fortsettes',
    'game.a11y.option': 'Alternativ {a}: {b}',
    'result.title': 'Resultat',
    'result.thetaIntro': 'Skåringen gir et estimat og et usikkerhetsbånd. Usikkerhetsbåndet er bredt ved 16 spørsmål. Resultatet er ikke normalisert og er ikke et IQ-tall.',
    'result.levelReached': 'Du nådde etasje {a} av {b}.',
    'result.bestRun': 'Beste feilfrie strekk: {a} etasjer.',
    'result.sharePrompt': 'Kan du lengre? Del rekorden din.',
    'result.shareText': 'Jeg nådde etasje {a} av {b} i Sekvensmester — beste feilfrie strekk: {c} etasjer. Kan du lengre?',
    'error.unknownItem': 'Ukjent flis: {a}',
  },
  en: {
    'game.title': 'Sequence Master',
    'game.start': 'Start the game',
    'game.restart': 'Start over',
    'game.floorProgress': 'Floor {a} of {b}',
    'game.retryAvailable': 'One more attempt on this floor.',
    'game.floorSolved': 'Floor solved.',
    'game.floorMissed': 'Floor locked — the correct tile flashes briefly.',
    'game.continue': 'Continue',
    'game.finishStandard': 'Show result and share card',
    'game.endlessLocked': 'Endless mode unlocks after one completed run.',
    'game.endlessStart': 'Start endless mode',
    'game.endlessHighscore': 'Endless record: {a} correct in a row',
    'game.endlessNotTest': 'Endless mode is not a test and is never submitted as a score.',
    'game.resumeBanner': 'Saved run found: resuming at floor {a}.',
    'game.resumeQuit': 'End the run',
    'game.a11y.progressLabel': 'Sequence Master progress',
    'game.a11y.tileRow': 'The sequence to be continued',
    'game.a11y.option': 'Option {a}: {b}',
    'result.title': 'Result',
    'result.thetaIntro': 'Scoring gives an estimate and an uncertainty band. In this version the uncertainty band is wide at 16 questions. The result is not normed and is not an IQ number.',
    'result.levelReached': 'You reached floor {a} of {b}.',
    'result.bestRun': 'Longest perfect stretch: {a} floors.',
    'result.sharePrompt': 'Can you go further? Share your record.',
    'result.shareText': 'I reached floor {a} of {b} in Sequence Master — longest perfect stretch: {c} floors. Can you go further?',
    'error.unknownItem': 'Unknown tile: {a}',
  },
};

export const STORAGE_KEY_PREFIX = 'brainarea:puzzle-v1:runState:';

/* ------------------------------------------------------------------ */
/* Tredjepartsfri formattering ({a}/{b}/{c} posisjonelle)              */
/* ------------------------------------------------------------------ */

export function format(key, dict, ...args) {
  let s = dict[key];
  if (typeof s !== 'string') throw new Error('player: mangler tekst: ' + key);
  return s.replace(/\{a\}/g, String(args[0] ?? '')).replace(/\{b\}/g, String(args[1] ?? '')).replace(/\{c\}/g, String(args[2] ?? ''));
}

/* ------------------------------------------------------------------ */
/* Trekk                                                               */
/* ------------------------------------------------------------------ */

/** band for etasje (1-basert). */
export function floorBand(floor) {
  return CURVE[floor - 1];
}

/** Endless-trekk: k (0-basert), usedIds (Set eller liste). Deterministisk rotasjons-scan. */
export function endlessPick(k, usedIds, poolIds) {
  const used = usedIds instanceof Set ? usedIds : new Set(usedIds);
  const band = k < 8 ? 'L' : k < 16 ? 'M' : 'H';
  let candidates = poolIds.filter((id) => id.startsWith('pz-') && id.charAt(5) === band.toLowerCase()).sort();
  if (candidates.length === 0) return null;
  if (k >= 24 && k % 3 === 2) {
    // H-tyngde-varianten: hver tredje tile k >= 24 gaar i M (2 av 3 i H)
    candidates = poolIds.filter((id) => id.startsWith('pz-') && id.charAt(5) === 'm').sort();
    if (candidates.length === 0) return null;
  }
  const start = k % candidates.length;
  for (let step = 0; step < candidates.length; step++) {
    const id = candidates[(start + step) % candidates.length];
    if (!used.has(id)) return id;
  }
  return null; // uttømt — wrapperen kaller computeUsedReset og trekker på nytt
}

/** computeUsedReset-konvensjonen (render.js): reset ved naer-uttmming. */
export function computeUsedReset(usedIds, poolBandSize = 30) {
  return usedIds.length >= poolBandSize ? [] : usedIds.slice();
}

/* ------------------------------------------------------------------ */
/* Standard mode                                                       */
/* ------------------------------------------------------------------ */

/** Ny standard-run. correctIndex leses fra def (foerste matching-variant). */
export function initStandardRun(def, lang) {
  const byId = new Map(def.items.map((it) => [it.id, it]));
  const floors = STANDARD_FLOOR_IDS.map((id) => {
    const item = byId.get(id);
    if (!item) throw new Error('player: item mangler i pool: ' + id);
    const variant = (item.variants || []).find((v) => v.lang === lang) || item.variants[0];
    return { itemId: id, correctIndex: variant.correctIndex, difficulty: variant.difficulty };
  });
  return {
    v: STATE_VERSION,
    mode: 'standard',
    lang,
    floorIdx: 0,                 // 0-basert
    floors,                      // {itemId, correctIndex, difficulty}
    firstAnswers: {},            // itemId -> 0..3  (KUN disse naar score-payloadet)
    attempts: {},                // itemId -> [ekstra-forsok-indekser]  (aldri payload)
    currentRun: 0,
    bestRun: 0,
    levelReached: 0,             // hoyeste fullfoerte etasje
    usedIds: floors.map((f) => f.itemId),
    startedAt: 0,
    elapsedSec: 0,
    floor: null,                 // aktiv etasje-tilstand
    finished: false,
  };
}

/** Aapne aktiv etasje. */
export function openFloor(state) {
  if (state.finished) throw new Error('player: run er ferdig');
  if (state.mode !== 'standard') throw new Error('player: openFloor bare i standard mode');
  const f = state.floors[state.floorIdx];
  state.levelReached = Math.max(state.levelReached, state.floorIdx);
  state.floor = { itemId: f.itemId, first: null, extraAttempts: 0, solved: false, reveal: false };
  return state.floor;
}

function floorAllowedRetry(state) {
  return (state.floorIdx + 1) >= RETRY_FROM_FLOOR; // floorIdx 8 = etasje 9
}

/**
 * Innsendt valg (0..3) i aktiv etasje. Foerste respons bokfoeres i firstAnswers;
 * retry-svar bokfoeres KUN i attempts (foerste-respons-kontrakten).
 * Retur: { outcome: 'solved'|'retry'|'closed', reveal }
 */
export function submitChoice(state, choice) {
  const fl = state.floor;
  if (!fl || fl.solved) throw new Error('player: ingen aapen etasje');
  const f = state.floors[state.floorIdx];
  if (fl.first === null) {
    fl.first = choice;                                    // scoring ser KUN denne
    state.firstAnswers[fl.itemId] = choice;               // foerste-respons bokfoeres her (payload-kilden)
    if (choice === f.correctIndex) {
      fl.solved = true;
      state.currentRun += 1;
      state.bestRun = Math.max(state.bestRun, state.currentRun);
      return { outcome: 'solved', reveal: false };
    }
    if (floorAllowedRetry(state)) {
      fl.extraAttempts = 1;
      return { outcome: 'retry', reveal: false };
    }
    fl.solved = true;
    fl.reveal = true;                                     // dobbeltfeil-losning: kort reveal
    state.currentRun = 0;
    return { outcome: 'closed', reveal: true };
  }
  // retry-forsok (etasje >= 9)
  if (fl.extraAttempts <= 0) throw new Error('player: ingen retry tilgjengelig');
  state.attempts[f.itemId] = state.attempts[f.itemId] || [];
  state.attempts[f.itemId].push(choice);                   // game-state only
  fl.extraAttempts = 0;
  if (choice === f.correctIndex) {
    fl.solved = true;
    state.currentRun += 1;
    state.bestRun = Math.max(state.bestRun, state.currentRun);
    return { outcome: 'solved', reveal: false };
  }
  fl.solved = true;
  fl.reveal = true;
  state.currentRun = 0;
  return { outcome: 'closed', reveal: true };
}

/** Ga til neste etasje, eller ferdiggjoer run-et. */
export function advance(state) {
  if (!state.floor || !state.floor.solved) throw new Error('player: etasjen er ikke lukket');
  state.floorIdx += 1;
  if (state.floorIdx >= state.floors.length) {
    state.levelReached = state.floors.length;
    state.finished = true;
    state.floor = null;
    return { finished: true };
  }
  state.floor = null;
  return { finished: false };
}

/** Score-payload for engine scoring.js — KUN foerste respons per item. */
export function buildScorePayload(state, nowMs, elapsedSec) {
  if (state.mode !== 'standard') throw new Error('player: score-payload bare fra standard mode (endless emitter aldri skår)');
  if (!state.finished) throw new Error('player: run er ikke ferdig');
  const itemIds = state.floors.map((f) => f.itemId);
  const answers = {};
  for (const id of itemIds) {
    const a = state.firstAnswers[id];
    if (a === undefined || a === null) throw new Error('player: item uten foerste-respons: ' + id);
    answers[id] = { kind: 'ability', lang: state.lang, abilityOriginalIndex: a };
  }
  return {
    testId: TEST_ID,
    lang: state.lang,
    itemIds,
    answers,
    startedAt: state.startedAt || 0,
    finishedAt: nowMs || 0,
    timeSpentSec: Number.isInteger(elapsedSec) ? elapsedSec : state.elapsedSec,
    expired: false,
  };
}

/** Anonym normering-payload (functions/normering.js-kontrakten) — foerste-respons-rekke. */
export function buildNormeringPayload(state, durationSec, demographics) {
  if (state.mode !== 'standard') throw new Error('player: normering-payload bare fra standard mode (endless innsendes aldri)');
  if (!state.finished) throw new Error('player: run er ikke ferdig');
  const itemIds = state.floors.map((f) => f.itemId);
  const answers = itemIds.map((id) => state.firstAnswers[id]);
  const payload = { testId: TEST_ID, language: state.lang, answers, durationSec: durationSec | 0 };
  if (demographics) payload.demographics = demographics;
  return payload;
}

/** Sharecard — tallloest (ingen theta/skala/IQ/prosent). */
export function buildShareCard(state, lang, dict) {
  if (state.mode !== 'standard' || !state.finished) throw new Error('player: sharecard kun etter fullfoert standard run');
  return {
    text: format('result.shareText', dict, state.floors.length, state.floors.length, state.bestRun),
    record: state.floors.length + '/' + state.floors.length,
    bestRun: state.bestRun,
    numericScore: null,
  };
}

/* ------------------------------------------------------------------ */
/* Endless mode                                                        */
/* ------------------------------------------------------------------ */

export function initEndlessRun(lang) {
  return {
    v: STATE_VERSION,
    mode: 'endless',
    lang,
    idx: 0,
    firstAnswers: {},
    currentRun: 0,
    highscore: 0,
    usedIds: [],
    startedAt: 0,
    elapsedSec: 0,
    finished: false,
  };
}

/** Riktig i endless => fortsett; feil => run-et er over. Ingen scoring, ingen normering. */
export function submitEndless(state, itemId, choice, correctIndex) {
  if (state.mode !== 'endless' || state.finished) throw new Error('player: ikke i aktiv endless-run');
  if (choice === correctIndex) {
    state.firstAnswers[itemId] = choice;
    state.currentRun += 1;
    state.highscore = Math.max(state.highscore, state.currentRun);
    state.usedIds.push(itemId);
    state.idx += 1;
    return { outcome: 'solved' };
  }
  state.highscore = Math.max(state.highscore, state.currentRun);
  state.usedIds.push(itemId);
  state.finished = true;
  return { outcome: 'closed', highscore: state.highscore };
}

/* ------------------------------------------------------------------ */
/* Resume: serialize/deserialize (localStorage-kontrakten)             */
/* ------------------------------------------------------------------ */

export function serialize(state) {
  const { floor, ...rest } = state;   // aktiv etasje reaes ved deserialize (refresh-sikker)
  return JSON.stringify(rest);
}

export function deserialize(jsonText, def, lang) {
  const s = JSON.parse(jsonText);
  if (s.v !== STATE_VERSION) throw new Error('player: ukjent state-versjon: ' + s.v);
  if (s.mode !== 'standard' && s.mode !== 'endless') throw new Error('player: ukjent mode: ' + s.mode);
  if (s.mode === 'standard') {
    const byId = new Map(def.items.map((it) => [it.id, it]));
    for (const f of s.floors) {
      const item = byId.get(f.itemId);
      if (!item) throw new Error('player: item mangler i pool ved resume: ' + f.itemId);
      const variant = (item.variants || []).find((v) => v.lang === lang) || item.variants[0];
      if (variant.correctIndex !== f.correctIndex) throw new Error('player: korrupt state (correctIndex): ' + f.itemId);
    }
  }
  s.floor = null;   // gjenapnes eksplisitt med openFloor()
  return s;
}
