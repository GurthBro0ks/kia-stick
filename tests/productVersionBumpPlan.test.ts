import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const planPath = "docs/v0.7.1-product-version-bump-plan.md";
const plan = readFileSync(planPath, "utf8");

function readRuntimeSources(): string {
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
    expect(existsSync(file)).toBe(true);
    files.push(readFileSync(file, "utf8"));
  }

  return files.join("\n");
}

describe("v0.7.1 product-version bump plan", () => {
  it("remains traceable after the separately approved v0.7.2 implementation", () => {
    expect(plan).toContain("KIA-Stick-v0.7.1-product-version-bump-plan");
    expect(plan).toContain("PLAN ONLY");
    expect(plan).toContain("`productVersion` stays `0.4.0`");
    expect(plan).toContain("`promptVersion` stays `prompt.fake-docs.v0.5-import-wizard-hardening`");
    expect(plan).toContain("does not change runtime `productVersion` or `promptVersion`");
    expect(plan).toContain("KIA-Stick-v0.7.2-product-version-bump-implementation-to-0.7.0");
    expect(plan).toContain("implements the `0.7.0` product/runtime identity bump");

    const versionSource = readFileSync("lib/version.ts", "utf8");
    expect(versionSource).toContain('export const PRODUCT_VERSION = "0.7.0";');
    expect(versionSource).toContain('export const PROMPT_VERSION = "prompt.fake-docs.v0.5-import-wizard-hardening";');
  });

  it("compares all bump candidates and defines the recommended decision rule", () => {
    for (const candidate of ["`0.5.0`", "`0.6.0`", "`0.7.0`"]) {
      expect(plan).toContain(candidate);
    }

    expect(plan).toContain("Recommended default target: `0.7.0`");
    expect(plan).toContain("only in a later, separately approved bump implementation phase");
    expect(plan).toContain("Choose no bump");
  });

  it("lists blockers before an actual product-version bump", () => {
    for (const blocker of [
      "future prompt explicitly approves changing runtime/product version constants",
      "selected bump target is named exactly",
      "GitHub-safe release note",
      "`lib/version.ts`, `package.json`, `feature_list.json`, `README.md`, and `CLOSEOUT.md`",
      "`/health`, `/version`, visible UI versioning, and saved-answer metadata",
      "No file picker",
      "No secrets, private paths, raw document text",
    ]) {
      expect(plan).toContain(blocker);
    }
  });

  it("defines the exact later bump validation checklist", () => {
    for (const required of [
      "git rev-parse --short HEAD",
      "git rev-parse --short origin/main",
      "Confirm `PRODUCT_VERSION` equals the selected target",
      "Confirm `PROMPT_VERSION` remains `prompt.fake-docs.v0.5-import-wizard-hardening`",
      "Confirm `/health` reports the selected `productVersion`",
      "Confirm `/version` displays the selected `productVersion`",
      "Confirm saved-answer metadata records the selected `productVersion`",
      "npm run release:check",
      "npm run qa",
      "npm run proof:latest",
      "npm run closeout:review",
      "npm run closeout:summary",
      "git diff --check",
    ]) {
      expect(plan).toContain(required);
    }
  });

  it("defines rollback/no-bump criteria and GitHub-safe proof exclusions", () => {
    expect(plan).toContain("Rollback And No-Bump Criteria");
    expect(plan).toContain("revert that local bump commit and rerun validation");
    expect(plan).toContain("follow-up rollback commit");
    expect(plan).toContain("GitHub-Safe Proof Rules");

    for (const forbiddenProofItem of [
      "Raw document text",
      "Snippets",
      "Private source paths",
      "OCR text",
      "Vector data",
      "Embeddings",
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
    expect(runtime).not.toMatch(/\breadRealDocument\b|\bquarantineRealDocument\b|\brunOcr\b|\bcreateVectorStore\b/);
  });
});
