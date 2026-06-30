import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.61-closeout-proof-index-cross-check-output";
const docPath = "docs/v0.9.61-closeout-proof-index-cross-check-output.md";

describe("v0.9.61 closeout/proof-index cross-check output", () => {
  it("documents cross-check fields without weakening stop rules", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "manual QA is `PASS`",
      "pushed is `yes`",
      "accepted-WARN / parked state means not fixed",
      "local-ahead/no-push remains a separate pre-push state",
      "package-lock remains unchanged",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
      "`KIA-Stick-v0.9.12C-next-runtime-framework-security-implementation` remains blocked.",
      "Next/PostCSS remains `WARN_SAFE_NEXT_TARGET_UNCLEAR`.",
      "does not weaken stop-on-WARN/FAIL behavior",
      "does not mutate proof directories, push, change dependencies, change package files",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks helper alignment in feature_list", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0961_closeout_proof_index_cross_check_output: {
        phase: string;
        status: string;
        closeout_helper_prefers_v0958_checkpoint: boolean;
        proof_index_labels_added: boolean;
        stop_on_warn_fail_weakened: boolean;
        queue_015_status: string;
        package_lock_changed: boolean;
      };
    };
    const state = featureList.v0961_closeout_proof_index_cross_check_output;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.closeout_helper_prefers_v0958_checkpoint).toBe(true);
    expect(state.proof_index_labels_added).toBe(true);
    expect(state.stop_on_warn_fail_weakened).toBe(false);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.package_lock_changed).toBe(false);
  });
});
