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
        className="relative flex flex-col items-center justify-center text-center px-6"
        style={{ height: "50vh" }}
      >
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">
          {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
        <h1 className="font-bold tracking-tight text-foreground mb-4" style={{ fontSize: "clamp(48px, 8vw, 88px)", lineHeight: 1.05, letterSpacing: "-0.03em" }}>
          {site.name}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground italic mb-8" style={{ maxWidth: 480 }}>
          {site.description}
        </p>
        <Link
          href="/blog"
          className="btn btn-primary text-xs uppercase tracking-widest"
          style={{ padding: "12px 28px", borderRadius: 2 }}
        >
          Enter the blog →
        </Link>
      </section>

      {/* Lower half — crowd canvas */}
      <div className="relative w-full overflow-hidden" style={{ height: "50vh" }}>
        <CrowdCanvas src="/images/peeps/all-peeps.png" rows={15} cols={7} />
      </div>
    </div>
  );
}
