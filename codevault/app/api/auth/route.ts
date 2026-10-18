import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encryptToken } from "@/lib/crypto";
import { TOKEN_COOKIE } from "@/lib/session";

// POST { token } - verifies the token with GitHub, stores it encrypted in an HttpOnly cookie
export async function POST(req: Request) {
  let token: unknown;
  try {
    ({ token } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (typeof token !== "string" || token.length < 20) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const check = await fetch("https://api.github.com/gists?per_page=1", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    cache: "no-store",
  });
  if (check.status === 401 || check.status === 403) {
    return NextResponse.json({ error: "Token rejected by GitHub. Check that it is valid and has the gist permission." }, { status: 401 });
  }
  // Classic tokens report their scopes; fine-grained tokens don't send this header.
  const scopes = check.headers.get("x-oauth-scopes");
  if (scopes !== null && !scopes.split(",").map((s) => s.trim()).includes("gist")) {
    return NextResponse.json({ error: "Token is missing the 'gist' scope." }, { status: 401 });
  }

  const store = await cookies();
  store.set(TOKEN_COOKIE, encryptToken(token), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const store = await cookies();
  return NextResponse.json({ hasToken: store.has(TOKEN_COOKIE) });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(TOKEN_COOKIE);
  return NextResponse.json({ ok: true });
}
