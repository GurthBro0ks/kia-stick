import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.69-settings-operator-status-freshness-polish";
const docPath = "docs/v0.9.69-settings-operator-status-freshness-polish.md";
const componentPath = "components/KiaStickApp.tsx";

describe("v0.9.69 Settings operator-status freshness polish", () => {
  it("documents the current accepted pushed status and historical WARN boundary", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Current accepted pushed checkpoint: v0.9.67 at 1465817",
      "v0.9.63-to-v0.9.67 accepted/pushed yes at 1465817",
      "Historical accepted-WARN checkpoint `3b9fef5` remains visible only as historical accepted-WARN parked state, not current state.",
      "Next/PostCSS remains `WARN_SAFE_NEXT_TARGET_UNCLEAR`",
      "`KIA-Stick-v0.9.12C-next-runtime-framework-security-implementation` remains blocked",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked",
      "Package files remain unchanged.",
      "No real-doc capability is approved.",
      "This is copy/status only.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("updates Settings copy without adding intake affordances", () => {
    const component = readFileSync(componentPath, "utf8");
    const contract = readFileSync("data/current-accepted-pushed-state.json", "utf8");

    expect(component).toContain("Current accepted pushed checkpoint: {currentAcceptedPushedState.checkpoint_label}");
    expect(component).toContain("Current accepted pushed state is {currentAcceptedPushedState.checkpoint} at {currentAcceptedPushedState.accepted_pushed_commit}");
    expect(contract).toContain('"checkpoint_label": "v1.0.57 at 5b7a575"');
    expect(contract).toContain('"accepted_pushed_short_commit": "5b7a575"');
    expect(contract).toContain('"short_commit": "c72f14f"');
    expect(contract).toContain('"short_commit": "d20e125"');
    expect(contract).toContain('"short_commit": "bc8fbef"');
    expect(contract).toContain('"short_commit": "1465817"');
    expect(component).toContain("Historical accepted-WARN meaning");
    expect(component).toContain("accepted-WARN parked, not current");
    expect(component).toContain("v0.9.83-to-v0.9.87 operator-status runtime repair; validation PASS; manual QA PASS; later pushed by closeout");
    expect(component).toContain("queue-015 blocked; no real-doc capability");
    expect(component).toContain("unchanged; no install/update/audit-fix/dedupe/prune");
    expect(component).not.toContain("Current accepted pushed checkpoint: v0.9.87 at d20e125");
    expect(component).not.toContain("Current accepted pushed checkpoint: v0.9.82 at bc8fbef");
    expect(component).not.toContain("Current accepted pushed checkpoint: v0.9.67 at 1465817");
    expect(component).not.toContain("Current accepted pushed state is v0.9.82 at bc8fbef");
    expect(component).not.toContain("Current accepted pushed state is v0.9.67 at 1465817");
    expect(component).not.toMatch(/<input[^>]+type=["']file["']/);
    expect(component).not.toContain("FileReader");
    expect(component).not.toContain("showOpenFilePicker");
  });

  it("tracks Settings freshness metadata in feature state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0969_settings_operator_status_freshness_polish: {
        phase: string;
        status: string;
        current_accepted_pushed_short_commit: string;
        historical_warn_marked_historical: boolean;
        current_bundle_manual_qa_status: string;
        operator_qa_pass_text: string;
        pushed: boolean;
        package_lock_changed: boolean;
        real_doc_capability_added: boolean;
      };
    };
    const state = featureList.v0969_settings_operator_status_freshness_polish;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.current_accepted_pushed_short_commit).toBe("1465817");
    expect(state.historical_warn_marked_historical).toBe(true);
    expect(state.current_bundle_manual_qa_status).toBe("PASS");
    expect(state.operator_qa_pass_text).toBe(
      "OPERATOR_QA_PASS for /home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_68_to_v0_9_72_accepted_pushed_state_runtime_status_freshness_bundle_20260701T094248Z"
    );
    expect(state.pushed).toBe(false);
    expect(state.package_lock_changed).toBe(false);
    expect(state.real_doc_capability_added).toBe(false);
  });
});
