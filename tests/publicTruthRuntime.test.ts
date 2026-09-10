import { describe, expect, it } from "vitest";
import { GET } from "@/app/health/route";
import { currentAcceptedPushedState, localBundleManualQaStatus } from "@/lib/acceptedState";
import { CURRENT_PHASE } from "@/lib/version";

describe("public truth runtime identity", () => {
  it("keeps the accepted pushed phase derived from the accepted-state contract", () => {
    expect(CURRENT_PHASE).toBe(currentAcceptedPushedState.accepted_pushed_phase);
    expect(currentAcceptedPushedState.checkpoint_label).toBe("Source and Citation Integrity Hardening at 9b0fda9");
  });

  it("reports the local bundle phase and distinct repository identities", async () => {
    const response = GET();
    const payload = await response.json();
    expect(currentAcceptedPushedState.local_bundle_phase).toBe(
      "KIA-Stick-source-citation-integrity-post-push-accepted-state-promotion"
    );
    expect(payload.phase).toBe(currentAcceptedPushedState.local_bundle_phase);
    expect(payload.localBundle).toBe("Source and Citation Integrity Post-Push Accepted-State Promotion");
    expect(payload.acceptedCheckpoint).toBe(currentAcceptedPushedState.checkpoint_label);
    expect(payload.acceptedCommit).toBe(currentAcceptedPushedState.accepted_pushed_commit);
    expect(payload.acceptedCommit).toBe("9b0fda9f562fb7e632e571e6299eb2dcc77b7b1e");
    expect(payload.repositoryRecordingCommit).toBe(currentAcceptedPushedState.repository_recording_commit);
    expect(payload.repositoryRecordingCommit).toBe("ca091d37fd8ff5c8f63fad084b81e5f59a749797");
    expect(payload.latestPushedCloseoutCommit).toBe(currentAcceptedPushedState.latest_pushed_closeout_commit);
    expect(payload.latestPushedCloseoutCommit).toBe("ca091d37fd8ff5c8f63fad084b81e5f59a749797");
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

  it("reports accepted-state promotion pending manual QA for the local bookkeeping bundle without claiming a push", async () => {
    const response = GET();
    const payload = await response.json();
    expect(currentAcceptedPushedState.local_bundle_status).toContain("manual QA pending operator review");
    expect(localBundleManualQaStatus()).toBe("pending_operator_review");
    expect(payload.manualQa).toBe(localBundleManualQaStatus());
    expect(payload.manualQa).toBe("pending_operator_review");
    expect(payload.pushed).toBe(false);
    expect(payload.acceptedCommit).toBe("9b0fda9f562fb7e632e571e6299eb2dcc77b7b1e");
    expect(payload.latestPushedCloseoutCommit).toBe("ca091d37fd8ff5c8f63fad084b81e5f59a749797");
    expect(payload.productVersion).toBe("0.7.0");
    expect(currentAcceptedPushedState.historical_prior_checkpoints[0]).toEqual({
      checkpoint: "Export and Print Copy Helper False-Positive and Runtime Truth Repair",
      commit: "76653608353ab0bb59210aa6fb241346efeb82a9",
      short_commit: "7665360",
      status: "historical_only_not_current",
    });
  });
});
