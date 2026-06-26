import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const targetProductVersion = "0.7.0";
const promptVersion = "prompt.fake-docs.v0.5-import-wizard-hardening";
const currentPhase = "KIA-Stick-v0.7.15-synthetic-packet-report-runner";

function constantValue(source: string, name: string): string {
  const match = source.match(new RegExp(`export\\s+const\\s+${name}\\s*=\\s*"([^"]+)"`));
  if (!match) throw new Error(`Missing ${name}`);
  return match[1];
}

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

describe("v0.7.2 product-version contract bump", () => {
  it("sets product and package identity to 0.7.0 while preserving promptVersion", () => {
    const versionSource = readFileSync("lib/version.ts", "utf8");
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };
    const packageLock = JSON.parse(readFileSync("package-lock.json", "utf8")) as { version: string; packages: Record<string, { version?: string }> };
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      phase: string;
      release_readiness: {
        phase: string;
        package_version: string;
        product_version: string;
        prompt_version: string;
        version_coherence: {
          package_version: string;
          product_version: string;
          prompt_version: string;
        };
      };
    };

    expect(constantValue(versionSource, "PRODUCT_VERSION")).toBe(targetProductVersion);
    expect(constantValue(versionSource, "PROMPT_VERSION")).toBe(promptVersion);
    expect(packageJson.version).toBe(targetProductVersion);
    expect(packageLock.version).toBe(targetProductVersion);
    expect(packageLock.packages[""].version).toBe(targetProductVersion);
    expect(featureList.phase).toBe(currentPhase);
    expect(featureList.release_readiness.phase).toBe(featureList.phase);
    expect(featureList.release_readiness.package_version).toBe(targetProductVersion);
    expect(featureList.release_readiness.product_version).toBe(targetProductVersion);
    expect(featureList.release_readiness.prompt_version).toBe(promptVersion);
    expect(featureList.release_readiness.version_coherence.package_version).toBe(targetProductVersion);
    expect(featureList.release_readiness.version_coherence.product_version).toBe(targetProductVersion);
    expect(featureList.release_readiness.version_coherence.prompt_version).toBe(promptVersion);
  });

  it("keeps the v0.7.1 plan and v0.7 release note traceable", () => {
    const plan = readFileSync("docs/v0.7.1-product-version-bump-plan.md", "utf8");
    const release = readFileSync("docs/RELEASE_v0.7.md", "utf8");
    const readme = readFileSync("README.md", "utf8");
    const closeout = readFileSync("CLOSEOUT.md", "utf8");

    for (const text of [plan, release, readme, closeout]) {
      expect(text).toContain("KIA-Stick-v0.7.2-product-version-bump-implementation-to-0.7.0");
      expect(text).toContain(targetProductVersion);
      expect(text).toContain(promptVersion);
    }

    expect(plan).toContain("uses this plan's default decision rule");
    expect(release).toContain("release-identity catch-up bump only");
    expect(release).toContain("does not approve real-document implementation");
  });

  it("keeps real-doc capabilities absent from runtime code", () => {
    const runtime = readRuntimeSources();

    expect(runtime).not.toMatch(/<input[^>]*type=["']file/i);
    expect(runtime).not.toMatch(/\bshowOpenFilePicker\b/);
    expect(runtime).not.toMatch(/\bwebkitdirectory\b/);
    expect(runtime).not.toMatch(/\bFileReader\b/);
    expect(runtime).not.toMatch(/\breadAsText\b|\breadAsArrayBuffer\b/);
    expect(runtime).not.toMatch(/\breadRealDocument\b|\bquarantineRealDocument\b|\brunOcr\b|\bcreateVectorStore\b/);
  });
});
