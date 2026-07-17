import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("v1.1.75 Settings current accepted pushed refresh", () => {
  it("uses shared current and local-bundle metadata without stale component literals", () => {
    const component = readFileSync("components/KiaStickApp.tsx", "utf8");
    const contract = readFileSync("data/current-accepted-pushed-state.json", "utf8");
    expect(component).toContain('import currentAcceptedPushedState from "@/data/current-accepted-pushed-state.json";');
    expect(component).toContain("Current accepted pushed checkpoint: {currentAcceptedPushedState.checkpoint_label}");
    expect(component).toContain('label: "This local bundle", value: currentAcceptedPushedState.local_bundle_status');
    expect(contract).toContain('"checkpoint_label": "v1.1.72 at ab1878e"');
    expect(contract).toContain('"accepted_pushed_commit": "ab1878e4c681c8f658e8a5bf6bd36f3ad4423fea"');
    expect(contract).toContain('"local_bundle_status": "v1.1.73-to-v1.1.77 post-closeout accepted-state contract refresh; validation PASS; pushed no; manual QA pending"');
    expect(component).not.toContain('label: "This local bundle", value: "v1.1.68-to-v1.1.72');
    expect(component).not.toMatch(/<input[^>]+type=["']file["']/);
    expect(component).not.toContain("FileReader");
  });
});
