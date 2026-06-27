import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.7.16-synthetic-packet-safety-drift-guard";
const currentPhase = "KIA-Stick-v0.9.0-fake-runtime-ux-checkpoint";
const reportPhase = "KIA-Stick-v0.7.15-synthetic-packet-report-runner";
const docPath = "docs/v0.7.16-synthetic-packet-safety-drift-guard.md";
const scriptPath = "scripts/synthetic-packet-safety-guard.mjs";
const productVersion = "0.7.0";
const promptVersion = "prompt.fake-docs.v0.5-import-wizard-hardening";

interface GuardModule {
  allowlistedFiles: string[];
  analyzeSyntheticPacketSafety(
    sources: Record<string, string>,
    options?: { reportArgumentRejected?: boolean }
  ): {
    status: "PASS" | "FAIL";
    checks: Array<{ id: string; status: "PASS" | "FAIL"; message: string }>;
  };
  readAllowlistedSources(root?: string): Record<string, string>;
}

async function loadGuard(): Promise<GuardModule> {
  return (await import(pathToFileURL(`${process.cwd()}/${scriptPath}`).href)) as GuardModule;
}

function runGuard(args: string[] = []) {
  return spawnSync("node", [scriptPath, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

function mutateSources(sources: Record<string, string>, file: string, suffix: string): Record<string, string> {
  return {
    ...sources,
    [file]: `${sources[file] ?? ""}\n${suffix}\n`,
  };
}

describe("v0.7.16 synthetic packet safety drift guard", () => {
  it("documents the synthetic-only fixed-allowlist guard", () => {
    expect(existsSync(docPath)).toBe(true);
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain(phase);
    expect(doc).toContain(`Product version: \`${productVersion}\``);
    expect(doc).toContain(`Prompt version: \`${promptVersion}\``);
    expect(doc).toContain("fixed allowlist of repo-owned files only");
    expect(doc).toContain("does not accept path arguments");
    expect(doc).toContain("does not read user-provided files");
    expect(doc).toContain("does not scan directories");
    expect(doc).toContain("queue-015-v07-first-real-doc-gate-request` remains blocked");
    expect(doc).toContain("queue-031-v0716-synthetic-packet-safety-drift-guard");
  });

  it("passes against the current synthetic validator and report runner sources", async () => {
    const guard = await loadGuard();
    const sources = guard.readAllowlistedSources();
    const analysis = guard.analyzeSyntheticPacketSafety(sources, { reportArgumentRejected: true });

    expect(guard.allowlistedFiles).toEqual([
      "lib/syntheticApprovalPacketValidator.ts",
      "scripts/synthetic-packet-report.mjs",
      "tests/syntheticApprovalPacketValidator.test.ts",
      "tests/syntheticPacketReportRunner.test.ts",
      "docs/v0.7.14-synthetic-approval-packet-validator.md",
      "docs/v0.7.15-synthetic-packet-report-runner.md",
      "docs/v0.7.16-synthetic-packet-safety-drift-guard.md",
      "docs/phase-backlog.json",
      "feature_list.json",
      "package.json",
    ]);
    expect(analysis.status).toBe("PASS");
    expect(analysis.checks.every((check) => check.status === "PASS")).toBe(true);
  });

  it("prints a GitHub-safe PASS report from the npm guard helper", () => {
    const result = runGuard();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("# KIA Stick Synthetic Packet Safety Guard");
    expect(result.stdout).toContain(`Phase: ${phase}`);
    expect(result.stdout).toContain(`Product version: ${productVersion}`);
    expect(result.stdout).toContain(`Prompt version: ${promptVersion}`);
    expect(result.stdout).toContain("Guard status: PASS");
    expect(result.stdout).toContain("queue015Status: blocked");
    expect(result.stdout).toContain("realDocumentAccessed: false");
    expect(result.stdout).toContain("readsUserFiles: false");
    expect(result.stdout).toContain("scansDirectories: false");
    expect(result.stdout).toContain("acceptsPathArguments: false");
    expect(result.stdout).not.toMatch(/\/home\/mint|\/media|\/mnt|APWU|USPS|private-vault|real-documents/i);
  });

  it("rejects unexpected positional path arguments instead of reading alternate sources", () => {
    const result = runGuard(["/tmp/not-a-source.json"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Unexpected argument rejected");
    expect(result.stderr).toContain("/tmp/not-a-source.json");
    expect(result.stdout).toBe("");
  });

  it("fails fixture drift toward fs/path imports or real file reads", async () => {
    const guard = await loadGuard();
    const sources = guard.readAllowlistedSources();
    const importedFs = mutateSources(sources, "lib/syntheticApprovalPacketValidator.ts", 'import { readFileSync } from "node:fs";');
    const reader = mutateSources(sources, "lib/syntheticApprovalPacketValidator.ts", 'const unsafe = readFileSync("/tmp/packet.json", "utf8");');
    const statCheck = mutateSources(sources, "lib/syntheticApprovalPacketValidator.ts", "if (existsSync(candidate)) statSync(candidate);");

    expect(guard.analyzeSyntheticPacketSafety(importedFs, { reportArgumentRejected: true }).status).toBe("FAIL");
    expect(guard.analyzeSyntheticPacketSafety(reader, { reportArgumentRejected: true }).status).toBe("FAIL");
    expect(guard.analyzeSyntheticPacketSafety(statCheck, { reportArgumentRejected: true }).status).toBe("FAIL");
  });

  it("fails fixture drift toward file picker, upload, OCR, indexing, and vector capabilities", async () => {
    const guard = await loadGuard();
    const sources = guard.readAllowlistedSources();
    const picker = mutateSources(sources, "scripts/synthetic-packet-report.mjs", "const picker = await showOpenFilePicker();");
    const processing = mutateSources(
      sources,
      "scripts/synthetic-packet-report.mjs",
      "const uploadHandler = () => runOcr(createVectorStore(createIndex(extractText(source))));"
    );

    expect(guard.analyzeSyntheticPacketSafety(picker, { reportArgumentRejected: true }).status).toBe("FAIL");
    expect(guard.analyzeSyntheticPacketSafety(processing, { reportArgumentRejected: true }).status).toBe("FAIL");
  });

  it("fails fixture drift toward queue-015 unblock language", async () => {
    const guard = await loadGuard();
    const sources = guard.readAllowlistedSources();
    const unblocked = mutateSources(
      sources,
      "docs/v0.7.15-synthetic-packet-report-runner.md",
      "queue-015 is ready to proceed after report generation."
    );
    const analysis = guard.analyzeSyntheticPacketSafety(unblocked, { reportArgumentRejected: true });

    expect(analysis.status).toBe("FAIL");
    expect(analysis.checks.find((check) => check.id === "forbidden_wording_context")?.status).toBe("FAIL");
  });

  it("tracks package, version, and queue state without changing accepted report-runner state", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string>; version: string };
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      phase: string;
      release_readiness: {
        phase: string;
        status: string;
        package_version: string;
        product_version: string;
        prompt_version: string;
      };
      v0716_synthetic_packet_safety_drift_guard: {
        phase: string;
        status: string;
        product_version: string;
        package_version: string;
        prompt_version: string;
        queue_015_status: string;
        queue_030_status: string;
        queue_031_status: string;
        real_document_access: boolean;
        reads_user_files: boolean;
        accepts_path_arguments: boolean;
        scans_directories: boolean;
        upload_handler_added: boolean;
        ocr_added: boolean;
        indexing_added: boolean;
        vector_store_added: boolean;
        push_performed: boolean;
      };
    };
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; phase: string; status: string; summary: string; next_action: string }>;
    };
    const q015 = queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request");
    const q030 = queue.items.find((item) => item.id === "queue-030-v0715-synthetic-packet-report-runner");
    const q031 = queue.items.find((item) => item.id === "queue-031-v0716-synthetic-packet-safety-drift-guard");

    expect(packageJson.scripts["packet:report"]).toBe("node scripts/synthetic-packet-report.mjs");
    expect(packageJson.scripts["packet:guard"]).toBe("node scripts/synthetic-packet-safety-guard.mjs");
    expect(packageJson.version).toBe(productVersion);
    expect(featureList.phase).toBe(currentPhase);
    expect(featureList.release_readiness.phase).toBe(currentPhase);
    expect(featureList.release_readiness.status).toBe("v086_v090_fake_runtime_ux_bundle_operator_qa_passed_ready_to_push");
    expect(featureList.release_readiness.package_version).toBe(productVersion);
    expect(featureList.release_readiness.product_version).toBe(productVersion);
    expect(featureList.release_readiness.prompt_version).toBe(promptVersion);
    expect(featureList.v0716_synthetic_packet_safety_drift_guard.phase).toBe(phase);
    expect(featureList.v0716_synthetic_packet_safety_drift_guard.status).toBe("accepted_after_closeout_push");
    expect(featureList.v0716_synthetic_packet_safety_drift_guard.product_version).toBe(productVersion);
    expect(featureList.v0716_synthetic_packet_safety_drift_guard.package_version).toBe(productVersion);
    expect(featureList.v0716_synthetic_packet_safety_drift_guard.prompt_version).toBe(promptVersion);
    expect(featureList.v0716_synthetic_packet_safety_drift_guard.queue_015_status).toBe("blocked");
    expect(featureList.v0716_synthetic_packet_safety_drift_guard.queue_030_status).toBe("accepted");
    expect(featureList.v0716_synthetic_packet_safety_drift_guard.queue_031_status).toBe("accepted");
    expect(featureList.v0716_synthetic_packet_safety_drift_guard.real_document_access).toBe(false);
    expect(featureList.v0716_synthetic_packet_safety_drift_guard.reads_user_files).toBe(false);
    expect(featureList.v0716_synthetic_packet_safety_drift_guard.accepts_path_arguments).toBe(false);
    expect(featureList.v0716_synthetic_packet_safety_drift_guard.scans_directories).toBe(false);
    expect(featureList.v0716_synthetic_packet_safety_drift_guard.upload_handler_added).toBe(false);
    expect(featureList.v0716_synthetic_packet_safety_drift_guard.ocr_added).toBe(false);
    expect(featureList.v0716_synthetic_packet_safety_drift_guard.indexing_added).toBe(false);
    expect(featureList.v0716_synthetic_packet_safety_drift_guard.vector_store_added).toBe(false);
    expect(featureList.v0716_synthetic_packet_safety_drift_guard.push_performed).toBe(true);
    expect(q015?.status).toBe("blocked");
    expect(q030?.phase).toBe(reportPhase);
    expect(q030?.status).toBe("accepted");
    expect(q031?.phase).toBe(phase);
    expect(q031?.status).toBe("accepted");
    expect(`${q031?.summary}\n${q031?.next_action}`).toContain("fixed allowlist");
    expect(`${q031?.summary}\n${q031?.next_action}`).toContain("queue-015 remains blocked");
  });
});
