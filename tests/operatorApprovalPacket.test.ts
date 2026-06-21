import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packetPath = "docs/v0.6-operator-approval-packet.md";
const packet = readFileSync(packetPath, "utf8");

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

describe("v0.6.4 operator approval packet", () => {
  it("is explicitly planning-only and keeps the version hold", () => {
    expect(packet).toContain("KIA-Stick-v0.6.4-operator-approval-packet");
    expect(packet).toContain("PLAN ONLY");
    expect(packet).toContain("Product version impact: none");
    expect(packet).toContain("`productVersion` stays `0.4.0`");
    expect(packet).toContain("does not authorize or implement");
  });

  it("states approval alone does not authorize implementation", () => {
    expect(packet).toContain("does not authorize implementation");
    expect(packet).toContain("name exactly one gate and exactly one document");
    expect(packet).toContain("docs/v0.6-real-doc-safety-checklist.md");
  });

  it("requires every operator-fillable packet field", () => {
    for (const required of [
      "Exact Phase",
      "One-Document Scope",
      "Allowed Actions",
      "Blocked Actions",
      "Rollback",
      "Deletion And Retention",
      "GitHub-Safe Proof",
      "Operator Signature And Date",
      "Approval Gate Checklist",
      "Do-Not-Proceed Blockers",
      "Copy-Ready Operator Approval Template",
    ]) {
      expect(packet).toContain(required);
    }

    expect(packet).toContain("PASS");
    expect(packet).toContain("WARN");
    expect(packet).toContain("FAIL");
    expect(packet).toContain("do not proceed");
    expect(packet).toContain("before any real content is touched");
  });

  it("keeps GitHub-safe proof free of real content and sensitive artifacts", () => {
    expect(packet).toContain("GitHub-Safe Proof Rules");

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
      expect(packet).toContain(forbiddenProofItem);
    }

    const realMount = ["/media", "mint", "SHARED", "APWU"].join("/");
    const privateVault = ["kia-stick", "private-vault"].join("-");
    expect(packet).not.toContain(realMount);
    expect(packet).not.toContain(privateVault);
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
