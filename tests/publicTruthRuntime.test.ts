import { describe, expect, it } from "vitest";
import { GET } from "@/app/health/route";
import { currentAcceptedPushedState } from "@/lib/acceptedState";
import { CURRENT_PHASE } from "@/lib/version";

describe("public truth runtime identity", () => {
  it("derives the runtime phase from the accepted-state contract", () => {
    expect(CURRENT_PHASE).toBe(currentAcceptedPushedState.accepted_pushed_phase);
    expect(currentAcceptedPushedState.checkpoint_label).toBe("CBA Citation Durability Source Instance and Resync Drift Guard at 1e0e96b");
  });

  it("reports explicit data modes instead of a fake-only claim", async () => {
    const response = GET();
    const payload = await response.json();
    expect(payload.phase).toBe(currentAcceptedPushedState.accepted_pushed_phase);
    expect(payload.acceptedCheckpoint).toBe(currentAcceptedPushedState.checkpoint_label);
    expect(payload.acceptedCommit).toBe(currentAcceptedPushedState.accepted_pushed_commit);
    expect(payload.dataModes).toEqual({
      fake_corpus: "available",
      public_sources: "available_exact_allowlisted",
      private_data: "blocked",
      external_ai: "disabled",
    });
    expect(payload).not.toHaveProperty("fakeOnly");
    expect(payload.realDbTouched).toBe(false);
  });
});
