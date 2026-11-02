"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function normalize(p: string) {
  return p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
}

export function SiteHeader({ locale }: { locale?: "no" | "en" }) {
  const pathname = normalize(usePathname() ?? "/");
  const derived =
    pathname === "/en" || pathname.startsWith("/en/") ? "en" : "no";
  const active = locale ?? derived;
  const isEn = active === "en";
  const rest = isEn && pathname.startsWith("/en")
    ? pathname.slice(3) || "/"
    : pathname;

  return (
    <header className="flex items-center justify-between px-5 pt-6 pb-2 sm:px-8">
      <Link href="/" className="text-lg font-extrabold tracking-tight">
        Brainarea
      </Link>
      <nav className="flex gap-1 text-sm" aria-label="Språkvelger">
        {isEn ? (
          <Link
            href={rest}
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
            href={`/en${rest === "/" ? "/" : rest}`}
            className="rounded-full px-3 py-1.5 text-gray-400 transition hover:text-gray-600"
          >
            EN
          </Link>
        )}
      </nav>
    </header>
  );
}