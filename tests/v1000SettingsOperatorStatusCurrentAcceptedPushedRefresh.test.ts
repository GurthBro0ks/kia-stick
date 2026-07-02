import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.0.0-settings-operator-status-current-accepted-pushed-refresh";
const docPath = "docs/v1.0.0-settings-operator-status-current-accepted-pushed-refresh.md";
const componentPath = "components/KiaStickApp.tsx";

describe("v1.0.0 Settings operator-status current accepted pushed refresh", () => {
  it("documents dfa7052 as the runtime operator-status baseline", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Runtime headline: `Current accepted pushed checkpoint: v0.9.97 at dfa7052`",
      "Runtime current state sentence: `Current accepted pushed state is v0.9.97 at dfa7052e5bd87e8e96362c0e93565a29409964b3`",
      "Current accepted pushed QA: `validation PASS / manual QA PASS / pushed yes / HEAD == origin/main at dfa7052`",
      "`v0.9.92 at c72f14f15859c105637aa4193a976303a7de3233; historical only, not current`",
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
    expect(contract).toContain('"checkpoint_label": "v1.0.7 at 97574a9"');
    expect(contract).toContain('"accepted_pushed_commit": "97574a91a5c19fda174ccd646aac96d3aaec688a"');
    expect(component).toContain("Current accepted pushed checkpoint: {currentAcceptedPushedState.checkpoint_label}");
    expect(component).toContain("Current accepted pushed state is {currentAcceptedPushedState.checkpoint} at {currentAcceptedPushedState.accepted_pushed_commit}");
    expect(component).toContain("Older baselines, including 80e91c7, dfa7052, c72f14f, d20e125, bc8fbef, cfa7c2c, and 1465817, are historical only and not current.");
    expect(component).not.toContain("Current accepted pushed checkpoint: v0.9.92 at c72f14f");
    expect(component).not.toContain("Current accepted pushed checkpoint: v0.9.87 at d20e125");
    expect(component).not.toContain("Current accepted pushed checkpoint: v0.9.67 at 1465817");
    expect(component).not.toMatch(/<input[^>]+type=["']file["']/);
    expect(component).not.toContain("FileReader");
  });
});

