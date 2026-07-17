import { NextResponse } from "next/server";
import { readBoundedCbaSourceCache } from "@/lib/cbaSourceServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.search !== "") {
    return NextResponse.json(
      { status: "unavailable", reason: "route_query_rejected" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
  return NextResponse.json(readBoundedCbaSourceCache(), {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
