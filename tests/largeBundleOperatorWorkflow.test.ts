import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.8.4-large-bundle-operator-workflow";
const docPath = "docs/v0.8.4-large-bundle-operator-workflow.md";

describe("v0.8.4 large bundle operator workflow", () => {
  it("documents the large-bundle rule and stop conditions", () => {
    expect(existsSync(docPath)).toBe(true);
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain(phase);
    expect(doc).toContain("multiple fake/synthetic subphases before operator QA");
    expect(doc).toContain("stops on any WARN, FAIL, safety-boundary issue");
    expect(doc).toContain("one operator QA review");
    expect(doc).toContain("One `OPERATOR_QA_PASS` applies to the whole bundle");
  });

  it("keeps real-doc work out of the large fake/synthetic bundle flow", () => {
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain("Real-doc work is not part of the large fake/synthetic bundle rule");
    expect(doc).toContain("exactly one document");
    expect(doc).toContain("exactly one gate");
    expect(doc).toContain("separate approval packet");
    expect(doc).toContain("fresh operator approval");
  });

  it("tracks feature state and queue item for review without push", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v084_large_bundle_operator_workflow: {
        phase: string;
        status: string;
        push_performed: boolean;
        authorizes_real_doc_work: boolean;
      };
    };
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; phase: string; status: string; summary: string; next_action: string }>;
    };
    const item = queue.items.find((candidate) => candidate.id === "queue-039-v084-large-bundle-operator-workflow");

    expect(featureList.v084_large_bundle_operator_workflow.phase).toBe(phase);
    expect(featureList.v084_large_bundle_operator_workflow.status).toBe("accepted_after_closeout_push");
    expect(featureList.v084_large_bundle_operator_workflow.push_performed).toBe(true);
    expect(featureList.v084_large_bundle_operator_workflow.authorizes_real_doc_work).toBe(false);
    expect(item?.phase).toBe(phase);
    expect(item?.status).toBe("accepted");
    expect(`${item?.summary}\n${item?.next_action}`).toContain("one bundle operator QA");
  });
});
