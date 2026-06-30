import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.53-accepted-pushed-warn-state-checkpoint";
const docPath = "docs/v0.9.53-accepted-pushed-warn-state-checkpoint.md";
const acceptedWarnCommit = "3b9fef5282e84f78453402cb10a37398300ae9c1";
const closeoutProof =
  "/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_48_to_v0_9_52_operator_qa_acceptance_recording_20260630T183635Z/warn_closeout_push_20260630T185549Z";

describe("v0.9.53 accepted pushed WARN state checkpoint", () => {
  it("records the accepted pushed WARN baseline without implying a fix", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      acceptedWarnCommit,
      "`3b9fef5`",
      closeoutProof,
      "Result: `PASS_ACCEPTED_WARN`",
      "Manual QA status: `ACCEPTED_WARN`",
      "Push status: `yes`",
      "`HEAD == origin/main` at `3b9fef5`",
      "Accepted-WARN is a parked operator-accepted WARN state.",
      "does not mean fixed",
      "Next/PostCSS remains `WARN_SAFE_NEXT_TARGET_UNCLEAR`.",
      "`KIA-Stick-v0.9.12C-next-runtime-framework-security-implementation` remains blocked",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
      "Product/package version remains `0.7.0`.",
      "Prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`.",
      "`package.json` did not change.",
      "`package-lock.json` did not change.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the accepted pushed WARN checkpoint in feature state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0953_accepted_pushed_warn_state_checkpoint: {
        phase: string;
        status: string;
        accepted_pushed_commit: string;
        accepted_pushed_short_commit: string;
        closeout_push_proof_dir: string;
        result: string;
        manual_qa_status: string;
        pushed: boolean;
        head_equals_origin_main_after_push: boolean;
        next_postcss_status: string;
        accepted_warn_means_fixed: boolean;
        package_json_changed: boolean;
        package_lock_changed: boolean;
        v0912c_blocked_pending_exact_target: boolean;
        queue_015_status: string;
      };
    };
    const state = featureList.v0953_accepted_pushed_warn_state_checkpoint;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.accepted_pushed_commit).toBe(acceptedWarnCommit);
    expect(state.accepted_pushed_short_commit).toBe("3b9fef5");
    expect(state.closeout_push_proof_dir).toBe(closeoutProof);
    expect(state.result).toBe("PASS_ACCEPTED_WARN");
    expect(state.manual_qa_status).toBe("ACCEPTED_WARN");
    expect(state.pushed).toBe(true);
    expect(state.head_equals_origin_main_after_push).toBe(true);
    expect(state.next_postcss_status).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(state.accepted_warn_means_fixed).toBe(false);
    expect(state.package_json_changed).toBe(false);
    expect(state.package_lock_changed).toBe(false);
    expect(state.v0912c_blocked_pending_exact_target).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
  });
});
