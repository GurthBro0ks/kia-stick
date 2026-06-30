import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.52-next-large-work-checkpoint";
const docPath = "docs/v0.9.52-next-large-work-checkpoint.md";
const operatorQaAcceptedWarn =
  "OPERATOR_QA_ACCEPTED_WARN for /home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_48_to_v0_9_52_accepted_state_official_next_postcss_research_refresh_bundle_20260630T170813Z";
const patchOperatorQaPass =
  "OPERATOR_QA_PASS for /home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_48_to_v0_9_52_proof_chain_baseline_alignment_patch_20260630T174502Z";

describe("v0.9.52 next large-work checkpoint", () => {
  it("records next choices while keeping Next/PostCSS parked", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "No exact clean target is proven.",
      "`next@16.2.9`",
      "`postcss@8.4.31`",
      "Result: `WARN_SAFE_NEXT_TARGET_UNCLEAR`.",
      "Continue fake-only proof/report/operator UX polish.",
      "Repeat official-source research later",
      "Manual QA is `ACCEPTED_WARN`",
      operatorQaAcceptedWarn,
      patchOperatorQaPass,
      "Push is not performed by this local bundle.",
      "`KIA-Stick-v0.9.12C-next-runtime-framework-security-implementation` remains blocked",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the local checkpoint without package or queue drift", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0952_next_large_work_checkpoint: {
        phase: string;
        status: string;
        result: string;
        default_next_option: string;
        current_bundle_manual_qa_status: string;
        operator_qa_acceptance_text: string;
        proof_chain_baseline_alignment_patch_manual_qa_status: string;
        proof_chain_baseline_alignment_patch_operator_qa_text: string;
        pushed: boolean;
        package_json_changed: boolean;
        package_lock_changed: boolean;
        next_implementation_blocked: boolean;
        real_doc_gate_blocked: boolean;
        queue_015_status: string;
      };
    };
    const state = featureList.v0952_next_large_work_checkpoint;
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; status: string; phase: string }>;
    };

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("needs_review");
    expect(state.result).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(state.default_next_option).toBe("continue fake-only proof/report/operator UX polish or repeat official-source research later");
    expect(state.current_bundle_manual_qa_status).toBe("ACCEPTED_WARN");
    expect(state.operator_qa_acceptance_text).toBe(operatorQaAcceptedWarn);
    expect(state.proof_chain_baseline_alignment_patch_manual_qa_status).toBe("PASS");
    expect(state.proof_chain_baseline_alignment_patch_operator_qa_text).toBe(patchOperatorQaPass);
    expect(state.pushed).toBe(false);
    expect(state.package_json_changed).toBe(false);
    expect(state.package_lock_changed).toBe(false);
    expect(state.next_implementation_blocked).toBe(true);
    expect(state.real_doc_gate_blocked).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request")?.status).toBe("blocked");
    expect(queue.items.find((item) => item.phase === phase)).toBeUndefined();
  });
});
