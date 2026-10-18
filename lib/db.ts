import { neon } from "@neondatabase/serverless";

// Only metadata lives here. Code bodies stay in the owner's GitHub Gist,
// and raw tokens are never stored (only an HMAC to check ownership).

let _sql: ReturnType<typeof neon> | null = null;
function sql() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

let schemaReady: Promise<void> | null = null;
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const q = sql();
      await q`
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
      await q`CREATE INDEX IF NOT EXISTS idx_snippets_expiry ON snippets(expires_at)`;
    })().catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  return schemaReady;
}

export interface SnippetRow {
  id: string;
  token_hash: string;
  language: string;
  filename: string;
  description: string | null;
  revision: number;
  expires_at: Date | string | null;
}

export async function insertSnippet(row: {
  id: string;
  tokenHash: string;
  language: string;
  filename: string;
  description?: string;
  expiresAt?: Date;
}) {
  await ensureSchema();
  const q = sql();
  await q`
    INSERT INTO snippets (id, token_hash, language, filename, description, expires_at)
    VALUES (${row.id}, ${row.tokenHash}, ${row.language}, ${row.filename},
            ${row.description ?? null}, ${row.expiresAt?.toISOString() ?? null})`;
}

export async function getSnippet(id: string): Promise<SnippetRow | null> {
  await ensureSchema();
  const q = sql();
  const rows = (await q`SELECT * FROM snippets WHERE id = ${id} LIMIT 1`) as unknown as SnippetRow[];
  return rows[0] ?? null;
}

export async function bumpRevision(id: string): Promise<number | null> {
  const q = sql();
  const rows = (await q`UPDATE snippets SET revision = revision + 1 WHERE id = ${id} RETURNING revision`) as unknown as { revision: number }[];
  return rows[0]?.revision ?? null;
}

export async function pruneExpired(): Promise<number> {
  await ensureSchema();
  const q = sql();
  const rows = (await q`DELETE FROM snippets WHERE expires_at < now() RETURNING id`) as unknown as unknown[];
  return rows.length;
}

export async function pingDb(): Promise<boolean> {
  try {
    const q = sql();
    await q`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
