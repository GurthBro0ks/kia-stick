import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.33-accepted-pushed-warn-state-checkpoint";
const docPath = "docs/v0.9.33-accepted-pushed-warn-state-checkpoint.md";
const acceptedWarnCommit = "beea159bb44ecc35ed8cb9b5a55aa1c0f3f217f6";
const acceptedWarnProof =
  "/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_28_to_v0_9_32_accepted_state_research_only_next_target_discovery_20260628T145445Z/warn_closeout_push_20260628T155630Z";

describe("v0.9.33 accepted pushed WARN state checkpoint", () => {
  it("records the accepted pushed WARN baseline without claiming a fix", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      acceptedWarnCommit,
      "`beea159`",
      acceptedWarnProof,
      "Manual QA status: `ACCEPTED_WARN`",
      "Push status: `yes`",
      "`HEAD == origin/main` at `beea159`",
      "Result: `WARN`",
      "Exact Next target proven: `no`",
      "Next/PostCSS remains parked as `WARN_SAFE_NEXT_TARGET_UNCLEAR`, not fixed.",
      "`KIA-Stick-v0.9.12C-next-runtime-framework-security-implementation` remains blocked",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
      "Manual QA is `PASS`",
      "No `npm install`, `npm update`, `npm audit fix`, `npm dedupe`, or `npm prune` was run.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the accepted WARN checkpoint in feature state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0933_accepted_pushed_warn_state_checkpoint: {
        phase: string;
        status: string;
        accepted_pushed_warn_commit: string;
        warn_closeout_push_proof_dir: string;
        accepted_manual_qa_status: string;
        accepted_push_status: string;
        current_bundle_manual_qa_status: string;
        next_postcss_status: string;
        exact_next_target_proven: boolean;
        v0912c_blocked_pending_exact_target: boolean;
        queue_015_status: string;
        package_lock_changed: boolean;
        real_doc_implementation_approved: boolean;
      };
    };
    const state = featureList.v0933_accepted_pushed_warn_state_checkpoint;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("ready_to_push");
    expect(state.accepted_pushed_warn_commit).toBe(acceptedWarnCommit);
    expect(state.warn_closeout_push_proof_dir).toBe(acceptedWarnProof);
    expect(state.accepted_manual_qa_status).toBe("ACCEPTED_WARN");
    expect(state.accepted_push_status).toBe("yes");
    expect(state.current_bundle_manual_qa_status).toBe("PASS");
    expect(state.next_postcss_status).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(state.exact_next_target_proven).toBe(false);
    expect(state.v0912c_blocked_pending_exact_target).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.package_lock_changed).toBe(false);
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});
