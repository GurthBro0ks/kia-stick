import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.79-next-safe-work-options";
const docPath = "docs/v0.9.79-next-safe-work-options.md";

describe("v0.9.79 next safe work options", () => {
  it("records safe next options without approving blocked work", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Continue fake-only proof/report/operator UX polish.",
      "Repeat official-source Next/PostCSS research later only if evidence changes.",
      "Request exact Next target approval only if a clean target is proven.",
      "Keep the real-doc gate blocked unless a separate one-document, one-gate packet is explicitly approved.",
      "Accepted pushed commit: `cfa7c2c72cbff14a8e9515119256a806a7b00bcd`",
      "Next/PostCSS remains `WARN_SAFE_NEXT_TARGET_UNCLEAR`.",
      "Exact clean Next target proven: no.",
      "v0.9.12C remains blocked.",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
      "No safe option listed here approves package mutation",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks safe options in feature state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0979_next_safe_work_options: {
        phase: string;
        status: string;
        safe_next_choices: string[];
        exact_next_target_proven: boolean;
        v0912c_blocked_pending_exact_target: boolean;
        queue_015_status: string;
        real_doc_gate_blocked: boolean;
      };
    };
    const state = featureList.v0979_next_safe_work_options;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.safe_next_choices).toContain("continue fake-only proof/report/operator UX polish");
    expect(state.safe_next_choices).toContain("repeat official-source research later if evidence changes");
    expect(state.safe_next_choices).toContain("separate exact Next target approval only if a clean target is proven later");
    expect(state.safe_next_choices).toContain("keep real-doc gate blocked unless separately approved");
    expect(state.exact_next_target_proven).toBe(false);
    expect(state.v0912c_blocked_pending_exact_target).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_gate_blocked).toBe(true);
  });
});
