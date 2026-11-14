/**
 * Brainarea i18n — resolver (EN base + overlays).
 *
 * Kontrakt:
 * - EN = base: komplett på alle nøkler, alltid.
 * - Andre språk (no, senere de) = overlay: mangler en nøkkel, resolves mot EN.
 * - Oppløsningskjede: overlay[lang][key] -> EN[key] -> key (nøkkelen selv, aldri kast).
 * - Key-grammatikk: "<ns>.<name>" der ns ∈ {ui, note, aria}; flere ns = spesifikasjon-sendring.
 *
 * Bruk: t = await getT('no') — asynkron fordi overlay-moduler kan lastes dynamisk.
 * Basemodulene (en.js/no.js) eksporterer { LANG, KEYS }.
 */
import { KEYS as EN_KEYS, LANG as EN_LANG } from './en.js';

const FLAT_EN_CACHE = new Map(Object.entries(flatten(EN_KEYS)));
const FLAT_OVERLAY_CACHE = new Map(); // lang -> Map(key -> str)

function flatten(keys) {
  const out = {};
  for (const [ns, names] of Object.entries(keys)) {
    for (const [name, str] of Object.entries(names)) {
      out[`${ns}.${name}`] = str;
    }
  }
  return out;
}

/**
 * Registrer et overlay. Kalt av entry-koden når no.js/de.js er importert
 * (statisk eller dynamisk). Idempotent.
 */
export function registerOverlay(lang, keys) {
  if (typeof lang !== 'string' || lang.length < 2) {
    throw new Error('i18n: registerOverlay krever språkkode');
  }
  if (!keys || typeof keys !== 'object') {
    throw new Error('i18n: registerOverlay krever keys-objekt');
  }
  FLAT_OVERLAY_CACHE.set(lang, new Map(Object.entries(flatten(keys))));
  return FLAT_OVERLAY_CACHE;
}

/**
 * Hent oversettelsesfunksjon for et språk.
 * EN: ren base-oppslag. Andre: overlay -> EN.
 * Ukjent språk: resolves mot EN (aldri kast, aldri tom streng).
 */
export function makeT(lang = 'en') {
  if (lang === EN_LANG) {
    return (key) => {
      const en = FLAT_EN_CACHE.get(key);
      return en !== undefined ? en : key;
    };
  }
  const overlayMap = FLAT_OVERLAY_CACHE.get(lang);
  return (key) => {
    if (overlayMap) {
      const o = overlayMap.get(key);
      if (o !== undefined) return o;
    }
    const en = FLAT_EN_CACHE.get(key);
    return en !== undefined ? en : key;
  };
}

/**
 * Overlay-import (lazy). Returnerer t-funksjon når språkfilen er lastet;
 * kaster aldri — ukjent språk gir EN-resolver.
 */
export async function getT(lang = 'en') {
  if (FLAT_OVERLAY_CACHE.has(lang) || lang === EN_LANG) return makeT(lang);
  try {
    const mod = await import(`./${lang}.js`);
    registerOverlay(lang, mod.KEYS);
  } catch {
    // ukjent språk => EN (silent, aldri kast)
  }
  return makeT(lang);
}

/** Diagnostikk: finnes nøkkelen i EN-basen? (selftest/spec-verktøy) */
export function hasKey(key) {
  return FLAT_EN_CACHE.has(key);
}

/** Nøkkel-liste for verifikasjon (deterministisk orden) */
export function enKeys() {
  return Array.from(FLAT_EN_CACHE.keys()).sort();
}
