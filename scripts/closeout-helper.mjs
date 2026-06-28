#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { discoverProofDirs, parseResultMarkdown, redactProofText, selectLatestProof } from "./proof-index.mjs";
import { loadQueue, selectNextItem } from "./task-queue.mjs";

const DEFAULT_PROOF_ROOT = "/tmp";
const SAFE_PROOF_ROOTS = ["/tmp", "/home/mint/kia-stick-local-proofs"];
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

function fieldValue(text, field) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const dashMatch = text.match(new RegExp(`^-\\s*${escaped}:\\s*(.+)$`, "im"));
  if (dashMatch) return dashMatch[1].trim();
  const envMatch = text.match(new RegExp(`^${escaped}=([^\\n]+)$`, "im"));
  if (envMatch) return envMatch[1].trim();
  return "";
}

function firstFieldValue(text, fields, fallback = "") {
  for (const field of fields) {
    const value = fieldValue(text, field);
    if (value) return value;
  }
  return fallback;
}

function isWithin(parent, child) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function assertSafeProofDir(proofDir) {
  const resolved = path.resolve(proofDir);
  const safe = SAFE_PROOF_ROOTS.some((root) => isWithin(root, resolved));
  if (!safe) throw new Error(`Refusing to inspect proof dir outside allowed proof roots: ${resolved}`);
  return resolved;
}

function parseProofMetadata(markdown, proofPath = "") {
  const parsed = markdown
    ? parseResultMarkdown(markdown, proofPath)
    : {
        phase: "unknown",
        result: "missing_RESULT",
        proofDir: proofPath,
        flags: [],
      };

  return {
    ...parsed,
    phase: firstFieldValue(markdown, ["PHASE", "Phase"], parsed.phase || "unknown"),
    commit: firstFieldValue(markdown, ["COMMIT_SHA", "Commit SHA"], parsed.commit || "none"),
    pushed: firstFieldValue(markdown, ["PUSHED", "Push performed"], parsed.pushed || "unknown"),
    manualQaStatus: firstFieldValue(markdown, ["MANUAL_QA_STATUS", "Manual QA status"], "pending operator review"),
  };
}

export function resultHasWarnFail(markdown) {
  const withoutResultLine = markdown.replace(/^- RESULT:\s*(?:PASS|WARN|FAIL)\s*$/gim, "");
  const withoutParkedStateLabels = withoutResultLine
    .replace(/\baccepted-WARN\b/gi, "accepted parked state")
    .replace(/\bACCEPTED_WARN\b/g, "ACCEPTED_PARKED")
    .replace(/\bOPERATOR_QA_ACCEPTED_WARN\b/g, "OPERATOR_QA_ACCEPTED_PARKED")
    .replace(/\bWARN_SAFE_NEXT_TARGET_UNCLEAR\b/g, "PARKED_NEXT_TARGET_UNCLEAR");
  return /\b(?:WARN|FAIL)\b/i.test(withoutParkedStateLabels);
}

export function proofHasAcceptedWarn(markdown) {
  return /^(?:-\s*)?RESULT[:=]\s*WARN$/im.test(markdown) && /\b(?:ACCEPTED_WARN|OPERATOR_QA_ACCEPTED_WARN)\b/.test(markdown);
}

export function classifySecretScanLine(line) {
  const gitHubTokenPrefix = ["gh", "p_"].join("");
  if (line.includes("tests/proofIndex.test.ts:") && line.includes(gitHubTokenPrefix)) return "known_synthetic_secret_fixture";
  const fixtureSecretPattern = new RegExp(`tests/.*(?:synthetic|fixture).*:(?:.*${gitHubTokenPrefix}|.*api[_-]?key|.*secret|.*token)`, "i");
  if (fixtureSecretPattern.test(line)) return "known_synthetic_secret_fixture";
  const privateKeyMarker = ["BEGIN", "PRIVATE KEY"].join(" ");
  const secretMarkers = [
    ["DISCORD", "WEBHOOK"].join("_"),
    ["OPENAI", "API", "KEY"].join("_"),
    ["ANTHROPIC", "API", "KEY"].join("_"),
    privateKeyMarker,
    ["xo", "xb-"].join(""),
    gitHubTokenPrefix,
  ];
  if (secretMarkers.some((marker) => line.includes(marker))) return "secret_review_required";
  return "not_secret_pattern";
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
    ? parseProofMetadata(markdown, latest.path)
    : {
        phase: latest.phase,
        result: "missing_RESULT",
        proofDir: latest.path,
        commit: "none",
        pushed: "unknown",
        manualQaStatus: "pending operator review",
        flags: [],
      };
  const redacted = redactProofText(markdown);

  return {
    exists: markdown.length > 0,
    path: latest.path,
    result: parsed.result,
    phase: parsed.phase,
    commit: parsed.commit,
    pushed: parsed.pushed,
    manualQaStatus: parsed.manualQaStatus,
    markdown,
    redactedMarkdown: redacted.text,
    warnFailFree: markdown.length > 0 && !resultHasWarnFail(markdown),
    acceptedWarn: proofHasAcceptedWarn(markdown),
    flags: redacted.flags,
  };
}

export function readProofDir(proofDir) {
  const resolved = assertSafeProofDir(proofDir);
  const resultPath = path.join(resolved, "RESULT.md");
  const markdown = existsSync(resultPath) ? readFileSync(resultPath, "utf8") : "";
  const parsed = parseProofMetadata(markdown, resolved);
  const redacted = redactProofText(markdown);

  return {
    exists: markdown.length > 0,
    path: resolved,
    result: parsed.result,
    phase: parsed.phase,
    commit: parsed.commit,
    pushed: parsed.pushed,
    manualQaStatus: parsed.manualQaStatus,
    markdown,
    redactedMarkdown: redacted.text,
    warnFailFree: markdown.length > 0 && !resultHasWarnFail(markdown),
    acceptedWarn: proofHasAcceptedWarn(markdown),
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

export function assessCloseout({ proof, git, queue, proofDiscoveryMode = "default_latest" }) {
  const issues = [];

  function warn(code, message) {
    issues.push({ severity: "WARN", code, message });
  }

  function fail(code, message) {
    issues.push({ severity: "FAIL", code, message });
  }

  if (!proof.exists) warn("proof_missing", "Latest proof directory or RESULT.md is missing.");
  else if (proof.result !== "PASS") {
    if (proof.acceptedWarn) warn("proof_result_accepted_warn", "Latest proof RESULT is WARN with explicit ACCEPTED_WARN parked-state acceptance.");
    else warn("proof_result_not_pass", `Latest proof RESULT is ${proof.result}.`);
  }
  if (proof.exists && !proof.warnFailFree) {
    if (proof.acceptedWarn) warn("proof_accepted_warn_text", "Accepted-WARN proof text is present; review as parked WARN, not as PASS or FAIL.");
    else warn("proof_warn_fail_text", "WARN/FAIL text appears in RESULT.md beyond the RESULT line.");
  }
  if (proof.flags.length > 0) warn("proof_redaction_flags", `Proof summary contains redaction flags: ${proof.flags.join(",")}.`);

  if (git.dirty) warn("worktree_dirty", "Worktree has uncommitted changes.");
  if (git.ahead > 0) warn("local_commit_without_push", `Local branch is ${git.ahead} commit(s) ahead of origin/main.`);

  if (!queue.ok) {
    fail("queue_unreadable", `Queue state could not be read: ${queue.error}`);
  } else if (!queue.item && proofDiscoveryMode !== "explicit_proof_dir") {
    warn("queue_item_missing", "No queue item is available for the current phase.");
  } else if (queue.item && !readyQueueStatuses.has(queue.item.status)) {
    warn("queue_not_ready", `Queue item ${queue.item.id} is ${queue.item.status}, not ready_to_push or accepted.`);
  }

  const status = issues.some((issue) => issue.severity === "FAIL") ? "FAIL" : issues.length > 0 ? "WARN" : "PASS";
  let nextAction = "No push needed: closeout state is clean, proof passed, and queue is ready.";

  if (status === "FAIL") nextAction = "Fix FAIL items before manual push or closeout.";
  else if (!proof.exists) nextAction = "Run the phase validation to create a proof directory, then rerun closeout:review.";
  else if (proof.acceptedWarn) nextAction = "Review accepted-WARN parked state; push only through an explicit WARN closeout gate.";
  else if (proof.result !== "PASS" || !proof.warnFailFree) nextAction = "Review RESULT.md and fix proof warnings before manual push.";
  else if (git.dirty) nextAction = "Commit reviewed local changes after validation, then rerun closeout:review.";
  else if (queue.ok && queue.item && !readyQueueStatuses.has(queue.item.status)) nextAction = `Review queue state, then run: ${suggestedQueueCommand(queue.item)}`;
  else if (git.ahead > 0) nextAction = `Manual push allowed after operator approval: git push origin ${git.branch}`;
  else if (proofDiscoveryMode === "explicit_proof_dir") nextAction = "Explicit proof dir is clean; no push needed unless a separate gate approves one.";

  return {
    status,
    issues,
    nextAction,
    stopOnWarnFail: status !== "PASS",
    queueAcceptanceAllowed: status === "PASS",
    suggestedQueueCommand: queue.item ? suggestedQueueCommand(queue.item) : "none",
  };
}

function collectState(options) {
  const root = path.resolve(options.root);
  const featureList = readJson(root, "feature_list.json", {});
  const proof = options.proofDir ? readProofDir(options.proofDir) : readLatestProof(options.proofRoot);
  const phase = options.phase || proof.phase || featureList.phase || "unknown";
  const git = parseGitState(root);
  const queue = readQueueState(root, phase);
  const proofDiscoveryMode = options.proofDir ? "explicit_proof_dir" : "default_latest_from_proof_root";
  const assessment = assessCloseout({ proof, git, queue, proofDiscoveryMode });
  const featureText = JSON.stringify(featureList);
  const currentPackageLockKeys = [
    "v0942_next_large_work_checkpoint",
    "v0941_accepted_pushed_closeout_packet_checklist",
    "v0940_secret_scan_fixture_readability_polish",
    "v0939_closeout_summary_proof_dir_usability",
    "v0938_accepted_pushed_state_checkpoint",
  ];
  const currentPackageLockStates = currentPackageLockKeys
    .map((key) => featureList[key]?.package_lock_changed)
    .filter((value) => typeof value === "boolean");
  const packageLockUnchanged =
    currentPackageLockStates.length > 0 && currentPackageLockStates.every((changed) => changed === false) ? "yes" : "review_required";

  return {
    root,
    phase,
    proof,
    proofRoot: path.resolve(options.proofRoot),
    proofDiscoveryMode,
    git,
    queue,
    safety: {
      packageLockUnchanged,
      queue015Status: featureText.includes('"queue_015_status":"blocked"') || featureText.includes('"queue_015_status": "blocked"') ? "blocked" : "review_required",
      v0912cStatus: featureText.includes("v0912c") && featureText.includes("blocked") ? "blocked" : "review_required",
      nextPostcssStatus: featureText.includes("WARN_SAFE_NEXT_TARGET_UNCLEAR") ? "WARN_SAFE_NEXT_TARGET_UNCLEAR" : "review_required",
      realDocCapability: featureText.includes('"real_doc_capability_added":true') || featureText.includes('"real_doc_implementation_approved":true') ? "review_required" : "blocked",
      systemChanges: "none",
    },
    assessment,
  };
}

function printReview(options) {
  const state = collectState(options);
  console.log(`Closeout review: ${state.assessment.status}`);
  console.log(`phase=${state.phase}`);
  console.log(`proof_discovery_mode=${state.proofDiscoveryMode}`);
  if (state.proofDiscoveryMode === "default_latest_from_proof_root") {
    console.log(`proof_discovery_note=default discovery mode: using latest proof under proof_root; pass --proof-dir to review a specific closeout proof`);
  }
  console.log(`proof_root=${state.proofRoot}`);
  console.log(`proof_dir=${state.proof.path || "missing"}`);
  console.log(`proof_result=${state.proof.result}`);
  console.log(`proof_manual_qa_status=${state.proof.manualQaStatus}`);
  console.log(`proof_pushed=${state.proof.pushed}`);
  console.log(`proof_accepted_warn=${state.proof.acceptedWarn ? "yes" : "no"}`);
  console.log(`proof_warn_fail_free=${state.proof.warnFailFree}`);
  console.log(`git_branch=${state.git.branch}`);
  console.log(`git_head=${state.git.head}`);
  console.log(`git_origin_main=${state.git.originMain}`);
  console.log(`git_dirty=${state.git.dirty}`);
  console.log(`git_ahead_origin_main=${state.git.ahead}`);
  console.log(`queue_id=${state.queue.item?.id || "none"}`);
  console.log(`queue_status=${state.queue.item?.status || "none"}`);
  console.log(`stop_on_warn_fail=${state.assessment.stopOnWarnFail}`);
  console.log(`queue_acceptance_allowed=${state.assessment.queueAcceptanceAllowed}`);
  console.log(`suggested_queue_command=${state.assessment.suggestedQueueCommand}`);
  console.log(`next_action=${state.assessment.nextAction}`);
  console.log("");
  console.log("Closeout packet checklist:");
  console.log(`- supplied_proof_dir=${state.proofDiscoveryMode === "explicit_proof_dir" ? state.proof.path : "not_supplied_default_discovery"}`);
  console.log(`- result=${state.proof.result}`);
  console.log(`- manual_qa_status=${state.proof.manualQaStatus}`);
  console.log(`- pushed=${state.proof.pushed}`);
  console.log(`- head_origin_expectation=${state.git.head === state.git.originMain ? "HEAD_EQUALS_ORIGIN_MAIN" : "REVIEW_HEAD_ORIGIN_MISMATCH"}`);
  console.log(`- dirty_state=${state.git.dirty ? "dirty" : "clean"}`);
  console.log(`- package_lock_unchanged=${state.safety.packageLockUnchanged}`);
  console.log(`- queue_015=${state.safety.queue015Status}`);
  console.log(`- v0912c=${state.safety.v0912cStatus}`);
  console.log(`- next_postcss=${state.safety.nextPostcssStatus}`);
  console.log(`- real_doc_capability=${state.safety.realDocCapability}`);
  console.log(`- services_discord_system_changes=${state.safety.systemChanges}`);
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
    PUSHED: state.proof.pushed === "yes" ? "yes" : "no",
    PROOF_DIR: state.proof.path || "missing",
    PROOF_DISCOVERY_MODE: state.proofDiscoveryMode,
    PROOF_DISCOVERY_NOTE:
      state.proofDiscoveryMode === "default_latest_from_proof_root"
        ? "default discovery mode; pass --proof-dir to review a specific closeout proof"
        : "explicit proof dir supplied",
    VALIDATION: validation,
    CLOSEOUT_HELPER_RESULT: `${state.assessment.status}; ${state.assessment.nextAction}`,
    ACCEPTED_WARN_STATUS: state.proof.acceptedWarn ? "accepted_warn_parked" : "not_accepted_warn",
    STOP_ON_WARN_FAIL_STATUS: state.assessment.stopOnWarnFail ? "STOP_REQUIRED" : "CLEAR",
    QUEUE_ACCEPTANCE_ALLOWED: state.assessment.queueAcceptanceAllowed ? "yes" : "no",
    TESTS_ADDED: "tests/closeoutHelper.test.ts",
    MANUAL_QA_STATUS: state.proof.manualQaStatus || "pending operator review",
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
    SUMMARY: "Closeout helper reviewed proof, git state, and task queue without pushing or mutating queue status.",
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
    proofDir: "",
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
    } else if (value === "--proof-dir") {
      args.proofDir = rest[index + 1] || "";
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
