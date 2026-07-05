import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.0.33-accepted-pushed-state-checkpoint";
const docPath = "docs/v1.0.33-accepted-pushed-state-checkpoint.md";

describe("v1.0.33 accepted pushed state checkpoint", () => {
  it("documents 870d3a7 as the current accepted pushed closeout", () => {
    const doc = readFileSync(docPath, "utf8");
    for (const required of [phase, "Accepted pushed checkpoint: `v1.0.32 at 870d3a7`", "Accepted pushed commit: `870d3a77002548765154d73b2c088c1327580c6a`", "Accepted pushed proof: `/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_0_28_to_v1_0_32_post_closeout_accepted_state_contract_refresh_20260703T170231Z/closeout_push_20260703T172936Z`", "Accepted equality: `HEAD == origin/main == 870d3a77002548765154d73b2c088c1327580c6a`", "Prior current checkpoint `87420e2` is historical only, not current.", "Prior checkpoints `8b42744`, `b4b9fcf`, `20485da`, `97574a9`, `80e91c7`, `dfa7052`, `c72f14f`, `d20e125`, `bc8fbef`, `cfa7c2c`, and `1465817` are historical only, not current."]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the accepted pushed checkpoint in feature state", () => {
    const state = JSON.parse(readFileSync("feature_list.json", "utf8")).v1033_accepted_pushed_state_checkpoint;
    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.accepted_pushed_short_commit).toBe("870d3a7");
    expect(state.prior_current_accepted_pushed_short_commit).toBe("87420e2");
    expect(state.historical_prior_accepted_pushed_short_commits).toEqual(["87420e2","8b42744","b4b9fcf","20485da","97574a9","80e91c7","dfa7052","c72f14f","d20e125","bc8fbef","cfa7c2c","1465817"]);
    expect(state.accepted_pushed).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});
