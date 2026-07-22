import { describe, expect, it } from "vitest";
import { GET } from "@/app/health/route";
import { currentAcceptedPushedState } from "@/lib/acceptedState";
import { CURRENT_PHASE } from "@/lib/version";

describe("public truth runtime identity", () => {
  it("keeps the accepted pushed phase derived from the accepted-state contract", () => {
    expect(CURRENT_PHASE).toBe(currentAcceptedPushedState.accepted_pushed_phase);
    expect(currentAcceptedPushedState.checkpoint_label).toBe("Public Settings User Summary and Operator Diagnostics Split at 76c7312");
  });

  it("reports the local bundle phase and distinct repository identities", async () => {
    const response = GET();
    const payload = await response.json();
    expect(payload.phase).toBe(currentAcceptedPushedState.local_bundle_phase);
    expect(payload.phase).toBe("KIA-Stick-stale-local-bundle-push-status-repair");
    expect(payload.acceptedCheckpoint).toBe(currentAcceptedPushedState.checkpoint_label);
    expect(payload.acceptedCommit).toBe(currentAcceptedPushedState.accepted_pushed_commit);
    expect(payload.acceptedCommit).toBe("76c73122a87cb23b5b8595a002d54d7a127fbba8");
    expect(payload.repositoryRecordingCommit).toBe(currentAcceptedPushedState.repository_recording_commit);
    expect(payload.repositoryRecordingCommit).toBe("3690c74650d0fb19395bd046adee1bf236950f9e");
    expect(payload.latestPushedCloseoutCommit).toBe(currentAcceptedPushedState.latest_pushed_closeout_commit);
    expect(payload.latestPushedCloseoutCommit).toBe("0695680047608462b5f154a9ed82593e6923932a");
    expect(new Set([
      payload.acceptedCommit,
      payload.repositoryRecordingCommit,
      payload.latestPushedCloseoutCommit,
    ])).toHaveLength(3);
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
});
