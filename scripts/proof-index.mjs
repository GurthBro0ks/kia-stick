#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const DEFAULT_PROOF_ROOT = "/tmp";
const PROOF_PREFIX = "proof_kia_stick_";
const DURABILITY_SAFE_ROOTS = ["/tmp", "/home/mint/kia-stick-local-proofs"];

function fieldValue(text, field) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const dashMatch = text.match(new RegExp(`^-\\s*${escaped}:\\s*(.+)$`, "im"));
  if (dashMatch) return dashMatch[1].trim();
  const envMatch = text.match(new RegExp(`^${escaped}=([^\\n]+)$`, "im"));
  if (envMatch) return envMatch[1].trim();
  return "";
}

export function parseProofDirName(proofPath) {
  const base = path.basename(proofPath);
  if (!base.startsWith(PROOF_PREFIX)) return null;
  const rest = base.slice(PROOF_PREFIX.length);
  const match = rest.match(/^(.*)_(\d{8}T\d{6}Z)$/);
  if (!match) return { phaseSlug: rest, timestamp: "", path: proofPath };
  return {
    phaseSlug: match[1],
    timestamp: match[2],
    path: proofPath,
  };
}

export function redactProofText(input) {
  const flags = new Set();
  let text = input;

  function replace(pattern, replacement, flag) {
    text = text.replace(pattern, () => {
      flags.add(flag);
      return replacement;
    });
  }

  replace(/\/media\/mint\/SHARED\/APWU[^\s)`]*/g, "[REDACTED:APWU_PATH]", "apwu_path");
  replace(/(?:~|\/home\/[^/\s]+)\/kia-stick-private-vault[^\s)`]*/g, "[REDACTED:PRIVATE_VAULT]", "private_vault");
  replace(/\bkia-stick-private-vault\b/gi, "[REDACTED:PRIVATE_VAULT]", "private_vault");
  replace(/<input[^>\n]*type=["']file["'][^>\n]*>/gi, "[FLAGGED:FILE_INPUT]", "file_input");
  replace(
    /\b(token|api[_-]?key|secret|password|auth(?:orization)?|cookie)\s*[:=]\s*["']?[A-Za-z0-9._+/\-=]{8,}["']?/gi,
    "[REDACTED:SECRET_LIKE_VALUE]",
    "secret_like"
  );
  replace(/\b(?:ghp|github_pat|sk|xoxb)-[A-Za-z0-9_-]{12,}\b/g, "[REDACTED:SECRET_LIKE_VALUE]", "secret_like");

  return {
    text,
    flags: [...flags].sort(),
  };
}

export function parseResultMarkdown(markdown, proofPath = "") {
  const parsedDir = parseProofDirName(proofPath);
  const result = fieldValue(markdown, "RESULT") || fieldValue(markdown, "QA status") || "unknown";
  const phase = fieldValue(markdown, "Phase") || parsedDir?.phaseSlug || "unknown";
  const commit = fieldValue(markdown, "Commit SHA") || "none";
  const pushed = fieldValue(markdown, "Push performed") || "unknown";
  const proofDir = fieldValue(markdown, "Proof directory") || proofPath;
  const redacted = redactProofText(markdown);

  return {
    phase,
    result,
    timestamp: parsedDir?.timestamp || "",
    commit,
    pushed,
    proofDir,
    redactedText: redacted.text,
    flags: redacted.flags,
  };
}

function readResult(proofPath) {
  const resultPath = path.join(proofPath, "RESULT.md");
  if (!existsSync(resultPath)) return "";
  return readFileSync(resultPath, "utf8");
}

export function discoverProofDirs(root = DEFAULT_PROOF_ROOT) {
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .filter((entry) => entry.startsWith(PROOF_PREFIX))
    .map((entry) => path.join(root, entry))
    .filter((entryPath) => {
      try {
        return statSync(entryPath).isDirectory();
      } catch {
        return false;
      }
    })
    .map((entryPath) => {
      const stat = statSync(entryPath);
      const parsedDir = parseProofDirName(entryPath);
      const markdown = readResult(entryPath);
      const parsed = markdown
        ? parseResultMarkdown(markdown, entryPath)
        : {
            phase: parsedDir?.phaseSlug || "unknown",
            result: "missing_RESULT",
            timestamp: parsedDir?.timestamp || "",
            commit: "none",
            pushed: "unknown",
            proofDir: entryPath,
            redactedText: "",
            flags: [],
          };
      return {
        ...parsed,
        path: entryPath,
        mtimeMs: stat.mtimeMs,
      };
    })
    .sort((a, b) => {
      const timestampCompare = b.timestamp.localeCompare(a.timestamp);
      return timestampCompare || b.mtimeMs - a.mtimeMs;
    });
}

export function selectLatestProof(proofs) {
  return proofs[0] || null;
}

function safeProofPath(proofPath) {
  if (!proofPath || typeof proofPath !== "string") return false;
  const resolved = path.resolve(proofPath);
  const base = path.basename(resolved);
  return base.startsWith(PROOF_PREFIX) && DURABILITY_SAFE_ROOTS.some((root) => {
    const relative = path.relative(path.resolve(root), resolved);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
  });
}

export function assessProofDurability(record = {}) {
  const issues = [];
  const originalProofDir = record.originalProofDir || "";
  const replacementProofDir = record.replacementProofDir || "";
  const originalSafe = safeProofPath(originalProofDir);
  const replacementSafe = safeProofPath(replacementProofDir);
  const originalExists = originalSafe && existsSync(originalProofDir);

  if (!originalSafe) {
    issues.push({
      severity: "WARN",
      code: "original_proof_path_not_repo_safe",
      message: "Original proof path is absent or outside an allowed proof root.",
    });
  }

  if (originalExists) {
    return {
      status: "PASS",
      originalProofDirStatus: "available",
      replacementProofStatus: "not_required",
      issues: [],
    };
  }

  if (!replacementProofDir) {
    issues.push({
      severity: "WARN",
      code: "missing_original_without_replacement",
      message: "Original proof is missing and no replacement proof was recorded.",
    });
  } else if (!replacementSafe) {
    issues.push({
      severity: "FAIL",
      code: "replacement_proof_path_not_repo_safe",
      message: "Replacement proof path is outside an allowed proof root.",
    });
  } else if (!existsSync(replacementProofDir)) {
    issues.push({
      severity: "WARN",
      code: "replacement_proof_missing",
      message: "Replacement proof path was recorded but does not currently exist.",
    });
  }

  const requiredFields = [
    "originalProofDir",
    "replacementProofDir",
    "validationStatus",
    "queueStatus",
    "pushStatus",
    "headEqualsOriginMain",
  ];
  for (const field of requiredFields) {
    if (!record[field]) {
      issues.push({
        severity: "WARN",
        code: `replacement_field_missing_${field}`,
        message: `Replacement proof record is missing ${field}.`,
      });
    }
  }

  if (record.validationStatus && record.validationStatus !== "PASS") {
    issues.push({
      severity: "WARN",
      code: "replacement_validation_not_pass",
      message: `Replacement validation status is ${record.validationStatus}.`,
    });
  }

  const status = issues.some((issue) => issue.severity === "FAIL") ? "FAIL" : issues.length > 0 ? "WARN" : "PASS";

  return {
    status,
    originalProofDirStatus: "missing",
    replacementProofStatus: status === "PASS" ? "recorded_validation_passed" : "incomplete",
    issues,
  };
}

function gitOutput(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) return "";
  return result.stdout.trim();
}

export function acceptanceHelper(proof, root = process.cwd()) {
  const resultPath = path.join(proof.path || proof.proofDir, "RESULT.md");
  const resultMarkdown = existsSync(resultPath) ? readFileSync(resultPath, "utf8") : "";
  const redacted = redactProofText(resultMarkdown);
  const clean = gitOutput(root, ["status", "--short"]) === "";
  const aheadText = gitOutput(root, ["rev-list", "--count", "@{u}..HEAD"]);
  const ahead = Number.parseInt(aheadText, 10) || 0;
  const resultPass = proof.result === "PASS";
  const warnFailFree = !/\b(?:WARN|FAIL)\b/i.test(resultMarkdown.replace(/^- RESULT:\s*PASS$/gim, ""));

  let nextAction = "Review RESULT.md before taking action.";
  if (!resultPass) nextAction = "Do not push. Fix the failing proof result first.";
  else if (!warnFailFree) nextAction = "Do not push. Review WARN/FAIL text in RESULT.md first.";
  else if (!clean) nextAction = "Do not push yet. Commit or discard local changes after review.";
  else if (ahead > 0) nextAction = `Manual push allowed after operator approval: git push origin ${gitOutput(root, ["branch", "--show-current"]) || "HEAD"}`;
  else nextAction = "No push needed: clean worktree and no local commits ahead of upstream.";

  return {
    resultPass,
    clean,
    ahead,
    warnFailFree,
    flags: redacted.flags,
    nextAction,
  };
}

function formatProofRow(proof) {
  const flags = proof.flags.length > 0 ? ` flags=${proof.flags.join(",")}` : "";
  return [
    `phase=${proof.phase}`,
    `result=${proof.result}`,
    `timestamp=${proof.timestamp || "unknown"}`,
    `commit=${proof.commit}`,
    `pushed=${proof.pushed}`,
    `path=${proof.path}`,
  ].join(" | ") + flags;
}

function printList(options) {
  const proofs = discoverProofDirs(options.root).slice(0, options.limit);
  if (proofs.length === 0) {
    console.log("No proof directories found.");
    return 0;
  }
  for (const proof of proofs) console.log(formatProofRow(proof));
  return 0;
}

function printLatest(options) {
  const latest = selectLatestProof(discoverProofDirs(options.root));
  if (!latest) {
    console.log("No proof directories found.");
    return 1;
  }
  const resultPath = path.join(latest.path, "RESULT.md");
  const resultMarkdown = existsSync(resultPath) ? readFileSync(resultPath, "utf8") : "RESULT.md missing\n";
  const redacted = redactProofText(resultMarkdown);
  console.log(`Latest proof: ${latest.path}`);
  console.log("");
  console.log(redacted.text.trimEnd());
  if (redacted.flags.length > 0) console.log(`\nProof summary flags: ${redacted.flags.join(", ")}`);

  const pushCommandPath = path.join(latest.path, "push_command.txt");
  if (existsSync(pushCommandPath)) {
    const command = redactProofText(readFileSync(pushCommandPath, "utf8")).text.trimEnd();
    console.log("\n--- push_command.txt ---");
    console.log(command);
  }

  if (options.acceptance) {
    const acceptance = acceptanceHelper(latest, options.repoRoot);
    console.log("\n--- acceptance helper ---");
    console.log(`result_pass=${acceptance.resultPass}`);
    console.log(`git_clean=${acceptance.clean}`);
    console.log(`git_ahead=${acceptance.ahead}`);
    console.log(`result_warn_fail_free=${acceptance.warnFailFree}`);
    console.log(`next_action=${acceptance.nextAction}`);
    if (acceptance.flags.length > 0) console.log(`flags=${acceptance.flags.join(",")}`);
  }
  return 0;
}

function printAccept(options) {
  const latest = selectLatestProof(discoverProofDirs(options.root));
  if (!latest) {
    console.log("No proof directories found.");
    return 1;
  }
  const acceptance = acceptanceHelper(latest, options.repoRoot);
  console.log(`Proof: ${latest.path}`);
  console.log(`RESULT: ${latest.result}`);
  console.log(`git_clean: ${acceptance.clean}`);
  console.log(`git_ahead: ${acceptance.ahead}`);
  console.log(`result_warn_fail_free: ${acceptance.warnFailFree}`);
  console.log(`next_action: ${acceptance.nextAction}`);
  if (acceptance.flags.length > 0) console.log(`flags: ${acceptance.flags.join(",")}`);
  return acceptance.resultPass && acceptance.clean && acceptance.warnFailFree ? 0 : 1;
}

function parseArgs(argv) {
  const options = {
    command: "list",
    root: DEFAULT_PROOF_ROOT,
    repoRoot: process.cwd(),
    limit: 12,
    acceptance: false,
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
    } else if (value === "--repo-root") {
      options.repoRoot = path.resolve(argv[index + 1] || options.repoRoot);
      index += 1;
    } else if (value === "--limit") {
      options.limit = Number.parseInt(argv[index + 1], 10) || options.limit;
      index += 1;
    } else if (value === "--acceptance" || value === "--accept") {
      options.acceptance = true;
    } else {
      throw new Error(`Unknown proof-index argument: ${value}`);
    }
  }
  return options;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const options = parseArgs(process.argv.slice(2));
    let code = 0;
    if (options.command === "list") code = printList(options);
    else if (options.command === "latest") code = printLatest({ ...options, acceptance: true });
    else if (options.command === "accept") code = printAccept(options);
    else throw new Error(`Unknown proof-index command: ${options.command}`);
    process.exit(code);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
