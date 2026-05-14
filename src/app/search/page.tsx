import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { deriveExcerpt } from "@/lib/excerpt";

export const metadata: Metadata = buildMetadata({
  title: "Search",
  description: `Search articles on ${site.name}.`,
  path: "/search",
  noindex: true,
});

type SearchParams = { q?: string };

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const results = query
    ? await prisma.article.findMany({
        where: {
          status: "published",
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { content: { contains: query, mode: "insensitive" } },
          ],
        },
        orderBy: { publishedAt: "desc" },
        take: 50,
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          content: true,
          publishedAt: true,
          readingTimeMinutes: true,
        },
      })
    : [];

  return (
    <>
      <header
        className="flex items-center justify-between"
        style={{
          padding: "20px 32px",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: "var(--display)",
            fontSize: 22,
            letterSpacing: "-0.02em",
          }}
        >
          {site.name}
        </Link>
        <Link
          href="/"
          style={{
            fontFamily: "var(--ui)",
            fontSize: 12,
            color: "var(--ink-dim)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          ← All articles
        </Link>
      </header>

      <main
        className="flex-1 mx-auto"
        style={{ maxWidth: 760, padding: "56px 32px 80px", width: "100%" }}
      >
        <div className="kicker" style={{ marginBottom: 12 }}>
          Search
        </div>
        <h1
          className="display"
          style={{ fontSize: 44, letterSpacing: "-0.025em", marginBottom: 24 }}
        >
          Find a post.
        </h1>

        <form method="get" role="search">
          <label htmlFor="q" className="sr-only">
            Search articles
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Search articles…"
            autoFocus
            style={{
              width: "100%",
              fontFamily: "var(--ui)",
              fontSize: 15,
              padding: "12px 14px",
              background: "var(--card)",
              border: "1px solid var(--rule)",
              borderRadius: 4,
              color: "var(--ink)",
              outline: "none",
            }}
          />
        </form>

        <section
          style={{ marginTop: 40 }}
          aria-live="polite"
        >
          {!query ? (
            <p
              style={{
                fontFamily: "var(--body)",
                fontStyle: "italic",
                color: "var(--ink-dim)",
              }}
            >
              Type a query to search.
            </p>
          ) : results.length === 0 ? (
            <p
              style={{
                fontFamily: "var(--body)",
                fontStyle: "italic",
                color: "var(--ink-dim)",
              }}
            >
              No results for “{query}”.
            </p>
          ) : (
            <>
              <p
                style={{
                  fontFamily: "var(--ui)",
                  fontSize: 12,
                  color: "var(--ink-dim)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  marginBottom: 24,
                }}
              >
                {results.length} result{results.length === 1 ? "" : "s"} for “
                {query}”
              </p>
              <ul
                style={{
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 28,
                }}
              >
                {results.map((a) => {
                  const excerpt = a.excerpt ?? deriveExcerpt(a.content);
                  return (
                    <li
                      key={a.id}
                      style={{
                        paddingBottom: 28,
                        borderBottom: "1px solid var(--rule-soft)",
                      }}
                    >
                      <article>
                        <h2
                          className="display"
                          style={{ fontSize: 24, marginBottom: 8 }}
                        >
                          <Link href={`/articles/${a.slug}`}>{a.title}</Link>
                        </h2>
                        <div
                          className="flex items-center"
                          style={{
                            gap: 10,
                            marginBottom: 8,
                            fontFamily: "var(--ui)",
                            fontSize: 11,
                            color: "var(--ink-dim)",
                          }}
                        >
                          {a.publishedAt ? (
                            <time dateTime={a.publishedAt.toISOString()}>
                              {formatDate(a.publishedAt)}
                            </time>
                          ) : null}
                          <span aria-hidden="true">·</span>
                          <span>{a.readingTimeMinutes} min read</span>
                        </div>
                        {excerpt ? (
                          <p
                            style={{
                              fontSize: 15,
                              color: "var(--ink-2)",
                              lineHeight: 1.55,
                            }}
                          >
                            {excerpt}
                          </p>
                        ) : null}
                      </article>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      </main>
    </>
  );
}
