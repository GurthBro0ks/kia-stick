import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const commit = "84b5dacb2bf9453040e382b44843fe775ed5b91d";
const proof = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_58_to_v1_1_62_post_closeout_accepted_state_contract_refresh_20260716T154243Z/closeout_push_20260716T162519Z";

describe("v1.1.38 accepted pushed state checkpoint", () => {
  it("records v1.1.57 as the single current baseline", () => {
    const contract = JSON.parse(readFileSync("data/current-accepted-pushed-state.json", "utf8"));
    expect(contract.checkpoint_label).toBe("v1.1.62 at 84b5dac");
    expect(contract.accepted_pushed_commit).toBe(commit);
    expect(contract.accepted_pushed_proof_dir).toBe(proof);
    expect(contract.accepted_pushed_phase).toBe("KIA-Stick-v1.1.58-to-v1.1.62-operator-qa-pass-closeout-and-push");
    expect(contract.historical_prior_checkpoints[0]).toMatchObject({ short_commit: "65f8865", status: "historical_only_not_current" });
  });
});
