import postgres from "postgres";

const globalForSql = globalThis as unknown as {
  sql: ReturnType<typeof postgres> | undefined;
};

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  return postgres(connectionString, {
    transform: { column: { from: postgres.toCamel } },
    max: 10,
  });
}

export const sql = globalForSql.sql ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForSql.sql = sql;
}

export type ArticleStatus = "draft" | "published";

export type Article = {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  status: ArticleStatus;
  readingTimeMinutes: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
};

export type Redirect = {
  fromSlug: string;
  toSlug: string;
  createdAt: Date;
};
