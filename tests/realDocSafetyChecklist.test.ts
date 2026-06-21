import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const checklistPath = "docs/v0.6-real-doc-safety-checklist.md";
const checklist = readFileSync(checklistPath, "utf8");

function readRuntimeSources(): string {
  const roots = ["app", "components", "lib"];
  const candidates = [
    "app/health/route.ts",
    "app/layout.tsx",
    "app/page.tsx",
    "app/version/page.tsx",
    "components/KiaStickApp.tsx",
    "lib/answerGovernor.ts",
    "lib/conversationModel.ts",
    "lib/importWizardModel.ts",
    "lib/redactionMetadataModel.ts",
    "lib/savedAnswers.ts",
    "lib/serverVersion.ts",
    "lib/sourceModel.ts",
    "lib/vaultModel.ts",
    "lib/version.ts",
  ];

  const files: string[] = [];
  for (const file of candidates) {
    expect(roots.some((root) => file.startsWith(`${root}/`))).toBe(true);
    expect(existsSync(file)).toBe(true);
    files.push(readFileSync(file, "utf8"));
  }

  return files.join("\n");
}

describe("v0.6.2 real-doc safety checklist", () => {
  it("is explicitly planning-only and keeps the version hold", () => {
    expect(checklist).toContain("KIA-Stick-v0.6.2-safety-review-checklist");
    expect(checklist).toContain("PLAN ONLY");
    expect(checklist).toContain("Product version impact: none");
    expect(checklist).toContain("`productVersion` stays `0.4.0`");
    expect(checklist).toContain("does not authorize or implement");
  });

  it("covers every required pre-content safety gate", () => {
    for (const required of [
      "Operator approval",
      "Source scope",
      "Single-document limit",
      "Non-recursive rule",
      "Quarantine destination",
      "Hash and provenance",
      "Redaction review",
      "Metadata review",
      "Index eligibility",
      "Audit",
      "Rollback",
      "Deletion and retention",
      "Stop conditions",
      "Pre-Content Blockers",
      "Do-Not-Proceed Decision Matrix",
    ]) {
      expect(checklist).toContain(required);
    }

    expect(checklist).toContain("PASS");
    expect(checklist).toContain("WARN");
    expect(checklist).toContain("FAIL");
    expect(checklist).toContain("do not proceed");
    expect(checklist).toContain("before any real content is touched");
  });

  it("keeps GitHub-safe proof free of real content and sensitive artifacts", () => {
    expect(checklist).toContain("GitHub-Safe Proof Checklist");

    for (const forbiddenProofItem of [
      "Raw document text",
      "Snippets",
      "Private paths",
      "OCR text",
      "Hash values when sensitive",
      "Exports",
      "Vector data",
      "Private notes",
    ]) {
      expect(checklist).toContain(forbiddenProofItem);
    }

    const realMount = ["/media", "mint", "SHARED", "APWU"].join("/");
    const privateVault = ["kia-stick", "private-vault"].join("-");
    expect(checklist).not.toContain(realMount);
    expect(checklist).not.toContain(privateVault);
  });

  it("does not add file input, path reader, or real-doc runtime code paths", () => {
    const runtime = readRuntimeSources();

    expect(runtime).not.toMatch(/<input[^>]*type=["']file/i);
    expect(runtime).not.toMatch(/\bshowOpenFilePicker\b/);
    expect(runtime).not.toMatch(/\bwebkitdirectory\b/);
    expect(runtime).not.toMatch(/\bFileReader\b/);
    expect(runtime).not.toMatch(/\breadAsText\b|\breadAsArrayBuffer\b/);
    expect(runtime).not.toMatch(/\brealDocPilot\b|\breadRealDocument\b|\bquarantineRealDocument\b|\brunOcr\b|\bcreateVectorStore\b/);
  });
});
