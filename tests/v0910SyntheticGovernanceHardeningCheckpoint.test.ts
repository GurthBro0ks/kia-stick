import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.10-synthetic-governance-hardening-checkpoint";
const docPath = "docs/v0.9.10-synthetic-governance-hardening-checkpoint.md";

describe("v0.9.10 synthetic governance hardening checkpoint", () => {
  it("summarizes v0.9.6 through v0.9.10 and next safe options", () => {
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain(phase);
    for (const required of [
      "v0.9.6 audited",
      "v0.9.7 expanded",
      "v0.9.8 hardened",
      "v0.9.9 reinforced",
      "Focused mobile screenshot proof",
      "Release-state consolidation if needed",
      "Planning-only real-doc packet preparation",
      "Fake-only runtime bugfix polish only if QA finds a fake-only issue",
      "does not approve real-doc implementation",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the final subphase as pending one operator bundle review", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      phase: string;
      release_readiness: {
        phase: string;
        status: string;
        manual_qa_status: string;
        push_performed: boolean;
        queue_015_status: string;
        queue_051_status: string;
        queue_055_status: string;
        real_doc_implementation_approved: boolean;
      };
      v0910_synthetic_governance_hardening_checkpoint: {
        phase: string;
        status: string;
        queue_055_status: string;
        recommended_next_options: string[];
        authorizes_real_doc_work: boolean;
        real_doc_implementation_approved: boolean;
      };
    };
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; status: string }>;
    };

    expect(featureList.phase).toBe(phase);
    expect(featureList.release_readiness.phase).toBe(phase);
    expect(featureList.release_readiness.status).toBe("v096_v0910_synthetic_governance_hardening_bundle_pending_operator_review");
    expect(featureList.release_readiness.manual_qa_status).toBe("pending_operator_bundle_review");
    expect(featureList.release_readiness.push_performed).toBe(false);
    expect(featureList.release_readiness.queue_015_status).toBe("blocked");
    expect(featureList.release_readiness.queue_051_status).toBe("needs_review");
    expect(featureList.release_readiness.queue_055_status).toBe("needs_review");
    expect(featureList.release_readiness.real_doc_implementation_approved).toBe(false);
    expect(featureList.v0910_synthetic_governance_hardening_checkpoint.phase).toBe(phase);
    expect(featureList.v0910_synthetic_governance_hardening_checkpoint.status).toBe("pending_operator_bundle_review");
    expect(featureList.v0910_synthetic_governance_hardening_checkpoint.queue_055_status).toBe("needs_review");
    expect(featureList.v0910_synthetic_governance_hardening_checkpoint.recommended_next_options).toEqual([
      "focused mobile screenshot proof",
      "release-state consolidation if needed",
      "planning-only real-doc packet preparation",
      "fake-only runtime bugfix polish only if QA finds a fake-only issue",
    ]);
    expect(featureList.v0910_synthetic_governance_hardening_checkpoint.authorizes_real_doc_work).toBe(false);
    expect(featureList.v0910_synthetic_governance_hardening_checkpoint.real_doc_implementation_approved).toBe(false);
    expect(queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request")?.status).toBe("blocked");
    expect(queue.items.find((item) => item.id === "queue-051-v096-synthetic-governance-reality-audit")?.status).toBe("needs_review");
    expect(queue.items.find((item) => item.id === "queue-055-v0910-synthetic-governance-hardening-checkpoint")?.status).toBe("needs_review");
  });
});
