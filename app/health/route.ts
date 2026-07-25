import { NextResponse } from "next/server";
import { corpus } from "@/lib/sourceModel";
import { getRuntimeVersion } from "@/lib/serverVersion";
import { currentAcceptedPushedState } from "@/lib/acceptedState";
import {
  PUBLIC_STEWARD_WORKFLOW_TOPICS,
} from "@/lib/publicStewardWorkflowRegistry";

export const dynamic = "force-dynamic";
const LOCAL_RUNTIME_PHASE =
  "KIA-Stick-public-steward-workflow-platform-bundle-2-topic-expansion-and-packet-workspace";

export function GET() {
  const version = getRuntimeVersion();

  return NextResponse.json({
    ok: true,
    app: "kia-stick",
    phase: LOCAL_RUNTIME_PHASE,
    localBundle: "Public Steward Workflow Platform Bundle 2",
    localValidation: "PASS",
    pushed: false,
    manualQa: "pending_operator_review",
    acceptedCheckpoint: currentAcceptedPushedState.checkpoint_label,
    acceptedCommit: currentAcceptedPushedState.accepted_pushed_commit,
    repositoryRecordingCommit: currentAcceptedPushedState.repository_recording_commit,
    latestPushedCloseoutCommit: currentAcceptedPushedState.latest_pushed_closeout_commit,
    targetMachine: "USER_LAPTOP_ONLY",
    dataModes: currentAcceptedPushedState.data_modes,
    publicSources: {
      count: 2,
      accessMode: "exact_allowlisted_read_only",
      available: true,
    },
    supportedStewardTopicCount: PUBLIC_STEWARD_WORKFLOW_TOPICS.length,
    privateData: "blocked",
    externalAi: "disabled",
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
