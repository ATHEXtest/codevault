import { NextResponse } from "next/server";
import { getProvider } from "@/lib/execution";
import { pingDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, boolean | string> = {};
  try {
    const provider = getProvider();
    checks.executionProvider = provider.name;
    checks.execution = await provider.healthCheck();
  } catch (e) {
    checks.execution = false;
    checks.executionError = (e as Error).message;
  }
  checks.database = await pingDb();
  const ok = checks.execution === true && checks.database === true;
  return NextResponse.json(checks, { status: ok ? 200 : 503 });
}
