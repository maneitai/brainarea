import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Om testene — metodikk, kilder og begrensninger" };

export default function OmTestenePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-6 pb-16 sm:px-8">
        <p className="text-sm font-semibold">
          <Link href="/">← Til forsiden</Link>
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
          Om testene
        </h1>
        <p className="mt-3 leading-relaxed text-gray-600">
          Denne siden forklarer hvordan testene på Brainarea er bygget, hva de
          bygger på, og — minst like viktig — hva de ikke er.
        </p>

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold">Hvordan testene fungerer</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Alle tester her kjører i nettleseren din. Svarene sendes ingen
            steder, lagres ingen steder, og du trenger ingen konto. Spørsmålene
            trekkes tilfeldig fra faste banker ved hver teststart — du får
            sjelden nøyaktig samme rekkefølge to ganger. Korte tester viser
            gjennomsnittskår per dimensjon; IQ-/evnetesten viser et estimert
            evnebånd beregnet fra prosentre per deltest.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold">Hva personlighetstesten bygger på</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            PERSONA bruker IPIP Big-Five faktormarkører (Goldberg, 1992) — 50
            utsagn, ti per dimensjon: utadvendthet, omgjengelighet,
            planmessighet, følelsesmessig stabilitet og åpenhet for erfaringer.
            IPIP er et offentlig tilgjengelig forskningsinstrument (public
            domain) som brukes i en stor del av moderne personlighetsforskning.
            Den norske teksten er vår arbeidsoversettelse. Kilde:{" "}
            <a className="font-semibold underline" style={{ color: "var(--ba-accent)" }} href="https://ipip.ori.org/">
              ipip.ori.org
            </a>
            .
          </p>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Vi har med vilje ikke valgt MBTI eller 16-typologi-modeller, fordi
            de deler kontinuerlige personlighetstrekk opp i enten-eller-kategorier
            som forskningen ikke støtter.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold">Hvordan IQ-/evnetesten er bygget</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Den kognitive profilen består av fire deltester: tallrekker
            (resonnering over regneregler), figurmønstre (visuell
            regelgjenkjenning), verbal resonnering (ordkunnskap og analogier)
            og arbeidshukommelse (hukommelsesspant). Spørsmålene genereres
            parametrisk fra regelbaserte maler med tilfeldige verdier — det gir
            nye, ekvivalente oppgaver ved hver runde og beskytter mot memorering.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Skåren vises kun som grove estimatbånd (ca. 70–85, ca. 85–100,
            ca. 100–115, ca. 115–130+). Båndene er brede med vilje, og de er{" "}
            <strong>ikke validert</strong> mot en normeringsgruppe. Dette er
            ikke en normert IQ-test og ikke en godkjent Mensa-test. Et ærlig
            krav om «normert IQ» krever et profesjonelt instrument lagt fram av
            kvalifisert fagperson — og da må vi også samle reelle skåredata fra
            mange brukere over tid før en slik skalering kan forsvares.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold">Hva testene ikke er</h2>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-gray-600">
            <li>• Ikke medisinske eller psykologiske vurderinger.</li>
            <li>• Ikke egnet som eneste grunnlag for ansettelse eller andre viktige beslutninger.</li>
            <li>• Ikke normert mot befolkningen — ingen persentiler sammenlignes med andre.</li>
            <li>• Ikke psykometrisk validerte oversettelser eller normer.</li>
          </ul>
        </section>

        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold">Personvern</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Testlogikken kjører lokalt i nettleseren. Vi mottar ikke, lagrer
            ikke og ser ikke svarene dine. Vi bruker ikke sporingskapsler til
            testskåring, og vi krever ingen registrering. Når annonsering
            aktiveres på siden, oppdateres denne teksten med hvem som leverer
            annonsene og hvilke valg du har.
          </p>
        </section>

        <p className="mt-8 text-xs leading-relaxed text-gray-500">
          Brainarea er et indikativt selvinnsikt-verktøy for alminnelig
          interesse og underholdning. Kontakt: manieten@pm.me
        </p>
      </main>
    </div>
  );
}