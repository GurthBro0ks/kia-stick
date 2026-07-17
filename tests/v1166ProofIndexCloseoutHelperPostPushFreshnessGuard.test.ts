import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { expectCurrentCloseoutSummary, expectCurrentProofIndexOutput } from "@/tests/helpers/currentAcceptedState";

const proof = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_68_to_v1_1_72_post_closeout_accepted_state_contract_refresh_20260717T092307Z/closeout_push_20260717T095029Z";
const env = { ...process.env, KIA_PROOF_ROOT: undefined };

describe("v1.1.66 helper and rooted proof-index freshness", () => {
  it("reports the contract-derived current proof chain and local bundle", () => {
    const summary = spawnSync("node", ["scripts/closeout-helper.mjs", "summary", "--proof-dir", proof], { encoding: "utf8", env });
    expect(summary.status).toBe(0);
    expectCurrentCloseoutSummary(summary.stdout);




    for (const historical of ["0cb007d","84b5dac","65f8865","857ba0e","b8fb834","0286f03","ac23ed9","05cb559","a215dd4","0051a15"]) {
      expect(summary.stdout).not.toContain(`PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=${historical}`);
    }
  });

  it("resolves the accepted nested closeout from the persistent root", () => {
    const index = spawnSync("node", ["scripts/local-proof-index.mjs", "latest", "--root", "/home/mint/kia-stick-local-proofs"], { encoding: "utf8", env });
    expect(index.status).toBe(0);
    expectCurrentProofIndexOutput(index.stdout);
  });
});
