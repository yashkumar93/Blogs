import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { site } from "@/lib/site";
import { Icon, FolioMark } from "@/components/Icon";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AuthedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  const userInitial = session.email[0].toUpperCase();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div
          className="flex items-center"
          style={{ gap: 10, padding: "0 8px" }}
        >
          <FolioMark size={28} />
          <div>
            <div
              style={{
                fontFamily: "var(--display)",
                fontSize: 17,
                letterSpacing: "-0.01em",
              }}
            >
              {site.name}
            </div>
            <div
              style={{
                fontFamily: "var(--ui)",
                fontSize: 10.5,
                color: "var(--ink-dim)",
                letterSpacing: "0.04em",
              }}
            >
              admin
            </div>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="label">Workspace</div>
          <Link href="/admin" className="sidebar-link active">
            <Icon name="edit" size={14} /> Articles
          </Link>
        </div>

        <div className="sidebar-section">
          <div className="label">Site</div>
          <Link href="/" className="sidebar-link" target="_blank">
            <Icon name="eye" size={14} /> View public site{" "}
            <Icon name="arrowUpRight" size={11} />
          </Link>
          <a href="/rss.xml" className="sidebar-link" target="_blank">
            <Icon name="rss" size={14} /> /rss.xml
          </a>
          <a href="/sitemap.xml" className="sidebar-link" target="_blank">
            <Icon name="link" size={14} /> /sitemap.xml
          </a>
        </div>

        <div
          style={{
            marginTop: "auto",
            borderTop: "1px solid var(--rule)",
            paddingTop: 16,
            fontFamily: "var(--ui)",
            fontSize: 12,
          }}
        >
          <div className="flex items-center" style={{ gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "var(--accent-soft)",
                color: "var(--accent)",
                display: "grid",
                placeItems: "center",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {userInitial}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  color: "var(--ink)",
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {session?.email ?? "Admin"}
              </div>
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  style={{
                    color: "var(--accent)",
                    fontSize: 11,
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    padding: 0,
                    fontFamily: "var(--ui)",
                  }}
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      <div className="admin-main">{children}</div>
    </div>
  );
}
