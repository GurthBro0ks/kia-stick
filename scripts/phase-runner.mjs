#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const safeCommitPaths = [
  ".env.example",
  ".gitignore",
  "AGENTS.md",
  "README.md",
  "CLOSEOUT.md",
  "app",
  "components",
  "content/fake-docs",
  "data/fake-corpus.json",
  "docs",
  "eslint.config.mjs",
  "feature_list.json",
  "init.sh",
  "lib",
  "next-env.d.ts",
  "next.config.ts",
  "package-lock.json",
  "package.json",
  "public",
  "scripts",
  "tests",
  "tsconfig.json",
  "vitest.config.ts",
  "claude-progress.md",
];

const validationSteps = [
  { name: "02_release_check", command: "npm", args: ["run", "release:check"] },
  { name: "03_lint", command: "npm", args: ["run", "lint"] },
  { name: "04_typecheck", command: "npm", args: ["run", "typecheck"] },
  { name: "05_test", command: "npm", args: ["run", "test"] },
  { name: "06_build", command: "npm", args: ["run", "build"] },
  { name: "07_scan_fake", command: "npm", args: ["run", "scan:fake"] },
  { name: "08_scan_privacy", command: "npm", args: ["run", "scan:privacy"] },
  { name: "09_qa", command: "npm", args: ["run", "qa"], env: (proofDir, phase) => ({ PROOF_DIR: path.join(proofDir, "qa_gate"), PHASE: phase }) },
  {
    name: "10_manifest_parse",
    shell: "node -e \"JSON.parse(require('fs').readFileSync('public/manifest.webmanifest','utf8')); console.log('manifest ok')\"",
  },
  {
    name: "11_feature_list_parse",
    shell: "node -e \"JSON.parse(require('fs').readFileSync('feature_list.json','utf8')); console.log('feature_list ok')\"",
  },
  {
    name: "12_private_tracked_paths",
    shell: "git ls-files 'DB/**' 'data/real-documents/**' 'exports/**' 'backups/**' 'vector-store/**'",
  },
  {
    name: "13_no_file_input_grep",
    shell: "grep -R \"<input[^>]*type=[\\\"']file\" app components lib tests scripts 2>/dev/null || true",
  },
  {
    name: "14_apwu_boundary_grep",
    shell: "grep -R \"/media/mint/SHARED/APWU\" docs README.md AGENTS.md CLOSEOUT.md claude-progress.md feature_list.json app components lib tests scripts 2>/dev/null || true",
  },
];

export function sanitizePhaseForProof(phase) {
  const sanitized = phase
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^kia_stick_/, "");
  return sanitized || "unknown_phase";
}

export function commitMessageForPhase(phase) {
  return `Record ${phase}`;
}

export function pushCommandForBranch(branch = "HEAD", remote = "origin") {
  return `git push ${remote} ${branch}`;
}

export function renderResultMarkdown(summary) {
  const lines = [
    "# KIA Stick Phase Runner Result",
    "",
    `- RESULT: ${summary.result}`,
    `- Phase: ${summary.phase}`,
    `- Proof directory: ${summary.proofDir}`,
    `- Validation summary: ${summary.validationSummary}`,
    `- Commit status: ${summary.commitStatus}`,
    `- Commit SHA: ${summary.commitSha || "none"}`,
    `- Push performed: no`,
    `- Manual push command: ${summary.pushCommand || "none"}`,
    "",
    "## Changed Files",
    "",
    ...(summary.changedFiles.length > 0 ? summary.changedFiles.map((file) => `- ${file}`) : ["- none"]),
    "",
    "## Step Results",
    "",
    ...summary.steps.map((step) => `- ${step.status === 0 ? "PASS" : "FAIL"} ${step.name} (${step.logFile})`),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function parseArgs(argv) {
  const args = {
    phase: "",
    commit: false,
    root: process.cwd(),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--phase") {
      args.phase = argv[index + 1] || "";
      index += 1;
    } else if (value === "--commit") {
      args.commit = true;
    } else if (value === "--root") {
      args.root = argv[index + 1] || args.root;
      index += 1;
    } else {
      throw new Error(`Unknown phase-runner argument: ${value}`);
    }
  }

  if (!args.phase.trim()) throw new Error("Missing required --phase PHASE_NAME");
  return {
    ...args,
    phase: args.phase.trim(),
    root: path.resolve(args.root),
  };
}

function utcStamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function makeProofDir(phase) {
  const proofRoot = process.env.KIA_PHASE_RUNNER_PROOF_ROOT || "/tmp";
  return path.join(proofRoot, `proof_kia_stick_${sanitizePhaseForProof(phase)}_${utcStamp()}`);
}

function writeCommandLog(logPath, commandLine, result) {
  const stdout = result.stdout?.toString() ?? "";
  const stderr = result.stderr?.toString() ?? "";
  writeFileSync(logPath, [`$ ${commandLine}`, stdout, stderr].filter(Boolean).join("\n"));
}

function runCommand(root, proofDir, name, command, args, env = {}) {
  const logPath = path.join(proofDir, `${name}.log`);
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  writeCommandLog(logPath, [command, ...args].join(" "), result);
  return {
    name,
    status: result.status ?? 1,
    logFile: path.basename(logPath),
  };
}

function runShell(root, proofDir, name, shell) {
  return runCommand(root, proofDir, name, "bash", ["-lc", shell]);
}

function gitOutput(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) return "";
  return result.stdout.trim();
}

function currentBranch(root) {
  return gitOutput(root, ["branch", "--show-current"]) || "HEAD";
}

function aheadCount(root) {
  const result = spawnSync("git", ["rev-list", "--count", "@{u}..HEAD"], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) return 0;
  return Number.parseInt(result.stdout.trim(), 10) || 0;
}

function changedFiles(root) {
  return gitOutput(root, ["status", "--short"])
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^.. /, ""));
}

function stageSafeChanges(root) {
  const existingPaths = safeCommitPaths.filter((entry) => existsSync(path.join(root, entry)));
  if (existingPaths.length === 0) return;
  spawnSync("git", ["add", ...existingPaths], { cwd: root, encoding: "utf8" });
}

function commitIfRequested(root, phase, shouldCommit) {
  if (!shouldCommit) return { status: "not_requested", sha: "" };
  stageSafeChanges(root);
  const staged = spawnSync("git", ["diff", "--cached", "--quiet"], { cwd: root, encoding: "utf8" });
  if (staged.status === 0) return { status: "no_changes", sha: "" };

  const commit = spawnSync("git", ["commit", "-m", commitMessageForPhase(phase)], { cwd: root, encoding: "utf8" });
  if (commit.status !== 0) return { status: `commit_failed: ${commit.stderr || commit.stdout}`.trim(), sha: "" };
  return { status: "committed", sha: gitOutput(root, ["rev-parse", "--short", "HEAD"]) };
}

function runPhase(args) {
  const proofDir = makeProofDir(args.phase);
  mkdirSync(path.join(proofDir, "qa_gate"), { recursive: true });

  const beforeStatus = runCommand(args.root, proofDir, "00_git_status_before", "git", ["status", "--short"]);
  const beforeLog = runCommand(args.root, proofDir, "01_git_log_before", "git", ["log", "-5", "--oneline"]);
  const steps = [beforeStatus, beforeLog];

  for (const step of validationSteps) {
    if (step.shell) {
      steps.push(runShell(args.root, proofDir, step.name, step.shell));
      continue;
    }
    const extraEnv = step.env ? step.env(proofDir, args.phase) : {};
    steps.push(runCommand(args.root, proofDir, step.name, step.command, step.args, extraEnv));
  }

  const validationPassed = steps.every((step) => step.status === 0);
  const changedFilesBeforeCommit = changedFiles(args.root);
  const commit = validationPassed ? commitIfRequested(args.root, args.phase, args.commit) : { status: "skipped_validation_failed", sha: "" };
  steps.push(runCommand(args.root, proofDir, "15_git_status_after", "git", ["status", "--short"]));
  steps.push(runCommand(args.root, proofDir, "16_git_log_after", "git", ["log", "-5", "--oneline"]));
  steps.push(runCommand(args.root, proofDir, "17_diff_stat_after", "git", ["diff", "--stat"]));

  const localCommitExists = commit.status === "committed" || aheadCount(args.root) > 0;
  const pushCommand = validationPassed && localCommitExists ? pushCommandForBranch(currentBranch(args.root)) : "";
  if (pushCommand) writeFileSync(path.join(proofDir, "push_command.txt"), `${pushCommand}\n`);

  const summary = {
    result: validationPassed ? "PASS" : "FAIL",
    phase: args.phase,
    proofDir,
    validationSummary: `${steps.filter((step) => step.status === 0).length}/${steps.length} logged steps passed`,
    commitStatus: commit.status,
    commitSha: commit.sha,
    pushCommand,
    changedFiles: changedFilesBeforeCommit,
    steps,
  };
  writeFileSync(path.join(proofDir, "RESULT.md"), renderResultMarkdown(summary));

  console.log(`RESULT=${summary.result}`);
  console.log(`PHASE=${args.phase}`);
  console.log(`PROOF_DIR=${proofDir}`);
  console.log(`COMMIT_STATUS=${commit.status}`);
  if (commit.sha) console.log(`COMMIT_SHA=${commit.sha}`);
  if (pushCommand) console.log(`NEXT_PUSH_COMMAND=${pushCommand}`);

  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const summary = runPhase(args);
    process.exit(summary.result === "PASS" ? 0 : 1);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
