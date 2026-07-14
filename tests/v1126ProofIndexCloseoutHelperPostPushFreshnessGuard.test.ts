import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const proof = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_23_to_v1_1_27_operator_status_local_bundle_stale_fix_20260714T132534Z/closeout_push_20260714T135859Z";

describe("v1.1.26 helper and proof-index freshness", () => {
  it("reports 0051a15 as current and aa8f8c6 as non-current", () => {
    const summary = spawnSync("node", ["scripts/closeout-helper.mjs", "summary", "--proof-dir", proof], { encoding: "utf8" });
    expect(summary.status).toBe(0);
    expect(summary.stdout).toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=a215dd4");
    expect(summary.stdout).not.toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=aa8f8c6");
  });
});
