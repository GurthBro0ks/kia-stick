import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const commit = "a215dd4ac4687ea878263d38ea9d4bdbaf444a71";
const proof = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_23_to_v1_1_27_operator_status_local_bundle_stale_fix_20260714T132534Z/closeout_push_20260714T135859Z";

describe("v1.1.23 accepted pushed state checkpoint", () => {
  it("records the v1.1.22 closeout as the single current baseline", () => {
    const contract = JSON.parse(readFileSync("data/current-accepted-pushed-state.json", "utf8"));
    expect(contract.checkpoint_label).toBe("v1.1.27 at a215dd4");
    expect(contract.accepted_pushed_commit).toBe(commit);
    expect(contract.accepted_pushed_proof_dir).toBe(proof);
    expect(contract.historical_prior_checkpoints[0]).toMatchObject({ short_commit: "0051a15", status: "historical_only_not_current" });
  });
});
