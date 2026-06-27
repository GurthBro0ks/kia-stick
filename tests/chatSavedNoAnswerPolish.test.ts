import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.8.7-chat-saved-no-answer-polish";
const docPath = "docs/v0.8.7-chat-saved-no-answer-polish.md";

describe("v0.8.7 Chat/Saved no-answer polish", () => {
  it("documents the fake-only Chat and Saved polish", () => {
    expect(existsSync(docPath)).toBe(true);
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain(phase);
    expect(doc).toContain("No-answer assistant cards now show `Unsaved no-answer`");
    expect(doc).toContain("No-answer records are not inserted into Saved");
    expect(doc).toContain("Deterministic fake answer behavior is unchanged");
    expect(doc).toContain("Product version: `0.7.0`");
    expect(doc).toContain("Prompt version: `prompt.fake-docs.v0.5-import-wizard-hardening`");
  });

  it("adds visible no-answer save blocking and Saved empty-state copy", () => {
    const component = readFileSync("components/KiaStickApp.tsx", "utf8");

    expect(component).toContain("No-answer responses stay out of Saved. Review the context-only fake trail instead.");
    expect(component).toContain("No-answer unsaved");
    expect(component).toContain("Unsaved no-answer");
    expect(component).toContain("Context-only fake sources can still be reviewed in the full packet.");
    expect(component).toContain("No-answer Chat cards are blocked from Saved.");
    expect(component).toContain("if (message.answer.noAnswer)");
    expect(component).toContain("createSavedAnswerRecord");
    expect(component).toContain("upsertSavedAnswer");
  });

  it("tracks feature and queue state without approving real-doc work", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v087_chat_saved_no_answer_polish: {
        phase: string;
        status: string;
        queue_042_status: string;
        no_answer_save_notice_added: boolean;
        saved_empty_state_clarified: boolean;
        deterministic_fake_behavior_preserved: boolean;
        authorizes_real_doc_work: boolean;
        real_document_access: boolean;
        queue_015_status: string;
      };
    };
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; phase: string; status: string }>;
    };
    const item = queue.items.find((candidate) => candidate.id === "queue-042-v087-chat-saved-no-answer-polish");

    expect(featureList.v087_chat_saved_no_answer_polish.phase).toBe(phase);
    expect(featureList.v087_chat_saved_no_answer_polish.status).toBe("needs_operator_bundle_review");
    expect(featureList.v087_chat_saved_no_answer_polish.queue_042_status).toBe("needs_review");
    expect(featureList.v087_chat_saved_no_answer_polish.no_answer_save_notice_added).toBe(true);
    expect(featureList.v087_chat_saved_no_answer_polish.saved_empty_state_clarified).toBe(true);
    expect(featureList.v087_chat_saved_no_answer_polish.deterministic_fake_behavior_preserved).toBe(true);
    expect(featureList.v087_chat_saved_no_answer_polish.authorizes_real_doc_work).toBe(false);
    expect(featureList.v087_chat_saved_no_answer_polish.real_document_access).toBe(false);
    expect(featureList.v087_chat_saved_no_answer_polish.queue_015_status).toBe("blocked");
    expect(item?.phase).toBe(phase);
    expect(item?.status).toBe("needs_review");
  });
});
