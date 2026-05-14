import Link from "next/link";

export default function NotFound() {
  return (
    <main
      className="mx-auto"
      style={{ maxWidth: 680, padding: "120px 32px 80px" }}
    >
      <div className="kicker" style={{ marginBottom: 12 }}>
        404
      </div>
      <h1
        className="display"
        style={{ fontSize: 56, marginBottom: 16, letterSpacing: "-0.025em" }}
      >
        Not found.
      </h1>
      <p
        style={{
          fontFamily: "var(--body)",
          fontStyle: "italic",
          fontSize: 19,
          color: "var(--ink-dim)",
          marginBottom: 28,
        }}
      >
        The page you&apos;re looking for has moved, or never existed in the
        first place.
      </p>
      <Link
        href="/"
        style={{
          fontFamily: "var(--ui)",
          fontSize: 13,
          fontWeight: 500,
          borderBottom: "1px solid var(--ink)",
          paddingBottom: 2,
        }}
      >
        ← Back home
      </Link>
    </main>
  );
}
