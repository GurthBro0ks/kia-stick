import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.6-synthetic-governance-reality-audit";
const currentPhase = "KIA-Stick-v0.9.10-synthetic-governance-hardening-checkpoint";
const currentStatus = "v096_v0910_synthetic_governance_hardening_bundle_pending_operator_review";
const docPath = "docs/v0.9.6-synthetic-governance-reality-audit.md";
const productVersion = "0.7.0";
const promptVersion = "prompt.fake-docs.v0.5-import-wizard-hardening";

describe("v0.9.6 synthetic governance reality audit", () => {
  it("inventories repo-owned synthetic governance helpers", () => {
    expect(existsSync(docPath)).toBe(true);
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain(phase);
    for (const required of [
      "lib/syntheticApprovalPacketValidator.ts",
      "lib/syntheticPacketFixtures.ts",
      "scripts/synthetic-packet-report.mjs",
      "scripts/synthetic-governance-report.mjs",
      "scripts/synthetic-packet-safety-guard.mjs",
      "scripts/proof-index.mjs",
      "scripts/closeout-helper.mjs",
      "scripts/task-queue.mjs",
      "missing operator signature",
      "unsafe proof output",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks current bundle state without approving real-doc work", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      phase: string;
      release_readiness: {
        phase: string;
        status: string;
        product_version: string;
        prompt_version: string;
        queue_015_status: string;
        queue_050_status: string;
        queue_051_status: string;
        real_doc_implementation_approved: boolean;
      };
      v096_synthetic_governance_reality_audit: {
        phase: string;
        status: string;
        queue_051_status: string;
        runtime_ui_changed: boolean;
        runtime_capability_changed: boolean;
        authorizes_real_doc_work: boolean;
      };
    };
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; status: string }>;
    };

    expect(featureList.phase).toBe(currentPhase);
    expect(featureList.release_readiness.phase).toBe(currentPhase);
    expect(featureList.release_readiness.status).toBe(currentStatus);
    expect(featureList.release_readiness.product_version).toBe(productVersion);
    expect(featureList.release_readiness.prompt_version).toBe(promptVersion);
    expect(featureList.release_readiness.queue_015_status).toBe("blocked");
    expect(featureList.release_readiness.queue_050_status).toBe("accepted");
    expect(featureList.release_readiness.queue_051_status).toBe("needs_review");
    expect(featureList.release_readiness.real_doc_implementation_approved).toBe(false);
    expect(featureList.v096_synthetic_governance_reality_audit.phase).toBe(phase);
    expect(featureList.v096_synthetic_governance_reality_audit.status).toBe("pending_operator_bundle_review");
    expect(featureList.v096_synthetic_governance_reality_audit.queue_051_status).toBe("needs_review");
    expect(featureList.v096_synthetic_governance_reality_audit.runtime_ui_changed).toBe(false);
    expect(featureList.v096_synthetic_governance_reality_audit.runtime_capability_changed).toBe(false);
    expect(featureList.v096_synthetic_governance_reality_audit.authorizes_real_doc_work).toBe(false);
    expect(queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request")?.status).toBe("blocked");
    expect(queue.items.find((item) => item.id === "queue-050-v095-next-work-decision-checkpoint")?.status).toBe("accepted");
    expect(queue.items.find((item) => item.id === "queue-051-v096-synthetic-governance-reality-audit")?.status).toBe("needs_review");
  });
});
