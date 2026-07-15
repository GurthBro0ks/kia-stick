import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("v1.1.50 Settings current accepted pushed refresh", () => {
  it("uses shared current-local-bundle metadata without a stale component literal", () => {
    const component = readFileSync("components/KiaStickApp.tsx", "utf8");
    const contract = readFileSync("data/current-accepted-pushed-state.json", "utf8");
    expect(component).toContain('label: "This local bundle", value: currentAcceptedPushedState.local_bundle_status');
    expect(contract).toContain('"checkpoint_label": "v1.1.47 at b8fb834"');
    expect(contract).toContain('"accepted_pushed_commit": "b8fb8341b19980c33d7163a6993cc0e8ba520641"');
    expect(contract).toContain('"local_bundle_status": "v1.1.48-to-v1.1.52 post-closeout accepted-state contract refresh; validation PASS; pushed no; manual QA pending"');
    expect(component).not.toContain('label: "This local bundle", value: "v1.1.43-to-v1.1.47');
    expect(component).not.toMatch(/<input[^>]+type=["']file["']/);
    expect(component).not.toContain("FileReader");
  });
});
