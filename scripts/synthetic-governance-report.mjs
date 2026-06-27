#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ts from "typescript";

const phase = "KIA-Stick-v0.7.18-synthetic-governance-bundle-report";
const productVersion = "0.7.0";
const promptVersion = "prompt.fake-docs.v0.5-import-wizard-hardening";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const validatorPath = path.join(root, "lib/syntheticApprovalPacketValidator.ts");
const fixturesPath = path.join(root, "lib/syntheticPacketFixtures.ts");
const allowedFlags = new Set(["--help"]);

function parseArgs(argv) {
  for (const arg of argv) {
    if (allowedFlags.has(arg)) continue;
    throw new Error(`Unexpected argument rejected: ${arg}`);
  }
  return { help: argv.includes("--help") };
}

function loadCommonJsExports(file) {
  const source = readFileSync(file, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "module", output)(module.exports, module);
  return module.exports;
}

function runFixedScript(file) {
  return spawnSync(process.execPath, [file], {
    cwd: root,
    encoding: "utf8",
  });
}

function summarizeRows(validateSyntheticApprovalPacket, fixtureMatrix) {
  return fixtureMatrix.map((fixture) => {
    const validation = validateSyntheticApprovalPacket(fixture.packet);
    return {
      id: fixture.id,
      expected: fixture.expectedStatus,
      actual: validation.status,
      reasonCodes: validation.reasons.map((reason) => reason.code),
      guard: validation.guard,
      realDocumentAccessed: fixture.packet.realDocumentAccessed,
    };
  });
}

function renderReport() {
  const { validateSyntheticApprovalPacket } = loadCommonJsExports(validatorPath);
  const { syntheticPacketFixtureMatrix } = loadCommonJsExports(fixturesPath);
  const matrixRows = summarizeRows(validateSyntheticApprovalPacket, syntheticPacketFixtureMatrix);
  const packetReport = runFixedScript("scripts/synthetic-packet-report.mjs");
  const packetGuard = runFixedScript("scripts/synthetic-packet-safety-guard.mjs");
  const mismatches = matrixRows.filter((row) => row.expected !== row.actual);
  const passCount = matrixRows.filter((row) => row.actual === "PASS").length;
  const warnCount = matrixRows.filter((row) => row.actual === "WARN").length;
  const failCount = matrixRows.filter((row) => row.actual === "FAIL").length;
  const reportStatus = packetReport.status === 0 && packetGuard.status === 0 && mismatches.length === 0 ? "PASS" : "FAIL";

  return [
    "# KIA Stick Synthetic Governance Report",
    "",
    `Phase: ${phase}`,
    `Product version: ${productVersion}`,
    `Prompt version: ${promptVersion}`,
    "Source: built-in synthetic fixtures and fixed repo-owned metadata only",
    "",
    "## Summary",
    "",
    `Report status: ${reportStatus}`,
    `Packet report status: ${packetReport.status === 0 ? "PASS" : "FAIL"}`,
    `Packet guard status: ${packetGuard.status === 0 ? "PASS" : "FAIL"}`,
    `Fixture matrix status: ${mismatches.length === 0 ? "PASS" : "FAIL"}`,
    `PASS fixtures: ${passCount}`,
    `WARN fixtures: ${warnCount}`,
    `FAIL fixtures: ${failCount}`,
    "queue015Status: blocked",
    "realDocumentAccessed: false",
    "readsUserFiles: false",
    "scansDirectories: false",
    "acceptsPathArguments: false",
    "stopOnWarnFail: true",
    "",
    "## Fixture Matrix",
    "",
    "| Fixture | Expected | Actual | Reason codes | Guard |",
    "| --- | --- | --- | --- | --- |",
    ...matrixRows.map((row) => {
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
    "- Fake fixture IDs only.",
    "- PASS/WARN/FAIL labels only.",
    "- Stop on WARN/FAIL before any queue acceptance or closeout.",
    "- Queue IDs and guard booleans only.",
    "- Product and prompt versions only.",
    "- No real document names, private paths, secrets, snippets, uploads, OCR text, embeddings, indexes, or vector data.",
    "",
  ].join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("Usage: npm run governance:report");
    console.log("Runs fixed synthetic governance checks only; no path or file arguments are accepted.");
    return;
  }

  const report = renderReport();
  console.log(report);
  if (!report.includes("Report status: PASS")) process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
