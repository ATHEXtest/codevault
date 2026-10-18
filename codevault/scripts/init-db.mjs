// Usage: npm run db:init   (reads DATABASE_URL from .env.local)
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS snippets (
    id TEXT PRIMARY KEY,
    token_hash TEXT NOT NULL,
    language TEXT NOT NULL,
    filename TEXT NOT NULL,
    description TEXT,
    revision INTEGER NOT NULL DEFAULT 1,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
await sql`CREATE INDEX IF NOT EXISTS idx_snippets_expiry ON snippets(expires_at)`;
console.log("snippets table ready");
