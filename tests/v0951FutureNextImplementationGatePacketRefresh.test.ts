import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.51-future-next-implementation-gate-packet-refresh";
const docPath = "docs/v0.9.51-future-next-implementation-gate-packet-refresh.md";

describe("v0.9.51 future Next implementation gate packet refresh", () => {
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
      "Stop before implementation or before push if",
      "Current result remains `WARN_SAFE_NEXT_TARGET_UNCLEAR`",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the future gate as unapproved and package-mutation-only-for-later", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0951_future_next_implementation_gate_packet_refresh: {
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
    const state = featureList.v0951_future_next_implementation_gate_packet_refresh;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("needs_review");
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
