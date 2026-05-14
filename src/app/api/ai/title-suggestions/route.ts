import { z } from "zod";
import { chat } from "@/lib/groq";
import { guardAiRequest, truncateWords } from "../_helpers";

const BodySchema = z.object({
  content: z.string().trim().min(1),
});

const SYSTEM_PROMPT = `You suggest blog post titles. Given an article body, return 3 title options.

Constraints:
- 40–60 characters each.
- Specific, not clickbait. No "ultimate", "amazing", "you won't believe".
- One option may include a number or a how-to framing.

Return ONLY a JSON object of the shape: {"titles": ["...", "...", "..."]}. No preamble, no markdown fences, no explanation.`;

export async function POST(req: Request) {
  const guard = await guardAiRequest();
  if (!guard.ok) return guard.response;

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const body = truncateWords(parsed.data.content, 800);

  try {
    const raw = await chat({
      system: SYSTEM_PROMPT,
      user: `Body:\n${body}`,
      maxTokens: 500,
      temperature: 0.8,
      responseFormat: "json_object",
    });

    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let titles: string[] = [];
    try {
      const parsedJson: unknown = JSON.parse(cleaned);
      if (Array.isArray(parsedJson)) {
        titles = parsedJson.filter((t): t is string => typeof t === "string");
      } else if (
        parsedJson &&
        typeof parsedJson === "object" &&
        "titles" in parsedJson &&
        Array.isArray((parsedJson as { titles: unknown }).titles)
      ) {
        titles = (parsedJson as { titles: unknown[] }).titles.filter(
          (t): t is string => typeof t === "string",
        );
      }
      titles = titles.map((t) => t.trim()).filter(Boolean).slice(0, 3);
    } catch {
      // ignore — handled below
    }

    if (titles.length === 0) {
      return Response.json(
        { error: "Could not parse model output" },
        { status: 502 },
      );
    }

    return Response.json({ titles });
  } catch (err) {
    console.error("title-suggestions generation failed", err);
    return Response.json({ error: "Generation failed" }, { status: 502 });
  }
}
