import { describe, expect, it } from "vitest";
import { GET } from "@/app/health/route";
import { currentAcceptedPushedState } from "@/lib/acceptedState";
import { getRuntimeVersion } from "@/lib/serverVersion";

// Expectations come from the sanctioned accepted-state module (the governance test bounds direct data-file
// readers), mapped field by field here so they do not depend on the route's own wiring.
const state = currentAcceptedPushedState as unknown as Record<string, unknown>;

// Keys /health exposed before the stateRecord label block was added; they must stay exactly as they were.
const legacyKeys = [
  "ok",
  "app",
  "phase",
  "localBundle",
  "localValidation",
  "pushed",
  "manualQa",
  "acceptedCheckpoint",
  "acceptedCommit",
  "repositoryRecordingCommit",
  "latestPushedCloseoutCommit",
  "targetMachine",
  "dataModes",
  "publicSources",
  "supportedStewardTopicCount",
  "privateData",
  "externalAi",
  "realDbTouched",
  "cloudRequired",
  "apiKeyRequired",
  "docs",
  "productVersion",
  "channel",
  "buildDate",
  "gitSha",
  "displayVersion",
  "corpusVersion",
  "indexVersion",
  "promptVersion",
  "provider",
  "version",
];

async function health(): Promise<Record<string, unknown>> {
  return (await GET().json()) as Record<string, unknown>;
}

describe("/health stateRecord labels", () => {
  it("keeps every legacy key and its recorded value unchanged", async () => {
    const body = await health();
    expect(Object.keys(body)).toEqual([...legacyKeys, "stateRecord"]);
    expect(body.phase).toBe(state.local_bundle_phase);
    expect(body.localBundle).toBe(state.local_bundle);
    expect(body.localValidation).toBe(state.local_bundle_validation);
    expect(body.pushed).toBe(state.local_bundle_pushed);
    expect(body.manualQa).toBe(state.local_bundle_manual_qa);
    expect(body.acceptedCheckpoint).toBe(state.checkpoint_label);
    expect(body.acceptedCommit).toBe(state.accepted_pushed_commit);
    expect(body.repositoryRecordingCommit).toBe(state.repository_recording_commit);
    expect(body.latestPushedCloseoutCommit).toBe(state.latest_pushed_closeout_commit);
    expect(body.dataModes).toEqual(state.data_modes);
    expect(body.gitSha).toBe(getRuntimeVersion().gitSha);
  });

  it("labels the recorded fields as metadata and names gitSha as the only live identity", async () => {
    const body = await health();
    expect(body.stateRecord).toEqual({
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
        phase: state.local_bundle_phase,
        validation: state.local_bundle_validation,
        pushed: state.local_bundle_pushed,
        manualQa: state.local_bundle_manual_qa,
      },
      acceptedCheckpoint: {
        label: state.checkpoint_label,
        commit: state.accepted_pushed_commit,
        pushed: state.accepted_pushed,
        manualQa: state.accepted_manual_qa,
      },
    });
  });

  it("puts the accepted checkpoint pushed value beside the local-bundle pushed value without calling the local bundle accepted", async () => {
    const record = (await health()).stateRecord as {
      localBundle: { label: string; pushed: boolean };
      acceptedCheckpoint: { pushed: boolean };
    };
    expect(state.accepted_pushed).toBe(true);
    expect(record.acceptedCheckpoint.pushed).toBe(state.accepted_pushed);
    expect(record.localBundle.pushed).toBe(state.local_bundle_pushed);
    expect(record.localBundle.label.toLowerCase()).not.toContain("accepted checkpoint");
  });
});
