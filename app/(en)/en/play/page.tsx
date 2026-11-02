"use client";

import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { TestRun } from "@/components/test-run";
import {
  arbeidsstilSpecEn,
  kreativSpecEn,
  pressSpecEn,
} from "@/data/korte-en";

const SPECS = [
  { spec: arbeidsstilSpecEn, drawCount: 12, label: "Work style", time: "about 3 min" },
  { spec: pressSpecEn, drawCount: 10, label: "Under pressure", time: "about 2.5 min" },
  { spec: kreativSpecEn, drawCount: 9, label: "Creativity profile", time: "about 2.5 min" },
];

export default function EnPlayPage() {
  const [sel, setSel] = useState<number | null>(null);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale="en" />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-6 pb-16 sm:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Play</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          Short, shareable tests. Pick one:
        </p>

        {sel === null ? (
          <div className="mt-6 grid gap-3">
            {SPECS.map((s, i) => (
              <button
                key={s.spec.id}
                onClick={() => setSel(i)}
                className="rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-bold">{s.label}</h2>
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                    style={{ background: "var(--ba-accent-strong)" }}
                  >
                    {s.time}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-gray-600">{s.spec.intro}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-6">
            <button
              onClick={() => setSel(null)}
              className="mb-3 text-sm font-semibold"
              style={{ color: "var(--ba-accent)" }}
            >
              ← All tests
            </button>
            <TestRun spec={SPECS[sel].spec} drawCount={SPECS[sel].drawCount} locale="en" />
          </div>
        )}
      </main>
    </div>
  );
}