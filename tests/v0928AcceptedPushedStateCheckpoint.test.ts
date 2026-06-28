import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.28-accepted-pushed-state-checkpoint";
const docPath = "docs/v0.9.28-accepted-pushed-state-checkpoint.md";
const acceptedCommit = "3b121e5997f26d1e859b565fe2a7e4a4d8a3b0e3";
const closeoutProof =
  "/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_23_to_v0_9_27_accepted_state_fake_operator_ux_tooling_bundle_20260628T120936Z/closeout_push_20260628T143958Z";

describe("v0.9.28 accepted pushed state checkpoint", () => {
  it("documents the accepted pushed v0.9.23-to-v0.9.27 baseline", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      acceptedCommit,
      "`3b121e5`",
      closeoutProof,
      "Manual QA status: `PASS`",
      "Push status: `yes`",
      "`HEAD == origin/main`",
      "Manual QA is `ACCEPTED_WARN`",
      "Next/PostCSS remains parked as `WARN_SAFE_NEXT_TARGET_UNCLEAR`",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
      "No package install, package update, audit fix",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the accepted checkpoint without package or real-doc drift", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0928_accepted_pushed_state_checkpoint: {
        phase: string;
        status: string;
        accepted_pushed_commit: string;
        closeout_push_proof_dir: string;
        manual_qa_status: string;
        pushed: boolean;
        current_bundle_manual_qa_status: string;
        package_json_changed: boolean;
        package_lock_changed: boolean;
        queue_015_status: string;
        real_doc_implementation_approved: boolean;
      };
    };
    const state = featureList.v0928_accepted_pushed_state_checkpoint;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("ready_to_push");
    expect(state.accepted_pushed_commit).toBe(acceptedCommit);
    expect(state.closeout_push_proof_dir).toBe(closeoutProof);
    expect(state.manual_qa_status).toBe("PASS");
    expect(state.pushed).toBe(true);
    expect(state.current_bundle_manual_qa_status).toBe("ACCEPTED_WARN");
    expect(state.package_json_changed).toBe(false);
    expect(state.package_lock_changed).toBe(false);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});
