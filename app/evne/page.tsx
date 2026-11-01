import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "IQ-/evnetest" };

export default function EvnePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-6 pb-16 sm:px-8">
        <p className="text-sm font-semibold">
          <Link href="/">← Til forsiden</Link>
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
          IQ-/evnetest
        </h1>
        <p className="mt-3 leading-relaxed text-gray-600">
          Kognitiv profil over logikk, mønstregjenkjenning, arbeidshukommelse
          og verbal resonnering. Resultatet vises som estimatbånd — ikke som
          normert IQ, og ikke som en godkjent Mensa-test.
        </p>
        <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          Under bygging. Itembanker (temabanker med tilfeldig uttrekk) og
          scoring bygges som egen fase.
        </p>
      </main>
    </div>
  );
}