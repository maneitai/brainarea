import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "About the tests — method, sources and limits" };

export default function EnAboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale="en" />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-6 pb-16 sm:px-8">
        <p className="text-sm font-semibold">
          <Link href="/en/">← Back to home</Link>
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
          About the tests
        </h1>
        <p className="mt-3 leading-relaxed text-gray-600">
          This page explains how the Brainarea tests are built, what they are
          based on, and — just as important — what they are not.
        </p>

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold">How the tests work</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Every test runs in your browser. Answers are never sent anywhere,
            nothing is stored, and no account is needed. Questions are drawn
            randomly from fixed banks at each start — you rarely get the exact
            same run twice. Short tests show per-dimension averages; the IQ
            test shows an estimated ability band computed from subtest
            percentages.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold">What the personality test is based on</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            PERSONA uses the IPIP Big-Five factor markers (Goldberg, 1992) — 50
            statements, ten per dimension: extraversion, agreeableness,
            conscientiousness, emotional stability and openness to experience.
            IPIP is a public-domain research instrument used across modern
            personality research. Source:{" "}
            <a className="font-semibold underline" style={{ color: "var(--ba-accent)" }} href="https://ipip.ori.org/">
              ipip.ori.org
            </a>
            .
          </p>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            We deliberately chose not to use MBTI or 16-type models, because
            they split continuous personality traits into either-or categories
            the research does not support.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold">How the IQ test is built</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            The cognitive profile has four subtests: number series (reasoning
            over arithmetic rules), figure patterns (visual rule detection),
            verbal reasoning (word knowledge and analogies), and working memory
            (memory span). Questions are generated parametrically from
            rule-based templates with randomized values — fresh equivalent
            items every run, which protects against memorization.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Scores are only shown as broad estimated bands (approx. 70–85,
            85–100, 100–115, 115–130+). The bands are deliberately wide and are{" "}
            <strong>not validated</strong> against a norming group. This is not
            a normed IQ test and not an approved Mensa test. A legitimate
            «normed IQ» claim requires a professional instrument administered by
            a qualified professional — and we would also need to collect real
            score data from many users over time before such a scale could be
            defended.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold">What the tests are not</h2>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-gray-600">
            <li>• Not medical or psychological assessments.</li>
            <li>• Not suitable as the sole basis for hiring or other important decisions.</li>
            <li>• Not normed against the population — no percentiles are compared to others.</li>
            <li>• Not psychometrically validated translations or norms.</li>
          </ul>
        </section>

        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold">Privacy</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Test logic runs locally in your browser. We do not receive, store
            or see your answers. We do not use tracking cookies for scoring,
            and no registration is required. When advertising is activated,
            this text will be updated with who serves the ads and what choices
            you have.
          </p>
        </section>

        <p className="mt-8 text-xs leading-relaxed text-gray-500">
          Brainarea is an indicative self-insight tool for general interest and
          entertainment. Contact: manieten@pm.me
        </p>
      </main>
    </div>
  );
}