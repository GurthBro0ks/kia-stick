import { NextResponse } from "next/server";
import { corpus } from "@/lib/sourceModel";
import { getRuntimeVersion } from "@/lib/serverVersion";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    app: "kia-stick",
    phase: "KIA-Stick-v0.1-mobile-ui-manual-qa-fix",
    targetMachine: "USER_LAPTOP_ONLY",
    fakeOnly: true,
    realDbTouched: false,
    cloudRequired: false,
    apiKeyRequired: false,
    docs: corpus.docs.length,
    version: getRuntimeVersion(),
  });
}
