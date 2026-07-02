import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.0.8-accepted-pushed-state-checkpoint";
const docPath = "docs/v1.0.8-accepted-pushed-state-checkpoint.md";

describe("v1.0.8 accepted pushed state checkpoint", () => {
  it("documents 97574a9 as the current accepted pushed closeout", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Accepted pushed checkpoint: `v1.0.7 at 97574a9`",
      "Accepted pushed commit: `97574a91a5c19fda174ccd646aac96d3aaec688a`",
      "Accepted pushed proof: `/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_0_3_to_v1_0_7_operator_qa_pass_closeout_push_20260702T164456Z`",
      "Accepted equality: `HEAD == origin/main == 97574a91a5c19fda174ccd646aac96d3aaec688a`",
      "Prior current checkpoint `80e91c7` is historical only, not current.",
      "Prior checkpoints `dfa7052`, `c72f14f`, `d20e125`, `bc8fbef`, `cfa7c2c`, and `1465817` are historical only, not current.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the accepted pushed checkpoint in feature state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v1008_accepted_pushed_state_checkpoint: {
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
    const state = featureList.v1008_accepted_pushed_state_checkpoint;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.accepted_pushed_short_commit).toBe("97574a9");
    expect(state.prior_current_accepted_pushed_short_commit).toBe("80e91c7");
    expect(state.historical_prior_accepted_pushed_short_commits).toEqual([
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
