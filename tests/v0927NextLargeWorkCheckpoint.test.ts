import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.27-next-large-work-checkpoint";
const docPath = "docs/v0.9.27-next-large-work-checkpoint.md";

describe("v0.9.27 next large-work checkpoint", () => {
  it("records next safe options with manual browser screenshot QA as the default", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Run manual browser screenshot QA using the fake-only Settings and helper evidence surfaces.",
      "Continue fake-only operator UX polish without new intake paths.",
      "research-only Next target discovery without installing or implementing a target",
      "Manual QA is `PASS`",
      "Push is not performed by this local bundle.",
      "Next/PostCSS remains parked as `WARN_SAFE_NEXT_TARGET_UNCLEAR`.",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
      "Closeout/push requires a separate prompt",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the local checkpoint without adding queue entries or unblocking parked work", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0927_next_large_work_checkpoint: {
        phase: string;
        status: string;
        default_next_option: string;
        manual_screenshot_qa_default: boolean;
        research_only_next_target_discovery_allowed: boolean;
        next_implementation_blocked: boolean;
        real_doc_gate_blocked: boolean;
        queue_015_status: string;
        current_manual_qa_status: string;
        pushed: boolean;
      };
    };
    const state = featureList.v0927_next_large_work_checkpoint;
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; phase: string; status: string }>;
    };

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("ready_to_push");
    expect(state.default_next_option).toBe("manual browser screenshot QA using fake-only Settings/helper evidence surfaces");
    expect(state.manual_screenshot_qa_default).toBe(true);
    expect(state.research_only_next_target_discovery_allowed).toBe(true);
    expect(state.next_implementation_blocked).toBe(true);
    expect(state.real_doc_gate_blocked).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.current_manual_qa_status).toBe("PASS");
    expect(state.pushed).toBe(false);
    expect(queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request")?.status).toBe("blocked");
    expect(queue.items.find((item) => item.phase === phase)).toBeUndefined();
  });
});
