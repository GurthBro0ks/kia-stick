#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const phase = "KIA-Stick-v0.7.16-synthetic-packet-safety-drift-guard";
export const productVersion = "0.7.0";
export const promptVersion = "prompt.fake-docs.v0.5-import-wizard-hardening";

export const allowlistedFiles = [
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
];

const codeFileSet = new Set(["lib/syntheticApprovalPacketValidator.ts", "scripts/synthetic-packet-report.mjs"]);
const contextScanFileSet = new Set([
  "scripts/synthetic-packet-report.mjs",
  "docs/v0.7.14-synthetic-approval-packet-validator.md",
  "docs/v0.7.15-synthetic-packet-report-runner.md",
  "docs/v0.7.16-synthetic-packet-safety-drift-guard.md",
]);
const expectedReportRunnerLoad = [
  'import { readFileSync } from "node:fs";',
  'import path from "node:path";',
  'const validatorPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../lib/syntheticApprovalPacketValidator.ts");',
  'const source = readFileSync(validatorPath, "utf8");',
];

const failurePatterns = [
  {
    id: "fs_or_path_import",
    label: "fs/path import drift",
    pattern: /\bfrom\s+["']node:(?:fs|fs\/promises|path)["']|\brequire\(["'](?:fs|path)["']\)/,
  },
  {
    id: "file_read_or_existence",
    label: "file read/existence drift",
    pattern: /\b(?:readFileSync|readFile|createReadStream|readdirSync|opendirSync|statSync|existsSync)\b/,
  },
  {
    id: "browser_file_affordance",
    label: "browser file affordance drift",
    pattern: /<input[^>]*type=["']file|showOpenFilePicker|showDirectoryPicker|webkitdirectory|FileReader|readAsText|readAsArrayBuffer|dropzone|dragover|DataTransferItem/i,
  },
  {
    id: "upload_or_processing_capability",
    label: "upload/OCR/index/vector drift",
    pattern: /\b(?:multer|uploadHandler|multipart|busboy|formidable|runOcr|tesseract|ocrWorker|extractText|summarizeDocument|createEmbedding|embedDocuments|createIndex|writeIndex|createVectorStore|new\s+VectorStore|VectorStore\.from)\b/i,
  },
  {
    id: "private_source_access",
    label: "private source access drift",
    pattern: /\/media\/mint\/SHARED\/APWU|kia-stick-private-vault|private-vault|APWU|USPS/i,
  },
];

const contextualTerms =
  /\b(?:upload|OCR|indexing|embedding|vector|file picker|directory picker|FileReader|showOpenFilePicker|input type=file|webkitdirectory|drag\/drop|path reader|queue-?015)\b/i;

const allowedContext =
  /\b(?:no|not|without|never|absent|blocked|forbidden|reject(?:s|ed)?|fail(?:s|ed)?|guard|safe|synthetic-only|does not|must not|prevent|false|pattern|blockedActions|required|unchanged|remains blocked|separate|only|proof-safe|GitHub-safe)\b/i;

function makeCheck(id, status, message) {
  return { id, status, message };
}

function normalizeReportRunnerSource(source) {
  let normalized = source;
  for (const snippet of expectedReportRunnerLoad) {
    normalized = normalized.replace(snippet, "/* accepted fixed validator loader */");
  }
  return normalized;
}

function normalizeValidatorSource(source) {
  return source
    .replace(/\{\s*code:\s*"apwu_marker"[^}]+},/g, "/* accepted blocked source-marker rejection rule */")
    .replace(/\{\s*code:\s*"usps_marker"[^}]+},/g, "/* accepted blocked source-marker rejection rule */");
}

function sourceForPattern(file, source, patternId) {
  if (file === "scripts/synthetic-packet-report.mjs" && ["fs_or_path_import", "file_read_or_existence"].includes(patternId)) {
    return normalizeReportRunnerSource(source);
  }
  if (file === "lib/syntheticApprovalPacketValidator.ts" && patternId === "private_source_access") {
    return normalizeValidatorSource(source);
  }
  return source;
}

function updateNegativeContextSection(line, currentSection) {
  const trimmed = line.trim();
  if (/^##\s+/.test(trimmed) || /^`?(?:PASS|WARN|FAIL)`?\s+example:$/i.test(trimmed) || /^Forbidden\b/i.test(trimmed)) {
    return trimmed.replace(/`/g, "");
  }
  return currentSection;
}

function negativeContextSection(section) {
  return /\b(?:Forbidden|Rejection Rules|Validation Expectations|FAIL example|Future Real-Doc Work Still Requires|Safety Boundary|GitHub-Safe Output Rules)\b/i.test(
    section
  );
}

function checkForbiddenCodePatterns(sources) {
  const failures = [];
  for (const [file, source] of Object.entries(sources)) {
    if (!codeFileSet.has(file)) continue;
    for (const rule of failurePatterns) {
      const scanned = sourceForPattern(file, source, rule.id);
      if (rule.pattern.test(scanned)) failures.push(`${file}: ${rule.label}`);
    }
  }
  return makeCheck(
    "forbidden_code_patterns",
    failures.length === 0 ? "PASS" : "FAIL",
    failures.length === 0 ? "validator/report runner code has no forbidden implementation drift" : failures.join("; ")
  );
}

function checkContextualForbiddenWording(sources) {
  const failures = [];
  for (const [file, source] of Object.entries(sources)) {
    if (!contextScanFileSet.has(file)) continue;
    const lines = source.split(/\r?\n/);
    let section = "";
    lines.forEach((line, index) => {
      section = updateNegativeContextSection(line, section);
      if (!contextualTerms.test(line)) return;
      if (allowedContext.test(line)) return;
      if (negativeContextSection(section)) return;
      failures.push(`${file}:${index + 1}`);
    });
  }
  return makeCheck(
    "forbidden_wording_context",
    failures.length === 0 ? "PASS" : "FAIL",
    failures.length === 0 ? "forbidden capability wording is limited to blocked/negative guard context" : failures.join("; ")
  );
}

function checkReportRunnerContract(sources) {
  const report = sources["scripts/synthetic-packet-report.mjs"] ?? "";
  const required = [
    "allowedFlags = new Set([\"--help\"])",
    "Unexpected argument rejected",
    "built-in synthetic fixtures only",
    "realDocumentAccessed: false",
    "readsUserFiles: false",
    "scansDirectories: false",
    "acceptsPathArguments: false",
    "fixture-pass-complete",
    "fixture-warn-missing-reviewer-retention",
    "fixture-fail-broad-private-recursive",
  ];
  const missing = required.filter((snippet) => !report.includes(snippet));
  return makeCheck(
    "report_runner_contract",
    missing.length === 0 ? "PASS" : "FAIL",
    missing.length === 0 ? "report runner keeps fixed synthetic fixture and guard contract" : `missing: ${missing.join(", ")}`
  );
}

function checkValidatorContract(sources) {
  const validator = sources["lib/syntheticApprovalPacketValidator.ts"] ?? "";
  const required = [
    "acceptsPathArguments: false",
    "readsUserFiles: false",
    "scansDirectories: false",
    "queue_015_not_blocked",
    "real_document_accessed",
    "path_shaped_value",
    "requested_real_doc_capability",
    "queue_015_unblock_implied",
  ];
  const missing = required.filter((snippet) => !validator.includes(snippet));
  return makeCheck(
    "validator_contract",
    missing.length === 0 ? "PASS" : "FAIL",
    missing.length === 0 ? "validator keeps synthetic-only guard fields and reject reasons" : `missing: ${missing.join(", ")}`
  );
}

function checkPackageScript(sources) {
  const packageJson = JSON.parse(sources["package.json"] ?? "{}");
  const script = packageJson.scripts?.["packet:guard"];
  return makeCheck(
    "package_script",
    script === "node scripts/synthetic-packet-safety-guard.mjs" ? "PASS" : "FAIL",
    script === "node scripts/synthetic-packet-safety-guard.mjs" ? "packet:guard script is registered" : "packet:guard script is missing or changed"
  );
}

function checkQueueAndVersionState(sources) {
  const featureList = JSON.parse(sources["feature_list.json"] ?? "{}");
  const queue = JSON.parse(sources["docs/phase-backlog.json"] ?? "{}");
  const q015 = queue.items?.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request");
  const q031 = queue.items?.find((item) => item.id === "queue-031-v0716-synthetic-packet-safety-drift-guard");
  const failures = [];
  if (featureList.release_readiness?.product_version !== productVersion) failures.push("productVersion drift");
  if (featureList.release_readiness?.prompt_version !== promptVersion) failures.push("promptVersion drift");
  if (q015?.status !== "blocked") failures.push("queue-015 is not blocked");
  if (!["needs_review", "ready_to_push", "accepted"].includes(q031?.status)) failures.push("queue-031 missing or invalid");
  return makeCheck(
    "state_contract",
    failures.length === 0 ? "PASS" : "FAIL",
    failures.length === 0 ? "product/prompt versions and queue guards are intact" : failures.join("; ")
  );
}

export function analyzeSyntheticPacketSafety(sources, options = {}) {
  const checks = [
    checkForbiddenCodePatterns(sources),
    checkContextualForbiddenWording(sources),
    checkValidatorContract(sources),
    checkReportRunnerContract(sources),
    checkPackageScript(sources),
    checkQueueAndVersionState(sources),
  ];

  if (options.reportArgumentRejected !== undefined) {
    checks.push(
      makeCheck(
        "report_argument_rejection",
        options.reportArgumentRejected ? "PASS" : "FAIL",
        options.reportArgumentRejected ? "report runner rejects unexpected positional arguments" : "report runner did not reject unexpected positional arguments"
      )
    );
  }

  return {
    status: checks.some((check) => check.status === "FAIL") ? "FAIL" : "PASS",
    checks,
  };
}

export function readAllowlistedSources(root = process.cwd()) {
  return Object.fromEntries(allowlistedFiles.map((file) => [file, readFileSync(new URL(file, pathToFileURL(`${root}/`)), "utf8")]));
}

function checkReportArgumentRejection() {
  const result = spawnSync(process.execPath, ["scripts/synthetic-packet-report.mjs", "/tmp/not-a-packet.json"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  return result.status === 1 && /Unexpected argument rejected/.test(result.stderr) && result.stdout === "";
}

function renderGuardReport(analysis) {
  return [
    "# KIA Stick Synthetic Packet Safety Guard",
    "",
    `Phase: ${phase}`,
    `Product version: ${productVersion}`,
    `Prompt version: ${promptVersion}`,
    "Source: fixed allowlisted repo files only",
    "",
    "## Summary",
    "",
    `Guard status: ${analysis.status}`,
    "queue015Status: blocked",
    "realDocumentAccessed: false",
    "readsUserFiles: false",
    "scansDirectories: false",
    "acceptsPathArguments: false",
    "",
    "## Checks",
    "",
    "| Check | Status | Notes |",
    "| --- | --- | --- |",
    ...analysis.checks.map((check) => `| ${check.id} | ${check.status} | ${check.message} |`),
    "",
    "## GitHub-Safe Output",
    "",
    "- Repo-local file IDs and guard labels only.",
    "- PASS/FAIL labels only.",
    "- Queue IDs and guard booleans only.",
    "- No real document names, private paths, secrets, snippets, uploads, OCR text, embeddings, indexes, or vector data.",
    "",
  ].join("\n");
}

function parseArgs(argv) {
  for (const arg of argv) {
    if (arg === "--help") continue;
    throw new Error(`Unexpected argument rejected: ${arg}`);
  }
  return { help: argv.includes("--help") };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("Usage: npm run packet:guard");
    console.log("Checks fixed allowlisted repo files only; no path or file arguments are accepted.");
    return;
  }

  const analysis = analyzeSyntheticPacketSafety(readAllowlistedSources(), {
    reportArgumentRejected: checkReportArgumentRejection(),
  });
  console.log(renderGuardReport(analysis));
  if (analysis.status !== "PASS") process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
