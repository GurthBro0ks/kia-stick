import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.1.20-settings-operator-status-current-accepted-pushed-refresh";
const docPath = "docs/v1.1.20-settings-operator-status-current-accepted-pushed-refresh.md";
const componentPath = "components/KiaStickApp.tsx";

describe("v1.1.20 Settings operator-status current accepted pushed refresh", () => {
  it("documents aa8f8c6 as the runtime operator-status baseline", () => {
    const doc = readFileSync(docPath, "utf8");
    for (const required of [phase, "Runtime headline: `Current accepted pushed checkpoint: v1.1.17 at aa8f8c6`", "Runtime current state sentence: `Current accepted pushed state is v1.1.17 at aa8f8c651a000037f403abd41bc206bda161a861`", "Current accepted pushed QA: `validation PASS / manual QA PASS / pushed yes / HEAD == origin/main at aa8f8c6`", "`v1.1.12 at b911fd1530d5fc106b3368339a439527c2a43538; historical only, not current`", "Next/PostCSS remains `WARN_SAFE_NEXT_TARGET_UNCLEAR`.", "`queue-015-v07-first-real-doc-gate-request` remains blocked."]) expect(doc).toContain(required);
  });

  it("uses the shared contract in runtime Settings and keeps stale current labels out", () => {
    const component = readFileSync(componentPath, "utf8");
    const contract = readFileSync("data/current-accepted-pushed-state.json", "utf8");
    expect(component).toContain('import currentAcceptedPushedState from "@/data/current-accepted-pushed-state.json";');
    expect(contract).toContain('"checkpoint_label": "v1.1.27 at a215dd4"');
    expect(contract).toContain('"accepted_pushed_commit": "a215dd4ac4687ea878263d38ea9d4bdbaf444a71"');
    expect(contract).toContain('"accepted_pushed_short_commit": "a215dd4"');
    expect(component).toContain("Current accepted pushed checkpoint: {currentAcceptedPushedState.checkpoint_label}");
    expect(component).toContain("Current accepted pushed state is {currentAcceptedPushedState.checkpoint} at {currentAcceptedPushedState.accepted_pushed_commit}");
    expect(component).toContain("historicalAcceptedPushedShortCommits");
    for (const stale of ["v1.1.12 at b911fd1","v1.1.7 at 628fbd4","v1.1.2 at 6d0715b","v1.0.97 at 1da06ff","v1.0.92 at 0269435","v1.0.87 at fcf5097","v1.0.82 at 6ca589d","v1.0.77 at f662b37","v1.0.72 at cf2be1f","v1.0.67 at d099ff5","v1.0.62 at 73b3f38","v1.0.57 at 5b7a575","v1.0.52 at 720a58a","v1.0.47 at 5c7f360","v1.0.42 at 886631f","v1.0.37 at 841dee7","v1.0.32 at 870d3a7","v1.0.27 at 87420e2","v1.0.22 at 8b42744","v1.0.17 at b4b9fcf","v1.0.12 at 20485da","v1.0.7 at 97574a9","v1.0.2 at 80e91c7","v0.9.97 at dfa7052","v0.9.92 at c72f14f","v0.9.87 at d20e125","v0.9.82 at bc8fbef","v0.9.77 at cfa7c2c","v0.9.67 at 1465817"]) expect(component).not.toContain("Current accepted pushed checkpoint: " + stale);
    expect(component).not.toMatch(/<input[^>]+type=["']file["']/);
    expect(component).not.toContain("FileReader");
  });
});
