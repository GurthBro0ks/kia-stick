import { NextResponse } from "next/server";
import { corpus } from "@/lib/sourceModel";
import { getRuntimeVersion } from "@/lib/serverVersion";
import { CURRENT_PHASE } from "@/lib/version";

export const dynamic = "force-dynamic";

export function GET() {
  const version = getRuntimeVersion();

  return NextResponse.json({
    ok: true,
    app: "kia-stick",
    phase: CURRENT_PHASE,
    targetMachine: "USER_LAPTOP_ONLY",
    fakeOnly: true,
    realDbTouched: false,
    cloudRequired: false,
    apiKeyRequired: false,
    docs: corpus.docs.length,
    productVersion: version.productVersion,
    channel: version.channel,
    buildDate: version.buildDate,
    gitSha: version.gitSha,
    displayVersion: version.displayVersion,
    corpusVersion: version.corpusVersion,
    indexVersion: version.indexVersion,
    promptVersion: version.promptVersion,
    provider: version.provider,
    version,
  });
}
