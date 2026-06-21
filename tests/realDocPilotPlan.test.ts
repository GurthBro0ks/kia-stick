import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const planPath = "docs/v0.6-real-doc-pilot-plan.md";
const plan = readFileSync(planPath, "utf8");

function readRuntimeSources(): string {
  const roots = ["app", "components", "lib"];
  const files: string[] = [];

  // Keep the traversal explicit so the test cannot drift into private storage.
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

  for (const file of candidates) {
    expect(roots.some((root) => file.startsWith(`${root}/`))).toBe(true);
    expect(existsSync(file)).toBe(true);
    files.push(readFileSync(file, "utf8"));
  }

  return files.join("\n");
}

describe("v0.6 real-doc pilot plan", () => {
  it("is explicitly plan-only and keeps productVersion on the current hold", () => {
    expect(plan).toContain("KIA-Stick-v0.6.0-real-doc-pilot-plan-only");
    expect(plan).toContain("PLAN ONLY");
    expect(plan).toContain("Product version impact: none");
    expect(plan).toContain("`productVersion` stays `0.4.0`");
    expect(plan).toContain("does not authorize or implement");
  });

  it("defines the required future single-document gates and stop conditions", () => {
    for (const required of [
      "Allowed Future Source Scope",
      "Stop Conditions",
      "Operator Approval Gates",
      "Future Quarantine Copy Rules",
      "Hashing And Provenance",
      "Redaction Review",
      "Metadata Review",
      "Index Eligibility",
      "Audit, Rollback, And Retention",
      "Acceptance Checklist For A Later Implementation Prompt",
    ]) {
      expect(plan).toContain(required);
    }

    expect(plan).toContain("exactly one source item");
    expect(plan).toContain("Stop before any real content is touched");
    expect(plan).toContain("No vector store is approved by this plan");
  });

  it("keeps GitHub-safe proof free of raw content, paths, identifiers, and sensitive hashes", () => {
    expect(plan).toContain("GitHub-Safe Proof Rules");

    for (const forbiddenProofItem of [
      "Raw document text",
      "Raw source paths or quarantine paths",
      "Snippets",
      "OCR text",
      "identifiers",
      "Hash values when sensitive",
      "vector-store data",
      "private notes",
    ]) {
      expect(plan).toContain(forbiddenProofItem);
    }

    expect(plan).not.toContain("/media/mint/SHARED/APWU");
    expect(plan).not.toContain("kia-stick-private-vault");
  });

  it("does not add runtime file input or local file-read APIs", () => {
    const runtime = readRuntimeSources();

    expect(runtime).not.toMatch(/<input[^>]*type=["']file/i);
    expect(runtime).not.toMatch(/\bshowOpenFilePicker\b/);
    expect(runtime).not.toMatch(/\bwebkitdirectory\b/);
    expect(runtime).not.toMatch(/\bFileReader\b/);
    expect(runtime).not.toMatch(/\breadAsText\b|\breadAsArrayBuffer\b/);
    expect(runtime).not.toMatch(/from ["']node:fs["']|require\(["']fs["']\)/);
  });
});
