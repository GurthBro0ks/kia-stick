import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.98-accepted-pushed-state-checkpoint";
const docPath = "docs/v0.9.98-accepted-pushed-state-checkpoint.md";

describe("v0.9.98 accepted pushed state checkpoint", () => {
  it("documents dfa7052 as the current accepted pushed closeout", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Accepted pushed checkpoint: `v0.9.97 at dfa7052`",
      "Accepted pushed commit: `dfa7052e5bd87e8e96362c0e93565a29409964b3`",
      "Accepted pushed proof: `/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_93_to_v0_9_97_operator_qa_pass_closeout_push_20260702T133507Z`",
      "Accepted equality: `HEAD == origin/main == dfa7052e5bd87e8e96362c0e93565a29409964b3`",
      "Prior current checkpoint `c72f14f` is historical only, not current.",
      "Prior checkpoints `d20e125`, `bc8fbef`, `cfa7c2c`, and `1465817` are historical only, not current.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the accepted pushed checkpoint in feature state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0998_accepted_pushed_state_checkpoint: {
        phase: string;
        status: string;
        accepted_pushed_short_commit: string;
        prior_current_accepted_pushed_short_commit: string;
        historical_prior_accepted_pushed_short_commits: string[];
        accepted_pushed: boolean;
        queue_015_status: string;
        real_doc_implementation_approved: boolean;
      };
    };
    const state = featureList.v0998_accepted_pushed_state_checkpoint;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.accepted_pushed_short_commit).toBe("dfa7052");
    expect(state.prior_current_accepted_pushed_short_commit).toBe("c72f14f");
    expect(state.historical_prior_accepted_pushed_short_commits).toEqual(["c72f14f", "d20e125", "bc8fbef", "cfa7c2c", "1465817"]);
    expect(state.accepted_pushed).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});

