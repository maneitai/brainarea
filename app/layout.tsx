import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Brainarea — test deg selv",
    template: "%s | Brainarea",
  },
  description:
    "Gratis tester av personlighet, evner og relasjoner. Resultatet blir i nettleseren din.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
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
