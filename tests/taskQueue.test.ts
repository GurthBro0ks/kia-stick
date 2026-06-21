import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const scriptPath = resolve("scripts/task-queue.mjs");

interface TaskQueueModule {
  loadQueue(root?: string): {
    schema: string;
    updated_at?: string;
    items: Array<{
      id: string;
      phase: string;
      title: string;
      status: string;
      summary: string;
      next_action: string;
      history: unknown[];
    }>;
  };
  selectNextItem(queue: { items: Array<{ id: string; status: string }> }): { id: string } | null;
  updateQueueItemStatus(
    queue: { updated_at?: string; items: Array<Record<string, unknown>> },
    id: string,
    status: string,
    options?: { note?: string; nextAction?: string; at?: string }
  ): Record<string, unknown>;
  assertSafeQueueText(value: string, label?: string): void;
  validateQueue(queue: unknown): boolean;
}

async function loadModule(): Promise<TaskQueueModule> {
  return (await import(pathToFileURL(scriptPath).href)) as TaskQueueModule;
}

function fixtureRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "kia-task-queue-"));
  mkdirSync(join(root, "docs"), { recursive: true });
  cpSync(resolve("docs/phase-backlog.json"), join(root, "docs/phase-backlog.json"));
  return root;
}

describe("task-queue", () => {
  it("parses the seeded backlog with valid fake-only items", async () => {
    const mod = await loadModule();
    const queue = mod.loadQueue(resolve("."));

    expect(queue.schema).toBe("kia-stick-local-task-queue.v1");
    expect(queue.items).toHaveLength(15);
    expect(queue.items.map((item) => item.id)).toEqual([
      "queue-001-closeout-helper-hardening",
      "queue-002-fake-redaction-metadata-depth",
      "queue-003-citation-qa-fixtures",
      "queue-004-docs-release-pack",
      "queue-005-real-doc-pilot-plan-only",
      "queue-006-safety-review-checklist",
      "queue-007-fake-only-pilot-simulator",
      "queue-008-operator-approval-packet",
      "queue-009-local-redaction-policy-plan",
      "queue-010-future-implementation-gate-draft",
      "queue-011-v07-pause-stabilize",
      "queue-012-v07-product-version-bump-plan",
      "queue-013-v07-fake-only-ux-polish",
      "queue-014-v07-real-doc-gate-preparation",
      "queue-015-v07-first-real-doc-gate-request",
    ]);
    expect(queue.items.slice(0, 10).every((item) => item.status === "accepted")).toBe(true);
    expect(queue.items[10].status).toBe("planned");
    expect(queue.items[11].status).toBe("planned");
    expect(queue.items[12].status).toBe("planned");
    expect(queue.items[13].status).toBe("planned");
    expect(queue.items[14].status).toBe("blocked");
    expect(queue.items.every((item) => item.history.length > 0)).toBe(true);
    expect(mod.validateQueue(queue)).toBe(true);
  });

  it("selects the first non-accepted item", async () => {
    const mod = await loadModule();
    const queue = mod.loadQueue(resolve("."));
    for (let index = 0; index < 10; index += 1) {
      queue.items[index].status = "accepted";
    }

    expect(mod.selectNextItem(queue)?.id).toBe("queue-011-v07-pause-stabilize");
  });

  it("keeps the first real-doc gate request blocked until separately approved", async () => {
    const mod = await loadModule();
    const queue = mod.loadQueue(resolve("."));
    const realDocGate = queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request");

    expect(realDocGate?.status).toBe("blocked");
    const gateText = `${realDocGate?.summary}\n${realDocGate?.next_action}`;
    expect(gateText).toContain("blocked");
    expect(gateText).toContain("exactly one gate");
    expect(gateText).toContain("exactly one document");
    expect(gateText).not.toMatch(/<input[^>]*type=["']file/i);
    expect(gateText).not.toMatch(/\bshowOpenFilePicker\b|\bFileReader\b|\breadAsText\b|\breadAsArrayBuffer\b/i);
  });

  it("seeds the requested post-plan safety backlog without approving implementation", async () => {
    const mod = await loadModule();
    const queue = mod.loadQueue(resolve("."));
    const postPlanItems = queue.items.slice(5, 10);

    expect(postPlanItems.map((item) => item.id)).toEqual([
      "queue-006-safety-review-checklist",
      "queue-007-fake-only-pilot-simulator",
      "queue-008-operator-approval-packet",
      "queue-009-local-redaction-policy-plan",
      "queue-010-future-implementation-gate-draft",
    ]);
    expect(postPlanItems.map((item) => item.title)).toEqual([
      "Safety review checklist",
      "Fake-only pilot simulator",
      "Operator approval packet",
      "Local-only redaction policy plan",
      "Future implementation gate draft",
    ]);

    const joined = postPlanItems.map((item) => `${item.summary}\n${item.next_action}`).join("\n");
    expect(joined).toContain("fictional metadata only");
    expect(joined).toContain("blocked-action matrix");
    expect(joined).toContain("no-real-document implementation");
    expect(joined).not.toMatch(/<input[^>]*type=["']file/i);
    expect(joined).not.toMatch(/\bshowOpenFilePicker\b|\bFileReader\b|\breadAsText\b|\breadAsArrayBuffer\b/i);
    expect(joined).not.toMatch(/\bapproved real\b|\breal-document implementation approved\b/i);
  });

  it("updates status, next action, timestamps, and history", async () => {
    const mod = await loadModule();
    const queue = mod.loadQueue(resolve("."));
    const updated = mod.updateQueueItemStatus(queue, "queue-001-closeout-helper-hardening", "running", {
      note: "Starting local fake-only queue test.",
      nextAction: "Run local validation only.",
      at: "2026-06-20T21:00:00.000Z",
    });

    expect(updated.status).toBe("running");
    expect(updated.next_action).toBe("Run local validation only.");
    expect(updated.updated_at).toBe("2026-06-20T21:00:00.000Z");
    expect((updated.history as unknown[])).toHaveLength(queue.items[0].history.length);
    expect(queue.updated_at).toBe("2026-06-20T21:00:00.000Z");
  });

  it("rejects private paths and secrets-looking values", async () => {
    const mod = await loadModule();
    const syntheticSecret = ["to", "ken=", "abcdefghijklmn"].join("");

    expect(() => mod.assertSafeQueueText("/media/mint/SHARED/APWU/private.pdf", "note")).toThrow(/private path/);
    expect(() => mod.assertSafeQueueText("~/kia-stick-private-vault/private.md", "note")).toThrow(/private path/);
    expect(() => mod.assertSafeQueueText(syntheticSecret, "note")).toThrow(/secrets-looking/);
  });

  it("queue:set mutates a temp queue and rejects unsafe notes", () => {
    const root = fixtureRoot();
    const ok = spawnSync(
      "node",
      [scriptPath, "set", "--root", root, "--id", "queue-001-closeout-helper-hardening", "--status", "needs_review", "--note", "Ready for local review."],
      { encoding: "utf8" }
    );
    const queue = JSON.parse(readFileSync(join(root, "docs/phase-backlog.json"), "utf8"));
    const item = queue.items.find((candidate: { id: string }) => candidate.id === "queue-001-closeout-helper-hardening");

    expect(ok.status).toBe(0);
    expect(ok.stdout).toContain("updated=queue-001-closeout-helper-hardening");
    expect(item.status).toBe("needs_review");
    expect(item.history.at(-1).note).toBe("Ready for local review.");

    const unsafe = spawnSync(
      "node",
      [
        scriptPath,
        "set",
        "--root",
        root,
        "--id",
        "queue-001-closeout-helper-hardening",
        "--status",
        "blocked",
        "--note",
        "/media/mint/SHARED/APWU/private.pdf",
      ],
      { encoding: "utf8" }
    );

    expect(unsafe.status).toBe(1);
    expect(unsafe.stderr).toContain("Rejected unsafe private path");
  });

  it("queue:next prints a compact Codex-ready summary", () => {
    const result = spawnSync("node", [scriptPath, "next"], { cwd: resolve("."), encoding: "utf8" });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("id=queue-011-v07-pause-stabilize");
    expect(result.stdout).toContain("Codex-ready summary:");
    expect(result.stdout).toContain("KIA-Stick-v0.7.0-pause-stabilize");
  });

  it("does not execute git push from queue commands", () => {
    const root = fixtureRoot();
    const wrapperRoot = mkdtempSync(join(tmpdir(), "kia-task-queue-git-wrapper-"));
    const binDir = join(wrapperRoot, "bin");
    const logPath = join(wrapperRoot, "git-wrapper.log");
    const realGit = execFileSync("which", ["git"], { encoding: "utf8" }).trim();
    mkdirSync(binDir);
    writeFileSync(
      join(binDir, "git"),
      [
        "#!/usr/bin/env bash",
        "printf '%s\\n' \"$*\" >> \"$KIA_GIT_WRAPPER_LOG\"",
        "if [[ \"$1\" == \"push\" ]]; then echo 'push forbidden' >&2; exit 99; fi",
        `exec ${realGit} "$@"`,
        "",
      ].join("\n")
    );
    chmodSync(join(binDir, "git"), 0o755);

    const result = spawnSync("node", [scriptPath, "list", "--root", root], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
        KIA_GIT_WRAPPER_LOG: logPath,
      },
    });

    expect(result.status).toBe(0);
    expect(existsSync(logPath) ? readFileSync(logPath, "utf8") : "").not.toMatch(/^push\b/m);
  });
});
