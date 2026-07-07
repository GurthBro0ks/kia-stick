import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.0.1-proof-index-closeout-helper-post-push-freshness-guard";
const docPath = "docs/v1.0.1-proof-index-closeout-helper-post-push-freshness-guard.md";

describe("v1.0.1 proof-index and closeout-helper post-push freshness guard", () => {
  it("documents dfa7052 helper/proof-index freshness and preserved gates", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Latest accepted pushed closeout commit is `dfa7052e5bd87e8e96362c0e93565a29409964b3`.",
      "Closeout helper current proof-chain selection reports `PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=dfa7052`.",
      "The helper must not regress to `c72f14f`, `d20e125`, `bc8fbef`, `cfa7c2c`, or `1465817` as the current accepted pushed checkpoint.",
      "Accepted-WARN stays parked and is not converted to PASS.",
      "Real-doc implementation remains unapproved.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("reports 97574a9 from closeout helper current proof-chain selection", () => {
    const currentProof = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_0_43_to_v1_0_47_post_closeout_accepted_state_contract_refresh_20260706T164518Z/closeout_push_20260707T054817Z";
    const summary = spawnSync("node", ["scripts/closeout-helper.mjs", "summary", "--proof-dir", currentProof], {
      encoding: "utf8",
    });

    expect(summary.status).toBe(0);
    expect(summary.stdout).toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=5c7f360");
    expect(summary.stdout).toContain(`PROOF_CHAIN_CLOSEOUT_PUSH_PROOF=${currentProof}`);
    expect(summary.stdout).not.toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=97574a9");
    expect(summary.stdout).not.toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=dfa7052");
    expect(summary.stdout).not.toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=c72f14f");
    expect(summary.stdout).not.toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=d20e125");
    expect(summary.stdout).not.toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=bc8fbef");
  });
});
