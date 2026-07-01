import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.80-blocked-work-status-checkpoint";
const docPath = "docs/v0.9.80-blocked-work-status-checkpoint.md";

describe("v0.9.80 blocked work status checkpoint", () => {
  it("preserves all blocked work status labels", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Next/PostCSS runtime path: `WARN_SAFE_NEXT_TARGET_UNCLEAR`",
      "Exact clean Next target proven: no",
      "`KIA-Stick-v0.9.12C-next-runtime-framework-security-implementation`: blocked pending exact operator-approved target",
      "`queue-015-v07-first-real-doc-gate-request`: blocked",
      "Real-doc implementation: not approved",
      "Real-doc access: none",
      "Package/runtime-intake/service/Discord changes: none",
      "This checkpoint does not convert any WARN, parked, or blocked item into implementation approval.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("keeps queue-015 blocked in feature and backlog state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0980_blocked_work_status_checkpoint: {
        phase: string;
        status: string;
        next_postcss_status: string;
        exact_next_target_proven: boolean;
        v0912c_status: string;
        queue_015_status: string;
        real_doc_implementation_approved: boolean;
      };
    };
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; status: string; phase: string }>;
    };
    const state = featureList.v0980_blocked_work_status_checkpoint;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.next_postcss_status).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(state.exact_next_target_proven).toBe(false);
    expect(state.v0912c_status).toBe("blocked_pending_exact_target");
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_implementation_approved).toBe(false);
    expect(queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request")?.status).toBe("blocked");
    expect(queue.items.find((item) => item.phase === phase)).toBeUndefined();
  });
});
