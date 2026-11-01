import { describe, expect, it } from "vitest";
import { GET } from "@/app/health/route";
import { currentAcceptedPushedState, localBundleManualQaStatus } from "@/lib/acceptedState";
import { CURRENT_PHASE } from "@/lib/version";

describe("public truth runtime identity", () => {
  it("keeps the accepted pushed phase derived from the accepted-state contract", () => {
    expect(CURRENT_PHASE).toBe(currentAcceptedPushedState.accepted_pushed_phase);
    expect(currentAcceptedPushedState.checkpoint_label).toBe("Sources load-failure reload message at 4d47f5f");
  });

  it("reports the local bundle phase and distinct repository identities", async () => {
    const response = GET();
    const payload = await response.json();
    expect(currentAcceptedPushedState.local_bundle_phase).toBe(
      "KIA-sources-load-acceptance-1"
    );
    expect(payload.phase).toBe(currentAcceptedPushedState.local_bundle_phase);
    expect(payload.localBundle).toBe("Sources load-failure accepted-checkpoint refresh");
    expect(payload.acceptedCheckpoint).toBe(currentAcceptedPushedState.checkpoint_label);
    expect(payload.acceptedCommit).toBe(currentAcceptedPushedState.accepted_pushed_commit);
    expect(payload.acceptedCommit).toBe("4d47f5f6f2e7ee3a1d76b4058cc89548afcc157c");
    expect(payload.repositoryRecordingCommit).toBe(currentAcceptedPushedState.repository_recording_commit);
    expect(payload.repositoryRecordingCommit).toBe("9d4166550daa8ac628f8243d5e47a3be6a6e4b1c");
    expect(payload.latestPushedCloseoutCommit).toBe(currentAcceptedPushedState.latest_pushed_closeout_commit);
    expect(payload.latestPushedCloseoutCommit).toBe("9d4166550daa8ac628f8243d5e47a3be6a6e4b1c");
    expect(new Set([
      payload.acceptedCommit,
      payload.repositoryRecordingCommit,
      payload.latestPushedCloseoutCommit,
    ])).toHaveLength(2);
    expect(payload.repositoryRecordingCommit).toBe(payload.latestPushedCloseoutCommit);
    expect(payload).not.toHaveProperty("repositoryEqualityCommit");
    expect(payload).not.toHaveProperty("repositoryHead");
    expect(payload.gitSha).toBe(payload.version.gitSha);
    expect(payload.gitSha).not.toBe(payload.acceptedCommit);
    expect(payload.gitSha).not.toBe(payload.repositoryRecordingCommit);
    expect(payload.gitSha).not.toBe(payload.latestPushedCloseoutCommit);
    expect(payload.productVersion).toBe("0.7.0");
    expect(payload.provider).toBe("local-fake-deterministic");
    expect(payload.dataModes).toEqual({
      fake_corpus: "available",
      public_sources: "available_exact_allowlisted",
      private_data: "blocked",
      external_ai: "disabled",
    });
    expect(payload).not.toHaveProperty("fakeOnly");
    expect(payload.realDbTouched).toBe(false);
    expect(payload.cloudRequired).toBe(false);
    expect(payload.apiKeyRequired).toBe(false);
  });

  it("reports operator QA PASS for the local accepted-state promotion without claiming a push", async () => {
    const response = GET();
    const payload = await response.json();
    expect(currentAcceptedPushedState.local_bundle_status).toContain("manual QA PASS");
    expect(localBundleManualQaStatus()).toBe("PASS");
    expect(payload.manualQa).toBe(localBundleManualQaStatus());
    expect(payload.manualQa).toBe("PASS");
    expect(payload.pushed).toBe(false);
    expect(payload.acceptedCommit).toBe("4d47f5f6f2e7ee3a1d76b4058cc89548afcc157c");
    expect(payload.latestPushedCloseoutCommit).toBe("9d4166550daa8ac628f8243d5e47a3be6a6e4b1c");
    expect(payload.productVersion).toBe("0.7.0");
    expect(currentAcceptedPushedState.historical_prior_checkpoints[0]).toEqual({
      checkpoint: "Hermetic JCIM/CBA Fixtures and Opt-In Real-Cache Gates",
      commit: "20562b3a0112f6430ac1707ec8a9f7681d4af5f7",
      short_commit: "20562b3",
      status: "historical_only_not_current",
    });
  });
});
