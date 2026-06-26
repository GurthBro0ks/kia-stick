#!/usr/bin/env node
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export const DEFAULT_LOCAL_PROOF_ROOT = "/home/mint/kia-stick-local-proofs";
const PROOF_PREFIX = "proof_kia_stick_";
const SCREENSHOT_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const SAFE_METADATA_FILES = new Set(["RESULT.md", "OPEN_THIS_FOLDER.txt"]);

function fieldValue(text, field) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const dashMatch = text.match(new RegExp(`^-\\s*${escaped}:\\s*(.+)$`, "im"));
  if (dashMatch) return dashMatch[1].trim();
  const envMatch = text.match(new RegExp(`^${escaped}=([^\\n]+)$`, "im"));
  if (envMatch) return envMatch[1].trim();
  return "";
}

function isWithin(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function assertSafeProofRoot(root) {
  const resolved = path.resolve(root);
  const localRoot = path.resolve(DEFAULT_LOCAL_PROOF_ROOT);
  const tempRoot = path.resolve(tmpdir());
  if (isWithin(localRoot, resolved) || isWithin(tempRoot, resolved)) return resolved;
  throw new Error(`Refusing to inspect proof root outside ${localRoot} or ${tempRoot}: ${resolved}`);
}

export function parseLocalProofDirName(proofPath) {
  const base = path.basename(proofPath);
  if (!base.startsWith(PROOF_PREFIX)) return null;
  const rest = base.slice(PROOF_PREFIX.length);
  const match = rest.match(/^(.*)_(\d{8}T\d{6}Z)$/);
  return {
    phaseSlug: match ? match[1] : rest,
    timestamp: match ? match[2] : "",
    path: proofPath,
  };
}

function readSafeMetadataFile(proofPath, fileName) {
  if (!SAFE_METADATA_FILES.has(fileName)) throw new Error(`Unsupported metadata file: ${fileName}`);
  const target = path.join(proofPath, fileName);
  if (!existsSync(target)) return "";
  const stat = lstatSync(target);
  if (!stat.isFile() || stat.isSymbolicLink()) return "";
  return readFileSync(target, "utf8");
}

function countScreenshots(proofPath) {
  const screenshotsDir = path.join(proofPath, "screenshots");
  if (!existsSync(screenshotsDir)) return 0;
  const stat = lstatSync(screenshotsDir);
  if (!stat.isDirectory() || stat.isSymbolicLink()) return 0;
  return readdirSync(screenshotsDir)
    .filter((entry) => {
      const target = path.join(screenshotsDir, entry);
      try {
        const childStat = lstatSync(target);
        return childStat.isFile() && !childStat.isSymbolicLink() && SCREENSHOT_EXTENSIONS.has(path.extname(entry).toLowerCase());
      } catch {
        return false;
      }
    })
    .length;
}

function parseResult(resultMarkdown) {
  if (!resultMarkdown) return "WARN_MISSING_RESULT";
  return fieldValue(resultMarkdown, "RESULT") || fieldValue(resultMarkdown, "QA status") || "UNKNOWN";
}

export function inspectLocalProof(proofPath) {
  const parsed = parseLocalProofDirName(proofPath);
  const resultMarkdown = readSafeMetadataFile(proofPath, "RESULT.md");
  const openThisFolder = readSafeMetadataFile(proofPath, "OPEN_THIS_FOLDER.txt");
  const stat = statSync(proofPath);
  const result = parseResult(resultMarkdown);
  const warnings = [];
  if (!resultMarkdown) warnings.push("WARN_MISSING_RESULT");

  return {
    path: proofPath,
    name: path.basename(proofPath),
    phaseSlug: parsed?.phaseSlug || "unknown",
    timestamp: parsed?.timestamp || "",
    mtimeMs: stat.mtimeMs,
    result,
    resultMdExists: Boolean(resultMarkdown),
    openThisFolderExists: Boolean(openThisFolder),
    screenshotsCount: countScreenshots(proofPath),
    warnings,
  };
}

export function discoverLocalProofs(root = DEFAULT_LOCAL_PROOF_ROOT) {
  const resolvedRoot = assertSafeProofRoot(root);
  if (!existsSync(resolvedRoot)) return [];
  return readdirSync(resolvedRoot)
    .filter((entry) => entry.startsWith(PROOF_PREFIX))
    .map((entry) => path.join(resolvedRoot, entry))
    .filter((entryPath) => {
      try {
        const stat = lstatSync(entryPath);
        return stat.isDirectory() && !stat.isSymbolicLink();
      } catch {
        return false;
      }
    })
    .map((entryPath) => inspectLocalProof(entryPath))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp) || b.mtimeMs - a.mtimeMs);
}

export function selectLatestLocalProof(proofs) {
  return proofs[0] || null;
}

export function selectLatestReviewReadyProof(proofs) {
  return proofs.find((proof) => proof.result === "PASS" && proof.resultMdExists && proof.openThisFolderExists && proof.screenshotsCount > 0) || null;
}

function formatProofLine(proof) {
  const warnings = proof.warnings.length > 0 ? proof.warnings.join(",") : "none";
  return [
    `timestamp=${proof.timestamp || "unknown"}`,
    `result=${proof.result}`,
    `result_md=${proof.resultMdExists ? "yes" : "no"}`,
    `open_this_folder=${proof.openThisFolderExists ? "yes" : "no"}`,
    `screenshots=${proof.screenshotsCount}`,
    `warnings=${warnings}`,
    `path=${proof.path}`,
  ].join(" | ");
}

export function renderMarkdownIndex(proofs, root) {
  const latest = selectLatestLocalProof(proofs);
  const latestReviewReady = selectLatestReviewReadyProof(proofs);
  const lines = [
    "# KIA Stick Local Proof Index",
    "",
    `Proof root: \`${path.resolve(root)}\``,
    `Generated at: \`${new Date().toISOString()}\``,
    latest ? `Latest proof: \`${latest.path}\`` : "Latest proof: none",
    latestReviewReady ? `Latest review-ready proof: \`${latestReviewReady.path}\`` : "Latest review-ready proof: none",
    "",
    "| Timestamp | Result | RESULT.md | OPEN_THIS_FOLDER.txt | Screenshots | Warnings | Path |",
    "| --- | --- | --- | --- | ---: | --- | --- |",
  ];

  for (const proof of proofs) {
    const warnings = proof.warnings.length > 0 ? proof.warnings.join(", ") : "none";
    lines.push(
      `| ${proof.timestamp || "unknown"} | ${proof.result} | ${proof.resultMdExists ? "yes" : "no"} | ${proof.openThisFolderExists ? "yes" : "no"} | ${proof.screenshotsCount} | ${warnings} | \`${proof.path}\` |`
    );
  }
  lines.push("");
  lines.push("Review rule: missing RESULT.md is WARN and must not be treated as accepted proof.");
  lines.push("Boundary: this index reads only proof directory names plus RESULT.md, OPEN_THIS_FOLDER.txt, and screenshots/ filenames.");
  return `${lines.join("\n")}\n`;
}

export function writeLocalProofIndex(root = DEFAULT_LOCAL_PROOF_ROOT, outDir = root) {
  const resolvedRoot = assertSafeProofRoot(root);
  const resolvedOutDir = assertSafeProofRoot(outDir);
  if (!isWithin(resolvedRoot, resolvedOutDir) && !isWithin(path.resolve(tmpdir()), resolvedOutDir)) {
    throw new Error(`Refusing to write index outside proof root or temp proof dir: ${resolvedOutDir}`);
  }
  mkdirSync(resolvedOutDir, { recursive: true });
  const proofs = discoverLocalProofs(resolvedRoot);
  const markdownPath = path.join(resolvedOutDir, "LOCAL_PROOF_INDEX.md");
  const jsonPath = path.join(resolvedOutDir, "LOCAL_PROOF_INDEX.json");
  writeFileSync(markdownPath, renderMarkdownIndex(proofs, resolvedRoot));
  writeFileSync(
    jsonPath,
    `${JSON.stringify(
      {
        proofRoot: resolvedRoot,
        generatedAt: new Date().toISOString(),
        latestProof: selectLatestLocalProof(proofs)?.path || null,
        latestReviewReadyProof: selectLatestReviewReadyProof(proofs)?.path || null,
        proofs,
      },
      null,
      2
    )}\n`
  );
  return { markdownPath, jsonPath, proofs };
}

function parseArgs(argv) {
  const options = {
    command: "list",
    root: DEFAULT_LOCAL_PROOF_ROOT,
    outDir: "",
    limit: 20,
  };
  if (argv[0] && !argv[0].startsWith("--")) {
    options.command = argv[0];
    argv = argv.slice(1);
  }
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--root") {
      options.root = argv[index + 1] || options.root;
      index += 1;
    } else if (value === "--out-dir") {
      options.outDir = argv[index + 1] || "";
      index += 1;
    } else if (value === "--limit") {
      options.limit = Number.parseInt(argv[index + 1], 10) || options.limit;
      index += 1;
    } else {
      throw new Error(`Unknown local-proof-index argument: ${value}`);
    }
  }
  return options;
}

function printList(options) {
  const proofs = discoverLocalProofs(options.root).slice(0, options.limit);
  console.log(`Local proof root: ${path.resolve(options.root)}`);
  const latest = selectLatestLocalProof(proofs);
  const latestReviewReady = selectLatestReviewReadyProof(proofs);
  console.log(`Latest proof: ${latest?.path || "none"}`);
  console.log(`Latest review-ready proof: ${latestReviewReady?.path || "none"}`);
  for (const proof of proofs) console.log(formatProofLine(proof));
  return proofs.length > 0 ? 0 : 1;
}

function printLatest(options) {
  const proofs = discoverLocalProofs(options.root);
  const latest = selectLatestLocalProof(proofs);
  const latestReviewReady = selectLatestReviewReadyProof(proofs);
  if (!latest) {
    console.log(`No proof directories found under ${path.resolve(options.root)}`);
    return 1;
  }
  console.log(`Latest proof: ${latest.path}`);
  console.log(`Latest review-ready proof: ${latestReviewReady?.path || "none"}`);
  console.log(formatProofLine(latest));
  return 0;
}

function printWrite(options) {
  const output = writeLocalProofIndex(options.root, options.outDir || options.root);
  console.log(`Wrote markdown index: ${output.markdownPath}`);
  console.log(`Wrote JSON index: ${output.jsonPath}`);
  console.log(`Proof count: ${output.proofs.length}`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const options = parseArgs(process.argv.slice(2));
    let code = 0;
    if (options.command === "list") code = printList(options);
    else if (options.command === "latest") code = printLatest(options);
    else if (options.command === "write") code = printWrite(options);
    else throw new Error(`Unknown local-proof-index command: ${options.command}`);
    process.exit(code);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
