import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.0.20-settings-operator-status-current-accepted-pushed-refresh";
const docPath = "docs/v1.0.20-settings-operator-status-current-accepted-pushed-refresh.md";
const componentPath = "components/KiaStickApp.tsx";

describe("v1.0.20 Settings operator-status current accepted pushed refresh", () => {
  it("documents b4b9fcf as the runtime operator-status baseline", () => {
    const doc = readFileSync(docPath, "utf8");
    for (const required of [phase, "Runtime headline: `Current accepted pushed checkpoint: v1.0.17 at b4b9fcf`", "Runtime current state sentence: `Current accepted pushed state is v1.0.17 at b4b9fcfce31108b09350e7d304fd1cff105edc31`", "Current accepted pushed QA: `validation PASS / manual QA PASS / pushed yes / HEAD == origin/main at b4b9fcf`", "`v1.0.12 at 20485da8d731ac94a12dd58d77a68e64bf296c5b; historical only, not current`", "Next/PostCSS remains `WARN_SAFE_NEXT_TARGET_UNCLEAR`.", "`queue-015-v07-first-real-doc-gate-request` remains blocked."]) {
      expect(doc).toContain(required);
    }
  });

  it("uses the shared contract in runtime Settings and keeps stale current labels out", () => {
    const component = readFileSync(componentPath, "utf8");
    const contract = readFileSync("data/current-accepted-pushed-state.json", "utf8");
    expect(component).toContain('import currentAcceptedPushedState from "@/data/current-accepted-pushed-state.json";');
    expect(contract).toContain('"checkpoint_label": "v1.0.57 at 5b7a575"');
    expect(contract).toContain('"accepted_pushed_commit": "5b7a57584cc66d8b9ef9b7ff905c1682e58a9caa"');
    expect(contract).toContain('"short_commit": "20485da"');
    expect(component).toContain("Current accepted pushed checkpoint: {currentAcceptedPushedState.checkpoint_label}");
    expect(component).toContain("Current accepted pushed state is {currentAcceptedPushedState.checkpoint} at {currentAcceptedPushedState.accepted_pushed_commit}");
    expect(component).toContain("Older baselines, including 720a58a, 5c7f360, 886631f, 841dee7, 870d3a7, 87420e2, 8b42744, b4b9fcf, 20485da, 97574a9, 80e91c7, dfa7052, c72f14f, d20e125, bc8fbef, cfa7c2c, and 1465817, are historical only and not current.");
    expect(component).not.toContain("Current accepted pushed checkpoint: v1.0.17 at b4b9fcf");
    expect(component).not.toContain("Current accepted pushed checkpoint: v1.0.12 at 20485da");
    expect(component).not.toContain("Current accepted pushed checkpoint: v1.0.7 at 97574a9");
    expect(component).not.toContain("Current accepted pushed checkpoint: v1.0.2 at 80e91c7");
    expect(component).not.toContain("Current accepted pushed checkpoint: v0.9.97 at dfa7052");
    expect(component).not.toContain("Current accepted pushed checkpoint: v0.9.67 at 1465817");
    expect(component).not.toMatch(/<input[^>]+type=["']file["']/);
    expect(component).not.toContain("FileReader");
  });
});
