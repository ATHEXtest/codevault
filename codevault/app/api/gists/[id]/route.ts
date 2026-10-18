import { NextResponse } from "next/server";
import { getGist, updateGist } from "@/lib/github";
import { bumpRevision, getSnippet } from "@/lib/db";
import { hashToken } from "@/lib/crypto";
import { getSessionToken } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

const isExpired = (d: Date | string | null) => !!d && new Date(d) < new Date();

// GET /api/gists/:id[?rev=<sha>] - gist content, or metadata only if GitHub can't serve it
export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const rev = new URL(req.url).searchParams.get("rev") ?? undefined;
  if (rev && !/^[0-9a-f]{40}$/.test(rev)) {
    return NextResponse.json({ error: "Invalid revision" }, { status: 400 });
  }

  const row = await getSnippet(id);
  if (!row) return NextResponse.json({ error: "Snippet not found" }, { status: 404 });
  if (isExpired(row.expires_at)) return NextResponse.json({ error: "This snippet has expired." }, { status: 410 });

  const token = await getSessionToken();
  const canEdit = !!token && hashToken(token) === row.token_hash;

  try {
    const gist = await getGist(token, id, rev);
    if (!gist) {
      return NextResponse.json({
        metadataOnly: true,
        language: row.language,
        filename: row.filename,
        description: row.description,
        revision: row.revision,
        message: "Connect a GitHub token to view the code.",
      });
    }
    const file = gist.files?.[row.filename];
    return NextResponse.json({
      metadataOnly: false,
      language: row.language,
      filename: row.filename,
      description: row.description,
      revision: row.revision,
      code: file?.content ?? "",
      gistUrl: gist.html_url,
      version: rev ?? gist.history?.[0]?.version ?? null,
      pinned: !!rev,
      canEdit: canEdit && !rev,
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    return NextResponse.json({ error: err.message }, { status: err.status ?? 502 });
  }
}

// PATCH { code } - new revision of the gist (owner only)
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const row = await getSnippet(id);
  if (!row) return NextResponse.json({ error: "Snippet not found" }, { status: 404 });

  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Token required" }, { status: 401 });
  if (hashToken(token) !== row.token_hash) {
    return NextResponse.json({ error: "Only the snippet's owner can save revisions. Use Fork instead." }, { status: 403 });
  }

  let code: unknown;
  try {
    ({ code } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof code !== "string" || !code || code.length > 100_000) {
    return NextResponse.json({ error: "Code must be 1-100,000 characters." }, { status: 400 });
  }

  try {
    const gist = await updateGist(token, id, row.filename, code);
    const revision = (await bumpRevision(id)) ?? row.revision + 1;
    return NextResponse.json({ ok: true, revision, version: gist.history?.[0]?.version ?? null });
  } catch (e) {
    const err = e as Error & { status?: number };
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 });
  }
}
