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

  it("surfaces d20e125 in runtime Settings and keeps stale current labels out", () => {
    const component = readFileSync(componentPath, "utf8");

    expect(component).toContain("Current accepted pushed checkpoint: v0.9.87 at d20e125");
    expect(component).toContain("Current accepted pushed state is v0.9.87 at d20e1251d5e7c117aa9592fb8614acb77ab3220b");
    expect(component).toContain("/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_83_to_v0_9_87_operator_status_runtime_stale_baseline_fix_closeout_push_20260702T085505Z");
    expect(component).toContain("validation PASS / manual QA PASS / pushed yes / HEAD == origin/main at d20e125");
    expect(component).toContain("bc8fbef3114631ea3e0363b8e700ce0c2dce236e; historical only, not current");
    expect(component).toContain("cfa7c2c72cbff14a8e9515119256a806a7b00bcd; historical only, not current");
    expect(component).toContain("1465817e8efad6207705833e9e08f22030d6a116; historical only, not current");
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
