import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const proof = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_58_to_v1_1_62_post_closeout_accepted_state_contract_refresh_20260716T154243Z/closeout_push_20260716T162519Z";
const localImplementationProof = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_58_to_v1_1_62_post_closeout_accepted_state_contract_refresh_20260716T154243Z";
const operatorQaProof = `${localImplementationProof}/operator_qa_pass_20260716T162023Z`;
const localBundle = "v1.1.63-to-v1.1.67 post-closeout accepted-state contract refresh; validation PASS; pushed no; manual QA pending";
const env = { ...process.env, KIA_PROOF_ROOT: undefined };

describe("v1.1.66 helper and rooted proof-index freshness", () => {
  it("reports the contract-derived current proof chain and local bundle", () => {
    const summary = spawnSync("node", ["scripts/closeout-helper.mjs", "summary", "--proof-dir", proof], { encoding: "utf8", env });
    expect(summary.status).toBe(0);
    expect(summary.stdout).toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=84b5dac");
    expect(summary.stdout).toContain(`PROOF_CHAIN_LOCAL_IMPLEMENTATION_PROOF=${localImplementationProof}`);
    expect(summary.stdout).toContain(`PROOF_CHAIN_OPERATOR_QA_PROOF=${operatorQaProof}`);
    expect(summary.stdout).toContain(`PROOF_CHAIN_CLOSEOUT_PUSH_PROOF=${proof}`);
    expect(summary.stdout).toContain(`PROOF_CHAIN_PENDING_LOCAL_BUNDLE=${localBundle}`);
    for (const historical of ["65f8865","857ba0e","b8fb834","0286f03","ac23ed9","05cb559","a215dd4","0051a15"]) {
      expect(summary.stdout).not.toContain(`PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=${historical}`);
    }
  });

  it("resolves the accepted nested closeout from the persistent root", () => {
    const index = spawnSync("node", ["scripts/local-proof-index.mjs", "latest", "--root", "/home/mint/kia-stick-local-proofs"], { encoding: "utf8", env });
    expect(index.status).toBe(0);
    expect(index.stdout).toContain(`Latest accepted pushed closeout proof: ${proof}`);
    expect(index.stdout).toContain("Latest accepted pushed closeout commit: 84b5dacb2bf9453040e382b44843fe775ed5b91d");
  });
});
