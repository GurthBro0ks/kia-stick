import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.65-safe-next-work-selector-polish";
const docPath = "docs/v0.9.65-safe-next-work-selector-polish.md";

describe("v0.9.65 safe next-work selector polish", () => {
  it("lists only safe next choices and explicit stop conditions", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Continue fake-only proof/report/operator UX polish.",
      "Repeat official-source research later if evidence changes.",
      "Request exact Next target approval only if a clean target is proven.",
      "Keep the real-doc gate blocked unless a separate one-document, one-gate approval packet is explicitly approved.",
      "Stop before work if a proposed next step would add a file picker",
      "dependency mutation",
      "package-file mutation",
      "This phase is fake-only docs/tests/tooling/status work.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks safe next choices without approving runtime or package changes", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0965_safe_next_work_selector_polish: {
        phase: string;
        status: string;
        safe_next_choices: string[];
        exact_next_target_approved: boolean;
        real_doc_gate_unblocked: boolean;
        package_json_changed: boolean;
        package_lock_changed: boolean;
        real_doc_capability_added: boolean;
      };
    };
    const state = featureList.v0965_safe_next_work_selector_polish;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.safe_next_choices).toEqual([
      "continue fake-only proof/report/operator UX polish",
      "repeat official-source research later if evidence changes",
      "request exact Next target approval only if a clean target is proven",
      "keep real-doc gate blocked unless separately approved",
    ]);
    expect(state.exact_next_target_approved).toBe(false);
    expect(state.real_doc_gate_unblocked).toBe(false);
    expect(state.package_json_changed).toBe(false);
    expect(state.package_lock_changed).toBe(false);
    expect(state.real_doc_capability_added).toBe(false);
  });
});
