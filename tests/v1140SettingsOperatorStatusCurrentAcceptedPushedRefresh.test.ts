import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("v1.1.40 Settings current accepted pushed refresh", () => {
  it("uses shared current-local-bundle metadata without a stale component literal", () => {
    const component = readFileSync("components/KiaStickApp.tsx", "utf8");
    const contract = readFileSync("data/current-accepted-pushed-state.json", "utf8");
    expect(component).toContain('label: "This local bundle", value: currentAcceptedPushedState.local_bundle_status');
    expect(contract).toContain('"checkpoint_label": "v1.1.72 at ab1878e"');
    expect(contract).toContain('"accepted_pushed_commit": "ab1878e4c681c8f658e8a5bf6bd36f3ad4423fea"');
    expect(contract).toContain('"local_bundle_status": "v1.1.73-to-v1.1.77 post-closeout accepted-state contract refresh; validation PASS; pushed no; manual QA pending"');
    expect(component).not.toContain('label: "This local bundle", value: "v1.1.33-to-v1.1.37');
    expect(component).not.toMatch(/<input[^>]+type=["']file["']/);
    expect(component).not.toContain("FileReader");
  });
});
