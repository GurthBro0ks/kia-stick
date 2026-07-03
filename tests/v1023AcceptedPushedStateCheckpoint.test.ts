import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.0.23-accepted-pushed-state-checkpoint";
const docPath = "docs/v1.0.23-accepted-pushed-state-checkpoint.md";

describe("v1.0.23 accepted pushed state checkpoint", () => {
  it("documents 8b42744 as the current accepted pushed closeout", () => {
    const doc = readFileSync(docPath, "utf8");
    for (const required of [phase, "Accepted pushed checkpoint: `v1.0.22 at 8b42744`", "Accepted pushed commit: `8b4274413ca056a4b647a163fd79c8165a024820`", "Accepted pushed proof: `/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_0_18_to_v1_0_22_operator_qa_pass_closeout_push_20260703T151240Z`", "Accepted equality: `HEAD == origin/main == 8b4274413ca056a4b647a163fd79c8165a024820`", "Prior current checkpoint `b4b9fcf` is historical only, not current.", "Prior checkpoints `20485da`, `97574a9`, `80e91c7`, `dfa7052`, `c72f14f`, `d20e125`, `bc8fbef`, `cfa7c2c`, and `1465817` are historical only, not current."]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the accepted pushed checkpoint in feature state", () => {
    const state = JSON.parse(readFileSync("feature_list.json", "utf8")).v1023_accepted_pushed_state_checkpoint;
    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.accepted_pushed_short_commit).toBe("8b42744");
    expect(state.prior_current_accepted_pushed_short_commit).toBe("b4b9fcf");
    expect(state.historical_prior_accepted_pushed_short_commits).toEqual(["b4b9fcf", "20485da", "97574a9", "80e91c7", "dfa7052", "c72f14f", "d20e125", "bc8fbef", "cfa7c2c", "1465817"]);
    expect(state.accepted_pushed).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});
