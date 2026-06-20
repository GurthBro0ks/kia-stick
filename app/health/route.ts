import { NextResponse } from "next/server";
import { corpus } from "@/lib/sourceModel";
import { getRuntimeVersion } from "@/lib/serverVersion";

export const dynamic = "force-dynamic";

export function GET() {
  const version = getRuntimeVersion();

  return NextResponse.json({
    ok: true,
    app: "kia-stick",
    phase: "KIA-Stick-v0.4-chat-layout-blocker-fix",
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
