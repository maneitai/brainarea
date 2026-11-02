import { SiteHeader } from "@/components/site-header";
import { IqRun } from "@/components/iq-run";
import { IQ_TEXT } from "@/data/iq-text";

export const metadata = { title: "Kognitiv profil — IQ-/evnetest" };

export default function EvnePage() {
  const t = IQ_TEXT.no;
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-6 pb-16 sm:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight">{t.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          Fire deltester trekkes på nytt hver gang. Resultatet vises som et
          ærlig estimatbånd — ikke normert IQ, ikke mensatest.
        </p>

        <div className="mt-6">
          <IqRun locale="no" />
        </div>

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-bold">{t.methodTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{t.methodBody}</p>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">{t.methodBody2}</p>
          <p className="mt-4 text-xs leading-relaxed text-gray-500">
            Merknad [NV]: itembankene, vektene og IQ-båndene i denne modellen er
            ikke validert mot en normeringsgruppe. Tallrekkene må løses med
            mentale regneregler og kan skåres lavt uten kalkulator — det er
            ment, ikke en feil.
          </p>
        </section>
      </main>
    </div>
  );
}