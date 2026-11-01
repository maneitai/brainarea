"use client";

import { useMemo, useRef, useState } from "react";
import type { DimensionResult, Likert, TestSpec } from "@/lib/types";
import { drawItems, score } from "@/lib/engine";

const LIKERT_LABELS: Record<Likert, string> = {
  1: "Helt uenig",
  2: "Uenig",
  3: "Nøytral",
  4: "Enig",
  5: "Helt enig",
};

type Phase = "intro" | "run" | "results";

export function TestRun({ spec, drawCount }: { spec: TestSpec; drawCount: number }) {
  const seedRef = useRef<number>(Date.now());
  const [phase, setPhase] = useState<Phase>("intro");
  const [order, setOrder] = useState<ReturnType<typeof drawItems>>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Likert>>({});
  const [results, setResults] = useState<DimensionResult[] | null>(null);

  function start() {
    seedRef.current = Date.now();
    setOrder(drawItems(spec, drawCount, seedRef.current));
    setAnswers({});
    setResults(null);
    setIdx(0);
    setPhase("run");
  }

  const current = order[idx];
  const answeredCount = order.filter((it) => answers[it.id] !== undefined).length;
  const progress = order.length ? Math.round((answeredCount / order.length) * 100) : 0;

  function answer(v: Likert) {
    if (!current) return;
    const next = { ...answers, [current.id]: v };
    setAnswers(next);
    const complete = order.every((it) => next[it.id] !== undefined);
    if (complete) {
      setResults(score(spec, order, next));
      setPhase("results");
    } else if (idx < order.length - 1) {
      setTimeout(() => setIdx((i) => Math.min(i + 1, order.length - 1)), 180);
    }
  }

  function saveTxt() {
    if (!results) return;
    const lines = [
      `${spec.title} — resultat`,
      new Date().toLocaleString("nb-NO"),
      "",
      ...results.map(
        (r) => `${r.name}: ${r.mean}/5 (${r.pct}%)\n  Høy: ${r.high}\n  Lav: ${r.low}`
      ),
      "",
      spec.disclaimer,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${spec.id}-resultat.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (phase === "intro") {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold">Før du begynner</h2>
        <p className="mt-2 leading-relaxed text-gray-600">{spec.intro}</p>
        <ul className="mt-4 space-y-1.5 text-sm text-gray-500">
          <li>• Ingen riktige eller gale svar.</li>
          <li>• Svarene blir i nettleseren din — sendes ingen steder.</li>
          <li>• Du kan gå tilbake og endre svar underveis.</li>
        </ul>
        <button
          onClick={start}
          className="mt-5 w-full rounded-xl px-5 py-4 text-base font-bold text-white sm:w-auto sm:px-8"
          style={{ background: "var(--ba-accent)" }}
        >
          Start testen
        </button>
      </section>
    );
  }

  if (phase === "run" && current) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
          <span>
            Utsagn {idx + 1} av {order.length}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, background: "var(--ba-accent)" }}
          />
        </div>
        <h2 className="mt-6 text-xl leading-snug font-bold sm:text-2xl">
          {current.t}
        </h2>
        <div className="mt-5 grid gap-2">
          {([1, 2, 3, 4, 5] as Likert[]).map((v) => {
            const selected = answers[current.id] === v;
            return (
              <button
                key={v}
                onClick={() => answer(v)}
                className="rounded-xl border px-4 py-3.5 text-left text-sm font-semibold transition sm:py-4"
                style={
                  selected
                    ? { borderColor: "var(--ba-accent)", color: "var(--ba-accent)", background: "#eef2ff" }
                    : { borderColor: "#e5e7eb", color: "#374151", background: "#fff" }
                }
              >
                {LIKERT_LABELS[v]}
              </button>
            );
          })}
        </div>
        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="rounded-xl px-5 py-3 text-sm font-bold disabled:opacity-30"
            style={{ background: "#f0efec" }}
          >
            Forrige
          </button>
          <span className="text-xs text-gray-400">Svarene lagres lokalt</span>
        </div>
      </section>
    );
  }

  if (phase === "results" && results) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold">Ditt resultat</h2>
        <p className="mt-1 text-sm text-gray-500">
          Snittskår per dimensjon på skalaen 1–5. Ingen persentiler mot
          befolkningen.
        </p>
        <div className="mt-5 space-y-5">
          {results.map((r) => (
            <div key={r.key}>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-bold">{r.name}</h3>
                <span className="text-sm font-semibold text-gray-500">
                  {r.mean}/5
                </span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${r.pct}%`, background: "var(--ba-accent)" }}
                />
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                {r.mean >= 3.5 ? r.high : r.mean <= 2.5 ? r.low : "Balansert nivå på denne dimensjonen."}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-6 rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
          {spec.disclaimer}
        </p>
        <div className="mt-5 gap-2 sm:flex">
          <button
            onClick={saveTxt}
            className="w-full rounded-xl px-5 py-3.5 text-sm font-bold text-white sm:w-auto"
            style={{ background: "var(--ba-accent)" }}
          >
            Lagre resultat som tekst
          </button>
          <button
            onClick={start}
            className="mt-2 w-full rounded-xl px-5 py-3.5 text-sm font-bold sm:mt-0 sm:w-auto"
            style={{ background: "#f0efec" }}
          >
            Ta testen på nytt
          </button>
        </div>
      </section>
    );
  }

  return null;
}