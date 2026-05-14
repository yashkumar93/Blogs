# Blog Platform

SEO-optimised content publishing platform — a lightweight, full-stack blog CMS
with an admin panel and a fast, search-engine-friendly public site.

Built around four goals:
- **Functionality** — admin CRUD, publish/draft, AI-assisted metadata.
- **SEO by default** — semantic HTML, per-page meta, sitemap, JSON-LD, RSS.
- **Performance** — Lighthouse ≥ 75 (target 85+), LCP < 2.5s, CLS < 0.1.
- **Code quality** — TypeScript, Prisma, sanitised input, no secrets in the repo.

## Features

**Mandatory**
- Admin auth (single account) — credential login via httpOnly JWT cookie
- Article CRUD — create, edit, publish, delete; draft vs published state
- Auto-generated slugs (editable, collision-resistant); old slugs auto-redirect
- Markdown editor with live preview, sanitised HTML render
- Public listing with pagination
- Public article detail with semantic HTML (single `<h1>`, proper hierarchy)
- Per-page meta: title, description, canonical, Open Graph, Twitter card
- Dynamic `sitemap.xml` from published articles
- `robots.txt` with sitemap link, `noindex` on admin
- Responsive, mobile-first UI

**Bonus**
- AI-generated meta descriptions and title suggestions (Groq Llama 3.1 8B Instant)
- `BlogPosting`, `BreadcrumbList`, `WebSite` + `SearchAction` JSON-LD
- Reading-time estimates (with ISO 8601 `timeRequired` in JSON-LD)
- RSS 2.0 feed at `/rss.xml`
- Full-text search at `/search` (server-side ILIKE)
- Cover-image optimisation via `next/image` (AVIF / WebP, lazy / eager, `srcset`)
- ISR pre-rendering for article pages via `generateStaticParams`

## Tech Stack

| Layer       | Choice                                                |
| ----------- | ----------------------------------------------------- |
| Framework   | Next.js 16 (App Router) + React 19                    |
| Language    | TypeScript                                            |
| Styling     | Tailwind CSS v4 + `@tailwindcss/typography`           |
| Database    | PostgreSQL (Neon)                                     |
| ORM         | Prisma 7 + `@prisma/adapter-pg`                       |
| Auth        | `jose` HS256 JWT in httpOnly cookie; `bcryptjs`       |
| Editor      | Markdown (`react-markdown` + `remark-gfm` + sanitize) |
| Validation  | Zod                                                   |
| AI          | Groq API (`llama-3.1-8b-instant`)                     |
| Hosting     | Vercel                                                |

## Architecture

```
[Reader / Crawler] ─► Vercel CDN ─► Next.js (App Router)
                                       │
                                       │ server components, ISR
                                       ▼
                                  Postgres (Neon)
                                       ▲
[Admin Browser] ─► httpOnly cookie ─►  │
                                       │
                                       ▼
                              Groq API (Llama 3.1 8B Instant)
                              server-only, rate-limited
```

Public pages (`/`, `/articles/[slug]`) are pre-rendered or ISR-cached. Admin
routes are gated by `src/proxy.ts` (Next 16's renamed middleware) — `/admin/*`
redirects to `/admin/login` without a valid session. AI endpoints
(`/api/ai/*`) run server-only; `GROQ_API_KEY` never reaches the client.

## Local Setup

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env
# fill DATABASE_URL, AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD,
# NEXT_PUBLIC_SITE_URL, GROQ_API_KEY

# 3. Apply the schema to your DB
npm run db:migrate

# 4. Create the admin user
npm run db:seed

# 5. Run the dev server
npm run dev
```

Sign in at <http://localhost:3000/admin/login>, write an article, publish, and
visit `/` to see it on the public site.

## Environment Variables

See [`.env.example`](.env.example) for the full list.

| Variable                  | Required           | Purpose                                        |
| ------------------------- | ------------------ | ---------------------------------------------- |
| `DATABASE_URL`            | yes                | Postgres connection string (Neon pooled URL)   |
| `NEXT_PUBLIC_SITE_URL`    | yes (in prod)      | Absolute origin for canonical / OG / sitemap   |
| `AUTH_SECRET`             | yes                | ≥32-char secret for session JWT (HS256)        |
| `ADMIN_EMAIL`             | yes (for seed)     | Single admin login email                       |
| `ADMIN_PASSWORD`          | yes (for seed)     | Plain password — hashed at seed time           |
| `GROQ_API_KEY`            | yes (for AI)       | Powers AI suggestion endpoints                 |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`     | for uploads | Cloudinary account cloud name           |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`  | for uploads | Name of an *unsigned* upload preset     |

Generate `AUTH_SECRET` with `openssl rand -base64 32`.

## Project Layout

```
src/
  app/
    layout.tsx                 # root layout — site-wide metadata
    page.tsx                   # public home (paginated listing, ISR)
    not-found.tsx
    articles/[slug]/page.tsx   # public article (SSG + ISR, JSON-LD)
    search/page.tsx            # /search?q=… server-side ILIKE
    admin/
      login/page.tsx           # login (server action)
      (authed)/
        layout.tsx             # admin shell, sign-out
        page.tsx               # article list (filter + search)
        articles/
          new/page.tsx
          [id]/edit/page.tsx
          _actions.ts          # saveDraft / publish / delete (server actions)
          _editor.tsx          # client editor with AI buttons
    api/
      auth/logout/route.ts
      ai/meta-description/route.ts
      ai/title-suggestions/route.ts
      health/route.ts
    sitemap.ts                 # dynamic, from DB
    robots.ts                  # noindex on /admin and /api
    rss.xml/route.ts           # RSS 2.0
  components/
    ArticleBody.tsx            # sanitised markdown renderer (h1 → h2)
  lib/
    db.ts                      # Prisma client singleton (pg adapter)
    auth.ts                    # jose HS256 sign / verify, cookie helpers
    password.ts                # bcrypt hash / compare
    site.ts                    # site constants
    seo.ts                     # metadata builder (canonical + OG + Twitter)
    slug.ts                    # client-safe slugify
    excerpt.ts                 # markdown-stripping excerpt
    reading-time.ts            # word-count + ISO 8601 duration
    groq.ts                    # Groq chat helper (fetch-based)
    rate-limit.ts              # in-memory bucket (30 / hour / admin)
  proxy.ts                     # /admin route guard (Next 16 middleware)
  generated/prisma/            # Prisma client output (gitignored)
prisma/
  schema.prisma                # Article / User / Redirect
  migrations/                  # applied SQL
  seed.ts                      # upserts admin user
prisma.config.ts               # Prisma 7 config + dotenv
```

## SEO Checklist

- [x] Per-page `<title>` and `<meta name="description">` via Next.js Metadata API
- [x] `<link rel="canonical">` on every public page (page-aware on `/?page=N`)
- [x] Open Graph + Twitter card tags (article type + publish/modified times)
- [x] `<meta name="robots">` — `noindex` on `/admin`, `/api`, and `/search`
- [x] Dynamic `/sitemap.xml` listing every published article
- [x] `/robots.txt` linking to the sitemap, disallowing `/admin` + `/api`
- [x] `<link rel="alternate" type="application/rss+xml">` advertising `/rss.xml`
- [x] `BlogPosting` JSON-LD on each article (with `timeRequired`)
- [x] `BreadcrumbList` JSON-LD on each article
- [x] `WebSite` + `SearchAction` JSON-LD on the homepage
- [x] Single `<h1>` per page; in-body `h1` demoted to `h2`
- [x] Semantic landmarks: `<header>`, `<nav aria-label>`, `<main>`, `<article>`, `<footer>`

## AI Features — How They Work

Two server-only endpoints, both auth-gated, rate-limited (30 calls/hour per
admin), and using Groq's `llama-3.1-8b-instant` (fast, cheap, OpenAI-compatible
chat API):

- **`POST /api/ai/meta-description`** — title + first ~500 words → 140–160 char
  description, guardrailed against marketing fluff. Surfaced via "Generate with
  AI" next to the meta-description field in the editor.

- **`POST /api/ai/title-suggestions`** — first ~800 words → 3 alternative
  titles as JSON. Surfaced as clickable suggestions below the title field.

Output is always editable and never auto-applied — the admin reviews and
accepts. The Groq key never reaches the browser; failed calls don't block
manual editing.

See [PRD §18](#) for the exact prompt templates.

## Image Uploads — Cloudinary

Cover images upload directly from the browser to Cloudinary using an
**unsigned upload preset**. No API secret is shipped to the client; the
preset itself locks down what can be uploaded.

Setup:

1. Sign in at <https://console.cloudinary.com>.
2. **Settings → Upload presets → Add upload preset.**
   - Signing Mode: **Unsigned**
   - Folder: `blog-covers` (or your preferred path — locks all uploads there)
   - Allowed formats: `jpg, png, webp, avif`
   - Max file size: `5000000` (5 MB)
3. Copy your cloud name (top of the dashboard) and the preset name into `.env`:
   ```
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud"
   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET="your-preset"
   ```
4. In the editor sidebar, drop or click in the cover-image area to upload.
   The returned `secure_url` lands in the URL field automatically, and the
   alt text seeds from the filename. URL-paste still works as a fallback.

`next.config.ts` already accepts any HTTPS image source, so the served URL
works through `next/image` without further configuration.

## Performance Notes

- Article pages: `generateStaticParams` + `revalidate=300` → SSG with ISR; new
  articles render on first request and cache after.
- Home page: `revalidate=60`. Pagination via `?page=N`. Still rendered on
  demand (searchParams force dynamic in App Router); DB queries are cheap.
- Sitemap & RSS: `revalidate=3600` with `stale-while-revalidate`.
- Cover image: `next/image` with `priority`, AVIF/WebP variants, explicit
  width/height to avoid CLS.
- Fonts: `Geist` + `Geist Mono` via `next/font` with `display: swap`.

Run Lighthouse against the deployed site (or `npm run start`) to verify the
≥75 Performance target. The remaining items if a borderline score appears: move
home pagination to `/page/[n]` segments to make `/` statically generated.

## Deployment (Vercel)

1. Push the repo to GitHub.
2. In Vercel: **Add New Project** → import the repo.
3. **Environment Variables** — add every value from `.env.example`. Use the
   production Neon connection string for `DATABASE_URL`. Set
   `NEXT_PUBLIC_SITE_URL` to the deployed origin (`https://your-app.vercel.app`).
4. **Build & Output Settings** — leave at defaults. Vercel auto-detects Next.js.
5. Deploy. The first deploy will run `prisma generate` via the postinstall flow.
6. **Migrate the production DB** once: from your local shell, with
   `DATABASE_URL` pointed at production, run `npm run db:deploy`.
7. **Seed the admin** the same way: `npm run db:seed`.
8. Visit `/admin/login` on the deployed origin to sign in and start publishing.

For preview deployments, configure a separate Neon branch and point its URL at
the preview environment variables.

## Available Scripts

| Script                 | What it does                                   |
| ---------------------- | ---------------------------------------------- |
| `npm run dev`          | Start the dev server on `:3000`                |
| `npm run build`        | Production build (Turbopack)                   |
| `npm run start`        | Run the production build                       |
| `npm run lint`         | ESLint                                         |
| `npm run db:generate`  | Regenerate Prisma client                       |
| `npm run db:migrate`   | Create + apply a new local migration           |
| `npm run db:deploy`    | Apply pending migrations (production)          |
| `npm run db:seed`      | Upsert the admin user from `.env`              |
| `npm run db:studio`    | Open Prisma Studio                             |

## Known Limitations

- Single admin only — no multi-author, roles, or collaboration features.
- No comments, reactions, or newsletter sign-ups (RSS only).
- Image uploads go to Cloudinary via an *unsigned* upload preset. Security
  relies on the preset being locked to a folder, file size, and format
  allow-list (see `.env.example` for setup steps).
- Rate limiter is in-process — fine for single-instance Vercel, swap for
  Vercel KV / Redis on multi-instance.
- Internal-linking AI suggestions (PRD §7.2.3) is the one bonus feature still
  on the backlog.
# Blogs
