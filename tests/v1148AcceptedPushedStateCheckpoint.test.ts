import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const commit = "0cb007d38c6e17d316cc25640f0fb28b2b934c55";
const proof = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_63_to_v1_1_67_post_closeout_accepted_state_contract_refresh_20260716T170411Z/closeout_push_20260717T091002Z";

describe("v1.1.48 accepted pushed state checkpoint", () => {
  it("records v1.1.57 as the single current baseline", () => {
    const contract = JSON.parse(readFileSync("data/current-accepted-pushed-state.json", "utf8"));
    expect(contract.checkpoint_label).toBe("v1.1.67 at 0cb007d");
    expect(contract.accepted_pushed_commit).toBe(commit);
    expect(contract.accepted_pushed_proof_dir).toBe(proof);
    expect(contract.accepted_pushed_phase).toBe("KIA-Stick-v1.1.63-to-v1.1.67-operator-qa-pass-closeout-and-push");
    expect(contract.historical_prior_checkpoints[0]).toMatchObject({ short_commit: "84b5dac", status: "historical_only_not_current" });
  });
});
