import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const commit = "857ba0e0180b2bca27823367c871429ece0c5214";
const proof = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_48_to_v1_1_52_post_closeout_accepted_state_contract_refresh_20260715T155657Z/closeout_push_20260715T164809Z";

describe("v1.1.33 accepted pushed state checkpoint", () => {
  it("records the v1.1.32 closeout as the single current baseline", () => {
    const contract = JSON.parse(readFileSync("data/current-accepted-pushed-state.json", "utf8"));
    expect(contract.checkpoint_label).toBe("v1.1.52 at 857ba0e");
    expect(contract.accepted_pushed_commit).toBe(commit);
    expect(contract.accepted_pushed_proof_dir).toBe(proof);
    expect(contract.accepted_pushed_phase).toBe("KIA-Stick-v1.1.48-to-v1.1.52-operator-qa-pass-closeout-and-push");
    expect(contract.historical_prior_checkpoints[0]).toMatchObject({ short_commit: "b8fb834", status: "historical_only_not_current" });
  });
});
