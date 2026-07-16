import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const proof = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_53_to_v1_1_57_post_closeout_accepted_state_contract_refresh_20260715T214207Z/closeout_push_20260716T145607Z";

describe("v1.1.46 helper and proof-index freshness", () => {
  it("reports 65f8865 and rejects historical predecessors as current", () => {
    const summary = spawnSync("node", ["scripts/closeout-helper.mjs", "summary", "--proof-dir", proof], { encoding: "utf8" });
    expect(summary.status).toBe(0);
    expect(summary.stdout).toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=65f8865");
    for (const historical of ["857ba0e","b8fb834","0286f03","ac23ed9", "05cb559", "a215dd4", "0051a15"]) {
      expect(summary.stdout).not.toContain(`PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=${historical}`);
    }
    expect(summary.stdout).toContain(`PROOF_CHAIN_CLOSEOUT_PUSH_PROOF=${proof}`);
  });
});
