import type { MetadataRoute } from "next";
import { desc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export const dynamic = "force-dynamic";

const BASE = "https://carreras.strydpanama.com";

type SitemapEntry = MetadataRoute.Sitemap[number];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = getDb();

  const races = await db
    .select({ slug: schema.races.slug, status: schema.races.status, updatedAt: schema.races.updatedAt })
    .from(schema.races)
    .orderBy(desc(schema.races.date))
    .all();

  const statics: SitemapEntry[] = [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/carreras`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/resultados`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/terminos`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const entries: SitemapEntry[] = races.map((r) => ({
    url: `${BASE}/carrera/${r.slug}`,
    lastModified: r.updatedAt,
    changeFrequency: r.status === "accepting" ? ("daily" as const) : ("weekly" as const),
    priority: r.status === "accepting" ? 0.9 : 0.6,
  }));

  const resultsPages: SitemapEntry[] = races
    .filter((r) => r.status === "finished" || r.status === "active")
    .map((r) => ({
      url: `${BASE}/resultados/${r.slug}`,
      lastModified: r.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  return [...statics, ...entries, ...resultsPages];
}
