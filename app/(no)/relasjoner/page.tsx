import { SiteHeader } from "@/components/site-header";
import { TestRun } from "@/components/test-run";
import { samspillSpec } from "@/data/korte-no";

export const metadata = { title: "Samspill — relasjonstest" };

export default function RelasjonerPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-6 pb-16 sm:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Samspill</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          Fire dimensjoner: nærhet, åpenhet, konflikthåndtering og
          selvstendighet. Basert på egne utsagn utviklet for Brainarea.
        </p>

        <div className="mt-6">
          <TestRun spec={samspillSpec} drawCount={16} />
        </div>

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-bold">Metode</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            16 utsagn, fire per dimensjon. Positivt formulerte utsagn skåres
            1–5, negative 5–1, og skåren per dimensjon er gjennomsnittet av
            svarene dine.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-gray-500">
            Utsagnene og skåringen er ikke psykometrisk validert. Ingen
            persentiler mot befolkningen, og ingenting normaliseres.
          </p>
        </section>
      </main>
    </div>
  );
}