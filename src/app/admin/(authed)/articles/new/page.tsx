import { ArticleEditor } from "../_editor";
import { saveDraftAction, publishAction } from "../_actions";

export default function NewArticlePage() {
  return (
    <ArticleEditor
      initial={{
        title: "",
        slug: "",
        content: "",
        excerpt: "",
        metaTitle: "",
        metaDescription: "",
        coverImageUrl: "",
        coverImageAlt: "",
        status: "draft",
      }}
      saveDraftAction={saveDraftAction}
      publishAction={publishAction}
    />
  );
}
