import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("v1.1.70 Settings current accepted pushed refresh", () => {
  it("uses shared current and local-bundle metadata without stale component literals", () => {
    const component = readFileSync("components/KiaStickApp.tsx", "utf8");
    const contract = readFileSync("data/current-accepted-pushed-state.json", "utf8");
    expect(component).toContain('import currentAcceptedPushedState from "@/data/current-accepted-pushed-state.json";');
    expect(component).toContain("Current accepted pushed checkpoint: {currentAcceptedPushedState.checkpoint_label}");
    expect(component).toContain('label: "This local bundle", value: currentAcceptedPushedState.local_bundle_status');
    expect(contract).toContain('"checkpoint_label": "v1.1.67 at 0cb007d"');
    expect(contract).toContain('"accepted_pushed_commit": "0cb007d38c6e17d316cc25640f0fb28b2b934c55"');
    expect(contract).toContain('"local_bundle_status": "v1.1.68-to-v1.1.72 post-closeout accepted-state contract refresh; validation PASS; pushed no; manual QA pending"');
    expect(component).not.toContain('label: "This local bundle", value: "v1.1.63-to-v1.1.67');
    expect(component).not.toMatch(/<input[^>]+type=["']file["']/);
    expect(component).not.toContain("FileReader");
  });
});
