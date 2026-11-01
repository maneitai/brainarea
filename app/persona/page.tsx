import Link from "next/link";

export const metadata = { title: "PERSONA — personlighetstest" };

export default function PersonaPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold" style={{ color: "var(--ba-accent)" }}>
        <Link href="/">← Brainarea</Link>
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">PERSONA</h1>
      <p className="mt-3 leading-relaxed text-gray-600">
        Personlighetstest basert på Big Five: åpenhet, planmessighet,
        utadvendthet, omgjengelighet og følelsesmessig stabilitet. 60 utsagn,
        ca. 10 minutter.
      </p>
      <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
        Under bygging. Testflyten lanseres sammen med resten av grunnflaten.
      </p>
    </main>
  );
}
