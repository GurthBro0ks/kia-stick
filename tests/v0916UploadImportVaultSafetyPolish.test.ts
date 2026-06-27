import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.16-upload-import-vault-safety-polish";
const docPath = "docs/v0.9.16-upload-import-vault-safety-polish.md";

describe("v0.9.16 Upload/Import/Vault safety polish", () => {
  it("documents fake-only Upload, Import, and Vault safety polish", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "button-only synthetic metadata actions",
      "one synthetic candidate",
      "fake metadata rows and guard flags only",
      "No file picker.",
      "No FileReader.",
      "No upload handler.",
      "No OCR.",
      "No indexing.",
      "No embeddings or vector store.",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("adds safety copy without real file capability", () => {
    const component = readFileSync("components/KiaStickApp.tsx", "utf8");

    expect(component).toContain("review fixtures, not files");
    expect(component).toContain("Buttons queue synthetic names, sizes, and timestamps only");
    expect(component).toContain("review labels are synthetic");
    expect(component).toContain("source text, OCR, uploads, and vectors are excluded");
    expect(component).toContain("uploads, embeddings, and indexes");
    expect(component).not.toMatch(/showOpenFilePicker|showDirectoryPicker|FileReader|readAsText|readAsArrayBuffer|multer|uploadHandler/i);
  });

  it("tracks safety state without package-lock or real-doc drift", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0916_upload_import_vault_safety_polish: {
        phase: string;
        status: string;
        upload_button_only_synthetic_metadata: boolean;
        import_fake_scaffold_only: boolean;
        vault_fake_metadata_only: boolean;
        package_lock_changed: boolean;
        runtime_capability_changed: boolean;
        queue_015_status: string;
      };
    };
    const state = featureList.v0916_upload_import_vault_safety_polish;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("needs_review");
    expect(state.upload_button_only_synthetic_metadata).toBe(true);
    expect(state.import_fake_scaffold_only).toBe(true);
    expect(state.vault_fake_metadata_only).toBe(true);
    expect(state.package_lock_changed).toBe(false);
    expect(state.runtime_capability_changed).toBe(false);
    expect(state.queue_015_status).toBe("blocked");
  });
});
