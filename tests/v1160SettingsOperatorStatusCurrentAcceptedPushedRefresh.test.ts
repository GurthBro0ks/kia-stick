import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("v1.1.60 Settings current accepted pushed refresh", () => {
  it("uses shared current and local-bundle metadata without stale component literals", () => {
    const component = readFileSync("components/KiaStickApp.tsx", "utf8");
    const contract = readFileSync("data/current-accepted-pushed-state.json", "utf8");
    expect(component).toContain('import currentAcceptedPushedState from "@/data/current-accepted-pushed-state.json";');
    expect(component).toContain("Current accepted pushed checkpoint: {currentAcceptedPushedState.checkpoint_label}");
    expect(component).toContain('label: "This local bundle", value: currentAcceptedPushedState.local_bundle_status');
    expect(contract).toContain('"checkpoint_label": "v1.1.57 at 65f8865"');
    expect(contract).toContain('"accepted_pushed_commit": "65f88659b238ae0cfacd51f0dab71844d885a76c"');
    expect(contract).toContain('"local_bundle_status": "v1.1.58-to-v1.1.62 post-closeout accepted-state contract refresh; validation PASS; pushed no; manual QA pending"');
    expect(component).not.toContain('label: "This local bundle", value: "v1.1.53-to-v1.1.57');
    expect(component).not.toMatch(/<input[^>]+type=["']file["']/);
    expect(component).not.toContain("FileReader");
  });
});
