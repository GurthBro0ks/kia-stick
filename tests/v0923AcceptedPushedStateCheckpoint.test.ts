import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.23-accepted-pushed-state-checkpoint";
const docPath = "docs/v0.9.23-accepted-pushed-state-checkpoint.md";
const acceptedCommit = "c5d12a004f4c9d270260ee860781b99421a938dd";
const acceptedProofDir = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_18_to_v0_9_22_fake_only_qa_evidence_proof_readiness_bundle_20260628T111708Z/closeout_push_20260628T120057Z";

describe("v0.9.23 accepted pushed state checkpoint", () => {
  it("documents the accepted pushed v0.9.18-to-v0.9.22 baseline and current pending review state", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      acceptedCommit,
      acceptedProofDir,
      "Validation status: `PASS`",
      "Manual QA status: `PASS`",
      "Manual QA remains `PENDING`",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
      "Next/PostCSS remains parked as `WARN_SAFE_NEXT_TARGET_UNCLEAR`.",
      "No real documents are read",
      "No file picker, FileReader, upload handler",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the accepted baseline without claiming current manual QA or push", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0923_accepted_pushed_state_checkpoint: {
        phase: string;
        status: string;
        accepted_pushed_commit: string;
        accepted_closeout_proof_dir: string;
        accepted_validation: string;
        accepted_manual_qa_status: string;
        current_manual_qa_status: string;
        pushed: boolean;
        queue_015_status: string;
        real_doc_implementation_approved: boolean;
      };
    };
    const state = featureList.v0923_accepted_pushed_state_checkpoint;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("needs_review");
    expect(state.accepted_pushed_commit).toBe(acceptedCommit);
    expect(state.accepted_closeout_proof_dir).toBe(acceptedProofDir);
    expect(state.accepted_validation).toBe("PASS");
    expect(state.accepted_manual_qa_status).toBe("PASS");
    expect(state.current_manual_qa_status).toBe("PENDING");
    expect(state.pushed).toBe(false);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});
