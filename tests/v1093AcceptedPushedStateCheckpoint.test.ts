import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.0.93-accepted-pushed-state-checkpoint";
const docPath = "docs/v1.0.93-accepted-pushed-state-checkpoint.md";

describe("v1.0.93 accepted pushed state checkpoint", () => {
  it("documents 0269435 as the current accepted pushed closeout", () => {
    const doc = readFileSync(docPath, "utf8");
    for (const required of [
      phase,
      "Accepted pushed checkpoint: `v1.0.92 at 0269435`",
      "Accepted pushed commit: `02694353a7cbaa71da9ab0c8bb458790636628cb`",
      "Accepted pushed proof: `/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_0_88_to_v1_0_92_post_closeout_accepted_state_contract_refresh_20260709T093848Z/closeout_push_20260709T095838Z`",
      "Accepted equality: `HEAD == origin/main == 02694353a7cbaa71da9ab0c8bb458790636628cb`",
      "Prior current checkpoint `fcf5097` is historical only, not current.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the accepted pushed checkpoint in feature state", () => {
    const state = JSON.parse(readFileSync("feature_list.json", "utf8")).v1093_accepted_pushed_state_checkpoint;
    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.accepted_pushed_short_commit).toBe("0269435");
    expect(state.prior_current_accepted_pushed_short_commit).toBe("fcf5097");
    expect(state.historical_prior_accepted_pushed_short_commits[0]).toBe("fcf5097");
    expect(state.accepted_pushed).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});

