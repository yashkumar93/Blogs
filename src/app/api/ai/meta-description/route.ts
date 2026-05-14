import { z } from "zod";
import { chat } from "@/lib/groq";
import { guardAiRequest, truncateWords } from "../_helpers";

const BodySchema = z.object({
  title: z.string().trim().min(1).max(300),
  content: z.string().default(""),
});

const SYSTEM_PROMPT = `You write SEO meta descriptions for a blog. Given an article's title and opening, write ONE description for search engine results.

Constraints:
- 140–160 characters.
- No quotes, no emoji, no marketing fluff ("ultimate", "amazing", "best").
- Active voice. State what the reader will learn or get.
- Do not start with the article's title verbatim.

Output ONLY the description, nothing else. No preamble, no quotes around it.`;

export async function POST(req: Request) {
  const guard = await guardAiRequest();
  if (!guard.ok) return guard.response;

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { title, content } = parsed.data;
  const opening = truncateWords(content, 500);

  try {
    const raw = await chat({
      system: SYSTEM_PROMPT,
      user: `Title: ${title}\n\nOpening:\n${opening}`,
      maxTokens: 300,
      temperature: 0.5,
    });

    const text = raw
      .trim()
      .replace(/^["“”']|["“”']$/g, "")
      .slice(0, 200);

    return Response.json({ description: text });
  } catch (err) {
    console.error("meta-description generation failed", err);
    return Response.json({ error: "Generation failed" }, { status: 502 });
  }
}
