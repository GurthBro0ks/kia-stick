import { NextResponse } from "next/server";
import { corpus } from "@/lib/sourceModel";
import { getRuntimeVersion } from "@/lib/serverVersion";
import { currentAcceptedPushedState } from "@/lib/acceptedState";

export const dynamic = "force-dynamic";
const LOCAL_RUNTIME_PHASE = "KIA-Stick-public-Weingarten-cited-argument-builder-pilot";

export function GET() {
  const version = getRuntimeVersion();

  return NextResponse.json({
    ok: true,
    app: "kia-stick",
    phase: LOCAL_RUNTIME_PHASE,
    acceptedCheckpoint: currentAcceptedPushedState.checkpoint_label,
    acceptedCommit: currentAcceptedPushedState.accepted_pushed_commit,
    repositoryRecordingCommit: currentAcceptedPushedState.repository_recording_commit,
    latestPushedCloseoutCommit: currentAcceptedPushedState.latest_pushed_closeout_commit,
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
