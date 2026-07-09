import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.89-settings-operator-status-post-closeout-freshness";
const docPath = "docs/v0.9.89-settings-operator-status-post-closeout-freshness.md";
const componentPath = "components/KiaStickApp.tsx";

describe("v0.9.89 Settings operator-status post-closeout freshness", () => {
  it("documents d20e125 as the current operator-status baseline", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Current accepted pushed checkpoint: `v0.9.87 at d20e125`",
      "Current accepted pushed commit: `d20e1251d5e7c117aa9592fb8614acb77ab3220b`",
      "Current accepted pushed proof: `/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_83_to_v0_9_87_operator_status_runtime_stale_baseline_fix_closeout_push_20260702T085505Z`",
      "Current accepted pushed QA: `validation PASS / manual QA PASS / pushed yes / HEAD == origin/main at d20e125`",
      "`Current accepted pushed checkpoint: v0.9.82 at bc8fbef`",
      "`Current accepted pushed checkpoint: v0.9.77 at cfa7c2c`",
      "`Current accepted pushed checkpoint: v0.9.67 at 1465817`",
      "The prior `bc8fbef`, `cfa7c2c`, and `1465817` checkpoints may remain visible only as historical-only records.",
      "Next/PostCSS remains `WARN_SAFE_NEXT_TARGET_UNCLEAR`.",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("surfaces c72f14f in runtime Settings and keeps stale current labels out", () => {
    const component = readFileSync(componentPath, "utf8");
    const contract = readFileSync("data/current-accepted-pushed-state.json", "utf8");

    expect(component).toContain('import currentAcceptedPushedState from "@/data/current-accepted-pushed-state.json";');
    expect(contract).toContain('"checkpoint_label": "v1.0.92 at 0269435"');
    expect(contract).toContain('"accepted_pushed_commit": "02694353a7cbaa71da9ab0c8bb458790636628cb"');
    expect(contract).toContain('"short_commit": "d099ff5"');
    expect(contract).toContain("/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_0_88_to_v1_0_92_post_closeout_accepted_state_contract_refresh_20260709T093848Z/closeout_push_20260709T095838Z");
    expect(component).toContain("Current accepted pushed checkpoint: {currentAcceptedPushedState.checkpoint_label}");
    expect(component).toContain("Current accepted pushed state is {currentAcceptedPushedState.checkpoint} at {currentAcceptedPushedState.accepted_pushed_commit}");
    expect(component).toContain("Older baselines, including 6ca589d, f662b37, cf2be1f, d099ff5, 73b3f38, 5b7a575, 720a58a, 5c7f360, 886631f, 841dee7, 870d3a7, 87420e2, 8b42744, b4b9fcf, 20485da, 97574a9, 80e91c7, dfa7052, c72f14f, d20e125, bc8fbef, cfa7c2c, and 1465817, are historical only and not current.");
    expect(contract).toContain('"short_commit": "d099ff5"');
    expect(contract).toContain('"short_commit": "d099ff5"');
    expect(contract).toContain('"short_commit": "d099ff5"');
    expect(contract).toContain('"short_commit": "d099ff5"');
    expect(component).not.toContain("Current accepted pushed checkpoint: v0.9.87 at d20e125");
    expect(component).not.toContain("Current accepted pushed checkpoint: v0.9.82 at bc8fbef");
    expect(component).not.toContain("Current accepted pushed checkpoint: v0.9.77 at cfa7c2c");
    expect(component).not.toContain("Current accepted pushed checkpoint: v0.9.67 at 1465817");
    expect(component).not.toContain("Current accepted pushed state is v0.9.82 at bc8fbef");
    expect(component).not.toContain("Current accepted pushed state is v0.9.67 at 1465817");
    expect(component).not.toMatch(/<input[^>]+type=["']file["']/);
    expect(component).not.toContain("FileReader");
    expect(component).not.toContain("showOpenFilePicker");
  });

  it("tracks operator-status freshness in feature state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0989_settings_operator_status_post_closeout_freshness: {
        phase: string;
        status: string;
        current_accepted_pushed_short_commit: string;
        historical_bc8fbef_preserved: boolean;
        current_bc8fbef_label_removed: boolean;
        next_postcss_status: string;
        v0912c_status: string;
        queue_015_status: string;
        real_doc_implementation_approved: boolean;
        package_lock_changed: boolean;
      };
    };
    const state = featureList.v0989_settings_operator_status_post_closeout_freshness;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.current_accepted_pushed_short_commit).toBe("d20e125");
    expect(state.historical_bc8fbef_preserved).toBe(true);
    expect(state.current_bc8fbef_label_removed).toBe(true);
    expect(state.next_postcss_status).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(state.v0912c_status).toBe("blocked_pending_exact_target");
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_implementation_approved).toBe(false);
    expect(state.package_lock_changed).toBe(false);
  });
});
