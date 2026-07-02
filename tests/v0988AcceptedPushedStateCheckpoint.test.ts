import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.88-accepted-pushed-state-checkpoint";
const docPath = "docs/v0.9.88-accepted-pushed-state-checkpoint.md";

describe("v0.9.88 accepted pushed state checkpoint", () => {
  it("records d20e125 as current and prior baselines as historical only", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Current accepted pushed checkpoint: `v0.9.87 at d20e125`",
      "Current accepted pushed commit: `d20e1251d5e7c117aa9592fb8614acb77ab3220b`",
      "Current accepted pushed proof: `/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_83_to_v0_9_87_operator_status_runtime_stale_baseline_fix_closeout_push_20260702T085505Z`",
      "Accepted validation/manual QA/push: `PASS` / `PASS` / pushed yes",
      "`HEAD == origin/main == d20e1251d5e7c117aa9592fb8614acb77ab3220b`",
      "`bc8fbef3114631ea3e0363b8e700ce0c2dce236e` is historical only, not current.",
      "`cfa7c2c72cbff14a8e9515119256a806a7b00bcd` is historical only, not current.",
      "`1465817e8efad6207705833e9e08f22030d6a116` is historical only, not current.",
      "Next/PostCSS remains `WARN_SAFE_NEXT_TARGET_UNCLEAR`.",
      "`KIA-Stick-v0.9.12C-next-runtime-framework-security-implementation` remains blocked.",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
      "Real-doc implementation remains unapproved.",
      "Product/package version remains `0.7.0`.",
      "Prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the accepted pushed checkpoint in feature state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0988_accepted_pushed_state_checkpoint: {
        phase: string;
        status: string;
        accepted_pushed_commit: string;
        accepted_pushed_short_commit: string;
        accepted_pushed_proof_dir: string;
        manual_qa_status: string;
        pushed: boolean;
        head_equals_origin_main_after_push: boolean;
        historical_prior_accepted_pushed_short_commits: string[];
        bc8fbef_current_state_prevented: boolean;
        cfa7c2c_current_state_prevented: boolean;
        stale_1465817_current_state_prevented: boolean;
        next_postcss_status: string;
        queue_015_status: string;
        package_lock_changed: boolean;
        real_doc_implementation_approved: boolean;
      };
    };
    const state = featureList.v0988_accepted_pushed_state_checkpoint;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted_pushed_recorded");
    expect(state.accepted_pushed_commit).toBe("d20e1251d5e7c117aa9592fb8614acb77ab3220b");
    expect(state.accepted_pushed_short_commit).toBe("d20e125");
    expect(state.accepted_pushed_proof_dir).toBe(
      "/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_83_to_v0_9_87_operator_status_runtime_stale_baseline_fix_closeout_push_20260702T085505Z"
    );
    expect(state.manual_qa_status).toBe("PASS");
    expect(state.pushed).toBe(true);
    expect(state.head_equals_origin_main_after_push).toBe(true);
    expect(state.historical_prior_accepted_pushed_short_commits).toEqual(["bc8fbef", "cfa7c2c", "1465817"]);
    expect(state.bc8fbef_current_state_prevented).toBe(true);
    expect(state.cfa7c2c_current_state_prevented).toBe(true);
    expect(state.stale_1465817_current_state_prevented).toBe(true);
    expect(state.next_postcss_status).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(state.queue_015_status).toBe("blocked");
    expect(state.package_lock_changed).toBe(false);
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});
