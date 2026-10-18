import { NextResponse } from "next/server";
import { createGist } from "@/lib/github";
import { hashToken } from "@/lib/crypto";
import { insertSnippet } from "@/lib/db";
import { rateLimit, ipKey } from "@/lib/ratelimit";
import { getSessionToken } from "@/lib/session";
import { LANGUAGE_IDS, getLanguage } from "@/lib/languages";

export async function POST(req: Request) {
  const rl = rateLimit(ipKey(req, "gist-create"), 10, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit reached. Try again later." }, { status: 429 });
  }

  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Connect a GitHub token first." }, { status: 401 });

  let body: { language?: string; code?: string; description?: string; expiresInDays?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { language, code, description, expiresInDays } = body;

  if (!language || !LANGUAGE_IDS.includes(language)) {
    return NextResponse.json({ error: `Unsupported language: ${language}` }, { status: 400 });
  }
  if (!code || typeof code !== "string" || code.length > 100_000) {
    return NextResponse.json({ error: "Code must be 1-100,000 characters." }, { status: 400 });
  }
  if (expiresInDays !== undefined && (typeof expiresInDays !== "number" || expiresInDays < 1 || expiresInDays > 365)) {
    return NextResponse.json({ error: "expiresInDays must be between 1 and 365." }, { status: 400 });
  }

  const filename = getLanguage(language)!.filename;
  const desc = (description ?? "").slice(0, 200) || `CodeVault snippet (${language})`;
  try {
    const gist = await createGist(token, filename, code, desc);
    await insertSnippet({
      id: gist.id,
      tokenHash: hashToken(token),
      language,
      filename,
      description: desc,
      expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86_400_000) : undefined,
    });
    return NextResponse.json({ gistId: gist.id, shareUrl: `/s/${gist.id}` });
  } catch (e) {
    const err = e as Error & { status?: number };
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 });
  }
}
