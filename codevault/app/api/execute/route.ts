import { NextResponse } from "next/server";
import { getProvider } from "@/lib/execution";
import { rateLimit, ipKey } from "@/lib/ratelimit";
import { LANGUAGE_IDS } from "@/lib/languages";

export async function POST(req: Request) {
  const rl = rateLimit(ipKey(req, "execute"), 5, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Execution rate limit reached (5 runs/min).", retryAfter: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: { language?: string; code?: string; stdin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { language, code, stdin } = body;
  if (!language || !code) {
    return NextResponse.json({ error: "language and code are required" }, { status: 400 });
  }
  if (!LANGUAGE_IDS.includes(language)) {
    return NextResponse.json({ error: `Unsupported language: ${language}` }, { status: 400 });
  }
  if (code.length > 100_000 || (stdin?.length ?? 0) > 10_000) {
    return NextResponse.json({ error: "Code or stdin is too large." }, { status: 413 });
  }

  try {
    const result = await getProvider().execute({ language, code, stdin, timeoutMs: 10_000 });
    if (result.status === "provider_error") {
      return NextResponse.json({ error: "The execution engine is busy. Please try again in a moment." }, { status: 503 });
    }
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
