import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.0.13-accepted-pushed-state-checkpoint";
const docPath = "docs/v1.0.13-accepted-pushed-state-checkpoint.md";

describe("v1.0.13 accepted pushed state checkpoint", () => {
  it("documents 20485da as the current accepted pushed closeout", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Accepted pushed checkpoint: `v1.0.12 at 20485da`",
      "Accepted pushed commit: `20485da8d731ac94a12dd58d77a68e64bf296c5b`",
      "Accepted pushed proof: `/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_0_8_to_v1_0_12_operator_qa_pass_closeout_push_20260702T172824Z`",
      "Accepted equality: `HEAD == origin/main == 20485da8d731ac94a12dd58d77a68e64bf296c5b`",
      "Prior current checkpoint `97574a9` is historical only, not current.",
      "Prior checkpoints `80e91c7`, `dfa7052`, `c72f14f`, `d20e125`, `bc8fbef`, `cfa7c2c`, and `1465817` are historical only, not current.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the accepted pushed checkpoint in feature state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v1013_accepted_pushed_state_checkpoint: {
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
    const state = featureList.v1013_accepted_pushed_state_checkpoint;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.accepted_pushed_short_commit).toBe("20485da");
    expect(state.prior_current_accepted_pushed_short_commit).toBe("97574a9");
    expect(state.historical_prior_accepted_pushed_short_commits).toEqual([
      "97574a9",
      "80e91c7",
      "dfa7052",
      "c72f14f",
      "d20e125",
      "bc8fbef",
      "cfa7c2c",
      "1465817",
    ]);
    expect(state.accepted_pushed).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});
