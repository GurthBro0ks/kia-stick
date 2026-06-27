import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.17-next-large-work-checkpoint";
const docPath = "docs/v0.9.17-next-large-work-checkpoint.md";

describe("v0.9.17 next large-work checkpoint", () => {
  it("records next safe options with fake-only UX/tooling as default", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Continue fake-only UX/tooling bundle work.",
      "Next/runtime implementation remains blocked.",
      "Next/PostCSS advisories remain parked as `WARN_SAFE_NEXT_TARGET_UNCLEAR`.",
      "Real-doc gate remains blocked.",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
      "Manual QA status is `PASS`",
      "Push requires a separate closeout/push phase",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the local bundle as pending operator review", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0917_next_large_work_checkpoint: {
        phase: string;
        status: string;
        default_next_option: string;
        next_runtime_implementation_blocked: boolean;
        real_doc_gate_blocked: boolean;
        queue_015_status: string;
        pushed: boolean;
        manual_qa_status: string;
      };
    };
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; status: string }>;
    };
    const state = featureList.v0917_next_large_work_checkpoint;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("ready_to_push");
    expect(state.default_next_option).toBe("continue fake-only UX/tooling bundle work");
    expect(state.next_runtime_implementation_blocked).toBe(true);
    expect(state.real_doc_gate_blocked).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.pushed).toBe(false);
    expect(state.manual_qa_status).toBe("PASS");
    expect(queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request")?.status).toBe("blocked");
  });
});
