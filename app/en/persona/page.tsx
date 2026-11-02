import { SiteHeader } from "@/components/site-header";
import { TestRun } from "@/components/test-run";
import { personaEnSpec } from "@/data/persona-en";

export const metadata = { title: "PERSONA — personality test" };

export default function PersonaEnPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale="en" />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-6 pb-16 sm:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight">PERSONA</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          Research-grounded personality test: 50 items, five dimensions
          (IPIP Big-Five factor markers, Goldberg 1992 — public domain, used
          verbatim in English).
        </p>

        <div className="mt-6">
          <TestRun spec={personaEnSpec} drawCount={50} locale="en" />
        </div>

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-bold">Method and sources</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Instrument: IPIP Big-Five Factor Markers (50-item sample
            questionnaire, administered form from{" "}
            <a
              className="font-semibold underline"
              style={{ color: "var(--ba-accent)" }}
              href="https://ipip.ori.org/New_IPIP-50-item-scale.htm"
            >
              ipip.ori.org
            </a>
            ). Positively worded items are scored 1–5, negatively worded 5–1.
            Score per dimension is the mean. The fifth factor is labelled
            &ldquo;Openness to Experience&rdquo; here; IPIP&rsquo;s own label
            is &ldquo;Intellect/Imagination&rdquo;.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-gray-500">
            Scores are not percentiles compared with the population — no norms
            are used. This online implementation is not psychometrically
            validated.
          </p>
        </section>
      </main>
    </div>
  );
}