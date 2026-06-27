import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.5-next-work-decision-checkpoint";
const docPath = "docs/v0.9.5-next-work-decision-checkpoint.md";

describe("v0.9.5 next-work decision checkpoint", () => {
  it("records the next safe options without approving real-doc implementation", () => {
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain(phase);
    expect(doc).toContain("Synthetic governance hardening bundle");
    expect(doc).toContain("Focused mobile screenshot proof");
    expect(doc).toContain("Planning-only real-doc packet preparation, clearly not implementation");
    expect(doc).toContain("Fake-only runtime UX bugfix polish only if operator QA finds a fake-only issue");
    expect(doc).toContain("does not approve real-doc implementation");
    expect(doc).toContain("does not unblock `queue-015-v07-first-real-doc-gate-request`");
  });

  it("tracks the final subphase as accepted after closeout push", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      phase: string;
      v095_next_work_decision_checkpoint: {
        phase: string;
        status: string;
        queue_050_status: string;
        recommended_next_options: string[];
        queue_015_status: string;
        authorizes_real_doc_work: boolean;
        real_doc_implementation_approved: boolean;
      };
    };
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; phase: string; status: string }>;
    };

    expect(featureList.phase).toBe(phase);
    expect(featureList.v095_next_work_decision_checkpoint.phase).toBe(phase);
    expect(featureList.v095_next_work_decision_checkpoint.status).toBe("accepted_after_closeout_push");
    expect(featureList.v095_next_work_decision_checkpoint.queue_050_status).toBe("accepted");
    expect(featureList.v095_next_work_decision_checkpoint.recommended_next_options).toEqual([
      "synthetic governance hardening bundle",
      "focused mobile screenshot proof",
      "planning-only real-doc packet preparation without implementation",
      "fake-only runtime UX bugfix polish only if needed",
    ]);
    expect(featureList.v095_next_work_decision_checkpoint.queue_015_status).toBe("blocked");
    expect(featureList.v095_next_work_decision_checkpoint.authorizes_real_doc_work).toBe(false);
    expect(featureList.v095_next_work_decision_checkpoint.real_doc_implementation_approved).toBe(false);
    expect(queue.items.find((item) => item.id === "queue-050-v095-next-work-decision-checkpoint")?.status).toBe("accepted");
  });
});
