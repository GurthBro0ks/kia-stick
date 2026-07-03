import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.95-settings-operator-status-current-state-alignment";
const docPath = "docs/v0.9.95-settings-operator-status-current-state-alignment.md";
const componentPath = "components/KiaStickApp.tsx";

describe("v0.9.95 Settings operator-status current-state alignment", () => {
  it("documents c72f14f as the runtime operator-status baseline", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Runtime headline: `Current accepted pushed checkpoint: v0.9.92 at c72f14f`",
      "Runtime current state sentence: `Current accepted pushed state is v0.9.92 at c72f14f15859c105637aa4193a976303a7de3233`",
      "Current accepted pushed QA: `validation PASS / manual QA PASS / pushed yes / HEAD == origin/main at c72f14f`",
      "`v0.9.87 at d20e1251d5e7c117aa9592fb8614acb77ab3220b; historical only, not current`",
      "`v0.9.82 at bc8fbef3114631ea3e0363b8e700ce0c2dce236e; historical only, not current`",
      "`v0.9.77 at cfa7c2c72cbff14a8e9515119256a806a7b00bcd; historical only, not current`",
      "`v0.9.67 at 1465817e8efad6207705833e9e08f22030d6a116; historical only, not current`",
      "Next/PostCSS remains `WARN_SAFE_NEXT_TARGET_UNCLEAR`.",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("uses the shared contract in runtime Settings and keeps stale current labels out", () => {
    const component = readFileSync(componentPath, "utf8");
    const contract = readFileSync("data/current-accepted-pushed-state.json", "utf8");

    expect(component).toContain('import currentAcceptedPushedState from "@/data/current-accepted-pushed-state.json";');
    expect(contract).toContain('"checkpoint_label": "v1.0.27 at 87420e2"');
    expect(contract).toContain('"accepted_pushed_commit": "87420e2e293fd86b2b76c66729e0e905bb688c0d"');
    expect(contract).toContain('"short_commit": "c72f14f"');
    expect(component).toContain("Current accepted pushed checkpoint: {currentAcceptedPushedState.checkpoint_label}");
    expect(component).toContain("Current accepted pushed state is {currentAcceptedPushedState.checkpoint} at {currentAcceptedPushedState.accepted_pushed_commit}");
    expect(component).toContain("Older baselines, including 8b42744, b4b9fcf, 20485da, 97574a9, 80e91c7, dfa7052, c72f14f, d20e125, bc8fbef, cfa7c2c, and 1465817, are historical only and not current.");
    expect(component).not.toContain("Current accepted pushed checkpoint: v0.9.87 at d20e125");
    expect(component).not.toContain("Current accepted pushed checkpoint: v0.9.82 at bc8fbef");
    expect(component).not.toContain("Current accepted pushed checkpoint: v0.9.77 at cfa7c2c");
    expect(component).not.toContain("Current accepted pushed checkpoint: v0.9.67 at 1465817");
    expect(component).not.toContain("Current accepted pushed state is v0.9.87 at d20e125");
    expect(component).not.toContain("Current accepted pushed state is v0.9.82 at bc8fbef");
    expect(component).not.toContain("Current accepted pushed state is v0.9.67 at 1465817");
    expect(component).not.toMatch(/<input[^>]+type=["']file["']/);
    expect(component).not.toContain("FileReader");
    expect(component).not.toContain("showOpenFilePicker");
  });

  it("tracks operator-status alignment in feature state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0995_settings_operator_status_current_state_alignment: {
        phase: string;
        status: string;
        current_accepted_pushed_short_commit: string;
        source_contract: string;
        historical_short_commits_only: string[];
        next_postcss_status: string;
        v0912c_status: string;
        queue_015_status: string;
        real_doc_implementation_approved: boolean;
        package_lock_changed: boolean;
      };
    };
    const state = featureList.v0995_settings_operator_status_current_state_alignment;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.current_accepted_pushed_short_commit).toBe("c72f14f");
    expect(state.source_contract).toBe("data/current-accepted-pushed-state.json");
    expect(state.historical_short_commits_only).toEqual(["d20e125", "bc8fbef", "cfa7c2c", "1465817"]);
    expect(state.next_postcss_status).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(state.v0912c_status).toBe("blocked_pending_exact_target");
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_implementation_approved).toBe(false);
    expect(state.package_lock_changed).toBe(false);
  });
});
