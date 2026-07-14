import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const commit = "ac23ed94adec34bd32062018bf20b0de616da395";
const proof = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_33_to_v1_1_37_post_closeout_accepted_state_contract_refresh_20260714T200705Z/closeout_push_20260714T221125Z";

describe("v1.1.38 accepted pushed state checkpoint", () => {
  it("records v1.1.37 as the single current baseline", () => {
    const contract = JSON.parse(readFileSync("data/current-accepted-pushed-state.json", "utf8"));
    expect(contract.checkpoint_label).toBe("v1.1.37 at ac23ed9");
    expect(contract.accepted_pushed_commit).toBe(commit);
    expect(contract.accepted_pushed_proof_dir).toBe(proof);
    expect(contract.accepted_pushed_phase).toBe("KIA-Stick-v1.1.33-to-v1.1.37-operator-qa-pass-closeout-and-push");
    expect(contract.historical_prior_checkpoints[0]).toMatchObject({ short_commit: "05cb559", status: "historical_only_not_current" });
  });
});
