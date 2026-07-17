import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.83-to-v0.9.87-operator-status-runtime-stale-baseline-fix";
const docPath = "docs/v0.9.83-to-v0.9.87-operator-status-runtime-stale-baseline-fix.md";
const componentPath = "components/KiaStickApp.tsx";

describe("v0.9.83 to v0.9.87 operator-status runtime stale-baseline fix", () => {
  it("documents the runtime Settings repair and preserved blocked states", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Current accepted pushed checkpoint: `v0.9.82 at bc8fbef`",
      "Current accepted pushed commit: `bc8fbef3114631ea3e0363b8e700ce0c2dce236e`",
      "Current accepted pushed proof: `/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_78_to_v0_9_82_operator_qa_pass_recording_20260701T163018Z/closeout_push_20260701T163622Z`",
      "Accepted validation/manual QA/push: `PASS` / `PASS` / pushed yes",
      "`HEAD == origin/main == bc8fbef3114631ea3e0363b8e700ce0c2dce236e`",
      "The previous `cfa7c2c` and `1465817` baselines are historical only, not current.",
      "Next/PostCSS remains `WARN_SAFE_NEXT_TARGET_UNCLEAR`.",
      "`KIA-Stick-v0.9.12C-next-runtime-framework-security-implementation` remains blocked.",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
      "Real-doc implementation remains unapproved.",
      "Package files remain unchanged and package version remains `0.7.0`.",
      "Manual QA is `PASS` by `OPERATOR_QA_PASS for /home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_83_to_v0_9_87_operator_status_runtime_stale_baseline_fix_20260701T172100Z`.",
      "Operator QA proof is `/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_83_to_v0_9_87_operator_status_runtime_stale_baseline_fix_operator_qa_pass_recording_20260702T084942Z`.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("surfaces the post-v0.9.92 c72f14f baseline in runtime Settings and keeps older baselines historical", () => {
    const component = readFileSync(componentPath, "utf8");
    const contract = readFileSync("tests/fixtures/current-accepted-pushed-state-v1.1.72.json", "utf8");

    expect(component).toContain('from "@/lib/acceptedState"');
    expect(contract).toContain('"checkpoint_label": "v1.1.72 at ab1878e"');
    expect(contract).toContain('"accepted_pushed_commit": "ab1878e4c681c8f658e8a5bf6bd36f3ad4423fea"');
    expect(component).toContain("Current accepted pushed checkpoint: {currentAcceptedPushedState.checkpoint_label}");
    expect(component).toContain("Current accepted pushed state is {currentAcceptedPushedState.checkpoint} at {currentAcceptedPushedState.accepted_pushed_commit}");
    expect(component).toContain("historicalAcceptedPushedShortCommits");
    expect(contract).toContain("/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_68_to_v1_1_72_post_closeout_accepted_state_contract_refresh_20260717T092307Z/closeout_push_20260717T095029Z");
    expect(contract).toContain('"accepted_pushed_short_commit": "ab1878e"');
    expect(contract).toContain('"short_commit": "d099ff5"');
    expect(contract).toContain('"short_commit": "d099ff5"');
    expect(contract).toContain('"short_commit": "d099ff5"');
    expect(contract).toContain('"short_commit": "d099ff5"');
    expect(contract).toContain('"short_commit": "d099ff5"');
    expect(component).not.toContain("Current accepted pushed checkpoint: `v0.9.82 at bc8fbef`");
    expect(component).not.toContain("Current accepted pushed checkpoint: `v0.9.82 at bc8fbef`");
    expect(component).not.toContain("Current accepted pushed checkpoint: `v0.9.82 at bc8fbef`");
    expect(component).not.toContain("Current accepted pushed state is v0.9.87 at d20e125");
    expect(component).not.toContain("Current accepted pushed state is v0.9.82 at bc8fbef");
    expect(component).not.toContain("Current accepted pushed state is v0.9.67 at 1465817");
    expect(component).not.toMatch(/<input[^>]+type=["']file["']/);
    expect(component).not.toContain("FileReader");
    expect(component).not.toContain("showOpenFilePicker");
  });

  it("tracks the repair as local, unpushed, and pending manual QA", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0983_to_v0987_operator_status_runtime_stale_baseline_fix: {
        phase: string;
        status: string;
        runtime_settings_current_accepted_pushed_short_commit: string;
        stale_1465817_current_label_removed: boolean;
        historical_1465817_preserved: boolean;
        historical_cfa7c2c_preserved: boolean;
        local_repair_pushed: boolean;
        manual_qa_status: string;
        operator_qa_pass_text: string;
        operator_qa_pass_proof_dir: string;
        queue_015_status: string;
        real_doc_implementation_approved: boolean;
        package_lock_changed: boolean;
      };
    };
    const state = featureList.v0983_to_v0987_operator_status_runtime_stale_baseline_fix;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("operator_qa_pass_recorded");
    expect(state.runtime_settings_current_accepted_pushed_short_commit).toBe("bc8fbef");
    expect(state.stale_1465817_current_label_removed).toBe(true);
    expect(state.historical_1465817_preserved).toBe(true);
    expect(state.historical_cfa7c2c_preserved).toBe(true);
    expect(state.local_repair_pushed).toBe(false);
    expect(state.manual_qa_status).toBe("PASS");
    expect(state.operator_qa_pass_text).toBe(
      "OPERATOR_QA_PASS for /home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_83_to_v0_9_87_operator_status_runtime_stale_baseline_fix_20260701T172100Z"
    );
    expect(state.operator_qa_pass_proof_dir).toBe(
      "/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_83_to_v0_9_87_operator_status_runtime_stale_baseline_fix_operator_qa_pass_recording_20260702T084942Z"
    );
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_implementation_approved).toBe(false);
    expect(state.package_lock_changed).toBe(false);
  });
});
