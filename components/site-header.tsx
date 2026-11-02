"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function normalize(p: string) {
  return p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
}

// Slugs that differ between locales (everything else mirrors directly).
const NO_TO_EN: Record<string, string> = {
  "/om-testene": "/about",
  "/personvern": "/privacy",
};
const EN_TO_NO: Record<string, string> = {
  "/about": "/om-testene",
  "/privacy": "/personvern",
};

export function SiteHeader({ locale }: { locale?: "no" | "en" }) {
  const pathname = normalize(usePathname() ?? "/");
  const derived =
    pathname === "/en" || pathname.startsWith("/en/") ? "en" : "no";
  const active = locale ?? derived;
  const isEn = active === "en";
  const rest = isEn && pathname.startsWith("/en")
    ? pathname.slice(3) || "/"
    : pathname;
  const enTarget = NO_TO_EN[rest] ?? rest;

  return (
    <header className="flex items-center justify-between px-5 pt-6 pb-2 sm:px-8">
      <Link href="/" className="text-lg font-extrabold tracking-tight">
        Brainarea
      </Link>
      <nav className="flex gap-1 text-sm" aria-label={isEn ? "Language switcher" : "Språkvelger"}>
        {isEn ? (
          <Link
            href={EN_TO_NO[rest] ?? rest}
            className="rounded-full px-3 py-1.5 text-gray-400 transition hover:text-gray-600"
          >
            NO
          </Link>
        ) : (
          <span
            className="rounded-full px-3 py-1.5 font-semibold text-white"
            style={{ background: "var(--ba-accent)" }}
          >
            NO
          </span>
        )}
        {isEn ? (
          <span
            className="rounded-full px-3 py-1.5 font-semibold text-white"
            style={{ background: "var(--ba-accent)" }}
          >
            EN
          </span>
        ) : (
          <Link
            href={`/en${enTarget === "/" ? "/" : enTarget}`}
            className="rounded-full px-3 py-1.5 text-gray-400 transition hover:text-gray-600"
          >
            EN
          </Link>
        )}
      </nav>
    </header>
  );
}
