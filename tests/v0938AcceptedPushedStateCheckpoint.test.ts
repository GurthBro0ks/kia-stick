import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.38-accepted-pushed-state-checkpoint";
const docPath = "docs/v0.9.38-accepted-pushed-state-checkpoint.md";
const acceptedCommit = "12aca976c85b3c45a9dc06a33fef31f36074ae96";
const closeoutProof =
  "/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_33_to_v0_9_37_accepted_warn_state_fake_proof_report_operator_ux_bundle_20260628T160846Z/closeout_push_20260628T165303Z";

describe("v0.9.38 accepted pushed state checkpoint", () => {
  it("records the accepted pushed v0.9.37 closeout state", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      acceptedCommit,
      "`12aca97`",
      closeoutProof,
      "Manual QA status: `PASS`",
      "Push status: `yes`",
      "`HEAD == origin/main` at `12aca97`",
      "Next/PostCSS remains `WARN_SAFE_NEXT_TARGET_UNCLEAR`, not fixed.",
      "`KIA-Stick-v0.9.12C-next-runtime-framework-security-implementation` remains blocked",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
      "Product/package version remains `0.7.0`.",
      "Prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`.",
      "Manual QA is `PASS`",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the accepted pushed checkpoint in feature state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0938_accepted_pushed_state_checkpoint: {
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
    const state = featureList.v0938_accepted_pushed_state_checkpoint;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("ready_to_push");
    expect(state.accepted_pushed_commit).toBe(acceptedCommit);
    expect(state.closeout_push_proof_dir).toBe(closeoutProof);
    expect(state.accepted_manual_qa_status).toBe("PASS");
    expect(state.accepted_push_status).toBe("yes");
    expect(state.current_bundle_manual_qa_status).toBe("PASS");
    expect(state.next_postcss_status).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(state.queue_015_status).toBe("blocked");
    expect(state.package_lock_changed).toBe(false);
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});
