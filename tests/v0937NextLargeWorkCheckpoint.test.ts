import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.37-next-large-work-checkpoint";
const docPath = "docs/v0.9.37-next-large-work-checkpoint.md";

describe("v0.9.37 next large-work checkpoint", () => {
  it("records next choices while preserving blocked Next and real-doc gates", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "v0.9.33 records accepted pushed WARN state",
      "v0.9.34 improves accepted-WARN proof/report readability.",
      "v0.9.35 polishes fake-only operator status copy.",
      "v0.9.36 adds proof helper WARN edge-case tests.",
      "Next/PostCSS remains `WARN_SAFE_NEXT_TARGET_UNCLEAR`.",
      "No exact clean Next target is proven.",
      "`KIA-Stick-v0.9.12C-next-runtime-framework-security-implementation` remains blocked",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
      "Run deeper official advisory/release-note research only",
      "Keep real-doc gate blocked",
      "Manual QA is `PASS`",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks local next-work state without queue or package drift", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0937_next_large_work_checkpoint: {
        phase: string;
        status: string;
        current_bundle_manual_qa_status: string;
        pushed: boolean;
        package_json_changed: boolean;
        package_lock_changed: boolean;
        next_implementation_blocked: boolean;
        real_doc_gate_blocked: boolean;
        queue_015_status: string;
        safe_next_options: string[];
      };
    };
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; phase: string; status: string }>;
    };
    const state = featureList.v0937_next_large_work_checkpoint;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("ready_to_push");
    expect(state.current_bundle_manual_qa_status).toBe("PASS");
    expect(state.pushed).toBe(false);
    expect(state.package_json_changed).toBe(false);
    expect(state.package_lock_changed).toBe(false);
    expect(state.next_implementation_blocked).toBe(true);
    expect(state.real_doc_gate_blocked).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.safe_next_options).toContain("continue fake-only proof/report readability or operator UX polish");
    expect(state.safe_next_options).toContain("deeper official advisory/release-note research only with no package mutation");
    expect(queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request")?.status).toBe("blocked");
    expect(queue.items.find((item) => item.phase === phase)).toBeUndefined();
  });
});
