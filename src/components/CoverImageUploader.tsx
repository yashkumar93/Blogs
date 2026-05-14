"use client";

import { useState, useRef } from "react";
import { Icon } from "./Icon";

type Props = {
  url: string;
  alt: string;
  onUrlChange: (url: string) => void;
  onAltChange: (alt: string) => void;
};

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

type CloudinaryUploadResponse = {
  secure_url?: string;
  error?: { message?: string };
};

export function CoverImageUploader({
  url,
  alt,
  onUrlChange,
  onAltChange,
}: Props) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  const configured = Boolean(cloudName && preset);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    if (!configured) {
      setError("Cloudinary is not configured");
      return;
    }
    if (!ACCEPTED.includes(file.type)) {
      setError("Use JPG, PNG, WebP, or AVIF");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Max file size is 5 MB");
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("upload_preset", preset!);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: form },
      );
      const body = (await res.json()) as CloudinaryUploadResponse;
      if (!res.ok || !body.secure_url) {
        throw new Error(body.error?.message ?? `Upload failed (${res.status})`);
      }
      onUrlChange(body.secure_url);
      if (!alt) {
        onAltChange(file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  return (
    <div>
      {url ? (
        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "16/9",
              borderRadius: 4,
              overflow: "hidden",
              background: "var(--paper-2)",
              border: "1px solid var(--rule)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={alt}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
            <button
              type="button"
              onClick={() => {
                onUrlChange("");
                onAltChange("");
              }}
              aria-label="Remove cover image"
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                background: "rgba(15,13,10,0.85)",
                color: "var(--paper)",
                border: "none",
                borderRadius: 3,
                padding: "4px 6px",
                fontSize: 11,
                fontFamily: "var(--ui)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Icon name="x" size={11} /> Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => configured && !uploading && inputRef.current?.click()}
          role="button"
          tabIndex={configured ? 0 : -1}
          onKeyDown={(e) => {
            if (
              configured &&
              !uploading &&
              (e.key === "Enter" || e.key === " ")
            ) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          style={{
            aspectRatio: "16/9",
            background: dragOver ? "var(--accent-soft)" : "var(--card)",
            border: `1px dashed ${dragOver ? "var(--accent)" : "var(--rule)"}`,
            borderRadius: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            color: "var(--ink-dim)",
            cursor: configured && !uploading ? "pointer" : "not-allowed",
            transition: "background 0.15s, border-color 0.15s",
            marginBottom: 10,
          }}
        >
          {uploading ? (
            <>
              <span className="spinner" />
              <span style={{ fontFamily: "var(--ui)", fontSize: 11.5 }}>
                Uploading…
              </span>
            </>
          ) : configured ? (
            <>
              <Icon name="image" size={20} />
              <span style={{ fontFamily: "var(--ui)", fontSize: 11.5 }}>
                Drag or click · JPG, PNG, WebP, AVIF · ≤ 5 MB
              </span>
            </>
          ) : (
            <span
              style={{
                fontFamily: "var(--ui)",
                fontSize: 11.5,
                padding: "0 16px",
                textAlign: "center",
              }}
            >
              Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and
              NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET to enable uploads.
            </span>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadFile(file);
          e.target.value = "";
        }}
        style={{ display: "none" }}
      />

      {error ? (
        <p
          role="alert"
          style={{
            fontFamily: "var(--ui)",
            fontSize: 11,
            color: "var(--accent)",
            marginBottom: 8,
          }}
        >
          {error}
        </p>
      ) : null}

      <div className="field" style={{ marginBottom: 8 }}>
        <input
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          type="url"
          placeholder="…or paste an image URL"
          style={{ fontSize: 12 }}
          aria-label="Cover image URL"
        />
      </div>
      <div className="field">
        <input
          value={alt}
          onChange={(e) => onAltChange(e.target.value)}
          placeholder="Alt text"
          style={{ fontSize: 12 }}
          maxLength={200}
          aria-label="Cover image alt text"
        />
      </div>
    </div>
  );
}
