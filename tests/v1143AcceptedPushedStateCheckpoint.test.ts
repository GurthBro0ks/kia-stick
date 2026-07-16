import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const commit = "65f88659b238ae0cfacd51f0dab71844d885a76c";
const proof = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_53_to_v1_1_57_post_closeout_accepted_state_contract_refresh_20260715T214207Z/closeout_push_20260716T145607Z";

describe("v1.1.43 accepted pushed state checkpoint", () => {
  it("records v1.1.57 as the single current baseline", () => {
    const contract = JSON.parse(readFileSync("data/current-accepted-pushed-state.json", "utf8"));
    expect(contract.checkpoint_label).toBe("v1.1.57 at 65f8865");
    expect(contract.accepted_pushed_commit).toBe(commit);
    expect(contract.accepted_pushed_proof_dir).toBe(proof);
    expect(contract.accepted_pushed_phase).toBe("KIA-Stick-v1.1.53-to-v1.1.57-operator-qa-pass-closeout-and-push");
    expect(contract.historical_prior_checkpoints[0]).toMatchObject({ short_commit: "857ba0e", status: "historical_only_not_current" });
  });
});
