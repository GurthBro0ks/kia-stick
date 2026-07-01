import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.83-current-accepted-pushed-state-checkpoint";
const docPath = "docs/v0.9.83-current-accepted-pushed-state-checkpoint.md";

describe("v0.9.83 current accepted pushed state checkpoint", () => {
  it("surfaces bc8fbef as the current accepted pushed baseline", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Current accepted pushed phase: `KIA-Stick-v0.9.78-to-v0.9.82-operator-qa-pass-closeout-and-push`",
      "Current accepted pushed commit: `bc8fbef3114631ea3e0363b8e700ce0c2dce236e`",
      "Current accepted pushed short commit: `bc8fbef`",
      "Current closeout/push proof: `/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_78_to_v0_9_82_operator_qa_pass_recording_20260701T163018Z/closeout_push_20260701T163622Z`",
      "Operator QA PASS proof: `/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_78_to_v0_9_82_operator_qa_pass_recording_20260701T163018Z`",
      "`HEAD == origin/main == bc8fbef3114631ea3e0363b8e700ce0c2dce236e`",
      "`cfa7c2c72cbff14a8e9515119256a806a7b00bcd` baseline remains historical",
      "Next/PostCSS remains `WARN_SAFE_NEXT_TARGET_UNCLEAR`, not fixed.",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks current accepted pushed state in feature state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0983_current_accepted_pushed_state_checkpoint: {
        phase: string;
        status: string;
        accepted_pushed_commit: string;
        accepted_pushed_short_commit: string;
        prior_historical_accepted_pushed_short_commit: string;
        manual_qa_status: string;
        pushed: boolean;
        head_equals_origin_main_after_push: boolean;
        queue_015_status: string;
        package_lock_changed: boolean;
        real_doc_implementation_approved: boolean;
      };
    };
    const state = featureList.v0983_current_accepted_pushed_state_checkpoint;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted_pushed_recorded");
    expect(state.accepted_pushed_commit).toBe("bc8fbef3114631ea3e0363b8e700ce0c2dce236e");
    expect(state.accepted_pushed_short_commit).toBe("bc8fbef");
    expect(state.prior_historical_accepted_pushed_short_commit).toBe("cfa7c2c");
    expect(state.manual_qa_status).toBe("PASS");
    expect(state.pushed).toBe(true);
    expect(state.head_equals_origin_main_after_push).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.package_lock_changed).toBe(false);
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});
