import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const commit = "ab1878e4c681c8f658e8a5bf6bd36f3ad4423fea";
const proof = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_68_to_v1_1_72_post_closeout_accepted_state_contract_refresh_20260717T092307Z/closeout_push_20260717T095029Z";

describe("v1.1.38 accepted pushed state checkpoint", () => {
  it("records v1.1.57 as the single current baseline", () => {
    const contract = JSON.parse(readFileSync("data/current-accepted-pushed-state.json", "utf8"));
    expect(contract.checkpoint_label).toBe("v1.1.72 at ab1878e");
    expect(contract.accepted_pushed_commit).toBe(commit);
    expect(contract.accepted_pushed_proof_dir).toBe(proof);
    expect(contract.accepted_pushed_phase).toBe("KIA-Stick-v1.1.68-to-v1.1.72-operator-qa-pass-closeout-and-push");
    expect(contract.historical_prior_checkpoints[0]).toMatchObject({ short_commit: "0cb007d", status: "historical_only_not_current" });
  });
});
