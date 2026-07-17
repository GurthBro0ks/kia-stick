import { NextResponse } from "next/server";
import { corpus } from "@/lib/sourceModel";
import { getRuntimeVersion } from "@/lib/serverVersion";
import { currentAcceptedPushedState } from "@/lib/acceptedState";

export const dynamic = "force-dynamic";

export function GET() {
  const version = getRuntimeVersion();

  return NextResponse.json({
    ok: true,
    app: "kia-stick",
    phase: currentAcceptedPushedState.accepted_pushed_phase,
    acceptedCheckpoint: currentAcceptedPushedState.checkpoint_label,
    acceptedCommit: currentAcceptedPushedState.accepted_pushed_commit,
    targetMachine: "USER_LAPTOP_ONLY",
    dataModes: currentAcceptedPushedState.data_modes,
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
