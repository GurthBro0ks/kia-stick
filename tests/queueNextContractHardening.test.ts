import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.8.3-queue-next-contract-hardening";
const docPath = "docs/v0.8.3-queue-next-contract-hardening.md";
const scriptPath = resolve("scripts/task-queue.mjs");

interface QueueModule {
  selectNextItem(queue: { items: Array<{ id: string; status: string }> }): { id: string } | null;
  renderNextItem(item: { id: string } | null): string;
}

async function loadModule(): Promise<QueueModule> {
  return (await import(pathToFileURL(scriptPath).href)) as QueueModule;
}

describe("v0.8.3 queue next contract hardening", () => {
  it("documents the actionable queue:next contract", () => {
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain(phase);
    expect(doc).toContain("skips `accepted` items");
    expect(doc).toContain("skips `blocked` items");
    expect(doc).toContain("skips `parked` items");
    expect(doc).toContain("Actionable statuses are therefore `planned`, `running`, `needs_review`, and `ready_to_push`");
  });

  it("selects the first actionable item and skips blocked or parked work", async () => {
    const mod = await loadModule();
    const selected = mod.selectNextItem({
      items: [
        { id: "done", status: "accepted" },
        { id: "blocked-real-doc-gate", status: "blocked" },
        { id: "parked-option", status: "parked" },
        { id: "review-bundle", status: "needs_review" },
      ],
    });

    expect(selected?.id).toBe("review-bundle");
    expect(mod.selectNextItem({ items: [{ id: "blocked-only", status: "blocked" }] })).toBeNull();
    expect(mod.renderNextItem(null)).toContain("No actionable queue items");
  });

  it("makes the actual repo queue:next useful after accepted bundles", () => {
    const result = spawnSync("node", [scriptPath, "next"], { cwd: resolve("."), encoding: "utf8" });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("No actionable queue items");
    expect(result.stdout).not.toContain("id=queue-015-v07-first-real-doc-gate-request");
  });

  it("does not add push or private path behavior to queue tooling", () => {
    const source = readFileSync(scriptPath, "utf8");

    expect(source).toContain("nonActionableQueueStatuses");
    expect(source).toContain("\"blocked\"");
    expect(source).toContain("\"parked\"");
    expect(source).not.toMatch(/\bgit\s+push\b|execFileSync\([^)]*git|spawnSync\([^)]*git/);
    expect(source).not.toMatch(/readdirSync|opendirSync|showOpenFilePicker|showDirectoryPicker|FileReader/);
  });
});
