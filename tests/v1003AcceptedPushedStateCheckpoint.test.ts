import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.0.3-accepted-pushed-state-checkpoint";
const docPath = "docs/v1.0.3-accepted-pushed-state-checkpoint.md";

describe("v1.0.3 accepted pushed state checkpoint", () => {
  it("documents 80e91c7 as the current accepted pushed closeout", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Accepted pushed checkpoint: `v1.0.2 at 80e91c7`",
      "Accepted pushed commit: `80e91c74855dae6ee51bd9068e2794d08c495ec0`",
      "Accepted pushed proof: `/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_98_to_v1_0_2_operator_qa_pass_closeout_push_20260702T151814Z`",
      "Accepted equality: `HEAD == origin/main == 80e91c74855dae6ee51bd9068e2794d08c495ec0`",
      "Prior current checkpoint `dfa7052` is historical only, not current.",
      "Prior checkpoints `c72f14f`, `d20e125`, `bc8fbef`, `cfa7c2c`, and `1465817` are historical only, not current.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the accepted pushed checkpoint in feature state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v1003_accepted_pushed_state_checkpoint: {
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
    const state = featureList.v1003_accepted_pushed_state_checkpoint;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.accepted_pushed_short_commit).toBe("80e91c7");
    expect(state.prior_current_accepted_pushed_short_commit).toBe("dfa7052");
    expect(state.historical_prior_accepted_pushed_short_commits).toEqual(["dfa7052", "c72f14f", "d20e125", "bc8fbef", "cfa7c2c", "1465817"]);
    expect(state.accepted_pushed).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});
