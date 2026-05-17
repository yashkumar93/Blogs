import "dotenv/config";
import postgres from "postgres";
import bcrypt from "bcryptjs";

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Set ADMIN_EMAIL and ADMIN_PASSWORD in your .env before running seed.",
    );
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const sql = postgres(connectionString);
  const passwordHash = await bcrypt.hash(password, 12);

  await sql`
    INSERT INTO users (id, email, password_hash)
    VALUES (gen_random_uuid(), ${email}, ${passwordHash})
    ON CONFLICT (email) DO UPDATE SET password_hash = ${passwordHash}
  `;

  console.log(`Admin user ready: ${email}`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
