import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.56-fake-operator-status-accepted-warn-push-polish";
const docPath = "docs/v0.9.56-fake-operator-status-accepted-warn-push-polish.md";
const componentPath = "components/KiaStickApp.tsx";

describe("v0.9.56 fake operator status accepted-WARN push polish", () => {
  it("documents copy-only Settings accepted-WARN push status", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "latest accepted pushed WARN checkpoint `3b9fef5`",
      "accepted-WARN state is parked, not fixed",
      "Next/PostCSS remains `WARN_SAFE_NEXT_TARGET_UNCLEAR`",
      "`KIA-Stick-v0.9.12C-next-runtime-framework-security-implementation` remains blocked",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked",
      "package lock unchanged",
      "no real-doc capability",
      "This is copy/status only.",
      "Manual QA for this v0.9.53-to-v0.9.57 bundle is `PASS`",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("updates Settings copy without adding intake affordances", () => {
    const component = readFileSync(componentPath, "utf8");

    expect(component).toContain("Accepted pushed WARN checkpoint visible: 3b9fef5");
    expect(component).toContain("accepted-WARN parked, not fixed");
    expect(component).toContain("3b9fef5282e84f78453402cb10a37398300ae9c1");
    expect(component).toContain("manual QA ACCEPTED_WARN / pushed yes");
    expect(component).toContain("v0.9.53-to-v0.9.57 local polish manual QA PASS");
    expect(component).toContain("manual QA PASS; pushed no");
    expect(component).toContain("queue-015 blocked; no real-doc capability");
    expect(component).toContain("unchanged; no install/update/audit-fix/dedupe/prune");
    expect(component).not.toMatch(/<input[^>]+type=["']file["']/);
    expect(component).not.toContain("FileReader");
    expect(component).not.toContain("showOpenFilePicker");
  });
});
