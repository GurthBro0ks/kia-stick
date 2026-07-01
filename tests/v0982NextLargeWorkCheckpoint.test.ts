import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.82-next-large-work-checkpoint";
const docPath = "docs/v0.9.82-next-large-work-checkpoint.md";

describe("v0.9.82 next large-work checkpoint", () => {
  it("records next choices after accepted pushed state recording", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "v0.9.78 records accepted pushed v0.9.77 closeout at `cfa7c2c`.",
      "v0.9.79 records safe next-work options.",
      "v0.9.80 preserves blocked Next/PostCSS, v0.9.12C, queue-015, and real-doc gate status.",
      "v0.9.81 summarizes the current operator state.",
      "Continue fake-only proof/report/operator UX polish.",
      "Repeat official-source Next/PostCSS research later if evidence changes.",
      "Request exact Next target approval only if a clean target is proven.",
      "Keep real-doc gate blocked unless a separate one-document, one-gate approval packet is explicitly approved.",
      "Validation/manual QA for accepted pushed v0.9.77 is `PASS` / `PASS`.",
      "this local checkpoint does not push.",
      "Manual QA for this local checkpoint is `PASS`",
      "Operator QA proof is",
      "Next/PostCSS remains parked as `WARN_SAFE_NEXT_TARGET_UNCLEAR`.",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the checkpoint without package, queue, or real-doc drift", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0982_next_large_work_checkpoint: {
        phase: string;
        status: string;
        accepted_pushed_short_commit: string;
        local_checkpoint_pushed: boolean;
        local_checkpoint_manual_qa_status: string;
        local_checkpoint_operator_qa_pass_proof_dir: string;
        next_postcss_status: string;
        next_implementation_blocked: boolean;
        real_doc_gate_blocked: boolean;
        queue_015_status: string;
        package_json_changed: boolean;
        package_lock_changed: boolean;
        dependency_versions_changed: boolean;
        safe_next_choices: string[];
      };
    };
    const state = featureList.v0982_next_large_work_checkpoint;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.accepted_pushed_short_commit).toBe("cfa7c2c");
    expect(state.local_checkpoint_pushed).toBe(false);
    expect(state.local_checkpoint_manual_qa_status).toBe("PASS");
    expect(state.local_checkpoint_operator_qa_pass_proof_dir).toContain("operator_qa_pass_recording");
    expect(state.next_postcss_status).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(state.next_implementation_blocked).toBe(true);
    expect(state.real_doc_gate_blocked).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.package_json_changed).toBe(false);
    expect(state.package_lock_changed).toBe(false);
    expect(state.dependency_versions_changed).toBe(false);
    expect(state.safe_next_choices).toContain("continue fake-only proof/report/operator UX polish");
    expect(state.safe_next_choices).toContain("keep real-doc gate blocked unless separately approved");
  });
});
