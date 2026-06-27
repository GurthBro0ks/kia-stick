import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.7.18-synthetic-governance-bundle-report";
const currentPhase = "KIA-Stick-v0.9.0-fake-runtime-ux-checkpoint";
const docPath = "docs/v0.7.18-synthetic-governance-bundle-report.md";
const scriptPath = "scripts/synthetic-governance-report.mjs";
const productVersion = "0.7.0";
const promptVersion = "prompt.fake-docs.v0.5-import-wizard-hardening";

function runReport(args: string[] = []) {
  return spawnSync("node", [scriptPath, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

describe("v0.7.18 synthetic governance bundle report", () => {
  it("documents a fixed-source synthetic governance report", () => {
    expect(existsSync(docPath)).toBe(true);
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain(phase);
    expect(doc).toContain(`Product version: \`${productVersion}\``);
    expect(doc).toContain(`Prompt version: \`${promptVersion}\``);
    expect(doc).toContain("built-in synthetic fixtures and fixed repo-owned metadata only");
    expect(doc).toContain("rejects unexpected positional arguments");
    expect(doc).toContain("does not read user-provided files");
    expect(doc).toContain("queue-015-v07-first-real-doc-gate-request` remains blocked");
  });

  it("prints PASS/WARN/FAIL counts and guard fields", () => {
    const result = runReport();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("# KIA Stick Synthetic Governance Report");
    expect(result.stdout).toContain(`Phase: ${phase}`);
    expect(result.stdout).toContain(`Product version: ${productVersion}`);
    expect(result.stdout).toContain(`Prompt version: ${promptVersion}`);
    expect(result.stdout).toContain("Report status: PASS");
    expect(result.stdout).toContain("Packet report status: PASS");
    expect(result.stdout).toContain("Packet guard status: PASS");
    expect(result.stdout).toContain("Fixture matrix status: PASS");
    expect(result.stdout).toContain("PASS fixtures: 1");
    expect(result.stdout).toContain("WARN fixtures: 1");
    expect(result.stdout).toContain("FAIL fixtures: 8");
    expect(result.stdout).toContain("queue015Status: blocked");
    expect(result.stdout).toContain("realDocumentAccessed: false");
    expect(result.stdout).toContain("readsUserFiles: false");
    expect(result.stdout).toContain("scansDirectories: false");
    expect(result.stdout).toContain("acceptsPathArguments: false");
  });

  it("keeps report output GitHub-safe", () => {
    const result = runReport();

    expect(result.status).toBe(0);
    expect(result.stdout).not.toMatch(/\/home\/mint|\/media|\/mnt|APWU|USPS|private-vault|real-documents/i);
    expect(result.stdout).not.toMatch(/\b(?:token|cookie|secret|password|authorization)\b/i);
    expect(result.stdout).not.toMatch(/\.(?:pdf|docx?|xlsx?|png|jpe?g)\b/i);
  });

  it("rejects unexpected positional path arguments", () => {
    const result = runReport(["/tmp/not-a-governance-source.json"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Unexpected argument rejected");
    expect(result.stdout).toBe("");
  });

  it("tracks package, feature, and queue state without product or prompt drift", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string>; version: string };
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      phase: string;
      release_readiness: { phase: string; product_version: string; package_version: string; prompt_version: string };
      v0718_synthetic_governance_bundle_report: {
        phase: string;
        status: string;
        queue_015_status: string;
        queue_033_status: string;
        real_document_access: boolean;
        reads_user_files: boolean;
        accepts_path_arguments: boolean;
        scans_directories: boolean;
      };
    };
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; phase: string; status: string; summary: string; next_action: string }>;
    };
    const q015 = queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request");
    const q033 = queue.items.find((item) => item.id === "queue-033-v0718-synthetic-governance-bundle-report");

    expect(packageJson.version).toBe(productVersion);
    expect(packageJson.scripts["governance:report"]).toBe("node scripts/synthetic-governance-report.mjs");
    expect(featureList.phase).toBe(currentPhase);
    expect(featureList.release_readiness.phase).toBe(currentPhase);
    expect(featureList.release_readiness.package_version).toBe(productVersion);
    expect(featureList.release_readiness.product_version).toBe(productVersion);
    expect(featureList.release_readiness.prompt_version).toBe(promptVersion);
    expect(featureList.v0718_synthetic_governance_bundle_report.phase).toBe(phase);
    expect(featureList.v0718_synthetic_governance_bundle_report.status).toBe("accepted_after_closeout_push");
    expect(featureList.v0718_synthetic_governance_bundle_report.queue_015_status).toBe("blocked");
    expect(featureList.v0718_synthetic_governance_bundle_report.queue_033_status).toBe("accepted");
    expect(featureList.v0718_synthetic_governance_bundle_report.real_document_access).toBe(false);
    expect(featureList.v0718_synthetic_governance_bundle_report.reads_user_files).toBe(false);
    expect(featureList.v0718_synthetic_governance_bundle_report.accepts_path_arguments).toBe(false);
    expect(featureList.v0718_synthetic_governance_bundle_report.scans_directories).toBe(false);
    expect(q015?.status).toBe("blocked");
    expect(q033?.phase).toBe(phase);
    expect(q033?.status).toBe("accepted");
    expect(`${q033?.summary}\n${q033?.next_action}`).toContain("GitHub-safe");
    expect(`${q033?.summary}\n${q033?.next_action}`).toContain("queue-015 remains blocked");
  });

  it("does not add user-provided file reads, upload, OCR, indexing, or vector implementation", () => {
    const source = readFileSync(scriptPath, "utf8");

    expect(source).toContain("Unexpected argument rejected");
    expect(source).toContain("built-in synthetic fixtures and fixed repo-owned metadata only");
    expect(source).not.toMatch(/<input[^>]*type=["']file|showOpenFilePicker|showDirectoryPicker|FileReader|readAsText|readAsArrayBuffer/i);
    expect(source).not.toMatch(/\bmulter\b|\buploadHandler\b|\brunOcr\b|\bcreateVectorStore\b|\bVectorStore\.from\b/);
    expect(source).not.toMatch(/\breaddirSync\b|\bopendirSync\b|\bexistsSync\b|\bstatSync\b/);
  });
});
