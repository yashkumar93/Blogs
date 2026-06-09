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

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>Articles</h1>
          <div className="meta">
            {articles.length} of {allCount}
          </div>
        </div>
        <Link href="/admin/articles/new" className="btn btn-primary">
          <Icon name="plus" size={14} /> New article
        </Link>
      </div>

      <div className="admin-content">
        {/* Toolbar */}
        <div
          className="flex items-center justify-between flex-wrap"
          style={{ gap: 16, marginBottom: 20 }}
        >
          <div
            className="flex"
            style={{
              gap: 2,
              background: "var(--paper-2)",
              padding: 3,
              borderRadius: 4,
              fontFamily: "var(--ui)",
              fontSize: 12.5,
            }}
          >
            {filters.map((f) => {
              const isActive = activeFilter === f.key;
              return (
                <Link
                  key={f.key}
                  href={filterHref(f.key)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 3,
                    background: isActive ? "var(--accent-soft)" : "transparent",
                    color: isActive ? "var(--accent)" : "var(--ink-dim)",
                    fontWeight: isActive ? 500 : 400,
                    boxShadow: isActive
                      ? "0 1px 2px rgba(184,96,47,0.08)"
                      : "none",
                  }}
                >
                  {f.label}
                </Link>
              );
            })}
          </div>

          <form method="get" style={{ position: "relative" }}>
            {statusFilter ? (
              <input type="hidden" name="status" value={statusFilter} />
            ) : null}
            <div
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--ink-dim)",
                  pointerEvents: "none",
                }}
            >
              <Icon name="search" size={13} />
            </div>
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search titles…"
                style={{
                  paddingLeft: 32,
                  paddingRight: 12,
                  paddingTop: 7,
                  paddingBottom: 7,
                  fontFamily: "var(--ui)",
                  fontSize: 13,
                  background: "var(--paper-2)",
                  border: "1px solid var(--rule)",
                  borderRadius: 4,
                  width: 240,
                color: "var(--ink)",
              }}
            />
          </form>
        </div>

        {/* Table */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--rule)",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <table className="folio-table">
            <thead>
              <tr>
                <th style={{ width: "54%" }}>Title</th>
                <th>Status</th>
                <th>Updated</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      textAlign: "center",
                      padding: 40,
                      color: "var(--ink-dim)",
                    }}
                  >
                    No articles match your filter.
                  </td>
                </tr>
              ) : (
                articles.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link
                        href={`/admin/articles/${a.id}/edit`}
                        style={{ display: "block" }}
                      >
                        <div className="title-cell">{a.title}</div>
                        <div className="sub">
                          /{a.slug} · {a.readingTimeMinutes} min read
                        </div>
                      </Link>
                    </td>
                    <td>
                      <span className={`status-pill ${a.status}`}>
                        {a.status}
                      </span>
                    </td>
                    <td style={{ color: "var(--ink-dim)" }}>
                      {a.publishedAt
                        ? formatDate(a.publishedAt)
                        : `Draft · ${formatDate(a.updatedAt)}`}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          gap: 4,
                        }}
                      >
                        <Link
                          href={`/admin/articles/${a.id}/edit`}
                          style={{
                            padding: 6,
                            color: "var(--ink-dim)",
                            borderRadius: 3,
                            display: "inline-flex",
                          }}
                          title="Edit"
                        >
                          <Icon name="edit" size={14} />
                        </Link>
                        {a.status === "published" ? (
                          <Link
                            href={`/articles/${a.slug}`}
                            target="_blank"
                            rel="noopener"
                            style={{
                              padding: 6,
                              color: "var(--ink-dim)",
                              borderRadius: 3,
                              display: "inline-flex",
                            }}
                            title="View"
                          >
                            <Icon name="eye" size={14} />
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
