import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.0.18-accepted-pushed-state-checkpoint";
const docPath = "docs/v1.0.18-accepted-pushed-state-checkpoint.md";

describe("v1.0.18 accepted pushed state checkpoint", () => {
  it("documents b4b9fcf as the current accepted pushed closeout", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Accepted pushed checkpoint: `v1.0.17 at b4b9fcf`",
      "Accepted pushed commit: `b4b9fcfce31108b09350e7d304fd1cff105edc31`",
      "Accepted pushed proof: `/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_0_13_to_v1_0_17_operator_qa_pass_closeout_push_20260703T142433Z`",
      "Accepted equality: `HEAD == origin/main == b4b9fcfce31108b09350e7d304fd1cff105edc31`",
      "Prior current checkpoint `20485da` is historical only, not current.",
      "Prior checkpoints `97574a9`, `80e91c7`, `dfa7052`, `c72f14f`, `d20e125`, `bc8fbef`, `cfa7c2c`, and `1465817` are historical only, not current.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the accepted pushed checkpoint in feature state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8"));
    const state = featureList.v1018_accepted_pushed_state_checkpoint;
    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.accepted_pushed_short_commit).toBe("b4b9fcf");
    expect(state.prior_current_accepted_pushed_short_commit).toBe("20485da");
    expect(state.historical_prior_accepted_pushed_short_commits).toEqual(["20485da", "97574a9", "80e91c7", "dfa7052", "c72f14f", "d20e125", "bc8fbef", "cfa7c2c", "1465817"]);
    expect(state.accepted_pushed).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});
