import Link from "next/link";
import type { Metadata } from "next";
import { sql, type Article } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { deriveExcerpt } from "@/lib/excerpt";
import { ArrowUpRight } from "lucide-react";

export const metadata: Metadata = buildMetadata({
  title: "Search",
  description: `Search articles on ${site.name}.`,
  path: "/search",
  noindex: true,
});

type SearchParams = { q?: string };

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  type SearchRow = Pick<Article, "id" | "slug" | "title" | "excerpt" | "content" | "publishedAt" | "readingTimeMinutes">;
  const results = query
    ? await sql<SearchRow[]>`
        SELECT id, slug, title, excerpt, content, published_at, reading_time_minutes
        FROM articles
        WHERE status = 'published'
          AND (title ILIKE ${"%" + query + "%"} OR content ILIKE ${"%" + query + "%"})
        ORDER BY published_at DESC LIMIT 50
      `
    : [];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16 w-full">
      {/* Back nav */}
      <nav className="mb-10 sm:mb-14">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>←</span>
          <span>{site.name}</span>
        </Link>
      </nav>

      <header className="mb-8 sm:mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">Search</h1>
        <p className="text-sm text-muted-foreground">Find articles by title or content.</p>
      </header>

      <form method="get" role="search" className="mb-10">
        <label htmlFor="q" className="sr-only">Search articles</label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Search articles…"
          autoFocus
          className="w-full bg-muted border border-border rounded-md px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-border"
        />
      </form>

      <section aria-live="polite">
        {!query ? (
          <p className="text-sm text-muted-foreground italic">Type a query to search.</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No results for "{query}".</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-6">
              {results.length} result{results.length === 1 ? "" : "s"} for "{query}"
            </p>
            <div>
              {results.map((a) => {
                const excerpt = a.excerpt ?? deriveExcerpt(a.content, 140);
                return (
                  <article key={a.id} className="group py-4 border-b border-border/70 last:border-b-0">
                    <Link href={`/articles/${a.slug}`} className="block space-y-1">
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-sm sm:text-base font-medium text-foreground group-hover:underline">
                          {a.title}
                        </h2>
                        <ArrowUpRight className="size-3 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-all" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {a.publishedAt && (
                          <time dateTime={a.publishedAt.toISOString()}>{formatDate(a.publishedAt)}</time>
                        )}
                        <span aria-hidden="true">·</span>
                        <span>{a.readingTimeMinutes} min read</span>
                      </div>
                      {excerpt && (
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-0.5">
                          {excerpt}
                        </p>
                      )}
                    </Link>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
