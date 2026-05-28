import Link from "next/link";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { CrowdCanvas } from "@/components/CrowdCanvas";

export const metadata: Metadata = buildMetadata({
  title: `${site.name} — Welcome`,
  description: site.description,
  path: "/welcome",
  type: "website",
});

export default function WelcomePage() {
  return (
    <div className="relative w-full" style={{ height: "100vh" }}>
      {/* Upper half — hero */}
      <section
        className="relative flex flex-col items-center justify-center text-center"
        style={{
          height: "50vh",
          padding: "0 24px",
        }}
      >
        <div className="kicker mb-3">
          {new Date().toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </div>
        <h1
          className="display"
          style={{
            fontSize: "clamp(48px, 8vw, 88px)",
            letterSpacing: "-0.03em",
            marginBottom: 16,
          }}
        >
          {site.name}
        </h1>
        <p
          style={{
            fontFamily: "var(--body)",
            fontStyle: "italic",
            color: "var(--ink-dim)",
            fontSize: 17,
            maxWidth: 520,
            marginBottom: 28,
          }}
        >
          {site.description}
        </p>
        <Link
          href="/blog"
          style={{
            fontFamily: "var(--ui)",
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "var(--ink)",
            border: "1px solid var(--ink)",
            padding: "12px 24px",
            borderRadius: 2,
          }}
        >
          Enter the blog →
        </Link>
      </section>

      {/* Lower half — crowd canvas */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: "50vh" }}
      >
        <CrowdCanvas src="/images/peeps/all-peeps.png" rows={15} cols={7} />
      </div>
    </div>
  );
}
