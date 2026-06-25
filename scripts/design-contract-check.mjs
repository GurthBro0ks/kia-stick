#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export const expectedProductVersion = "0.7.0";
export const expectedPromptVersion = "prompt.fake-docs.v0.5-import-wizard-hardening";

function parseArgs(argv) {
  const rootFlag = argv.indexOf("--root");
  if (rootFlag >= 0 && argv[rootFlag + 1]) return path.resolve(argv[rootFlag + 1]);
  return path.resolve(process.env.KIA_DESIGN_CHECK_ROOT || process.cwd());
}

function readText(root, file, problems) {
  const target = path.join(root, file);
  if (!existsSync(target)) {
    problems.push(`Missing required file: ${file}`);
    return "";
  }
  if (!statSync(target).isFile()) {
    problems.push(`Required path is not a file: ${file}`);
    return "";
  }
  return readFileSync(target, "utf8");
}

function readJson(root, file, problems) {
  const text = readText(root, file, problems);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    problems.push(`Invalid JSON in ${file}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function constantValue(source, name, problems) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`export\\s+const\\s+${escaped}\\s*=\\s*"([^"]+)"`));
  if (!match) {
    problems.push(`Missing export const ${name} in lib/version.ts`);
    return "";
  }
  return match[1];
}

function requireContains(problems, file, text, needle, label = needle) {
  if (!text.includes(needle)) problems.push(`${file} must contain ${label}`);
}

function requireMissing(root, relativePath, problems, label = relativePath) {
  if (existsSync(path.join(root, relativePath))) problems.push(`Forbidden repo-local skill/config path exists: ${label}`);
}

export function runDesignContractCheck(root = process.cwd()) {
  const resolvedRoot = path.resolve(root);
  const problems = [];
  const design = readText(resolvedRoot, "DESIGN.md", problems);
  const agents = readText(resolvedRoot, "AGENTS.md", problems);
  const versionSource = readText(resolvedRoot, "lib/version.ts", problems);
  const queue = readJson(resolvedRoot, "docs/phase-backlog.json", problems);

  requireContains(problems, "DESIGN.md", design, "repo-owned design and UX contract");
  requireContains(problems, "DESIGN.md", design, "project knowledge only");
  requireContains(problems, "DESIGN.md", design, "fake-only");
  requireContains(problems, "DESIGN.md", design, "does not approve real-doc work");
  requireContains(problems, "DESIGN.md", design, "does not authorize implementation");

  for (const forbidden of [
    "file pickers",
    "directory pickers",
    "file inputs",
    "path readers",
    "real uploads",
    "upload handlers",
    "OCR",
    "embeddings",
    "indexing",
    "vector stores",
    "private-vault inspection",
    "APWU access",
  ]) {
    requireContains(problems, "DESIGN.md", design, forbidden);
  }

  for (const surface of ["Chat", "Sources", "Saved", "Upload", "Import", "Vault", "Settings", "`/health`", "`/version`"]) {
    requireContains(problems, "DESIGN.md", design, surface);
  }

  for (const contractArea of [
    "Scan-Density Rules",
    "Safety-Label Language",
    "Proof-Safe Output Expectations",
    "Accessibility And Mobile",
    "No-Answer States",
    "metadata and guard flags only",
    "no file chooser opens",
    "no document bytes read",
  ]) {
    requireContains(problems, "DESIGN.md", design, contractArea);
  }

  requireContains(problems, "AGENTS.md", agents, "For design, UI, UX, layout, copy, scan-density, or interaction work, read `DESIGN.md` first.");
  requireContains(problems, "AGENTS.md", agents, "read `docs/v0.7.3-fake-only-ux-stabilization-plan.md` and `DESIGN.md`");

  const productVersion = constantValue(versionSource, "PRODUCT_VERSION", problems);
  const promptVersion = constantValue(versionSource, "PROMPT_VERSION", problems);
  if (productVersion !== expectedProductVersion) problems.push(`PRODUCT_VERSION must stay ${expectedProductVersion}; found ${productVersion || "missing"}`);
  if (promptVersion !== expectedPromptVersion) problems.push(`PROMPT_VERSION must stay ${expectedPromptVersion}; found ${promptVersion || "missing"}`);

  requireContains(problems, "DESIGN.md", design, "`productVersion`: `0.7.0`");
  requireContains(problems, "DESIGN.md", design, `\`promptVersion\`: \`${expectedPromptVersion}\``);

  const realDocGate = queue?.items?.find?.((item) => item.id === "queue-015-v07-first-real-doc-gate-request");
  if (!realDocGate) problems.push("docs/phase-backlog.json must include queue-015-v07-first-real-doc-gate-request");
  if (realDocGate && realDocGate.status !== "blocked") problems.push(`queue-015-v07-first-real-doc-gate-request must remain blocked; found ${realDocGate.status}`);

  requireMissing(resolvedRoot, ".agents/skills", problems);
  requireMissing(resolvedRoot, ".claude/skills", problems);

  return {
    ok: problems.length === 0,
    problems,
    root: resolvedRoot,
    productVersion,
    promptVersion,
    queue015Status: realDocGate?.status ?? "missing",
  };
}

function main() {
  const root = parseArgs(process.argv.slice(2));
  const result = runDesignContractCheck(root);

  if (!result.ok) {
    console.error("Design contract check FAIL");
    console.error("");
    for (const problem of result.problems) console.error(`- ${problem}`);
    process.exit(1);
  }

  console.log("Design contract check PASS");
  console.log(`Root: ${result.root}`);
  console.log(`Product version: ${result.productVersion}`);
  console.log(`Prompt version: ${result.promptVersion}`);
  console.log(`queue-015 status: ${result.queue015Status}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
