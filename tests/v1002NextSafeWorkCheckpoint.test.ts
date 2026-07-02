import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.0.2-next-safe-work-checkpoint";
const docPath = "docs/v1.0.2-next-safe-work-checkpoint.md";

describe("v1.0.2 next safe work checkpoint", () => {
  it("records the local implementation checkpoint without approving push or blocked work", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "v0.9.98 records accepted pushed v0.9.97 closeout at `dfa7052`.",
      "v0.9.99 refreshes the static current accepted pushed state contract.",
      "v1.0.0 refreshes Settings -> Operator Status current accepted pushed copy from the contract.",
      "v1.0.1 verifies proof-index and closeout-helper post-push freshness guards.",
      "This local checkpoint does not push.",
      "Validation for this local checkpoint is `PASS`.",
      "Manual QA for this local checkpoint is `PASS` by `OPERATOR_QA_PASS for /home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_98_to_v1_0_2_post_closeout_accepted_state_contract_refresh_20260702T140224Z`.",
      "Operator QA proof is `/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_98_to_v1_0_2_operator_qa_pass_recording_20260702T150515Z`.",
      "Operator note: after every future closeout push, update `data/current-accepted-pushed-state.json` in a separate fake-only checkpoint before baseline-sensitive UI or tooling work.",
      "Next/PostCSS remains parked as `WARN_SAFE_NEXT_TARGET_UNCLEAR`.",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
      "This checkpoint does not approve package mutation, service changes, notifications, push, or real-doc capability.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the checkpoint without package, queue, or real-doc drift", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v1002_next_safe_work_checkpoint: {
        phase: string;
        status: string;
        current_accepted_pushed_short_commit: string;
        local_checkpoint_validation: string;
        local_checkpoint_pushed: boolean;
        local_checkpoint_manual_qa_status: string;
        operator_qa_pass_text: string;
        operator_qa_pass_proof_dir: string;
        required_future_workflow_after_closeout_push: string;
        queue_015_status: string;
        package_json_changed: boolean;
        package_lock_changed: boolean;
      };
    };
    const state = featureList.v1002_next_safe_work_checkpoint;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.current_accepted_pushed_short_commit).toBe("dfa7052");
    expect(state.local_checkpoint_validation).toBe("PASS");
    expect(state.local_checkpoint_pushed).toBe(false);
    expect(state.local_checkpoint_manual_qa_status).toBe("PASS");
    expect(state.operator_qa_pass_text).toBe(
      "OPERATOR_QA_PASS for /home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_98_to_v1_0_2_post_closeout_accepted_state_contract_refresh_20260702T140224Z"
    );
    expect(state.operator_qa_pass_proof_dir).toBe(
      "/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_98_to_v1_0_2_operator_qa_pass_recording_20260702T150515Z"
    );
    expect(state.required_future_workflow_after_closeout_push).toBe(
      "Refresh data/current-accepted-pushed-state.json in a separate fake-only checkpoint before baseline-sensitive UI or tooling work."
    );
    expect(state.queue_015_status).toBe("blocked");
    expect(state.package_json_changed).toBe(false);
    expect(state.package_lock_changed).toBe(false);
  });
});
