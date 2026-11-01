import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between px-5 pt-6 pb-2 sm:px-8">
      <Link href="/" className="text-lg font-extrabold tracking-tight">
        Brainarea
      </Link>
      <nav className="flex gap-1 text-sm" aria-label="Språkvelger">
        <span
          className="rounded-full px-3 py-1.5 font-semibold text-white"
          style={{ background: "var(--ba-accent)" }}
        >
          NO
        </span>
        <span className="rounded-full px-3 py-1.5 text-gray-400">EN</span>
      </nav>
    </header>
  );
}