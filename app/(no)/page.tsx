import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

const TESTS = [
  {
    href: "/persona",
    title: "PERSONA",
    desc: "Personlighetstest basert på Big Five. 50 utsagn, ca. 10–15 minutter.",
    tag: "Åpen nå",
    enabled: true,
  },
  {
    href: "/evne",
    title: "IQ-/evnetest",
    desc: "Fire deltester med nye spørsmål hver gang. Viser estimert evnebånd — ikke normert IQ.",
    tag: "Åpen nå",
    enabled: true,
  },
  {
    href: "/relasjoner",
    title: "Relasjoner",
    desc: "Samspill i nære relasjoner: nærhet, åpenhet, konflikt og selvstendighet. 16 utsagn.",
    tag: "Åpen nå",
    enabled: true,
  },
  {
    href: "/play",
    title: "Play",
    desc: "Korte tester: arbeidsstil, under press, kreativ profil. 2–3 minutter hver.",
    tag: "Åpen nå",
    enabled: true,
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-8 pb-16 sm:px-8">
        <h1 className="text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">
          Test deg selv —{" "}
          <span style={{ color: "var(--ba-accent)" }}>gratis og ærlig</span>
        </h1>
        <p className="mt-3 text-base leading-relaxed text-gray-600 sm:text-lg">
          Tester av personlighet, evner og relasjoner. Svarene dine blir i
          nettleseren din, sendes ingen steder, og du trenger ingen konto.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {TESTS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-bold">{t.title}</h2>
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-white"
                  style={{ background: "var(--ba-accent)" }}
                >
                  {t.tag}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {t.desc}
              </p>
            </Link>
          ))}
        </div>

        <p className="mt-6 text-sm">
          <Link
            href="/om-testene"
            className="font-semibold underline"
            style={{ color: "var(--ba-accent)" }}
          >
            Hvordan testene fungerer — metodikk, kilder og begrensninger
          </Link>
        </p>

        <p className="mt-10 text-xs leading-relaxed text-gray-500">
          Testene er indikative selvinnsikts-verktøy — ikke medisinsk eller
          psykologisk vurdering, og skal ikke brukes alene til ansettelse eller
          andre viktige beslutninger. IQ-skåren vises kun som estimatbånd.
        </p>
      </main>

      <footer className="px-5 pb-8 text-center text-xs text-gray-400">
        © 2026 Brainarea
      </footer>
    </div>
  );
}