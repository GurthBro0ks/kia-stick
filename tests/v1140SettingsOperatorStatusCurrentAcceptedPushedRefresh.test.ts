import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("v1.1.40 Settings current accepted pushed refresh", () => {
  it("uses shared current-local-bundle metadata without a stale component literal", () => {
    const component = readFileSync("components/KiaStickApp.tsx", "utf8");
    const contract = readFileSync("data/current-accepted-pushed-state.json", "utf8");
    expect(component).toContain('label: "This local bundle", value: currentAcceptedPushedState.local_bundle_status');
    expect(contract).toContain('"checkpoint_label": "v1.1.52 at 857ba0e"');
    expect(contract).toContain('"accepted_pushed_commit": "857ba0e0180b2bca27823367c871429ece0c5214"');
    expect(contract).toContain('"local_bundle_status": "v1.1.53-to-v1.1.57 post-closeout accepted-state contract refresh; validation PASS; pushed no; manual QA pending"');
    expect(component).not.toContain('label: "This local bundle", value: "v1.1.33-to-v1.1.37');
    expect(component).not.toMatch(/<input[^>]+type=["']file["']/);
    expect(component).not.toContain("FileReader");
  });
});
