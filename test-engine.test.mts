// Verifikasjon av lib/engine.ts: determinisme, stokking, reversering, snitt.
import { drawItems, score } from "./lib/engine.ts";
import type { TestSpec, Likert } from "./lib/types.ts";

const spec: TestSpec = {
  id: "t",
  title: "T",
  intro: "",
  disclaimer: "",
  dimensions: [
    { key: "X", name: "Dimensjon X", high: "høy", low: "lav" },
    { key: "Y", name: "Dimensjon Y", high: "høy", low: "lav" },
  ],
  items: [
    { id: "x1", d: "X", k: 1, t: "a" },
    { id: "x2", d: "X", k: -1, t: "b" },
    { id: "x3", d: "X", k: 1, t: "c" },
    { id: "y1", d: "Y", k: -1, t: "d" },
    { id: "y2", d: "Y", k: 1, t: "e" },
    { id: "y3", d: "Y", k: 1, t: "f" },
  ],
};

let ok = true;
function assert(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "OK  " : "FAIL"}  ${name} ${detail}`);
  if (!cond) ok = false;
}

// 1. Determinisme: samme seed → samme rekkefølge
const a = drawItems(spec, 6, 42).map((i) => i.id);
const b = drawItems(spec, 6, 42).map((i) => i.id);
assert("determinisme (samme seed)", JSON.stringify(a) === JSON.stringify(b), JSON.stringify(a));

// 2. Forskjellige seeds gir i hovedsak ulik rekkefølge (sannsynlig)
const c = drawItems(spec, 6, 43).map((i) => i.id);
assert("seed-variasjon", JSON.stringify(a) !== JSON.stringify(c), JSON.stringify(c));

// 3. Trekking av delmengde: n=4 fra bank på 6, distinct
const d = drawItems(spec, 4, 7);
const ids = new Set(d.map((i) => i.id));
assert("delmengde: n=4, distinct", d.length === 4 && ids.size === 4, [...ids].join(","));

// 4. Maks-skål: positive items besvart 5, negative besvart 1 → mean 5.0, pct 100
const max: Record<string, Likert> = Object.fromEntries(
  spec.items.map((i) => [i.id, (i.k === 1 ? 5 : 1) as Likert])
);
const rMax = score(spec, spec.items, max);
assert(
  "maks (5 på +, 1 på −) → alle dim mean 5 / pct 100",
  rMax.every((r) => r.mean === 5 && r.pct === 100),
  rMax.map((r) => `${r.key}:${r.mean}/${r.pct}`).join(" ")
);

// 5. Minimum: positive items besvart 1, negative besvart 5 → mean 1.0, pct 0
const min: Record<string, Likert> = Object.fromEntries(
  spec.items.map((i) => [i.id, (i.k === 1 ? 1 : 5) as Likert])
);
const rMin = score(spec, spec.items, min);
assert(
  "min (1 på +, 5 på −) → alle dim mean 1 / pct 0",
  rMin.every((r) => r.mean === 1 && r.pct === 0),
  rMin.map((r) => `${r.key}:${r.mean}/${r.pct}`).join(" ")
);

// 6. "Alle=5" er IKKE maks med reverserte items: X har 2 positive + 1 negative
//    → mean (5+1+5)/3 = 3.67, pct 67
const all5 = Object.fromEntries(spec.items.map((i) => [i.id, 5 as Likert]));
const r5 = score(spec, spec.items, all5);
const x5 = r5.find((r) => r.key === "X")!;
assert(
  "alle=5 med reversering → X mean 3.7 / pct 67",
  Math.abs(x5.mean - 3.7) < 0.001 && x5.pct === 67,
  `fikk ${x5.mean} / ${x5.pct}`
);

// 7. Reversering: x2 (k=-1) besvart 4 → bidrar 2. Kombinert med x1=5, x3=5 → mean 4.0
const mixed: Record<string, Likert> = {
  x1: 5, x2: 4, x3: 5,
  y1: 1, y2: 5, y3: 5,
};
const rm = score(spec, spec.items, mixed);
const xm = rm.find((r) => r.key === "X")!;
const ym = rm.find((r) => r.key === "Y")!;
assert("reversering X: mean 4.0", Math.abs(xm.mean - 4.0) < 0.001, `fikk ${xm.mean}`);
assert("reversering Y: y1(-1)=1→5, y2=5, y3=5 → mean 5.0", Math.abs(ym.mean - 5.0) < 0.001, `fikk ${ym.mean}`);

// 8. Ingen svar → ingen NaN
const rEmpty = score(spec, spec.items, {});
assert("ingen svar → ingen NaN", !rEmpty.some((r) => Number.isNaN(r.mean)), `${rEmpty.length} dim`);

console.log(ok ? "\nALLE TESTER BESTATT" : "\nFEILET");
process.exit(ok ? 0 : 1);