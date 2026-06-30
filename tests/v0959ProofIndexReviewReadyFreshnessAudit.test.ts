import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.59-proof-index-review-ready-freshness-audit";
const docPath = "docs/v0.9.59-proof-index-review-ready-freshness-audit.md";

describe("v0.9.59 proof-index review-ready freshness audit", () => {
  it("explains why latest proof and screenshot review-ready proof can differ", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "can show a current `Latest proof` while the screenshot-gated review-ready proof remains older",
      "proof directory names",
      "`RESULT.md`",
      "`OPEN_THIS_FOLDER.txt`",
      "filenames under a proof-local `screenshots/` directory",
      "must not read screenshots, OCR images, inspect private artifacts",
      "must not read screenshots",
      "`RESULT=PASS`",
      "at least one screenshot filename",
      "Accepted pushed closeout proof is a separate concept.",
      "latest accepted pushed closeout proof",
      "latest operator QA PASS proof",
      "latest accepted-WARN proof",
      "why an older screenshot-gated proof is selected",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks proof-index audit status without runtime or package drift", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0959_proof_index_review_ready_freshness_audit: {
        phase: string;
        status: string;
        reads_safe_metadata_only: boolean;
        reads_screenshots: boolean;
        scans_arbitrary_paths: boolean;
        mutates_proof_directories: boolean;
        package_lock_changed: boolean;
        real_doc_capability_added: boolean;
      };
    };
    const state = featureList.v0959_proof_index_review_ready_freshness_audit;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.reads_safe_metadata_only).toBe(true);
    expect(state.reads_screenshots).toBe(false);
    expect(state.scans_arbitrary_paths).toBe(false);
    expect(state.mutates_proof_directories).toBe(false);
    expect(state.package_lock_changed).toBe(false);
    expect(state.real_doc_capability_added).toBe(false);
  });
});
