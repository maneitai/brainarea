"use client";

import { useRef, useState } from "react";
import type { DimensionResult, Likert, TestSpec } from "@/lib/types";
import { drawItems, score } from "@/lib/engine";

type Locale = "no" | "en";

const LIKERT_LABELS: Record<Locale, Record<Likert, string>> = {
  no: { 1: "Helt uenig", 2: "Uenig", 3: "Nøytral", 4: "Enig", 5: "Helt enig" },
  en: {
    1: "Strongly disagree",
    2: "Disagree",
    3: "Neutral",
    4: "Agree",
    5: "Strongly agree",
  },
};

const T = {
  no: {
    beforeStart: "Før du begynner",
    start: "Start testen",
    noRight: "Ingen riktige eller gale svar.",
    staysLocal: "Svarene blir i nettleseren din — sendes ingen steder.",
    canGoBack: "Du kan gå tilbake og endre svar underveis.",
    statement: "Utsagn",
    of: "av",
    back: "Forrige",
    saved: "Svarene lagres lokalt",
    yourResult: "Ditt resultat",
    resultNote:
      "Snittskår per dimensjon på skalaen 1–5. Ingen persentiler mot befolkningen.",
    balanced: "Balansert nivå på denne dimensjonen.",
    saveResult: "Lagre resultat som tekst",
    retry: "Ta testen på nytt",
    downloadName: "resultat.txt",
    resultLabel: "resultat",
    scale: "/5",
    high: "Høy",
    low: "Lav",
    report: "Din rapport",
    reportLead: "Slik leser du profilene ovenfor:",
    strength: "Styrke",
    watch: "Trompeter for deg",
    both: "Både og — du bestemmer balansen.",
    print: "Skriv ut / lagre som PDF",
  },
  en: {
    beforeStart: "Before you begin",
    start: "Start the test",
    noRight: "There are no right or wrong answers.",
    staysLocal: "Answers stay in your browser — nothing is sent anywhere.",
    canGoBack: "You can go back and change answers along the way.",
    statement: "Statement",
    of: "of",
    back: "Back",
    saved: "Answers are stored locally",
    yourResult: "Your result",
    resultNote:
      "Average score per dimension on a 1–5 scale. No population percentiles.",
    balanced: "A balanced level on this dimension.",
    saveResult: "Save result as text",
    retry: "Take the test again",
    downloadName: "result.txt",
    resultLabel: "result",
    scale: "/5",
    high: "High",
    low: "Low",
    report: "Your report",
    reportLead: "How to read the profiles above:",
    strength: "Strength",
    watch: "Watch-out",
    both: "Both sides — you set the balance.",
    print: "Print / save as PDF",
  },
} as const;

type Phase = "intro" | "run" | "results";

function band(pct: number): "low" | "mid" | "high" {
  if (pct >= 65) return "high";
  if (pct <= 35) return "low";
  return "mid";
}

const BAND_TITLE: Record<Locale, Record<"low" | "mid" | "high", string>> = {
  no: {
    low: "Lav på",
    mid: "Balansert på",
    high: "Høy på",
  },
  en: {
    low: "Low on",
    mid: "Balanced on",
    high: "High on",
  },
};

export function TestRun({
  spec,
  drawCount,
  locale = "no",
}: {
  spec: TestSpec;
  drawCount: number;
  locale?: Locale;
}) {
  const i18n = T[locale];
  const label = LIKERT_LABELS[locale];
  const seedRef = useRef<number>(Date.now());
  const [phase, setPhase] = useState<Phase>("intro");
  const [order, setOrder] = useState<ReturnType<typeof drawItems>>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Likert>>({});
  const [results, setResults] = useState<DimensionResult[] | null>(null);

  const advRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const strongest = results
    ? [...results].sort((a, b) => b.pct - a.pct)[0] ?? null
    : null;
  const weakest = results
    ? [...results].sort((a, b) => a.pct - b.pct)[0] ?? null
    : null;

  function answer(v: Likert) {
    if (!current) return;
    const next = { ...answers, [current.id]: v };
    setAnswers(next);
    if (advRef.current) clearTimeout(advRef.current);
    const complete = order.every((it) => next[it.id] !== undefined);
    if (complete) {
      setResults(score(spec, order, next));
      setPhase("results");
    } else if (idx < order.length - 1) {
      advRef.current = setTimeout(() => setIdx((i) => Math.min(i + 1, order.length - 1)), 180);
    }
  }

  function saveTxt() {
    if (!results) return;
    const lines = [
      `${spec.title} — ${i18n.resultLabel}`,
      new Date().toLocaleString(locale === "no" ? "nb-NO" : "en-US"),
      "",
      ...results.map(
        (r) => `${r.name}: ${r.mean}/5 (${r.pct}%)\n  ${i18n.high}: ${r.high}\n  ${i18n.low}: ${r.low}`
      ),
      "",
      strongest && strongest.pct >= 65
        ? `${BAND_TITLE[locale].high.toLowerCase()} ${strongest.name}: ${strongest.high}`
        : "",
      weakest && weakest.pct <= 35
        ? `${BAND_TITLE[locale].low.toLowerCase()} ${weakest.name}: ${weakest.low}`
        : "",
      "",
      spec.disclaimer,
    ];
    const blob = new Blob([lines.filter((l) => l !== "").join("\n")], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${spec.id}-${i18n.downloadName}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (phase === "intro") {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold">{i18n.beforeStart}</h2>
        <p className="mt-2 leading-relaxed text-gray-600">{spec.intro}</p>
        <ul className="mt-4 space-y-1.5 text-sm text-gray-500">
          <li>• {i18n.noRight}</li>
          <li>• {i18n.staysLocal}</li>
          <li>• {i18n.canGoBack}</li>
        </ul>
        <button
          onClick={start}
          className="mt-5 w-full rounded-xl px-5 py-4 text-base font-bold text-white sm:w-auto sm:px-8"
          style={{ background: "var(--ba-accent-strong)" }}
        >
          {i18n.start}
        </button>
      </section>
    );
  }

  if (phase === "run" && current) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
          <span>
            {i18n.statement} {idx + 1} {i18n.of} {order.length}
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
                    ? { borderColor: "var(--ba-accent)", color: "var(--ba-accent)", background: "var(--ba-accent-soft)" }
                    : { borderColor: "var(--ba-border)", color: "var(--ba-text-soft)", background: "var(--ba-surface)" }
                }
              >
                {label[v]}
              </button>
            );
          })}
        </div>
        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="rounded-xl px-5 py-3 text-sm font-bold disabled:opacity-30"
            style={{ background: "var(--ba-surface-2)" }}
          >
            {i18n.back}
          </button>
          <span className="text-xs text-gray-400">{i18n.saved}</span>
        </div>
      </section>
    );
  }

  if (phase === "results" && results) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold">{i18n.yourResult}</h2>
        <p className="mt-1 text-sm text-gray-500">{i18n.resultNote}</p>
        <div className="mt-5 space-y-5">
          {results.map((r) => (
            <div key={r.key}>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-bold">{r.name}</h3>
                <span className="text-sm font-semibold text-gray-500">
                  {r.mean}{i18n.scale}
                </span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${r.pct}%`, background: "var(--ba-accent)" }}
                />
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                {r.mean >= 3.5 ? r.high : r.mean <= 2.5 ? r.low : i18n.balanced}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-gray-100 pt-5">
          <h3 className="font-bold">{i18n.report}</h3>
          <p className="mt-1 text-xs text-gray-500">{i18n.reportLead}</p>
          {strongest && (
            <div className="mt-3 rounded-xl bg-emerald-50 p-4">
              <p className="text-xs font-bold tracking-wide text-emerald-800 uppercase">
                {BAND_TITLE[locale].high} {strongest.name} (65–100)
              </p>
              <p className="mt-1 text-sm leading-relaxed text-emerald-900" style={{ color: "var(--ba-ok-text)" }}>
                <span className="font-semibold">{i18n.strength}: </span>
                {strongest.high}
              </p>
              {strongest.low && (
                <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--ba-ok-watch)" }}>
                  <span className="font-semibold">{i18n.watch}: </span>
                  {strongest.low}
                </p>
              )}
              <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
                {i18n.both}
              </p>
            </div>
          )}
          {weakest && weakest.pct <= 35 && (
            <div className="mt-3 rounded-xl bg-amber-50 p-4">
              <p className="text-xs font-bold tracking-wide text-amber-900 uppercase">
                {BAND_TITLE[locale].low} {weakest.name} (0–35)
              </p>
              <p className="mt-1 text-sm leading-relaxed text-amber-900" style={{ color: "var(--ba-warn-heading)" }}>
                <span className="font-semibold">{i18n.strength}: </span>
                {weakest.low && weakest.pct <= 35 ? weakest.low : weakest.high}
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
          {spec.disclaimer}
        </p>
        <div className="mt-5 gap-2 sm:flex">
          <button
            onClick={saveTxt}
            className="w-full rounded-xl px-5 py-3.5 text-sm font-bold text-white sm:w-auto"
            style={{ background: "var(--ba-accent-strong)" }}
          >
            {i18n.saveResult}
          </button>
          <button
            onClick={() => window.print()}
            className="mt-2 w-full rounded-xl px-5 py-3.5 text-sm font-bold sm:mt-0 sm:w-auto"
            style={{ background: "var(--ba-surface-2)" }}
          >
            {i18n.print}
          </button>
          <button
            onClick={start}
            className="mt-2 w-full rounded-xl px-5 py-3.5 text-sm font-bold sm:mt-0 sm:w-auto"
            style={{ background: "var(--ba-surface-2)" }}
          >
            {i18n.retry}
          </button>
        </div>
      </section>
    );
  }

  return null;
}