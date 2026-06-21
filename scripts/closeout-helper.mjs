#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { discoverProofDirs, parseResultMarkdown, redactProofText, selectLatestProof } from "./proof-index.mjs";
import { loadQueue, selectNextItem } from "./task-queue.mjs";

const DEFAULT_PROOF_ROOT = "/tmp";
const readyQueueStatuses = new Set(["ready_to_push", "accepted"]);

function readJson(root, relativePath, fallback = {}) {
  const fullPath = path.join(root, relativePath);
  if (!existsSync(fullPath)) return fallback;
  return JSON.parse(readFileSync(fullPath, "utf8"));
}

function gitOutput(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) return "";
  return result.stdout.trim();
}

function gitCount(root, range) {
  const output = gitOutput(root, ["rev-list", "--count", range]);
  return Number.parseInt(output, 10) || 0;
}

export function resultHasWarnFail(markdown) {
  const withoutResultLine = markdown.replace(/^- RESULT:\s*(?:PASS|WARN|FAIL)\s*$/gim, "");
  return /\b(?:WARN|FAIL)\b/i.test(withoutResultLine);
}

export function parseGitState(root = process.cwd()) {
  const statusShort = gitOutput(root, ["status", "--short"]);
  const branch = gitOutput(root, ["branch", "--show-current"]) || "HEAD";
  const head = gitOutput(root, ["rev-parse", "--short", "HEAD"]) || "unknown";
  const originMain = gitOutput(root, ["rev-parse", "--short", "origin/main"]) || "unknown";
  const upstream = gitOutput(root, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
  const compareRef = originMain !== "unknown" ? "origin/main" : upstream;
  const ahead = compareRef ? gitCount(root, `${compareRef}..HEAD`) : 0;

  return {
    branch,
    head,
    originMain,
    statusShort,
    dirty: statusShort.length > 0,
    ahead,
  };
}

export function readLatestProof(proofRoot = DEFAULT_PROOF_ROOT) {
  const latest = selectLatestProof(discoverProofDirs(proofRoot));
  if (!latest) {
    return {
      exists: false,
      path: "",
      result: "missing",
      phase: "unknown",
      markdown: "",
      warnFailFree: false,
      flags: [],
    };
  }

  const resultPath = path.join(latest.path, "RESULT.md");
  const markdown = existsSync(resultPath) ? readFileSync(resultPath, "utf8") : "";
  const parsed = markdown
    ? parseResultMarkdown(markdown, latest.path)
    : {
        phase: latest.phase,
        result: "missing_RESULT",
        proofDir: latest.path,
        flags: [],
      };
  const redacted = redactProofText(markdown);

  return {
    exists: markdown.length > 0,
    path: latest.path,
    result: parsed.result,
    phase: parsed.phase,
    markdown,
    redactedMarkdown: redacted.text,
    warnFailFree: markdown.length > 0 && !resultHasWarnFail(markdown),
    flags: redacted.flags,
  };
}

export function readQueueState(root = process.cwd(), phase = "") {
  try {
    const queue = loadQueue(root);
    const item = queue.items.find((candidate) => candidate.phase === phase) || selectNextItem(queue);
    return {
      ok: true,
      item,
      selectedBy: item?.phase === phase ? "phase" : "next",
      error: "",
    };
  } catch (error) {
    return {
      ok: false,
      item: null,
      selectedBy: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function suggestedQueueCommand(item, status = "ready_to_push") {
  if (!item) return "none";
  return `npm run queue:set -- --id ${item.id} --status ${status} --note "Closeout proof reviewed; ready for manual operator decision."`;
}

export function assessCloseout({ proof, git, queue }) {
  const issues = [];

  function warn(code, message) {
    issues.push({ severity: "WARN", code, message });
  }

  function fail(code, message) {
    issues.push({ severity: "FAIL", code, message });
  }

  if (!proof.exists) warn("proof_missing", "Latest proof directory or RESULT.md is missing.");
  else if (proof.result !== "PASS") warn("proof_result_not_pass", `Latest proof RESULT is ${proof.result}.`);
  if (proof.exists && !proof.warnFailFree) warn("proof_warn_fail_text", "WARN/FAIL text appears in RESULT.md beyond the RESULT line.");
  if (proof.flags.length > 0) warn("proof_redaction_flags", `Proof summary contains redaction flags: ${proof.flags.join(",")}.`);

  if (git.dirty) warn("worktree_dirty", "Worktree has uncommitted changes.");
  if (git.ahead > 0) warn("local_commit_without_push", `Local branch is ${git.ahead} commit(s) ahead of origin/main.`);

  if (!queue.ok) {
    fail("queue_unreadable", `Queue state could not be read: ${queue.error}`);
  } else if (!queue.item) {
    warn("queue_item_missing", "No queue item is available for the current phase.");
  } else if (!readyQueueStatuses.has(queue.item.status)) {
    warn("queue_not_ready", `Queue item ${queue.item.id} is ${queue.item.status}, not ready_to_push or accepted.`);
  }

  const status = issues.some((issue) => issue.severity === "FAIL") ? "FAIL" : issues.length > 0 ? "WARN" : "PASS";
  let nextAction = "No push needed: closeout state is clean, proof passed, and queue is ready.";

  if (status === "FAIL") nextAction = "Fix FAIL items before manual push or closeout.";
  else if (!proof.exists) nextAction = "Run the phase validation to create a proof directory, then rerun closeout:review.";
  else if (proof.result !== "PASS" || !proof.warnFailFree) nextAction = "Review RESULT.md and fix proof warnings before manual push.";
  else if (git.dirty) nextAction = "Commit reviewed local changes after validation, then rerun closeout:review.";
  else if (queue.ok && queue.item && !readyQueueStatuses.has(queue.item.status)) nextAction = `Review queue state, then run: ${suggestedQueueCommand(queue.item)}`;
  else if (git.ahead > 0) nextAction = `Manual push allowed after operator approval: git push origin ${git.branch}`;

  return {
    status,
    issues,
    nextAction,
    suggestedQueueCommand: queue.item ? suggestedQueueCommand(queue.item) : "none",
  };
}

function collectState(options) {
  const root = path.resolve(options.root);
  const featureList = readJson(root, "feature_list.json", {});
  const phase = options.phase || featureList.phase || "unknown";
  const proof = readLatestProof(options.proofRoot);
  const git = parseGitState(root);
  const queue = readQueueState(root, phase);
  const assessment = assessCloseout({ proof, git, queue });
  return {
    root,
    phase,
    proof,
    git,
    queue,
    assessment,
  };
}

function printReview(options) {
  const state = collectState(options);
  console.log(`Closeout review: ${state.assessment.status}`);
  console.log(`phase=${state.phase}`);
  console.log(`proof_dir=${state.proof.path || "missing"}`);
  console.log(`proof_result=${state.proof.result}`);
  console.log(`proof_warn_fail_free=${state.proof.warnFailFree}`);
  console.log(`git_branch=${state.git.branch}`);
  console.log(`git_head=${state.git.head}`);
  console.log(`git_origin_main=${state.git.originMain}`);
  console.log(`git_dirty=${state.git.dirty}`);
  console.log(`git_ahead_origin_main=${state.git.ahead}`);
  console.log(`queue_id=${state.queue.item?.id || "none"}`);
  console.log(`queue_status=${state.queue.item?.status || "none"}`);
  console.log(`suggested_queue_command=${state.assessment.suggestedQueueCommand}`);
  console.log(`next_action=${state.assessment.nextAction}`);
  if (state.assessment.issues.length > 0) {
    console.log("");
    console.log("Issues:");
    for (const issue of state.assessment.issues) console.log(`- ${issue.severity} ${issue.code}: ${issue.message}`);
  }
  if (state.proof.flags.length > 0) console.log(`flags=${state.proof.flags.join(",")}`);
  return state.assessment.status === "FAIL" ? 1 : 0;
}

function printSummary(options) {
  const state = collectState(options);
  const changedFiles = state.git.statusShort
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^.. /, ""))
    .join(",");
  const validation = state.assessment.status === "PASS" ? "PASS" : `${state.assessment.status}; ${state.assessment.nextAction}`;

  const fields = {
    PHASE: state.phase,
    RESULT: state.assessment.status === "PASS" ? "PASS" : "REVIEW_REQUIRED",
    TARGET_MACHINE: "USER_LAPTOP_ONLY",
    TARGET_REPO: state.root,
    MODEL_RECOMMENDATION: "GPT/Codex $100",
    MODEL_SAME_AS_PREVIOUS: "Same",
    GLM_THINKING_LEVEL: "medium optional review",
    DIRTY_STATE_FOUND: state.git.dirty ? "yes" : "no",
    UNRELATED_DIRTY_FILES: state.git.dirty ? changedFiles || "manual_review_required" : "none",
    CHANGED_FILES: changedFiles || "none",
    COMMIT_SHA: state.git.head,
    PUSHED: "no",
    PROOF_DIR: state.proof.path || "missing",
    VALIDATION: validation,
    CLOSEOUT_HELPER_RESULT: `${state.assessment.status}; ${state.assessment.nextAction}`,
    TESTS_ADDED: "tests/closeoutHelper.test.ts",
    MANUAL_QA_STATUS: "pending operator review",
    DISCORD_SENT: "no",
    NOTIFY_MODE: "disabled",
    DEDUPE_RESULT: "not_checked",
    REPORT_URL: "none",
    SERVICES_RESTARTED: "no",
    CRON_CHANGED: "no",
    TIMER_CHANGED: "no",
    TMUX_CHANGED: "no",
    CADDY_CHANGED: "no",
    DNS_CHANGED: "no",
    SECRETS_PRINTED: "no",
    SUMMARY: "Closeout helper reviewed latest proof, git state, and task queue without pushing or mutating queue status.",
    NEXT_STEP: state.assessment.nextAction,
  };

  for (const [key, value] of Object.entries(fields)) console.log(`${key}=${value}`);
  return state.assessment.status === "FAIL" ? 1 : 0;
}

function parseArgs(argv) {
  const args = {
    command: argv[0] && !argv[0].startsWith("--") ? argv[0] : "review",
    root: process.cwd(),
    proofRoot: DEFAULT_PROOF_ROOT,
    phase: "",
  };
  const rest = args.command === argv[0] ? argv.slice(1) : argv;
  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];
    if (value === "--root") {
      args.root = rest[index + 1] || args.root;
      index += 1;
    } else if (value === "--proof-root") {
      args.proofRoot = rest[index + 1] || args.proofRoot;
      index += 1;
    } else if (value === "--phase") {
      args.phase = rest[index + 1] || "";
      index += 1;
    } else {
      throw new Error(`Unknown closeout-helper argument: ${value}`);
    }
  }
  return args;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const args = parseArgs(process.argv.slice(2));
    let code = 0;
    if (args.command === "review") code = printReview(args);
    else if (args.command === "summary") code = printSummary(args);
    else throw new Error(`Unknown closeout-helper command: ${args.command}`);
    process.exit(code);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
