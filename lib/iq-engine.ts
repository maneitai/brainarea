// IQ/cognitive engine — parametric item generation, stratified draws,
// scoring to honest bands. Self-contained (no imports) so the Node test
// harness can run it directly with --experimental-strip-types.

export type IqLocale = "no" | "en";

export type ChoiceItem = {
  id: string;
  d: number; // difficulty 1-5
  q: string;
  options: string[];
  correctIndex: number;
};

export type SeriesItem = {
  id: string;
  d: number;
  nums: number[];
  ans: number;
  options: number[];
  correctIndex: number;
  meta: Record<string, number>; // rule params, used by tests to recompute
};

export type TileDesc = {
  sides: number; // 3 | 4 | 5 polygon
  rot: number; // degrees
  dots: number; // 0-5 dots below shape
  fillQ: number; // -1 none, 0-3 filled quadrant
  pos: number; // -1 none, 0-8 grid slot for moving dot
};

export type FigItem = {
  id: string;
  d: number;
  tiles: TileDesc[]; // 4 shown tiles
  options: TileDesc[]; // 4 choices, one correct
  correctIndex: number;
  meta: Record<string, number>;
};

export type VerbalInput = {
  id: string;
  d: number;
  q: string;
  options: string[];
  correct: string; // exactly one of options
};

// ---------- PRNG (mulberry32, deterministic) ----------

function mkRng(seed: number) {
  let s = seed >>> 0;
  const next = () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int(a: number, b: number) {
      return a + Math.floor(next() * (b - a + 1));
    },
    pick<T>(arr: T[]): T {
      return arr[Math.floor(next() * arr.length)];
    },
  };
}

function shuffleLocal<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  const r = mkRng(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r.next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function childSeed(seed: number, i: number): number {
  return ((seed * 31 + i * 101) >>> 0) || 1;
}

// ---------- Number series generator ----------

const SERIES_D = [1, 1, 2, 2, 3, 3, 4, 5];

function distinctOptions(rng: ReturnType<typeof mkRng>, ans: number, pool: number[]): number[] {
  const seen = new Set<number>([ans, -0]);
  const cands = shuffleLocal(pool, Math.floor(rng.next() * 2 ** 31));
  const out: number[] = [];
  for (const v of cands) {
    if (out.length >= 3) break;
    if (v !== ans && v >= 0 && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

function finishSeries(id: string, d: number, nums: number[], ans: number, rng: ReturnType<typeof mkRng>, meta: Record<string, number>): SeriesItem {
  const pool = [ans + 1, ans - 1, ans + 2, ans - 2, ans + 3, ans - 3];
  const dis = distinctOptions(rng, ans, pool);
  const opts = shuffleLocal([ans, ...dis], Math.floor(rng.next() * 2 ** 31));
  return { id, d, nums, ans, options: opts, correctIndex: opts.indexOf(ans), meta };
}

export function genSeriesForm(seed: number): SeriesItem[] {
  return SERIES_D.map((d, i) => genSeriesItem(d, childSeed(seed, i), `sr${i}`));
}

function genSeriesItem(d: number, cs: number, id: string): SeriesItem {
  const r = mkRng(cs);
  const t = (start: number, f: (x: number) => number, n: number) => {
    const nums = [start];
    while (nums.length < n) nums.push(f(nums[nums.length - 1]));
    return nums;
  };
  switch (d) {
    case 1: {
      const start = r.int(2, 15), step = r.int(2, 9);
      const nums = t(start, (x) => x + step, 5);
      return finishSeries(id, d, nums, nums[4] + step, r, { kind: 1, step });
    }
    case 2: {
      if (r.int(0, 1) === 0) {
        const start = r.int(2, 6);
        const nums = t(start, (x) => x * 2, 5);
        return finishSeries(id, d, nums, nums[4] * 2, r, { kind: 2 });
      }
      const start = r.int(50, 70), step = r.int(3, 7);
      const nums = t(start, (x) => x - step, 5);
      return finishSeries(id, d, nums, nums[4] - step, r, { kind: 3, step });
    }
    case 3: {
      if (r.int(0, 1) === 0) {
        const start = r.int(1, 4);
        const nums = t(start, (x) => x * 2 + 1, 5);
        return finishSeries(id, d, nums, nums[4] * 2 + 1, r, { kind: 4 });
      }
      const a = r.int(5, 9), b = r.int(2, 4), start = r.int(1, 9);
      const nums = [start];
      for (let i = 0; i < 4; i++) nums.push(nums[i] + (i % 2 === 0 ? a : -b));
      return finishSeries(id, d, nums, nums[4] + a, r, { kind: 5, a, b });
    }
    case 4: {
      if (r.int(0, 1) === 0) {
        const s0 = r.int(1, 5), d1 = r.int(2, 4), dd = r.int(2, 3);
        const nums = [s0];
        for (let i = 0; i < 4; i++) nums.push(nums[i] + d1 + i * dd);
        return finishSeries(id, d, nums, nums[4] + d1 + 4 * dd, r, { kind: 6, d1, dd });
      }
      const a0 = r.int(1, 9), sa = r.int(2, 3), b0 = r.int(20, 40), sb = r.int(5, 7);
      const nums = [a0, b0, a0 + sa, b0 + sb, a0 + 2 * sa];
      return finishSeries(id, d, nums, b0 + 2 * sb, r, { kind: 7, b0, sb });
    }
    default: {
      if (r.int(0, 1) === 0) {
        const f0 = r.int(1, 4), f1 = r.int(2, 6);
        const nums = [f0, f1];
        while (nums.length < 6) nums.push(nums[nums.length - 1] + nums[nums.length - 2]);
        return finishSeries(id, d, nums, nums[5] + nums[4], r, { kind: 8 });
      }
      const start = r.int(2, 4);
      const nums = t(start, (x) => x * 2 - 1, 5);
      return finishSeries(id, d, nums, nums[4] * 2 - 1, r, { kind: 9 });
    }
  }
}

// ---------- Figure pattern generator ----------

const PAT_D = [1, 1, 2, 2, 3, 3, 4, 5];

function tileKey(t: TileDesc): string {
  return `${t.sides}|${t.rot}|${t.dots}|${t.fillQ}|${t.pos}`;
}

export function genPatternForm(seed: number): FigItem[] {
  return PAT_D.map((d, i) => genPatternItem(d, childSeed(seed * 7 + 3, i), `pt${i}`));
}

function disOptions(
  r: ReturnType<typeof mkRng>,
  correct: TileDesc,
  shown: TileDesc[],
  distractors: TileDesc[]
): { tiles: TileDesc[]; options: TileDesc[]; correctIndex: number } {
  const shownKeys = new Set(shown.map(tileKey));
  const ck = tileKey(correct);
  const all = [correct, ...distractors];
  const seen = new Set<string>();
  const uniq: TileDesc[] = [];
  for (const t of all) {
    const k = tileKey(t);
    if (!seen.has(k) && k !== ck && !shownKeys.has(k)) {
      seen.add(k);
      uniq.push(t);
    }
  }
  const chosen = shuffleLocal(uniq, Math.floor(r.next() * 2 ** 31)).slice(0, 3);
  const opts = shuffleLocal(
    [correct, ...chosen],
    Math.floor(r.next() * 2 ** 31)
  );
  const correctIndex = opts.findIndex((t) => tileKey(t) === ck);
  if (correctIndex === -1) throw new Error("pattern: correct tile missing");
  return { tiles: shown, options: opts, correctIndex };
}

// fillQ semantics: COUNT of filled quadrants 0-4, filled clockwise (TR, BR, BL, TL).
function genPatternItem(d: number, cs: number, id: string): FigItem {
  const r = mkRng(cs);
  const base = { sides: 4, rot: 0, dots: 0, fillQ: 0, pos: -1 };
  let shown: TileDesc[] = [];
  let correct: TileDesc;
  let distractors: TileDesc[] = [];

  if (d === 1) {
    // Sides grow: 3,4,5,6 -> next 7. No cyclic attr, no symmetry traps.
    shown = [3, 4, 5, 6].map((s) => ({ ...base, sides: s }));
    correct = { ...base, sides: 7 };
    distractors = [{ ...base, sides: 8 }, { ...base, sides: 5, rot: 45 }, { ...base, sides: 4, rot: 45 }];
  } else if (d === 2) {
    // Dots grow 1-4 -> 5.
    shown = [1, 2, 3, 4].map((n) => ({ ...base, dots: n }));
    correct = { ...base, dots: 5 };
    distractors = [{ ...base, dots: 0 }, { ...base, dots: 6 }, { ...base, dots: 5, fillQ: 1 }];
  } else if (d === 3) {
    // Dot moves clockwise one slot per tile; next slot is new.
    const s0 = r.pick([1, 2, 3, 5, 6, 7, 8]);
    shown = [0, 1, 2, 3].map((i) => ({ ...base, pos: (s0 + i) % 9 }));
    const cPos = (s0 + 4) % 9;
    correct = { ...base, pos: cPos };
    const occupied = new Set([...shown.map((t) => t.pos), cPos]);
    const free: number[] = [];
    for (let p = 0; p < 9; p++) if (!occupied.has(p)) free.push(p);
    const picks = shuffleLocal(free, Math.floor(r.next() * 2 ** 31)).slice(0, 3);
    distractors = picks.map((p) => ({ ...base, pos: p }));
  } else if (d === 4) {
    // Quadrant fill grows 0,1,2,3 -> 4 (all filled).
    shown = [0, 1, 2, 3].map((q) => ({ ...base, fillQ: q }));
    correct = { ...base, fillQ: 4 };
    distractors = [
      { ...base, fillQ: 4, dots: 1 },
      { ...base, fillQ: 4, rot: 45 },
      { ...base, fillQ: 4, dots: 2 },
    ];
  } else {
    // Dual rule: dots grow 1-4 -> 5 AND quadrant fill grows 0-3 -> 4.
    shown = [0, 1, 2, 3].map((i) => ({ ...base, dots: i + 1, fillQ: i }));
    correct = { ...base, dots: 5, fillQ: 4 };
    distractors = [
      { ...base, dots: 5, fillQ: 3 },
      { ...base, dots: 4, fillQ: 4 },
      { ...base, dots: 5, fillQ: 2 },
    ];
  }

  const { tiles, options, correctIndex } = disOptions(r, correct, shown, distractors);
  return { id, d, tiles, options, correctIndex, meta: { fam: d } };
}

// ---------- Working-memory span generator ----------

export function genSpanSeq(level: number, seed: number): number[] {
  for (let attempt = 0; attempt < 60; attempt++) {
    const r = mkRng(childSeed(seed + attempt * 7919, level));
    const seq: number[] = [];
    while (seq.length < level) {
      const v = r.int(1, 9);
      const n = seq.length;
      if (n >= 2 && seq[n - 1] === v && seq[n - 2] === v) continue; // no triples
      seq.push(v);
      if (seq.length >= 4) {
        const w = seq.slice(-4);
        const diffs = w.slice(1).map((x, i) => x - w[i]);
        if (diffs.every((x) => x === 1) || diffs.every((x) => x === -1)) {
          seq.pop(); // no monotonic 4-run
        }
      }
    }
    return seq;
  }
  return Array.from({ length: level }, (_, i) => ((i * 3 + 2) % 9) + 1); // unreachable fallback
}

// ---------- Verbal stratified draw ----------

const VERBAL_STRAT: [number, number][] = [[1, 2], [2, 2], [3, 2], [4, 1], [5, 1]];

export function verbalDraw(items: VerbalInput[], seed: number): ChoiceItem[] {
  const r = mkRng(seed);
  const picked: VerbalInput[] = [];
  for (const [d, n] of VERBAL_STRAT) {
    const pool = items.filter((x) => x.d === d);
    const ks = Math.floor(r.next() * 2 ** 31) || 1;
    picked.push(...shuffleLocal(pool, ks).slice(0, n));
  }
  const ordered = shuffleLocal(picked, (seed ^ 0x9e3779b9) >>> 0);
  return ordered.map((it, i) => {
    const ks = Math.floor(r.next() * 2 ** 31) || 1;
    const options = shuffleLocal(it.options, ks);
    return {
      id: it.id,
      d: it.d,
      q: it.q,
      options,
      correctIndex: options.indexOf(it.correct),
    };
  });
}

// ---------- Scoring to honest bands ----------

export const BANDS = [
  { max: 39, rangeNo: "ca. 70–85", rangeEn: "approx. 70–85" },
  { max: 63, rangeNo: "ca. 85–100", rangeEn: "approx. 85–100" },
  { max: 84, rangeNo: "ca. 100–115", rangeEn: "approx. 100–115" },
  { max: 100, rangeNo: "ca. 115–130+", rangeEn: "approx. 115–130+" },
] as const;

export function bandOf(composite: number): number {
  const i = BANDS.findIndex((b) => composite <= b.max);
  return i === -1 ? BANDS.length - 1 : i;
}

export type IqSubScores = { series: number; pattern: number; verbal: number; span: number };

export function scoreIq(s: IqSubScores) {
  const p = (c: number) => Math.round((c / 8) * 100);
  const seriesPct = p(s.series);
  const patternPct = p(s.pattern);
  const verbalPct = p(s.verbal);
  const spanPct = Math.max(0, Math.min(100, Math.round(((s.span - 3) / 6) * 100)));
  const composite = Math.round((seriesPct + patternPct + verbalPct + spanPct) / 4);
  return { seriesPct, patternPct, verbalPct, spanPct, composite, bandIndex: bandOf(composite) };
}