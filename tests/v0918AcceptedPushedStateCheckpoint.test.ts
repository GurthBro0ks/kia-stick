import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.18-accepted-pushed-state-checkpoint";
const docPath = "docs/v0.9.18-accepted-pushed-state-checkpoint.md";

describe("v0.9.18 accepted pushed state checkpoint", () => {
  it("records the v0.9.13-to-v0.9.17 accepted pushed baseline", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "67d7a314868b312f4b44f5adb2c0bdec24175b6d",
      "/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_13_to_v0_9_17_large_fake_only_stabilization_bundle_20260627T164301Z/closeout_push_20260627T172850Z",
      "Validation status: `PASS`.",
      "Manual QA status: `PASS`.",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked",
      "WARN_SAFE_NEXT_TARGET_UNCLEAR",
      "v0.9.12C-next-runtime-framework-security-implementation",
      "Product/package version remains `0.7.0`",
      "Prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks prior accepted pushed state and operator QA acceptance", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0918_accepted_pushed_state_checkpoint: {
        phase: string;
        status: string;
        prior_bundle_accepted_pushed_commit: string;
        prior_bundle_validation: string;
        prior_bundle_manual_qa_status: string;
        next_postcss_status: string;
        v0912c_blocked_pending_exact_target: boolean;
        package_lock_changed: boolean;
        queue_015_status: string;
        manual_qa_status: string;
      };
    };
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; status: string }>;
    };
    const state = featureList.v0918_accepted_pushed_state_checkpoint;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("ready_to_push");
    expect(state.prior_bundle_accepted_pushed_commit).toBe("67d7a314868b312f4b44f5adb2c0bdec24175b6d");
    expect(state.prior_bundle_validation).toBe("PASS");
    expect(state.prior_bundle_manual_qa_status).toBe("PASS");
    expect(state.next_postcss_status).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(state.v0912c_blocked_pending_exact_target).toBe(true);
    expect(state.package_lock_changed).toBe(false);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.manual_qa_status).toBe("PASS");
    expect(queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request")?.status).toBe("blocked");
  });
});
