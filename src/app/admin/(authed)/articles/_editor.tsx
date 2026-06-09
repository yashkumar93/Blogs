"use client";

import Link from "next/link";
import { useMemo, useState, useActionState } from "react";
import type { ActionResult } from "./_actions";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { slugify } from "@/lib/slug";
import { Icon } from "@/components/Icon";
import { CoverImageUploader } from "@/components/CoverImageUploader";

type ArticleInitial = {
  id?: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  coverImageUrl: string;
  coverImageAlt: string;
  status: "draft" | "published";
};

const META_TITLE_SOFT_MAX = 60;
const META_DESC_SOFT_MAX = 160;

function AIBadge({
  label,
  loading,
  onClick,
  disabled,
}: {
  label: string;
  loading?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="btn-ai"
    >
      {loading ? <span className="spinner" /> : <Icon name="spark" size={11} />}
      {label}
    </button>
  );
}

export function ArticleEditor({
  initial,
  saveDraftAction,
  publishAction,
  deleteAction,
}: {
  initial: ArticleInitial;
  saveDraftAction: (_: ActionResult, formData: FormData) => Promise<ActionResult>;
  publishAction: (_: ActionResult, formData: FormData) => Promise<ActionResult>;
  deleteAction?: (formData: FormData) => Promise<void> | void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [slugDirty, setSlugDirty] = useState(initial.slug.length > 0);
  const [content, setContent] = useState(initial.content);
  const [excerpt, setExcerpt] = useState(initial.excerpt);
  const [metaTitle, setMetaTitle] = useState(initial.metaTitle);
  const [metaDescription, setMetaDescription] = useState(initial.metaDescription);
  const [coverImageUrl, setCoverImageUrl] = useState(initial.coverImageUrl);
  const [coverImageAlt, setCoverImageAlt] = useState(initial.coverImageAlt);
  const [showPreview, setShowPreview] = useState(false);

  const [draftResult, draftFormAction] = useActionState(saveDraftAction, null);
  const [publishResult, publishFormAction] = useActionState(publishAction, null);
  const actionError = draftResult?.error ?? publishResult?.error ?? null;

  const [aiMetaPending, setAiMetaPending] = useState(false);
  const [aiMetaError, setAiMetaError] = useState<string | null>(null);
  const [aiTitlePending, setAiTitlePending] = useState(false);
  const [aiTitleError, setAiTitleError] = useState<string | null>(null);
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);

  const onTitleChange = (v: string) => {
    setTitle(v);
    if (!slugDirty) setSlug(slugify(v));
  };
  const onSlugChange = (v: string) => {
    setSlug(slugify(v));
    setSlugDirty(true);
  };

  const wordCount = useMemo(
    () => content.trim().split(/\s+/).filter(Boolean).length,
    [content],
  );
  const readingTime = Math.max(1, Math.ceil(wordCount / 225));

  async function generateMetaDescription() {
    setAiMetaPending(true);
    setAiMetaError(null);
    try {
      const res = await fetch("/api/ai/meta-description", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      const data: { description: string } = await res.json();
      setMetaDescription(data.description);
    } catch (err) {
      setAiMetaError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setAiMetaPending(false);
    }
  }

  async function suggestTitles() {
    setAiTitlePending(true);
    setAiTitleError(null);
    setTitleSuggestions([]);
    try {
      const res = await fetch("/api/ai/title-suggestions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      const data: { titles: string[] } = await res.json();
      setTitleSuggestions(data.titles);
    } catch (err) {
      setAiTitleError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setAiTitlePending(false);
    }
  }

  const metaTitleLen = (metaTitle || title).length;
  const metaDescLen = metaDescription.length;
  const metaTitleColor =
    metaTitleLen > META_TITLE_SOFT_MAX ? "var(--accent)" : "var(--ink-dim)";
  const metaDescColor =
    metaDescLen > META_DESC_SOFT_MAX ? "var(--accent)" : "var(--ink-dim)";

  const checks = [
    { ok: title.trim().length > 0, label: "Title set" },
    { ok: slug.length > 3, label: "Slug looks good" },
    {
      ok: metaDescription.length >= 100 && metaDescription.length <= 160,
      label: "Meta description 100–160 chars",
    },
    { ok: wordCount >= 300, label: "300+ word body" },
    { ok: true, label: "JSON-LD will be generated" },
  ];

  return (
    <form className="folio-editor">
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      {/* Hidden mirrors so the form submits these values */}
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="content" value={content} />
      <input type="hidden" name="excerpt" value={excerpt} />
      <input type="hidden" name="metaTitle" value={metaTitle} />
      <input type="hidden" name="metaDescription" value={metaDescription} />
      <input type="hidden" name="coverImageUrl" value={coverImageUrl} />
      <input type="hidden" name="coverImageAlt" value={coverImageAlt} />

      {/* Top bar */}
      <div
        className="admin-topbar"
        style={{ padding: "14px 28px" }}
      >
        <div className="flex items-center" style={{ gap: 14 }}>
          <Link
            href="/admin"
            style={{
              fontFamily: "var(--ui)",
              fontSize: 13,
              color: "var(--ink-2)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 8px",
              borderRadius: 3,
            }}
          >
            ← All articles
          </Link>
          <div style={{ height: 18, width: 1, background: "var(--rule)" }} />
          <span
            style={{
              fontFamily: "var(--ui)",
              fontSize: 12,
              color: "var(--ink-dim)",
            }}
          >
            {initial.status === "published" ? "Editing published article" : "Draft"}
          </span>
        </div>
        <div className="flex" style={{ gap: 8 }}>
          {initial.status === "published" && initial.id ? (
            <Link
              href={`/articles/${slug || initial.slug}`}
              target="_blank"
              rel="noopener"
              className="btn btn-ghost"
              style={{ padding: "8px 14px", fontSize: 13 }}
            >
              <Icon name="eye" size={13} /> Preview
            </Link>
          ) : null}
          <button
            type="submit"
            formAction={draftFormAction}
            className="btn btn-ghost"
            style={{ padding: "8px 14px", fontSize: 13 }}
          >
            Save draft
          </button>
          <button
            type="submit"
            formAction={publishFormAction}
            className="btn btn-primary"
            style={{ padding: "8px 16px", fontSize: 13 }}
          >
            {initial.status === "published" ? "Update" : "Publish"}{" "}
            <Icon name="arrowRight" size={13} />
          </button>
        </div>
      </div>

      {/* Inline error banner */}
      {actionError ? (
        <div
          role="alert"
          style={{
            padding: "10px 28px",
            background: "rgba(220,38,38,0.08)",
            borderBottom: "1px solid rgba(220,38,38,0.2)",
            fontFamily: "var(--ui)",
            fontSize: 13,
            color: "#dc2626",
          }}
        >
          {actionError}
        </div>
      ) : null}

      {/* Editor grid */}
      <div
        className="folio-editor-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 320px",
          minHeight: "calc(100vh - 60px)",
        }}
      >
        {/* Main writing area */}
        <div
          style={{
            padding: "36px 48px 80px",
            borderRight: "1px solid var(--rule)",
          }}
        >
          <div className="mx-auto" style={{ maxWidth: 680 }}>
            {/* Title with AI suggest */}
            <div style={{ position: "relative", marginBottom: 12 }}>
              <input
                className="display-input"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="Title of your article"
                style={{ paddingRight: 130 }}
                aria-label="Title"
              />
              <div style={{ position: "absolute", top: 8, right: 0 }}>
                <AIBadge
                  label="Suggest 3"
                  loading={aiTitlePending}
                  onClick={suggestTitles}
                  disabled={content.trim().length < 20}
                />
              </div>
            </div>

            {aiTitleError ? (
              <p
                role="alert"
                style={{
                  fontFamily: "var(--ui)",
                  fontSize: 12,
                  color: "var(--accent)",
                  marginBottom: 14,
                }}
              >
                {aiTitleError}
              </p>
            ) : null}

            {titleSuggestions.length > 0 ? (
              <div
                style={{
                  background: "var(--paper-2)",
                  border: "1px solid var(--rule)",
                  borderRadius: 4,
                  padding: "12px 14px",
                  marginBottom: 24,
                  fontFamily: "var(--ui)",
                  fontSize: 13,
                }}
              >
                <div
                  className="flex items-center justify-between"
                  style={{ marginBottom: 8 }}
                >
                  <span
                    style={{
                      color: "var(--accent)",
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Icon name="spark" size={11} /> AI suggestions
                  </span>
                  <button
                    type="button"
                    onClick={() => setTitleSuggestions([])}
                    style={{
                      color: "var(--ink-dim)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                    aria-label="Dismiss"
                  >
                    <Icon name="x" size={12} />
                  </button>
                </div>
                {titleSuggestions.map((t, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      onTitleChange(t);
                      setTitleSuggestions([]);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 10px",
                      borderRadius: 3,
                      color: "var(--ink)",
                      fontFamily: "var(--display)",
                      fontSize: 16,
                      letterSpacing: "-0.01em",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            ) : null}

            {/* Excerpt */}
            <div style={{ marginBottom: 32 }}>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="A one-line summary that appears under the title…"
                rows={2}
                aria-label="Excerpt"
                style={{
                  fontFamily: "var(--body)",
                  fontStyle: "italic",
                  fontSize: 17,
                  lineHeight: 1.5,
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  color: "var(--ink-2)",
                  resize: "none",
                  width: "100%",
                  outline: "none",
                }}
                maxLength={300}
              />
            </div>

            {/* Preview toggle */}
            <div
              className="flex items-center justify-between"
              style={{
                padding: "6px 8px",
                background: "var(--card)",
                border: "1px solid var(--rule)",
                borderRadius: 4,
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--ui)",
                  fontSize: 11,
                  color: "var(--ink-dim)",
                  paddingLeft: 4,
                }}
              >
                Markdown · {wordCount} words · {readingTime} min
              </span>
              <button
                type="button"
                onClick={() => setShowPreview((p) => !p)}
                style={{
                  fontFamily: "var(--ui)",
                  fontSize: 12,
                  color: "var(--ink-dim)",
                  padding: "4px 8px",
                  borderRadius: 3,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {showPreview ? "Hide preview" : "Show preview"}
              </button>
            </div>

            {showPreview ? (
              <div
                className="grid"
                style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}
              >
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write the post. Markdown works."
                  aria-label="Content"
                  style={{
                    width: "100%",
                    minHeight: 480,
                    fontFamily: "var(--mono)",
                    fontSize: 13,
                    lineHeight: 1.6,
                    background: "var(--card)",
                    border: "1px solid var(--rule)",
                    borderRadius: 4,
                    padding: 12,
                    resize: "vertical",
                    color: "var(--ink-2)",
                    outline: "none",
                  }}
                />
                <div
                  className="prose-folio"
                  style={{
                    padding: 16,
                    background: "var(--card)",
                    border: "1px solid var(--rule)",
                    borderRadius: 4,
                    overflowY: "auto",
                    maxHeight: 600,
                    fontSize: 14,
                  }}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeSanitize]}
                  >
                    {content || "*Nothing to preview yet.*"}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write the post. Markdown works."
                aria-label="Content"
                style={{
                  width: "100%",
                  minHeight: 480,
                  fontFamily: "var(--body)",
                  fontSize: 17,
                  lineHeight: 1.65,
                  background: "transparent",
                  border: "none",
                  padding: "4px 0",
                  resize: "vertical",
                  color: "var(--ink-2)",
                  outline: "none",
                }}
              />
            )}
          </div>
        </div>

        {/* Right panel — SEO + AI */}
        <aside
          style={{
            padding: "32px 24px",
            background: "var(--card)",
            overflow: "auto",
            boxShadow: "inset 1px 0 0 var(--rule-soft)",
          }}
        >
          {/* URL */}
          <section style={{ marginBottom: 28 }}>
            <div className="label" style={{ marginBottom: 10 }}>
              URL
            </div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 12,
                color: "var(--ink-dim)",
                background: "var(--paper-2)",
                border: "1px solid var(--rule)",
                borderRadius: 4,
                padding: "8px 10px",
                marginBottom: 8,
                wordBreak: "break-all",
              }}
            >
              /articles/
              <span style={{ color: "var(--accent)" }}>
                {slug || "your-slug"}
              </span>
            </div>
            <input
              value={slug}
              onChange={(e) => onSlugChange(e.target.value)}
              aria-label="Slug"
              style={{
                width: "100%",
                fontFamily: "var(--mono)",
                fontSize: 12,
                padding: "7px 10px",
                background: "var(--paper-2)",
                border: "1px solid var(--rule)",
                borderRadius: 3,
                color: "var(--ink)",
                outline: "none",
              }}
            />
            {initial.status === "published" && slug !== initial.slug ? (
              <p
                style={{
                  marginTop: 6,
                  fontFamily: "var(--ui)",
                  fontSize: 11,
                  color: "var(--accent)",
                }}
              >
                Changing the slug creates a redirect from the old URL.
              </p>
            ) : null}
          </section>

          {/* SEO metadata */}
          <section style={{ marginBottom: 28 }}>
            <div className="label" style={{ marginBottom: 14 }}>
              SEO metadata
            </div>

            <div className="field" style={{ marginBottom: 16 }}>
              <div className="field-row">
                <label>Meta title</label>
                <span className="hint" style={{ color: metaTitleColor }}>
                  {metaTitleLen}/{META_TITLE_SOFT_MAX}
                </span>
              </div>
              <input
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder={title || "Defaults to title"}
                style={{ fontSize: 13 }}
                maxLength={120}
              />
            </div>

            <div className="field">
              <div className="field-row">
                <label>Meta description</label>
                <span className="hint" style={{ color: metaDescColor }}>
                  {metaDescLen}/{META_DESC_SOFT_MAX}
                </span>
              </div>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="A one-sentence summary for search results…"
                rows={3}
                style={{ fontSize: 13, lineHeight: 1.5 }}
                maxLength={200}
              />
              <div
                className="flex items-center justify-between"
                style={{ marginTop: 6 }}
              >
                <span className="hint">Generated from title + opening</span>
                <AIBadge
                  label="Generate"
                  loading={aiMetaPending}
                  onClick={generateMetaDescription}
                  disabled={!title || content.trim().length < 20}
                />
              </div>
              {aiMetaError ? (
                <p
                  role="alert"
                  style={{
                    fontFamily: "var(--ui)",
                    fontSize: 11,
                    color: "var(--accent)",
                    marginTop: 6,
                  }}
                >
                  {aiMetaError}
                </p>
              ) : null}
            </div>
          </section>

          {/* SERP preview */}
          <section style={{ marginBottom: 28 }}>
            <div className="label" style={{ marginBottom: 10 }}>
              Search preview
            </div>
            <div
              style={{
                background: "var(--paper-2)",
                border: "1px solid var(--rule)",
                borderRadius: 4,
                padding: "12px 14px",
                fontFamily: "var(--ui)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "var(--ink-dim)",
                  marginBottom: 4,
                }}
              >
                /articles/{slug || "your-slug"}
              </div>
              <div
                style={{
                  fontFamily: "var(--display)",
                  fontSize: 16,
                  color: "var(--accent)",
                  lineHeight: 1.25,
                  marginBottom: 4,
                  letterSpacing: "-0.01em",
                }}
              >
                {metaTitle || title || "Title of your article"}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--ink-2)",
                  lineHeight: 1.45,
                }}
              >
                {metaDescription ||
                  excerpt ||
                  "A description of your article will appear here…"}
              </div>
            </div>
          </section>

          {/* Cover image */}
          <section style={{ marginBottom: 28 }}>
            <div className="label" style={{ marginBottom: 10 }}>
              Cover image
            </div>
            <CoverImageUploader
              url={coverImageUrl}
              alt={coverImageAlt}
              onUrlChange={setCoverImageUrl}
              onAltChange={setCoverImageAlt}
            />
          </section>

          {/* Pre-publish checks */}
          <section style={{ marginBottom: 28 }}>
            <div className="label" style={{ marginBottom: 10 }}>
              Pre-publish checks
            </div>
            <div
              style={{
                fontFamily: "var(--ui)",
                fontSize: 12,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {checks.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center"
                  style={{
                    gap: 8,
                    color: c.ok ? "var(--ink-2)" : "var(--ink-dim)",
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 2,
                      background: c.ok ? "var(--accent)" : "var(--rule)",
                      color: "var(--paper)",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {c.ok ? <Icon name="check" size={9} strokeWidth={2.5} /> : null}
                  </span>
                  {c.label}
                </div>
              ))}
            </div>
          </section>

          {/* Delete */}
          {initial.id && deleteAction ? (
            <section
              style={{
                borderTop: "1px solid var(--rule)",
                paddingTop: 20,
              }}
            >
              <button
                type="submit"
                formAction={deleteAction}
                onClick={(e) => {
                  if (!confirm("Delete this article? This cannot be undone.")) {
                    e.preventDefault();
                  }
                }}
                style={{
                  fontFamily: "var(--ui)",
                  fontSize: 12,
                  color: "var(--accent)",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                Delete article
              </button>
            </section>
          ) : null}
        </aside>
      </div>
    </form>
  );
}
