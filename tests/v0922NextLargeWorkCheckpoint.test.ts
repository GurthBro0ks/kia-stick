import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.22-next-large-work-checkpoint";
const docPath = "docs/v0.9.22-next-large-work-checkpoint.md";

describe("v0.9.22 next large-work checkpoint", () => {
  it("records next safe options with larger fake-only UX/tooling as default", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Continue larger fake-only UX/tooling work.",
      "manual browser screenshot QA evidence",
      "research-only Next target discovery without installing or implementing a target",
      "Next implementation remains blocked.",
      "Next/PostCSS remains parked as `WARN_SAFE_NEXT_TARGET_UNCLEAR`.",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
      "Manual QA status is `PENDING`",
      "Closeout/push requires a separate prompt",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the bundle checkpoint without unblocking Next, real-doc, or queue-015", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0922_next_large_work_checkpoint: {
        phase: string;
        status: string;
        default_next_option: string;
        research_only_next_target_discovery_allowed: boolean;
        next_implementation_blocked: boolean;
        real_doc_gate_blocked: boolean;
        queue_015_status: string;
        pushed: boolean;
        manual_qa_status: string;
      };
    };
    const state = featureList.v0922_next_large_work_checkpoint;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("needs_review");
    expect(state.default_next_option).toBe("continue larger fake-only UX/tooling work");
    expect(state.research_only_next_target_discovery_allowed).toBe(true);
    expect(state.next_implementation_blocked).toBe(true);
    expect(state.real_doc_gate_blocked).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.pushed).toBe(false);
    expect(state.manual_qa_status).toBe("PENDING");
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; phase: string; status: string }>;
    };
    expect(queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request")?.status).toBe("blocked");
    expect(queue.items.find((item) => item.phase === phase)).toBeUndefined();
  });
});
