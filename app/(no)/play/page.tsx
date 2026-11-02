"use client";

import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { TestRun } from "@/components/test-run";
import {
  arbeidsstilSpec,
  kreativSpec,
  pressSpec,
} from "@/data/korte-no";

const SPECS = [
  { spec: arbeidsstilSpec, drawCount: 12, label: "Arbeidsstil", time: "ca. 3 min" },
  { spec: pressSpec, drawCount: 10, label: "Under press", time: "ca. 2,5 min" },
  { spec: kreativSpec, drawCount: 9, label: "Kreativ profil", time: "ca. 2,5 min" },
];

export default function PlayPage() {
  const [sel, setSel] = useState<number | null>(null);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-6 pb-16 sm:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Play</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          Korte, delbare tester. Velg én:
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
              ← Alle tester
            </button>
            <TestRun spec={SPECS[sel].spec} drawCount={SPECS[sel].drawCount} />
          </div>
        )}
      </main>
    </div>
  );
}