import { describe, expect, it } from "vitest";
import { GET } from "@/app/health/route";
import { currentAcceptedPushedState, localBundleManualQaStatus } from "@/lib/acceptedState";
import { CURRENT_PHASE } from "@/lib/version";
import { PUBLIC_GRIEVANCE_OUTLINE_PHASE } from "@/lib/publicGrievanceOutline";

describe("public truth runtime identity", () => {
  it("keeps the accepted pushed phase derived from the accepted-state contract", () => {
    expect(CURRENT_PHASE).toBe(currentAcceptedPushedState.accepted_pushed_phase);
    expect(currentAcceptedPushedState.checkpoint_label).toBe("Public Steward Workflow Platform Bundle 3 Core Repairs and Runtime Truth/Favicon Fix at e8a4499");
  });

  it("reports the local bundle phase and distinct repository identities", async () => {
    const response = GET();
    const payload = await response.json();
    expect(payload.phase).toBe(PUBLIC_GRIEVANCE_OUTLINE_PHASE);
    expect(currentAcceptedPushedState.local_bundle_phase).toBe(
      "KIA-Stick-bundle-3-core-repair-post-push-accepted-state-refresh"
    );
    expect(payload.phase).toBe(currentAcceptedPushedState.local_bundle_phase);
    expect(payload.localBundle).toBe("Bundle 3 Core Repair Post-Push Accepted-State Refresh");
    expect(payload.acceptedCheckpoint).toBe(currentAcceptedPushedState.checkpoint_label);
    expect(payload.acceptedCommit).toBe(currentAcceptedPushedState.accepted_pushed_commit);
    expect(payload.acceptedCommit).toBe("e8a4499c6bac349566d0f9eeb66d15d497bcd602");
    expect(payload.repositoryRecordingCommit).toBe(currentAcceptedPushedState.repository_recording_commit);
    expect(payload.repositoryRecordingCommit).toBe("5eb113ae03d6b3db52e840ea2d1b9b5212b6e91f");
    expect(payload.latestPushedCloseoutCommit).toBe(currentAcceptedPushedState.latest_pushed_closeout_commit);
    expect(payload.latestPushedCloseoutCommit).toBe("5eb113ae03d6b3db52e840ea2d1b9b5212b6e91f");
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

  it("reports operator QA PASS for the local accepted-state refresh without claiming a push", async () => {
    const response = GET();
    const payload = await response.json();
    expect(currentAcceptedPushedState.local_bundle_status).toContain("manual QA PASS");
    expect(localBundleManualQaStatus()).toBe("PASS");
    expect(payload.manualQa).toBe(localBundleManualQaStatus());
    expect(payload.manualQa).toBe("PASS");
    expect(payload.pushed).toBe(false);
    expect(payload.acceptedCommit).toBe("e8a4499c6bac349566d0f9eeb66d15d497bcd602");
    expect(payload.latestPushedCloseoutCommit).toBe("5eb113ae03d6b3db52e840ea2d1b9b5212b6e91f");
    expect(payload.productVersion).toBe("0.7.0");
    expect(currentAcceptedPushedState.historical_prior_checkpoints[0]).toEqual({
      checkpoint: "Public Steward Workflow Platform Bundle 3 and Multi-Topic Ambiguity Fail-Closed Repair",
      commit: "96be9069e7694af237823b0da3a30919be60546c",
      short_commit: "96be906",
      status: "historical_only_not_current",
    });
  });
});
