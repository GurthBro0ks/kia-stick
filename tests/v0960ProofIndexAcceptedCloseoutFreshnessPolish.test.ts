import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.60-proof-index-accepted-closeout-freshness-polish";
const docPath = "docs/v0.9.60-proof-index-accepted-closeout-freshness-polish.md";
const scriptPath = resolve("scripts/local-proof-index.mjs");

describe("v0.9.60 proof-index accepted closeout freshness polish", () => {
  it("documents explicit freshness labels and fake-only boundaries", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "`Latest proof:`",
      "`Latest accepted pushed closeout proof:`",
      "`Latest operator QA PASS proof:`",
      "`Latest accepted-WARN proof:`",
      "`Latest screenshot review-ready candidate:`",
      "`Latest review-ready proof:`",
      "`Review-ready candidate criteria:`",
      "closeout_push_20260630T204915Z",
      "does not require screenshots",
      "does not mutate proof directories",
      "does not inspect arbitrary folders outside the supplied root",
      "does not add runtime intake, file pickers, FileReader, OCR, uploads, embeddings, indexing, vector stores, real-doc processing",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("prints accepted pushed closeout and operator QA labels from safe RESULT metadata", () => {
    const root = mkdtempSync(join(tmpdir(), "kia-v0960-proof-index-"));
    const operatorProof = join(root, "proof_kia_stick_v0_9_53_to_v0_9_57_operator_qa_pass_recording_20260630T195543Z");
    mkdirSync(operatorProof, { recursive: true });
    writeFileSync(join(operatorProof, "RESULT.md"), "RESULT=PASS\nMANUAL_QA_STATUS=PASS\nPUSHED=no\n");
    const closeoutProof = join(operatorProof, "closeout_push_20260630T204915Z");
    mkdirSync(closeoutProof, { recursive: true });
    writeFileSync(join(closeoutProof, "RESULT.md"), "RESULT=PASS\nMANUAL_QA_STATUS=PASS\nPUSHED=yes\n");
    const latest = join(root, "proof_kia_stick_v0_9_58_to_v0_9_62_in_progress_20260630T205845Z");
    mkdirSync(latest);

    const result = spawnSync("node", [scriptPath, "latest", "--root", root], { encoding: "utf8" });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`Latest proof: ${latest}`);
    expect(result.stdout).toContain(`Latest accepted pushed closeout proof: ${closeoutProof}`);
    expect(result.stdout).toContain(`Latest operator QA PASS proof: ${operatorProof}`);
    expect(result.stdout).toContain("Latest screenshot review-ready candidate: none");
    expect(result.stdout).toContain("Review-ready candidate criteria:");
  });
});
