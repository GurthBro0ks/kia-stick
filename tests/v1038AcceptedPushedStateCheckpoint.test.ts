import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.0.38-accepted-pushed-state-checkpoint";
const docPath = "docs/v1.0.38-accepted-pushed-state-checkpoint.md";

describe("v1.0.38 accepted pushed state checkpoint", () => {
  it("documents 841dee7 as the current accepted pushed closeout", () => {
    const doc = readFileSync(docPath, "utf8");
    for (const required of [phase, "Accepted pushed checkpoint: `v1.0.37 at 841dee7`", "Accepted pushed commit: `841dee7d44e2af18d60500b13880ba99c1bee9a6`", "Accepted pushed proof: `/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_0_33_to_v1_0_37_post_closeout_accepted_state_contract_refresh_20260705T015123Z/closeout_push_20260705T225257Z`", "Accepted equality: `HEAD == origin/main == 841dee7d44e2af18d60500b13880ba99c1bee9a6`", "Prior current checkpoint `870d3a7` is historical only, not current.", "Prior checkpoints `87420e2`, `8b42744`, `b4b9fcf`, `20485da`, `97574a9`, `80e91c7`, `dfa7052`, `c72f14f`, `d20e125`, `bc8fbef`, `cfa7c2c`, and `1465817` are historical only, not current."]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the accepted pushed checkpoint in feature state", () => {
    const state = JSON.parse(readFileSync("feature_list.json", "utf8")).v1038_accepted_pushed_state_checkpoint;
    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.accepted_pushed_short_commit).toBe("841dee7");
    expect(state.prior_current_accepted_pushed_short_commit).toBe("870d3a7");
    expect(state.historical_prior_accepted_pushed_short_commits).toEqual(["870d3a7","87420e2","8b42744","b4b9fcf","20485da","97574a9","80e91c7","dfa7052","c72f14f","d20e125","bc8fbef","cfa7c2c","1465817"]);
    expect(state.accepted_pushed).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});
