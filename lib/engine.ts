import type { Item, TestSpec, DimensionResult, Likert } from "./types";

/** Deterministisk PRNG (mulberry32) — samme seed gir samme rekkefølge. */
export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed >>> 0;
  const next = () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Trekk n items fra banken, stokket, med seed. n >= bankstørrelse gir hele banken stokket. */
export function drawItems(spec: TestSpec, n: number, seed = Date.now()): Item[] {
  if (n >= spec.items.length) {
    return seededShuffle(spec.items, seed);
  }
  return seededShuffle(spec.items, seed).slice(0, n);
}

/**
 * Scoring: reverserte items snus (6-raw); snitt per dimensjon på skala 1–5.
 * Metadata (navn, tolkninger) merges fra spec-en.
 */
export function score(
  spec: TestSpec,
  items: Item[],
  answers: Record<string, Likert>
): DimensionResult[] {
  const byDim: Record<string, number[]> = {};
  for (const item of items) {
    const raw = answers[item.id];
    if (raw === undefined) continue;
    const v = item.k === 1 ? raw : 6 - raw;
    (byDim[item.d] ??= []).push(v);
  }
  const meta = Object.fromEntries(spec.dimensions.map((d) => [d.key, d]));
  return Object.entries(byDim).map(([key, vals]) => {
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const pct = Math.round(((mean - 1) / 4) * 100);
    const m = meta[key];
    return {
      key,
      mean: Math.round(mean * 10) / 10,
      pct,
      name: m?.name ?? key,
      high: m?.high ?? "",
      low: m?.low ?? "",
    };
  });
}