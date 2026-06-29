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
      "current bundle status `PENDING`",
      "Next/PostCSS parked as `WARN_SAFE_NEXT_TARGET_UNCLEAR`, not fixed",
      "no real-doc capability approved",
      "This is copy/status only.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("updates Settings copy without adding file intake wording", () => {
    const component = readFileSync(componentPath, "utf8");

    expect(component).toContain("Accepted pushed checkpoint visible: 8358e63");
    expect(component).toContain("Accepted pushed commit");
    expect(component).toContain("8358e6352557c4af05d9c40401691d2bf73f06ef");
    expect(component).toContain("manual QA PENDING for v0.9.43-to-v0.9.47; pushed no");
    expect(component).toContain("queue-015 blocked; no real-doc capability");
    expect(component).not.toMatch(/<input[^>]+type=["']file["']/);
    expect(component).not.toContain("FileReader");
  });
});
