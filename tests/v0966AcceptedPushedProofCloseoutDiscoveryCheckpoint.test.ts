import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.66-accepted-pushed-proof-closeout-discovery-checkpoint";
const docPath = "docs/v0.9.66-accepted-pushed-proof-closeout-discovery-checkpoint.md";
const closeoutProof =
  "/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_58_to_v0_9_62_operator_qa_pass_recording_20260630T213116Z/closeout_push_20260630T214918Z";

describe("v0.9.66 accepted pushed proof/closeout discovery checkpoint", () => {
  it("documents d1a31cd as the latest accepted pushed proof-chain baseline", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "newest accepted pushed baseline as `d1a31cd`",
      closeoutProof,
      "local implementation proof: `/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_58_to_v0_9_62_accepted_state_proof_index_review_ready_freshness_bundle_20260630T205845Z`",
      "operator QA proof: `/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_58_to_v0_9_62_operator_qa_pass_recording_20260630T213116Z`",
      "Missing or incomplete proof metadata remains WARN",
      "Package files remain unchanged.",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
      "Next/PostCSS remains `WARN_SAFE_NEXT_TARGET_UNCLEAR`.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("surfaces d1a31cd in closeout helper proof-chain output", () => {
    const summary = spawnSync("node", ["scripts/closeout-helper.mjs", "summary", "--proof-dir", closeoutProof], { encoding: "utf8" });

    expect(summary.status).toBe(0);
    expect(summary.stdout).toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=d1a31cd");
    expect(summary.stdout).toContain(`PROOF_CHAIN_CLOSEOUT_PUSH_PROOF=${closeoutProof}`);
    expect(summary.stdout).toContain("PROOF_DISCOVERY_MODE=explicit_proof_dir");
    expect(summary.stdout).toContain("PUSHED=yes");
    expect(summary.stdout).not.toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=4093530");
  });

  it("tracks proof discovery metadata without mutating proof directories", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0966_accepted_pushed_proof_closeout_discovery_checkpoint: {
        phase: string;
        status: string;
        latest_accepted_pushed_short_commit: string;
        closeout_push_proof_dir: string;
        proof_directories_mutated: boolean;
        package_json_changed: boolean;
        package_lock_changed: boolean;
        real_doc_capability_added: boolean;
      };
    };
    const state = featureList.v0966_accepted_pushed_proof_closeout_discovery_checkpoint;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.latest_accepted_pushed_short_commit).toBe("d1a31cd");
    expect(state.closeout_push_proof_dir).toBe(closeoutProof);
    expect(state.proof_directories_mutated).toBe(false);
    expect(state.package_json_changed).toBe(false);
    expect(state.package_lock_changed).toBe(false);
    expect(state.real_doc_capability_added).toBe(false);
  });
});
