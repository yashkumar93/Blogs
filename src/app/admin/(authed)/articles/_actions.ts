"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sql, type Article } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import { readingTimeMinutes } from "@/lib/reading-time";

async function ensureUniqueSlug(
  base: string,
  excludeId?: string,
): Promise<string> {
  const slug = slugify(base) || "article";
  let candidate = slug;
  let n = 1;
  while (true) {
    const [existing] = await sql<{ id: string }[]>`
      SELECT id FROM articles WHERE slug = ${candidate} LIMIT 1
    `;
    if (!existing || existing.id === excludeId) return candidate;
    n += 1;
    candidate = `${slug}-${n}`;
  }
}

async function requireAuth() {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }
  return session;
}

const ArticleInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1, "Title is required").max(200),
  slug: z
    .string()
    .trim()
    .max(220)
    .regex(/^[a-z0-9-]*$/i, "Slug may only contain letters, digits, hyphens")
    .optional()
    .or(z.literal("")),
  content: z.string().default(""),
  excerpt: z.string().trim().max(300).optional().or(z.literal("")),
  metaTitle: z.string().trim().max(120).optional().or(z.literal("")),
  metaDescription: z.string().trim().max(200).optional().or(z.literal("")),
  coverImageUrl: z.string().trim().max(2048).optional().or(z.literal("")),
  coverImageAlt: z.string().trim().max(200).optional().or(z.literal("")),
});

function readForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : "";
  };
  return {
    id: get("id") || undefined,
    title: get("title"),
    slug: get("slug"),
    content: get("content"),
    excerpt: get("excerpt"),
    metaTitle: get("metaTitle"),
    metaDescription: get("metaDescription"),
    coverImageUrl: get("coverImageUrl"),
    coverImageAlt: get("coverImageAlt"),
  };
}

function emptyToNull<T extends string | undefined>(v: T): string | null {
  if (v === undefined) return null;
  const trimmed = v.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export async function saveDraftAction(formData: FormData) {
  return saveArticle("draft", formData);
}

export async function publishAction(formData: FormData) {
  return saveArticle("publish", formData);
}

async function saveArticle(
  intent: "draft" | "publish",
  formData: FormData,
) {
  await requireAuth();

  const parsed = ArticleInputSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const input = parsed.data;

  const slugSource = input.slug && input.slug.length > 0 ? input.slug : input.title;
  const slug = await ensureUniqueSlug(slugSource, input.id);

  const status = intent === "publish" ? "published" : "draft";
  const excerpt = emptyToNull(input.excerpt);
  const metaTitle = emptyToNull(input.metaTitle);
  const metaDescription = emptyToNull(input.metaDescription);
  const coverImageUrl = emptyToNull(input.coverImageUrl);
  const coverImageAlt = emptyToNull(input.coverImageAlt);
  const readingTime = readingTimeMinutes(input.content);

  let article: Article;

  if (input.id) {
    const [existing] = await sql<Pick<Article, "status" | "publishedAt" | "slug">[]>`
      SELECT status, published_at, slug FROM articles WHERE id = ${input.id} LIMIT 1
    `;
    if (!existing) throw new Error("Article not found");

    if (existing.slug !== slug) {
      await sql`
        INSERT INTO redirects (from_slug, to_slug)
        VALUES (${existing.slug}, ${slug})
        ON CONFLICT (from_slug) DO UPDATE SET to_slug = ${slug}
      `;
    }

    const publishedAt =
      intent === "publish" && !existing.publishedAt ? new Date() : existing.publishedAt;

    const [updated] = await sql<Article[]>`
      UPDATE articles SET
        title = ${input.title},
        slug = ${slug},
        content = ${input.content},
        excerpt = ${excerpt},
        meta_title = ${metaTitle},
        meta_description = ${metaDescription},
        cover_image_url = ${coverImageUrl},
        cover_image_alt = ${coverImageAlt},
        reading_time_minutes = ${readingTime},
        status = ${status},
        published_at = ${publishedAt ?? null},
        updated_at = NOW()
      WHERE id = ${input.id}
      RETURNING *
    `;
    article = updated;
  } else {
    const publishedAt = intent === "publish" ? new Date() : null;
    const [created] = await sql<Article[]>`
      INSERT INTO articles (
        id, title, slug, content, excerpt,
        meta_title, meta_description, cover_image_url, cover_image_alt,
        reading_time_minutes, status, published_at, updated_at
      ) VALUES (
        ${randomUUID()}, ${input.title}, ${slug}, ${input.content}, ${excerpt},
        ${metaTitle}, ${metaDescription}, ${coverImageUrl}, ${coverImageAlt},
        ${readingTime}, ${status}, ${publishedAt}, NOW()
      )
      RETURNING *
    `;
    article = created;
  }

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath(`/articles/${article.slug}`);

  redirect(`/admin/articles/${article.id}/edit?saved=1`);
}

export async function deleteArticle(formData: FormData) {
  await requireAuth();
  const id = formData.get("id");
  if (typeof id !== "string") return;

  const [existing] = await sql<{ slug: string }[]>`
    SELECT slug FROM articles WHERE id = ${id} LIMIT 1
  `;
  await sql`DELETE FROM articles WHERE id = ${id}`;

  revalidatePath("/admin");
  revalidatePath("/");
  if (existing) revalidatePath(`/articles/${existing.slug}`);
  redirect("/admin");
}
