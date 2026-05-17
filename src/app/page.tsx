import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { sql, type Article } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { deriveExcerpt } from "@/lib/excerpt";
import { Icon } from "@/components/Icon";

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
  const path = page > 1 ? `/?page=${page}` : "/";
  const titleSuffix = page > 1 ? ` — Page ${page}` : "";
  return buildMetadata({
    title: `${site.name}${titleSuffix}`,
    description: site.description,
    path,
    type: "website",
  });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const skip = (page - 1) * PAGE_SIZE;

  type ArticleRow = Pick<Article, "id" | "slug" | "title" | "excerpt" | "content" | "coverImageUrl" | "coverImageAlt" | "publishedAt" | "readingTimeMinutes">;

  const [articles, [{ count }]] = await Promise.all([
    sql<ArticleRow[]>`
      SELECT id, slug, title, excerpt, content, cover_image_url, cover_image_alt,
             published_at, reading_time_minutes
      FROM articles WHERE status = 'published'
      ORDER BY published_at DESC
      LIMIT ${PAGE_SIZE} OFFSET ${skip}
    `,
    sql<{ count: string }[]>`SELECT COUNT(*)::text AS count FROM articles WHERE status = 'published'`,
  ]);
  const total = Number(count);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const [hero, ...rest] = articles;

  const websiteJsonLd =
    page === 1
      ? {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: site.name,
          url: site.url,
          description: site.description,
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: `${site.url}/search?q={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
          },
        }
      : null;

  return (
    <>
      {/* Masthead */}
      <header
        className="text-center"
        style={{
          padding: "56px 24px 40px",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <div className="kicker mb-3">
          {new Date().toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </div>
        <Link href="/" className="inline-block">
          <h1
            className="display"
            style={{
              fontSize: "clamp(44px, 7vw, 72px)",
              letterSpacing: "-0.03em",
              marginBottom: 12,
            }}
          >
            {site.name}
          </h1>
        </Link>
        <p
          style={{
            fontFamily: "var(--body)",
            fontStyle: "italic",
            color: "var(--ink-dim)",
            fontSize: 15,
            maxWidth: 460,
            margin: "0 auto",
          }}
        >
          {site.description}
        </p>
        <nav
          aria-label="Primary"
          className="flex justify-center flex-wrap"
          style={{
            marginTop: 28,
            gap: 28,
            fontFamily: "var(--ui)",
            fontSize: 12,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          <Link
            href="/"
            style={{
              color: "var(--ink)",
              fontWeight: 500,
              borderBottom: "1px solid var(--ink)",
              paddingBottom: 4,
            }}
          >
            All
          </Link>
          <Link
            href="/search"
            style={{ color: "var(--ink-dim)", paddingBottom: 4 }}
          >
            Search
          </Link>
          <a
            href="/rss.xml"
            style={{
              color: "var(--ink-dim)",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Icon name="rss" size={11} /> RSS
          </a>
          <Link
            href="/admin"
            style={{ color: "var(--ink-dim)", paddingBottom: 4 }}
          >
            Admin
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {articles.length === 0 ? (
          <section
            className="mx-auto"
            style={{ maxWidth: 680, padding: "80px 24px" }}
          >
            <p
              className="text-center"
              style={{
                fontFamily: "var(--body)",
                fontStyle: "italic",
                color: "var(--ink-dim)",
                fontSize: 18,
              }}
            >
              No published articles yet. Sign in to the admin and publish your
              first one.
            </p>
          </section>
        ) : (
          <>
            {/* Hero */}
            {hero ? (
              <section
                className="mx-auto"
                style={{
                  maxWidth: 1240,
                  padding: "56px 24px 0",
                }}
              >
                <article
                  className="grid items-center"
                  style={{
                    gap: 56,
                    gridTemplateColumns: hero.coverImageUrl
                      ? "1.1fr 1fr"
                      : "1fr",
                  }}
                >
                  {hero.coverImageUrl ? (
                    <Link
                      href={`/articles/${hero.slug}`}
                      className="block"
                      style={{ minWidth: 0 }}
                    >
                      <div
                        style={{
                          position: "relative",
                          width: "100%",
                          aspectRatio: "16/11",
                          background: "var(--paper-2)",
                          borderRadius: 4,
                          overflow: "hidden",
                        }}
                      >
                        <Image
                          src={hero.coverImageUrl}
                          alt={hero.coverImageAlt ?? ""}
                          fill
                          priority
                          sizes="(max-width: 768px) 100vw, 660px"
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                    </Link>
                  ) : null}
                  <div>
                    <div
                      className="flex items-center"
                      style={{ gap: 12, marginBottom: 14 }}
                    >
                      <span className="kicker">Featured</span>
                      {hero.publishedAt ? (
                        <span
                          style={{
                            fontFamily: "var(--ui)",
                            fontSize: 11,
                            color: "var(--ink-dim)",
                          }}
                        >
                          {formatDate(hero.publishedAt)}
                        </span>
                      ) : null}
                    </div>
                    <h2
                      className="display"
                      style={{
                        fontSize: "clamp(30px, 4vw, 44px)",
                        marginBottom: 16,
                      }}
                    >
                      <Link href={`/articles/${hero.slug}`}>{hero.title}</Link>
                    </h2>
                    <p
                      style={{
                        fontSize: 17,
                        color: "var(--ink-2)",
                        lineHeight: 1.55,
                        marginBottom: 20,
                      }}
                    >
                      {hero.excerpt ?? deriveExcerpt(hero.content, 200)}
                    </p>
                    <div className="flex items-center" style={{ gap: 16 }}>
                      <Link
                        href={`/articles/${hero.slug}`}
                        style={{
                          fontFamily: "var(--ui)",
                          fontSize: 13,
                          fontWeight: 500,
                          borderBottom: "1px solid var(--ink)",
                          paddingBottom: 2,
                        }}
                      >
                        Read the post
                      </Link>
                      <span className="chip">
                        <Icon name="clock" size={11} />{" "}
                        {hero.readingTimeMinutes} min
                      </span>
                    </div>
                  </div>
                </article>
              </section>
            ) : null}

            {/* Separator + grid */}
            {rest.length > 0 ? (
              <>
                <div
                  className="mx-auto"
                  style={{
                    maxWidth: 1240,
                    padding: "64px 24px 0",
                  }}
                >
                  <hr className="rule" />
                </div>
                <section
                  className="mx-auto"
                  style={{
                    maxWidth: 1240,
                    padding: "40px 24px 80px",
                  }}
                  aria-labelledby="more-heading"
                >
                  <div className="label" style={{ marginBottom: 20 }} id="more-heading">
                    More from {site.name}
                  </div>
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                      gap: 48,
                    }}
                  >
                    {rest.map((a) => {
                      const excerpt = a.excerpt ?? deriveExcerpt(a.content);
                      return (
                        <article key={a.id}>
                          <Link href={`/articles/${a.slug}`} className="block">
                            {a.coverImageUrl ? (
                              <div
                                style={{
                                  position: "relative",
                                  width: "100%",
                                  aspectRatio: "16/10",
                                  background: "var(--paper-2)",
                                  borderRadius: 4,
                                  overflow: "hidden",
                                  marginBottom: 18,
                                }}
                              >
                                <Image
                                  src={a.coverImageUrl}
                                  alt={a.coverImageAlt ?? ""}
                                  fill
                                  sizes="(max-width: 768px) 100vw, 380px"
                                  style={{ objectFit: "cover" }}
                                />
                              </div>
                            ) : null}
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
                            <h3
                              className="display"
                              style={{ fontSize: 28, marginBottom: 8 }}
                            >
                              {a.title}
                            </h3>
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
                          </Link>
                        </article>
                      );
                    })}
                  </div>

                  {totalPages > 1 ? (
                    <nav
                      aria-label="Pagination"
                      className="flex items-center justify-center"
                      style={{
                        marginTop: 64,
                        gap: 16,
                        fontFamily: "var(--ui)",
                        fontSize: 13,
                        color: "var(--ink-dim)",
                      }}
                    >
                      {page > 1 ? (
                        <Link
                          href={page === 2 ? "/" : `/?page=${page - 1}`}
                          rel="prev"
                          className="btn btn-ghost"
                          style={{ fontSize: 13 }}
                        >
                          ← Newer
                        </Link>
                      ) : (
                        <span
                          className="btn btn-ghost"
                          style={{ fontSize: 13, opacity: 0.4 }}
                        >
                          ← Newer
                        </span>
                      )}
                      <span>
                        Page {page} of {totalPages}
                      </span>
                      {page < totalPages ? (
                        <Link
                          href={`/?page=${page + 1}`}
                          rel="next"
                          className="btn btn-ghost"
                          style={{ fontSize: 13 }}
                        >
                          Older →
                        </Link>
                      ) : (
                        <span
                          className="btn btn-ghost"
                          style={{ fontSize: 13, opacity: 0.4 }}
                        >
                          Older →
                        </span>
                      )}
                    </nav>
                  ) : null}
                </section>
              </>
            ) : null}
          </>
        )}
      </main>

      <footer
        className="flex justify-between flex-wrap"
        style={{
          background: "var(--paper-2)",
          borderTop: "1px solid var(--rule)",
          padding: "32px 24px",
          fontFamily: "var(--ui)",
          fontSize: 12,
          color: "var(--ink-dim)",
          gap: 12,
        }}
      >
        <div>
          © {new Date().getFullYear()} {site.name}
        </div>
        <div className="flex" style={{ gap: 18 }}>
          <Link href="/search">Search</Link>
          <a href="/rss.xml">/rss.xml</a>
          <a href="/sitemap.xml">/sitemap.xml</a>
        </div>
      </footer>

      {websiteJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      ) : null}
    </>
  );
}
