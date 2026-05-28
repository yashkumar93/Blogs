import Link from "next/link";
import type { Metadata } from "next";
import { sql, type Article } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { deriveExcerpt } from "@/lib/excerpt";
import { BlurFade } from "@/components/BlurFade";
import { ArrowUpRight } from "lucide-react";

const PAGE_SIZE = 10;

export const revalidate = 60;

type SearchParams = { page?: string };

function parsePage(value: string | undefined): number {
  return Math.max(1, Number.parseInt(value ?? "1", 10) || 1);
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const path = page > 1 ? `/blog?page=${page}` : "/blog";
  const titleSuffix = page > 1 ? ` — Page ${page}` : "";
  return buildMetadata({
    title: `${site.name}${titleSuffix}`,
    description: site.description,
    path,
    type: "website",
  });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const skip = (page - 1) * PAGE_SIZE;

  type ArticleRow = Pick<Article, "id" | "slug" | "title" | "excerpt" | "content" | "publishedAt" | "readingTimeMinutes">;

  const [articles, [{ count }]] = await Promise.all([
    sql<ArticleRow[]>`
      SELECT id, slug, title, excerpt, content, published_at, reading_time_minutes
      FROM articles WHERE status = 'published'
      ORDER BY published_at DESC
      LIMIT ${PAGE_SIZE} OFFSET ${skip}
    `,
    sql<{ count: string }[]>`SELECT COUNT(*)::text AS count FROM articles WHERE status = 'published'`,
  ]);
  const total = Number(count);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const websiteJsonLd = page === 1 ? {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: site.url,
    description: site.description,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${site.url}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  } : null;

  return (
    <>
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24 w-full">
        {/* Header */}
        <BlurFade>
          <header className="mb-12 sm:mb-16">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-3">
              {site.name}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mb-8">
              {site.description}
            </p>
            <nav className="flex items-center gap-5 text-xs sm:text-sm text-muted-foreground" aria-label="Primary">
              <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
              <Link href="/blog" className="text-foreground font-medium">Writing</Link>
              <Link href="/search" className="hover:text-foreground transition-colors">Search</Link>
              <a href="/rss.xml" className="hover:text-foreground transition-colors">RSS</a>
              <Link href="/admin" className="hover:text-foreground transition-colors">Admin</Link>
            </nav>
          </header>
        </BlurFade>

        {/* Writing section */}
        <section>
          <BlurFade delay={0.1}>
            <div className="mb-6 sm:mb-8">
              <h2 className="text-base sm:text-lg font-semibold text-foreground mb-2">Writing</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Notes, essays, and thoughts.</p>
            </div>
          </BlurFade>

          {articles.length === 0 ? (
            <BlurFade delay={0.15}>
              <p className="text-sm text-muted-foreground italic py-8">
                No published articles yet.
              </p>
            </BlurFade>
          ) : (
            <div>
              {articles.map((a, i) => {
                const excerpt = a.excerpt ?? deriveExcerpt(a.content, 120);
                return (
                  <BlurFade key={a.id} delay={0.15 + i * 0.04}>
                    <article className="group py-4 border-b border-border/70 last:border-b-0">
                      <Link href={`/articles/${a.slug}`} className="block space-y-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <h3 className="text-sm sm:text-base font-medium text-foreground group-hover:underline truncate">
                              {a.title}
                            </h3>
                            <ArrowUpRight className="size-3 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                          </div>
                          {a.publishedAt && (
                            <time
                              dateTime={a.publishedAt.toISOString()}
                              className="text-[10px] sm:text-xs text-muted-foreground shrink-0 pt-0.5"
                            >
                              {formatDate(a.publishedAt)}
                            </time>
                          )}
                        </div>
                        {excerpt && (
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-0.5">
                            {excerpt}
                          </p>
                        )}
                      </Link>
                    </article>
                  </BlurFade>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <BlurFade delay={0.3}>
              <nav
                aria-label="Pagination"
                className="flex items-center justify-between mt-10 text-xs sm:text-sm text-muted-foreground"
              >
                {page > 1 ? (
                  <Link href={page === 2 ? "/blog" : `/blog?page=${page - 1}`} className="hover:text-foreground transition-colors">
                    ← Previous
                  </Link>
                ) : <span />}
                <span className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages ? (
                  <Link href={`/blog?page=${page + 1}`} className="hover:text-foreground transition-colors">
                    Next →
                  </Link>
                ) : <span />}
              </nav>
            </BlurFade>
          )}
        </section>
      </main>

      <footer className="border-t border-border/50 mt-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} {site.name}</span>
          <div className="flex gap-4">
            <a href="/rss.xml" className="hover:text-foreground transition-colors">/rss.xml</a>
            <a href="/sitemap.xml" className="hover:text-foreground transition-colors">/sitemap.xml</a>
          </div>
        </div>
      </footer>

      {websiteJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      )}
    </>
  );
}
