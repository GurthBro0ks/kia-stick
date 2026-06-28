import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.31-future-next-implementation-gate-packet";
const docPath = "docs/v0.9.31-future-next-implementation-gate-packet.md";

describe("v0.9.31 future Next implementation gate packet", () => {
  it("requires separate exact target approval and a safe implementation workflow", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "planning-only",
      "Exact target: `next@<operator-approved-version>`",
      "npm install --save-exact next@<operator-approved-version>",
      "No future gate may use `npm audit fix`, `npm update`, `npm dedupe`, `npm prune`",
      "`package-lock.json` diff",
      "`npm audit --json`",
      "Manual browser QA",
      "Rollback must avoid `git reset --hard`",
      "`git revert <implementation_commit>`",
      "No real-doc capability.",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
      "Current result remains `WARN_SAFE_NEXT_TARGET_UNCLEAR`",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the future gate as unapproved and package-mutation-only-for-later", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0931_future_next_implementation_gate_packet: {
        phase: string;
        status: string;
        planning_only: boolean;
        exact_operator_target_required: boolean;
        command_shape: string;
        implementation_approved: boolean;
        rollback_without_reset_hard: boolean;
        package_lock_review_required: boolean;
        queue_015_status: string;
        real_doc_implementation_approved: boolean;
      };
    };
    const state = featureList.v0931_future_next_implementation_gate_packet;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("ready_to_push");
    expect(state.planning_only).toBe(true);
    expect(state.exact_operator_target_required).toBe(true);
    expect(state.command_shape).toBe("npm install --save-exact next@<operator-approved-version>");
    expect(state.implementation_approved).toBe(false);
    expect(state.rollback_without_reset_hard).toBe(true);
    expect(state.package_lock_review_required).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});
