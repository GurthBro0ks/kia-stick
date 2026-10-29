import { NextResponse } from "next/server";
import { corpus } from "@/lib/sourceModel";
import { getRuntimeVersion } from "@/lib/serverVersion";
import { publicSourcesHealth } from "@/lib/publicSourcesHealth";
import { currentAcceptedPushedState, localBundleManualQaStatus } from "@/lib/acceptedState";
import {
  PUBLIC_STEWARD_WORKFLOW_TOPICS,
} from "@/lib/publicStewardWorkflowRegistry";

export const dynamic = "force-dynamic";

export function GET() {
  const version = getRuntimeVersion();

  return NextResponse.json({
    ok: true,
    app: "kia-stick",
    phase: currentAcceptedPushedState.local_bundle_phase,
    localBundle: currentAcceptedPushedState.local_bundle,
    localValidation: currentAcceptedPushedState.local_bundle_validation,
    pushed: currentAcceptedPushedState.local_bundle_pushed,
    manualQa: localBundleManualQaStatus(),
    acceptedCheckpoint: currentAcceptedPushedState.checkpoint_label,
    acceptedCommit: currentAcceptedPushedState.accepted_pushed_commit,
    repositoryRecordingCommit: currentAcceptedPushedState.repository_recording_commit,
    latestPushedCloseoutCommit: currentAcceptedPushedState.latest_pushed_closeout_commit,
    targetMachine: "USER_LAPTOP_ONLY",
    dataModes: currentAcceptedPushedState.data_modes,
    publicSources: publicSourcesHealth(),
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
    // Additive label block: the fields above that come from the data file are recorded metadata, not live build state.
    stateRecord: {
      source: "data/current-accepted-pushed-state.json",
      kind: "recorded_metadata_not_live_build_state",
      liveBuildIdentity: "gitSha",
      recordedFields: [
        "phase",
        "localBundle",
        "localValidation",
        "pushed",
        "manualQa",
        "acceptedCheckpoint",
        "acceptedCommit",
        "repositoryRecordingCommit",
        "latestPushedCloseoutCommit",
      ],
      note: "phase, localBundle, localValidation, pushed and manualQa are the last recorded local-bundle record; acceptedCheckpoint, acceptedCommit, repositoryRecordingCommit and latestPushedCloseoutCommit are recorded accepted-checkpoint facts. Neither describes the running build; gitSha is the only live build identity.",
      localBundle: {
        label: "last recorded local bundle (not the running build)",
        phase: currentAcceptedPushedState.local_bundle_phase,
        validation: currentAcceptedPushedState.local_bundle_validation,
        pushed: currentAcceptedPushedState.local_bundle_pushed,
        manualQa: currentAcceptedPushedState.local_bundle_manual_qa,
      },
      acceptedCheckpoint: {
        label: currentAcceptedPushedState.checkpoint_label,
        commit: currentAcceptedPushedState.accepted_pushed_commit,
        pushed: currentAcceptedPushedState.accepted_pushed,
        manualQa: currentAcceptedPushedState.accepted_manual_qa,
      },
    },
  });
}
