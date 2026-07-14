import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.0.5-settings-operator-status-current-accepted-pushed-refresh";
const docPath = "docs/v1.0.5-settings-operator-status-current-accepted-pushed-refresh.md";
const componentPath = "components/KiaStickApp.tsx";

describe("v1.0.5 Settings operator-status current accepted pushed refresh", () => {
  it("documents 80e91c7 as the runtime operator-status baseline", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Runtime headline: `Current accepted pushed checkpoint: v1.0.2 at 80e91c7`",
      "Runtime current state sentence: `Current accepted pushed state is v1.0.2 at 80e91c74855dae6ee51bd9068e2794d08c495ec0`",
      "Current accepted pushed QA: `validation PASS / manual QA PASS / pushed yes / HEAD == origin/main at 80e91c7`",
      "`v0.9.97 at dfa7052e5bd87e8e96362c0e93565a29409964b3; historical only, not current`",
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
    expect(contract).toContain('"checkpoint_label": "v1.1.37 at ac23ed9"');
    expect(contract).toContain('"accepted_pushed_commit": "ac23ed94adec34bd32062018bf20b0de616da395"');
    expect(component).toContain("Current accepted pushed checkpoint: {currentAcceptedPushedState.checkpoint_label}");
    expect(component).toContain("Current accepted pushed state is {currentAcceptedPushedState.checkpoint} at {currentAcceptedPushedState.accepted_pushed_commit}");
    expect(component).toContain("historicalAcceptedPushedShortCommits");
    expect(component).not.toContain("Current accepted pushed checkpoint: v0.9.97 at dfa7052");
    expect(component).not.toContain("Current accepted pushed checkpoint: v0.9.92 at c72f14f");
    expect(component).not.toContain("Current accepted pushed checkpoint: v0.9.67 at 1465817");
    expect(component).not.toMatch(/<input[^>]+type=["']file["']/);
    expect(component).not.toContain("FileReader");
  });
});
