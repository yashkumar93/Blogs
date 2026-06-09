import Link from "next/link";
import { sql, type Article } from "@/lib/db";
import { Icon } from "@/components/Icon";

type SearchParams = {
  status?: string;
  q?: string;
};

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { status, q } = await searchParams;
  const statusFilter =
    status === "draft" || status === "published" ? status : undefined;
  const query = q?.trim() ?? "";

  type ArticleRow = Pick<Article, "id" | "title" | "slug" | "status" | "updatedAt" | "publishedAt" | "readingTimeMinutes">;
  type CountRow = { status: string; count: string };

  const [articles, counts] = await Promise.all([
    sql<ArticleRow[]>`
      SELECT id, title, slug, status, updated_at, published_at, reading_time_minutes
      FROM articles
      WHERE TRUE
        ${statusFilter ? sql`AND status = ${statusFilter}` : sql``}
        ${query ? sql`AND title ILIKE ${"%" + query + "%"}` : sql``}
      ORDER BY updated_at DESC
    `,
    sql<CountRow[]>`SELECT status, COUNT(*)::text AS count FROM articles GROUP BY status`,
  ]);

  const allCount = counts.reduce((sum, c) => sum + Number(c.count), 0);
  const publishedCount = Number(counts.find((c) => c.status === "published")?.count ?? 0);
  const draftCount = Number(counts.find((c) => c.status === "draft")?.count ?? 0);

  const formatDate = (d: Date | null) =>
    d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";

  const filters: Array<{ key: "all" | "published" | "draft"; label: string }> =
    [
      { key: "all", label: `All · ${allCount}` },
      { key: "published", label: `Published · ${publishedCount}` },
      { key: "draft", label: `Drafts · ${draftCount}` },
    ];
  const activeFilter = (statusFilter ?? "all") as "all" | "published" | "draft";

  function filterHref(k: "all" | "published" | "draft") {
    const params = new URLSearchParams();
    if (k !== "all") params.set("status", k);
    if (query) params.set("q", query);
    const qs = params.toString();
    return qs ? `/admin?${qs}` : "/admin";
  }

  const stats = [
    { label: "All articles", value: allCount },
    { label: "Published", value: publishedCount },
    { label: "Drafts", value: draftCount },
  ];

  return (
    <>
      <div className="admin-content">
        <div className="admin-dashboard">
          <section className="admin-dashboard-hero">
            <div className="admin-dashboard-hero-grid">
              <div>
                <div className="admin-kicker">Writing desk</div>
                <h1 className="admin-dashboard-title">Articles</h1>
                <p className="admin-dashboard-copy">
                  A quieter, editorial workspace for drafts, published pieces,
                  and quick edits that feels closer to the public site.
                </p>
              </div>

              <div>
                <div className="admin-hero-actions">
                  <Link href="/admin/articles/new" className="btn btn-primary">
                    <Icon name="plus" size={14} /> New article
                  </Link>
                </div>
                <div className="admin-stats" aria-label="Article stats">
                  {stats.map((stat) => (
                    <div key={stat.label} className="admin-stat">
                      <div className="admin-stat-value">{stat.value}</div>
                      <div className="admin-stat-label">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="admin-toolbar">
            <div className="admin-filter-group" role="tablist" aria-label="Filter articles">
              {filters.map((f) => {
                const isActive = activeFilter === f.key;
                return (
                  <Link
                    key={f.key}
                    href={filterHref(f.key)}
                    className={`admin-filter-link${isActive ? " active" : ""}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {f.label}
                  </Link>
                );
              })}
            </div>

            <form method="get" className="admin-search">
              {statusFilter ? (
                <input type="hidden" name="status" value={statusFilter} />
              ) : null}
              <span className="admin-search-icon">
                <Icon name="search" size={13} />
              </span>
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search titles"
                className="admin-search-input"
                aria-label="Search titles"
              />
            </form>
          </div>

          <div className="admin-article-list">
            {articles.length === 0 ? (
              <div className="admin-empty-state">
                <div className="title">No articles match your filter.</div>
                <p>Try a different search or create a fresh draft.</p>
              </div>
            ) : (
              articles.map((a) => (
                <article key={a.id} className="admin-article-row">
                  <div>
                    <Link href={`/admin/articles/${a.id}/edit`} className="admin-article-link">
                      <div className="admin-article-title">{a.title}</div>
                    </Link>
                    <div className="admin-article-meta">
                      <span>/{a.slug}</span>
                      <span aria-hidden="true">·</span>
                      <span>{a.readingTimeMinutes} min read</span>
                    </div>
                  </div>

                  <div className="admin-article-side">
                    <span className={`status-pill ${a.status}`}>{a.status}</span>
                    <div className="admin-article-meta" style={{ marginTop: 0 }}>
                      <span>
                        {a.publishedAt
                          ? formatDate(a.publishedAt)
                          : `Draft · ${formatDate(a.updatedAt)}`}
                      </span>
                    </div>
                    <div className="admin-article-actions">
                      <Link
                        href={`/admin/articles/${a.id}/edit`}
                        className="admin-icon-btn"
                        title="Edit"
                        aria-label={`Edit ${a.title}`}
                      >
                        <Icon name="edit" size={14} />
                      </Link>
                      {a.status === "published" ? (
                        <Link
                          href={`/articles/${a.slug}`}
                          target="_blank"
                          rel="noopener"
                          className="admin-icon-btn"
                          title="View"
                          aria-label={`View ${a.title}`}
                        >
                          <Icon name="eye" size={14} />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
