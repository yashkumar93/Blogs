import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ArticleEditor } from "../../_editor";
import {
  saveDraftAction,
  publishAction,
  deleteArticle,
} from "../../_actions";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) notFound();

  return (
    <ArticleEditor
      initial={{
        id: article.id,
        title: article.title,
        slug: article.slug,
        content: article.content,
        excerpt: article.excerpt ?? "",
        metaTitle: article.metaTitle ?? "",
        metaDescription: article.metaDescription ?? "",
        coverImageUrl: article.coverImageUrl ?? "",
        coverImageAlt: article.coverImageAlt ?? "",
        status: article.status,
      }}
      saveDraftAction={saveDraftAction}
      publishAction={publishAction}
      deleteAction={deleteArticle}
    />
  );
}
