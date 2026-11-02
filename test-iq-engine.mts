// IQ-engine test harness — run: node --experimental-strip-types tmp/iq/test-iq-engine.mts
// (in repo: node --experimental-strip-types test-iq-engine.mts, import path adjusted)
import {
  genSeriesForm,
  genPatternForm,
  genSpanSeq,
  verbalDraw,
  scoreIq,
  bandOf,
  BANDS,
} from "./lib/iq-engine.ts";
import type { SeriesItem, FigItem, TileDesc } from "./lib/iq-engine.ts";
import { IQ_VERBAL_EN } from "./data/iq-verbal-en.ts";

let fails = 0;
function ok(cond: boolean, name: string, extra = "") {
  console.log((cond ? "PASS " : "FAIL ") + name + (cond ? "" : " " + extra));
  if (!cond) fails++;
}
const key = (t: TileDesc) => `${t.sides}|${t.rot}|${t.dots}|${t.fillQ}|${t.pos}`;

function seriesRuleHolds(it: SeriesItem): boolean {
  const { nums, ans, meta } = it;
  switch (meta.kind) {
    case 1: {
      const st = meta.step as number;
      return st > 0 && nums.every((v, i) => i === 0 || v - nums[i - 1] === st) && ans === nums[4] + st;
    }
    case 2:
      return nums.every((v, i) => i === 0 || v === 2 * nums[i - 1]) && ans === 2 * nums[4];
    case 3: {
      const st = meta.step as number;
      return st > 0 && nums.every((v, i) => i === 0 || nums[i - 1] - v === st) && ans === nums[4] - st;
    }
    case 4:
      return nums.every((v, i) => i === 0 || v === 2 * nums[i - 1] + 1) && ans === 2 * nums[4] + 1;
    case 5: {
      const a = meta.a as number, b = meta.b as number;
      for (let i = 0; i < 4; i++) {
        const d = nums[i + 1] - nums[i];
        if (i % 2 === 0 ? d !== a : d !== -b) return false;
      }
      return ans === nums[4] + a;
    }
    case 6: {
      const d1 = meta.d1 as number, dd = meta.dd as number;
      for (let i = 0; i < 4; i++) {
        if (nums[i + 1] - nums[i] !== d1 + i * dd) return false;
      }
      return ans === nums[4] + d1 + 4 * dd;
    }
    case 7: {
      const b0 = meta.b0 as number, sb = meta.sb as number;
      return nums[1] === b0 && nums[3] === b0 + sb && ans === b0 + 2 * sb && nums[5] === undefined;
    }
    case 8:
      return nums[5] === nums[4] + nums[3] && ans === nums[5] + nums[4];
    case 9:
      return nums.every((v, i) => i === 0 || v === 2 * nums[i - 1] - 1) && ans === 2 * nums[4] - 1;
    default:
      return false;
  }
}

// 1-2 series structure, determinism, rule math across seeds
const SEEDS = [1, 2, 3, 42, 99, 12345, 999983];
const EXPECTED_D = [1, 1, 2, 2, 3, 3, 4, 5];
let sAll = true, dAll = true, optAll = true;
for (const sd of SEEDS) {
  const form = genSeriesForm(sd);
  sAll = sAll && form.length === 8 && form.every((it, i) => it.id === `sr${i}`);
  dAll = dAll && form.every((it, i) => it.d === EXPECTED_D[i]);
  for (const it of form) {
    const valid =
      it.options.length === 4 &&
      new Set(it.options).size === 4 &&
      it.correctIndex >= 0 &&
      it.correctIndex < 4 &&
      it.options[it.correctIndex] === it.ans &&
      it.ans > 0 &&
      it.nums.every((n) => n > 0 && n < 100000);
    optAll = optAll && valid;
    if (!valid) console.log("  bad series", sd, it.id, JSON.stringify(it));
  }
}
ok(sAll, "series: 8 items per form, ids sr0..sr7 across seeds");
ok(dAll, "series: difficulty curve 1,1,2,2,3,3,4,5 across seeds");
ok(optAll, "series: 4 distinct options incl correct at correctIndex, positive nums");
ok(JSON.stringify(genSeriesForm(7)) === JSON.stringify(genSeriesForm(7)), "series: deterministic same seed");
ok(JSON.stringify(genSeriesForm(7)) !== JSON.stringify(genSeriesForm(8)), "series: different seed different form");

// 2b: rule math per kind
let ruleAll = true, badKind = "";
for (const sd of SEEDS) {
  for (const it of genSeriesForm(sd)) {
    const h = seriesRuleHolds(it);
    if (!h) {
      ruleAll = false;
      badKind = `${sd} ${it.id} kind=${it.meta.kind} nums=${JSON.stringify(it.nums)} ans=${it.ans}`;
      break;
    }
  }
  if (!ruleAll) break;
}
ok(ruleAll, "series: all 9 rule kinds recomputed from meta match ans", badKind);

// 3-5 patterns
let pAll = true, pDiff = true, pBad = "";
for (const sd of SEEDS) {
  const form = genPatternForm(sd);
  pAll = pAll && form.length === 8 && form.every((it, i) => it.id === `pt${i}`);
  for (const it of form) {
    const optKeys = it.options.map(key);
    const shownKeys = it.tiles.map(key);
    const good =
      it.tiles.length === 4 &&
      it.options.length === 4 &&
      new Set(optKeys).size === 4 &&
      it.correctIndex >= 0 &&
      it.correctIndex < 4 &&
      !shownKeys.includes(optKeys[it.correctIndex]); // answer must differ from all 4 shown
    if (!good) {
      pAll = false;
      pBad = `${sd} ${it.id} fam=${it.meta.fam}`;
      break;
    }
  }
  if (!pAll) break;
}
ok(pAll, "pattern: 8 items, 4 distinct unique options, correct differs from all shown", pBad);
ok(JSON.stringify(genPatternForm(11)) === JSON.stringify(genPatternForm(11)), "pattern: deterministic same seed");
ok(JSON.stringify(genPatternForm(11)) !== JSON.stringify(genPatternForm(12)), "pattern: different seed different form");

// 6 span rules
let spAll = true, spBad = "";
for (let lv = 3; lv <= 9; lv++) {
  for (const sd of [1, 5, 7, 13, 42, 77, 101, 202]) {
    const seq = genSpanSeq(lv, sd);
    const good =
      seq.length === lv &&
      seq.every((v) => v >= 1 && v <= 9) &&
      !seq.some((v, i) => i >= 2 && v === seq[i - 1] && v === seq[i - 2]);
    for (let i = 0; i + 4 <= seq.length; i++) {
      const w = seq.slice(i, i + 4);
      const df = w.slice(1).map((x, j) => x - w[j]);
      if (df.every((x) => x === 1) || df.every((x) => x === -1)) {
        spAll = false;
        spBad = `monotonic window lv=${lv} sd=${sd} ${JSON.stringify(seq)}`;
        break;
      }
    }
    if (!good) {
      spAll = false;
      spBad = `lv=${lv} sd=${sd} ${JSON.stringify(seq)}`;
      break;
    }
  }
  if (!spAll) break;
}
ok(spAll, "span: length=level, digits 1-9, no triple repeat", spBad);

// 6b: spans differ between seeds (fresh runs)
ok(JSON.stringify(genSpanSeq(5, 3)) !== JSON.stringify(genSpanSeq(5, 4)), "span: different seed different sequence");

// 7 verbal stratified draw
const drawn = verbalDraw(IQ_VERBAL_EN, 12345);
const byD: Record<number, number> = {};
for (const it of drawn) byD[it.d] = (byD[it.d] ?? 0) + 1;
ok(
  drawn.length === 8 &&
    byD[1] === 2 && byD[2] === 2 && byD[3] === 2 && byD[4] === 1 && byD[5] === 1,
  "verbal: 8 drawn, stratification 2/2/2/1/1",
  JSON.stringify(byD)
);
ok(
  drawn.every((it) => it.options.length === 4 && it.options[it.correctIndex] !== undefined && new Set(it.options).size === 4),
  "verbal: 4 distinct options, correct reachable via correctIndex"
);
ok(
  JSON.stringify(verbalDraw(IQ_VERBAL_EN, 777)) === JSON.stringify(verbalDraw(IQ_VERBAL_EN, 777)) &&
    JSON.stringify(verbalDraw(IQ_VERBAL_EN, 777)) !== JSON.stringify(verbalDraw(IQ_VERBAL_EN, 778)),
  "verbal: deterministic per seed, differs across seeds"
);
const drawIds = new Set(drawn.map((d) => d.id));
const bankIds = new Set(IQ_VERBAL_EN.map((b) => b.id));
ok(
  [...drawIds].every((id) => bankIds.has(id)) && drawIds.size === 8,
  "verbal: all drawn ids come from bank, no duplicates"
);

// 8-9 scoring and bands
const r100 = scoreIq({ series: 8, pattern: 8, verbal: 8, span: 9 });
ok(r100.composite === 100 && r100.bandIndex === 3, "score: perfect run -> band 3");
const r0 = scoreIq({ series: 0, pattern: 0, verbal: 0, span: 3 });
ok(r0.composite === 0 && r0.bandIndex === 0, "score: floor run -> band 0");
const rHalf = scoreIq({ series: 4, pattern: 4, verbal: 4, span: 5 });
ok(rHalf.composite === 46, "score: half run -> composite 46", String(rHalf.composite));
const rSpanOnly = scoreIq({ series: 6, pattern: 6, verbal: 6, span: 5 });
ok(rSpanOnly.composite === 65, "score: weighted composite 65", String(rSpanOnly.composite));
const bounds: [number, number][] = [[39, 0], [40, 1], [63, 1], [64, 2], [84, 2], [85, 3], [100, 3]];
ok(bounds.every(([c, b]) => bandOf(c) === b), "bands: boundaries map correctly");
ok(BANDS.every((b, i) => bandOf(b.max) === i), "bands: BANDS maxes align with bandOf");

console.log(fails === 0 ? "\nALL GREEN" : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);