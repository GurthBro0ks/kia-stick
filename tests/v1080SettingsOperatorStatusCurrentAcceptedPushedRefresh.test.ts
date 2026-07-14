import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.0.80-settings-operator-status-current-accepted-pushed-refresh";
const docPath = "docs/v1.0.80-settings-operator-status-current-accepted-pushed-refresh.md";
const componentPath = "components/KiaStickApp.tsx";

describe("v1.0.80 Settings operator-status current accepted pushed refresh", () => {
  it("documents f662b37 as the runtime operator-status baseline", () => {
    const doc = readFileSync(docPath, "utf8");
    for (const required of [phase, "Runtime headline: `Current accepted pushed checkpoint: v1.0.77 at f662b37`", "Runtime current state sentence: `Current accepted pushed state is v1.0.77 at f662b37de1eccf9f924d515615ef555270ee9d6d`", "Current accepted pushed QA: `validation PASS / manual QA PASS / pushed yes / HEAD == origin/main at f662b37`", "`v1.0.72 at cf2be1ffde6d52d6ad01f54f52ce8e8d7c937358; historical only, not current`", "Next/PostCSS remains `WARN_SAFE_NEXT_TARGET_UNCLEAR`.", "`queue-015-v07-first-real-doc-gate-request` remains blocked."]) {
      expect(doc).toContain(required);
    }
  });

  it("uses the shared contract in runtime Settings and keeps stale current labels out", () => {
    const component = readFileSync(componentPath, "utf8");
    const contract = readFileSync("data/current-accepted-pushed-state.json", "utf8");
    expect(component).toContain('import currentAcceptedPushedState from "@/data/current-accepted-pushed-state.json";');
    expect(contract).toContain('"checkpoint_label": "v1.1.37 at ac23ed9"');
    expect(contract).toContain('"accepted_pushed_commit": "ac23ed94adec34bd32062018bf20b0de616da395"');
    expect(contract).toContain('"short_commit": "f662b37"');
    expect(component).toContain("Current accepted pushed checkpoint: {currentAcceptedPushedState.checkpoint_label}");
    expect(component).toContain("Current accepted pushed state is {currentAcceptedPushedState.checkpoint} at {currentAcceptedPushedState.accepted_pushed_commit}");
    expect(component).toContain("historicalAcceptedPushedShortCommits");
    for (const stale of ["v1.0.77 at f662b37","v1.0.72 at cf2be1f","v1.0.67 at d099ff5","v1.0.62 at 73b3f38","v1.0.57 at 5b7a575","v1.0.52 at 720a58a","v1.0.47 at 5c7f360","v1.0.42 at 886631f","v1.0.37 at 841dee7","v1.0.32 at 870d3a7","v1.0.27 at 87420e2","v1.0.22 at 8b42744","v1.0.17 at b4b9fcf","v1.0.12 at 20485da","v1.0.7 at 97574a9","v1.0.2 at 80e91c7","v0.9.97 at dfa7052","v0.9.67 at 1465817"]) expect(component).not.toContain("Current accepted pushed checkpoint: " + stale);
    expect(component).not.toMatch(/<input[^>]+type=["']file["']/);
    expect(component).not.toContain("FileReader");
  });
});
