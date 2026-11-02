import { SiteHeader } from "@/components/site-header";
import { IqRun } from "@/components/iq-run";
import { IQ_TEXT } from "@/data/iq-text";

export const metadata = { title: "Cognitive profile — IQ test" };

export default function EnEvnePage() {
  const t = IQ_TEXT.en;
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale="en" />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-6 pb-16 sm:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight">{t.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          Four subtests, redrawn every run. The result is shown as an honest
          estimated band — not normed IQ, not a Mensa test.
        </p>

        <div className="mt-6">
          <IqRun locale="en" />
        </div>

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-bold">{t.methodTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{t.methodBody}</p>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">{t.methodBody2}</p>
          <p className="mt-4 text-xs leading-relaxed text-gray-500">
            Note [NV]: the item banks, weights and IQ bands in this model are
            not validated against a norming group. Number series must be solved
            with mental arithmetic — scoring low without a calculator is by
            design, not a bug.
          </p>
        </section>
      </main>
    </div>
  );
}