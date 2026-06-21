import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const draftPath = "docs/v0.6-future-implementation-gate-draft.md";
const draft = readFileSync(draftPath, "utf8");

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
    "lib/fakePilotSimulatorModel.ts",
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

describe("v0.6.6 future implementation gate draft", () => {
  it("is explicitly planning-only and keeps the version hold", () => {
    expect(draft).toContain("KIA-Stick-v0.6.6-future-implementation-gate-draft");
    expect(draft).toContain("PLAN ONLY");
    expect(draft).toContain("Product version impact: none");
    expect(draft).toContain("`productVersion` stays `0.4.0`");
    expect(draft).toContain("does not authorize or implement");
  });

  it("states the draft does not authorize implementation and enforces one gate/one document", () => {
    expect(draft).toContain("does not approve real detection, real redaction");
    expect(draft).toContain("One-Gate / One-Document Rule");
    expect(draft).toContain("exactly one gate");
    expect(draft).toContain("exactly one document");
    expect(draft).toContain("separately approved");
  });

  it("defines every required future-prompt field", () => {
    for (const field of [
      "Exact gate",
      "Exact one-document scope",
      "Allowed action",
      "Blocked actions",
      "Approval packet reference",
      "Safety checklist result",
      "Redaction policy result",
      "Rollback",
      "Deletion and retention",
      "Proof-safe output",
      "Stop conditions",
    ]) {
      expect(draft).toContain(field);
    }

    expect(draft).toContain("docs/v0.6-operator-approval-packet.md");
    expect(draft).toContain("docs/v0.6-real-doc-safety-checklist.md");
    expect(draft).toContain("docs/v0.6-local-redaction-policy-plan.md");
  });

  it("defines every gate type", () => {
    for (const gate of [
      "Source selection",
      "Quarantine copy",
      "Provenance and hash",
      "Redaction detection",
      "Redaction review",
      "Metadata review",
      "Index eligibility",
      "Audit",
      "Rollback",
      "Deletion",
    ]) {
      expect(draft).toContain(gate);
    }

    expect(draft).toContain("PASS");
    expect(draft).toContain("WARN");
    expect(draft).toContain("FAIL");
    expect(draft).toContain("do not proceed");
    expect(draft).toContain("before any real content is touched");
  });

  it("keeps GitHub-safe proof free of real content and sensitive artifacts", () => {
    expect(draft).toContain("GitHub-Safe Proof Rules");

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
      expect(draft).toContain(forbiddenProofItem);
    }

    const realMount = ["/media", "mint", "SHARED", "APWU"].join("/");
    const privateVault = ["kia-stick", "private-vault"].join("-");
    expect(draft).not.toContain(realMount);
    expect(draft).not.toContain(privateVault);
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
