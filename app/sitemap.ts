import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const SITE = "https://maneitai.github.io/brainarea";

const paths = [
  "",
  "/persona/",
  "/evne/",
  "/relasjoner/",
  "/play/",
  "/om-testene/",
  "/personvern/",
  "/en/",
  "/en/persona/",
  "/en/evne/",
  "/en/relasjoner/",
  "/en/play/",
  "/en/about/",
  "/en/privacy/",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return paths.map((p) => ({
    url: `${SITE}${p}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: p === "" ? 1 : p.startsWith("/en") ? 0.8 : 0.9,
  }));
}