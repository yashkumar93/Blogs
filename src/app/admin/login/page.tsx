import { redirect } from "next/navigation";
import { z } from "zod";
import { sql, type User } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { signSession, setSessionCookie, getSession } from "@/lib/auth";
import { site } from "@/lib/site";
import { FolioMark, Icon } from "@/components/Icon";
import { PasswordInput } from "./_PasswordInput";

const LoginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
  next: z.string().optional(),
});

async function loginAction(formData: FormData) {
  "use server";
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });
  if (!parsed.success) {
    redirect("/admin/login?error=invalid");
  }

  const { email, password, next } = parsed.data;
  const [user] = await sql<User[]>`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
  const passwordOk = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !passwordOk) {
    redirect("/admin/login?error=invalid");
  }

  const token = await signSession({ userId: user.id, email: user.email });
  await setSessionCookie(token);

  const safeNext =
    typeof next === "string" && next.startsWith("/admin") ? next : "/admin";
  redirect(safeNext);
}

export default async function LoginPage({
  searchParams,
}: {

  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/admin");

  const { error, next } = await searchParams;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr 1.1fr",
      }}
      className="folio-login"
    >
      {/* Brand / quote side */}
      <div
        className="folio-login-aside"
        style={{
          background: "var(--card)",
          color: "var(--ink)",
          padding: "56px 48px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          borderRight: "1px solid var(--rule)",
        }}
      >
        <div className="flex items-center" style={{ gap: 10 }}>
          <FolioMark size={28} inverse />
          <span
            style={{
              fontFamily: "var(--display)",
              fontSize: 19,
              letterSpacing: "-0.01em",
            }}
          >
            {site.name}
          </span>
        </div>
        <div>
          <div
            className="kicker"
            style={{
              color: "var(--accent)",
              marginBottom: 20,
              fontSize: 11,
            }}
          >
            From the field
          </div>
          <blockquote
            style={{
              fontFamily: "var(--display)",
              fontSize: 28,
              lineHeight: 1.22,
              letterSpacing: "-0.015em",
              fontStyle: "italic",
              color: "var(--ink)",
              borderLeft: "2px solid var(--accent)",
              paddingLeft: 20,
              marginBottom: 24,
            }}
          >
            “We replaced our marketing site with this in an afternoon. The
            Lighthouse score went up. Our writers haven't asked me a
            single SEO question since.”
          </blockquote>
          <div
              style={{
                fontFamily: "var(--ui)",
                fontSize: 12.5,
                color: "var(--ink-dim)",
                letterSpacing: "0.01em",
              }}
            >
            A happy admin · somewhere
          </div>
        </div>
        <div
          style={{
            fontFamily: "var(--ui)",
            fontSize: 11,
            color: "var(--ink-mute)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {site.name} · v1.0
        </div>
      </div>

      {/* Form side */}
      <div
        className="folio-login-form"
        style={{
          padding: "56px 64px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "var(--paper)",
        }}
      >
        <div style={{ maxWidth: 400 }}>
          <div className="kicker" style={{ marginBottom: 12 }}>
            Sign in
          </div>
          <h1
            className="display"
            style={{ fontSize: 42, marginBottom: 8 }}
          >
            Welcome back.
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "var(--ink-dim)",
              marginBottom: 32,
            }}
          >
            Sign in to your admin to draft, edit, and publish.
          </p>

          <form
            action={loginAction}
            style={{ display: "flex", flexDirection: "column", gap: 18 }}
          >
            <input type="hidden" name="next" value={next ?? ""} />
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </div>
            <div className="field">
              <div className="field-row">
                <label htmlFor="password">Password</label>
              </div>
              <PasswordInput />
            </div>

            {error === "invalid" ? (
              <p
                role="alert"
                style={{
                  fontFamily: "var(--ui)",
                  fontSize: 12,
                  color: "var(--accent)",
                }}
              >
                Invalid email or password.
              </p>
            ) : null}

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                justifyContent: "center",
                padding: "12px 18px",
                marginTop: 8,
              }}
            >
              Sign in <Icon name="arrowRight" size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
