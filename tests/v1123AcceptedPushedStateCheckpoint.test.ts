import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const commit = "0286f03ffe8055395cc4d02ee83ddc0deb6143f1";
const proof = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_38_to_v1_1_42_post_closeout_accepted_state_contract_refresh_20260714T221558Z/closeout_push_20260715T143617Z";

describe("v1.1.23 accepted pushed state checkpoint", () => {
  it("records the v1.1.22 closeout as the single current baseline", () => {
    const contract = JSON.parse(readFileSync("data/current-accepted-pushed-state.json", "utf8"));
    expect(contract.checkpoint_label).toBe("v1.1.42 at 0286f03");
    expect(contract.accepted_pushed_commit).toBe(commit);
    expect(contract.accepted_pushed_proof_dir).toBe(proof);
    expect(contract.historical_prior_checkpoints[0]).toMatchObject({ short_commit: "ac23ed9", status: "historical_only_not_current" });
  });
});
