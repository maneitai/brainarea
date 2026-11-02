import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Personvernerklæring" };

export default function PersonvernPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-6 pb-16 sm:px-8">
        <p className="text-sm font-semibold">
          <Link href="/">← Til forsiden</Link>
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
          Personvernerklæring
        </h1>
        <p className="mt-3 leading-relaxed text-gray-600">
          Kort versjon: testene dine skjer i nettleseren din. Vi mottar ikke
          svarene dine, vi lagrer ikke svarene dine, og vi kan ikke se dem.
        </p>

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold">Hvilke data behandles</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Testlogikken — spørsmålstrekk, skåring og resultater — kjører
            lokalt i nettleseren din. Ingen testdata sendes til oss eller til
            tredjeparter. Det hentes ingen brukerkonto, og vi setter ingen
            sporingskapsler for å utføre testene. Eneste lokale lagring er en
            tidstempel for IQ-testens retest-regel (ti dager), lagret i
            nettleserens egen lagringsplass på din enhet og kan fjernes når som
            helst ved å tømme nettleserdata.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold">Ved registrering</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Når registrering og resultatlaging kommer en gang i fremtiden, vil
            dette dokumentet oppdateres med formål, grunnlag, lagringstid og
            dine rettigheter før noe aktiveres.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold">Annonser og tredjeparter</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Nettsiden er ad-finansiert. Når annonser aktiveres, leveres de av
            Google AdSense, som kan benytte informasjonskapsler og ligne
            teknologi for visning og måling av annonser. Googles
            personvernerklæring ligger på{" "}
            <a
              className="font-semibold underline"
              style={{ color: "var(--ba-accent)" }}
              href="https://policies.google.com/privacy"
            >
              policies.google.com/privacy
            </a>
            , og du kan velge bort personlig annonsering i Google sine
            annonseinnstillinger. Denne teksten oppdateres før annonsering
            aktiveres.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold">Ansvarlig</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Brainarea er en privat nettside. Ansvarlig utgiver nås på{" "}
            <a className="font-semibold underline" style={{ color: "var(--ba-accent)" }} href="mailto:manieten@pm.me">
              manieten@pm.me
            </a>
            . Brukes informasjonskapsler i et omfang som krever samtykke, et
            samtykkeverktøy legges inn og dette dokumentet beskriver da
            samtykkesvalget ditt i detalj.
          </p>
        </section>

        <p className="mt-8 text-xs leading-relaxed text-gray-500">
          Sist oppdatert: november 2026
        </p>
      </main>
    </div>
  );
}