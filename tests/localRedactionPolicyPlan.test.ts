import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const planPath = "docs/v0.6-local-redaction-policy-plan.md";
const plan = readFileSync(planPath, "utf8");

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

describe("v0.6.5 local redaction policy plan", () => {
  it("is explicitly planning-only and keeps the version hold", () => {
    expect(plan).toContain("KIA-Stick-v0.6.5-local-redaction-policy-plan");
    expect(plan).toContain("PLAN ONLY");
    expect(plan).toContain("Product version impact: none");
    expect(plan).toContain("`productVersion` stays `0.4.0`");
    expect(plan).toContain("does not authorize or implement");
  });

  it("states the policy alone does not authorize real redaction or implementation", () => {
    expect(plan).toContain("does not approve real detection, real redaction");
    expect(plan).toContain("name **exactly one gate** and **exactly one document**");
    expect(plan).toContain("docs/v0.6-real-doc-safety-checklist.md");
    expect(plan).toContain("docs/v0.6-operator-approval-packet.md");
  });

  it("defines every required redaction category", () => {
    for (const category of [
      "Member identifiers",
      "Employee IDs",
      "Contact info",
      "Case facts",
      "Medical",
      "Discipline",
      "Settlement",
      "Witnesses",
      "Screenshots and images",
      "Management and officer names",
      "Dates",
      "Locations",
      "Installation data",
      "Grievance IDs",
      "Signatures",
      "Account, session, and device data",
      "Metadata",
    ]) {
      expect(plan).toContain(category);
    }
  });

  it("defines handling, roles, escalation, default-deny, and retention", () => {
    for (const required of [
      "PASS / WARN / FAIL Handling",
      "Reviewer Roles",
      "Escalation Rules",
      "Default Deny and Not-Indexable Behavior",
      "Deletion and Retention Rules",
    ]) {
      expect(plan).toContain(required);
    }

    expect(plan).toContain("PASS");
    expect(plan).toContain("WARN");
    expect(plan).toContain("FAIL");
    expect(plan).toContain("do not proceed");
    expect(plan).toContain("Default deny");
    expect(plan).toContain("not_indexable");
    expect(plan).toContain("before any real content is touched");
  });

  it("keeps GitHub-safe proof free of real content and sensitive artifacts", () => {
    expect(plan).toContain("GitHub-Safe Proof Rules");

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
      expect(plan).toContain(forbiddenProofItem);
    }

    const realMount = ["/media", "mint", "SHARED", "APWU"].join("/");
    const privateVault = ["kia-stick", "private-vault"].join("-");
    expect(plan).not.toContain(realMount);
    expect(plan).not.toContain(privateVault);
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
