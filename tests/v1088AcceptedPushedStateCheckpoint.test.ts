import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.0.88-accepted-pushed-state-checkpoint";
const docPath = "docs/v1.0.88-accepted-pushed-state-checkpoint.md";

describe("v1.0.88 accepted pushed state checkpoint", () => {
  it("documents fcf5097 as the current accepted pushed closeout", () => {
    const doc = readFileSync(docPath, "utf8");
    for (const required of [
      phase,
      "Accepted pushed checkpoint: `v1.0.87 at fcf5097`",
      "Accepted pushed commit: `fcf5097fa2b43fd4d3a70ceaf68a02e29913ec0e`",
      "Accepted pushed proof: `/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_0_83_to_v1_0_87_post_closeout_accepted_state_contract_refresh_20260709T091133Z/closeout_push_20260709T093102Z`",
      "Accepted equality: `HEAD == origin/main == fcf5097fa2b43fd4d3a70ceaf68a02e29913ec0e`",
      "Prior current checkpoint `6ca589d` is historical only, not current.",
      "Prior checkpoints `f662b37`, `cf2be1f`, `d099ff5`, `73b3f38`, `5b7a575`, `720a58a`, `5c7f360`, `886631f`, `841dee7`, `870d3a7`, `87420e2`, `8b42744`, `b4b9fcf`, `20485da`, `97574a9`, `80e91c7`, `dfa7052`, `c72f14f`, `d20e125`, `bc8fbef`, `cfa7c2c`, `1465817` are historical only, not current.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the accepted pushed checkpoint in feature state", () => {
    const state = JSON.parse(readFileSync("feature_list.json", "utf8")).v1088_accepted_pushed_state_checkpoint;
    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.accepted_pushed_short_commit).toBe("fcf5097");
    expect(state.prior_current_accepted_pushed_short_commit).toBe("6ca589d");
    expect(state.historical_prior_accepted_pushed_short_commits).toEqual(["6ca589d","f662b37","cf2be1f","d099ff5","73b3f38","5b7a575","720a58a","5c7f360","886631f","841dee7","870d3a7","87420e2","8b42744","b4b9fcf","20485da","97574a9","80e91c7","dfa7052","c72f14f","d20e125","bc8fbef","cfa7c2c","1465817"]);
    expect(state.accepted_pushed).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});
