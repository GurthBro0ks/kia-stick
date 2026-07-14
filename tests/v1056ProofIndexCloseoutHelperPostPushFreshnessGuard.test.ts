import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.0.56-proof-index-closeout-helper-post-push-freshness-guard";
const docPath = "docs/v1.0.56-proof-index-closeout-helper-post-push-freshness-guard.md";
const currentProof = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_18_to_v1_1_22_operator_qa_pass_recording_20260710T135021Z/closeout_push_20260714T124609Z";

describe("v1.0.56 proof-index and closeout-helper post-push freshness guard", () => {
  it("documents 720a58a helper/proof-index freshness and preserved gates", () => {
    const doc = readFileSync(docPath, "utf8");
    for (const required of [phase, "Latest accepted pushed closeout commit is `720a58a1973e77dd3617fa0558478ae8c9b96214`.", "Closeout helper current proof-chain selection reports `PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=720a58a`.", "The helper must not regress to `5c7f360`, `886631f`, `841dee7`, `870d3a7`, `87420e2`, `8b42744`, `b4b9fcf`, `20485da`, `97574a9`, `80e91c7`, `dfa7052`, `c72f14f`, `d20e125`, `bc8fbef`, `cfa7c2c`, and `1465817` as the current accepted pushed checkpoint.", "Accepted-WARN stays parked and is not converted to PASS.", "Real-doc implementation remains unapproved."]) {
      expect(doc).toContain(required);
    }
  });

  it("reports 720a58a from closeout helper current proof-chain selection", () => {
    const summary = spawnSync("node", ["scripts/closeout-helper.mjs", "summary", "--proof-dir", currentProof], { encoding: "utf8" });
    expect(summary.status).toBe(0);
    expect(summary.stdout).toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=0051a15");
    expect(summary.stdout).toContain("PROOF_CHAIN_CLOSEOUT_PUSH_PROOF=" + currentProof);
    for (const stale of ["5c7f360","886631f","841dee7","870d3a7","87420e2","8b42744","b4b9fcf","20485da","97574a9","80e91c7","dfa7052","c72f14f","d20e125","bc8fbef","cfa7c2c","1465817"]) {
      expect(summary.stdout).not.toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=" + stale);
    }
  });
});
