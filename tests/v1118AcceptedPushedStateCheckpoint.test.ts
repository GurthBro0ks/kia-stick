import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.1.18-accepted-pushed-state-checkpoint";
const docPath = "docs/v1.1.18-accepted-pushed-state-checkpoint.md";

describe("v1.1.18 accepted pushed state checkpoint", () => {
  it("documents aa8f8c6 as the current accepted pushed closeout", () => {
    const doc = readFileSync(docPath, "utf8");
    for (const required of [phase, "Accepted pushed checkpoint: `v1.1.17 at aa8f8c6`", "Accepted pushed commit: `aa8f8c651a000037f403abd41bc206bda161a861`", "Accepted pushed proof: `/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_13_to_v1_1_17_post_closeout_accepted_state_contract_refresh_20260709T162119Z/closeout_push_20260709T164333Z`", "Accepted equality: `HEAD == origin/main == aa8f8c651a000037f403abd41bc206bda161a861`", "Prior current checkpoint `b911fd1` is historical only, not current."]) expect(doc).toContain(required);
  });

  it("tracks the accepted pushed checkpoint in feature state", () => {
    const state = JSON.parse(readFileSync("feature_list.json", "utf8")).v1118_accepted_pushed_state_checkpoint;
    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.accepted_pushed_short_commit).toBe("aa8f8c6");
    expect(state.prior_current_accepted_pushed_short_commit).toBe("b911fd1");
    expect(state.historical_prior_accepted_pushed_short_commits[0]).toBe("b911fd1");
    expect(state.accepted_pushed).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});
