import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Test yourself" };

const TESTS_EN = [
  {
    href: "/en/persona/",
    title: "PERSONA",
    desc: "Personality test based on the Big Five. 50 statements, about 10–15 minutes.",
    tag: "Open now",
  },
  {
    href: "/en/evne/",
    title: "IQ / cognitive test",
    desc: "Four subtests with fresh questions every run. Estimated ability band — not normed IQ.",
    tag: "Open now",
  },
  {
    href: "/en/relasjoner/",
    title: "Connection style",
    desc: "How you function in close relationships: closeness, openness, conflict, independence. 16 statements.",
    tag: "Open now",
  },
  {
    href: "/en/play/",
    title: "Play",
    desc: "Short tests: work style, under pressure, creativity profile. 2–3 minutes each.",
    tag: "Open now",
  },
];

export default function EnHome() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale="en" />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-8 pb-16 sm:px-8">
        <h1 className="text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">
          Test yourself —{" "}
          <span style={{ color: "var(--ba-accent)" }}>free and honest</span>
        </h1>
        <p className="mt-3 text-base leading-relaxed text-gray-600 sm:text-lg">
          Tests of personality, abilities and relationships. Your answers stay
          in your browser, are never sent anywhere, and no account is needed.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {TESTS_EN.map((t) => (
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
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{t.desc}</p>
            </Link>
          ))}
        </div>

        <p className="mt-6 text-sm">
          <Link
            href="/en/about/"
            className="font-semibold underline"
            style={{ color: "var(--ba-accent)" }}
          >
            How the tests work — method, sources and limitations
          </Link>
        </p>

        <p className="mt-10 text-xs leading-relaxed text-gray-500">
          The tests are indicative self-insight tools — not medical or
          psychological assessment, and not to be used alone for hiring or
          other important decisions. IQ scores are shown as estimated bands
          only.
        </p>
      </main>

      <footer className="px-5 pb-8 text-center text-xs text-gray-400">
        © 2026 Brainarea
      </footer>
    </div>
  );
}