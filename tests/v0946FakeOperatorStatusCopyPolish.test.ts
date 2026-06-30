import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.46-fake-operator-status-copy-polish";
const docPath = "docs/v0.9.46-fake-operator-status-copy-polish.md";
const componentPath = "components/KiaStickApp.tsx";

describe("v0.9.46 fake operator status copy polish", () => {
  it("documents copy-only operator status polish", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "latest accepted pushed checkpoint `8358e63`",
      "latest accepted WARN checkpoint `beea159`",
      "current bundle status `PASS`",
      "Next/PostCSS parked as `WARN_SAFE_NEXT_TARGET_UNCLEAR`, not fixed",
      "no real-doc capability approved",
      "This is copy/status only.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("updates Settings copy without adding file intake wording", () => {
    const component = readFileSync(componentPath, "utf8");

    expect(component).toContain("Accepted pushed WARN checkpoint visible: 3b9fef5");
    expect(component).toContain("Accepted pushed WARN commit");
    expect(component).toContain("3b9fef5282e84f78453402cb10a37398300ae9c1");
    expect(component).toContain("manual QA ACCEPTED_WARN / pushed yes");
    expect(component).toContain("Accepted pushed commit");
    expect(component).toContain("928c614d0fcafb64b6ad79770c8d55a3b662b153");
    expect(component).toContain("manual QA PASS for v0.9.43-to-v0.9.47; pushed yes");
    expect(component).toContain("manual QA PASS; pushed no");
    expect(component).toContain("queue-015 blocked; no real-doc capability");
    expect(component).not.toMatch(/<input[^>]+type=["']file["']/);
    expect(component).not.toContain("FileReader");
  });
});
