import "server-only";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export const AI_MODEL = "llama-3.1-8b-instant";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type ChatRequest = {
  model?: string;
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: "text" | "json_object";
};

type GroqResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

export async function chat({
  model = AI_MODEL,
  system,
  user,
  maxTokens = 500,
  temperature = 0.7,
  responseFormat = "text",
}: ChatRequest): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set");
  }

  const messages: ChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      ...(responseFormat === "json_object"
        ? { response_format: { type: "json_object" } }
        : {}),
    }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as GroqResponse;
    throw new Error(
      `Groq API error (${res.status}): ${body.error?.message ?? "unknown"}`,
    );
  }

  const body = (await res.json()) as GroqResponse;
  const text = body.choices?.[0]?.message?.content;
  if (typeof text !== "string") {
    throw new Error("Groq API returned no content");
  }
  return text;
}
