import Link from "next/link";

export const metadata = { title: "IQ-/evnetest" };

export default function EvnePage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold" style={{ color: "var(--ba-accent)" }}>
        <Link href="/">← Brainarea</Link>
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">IQ-/evnetest</h1>
      <p className="mt-3 leading-relaxed text-gray-600">
        Kognitiv profil over logikk, mønstre, hukommelse og verbal resonnering.
        Resultatet vises som estimatbånd — ikke som normert IQ, og ikke som en
        godkjent Mensa-test.
      </p>
      <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
        Under bygging. Itembanker og scoring bygges som egen fase.
      </p>
    </main>
  );
}
