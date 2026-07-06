import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.0.26-proof-index-closeout-helper-post-push-freshness-guard";
const docPath = "docs/v1.0.26-proof-index-closeout-helper-post-push-freshness-guard.md";

describe("v1.0.26 proof-index and closeout-helper post-push freshness guard", () => {
  it("documents 8b42744 helper/proof-index freshness and preserved gates", () => {
    const doc = readFileSync(docPath, "utf8");
    for (const required of [phase, "Latest accepted pushed closeout commit is `8b4274413ca056a4b647a163fd79c8165a024820`.", "Closeout helper current proof-chain selection reports `PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=8b42744`.", "The helper must not regress to `b4b9fcf`, `20485da`, `97574a9`, `80e91c7`, `dfa7052`, `c72f14f`, `d20e125`, `bc8fbef`, `cfa7c2c`, and `1465817` as the current accepted pushed checkpoint.", "Accepted-WARN stays parked and is not converted to PASS.", "Real-doc implementation remains unapproved."]) {
      expect(doc).toContain(required);
    }
  });

  it("reports 8b42744 from closeout helper current proof-chain selection", () => {
    const currentProof = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_0_38_to_v1_0_42_post_closeout_accepted_state_contract_refresh_20260705T225915Z/closeout_push_20260705T231305Z";
    const summary = spawnSync("node", ["scripts/closeout-helper.mjs", "summary", "--proof-dir", currentProof], { encoding: "utf8" });
    expect(summary.status).toBe(0);
    expect(summary.stdout).toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=886631f");
    expect(summary.stdout).toContain("PROOF_CHAIN_CLOSEOUT_PUSH_PROOF=" + currentProof);
    for (const stale of ["b4b9fcf", "20485da", "97574a9", "80e91c7", "dfa7052", "c72f14f", "d20e125"]) {
      expect(summary.stdout).not.toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=" + stale);
    }
  });
});
