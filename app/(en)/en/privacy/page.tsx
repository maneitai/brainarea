import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Privacy statement" };

export default function EnPrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale="en" />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-6 pb-16 sm:px-8">
        <p className="text-sm font-semibold">
          <Link href="/en/">← Back to home</Link>
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
          Privacy statement
        </h1>
        <p className="mt-3 leading-relaxed text-gray-600">
          Short version: your tests happen in your browser. We do not receive
          your answers, we do not store them, and we cannot see them.
        </p>

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold">What data is processed</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Test logic — item selection, scoring and results — runs locally in
            your browser. No test data is sent to us or to third parties. No
            user account is created, and we set no tracking cookies to run the
            tests. The only local storage is a timestamp for the IQ test's
            retest rule (ten days), kept in your browser's own storage on your
            device and removable at any time by clearing browser data.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold">If accounts are introduced</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            If accounts and saved results arrive in the future, this document
            will be updated with purpose, legal basis, retention and your
            rights before anything is activated.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold">Advertising and third parties</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            The site is advertising-funded. When ads are activated, they are
            served by Google AdSense, which may use cookies and similar
            technology to display and measure ads. Google's privacy policy is
            at{" "}
            <a
              className="font-semibold underline"
              style={{ color: "var(--ba-accent)" }}
              href="https://policies.google.com/privacy"
            >
              policies.google.com/privacy
            </a>
            , and you can opt out of personalized advertising in Google's ad
            settings. This text will be updated before advertising is
            activated.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold">Responsible party</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Brainarea is a private website. The responsible publisher is
            reached at{" "}
            <a className="font-semibold underline" style={{ color: "var(--ba-accent)" }} href="mailto:manieten@pm.me">
              manieten@pm.me
            </a>
            . If cookies requiring consent are used, a consent tool will be
            installed and this document will describe your choices in detail.
          </p>
        </section>

        <p className="mt-8 text-xs leading-relaxed text-gray-500">
          Last updated: November 2026
        </p>
      </main>
    </div>
  );
}