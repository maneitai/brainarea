import { SiteHeader } from "@/components/site-header";
import { TestRun } from "@/components/test-run";
import { samspillSpecEn } from "@/data/korte-en";

export const metadata = { title: "Connection style — relationship test" };

export default function EnRelasjonerPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale="en" />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-6 pb-16 sm:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Connection style</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          Four dimensions: closeness, openness, conflict handling and
          independence. Based on original statements developed for Brainarea.
        </p>

        <div className="mt-6">
          <TestRun spec={samspillSpecEn} drawCount={16} locale="en" />
        </div>

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-bold">Method</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            16 statements, four per dimension. Positively worded statements are
            scored 1–5, negatively worded 5–1, and each dimension score is the
            average of your answers.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-gray-500">
            The statements and scoring are not psychometrically validated. No
            population percentiles, no norming.
          </p>
        </section>
      </main>
    </div>
  );
}