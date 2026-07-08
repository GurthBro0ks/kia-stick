import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.0.68-accepted-pushed-state-checkpoint";
const docPath = "docs/v1.0.68-accepted-pushed-state-checkpoint.md";

describe("v1.0.68 accepted pushed state checkpoint", () => {
  it("documents d099ff5 as the current accepted pushed closeout", () => {
    const doc = readFileSync(docPath, "utf8");
    for (const required of [phase, "Accepted pushed checkpoint: `v1.0.67 at d099ff5`", "Accepted pushed commit: `d099ff5b163e3b5db0bcc8a0b50d683f9448c8b0`", "Accepted pushed proof: `/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_0_63_to_v1_0_67_post_closeout_accepted_state_contract_refresh_20260708T145606Z/closeout_push_20260708T150959Z`", "Accepted equality: `HEAD == origin/main == d099ff5b163e3b5db0bcc8a0b50d683f9448c8b0`", "Prior current checkpoint `73b3f38` is historical only, not current.", "Prior checkpoints `5b7a575`, `720a58a`, `5c7f360`, `886631f`, `841dee7`, `870d3a7`, `87420e2`, `8b42744`, `b4b9fcf`, `20485da`, `97574a9`, `80e91c7`, `dfa7052`, `c72f14f`, `d20e125`, `bc8fbef`, `cfa7c2c`, `1465817` are historical only, not current."]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the accepted pushed checkpoint in feature state", () => {
    const state = JSON.parse(readFileSync("feature_list.json", "utf8")).v1068_accepted_pushed_state_checkpoint;
    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.accepted_pushed_short_commit).toBe("d099ff5");
    expect(state.prior_current_accepted_pushed_short_commit).toBe("73b3f38");
    expect(state.historical_prior_accepted_pushed_short_commits).toEqual(["73b3f38","5b7a575","720a58a","5c7f360","886631f","841dee7","870d3a7","87420e2","8b42744","b4b9fcf","20485da","97574a9","80e91c7","dfa7052","c72f14f","d20e125","bc8fbef","cfa7c2c","1465817"]);
    expect(state.accepted_pushed).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});

