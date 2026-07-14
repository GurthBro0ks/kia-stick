import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const proof = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_33_to_v1_1_37_post_closeout_accepted_state_contract_refresh_20260714T200705Z/closeout_push_20260714T221125Z";

describe("v1.1.41 helper and proof-index freshness", () => {
  it("reports ac23ed9 and rejects historical predecessors as current", () => {
    const summary = spawnSync("node", ["scripts/closeout-helper.mjs", "summary", "--proof-dir", proof], { encoding: "utf8" });
    expect(summary.status).toBe(0);
    expect(summary.stdout).toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=ac23ed9");
    for (const historical of ["05cb559", "a215dd4", "0051a15", "aa8f8c6"]) {
      expect(summary.stdout).not.toContain(`PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=${historical}`);
    }
    expect(summary.stdout).toContain(`PROOF_CHAIN_CLOSEOUT_PUSH_PROOF=${proof}`);
  });
});
