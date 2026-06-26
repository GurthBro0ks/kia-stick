import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.7.15-synthetic-packet-report-runner";
const currentPhase = "KIA-Stick-v0.7.16-synthetic-packet-safety-drift-guard";
const docPath = "docs/v0.7.15-synthetic-packet-report-runner.md";
const scriptPath = "scripts/synthetic-packet-report.mjs";
const productVersion = "0.7.0";
const promptVersion = "prompt.fake-docs.v0.5-import-wizard-hardening";

function runReport(args: string[] = []) {
  return spawnSync("node", [scriptPath, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
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

describe("v0.7.15 synthetic packet report runner", () => {
  it("documents the synthetic-only built-in fixture report runner", () => {
    expect(existsSync(docPath)).toBe(true);
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain(phase);
    expect(doc).toContain(`Product version: \`${productVersion}\``);
    expect(doc).toContain(`Prompt version: \`${promptVersion}\``);
    expect(doc).toContain("built-in synthetic fixtures only");
    expect(doc).toContain("not a real-doc approval packet");
    expect(doc).toContain("does not accept arbitrary file path input");
    expect(doc).toContain("does not read user-provided files");
    expect(doc).toContain("does not scan directories");
    expect(doc).toContain("queue-015-v07-first-real-doc-gate-request` remains blocked");
  });

  it("prints PASS, WARN, and FAIL fixture results with guard fields", () => {
    const result = runReport();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("# KIA Stick Synthetic Packet Report");
    expect(result.stdout).toContain(`Phase: ${phase}`);
    expect(result.stdout).toContain(`Product version: ${productVersion}`);
    expect(result.stdout).toContain(`Prompt version: ${promptVersion}`);
    expect(result.stdout).toContain("Report status: PASS");
    expect(result.stdout).toContain("fixture-pass-complete | PASS | PASS");
    expect(result.stdout).toContain("fixture-warn-missing-reviewer-retention | WARN | WARN");
    expect(result.stdout).toContain("fixture-fail-broad-private-recursive | FAIL | FAIL");
    expect(result.stdout).toContain("queue015Status: blocked");
    expect(result.stdout).toContain("realDocumentAccessed: false");
    expect(result.stdout).toContain("readsUserFiles: false");
    expect(result.stdout).toContain("scansDirectories: false");
    expect(result.stdout).toContain("acceptsPathArguments: false");
  });

  it("keeps report output GitHub-safe and free of real/private path markers", () => {
    const result = runReport();
    const report = result.stdout;

    expect(result.status).toBe(0);
    expect(report).not.toMatch(/\/home\/mint|\/media|\/mnt|APWU|USPS|private-vault|real-documents/i);
    expect(report).not.toMatch(/\b(?:token|cookie|secret|password|authorization)\b/i);
    expect(report).not.toMatch(/\.(?:pdf|docx?|xlsx?|png|jpe?g)\b/i);
  });

  it("rejects unexpected positional path arguments instead of reading arbitrary files", () => {
    const result = runReport(["/tmp/not-a-packet.json"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Unexpected argument rejected");
    expect(result.stderr).toContain("/tmp/not-a-packet.json");
    expect(result.stdout).toBe("");
  });

  it("adds the package script without changing product or prompt identity", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
      version: string;
    };
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      phase: string;
      release_readiness: {
        phase: string;
        package_version: string;
        product_version: string;
        prompt_version: string;
      };
      v0715_synthetic_packet_report_runner: {
        phase: string;
        status: string;
        product_version: string;
        package_version: string;
        prompt_version: string;
        queue_015_status: string;
        queue_030_status: string;
        authorizes_real_doc_work: boolean;
        real_document_access: boolean;
        reads_user_files: boolean;
        accepts_path_arguments: boolean;
        scans_directories: boolean;
        upload_handler_added: boolean;
        ocr_added: boolean;
        indexing_added: boolean;
        vector_store_added: boolean;
      };
    };
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; phase: string; status: string; summary: string; next_action: string }>;
    };
    const q015 = queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request");
    const q030 = queue.items.find((item) => item.id === "queue-030-v0715-synthetic-packet-report-runner");

    expect(packageJson.scripts["packet:report"]).toBe("node scripts/synthetic-packet-report.mjs");
    expect(packageJson.version).toBe(productVersion);
    expect(featureList.phase).toBe(currentPhase);
    expect(featureList.release_readiness.phase).toBe(currentPhase);
    expect(featureList.release_readiness.package_version).toBe(productVersion);
    expect(featureList.release_readiness.product_version).toBe(productVersion);
    expect(featureList.release_readiness.prompt_version).toBe(promptVersion);
    expect(featureList.v0715_synthetic_packet_report_runner.phase).toBe(phase);
    expect(featureList.v0715_synthetic_packet_report_runner.status).toBe("accepted_after_push");
    expect(featureList.v0715_synthetic_packet_report_runner.product_version).toBe(productVersion);
    expect(featureList.v0715_synthetic_packet_report_runner.package_version).toBe(productVersion);
    expect(featureList.v0715_synthetic_packet_report_runner.prompt_version).toBe(promptVersion);
    expect(featureList.v0715_synthetic_packet_report_runner.queue_015_status).toBe("blocked");
    expect(featureList.v0715_synthetic_packet_report_runner.queue_030_status).toBe("accepted");
    expect(featureList.v0715_synthetic_packet_report_runner.authorizes_real_doc_work).toBe(false);
    expect(featureList.v0715_synthetic_packet_report_runner.real_document_access).toBe(false);
    expect(featureList.v0715_synthetic_packet_report_runner.reads_user_files).toBe(false);
    expect(featureList.v0715_synthetic_packet_report_runner.accepts_path_arguments).toBe(false);
    expect(featureList.v0715_synthetic_packet_report_runner.scans_directories).toBe(false);
    expect(featureList.v0715_synthetic_packet_report_runner.upload_handler_added).toBe(false);
    expect(featureList.v0715_synthetic_packet_report_runner.ocr_added).toBe(false);
    expect(featureList.v0715_synthetic_packet_report_runner.indexing_added).toBe(false);
    expect(featureList.v0715_synthetic_packet_report_runner.vector_store_added).toBe(false);
    expect(q015?.status).toBe("blocked");
    expect(q030?.phase).toBe(phase);
    expect(q030?.status).toBe("accepted");
    expect(`${q030?.summary}\n${q030?.next_action}`).toContain("built-in synthetic fixtures");
    expect(`${q030?.summary}\n${q030?.next_action}`).toContain("queue-015 remains blocked");
  });

  it("does not add file picker, path reader, OCR, indexing, vector, upload, or directory scan capability", () => {
    const runtime = readRuntimeSources();
    const script = readFileSync(scriptPath, "utf8");

    expect(runtime).not.toMatch(/<input[^>]*type=["']file/i);
    expect(runtime).not.toMatch(/\bshowOpenFilePicker\b|\bwebkitdirectory\b|\bFileReader\b/);
    expect(runtime).not.toMatch(/\breadAsText\b|\breadAsArrayBuffer\b/);
    expect(runtime).not.toMatch(/\breadRealDocument\b|\bquarantineRealDocument\b|\brunOcr\b|\bcreateVectorStore\b/);
    expect(runtime).not.toMatch(/\bmulter\b|\buploadHandler\b/i);
    expect(script).not.toMatch(/\breaddirSync\b|\bopendirSync\b|\bglob\b/);
    expect(script).not.toMatch(/\bexistsSync\b|\bstatSync\b/);
  });
});
