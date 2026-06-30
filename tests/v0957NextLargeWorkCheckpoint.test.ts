import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.57-next-large-work-checkpoint";
const docPath = "docs/v0.9.57-next-large-work-checkpoint.md";

describe("v0.9.57 next large-work checkpoint", () => {
  it("records next choices while keeping parked work blocked", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "v0.9.53 records the accepted pushed WARN v0.9.52 checkpoint at `3b9fef5`.",
      "Continue fake-only proof/report/operator UX polish.",
      "Repeat official-source research later if evidence changes.",
      "Ask for separate exact Next target approval only if a target is proven.",
      "Keep real-doc gate blocked unless a separate one-document, one-gate approval packet is explicitly approved.",
      "Manual QA for this local bundle is `PASS`",
      "Push is not performed by this local bundle.",
      "`KIA-Stick-v0.9.12C-next-runtime-framework-security-implementation` remains blocked",
      "Next/PostCSS remains parked as `WARN_SAFE_NEXT_TARGET_UNCLEAR`.",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
      "Product/package version remains `0.7.0`.",
      "Prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the local checkpoint without package or queue drift", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0957_next_large_work_checkpoint: {
        phase: string;
        status: string;
        current_bundle_manual_qa_status: string;
        operator_qa_pass_proof_dir: string;
        pushed: boolean;
        next_postcss_status: string;
        next_implementation_blocked: boolean;
        real_doc_gate_blocked: boolean;
        queue_015_status: string;
        package_json_changed: boolean;
        package_lock_changed: boolean;
        safe_next_choices: string[];
      };
    };
    const state = featureList.v0957_next_large_work_checkpoint;
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; status: string; phase: string }>;
    };

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.current_bundle_manual_qa_status).toBe("PASS");
    expect(state.operator_qa_pass_proof_dir).toBe(
      "/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_53_to_v0_9_57_accepted_warn_state_proof_report_operator_ux_polish_bundle_20260630T190507Z"
    );
    expect(state.pushed).toBe(false);
    expect(state.next_postcss_status).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(state.next_implementation_blocked).toBe(true);
    expect(state.real_doc_gate_blocked).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.package_json_changed).toBe(false);
    expect(state.package_lock_changed).toBe(false);
    expect(state.safe_next_choices).toContain("continue fake-only proof/report/operator UX polish");
    expect(state.safe_next_choices).toContain("keep real-doc gate blocked unless separately approved");
    expect(queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request")?.status).toBe("blocked");
    expect(queue.items.find((item) => item.phase === phase)).toBeUndefined();
  });
});
