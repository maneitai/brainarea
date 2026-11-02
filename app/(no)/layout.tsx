import type { Metadata, Viewport } from "next";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://maneitai.github.io/brainarea"),
  title: {
    default: "Brainarea — test deg selv, gratis og ærlig",
    template: "%s | Brainarea",
  },
  description:
    "Gratis tester av personlighet, evner og relasjoner. Svarene dine blir i nettleseren din — ingen konto, ingenting sendes.",
  alternates: {
    canonical: "/",
    languages: { en: "/en", "nb-NO": "/" },
  },
  openGraph: {
    type: "website",
    siteName: "Brainarea",
    locale: "nb_NO",
    alternateLocale: ["en_US"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4f46e5",
};

export default function NoRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="no">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}