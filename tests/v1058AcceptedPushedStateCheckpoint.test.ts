import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.0.58-accepted-pushed-state-checkpoint";
const docPath = "docs/v1.0.58-accepted-pushed-state-checkpoint.md";

describe("v1.0.58 accepted pushed state checkpoint", () => {
  it("documents 5b7a575 as the current accepted pushed closeout", () => {
    const doc = readFileSync(docPath, "utf8");
    for (const required of [phase, "Accepted pushed checkpoint: `v1.0.57 at 5b7a575`", "Accepted pushed commit: `5b7a57584cc66d8b9ef9b7ff905c1682e58a9caa`", "Accepted pushed proof: `/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_0_53_to_v1_0_57_post_closeout_accepted_state_contract_refresh_20260707T061535Z/closeout_push_20260707T062624Z`", "Accepted equality: `HEAD == origin/main == 5b7a57584cc66d8b9ef9b7ff905c1682e58a9caa`", "Prior current checkpoint `720a58a` is historical only, not current.", "Prior checkpoints `5c7f360`, `886631f`, `841dee7`, `870d3a7`, `87420e2`, `8b42744`, `b4b9fcf`, `20485da`, `97574a9`, `80e91c7`, `dfa7052`, `c72f14f`, `d20e125`, `bc8fbef`, `cfa7c2c`, `1465817` are historical only, not current."]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the accepted pushed checkpoint in feature state", () => {
    const state = JSON.parse(readFileSync("feature_list.json", "utf8")).v1058_accepted_pushed_state_checkpoint;
    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.accepted_pushed_short_commit).toBe("5b7a575");
    expect(state.prior_current_accepted_pushed_short_commit).toBe("720a58a");
    expect(state.historical_prior_accepted_pushed_short_commits).toEqual(["720a58a","5c7f360","886631f","841dee7","870d3a7","87420e2","8b42744","b4b9fcf","20485da","97574a9","80e91c7","dfa7052","c72f14f","d20e125","bc8fbef","cfa7c2c","1465817"]);
    expect(state.accepted_pushed).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});
