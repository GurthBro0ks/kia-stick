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
    items: Array<{ id: string; phase: string; title: string; status: string; history: unknown[] }>;
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
    expect(queue.items).toHaveLength(5);
    expect(queue.items.map((item) => item.id)).toEqual([
      "queue-001-closeout-helper-hardening",
      "queue-002-fake-redaction-metadata-depth",
      "queue-003-citation-qa-fixtures",
      "queue-004-docs-release-pack",
      "queue-005-real-doc-pilot-plan-only",
    ]);
    expect(queue.items[0].status).toBe("accepted");
    expect(queue.items[1].status).toBe("accepted");
    expect(queue.items[2].status).toBe("accepted");
    expect(queue.items[3].status).toBe("accepted");
    expect(["planned", "needs_review"]).toContain(queue.items[4].status);
    expect(queue.items.every((item) => item.history.length > 0)).toBe(true);
    expect(mod.validateQueue(queue)).toBe(true);
  });

  it("selects the first non-accepted item", async () => {
    const mod = await loadModule();
    const queue = mod.loadQueue(resolve("."));
    queue.items[0].status = "accepted";
    queue.items[1].status = "accepted";
    queue.items[2].status = "accepted";
    queue.items[3].status = "accepted";

    expect(mod.selectNextItem(queue)?.id).toBe("queue-005-real-doc-pilot-plan-only");
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
    expect(result.stdout).toContain("id=queue-005-real-doc-pilot-plan-only");
    expect(result.stdout).toContain("Codex-ready summary:");
    expect(result.stdout).toContain("KIA-Stick-v0.6.0-real-doc-pilot-plan-only");
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
