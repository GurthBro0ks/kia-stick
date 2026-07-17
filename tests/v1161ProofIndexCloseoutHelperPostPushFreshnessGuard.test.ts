import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const proof = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_68_to_v1_1_72_post_closeout_accepted_state_contract_refresh_20260717T092307Z/closeout_push_20260717T095029Z";
const env = { ...process.env, KIA_PROOF_ROOT: undefined };

describe("v1.1.61 helper and rooted proof-index freshness", () => {
  it("reports ab1878e and rejects historical predecessors as current", () => {
    const summary = spawnSync("node", ["scripts/closeout-helper.mjs", "summary", "--proof-dir", proof], { encoding: "utf8", env });
    expect(summary.status).toBe(0);
    expect(summary.stdout).toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=ab1878e");
    for (const historical of ["0cb007d","84b5dac","65f8865","857ba0e","b8fb834","0286f03","ac23ed9","05cb559","a215dd4","0051a15"]) {
      expect(summary.stdout).not.toContain(`PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=${historical}`);
    }
    expect(summary.stdout).toContain(`PROOF_CHAIN_CLOSEOUT_PUSH_PROOF=${proof}`);
  });

  it("resolves the accepted nested closeout from the persistent root", () => {
    const index = spawnSync("node", ["scripts/local-proof-index.mjs", "latest", "--root", "/home/mint/kia-stick-local-proofs"], { encoding: "utf8", env });
    expect(index.status).toBe(0);
    expect(index.stdout).toContain(`Latest accepted pushed closeout proof: ${proof}`);
    expect(index.stdout).toContain("Latest accepted pushed closeout commit: ab1878e4c681c8f658e8a5bf6bd36f3ad4423fea");
  });
});
