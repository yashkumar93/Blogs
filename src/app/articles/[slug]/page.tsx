import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { sql, type Article } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { deriveExcerpt } from "@/lib/excerpt";
import { readingTimeISO } from "@/lib/reading-time";
import { ArticleBody } from "@/components/ArticleBody";
import { Icon } from "@/components/Icon";

type Params = { slug: string };

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<Params[]> {
  const articles = await sql<{ slug: string }[]>`
    SELECT slug FROM articles WHERE status = 'published'
    ORDER BY published_at DESC LIMIT 100
  `;
  return articles.map((a) => ({ slug: a.slug }));
}

async function findArticleOrRedirect(slug: string) {
  const [article] = await sql<Article[]>`
    SELECT * FROM articles WHERE slug = ${slug} AND status = 'published' LIMIT 1
  `;
  if (article) return article;

  const [moved] = await sql<{ toSlug: string }[]>`
    SELECT to_slug FROM redirects WHERE from_slug = ${slug} LIMIT 1
  `;
  if (moved) redirect(`/articles/${moved.toSlug}`);

  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await findArticleOrRedirect(slug);
  if (!article) {
    return buildMetadata({
      title: "Not found",
      description: "This article could not be found.",
      path: `/articles/${slug}`,
      noindex: true,
    });
  }

  const description =
    article.metaDescription ?? article.excerpt ?? deriveExcerpt(article.content);

  return buildMetadata({
    title: article.metaTitle ?? article.title,
    description,
    path: `/articles/${article.slug}`,
    image: article.coverImageUrl ?? undefined,
    type: "article",
    publishedTime: article.publishedAt?.toISOString(),
    modifiedTime: article.updatedAt.toISOString(),
  });
}

function formatLongDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const article = await findArticleOrRedirect(slug);
  if (!article) notFound();

  const description =
    article.metaDescription ?? article.excerpt ?? deriveExcerpt(article.content);
  const url = new URL(`/articles/${article.slug}`, site.url).toString();

  type RelatedRow = Pick<Article, "id" | "slug" | "title" | "coverImageUrl" | "coverImageAlt" | "readingTimeMinutes" | "publishedAt">;
  const related = await sql<RelatedRow[]>`
    SELECT id, slug, title, cover_image_url, cover_image_alt, reading_time_minutes, published_at
    FROM articles WHERE status = 'published' AND id != ${article.id}
    ORDER BY published_at DESC LIMIT 3
  `;

  const blogPostingJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description,
    image: article.coverImageUrl ? [article.coverImageUrl] : undefined,
    datePublished: article.publishedAt?.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    author: { "@type": "Person", name: site.defaultAuthor },
    publisher: { "@type": "Organization", name: site.name },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    timeRequired: readingTimeISO(article.readingTimeMinutes),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: site.url },
      {
        "@type": "ListItem",
        position: 2,
        name: article.title,
        item: url,
      },
    ],
  };

  return (
    <>
      {/* Mini masthead */}
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
        <nav
          aria-label="Primary"
          className="flex"
          style={{
            gap: 20,
            fontFamily: "var(--ui)",
            fontSize: 12,
            color: "var(--ink-dim)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          <Link href="/search">Search</Link>
          <a href="/rss.xml" aria-label="RSS">
            <Icon name="rss" size={11} />
          </a>
        </nav>
      </header>

      <article style={{ padding: "64px 0 96px" }}>
        {/* Article header */}
        <div
          className="mx-auto"
          style={{
            maxWidth: 880,
            padding: "0 32px",
            marginBottom: 48,
          }}
        >
          <div
            className="flex items-center flex-wrap"
            style={{
              gap: 14,
              marginBottom: 28,
              fontFamily: "var(--ui)",
              fontSize: 11.5,
              color: "var(--ink-dim)",
            }}
          >
            <Link
              href="/"
              className="flex items-center"
              style={{ gap: 5 }}
            >
              ← Back
            </Link>
            <span className="kicker" style={{ fontSize: 10 }}>
              Article
            </span>
          </div>
          <h1
            className="display"
            style={{
              fontSize: "clamp(38px, 5.5vw, 56px)",
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              marginBottom: 24,
            }}
          >
            {article.title}
          </h1>
          {article.excerpt || description ? (
            <p
              style={{
                fontFamily: "var(--body)",
                fontStyle: "italic",
                fontSize: "clamp(18px, 2vw, 21px)",
                lineHeight: 1.45,
                color: "var(--ink-2)",
                marginBottom: 32,
              }}
            >
              {article.excerpt ?? description}
            </p>
          ) : null}
          <div
            className="flex items-center flex-wrap"
            style={{
              gap: 16,
              fontFamily: "var(--ui)",
              fontSize: 12.5,
              color: "var(--ink-dim)",
            }}
          >
            <span>
              By{" "}
              <span style={{ color: "var(--ink-2)" }}>
                {site.defaultAuthor}
              </span>
            </span>
            {article.publishedAt ? (
              <span className="chip">
                <time dateTime={article.publishedAt.toISOString()}>
                  {formatLongDate(article.publishedAt)}
                </time>
              </span>
            ) : null}
            <span className="chip">
              <Icon name="clock" size={11} /> {article.readingTimeMinutes} min read
            </span>
          </div>
        </div>

        {/* Cover */}
        {article.coverImageUrl ? (
          <div
            className="mx-auto"
            style={{ maxWidth: 1080, padding: "0 32px" }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "16/9",
                borderRadius: 4,
                overflow: "hidden",
                background: "var(--paper-2)",
              }}
            >
              <Image
                src={article.coverImageUrl}
                alt={article.coverImageAlt ?? ""}
                fill
                priority
                sizes="(max-width: 1080px) 100vw, 1016px"
                style={{ objectFit: "cover" }}
              />
            </div>
          </div>
        ) : null}

        {/* Body */}
        <div
          className="mx-auto"
          style={{
            maxWidth: 680,
            padding: "0 32px",
            marginTop: 56,
          }}
        >
          <ArticleBody content={article.content} />

          <hr className="rule" style={{ margin: "3em 0 1.4em" }} />
          <p
            style={{
              fontFamily: "var(--ui)",
              fontSize: 13,
              color: "var(--ink-dim)",
            }}
          >
            Published{" "}
            {article.publishedAt
              ? formatLongDate(article.publishedAt)
              : "in draft"}{" "}
            at {site.url}/articles/{article.slug}.
          </p>
        </div>
      </article>

      {/* Related */}
      {related.length > 0 ? (
        <section
          style={{
            borderTop: "1px solid var(--rule)",
            padding: "64px 32px 96px",
            background: "var(--paper-2)",
          }}
        >
          <div className="mx-auto" style={{ maxWidth: 1080 }}>
            <div className="label" style={{ marginBottom: 24 }}>
              Keep reading
            </div>
            <div
              className="grid"
              style={{
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 32,
              }}
            >
              {related.map((a) => (
                <Link
                  key={a.id}
                  href={`/articles/${a.slug}`}
                  className="block"
                >
                  {a.coverImageUrl ? (
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        aspectRatio: "16/10",
                        background: "var(--paper)",
                        borderRadius: 4,
                        overflow: "hidden",
                        marginBottom: 14,
                      }}
                    >
                      <Image
                        src={a.coverImageUrl}
                        alt={a.coverImageAlt ?? ""}
                        fill
                        sizes="(max-width: 768px) 100vw, 340px"
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                  ) : null}
                  <div style={{ paddingTop: a.coverImageUrl ? 0 : 14 }}>
                    <span className="kicker" style={{ fontSize: 10 }}>
                      Article
                    </span>
                    <h4
                      className="display"
                      style={{
                        fontSize: 20,
                        marginTop: 6,
                        marginBottom: 6,
                        lineHeight: 1.15,
                      }}
                    >
                      {a.title}
                    </h4>
                    <div
                      style={{
                        fontFamily: "var(--ui)",
                        fontSize: 11.5,
                        color: "var(--ink-dim)",
                      }}
                    >
                      {a.readingTimeMinutes} min read
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <footer
        className="flex justify-between flex-wrap"
        style={{
          padding: "32px",
          fontFamily: "var(--ui)",
          fontSize: 12,
          color: "var(--ink-dim)",
          background: "var(--paper-2)",
          borderTop: "1px solid var(--rule)",
          gap: 12,
        }}
      >
        <div>
          © {new Date().getFullYear()} {site.name}
        </div>
        <div className="flex" style={{ gap: 18 }}>
          <a href="/rss.xml">/rss.xml</a>
          <a href="/sitemap.xml">/sitemap.xml</a>
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </>
  );
}
