import type { Metadata, Viewport } from "next";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://maneitai.github.io/brainarea"),
  title: {
    default: "Brainarea — test yourself, free and honest",
    template: "%s | Brainarea",
  },
  description:
    "Free tests of personality, abilities and relationships. Your answers stay in your browser — no account, nothing sent.",
  alternates: {
    canonical: "/en",
    languages: { en: "/en", "nb-NO": "/" },
  },
  openGraph: {
    type: "website",
    siteName: "Brainarea",
    locale: "en_US",
    alternateLocale: ["nb_NO"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#101623",
};

export default function EnRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}