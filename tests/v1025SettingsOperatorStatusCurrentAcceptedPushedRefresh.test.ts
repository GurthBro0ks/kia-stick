import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.0.25-settings-operator-status-current-accepted-pushed-refresh";
const docPath = "docs/v1.0.25-settings-operator-status-current-accepted-pushed-refresh.md";
const componentPath = "components/KiaStickApp.tsx";

describe("v1.0.25 Settings operator-status current accepted pushed refresh", () => {
  it("documents 8b42744 as the runtime operator-status baseline", () => {
    const doc = readFileSync(docPath, "utf8");
    for (const required of [phase, "Runtime headline: `Current accepted pushed checkpoint: v1.0.22 at 8b42744`", "Runtime current state sentence: `Current accepted pushed state is v1.0.22 at 8b4274413ca056a4b647a163fd79c8165a024820`", "Current accepted pushed QA: `validation PASS / manual QA PASS / pushed yes / HEAD == origin/main at 8b42744`", "`v1.0.17 at b4b9fcfce31108b09350e7d304fd1cff105edc31; historical only, not current`", "Next/PostCSS remains `WARN_SAFE_NEXT_TARGET_UNCLEAR`.", "`queue-015-v07-first-real-doc-gate-request` remains blocked."]) {
      expect(doc).toContain(required);
    }
  });

  it("uses the shared contract in runtime Settings and keeps stale current labels out", () => {
    const component = readFileSync(componentPath, "utf8");
    const contract = readFileSync("data/current-accepted-pushed-state.json", "utf8");
    expect(component).toContain('import currentAcceptedPushedState from "@/data/current-accepted-pushed-state.json";');
    expect(contract).toContain('"checkpoint_label": "v1.1.47 at b8fb834"');
    expect(contract).toContain('"accepted_pushed_commit": "b8fb8341b19980c33d7163a6993cc0e8ba520641"');
    expect(contract).toContain('"short_commit": "d099ff5"');
    expect(component).toContain("Current accepted pushed checkpoint: {currentAcceptedPushedState.checkpoint_label}");
    expect(component).toContain("Current accepted pushed state is {currentAcceptedPushedState.checkpoint} at {currentAcceptedPushedState.accepted_pushed_commit}");
    expect(component).toContain("historicalAcceptedPushedShortCommits");
    for (const stale of ["v1.0.17 at b4b9fcf", "v1.0.12 at 20485da", "v1.0.7 at 97574a9", "v1.0.2 at 80e91c7", "v0.9.97 at dfa7052", "v0.9.67 at 1465817"]) {
      expect(component).not.toContain("Current accepted pushed checkpoint: " + stale);
    }
    expect(component).not.toMatch(/<input[^>]+type=["']file["']/);
    expect(component).not.toContain("FileReader");
  });
});
