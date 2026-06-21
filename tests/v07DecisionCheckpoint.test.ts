import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const checkpointPath = "docs/v0.7-decision-checkpoint.md";
const checkpoint = readFileSync(checkpointPath, "utf8");

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

describe("v0.7 decision checkpoint", () => {
  it("is explicitly planning-only and keeps the version hold", () => {
    expect(checkpoint).toContain("KIA-Stick-v0.6.7-backlog-closeout-v0.7-decision-checkpoint");
    expect(checkpoint).toContain("PLAN ONLY");
    expect(checkpoint).toContain("Product version impact: none");
    expect(checkpoint).toContain("`productVersion` stays `0.4.0`");
  });

  it("summarizes the current safe state", () => {
    for (const required of [
      "Current Safe State",
      "Fake app",
      "Proof tooling",
      "Queue tooling",
      "v0.6 planning artifacts",
      "No real-doc implementation",
    ]) {
      expect(checkpoint).toContain(required);
    }

    for (const artifact of [
      "docs/v0.6-real-doc-pilot-plan.md",
      "docs/v0.6-real-doc-safety-checklist.md",
      "docs/v0.6-operator-approval-packet.md",
      "docs/v0.6-local-redaction-policy-plan.md",
      "docs/v0.6-future-implementation-gate-draft.md",
    ]) {
      expect(checkpoint).toContain(artifact);
    }
  });

  it("lists the v0.7 choices", () => {
    for (const choice of [
      "Pause / stabilize",
      "Product-version bump plan",
      "Fake-only UX polish",
      "Real-doc gate preparation",
      "First real-doc gate request",
    ]) {
      expect(checkpoint).toContain(choice);
    }
  });

  it("states the real-doc requirements and keeps real-doc work blocked", () => {
    expect(checkpoint).toContain("Requirements For Any Real-Doc Path");
    for (const requirement of [
      "signed operator approval packet",
      "PASS` result for `docs/v0.6-real-doc-safety-checklist.md",
      "redaction policy result",
      "docs/v0.6-future-implementation-gate-draft.md",
      "exactly one gate",
      "exactly one document",
      "Fresh operator approval",
    ]) {
      expect(checkpoint).toContain(requirement);
    }
    expect(checkpoint).toContain("real-doc implementation is **blocked**");
    expect(checkpoint).toContain("does not approve real detection, real redaction");
  });

  it("keeps GitHub-safe proof free of real content and sensitive artifacts", () => {
    expect(checkpoint).toContain("GitHub-Safe Proof Rules");

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
      expect(checkpoint).toContain(forbiddenProofItem);
    }

    const realMount = ["/media", "mint", "SHARED", "APWU"].join("/");
    const privateVault = ["kia-stick", "private-vault"].join("-");
    expect(checkpoint).not.toContain(realMount);
    expect(checkpoint).not.toContain(privateVault);
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
