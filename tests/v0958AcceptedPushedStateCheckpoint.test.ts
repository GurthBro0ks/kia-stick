import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.58-accepted-pushed-state-checkpoint";
const docPath = "docs/v0.9.58-accepted-pushed-state-checkpoint.md";

describe("v0.9.58 accepted pushed state checkpoint", () => {
  it("records the accepted v0.9.57 closeout baseline without approving new capability", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "40935306504d2746f1bae92b21893b13024f91c3",
      "4093530",
      "/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_53_to_v0_9_57_operator_qa_pass_recording_20260630T195543Z/closeout_push_20260630T204915Z",
      "Manual QA status: `PASS`",
      "Push status: `yes`",
      "Post-push state: `HEAD == origin/main` at `4093530`",
      "Next/PostCSS remains `WARN_SAFE_NEXT_TARGET_UNCLEAR`.",
      "`KIA-Stick-v0.9.12C-next-runtime-framework-security-implementation` remains blocked",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
      "Product/package version remains `0.7.0`.",
      "Prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`.",
      "`package.json` did not change.",
      "`package-lock.json` did not change.",
      "does not add file pickers, FileReader, path readers, uploads, OCR",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the accepted pushed checkpoint in feature_list", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0958_accepted_pushed_state_checkpoint: {
        phase: string;
        status: string;
        accepted_pushed_commit: string;
        accepted_pushed_short_commit: string;
        closeout_push_proof_dir: string;
        manual_qa_status: string;
        pushed: boolean;
        head_equals_origin_main_after_push: boolean;
        queue_015_status: string;
        package_json_changed: boolean;
        package_lock_changed: boolean;
        real_doc_implementation_approved: boolean;
      };
    };
    const state = featureList.v0958_accepted_pushed_state_checkpoint;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted_pushed_recorded");
    expect(state.accepted_pushed_commit).toBe("40935306504d2746f1bae92b21893b13024f91c3");
    expect(state.accepted_pushed_short_commit).toBe("4093530");
    expect(state.closeout_push_proof_dir).toBe(
      "/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_53_to_v0_9_57_operator_qa_pass_recording_20260630T195543Z/closeout_push_20260630T204915Z"
    );
    expect(state.manual_qa_status).toBe("PASS");
    expect(state.pushed).toBe(true);
    expect(state.head_equals_origin_main_after_push).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.package_json_changed).toBe(false);
    expect(state.package_lock_changed).toBe(false);
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});
