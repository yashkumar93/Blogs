import type { MetadataRoute } from "next";
import { sql } from "@/lib/db";
import { site } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await sql<{ slug: string; updatedAt: Date; publishedAt: Date | null }[]>`
    SELECT slug, updated_at, published_at
    FROM articles WHERE status = 'published'
    ORDER BY published_at DESC
  `;

  const articleEntries: MetadataRoute.Sitemap = articles.map((a) => ({
    url: new URL(`/articles/${a.slug}`, site.url).toString(),
    lastModified: a.updatedAt,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [
    {
      url: site.url,
      lastModified: articles[0]?.updatedAt ?? new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...articleEntries,
  ];
}
