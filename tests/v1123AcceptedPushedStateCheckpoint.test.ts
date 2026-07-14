import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const commit = "0051a1503db5d5ecf062de1595129c5eac9114d6";
const proof = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_18_to_v1_1_22_operator_qa_pass_recording_20260710T135021Z/closeout_push_20260714T124609Z";

describe("v1.1.23 accepted pushed state checkpoint", () => {
  it("records the v1.1.22 closeout as the single current baseline", () => {
    const contract = JSON.parse(readFileSync("data/current-accepted-pushed-state.json", "utf8"));
    expect(contract.checkpoint_label).toBe("v1.1.22 at 0051a15");
    expect(contract.accepted_pushed_commit).toBe(commit);
    expect(contract.accepted_pushed_proof_dir).toBe(proof);
    expect(contract.historical_prior_checkpoints[0]).toMatchObject({ short_commit: "aa8f8c6", status: "historical_only_not_current" });
  });
});
