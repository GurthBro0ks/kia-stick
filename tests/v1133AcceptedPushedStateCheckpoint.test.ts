import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const commit = "05cb5592758fde1dddaf10e2582e7d6222d43df5";
const proof = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_28_to_v1_1_32_inherited_freshness_test_repair_20260714T145341Z/closeout_push_20260714T163958Z";

describe("v1.1.33 accepted pushed state checkpoint", () => {
  it("records the v1.1.32 closeout as the single current baseline", () => {
    const contract = JSON.parse(readFileSync("data/current-accepted-pushed-state.json", "utf8"));
    expect(contract.checkpoint_label).toBe("v1.1.32 at 05cb559");
    expect(contract.accepted_pushed_commit).toBe(commit);
    expect(contract.accepted_pushed_proof_dir).toBe(proof);
    expect(contract.accepted_pushed_phase).toBe("KIA-Stick-v1.1.28-to-v1.1.32-operator-qa-pass-closeout-and-push");
    expect(contract.historical_prior_checkpoints[0]).toMatchObject({ short_commit: "a215dd4", status: "historical_only_not_current" });
  });
});
