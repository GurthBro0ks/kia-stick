import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const commit = "b8fb8341b19980c33d7163a6993cc0e8ba520641";
const proof = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_43_to_v1_1_47_post_closeout_accepted_state_contract_refresh_20260715T144326Z/closeout_push_20260715T152933Z";

describe("v1.1.38 accepted pushed state checkpoint", () => {
  it("records v1.1.47 as the single current baseline", () => {
    const contract = JSON.parse(readFileSync("data/current-accepted-pushed-state.json", "utf8"));
    expect(contract.checkpoint_label).toBe("v1.1.47 at b8fb834");
    expect(contract.accepted_pushed_commit).toBe(commit);
    expect(contract.accepted_pushed_proof_dir).toBe(proof);
    expect(contract.accepted_pushed_phase).toBe("KIA-Stick-v1.1.43-to-v1.1.47-operator-qa-pass-closeout-and-push");
    expect(contract.historical_prior_checkpoints[0]).toMatchObject({ short_commit: "0286f03", status: "historical_only_not_current" });
  });
});
