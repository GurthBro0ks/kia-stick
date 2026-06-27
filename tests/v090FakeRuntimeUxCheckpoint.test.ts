import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.0-fake-runtime-ux-checkpoint";
const docPath = "docs/v0.9.0-fake-runtime-ux-checkpoint.md";
const productVersion = "0.7.0";
const promptVersion = "prompt.fake-docs.v0.5-import-wizard-hardening";

describe("v0.9.0 fake runtime UX checkpoint", () => {
  it("records the bundle checkpoint without a product-version bump", () => {
    expect(existsSync(docPath)).toBe(true);
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain(phase);
    expect(doc).toContain(`Product version: \`${productVersion}\``);
    expect(doc).toContain(`Prompt version: \`${promptVersion}\``);
    expect(doc).toContain("not a productVersion bump");
    expect(doc).toContain("v0.8.6 runtime UX reality audit");
    expect(doc).toContain("v0.8.7 Chat/Saved no-answer polish");
    expect(doc).toContain("v0.8.8 Sources/Upload/Import/Vault polish");
    expect(doc).toContain("v0.8.9 mobile/narrow operator QA polish");
  });

  it("includes one bundle manual QA checklist and OPERATOR_QA_PASS template", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const expected of [
      "Run `npm run operator:smoke`",
      "Review Chat no-answer and save behavior",
      "Review Sources hierarchy and citable/context labels",
      "Review Upload fake metadata buttons only",
      "Review Import fake metadata state machine only",
      "Review Vault fake metadata/governance workflow only",
      "Confirm no push was performed",
      "OPERATOR_QA_PASS for KIA-Stick-v0.8.6-to-v0.9.0-fake-only-runtime-ux-polish-bundle.",
      "No real-doc implementation is approved.",
    ]) {
      expect(doc).toContain(expected);
    }
  });

  it("tracks release, queue, and feature state accepted after closeout validation", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      phase: string;
      release_readiness: {
        phase: string;
        status: string;
        package_version: string;
        product_version: string;
        prompt_version: string;
        manual_qa_status: string;
        push_performed: boolean;
        queue_015_status: string;
        queue_041_status: string;
        queue_045_status: string;
      };
      v090_fake_runtime_ux_checkpoint: {
        phase: string;
        status: string;
        queue_041_status: string;
        queue_042_status: string;
        queue_043_status: string;
        queue_044_status: string;
        queue_045_status: string;
        operator_qa_template_included: boolean;
        product_version_bump_approved: boolean;
        authorizes_real_doc_work: boolean;
        queue_015_status: string;
        push_performed: boolean;
      };
    };
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; phase: string; status: string }>;
    };
    const byId = Object.fromEntries(queue.items.map((item) => [item.id, item]));

    expect(featureList.phase).toBe(phase);
    expect(featureList.release_readiness.phase).toBe(phase);
    expect(featureList.release_readiness.status).toBe("v086_v090_fake_runtime_ux_bundle_accepted_pushed");
    expect(featureList.release_readiness.package_version).toBe(productVersion);
    expect(featureList.release_readiness.product_version).toBe(productVersion);
    expect(featureList.release_readiness.prompt_version).toBe(promptVersion);
    expect(featureList.release_readiness.manual_qa_status).toBe("PASS");
    expect(featureList.release_readiness.push_performed).toBe(true);
    expect(featureList.release_readiness.queue_015_status).toBe("blocked");
    expect(featureList.release_readiness.queue_041_status).toBe("accepted");
    expect(featureList.release_readiness.queue_045_status).toBe("accepted");
    expect(featureList.v090_fake_runtime_ux_checkpoint.phase).toBe(phase);
    expect(featureList.v090_fake_runtime_ux_checkpoint.status).toBe("accepted_after_closeout_push");
    expect(featureList.v090_fake_runtime_ux_checkpoint.queue_041_status).toBe("accepted");
    expect(featureList.v090_fake_runtime_ux_checkpoint.queue_042_status).toBe("accepted");
    expect(featureList.v090_fake_runtime_ux_checkpoint.queue_043_status).toBe("accepted");
    expect(featureList.v090_fake_runtime_ux_checkpoint.queue_044_status).toBe("accepted");
    expect(featureList.v090_fake_runtime_ux_checkpoint.queue_045_status).toBe("accepted");
    expect(featureList.v090_fake_runtime_ux_checkpoint.operator_qa_template_included).toBe(true);
    expect(featureList.v090_fake_runtime_ux_checkpoint.product_version_bump_approved).toBe(false);
    expect(featureList.v090_fake_runtime_ux_checkpoint.authorizes_real_doc_work).toBe(false);
    expect(featureList.v090_fake_runtime_ux_checkpoint.queue_015_status).toBe("blocked");
    expect(featureList.v090_fake_runtime_ux_checkpoint.push_performed).toBe(true);
    expect(byId["queue-015-v07-first-real-doc-gate-request"]?.status).toBe("blocked");
    for (const id of [
      "queue-041-v086-runtime-ux-reality-audit",
      "queue-042-v087-chat-saved-no-answer-polish",
      "queue-043-v088-sources-upload-import-vault-polish",
      "queue-044-v089-mobile-narrow-operator-qa-polish",
      "queue-045-v090-fake-runtime-ux-checkpoint",
    ]) {
      expect(byId[id]?.status).toBe("accepted");
    }
  });

  it("keeps real-doc implementation blocked", () => {
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain("`queue-015-v07-first-real-doc-gate-request` remains blocked");
    expect(doc).toContain("No real-doc implementation is approved");
    expect(doc).not.toMatch(/showOpenFilePicker|showDirectoryPicker|FileReader|readAsText|readAsArrayBuffer/i);
    expect(doc).not.toMatch(/\bmulter\b|\buploadHandler\b|\brunOcr\b|\bcreateVectorStore\b|\bVectorStore\.from\b/);
  });
});
