import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.20-no-answer-saved-state-qa-hardening";
const docPath = "docs/v0.9.20-no-answer-saved-state-qa-hardening.md";

describe("v0.9.20 no-answer/Saved-state QA hardening", () => {
  it("documents no-answer blocking, dedupe, fake metadata, and source role evidence", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "No-answer results remain blocked from Saved.",
      "Repeated saves dedupe by canonical fake answer identity.",
      "Saved metadata remains fake-only.",
      "product version, prompt version, build/display identity, provider, and citation count",
      "Citable fake source evidence remains distinct from context-only fake source evidence.",
      "Context-only fake sources can be reviewed in the packet trail",
      "No file picker, FileReader, path reader, upload handler, OCR, embeddings, indexing, or vector store is added.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("keeps runtime copy and state aligned with the fake-only Saved contract", () => {
    const component = readFileSync("components/KiaStickApp.tsx", "utf8");
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0920_no_answer_saved_state_qa_hardening: {
        phase: string;
        status: string;
        no_answer_saved_blocked: boolean;
        repeated_saves_dedupe: boolean;
        saved_metadata_fake_only: boolean;
        saved_metadata_includes_product_prompt_build_provider_citation_count: boolean;
        citable_context_only_evidence_visible: boolean;
        runtime_capability_changed: boolean;
        manual_qa_status: string;
        queue_015_status: string;
      };
    };
    const state = featureList.v0920_no_answer_saved_state_qa_hardening;

    expect(component).toContain("No Saved record is created for no-answer responses.");
    expect(component).toContain("No-answer responses stay out of Saved.");
    expect(component).toContain("Context-only fake sources");
    expect(component).toContain("citation count, and fake build metadata");
    expect(state.phase).toBe(phase);
    expect(state.status).toBe("ready_to_push");
    expect(state.no_answer_saved_blocked).toBe(true);
    expect(state.repeated_saves_dedupe).toBe(true);
    expect(state.saved_metadata_fake_only).toBe(true);
    expect(state.saved_metadata_includes_product_prompt_build_provider_citation_count).toBe(true);
    expect(state.citable_context_only_evidence_visible).toBe(true);
    expect(state.runtime_capability_changed).toBe(false);
    expect(state.manual_qa_status).toBe("PASS");
    expect(state.queue_015_status).toBe("blocked");
  });
});
