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
import { ScrollProgress } from "@/components/ScrollProgress";
import { BlurFade } from "@/components/BlurFade";

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
      <ScrollProgress />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16 w-full">
        {/* Back nav */}
        <BlurFade>
          <nav className="mb-10 sm:mb-14">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>←</span>
              <span>{site.name}</span>
            </Link>
          </nav>
        </BlurFade>

        <article>
          {/* Article header */}
          <BlurFade delay={0.05}>
            <header className="mb-8 sm:mb-10">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-4 leading-tight">
                {article.title}
              </h1>
              {(article.excerpt || description) && (
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-5">
                  {article.excerpt ?? description}
                </p>
              )}
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-muted-foreground">
                {article.publishedAt && (
                  <time dateTime={article.publishedAt.toISOString()}>
                    {formatLongDate(article.publishedAt)}
                  </time>
                )}
                <span aria-hidden="true">·</span>
                <span>{article.readingTimeMinutes} min read</span>
                <span aria-hidden="true">·</span>
                <span>By {site.defaultAuthor}</span>
              </div>
            </header>
          </BlurFade>

          {/* Cover image */}
          {article.coverImageUrl && (
            <BlurFade delay={0.1}>
              <div className="mb-10 sm:mb-12 rounded-lg overflow-hidden border border-border/50" style={{ aspectRatio: "16/9", position: "relative", width: "100%" }}>
                <Image
                  src={article.coverImageUrl}
                  alt={article.coverImageAlt ?? ""}
                  fill
                  priority
                  sizes="(max-width: 672px) 100vw, 672px"
                  style={{ objectFit: "cover" }}
                />
              </div>
            </BlurFade>
          )}

          <hr className="border-border mb-8 sm:mb-10" />

          {/* Body */}
          <BlurFade delay={0.12}>
            <ArticleBody content={article.content} />
          </BlurFade>

          <hr className="border-border mt-12 mb-6" />
          <p className="text-xs text-muted-foreground">
            Published {article.publishedAt ? formatLongDate(article.publishedAt) : "in draft"} ·{" "}
            <a href={`/articles/${article.slug}`} className="hover:text-foreground transition-colors">
              {site.url}/articles/{article.slug}
            </a>
          </p>
        </article>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="border-t border-border/50 py-12 sm:py-16">
          <div className="max-w-2xl mx-auto px-4 sm:px-6">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-6">
              Keep reading
            </h2>
            <div>
              {related.map((a) => (
                <article key={a.id} className="group py-4 border-b border-border/70 last:border-b-0">
                  <Link href={`/articles/${a.slug}`} className="flex items-center justify-between gap-3">
                    <h3 className="text-sm sm:text-base font-medium text-foreground group-hover:underline">
                      {a.title}
                    </h3>
                    <span className="text-xs text-muted-foreground shrink-0">{a.readingTimeMinutes} min</span>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="border-t border-border/50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} {site.name}</span>
          <div className="flex gap-4">
            <a href="/rss.xml" className="hover:text-foreground transition-colors">/rss.xml</a>
            <a href="/sitemap.xml" className="hover:text-foreground transition-colors">/sitemap.xml</a>
          </div>
        </div>
      </footer>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
    </>
  );
}
