import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { expectCurrentCloseoutSummary } from "@/tests/helpers/currentAcceptedState";

const phase = "KIA-Stick-v1.1.21-proof-index-closeout-helper-post-push-freshness-guard";
const docPath = "docs/v1.1.21-proof-index-closeout-helper-post-push-freshness-guard.md";
const currentProof = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_68_to_v1_1_72_post_closeout_accepted_state_contract_refresh_20260717T092307Z/closeout_push_20260717T095029Z";

describe("v1.1.21 proof-index and closeout-helper post-push freshness guard", () => {
  it("documents aa8f8c6 helper/proof-index freshness and preserved gates", () => {
    const doc = readFileSync(docPath, "utf8");
    for (const required of [phase, "Latest accepted pushed closeout commit is `aa8f8c651a000037f403abd41bc206bda161a861`.", "Closeout helper current proof-chain selection reports `PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=aa8f8c6`.", "The helper must not regress to `b911fd1`", "Accepted-WARN stays parked and is not converted to PASS.", "Real-doc implementation remains unapproved."]) expect(doc).toContain(required);
  });

  it("reports aa8f8c6 from closeout helper current proof-chain selection", () => {
    const summary = spawnSync("node", ["scripts/closeout-helper.mjs", "summary", "--proof-dir", currentProof], { encoding: "utf8" });
    expect(summary.status).toBe(0);
    expectCurrentCloseoutSummary(summary.stdout);

    for (const stale of ["0cb007d","84b5dac","65f8865","857ba0e","b8fb834","0286f03","ac23ed9","05cb559","a215dd4","0051a15","aa8f8c6","b911fd1","628fbd4","6d0715b","1da06ff","0269435","fcf5097","6ca589d","f662b37","cf2be1f","d099ff5","73b3f38","5b7a575","720a58a","5c7f360","886631f","841dee7","870d3a7","87420e2","8b42744","b4b9fcf","20485da","97574a9","80e91c7","dfa7052","c72f14f","d20e125","bc8fbef","cfa7c2c","1465817"]) expect(summary.stdout).not.toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=" + stale);
  });
});
