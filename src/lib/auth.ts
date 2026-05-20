import "server-only";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";

export const SESSION_COOKIE_NAME = "blog_session";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type SessionPayload = {
  sessionId: string;
  userId: string;
  email: string;
};

export async function signSession(payload: {
  userId: string;
  email: string;
}): Promise<string> {
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + COOKIE_MAX_AGE_SECONDS * 1000);
  await sql`
    INSERT INTO sessions (id, user_id, email, expires_at)
    VALUES (${id}, ${payload.userId}, ${payload.email}, ${expiresAt})
  `;
  return id;
}

export async function verifySession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const [row] = await sql<{ userId: string; email: string }[]>`
    SELECT user_id, email FROM sessions
    WHERE id = ${token} AND expires_at > NOW()
    LIMIT 1
  `;
  if (!row) return null;
  return { sessionId: token, userId: row.userId, email: row.email };
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  return verifySession(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await sql`DELETE FROM sessions WHERE id = ${token}`;
  }
  store.delete(SESSION_COOKIE_NAME);
}
