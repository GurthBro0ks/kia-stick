#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const DEFAULT_PHASE = "KIA-Stick-v0.9.18-to-v0.9.22-fake-only-qa-evidence-and-proof-readiness-bundle";
const PRODUCT_VERSION = "0.7.0";
const PROMPT_VERSION = "prompt.fake-docs.v0.5-import-wizard-hardening";
const PROOF_ROOT = "/home/mint/kia-stick-local-proofs";
const NEXT_POSTCSS_STATUS = "WARN_SAFE_NEXT_TARGET_UNCLEAR";

const qaSurfaces = [
  { name: "Chat", check: "No-answer save blocking, cited fake answer save path, context-only fake source trail." },
  { name: "Sources", check: "Fake source IDs, citable/context-only roles, prompt and build identity." },
  { name: "Saved", check: "Dedupe behavior, metadata detail, provider, prompt, product version, citation count." },
  { name: "Upload", check: "Synthetic metadata controls only; no browser document intake." },
  { name: "Vault", check: "Fake governance workflow and metadata-only review state." },
  { name: "Import", check: "Fake state-machine transitions and blocked reasons only." },
  { name: "Settings", check: "Version identity and fake-only provider metadata." },
  { name: "/version", check: "Display, product, build, prompt, provider, corpus, and index identity." },
  { name: "/health", check: "Loopback route can be checked manually; fakeOnly true and realDbTouched false." },
];

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    outDir: "",
    format: "markdown",
    phase: DEFAULT_PHASE,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--root") {
      args.root = argv[index + 1] || args.root;
      index += 1;
    } else if (value === "--out-dir") {
      args.outDir = argv[index + 1] || "";
      index += 1;
    } else if (value === "--format") {
      args.format = argv[index + 1] || args.format;
      index += 1;
    } else if (value === "--phase") {
      args.phase = argv[index + 1] || args.phase;
      index += 1;
    } else {
      throw new Error(`Unknown fake browser QA evidence argument: ${value}`);
    }
  }

  args.root = path.resolve(args.root);
  return args;
}

function isWithin(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function assertSafeOutputDir(outDir) {
  const resolved = path.resolve(outDir);
  const proofRoot = path.resolve(PROOF_ROOT);
  const tempRoot = path.resolve(tmpdir());
  if (isWithin(proofRoot, resolved) || isWithin(tempRoot, resolved)) return resolved;
  throw new Error(`Refusing to write QA evidence outside ${proofRoot} or ${tempRoot}: ${resolved}`);
}

function readJson(root, relativePath) {
  const target = path.join(root, relativePath);
  if (!existsSync(target)) return null;
  return JSON.parse(readFileSync(target, "utf8"));
}

function queueStatus(queue, id) {
  return queue?.items?.find?.((item) => item.id === id)?.status || "missing";
}

function packageLockUnchanged(root) {
  return existsSync(path.join(root, "package-lock.json"));
}

export function buildFakeBrowserQaEvidence(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const phase = options.phase || DEFAULT_PHASE;
  const packageJson = readJson(root, "package.json") || {};
  const featureList = readJson(root, "feature_list.json") || {};
  const queue = readJson(root, "docs/phase-backlog.json") || {};
  const queue015Status = queueStatus(queue, "queue-015-v07-first-real-doc-gate-request");

  return {
    phase,
    targetMachine: "USER_LAPTOP_ONLY",
    targetRepo: root,
    browserAutomationStatus: "manual_checklist_export",
    proofReviewField: "PENDING_OPERATOR_REVIEW",
    manualQaStatus: "PENDING",
    pushedState: "no",
    dirtyState: "operator_must_check_git_status",
    packageLockUnchangedExpected: packageLockUnchanged(root),
    productVersion: packageJson.version || PRODUCT_VERSION,
    expectedProductVersion: PRODUCT_VERSION,
    promptVersion: featureList.release_readiness?.prompt_version || PROMPT_VERSION,
    expectedPromptVersion: PROMPT_VERSION,
    queue015Status,
    nextPostcssStatus: NEXT_POSTCSS_STATUS,
    v0912cStatus: "blocked_pending_exact_operator_approved_next_target",
    realDocCapabilityBlocked: true,
    browserDocumentIntakeBlocked: true,
    proofSafeOutputOnly: true,
    surfaces: qaSurfaces,
    forbiddenCapabilitySummary: [
      "real document access blocked",
      "private source access blocked",
      "browser document intake blocked",
      "OCR blocked",
      "embedding and indexing blocked",
      "vector storage blocked",
      "upload handling blocked",
    ],
  };
}

export function renderMarkdownEvidence(packet) {
  const lines = [
    "# Fake Browser QA Evidence Checklist",
    "",
    `PHASE=${packet.phase}`,
    `TARGET_MACHINE=${packet.targetMachine}`,
    `TARGET_REPO=${packet.targetRepo}`,
    `BROWSER_AUTOMATION_STATUS=${packet.browserAutomationStatus}`,
    `PROOF_PASS_WARN_FAIL_FIELD=${packet.proofReviewField}`,
    `MANUAL_QA_STATUS=${packet.manualQaStatus}`,
    `PUSHED_STATE=${packet.pushedState}`,
    `DIRTY_STATE=${packet.dirtyState}`,
    `PACKAGE_LOCK_UNCHANGED_EXPECTED=${packet.packageLockUnchangedExpected ? "yes" : "no"}`,
    `PRODUCT_VERSION=${packet.productVersion}`,
    `PROMPT_VERSION=${packet.promptVersion}`,
    `QUEUE_015_STATUS=${packet.queue015Status}`,
    `NEXT_POSTCSS_STATUS=${packet.nextPostcssStatus}`,
    `V0912C_STATUS=${packet.v0912cStatus}`,
    `REAL_DOC_CAPABILITY_BLOCKED=${packet.realDocCapabilityBlocked ? "yes" : "no"}`,
    `BROWSER_DOCUMENT_INTAKE_BLOCKED=${packet.browserDocumentIntakeBlocked ? "yes" : "no"}`,
    `PROOF_SAFE_OUTPUT_ONLY=${packet.proofSafeOutputOnly ? "yes" : "no"}`,
    "",
    "## Surfaces",
  ];

  for (const surface of packet.surfaces) lines.push(`- ${surface.name}: ${surface.check}`);
  lines.push("", "## Blocked Capability Summary");
  for (const blocked of packet.forbiddenCapabilitySummary) lines.push(`- ${blocked}`);
  lines.push("", "Operator note: attach screenshots manually only after confirming the checklist stays fake-only and local.");
  return `${lines.join("\n")}\n`;
}

function writeEvidence(outDir, packet) {
  const resolved = assertSafeOutputDir(outDir);
  mkdirSync(resolved, { recursive: true });
  const markdownPath = path.join(resolved, "FAKE_BROWSER_QA_EVIDENCE.md");
  const jsonPath = path.join(resolved, "FAKE_BROWSER_QA_EVIDENCE.json");
  writeFileSync(markdownPath, renderMarkdownEvidence(packet));
  writeFileSync(jsonPath, `${JSON.stringify(packet, null, 2)}\n`);
  return { markdownPath, jsonPath };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!["markdown", "json"].includes(args.format)) throw new Error(`Unsupported format: ${args.format}`);
  const packet = buildFakeBrowserQaEvidence(args);

  if (args.outDir) {
    const written = writeEvidence(args.outDir, packet);
    console.log(`Wrote fake browser QA evidence markdown: ${written.markdownPath}`);
    console.log(`Wrote fake browser QA evidence JSON: ${written.jsonPath}`);
    return;
  }

  if (args.format === "json") console.log(JSON.stringify(packet, null, 2));
  else process.stdout.write(renderMarkdownEvidence(packet));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
