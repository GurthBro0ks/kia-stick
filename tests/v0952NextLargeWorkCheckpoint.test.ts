import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.52-next-large-work-checkpoint";
const docPath = "docs/v0.9.52-next-large-work-checkpoint.md";

describe("v0.9.52 next large-work checkpoint", () => {
  it("records next choices while keeping Next/PostCSS parked", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "No exact clean target is proven.",
      "`next@16.2.9`",
      "`postcss@8.4.31`",
      "Result: `WARN_SAFE_NEXT_TARGET_UNCLEAR`.",
      "Continue fake-only proof/report/operator UX polish.",
      "Repeat official-source research later",
      "Manual QA remains `PENDING`",
      "Push is not performed by this local bundle.",
      "`KIA-Stick-v0.9.12C-next-runtime-framework-security-implementation` remains blocked",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the local checkpoint without package or queue drift", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0952_next_large_work_checkpoint: {
        phase: string;
        status: string;
        result: string;
        default_next_option: string;
        current_bundle_manual_qa_status: string;
        pushed: boolean;
        package_json_changed: boolean;
        package_lock_changed: boolean;
        next_implementation_blocked: boolean;
        real_doc_gate_blocked: boolean;
        queue_015_status: string;
      };
    };
    const state = featureList.v0952_next_large_work_checkpoint;
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; status: string; phase: string }>;
    };

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("needs_review");
    expect(state.result).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(state.default_next_option).toBe("continue fake-only proof/report/operator UX polish or repeat official-source research later");
    expect(state.current_bundle_manual_qa_status).toBe("PENDING");
    expect(state.pushed).toBe(false);
    expect(state.package_json_changed).toBe(false);
    expect(state.package_lock_changed).toBe(false);
    expect(state.next_implementation_blocked).toBe(true);
    expect(state.real_doc_gate_blocked).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request")?.status).toBe("blocked");
    expect(queue.items.find((item) => item.phase === phase)).toBeUndefined();
  });
});
