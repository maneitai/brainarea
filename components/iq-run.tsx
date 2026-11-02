"use client";

import { useEffect, useRef, useState } from "react";
import type { ChoiceItem, FigItem, SeriesItem } from "@/lib/iq-engine";
import {
  BANDS,
  genPatternForm,
  genSeriesForm,
  genSpanSeq,
  scoreIq,
  verbalDraw,
} from "@/lib/iq-engine";
import { IQ_TEXT } from "@/data/iq-text";
import { IQ_VERBAL_EN } from "@/data/iq-verbal-en";
import { IQ_VERBAL_NO } from "@/data/iq-verbal-no";
import { Tile } from "@/components/iq-tile";

type Locale = "no" | "en";
type Phase = "intro" | "run" | "results";

type SpanRun = { level: number; seq: number[] };

type QData = {
  series: SeriesItem[];
  pattern: FigItem[];
  verbal: ChoiceItem[];
  spanRuns: SpanRun[];
};

const RETEST_MS = 10 * 24 * 60 * 60 * 1000;

function digitsOf(s: string): string {
  return s.replace(/\D/g, "").slice(0, 9);
}

export function IqRun({ locale = "no" }: { locale?: Locale }) {
  const t = IQ_TEXT[locale];
  const [phase, setPhase] = useState<Phase>("intro");
  const [retest, setRetest] = useState<boolean>(false);
  const [q, setQ] = useState<QData | null>(null);
  const [partIdx, setPartIdx] = useState(0); // 0 series, 1 pattern, 2 verbal, 3 span
  const [qIdx, setQIdx] = useState(0);
  const [chosen, setChosen] = useState<Record<string, number>>({});

  // span state
  const [spanIdx, setSpanIdx] = useState(0);
  const [spanPhase, setSpanPhase] = useState<"show" | "input" | "done">("show");
  const [spanAt, setSpanAt] = useState(0); // digit index shown
  const [spanInput, setSpanInput] = useState("");
  const [spanFlash, setSpanFlash] = useState<"" | "ok" | "fail">("");

  const [res, setRes] = useState<ReturnType<typeof scoreIq> | null>(null);
  const spanBestRef = useRef<number>(0);
  const advRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem("ba-iq-last");
      if (v) setRetest(Date.now() - Number(v) < RETEST_MS);
    } catch {
      /* private mode */
    }
  }, []);

  function start() {
    try {
      localStorage.setItem("ba-iq-last", String(Date.now()));
    } catch {
      /* private mode */
    }
    const spanLevels = [3, 3, 4, 4, 5, 5, 6, 6];
    setQ({
      series: genSeriesForm(Date.now() >>> 0),
      pattern: genPatternForm(Date.now() >>> 0),
      verbal: verbalDraw(
        locale === "no" ? IQ_VERBAL_NO : IQ_VERBAL_EN,
        (Date.now() ^ 0x5f5f5) >>> 0
      ),
      spanRuns: spanLevels.map((lv, i) => ({
        level: lv,
        seq: genSpanSeq(lv, ((Date.now() >>> 0) + i * 977) >>> 0),
      })),
    });
    setPartIdx(0);
    setQIdx(0);
    setChosen({});
    setSpanIdx(0);
    setSpanPhase("show");
    setSpanAt(0);
    setSpanInput("");
    setSpanFlash("");
    spanBestRef.current = 0;
    setRes(null);
    setPhase("run");
  }

  const partTitles = [t.seriesTitle, t.patternTitle, t.verbalTitle, t.spanTitle];
  const partCounts = [q?.series.length ?? 8, q?.pattern.length ?? 8, q?.verbal.length ?? 8, q?.spanRuns.length ?? 8];

  function finishAll(sCorrect: number, pCorrect: number, vCorrect: number, span: number) {
    setRes(scoreIq({ series: sCorrect, pattern: pCorrect, verbal: vCorrect, span }));
    setPhase("results");
  }

  function advancePart() {
    spanBestRef.current = 0;
    setPartIdx((p) => p + 1);
    setQIdx(0);
    setSpanIdx(0);
    setSpanPhase("show");
    setSpanAt(0);
    setSpanInput("");
  }

  // series / pattern / verbal answering
  function answer(v: number) {
    if (!q) return;
    if (advRef.current) clearTimeout(advRef.current);
    if (partIdx === 0) {
      const it = q.series[qIdx];
      setChosen((c) => ({ ...c, [it.id]: v }));
      advRef.current = setTimeout(() => {
        if (qIdx + 1 >= q.series.length) advancePart();
        else setQIdx((i) => i + 1);
      }, 200);
    } else if (partIdx === 1) {
      const it = q.pattern[qIdx];
      setChosen((c) => ({ ...c, [it.id]: v }));
      advRef.current = setTimeout(() => {
        if (qIdx + 1 >= q.pattern.length) advancePart();
        else setQIdx((i) => i + 1);
      }, 200);
    } else if (partIdx === 2) {
      const it = q.verbal[qIdx];
      setChosen((c) => ({ ...c, [it.id]: v }));
      advRef.current = setTimeout(() => {
        if (qIdx + 1 >= q.verbal.length) advancePart();
        else setQIdx((i) => i + 1);
      }, 200);
    }
  }


  // span display ticker
  const run = phase === "run";
  const spanRunActive = run && partIdx === 3 && q && q.spanRuns.length > 0 && spanIdx < q.spanRuns.length;
  useEffect(() => {
    if (!spanRunActive || spanPhase !== "show" || !q) return;
    const seq = q.spanRuns[spanIdx].seq;
    if (spanAt >= seq.length) {
      const h = setTimeout(() => setSpanPhase("input"), 500);
      return () => clearTimeout(h);
    }
    const h = setTimeout(() => setSpanAt((v) => v + 1), 550);
    return () => clearTimeout(h);
  }, [spanRunActive, spanPhase, spanAt, spanIdx, q]);

  // span typing
  function spanKey(k: number) {
    if (spanPhase !== "input" || spanFlash) return;
    if (spanInput.length >= 9) return;
    setSpanInput((s) => digitsOf(s + String(k)));
  }
  function spanSubmit() {
    if (!q || spanPhase !== "input" || spanFlash) return;
    const run2 = q.spanRuns[spanIdx];
    const ok = spanInput.replace(/\D/g, "") === run2.seq.join("");
    setSpanFlash(ok ? "ok" : "fail");
    setTimeout(() => {
      setSpanFlash("");
      if (ok) {
        spanBestRef.current = Math.max(spanBestRef.current, run2.level);
        if (spanIdx + 1 >= q.spanRuns.length) {
          finishAllWithSpan();
        } else {
          setSpanIdx((i) => i + 1);
          setSpanPhase("show");
          setSpanAt(0);
          setSpanInput("");
        }
      } else {
        finishAllWithSpan();
      }
    }, 700);
  }
  function finishAllWithSpan() {
    const sC = q ? q.series.filter((it) => chosen[it.id] === it.correctIndex).length : 0;
    const pC = q ? q.pattern.filter((it) => chosen[it.id] === it.correctIndex).length : 0;
    const vC = q ? q.verbal.filter((it) => chosen[it.id] === it.correctIndex).length : 0;
    finishAll(sC, pC, vC, spanBestRef.current);
  }

  function saveTxt() {
    if (!res) return;
    const band = BANDS[res.bandIndex][locale === "no" ? "rangeNo" : "rangeEn"];
    const lines = [
      "Brainarea — " + (locale === "no" ? "Kognitiv profil" : "Cognitive profile"),
      new Date().toLocaleString(locale === "no" ? "nb-NO" : "en-US"),
      "",
      (locale === "no" ? "Estimert evnebånd: " : "Estimated band: ") + band,
      "",
      t.seriesTitle + ": " + res.seriesPct + "%",
      t.patternTitle + ": " + res.patternPct + "%",
      t.verbalTitle + ": " + res.verbalPct + "%",
      t.spanTitle + ": " + res.spanPct + "%",
      "",
      t.disclaimer,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = locale === "no" ? "kognitiv-profil.txt" : "cognitive-profile.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (phase === "intro") {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold">{t.title}</h2>
        <p className="mt-2 leading-relaxed text-gray-600">{t.intro}</p>
        <ul className="mt-4 space-y-1.5 text-sm text-gray-500">
          {t.bullets.map((b) => (
            <li key={b}>• {b}</li>
          ))}
        </ul>
        {retest && (
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
            {locale === "no"
              ? "Du har tatt denne testen de siste ti dagene. Retest måles mot helt nye spørsmål — sammenlign bånd, ikke skår."
              : "You have taken this test in the last ten days. Retests are measured against entirely new items — compare bands, not scores."}
          </p>
        )}
        <button
          onClick={start}
          className="mt-5 w-full rounded-xl px-5 py-4 text-base font-bold text-white sm:w-auto sm:px-8"
          style={{ background: "var(--ba-accent-strong)" }}
        >
          {t.start}
        </button>
      </section>
    );
  }

  if (phase === "run" && q) {
    const showQ = partIdx < 3;
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
          <span>
            {t.part} {partIdx + 1} {t.of4} · {partTitles[partIdx]}
          </span>
          <span>
            {showQ ? `${t.question} ${qIdx + 1} ${t.of} ${partCounts[partIdx]}` : `${spanIdx + 1} ${t.of} ${q.spanRuns.length}`}
          </span>
        </div>

        {partIdx === 0 && qIdx < q.series.length && (
          <>
            <p className="mt-4 text-sm text-gray-600">{t.seriesIntro}</p>
            <p className="mt-3 text-2xl font-extrabold tracking-wide sm:text-3xl" style={{ color: "var(--ba-accent)" }}>
              {q.series[qIdx].nums.map((n) => String(n)).join("   ·   ")}   ·   ?
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {q.series[qIdx].options.map((o, oi) => {
                const selected = chosen[q.series[qIdx].id] === oi;
                return (
                  <button
                    key={oi}
                    onClick={() => answer(oi)}
                    className="rounded-xl border px-4 py-3.5 text-lg font-bold transition"
                    style={
                      selected
                        ? { borderColor: "var(--ba-accent)", color: "var(--ba-accent)", background: "var(--ba-accent-soft)" }
                        : { borderColor: "var(--ba-border)", color: "var(--ba-text-soft)", background: "var(--ba-surface)" }
                    }
                  >
                    {o}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {partIdx === 1 && qIdx < q.pattern.length && (
          <>
            <p className="mt-4 text-sm text-gray-600">{t.patternIntro}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {q.pattern[qIdx].tiles.map((tl, i) => (
                <div key={i} className="rounded-xl border border-gray-200 p-2">
                  <Tile d={tl} />
                </div>
              ))}
              <div className="flex w-14 items-center justify-center rounded-xl text-2xl font-extrabold" style={{ color: "var(--ba-accent)" }}>
                ?
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {q.pattern[qIdx].options.map((o, oi) => {
                const selected = chosen[q.pattern[qIdx].id] === oi;
                return (
                  <button
                    key={oi}
                    onClick={() => answer(oi)}
                    className="rounded-xl border p-2 transition"
                    style={
                      selected
                        ? { borderColor: "var(--ba-accent)", background: "var(--ba-accent-soft)" }
                        : { borderColor: "var(--ba-border)", background: "var(--ba-surface)" }
                    }
                    aria-label={String(oi + 1)}
                  >
                    <Tile d={o} />
                  </button>
                );
              })}
            </div>
          </>
        )}

        {partIdx === 2 && qIdx < q.verbal.length && (
          <>
            <p className="mt-4 text-sm text-gray-600">{t.verbalIntro}</p>
            <h3 className="mt-3 text-lg leading-snug font-bold">{q.verbal[qIdx].q}</h3>
            <div className="mt-5 grid gap-2">
              {q.verbal[qIdx].options.map((o, oi) => {
                const selected = chosen[q.verbal[qIdx].id] === oi;
                return (
                  <button
                    key={oi}
                    onClick={() => answer(oi)}
                    className="rounded-xl border px-4 py-3.5 text-left text-sm font-semibold transition"
                    style={
                      selected
                        ? { borderColor: "var(--ba-accent)", color: "var(--ba-accent)", background: "var(--ba-accent-soft)" }
                        : { borderColor: "var(--ba-border)", color: "var(--ba-text-soft)", background: "var(--ba-surface)" }
                    }
                  >
                    {o}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {partIdx === 3 && q && spanIdx < q.spanRuns.length && (
          <>
            <p className="mt-4 text-sm text-gray-600">{t.spanIntro}</p>
            {spanPhase === "show" && (
              <div className="mt-6 flex h-28 items-center justify-center">
                {spanAt < q.spanRuns[spanIdx].seq.length ? (
                  <span className="text-6xl font-extrabold tabular-nums" style={{ color: "var(--ba-accent)" }}>
                    {q.spanRuns[spanIdx].seq[spanAt]}
                  </span>
                ) : (
                  <span className="text-4xl font-extrabold text-gray-300">…</span>
                )}
              </div>
            )}
            {spanPhase === "input" && (
              <div className="mt-6">
                <p className="text-center text-sm text-gray-500">{t.spanPlaceholder}</p>
                <p className="mt-2 text-center text-3xl font-extrabold tabular-nums tracking-widest" style={{ minHeight: "2.5rem" }}>
                  {spanInput || <span className="text-gray-300">·</span>}
                </p>
                <span
                  className="mx-auto mt-2 block h-1.5 w-24 rounded-full"
                  style={{ background: spanFlash === "ok" ? "var(--ba-flash-ok)" : spanFlash === "fail" ? "var(--ba-flash-fail)" : "var(--ba-accent)" }}
                />
                <div className="mx-auto mt-4 grid max-w-xs grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => (
                    <button
                      key={k}
                      onClick={() => spanKey(k)}
                      className="rounded-xl border border-gray-200 bg-white py-3.5 text-xl font-bold active:bg-gray-100"
                    >
                      {k}
                    </button>
                  ))}
                  <button
                    onClick={() => spanInput.length > 0 && !spanFlash && setSpanInput((s) => s.slice(0, -1))}
                    className="rounded-xl border border-gray-200 bg-white py-3.5 text-lg"
                  >
                    ⌫
                  </button>
                  <button
                    onClick={spanSubmit}
                    className="col-span-2 rounded-xl py-3.5 text-sm font-bold text-white"
                    style={{ background: "var(--ba-accent-strong)" }}
                  >
                    {t.enter}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-5 flex items-center justify-between">
          <span className="text-xs text-gray-400">{t.backNotPossible}</span>
          <span className="text-xs text-gray-400">{t.timeNote}</span>
        </div>
      </section>
    );
  }

  if (phase === "results" && res) {
    const band = BANDS[res.bandIndex];
    const bandLabel = locale === "no" ? band.rangeNo : band.rangeEn;
    const bar = (pct: number) => (
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--ba-accent)" }} />
      </div>
    );
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold">{t.yourResult}</h2>
        <p className="mt-1 text-sm text-gray-500">{t.resultNote}</p>

        <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-center">
          <p className="text-xs font-bold tracking-wide text-gray-500 uppercase">{t.resultLead}</p>
          <p className="mt-1 text-3xl font-extrabold" style={{ color: "var(--ba-accent)" }}>
            {bandLabel}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">{t.resultSub}</p>
        </div>

        <h3 className="mt-5 font-bold">{t.subScores}</h3>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">{t.subNote}</p>
        <div className="mt-3 space-y-4">
          {[
            [t.seriesTitle, res.seriesPct],
            [t.patternTitle, res.patternPct],
            [t.verbalTitle, res.verbalPct],
            [t.spanTitle, res.spanPct],
          ].map(([name, pct]) => (
            <div key={name as string}>
              <div className="flex items-baseline justify-between gap-3">
                <h4 className="font-bold">{name}</h4>
                <span className="text-sm font-semibold text-gray-500">{pct}%</span>
              </div>
              {bar(pct as number)}
            </div>
          ))}
          <p className="text-xs text-gray-400">
            {t.span}: {spanBestRef.current} {t.spanCorrect}
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-gray-50 p-4">
          <p className="text-xs font-bold tracking-wide text-gray-600 uppercase">{t.honesty}</p>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">{t.honestyBody}</p>
        </div>

        <p className="mt-6 rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">{t.disclaimer}</p>
        <div className="mt-5 gap-2 sm:flex">
          <button onClick={saveTxt} className="w-full rounded-xl px-5 py-3.5 text-sm font-bold text-white sm:w-auto" style={{ background: "var(--ba-accent-strong)" }}>
            {t.saveResult}
          </button>
          <button onClick={() => window.print()} className="mt-2 w-full rounded-xl px-5 py-3.5 text-sm font-bold sm:mt-0 sm:w-auto" style={{ background: "var(--ba-surface-2)" }}>
            {t.print}
          </button>
          <button onClick={start} className="mt-2 w-full rounded-xl px-5 py-3.5 text-sm font-bold sm:mt-0 sm:w-auto" style={{ background: "var(--ba-surface-2)" }}>
            {t.retry}
          </button>
        </div>
      </section>
    );
  }

  return null;
}