#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const queueStatuses = ["planned", "running", "needs_review", "ready_to_push", "accepted", "blocked", "parked"];
export const nonActionableQueueStatuses = ["accepted", "blocked", "parked"];
const queuePath = "docs/phase-backlog.json";
const privatePathPatterns = [
  /\/media\/mint\/SHARED\/APWU/i,
  /(?:~|\/home\/[^/\s]+)\/kia-stick-private-vault/i,
  /\bkia-stick-private-vault\b/i,
  /\bdata\/real-documents\b/i,
  /\bexports\//i,
  /\bbackups\//i,
  /\bvector-store\//i,
  /\bDB\//,
];
const secretLikePatterns = [
  /\b(token|api[_-]?key|secret|password|auth(?:orization)?|cookie)\s*[:=]\s*["']?[A-Za-z0-9._+/\-=]{8,}["']?/i,
  /\b(?:ghp|github_pat|sk|xoxb)-[A-Za-z0-9_-]{12,}\b/,
];

function nowIso() {
  return new Date().toISOString();
}

export function assertSafeQueueText(value, label = "value") {
  if (typeof value !== "string") return;
  for (const pattern of privatePathPatterns) {
    if (pattern.test(value)) throw new Error(`Rejected unsafe private path in ${label}`);
  }
  for (const pattern of secretLikePatterns) {
    if (pattern.test(value)) throw new Error(`Rejected secrets-looking value in ${label}`);
  }
}

function assertSafeObject(value, label = "queue") {
  if (typeof value === "string") {
    assertSafeQueueText(value, label);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    assertSafeObject(child, `${label}.${key}`);
  }
}

export function loadQueue(root = process.cwd()) {
  const fullPath = path.join(root, queuePath);
  if (!existsSync(fullPath)) throw new Error(`Missing queue file: ${queuePath}`);
  const queue = JSON.parse(readFileSync(fullPath, "utf8"));
  validateQueue(queue);
  return queue;
}

export function saveQueue(queue, root = process.cwd()) {
  validateQueue(queue);
  writeFileSync(path.join(root, queuePath), `${JSON.stringify(queue, null, 2)}\n`);
}

export function validateQueue(queue) {
  if (queue.schema !== "kia-stick-local-task-queue.v1") throw new Error("Invalid queue schema");
  if (!Array.isArray(queue.items)) throw new Error("Queue items must be an array");
  const ids = new Set();
  for (const item of queue.items) {
    for (const field of ["id", "phase", "title", "status", "model", "risk", "summary", "next_action", "created_at", "updated_at"]) {
      if (typeof item[field] !== "string" || !item[field].trim()) throw new Error(`Queue item missing ${field}`);
    }
    if (ids.has(item.id)) throw new Error(`Duplicate queue id: ${item.id}`);
    ids.add(item.id);
    if (!queueStatuses.includes(item.status)) throw new Error(`Invalid queue status for ${item.id}: ${item.status}`);
    if (!Array.isArray(item.history)) throw new Error(`Queue item missing history: ${item.id}`);
    assertSafeObject(item, `item.${item.id}`);
  }
  return true;
}

export function selectNextItem(queue) {
  return queue.items.find((item) => !nonActionableQueueStatuses.includes(item.status)) ?? null;
}

export function updateQueueItemStatus(queue, id, status, options = {}) {
  if (!queueStatuses.includes(status)) throw new Error(`Invalid queue status: ${status}`);
  const item = queue.items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Unknown queue id: ${id}`);
  const note = options.note || `Status changed to ${status}.`;
  const nextAction = options.nextAction;
  assertSafeQueueText(note, "note");
  if (nextAction !== undefined) assertSafeQueueText(nextAction, "next_action");
  const at = options.at || nowIso();
  const previous = item.status;
  item.status = status;
  item.updated_at = at;
  if (nextAction !== undefined) item.next_action = nextAction;
  item.history = [
    ...(Array.isArray(item.history) ? item.history : []),
    {
      at,
      from: previous,
      to: status,
      note,
    },
  ];
  queue.updated_at = at;
  validateQueue(queue);
  return item;
}

function formatItem(item) {
  return `${item.id} | ${item.status} | ${item.risk} | ${item.phase} | ${item.title}`;
}

export function renderQueueList(queue) {
  return queue.items.map(formatItem).join("\n");
}

export function renderNextItem(item) {
  if (!item) {
    return [
      "No actionable queue items. Blocked and parked items are intentionally skipped.",
      "Accepted, blocked, and parked items are intentionally skipped; this does not approve blocked work.",
      "Safe next choices: continue fake-only proof/report/operator UX polish; repeat official-source research later if evidence changes; request exact Next target approval only if a clean target is proven; keep the real-doc gate blocked unless a separate one-document, one-gate approval packet is explicitly approved.",
    ].join("\n");
  }
  return [
    `id=${item.id}`,
    `phase=${item.phase}`,
    `title=${item.title}`,
    `status=${item.status}`,
    `model=${item.model}`,
    `risk=${item.risk}`,
    `summary=${item.summary}`,
    `next_action=${item.next_action}`,
    "",
    "Codex-ready summary:",
    `${item.phase}: ${item.title}. ${item.summary} Next action: ${item.next_action}`,
  ].join("\n");
}

function parseArgs(argv) {
  const args = {
    command: argv[0] && !argv[0].startsWith("--") ? argv[0] : "list",
    root: process.cwd(),
    id: "",
    status: "",
    note: "",
    nextAction: undefined,
  };
  const rest = args.command === argv[0] ? argv.slice(1) : argv;
  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];
    if (value === "--root") {
      args.root = path.resolve(rest[index + 1] || args.root);
      index += 1;
    } else if (value === "--id") {
      args.id = rest[index + 1] || "";
      index += 1;
    } else if (value === "--status") {
      args.status = rest[index + 1] || "";
      index += 1;
    } else if (value === "--note") {
      args.note = rest[index + 1] || "";
      index += 1;
    } else if (value === "--next-action") {
      args.nextAction = rest[index + 1] || "";
      index += 1;
    } else {
      throw new Error(`Unknown task-queue argument: ${value}`);
    }
  }
  return args;
}

function run(args) {
  const queue = loadQueue(args.root);
  if (args.command === "list") {
    console.log(renderQueueList(queue));
    return 0;
  }
  if (args.command === "next") {
    console.log(renderNextItem(selectNextItem(queue)));
    return 0;
  }
  if (args.command === "set") {
    if (!args.id || !args.status) throw new Error("queue:set requires --id and --status");
    const item = updateQueueItemStatus(queue, args.id, args.status, {
      note: args.note || undefined,
      nextAction: args.nextAction,
    });
    saveQueue(queue, args.root);
    console.log(`updated=${item.id}`);
    console.log(`status=${item.status}`);
    console.log(`next_action=${item.next_action}`);
    return 0;
  }
  throw new Error(`Unknown task-queue command: ${args.command}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.exit(run(parseArgs(process.argv.slice(2))));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
