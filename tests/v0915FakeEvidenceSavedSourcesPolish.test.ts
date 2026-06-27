import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.15-fake-evidence-saved-sources-polish";
const docPath = "docs/v0.9.15-fake-evidence-saved-sources-polish.md";

describe("v0.9.15 fake evidence/Saved/Sources polish", () => {
  it("documents fake-only Chat, Sources, and Saved evidence clarity", () => {
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain(phase);
    expect(doc).toContain("Chat no-answer wording");
    expect(doc).toContain("context-only fake sources");
    expect(doc).toContain("fake source IDs");
    expect(doc).toContain("citable/context-only role counts");
    expect(doc).toContain("citation count");
    expect(doc).toContain("fake build metadata");
    expect(doc).toContain("No real documents are read or summarized.");
    expect(doc).toContain("No file picker, FileReader, path reader, upload handler, OCR, embeddings, indexing, or vector store is added.");
  });

  it("adds visible fake evidence copy without file affordances", () => {
    const component = readFileSync("components/KiaStickApp.tsx", "utf8");

    expect(component).toContain("Unsaved no-answer; context-only trail");
    expect(component).toContain("Prompt and provider metadata remain visible there");
    expect(component).toContain("source IDs visible on every row");
    expect(component).toContain("citation count, and fake build metadata");
    expect(component).not.toMatch(/showOpenFilePicker|showDirectoryPicker|readAsText|readAsArrayBuffer|type=["']file["']/i);
  });

  it("tracks state without version, queue, or real-doc drift", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0915_fake_evidence_saved_sources_polish: {
        phase: string;
        status: string;
        runtime_ui_copy_changed: boolean;
        runtime_capability_changed: boolean;
        product_version: string;
        prompt_version: string;
        queue_015_status: string;
        real_doc_implementation_approved: boolean;
      };
    };
    const state = featureList.v0915_fake_evidence_saved_sources_polish;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("needs_review");
    expect(state.runtime_ui_copy_changed).toBe(true);
    expect(state.runtime_capability_changed).toBe(false);
    expect(state.product_version).toBe("0.7.0");
    expect(state.prompt_version).toBe("prompt.fake-docs.v0.5-import-wizard-hardening");
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});
