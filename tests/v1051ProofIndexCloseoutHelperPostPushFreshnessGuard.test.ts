import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.0.51-proof-index-closeout-helper-post-push-freshness-guard";
const docPath = "docs/v1.0.51-proof-index-closeout-helper-post-push-freshness-guard.md";
const currentProof = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_0_73_to_v1_0_77_post_closeout_accepted_state_contract_refresh_20260708T185415Z/closeout_push_20260708T190846Z";

describe("v1.0.51 proof-index and closeout-helper post-push freshness guard", () => {
  it("documents 5c7f360 helper/proof-index freshness and preserved gates", () => {
    const doc = readFileSync(docPath, "utf8");
    for (const required of [phase, "Latest accepted pushed closeout commit is `5c7f3600267f161db3d773181d82a3c4f4727dea`.", "Closeout helper current proof-chain selection reports `PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=5c7f360`.", "The helper must not regress to `886631f`, `841dee7`, `870d3a7`, `87420e2`, `8b42744`, `b4b9fcf`, `20485da`, `97574a9`, `80e91c7`, `dfa7052`, `c72f14f`, `d20e125`, `bc8fbef`, `cfa7c2c`, and `1465817` as the current accepted pushed checkpoint.", "Accepted-WARN stays parked and is not converted to PASS.", "Real-doc implementation remains unapproved."]) {
      expect(doc).toContain(required);
    }
  });

  it("reports 5c7f360 from closeout helper current proof-chain selection", () => {
    const summary = spawnSync("node", ["scripts/closeout-helper.mjs", "summary", "--proof-dir", currentProof], { encoding: "utf8" });
    expect(summary.status).toBe(0);
    expect(summary.stdout).toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=f662b37");
    expect(summary.stdout).toContain("PROOF_CHAIN_CLOSEOUT_PUSH_PROOF=" + currentProof);
    for (const stale of ["886631f","841dee7","870d3a7","87420e2","8b42744","b4b9fcf","20485da","97574a9","80e91c7","dfa7052","c72f14f","d20e125","bc8fbef","cfa7c2c","1465817"]) {
      expect(summary.stdout).not.toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=" + stale);
    }
  });
});
