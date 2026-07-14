import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("v1.1.25 Settings current accepted pushed refresh", () => {
  it("derives the Settings headline from the shared contract without file intake", () => {
    const component = readFileSync("components/KiaStickApp.tsx", "utf8");
    const contract = readFileSync("data/current-accepted-pushed-state.json", "utf8");
    expect(component).toContain('import currentAcceptedPushedState from "@/data/current-accepted-pushed-state.json";');
    expect(component).toContain("Current accepted pushed checkpoint: {currentAcceptedPushedState.checkpoint_label}");
    expect(contract).toContain('"checkpoint_label": "v1.1.27 at a215dd4"');
    expect(contract).toContain('"accepted_pushed_commit": "a215dd4ac4687ea878263d38ea9d4bdbaf444a71"');
    expect(component).toContain('label: "This local bundle", value: "v1.1.28-to-v1.1.32 post-closeout accepted-state contract refresh; validation PASS; pushed no; manual QA pending"');
    expect(component).not.toContain('label: "This local bundle", value: "v1.1.23-to-v1.1.27');
    expect(component).not.toMatch(/<input[^>]+type=["']file["']/);
    expect(component).not.toContain("FileReader");
  });
});
