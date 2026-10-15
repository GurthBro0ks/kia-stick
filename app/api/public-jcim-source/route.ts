import { NextResponse } from "next/server";
import { readJcimCache, verifyJcimLiveIdentity } from "@/lib/jcimSourceServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (new URL(request.url).search !== "") return NextResponse.json({ status: "unavailable", reason: "cache_unsafe" }, { status: 400 });
  const cache = readJcimCache();
  const state = cache.status === "available" && await verifyJcimLiveIdentity()
    ? cache : { status: "unavailable" as const, reason: "unverified_current" as const };
  return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
}
