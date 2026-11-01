import { TestCard } from "@/components/test-card";

const TESTS = [
  {
    href: "/persona",
    title: "PERSONA",
    desc: "Personlighetstest basert på Big Five. 60 utsagn, ca. 10 minutter.",
    accent: true,
    oktag: "Flaggskips-test",
  },
  {
    href: "/evne",
    title: "IQ-/evnetest",
    desc: "Kognitiv profil: logikk, mønstre, hukommelse og verbal resonnering.",
    accent: true,
    oktag: "Estimat — ikke godkjent test",
  },
  {
    href: "/relasjoner",
    title: "Relasjoner",
    desc: "Kompatibilitet og samspill: vennskap, samliv, konflikthåndtering.",
    accent: false,
    oktag: "Kommer snart",
  },
  {
    href: "/play",
    title: "Play",
    desc: "Korte, delbare tester: arbeidsstil, under press, kreativitetsprofil.",
    accent: false,
    oktag: "Kommer snart",
  },
] as const;

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-5 pt-6 pb-2 sm:px-8">
        <span className="text-lg font-extrabold tracking-tight">
          Brainarea
        </span>
        <nav className="flex gap-1 text-sm" aria-label="Språkvelger">
          <button className="rounded-full px-3 py-1.5 font-semibold text-white" style={{ background: "var(--ba-accent)" }}>
            NO
          </button>
          <button className="rounded-full px-3 py-1.5 text-gray-500 hover:bg-gray-200/60">
            EN
          </button>
        </nav>
      </header>

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
            <TestCard
              key={t.href}
              href={t.href}
              title={t.title}
              desc={t.desc}
              oktag={t.oktag}
              accent={t.accent}
            />
          ))}
        </div>

        <p className="mt-10 text-xs leading-relaxed text-gray-500">
          Testene er indikative selvinnsikts-verktøy, ikke medisinsk eller
          psykologisk vurdering, og skal ikke brukes alene til ansettelse eller
          andre viktige beslutninger.
        </p>
      </main>

      <footer className="px-5 pb-8 text-center text-xs text-gray-400">
        © 2026 Brainarea
      </footer>
    </div>
  );
}
