#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { readCurrentAcceptedPushedState } from "./accepted-state.mjs";

const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const operatorSmokePhase = "KIA-Stick-v0.7.9-fake-only-operator-qa-smoke-pack";
const expectedProjectPhase = "KIA-Stick-v0.9.10-synthetic-governance-hardening-checkpoint";
const productVersion = "0.7.0";
const promptVersion = "prompt.fake-docs.v0.5-import-wizard-hardening";
const smokeSurfaces = [
  "Chat no-answer save blocking",
  "Sources citable/context labels",
  "Saved empty/detail/version metadata",
  "Upload fake metadata buttons only",
  "Import fake state machine",
  "Vault fake governance workflow",
  "Settings version identity",
  "/health local route",
  "/version local route",
  "Mobile narrow layout",
];

function parseArgs(argv) {
  const result = {
    baseUrl: DEFAULT_BASE_URL,
    requireServer: false,
    root: process.cwd(),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base-url" && argv[index + 1]) {
      result.baseUrl = argv[index + 1];
      index += 1;
    } else if (arg === "--require-server") {
      result.requireServer = true;
    } else if (arg === "--root" && argv[index + 1]) {
      result.root = argv[index + 1];
      index += 1;
    } else if (/^https?:\/\//i.test(arg)) {
      result.baseUrl = arg;
    }
  }

  result.root = path.resolve(result.root);
  return result;
}

function localBaseUrl(value) {
  const parsed = new URL(value);
  const host = parsed.hostname.toLowerCase();
  if (!["127.0.0.1", "localhost", "::1"].includes(host)) {
    throw new Error(`Base URL must stay on loopback; received ${value}`);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`Base URL must be http or https; received ${value}`);
  }
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  parsed.search = "";
  parsed.hash = "";
  return parsed;
}

function readText(root, file, problems) {
  const target = path.join(root, file);
  if (!existsSync(target)) {
    problems.push(`Missing ${file}`);
    return "";
  }
  if (!statSync(target).isFile()) {
    problems.push(`${file} is not a file`);
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

function requireContains(problems, label, text, needle) {
  if (!text.includes(needle)) problems.push(`${label} must contain ${needle}`);
}

function constantValue(source, name, problems) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`export\\s+const\\s+${escaped}\\s*=\\s*"([^"]+)"`));
  if (!match) {
    problems.push(`Missing ${name}`);
    return "";
  }
  return match[1];
}

function gitRef(root, ref) {
  const result = spawnSync("git", ["rev-parse", ref], { cwd: root, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "";
}

function checkStaticContracts(root, problems) {
  const doc = readText(root, "docs/v0.7.9-operator-qa-smoke-pack.md", problems);
  const component = readText(root, "components/KiaStickApp.tsx", problems);
  const health = readText(root, "app/health/route.ts", problems);
  const versionPage = readText(root, "app/version/page.tsx", problems);
  const versionSource = readText(root, "lib/version.ts", problems);
  const queue = readJson(root, "docs/phase-backlog.json", problems);
  const featureList = readJson(root, "feature_list.json", problems);
  const packageJson = readJson(root, "package.json", problems);
  const acceptedState = readCurrentAcceptedPushedState(root);

  requireContains(problems, "smoke doc", doc, operatorSmokePhase);
  requireContains(problems, "smoke doc", doc, `Product version: \`${productVersion}\``);
  requireContains(problems, "smoke doc", doc, `Prompt version: \`${promptVersion}\``);
  for (const surface of ["Chat", "Sources", "Saved", "Upload", "Import", "Vault", "Settings", "`/health`", "`/version`", "Mobile / Narrow View"]) {
    requireContains(problems, "smoke doc", doc, surface);
  }
  for (const marker of ["fake-only", "queue-015", "blocked", "operator:smoke", "no chooser opens", "no bytes are read"]) {
    requireContains(problems, "smoke doc", doc, marker);
  }

  for (const marker of [
    "Queue fake sample metadata",
    "Queue fake batch metadata",
    "No Saved record is created for no-answer responses.",
    "No-answer responses stay out of Saved.",
    "Context-only fake sources",
    "Upload fake-only checks",
    "Vault operator QA summary",
    "Import wizard operator QA summary",
    "fake source IDs",
    "metadata and guard flags only",
    "fake metadata rows",
    "promptVersion",
    "provider",
  ]) {
    requireContains(problems, "KiaStickApp", component, marker);
  }

  for (const marker of ["phase", "acceptedCheckpoint", "acceptedCommit", "dataModes", "realDbTouched", "productVersion", "displayVersion", "promptVersion", "provider", "corpusVersion", "indexVersion", "gitSha"]) {
    requireContains(problems, "health route", health, marker);
  }
  for (const marker of ["Display Version", "Product Version", "Build Date", "Git SHA", "Corpus", "Index", "Prompt", "Provider"]) {
    requireContains(problems, "version page", versionPage, marker);
  }

  const actualProductVersion = constantValue(versionSource, "PRODUCT_VERSION", problems);
  const actualPromptVersion = constantValue(versionSource, "PROMPT_VERSION", problems);
  if (actualProductVersion !== productVersion) problems.push(`PRODUCT_VERSION must be ${productVersion}; found ${actualProductVersion || "missing"}`);
  if (actualPromptVersion !== promptVersion) problems.push(`PROMPT_VERSION must be ${promptVersion}; found ${actualPromptVersion || "missing"}`);
  if (!versionSource.includes("currentAcceptedPushedState.accepted_pushed_phase")) problems.push("CURRENT_PHASE must derive from the accepted-state contract");
  if (!acceptedState.accepted_pushed_phase || !acceptedState.accepted_pushed_commit || !acceptedState.checkpoint_label) {
    problems.push("accepted-state contract is missing the current accepted phase, commit, or checkpoint label");
  }
  const head = gitRef(root, "HEAD");
  const originMain = gitRef(root, "origin/main");
  const expectedRecordedHead = acceptedState.checkpoint_kind === "capability"
    ? acceptedState.latest_pushed_closeout_commit ?? acceptedState.repository_recording_commit
    : acceptedState.accepted_pushed_commit;
  if (head && head === originMain && expectedRecordedHead !== head) {
    problems.push("accepted-state contract recording commit must match HEAD when HEAD equals origin/main");
  }
  if (packageJson?.scripts?.["operator:smoke"] !== "node scripts/operator-qa-smoke.mjs") problems.push("package.json must expose operator:smoke");

  const queue015 = queue?.items?.find?.((item) => item.id === "queue-015-v07-first-real-doc-gate-request");
  const queue023 = queue?.items?.find?.((item) => item.id === "queue-023-v079-operator-qa-smoke-pack");
  if (queue015?.status !== "blocked") problems.push(`queue-015 must stay blocked; found ${queue015?.status ?? "missing"}`);
  if (!["ready_to_push", "accepted"].includes(queue023?.status)) {
    problems.push(`queue-023 must be ready_to_push or accepted; found ${queue023?.status ?? "missing"}`);
  }

  if (featureList?.phase !== expectedProjectPhase) problems.push(`feature_list phase must be ${expectedProjectPhase}`);
  if (featureList?.release_readiness?.product_version !== productVersion) problems.push("feature_list product version drifted");
  if (featureList?.release_readiness?.prompt_version !== promptVersion) problems.push("feature_list prompt version drifted");
  if (featureList?.v090_fake_runtime_ux_checkpoint?.queue_015_status !== "blocked") problems.push("v0.9.0 feature state must keep queue-015 blocked");
  if (!["pending_operator_bundle_review", "PASS"].includes(featureList?.v090_fake_runtime_ux_checkpoint?.manual_qa_status)) {
    problems.push("v0.9.0 feature state must be pending bundle operator QA or PASS");
  }
  if (featureList?.v079_operator_qa_smoke_pack?.queue_015_status !== "blocked") problems.push("v0.7.9 feature state must keep queue-015 blocked");
  return acceptedState;
}

async function checkLiveRoutes(baseUrl, requireServer, acceptedState, problems, notes) {
  let healthJson;
  try {
    const healthUrl = new URL("/health", baseUrl);
    const healthResponse = await fetch(healthUrl, { signal: AbortSignal.timeout(1500) });
    if (!healthResponse.ok) throw new Error(`HTTP ${healthResponse.status}`);
    healthJson = await healthResponse.json();
  } catch (error) {
    const message = `local_route_checks=SKIPPED_SERVER_UNAVAILABLE (${error instanceof Error ? error.message : String(error)})`;
    if (requireServer) problems.push(message);
    else notes.push(message);
    return;
  }

  if (healthJson.phase !== acceptedState.accepted_pushed_phase) problems.push(`/health phase mismatch: ${healthJson.phase}`);
  if (healthJson.acceptedCheckpoint !== acceptedState.checkpoint_label) problems.push(`/health accepted checkpoint mismatch: ${healthJson.acceptedCheckpoint}`);
  if (healthJson.acceptedCommit !== acceptedState.accepted_pushed_commit) problems.push(`/health accepted commit mismatch: ${healthJson.acceptedCommit}`);
  if (healthJson.productVersion !== productVersion) problems.push(`/health productVersion mismatch: ${healthJson.productVersion}`);
  if (healthJson.promptVersion !== promptVersion) problems.push(`/health promptVersion mismatch: ${healthJson.promptVersion}`);
  if (healthJson.dataModes?.fake_corpus !== "available") problems.push("/health fake corpus mode must be available");
  if (healthJson.dataModes?.public_sources !== "available_exact_allowlisted") problems.push("/health public-source mode must be exact allowlisted");
  if (healthJson.dataModes?.private_data !== "blocked") problems.push("/health private-data mode must be blocked");
  if (healthJson.dataModes?.external_ai !== "disabled") problems.push("/health external AI mode must be disabled");
  if (healthJson.realDbTouched !== false) problems.push("/health realDbTouched must be false");

  try {
    const versionUrl = new URL("/version", baseUrl);
    const versionResponse = await fetch(versionUrl, { signal: AbortSignal.timeout(1500) });
    if (!versionResponse.ok) throw new Error(`HTTP ${versionResponse.status}`);
    const versionHtml = await versionResponse.text();
    for (const marker of ["Display Version", "Product Version", "Build Date", "Git SHA", "Prompt", "Provider"]) {
      if (!versionHtml.includes(marker)) problems.push(`/version must include ${marker}`);
    }
    notes.push("local_route_checks=PASS");
  } catch (error) {
    problems.push(`/version route check failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function runOperatorQaSmoke(options = {}) {
  const root = path.resolve(options.root ?? process.cwd());
  const baseUrl = localBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
  const problems = [];
  const notes = [];

  const acceptedState = checkStaticContracts(root, problems);
  await checkLiveRoutes(baseUrl, Boolean(options.requireServer), acceptedState, problems, notes);

  return {
    ok: problems.length === 0,
    root,
    baseUrl: baseUrl.toString(),
    problems,
    notes,
  };
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const result = await runOperatorQaSmoke(args);
    if (!result.ok) {
      console.error("Operator QA smoke FAIL");
      console.error(`Root: ${result.root}`);
      console.error(`Base URL: ${result.baseUrl}`);
      for (const problem of result.problems) console.error(`- ${problem}`);
      process.exit(1);
    }

    console.log("Operator QA smoke PASS");
    console.log(`Root: ${result.root}`);
    console.log(`Base URL: ${result.baseUrl}`);
    console.log(`Project phase: ${expectedProjectPhase}`);
    const acceptedState = readCurrentAcceptedPushedState(args.root);
    console.log(`Runtime phase: ${acceptedState.accepted_pushed_phase}`);
    console.log(`Accepted checkpoint: ${acceptedState.checkpoint_label}`);
    console.log(`Product version: ${productVersion}`);
    console.log(`Prompt version: ${promptVersion}`);
    console.log("Bundle smoke surfaces:");
    for (const surface of smokeSurfaces) console.log(`- ${surface}`);
    for (const note of result.notes) console.log(note);
  } catch (error) {
    console.error("Operator QA smoke ERROR");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
