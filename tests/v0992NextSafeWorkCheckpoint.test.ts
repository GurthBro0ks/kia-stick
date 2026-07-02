import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.92-next-safe-work-checkpoint";
const docPath = "docs/v0.9.92-next-safe-work-checkpoint.md";

describe("v0.9.92 next safe work checkpoint", () => {
  it("records the local implementation checkpoint without approving push or blocked work", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "v0.9.88 records accepted pushed v0.9.87 closeout at `d20e125`.",
      "v0.9.89 refreshes Settings -> Operator Status current accepted pushed copy.",
      "v0.9.90 verifies proof-index accepted pushed closeout freshness.",
      "v0.9.91 refreshes closeout helper current accepted pushed proof-chain selection.",
      "This local checkpoint does not push.",
      "Validation for this local checkpoint is `PASS`.",
      "Manual QA for this local checkpoint is `PASS` by `OPERATOR_QA_PASS for /home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_88_to_v0_9_92_accepted_pushed_state_operator_status_freshness_checkpoint_20260702T091407Z`.",
      "Operator QA proof is `/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_88_to_v0_9_92_operator_qa_pass_recording_20260702T093222Z`.",
      "Next/PostCSS remains parked as `WARN_SAFE_NEXT_TARGET_UNCLEAR`.",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
      "This checkpoint does not approve package mutation, service changes, notifications, push, or real-doc capability.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the checkpoint without package, queue, or real-doc drift", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0992_next_safe_work_checkpoint: {
        phase: string;
        status: string;
        current_accepted_pushed_short_commit: string;
        local_checkpoint_validation: string;
        local_checkpoint_pushed: boolean;
        local_checkpoint_manual_qa_status: string;
        current_bundle_manual_qa_status: string;
        next_postcss_status: string;
        next_implementation_blocked: boolean;
        real_doc_gate_blocked: boolean;
        queue_015_status: string;
        package_json_changed: boolean;
        package_lock_changed: boolean;
        dependency_versions_changed: boolean;
        safe_next_choices: string[];
        operator_qa_pass_text: string;
        operator_qa_pass_proof_dir: string;
      };
    };
    const state = featureList.v0992_next_safe_work_checkpoint;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.current_accepted_pushed_short_commit).toBe("d20e125");
    expect(state.local_checkpoint_validation).toBe("PASS");
    expect(state.local_checkpoint_pushed).toBe(false);
    expect(state.local_checkpoint_manual_qa_status).toBe("PASS");
    expect(state.current_bundle_manual_qa_status).toBe("PASS");
    expect(state.operator_qa_pass_text).toBe(
      "OPERATOR_QA_PASS for /home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_88_to_v0_9_92_accepted_pushed_state_operator_status_freshness_checkpoint_20260702T091407Z"
    );
    expect(state.operator_qa_pass_proof_dir).toBe(
      "/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_88_to_v0_9_92_operator_qa_pass_recording_20260702T093222Z"
    );
    expect(state.next_postcss_status).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(state.next_implementation_blocked).toBe(true);
    expect(state.real_doc_gate_blocked).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.package_json_changed).toBe(false);
    expect(state.package_lock_changed).toBe(false);
    expect(state.dependency_versions_changed).toBe(false);
    expect(state.safe_next_choices).toContain("closeout/push gate only after separate explicit closeout approval");
    expect(state.safe_next_choices).toContain("keep real-doc gate blocked unless separately approved");
  });
});
