import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.0.53-accepted-pushed-state-checkpoint";
const docPath = "docs/v1.0.53-accepted-pushed-state-checkpoint.md";

describe("v1.0.53 accepted pushed state checkpoint", () => {
  it("documents 720a58a as the current accepted pushed closeout", () => {
    const doc = readFileSync(docPath, "utf8");
    for (const required of [phase, "Accepted pushed checkpoint: `v1.0.52 at 720a58a`", "Accepted pushed commit: `720a58a1973e77dd3617fa0558478ae8c9b96214`", "Accepted pushed proof: `/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_0_48_to_v1_0_52_post_closeout_accepted_state_contract_refresh_20260707T055347Z/closeout_push_20260707T060707Z`", "Accepted equality: `HEAD == origin/main == 720a58a1973e77dd3617fa0558478ae8c9b96214`", "Prior current checkpoint `5c7f360` is historical only, not current.", "Prior checkpoints `886631f`, `841dee7`, `870d3a7`, `87420e2`, `8b42744`, `b4b9fcf`, `20485da`, `97574a9`, `80e91c7`, `dfa7052`, `c72f14f`, `d20e125`, `bc8fbef`, `cfa7c2c`, and `1465817` are historical only, not current."]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the accepted pushed checkpoint in feature state", () => {
    const state = JSON.parse(readFileSync("feature_list.json", "utf8")).v1053_accepted_pushed_state_checkpoint;
    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.accepted_pushed_short_commit).toBe("720a58a");
    expect(state.prior_current_accepted_pushed_short_commit).toBe("5c7f360");
    expect(state.historical_prior_accepted_pushed_short_commits).toEqual(["5c7f360","886631f","841dee7","870d3a7","87420e2","8b42744","b4b9fcf","20485da","97574a9","80e91c7","dfa7052","c72f14f","d20e125","bc8fbef","cfa7c2c","1465817"]);
    expect(state.accepted_pushed).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});
