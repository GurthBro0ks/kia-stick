import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.0.15-settings-operator-status-current-accepted-pushed-refresh";
const docPath = "docs/v1.0.15-settings-operator-status-current-accepted-pushed-refresh.md";
const componentPath = "components/KiaStickApp.tsx";

describe("v1.0.15 Settings operator-status current accepted pushed refresh", () => {
  it("documents 20485da as the runtime operator-status baseline", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Runtime headline: `Current accepted pushed checkpoint: v1.0.12 at 20485da`",
      "Runtime current state sentence: `Current accepted pushed state is v1.0.12 at 20485da8d731ac94a12dd58d77a68e64bf296c5b`",
      "Current accepted pushed QA: `validation PASS / manual QA PASS / pushed yes / HEAD == origin/main at 20485da`",
      "`v1.0.7 at 97574a91a5c19fda174ccd646aac96d3aaec688a; historical only, not current`",
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
    expect(contract).toContain('"short_commit": "20485da"');
    expect(component).toContain("Current accepted pushed checkpoint: {currentAcceptedPushedState.checkpoint_label}");
    expect(component).toContain("Current accepted pushed state is {currentAcceptedPushedState.checkpoint} at {currentAcceptedPushedState.accepted_pushed_commit}");
    expect(component).toContain("Older baselines, including 8b42744, b4b9fcf, 20485da, 97574a9, 80e91c7, dfa7052, c72f14f, d20e125, bc8fbef, cfa7c2c, and 1465817, are historical only and not current.");
    expect(component).not.toContain("Current accepted pushed checkpoint: v1.0.7 at 97574a9");
    expect(component).not.toContain("Current accepted pushed checkpoint: v1.0.2 at 80e91c7");
    expect(component).not.toContain("Current accepted pushed checkpoint: v0.9.97 at dfa7052");
    expect(component).not.toContain("Current accepted pushed checkpoint: v0.9.67 at 1465817");
    expect(component).not.toMatch(/<input[^>]+type=["']file["']/);
    expect(component).not.toContain("FileReader");
  });
});
