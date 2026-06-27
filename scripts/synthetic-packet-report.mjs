#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ts from "typescript";

const phase = "KIA-Stick-v0.7.15-synthetic-packet-report-runner";
const productVersion = "0.7.0";
const promptVersion = "prompt.fake-docs.v0.5-import-wizard-hardening";
const validatorPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../lib/syntheticApprovalPacketValidator.ts");

const allowedFlags = new Set(["--help"]);

function parseArgs(argv) {
  for (const arg of argv) {
    if (allowedFlags.has(arg)) continue;
    throw new Error(`Unexpected argument rejected: ${arg}`);
  }
  return { help: argv.includes("--help") };
}

function loadValidator() {
  const source = readFileSync(validatorPath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "module", output)(module.exports, module);
  return module.exports.validateSyntheticApprovalPacket;
}

function completePacket(overrides = {}) {
  return {
    packetId: "FAKE-REPORT-PACKET-001",
    syntheticOnly: true,
    futureDocumentPlaceholders: ["SYNTH-ONE-DOC-ALPHA"],
    futureGatePlaceholders: ["SYNTH-GATE-METADATA-ONLY"],
    allowedAction: "SYNTH-METADATA-LABEL-CHECK-ONLY",
    blockedActions: ["BLOCK_FILE_INTAKE", "BLOCK_TEXT_DERIVATION", "BLOCK_INDEX_PIPELINE", "BLOCK_QUEUE_CHANGE"],
    rollbackPlan: "SYNTH-ROLLBACK-REMOVE-REPORT-SUMMARY",
    deletionRetentionPlan: "SYNTH-RETENTION-SUMMARY-ONLY",
    reviewerPlaceholder: "SYNTH-REVIEWER-PENDING",
    proofSafeOutputAgreement: true,
    stopOnWarnFailAgreement: true,
    queue015Status: "blocked",
    queue015BlockedConfirmation: true,
    realDocumentAccessed: false,
    safetyChecklistResult: "SYNTH-SAFETY-PENDING",
    redactionPrivacyPolicyResult: "SYNTH-POLICY-PENDING",
    ...overrides,
  };
}

function syntheticFixtures() {
  return [
    {
      id: "fixture-pass-complete",
      expected: "PASS",
      packet: completePacket(),
    },
    {
      id: "fixture-warn-missing-reviewer-retention",
      expected: "WARN",
      packet: completePacket({
        reviewerPlaceholder: undefined,
        deletionRetentionPlan: undefined,
      }),
    },
    {
      id: "fixture-fail-broad-private-recursive",
      expected: "FAIL",
      packet: completePacket({
        allowedAction: "scan everything recursively from a private source path",
      }),
    },
  ];
}

function renderReport(validateSyntheticApprovalPacket) {
  const rows = syntheticFixtures().map((fixture) => {
    const validation = validateSyntheticApprovalPacket(fixture.packet);
    return {
      id: fixture.id,
      expected: fixture.expected,
      actual: validation.status,
      reasonCodes: validation.reasons.map((reason) => reason.code),
      guard: validation.guard,
      realDocumentAccessed: fixture.packet.realDocumentAccessed,
    };
  });
  const passCount = rows.filter((row) => row.actual === "PASS").length;
  const warnCount = rows.filter((row) => row.actual === "WARN").length;
  const failCount = rows.filter((row) => row.actual === "FAIL").length;
  const mismatches = rows.filter((row) => row.expected !== row.actual);
  const reportStatus = mismatches.length === 0 ? "PASS" : "FAIL";

  return [
    "# KIA Stick Synthetic Packet Report",
    "",
    `Phase: ${phase}`,
    `Product version: ${productVersion}`,
    `Prompt version: ${promptVersion}`,
    "Source: built-in synthetic fixtures only",
    "",
    "## Summary",
    "",
    `Report status: ${reportStatus}`,
    `PASS fixtures: ${passCount}`,
    `WARN fixtures: ${warnCount}`,
    `FAIL fixtures: ${failCount}`,
    `queue015Status: blocked`,
    `realDocumentAccessed: false`,
    `readsUserFiles: false`,
    `scansDirectories: false`,
    `acceptsPathArguments: false`,
    `stopOnWarnFail: true`,
    "",
    "## Fixture Results",
    "",
    "| Fixture | Expected | Actual | Reason codes | Guard |",
    "| --- | --- | --- | --- | --- |",
    ...rows.map((row) => {
      const reasonCodes = row.reasonCodes.length > 0 ? row.reasonCodes.join(", ") : "none";
      const guard = [
        `queue015Status=${row.guard.queue015Status}`,
        `readsUserFiles=${row.guard.readsUserFiles}`,
        `scansDirectories=${row.guard.scansDirectories}`,
        `acceptsPathArguments=${row.guard.acceptsPathArguments}`,
        `realDocumentAccessed=${row.realDocumentAccessed}`,
      ].join("; ");
      return `| ${row.id} | ${row.expected} | ${row.actual} | ${reasonCodes} | ${guard} |`;
    }),
    "",
    "## GitHub-Safe Output",
    "",
    "- Fake IDs only.",
    "- PASS/WARN/FAIL labels only.",
    "- Stop on WARN/FAIL before any queue acceptance or closeout.",
    "- Queue IDs and guard booleans only.",
    "- No real document names, private paths, secrets, snippets, uploads, OCR text, embeddings, indexes, or vector data.",
    "",
  ].join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("Usage: npm run packet:report");
    console.log("Runs built-in synthetic fixtures only; no path or file arguments are accepted.");
    return;
  }
  console.log(renderReport(loadValidator()));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
