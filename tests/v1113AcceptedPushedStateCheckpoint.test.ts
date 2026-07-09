import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.1.13-accepted-pushed-state-checkpoint";
const docPath = "docs/v1.1.13-accepted-pushed-state-checkpoint.md";

describe("v1.1.13 accepted pushed state checkpoint", () => {
  it("documents b911fd1 as the current accepted pushed closeout", () => {
    const doc = readFileSync(docPath, "utf8");
    for (const required of [phase, "Accepted pushed checkpoint: `v1.1.12 at b911fd1`", "Accepted pushed commit: `b911fd1530d5fc106b3368339a439527c2a43538`", "Accepted pushed proof: `/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_8_to_v1_1_12_post_closeout_accepted_state_contract_refresh_20260709T152434Z/closeout_push_20260709T154526Z`", "Accepted equality: `HEAD == origin/main == b911fd1530d5fc106b3368339a439527c2a43538`", "Prior current checkpoint `628fbd4` is historical only, not current."]) expect(doc).toContain(required);
  });

  it("tracks the accepted pushed checkpoint in feature state", () => {
    const state = JSON.parse(readFileSync("feature_list.json", "utf8")).v1113_accepted_pushed_state_checkpoint;
    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.accepted_pushed_short_commit).toBe("b911fd1");
    expect(state.prior_current_accepted_pushed_short_commit).toBe("628fbd4");
    expect(state.historical_prior_accepted_pushed_short_commits[0]).toBe("628fbd4");
    expect(state.accepted_pushed).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});
