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
    <div className="admin-login-shell">
      <main className="admin-login-card">
        <section className="admin-login-brand">
          <div className="flex items-center" style={{ gap: 10 }}>
            <FolioMark size={28} />
            <div>
              <div className="eyebrow">Admin</div>
              <div
                style={{
                  fontFamily: "var(--display)",
                  fontSize: 18,
                  letterSpacing: "-0.01em",
                  marginTop: 2,
                }}
              >
                {site.name}
              </div>
            </div>
          </div>

          <div>
            <div className="admin-login-kicker">Private workspace</div>
            <h1>Sign in.</h1>
            <p>
              Access the editorial dashboard to draft, edit, and publish in the
              same quiet visual language as the rest of the site.
            </p>
          </div>

          <div className="meta">{site.name} · admin</div>
        </section>

        <section className="admin-login-form">
          <div className="admin-login-form-inner">
            <div className="admin-login-kicker">Welcome back</div>
            <h2
              className="display"
              style={{ fontSize: 40, marginTop: 8, marginBottom: 8 }}
            >
              Enter the admin.
            </h2>
            <p className="admin-login-copy" style={{ marginBottom: 28 }}>
              Use your admin credentials to continue.
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
                <p role="alert" className="admin-login-error">
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

            <p className="admin-login-footer">
              Protected area. Return to the public site anytime.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
