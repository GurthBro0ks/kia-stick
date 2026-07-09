import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.1.0-settings-operator-status-current-accepted-pushed-refresh";
const docPath = "docs/v1.1.0-settings-operator-status-current-accepted-pushed-refresh.md";
const componentPath = "components/KiaStickApp.tsx";

describe("v1.1.0 Settings operator-status current accepted pushed refresh", () => {
  it("documents 1da06ff as the runtime operator-status baseline", () => {
    const doc = readFileSync(docPath, "utf8");
    for (const required of [
      phase,
      "Runtime headline: `Current accepted pushed checkpoint: v1.0.97 at 1da06ff`",
      "Runtime current state sentence: `Current accepted pushed state is v1.0.97 at 1da06ffaa37b3787a652c1761e1c3f24b26df691`",
      "Current accepted pushed QA: `validation PASS / manual QA PASS / pushed yes / HEAD == origin/main at 1da06ff`",
      "`v1.0.92 at 02694353a7cbaa71da9ab0c8bb458790636628cb; historical only, not current`",
      "Next/PostCSS remains `WARN_SAFE_NEXT_TARGET_UNCLEAR`.",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
    ]) expect(doc).toContain(required);
  });

  it("uses the shared contract in runtime Settings and keeps stale current labels out", () => {
    const component = readFileSync(componentPath, "utf8");
    const contract = readFileSync("data/current-accepted-pushed-state.json", "utf8");
    expect(component).toContain('import currentAcceptedPushedState from "@/data/current-accepted-pushed-state.json";');
    expect(contract).toContain('"checkpoint_label": "v1.1.12 at b911fd1"');
    expect(contract).toContain('"accepted_pushed_commit": "b911fd1530d5fc106b3368339a439527c2a43538"');
    expect(contract).toContain('"short_commit": "0269435"');
    expect(component).toContain("Current accepted pushed checkpoint: {currentAcceptedPushedState.checkpoint_label}");
    expect(component).toContain("Current accepted pushed state is {currentAcceptedPushedState.checkpoint} at {currentAcceptedPushedState.accepted_pushed_commit}");
    expect(component).toContain("Older baselines, including 0269435, fcf5097, 6ca589d, f662b37, cf2be1f, d099ff5, 73b3f38, 5b7a575, 720a58a, 5c7f360, 886631f, 841dee7, 870d3a7, 87420e2, 8b42744, b4b9fcf, 20485da, 97574a9, 80e91c7, dfa7052, c72f14f, d20e125, bc8fbef, cfa7c2c, and 1465817, are historical only and not current.");
    for (const stale of ["v1.0.92 at 0269435","v1.0.87 at fcf5097","v1.0.82 at 6ca589d","v1.0.77 at f662b37","v1.0.72 at cf2be1f","v1.0.67 at d099ff5","v1.0.62 at 73b3f38","v1.0.57 at 5b7a575","v1.0.52 at 720a58a","v1.0.47 at 5c7f360","v1.0.42 at 886631f","v1.0.37 at 841dee7","v1.0.32 at 870d3a7","v1.0.27 at 87420e2","v1.0.22 at 8b42744","v1.0.17 at b4b9fcf","v1.0.12 at 20485da","v1.0.7 at 97574a9","v1.0.2 at 80e91c7","v0.9.97 at dfa7052","v0.9.67 at 1465817"]) expect(component).not.toContain("Current accepted pushed checkpoint: " + stale);
    expect(component).not.toMatch(/<input[^>]+type=["']file["']/);
    expect(component).not.toContain("FileReader");
  });
});
