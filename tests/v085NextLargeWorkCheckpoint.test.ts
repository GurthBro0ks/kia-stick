import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.8.5-next-large-work-checkpoint";
const currentPhase = "KIA-Stick-v0.9.0-fake-runtime-ux-checkpoint";
const currentStatus = "v086_v090_fake_runtime_ux_bundle_closeout_accepted_pending_push";
const docPath = "docs/v0.8.5-next-large-work-checkpoint.md";
const productVersion = "0.7.0";
const promptVersion = "prompt.fake-docs.v0.5-import-wizard-hardening";

describe("v0.8.5 next large work checkpoint", () => {
  it("recommends the next large work options without product-version drift", () => {
    expect(existsSync(docPath)).toBe(true);
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain(phase);
    expect(doc).toContain(`Product version: \`${productVersion}\``);
    expect(doc).toContain(`Prompt version: \`${promptVersion}\``);
    expect(doc).toContain("Fake-only runtime UX polish bundle");
    expect(doc).toContain("Synthetic governance hardening bundle");
    expect(doc).toContain("Planning-only real-doc packet preparation");
    expect(doc).toContain("Release-state consolidation bundle");
    expect(doc).toContain("`productVersion` remains `0.7.0`");
  });

  it("keeps real-doc implementation and queue-015 blocked", () => {
    const doc = readFileSync(docPath, "utf8");
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; phase: string; status: string; summary: string; next_action: string }>;
    };

    expect(doc).toContain("does not approve real-doc implementation");
    expect(doc).toContain("does not unblock `queue-015-v07-first-real-doc-gate-request`");
    expect(queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request")?.status).toBe("blocked");
    expect(queue.items.find((item) => item.id === "queue-040-v085-next-large-work-checkpoint")?.status).toBe("accepted");
  });

  it("tracks current release state for the v0.8.1-v0.8.5 bundle", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      phase: string;
      release_readiness: {
        phase: string;
        status: string;
        product_version: string;
        package_version: string;
        prompt_version: string;
        manual_qa_status: string;
        push_performed: boolean;
      };
      v085_next_large_work_checkpoint: {
        phase: string;
        status: string;
        recommended_next_options: string[];
        queue_015_status: string;
        authorizes_product_version_bump: boolean;
        authorizes_real_doc_work: boolean;
        real_document_access: boolean;
      };
    };

    expect(featureList.phase).toBe(currentPhase);
    expect(featureList.release_readiness.phase).toBe(currentPhase);
    expect(featureList.release_readiness.status).toBe(currentStatus);
    expect(featureList.release_readiness.product_version).toBe(productVersion);
    expect(featureList.release_readiness.package_version).toBe(productVersion);
    expect(featureList.release_readiness.prompt_version).toBe(promptVersion);
    expect(featureList.release_readiness.manual_qa_status).toBe("PASS");
    expect(featureList.release_readiness.push_performed).toBe(false);
    expect(featureList.v085_next_large_work_checkpoint.phase).toBe(phase);
    expect(featureList.v085_next_large_work_checkpoint.status).toBe("accepted_after_closeout_push");
    expect(featureList.v085_next_large_work_checkpoint.recommended_next_options).toHaveLength(4);
    expect(featureList.v085_next_large_work_checkpoint.queue_015_status).toBe("blocked");
    expect(featureList.v085_next_large_work_checkpoint.authorizes_product_version_bump).toBe(false);
    expect(featureList.v085_next_large_work_checkpoint.authorizes_real_doc_work).toBe(false);
    expect(featureList.v085_next_large_work_checkpoint.real_document_access).toBe(false);
  });
});
