import { NextResponse } from "next/server";
import { pruneExpired } from "@/lib/db";

export const dynamic = "force-dynamic";

// Called by Vercel Cron, which sends "Authorization: Bearer $CRON_SECRET".
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const pruned = await pruneExpired();
  return NextResponse.json({ pruned });
}
