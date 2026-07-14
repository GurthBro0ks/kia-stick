import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("v1.1.25 Settings current accepted pushed refresh", () => {
  it("derives the Settings headline from the shared contract without file intake", () => {
    const component = readFileSync("components/KiaStickApp.tsx", "utf8");
    const contract = readFileSync("data/current-accepted-pushed-state.json", "utf8");
    expect(component).toContain('import currentAcceptedPushedState from "@/data/current-accepted-pushed-state.json";');
    expect(component).toContain("Current accepted pushed checkpoint: {currentAcceptedPushedState.checkpoint_label}");
    expect(contract).toContain('"checkpoint_label": "v1.1.22 at 0051a15"');
    expect(component).not.toMatch(/<input[^>]+type=["']file["']/);
    expect(component).not.toContain("FileReader");
  });
});
