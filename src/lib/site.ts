export const site = {
  name: "Blog Platform",
  description:
    "An SEO-optimised content publishing platform — fast, semantic, and discoverable.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "en_US",
  defaultAuthor: "Blog Platform",
} as const;
