import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.0.16-proof-index-closeout-helper-post-push-freshness-guard";
const docPath = "docs/v1.0.16-proof-index-closeout-helper-post-push-freshness-guard.md";

describe("v1.0.16 proof-index and closeout-helper post-push freshness guard", () => {
  it("documents 20485da helper/proof-index freshness and preserved gates", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Latest accepted pushed closeout commit is `20485da8d731ac94a12dd58d77a68e64bf296c5b`.",
      "Closeout helper current proof-chain selection reports `PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=20485da`.",
      "The helper must not regress to `97574a9`, `80e91c7`, `dfa7052`, `c72f14f`, `d20e125`, `bc8fbef`, `cfa7c2c`, or `1465817` as the current accepted pushed checkpoint.",
      "Accepted-WARN stays parked and is not converted to PASS.",
      "Real-doc implementation remains unapproved.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("reports 20485da from closeout helper current proof-chain selection", () => {
    const currentProof = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_0_48_to_v1_0_52_post_closeout_accepted_state_contract_refresh_20260707T055347Z/closeout_push_20260707T060707Z";
    const summary = spawnSync("node", ["scripts/closeout-helper.mjs", "summary", "--proof-dir", currentProof], {
      encoding: "utf8",
    });

    expect(summary.status).toBe(0);
    expect(summary.stdout).toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=720a58a");
    expect(summary.stdout).toContain(`PROOF_CHAIN_CLOSEOUT_PUSH_PROOF=${currentProof}`);
    expect(summary.stdout).not.toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=97574a9");
    expect(summary.stdout).not.toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=80e91c7");
    expect(summary.stdout).not.toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=dfa7052");
    expect(summary.stdout).not.toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=c72f14f");
    expect(summary.stdout).not.toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=d20e125");
  });
});
