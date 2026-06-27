import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.1-accepted-state-reality-audit";
const currentPhase = "KIA-Stick-v0.9.10-synthetic-governance-hardening-checkpoint";
const currentStatus = "v096_v0910_synthetic_governance_hardening_bundle_pending_operator_review";
const docPath = "docs/v0.9.1-accepted-state-reality-audit.md";
const productVersion = "0.7.0";
const promptVersion = "prompt.fake-docs.v0.5-import-wizard-hardening";
const acceptedCloseoutCommit = "8044eaf6756c5e8303483d44017a29cf9514ed44";
const replacementProofDir = "/tmp/proof_kia_stick_v0_8_6_to_v0_9_0_fake_runtime_ux_bundle_plus_vault_fix_closeout_push_20260627T103128Z";

describe("v0.9.1 accepted-state reality audit", () => {
  it("documents the accepted v0.9.0 pushed state and replacement proof", () => {
    expect(existsSync(docPath)).toBe(true);
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain(phase);
    expect(doc).toContain(acceptedCloseoutCommit);
    expect(doc).toContain(replacementProofDir);
    expect(doc).toContain("Original v0.8.6-to-v0.9.0 bundle proof directory was missing");
    expect(doc).toContain("not a current failure");
    expect(doc).toContain(`Product version: \`${productVersion}\``);
    expect(doc).toContain(`Prompt version: \`${promptVersion}\``);
  });

  it("tracks current feature and queue state without approving real-doc work", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      phase: string;
      release_readiness: {
        phase: string;
        status: string;
        manual_qa_status: string;
        product_version: string;
        prompt_version: string;
        push_performed: boolean;
        queue_015_status: string;
        queue_046_status: string;
        real_doc_implementation_approved: boolean;
      };
      v091_accepted_state_reality_audit: {
        phase: string;
        status: string;
        queue_046_status: string;
        accepted_closeout_push_commit: string;
        replacement_proof_status: string;
        authorizes_real_doc_work: boolean;
      };
    };
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; phase: string; status: string }>;
    };

    expect(featureList.phase).toBe(currentPhase);
    expect(featureList.release_readiness.phase).toBe(currentPhase);
    expect(featureList.release_readiness.status).toBe(currentStatus);
    expect(featureList.release_readiness.manual_qa_status).toBe("pending_operator_bundle_review");
    expect(featureList.release_readiness.product_version).toBe(productVersion);
    expect(featureList.release_readiness.prompt_version).toBe(promptVersion);
    expect(featureList.release_readiness.push_performed).toBe(false);
    expect(featureList.release_readiness.queue_015_status).toBe("blocked");
    expect(featureList.release_readiness.queue_046_status).toBe("accepted");
    expect(featureList.release_readiness.real_doc_implementation_approved).toBe(false);
    expect(featureList.v091_accepted_state_reality_audit.phase).toBe(phase);
    expect(featureList.v091_accepted_state_reality_audit.status).toBe("accepted_after_closeout_push");
    expect(featureList.v091_accepted_state_reality_audit.queue_046_status).toBe("accepted");
    expect(featureList.v091_accepted_state_reality_audit.accepted_closeout_push_commit).toBe(acceptedCloseoutCommit);
    expect(featureList.v091_accepted_state_reality_audit.replacement_proof_status).toBe("recorded_validation_passed");
    expect(featureList.v091_accepted_state_reality_audit.authorizes_real_doc_work).toBe(false);
    expect(queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request")?.status).toBe("blocked");
    expect(queue.items.find((item) => item.id === "queue-041-v086-runtime-ux-reality-audit")?.status).toBe("accepted");
    expect(queue.items.find((item) => item.id === "queue-046-v091-accepted-state-reality-audit")?.status).toBe("accepted");
  });
});
