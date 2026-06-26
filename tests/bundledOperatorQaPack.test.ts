import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.7.19-bundled-operator-qa-pack";
const currentPhase = "KIA-Stick-v0.8.5-next-large-work-checkpoint";
const docPath = "docs/v0.7.19-bundled-operator-qa-pack.md";
const productVersion = "0.7.0";
const promptVersion = "prompt.fake-docs.v0.5-import-wizard-hardening";

describe("v0.7.19 bundled operator QA pack", () => {
  it("documents one bundle-level operator QA checklist", () => {
    expect(existsSync(docPath)).toBe(true);
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain(phase);
    expect(doc).toContain(`Product version: \`${productVersion}\``);
    expect(doc).toContain(`Prompt version: \`${promptVersion}\``);
    expect(doc).toContain("covering v0.7.16 through v0.7.19");
    expect(doc).toContain("PASS/WARN/FAIL Rules");
    expect(doc).toContain("Stop on WARN or FAIL");
    expect(doc).toContain("Copy-Ready OPERATOR_QA_PASS Template");
    expect(doc).toContain("No real-doc implementation is approved");
  });

  it("requires packet, guard, governance, release, design, QA, fake, and privacy validation", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const command of [
      "npm run packet:report",
      "npm run packet:guard",
      "npm run governance:report",
      "npm run release:check",
      "npm run design:check",
      "npm run qa",
      "npm run scan:fake",
      "npm run scan:privacy",
    ]) {
      expect(doc).toContain(command);
    }
  });

  it("keeps feature and queue state accepted after operator bundle QA pass and closeout", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      phase: string;
      release_readiness: { phase: string; product_version: string; package_version: string; prompt_version: string };
      v0719_bundled_operator_qa_pack: {
        phase: string;
        status: string;
        queue_015_status: string;
        queue_034_status: string;
        manual_qa_status: string;
        authorizes_real_doc_work: boolean;
        push_performed: boolean;
      };
    };
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; phase: string; status: string; summary: string; next_action: string }>;
    };
    const q015 = queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request");
    const q034 = queue.items.find((item) => item.id === "queue-034-v0719-bundled-operator-qa-pack");

    expect(featureList.phase).toBe(currentPhase);
    expect(featureList.release_readiness.phase).toBe(currentPhase);
    expect(featureList.release_readiness.package_version).toBe(productVersion);
    expect(featureList.release_readiness.product_version).toBe(productVersion);
    expect(featureList.release_readiness.prompt_version).toBe(promptVersion);
    expect(featureList.v0719_bundled_operator_qa_pack.phase).toBe(phase);
    expect(featureList.v0719_bundled_operator_qa_pack.status).toBe("accepted_after_closeout_push");
    expect(featureList.v0719_bundled_operator_qa_pack.queue_015_status).toBe("blocked");
    expect(featureList.v0719_bundled_operator_qa_pack.queue_034_status).toBe("accepted");
    expect(featureList.v0719_bundled_operator_qa_pack.manual_qa_status).toBe("PASS");
    expect(featureList.v0719_bundled_operator_qa_pack.authorizes_real_doc_work).toBe(false);
    expect(featureList.v0719_bundled_operator_qa_pack.push_performed).toBe(true);
    expect(q015?.status).toBe("blocked");
    expect(q034?.phase).toBe(phase);
    expect(q034?.status).toBe("accepted");
    expect(`${q034?.summary}\n${q034?.next_action}`).toContain("operator QA");
    expect(`${q034?.summary}\n${q034?.next_action}`).toContain("queue-015 remains blocked");
  });

  it("does not imply approval, push, or real-doc capability", () => {
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain("does not approve real-doc work");
    expect(doc).toContain("does not authorize push by itself");
    expect(doc).toContain("No real-doc implementation is approved");
    expect(doc).not.toMatch(/<input[^>]*type=["']file|showOpenFilePicker|showDirectoryPicker|FileReader|readAsText|readAsArrayBuffer/i);
    expect(doc).not.toMatch(/\bmulter\b|\buploadHandler\b|\brunOcr\b|\bcreateVectorStore\b|\bVectorStore\.from\b/);
  });
});
