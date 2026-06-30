import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.48-accepted-pushed-state-checkpoint";
const docPath = "docs/v0.9.48-accepted-pushed-state-checkpoint.md";
const acceptedCommit = "928c614d0fcafb64b6ad79770c8d55a3b662b153";
const closeoutProof =
  "/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_43_to_v0_9_47_operator_qa_pass_recording_20260630T044306Z/closeout_push_20260630T071740Z";

describe("v0.9.48 accepted pushed state checkpoint", () => {
  it("records the accepted pushed v0.9.47 closeout state", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      acceptedCommit,
      "`928c614`",
      closeoutProof,
      "Manual QA status: `PASS`",
      "Push status: `yes`",
      "`HEAD == origin/main` at `928c614`",
      "Next/PostCSS remains `WARN_SAFE_NEXT_TARGET_UNCLEAR`, not fixed.",
      "`KIA-Stick-v0.9.12C-next-runtime-framework-security-implementation` remains blocked",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
      "Product/package version remains `0.7.0`.",
      "Prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`.",
      "Manual QA remains `PENDING`",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the accepted pushed checkpoint in feature state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0948_accepted_pushed_state_checkpoint: {
        phase: string;
        status: string;
        accepted_pushed_commit: string;
        closeout_push_proof_dir: string;
        accepted_manual_qa_status: string;
        accepted_push_status: string;
        current_bundle_manual_qa_status: string;
        next_postcss_status: string;
        queue_015_status: string;
        package_lock_changed: boolean;
        real_doc_implementation_approved: boolean;
      };
    };
    const state = featureList.v0948_accepted_pushed_state_checkpoint;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("needs_review");
    expect(state.accepted_pushed_commit).toBe(acceptedCommit);
    expect(state.closeout_push_proof_dir).toBe(closeoutProof);
    expect(state.accepted_manual_qa_status).toBe("PASS");
    expect(state.accepted_push_status).toBe("yes");
    expect(state.current_bundle_manual_qa_status).toBe("PENDING");
    expect(state.next_postcss_status).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(state.queue_015_status).toBe("blocked");
    expect(state.package_lock_changed).toBe(false);
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});
