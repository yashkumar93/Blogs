"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
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
    const existing = await prisma.article.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
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

  const data = {
    title: input.title,
    slug,
    content: input.content,
    excerpt: emptyToNull(input.excerpt),
    metaTitle: emptyToNull(input.metaTitle),
    metaDescription: emptyToNull(input.metaDescription),
    coverImageUrl: emptyToNull(input.coverImageUrl),
    coverImageAlt: emptyToNull(input.coverImageAlt),
    readingTimeMinutes: readingTimeMinutes(input.content),
    status: intent === "publish" ? ("published" as const) : ("draft" as const),
  };

  let article;
  if (input.id) {
    const existing = await prisma.article.findUnique({
      where: { id: input.id },
      select: { status: true, publishedAt: true, slug: true },
    });
    if (!existing) {
      throw new Error("Article not found");
    }

    if (existing.slug !== slug) {
      await prisma.redirect.upsert({
        where: { fromSlug: existing.slug },
        update: { toSlug: slug },
        create: { fromSlug: existing.slug, toSlug: slug },
      });
    }

    const publishedAt =
      intent === "publish" && !existing.publishedAt ? new Date() : existing.publishedAt;

    article = await prisma.article.update({
      where: { id: input.id },
      data: { ...data, publishedAt },
    });
  } else {
    article = await prisma.article.create({
      data: {
        ...data,
        publishedAt: intent === "publish" ? new Date() : null,
      },
    });
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

  const existing = await prisma.article.findUnique({
    where: { id },
    select: { slug: true },
  });
  await prisma.article.delete({ where: { id } });

  revalidatePath("/admin");
  revalidatePath("/");
  if (existing) revalidatePath(`/articles/${existing.slug}`);
  redirect("/admin");
}
