/**
 * Brainarea randomiseringslag v1.0 — [BYGG] FASE 2, todo leaf
 * "Randomisering: seed-basert stokk av spørsmål + svaralternativer."
 *
 * Renset ES-modul (ingen dependencies). Leverer seedet, TELLER-ført tilfeldighet
 * til render.js.
 *
 * ---- Hvorfor seed-basert? (krav fra operatør) ----
 * Kjernekrav: "bruker kan ta samme testen flere ganger, uten å få de samme
 * spørsmålene, men resultatet bør fortsatt være innenfor error of margin."
 * To designbeslutninger følger av det:
 *
 * 1. DEFAULT: økter i nettleseren er IKKE deterministic-seedede — de bruker
 *    auto-seed pr. økt. Ulike økter får ulike sample- og visningsstokker
 *    (ingen gjentak), mens en GJENOPPTA økt gjenoppretter både seed og
 *    teller fra lagret sesjonsstate, slik at visningen er identisk etter
 *    refresh og fortsetter uten å gjenta gamle stokker.
 *
 * 2. OPT-IN: kalles med eksplisitt { seed } blir randomiseringen
 *    fullt reproduserbar: samme seed + samme pool + samme usedIds gir
 *    bitvis identisk sample og identisk visningsrekkefølge. Bruksområde:
 *    (a) feilrapporter — en feilrapport med seedet lar utvikleren
 *    gjenskape nøyaktig samme visning; (b) A/B- og QC-kjøringer —
 *    samme seed mot to motorversjoner; (c) normerings-QA.
 *    Seed er aldri hemmelig og aldri personidentifiserende.
 *
 * Determinisme gjelder kun mot uendret pool: samme seed mot et ENDRET
 * test-definisjonsfil gir ikke samme visning (riktig oppførsel — seed
 * refererer til en pool-versjon, ikke en abstrakt test). Pool-versjon
 * knyttes på delbarhets-stegene.
 *
 * ---- Teller (count) — hvorfor den er persistert ----
 * Etterfulgte kall på samme generator-funksjon gir forskjellige verdier.
 * Hvis en gjenopptatt økt bare re-opprettet generatoren fra seed, ville de
 * neste spørsmålene fått stokker fra begynnelsen av strømmen — dvs. samme
 * stokker som tidligere spørsmål i samme økt. Telleren (antall forbrukte
 * kall) persistes i sesjonsstate sammen med seedet; ved gjenopptak spoles
 * generatoren raskt frem til telleren. render.js eier STATE-feltet, denne
 * modulen eier FORMATET.
 */

/* ------------------------------------------------------------------ */
/* 1. PRNG: mulberry32 — rask, 32-bit, deterministisk                  */
/* ------------------------------------------------------------------ */

/**
 * Seeded PRNG. Returnerer funksjon () => [0, 1). Drop-in for rng-param.
 * Ikke kryptografisk (seed er ikke sensitiv — trengs ikke).
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const RANDOMIZE_VERSION = '1.0.0';

/* ------------------------------------------------------------------ */
/* 2. Strenger -> uint32-seed (FNV-1a)                                 */
/* ------------------------------------------------------------------ */

/**
 * FNV-1a (32-bit) over streng. Deterministisk på alle kjøretid.
 * Pinner (selftest, beregnet 2026-11-14): "123" -> 1916298011 |
 * "brainarea" -> 4208253246
 */
export function seedFromString(str) {
  const s = String(str);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/* ------------------------------------------------------------------ */
/* 3. Auto-seed (pr. økt)                                              */
/* ------------------------------------------------------------------ */

/**
 * Nåbasert auto-seed: 32 bit fra Date.now() XOR 16 bit ekstra fyll.
 * Godt nok for økt-unikhet — det er ikke en sikkerhetsfunksjon.
 */
export function autoSeed() {
  const t = (Date.now() >>> 0) ^ Math.floor(Math.random() * 0x10000);
  return t >>> 0;
}

/* ------------------------------------------------------------------ */
/* 4. Pure, seedede stand-alone operasjoner (QC, skåringsmodul, puzzle)*/
/* ------------------------------------------------------------------ */

/**
 * Ren stokk: returnerer NY array i seedet tilfeldig rekkefølge (muterer ikke
 * inndata). Med fast rng = den første N verdiene av strømmen — pass for
 * reproduserbare tester.
 */
export function seededShuffle(arr, seed) {
  const rng = mulberry32(seed >>> 0);
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Ren seeding uten no-repeat-politikk (den eies av render.js sampleSession,
 * som kaller denne modulen): velg size elementer fra pool med seedet
 * rekkefølge — samme seed, samme utvalg.
 */
export function seededSample(pool, size, seed) {
  return seededShuffle(pool, seed).slice(0, size);
}

/* ------------------------------------------------------------------ */
/* 5. Sesjons-rng-format: seed + teller (persistert i sesjonsstate)    */
/* ------------------------------------------------------------------ */

export const RNG_FIELD = 'rng';                         // feltnavn i session
export const RNG_STATE_VERSION = 1;                     // format-versjon

/** Ny rng-state for en økt. seed=undefined -> auto. */
export function newRngState(seed) {
  return {
    v: RNG_STATE_VERSION,
    seed: (seed === undefined || seed === null) ? autoSeed() : (Number(seed) >>> 0),
    count: 0,
  };
}

/**
 * Bygg rng-funksjon fra sessjonsstate OG avanser state.count for hvert kall.
 * state muteres — render.js persisterer hele økten (inkl. rng-felt) som før.
 * Fast-forward til state.count skjer ved oppstart av økten.
 */
export function makeCountedRng(state) {
  if (!state || typeof state.seed !== 'number' || typeof state.count !== 'number' || state.v !== RNG_STATE_VERSION) {
    throw new Error('makeCountedRng: ugyldig rng-state');
  }
  const base = mulberry32(state.seed >>> 0);
  for (let i = 0; i < state.count; i++) base();          // fast-forward
  const rng = () => {
    const v = base();
    state.count += 1;
    return v;
  };
  rng.state = state;
  return rng;
}
