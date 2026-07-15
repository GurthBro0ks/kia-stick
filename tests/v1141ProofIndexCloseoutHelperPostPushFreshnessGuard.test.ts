import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const proof = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_48_to_v1_1_52_post_closeout_accepted_state_contract_refresh_20260715T155657Z/closeout_push_20260715T164809Z";

describe("v1.1.41 helper and proof-index freshness", () => {
  it("reports 857ba0e and rejects historical predecessors as current", () => {
    const summary = spawnSync("node", ["scripts/closeout-helper.mjs", "summary", "--proof-dir", proof], { encoding: "utf8" });
    expect(summary.status).toBe(0);
    expect(summary.stdout).toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=857ba0e");
    for (const historical of ["b8fb834","0286f03","ac23ed9","05cb559", "a215dd4", "0051a15", "aa8f8c6"]) {
      expect(summary.stdout).not.toContain(`PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=${historical}`);
    }
    expect(summary.stdout).toContain(`PROOF_CHAIN_CLOSEOUT_PUSH_PROOF=${proof}`);
  });
});
