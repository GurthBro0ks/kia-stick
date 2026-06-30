import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.64-no-actionable-queue-decision-clarity";
const docPath = "docs/v0.9.64-no-actionable-queue-decision-clarity.md";

describe("v0.9.64 no-actionable queue decision clarity", () => {
  it("documents that no-actionable output does not approve blocked or parked work", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "No actionable queue items.",
      "Accepted, blocked, and parked items are intentionally skipped; this does not approve blocked work.",
      "does not mean blocked or parked work is complete, approved, safe to implement, or ready to push",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked and is skipped.",
      "`KIA-Stick-v0.9.12C-next-runtime-framework-security-implementation` remains blocked",
      "Next/PostCSS remains `WARN_SAFE_NEXT_TARGET_UNCLEAR`",
      "does not unblock queue-015, v0.9.12C, or Next/PostCSS",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("prints no-actionable queue output with safe choices and no runtime intake", () => {
    const result = spawnSync("node", ["scripts/task-queue.mjs", "next"], { encoding: "utf8" });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("No actionable queue items.");
    expect(result.stdout).toContain("this does not approve blocked work");
    expect(result.stdout).toContain("continue fake-only proof/report/operator UX polish");
    expect(result.stdout).toContain("request exact Next target approval only if a clean target is proven");
    expect(result.stdout).toContain("keep the real-doc gate blocked unless a separate one-document, one-gate approval packet is explicitly approved");
    expect(result.stdout).not.toMatch(/<input[^>]*type=["']file/i);
    expect(result.stdout).not.toMatch(/\bshowOpenFilePicker\b|\bFileReader\b|\breadAsText\b|\breadAsArrayBuffer\b/i);
  });

  it("tracks queue clarity without changing queue status", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0964_no_actionable_queue_decision_clarity: {
        phase: string;
        status: string;
        queue_status_changed: boolean;
        queue_015_status: string;
        v0912c_blocked_pending_exact_target: boolean;
        next_postcss_status: string;
        blocked_work_approved_by_no_actionable_output: boolean;
        package_lock_changed: boolean;
      };
    };
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; status: string }>;
    };
    const state = featureList.v0964_no_actionable_queue_decision_clarity;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.queue_status_changed).toBe(false);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.v0912c_blocked_pending_exact_target).toBe(true);
    expect(state.next_postcss_status).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(state.blocked_work_approved_by_no_actionable_output).toBe(false);
    expect(state.package_lock_changed).toBe(false);
    expect(queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request")?.status).toBe("blocked");
  });
});
