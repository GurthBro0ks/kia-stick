import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.8.0-synthetic-governance-checkpoint-plan";
const currentPhase = "KIA-Stick-v0.9.5-next-work-decision-checkpoint";
const docPath = "docs/v0.8.0-synthetic-governance-checkpoint-plan.md";
const productVersion = "0.7.0";
const promptVersion = "prompt.fake-docs.v0.5-import-wizard-hardening";

describe("v0.8.0 synthetic governance checkpoint plan", () => {
  it("documents the synthetic governance lane without a product-version bump", () => {
    expect(existsSync(docPath)).toBe(true);
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain(phase);
    expect(doc).toContain(`Product version: \`${productVersion}\``);
    expect(doc).toContain(`Prompt version: \`${promptVersion}\``);
    expect(doc).toContain("not a product-version bump");
    expect(doc).toContain("Product version remains `0.7.0`");
    expect(doc).toContain("queue-015-v07-first-real-doc-gate-request` remains blocked");
    expect(doc).toContain("Real-doc implementation remains not approved");
  });

  it("summarizes v0.7.13 through v0.7.19 synthetic tooling", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const expected of [
      "v0.7.13 planning-only real-doc gate rehearsal",
      "v0.7.14 synthetic approval-packet validator",
      "v0.7.15 synthetic packet report runner",
      "v0.7.16 synthetic packet safety drift guard",
      "v0.7.17 synthetic packet fixture matrix",
      "v0.7.18 synthetic governance bundle report",
      "v0.7.19 bundled operator QA pack",
    ]) {
      expect(doc).toContain(expected);
    }
  });

  it("tracks checkpoint feature and queue state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      phase: string;
      release_readiness: {
        phase: string;
        status: string;
        product_version: string;
        package_version: string;
        prompt_version: string;
      };
      v080_synthetic_governance_checkpoint_plan: {
        phase: string;
        status: string;
        product_version: string;
        prompt_version: string;
        queue_015_status: string;
        queue_035_status: string;
        authorizes_product_version_bump: boolean;
        authorizes_real_doc_work: boolean;
        real_document_access: boolean;
        push_performed: boolean;
      };
    };
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; phase: string; status: string; summary: string; next_action: string }>;
    };
    const q015 = queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request");
    const q035 = queue.items.find((item) => item.id === "queue-035-v080-synthetic-governance-checkpoint-plan");

    expect(featureList.phase).toBe(currentPhase);
    expect(featureList.release_readiness.phase).toBe(currentPhase);
    expect(featureList.release_readiness.status).toBe("v091_v095_release_state_consolidation_bundle_pending_operator_review");
    expect(featureList.release_readiness.package_version).toBe(productVersion);
    expect(featureList.release_readiness.product_version).toBe(productVersion);
    expect(featureList.release_readiness.prompt_version).toBe(promptVersion);
    expect(featureList.v080_synthetic_governance_checkpoint_plan.phase).toBe(phase);
    expect(featureList.v080_synthetic_governance_checkpoint_plan.status).toBe("accepted_after_closeout_push");
    expect(featureList.v080_synthetic_governance_checkpoint_plan.product_version).toBe(productVersion);
    expect(featureList.v080_synthetic_governance_checkpoint_plan.prompt_version).toBe(promptVersion);
    expect(featureList.v080_synthetic_governance_checkpoint_plan.queue_015_status).toBe("blocked");
    expect(featureList.v080_synthetic_governance_checkpoint_plan.queue_035_status).toBe("accepted");
    expect(featureList.v080_synthetic_governance_checkpoint_plan.authorizes_product_version_bump).toBe(false);
    expect(featureList.v080_synthetic_governance_checkpoint_plan.authorizes_real_doc_work).toBe(false);
    expect(featureList.v080_synthetic_governance_checkpoint_plan.real_document_access).toBe(false);
    expect(featureList.v080_synthetic_governance_checkpoint_plan.push_performed).toBe(true);
    expect(q015?.status).toBe("blocked");
    expect(q035?.phase).toBe(phase);
    expect(q035?.status).toBe("accepted");
    expect(`${q035?.summary}\n${q035?.next_action}`).toContain("synthetic governance");
    expect(`${q035?.summary}\n${q035?.next_action}`).toContain("queue-015 remains blocked");
  });

  it("does not add real-doc capability language as an approval", () => {
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain("does not approve real-doc work");
    expect(doc).toContain("does not accept arbitrary file path input");
    expect(doc).toContain("does not read user-provided packet files");
    expect(doc).not.toMatch(/<input[^>]*type=["']file|showOpenFilePicker|showDirectoryPicker|FileReader|readAsText|readAsArrayBuffer/i);
    expect(doc).not.toMatch(/\bmulter\b|\buploadHandler\b|\brunOcr\b|\bcreateVectorStore\b|\bVectorStore\.from\b/);
  });
});
