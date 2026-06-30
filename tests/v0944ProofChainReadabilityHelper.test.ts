import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.44-proof-chain-readability-helper";
const docPath = "docs/v0.9.44-proof-chain-readability-helper.md";
const scriptPath = resolve("scripts/closeout-helper.mjs");
const closeoutProof =
  "/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_38_to_v0_9_42_accepted_state_proof_helper_closeout_usability_bundle_20260628T170309Z/closeout_push_20260629T210458Z";

describe("v0.9.44 proof chain readability helper", () => {
  it("documents proof-safe proof chain fields", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Proof chain summary",
      "accepted_pushed_checkpoint",
      "local_implementation_proof",
      "operator_qa_proof",
      "closeout_push_proof",
      "accepted_warn_checkpoint",
      "pending_local_bundle",
      "Does not read screenshots",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("prints proof chain summary from repo-owned state and RESULT metadata", () => {
    const result = spawnSync("node", [scriptPath, "review", "--proof-dir", closeoutProof], { encoding: "utf8" });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Proof chain summary:");
    expect(result.stdout).toContain("accepted_pushed_checkpoint=8358e63");
    expect(result.stdout).toContain(`closeout_push_proof=${closeoutProof}`);
    expect(result.stdout).toContain("accepted_warn_checkpoint=beea159");
    expect(result.stdout).toContain("pending_local_bundle=PASS");
  });
});
