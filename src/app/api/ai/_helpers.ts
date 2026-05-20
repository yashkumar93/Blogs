import "server-only";
import { getSession } from "@/lib/auth";
import { takeToken } from "@/lib/rate-limit";

export type GuardResult =
  | { ok: true; userId: string }
  | { ok: false; response: Response };

export async function guardAiRequest(): Promise<GuardResult> {
  const session = await getSession();
  if (!session) {
    return {
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const bucket = takeToken(session.userId);
  if (!bucket.ok) {
    return {
      ok: false,
      response: Response.json(
        { error: "Rate limit exceeded", retryAfterSeconds: bucket.retryAfterSeconds },
        { status: 429, headers: { "Retry-After": String(bucket.retryAfterSeconds) } },
      ),
    };
  }
  return { ok: true, userId: session.userId };
}

export function truncateWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ");
}
