import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.2-proof-durability-contract";
const docPath = "docs/v0.9.2-proof-durability-contract.md";
const scriptPath = resolve("scripts/proof-index.mjs");

interface ProofIndexModule {
  assessProofDurability(record: Record<string, string>): {
    status: string;
    originalProofDirStatus: string;
    replacementProofStatus: string;
    issues: Array<{ severity: string; code: string; message: string }>;
  };
}

async function loadModule(): Promise<ProofIndexModule> {
  return (await import(pathToFileURL(scriptPath).href)) as ProofIndexModule;
}

function tempProofDir(slug: string): string {
  const root = mkdtempSync(join(tmpdir(), "kia-proof-durability-"));
  const proof = join(root, `proof_kia_stick_${slug}_20260627T000000Z`);
  mkdirSync(proof);
  return proof;
}

describe("v0.9.2 proof durability contract", () => {
  it("documents missing-original and replacement-proof handling", () => {
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain(phase);
    expect(doc).toContain("Missing original proof directories are `WARN` unless a replacement proof is explicitly recorded");
    expect(doc).toContain("original missing proof path");
    expect(doc).toContain("replacement proof path");
    expect(doc).toContain("validation status");
    expect(doc).toContain("queue status");
    expect(doc).toContain("push status");
    expect(doc).toContain("`HEAD`/`origin/main` equality status");
    expect(doc).toContain("must not be treated as `PASS` unless replacement proof is present and validation passed");
  });

  it("warns when an original proof is missing without replacement proof", async () => {
    const mod = await loadModule();
    const assessment = mod.assessProofDurability({
      originalProofDir: "/tmp/proof_kia_stick_missing_original_20260627T000000Z",
    });

    expect(assessment.status).toBe("WARN");
    expect(assessment.originalProofDirStatus).toBe("missing");
    expect(assessment.issues.map((issue) => issue.code)).toContain("missing_original_without_replacement");
  });

  it("passes only when replacement proof is recorded and validation passed", async () => {
    const mod = await loadModule();
    const replacement = tempProofDir("replacement_contract");
    const assessment = mod.assessProofDurability({
      originalProofDir: "/tmp/proof_kia_stick_missing_original_20260627T000000Z",
      replacementProofDir: replacement,
      validationStatus: "PASS",
      queueStatus: "accepted",
      pushStatus: "pushed",
      headEqualsOriginMain: "verified",
    });

    expect(assessment.status).toBe("PASS");
    expect(assessment.originalProofDirStatus).toBe("missing");
    expect(assessment.replacementProofStatus).toBe("recorded_validation_passed");
    expect(assessment.issues).toHaveLength(0);
  });

  it("keeps the contract GitHub-safe and out of private source access", () => {
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain("must not copy or inspect private files");
    expect(doc).toContain("Proof summaries must stay GitHub-safe");
    expect(doc).not.toMatch(/\bshowOpenFilePicker\b|\bFileReader\b|\bcreateVectorStore\b|\bVectorStore\.from\b/);
  });
});
