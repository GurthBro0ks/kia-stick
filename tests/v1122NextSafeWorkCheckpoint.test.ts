import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.1.22-next-safe-work-checkpoint";
const docPath = "docs/v1.1.22-next-safe-work-checkpoint.md";

describe("v1.1.22 next safe work checkpoint", () => {
  it("records the local implementation checkpoint without approving push or blocked work", () => {
    const doc = readFileSync(docPath, "utf8");
    for (const required of [phase, "KIA-Stick-v1.1.18 records accepted pushed v1.1.17 closeout at `aa8f8c6`.", "KIA-Stick-v1.1.19 refreshes the static current accepted pushed state contract.", "KIA-Stick-v1.1.20 refreshes Settings -> Operator Status current accepted pushed copy from the contract.", "KIA-Stick-v1.1.21 verifies proof-index and closeout-helper post-push freshness guards.", "This local checkpoint does not push.", "Manual QA for this local checkpoint is `PASS` by `OPERATOR_QA_PASS for /home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_18_to_v1_1_22_post_closeout_accepted_state_contract_refresh_20260709T171319Z`.", "Operator QA proof is `/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_18_to_v1_1_22_operator_qa_pass_recording_20260710T135021Z`.", "Operator note: after every future closeout push, update `data/current-accepted-pushed-state.json` in a separate fake-only checkpoint before baseline-sensitive UI or tooling work.", "Next/PostCSS remains parked as `WARN_SAFE_NEXT_TARGET_UNCLEAR`.", "`queue-015-v07-first-real-doc-gate-request` remains blocked.", "This checkpoint does not approve package mutation, service changes, notifications, push, or real-doc capability."]) expect(doc).toContain(required);
  });

  it("tracks the checkpoint without package, queue, or real-doc drift", () => {
    const state = JSON.parse(readFileSync("feature_list.json", "utf8")).v1122_next_safe_work_checkpoint;
    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.current_accepted_pushed_short_commit).toBe("aa8f8c6");
    expect(state.local_checkpoint_validation).toBe("PASS");
    expect(state.local_checkpoint_pushed).toBe(false);
    expect(state.local_checkpoint_manual_qa_status).toBe("PASS");
    expect(state.operator_qa_pass_text).toBe("OPERATOR_QA_PASS for /home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_18_to_v1_1_22_post_closeout_accepted_state_contract_refresh_20260709T171319Z");
    expect(state.operator_qa_pass_proof_dir).toBe("/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_18_to_v1_1_22_operator_qa_pass_recording_20260710T135021Z");
    expect(state.required_future_workflow_after_closeout_push).toBe("Refresh data/current-accepted-pushed-state.json in a separate fake-only checkpoint before baseline-sensitive UI or tooling work.");
    expect(state.queue_015_status).toBe("blocked");
    expect(state.package_json_changed).toBe(false);
    expect(state.package_lock_changed).toBe(false);
  });
});
