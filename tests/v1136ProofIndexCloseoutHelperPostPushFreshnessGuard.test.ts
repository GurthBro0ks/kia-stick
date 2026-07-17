import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { expectCurrentCloseoutSummary } from "@/tests/helpers/currentAcceptedState";

const proof = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_68_to_v1_1_72_post_closeout_accepted_state_contract_refresh_20260717T092307Z/closeout_push_20260717T095029Z";

describe("v1.1.36 helper and proof-index freshness", () => {
  it("reports 05cb559 as current and rejects historical predecessors as current", () => {
    const summary = spawnSync("node", ["scripts/closeout-helper.mjs", "summary", "--proof-dir", proof], { encoding: "utf8" });
    expect(summary.status).toBe(0);
    expectCurrentCloseoutSummary(summary.stdout);
    for (const historical of ["0cb007d","84b5dac","65f8865","857ba0e","b8fb834","0286f03","ac23ed9","05cb559","a215dd4", "0051a15", "aa8f8c6", "b911fd1"]) {
      expect(summary.stdout).not.toContain(`PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=${historical}`);
    }

  });
});
