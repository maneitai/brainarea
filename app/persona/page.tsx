import { SiteHeader } from "@/components/site-header";
import { TestRun } from "@/components/test-run";
import { personaSpec } from "@/data/persona";

export const metadata = { title: "PERSONA — personlighetstest" };

export default function PersonaPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-6 pb-16 sm:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight">PERSONA</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          Forskningsforankret personlighetstest: 50 utsagn, fem dimensjoner
          (IPIP Big-Five faktormarkører, Goldberg 1992 — public domain).
        </p>

        <div className="mt-6">
          <TestRun spec={personaSpec} drawCount={50} />
        </div>

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-bold">Metode og kilder</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Instrument: IPIP Big-Five Factor Markers — 10 utsagn per dimensjon.
            Positive utsagn skåres 1–5, negative 5–1. Skår per dimensjon er
            gjennomsnittet. Kilde:{" "}
            <a
              className="font-semibold underline"
              style={{ color: "var(--ba-accent)" }}
              href="https://ipip.ori.org/"
            >
              ipip.ori.org
            </a>
            . Norsk tekst er en arbeidsoversettelse.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-gray-500">
            Skårene er ikke persentiler sammenlignet med befolkningen — ingen
            norske normer brukes. Oversettelsen er ikke psykometrisk validert.
          </p>
        </section>
      </main>
    </div>
  );
}